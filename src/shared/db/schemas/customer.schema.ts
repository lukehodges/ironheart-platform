import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
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

export const customerStatus = pgEnum("CustomerStatus", ['ACTIVE', 'INACTIVE', 'BLOCKED'])

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  'PROSPECT',
  'OUTREACH',
  'DISCOVERY',
  'AUDIT',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'DELIVERING',
  'COMPLETE',
  'LOST',
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const customers = pgTable("customers", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	email: text(),
	phone: text(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	county: text(),
	postcode: text(),
	country: text().default('GB').notNull(),
	latitude: numeric({ precision: 10, scale: 8 }),
	longitude: numeric({ precision: 11, scale: 8 }),
	preferredStaffId: uuid(),
	notes: text(),
	tags: text().array(),
	marketingOptIn: boolean().default(false).notNull(),
	referralSource: text(),
	status: customerStatus().default('ACTIVE').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
	version: integer().notNull().default(1),
	anonymisedAt: timestamp('anonymised_at', { withTimezone: true, mode: 'date' }),
	pipelineStage: pipelineStageEnum(),
	pipelineStageChangedAt: timestamp({ precision: 3, mode: 'date' }),
	lostReason: text(),
	dealValue: numeric({ precision: 10, scale: 2 }),
}, (table) => [
	index("customers_email_idx").on( table.email),
	index("customers_phone_idx").on( table.phone),
	uniqueIndex("customers_tenantId_email_key").on( table.tenantId, table.email),
	index("customers_tenantId_idx").on( table.tenantId),
	index("customers_tenantId_lastName_idx").on( table.tenantId, table.lastName),
	index("customers_tenantId_pipelineStage_idx").on( table.tenantId, table.pipelineStage),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "customers_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.preferredStaffId],
		foreignColumns: [users.id],
		name: "customers_preferredStaffId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type Customer = typeof customers.$inferSelect;
