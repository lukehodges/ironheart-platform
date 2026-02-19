import { z } from 'zod'

// ─── Provider + Status Enums ──────────────────────────────────────────────────

export const calendarProviderSchema = z.enum([
  'GOOGLE_CALENDAR',
  'OUTLOOK_CALENDAR',
  'APPLE_CALENDAR',
])

export const integrationStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'ERROR',
])

// ─── OAuth Schemas ────────────────────────────────────────────────────────────

/** Input for initiating the OAuth flow */
export const initiateOAuthSchema = z.object({
  provider: calendarProviderSchema,
  redirectUrl: z.string().url(),
  tenantId: z.string(),
})

/** Input for completing the OAuth callback */
export const completeOAuthSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

// ─── Sync Schemas ──────────────────────────────────────────────────────────────

/** Trigger a manual push of a booking to calendar */
export const pushBookingSchema = z.object({
  bookingId: z.string(),
  userId: z.string(),
  tenantId: z.string(),
})

/** Trigger a manual pull of external events */
export const pullEventsSchema = z.object({
  userIntegrationId: z.string(),
  tenantId: z.string(),
  fullSync: z.boolean().default(false),
})

// ─── Integration Management ────────────────────────────────────────────────────

/** Get the current user's integration status */
export const getIntegrationSchema = z.object({
  tenantId: z.string(),
  provider: calendarProviderSchema.optional(),
})

/** Disconnect a calendar integration */
export const disconnectIntegrationSchema = z.object({
  tenantId: z.string(),
  provider: calendarProviderSchema,
})

/** List external events for the current user */
export const listExternalEventsSchema = z.object({
  tenantId: z.string(),
  startDate: z.string().datetime(),   // ISO 8601
  endDate: z.string().datetime(),
  includeBookingEvents: z.boolean().default(false),
})

// ─── Webhook Schemas ──────────────────────────────────────────────────────────

/** Inngest event payload for calendar/webhook.received */
export const webhookReceivedSchema = z.object({
  channelId: z.string(),
  resourceId: z.string(),
})

/** Inngest event payload for calendar/sync.push */
export const calendarSyncPushSchema = z.object({
  bookingId: z.string(),
  userId: z.string(),
  tenantId: z.string(),
})

/** Inngest event payload for calendar/sync.pull */
export const calendarSyncPullSchema = z.object({
  userIntegrationId: z.string(),
  tenantId: z.string(),
})
