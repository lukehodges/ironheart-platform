# Resource Pool System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a centralized resource pool (skills, capacities, assignments) that replaces the booking-centric staff management, making staff assignment industry-agnostic.

**Architecture:** Three new DB tables (`resource_skills`, `resource_capacities`, `resource_assignments`) with a shared service layer at `src/shared/resource-pool/`. The team module delegates skill and capacity management to this pool. Existing booking module wires assignment through the pool. Capacity enforcement is configurable per tenant (STRICT/FLEXIBLE).

**Tech Stack:** Drizzle ORM (pgTable, pgEnum), Zod v4 (z.uuid(), z.string()), tRPC 11, Vitest (pool: "forks"), Pino logging

**Design doc:** `docs/plans/2026-02-23-resource-pool-design.md`

---

## Task 1: Resource Pool Schema — Enums & Tables

**Files:**
- Create: `src/shared/db/schemas/resource-pool.schema.ts`
- Modify: `src/shared/db/schema.ts` (add barrel export)

**Step 1: Create the schema file with all 3 tables**

```typescript
// src/shared/db/schemas/resource-pool.schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  date,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const skillType = pgEnum("SkillType", [
  'SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM'
])

export const proficiencyLevel = pgEnum("ProficiencyLevel", [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'
])

export const capacityUnit = pgEnum("CapacityUnit", ['COUNT', 'HOURS', 'POINTS'])

export const assignmentStatus = pgEnum("AssignmentStatus", [
  'ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
])

export const capacityEnforcementMode = pgEnum("CapacityEnforcementMode", [
  'STRICT', 'FLEXIBLE'
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const resourceSkills = pgTable("resource_skills", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  skillType: skillType().notNull(),
  skillId: text().notNull(),
  skillName: text().notNull(),
  proficiency: proficiencyLevel().default('INTERMEDIATE').notNull(),
  verifiedAt: timestamp({ precision: 3, mode: 'date' }),
  verifiedBy: uuid(),
  expiresAt: timestamp({ precision: 3, mode: 'date' }),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("resource_skills_tenant_user_type_id_key").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.userId.asc().nullsLast().op("uuid_ops"),
    table.skillType.asc().nullsLast().op("enum_ops"),
    table.skillId.asc().nullsLast().op("text_ops"),
  ),
  index("resource_skills_tenantId_userId_idx").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.userId.asc().nullsLast().op("uuid_ops"),
  ),
  index("resource_skills_tenantId_skillType_skillId_idx").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.skillType.asc().nullsLast().op("enum_ops"),
    table.skillId.asc().nullsLast().op("text_ops"),
  ),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resource_skills_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_skills_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.verifiedBy],
    foreignColumns: [users.id],
    name: "resource_skills_verifiedBy_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const resourceCapacities = pgTable("resource_capacities", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  capacityType: text().notNull(),
  maxConcurrent: integer(),
  maxDaily: integer(),
  maxWeekly: integer(),
  unit: capacityUnit().default('COUNT').notNull(),
  effectiveFrom: date({ mode: 'date' }).notNull(),
  effectiveUntil: date({ mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("resource_capacities_tenant_user_type_from_key").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.userId.asc().nullsLast().op("uuid_ops"),
    table.capacityType.asc().nullsLast().op("text_ops"),
    table.effectiveFrom.asc().nullsLast().op("date_ops"),
  ),
  index("resource_capacities_tenantId_userId_idx").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.userId.asc().nullsLast().op("uuid_ops"),
  ),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resource_capacities_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_capacities_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const resourceAssignments = pgTable("resource_assignments", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  moduleSlug: text().notNull(),
  resourceType: text().notNull(),
  resourceId: uuid().notNull(),
  status: assignmentStatus().default('ASSIGNED').notNull(),
  weight: numeric({ precision: 4, scale: 2 }).default('1.00').notNull(),
  scheduledDate: date({ mode: 'date' }),
  assignedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  startedAt: timestamp({ precision: 3, mode: 'date' }),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  assignedBy: uuid(),
  overrideReason: text(),
  metadata: jsonb(),
}, (table) => [
  index("resource_assignments_tenant_user_status_date_idx").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.userId.asc().nullsLast().op("uuid_ops"),
    table.status.asc().nullsLast().op("enum_ops"),
    table.scheduledDate.asc().nullsLast().op("date_ops"),
  ),
  index("resource_assignments_tenantId_moduleSlug_idx").using("btree",
    table.tenantId.asc().nullsLast().op("uuid_ops"),
    table.moduleSlug.asc().nullsLast().op("text_ops"),
  ),
  index("resource_assignments_resourceId_idx").using("btree",
    table.resourceId.asc().nullsLast().op("uuid_ops"),
  ),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resource_assignments_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_assignments_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.assignedBy],
    foreignColumns: [users.id],
    name: "resource_assignments_assignedBy_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type ResourceSkill = typeof resourceSkills.$inferSelect
export type ResourceCapacity = typeof resourceCapacities.$inferSelect
export type ResourceAssignment = typeof resourceAssignments.$inferSelect
```

**Step 2: Add barrel export**

Add to `src/shared/db/schema.ts`:

```typescript
export * from "./schemas/resource-pool.schema"
```

**Step 3: Commit**

```bash
git add src/shared/db/schemas/resource-pool.schema.ts src/shared/db/schema.ts
git commit -m "feat: add resource pool schema (skills, capacities, assignments)"
```

---

## Task 2: Schema Changes — organizationSettings + users

**Files:**
- Modify: `src/shared/db/schemas/shared.schema.ts:234-288` (add capacityEnforcement column)
- Modify: `src/shared/db/schemas/auth.schema.ts:33-96` (drop serviceIds, maxDailyBookings, maxConcurrentBookings)

**Step 1: Add capacityEnforcement to organizationSettings**

In `src/shared/db/schemas/shared.schema.ts`, the `capacityEnforcementMode` enum is already exported from `resource-pool.schema.ts`. Import it and add the column.

Add import at top of `shared.schema.ts`:

```typescript
import { capacityEnforcementMode } from "./resource-pool.schema"
```

Add column to `organizationSettings` table (after `slotApprovalHours`):

```typescript
capacityEnforcement: capacityEnforcementMode().default('FLEXIBLE').notNull(),
```

**Step 2: Remove columns from users table**

In `src/shared/db/schemas/auth.schema.ts`, remove these 3 lines from the `users` table definition:

```typescript
// DELETE these lines:
maxConcurrentBookings: integer().default(1),
maxDailyBookings: integer(),
serviceIds: uuid().array().default([]),
```

**Step 3: Commit**

```bash
git add src/shared/db/schemas/shared.schema.ts src/shared/db/schemas/auth.schema.ts
git commit -m "feat: add capacityEnforcement setting, drop booking-specific columns from users"
```

---

## Task 3: Resource Pool Types

**Files:**
- Create: `src/shared/resource-pool/resource-pool.types.ts`

**Step 1: Write the types file**

```typescript
// src/shared/resource-pool/resource-pool.types.ts

export type SkillType = 'SERVICE' | 'CERTIFICATION' | 'LANGUAGE' | 'QUALIFICATION' | 'EQUIPMENT' | 'CUSTOM'
export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
export type CapacityUnit = 'COUNT' | 'HOURS' | 'POINTS'
export type AssignmentStatus = 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type CapacityEnforcementMode = 'STRICT' | 'FLEXIBLE'

export interface ResourceSkillInput {
  skillType: SkillType
  skillId: string
  skillName: string
  proficiency?: ProficiencyLevel
  verifiedBy?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface ResourceSkillRecord {
  id: string
  tenantId: string
  userId: string
  skillType: SkillType
  skillId: string
  skillName: string
  proficiency: ProficiencyLevel
  verifiedAt: Date | null
  verifiedBy: string | null
  expiresAt: Date | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface ResourceCapacityInput {
  capacityType: string
  maxConcurrent?: number | null
  maxDaily?: number | null
  maxWeekly?: number | null
  unit?: CapacityUnit
  effectiveFrom: string  // "YYYY-MM-DD"
  effectiveUntil?: string | null  // "YYYY-MM-DD"
}

export interface ResourceCapacityRecord {
  id: string
  tenantId: string
  userId: string
  capacityType: string
  maxConcurrent: number | null
  maxDaily: number | null
  maxWeekly: number | null
  unit: CapacityUnit
  effectiveFrom: Date
  effectiveUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AssignmentRequest {
  userId: string
  moduleSlug: string
  resourceType: string
  resourceId: string
  weight?: number
  scheduledDate?: string  // "YYYY-MM-DD"
  assignedBy?: string
  overrideReason?: string
  metadata?: Record<string, unknown>
}

export interface AssignmentResult {
  success: true
  assignmentId: string
} | {
  success: false
  reason: 'CAPACITY_EXCEEDED'
  capacityType: string
  current: number
  max: number
  enforcement: CapacityEnforcementMode
}

export interface ResourceAssignmentRecord {
  id: string
  tenantId: string
  userId: string
  moduleSlug: string
  resourceType: string
  resourceId: string
  status: AssignmentStatus
  weight: number
  scheduledDate: Date | null
  assignedAt: Date
  startedAt: Date | null
  completedAt: Date | null
  assignedBy: string | null
  overrideReason: string | null
  metadata: Record<string, unknown> | null
}

export interface CapacityUsage {
  capacityType: string
  used: number
  max: number | null
  available: number | null
  isOver: boolean
}

export interface WorkloadSummary {
  userId: string
  date: string
  capacities: CapacityUsage[]
}

export interface SkillRequirement {
  skillType: SkillType
  skillId: string
  minProficiency?: ProficiencyLevel
}

export type StaffSortStrategy = 'LEAST_LOADED' | 'MOST_SKILLED' | 'NEAREST' | 'ROUND_ROBIN'

export interface FindAvailableStaffInput {
  requiredSkills?: SkillRequirement[]
  capacityType: string
  date: string  // "YYYY-MM-DD"
  minAvailableCapacity?: number
  sortBy?: StaffSortStrategy
  location?: { lat: number; lng: number }
}

export interface RankedStaffCandidate {
  userId: string
  name: string
  score: number
  reasons: string[]
  capacityUsage: CapacityUsage | null
}
```

**Step 2: Commit**

```bash
git add src/shared/resource-pool/resource-pool.types.ts
git commit -m "feat: add resource pool type definitions"
```

---

## Task 4: Resource Pool Zod Schemas

**Files:**
- Create: `src/shared/resource-pool/resource-pool.schemas.ts`

**Step 1: Write the schemas file**

```typescript
// src/shared/resource-pool/resource-pool.schemas.ts
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const addSkillSchema = z.object({
  userId: z.string(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  skillId: z.string().min(1),
  skillName: z.string().min(1).max(255),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const removeSkillSchema = z.object({
  userId: z.string(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  skillId: z.string(),
})

export const listSkillsSchema = z.object({
  userId: z.string(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']).optional(),
})

export const findUsersWithSkillSchema = z.object({
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  skillId: z.string(),
  minProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
})

// ---------------------------------------------------------------------------
// Capacities
// ---------------------------------------------------------------------------

export const setCapacitySchema = z.object({
  userId: z.string(),
  capacityType: z.string().min(1),
  maxConcurrent: z.number().int().min(0).nullable().optional(),
  maxDaily: z.number().int().min(0).nullable().optional(),
  maxWeekly: z.number().int().min(0).nullable().optional(),
  unit: z.enum(['COUNT', 'HOURS', 'POINTS']).default('COUNT'),
  effectiveFrom: z.string().regex(dateRegex),
  effectiveUntil: z.string().regex(dateRegex).nullable().optional(),
})

export const getCapacitySchema = z.object({
  userId: z.string(),
  capacityType: z.string(),
  date: z.string().regex(dateRegex).optional(),
})

export const getCapacityUsageSchema = z.object({
  userId: z.string(),
  capacityType: z.string(),
  date: z.string().regex(dateRegex),
})

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export const requestAssignmentSchema = z.object({
  userId: z.string(),
  moduleSlug: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string(),
  weight: z.number().min(0).default(1),
  scheduledDate: z.string().regex(dateRegex).optional(),
  assignedBy: z.string().optional(),
  overrideReason: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const listAssignmentsSchema = z.object({
  userId: z.string(),
  moduleSlug: z.string().optional(),
  status: z.enum(['ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

export const getWorkloadSchema = z.object({
  userId: z.string(),
  date: z.string().regex(dateRegex),
})

// ---------------------------------------------------------------------------
// Find Available Staff
// ---------------------------------------------------------------------------

export const findAvailableStaffSchema = z.object({
  requiredSkills: z.array(z.object({
    skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
    skillId: z.string(),
    minProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  })).optional(),
  capacityType: z.string().min(1),
  date: z.string().regex(dateRegex),
  minAvailableCapacity: z.number().min(0).default(1),
  sortBy: z.enum(['LEAST_LOADED', 'MOST_SKILLED', 'NEAREST', 'ROUND_ROBIN']).default('LEAST_LOADED'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
})
```

**Step 2: Commit**

```bash
git add src/shared/resource-pool/resource-pool.schemas.ts
git commit -m "feat: add resource pool Zod input schemas"
```

---

## Task 5: Resource Pool Errors

**Files:**
- Modify: `src/shared/errors.ts` (add CapacityExceededError, SkillExpiredError)

**Step 1: Add new error classes**

Add after the `BadRequestError` class:

```typescript
/** Assignment would exceed the staff member's capacity limits. */
export class CapacityExceededError extends IronheartError {
  constructor(
    public readonly capacityType: string,
    public readonly current: number,
    public readonly max: number,
    public readonly enforcement: 'STRICT' | 'FLEXIBLE',
  ) {
    super(
      `Capacity exceeded for ${capacityType}: ${current}/${max} (enforcement: ${enforcement})`,
      "CAPACITY_EXCEEDED"
    );
    this.name = "CapacityExceededError";
  }
}

/** Skill has expired and cannot be used for assignment. */
export class SkillExpiredError extends IronheartError {
  constructor(skillName: string, expiredAt: Date) {
    super(`Skill "${skillName}" expired at ${expiredAt.toISOString()}`, "SKILL_EXPIRED");
    this.name = "SkillExpiredError";
  }
}
```

Also add CapacityExceededError handling to `toTRPCError`:

```typescript
if (error instanceof CapacityExceededError) {
  return new TRPCError({ code: "CONFLICT", message: error.message });
}
```

**Step 2: Commit**

```bash
git add src/shared/errors.ts
git commit -m "feat: add CapacityExceededError and SkillExpiredError domain errors"
```

---

## Task 6: Resource Pool Repository

**Files:**
- Create: `src/shared/resource-pool/resource-pool.repository.ts`

**Step 1: Write the failing test**

Create `src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Queue-based mock for Drizzle
;(globalThis as Record<string, unknown>).__rpTestSelectQueue = []
;(globalThis as Record<string, unknown>).__rpTestInsertResult = []
;(globalThis as Record<string, unknown>).__rpTestUpdateResult = []
;(globalThis as Record<string, unknown>).__rpTestDeleteResult = { rowCount: 1 }

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy', 'innerJoin', 'leftJoin']
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  function makeInsertChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestInsertResult
      return queue.shift() ?? []
    }
    chain.values = () => chain
    chain.returning = () => chain
    chain.onConflictDoUpdate = () => chain
    chain.onConflictDoNothing = () => chain
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  function makeUpdateChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestUpdateResult
      return queue.shift() ?? []
    }
    chain.set = () => chain
    chain.where = () => chain
    chain.returning = () => chain
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  function makeDeleteChain() {
    const chain: Record<string, unknown> = {}
    chain.from = () => chain
    chain.where = () => chain
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve((globalThis as Record<string, unknown>).__rpTestDeleteResult).then(resolve)
    return chain
  }

  return {
    db: {
      select: () => makeSelectChain(),
      insert: () => makeInsertChain(),
      update: () => makeUpdateChain(),
      delete: () => makeDeleteChain(),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
        select: () => makeSelectChain(),
        insert: () => makeInsertChain(),
        update: () => makeUpdateChain(),
        delete: () => makeDeleteChain(),
      })),
    },
  }
})

vi.mock('@/shared/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))

import { resourcePoolRepository } from '../resource-pool.repository'

function setSelectQueue(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestSelectQueue
  queue.length = 0
  queue.push(...results)
}

function setInsertResult(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestInsertResult
  queue.length = 0
  queue.push(...results)
}

function setUpdateResult(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestUpdateResult
  queue.length = 0
  queue.push(...results)
}

const TENANT = 'tenant-1'
const USER = 'user-1'

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.skills', () => {
  it('addSkill inserts and returns the skill record', async () => {
    const skill = {
      id: 'skill-1', tenantId: TENANT, userId: USER,
      skillType: 'SERVICE', skillId: 'svc-1', skillName: 'Haircut',
      proficiency: 'EXPERT', verifiedAt: null, verifiedBy: null,
      expiresAt: null, metadata: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([skill])

    const result = await resourcePoolRepository.addSkill(TENANT, USER, {
      skillType: 'SERVICE', skillId: 'svc-1', skillName: 'Haircut', proficiency: 'EXPERT',
    })

    expect(result).toEqual(skill)
  })

  it('listSkills returns skills for a user', async () => {
    const skills = [
      { id: 'skill-1', skillType: 'SERVICE', skillId: 'svc-1', skillName: 'Haircut', proficiency: 'EXPERT' },
      { id: 'skill-2', skillType: 'CERTIFICATION', skillId: 'first-aid', skillName: 'First Aid', proficiency: 'ADVANCED' },
    ]
    setSelectQueue(skills)

    const result = await resourcePoolRepository.listSkills(TENANT, USER)
    expect(result).toHaveLength(2)
  })

  it('listSkills filters by skillType', async () => {
    setSelectQueue([{ id: 'skill-1', skillType: 'SERVICE' }])

    const result = await resourcePoolRepository.listSkills(TENANT, USER, 'SERVICE')
    expect(result).toHaveLength(1)
  })

  it('findUsersWithSkill returns user IDs', async () => {
    setSelectQueue([{ userId: 'user-1' }, { userId: 'user-2' }])

    const result = await resourcePoolRepository.findUsersWithSkill(TENANT, 'SERVICE', 'svc-1')
    expect(result).toEqual(['user-1', 'user-2'])
  })
})

// ---------------------------------------------------------------------------
// Capacities
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.capacities', () => {
  it('setCapacity upserts and returns the capacity record', async () => {
    const cap = {
      id: 'cap-1', tenantId: TENANT, userId: USER,
      capacityType: 'bookings', maxConcurrent: null, maxDaily: 8,
      maxWeekly: null, unit: 'COUNT',
      effectiveFrom: new Date('2026-01-01'), effectiveUntil: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([cap])

    const result = await resourcePoolRepository.setCapacity(TENANT, USER, {
      capacityType: 'bookings', maxDaily: 8, effectiveFrom: '2026-01-01',
    })

    expect(result.maxDaily).toBe(8)
  })

  it('getCapacity returns the effective capacity for a date', async () => {
    setSelectQueue([{
      id: 'cap-1', capacityType: 'bookings', maxDaily: 8,
      effectiveFrom: new Date('2026-01-01'), effectiveUntil: null,
    }])

    const result = await resourcePoolRepository.getCapacity(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.maxDaily).toBe(8)
  })

  it('getCapacity returns null when no capacity is set', async () => {
    setSelectQueue([])

    const result = await resourcePoolRepository.getCapacity(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.assignments', () => {
  it('createAssignment inserts and returns the record', async () => {
    const assignment = {
      id: 'asgn-1', tenantId: TENANT, userId: USER,
      moduleSlug: 'bookings', resourceType: 'booking', resourceId: 'bk-1',
      status: 'ASSIGNED', weight: '1.00', scheduledDate: new Date('2026-06-15'),
      assignedAt: new Date(), startedAt: null, completedAt: null,
      assignedBy: null, overrideReason: null, metadata: null,
    }
    setInsertResult([assignment])

    const result = await resourcePoolRepository.createAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-1', scheduledDate: '2026-06-15',
    })

    expect(result.moduleSlug).toBe('bookings')
  })

  it('getActiveWeightForDate returns sum of weights', async () => {
    setSelectQueue([{ total: '5.50' }])

    const result = await resourcePoolRepository.getActiveWeightForDate(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).toBe(5.5)
  })

  it('getActiveWeightForDate returns 0 when no assignments', async () => {
    setSelectQueue([{ total: null }])

    const result = await resourcePoolRepository.getActiveWeightForDate(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).toBe(0)
  })

  it('completeAssignment sets status and completedAt', async () => {
    setUpdateResult([{ id: 'asgn-1', status: 'COMPLETED' }])

    const result = await resourcePoolRepository.completeAssignment(TENANT, 'asgn-1')
    expect(result.status).toBe('COMPLETED')
  })

  it('cancelAssignment sets status to CANCELLED', async () => {
    setUpdateResult([{ id: 'asgn-1', status: 'CANCELLED' }])

    const result = await resourcePoolRepository.cancelAssignment(TENANT, 'asgn-1')
    expect(result.status).toBe('CANCELLED')
  })

  it('listAssignments returns paginated results', async () => {
    const assignments = Array.from({ length: 3 }, (_, i) => ({
      id: `asgn-${i}`, userId: USER, moduleSlug: 'bookings',
    }))
    setSelectQueue(assignments)

    const result = await resourcePoolRepository.listAssignments(TENANT, USER, { limit: 50 })
    expect(result.rows).toHaveLength(3)
    expect(result.hasMore).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`
Expected: FAIL — module `../resource-pool.repository` not found

**Step 3: Write the repository implementation**

```typescript
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
      .delete()
      .from(resourceSkills)
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/resource-pool/__tests__/resource-pool.repository.test.ts src/shared/resource-pool/resource-pool.repository.ts
git commit -m "feat: add resource pool repository with skills, capacities, assignments"
```

---

## Task 7: Resource Pool Service

**Files:**
- Create: `src/shared/resource-pool/resource-pool.service.ts`
- Create: `src/shared/resource-pool/__tests__/resource-pool.service.test.ts`

**Step 1: Write the failing test**

```typescript
// src/shared/resource-pool/__tests__/resource-pool.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRepo = {
  addSkill: vi.fn(),
  removeSkill: vi.fn(),
  listSkills: vi.fn(),
  findUsersWithSkill: vi.fn(),
  checkSkillValid: vi.fn(),
  setCapacity: vi.fn(),
  getCapacity: vi.fn(),
  listCapacities: vi.fn(),
  createAssignment: vi.fn(),
  getActiveWeightForDate: vi.fn(),
  completeAssignment: vi.fn(),
  cancelAssignment: vi.fn(),
  listAssignments: vi.fn(),
  getStaffWorkloadForDate: vi.fn(),
}

vi.mock('../resource-pool.repository', () => ({
  resourcePoolRepository: mockRepo,
}))

// Mock organizationSettings query
;(globalThis as Record<string, unknown>).__rpServiceSelectQueue = []

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpServiceSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy']
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }
  return { db: { select: () => makeSelectChain() } }
})

vi.mock('@/shared/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { resourcePoolService } from '../resource-pool.service'

function setOrgSettings(enforcement: 'STRICT' | 'FLEXIBLE') {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpServiceSelectQueue
  queue.length = 0
  queue.push([{ capacityEnforcement: enforcement }])
}

beforeEach(() => {
  vi.clearAllMocks()
})

const TENANT = 'tenant-1'
const USER = 'user-1'

// ---------------------------------------------------------------------------
// requestAssignment — capacity enforcement
// ---------------------------------------------------------------------------

describe('resourcePoolService.requestAssignment', () => {
  it('succeeds when under capacity', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(5)
    mockRepo.createAssignment.mockResolvedValue({ id: 'asgn-1' })

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-1', weight: 1, scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({ success: true, assignmentId: 'asgn-1' })
  })

  it('succeeds when no capacity rule exists (unlimited)', async () => {
    mockRepo.getCapacity.mockResolvedValue(null)
    mockRepo.createAssignment.mockResolvedValue({ id: 'asgn-2' })

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-2', scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({ success: true, assignmentId: 'asgn-2' })
  })

  it('rejects when over capacity in STRICT mode', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(8)
    setOrgSettings('STRICT')

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-3', weight: 1, scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({
      success: false,
      reason: 'CAPACITY_EXCEEDED',
      capacityType: 'bookings',
      current: 8,
      max: 8,
      enforcement: 'STRICT',
    })
    expect(mockRepo.createAssignment).not.toHaveBeenCalled()
  })

  it('allows override in FLEXIBLE mode with reason', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(8)
    setOrgSettings('FLEXIBLE')
    mockRepo.createAssignment.mockResolvedValue({ id: 'asgn-4' })

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-4', weight: 1, scheduledDate: '2026-06-15',
      overrideReason: 'Emergency appointment',
    })

    expect(result).toEqual({ success: true, assignmentId: 'asgn-4' })
    expect(mockRepo.createAssignment).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      overrideReason: 'Emergency appointment',
    }))
  })

  it('rejects FLEXIBLE override without reason', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(8)
    setOrgSettings('FLEXIBLE')

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-5', weight: 1, scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({
      success: false,
      reason: 'CAPACITY_EXCEEDED',
      capacityType: 'bookings',
      current: 8,
      max: 8,
      enforcement: 'FLEXIBLE',
    })
  })
})

// ---------------------------------------------------------------------------
// getStaffWorkload
// ---------------------------------------------------------------------------

describe('resourcePoolService.getStaffWorkload', () => {
  it('returns workload summary with capacity usage', async () => {
    mockRepo.getStaffWorkloadForDate.mockResolvedValue([
      { moduleSlug: 'bookings', total: '5', count: 5 },
    ])
    mockRepo.listCapacities.mockResolvedValue([
      { capacityType: 'bookings', maxDaily: 8, effectiveFrom: new Date('2026-01-01'), effectiveUntil: null },
    ])

    const result = await resourcePoolService.getStaffWorkload(TENANT, USER, '2026-06-15')

    expect(result.capacities).toEqual([
      { capacityType: 'bookings', used: 5, max: 8, available: 3, isOver: false },
    ])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.service.test.ts`
Expected: FAIL — module `../resource-pool.service` not found

**Step 3: Write the service implementation**

```typescript
// src/shared/resource-pool/resource-pool.service.ts
import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { organizationSettings } from "@/shared/db/schema"
import { eq } from "drizzle-orm"
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

async function getTenantEnforcement(tenantId: string): Promise<CapacityEnforcementMode> {
  const [settings] = await db
    .select({ capacityEnforcement: organizationSettings.capacityEnforcement })
    .from(organizationSettings)
    .where(eq(organizationSettings.tenantId, tenantId))
    .limit(1)

  return (settings?.capacityEnforcement as CapacityEnforcementMode) ?? 'FLEXIBLE'
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/resource-pool/resource-pool.service.ts src/shared/resource-pool/__tests__/resource-pool.service.test.ts
git commit -m "feat: add resource pool service with capacity enforcement logic"
```

---

## Task 8: Resource Pool Barrel Export

**Files:**
- Create: `src/shared/resource-pool/index.ts`

**Step 1: Create barrel export**

```typescript
// src/shared/resource-pool/index.ts
export { resourcePoolRepository } from "./resource-pool.repository"
export { resourcePoolService } from "./resource-pool.service"
export type {
  SkillType,
  ProficiencyLevel,
  CapacityUnit,
  AssignmentStatus,
  CapacityEnforcementMode,
  ResourceSkillInput,
  ResourceSkillRecord,
  ResourceCapacityInput,
  ResourceCapacityRecord,
  AssignmentRequest,
  AssignmentResult,
  ResourceAssignmentRecord,
  CapacityUsage,
  WorkloadSummary,
  SkillRequirement,
  StaffSortStrategy,
  FindAvailableStaffInput,
  RankedStaffCandidate,
} from "./resource-pool.types"
```

**Step 2: Commit**

```bash
git add src/shared/resource-pool/index.ts
git commit -m "feat: add resource pool barrel export"
```

---

## Task 9: Team Module — Types Refactor

**Files:**
- Modify: `src/modules/team/team.types.ts`

**Step 1: Update types to remove booking-specific fields, add resource pool concepts**

Replace the full file. Remove `defaultMaxDailyBookings` from `StaffMember`, `CreateStaffInput`, `UpdateStaffInput`. The `CapacityEntry` interface is no longer needed (replaced by resource pool).

```typescript
// src/modules/team/team.types.ts

export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type EmployeeType = 'EMPLOYED' | 'SELF_EMPLOYED' | 'CONTRACTOR'
export type AvailabilityType = 'RECURRING' | 'SPECIFIC' | 'BLOCKED'

export interface StaffMember {
  id: string
  tenantId: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  status: StaffStatus
  employeeType: EmployeeType | null
  isTeamMember: boolean
  hourlyRate: number | null
  staffStatus: string | null
  workosUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export type AvailabilityEntry =
  | {
      type: 'RECURRING'
      dayOfWeek: number
      startTime: string
      endTime: string
    }
  | {
      type: 'SPECIFIC'
      specificDate: string
      startTime: string
      endTime: string
    }
  | {
      type: 'BLOCKED'
      specificDate: string
      endDate?: string
      reason?: string
      isAllDay: boolean
    }

export interface AvailabilitySlot {
  startTime: string
  endTime: string
}

export interface TeamSchedule {
  userId: string
  date: string
  slots: Array<{ startTime: string; endTime: string }>
}

export interface CreateStaffInput {
  email: string
  name: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
}

export interface UpdateStaffInput {
  id: string
  email?: string
  name?: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
  status?: StaffStatus
}
```

**Step 2: Commit**

```bash
git add src/modules/team/team.types.ts
git commit -m "refactor: remove booking-specific fields from team types"
```

---

## Task 10: Team Module — Schemas Refactor

**Files:**
- Modify: `src/modules/team/team.schemas.ts`

**Step 1: Remove booking-specific schemas, update create/update staff**

Remove `setCapacitySchema`, `getCapacitySchema` (these are now in resource pool). Remove `defaultMaxDailyBookings` from `createStaffSchema` and `updateStaffSchema`.

```typescript
// src/modules/team/team.schemas.ts
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export const availabilityEntrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RECURRING'),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex),
  }),
  z.object({
    type: z.literal('SPECIFIC'),
    specificDate: z.string().regex(dateRegex),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex),
  }),
  z.object({
    type: z.literal('BLOCKED'),
    specificDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex).optional(),
    reason: z.string().max(255).optional(),
    isAllDay: z.boolean().default(true),
  }),
])

export const setAvailabilitySchema = z.object({
  userId: z.string(),
  entries: z.array(availabilityEntrySchema),
  replaceAll: z.boolean().default(false),
})

export const blockDatesSchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  reason: z.string().optional(),
})

export const getAvailabilitySchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  timezone: z.string().optional(),
})

export const getScheduleSchema = z.object({
  userId: z.string(),
  date: z.string().regex(dateRegex),
  timezone: z.string().optional(),
})

export const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
})

export const updateStaffSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
})

export const listStaffSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})
```

**Step 2: Commit**

```bash
git add src/modules/team/team.schemas.ts
git commit -m "refactor: remove booking-specific capacity schemas from team module"
```

---

## Task 11: Team Module — Repository Refactor

**Files:**
- Modify: `src/modules/team/team.repository.ts`

**Step 1: Remove `getCapacityForDate` method and capacity-related imports**

The `getCapacityForDate` method with its 3-level fallback is replaced by the resource pool. Remove it and the imports of `userCapacities`, `organizationSettings` if only used for capacity. Remove `defaultMaxDailyBookings` from `mapUserToStaffMember`. Remove references to `maxDailyBookings`, `serviceIds`, `maxConcurrentBookings` from create/update methods.

This requires reading and modifying the actual repository file. The implementer should:

1. Remove `import { userCapacities, organizationSettings }` if only used for capacity
2. Remove `defaultMaxDailyBookings` from `mapUserToStaffMember` return
3. Remove `maxDailyBookings: input.defaultMaxDailyBookings` from `create` method
4. Remove `getCapacityForDate` method entirely
5. Remove `setCapacity` / capacity-related methods if present

**Step 2: Run existing team tests to verify nothing breaks**

Run: `npx vitest run src/modules/team/`
Expected: Some tests may need updating if they reference `defaultMaxDailyBookings`

**Step 3: Fix any failing tests by removing `defaultMaxDailyBookings` assertions**

**Step 4: Commit**

```bash
git add src/modules/team/
git commit -m "refactor: remove capacity logic from team repository, delegate to resource pool"
```

---

## Task 12: Team Module — Router Refactor (Add Resource Pool Routes)

**Files:**
- Modify: `src/modules/team/team.router.ts`

**Step 1: Add resource pool skill and capacity routes to team router**

The team router becomes the UI-facing API for skill and capacity management, delegating to the resource pool service. Add these routes:

```typescript
import { resourcePoolService } from "@/shared/resource-pool"
import { addSkillSchema, removeSkillSchema, listSkillsSchema } from "@/shared/resource-pool/resource-pool.schemas"
import { setCapacitySchema as rpSetCapacitySchema, getCapacitySchema as rpGetCapacitySchema, getWorkloadSchema } from "@/shared/resource-pool/resource-pool.schemas"

// Add to the router object:

// Skills
listSkills: moduleProcedure
  .input(listSkillsSchema)
  .query(({ ctx, input }) => resourcePoolService.listSkills(ctx.tenantId, input.userId, input.skillType)),

addSkill: modulePermission("staff:write")
  .input(addSkillSchema)
  .mutation(({ ctx, input }) => resourcePoolService.addSkill(ctx.tenantId, input.userId, {
    skillType: input.skillType,
    skillId: input.skillId,
    skillName: input.skillName,
    proficiency: input.proficiency,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    metadata: input.metadata,
  })),

removeSkill: modulePermission("staff:write")
  .input(removeSkillSchema)
  .mutation(({ ctx, input }) => resourcePoolService.removeSkill(ctx.tenantId, input.userId, input.skillType, input.skillId)),

// Capacities
getCapacity: moduleProcedure
  .input(rpGetCapacitySchema)
  .query(({ ctx, input }) => resourcePoolService.getCapacity(ctx.tenantId, input.userId, input.capacityType, input.date)),

setCapacity: modulePermission("staff:write")
  .input(rpSetCapacitySchema)
  .mutation(({ ctx, input }) => resourcePoolService.setCapacity(ctx.tenantId, input.userId, {
    capacityType: input.capacityType,
    maxConcurrent: input.maxConcurrent,
    maxDaily: input.maxDaily,
    maxWeekly: input.maxWeekly,
    unit: input.unit,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil,
  })),

// Workload
getWorkload: moduleProcedure
  .input(getWorkloadSchema)
  .query(({ ctx, input }) => resourcePoolService.getStaffWorkload(ctx.tenantId, input.userId, input.date)),

// Assignments
listAssignments: moduleProcedure
  .input(z.object({
    userId: z.string(),
    moduleSlug: z.string().optional(),
    status: z.enum(['ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().int().max(100).default(50),
  }))
  .query(({ ctx, input }) => resourcePoolService.listAssignments(ctx.tenantId, input.userId, {
    moduleSlug: input.moduleSlug,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    limit: input.limit,
  })),
```

**Step 2: Commit**

```bash
git add src/modules/team/team.router.ts
git commit -m "feat: add resource pool skill/capacity/workload routes to team router"
```

---

## Task 13: Team Module — Index + Manifest Update

**Files:**
- Modify: `src/modules/team/index.ts` (update exports if needed)
- Modify: `src/modules/team/team.manifest.ts` (add new permissions)

**Step 1: Update manifest with resource pool permissions**

```typescript
permissions: ['team:read', 'team:write', 'staff:read', 'staff:write'],
```

**Step 2: Commit**

```bash
git add src/modules/team/index.ts src/modules/team/team.manifest.ts
git commit -m "refactor: update team manifest with resource pool permissions"
```

---

## Task 14: Fix All Compile Errors

**Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`

This will surface all compile errors from:
- Removed `serviceIds`, `maxDailyBookings`, `maxConcurrentBookings` from users table
- Removed `defaultMaxDailyBookings` from StaffMember type
- Removed `CapacityEntry` type
- Removed capacity methods from team repository
- Added `capacityEnforcement` to organizationSettings
- Any other files referencing the removed columns

**Step 2: Fix each error**

For each file with errors:
- If it references `users.serviceIds` → replace with `resourcePoolRepository.listSkills()` call
- If it references `users.maxDailyBookings` or `maxConcurrentBookings` → replace with `resourcePoolRepository.getCapacity()` call
- If it references `teamRepository.getCapacityForDate()` → replace with `resourcePoolService.getCapacityUsage()`
- If it references `StaffMember.defaultMaxDailyBookings` → remove the field usage
- If it references `CapacityEntry` → use resource pool types instead
- If it references `userCapacities` table → use `resourceCapacities` instead

Common files that will need fixes:
- `src/modules/booking/booking.service.ts` — staff assignment logic
- `src/modules/booking/booking.repository.ts` — serviceIds reference
- `src/modules/scheduling/scheduling.service.ts` — smart assignment, capacity checks
- `src/modules/scheduling/scheduling.repository.ts` — slot staff matching
- `src/modules/platform/platform.service.ts` — tenant provisioning defaults
- `scripts/seed-demo.ts` — seed data referencing old columns
- Test files referencing old fields

**Step 3: Fix, verify, repeat until `npx tsc --noEmit` passes with 0 errors**

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve all compile errors from resource pool migration"
```

---

## Task 15: Run Full Test Suite

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Fix any failing tests**

Tests may fail due to:
- Mock objects missing new fields or having old fields
- Repository method signatures changed
- Service method signatures changed

Fix each test to match the new API.

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: update all tests for resource pool migration"
```

---

## Task 16: Build Verification

**Step 1: Run the Next.js build**

Run: `NEXT_PHASE=phase-production-build npx next build`
Expected: Build succeeds

**Step 2: Fix any build errors**

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify build passes with resource pool system"
```

---

## Summary

| Task | What | New Files | Modified Files |
|------|------|-----------|----------------|
| 1 | Schema (3 tables + enums) | `resource-pool.schema.ts` | `schema.ts` |
| 2 | Schema changes (orgSettings + users) | — | `shared.schema.ts`, `auth.schema.ts` |
| 3 | Resource pool types | `resource-pool.types.ts` | — |
| 4 | Resource pool Zod schemas | `resource-pool.schemas.ts` | — |
| 5 | Domain errors | — | `errors.ts` |
| 6 | Repository + tests | `resource-pool.repository.ts`, test | — |
| 7 | Service + tests | `resource-pool.service.ts`, test | — |
| 8 | Barrel export | `index.ts` | — |
| 9 | Team types refactor | — | `team.types.ts` |
| 10 | Team schemas refactor | — | `team.schemas.ts` |
| 11 | Team repository refactor | — | `team.repository.ts` |
| 12 | Team router refactor | — | `team.router.ts` |
| 13 | Team manifest update | — | `team.manifest.ts`, `index.ts` |
| 14 | Fix all compile errors | — | Multiple |
| 15 | Fix all tests | — | Multiple test files |
| 16 | Build verification | — | — |

**Total new files:** 7 (schema, types, schemas, repository, service, barrel, tests)
**Total modified files:** ~10-15 (team module, errors, schema barrel, plus compile error fixes)
