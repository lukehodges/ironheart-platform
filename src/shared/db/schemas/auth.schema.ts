import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
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
	bio: text(),
	dayRate: numeric({ precision: 10, scale: 2 }),
	employeeType: employeeType(),
	hourlyRate: numeric({ precision: 10, scale: 2 }),
	isTeamMember: boolean().default(false).notNull(),
	jobTitle: text(),
	maxConcurrentBookings: integer().default(1),
	maxDailyBookings: integer(),
	mileageRate: numeric({ precision: 10, scale: 4 }),
	serviceIds: uuid().array().default([]),
	staffStatus: staffStatus(),
	startDate: timestamp({ precision: 3, mode: 'date' }),
	isPlatformAdmin: boolean().default(false).notNull(),
	bankAccountName: text(),
	bankSortCode: text(),
	bankAccountNumber: text(),
	workosUserId: text("workos_user_id").unique(),
	lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true, mode: 'date' }),
	homeLatitude: numeric('home_latitude', { precision: 9, scale: 6 }),
	homeLongitude: numeric('home_longitude', { precision: 9, scale: 6 }),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("users_tenantId_email_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.email.asc().nullsLast().op("text_ops")),
	index("users_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
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
	index("roles_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("roles_tenantId_name_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
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
	uniqueIndex("permissions_resource_action_key").using("btree", table.resource.asc().nullsLast().op("text_ops"), table.action.asc().nullsLast().op("text_ops")),
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
	uniqueIndex("sessions_refreshToken_key").using("btree", table.refreshToken.asc().nullsLast().op("text_ops")),
	index("sessions_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	uniqueIndex("sessions_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("sessions_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
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
	uniqueIndex("api_keys_keyHash_key").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("api_keys_keyPrefix_idx").using("btree", table.keyPrefix.asc().nullsLast().op("text_ops")),
	index("api_keys_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
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
