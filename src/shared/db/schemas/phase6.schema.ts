import {
  pgTable,
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
import { customers } from "./customer.schema"
import { services } from "./services.schema"

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const stripeConnectAccounts = pgTable("stripe_connect_accounts", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  stripeAccountId: text().notNull(),
  status: text().notNull().default('pending'),
  chargesEnabled: boolean().notNull().default(false),
  payoutsEnabled: boolean().notNull().default(false),
  requirements: jsonb(),
  capabilities: jsonb(),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("stripe_connect_accounts_stripeAccountId_key").using("btree", table.stripeAccountId.asc().nullsLast().op("text_ops")),
  uniqueIndex("stripe_connect_accounts_tenantId_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "stripe_connect_accounts_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const pricingRules = pgTable("pricing_rules", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  enabled: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  conditions: jsonb().notNull().default(sql`'{"logic":"AND","conditions":[]}'::jsonb`),
  modifierType: text().notNull(),
  modifierValue: numeric({ precision: 10, scale: 4 }).notNull(),
  serviceIds: uuid().array(),
  staffIds: uuid().array(),
  validFrom: timestamp({ withTimezone: true, mode: 'date' }),
  validUntil: timestamp({ withTimezone: true, mode: 'date' }),
  maxUses: integer(),
  currentUses: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  index("pricing_rules_tenantId_enabled_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.enabled.asc().nullsLast().op("bool_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "pricing_rules_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const discountCodes = pgTable("discount_codes", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  code: text().notNull(),
  pricingRuleId: uuid(),
  expiresAt: timestamp({ withTimezone: true, mode: 'date' }),
  maxUses: integer(),
  currentUses: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("discount_codes_tenantId_code_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.code.asc().nullsLast().op("text_ops")),
  index("discount_codes_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "discount_codes_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.pricingRuleId],
    foreignColumns: [pricingRules.id],
    name: "discount_codes_pricingRuleId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const taxRules = pgTable("tax_rules", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  rate: numeric({ precision: 6, scale: 4 }).notNull(),
  country: text().notNull(),
  taxCode: text(),
  appliesTo: text().notNull().default('ALL'),
  isDefault: boolean().notNull().default(false),
  isReverseCharge: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  index("tax_rules_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "tax_rules_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const bookingWaitlist = pgTable("booking_waitlist", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  customerId: uuid().notNull(),
  serviceId: uuid().notNull(),
  staffId: uuid(),
  preferredDate: date({ mode: 'date' }),
  preferredTimeStart: text(),
  preferredTimeEnd: text(),
  flexibilityDays: integer().notNull().default(3),
  status: text().notNull().default('WAITING'),
  notifiedAt: timestamp({ withTimezone: true, mode: 'date' }),
  expiresAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  index("booking_waitlist_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
  index("booking_waitlist_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "booking_waitlist_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "booking_waitlist_customerId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.serviceId],
    foreignColumns: [services.id],
    name: "booking_waitlist_serviceId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.staffId],
    foreignColumns: [users.id],
    name: "booking_waitlist_staffId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  url: text().notNull(),
  secret: text().notNull(),
  description: text(),
  events: text().array().notNull(),
  status: text().notNull().default('ACTIVE'),
  failureCount: integer().notNull().default(0),
  lastSuccessAt: timestamp({ withTimezone: true, mode: 'date' }),
  lastFailureAt: timestamp({ withTimezone: true, mode: 'date' }),
  lastFailureReason: text(),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  index("webhook_endpoints_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "webhook_endpoints_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  endpointId: uuid().notNull(),
  eventType: text().notNull(),
  eventId: text().notNull(),
  payload: jsonb().notNull(),
  attempt: integer().notNull().default(1),
  status: text().notNull(),
  responseStatus: integer(),
  responseBody: text(),
  durationMs: integer(),
  deliveredAt: timestamp({ withTimezone: true, mode: 'date' }),
  nextRetryAt: timestamp({ withTimezone: true, mode: 'date' }),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  index("webhook_deliveries_endpointId_idx").using("btree", table.endpointId.asc().nullsLast().op("uuid_ops")),
  index("webhook_deliveries_eventId_idx").using("btree", table.eventId.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.endpointId],
    foreignColumns: [webhookEndpoints.id],
    name: "webhook_deliveries_endpointId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const metricSnapshots = pgTable("metric_snapshots", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  metricKey: text().notNull(),
  dimensions: jsonb().notNull().default(sql`'{}'::jsonb`),
  periodType: text().notNull(),
  periodStart: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
  value: numeric().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
}, (table) => [
  index("metric_snapshots_tenantId_metricKey_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.metricKey.asc().nullsLast().op("text_ops")),
  index("metric_snapshots_tenantId_periodStart_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.periodStart.asc().nullsLast().op("timestamptz_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "metric_snapshots_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const sagaLog = pgTable("saga_log", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  sagaType: text().notNull(),
  entityId: uuid().notNull(),
  status: text().notNull(),
  steps: jsonb().notNull().default(sql`'[]'::jsonb`),
  startedAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().default(sql`now()`),
  completedAt: timestamp({ withTimezone: true, mode: 'date' }),
  errorMessage: text(),
  requiresManualIntervention: boolean().notNull().default(false),
}, (table) => [
  index("saga_log_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
  index("saga_log_entityId_idx").using("btree", table.entityId.asc().nullsLast().op("uuid_ops")),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type StripeConnectAccount = typeof stripeConnectAccounts.$inferSelect;
export type NewStripeConnectAccount = typeof stripeConnectAccounts.$inferInsert;

export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;

export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;

export type TaxRule = typeof taxRules.$inferSelect;
export type NewTaxRule = typeof taxRules.$inferInsert;

export type BookingWaitlist = typeof bookingWaitlist.$inferSelect;
export type NewBookingWaitlist = typeof bookingWaitlist.$inferInsert;

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoints.$inferInsert;

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;

export type MetricSnapshot = typeof metricSnapshots.$inferSelect;
export type NewMetricSnapshot = typeof metricSnapshots.$inferInsert;

export type SagaLog = typeof sagaLog.$inferSelect;
export type NewSagaLog = typeof sagaLog.$inferInsert;
