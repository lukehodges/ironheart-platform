// src/shared/resource-pool/resource-pool.repository.ts
import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import {
  resourceSkills,
  resourceCapacities,
  resourceAssignments,
} from "@/shared/db/schema"
import { eq, and, or, lte, gte, isNull, inArray, sql, desc } from "drizzle-orm"
import type {
  ResourceSkillInput,
  ResourceCapacityInput,
  AssignmentRequest,
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
  },
}
