# Unified Remediation Plan

## Status
- **Date:** 2026-02-21
- **Module system:** COMPLETE (Tasks 1-13 from implementation plan done)
- **Remediation scope:** Full (server + client)
- **Source plans:** `REMEDIATION_SERVER_SIDE.md` (30 tasks), `REMEDIATION_CLIENT_SIDE.md` (33 tasks)

## Verified Infrastructure (Module System)

The following is confirmed as **fully operational** by reading the actual source files:

| Component | File | Status |
|-----------|------|--------|
| `createModuleMiddleware(slug)` | `src/shared/trpc.ts:747-766` | REAL — uses lazy import of tenantService.isModuleEnabled() |
| `createModuleGate(slug)` | `src/shared/module-system/module-gate.ts` | REAL — for Next.js page-level gating |
| `auditLog(input)` | `src/shared/audit/audit-logger.ts` | REAL — fire-and-forget insert into auditLogs table |
| `ModuleRegistry` | `src/shared/module-system/registry.ts` | REAL — dependency graph, tenant-scoped queries |
| `register-all.ts` | `src/shared/module-system/register-all.ts` | REAL — all 18 modules registered |
| `buildNavSections()` | `src/components/layout/nav-builder.ts` | REAL — builds sidebar from registry |
| Widget system | `src/shared/module-system/widgets/` | REAL — custom widget registry + standard types |
| `toTRPCError()` | `src/shared/errors.ts:69-95` | EXISTS — but not wired as middleware |
| `nav-config.ts` | `src/components/layout/nav-config.ts` | STILL EXISTS — hardcoded, needs replacement |
| `use-analytics-data.ts` | `src/hooks/use-analytics-data.ts` | STILL STUBBED — returns undefined for all queries |
| `use-settings-mutations.ts` | `src/hooks/use-settings-mutations.ts` | STILL STUBBED — all mutations are no-ops |
| `use-audit-log.ts` | `src/hooks/use-audit-log.ts` | STILL STUBBED — wrong import (`@/lib/trpc/client`) |
| `use-workflow-mutations.ts` | `src/hooks/use-workflow-mutations.ts` | PARTIAL — create/update/delete real, activate/deactivate stubbed |

---

## Items Completed by Module System

These tasks from the original S and C plans are **DONE** and should be removed:

| Original ID | Task | Why It's Done |
|-------------|------|---------------|
| **S2.2** | Module Gating Middleware | `createModuleMiddleware()` in `src/shared/trpc.ts:747-766` is real. Uses lazy import of `tenantService.isModuleEnabled()` with Redis cache. |
| **Impl T1-T3** | Module manifest types, registry, barrel export | `src/shared/module-system/types.ts`, `registry.ts`, `index.ts` all exist |
| **Impl T4** | createModuleMiddleware real implementation | Done in `src/shared/trpc.ts:747-766` |
| **Impl T5** | Shared audit logger | `src/shared/audit/audit-logger.ts` is real |
| **Impl T6-T9** | All 18 module manifests | All `*.manifest.ts` files exist, registered in `register-all.ts` |
| **Impl T10** | Customer contract | `src/modules/customer/customer.contract.ts` exists |
| **Impl T11** | Nav builder | `src/components/layout/nav-builder.ts` exists |
| **Impl T12** | Widget system | `src/shared/module-system/widgets/` directory exists |
| **Impl T13** | Integration tests | Tests exist and pass |

---

## Items Simplified by Module System

These tasks still need work but can now leverage the module system infrastructure:

| Original ID | Task | What Changed |
|-------------|------|-------------|
| **S2.3** | Customer Merge Audit Log | **Use `auditLog()` from `@/shared/audit`** instead of importing `platformRepository.insertAuditLog`. Signature: `auditLog({ tenantId, actorId, action: 'updated', resourceType: 'customer', resourceId, resourceName, changes })`. |
| **S3.1** | Settings Module | **Use manifest system for module tabs.** Core tabs are always present. Module-specific settings tabs come from `registry.getEnabledManifests(slugs).filter(m => m.settingsTab)`. The settings page should render both core tabs and manifest-declared module tabs dynamically. |
| **S3.2** | Audit Module | **Use `auditResources` from manifests** to populate the resource type filter dropdown: `registry.getEnabledManifests(enabledSlugs).flatMap(m => m.auditResources ?? [])`. Historical entries from disabled modules still appear in the timeline. |
| **C1.3** | Dead Nav Links | **Replace `nav-config.ts` with `nav-builder.ts`.** Instead of removing items from the hardcoded config, wire the sidebar component to call `buildNavSections(registry, enabledSlugs, permissions, isPlatformAdmin)`. The nav-builder already exists and reads from the module registry. Pages that don't exist yet simply won't have their module enabled. |
| **C2.2** | Analytics Hook | **Use widget registry for discovery.** The module system declares `analyticsWidgets` per module. Frontend should use `registry.getAnalyticsWidgets(enabledSlugs)` to discover available widgets. However, the actual data endpoints still need wiring. |
| **C2.7** | Audit Log Hook | **Wire to new audit module** (created in this plan) instead of `platform.getAuditLog`. The audit module will be tenant-scoped, not platform-admin only. |
| **All C4.x** | New Pages | **Use `withModuleGate(slug, Component)` pattern** from `src/shared/module-system/module-gate.ts`. Each new page wraps with the module gate so disabled modules redirect to `/admin`. |

---

## Execution Waves

### Wave 1: Foundation Fixes (all independent, max parallelism)

8 tasks, 0 dependencies between them. Assign to 4+ parallel agents.

#### U1.1: Domain Error to tRPC Error Conversion
- **Source:** S1.1
- **Type:** Server
- **Effort:** Medium
- **Files to modify:** `src/shared/trpc.ts`
- **Approach:** Add `errorConversionMiddleware` after `loggingMiddleware` that catches `IronheartError` and calls `toTRPCError()` from `src/shared/errors.ts`. Wire into `publicProcedure` and `protectedProcedure` chains so all downstream procedures inherit it.
- **Key detail:** `toTRPCError()` already exists at `src/shared/errors.ts:69-95`. It handles `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `ConflictError`, `BadRequestError`. Just need to invoke it as middleware.
- **Dependencies:** None

#### U1.2: approveSignup Bug Fix
- **Source:** S2.1
- **Type:** Server
- **Effort:** Small
- **Files to modify:**
  - `src/modules/platform/platform.repository.ts` (add `findSignupRequestById`)
  - `src/modules/platform/platform.service.ts` (replace `listSignupRequests({ limit: 1 }).find()` with direct lookup)
- **Approach:** Add `findSignupRequestById(id)` to repository. Replace the faulty `listSignupRequests` + `.find()` pattern in service.
- **Dependencies:** None

#### U1.3: Customer Merge Audit Log (SIMPLIFIED)
- **Source:** S2.3
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/customer/customer.service.ts` (lines 158-170)
- **Approach:** Replace the `log.warn` with a call to the shared audit logger:
  ```typescript
  import { auditLog } from '@/shared/audit'

  await auditLog({
    tenantId: ctx.tenantId,
    actorId: ctx.user?.id ?? 'system',
    action: 'updated',
    resourceType: 'customer',
    resourceId: sourceId,
    resourceName: `Customer merge: ${sourceId} -> ${targetId}`,
    changes: [{ field: 'mergedIntoId', before: null, after: targetId }],
  })
  ```
- **Dependencies:** None

#### U1.4: Venue Soft Delete
- **Source:** S2.7
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/tenant/tenant.repository.ts` (lines 491-497)
- **Approach:** Replace `db.delete()` with `db.update().set({ active: false, updatedAt: new Date() })`.
- **Dependencies:** None

#### U1.5: Invoice Number Sequence
- **Source:** S2.8
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/payment/payment.repository.ts` (lines 11-16)
- **Approach:** Replace `Math.random()` with Redis `INCR` for tenant-scoped, year-scoped atomic counter: `invoice:counter:{tenantId}:{year}`.
- **Dependencies:** None

#### U1.6: Replace alert() in Billing Tab
- **Source:** C1.4
- **Type:** Client
- **Effort:** Small
- **Files to modify:** `src/components/settings/billing-tab.tsx`
- **Approach:** Replace `alert()` call with `toast.info("Upgrade flow coming soon", { description: "Stripe integration will be available in a future update." })`.
- **Dependencies:** None

#### U1.7: Un-comment Audit Page Error Handling
- **Source:** C1.5
- **Type:** Client
- **Effort:** Small
- **Files to modify:** `src/app/(admin)/admin/audit/page.tsx`
- **Approach:** Remove `{/* ... */}` comment wrappers around the error block (lines 149-174). Activate the error UI.
- **Dependencies:** None

#### U1.8: Wire FormFieldRenderer into Forms Page
- **Source:** C1.1
- **Type:** Client
- **Effort:** Small
- **Files to modify:** `src/app/forms/[sessionKey]/page.tsx`
- **Approach:** Import `FormFieldRenderer` from `@/components/public-form/form-field-renderer` and replace placeholder divs with the real component. Add type-specific validation (email format).
- **Dependencies:** None

---

### Wave 2: Server Critical Stubs (3 parallel agents)

5 tasks. All depend on U1.1 (error conversion) being complete.

#### U2.1: Analytics getSummary — Replace Hardcoded Zeros
- **Source:** S1.2
- **Type:** Server
- **Effort:** Medium
- **Files to modify:**
  - `src/modules/analytics/analytics.repository.ts` (add 5 aggregation queries)
  - `src/modules/analytics/analytics.service.ts` (add `getSummary` method)
  - `src/modules/analytics/analytics.router.ts` (wire to service)
- **Approach:** Add real DB aggregation queries for bookings, revenue, outstanding, customers, reviews. Use `Promise.all` for parallel execution. Move `getPeriodStart` to shared utility.
- **Dependencies:** U1.1

#### U2.2: Analytics getCustomerInsights — Replace Stub
- **Source:** S1.3
- **Type:** Server
- **Effort:** Medium
- **Files to modify:**
  - `src/modules/analytics/analytics.repository.ts` (add `getCustomerBookingStats`)
  - `src/modules/analytics/analytics.service.ts` (replace fake values with real RFM computation)
- **Approach:** Query `bookings` table for real customer stats, compute RFM metrics, use existing `computeChurnScore`/`computeChurnLabel`.
- **Dependencies:** U1.1, can parallel with U2.1

#### U2.3: Booking Saga — Wire Real Invoice Creation
- **Source:** S1.4
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/booking/booking.service.ts` (lines 226-233 and 435-442)
- **Approach:** Import `paymentService` and replace stub callbacks with real `createInvoiceForBooking()` and `voidInvoice()` calls.
- **Dependencies:** U1.1

#### U2.4: Stripe Webhook Handlers
- **Source:** S1.5
- **Type:** Server
- **Effort:** Medium
- **Files to modify:** `src/modules/payment/payment.events.ts` (lines 14-38)
- **Approach:** Implement `payment_intent.succeeded` (record payment, emit event), `payment_intent.payment_failed` (emit event), `charge.dispute.created` (emit event). Import `paymentService`.
- **Dependencies:** U1.1

#### U2.5: Overdue Invoice Cron
- **Source:** S2.4
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/payment/payment.events.ts` (lines 46-50)
- **Approach:** Query invoices past due date in payable statuses, iterate and call `paymentRepository.updateInvoiceStatus()` for each.
- **Dependencies:** None (independent of U1.1)

---

### Wave 3: Client Data Wiring + Sidebar Replacement (4 parallel agents)

13 tasks. Can start as soon as Wave 1 completes. Wave 2 server stubs can proceed in parallel.

**Agent A: Dashboard + Analytics**

#### U3.1: Wire Dashboard to Live Data
- **Source:** C2.1
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** `src/app/admin/page.tsx`
- **Approach:** Convert to client component. Fetch `analytics.getSummary({ period: "TODAY" })` for KPIs and `booking.list({ limit: 5 })` for activity feed. Wire "New Booking" button to router.push. Add loading skeletons.
- **Dependencies:** U2.1 (backend getSummary must be real first)

#### U3.2: Wire Analytics Hook
- **Source:** C2.2
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** `src/hooks/use-analytics-data.ts`
- **Approach:** Replace stubs with real tRPC queries. Map filter presets to periods. Wire `kpis` to `analytics.getSummary`, `revenueChart` to `analytics.getTimeSeries`, derive `bookingsByStatus` and `staffUtilization` from summary data. Leave `topServices` and `churnRisk` as stubs until backend endpoints exist.
- **Dependencies:** U2.1 (backend getSummary must be real first)

**Agent B: Settings Tabs**

#### U3.3: Wire Settings General Tab
- **Source:** C2.3
- **Type:** Client
- **Effort:** Medium
- **Files to modify:**
  - `src/hooks/use-settings-mutations.ts` (wire `updateGeneral`)
  - `src/components/settings/general-tab.tsx` (replace hardcoded `currentSettings` with query)
- **Approach:** Wire `updateGeneral` to `api.tenant.updateSettings.useMutation()` with toast + cache invalidation. Wire `currentSettings` to `api.tenant.getSettings.useQuery()`.
- **Dependencies:** None

#### U3.4: Wire Settings Modules Tab
- **Source:** C2.4
- **Type:** Client
- **Effort:** Medium
- **Files to modify:**
  - `src/components/settings/modules-tab.tsx`
  - `src/hooks/use-settings-mutations.ts` (wire `toggleModule`)
- **Approach:** Replace empty `modules` array with `api.tenant.listModules.useQuery()`. Wire toggle to `api.tenant.enableModule` / `api.tenant.disableModule` mutations. Use `moduleRegistry.canDisable()` / `canEnable()` on client side for dependency validation before calling mutation.
- **Dependencies:** U3.3 (shares `use-settings-mutations.ts`)

#### U3.5: Wire Settings Billing Tab
- **Source:** C2.5
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** `src/components/settings/billing-tab.tsx`
- **Approach:** Replace hardcoded `billingData` with `api.tenant.getPlan.useQuery()` + `api.tenant.getUsage.useQuery()`. Use existing `BillingTabSkeleton`.
- **Dependencies:** None

#### U3.6: Wire Settings Notifications Tab
- **Source:** C2.6
- **Type:** Client
- **Effort:** Medium
- **Files to modify:**
  - `src/components/settings/notifications-tab.tsx`
  - `src/hooks/use-settings-mutations.ts` (wire `updateNotifications`)
- **Approach:** Wire to `api.tenant.getSettings.useQuery()` for reading, `api.tenant.updateSettings.useMutation()` for saving notification fields.
- **Dependencies:** U3.3 (shares `use-settings-mutations.ts`)

**Agent C: Audit, Workflow, Customers**

#### U3.7: Wire Audit Log Hook
- **Source:** C2.7
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** `src/hooks/use-audit-log.ts`
- **Approach:**
  1. Fix import: change `@/lib/trpc/client` to `@/lib/trpc/react`
  2. Wire to `api.audit.list.useQuery()` (from new audit module, U4.2) or `api.platform.getAuditLog.useQuery()` as interim
  3. Wire `loadMore` to cursor-based pagination
  4. Wire `exportCsv` mutation
- **Dependencies:** U4.2 (audit module) for full wiring, OR wire to `platform.getAuditLog` as interim

#### U3.8: Wire Workflow Activate/Deactivate
- **Source:** C2.8
- **Type:** Client
- **Effort:** Small
- **Files to modify:** `src/hooks/use-workflow-mutations.ts`
- **Approach:** Replace stub `activate`/`deactivate` with `api.workflow.update.useMutation()` calls passing `{ id, isActive: true/false }`. Each is a separate `useMutation` instance for independent loading/error states.
- **Dependencies:** None

#### U3.9: Populate Customer Aggregate Columns
- **Source:** C2.9
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** `src/app/admin/customers/page.tsx`
- **Approach:** Create `CustomerAggregates` helper component that calls `api.customer.getBookingHistory.useQuery({ customerId }, { staleTime: 5 * 60 * 1000 })` per row. Replace em-dash cells. Accept N+1 for now; add aggregate to `customer.list` response later.
- **Dependencies:** None

**Agent D: Sidebar + Nav + Security**

#### U3.10: Replace nav-config.ts with nav-builder.ts (ADAPTED)
- **Source:** C1.3 (adapted from "Remove Dead Nav Links")
- **Type:** Client
- **Effort:** Medium
- **Files to modify:**
  - `src/components/layout/admin-sidebar.tsx` (or wherever sidebar is rendered)
  - `src/components/layout/nav-config.ts` (deprecate / stop importing)
- **Approach:** Instead of removing individual items from `nav-config.ts`, replace the sidebar's data source entirely. The sidebar should:
  1. Get `enabledSlugs` from a tRPC query or context
  2. Get user `permissions` from auth context
  3. Call `buildNavSections(moduleRegistry, enabledSlugs, permissions, isPlatformAdmin)` from `nav-builder.ts`
  4. Render the resulting `NavSection[]`
  5. Add a static "Dashboard" item at the top (dashboard is not a module)

  This eliminates dead nav links automatically — pages without modules don't appear. The `nav-config.ts` file can be deleted once this is wired.
- **Dependencies:** None

#### U3.11: Wire Settings Security Tab (Webhooks)
- **Source:** C2.10
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** `src/components/settings/security-tab.tsx`
- **Approach:** Replace "Coming soon" webhook section with functional implementation using `developer.listWebhookEndpoints`, `developer.createWebhookEndpoint`, `developer.deleteWebhookEndpoint`.
- **Dependencies:** None

#### U3.12: Wire Settings Danger Tab
- **Source:** C2.11
- **Type:** Client
- **Effort:** Small
- **Files to modify:** `src/components/settings/danger-tab.tsx`
- **Approach:** Fetch real org name via `api.tenant.getSettings.useQuery()`. Disable delete/export buttons with "Coming soon" badges instead of fake success flows.
- **Dependencies:** None

---

### Wave 4: Missing Backend Modules (2 parallel agents)

3 tasks. These create new server-side modules that client tasks in Waves 5-6 depend on.

**Agent A: Settings Module (ADAPTED)**

#### U4.1: Settings Module
- **Source:** S3.1
- **Type:** Server
- **Effort:** Large
- **Files to create:**
  - `src/modules/settings/settings.types.ts` (~100 LOC)
  - `src/modules/settings/settings.schemas.ts` (~150 LOC)
  - `src/modules/settings/settings.repository.ts` (~400 LOC)
  - `src/modules/settings/settings.service.ts` (~800 LOC)
  - `src/modules/settings/settings.router.ts` (~150 LOC)
  - `src/modules/settings/index.ts` (~10 LOC)
- **Files to modify:** `src/server/root.ts` (add `settings: settingsRouter`)
- **Module system adaptation:** Settings page should render tabs in two tiers:
  1. **Core tabs** (always present): General, Security, Billing, Modules, Danger Zone
  2. **Module tabs** (dynamic): `moduleRegistry.getEnabledManifests(enabledSlugs).filter(m => m.settingsTab).map(m => m.settingsTab)`

  This means the settings router does NOT hardcode module-specific tabs. It provides core settings procedures (15 total as in S3.1) and a `getModuleTabs` procedure that returns available module tabs from the registry.

  API key generation uses `crypto.randomBytes(32)` + SHA-256 hash. Audit log entries use `auditLog()` from `@/shared/audit`.
- **Dependencies:** U1.1, U1.3 (audit pattern established)

**Agent B: Audit Module + Workflow Detail (ADAPTED)**

#### U4.2: Audit Module
- **Source:** S3.2
- **Type:** Server
- **Effort:** Medium
- **Files to create:**
  - `src/modules/audit/audit.types.ts` (~50 LOC)
  - `src/modules/audit/audit.schemas.ts` (~80 LOC)
  - `src/modules/audit/audit.repository.ts` (~200 LOC)
  - `src/modules/audit/audit.service.ts` (~300 LOC)
  - `src/modules/audit/audit.router.ts` (~50 LOC)
  - `src/modules/audit/index.ts` (~10 LOC)
- **Files to modify:** `src/server/root.ts` (add `audit: auditRouter`)
- **Module system adaptation:** The resource type filter dropdown should be populated from manifests:
  ```typescript
  // In audit.service.ts or audit.router.ts
  import { moduleRegistry } from '@/shared/module-system/register-all'

  async getFilterOptions(enabledSlugs: string[]) {
    const resourceTypes = moduleRegistry
      .getEnabledManifests(enabledSlugs)
      .flatMap(m => m.auditResources ?? [])
    return { resourceTypes }
  }
  ```
  Historical entries from disabled modules still appear in query results, but disabled modules' resource types don't appear in the filter dropdown.

  **Procedures (3):** `list` (paginated with filters), `exportCsv` (CSV export), `getFilterOptions` (registry-driven filter options).

  **Permission:** `permissionProcedure('audit:read')` for all — tenant-scoped, NOT platform-admin only.
- **Dependencies:** U1.1

#### U4.3: Workflow getExecutionDetail
- **Source:** S3.4
- **Type:** Server
- **Effort:** Small
- **Files to modify:**
  - `src/modules/workflow/workflow.repository.ts` (add `findExecutionById`)
  - `src/modules/workflow/workflow.service.ts` (add `getExecutionDetail`)
  - `src/modules/workflow/workflow.router.ts` (add procedure)
- **Approach:** Standard repo/service/router pattern. Return execution with workflow name, steps, and duration.
- **Dependencies:** None

---

### Wave 5: Client Missing Features + Server Stubs (4 parallel agents)

11 tasks. Mix of client features and remaining server stubs.

**Agent A: Customer Features**

#### U5.1: Customer Edit Dialog
- **Source:** C3.1
- **Type:** Client
- **Effort:** Medium
- **Files to create:** `src/components/customers/customer-edit-dialog.tsx`
- **Files to modify:** `src/app/admin/customers/page.tsx`
- **Approach:** Create dialog following `CustomerCreateDialog` pattern. Pre-populate with `api.customer.getById.useQuery`. Save with `api.customer.update.useMutation`. Invalidate list + getById on success.
- **Dependencies:** None

#### U5.2: Customer Merge Dialog Fix
- **Source:** C1.2
- **Type:** Client
- **Effort:** Medium
- **Files to create:** `src/components/customers/customer-search-dialog.tsx`
- **Files to modify:** `src/app/admin/customers/page.tsx`
- **Approach:** Add two-step merge flow: (1) user clicks "Merge" on a customer -> that's the `secondaryId`; (2) search dialog opens to pick `primaryId` (with debounced search using `api.customer.list`); (3) merge confirmation dialog opens with both IDs.
- **Dependencies:** None

#### U5.3: Customer GDPR Export
- **Source:** C3.2
- **Type:** Client
- **Effort:** Small
- **Files to modify:** `src/components/customers/customer-detail-sheet.tsx`
- **Approach:** Generate client-side JSON export from visible customer data + booking history. Create Blob, trigger download. The anonymise button is already wired.
- **Dependencies:** None

**Agent B: Error Boundaries + Route Consolidation**

#### U5.4: React Error Boundaries
- **Source:** C3.3
- **Type:** Client
- **Effort:** Medium
- **Files to create:**
  - `src/app/admin/error.tsx`
  - `src/app/(admin)/admin/error.tsx`
  - `src/app/forms/[sessionKey]/error.tsx`
  - `src/app/review/[token]/error.tsx`
  - `src/app/book/[tenantSlug]/error.tsx`
  - `src/app/platform/error.tsx`
- **Approach:** Create reusable Next.js App Router error boundary using `error.tsx` convention. Card with error icon, message, and "Try Again" button that calls `reset()`.
- **Dependencies:** None

#### U5.5: Route Group Consolidation
- **Source:** C3.4
- **Type:** Client
- **Effort:** Medium
- **Files to move:**
  - `src/app/(admin)/admin/settings/page.tsx` -> `src/app/admin/settings/page.tsx`
  - `src/app/(admin)/admin/audit/page.tsx` -> `src/app/admin/audit/page.tsx`
  - `src/app/(admin)/admin/workflows/[id]/page.tsx` -> `src/app/admin/workflows/[id]/page.tsx`
  - `src/app/(admin)/admin/workflows/[id]/executions/page.tsx` -> `src/app/admin/workflows/[id]/executions/page.tsx`
- **Approach:** The `(admin)` route group has no `layout.tsx`, so pages there don't inherit the admin shell. Move all pages to `src/app/admin/` and delete the `(admin)` directory.
- **Dependencies:** None. **MUST be done before Wave 6 (new pages need correct layout).**

**Agent C: Server Stubs Completion**

#### U5.6: Scheduling Service Stubs
- **Source:** S2.5
- **Type:** Server
- **Effort:** Medium
- **Files to modify:** `src/modules/scheduling/scheduling.service.ts` (lines 240-291)
- **Approach:** Wire `getAvailableStaffForSlot`, `getStaffRecommendations`, `getSchedulingAlerts`, `getAssignmentHealth` to real booking/team repository queries.
- **Dependencies:** None

#### U5.7: Tenant getUsage
- **Source:** S2.6
- **Type:** Server
- **Effort:** Small
- **Files to modify:**
  - `src/modules/tenant/tenant.repository.ts` (add `getUsageCounts`)
  - `src/modules/tenant/tenant.service.ts` (lines 199-209)
- **Approach:** Add `getUsageCounts(tenantId)` that does parallel `COUNT(*)` on bookings and staff. Replace stub in service.
- **Dependencies:** None

#### U5.8: CREATE_TASK Workflow Action
- **Source:** S2.9
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/workflow/engine/actions.ts` (lines 130-135)
- **Approach:** Replace stub with real `db.insert(tasks).values(...)`. The `tasks` table exists at `shared.schema.ts` with 15 columns.
- **Dependencies:** None

**Agent D: Analytics Extended Procedures**

#### U5.9: Additional Analytics Procedures (6)
- **Source:** S3.3
- **Type:** Server
- **Effort:** Large
- **Files to modify:**
  - `src/modules/analytics/analytics.schemas.ts` (add 6 new schemas)
  - `src/modules/analytics/analytics.repository.ts` (add 6 aggregation queries)
  - `src/modules/analytics/analytics.service.ts` (add 6 methods)
  - `src/modules/analytics/analytics.router.ts` (add 6 procedures)
- **Procedures:** `getKPIs` (period comparison), `getRevenueChart` (time series), `getBookingsByStatus` (donut), `getTopServices` (ranked), `getStaffUtilization` (heatmap), `getChurnRisk` (at-risk customers)
- **Approach:** Each procedure follows the same pattern: schema -> repository query -> service logic -> router wire. Use Redis cache for expensive queries (utilization, churn).
- **Dependencies:** U2.1, U2.2 (analytics patterns established)

#### U5.10: Analytics upsertSnapshot Atomicity
- **Source:** S3.5
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/analytics/analytics.repository.ts` (lines 37-57)
- **Approach:** Wrap delete-then-insert in `db.transaction()`.
- **Dependencies:** None

#### U5.11: tRPC Client Import Consistency
- **Source:** C5.5
- **Type:** Client
- **Effort:** Small
- **Files to modify:**
  - `src/hooks/use-audit-log.ts` (change `@/lib/trpc/client` to `@/lib/trpc/react`)
  - `src/components/settings/integrations-tab.tsx` (change `@/lib/trpc/client` to `@/lib/trpc/react`)
- **Dependencies:** None

---

### Wave 6: New Pages (5 parallel agents)

6 tasks, all independent once U5.5 (route consolidation) is complete. Each page uses `withModuleGate()` and re-adds its nav item via the module manifest (which is already registered).

#### U6.1: /admin/forms — Form Template Management
- **Source:** C4.1
- **Type:** Client
- **Effort:** Large
- **Files to create:** `src/app/admin/forms/page.tsx`
- **Backend endpoints:** `forms.listTemplates`, `forms.getTemplate`, `forms.createTemplate`, `forms.updateTemplate`, `forms.deleteTemplate`, `forms.sendForm`, `forms.listResponses`
- **Approach:** Follow Bookings page pattern. PageHeader + search + table (Name, Fields, Responses, Created, Status). Detail sheet on row click. Create/edit dialog. The `forms` manifest already declares sidebar items and routes.
- **Dependencies:** U5.5

#### U6.2: /admin/reviews — Review Moderation
- **Source:** C4.2
- **Type:** Client
- **Effort:** Large
- **Files to create:** `src/app/admin/reviews/page.tsx`
- **Backend endpoints:** `review.list`, `review.getById`, `review.requestReview`, `review.resolveIssue`, `review.getAutomation`, `review.updateAutomation`
- **Approach:** Filter chips (All, Pending, Published, Flagged) + rating filter. Table/card list with star ratings. Detail sheet with resolve action. Automation settings section.
- **Dependencies:** U5.5

#### U6.3: /admin/payments — Invoice & Payment Management
- **Source:** C4.3
- **Type:** Client
- **Effort:** Large
- **Files to create:** `src/app/admin/payments/page.tsx`
- **Backend endpoints:** `payment.listInvoices`, `payment.getInvoice`, `payment.createInvoice`, `payment.sendInvoice`, `payment.voidInvoice`, `payment.recordPayment`
- **Approach:** Filter chips by status. Table with Invoice#, Customer, Amount, Status, Due Date. Detail sheet with actions (send, void, record payment). Create invoice dialog.
- **Dependencies:** U5.5

#### U6.4: /admin/developer — Webhook Management
- **Source:** C4.4
- **Type:** Client
- **Effort:** Medium
- **Files to create:** `src/app/admin/developer/page.tsx`
- **Backend endpoints:** `developer.listWebhookEndpoints`, `developer.createWebhookEndpoint`, `developer.deleteWebhookEndpoint`
- **Approach:** Table with URL, Events, Created, Status. Create webhook dialog with URL input + event type checkboxes. Show secret once after creation.
- **Note:** This overlaps with Security tab webhooks (U3.11). If Security tab is sufficient, this page can be a simple redirect or expanded view. Consider whether both are needed.
- **Dependencies:** U5.5

#### U6.5: /admin/scheduling — Schedule Management
- **Source:** C4.5
- **Type:** Client
- **Effort:** Large
- **Files to create:** `src/app/admin/scheduling/page.tsx`
- **Backend endpoints:** `scheduling.listSlots`, `scheduling.createSlot`, `scheduling.updateSlot`, `scheduling.deleteSlot`, `scheduling.bulkCreateSlots`, `scheduling.generateRecurring`, `scheduling.checkAvailability`, `scheduling.getAlerts`
- **Approach:** Calendar view (week/day) showing slots by staff. Slot creation dialog. Alerts panel. May reuse existing calendar infrastructure.
- **Dependencies:** U5.5, U5.6 (scheduling stubs wired)

#### U6.6: Global Search Integration
- **Source:** C4.6
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** Command palette component (Cmd+K)
- **Backend endpoints:** `search.globalSearch`
- **Approach:** Wire command palette to `api.search.globalSearch.useQuery({ query, limit: 10 }, { enabled: query.length >= 2 })`. Display results grouped by type. Remove "Search" as a standalone nav item.
- **Dependencies:** None

---

### Wave 7: Tests + Cleanup (2 parallel agents)

12 tasks. Mix of test coverage and dead code removal.

**Agent A: Server Tests**

#### U7.1: Platform Module Tests
- **Source:** S4.1
- **Type:** Server
- **Effort:** Large
- **Files to create:** `src/modules/platform/__tests__/platform.service.test.ts`
- **Test areas (12+ tests):** Tenant provisioning, approveSignup (fixed flow), rejectSignup, suspend/activate, impersonation, feature flags, signup listing
- **Dependencies:** U1.2

#### U7.2: Tenant Module Tests
- **Source:** S4.2
- **Type:** Server
- **Effort:** Medium
- **Files to create:** `src/modules/tenant/__tests__/tenant.service.test.ts`
- **Test areas (8+ tests):** getSettings/updateSettings, isModuleEnabled (cached/uncached), listModules/toggleModule, getUsage, venue CRUD
- **Dependencies:** U1.4, U5.7

#### U7.3: Settings Module Tests
- **Source:** S4.3
- **Type:** Server
- **Effort:** Large
- **Files to create:** `src/modules/settings/__tests__/settings.service.test.ts`
- **Test areas (18+ tests):** General settings round-trip, notification settings, API key lifecycle, permission enforcement
- **Dependencies:** U4.1

#### U7.4: Audit Module Tests
- **Source:** S4.4
- **Type:** Server
- **Effort:** Medium
- **Files to create:** `src/modules/audit/__tests__/audit.service.test.ts`
- **Test areas (10+ tests):** List with filters, pagination, tenant isolation, CSV export format, 10k row limit, proper escaping
- **Dependencies:** U4.2

#### U7.5: Analytics Extended Tests
- **Source:** S4.5
- **Type:** Server
- **Effort:** Medium
- **Files to create:** `src/modules/analytics/__tests__/analytics-kpis.test.ts`
- **Test areas (18+ tests):** 3 tests per new procedure (with data, empty data, edge cases)
- **Dependencies:** U5.9

#### U7.6: Payment Service Tests
- **Source:** S4.6
- **Type:** Server
- **Effort:** Medium
- **Files to create:** `src/modules/payment/__tests__/payment.service.test.ts`
- **Test areas (8+ tests):** createInvoice, sendInvoice, recordPayment, voidInvoice, Stripe webhook handlers
- **Dependencies:** U2.4

**Agent B: Cleanup + Polish**

#### U7.7: Dead Analytics Schemas
- **Source:** S5.1
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/analytics/analytics.schemas.ts`
- **Action:** Remove `staffPerformanceSchema`, `revenueSchema`, `funnelSchema` (lines 15-31) that were replaced by new schemas in U5.9.
- **Dependencies:** U5.9

#### U7.8: Unused generateSlug Function
- **Source:** S5.2
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/platform/platform.service.ts` (lines 45-53)
- **Action:** Remove `generateSlug()` after verifying no callers.
- **Dependencies:** None

#### U7.9: Duplicate Expression Test Files
- **Source:** S5.3
- **Type:** Server
- **Effort:** Small
- **Action:** Compare and deduplicate `src/modules/workflow/__tests__/expressions.test.ts` vs `src/modules/workflow/engine/__tests__/expressions.test.ts`. Remove the outer one if duplicated.
- **Dependencies:** None

#### U7.10: Auth Hooks TODO
- **Source:** S5.4
- **Type:** Server
- **Effort:** Small
- **Files to modify:** `src/modules/auth/hooks.ts` (line 63)
- **Action:** Evaluate whether the TODO is still relevant. Wire to tRPC auth.me if needed, or remove the TODO.
- **Dependencies:** None

#### U7.11: Dead Code Removal
- **Source:** C5.3
- **Type:** Client
- **Effort:** Small
- **Action:**
  - Remove `console.log("Booking created:", bookingId)` from booking flow page
  - Remove hardcoded "System Status" section from dashboard (replaced by U3.1)
  - Remove "Connect your database" messaging from dashboard
  - Clean unused imports in settings tabs after wiring
  - Delete `src/components/layout/nav-config.ts` if sidebar is fully wired to `nav-builder.ts`
- **Dependencies:** U3.1, U3.10

#### U7.12: Real Export Functions
- **Source:** C5.1
- **Type:** Client
- **Effort:** Medium
- **Files to modify:** Analytics page, audit page
- **Approach:** Generate CSV client-side from fetched data using `papaparse` or manual CSV construction. For audit, wire to `audit.exportCsv` mutation.
- **Dependencies:** U4.2 (audit exportCsv endpoint)

---

## Deferred Items (Blocked on External Dependencies)

These items require external work (backend APIs, credentials, infrastructure) that does not currently exist:

| ID | Task | Blocker |
|----|------|---------|
| **C5.2** | Platform Analytics Hook | Requires 5 new platform-level analytics endpoints that don't exist |
| **C5.4** | Settings OAuth/Integrations | Requires OAuth client credentials + backend OAuth initiation endpoints |
| **S5.5** | Scheduling Event Handler Stubs | Low priority; Phase 4 TODOs about loading booking details |
| **C2.9+** | Customer list aggregate columns (server-side) | Requires adding aggregates to `customer.list` response to avoid N+1 |

---

## Dependency Graph

```
Wave 1 (Foundation — all independent):
  U1.1 (Error Conversion)     ──── no deps, DO FIRST
  U1.2 (approveSignup)        ──── no deps
  U1.3 (Merge Audit)          ──── no deps
  U1.4 (Venue Soft Delete)    ──── no deps
  U1.5 (Invoice Number)       ──── no deps
  U1.6 (alert() fix)          ──── no deps
  U1.7 (Audit Error UI)       ──── no deps
  U1.8 (FormFieldRenderer)    ──── no deps

Wave 2 (Server Stubs — after U1.1):
  U2.1 (getSummary)           ──── after U1.1
  U2.2 (getCustomerInsights)  ──── after U1.1
  U2.3 (Booking Saga)         ──── after U1.1
  U2.4 (Stripe Webhooks)      ──── after U1.1
  U2.5 (Overdue Cron)         ──── no deps

Wave 3 (Client Wiring — after W1, parallel with W2):
  U3.1 (Dashboard)            ──── after U2.1
  U3.2 (Analytics Hook)       ──── after U2.1
  U3.3 (Settings General)     ──── no deps (can start in W1)
  U3.4 (Settings Modules)     ──── after U3.3
  U3.5 (Settings Billing)     ──── no deps
  U3.6 (Settings Notifications) ── after U3.3
  U3.7 (Audit Log Hook)       ──── after U4.2 (or interim wire to platform)
  U3.8 (Workflow Activate)     ──── no deps
  U3.9 (Customer Aggregates)   ──── no deps
  U3.10 (Sidebar Replacement)  ──── no deps
  U3.11 (Security Webhooks)    ──── no deps
  U3.12 (Danger Tab)           ──── no deps

Wave 4 (Missing Modules — after U1.1):
  U4.1 (Settings Module)      ──── after U1.1, U1.3
  U4.2 (Audit Module)         ──── after U1.1
  U4.3 (Workflow Detail)       ──── no deps

Wave 5 (Features + Stubs — after W1):
  U5.1 (Customer Edit)         ──── no deps
  U5.2 (Merge Dialog Fix)      ──── no deps
  U5.3 (GDPR Export)           ──── no deps
  U5.4 (Error Boundaries)      ──── no deps
  U5.5 (Route Consolidation)   ──── no deps (BLOCKS Wave 6)
  U5.6 (Scheduling Stubs)      ──── no deps
  U5.7 (Tenant getUsage)       ──── no deps
  U5.8 (CREATE_TASK)           ──── no deps
  U5.9 (Analytics Procedures)   ──── after U2.1, U2.2
  U5.10 (upsert Atomicity)     ──── no deps
  U5.11 (tRPC imports)         ──── no deps

Wave 6 (New Pages — after U5.5):
  U6.1-U6.6                    ──── after U5.5 (route consolidation)
  U6.5 (Scheduling)            ──── also after U5.6 (scheduling stubs)

Wave 7 (Tests + Cleanup — after relevant modules):
  U7.1 (Platform Tests)         ──── after U1.2
  U7.2 (Tenant Tests)           ──── after U1.4, U5.7
  U7.3 (Settings Tests)         ──── after U4.1
  U7.4 (Audit Tests)            ──── after U4.2
  U7.5 (Analytics Tests)        ──── after U5.9
  U7.6 (Payment Tests)          ──── after U2.4
  U7.7-U7.12 (Cleanup)          ──── no hard deps
```

---

## Total Effort Summary

| Wave | Tasks | New LOC | Modified LOC | Type | Est. Time (1 eng) | Parallelism |
|------|-------|---------|-------------|------|-------------------|-------------|
| W1: Foundation | 8 | ~100 | ~300 | Mixed | 1 day | 4+ agents |
| W2: Server Stubs | 5 | ~500 | ~200 | Server | 1.5 days | 3 agents |
| W3: Client Wiring | 13 | ~200 | ~800 | Client | 2.5 days | 4 agents |
| W4: Missing Modules | 3 | ~2,000 | ~100 | Server | 2.5 days | 2 agents |
| W5: Features + Stubs | 11 | ~1,500 | ~600 | Mixed | 3 days | 4 agents |
| W6: New Pages | 6 | ~3,000 | ~50 | Client | 4 days | 5 agents |
| W7: Tests + Cleanup | 12 | ~2,500 | ~100 | Mixed | 2.5 days | 2 agents |
| **Total** | **58** | **~9,800** | **~2,150** | | **~17 days (1 eng)** | **Compresses to ~5-6 days with 4-5 agents** |

### Comparison to Original Plans

| Metric | Server Plan | Client Plan | Unified Plan |
|--------|------------|-------------|-------------|
| Total tasks | 30 | 33 | 58 (5 removed as done, merged overlapping) |
| Phases | 5 | 5 | 7 waves |
| Est. calendar days (multi-agent) | 5 days | 5-7 days | 5-6 days (fully parallelized) |

### Key Reductions from Module System

1. **S2.2 removed entirely** — `createModuleMiddleware` is real (saves ~200 LOC)
2. **S2.3 simplified** — use `auditLog()` instead of importing platform repository (saves cross-module coupling)
3. **C1.3 transformed** — from "remove 6 nav items" to "replace nav-config with nav-builder" (one-time fix, future-proof)
4. **S3.1 simplified** — settings module uses manifest `settingsTab` for dynamic tabs instead of hardcoding
5. **S3.2 simplified** — audit module uses `auditResources` from manifests for filter options
6. **All C4.x pages** — use `withModuleGate()` pattern for instant module-aware protection
7. **C2.2 analytics** — can use widget registry for discovery, but data endpoints still need wiring

---

*Last updated: 2026-02-21*
