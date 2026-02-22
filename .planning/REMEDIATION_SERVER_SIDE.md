# Server-Side Remediation Plan

**Generated:** 2026-02-21
**Based on:** `.planning/AUDIT_SERVER_SIDE.md`, `.planning/PHASE7D_BACKEND_PLAN.md`
**Scope:** 5 phases, ~35 tasks, ~4,800 LOC new/modified code, ~15 files to create, ~18 files to modify

---

## Overview

The server-side audit identified 29 issues across 4 severity tiers. This remediation plan organizes them into 5 sequential phases with explicit dependency ordering. Each task specifies exact files, implementation approach, and code patterns to follow.

**Key Metrics:**
- **Critical fixes:** 5 (domain error conversion, analytics stubs, booking saga, Stripe webhooks)
- **Bug fixes & stub completions:** 9 (approveSignup, module gating, overdue cron, etc.)
- **Missing modules:** 3 (settings, audit, analytics extensions)
- **Test coverage gaps:** 6 modules with zero tests
- **Cleanup items:** 5 (dead code, duplicate files, stale TODOs)

**Effort Scale:** Small = <50 LOC, <1 hour | Medium = 50-200 LOC, 1-3 hours | Large = 200+ LOC, 3+ hours

---

## Phase S1: Critical Fixes (Must Do First — Blocks Everything)

These 5 fixes address production-critical bugs where the system silently fails or returns incorrect data.

### S1.1: Domain Error to tRPC Error Conversion

**Priority:** CRITICAL
**Effort:** Medium
**Files to modify:** `src/shared/trpc.ts` (lines 201-222)

**Problem:** Services throw `NotFoundError`, `ForbiddenError`, `ConflictError`, `BadRequestError`, `ValidationError` from `src/shared/errors.ts`. tRPC wraps all non-`TRPCError` exceptions as `INTERNAL_SERVER_ERROR` (HTTP 500). The `toTRPCError()` helper exists in `src/shared/errors.ts` (line 69) but is never called.

**Approach:** Add error-conversion middleware to the tRPC initialization, applied to ALL procedures. This is better than modifying each router because it guarantees coverage.

**Implementation:**

1. In `src/shared/trpc.ts`, add a new middleware after `loggingMiddleware` (line 234):

```typescript
import { IronheartError, toTRPCError } from '@/shared/errors'

const errorConversionMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error; // Already a TRPCError, pass through
    }
    if (error instanceof IronheartError) {
      throw toTRPCError(error); // Convert domain error to TRPCError
    }
    throw error; // Unknown error — let tRPC wrap as INTERNAL_SERVER_ERROR
  }
});
```

2. Wire this middleware into ALL procedure bases. Modify `publicProcedure` (line 276), `protectedProcedure` (line 287), and by extension `tenantProcedure` and `permissionProcedure` will inherit it:

```typescript
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorConversionMiddleware)  // <-- ADD
  .use(rateLimitMiddleware);

export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorConversionMiddleware)  // <-- ADD
  .use(async ({ ctx, next }) => { ... });
```

**Verification:** After this change, a service throwing `NotFoundError('Booking', id)` will produce HTTP 404 NOT_FOUND instead of HTTP 500 INTERNAL_SERVER_ERROR. Test by calling a procedure that triggers a `NotFoundError` in a test.

**Dependencies:** None — this is independent and should be done first.

---

### S1.2: Analytics getSummary — Replace Hardcoded Zeros

**Priority:** CRITICAL
**Effort:** Medium
**Files to modify:**
- `src/modules/analytics/analytics.router.ts` (lines 13-30)
- `src/modules/analytics/analytics.service.ts` (add `getSummary` method)
- `src/modules/analytics/analytics.repository.ts` (add aggregation queries)

**Problem:** `getSummary` returns hardcoded zeros for all fields (bookings, revenue, customers, reviews, staffUtilisation). The analytics dashboard shows no data.

**Approach:** Implement real database aggregation queries. The `getSummary` endpoint should query multiple tables within the given period, or read pre-computed snapshots from `metric_snapshots` if available.

**Implementation:**

1. **Add repository methods** in `analytics.repository.ts`:

```typescript
export async function getBookingCountsByStatus(tenantId: string, from: Date, to: Date) {
  return db
    .select({
      status: bookings.status,
      count: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.createdAt, from),
      lte(bookings.createdAt, to)
    ))
    .groupBy(bookings.status)
}

export async function getRevenueSummary(tenantId: string, from: Date, to: Date) {
  const [row] = await db
    .select({
      gross: sql<number>`coalesce(sum(${payments.amount}::numeric), 0)::numeric`,
    })
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      eq(payments.status, 'COMPLETED'),
      gte(payments.paidAt, from),
      lte(payments.paidAt, to)
    ))
  return row ?? { gross: 0 }
}

export async function getOutstandingRevenue(tenantId: string) {
  const [row] = await db
    .select({
      outstanding: sql<number>`coalesce(sum(${invoices.amountDue}::numeric), 0)::numeric`,
    })
    .from(invoices)
    .where(and(
      eq(invoices.tenantId, tenantId),
      sql`${invoices.status} IN ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE')`
    ))
  return row ?? { outstanding: 0 }
}

export async function getCustomerCounts(tenantId: string, from: Date, to: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(and(
      eq(customers.tenantId, tenantId),
      gte(customers.createdAt, from),
      lte(customers.createdAt, to)
    ))
  return row?.count ?? 0
}

export async function getReviewStats(tenantId: string, from: Date, to: Date) {
  const [row] = await db
    .select({
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)::numeric`,
      total: sql<number>`count(*)::int`,
      responded: sql<number>`count(case when ${reviews.ownerResponse} is not null then 1 end)::int`,
    })
    .from(reviews)
    .where(and(
      eq(reviews.tenantId, tenantId),
      eq(reviews.isPublished, true),
      gte(reviews.createdAt, from),
      lte(reviews.createdAt, to)
    ))
  return row ?? { avgRating: 0, total: 0, responded: 0 }
}
```

2. **Add service method** in `analytics.service.ts`:

```typescript
export async function getSummary(tenantId: string, period: string) {
  const now = new Date()
  const from = getPeriodStart(period, now) // reuse getPeriodStart from router

  const [bookingCounts, revenue, outstanding, newCustomers, reviewStats] = await Promise.all([
    analyticsRepository.getBookingCountsByStatus(tenantId, from, now),
    analyticsRepository.getRevenueSummary(tenantId, from, now),
    analyticsRepository.getOutstandingRevenue(tenantId),
    analyticsRepository.getCustomerCounts(tenantId, from, now),
    analyticsRepository.getReviewStats(tenantId, from, now),
  ])

  // Map booking counts by status
  const statusMap = Object.fromEntries(bookingCounts.map(r => [r.status, r.count]))

  return {
    period,
    from: from.toISOString(),
    to: now.toISOString(),
    bookings: {
      created: (statusMap.PENDING ?? 0) + (statusMap.CONFIRMED ?? 0) + (statusMap.COMPLETED ?? 0) + (statusMap.CANCELLED ?? 0),
      confirmed: statusMap.CONFIRMED ?? 0,
      cancelled: statusMap.CANCELLED ?? 0,
      completed: statusMap.COMPLETED ?? 0,
      noShow: statusMap.NO_SHOW ?? 0,
    },
    revenue: {
      gross: Number(revenue.gross),
      net: Number(revenue.gross), // net = gross until tax deductions are tracked separately
      outstanding: Number(outstanding.outstanding),
    },
    customers: {
      new: newCustomers,
      returning: 0, // requires separate query — deferred
      ltvAvg: 0,    // requires customer LTV calculation — deferred
    },
    reviews: {
      ratingAvg: Number(reviewStats.avgRating),
      responseRate: reviewStats.total > 0 ? Math.round((reviewStats.responded / reviewStats.total) * 100) : 0,
    },
    staffUtilisation: 0, // requires availability calculation — deferred to getStaffUtilization
  }
}
```

3. **Update router** to call service:

```typescript
getSummary: tenantProcedure
  .input(summarySchema)
  .query(async ({ ctx, input }) => {
    return analyticsService.getSummary(ctx.tenantId, input.period)
  }),
```

4. Move `getPeriodStart` helper from router to service (or a shared utility) since it is now needed in both.

**Imports required:** `bookings` from `booking.schema`, `payments`, `invoices` from `shared.schema`, `customers` from `customer.schema`, `reviews` from `phase6.schema` (or wherever they are defined).

**Dependencies:** None, but S1.1 (error conversion) should be done first so any DB errors surface properly.

---

### S1.3: Analytics getCustomerInsights — Replace Stub

**Priority:** CRITICAL
**Effort:** Medium
**Files to modify:**
- `src/modules/analytics/analytics.service.ts` (lines 42-69)
- `src/modules/analytics/analytics.repository.ts` (add query)

**Problem:** `getCustomerInsights` returns fake hardcoded values (e.g., `daysAgo = 30`, `frequency = 1`, `avgValue = 100`) instead of querying the database.

**Approach:** Query `bookings` and `payments` tables for the specified customer, compute real RFM (Recency, Frequency, Monetary) metrics, then feed into existing `computeChurnScore`/`computeChurnLabel` functions.

**Implementation:**

1. **Add repository method** in `analytics.repository.ts`:

```typescript
export async function getCustomerBookingStats(tenantId: string, customerId: string) {
  const [row] = await db
    .select({
      totalBookings: sql<number>`count(*)::int`,
      totalSpend: sql<number>`coalesce(sum(${bookings.price}::numeric), 0)::numeric`,
      lastBookingDate: sql<Date>`max(${bookings.startTime})`,
      firstBookingDate: sql<Date>`min(${bookings.createdAt})`,
      noShowCount: sql<number>`count(case when ${bookings.status} = 'NO_SHOW' then 1 end)::int`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.tenantId, tenantId),
      eq(bookings.customerId, customerId),
      sql`${bookings.status} IN ('CONFIRMED', 'COMPLETED', 'NO_SHOW')`
    ))
  return row
}
```

2. **Replace stub in service** (lines 42-69 of `analytics.service.ts`):

```typescript
export async function getCustomerInsights(
  tenantId: string,
  customerId: string
): Promise<CustomerInsights> {
  const stats = await analyticsRepository.getCustomerBookingStats(tenantId, customerId)

  if (!stats || stats.totalBookings === 0) {
    return {
      customerId,
      ltv: 0,
      avgBookingValue: 0,
      bookingFrequencyDays: 0,
      lastBookingDaysAgo: 0,
      noShowRate: 0,
      churnRiskScore: 0,
      churnRiskLabel: 'LOW',
      nextPredictedBookingDate: null,
    }
  }

  const now = new Date()
  const lastBooking = stats.lastBookingDate ? new Date(stats.lastBookingDate) : now
  const daysAgo = Math.floor((now.getTime() - lastBooking.getTime()) / (1000 * 60 * 60 * 24))
  const avgValue = Number(stats.totalSpend) / stats.totalBookings
  const firstBooking = stats.firstBookingDate ? new Date(stats.firstBookingDate) : now
  const accountAgeDays = Math.max(1, Math.floor((now.getTime() - firstBooking.getTime()) / (1000 * 60 * 60 * 24)))
  const frequency = stats.totalBookings / (accountAgeDays / 30) // bookings per 30 days
  const frequencyDays = accountAgeDays / Math.max(1, stats.totalBookings)

  // Use existing churn scoring library
  const cohortStats = { minR: 0, maxR: 365, minF: 0, maxF: 12, minM: 0, maxM: 500 }
  const score = computeChurnScore(daysAgo, frequency, avgValue, cohortStats)
  const label = computeChurnLabel(score, daysAgo, 30)

  log.info({ tenantId, customerId, daysAgo, frequency, avgValue }, 'Customer insights computed from DB')

  return {
    customerId,
    ltv: Number(stats.totalSpend),
    avgBookingValue: avgValue,
    bookingFrequencyDays: Math.round(frequencyDays),
    lastBookingDaysAgo: daysAgo,
    noShowRate: stats.totalBookings > 0 ? stats.noShowCount / stats.totalBookings : 0,
    churnRiskScore: score,
    churnRiskLabel: label,
    nextPredictedBookingDate: null, // requires ML model — deferred
  }
}
```

**Dependencies:** S1.2 (getSummary uses similar repository patterns — do them together).

---

### S1.4: Booking Saga — Wire Real Invoice Creation

**Priority:** CRITICAL
**Effort:** Small
**Files to modify:** `src/modules/booking/booking.service.ts` (lines 226-233 and 435-442)

**Problem:** The booking confirmation saga creates fake invoice IDs (`invoice-stub-${bId}`) instead of calling the payment service. The `paymentService.createInvoiceForBooking()` method already exists and works.

**Approach:** Import `paymentService` and wire the saga's `createInvoiceForBooking` and `voidInvoice` callbacks to real implementations.

**Implementation:**

1. Add import at top of `booking.service.ts`:

```typescript
import * as paymentService from '@/modules/payment/payment.service'
```

2. Replace the stub at **line 226-233** (first saga instance — customer confirmation):

```typescript
createInvoiceForBooking: async (bId) => {
  const result = await paymentService.createInvoiceForBooking(
    locked.tenantId,
    bId,
    locked.customerId
  );
  return result;
},
voidInvoice: async (invoiceId) => {
  await paymentService.voidInvoice(locked.tenantId, invoiceId);
},
```

3. Replace the stub at **line 435-442** (second saga instance — admin approval):

```typescript
createInvoiceForBooking: async (bId) => {
  const result = await paymentService.createInvoiceForBooking(
    existing.tenantId,
    bId,
    existing.customerId
  );
  return result;
},
voidInvoice: async (invoiceId) => {
  await paymentService.voidInvoice(existing.tenantId, invoiceId);
},
```

**Note:** Both booking query results (`locked` from `findByIdPublic` and `existing` from `findById`) return the full `bookings` row which has a `customerId` column. Confirmed in schema at `booking.schema.ts`.

**Dependencies:** None. The `paymentService` methods already exist and are tested.

---

### S1.5: Stripe Webhook Handlers — Implement Event Processing

**Priority:** CRITICAL
**Effort:** Medium
**Files to modify:** `src/modules/payment/payment.events.ts` (lines 14-38)

**Problem:** All three Stripe webhook handlers (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`) are TODO stubs that only log and do nothing.

**Approach:** Implement each handler to update payment/invoice status in the database and emit downstream Inngest events. The `payload` from Stripe contains the payment intent object.

**Implementation — replace lines 14-38:**

```typescript
switch (eventType) {
  case 'payment_intent.succeeded':
    await step.run('handle-payment-succeeded', async () => {
      const pi = payload as {
        id: string;
        metadata?: { bookingId?: string; tenantId?: string; invoiceId?: string };
        amount: number;
      }
      const tenantId = pi.metadata?.tenantId
      const invoiceId = pi.metadata?.invoiceId
      const bookingId = pi.metadata?.bookingId

      if (!tenantId || !invoiceId) {
        log.warn({ stripeEventId, payload }, 'Missing metadata on payment_intent.succeeded')
        return
      }

      // Record the payment against the invoice
      await paymentService.recordPayment(tenantId, {
        invoiceId,
        bookingId: bookingId ?? null,
        amount: pi.amount / 100, // Stripe amounts are in pence/cents
        method: 'CARD',
        stripePaymentIntentId: pi.id,
      })

      // Emit downstream event for workflow triggers
      await inngest.send({
        name: 'payment/intent.succeeded',
        data: {
          paymentIntentId: pi.id,
          bookingId: bookingId ?? '',
          tenantId,
          amount: pi.amount / 100,
        },
      })

      log.info({ stripeEventId, invoiceId, tenantId }, 'Payment recorded from Stripe webhook')
    })
    break

  case 'payment_intent.payment_failed':
    await step.run('handle-payment-failed', async () => {
      const pi = payload as {
        id: string;
        metadata?: { bookingId?: string; tenantId?: string; invoiceId?: string };
        last_payment_error?: { message?: string };
      }
      const tenantId = pi.metadata?.tenantId
      const bookingId = pi.metadata?.bookingId

      if (!tenantId) {
        log.warn({ stripeEventId }, 'Missing tenantId on payment_intent.payment_failed')
        return
      }

      const errorMsg = pi.last_payment_error?.message ?? 'Payment failed'

      // Emit event for notification system to alert tenant
      await inngest.send({
        name: 'payment/intent.failed',
        data: {
          paymentIntentId: pi.id,
          bookingId: bookingId ?? '',
          tenantId,
          error: errorMsg,
        },
      })

      log.warn({ stripeEventId, tenantId, error: errorMsg }, 'Stripe payment failed')
    })
    break

  case 'charge.dispute.created':
    await step.run('handle-dispute', async () => {
      const dispute = payload as {
        id: string;
        payment_intent?: string;
        amount: number;
        metadata?: { tenantId?: string };
      }
      const tenantId = dispute.metadata?.tenantId

      if (!tenantId) {
        log.warn({ stripeEventId }, 'Missing tenantId on charge.dispute.created')
        return
      }

      // Emit event for notification and workflow triggers
      await inngest.send({
        name: 'payment/dispute.created',
        data: {
          disputeId: dispute.id,
          paymentId: dispute.payment_intent ?? '',
          tenantId,
          amount: dispute.amount / 100,
        },
      })

      log.warn({ stripeEventId, disputeId: dispute.id, tenantId }, 'Stripe dispute created')
    })
    break

  default:
    log.info({ eventType }, 'Unhandled Stripe webhook event type')
}
```

**Add import at top of file:**
```typescript
import * as paymentService from './payment.service'
```

**Dependencies:** S1.1 (error conversion) so that payment service errors surface correctly.

---

## Phase S2: Bug Fixes & Stub Completions

These fixes address correctness bugs, enforce security invariants, and complete partially implemented features.

### S2.1: approveSignup Bug Fix

**Priority:** HIGH
**Effort:** Small
**Files to modify:**
- `src/modules/platform/platform.repository.ts` (add `findSignupRequestById` method)
- `src/modules/platform/platform.service.ts` (lines 361-362)

**Problem:** `approveSignup` calls `listSignupRequests({ limit: 1 })` and then does `.find(r => r.id === input.id)`. If the desired request is not the newest one, `.find()` returns `undefined` and the approval proceeds without activating the tenant.

**Implementation:**

1. **Add to `platform.repository.ts`** (after `listSignupRequests` at ~line 499):

```typescript
async findSignupRequestById(id: string): Promise<SignupRequest | null> {
  log.info({ id }, "findSignupRequestById");
  const [row] = await db
    .select()
    .from(signupRequest)
    .where(eq(signupRequest.id, id))
    .limit(1);
  return row ? mapSignupRequest(row) : null;
},
```

2. **Fix `platform.service.ts`** (replace lines 361-362):

```typescript
// BEFORE:
const requests = await platformRepository.listSignupRequests({ limit: 1 });
const signupReq = requests.find((r) => r.id === input.id);

// AFTER:
const signupReq = await platformRepository.findSignupRequestById(input.id);
```

**Dependencies:** None.

---

### S2.2: Module Gating Middleware

**Priority:** HIGH
**Effort:** Medium
**Files to modify:** `src/shared/trpc.ts` (lines 789-798)

**Problem:** `createModuleMiddleware()` is a Phase 0 stub that always passes through. No module access is actually enforced at the procedure level.

**Approach:** Replace the stub with real module checking using `tenantService.isModuleEnabled()`, which already exists and works with Redis caching.

**Implementation — replace lines 789-798:**

```typescript
export function createModuleMiddleware(moduleSlug: string) {
  return middleware(async ({ ctx, next }) => {
    // Skip module gating for platform admins — they can access all modules
    if (ctx.user && (ctx.user as Record<string, unknown>).isPlatformAdmin) {
      return next({ ctx });
    }

    // Lazy import to avoid circular dependency
    const { tenantService } = await import('@/modules/tenant/tenant.service');

    const enabled = await tenantService.isModuleEnabled(ctx.tenantId, moduleSlug);
    if (!enabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Module '${moduleSlug}' is not enabled for this tenant`,
      });
    }

    return next({ ctx });
  });
}
```

**Note:** The lazy import is necessary because `trpc.ts` is imported by all modules, and importing `tenantService` directly would create a circular dependency.

**Usage:** Module routers should already reference `createModuleMiddleware` per the architecture. If they do not, this is an enhancement task. The middleware is wired by individual module routers (e.g., `const reviewProcedure = tenantProcedure.use(createModuleMiddleware("review-automation"))`) — verify and add where missing.

**Dependencies:** None, but should be done after S1.1 since it throws domain-style errors.

---

### S2.3: Customer Merge Audit Log

**Priority:** MEDIUM
**Effort:** Small
**Files to modify:** `src/modules/customer/customer.service.ts` (lines 158-170)

**Problem:** Customer merge writes a `log.warn` instead of inserting into the `auditLogs` table. The comment says "auditLogs table does not exist" but it does exist and is actively used by the platform module.

**Approach:** Import `platformRepository.insertAuditLog` and write the merge event to the database.

**Implementation — replace lines 158-170:**

```typescript
// Import at top of file:
import { platformRepository } from '@/modules/platform/platform.repository'

// Inside the merge transaction (after customerRepository.merge):
await platformRepository.insertAuditLog({
  tenantId: ctx.tenantId,
  userId: ctx.user?.id ?? null,
  action: "CUSTOMER_MERGED",
  entityType: "customer",
  entityId: sourceId,
  oldValues: sourceSnapshot,
  newValues: { mergedIntoId: targetId },
  severity: "INFO",
});
```

**Note:** `insertAuditLog` accepts `Omit<AuditLogRecord, "id" | "createdAt">` and generates the id/timestamp internally. The transaction (`tx`) passed to `customerRepository.merge` is separate from the audit insert — this is acceptable since the audit log is a non-critical side effect. If atomicity is needed, pass `tx` to a new `insertAuditLog` variant that accepts a transaction.

**Dependencies:** None.

---

### S2.4: Overdue Invoice Cron

**Priority:** MEDIUM
**Effort:** Small
**Files to modify:** `src/modules/payment/payment.events.ts` (lines 46-50)

**Problem:** The daily cron at 9 AM has a TODO body — overdue invoices are never marked.

**Implementation — replace lines 46-50:**

```typescript
await step.run('mark-overdue-invoices', async () => {
  log.info('Checking for overdue invoices')

  // Find invoices past due date in payable statuses
  const overdueInvoices = await db
    .select({ id: invoices.id, tenantId: invoices.tenantId, version: invoices.version })
    .from(invoices)
    .where(and(
      sql`${invoices.status} IN ('SENT', 'VIEWED', 'PARTIALLY_PAID')`,
      sql`${invoices.dueDate} < CURRENT_DATE`
    ))

  let marked = 0
  for (const inv of overdueInvoices) {
    try {
      await paymentRepository.updateInvoiceStatus(inv.id, inv.tenantId, inv.version, 'OVERDUE')
      marked++
    } catch (err) {
      // Optimistic concurrency failure — invoice was modified concurrently, skip
      log.warn({ invoiceId: inv.id, err }, 'Failed to mark invoice as overdue (concurrent modification)')
    }
  }

  log.info({ total: overdueInvoices.length, marked }, 'Overdue invoice cron complete')
})
```

**Add imports at top of file:**
```typescript
import { db } from '@/shared/db'
import { and, sql } from 'drizzle-orm'
import { invoices } from '@/shared/db/schemas/shared.schema'
import * as paymentRepository from './payment.repository'
```

**Dependencies:** None.

---

### S2.5: Scheduling Service Stubs

**Priority:** LOW
**Effort:** Medium
**Files to modify:** `src/modules/scheduling/scheduling.service.ts` (lines 240-291)

**Problem:** Four service methods return empty arrays or hardcoded "optimal" values.

**Approach:** Wire to booking repository for actual data. Each method requires joining bookings with staff/user data.

**Implementation outline:**

1. **`getAvailableStaffForSlot`** (line 240-245):
   - Query all active staff for tenant: `db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.isTeamMember, true), eq(users.status, 'ACTIVE')))`
   - For each staff member, use existing `teamRepository.getStaffAvailableSlots()` to check availability against the slot's time window
   - Return list of available staff with their availability details

2. **`getStaffRecommendations`** (line 252-257):
   - Load booking details from `bookingRepository.findById()`
   - Get available staff using `getAvailableStaffForSlot()`
   - Call existing `lib/recommendations.ts` ranking algorithm
   - Return ranked results

3. **`getSchedulingAlerts`** (line 269-274):
   - Query bookings for the given date: `db.select().from(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.scheduledDate, date)))`
   - Check for conflicts (overlapping bookings for same staff)
   - Check for back-to-back bookings with insufficient buffer
   - Return alert objects

4. **`getAssignmentHealth`** (line 282-289):
   - Load the booking and get its assigned staff member
   - Call existing `lib/assignment-health.ts` with real sibling bookings data
   - Return health assessment

**Dependencies:** Access to `bookingRepository` — may require adding import. Check for circular dependencies.

---

### S2.6: Tenant getUsage

**Priority:** MEDIUM
**Effort:** Small
**Files to modify:**
- `src/modules/tenant/tenant.service.ts` (lines 199-209)
- `src/modules/tenant/tenant.repository.ts` (add count queries)

**Problem:** Returns `{ bookingCount: 0, staffCount: 0 }` always.

**Implementation:**

1. **Add to `tenant.repository.ts`:**

```typescript
async getUsageCounts(tenantId: string): Promise<{ bookingCount: number; staffCount: number }> {
  const [[bookingRow], [staffRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isTeamMember, true))),
  ])
  return {
    bookingCount: bookingRow?.count ?? 0,
    staffCount: staffRow?.count ?? 0,
  }
}
```

2. **Update `tenant.service.ts`** (replace lines 199-209):

```typescript
async getUsage(ctx: Context): Promise<{ bookingCount: number; staffCount: number }> {
  log.info({ tenantId: ctx.tenantId }, "getUsage");
  return tenantRepository.getUsageCounts(ctx.tenantId);
},
```

**Imports needed:** `bookings` from `booking.schema`, `users` from `auth.schema` (or `schema`), `sql` from `drizzle-orm`.

**Dependencies:** None.

---

### S2.7: Venue Soft Delete

**Priority:** MEDIUM
**Effort:** Small
**Files to modify:** `src/modules/tenant/tenant.repository.ts` (lines 491-497)

**Problem:** `deleteVenue` uses `db.delete()` (hard delete). The `venues` table has an `active` boolean column (confirmed in `services.schema.ts` line 53) that should be used for soft deletion.

**Implementation — replace lines 491-497:**

```typescript
async deleteVenue(tenantId: string, venueId: string): Promise<void> {
  log.info({ tenantId, venueId }, "deleteVenue (soft)");

  const [updated] = await db
    .update(venues)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(venues.id, venueId), eq(venues.tenantId, tenantId)))
    .returning();

  if (!updated) throw new NotFoundError("Venue", venueId);
},
```

**Dependencies:** None.

---

### S2.8: Invoice Number Sequence

**Priority:** MEDIUM
**Effort:** Small
**Files to modify:** `src/modules/payment/payment.repository.ts` (lines 11-16)

**Problem:** `generateInvoiceNumber()` uses `Math.random()` which can produce duplicates. The `invoices` table has a unique index on `(tenantId, invoiceNumber)` so duplicates would cause insert failures.

**Approach:** Use a database sequence or tenant-scoped counter. Since the invoice number includes the year, a per-tenant counter stored in `organizationSettings` or a Redis atomic increment is cleanest.

**Implementation — replace lines 11-16:**

```typescript
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const counterKey = `invoice:counter:${tenantId}:${year}`

  // Atomic increment in Redis — returns the new counter value
  const seq = await redis.incr(counterKey)

  // Set TTL on first use (expires at end of year + 1 month buffer)
  if (seq === 1) {
    const endOfYear = new Date(year + 1, 1, 1) // Feb 1 next year
    const ttl = Math.floor((endOfYear.getTime() - now.getTime()) / 1000)
    await redis.expire(counterKey, ttl)
  }

  return `INV-${year}-${String(seq).padStart(6, '0')}`
}
```

**Update callsite** at line 28 — change `generateInvoiceNumber()` to `await generateInvoiceNumber(tenantId)`:

```typescript
invoiceNumber: await generateInvoiceNumber(tenantId),
```

**Add import:** `import { redis } from '@/shared/redis'`

**Dependencies:** None.

---

### S2.9: CREATE_TASK Workflow Action

**Priority:** LOW
**Effort:** Small
**Files to modify:** `src/modules/workflow/engine/actions.ts` (lines 130-135)

**Problem:** CREATE_TASK action is stubbed with "no tasks table yet" but the `tasks` table exists with 15 columns (confirmed in `shared.schema.ts` line 342).

**Implementation — replace lines 130-135:**

```typescript
case 'CREATE_TASK': {
  const cfg = config as CreateTaskActionConfig
  const title = cfg.title ? substituteVariables(cfg.title, data) : 'Untitled Task'
  const description = cfg.description ? substituteVariables(cfg.description, data) : null
  const tenantId = String(data.tenantId ?? '')
  const assignedTo = cfg.assignedTo ? String(resolveField(cfg.assignedTo, data) ?? '') : null

  const [task] = await db.insert(tasks).values({
    id: sql`gen_random_uuid()`,
    projectId: cfg.projectId ?? tenantId, // default project = tenant
    tenantId,
    title,
    description,
    status: 'TODO',
    priority: cfg.priority ?? 'MEDIUM',
    assignedTo: assignedTo || null,
    dueDate: cfg.dueDateOffset
      ? new Date(Date.now() + cfg.dueDateOffset * 24 * 60 * 60 * 1000)
      : null,
    updatedAt: new Date(),
  }).returning()

  log.info({ taskId: task?.id, title, actionType }, 'CREATE_TASK completed')
  return { success: true, taskId: task?.id ?? '', title }
}
```

**Add imports at top of file:**
```typescript
import { db } from '@/shared/db'
import { tasks } from '@/shared/db/schemas/shared.schema'
import { sql } from 'drizzle-orm'
```

**Note:** The `CreateTaskActionConfig` type in `workflow.types.ts` may need updating to include `projectId`, `description`, `priority`, `assignedTo`, `dueDateOffset` fields. Check and extend as needed.

**Dependencies:** None.

---

## Phase S3: Missing Modules (Phase 7D Backend)

### S3.1: Settings Module

**Priority:** HIGH
**Effort:** Large
**Files to create:**
- `src/modules/settings/settings.types.ts` (~100 LOC)
- `src/modules/settings/settings.schemas.ts` (~150 LOC)
- `src/modules/settings/settings.repository.ts` (~400 LOC)
- `src/modules/settings/settings.service.ts` (~800 LOC)
- `src/modules/settings/settings.router.ts` (~150 LOC)
- `src/modules/settings/index.ts` (~10 LOC)

**Files to modify:**
- `src/server/root.ts` (add `settings: settingsRouter`)

**Architecture:** The settings module consolidates existing scattered functionality (tenant settings, module toggling) with new capabilities (notifications, integrations, API keys, billing, danger zone). It delegates to `tenantService`, `developerService`, and `calendarSyncService` where those implementations already exist.

**Module file structure — follow team module pattern:**

```
src/modules/settings/
  settings.types.ts       # Interfaces for NotificationSettings, IntegrationsResponse,
                          # BillingResponse, ApiKeyListResponse, ExportDataResponse
  settings.schemas.ts     # Zod schemas: updateGeneralSchema, updateNotificationsSchema,
                          # createApiKeySchema (inline z.object for simple inputs)
  settings.repository.ts  # New queries: apiKeys CRUD, calendarConnections queries,
                          # notification template queries
  settings.service.ts     # Business logic: delegates to tenant/developer/calendarSync services,
                          # implements API key generation (crypto.randomBytes + SHA-256)
  settings.router.ts      # 15 tRPC procedures (see Phase 7D plan for full list)
  index.ts                # Barrel export: settingsRouter, settingsService
```

**Procedures (15 total):**

| Procedure | Permission | Delegates To |
|-----------|-----------|-------------|
| `getGeneral` | `tenantProcedure` | `tenantService.getSettings()` |
| `updateGeneral` | `permissionProcedure('tenant:write')` | `tenantService.updateSettings()` |
| `getNotifications` | `tenantProcedure` | New: query `organizationSettings` notification columns |
| `updateNotifications` | `permissionProcedure('tenant:write')` | New: update `organizationSettings` |
| `getIntegrations` | `tenantProcedure` | New: query `calendarConnections` table |
| `connectGoogle` | `permissionProcedure('integrations:write')` | Delegate to `calendarSyncService` |
| `disconnectGoogle` | `permissionProcedure('integrations:write')` | Update `calendarConnections.isActive = false` |
| `connectOutlook` | `permissionProcedure('integrations:write')` | Delegate to `calendarSyncService` |
| `disconnectOutlook` | `permissionProcedure('integrations:write')` | Update `calendarConnections.isActive = false` |
| `getBilling` | `tenantProcedure` | Query `tenants` table plan/usage fields |
| `getModules` | `tenantProcedure` | `tenantService.listModules()` |
| `toggleModule` | `permissionProcedure('tenant:write')` | `tenantService.toggleModule()` |
| `listApiKeys` | `tenantProcedure` | New: query `apiKeys` table (mask key, show prefix) |
| `createApiKey` | `permissionProcedure('developer:write')` | New: generate key with `crypto.randomBytes(32)`, hash with SHA-256, store `keyHash` + `keyPrefix` |
| `revokeApiKey` | `permissionProcedure('developer:write')` | New: set `revokedAt = NOW()` |

**Key implementation details for API keys:**

```typescript
// settings.service.ts
import crypto from 'crypto'

async function createApiKey(ctx: Context, input: CreateApiKeyInput) {
  const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 12) // "sk_live_1234"

  const [row] = await db.insert(apiKeys).values({
    id: sql`gen_random_uuid()`,
    tenantId: ctx.tenantId,
    name: input.name,
    keyHash,
    keyPrefix,
    scopes: input.scopes ?? ['read'],
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdBy: ctx.user?.id ?? null,
  }).returning()

  // Emit audit log
  await platformRepository.insertAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.user?.id ?? null,
    action: 'api_key.created',
    entityType: 'api_key',
    entityId: row!.id,
    severity: 'INFO',
  })

  return { ...row!, key: rawKey } // Full key returned ONLY at creation
}
```

**Schema for `apiKeys` table** (confirmed in `auth.schema.ts` lines 192-218):
- `id` UUID PK, `tenantId` UUID FK, `name` text, `keyHash` text (unique), `keyPrefix` text, `scopes` text[], `rateLimit` int, `allowedIps` text[], `allowedOrigins` text[], `lastUsedAt` timestamp, `usageCount` bigint, `expiresAt` timestamp, `revokedAt` timestamp, `createdAt` timestamp, `createdBy` UUID

**Dependencies:** S1.1 (error conversion) must be done first so domain errors from the new module surface correctly. S2.3 (audit log pattern) should be done first to establish the shared audit insertion pattern.

---

### S3.2: Audit Module

**Priority:** HIGH
**Effort:** Medium
**Files to create:**
- `src/modules/audit/audit.types.ts` (~50 LOC)
- `src/modules/audit/audit.schemas.ts` (~80 LOC)
- `src/modules/audit/audit.repository.ts` (~200 LOC)
- `src/modules/audit/audit.service.ts` (~300 LOC)
- `src/modules/audit/audit.router.ts` (~50 LOC)
- `src/modules/audit/index.ts` (~10 LOC)

**Files to modify:**
- `src/server/root.ts` (add `audit: auditRouter`)

**Procedures (2):**

#### `list` — Paginated Audit Entries with Filters

```typescript
// audit.schemas.ts
export const listAuditLogsSchema = z.object({
  resourceType: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
```

**Repository query:**

```typescript
// audit.repository.ts
async function listAuditLogs(tenantId: string, opts: ListAuditLogsInput) {
  const conditions: SQL[] = [eq(auditLogs.tenantId, tenantId)]

  if (opts.resourceType) conditions.push(eq(auditLogs.entityType, opts.resourceType))
  if (opts.actorId) conditions.push(eq(auditLogs.userId, opts.actorId))
  if (opts.action) conditions.push(eq(auditLogs.action, opts.action))
  if (opts.from) conditions.push(gte(auditLogs.createdAt, new Date(opts.from)))
  if (opts.to) conditions.push(lte(auditLogs.createdAt, new Date(opts.to)))

  if (opts.cursor) {
    const decoded = JSON.parse(Buffer.from(opts.cursor, 'base64').toString())
    conditions.push(lte(auditLogs.createdAt, new Date(decoded.createdAt)))
  }

  const rows = await db
    .select({
      id: auditLogs.id,
      timestamp: auditLogs.createdAt,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      severity: auditLogs.severity,
      metadata: auditLogs.metadata,
      userId: auditLogs.userId,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(opts.limit + 1)

  const hasMore = rows.length > opts.limit
  const entries = hasMore ? rows.slice(0, -1) : rows
  const nextCursor = hasMore && entries.length > 0
    ? Buffer.from(JSON.stringify({
        createdAt: entries[entries.length - 1]!.timestamp.toISOString(),
        id: entries[entries.length - 1]!.id,
      })).toString('base64')
    : undefined

  return { entries, nextCursor, hasMore }
}
```

**Note:** The existing `platformRepository.queryAuditLog` (line 440) does similar but returns `AuditLogRecord` type and does NOT join `users`. The audit module should implement its own repository method with the user join for actor names.

#### `exportCsv` — CSV Export

**Service implementation:**

```typescript
async function exportCsv(tenantId: string, filters: ExportCsvInput) {
  // Same query as list, but no pagination — hard limit 10,000 rows
  const entries = await auditRepository.listAll(tenantId, { ...filters, limit: 10000 })

  const header = 'Timestamp,Actor,Action,Resource Type,Resource ID,Changes\n'
  const rows = entries.map(e => {
    const changes = diffValues(e.oldValues, e.newValues)
    const changesStr = changes.map(c => `${c.field}: ${c.before} -> ${c.after}`).join('; ')
    return [
      e.timestamp.toISOString(),
      csvEscape(e.actorEmail ?? 'System'),
      csvEscape(e.action),
      csvEscape(e.entityType ?? ''),
      csvEscape(e.entityId ?? ''),
      csvEscape(changesStr),
    ].join(',')
  }).join('\n')

  const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
  return { csv: header + rows, filename }
}
```

**Schema indexes verified:** `audit_logs_tenantId_createdAt_idx`, `audit_logs_tenantId_entityType_entityId_idx`, `audit_logs_userId_idx`, `audit_logs_action_idx` all exist (confirmed in `shared.schema.ts` lines 121-124).

**Permission:** `permissionProcedure('audit:read')` for both procedures.

**Dependencies:** S1.1 (error conversion), S3.1 (settings module should be done first as it is larger and more complex — but they are independent).

---

### S3.3: Additional Analytics Procedures

**Priority:** HIGH
**Effort:** Large
**Files to modify:**
- `src/modules/analytics/analytics.schemas.ts` (add 6 new schemas)
- `src/modules/analytics/analytics.repository.ts` (add 6 aggregation queries)
- `src/modules/analytics/analytics.service.ts` (add 6 service methods)
- `src/modules/analytics/analytics.router.ts` (add 6 procedures)

**Procedures (6):**

#### 1. `getKPIs` — 4 KPI Cards with Period Comparisons

**Permission:** `tenantProcedure`
**Input:** `{ period: 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' }`

**Repository:** 4 queries, each run twice (current period + previous period):
- Booking count: `COUNT(*) FROM bookings WHERE status IN ('CONFIRMED', 'COMPLETED')` + date filter
- Revenue: `SUM(amount) FROM payments WHERE status = 'COMPLETED'` + date filter
- Avg rating: `AVG(rating) FROM reviews WHERE isPublished = true` + date filter
- New customers: `COUNT(*) FROM customers` + date filter

**Business logic:** Compute `percentChange = ((current - previous) / previous) * 100`. Handle division by zero (return `null`).

**Redis cache:** `analytics:kpis:{tenantId}:{period}` with 5-minute TTL.

#### 2. `getRevenueChart` — Time Series Revenue

**Permission:** `permissionProcedure('analytics:read')`
**Input:** `{ from: string, to: string, granularity: 'DAY' | 'WEEK' | 'MONTH' }`

**Repository:** Reuse existing `getTimeSeriesMetric()` for `revenue.gross`. Add fallback to raw `payments` table aggregation with `date_trunc(granularity, paid_at)` grouping.

#### 3. `getBookingsByStatus` — Donut Chart

**Permission:** `tenantProcedure`
**Input:** `{ from: string, to: string }`

**Repository:** `SELECT status, COUNT(*) FROM bookings WHERE tenant_id = ? AND created_at BETWEEN ? AND ? GROUP BY status`

**Business logic:** Calculate percentages. Include all statuses even if count = 0.

#### 4. `getTopServices` — Ranked by Revenue

**Permission:** `permissionProcedure('analytics:read')`
**Input:** `{ from: string, to: string, limit: number (default 10) }`

**Repository:** Join `bookings` + `services`, aggregate by `services.id`. Use `bookings.price` (not `finalPrice` — the booking schema column is `price` per `booking.schema.ts` line 60). Filter to `CONFIRMED`/`COMPLETED` only.

#### 5. `getStaffUtilization` — Heatmap Grid

**Permission:** `permissionProcedure('analytics:read')`
**Input:** `{ from: string, to: string, staffIds?: string[] }`

**Repository:** Two queries:
- Available hours: `userAvailability` table for recurring windows
- Booked hours: `bookings` grouped by `EXTRACT(HOUR FROM start_time)` and `EXTRACT(DOW FROM start_time)`

**Business logic:** Calculate `utilization = (bookedMinutes / availableMinutes) * 100` per hour/day cell.

**Redis cache:** 1-hour TTL due to computation cost.

#### 6. `getChurnRisk` — At-Risk Customers

**Permission:** `permissionProcedure('analytics:read')`
**Input:** `{ riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW', limit: number (default 20) }`

**Repository:** Batch query all customers with booking/payment aggregates (same pattern as `getCustomerBookingStats` from S1.3 but for all customers).

**Business logic:** Compute RFM score for each customer using existing `computeChurnScore`/`computeChurnLabel` from `lib/customer-intelligence`. Filter by `riskLevel` if specified. Sort by score descending.

**Redis cache:** 1-hour TTL for full customer list.

**Dependencies:** S1.2 and S1.3 (getSummary and getCustomerInsights) should be done first since they establish repository patterns reused here.

---

### S3.4: Workflow getExecutionDetail Procedure

**Priority:** MEDIUM
**Effort:** Small
**Files to modify:**
- `src/modules/workflow/workflow.repository.ts` (add `findExecutionById`)
- `src/modules/workflow/workflow.service.ts` (add `getExecutionDetail`)
- `src/modules/workflow/workflow.router.ts` (add procedure)

**Implementation:**

1. **Repository** — add after `listExecutions`:

```typescript
async findExecutionById(tenantId: string, executionId: string): Promise<WorkflowExecutionRecord | null> {
  const [row] = await db
    .select()
    .from(workflowExecutions)
    .where(and(
      eq(workflowExecutions.id, executionId),
      eq(workflowExecutions.tenantId, tenantId)
    ))
    .limit(1)
  return row ? mapExecutionRow(row) : null
},
```

2. **Service:**

```typescript
async getExecutionDetail(ctx: Context, executionId: string) {
  const execution = await workflowRepository.findExecutionById(ctx.tenantId, executionId)
  if (!execution) throw new NotFoundError('WorkflowExecution', executionId)

  const workflow = await workflowRepository.findById(ctx.tenantId, execution.workflowId)

  return {
    ...execution,
    workflow: workflow ? { id: workflow.id, name: workflow.name } : null,
    steps: execution.actionResults ?? [],
    duration: execution.completedAt && execution.startedAt
      ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
      : null,
  }
}
```

3. **Router:**

```typescript
getExecutionDetail: tenantProcedure
  .input(z.object({ executionId: z.string() }))
  .query(({ ctx, input }) => workflowService.getExecutionDetail(ctx, input.executionId)),
```

**Dependencies:** None.

---

### S3.5: Analytics upsertSnapshot Atomicity

**Priority:** LOW
**Effort:** Small
**Files to modify:** `src/modules/analytics/analytics.repository.ts` (lines 29-57)

**Problem:** `upsertSnapshot` uses delete-then-insert which is not atomic. Under concurrent writes, data could be lost.

**Approach:** Wrap in a transaction. A true `ON CONFLICT DO UPDATE` is preferred but requires a unique constraint on `(tenantId, metricKey, periodType, periodStart)` which may not exist in the schema.

**Implementation — replace lines 37-57:**

```typescript
export async function upsertSnapshot(snapshot: {
  tenantId: string
  metricKey: string
  dimensions: Record<string, string>
  periodType: string
  periodStart: Date
  value: number
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(metricSnapshots)
      .where(and(
        eq(metricSnapshots.tenantId, snapshot.tenantId),
        eq(metricSnapshots.metricKey, snapshot.metricKey),
        eq(metricSnapshots.periodType, snapshot.periodType),
        eq(metricSnapshots.periodStart, snapshot.periodStart)
      ))

    await tx.insert(metricSnapshots).values({
      tenantId:    snapshot.tenantId,
      metricKey:   snapshot.metricKey,
      dimensions:  snapshot.dimensions,
      periodType:  snapshot.periodType,
      periodStart: snapshot.periodStart,
      value:       String(snapshot.value),
    })
  })
}
```

**Future improvement:** Add a unique constraint via migration and use Drizzle `onConflictDoUpdate`.

**Dependencies:** None.

---

## Phase S4: Test Coverage

### S4.1: Platform Module Tests

**Priority:** HIGH
**Effort:** Large
**Files to create:** `src/modules/platform/__tests__/platform.service.test.ts`

**Test areas (minimum 12 tests):**
- Tenant provisioning: verify modules are created, settings are initialized
- `approveSignup`: verify the fixed flow (uses `findSignupRequestById`)
- `rejectSignup`: verify status update
- `suspendTenant` / `activateTenant`: verify status transitions
- Impersonation: `startImpersonation` stores Redis session, `endImpersonation` clears it
- Feature flag CRUD: create, toggle, delete
- Signup request listing with status filter

**Test pattern:** Follow `team.availability.test.ts` — mock `@/shared/db` with chainable Drizzle mock, mock `@/shared/redis`, mock `drizzle-orm`.

**Dependencies:** S2.1 (approveSignup fix) must be done first.

---

### S4.2: Tenant Module Tests

**Priority:** MEDIUM
**Effort:** Medium
**Files to create:** `src/modules/tenant/__tests__/tenant.service.test.ts`

**Test areas (minimum 8 tests):**
- `getSettings` / `updateSettings`
- `isModuleEnabled` (cached and uncached paths)
- `listModules` / `toggleModule`
- `getUsage` (after S2.6 fix)
- Venue CRUD (create, update, soft delete)

**Dependencies:** S2.6 (getUsage), S2.7 (venue soft delete) should be done first.

---

### S4.3: Settings Module Tests

**Priority:** HIGH
**Effort:** Large
**Files to create:** `src/modules/settings/__tests__/settings.service.test.ts`

**Test areas (minimum 18 tests — 3 per procedure for 6 key procedures):**
- `getGeneral` / `updateGeneral`: verify delegation to tenant service
- `getNotifications` / `updateNotifications`: verify settings round-trip
- API key lifecycle: `createApiKey` generates secure key, `listApiKeys` masks keys, `revokeApiKey` soft-deletes
- Permission enforcement: verify each permission tier rejects unauthorized users

**Dependencies:** S3.1 (settings module creation).

---

### S4.4: Audit Module Tests

**Priority:** MEDIUM
**Effort:** Medium
**Files to create:** `src/modules/audit/__tests__/audit.service.test.ts`

**Test areas (minimum 10 tests):**
- `list`: empty results, with filters, pagination (cursor-based), tenant isolation
- `exportCsv`: correct CSV format, 10k row limit, proper escaping

**Dependencies:** S3.2 (audit module creation).

---

### S4.5: Analytics Extended Tests

**Priority:** MEDIUM
**Effort:** Medium
**Files to create:** `src/modules/analytics/__tests__/analytics-kpis.test.ts`

**Test areas (minimum 18 tests — 3 per new procedure):**
- `getKPIs`: with data, empty data (zeros), division by zero (previous = 0)
- `getRevenueChart`: daily/weekly/monthly granularity
- `getBookingsByStatus`: all statuses present, date filtering
- `getTopServices`: ranking order, limit enforcement
- `getStaffUtilization`: with/without staffId filter
- `getChurnRisk`: risk level filtering, RFM scoring accuracy

**Dependencies:** S3.3 (analytics procedures).

---

### S4.6: Payment Service Tests

**Priority:** LOW
**Effort:** Medium
**Files to create:** `src/modules/payment/__tests__/payment.service.test.ts`

**Test areas (minimum 8 tests):**
- `createInvoice`: generates unique invoice number
- `sendInvoice`: validates state transition
- `recordPayment`: partial and full payment paths
- `voidInvoice`: idempotent when invoice already voided
- Stripe webhook handler: payment succeeded path, failed path

**Dependencies:** S1.5 (Stripe webhook handlers).

---

## Phase S5: Cleanup

### S5.1: Dead Analytics Schemas

**Priority:** LOW
**Effort:** Small
**Files to modify:** `src/modules/analytics/analytics.schemas.ts`

**Action:** Remove `staffPerformanceSchema`, `revenueSchema`, `funnelSchema` (lines 15-31) unless corresponding procedures are being implemented in S3.3. If S3.3 introduces procedures that use these schemas, keep and update them. If not, remove to reduce dead code.

**Decision:** These schemas overlap with but do not match the Phase 7D procedure inputs. The Phase 7D schemas use different field names. **Remove** the old schemas and use the new ones from S3.3.

---

### S5.2: Unused generateSlug Function

**Priority:** LOW
**Effort:** Small
**Files to modify:** `src/modules/platform/platform.service.ts` (lines 45-53)

**Action:** Remove the `generateSlug()` helper function. Slug generation is done inline in `provisionTenant()`. Verify no other callers exist with a grep.

---

### S5.3: Duplicate Expression Test Files

**Priority:** LOW
**Effort:** Small

**Action:** Compare `src/modules/workflow/__tests__/expressions.test.ts` and `src/modules/workflow/engine/__tests__/expressions.test.ts`. If they are duplicates (same test cases), remove the one in the outer `__tests__/` directory since the engine tests are more appropriately located.

---

### S5.4: Auth Hooks TODO

**Priority:** LOW
**Effort:** Small
**Files to modify:** `src/modules/auth/hooks.ts` (line 63)

**Action:** The TODO says "wire to tRPC auth.me query once tRPC client provider is set up." Since the tRPC client is now set up, either implement the wiring or remove the TODO comment if the hook has been superseded by a different auth approach.

---

### S5.5: Scheduling Event Handler Stubs

**Priority:** LOW
**Effort:** Small
**Files to modify:** `src/modules/scheduling/scheduling.events.ts` (lines 26-28, 53)

**Action:** These are Phase 4 TODOs about loading booking details and emitting notification events. Either wire them to the booking repository (if needed) or remove the TODO comments and add a brief comment explaining the current scope.

---

## Dependencies

```
Phase S1 (Critical):
  S1.1 (Error Conversion) ─── no deps, DO FIRST
  S1.2 (getSummary)       ─── after S1.1
  S1.3 (getCustomerInsights) ─── after S1.1, can parallel with S1.2
  S1.4 (Booking Saga)     ─── after S1.1, can parallel
  S1.5 (Stripe Webhooks)  ─── after S1.1, can parallel

Phase S2 (Bug Fixes):
  S2.1 (approveSignup)    ─── no deps, can parallel with S1
  S2.2 (Module Gating)    ─── after S1.1
  S2.3 (Merge Audit)      ─── no deps
  S2.4 (Overdue Cron)     ─── no deps
  S2.5 (Scheduling Stubs) ─── no deps
  S2.6 (Tenant getUsage)  ─── no deps
  S2.7 (Venue Soft Delete) ─── no deps
  S2.8 (Invoice Number)   ─── no deps
  S2.9 (CREATE_TASK)      ─── no deps

Phase S3 (Missing Modules):
  S3.1 (Settings Module)     ─── after S1.1, S2.3
  S3.2 (Audit Module)        ─── after S1.1
  S3.3 (Analytics Procedures) ─── after S1.2, S1.3
  S3.4 (Workflow Detail)     ─── no deps
  S3.5 (upsert Atomicity)   ─── no deps

Phase S4 (Tests):
  S4.1 (Platform Tests)   ─── after S2.1
  S4.2 (Tenant Tests)     ─── after S2.6, S2.7
  S4.3 (Settings Tests)   ─── after S3.1
  S4.4 (Audit Tests)      ─── after S3.2
  S4.5 (Analytics Tests)  ─── after S3.3
  S4.6 (Payment Tests)    ─── after S1.5

Phase S5 (Cleanup):
  All S5 tasks ─── no deps, can be done anytime
```

---

## Parallel Execution Strategy

### Wave 1 (Day 1): Foundation — 1 engineer
1. **S1.1** — Error conversion middleware (30 min)
2. **S2.1** — approveSignup bug fix (15 min)
3. **S2.3** — Customer merge audit log (15 min)
4. **S2.7** — Venue soft delete (15 min)
5. **S2.8** — Invoice number sequence (30 min)
6. **S2.4** — Overdue invoice cron (30 min)
7. **S2.9** — CREATE_TASK action (30 min)

### Wave 2 (Day 1-2): Critical Stubs — 2 engineers in parallel
- **Engineer A:** S1.2 + S1.3 (analytics getSummary + getCustomerInsights)
- **Engineer B:** S1.4 + S1.5 (booking saga + Stripe webhooks)

### Wave 3 (Day 2-3): Module Gating + New Modules — 2 engineers in parallel
- **Engineer A:** S2.2 (module gating) + S3.1 (settings module — largest item)
- **Engineer B:** S3.2 (audit module) + S3.4 (workflow detail) + S3.5 (upsert atomicity)

### Wave 4 (Day 3-4): Analytics Extension — 1 engineer
- **S3.3** — 6 new analytics procedures (most complex: getStaffUtilization, getChurnRisk)

### Wave 5 (Day 4-5): Tests — 2 engineers in parallel
- **Engineer A:** S4.1 (platform) + S4.3 (settings) + S4.5 (analytics)
- **Engineer B:** S4.2 (tenant) + S4.4 (audit) + S4.6 (payment)

### Wave 6 (Day 5): Cleanup — 1 engineer
- All S5 tasks (1-2 hours total)
- Final `tsc --noEmit`, `pnpm build`, `pnpm test` verification

### Wave 7 (Optional): Lower-priority stubs
- S2.5 (scheduling stubs) — can be deferred if not blocking frontend
- S2.6 (tenant getUsage) — small, do whenever convenient

---

## Total Estimated Effort

| Phase | Tasks | New LOC | Modified LOC | Estimated Time |
|-------|-------|---------|-------------|---------------|
| S1    | 5     | ~500    | ~200        | 1.5 days      |
| S2    | 9     | ~300    | ~150        | 1 day         |
| S3    | 5     | ~2,800  | ~900        | 3 days        |
| S4    | 6     | ~2,000  | 0           | 2 days        |
| S5    | 5     | 0       | ~50 (removes) | 0.5 days    |
| **Total** | **30** | **~5,600** | **~1,300** | **~8 days (1 engineer) / ~5 days (2 engineers)** |
