// src/shared/resource-pool/resource-pool.service.ts
import { logger } from "@/shared/logger"
import { resourcePoolRepository } from "./resource-pool.repository"
import type {
  ResourceSkillInput,
  ResourceCapacityInput,
  AssignmentRequest,
  AssignmentResult,
  WorkloadSummary,
  CapacityUsage,
  CapacityEnforcementMode,
} from "./resource-pool.types"

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
}
