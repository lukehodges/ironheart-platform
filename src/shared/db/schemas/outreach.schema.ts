/**
 * Outreach module — DB schema.
 *
 * Three operational tables match the spreadsheet model:
 *   - leads               : one row per prospect (Master Lead List xlsx parity)
 *   - daily_activity      : one row per owner per day (Google Sheet dashboard parity)
 *   - weekly_hypothesis   : the 7-day iteration loop spine
 *
 * Plus two supporting tables retained from the previous module:
 *   - touches             : historical send audit log (Gmail correlation needs externalMessageId)
 *   - replies             : inbox triage; Gmail processor writes here
 *   - dnc_list            : suppression list
 *
 * Removed (overbuilt for current need): companies, contacts (collapsed into leads),
 * campaigns (replaced by weekly_hypothesis), templates (locked copy lives in service).
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
// raw_events is in an unapplied migration — replies.rawEventId is a free uuid
// for now; FK will be added when event-framework lands.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const outreachChannelEnum = pgEnum("outreach_channel", [
  "email",
  "linkedin",
  "phone",
])

export const outreachLeadStatusEnum = pgEnum("outreach_lead_status", [
  "ready",
  "draft",
  "sent",
  "skipped",
  "dnc",
])

export const outreachLeadOwnerEnum = pgEnum("outreach_lead_owner", [
  "luke",
  "alex",
])

export const outreachReplySentimentEnum = pgEnum("outreach_reply_sentiment", [
  "positive",
  "neutral",
  "negative",
])

export const outreachHypothesisStatusEnum = pgEnum("outreach_hypothesis_status", [
  "active",
  "complete",
])

export const outreachHypothesisVerdictEnum = pgEnum(
  "outreach_hypothesis_verdict",
  ["pending", "testing", "keep", "mutate", "kill", "baseline"],
)

export const outreachDeliveryStatusEnum = pgEnum("outreach_delivery_status", [
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
])

export const outreachClassifierEnum = pgEnum("outreach_classifier", [
  "claude",
  "luke",
  "rule",
])

// ---------------------------------------------------------------------------
// weekly_hypothesis — the 7-day loop spine
// ---------------------------------------------------------------------------

export const weeklyHypothesis = pgTable("outreach_weekly_hypothesis", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  // ISO week label, e.g. "2026-W24"
  week: text().notNull(),
  startDate: date({ mode: "string" }).notNull(),
  endDate: date({ mode: "string" }).notNull(),
  title: text().notNull(),
  body: text().notNull(),
  // Targets locked at week start
  targetSample: integer().notNull(),
  targetReplyPct: numeric({ precision: 5, scale: 2 }).notNull(),
  targetPositivePct: numeric({ precision: 5, scale: 2 }).notNull(),
  targetBooked: integer().default(0).notNull(),
  // Outcome at week close
  status: outreachHypothesisStatusEnum().default("active").notNull(),
  verdict: outreachHypothesisVerdictEnum().default("pending").notNull(),
  resultSummary: text(),
  replaces: text(),
  prevWeekId: uuid(),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("weekly_hypothesis_tenantId_week_key").on(table.tenantId, table.week),
  index("weekly_hypothesis_tenantId_status_idx").on(table.tenantId, table.status),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "weekly_hypothesis_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.prevWeekId],
    foreignColumns: [table.id],
    name: "weekly_hypothesis_prevWeekId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// leads — the roster (1:1 with Master Lead List xlsx)
// ---------------------------------------------------------------------------

export const leads = pgTable("outreach_leads", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  // Per-tenant sequence (matches the # column in the xlsx)
  number: integer().notNull(),
  owner: outreachLeadOwnerEnum().notNull(),
  status: outreachLeadStatusEnum().default("ready").notNull(),
  name: text().notNull(),
  company: text().notNull(),
  category: text(),
  email: text(),
  website: text(),
  source: text(),
  researched: boolean().default(false).notNull(),
  followUpFlag: boolean().default(false).notNull(),
  lastContactedAt: date({ mode: "string" }),
  nextFollowUpAt: date({ mode: "string" }),
  reply: boolean().default(false).notNull(),
  replySentiment: outreachReplySentimentEnum(),
  researchNotes: text(),
  notes: text(),
  hypothesisWeekId: uuid(),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("leads_tenantId_email_key")
    .on(table.tenantId, table.email)
    .where(sql`"email" IS NOT NULL`),
  uniqueIndex("leads_tenantId_number_key").on(table.tenantId, table.number),
  index("leads_tenantId_status_idx").on(table.tenantId, table.status),
  index("leads_tenantId_owner_idx").on(table.tenantId, table.owner),
  index("leads_tenantId_lastContactedAt_idx")
    .on(table.tenantId, table.lastContactedAt.desc()),
  index("leads_tenantId_hypothesisWeekId_idx")
    .on(table.tenantId, table.hypothesisWeekId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "leads_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.hypothesisWeekId],
    foreignColumns: [weeklyHypothesis.id],
    name: "leads_hypothesisWeekId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// daily_activity — the dashboard spine (Google Sheet parity)
//   One row per (date, owner) — Sent / Replies / Positive derive from leads
//   for live views, but cached here so the dashboard is cheap to query.
//   Meetings & deal counts pulled from Cal + Twenty MCPs and stamped here.
// ---------------------------------------------------------------------------

export const dailyActivity = pgTable("outreach_daily_activity", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  date: date({ mode: "string" }).notNull(),
  owner: outreachLeadOwnerEnum().notNull(),
  channel: outreachChannelEnum().default("email").notNull(),
  hypothesisWeekId: uuid(),
  // Top-of-funnel (derived from leads)
  sent: integer().default(0).notNull(),
  replies: integer().default(0).notNull(),
  positive: integer().default(0).notNull(),
  // Mid-funnel (Cal MCP)
  meetingsBooked: integer().default(0).notNull(),
  meetingsTaken: integer().default(0).notNull(),
  // Bottom-funnel (Twenty MCP)
  interested: integer().default(0).notNull(),
  closed: integer().default(0).notNull(),
  newUpfront: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
  newRetainer: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
  notes: text(),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("daily_activity_tenantId_date_owner_key")
    .on(table.tenantId, table.date, table.owner),
  index("daily_activity_tenantId_date_idx")
    .on(table.tenantId, table.date.desc()),
  index("daily_activity_tenantId_hypothesisWeekId_idx")
    .on(table.tenantId, table.hypothesisWeekId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "daily_activity_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.hypothesisWeekId],
    foreignColumns: [weeklyHypothesis.id],
    name: "daily_activity_hypothesisWeekId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// touches — historical send audit log (slim). Required by Gmail processor
// for In-Reply-To correlation via externalMessageId.
// ---------------------------------------------------------------------------

export const touches = pgTable("outreach_touches", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  leadId: uuid().notNull(),
  channel: outreachChannelEnum().notNull(),
  sentAt: timestamp({ precision: 3, mode: "date" }),
  subjectRendered: text(),
  bodyRendered: text(),
  deliveryStatus: outreachDeliveryStatusEnum().default("queued").notNull(),
  externalMessageId: text(),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("touches_tenantId_leadId_sentAt_idx")
    .on(table.tenantId, table.leadId, table.sentAt.desc()),
  index("touches_tenantId_externalMessageId_idx")
    .on(table.tenantId, table.externalMessageId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "touches_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.leadId],
    foreignColumns: [leads.id],
    name: "touches_leadId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// replies — inbox triage. Written by Gmail processor.
// ---------------------------------------------------------------------------

export const replies = pgTable("outreach_replies", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  touchId: uuid(),
  leadId: uuid().notNull(),
  receivedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  subject: text(),
  body: text(),
  sentiment: outreachReplySentimentEnum(),
  classifiedBy: outreachClassifierEnum(),
  needsReview: boolean().default(true).notNull(),
  handled: boolean().default(false).notNull(),
  handledAt: timestamp({ precision: 3, mode: "date" }),
  rawEventId: uuid(),
  createdAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("replies_tenantId_needsReview_idx")
    .on(table.tenantId)
    .where(sql`"needsReview" = true`),
  index("replies_tenantId_leadId_receivedAt_idx")
    .on(table.tenantId, table.leadId, table.receivedAt.desc()),
  index("replies_touchId_idx").on(table.touchId),
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
    columns: [table.leadId],
    foreignColumns: [leads.id],
    name: "replies_leadId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// dnc_list — suppression
// ---------------------------------------------------------------------------

export const dncList = pgTable("outreach_dnc_list", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  email: text(),
  domain: text(),
  reason: text(),
  addedAt: timestamp({ precision: 3, mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
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

export type LeadRow = typeof leads.$inferSelect
export type LeadInsert = typeof leads.$inferInsert
export type DailyActivityRow = typeof dailyActivity.$inferSelect
export type DailyActivityInsert = typeof dailyActivity.$inferInsert
export type WeeklyHypothesisRow = typeof weeklyHypothesis.$inferSelect
export type WeeklyHypothesisInsert = typeof weeklyHypothesis.$inferInsert
export type TouchRow = typeof touches.$inferSelect
export type TouchInsert = typeof touches.$inferInsert
export type ReplyRow = typeof replies.$inferSelect
export type ReplyInsert = typeof replies.$inferInsert
export type DncListRow = typeof dncList.$inferSelect
export type DncListInsert = typeof dncList.$inferInsert
