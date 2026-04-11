# Roadmap: Ironheart Universal Platform

## Overview

Transform Ironheart from a party entertainment booking tool into a universal platform for any service business. The core principle: engines + config, never features + clients. Every piece of client-specific logic becomes a row in a database table. New clients are a configuration exercise, not a development sprint.

Phases 1–3 are sequential foundations. Phases 4–8 are independent and can be parallelised.

**Spec files:** `docs/superpowers/specs/`
**Master spec:** `2026-04-11-universal-platform-architecture.md`

## Phases

- [ ] **Phase 1: Universal Data Model** — Replace booking-centric schema with `jobs`, `resources`, `addresses`, `customerContacts`
- [ ] **Phase 2: Payment Split Engine** — Rule-based splits, delete all Cotswold hardcode
- [ ] **Phase 3: Notification Engine** — Trigger rules in DB, generic variable resolver, zero hardcoded sends
- [ ] **Phase 4: Route Jobs** — Multi-stop jobs, route optimisation, fleet dispatch
- [ ] **Phase 5: Recurring Contracts** — rrule, auto-generated jobs, retainer billing
- [ ] **Phase 6: Classes & Memberships** — Multi-participant, capacity locks, waitlist, memberships
- [ ] **Phase 7: Field Service Billing** — Time tracking, materials, certifications
- [ ] **Phase 8: Projects & CRM** — Project phases, milestone invoicing, CRM pipeline

## Phase Details

### Phase 1: Universal Data Model
**Goal**: Replace the booking-centric, staff-specific schema with a universal model that handles any resource type and any job pattern. Every subsequent phase builds on this foundation.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-a-universal-data-model.md`
**Depends on**: Nothing (must be done first)
**Success Criteria**:
  1. `jobs` table exists and all existing booking queries route through it
  2. `resources` table exists; every team member has a corresponding resource row
  3. `addresses` table exists and is used by jobs, resources, and customers
  4. `customerContacts` table exists for multi-contact customers
  5. All existing tests pass against the new schema
  6. `tsc --noEmit` passes with 0 errors
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Schema: new tables (resources, addresses, customerContacts), rename bookings→jobs, generate migration, write backfill script
- [ ] 01-02-PLAN.md — Repository: rename booking→jobs module, create resources module, update all cross-module references
- [ ] 01-03-PLAN.md — Tests: update all test files, write resources tests, verify 224/224 pass, build clean

### Phase 2: Payment Split Engine
**Goal**: Replace every hardcoded payment split calculation with a rule-based engine. The Cotswold 258-line split file, the mileage lookup table, and the approval-config business-type switch are all deleted. Their logic becomes rows in the database.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-b-payment-split-engine.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `splitRecipients`, `splitLookupTables`, `splitRules` tables exist
  2. Split engine evaluates ordered rules and produces invoice line items
  3. All Cotswold-specific hardcode removed (`grep -r "cotswold\|mileageCost\|258" src/` returns 0 results)
  4. Existing payment flows produce identical line items to before
  5. Tests cover: FIXED, PERCENTAGE, LOOKUP, REMAINDER, FORMULA rule types
**Plans**: 3 plans

Plans:
- [ ] 02-01: New tables + split engine core (evaluator, rule types, lookup)
- [ ] 02-02: Payment module integration, delete hardcode, tests

### Phase 3: Notification Engine
**Goal**: Every notification trigger currently hardcoded becomes a row in the database. Every template variable is resolved by a single generic function. Adding a new notification for a new client is an admin UI action, not a deployment.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-c-notification-engine.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `notificationTriggers` table exists; all existing hardcoded triggers migrated as seed rows
  2. Generic variable resolver handles dot-path expressions (`customer.email`, `job.assignments.*.resource.user.email`)
  3. Notification engine evaluates all active triggers on every Inngest event
  4. Zero notification send logic remains in module service files
  5. Adding a new trigger requires only a DB insert, no code change
**Plans**: 3 plans

Plans:
- [ ] 03-01: `notificationTriggers` + `notificationTemplates` schema, variable resolver
- [ ] 03-02: Engine integration with Inngest, migrate existing hardcoded triggers, tests

### Phase 4: Route Jobs
**Goal**: A job can have one location (appointment) or N ordered locations (route). The routing engine calculates travel time between stops, optionally optimises stop order, and tracks actual arrival/departure per stop.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-d-route-jobs.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `jobLocations` table exists; single-location jobs have exactly one row
  2. Route optimisation returns optimal stop order via Mapbox/Google Maps API
  3. Fleet dispatch finds nearest available resource in real time
  4. Resources track actual arrival/departure per stop
  5. Travel cost calculated per tenant routing config
**Plans**: 3 plans

Plans:
- [ ] 04-01: `jobLocations` table, routing engine (point-to-point + optimisation)
- [ ] 04-02: Fleet dispatch mode, cost calculation, admin UI, tests

### Phase 5: Recurring Contracts
**Goal**: A client signs a contract once. Jobs are generated automatically on schedule forever. Invoices are generated on schedule, not per-job.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-e-recurring-contracts.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `serviceContracts` table exists with rrule field
  2. Inngest function auto-generates jobs on schedule from active contracts
  3. Invoices generated per `invoicingSchedule` config (per-job, weekly, monthly, on-completion)
  4. Contract pause/resume/cancel flows work
  5. Preferred resource assignment honoured when available
**Plans**: 3 plans

Plans:
- [ ] 05-01: `serviceContracts` table, rrule job generation engine
- [ ] 05-02: Invoicing schedule, pause/resume/cancel, admin UI, tests

### Phase 6: Classes & Memberships
**Goal**: A job can have one customer (appointment) or N customers (class). Each participant has their own status, price paid, and check-in record. Memberships give pre-paid access without booking each time.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-f-classes-memberships.md`
**Depends on**: Phase 1
**Success Criteria**:
  1. `jobParticipants` table exists; 1:1 jobs have exactly one PRIMARY participant
  2. Class capacity enforced at booking time; waitlist activates when full
  3. `customerMemberships` table tracks active memberships and usage
  4. QR check-in flow works end-to-end
  5. Membership discount applied automatically at participant booking
**Plans**: 3 plans

Plans:
- [ ] 06-01: `jobParticipants`, `membershipPlans`, `customerMemberships` tables + capacity engine
- [ ] 06-02: Waitlist, check-in flow, membership discount logic, tests

### Phase 7: Field Service Billing
**Goal**: Engineers clock in and out. They log parts used. At completion, invoice is auto-calculated: (hours × rate) + sum(materials). Certifications block assignment if expired.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-g-field-service-billing.md`
**Depends on**: Phase 1, Phase 2
**Success Criteria**:
  1. `jobTimeEntries` table tracks clock-in/out per resource per job
  2. `jobMaterials` table tracks parts and consumables
  3. Invoice auto-calculated on job completion (TIME_AND_MATERIALS formula)
  4. `resourceCertifications` blocks assignment if cert is expired
  5. Field engineer mobile view shows active job, time entry controls, materials log
**Plans**: 3 plans

Plans:
- [ ] 07-01: `jobTimeEntries`, `jobMaterials`, `resourceCertifications` tables + billing calculator
- [ ] 07-02: Assignment certification check, mobile-friendly UI, tests

### Phase 8: Projects & CRM
**Goal**: Group multiple jobs under a project with phases. Invoice on milestone completion. Track prospects through a CRM pipeline from first contact to signed contract.
**Spec**: `docs/superpowers/specs/2026-04-11-phase-h-projects-crm.md`
**Depends on**: Phase 1, Phase 7
**Success Criteria**:
  1. `projects` and `projectPhases` tables exist; phases contain jobs
  2. Milestone-based invoicing triggers on phase completion
  3. CRM pipeline tracks prospects from first contact to active contract
  4. Time-and-materials billing rolls up from job entries to project invoice
  5. Project dashboard shows progress, spend, and remaining scope
**Plans**: 3 plans

Plans:
- [ ] 08-01: `projects`, `projectPhases`, `crmContacts`, `crmDeals` tables
- [ ] 08-02: Milestone invoicing, pipeline views, project dashboard, tests

## Progress

**Execution Order:**
Phases 1 → 2 → 3 (sequential). Phases 4, 5, 6, 7, 8 can run in parallel after Phase 1 completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Universal Data Model | 0/3 | Not started | - |
| 2. Payment Split Engine | 0/2 | Not started | - |
| 3. Notification Engine | 0/2 | Not started | - |
| 4. Route Jobs | 0/2 | Not started | - |
| 5. Recurring Contracts | 0/2 | Not started | - |
| 6. Classes & Memberships | 0/2 | Not started | - |
| 7. Field Service Billing | 0/2 | Not started | - |
| 8. Projects & CRM | 0/2 | Not started | - |
