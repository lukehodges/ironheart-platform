/**
 * Calendar Provider Interface
 *
 * Every calendar provider implementation must satisfy this contract.
 * Swapping Google → Outlook → Apple requires:
 *   1. A new class implementing CalendarProvider
 *   2. A new value in CalendarIntegrationProvider enum
 *   3. Adding the new case to provider-factory.ts
 *
 * Zero changes to calendar-sync.service.ts, calendar-sync.events.ts,
 * or any application code outside the providers/ directory.
 */

// ─── Canonical Event Type ─────────────────────────────────────────────────────

/**
 * The common denominator calendar event shape across all providers.
 * All provider implementations map their native types to/from this shape.
 */
export interface CalendarEvent {
  /** Provider-specific event ID (opaque string - NOT necessarily a UUID) */
  externalId: string
  /** Calendar ID the event belongs to */
  calendarId: string
  summary: string
  description?: string
  location?: string
  /** ISO 8601 UTC datetime string */
  startTime: string
  /** ISO 8601 UTC datetime string */
  endTime: string
  isAllDay: boolean
  /** Attendee email addresses */
  attendees?: string[]
  /** Raw provider-specific payload for debugging / round-tripping */
  raw?: Record<string, unknown>
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateEventInput {
  calendarId: string
  summary: string
  description?: string
  location?: string
  /** ISO 8601 UTC datetime string */
  startTime: string
  /** ISO 8601 UTC datetime string */
  endTime: string
  attendees?: string[]
  /**
   * Optional idempotency key.
   * Providers that support it (e.g. Google via requestId) use this to prevent
   * duplicate event creation on retries.
   */
  idempotencyKey?: string
}

export interface UpdateEventInput {
  calendarId: string
  /** Provider-specific event ID */
  externalId: string
  summary?: string
  description?: string
  location?: string
  /** ISO 8601 UTC datetime string */
  startTime?: string
  /** ISO 8601 UTC datetime string */
  endTime?: string
}

export interface ListEventsOptions {
  /** ISO 8601 UTC datetime string - lower bound (inclusive) */
  timeMin: string
  /** ISO 8601 UTC datetime string - upper bound (exclusive) */
  timeMax: string
  /** Pagination token from a previous listEvents call */
  pageToken?: string
  /** Max events to return (provider may have its own cap) */
  maxResults?: number
}

// ─── OAuth Types ──────────────────────────────────────────────────────────────

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  /** Unix timestamp in milliseconds when the access token expires */
  expiresAt: number
}

// ─── Webhook Types ────────────────────────────────────────────────────────────

export interface WatchChannelResult {
  /** Provider-assigned channel ID */
  channelId: string
  /** Secret token stored in DB and sent back by provider on each notification */
  channelToken: string
  /** Provider resource ID (needed to stop the watch) */
  resourceId: string
  /** ISO 8601 UTC - when this watch channel expires */
  expiresAt: string
}

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface CalendarProvider {
  /** Human-readable provider name for logging and error messages */
  readonly providerName: string

  // ─── Event CRUD ─────────────────────────────────────────────────────────

  /**
   * Create a calendar event.
   * Returns the created event with the provider-assigned externalId.
   */
  createEvent(tokens: OAuthTokens, input: CreateEventInput): Promise<CalendarEvent>

  /**
   * Update an existing calendar event (patch - only provided fields are changed).
   */
  updateEvent(tokens: OAuthTokens, input: UpdateEventInput): Promise<CalendarEvent>

  /**
   * Delete a calendar event by its provider-specific ID.
   */
  deleteEvent(tokens: OAuthTokens, calendarId: string, externalId: string): Promise<void>

  /**
   * List calendar events in a time range with optional pagination.
   */
  listEvents(
    tokens: OAuthTokens,
    calendarId: string,
    options: ListEventsOptions
  ): Promise<{ events: CalendarEvent[]; nextPageToken?: string }>

  // ─── OAuth ──────────────────────────────────────────────────────────────

  /**
   * Exchange an authorization code for access + refresh tokens.
   * Called once at the end of the OAuth flow.
   */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>

  /**
   * Refresh an expired access token using the stored refresh token.
   * Returns new tokens including potentially a rotated refresh token.
   */
  refreshToken(refreshToken: string): Promise<OAuthTokens>

  /**
   * Generate the OAuth authorization URL to redirect the user to.
   * The state parameter is a random UUID stored in the DB for CSRF protection.
   */
  getAuthUrl(state: string, redirectUri: string): string

  // ─── Webhooks ────────────────────────────────────────────────────────────

  /**
   * Register a push notification channel so the provider calls our webhook
   * whenever the calendar changes.
   * Returns null for providers that don't support push notifications (e.g. Apple).
   */
  watchCalendar(
    tokens: OAuthTokens,
    calendarId: string,
    webhookUrl: string
  ): Promise<WatchChannelResult | null>

  /**
   * Stop / delete a push notification channel.
   * Should be called when disconnecting an integration or renewing an expiring channel.
   */
  stopWatch(tokens: OAuthTokens, channelId: string, resourceId: string): Promise<void>

  /**
   * Validate an incoming webhook notification from the provider.
   * Returns the calendarId if the notification is valid, or null to reject it.
   * The webhook route calls this before emitting any Inngest events.
   */
  validateWebhookRequest(
    request: Request,
    storedChannelToken: string
  ): Promise<string | null>
}
