# Frontend Audit Report

**Date:** 2026-02-21
**Auditor:** Claude Opus 4.6
**Scope:** All client-side code against `FRONTEND_PLAN.md` and backend API surface
**Backend routers audited:** 19 routers, 120+ tRPC procedures

---

## Executive Summary

The frontend implementation covers Phases 7A (Design System), 7B (Admin Core), and 7C (Customer Portal) with solid UI scaffolding. Phase 7D (Advanced Admin) and 7E (Platform Admin) have pages rendered but are largely non-functional due to stubbed data hooks. The application builds and compiles, but significant gaps exist between the UI layer and the backend API surface.

**Overall Readiness:**

| Area | Status | Score |
|------|--------|-------|
| Design System (7A) | Complete and functional | 95% |
| Admin Core (7B) | Functional with minor gaps | 80% |
| Customer Portal (7C) | Blocked on backend services module | 60% |
| Advanced Admin (7D) | UI shell only, data layer stubbed | 20% |
| Platform Admin (7E) | Partially functional | 55% |

**Critical Findings:**
1. **4 hooks completely stubbed** -- analytics, audit log, settings mutations, and platform analytics return hardcoded empty data
2. **6 navigation links point to non-existent pages** -- clicking them results in 404s
3. **Dashboard shows zero live data** -- all 4 KPI cards display em-dashes, recent activity is a static placeholder
4. **All 7 settings tabs use stub data** -- none are connected to the `tenant.*` tRPC procedures that already exist
5. **Forms page does not use the FormFieldRenderer component** -- shows placeholder text "Wave 4" instead
6. **Error handling code commented out** on the audit page
7. **Route group inconsistency** -- pages split between `src/app/admin/` and `src/app/(admin)/admin/`

---

## Page-by-Page Analysis

### 1. Dashboard `/admin` (page.tsx)

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | MISSING | All 4 KPI cards show `"--"`. Static text says "Connect your database to see live data" but no tRPC calls exist |
| Loading state | N/A | Server component, no async fetching |
| Empty state | PARTIAL | Static "No recent activity" message shown, but it is hardcoded, not conditional |
| Error handling | MISSING | No error boundary, no error state |
| New Booking button | INCOMPLETE | Button exists but has no `onClick` handler -- it does nothing |
| Recent Activity section | STUB | Hardcoded single item "No recent activity" |
| System Status section | HARDCODED | API/Database/Background Jobs/Email status is static, not from health checks |

**Available backend endpoints not wired:**
- `booking.getStats` -- could populate today's bookings, revenue
- `analytics.getSummary` -- could populate KPI cards
- `customer.list` -- could derive active customer count
- `booking.list` -- could populate recent activity

**Recommendation:** Convert to client component, fetch `booking.getStats` and `analytics.getSummary` to populate KPIs. Wire "New Booking" button to a booking wizard or route to `/admin/bookings`.

---

### 2. Calendar `/admin/calendar`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/calendar/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `booking.listForCalendar` |
| FullCalendar views | YES | Week, day, month, list views working |
| Staff filter chips | YES | Multi-select with avatars |
| Booking detail sheet | YES | Opens on event click |
| Drag to reschedule | YES | Optimistic update with revert on error |
| New Booking wizard | YES | 3-step modal wizard present |
| Loading skeleton | YES | Calendar-shaped skeleton |
| Empty state | YES | EmptyState component when no bookings |
| Error handling | YES | Error state with retry button |
| Dark mode | YES | Custom calendar.css overrides |

**Assessment:** Most complete page in the application. Matches the plan specification closely.

---

### 3. Bookings List `/admin/bookings`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/bookings/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `booking.list` |
| Server-side filtering | YES | Status, date range, staff, search |
| Pagination | YES | Cursor-based with page size selector |
| Bulk actions | YES | Approve, cancel, export CSV |
| Column visibility | YES | Toggle columns |
| Row click detail sheet | YES | Reuses BookingDetailSheet |
| Loading skeleton | YES | Table row skeletons |
| Empty state | YES | Filter-aware empty states |
| CSV export | YES | Generates CSV from visible data |

**Minor issues:**
- CSV export only exports current page of data, not all matching results
- No keyboard shortcut for bulk actions

**Assessment:** Well-implemented, covers plan requirements.

---

### 4. Customers `/admin/customers`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/customers/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `customer.list` |
| Search | YES | Debounced (300ms), resets pagination |
| Status filters | YES | ALL/ACTIVE/INACTIVE toggle chips |
| Pagination | YES | Cursor-based with stack navigation |
| Detail sheet | YES | Opens on row click |
| Create dialog | YES | Modal form, calls `customer.create` |
| Total Bookings column | STUB | Always shows `"--"` |
| Total Spend column | STUB | Always shows `"--"` |
| Last Booking column | STUB | Always shows `"--"` (passes `null` to `formatRelativeDate`) |
| Edit dialog | MISSING | Shows toast "edit dialog not yet implemented" |
| Merge dialog | BROKEN | Opens with `primaryId: ""`, conditional render requires non-empty primaryId, so dialog never actually opens |
| GDPR actions | MISSING | No export data or deletion buttons in the UI |
| Loading skeleton | YES | 8-row table skeleton |
| Empty state | YES | Search-aware empty state with CTA |
| Error handling | YES | Error state with retry button |

**Available backend endpoints not wired:**
- `customer.getBookingHistory` -- could populate bookings/spend/last booking columns
- `customer.update` -- for edit dialog
- `customer.merge` -- for merge dialog (dialog component exists but is unreachable)
- `customer.anonymise` -- for GDPR compliance
- `customer.addNote` / `customer.deleteNote` -- detail sheet notes tab
- `search.globalSearch` -- plan says "Prominent search bar at top backed by `/trpc/search.globalSearch`" but implementation uses `customer.list` with search param instead

**Recommendation:** Fix merge dialog flow (add customer search/select for primary), implement edit dialog, populate aggregate columns from `getBookingHistory`, add GDPR buttons.

---

### 5. Team `/admin/team`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/team/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `team.list` |
| Staff grid | YES | Avatar cards with status badges |
| Detail sheet | YES | Profile, availability, capacity |
| Add member dialog | YES | Form calls `team.create` |
| Availability editor | YES | 7-day grid with toggle |
| Capacity settings | YES | Default max and per-day overrides |
| Filters | YES | Role, status, capability |
| Loading skeleton | YES | Card grid skeleton |
| Empty state | YES | With "Add Team Member" CTA |
| "Who's available now" | MISSING | Plan specifies this indicator, not implemented |

**Assessment:** Solid implementation, minor gap with the availability indicator.

---

### 6. Analytics Dashboard `/admin/analytics`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/analytics/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| UI components | YES | KPICards, RevenueChart, StatusDonutChart, TopServicesChart, StaffUtilizationHeatmap, ChurnRiskTable all rendered |
| Live data | NO | `useAnalyticsData` hook is completely stubbed -- returns `{ data: undefined, isLoading: false }` for all 6 queries |
| Date range picker | YES | DateRangePicker with presets and custom range |
| Export | SIMULATED | `handleExport` uses `setTimeout` to fake a 1.5s delay, shows success toast, generates no actual file |
| Loading skeletons | YES | KPICardSkeleton, component-level loading states |
| Empty states | YES | EmptyCard component when no data |
| Error states | YES | ErrorCard component for failed queries |
| ARIA labels | YES | Screen reader headings for each section |

**Available backend endpoints not wired:**
- `analytics.getSummary` -- KPI data
- `analytics.getTimeSeries` -- revenue chart data
- `analytics.getCustomerInsights` -- churn risk data
- `analytics.getRevenueForecast` -- forecast overlay

**Hook file:** `/Users/lukehodges/Documents/ironheart-refactor/src/hooks/use-analytics-data.ts`
```typescript
// TODO: Implement analytics procedures: getKPIs, getRevenueChart, getBookingsByStatus, getTopServices, getStaffUtilization, getChurnRisk
const stubQueryResult = {
  data: undefined,
  isLoading: false,
  error: null,
  refetch: () => Promise.resolve({ data: undefined }),
}
```

**Recommendation:** Wire `useAnalyticsData` to the 4 existing analytics procedures. The backend has `getSummary`, `getTimeSeries`, `getCustomerInsights`, `getRevenueForecast`. The hook expects 6 queries (kpis, revenueChart, bookingsByStatus, topServices, staffUtilization, churnRisk) -- some may need new backend procedures or the frontend needs to derive them from existing endpoints.

---

### 7. Workflows List `/admin/workflows`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/admin/workflows/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `workflow.list` |
| Search | YES | Name filter |
| Status filters | YES | Active/inactive/draft |
| Create workflow | YES | Routes to editor |
| Delete workflow | YES | Confirmation dialog, calls `workflow.delete` |
| Activate/deactivate | STUBBED | Shows toast "not yet implemented" |
| Loading skeleton | YES | Card skeletons |
| Empty state | YES | With "Create Workflow" CTA |
| Pagination | YES | Cursor-based |

**Hook file:** `/Users/lukehodges/Documents/ironheart-refactor/src/hooks/use-workflow-mutations.ts`
```typescript
// TODO: Implement activate and deactivate procedures in workflow router
const activate = stubMutation
const deactivate = stubMutation
```

**Note:** The workflow router already has `create`, `update`, `delete` but no dedicated `activate` / `deactivate` procedure. The `update` procedure could be used to toggle `isActive` status, but the hook stubs these instead.

---

### 8. Workflow Editor `/admin/workflows/[id]`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/(admin)/admin/workflows/[id]/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| React Flow canvas | YES | Custom node types rendered |
| Node palette | YES | Draggable sidebar with grouped node types |
| Node config panel | YES | Right panel with type-specific forms |
| Save workflow | YES | Calls `workflow.create` or `workflow.update` |
| Undo/redo | UNCLEAR | Toolbar buttons present, implementation needs verification |
| Validate graph | YES | Calls `workflow.validateGraph` before save |
| Node types | YES | Trigger, action, and control flow nodes |

**Assessment:** Most feature-complete page in Phase 7D. React Flow integration is functional.

---

### 9. Workflow Executions `/admin/workflows/[id]/executions`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/(admin)/admin/workflows/[id]/executions/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `workflow.getExecutions` |
| Execution table | YES | Status, started, completed, duration |
| Detail sheet | YES | Per-step status display |
| Status filters | YES | Completed, failed, running |
| Auto-refresh | YES | Running executions refetch automatically |
| Loading skeleton | YES | Table skeleton |

**Assessment:** Well-implemented.

---

### 10. Settings `/admin/settings`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/(admin)/admin/settings/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Layout | YES | Two-column: sidebar + tab content |
| URL hash routing | YES | `#notifications`, `#billing`, etc. |
| Lazy loading | YES | `React.lazy` + `Suspense` for all 7 tabs |
| Loading skeleton | YES | Spinner fallback |
| Mobile layout | PARTIAL | Sidebar goes full-width on mobile, but both sidebar and content render simultaneously on narrow screens |

**All 7 tabs are visually complete but use stub data:**

#### General Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/general-tab.tsx`
- Has form fields for: business name, address, timezone (select), currency (select), logo upload
- Uses `useSettingsMutations().updateGeneral` which is stubbed -- shows "not yet implemented" toast
- Does NOT fetch current settings from `tenant.getSettings` to populate form defaults
- Logo upload UI exists but the upload function simulates with `setTimeout`

#### Notifications Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/notifications-tab.tsx`
- Email/SMS toggles, reminder timing selects, template editors, preview dialog
- All data is hardcoded stub state
- Uses `useSettingsMutations().updateNotifications` which is stubbed

#### Integrations Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/integrations-tab.tsx`
- Google Calendar and Outlook cards with connect/disconnect buttons
- OAuth flow is placeholder only (`window.open("about:blank")`)
- Calendar sync backend (`calendarSync.*`) exists but is not connected

#### Billing Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/billing-tab.tsx`
- Plan card, usage bars, invoice table, upgrade button
- All hardcoded stub data: `plan: "Professional"`, `bookingsThisMonth: 145`, etc.
- Upgrade button uses `alert("Upgrade flow not yet implemented")`
- `tenant.getPlan` and `tenant.getUsage` exist but are not connected

#### Modules Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/modules-tab.tsx`
- Module toggle grid with optimistic update logic
- `modules` array is hardcoded empty: `const modules = [] as Array<...>`
- `tenant.listModules`, `tenant.enableModule`, `tenant.disableModule` exist but are not connected

#### Security Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/security-tab.tsx`
- API keys table with create/revoke UI
- Initial keys array is empty stub
- Webhook section shows "Coming soon" badge and is disabled
- `developer.listWebhookEndpoints`, `developer.createWebhookEndpoint` exist but are not connected

#### Danger Tab
**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/components/settings/danger-tab.tsx`
- Export data, delete bookings, delete organization
- All actions simulated with `setTimeout` and fake data
- "Type DELETE to confirm" pattern is implemented but does not call any backend endpoint
- Organization name is hardcoded as `"Demo Business"`

**Available backend endpoints not wired to ANY settings tab:**
- `tenant.getSettings` -- populate General tab defaults
- `tenant.updateSettings` -- save General tab changes
- `tenant.listModules` / `enableModule` / `disableModule` -- Modules tab
- `tenant.getPlan` / `getUsage` -- Billing tab
- `tenant.listVenues` / `createVenue` / `updateVenue` / `deleteVenue` -- no Venues UI at all
- `developer.listWebhookEndpoints` / `createWebhookEndpoint` / `deleteWebhookEndpoint` -- Security tab webhooks

---

### 11. Audit Log `/admin/audit`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/(admin)/admin/audit/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| UI layout | YES | PageHeader, collapsible filters, timeline, pagination |
| Live data | NO | `useAuditLog` hook is completely stubbed |
| Filters | SHELL | AuditFilters component renders but has no effect (data is empty) |
| Timeline | SHELL | AuditTimeline component renders but receives empty entries |
| Export CSV | STUBBED | `exportCsv.mutate()` is a no-op |
| Error handling | COMMENTED OUT | Lines 149-174 contain the error UI wrapped in `{/* ... */}` with `// TODO: Re-enable when audit router is implemented` |
| Loading skeleton | YES | SkeletonList component |
| Empty state | YES | Shows when entries array is empty |
| Infinite scroll | PRESENT | `onLoadMore` callback exists but `loadMore` just calls `setCursor(undefined)` |

**Available backend endpoint:**
- `platform.getAuditLog` exists in the platform router, but it is `platformAdminProcedure` only. There is no tenant-scoped audit log endpoint.

**Recommendation:** Either create a tenant-scoped `tenant.getAuditLog` procedure, or wire this page to `platform.getAuditLog` with appropriate permission checks. Un-comment the error handling code.

---

### 12. Booking Flow `/book/[tenantSlug]`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/book/[tenantSlug]/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Tenant theming | YES | `useTenantTheme` loads brand colors and logo |
| Step 1: Service selection | BLOCKED | `ServiceSelector` receives `services={[]}` -- always empty |
| Step 2: Slot picker | BLOCKED | `getAvailableSlots` is `async () => []` -- always returns empty |
| Step 3: Customer details | YES | Form renders and validates |
| Success screen | YES | Confetti, booking reference, add-to-calendar |
| Loading skeleton | YES | BookingPageSkeleton |
| Error state | YES | "Booking Not Available" card |
| Progress bar | YES | Step indicator and progress bar |
| Mobile responsive | YES | Single column on mobile |

**Available backend endpoints not wired:**
- No `service.getServices` public procedure exists (plan acknowledges this as "Pending Backend Work")
- `scheduling.getSlotsForDate` or `slotAvailability.*` -- could populate slot picker
- `booking.create` -- could be called on form submit (currently the flow has no public booking creation path)

**Recommendation:** This page is architecturally complete but unusable until a services module is implemented and the slot availability endpoint is wired.

---

### 13. Form Submission `/forms/[sessionKey]`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/forms/[sessionKey]/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Token-based access | YES | Fetches from `forms.getFormByToken` |
| Form submission | YES | Calls `forms.submitForm` |
| Dynamic fields | BROKEN | Does NOT use `FormFieldRenderer` component. Instead renders placeholder: `{field.type} field renderer (Wave 4)` |
| Multi-step | YES | Splits fields into groups of 5 |
| Validation | PARTIAL | Checks required fields but has no type-specific validation (email format, phone format, file size) |
| Progress bar | YES | For multi-step forms |
| Token expiry handling | YES | Detects expired links |
| Success state | YES | Thank you card |
| Loading skeleton | YES | FormPageSkeleton |

**Critical bug:** The `FormFieldRenderer` component exists at `/Users/lukehodges/Documents/ironheart-refactor/src/components/public-form/form-field-renderer.tsx` and supports 8 field types (text, textarea, email, phone, dropdown, checkbox, date, file), but it is NOT imported or used. Fields render as dashed-border placeholder boxes with text like "text field renderer (Wave 4)". Users cannot actually fill out forms.

**Recommendation:** Import and use `FormFieldRenderer` in the form page, passing field type, value, onChange, and error props.

---

### 14. Review Submission `/review/[token]`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/review/[token]/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Token validation | YES | Fetches review request data |
| Star rating | YES | Interactive, keyboard accessible |
| Feedback textarea | YES | Character count |
| Public/private toggle | YES | Switch component |
| Submission | YES | Calls `review.submitReview` |
| Success state | YES | Thank you screen |
| Loading skeleton | YES | |
| Error handling | YES | Invalid/expired token states |

**Assessment:** Fully functional. Best implementation among the public-facing pages.

---

### 15. Platform Tenants List `/platform/tenants`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/platform/tenants/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Live data | YES | Fetches from `platform.listTenants` |
| Table | YES | Name, plan, status, created date |
| Create button | YES | Links to `/platform/tenants/new` |
| Row click | YES | Links to `/platform/tenants/[id]` |
| Filters | PARTIAL | Plan filter exists, no status filter per the plan |
| Loading skeleton | YES | |
| Empty state | YES | |

**Assessment:** Functional, connected to real API.

---

### 16. Platform Tenant Detail `/platform/tenants/[id]`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/platform/tenants/[id]/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| Profile section | YES | Name, domain, plan, created date |
| Usage stats | PARTIAL | Basic stats, not full usage breakdown |
| Module toggles | YES | Enable/disable via `platform.setTenantModule` |
| Plan override | YES | Change plan via `platform.changePlan` |
| Suspend/unsuspend | YES | Via `platform.suspendTenant` / `platform.activateTenant` |
| Impersonate | YES | Via `use-impersonate` hook |
| Audit log | MISSING | No tenant-specific audit log on detail page |

**Assessment:** Core functionality works. Impersonation flow is complete with banner.

---

### 17. Platform Create Tenant `/platform/tenants/new`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/platform/tenants/new/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| 5-step wizard | YES | Business details, plan, admin user, modules, confirm |
| Form validation | YES | Zod schema validation per step |
| Submission | YES | Calls `platform.createTenant` |
| Success redirect | YES | Redirects to tenant detail on success |

**Assessment:** Fully functional.

---

### 18. Platform Analytics `/platform/analytics`

**File:** `/Users/lukehodges/Documents/ironheart-refactor/src/app/platform/analytics/page.tsx`

| Criterion | Status | Details |
|-----------|--------|---------|
| UI components | YES | PlatformMetricsCards, MRRChart, TenantsByPlanChart, SignupTrendChart, ChurnTable |
| Live data | NO | `usePlatformAnalytics` hook is completely stubbed |
| Date range selector | YES | 7d/30d/90d/12m selector |

**Hook file:** `/Users/lukehodges/Documents/ironheart-refactor/src/hooks/use-platform-analytics.ts`
```typescript
// TODO: Implement platform analytics procedures
const stubQuery = {
  data: undefined,
  isLoading: false,
  error: null,
}
```

**Assessment:** UI shell only. No backend procedures exist for platform-level analytics aggregation.

---

## Missing Pages (Nav Links Without Pages)

The navigation config at `/Users/lukehodges/Documents/ironheart-refactor/src/components/layout/nav-config.ts` defines 6 routes that have **no corresponding page files**:

| Nav Item | Route | Backend Router | Status |
|----------|-------|----------------|--------|
| Scheduling | `/admin/scheduling` | `scheduling.*` (5+ procedures) | **NO PAGE** |
| Forms | `/admin/forms` | `forms.*` (10 procedures) | **NO PAGE** |
| Reviews | `/admin/reviews` | `review.*` (7 procedures) | **NO PAGE** |
| Payments | `/admin/payments` | `payment.*` (7 procedures) | **NO PAGE** |
| Search | `/admin/search` | `search.globalSearch` (1 procedure) | **NO PAGE** |
| Developer | `/admin/developer` | `developer.*` (3 procedures) | **NO PAGE** |

Clicking any of these nav items results in a 404 error, which is a poor user experience. These should either have pages implemented or be removed from the navigation until ready.

---

## Component Quality Assessment

### Design System Components (7A)
- **26 UI components** -- well-structured, consistent API, Radix-based
- `EmptyState` component properly used across pages
- `PageHeader` used consistently with description and action slots
- `Skeleton` and skeleton layout presets available
- Badge variants (success, warning, info) consistently applied
- Dark mode tokens work via CSS custom properties

### Layout Components
- **AdminSidebar** -- collapsible, mobile-responsive Sheet drawer, RBAC-filtered
- **AdminTopbar** -- breadcrumbs, command palette, user dropdown
- **ImpersonationBanner** -- displays when impersonating, end button works

### Booking Components (7B)
- `BookingStatusBadge` -- exhaustive 10-status color map
- `BookingDetailSheet` -- confirm/cancel mutations with optimistic updates
- `NewBookingWizard` -- 3-step flow with customer search, slot picker, confirm

### Analytics Components (7D)
- `KPICard` -- clean design but never receives real data
- `RevenueChart` -- Recharts LineChart wrapper, handles loading/error states well
- `StatusDonutChart` -- Recharts PieChart with center label
- `TopServicesChart` -- Recharts horizontal BarChart
- `StaffUtilizationHeatmap` -- Custom grid with color intensity
- `ChurnRiskTable` -- Table with risk level badges
- `DateRangePicker` -- Presets (7d, 30d, 90d, 12m) + custom range
- `ExportMenu` -- CSV/PDF dropdown

All analytics components handle loading/empty states internally but will never show real data until the hook is wired.

### Workflow Components (7D)
- `WorkflowCanvas` -- React Flow integration with custom node types
- `NodePalette` -- Draggable node types grouped by category
- `NodeConfigPanel` -- Type-specific configuration forms
- `WorkflowToolbar` -- Save, validate, undo/redo actions

### Settings Components (7D)
All 7 tab components exist with polished UI but zero backend connectivity. Each shows a `TODO` comment about implementing the backend router.

### Platform Components (7E)
- `TenantListTable` -- functional
- `TenantDetailContent` -- functional
- `TenantWizard` -- 5-step wizard, functional
- `ImpersonationBanner` -- functional
- Platform analytics charts -- UI only, stubbed data

---

## Backend API Utilization

### Fully Connected (Frontend calls real tRPC procedures)

| Router | Procedures Used | Coverage |
|--------|----------------|----------|
| `booking` | `list`, `listForCalendar`, `getById`, `create`, `update`, `cancel`, `getStats` | 7/9 (78%) |
| `team` | `list`, `getById`, `create`, `update`, `deactivate`, `getAvailability`, `setAvailability`, `getCapacity`, `setCapacity` | 9/11 (82%) |
| `customer` | `list`, `getById`, `create` | 3/11 (27%) |
| `workflow` | `list`, `getById`, `create`, `update`, `delete`, `getExecutions`, `validateGraph` | 7/7 (100%) |
| `platform` | `listTenants`, `getTenant`, `createTenant`, `updateTenant`, `suspendTenant`, `activateTenant`, `changePlan`, `listTenantFlags`, `listTenantModules`, `setTenantModule`, `startImpersonation`, `endImpersonation`, `getActiveImpersonation` | 13/19 (68%) |
| `forms` | `getFormByToken`, `submitForm` | 2/10 (20%) |
| `review` | `submitReview` | 1/7 (14%) |

### Stubbed (Hook exists but returns fake data)

| Router | Hook File | Status |
|--------|-----------|--------|
| `analytics` | `use-analytics-data.ts` | All 4 procedures unused |
| `tenant` (settings) | `use-settings-mutations.ts` | All mutations are no-ops |
| `platform` (analytics) | `use-platform-analytics.ts` | All queries unused |
| `platform` (audit) | `use-audit-log.ts` | Audit query unused |

### Completely Unused (No frontend code references them)

| Router | Procedures | Notes |
|--------|-----------|-------|
| `scheduling` | All 5+ procedures | No `/admin/scheduling` page |
| `notification` | All procedures | No notification management UI |
| `calendarSync` | All procedures | Integrations tab placeholder only |
| `payment` | All 7 procedures | No `/admin/payments` page |
| `developer` | All 3 procedures | No `/admin/developer` page |
| `search` | `globalSearch` | No `/admin/search` page |
| `customer` | `update`, `delete`, `merge`, `anonymise`, `listNotes`, `addNote`, `deleteNote`, `getBookingHistory` | 8 procedures unused |
| `forms` (admin) | `listTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `sendForm`, `listResponses`, `getResponse` | 8 procedures unused |
| `review` (admin) | `list`, `getById`, `requestReview`, `resolveIssue`, `getAutomation`, `updateAutomation` | 6 procedures unused |
| `platform` | `listFlags`, `setFlag`, `setTenantFlag`, `listSignupRequests`, `approveSignup`, `rejectSignup` | 6 procedures unused |
| `tenant` | `getSettings`, `getPublicSettings`, `updateSettings`, `listModules`, `enableModule`, `disableModule`, `updateModuleConfig`, `listVenues`, `createVenue`, `updateVenue`, `deleteVenue`, `getPlan`, `getUsage` | 13 procedures unused |
| `booking` | `getPublicById`, `confirmReservation` | 2 procedures unused |
| `auth` | All procedures | Auth handled by WorkOS directly |

**Summary:** Of approximately 120+ tRPC procedures, roughly **42 are connected to the frontend** (35%) and **78+ are completely unused** (65%).

---

## UX Gaps

### Critical UX Issues

1. **Dead navigation links** -- 6 nav items lead to 404 pages. Users will lose trust in the application.

2. **Dashboard provides no value** -- The landing page after login shows zero live data. It should be the most informative screen.

3. **Forms page is broken** -- Forms can be loaded but fields cannot be filled in because `FormFieldRenderer` is not used. Users see placeholder boxes instead of input fields.

4. **Settings changes do nothing** -- All 7 settings tabs allow users to fill out forms and click "Save", but the toast says "not yet implemented". This is deceptive UX.

5. **Customer merge is unreachable** -- The merge dialog requires a `primaryId` but the flow never provides one, so the conditional render `{mergeState.open && mergeState.primaryId && ...}` always evaluates to false.

6. **Billing upgrade uses `alert()`** -- The plan's non-negotiables explicitly state "No `alert()`" -- this violates the spec.

### Moderate UX Issues

7. **No React Error Boundaries** -- The plan requires `<ErrorBoundary>` on every page. None are implemented.

8. **Route group inconsistency** -- Pages are split between `src/app/admin/` and `src/app/(admin)/admin/`. This creates potential layout and auth guard issues. The `(admin)` group might not inherit the same `layout.tsx` as the `admin/` group.

9. **Customer columns always show dashes** -- Bookings count, total spend, and last booking date are critical data for customer management. They always show `"--"`.

10. **Export functions are simulated** -- Analytics CSV/PDF export, audit CSV export, and data export in Danger tab all use `setTimeout` fakes. No real files are generated.

11. **No optimistic updates on settings** -- Plan requires optimistic updates for status changes and toggles. Settings tab toggles and saves have no optimistic update logic.

12. **Search inconsistency** -- Customer search uses `customer.list` instead of `search.globalSearch` as specified in the plan.

### Minor UX Issues

13. **Calendar page: "New Booking" on dashboard does nothing** -- Dashboard has a "New Booking" button with no click handler.

14. **Platform analytics shows nothing** -- The page renders with empty chart containers.

15. **Workflow activate/deactivate shows misleading toast** -- "not yet implemented" for a feature that could be implemented using the existing `workflow.update` procedure.

16. **Audit page error handling commented out** -- Users will not see error states.

17. **No global loading indicator** -- No NProgress or similar for page transitions.

18. **No keyboard shortcuts documentation** -- Command palette exists but no discoverable shortcut guide.

---

## Priority Actions

### P0 -- Must Fix (Broken or Deceptive Functionality)

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| 1 | **Wire `FormFieldRenderer` into `/forms/[sessionKey]`** -- forms are currently unusable | `src/app/forms/[sessionKey]/page.tsx` | Small |
| 2 | **Fix customer merge dialog** -- add customer search/select for primary target, remove impossible condition | `src/app/admin/customers/page.tsx`, `CustomerMergeDialog` | Medium |
| 3 | **Remove or hide 6 dead nav links** -- scheduling, forms, reviews, payments, search, developer | `src/components/layout/nav-config.ts` | Small |
| 4 | **Replace `alert()` in billing tab** with proper dialog or toast | `src/components/settings/billing-tab.tsx` | Small |
| 5 | **Un-comment error handling on audit page** | `src/app/(admin)/admin/audit/page.tsx` | Small |
| 6 | **Wire `useAnalyticsData` to real tRPC calls** -- 4 backend endpoints exist | `src/hooks/use-analytics-data.ts` | Medium |
| 7 | **Wire `useSettingsMutations` to real tRPC calls** -- `tenant.*` endpoints exist | `src/hooks/use-settings-mutations.ts`, all 7 settings tab components | Large |
| 8 | **Wire dashboard to live data** -- fetch `booking.getStats` or `analytics.getSummary` | `src/app/admin/page.tsx` | Medium |

### P1 -- Should Add (Plan Requirements Not Yet Implemented)

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| 9 | **Add React Error Boundaries** -- plan non-negotiable, none exist | New `error.tsx` files per route segment | Medium |
| 10 | **Implement customer edit dialog** -- currently shows "not yet implemented" toast | New component + customer page | Medium |
| 11 | **Populate customer aggregate columns** -- bookings count, total spend, last booking | `src/app/admin/customers/page.tsx`, new query | Medium |
| 12 | **Implement customer GDPR actions** -- export data, deletion request | Customer detail sheet | Medium |
| 13 | **Wire audit log hook** to backend -- need tenant-scoped audit endpoint or use `platform.getAuditLog` | `src/hooks/use-audit-log.ts` | Medium |
| 14 | **Wire settings General tab** to `tenant.getSettings` for defaults and `tenant.updateSettings` for save | `src/components/settings/general-tab.tsx` | Medium |
| 15 | **Wire settings Modules tab** to `tenant.listModules` / `enableModule` / `disableModule` | `src/components/settings/modules-tab.tsx` | Medium |
| 16 | **Wire settings Billing tab** to `tenant.getPlan` / `tenant.getUsage` | `src/components/settings/billing-tab.tsx` | Medium |
| 17 | **Wire workflow activate/deactivate** -- use `workflow.update` with `isActive` flag | `src/hooks/use-workflow-mutations.ts` | Small |
| 18 | **Resolve route group split** -- move all admin pages to consistent location | Multiple page files | Medium |
| 19 | **Add "Who's available now" indicator** to team page | `src/app/admin/team/page.tsx` | Small |

### P2 -- Nice to Have (Missing Pages for Existing Backend APIs)

| # | Issue | Backend Endpoints | Effort |
|---|-------|-------------------|--------|
| 20 | **Create `/admin/forms` page** -- admin form template management | `forms.listTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `sendForm`, `listResponses`, `getResponse` | Large |
| 21 | **Create `/admin/reviews` page** -- review moderation dashboard | `review.list`, `getById`, `requestReview`, `resolveIssue`, `getAutomation`, `updateAutomation` | Large |
| 22 | **Create `/admin/payments` page** -- invoice and payment management | `payment.listInvoices`, `getInvoice`, `createInvoice`, `sendInvoice`, `voidInvoice`, `recordPayment`, `listPricingRules` | Large |
| 23 | **Create `/admin/developer` page** -- webhook management | `developer.listWebhookEndpoints`, `createWebhookEndpoint`, `deleteWebhookEndpoint` | Medium |
| 24 | **Create `/admin/search` page** -- or integrate global search into command palette | `search.globalSearch` | Medium |
| 25 | **Create `/admin/scheduling` page** -- scheduling rules and configuration | `scheduling.*` | Large |
| 26 | **Wire platform analytics** -- may need new backend procedures | `src/hooks/use-platform-analytics.ts` | Large |
| 27 | **Implement real export functions** -- CSV/PDF generation for analytics, audit | Multiple files | Medium |
| 28 | **Wire integrations tab OAuth** -- Google/Outlook calendar connect | `calendarSync.*` | Large |
| 29 | **Wire Security tab webhooks** -- connect to `developer.*` endpoints | `src/components/settings/security-tab.tsx` | Medium |

### P3 -- Should Remove (Dead Code or Misleading UI)

| # | Issue | Details |
|---|-------|---------|
| 30 | **Remove `console.log("Booking created:", bookingId)`** from booking flow page | Production logging leak |
| 31 | **Remove fake export implementations** (setTimeout fakes) or replace with "coming soon" badges | Analytics export, audit export, danger tab export |
| 32 | **Remove hardcoded system status** from dashboard or replace with real health checks | Dashboard page |
| 33 | **Remove "Connect your database" messaging** from dashboard -- it implies the app is not configured, which is misleading for tenants | Dashboard page |

---

## Architecture Notes

### Route Structure Issue

The codebase has pages in two locations:

**`src/app/admin/`** (5 pages):
- `page.tsx` (dashboard)
- `calendar/page.tsx`
- `bookings/page.tsx`
- `customers/page.tsx`
- `team/page.tsx`

**`src/app/(admin)/admin/`** (4 pages):
- `settings/page.tsx`
- `audit/page.tsx`
- `workflows/[id]/page.tsx`
- `workflows/[id]/executions/page.tsx`

And separately:

**`src/app/admin/analytics/page.tsx`** (under admin, not (admin))
**`src/app/admin/workflows/page.tsx`** (list under admin, editor under (admin))

The `(admin)` route group is a Next.js organizational feature that does NOT create a URL segment, meaning both `/admin/settings` and `admin/settings` resolve to the same URL. However, the `(admin)` group may have a different (or no) `layout.tsx`, which could mean those pages miss the auth guard, sidebar, and topbar defined in `/admin/layout.tsx`.

**Recommendation:** Consolidate all admin pages under a single `src/app/admin/` directory to ensure consistent layout inheritance.

### tRPC Client Import Inconsistency

Two different import paths are used for the tRPC client:
- `import { api } from '@/lib/trpc/react'` (most files)
- `import { api } from '@/lib/trpc/client'` (audit hook)

This may or may not be an issue depending on whether both paths resolve to the same module, but it is inconsistent and should be verified.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total frontend pages | 18 |
| Fully functional pages | 8 |
| Partially functional pages (stubbed data) | 6 |
| UI shell only (no real data) | 4 |
| Missing pages (nav links exist) | 6 |
| Total hooks | 12 |
| Stubbed hooks | 4 |
| Backend procedures total | ~120 |
| Backend procedures wired to frontend | ~42 (35%) |
| Backend procedures completely unused | ~78 (65%) |
| Non-negotiable violations | 3 (no Error Boundaries, `alert()` usage, no optimistic updates on settings) |
| Settings tabs with real data | 0/7 |

---

*Last updated: 2026-02-21*
