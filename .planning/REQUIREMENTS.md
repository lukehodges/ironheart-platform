# Requirements: Ironheart Universal Platform

**Defined:** 2026-04-11
**Milestone:** v2.0 Universal Platform
**Core Value:** Engines + config, never features + clients

## v2.0 Requirements

### Universal Data Model (Phase 1)

- [ ] **JOB-01**: All booking queries route through a renamed `jobs` table with new type/pricingStrategy columns
- [ ] **JOB-02**: A `resources` table exists; every team member user has a corresponding resource row with `type = PERSON`
- [ ] **JOB-03**: An `addresses` table exists and is used by jobs (primaryAddressId), resources (homeAddressId), and customers
- [ ] **JOB-04**: A `customerContacts` table exists supporting multiple contacts per customer with role enum (PRIMARY, BILLING, SITE_CONTACT, GUARDIAN, EMERGENCY)
- [ ] **JOB-05**: `bookingAssignments` renamed to `jobAssignments`; `resourceId` populated from existing `staffId` data via backfill
- [ ] **JOB-06**: `staffAvailability` renamed to `resourceAvailability` with FK pointing to `resources.id`
- [ ] **JOB-07**: All 224 existing tests pass against the updated schema
- [ ] **JOB-08**: tsc --noEmit passes with 0 errors; next build passes

### Payment Split Engine (Phase 2)

- [ ] **PAY-01**: `splitRecipients`, `splitLookupTables`, and `splitRules` tables exist
- [ ] **PAY-02**: Split engine evaluates ordered rules and produces invoice line items (FIXED, PERCENTAGE, LOOKUP, REMAINDER, FORMULA types)
- [ ] **PAY-03**: All Cotswold-specific hardcode removed — `grep -r "cotswold|mileageCost" src/` returns 0 results
- [ ] **PAY-04**: Existing payment flows produce identical line items to before the migration
- [ ] **PAY-05**: Tests cover all 5 rule types with edge cases

### Notification Engine (Phase 3)

- [ ] **NOT-01**: `notificationTriggers` table exists; all existing hardcoded notification triggers migrated as seed rows
- [ ] **NOT-02**: Generic variable resolver handles dot-path expressions (`customer.email`, `job.assignments.*.resource.user.email`)
- [ ] **NOT-03**: Notification engine evaluates all active triggers on every Inngest event
- [ ] **NOT-04**: Zero notification send logic remains in module service files
- [ ] **NOT-05**: Adding a new trigger for a new tenant requires only a DB insert, no code change or deployment

### Route Jobs (Phase 4)

- [ ] **RTE-01**: `jobLocations` table exists; single-location jobs have exactly one row; route jobs have N ordered rows
- [ ] **RTE-02**: Route optimisation returns optimal stop order via Mapbox or Google Maps Directions API
- [ ] **RTE-03**: Fleet dispatch mode finds nearest available resource in real time
- [ ] **RTE-04**: Resources can track actual arrival and departure timestamps per stop
- [ ] **RTE-05**: Travel cost calculated per tenant routing config and appended to job invoice

### Recurring Contracts (Phase 5)

- [ ] **REC-01**: `serviceContracts` table exists with an rrule field for scheduling
- [ ] **REC-02**: Inngest scheduled function auto-generates jobs from active contracts on schedule
- [ ] **REC-03**: Invoices generated per `invoicingSchedule` config (per-job, weekly, monthly, on-completion)
- [ ] **REC-04**: Contract pause, resume, and cancel flows work correctly
- [ ] **REC-05**: Preferred resource assignment is honoured when the resource is available

### Classes & Memberships (Phase 6)

- [ ] **CLS-01**: `jobParticipants` table exists; 1:1 appointment jobs have exactly one PRIMARY participant row
- [ ] **CLS-02**: Class capacity is enforced at booking time; waitlist activates when capacity is full
- [ ] **CLS-03**: `customerMemberships` table tracks active memberships, plan, and usage count
- [ ] **CLS-04**: QR check-in flow works end-to-end (generate token, scan, mark attended)
- [ ] **CLS-05**: Membership discount is applied automatically when a member books a participant slot

### Field Service Billing (Phase 7)

- [ ] **FSB-01**: `jobTimeEntries` table tracks clock-in and clock-out per resource per job
- [ ] **FSB-02**: `jobMaterials` table tracks parts and consumables with unit cost
- [ ] **FSB-03**: Invoice auto-calculated on job completion using TIME_AND_MATERIALS formula: (hours × rate) + Σ(materials)
- [ ] **FSB-04**: `resourceCertifications` table blocks assignment if a required certification is expired
- [ ] **FSB-05**: Field engineer mobile-friendly view shows active job, time entry controls, and materials log

### Projects & CRM (Phase 8)

- [ ] **PRJ-01**: `projects` and `projectPhases` tables exist; phases contain jobs; jobs know their project
- [ ] **PRJ-02**: Milestone-based invoicing triggers automatically on phase completion
- [ ] **PRJ-03**: CRM pipeline tracks prospects from first contact through to signed contract
- [ ] **PRJ-04**: Time-and-materials billing rolls up from individual job entries to project-level invoice
- [ ] **PRJ-05**: Project dashboard shows phase progress, total spend, and remaining scope

## Future Requirements

### Admin UI
- **ADM-01**: Visual rule builder for split engine (drag-and-drop rule ordering)
- **ADM-02**: Notification trigger management UI (create/edit/test triggers without code)
- **ADM-03**: Contract template library (reusable rrule + billing configs per vertical)

### Platform
- **PLT-01**: Tenant onboarding wizard — configure vertical, enable modules, seed split/notification rules
- **PLT-02**: Vertical marketplace — pre-built config packs per industry (pest control, cleaning, tutoring)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cotswold UI parity | Existing clients on legacy codebase; no obligation to replicate |
| Mobile native apps | Web-first; PWA for field engineers is sufficient for v2.0 |
| AI/ML features | Out of v2.0 scope |
| Multi-region DB | Row-level isolation sufficient; sharding premature |
| Real-time collaborative editing | No requirement identified |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| JOB-01 | Phase 1 | Pending |
| JOB-02 | Phase 1 | Pending |
| JOB-03 | Phase 1 | Pending |
| JOB-04 | Phase 1 | Pending |
| JOB-05 | Phase 1 | Pending |
| JOB-06 | Phase 1 | Pending |
| JOB-07 | Phase 1 | Pending |
| JOB-08 | Phase 1 | Pending |
| PAY-01 | Phase 2 | Pending |
| PAY-02 | Phase 2 | Pending |
| PAY-03 | Phase 2 | Pending |
| PAY-04 | Phase 2 | Pending |
| PAY-05 | Phase 2 | Pending |
| NOT-01 | Phase 3 | Pending |
| NOT-02 | Phase 3 | Pending |
| NOT-03 | Phase 3 | Pending |
| NOT-04 | Phase 3 | Pending |
| NOT-05 | Phase 3 | Pending |
| RTE-01 | Phase 4 | Pending |
| RTE-02 | Phase 4 | Pending |
| RTE-03 | Phase 4 | Pending |
| RTE-04 | Phase 4 | Pending |
| RTE-05 | Phase 4 | Pending |
| REC-01 | Phase 5 | Pending |
| REC-02 | Phase 5 | Pending |
| REC-03 | Phase 5 | Pending |
| REC-04 | Phase 5 | Pending |
| REC-05 | Phase 5 | Pending |
| CLS-01 | Phase 6 | Pending |
| CLS-02 | Phase 6 | Pending |
| CLS-03 | Phase 6 | Pending |
| CLS-04 | Phase 6 | Pending |
| CLS-05 | Phase 6 | Pending |
| FSB-01 | Phase 7 | Pending |
| FSB-02 | Phase 7 | Pending |
| FSB-03 | Phase 7 | Pending |
| FSB-04 | Phase 7 | Pending |
| FSB-05 | Phase 7 | Pending |
| PRJ-01 | Phase 8 | Pending |
| PRJ-02 | Phase 8 | Pending |
| PRJ-03 | Phase 8 | Pending |
| PRJ-04 | Phase 8 | Pending |
| PRJ-05 | Phase 8 | Pending |

**Coverage:**
- v2.0 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after milestone v2.0 initialization*
