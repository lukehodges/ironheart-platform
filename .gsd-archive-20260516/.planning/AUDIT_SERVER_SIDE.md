# Server-Side Audit Report

**Date:** 2026-02-21
**Scope:** All backend modules in `src/modules/`, `src/shared/`, `src/server/`, `src/app/api/`
**Audited against:** PHASE5_ARCHITECTURE.md, PHASE6_ARCHITECTURE.md, PHASE7D_BACKEND_PLAN.md, PHASE5_PLAN.md, PHASE6_PLAN.md

---

## Executive Summary

The Ironheart backend has **18 modules** implemented across Phases 1-6, with 715 passing tests (16 failures in 7 test files, all frontend component tests). The core booking, workflow engine, team, customer, forms, and review modules are substantially complete. However, the audit reveals **significant gaps** in three areas:

1. **Phase 7D is entirely unimplemented** -- the Analytics dashboard procedures (6 new), Settings module (12 procedures), and Audit module (2 procedures) planned in PHASE7D_BACKEND_PLAN.md do not exist.
2. **Phase 6 has critical stubs** -- Payment events (Stripe webhook handlers), overdue invoice cron, GoCardless provider, and several scheduling service methods are stub-only with TODO comments.
3. **Error handling architecture has a gap** -- Domain errors (NotFoundError, ForbiddenError, etc.) thrown by services are not automatically converted to TRPCErrors by the error formatter. The `toTRPCError()` helper exists but is never called anywhere. Services throw domain errors and tRPC appears to wrap them as INTERNAL_SERVER_ERROR unless they happen to be TRPCError instances.
4. **Module middleware is still a Phase 0 stub** -- `createModuleMiddleware()` in `src/shared/trpc.ts` always passes through; no module gating is enforced at the procedure level.

**Test Count:** 715 passing / 731 total (16 failures are all frontend tests, not backend)
**Backend Test Files:** 25 test files covering 14 modules
**Modules With Zero Tests:** platform, tenant, analytics (service/router level), notification, calendar-sync, search

---

## Module-by-Module Analysis

### 1. Analytics Module

**Files:** `src/modules/analytics/` (9 files)

#### Planned vs Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| `getSummary` | **Stub** | Returns hardcoded zeros (line 24-29 of router) -- no actual DB aggregation |
| `getTimeSeries` | Implemented | Queries `metric_snapshots` table correctly |
| `getCustomerInsights` | **Stub** | Service returns fake data (line 46-68 of service) -- comment says "stub" |
| `getRevenueForecast` | Implemented | Uses `expr-eval` forecasting library |
| `getKPIs` (Phase 7D) | **Missing** | Not implemented -- planned in PHASE7D_BACKEND_PLAN.md |
| `getRevenueChart` (Phase 7D) | **Missing** | Not implemented |
| `getBookingsByStatus` (Phase 7D) | **Missing** | Not implemented |
| `getTopServices` (Phase 7D) | **Missing** | Not implemented |
| `getStaffUtilization` (Phase 7D) | **Missing** | Not implemented |
| `getChurnRisk` (Phase 7D) | **Missing** | Not implemented |
| Hourly cron (computeMetricSnapshots) | Implemented | Inngest function runs hourly |
| `getStaffPerformance` | **Missing** | Schema defined but no router procedure |
| `getRevenueBreakdown` | **Missing** | Schema defined but no router procedure |
| `getBookingFunnel` | **Missing** | Schema defined but no router procedure |
| Scheduled reports (`listReports`, `createReport`, `exportReport`) | **Missing** | Planned in Phase 6 architecture but not implemented |

#### Issues Found

- **`getSummary` is completely hardcoded** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.router.ts` lines 18-29 return all zeros. This means the analytics dashboard shows no data.
- **`getCustomerInsights` is a stub** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.service.ts` lines 42-69 return fake values. The comment on line 46 confirms: "For now return a stub -- full implementation requires joining bookings+payments."
- **`upsertSnapshot` uses delete-then-insert** instead of a proper upsert (`ON CONFLICT DO UPDATE`). This is not atomic and could lose data under concurrent writes. See `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.repository.ts` lines 37-56.
- **Schemas defined but unused**: `staffPerformanceSchema`, `revenueSchema`, `funnelSchema` exist in `analytics.schemas.ts` but have no corresponding router procedures.
- **No Redis caching** on any analytics endpoint despite Phase 7D plan specifying 5-minute TTL for KPIs.

#### Recommended Changes

- Implement all 6 Phase 7D procedures (getKPIs, getRevenueChart, getBookingsByStatus, getTopServices, getStaffUtilization, getChurnRisk)
- Replace `getSummary` stub with actual aggregation queries
- Replace `getCustomerInsights` stub with real DB queries joining bookings + payments
- Convert `upsertSnapshot` to use Drizzle `onConflictDoUpdate` or wrap in a transaction
- Add Redis caching for expensive analytics queries

---

### 2. Settings Module (Phase 7D)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Settings module (`src/modules/settings/`) | **Missing** -- entire module does not exist |
| `getGeneral` / `updateGeneral` | **Missing** (delegated from tenant module) |
| `getNotifications` / `updateNotifications` | **Missing** |
| `getIntegrations` / `connectGoogle` / `disconnectGoogle` | **Missing** |
| `connectOutlook` / `disconnectOutlook` | **Missing** |
| `getBilling` | **Missing** |
| `getModules` / `toggleModule` | **Missing** (exists in tenant module but not consolidated) |
| `listApiKeys` / `createApiKey` / `revokeApiKey` | **Missing** |
| `exportData` / `deleteAllData` | **Missing** |

#### Issues Found

- The entire settings module planned in PHASE7D_BACKEND_PLAN.md does not exist. No files, no types, no schemas, no service, no router.
- The root router (`src/server/root.ts`) has no `settings` entry.
- Some of the functionality exists fragmented in the `tenant` module (getSettings, updateSettings, listModules, toggleModule) but is not consolidated.

#### Recommended Changes

- Create the entire `src/modules/settings/` module per Phase 7D spec (6 files, ~1,610 LOC)
- Wire it into the root router
- Implement all 12 procedures with proper delegation to tenant/developer services where appropriate

---

### 3. Audit Module (Phase 7D)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Audit module (`src/modules/audit/`) | **Missing** -- entire module does not exist |
| `list` (paginated audit entries with filters) | **Missing** |
| `exportCsv` | **Missing** |

#### Issues Found

- The entire audit module planned in PHASE7D_BACKEND_PLAN.md does not exist.
- Audit log insertion already works via `platformRepository.insertAuditLog()` in `/Users/lukehodges/Documents/ironheart-refactor/src/modules/platform/platform.repository.ts` lines 407-438, but there is no dedicated read/query interface for the admin frontend.
- The platform module has `getAuditLog` as a platform admin procedure, but the frontend needs a tenant-scoped audit log, not just platform admin access.

#### Recommended Changes

- Create the entire `src/modules/audit/` module per Phase 7D spec (6 files, ~690 LOC)
- Implement `list` with cursor-based pagination, filters (resourceType, actorId, action, date range)
- Implement `exportCsv` with CSV generation and 10k row limit
- Wire into root router

---

### 4. Workflow Module

**Files:** `src/modules/workflow/` (21 files including engine/)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| CRUD (list, getById, create, update, delete) | Implemented |
| Graph engine (IF, SWITCH, MERGE, LOOP, etc.) | Implemented |
| Linear engine | Implemented |
| Condition groups (AND/OR/nested) | Implemented |
| Expression evaluator (AST-based, expr-eval) | Implemented |
| Variable resolution | Implemented |
| Graph validation | Implemented |
| Execution history (`getExecutions`) | Implemented |
| `getExecutionDetail` (Phase 7D) | **Missing** |
| Node config migrations | Implemented |
| WAIT_FOR_EVENT / WAIT_UNTIL | Implemented |
| EXECUTE_WORKFLOW (sub-workflows) | Implemented |
| Loop prevention (__workflowDepth) | Implemented |
| `workflow/completed` event | Implemented |

#### Issues Found

- **Missing `getExecutionDetail` procedure** -- Phase 7D plan specifies this for debugging execution traces. The `getExecutions` procedure exists but returns a list; no single-execution detail view exists.
- **`validateGraph` uses `as any` cast** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow/workflow.router.ts` line 55: `workflowService.validateGraph(input.nodes as any, input.edges as any)` -- this bypasses type safety.
- **CREATE_TASK action is a stub** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow/engine/actions.ts` line 133-134: "CREATE_TASK stub -- no tasks table yet" -- but the `tasks` table exists in the schema (`shared.schema.ts` line 348).

#### Recommended Changes

- Add `getExecutionDetail` procedure per Phase 7D spec
- Fix `as any` casts in validateGraph router call
- Implement CREATE_TASK action fully -- tasks table already exists in schema
- Add performance index verification for `workflow_executions` table

---

### 5. Payment Module

**Files:** `src/modules/payment/` (14 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Invoice CRUD (create, find, list) | Implemented |
| Invoice state machine | Implemented |
| Send/void invoice | Implemented |
| Record payment | Implemented |
| Optimistic concurrency (version field) | Implemented |
| Stripe provider (createPaymentIntent) | Implemented |
| Stripe webhook route | Implemented |
| Stripe webhook handler (Inngest) | **Stub** |
| GoCardless provider | **Stub** |
| Cash provider | Implemented |
| Pricing rules engine | Implemented (lib) |
| Tax engine | Implemented (lib) |
| Invoice PDF generation | **Missing** |
| Overdue invoice cron | **Stub** |
| Discount code application | **Partial** (repository only) |
| Refund processing | **Missing** |
| Payment dispute handling | **Missing** |
| Pricing rules CRUD (create, update, delete) | **Missing** (list only) |
| Tax rules CRUD | **Missing** (list only) |
| Discount codes CRUD | **Missing** (findDiscountCode only) |

#### Issues Found

- **Stripe webhook handler is all TODOs** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/payment/payment.events.ts` lines 17-33: All three cases (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`) have TODO comments with no actual implementation.
- **Overdue invoice cron is a TODO** -- Same file, line 48: "TODO: query invoices with dueDate < NOW() in SENT|VIEWED|PARTIALLY_PAID status"
- **GoCardless provider is a stub** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/payment/providers/gocardless.provider.ts` -- both `createMandate()` and `createPayment()` throw `BadRequestError('GoCardless not configured')`.
- **Booking saga still uses invoice stubs** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/booking/booking.service.ts` lines 229 and 438: `createInvoiceForBooking` returns `{ id: \`invoice-stub-${bId}\` }` instead of calling `paymentService.createInvoiceForBooking()`.
- **Invoice number generation uses random numbers** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/payment/payment.repository.ts` line 14: `Math.floor(Math.random() * 900000)` -- this can produce duplicates. Should use a database sequence.
- **No refund flow** -- Phase 6 architecture specifies `PAID -> REFUNDED` transition and `payment/refund.requested` event, but no refund procedure exists.
- **Missing CRUD for pricing rules, tax rules, discount codes** -- Repository has read methods but router only exposes `listPricingRules`. No create/update/delete operations for any of these.

#### Recommended Changes

- Implement Stripe webhook handler logic (update payment status, emit events)
- Implement overdue invoice cron
- Wire booking saga to actual `paymentService.createInvoiceForBooking()` instead of stubs
- Add refund processing flow
- Add CRUD endpoints for pricing rules, tax rules, and discount codes
- Replace random invoice number with database sequence
- Add invoice PDF generation (planned in Phase 6 architecture)

---

### 6. Developer Module

**Files:** `src/modules/developer/` (8 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Webhook endpoint CRUD | Implemented |
| Webhook delivery (with HMAC signing) | Implemented |
| Webhook dispatch (Inngest) | Implemented |
| API key management (list, create, revoke) | **Missing** |
| REST API via trpc-openapi | **Missing** |
| OpenAPI spec generation | **Missing** |
| Rate limiting for API keys | **Missing** |
| API key middleware (authenticate requests) | **Missing** |

#### Issues Found

- **No API key management** -- The `apiKeys` table exists in the schema (Phase 5) with 12 columns, but there are no CRUD procedures for API keys anywhere in the codebase. The Phase 7D plan puts this in the settings module, but it does not exist there either.
- **No REST API exposure** -- Phase 6 architecture specifies `trpc-openapi` for REST at `/api/v1/[...path]`, but this is not implemented.
- **Webhook delivery test uses `vi.stubGlobal('fetch')`** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/developer/__tests__/webhook-delivery.test.ts` line 185 -- acceptable pattern but worth noting.

#### Recommended Changes

- Implement API key CRUD (either in developer module or settings module per Phase 7D)
- Add API key authentication middleware
- Consider REST API exposure via trpc-openapi if external API access is needed

---

### 7. Platform Module

**Files:** `src/modules/platform/` (6 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Tenant CRUD (list, get, create, update) | Implemented |
| Tenant provisioning with modules | Implemented |
| Suspend/activate tenant | Implemented |
| Plan management | Implemented |
| Feature flags CRUD | Implemented |
| Tenant feature flag overrides | Implemented |
| Signup request management | Implemented |
| Tenant modules management | Implemented |
| Audit log (platform-level) | Implemented |
| Impersonation (start/end/getActive) | Implemented |

#### Issues Found

- **No tests** -- Zero test files exist for the platform module. This is a high-risk module (tenant provisioning, impersonation) with no test coverage.
- **`approveSignup` has a bug** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/platform/platform.service.ts` line 361: It calls `listSignupRequests({ limit: 1 })` and then does `.find(r => r.id === input.id)`. This will always fail if the desired request is not the first one returned. Should use a `getSignupRequestById()` method instead.
- **Impersonation bypasses tenant isolation partially** -- The impersonation flow correctly overrides `tenantId` in context (line 579 of `trpc.ts`), but it uses the platform admin's own user record, not a user within the target tenant. This means the admin has their own roles/permissions, not the tenant's. This may be intentional but should be documented.
- **Platform admin procedure does duplicate user lookup** -- `platformAdminProcedure` in `trpc.ts` looks up the user independently from `tenantProcedure`, which means if a platform admin calls a tenant procedure, the user is looked up twice.
- **SQL injection risk in listTenants** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/platform/platform.repository.ts` line 129: `ilike(tenants.name, \`%${opts.search}%\`)` -- the search parameter is interpolated directly into the ILIKE pattern. While Drizzle parameterizes the value, the `%` wildcards could allow pattern injection. This is low-severity but should use proper escaping.

#### Recommended Changes

- Add comprehensive tests for platform module (tenant provisioning, impersonation flow, plan changes)
- Fix `approveSignup` to query by ID directly instead of listing and filtering
- Escape ILIKE search patterns to prevent wildcard injection

---

### 8. Tenant Module

**Files:** `src/modules/tenant/` (7 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Organization settings CRUD | Implemented |
| Public settings (for portal) | Implemented |
| Module gating (`isModuleEnabled`) | Implemented |
| Module listing/toggling | Implemented |
| Module config update | Implemented |
| Venue CRUD | Implemented |
| Plan/billing (read-only) | **Partial** |
| Usage stats | **Stub** |

#### Issues Found

- **No tests** -- Zero test files for tenant module.
- **`getUsage` is a stub** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/tenant/tenant.service.ts` lines 199-209: Returns `{ bookingCount: 0, staffCount: 0 }`. Comment says "Stub -- return zeros for Phase 5."
- **`deleteVenue` does hard delete** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/tenant/tenant.repository.ts` line 494: Uses `db.delete()` instead of soft delete. This permanently removes venue data and could break referential integrity with bookings.
- **Customer CRUD procedures use `tenantProcedure` for writes** -- The `create` and `update` customer procedures use `tenantProcedure` instead of `permissionProcedure('customers:write')`. Any authenticated tenant user can create/update customers without RBAC checks. This matches the Phase 5 plan but may be a security gap for production.

#### Recommended Changes

- Add tests for tenant module (settings CRUD, module toggling, venue management)
- Implement `getUsage` with actual DB counts
- Change `deleteVenue` to soft delete (set `active = false` or add `deletedAt` column)

---

### 9. Booking Module

**Files:** `src/modules/booking/` (14 files including sub-routers and lib/)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Full booking lifecycle (CRUD) | Implemented |
| State machine (RESERVED/PENDING/CONFIRMED/COMPLETED/CANCELLED/etc.) | Implemented |
| Slot-based booking with distributed locks | Implemented |
| Multi-staff assignments | Implemented |
| Confirmation saga (status + invoice + notification) | **Partial** (invoice is stubbed) |
| Optimistic concurrency | Implemented |
| Reservation expiry (15-min timeout via Inngest) | Implemented |
| Calendar sync integration | Implemented |
| Approval flow | Implemented |
| Completion flow with review request | Implemented |
| Portal booking (public procedures) | Implemented |

#### Issues Found

- **Invoice creation in booking saga is stubbed** -- As noted in Payment section: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/booking/booking.service.ts` lines 226-233 and 435-442 return `{ id: \`invoice-stub-${bId}\` }`. The `paymentService.createInvoiceForBooking()` method exists and should be wired in.
- **Void invoice in saga is no-op** -- Lines 231-233: `voidInvoice: async (_invoiceId) => { /* Stub: no-op */ }` -- saga compensation cannot void invoices.

#### Recommended Changes

- Wire `createInvoiceForBooking` to actual `paymentService.createInvoiceForBooking()`
- Wire `voidInvoice` to actual `paymentService.voidInvoice()`

---

### 10. Team Module

**Files:** `src/modules/team/` (8 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Staff CRUD (list, getById, create, update, deactivate) | Implemented |
| Availability management (get, set, blockDates) | Implemented |
| Capacity management (get, set) | Implemented |
| Schedule view | Implemented |
| Availability precedence (BLOCKED > SPECIFIC > RECURRING) | Implemented |
| 3-level capacity fallback | Implemented |
| Inngest events (team member created/updated) | Implemented |

#### Issues Found

- Good implementation overall. Test coverage exists (`team.availability.test.ts`).
- No significant gaps identified.

---

### 11. Customer Module

**Files:** `src/modules/customer/` (7 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| CRUD (list, getById, create, update, delete) | Implemented |
| Soft delete | Implemented |
| 7-table merge cascade | Implemented |
| GDPR anonymisation | Implemented |
| Notes CRUD | Implemented |
| Booking history | Implemented |
| Audit log on merge | **Workaround** |

#### Issues Found

- **Merge audit uses log.warn instead of auditLogs table** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/customer/customer.service.ts` lines 158-170: Comment says "auditLogs table does not exist in this schema -- log the merge instead." But the auditLogs table DOES exist (it's used by the platform module). This should write to the actual audit log.
- **Test coverage exists** -- `customer.service.test.ts` covers core operations.

#### Recommended Changes

- Wire merge audit to `platformRepository.insertAuditLog()` or create a shared audit service
- The customer `create` and `update` procedures use `tenantProcedure` -- consider whether `permissionProcedure('customers:write')` is needed

---

### 12. Forms Module

**Files:** `src/modules/forms/` (8 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Template CRUD | Implemented |
| Form sending | Implemented |
| Public form access (token-based) | Implemented |
| Form submission with validation | Implemented |
| Response listing | Implemented |
| Inngest event on submission | Implemented |

#### Issues Found

- Good implementation. No significant gaps.
- Test coverage exists (`forms.service.test.ts`).

---

### 13. Review Module

**Files:** `src/modules/review/` (8 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Review CRUD (list, getById) | Implemented |
| Public review submission (token-based) | Implemented |
| Review request management | Implemented |
| Automation settings | Implemented |
| Issue resolution workflow | Implemented |
| Pre-screening | Implemented |
| Inngest events | Implemented |

#### Issues Found

- Good implementation. No significant gaps.
- Test coverage exists (`review.service.test.ts`).

---

### 14. Search Module

**Files:** `src/modules/search/` (4 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Global search (customers + bookings) | Implemented |
| Full-text search (tsvector) | Implemented |

#### Issues Found

- **No tests** -- Zero test files for search module.
- **Limited search types** -- Only searches customers and bookings. Phase 6 architecture mentions services, staff, and other entity types.
- **No pagination** -- Results limited by `limit` parameter but no cursor/offset pagination.

#### Recommended Changes

- Add tests
- Consider expanding search to include services, staff, workflows

---

### 15. Scheduling Module

**Files:** `src/modules/scheduling/` (15 files including lib/)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Slot management (create, bulk, recurring) | Implemented |
| Staff availability checking | Implemented |
| Smart assignment (round-robin, least-loaded, skill-match) | Implemented |
| Waitlist | Implemented |
| Travel time calculation | Implemented |
| Assignment health | **Stub** |
| Scheduling alerts | **Stub** |
| Staff recommendations | **Stub** |
| Available staff for slot | **Stub** |

#### Issues Found

- **4 service methods are stubs** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/scheduling/scheduling.service.ts`:
  - `getAvailableStaffForSlot()` (line 240-245): Returns empty array with TODO
  - `getStaffRecommendations()` (line 252-257): Returns empty array with TODO
  - `getSchedulingAlerts()` (line 269-274): Returns empty array with TODO
  - `getAssignmentHealth()` (line 282-289): Returns hardcoded "optimal" with TODO
- **Inngest event handler has stubs** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/scheduling/scheduling.events.ts` lines 26-28: "TODO Phase 4: load booking with customer details" and line 53: "TODO Phase 4: emit notification events"

#### Recommended Changes

- Wire stub methods to booking repository for actual data
- Complete Inngest event handlers

---

### 16. Notification Module

**Files:** `src/modules/notification/` (13 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Email sending (Resend provider) | Implemented |
| SMS sending (Twilio provider) | Implemented |
| Console providers (dev) | Implemented |
| Template engine | Implemented |
| Variable builder | Implemented |
| Inngest event handlers | Implemented |

#### Issues Found

- **No tests** -- Zero test files for notification module.
- No significant implementation gaps.

---

### 17. Calendar Sync Module

**Files:** `src/modules/calendar-sync/` (14 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| Google Calendar integration | Implemented |
| Google webhook handling | Implemented |
| Google OAuth flow | Implemented |
| Outlook Calendar | **Stub** |
| Apple Calendar | **Stub** |
| Rate limiting | Implemented |
| Event mapper | Implemented |
| Provider factory | Implemented |

#### Issues Found

- **Outlook provider is entirely unimplemented** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/calendar-sync/providers/outlook/index.ts`: All methods throw `Error('not yet implemented')`.
- **Apple provider is entirely unimplemented** -- Same pattern at `/Users/lukehodges/Documents/ironheart-refactor/src/modules/calendar-sync/providers/apple/index.ts`.
- **No tests** -- Zero test files for calendar-sync module.
- This is documented as a known gap in Phase 6 architecture.

---

### 18. Auth Module

**Files:** `src/modules/auth/` (9 files)

#### Planned vs Implemented

| Feature | Status |
|---------|--------|
| WorkOS AuthKit integration | Implemented |
| RBAC permission checking | Implemented |
| Tenant resolution from slug | Implemented |
| WorkOS user ID backfill | Implemented |
| Auth hooks (client-side) | **Partial** |

#### Issues Found

- **Auth hooks have TODO** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/hooks.ts` line 63: "TODO: wire to tRPC auth.me query once tRPC client provider is set up."
- Test coverage exists (`rbac.test.ts`).

---

## Cross-Cutting Concerns

### Error Handling

**Critical Gap: Domain errors are not auto-converted to TRPCErrors.**

The `toTRPCError()` function exists in `/Users/lukehodges/Documents/ironheart-refactor/src/shared/errors.ts` (line 69), but it is **never called by any module**. A grep for `toTRPCError` in `src/modules/` returns zero results.

The `errorFormatter` in `trpc.ts` (line 203) only captures errors to Sentry -- it does NOT convert domain errors. This means when a service throws `NotFoundError('Booking', id)`, tRPC wraps it as `INTERNAL_SERVER_ERROR` unless the middleware catches and re-throws it.

**However**, looking more carefully at tRPC v11 behavior: tRPC re-throws non-TRPCError exceptions as INTERNAL_SERVER_ERROR with the original error set as `cause`. The error formatter sees the cause name but does not remap the code. This means:
- `NotFoundError` -> returns as HTTP 500 INTERNAL_SERVER_ERROR (incorrect; should be 404)
- `ForbiddenError` -> returns as HTTP 500 INTERNAL_SERVER_ERROR (incorrect; should be 403)

**This is a production-critical bug.** All services correctly throw domain errors, but they are surfaced to clients as 500 errors.

**Fix:** Either add error conversion middleware to all procedures, or modify the tRPC initialization to use an `onError` handler that converts domain errors to TRPCErrors.

### Module Gating Middleware

**Stub -- never enforces module access.**

`/Users/lukehodges/Documents/ironheart-refactor/src/shared/trpc.ts` lines 789-798: The `createModuleMiddleware()` function has a TODO comment from Phase 0 and always passes through. No module ever calls `tenantService.isModuleEnabled()` at the procedure level.

This means a tenant could access review features even if the review module is disabled for their account. The `isModuleEnabled()` method exists in the tenant service and works correctly -- it just is never used as middleware.

**Fix:** Replace the stub with actual module checking using `tenantService.isModuleEnabled()`.

### Logging

Logging is consistently implemented across all modules:
- All services use `logger.child({ module: 'xxx.service' })` pattern
- Pino v8 argument order (object first, message second) is followed consistently
- No instances of incorrect argument order found

### Inngest Event Registration

All Inngest functions are properly registered at `/Users/lukehodges/Documents/ironheart-refactor/src/app/api/inngest/route.ts`. The event catalog in `src/shared/inngest.ts` is comprehensive with 18 typed events.

**Missing events from plan:**
- `payment/intent.created` -- defined in Phase 6 architecture but not in the Inngest event catalog
- `payment/refund.requested` and `payment/refund.completed` -- defined in plan but missing
- `calendar/disconnected` -- mentioned in Phase 7D settings plan but missing
- `tenant/deleted` and `tenant/export.requested` -- mentioned in Phase 7D but missing

### Rate Limiting

- IP-based rate limiting on public procedures: Implemented (60 req/min)
- User-based rate limiting on authenticated procedures: Implemented (300 req/min)
- Both properly skip in test environment and when UPSTASH_REDIS_REST_URL is not set.
- No API key-based rate limiting (API keys not implemented)

### Tenant Isolation

Tenant isolation is enforced at multiple levels:
- `tenantProcedure` middleware validates user belongs to requested tenant (line 613 of trpc.ts)
- Repository methods consistently filter by `tenantId`
- Platform admin can access any tenant (intentional)
- Impersonation correctly overrides tenant context

**One gap:** The `platformAdminProcedure` does not receive tenant context -- procedures using it (like `listTenants`) query across all tenants intentionally. This is correct design.

### Test Coverage

**Test files by module:**

| Module | Test File | Exists |
|--------|-----------|--------|
| analytics | analytics-intelligence.test.ts | Yes |
| auth | rbac.test.ts | Yes |
| booking | booking.service.test.ts, booking-state-machine.test.ts | Yes |
| customer | customer.service.test.ts | Yes |
| developer | webhook-delivery.test.ts | Yes |
| forms | forms.service.test.ts | Yes |
| payment | payment-state-machine.test.ts | Yes |
| review | review.service.test.ts | Yes |
| scheduling | smart-assignment.test.ts | Yes |
| team | team.availability.test.ts | Yes |
| workflow | 7 test files (conditions, context, expressions, graph, linear, validate, expressions) | Yes |
| **platform** | -- | **No** |
| **tenant** | -- | **No** |
| **notification** | -- | **No** |
| **calendar-sync** | -- | **No** |
| **search** | -- | **No** |

**Missing test areas:**
- Platform module (critical -- handles impersonation, tenant provisioning)
- Tenant module (settings, module toggling, venues)
- Notification service
- Calendar sync service
- Search functionality
- Analytics service (existing test only covers customer intelligence lib, not the service/router)
- Payment service (existing test only covers state machine, not the service)

---

## Priority Actions

### Must Fix (Critical)

1. **Domain error conversion** -- Services throw `NotFoundError`, `ForbiddenError`, etc. but these are never converted to proper TRPCError codes. All domain errors currently return as HTTP 500 to clients. Add error conversion middleware or modify tRPC error handling.
   - Files: `/Users/lukehodges/Documents/ironheart-refactor/src/shared/trpc.ts`

2. **Booking saga invoice stubs** -- Booking confirmations create fake invoice IDs (`invoice-stub-${bId}`) instead of real invoices. The `paymentService.createInvoiceForBooking()` method exists and should be wired in.
   - Files: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/booking/booking.service.ts` lines 226-233, 435-442

3. **Stripe webhook handler TODOs** -- All Stripe event handlers are TODO stubs. Payment intent success, failure, and dispute events are received but silently dropped.
   - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/payment/payment.events.ts` lines 17-33

4. **Analytics `getSummary` returns hardcoded zeros** -- The primary analytics endpoint returns no data.
   - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.router.ts` lines 18-29

5. **Analytics `getCustomerInsights` is a stub** -- Returns fake data instead of querying the database.
   - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.service.ts` lines 42-69

### Should Add (Important)

6. **Phase 7D: Settings module** -- Create `src/modules/settings/` with all 12 procedures (general, notifications, integrations, billing, modules, API keys, danger zone).

7. **Phase 7D: Audit module** -- Create `src/modules/audit/` with list + exportCsv procedures.

8. **Phase 7D: Analytics procedures** -- Add 6 new analytics procedures (getKPIs, getRevenueChart, getBookingsByStatus, getTopServices, getStaffUtilization, getChurnRisk).

9. **Module gating middleware** -- Replace the `createModuleMiddleware()` stub with actual module checking. Currently in `/Users/lukehodges/Documents/ironheart-refactor/src/shared/trpc.ts` lines 789-798.

10. **Overdue invoice cron** -- Implement the daily cron that marks invoices as OVERDUE.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/payment/payment.events.ts` lines 42-52

11. **Platform module tests** -- Critical module with zero test coverage. Impersonation flow and tenant provisioning should be tested.

12. **Customer merge audit log** -- Wire to actual auditLogs table instead of log.warn workaround.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/customer/customer.service.ts` lines 158-170

13. **`approveSignup` bug fix** -- Replace `listSignupRequests({ limit: 1 }).find()` with a direct `getById()` query.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/platform/platform.service.ts` lines 361-362

### Nice to Have (Enhancement)

14. **Payment CRUD completeness** -- Add create/update/delete for pricing rules, tax rules, and discount codes. Currently only list/read exists.

15. **Scheduling service stubs** -- Wire `getAvailableStaffForSlot()`, `getStaffRecommendations()`, `getSchedulingAlerts()`, `getAssignmentHealth()` to actual data.

16. **Invoice number sequence** -- Replace `Math.random()` based invoice numbers with a proper database sequence to prevent duplicates.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/payment/payment.repository.ts` lines 11-15

17. **Refund processing** -- Add refund flow (PAID -> REFUNDED transition exists in state machine but no procedure to trigger it).

18. **Search module expansion** -- Add search for services, staff, workflows. Add cursor pagination.

19. **Notification module tests** -- Add test coverage for email/SMS sending.

20. **Calendar sync tests** -- Add test coverage for Google Calendar sync flow.

21. **Analytics upsert atomicity** -- Replace delete-then-insert in `upsertSnapshot()` with proper `ON CONFLICT DO UPDATE`.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.repository.ts` lines 37-56

22. **Redis caching for analytics** -- Add per Phase 7D spec (5-min TTL for KPIs, 1-hour for churn risk).

23. **Venue soft delete** -- Change hard delete to soft delete.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/tenant/tenant.repository.ts` lines 491-497

24. **CREATE_TASK workflow action** -- Implement fully; tasks table exists in schema.
    - File: `/Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow/engine/actions.ts` lines 133-134

### Should Remove (Cleanup)

25. **Dead schemas in analytics** -- `staffPerformanceSchema`, `revenueSchema`, `funnelSchema` in `/Users/lukehodges/Documents/ironheart-refactor/src/modules/analytics/analytics.schemas.ts` are defined but never used by any router procedure. Either implement the corresponding procedures or remove the dead schemas.

26. **`generateSlug` unused function** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/platform/platform.service.ts` line 45-53: The `generateSlug()` helper is defined but never called; the slug generation is done inline in `provisionTenant()`.

27. **Duplicate expression test files** -- Both `/Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow/__tests__/expressions.test.ts` and `/Users/lukehodges/Documents/ironheart-refactor/src/modules/workflow/engine/__tests__/expressions.test.ts` exist. One may be a duplicate.

28. **Auth hooks TODO** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/hooks.ts` line 63: Old TODO about wiring to tRPC. Clean up or implement.

29. **Scheduling event handler stubs** -- `/Users/lukehodges/Documents/ironheart-refactor/src/modules/scheduling/scheduling.events.ts` lines 26-28 and 53: Phase 4 TODOs that should have been resolved.

---

## Summary Table

| Area | Health | Key Issue |
|------|--------|-----------|
| Booking | Good | Invoice saga uses stubs |
| Workflow Engine | Good | CREATE_TASK is stubbed |
| Team | Good | No significant gaps |
| Customer | Good | Merge audit not written to DB |
| Forms | Good | No significant gaps |
| Review | Good | No significant gaps |
| Tenant | Fair | getUsage is stubbed, no tests |
| Platform | Fair | approveSignup bug, no tests |
| Payment | Poor | Stripe handlers are TODOs, no refunds |
| Analytics | Poor | 2 stubs, 6 planned procedures missing |
| Developer | Fair | No API key management |
| Settings (7D) | Missing | Entire module not created |
| Audit (7D) | Missing | Entire module not created |
| Search | Fair | No tests, limited scope |
| Scheduling | Fair | 4 stub methods |
| Notification | Fair | No tests |
| Calendar Sync | Fair | Outlook/Apple are stubs, no tests |
| Error Handling | Critical | Domain errors return as HTTP 500 |
