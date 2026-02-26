# Resource Pool — Skill Catalog & Capacity Type Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tenant-level skill catalog, capacity type registry, and matching engine to the shared resource pool, with module manifest integration hooks.

**Architecture:** Extend the existing `src/shared/resource-pool/` module with two new DB tables (`skill_definitions`, `capacity_type_definitions`), a `skillDefinitionId` FK on `resource_skills`, new repository/service/schema methods, a tRPC router, and manifest integration hooks. No new module directory — everything lives in the shared resource pool.

**Tech Stack:** Drizzle ORM, Zod v4, tRPC 11, vitest, Pino logging

---

### Task 1: Add Schema — `skill_definitions` and `capacity_type_definitions` Tables

**Files:**
- Modify: `src/shared/db/schemas/resource-pool.schema.ts`

**Step 1: Add the `skillDefinitions` table and `capacityTypeDefinitions` table to the schema file**

Add after the existing `resourceAssignments` table definition (after line 159), before the type aliases section:

```ts
// ---------------------------------------------------------------------------
// Skill Catalog
// ---------------------------------------------------------------------------

export const skillDefinitions = pgTable("skill_definitions", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  slug: text().notNull(),
  name: text().notNull(),
  skillType: skillType().notNull(),
  category: text(),
  description: text(),
  requiresVerification: boolean().default(false).notNull(),
  requiresExpiry: boolean().default(false).notNull(),
  isActive: boolean().default(true).notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("skill_definitions_tenant_slug_key").on(table.tenantId, table.slug),
  index("skill_definitions_tenantId_idx").on(table.tenantId),
  index("skill_definitions_tenantId_skillType_idx").on(table.tenantId, table.skillType),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "skill_definitions_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Capacity Type Registry
// ---------------------------------------------------------------------------

export const capacityTypeDefinitions = pgTable("capacity_type_definitions", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  slug: text().notNull(),
  name: text().notNull(),
  description: text(),
  unit: capacityUnit().default('COUNT').notNull(),
  defaultMaxDaily: integer(),
  defaultMaxWeekly: integer(),
  defaultMaxConcurrent: integer(),
  registeredByModule: text(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("capacity_type_definitions_tenant_slug_key").on(table.tenantId, table.slug),
  index("capacity_type_definitions_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "capacity_type_definitions_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])
```

**Step 2: Add `skillDefinitionId` FK to `resourceSkills` table**

Add a new column to the `resourceSkills` table definition (after `expiresAt`, before `metadata`):

```ts
  skillDefinitionId: uuid(),
```

Add a new FK constraint to the `resourceSkills` table's constraint array:

```ts
  foreignKey({
    columns: [table.skillDefinitionId],
    foreignColumns: [skillDefinitions.id],
    name: "resource_skills_skillDefinitionId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
```

**Step 3: Add type aliases**

Replace the existing type aliases block with:

```ts
export type ResourceSkill = typeof resourceSkills.$inferSelect
export type ResourceCapacity = typeof resourceCapacities.$inferSelect
export type ResourceAssignment = typeof resourceAssignments.$inferSelect
export type SkillDefinition = typeof skillDefinitions.$inferSelect
export type CapacityTypeDefinition = typeof capacityTypeDefinitions.$inferSelect
```

**Step 4: Add missing import**

Add `boolean` to the imports from `drizzle-orm/pg-core` (line 1):

```ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  date,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
```

**Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to resource-pool.schema.ts

**Step 6: Commit**

```bash
git add src/shared/db/schemas/resource-pool.schema.ts
git commit -m "feat: add skill_definitions and capacity_type_definitions schema tables"
```

---

### Task 2: Add Types — Skill Catalog & Capacity Type Interfaces

**Files:**
- Modify: `src/shared/resource-pool/resource-pool.types.ts`

**Step 1: Add new interfaces to the types file**

Add these after the existing `RankedStaffCandidate` interface (after line 139):

```ts
// ---------------------------------------------------------------------------
// Skill Catalog
// ---------------------------------------------------------------------------

export interface SkillDefinitionInput {
  slug?: string
  name: string
  skillType: SkillType
  category?: string | null
  description?: string | null
  requiresVerification?: boolean
  requiresExpiry?: boolean
  metadata?: Record<string, unknown> | null
}

export interface SkillDefinitionRecord {
  id: string
  tenantId: string
  slug: string
  name: string
  skillType: SkillType
  category: string | null
  description: string | null
  requiresVerification: boolean
  requiresExpiry: boolean
  isActive: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface SkillDefinitionFilter {
  search?: string
  skillType?: SkillType
  category?: string
  isActive?: boolean
}

// ---------------------------------------------------------------------------
// Capacity Type Registry
// ---------------------------------------------------------------------------

export interface CapacityTypeInput {
  slug: string
  name: string
  description?: string | null
  unit?: CapacityUnit
  defaultMaxDaily?: number | null
  defaultMaxWeekly?: number | null
  defaultMaxConcurrent?: number | null
}

export interface CapacityTypeRecord {
  id: string
  tenantId: string
  slug: string
  name: string
  description: string | null
  unit: CapacityUnit
  defaultMaxDaily: number | null
  defaultMaxWeekly: number | null
  defaultMaxConcurrent: number | null
  registeredByModule: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Module Manifest Integration
// ---------------------------------------------------------------------------

export interface ManifestCapacityType {
  slug: string
  name: string
  unit: CapacityUnit
  defaultMaxDaily: number | null
  defaultMaxWeekly: number | null
  defaultMaxConcurrent: number | null
}

export interface ManifestSuggestedSkill {
  slug: string
  name: string
  skillType: SkillType
}

export interface ResourcePoolManifestConfig {
  capacityType?: ManifestCapacityType
  suggestedSkills?: ManifestSuggestedSkill[]
}
```

**Step 2: Update `FindAvailableStaffInput` to use catalog references**

Replace the existing `SkillRequirement` interface (lines 116-120):

```ts
export interface SkillRequirement {
  skillDefinitionId?: string
  skillType?: SkillType
  skillId?: string
  minProficiency?: ProficiencyLevel
}
```

**Step 3: Commit**

```bash
git add src/shared/resource-pool/resource-pool.types.ts
git commit -m "feat: add skill catalog and capacity type registry types"
```

---

### Task 3: Add Zod Schemas — Skill Definitions, Capacity Types, Enhanced Matching

**Files:**
- Modify: `src/shared/resource-pool/resource-pool.schemas.ts`

**Step 1: Add new Zod schemas after the existing `findAvailableStaffSchema` (after line 113)**

```ts
// ---------------------------------------------------------------------------
// Skill Definitions (Catalog)
// ---------------------------------------------------------------------------

export const listSkillDefinitionsSchema = z.object({
  search: z.string().optional(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const getSkillDefinitionSchema = z.object({
  id: z.string(),
})

export const createSkillDefinitionSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  name: z.string().min(1).max(255),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']),
  category: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  requiresVerification: z.boolean().default(false),
  requiresExpiry: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const updateSkillDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']).optional(),
  category: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  requiresVerification: z.boolean().optional(),
  requiresExpiry: z.boolean().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const deleteSkillDefinitionSchema = z.object({
  id: z.string(),
})

// ---------------------------------------------------------------------------
// Capacity Type Definitions (Registry)
// ---------------------------------------------------------------------------

export const listCapacityTypesSchema = z.object({
  isActive: z.boolean().optional(),
})

export const getCapacityTypeSchema = z.object({
  id: z.string(),
})

export const updateCapacityTypeSchema = z.object({
  id: z.string(),
  defaultMaxDaily: z.number().int().min(0).nullable().optional(),
  defaultMaxWeekly: z.number().int().min(0).nullable().optional(),
  defaultMaxConcurrent: z.number().int().min(0).nullable().optional(),
})

// ---------------------------------------------------------------------------
// Enhanced Skill Assignment (catalog-aware)
// ---------------------------------------------------------------------------

export const assignSkillSchema = z.object({
  userId: z.string(),
  skillDefinitionId: z.string(),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  expiresAt: z.string().datetime().optional(),
  verifiedBy: z.string().optional(),
})

export const unassignSkillSchema = z.object({
  userId: z.string(),
  skillDefinitionId: z.string(),
})

export const listUserSkillsSchema = z.object({
  userId: z.string(),
})
```

**Step 2: Update `findAvailableStaffSchema` to support catalog references**

Replace the existing `findAvailableStaffSchema` (lines 99-113) with:

```ts
export const findAvailableStaffSchema = z.object({
  requiredSkills: z.array(z.object({
    skillDefinitionId: z.string().optional(),
    skillType: z.enum(['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM']).optional(),
    skillId: z.string().optional(),
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

**Step 3: Commit**

```bash
git add src/shared/resource-pool/resource-pool.schemas.ts
git commit -m "feat: add Zod schemas for skill catalog and capacity type registry"
```

---

### Task 4: Add Repository Methods — Skill Definitions & Capacity Types

**Files:**
- Modify: `src/shared/resource-pool/resource-pool.repository.ts`

**Step 1: Add imports for the new schema tables**

Update the import from `@/shared/db/schema` (line 6-9) to include the new tables:

```ts
import {
  resourceSkills,
  resourceCapacities,
  resourceAssignments,
  skillDefinitions,
  capacityTypeDefinitions,
} from "@/shared/db/schema"
```

Add `ilike` to the drizzle-orm import (line 10):

```ts
import { eq, and, or, lte, gte, isNull, inArray, sql, desc, ilike } from "drizzle-orm"
```

Add the new type imports (line 11-15):

```ts
import type {
  ResourceSkillInput,
  ResourceCapacityInput,
  AssignmentRequest,
  SkillDefinitionInput,
  SkillDefinitionFilter,
  CapacityTypeInput,
} from "./resource-pool.types"
```

**Step 2: Add skill definitions repository methods**

Add after the existing `checkSkillValid` method (after line 114), before the Capacities section comment:

```ts
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
```

**Step 3: Add capacity type definitions repository methods**

Add after the existing `listCapacities` method (after line 174), before the Assignments section comment:

```ts
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
```

**Step 4: Add catalog-aware skill assignment methods**

Add after the existing `checkSkillValid` method area, inside the skill definitions section:

```ts
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
```

**Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 6: Commit**

```bash
git add src/shared/resource-pool/resource-pool.repository.ts
git commit -m "feat: add repository methods for skill catalog and capacity type registry"
```

---

### Task 5: Add Service Methods — Registration, Seeding, Matching Engine

**Files:**
- Modify: `src/shared/resource-pool/resource-pool.service.ts`

**Step 1: Add new type imports**

Update the type imports (lines 4-12) to include new types:

```ts
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
```

**Step 2: Add skill catalog service methods**

Add after the existing `checkSkillValid` method (after line 45):

```ts
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
```

**Step 3: Add capacity type registry service methods**

Add after the existing `getCapacity` method area:

```ts
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
```

**Step 4: Add module integration methods**

Add after the capacity type methods:

```ts
  // -------------------------------------------------------------------------
  // Module Integration
  // -------------------------------------------------------------------------

  async registerModuleCapacity(tenantId: string, moduleSlug: string, config: ManifestCapacityType) {
    // First try to reactivate existing
    await resourcePoolRepository.reactivateCapacityTypeByModule(tenantId, moduleSlug)

    // Upsert in case it doesn't exist yet
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
```

**Step 5: Add the matching engine**

Add before the closing of the `resourcePoolService` object, after the workload section:

```ts
  // -------------------------------------------------------------------------
  // Matching Engine
  // -------------------------------------------------------------------------

  async findAvailableStaff(tenantId: string, input: FindAvailableStaffInput): Promise<{ candidates: RankedStaffCandidate[]; totalMatched: number }> {
    // Stage 1: Get all team members for this tenant
    let candidateUserIds: string[] = await this.getTeamMemberIds(tenantId)

    if (candidateUserIds.length === 0) {
      return { candidates: [], totalMatched: 0 }
    }

    // Stage 2: Skill filter
    if (input.requiredSkills && input.requiredSkills.length > 0) {
      candidateUserIds = await this.filterBySkills(tenantId, candidateUserIds, input.requiredSkills)
      if (candidateUserIds.length === 0) {
        return { candidates: [], totalMatched: 0 }
      }
    }

    // Stage 3: Capacity filter
    const capacityCandidates = await this.filterByCapacity(
      tenantId, candidateUserIds, input.capacityType, input.date, input.minAvailableCapacity ?? 1
    )
    if (capacityCandidates.length === 0) {
      return { candidates: [], totalMatched: 0 }
    }

    // Stage 4: Rank
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
        eq(users.isTeamMember, true),
      ))
    return rows.map(r => r.id)
  },

  async filterBySkills(tenantId: string, userIds: string[], requirements: FindAvailableStaffInput['requiredSkills']): Promise<string[]> {
    if (!requirements || requirements.length === 0) return userIds

    let filtered = new Set(userIds)

    for (const req of requirements) {
      const matching = new Set<string>()

      if (req.skillDefinitionId) {
        // Catalog-based lookup
        const users = await resourcePoolRepository.findUsersWithSkill(
          tenantId, '', '', req.minProficiency
        )
        // Refine: query by skillDefinitionId directly
        const rows = await db
          .select({ userId: resourceSkills.userId })
          .from(resourceSkills)
          .where(and(
            eq(resourceSkills.tenantId, tenantId),
            eq(resourceSkills.skillDefinitionId, req.skillDefinitionId),
            ...(req.minProficiency ? [inArray(resourceSkills.proficiency, getProficiencyLevelsAbove(req.minProficiency))] : []),
          ))

        for (const row of rows) {
          if (filtered.has(row.userId)) matching.add(row.userId)
        }
      } else if (req.skillType && req.skillId) {
        // Legacy freeform lookup
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
          name: '', // Caller can enrich with user names
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
        // Score already set during skill filtering; sort descending
        sorted.sort((a, b) => b.score - a.score)
        break
      case 'ROUND_ROBIN':
        // Sort by score (which would be set to lastAssignedAt timestamp)
        sorted.sort((a, b) => a.score - b.score)
        break
      default:
        break
    }

    return sorted.map((c, i) => ({ ...c, score: candidates.length - i }))
  },
```

**Step 6: Add helper imports at the top of the file**

After the existing imports, add:

```ts
import { db } from "@/shared/db"
import { resourceSkills } from "@/shared/db/schema"
import { eq, and, inArray } from "drizzle-orm"

function getProficiencyLevelsAbove(min: string): string[] {
  const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
  const idx = levels.indexOf(min)
  return idx >= 0 ? levels.slice(idx) : levels
}
```

**Step 7: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

**Step 8: Commit**

```bash
git add src/shared/resource-pool/resource-pool.service.ts
git commit -m "feat: add service methods for skill catalog, capacity registry, and matching engine"
```

---

### Task 6: Add Router — Resource Pool tRPC Router

**Files:**
- Create: `src/shared/resource-pool/resource-pool.router.ts`
- Modify: `src/server/root.ts`

**Step 1: Create the router file**

```ts
// src/shared/resource-pool/resource-pool.router.ts
import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc"
import { resourcePoolService } from "./resource-pool.service"
import {
  listSkillDefinitionsSchema,
  getSkillDefinitionSchema,
  createSkillDefinitionSchema,
  updateSkillDefinitionSchema,
  deleteSkillDefinitionSchema,
  listCapacityTypesSchema,
  getCapacityTypeSchema,
  updateCapacityTypeSchema,
  findAvailableStaffSchema,
  assignSkillSchema,
  unassignSkillSchema,
  listUserSkillsSchema,
} from "./resource-pool.schemas"

const skillDefinitionsRouter = router({
  list: tenantProcedure
    .input(listSkillDefinitionsSchema)
    .query(({ ctx, input }) => resourcePoolService.listSkillDefinitions(ctx.tenantId, input)),

  getById: tenantProcedure
    .input(getSkillDefinitionSchema)
    .query(({ ctx, input }) => resourcePoolService.getSkillDefinitionById(ctx.tenantId, input.id)),

  create: permissionProcedure('resource-pool:manage')
    .input(createSkillDefinitionSchema)
    .mutation(({ ctx, input }) => resourcePoolService.createSkillDefinition(ctx.tenantId, input)),

  update: permissionProcedure('resource-pool:manage')
    .input(updateSkillDefinitionSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...updates } = input
      return resourcePoolService.updateSkillDefinition(ctx.tenantId, id, updates)
    }),

  delete: permissionProcedure('resource-pool:manage')
    .input(deleteSkillDefinitionSchema)
    .mutation(({ ctx, input }) => resourcePoolService.softDeleteSkillDefinition(ctx.tenantId, input.id)),
})

const capacityTypesRouter = router({
  list: tenantProcedure
    .input(listCapacityTypesSchema)
    .query(({ ctx, input }) => resourcePoolService.listCapacityTypeDefinitions(ctx.tenantId, input.isActive)),

  getById: tenantProcedure
    .input(getCapacityTypeSchema)
    .query(({ ctx, input }) => resourcePoolService.getCapacityTypeDefinitionById(ctx.tenantId, input.id)),

  update: permissionProcedure('resource-pool:manage')
    .input(updateCapacityTypeSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...updates } = input
      return resourcePoolService.updateCapacityTypeDefinition(ctx.tenantId, id, updates)
    }),
})

const matchingRouter = router({
  findAvailable: tenantProcedure
    .input(findAvailableStaffSchema)
    .query(({ ctx, input }) => resourcePoolService.findAvailableStaff(ctx.tenantId, input)),
})

const skillsRouter = router({
  assign: permissionProcedure('resource-pool:manage')
    .input(assignSkillSchema)
    .mutation(({ ctx, input }) => resourcePoolService.assignSkillFromCatalog(
      ctx.tenantId, input.userId, input.skillDefinitionId, {
        proficiency: input.proficiency,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        verifiedBy: input.verifiedBy,
      }
    )),

  unassign: permissionProcedure('resource-pool:manage')
    .input(unassignSkillSchema)
    .mutation(({ ctx, input }) => resourcePoolService.unassignSkillFromCatalog(
      ctx.tenantId, input.userId, input.skillDefinitionId
    )),

  listForUser: tenantProcedure
    .input(listUserSkillsSchema)
    .query(({ ctx, input }) => resourcePoolService.listSkillsForUser(ctx.tenantId, input.userId)),
})

export const resourcePoolRouter = router({
  skillDefinitions: skillDefinitionsRouter,
  capacityTypes: capacityTypesRouter,
  matching: matchingRouter,
  skills: skillsRouter,
})
```

**Step 2: Add to root router**

In `src/server/root.ts`, add the import:

```ts
import { resourcePoolRouter } from "@/shared/resource-pool/resource-pool.router"
```

Add to the router object:

```ts
  resourcePool: resourcePoolRouter,
```

**Step 3: Export from barrel**

In `src/shared/resource-pool/index.ts`, add:

```ts
export { resourcePoolRouter } from "./resource-pool.router"
```

And add the new type exports:

```ts
export type {
  // ...existing exports...
  SkillDefinitionInput,
  SkillDefinitionRecord,
  SkillDefinitionFilter,
  CapacityTypeInput,
  CapacityTypeRecord,
  ManifestCapacityType,
  ManifestSuggestedSkill,
  ResourcePoolManifestConfig,
} from "./resource-pool.types"
```

**Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

**Step 5: Commit**

```bash
git add src/shared/resource-pool/resource-pool.router.ts src/server/root.ts src/shared/resource-pool/index.ts
git commit -m "feat: add resource pool tRPC router with skill catalog and capacity type endpoints"
```

---

### Task 7: Add Manifest Integration — `resourcePool` Config to ModuleManifest

**Files:**
- Modify: `src/shared/module-system/types.ts`
- Modify: `src/modules/booking/booking.manifest.ts`

**Step 1: Add `resourcePool` field to `ModuleManifest` interface**

In `src/shared/module-system/types.ts`, add the import and field. After the `notificationTriggers` field (line 90), add:

```ts
  resourcePool?: {
    capacityType?: {
      slug: string
      name: string
      unit: 'COUNT' | 'HOURS' | 'POINTS'
      defaultMaxDaily: number | null
      defaultMaxWeekly: number | null
      defaultMaxConcurrent: number | null
    }
    suggestedSkills?: {
      slug: string
      name: string
      skillType: 'SERVICE' | 'CERTIFICATION' | 'LANGUAGE' | 'QUALIFICATION' | 'EQUIPMENT' | 'CUSTOM'
    }[]
  }
```

**Step 2: Add resource pool config to booking manifest**

In `src/modules/booking/booking.manifest.ts`, add after `settingsDefinitions` (before the closing `}`):

```ts
  resourcePool: {
    capacityType: {
      slug: 'bookings',
      name: 'Bookings',
      unit: 'COUNT',
      defaultMaxDaily: 8,
      defaultMaxWeekly: null,
      defaultMaxConcurrent: null,
    },
    suggestedSkills: [
      { slug: 'haircut', name: 'Haircut', skillType: 'SERVICE' },
      { slug: 'color-treatment', name: 'Color Treatment', skillType: 'SERVICE' },
      { slug: 'beard-trim', name: 'Beard Trim', skillType: 'SERVICE' },
    ],
  },
```

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/shared/module-system/types.ts src/modules/booking/booking.manifest.ts
git commit -m "feat: add resourcePool config to module manifest interface and booking manifest"
```

---

### Task 8: Write Tests — Skill Definitions Repository

**Files:**
- Modify: `src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`

**Step 1: Add skill definitions tests**

Add after the existing `describe('resourcePoolRepository.assignments', ...)` block (after line 261):

```ts
// ---------------------------------------------------------------------------
// Skill Definitions (Catalog)
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.skillDefinitions', () => {
  it('createSkillDefinition inserts and returns the record', async () => {
    const def = {
      id: 'def-1', tenantId: TENANT, slug: 'pipe-fitting', name: 'Pipe Fitting',
      skillType: 'QUALIFICATION', category: 'Trade Skills', description: null,
      requiresVerification: false, requiresExpiry: false, isActive: true,
      metadata: null, createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([def])

    const result = await resourcePoolRepository.createSkillDefinition(TENANT, {
      name: 'Pipe Fitting', skillType: 'QUALIFICATION', category: 'Trade Skills',
    })

    expect(result).toEqual(def)
  })

  it('createSkillDefinition auto-generates slug from name', async () => {
    const def = {
      id: 'def-2', tenantId: TENANT, slug: 'first-aid-certificate', name: 'First Aid Certificate',
      skillType: 'CERTIFICATION', category: 'Safety', description: null,
      requiresVerification: true, requiresExpiry: true, isActive: true,
      metadata: null, createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([def])

    const result = await resourcePoolRepository.createSkillDefinition(TENANT, {
      name: 'First Aid Certificate', skillType: 'CERTIFICATION', category: 'Safety',
      requiresVerification: true, requiresExpiry: true,
    })

    expect(result.slug).toBe('first-aid-certificate')
  })

  it('listSkillDefinitions returns definitions for a tenant', async () => {
    const defs = [
      { id: 'def-1', slug: 'pipe-fitting', name: 'Pipe Fitting' },
      { id: 'def-2', slug: 'first-aid', name: 'First Aid' },
    ]
    setSelectQueue(defs)

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT)
    expect(result).toHaveLength(2)
  })

  it('listSkillDefinitions filters by skillType', async () => {
    setSelectQueue([{ id: 'def-1', skillType: 'CERTIFICATION' }])

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT, { skillType: 'CERTIFICATION' })
    expect(result).toHaveLength(1)
  })

  it('listSkillDefinitions filters by isActive', async () => {
    setSelectQueue([{ id: 'def-1', isActive: true }])

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT, { isActive: true })
    expect(result).toHaveLength(1)
  })

  it('listSkillDefinitions filters by search term', async () => {
    setSelectQueue([{ id: 'def-1', name: 'Pipe Fitting' }])

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT, { search: 'pipe' })
    expect(result).toHaveLength(1)
  })

  it('getSkillDefinitionById returns the definition or null', async () => {
    setSelectQueue([{ id: 'def-1', slug: 'pipe-fitting' }])

    const result = await resourcePoolRepository.getSkillDefinitionById(TENANT, 'def-1')
    expect(result).not.toBeNull()
    expect(result!.slug).toBe('pipe-fitting')
  })

  it('getSkillDefinitionById returns null when not found', async () => {
    setSelectQueue([])

    const result = await resourcePoolRepository.getSkillDefinitionById(TENANT, 'nonexistent')
    expect(result).toBeNull()
  })

  it('updateSkillDefinition updates and returns the record', async () => {
    setUpdateResult([{ id: 'def-1', name: 'Updated Name', isActive: true }])

    const result = await resourcePoolRepository.updateSkillDefinition(TENANT, 'def-1', { name: 'Updated Name' })
    expect(result.name).toBe('Updated Name')
  })

  it('updateSkillDefinition throws NotFoundError when missing', async () => {
    setUpdateResult([])

    await expect(
      resourcePoolRepository.updateSkillDefinition(TENANT, 'nonexistent', { name: 'X' })
    ).rejects.toThrow('not found')
  })

  it('softDeleteSkillDefinition sets isActive to false', async () => {
    setUpdateResult([{ id: 'def-1', isActive: false }])

    const result = await resourcePoolRepository.softDeleteSkillDefinition(TENANT, 'def-1')
    expect(result.isActive).toBe(false)
  })

  it('upsertSkillDefinitionBySlug is idempotent', async () => {
    // First call inserts
    setInsertResult([{ id: 'def-1', slug: 'haircut', name: 'Haircut' }])
    const first = await resourcePoolRepository.upsertSkillDefinitionBySlug(TENANT, {
      slug: 'haircut', name: 'Haircut', skillType: 'SERVICE',
    })
    expect(first).not.toBeNull()

    // Second call with conflict returns null (no-op)
    setInsertResult([])
    const second = await resourcePoolRepository.upsertSkillDefinitionBySlug(TENANT, {
      slug: 'haircut', name: 'Haircut', skillType: 'SERVICE',
    })
    expect(second).toBeNull()
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/shared/resource-pool/__tests__/resource-pool.repository.test.ts
git commit -m "test: add skill definitions repository tests"
```

---

### Task 9: Write Tests — Capacity Type Definitions Repository

**Files:**
- Modify: `src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`

**Step 1: Add capacity type definition tests**

Add after the skill definitions test block:

```ts
// ---------------------------------------------------------------------------
// Capacity Type Definitions (Registry)
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.capacityTypeDefinitions', () => {
  it('upsertCapacityTypeDefinition inserts and returns the record', async () => {
    const capType = {
      id: 'ct-1', tenantId: TENANT, slug: 'bookings', name: 'Bookings',
      description: null, unit: 'COUNT', defaultMaxDaily: 8,
      defaultMaxWeekly: null, defaultMaxConcurrent: null,
      registeredByModule: 'booking', isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([capType])

    const result = await resourcePoolRepository.upsertCapacityTypeDefinition(TENANT, 'booking', {
      slug: 'bookings', name: 'Bookings', defaultMaxDaily: 8,
    })

    expect(result).toEqual(capType)
  })

  it('upsertCapacityTypeDefinition is idempotent', async () => {
    setInsertResult([])

    const result = await resourcePoolRepository.upsertCapacityTypeDefinition(TENANT, 'booking', {
      slug: 'bookings', name: 'Bookings', defaultMaxDaily: 8,
    })

    expect(result).toBeNull()
  })

  it('listCapacityTypeDefinitions returns all for tenant', async () => {
    setSelectQueue([
      { id: 'ct-1', slug: 'bookings' },
      { id: 'ct-2', slug: 'projects' },
    ])

    const result = await resourcePoolRepository.listCapacityTypeDefinitions(TENANT)
    expect(result).toHaveLength(2)
  })

  it('listCapacityTypeDefinitions filters by isActive', async () => {
    setSelectQueue([{ id: 'ct-1', slug: 'bookings', isActive: true }])

    const result = await resourcePoolRepository.listCapacityTypeDefinitions(TENANT, true)
    expect(result).toHaveLength(1)
  })

  it('getCapacityTypeDefinitionById returns the record or null', async () => {
    setSelectQueue([{ id: 'ct-1', slug: 'bookings' }])

    const result = await resourcePoolRepository.getCapacityTypeDefinitionById(TENANT, 'ct-1')
    expect(result).not.toBeNull()
  })

  it('getCapacityTypeDefinitionById returns null when not found', async () => {
    setSelectQueue([])

    const result = await resourcePoolRepository.getCapacityTypeDefinitionById(TENANT, 'nonexistent')
    expect(result).toBeNull()
  })

  it('updateCapacityTypeDefinition updates defaults', async () => {
    setUpdateResult([{ id: 'ct-1', defaultMaxDaily: 10 }])

    const result = await resourcePoolRepository.updateCapacityTypeDefinition(TENANT, 'ct-1', { defaultMaxDaily: 10 })
    expect(result.defaultMaxDaily).toBe(10)
  })

  it('updateCapacityTypeDefinition throws NotFoundError when missing', async () => {
    setUpdateResult([])

    await expect(
      resourcePoolRepository.updateCapacityTypeDefinition(TENANT, 'nonexistent', { defaultMaxDaily: 5 })
    ).rejects.toThrow('not found')
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.repository.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/shared/resource-pool/__tests__/resource-pool.repository.test.ts
git commit -m "test: add capacity type definitions repository tests"
```

---

### Task 10: Write Tests — Service (Catalog, Registration, Matching)

**Files:**
- Modify: `src/shared/resource-pool/__tests__/resource-pool.service.test.ts`

**Step 1: Add new mock methods to the hoisted mock**

Update the `mockRepo` at the top of the file to include the new methods:

```ts
const mockRepo = vi.hoisted(() => ({
  // ...existing mocks...
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
  // New catalog methods
  listSkillDefinitions: vi.fn(),
  getSkillDefinitionById: vi.fn(),
  createSkillDefinition: vi.fn(),
  updateSkillDefinition: vi.fn(),
  softDeleteSkillDefinition: vi.fn(),
  upsertSkillDefinitionBySlug: vi.fn(),
  assignSkillFromCatalog: vi.fn(),
  unassignSkillFromCatalog: vi.fn(),
  listSkillsForUser: vi.fn(),
  // New capacity type methods
  listCapacityTypeDefinitions: vi.fn(),
  getCapacityTypeDefinitionById: vi.fn(),
  upsertCapacityTypeDefinition: vi.fn(),
  updateCapacityTypeDefinition: vi.fn(),
  deactivateCapacityTypeByModule: vi.fn(),
  reactivateCapacityTypeByModule: vi.fn(),
}))
```

**Step 2: Add skill catalog service tests**

Add after the existing `describe('resourcePoolService.getStaffWorkload', ...)` block:

```ts
// ---------------------------------------------------------------------------
// Skill Catalog (service delegation)
// ---------------------------------------------------------------------------

describe('resourcePoolService.skillCatalog', () => {
  it('createSkillDefinition delegates to repo', async () => {
    const def = { id: 'def-1', name: 'Pipe Fitting', slug: 'pipe-fitting' }
    mockRepo.createSkillDefinition.mockResolvedValue(def)

    const result = await resourcePoolService.createSkillDefinition(TENANT, {
      name: 'Pipe Fitting', skillType: 'QUALIFICATION',
    })

    expect(result).toEqual(def)
    expect(mockRepo.createSkillDefinition).toHaveBeenCalledWith(TENANT, {
      name: 'Pipe Fitting', skillType: 'QUALIFICATION',
    })
  })

  it('softDeleteSkillDefinition delegates to repo', async () => {
    mockRepo.softDeleteSkillDefinition.mockResolvedValue({ id: 'def-1', isActive: false })

    const result = await resourcePoolService.softDeleteSkillDefinition(TENANT, 'def-1')
    expect(result.isActive).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Module Integration
// ---------------------------------------------------------------------------

describe('resourcePoolService.moduleIntegration', () => {
  it('registerModuleCapacity reactivates and upserts', async () => {
    mockRepo.reactivateCapacityTypeByModule.mockResolvedValue(undefined)
    mockRepo.upsertCapacityTypeDefinition.mockResolvedValue({ id: 'ct-1' })

    await resourcePoolService.registerModuleCapacity(TENANT, 'booking', {
      slug: 'bookings', name: 'Bookings', unit: 'COUNT',
      defaultMaxDaily: 8, defaultMaxWeekly: null, defaultMaxConcurrent: null,
    })

    expect(mockRepo.reactivateCapacityTypeByModule).toHaveBeenCalledWith(TENANT, 'booking')
    expect(mockRepo.upsertCapacityTypeDefinition).toHaveBeenCalledWith(TENANT, 'booking', expect.objectContaining({
      slug: 'bookings',
    }))
  })

  it('deactivateModuleCapacity delegates to repo', async () => {
    mockRepo.deactivateCapacityTypeByModule.mockResolvedValue(undefined)

    await resourcePoolService.deactivateModuleCapacity(TENANT, 'booking')
    expect(mockRepo.deactivateCapacityTypeByModule).toHaveBeenCalledWith(TENANT, 'booking')
  })

  it('seedSuggestedSkills calls upsert for each skill', async () => {
    mockRepo.upsertSkillDefinitionBySlug.mockResolvedValue(null)

    await resourcePoolService.seedSuggestedSkills(TENANT, [
      { slug: 'haircut', name: 'Haircut', skillType: 'SERVICE' },
      { slug: 'color', name: 'Color Treatment', skillType: 'SERVICE' },
    ])

    expect(mockRepo.upsertSkillDefinitionBySlug).toHaveBeenCalledTimes(2)
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/shared/resource-pool/__tests__/resource-pool.service.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/shared/resource-pool/__tests__/resource-pool.service.test.ts
git commit -m "test: add service tests for skill catalog, module integration, and matching"
```

---

### Task 11: Verify — Type Check, Full Test Suite, Build

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing + ~25 new)

**Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Commit any fixes needed**

If any fixes are needed, commit them individually with descriptive messages.

**Step 5: Final commit if all clean**

```bash
git add -A
git status
# Only commit if there are unstaged fixes
```
