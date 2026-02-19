import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
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

export const calendarIntegrationProvider = pgEnum("CalendarIntegrationProvider", ['GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR'])
export const calendarSyncType = pgEnum("CalendarSyncType", ['FULL_SYNC', 'INCREMENTAL_SYNC', 'MANUAL_SYNC', 'BOOKING_PUSH', 'EVENT_IMPORT'])
export const integrationProvider = pgEnum("IntegrationProvider", ['GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'FREEAGENT', 'XERO', 'QUICKBOOKS', 'STRIPE', 'GOCARDLESS', 'TWILIO', 'SENDGRID'])
export const integrationStatus = pgEnum("IntegrationStatus", ['DISCONNECTED', 'CONNECTED', 'ERROR', 'EXPIRED'])
export const syncDirection = pgEnum("SyncDirection", ['PUSH', 'PULL', 'BIDIRECTIONAL'])
export const syncStatus = pgEnum("SyncStatus", ['SUCCESS', 'FAILED', 'SKIPPED'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const integrations = pgTable("integrations", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	provider: integrationProvider().notNull(),
	status: integrationStatus().default('DISCONNECTED').notNull(),
	accessToken: text(),
	refreshToken: text(),
	tokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
	config: jsonb(),
	lastSyncAt: timestamp({ precision: 3, mode: 'date' }),
	lastSyncError: text(),
	connectedAt: timestamp({ precision: 3, mode: 'date' }),
	connectedBy: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("integrations_tenantId_provider_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("uuid_ops")),
])

export const integrationSyncLogs = pgTable("integration_sync_logs", {
	id: uuid().primaryKey().notNull(),
	integrationId: uuid().notNull(),
	direction: syncDirection().notNull(),
	entityType: text().notNull(),
	localId: uuid(),
	remoteId: text(),
	status: syncStatus().notNull(),
	errorMessage: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("integration_sync_logs_integrationId_createdAt_idx").using("btree", table.integrationId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
		columns: [table.integrationId],
		foreignColumns: [integrations.id],
		name: "integration_sync_logs_integrationId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const oauthStates = pgTable("oauth_states", {
	id: uuid().primaryKey().notNull(),
	state: text().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	staffId: uuid(),
	provider: calendarIntegrationProvider().notNull(),
	redirectUrl: text(),
	metadata: jsonb(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	usedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	codeVerifier: text().notNull(),
}, (table) => [
	index("oauth_states_expiresAt_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("oauth_states_state_idx").using("btree", table.state.asc().nullsLast().op("text_ops")),
	uniqueIndex("oauth_states_state_key").using("btree", table.state.asc().nullsLast().op("text_ops")),
])

export const userIntegrations = pgTable("user_integrations", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	provider: calendarIntegrationProvider().notNull(),
	status: integrationStatus().default('DISCONNECTED').notNull(),
	encryptedAccessToken: text(),
	encryptedRefreshToken: text(),
	tokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
	tokenVersion: integer().default(1).notNull(),
	providerAccountId: text(),
	calendarId: text(),
	syncEnabled: boolean().default(true).notNull(),
	pushBookingsToCalendar: boolean().default(true).notNull(),
	blockTimeOnCalendar: boolean().default(true).notNull(),
	importCalendarEvents: boolean().default(false).notNull(),
	twoWaySync: boolean().default(false).notNull(),
	syncToken: text(),
	watchChannelId: text(),
	watchChannelToken: text(),
	watchChannelExpiration: timestamp({ precision: 3, mode: 'date' }),
	watchResourceId: text(),
	lastSyncAt: timestamp({ precision: 3, mode: 'date' }),
	lastSyncStatus: text(),
	lastSyncError: text(),
	nextSyncAt: timestamp({ precision: 3, mode: 'date' }),
	connectedAt: timestamp({ precision: 3, mode: 'date' }),
	connectedBy: uuid(),
	disconnectedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("user_integrations_lastSyncAt_idx").using("btree", table.lastSyncAt.asc().nullsLast().op("timestamp_ops")),
	index("user_integrations_provider_status_idx").using("btree", table.provider.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("user_integrations_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("user_integrations_tenantId_userId_provider_key").using("btree", table.tenantId.asc().nullsLast().op("enum_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("enum_ops")),
	index("user_integrations_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_integrations_watchChannelExpiration_idx").using("btree", table.watchChannelExpiration.asc().nullsLast().op("timestamp_ops")),
	index("user_integrations_watchChannelId_idx").using("btree", table.watchChannelId.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.connectedBy],
		foreignColumns: [users.id],
		name: "user_integrations_connectedBy_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_integrations_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const userIntegrationSyncLogs = pgTable("user_integration_sync_logs", {
	id: uuid().primaryKey().notNull(),
	userIntegrationId: uuid().notNull(),
	syncType: calendarSyncType().notNull(),
	direction: syncDirection().notNull(),
	status: syncStatus().notNull(),
	entityType: text(),
	entityId: uuid(),
	externalId: text(),
	itemsProcessed: integer().default(0).notNull(),
	itemsSucceeded: integer().default(0).notNull(),
	itemsFailed: integer().default(0).notNull(),
	errorMessage: text(),
	errorDetails: jsonb(),
	metadata: jsonb(),
	startedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	durationMs: integer(),
	externalEventId: text(),
}, (table) => [
	index("user_integration_sync_logs_externalEventId_idx").using("btree", table.externalEventId.asc().nullsLast().op("text_ops")),
	index("user_integration_sync_logs_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("user_integration_sync_logs_syncType_idx").using("btree", table.syncType.asc().nullsLast().op("enum_ops")),
	index("user_integration_sync_logs_userIntegrationId_startedAt_idx").using("btree", table.userIntegrationId.asc().nullsLast().op("uuid_ops"), table.startedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
		columns: [table.userIntegrationId],
		foreignColumns: [userIntegrations.id],
		name: "user_integration_sync_logs_userIntegrationId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const userExternalEvents = pgTable("user_external_events", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	userIntegrationId: uuid().notNull(),
	externalEventId: text().notNull(),
	provider: calendarIntegrationProvider().notNull(),
	summary: text().notNull(),
	description: text(),
	location: text(),
	startTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	isAllDay: boolean().default(false).notNull(),
	blocksAvailability: boolean().default(true).notNull(),
	attendees: jsonb(),
	metadata: jsonb(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("user_external_events_blocksAvailability_idx").using("btree", table.blocksAvailability.asc().nullsLast().op("bool_ops")),
	index("user_external_events_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("user_external_events_userId_endTime_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.endTime.asc().nullsLast().op("timestamp_ops")),
	index("user_external_events_userId_startTime_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.startTime.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("user_external_events_userIntegrationId_externalEventId_key").using("btree", table.userIntegrationId.asc().nullsLast().op("uuid_ops"), table.externalEventId.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.userIntegrationId],
		foreignColumns: [userIntegrations.id],
		name: "user_external_events_userIntegrationId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_external_events_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "user_external_events_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])
