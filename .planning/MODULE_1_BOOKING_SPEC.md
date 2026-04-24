# Module 1: Booking/Jobs — Completion Spec

> What exists, what's broken, what's missing, and exactly what we build.

---

## Decision: Jobs Is The Module

Both `booking/` and `jobs/` modules exist with near-identical code. The `jobs` module uses the renamed `jobs` table. Most other modules already import from `jobs`. We keep `jobs`, delete `booking`, and rename nothing in the UI — users still see "Bookings" in the admin because that's what makes sense. The database table is `jobs`. The module is `jobs`. The UI label is "Bookings."

---

## What Exists Today (Ground Truth)

### Backend — What Works
- **State machine**: 10 statuses, 17 valid transitions, terminal state enforcement. Well-tested (40+ test cases).
- **Slot locking**: Redis distributed lock before capacity check. Atomic slot decrement. Reservation expiry via Inngest sleep-then-release.
- **Confirmation saga**: 4-step saga (update status → create invoice → send notification → push calendar). Compensation on failure (revert status, void invoice, delete calendar event).
- **CRUD**: createBooking, confirmReservation, approveBooking, rejectBooking, cancelBooking, updateBooking, createCompletion all exist as service methods.
- **Router procedures**: list, listForCalendar, getById, create, confirmReservation, update, cancel, approve.

### Backend — What's Broken
1. **Duplicate Inngest function**: Both `bookingFunctions` and `jobsFunctions` register `release-expired-reservation` with same ID. Live bug.
2. **`job/confirmed` never emitted**: confirmReservation and approveBooking never fire `job/confirmed`. Notification module's `sendBookingConfirmationEmail`, workflow's `triggerOnBookingConfirmed`, and scheduling's `scheduleBookingReminders` are ALL dead code for confirmations.
3. **Phantom event**: Saga fires `booking/confirmed` which doesn't exist in the typed event catalog. Nothing listens.
4. **Blank confirmation emails**: `confirmReservation` fires `notification/send.email` with `html: ""`. React Email templates are completely bypassed.
5. **`calendar/sync.push` field mismatch**: Inngest schema expects `jobId`, saga sends `bookingId`.
6. **`slot/released` never emitted**: Defined in catalog but never fired.
7. **Reminders stub**: `scheduleBookingReminders` always returns `{ skipped: true }`.
8. **Review request incomplete**: `scheduleReviewRequest` only logs, never sends email.
9. **Redis slot lock not atomic**: `releaseSlotLock` does GET then DEL as two operations. If lock expires between them, could delete another holder's lock. Needs Lua script.
10. **`incrementSlotCapacity` not transactional**: Read-modify-write without transaction. Can over-increment under concurrent cancellations.
11. **Booking number race condition**: `generateBookingNumber` reads MAX then inserts — two concurrent creates for same tenant can get same number.
12. **`notification/send.email` emitted with `to: ""`**: When customer email is null, event fires with empty `to` field.
13. **`bulkApprove`/`bulkReject` skip permission check**: Uses `tenantProcedure` instead of `permissionProcedure("bookings:approve")`. Any tenant user can bulk-approve.
14. **`endTime` calc bug on reschedule**: If only `scheduledTime` provided without `durationMinutes`, defaults to 60 instead of reading existing booking duration.
15. **`list` router never passes userId**: RBAC MEMBER filtering in repository never exercised — all users see all bookings.
16. **`approvedById`/`rejectedById` hardcoded to `"system"`**: Not actual user ID.
17. **`slotAvailability` sub-router fully stubbed**: All 6 procedures return empty/false/null. Portal can't check real availability.
18. **`portal` sub-router fully stubbed**: All 7 procedures return null/empty. Portal config can't be loaded.

### Frontend — What Works
- **Admin booking list**: Cursor pagination, filters (search/date/staff/status), bulk approve/cancel, CSV export, row actions. SOLID.
- **Admin calendar**: FullCalendar (month/week/day/list), staff filter chips, drag-to-reschedule, status color coding. SOLID.
- **Admin booking detail sheet**: Shows booking number, status, service, date/time, location, customer (fetched), staff (fetched), price, notes. Loading skeleton. SOLID.
- **Admin new booking wizard**: 3-step (customer → slot → confirm). Customer search + create works. PARTIAL.
- **Booking status badge**: All 10 statuses mapped to badge variants. SOLID.
- **Public booking wizard shell**: 4-step layout with progress, theme provider, error boundary. Structure is SOLID.

### Frontend — What's Broken/Missing
1. **Public portal non-functional**: `ServiceSelector` receives `services=[]`. `SlotPicker` gets stub returning `[]`. `customerId` is nil UUID. Customer can't book anything.
2. **No "Mark Complete" action**: COMPLETED status exists but no UI trigger. Same for IN_PROGRESS and NO_SHOW.
3. **Reschedule dead button**: Rendered in detail sheet and table but no handler. Only calendar drag works.
4. **"View Customer" always hidden**: `onCustomerClick` prop never passed by parent pages.
5. **Admin wizard limited**: Only "Custom service" option. Date picker capped at 14 days. Nil UUID serviceId fallback.
6. **Currency hardcoded**: GBP in detail sheet `formatPrice`.
7. **Calendar error silent**: `listForCalendar` query failure shows nothing to user.
8. **No booking history/timeline**: Status change history exists in original but not in refactor.

### Tests — What's Covered
- State machine transitions (17 valid, 12+ invalid): SOLID
- Saga creation and compensation: SOLID
- Smart assignment strategies: SOLID
- createBooking service (lock, capacity, token): SOLID
- confirmReservation service (validation, email match, token): SOLID
- Frontend booking page (loading, error, steps, navigation): SOLID

### Tests — What's Missing
- updateBooking: ZERO tests
- cancelBooking: ZERO tests
- approveBooking: ZERO tests
- rejectBooking: ZERO tests
- createCompletion: ZERO tests
- releaseExpiredReservation: ZERO tests
- Slot capacity restoration on cancel/reject: ZERO tests
- Calendar sync event firing: ZERO tests
- E2E booking flow: smoke only, no actual mutations tested

---

## What "COMPLETE" Looks Like

When Module 1 is done, these things are true:

### For an Admin
1. Can create a booking by selecting a real service, picking a real available slot, and assigning a real staff member
2. Can view all bookings in a filterable table AND on a calendar
3. Can click any booking and see full details including customer info, staff, location, price, notes, and status history
4. Can confirm, cancel, start (in-progress), complete, and mark no-show — all from the detail view
5. Can reschedule by changing date/time (not just drag on calendar)
6. Can navigate to the customer from a booking detail
7. Can bulk approve/cancel bookings
8. Can export bookings to CSV
9. Gets confirmation that Google Calendar synced (or didn't)
10. Sees booking source (ADMIN/PORTAL/API)

### For a Customer (Public Portal)
1. Can see available services for the tenant
2. Can pick a date and see real available time slots
3. Can enter their details (name, email, phone)
4. Booking is created with RESERVED status and countdown timer
5. Can confirm their reservation (RESERVED → CONFIRMED)
6. Receives a real confirmation email (not blank)
7. Sees a success screen with booking reference and "Add to Calendar" links

### For the System
1. Single `jobs` module — no `booking` duplicate
2. All Inngest events fire correctly (`job/created`, `job/confirmed`, `job/cancelled`, `job/completed`)
3. Notification module receives events and sends real templated emails
4. Calendar sync receives events and pushes to Google Calendar
5. Workflow module triggers automations on booking events
6. Slot capacity is atomically managed (decrement on reserve, restore on cancel/release)
7. Expired reservations auto-release
8. All service methods have test coverage
9. `tsc --noEmit` passes with 0 errors
10. `next build` passes

---

## The Work — Broken Into Tasks

### Phase 1A: Backend Cleanup (Kill the Duplicate)

**Task 1: Delete booking module, keep jobs**
- Delete `src/modules/booking/` entirely
- Update `src/server/root.ts`: remove bookingRouter, keep jobsRouter (alias as `booking` in tRPC for frontend compat)
- Update `src/app/api/inngest/route.ts`: remove `bookingFunctions`, keep `jobsFunctions`
- Update `workflow/engine/context.ts` and `actions.ts`: change dynamic import from `@/modules/booking/booking.repository` to `@/modules/jobs/jobs.repository`
- Verify no other files import from `@/modules/booking/`
- Run `tsc --noEmit` — fix any breakage

**Task 2: Fix the event wiring**
- In `jobs.service.ts` `confirmReservation`: after saga completes, emit `job/confirmed` event (not `booking/confirmed`)
- In `jobs.service.ts` `approveBooking`: same — emit `job/confirmed`
- Remove the phantom `booking/confirmed` send from the saga
- In the saga notification step: fire `notification/send.email` with actual rendered HTML from the notification service, OR fire `job/confirmed` and let the notification event handler do it (cleaner — pick one path)
- Fix `calendar/sync.push` data: ensure field name matches schema (`jobId` not `bookingId`)
- Add `slot/released` event emission in `releaseExpiredReservation`
- Guard against `to: ""` — skip notification if customer email is null
- Verify all event listeners work end-to-end

**Task 2.5: Fix concurrency bugs**
- Replace Redis GET+DEL in `releaseSlotLock` with atomic Lua script (compare-and-delete)
- Wrap `incrementSlotCapacity` in a transaction (same pattern as `decrementSlotCapacity`)
- Fix `generateBookingNumber` race: use `INSERT ... RETURNING` or DB sequence instead of `SELECT MAX + INSERT`
- Fix `endTime` calc on reschedule: read existing `durationMinutes` from booking if not provided in input

**Task 3: Fix confirmation email path**
- Remove `html: ""` from direct `notification/send.email` calls
- Let the notification module's `sendBookingConfirmationEmail` handle it via `job/confirmed` event
- Verify the notification service loads the booking, builds template variables, renders React Email, and sends via Resend
- Single event path: booking emits `job/confirmed` → notification module sends email. No dual paths.

**Task 4: Fix reminders and review requests**
- `scheduleBookingReminders`: implement properly — load booking, calculate reminder times (24h and 2h before), fire `notification/send.email` at those times
- `scheduleReviewRequest`: implement properly — after delay, fire `notification/send.email` with REVIEW_REQUEST trigger
- Both should use the notification service's template system

### Phase 1B: Backend — Missing Procedures

**Task 5: Public booking procedures**
- Implement `slotAvailability` sub-router (currently all 6 procedures are stubs):
  - `getSlotsForDate`: query real `available_slots` table, return slots with capacity info
  - `getSlotsForDateRange`: same for date range
  - `getSlotDetails`: return single slot with availability
  - `isSlotAvailable`: real capacity + conflict check
  - `createBookingFromSlot`: full portal booking flow — find-or-create customer by email, create RESERVED booking, return confirmationToken + bookingReference + reservationExpiresAt
- Create `jobs.router.ts` public procedure `getServices`:
  - Returns active services for tenant (or wire to a services module if it exists)
- Ensure `scheduling` module has a public procedure for available slots by date

**Task 5.5: Fix auth/permission gaps**
- Fix `bulkApprove`/`bulkReject`: use `permissionProcedure("bookings:approve")` not `tenantProcedure`
- Fix `approvedById`/`rejectedById`: pass `ctx.user.id` instead of hardcoded `"system"`
- Fix `list` router: pass `ctx.user.id` to service so RBAC MEMBER filtering works
- Fix `completion.router.ts`: pass real `customerId` from booking, not empty string

**Task 6: Complete status transition actions**
- Add router procedures: `startJob` (CONFIRMED → IN_PROGRESS), `completeJob` (IN_PROGRESS → COMPLETED), `markNoShow` (CONFIRMED/IN_PROGRESS → NO_SHOW)
- Each emits the appropriate event (`job/completed`, etc.)
- `completeJob` should trigger invoice creation if not already created

**Task 7: Reschedule procedure**
- Proper `reschedule` mutation that:
  - Validates new slot availability
  - Updates date/time
  - Fires `calendar/sync.push` for old staff (delete) and new slot
  - Fires notification to customer about rescheduled booking

### Phase 1C: Frontend — Admin Fixes

**Task 8: Wire real services into admin wizard**
- Replace `COMMON_SERVICES` hardcoded array with `api.team.listServices` or equivalent tRPC call
- Remove 14-day date restriction (or make it configurable)
- Remove nil UUID serviceId fallback

**Task 9: Add missing status actions to detail sheet**
- Add "Start" button (→ IN_PROGRESS) for CONFIRMED bookings
- Add "Complete" button (→ COMPLETED) for IN_PROGRESS bookings
- Add "No Show" button for CONFIRMED/IN_PROGRESS bookings
- Wire reschedule button to a reschedule dialog (date/time picker → `api.booking.reschedule`)

**Task 10: Wire "View Customer" link**
- Pass `onCustomerClick` from bookings page and calendar page to BookingDetailSheet
- Navigate to `/admin/customers` with customer selected (or open customer detail sheet)

**Task 11: Add booking status history**
- Add a "History" tab or expandable section in BookingDetailSheet
- Query status change log (audit module or booking-specific history)
- Show timeline: status, who changed it, when, reason

**Task 12: Fix currency**
- Pull currency from tenant settings instead of hardcoding GBP
- Use `Intl.NumberFormat` with tenant's locale and currency

**Task 13: Calendar error handling**
- Show toast on `listForCalendar` query error
- Show toast on staff filter query error
- Add retry button

### Phase 1D: Frontend — Public Portal

**Task 14: Wire services**
- Replace `services={[]}` with real tRPC query (`api.booking.getServices` or `api.service.list`)
- Show loading skeleton while fetching
- Show error state if fetch fails

**Task 15: Wire slot availability**
- Replace stub `getAvailableSlots` with real tRPC call (`api.scheduling.getAvailableSlots`)
- Pass selected serviceId and date
- Handle "slot taken" race condition (already coded in hook — just needs real data)

**Task 16: Wire customer creation**
- Replace nil UUID with actual `createPublic` procedure that handles customer find-or-create
- Pass customer details from form to the procedure
- Handle duplicate email gracefully

**Task 17: Wire confirmation flow**
- After booking created, show reservation timer with real expiry
- "Confirm Booking" button calls `confirmReservation` with email + token
- On success, show success screen with real booking reference
- Wire "Add to Calendar" links (already implemented, just not surfaced — pass `onAddToCalendar`)

### Phase 1E: Tests

**Task 18: Service method tests**
- `updateBooking`: test field updates, event emission, calendar sync trigger
- `cancelBooking`: test status transition, slot capacity restore, event emission, calendar delete
- `approveBooking`: test PENDING → CONFIRMED, saga execution, event emission
- `rejectBooking`: test PENDING → REJECTED, slot capacity restore
- `createCompletion`: test IN_PROGRESS → COMPLETED, invoice creation, review request

**Task 19: Event integration tests**
- Verify `job/confirmed` triggers notification email send
- Verify `job/confirmed` triggers workflow execution
- Verify `job/confirmed` triggers calendar sync push
- Verify `job/cancelled` triggers notification + calendar delete
- Verify `job/completed` triggers review request
- Verify `slot/reserved` triggers expiry timer

**Task 20: E2E smoke test**
- Admin: create booking → appears in list → appears on calendar → confirm → complete
- Portal: select service → pick slot → enter details → booking created → confirm reservation

### Phase 1F: Cleanup

**Task 21: Remove dead code**
- Delete backward-compat aliases (`bookings = jobs` in schema) if no longer needed
- Remove any remaining `@/modules/booking/` imports
- Clean up any TODO comments that have been resolved
- Verify `tsc --noEmit` passes
- Verify `next build` passes
- Run full test suite

---

## What We're NOT Doing (Out of Scope)

These are real features but belong to other modules. We don't touch them now:

- **Recurring bookings** — Module 5 (Recurring Contracts)
- **Payment gateway (Stripe)** — Module 6 (Payment)
- **Intake forms before booking** — Module 7 (Forms)
- **Review collection after completion** — Module 8 (Review)
- **Analytics dashboards** — Module 9 (Analytics)
- **Travel blocks on calendar** — Enhancement after Module 3 (Scheduling)
- **Drag-to-reschedule on calendar** — Already works via FullCalendar
- **Bulk messaging** — Module 5 (Notification)
- **Conflict detection** — Module 3 (Scheduling)
- **Multi-portal templates** (party/medical/salon) — Future, after core works
- **Add-ons system** — Enhancement after Module 1 is solid
- **Venue management** — Separate module
- **Copy for Sheets** — Nice to have, not core

---

## Success Criteria

Module 1 is DONE when:

- [ ] Single `jobs` module, no `booking` duplicate
- [ ] All Inngest events fire correctly and listeners respond
- [ ] Confirmation emails arrive with real content (not blank)
- [ ] Admin can: create, view (list+calendar), detail, confirm, cancel, start, complete, no-show, reschedule
- [ ] Public portal: service selection → slot picking → details → reserve → confirm — all functional
- [ ] All service methods have unit tests (create, confirm, update, cancel, approve, reject, complete)
- [ ] Event integration verified (notification, calendar, workflow all trigger)
- [ ] `tsc --noEmit` = 0 errors
- [ ] `next build` passes
- [ ] No TODO comments in the jobs module
- [ ] No hardcoded placeholder UUIDs
- [ ] No `html: ""` in any notification
- [ ] Currency from tenant settings, not hardcoded
- [ ] Redis lock release is atomic (Lua script)
- [ ] Slot capacity increment is transactional
- [ ] Booking number generation is race-condition safe
- [ ] `bulkApprove`/`bulkReject` require `bookings:approve` permission
- [ ] `approvedById`/`rejectedById` use real user ID
- [ ] RBAC member filtering works (userId passed to list query)
- [ ] `slotAvailability` sub-router returns real data (not stubs)
- [ ] No `to: ""` notification sends when customer email is null
