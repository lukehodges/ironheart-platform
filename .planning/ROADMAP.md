# Roadmap: Ironheart Universal Platform

## Overview

Transform Ironheart from a party entertainment booking tool into a universal platform for any service business. The core principle: engines + config, never features + clients. Every piece of client-specific logic becomes a row in a database table. New clients are a configuration exercise, not a development sprint.

Each phase is a complete vertical slice: backend engine + admin UI. A phase is not done until the feature is usable by an admin without writing code.

Phases 1–3 are sequential foundations. Phases 4–8 are independent and can be parallelised.

**Spec files:** `docs/superpowers/specs/`
**Master spec:** `2026-04-11-universal-platform-architecture.md`

## Phases

- [ ] **Phase 1: Universal Data Model** — Replace booking-centric schema with `jobs`, `resources`, `addresses`, `customerContacts` + `/admin/resources` UI
- [ ] **Phase 2: Payment Split Engine** — Rule-based splits, delete all Cotswold hardcode + `/admin/settings/payments` rule builder UI
- [ ] **Phase 3: Notification Engine** — Trigger rules in DB, generic variable resolver, zero hardcoded sends + `/admin/settings/notifications` trigger UI
- [ ] **Phase 4: Route Jobs** — Multi-stop jobs, route optimisation, fleet dispatch + `/admin/jobs/[id]/route` map view + `/driver` mobile view
- [ ] **Phase 5: Recurring Contracts** — rrule, auto-generated jobs, retainer billing + `/admin/contracts` management UI
- [ ] **Phase 6: Classes & Memberships** — Multi-participant, capacity locks, waitlist, memberships + participants, memberships, and check-in UI
- [ ] **Phase 7: Field Service Billing** — Time tracking, materials, certifications + `/field/jobs/[id]` mobile engineer view
- [ ] **Phase 8: Projects & CRM** — Project phases, milestone invoicing, CRM pipeline + `/admin/projects` and `/admin/crm` UI

## Phase Details

### Phase 1: Universal Data Model
**Goal**: Replace the booking-centric, staff-specific schema with a universal model that handles any resource type and any job pattern. Every subsequent phase builds on this foundation. Includes admin UI for managing all resource types and viewing jobs with type/assignment detail.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-a-universal-data-model.md`
**Depends on**: Nothing (must be done first)
**Success Criteria**:
  1. `jobs` table exists and all existing booking queries route through it
  2. `resources` table exists; every team member has a corresponding resource row
  3. `addresses` table exists and is used by jobs, resources, and customers
  4. `customerContacts` table exists for multi-contact customers
  5. All existing tests pass against the new schema
  6. `tsc --noEmit` passes with 0 errors
  7. `/admin/resources` page exists with full CRUD for PERSON, VEHICLE, ROOM, and EQUIPMENT resource types
  8. `/admin/jobs` (formerly `/admin/bookings`) shows job type labels and resource assignments
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Schema: new tables (resources, addresses, customerContacts), rename bookings→jobs, generate migration, write backfill script
- [ ] 01-02-PLAN.md — Repository: rename booking→jobs module, create resources module, update all cross-module references
- [ ] 01-03-PLAN.md — Admin UI: `/admin/resources` (CRUD for all resource types), update `/admin/bookings` → `/admin/jobs` (job type labels + resource assignments), customer contacts in customer detail view; update all test files, verify 224/224 pass, build clean

### Phase 2: Payment Split Engine
**Goal**: Replace every hardcoded payment split calculation with a rule-based engine. The Cotswold 258-line split file, the mileage lookup table, and the approval-config business-type switch are all deleted. Their logic becomes rows in the database. Includes `/admin/settings/payments` UI for managing split recipients, rules, and lookup tables.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-b-payment-split-engine.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `splitRecipients`, `splitLookupTables`, `splitRules` tables exist
  2. Split engine evaluates ordered rules and produces invoice line items
  3. All Cotswold-specific hardcode removed (`grep -r "cotswold\|mileageCost\|258" src/` returns 0 results)
  4. Existing payment flows produce identical line items to before
  5. Tests cover: FIXED, PERCENTAGE, LOOKUP, REMAINDER, FORMULA rule types
  6. `/admin/settings/payments` exists with split recipients list, rule builder (add/reorder/delete rules per service), and lookup table editor
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — New tables + split engine core (evaluator, rule types, lookup)
- [ ] 02-02-PLAN.md — Payment module integration, delete hardcode, `/admin/settings/payments` UI (recipients, rule builder, lookup table editor), tests

### Phase 3: Notification Engine
**Goal**: Every notification trigger currently hardcoded becomes a row in the database. Every template variable is resolved by a single generic function. Adding a new notification for a new client is an admin UI action, not a deployment. Includes `/admin/settings/notifications` UI for managing triggers.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-c-notification-engine.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `notificationTriggers` table exists; all existing hardcoded triggers migrated as seed rows
  2. Generic variable resolver handles dot-path expressions (`customer.email`, `job.assignments.*.resource.user.email`)
  3. Notification engine evaluates all active triggers on every Inngest event
  4. Zero notification send logic remains in module service files
  5. Adding a new trigger requires only a DB insert, no code change
  6. `/admin/settings/notifications` exists with trigger list, create/edit trigger form (event, channel, recipient expression, template), and test-send button
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — `notificationTriggers` + `notificationTemplates` schema, variable resolver
- [ ] 03-02-PLAN.md — Engine integration with Inngest, migrate existing hardcoded triggers, `/admin/settings/notifications` UI (trigger list, create/edit form, test-send), tests

### Phase 4: Route Jobs
**Goal**: A job can have one location (appointment) or N ordered locations (route). The routing engine calculates travel time between stops, optionally optimises stop order, and tracks actual arrival/departure per stop. Includes a map-based route view for dispatchers and a mobile-optimised driver view for field staff.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-d-route-jobs.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `jobLocations` table exists; single-location jobs have exactly one row
  2. Route optimisation returns optimal stop order via Mapbox/Google Maps API
  3. Fleet dispatch finds nearest available resource in real time
  4. Resources track actual arrival/departure per stop
  5. Travel cost calculated per tenant routing config
  6. `/admin/jobs/[id]/route` exists with visual map, stop list, and dispatch controls
  7. `/driver` mobile-optimised field view exists for field staff navigation and stop management
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — `jobLocations` table, routing engine (point-to-point + optimisation)
- [ ] 04-02-PLAN.md — Fleet dispatch mode, cost calculation, `/admin/jobs/[id]/route` map + stop list + dispatch UI, `/driver` mobile field view, tests

### Phase 5: Recurring Contracts
**Goal**: A client signs a contract once. Jobs are generated automatically on schedule forever. Invoices are generated on schedule, not per-job. Includes a full contract management UI with rrule builder and billing schedule configuration.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-e-recurring-contracts.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `serviceContracts` table exists with rrule field
  2. Inngest function auto-generates jobs on schedule from active contracts
  3. Invoices generated per `invoicingSchedule` config (per-job, weekly, monthly, on-completion)
  4. Contract pause/resume/cancel flows work
  5. Preferred resource assignment honoured when available
  6. `/admin/contracts` list page and `/admin/contracts/new` + `/admin/contracts/[id]` detail pages exist with rrule builder, occurrence preview, and billing schedule config
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — `serviceContracts` table, rrule job generation engine
- [ ] 05-02-PLAN.md — Invoicing schedule, pause/resume/cancel, `/admin/contracts` list + new + detail pages (rrule builder, occurrence preview, billing schedule), tests

### Phase 6: Classes & Memberships
**Goal**: A job can have one customer (appointment) or N customers (class). Each participant has their own status, price paid, and check-in record. Memberships give pre-paid access without booking each time. Includes participant management, membership admin, and a mobile QR check-in page.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-f-classes-memberships.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `jobParticipants` table exists; 1:1 jobs have exactly one PRIMARY participant
  2. Class capacity enforced at booking time; waitlist activates when full
  3. `customerMemberships` table tracks active memberships and usage
  4. QR check-in flow works end-to-end
  5. Membership discount applied automatically at participant booking
  6. `/admin/jobs/[id]/participants` page exists with participant list and check-in controls
  7. `/admin/memberships` page exists for managing plans and active memberships
  8. `/checkin/[ticketRef]` mobile-optimised QR check-in page exists for staff use
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — `jobParticipants`, `membershipPlans`, `customerMemberships` tables + capacity engine
- [ ] 06-02-PLAN.md — Waitlist, check-in flow, membership discount logic, `/admin/jobs/[id]/participants` participant list + check-in, `/admin/memberships` plans + active memberships, `/checkin/[ticketRef]` mobile QR check-in, tests

### Phase 7: Field Service Billing
**Goal**: Engineers clock in and out. They log parts used. At completion, invoice is auto-calculated: (hours × rate) + sum(materials). Certifications block assignment if expired. Includes a mobile engineer job view, certification management, and a billing summary page.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-g-field-service-billing.md`
**Depends on**: Phase 1, Phase 2
**Success Criteria**:
  1. `jobTimeEntries` table tracks clock-in/out per resource per job
  2. `jobMaterials` table tracks parts and consumables
  3. Invoice auto-calculated on job completion (TIME_AND_MATERIALS formula)
  4. `resourceCertifications` blocks assignment if cert is expired
  5. Field engineer mobile view shows active job, time entry controls, materials log
  6. `/field/jobs/[id]` mobile-optimised engineer view exists with clock in/out and materials logging
  7. `/admin/resources/[id]/certifications` page exists for managing resource certifications
  8. `/admin/jobs/[id]/billing` page exists showing time + materials billing summary
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — `jobTimeEntries`, `jobMaterials`, `resourceCertifications` tables + billing calculator
- [ ] 07-02-PLAN.md — Assignment certification check, `/field/jobs/[id]` mobile engineer view (clock in/out, materials log), `/admin/resources/[id]/certifications` cert management, `/admin/jobs/[id]/billing` billing summary, tests

### Phase 8: Projects & CRM
**Goal**: Group multiple jobs under a project with phases. Invoice on milestone completion. Track prospects through a CRM pipeline from first contact to signed contract. Includes a project dashboard and a kanban CRM pipeline view.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-h-projects-crm.md`
**Depends on**: Phase 1, Phase 7
**Success Criteria**:
  1. `projects` and `projectPhases` tables exist; phases contain jobs
  2. Milestone-based invoicing triggers on phase completion
  3. CRM pipeline tracks prospects from first contact to active contract
  4. Time-and-materials billing rolls up from job entries to project invoice
  5. Project dashboard shows progress, spend, and remaining scope
  6. `/admin/projects` list + `/admin/projects/[id]` detail pages exist (phases, jobs, spend)
  7. `/admin/crm` kanban pipeline view exists for managing deals
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — `projects`, `projectPhases`, `crmContacts`, `crmDeals` tables
- [ ] 08-02-PLAN.md — Milestone invoicing, `/admin/projects` list + detail (phases, jobs, spend), `/admin/crm` kanban pipeline, tests

## Progress

**Execution Order:**
Phases 1 → 2 → 3 (sequential). Phases 4, 5, 6, 7, 8 can run in parallel after Phase 1 completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Universal Data Model | 0/3 | Not started | - |
| 2. Payment Split Engine | 0/3 | Not started | - |
| 3. Notification Engine | 0/3 | Not started | - |
| 4. Route Jobs | 0/3 | Not started | - |
| 5. Recurring Contracts | 0/3 | Not started | - |
| 6. Classes & Memberships | 0/3 | Not started | - |
| 7. Field Service Billing | 0/3 | Not started | - |
| 8. Projects & CRM | 0/3 | Not started | - |
