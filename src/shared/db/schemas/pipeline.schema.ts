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
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { customers } from "./customer.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const pipelineStageTypeEnum = pgEnum("pipeline_stage_type", [
  "OPEN",
  "WON",
  "LOST",
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const pipelines = pgTable("pipelines", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  description: text(),
  isDefault: boolean().default(false).notNull(),
  isArchived: boolean().default(false).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("pipelines_tenantId_idx").on(table.tenantId),
  uniqueIndex("pipelines_tenantId_isDefault_key")
    .on(table.tenantId)
    .where(sql`"isDefault" = true`),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pipelines_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  pipelineId: uuid().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  position: integer().notNull(),
  color: text(),
  type: pipelineStageTypeEnum().default("OPEN").notNull(),
  allowedTransitions: uuid().array().notNull().default(sql`'{}'::uuid[]`),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("pipeline_stages_pipelineId_idx").on(table.pipelineId),
  index("pipeline_stages_tenantId_idx").on(table.tenantId),
  uniqueIndex("pipeline_stages_pipelineId_slug_key").on(table.pipelineId, table.slug),
  uniqueIndex("pipeline_stages_pipelineId_position_key").on(table.pipelineId, table.position),
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
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  pipelineId: uuid().notNull(),
  customerId: uuid().notNull(),
  stageId: uuid().notNull(),
  dealValue: numeric({ precision: 12, scale: 2 }),
  lostReason: text(),
  enteredStageAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  addedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  closedAt: timestamp({ precision: 3, mode: 'date' }),
  metadata: jsonb().$type<Record<string, unknown>>().default({}),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("pipeline_members_pipelineId_customerId_key").on(table.pipelineId, table.customerId),
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

export const pipelineStageHistory = pgTable("pipeline_stage_history_v2", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  memberId: uuid().notNull(),
  fromStageId: uuid(),
  toStageId: uuid().notNull(),
  changedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  changedById: uuid(),
  dealValue: numeric({ precision: 12, scale: 2 }),
  lostReason: text(),
  notes: text(),
}, (table) => [
  index("pipeline_stage_history_v2_memberId_idx").on(table.memberId),
  index("pipeline_stage_history_v2_tenantId_changedAt_idx").on(table.tenantId, table.changedAt),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pipeline_stage_history_v2_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.memberId],
    foreignColumns: [pipelineMembers.id],
    name: "pipeline_stage_history_v2_memberId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.changedById],
    foreignColumns: [users.id],
    name: "pipeline_stage_history_v2_changedById_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type PipelineRow = typeof pipelines.$inferSelect
export type PipelineStageRow = typeof pipelineStages.$inferSelect
export type PipelineMemberRow = typeof pipelineMembers.$inferSelect
export type PipelineStageHistoryRow = typeof pipelineStageHistory.$inferSelect
