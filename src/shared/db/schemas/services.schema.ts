import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
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

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const locationType = pgEnum("LocationType", ['VENUE', 'CUSTOMER_HOME', 'CUSTOMER_WORK', 'OTHER'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const serviceCategories = pgTable("service_categories", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	sortOrder: integer().default(0).notNull(),
}, (table) => [
	uniqueIndex("service_categories_tenantId_name_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
])

export const venues = pgTable("venues", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	county: text(),
	postcode: text(),
	country: text().default('GB').notNull(),
	latitude: numeric({ precision: 10, scale: 8 }),
	longitude: numeric({ precision: 11, scale: 8 }),
	phone: text(),
	email: text(),
	isDefault: boolean().default(false).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	additionalCost: numeric({ precision: 10, scale: 2 }),
}, (table) => [
	index("venues_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "venues_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const services = pgTable("services", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	durationMinutes: integer().notNull(),
	bufferMinutes: integer().default(0).notNull(),
	price: numeric({ precision: 10, scale: 2 }).notNull(),
	taxRate: numeric({ precision: 5, scale: 4 }).default('0').notNull(),
	requiresDeposit: boolean().default(false).notNull(),
	depositAmount: numeric({ precision: 10, scale: 2 }),
	depositPercent: integer(),
	color: text(),
	sortOrder: integer().default(0).notNull(),
	active: boolean().default(true).notNull(),
	visibleInPortal: boolean().default(true).notNull(),
	categoryId: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	entertainer: text(),
	icon: text(),
	locationType: text(),
	metadata: jsonb(),
	requiresApproximateTime: boolean().default(false).notNull(),
	venueNames: text().array(),
}, (table) => [
	index("services_tenantId_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.active.asc().nullsLast().op("bool_ops")),
	index("services_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "services_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.categoryId],
		foreignColumns: [serviceCategories.id],
		name: "services_categoryId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const addOns = pgTable("add_ons", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	priceType: text().notNull(),
	fixedPrice: numeric({ precision: 10, scale: 2 }),
	perChildPrice: numeric({ precision: 10, scale: 2 }),
	tieredPricing: jsonb(),
	matchedDonation: boolean().default(false).notNull(),
	birthdayChildFree: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("add_ons_tenantId_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.active.asc().nullsLast().op("bool_ops")),
	index("add_ons_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "add_ons_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const serviceAddOns = pgTable("service_add_ons", {
	id: uuid().primaryKey().notNull(),
	serviceId: uuid().notNull(),
	addOnId: uuid().notNull(),
}, (table) => [
	uniqueIndex("service_add_ons_serviceId_addOnId_key").using("btree", table.serviceId.asc().nullsLast().op("uuid_ops"), table.addOnId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.serviceId],
		foreignColumns: [services.id],
		name: "service_add_ons_serviceId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.addOnId],
		foreignColumns: [addOns.id],
		name: "service_add_ons_addOnId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type Service = typeof services.$inferSelect;
export type Venue = typeof venues.$inferSelect;
