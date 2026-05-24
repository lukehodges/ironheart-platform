# Ironheart MVP Architecture Assessment

## 1. Current Module Inventory

The project has **20 module directories** under `/Users/lukehodges/Documents/ironheart-refactor/src/modules/` and **18 registered module manifests** in the module registry. Every module registered in the root router has a corresponding tRPC router with real endpoints.

| Module | Files | LOC (service+repo) | Tests | Admin Page | Maturity |
|--------|-------|---------------------|-------|------------|----------|
| **auth** | Custom structure (no standard layers) | N/A | rbac.test.ts (20 tests) | None (infra) | **Complete** -- WorkOS AuthKit integration, RBAC, tenant resolution, session management |
| **tenant** | Full stack | 205 + 530 = 735 | tenant.service.test.ts | /admin/settings | **Complete** -- Org settings, module gating, venue CRUD, billing stubs |
| **platform** | Full stack | 618 + 655 = 1,273 | platform.service.test.ts | /platform/* (5 pages) | **Complete** -- Tenant provisioning, plan management, feature flags, impersonation, signup approval |
| **booking** | Full stack + 4 sub-routers + lib | 632 + 429 = 1,061 | 2 test files | /admin/bookings, /admin/calendar | **Complete** -- CRUD, state machine, approvals, completions, portal, slot reservation, calendar view |
| **scheduling** | Full stack + lib | 624 + 470 = 1,094 | smart-assignment.test.ts | /admin/scheduling | **Complete** -- Slots, services, smart staff assignment, availability generation |
| **customer** | Full stack + contract | 266 + 431 = 697 | customer.service.test.ts | /admin/customers | **Complete** -- CRUD, merge, anonymise, notes, booking history |
| **team** | Full stack | 286 + 694 = 980 | team.availability.test.ts | /admin/team | **Complete** -- Staff management, availability (BLOCKED/SPECIFIC/RECURRING), capacity |
| **workflow** | Full stack + 11 engine files | 435 + 431 = 866 (+ engine) | 6 test files (conditions, context, graph, linear, validate, expressions) | /admin/workflows (+ detail + executions) | **Complete** -- Dual-mode engine (linear + graph), condition groups, expressions, loop/parallel, validation |
| **forms** | Full stack | 333 + 385 = 718 | forms.service.test.ts | /admin/forms, /forms/[sessionKey] | **Complete** -- Template builder, public submission, field validation, session keys |
| **review** | Full stack | 287 + 428 = 715 | review.service.test.ts | /admin/reviews, /review/[token] | **Complete** -- Collection, moderation, automation settings, pre-screening |
| **notification** | Full stack + providers + templates | 378 + 299 = 677 | None | None (background) | **Complete** -- Email/SMS delivery via Resend/Twilio, templates, preferences |
| **calendar-sync** | Full stack + lib + providers | N/A + 462 = 462+ | None | None (background) | **Complete** -- Google Calendar/Outlook sync, OAuth, watch channels, bidirectional sync |
| **payment** | Full stack + lib + providers | 117 + 185 = 302 | 2 test files | /admin/payments | **Partial** -- Service is thin (117 lines). Has Stripe/GoCardless/Cash providers, pricing engine, tax engine, state machine. Router and providers exist but service layer needs more orchestration |
| **analytics** | Full stack + lib | N/A + 538 = 538+ | 2 test files | /admin/analytics | **Complete** -- KPIs, time series, revenue charts, staff utilization, churn risk, forecasting |
| **developer** | Full stack | 41 + 61 = 102 | webhook-delivery.test.ts | /admin/developer | **Partial** -- Very thin service (41 lines). Webhook endpoints + API key management scaffolded but minimal |
| **search** | Repository + router only | N/A + 90 = 90 | None | None (topbar) | **Partial** -- Global search across customers + bookings only. No service layer. |
| **settings** | Service + repository + router | 144 + 173 = 317 | settings.service.test.ts | /admin/settings | **Complete** -- API key management, module tab discovery. Settings page has 7 tabs (general, notifications, integrations, billing, modules, security, danger) |
| **audit** | Repository + service + router | N/A + 138 = 138+ | audit.service.test.ts | /admin/audit | **Complete** -- Paginated list, CSV export, filter options from module registry |
| **portal** | Manifest only | 0 | None | None | **Stub** -- Only a manifest and empty index.ts. Public booking portal exists at `/app/book/[tenantSlug]` but the module has no backend logic of its own (booking module handles it) |
| **staff** | Manifest only | 0 | None | None | **Stub** -- Only a manifest and empty index.ts. Staff self-service portal not implemented |

**Summary**: 15 complete, 3 partial (payment, developer, search), 2 stubs (portal, staff).
**Test count**: 955 tests across 50 test files, all passing.

---

## 2. Module Dependencies (from manifests)

```
auth         -> (none)
tenant       -> (none)
platform     -> (none)
analytics    -> (none)
search       -> (none)
customer     -> (none)
team         -> (none)
notification -> (none)
workflow     -> (none)
forms        -> (none)
booking      -> customer
scheduling   -> booking, team
portal       -> booking
staff        -> team
review       -> customer, booking
calendar-sync-> booking
payment      -> booking
developer    -> (none)
```

**Dependency graph (visual)**:
```
                 auth, tenant, platform, analytics, search
                      (root-level, no deps)

                notification, workflow, forms, developer
                    (standalone, no module deps)

                      customer        team
                         |              |
                   +-----+-----+    +--+--+
                   |     |     |    |     |
                booking  |     |   scheduling staff
                   |     |     |      |
              +----+----+|     |      |
              |    |    | |    |      |
           portal review| |   (via booking)
                  calendar-sync
                  payment
```

**Critical observation**: `booking` is the most depended-upon module (5 modules depend on it). `customer` and `team` are the next most critical (2-3 dependents each).

---

## 3. Core vs Optional Modules

Thinking about this as a platform play (like Salesforce), the modules break down into three tiers:

### Tier 1 -- CORE (required for any vertical, cannot be disabled)

Currently marked `isCore: true` in manifests:
- **auth** -- Authentication, sessions, RBAC. Foundational.
- **tenant** -- Organization settings, module gating, venue management. The multi-tenancy backbone.
- **platform** -- Tenant provisioning, plan management, feature flags. The SaaS operator control plane.
- **analytics** -- Dashboard with composable, module-registered widgets. Required for any product.
- **search** -- Global search. Currently core but minimally implemented.

**Assessment**: This core set is correct. However, the following should arguably also be core:
- **audit** -- Every SaaS product needs an audit trail. Currently NOT in the core set but should be. It has no sidebar item from any manifest; it is hardcoded into the sidebar-nav as a static item.
- **notification** -- Every vertical needs email/SMS delivery. Without it, no transactional communication works.
- **settings** -- API key management and module tab discovery. This is more of an extension of `tenant` than a standalone module. It has no manifest at all and is not in the module registry.

### Tier 2 -- STANDARD (available to most verticals, can be enabled/disabled per tenant)

- **customer** -- CRM backbone. Nearly every vertical needs customer records.
- **team** -- Staff/team management and availability. Required if you have human-delivered services.
- **booking** -- Appointment scheduling. The original vertical driver.
- **scheduling** -- Slot generation, service definitions. Tightly coupled to booking.
- **forms** -- Dynamic form builder. Useful for intake, consent, surveys across verticals.
- **review** -- Customer feedback collection. Important for service businesses.
- **workflow** -- Automation engine. High-value but complex; can be deferred for simpler verticals.
- **payment** -- Invoicing and payment processing. Required for any revenue-generating vertical.
- **calendar-sync** -- Google/Outlook integration. High value but not essential for launch.

### Tier 3 -- ADDON/DEFERRED

- **developer** -- API keys and webhooks. Only for tenants with technical integrations.
- **portal** -- Public booking portal (stub). The booking flow itself works via `/book/[tenantSlug]` but the module shell is empty.
- **staff** -- Staff self-service portal (stub). Not implemented.

---

## 4. MVP Definition

**The Salesforce analogy**: Salesforce launched with Contacts, Accounts, and Opportunities -- the minimum CRM. Ironheart's equivalent is a multi-tenant platform where a business can:
1. Sign up (or be provisioned)
2. Configure their organization
3. Manage their team/staff
4. Manage their customers
5. Operate their core business process (which varies by vertical)
6. Get visibility into what is happening (analytics, audit)

**Minimum Viable Module Set for MVP**:

| Module | Why Essential |
|--------|--------------|
| **auth** | No product without authentication |
| **tenant** | Multi-tenancy backbone, org settings, module gating |
| **platform** | SaaS operator needs to provision and manage tenants |
| **customer** | Every vertical has customers/contacts |
| **team** | Most verticals have staff or team members |
| **settings** | Unified settings experience (API keys, module tabs) |
| **audit** | Compliance and transparency requirement |
| **notification** | Transactional email/SMS for all modules |
| **analytics** | Business owners need visibility |
| **search** | Basic UX requirement for navigation |

**These 10 modules form the "horizontal platform layer"** -- they work for ANY industry vertical. They are industry-agnostic.

**First vertical (booking-based businesses)** adds:
| Module | Why for V1 Vertical |
|--------|---------------------|
| **booking** | Core business process for the first vertical |
| **scheduling** | Slot availability for the booking flow |
| **payment** | Revenue collection |

This gives 13 modules for an MVP. Everything else is Phase 2+.

---

## 5. Current Gaps and Inconsistencies

### Architecture Gaps

1. **`settings` module has no manifest** -- It is registered in the root router and has a full stack (service, repository, router, schemas, types, tests) but no `settings.manifest.ts`. It is not in the module registry. This means:
   - It does not contribute sidebar items through the module system
   - It cannot be gated per-tenant
   - It has no declared permissions in the manifest
   - This is inconsistent with every other module

2. **`audit` module has no manifest** -- Same issue as settings. The Audit Log sidebar item is hardcoded as a "static" item in `sidebar-nav.tsx` lines 94-115, completely bypassing the module system. This undermines the module architecture.

3. **Portal and Staff are registered in the module registry but are empty stubs** -- They have manifests but no backend logic. The portal manifest declares a dependency on `booking` and routes, but the index.ts is `export {}`. This is confusing -- either remove them from the registry or implement them.

4. **`settings` vs `tenant` overlap** -- The `/admin/settings` page is claimed by the `tenant` manifest's sidebar item, but the actual settings router is a separate module (`settingsRouter`). The settings page has 7 tabs (general, notifications, integrations, billing, modules, security, danger) but the `tenant.router.ts` handles org settings while `settings.router.ts` handles API keys and module tab discovery. This split is unclear.

### Completeness Gaps

5. **Payment service is thin** -- At 117 lines, `payment.service.ts` is the thinnest service relative to its domain complexity. It has providers (Stripe, GoCardless, Cash), a pricing engine, a tax engine, and a state machine in `/lib`, but the service layer barely orchestrates them. Compare to booking (632 lines) or scheduling (624 lines). The payment module needs significant service-layer work for invoice generation, payment recording, refund handling, and Stripe Connect flows.

6. **Developer module is skeletal** -- 41-line service, 61-line repository. The webhook delivery test exists but the module needs substantial work for API key lifecycle, webhook registration, event delivery, retry logic, and documentation.

7. **Search only covers 2 entity types** -- The search repository only queries `customers` and `bookings`. For an MVP, it should also cover team members. More critically, there is no service layer at all -- the router calls the repository directly, which violates the established architectural pattern.

8. **No `services` module** -- Services (the things tenants sell -- haircuts, consultations, classes, etc.) are defined in the DB schema (`services.schema.ts`) and managed by the `scheduling` module. But there is no dedicated admin page for service management. The `/admin/scheduling` page presumably handles this, but the naming is confusing. For non-booking verticals, "scheduling" is the wrong framing.

9. **Admin layout permissions gap** -- In `admin/layout.tsx` (line 49), if the user is a platform admin WITHOUT impersonation, they get redirected to `/platform`. But regular users get `permissions = []` (empty array) because the layout only loads the raw user without extracting their actual permission strings. The sidebar navigation then shows ALL items because `hasPermission()` returns true when `permissions.length === 0` (line 99 of sidebar-nav.tsx: "if no permissions passed, don't filter"). This means the RBAC system is effectively bypassed in the sidebar for non-platform-admin users.

10. **Inngest route handler not verified** -- The Inngest webhook handler at `/api/inngest/route.ts` must register all event handler functions from all modules. Without checking this file, we cannot confirm all module event handlers are wired up.

### Data Model Gaps

11. **No `organizationSettings` schema export issue** -- The `organizationSettings` table is defined in `shared.schema.ts` (which is the "phase6" catchall). It has 27+ typed columns as documented, but it lives in a file named `shared.schema.ts` alongside unrelated tables like `modules`, `tenantModules`, `auditLogs`, `workflows`, `invoices`, `payments`, `reviews`, `formTemplates`, etc. This single file (776 lines) is a monolith that should be split.

12. **`modules` table must be seeded** -- The module gating system depends on rows in the `modules` database table. `tenantModules` references `modules.id` by FK. There is no migration or seed script that populates the `modules` table with the 18 registered module slugs. Without this, `isModuleEnabled()` will always return false, and no module will work.

---

## 6. Integration Points

These are the places where modules MUST talk to each other seamlessly:

1. **Booking -> Notification**: When a booking is created/confirmed/cancelled, notification module must send email/SMS. This happens via Inngest events (`booking/created` etc. -> `notification/send.email`).

2. **Booking -> Calendar Sync**: When a booking changes, calendar-sync pushes to Google/Outlook. Via `calendar/sync.push` event.

3. **Booking -> Payment**: Booking completion triggers invoice creation. Via `booking/completed` -> `payment/completed` event chain. Currently, the payment manifest declares it consumes `booking/completed`.

4. **Booking -> Review**: After completion, review requests can be sent. Via `review/request.send` event.

5. **Booking -> Forms**: Forms can be attached to services and sent on booking creation. Via `forms/submitted` event.

6. **Workflow -> Everything**: The workflow engine consumes events from booking, forms, and review modules to trigger automated actions. The workflow module is the universal automation layer.

7. **Tenant -> Module System**: `tenantService.isModuleEnabled()` is called by the `createModuleMiddleware()` tRPC middleware and the `createModuleGate()` utility. Every module-gated procedure depends on this.

8. **Admin Layout -> Tenant Repository**: The admin layout (`layout.tsx`) calls `tenantRepository.listModules()` directly (not through the service) to determine which sidebar items to show. This is the only place where the layout directly touches a repository -- a minor architectural shortcut.

9. **Auth RBAC -> Every Module**: The `permissionProcedure` factory and `hasPermission()` utility gate every write operation. The permission strings (e.g., `bookings:write`) are defined in module manifests but must also exist as rows in the `permissions` database table.

---

## 7. What to Defer (Phase 2+)

**Defer to Phase 2:**
- **workflow** -- The engine is impressive (dual-mode, graph validation, loop/parallel, sub-workflows) but it is an advanced automation feature. Most initial customers will not need visual workflow building on Day 1. The engine has 11 files and 6 test suites, making it the most complex module. Ship it but make it an optional add-on, not enabled by default.
- **forms** -- Useful but not critical for initial launch. Can be enabled per-tenant.
- **review** -- Nice-to-have for service businesses. Depends on booking completion flow being solid first.
- **calendar-sync** -- High value but requires OAuth integration testing with live Google/Outlook accounts. Complex to stabilize.
- **developer** -- API keys and webhooks are for advanced integrators. Barely implemented.

**Defer to Phase 3:**
- **staff** (self-service portal) -- Currently a stub. Staff see their schedules through the admin interface already.
- **portal** (as a standalone module) -- The booking portal works via `/book/[tenantSlug]` already. The module shell is unnecessary overhead.
- **Advanced analytics** -- The current analytics module has forecasting and churn risk, which are aspirational features. Focus on core KPIs first.

**Priority for MVP Hardening:**
1. Fix the admin layout permissions bypass (gap #9 above)
2. Add manifests for `settings` and `audit` modules (gaps #1-2)
3. Ensure the `modules` database table is seeded (gap #12)
4. Bulk up `payment.service.ts` for invoice/payment flows (gap #5)
5. Split `shared.schema.ts` into domain-specific files (gap #11)
6. Fix search to include a service layer (gap #7)
7. Wire actual user permissions into the admin layout sidebar

---

## Summary: The Ironheart Equivalent of Salesforce's CRM

Salesforce started with **Contacts + Accounts + Opportunities**. Ironheart's equivalent foundation is:

**Platform Layer (always on):**
- auth, tenant, platform, analytics, search, audit, notification, settings

**First Vertical Layer (booking-based businesses):**
- customer, team, booking, scheduling, payment

This gives you a working multi-tenant SaaS where a business can: sign up, configure their org, manage staff, manage customers, take bookings, process payments, get analytics, and have a full audit trail. The module system allows enabling forms, reviews, workflows, calendar-sync, and developer tools per-tenant as add-ons.

The architecture is solid. The module manifest + registry + gating system is well-designed. The layered architecture (router -> service -> repository) is consistently followed across 15+ modules. The 955 passing tests provide good coverage. The main risks for MVP are the gaps identified above -- particularly the permissions bypass in the admin layout, the missing module seeds in the database, and the payment module's thin service layer.
