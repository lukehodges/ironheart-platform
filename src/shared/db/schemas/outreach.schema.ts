import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  foreignKey,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { customers } from "./customer.schema"

import type { OutreachStep } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const outreachContactStatusEnum = pgEnum("outreach_contact_status", [
  "ACTIVE",
  "REPLIED",
  "BOUNCED",
  "OPTED_OUT",
  "CONVERTED",
  "PAUSED",
  "COMPLETED",
])

export const outreachActivityTypeEnum = pgEnum("outreach_activity_type", [
  "SENT",
  "REPLIED",
  "BOUNCED",
  "OPTED_OUT",
  "SKIPPED",
  "CALL_COMPLETED",
  "MEETING_BOOKED",
  "CONVERTED",
  "UNDONE",
])

export const outreachSentimentEnum = pgEnum("outreach_sentiment", [
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "NOT_NOW",
])

export const outreachReplyCategoryEnum = pgEnum("outreach_reply_category", [
  "INTERESTED",
  "NOT_NOW",
  "NOT_INTERESTED",
  "WRONG_PERSON",
  "AUTO_REPLY",
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const outreachSequences = pgTable("outreach_sequences", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  description: text(),
  sector: text().notNull(),
  targetIcp: text(),
  isActive: boolean().default(true).notNull(),
  abVariant: text(),
  pairedSequenceId: uuid(),
  steps: jsonb().$type<OutreachStep[]>().notNull(),
  archivedAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("outreach_sequences_tenantId_idx").on(table.tenantId),
  index("outreach_sequences_tenantId_sector_idx").on(table.tenantId, table.sector),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_sequences_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.pairedSequenceId],
    foreignColumns: [table.id],
    name: "outreach_sequences_pairedSequenceId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
  check("outreach_sequences_ab_check", sql`"abVariant" IS NULL OR "pairedSequenceId" IS NOT NULL`),
])

export const outreachContacts = pgTable("outreach_contacts", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  customerId: uuid().notNull(),
  sequenceId: uuid().notNull(),
  assignedUserId: uuid(),
  status: outreachContactStatusEnum().default("ACTIVE").notNull(),
  currentStep: integer().default(1).notNull(),
  nextDueAt: timestamp({ precision: 3, mode: 'date' }),
  enrolledAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  lastActivityAt: timestamp({ precision: 3, mode: 'date' }),
  pipelineMemberId: uuid(),
  notes: text(),
  sentiment: outreachSentimentEnum(),
  replyCategory: outreachReplyCategoryEnum(),
  snoozedUntil: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("outreach_contacts_tenantId_customerId_sequenceId_key").on(table.tenantId, table.customerId, table.sequenceId),
  index("outreach_contacts_tenantId_status_nextDueAt_idx").on(table.tenantId, table.status, table.nextDueAt),
  index("outreach_contacts_sequenceId_idx").on(table.sequenceId),
  index("outreach_contacts_customerId_idx").on(table.customerId),
  index("outreach_contacts_assignedUserId_idx").on(table.assignedUserId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_contacts_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "outreach_contacts_customerId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.sequenceId],
    foreignColumns: [outreachSequences.id],
    name: "outreach_contacts_sequenceId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.assignedUserId],
    foreignColumns: [users.id],
    name: "outreach_contacts_assignedUserId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const outreachActivities = pgTable("outreach_activities", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  contactId: uuid().notNull(),
  sequenceId: uuid().notNull(),
  customerId: uuid().notNull(),
  stepPosition: integer().notNull(),
  channel: text().notNull(),
  activityType: outreachActivityTypeEnum().notNull(),
  deliveredTo: text(),
  notes: text(),
  performedByUserId: uuid(),
  previousState: jsonb().$type<{ currentStep: number; status: string; nextDueAt: string | null }>(),
  occurredAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("outreach_activities_tenantId_sequenceId_activityType_occurredAt_idx")
    .on(table.tenantId, table.sequenceId, table.activityType, table.occurredAt),
  index("outreach_activities_contactId_idx").on(table.contactId),
  index("outreach_activities_tenantId_occurredAt_idx").on(table.tenantId, table.occurredAt),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_activities_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.contactId],
    foreignColumns: [outreachContacts.id],
    name: "outreach_activities_contactId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.performedByUserId],
    foreignColumns: [users.id],
    name: "outreach_activities_performedByUserId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// Templates & Snippets
// ---------------------------------------------------------------------------

export const outreachTemplates = pgTable("outreach_templates", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  category: text().notNull(),
  channel: text().notNull(),
  subject: text(),
  bodyMarkdown: text().notNull(),
  tags: text("tags").array(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("outreach_templates_tenantId_idx").on(table.tenantId),
  index("outreach_templates_tenantId_category_idx").on(table.tenantId, table.category),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_templates_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const outreachSnippets = pgTable("outreach_snippets", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  category: text().notNull(),
  bodyMarkdown: text().notNull(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("outreach_snippets_tenantId_idx").on(table.tenantId),
  index("outreach_snippets_tenantId_category_idx").on(table.tenantId, table.category),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_snippets_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type OutreachSequenceRow = typeof outreachSequences.$inferSelect
export type OutreachContactRow = typeof outreachContacts.$inferSelect
export type OutreachActivityRow = typeof outreachActivities.$inferSelect
export type OutreachTemplateRow = typeof outreachTemplates.$inferSelect
export type OutreachSnippetRow = typeof outreachSnippets.$inferSelect
