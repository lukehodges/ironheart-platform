# Ironheart Refactor — CTO Technical Review

**Reviewer:** CTO (Claude Sonnet 4.5)
**Date:** 2026-02-19
**Documents reviewed:** PROJECT.md, PHASE0–PHASE4 and PHASE6 plans, ARCHITECTURE_REDESIGN_BRIEF.md
**Status of PHASE5_PLAN.md:** Does not exist at time of review.

---

## 1. Executive Summary

The refactor plan represents a competent, well-structured modernisation of a working SaaS booking platform. The architectural direction — modular monolith with event-driven side effects via Inngest, replacing six Vercel crons, and swapping Prisma for Drizzle — is technically sound and appropriate for the problem space. The phase plans are executable and granular, which is genuinely rare at this stage.

However, the plan has material gaps that would cause serious problems in production. It was authored thinking about a known client (Cotswold party bookings) and only subsequently updated with a generic platform vision. That revision is superficial: the portal module, notification templates, and tenant configuration schema do not demonstrate what "generic" actually means in practice. It is currently a booking platform with a coat of "generic" paint, not a white-label engine.

The five highest-risk issues are:

1. **Drizzle introspection from a live shared database is under-specified and dangerous.** A single incorrect `drizzle-kit push` command will destructively alter the schema used by a production system. The plan acknowledges this risk in passing but does not provide a migration fence strong enough to prevent it.

2. **Phase 5 does not exist.** The plan references Phase 5 extensively (portal, tenant, workflow, customer, review, forms, staff modules) but the plan document was never written. This is not a gap — it is the majority of the remaining work, hand-waved away.

3. **WorkOS cutover with existing users has no tested migration path.** The `workosUserId` backfill strategy (email lookup on first login) is fragile: users with email-only accounts and no `tenantId` match will receive UNAUTHORIZED errors silently with no recovery path.

4. **Distributed locking is sequenced into Phase 6 but is architecturally required in Phase 1.** A RESERVED booking creation under concurrent load will overbooking slots between Phase 1 and Phase 6 — a window covering the majority of the build.

5. **The generic platform thesis is asserted but not designed.** The tenant configuration schema, the portal module's industry vertical adaptability, and the notification template system are described in functional terms but never specified structurally. A corporate CTO will ask "what does a new vertical require?" and the plan cannot answer.

Overall maturity score: **6/10**. The execution plans for Phases 0–4 are production-quality. Phase 5 and the cross-cutting concerns (billing, onboarding, data export, API versioning) do not exist.

---

## 2. What the Plan Gets Right

**Event catalog is correct and complete upfront.** Defining all `IronheartEvents` in `src/shared/inngest.ts` before any module exists is the right decision. TypeScript will catch handler mismatches at author time, not at runtime.

**The `cancelOn` pattern for reservation expiry is well-designed.** Using `cancelOn: [{ event: 'booking/confirmed', match: 'data.bookingId' }]` eliminates the race condition that plagued the legacy 1-minute polling cron. This is a genuine architectural improvement, not a cosmetic one.

**The stub-and-fill pattern is explicit and documented.** Phases 2 and 4 leave calendar cron handlers as logged stubs to be filled. This is the right trade-off: it lets you delete `vercel.json` crons safely while deferring the complex Google API work. The pattern is documented clearly enough that a developer cannot accidentally ship a no-op to production without seeing the comment.

**Tenant isolation is enforced at the repository layer, not the router layer.** Every repository method takes `tenantId` as its first argument. This is the correct placement — it makes it structurally difficult to accidentally omit the filter.

**Permission loading is fresh-per-request, not baked into JWT.** The legacy system baked permissions into the JWT at login time, meaning role changes took up to 7 days to propagate. The new system loads `User → UserRole → Role → Permission` in `tenantProcedure`. This is slower but eliminates an entire class of stale-permission bugs.

**`platformAdminProcedure` is scaffolded in Phase 0.** Most plans forget platform-level admin exists and bolt it on awkwardly later. Having the stub in Phase 0 establishes the correct import path from day one.

**Error hierarchy is clean.** `NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError` with `toTRPCError()` conversion is the right pattern. Services throw domain errors, routers convert them.

**The instruction "do not modify the legacy codebase" is explicit and repeated.** This is not obvious. Without this constraint, developers routinely introduce silent regressions in the production system while building the refactor.

---

## 3. Critical Gaps (Must Fix Before Phase 0)

### 3.1 Drizzle Introspection Against a Shared Live Database Has No Safety Fence

**Issue:** PHASE0-T06 instructs running `drizzle-kit introspect` against the live PostgreSQL database — the same database serving the legacy production codebase. The plan explicitly warns "do NOT run `drizzle-kit push` or `drizzle-kit migrate`." But this warning appears once in a single task comment. There is no CI gate, no read-only database credential, and no documented procedure for when a developer accidentally runs `push`.

The `drizzle-kit generate --name=baseline` step (also PHASE0-T06) creates a baseline migration. Subsequent `drizzle-kit migrate` calls in Phase 3 (for `workosUserId`) and Phase 6 (TypeScript error fixes) will run against the shared production database. If the baseline migration diverges from the actual live schema — which can happen if someone applies a Prisma migration to the legacy codebase between Phase 0 and Phase 3 — `drizzle-kit migrate` will compute an incorrect diff and potentially issue destructive SQL.

**Impact:** A developer runs `npx drizzle-kit push` instead of `npx drizzle-kit migrate` by mistake. Or the baseline diverges because the legacy team applies a Prisma migration. Either scenario drops or alters production tables.

**Fix:**
1. Create a dedicated read-write database user for the new codebase with permission restricted to the new tables it creates. Do NOT use the same credentials as the legacy Prisma connection.
2. Add a CI check: `drizzle-kit check` in a pre-commit hook that validates the schema diff does not contain destructive operations (DROP TABLE, DROP COLUMN, TRUNCATE).
3. Document an explicit "schema co-ownership protocol": any schema change made to the legacy Prisma codebase must be replicated manually to the Drizzle schema before any Drizzle migration is run.
4. Run all `drizzle-kit migrate` commands against a staging database first, verify, then apply to production separately.

### 3.2 Phase 5 Does Not Exist

**Issue:** The plan references Phase 5 in every subsequent phase as the destination for portal, workflow, tenant, customer, review, forms, and staff modules. PHASE0 mentions "12 module subdirectories," 7 of which are explicitly deferred to Phase 5. PHASE6 presupposes Phase 5 is complete. But `PHASE5_PLAN.md` does not exist.

The modules deferred to Phase 5 collectively include:
- The entire customer-facing portal (beyond the booking flow built in Phase 1)
- The workflow/automation engine
- Tenant configuration and onboarding
- Customer profile management
- Review and feedback collection
- Intake forms
- Staff management (team member profiles, availability windows)

This is not a minor gap. This is the majority of the admin interface, the workflow differentiation, and the configuration surface that makes the platform "generic."

**Impact:** The plan cannot be presented to a corporate CTO as a complete roadmap. It ends at Phase 6 with a platform that handles bookings and calendar sync but has no tenant onboarding, no staff profiles, no intake forms, and no workflow engine. A production deployment against Phase 6 only is a regression from the legacy codebase.

**Fix:** Write PHASE5_PLAN.md before Phase 0 execution begins. It must specify which legacy routers map to which new module files, define the module file structure for all 7 modules, and establish success criteria. Use the same format as Phases 0–4.

### 3.3 WorkOS Migration Lacks a Rollback Path and Has a Silent Failure Mode

**Issue:** Phase 3's `tenantProcedure` uses `workosUserId` lookup, falling back to email. If the email fallback finds no match — because the user's email in WorkOS doesn't match any record in the Drizzle `users` table, or because the user belongs to a different tenant — the error thrown is:

```
UNAUTHORIZED: No application user record found for this WorkOS identity.
```

This error is thrown from within `tenantProcedure`, which is a middleware. Every authenticated route then returns `401 UNAUTHORIZED` to the user with no recovery path. The user cannot sign out, cannot change tenant, and cannot access the sign-in page (the sign-in page redirects already-authenticated WorkOS users back to the app). The user is locked out.

There is no documented procedure for migrating existing users (backfilling their WorkOS IDs before the cutover), and no rollback plan if WorkOS authentication fails at scale on go-live day.

**Impact:** On cutover, any user whose email in WorkOS doesn't exactly match (case, subdomain, alias) their Drizzle record is locked out permanently until manual intervention.

**Fix:**
1. Pre-migration script: Before Phase 3 go-live, run a script that creates WorkOS users for every active Drizzle user and backfills `workosUserId` in the database. This eliminates the email fallback entirely from day one.
2. Add a graceful degradation: if `tenantProcedure` fails to find a Drizzle user, redirect to a "contact your administrator" page rather than returning a bare UNAUTHORIZED error.
3. Document a rollback plan: environment variable `AUTH_MODE=legacy` that restores the NextAuth middleware, with a feature flag in `createContext()` to switch between WorkOS and NextAuth session retrieval.

### 3.4 The Booking Events.ts File in Phase 0 Uses Prisma Syntax, Not Drizzle

**Issue:** PHASE0-T17 writes `booking.events.ts` as the Inngest proof-of-concept. The file contains:

```typescript
await db.$transaction(async (tx) => {
  await tx.booking.update(...)
  await tx.bookingStatusHistory.create(...)
  await tx.availableSlot.update(...)
  await tx.bookingAssignment.deleteMany(...)
})
```

This is Prisma client syntax. `db` in the new codebase is a Drizzle client (from `src/shared/db.ts`). Drizzle uses `db.transaction()`, not `db.$transaction()`, and uses `update(table).set({}).where()` not `table.update({ where, data })`.

The contradiction is that Phase 0 also introspects the schema and creates a Drizzle client, then immediately writes Inngest handlers using Prisma syntax.

**Impact:** The Phase 0 Inngest POC will fail TypeScript compilation because `db.$transaction` doesn't exist on the Drizzle client. The "Phase 0 is complete" success criteria includes `tsc --noEmit` passing with 0 errors, so this is a hard blocker.

**Fix:** Rewrite `booking.events.ts` using Drizzle transaction syntax:
```typescript
await db.transaction(async (tx) => {
  await tx.update(bookings).set({ status: 'RELEASED', ... }).where(eq(bookings.id, bookingId))
  await tx.insert(bookingStatusHistory).values({ ... })
  ...
})
```

Also, PHASE1-T04's repository file uses `db.booking.findUnique` — this is also Prisma syntax. The repository pattern throughout Phase 1 must use `db.query.*` (Drizzle relational queries) or `db.select().from().*` (Drizzle core).

### 3.5 No Strategy for Concurrent Schema Ownership

**Issue:** The new codebase (Drizzle) and the legacy codebase (Prisma) share the same PostgreSQL database. Both ORMs have their own migration tracking:
- Prisma uses the `_prisma_migrations` table
- Drizzle uses a `drizzle/__migrations` table (or custom, per `drizzle.config.ts`)

There is no protocol for when changes must be made to the legacy codebase's schema. The legacy codebase is in active production and will continue to receive schema migrations (e.g., the `mileage_cost` and `additional_charges` migrations visible in the git status of the legacy project). Each such migration updates the live schema without updating the Drizzle schema in the refactor project.

**Impact:** After any Prisma migration in the legacy codebase, the Drizzle schema in the refactor is stale. Drizzle will either fail silently (columns exist in DB but not in schema) or, if `drizzle-kit push` is run, attempt to "sync" the schema by dropping columns the legacy migration added.

**Fix:**
1. Establish a formal schema co-ownership protocol: all Prisma migrations in the legacy codebase must be replicated as Drizzle schema updates within 24 hours.
2. Add a schema drift detection step to CI: run `drizzle-kit check` and fail if the live schema differs from the Drizzle schema.
3. Designate the legacy Prisma schema as the master; the Drizzle schema is a read-only reflection until the legacy codebase is decommissioned.

---

## 4. Architectural Risks (Important but Not Immediately Blocking)

### 4.1 The Shared Inngest Event Catalog Creates a Schema Governance Problem

**Issue:** All Inngest events are defined in `src/shared/inngest.ts`. This file is the single source of truth for every event that can be emitted or handled in the system. Adding a new event requires editing this shared file, which may be touched by any module developer.

In a modular monolith, the point of module boundaries is to let teams work independently. But any change to `inngest.ts` affects all modules simultaneously. A developer adding a new event to Phase 5's workflow module must edit the same file as the booking module developer. There is no module-level event ownership.

**Impact:** As the codebase grows to 20+ events and 6+ modules, `inngest.ts` becomes a merge conflict hotspot. It also means that an event schema change (e.g., adding a required field to `booking/confirmed`) breaks all handlers simultaneously, not just the affected module's.

**Fix:** Keep the typed catalog in `inngest.ts` but establish a module-ownership rule: each module defines its own event types in `module.events.ts` and re-exports them into `inngest.ts`. A lint rule enforces that no module imports event types from another module's events file directly — they go through the shared catalog.

### 4.2 Booking Slot Capacity Decrement Is Not Transactional Across the Booking/Scheduling Module Boundary

**Issue:** Phase 1 establishes that `booking.repository` owns slot capacity decrement (decrement on booking create, increment on cancel/release). Phase 2 establishes that `scheduling.repository` owns slot CRUD (create, update, delete). Both operate on the same `AvailableSlot` table.

The decrement in `booking.repository.decrementSlotCapacity()` is described as using a WHERE condition to check capacity before decrementing. But without a distributed lock (added only in Phase 6), two concurrent requests can both read `bookedCount < capacity`, both pass the check, and both execute the UPDATE, resulting in overbooking.

The plan acknowledges this in Phase 6's architectural notes. The problem is the window: from Phase 1 through Phase 5, every production RESERVED booking creation is vulnerable to this race condition.

**Impact:** Double-bookings in production during the Phase 1–5 window if any concurrency exists on the portal. For low-traffic scenarios this is unlikely; for a tenant with a popular time slot being released, it is near-certain.

**Fix:** Move the distributed lock acquisition from Phase 6 into Phase 1's `BookingService.createBooking()`. The `redis.ts` client is available from Phase 0. A simple `SET lock:slot:{slotId} 1 NX PX 5000` pattern can be implemented in Phase 1 without needing the full `acquireDistributedLock` wrapper. Phase 6 can refine the implementation.

### 4.3 tRPC Type Leak Risk Between Modules

**Issue:** Phase 1's portal router (`portal.router.ts`) and slot router (`slot.router.ts`) are described as sub-routers within the booking module, but they handle portal configuration and public slot queries that logically belong to different modules. The Phase 5 portal module, when written, will presumably need to import types or schemas from the booking module.

The architectural rule states "modules communicate via events — no direct cross-module imports." But some cross-module type sharing is unavoidable: the portal module needs `BookingRecord`, `SlotRecord`, and `BookingStatus` from the booking module. Without a clear policy, developers will simply import from wherever works.

**Impact:** Module boundaries erode over time. Eventually every module imports from every other module, the "modular monolith" becomes a monolith with extra directories, and the main stated benefit (independent reasoning about modules) is lost.

**Fix:** Define and document a `shared/domain.types.ts` file (or per-entity files in `shared/`) for types that cross module boundaries. Establish a lint rule: modules may only import from `@/shared/` and `@/modules/module-name/` (their own module). Cross-module imports at any other path fail CI.

### 4.4 Drizzle Schema Co-location Strategy Is Undefined

**Issue:** The plan places the entire Drizzle schema in a single `src/shared/db/schema.ts` file generated from introspection of a 42-table database. This file will be 1000+ lines and will cover tables owned by all 12 modules.

As modules are built, each module's repository needs to import tables from this single file. There is no plan for splitting the schema by module ownership or for preventing a booking developer from accidentally modifying the `calendarSync` table definition.

**Impact:** A single schema file with 42 tables becomes unnavigable. Developers will not know which table belongs to which module. Schema modifications will create cross-module merge conflicts.

**Fix:** After introspection, split the schema into per-module files (e.g., `src/shared/db/schemas/booking.schema.ts`, `src/shared/db/schemas/scheduling.schema.ts`) and re-export them from a barrel `src/shared/db/schema.ts`. This is forward-compatible with the introspected result and creates module-aligned ownership.

### 4.5 Inngest Function Idempotency Is Assumed but Not Enforced

**Issue:** The plan relies on Inngest's `cancelOn` mechanism to prevent duplicate reservation releases, and on step key uniqueness to prevent duplicate reminder sends. But the Inngest documentation is clear: at-least-once delivery means handlers can fire more than once in failure scenarios (network partition, handler timeout, etc.).

No handler in the plan explicitly checks for idempotency before performing a state mutation. The `releaseExpiredReservation` handler checks `booking.status !== 'RESERVED'` before proceeding — this is good. But `sendBookingConfirmationEmail` and the reminder handlers in Phase 2 do not have a similar guard: they will send duplicate emails if Inngest retries after a partial success (e.g., email sent but step returned an error before marking complete).

**Impact:** Users receive duplicate confirmation emails, duplicate SMS reminders, and potentially duplicate calendar events on Inngest retry.

**Fix:** Add idempotency checks to all state-mutating Inngest handlers. For email/SMS handlers specifically, check a `SentMessage` or `NotificationLog` table before sending, and insert a record after sending. For calendar sync handlers, check if a Google Calendar event ID already exists before creating a new one.

### 4.6 Rate Limiting Is Per-IP, Not Per-Tenant

**Issue:** Phase 6 adds rate limiting with key `rate:{ip}:{procedure}`. This is per-IP rate limiting.

For multi-tenant SaaS, IP-based rate limiting has a known failure mode: a large corporate tenant (e.g., an enterprise customer whose staff all book through a corporate proxy) will share a single IP. Their legitimate traffic — 30+ booking requests per minute across their employee base — will hit the per-IP rate limit and start receiving `TOO_MANY_REQUESTS` errors.

Conversely, a bad actor using a residential IP rotator will never hit the limit.

**Impact:** Legitimate enterprise customers are rate-limited out of the service. Bad actors are not limited.

**Fix:** Implement layered rate limiting:
- Per-IP rate limit: 30 requests/minute (abuse protection, existing plan)
- Per-tenant rate limit: 500 requests/minute (enterprise protection)
- For authenticated procedures: use `rate:{userId}:{procedure}` instead of IP

### 4.7 WorkOS Free Tier Limits vs Projected Tenant Count

**Issue:** The plan does not mention WorkOS pricing or tier limits. WorkOS's free tier supports 1 million monthly active users at the time of writing — which appears generous. However, WorkOS AuthKit pricing for SSO (SAML, OIDC) is per-connection and can be significant for enterprise tenants ($125/connection/month for SAML). The plan mentions WorkOS organizations as an optional future feature; if enterprises require SSO, the cost structure changes materially.

**Impact:** The platform's per-tenant cost model changes significantly if any tenant requires SSO. A plan presented to an enterprise CTO without acknowledging this is incomplete.

**Fix:** Add a pricing section to the architecture documentation. Identify which WorkOS features are included in which tier, and what the cost trigger is for enterprise auth features.

---

## 5. Missing Modules / Features

### 5.1 Billing and Payments (No Phase Defined)

The plan contains no billing module, no Stripe integration, and no tenant subscription management. This is a SaaS platform — how do tenants pay for it? How is the platform monetised? The architecture brief mentions a cost estimate for infrastructure ($200–400/month) but is silent on how tenants are charged.

For presentation to a corporate CTO: the absence of a billing model is a red flag. It suggests the platform is not yet commercially viable as a standalone SaaS product.

**Belongs in:** A new Phase 7 or a billing section within Phase 5. Minimum viable: Stripe Billing integration for tenant subscription management, a `TenantSubscription` table, and metering logic.

### 5.2 Tenant Onboarding Flow (No Phase Defined)

How does a new tenant get set up? The plan describes multi-tenant isolation, subdomain routing, and tenant configuration, but there is no onboarding flow:
- No self-serve signup
- No tenant provisioning workflow
- No initial data seeding for a new tenant (default services, default roles, default notification templates)
- No guided setup for subdomain, branding, and portal configuration

**Belongs in:** Phase 5 (Tenant module). The plan defers the tenant module to Phase 5 without specifying what it contains.

### 5.3 Platform Super-Admin Portal (No Phase Defined)

The `platformAdminProcedure` is scaffolded in Phase 0 (gated by `PLATFORM_ADMIN_EMAILS` environment variable). But there is no plan for what platform admins can actually do:
- View all tenants and their health
- Suspend/activate tenants
- Impersonate a tenant for support
- View cross-tenant usage metrics
- Manage WorkOS users

Without a platform admin portal, the "SaaS platform" is operationally unmanageable.

**Belongs in:** Phase 5 (as part of the tenant module) or a dedicated Phase 7.

### 5.4 Data Export and GDPR Compliance (Missing)

No phase addresses:
- Right to erasure (GDPR Article 17): ability to delete or anonymise all data for a specific customer
- Right to data portability (GDPR Article 20): export all booking/customer data in a machine-readable format
- Consent management: how are customer consents for marketing emails and data processing recorded?

A UK-based mobile services platform (which is what Ironheart is, given the Cotswold origin) must comply with UK GDPR. The architecture brief does not mention GDPR at all.

**Belongs in:** Phase 5 (customer module) and Phase 6 (hardening). Should include a `GDPRExportRequest` model and an Inngest function to generate and email the export.

### 5.5 Audit Log (Missing)

No phase defines an audit trail. Who changed a booking? Who approved it? Who changed a staff member's permissions? Enterprise customers require audit logs for compliance.

The `bookingStatusHistory` model exists (migrated from legacy) and covers booking state changes. But there is no general-purpose audit log for other entity changes.

**Belongs in:** Phase 6 (hardening) or earlier. A generic `AuditLog` table with `(tenantId, entityType, entityId, action, changedById, diff, timestamp)` covers the most critical audit requirements.

### 5.6 API Versioning (Missing)

tRPC does not version by default. The plan makes no mention of API versioning strategy. As the platform grows to support third-party integrations (the architecture brief mentions API as a future user type), breaking API changes will affect external consumers.

**Belongs in:** Phase 6 or an explicit ADR (Architecture Decision Record) in the planning docs. Minimum viable: a `v1` namespace in the root router with a versioning policy document.

### 5.7 Health Check Endpoints (Missing)

The plan has no `/api/health` or `/api/ready` endpoints. These are required for:
- Vercel health checks
- Any load balancer or uptime monitor
- Confirming database connectivity and Redis connectivity on startup

**Belongs in:** Phase 0. This is a two-minute addition.

### 5.8 Feature Flags for Progressive Rollout (Missing)

The `createModuleMiddleware` function stubs a module enable/disable check (Phase 5 will implement it against a `TenantModule` table). But there is no mechanism for:
- Rolling out a new feature to a percentage of tenants
- A/B testing portal variants
- Dark-launching Phase 5 modules to beta tenants before full release

**Belongs in:** Phase 5 (Tenant module). Minimum viable: a `TenantFeatureFlag` table with an Upstash Redis cache.

### 5.9 Backup and Disaster Recovery (Not Mentioned)

The plan shares a production database between the legacy and new codebase. There is no mention of:
- Database backup frequency and retention
- Point-in-time recovery
- Recovery Time Objective (RTO) or Recovery Point Objective (RPO)
- Data loss scenarios if the shared database is corrupted

**Belongs in:** Infrastructure documentation, not a phase plan. But a corporate CTO will ask about this on day one.

---

## 6. Generic Platform Completeness Assessment

The plan's PROJECT.md states: "this is a generic white-label SaaS platform — NOT a Cotswold party booking migration." This is stated as a principle but is not demonstrated architecturally.

### Portal Module: Not Actually Generic

Phase 1's `portal.router.ts` and `slot.router.ts` are public-facing booking endpoints for a booking flow. They assume:
- A booking has a `scheduledDate`, `scheduledTime`, `durationMinutes`, and `slotId`
- Customers book slots in advance from an availability calendar
- The booking has a `locationType` of `VENUE`, `CUSTOMER_HOME`, or `CUSTOMER_WORK`

These assumptions are correct for mobile service businesses (trades, wellness, cleaning, events). They are incorrect for other service models (e.g., drop-in gym classes with attendance tracking, cricket stadium seat reservations, subscription-based services).

The plan's Phase 4 explicitly calls out that "the legacy `CotswoldPartyBooking.tsx` portal component and all Cotswold-specific template logic are NOT ported." But it does not specify what the generic portal looks like or how it adapts to different business models.

**Verdict:** The booking model encoded in the Drizzle schema and the portal router is appropriate for mobile service businesses. It is not a truly generic platform model. The plan should explicitly scope the "generic" claim to "any mobile appointment-based service business" rather than any business category.

### Notification Template System

The plan ports the legacy `template-engine.ts` variable substitution system. This system uses `{{variable_name}}` syntax with a `variable-builder.ts` that constructs variables from a loaded booking record.

The template variables are hardcoded to the booking domain: `{{booking_number}}`, `{{customer_name}}`, `{{service_name}}`, `{{scheduled_date}}`, etc. These variables are constructed in `variable-builder.ts` by loading a booking with all its relations.

For a generic platform, the variable builder would need to be extensible per tenant/industry. A cricket stadium ERP sending gate admission confirmations would need entirely different variables. The plan does not address this extensibility.

**Verdict:** The notification template system is portable within the booking domain. It is not a generic notification platform. To make it generic, the `variable-builder.ts` must be refactored into a plugin architecture where each tenant or industry vertical registers its own variable set.

### Tenant Configuration Schema

The plan mentions a `TenantModule` table for enabling/disabling modules per tenant, and a `TenantSettings` table (referenced in Phase 6's TypeScript error fixes). But the actual fields in `TenantSettings` are never specified.

What does a generic tenant configuration look like? At minimum it should define:
- Industry vertical (trades, wellness, events, etc.)
- Portal customisation (branding, colours, available service types)
- Booking configuration (advance booking window, cancellation policy, deposit rules)
- Notification preferences (which events trigger which notifications)
- Staff configuration (whether the tenant uses travel time, capacity limits, etc.)

None of this is specified. The plan defers it to Phase 5, which does not exist.

### Path to a New Industry Vertical

If a prospect asks "what does it take to add your platform to cricket stadium ERP?", the honest answer based on this plan is: "We don't know yet, because Phase 5 hasn't been designed." The tenant configuration schema, the portal template system, and the workflow engine are all deferred to a phase that has no plan.

A credible generic platform answer would be: "Configure the booking entity types, define the intake form fields, set up the notification templates, and deploy. No code changes required." That answer requires a designed configuration schema, which this plan does not provide.

---

## 7. Security Assessment

### 7.1 Drizzle Has No Row-Level Security — Tenancy Filtering Must Be 100% Consistent

**Issue:** Every repository method that takes `tenantId` enforces tenant isolation at the application layer. If a single repository method omits the `tenantId` filter — even one — data from other tenants is exposed.

The plan calls out the rule correctly but provides no mechanism for enforcement. The only safety net is code review.

**Missing:** A lint rule or TypeScript pattern that makes it structurally impossible to call a repository method without providing `tenantId`. One approach: make every repository method accept a `TenantContext` object (not a raw string) that is obtained only by passing through `tenantProcedure`.

### 7.2 Inngest Handler Authorization

Inngest event handlers receive `event.data` which contains `{ bookingId, tenantId }`. Handlers use `bookingId` to load the booking from the database. But the handler does not verify that the `tenantId` in the event matches the `tenantId` of the loaded booking.

An event with a valid `bookingId` but an incorrect `tenantId` would still be processed (since the lookup is by `bookingId` alone in most handlers). This is a low-risk attack vector since event payloads are not directly user-controlled, but it is a defense-in-depth gap.

**Fix:** In every Inngest handler that loads a booking, assert: `if (booking.tenantId !== event.data.tenantId) throw new Error('Tenant mismatch')`.

### 7.3 HMAC Webhook Signing Is Deferred to Phase 6 Without Justification

**Issue:** The Google Calendar webhook receiver is built in Phase 4 (`/api/integrations/google-calendar/webhook/route.ts`). HMAC verification of inbound Google Calendar webhook signatures is deferred to Phase 6. This means Phase 4 deploys an unauthenticated webhook endpoint to production.

Google Calendar does not sign its push notifications with HMAC. Instead, it uses a channel token (`X-Goog-Channel-Token`) that you set when creating the watch channel. This token should be validated before processing any notification. The plan does not mention channel token validation.

Additionally, the plan adds HMAC signing for outbound webhooks (Phase 6) but this is Ironheart-to-third-party signing — a lower security priority than inbound webhook authentication.

**Fix:** Phase 4 must validate the Google Calendar channel token before emitting `calendar/webhook.received`. This is a single header check that should not be deferred to Phase 6.

### 7.4 OAuth Token Encryption Key Rotation

The plan ports Google Calendar OAuth token encryption from the legacy codebase (legacy uses AES-256). The encryption key is stored in an environment variable. There is no mention of key rotation — what happens when the encryption key needs to be changed? All stored tokens become undecryptable.

**Fix:** Document a key rotation procedure. At minimum: when rotating the key, run a migration script that decrypts all tokens with the old key and re-encrypts with the new key before the old key is removed.

### 7.5 `PLATFORM_ADMIN_EMAILS` as a Security Gate Is Fragile

The `platformAdminProcedure` in Phase 0 checks `process.env.PLATFORM_ADMIN_EMAILS` — a comma-separated list of email addresses. This means:
- Platform admin access is controlled by an environment variable, not a database flag
- Adding a new platform admin requires a redeploy
- If the environment variable is accidentally set to a broad domain (`@ironheart.app`), everyone at that domain gets platform admin access
- There is no audit log of who was a platform admin at what time

**Fix:** Replace the environment variable gate with a database flag (`users.isPlatformAdmin`) managed through a secure admin procedure. The environment variable can bootstrap the first admin, but subsequent grants should go through the database.

### 7.6 `confirmReservation` Is a Public Procedure With No Verification

Phase 1 defines `confirmReservation` as a `publicProcedure`. The input is `{ bookingId, token?: string }` where `token` is described as "optional verification token."

A booking confirmation endpoint that accepts just a `bookingId` (a UUID, but potentially guessable or obtained by monitoring network traffic) and confirms the booking with no user authentication is a security concern. Any actor who knows a `bookingId` can confirm someone else's reservation.

The optional token is noted as a TODO but Phase 1 does not implement any token generation or verification.

**Fix:** Either make the confirmation endpoint require a signed JWT-like token generated at reservation time and stored in the database, or require the customer's email address to match the booking's customer email as a simple verification step.

---

## 8. Observability Gaps

### 8.1 No Distributed Tracing

The plan adds `requestId` threading in Phase 6 (PHASE6-T02) and Sentry error tracking in Phase 0. But neither is distributed tracing in the OpenTelemetry sense.

A complete request trace includes: middleware execution time, tRPC procedure execution time, database query count and duration, Inngest event emission latency, and Redis operation latency. Pino structured logs with `requestId` threading enable log correlation but not waterfall trace visualisation.

For a production SaaS platform, the inability to trace "why did this booking creation take 2.3 seconds?" will result in undiagnosed latency regressions.

**Fix:** Instrument tRPC procedures with Sentry's performance monitoring (already partially done via `withSentryConfig` in next.config.ts). Add database query instrumentation via Drizzle's logging hook. This does not require OpenTelemetry and can be done within the existing Sentry subscription.

### 8.2 No Performance Monitoring Thresholds

The plan logs tRPC requests with duration (Phase 6 middleware logs `Date.now() - start`). But there are no defined SLO thresholds:
- What is an acceptable p95 latency for `booking.list`?
- At what duration does `confirmReservation` generate an alert?
- What is the acceptable Inngest function duration before it's considered a problem?

Without defined thresholds, log lines are collected but nobody acts on performance degradation until users complain.

**Fix:** Define latency SLOs in the architecture documentation. Add a `warn` log when procedure duration exceeds the defined threshold. Connect to a Sentry performance alert rule.

### 8.3 No Alerting on Inngest Function Failures

Inngest has a built-in dashboard that shows function health. But the plan has no mechanism for alerting the development team when:
- A function exceeds its retry budget and enters a dead-letter state
- A function is taking longer than expected
- A function's error rate exceeds a threshold

The plan states "Inngest dashboard is the only visibility." This requires a developer to proactively check the dashboard, which does not happen at 2am when a token refresh fails and all calendar syncs are silently broken.

**Fix:** Configure Inngest's webhook-based event notifications (Inngest supports outbound webhooks for function failures). Route these to a Slack channel or PagerDuty. Alternatively, use Sentry's issue capture for Inngest handler errors.

### 8.4 No Cost Monitoring

The plan does not address monitoring infrastructure costs. Inngest bills by function run count. Resend bills by email volume. Twilio bills by SMS. Without monitoring:
- A runaway Inngest function (e.g., infinite retry loop) generates unbounded costs
- An email blast to all customers triggers an unexpected Resend bill

**Fix:** Add monthly budget alerts in each service's dashboard. Add a cost reporting log line in key Inngest functions: `log.info({ runCount: 1, service: 'inngest' }, 'Inngest function run tracked')`. Build a simple cost dashboard in the Phase 5 platform admin portal.

---

## 9. Testing Strategy Assessment

### 9.1 Phase 3 Adds Vitest Tests for RBAC Only

The first tests in the plan are `rbac.test.ts` in Phase 3, covering the `hasPermission()` function. These 8 test cases cover the RBAC logic, which is correct. But this is insufficient test coverage for a production auth migration.

Missing Phase 3 tests:
- `tenantProcedure` correctly rejects users with inactive status
- `tenantProcedure` correctly enforces tenant membership (`tenantId` mismatch)
- `platformAdminProcedure` correctly gates by email
- The `workosUserId` backfill path works correctly

### 9.2 BookingService Integration Tests Are in Phase 6 — Too Late

Phase 6 adds integration tests for `BookingService.createBooking()` and `BookingService.confirmReservation()`. These are the two most critical code paths in the entire platform. Testing them only after Phase 5 is complete means the booking module ran in production through Phases 1–5 with no automated test coverage.

The plan acknowledges this is testing the booking service, not E2E portal flows. But even service-level tests for the slot capacity enforcement should be present from Phase 1 — not Phase 6.

### 9.3 No E2E Tests

The plan has no Playwright or Cypress tests at any phase. The Phase 6 success criteria includes a manual check: "Full E2E: customer books portal → Resend email arrives → Google Calendar event created." Manual E2E verification is not repeatable and will not catch regressions.

For a platform about to be presented to a corporate CTO, the absence of automated E2E tests is a material gap.

### 9.4 No Load Testing

The plan has no load testing at any phase. The slot capacity race condition (Section 4.2) can be validated by a simple concurrent load test: fire 10 simultaneous `createBookingFromSlot` requests for the same slot with capacity 1. Without a load test, the distributed lock implementation in Phase 6 has no validation that it actually prevents overbooking under concurrent load.

### 9.5 No Contract Testing Between Module Boundaries

Modules communicate via Inngest events. The TypeScript event catalog in `inngest.ts` provides compile-time type safety. But TypeScript types do not validate the runtime shape of data that crosses the Inngest boundary (event handlers receive `event.data` which is typed but not validated at runtime).

A handler that receives a malformed event payload will throw an unhandled error rather than a typed, recoverable error.

**Fix:** Add Zod validation at Inngest handler entry points. Each handler should validate `event.data` against its expected schema and throw a typed error if validation fails.

---

## 10. Phase Sequencing Assessment

### 10.1 Auth Comes After Two Full Modules — Correct Decision With a Caveat

Phases 1 and 2 build the booking and scheduling modules against a stubbed auth context (`session: null`, `tenantId: 'default'`). This means no authenticated testing of the booking module is possible until Phase 3 completes.

The plan explicitly states that `protectedProcedure` "always throws (session is always null until Phase 3)" and `permissionProcedure` "always throws FORBIDDEN." This means the Phase 1 manual flow checks (PHASE1-T13) cannot actually be tested against the booking module's authenticated procedures without a database workaround.

The workaround is not documented. Phase 1 can test `publicProcedure` endpoints (`getSlotsForDate`, `createBookingFromSlot`, `confirmReservation`) but cannot test `tenantProcedure` endpoints (`booking.list`, `booking.create`) until Phase 3.

This sequencing is defensible — building clean module structure before wiring auth reduces coupling — but the test gap should be explicitly documented and addressed with a dev-mode auth bypass.

### 10.2 Distributed Lock Belongs in Phase 1, Not Phase 6

Addressed above (Section 4.2). The slot capacity race condition is a data integrity issue that should be addressed at the same time the booking creation is implemented. Deferring it to Phase 6 is a conscious acceptance of a production overbooking risk.

### 10.3 Phase 4 Stubs → Phase 2 Fill Pattern Is Sound

The pattern of creating log-only Inngest stubs in Phase 2 (for calendar crons) that are filled in Phase 4 is architecturally sound. The stubs allow `vercel.json` cron deletion to proceed safely. The fill in Phase 4 has a clear insertion point (the stub comment). The only risk is that the stub's function signature must remain stable between Phase 2 and Phase 4 — this is enforced by the TypeScript event catalog.

### 10.4 HMAC Signing in Phase 6 After Webhook Route in Phase 4

The Google Calendar webhook endpoint is deployed in Phase 4 without channel token validation. Phase 6 adds the validation. This creates a production window (Phase 4 to Phase 6) where the webhook endpoint processes unauthenticated inbound notifications.

This should be reversed: the webhook validation must be implemented in Phase 4 alongside the webhook route.

---

## 11. Recommended Additions to the Plan

### Phase 0 Additions

1. **Add `/api/health` and `/api/ready` endpoints.** Two-minute addition. Required for load balancer probes and uptime monitoring.
   ```typescript
   // src/app/api/health/route.ts
   export function GET() {
     return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
   }
   ```

2. **Add a read-only database role for development.** Create a PostgreSQL role with SELECT + INSERT + UPDATE + DELETE permissions but no DROP or ALTER TABLE. Use this role in `.env.local`. This prevents accidental schema destruction during development.

3. **Define PHASE5_PLAN.md structure.** Before Phase 0 execution, write the phase plan skeleton with module file lists, success criteria, and legacy router mappings for: portal, workflow, tenant, customer, review, forms, staff.

4. **Fix the Prisma syntax in `booking.events.ts`.** Rewrite using Drizzle transaction syntax before Phase 0 is marked complete.

### Phase 1 Additions

5. **Add minimal distributed lock for slot capacity decrement.** Move the Redis `SET NX` lock from Phase 6 into Phase 1's `BookingService.createBooking()`. Even a basic implementation prevents overbooking in production.

6. **Add Zod validation at Inngest handler entry points.** Each handler should validate `event.data` on receipt.

7. **Add BookingService integration tests.** The two critical paths (`createBooking`, `confirmReservation`) should have integration tests from Phase 1, not Phase 6. Use an in-memory database or a dedicated test schema.

### Phase 3 Additions

8. **Pre-migration user backfill script.** Before Phase 3 go-live, provide a script that:
   - Creates WorkOS users for every active Drizzle user
   - Backfills `workosUserId` in the database
   - Reports any users who could not be matched

9. **Auth rollback mechanism.** Add a `NEXT_PUBLIC_AUTH_PROVIDER` environment variable that switches between WorkOS and a dev/test bypass mode. This enables rollback without a code deploy.

10. **Extend RBAC tests.** Add tests for `tenantProcedure` tenant isolation, inactive user rejection, and `platformAdminProcedure` email gating.

### Phase 4 Additions

11. **Implement Google Calendar channel token validation in Phase 4, not Phase 6.** This is a single header check and should not be deferred.

12. **Add idempotency guards to email and SMS Inngest handlers.** Check notification log before sending. Insert notification log record after sending.

### Phase 5 (Must Be Written)

13. **Design and document the TenantConfiguration schema.** Define the fields that make the platform configurable per industry vertical: service types, booking window rules, cancellation policy, notification preferences, intake form configuration.

14. **Define the generic portal module interface.** How does a new industry vertical register its portal variant? What configuration drives the portal UI? This is the core of the "generic platform" claim.

15. **Plan tenant onboarding flow.** How does a new tenant self-provision? What are the minimum required configuration steps?

### Phase 6 Additions

16. **Add GDPR compliance procedures.** Right to erasure (anonymise all customer data for a given email address). Right to data export (generate ZIP of all customer records and bookings). These are legal requirements for a UK-based SaaS.

17. **Add audit log for permission-sensitive operations.** `(tenantId, entityType, entityId, action, changedById, diff, timestamp)`. Required for enterprise customers.

18. **Replace `PLATFORM_ADMIN_EMAILS` with database-backed admin flags.** The environment variable gate should only bootstrap the first admin. All subsequent grants go through the database.

19. **Define and document key rotation procedures** for Google Calendar OAuth tokens and webhook signing secrets.

---

## 12. Overall Verdict

| Dimension | Score (1–10) | Rationale |
|-----------|-------------|-----------|
| **Completeness** | 5/10 | Phase 5 is missing entirely. Billing, onboarding, GDPR, audit log, health checks are absent. The plan covers Phases 0–4 and 6 in excellent detail but represents roughly 60% of the work required for a production-ready platform. |
| **Security** | 6/10 | Tenant isolation correctly enforced at the repository layer. RBAC logic is sound. But `confirmReservation` has no authentication, webhook validation is deferred, `PLATFORM_ADMIN_EMAILS` is fragile, and GDPR compliance is absent. |
| **Scalability** | 7/10 | Inngest resolves the most critical scalability ceilings (cron races, connection exhaustion). Distributed locking is planned (though sequenced too late). Rate limiting is included. Missing: connection pooling via Prisma Accelerate or Supabase pooler, which is mentioned in the architecture brief but absent from the phase plans. |
| **Maintainability** | 8/10 | The modular architecture, service/repository separation, and typed event catalog are genuine improvements over the legacy codebase. The plan is executable at the task level. Gaps: per-module schema ownership is undefined, cross-module type imports have no enforcement mechanism. |
| **Enterprise-readiness** | 4/10 | Missing: audit log, GDPR compliance, SSO cost transparency, billing model, platform admin portal, API versioning, data export, and — critically — Phase 5, which contains the workflow engine that enterprise customers require. |
| **Risk management** | 5/10 | The shared live database is the single highest-risk element of the entire project. The plan acknowledges the risk but does not provide adequate safeguards. WorkOS cutover has a fragile migration path. Overbooking is accepted as a known risk for the majority of the build. |

**Overall: 6/10**

The plan is technically competent and represents a significant improvement in architecture and operational reliability over the legacy codebase. The Phase 0 through Phase 4 plans are detailed and executable. The architectural decisions — modular monolith, Inngest for background work, Drizzle ORM, WorkOS for auth — are appropriate and defensible.

However, the plan cannot be presented to a corporate CTO as a complete picture. Phase 5 does not exist, and without it, the platform is a well-structured booking service rather than a generic white-label SaaS platform. The shared-database strategy requires safeguards not currently in the plan. The WorkOS migration lacks a tested path for existing users. And the security, compliance, and observability layers, while partially addressed, have gaps that a corporate security review would flag immediately.

The recommendation is: write Phase 5 before Phase 0 execution begins, add the database safety fences described in Section 3.1, move the distributed lock to Phase 1, and add the missing security controls to Phase 4. With those additions, this plan would earn an 8/10 and could be presented to an adversarial enterprise CTO with confidence.

---

*CTO Review — Ironheart Refactor*
*Reviewed: 2026-02-19*
*Reviewer: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)*
