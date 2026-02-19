import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  bigint,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const planType = pgEnum("PlanType", ['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM'])
export const tenantStatus = pgEnum("TenantStatus", ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'DELETED'])
export const availabilityMode = pgEnum("AvailabilityMode", ['CALENDAR_BASED', 'SLOT_BASED', 'HYBRID'])
export const moduleCategory = pgEnum("ModuleCategory", ['CORE', 'PREMIUM', 'CUSTOM', 'COMING_SOON'])
export const settingType = pgEnum("SettingType", ['BOOLEAN', 'NUMBER', 'TEXT', 'SELECT', 'JSON'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	domain: text(),
	plan: planType().default('STARTER').notNull(),
	status: tenantStatus().default('ACTIVE').notNull(),
	stripeCustomerId: text(),
	subscriptionId: text(),
	billingEmail: text(),
	maxUsers: integer().default(5).notNull(),
	maxStaff: integer().default(10).notNull(),
	maxBookingsMonth: integer().default(500).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	storageUsedBytes: bigint({ mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	storageLimitBytes: bigint({ mode: "number" }).default(sql`'5368709120'`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	trialEndsAt: timestamp({ precision: 3, mode: 'date' }),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	uniqueIndex("tenants_domain_key").using("btree", table.domain.asc().nullsLast().op("text_ops")),
	index("tenants_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	uniqueIndex("tenants_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("tenants_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
])

export const portalTemplates = pgTable("portal_templates", {
	id: uuid().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	industry: text().notNull(),
	colorScheme: jsonb().notNull(),
	fonts: jsonb(),
	logoPosition: text().default('left').notNull(),
	stepFlow: jsonb().notNull(),
	requiresLocation: boolean().default(true).notNull(),
	locationTypes: text().array(),
	formSchema: jsonb().notNull(),
	defaultAvailabilityMode: availabilityMode().default('SLOT_BASED').notNull(),
	requiresApproval: boolean().default(false).notNull(),
	reservationMinutes: integer().default(15).notNull(),
	isActive: boolean().default(true).notNull(),
	isSystemTemplate: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	previewImage: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	skipReservation: boolean().default(false).notNull(),
}, (table) => [
	uniqueIndex("portal_templates_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
])

export const tenantPortals = pgTable("tenant_portals", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	templateId: uuid().notNull(),
	urlPath: text().notNull(),
	displayName: text().notNull(),
	colorOverrides: jsonb(),
	labelOverrides: jsonb(),
	formOverrides: jsonb(),
	requiresLocation: boolean().default(true).notNull(),
	maxTravelMinutes: integer(),
	travelPadding: integer().default(15).notNull(),
	availabilityMode: availabilityMode(),
	isActive: boolean().default(true).notNull(),
	isDefault: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	skipReservation: boolean(),
	bookingSettings: jsonb(),
}, (table) => [
	index("tenant_portals_tenantId_isActive_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.isActive.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("tenant_portals_tenantId_urlPath_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.urlPath.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "tenant_portals_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.templateId],
		foreignColumns: [portalTemplates.id],
		name: "tenant_portals_templateId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type Tenant = typeof tenants.$inferSelect;
export type PortalTemplate = typeof portalTemplates.$inferSelect;
export type TenantPortal = typeof tenantPortals.$inferSelect;
