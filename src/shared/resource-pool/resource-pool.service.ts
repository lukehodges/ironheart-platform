// src/shared/resource-pool/resource-pool.service.ts
import { logger } from "@/shared/logger"
import { resourcePoolRepository } from "./resource-pool.repository"
import { db } from "@/shared/db"
import { resourceSkills } from "@/shared/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import type {
  ResourceSkillInput,
  ResourceCapacityInput,
  AssignmentRequest,
  AssignmentResult,
  WorkloadSummary,
  CapacityUsage,
  CapacityEnforcementMode,
  SkillDefinitionInput,
  SkillDefinitionFilter,
  CapacityTypeInput,
  FindAvailableStaffInput,
  RankedStaffCandidate,
  ManifestCapacityType,
  ManifestSuggestedSkill,
} from "./resource-pool.types"

function getProficiencyLevelsAbove(min: string): string[] {
  const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
  const idx = levels.indexOf(min)
  return idx >= 0 ? levels.slice(idx) : levels
}

const log = logger.child({ module: "resource-pool.service" })

async function getTenantEnforcement(_tenantId: string): Promise<CapacityEnforcementMode> {
  // capacityEnforcement column was removed from organizationSettings.
  // Default to FLEXIBLE until a dedicated settings mechanism is added.
  return 'FLEXIBLE'
}

export const resourcePoolService = {
  // -------------------------------------------------------------------------
  // Skills (thin delegation)
  // -------------------------------------------------------------------------

  addSkill(tenantId: string, userId: string, input: ResourceSkillInput) {
    return resourcePoolRepository.addSkill(tenantId, userId, input)
  },

  removeSkill(tenantId: string, userId: string, skillType: string, skillId: string) {
    return resourcePoolRepository.removeSkill(tenantId, userId, skillType, skillId)
  },

  listSkills(tenantId: string, userId: string, skillType?: string) {
    return resourcePoolRepository.listSkills(tenantId, userId, skillType)
  },

  findUsersWithSkill(tenantId: string, skillType: string, skillId: string, minProficiency?: string) {
    return resourcePoolRepository.findUsersWithSkill(tenantId, skillType, skillId, minProficiency)
  },

  checkSkillValid(tenantId: string, userId: string, skillType: string, skillId: string) {
    return resourcePoolRepository.checkSkillValid(tenantId, userId, skillType, skillId)
  },

  // -------------------------------------------------------------------------
  // Skill Definitions (Catalog)
  // -------------------------------------------------------------------------

  listSkillDefinitions(tenantId: string, filter: SkillDefinitionFilter = {}) {
    return resourcePoolRepository.listSkillDefinitions(tenantId, filter)
  },

  getSkillDefinitionById(tenantId: string, id: string) {
    return resourcePoolRepository.getSkillDefinitionById(tenantId, id)
  },

  createSkillDefinition(tenantId: string, input: SkillDefinitionInput) {
    return resourcePoolRepository.createSkillDefinition(tenantId, input)
  },

  updateSkillDefinition(tenantId: string, id: string, updates: Partial<SkillDefinitionInput> & { isActive?: boolean }) {
    return resourcePoolRepository.updateSkillDefinition(tenantId, id, updates)
  },

  softDeleteSkillDefinition(tenantId: string, id: string) {
    return resourcePoolRepository.softDeleteSkillDefinition(tenantId, id)
  },

  // -------------------------------------------------------------------------
  // Catalog-aware Skill Assignment
  // -------------------------------------------------------------------------

  assignSkillFromCatalog(tenantId: string, userId: string, skillDefinitionId: string, opts: {
    proficiency?: string
    expiresAt?: Date
    verifiedBy?: string
  } = {}) {
    return resourcePoolRepository.assignSkillFromCatalog(tenantId, userId, skillDefinitionId, opts)
  },

  unassignSkillFromCatalog(tenantId: string, userId: string, skillDefinitionId: string) {
    return resourcePoolRepository.unassignSkillFromCatalog(tenantId, userId, skillDefinitionId)
  },

  listSkillsForUser(tenantId: string, userId: string) {
    return resourcePoolRepository.listSkillsForUser(tenantId, userId)
  },

  // -------------------------------------------------------------------------
  // Capacities (thin delegation)
  // -------------------------------------------------------------------------

  setCapacity(tenantId: string, userId: string, input: ResourceCapacityInput) {
    return resourcePoolRepository.setCapacity(tenantId, userId, input)
  },

  getCapacity(tenantId: string, userId: string, capacityType: string, date?: string) {
    return resourcePoolRepository.getCapacity(tenantId, userId, capacityType, date)
  },

  async getCapacityUsage(tenantId: string, userId: string, capacityType: string, date: string): Promise<CapacityUsage> {
    const [capacity, used] = await Promise.all([
      resourcePoolRepository.getCapacity(tenantId, userId, capacityType, date),
      resourcePoolRepository.getActiveWeightForDate(tenantId, userId, capacityType, date),
    ])

    const max = capacity?.maxDaily ?? null
    return {
      capacityType,
      used,
      max,
      available: max !== null ? Math.max(0, max - used) : null,
      isOver: max !== null && used >= max,
    }
  },

  // -------------------------------------------------------------------------
  // Assignments (capacity enforcement logic)
  // -------------------------------------------------------------------------

  async requestAssignment(tenantId: string, input: AssignmentRequest): Promise<AssignmentResult> {
    const weight = input.weight ?? 1

    // If no scheduledDate, skip capacity check
    if (!input.scheduledDate) {
      const row = await resourcePoolRepository.createAssignment(tenantId, { ...input, weight })
      return { success: true, assignmentId: row.id }
    }

    // Check capacity
    const capacity = await resourcePoolRepository.getCapacity(tenantId, input.userId, input.moduleSlug, input.scheduledDate)

    // No capacity rule = unlimited
    if (!capacity || capacity.maxDaily === null) {
      const row = await resourcePoolRepository.createAssignment(tenantId, { ...input, weight })
      return { success: true, assignmentId: row.id }
    }

    const currentUsage = await resourcePoolRepository.getActiveWeightForDate(
      tenantId, input.userId, input.moduleSlug, input.scheduledDate,
    )

    const wouldExceed = currentUsage + weight > capacity.maxDaily

    if (!wouldExceed) {
      const row = await resourcePoolRepository.createAssignment(tenantId, { ...input, weight })
      return { success: true, assignmentId: row.id }
    }

    // Capacity exceeded — check enforcement
    const enforcement = await getTenantEnforcement(tenantId)

    if (enforcement === 'STRICT') {
      log.warn({ tenantId, userId: input.userId, capacityType: input.moduleSlug, current: currentUsage, max: capacity.maxDaily }, "Assignment rejected: capacity exceeded (STRICT)")
      return {
        success: false,
        reason: 'CAPACITY_EXCEEDED',
        capacityType: input.moduleSlug,
        current: currentUsage,
        max: capacity.maxDaily,
        enforcement: 'STRICT',
      }
    }

    // FLEXIBLE mode — require override reason
    if (!input.overrideReason) {
      log.warn({ tenantId, userId: input.userId, capacityType: input.moduleSlug, current: currentUsage, max: capacity.maxDaily }, "Assignment rejected: capacity exceeded, no override reason (FLEXIBLE)")
      return {
        success: false,
        reason: 'CAPACITY_EXCEEDED',
        capacityType: input.moduleSlug,
        current: currentUsage,
        max: capacity.maxDaily,
        enforcement: 'FLEXIBLE',
      }
    }

    // Override allowed
    log.info({ tenantId, userId: input.userId, overrideReason: input.overrideReason }, "Assignment override: capacity exceeded but override reason provided")
    const row = await resourcePoolRepository.createAssignment(tenantId, { ...input, weight })
    return { success: true, assignmentId: row.id }
  },

  completeAssignment(tenantId: string, assignmentId: string) {
    return resourcePoolRepository.completeAssignment(tenantId, assignmentId)
  },

  cancelAssignment(tenantId: string, assignmentId: string) {
    return resourcePoolRepository.cancelAssignment(tenantId, assignmentId)
  },

  listAssignments(tenantId: string, userId: string, opts: {
    moduleSlug?: string
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    cursor?: string
  } = {}) {
    return resourcePoolRepository.listAssignments(tenantId, userId, opts)
  },

  // -------------------------------------------------------------------------
  // Workload
  // -------------------------------------------------------------------------

  async getStaffWorkload(tenantId: string, userId: string, date: string): Promise<WorkloadSummary> {
    const [workloadRows, allCapacities] = await Promise.all([
      resourcePoolRepository.getStaffWorkloadForDate(tenantId, userId, date),
      resourcePoolRepository.listCapacities(tenantId, userId),
    ])

    const targetDate = new Date(date)
    const capacities: CapacityUsage[] = []

    // Build a map of active capacities
    const capMap = new Map<string, { maxDaily: number | null }>()
    for (const cap of allCapacities) {
      if (cap.effectiveFrom <= targetDate && (!cap.effectiveUntil || cap.effectiveUntil >= targetDate)) {
        if (!capMap.has(cap.capacityType)) {
          capMap.set(cap.capacityType, { maxDaily: cap.maxDaily })
        }
      }
    }

    // Merge workload with capacity
    const usageMap = new Map<string, number>()
    for (const row of workloadRows) {
      usageMap.set(row.moduleSlug, Number(row.total))
    }

    // Include all capacity types (even if no assignments)
    for (const [capType, capData] of capMap) {
      const used = usageMap.get(capType) ?? 0
      const max = capData.maxDaily
      capacities.push({
        capacityType: capType,
        used,
        max,
        available: max !== null ? Math.max(0, max - used) : null,
        isOver: max !== null && used >= max,
      })
      usageMap.delete(capType)
    }

    // Include module slugs with assignments but no capacity rule
    for (const [moduleSlug, used] of usageMap) {
      capacities.push({
        capacityType: moduleSlug,
        used,
        max: null,
        available: null,
        isOver: false,
      })
    }

    return { userId, date, capacities }
  },

  // -------------------------------------------------------------------------
  // Capacity Type Definitions (Registry)
  // -------------------------------------------------------------------------

  listCapacityTypeDefinitions(tenantId: string, isActive?: boolean) {
    return resourcePoolRepository.listCapacityTypeDefinitions(tenantId, isActive)
  },

  getCapacityTypeDefinitionById(tenantId: string, id: string) {
    return resourcePoolRepository.getCapacityTypeDefinitionById(tenantId, id)
  },

  updateCapacityTypeDefinition(tenantId: string, id: string, updates: { defaultMaxDaily?: number | null; defaultMaxWeekly?: number | null; defaultMaxConcurrent?: number | null }) {
    return resourcePoolRepository.updateCapacityTypeDefinition(tenantId, id, updates)
  },

  // -------------------------------------------------------------------------
  // Module Integration
  // -------------------------------------------------------------------------

  async registerModuleCapacity(tenantId: string, moduleSlug: string, config: ManifestCapacityType) {
    await resourcePoolRepository.reactivateCapacityTypeByModule(tenantId, moduleSlug)

    await resourcePoolRepository.upsertCapacityTypeDefinition(tenantId, moduleSlug, {
      slug: config.slug,
      name: config.name,
      unit: config.unit,
      defaultMaxDaily: config.defaultMaxDaily,
      defaultMaxWeekly: config.defaultMaxWeekly,
      defaultMaxConcurrent: config.defaultMaxConcurrent,
    })

    log.info({ tenantId, moduleSlug, slug: config.slug }, "Module capacity registered")
  },

  async deactivateModuleCapacity(tenantId: string, moduleSlug: string) {
    await resourcePoolRepository.deactivateCapacityTypeByModule(tenantId, moduleSlug)
    log.info({ tenantId, moduleSlug }, "Module capacity deactivated")
  },

  async seedSuggestedSkills(tenantId: string, skills: ManifestSuggestedSkill[]) {
    for (const skill of skills) {
      await resourcePoolRepository.upsertSkillDefinitionBySlug(tenantId, {
        slug: skill.slug,
        name: skill.name,
        skillType: skill.skillType,
      })
    }
    log.info({ tenantId, count: skills.length }, "Suggested skills seeded")
  },

  // -------------------------------------------------------------------------
  // Matching Engine
  // -------------------------------------------------------------------------

  async findAvailableStaff(tenantId: string, input: FindAvailableStaffInput): Promise<{ candidates: RankedStaffCandidate[]; totalMatched: number }> {
    let candidateUserIds: string[] = await this.getTeamMemberIds(tenantId)

    if (candidateUserIds.length === 0) {
      return { candidates: [], totalMatched: 0 }
    }

    if (input.requiredSkills && input.requiredSkills.length > 0) {
      candidateUserIds = await this.filterBySkills(tenantId, candidateUserIds, input.requiredSkills)
      if (candidateUserIds.length === 0) {
        return { candidates: [], totalMatched: 0 }
      }
    }

    const capacityCandidates = await this.filterByCapacity(
      tenantId, candidateUserIds, input.capacityType, input.date, input.minAvailableCapacity ?? 1
    )
    if (capacityCandidates.length === 0) {
      return { candidates: [], totalMatched: 0 }
    }

    const ranked = this.rankCandidates(capacityCandidates, input.sortBy ?? 'LEAST_LOADED')

    return { candidates: ranked, totalMatched: ranked.length }
  },

  async getTeamMemberIds(tenantId: string): Promise<string[]> {
    const { users } = await import("@/shared/db/schema")
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        inArray(users.type, ['OWNER', 'ADMIN', 'MEMBER']),
      ))
    return rows.map(r => r.id)
  },

  async filterBySkills(tenantId: string, userIds: string[], requirements: FindAvailableStaffInput['requiredSkills']): Promise<string[]> {
    if (!requirements || requirements.length === 0) return userIds

    let filtered = new Set(userIds)

    for (const req of requirements) {
      const matching = new Set<string>()

      if (req.skillDefinitionId) {
        const rows = await db
          .select({ userId: resourceSkills.userId })
          .from(resourceSkills)
          .where(and(
            eq(resourceSkills.tenantId, tenantId),
            eq(resourceSkills.skillDefinitionId, req.skillDefinitionId),
            ...(req.minProficiency ? [inArray(resourceSkills.proficiency, getProficiencyLevelsAbove(req.minProficiency) as any[])] : []),
          ))

        for (const row of rows) {
          if (filtered.has(row.userId)) matching.add(row.userId)
        }
      } else if (req.skillType && req.skillId) {
        const users = await resourcePoolRepository.findUsersWithSkill(
          tenantId, req.skillType, req.skillId, req.minProficiency
        )
        for (const uid of users) {
          if (filtered.has(uid)) matching.add(uid)
        }
      }

      filtered = matching
      if (filtered.size === 0) break
    }

    return Array.from(filtered)
  },

  async filterByCapacity(tenantId: string, userIds: string[], capacityType: string, date: string, minAvailable: number): Promise<RankedStaffCandidate[]> {
    const results: RankedStaffCandidate[] = []

    for (const userId of userIds) {
      const usage = await this.getCapacityUsage(tenantId, userId, capacityType, date)
      const available = usage.available ?? Infinity

      if (available >= minAvailable) {
        results.push({
          userId,
          name: '',
          score: 0,
          reasons: [],
          capacityUsage: usage,
        })
      }
    }

    return results
  },

  rankCandidates(candidates: RankedStaffCandidate[], strategy: string): RankedStaffCandidate[] {
    const sorted = [...candidates]

    switch (strategy) {
      case 'LEAST_LOADED':
        sorted.sort((a, b) => {
          const aRatio = a.capacityUsage ? (a.capacityUsage.used / (a.capacityUsage.max ?? Infinity)) : 0
          const bRatio = b.capacityUsage ? (b.capacityUsage.used / (b.capacityUsage.max ?? Infinity)) : 0
          return aRatio - bRatio
        })
        break
      case 'MOST_SKILLED':
        sorted.sort((a, b) => b.score - a.score)
        break
      case 'ROUND_ROBIN':
        sorted.sort((a, b) => a.score - b.score)
        break
      default:
        break
    }

    return sorted.map((c, i) => ({ ...c, score: candidates.length - i }))
  },
}
