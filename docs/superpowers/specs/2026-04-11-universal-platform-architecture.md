# Universal Platform Architecture
**Date:** 2026-04-11
**Status:** Approved
**Scope:** Master architecture specification — references all phase specs

---

## Problem Statement

The existing Ironheart codebase (old and new refactor) was built around a single client type: party entertainment bookings. Twelve places in the codebase have Cotswold-specific logic hardcoded. Every new client has required code changes. This does not scale.

The goal is a platform that handles any service business — spa, waste disposal, mobile engineers, fitness studio, consultant, equipment rental, emergency dispatch — without writing new code per client. New clients are a configuration exercise, not a development sprint.

---

## Core Design Principle

**Engines + Config, never Features + Clients.**

Every piece of client-specific logic must be expressible as a row in a database table. If you find yourself writing `if tenant.businessType === 'x'` in engine code, stop — that's a config row, not a code path.

---

## The 6 Job Patterns

Everything every client needs maps to one or more of these:

| Pattern | Description | Examples |
|---------|-------------|---------|
| **1:1 Appointment** | One customer, one resource, one slot | Spa, therapist, consultant, dentist |
| **1:Many Class** | One resource, N customers, one slot | Yoga, fitness, cookery school, workshop |
| **Team Job** | Multiple resources, one customer/job | Removal crew, installation team, events |
| **Route Job** | One resource, N ordered locations | Waste disposal, delivery driver, district nurse |
| **Recurring** | Any pattern, auto-generated on schedule | Weekly cleaner, monthly maintenance, retainer |
| **Project** | Multi-phase, milestone-based | Consultant, architect, IT project, agency |

---

## The 5 Universal Engines

These are the platform's core capabilities. They are configured per tenant, never modified per client.

### 1. Scheduling Engine
Given a job type, service, and time window — finds available resources, scores by fit, returns ranked list.
Config: match strategy (first-available | nearest | skill-match | round-robin | manual), travel padding, buffer time, certification requirements per service.

### 2. Payment Split Engine
Given a completed job — evaluates ordered split rules, generates invoice line items per recipient.
Rule types: FIXED (flat fee), PERCENTAGE (% of total), LOOKUP (table-driven, e.g. mileage time → cost), REMAINDER (whatever's left), FORMULA (hours × rate + materials).

### 3. Notification Engine
Listens to every Inngest event, evaluates trigger rules stored in the database, resolves recipients and template variables, dispatches across channels.
Channels: email, SMS, push, webhook, in-app. All trigger rules and templates live in the DB — zero notification logic in code.

### 4. Routing Engine
Three modes: point-to-point (travel time to job), route optimisation (best order for N stops), fleet dispatch (nearest available resource in real time).
Config per tenant: routing mode, cost strategy (time-based | distance-based | lookup table | none), provider (Mapbox | Google Maps), padding minutes between stops.

### 5. Access Control Engine
Every query is scoped by the requesting user's role.
Universal roles: platform_admin, owner, manager, staff, customer.
Staff see only their own jobs and their own earnings. Managers see team data. Owners see everything.

---

## Universal Data Model Summary

See Phase A spec for full schema. Key changes from current codebase:

| Current | Universal | Reason |
|---------|-----------|--------|
| `bookings` table | `jobs` table | "booking" implies a single appointment; "job" covers all 6 patterns |
| `staffId` on bookings | `resources` table + `jobAssignments` | Staff are one type of resource; rooms, vehicles, equipment are others |
| `locationAddress` JSONB | `addresses` table | Shared, geocoded, reusable across jobs/resources/customers |
| Cotswold split code | `splitRules` rows | Client-specific payment logic becomes configuration |
| Hardcoded notification triggers | `notificationTriggers` rows | Every send rule lives in the DB |

---

## What Stays the Same

The following are already correct and require no architectural changes:
- Inngest for async orchestration (event-driven, durable)
- tRPC 11 + Zod for type-safe API
- Drizzle ORM with postgres.js
- WorkOS AuthKit for authentication
- Module structure (each module owns its router, service, repository, events, tests)
- Multi-tenant row-level isolation (tenantId on every query)
- RBAC permission system (roles, permissions, userRoles)
- Module gating via `tenantModules`

---

## Phase Specs (Build Order)

| Phase | Spec | Unlocks |
|-------|------|---------|
| **A** | [Phase A — Universal Data Model](2026-04-11-phase-a-universal-data-model.md) | Foundation for all other phases |
| **B** | [Phase B — Payment Split Engine](2026-04-11-phase-b-payment-split-engine.md) | Any client with commission/split payments |
| **C** | [Phase C — Notification Engine](2026-04-11-phase-c-notification-engine.md) | Any client comms without code changes |
| **D** | [Phase D — Route Jobs](2026-04-11-phase-d-route-jobs.md) | Waste disposal, logistics, district nurse |
| **E** | [Phase E — Recurring Contracts](2026-04-11-phase-e-recurring-contracts.md) | Cleaners, maintenance, retainers, care plans |
| **F** | [Phase F — Classes & Memberships](2026-04-11-phase-f-classes-memberships.md) | Fitness studios, education, events |
| **G** | [Phase G — Field Service Billing](2026-04-11-phase-g-field-service-billing.md) | Plumbers, engineers, IT MSP |
| **H** | [Phase H — Projects & CRM](2026-04-11-phase-h-projects-crm.md) | Consultant, architect, agency |

Phases A, B, C must be completed first and in order. Phases D–H are independent of each other and can be parallelised.

---

## Industry Coverage After All Phases

| Industry | Patterns Used |
|----------|--------------|
| Spa / Salon | 1:1, Recurring |
| Children's Entertainment | 1:1 |
| Healthcare / Clinic | 1:1, Recurring |
| Fitness / Yoga Studio | 1:1, Class, Recurring |
| Waste Disposal | Team, Route, Recurring |
| Mobile Engineers / Plumbers | 1:1, Team, Route, Recurring |
| Home Services (Cleaning) | 1:1, Recurring |
| Venue / Space Rental | 1:1, Class, Recurring |
| Consultant / Agency | 1:1, Recurring, Project |
| Emergency Dispatch | 1:1, Team |
| Equipment / Asset Rental | 1:1, Recurring |
| Care / Domiciliary | Route, Recurring |

---

## The Rule for Future Development

Before writing any new feature:
1. Does it belong in an engine? → Add a config option, not a code path
2. Does it introduce a client-specific check? → Make it a table row
3. Does it duplicate logic from another module? → Extract to a shared engine function

If a future client asks for something genuinely new, the question to answer is: "which engine needs a new rule type?" — not "which module do I add client X logic to?"
