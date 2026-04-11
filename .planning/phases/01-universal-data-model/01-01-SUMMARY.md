---
phase: 01-universal-data-model
plan: 01
subsystem: database
tags: [drizzle-orm, postgres, schema-migration, resources, jobs]

# Dependency graph
requires: []
provides:
  - "resources table: PERSON/VEHICLE/ROOM/EQUIPMENT/VIRTUAL type enum"
  - "addresses table with lat/lng and geocodedAt"
  - "customerContacts table with contact role enum"
  - "jobs table (renamed from bookings) with jobType and pricingStrategy enums"
  - "jobAssignments table (renamed from booking_assignments) with resourceId column"
  - "resourceAvailability table (renamed from user_availability) with resourceId column"
  - "customerType and crmStage enums on customers table"
  - "Drizzle migration SQL with RENAME TO statements"
  - "Backfill script for resources creation from team members"
  - "Updated Inngest event catalog: booking/* → job/*"
affects:
  - "02-module-updates"
  - "booking module"
  - "scheduling module"
  - "notification module"
  - "payment module"
  - "review module"
  - "forms module"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Keep backward-compat table aliases (bookings = jobs) in schema to ease transition during plan 02"
    - "Drizzle migration uses ALTER TABLE RENAME TO — never DROP+CREATE for data preservation"
    - "Backfill scripts use db.execute(sql`...`) with ON CONFLICT DO NOTHING for idempotency"
    - "New enums defined in the schema file where they logically belong"

key-files:
  created:
    - src/shared/db/schemas/resources.schema.ts
    - drizzle/0004_phase1-universal-data-model.sql
    - scripts/backfill-resources.ts
  modified:
    - src/shared/db/schemas/booking.schema.ts
    - src/shared/db/schemas/scheduling.schema.ts
    - src/shared/db/schemas/customer.schema.ts
    - src/shared/db/schemas/shared.schema.ts
    - src/shared/db/schemas/notifications.schema.ts
    - src/shared/db/schema.ts
    - src/shared/db/relations.ts
    - src/shared/inngest.ts

key-decisions:
  - "Manual migration SQL authoring — drizzle-kit generate requires interactive TTY for rename detection, not scriptable in CI/automation"
  - "Keep bookings/bookingAssignments/userAvailability as TypeScript aliases pointing to the new table exports to prevent plan 02 from being a big-bang change"
  - "Use .length (not .rowCount) for postgres.js RowList returned from db.execute() — postgres.js uses Array-like rows not pg-style results"
  - "Added jobId FK on travelLogs (was missing from original schema — bookingId existed but no FK declared)"

patterns-established:
  - "Rename enums use PascalCase in pgEnum first arg (e.g., ResourceType, ContactRole)"
  - "All new Phase 1 columns added as nullable or with defaults — no NOT NULL without defaults to allow adding to existing rows"

# Metrics
duration: 28min
completed: 2026-04-11
---

# Phase 1 Plan 01: Universal Data Model — Schema Layer Summary

**Drizzle schema refactored from bookings to jobs model: 3 new tables (resources/addresses/customerContacts), 3 table renames via ALTER TABLE RENAME TO, 7 new enums, and Inngest event catalog updated from booking/* to job/*.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-04-11T16:28:02Z
- **Completed:** 2026-04-11T16:56:32Z
- **Tasks:** 2
- **Files modified:** 11 (8 modified + 3 created)

## Accomplishments

- Created `resources.schema.ts` with `resources`, `addresses`, `customerContacts` tables and `resourceType`/`contactRole` enums — the foundation for the universal resource model
- Renamed all Drizzle table definitions from `bookings` → `jobs` with new `jobType` and `pricingStrategy` enums; renamed `booking_assignments` → `job_assignments` (adding `resourceId` + `role` columns); renamed `user_availability` → `resource_availability` (adding `resourceId`)
- Updated `relations.ts` with correct relation graph for all renamed tables plus new `resourcesRelations`, `addressesRelations`, `customerContactsRelations`
- Generated migration SQL manually with `ALTER TABLE RENAME TO` (not DROP+CREATE), preserving existing data
- Updated Inngest event catalog: all `booking/*` event keys renamed to `job/*`, all `bookingId` fields renamed to `jobId` throughout event data shapes
- Wrote idempotent `backfill-resources.ts` that creates resource rows for team members and back-fills `jobAssignments.resourceId`

## Task Commits

1. **Task 1: Create schemas and relations** - `37f1ce2` (feat)
2. **Task 2: Migration, backfill script, inngest events** - `e901d91` (feat)
3. **Task 2 fix: rowCount → length on postgres.js RowList** - `409b1dd` (fix)

## Files Created/Modified

- `src/shared/db/schemas/resources.schema.ts` - New: resources, addresses, customerContacts tables with enums
- `src/shared/db/schemas/booking.schema.ts` - Renamed tables to jobs/job_assignments/job_status_history; added 3 new enums and new columns
- `src/shared/db/schemas/scheduling.schema.ts` - Renamed userAvailability → resourceAvailability; added resourceId column
- `src/shared/db/schemas/customer.schema.ts` - Added customerType, crmStage enums; added type, crmStage, companyName columns
- `src/shared/db/schemas/shared.schema.ts` - Renamed bookingId → jobId in invoices, payments, reviews, reviewRequests, completedForms
- `src/shared/db/schemas/notifications.schema.ts` - Renamed bookingId → jobId in sentMessages
- `src/shared/db/schema.ts` - Added `export * from "./schemas/resources.schema"`
- `src/shared/db/relations.ts` - Updated all relation definitions for renamed tables; added relations for resources/addresses/customerContacts
- `src/shared/inngest.ts` - Renamed booking/* → job/* event keys; renamed bookingId → jobId in all event data
- `drizzle/0004_phase1-universal-data-model.sql` - Migration with CREATE TABLE for 3 new tables, 4x ALTER TABLE RENAME TO, column renames, new FK constraints
- `scripts/backfill-resources.ts` - Idempotent backfill: INSERT resources for team members, UPDATE jobAssignments.resourceId

## Decisions Made

- **Manual migration authoring**: drizzle-kit generate requires interactive TTY to select "rename" vs "create" for each changed table. Since this can't be automated non-interactively, the SQL was written manually with the correct `ALTER TABLE RENAME TO` statements.
- **Backward-compat aliases**: `export const bookings = jobs` kept in booking.schema.ts and similar for other renamed tables. This allows module code (updated in Plan 02) to be updated incrementally.
- **postgres.js `.length` not `.rowCount`**: Drizzle with postgres.js returns `RowList` from `db.execute()` — an array-like with `length`, not a pg `QueryResult` with `rowCount`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed .rowCount → .length in backfill script**
- **Found during:** Task 2 verification (tsc check)
- **Issue:** `db.execute()` with postgres.js returns a `RowList` (array-like) not a pg `QueryResult` — `.rowCount` property doesn't exist on the type
- **Fix:** Changed `insertResult.rowCount` and `updateResult.rowCount` to `.length`
- **Files modified:** scripts/backfill-resources.ts
- **Verification:** `npx tsc --noEmit` passes with no errors in backfill-resources.ts
- **Committed in:** `409b1dd`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor fix — the logic is identical, only the property access changed. No scope creep.

## Issues Encountered

- drizzle-kit generate cannot be driven non-interactively (requires TTY for rename detection prompts). Resolved by manually authoring the migration SQL with correct ALTER TABLE RENAME TO statements, which is semantically equivalent and actually more reliable.

## Self-Check

File existence:
- `src/shared/db/schemas/resources.schema.ts` — FOUND
- `drizzle/0004_phase1-universal-data-model.sql` — FOUND
- `scripts/backfill-resources.ts` — FOUND

Commits:
- `37f1ce2` — FOUND
- `e901d91` — FOUND
- `409b1dd` — FOUND

tsc errors in schema/relations/inngest files: 0

## Self-Check: PASSED

## Next Phase Readiness

- Schema layer is complete. All Drizzle table definitions, the barrel export, and the relation graph are consistent with the new names.
- Plan 02 (module-updates) can now update all module repositories, services, events, and app code to use `jobs` instead of `bookings`, `jobId` instead of `bookingId`, and `job/*` Inngest events.
- The migration SQL is ready to apply to the database — run `backfill-resources.ts` immediately after applying the migration.
- Existing 224 tests will fail until Plan 02 completes (module code still uses old field names). This is expected.

---
*Phase: 01-universal-data-model*
*Completed: 2026-04-11*
