import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  bigint,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userStatus = pgEnum("UserStatus", ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'])
export const userType = pgEnum("UserType", ['OWNER', 'ADMIN', 'MEMBER', 'CUSTOMER', 'API'])
export const staffStatus = pgEnum("StaffStatus", ['ACTIVE', 'ON_LEAVE', 'UNAVAILABLE', 'TERMINATED'])
export const employeeType = pgEnum("EmployeeType", ['EMPLOYEE', 'CONTRACTOR', 'FREELANCER'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	email: text().notNull(),
	emailVerified: timestamp({ precision: 3, mode: 'date' }),
	passwordHash: text(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	displayName: text(),
	avatarUrl: text(),
	phone: text(),
	phoneVerified: timestamp({ precision: 3, mode: 'date' }),
	timezone: text().default('Europe/London').notNull(),
	locale: text().default('en-GB').notNull(),
	type: userType().default('MEMBER').notNull(),
	status: userStatus().default('PENDING').notNull(),
	lastLoginAt: timestamp({ precision: 3, mode: 'date' }),
	lastActiveAt: timestamp({ precision: 3, mode: 'date' }),
	loginCount: integer().default(0).notNull(),
	failedLoginAttempts: integer().default(0).notNull(),
	lockedUntil: timestamp({ precision: 3, mode: 'date' }),
	twoFactorEnabled: boolean().default(false).notNull(),
	twoFactorSecret: text(),
	recoveryCodesHash: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
	invitedById: uuid(),
	isPlatformAdmin: boolean().default(false).notNull(),
	workosUserId: text("workos_user_id").unique(),
}, (table) => [
	index("users_email_idx").on( table.email),
	index("users_status_idx").on( table.status),
	uniqueIndex("users_tenantId_email_key").on( table.tenantId, table.email),
	index("users_tenantId_idx").on( table.tenantId),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "users_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.invitedById],
		foreignColumns: [table.id],
		name: "users_invitedById_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const staffProfiles = pgTable("staff_profiles", {
	userId: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	bio: text(),
	jobTitle: text(),
	employeeType: employeeType(),
	staffStatus: staffStatus().default('ACTIVE').notNull(),
	startDate: timestamp({ precision: 3, mode: 'date' }),
	dayRate: numeric({ precision: 10, scale: 2 }),
	hourlyRate: numeric({ precision: 10, scale: 2 }),
	mileageRate: numeric({ precision: 10, scale: 4 }),
	bankAccountName: text(),
	bankSortCode: text(),
	bankAccountNumber: text(),
	homeLatitude: numeric('home_latitude', { precision: 9, scale: 6 }),
	homeLongitude: numeric('home_longitude', { precision: 9, scale: 6 }),
	lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true, mode: 'date' }),
	// --- Phase 7: Staff module enhancements ---
	reportsTo: uuid('reports_to'),
	dateOfBirth: date('date_of_birth', { mode: 'date' }),
	taxId: text('tax_id'),
	emergencyContactName: text('emergency_contact_name'),
	emergencyContactPhone: text('emergency_contact_phone'),
	emergencyContactRelation: text('emergency_contact_relation'),
	addressLine1: text('address_line1'),
	addressLine2: text('address_line2'),
	addressCity: text('address_city'),
	addressPostcode: text('address_postcode'),
	addressCountry: text('address_country'),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("staff_profiles_tenantId_idx").on(table.tenantId),
	index("staff_profiles_staffStatus_idx").on(table.staffStatus),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "staff_profiles_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "staff_profiles_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.reportsTo],
		foreignColumns: [users.id],
		name: "staff_profiles_reportsTo_fkey",
	}).onUpdate("cascade").onDelete("set null"),
])

export type StaffProfile = typeof staffProfiles.$inferSelect;

export const roles = pgTable("roles", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	color: text(),
	isSystem: boolean().default(false).notNull(),
	isDefault: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("roles_tenantId_idx").on( table.tenantId),
	uniqueIndex("roles_tenantId_name_key").on( table.tenantId, table.name),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "roles_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const permissions = pgTable("permissions", {
	id: uuid().primaryKey().notNull(),
	resource: text().notNull(),
	action: text().notNull(),
	description: text(),
}, (table) => [
	uniqueIndex("permissions_resource_action_key").on( table.resource, table.action),
])

export const rolePermissions = pgTable("role_permissions", {
	roleId: uuid().notNull(),
	permissionId: uuid().notNull(),
	conditions: jsonb(),
}, (table) => [
	foreignKey({
		columns: [table.roleId],
		foreignColumns: [roles.id],
		name: "role_permissions_roleId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.permissionId],
		foreignColumns: [permissions.id],
		name: "role_permissions_permissionId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.roleId, table.permissionId], name: "role_permissions_pkey" }),
])

export const userRoles = pgTable("user_roles", {
	userId: uuid().notNull(),
	roleId: uuid().notNull(),
	grantedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	grantedBy: uuid(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_roles_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.roleId],
		foreignColumns: [roles.id],
		name: "user_roles_roleId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_pkey" }),
])

export const sessions = pgTable("sessions", {
	id: uuid().primaryKey().notNull(),
	userId: uuid().notNull(),
	token: text().notNull(),
	refreshToken: text(),
	userAgent: text(),
	ipAddress: text(),
	deviceType: text(),
	deviceName: text(),
	country: text(),
	city: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	lastUsedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	revokedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	uniqueIndex("sessions_refreshToken_key").on( table.refreshToken),
	index("sessions_token_idx").on( table.token),
	uniqueIndex("sessions_token_key").on( table.token),
	index("sessions_userId_idx").on( table.userId),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "sessions_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const apiKeys = pgTable("api_keys", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	keyHash: text().notNull(),
	keyPrefix: text().notNull(),
	scopes: text().array(),
	rateLimit: integer().default(1000).notNull(),
	allowedIps: text().array(),
	allowedOrigins: text().array(),
	lastUsedAt: timestamp({ precision: 3, mode: 'date' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usageCount: bigint({ mode: "number" }).default(0).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	revokedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: uuid(),
}, (table) => [
	uniqueIndex("api_keys_keyHash_key").on( table.keyHash),
	index("api_keys_keyPrefix_idx").on( table.keyPrefix),
	index("api_keys_tenantId_idx").on( table.tenantId),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "api_keys_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
