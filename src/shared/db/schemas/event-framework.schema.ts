import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  bigserial,
  boolean,
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

export const eventSubscriptionDeliveryEnum = pgEnum("event_subscription_delivery", [
  "webhook",
  "log",
  "noop",
])

export const auditLogOpEnum = pgEnum("audit_log_op", [
  "insert",
  "update",
  "delete",
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * Universal inbox — every webhook / sync / import lands here untouched.
 * Processed async, fully replayable.
 */
export const rawEvents = pgTable("raw_events", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  // Nullable for system / cross-tenant events (e.g. global Companies House sync)
  tenantId: uuid(),
  source: text().notNull(),
  sourceEventId: text().notNull(),
  kind: text().notNull(),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
  receivedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  processedAt: timestamp({ precision: 3, mode: 'date' }),
  processorVersion: integer().default(0).notNull(),
  error: text(),
  attemptCount: integer().default(0).notNull(),
  nextAttemptAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
  uniqueIndex("raw_events_source_sourceEventId_key").on(table.source, table.sourceEventId),
  index("raw_events_unprocessed_idx")
    .on(table.receivedAt)
    .where(sql`"processedAt" IS NULL`),
  index("raw_events_tenantId_source_receivedAt_idx").on(table.tenantId, table.source, table.receivedAt),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "raw_events_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

/**
 * Event outbox — monotonic stream of meaningful state changes.
 * Downstream consumers subscribe via event_subscriptions.cursor.
 */
export const events = pgTable("events", {
  // bigserial provides the monotonic sequence; id IS the sequence number.
  id: bigserial({ mode: "number" }).primaryKey().notNull(),
  // Nullable for cross-tenant / system events.
  tenantId: uuid(),
  kind: text().notNull(),
  entityType: text(),
  entityId: uuid(),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
  at: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  actor: text(),
}, (table) => [
  index("events_tenantId_kind_at_idx").on(table.tenantId, table.kind, table.at.desc()),
  index("events_entityType_entityId_at_idx").on(table.entityType, table.entityId, table.at.desc()),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "events_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

/**
 * Per-tenant subscriptions to the event outbox.
 * Cursor tracks last-delivered events.id.
 */
export const eventSubscriptions = pgTable("event_subscriptions", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  kinds: text().array().notNull().default(sql`'{}'::text[]`),
  delivery: eventSubscriptionDeliveryEnum().default("log").notNull(),
  config: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  cursor: bigint({ mode: "number" }).default(0).notNull(),
  enabled: boolean().default(true).notNull(),
  lastDeliveredAt: timestamp({ precision: 3, mode: 'date' }),
  lastError: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("event_subscriptions_tenantId_enabled_idx").on(table.tenantId, table.enabled),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "event_subscriptions_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

/**
 * External-ID → internal-entity mapping for dedup & matching across sources.
 * e.g. stripe cus_abc → company.id, gmail thread → engagement.id.
 */
export const identities = pgTable("identities", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  entityType: text().notNull(),
  entityId: uuid().notNull(),
  source: text().notNull(),
  externalId: text().notNull(),
  metadata: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("identities_tenantId_source_externalId_key").on(table.tenantId, table.source, table.externalId),
  index("identities_entityType_entityId_idx").on(table.entityType, table.entityId),
  index("identities_tenantId_source_idx").on(table.tenantId, table.source),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "identities_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

/**
 * DB-backed integration configuration & per-connection sync cursor state.
 * provider_slug matches IntegrationProvider.slug from integrations.types.ts.
 */
export const integrationConnections = pgTable("integration_connections", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  // Nullable for tenant-wide (non-user-owned) integrations.
  userId: uuid(),
  providerSlug: text().notNull(),
  name: text().notNull(),
  config: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  // Vault key / secret reference — never store raw credentials here.
  secretsRef: text(),
  enabled: boolean().default(true).notNull(),
  syncCursor: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  lastSyncAt: timestamp({ precision: 3, mode: 'date' }),
  lastSyncError: text(),
  installedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("integration_connections_tenantId_providerSlug_name_key")
    .on(table.tenantId, table.providerSlug, table.name),
  index("integration_connections_tenantId_enabled_idx").on(table.tenantId, table.enabled),
  index("integration_connections_userId_idx").on(table.userId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "integration_connections_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "integration_connections_userId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

/**
 * Generic audit trail — table + row + before/after JSON.
 * Triggered from application code at mutation boundaries.
 */
export const auditLog = pgTable("audit_log", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  actor: text().notNull(),
  tableName: text().notNull(),
  rowId: text().notNull(),
  op: auditLogOpEnum().notNull(),
  before: jsonb().$type<Record<string, unknown>>(),
  after: jsonb().$type<Record<string, unknown>>(),
  at: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("audit_log_tenantId_tableName_at_idx").on(table.tenantId, table.tableName, table.at.desc()),
  index("audit_log_actor_at_idx").on(table.actor, table.at.desc()),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "audit_log_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type RawEventRow = typeof rawEvents.$inferSelect
export type EventRow = typeof events.$inferSelect
export type EventSubscriptionRow = typeof eventSubscriptions.$inferSelect
export type IdentityRow = typeof identities.$inferSelect
export type IntegrationConnectionRow = typeof integrationConnections.$inferSelect
export type AuditLogRow = typeof auditLog.$inferSelect
