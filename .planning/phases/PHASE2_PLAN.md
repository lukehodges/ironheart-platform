# Phase 2: Scheduling Module + Cron Migration — Executable Plan

**Written:** 2026-02-19
**Status:** Ready to execute (after Phase 1 completes)
**Depends on:** Phase 0 (shared infra) + Phase 1 (booking module + Inngest events already wired)

---

## Overview

**Phase goal:** Two deliverables in one phase:

1. **Scheduling module** — Extract slot management, availability calculation, travel time, and staff scheduling logic from the three god-files (`slot-availability.ts`, `slot-management.ts`, `src/lib/scheduling/`) into a clean `src/modules/scheduling/` module.

2. **Complete cron migration** — Replace all 5 remaining Vercel crons with Inngest scheduled functions and event-driven handlers. After this phase the `src/app/api/cron/` directory and `vercel.json` cron section are deleted entirely.

### What gets built

| File | Purpose |
|------|---------|
| `src/modules/scheduling/scheduling.schemas.ts` | Zod schemas |
| `src/modules/scheduling/scheduling.types.ts` | TypeScript types |
| `src/modules/scheduling/scheduling.repository.ts` | All slot/availability DB queries |
| `src/modules/scheduling/scheduling.service.ts` | Availability calculation + capacity management |
| `src/modules/scheduling/scheduling.router.ts` | Thin tRPC router (admin slot management) |
| `src/modules/scheduling/scheduling.events.ts` | Inngest scheduled functions (all 5 crons) |
| `src/modules/scheduling/lib/travel-time.ts` | Travel time calculations (Mapbox + fallback) |
| `src/modules/scheduling/lib/availability.ts` | Staff availability checker |
| `src/modules/scheduling/lib/recommendations.ts` | Staff recommendation engine |
| `src/modules/scheduling/lib/alerts.ts` | Scheduling conflict alerts |
| `src/modules/scheduling/lib/assignment-health.ts` | Assignment health scoring |
| `src/modules/scheduling/index.ts` | Barrel export |

### Source files (legacy reference — read only)

| Legacy file | LOC | Disposition |
|-------------|-----|-------------|
| `src/server/routers/slot-availability.ts` | 1,577 | Portal-facing queries → already moved to Phase 1 `slot.router.ts`; admin queries → `scheduling.router.ts` |
| `src/server/routers/slot-management.ts` | 564 | Admin slot CRUD → `scheduling.router.ts` + service |
| `src/lib/scheduling/availability.ts` | 319 | Copy logic → `scheduling/lib/availability.ts` |
| `src/lib/scheduling/recommendations.ts` | 246 | Copy logic → `scheduling/lib/recommendations.ts` |
| `src/lib/scheduling/alerts.ts` | 260 | Copy logic → `scheduling/lib/alerts.ts` |
| `src/lib/scheduling/assignment-health.ts` | 265 | Copy logic → `scheduling/lib/assignment-health.ts` |
| `src/lib/scheduling/travel-time.ts` | 125 | Rewrite fresh → `scheduling/lib/travel-time.ts` |
| `src/app/api/cron/release-slots/` | — | Already replaced by Inngest in Phase 1 |
| `src/app/api/cron/send-reminders/` | — | → Inngest event-driven in this phase |
| `src/app/api/cron/sync-calendars/` | — | → Inngest scheduled in this phase |
| `src/app/api/cron/pull-calendar-events/` | — | → Inngest scheduled in this phase |
| `src/app/api/cron/refresh-calendar-tokens/` | — | → Inngest scheduled in this phase |
| `src/app/api/cron/renew-watch-channels/` | — | → Inngest scheduled in this phase |
| `src/lib/cron/*.ts` (5 files, 1,112 LOC) | 1,112 | Ported to Inngest functions |

### Success Criteria

Phase 2 is complete when ALL of the following are true:

- [ ] `npm run build` exits with 0 TypeScript errors
- [ ] `src/modules/scheduling/` contains all 12 files listed above
- [ ] `src/app/api/cron/` directory is deleted
- [ ] `vercel.json` cron section is removed (or `vercel.json` deleted entirely if it has no other config)
- [ ] Inngest dev server shows all 5 cron functions registered:
  - `send-booking-reminders` (cron: every 15 min)
  - `sync-calendars-to-google` (cron: every 5 min)
  - `pull-calendar-events` (cron: every 15 min)
  - `refresh-calendar-tokens` (cron: every 30 min)
  - `renew-watch-channels` (cron: daily 2am)
- [ ] `send-booking-reminders` is also triggered as an event-driven function on `booking/confirmed` (schedules exact-time reminders instead of polling)
- [ ] Admin slot CRUD works: create, update, delete, bulk create, generate recurring
- [ ] Availability calculation works for staff assignment
- [ ] `tsc --noEmit` passes with 0 errors

---

## Architectural Notes

### Overlap with Phase 1

Phase 1's `slot.router.ts` handles **portal-facing** slot queries (`getSlotsForDate`, `createBookingFromSlot`, etc.) — those are public and tightly coupled to the booking flow.

Phase 2's `scheduling.router.ts` handles **admin-facing** slot management (create, update, delete, bulk operations, recurring generation) and availability queries used in the admin dashboard.

Both modules share the same `AvailableSlot` Drizzle table. The scheduling repository owns writes; the booking repository owns capacity adjustments (decrement/increment during booking creation/cancellation).

### Reminder Strategy: Event-Driven, Not Polling

The legacy `send-reminders` cron polls every 15 minutes looking for bookings in a ±5min window. This is wasteful and imprecise.

New approach — two complementary functions:

1. **`schedule-booking-reminders`** — fires on `booking/confirmed` event, uses `step.sleepUntil()` to wake at the exact 24h and 2h marks. Zero polling. Exact timing.

2. **`send-booking-reminders-cron`** — safety net cron that runs every 6 hours to catch any bookings that slipped through (e.g., confirmed before this function existed, or if Inngest had downtime). Much less frequent than the legacy 15-minute poll.

### Travel Time: Async API + Sync Fallback

`travel-time.ts` exposes two surfaces:
- `calculateTravelTimeFromPostcodes(from, to)` — async, calls Mapbox Directions API with 24h cache
- `estimatePostcodeDistance(from, to)` — sync, deterministic postcode distance (same sector = 2km, same district = 8km, cross-district = 20km)

Slot availability queries that need travel context use the sync estimator (fast, no API cost). The `/admin/routes` page uses the async API for accurate data.

---

## Task Breakdown

---

### PHASE2-T01: Create module directory structure

```bash
mkdir -p src/modules/scheduling/lib
touch src/modules/scheduling/index.ts
touch src/modules/scheduling/scheduling.schemas.ts
touch src/modules/scheduling/scheduling.types.ts
touch src/modules/scheduling/scheduling.repository.ts
touch src/modules/scheduling/scheduling.service.ts
touch src/modules/scheduling/scheduling.router.ts
touch src/modules/scheduling/scheduling.events.ts
touch src/modules/scheduling/lib/travel-time.ts
touch src/modules/scheduling/lib/availability.ts
touch src/modules/scheduling/lib/recommendations.ts
touch src/modules/scheduling/lib/alerts.ts
touch src/modules/scheduling/lib/assignment-health.ts
```

**Verify:** Directory tree matches target.

---

### PHASE2-T02: Write `scheduling.types.ts`

**Goal:** All TypeScript types for scheduling. The legacy `src/lib/types.ts` has `StaffMember` and `Booking` types — replicate what's needed here without importing from legacy paths.

**Key types to define:**

```typescript
// Slot management
export interface SlotCreateInput {
  date: Date
  time: string             // "HH:MM"
  endTime?: string
  staffIds: string[]
  serviceIds: string[]
  venueId?: string
  capacity: number
  requiresApproval: boolean
  estimatedLocation?: string
  previousSlotId?: string
  metadata?: Record<string, unknown>
  sortOrder?: number
}

export interface SlotUpdateInput extends Partial<SlotCreateInput> {
  id: string
  available?: boolean
}

export interface RecurringSlotInput {
  baseSlot: SlotCreateInput
  recurrenceRule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    daysOfWeek?: number[]   // 0=Sun, 6=Sat
    count?: number
    until?: Date
  }
}

// Availability
export type AvailabilityStatus = 'available' | 'travel_time' | 'unavailable'

export interface StaffAvailability {
  userId: string
  staffName: string
  status: AvailabilityStatus
  travelMinutes?: number
  nextBooking?: string
  reason?: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  reason?: string
}

// Travel time
export interface TravelTimeResult {
  minutes: number
  miles: number
  status: 'green' | 'amber' | 'red'
}

// Alerts
export type AlertType = 'travel' | 'back_to_back' | 'conflict'
export type AlertSeverity = 'warning' | 'error'

export interface SchedulingAlert {
  id: string
  bookingId: string
  staffName: string
  customerName: string
  datetime: Date
  type: AlertType
  message: string
  severity: AlertSeverity
}

// Assignment health
export type AssignmentStatus = 'optimal' | 'tight_schedule' | 'long_travel' | 'conflict'

export interface AssignmentHealth {
  status: AssignmentStatus
  icon: string
  label: string
  color: 'green' | 'amber' | 'red'
  reason: string
}

// Staff recommendation
export interface StaffRecommendation {
  userId: string
  staffName: string
  score: number
  reasons: string[]
  travelTime?: number
  availabilityStatus: AvailabilityStatus
}
```

---

### PHASE2-T03: Write `scheduling.schemas.ts`

**Goal:** Zod schemas for all admin slot management operations. Reference legacy `slot-management.ts` for the exact field requirements.

```typescript
import { z } from 'zod'

export const slotCreateSchema = z.object({
  date: z.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  staffIds: z.array(z.string().uuid()),
  serviceIds: z.array(z.string().uuid()),
  venueId: z.string().uuid().optional(),
  capacity: z.number().min(1).default(1),
  requiresApproval: z.boolean().default(false),
  estimatedLocation: z.string().optional(),
  previousSlotId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  sortOrder: z.number().default(0),
})

export const slotUpdateSchema = slotCreateSchema.partial().extend({
  id: z.string().uuid(),
  available: z.boolean().optional(),
})

export const slotBulkCreateSchema = z.object({
  slots: z.array(slotCreateSchema).min(1).max(100),
})

export const recurringSlotSchema = z.object({
  baseSlot: slotCreateSchema,
  recurrenceRule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().min(1).default(1),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    count: z.number().min(1).max(365).optional(),
    until: z.date().optional(),
  }),
})

export const slotListSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  staffId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  includeUnavailable: z.boolean().default(false),
})

export const availabilityCheckSchema = z.object({
  userId: z.string().uuid(),
  date: z.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().min(5),
  excludeBookingId: z.string().uuid().optional(),
})

export const travelTimeSchema = z.object({
  fromPostcode: z.string().min(3),
  toPostcode: z.string().min(3),
})
```

---

### PHASE2-T04: Write `scheduling/lib/travel-time.ts`

**Goal:** Travel time calculations — async Mapbox API with deterministic fallback. Build fresh (don't import from legacy).

**File: `src/modules/scheduling/lib/travel-time.ts`**

```typescript
import { logger } from '@/shared/logger'
import type { TravelTimeResult } from '../scheduling.types'

const log = logger.child({ module: 'scheduling.travel-time' })

// In-memory cache: key = "from:to", value = { result, expiresAt }
const cache = new Map<string, { result: TravelTimeResult; expiresAt: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

/**
 * Deterministic postcode distance estimation.
 * No API cost. Used as fallback and for sync callers.
 */
export function estimatePostcodeDistance(from?: string, to?: string): number {
  if (!from || !to) return 5
  const pc1 = from.replace(/\s/g, '').toUpperCase()
  const pc2 = to.replace(/\s/g, '').toUpperCase()
  if (pc1 === pc2) return 0

  const area1 = pc1.match(/^[A-Z]{1,2}\d{1,2}/)?.[0] ?? pc1.substring(0, 4)
  const area2 = pc2.match(/^[A-Z]{1,2}\d{1,2}/)?.[0] ?? pc2.substring(0, 4)
  if (area1 === area2) return 2

  const dist1 = pc1.match(/^[A-Z]{1,2}/)?.[0] ?? ''
  const dist2 = pc2.match(/^[A-Z]{1,2}/)?.[0] ?? ''
  if (dist1 === dist2) return 8

  return 20
}

export function getTravelTimeStatus(minutes: number): 'green' | 'amber' | 'red' {
  if (minutes <= 15) return 'green'
  if (minutes <= 30) return 'amber'
  return 'red'
}

export function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/**
 * Sync travel time estimate (no API call).
 * Use for availability calculation, slot display, assignment health.
 */
export function estimateTravelTime(fromPostcode?: string, toPostcode?: string): number {
  const distKm = estimatePostcodeDistance(fromPostcode, toPostcode)
  return Math.max(Math.ceil((distKm / 30) * 60), fromPostcode === toPostcode ? 0 : 5)
}

/**
 * Async travel time via Mapbox Directions API.
 * Use for /admin/routes page and any UI requiring accurate distance.
 * Falls back to estimation if MAPBOX_ACCESS_TOKEN not set or API fails.
 */
export async function calculateTravelTime(
  fromPostcode: string,
  toPostcode: string
): Promise<TravelTimeResult> {
  const key = `${fromPostcode.toUpperCase()}:${toPostcode.toUpperCase()}`

  // Check cache
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  const token = process.env.MAPBOX_ACCESS_TOKEN

  if (token) {
    try {
      // Geocode both postcodes then get directions
      const [from, to] = await Promise.all([
        geocodePostcode(fromPostcode, token),
        geocodePostcode(toPostcode, token),
      ])

      if (from && to) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?access_token=${token}&overview=false`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const route = data?.routes?.[0]
          if (route) {
            const minutes = Math.ceil(route.duration / 60)
            const miles = Math.round((route.distance / 1609.34) * 10) / 10
            const result: TravelTimeResult = { minutes, miles, status: getTravelTimeStatus(minutes) }
            cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS })
            return result
          }
        }
      }
    } catch (err) {
      log.warn({ err, fromPostcode, toPostcode }, 'Mapbox travel time failed, using fallback')
    }
  }

  // Fallback
  const distKm = estimatePostcodeDistance(fromPostcode, toPostcode)
  const distMiles = distKm * 0.621371
  const minutes = Math.max(Math.ceil((distKm / 30) * 60), 5)
  return {
    minutes,
    miles: Math.round(distMiles * 10) / 10,
    status: getTravelTimeStatus(minutes),
  }
}

async function geocodePostcode(
  postcode: string,
  token: string
): Promise<[number, number] | null> {
  try {
    const encoded = encodeURIComponent(postcode)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=gb&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const center = data?.features?.[0]?.center
    return center ? [center[0], center[1]] : null
  } catch {
    return null
  }
}
```

---

### PHASE2-T05: Write `scheduling/lib/availability.ts`, `alerts.ts`, `assignment-health.ts`, `recommendations.ts`

**Goal:** Port the 4 scheduling library files fresh. These are pure functions — no DB calls, no side effects. Read the legacy files for logic but write fresh TypeScript using the new type definitions.

**Reference paths:**
- `src/lib/scheduling/availability.ts` — staff availability checker (uses external event blocks)
- `src/lib/scheduling/alerts.ts` — generates scheduling alerts from booking arrays
- `src/lib/scheduling/assignment-health.ts` — scores individual booking assignment quality
- `src/lib/scheduling/recommendations.ts` — ranks staff by suitability for a booking

**Key change:** Legacy files import `StaffMember` from `@/lib/types` and use `staffId` field (old Staff model). New files use `userId` (User model with `isTeamMember: true`). Update all `staffId` references to `userId`.

**Each file structure:**
```typescript
// src/modules/scheduling/lib/availability.ts
import { estimateTravelTime } from './travel-time'
import type { StaffAvailability, TimeSlot } from '../scheduling.types'

// ... port logic from legacy, update field names
export function checkStaffAvailability(...): StaffAvailability { ... }
export function getAvailableStaff(...): StaffAvailability[] { ... }
```

**Verify:** All 4 files compile. No implicit `any`.

---

### PHASE2-T06: Write `scheduling.repository.ts`

**Goal:** All Drizzle queries for slots and availability. The booking repository (Phase 1) handles `bookedCount` changes — this repository owns slot creation, updates, and listing.

**Key methods:**

```typescript
export const schedulingRepository = {
  // Slot CRUD
  createSlot(tenantId: string, input: SlotCreateInput),
  createManySlots(tenantId: string, slots: SlotCreateInput[]),
  updateSlot(tenantId: string, slotId: string, input: Partial<SlotCreateInput>),
  deleteSlot(tenantId: string, slotId: string),
  findSlotById(tenantId: string, slotId: string),
  listSlots(tenantId: string, filters: SlotListFilters),

  // Availability queries (used by scheduling service)
  getStaffBookingsForDate(tenantId: string, userId: string, date: Date),
  getExternalEventsForUser(tenantId: string, userId: string, date: Date),
  getUserAvailabilityWindows(tenantId: string, userId: string, date: Date),

  // Reminder queries (used by Inngest cron)
  findBookingsNeedingReminders(hoursAhead: number, windowMinutes: number),
  recordReminderSent(bookingId: string, reminderType: '24h' | '2h'),
  hasReminderBeenSent(bookingId: string, reminderType: '24h' | '2h'),

  // Calendar sync queries (used by Inngest cron)
  findUsersWithActiveCalendarIntegration(tenantId?: string),
  findRecentlyUpdatedBookings(sinceMinutes: number, tenantId?: string),
  findExpiringTokens(withinMinutes: number),
  findExpiringWatchChannels(withinHours: number),
}
```

**Tenant isolation rules:**
- All slot queries include `where tenantId = ?`
- Reminder and calendar queries either accept `tenantId` or run cross-tenant (for global cron operations) — document which is which with comments

---

### PHASE2-T07: Write `scheduling.service.ts`

**Goal:** Business logic for slot management and availability checking. Orchestrates repository calls and the scheduling lib functions.

```typescript
export const schedulingService = {
  // Slot management
  async createSlot(tenantId: string, input: SlotCreateInput, createdById: string),
  async bulkCreateSlots(tenantId: string, slots: SlotCreateInput[], createdById: string),
  async generateRecurringSlots(tenantId: string, input: RecurringSlotInput, createdById: string),
  async updateSlot(tenantId: string, slotId: string, input: SlotUpdateInput),
  async deleteSlot(tenantId: string, slotId: string),
  async listSlots(tenantId: string, filters: SlotListFilters),
  async getSlotById(tenantId: string, slotId: string),

  // Availability
  async checkStaffAvailability(tenantId: string, userId: string, date: Date, startTime: string, durationMinutes: number),
  async getAvailableStaffForSlot(tenantId: string, slotId: string),
  async getStaffRecommendations(tenantId: string, bookingId: string),

  // Alerts & health
  async getSchedulingAlerts(tenantId: string, date: Date),
  async getAssignmentHealth(bookingId: string),

  // Travel time
  async getTravelTime(fromPostcode: string, toPostcode: string),
}
```

**`generateRecurringSlots` logic:**
Reference legacy `slot-management.ts` `generateRecurring` procedure (lines 253–366). The logic expands a recurrence rule into individual slots and batch-inserts them. Port as-is but update field names (`staffId` → `userId`).

---

### PHASE2-T08: Write `scheduling.router.ts`

**Goal:** Thin admin router for slot management. All portal-facing slot queries already live in Phase 1's `slot.router.ts`.

```typescript
export const schedulingRouter = router({

  // Slot CRUD (admin only)
  createSlot: permissionProcedure('schedule:write')
    .input(slotCreateSchema)
    .mutation(({ ctx, input }) => schedulingService.createSlot(ctx.tenantId, input, ctx.user.id)),

  bulkCreateSlots: permissionProcedure('schedule:write')
    .input(slotBulkCreateSchema)
    .mutation(({ ctx, input }) => schedulingService.bulkCreateSlots(ctx.tenantId, input.slots, ctx.user.id)),

  generateRecurring: permissionProcedure('schedule:write')
    .input(recurringSlotSchema)
    .mutation(({ ctx, input }) => schedulingService.generateRecurringSlots(ctx.tenantId, input, ctx.user.id)),

  updateSlot: permissionProcedure('schedule:write')
    .input(slotUpdateSchema)
    .mutation(({ ctx, input }) => schedulingService.updateSlot(ctx.tenantId, input.id, input)),

  deleteSlot: permissionProcedure('schedule:write')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => schedulingService.deleteSlot(ctx.tenantId, input.id)),

  listSlots: tenantProcedure
    .input(slotListSchema)
    .query(({ ctx, input }) => schedulingService.listSlots(ctx.tenantId, input)),

  getSlotById: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => schedulingService.getSlotById(ctx.tenantId, input.id)),

  // Availability & recommendations
  checkAvailability: tenantProcedure
    .input(availabilityCheckSchema)
    .query(({ ctx, input }) =>
      schedulingService.checkStaffAvailability(ctx.tenantId, input.userId, input.date, input.startTime, input.durationMinutes)
    ),

  getStaffRecommendations: tenantProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .query(({ ctx, input }) => schedulingService.getStaffRecommendations(ctx.tenantId, input.bookingId)),

  getAlerts: tenantProcedure
    .input(z.object({ date: z.date() }))
    .query(({ ctx, input }) => schedulingService.getSchedulingAlerts(ctx.tenantId, input.date)),

  // Travel time (for /admin/routes)
  getTravelTime: tenantProcedure
    .input(travelTimeSchema)
    .query(({ input }) => calculateTravelTime(input.fromPostcode, input.toPostcode)),
})
```

---

### PHASE2-T09: Write `scheduling.events.ts` — 5 Inngest cron functions

**Goal:** Replace all 5 remaining Vercel crons with Inngest scheduled functions. This is the central deliverable of Phase 2.

**File: `src/modules/scheduling/scheduling.events.ts`**

```typescript
import { inngest } from '@/shared/inngest'
import { schedulingRepository } from './scheduling.repository'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'scheduling.events' })

// ─── CRON 1: Send Booking Reminders ─────────────────────────────────────────
// Replaces: /api/cron/send-reminders (every 15 min)
// New strategy: event-driven at exact time + safety-net cron every 6h

/**
 * Schedule reminders when a booking is confirmed.
 * Uses step.sleepUntil() to wake at exact 24h and 2h before booking.
 * This eliminates the 15-minute polling loop entirely.
 */
export const scheduleBookingReminders = inngest.createFunction(
  { id: 'schedule-booking-reminders' },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    const booking = await step.run('load-booking', async () => {
      // Load booking with scheduledDate and scheduledTime
      // Return null if not found or already cancelled
    })

    if (!booking) return

    const bookingDateTime = new Date(`${booking.scheduledDate}T${booking.scheduledTime}:00`)
    const reminder24h = new Date(bookingDateTime.getTime() - 24 * 60 * 60 * 1000)
    const reminder2h = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000)

    // Sleep until 24h before (if still in the future)
    if (reminder24h > new Date()) {
      await step.sleepUntil('wait-for-24h-reminder', reminder24h)
      await step.run('send-24h-reminder', async () => {
        await inngest.send({
          name: 'notification/send.email',
          data: { to: booking.customer.email, templateId: 'booking-reminder-24h', variables: { bookingId, tenantId } },
        })
        await inngest.send({
          name: 'notification/send.sms',
          data: { to: booking.customer.phone, templateId: 'booking-reminder-24h', variables: { bookingId, tenantId } },
        })
        log.info({ bookingId }, '24h reminder sent')
      })
    }

    // Sleep until 2h before
    if (reminder2h > new Date()) {
      await step.sleepUntil('wait-for-2h-reminder', reminder2h)
      await step.run('send-2h-reminder', async () => {
        await inngest.send({
          name: 'notification/send.sms',
          data: { to: booking.customer.phone, templateId: 'booking-reminder-2h', variables: { bookingId, tenantId } },
        })
        log.info({ bookingId }, '2h reminder sent')
      })
    }
  }
)

/**
 * Safety-net cron — catches any bookings that slipped through the event-driven path.
 * Runs every 6 hours (vs legacy 15-minute poll).
 * Checks SentMessage table to prevent duplicates.
 */
export const sendRemindersCron = inngest.createFunction(
  { id: 'send-reminders-cron', concurrency: { limit: 1 } },
  { cron: '0 */6 * * *' },
  async ({ step }) => {
    await step.run('check-upcoming-reminders', async () => {
      // Find CONFIRMED bookings in 24h ± 30min window not yet reminded
      // Find CONFIRMED bookings in 2h ± 30min window not yet reminded
      // Emit notification events for each
      // Reference: src/lib/cron/send-reminders.ts for the query logic
      log.info('Reminder safety-net cron ran')
    })
  }
)

// ─── CRON 2: Sync Calendars ──────────────────────────────────────────────────
// Replaces: /api/cron/sync-calendars (every 5 min)

export const syncCalendarsCron = inngest.createFunction(
  {
    id: 'sync-calendars-cron',
    concurrency: { limit: 3 },  // max 3 concurrent sync operations
  },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    const users = await step.run('get-users-with-calendar', async () => {
      return schedulingRepository.findUsersWithActiveCalendarIntegration()
    })

    // Fan out: emit one calendar/sync.push per user
    // (actual sync happens in calendar-sync module in Phase 4)
    await step.run('emit-sync-events', async () => {
      for (const user of users) {
        await inngest.send({ name: 'calendar/sync.pull', data: { userId: user.id } })
      }
      log.info({ count: users.length }, 'Calendar sync events emitted')
    })
  }
)

// ─── CRON 3: Pull Calendar Events ────────────────────────────────────────────
// Replaces: /api/cron/pull-calendar-events (every 15 min)

export const pullCalendarEventsCron = inngest.createFunction(
  {
    id: 'pull-calendar-events-cron',
    concurrency: { limit: 2 },
  },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    await step.run('pull-for-all-users', async () => {
      // Stub: Phase 4 implements actual Google Calendar pull logic
      // Reference: src/lib/cron/pull-calendar-events.ts
      log.info('Pull calendar events cron ran (Phase 4 will implement)')
    })
  }
)

// ─── CRON 4: Refresh Calendar Tokens ─────────────────────────────────────────
// Replaces: /api/cron/refresh-calendar-tokens (every 30 min)

export const refreshCalendarTokensCron = inngest.createFunction(
  { id: 'refresh-calendar-tokens-cron' },
  { cron: '*/30 * * * *' },
  async ({ step }) => {
    const expiringTokens = await step.run('find-expiring-tokens', async () => {
      return schedulingRepository.findExpiringTokens(10) // within 10 minutes
    })

    await step.run('refresh-tokens', async () => {
      // Stub: Phase 4 implements actual token refresh
      // Reference: src/lib/cron/refresh-calendar-tokens.ts
      log.info({ count: expiringTokens.length }, 'Token refresh cron ran (Phase 4 will implement)')
    })
  }
)

// ─── CRON 5: Renew Watch Channels ────────────────────────────────────────────
// Replaces: /api/cron/renew-watch-channels (daily 2am)

export const renewWatchChannelsCron = inngest.createFunction(
  { id: 'renew-watch-channels-cron' },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const expiringChannels = await step.run('find-expiring-channels', async () => {
      return schedulingRepository.findExpiringWatchChannels(24)
    })

    await step.run('renew-channels', async () => {
      // Stub: Phase 4 implements actual watch channel renewal
      // Reference: src/lib/integrations/google-calendar-watch.ts renewAllWatchChannels()
      log.info({ count: expiringChannels.length }, 'Watch channel renewal cron ran (Phase 4 will implement)')
    })
  }
)

export const schedulingFunctions = [
  scheduleBookingReminders,
  sendRemindersCron,
  syncCalendarsCron,
  pullCalendarEventsCron,
  refreshCalendarTokensCron,
  renewWatchChannelsCron,
]
```

**After writing this file:** Update `src/app/api/inngest/route.ts` to include `schedulingFunctions`.

---

### PHASE2-T10: Wire into root router + Inngest serve

**Update `src/shared/trpc/root-router.ts`:**
```typescript
import { schedulingRouter } from '@/modules/scheduling'

export const appRouter = router({
  // ... booking routers from Phase 1
  scheduling: schedulingRouter,
})
```

**Update `src/app/api/inngest/route.ts`:**
```typescript
import { schedulingFunctions } from '@/modules/scheduling'
// Add to serve(inngest, [...bookingFunctions, ...schedulingFunctions])
```

---

### PHASE2-T11: Delete legacy cron files

**Only do this after all Inngest functions are verified in the dev server.**

```bash
# Delete cron routes
rm -rf src/app/api/cron/send-reminders
rm -rf src/app/api/cron/sync-calendars
rm -rf src/app/api/cron/pull-calendar-events
rm -rf src/app/api/cron/refresh-calendar-tokens
rm -rf src/app/api/cron/renew-watch-channels
# (release-slots was already deleted in Phase 1)

# Delete cron lib files
rm -rf src/lib/cron/

# Update vercel.json — remove crons section
# If vercel.json only had crons, delete the file
# If it has other config (rewrites, headers), remove just the crons array
```

**Check `vercel.json`** in the legacy codebase first: `cat /Users/lukehodges/Documents/ironheart/vercel.json`

---

### PHASE2-T12: Update `index.ts` and end-to-end verification

**File: `src/modules/scheduling/index.ts`**
```typescript
export { schedulingRouter } from './scheduling.router'
export { schedulingFunctions } from './scheduling.events'
export * from './scheduling.types'
export * from './scheduling.schemas'
export { calculateTravelTime, estimateTravelTime, formatTravelTime } from './lib/travel-time'
export { checkStaffAvailability, getAvailableStaff } from './lib/availability'
export { getStaffRecommendations } from './lib/recommendations'
export { generateSchedulingAlerts } from './lib/alerts'
export { calculateAssignmentHealth } from './lib/assignment-health'
```

**Verification checks:**

```bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Inngest dev server
npx inngest-cli@latest dev
```

**Inngest dashboard should show 8 total functions (3 from Phase 1 + 5 new):**
- `release-expired-reservation` ← Phase 1
- `send-booking-confirmation-email` ← Phase 1
- `push-booking-to-calendar` ← Phase 1
- `schedule-booking-reminders` ← Phase 2 (triggered by `booking/confirmed`)
- `send-reminders-cron` ← Phase 2 (cron: every 6h)
- `sync-calendars-cron` ← Phase 2 (cron: every 5min)
- `pull-calendar-events-cron` ← Phase 2 (cron: every 15min)
- `refresh-calendar-tokens-cron` ← Phase 2 (cron: every 30min)
- `renew-watch-channels-cron` ← Phase 2 (cron: daily 2am)

**Cron deletion verification:**
```bash
# These should NOT exist
ls src/app/api/cron/         # should be empty or non-existent
ls src/lib/cron/             # should not exist
# vercel.json should have no "crons" key
```

---

## Key Design Decisions

### 1. Reminders: event-driven at exact time, not 15-minute polling

| Legacy | New |
|--------|-----|
| Cron polls every 15 min, ±5 min accuracy | `step.sleepUntil()` wakes at exact millisecond |
| Polling wastes DB queries for 14.9min of every 15min cycle | Zero queries between confirmed and reminder time |
| Duplicate check requires SentMessage table lookup | `cancelOn` + idempotent step keys prevent duplicates |
| No retry if SMS API fails during cron window | Inngest retries the step automatically |

### 2. Calendar crons become fan-out patterns

The legacy `sync-calendars` cron loops through all users synchronously in a single 60-second window. With 100+ tenants this will hit the timeout.

New pattern: the Inngest cron emits one `calendar/sync.pull` event per user. Each event is processed independently with its own retry budget. Concurrency limit (3) prevents overwhelming the Google Calendar API.

### 3. Phase 4 dependency: cron stubs are intentional

The `pull-calendar-events-cron`, `refresh-calendar-tokens-cron`, and `renew-watch-channels-cron` are stubs in Phase 2. The actual Google Calendar API calls live in Phase 4's calendar-sync module. The stubs ensure:
- Inngest registers the functions (visible in dashboard)
- `vercel.json` crons are safely deleted (no missing handlers)
- Phase 4 has a clear insertion point

### 4. Slot ownership split

| Operation | Owner |
|-----------|-------|
| Create/update/delete slots | `scheduling.repository` |
| Decrement capacity on booking | `booking.repository` (Phase 1) |
| Increment capacity on cancel/release | `booking.repository` (Phase 1) |

This avoids circular dependencies. The booking module depends on scheduling for slot reads; scheduling does not depend on booking.

---

## Files to read in legacy codebase (reference only)

| File | What to read for |
|------|-----------------|
| `src/server/routers/slot-management.ts` lines 1–100 | Schema definitions |
| `src/server/routers/slot-management.ts` lines 183–366 | `bulkCreate` + `generateRecurring` logic |
| `src/lib/scheduling/availability.ts` | Full file — staff availability logic |
| `src/lib/scheduling/alerts.ts` | Full file — alert generation |
| `src/lib/scheduling/assignment-health.ts` | Full file — health scoring |
| `src/lib/scheduling/recommendations.ts` | Full file — recommendation scoring |
| `src/lib/cron/send-reminders.ts` | Reminder query logic to port to Inngest |
| `src/lib/cron/sync-calendars.ts` | Calendar sync orchestration logic |
| `src/lib/cron/pull-calendar-events.ts` | Pull logic structure |
| `vercel.json` | Check cron config before deleting |
