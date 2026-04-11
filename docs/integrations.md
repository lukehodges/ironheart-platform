# Integration Hub — Developer Reference

## Overview

The Integration Hub is the central system that connects Ironheart to external services.
It lives in `src/modules/integrations/` and is designed so that adding a new integration
requires creating exactly one new file.

---

## Architecture

### How it works

Feature modules (booking, payment, etc.) emit Inngest events as they always have.
The integrations hub has Inngest functions that listen to those events and route them
to whichever providers are connected for the relevant users.

```
booking/confirmed (Inngest event)
  → integrations.events.ts: onBookingConfirmed
    → integrationsService.routeEvent()
      → integrationsRepository.findConnectedUsersForBooking()
      → for each connected user:
          → getProvider(slug)
          → provider.onEvent(event, ctx)
```

### The IntegrationProvider interface

Every integration implements 5 methods:

| Method | When called | What it does |
|--------|-------------|--------------|
| `onEvent(event, ctx)` | Domain event fired (booking confirmed, etc.) | Syncs data to external system |
| `onWebhook(payload, ctx)` | External system pushes a notification | Syncs data into Ironheart |
| `getOAuthUrl(state, redirectUri)` | User starts OAuth flow | Returns redirect URL |
| `exchangeCode(code, userId, tenantId, redirectUri)` | OAuth callback | Exchanges code, stores tokens |
| `disconnect(userId, tenantId)` | User disconnects integration | Revokes tokens, stops webhooks |

The interface also has three readonly properties: `slug`, `name`, `handles`.

### Adding a new integration

1. Create `src/modules/integrations/providers/{slug}.provider.ts`
2. Implement `IntegrationProvider` — all 5 methods + 3 properties
3. Import and add to `PROVIDERS` map in `integrations.registry.ts`

That's it. Zero other files change.

```typescript
// src/modules/integrations/providers/xero.provider.ts
import type { IntegrationProvider } from '../integrations.types'

export const xeroProvider: IntegrationProvider = {
  slug: 'xero',
  name: 'Xero',
  handles: ['invoice.finalised', 'payment.received'],
  // ... implement all methods
}
```

```typescript
// integrations.registry.ts — only change needed
import { xeroProvider } from './providers/xero.provider'

const PROVIDERS: Record<string, IntegrationProvider> = {
  [googleCalendarProvider.slug]: googleCalendarProvider,
  [xeroProvider.slug]: xeroProvider,   // ← add this line
}
```

---

## The Three-Level Credential Hierarchy

### Level 1 — Platform (env vars, never in DB)

Luke's OAuth app credentials and the encryption key.

| Env var | Purpose |
|---------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret |
| `GOOGLE_REDIRECT_URI` | Callback URL registered with Google |
| `INTEGRATION_ENCRYPTION_KEY_V1` | 32-byte hex key for AES-256-GCM token encryption |

### Level 2 — Tenant (DB, scoped by tenantId)

Which integrations a tenant has enabled. Stored in `tenant_modules` (join table of `tenants` and `modules`).

### Level 3 — User (DB, AES-256-GCM encrypted)

Each staff member's OAuth tokens. Stored in `user_integrations`:

| Column | Description |
|--------|-------------|
| `encryptedAccessToken` | AES-256-GCM encrypted access token |
| `encryptedRefreshToken` | AES-256-GCM encrypted refresh token |
| `tokenExpiresAt` | When the access token expires |
| `watchChannelId` | Google push notification channel ID |
| `watchChannelToken` | Random UUID — validates inbound webhooks |
| `watchChannelExpiration` | When the watch channel expires (Google max 7 days) |

Encryption format: `base64(iv):base64(ciphertext):base64(authTag)` — implemented in `calendar-sync/providers/google/google.auth.ts`.

---

## Domain Event Catalogue

Feature modules emit these Inngest events. Providers declare which subset they handle via the `handles` array.

| Event | Inngest name | Emitted by | Google Calendar |
|-------|-------------|-----------|----------------|
| `booking.confirmed` | `booking/confirmed` | scheduling.service | ✓ creates event |
| `booking.cancelled` | `booking/cancelled` | scheduling.service | ✓ deletes event |
| `booking.rescheduled` | *(future)* | scheduling.service | ✓ patches event |
| `invoice.finalised` | *(future)* | payment.service | — (Xero future) |
| `payment.received` | *(future)* | payment.service | — (Xero future) |
| `customer.created` | *(future)* | customer.service | — (HubSpot future) |

---

## Webhook Routing

### How inbound webhooks work

```
External system pushes: POST /api/integrations/webhooks/google-calendar
  → route.ts: captures headers + body, fires integration/webhook.received Inngest event, returns 200
    → onIntegrationWebhook Inngest function
      → integrationsService.handleWebhook('google-calendar', payload)
        → getProvider('google-calendar')
        → provider.onWebhook(payload, ctx)
```

### Critical rules

- **Always respond 200 immediately.** External providers (especially Google) retry on non-200. All processing happens async via Inngest.
- **Never expose 404 for unknown channels.** Silently drop unknown channels — prevents enumeration attacks.
- **Webhook URL pattern:** `/api/integrations/webhooks/{provider-slug}`

---

## Error Handling Contract

### Integrations must never fail core operations

A booking confirmation succeeds regardless of whether the Google Calendar sync works. Integrations are side effects.

- `onEvent()` must catch all errors and return `{ success: false, error }` — never throw
- `onWebhook()` must catch all errors — never throw
- The hub wraps all provider calls in `try/catch` as a safety net
- Inngest retries failed jobs automatically (3 retries with backoff for `onBookingConfirmed`, 2 for webhooks)
- Failed syncs are logged to `user_integration_sync_logs`

### Token error handling

- Expired access token → `calendarSyncService` auto-refreshes before API call
- Refresh token revoked → integration marked `DISCONNECTED`, staff must reconnect
- Token errors are always logged to `user_integration_sync_logs` — never silently swallowed

---

## Testing a New Provider

Mock the external API client, not the provider methods. Test:

1. Correct method called with correct arguments for each domain event type
2. `success: false` returned (not thrown) when API call fails
3. `onWebhook()` does not throw when underlying service throws
4. OAuth flow delegates to correct underlying service
5. `disconnect()` calls revoke/cleanup in the right order

See `src/modules/integrations/__tests__/google-calendar.provider.test.ts` as the reference implementation.
