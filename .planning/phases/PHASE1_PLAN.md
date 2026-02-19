# Phase 1: Booking Module — Executable Plan

**Written:** 2026-02-19
**Status:** Ready to execute (after Phase 0 completes)
**Depends on:** Phase 0 — `src/shared/` infrastructure must exist

---

## Overview

**Phase goal:** Extract the largest god-router cluster (5 files, ~4,830 LOC) into a clean `src/modules/booking/` module with proper service/repository/router separation. After this phase: thin routers, business logic in services, all DB calls isolated in repositories, and all side effects (email, SMS, calendar) emitted as Inngest events instead of running inline.

### What gets built

| File | Purpose |
|------|---------|
| `src/modules/booking/booking.schemas.ts` | All Zod schemas |
| `src/modules/booking/booking.types.ts` | TypeScript types + enums |
| `src/modules/booking/booking.repository.ts` | All DB queries (Drizzle) |
| `src/modules/booking/booking.service.ts` | Business logic |
| `src/modules/booking/booking.router.ts` | Thin tRPC router |
| `src/modules/booking/booking.events.ts` | Inngest event handlers |
| `src/modules/booking/sub-routers/approval.router.ts` | Approval sub-router |
| `src/modules/booking/sub-routers/completion.router.ts` | Completion sub-router |
| `src/modules/booking/sub-routers/portal.router.ts` | Public portal sub-router |
| `src/modules/booking/sub-routers/slot.router.ts` | Slot availability sub-router |
| `src/modules/booking/index.ts` | Barrel export |

### Source files (legacy reference — read, do not copy)

| Legacy file | LOC | Disposition |
|-------------|-----|-------------|
| `src/server/routers/booking.ts` | 1,704 | Split into schema + service + repository + router |
| `src/server/routers/slot-availability.ts` | 1,577 | `slot.router.ts` + merged into scheduling service |
| `src/server/routers/approval.ts` | 562 | `approval.router.ts` sub-router |
| `src/server/routers/completion.ts` | 545 | `completion.router.ts` sub-router |
| `src/server/routers/portal.ts` | 442 | `portal.router.ts` sub-router |

### Success Criteria

Phase 1 is complete when ALL of the following are true:

- [ ] `npm run build` exits with 0 TypeScript errors
- [ ] `src/modules/booking/` contains all 11 files listed above
- [ ] Legacy routers can be deleted — all procedures are accessible at the same tRPC paths (no API surface change)
- [ ] Booking list, create, update, cancel all work end-to-end
- [ ] Portal booking flow works: `createBookingFromSlot` → RESERVED → `confirmReservation` (with token) → CONFIRMED
- [ ] Reservation expiry fires via Inngest (not cron polling)
- [ ] Calendar sync calls replaced by `inngest.send("calendar/sync.push", ...)`
- [ ] Email/SMS triggers replaced by `inngest.send("notification/send.email", ...)`
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] `npm run test` passes — BookingService unit tests all green
- [ ] Slot capacity enforcement verified: ConflictError thrown when at capacity

---

## Booking Status Flow

```
Portal bookings:  RESERVED (15min expiry) → CONFIRMED → IN_PROGRESS → COMPLETED
Admin bookings:   PENDING → APPROVED → CONFIRMED → IN_PROGRESS → COMPLETED
With approval:    PENDING → APPROVED/REJECTED
Auto-release:     RESERVED → RELEASED (Inngest delayed event at exact expiry time)
Cancellation:     any status → CANCELLED
```

---

## Task Breakdown

---

### PHASE1-T01: Create module directory structure

**Goal:** Scaffold all directories and empty index files.

```bash
mkdir -p src/modules/booking/sub-routers
touch src/modules/booking/index.ts
touch src/modules/booking/booking.schemas.ts
touch src/modules/booking/booking.types.ts
touch src/modules/booking/booking.repository.ts
touch src/modules/booking/booking.service.ts
touch src/modules/booking/booking.router.ts
touch src/modules/booking/booking.events.ts
touch src/modules/booking/sub-routers/approval.router.ts
touch src/modules/booking/sub-routers/completion.router.ts
touch src/modules/booking/sub-routers/portal.router.ts
touch src/modules/booking/sub-routers/slot.router.ts
```

**Verify:** Directory tree matches target structure.

---

### PHASE1-T02: Write `booking.types.ts`

**Goal:** TypeScript enums, types, and interfaces that mirror the DB schema.

**File: `src/modules/booking/booking.types.ts`**

```typescript
export type BookingStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESERVED' | 'RELEASED'
  | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type BookingSource = 'ADMIN' | 'PORTAL' | 'PHONE' | 'WALK_IN' | 'API'

export type LocationType = 'VENUE' | 'CUSTOMER_HOME' | 'CUSTOMER_WORK' | 'OTHER'

export interface LocationAddress {
  line1?: string
  line2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
}

export interface BookingRecord {
  id: string
  tenantId: string
  bookingNumber: string
  customerId: string
  serviceId: string
  staffId: string | null
  venueId: string | null
  scheduledDate: Date
  scheduledTime: string       // "HH:MM"
  durationMinutes: number
  endTime: string | null
  locationType: LocationType
  locationAddress: LocationAddress | null
  travelMinutes: number | null
  travelMiles: number | null
  mileageCost: number | null
  additionalCharges: number | null
  status: BookingStatus
  statusChangedAt: Date
  reservedAt: Date | null
  reservationExpiresAt: Date | null
  price: number | null
  taxAmount: number | null
  totalAmount: number | null
  depositRequired: number | null
  depositPaid: number
  depositPaidAt: Date | null
  customerNotes: string | null
  adminNotes: string | null
  customServiceName: string | null
  source: BookingSource
  requiresApproval: boolean
  slotId: string | null
  cancelledAt: Date | null
  cancelledBy: string | null
  cancellationReason: string | null
  completedAt: Date | null
  createdAt: Date
  createdById: string | null
  updatedAt: Date
}

export interface CreateBookingInput {
  customerId: string
  serviceId: string
  staffId?: string | null
  venueId?: string | null
  scheduledDate: Date
  scheduledTime: string
  durationMinutes: number
  locationType?: LocationType
  locationAddress?: LocationAddress | null
  price?: number | null
  customServiceName?: string | null
  customerNotes?: string | null
  adminNotes?: string | null
  source?: BookingSource
  slotId?: string
  staffIds?: string[]
  skipReservation?: boolean
}

export interface UpdateBookingInput {
  staffId?: string | null
  venueId?: string | null
  scheduledDate?: Date
  scheduledTime?: string
  durationMinutes?: number
  locationType?: LocationType
  locationAddress?: LocationAddress | null
  price?: number | null
  customerNotes?: string | null
  adminNotes?: string | null
  slotId?: string
  staffIds?: string[]
}

export interface SlotRecord {
  id: string
  tenantId: string
  date: Date
  time: string
  endTime: string | null
  available: boolean
  staffIds: string[]
  serviceIds: string[]
  venueId: string | null
  capacity: number
  bookedCount: number
  requiresApproval: boolean
  estimatedLocation: string | null
  previousSlotId: string | null
  travelTimeFromPrev: number | null
  metadata: Record<string, unknown> | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
```

**Verify:** File compiles with `tsc --noEmit`.

---

### PHASE1-T03: Write `booking.schemas.ts`

**Goal:** All Zod input validation schemas. Reference `booking.ts` lines 1–80 and `slot-availability.ts` lines 1–50 in the legacy codebase.

**File: `src/modules/booking/booking.schemas.ts`**

```typescript
import { z } from 'zod'

export const locationAddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
})

export const bookingStatusSchema = z.enum([
  'PENDING', 'APPROVED', 'REJECTED', 'RESERVED', 'RELEASED',
  'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
])

export const bookingSourceSchema = z.enum(['ADMIN', 'PORTAL', 'PHONE', 'WALK_IN', 'API'])

export const locationTypeSchema = z.enum(['VENUE', 'CUSTOMER_HOME', 'CUSTOMER_WORK', 'OTHER'])

export const createBookingSchema = z.object({
  customerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  scheduledDate: z.date(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().min(5),
  locationType: locationTypeSchema.default('VENUE'),
  locationAddress: locationAddressSchema.optional().nullable(),
  price: z.number().optional().nullable(),
  customServiceName: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  source: bookingSourceSchema.default('ADMIN'),
  slotId: z.string().uuid().optional(),
  staffIds: z.array(z.string().uuid()).optional(),
  skipReservation: z.boolean().optional().default(false),
})

export const updateBookingSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(5).optional(),
  locationType: locationTypeSchema.optional(),
  locationAddress: locationAddressSchema.optional().nullable(),
  price: z.number().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  slotId: z.string().uuid().optional(),
  staffIds: z.array(z.string().uuid()).optional(),
})

export const cancelBookingSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

export const listBookingsSchema = z.object({
  status: bookingStatusSchema.optional(),
  staffId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
})

export const calendarBookingsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  staffId: z.string().uuid().optional(),
})

// Portal booking schemas
export const createPortalBookingSchema = z.object({
  slug: z.string(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  scheduledDate: z.string(), // ISO date string from portal
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotId: z.string().uuid(),
  locationType: z.enum(['VENUE', 'CUSTOMER_HOME']).default('VENUE'),
  locationAddress: locationAddressSchema.optional(),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  formResponses: z.record(z.string()).optional(),
  skipReservation: z.boolean().optional().default(false),
})

export const confirmReservationSchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().min(64).max(64), // Required — plaintext token returned at reservation time
})

// Slot availability schemas
export const getSlotsForDateSchema = z.object({
  slug: z.string(),
  date: z.string(), // ISO date string
  serviceId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
})

export const getSlotsForDateRangeSchema = z.object({
  slug: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  serviceId: z.string().uuid().optional(),
})

// Approval schemas
export const approveBookingSchema = z.object({
  bookingId: z.string().uuid(),
  notes: z.string().optional(),
})

export const rejectBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(1),
})

export const bulkApproveSchema = z.object({
  bookingIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
})

// Completion schemas
export const createCompletionSchema = z.object({
  bookingId: z.string().uuid(),
  completedAt: z.date().optional(),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  followUpRequired: z.boolean().optional().default(false),
  followUpNotes: z.string().optional(),
  productsUsed: z.array(z.string()).optional(),
  nextAppointmentDate: z.date().optional(),
})
```

**Verify:** `tsc --noEmit` passes.

---

### PHASE1-T04: Write `booking.repository.ts`

**Goal:** All Drizzle DB calls isolated in one place. No business logic here — only data access.

**Architecture rules:**
- Every method takes `(tenantId: string, ...)` as first arg — enforces tenant isolation
- Returns raw Drizzle results; service layer maps to types
- No `console.log` — use the shared logger

**File: `src/modules/booking/booking.repository.ts`**

Key methods to implement (reference legacy `booking.ts` for the actual query logic):

```typescript
import { db } from '@/shared/db'
import { logger } from '@/shared/logger'
import type { CreateBookingInput, UpdateBookingInput, BookingStatus } from './booking.types'

const log = logger.child({ module: 'booking.repository' })

export const bookingRepository = {
  // READ
  findById(tenantId: string, bookingId: string),
  findByIdPublic(bookingId: string),          // no tenantId — for public confirmation page
  list(tenantId: string, filters: ListFilters, userId?: string),  // userId for RBAC filtering
  listForCalendar(tenantId: string, startDate: Date, endDate: Date, staffId?: string),
  getStats(tenantId: string),
  findExpiredReservations(),                  // no tenantId — cron job across all tenants

  // SLOTS
  findSlotsByDate(tenantId: string, date: Date, serviceId?: string, staffId?: string),
  findSlotsByDateRange(tenantId: string, startDate: Date, endDate: Date),
  findSlotById(tenantId: string, slotId: string),
  decrementSlotCapacity(tenantId: string, slotId: string),
  incrementSlotCapacity(tenantId: string, slotId: string),

  // WRITE
  create(tenantId: string, input: CreateBookingInput, createdById?: string),
  update(tenantId: string, bookingId: string, input: UpdateBookingInput),
  updateStatus(tenantId: string, bookingId: string, status: BookingStatus, meta?: StatusMeta),
  softDelete(tenantId: string, bookingId: string),

  // ASSIGNMENTS
  upsertAssignments(tenantId: string, bookingId: string, staffIds: string[]),

  // STATUS HISTORY
  recordStatusChange(bookingId: string, fromStatus: BookingStatus | null, toStatus: BookingStatus, changedById?: string),
}
```

**Critical patterns to follow from legacy:**
1. `list()` applies RBAC filtering: if `userId` passed, filter to `staffId = userId OR bookingAssignments.some(userId)`
2. `create()` generates `bookingNumber` as `BK-{tenantShortCode}-{YYYYMMDD}-{seq}` — look at legacy `generateBookingNumber()` helper
3. `updateStatus()` must also update `statusChangedAt`, and set `cancelledAt`/`completedAt` when appropriate
4. `decrementSlotCapacity()` uses a transaction with optimistic check (`bookedCount < capacity`) — throw `ConflictError` if slot is full
5. Always pass `tenantId` in every WHERE clause

**Verify:** TypeScript compiles. No lint errors.

---

### PHASE1-T05: Write `booking.service.ts`

**Goal:** Business logic layer. Orchestrates repository calls, enforces rules, emits Inngest events for all side effects.

**Architecture rules:**
- No direct DB calls — only calls `bookingRepository.*`
- No `fetch()`, no email, no SMS, no calendar calls — emit Inngest events instead
- Throws typed errors from `@/shared/errors`

**File: `src/modules/booking/booking.service.ts`**

```typescript
import { inngest } from '@/shared/inngest'
import { redis } from '@/shared/redis'
import { logger } from '@/shared/logger'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '@/shared/errors'
import { bookingRepository } from './booking.repository'
import type { CreateBookingInput, UpdateBookingInput } from './booking.types'

const log = logger.child({ module: 'booking.service' })

export const bookingService = {

  async createBooking(tenantId: string, input: CreateBookingInput, createdById?: string) {
    let lockToken: string | null = null

    if (input.slotId) {
      // Acquire distributed lock BEFORE capacity check
      // Redis client available from Phase 0's src/shared/redis.ts
      const lockKey = `lock:slot:${input.slotId}`
      lockToken = crypto.randomUUID()
      const acquired = await redis.set(lockKey, lockToken, { nx: true, px: 5000 })
      if (!acquired) {
        throw new ConflictError('slot_locked', 'Another booking is being processed for this slot. Please try again.')
      }
    }

    try {
      // 1. Check slot capacity (now race-condition free)
      // 2. Generate confirmation token for RESERVED bookings:
      //    const confirmationToken = crypto.randomBytes(32).toString('hex')
      //    Store sha256(confirmationToken) in booking record; return plaintext to caller
      // 3. Create booking record (status = PENDING for admin, RESERVED for portal with skipReservation=false)
      // 4. If slotId: decrement slot capacity (inside transaction)
      // 5. If status = RESERVED: schedule Inngest delayed event for expiry
      // 6. Record status history
      // 7. Emit booking/created event
      // Returns: created booking (include plaintext confirmationToken so caller can embed in confirmation URL)
    } finally {
      // Always release lock, even on error
      if (lockToken && input.slotId) {
        const lockKey = `lock:slot:${input.slotId}`
        const current = await redis.get(lockKey)
        if (current === lockToken) {
          await redis.del(lockKey)
        }
      }
    }
  },

  async confirmReservation(bookingId: string, token: string) {
    // 1. Load booking (no tenantId check — public endpoint, uses bookingId)
    // 2. Assert status === RESERVED
    // 3. Assert reservationExpiresAt > now()
    // 4. Verify token:
    //    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    //    if (booking.confirmationToken !== tokenHash) throw new ForbiddenError('Invalid confirmation token')
    // 5. Update status → CONFIRMED
    // 6. Cancel the Inngest expiry event (cancelOn pattern)
    // 7. Emit booking/confirmed
    // 8. Emit calendar/sync.push
    // 9. Emit notification/send.email (confirmation email)
    // Returns: updated booking
  },

  async updateBooking(tenantId: string, bookingId: string, input: UpdateBookingInput, updatedById?: string) {
    // 1. Load existing booking
    // 2. If staff changed: emit calendar/sync events for old and new staff
    // 3. If status changed to CANCELLED: emit booking/cancelled + calendar delete
    // 4. Apply update
    // Returns: updated booking
  },

  async cancelBooking(tenantId: string, bookingId: string, reason?: string, cancelledById?: string) {
    // 1. Load booking
    // 2. If RESERVED: cancel Inngest expiry event + increment slot capacity
    // 3. Update status → CANCELLED
    // 4. Record status change
    // 5. Emit booking/cancelled
    // 6. Emit notification/send.email (cancellation email)
    // Returns: updated booking
  },

  async approveBooking(tenantId: string, bookingId: string, approvedById: string, notes?: string) {
    // 1. Load booking, assert status === PENDING
    // 2. Update → APPROVED
    // 3. Emit booking/confirmed
    // 4. Emit notification/send.email
    // Returns: updated booking
  },

  async rejectBooking(tenantId: string, bookingId: string, rejectedById: string, reason: string) {
    // 1. Load booking
    // 2. If slotId: increment slot capacity back
    // 3. Update → REJECTED
    // 4. Emit notification/send.email
    // Returns: updated booking
  },

  async releaseExpiredReservation(bookingId: string) {
    // Called from Inngest handler ONLY
    // 1. Load booking — if not RESERVED, no-op (already confirmed/cancelled)
    // 2. Increment slot capacity
    // 3. Update status → RELEASED
    // 4. Record status history
    // Returns: void
  },

  async createCompletion(tenantId: string, input: CreateCompletionInput) {
    // 1. Load booking, assert status === IN_PROGRESS or CONFIRMED
    // 2. Update booking → COMPLETED
    // 3. Create AppointmentCompletion record
    // 4. Emit booking/completed
    // 5. Emit review/request.send (delayed by 24h)
    // Returns: completion record
  },

  // Read-only delegations
  list: (tenantId, filters, userId) => bookingRepository.list(tenantId, filters, userId),
  getById: (tenantId, bookingId) => bookingRepository.findById(tenantId, bookingId),
  getByIdPublic: (bookingId) => bookingRepository.findByIdPublic(bookingId),
  getStats: (tenantId) => bookingRepository.getStats(tenantId),
  listForCalendar: (tenantId, start, end, staffId) => bookingRepository.listForCalendar(tenantId, start, end, staffId),
}
```

**Inngest emission pattern (reference `src/shared/inngest.ts` from Phase 0):**
```typescript
await inngest.send({
  name: "booking/confirmed",
  data: { bookingId, tenantId },
})
```

**Reservation expiry pattern (delayed event):**
```typescript
await inngest.send({
  name: "booking/reservation.expired",
  data: { bookingId, tenantId },
  // fires at exact expiry time, not after a delay
  ts: reservationExpiresAt.getTime(),
})
```

**Cancel reservation expiry (cancelOn):**
- The `release-expired-reservation` Inngest function in Phase 0 should use `cancelOn` keyed by `bookingId`
- Emitting `booking/confirmed` with matching `bookingId` will cancel the pending expiry event
- See Phase 0's `booking.events.ts` stub — full implementation lives here

**Verify:** TypeScript compiles. Service methods are fully typed.

---

### PHASE1-T06: Write `booking.events.ts`

**Goal:** Inngest event handlers for all booking/* events. This replaces the cron-based release-slots and moves side effects out of the request path.

**File: `src/modules/booking/booking.events.ts`**

```typescript
import { z } from 'zod'
import { inngest } from '@/shared/inngest'
import { bookingService } from './booking.service'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'booking.events' })

// Event data schemas — validate at handler entry point
// TypeScript types prevent compile-time mismatches but do not validate runtime shapes.
// A malformed event payload throws a typed ValidationError so Inngest can
// categorise it correctly in the dashboard rather than treating it as an unhandled exception.
const reservationExpiredSchema = z.object({
  bookingId: z.string().uuid(),
  tenantId: z.string().uuid(),
})

const bookingConfirmedSchema = z.object({
  bookingId: z.string().uuid(),
  tenantId: z.string().uuid(),
})

const calendarSyncPushSchema = z.object({
  bookingId: z.string().uuid(),
  tenantId: z.string().uuid(),
})

/**
 * Release expired reservation — replaces /api/cron/release-slots
 * Fires at the exact reservation expiry time (delayed Inngest event).
 * Cancelled automatically when booking/confirmed fires for the same bookingId.
 */
export const releaseExpiredReservation = inngest.createFunction(
  {
    id: 'release-expired-reservation',
    cancelOn: [
      {
        event: 'booking/confirmed',
        match: 'data.bookingId',
      },
      {
        event: 'booking/cancelled',
        match: 'data.bookingId',
      },
    ],
  },
  { event: 'booking/reservation.expired' },
  async ({ event, step }) => {
    // Validate event data at entry point
    const data = reservationExpiredSchema.parse(event.data)

    await step.run('release-reservation', async () => {
      await bookingService.releaseExpiredReservation(data.bookingId)
    })
    log.info({ bookingId: data.bookingId }, 'Reservation released')
  }
)

/**
 * Send booking confirmation email — fires after booking/confirmed
 */
export const sendBookingConfirmationEmail = inngest.createFunction(
  { id: 'send-booking-confirmation-email' },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    // Validate event data at entry point
    const data = bookingConfirmedSchema.parse(event.data)

    // Phase 4 will fill this in with Resend
    // For now: log only
    log.info({ bookingId: data.bookingId }, 'TODO: send confirmation email')
  }
)

/**
 * Push booking to Google Calendar — fires after booking/confirmed
 */
export const pushBookingToCalendar = inngest.createFunction(
  { id: 'push-booking-to-calendar' },
  { event: 'calendar/sync.push' },
  async ({ event, step }) => {
    // Validate event data at entry point
    const data = calendarSyncPushSchema.parse(event.data)

    // Phase 4 will fill this in with Google Calendar sync
    log.info({ bookingId: data.bookingId }, 'TODO: push to calendar')
  }
)

// Export all functions for registration in src/app/api/inngest/route.ts
export const bookingFunctions = [
  releaseExpiredReservation,
  sendBookingConfirmationEmail,
  pushBookingToCalendar,
]
```

**After writing this file:** Update `src/app/api/inngest/route.ts` to include `bookingFunctions` in the serve call.

**Verify:** Inngest dev server shows all 3 functions registered.

---

### PHASE1-T07: Write `booking.router.ts`

**Goal:** Thin router. Every procedure validates → calls service → returns result. No business logic.

**File: `src/modules/booking/booking.router.ts`**

```typescript
import { router } from '@/shared/trpc'
import { protectedProcedure, tenantProcedure, permissionProcedure, publicProcedure } from '@/shared/trpc'
import { bookingService } from './booking.service'
import {
  listBookingsSchema, createBookingSchema, updateBookingSchema,
  cancelBookingSchema, calendarBookingsSchema, confirmReservationSchema,
} from './booking.schemas'
import { z } from 'zod'

export const bookingRouter = router({

  list: permissionProcedure('bookings:read')
    .input(listBookingsSchema)
    .query(({ ctx, input }) =>
      bookingService.list(ctx.tenantId, input, ctx.user.type !== 'OWNER' && ctx.user.type !== 'ADMIN' ? ctx.user.id : undefined)
    ),

  getById: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => bookingService.getById(ctx.tenantId, input.id)),

  getPublicById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => bookingService.getByIdPublic(input.id)),

  create: tenantProcedure
    .input(createBookingSchema)
    .mutation(({ ctx, input }) => bookingService.createBooking(ctx.tenantId, input, ctx.user.id)),

  update: tenantProcedure
    .input(updateBookingSchema)
    .mutation(({ ctx, input }) => bookingService.updateBooking(ctx.tenantId, input.id, input, ctx.user.id)),

  cancel: tenantProcedure
    .input(cancelBookingSchema)
    .mutation(({ ctx, input }) => bookingService.cancelBooking(ctx.tenantId, input.id, input.reason, ctx.user.id)),

  confirmReservation: publicProcedure
    .input(confirmReservationSchema)
    .mutation(({ input }) => bookingService.confirmReservation(input.bookingId, input.token)),

  getStats: tenantProcedure
    .query(({ ctx }) => bookingService.getStats(ctx.tenantId)),

  listForCalendar: tenantProcedure
    .input(calendarBookingsSchema)
    .query(({ ctx, input }) =>
      bookingService.listForCalendar(ctx.tenantId, input.startDate, input.endDate, input.staffId)
    ),

  export: permissionProcedure('bookings:read')
    .input(listBookingsSchema)
    .query(({ ctx, input }) => bookingService.list(ctx.tenantId, input)), // CSV export handled client-side
})
```

**Verify:** All procedures are typed. No implicit `any`.

---

### PHASE1-T08: Write `sub-routers/approval.router.ts`

**Goal:** Thin approval sub-router. Reference legacy `approval.ts`.

**Procedures to implement:**

| Procedure | Auth | Description |
|-----------|------|-------------|
| `getPendingBookings` | `tenantProcedure` | List bookings with status PENDING |
| `getPendingBookingsForSlot` | `tenantProcedure` | Pending bookings for a specific slot |
| `approveBooking` | `permissionProcedure('bookings:approve')` | PENDING → APPROVED |
| `rejectBooking` | `permissionProcedure('bookings:approve')` | PENDING → REJECTED |
| `bulkApprove` | `tenantProcedure` | Approve multiple bookings |
| `bulkReject` | `tenantProcedure` | Reject multiple bookings |
| `updateSlotApprovalSettings` | `tenantProcedure` | Toggle requiresApproval on a slot |

All procedures delegate to `bookingService.*` methods.

---

### PHASE1-T09: Write `sub-routers/completion.router.ts`

**Goal:** Appointment completion sub-router. Reference legacy `completion.ts`.

**Procedures to implement:**

| Procedure | Auth | Description |
|-----------|------|-------------|
| `list` | `tenantProcedure` | List completions with filters |
| `getById` | `tenantProcedure` | Single completion record |
| `getByBookingId` | `tenantProcedure` | Completion for a specific booking |
| `create` | `tenantProcedure` | Create completion + mark booking COMPLETED |
| `update` | `tenantProcedure` | Update completion notes/rating |
| `delete` | `tenantProcedure` | Remove completion record |
| `getTodayCompletions` | `tenantProcedure` | Today's completions for dashboard |
| `getStats` | `tenantProcedure` | Completion stats |

---

### PHASE1-T10: Write `sub-routers/portal.router.ts`

**Goal:** Public portal configuration + booking sub-router. Reference legacy `portal.ts`.

**Procedures to implement:**

| Procedure | Auth | Description |
|-----------|------|-------------|
| `listTemplates` | `permissionProcedure('settings:read')` | Portal templates |
| `getTemplate` | `permissionProcedure('settings:read')` | Single template by ID |
| `listTenantPortals` | `permissionProcedure('settings:read')` | Portals for this tenant |
| `getPortal` | `permissionProcedure('settings:read')` | Single portal config |
| `getPortalConfig` | `publicProcedure` | Public portal config by slug |
| `createPortal` | `permissionProcedure('settings:write')` | Create new portal |
| `updatePortal` | `permissionProcedure('settings:write')` | Update portal settings |
| `deletePortal` | `permissionProcedure('settings:write')` | Delete portal |

---

### PHASE1-T11: Write `sub-routers/slot.router.ts`

**Goal:** Slot availability queries for the customer portal. Reference legacy `slot-availability.ts`.

**Procedures to implement:**

| Procedure | Auth | Description |
|-----------|------|-------------|
| `getSlotsForDate` | `publicProcedure` | Available slots for a date (portal) |
| `getSlotsForDateRange` | `publicProcedure` | Slots across date range (portal calendar) |
| `getSlotDetails` | `publicProcedure` | Full slot detail with staff/service info |
| `isSlotAvailable` | `publicProcedure` | Check single slot availability |
| `getTimeWindowsForSlot` | `publicProcedure` | Time windows within a slot |
| `createBookingFromSlot` | `publicProcedure` | Portal → create RESERVED booking |
| `getBookingsForSlot` | `publicProcedure` | Bookings within a slot |
| `getSlotsForDateWithLocation` | `publicProcedure` | Slots with postcode/travel info |

**Note:** `createBookingFromSlot` merges with `booking.service.createBooking()` — the slot router calls the same service method with `source: 'PORTAL'`.

---

### PHASE1-T12: Write BookingService integration tests

**Goal:** Verify the service layer's core invariants in isolation before wiring everything together. Tests run against a real (test) database; Inngest and Redis are mocked.

**File: `src/modules/booking/__tests__/booking.service.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookingService } from '../booking.service'

// Mock Inngest — don't fire real events
vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) }
}))

// Mock Redis — don't require real Redis in unit tests
vi.mock('@/shared/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  }
}))

const TEST_TENANT_ID = 'test-tenant-00000000-0000-0000-0000-000000000001'

describe('BookingService.createBooking', () => {
  it('creates a RESERVED booking when slotId provided and capacity available', async () => {
    // Setup: create slot with capacity 2, bookedCount 0
    // Act: createBooking with slotId
    // Assert: booking.status === 'RESERVED'
    // Assert: booking.reservationExpiresAt is ~15min from now
    // Assert: inngest.send called with 'booking/reservation.expired'
    // Assert: slot.bookedCount === 1
  })

  it('throws ConflictError when slot is at capacity', async () => {
    // Setup: create slot with capacity 1, bookedCount 1
    // Act + Assert: createBooking throws ConflictError('slot_full')
  })

  it('creates a PENDING booking for admin source without slotId', async () => {
    // Setup: no slot
    // Act: createBooking with source: 'ADMIN'
    // Assert: booking.status === 'PENDING'
    // Assert: booking.reservationExpiresAt === null
  })

  it('releases lock on error', async () => {
    // Setup: slot exists, but DB write fails
    // Assert: redis.del was called (lock released in finally block)
  })
})

describe('BookingService.confirmReservation', () => {
  it('transitions RESERVED booking to CONFIRMED', async () => {
    // Setup: create RESERVED booking with valid token
    // Act: confirmReservation(bookingId, plaintextToken)
    // Assert: booking.status === 'CONFIRMED'
    // Assert: inngest.send called with 'booking/confirmed'
    // Assert: inngest.send called with 'calendar/sync.push'
  })

  it('rejects expired reservation', async () => {
    // Setup: RESERVED booking with reservationExpiresAt in the past
    // Act + Assert: throws ValidationError('Reservation has expired')
  })

  it('rejects invalid token', async () => {
    // Setup: RESERVED booking with valid token
    // Act: confirmReservation with wrong token
    // Assert: throws ForbiddenError
  })

  it('rejects non-RESERVED booking', async () => {
    // Setup: CONFIRMED booking
    // Act + Assert: throws ValidationError
  })
})
```

**Verify:** `npm run test` passes — all BookingService tests green.

---

### PHASE1-T13: Write `index.ts` and wire into root router

**Goal:** Export all routers from the module, then mount them in the root tRPC router.

**File: `src/modules/booking/index.ts`**

```typescript
export { bookingRouter } from './booking.router'
export { bookingFunctions } from './booking.events'
export * from './booking.types'
export * from './booking.schemas'
```

**Update `src/shared/trpc/root-router.ts` (or wherever the root router is defined):**

```typescript
import { bookingRouter } from '@/modules/booking'
import { approvalRouter } from '@/modules/booking/sub-routers/approval.router'
import { completionRouter } from '@/modules/booking/sub-routers/completion.router'
import { portalRouter } from '@/modules/booking/sub-routers/portal.router'
import { slotAvailabilityRouter } from '@/modules/booking/sub-routers/slot.router'

export const appRouter = router({
  // ... existing routers from Phase 0
  booking: bookingRouter,
  approval: approvalRouter,
  completion: completionRouter,
  portal: portalRouter,
  slotAvailability: slotAvailabilityRouter,
})
```

**Update `src/app/api/inngest/route.ts`** to include `bookingFunctions`:
```typescript
import { bookingFunctions } from '@/modules/booking'
// Add to serve(inngest, [...existingFunctions, ...bookingFunctions])
```

---

### PHASE1-T14: End-to-end verification

**Run in order:**

```bash
# 1. TypeScript
npx tsc --noEmit

# 2. Build
npm run build

# 3. Dev server
npm run dev
# Check: http://localhost:3000 loads, no console errors

# 4. Inngest dev server (separate terminal)
npx inngest-cli@latest dev
# Check: release-expired-reservation, send-booking-confirmation-email, push-booking-to-calendar all registered
```

**Manual flow checks (requires DB connection):**

1. Admin booking creation: POST to `trpc/booking.create` with valid tenant token
2. Status transitions: create → `booking.update` (status changes work)
3. Portal flow: `slotAvailability.getSlotsForDate` → `slotAvailability.createBookingFromSlot` → RESERVED → `booking.confirmReservation` → CONFIRMED
4. Verify Inngest fired: check dev server dashboard — `booking/reservation.expired` should have fired at expiry time, then been cancelled by `booking/confirmed`

---

## Key Design Decisions

### 1. RBAC filtering stays in the repository

The `list()` method accepts an optional `userId` parameter. When present, it adds the OR filter:
```typescript
// User can only see bookings assigned to them
where: {
  OR: [
    { staffId: userId },
    { bookingAssignments: { some: { userId } } },
  ]
}
```
The router passes `userId` when the session user is type `MEMBER` (not OWNER/ADMIN).

### 2. Reservation expiry uses Inngest delayed events, not cron

When a booking is created with status `RESERVED`:
```typescript
// Fire this event at exact expiry time
await inngest.send({
  name: "booking/reservation.expired",
  data: { bookingId, tenantId },
  ts: reservationExpiresAt.getTime(),
})
```
The `cancelOn` config on `release-expired-reservation` means if `booking/confirmed` fires first (same `bookingId`), the expiry event is cancelled automatically — no race condition possible.

### 3. Side effects are async — never in the request path

| Legacy (sync/setImmediate) | New (async Inngest) |
|---------------------------|---------------------|
| `syncBookingToCalendar()` | `inngest.send("calendar/sync.push", ...)` |
| `triggerBookingConfirmation()` | `inngest.send("booking/confirmed", ...)` |
| `setImmediate(() => sendEmail())` | `inngest.send("notification/send.email", ...)` |

Phase 4 fills in the actual email/calendar handlers. Phase 1 emits the events — handlers just log for now.

### 4. Slot capacity is transactional

`decrementSlotCapacity()` runs inside a Drizzle transaction with a check:
```typescript
// Only decrement if capacity not exceeded
WHERE id = slotId AND tenantId = tenantId AND bookedCount < capacity
```
If 0 rows updated → throw `ConflictError('slot_full')`. This replaces the legacy optimistic locking approach.

### 5. Distributed lock in Phase 1 (not deferred to Phase 6)

The Redis `SET NX PX 5000` lock is implemented in Phase 1, not deferred to Phase 6. The `redis` client is available from Phase 0's `src/shared/redis.ts`. Without this lock, two concurrent portal bookings for the same slot can both pass the capacity check and result in overbooking. The lock uses a unique token per acquisition to prevent accidental release of another request's lock — the `finally` block performs a compare-and-delete: it reads the current lock value and only deletes it if the value matches the token this request set.

### 6. Confirmation token for `confirmReservation`

When `createBooking` creates a `RESERVED` booking, it generates a cryptographically random 32-byte token:
```typescript
const confirmationToken = crypto.randomBytes(32).toString('hex') // 64 hex chars
```
The sha256 hash of this token is stored in the `confirmationToken` column of the Booking record. The plaintext token is returned in the `createBookingFromSlot` response and embedded in the confirmation URL: `/confirmation?id={bookingId}&token={plaintextToken}`.

`confirmReservation` accepts the plaintext token, hashes it, and compares against the stored hash. A mismatched or absent token throws `ForbiddenError`. This prevents anyone who learns a `bookingId` from confirming a reservation that isn't theirs. The `confirmationToken String?` column must be added to the Booking model in the Drizzle schema.

### 7. Inngest handler validation

Every Inngest handler validates `event.data` with a Zod schema at the entry point. TypeScript types prevent compile-time mismatches but do not validate runtime shapes. A malformed event payload should throw a typed `ValidationError`, not an unhandled exception, so Inngest can categorise it correctly in the dashboard.

---

## Files to read in legacy codebase (reference only)

| File | What to read for |
|------|-----------------|
| `src/server/routers/booking.ts` lines 1–480 | Schema definitions, helper functions, `generateBookingNumber()` |
| `src/server/routers/booking.ts` lines 481–700 | `list` and `getById` procedure logic |
| `src/server/routers/booking.ts` lines 614–1056 | `create` and `update` procedure logic |
| `src/server/routers/booking.ts` lines 1118–1260 | `confirmReservation` logic |
| `src/server/routers/booking.ts` lines 1381–1564 | `createFromPortal` logic |
| `src/server/routers/slot-availability.ts` lines 390–870 | Slot availability queries |
| `src/server/routers/slot-availability.ts` lines 868–1350 | `createBookingFromSlot` logic |
| `src/server/routers/approval.ts` | Full approval flow |
| `src/server/routers/completion.ts` | Full completion flow |
| `src/lib/messaging/triggers.ts` | Email/SMS triggers to replace with Inngest events |
| `src/lib/integrations/google-calendar-sync.ts` | Calendar sync calls to replace with Inngest events |
