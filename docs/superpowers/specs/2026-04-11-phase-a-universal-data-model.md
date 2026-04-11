# Phase A — Universal Data Model
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Nothing (must be done first)
**Unlocks:** All other phases

---

## Goal

Replace the booking-centric, staff-specific schema with a universal model that handles any resource type and any job pattern. Every subsequent phase builds on this foundation.

---

## New Tables

### `resources`
Replaces `staffId` everywhere. A resource is anything schedulable: a person, vehicle, room, or piece of equipment.

```sql
resources {
  id              uuid PK
  tenantId        uuid FK → tenants
  type            enum: PERSON | VEHICLE | ROOM | EQUIPMENT | VIRTUAL
  name            text
  slug            text -- url-safe identifier
  capacity        int  -- max concurrent jobs (default 1)
  homeAddressId   uuid FK → addresses (nullable)
  travelEnabled   bool -- does this resource travel to jobs?
  skillTags       text[] -- ['gas-safe', 'first-aid', 'electric-vehicles']
  userId          uuid FK → users (nullable — only for PERSON type)
  isActive        bool
  metadata        jsonb -- vehicle reg, room layout, equipment serial, etc.
  createdAt, updatedAt
}
```

**Migration:** Create a `resources` row for every existing user where `isTeamMember = true`. Set `type = PERSON`, `userId = user.id`. Then add `resourceId` to `jobAssignments` referencing this.

### `addresses`
Normalised, geocoded location records shared across jobs, resources, customers, and venues. Replaces inline `locationAddress` JSONB fields.

```sql
addresses {
  id          uuid PK
  tenantId    uuid FK → tenants
  line1       text
  line2       text (nullable)
  city        text
  county      text (nullable)
  postcode    text
  country     text default 'GB'
  lat         decimal(10,7) (nullable)
  lng         decimal(10,7) (nullable)
  geocodedAt  timestamp (nullable)
  label       text (nullable) -- 'Head Office', 'Client Site A'
  createdAt
}
```

### `customerContacts`
Multiple contacts per customer. Required for B2B clients where the payer, the site contact, and the decision-maker are different people.

```sql
customerContacts {
  id           uuid PK
  customerId   uuid FK → customers
  tenantId     uuid FK → tenants
  name         text
  email        text (nullable)
  phone        text (nullable)
  role         enum: PRIMARY | BILLING | SITE_CONTACT | GUARDIAN | EMERGENCY
  receivesNotifications bool default false
  createdAt
}
```

---

## Modified Tables

### `bookings` → renamed to `jobs`
All existing columns preserved. New columns added:

```sql
-- Add to jobs:
type              enum: APPOINTMENT | CLASS | TEAM_JOB | ROUTE_JOB | RECURRING_INSTANCE | PROJECT_TASK
                  default: APPOINTMENT
pricingStrategy   enum: FIXED | TIERED | QUOTED | FORMULA | TIME_AND_MATERIALS | RETAINER
                  default: FIXED
quotedAmount      decimal(10,2) (nullable) -- pre-approval quote
quoteApprovedAt   timestamp (nullable)
quoteApprovedById uuid FK → users (nullable)
contractId        uuid FK → serviceContracts (nullable) -- for recurring instances
projectId         uuid FK → projects (nullable) -- for project-phase jobs
primaryAddressId  uuid FK → addresses (nullable) -- replaces locationAddress JSONB
```

`locationAddress` JSONB column: keep for backwards compatibility during migration, mark deprecated, read from `addresses` table going forward.

### `customers`
```sql
-- Add to customers:
type       enum: INDIVIDUAL | COMPANY  default: INDIVIDUAL
crmStage   enum: PROSPECT | ACTIVE | CHURNED  default: ACTIVE
companyName text (nullable)
```

### `bookingAssignments` → renamed to `jobAssignments`
```sql
-- Add to jobAssignments:
resourceId  uuid FK → resources  -- replaces staffId
role        enum: LEAD | SUPPORT | DRIVER | OBSERVER  default: LEAD

-- staffId column: keep temporarily for migration, then drop
```

### `staffAvailability` → renamed to `resourceAvailability`
No column changes — just rename and update FK to reference `resources.id` instead of `users.id`.

---

## Drizzle Schema Changes

All changes are additive first (new columns nullable, old columns kept), then migrate data, then drop old columns. This enables zero-downtime migration.

### Migration sequence:
1. Create `addresses` table
2. Create `resources` table
3. Backfill: insert `resources` row for each team member user
4. Create `customerContacts` table
5. Add new columns to `jobs` (was `bookings`) — all nullable
6. Add `resourceId` to `jobAssignments` (was `bookingAssignments`)
7. Backfill: set `jobAssignments.resourceId` from `resources` where `userId = staffId`
8. Add type/crmStage to `customers`
9. Rename tables (Drizzle migration)
10. After smoke testing: drop deprecated columns (`staffId`, `locationAddress` JSONB)

---

## Module Changes

### New module: `resources`
```
src/modules/resources/
  resources.types.ts
  resources.schemas.ts
  resources.repository.ts
  resources.service.ts
  resources.router.ts
  index.ts
  __tests__/resources.service.test.ts
```

Procedures: `create`, `update`, `list`, `getById`, `delete`, `listAvailable` (scheduling query), `updateAvailability`.

### Updated module: `booking` → `jobs`
- Rename module directory: `src/modules/booking/` → `src/modules/jobs/`
- Update all `staffId` references to `resourceId`
- Update `booking.repository.ts` → `jobs.repository.ts` (all queries)
- Update Inngest events: `booking/*` → `job/*`
- Keep old event names as aliases during transition for any existing Inngest jobs in flight

### Updated module: `scheduling`
- `staffAvailability` queries → `resourceAvailability`
- Smart assignment now queries `resources` table with type filter + skillTags matching
- Travel time calculation uses `resources.homeAddressId` → `addresses` for origin

### Updated module: `customer`
- Add `customerContacts` CRUD procedures
- List procedure returns contacts alongside customer

---

## Root Router Changes

```typescript
// src/server/root.ts
export const appRouter = createTRPCRouter({
  // rename:
  jobs: jobsRouter,       // was booking
  resources: resourcesRouter,  // new
  // ...all others unchanged
})
```

---

## Tests

- `resources.service.test.ts`: CRUD, availability query, skill matching, type filtering
- `jobs.service.test.ts`: all existing booking tests pass with renamed module; new type/pricingStrategy field validation
- `jobs.repository.test.ts`: resourceId assignment, jobAssignments backfill verification
- Migration smoke test: verify every old `staffId` has a corresponding `resources` row

---

## Definition of Done

- [ ] `resources` table created with full CRUD
- [ ] Every team member user has a corresponding `resources` row
- [ ] `jobAssignments.resourceId` populated from existing `staffId` data
- [ ] `bookings` renamed to `jobs` with new columns
- [ ] `bookingAssignments` renamed to `jobAssignments`
- [ ] `staffAvailability` renamed to `resourceAvailability`
- [ ] `customers.type` and `customers.crmStage` added
- [ ] `customerContacts` table created
- [ ] `addresses` table created
- [ ] All 224 existing tests pass with updated module names
- [ ] tsc passes, build passes
