# Ironheart Refactor — CTO Technical Review: Post-Implementation

**Reviewer:** CTO (Claude Sonnet 4.5)
**Date:** 2026-02-19
**Scope:** Phases 0–3 implemented code (auth, scheduling, booking modules)
**Method:** Deep read of actual source files, cross-referenced against original CTO review
**Build status:** `tsc --noEmit` passes, `npm run build` exits 0, 73/73 tests pass

---

## Executive Summary

The implementation has addressed several of the original review's most critical concerns — most notably the distributed lock, health endpoints, and `isPlatformAdmin` database flag — and the code quality across the core modules is noticeably stronger than many projects of this phase. However, a meaningful subset of original concerns remain open, and new issues have emerged from reading the implementation directly. The test suite has been extended but remains shallow on integration coverage. Several high-leverage foundation capabilities are missing before Phase 4 work begins.

The overall trajectory is positive. The architectural discipline — services throwing domain errors, repositories enforcing tenant isolation, Inngest handlers validating payloads at entry — is consistent and correct. The codebase is in better shape than the original review predicted it would be at this point.

---

## Section 1: What Was Addressed From the Original Review

### 1.1 Health Check Endpoints — FULLY ADDRESSED

**Original concern (§5.7):** No `/api/health` or `/api/ready` endpoints.

**Implementation:** Both endpoints exist and are correctly implemented.

`src/app/api/health/route.ts` — Simple liveness probe, no dependencies, returns `{ status: "ok", timestamp }`. Correctly marked `runtime = "nodejs"` and `dynamic = "force-dynamic"` to prevent static caching.

`src/app/api/ready/route.ts` — Readiness probe that actually validates DB and Redis connectivity via `db.execute(sql`SELECT 1`)` and `redis.ping()`. Returns structured per-service status (`db`, `redis`) and a 503 on partial failure. This is a well-implemented readiness probe — better than the two-liner suggested in the original review. Per-service reporting allows operators to distinguish DB failure from Redis failure.

**Verdict:** Fully satisfies the original concern. The readiness probe goes beyond the minimum spec.

---

### 1.2 Distributed Lock for Slot Capacity — FULLY ADDRESSED

**Original concern (§4.2, §10.2):** Overbooking window from Phase 1–5 because the distributed lock was deferred to Phase 6.

**Implementation:** `src/modules/booking/booking.service.ts` implements `acquireSlotLock` and `releaseSlotLock` using Upstash Redis with `SET NX PX 5000`.

```typescript
const acquired = await redis.set(lockKey, "1", { nx: true, px: SLOT_LOCK_TTL_MS });
return acquired ? lockKey : null;
```

The lock key includes `tenantId` to prevent cross-tenant lock collisions (`lock:slot:${tenantId}:${slotId}`). Lock release is in a `finally` block so it executes even on thrown errors. The 5-second TTL is appropriate for the slot capacity check + booking insert + Inngest send sequence.

One subtlety worth noting: the service does a pre-lock capacity check at lines 78–81 followed by the `decrementSlotCapacity` call inside the lock. The pre-lock check guards the happy path, the transactional decrement inside the lock is the actual safety net. This double-check pattern is correct.

**Remaining gap:** The lock key uses `SET NX` with a fixed value `"1"`. This means if the 5-second TTL expires mid-operation and another request acquires the lock, releasing the lock after expiry would delete the second request's lock. A correct implementation uses a random value as the lock token and only deletes if the stored value matches. This is a known Redlock anti-pattern. The practical risk is low given the 5-second TTL and typical operation duration, but it is technically incorrect.

**Verdict:** Substantially satisfies the original concern. The overbooking window is closed. The lock release anti-pattern is a low-priority hardening item.

---

### 1.3 Zod Validation at Inngest Entry Points — FULLY ADDRESSED

**Original concern (§9.5):** Handlers receive `event.data` which is typed but not runtime-validated.

**Implementation:** Both `booking.events.ts` and `scheduling.events.ts` define Zod schemas at the top and call `.parse(event.data)` as the first line of each handler.

`src/modules/booking/booking.events.ts`:
```typescript
const slotReservedSchema = z.object({ slotId: z.string(), bookingId: z.string(), tenantId: z.string(), expiresAt: z.string().datetime() });
// ...
const payload = slotReservedSchema.parse(event.data);
```

`src/modules/scheduling/scheduling.events.ts`:
```typescript
const { bookingId, tenantId } = bookingConfirmedSchema.parse(event.data);
```

The `z.string().datetime()` constraint on `expiresAt` is particularly good — it validates that the ISO string is well-formed before passing it to `new Date()`.

**Verdict:** Fully satisfies the original concern.

---

### 1.4 Tenant Mismatch Assertions in Inngest Handlers — PARTIALLY ADDRESSED

**Original concern (§7.2):** Inngest handlers load bookings by `bookingId` without verifying that the loaded booking's `tenantId` matches `event.data.tenantId`.

**Implementation:** The `releaseExpiredReservation` handler in `booking.events.ts` validates the payload schema but delegates immediately to `bookingService.releaseExpiredReservation(bookingId)` without any tenant mismatch check. The service in turn calls `bookingRepository.findByIdPublic(bookingId)` — a query that does NOT filter by `tenantId`.

The scheduling handlers (`scheduleBookingReminders`, etc.) also parse `{ bookingId, tenantId }` from the event but do not perform the assertion described in the original review.

**Verdict:** The Zod validation was added (correct), but the specific tenant mismatch assertion — `if (booking.tenantId !== event.data.tenantId) throw new Error('Tenant mismatch')` — was not implemented. The risk remains low in practice since Inngest event payloads are not directly user-controlled, but it is still an open defense-in-depth gap.

---

### 1.5 `confirmReservation` Email Verification — FULLY ADDRESSED

**Original concern (§7.6):** `confirmReservation` accepted just a `bookingId` with no user verification.

**Implementation:** `booking.service.ts` `confirmReservation` now requires:
1. `customerEmail` — must match the booking's customer email (case-insensitive via `.toLowerCase()`)
2. `token` — if `confirmationTokenHash` exists on the booking, a valid SHA-256 token is required

The confirmation token is generated using `crypto.randomBytes(32).toString("hex")` (64 hex chars) and only the hash is stored. The plaintext token is returned to the caller to present to the customer via URL/email. This is a textbook secure token pattern.

```typescript
if (!storedEmail || storedEmail.toLowerCase() !== customerEmail.toLowerCase()) {
  throw new ForbiddenError("Email address does not match booking record");
}
```

The `booking.router.ts` now passes `customerEmail` as a required field:
```typescript
confirmReservation: publicProcedure
  .input(confirmReservationSchema)
  .mutation(({ input }) => bookingService.confirmReservation(input.bookingId, input.customerEmail, input.token)),
```

**Verdict:** Fully satisfies the original concern. The implementation exceeds the original recommendation by combining email verification with a token mechanism.

---

### 1.6 Schema Split Into Per-Module Files — FULLY ADDRESSED

**Original concern (§4.4):** A 1000+ line single-file schema is unnavigable.

**Implementation:** The schema is split across 9 files in `src/shared/db/schemas/`:
- `auth.schema.ts` — users, roles, permissions, sessions, apiKeys
- `booking.schema.ts` — bookings, bookingStatusHistory, bookingAssignments, appointmentCompletions, travelLogs, customerNotes
- `calendar.schema.ts` — calendar integration tables
- `customer.schema.ts` — customers
- `notifications.schema.ts` — messageTemplates, sentMessages, notifications, notificationPreferences
- `scheduling.schema.ts` — availableSlots, slotStaff, userAvailability, userCapacities
- `services.schema.ts` — services, venues
- `shared.schema.ts` — auditLogs, featureFlags, tenantFeatures, workflows, invoices, payments, reviews, forms, and more
- `tenant.schema.ts` — tenants, organizationSettings

`src/shared/db/schema.ts` is a clean barrel re-export: `export * from "./schemas/booking.schema"` etc. All existing import paths continue to work.

**Verdict:** Fully satisfies the original concern. The split is clean and logical.

---

### 1.7 `isPlatformAdmin` Database Flag — FULLY ADDRESSED AND IMPROVED

**Original concern (§7.5):** `PLATFORM_ADMIN_EMAILS` environment variable as the sole gate for platform admin access is fragile.

**Implementation:** `src/shared/trpc.ts` `platformAdminProcedure` now:
1. Looks up the user's `isPlatformAdmin` boolean from the database as the primary check
2. Falls back to `PLATFORM_ADMIN_EMAILS` only as a bootstrap escape hatch
3. On first access via the env var, automatically sets `isPlatformAdmin = true` in the database so subsequent requests use the DB flag
4. Logs the bootstrap promotion

```typescript
// Primary check: database flag.
if (rawUser.isPlatformAdmin) {
  return next({ ctx });
}
// Bootstrap escape hatch: promote user on first admin access via env var.
if (bootstrapEmails.includes(userEmail)) {
  await ctx.db.update(users).set({ isPlatformAdmin: true }).where(...);
  return next({ ctx });
}
```

The `users` schema in `auth.schema.ts` confirms the column exists: `isPlatformAdmin: boolean().default(false).notNull()`.

**Verdict:** Fully satisfies and improves on the original recommendation. The bootstrap mechanism is practical and the self-promotion pattern means the env var becomes redundant after first use.

---

### 1.8 Extended Tests — SUBSTANTIALLY ADDRESSED

**Original concern (§9.1–9.4):** Tests covered only RBAC; `BookingService` integration tests were Phase 6.

**Implementation:**

`src/modules/booking/__tests__/booking.service.test.ts` — 12 tests covering `createBooking` (lock acquisition, lock held conflict, lock release on error, capacity checks, token generation) and `confirmReservation` (not found, wrong status, expired, wrong email, missing email, invalid token, correct token, case-insensitive email). These were explicitly moved forward from Phase 6.

`src/shared/__tests__/auth.test.ts` — Tests covering `tenantProcedure` behaviour: inactive user rejection (DELETED, SUSPENDED, PENDING statuses), tenant membership enforcement, `getUserPermissions` deduplication, `canAccessResource` edge cases, `CUSTOMER`/`API` denial behaviour.

`src/shared/__tests__/permissions.test.ts` — 30+ tests including property-based fast-check tests for RBAC invariants.

**Gaps that remain:**
- `platformAdminProcedure` email gating is not directly tested
- No test for the `workosUserId` backfill path in `tenantProcedure`
- No integration test against an actual DB (all service tests mock the repository)
- No E2E tests

**Verdict:** Substantially satisfies the original concern for the booking critical path. Auth middleware behaviour is tested indirectly via pure-function tests. The gap is integration-level tests with a real database.

---

## Section 2: Remaining Gaps From Original Review

### 2.1 Phase 5 — STILL MISSING

The original review flagged this as the most significant gap (§3.2). `PHASE5_PLAN.md` now exists (it appears in `.planning/phases/`), but the modules it covers — `src/modules/portal/index.ts`, `src/modules/workflow/index.ts`, `src/modules/tenant/index.ts`, `src/modules/customer/index.ts`, `src/modules/review/index.ts`, `src/modules/forms/index.ts`, `src/modules/staff/index.ts` — are all empty index stubs. No implementation has been done.

This remains the majority of the remaining work. It is not blocking for Phase 4 but is still the single largest risk to the overall project completion timeline.

### 2.2 Rate Limiting — NOT IMPLEMENTED

Original concern (§4.6): Per-IP rate limiting only. Recommended per-tenant and per-user limiting.

Rate limiting is not present in any form in the current codebase. No Redis-based rate limiter middleware exists in `src/shared/trpc.ts` or `src/middleware.ts`. The `apiKeys` schema has a `rateLimit` column but it is not consumed anywhere.

This is a Phase 6 item per the original plan, but it is now closer to Phase 4 deployment. Any publicly accessible endpoint — particularly `booking.confirmReservation` — is completely unprotected from abuse.

### 2.3 Inngest Tenant Mismatch Assertion — NOT IMPLEMENTED

As noted in Section 1.4. The `releaseExpiredReservation` handler and the scheduling handlers validate payload schema but do not assert `booking.tenantId === event.data.tenantId`.

### 2.4 Idempotency Guards for Email/Notification Handlers — NOT IMPLEMENTED

Original concern (§4.5): Email/SMS handlers will send duplicates on Inngest retry.

The `sendBookingConfirmationEmail` handler in `booking.events.ts` is currently a stub that only logs. However, when Phase 4 wires up Resend, it must check `sentMessages` for an existing record before sending. The `sentMessages` table is defined in `notifications.schema.ts` and the infrastructure is ready, but there is no implemented idempotency guard pattern to follow.

This is a Phase 4 pre-condition that should be documented before the notification module is implemented.

### 2.5 Google Calendar Channel Token Validation — NOT YET APPLICABLE

Original concern (§10.4): The Google Calendar webhook endpoint should validate the channel token in Phase 4, not Phase 6. This endpoint does not yet exist (Phase 4 work), so the concern is unresolved but not yet blocking.

### 2.6 WorkOS Migration Rollback Path — PARTIALLY ADDRESSED

Original concern (§3.3): No rollback path for WorkOS auth failure.

The middleware in `src/modules/auth/middleware.ts` implements `AUTH_PROVIDER=legacy` as an emergency rollback switch. This addresses the rollback concern. However, the pre-migration user backfill script (creating WorkOS users for existing Drizzle users) is not documented or implemented.

The `tenantProcedure` in `trpc.ts` does implement the email fallback with automatic `workosUserId` backfill — so arriving users without pre-backfilled IDs will self-heal on first access. This is pragmatic.

### 2.7 No Environment Variable Validation Schema — NOT IMPLEMENTED

No `@t3-oss/env-nextjs` or equivalent Zod-based env schema exists. The codebase uses `process.env.X!` (non-null assertion) throughout `src/shared/redis.ts` and elsewhere. A missing required env var would produce a runtime `undefined` error rather than a clear startup failure message.

### 2.8 Audit Log Not Wired — SCHEMA EXISTS, NO IMPLEMENTATION

The `auditLogs` table is fully defined in `shared.schema.ts` with `(tenantId, userId, action, entityType, entityId, oldValues, newValues, ipAddress, requestId, severity)`. However, no service calls any audit log insert. The infrastructure is ready but the capability is dormant.

### 2.9 GDPR Compliance — NOT IMPLEMENTED

No right-to-erasure or data export functionality. No phase has addressed this yet. Still a legal requirement for UK-based SaaS.

---

## Section 3: Code Quality Assessment

### 3.1 `src/shared/trpc.ts` — High Quality

**What's done well:**
- Context creation is clean: WorkOS session, tenant slug resolution, and user loading are layered correctly
- `tenantProcedure` correctly enriches context before RBAC checks can run
- `reshapeUserWithRoles` helper cleanly normalises the Drizzle relational result to the typed shape
- The `createModuleMiddleware` stub with a clear Phase 5 TODO is exactly right
- Error messages in `tenantProcedure` point to `/auth/account-not-found` — a user-recoverable path

**Issues:**
- Every `tenantProcedure` request fires a DB query to resolve `tenantId` from the slug, then another DB query to load the user with all roles and permissions. That is 2 DB round-trips per request minimum. For high-traffic tenants this will be the single largest per-request overhead. Neither result is cached in Redis.
- The `tenantSlug` resolution inside `createContext` fires on every request, including requests that will subsequently fail with `UNAUTHORIZED`. Consider deferring tenant lookup until after session validation.
- `createContext` swallows all WorkOS auth errors with an empty `catch` block. If WorkOS experiences an outage, this silently treats all requests as unauthenticated rather than surfacing the error.

### 3.2 `src/modules/booking/booking.service.ts` — High Quality

**What's done well:**
- Distributed lock wraps the entire slot-sensitive create path
- `finally` block guarantees lock release
- Confirmation token generation uses `crypto.randomBytes` (cryptographically secure) and only the hash is persisted
- Email verification in `confirmReservation` is case-insensitive
- Token verification uses `createHash("sha256")` — resistant to timing attacks via hash comparison
- Status transitions always set `statusChangedAt` and specific timestamps (`cancelledAt`, `completedAt`, etc.)
- All side effects via Inngest — no inline blocking calls

**Issues:**
- `notification/send.email` events are emitted with `to: ""` (empty string) in several places — `cancelBooking`, `approveBooking`, `rejectBooking`, `confirmReservation`. The email recipient is not resolved. When Phase 4 implements the notification handler, these empty `to` fields will silently send to no one. This should be a `TODO` comment or a `null` field that the handler explicitly handles.
- `updateBooking` can change a slot without a distributed lock. If two concurrent update requests both change to different slots, the slot capacity accounting can corrupt. The lock is only applied in `createBooking`.
- The `createCompletion` method accepts a `customerId` parameter in its input shape but the booking already has a `customerId` — the caller could pass a mismatched ID. The service should derive `customerId` from the fetched booking, not accept it as input.

### 3.3 `src/modules/booking/booking.repository.ts` — Good Quality

**What's done well:**
- Every write method accepts `tenantId` as its first argument and applies it as a `where` condition
- `decrementSlotCapacity` uses a transaction to check and update atomically
- `generateBookingNumber` correctly uses the last booking for the tenant, not globally
- `list` implements cursor-based pagination (not offset) which is correct for live data

**Issues:**
- `generateBookingNumber` is racy under concurrent booking creation. If two bookings are created simultaneously for the same tenant, both will read the same `lastBooking` and generate the same booking number. With the distributed lock in `createBooking`, this is partially mitigated for slot-based bookings, but admin-created bookings (no lock) can still collide. A `bookingNumber` unique index is not visible in the schema — this should be `uniqueIndex("bookings_tenantId_bookingNumber_key")`.
- `list` RBAC filtering (lines 122–133) does a separate query to fetch `bookingAssignments` for the user, then constructs an `inArray` condition. For a user with many assignments this generates a large `IN` clause. A single join query would be more efficient.
- `findSlotsByDate` accepts `serviceId` and `staffId` parameters but does not use them in the `where` condition (lines 182–187). These are silently ignored. This is either a stub or a bug.
- `incrementSlotCapacity` always sets `available: true`, even if a slot at capacity is being incremented due to a cancellation of one of multiple bookings. If `capacity = 1` and `bookedCount` goes from 1 to 0, setting `available: true` is correct. But the logic should be `available: newCount < slot.capacity` to be consistent with `decrementSlotCapacity`.

### 3.4 `src/modules/scheduling/scheduling.service.ts` — Adequate Quality

**What's done well:**
- `generateRecurringSlots` has a hard cap of 365 slots and handles the weekly multi-day-of-week advancement edge case correctly
- All methods are thin delegations to the repository
- `checkStaffAvailability` uses `Promise.all` to parallelise the two DB queries
- Correctly documents the `locationPostcode: null` limitation with a comment

**Issues:**
- `getAvailableStaffForSlot`, `getStaffRecommendations`, `getSchedulingAlerts`, and `getAssignmentHealth` all return empty/stub results. These are visible in the router and return empty/stale data to any client that calls them. There should be a clear API contract indicating these are unimplemented stubs — currently they return `[]` silently.
- The `placeholderUser` in `checkStaffAvailability` (lines 191–196) uses `lastName: userId` — the staff member's ID as their last name. This leaks internal IDs if the `StaffAvailability` result is ever surfaced to the client. Should be an empty string or `"Unknown"`.

### 3.5 `src/modules/auth/rbac.ts` — Excellent Quality

**What's done well:**
- Wildcard logic is complete: exact match, resource wildcard, action wildcard, full wildcard
- Early returns for `OWNER`/`ADMIN` (implicit full access) and `CUSTOMER`/`API` (implicit denial) are correct and efficient
- `getUserPermissions` deduplicates across roles using a `Set`
- `canAccessResource` correctly handles `null` `resourceOwnerId`
- Invalid permission format (no `:`) returns `false` with a `console.warn` — defensive and auditable

**Issues:**
- `requirePermission` throws a `TRPCError` directly from `src/shared/rbac.ts`. This creates a coupling between the RBAC logic and the tRPC layer. If RBAC is ever used outside tRPC (e.g., in an Inngest handler), it would throw a `TRPCError` which is semantically wrong. Should throw a domain `ForbiddenError` from `src/shared/errors.ts` and let the caller convert.
- `console.warn` for invalid permission format is inconsistent with the rest of the codebase, which uses the structured `logger` from `src/shared/logger.ts`.

### 3.6 `src/modules/auth/middleware.ts` — Good Quality

**What's done well:**
- `AUTH_PROVIDER=legacy` rollback switch is correctly implemented
- Tenant header injection (`x-tenant-slug`) from subdomain extraction works before auth check
- Cookie override (`platform_tenant_slug`) for development/testing is clean
- The WorkOS middleware is instantiated once at module level (not per-request)

**Issues:**
- When `workosMiddleware` returns `null` (pass-through), the middleware injects tenant headers. But the new `NextRequest` is constructed with `new NextRequest(req.url, { method, headers })` — this drops all original cookies from the request. WorkOS authkit uses cookies for session management. If the modified request drops cookies, downstream WorkOS session reads will fail. This is a subtle bug that would only surface in production with real WorkOS sessions.
- No rate limiting or request size limiting is implemented at the middleware layer. `src/middleware.ts` runs on every non-static request.

### 3.7 `src/shared/db/schemas/` — Good Quality

**What's done well:**
- Per-module file organisation is clean and consistent
- Foreign keys, indexes, and cascade rules are defined for all relationships
- Type aliases using `$inferSelect` are exported from each schema file
- The `_prisma_migrations` table is included in `shared.schema.ts` — the Drizzle schema correctly reflects the live DB including the legacy migration table

**Issues:**
- `users.serviceIds` column defaults to `["RAY"]` — this is clearly a Drizzle ORM introspection artifact from the legacy Prisma schema where `uuid[].default([])` was represented differently. The value `["RAY"]` is a Postgres `gen_random_uuid()` function call that was not correctly introspected. This is a latent data corruption risk if the default is ever triggered.
- `projectMembers.responsibilities` similarly defaults to `["RAY"]`.
- `sentMessages` has no index on `(tenantId, bookingId)` — the most likely query pattern for idempotency checks in Phase 4 notification handlers.
- `bookings_tenantId_createdAt_idx` is missing. The `list` method in `booking.repository.ts` orders by `createdAt DESC` with a `tenantId` filter. The existing `bookings_tenantId_status_idx` does not cover this query.

---

## Section 4: Security Findings

### 4.1 Unprotected Endpoints

The `booking.confirmReservation` endpoint is `publicProcedure`. This is intentional and now protected by email + token verification (Section 1.5). Acceptable.

`booking.getPublicById` is `publicProcedure` and returns a full booking record. Depending on what fields are in the booking record (including `locationAddress`, `customerNotes`), this may expose sensitive data to anyone with a booking UUID. UUIDs are not guessable but can be leaked via URLs. This should be reviewed before Phase 4.

`portal.getPortalConfig` is `publicProcedure` returning `null` (stub). Acceptable for now.

The `api/health` and `api/ready` endpoints are public with no auth. This is correct and standard practice.

### 4.2 SQL Injection Risk — NOT PRESENT

Drizzle ORM uses parameterised queries throughout. All user input passes through Zod validation before reaching repository methods. No raw SQL interpolation is present in the reviewed files (the only `sql` template literal usage is `sql`SELECT 1`` and `sql`CURRENT_TIMESTAMP`` — both safe). No SQL injection vectors found.

### 4.3 Sensitive Data in Logs — MINOR ISSUE

`booking.service.ts` logs `{ bookingId, status, tenantId }` which is appropriate.

`src/shared/trpc.ts` logs `{ tenantSlug, tenantId }` at debug level — acceptable.

`src/shared/logger.ts` exports a `log` convenience wrapper. The `log.error` function signature is `(msg: string, error?: Error | object)`. If a service passes a full `Error` object with a stack trace as the second argument, the stack is serialised into the log. This is fine, but if an `Error` ever contains a user's email or password hash (from a database query error), it would be logged. This is low risk but worth noting.

The bigger gap: no `requestId` is threaded through any request. The `auditLogs` table has a `requestId` column, but nothing generates or propagates request IDs. Correlating logs across a single request in Sentry or Pino is currently impossible.

### 4.4 Rate Limiting — NOT IMPLEMENTED

No rate limiting exists on any endpoint. The `confirmReservation` public endpoint and the slot availability endpoints are vulnerable to enumeration and denial-of-service attacks. This should be addressed before public portal deployment.

### 4.5 CORS Configuration — HANDLED BY NEXT.JS

No explicit CORS configuration was found. Next.js App Router does not add permissive CORS headers by default, so tRPC endpoints are same-origin only. This is appropriate for the current architecture. If the portal ever runs on a different domain from the API, CORS will need explicit configuration.

### 4.6 Security Headers — WELL IMPLEMENTED

`next.config.ts` adds the full set of security headers: `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Permissions-Policy`. This is a solid security header posture.

### 4.7 Cookie Security

WorkOS AuthKit manages cookie settings internally via `authkitMiddleware`. The implementation delegates to WorkOS for cookie security (HttpOnly, Secure, SameSite). No custom session cookies are set by the application. This is correct.

**Potential issue:** The middleware re-constructs the request without forwarding the body, and as noted in Section 3.6, may drop cookies when constructing `new NextRequest`. This warrants a specific test in a real browser flow.

---

## Section 5: Performance Concerns

### 5.1 Per-Request Tenant Lookup — HIGH IMPACT

`createContext` in `src/shared/trpc.ts` fires a database query to resolve `tenantId` from the slug on every request:

```typescript
const tenant = await db.query.tenants.findFirst({
  where: eq(tenants.slug, tenantSlug),
  columns: { id: true },
});
```

This query fires even for unauthenticated public procedure requests. For a multi-tenant platform with high traffic, this is a per-request DB hit that adds 5–20ms of latency and consumes a DB connection. The tenant table is small and rarely changes — this is a textbook Redis cache candidate. The `redis.ts` file includes an example comment for exactly this use case:
```typescript
// Tenant lookup cache (5 min TTL)
await redis.setex(`tenant:${slug}`, 300, JSON.stringify(tenant));
```

This is low-hanging performance fruit that is not yet implemented.

### 5.2 Per-Request User + Roles Loading — HIGH IMPACT

`tenantProcedure` fires a relational query that loads the user with all roles and all permissions on every authenticated request:

```typescript
db.query.users.findFirst({ with: { userRoles: { with: { role: { with: { rolePermissions: { with: { permission: true } } } } } } } })
```

This is a 4-level deep join. For a user with 3 roles and 30 permissions, this produces a non-trivial query. Combined with the tenant lookup, every authenticated request is 2 DB round-trips plus nested join resolution.

Caching the user+roles result in Redis with a short TTL (2–5 minutes) would eliminate the majority of this cost. The original review noted this pattern is correct for avoiding stale permissions, but caching with a short TTL is an acceptable middle ground.

### 5.3 N+1 Pattern in `booking.repository.list` — MEDIUM IMPACT

The `list` method pre-fetches `bookingAssignments` for the requesting user, then uses the result in an `inArray` condition. For users with many assignments this is effectively:
1. Query 1: `SELECT bookingId FROM bookingAssignments WHERE userId = $1`
2. Query 2: `SELECT * FROM bookings WHERE tenantId = $1 AND (staffId = $1 OR id IN (...))`

This is a classic N+1 avoidance attempt that still produces 2 queries. The correct solution is a single join query. Not a critical issue at current scale but will degrade with large assignment tables.

### 5.4 `getStats` — THREE SEPARATE QUERIES

`bookingRepository.getStats` fires 3 separate count queries using `Promise.all`. While parallelised, this is 3 DB round-trips for a dashboard stat that could be a single query using `CASE WHEN` counting or a CTE. At high query frequency this will be noticeable.

### 5.5 Inngest Cron Functions — LOW RISK

The `syncCalendarsCron` function (every 5 minutes) fans out one `calendar/sync.pull` event per user with an active calendar integration. For a tenant with 50 staff members, this is 50 Inngest events every 5 minutes. At current Inngest pricing this is manageable. The `concurrency: { limit: 3 }` guard prevents runaway fan-out.

The `sendRemindersCron` (every 6 hours) and `pullCalendarEventsCron` (every 15 minutes) are stubs and have no performance impact yet.

---

## Section 6: Recommended Pre-Phase-4 Foundational Capabilities

### 6.1 OpenTelemetry / Distributed Tracing

**Current state:** Sentry is configured in `sentry.server.config.ts` with `tracesSampleRate: 0.1` in production and `1.0` in development. The `withSentryConfig` wrapper in `next.config.ts` enables automatic Next.js instrumentation. This provides error capture and basic transaction tracing.

**Gap:** There is no distributed tracing across tRPC → service → repository → DB. A slow `booking.list` query that takes 2.3 seconds has no trace showing whether the time is in tenant lookup, user loading, or the list query itself.

**Recommendation:** The existing Sentry setup can be augmented with Sentry's performance spans. Adding `Sentry.startSpan` around repository methods and the tenant/user DB queries would provide waterfall visibility without requiring OpenTelemetry. This is achievable within the current Sentry subscription.

**Priority:** High
**Effort:** Medium (1–2 days to add spans to the hot path — context, repository, service)
**Why now:** Phase 4 adds notification and calendar-sync modules which have complex async chains. Without tracing, debugging Phase 4 latency issues will be guesswork.

---

### 6.2 Database Connection Pooling

**Current state:** `src/shared/db.ts` configures `postgres.js` with `max: 1` in production (serverless) and `max: 5` in development. The comment correctly notes that `max: 1` prevents connection pool exhaustion in serverless environments.

**Gap:** With `max: 1` per serverless function instance and potentially hundreds of concurrent Vercel function invocations, the total connection count to the database could reach hundreds. PostgreSQL's default `max_connections = 100`. Under moderate traffic, connection exhaustion is a real risk.

**Recommendation:** Add PgBouncer or use the Supabase connection pooler (if using Supabase). Alternatively, evaluate `@neondatabase/serverless` if using Neon, which uses HTTP-based queries eliminating connection pool concerns. If staying on postgres.js, the current `max: 1` approach is the correct serverless pattern — but adding a connection pool proxy in front of PostgreSQL is strongly recommended before public launch.

**Priority:** High
**Effort:** Small (configure PgBouncer or switch pooler URL) if using a managed service
**Why now:** Phase 4 adds more Inngest functions, each of which opens a DB connection. The total connection count will increase materially.

---

### 6.3 Request-Scoped Logging

**Current state:** `src/shared/logger.ts` provides a Pino logger. Module-level child loggers use `.child({ module: "booking.service" })`. There is no `requestId` threading.

**Gap:** When debugging a failed booking, log lines from `booking.service`, `booking.repository`, and `trpc.ts` cannot be correlated to a single request. Sentry has no `requestId` context to group related log lines.

**Recommendation:** Generate a `requestId` (using `crypto.randomUUID()`) in `createContext` and thread it through the `Context` object. Child loggers in services should accept a `requestId` parameter. Adding it to `auditLogs` would provide full request traceability. The `auditLogs` table already has a `requestId` column waiting to be used.

**Priority:** High
**Effort:** Small (< 4h to add to `createContext` and thread through the service layer)
**Why now:** Without request ID threading, correlating errors in Phase 4's notification/calendar workflows will require timestamp matching between log lines — unreliable and slow.

---

### 6.4 Structured Error Reporting to Sentry

**Current state:** Sentry is initialised but no code explicitly calls `Sentry.captureException`. The `withSentryConfig` wrapper provides automatic Next.js error capture for uncaught errors, but caught errors (e.g., `NotFoundError`, `ConflictError`) that are converted to `TRPCError` and returned to the client are not reported to Sentry.

**Gap:** `INTERNAL_SERVER_ERROR` responses from tRPC would be captured automatically. But `ForbiddenError` and `ConflictError` — which indicate security or data integrity issues — are silently converted and returned to the client without any observability.

**Recommendation:** Add a tRPC error formatter in `initTRPC.create({ errorFormatter })` that calls `Sentry.captureException` for `INTERNAL_SERVER_ERROR` and `FORBIDDEN` error codes, with the user context attached. This ensures unexpected access denials are visible in Sentry.

**Priority:** High
**Effort:** Small (< 4h)
**Why now:** Before Phase 4 adds notification and calendar sync, you want a complete error picture from the existing modules.

---

### 6.5 Type-Safe Environment Variable Validation

**Current state:** All environment variables are accessed via `process.env.X!` (non-null assertion) or `process.env.X ?? "default"`. There is no startup validation that required variables are present.

**Gap:** A missing `UPSTASH_REDIS_REST_URL` in a new deployment would produce a confusing runtime error (`Cannot read properties of undefined`) rather than a clear startup failure.

**Recommendation:** Add `@t3-oss/env-nextjs` with a Zod schema for all required environment variables. This gives compile-time and runtime validation of the env shape, with clear error messages on startup.

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    WORKOS_API_KEY: z.string().min(1),
    WORKOS_CLIENT_ID: z.string().min(1),
  },
  // ...
});
```

**Priority:** Medium
**Effort:** Small (< 4h)
**Why now:** Phase 4 adds Resend and potentially Google OAuth env vars. The number of required variables will grow; catching missing config at startup prevents subtle production failures.

---

### 6.6 API Rate Limiting

**Current state:** Not implemented. The `Ratelimit` from `@upstash/ratelimit` is a natural pairing with the already-present Upstash Redis client.

**Gap:** The `confirmReservation` public endpoint and slot availability endpoints are completely unprotected. A scraper could enumerate all booking IDs. A bot could hammer the slot availability endpoint.

**Recommendation:** Add a tRPC middleware for rate limiting using `@upstash/ratelimit`. At minimum:
- `publicProcedure`: 30 requests/minute per IP for public endpoints
- `tenantProcedure`: 300 requests/minute per userId for authenticated endpoints
- `confirmReservation` specifically: 5 attempts per bookingId per 5 minutes

This requires adding `@upstash/ratelimit` as a dependency and a middleware function.

**Priority:** Critical (should be pre-Phase-4)
**Effort:** Small (< 4h once the Upstash client is present)
**Why now:** The portal (public-facing booking flow) goes live in Phase 4. Without rate limiting, it is trivially abusable.

---

### 6.7 Background Job Observability

**Current state:** Inngest functions are registered at `/api/inngest`. The Inngest dashboard provides basic function health visibility. No alerting is configured for function failures.

**Gap:** If `releaseExpiredReservation` starts failing consistently (e.g., DB connection issue), bookings will remain in RESERVED status permanently. No alert would fire.

**Recommendation:** Configure Inngest's webhook-based failure notifications (available in all Inngest plans) to route to a Slack channel or PagerDuty. Alternatively, add explicit `Sentry.captureException` in the `catch` blocks of critical Inngest handlers.

**Priority:** High
**Effort:** Small (< 4h for Slack webhook configuration)
**Why now:** Phase 4 adds calendar sync and notification handlers. These are longer-running and more failure-prone. Without alerting, silent failures will only be discovered by users.

---

### 6.8 Webhook Infrastructure

**Current state:** The `calendar/webhook.received` event is defined in `inngest.ts`. A Google Calendar webhook handler route will be built in Phase 4. No generic webhook dispatch exists.

**Gap:** Phase 4 will build a specific Google Calendar webhook handler. If the platform ever needs to receive webhooks from Stripe, Resend, or other services, each will require a separate Route Handler and event type.

**Recommendation:** Build a minimal generic webhook ingestion route at `/api/webhooks/[provider]/route.ts` in Phase 4. It validates the provider-specific signature, emits a typed Inngest event, and returns 200. This is a lightweight abstraction that prevents six separate webhook route files proliferating.

**Priority:** Medium
**Effort:** Medium (1–2 days for a well-designed generic ingestion layer)
**Why now:** Phase 4 is the natural time to establish the pattern before it diverges into one-off implementations.

---

### 6.9 Feature Flags

**Current state:** The `featureFlags` and `tenantFeatures` tables are fully defined in `shared.schema.ts`. The `createModuleMiddleware` stub in `trpc.ts` has a Phase 5 TODO to check `TenantModule` table. The infrastructure is schema-ready.

**Gap:** The middleware stub always passes through — module feature flags are not enforced. There is no mechanism to enable Phase 4 features (notifications, calendar sync) for specific tenants in beta before full rollout.

**Recommendation:** Wire `createModuleMiddleware` to query `tenantFeatures` in Phase 4, using Redis cache with a 5-minute TTL. The table is already defined and populated — this is a query-and-cache implementation, not a schema change.

**Priority:** Medium
**Effort:** Small (< 4h)
**Why now:** Phase 4's notification and calendar-sync modules are the first real use case for tenant-level feature gating. Beta testing with selected tenants requires this to work.

---

### 6.10 Data Validation Layer Beyond tRPC Inputs

**Current state:** tRPC inputs are validated by Zod schemas in the router layer. Inngest handler payloads are validated at entry. Repository inputs are typed by TypeScript.

**Gap:** The `notification/send.email` events are emitted with `to: ""` (empty string) throughout `booking.service.ts`. Zod validation on the Inngest event handler will receive a valid-shaped payload (`to: ""`) and proceed to attempt sending an email to an empty recipient. There is no validation that `to` is a valid email address at the emission site.

**Recommendation:** Add a helper `emitNotification` function in `booking.service.ts` that validates the recipient email before emitting the Inngest event, and resolves it from the booking record. This prevents the `to: ""` pattern from reaching Phase 4.

**Priority:** High (blocking correctness issue for Phase 4)
**Effort:** Small (< 4h)
**Why now:** This is a Phase 3 bug that will silently break Phase 4 notification delivery.

---

### 6.11 Tenant Lookup Caching (New Recommendation)

**Current state:** `createContext` queries the database for the tenant on every request.

**Recommendation:** Implement the Redis tenant cache pattern documented in `src/shared/redis.ts` comments. Cache result for 5 minutes with key `tenant:{slug}`. This eliminates one DB round-trip per request.

**Priority:** High
**Effort:** Small (< 4h)
**Why now:** This is the simplest performance win available. It should be done before Phase 4 adds more per-request complexity.

---

## Section 7: Architecture Score Card

Rated against the same dimensions as the original review, now based on actual implemented code.

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Completeness** | 6/10 | Phases 0–3 are solidly implemented. Phases 4, 5, 6 remain. The schema is complete (all tables present from introspection), but 7 of 12 module implementations are empty stubs. Phase 5 plan exists but no code. The foundation is solid; the surface area of unimplemented functionality is still large. |
| **Security** | 7/10 | Material improvement from 6/10. `confirmReservation` is now secured with email + token. `isPlatformAdmin` DB flag is implemented with bootstrap mechanism. Security headers are correctly configured. WorkOS rollback path exists. Remaining gaps: no rate limiting on public endpoints, tenant mismatch assertions missing from Inngest handlers, `booking.getPublicById` exposes full booking data publicly. |
| **Scalability** | 6/10 | Down from 7/10 due to discovered issues. The distributed lock closes the overbooking race. Inngest crons are correctly gated with concurrency limits. However: per-request tenant DB lookup, per-request user+roles join query, no connection pooling strategy, and `max: 1` postgres connections in production are real scalability ceilings. Redis is available but not used for caching. |
| **Maintainability** | 8/10 | Matches original estimate. The module structure is clean, service/repository/router separation is consistent, error hierarchy is correct, schema split is well-executed. Child loggers with module context aid debugging. Minor issues: `console.warn` in rbac.ts, `requirePermission` throwing `TRPCError` from the wrong layer. |
| **Enterprise-readiness** | 5/10 | Up from 4/10. The `isPlatformAdmin` mechanism and rollback switch are enterprise-compatible. Audit log schema exists. Feature flags schema exists. But: no audit log writes, no rate limiting, no request ID threading, no env validation, no GDPR compliance, no billing module. An enterprise customer demo would surface all of these within the first 30 minutes. |
| **Risk management** | 6/10 | Up from 5/10. Distributed lock closes the highest-impact race condition. Rollback switch addresses cutover risk. WorkOS email backfill self-heals on first login. Remaining risks: `to: ""` bug in notification emissions will silently break Phase 4, `generateBookingNumber` race condition under concurrent admin-created bookings, missing rate limiting before portal goes live. |
| **Test coverage** | 5/10 | New dimension. 73 tests passing. `BookingService` critical path tests are solid (12 tests, correctly exercising the lock and token flows). RBAC property-based tests are exemplary. But: no integration tests against a real DB, no E2E tests, no load tests, large areas of the codebase (scheduling service, all sub-routers, auth router) have zero direct test coverage. 5/10 is generous given how much is untested. |

---

## Section 8: Recommended Pre-Phase-4 Checklist

Ordered by risk/value. Items marked `[BLOCKING]` should be resolved before Phase 4 code is written.

### Critical (Do First)

- [ ] **[BLOCKING] Fix `to: ""` in notification emissions** (`booking.service.ts` lines 192–198, 271–276, 301–308, 336–340). Resolve recipient email from the booking's customer record before emitting `notification/send.email`. This is a correctness bug that will silently fail when Phase 4 wires up Resend.

- [ ] **[BLOCKING] Add rate limiting to public endpoints** using `@upstash/ratelimit`. At minimum: IP-based rate limit on `confirmReservation` (5/5min per bookingId) and slot availability endpoints (60/min per IP). The portal goes live in Phase 4 with no protection otherwise.

- [ ] **Add tenant ID caching in `createContext`**. Cache `tenant:{slug}` → `tenantId` in Redis with 5-minute TTL. This eliminates a DB round-trip on every request.

### High Priority (Do Before Phase 4 Starts)

- [ ] **Add requestId to tRPC context** and thread through service logs. Use `crypto.randomUUID()` in `createContext`. Required for correlating Phase 4 notification/calendar workflow traces.

- [ ] **Configure Sentry error formatter** to capture `INTERNAL_SERVER_ERROR` and unexpected `FORBIDDEN` errors with user context. Ensures error visibility before new modules add new failure modes.

- [ ] **Configure Inngest failure notifications** (Slack/PagerDuty webhook). `releaseExpiredReservation` must not fail silently.

- [ ] **Add tenant mismatch assertion to Inngest handlers** (`booking.events.ts`): `if (booking.tenantId !== payload.tenantId) { log.error(...); return; }` for `releaseExpiredReservation`.

- [ ] **Fix `incrementSlotCapacity`** to set `available: newCount < slot.capacity` rather than always `available: true`.

- [ ] **Fix `findSlotsByDate`** to apply `serviceId` and `staffId` filters if provided, or remove the parameters from the function signature.

### Medium Priority (Do During Phase 4)

- [ ] **Wire `createModuleMiddleware`** to query `tenantFeatures` with Redis cache. Allows beta gating of Phase 4 notification and calendar-sync features.

- [ ] **Add env variable validation** with `@t3-oss/env-nextjs`. Phase 4 adds Resend and Google OAuth env vars — catch missing config at startup.

- [ ] **Add `bookings_tenantId_createdAt_idx` index** to the schema. The `list` query orders by `createdAt DESC` with a `tenantId` filter; this index is missing.

- [ ] **Add `sentMessages_tenantId_bookingId_idx` index** for the idempotency check pattern that Phase 4 notification handlers must implement.

- [ ] **Implement idempotency check pattern in notification handlers**. Before Phase 4 implements Resend, document and test the `sentMessages` check-before-send pattern so all notification handlers follow it consistently.

- [ ] **Fix the lock release anti-pattern** in `acquireSlotLock`. Use a random value as the lock token and verify before deleting. Low urgency but technically incorrect.

### Low Priority (Phase 5/6)

- [ ] **Implement GDPR right-to-erasure** in the customer module (Phase 5). This is a legal requirement for UK SaaS, not optional.

- [ ] **Wire `auditLogs` writes** for permission-sensitive operations (booking status changes, user role grants, tenant configuration changes).

- [ ] **Add load test for slot capacity under concurrency** to validate that the distributed lock actually prevents overbooking under concurrent portal load.

- [ ] **Move `requirePermission` to throw `ForbiddenError`** (domain error) rather than `TRPCError` to decouple the RBAC layer from the tRPC transport.

- [ ] **Fix the `["RAY"]` default values** in `users.serviceIds` and `projectMembers.responsibilities` — these are introspection artifacts that will corrupt data if triggered.

---

*CTO Review — Ironheart Refactor (Post-Implementation)*
*Reviewed: 2026-02-19*
*Reviewer: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)*
*Files reviewed: 35 source files, 73 tests, 9 schema files*
