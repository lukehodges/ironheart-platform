import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { services } from "./services.schema"
import { bookings } from "./booking.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const messageChannel = pgEnum("MessageChannel", ['EMAIL', 'SMS', 'PUSH'])
export const messageStatus = pgEnum("MessageStatus", ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'])
export const messageTrigger = pgEnum("MessageTrigger", ['BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER_24H', 'BOOKING_REMINDER_2H', 'BOOKING_COMPLETED', 'APPROVAL_REQUIRED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'PAYMENT_RECEIVED', 'INVOICE_SENT', 'REVIEW_REQUEST'])
export const notificationType = pgEnum("NotificationType", ['BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'BOOKING_RESCHEDULED', 'BOOKING_COMPLETED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_SENT', 'INVOICE_OVERDUE', 'SHIFT_ASSIGNED', 'SHIFT_REMINDER', 'ROUTE_UPDATED', 'SYSTEM_ALERT', 'MAINTENANCE', 'FEATURE_UPDATE', 'PROMOTION', 'REVIEW_REQUEST'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const messageTemplates = pgTable("message_templates", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	trigger: messageTrigger().notNull(),
	channel: messageChannel().notNull(),
	subject: text(),
	body: text().notNull(),
	bodyHtml: text(),
	active: boolean().default(true).notNull(),
	isSystem: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	serviceId: uuid(),
}, (table) => [
	index("message_templates_tenantId_idx").on( table.tenantId),
	uniqueIndex("message_templates_tenantId_trigger_channel_serviceId_key").on( table.tenantId, table.trigger, table.channel, table.serviceId),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "message_templates_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.serviceId],
		foreignColumns: [services.id],
		name: "message_templates_serviceId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const sentMessages = pgTable("sent_messages", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	templateId: uuid(),
	channel: messageChannel().notNull(),
	trigger: messageTrigger(),
	recipientType: text().notNull(),
	recipientId: uuid().notNull(),
	recipientEmail: text(),
	recipientPhone: text(),
	bookingId: uuid(),
	subject: text(),
	body: text().notNull(),
	status: messageStatus().default('QUEUED').notNull(),
	sentAt: timestamp({ precision: 3, mode: 'date' }),
	deliveredAt: timestamp({ precision: 3, mode: 'date' }),
	failedAt: timestamp({ precision: 3, mode: 'date' }),
	errorMessage: text(),
	providerRef: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("sent_messages_bookingId_idx").on( table.bookingId),
	index("sent_messages_tenantId_createdAt_idx").on( table.tenantId, table.createdAt),
	index("sentMessages_tenantId_bookingId_idx").on( table.tenantId, table.bookingId),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "sent_messages_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.templateId],
		foreignColumns: [messageTemplates.id],
		name: "sent_messages_templateId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.bookingId],
		foreignColumns: [bookings.id],
		name: "sent_messages_bookingId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const notifications = pgTable("notifications", {
	id: uuid().primaryKey().notNull(),
	userId: uuid().notNull(),
	type: notificationType().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	entityType: text(),
	entityId: uuid(),
	actionUrl: text(),
	read: boolean().default(false).notNull(),
	readAt: timestamp({ precision: 3, mode: 'date' }),
	dismissed: boolean().default(false).notNull(),
	channels: text().array(),
	emailSent: boolean().default(false).notNull(),
	pushSent: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("notifications_userId_createdAt_idx").on( table.userId, table.createdAt),
	index("notifications_userId_read_idx").on( table.userId, table.read),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "notifications_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const notificationPreferences = pgTable("notification_preferences", {
	userId: uuid().primaryKey().notNull(),
	emailEnabled: boolean().default(true).notNull(),
	pushEnabled: boolean().default(true).notNull(),
	smsEnabled: boolean().default(false).notNull(),
	typePreferences: jsonb(),
	quietHoursEnabled: boolean().default(false).notNull(),
	quietHoursStart: text(),
	quietHoursEnd: text(),
	quietHoursDays: integer().array(),
	digestEnabled: boolean().default(false).notNull(),
	digestFrequency: text(),
	digestTime: text(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "notification_preferences_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])
