/**
 * Calendar-Sync Module — Type Definitions
 *
 * All types kept in one file to avoid circular dependencies.
 * Provider-specific types live in their respective provider files.
 */

// ─── Provider Enum ─────────────────────────────────────────────────────────────

/** Mirrors the CalendarIntegrationProvider DB enum */
export type CalendarIntegrationProvider =
  | 'GOOGLE_CALENDAR'
  | 'OUTLOOK_CALENDAR'
  | 'APPLE_CALENDAR'

// ─── Integration Status ────────────────────────────────────────────────────────

export type IntegrationStatus =
  | 'PENDING'
  | 'CONNECTED'
  | 'EXPIRED'
  | 'DISCONNECTED'
  | 'ERROR'

// ─── User Integration Record (DB row) ─────────────────────────────────────────

export interface UserIntegrationRecord {
  id: string
  userId: string
  tenantId: string
  provider: CalendarIntegrationProvider
  providerAccountId: string | null
  encryptedAccessToken: string | null
  encryptedRefreshToken: string | null
  tokenExpiresAt: Date | null
  scopes: string[]
  status: IntegrationStatus
  calendarId: string | null         // Primary calendar ID (e.g. "primary" for Google)
  watchChannelId: string | null     // Active push notification channel ID
  watchChannelToken: string | null  // Secret token to validate webhook notifications
  watchChannelExpiration: Date | null
  resourceId: string | null         // Provider resource ID for the watch channel
  syncToken: string | null          // Incremental sync token (Google: nextSyncToken)
  lastSyncedAt: Date | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

// ─── External Event Record (DB row) ────────────────────────────────────────────

export interface UserExternalEventRecord {
  id: string
  userIntegrationId: string
  externalEventId: string           // Provider-specific event ID (opaque string)
  bookingId: string | null          // Ironheart booking this maps to (null = external-only)
  summary: string | null
  startTime: Date | null
  endTime: Date | null
  isAllDay: boolean
  rawData: Record<string, unknown> | null
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ─── OAuth State ───────────────────────────────────────────────────────────────

export interface OAuthStateRecord {
  state: string             // Random UUID stored in DB and passed through OAuth flow
  userId: string
  tenantId: string
  provider: CalendarIntegrationProvider
  redirectUrl: string
  expiresAt: Date
  createdAt: Date
}

// ─── Sync Result ───────────────────────────────────────────────────────────────

export interface SyncResult {
  eventsCreated: number
  eventsUpdated: number
  eventsDeleted: number
  nextSyncToken?: string
  errors: string[]
}

// ─── Calendar Push Result ──────────────────────────────────────────────────────

export interface CalendarPushResult {
  externalEventId: string
  calendarId: string
  provider: CalendarIntegrationProvider
}

// ─── Watch Channel Renewal ─────────────────────────────────────────────────────

export interface WatchChannelRenewalResult {
  userIntegrationId: string
  channelId: string
  expiresAt: string   // ISO 8601
  renewed: boolean
  error?: string
}

// ─── Token Refresh Result ──────────────────────────────────────────────────────

export interface TokenRefreshResult {
  userIntegrationId: string
  refreshed: boolean
  expiresAt?: Date
  error?: string
}

// ─── Webhook Notification ──────────────────────────────────────────────────────

export interface WebhookNotification {
  channelId: string
  resourceId: string
  provider: CalendarIntegrationProvider
}

// ─── Disconnect Result ─────────────────────────────────────────────────────────

export interface DisconnectResult {
  userId: string
  provider: CalendarIntegrationProvider
  watchChannelStopped: boolean
}
