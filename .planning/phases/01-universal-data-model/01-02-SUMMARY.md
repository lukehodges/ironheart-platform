---
phase: 01-universal-data-model
plan: 02
subsystem: api
tags: [trpc, drizzle, inngest, jobs, resources, scheduling, customer-contacts]

requires:
  - phase: 01-01
    provides: drizzle schema with jobs, jobAssignments, resourceAvailability, addresses, customerContacts tables

provides:
  - src/modules/jobs/ — fully renamed booking module using jobs table and job/* events
  - src/modules/resources/ — new CRUD module for resources table with listAvailable
  - scheduling module updated to use jobs and resourceAvailability tables
  - customer module extended with customerContacts CRUD sub-router
  - all 30+ cross-module files updated from bookings/userAvailability to jobs/resourceAvailability
  - root.ts wired with jobs: jobsRouter and resources: resourcesRouter
  - 0 tsc errors in non-test files

affects:
  - 01-03 (tests — will need to reference jobs/resources APIs)
  - phase 2 (scheduling — uses updated resourceAvailability queries)
  - phase 3 (auth — uses updated job/* event names)

tech-stack:
  added: []
  patterns:
    - backward-compat aliases in schema allow incremental module migration (bookings=jobs in schema)
    - old booking module kept alongside new jobs module during transition period
    - job/* Inngest events replace booking/* throughout all modules

key-files:
  created:
    - src/modules/jobs/jobs.types.ts
    - src/modules/jobs/jobs.schemas.ts
    - src/modules/jobs/jobs.repository.ts
    - src/modules/jobs/jobs.service.ts
    - src/modules/jobs/jobs.router.ts
    - src/modules/jobs/jobs.events.ts
    - src/modules/jobs/jobs.manifest.ts
    - src/modules/jobs/jobs.search-provider.ts
    - src/modules/jobs/index.ts
    - src/modules/resources/resources.types.ts
    - src/modules/resources/resources.schemas.ts
    - src/modules/resources/resources.repository.ts
    - src/modules/resources/resources.service.ts
    - src/modules/resources/resources.router.ts
    - src/modules/resources/index.ts
  modified:
    - src/modules/scheduling/scheduling.repository.ts
    - src/modules/scheduling/scheduling.service.ts
    - src/modules/scheduling/scheduling.events.ts
    - src/modules/customer/customer.repository.ts
    - src/modules/customer/customer.types.ts
    - src/modules/customer/customer.schemas.ts
    - src/modules/customer/customer.service.ts
    - src/modules/customer/customer.router.ts
    - src/modules/team/team.repository.ts
    - src/modules/search/search.repository.ts
    - src/modules/analytics/analytics.repository.ts
    - src/modules/integrations/integrations.repository.ts
    - src/server/root.ts

key-decisions:
  - "Kept backward-compat booking module alongside jobs module — existing inngest functions still registered, root.ts exports both booking and jobs routers during transition"
  - "Schema aliases (bookings=jobs, userAvailability=resourceAvailability) allowed all tsc errors to be resolved incrementally rather than big-bang"
  - "customerContacts CRUD added to customer.router as nested contacts sub-router — list uses tenantProcedure, create/update/delete use permissionProcedure(customer:update)"

patterns-established:
  - "Nested routers in tRPC: contacts: router({ list, create, update, delete }) inside customerRouter"
  - "jobs table is the canonical name; bookings alias exists only in schema for backward compat — new code uses jobs"
  - "resourceAvailability is the canonical name; userAvailability alias exists only in schema — new code uses resourceAvailability"

duration: 47min
completed: 2026-04-11
---

# Phase 1 Plan 02: Module Code Updates Summary

**Renamed booking module to jobs, created resources module, and updated all 30+ cross-module files from bookings/userAvailability to jobs/resourceAvailability — 0 tsc errors**

## Performance

- **Duration:** 47 min
- **Started:** 2026-04-11T18:38:24Z
- **Completed:** 2026-04-11T19:25:00Z
- **Tasks:** 2 of 2
- **Files modified:** 46

## Accomplishments

- Created `src/modules/jobs/` (renamed from booking) with all module files using jobs table and job/* Inngest events
- Created `src/modules/resources/` with full module structure: types, schemas, repository (with listAvailable query), service, router (6 procedures), index
- Updated all 30+ cross-module files: scheduling, customer, team, search, analytics, integrations, notification, review, payment, workflow, forms — from bookings/userAvailability to jobs/resourceAvailability
- Added customerContacts CRUD to customer module (types, schemas, repository, service, router sub-procedures)
- Wired root.ts with jobs: jobsRouter and resources: resourcesRouter
- 0 tsc errors confirmed after all changes

## Task Commits

1. **Task 1: Rename booking module to jobs and create resources module** — `a55b11d` (feat)
2. **Task 2: Update all cross-module references and wire root.ts** — `c8abdd3` (feat)

## Files Created/Modified

- `src/modules/jobs/` — Full module: types, schemas, repository, service, router, events, manifest, search-provider, index, lib/, sub-routers/
- `src/modules/resources/` — Full module: types, schemas, repository (listAvailable uses jobAssignments JOIN), service, router, index
- `src/modules/scheduling/scheduling.repository.ts` — bookings→jobs, userAvailability→resourceAvailability in 5 query methods
- `src/modules/scheduling/scheduling.service.ts` — bookings→jobs in schema import and queries
- `src/modules/customer/customer.{types,schemas,repository,service,router}.ts` — Added customerContacts CRUD; bookings→jobs in merge and history
- `src/modules/team/team.repository.ts` — userAvailability→resourceAvailability throughout
- `src/modules/search/search.repository.ts` — bookings→jobs in fullTextSearchBookings
- `src/modules/analytics/analytics.repository.ts` — bookings→jobs in all 10 query functions
- `src/modules/integrations/integrations.repository.ts` — bookings→jobs in staffId lookup
- `src/server/root.ts` — Added jobs and resources routers

## Decisions Made

- **Kept old booking module during transition**: The existing `src/modules/booking/` is kept alongside `src/modules/jobs/` for backward compat. Both are registered in Inngest route.ts and root.ts. The old booking module will be removed in a later cleanup plan once all consumers are updated.
- **Schema aliases as bridge**: The schema's `bookings = jobs` and `userAvailability = resourceAvailability` aliases allowed all 30+ files to compile and pass tsc while being updated incrementally.
- **customerContacts CRUD placement**: Added as `customer.contacts.*` sub-router (nested tRPC router) rather than a separate module — contacts are owned by the customer module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated scheduling.repository.ts userAvailability→resourceAvailability**
- **Found during:** Task 2 (cross-module updates)
- **Issue:** Plan listed scheduling.repository.ts as needing updates but the initial working state had it using alias names. The must-have truth required `resourceAvailability` explicitly (not the alias)
- **Fix:** Updated all 11 references from `userAvailability` to `resourceAvailability` and `bookings` to `jobs` in scheduling.repository.ts
- **Files modified:** src/modules/scheduling/scheduling.repository.ts
- **Committed in:** c8abdd3 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Updated team.repository.ts userAvailability→resourceAvailability**
- **Found during:** Task 2 (cross-module updates)
- **Issue:** team.repository.ts had many userAvailability references not listed prominently in the task spec
- **Fix:** Replaced all 20+ userAvailability references with resourceAvailability
- **Files modified:** src/modules/team/team.repository.ts
- **Committed in:** c8abdd3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 2 — missing canonical name updates)
**Impact on plan:** Both fixes necessary to satisfy must-have truths. No scope creep.

## Issues Encountered

- The previous commit (`a55b11d`) from the git log had already created the jobs and resources modules, so Task 1 was effectively complete before this execution started. Task 2 (cross-module updates) was the primary work executed.

## Self-Check

Files verified to exist:
- src/modules/jobs/jobs.repository.ts: FOUND
- src/modules/jobs/jobs.events.ts: FOUND
- src/modules/resources/resources.repository.ts: FOUND
- src/modules/resources/resources.router.ts: FOUND

Commits verified:
- a55b11d: FOUND (feat(01-02): create jobs module)
- c8abdd3: FOUND (feat(01-02): update cross-module references)

tsc errors: 0

## Self-Check: PASSED

## Next Phase Readiness

- Schema migration (Plan 01-01) and module code updates (Plan 01-02) are both complete
- Plan 01-03 (tests) can now run — all module code is wired and compiles
- The old booking module remains for backward compat but should be reviewed for removal in a cleanup phase
- The migration SQL (0004_phase1-universal-data-model.sql) still needs to be applied to production DB before tests can pass against a real DB

---
*Phase: 01-universal-data-model*
*Completed: 2026-04-11*
