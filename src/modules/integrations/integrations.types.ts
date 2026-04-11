/**
 * Integration Hub — Core Types
 *
 * IntegrationProvider is the contract every integration implements.
 * DomainEvent is what feature modules emit; providers declare which they handle.
 * Zero Google-Calendar-specific types here — this file is provider-agnostic.
 */

// ─── Domain Events ─────────────────────────────────────────────────────────────

export type BookingConfirmedEvent = {
  type: 'booking.confirmed'
  data: { bookingId: string; tenantId: string }
}

export type BookingCancelledEvent = {
  type: 'booking.cancelled'
  data: { bookingId: string; tenantId: string; reason?: string }
}

export type DomainEvent = BookingConfirmedEvent | BookingCancelledEvent

export type DomainEventType = DomainEvent['type']

// ─── Integration Context ───────────────────────────────────────────────────────

/**
 * Passed to every provider method. Contains the resolved user/tenant context
 * and any credentials or settings the hub has already loaded.
 */
export interface IntegrationContext {
  tenantId: string
  userId: string
  /** The user_integrations row ID for this user+provider combo */
  userIntegrationId: string
}

// ─── Integration Result ────────────────────────────────────────────────────────

export interface IntegrationResult {
  success: boolean
  /** External system's ID for the created/updated resource (e.g. calendar event ID) */
  externalId?: string
  error?: string
}

// ─── Webhook Payload ──────────────────────────────────────────────────────────

export interface WebhookPayload {
  /** Raw request headers as a plain object */
  headers: Record<string, string>
  /** Raw request body (already parsed from JSON by Next.js if content-type is JSON) */
  body: unknown
}

// ─── Integration Provider Interface ───────────────────────────────────────────

/**
 * Every integration implements this contract.
 * The hub only ever calls these methods — it never reaches into provider internals.
 *
 * To add a new integration:
 *   1. Create `providers/{slug}.provider.ts` implementing this interface
 *   2. Add it to `integrations.registry.ts`
 *   Zero other changes needed.
 */
export interface IntegrationProvider {
  /** Kebab-case unique identifier: 'google-calendar', 'xero', 'hubspot' */
  readonly slug: string
  /** Human-readable name for UI display */
  readonly name: string
  /**
   * Declare which domain events this provider handles.
   * The hub skips providers that don't declare an event type.
   */
  readonly handles: DomainEventType[]

  /**
   * Process a domain event. Called by the hub for each connected user
   * that has this provider enabled.
   * MUST NOT throw — return { success: false, error } instead.
   */
  onEvent(event: DomainEvent, ctx: IntegrationContext): Promise<IntegrationResult>

  /**
   * Handle an inbound webhook from the external system.
   * Called after the webhook route has responded 200.
   * MUST NOT throw.
   */
  onWebhook(payload: WebhookPayload, ctx: IntegrationContext): Promise<void>

  /**
   * Return the OAuth URL to redirect the user to.
   *
   * The SERVICE (integrationsService.initiateOAuth) is responsible for
   * generating the CSRF state UUID and persisting it before calling this
   * method. Providers only receive the already-generated state to embed in
   * their OAuth redirect URL. Providers MUST NOT generate their own state.
   *
   * Providers that require async setup before building the URL (e.g. PKCE
   * verifier storage for Google Calendar) should document that
   * integrationsService.initiateOAuth handles them via a dedicated fast-path
   * and this method may return '' as a stub in that case.
   *
   * @param state - CSRF state UUID generated and persisted by the service
   * @param redirectUri - The OAuth callback URL
   */
  getOAuthUrl(state: string, redirectUri: string): string

  /**
   * Exchange an authorization code for credentials and persist them.
   * Called at the end of the OAuth callback flow.
   */
  exchangeCode(
    code: string,
    userId: string,
    tenantId: string,
    redirectUri: string
  ): Promise<void>

  /**
   * Disconnect this integration for a user — revoke tokens, stop webhooks.
   */
  disconnect(userId: string, tenantId: string): Promise<void>
}
