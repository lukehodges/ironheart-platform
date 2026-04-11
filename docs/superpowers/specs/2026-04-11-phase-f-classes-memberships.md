# Phase F — Classes & Memberships
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A
**Unlocks:** Fitness studios, yoga, cookery schools, group lessons, workshops, events

---

## Goal

A job can have one customer (appointment) or N customers (class). Each participant has their own status, price paid, and check-in record. Memberships give customers pre-paid access to classes without booking and paying each time.

---

## New Tables

### `jobParticipants`
One row per customer per class/event. For 1:1 appointments, there is exactly one row with `role = PRIMARY`.

```sql
jobParticipants {
  id           uuid PK
  jobId        uuid FK → jobs
  customerId   uuid FK → customers
  tenantId     uuid FK → tenants
  role         enum: PRIMARY | GUEST | LEARNER | ATTENDEE  default: PRIMARY
  status       enum: RESERVED | CONFIRMED | ATTENDED | NO_SHOW | CANCELLED  default: RESERVED
  pricePaid    decimal(10,2) (nullable)  -- individual price (may differ from base price if membership discount)
  membershipId uuid FK → customerMemberships (nullable)  -- which membership covered this
  ticketRef    text (nullable)  -- QR code / check-in reference (UUID)
  checkedInAt  timestamp (nullable)
  checkedInById uuid FK → users (nullable)
  waitlistPosition int (nullable)  -- non-null = on waitlist
  reservedAt   timestamp
  confirmedAt  timestamp (nullable)
  cancelledAt  timestamp (nullable)
  createdAt
}
```

### `memberships`
Membership plan definitions (what you sell, not what a customer has).

```sql
memberships {
  id                   uuid PK
  tenantId             uuid FK → tenants
  name                 text  -- 'Monthly Unlimited', '10-Class Pass', 'Annual Pass'
  type                 enum: MONTHLY_UNLIMITED | ANNUAL_UNLIMITED | PUNCH_CARD | FIXED_PERIOD
  price                decimal(10,2)
  currency             text default 'GBP'
  creditsPerPeriod     int (nullable)  -- for PUNCH_CARD: total credits; MONTHLY: credits per month
  validDays            int (nullable)  -- for FIXED_PERIOD: days until expiry from purchase
  applicableServiceIds uuid[] (nullable)  -- null = all services; array = specific services only
  maxBookingsPerDay    int (nullable)  -- rate limiting
  stripePriceId        text (nullable)
  isActive             bool default true
  createdAt
}
```

### `customerMemberships`
A customer's active membership instance.

```sql
customerMemberships {
  id                    uuid PK
  customerId            uuid FK → customers
  membershipId          uuid FK → memberships
  tenantId              uuid FK → tenants
  status                enum: ACTIVE | PAUSED | CANCELLED | EXPIRED
  startDate             date
  endDate               date (nullable)
  creditsRemaining      int (nullable)  -- for PUNCH_CARD
  creditsResetAt        date (nullable)  -- for MONTHLY: when credits reset
  stripeSubscriptionId  text (nullable)
  pausedUntil           date (nullable)
  cancelledAt           timestamp (nullable)
  createdAt, updatedAt
}
```

---

## Job Changes for Classes

Add to `jobs` table:
```sql
maxParticipants    int (nullable)  -- null = 1:1 appointment; N = class with capacity
currentCount       int default 0   -- denormalised for fast capacity checks; incremented atomically
waitlistEnabled    bool default true
```

---

## Capacity Management

All participant mutations go through `jobService.joinClass()` which handles concurrency safely:

```typescript
async function joinClass(
  jobId: string,
  customerId: string,
  tenantId: string,
  membershipId?: string
): Promise<{ status: 'confirmed' | 'waitlisted' | 'full' }>
```

Logic:
1. `SELECT currentCount, maxParticipants FROM jobs WHERE id = ? FOR UPDATE` (row lock)
2. If `currentCount < maxParticipants` → insert `jobParticipants` with `status = CONFIRMED`, increment `currentCount`
3. Else if `waitlistEnabled` → insert with `waitlistPosition = (SELECT MAX(waitlistPosition) + 1 FROM jobParticipants WHERE jobId = ?)`
4. Else → return `{ status: 'full' }`
5. Emit `job/participant-joined` Inngest event

### Waitlist Promotion
When a participant cancels, Inngest function `promoteFromWaitlist` fires:
1. Find next `jobParticipants` row where `waitlistPosition = 1` for this job
2. Transition to `CONFIRMED`, decrement all other `waitlistPosition` values by 1
3. Emit notification trigger: `job/waitlist-promoted`

---

## Membership Redemption

When a customer books a class:
1. Check if customer has `ACTIVE` membership where `applicableServiceIds` includes the service (or is null)
2. If `PUNCH_CARD` and `creditsRemaining > 0`: deduct 1 credit, set `pricePaid = 0`, set `jobParticipants.membershipId`
3. If `MONTHLY_UNLIMITED` or `ANNUAL_UNLIMITED`: set `pricePaid = 0`, set `membershipId`
4. If no valid membership: charge full price via payment module

Membership credit reset: Inngest cron daily checks `creditsResetAt <= today`, resets `creditsRemaining = memberships.creditsPerPeriod`, sets next `creditsResetAt`.

---

## Check-In

Staff can check in participants at the door:

```typescript
jobs.checkIn(jobId: string, ticketRef: string): Promise<{ customer: Customer; participant: JobParticipant }>
```

Resolves `ticketRef` to `jobParticipants` row, sets `checkedInAt = now`, `status = ATTENDED`. Returns customer details for display at door.

QR code content: `{ticketRef}` (UUID, generated at `joinClass` time).

---

## Portal Changes

Public class booking flow:
1. Customer browses class schedule (jobs where `maxParticipants > 1`)
2. Sees current capacity: "8 of 12 spots filled"
3. Books → `joinClass()` — gets `confirmed` or `waitlisted`
4. If `waitlisted`: shown position, notified when promoted

---

## Module Structure

```
src/modules/classes/
  classes.types.ts
  classes.schemas.ts
  classes.repository.ts    -- jobParticipants + memberships CRUD
  classes.service.ts       -- joinClass, cancelParticipant, checkIn, promoteWaitlist
  classes.router.ts
  classes.events.ts        -- promoteFromWaitlist, resetMembershipCredits
  index.ts
  __tests__/
    classes.service.test.ts
```

---

## Tests

`classes.service.test.ts`:
- Join class: confirmed when capacity available
- Join class: waitlisted when at capacity
- Join class: rejected when at capacity and waitlist disabled
- Concurrent joins: only one succeeds at capacity boundary (race condition test)
- Cancel: decrements currentCount, promotes waitlisted participant
- Waitlist promotion: correct participant promoted, positions updated
- Membership redemption: credits deducted for PUNCH_CARD
- Membership redemption: no credits deducted for UNLIMITED
- Membership redemption: expired membership not used
- Check-in: sets checkedInAt, returns customer
- Check-in: invalid ticketRef throws NotFoundError
- Credit reset: creditsRemaining reset to plan amount on reset date

---

## Definition of Done

- [ ] `jobParticipants` table created
- [ ] `memberships` table created
- [ ] `customerMemberships` table created
- [ ] `maxParticipants` and `currentCount` added to `jobs`
- [ ] `classes` module scaffolded with full CRUD
- [ ] `joinClass` with row-level locking implemented
- [ ] Waitlist promotion Inngest function implemented
- [ ] Membership redemption implemented
- [ ] Credit reset cron implemented
- [ ] Check-in procedure implemented
- [ ] Portal updated to show capacity + waitlist status
- [ ] All tests pass
- [ ] tsc passes, build passes
