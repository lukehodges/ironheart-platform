# Pipeline Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract pipeline from customer module into an independent pipeline module with configurable stages, multiple pipelines per tenant, multi-membership, and workflow engine integration.

**Architecture:** New `pipeline` module following established module patterns (types → schemas → repository → service → router → events → manifest). 4 new DB tables replace the hardcoded pipeline columns on customers. Pipeline emits Inngest events that the workflow engine hooks into for automation.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, postgres.js, Inngest, Zod v4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-pipeline-module-design.md`

---

### Task 1: Pipeline DB Schema

**Files:**
- Create: `src/shared/db/schemas/pipeline.schema.ts`
- Modify: `src/shared/db/schema.ts`
- Modify: `src/shared/db/schemas/customer.schema.ts`

- [ ] **Step 1: Create pipeline schema file**

```typescript
// src/shared/db/schemas/pipeline.schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { customers } from "./customer.schema"
import { users } from "./auth.schema"

// --------------------------------------------------------------------------
// Enums
// --------------------------------------------------------------------------

export const pipelineStageTypeEnum = pgEnum("pipeline_stage_type", [
  "OPEN",
  "WON",
  "LOST",
])

// --------------------------------------------------------------------------
// Tables
// --------------------------------------------------------------------------

export const pipelines = pgTable("pipelines", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  description: text(),
  isDefault: boolean().notNull().default(false),
  isArchived: boolean().notNull().default(false),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("pipelines_tenantId_idx").on(table.tenantId),
  uniqueIndex("pipelines_tenantId_isDefault_idx")
    .on(table.tenantId)
    .where(sql`${table.isDefault} = true`),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pipelines_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  pipelineId: uuid().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  position: integer().notNull(),
  color: text(),
  type: pipelineStageTypeEnum().notNull().default("OPEN"),
  allowedTransitions: uuid().array().notNull().default(sql`'{}'::uuid[]`),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("pipeline_stages_pipelineId_idx").on(table.pipelineId),
  index("pipeline_stages_tenantId_idx").on(table.tenantId),
  uniqueIndex("pipeline_stages_pipelineId_slug_idx").on(table.pipelineId, table.slug),
  uniqueIndex("pipeline_stages_pipelineId_position_idx").on(table.pipelineId, table.position),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pipeline_stages_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.pipelineId],
    foreignColumns: [pipelines.id],
    name: "pipeline_stages_pipelineId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const pipelineMembers = pgTable("pipeline_members", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  pipelineId: uuid().notNull(),
  customerId: uuid().notNull(),
  stageId: uuid().notNull(),
  dealValue: numeric({ precision: 12, scale: 2 }),
  lostReason: text(),
  enteredStageAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  addedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  closedAt: timestamp({ precision: 3, mode: "date" }),
  metadata: jsonb().$type<Record<string, unknown>>().default({}),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("pipeline_members_pipelineId_customerId_idx").on(table.pipelineId, table.customerId),
  index("pipeline_members_pipelineId_stageId_idx").on(table.pipelineId, table.stageId),
  index("pipeline_members_customerId_idx").on(table.customerId),
  index("pipeline_members_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pipeline_members_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.pipelineId],
    foreignColumns: [pipelines.id],
    name: "pipeline_members_pipelineId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "pipeline_members_customerId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.stageId],
    foreignColumns: [pipelineStages.id],
    name: "pipeline_members_stageId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const pipelineStageHistory = pgTable("pipeline_stage_history", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  memberId: uuid().notNull(),
  fromStageId: uuid(),
  toStageId: uuid().notNull(),
  changedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  changedById: uuid(),
  dealValue: numeric({ precision: 12, scale: 2 }),
  lostReason: text(),
  notes: text(),
}, (table) => [
  index("pipeline_stage_history_memberId_idx").on(table.memberId),
  index("pipeline_stage_history_tenantId_changedAt_idx").on(table.tenantId, table.changedAt),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pipeline_stage_history_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.memberId],
    foreignColumns: [pipelineMembers.id],
    name: "pipeline_stage_history_memberId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.changedById],
    foreignColumns: [users.id],
    name: "pipeline_stage_history_changedById_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

// --------------------------------------------------------------------------
// Inferred types
// --------------------------------------------------------------------------

export type PipelineRow = typeof pipelines.$inferSelect
export type PipelineStageRow = typeof pipelineStages.$inferSelect
export type PipelineMemberRow = typeof pipelineMembers.$inferSelect
export type PipelineStageHistoryRow = typeof pipelineStageHistory.$inferSelect
```

- [ ] **Step 2: Export from schema barrel**

Add to `src/shared/db/schema.ts`:
```typescript
export * from "./schemas/pipeline.schema"
```

- [ ] **Step 3: Remove pipeline columns from customer schema**

In `src/shared/db/schemas/customer.schema.ts`:
- Remove `pipelineStageEnum` import/export and the `pgEnum("pipeline_stage", [...])` definition
- Remove from `customers` table: `pipelineStage`, `pipelineStageChangedAt`, `lostReason`, `dealValue` columns
- Remove index: `customers_tenantId_pipelineStage_idx`
- Remove the entire `pipelineStageHistory` table definition and its `PipelineStageHistoryRow` type export

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schemas/pipeline.schema.ts src/shared/db/schema.ts src/shared/db/schemas/customer.schema.ts
git commit -m "feat(pipeline): add pipeline DB schema, remove pipeline columns from customers"
```

---

### Task 2: Pipeline Types

**Files:**
- Create: `src/modules/pipeline/pipeline.types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/modules/pipeline/pipeline.types.ts

export type PipelineStageType = "OPEN" | "WON" | "LOST"

export interface PipelineRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  isDefault: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PipelineStageRecord {
  id: string
  tenantId: string
  pipelineId: string
  name: string
  slug: string
  position: number
  color: string | null
  type: PipelineStageType
  allowedTransitions: string[]
  createdAt: Date
  updatedAt: Date
}

export interface PipelineMemberRecord {
  id: string
  tenantId: string
  pipelineId: string
  customerId: string
  stageId: string
  dealValue: number | null
  lostReason: string | null
  enteredStageAt: Date
  addedAt: Date
  closedAt: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface PipelineMemberWithCustomer extends PipelineMemberRecord {
  customerName: string
  customerEmail: string | null
  customerTags: string[]
}

export interface PipelineStageHistoryRecord {
  id: string
  tenantId: string
  memberId: string
  fromStageId: string | null
  toStageId: string
  changedAt: Date
  changedById: string | null
  dealValue: number | null
  lostReason: string | null
  notes: string | null
}

export interface PipelineWithStages extends PipelineRecord {
  stages: PipelineStageRecord[]
}

export interface PipelineStageSummary {
  stageId: string
  count: number
  totalDealValue: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/pipeline/pipeline.types.ts
git commit -m "feat(pipeline): add pipeline type definitions"
```

---

### Task 3: Pipeline Schemas

**Files:**
- Create: `src/modules/pipeline/pipeline.schemas.ts`

- [ ] **Step 1: Create Zod schemas**

```typescript
// src/modules/pipeline/pipeline.schemas.ts
import { z } from "zod"

// --------------------------------------------------------------------------
// Pipeline CRUD
// --------------------------------------------------------------------------

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  stages: z.array(z.object({
    name: z.string().min(1).max(50),
    slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
    position: z.number().int().min(0),
    color: z.string().max(50).optional(),
    type: z.enum(["OPEN", "WON", "LOST"]).default("OPEN"),
  })).min(1),
})

export const updatePipelineSchema = z.object({
  pipelineId: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const archivePipelineSchema = z.object({
  pipelineId: z.uuid(),
})

export const getPipelineByIdSchema = z.object({
  pipelineId: z.uuid(),
})

// --------------------------------------------------------------------------
// Stage Configuration
// --------------------------------------------------------------------------

export const addStageSchema = z.object({
  pipelineId: z.uuid(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  position: z.number().int().min(0),
  color: z.string().max(50).optional(),
  type: z.enum(["OPEN", "WON", "LOST"]).default("OPEN"),
  allowedTransitions: z.array(z.uuid()).default([]),
})

export const updateStageSchema = z.object({
  stageId: z.uuid(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(50).nullable().optional(),
  type: z.enum(["OPEN", "WON", "LOST"]).optional(),
  allowedTransitions: z.array(z.uuid()).optional(),
})

export const removeStageSchema = z.object({
  stageId: z.uuid(),
  reassignToStageId: z.uuid(),
})

export const reorderStagesSchema = z.object({
  pipelineId: z.uuid(),
  stageIds: z.array(z.uuid()).min(1),
})

// --------------------------------------------------------------------------
// Member Operations
// --------------------------------------------------------------------------

export const addMemberSchema = z.object({
  pipelineId: z.uuid(),
  customerId: z.uuid(),
  stageId: z.uuid().optional(),
  dealValue: z.number().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const moveMemberSchema = z.object({
  memberId: z.uuid(),
  toStageId: z.uuid(),
  dealValue: z.number().min(0).optional(),
  lostReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export const removeMemberSchema = z.object({
  memberId: z.uuid(),
})

export const updateMemberSchema = z.object({
  memberId: z.uuid(),
  dealValue: z.number().min(0).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const listMembersSchema = z.object({
  pipelineId: z.uuid(),
})

export const getSummarySchema = z.object({
  pipelineId: z.uuid(),
})

export const getMemberHistorySchema = z.object({
  memberId: z.uuid(),
})
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/pipeline/pipeline.schemas.ts
git commit -m "feat(pipeline): add Zod input schemas"
```

---

### Task 4: Pipeline Seed

**Files:**
- Create: `src/modules/pipeline/pipeline.seed.ts`

- [ ] **Step 1: Create seed template**

```typescript
// src/modules/pipeline/pipeline.seed.ts
import { db } from "@/shared/db"
import { pipelines, pipelineStages } from "@/shared/db/schema"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "pipeline.seed" })

interface StageDef {
  name: string
  slug: string
  position: number
  color: string
  type: "OPEN" | "WON" | "LOST"
  transitionsToSlugs: string[]
}

const DEFAULT_STAGES: StageDef[] = [
  { name: "Prospect", slug: "prospect", position: 0, color: "#64748b", type: "OPEN", transitionsToSlugs: ["outreach", "lost"] },
  { name: "Outreach", slug: "outreach", position: 1, color: "#0ea5e9", type: "OPEN", transitionsToSlugs: ["discovery", "lost"] },
  { name: "Discovery", slug: "discovery", position: 2, color: "#06b6d4", type: "OPEN", transitionsToSlugs: ["audit", "lost"] },
  { name: "Audit", slug: "audit", position: 3, color: "#6366f1", type: "OPEN", transitionsToSlugs: ["proposal", "lost"] },
  { name: "Proposal", slug: "proposal", position: 4, color: "#8b5cf6", type: "OPEN", transitionsToSlugs: ["negotiation", "lost"] },
  { name: "Negotiation", slug: "negotiation", position: 5, color: "#f59e0b", type: "OPEN", transitionsToSlugs: ["won", "lost"] },
  { name: "Won", slug: "won", position: 6, color: "#10b981", type: "WON", transitionsToSlugs: ["delivering"] },
  { name: "Delivering", slug: "delivering", position: 7, color: "#3b82f6", type: "OPEN", transitionsToSlugs: ["complete"] },
  { name: "Complete", slug: "complete", position: 8, color: "#22c55e", type: "WON", transitionsToSlugs: [] },
  { name: "Lost", slug: "lost", position: 9, color: "#ef4444", type: "LOST", transitionsToSlugs: [] },
]

/**
 * Seed a default "Sales Pipeline" for a tenant.
 * Called during tenant provisioning.
 */
export async function seedDefaultPipeline(tenantId: string): Promise<string> {
  const pipelineId = crypto.randomUUID()
  const now = new Date()

  await db.transaction(async (tx) => {
    // 1. Create pipeline
    await tx.insert(pipelines).values({
      id: pipelineId,
      tenantId,
      name: "Sales Pipeline",
      description: "Default consulting sales pipeline",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    })

    // 2. Create stages (first pass — without transitions)
    const slugToId = new Map<string, string>()
    for (const stage of DEFAULT_STAGES) {
      const stageId = crypto.randomUUID()
      slugToId.set(stage.slug, stageId)

      await tx.insert(pipelineStages).values({
        id: stageId,
        tenantId,
        pipelineId,
        name: stage.name,
        slug: stage.slug,
        position: stage.position,
        color: stage.color,
        type: stage.type,
        allowedTransitions: [],
        createdAt: now,
        updatedAt: now,
      })
    }

    // 3. Update transitions (second pass — now all IDs exist)
    for (const stage of DEFAULT_STAGES) {
      if (stage.transitionsToSlugs.length === 0) continue
      const stageId = slugToId.get(stage.slug)!
      const transitionIds = stage.transitionsToSlugs.map((s) => slugToId.get(s)!)

      await tx
        .update(pipelineStages)
        .set({ allowedTransitions: transitionIds })
        .where(eq(pipelineStages.id, stageId))
    }
  })

  log.info({ tenantId, pipelineId }, "Default pipeline seeded")
  return pipelineId
}
```

Note: The `eq` import from `drizzle-orm` needs to be added at the top:
```typescript
import { eq } from "drizzle-orm"
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/pipeline/pipeline.seed.ts
git commit -m "feat(pipeline): add default pipeline seed template"
```

---

### Task 5: Pipeline Repository

**Files:**
- Create: `src/modules/pipeline/pipeline.repository.ts`

- [ ] **Step 1: Create repository file**

```typescript
// src/modules/pipeline/pipeline.repository.ts
import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError, ConflictError } from "@/shared/errors"
import {
  pipelines,
  pipelineStages,
  pipelineMembers,
  pipelineStageHistory,
  customers,
} from "@/shared/db/schema"
import { eq, and, desc, sql, count, sum, isNull } from "drizzle-orm"
import type {
  PipelineRecord,
  PipelineStageRecord,
  PipelineMemberRecord,
  PipelineMemberWithCustomer,
  PipelineWithStages,
  PipelineStageHistoryRecord,
  PipelineStageSummary,
} from "./pipeline.types"

const log = logger.child({ module: "pipeline.repository" })

// --------------------------------------------------------------------------
// Row mappers
// --------------------------------------------------------------------------

function toPipelineRecord(row: typeof pipelines.$inferSelect): PipelineRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    isDefault: row.isDefault,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toStageRecord(row: typeof pipelineStages.$inferSelect): PipelineStageRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    pipelineId: row.pipelineId,
    name: row.name,
    slug: row.slug,
    position: row.position,
    color: row.color ?? null,
    type: row.type,
    allowedTransitions: (row.allowedTransitions ?? []) as string[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toMemberRecord(row: typeof pipelineMembers.$inferSelect): PipelineMemberRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    pipelineId: row.pipelineId,
    customerId: row.customerId,
    stageId: row.stageId,
    dealValue: row.dealValue ? Number(row.dealValue) : null,
    lostReason: row.lostReason ?? null,
    enteredStageAt: row.enteredStageAt,
    addedAt: row.addedAt,
    closedAt: row.closedAt ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toHistoryRecord(row: typeof pipelineStageHistory.$inferSelect): PipelineStageHistoryRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    memberId: row.memberId,
    fromStageId: row.fromStageId ?? null,
    toStageId: row.toStageId,
    changedAt: row.changedAt,
    changedById: row.changedById ?? null,
    dealValue: row.dealValue ? Number(row.dealValue) : null,
    lostReason: row.lostReason ?? null,
    notes: row.notes ?? null,
  }
}

// --------------------------------------------------------------------------
// Repository
// --------------------------------------------------------------------------

export const pipelineRepository = {

  // ======== PIPELINE CRUD ========

  async list(tenantId: string): Promise<PipelineRecord[]> {
    const rows = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.tenantId, tenantId))
      .orderBy(desc(pipelines.isDefault), pipelines.name)
    return rows.map(toPipelineRecord)
  },

  async findById(tenantId: string, pipelineId: string): Promise<PipelineWithStages | null> {
    const [row] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)))
      .limit(1)

    if (!row) return null

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId))
      .orderBy(pipelineStages.position)

    return {
      ...toPipelineRecord(row),
      stages: stages.map(toStageRecord),
    }
  },

  async findDefault(tenantId: string): Promise<PipelineWithStages | null> {
    const [row] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.isDefault, true)))
      .limit(1)

    if (!row) return null

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, row.id))
      .orderBy(pipelineStages.position)

    return {
      ...toPipelineRecord(row),
      stages: stages.map(toStageRecord),
    }
  },

  async create(tenantId: string, input: {
    name: string
    description?: string
    isDefault?: boolean
    stages: Array<{
      name: string
      slug: string
      position: number
      color?: string
      type: "OPEN" | "WON" | "LOST"
    }>
  }): Promise<PipelineWithStages> {
    const pipelineId = crypto.randomUUID()
    const now = new Date()

    return await db.transaction(async (tx) => {
      // If setting as default, unset existing default
      if (input.isDefault) {
        await tx
          .update(pipelines)
          .set({ isDefault: false, updatedAt: now })
          .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.isDefault, true)))
      }

      const [pipelineRow] = await tx
        .insert(pipelines)
        .values({
          id: pipelineId,
          tenantId,
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      const stageRows: Array<typeof pipelineStages.$inferSelect> = []
      for (const stage of input.stages) {
        const [row] = await tx
          .insert(pipelineStages)
          .values({
            id: crypto.randomUUID(),
            tenantId,
            pipelineId,
            name: stage.name,
            slug: stage.slug,
            position: stage.position,
            color: stage.color ?? null,
            type: stage.type,
            allowedTransitions: [],
            createdAt: now,
            updatedAt: now,
          })
          .returning()
        stageRows.push(row)
      }

      return {
        ...toPipelineRecord(pipelineRow),
        stages: stageRows.map(toStageRecord),
      }
    })
  },

  async update(tenantId: string, pipelineId: string, input: {
    name?: string
    description?: string | null
    isDefault?: boolean
  }): Promise<PipelineRecord> {
    const now = new Date()

    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(pipelines)
          .set({ isDefault: false, updatedAt: now })
          .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.isDefault, true)))
      }

      const updates: Record<string, unknown> = { updatedAt: now }
      if (input.name !== undefined) updates.name = input.name
      if (input.description !== undefined) updates.description = input.description
      if (input.isDefault !== undefined) updates.isDefault = input.isDefault

      const [row] = await tx
        .update(pipelines)
        .set(updates)
        .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)))
        .returning()

      if (!row) throw new NotFoundError("Pipeline", pipelineId)
      return toPipelineRecord(row)
    })
  },

  async archive(tenantId: string, pipelineId: string): Promise<void> {
    const [row] = await db
      .update(pipelines)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)))
      .returning()

    if (!row) throw new NotFoundError("Pipeline", pipelineId)
  },

  // ======== STAGE CONFIGURATION ========

  async findStageById(tenantId: string, stageId: string): Promise<PipelineStageRecord | null> {
    const [row] = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)))
      .limit(1)

    return row ? toStageRecord(row) : null
  },

  async addStage(tenantId: string, input: {
    pipelineId: string
    name: string
    slug: string
    position: number
    color?: string
    type: "OPEN" | "WON" | "LOST"
    allowedTransitions: string[]
  }): Promise<PipelineStageRecord> {
    const [row] = await db
      .insert(pipelineStages)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        pipelineId: input.pipelineId,
        name: input.name,
        slug: input.slug,
        position: input.position,
        color: input.color ?? null,
        type: input.type,
        allowedTransitions: input.allowedTransitions,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return toStageRecord(row)
  },

  async updateStage(tenantId: string, stageId: string, input: {
    name?: string
    color?: string | null
    type?: "OPEN" | "WON" | "LOST"
    allowedTransitions?: string[]
  }): Promise<PipelineStageRecord> {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (input.name !== undefined) updates.name = input.name
    if (input.color !== undefined) updates.color = input.color
    if (input.type !== undefined) updates.type = input.type
    if (input.allowedTransitions !== undefined) updates.allowedTransitions = input.allowedTransitions

    const [row] = await db
      .update(pipelineStages)
      .set(updates)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)))
      .returning()

    if (!row) throw new NotFoundError("PipelineStage", stageId)
    return toStageRecord(row)
  },

  async removeStage(tenantId: string, stageId: string, reassignToStageId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Reassign members to new stage
      await tx
        .update(pipelineMembers)
        .set({ stageId: reassignToStageId, enteredStageAt: new Date(), updatedAt: new Date() })
        .where(and(eq(pipelineMembers.stageId, stageId), eq(pipelineMembers.tenantId, tenantId)))

      // 2. Get the stage to find its pipeline
      const [stage] = await tx
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)))
        .limit(1)

      if (!stage) throw new NotFoundError("PipelineStage", stageId)

      // 3. Strip removed stage ID from sibling allowedTransitions
      const siblings = await tx
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.pipelineId, stage.pipelineId), eq(pipelineStages.tenantId, tenantId)))

      for (const sibling of siblings) {
        const transitions = (sibling.allowedTransitions ?? []) as string[]
        if (transitions.includes(stageId)) {
          await tx
            .update(pipelineStages)
            .set({ allowedTransitions: transitions.filter((id) => id !== stageId), updatedAt: new Date() })
            .where(eq(pipelineStages.id, sibling.id))
        }
      }

      // 4. Delete the stage
      await tx
        .delete(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
    })
  },

  async reorderStages(tenantId: string, pipelineId: string, stageIds: string[]): Promise<void> {
    const now = new Date()
    await db.transaction(async (tx) => {
      for (let i = 0; i < stageIds.length; i++) {
        await tx
          .update(pipelineStages)
          .set({ position: i, updatedAt: now })
          .where(and(
            eq(pipelineStages.id, stageIds[i]),
            eq(pipelineStages.pipelineId, pipelineId),
            eq(pipelineStages.tenantId, tenantId),
          ))
      }
    })
  },

  // ======== MEMBER OPERATIONS ========

  async findMemberById(tenantId: string, memberId: string): Promise<PipelineMemberRecord | null> {
    const [row] = await db
      .select()
      .from(pipelineMembers)
      .where(and(eq(pipelineMembers.id, memberId), eq(pipelineMembers.tenantId, tenantId)))
      .limit(1)

    return row ? toMemberRecord(row) : null
  },

  async addMember(tenantId: string, input: {
    pipelineId: string
    customerId: string
    stageId: string
    dealValue?: number
    metadata?: Record<string, unknown>
  }): Promise<PipelineMemberRecord> {
    const now = new Date()
    const [row] = await db
      .insert(pipelineMembers)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        pipelineId: input.pipelineId,
        customerId: input.customerId,
        stageId: input.stageId,
        dealValue: input.dealValue?.toString() ?? null,
        enteredStageAt: now,
        addedAt: now,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toMemberRecord(row)
  },

  async updateMemberStage(tenantId: string, memberId: string, input: {
    stageId: string
    dealValue?: number
    lostReason?: string
    closedAt?: Date | null
  }): Promise<PipelineMemberRecord> {
    const now = new Date()
    const updates: Record<string, unknown> = {
      stageId: input.stageId,
      enteredStageAt: now,
      updatedAt: now,
    }
    if (input.dealValue !== undefined) updates.dealValue = input.dealValue.toString()
    if (input.lostReason !== undefined) updates.lostReason = input.lostReason
    if (input.closedAt !== undefined) updates.closedAt = input.closedAt

    const [row] = await db
      .update(pipelineMembers)
      .set(updates)
      .where(and(eq(pipelineMembers.id, memberId), eq(pipelineMembers.tenantId, tenantId)))
      .returning()

    if (!row) throw new NotFoundError("PipelineMember", memberId)
    return toMemberRecord(row)
  },

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    const [row] = await db
      .delete(pipelineMembers)
      .where(and(eq(pipelineMembers.id, memberId), eq(pipelineMembers.tenantId, tenantId)))
      .returning()

    if (!row) throw new NotFoundError("PipelineMember", memberId)
  },

  async updateMember(tenantId: string, memberId: string, input: {
    dealValue?: number | null
    metadata?: Record<string, unknown>
  }): Promise<PipelineMemberRecord> {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (input.dealValue !== undefined) updates.dealValue = input.dealValue?.toString() ?? null
    if (input.metadata !== undefined) updates.metadata = input.metadata

    const [row] = await db
      .update(pipelineMembers)
      .set(updates)
      .where(and(eq(pipelineMembers.id, memberId), eq(pipelineMembers.tenantId, tenantId)))
      .returning()

    if (!row) throw new NotFoundError("PipelineMember", memberId)
    return toMemberRecord(row)
  },

  async listMembers(tenantId: string, pipelineId: string): Promise<PipelineMemberWithCustomer[]> {
    const rows = await db
      .select({
        member: pipelineMembers,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        customerEmail: customers.email,
        customerTags: customers.tags,
      })
      .from(pipelineMembers)
      .innerJoin(customers, eq(pipelineMembers.customerId, customers.id))
      .where(and(
        eq(pipelineMembers.pipelineId, pipelineId),
        eq(pipelineMembers.tenantId, tenantId),
      ))
      .orderBy(pipelineMembers.enteredStageAt)

    return rows.map((r) => ({
      ...toMemberRecord(r.member),
      customerName: r.customerName?.trim() ?? "",
      customerEmail: r.customerEmail ?? null,
      customerTags: (r.customerTags ?? []) as string[],
    }))
  },

  async getSummary(tenantId: string, pipelineId: string): Promise<PipelineStageSummary[]> {
    const rows = await db
      .select({
        stageId: pipelineMembers.stageId,
        count: count(),
        totalDealValue: sum(pipelineMembers.dealValue),
      })
      .from(pipelineMembers)
      .where(and(
        eq(pipelineMembers.pipelineId, pipelineId),
        eq(pipelineMembers.tenantId, tenantId),
      ))
      .groupBy(pipelineMembers.stageId)

    return rows.map((r) => ({
      stageId: r.stageId,
      count: Number(r.count),
      totalDealValue: r.totalDealValue ? Number(r.totalDealValue) : 0,
    }))
  },

  async countActiveMembers(tenantId: string, pipelineId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(pipelineMembers)
      .innerJoin(pipelineStages, eq(pipelineMembers.stageId, pipelineStages.id))
      .where(and(
        eq(pipelineMembers.pipelineId, pipelineId),
        eq(pipelineMembers.tenantId, tenantId),
        eq(pipelineStages.type, "OPEN"),
      ))

    return Number(result?.count ?? 0)
  },

  // ======== HISTORY ========

  async createHistoryEntry(tenantId: string, input: {
    memberId: string
    fromStageId: string | null
    toStageId: string
    changedById?: string
    dealValue?: number
    lostReason?: string
    notes?: string
  }): Promise<void> {
    await db.insert(pipelineStageHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      memberId: input.memberId,
      fromStageId: input.fromStageId,
      toStageId: input.toStageId,
      changedAt: new Date(),
      changedById: input.changedById ?? null,
      dealValue: input.dealValue?.toString() ?? null,
      lostReason: input.lostReason ?? null,
      notes: input.notes ?? null,
    })
  },

  async getMemberHistory(tenantId: string, memberId: string): Promise<PipelineStageHistoryRecord[]> {
    const rows = await db
      .select()
      .from(pipelineStageHistory)
      .where(and(
        eq(pipelineStageHistory.memberId, memberId),
        eq(pipelineStageHistory.tenantId, tenantId),
      ))
      .orderBy(desc(pipelineStageHistory.changedAt))

    return rows.map(toHistoryRecord)
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/pipeline/pipeline.repository.ts
git commit -m "feat(pipeline): add pipeline repository"
```

---

### Task 6: Pipeline Service + Tests

**Files:**
- Create: `src/modules/pipeline/pipeline.service.ts`
- Create: `src/modules/pipeline/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write service tests**

```typescript
// src/modules/pipeline/__tests__/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { pipelineService } from "../pipeline.service"
import { pipelineRepository } from "../pipeline.repository"
import { NotFoundError, BadRequestError, ConflictError } from "@/shared/errors"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../pipeline.repository", () => ({
  pipelineRepository: {
    list: vi.fn(),
    findById: vi.fn(),
    findDefault: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    findStageById: vi.fn(),
    addStage: vi.fn(),
    updateStage: vi.fn(),
    removeStage: vi.fn(),
    reorderStages: vi.fn(),
    findMemberById: vi.fn(),
    addMember: vi.fn(),
    updateMemberStage: vi.fn(),
    removeMember: vi.fn(),
    updateMember: vi.fn(),
    listMembers: vi.fn(),
    getSummary: vi.fn(),
    countActiveMembers: vi.fn(),
    createHistoryEntry: vi.fn(),
    getMemberHistory: vi.fn(),
  },
}))

vi.mock("@/shared/inngest", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = "00000000-0000-0000-0000-000000000001"
const PIPELINE_ID = "00000000-0000-0000-0000-000000000010"
const STAGE_ID_OPEN = "00000000-0000-0000-0000-000000000020"
const STAGE_ID_WON = "00000000-0000-0000-0000-000000000021"
const STAGE_ID_LOST = "00000000-0000-0000-0000-000000000022"
const MEMBER_ID = "00000000-0000-0000-0000-000000000030"
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000040"

function makeCtx(tenantId = TENANT_ID) {
  return { tenantId, userId: "user-1" } as any
}

function makeStage(overrides: Partial<any> = {}) {
  return {
    id: STAGE_ID_OPEN,
    pipelineId: PIPELINE_ID,
    tenantId: TENANT_ID,
    name: "Prospect",
    slug: "prospect",
    position: 0,
    color: "#64748b",
    type: "OPEN" as const,
    allowedTransitions: [STAGE_ID_WON, STAGE_ID_LOST],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeMember(overrides: Partial<any> = {}) {
  return {
    id: MEMBER_ID,
    tenantId: TENANT_ID,
    pipelineId: PIPELINE_ID,
    customerId: CUSTOMER_ID,
    stageId: STAGE_ID_OPEN,
    dealValue: 5000,
    lostReason: null,
    enteredStageAt: new Date(),
    addedAt: new Date(),
    closedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makePipeline(overrides: Partial<any> = {}) {
  return {
    id: PIPELINE_ID,
    tenantId: TENANT_ID,
    name: "Sales Pipeline",
    description: null,
    isDefault: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    stages: [makeStage()],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe("pipelineService", () => {
  describe("moveMember", () => {
    it("validates transition is allowed", async () => {
      const member = makeMember()
      const currentStage = makeStage({ allowedTransitions: [STAGE_ID_WON] })
      vi.mocked(pipelineRepository.findMemberById).mockResolvedValue(member)
      vi.mocked(pipelineRepository.findStageById)
        .mockResolvedValueOnce(currentStage)  // current stage
        .mockResolvedValueOnce(makeStage({ id: "unknown-stage", type: "OPEN" }))  // target stage

      await expect(
        pipelineService.moveMember(makeCtx(), {
          memberId: MEMBER_ID,
          toStageId: "unknown-stage",
        })
      ).rejects.toThrow(BadRequestError)
    })

    it("moves member and creates history entry", async () => {
      const member = makeMember()
      const currentStage = makeStage({ allowedTransitions: [STAGE_ID_WON] })
      const targetStage = makeStage({ id: STAGE_ID_WON, type: "WON" })
      const updatedMember = makeMember({ stageId: STAGE_ID_WON, closedAt: new Date() })

      vi.mocked(pipelineRepository.findMemberById).mockResolvedValue(member)
      vi.mocked(pipelineRepository.findStageById)
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage)
      vi.mocked(pipelineRepository.updateMemberStage).mockResolvedValue(updatedMember)

      const result = await pipelineService.moveMember(makeCtx(), {
        memberId: MEMBER_ID,
        toStageId: STAGE_ID_WON,
        dealValue: 10000,
      })

      expect(result.stageId).toBe(STAGE_ID_WON)
      expect(pipelineRepository.createHistoryEntry).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          memberId: MEMBER_ID,
          fromStageId: STAGE_ID_OPEN,
          toStageId: STAGE_ID_WON,
        })
      )
    })

    it("sets closedAt when moving to WON stage", async () => {
      const member = makeMember()
      const currentStage = makeStage({ allowedTransitions: [STAGE_ID_WON] })
      const targetStage = makeStage({ id: STAGE_ID_WON, type: "WON" })
      const updatedMember = makeMember({ stageId: STAGE_ID_WON })

      vi.mocked(pipelineRepository.findMemberById).mockResolvedValue(member)
      vi.mocked(pipelineRepository.findStageById)
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage)
      vi.mocked(pipelineRepository.updateMemberStage).mockResolvedValue(updatedMember)

      await pipelineService.moveMember(makeCtx(), { memberId: MEMBER_ID, toStageId: STAGE_ID_WON })

      expect(pipelineRepository.updateMemberStage).toHaveBeenCalledWith(
        TENANT_ID,
        MEMBER_ID,
        expect.objectContaining({ closedAt: expect.any(Date) })
      )
    })

    it("clears closedAt when moving from WON back to OPEN", async () => {
      const member = makeMember({ stageId: STAGE_ID_WON, closedAt: new Date() })
      const currentStage = makeStage({ id: STAGE_ID_WON, type: "WON", allowedTransitions: [STAGE_ID_OPEN] })
      const targetStage = makeStage({ id: STAGE_ID_OPEN, type: "OPEN" })
      const updatedMember = makeMember({ stageId: STAGE_ID_OPEN, closedAt: null })

      vi.mocked(pipelineRepository.findMemberById).mockResolvedValue(member)
      vi.mocked(pipelineRepository.findStageById)
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage)
      vi.mocked(pipelineRepository.updateMemberStage).mockResolvedValue(updatedMember)

      await pipelineService.moveMember(makeCtx(), { memberId: MEMBER_ID, toStageId: STAGE_ID_OPEN })

      expect(pipelineRepository.updateMemberStage).toHaveBeenCalledWith(
        TENANT_ID,
        MEMBER_ID,
        expect.objectContaining({ closedAt: null })
      )
    })
  })

  describe("archivePipeline", () => {
    it("rejects archive if pipeline has active members", async () => {
      vi.mocked(pipelineRepository.findById).mockResolvedValue(makePipeline())
      vi.mocked(pipelineRepository.countActiveMembers).mockResolvedValue(3)

      await expect(
        pipelineService.archivePipeline(makeCtx(), PIPELINE_ID)
      ).rejects.toThrow(BadRequestError)
    })

    it("archives pipeline with no active members", async () => {
      vi.mocked(pipelineRepository.findById).mockResolvedValue(makePipeline())
      vi.mocked(pipelineRepository.countActiveMembers).mockResolvedValue(0)

      await pipelineService.archivePipeline(makeCtx(), PIPELINE_ID)

      expect(pipelineRepository.archive).toHaveBeenCalledWith(TENANT_ID, PIPELINE_ID)
    })
  })

  describe("addMember", () => {
    it("adds member to first OPEN stage if no stageId provided", async () => {
      const pipeline = makePipeline({
        stages: [
          makeStage({ id: STAGE_ID_LOST, type: "LOST", position: 9 }),
          makeStage({ id: STAGE_ID_OPEN, type: "OPEN", position: 0 }),
        ],
      })
      vi.mocked(pipelineRepository.findById).mockResolvedValue(pipeline)
      vi.mocked(pipelineRepository.addMember).mockResolvedValue(makeMember())

      await pipelineService.addMember(makeCtx(), {
        pipelineId: PIPELINE_ID,
        customerId: CUSTOMER_ID,
      })

      expect(pipelineRepository.addMember).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ stageId: STAGE_ID_OPEN })
      )
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/modules/pipeline/__tests__/pipeline.test.ts`
Expected: FAIL — `pipelineService` does not exist yet.

- [ ] **Step 3: Write service implementation**

```typescript
// src/modules/pipeline/pipeline.service.ts
import { logger } from "@/shared/logger"
import { NotFoundError, BadRequestError } from "@/shared/errors"
import { inngest } from "@/shared/inngest"
import type { Context } from "@/shared/trpc"
import { pipelineRepository } from "./pipeline.repository"
import type {
  PipelineRecord,
  PipelineWithStages,
  PipelineMemberRecord,
  PipelineStageRecord,
  PipelineStageHistoryRecord,
  PipelineStageSummary,
  PipelineMemberWithCustomer,
} from "./pipeline.types"

const log = logger.child({ module: "pipeline.service" })

export const pipelineService = {

  // ======== PIPELINE CRUD ========

  async listPipelines(ctx: Context): Promise<PipelineRecord[]> {
    return pipelineRepository.list(ctx.tenantId)
  },

  async getPipelineById(ctx: Context, pipelineId: string): Promise<PipelineWithStages> {
    const pipeline = await pipelineRepository.findById(ctx.tenantId, pipelineId)
    if (!pipeline) throw new NotFoundError("Pipeline", pipelineId)
    return pipeline
  },

  async getDefaultPipeline(ctx: Context): Promise<PipelineWithStages> {
    const pipeline = await pipelineRepository.findDefault(ctx.tenantId)
    if (!pipeline) throw new NotFoundError("Pipeline", "default")
    return pipeline
  },

  async createPipeline(ctx: Context, input: {
    name: string
    description?: string
    isDefault?: boolean
    stages: Array<{ name: string; slug: string; position: number; color?: string; type: "OPEN" | "WON" | "LOST" }>
  }): Promise<PipelineWithStages> {
    const result = await pipelineRepository.create(ctx.tenantId, input)
    log.info({ tenantId: ctx.tenantId, pipelineId: result.id }, "Pipeline created")
    return result
  },

  async updatePipeline(ctx: Context, pipelineId: string, input: {
    name?: string
    description?: string | null
    isDefault?: boolean
  }): Promise<PipelineRecord> {
    return pipelineRepository.update(ctx.tenantId, pipelineId, input)
  },

  async archivePipeline(ctx: Context, pipelineId: string): Promise<void> {
    const pipeline = await pipelineRepository.findById(ctx.tenantId, pipelineId)
    if (!pipeline) throw new NotFoundError("Pipeline", pipelineId)

    const activeCount = await pipelineRepository.countActiveMembers(ctx.tenantId, pipelineId)
    if (activeCount > 0) {
      throw new BadRequestError(`Cannot archive pipeline with ${activeCount} active members`)
    }

    await pipelineRepository.archive(ctx.tenantId, pipelineId)
    log.info({ tenantId: ctx.tenantId, pipelineId }, "Pipeline archived")
  },

  // ======== STAGE CONFIGURATION ========

  async addStage(ctx: Context, input: {
    pipelineId: string
    name: string
    slug: string
    position: number
    color?: string
    type: "OPEN" | "WON" | "LOST"
    allowedTransitions: string[]
  }): Promise<PipelineStageRecord> {
    return pipelineRepository.addStage(ctx.tenantId, input)
  },

  async updateStage(ctx: Context, stageId: string, input: {
    name?: string
    color?: string | null
    type?: "OPEN" | "WON" | "LOST"
    allowedTransitions?: string[]
  }): Promise<PipelineStageRecord> {
    return pipelineRepository.updateStage(ctx.tenantId, stageId, input)
  },

  async removeStage(ctx: Context, stageId: string, reassignToStageId: string): Promise<void> {
    return pipelineRepository.removeStage(ctx.tenantId, stageId, reassignToStageId)
  },

  async reorderStages(ctx: Context, pipelineId: string, stageIds: string[]): Promise<void> {
    return pipelineRepository.reorderStages(ctx.tenantId, pipelineId, stageIds)
  },

  // ======== MEMBER OPERATIONS ========

  async addMember(ctx: Context, input: {
    pipelineId: string
    customerId: string
    stageId?: string
    dealValue?: number
    metadata?: Record<string, unknown>
  }): Promise<PipelineMemberRecord> {
    let stageId = input.stageId

    // If no stageId, use first OPEN stage
    if (!stageId) {
      const pipeline = await pipelineRepository.findById(ctx.tenantId, input.pipelineId)
      if (!pipeline) throw new NotFoundError("Pipeline", input.pipelineId)

      const firstOpen = pipeline.stages
        .filter((s) => s.type === "OPEN")
        .sort((a, b) => a.position - b.position)[0]

      if (!firstOpen) throw new BadRequestError("Pipeline has no OPEN stages")
      stageId = firstOpen.id
    }

    const member = await pipelineRepository.addMember(ctx.tenantId, {
      pipelineId: input.pipelineId,
      customerId: input.customerId,
      stageId,
      dealValue: input.dealValue,
      metadata: input.metadata,
    })

    // Create initial history entry
    await pipelineRepository.createHistoryEntry(ctx.tenantId, {
      memberId: member.id,
      fromStageId: null,
      toStageId: stageId,
      changedById: ctx.userId,
      dealValue: input.dealValue,
    })

    // Emit event
    await inngest.send({
      name: "pipeline/member.added",
      data: {
        memberId: member.id,
        pipelineId: input.pipelineId,
        customerId: input.customerId,
        stageId,
        tenantId: ctx.tenantId,
      },
    })

    log.info({ tenantId: ctx.tenantId, memberId: member.id }, "Member added to pipeline")
    return member
  },

  async moveMember(ctx: Context, input: {
    memberId: string
    toStageId: string
    dealValue?: number
    lostReason?: string
    notes?: string
  }): Promise<PipelineMemberRecord> {
    const member = await pipelineRepository.findMemberById(ctx.tenantId, input.memberId)
    if (!member) throw new NotFoundError("PipelineMember", input.memberId)

    const currentStage = await pipelineRepository.findStageById(ctx.tenantId, member.stageId)
    if (!currentStage) throw new NotFoundError("PipelineStage", member.stageId)

    const targetStage = await pipelineRepository.findStageById(ctx.tenantId, input.toStageId)
    if (!targetStage) throw new NotFoundError("PipelineStage", input.toStageId)

    // Validate transition
    if (!currentStage.allowedTransitions.includes(input.toStageId)) {
      throw new BadRequestError(
        `Transition from "${currentStage.name}" to "${targetStage.name}" is not allowed`
      )
    }

    // Determine closedAt
    const isTerminal = targetStage.type === "WON" || targetStage.type === "LOST"
    const closedAt = isTerminal ? new Date() : null

    const updated = await pipelineRepository.updateMemberStage(ctx.tenantId, input.memberId, {
      stageId: input.toStageId,
      dealValue: input.dealValue,
      lostReason: input.lostReason,
      closedAt,
    })

    // Create history entry
    await pipelineRepository.createHistoryEntry(ctx.tenantId, {
      memberId: input.memberId,
      fromStageId: member.stageId,
      toStageId: input.toStageId,
      changedById: ctx.userId,
      dealValue: input.dealValue ?? member.dealValue ?? undefined,
      lostReason: input.lostReason,
      notes: input.notes,
    })

    // Emit moved event
    await inngest.send({
      name: "pipeline/member.moved",
      data: {
        memberId: input.memberId,
        pipelineId: member.pipelineId,
        customerId: member.customerId,
        fromStageId: member.stageId,
        toStageId: input.toStageId,
        dealValue: input.dealValue ?? member.dealValue ?? null,
        tenantId: ctx.tenantId,
      },
    })

    // If terminal, also emit closed event
    if (isTerminal) {
      await inngest.send({
        name: "pipeline/member.closed",
        data: {
          memberId: input.memberId,
          pipelineId: member.pipelineId,
          customerId: member.customerId,
          stageType: targetStage.type,
          dealValue: input.dealValue ?? member.dealValue ?? null,
          tenantId: ctx.tenantId,
        },
      })
    }

    log.info(
      { tenantId: ctx.tenantId, memberId: input.memberId, from: currentStage.slug, to: targetStage.slug },
      "Pipeline member moved"
    )

    return updated
  },

  async removeMember(ctx: Context, memberId: string): Promise<void> {
    const member = await pipelineRepository.findMemberById(ctx.tenantId, memberId)
    if (!member) throw new NotFoundError("PipelineMember", memberId)

    await pipelineRepository.removeMember(ctx.tenantId, memberId)

    await inngest.send({
      name: "pipeline/member.removed",
      data: {
        memberId,
        pipelineId: member.pipelineId,
        customerId: member.customerId,
        tenantId: ctx.tenantId,
      },
    })

    log.info({ tenantId: ctx.tenantId, memberId }, "Pipeline member removed")
  },

  async updateMember(ctx: Context, memberId: string, input: {
    dealValue?: number | null
    metadata?: Record<string, unknown>
  }): Promise<PipelineMemberRecord> {
    return pipelineRepository.updateMember(ctx.tenantId, memberId, input)
  },

  async listMembers(ctx: Context, pipelineId: string): Promise<PipelineMemberWithCustomer[]> {
    return pipelineRepository.listMembers(ctx.tenantId, pipelineId)
  },

  async getSummary(ctx: Context, pipelineId: string): Promise<PipelineStageSummary[]> {
    return pipelineRepository.getSummary(ctx.tenantId, pipelineId)
  },

  async getMemberHistory(ctx: Context, memberId: string): Promise<PipelineStageHistoryRecord[]> {
    const member = await pipelineRepository.findMemberById(ctx.tenantId, memberId)
    if (!member) throw new NotFoundError("PipelineMember", memberId)
    return pipelineRepository.getMemberHistory(ctx.tenantId, memberId)
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/pipeline/__tests__/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/pipeline/pipeline.service.ts src/modules/pipeline/__tests__/pipeline.test.ts
git commit -m "feat(pipeline): add pipeline service with tests"
```

---

### Task 7: Pipeline Router + Events + Manifest + Index

**Files:**
- Create: `src/modules/pipeline/pipeline.router.ts`
- Create: `src/modules/pipeline/pipeline.events.ts`
- Create: `src/modules/pipeline/pipeline.manifest.ts`
- Create: `src/modules/pipeline/index.ts`

- [ ] **Step 1: Create router**

```typescript
// src/modules/pipeline/pipeline.router.ts
import { z } from "zod"
import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc"
import { pipelineService } from "./pipeline.service"
import {
  createPipelineSchema,
  updatePipelineSchema,
  archivePipelineSchema,
  getPipelineByIdSchema,
  addStageSchema,
  updateStageSchema,
  removeStageSchema,
  reorderStagesSchema,
  addMemberSchema,
  moveMemberSchema,
  removeMemberSchema,
  updateMemberSchema,
  listMembersSchema,
  getSummarySchema,
  getMemberHistorySchema,
} from "./pipeline.schemas"

const moduleGate = createModuleMiddleware("pipeline")
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)

export const pipelineRouter = router({
  // Pipeline CRUD
  list: moduleProcedure
    .query(async ({ ctx }) => pipelineService.listPipelines(ctx)),

  getById: moduleProcedure
    .input(getPipelineByIdSchema)
    .query(async ({ ctx, input }) => pipelineService.getPipelineById(ctx, input.pipelineId)),

  getDefault: moduleProcedure
    .query(async ({ ctx }) => pipelineService.getDefaultPipeline(ctx)),

  create: modulePermission("pipeline:write")
    .input(createPipelineSchema)
    .mutation(async ({ ctx, input }) => pipelineService.createPipeline(ctx, input)),

  update: modulePermission("pipeline:write")
    .input(updatePipelineSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.updatePipeline(ctx, input.pipelineId, {
        name: input.name,
        description: input.description,
        isDefault: input.isDefault,
      })
    ),

  archive: modulePermission("pipeline:write")
    .input(archivePipelineSchema)
    .mutation(async ({ ctx, input }) => pipelineService.archivePipeline(ctx, input.pipelineId)),

  // Stage configuration
  addStage: modulePermission("pipeline:write")
    .input(addStageSchema)
    .mutation(async ({ ctx, input }) => pipelineService.addStage(ctx, input)),

  updateStage: modulePermission("pipeline:write")
    .input(updateStageSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.updateStage(ctx, input.stageId, {
        name: input.name,
        color: input.color,
        type: input.type,
        allowedTransitions: input.allowedTransitions,
      })
    ),

  removeStage: modulePermission("pipeline:write")
    .input(removeStageSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.removeStage(ctx, input.stageId, input.reassignToStageId)
    ),

  reorderStages: modulePermission("pipeline:write")
    .input(reorderStagesSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.reorderStages(ctx, input.pipelineId, input.stageIds)
    ),

  // Member operations
  addMember: modulePermission("pipeline:write")
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => pipelineService.addMember(ctx, input)),

  moveMember: modulePermission("pipeline:write")
    .input(moveMemberSchema)
    .mutation(async ({ ctx, input }) => pipelineService.moveMember(ctx, input)),

  removeMember: modulePermission("pipeline:write")
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => pipelineService.removeMember(ctx, input.memberId)),

  updateMember: modulePermission("pipeline:write")
    .input(updateMemberSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.updateMember(ctx, input.memberId, {
        dealValue: input.dealValue,
        metadata: input.metadata,
      })
    ),

  listMembers: moduleProcedure
    .input(listMembersSchema)
    .query(async ({ ctx, input }) => pipelineService.listMembers(ctx, input.pipelineId)),

  getSummary: moduleProcedure
    .input(getSummarySchema)
    .query(async ({ ctx, input }) => pipelineService.getSummary(ctx, input.pipelineId)),

  getMemberHistory: moduleProcedure
    .input(getMemberHistorySchema)
    .query(async ({ ctx, input }) => pipelineService.getMemberHistory(ctx, input.memberId)),
})
```

- [ ] **Step 2: Create events file**

```typescript
// src/modules/pipeline/pipeline.events.ts
import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "pipeline.events" })

const onMemberAdded = inngest.createFunction(
  { id: "pipeline-member-added", retries: 3 },
  { event: "pipeline/member.added" },
  async ({ event }) => {
    const { memberId, pipelineId, customerId, tenantId } = event.data
    log.info({ memberId, pipelineId, customerId, tenantId }, "Pipeline member added")
  }
)

const onMemberMoved = inngest.createFunction(
  { id: "pipeline-member-moved", retries: 3 },
  { event: "pipeline/member.moved" },
  async ({ event }) => {
    const { memberId, pipelineId, fromStageId, toStageId, tenantId } = event.data
    log.info({ memberId, pipelineId, fromStageId, toStageId, tenantId }, "Pipeline member moved")
  }
)

const onMemberRemoved = inngest.createFunction(
  { id: "pipeline-member-removed", retries: 3 },
  { event: "pipeline/member.removed" },
  async ({ event }) => {
    const { memberId, pipelineId, customerId, tenantId } = event.data
    log.info({ memberId, pipelineId, customerId, tenantId }, "Pipeline member removed")
  }
)

const onMemberClosed = inngest.createFunction(
  { id: "pipeline-member-closed", retries: 3 },
  { event: "pipeline/member.closed" },
  async ({ event }) => {
    const { memberId, pipelineId, customerId, stageType, dealValue, tenantId } = event.data
    log.info({ memberId, pipelineId, customerId, stageType, dealValue, tenantId }, "Pipeline member closed")
  }
)

export const pipelineFunctions = [onMemberAdded, onMemberMoved, onMemberRemoved, onMemberClosed]
```

- [ ] **Step 3: Create manifest**

```typescript
// src/modules/pipeline/pipeline.manifest.ts
import type { ModuleManifest } from "@/shared/module-system/types"

export const pipelineManifest: ModuleManifest = {
  slug: "pipeline",
  name: "Pipeline",
  description: "Sales pipeline with configurable stages, deal tracking, and automation",
  icon: "Layers",
  category: "operations",
  dependencies: ["customer"],
  routes: [
    { path: "/admin/pipeline", label: "Pipeline", permission: "pipeline:read" },
  ],
  sidebarItems: [
    { title: "Pipeline", href: "/admin/pipeline", icon: "Layers", section: "operations", permission: "pipeline:read" },
  ],
  quickActions: [],
  analyticsWidgets: [],
  permissions: ["pipeline:read", "pipeline:write", "pipeline:delete"],
  eventsProduced: [
    "pipeline/member.added",
    "pipeline/member.moved",
    "pipeline/member.removed",
    "pipeline/member.closed",
  ],
  eventsConsumed: [],
  isCore: false,
  availability: "standard",
  settingsTab: { slug: "pipeline-settings", label: "Pipeline Settings", icon: "Layers", section: "module" },
  auditResources: ["pipeline", "pipeline-member"],
}
```

- [ ] **Step 4: Create barrel export**

```typescript
// src/modules/pipeline/index.ts
export { pipelineRouter } from "./pipeline.router"
export { pipelineFunctions } from "./pipeline.events"
export { pipelineService } from "./pipeline.service"
export { seedDefaultPipeline } from "./pipeline.seed"
export type {
  PipelineRecord,
  PipelineStageRecord,
  PipelineMemberRecord,
  PipelineWithStages,
} from "./pipeline.types"
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/pipeline/pipeline.router.ts src/modules/pipeline/pipeline.events.ts src/modules/pipeline/pipeline.manifest.ts src/modules/pipeline/index.ts
git commit -m "feat(pipeline): add router, events, manifest, and barrel export"
```

---

### Task 8: Wiring — Root Router, Module Registry, Inngest Events & Route

**Files:**
- Modify: `src/server/root.ts`
- Modify: `src/shared/module-system/register-all.ts`
- Modify: `src/shared/inngest.ts`
- Modify: `src/app/api/inngest/route.ts`
- Modify: `src/modules/platform/platform.service.ts`

- [ ] **Step 1: Add pipeline router to root.ts**

Add import:
```typescript
import { pipelineRouter } from "@/modules/pipeline"
```

Add to the `router({...})` call:
```typescript
pipeline: pipelineRouter,
```

- [ ] **Step 2: Register pipeline manifest**

In `src/shared/module-system/register-all.ts`, add import:
```typescript
import { pipelineManifest } from "@/modules/pipeline/pipeline.manifest"
```

Add registration in the vertical modules section:
```typescript
moduleRegistry.register(pipelineManifest)
```

- [ ] **Step 3: Add pipeline events to Inngest types**

In `src/shared/inngest.ts`, add to the `IronheartEvents` type (and remove `"customer/stage.changed"`):

```typescript
"pipeline/member.added": {
  data: {
    memberId: string
    pipelineId: string
    customerId: string
    stageId: string
    tenantId: string
  }
}
"pipeline/member.moved": {
  data: {
    memberId: string
    pipelineId: string
    customerId: string
    fromStageId: string
    toStageId: string
    dealValue: number | null
    tenantId: string
  }
}
"pipeline/member.removed": {
  data: {
    memberId: string
    pipelineId: string
    customerId: string
    tenantId: string
  }
}
"pipeline/member.closed": {
  data: {
    memberId: string
    pipelineId: string
    customerId: string
    stageType: string
    dealValue: number | null
    tenantId: string
  }
}
```

- [ ] **Step 4: Register pipeline functions in Inngest route**

In `src/app/api/inngest/route.ts`, add import:
```typescript
import { pipelineFunctions } from "@/modules/pipeline"
```

Add to functions array:
```typescript
...pipelineFunctions,
```

- [ ] **Step 5: Wire seedDefaultPipeline into tenant provisioning**

In `src/modules/platform/platform.service.ts`:
- Import `seedDefaultPipeline` from `@/modules/pipeline`
- In the `provisionTenant` method, after the module enablement section (step 3), call:
```typescript
// 4. Seed default pipeline
await seedDefaultPipeline(tenantRow.id)
```

This must be called inside the existing `db.transaction` block if possible, or immediately after it. The seed function creates the default "Sales Pipeline" with 10 stages for every new tenant.

- [ ] **Step 6: Commit**

```bash
git add src/server/root.ts src/shared/module-system/register-all.ts src/shared/inngest.ts src/app/api/inngest/route.ts src/modules/platform/platform.service.ts
git commit -m "feat(pipeline): wire pipeline module into root router, registry, Inngest, and tenant provisioning"
```

---

### Task 9: Customer Module Cleanup

**Files:**
- Modify: `src/modules/customer/customer.types.ts`
- Modify: `src/modules/customer/customer.schemas.ts`
- Modify: `src/modules/customer/customer.repository.ts`
- Modify: `src/modules/customer/customer.service.ts`
- Modify: `src/modules/customer/customer.router.ts`
- Modify: `src/modules/customer/customer.events.ts`
- Modify: `src/modules/customer/customer.manifest.ts`
- Modify: `src/modules/customer/index.ts`
- Modify: `src/modules/customer/__tests__/customer.service.test.ts`

- [ ] **Step 1: Clean types**

Remove from `customer.types.ts`:
- `PipelineStage` type
- `PipelineStageHistoryRecord` interface
- `StageConversionMetric` interface
- `pipelineStage`, `pipelineStageChangedAt`, `lostReason`, `dealValue` from `CustomerRecord`
- `pipelineStage`, `dealValue`, `lostReason` from `CreateCustomerInput`
- `pipelineStage`, `dealValue`, `lostReason` from `UpdateCustomerInput`

- [ ] **Step 2: Clean schemas**

Remove from `customer.schemas.ts`:
- `pipelineStageSchema`
- `updatePipelineStageSchema`
- `listByPipelineStageSchema`
- `getStageHistorySchema`
- Pipeline fields from `createCustomerSchema` and `updateCustomerSchema`

- [ ] **Step 3: Clean repository**

Remove from `customer.repository.ts`:
- `pipelineStageHistory` from schema imports
- `updatePipelineStage` method
- `listByPipelineStage` method
- `getPipelineSummary` method
- `createStageHistoryEntry` method
- `getStageHistory` method
- `getStageConversionMetrics` method
- Pipeline field mappings from `toCustomerRecord` helper

- [ ] **Step 4: Clean service**

Remove from `customer.service.ts`:
- `updatePipelineStage` method
- `listByPipelineStage` method
- `getPipelineSummary` method
- `getStageHistory` method
- `getStageConversionMetrics` method
- `PipelineStage` type imports
- `customer/stage.changed` event emission from any remaining create/update flows

- [ ] **Step 5: Clean router**

Remove from `customer.router.ts`:
- `updatePipelineStage` procedure
- `listByPipelineStage` procedure
- `getPipelineSummary` procedure
- `getStageHistory` procedure
- `getStageConversionMetrics` procedure
- Related schema imports

- [ ] **Step 6: Clean events**

In `customer.events.ts`:
- Remove `onStageChanged` handler
- Remove it from `customerFunctions` array

- [ ] **Step 7: Clean manifest**

In `customer.manifest.ts`:
- Remove the Pipeline sidebar item (`{ title: 'Pipeline', href: '/admin/pipeline', ... }`)

- [ ] **Step 8: Clean index barrel**

In `customer/index.ts`:
- Remove re-exports of `PipelineStageHistoryRecord`, `StageConversionMetric`

- [ ] **Step 9: Clean tests**

In `customer.service.test.ts`:
- Remove mocks for pipeline repository methods
- Remove all pipeline-related test cases
- Remove pipeline fields from `makeCustomer` helper

- [ ] **Step 10: Run customer tests**

Run: `npx vitest run src/modules/customer/__tests__/`
Expected: PASS (all non-pipeline tests should still pass)

- [ ] **Step 11: Commit**

```bash
git add src/modules/customer/
git commit -m "refactor(customer): remove pipeline code, now in pipeline module"
```

---

### Task 10: Update Seed Script

**Files:**
- Modify: `scripts/seed-consulting.ts` (or wherever the consulting seed script lives)

- [ ] **Step 1: Update workflow trigger references**

The consulting seed script contains workflow definitions that reference `customer/stage.changed` as trigger events. Update all occurrences:
- Change event name from `"customer/stage.changed"` to `"pipeline/member.moved"` or `"pipeline/member.closed"` as appropriate
- Update condition field names: `toStage` → `toStageId`, `fromStage` → `fromStageId`, `dealValue` stays the same
- If workflows reference specific stage names (e.g., `"WON"`, `"PROPOSAL"`), these will need to reference stage IDs or use the `stageType` field from `pipeline/member.closed`

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-consulting.ts
git commit -m "refactor(seed): update workflow triggers to use pipeline events"
```

---

### Task 11: Update AI Module

**Files:**
- Modify: `src/modules/ai/features/paste-to-pipeline.ts`

- [ ] **Step 1: Update paste-to-pipeline**

This file currently extracts entities but does not directly reference `customer.pipelineStage`. Review the file and update any references to pipeline stage concepts to use the new pipeline module types/service if needed. If the file only extracts entities without writing pipeline data, it may only need import path updates.

Key changes:
- If it references `PipelineStage` type from customer, update to import from pipeline module
- If it calls `customerService.updatePipelineStage`, change to `pipelineService.addMember` / `pipelineService.moveMember`

- [ ] **Step 2: Commit**

```bash
git add src/modules/ai/features/paste-to-pipeline.ts
git commit -m "refactor(ai): update paste-to-pipeline to use pipeline module"
```

---

### Task 12: Update Pipeline Kanban Page

**Files:**
- Modify: `src/app/admin/pipeline/page.tsx`

- [ ] **Step 1: Rewrite kanban page to use pipeline module**

The page needs a full rewrite to:
- Remove all hardcoded constants (`PIPELINE_STAGES`, `STAGE_LABELS`, `STAGE_COLORS`, `STAGE_TRANSITIONS`)
- Query `pipeline.getDefault` (or `pipeline.getById` with selector) for pipeline + stages
- Query `pipeline.listMembers` for member data
- Query `pipeline.getSummary` for stage counts/totals
- Render columns dynamically from `pipeline_stages` sorted by position
- Use stage colors from DB (`stage.color`)
- Use `stage.allowedTransitions` for move menu options
- Replace `customer.create` with `pipeline.addMember` in add dialog
- Replace `customer.updatePipelineStage` with `pipeline.moveMember` in move dialog
- Add pipeline selector dropdown for multi-pipeline support
- Display `PipelineMemberWithCustomer` data (customerName, customerEmail, etc.)

Use the existing component structure (AddProspectDialog → "Add to Pipeline" dialog, MoveStageDialog, CustomerCard, PipelineColumn) but update data sources and types.

- [ ] **Step 2: Verify the page renders**

Run: `npx next build` or check for tsc errors
Expected: No type errors in the pipeline page

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/pipeline/page.tsx
git commit -m "feat(pipeline): rewrite kanban page to use dynamic pipeline module"
```

---

### Task 13: Verification

- [ ] **Step 1: Run all pipeline tests**

Run: `npx vitest run src/modules/pipeline/`
Expected: All tests PASS

- [ ] **Step 2: Run all customer tests**

Run: `npx vitest run src/modules/customer/`
Expected: All tests PASS (pipeline code removed cleanly)

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Build check**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(pipeline): resolve tsc/build issues from pipeline extraction"
```
