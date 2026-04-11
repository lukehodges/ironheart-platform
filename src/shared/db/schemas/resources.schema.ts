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
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { customers } from "./customer.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const resourceType = pgEnum("ResourceType", ['PERSON', 'VEHICLE', 'ROOM', 'EQUIPMENT', 'VIRTUAL'])
export const contactRole = pgEnum("ContactRole", ['PRIMARY', 'BILLING', 'SITE_CONTACT', 'GUARDIAN', 'EMERGENCY'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// Declare addresses first so resources can FK to it
export const addresses = pgTable("addresses", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  line1: text().notNull(),
  line2: text(),
  city: text().notNull(),
  county: text(),
  postcode: text().notNull(),
  country: text().default('GB').notNull(),
  lat: numeric({ precision: 10, scale: 7 }),
  lng: numeric({ precision: 10, scale: 7 }),
  geocodedAt: timestamp({ precision: 3, mode: 'date' }),
  label: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("addresses_tenantId_idx").on(table.tenantId),
  index("addresses_tenantId_postcode_idx").on(table.tenantId, table.postcode),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "addresses_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const resources = pgTable("resources", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  type: resourceType().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  capacity: integer().default(1).notNull(),
  homeAddressId: uuid(),
  travelEnabled: boolean().default(false).notNull(),
  skillTags: text().array(),
  userId: uuid(),
  isActive: boolean().default(true).notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("resources_tenantId_type_idx").on(table.tenantId, table.type),
  index("resources_tenantId_isActive_idx").on(table.tenantId, table.isActive),
  index("resources_userId_idx").on(table.userId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resources_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.homeAddressId],
    foreignColumns: [addresses.id],
    name: "resources_homeAddressId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resources_userId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const customerContacts = pgTable("customer_contacts", {
  id: uuid().primaryKey().notNull(),
  customerId: uuid().notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  email: text(),
  phone: text(),
  role: contactRole().notNull(),
  receivesNotifications: boolean().default(false).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("customer_contacts_customerId_idx").on(table.customerId),
  index("customer_contacts_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "customer_contacts_customerId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "customer_contacts_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type Resource = typeof resources.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type CustomerContact = typeof customerContacts.$inferSelect;
