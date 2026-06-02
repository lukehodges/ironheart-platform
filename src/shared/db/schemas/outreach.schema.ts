import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { rawEvents } from "./event-framework.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const outreachEmployeeBandEnum = pgEnum("outreach_employee_band", [
  "1-2",
  "3-15",
  "15-50",
  "50+",
])

export const outreachCompanySourceEnum = pgEnum("outreach_company_source", [
  "cold",
  "referral",
  "inbound",
  "manual",
])

export const outreachChannelEnum = pgEnum("outreach_channel", [
  "email",
  "linkedin",
  "phone",
])

export const outreachCampaignStatusEnum = pgEnum("outreach_campaign_status", [
  "draft",
  "active",
  "paused",
  "complete",
])

export const outreachDeliveryStatusEnum = pgEnum("outreach_delivery_status", [
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
])

export const outreachReplyStatusEnum = pgEnum("outreach_reply_status", [
  "none",
  "positive",
  "negative",
  "ooo",
  "converter",
  "wrong_person",
  "auto_reply",
])

export const outreachClassifierEnum = pgEnum("outreach_classifier", [
  "claude",
  "luke",
  "rule",
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const companies = pgTable("companies", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  domain: text(),
  industry: text(),
  employeeBand: outreachEmployeeBandEnum(),
  city: text(),
  country: text(),
  ownerLed: boolean().default(false).notNull(),
  source: outreachCompanySourceEnum().default("cold").notNull(),
  doNotContact: boolean().default(false).notNull(),
  dncReason: text(),
  dncAt: timestamp({ precision: 3, mode: 'date' }),
  enrichment: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  notes: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("companies_tenantId_domain_idx").on(table.tenantId, table.domain),
  index("companies_tenantId_city_idx").on(table.tenantId, table.city),
  index("companies_tenantId_doNotContact_idx").on(table.tenantId, table.doNotContact),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "companies_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const contacts = pgTable("contacts", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  companyId: uuid().notNull(),
  fullName: text().notNull(),
  role: text(),
  email: text(),
  phone: text(),
  linkedinUrl: text(),
  isOwner: boolean().default(false).notNull(),
  isDecisionMaker: boolean().default(false).notNull(),
  bounced: boolean().default(false).notNull(),
  doNotContact: boolean().default(false).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("contacts_tenantId_email_key")
    .on(table.tenantId, table.email)
    .where(sql`"email" IS NOT NULL`),
  index("contacts_companyId_idx").on(table.companyId),
  index("contacts_tenantId_email_idx").on(table.tenantId, table.email),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "contacts_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.companyId],
    foreignColumns: [companies.id],
    name: "contacts_companyId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const campaigns = pgTable("campaigns", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  channel: outreachChannelEnum().notNull(),
  city: text(),
  industryFocus: text(),
  status: outreachCampaignStatusEnum().default("draft").notNull(),
  startedAt: timestamp({ precision: 3, mode: 'date' }),
  endedAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("campaigns_tenantId_status_idx").on(table.tenantId, table.status),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "campaigns_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const templates = pgTable("templates", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  channel: outreachChannelEnum().notNull(),
  subject: text(),
  body: text().notNull(),
  variables: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  parentId: uuid(),
  active: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("templates_tenantId_active_idx").on(table.tenantId, table.active),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "templates_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "templates_parentId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const touches = pgTable("touches", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  campaignId: uuid(),
  contactId: uuid().notNull(),
  templateId: uuid(),
  channel: outreachChannelEnum().notNull(),
  sentAt: timestamp({ precision: 3, mode: 'date' }),
  subjectRendered: text(),
  bodyRendered: text(),
  deliveryStatus: outreachDeliveryStatusEnum().default("queued").notNull(),
  openAt: timestamp({ precision: 3, mode: 'date' }),
  clickAt: timestamp({ precision: 3, mode: 'date' }),
  replyStatus: outreachReplyStatusEnum().default("none").notNull(),
  replyAt: timestamp({ precision: 3, mode: 'date' }),
  replySummary: text(),
  nextAction: text(),
  nextActionAt: timestamp({ precision: 3, mode: 'date' }),
  externalMessageId: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("touches_tenantId_contactId_sentAt_idx")
    .on(table.tenantId, table.contactId, table.sentAt.desc()),
  index("touches_campaignId_idx").on(table.campaignId),
  index("touches_awaiting_reply_idx")
    .on(table.deliveryStatus)
    .where(sql`"replyStatus" = 'none'`),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "touches_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.campaignId],
    foreignColumns: [campaigns.id],
    name: "touches_campaignId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.contactId],
    foreignColumns: [contacts.id],
    name: "touches_contactId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [templates.id],
    name: "touches_templateId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const replies = pgTable("replies", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  // Nullable — replies can be unsolicited (no originating touch).
  touchId: uuid(),
  contactId: uuid().notNull(),
  receivedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  subject: text(),
  body: text(),
  classifiedAs: text(),
  classifiedBy: outreachClassifierEnum(),
  classificationConfidence: numeric({ precision: 5, scale: 4 }),
  needsReview: boolean().default(true).notNull(),
  handled: boolean().default(false).notNull(),
  handledAt: timestamp({ precision: 3, mode: 'date' }),
  rawEventId: uuid(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("replies_tenantId_needsReview_idx")
    .on(table.tenantId)
    .where(sql`"needsReview" = true`),
  index("replies_touchId_idx").on(table.touchId),
  index("replies_contactId_receivedAt_idx").on(table.contactId, table.receivedAt.desc()),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "replies_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.touchId],
    foreignColumns: [touches.id],
    name: "replies_touchId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.contactId],
    foreignColumns: [contacts.id],
    name: "replies_contactId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.rawEventId],
    foreignColumns: [rawEvents.id],
    name: "replies_rawEventId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const dncList = pgTable("dnc_list", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  email: text(),
  domain: text(),
  reason: text(),
  addedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  addedBy: text(),
}, (table) => [
  uniqueIndex("dnc_list_tenantId_email_key")
    .on(table.tenantId, table.email)
    .where(sql`"email" IS NOT NULL`),
  uniqueIndex("dnc_list_tenantId_domain_key")
    .on(table.tenantId, table.domain)
    .where(sql`"domain" IS NOT NULL`),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "dnc_list_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type CompanyRow = typeof companies.$inferSelect
export type ContactRow = typeof contacts.$inferSelect
export type CampaignRow = typeof campaigns.$inferSelect
export type TemplateRow = typeof templates.$inferSelect
export type TouchRow = typeof touches.$inferSelect
export type ReplyRow = typeof replies.$inferSelect
export type DncListRow = typeof dncList.$inferSelect
