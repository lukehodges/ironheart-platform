// src/shared/resource-pool/resource-pool.repository.ts
import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import {
  resourceSkills,
  resourceCapacities,
  resourceAssignments,
  skillDefinitions,
  capacityTypeDefinitions,
} from "@/shared/db/schema"
import { eq, and, or, lte, gte, isNull, inArray, sql, desc, ilike } from "drizzle-orm"
import type {
  ResourceSkillInput,
  ResourceCapacityInput,
  AssignmentRequest,
  SkillDefinitionInput,
  SkillDefinitionFilter,
  CapacityTypeInput,
} from "./resource-pool.types"

const log = logger.child({ module: "resource-pool.repository" })

export const resourcePoolRepository = {
  // -------------------------------------------------------------------------
  // Skills
  // -------------------------------------------------------------------------

  async addSkill(tenantId: string, userId: string, input: ResourceSkillInput) {
    const now = new Date()
    const [row] = await db
      .insert(resourceSkills)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        skillType: input.skillType,
        skillId: input.skillId,
        skillName: input.skillName,
        proficiency: input.proficiency ?? 'INTERMEDIATE',
        verifiedAt: input.verifiedBy ? now : null,
        verifiedBy: input.verifiedBy ?? null,
        expiresAt: input.expiresAt ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    log.info({ tenantId, userId, skillType: input.skillType, skillId: input.skillId }, "Skill added")
    return row!
  },

  async removeSkill(tenantId: string, userId: string, skillType: string, skillId: string) {
    await db
      .delete(resourceSkills)
      .where(and(
        eq(resourceSkills.tenantId, tenantId),
        eq(resourceSkills.userId, userId),
        eq(resourceSkills.skillType, skillType as any),
        eq(resourceSkills.skillId, skillId),
      ))

    log.info({ tenantId, userId, skillType, skillId }, "Skill removed")
  },

  async listSkills(tenantId: string, userId: string, skillType?: string) {
    const conditions = [
      eq(resourceSkills.tenantId, tenantId),
      eq(resourceSkills.userId, userId),
    ]
    if (skillType) {
      conditions.push(eq(resourceSkills.skillType, skillType as any))
    }

    return db
      .select()
      .from(resourceSkills)
      .where(and(...conditions))
  },

  async findUsersWithSkill(tenantId: string, skillType: string, skillId: string, minProficiency?: string) {
    const conditions = [
      eq(resourceSkills.tenantId, tenantId),
      eq(resourceSkills.skillType, skillType as any),
      eq(resourceSkills.skillId, skillId),
    ]

    if (minProficiency) {
      const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
      const minIdx = levels.indexOf(minProficiency)
      const validLevels = levels.slice(minIdx) as any[]
      conditions.push(inArray(resourceSkills.proficiency, validLevels))
    }

    const rows = await db
      .select({ userId: resourceSkills.userId })
      .from(resourceSkills)
      .where(and(...conditions))

    return rows.map(r => r.userId)
  },

  async checkSkillValid(tenantId: string, userId: string, skillType: string, skillId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(resourceSkills)
      .where(and(
        eq(resourceSkills.tenantId, tenantId),
        eq(resourceSkills.userId, userId),
        eq(resourceSkills.skillType, skillType as any),
        eq(resourceSkills.skillId, skillId),
      ))
      .limit(1)

    if (!row) return false
    if (row.expiresAt && row.expiresAt < new Date()) return false
    return true
  },

  // -------------------------------------------------------------------------
  // Skill Definitions (Catalog)
  // -------------------------------------------------------------------------

  async listSkillDefinitions(tenantId: string, filter: SkillDefinitionFilter = {}) {
    const conditions = [eq(skillDefinitions.tenantId, tenantId)]

    if (filter.skillType) {
      conditions.push(eq(skillDefinitions.skillType, filter.skillType as any))
    }
    if (filter.category) {
      conditions.push(eq(skillDefinitions.category, filter.category))
    }
    if (filter.isActive !== undefined) {
      conditions.push(eq(skillDefinitions.isActive, filter.isActive))
    }
    if (filter.search) {
      conditions.push(ilike(skillDefinitions.name, `%${filter.search}%`))
    }

    return db
      .select()
      .from(skillDefinitions)
      .where(and(...conditions))
      .orderBy(skillDefinitions.name)
  },

  async getSkillDefinitionById(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(skillDefinitions)
      .where(and(
        eq(skillDefinitions.tenantId, tenantId),
        eq(skillDefinitions.id, id),
      ))
      .limit(1)

    return row ?? null
  },

  async getSkillDefinitionBySlug(tenantId: string, slug: string) {
    const [row] = await db
      .select()
      .from(skillDefinitions)
      .where(and(
        eq(skillDefinitions.tenantId, tenantId),
        eq(skillDefinitions.slug, slug),
      ))
      .limit(1)

    return row ?? null
  },

  async createSkillDefinition(tenantId: string, input: SkillDefinitionInput) {
    const now = new Date()
    const slug = input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const [row] = await db
      .insert(skillDefinitions)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        slug,
        name: input.name,
        skillType: input.skillType,
        category: input.category ?? null,
        description: input.description ?? null,
        requiresVerification: input.requiresVerification ?? false,
        requiresExpiry: input.requiresExpiry ?? false,
        isActive: true,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    log.info({ tenantId, slug, skillType: input.skillType }, "Skill definition created")
    return row!
  },

  async updateSkillDefinition(tenantId: string, id: string, updates: Partial<SkillDefinitionInput> & { isActive?: boolean }) {
    const now = new Date()
    const setValues: Record<string, unknown> = { updatedAt: now }

    if (updates.name !== undefined) setValues.name = updates.name
    if (updates.skillType !== undefined) setValues.skillType = updates.skillType
    if (updates.category !== undefined) setValues.category = updates.category
    if (updates.description !== undefined) setValues.description = updates.description
    if (updates.requiresVerification !== undefined) setValues.requiresVerification = updates.requiresVerification
    if (updates.requiresExpiry !== undefined) setValues.requiresExpiry = updates.requiresExpiry
    if (updates.isActive !== undefined) setValues.isActive = updates.isActive
    if (updates.metadata !== undefined) setValues.metadata = updates.metadata

    const [row] = await db
      .update(skillDefinitions)
      .set(setValues)
      .where(and(
        eq(skillDefinitions.tenantId, tenantId),
        eq(skillDefinitions.id, id),
      ))
      .returning()

    if (!row) throw new NotFoundError("SkillDefinition", id)
    log.info({ tenantId, id }, "Skill definition updated")
    return row
  },

  async softDeleteSkillDefinition(tenantId: string, id: string) {
    const [row] = await db
      .update(skillDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(skillDefinitions.tenantId, tenantId),
        eq(skillDefinitions.id, id),
      ))
      .returning()

    if (!row) throw new NotFoundError("SkillDefinition", id)
    log.info({ tenantId, id }, "Skill definition soft-deleted")
    return row
  },

  async upsertSkillDefinitionBySlug(tenantId: string, input: SkillDefinitionInput) {
    const now = new Date()
    const slug = input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const [row] = await db
      .insert(skillDefinitions)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        slug,
        name: input.name,
        skillType: input.skillType,
        category: input.category ?? null,
        description: input.description ?? null,
        requiresVerification: input.requiresVerification ?? false,
        requiresExpiry: input.requiresExpiry ?? false,
        isActive: true,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning()

    if (row) {
      log.info({ tenantId, slug }, "Skill definition seeded")
    }
    return row ?? null
  },

  // -------------------------------------------------------------------------
  // Catalog-aware Skill Assignment
  // -------------------------------------------------------------------------

  async assignSkillFromCatalog(tenantId: string, userId: string, skillDefinitionId: string, opts: {
    proficiency?: string
    expiresAt?: Date
    verifiedBy?: string
  }) {
    const def = await this.getSkillDefinitionById(tenantId, skillDefinitionId)
    if (!def) throw new NotFoundError("SkillDefinition", skillDefinitionId)

    const now = new Date()
    const [row] = await db
      .insert(resourceSkills)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        skillType: def.skillType,
        skillId: def.slug,
        skillName: def.name,
        skillDefinitionId: def.id,
        proficiency: (opts.proficiency ?? 'INTERMEDIATE') as any,
        verifiedAt: opts.verifiedBy ? now : null,
        verifiedBy: opts.verifiedBy ?? null,
        expiresAt: opts.expiresAt ?? null,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    log.info({ tenantId, userId, skillDefinitionId, slug: def.slug }, "Skill assigned from catalog")
    return row!
  },

  async unassignSkillFromCatalog(tenantId: string, userId: string, skillDefinitionId: string) {
    await db
      .delete(resourceSkills)
      .where(and(
        eq(resourceSkills.tenantId, tenantId),
        eq(resourceSkills.userId, userId),
        eq(resourceSkills.skillDefinitionId, skillDefinitionId),
      ))

    log.info({ tenantId, userId, skillDefinitionId }, "Skill unassigned from catalog")
  },

  async listSkillsForUser(tenantId: string, userId: string) {
    return db
      .select()
      .from(resourceSkills)
      .where(and(
        eq(resourceSkills.tenantId, tenantId),
        eq(resourceSkills.userId, userId),
      ))
  },

  // -------------------------------------------------------------------------
  // Capacities
  // -------------------------------------------------------------------------

  async setCapacity(tenantId: string, userId: string, input: ResourceCapacityInput) {
    const now = new Date()
    const [row] = await db
      .insert(resourceCapacities)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        capacityType: input.capacityType,
        maxConcurrent: input.maxConcurrent ?? null,
        maxDaily: input.maxDaily ?? null,
        maxWeekly: input.maxWeekly ?? null,
        unit: input.unit ?? 'COUNT',
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    log.info({ tenantId, userId, capacityType: input.capacityType }, "Capacity set")
    return row!
  },

  async getCapacity(tenantId: string, userId: string, capacityType: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date()
    const [row] = await db
      .select()
      .from(resourceCapacities)
      .where(and(
        eq(resourceCapacities.tenantId, tenantId),
        eq(resourceCapacities.userId, userId),
        eq(resourceCapacities.capacityType, capacityType),
        lte(resourceCapacities.effectiveFrom, targetDate),
        or(
          isNull(resourceCapacities.effectiveUntil),
          gte(resourceCapacities.effectiveUntil, targetDate),
        ),
      ))
      .orderBy(desc(resourceCapacities.effectiveFrom))
      .limit(1)

    return row ?? null
  },

  async listCapacities(tenantId: string, userId: string) {
    return db
      .select()
      .from(resourceCapacities)
      .where(and(
        eq(resourceCapacities.tenantId, tenantId),
        eq(resourceCapacities.userId, userId),
      ))
      .orderBy(desc(resourceCapacities.effectiveFrom))
  },

  // -------------------------------------------------------------------------
  // Capacity Type Definitions (Registry)
  // -------------------------------------------------------------------------

  async listCapacityTypeDefinitions(tenantId: string, isActive?: boolean) {
    const conditions = [eq(capacityTypeDefinitions.tenantId, tenantId)]
    if (isActive !== undefined) {
      conditions.push(eq(capacityTypeDefinitions.isActive, isActive))
    }

    return db
      .select()
      .from(capacityTypeDefinitions)
      .where(and(...conditions))
      .orderBy(capacityTypeDefinitions.name)
  },

  async getCapacityTypeDefinitionById(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(capacityTypeDefinitions)
      .where(and(
        eq(capacityTypeDefinitions.tenantId, tenantId),
        eq(capacityTypeDefinitions.id, id),
      ))
      .limit(1)

    return row ?? null
  },

  async upsertCapacityTypeDefinition(tenantId: string, moduleSlug: string, input: CapacityTypeInput) {
    const now = new Date()
    const [row] = await db
      .insert(capacityTypeDefinitions)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        unit: input.unit ?? 'COUNT',
        defaultMaxDaily: input.defaultMaxDaily ?? null,
        defaultMaxWeekly: input.defaultMaxWeekly ?? null,
        defaultMaxConcurrent: input.defaultMaxConcurrent ?? null,
        registeredByModule: moduleSlug,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning()

    if (row) {
      log.info({ tenantId, slug: input.slug, moduleSlug }, "Capacity type definition registered")
    }
    return row ?? null
  },

  async updateCapacityTypeDefinition(tenantId: string, id: string, updates: { defaultMaxDaily?: number | null; defaultMaxWeekly?: number | null; defaultMaxConcurrent?: number | null }) {
    const [row] = await db
      .update(capacityTypeDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(capacityTypeDefinitions.tenantId, tenantId),
        eq(capacityTypeDefinitions.id, id),
      ))
      .returning()

    if (!row) throw new NotFoundError("CapacityTypeDefinition", id)
    log.info({ tenantId, id }, "Capacity type definition updated")
    return row
  },

  async deactivateCapacityTypeByModule(tenantId: string, moduleSlug: string) {
    await db
      .update(capacityTypeDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(capacityTypeDefinitions.tenantId, tenantId),
        eq(capacityTypeDefinitions.registeredByModule, moduleSlug),
      ))

    log.info({ tenantId, moduleSlug }, "Capacity type definitions deactivated for module")
  },

  async reactivateCapacityTypeByModule(tenantId: string, moduleSlug: string) {
    await db
      .update(capacityTypeDefinitions)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(
        eq(capacityTypeDefinitions.tenantId, tenantId),
        eq(capacityTypeDefinitions.registeredByModule, moduleSlug),
      ))

    log.info({ tenantId, moduleSlug }, "Capacity type definitions reactivated for module")
  },

  // -------------------------------------------------------------------------
  // Assignments
  // -------------------------------------------------------------------------

  async createAssignment(tenantId: string, input: AssignmentRequest) {
    const now = new Date()
    const [row] = await db
      .insert(resourceAssignments)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        userId: input.userId,
        moduleSlug: input.moduleSlug,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        status: 'ASSIGNED',
        weight: String(input.weight ?? 1),
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        assignedAt: now,
        assignedBy: input.assignedBy ?? null,
        overrideReason: input.overrideReason ?? null,
        metadata: input.metadata ?? null,
      })
      .returning()

    log.info({ tenantId, userId: input.userId, moduleSlug: input.moduleSlug, resourceId: input.resourceId }, "Assignment created")
    return row!
  },

  async getActiveWeightForDate(tenantId: string, userId: string, moduleSlug: string, date: string): Promise<number> {
    const targetDate = new Date(date)
    const [row] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${resourceAssignments.weight}::numeric), 0)`,
      })
      .from(resourceAssignments)
      .where(and(
        eq(resourceAssignments.tenantId, tenantId),
        eq(resourceAssignments.userId, userId),
        eq(resourceAssignments.moduleSlug, moduleSlug),
        inArray(resourceAssignments.status, ['ASSIGNED', 'ACTIVE']),
        eq(resourceAssignments.scheduledDate, targetDate),
      ))

    return Number(row?.total ?? 0)
  },

  async completeAssignment(tenantId: string, assignmentId: string) {
    const [row] = await db
      .update(resourceAssignments)
      .set({ status: 'COMPLETED', completedAt: new Date() })
      .where(and(
        eq(resourceAssignments.tenantId, tenantId),
        eq(resourceAssignments.id, assignmentId),
      ))
      .returning()

    if (!row) throw new NotFoundError("Assignment", assignmentId)
    log.info({ tenantId, assignmentId }, "Assignment completed")
    return row
  },

  async cancelAssignment(tenantId: string, assignmentId: string) {
    const [row] = await db
      .update(resourceAssignments)
      .set({ status: 'CANCELLED', completedAt: new Date() })
      .where(and(
        eq(resourceAssignments.tenantId, tenantId),
        eq(resourceAssignments.id, assignmentId),
      ))
      .returning()

    if (!row) throw new NotFoundError("Assignment", assignmentId)
    log.info({ tenantId, assignmentId }, "Assignment cancelled")
    return row
  },

  async listAssignments(tenantId: string, userId: string, opts: {
    moduleSlug?: string
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    cursor?: string
  }) {
    const limit = opts.limit ?? 50
    const conditions = [
      eq(resourceAssignments.tenantId, tenantId),
      eq(resourceAssignments.userId, userId),
    ]

    if (opts.moduleSlug) {
      conditions.push(eq(resourceAssignments.moduleSlug, opts.moduleSlug))
    }
    if (opts.status) {
      conditions.push(eq(resourceAssignments.status, opts.status as any))
    }
    if (opts.startDate) {
      conditions.push(gte(resourceAssignments.scheduledDate, new Date(opts.startDate)))
    }
    if (opts.endDate) {
      conditions.push(lte(resourceAssignments.scheduledDate, new Date(opts.endDate)))
    }
    if (opts.cursor) {
      conditions.push(lte(resourceAssignments.assignedAt, new Date(opts.cursor)))
    }

    const rows = await db
      .select()
      .from(resourceAssignments)
      .where(and(...conditions))
      .orderBy(desc(resourceAssignments.assignedAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    }
  },

  async getStaffWorkloadForDate(tenantId: string, userId: string, date: string) {
    const targetDate = new Date(date)
    return db
      .select({
        moduleSlug: resourceAssignments.moduleSlug,
        total: sql<string>`COALESCE(SUM(${resourceAssignments.weight}::numeric), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(resourceAssignments)
      .where(and(
        eq(resourceAssignments.tenantId, tenantId),
        eq(resourceAssignments.userId, userId),
        inArray(resourceAssignments.status, ['ASSIGNED', 'ACTIVE']),
        eq(resourceAssignments.scheduledDate, targetDate),
      ))
      .groupBy(resourceAssignments.moduleSlug)
  },
}
