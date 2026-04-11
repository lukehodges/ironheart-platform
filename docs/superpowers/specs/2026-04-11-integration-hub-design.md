# Integration Hub — Design Spec

**Date:** 2026-04-11
**Status:** Approved
**First vertical:** Google Calendar

---

## Overview

A centralised integration hub that handles all external service connections for Ironheart, regardless of vertical or tenant. Every integration — now and in the future — implements a single `IntegrationProvider` interface. The hub manages credential storage, OAuth flows, event routing, webhook delivery, and retry logic. Feature modules are completely unaware of which integrations are connected; they emit domain events and the hub handles the rest.

This design is intentionally built for 10-year sustainability: adding a new integration in year 4 means creating one provider file that implements a known interface.

---

## Scope

### In scope
- `integrations` module with full hub logic and provider registry
- `IntegrationProvider` interface and `DomainEvent` type catalogue
- Google Calendar provider — full implementation (first vertical)
- Three-level credential hierarchy (platform / tenant / user)
- Inbound webhook routing via `/api/integrations/webhooks/[provider]`
- Outbound event routing via Inngest
- Watch channel management for Google Calendar push notifications
- Inngest scheduled function for watch channel renewal (replaces old Vercel cron)
- Integration sync audit log
- Test coverage for hub routing logic and Google Calendar provider

### Out of scope (deliberate)
- Tenant-facing integration management UI (tables support it; UI is a separate phase)
- Additional providers (Xero, HubSpot, Stripe, etc.) — pattern established, implemented on demand
- Rule engine / mini-Zapier configurable mapping (natural evolution of this design, not needed now)

---

## Architecture

### Data flow — outbound (Ironheart → Google Calendar)

```
scheduling module
  → emits booking.confirmed (Inngest event)
    → integrations hub Inngest function catches it
      → checks tenant_modules: is google-calendar enabled for this tenant?
      → loads all staff assigned to the booking
      → for each staff member with Google Calendar connected:
          → google-calendar.provider.onEvent(event, ctx)
            → decrypt tokens, refresh if expired
            → call Google Calendar API
            → write result to integration_sync_logs
```

### Data flow — inbound (Google Calendar → Ironheart)

```
Google push notification
  → POST /api/integrations/webhooks/google-calendar
    → validate X-Goog-Channel-Token header
    → respond 200 immediately
    → emit calendar/webhook.received Inngest event (async)
      → integrations hub routes to google-calendar.provider.onWebhook()
        → fetch changed events from Google
        → upsert into user_external_events
          → scheduling module reads these as availability blocks
```

### The IntegrationProvider interface

Every integration implements this contract. Nothing more, nothing less.

```typescript
interface IntegrationProvider {
  slug: string                    // 'google-calendar' | 'xero' | 'hubspot' | ...
  name: string                    // Display name for UI
  handles: DomainEvent[]          // Declare which events this provider cares about

  onEvent(event: DomainEvent, ctx: IntegrationContext): Promise<IntegrationResult>
  onWebhook(payload: WebhookPayload, ctx: IntegrationContext): Promise<void>
  getOAuthUrl(ctx: IntegrationContext): string
  exchangeCode(code: string, ctx: IntegrationContext): Promise<Credentials>
  refreshCredentials(creds: Credentials): Promise<Credentials>
}
```

Adding Xero in year 4: create `xero.provider.ts`, implement this interface, register it. Zero changes to existing modules.

---

## Module Structure

All new files. No schema changes required — every table already exists.

```
src/modules/integrations/
  integrations.types.ts          # IntegrationProvider interface, DomainEvent union,
                                 #   Credentials, IntegrationContext, IntegrationResult
  integrations.schemas.ts        # Zod: connect input, disconnect input, list output
  integrations.repository.ts     # Drizzle queries for user_integrations + integrations tables
                                 #   AES-256-GCM encrypt/decrypt for credentials
  integrations.service.ts        # Hub logic: routeEvent(), handleWebhook(),
                                 #   initiateOAuth(), completeOAuth(), disconnect()
  integrations.router.ts         # tRPC: initiateOAuth, completeOAuth, disconnect,
                                 #   listConnected, getStatus
  integrations.events.ts         # Inngest: onDomainEvent function,
                                 #   renewWatchChannels scheduled function
  integrations.registry.ts       # Provider registry — import all providers here
  providers/
    google-calendar.provider.ts  # First vertical, full implementation
  index.ts                       # Barrel export
  __tests__/
    integrations.test.ts
    google-calendar.provider.test.ts

src/app/api/integrations/webhooks/
  [provider]/route.ts            # Dynamic route — single handler for all providers
                                 #   validates, responds 200, fires Inngest event
```

### Domain events (the contract between feature modules and the hub)

Feature modules emit these. Providers declare which subset they handle.

| Event | Emitted by | Google Calendar handles |
|-------|-----------|------------------------|
| `booking.confirmed` | scheduling.service | ✓ creates calendar event |
| `booking.cancelled` | scheduling.service | ✓ deletes calendar event |
| `booking.rescheduled` | scheduling.service | ✓ updates calendar event |
| `booking.completed` | scheduling.service | ✓ no-op (event stays as-is) |
| `invoice.finalised` | payment.service | — (Xero future) |
| `payment.received` | payment.service | — (Xero future) |
| `customer.created` | customer.service | — (HubSpot future) |
| `review.submitted` | review.service | — (future) |

---

## Credential Management

### Three-level hierarchy

**Level 1 — Platform (env vars, never in DB)**
- Luke's Google Cloud OAuth app credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `INTEGRATION_ENCRYPTION_KEY_V1` (32 bytes hex, AES-256-GCM)

**Level 2 — Tenant (DB, scoped by tenantId)**
- Which integrations are enabled: `tenant_modules` table (moduleId FK + isEnabled)
- Default sync preferences: `integrations` table (config JSONB)

**Level 3 — User (DB, AES-256-GCM encrypted)**
- Each staff member's OAuth tokens: `user_integrations` table
- Fields: `encryptedAccessToken`, `encryptedRefreshToken`, `tokenExpiresAt`
- Watch channel: `watchChannelId`, `watchChannelToken`, `watchChannelExpiration`

Encryption: AES-256-GCM with random 12-byte IV per encryption. Format: `base64(iv):base64(ciphertext):base64(authTag)`. Versioned key support (V1, V2, ...) for future rotation without re-encryption.

---

## Google Calendar Provider — Specifics

### onEvent() — outbound sync

For each event type, per staff member assigned to the booking who has Google Calendar connected:

1. Load staff assignments for the booking
2. Filter to users with `user_integrations.provider = 'google-calendar'` and `status = CONNECTED`
3. Decrypt tokens; call `refreshCredentials()` if `tokenExpiresAt` is within 5 minutes
4. Dispatch to Google Calendar API:
   - `booking.confirmed` → `calendar.events.insert()`
   - `booking.rescheduled` → `calendar.events.patch()` (update start/end)
   - `booking.cancelled` → `calendar.events.delete()`
   - `booking.completed` → no-op (event stays, title unchanged)
5. Write result to `integration_sync_logs` (provider, direction: PUSH, status, entityId, durationMs, error)

### onWebhook() — inbound sync

1. Validate `X-Goog-Channel-Token` header against `user_integrations.watchChannelToken`
2. Look up user by `watchChannelId` — if not found, return silently (never expose 404)
3. Fetch changed events from Google since last sync (`syncToken` stored in integration config)
4. Upsert into `user_external_events` (externalId, title, start, end, isAllDay, sourceCalendar)
5. Scheduling module reads `user_external_events` as availability blocks (already implemented)
6. Write to `integration_sync_logs` (direction: PULL)

**Critical**: The webhook route responds 200 immediately. All processing happens via Inngest to avoid Google's 30-second push timeout.

### getOAuthUrl() + exchangeCode()

1. Generate PKCE code verifier + SHA-256 challenge (RFC 7636)
2. Store state + code verifier in `oauthStates` table (10-minute TTL)
3. Build Google OAuth URL with `calendar.events` scope + `offline` access (for refresh token)
4. On callback: validate state, exchange code for tokens, encrypt and save to `user_integrations`
5. Auto-create watch channel immediately after token save

### Watch channel management

- Created automatically on first successful OAuth connect
- Google channels expire after 7 days maximum
- Inngest scheduled function (`renewWatchChannels`) runs daily: renews any channel expiring within 24 hours
- Channel token is a random UUID per user — stored in `user_integrations.watchChannelToken`
- On disconnect: stop watch channel via Google API, null out channel fields, delete tokens

---

## Error Handling

### Integration failures never block core operations

Booking confirmation succeeds regardless of Google Calendar sync status. Integrations are side effects — they cannot fail the primary operation.

- Inngest retries failed sync jobs automatically with exponential backoff
- Max 3 retries, then status set to FAILED in `integration_sync_logs`
- `integrations.lastSyncError` captures the most recent failure message per tenant integration
- Tenant admin can surface failed syncs (future UI reads `integration_sync_logs`)

### Token errors

- Expired access token → call `refreshCredentials()` before API call
- Refresh token revoked (user disconnected from Google) → mark `user_integrations.status = DISCONNECTED`, emit in-app notification to staff member to reconnect
- Never silently swallow token errors — always log to `integration_sync_logs`

### Webhook validation failures

- Invalid channel token → respond 200, drop silently (prevents enumeration attacks)
- Unknown channel ID → same
- Unexpected errors → Sentry capture, 200 response (Google must not retry)

---

## Testing Strategy

### integrations.test.ts — hub routing logic
- Routes event only to providers that declare they handle it
- Skips provider when tenant module is disabled
- Skips provider when no users have it connected
- Provider failure does not throw — writes FAILED log, continues
- `initiateOAuth()` returns valid URL and stores state
- `completeOAuth()` stores encrypted credentials and creates watch channel
- `disconnect()` removes tokens and stops watch channel

### google-calendar.provider.test.ts — provider behaviour
- `booking.confirmed` creates Google event with correct title, start, end, attendees
- `booking.cancelled` deletes the Google event by stored externalEventId
- `booking.rescheduled` patches start and end time only
- Expired token triggers `refreshCredentials()` before API call
- Revoked refresh token marks integration DISCONNECTED
- `onWebhook()` validates channel token, drops unknown channels silently
- `onWebhook()` upserts `user_external_events` correctly from Google event data

Google Calendar API is mocked via `vi.mock` — no real API calls in CI.

---

## Migration from Old Ironheart

The old `../ironheart/` codebase has Google Calendar wired directly into the scheduling module as a one-off. Key differences in the new architecture:

| Old ironheart | New architecture |
|---------------|-----------------|
| Calendar logic embedded in scheduling router | Isolated in `google-calendar.provider.ts` |
| Vercel cron jobs for token refresh + channel renewal | Inngest scheduled functions |
| Sync queue stored in Prisma table | Inngest retries natively |
| OAuth state in `oAuthState` table | Same — already exists in new schema |
| AES-256-GCM token encryption | Same pattern, same key format |
| Watch channels renewed via cron | Inngest scheduled function |

The `user_integrations` table in the new schema is a superset of the old. No data migration needed for new tenants — existing old-system tenants would need a one-time OAuth re-connect (tokens are encrypted with different keys).

---

## Post-Implementation Documentation

After implementation is complete, the following docs must be written to `docs/`:

**`docs/integrations.md`** — Developer reference covering:
- How the Integration Hub works (architecture overview, data flows)
- The `IntegrationProvider` interface — every method explained with examples
- How to add a new integration (step-by-step: create provider file, implement interface, register)
- The three-level credential hierarchy and how encryption works
- Domain event catalogue — what each event contains and when it fires
- Webhook routing — how inbound webhooks are validated and processed
- Error handling contract — why integrations must never fail core operations
- Testing a new provider — what to mock, what cases to cover

**`docs/integrations-future.md`** — Evolution roadmap covering:
- How to evolve towards a rule engine (mini-Zapier) on top of the provider registry
- Suggested next providers to implement and why (Xero, HubSpot, Slack, Stripe Connect)
- How to build a tenant-facing integration management UI using existing tables
- How to add a provider marketplace (tenants install integrations from a catalogue)
- How to support tenant-supplied API keys (bring-your-own credentials at Level 2)

These docs are **part of the implementation** — the phase is not complete until they exist.

---

## Future Evolution

This design supports two natural evolution paths without architectural changes:

**1. More providers** — Each new integration is one new file in `providers/`. The hub, registry, credential vault, and webhook router need no changes.

**2. Rule engine (mini-Zapier)** — Once the provider registry is solid, a UI layer can be added where tenants configure which events map to which provider actions, with field mapping. This becomes a configuration layer on top of the existing provider interface — not a replacement.
