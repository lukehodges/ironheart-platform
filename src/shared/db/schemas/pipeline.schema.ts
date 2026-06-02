import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  date,
  timestamp,
  index,
  foreignKey,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { companies, contacts, touches } from "./outreach.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const dealStageEnum = pgEnum("deal_stage", [
  "qualified",
  "demo",
  "proposal",
  "won",
  "lost",
  "dormant",
])

export const dealProductEnum = pgEnum("deal_product", [
  "audit",
  "build_sprint",
  "retainer",
  "other",
])

export const dealEventKindEnum = pgEnum("deal_event_kind", [
  "stage_changed",
  "note_added",
  "meeting_booked",
  "proposal_sent",
  "contract_signed",
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const deals = pgTable("deals", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  companyId: uuid().notNull(),
  primaryContactId: uuid(),
  // Attribution — which touch first generated this deal.
  originTouchId: uuid(),
  name: text().notNull(),
  stage: dealStageEnum().default("qualified").notNull(),
  product: dealProductEnum().default("other").notNull(),
  valueEstimate: numeric({ precision: 12, scale: 2 }),
  probability: integer(),
  expectedClose: date(),
  ownerUserId: uuid(),
  notes: text(),
  closedAt: timestamp({ precision: 3, mode: 'date' }),
  closeReason: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("deals_tenantId_stage_idx").on(table.tenantId, table.stage),
  index("deals_tenantId_ownerUserId_idx").on(table.tenantId, table.ownerUserId),
  index("deals_companyId_idx").on(table.companyId),
  check("deals_probability_range", sql`"probability" IS NULL OR ("probability" >= 0 AND "probability" <= 100)`),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "deals_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.companyId],
    foreignColumns: [companies.id],
    name: "deals_companyId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.primaryContactId],
    foreignColumns: [contacts.id],
    name: "deals_primaryContactId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.originTouchId],
    foreignColumns: [touches.id],
    name: "deals_originTouchId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.ownerUserId],
    foreignColumns: [users.id],
    name: "deals_ownerUserId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const dealEvents = pgTable("deal_events", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  dealId: uuid().notNull(),
  kind: dealEventKindEnum().notNull(),
  payload: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  at: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  actor: text(),
}, (table) => [
  index("deal_events_dealId_at_idx").on(table.dealId, table.at.desc()),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "deal_events_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.dealId],
    foreignColumns: [deals.id],
    name: "deal_events_dealId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type DealRow = typeof deals.$inferSelect
export type DealEventRow = typeof dealEvents.$inferSelect
