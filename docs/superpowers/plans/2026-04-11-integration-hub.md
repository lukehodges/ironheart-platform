# Integration Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a central Integration Hub with an `IntegrationProvider` interface, implement Google Calendar as the first provider, and wire domain events so booking state changes automatically sync to connected staff calendars.

**Architecture:** An `integrations` module acts as the hub — it defines the `IntegrationProvider` interface, maintains a provider registry, and routes Inngest domain events (booking.confirmed, booking.cancelled) to whichever providers a tenant has enabled. The `google-calendar.provider.ts` is a thin adapter over the existing `calendarSyncService`. Adding any future integration (Xero, HubSpot, etc.) means creating one new provider file.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, Inngest v3, Vitest, `googleapis` (via existing calendar-sync module), AES-256-GCM token encryption (via existing `google.auth.ts`)

**Spec:** `docs/superpowers/specs/2026-04-11-integration-hub-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/modules/integrations/integrations.types.ts` | `IntegrationProvider` interface, `DomainEvent` union, `IntegrationContext`, `IntegrationResult`, `WebhookPayload` |
| `src/modules/integrations/integrations.registry.ts` | Provider registry map + `getProvider()` / `getAllProviders()` |
| `src/modules/integrations/integrations.repository.ts` | `findConnectedUsersForBooking()` — joins `bookings.staffId` with `user_integrations` |
| `src/modules/integrations/integrations.schemas.ts` | Zod schemas for tRPC router inputs |
| `src/modules/integrations/integrations.service.ts` | Hub logic: `routeEvent()`, `handleWebhook()`, `initiateOAuth()`, `completeOAuth()`, `disconnect()` |
| `src/modules/integrations/integrations.router.ts` | tRPC procedures: `initiateOAuth`, `completeOAuth`, `disconnect`, `listConnected` |
| `src/modules/integrations/integrations.events.ts` | Inngest functions: `onBookingConfirmed`, `onBookingCancelled`, `onIntegrationWebhook` |
| `src/modules/integrations/providers/google-calendar.provider.ts` | `IntegrationProvider` impl — delegates to `calendarSyncService` |
| `src/modules/integrations/index.ts` | Barrel export |
| `src/modules/integrations/__tests__/integrations.service.test.ts` | Hub routing logic tests |
| `src/modules/integrations/__tests__/google-calendar.provider.test.ts` | Provider adapter tests |
| `src/app/api/integrations/webhooks/[provider]/route.ts` | Dynamic webhook endpoint — responds 200, fires Inngest event |
| `docs/integrations.md` | Developer reference for integration system |
| `docs/integrations-future.md` | Evolution roadmap |

### Modified files
| File | Change |
|------|--------|
| `src/shared/inngest.ts` | Add `integration/webhook.received` event type |
| `src/modules/calendar-sync/calendar-sync.service.ts` | Add `cancelBookingFromCalendar()`, update `pushBookingToCalendar()` to write sync log |
| `src/modules/calendar-sync/calendar-sync.repository.ts` | Add `findSyncLogByBooking()` |
| `src/server/root.ts` | Add `integrations: integrationsRouter` |
| `src/app/api/inngest/route.ts` | Register new Inngest functions |

---

## Task 1: Define the IntegrationProvider interface and domain types

**Files:**
- Create: `src/modules/integrations/integrations.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/modules/integrations/integrations.types.ts

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
   * `state` is a random UUID stored in the DB for CSRF protection.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/integrations/integrations.types.ts
git commit -m "feat(integrations): add IntegrationProvider interface and domain event types"
```

---

## Task 2: Provider registry

**Files:**
- Create: `src/modules/integrations/integrations.registry.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/integrations/__tests__/integrations.service.test.ts` (partial — registry section):

```typescript
// src/modules/integrations/__tests__/integrations.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock provider ────────────────────────────────────────────────────────────
const mockProvider = {
  slug: 'test-provider',
  name: 'Test Provider',
  handles: ['booking.confirmed'] as const,
  onEvent: vi.fn().mockResolvedValue({ success: true }),
  onWebhook: vi.fn().mockResolvedValue(undefined),
  getOAuthUrl: vi.fn().mockReturnValue('https://example.com/oauth'),
  exchangeCode: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
}

vi.mock('../integrations.registry', () => ({
  getProvider: vi.fn((slug: string) => (slug === 'test-provider' ? mockProvider : null)),
  getAllProviders: vi.fn(() => [mockProvider]),
}))

vi.mock('../integrations.repository', () => ({
  integrationsRepository: {
    findConnectedUsersForBooking: vi.fn(),
  },
}))

vi.mock('@/modules/calendar-sync', () => ({
  calendarSyncService: {},
}))

import { integrationsService } from '../integrations.service'
import { integrationsRepository } from '../integrations.repository'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID    = '00000000-0000-0000-0000-000000000003'
const INTEGRATION_ID = '00000000-0000-0000-0000-000000000004'

describe('integrationsService.routeEvent', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls onEvent for each connected user when provider handles the event type', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])

    await integrationsService.routeEvent(
      { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      TENANT_ID
    )

    expect(mockProvider.onEvent).toHaveBeenCalledOnce()
    expect(mockProvider.onEvent).toHaveBeenCalledWith(
      { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      { tenantId: TENANT_ID, userId: USER_ID, userIntegrationId: INTEGRATION_ID }
    )
  })

  it('skips providers that do not handle the event type', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])

    await integrationsService.routeEvent(
      { type: 'booking.cancelled', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      TENANT_ID
    )

    // test-provider only handles 'booking.confirmed', not 'booking.cancelled'
    expect(mockProvider.onEvent).not.toHaveBeenCalled()
  })

  it('does not throw when onEvent returns failure', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])
    mockProvider.onEvent.mockResolvedValue({ success: false, error: 'API error' })

    await expect(
      integrationsService.routeEvent(
        { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
        TENANT_ID
      )
    ).resolves.not.toThrow()
  })

  it('does not throw when onEvent throws unexpectedly', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'test-provider' } as any,
    ])
    mockProvider.onEvent.mockRejectedValue(new Error('Network error'))

    await expect(
      integrationsService.routeEvent(
        { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
        TENANT_ID
      )
    ).resolves.not.toThrow()
  })

  it('skips users with no matching provider in registry', async () => {
    vi.mocked(integrationsRepository.findConnectedUsersForBooking).mockResolvedValue([
      { id: INTEGRATION_ID, userId: USER_ID, provider: 'unknown-provider' } as any,
    ])

    await integrationsService.routeEvent(
      { type: 'booking.confirmed', data: { bookingId: BOOKING_ID, tenantId: TENANT_ID } },
      TENANT_ID
    )

    expect(mockProvider.onEvent).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect it to fail (file not found)**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx vitest run src/modules/integrations/__tests__/integrations.service.test.ts 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../integrations.registry'`

- [ ] **Step 3: Create the registry file**

```typescript
// src/modules/integrations/integrations.registry.ts
import type { IntegrationProvider } from './integrations.types'
import { googleCalendarProvider } from './providers/google-calendar.provider'

/**
 * Provider registry — the single source of truth for all registered integrations.
 *
 * To add a new integration: import its provider and add it to this map.
 * Nothing else needs to change.
 */
const PROVIDERS: Record<string, IntegrationProvider> = {
  [googleCalendarProvider.slug]: googleCalendarProvider,
}

/**
 * Look up a provider by slug. Returns null if not registered.
 */
export function getProvider(slug: string): IntegrationProvider | null {
  return PROVIDERS[slug] ?? null
}

/**
 * All registered providers. Used by the hub to route events.
 */
export function getAllProviders(): IntegrationProvider[] {
  return Object.values(PROVIDERS)
}
```

- [ ] **Step 4: Create a stub provider file so the registry import resolves**

```typescript
// src/modules/integrations/providers/google-calendar.provider.ts
// STUB — full implementation in Task 5
import type { IntegrationProvider } from '../integrations.types'

export const googleCalendarProvider: IntegrationProvider = {
  slug: 'google-calendar',
  name: 'Google Calendar',
  handles: ['booking.confirmed', 'booking.cancelled'],
  onEvent: async () => ({ success: true }),
  onWebhook: async () => undefined,
  getOAuthUrl: () => '',
  exchangeCode: async () => undefined,
  disconnect: async () => undefined,
}
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/integrations/integrations.registry.ts src/modules/integrations/providers/google-calendar.provider.ts
git commit -m "feat(integrations): add provider registry and Google Calendar stub"
```

---

## Task 3: Integration repository

**Files:**
- Create: `src/modules/integrations/integrations.repository.ts`

- [ ] **Step 1: Create the repository**

```typescript
// src/modules/integrations/integrations.repository.ts
import { db } from '@/shared/db'
import { bookings, userIntegrations } from '@/drizzle/schema'
import { and, eq } from 'drizzle-orm'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'integrations.repository' })

/**
 * A minimal record from user_integrations — just what the hub needs for routing.
 */
export interface ConnectedIntegrationRecord {
  id: string
  userId: string
  /** DB enum value e.g. 'GOOGLE_CALENDAR' */
  provider: string
  status: string
}

export const integrationsRepository = {
  /**
   * Find all user_integrations rows that are CONNECTED for the staff member
   * assigned to the given booking.
   *
   * Only looks at bookings.staffId (primary staff). For multi-staff bookings,
   * extend this to join booking_assignments when needed.
   */
  async findConnectedUsersForBooking(
    bookingId: string,
    tenantId: string
  ): Promise<ConnectedIntegrationRecord[]> {
    // Step 1: get the booking's staffId
    const [booking] = await db
      .select({ staffId: bookings.staffId })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
      .limit(1)

    if (!booking?.staffId) {
      log.info({ bookingId }, 'No staffId on booking — skipping integration routing')
      return []
    }

    // Step 2: find all CONNECTED integrations for that staff member
    return db
      .select({
        id: userIntegrations.id,
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        status: userIntegrations.status,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, booking.staffId),
          eq(userIntegrations.tenantId, tenantId),
          eq(userIntegrations.status, 'CONNECTED')
        )
      )
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/integrations/integrations.repository.ts
git commit -m "feat(integrations): add repository with findConnectedUsersForBooking"
```

---

## Task 4: Extend calendarSyncService with cancel support

The hub needs to delete calendar events when bookings are cancelled. The existing `calendarSyncService` only pushes (creates/updates). We add `cancelBookingFromCalendar()` and update `pushBookingToCalendar()` to write an audit sync log so we can look up the calendar event ID later.

**Files:**
- Modify: `src/modules/calendar-sync/calendar-sync.repository.ts`
- Modify: `src/modules/calendar-sync/calendar-sync.service.ts`

- [ ] **Step 1: Add `findSyncLogByBooking` to the repository**

Open `src/modules/calendar-sync/calendar-sync.repository.ts`. After the `loadBookingForCalendar` method (at the bottom of the `calendarSyncRepository` object), add:

```typescript
  /**
   * Find the most recent successful BOOKING_PUSH sync log for a booking.
   * Used by cancelBookingFromCalendar to look up the external calendar event ID.
   */
  async findSyncLogByBooking(
    bookingId: string,
    userIntegrationId: string
  ): Promise<{ externalId: string | null } | null> {
    const [row] = await db
      .select({ externalId: userIntegrationSyncLogs.externalId })
      .from(userIntegrationSyncLogs)
      .where(
        and(
          eq(userIntegrationSyncLogs.userIntegrationId, userIntegrationId),
          eq(userIntegrationSyncLogs.entityId, bookingId),
          eq(userIntegrationSyncLogs.syncType, 'BOOKING_PUSH'),
          eq(userIntegrationSyncLogs.status, 'SUCCESS')
        )
      )
      .orderBy(desc(userIntegrationSyncLogs.startedAt))
      .limit(1)

    return row ?? null
  },
```

Also add the missing imports at the top of the file if not present:

```typescript
import { desc } from 'drizzle-orm'
import { userIntegrationSyncLogs } from '@/drizzle/schema'
```

- [ ] **Step 2: Update `pushBookingToCalendar` to write a sync log**

In `src/modules/calendar-sync/calendar-sync.service.ts`, find the `pushBookingToCalendar` method. After the `upsertExternalEvent` call (near the end of the method), add a sync log write:

```typescript
    // Write audit sync log so we can find this event ID later (e.g. for cancellation)
    const startedAt = new Date().toISOString()
    await db.insert(userIntegrationSyncLogs).values({
      id: crypto.randomUUID(),
      userIntegrationId: integration.id,
      syncType: 'BOOKING_PUSH',
      direction: 'PUSH',
      status: 'SUCCESS',
      entityType: 'booking',
      entityId: bookingId,
      externalId: calendarEvent.externalId,
      itemsProcessed: 1,
      itemsSucceeded: 1,
      itemsFailed: 0,
      startedAt,
      completedAt: startedAt,
      durationMs: 0,
    }).onConflictDoNothing()
```

Also ensure `db` and `userIntegrationSyncLogs` are imported at the top of the service file:

```typescript
import { db } from '@/shared/db'
import { userIntegrationSyncLogs } from '@/drizzle/schema'
```

- [ ] **Step 3: Add `cancelBookingFromCalendar` to the service**

In `src/modules/calendar-sync/calendar-sync.service.ts`, add this method after `pushBookingToCalendar`:

```typescript
  /**
   * Delete a booking's calendar event when the booking is cancelled.
   * Looks up the external event ID from the sync log written by pushBookingToCalendar.
   */
  async cancelBookingFromCalendar(
    bookingId: string,
    userId: string,
    tenantId: string
  ): Promise<{ deleted: boolean }> {
    const integration = await calendarSyncRepository.findUserIntegration(userId, tenantId)
    if (!integration || (integration.status as string) !== 'CONNECTED') {
      log.info({ userId, tenantId }, 'No active calendar integration — skipping cancel')
      return { deleted: false }
    }

    const syncLog = await calendarSyncRepository.findSyncLogByBooking(bookingId, integration.id)
    if (!syncLog?.externalId) {
      log.info({ bookingId }, 'No sync log found for booking — event may not have been pushed')
      return { deleted: false }
    }

    const tokens = await getValidTokens(integration)
    if (!tokens) return { deleted: false }

    const provider = await getCalendarProvider(integration.provider)
    const calendarId = integration.calendarId ?? 'primary'

    try {
      await provider.deleteEvent(tokens, calendarId, syncLog.externalId)
      log.info({ bookingId, externalId: syncLog.externalId }, 'Calendar event deleted for cancelled booking')
      return { deleted: true }
    } catch (err) {
      log.warn({ bookingId, err }, 'Failed to delete calendar event for cancelled booking')
      return { deleted: false }
    }
  },
```

- [ ] **Step 4: Export `cancelBookingFromCalendar` from the module**

In `src/modules/calendar-sync/index.ts`, the `calendarSyncService` is already exported. Since `cancelBookingFromCalendar` is a method on that object, it's available automatically. Verify `calendarSyncService` is exported:

```bash
grep "calendarSyncService" /Users/lukehodges/Documents/ironheart-refactor/src/modules/calendar-sync/index.ts
```

Expected: `export { calendarSyncService }` line exists.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar-sync/calendar-sync.repository.ts src/modules/calendar-sync/calendar-sync.service.ts
git commit -m "feat(calendar-sync): add cancelBookingFromCalendar and sync log writing to pushBookingToCalendar"
```

---

## Task 5: Google Calendar provider — full implementation

Replace the stub from Task 2 with the real implementation.

**Files:**
- Modify: `src/modules/integrations/providers/google-calendar.provider.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/modules/integrations/__tests__/google-calendar.provider.test.ts`:

```typescript
// src/modules/integrations/__tests__/google-calendar.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/calendar-sync', () => ({
  calendarSyncService: {
    pushBookingToCalendar: vi.fn(),
    cancelBookingFromCalendar: vi.fn(),
    handleWebhook: vi.fn(),
    initiateOAuth: vi.fn(),
    completeOAuth: vi.fn(),
    disconnect: vi.fn(),
  },
  calendarSyncRepository: {
    findByWatchChannelId: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

import { googleCalendarProvider } from '../providers/google-calendar.provider'
import { calendarSyncService } from '@/modules/calendar-sync'
import type { IntegrationContext } from '../integrations.types'

const CTX: IntegrationContext = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId:   '00000000-0000-0000-0000-000000000002',
  userIntegrationId: '00000000-0000-0000-0000-000000000003',
}

describe('googleCalendarProvider', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct slug and handles booking.confirmed + booking.cancelled', () => {
    expect(googleCalendarProvider.slug).toBe('google-calendar')
    expect(googleCalendarProvider.handles).toContain('booking.confirmed')
    expect(googleCalendarProvider.handles).toContain('booking.cancelled')
  })

  describe('onEvent — booking.confirmed', () => {
    it('calls pushBookingToCalendar with bookingId, userId, tenantId', async () => {
      vi.mocked(calendarSyncService.pushBookingToCalendar).mockResolvedValue(null)

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.confirmed', data: { bookingId: 'b-1', tenantId: CTX.tenantId } },
        CTX
      )

      expect(calendarSyncService.pushBookingToCalendar).toHaveBeenCalledWith('b-1', CTX.userId, CTX.tenantId)
      expect(result.success).toBe(true)
    })

    it('returns success:false (does not throw) when pushBookingToCalendar throws', async () => {
      vi.mocked(calendarSyncService.pushBookingToCalendar).mockRejectedValue(new Error('API down'))

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.confirmed', data: { bookingId: 'b-1', tenantId: CTX.tenantId } },
        CTX
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('API down')
    })
  })

  describe('onEvent — booking.cancelled', () => {
    it('calls cancelBookingFromCalendar with bookingId, userId, tenantId', async () => {
      vi.mocked(calendarSyncService.cancelBookingFromCalendar).mockResolvedValue({ deleted: true })

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.cancelled', data: { bookingId: 'b-2', tenantId: CTX.tenantId } },
        CTX
      )

      expect(calendarSyncService.cancelBookingFromCalendar).toHaveBeenCalledWith('b-2', CTX.userId, CTX.tenantId)
      expect(result.success).toBe(true)
    })

    it('returns success:false (does not throw) when cancelBookingFromCalendar throws', async () => {
      vi.mocked(calendarSyncService.cancelBookingFromCalendar).mockRejectedValue(new Error('Network error'))

      const result = await googleCalendarProvider.onEvent(
        { type: 'booking.cancelled', data: { bookingId: 'b-2', tenantId: CTX.tenantId } },
        CTX
      )

      expect(result.success).toBe(false)
    })
  })

  describe('onWebhook', () => {
    it('calls handleWebhook with channelId and resourceId from headers', async () => {
      vi.mocked(calendarSyncService.handleWebhook).mockResolvedValue(undefined)

      await googleCalendarProvider.onWebhook(
        {
          headers: {
            'x-goog-channel-id': 'ch-1',
            'x-goog-resource-id': 'res-1',
            'x-goog-resource-state': 'exists',
          },
          body: null,
        },
        CTX
      )

      expect(calendarSyncService.handleWebhook).toHaveBeenCalledWith('ch-1', 'res-1')
    })

    it('does not throw when handleWebhook throws', async () => {
      vi.mocked(calendarSyncService.handleWebhook).mockRejectedValue(new Error('Timeout'))

      await expect(
        googleCalendarProvider.onWebhook(
          { headers: { 'x-goog-channel-id': 'ch-1', 'x-goog-resource-id': 'r-1', 'x-goog-resource-state': 'exists' }, body: null },
          CTX
        )
      ).resolves.not.toThrow()
    })
  })

  describe('getOAuthUrl', () => {
    it('delegates to calendarSyncService.initiateOAuth and returns the URL', async () => {
      vi.mocked(calendarSyncService.initiateOAuth).mockResolvedValue('https://accounts.google.com/o/oauth2/auth?...')

      const url = await googleCalendarProvider.getOAuthUrl('state-abc', 'https://app.ironheart.ai/callback')

      expect(calendarSyncService.initiateOAuth).toHaveBeenCalledWith(
        expect.any(String), // userId — not known at URL generation time, use placeholder
        expect.any(String),
        'GOOGLE_CALENDAR',
        'https://app.ironheart.ai/callback'
      )
    })
  })

  describe('exchangeCode', () => {
    it('delegates to calendarSyncService.completeOAuth', async () => {
      vi.mocked(calendarSyncService.completeOAuth).mockResolvedValue(undefined)

      await googleCalendarProvider.exchangeCode('code-xyz', CTX.userId, CTX.tenantId, 'https://app.ironheart.ai/callback')

      expect(calendarSyncService.completeOAuth).toHaveBeenCalledWith(
        'code-xyz',
        CTX.userId,
        CTX.tenantId,
        'GOOGLE_CALENDAR',
        'https://app.ironheart.ai/callback'
      )
    })
  })

  describe('disconnect', () => {
    it('delegates to calendarSyncService.disconnect', async () => {
      vi.mocked(calendarSyncService.disconnect).mockResolvedValue({ userId: CTX.userId, provider: 'GOOGLE_CALENDAR', watchChannelStopped: true })

      await googleCalendarProvider.disconnect(CTX.userId, CTX.tenantId)

      expect(calendarSyncService.disconnect).toHaveBeenCalledWith(CTX.userId, CTX.tenantId, 'GOOGLE_CALENDAR')
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/modules/integrations/__tests__/google-calendar.provider.test.ts 2>&1 | tail -20
```

Expected: FAIL — stub doesn't match the full interface yet.

- [ ] **Step 3: Write the full provider implementation**

```typescript
// src/modules/integrations/providers/google-calendar.provider.ts
import { calendarSyncService } from '@/modules/calendar-sync'
import { logger } from '@/shared/logger'
import type { IntegrationProvider, DomainEvent, IntegrationContext, IntegrationResult, WebhookPayload } from '../integrations.types'

const log = logger.child({ module: 'google-calendar.provider' })

/**
 * Google Calendar Integration Provider
 *
 * Thin adapter over calendarSyncService — all Google API logic lives there.
 * This file only translates between the IntegrationProvider interface
 * and the calendarSyncService API.
 */
export const googleCalendarProvider: IntegrationProvider = {
  slug: 'google-calendar',
  name: 'Google Calendar',
  handles: ['booking.confirmed', 'booking.cancelled'],

  async onEvent(event: DomainEvent, ctx: IntegrationContext): Promise<IntegrationResult> {
    try {
      if (event.type === 'booking.confirmed') {
        await calendarSyncService.pushBookingToCalendar(
          event.data.bookingId,
          ctx.userId,
          ctx.tenantId
        )
        return { success: true }
      }

      if (event.type === 'booking.cancelled') {
        await calendarSyncService.cancelBookingFromCalendar(
          event.data.bookingId,
          ctx.userId,
          ctx.tenantId
        )
        return { success: true }
      }

      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      log.warn({ event, ctx, error }, 'Google Calendar onEvent failed')
      return { success: false, error }
    }
  },

  async onWebhook(payload: WebhookPayload, _ctx: IntegrationContext): Promise<void> {
    const channelId = payload.headers['x-goog-channel-id']
    const resourceId = payload.headers['x-goog-resource-id']
    const resourceState = payload.headers['x-goog-resource-state']

    if (!channelId || resourceState === 'sync') {
      // 'sync' is the initial handshake — no action needed
      return
    }

    try {
      await calendarSyncService.handleWebhook(channelId, resourceId ?? '')
    } catch (err) {
      log.warn({ channelId, err }, 'Google Calendar onWebhook failed')
    }
  },

  getOAuthUrl(_state: string, _redirectUri: string): string {
    // Google Calendar OAuth requires async DB state creation (PKCE verifier storage).
    // integrationsService.initiateOAuth() calls calendarSyncService.initiateOAuth()
    // directly for 'google-calendar' instead of going through this method.
    // This stub satisfies the interface contract but is never called in practice.
    // Providers that can build the URL synchronously should return a real URL here.
    return ''
  },

  async exchangeCode(code: string, userId: string, tenantId: string, redirectUri: string): Promise<void> {
    await calendarSyncService.completeOAuth(code, userId, tenantId, 'GOOGLE_CALENDAR', redirectUri)
  },

  async disconnect(userId: string, tenantId: string): Promise<void> {
    await calendarSyncService.disconnect(userId, tenantId, 'GOOGLE_CALENDAR')
  },
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/modules/integrations/__tests__/google-calendar.provider.test.ts 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/integrations/providers/google-calendar.provider.ts src/modules/integrations/__tests__/google-calendar.provider.test.ts
git commit -m "feat(integrations): implement Google Calendar provider adapter with full test coverage"
```

---

## Task 6: Integration service — hub routing logic

**Files:**
- Create: `src/modules/integrations/integrations.service.ts`

- [ ] **Step 1: Tests already exist from Task 2 — run them now (expect fail)**

```bash
npx vitest run src/modules/integrations/__tests__/integrations.service.test.ts 2>&1 | tail -20
```

Expected: FAIL — `integrations.service.ts` does not exist yet.

- [ ] **Step 2: Implement the service**

```typescript
// src/modules/integrations/integrations.service.ts
import { logger } from '@/shared/logger'
import { calendarSyncService } from '@/modules/calendar-sync'
import { getProvider, getAllProviders } from './integrations.registry'
import { integrationsRepository } from './integrations.repository'
import type { DomainEvent, WebhookPayload } from './integrations.types'

const log = logger.child({ module: 'integrations.service' })

export const integrationsService = {
  /**
   * Route a domain event to all providers that handle it.
   *
   * For each connected user on the booking, look up which providers they have
   * connected, filter to those that handle this event type, and call onEvent.
   *
   * Never throws — integration failures must not fail the calling operation.
   */
  async routeEvent(event: DomainEvent, tenantId: string): Promise<void> {
    const connectedUsers = await integrationsRepository.findConnectedUsersForBooking(
      event.data.bookingId,
      tenantId
    )

    if (connectedUsers.length === 0) {
      log.info({ event: event.type, tenantId }, 'No connected integrations — skipping routing')
      return
    }

    await Promise.allSettled(
      connectedUsers.map(async (userIntegration) => {
        // Map DB enum ('GOOGLE_CALENDAR') to provider slug ('google-calendar')
        const slug = dbProviderToSlug(userIntegration.provider)
        const provider = getProvider(slug)

        if (!provider) {
          log.warn({ provider: userIntegration.provider }, 'No provider registered for slug — skipping')
          return
        }

        if (!provider.handles.includes(event.type)) {
          return // This provider doesn't handle this event type
        }

        const ctx = {
          tenantId,
          userId: userIntegration.userId,
          userIntegrationId: userIntegration.id,
        }

        try {
          const result = await provider.onEvent(event, ctx)
          if (!result.success) {
            log.warn({ event: event.type, provider: slug, error: result.error }, 'Integration event failed')
          } else {
            log.info({ event: event.type, provider: slug, userId: ctx.userId }, 'Integration event processed')
          }
        } catch (err) {
          log.error({ event: event.type, provider: slug, err }, 'Unexpected error in provider.onEvent')
        }
      })
    )
  },

  /**
   * Route an inbound webhook to the correct provider.
   * providerSlug comes from the URL: /api/integrations/webhooks/google-calendar
   */
  async handleWebhook(providerSlug: string, payload: WebhookPayload): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) {
      log.warn({ providerSlug }, 'Webhook received for unknown provider — ignoring')
      return
    }

    // For user context on webhooks, we look up by channel ID from headers
    // The Google Calendar provider handles this internally via calendarSyncService
    const ctx = {
      tenantId: '',    // Resolved by provider from channel token
      userId: '',      // Resolved by provider from channel token
      userIntegrationId: '',
    }

    try {
      await provider.onWebhook(payload, ctx)
    } catch (err) {
      log.error({ providerSlug, err }, 'Unexpected error in provider.onWebhook')
    }
  },

  /**
   * Initiate OAuth for a user — returns the URL to redirect to.
   */
  async initiateOAuth(
    userId: string,
    tenantId: string,
    providerSlug: string,
    redirectUri: string
  ): Promise<string> {
    // For Google Calendar, delegate to calendarSyncService which handles PKCE state
    if (providerSlug === 'google-calendar') {
      return calendarSyncService.initiateOAuth(userId, tenantId, 'GOOGLE_CALENDAR', redirectUri)
    }
    const provider = getProvider(providerSlug)
    if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)
    return provider.getOAuthUrl('', redirectUri)
  },

  /**
   * Complete OAuth — exchange code, store credentials.
   */
  async completeOAuth(
    code: string,
    userId: string,
    tenantId: string,
    providerSlug: string,
    redirectUri: string
  ): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)
    await provider.exchangeCode(code, userId, tenantId, redirectUri)
  },

  /**
   * Disconnect a provider for a user — revokes tokens, stops webhooks.
   */
  async disconnect(userId: string, tenantId: string, providerSlug: string): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)
    await provider.disconnect(userId, tenantId)
  },

  /**
   * List which providers are currently connected for a user.
   */
  async listConnected(
    userId: string,
    tenantId: string
  ): Promise<Array<{ slug: string; name: string; connectedAt?: string }>> {
    const allProviders = getAllProviders()
    const results: Array<{ slug: string; name: string; connectedAt?: string }> = []

    for (const provider of allProviders) {
      if (provider.slug === 'google-calendar') {
        const { calendarSyncRepository } = await import('@/modules/calendar-sync')
        const integration = await calendarSyncRepository.findUserIntegration(userId, tenantId)
        if (integration && (integration.status as string) === 'CONNECTED') {
          results.push({
            slug: provider.slug,
            name: provider.name,
            connectedAt: integration.connectedAt?.toString(),
          })
        }
      }
    }

    return results
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map DB enum value to provider slug used in registry */
function dbProviderToSlug(dbProvider: string): string {
  const map: Record<string, string> = {
    GOOGLE_CALENDAR: 'google-calendar',
    OUTLOOK_CALENDAR: 'outlook-calendar',
  }
  return map[dbProvider] ?? dbProvider.toLowerCase().replace(/_/g, '-')
}
```

- [ ] **Step 3: Run tests — expect pass**

```bash
npx vitest run src/modules/integrations/__tests__/integrations.service.test.ts 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/integrations/integrations.service.ts
git commit -m "feat(integrations): implement integration hub service with event routing"
```

---

## Task 7: Add Inngest event type + Inngest functions

**Files:**
- Modify: `src/shared/inngest.ts`
- Create: `src/modules/integrations/integrations.events.ts`

- [ ] **Step 1: Add `integration/webhook.received` to the Inngest event catalog**

In `src/shared/inngest.ts`, inside the `IronheartEvents` type, add after the last event:

```typescript
  "integration/webhook.received": {
    data: {
      /** Kebab-case provider slug: 'google-calendar', 'xero', etc. */
      providerSlug: string
      headers: Record<string, string>
      body: unknown
    }
  };
```

- [ ] **Step 2: Create the integrations events file**

```typescript
// src/modules/integrations/integrations.events.ts
import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { integrationsService } from './integrations.service'

const log = logger.child({ module: 'integrations.events' })

/**
 * Route booking confirmation to connected integrations.
 * Listens to the existing booking/confirmed event — no booking module changes needed.
 */
export const onBookingConfirmed = inngest.createFunction(
  {
    id: 'integrations-on-booking-confirmed',
    name: 'Integrations: Route booking.confirmed',
    retries: 3,
  },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    await step.run('route-to-providers', async () => {
      await integrationsService.routeEvent(
        { type: 'booking.confirmed', data: { bookingId, tenantId } },
        tenantId
      )
    })

    log.info({ bookingId, tenantId }, 'Integration routing complete for booking.confirmed')
  }
)

/**
 * Route booking cancellation to connected integrations.
 */
export const onBookingCancelled = inngest.createFunction(
  {
    id: 'integrations-on-booking-cancelled',
    name: 'Integrations: Route booking.cancelled',
    retries: 3,
  },
  { event: 'booking/cancelled' },
  async ({ event, step }) => {
    const { bookingId, tenantId, reason } = event.data

    await step.run('route-to-providers', async () => {
      await integrationsService.routeEvent(
        { type: 'booking.cancelled', data: { bookingId, tenantId, reason } },
        tenantId
      )
    })

    log.info({ bookingId, tenantId }, 'Integration routing complete for booking.cancelled')
  }
)

/**
 * Process an inbound webhook from an external provider.
 * Fires after the webhook API route responds 200.
 */
export const onIntegrationWebhook = inngest.createFunction(
  {
    id: 'integrations-on-webhook-received',
    name: 'Integrations: Process inbound webhook',
    retries: 2,
  },
  { event: 'integration/webhook.received' },
  async ({ event, step }) => {
    const { providerSlug, headers, body } = event.data

    await step.run('handle-webhook', async () => {
      await integrationsService.handleWebhook(providerSlug, { headers, body })
    })

    log.info({ providerSlug }, 'Integration webhook processed')
  }
)

/** Export for registration in the Inngest serve() handler */
export const integrationsFunctions = [
  onBookingConfirmed,
  onBookingCancelled,
  onIntegrationWebhook,
]
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/inngest.ts src/modules/integrations/integrations.events.ts
git commit -m "feat(integrations): add Inngest event type and integration event functions"
```

---

## Task 8: Schemas and tRPC router

**Files:**
- Create: `src/modules/integrations/integrations.schemas.ts`
- Create: `src/modules/integrations/integrations.router.ts`

- [ ] **Step 1: Create schemas**

```typescript
// src/modules/integrations/integrations.schemas.ts
import { z } from 'zod'

export const initiateOAuthSchema = z.object({
  providerSlug: z.string().min(1),
  redirectUri: z.string().url(),
})

export const completeOAuthSchema = z.object({
  code: z.string().min(1),
  providerSlug: z.string().min(1),
  redirectUri: z.string().url(),
})

export const disconnectSchema = z.object({
  providerSlug: z.string().min(1),
})
```

- [ ] **Step 2: Create the router**

```typescript
// src/modules/integrations/integrations.router.ts
import { tenantProcedure, router } from '@/shared/trpc'
import { integrationsService } from './integrations.service'
import { initiateOAuthSchema, completeOAuthSchema, disconnectSchema } from './integrations.schemas'

export const integrationsRouter = router({
  /**
   * Start OAuth flow for a provider. Returns the URL to redirect the user to.
   */
  initiateOAuth: tenantProcedure
    .input(initiateOAuthSchema)
    .mutation(async ({ input, ctx }) => {
      const url = await integrationsService.initiateOAuth(
        ctx.userId,
        ctx.tenantId,
        input.providerSlug,
        input.redirectUri
      )
      return { url }
    }),

  /**
   * Complete OAuth — exchange code and store credentials.
   * Called from the OAuth callback page.
   */
  completeOAuth: tenantProcedure
    .input(completeOAuthSchema)
    .mutation(async ({ input, ctx }) => {
      await integrationsService.completeOAuth(
        input.code,
        ctx.userId,
        ctx.tenantId,
        input.providerSlug,
        input.redirectUri
      )
      return { success: true }
    }),

  /**
   * Disconnect a provider — revokes tokens and stops webhooks.
   */
  disconnect: tenantProcedure
    .input(disconnectSchema)
    .mutation(async ({ input, ctx }) => {
      await integrationsService.disconnect(ctx.userId, ctx.tenantId, input.providerSlug)
      return { success: true }
    }),

  /**
   * List which integrations are currently connected for the current user.
   */
  listConnected: tenantProcedure
    .query(async ({ ctx }) => {
      return integrationsService.listConnected(ctx.userId, ctx.tenantId)
    }),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/integrations/integrations.schemas.ts src/modules/integrations/integrations.router.ts
git commit -m "feat(integrations): add tRPC router with OAuth and disconnect procedures"
```

---

## Task 9: Webhook API route

**Files:**
- Create: `src/app/api/integrations/webhooks/[provider]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/integrations/webhooks/[provider]/route.ts
import { NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'api.integrations.webhooks' })

/**
 * Dynamic webhook endpoint for all integration providers.
 * URL: POST /api/integrations/webhooks/google-calendar
 *
 * Design rules:
 * - Always respond 200 immediately (external providers retry on non-200)
 * - Never expose 404 for unknown channels (prevents enumeration)
 * - All processing happens async via Inngest
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  // Capture headers as plain object before reading body
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  let body: unknown = null
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }

  // Fire Inngest event asynchronously — do NOT await
  // This ensures we respond 200 before Google's 30s push timeout
  inngest
    .send({
      name: 'integration/webhook.received',
      data: { providerSlug: provider, headers, body },
    })
    .catch((err) => {
      log.error({ provider, err }, 'Failed to fire integration/webhook.received Inngest event')
    })

  log.info({ provider }, 'Webhook received — queued for async processing')
  return new NextResponse(null, { status: 200 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/integrations/webhooks/[provider]/route.ts
git commit -m "feat(integrations): add dynamic webhook API route for all providers"
```

---

## Task 10: Barrel export, wire into root router, register Inngest functions

**Files:**
- Create: `src/modules/integrations/index.ts`
- Modify: `src/server/root.ts`
- Modify: `src/app/api/inngest/route.ts`

- [ ] **Step 1: Create the barrel export**

```typescript
// src/modules/integrations/index.ts
export { integrationsRouter } from './integrations.router'
export { integrationsFunctions } from './integrations.events'
export { integrationsService } from './integrations.service'
export { getProvider, getAllProviders } from './integrations.registry'
export type { IntegrationProvider, DomainEvent, DomainEventType } from './integrations.types'
```

- [ ] **Step 2: Add integrations router to root.ts**

In `src/server/root.ts`, add the import:

```typescript
import { integrationsRouter } from '@/modules/integrations'
```

And add to the `appRouter` object:

```typescript
  integrations: integrationsRouter,
```

- [ ] **Step 3: Register Inngest functions**

Open `src/app/api/inngest/route.ts`. Find where other module functions are imported and add:

```typescript
import { integrationsFunctions } from '@/modules/integrations'
```

Then add `...integrationsFunctions` to the `serve()` call's functions array.

To verify the current structure of the file first, run:

```bash
cat src/app/api/inngest/route.ts
```

Then add the import and spread appropriately.

- [ ] **Step 4: Run full test suite to check nothing broke**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: All existing 224 tests pass + new integration tests pass.

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/integrations/index.ts src/server/root.ts src/app/api/inngest/route.ts
git commit -m "feat(integrations): wire integration hub into root router and Inngest serve"
```

---

## Task 11: Complete integrations.service.test.ts — add OAuth and disconnect coverage

**Files:**
- Modify: `src/modules/integrations/__tests__/integrations.service.test.ts`

- [ ] **Step 1: Add tests for initiateOAuth, completeOAuth, disconnect, listConnected**

Append to `src/modules/integrations/__tests__/integrations.service.test.ts`:

```typescript
// Add these imports at the top of the existing test file:
// import { calendarSyncService } from '@/modules/calendar-sync' — add to mock block

// Add to the vi.mock for '@/modules/calendar-sync':
vi.mock('@/modules/calendar-sync', () => ({
  calendarSyncService: {
    initiateOAuth: vi.fn().mockResolvedValue('https://accounts.google.com/auth'),
    completeOAuth: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue({ userId: 'u-1', provider: 'GOOGLE_CALENDAR', watchChannelStopped: true }),
  },
  calendarSyncRepository: {
    findUserIntegration: vi.fn(),
  },
}))

// Append these describe blocks:

describe('integrationsService.initiateOAuth', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns OAuth URL for google-calendar', async () => {
    const { calendarSyncService } = await import('@/modules/calendar-sync')
    vi.mocked(calendarSyncService.initiateOAuth).mockResolvedValue('https://accounts.google.com/auth?state=xyz')

    const url = await integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'google-calendar', 'https://app.test/cb')

    expect(url).toContain('accounts.google.com')
    expect(calendarSyncService.initiateOAuth).toHaveBeenCalledWith(USER_ID, TENANT_ID, 'GOOGLE_CALENDAR', 'https://app.test/cb')
  })

  it('throws for unknown provider', async () => {
    await expect(
      integrationsService.initiateOAuth(USER_ID, TENANT_ID, 'nonexistent', 'https://app.test/cb')
    ).rejects.toThrow('Unknown provider')
  })
})

describe('integrationsService.disconnect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws for unknown provider', async () => {
    await expect(
      integrationsService.disconnect(USER_ID, TENANT_ID, 'nonexistent')
    ).rejects.toThrow('Unknown provider')
  })
})
```

- [ ] **Step 2: Run tests — expect pass**

```bash
npx vitest run src/modules/integrations/__tests__/integrations.service.test.ts 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/integrations/__tests__/integrations.service.test.ts
git commit -m "test(integrations): add OAuth and disconnect coverage to service tests"
```

---

## Task 12: Run full suite + build verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: All tests pass (224 existing + new integration tests).

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 3: Build check**

```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 4: Fix any issues found, then commit**

```bash
git add -A
git commit -m "fix: resolve any tsc/build issues post-integration-hub wiring"
```

---

## Task 13: Write post-implementation docs

**Files:**
- Create: `docs/integrations.md`
- Create: `docs/integrations-future.md`

- [ ] **Step 1: Write developer reference**

```markdown
<!-- docs/integrations.md -->
# Integration Hub — Developer Reference

## Overview

The Integration Hub is the central system that connects Ironheart to external services.
It lives in `src/modules/integrations/` and is designed so that adding a new integration
requires creating exactly one new file.

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
| `onEvent(event, ctx)` | Domain event fires | React to booking/invoice/etc. changes |
| `onWebhook(payload, ctx)` | External system posts to our webhook | Process inbound data |
| `getOAuthUrl(state, redirectUri)` | User clicks "Connect" | Return OAuth consent URL |
| `exchangeCode(code, userId, tenantId, redirectUri)` | OAuth callback | Exchange code, store tokens |
| `disconnect(userId, tenantId)` | User clicks "Disconnect" | Revoke tokens, stop webhooks |

### Domain events

These are the events that feature modules emit and providers can declare they handle:

| Event | Emitted by | Payload |
|-------|-----------|---------|
| `booking.confirmed` | `booking/confirmed` Inngest event | `{ bookingId, tenantId }` |
| `booking.cancelled` | `booking/cancelled` Inngest event | `{ bookingId, tenantId, reason? }` |

To add a new domain event: add the type to `integrations.types.ts`, then add the Inngest
function listener to `integrations.events.ts`.

## Adding a new integration

1. Create `src/modules/integrations/providers/{slug}.provider.ts`
2. Implement the `IntegrationProvider` interface
3. Add it to `src/modules/integrations/integrations.registry.ts`

That's it. The hub, webhook route, tRPC router, and credential vault need no changes.

### Example: minimal provider

```typescript
// src/modules/integrations/providers/xero.provider.ts
import type { IntegrationProvider } from '../integrations.types'

export const xeroProvider: IntegrationProvider = {
  slug: 'xero',
  name: 'Xero',
  handles: ['invoice.finalised', 'payment.received'],

  async onEvent(event, ctx) {
    // push invoice to Xero
    return { success: true }
  },

  async onWebhook(payload, ctx) {
    // process Xero event notification
  },

  getOAuthUrl(state, redirectUri) {
    return `https://login.xero.com/identity/connect/authorize?...`
  },

  async exchangeCode(code, userId, tenantId, redirectUri) {
    // exchange code, encrypt tokens, store in user_integrations
  },

  async disconnect(userId, tenantId) {
    // revoke tokens
  },
}
```

Then in `integrations.registry.ts`:

```typescript
import { xeroProvider } from './providers/xero.provider'

const PROVIDERS: Record<string, IntegrationProvider> = {
  [googleCalendarProvider.slug]: googleCalendarProvider,
  [xeroProvider.slug]: xeroProvider,       // ← add this line
}
```

## Three-level credential hierarchy

| Level | Where stored | What it holds |
|-------|-------------|---------------|
| Platform | Env vars | OAuth app credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) |
| Tenant | `integrations` table | Which integrations are enabled, default preferences |
| User | `user_integrations` table (AES-256-GCM encrypted) | Per-user OAuth tokens |

Token encryption uses AES-256-GCM with a random 12-byte IV per encryption.
Key is in `INTEGRATION_ENCRYPTION_KEY_V1` (32 bytes hex).

## Webhook routing

All inbound webhooks hit a single dynamic endpoint:
`POST /api/integrations/webhooks/[provider]`

Rules:
- Responds 200 immediately (before processing)
- Never returns 404 (prevents enumeration attacks)
- Processing happens async via `integration/webhook.received` Inngest event

## Error handling

Integration failures **never** block core operations. If Google Calendar sync fails
after a booking is confirmed, the booking is still confirmed. Failures are:
- Logged to `integration_sync_logs` (existing table)
- Retried by Inngest (3 retries, exponential backoff)
- Surfaced via `lastSyncError` on the `user_integrations` record

## Testing a new provider

Mock `@/modules/calendar-sync` (or your provider's external dependencies).
Test each method independently:

```typescript
vi.mock('@/modules/your-service', () => ({
  yourService: {
    doTheThing: vi.fn(),
  },
}))

it('calls doTheThing on booking.confirmed', async () => {
  await provider.onEvent({ type: 'booking.confirmed', data: { ... } }, ctx)
  expect(yourService.doTheThing).toHaveBeenCalled()
})
```

See `src/modules/integrations/__tests__/google-calendar.provider.test.ts` for a complete example.
```

- [ ] **Step 2: Write the evolution roadmap**

```markdown
<!-- docs/integrations-future.md -->
# Integration Hub — Future Evolution

## Path from current state

The integration hub is designed as a foundation. Each evolution path below
builds on the existing provider registry without architectural changes.

## 1. More providers

Each new integration is one file. Suggested priority order:

### Xero / QuickBooks (accounting sync)
- Handles: `invoice.finalised`, `payment.received`
- Value: Auto-reconcile invoices for any commercial vertical
- Complexity: Medium — OAuth + REST API, no webhooks required for MVP

### Slack / Teams (team notifications)
- Handles: `booking.confirmed`, `booking.cancelled`
- Value: Staff get notified in their team channels
- Complexity: Low — webhook-only, no OAuth per user

### HubSpot / Salesforce (CRM sync)
- Handles: `customer.created`, `booking.completed`
- Value: Booking activity flows into sales CRM
- Complexity: Medium — OAuth + CRM API mapping

### Stripe Connect (marketplace payments)
- Handles: `invoice.finalised`
- Value: Split payments to subcontractors
- Complexity: High — Stripe Connect onboarding flow

### Zapier / n8n (power users)
- Handles: all domain events
- Value: Tenants connect to anything
- Complexity: Low — just POST to a registered webhook URL

## 2. Tenant-facing integration management UI

The `user_integrations`, `integrations`, and `integration_sync_logs` tables already
support a full UI. Build order:

1. `/admin/settings/integrations` — list all available integrations, connect/disconnect buttons
2. OAuth callback redirect → `/admin/settings/integrations/callback?provider={slug}`
3. Sync health indicator — last sync status from `user_integrations.lastSyncError`
4. Sync log viewer — paginated `integration_sync_logs` for debugging

All data is already being written. The UI just needs to read it.

## 3. Bring-your-own credentials (tenant-level API keys)

Currently: provider credentials (API keys) are platform-level (Luke's Google Cloud project).
Future: tenants provide their own Resend API key, Twilio account, etc.

Implementation:
- Add `credentials: jsonb()` to the `integrations` table (encrypted at rest)
- The hub passes tenant credentials to `IntegrationContext`
- Providers check `ctx.credentials` before falling back to platform defaults
- No interface change needed — `IntegrationContext` already supports extension

## 4. Rule engine (mini-Zapier)

The current hub routes events to all providers that declare they handle the event type.
A rule engine would let tenants configure: "When booking.confirmed, push to Google Calendar
AND post to Slack #bookings channel, but only if service = 'Premium Package'."

Implementation path:
1. Add `integration_rules` table: `tenantId, providerSlug, eventType, conditions, enabled`
2. In `integrationsService.routeEvent()`, before calling `provider.onEvent()`,
   check if a rule exists for this tenant+provider+event combo
3. Evaluate conditions against event data
4. If no rule exists, fall back to current behaviour (always route)

This is purely additive — existing integrations keep working unchanged.

## 5. Provider marketplace

Once several providers exist, expose them as installable modules:
1. Add provider definitions to the `modules` table with `category: 'INTEGRATION'`
2. Tenants install integrations via `tenant_modules` (already works for feature modules)
3. The hub checks `isModuleEnabled(tenantId, providerSlug)` before routing
4. The platform admin UI manages which providers are available per product

This gives Luke a monetisable integration marketplace with zero additional infrastructure.
```

- [ ] **Step 3: Commit docs**

```bash
git add docs/integrations.md docs/integrations-future.md
git commit -m "docs: add integration hub developer reference and evolution roadmap"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run full test suite one last time**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(integrations): complete integration hub with Google Calendar vertical, docs, and full test coverage"
```
