import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  date,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { venues } from "./services.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const availabilityType = pgEnum("AvailabilityType", ['RECURRING', 'SPECIFIC', 'BLOCKED'])
export const capacityMode = pgEnum("CapacityMode", ['TENANT_LEVEL', 'CALENDAR_LEVEL', 'STAFF_LEVEL'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const availableSlots = pgTable("available_slots", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	date: date({ mode: 'date' }).notNull(),
	time: text().notNull(),
	endTime: text(),
	available: boolean().default(true).notNull(),
	staffIds: uuid().array(),
	serviceIds: uuid().array(),
	venueId: uuid(),
	capacity: integer().default(1).notNull(),
	bookedCount: integer().default(0).notNull(),
	requiresApproval: boolean().default(false).notNull(),
	approvedAt: timestamp({ precision: 3, mode: 'date' }),
	approvedBy: uuid(),
	metadata: jsonb(),
	sortOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	estimatedLocation: text(),
	previousSlotId: uuid(),
	travelTimeFromPrev: integer(),
}, (table) => [
	index("available_slots_tenantId_available_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.available.asc().nullsLast().op("uuid_ops")),
	index("available_slots_tenantId_date_idx").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("available_slots_tenantId_date_time_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("date_ops"), table.time.asc().nullsLast().op("date_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "available_slots_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.venueId],
		foreignColumns: [venues.id],
		name: "available_slots_venueId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.previousSlotId],
		foreignColumns: [table.id],
		name: "available_slots_previousSlotId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const slotStaff = pgTable("_SlotStaff", {
	a: uuid("A").notNull(),
	b: uuid("B").notNull(),
}, (table) => [
	index().using("btree", table.b.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.a],
		foreignColumns: [availableSlots.id],
		name: "_SlotStaff_A_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.b],
		foreignColumns: [users.id],
		name: "_SlotStaff_B_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.a, table.b], name: "_SlotStaff_AB_pkey" }),
])

export const userAvailability = pgTable("user_availability", {
	id: uuid().primaryKey().notNull(),
	userId: uuid().notNull(),
	type: availabilityType().notNull(),
	dayOfWeek: integer(),
	specificDate: date({ mode: 'date' }),
	endDate: date({ mode: 'date' }),
	startTime: text().notNull(),
	endTime: text().notNull(),
	reason: text(),
	isAllDay: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("user_availability_userId_dayOfWeek_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.dayOfWeek.asc().nullsLast().op("uuid_ops")),
	index("user_availability_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_availability_userId_specificDate_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.specificDate.asc().nullsLast().op("date_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_availability_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const userCapacities = pgTable("user_capacities", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid(),
	date: date({ mode: 'date' }).notNull(),
	maxBookings: integer().default(1).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("user_capacities_tenantId_date_idx").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("user_capacities_tenantId_userId_date_key").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.userId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_capacities_userId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "user_capacities_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type AvailableSlot = typeof availableSlots.$inferSelect;
