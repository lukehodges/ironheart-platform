# Phase 6: Hardening — Executable Plan

**Written:** 2026-02-19
**Status:** Ready to execute (after Phase 5 completes)
**Depends on:** All previous phases — the platform is functionally complete after Phase 5

---

## Overview

**Phase goal:** Make the functionally-complete Ironheart platform production-ready at scale. Phase 6 adds no new features. Every task in this phase either prevents something from breaking at scale, makes failures observable, eliminates known security gaps, or replaces mock data with real data.

When Phase 6 is done, the platform can be handed to an SRE team with confidence.

### What gets built

| File | Purpose |
|------|---------|
| `src/shared/trpc.ts` (updated) | Request ID middleware + rate limit middleware wired in |
| `src/shared/redis.ts` (updated) | `acquireDistributedLock` / `releaseDistributedLock` helpers added |
| `src/modules/booking/booking.service.ts` (updated) | Distributed lock wrapping slot capacity check |
| `src/modules/tenant/analytics.repository.ts` | Real Drizzle analytics queries |
| `src/modules/tenant/analytics.router.ts` | tRPC analytics procedures |
| `src/modules/tenant/index.ts` (updated) | Export analytics router |
| `src/server/root.ts` (updated) | Mount analytics router |
| `src/app/admin/analytics/page.tsx` (updated) | Wire to real tRPC queries instead of mock data |
| `src/shared/__tests__/booking.service.test.ts` | Integration tests for BookingService |
| `src/shared/__tests__/booking.service.confirm.test.ts` | confirmReservation tests |
| `vitest.config.ts` | Vitest configuration |
| `.env.example` (updated) | All Phase 6 environment variables documented |

### Inngest function count at end of Phase 6

All 9+ Inngest functions from Phases 1–5 remain registered and healthy. Phase 6 adds no new Inngest functions but verifies they all work end-to-end.

### Success Criteria

Phase 6 is complete when ALL of the following are true:

- [ ] Zero `console.log`, `console.error`, or `console.warn` calls in any `src/modules/` or `src/shared/` file — only `logger.*` calls
- [ ] Every tRPC request has a `requestId` field in every log line for that request
- [ ] `redis.acquireDistributedLock('lock:slot:{slotId}', 5000)` used in `BookingService.createBooking()` around the slot capacity check
- [ ] Concurrent portal bookings for the same slot return HTTP 409 (`ConflictError('slot_locked')`) for the second request instead of both succeeding
- [ ] `publicProcedure` portal endpoints return TRPC error code `TOO_MANY_REQUESTS` after 30 requests/minute from the same IP
- [ ] `booking.confirmReservation` returns `TOO_MANY_REQUESTS` after 10 requests/minute from the same IP
- [ ] Outgoing webhooks carry `X-Ironheart-Signature: sha256=<hmac>` header
- [ ] Inbound Google Calendar webhooks are rejected with 401 if signature missing or invalid
- [ ] `/admin/analytics` page shows real data from the test tenant's bookings
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] `npm run build` exits clean with 0 errors
- [ ] `npx vitest run` — all tests pass
- [ ] BookingService integration tests: `createBooking` slot capacity enforcement, `confirmReservation` expiry rejection
- [ ] All 9+ Inngest functions listed and healthy in dashboard
- [ ] Full E2E: customer books portal → Resend email arrives → Google Calendar event created

---

## Architectural Notes

### Logging strategy

Every module file already uses `logger.child({ module: '...' })`. The gap is two-fold:

1. **Request ID is not threaded.** Each log line is isolated — you cannot trace all log lines for a single request. Fix: generate a `requestId` UUID in tRPC middleware and pass it through context. Every child logger call appends `{ requestId }`.

2. **`console.log` calls remain in some files.** These bypass Pino entirely — they don't appear in production structured logs. Fix: grep every module file, replace each call with the appropriate `log.*` call using the module's child logger.

The key insight: Pino's `logger.child()` creates a derived logger that inherits parent fields. Use it at two levels:

- **Module level:** `const log = logger.child({ module: 'booking.service' })` — identifies which file the log came from
- **Request level:** `log.child({ requestId })` — identifies which request this log line belongs to

For tRPC, inject `requestId` into the context at middleware time, then pass it as a parameter to service methods that need to log it. Do not store the child logger in context — loggers are not serialisable and break SuperJSON. Store the `requestId` string and call `log.child({ requestId })` inside the service method.

### Distributed locking for slot reservation

The slot capacity check + decrement in `BookingService.createBooking()` has a race condition: two concurrent portal requests can both read `bookedCount < capacity`, both pass the check, and both decrement — resulting in overbooking.

The fix uses a Redis distributed lock with a 5-second TTL:

```
acquire lock:slot:{slotId} with TTL=5000ms
  → if lock busy: throw ConflictError('slot_locked') → tRPC returns 409 CONFLICT
  → if lock acquired:
      check capacity (bookedCount < capacity)
      decrement capacity inside Drizzle transaction
      release lock
```

The `@upstash/redis` client is already instantiated at `src/shared/redis.ts`. Add the lock helpers directly to that file — no new package needed. Upstash Redis supports `SET key value NX PX ttl` which is the standard distributed lock acquisition pattern.

**Why not use `@upstash/redis`'s Ratelimit package for this?** The Ratelimit package is designed for rate limiting, not mutual exclusion. For a critical section (capacity check + decrement), you need a lock that either succeeds or fails immediately, not a sliding window counter.

### Rate limiting on public endpoints

Public portal endpoints (`createBookingFromSlot`, `getSlotsForDate`, `confirmReservation`) need protection against abuse. The rate limiter uses the Upstash Redis sliding window algorithm via `@upstash/ratelimit`.

Key: `rate:{ip}:{procedure}` — one counter per IP per procedure.
Limits:
- Portal booking endpoints: 30 requests/minute
- Confirmation endpoint: 10 requests/minute

The rate limiter runs in a tRPC middleware that wraps `publicProcedure` only. Admin procedures (already authenticated) are exempt.

IP extraction: read `x-forwarded-for` header (set by Vercel/proxy). Fall back to `::1` for local dev — rate limiting is effectively disabled for localhost.

**Install:** `npm install @upstash/ratelimit`

### HMAC webhook signing

Any outbound webhook call from Ironheart must be signed so receiving services can verify authenticity. Any inbound webhook (specifically Google Calendar push notifications) must have its signature verified before processing.

Pattern for outbound signing:
```
const payload = JSON.stringify(body)
const signature = createHmac('sha256', secret).update(payload).digest('hex')
headers['X-Ironheart-Signature'] = `sha256=${signature}`
```

The `secret` is the tenant's webhook secret from the `TenantSettings` table. If no secret is stored, generate one on first use and persist it.

For inbound Google Calendar webhooks: the existing `calendar/webhook.received` Inngest handler (Phase 4) already processes inbound events but the signature check may be incomplete. Phase 6 adds a verification step before the Inngest event is emitted.

### Real analytics

The legacy analytics page at `src/app/admin/analytics/page.tsx` is 100% mock data. The refactor will have inherited the same problem until this phase.

The analytics data layer is thin: one repository file with pure SQL aggregation queries, one router with `tenantProcedure` queries. No analytics module — just add to the existing tenant module which already has tenant configuration queries.

**Drizzle query patterns for analytics (all use `where tenantId = ?`):**

```sql
-- Bookings by status this week vs last week
SELECT status, COUNT(*) FROM bookings
WHERE tenantId = ? AND scheduledDate >= ? AND scheduledDate < ?
GROUP BY status

-- Revenue by month (last 12 months)
SELECT DATE_TRUNC('month', scheduledDate) AS month, SUM(totalAmount) AS revenue
FROM bookings
WHERE tenantId = ? AND status IN ('CONFIRMED', 'COMPLETED')
  AND scheduledDate >= NOW() - INTERVAL '12 months'
GROUP BY month ORDER BY month

-- Top services
SELECT serviceId, COUNT(*) AS bookingCount
FROM bookings WHERE tenantId = ? GROUP BY serviceId ORDER BY bookingCount DESC LIMIT 10

-- Staff utilisation (bookings per staff member as % of max daily)
-- Customer retention (% with 2+ bookings)
-- Portal vs admin split
-- Average booking value trend
```

### TypeScript error fixes

The 5 pre-existing errors from the legacy codebase are in files that carry over into the refactor. Fix them definitively in Phase 6.

Known errors (from legacy grep):

1. **`review.ts` — `resolvedBy` field:** The `Review` model has a `resolvedBy` relation. The update call sets `resolvedByUser: { connect: { id: ... } }` but Prisma/Drizzle type says the field is `resolvedById` (a string). Fix: use `resolvedById: userId` directly instead of the relation connect syntax.

2. **`settings.ts` — `tenantId` type:** The settings mutation receives `tenantId` from context which is typed as `string`, but the Drizzle schema column may be typed as `UUID`. Fix: ensure the `tenantId` column type in Drizzle schema matches the value being passed.

3. **`workflow.ts` — `JsonArray` cast:** Three places cast `workflow.actions as any`. Fix: define a proper `WorkflowAction` type that matches the JSON schema stored in the column, and use `workflow.actions as WorkflowAction[]`.

### Service layer tests

Tests focus on the two highest-risk paths in `BookingService`:

1. **`createBooking`** — Tests the distributed lock, slot capacity enforcement, RESERVED status creation, and Inngest event emission.
2. **`confirmReservation`** — Tests the expired reservation rejection, status transition, and Inngest event emission.

Use Vitest (faster than Jest, native ESM, zero config for TypeScript). Tests run against a real PostgreSQL database — the same `DATABASE_URL` from `.env.local`. Use a test-specific tenant (`tenantId: 'test-tenant-phase6'`) and clean up after each test.

Mock Inngest with a spy — do not fire real events in tests. Inngest provides a mock client for this purpose.

---

## Task Breakdown

---

### PHASE6-T01: Replace all `console.*` calls with Pino child loggers

**Goal:** Zero `console.log`, `console.error`, or `console.warn` in any module or shared file. Every log goes through Pino so it appears in structured production logs.

**Step 1 — Find all occurrences:**

```bash
grep -rn "console\.log\|console\.error\|console\.warn" \
  /Users/lukehodges/Documents/ironheart-refactor/src/modules/ \
  /Users/lukehodges/Documents/ironheart-refactor/src/shared/ \
  --include="*.ts" --include="*.tsx"
```

**Step 2 — Replacement rules:**

For each file that has a `console.*` call:

1. If the file does not already have a module logger, add one at the top:
```typescript
import { logger } from '@/shared/logger'
const log = logger.child({ module: 'MODULE_NAME' })
```
The module name convention: `{module}.{layer}` — e.g., `booking.service`, `booking.repository`, `scheduling.events`, `notification.service`.

2. Replace each `console.*` call:
```typescript
// Before
console.log('Slot released', { bookingId, slotId })
console.error('Failed to release slot', err)
console.warn('Slot already released')

// After
log.info('Slot released', { bookingId, slotId })
log.error('Failed to release slot', err)
log.warn('Slot already released')
```

3. For `console.error` that receives an `Error` object as the second argument, use the Pino error convention:
```typescript
// Pino serialises the error object under the `err` key
log.error('Failed to release slot', err)
// Which in the logger.ts wrapper maps to: logger.error({ err: error }, msg)
```

**Step 3 — Verify:**

```bash
# Must return 0
grep -rn "console\.log\|console\.error\|console\.warn" \
  /Users/lukehodges/Documents/ironheart-refactor/src/modules/ \
  /Users/lukehodges/Documents/ironheart-refactor/src/shared/ \
  --include="*.ts" --include="*.tsx" | wc -l
```

**Note on `src/app/` files:** React component files in `src/app/` are allowed to use `console.error` for dev-time debugging (e.g., in error boundaries). The zero-console rule applies only to `src/modules/` and `src/shared/`.

**Verification:** `grep` returns 0. `tsc --noEmit` still passes.

---

### PHASE6-T02: Add request ID tracing to tRPC middleware

**Goal:** Every log line for a single request shares a `requestId` so you can grep production logs for one ID and see the full trace.

**Step 1 — Update `src/shared/trpc.ts`:**

Add `requestId` to the `Context` type and generate it in `createContext`:

```typescript
import { randomUUID } from 'crypto'

export type Context = {
  db: typeof db
  session: { ... } | null
  tenantId: string
  tenantSlug: string
  user: UserWithRoles | null
  requestId: string  // ← ADD THIS
}

export async function createContext({ req }: { req: Request }): Promise<Context> {
  // ... existing session/tenant resolution ...

  // Generate a unique ID for this request.
  // Respect X-Request-ID if an upstream proxy already set one (e.g. Vercel Edge).
  const requestId = req.headers.get('x-request-id') ?? randomUUID()

  return {
    db,
    session,
    tenantId,
    tenantSlug,
    user: null,
    requestId,  // ← ADD THIS
  }
}
```

**Step 2 — Add request logging middleware:**

Add this middleware to `src/shared/trpc.ts` and apply it to all procedures via the base `t.procedure`:

```typescript
const requestLogger = middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now()
  const log = logger.child({
    requestId: ctx.requestId,
    tenantId: ctx.tenantId,
    path,
    type,
  })

  log.info('tRPC request started')

  const result = await next({ ctx })

  const durationMs = Date.now() - start

  if (result.ok) {
    log.info({ durationMs }, 'tRPC request completed')
  } else {
    log.warn({ durationMs, error: result.error.message }, 'tRPC request failed')
  }

  return result
})

// Apply to ALL procedures (before the existing auth middleware)
// Update the t.procedure export:
export const baseProcedure = t.procedure.use(requestLogger)
export const publicProcedure = baseProcedure
// protectedProcedure, tenantProcedure, permissionProcedure all extend baseProcedure
// via their existing chain, so they automatically inherit requestLogger
```

**Step 3 — Pass `requestId` to service methods that need it:**

Service methods that call the repository and log intermediate steps should receive `requestId` as an optional parameter:

```typescript
// In booking.service.ts
async createBooking(
  tenantId: string,
  input: CreateBookingInput,
  createdById?: string,
  requestId?: string  // ← ADD THIS
) {
  const log = moduleLog.child({ requestId, tenantId })
  log.info('Creating booking', { slotId: input.slotId, source: input.source })
  // ... rest of method
}
```

Router passes `ctx.requestId` through:
```typescript
create: tenantProcedure
  .input(createBookingSchema)
  .mutation(({ ctx, input }) =>
    bookingService.createBooking(ctx.tenantId, input, ctx.user.id, ctx.requestId)
  ),
```

**Verification:** Start `npm run dev`. Make a booking request. In the terminal output (pino-pretty), every log line for that request shows the same `requestId` UUID.

---

### PHASE6-T02b: Inngest failure alerting

**Goal:** Silent Inngest function failures are invisible in production. When a function fails after all retries, log it at ERROR level and optionally forward to Slack. Configure the URL in the Inngest dashboard as a failure webhook.

**File: `src/app/api/inngest-alerts/route.ts`**

Configure this URL in the Inngest dashboard: Settings → Webhooks → On function failure.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/shared/logger'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const log = logger.child({ module: 'inngest-alert' })

  log.error({
    functionId: body.function?.id,
    eventName: body.event?.name,
    error: body.error,
    runId: body.run?.id,
    retryCount: body.retry?.count,
  }, 'Inngest function failure')

  // If Slack webhook configured, forward alert
  if (process.env.SLACK_ALERT_WEBHOOK_URL) {
    await fetch(process.env.SLACK_ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Inngest failure: \`${body.function?.id}\` — ${body.error?.message ?? 'unknown error'}\nRun ID: ${body.run?.id}`,
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
```

**Add to `.env.example`:**

```
# Slack webhook URL for Inngest failure alerts (optional)
SLACK_ALERT_WEBHOOK_URL=
```

**Success Criteria:**

- [ ] A forced Inngest function failure triggers a log entry at ERROR level
- [ ] If `SLACK_ALERT_WEBHOOK_URL` is set, failure notification arrives in Slack

---

### PHASE6-T03: Implement distributed locking for slot reservation

**Goal:** Two concurrent portal booking requests for the same slot cannot both pass the capacity check. The second request gets a 409 CONFLICT, not a double-booking.

**Step 1 — Add lock helpers to `src/shared/redis.ts`:**

```typescript
/**
 * Acquire a distributed lock using Redis SET NX PX pattern.
 *
 * Returns the lock token (UUID) if acquired, null if the lock is held by another process.
 *
 * @param key - Lock key, e.g. 'lock:slot:abc-123'
 * @param ttlMs - Time-to-live in milliseconds. The lock auto-expires if not released.
 *                Set this to the maximum time your critical section could take.
 *                For slot reservation: 5000ms (5 seconds) is sufficient.
 *
 * @example
 * const token = await acquireDistributedLock('lock:slot:abc', 5000)
 * if (!token) throw new ConflictError('slot_locked')
 * try {
 *   // critical section
 * } finally {
 *   await releaseDistributedLock('lock:slot:abc', token)
 * }
 */
export async function acquireDistributedLock(
  key: string,
  ttlMs: number
): Promise<string | null> {
  const token = randomUUID()
  // SET key token NX PX ttlMs
  // NX = only set if key does not exist (atomic acquisition)
  // PX = TTL in milliseconds
  const result = await redis.set(key, token, { nx: true, px: ttlMs })
  return result === 'OK' ? token : null
}

/**
 * Release a distributed lock.
 * Only releases if the token matches — prevents releasing another process's lock.
 *
 * Uses a Lua script for atomic compare-and-delete.
 */
export async function releaseDistributedLock(
  key: string,
  token: string
): Promise<void> {
  // Lua script: only delete if value matches token
  // This is atomic — prevents a race where the lock expired and was re-acquired
  // by another process between our token check and our delete.
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await redis.eval(script, [key], [token])
}
```

Add `import { randomUUID } from 'crypto'` at the top of `redis.ts`.

**Step 2 — Apply lock in `BookingService.createBooking()`:**

In `src/modules/booking/booking.service.ts`, wrap the slot capacity check + decrement:

```typescript
import { acquireDistributedLock, releaseDistributedLock } from '@/shared/redis'
import { ConflictError } from '@/shared/errors'

async createBooking(
  tenantId: string,
  input: CreateBookingInput,
  createdById?: string,
  requestId?: string
) {
  const log = moduleLog.child({ requestId, tenantId })

  // Distributed lock for slot reservation — prevents race condition where
  // two concurrent requests both pass the capacity check.
  // Only needed when a slotId is provided (portal bookings).
  let lockToken: string | null = null
  const lockKey = input.slotId ? `lock:slot:${input.slotId}` : null

  if (lockKey) {
    lockToken = await acquireDistributedLock(lockKey, 5000)
    if (!lockToken) {
      log.warn({ slotId: input.slotId }, 'Slot lock contention — concurrent booking attempt')
      throw new ConflictError('slot_locked')
    }
    log.debug({ slotId: input.slotId }, 'Slot lock acquired')
  }

  try {
    // 1. Validate slot is still available
    if (input.slotId) {
      const slot = await bookingRepository.findSlotById(tenantId, input.slotId)
      if (!slot) throw new NotFoundError('Slot', input.slotId)
      if (slot.bookedCount >= slot.capacity) {
        throw new ConflictError('slot_full')
      }
    }

    // 2. Create booking + decrement capacity (in transaction)
    const booking = await bookingRepository.create(tenantId, input, createdById)

    // 3. Emit Inngest events
    // ... (existing logic)

    log.info({ bookingId: booking.id, status: booking.status }, 'Booking created')
    return booking

  } finally {
    // Always release the lock, even if an error occurred
    if (lockKey && lockToken) {
      await releaseDistributedLock(lockKey, lockToken)
      log.debug({ slotId: input.slotId }, 'Slot lock released')
    }
  }
}
```

**Step 3 — Update `toTRPCError()` to handle slot-locked ConflictError:**

In `src/shared/errors.ts`, the existing `ConflictError` maps to `CONFLICT` (HTTP 409). No change needed — the tRPC `CONFLICT` code is correct for this case. The client should display "Slot just became unavailable — please choose another time" when it receives a 409.

**Verification:**

Run two concurrent requests in parallel (e.g., using a small test script or `Promise.all`) for the same slot. One should succeed, the other should receive `TRPCClientError` with code `CONFLICT`. Check Redis in Upstash console — the lock key should appear momentarily during the request and then disappear after release.

---

### PHASE6-T04: Add sliding window rate limiting to public endpoints

**Goal:** Public portal endpoints return `TOO_MANY_REQUESTS` after exceeding per-IP limits. Prevents portal scraping and booking spam.

**Step 1 — Install `@upstash/ratelimit`:**

```bash
npm install @upstash/ratelimit
```

**Step 2 — Create layered rate limiter instances in `src/shared/redis.ts`:**

Three layers are applied to defend against distinct failure modes. IP-only limiting breaks for corporate customers where all staff share one egress IP. Per-tenant limiting prevents one high-traffic tenant from exhausting resources for all others.

```typescript
import { Ratelimit } from '@upstash/ratelimit'

// Layer 1: per-IP (abuse protection)
// Defends against individual bad actors and portal scrapers.
export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rate:ip',
})

// Layer 2: per-tenant (noisy-tenant isolation)
// Prevents one tenant's traffic spike from impacting other tenants.
// Higher limit because this aggregates all users of a tenant.
export const tenantRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(500, '1 m'),
  prefix: 'rate:tenant',
})

// Layer 3: per-user for authenticated routes
export const userRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rate:user',
})

/**
 * Rate limiter for portal booking endpoints (per-IP).
 * Limit: 30 requests per minute per IP.
 * Applies to: createBookingFromSlot, getSlotsForDate, getSlotsForDateRange, getPortalConfig
 */
export const portalRateLimit = ipRateLimit

/**
 * Rate limiter for the confirmation endpoint (per-IP).
 * Limit: 10 requests per minute per IP.
 * Applies to: confirmReservation
 */
export const confirmationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rate:confirm',
  analytics: false,
})
```

**Step 3 — Add `TooManyRequestsError` to `src/shared/errors.ts`:**

```typescript
/** Rate limit exceeded. */
export class TooManyRequestsError extends IronheartError {
  constructor(message = 'Too many requests — please slow down') {
    super(message, 'TOO_MANY_REQUESTS')
    this.name = 'TooManyRequestsError'
  }
}
```

Add the mapping in `toTRPCError()`:
```typescript
if (error instanceof TooManyRequestsError) {
  return new TRPCError({ code: 'TOO_MANY_REQUESTS', message: error.message })
}
```

**Step 4 — Create rate limiting middleware factory in `src/shared/trpc.ts`:**

```typescript
import type { Ratelimit } from '@upstash/ratelimit'
import { TooManyRequestsError } from '@/shared/errors'

/**
 * Create a tRPC middleware that applies the given Ratelimit instance.
 * Extracts the caller IP from x-forwarded-for header.
 * In local dev (IP = ::1 or 127.0.0.1), rate limiting is skipped.
 *
 * @example
 * // In a sub-router:
 * const rateLimitedPortalProcedure = publicProcedure.use(
 *   createRateLimitMiddleware(portalRateLimit)
 * )
 */
export function createRateLimitMiddleware(limiter: Ratelimit) {
  return middleware(async ({ ctx, next }) => {
    const ip =
      (ctx as unknown as { req?: Request }).req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? '::1'

    // Skip rate limiting for localhost (development)
    if (ip === '::1' || ip === '127.0.0.1') {
      return next({ ctx })
    }

    const { success, limit, remaining, reset } = await limiter.limit(ip)

    if (!success) {
      logger.warn(
        { ip, limit, remaining, reset, requestId: ctx.requestId },
        'Rate limit exceeded'
      )
      throw new TooManyRequestsError()
    }

    return next({ ctx })
  })
}
```

**Note:** The `ctx` object needs access to the raw `Request` for IP extraction. The tRPC context already has the request available via `createContext({ req })`. Pass the `req` object through to the context:

```typescript
// Add to Context type
export type Context = {
  // ...existing fields...
  req: Request  // ← ADD THIS
}

// Add to createContext return value
return {
  db, session, tenantId, tenantSlug, user: null, requestId,
  req,  // ← ADD THIS
}
```

**Step 5 — Apply rate limiters to public sub-routers:**

In `src/modules/booking/sub-routers/slot.router.ts`:

```typescript
import { createRateLimitMiddleware } from '@/shared/trpc'
import { portalRateLimit, confirmationRateLimit } from '@/shared/redis'

const rateLimitedPublicProcedure = publicProcedure.use(
  createRateLimitMiddleware(portalRateLimit)
)

const rateLimitedConfirmProcedure = publicProcedure.use(
  createRateLimitMiddleware(confirmationRateLimit)
)

export const slotRouter = router({
  getSlotsForDate: rateLimitedPublicProcedure
    .input(getSlotsForDateSchema)
    .query(...),

  getSlotsForDateRange: rateLimitedPublicProcedure
    .input(getSlotsForDateRangeSchema)
    .query(...),

  createBookingFromSlot: rateLimitedPublicProcedure
    .input(createPortalBookingSchema)
    .mutation(...),
})

// In booking.router.ts:
confirmReservation: rateLimitedConfirmProcedure
  .input(confirmReservationSchema)
  .mutation(({ input }) => bookingService.confirmReservation(input.bookingId)),
```

**Verification:**

```bash
# Using curl, fire 35 requests in quick succession to the same portal endpoint
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/trpc/slotAvailability.getSlotsForDate \
    -H "Content-Type: application/json" \
    -d '{"0":{"json":{"slug":"test","date":"2026-03-01"}}}' &
done
wait
```

Expected: First 30 return 200. Requests 31–35 return 429 (tRPC maps `TOO_MANY_REQUESTS` to HTTP 429).

---

### PHASE6-T05: HMAC webhook signing

**Goal:** All outgoing webhooks from Ironheart carry a verifiable signature. Inbound Google Calendar webhooks are rejected if the signature is missing or invalid.

**Step 1 — Add webhook signing helpers:**

Create `src/shared/webhook.ts`:

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Sign a webhook payload with HMAC-SHA256.
 *
 * Returns the header value to set on the outgoing request:
 *   X-Ironheart-Signature: sha256=<hex-digest>
 *
 * @param payload - The request body as a JSON string. Always stringify the body
 *                  object before calling this function to ensure consistent serialisation.
 * @param secret  - The tenant's webhook secret from TenantSettings.webhookSecret
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

/**
 * Verify an inbound webhook signature.
 *
 * Uses timingSafeEqual to prevent timing attacks.
 * Returns true if the signature matches, false otherwise.
 *
 * @param payload   - The raw request body as a string (do NOT JSON.parse first)
 * @param signature - The X-Ironheart-Signature header value from the request
 * @param secret    - The tenant's stored webhook secret
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature.startsWith('sha256=')) return false
  const expected = signWebhookPayload(payload, secret)
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== receivedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

/**
 * Generate a cryptographically random webhook secret.
 * Store this in TenantSettings.webhookSecret on first use.
 */
export function generateWebhookSecret(): string {
  return require('crypto').randomBytes(32).toString('hex')
}
```

**Step 2 — Add `webhookSecret` to tenant settings schema:**

Check whether the Drizzle schema already has a `webhookSecret` column on the `TenantSettings` or `Tenant` table:

```bash
grep -n "webhookSecret\|webhook_secret" \
  /Users/lukehodges/Documents/ironheart-refactor/src/shared/db/schema.ts
```

If not present, add a Drizzle migration:
```typescript
// In src/shared/db/schema.ts — add to the tenants table definition:
webhookSecret: text('webhook_secret'),
// Then run: npx drizzle-kit generate --name=add_webhook_secret
// Then: npx drizzle-kit migrate
```

**Step 3 — Apply signing to outgoing webhooks in calendar-sync module:**

In `src/modules/calendar-sync/calendar-sync.service.ts`, wherever the service makes outgoing HTTP calls to external webhook endpoints (not Google Calendar — those use OAuth, not HMAC):

```typescript
import { signWebhookPayload } from '@/shared/webhook'

// When sending an outgoing webhook to a tenant-configured endpoint:
const payload = JSON.stringify(body)
const signature = signWebhookPayload(payload, tenant.webhookSecret)

const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Ironheart-Signature': signature,
  },
  body: payload,
})
```

**Step 4 — Verify inbound Google Calendar webhook signatures:**

In `src/app/api/integrations/google-calendar/webhook/route.ts` (created in Phase 4):

```typescript
import { verifyWebhookSignature } from '@/shared/webhook'

export async function POST(req: Request) {
  // Google Calendar push notifications use a channel token, not HMAC.
  // The channel token is set when creating the watch subscription and
  // returned in the X-Goog-Channel-Token header.
  // Verify it matches the stored channel token before emitting the Inngest event.

  const channelToken = req.headers.get('x-goog-channel-token')
  const channelId = req.headers.get('x-goog-channel-id')
  const resourceId = req.headers.get('x-goog-resource-id')

  if (!channelToken || !channelId || !resourceId) {
    return new Response('Missing required headers', { status: 401 })
  }

  // Look up the stored channel token for this channelId
  const storedToken = await getChannelToken(channelId) // query UserIntegration table
  if (!storedToken || storedToken !== channelToken) {
    log.warn({ channelId }, 'Google Calendar webhook: invalid channel token')
    return new Response('Invalid channel token', { status: 401 })
  }

  // Token valid — emit the Inngest event
  await inngest.send({
    name: 'calendar/webhook.received',
    data: { channelId, resourceId },
  })

  return new Response(null, { status: 200 })
}
```

**Verification:**

1. Send a POST to the calendar webhook route without headers → expect 401
2. Send with a valid channel token → expect 200 and Inngest event in dev dashboard
3. Outgoing webhook calls in the calendar-sync module carry `X-Ironheart-Signature` header

---

### PHASE6-T06: Write `analytics.repository.ts`

**Goal:** Replace all mock data in the analytics page with real Drizzle queries. All queries are tenant-scoped, read-only, and fast (use indexed columns only).

**File: `src/modules/tenant/analytics.repository.ts`**

```typescript
import { db } from '@/shared/db'
import { logger } from '@/shared/logger'
import { bookings, customers } from '@/shared/db/schema'
import { sql, eq, gte, lt, and, inArray, count, sum, desc } from 'drizzle-orm'
import { subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

const log = logger.child({ module: 'analytics.repository' })

export const analyticsRepository = {

  /**
   * Bookings by status for the current week and previous week.
   * Used for the status breakdown cards with week-over-week change.
   */
  async getBookingsByStatus(tenantId: string): Promise<BookingsByStatusResult> {
    const now = new Date()
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const lastWeekStart = subWeeks(thisWeekStart, 1)
    const lastWeekEnd = thisWeekStart

    const [thisWeek, lastWeek] = await Promise.all([
      db
        .select({ status: bookings.status, count: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.tenantId, tenantId),
            gte(bookings.scheduledDate, thisWeekStart)
          )
        )
        .groupBy(bookings.status),

      db
        .select({ status: bookings.status, count: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.tenantId, tenantId),
            gte(bookings.scheduledDate, lastWeekStart),
            lt(bookings.scheduledDate, lastWeekEnd)
          )
        )
        .groupBy(bookings.status),
    ])

    return { thisWeek, lastWeek }
  },

  /**
   * Revenue by month for the last 12 months.
   * Only counts CONFIRMED and COMPLETED bookings.
   * Returns an array of { month: Date, revenue: number } sorted ascending.
   */
  async getRevenueByMonth(tenantId: string): Promise<RevenueByMonthResult[]> {
    const twelveMonthsAgo = subMonths(new Date(), 12)

    const rows = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${bookings.scheduledDate})`.as('month'),
        revenue: sum(bookings.totalAmount).as('revenue'),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          inArray(bookings.status, ['CONFIRMED', 'COMPLETED']),
          gte(bookings.scheduledDate, twelveMonthsAgo)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${bookings.scheduledDate})`)
      .orderBy(sql`DATE_TRUNC('month', ${bookings.scheduledDate}) ASC`)

    return rows.map(row => ({
      month: new Date(row.month),
      revenue: Number(row.revenue ?? 0),
    }))
  },

  /**
   * Top 10 services by booking count.
   * Returns serviceId + count, sorted descending.
   * The analytics page resolves service names client-side using the
   * services list which is already loaded.
   */
  async getTopServices(tenantId: string): Promise<TopServicesResult[]> {
    return db
      .select({
        serviceId: bookings.serviceId,
        bookingCount: count(),
      })
      .from(bookings)
      .where(eq(bookings.tenantId, tenantId))
      .groupBy(bookings.serviceId)
      .orderBy(desc(count()))
      .limit(10)
  },

  /**
   * Staff utilisation: number of CONFIRMED+COMPLETED bookings per staff member.
   * Does not calculate a % utilisation — the analytics page does that using
   * staff.maxDailyBookings from the staff list already loaded on the page.
   */
  async getStaffUtilisation(tenantId: string): Promise<StaffUtilisationResult[]> {
    // Join through bookingAssignments to get per-staff booking counts
    const rows = await db.execute(sql`
      SELECT
        ba.user_id AS "userId",
        COUNT(DISTINCT b.id) AS "bookingCount"
      FROM booking_assignments ba
      JOIN bookings b ON b.id = ba.booking_id
      WHERE b.tenant_id = ${tenantId}
        AND b.status IN ('CONFIRMED', 'COMPLETED')
        AND b.scheduled_date >= NOW() - INTERVAL '30 days'
      GROUP BY ba.user_id
      ORDER BY "bookingCount" DESC
    `)
    return rows.rows as StaffUtilisationResult[]
  },

  /**
   * Customer retention: percentage of customers with 2 or more bookings.
   */
  async getCustomerRetentionRate(tenantId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE booking_count >= 2) AS returning_customers,
        COUNT(*) AS total_customers
      FROM (
        SELECT customer_id, COUNT(*) AS booking_count
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND status NOT IN ('CANCELLED', 'REJECTED', 'RELEASED')
        GROUP BY customer_id
      ) customer_counts
    `)
    const row = result.rows[0] as { returning_customers: string; total_customers: string }
    if (!row || Number(row.total_customers) === 0) return 0
    return Math.round((Number(row.returning_customers) / Number(row.total_customers)) * 100)
  },

  /**
   * Portal vs admin booking split.
   */
  async getBookingSourceSplit(tenantId: string): Promise<BookingSourceSplitResult[]> {
    return db
      .select({
        source: bookings.source,
        count: count(),
      })
      .from(bookings)
      .where(eq(bookings.tenantId, tenantId))
      .groupBy(bookings.source)
  },

  /**
   * Average booking value (totalAmount) by month for the last 6 months.
   */
  async getAverageBookingValue(tenantId: string): Promise<AverageBookingValueResult[]> {
    const sixMonthsAgo = subMonths(new Date(), 6)

    const rows = await db.execute(sql`
      SELECT
        DATE_TRUNC('month', scheduled_date) AS month,
        AVG(total_amount) AS avg_value,
        COUNT(*) AS booking_count
      FROM bookings
      WHERE tenant_id = ${tenantId}
        AND status IN ('CONFIRMED', 'COMPLETED')
        AND total_amount IS NOT NULL
        AND scheduled_date >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', scheduled_date)
      ORDER BY month ASC
    `)

    return (rows.rows as Array<{ month: string; avg_value: string; booking_count: string }>).map(row => ({
      month: new Date(row.month),
      avgValue: Math.round(Number(row.avg_value ?? 0)),
      bookingCount: Number(row.booking_count),
    }))
  },
}

// Result types
export type BookingsByStatusResult = {
  thisWeek: Array<{ status: string; count: number }>
  lastWeek: Array<{ status: string; count: number }>
}
export type RevenueByMonthResult = { month: Date; revenue: number }
export type TopServicesResult = { serviceId: string | null; bookingCount: number }
export type StaffUtilisationResult = { userId: string; bookingCount: number }
export type BookingSourceSplitResult = { source: string | null; count: number }
export type AverageBookingValueResult = { month: Date; avgValue: number; bookingCount: number }
```

**Verification:** File compiles. Run `tsc --noEmit`.

---

### PHASE6-T07: Wire analytics into tRPC and replace the mock page

**Goal:** Add `analytics` procedures to the tRPC router and update the analytics page to use real data.

**Step 1 — Create `src/modules/tenant/analytics.router.ts`:**

```typescript
import { router } from '@/shared/trpc'
import { tenantProcedure } from '@/shared/trpc'
import { analyticsRepository } from './analytics.repository'

/**
 * Analytics router — read-only queries for the analytics dashboard.
 * All procedures use tenantProcedure (requires auth + tenant context).
 * No mutations — analytics is read-only.
 */
export const analyticsRouter = router({

  getBookingsByStatus: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getBookingsByStatus(ctx.tenantId)),

  getRevenueByMonth: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getRevenueByMonth(ctx.tenantId)),

  getTopServices: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getTopServices(ctx.tenantId)),

  getStaffUtilisation: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getStaffUtilisation(ctx.tenantId)),

  getCustomerRetentionRate: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getCustomerRetentionRate(ctx.tenantId)),

  getBookingSourceSplit: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getBookingSourceSplit(ctx.tenantId)),

  getAverageBookingValue: tenantProcedure
    .query(({ ctx }) => analyticsRepository.getAverageBookingValue(ctx.tenantId)),
})
```

**Step 2 — Update `src/modules/tenant/index.ts`:**

```typescript
export { analyticsRouter } from './analytics.router'
```

**Step 3 — Mount in `src/server/root.ts`:**

```typescript
import { analyticsRouter } from '@/modules/tenant'

export const appRouter = router({
  // ... existing routers
  analytics: analyticsRouter,
})
```

**Step 4 — Update the analytics page:**

The analytics page at `src/app/admin/analytics/page.tsx` is currently server-rendered with hardcoded mock data. Replace the mock data objects with tRPC query calls.

The page is a client component (`'use client'`). Use the tRPC React Query hooks:

```typescript
// Replace hardcoded mock data arrays with:
const { data: bookingsByStatus, isLoading: statusLoading } =
  trpc.analytics.getBookingsByStatus.useQuery()

const { data: revenueByMonth, isLoading: revenueLoading } =
  trpc.analytics.getRevenueByMonth.useQuery()

const { data: topServices } = trpc.analytics.getTopServices.useQuery()

const { data: retentionRate } = trpc.analytics.getCustomerRetentionRate.useQuery()

const { data: sourceSplit } = trpc.analytics.getBookingSourceSplit.useQuery()

const { data: avgBookingValue } = trpc.analytics.getAverageBookingValue.useQuery()
```

Replace each hardcoded data array passed to Recharts components with the real data:
- `data={revenueByMonth ?? []}` instead of `data={mockRevenueData}`
- `data={topServices ?? []}` instead of `data={mockServicesData}`
- etc.

Add loading states: when `isLoading` is true, show skeleton cards instead of charts.

**Verification:**

1. Start `npm run dev` with a real `DATABASE_URL` pointing to the test tenant
2. Navigate to `/admin/analytics`
3. Charts should show real data (or empty state if no bookings exist) rather than the hardcoded demo values
4. Open Network tab — confirm tRPC queries are being made to `/api/trpc/analytics.*`

---

### PHASE6-T08: Fix all remaining TypeScript errors

**Goal:** `tsc --noEmit` passes with zero errors. No pre-existing errors carried forward.

**Step 1 — Find all current errors:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsc --noEmit 2>&1 | head -60
```

**Step 2 — Fix by category:**

**Category A: `resolvedBy` field in review module**

Location: `src/modules/review/review.router.ts` or `review.service.ts`

The error is a field name or type mismatch on the `Review` model's `resolvedBy` relation. Check the Drizzle schema:

```bash
grep -n "resolvedBy\|resolved_by" \
  /Users/lukehodges/Documents/ironheart-refactor/src/shared/db/schema.ts
```

Fix: match the exact column name in the Drizzle schema. If the column is `resolvedById: text(...)`, use `resolvedById: userId` in the update call, not the relation syntax.

**Category B: `tenantId` type in settings/tenant module**

Location: `src/modules/tenant/` or any module router

The `tenantId` in context is typed as `string` but the Drizzle column may be `uuid`. In Drizzle with `postgres.js`, UUID columns come back as strings — this is usually fine. Check if the error is:

- A Drizzle `where` clause: `eq(table.tenantId, ctx.tenantId)` — this is fine, `eq` accepts `string`
- A type assertion issue: if Drizzle schema has `tenantId: uuid(...)`, ensure the type resolves to `string` not `UUID` (Drizzle's UUID type resolves to `string` by default — this should not be an error)

Fix: check the exact error message from `tsc --noEmit` and correct the type at the call site.

**Category C: `JsonArray` cast in workflow module**

Location: `src/modules/workflow/workflow.service.ts` or `workflow.repository.ts`

The `workflow.actions` column stores JSON in the database. Drizzle returns this as `unknown` for `json()` columns, or `JsonValue` (which is `string | number | boolean | null | JsonArray | JsonObject`).

Define a proper type:

```typescript
// In src/modules/workflow/workflow.types.ts
export interface WorkflowAction {
  type: string
  config: Record<string, unknown>
  order: number
  // Add fields matching the actual JSON structure stored in the DB
  // Reference: src/server/routers/workflow.ts in the legacy codebase for the exact shape
}

// In the service/repository:
// Instead of: workflow.actions as any
// Use:
import type { WorkflowAction } from './workflow.types'

const actions = workflow.actions as WorkflowAction[]
```

**Step 3 — Run `tsc --noEmit` after each fix:**

```bash
npx tsc --noEmit
```

Iterate until the output is:

```
# No output = zero errors
```

**Verification:** `npx tsc --noEmit` produces no output and exits with code 0.

---

### PHASE6-T09: Install Vitest and configure the test environment

**Goal:** Set up the integration test infrastructure before writing tests.

**Step 1 — Install Vitest:**

```bash
npm install --save-dev vitest @vitest/coverage-v8 vite-tsconfig-paths
```

**Step 2 — Create `vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/shared/__tests__/setup.ts'],
    // Run tests sequentially — integration tests share a database
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: [
        'src/modules/booking/booking.service.ts',
        'src/modules/scheduling/scheduling.service.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
      },
    },
  },
})
```

**Step 3 — Create `src/shared/__tests__/setup.ts`:**

This file runs before every test file. It sets environment variables and cleans up the test tenant.

```typescript
import { config } from 'dotenv'
import { db } from '@/shared/db'
import { bookings, availableSlots, customers, bookingAssignments, bookingStatusHistory } from '@/shared/db/schema'
import { eq } from 'drizzle-orm'

// Load .env.local before tests run
config({ path: '.env.local' })

export const TEST_TENANT_ID = 'test-tenant-phase6'

/**
 * Clean up all test data created during tests.
 * Called in afterEach to leave the database in a clean state.
 */
export async function cleanTestData() {
  // Delete in dependency order (FK constraints)
  await db.delete(bookingAssignments).where(
    // Delete assignments for test tenant's bookings
    // Use a subquery or join if the schema doesn't have tenantId on assignments
  )
  await db.delete(bookingStatusHistory)
    // Only delete history for test bookings
  await db.delete(bookings).where(eq(bookings.tenantId, TEST_TENANT_ID))
  await db.delete(availableSlots).where(eq(availableSlots.tenantId, TEST_TENANT_ID))
}

// Global cleanup after all tests
afterAll(async () => {
  await cleanTestData()
})
```

**Step 4 — Add test scripts to `package.json`:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Verification:**

```bash
npx vitest run
# Expected: "No test files found" — that's correct at this stage, tests are added in T10
```

---

### PHASE6-T10: Write BookingService integration tests

**Goal:** Integration tests for the two highest-risk paths in `BookingService`. Tests run against the real test database. Inngest is mocked — no real events fired.

**File: `src/shared/__tests__/booking.service.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { bookingService } from '@/modules/booking/booking.service'
import { bookingRepository } from '@/modules/booking/booking.repository'
import { schedulingRepository } from '@/modules/scheduling/scheduling.repository'
import { db } from '@/shared/db'
import { availableSlots, bookings } from '@/shared/db/schema'
import { TEST_TENANT_ID, cleanTestData } from './setup'
import { ConflictError, NotFoundError } from '@/shared/errors'

// Mock Inngest — do NOT fire real events in tests
vi.mock('@/shared/inngest', () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}))

// Import the mocked inngest for assertions
import { inngest } from '@/shared/inngest'

const TEST_CUSTOMER_ID = 'test-customer-00000000-0000-0000-0000-000000000001'
const TEST_SERVICE_ID = 'test-service-00000000-0000-0000-0000-000000000001'

describe('BookingService.createBooking', () => {

  let testSlotId: string

  beforeEach(async () => {
    await cleanTestData()
    vi.clearAllMocks()

    // Create a test slot with capacity 1
    const [slot] = await db
      .insert(availableSlots)
      .values({
        tenantId: TEST_TENANT_ID,
        date: new Date('2026-06-01'),
        time: '10:00',
        endTime: '11:00',
        available: true,
        staffIds: [],
        serviceIds: [TEST_SERVICE_ID],
        capacity: 1,
        bookedCount: 0,
        requiresApproval: false,
        sortOrder: 0,
      })
      .returning({ id: availableSlots.id })

    testSlotId = slot.id
  })

  afterEach(async () => {
    await cleanTestData()
  })

  it('creates a RESERVED booking when slotId is provided from portal', async () => {
    const booking = await bookingService.createBooking(TEST_TENANT_ID, {
      customerId: TEST_CUSTOMER_ID,
      serviceId: TEST_SERVICE_ID,
      scheduledDate: new Date('2026-06-01'),
      scheduledTime: '10:00',
      durationMinutes: 60,
      slotId: testSlotId,
      source: 'PORTAL',
      skipReservation: false,
    })

    expect(booking.status).toBe('RESERVED')
    expect(booking.reservedAt).not.toBeNull()
    expect(booking.reservationExpiresAt).not.toBeNull()
    expect(booking.slotId).toBe(testSlotId)

    // Verify slot capacity was decremented
    const slot = await db.query.availableSlots.findFirst({
      where: (s, { eq }) => eq(s.id, testSlotId),
    })
    expect(slot?.bookedCount).toBe(1)
  })

  it('emits slot/reserved Inngest event when booking is RESERVED', async () => {
    await bookingService.createBooking(TEST_TENANT_ID, {
      customerId: TEST_CUSTOMER_ID,
      serviceId: TEST_SERVICE_ID,
      scheduledDate: new Date('2026-06-01'),
      scheduledTime: '10:00',
      durationMinutes: 60,
      slotId: testSlotId,
      source: 'PORTAL',
    })

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'slot/reserved',
        data: expect.objectContaining({
          slotId: testSlotId,
          tenantId: TEST_TENANT_ID,
        }),
      })
    )
  })

  it('creates a PENDING booking for admin source (no reservation)', async () => {
    const booking = await bookingService.createBooking(TEST_TENANT_ID, {
      customerId: TEST_CUSTOMER_ID,
      serviceId: TEST_SERVICE_ID,
      scheduledDate: new Date('2026-06-01'),
      scheduledTime: '10:00',
      durationMinutes: 60,
      source: 'ADMIN',
    })

    expect(booking.status).toBe('PENDING')
    expect(booking.reservedAt).toBeNull()
    expect(booking.reservationExpiresAt).toBeNull()
  })

  it('throws ConflictError when slot is at full capacity', async () => {
    // First booking takes the slot
    await bookingService.createBooking(TEST_TENANT_ID, {
      customerId: TEST_CUSTOMER_ID,
      serviceId: TEST_SERVICE_ID,
      scheduledDate: new Date('2026-06-01'),
      scheduledTime: '10:00',
      durationMinutes: 60,
      slotId: testSlotId,
      source: 'PORTAL',
    })

    // Second booking should fail — slot is full
    await expect(
      bookingService.createBooking(TEST_TENANT_ID, {
        customerId: 'test-customer-00000000-0000-0000-0000-000000000002',
        serviceId: TEST_SERVICE_ID,
        scheduledDate: new Date('2026-06-01'),
        scheduledTime: '10:00',
        durationMinutes: 60,
        slotId: testSlotId,
        source: 'PORTAL',
      })
    ).rejects.toThrow(ConflictError)
  })

  it('releases distributed lock even when booking fails', async () => {
    // Fill the slot to trigger an error
    await db
      .update(availableSlots)
      .set({ bookedCount: 1 }) // already at capacity
      .where((s, { eq }) => eq(s.id, testSlotId))

    await expect(
      bookingService.createBooking(TEST_TENANT_ID, {
        customerId: TEST_CUSTOMER_ID,
        serviceId: TEST_SERVICE_ID,
        scheduledDate: new Date('2026-06-01'),
        scheduledTime: '10:00',
        durationMinutes: 60,
        slotId: testSlotId,
        source: 'PORTAL',
      })
    ).rejects.toThrow(ConflictError)

    // Verify: a second request can now acquire the lock (it was released)
    // If the lock was not released, this would hang or return slot_locked
    // We test this by checking the lock key doesn't exist in Redis
    const { redis } = await import('@/shared/redis')
    const lockValue = await redis.get(`lock:slot:${testSlotId}`)
    expect(lockValue).toBeNull()
  })

})
```

**File: `src/shared/__tests__/booking.service.confirm.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { bookingService } from '@/modules/booking/booking.service'
import { db } from '@/shared/db'
import { bookings, availableSlots } from '@/shared/db/schema'
import { TEST_TENANT_ID, cleanTestData } from './setup'
import { ValidationError } from '@/shared/errors'
import { addMinutes, subMinutes } from 'date-fns'

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

import { inngest } from '@/shared/inngest'

describe('BookingService.confirmReservation', () => {

  let testBookingId: string

  beforeEach(async () => {
    await cleanTestData()
    vi.clearAllMocks()

    // Create a RESERVED booking
    const [booking] = await db
      .insert(bookings)
      .values({
        tenantId: TEST_TENANT_ID,
        bookingNumber: 'BK-TEST-20260601-001',
        customerId: 'test-customer-00000000-0000-0000-0000-000000000001',
        serviceId: 'test-service-00000000-0000-0000-0000-000000000001',
        scheduledDate: new Date('2026-06-01'),
        scheduledTime: '10:00',
        durationMinutes: 60,
        status: 'RESERVED',
        statusChangedAt: new Date(),
        reservedAt: new Date(),
        reservationExpiresAt: addMinutes(new Date(), 15), // expires in 15 minutes
        source: 'PORTAL',
        requiresApproval: false,
        depositPaid: 0,
      })
      .returning({ id: bookings.id })

    testBookingId = booking.id
  })

  afterEach(async () => {
    await cleanTestData()
  })

  it('transitions booking from RESERVED to CONFIRMED', async () => {
    const confirmed = await bookingService.confirmReservation(testBookingId)

    expect(confirmed.status).toBe('CONFIRMED')
    expect(confirmed.reservedAt).not.toBeNull()       // preserved
    expect(confirmed.reservationExpiresAt).toBeNull() // cleared on confirm
  })

  it('emits booking/confirmed Inngest event', async () => {
    await bookingService.confirmReservation(testBookingId)

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'booking/confirmed',
        data: expect.objectContaining({
          bookingId: testBookingId,
          tenantId: TEST_TENANT_ID,
        }),
      })
    )
  })

  it('emits calendar/sync.push event after confirmation', async () => {
    await bookingService.confirmReservation(testBookingId)

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'calendar/sync.push' })
    )
  })

  it('throws ValidationError when reservation has expired', async () => {
    // Update the booking to have an expired reservation
    await db
      .update(bookings)
      .set({ reservationExpiresAt: subMinutes(new Date(), 1) }) // expired 1 minute ago
      .where((b, { eq }) => eq(b.id, testBookingId))

    await expect(
      bookingService.confirmReservation(testBookingId)
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when booking is not in RESERVED status', async () => {
    // Set booking to CONFIRMED already
    await db
      .update(bookings)
      .set({ status: 'CONFIRMED', reservationExpiresAt: null })
      .where((b, { eq }) => eq(b.id, testBookingId))

    await expect(
      bookingService.confirmReservation(testBookingId)
    ).rejects.toThrow(ValidationError)
  })

  it('throws NotFoundError for non-existent bookingId', async () => {
    const { NotFoundError } = await import('@/shared/errors')

    await expect(
      bookingService.confirmReservation('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(NotFoundError)
  })

})
```

**Verification:**

```bash
npx vitest run
```

Expected output:
```
PASS  src/shared/__tests__/booking.service.test.ts
PASS  src/shared/__tests__/booking.service.confirm.test.ts

Test Files   2 passed (2)
Tests        10 passed (10)
```

If tests fail because test data (tenant, customer, service) doesn't exist in the database, add seed data creation to `setup.ts` in a `beforeAll` block.

---

### PHASE6-T10b: Implement audit log

**Goal:** Enterprise customers require an audit trail for compliance. All permission-sensitive operations must be logged to an append-only `audit_logs` table. This also satisfies the audit trail requirement for GDPR erasure requests.

**Schema addition (add to Drizzle schema):**

```typescript
// src/shared/db/schemas/audit.schema.ts
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: text('entity_type').notNull(),   // 'booking', 'user', 'permission', etc.
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),            // 'created', 'updated', 'deleted', 'status_changed', 'permission_granted'
  changedById: uuid('changed_by_id'),          // null for system actions
  diff: jsonb('diff'),                         // { before: {...}, after: {...} }
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
})
```

**Audit logger utility:**

```typescript
// src/shared/audit.ts
import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'

export async function auditLog(params: {
  tenantId: string
  entityType: string
  entityId: string
  action: string
  changedById?: string
  diff?: { before?: unknown; after?: unknown }
  ipAddress?: string
}) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    ...params,
    timestamp: new Date(),
  })
}
```

**Where to call it:**

- `booking.service.ts`: all status changes (`createBooking`, `cancelBooking`, `approveBooking`, `rejectBooking`)
- `auth module`: permission grants/revocations
- `team module`: role changes, staff activation/deactivation
- `tenant module`: settings changes
- `gdpr.service.ts` (T10c below): erasure requests

**tRPC procedure (admin query):**

```typescript
// In the tenant router or a dedicated audit.router.ts
getAuditLog: permissionProcedure('bookings:read')
  .input(z.object({
    entityType: z.string().optional(),
    from: z.date().optional(),
    to: z.date().optional(),
    limit: z.number().min(1).max(200).default(50),
  }))
  .query(({ ctx, input }) =>
    db.select().from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, ctx.tenantId),
          input.entityType ? eq(auditLogs.entityType, input.entityType) : undefined,
          input.from ? gte(auditLogs.timestamp, input.from) : undefined,
          input.to ? lt(auditLogs.timestamp, input.to) : undefined,
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(input.limit)
  ),
```

**Success Criteria:**

- [ ] Status change on a booking creates an `audit_logs` row
- [ ] Permission grant creates an `audit_logs` row with before/after diff
- [ ] Admin can query audit log by entity type and date range via tRPC

---

### PHASE6-T10c: GDPR compliance — right to erasure and data export

**Why:** UK GDPR (the post-Brexit equivalent of EU GDPR) is a legal requirement for any UK-based SaaS platform processing personal data. Failure to provide right to erasure (Article 17) and right to data portability (Article 20) is a regulatory violation.

**File: `src/modules/customer/gdpr.service.ts`**

```typescript
export const gdprService = {
  /**
   * Right to Erasure (GDPR Article 17)
   * Anonymises all personal data for a customer by email address.
   * Does NOT delete booking records (required for business/tax records).
   * Replaces PII with anonymised values.
   */
  async eraseCustomer(tenantId: string, email: string, requestedById: string) {
    // 1. Find customer by email + tenantId
    // 2. Anonymise customer record:
    //    firstName → 'ERASED', lastName → 'ERASED'
    //    email → `erased-{customerId}@erased.invalid`
    //    phone → null, address → null, notes → null
    // 3. Anonymise CustomerNote records
    // 4. Remove from any marketing lists (SentMessage etc.)
    // 5. Log the erasure request to AuditLog
    // 6. Does NOT touch Booking records (legal retention requirement)
    // Returns: { customerId, anonymisedAt, recordsAffected }
  },

  /**
   * Right to Data Portability (GDPR Article 20)
   * Generates a ZIP containing all data held for a customer.
   */
  async exportCustomerData(tenantId: string, email: string): Promise<Buffer> {
    // 1. Find customer
    // 2. Collect: customer profile, all bookings, all forms, all notes, all communications
    // 3. Generate CSV files (one per entity type)
    // 4. Package into ZIP
    // 5. Return ZIP buffer (caller emails it to customer or returns as download)
  },
}
```

**tRPC procedures (add to customer router or a new `gdpr.router.ts`):**

```typescript
eraseCustomer: permissionProcedure('customers:delete')
  .input(z.object({ email: z.string().email(), confirmEmail: z.string().email() }))
  .mutation(({ ctx, input }) => {
    if (input.email !== input.confirmEmail) throw new ValidationError('Email confirmation does not match')
    return gdprService.eraseCustomer(ctx.tenantId, input.email, ctx.user.id)
  }),

exportCustomerData: permissionProcedure('customers:read')
  .input(z.object({ email: z.string().email() }))
  .mutation(({ ctx, input }) =>
    gdprService.exportCustomerData(ctx.tenantId, input.email)
  ),
```

**Success Criteria:**

- [ ] `eraseCustomer` anonymises all PII fields without deleting booking records
- [ ] `exportCustomerData` generates a downloadable ZIP with all customer data

---

### PHASE6-T10d: Move platform admin to database-backed flag

**Goal:** Replace the `PLATFORM_ADMIN_EMAILS` environment variable with a database-backed `isPlatformAdmin` flag on the `users` table. The env var becomes a bootstrap-only fallback that auto-promotes on first use and should then be removed.

**Why:** The env var approach is not auditable, cannot be changed without a redeployment, and cannot be revoked without touching infrastructure. A database flag is auditable (every grant/revoke goes through `auditLog`), can be changed at runtime, and survives deployments.

**Step 1 — Migration: add `isPlatformAdmin` to the users table:**

```typescript
// New migration: add isPlatformAdmin to users table
// src/shared/db/schemas/auth.schema.ts — add column:
isPlatformAdmin: boolean('is_platform_admin').notNull().default(false)
```

**Step 2 — Update `platformAdminProcedure` in `src/shared/trpc.ts`:**

```typescript
export const platformAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Primary check: database flag (fast, auditable)
  if (ctx.user?.isPlatformAdmin) {
    return next({ ctx })
  }

  // Bootstrap fallback: PLATFORM_ADMIN_EMAILS can grant first admin access.
  // This env var should be REMOVED after the first admin is provisioned via the DB flag.
  const bootstrapEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
  if (bootstrapEmails.includes(ctx.user?.email ?? '')) {
    // Auto-promote to DB flag on first bootstrap login
    await db.update(users)
      .set({ isPlatformAdmin: true })
      .where(eq(users.id, ctx.user.id))
    return next({ ctx })
  }

  throw new TRPCError({ code: 'FORBIDDEN', message: 'Platform admin access required' })
})
```

**Step 3 — Add grant/revoke procedures (platform admin only):**

```typescript
// Only callable by existing platform admins
grantPlatformAdmin: platformAdminProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    await db.update(users).set({ isPlatformAdmin: true }).where(eq(users.id, input.userId))
    await auditLog({
      tenantId: ctx.tenantId,
      entityType: 'user',
      entityId: input.userId,
      action: 'platform_admin_granted',
      changedById: ctx.user.id,
    })
  }),

revokePlatformAdmin: platformAdminProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    await db.update(users).set({ isPlatformAdmin: false }).where(eq(users.id, input.userId))
    await auditLog({
      tenantId: ctx.tenantId,
      entityType: 'user',
      entityId: input.userId,
      action: 'platform_admin_revoked',
      changedById: ctx.user.id,
    })
  }),
```

**Step 4 — Update `.env.example` with deprecation note:**

```
# DEPRECATED after Phase 6: Use DB isPlatformAdmin flag instead.
# Keep only for initial bootstrap. Remove after the first admin is provisioned via the DB.
# PLATFORM_ADMIN_EMAILS=admin@yourdomain.com
```

**Verification:**

1. Run the migration. Confirm `is_platform_admin` column exists on `users` table.
2. Set `PLATFORM_ADMIN_EMAILS` to a test email and log in — verify the user is auto-promoted (`isPlatformAdmin = true` in DB).
3. Remove the env var. Log in again — verify platform admin access still works via the DB flag.
4. Call `revokePlatformAdmin` — verify the DB flag is cleared and access is denied on next request.

---

### PHASE6-T11: Security audit

**Goal:** Systematic review of every security concern listed in the phase requirements. Document findings and fix any issues found.

**Audit checklist — work through each item:**

**1. Public procedures — tenant data leakage:**

```bash
grep -rn "publicProcedure" \
  /Users/lukehodges/Documents/ironheart-refactor/src/modules/ \
  --include="*.ts"
```

For each `publicProcedure` found, verify:
- Does it return any data without filtering by `tenantId` or requiring a `slug`?
- `getPortalConfig` queries by `slug` — tenant-scoped. OK.
- `getSlotsForDate` queries by `slug` — tenant-scoped. OK.
- `confirmReservation` queries by `bookingId` only — this is intentional (public confirmation link). OK but verify it does not return other tenant's data.
- `getPublicById` (booking) — verify it returns only the specific booking's fields needed for the confirmation page, not sensitive admin fields.

Fix any procedure that returns data without tenant scoping.

**2. Drizzle repository `tenantId` audit:**

```bash
# Find all repository files
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/*/

# For each *.repository.ts file, check that every db query includes tenantId
grep -n "db\." \
  /Users/lukehodges/Documents/ironheart-refactor/src/modules/booking/booking.repository.ts \
  | grep -v "tenantId"
```

Review every Drizzle query in every `*.repository.ts` file. Every query against a tenant-scoped table must have `eq(table.tenantId, tenantId)` in the WHERE clause. Cross-tenant queries (e.g., analytics cron operations) are intentional exceptions — mark them with a comment:

```typescript
// intentionally cross-tenant — reads from all tenants for cron operation
```

**3. Google Calendar webhook signature validation:**

Verify the fix from T05 is in place. Check `src/app/api/integrations/google-calendar/webhook/route.ts`:
- Returns 401 without valid channel token
- Does not process the webhook payload before validation

**4. Hardcoded secrets and API keys:**

```bash
grep -rn "sk_\|pk_\|AKIA\|password.*=.*['\"][a-zA-Z0-9]\{20,\}" \
  /Users/lukehodges/Documents/ironheart-refactor/src/ \
  --include="*.ts" --include="*.tsx" | grep -v ".env" | grep -v "example"
```

Also check:
```bash
grep -rn "process\.env\." \
  /Users/lukehodges/Documents/ironheart-refactor/src/ \
  --include="*.ts" | awk -F'process.env.' '{print $2}' | awk -F'[^A-Z_]' '{print $1}' | sort -u
```

This lists every environment variable referenced in source code. Cross-reference with `.env.example` — any variable used in code but missing from `.env.example` must be added.

**5. `.env.example` completeness check:**

The complete list of environment variables across all phases (add any missing ones to `.env.example`):

```bash
# Phase 0
DATABASE_URL
WORKOS_CLIENT_ID, WORKOS_API_KEY, WORKOS_REDIRECT_URI, WORKOS_COOKIE_PASSWORD
INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN
DEFAULT_TENANT_SLUG, LOG_LEVEL, PLATFORM_ADMIN_EMAILS

# Phase 2
MAPBOX_ACCESS_TOKEN (travel time)

# Phase 4
RESEND_API_KEY (email sending)
RESEND_FROM_EMAIL
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (SMS)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (Calendar OAuth)

# Phase 6 (new)
# None — uses existing Redis client for rate limiting
```

**6. Fix any issues found:**

Document each issue as a comment in this audit section, then fix it. Common issues to look for:
- A `publicProcedure` that returns booking counts without tenant filtering
- A repository method that was added quickly without the `tenantId` WHERE clause
- A hardcoded test credential in a seed file that was accidentally committed

**Verification:** All checklist items reviewed. Any issues found are documented and fixed. `tsc --noEmit` still passes.

---

### PHASE6-T12: Final end-to-end verification

**Goal:** Full system works end-to-end. This is the acceptance gate for Phase 6 and the entire project.

**Prerequisite environment variables (must be set in `.env.local`):**

```bash
DATABASE_URL=postgresql://...       # Test database with data
WORKOS_CLIENT_ID=...                # Phase 3 auth
WORKOS_API_KEY=...
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
WORKOS_COOKIE_PASSWORD=...
INNGEST_EVENT_KEY=...               # Or use dev server (no key needed locally)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RESEND_API_KEY=...                  # Phase 4 email
GOOGLE_CLIENT_ID=...                # Phase 4 calendar
GOOGLE_CLIENT_SECRET=...
```

**Verification checklist — work through each item in order:**

**TypeScript:**
```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsc --noEmit
# Expected: no output, exit code 0
```

**Build:**
```bash
npm run build
# Expected: exit code 0, no "Error:" lines
```

**Tests:**
```bash
npx vitest run
# Expected: all tests pass
```

**Inngest dashboard:**
```bash
npm run dev &
npx inngest-cli@latest dev
# Visit http://localhost:8288
# Expected: 9+ functions registered:
#   Phase 1: release-expired-reservation, send-booking-confirmation-email, push-booking-to-calendar
#   Phase 2: schedule-booking-reminders, send-reminders-cron, sync-calendars-cron,
#            pull-calendar-events-cron, refresh-calendar-tokens-cron, renew-watch-channels-cron
#   Phase 4+: notification functions, calendar sync functions (as added)
```

**Auth flow:**
1. Navigate to `http://localhost:3000/sign-in`
2. Sign in with a test WorkOS user (tenant OWNER)
3. Verify redirect to admin dashboard
4. Verify the session contains `tenantId` and permissions
5. Sign in as a MEMBER user — verify RBAC filtering works (only their bookings visible)

**Full booking E2E:**
1. Navigate to the portal (`/portal/[test-tenant-slug]`)
2. Select a service, date, and time slot
3. Fill in customer details and submit
4. Verify: booking created with RESERVED status in the database
5. Verify: Inngest dev server shows `slot/reserved` event fired
6. Click "Confirm Booking" on the confirmation page
7. Verify: booking transitions to CONFIRMED
8. Verify: Inngest shows `booking/confirmed` event, `slot/reserved` expiry event cancelled
9. Verify: Resend dashboard (https://resend.com/emails) shows the confirmation email delivered
10. Verify: Google Calendar shows the new event in the test staff member's calendar

**Rate limiting:**
```bash
# Run 35 concurrent requests to the slot endpoint
# (requires jq: brew install jq)
for i in $(seq 1 35); do
  curl -s -X POST http://localhost:3000/api/trpc/slotAvailability.getSlotsForDate \
    -H "Content-Type: application/json" \
    -d '{"0":{"json":{"slug":"test","date":"2026-06-01"}}}' | jq -r '.[] | .error.json.code // "ok"'
done
# Expected: first 30 return "ok", last 5 return "TOO_MANY_REQUESTS"
```

**Analytics:**
1. Navigate to `/admin/analytics` while authenticated as tenant OWNER
2. Verify charts show data (not the old hardcoded mock values)
3. Verify the tRPC calls appear in the Network tab

**Distributed lock (concurrent booking):**
Open two browser tabs simultaneously. In both tabs, navigate to the portal and select the LAST available slot (capacity = 1). Submit both booking forms at exactly the same time (use two browser tabs with forms pre-filled, click submit in both tabs quickly).

Expected: one booking succeeds (RESERVED), the other tab shows "Slot just became unavailable" error.

**Console.log audit (final):**
```bash
grep -rn "console\.log\|console\.error\|console\.warn" \
  /Users/lukehodges/Documents/ironheart-refactor/src/modules/ \
  /Users/lukehodges/Documents/ironheart-refactor/src/shared/ \
  --include="*.ts" --include="*.tsx" | wc -l
# Expected: 0
```

---

## Key Design Decisions

### 1. Request ID in context, not in child logger

The `requestId` is stored as a `string` in the tRPC context, not as a pre-built child logger. This is because:
- SuperJSON (used by tRPC) serialises the context — loggers are not serialisable
- Storing the string means each module creates its own child logger as needed: `moduleLog.child({ requestId })`
- The request ID flows as a parameter to service methods that need it, keeping the dependency explicit

### 2. Distributed lock TTL of 5000ms

The lock TTL must be:
- Long enough for the critical section to complete (capacity check + Drizzle transaction ≈ 50–200ms)
- Short enough to not block legitimate retries if the process crashes mid-lock

5000ms (5 seconds) gives 25x safety margin over the expected 200ms critical section. If the Vercel function crashes while holding the lock, it auto-expires in 5 seconds — a brief window where the slot appears locked to other requests, then becomes available again.

### 3. Rate limiting only on public procedures

Admin procedures are already authenticated via WorkOS — an attacker cannot spam them without a valid session token (which requires real authentication). Rate limiting on authenticated endpoints adds latency without meaningful security benefit. Apply rate limiting only to `publicProcedure` endpoints.

### 4. Layered rate limiting: per-IP + per-tenant + per-user

IP-only rate limiting has a known failure mode for corporate customers behind a shared egress proxy — all staff share one IP address. If a tenant has 50 staff using the admin portal simultaneously, a per-IP limit of 30/min would block legitimate users.

Three layers are applied:

- **Per-IP (30/min):** Protects against individual abuse and portal scraping. Applied to all `publicProcedure` endpoints.
- **Per-tenant (500/min):** Prevents one high-traffic tenant from starving resources for all others. Applied using `ctx.tenantId` as the key. A noisy tenant hits this ceiling before they can impact system-wide throughput.
- **Per-user (60/min):** Applied to authenticated routes where the `userId` is available from the session. Allows corporate environments (many users, one IP) to operate normally while still capping individual accounts.

The per-tenant and per-user limiters use Upstash sliding windows with separate Redis key prefixes (`rate:tenant:*`, `rate:user:*`) so they can be monitored and tuned independently.

### 5. Analytics as a single repository, not a full module

Adding an `analytics` module would require a full module directory with schema, types, service, repository, router — for what is essentially 7 read-only SQL queries. Instead:
- One `analytics.repository.ts` in the existing `tenant` module
- One `analytics.router.ts` in the `tenant` module
- Both exported from `src/modules/tenant/index.ts`

This avoids module sprawl. The tenant module is the correct home for cross-cutting admin queries about the tenant's data.

### 6. Integration tests use the real database, not mocks

The booking service is not meaningfully testable with a mocked database. The service's value is in the interaction between business logic and actual SQL — capacity checks, transaction atomicity, FK constraints. Mocking the repository removes what you actually need to test.

Trade-off: tests require a running PostgreSQL instance with the correct schema. Solution: use `DATABASE_URL` from `.env.local` (the same database as development), test against a `test-tenant-phase6` tenant ID, and clean up after each test. This is the same approach used by the Prisma team and most production-grade Node.js teams.

The Inngest client IS mocked — real Inngest events should not fire during tests. `vi.mock('@/shared/inngest', () => ({ inngest: { send: vi.fn() } }))` intercepts all `inngest.send()` calls and records them for assertion without sending anything to Inngest.

### 7. HMAC signing for outgoing webhooks, channel token for Google Calendar

Google Calendar push notifications use their own security mechanism: a channel token set when creating the watch subscription (`X-Goog-Channel-Token` header). This is Google's equivalent of HMAC — it's a pre-shared token per channel. Use this for inbound Google Calendar webhooks.

For outgoing webhooks (Ironheart → tenant-configured external endpoints), use HMAC-SHA256 signing. This is the industry standard (Stripe, GitHub, and most SaaS platforms use this pattern). The `X-Ironheart-Signature: sha256=<hex>` header format matches the Stripe webhook signature format, which is familiar to most developers.

---

## Environment Variables Added in Phase 6

No new environment variables are added in Phase 6. All infrastructure (Redis for locks and rate limiting, Sentry for monitoring) was already configured in earlier phases.

The `.env.example` audit in T11 may identify variables added in Phases 3–5 that were not yet documented. Add any missing ones in T11.

---

## Files to Read in Legacy Codebase (reference only)

| File | What to read for |
|------|-----------------|
| `src/app/admin/analytics/page.tsx` | Full mock data structure to understand what charts need to be replaced |
| `src/server/routers/review.ts` lines 315–360 | `resolvedBy` field — understand the relation before fixing the type error |
| `src/server/routers/workflow.ts` lines 380–410 | `actions as any` casts — understand the JSON shape |
| `src/server/routers/settings.ts` lines 130–145 | `tenantId` usage in settings mutations |
| `src/lib/cron/release-slots.ts` | Transaction pattern for the capacity check — now moved to distributed lock |

---

*Phase 6 Plan — Ironheart Refactor*
*Written: 2026-02-19*
