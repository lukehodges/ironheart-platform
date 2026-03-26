# Ironheart: Unified Migration & SaaS Strategy

**Date:** 2026-03-25
**Sources:** Gap Analysis, Module Strategy, SaaS Readiness Audit, Platform Admin Audit

---

## The Verdict

**Migrate. The refactor is the right foundation.** But the refactor is currently a blank scaffold — zero modules built. So this isn't a migration in the traditional sense. It's "build the refactor properly, using the old system's proven business logic as source material, while filling the massive SaaS gaps."

The tech debt of keeping the legacy system and rebuilding per client is definitively worse than the tech debt of completing the refactor. Here's why:

1. **Legacy is single-tenant, party-booking-hardcoded.** Every new client would require forking or heavy customisation.
2. **Refactor architecture is correct** — module registry, Inngest events, Drizzle, WorkOS, per-tenant module gating. The design is right, it just needs building.
3. **The compounding pitch only works on the refactor.** Your slide 9 claim ("every client makes the platform smarter") requires module isolation, event-driven communication, and per-tenant activation. Legacy can't do any of that.

---

## What We Found (Summary of 4 Audits)

### 1. Gap Analysis (Old vs New)

The refactor has **zero implemented features**. Every functional area needs building:

**Port directly (proven logic, copy with minor refactoring):**
- Booking lifecycle + status machine (45+ fields, 10 statuses)
- Slot locking + reservation timer (RESERVED → CONFIRMED with Inngest delayed expiry)
- Travel time calculation (Mapbox Directions + postcodes.io geocoding)
- Staff availability + scheduling algorithms
- Google Calendar 2-way sync (OAuth PKCE, push, pull, webhooks)
- Notification triggers + template variable builder
- RBAC permission engine
- Customer, Service, Venue, Review, Forms CRUD

**Skip entirely (overengineered or replaced by better patterns):**
- Visual workflow builder (React Flow DAG editor, ~3000 LOC, never used in production → Inngest replaces it)
- Message builder / Handlebars template engine (simple string replacement is sufficient)
- Circuit breaker (opossum) → Inngest retry policies replace this
- Custom JWT system → WorkOS handles auth
- Leaflet maps → Mapbox only
- In-process event bus → Inngest events

**Rebuild differently:**
- Approval module: currently booking-specific, needs to become entity-agnostic for the "multi-department" pitch
- Portal: currently party-only, needs industry templates (medical, salon, generic)
- Workflow: in-process EventEmitter → Inngest-backed, survives cold starts

### 2. Module Strategy (Pitch Deck Alignment)

**Module maturity in the refactor:**

| Rating | Modules |
|--------|---------|
| Production-ready to port | booking, scheduling, customer, review, services, venues |
| Functional but incomplete | auth, tenant, team, notification, calendar-sync, workflow, approval, portal, forms, import |
| Scaffolding only | payments, pipeline, analytics, audit, integrations |
| Missing entirely | **ai-agent**, outreach, compliance, **internal-support**, **operational-tooling** |

**Critical pitch deck gaps:**
- The AI agent ("live tool execution and streaming") has zero code anywhere — it's a Demo 02 headline feature
- "Approval Workflows" (expansion slide) requires redesigning from booking-specific to general-purpose
- "Internal Support" and "Operational Tooling" (expansion slides) don't exist at all

**Universal module stack (what every client gets):**

| Tier | Modules | Always On? |
|------|---------|------------|
| **1 - Core Platform** | auth, tenant, team, audit, notification | Yes |
| **2 - Operations Foundation** | customer, dashboard, workflow, analytics, integrations | Default on |
| **3 - Vertical-Specific** | booking, scheduling, services, venues, portal, approval, forms, review, calendar-sync, payments, import, pipeline | Per engagement |
| **4 - Advanced/Premium** | ai-agent, compliance, outreach, internal-support, operational-tooling | Explicit activation |

### 3. SaaS Readiness Audit

**Brutal findings — 10 critical gaps:**

| Gap | Status | Impact |
|-----|--------|--------|
| No signup page | MISSING | Prospects hit a login wall |
| No post-signup tenant provisioning | MISSING | Can't self-serve |
| No team member invite flow | MISSING | Single-user tool |
| No Stripe subscriptions/checkout | MISSING | Can't charge money |
| Upgrade button shows "coming soon" toast | HALF-BUILT | Literally a placeholder |
| Trial expiry never enforced | MISSING | Free forever |
| Plan limits never checked at runtime | MISSING | Unlimited on any plan |
| No public pricing page | MISSING | No acquisition funnel |
| Branding settings stored but never applied | HALF-BUILT | Settings are decoration |
| Tenant suspension not enforced | MISSING | Suspended tenants still work |

**What IS solid (don't touch):**
- Multi-tenant data isolation (row-level tenantId everywhere)
- RBAC system (full roles/permissions/userRoles)
- Module system (registry, gating, per-tenant toggle, Redis cache)
- WorkOS AuthKit integration
- Platform admin impersonation with audit trail
- Rate limiting (Upstash, IP + user-based)
- Stripe webhook infrastructure (verified signatures → Inngest)
- Developer webhooks + API key infrastructure

### 4. Platform Admin Audit

**Current state:** 4 pages (dashboard, tenant list, tenant detail, signup queue). That's it.

**What's completely missing:**

| Category | Gap Count |
|----------|-----------|
| Tenant management (delete, create directly, trial mgmt, notes, tags, audit viewer) | 11 items |
| Financial operations (revenue dashboard, billing, invoices, plan editor) | 8 items — entire section absent |
| System health (sessions, errors, Inngest jobs, storage, feature flags) | 8 items — entire section absent |
| Support operations (audit browser, announcements, data export) | 5 items |
| Module management (marketplace, create/edit, global disable, health) | 5 items |
| Growth analytics (signup funnel, activation, adoption, churn) | 8 items |
| Platform settings page | STUB — sidebar link exists, page is 404 |

---

## The Plan: Build Sequence

Based on all four audits, here's the phased approach ordered by what unblocks revenue and client deployment.

### Phase 0: SaaS Foundation (before anything else)
**Goal:** People can sign up, pay, and get a working tenant.

1. `/signup` public page → creates `SignupRequest`
2. `/pricing` public page showing plans
3. WorkOS callback → auto-provision tenant + owner user on first login
4. Onboarding wizard (5 steps: business info, invite team, select modules, configure basics, done)
5. Team member invite flow (generate token → email → WorkOS register → create user in tenant)
6. Stripe Billing: plans → products, checkout session, webhook → update `tenants.plan`
7. Stripe Customer Portal for self-serve billing management
8. Trial enforcement: Inngest daily job checks `trialEndsAt`, suspends tenant
9. Plan limit enforcement in tRPC procedures (`maxBookingsMonth`, `maxUsers`, etc.)
10. Tenant suspension enforcement in `tenantProcedure` middleware

### Phase 1: Port Core Booking Stack
**Goal:** Healthcare clinic vertical works on the refactor.

1. Port booking module (status machine, dual mode: slot-based + calendar-based)
2. Port scheduling module (availability, travel time, assignment health, recommendations)
3. Port slot management (CRUD, bulk create, recurring patterns)
4. Port slot locking → Inngest delayed expiry (replace cron)
5. Port customer module (CRUD, notes, GDPR, booking history)
6. Port service + add-on modules
7. Port venue module

### Phase 2: Async Side Effects
**Goal:** Bookings trigger real-world actions automatically.

1. Port notification module (Resend email + Twilio SMS)
2. Port messaging triggers + template variable builder
3. Port Google Calendar 2-way sync (OAuth PKCE, push, pull, watch channels → Inngest)
4. Build module manifests with event contracts (what each module publishes/consumes)
5. Implement Inngest conditional handler pattern (check module-enabled before executing)

### Phase 3: Portal + Admin UI
**Goal:** End-to-end booking flow works for a client's customers.

1. Port portal config API (getPortalConfig, getPortalBookingOptions, getAvailableTimeSlotsWithTravel)
2. Build industry-agnostic portal template system (not party-only)
3. Port reservation timer component
4. Build admin pages: dashboard, bookings list, calendar views, new booking wizard
5. Port approval module (keep booking-specific for now, redesign later)
6. Build settings pages: general, branding (with actual application), integrations

### Phase 4: Platform Admin Expansion
**Goal:** You can operate the SaaS without touching the database.

1. Revenue dashboard (MRR, churn, plan distribution — query Stripe)
2. Tenant lifecycle (create directly, delete with soft-purge, trial management)
3. Module marketplace page (all modules, usage stats, global enable/disable)
4. Audit log browser (cross-tenant search)
5. Feature flag management UI (schema exists, zero UI)
6. Platform settings page (fix the 404)
7. Signup funnel analytics + tenant activation tracking
8. Impersonation with server-side audit (replace cookie-only approach)

### Phase 5: Compounding Infrastructure
**Goal:** The module system actually compounds across clients.

1. Redesign approval module: entity-agnostic (any module can request approval, not just booking)
2. `BusinessType` enum formalization — typed, compiler-enforced across all modules
3. Module `configForBusinessType()` pattern — industry-aware defaults on activation
4. Build AI agent module (Vercel AI SDK, streaming, dynamic tool registration per enabled modules)
5. Build forms module with typed field definitions (discriminated union, not JSON blob)
6. Build review automation (Inngest-triggered post-completion)

### Phase 6: Expansion Modules
**Goal:** Deliver on pitch deck expansion promises.

1. Internal Support module (ticket routing, queues, auto-assignment via workflow)
2. Operational Tooling module (generic Resource → ResourceSlot → ResourceBooking)
3. Pipeline module (CRM-style deals pipeline, not just project tracker)
4. Outreach module (email sequences for sales process)

---

## Key Architectural Decisions

These decisions must be made before Phase 1:

### 1. Module Manifests Are Non-Negotiable
Every module must declare: slug, tier, dependencies, published events, consumed events, permissions, compatible business types. Without this, "compounding" is marketing.

```typescript
export const bookingManifest = {
  slug: 'booking',
  tier: 3,
  dependencies: ['customer', 'scheduling', 'services'],
  publishedEvents: ['booking/created', 'booking/confirmed', 'booking/cancelled'],
  consumedEvents: ['slot/reserved', 'slot/released'],
  permissions: ['bookings:read', 'bookings:create', 'bookings:update', 'bookings:delete'],
  compatibleBusinessTypes: ['*'],
}
```

### 2. Cross-Module Communication = Inngest Only
No direct service imports between modules. Booking emits `booking/created`, notification module listens. Calendar-sync module listens. Workflow module listens. If a module isn't enabled for a tenant, its Inngest handler checks and returns early.

### 3. Plan-to-Module Mapping Table
Create a `PlanModuleAccess` table: which plan includes which modules. When a tenant changes plan, their module access updates automatically. This is the monetization backbone.

### 4. Approval Must Be Entity-Agnostic From Day 1 (Phase 5)
Don't port the booking-specific approval and then redesign. When you get to approval, build it right: `ApprovalTemplate` → `ApprovalRequest` → `ApprovalStep` with `entityType + entityId` pattern.

---

## Migration Priorities (What to Do First)

If you can only do one thing this week:

**Build Phase 0, items 1-5 (signup + onboarding).** Nothing else matters until someone can sign up and get a working tenant without you manually provisioning it. The Stripe billing can come right after, but the signup flow is the absolute minimum viable SaaS.

Then port booking + scheduling (Phase 1) so you can point the existing healthcare client at the refactor as proof it works.

---

## Files in This Analysis

All reports saved to `/Users/lukehodges/Documents/ironheart-refactor/.planning/`:

- `UNIFIED_MIGRATION_PLAN.md` — this document (synthesis)
- `GAP_ANALYSIS.md` — feature-by-feature old vs new comparison
- `MODULE_STRATEGY.md` — module maturity, tiers, dependency map, missing modules
- `SAAS_READINESS_AUDIT.md` — self-serve and monetization gaps
- `PLATFORM_ADMIN_AUDIT.md` — platform admin capabilities vs needs

*Analysis completed 2026-03-25 by 4 parallel agents analyzing both codebases, pitch deck, and architecture docs.*
