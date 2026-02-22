# Client-Side Remediation Plan

**Date:** 2026-02-21
**Source:** `AUDIT_CLIENT_SIDE.md`
**Scope:** All frontend remediation from audit findings, phased by priority
**Estimated total tasks:** 33 tasks across 5 phases

---

## Overview

The frontend audit identified 33 issues across 18 pages. The core admin pages (Calendar, Bookings, Team) are well-implemented and serve as reference patterns. The primary gaps fall into three categories:

1. **Broken functionality** (5 items) -- forms page unusable, merge dialog unreachable, dead nav links, `alert()` usage, commented error handling
2. **Stub data hooks** (4 hooks) -- analytics, settings, audit, platform analytics return hardcoded empty data instead of calling existing tRPC procedures
3. **Missing pages** (6 pages) -- nav links point to pages that do not exist, but backend APIs are fully implemented

**Approach:** Fix broken things first, then wire existing UI to existing APIs, then build missing pages, then polish. Each phase can be parallelized internally.

---

## Reference Patterns

All new work MUST follow the patterns established by the well-implemented pages. Below are the canonical patterns extracted from Calendar, Bookings, and Team pages.

### Data Fetching Pattern

```tsx
// File: src/app/admin/team/page.tsx (reference)
"use client"
import { api } from "@/lib/trpc/react"  // ALWAYS use this import, NOT @/lib/trpc/client

// In component:
const { data, isLoading, isError, refetch } = api.team.list.useQuery({
  limit: 100,
  status: statusFilter === "ALL" ? undefined : statusFilter,
})
const rows = data?.rows ?? []
```

**Rules:**
- Always use `"use client"` at top of page
- Always import from `@/lib/trpc/react` (the React Query wrapper), NOT `@/lib/trpc/client` (the vanilla client)
- Destructure `{ data, isLoading, isError, refetch }` from `.useQuery()`
- Default data safely: `data?.rows ?? []`
- Use `enabled` option for conditional queries: `{ enabled: !!customerId }`

### Mutation Pattern

```tsx
// File: src/components/customers/customer-detail-sheet.tsx (reference)
const utils = api.useUtils()

const mutation = api.customer.anonymise.useMutation({
  onSuccess: () => {
    toast.success("Customer data anonymised (GDPR)")
    void utils.customer.list.invalidate()  // invalidate related queries
    onClose()
  },
  onError: (error) => {
    toast.error(error.message ?? "Failed to anonymise customer")
  },
})
```

**Rules:**
- Use `api.useUtils()` for cache invalidation
- Always provide `onSuccess` with toast + cache invalidation
- Always provide `onError` with error toast
- Use `void` before `invalidate()` calls (fire-and-forget)
- Use `mutation.isPending` for loading state on buttons

### Cache Invalidation Pattern

```tsx
// File: src/app/admin/calendar/page.tsx (reference)
const utils = api.useUtils()

const handleWizardSuccess = () => {
  void utils.booking.listForCalendar.invalidate()
}
```

### Loading State Pattern

```tsx
// File: src/app/admin/team/page.tsx (reference)
{isLoading ? (
  <TeamGridSkeleton />          // Skeleton shaped like the content
) : rows.length === 0 ? (
  <EmptyState                   // Filter-aware empty state
    variant="users"
    title={hasFilters ? "No members match" : "No team members yet"}
    action={!hasFilters ? { label: "Add Member", onClick: open } : undefined}
  />
) : (
  <div>{/* actual content */}</div>
)}
```

**Three-state rendering:** Loading skeleton -> Empty state -> Content. Always in this order.

### Error State Pattern

```tsx
// File: src/app/admin/customers/page.tsx (reference)
{isError ? (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <p className="text-sm text-destructive font-medium">Failed to load customers</p>
    <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      Retry
    </Button>
  </div>
) : ( /* ... */ )}
```

### Page Layout Pattern

```tsx
// File: src/app/admin/bookings/page.tsx (reference)
<div className="space-y-6 animate-fade-in">
  <PageHeader title="Bookings" description="Manage all bookings.">
    <Button size="sm" onClick={...}>Action</Button>
  </PageHeader>
  {/* Filters */}
  {/* Content (table/grid) */}
  {/* Detail sheet (mounted at root) */}
  {/* Create dialog */}
</div>
```

### Component Composition Pattern
- Pages are thin orchestrators: state + queries + handlers
- Data fetching happens in the page or in dedicated child components
- Detail views use `<Sheet>` (slide-over panel)
- Create/edit actions use `<Dialog>` (modal)
- Both Sheet and Dialog are mounted at page root (not nested in table rows)

---

## Phase C1: Critical Fixes (Broken Functionality)

These are things that are visibly broken or violate plan non-negotiables. All are small, independent, and can be done in parallel.

### C1.1: Wire FormFieldRenderer into Forms Page

**Priority:** P0
**Effort:** Small
**Files to modify:** `src/app/forms/[sessionKey]/page.tsx`

**Problem:** The `FormFieldRenderer` component exists at `src/components/public-form/form-field-renderer.tsx` and supports all 8 field types (text, textarea, email, phone, dropdown, checkbox, date, file). However, the forms page does NOT import it. Instead, each field renders as a dashed-border placeholder: `{field.type} field renderer (Wave 4)`.

**Implementation:**

1. Add import at top of `src/app/forms/[sessionKey]/page.tsx`:
```tsx
import FormFieldRenderer from "@/components/public-form/form-field-renderer"
import type { PublicFormField } from "@/types/public-form"
```

2. Replace the placeholder field rendering block (lines 232-247). The current code:
```tsx
{currentFields.map((field: any) => (
  <div key={field.id} className="space-y-2">
    <label className="text-sm font-medium">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
    <div className="p-4 border border-dashed border-border rounded-md text-center text-sm text-muted-foreground">
      {field.type} field renderer (Wave 4)
    </div>
    {errors[field.id] && (
      <p className="text-sm text-destructive">{errors[field.id]}</p>
    )}
  </div>
))}
```

Replace with:
```tsx
{currentFields.map((field: any) => {
  // Cast to PublicFormField for type-safe rendering
  const typedField = field as PublicFormField
  return (
    <FormFieldRenderer
      key={typedField.id}
      field={typedField}
      value={fieldValues[typedField.id] ?? null}
      onChange={(value) =>
        setFieldValues((prev) => ({ ...prev, [typedField.id]: value }))
      }
      error={errors[typedField.id]}
    />
  )
})}
```

3. Note: The `FormFieldRenderer` component already handles its own label rendering (including the required asterisk and help text), so the outer `<label>` and error `<p>` are not needed -- they are rendered by the component internally.

4. Update the `validateCurrentStep` function to also validate field type constraints (email format, phone format). The current validation only checks `required`. Add type-specific checks:
```tsx
const validateCurrentStep = (): boolean => {
  const newErrors: Record<string, string> = {}
  currentFields.forEach((field: any) => {
    const value = fieldValues[field.id]
    if (field.isRequired && !value) {
      newErrors[field.id] = `${field.label} is required`
    } else if (value && field.type === "email" && typeof value === "string") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field.id] = "Please enter a valid email address"
      }
    }
  })
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

**Verification:** Load a form via `/forms/[sessionKey]` -- fields should render as actual inputs (text boxes, dropdowns, checkboxes, etc.) instead of dashed placeholder boxes.

---

### C1.2: Fix Customer Merge Dialog

**Priority:** P0
**Effort:** Medium
**Files to modify:** `src/app/admin/customers/page.tsx`

**Problem:** The merge flow opens with `primaryId: ""`. The conditional render `{mergeState.open && mergeState.primaryId && mergeState.secondaryId && ...}` always evaluates to false because `primaryId` is empty string (falsy). The dialog never opens.

The `CustomerMergeDialog` component itself is well-built -- it fetches both customers, shows a side-by-side comparison, and calls `customer.merge`. The issue is purely in how the parent page manages the merge flow.

**Implementation:**

1. Add a customer search/select step before opening the merge dialog. The merge flow should be:
   - User clicks "Merge into another customer" on a row -> that customer becomes the `secondaryId` (the one to be deleted)
   - A search dialog opens to let the user pick the `primaryId` (the customer to keep)
   - Once primary is selected, the merge dialog opens with both IDs

2. Create a new `CustomerSearchDialog` component or add an inline search mode to the merge state. The simplest approach is to modify the `handleMergeOpen` callback and the merge state:

```tsx
// Change mergeState type to include a search step
const [mergeState, setMergeState] = useState<{
  step: "closed" | "search" | "confirm"
  primaryId: string
  secondaryId: string
}>({ step: "closed", primaryId: "", secondaryId: "" })

// When user clicks "Merge into another customer"
const handleMergeOpen = useCallback((secondaryId: string) => {
  setMergeState({ step: "search", primaryId: "", secondaryId })
}, [])
```

3. Add a search dialog that lets the user pick the primary customer. This should reuse the existing customer list query with a search input. When a customer is selected, transition to the confirm step:

```tsx
// Search dialog (render when step === "search")
{mergeState.step === "search" && (
  <CustomerSearchDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) setMergeState({ step: "closed", primaryId: "", secondaryId: "" })
    }}
    excludeId={mergeState.secondaryId}
    onSelect={(primaryId) => {
      setMergeState((prev) => ({ ...prev, step: "confirm", primaryId }))
    }}
  />
)}

// Merge confirmation dialog (render when step === "confirm")
{mergeState.step === "confirm" && mergeState.primaryId && mergeState.secondaryId && (
  <CustomerMergeDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) setMergeState({ step: "closed", primaryId: "", secondaryId: "" })
    }}
    primaryCustomerId={mergeState.primaryId}
    secondaryCustomerId={mergeState.secondaryId}
    onSuccess={() => {
      setMergeState({ step: "closed", primaryId: "", secondaryId: "" })
      setSelectedCustomerId(null)
    }}
  />
)}
```

4. The `CustomerSearchDialog` component should be created at `src/components/customers/customer-search-dialog.tsx`. It needs:
   - A search input with debounce (reuse `useDebounce`)
   - A list of customers from `api.customer.list.useQuery({ search: debouncedSearch, limit: 10 })`
   - Each customer row is clickable and calls `onSelect(customerId)`
   - The `excludeId` prop filters out the secondary customer from results
   - Loading skeleton and empty state

**Backend dependencies:** None -- `customer.list` and `customer.merge` already exist and are tested.

**Verification:** Click "Merge into another customer" on any customer row -> search dialog opens -> select a primary customer -> merge confirmation dialog opens with both customers displayed -> click Confirm Merge -> success toast, customer list refreshes.

---

### C1.3: Remove Dead Nav Links

**Priority:** P0
**Effort:** Small
**File to modify:** `src/components/layout/nav-config.ts`

**Problem:** Six nav items point to pages that do not exist: Scheduling, Forms, Reviews, Payments, Search, Developer. Clicking them produces a 404.

**Implementation:** Comment out or remove the six items until their pages are implemented. Each item should be conditionally shown based on whether the page exists. The safest approach is to add a `disabled` or `hidden` flag:

```tsx
// In NavItem interface, add:
disabled?: boolean  // grey out and prevent navigation

// Then mark the six items:
{ title: "Scheduling", href: "/admin/scheduling", icon: Clock, permission: "scheduling:read", disabled: true },
{ title: "Forms", href: "/admin/forms", icon: FileText, permission: "forms:read", disabled: true },
{ title: "Reviews", href: "/admin/reviews", icon: Star, permission: "reviews:read", disabled: true },
{ title: "Payments", href: "/admin/payments", icon: CreditCard, permission: "payments:read", disabled: true },
{ title: "Search", href: "/admin/search", icon: Search, disabled: true },
{ title: "Developer", href: "/admin/developer", icon: Code2, permission: "developer:read", disabled: true },
```

Also update `AdminSidebar` to handle the `disabled` flag: render as a `<span>` instead of `<Link>`, apply `opacity-50 cursor-not-allowed` classes, and add a "Coming soon" tooltip.

**Alternative simpler approach:** Simply remove the six items from `navSections` entirely. Re-add each one when its page is implemented in Phase C4.

**Recommendation:** Use the simpler approach (remove items). This avoids adding tooltip/disabled logic and cleanly eliminates the 404 risk. Re-add items in Phase C4 as each page is built.

**Verification:** Navigation sidebar no longer shows Scheduling, Forms, Reviews, Payments, Search, or Developer links.

---

### C1.4: Replace alert() in Billing Tab

**Priority:** P0 (plan non-negotiable: "No `alert()`")
**Effort:** Small
**File to modify:** `src/components/settings/billing-tab.tsx`

**Problem:** Line 257 uses `alert()` in the `UpgradeButton` component:
```tsx
alert(`Upgrade flow for ${plan} plan - integrates with Stripe in production`)
```

**Implementation:** Replace with a toast notification:
```tsx
import { toast } from "sonner"

const handleUpgrade = () => {
  setIsLoading(true)
  setTimeout(() => {
    toast.info("Upgrade flow coming soon", {
      description: "Stripe integration will be available in a future update.",
    })
    setIsLoading(false)
  }, 500)
}
```

**Verification:** Click "Upgrade Plan" button in Settings > Billing tab -> see toast instead of browser alert.

---

### C1.5: Un-comment Audit Page Error Handling

**Priority:** P0
**Effort:** Small
**File to modify:** `src/app/(admin)/admin/audit/page.tsx`

**Problem:** Lines 149-174 contain the error UI wrapped in `{/* ... */}` with a comment `// TODO: Re-enable when audit router is implemented`. The error handling should be active so users see error states.

**Implementation:** Remove the comment wrappers around the error block (lines 149-174). Change:
```tsx
{/* TODO: Re-enable when audit router is implemented */}
{/* {error && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
    ...
  </div>
)} */}
```

To:
```tsx
{error && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
    <div className="flex items-start gap-4">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <h3 className="font-semibold text-destructive">
          Failed to load audit log
        </h3>
        <p className="text-sm text-destructive/80">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    </div>
  </div>
)}
```

**Verification:** When the audit log query fails, the error state renders instead of showing nothing.

---

## Phase C2: Data Wiring (Connect UI to Existing APIs)

These tasks connect existing frontend UI components to existing backend tRPC procedures. No new backend work is needed.

### C2.1: Wire Dashboard to Live Data

**Priority:** P0
**Effort:** Medium
**File to modify:** `src/app/admin/page.tsx`

**Problem:** Dashboard is a server component with hardcoded static data. All 4 KPI cards show em-dashes. "New Booking" button has no click handler. System status is hardcoded.

**Implementation:**

1. Convert from server component to client component: add `"use client"` at top, remove `export const metadata` (move to `layout.tsx` if needed).

2. Fetch KPI data using `analytics.getSummary`:
```tsx
const { data: summary, isLoading: summaryLoading } = api.analytics.getSummary.useQuery({
  period: "TODAY",
})
```

3. Fetch recent bookings for activity feed:
```tsx
const { data: recentBookings, isLoading: bookingsLoading } = api.booking.list.useQuery({
  limit: 5,
})
```

4. Wire KPI cards:
```tsx
const stats = [
  {
    title: "Today's Bookings",
    value: summary ? String(summary.bookings.confirmed + summary.bookings.completed) : "--",
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Active Customers",
    value: summary ? String(summary.customers.new + summary.customers.returning) : "--",
    icon: Users,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    title: "Revenue This Month",
    value: summary ? formatCurrency(summary.revenue.gross) : "--",
    icon: CreditCard,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Avg. Rating",
    value: summary?.reviews?.ratingAvg
      ? summary.reviews.ratingAvg.toFixed(1)
      : "--",
    icon: TrendingUp,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
]
```

5. Wire "New Booking" button to navigate to `/admin/calendar` or open the booking wizard:
```tsx
import { useRouter } from "next/navigation"
const router = useRouter()
// ...
<Button size="sm" onClick={() => router.push("/admin/calendar")}>
  <Calendar className="h-4 w-4" /> New Booking
</Button>
```

6. Wire recent activity section to show last 5 bookings from `recentBookings.rows`.

7. Remove the "Connect your database to see live data" text and the hardcoded system status section (or replace with real health check if one exists).

8. Add loading skeletons for KPI cards and activity feed.

**Backend endpoints used:**
- `analytics.getSummary` (period: "TODAY") -- KPI data
- `booking.list` (limit: 5) -- recent activity

**Verification:** Dashboard shows live KPI numbers, recent bookings in activity feed, and "New Booking" button navigates to calendar.

---

### C2.2: Wire Analytics Hook

**Priority:** P0
**Effort:** Medium
**File to modify:** `src/hooks/use-analytics-data.ts`

**Problem:** All 6 query results are stubbed with `{ data: undefined, isLoading: false }`. The hook expects 6 queries (kpis, revenueChart, bookingsByStatus, topServices, staffUtilization, churnRisk) but the backend has 4 endpoints (getSummary, getTimeSeries, getCustomerInsights, getRevenueForecast).

**Implementation:**

1. Map frontend queries to backend endpoints:
   - `kpis` -> `analytics.getSummary({ period })` -- map the filter preset to a period enum
   - `revenueChart` -> `analytics.getTimeSeries({ metric: "revenue_gross", periodType: "DAY", from, to })` -- derive from/to from the AnalyticsFilters preset
   - `bookingsByStatus` -> `analytics.getSummary({ period })` -- derive from summary.bookings object
   - `topServices` -> Not directly available from backend. For now, return `undefined` and show "Coming soon" in the TopServicesChart. This requires a new backend endpoint (out of scope for this phase).
   - `staffUtilization` -> `analytics.getSummary({ period })` -- derive from summary.staffUtilisation
   - `churnRisk` -> `analytics.getCustomerInsights({ customerId })` -- but this is per-customer, not aggregate. For now, return `undefined`. May need a new aggregate endpoint.

2. Convert filter preset to period:
```tsx
function presetToPeriod(preset?: string): "TODAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" {
  switch (preset) {
    case "7d": return "WEEK"
    case "30d": return "MONTH"
    case "90d": return "QUARTER"
    case "12m": return "YEAR"
    default: return "MONTH"
  }
}

function presetToDateRange(preset?: string): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  switch (preset) {
    case "7d": from.setDate(from.getDate() - 7); break
    case "30d": from.setMonth(from.getMonth() - 1); break
    case "90d": from.setMonth(from.getMonth() - 3); break
    case "12m": from.setFullYear(from.getFullYear() - 1); break
    default: from.setMonth(from.getMonth() - 1); break
  }
  return { from: from.toISOString(), to: to.toISOString() }
}
```

3. Wire the hook:
```tsx
export function useAnalyticsData(filters: AnalyticsFilters) {
  const period = presetToPeriod(filters.preset)
  const dateRange = presetToDateRange(filters.preset)

  const kpis = api.analytics.getSummary.useQuery({ period })

  const revenueChart = api.analytics.getTimeSeries.useQuery({
    metric: "revenue_gross",
    periodType: period === "TODAY" ? "HOUR" : "DAY",
    from: dateRange.from,
    to: dateRange.to,
  })

  // bookingsByStatus derived from kpis data
  const bookingsByStatus = {
    data: kpis.data ? kpis.data.bookings : undefined,
    isLoading: kpis.isLoading,
    error: kpis.error,
    refetch: kpis.refetch,
  }

  // staffUtilization derived from kpis data
  const staffUtilization = {
    data: kpis.data ? { utilisation: kpis.data.staffUtilisation } : undefined,
    isLoading: kpis.isLoading,
    error: kpis.error,
    refetch: kpis.refetch,
  }

  // These need new backend endpoints -- stub for now
  const topServices = { data: undefined, isLoading: false, error: null, refetch: () => Promise.resolve({ data: undefined }) }
  const churnRisk = { data: undefined, isLoading: false, error: null, refetch: () => Promise.resolve({ data: undefined }) }

  return { kpis, revenueChart, bookingsByStatus, topServices, staffUtilization, churnRisk }
}
```

**Backend endpoints used:**
- `analytics.getSummary` -- KPI data, bookings breakdown, staff utilisation
- `analytics.getTimeSeries` -- revenue chart data

**Backend gaps (future work, not blocking):**
- Top services chart needs a new `analytics.getTopServices` endpoint
- Churn risk table needs an aggregate `analytics.getChurnRiskList` endpoint

**Verification:** Analytics page shows KPI cards with real numbers, revenue chart with real time series, bookings status donut with real breakdown. Top services and churn risk show empty states.

---

### C2.3: Wire Settings General Tab

**Priority:** P1
**Effort:** Medium
**File to modify:** `src/components/settings/general-tab.tsx`, `src/hooks/use-settings-mutations.ts`

**Problem:** General tab has a hardcoded `currentSettings` stub. Form defaults are fake. Save button calls `useSettingsMutations().updateGeneral` which is a no-op.

**Implementation:**

1. First, wire `use-settings-mutations.ts` with real mutations. Replace the stub `updateGeneral` with:
```tsx
const utils = api.useUtils()

const updateGeneral = api.tenant.updateSettings.useMutation({
  onSuccess: () => {
    toast.success("Settings saved")
    void utils.tenant.getSettings.invalidate()
  },
  onError: (error) => {
    toast.error(error.message ?? "Failed to save settings")
  },
})
```

2. In `general-tab.tsx`, replace the hardcoded `currentSettings` with a real query:
```tsx
const { data: currentSettings, isLoading: isLoadingSettings } = api.tenant.getSettings.useQuery()
```

3. Update the `useEffect` to populate form data from the real response. The `tenant.getSettings` returns organization settings -- map the relevant fields (businessName, timezone, currency, address, etc.) into the form state.

4. Update the `handleSubmit` to pass the correct shape to `tenant.updateSettings`. Check the `updateOrganizationSettingsSchema` to ensure the input format matches.

**Backend endpoints used:**
- `tenant.getSettings` -- read current settings
- `tenant.updateSettings` -- save settings

**Verification:** Open Settings > General tab -> form fields populate with real data from the database -> change a field -> click Save -> toast confirms success -> reload page -> changes persist.

---

### C2.4: Wire Settings Modules Tab

**Priority:** P1
**Effort:** Medium
**File to modify:** `src/components/settings/modules-tab.tsx`, `src/hooks/use-settings-mutations.ts`

**Problem:** The `modules` array is hardcoded as empty: `const modules = [] as Array<...>`. The tab always shows "No modules available."

**Implementation:**

1. Replace the stub `modules` with a real query:
```tsx
const { data: modulesData, isLoading, error } = api.tenant.listModules.useQuery()
const modules = modulesData ?? []
```

2. In `use-settings-mutations.ts`, replace the stub `toggleModule` with:
```tsx
const toggleModule = {
  enable: api.tenant.enableModule.useMutation({
    onSuccess: () => {
      toast.success("Module enabled")
      void utils.tenant.listModules.invalidate()
    },
    onError: (error) => toast.error(error.message ?? "Failed to enable module"),
  }),
  disable: api.tenant.disableModule.useMutation({
    onSuccess: () => {
      toast.success("Module disabled")
      void utils.tenant.listModules.invalidate()
    },
    onError: (error) => toast.error(error.message ?? "Failed to disable module"),
  }),
}
```

3. Update `handleToggleModule` in modules-tab.tsx to call `enableModule` or `disableModule` based on the toggle direction. The backend expects `{ moduleKey: string }` as input, so map the `moduleId` accordingly. Inspect what `tenant.listModules` returns to determine the correct key field.

**Backend endpoints used:**
- `tenant.listModules` -- list all modules with enabled status
- `tenant.enableModule` -- enable a module (input: `{ moduleKey: string }`)
- `tenant.disableModule` -- disable a module (input: `{ moduleKey: string }`)

**Verification:** Open Settings > Modules tab -> module cards appear with toggles -> toggle a module on/off -> toast confirms -> reload -> state persists.

---

### C2.5: Wire Settings Billing Tab

**Priority:** P1
**Effort:** Medium
**File to modify:** `src/components/settings/billing-tab.tsx`

**Problem:** All billing data is hardcoded (plan: "Professional", bookingsThisMonth: 145, etc.). `tenant.getPlan` and `tenant.getUsage` exist but are not connected.

**Implementation:**

1. Replace the hardcoded `billingData` with real queries:
```tsx
const { data: plan, isLoading: planLoading } = api.tenant.getPlan.useQuery()
const { data: usage, isLoading: usageLoading } = api.tenant.getUsage.useQuery()
const isLoading = planLoading || usageLoading
```

2. Map the response shapes to the expected `billingData` structure. Inspect what `tenant.getPlan` and `tenant.getUsage` return, then construct `billingData` from those responses.

3. Show loading skeleton while either query is loading (the `BillingTabSkeleton` component already exists but is never used).

**Backend endpoints used:**
- `tenant.getPlan` -- current plan details
- `tenant.getUsage` -- current usage stats

**Verification:** Open Settings > Billing tab -> shows real plan name, real usage numbers -> usage bars reflect actual data.

---

### C2.6: Wire Settings Notifications Tab

**Priority:** P1
**Effort:** Medium
**File to modify:** `src/components/settings/notifications-tab.tsx`, `src/hooks/use-settings-mutations.ts`

**Problem:** Notification settings are hardcoded stubs. Save calls `updateNotifications` which is a no-op.

**Implementation:**

1. Wire `updateNotifications` in `use-settings-mutations.ts`:
```tsx
const updateNotifications = api.tenant.updateSettings.useMutation({
  onSuccess: () => {
    toast.success("Notification settings saved")
    void utils.tenant.getSettings.invalidate()
  },
  onError: (error) => toast.error(error.message ?? "Failed to save notification settings"),
})
```

2. In `notifications-tab.tsx`, fetch current settings:
```tsx
const { data: settings, isLoading } = api.tenant.getSettings.useQuery()
```

3. Map the notification-related fields from `tenant.getSettings` response (emailEnabled, smsEnabled, reminderTiming, templates) to the local form state.

4. Ensure the `handleSave` sends the correct shape to `tenant.updateSettings`. The notification settings are part of the organization settings, so they should be sent as a partial update.

**Backend endpoints used:**
- `tenant.getSettings` -- read current notification settings
- `tenant.updateSettings` -- save notification settings (partial update)

---

### C2.7: Wire Audit Log Hook

**Priority:** P1
**Effort:** Medium
**File to modify:** `src/hooks/use-audit-log.ts`

**Problem:** The hook returns empty entries and no-op mutations. The backend has `platform.getAuditLog` (platformAdminProcedure only).

**Important note:** `platform.getAuditLog` is gated behind `platformAdminProcedure`. For tenant-level users, there is no audit endpoint. Two options:
1. Wire to `platform.getAuditLog` for platform admins only, hide the audit page from non-admins
2. Create a new `tenant.getAuditLog` procedure (requires backend work)

**Implementation (Option 1 -- wire to platform router for admins):**

1. Fix the import -- currently uses `@/lib/trpc/client` (vanilla client), should use `@/lib/trpc/react`:
```tsx
import { api } from '@/lib/trpc/react'
```

2. Wire the query:
```tsx
export function useAuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [cursor, setCursor] = useState<string | undefined>()

  const { data, isLoading, error } = api.platform.getAuditLog.useQuery(
    {
      limit: 50,
      cursor,
      ...filters,
    },
    {
      keepPreviousData: true,
    }
  )

  const loadMore = () => {
    if (data?.nextCursor) {
      setCursor(data.nextCursor)
    }
  }

  return {
    entries: data?.entries ?? [],
    hasMore: !!data?.nextCursor,
    isLoading,
    error,
    filters,
    setFilters,
    loadMore,
    exportCsv: {
      mutate: () => { /* TODO: implement CSV export */ },
      mutateAsync: () => Promise.resolve(),
      isPending: false,
    },
  }
}
```

3. Check the `auditLogQuerySchema` input shape in `src/modules/platform/platform.schemas.ts` to ensure the filters align.

**Backend dependency:** If tenant-scoped audit is needed, a new `tenant.getAuditLog` procedure must be created. This is a backend task.

**Backend endpoints used:**
- `platform.getAuditLog` -- query audit entries (platform admin only)

---

### C2.8: Wire Workflow Activate/Deactivate

**Priority:** P1
**Effort:** Small
**File to modify:** `src/hooks/use-workflow-mutations.ts`

**Problem:** `activate` and `deactivate` are stubs. But `workflow.update` already accepts `isActive: boolean` as an optional field.

**Implementation:**

Replace the stub mutations with calls to `workflow.update`:
```tsx
const activate = api.workflow.update.useMutation({
  onSuccess: () => {
    toast.success("Workflow activated")
    void utils.workflow.list.invalidate()
  },
  onError: (error) => {
    toast.error(`Failed to activate workflow: ${error.message}`)
  },
})

const deactivate = api.workflow.update.useMutation({
  onSuccess: () => {
    toast.success("Workflow deactivated")
    void utils.workflow.list.invalidate()
  },
  onError: (error) => {
    toast.error(`Failed to deactivate workflow: ${error.message}`)
  },
})
```

Then in the workflows list page, when calling activate/deactivate:
```tsx
// To activate:
mutations.activate.mutate({ id: workflowId, isActive: true })

// To deactivate:
mutations.deactivate.mutate({ id: workflowId, isActive: false })
```

Note: Both `activate` and `deactivate` use the same `workflow.update` mutation. The difference is just the `isActive` value passed. This is fine because they are separate `useMutation` instances and maintain independent loading/error states.

**Backend endpoints used:**
- `workflow.update` with `{ id, isActive: true/false }`

**Verification:** Workflows list -> click activate on an inactive workflow -> toast "Workflow activated" -> workflow status changes. Same for deactivate.

---

### C2.9: Populate Customer Aggregate Columns

**Priority:** P1
**Effort:** Medium
**File to modify:** `src/app/admin/customers/page.tsx`

**Problem:** The Bookings, Spend, and Last Booking columns always show em-dashes. `customer.getBookingHistory` exists but is not called from the list view.

**Implementation approach:** The challenge is that `getBookingHistory` requires a `customerId`, so calling it for each row would create N+1 queries. Two approaches:

**Option A (N+1 but cached):** For each visible customer, call `api.customer.getBookingHistory.useQuery` in the `CustomerRow` component. React Query will cache results and deduplicate. This works for small page sizes (25 rows = 25 queries) but is not ideal.

**Option B (Recommended -- batch in component):** Create a helper component that fetches booking history for a single customer and renders the columns. Use React Query's caching to avoid re-fetching on navigation back:

```tsx
function CustomerAggregates({ customerId }: { customerId: string }) {
  const { data: history } = api.customer.getBookingHistory.useQuery(
    { customerId },
    { staleTime: 5 * 60 * 1000 } // 5 min stale time for aggregates
  )

  const totalSpend = history?.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0) ?? 0
  const bookingCount = history?.length ?? 0
  const lastBooking = history && history.length > 0
    ? history.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0]
    : null

  return (
    <>
      <TableCell><span className="text-sm tabular-nums">{history ? bookingCount : "--"}</span></TableCell>
      <TableCell><span className="text-sm tabular-nums">{history ? formatCurrency(totalSpend) : "--"}</span></TableCell>
      <TableCell><span className="text-xs text-muted-foreground">{lastBooking ? formatRelativeDate(lastBooking.scheduledDate) : "--"}</span></TableCell>
    </>
  )
}
```

Replace the hardcoded em-dash cells in `CustomerRow` with `<CustomerAggregates customerId={customer.id} />`.

**Long-term improvement (backend):** Add aggregate fields directly to the `customer.list` response to avoid N+1 queries. This would be a backend enhancement.

**Backend endpoints used:**
- `customer.getBookingHistory` (per customer)

---

### C2.10: Wire Settings Security Tab (Webhooks)

**Priority:** P2
**Effort:** Medium
**File to modify:** `src/components/settings/security-tab.tsx`

**Problem:** Webhook section shows "Coming soon" and is disabled. The `developer.listWebhookEndpoints`, `developer.createWebhookEndpoint`, and `developer.deleteWebhookEndpoint` endpoints exist.

**Implementation:**

1. Replace the webhook placeholder section with a functional implementation:
   - Fetch webhooks: `api.developer.listWebhookEndpoints.useQuery()`
   - Create webhook: `api.developer.createWebhookEndpoint.useMutation()`
   - Delete webhook: `api.developer.deleteWebhookEndpoint.useMutation()`

2. The webhook table should show: URL, events, created date, actions (delete).

3. The "Add Webhook" button should open a dialog with fields for URL and event types.

4. Enable the "Add Webhook" button (currently `disabled`).

**Backend endpoints used:**
- `developer.listWebhookEndpoints`
- `developer.createWebhookEndpoint`
- `developer.deleteWebhookEndpoint`

---

### C2.11: Wire Settings Danger Tab

**Priority:** P2
**Effort:** Small
**File to modify:** `src/components/settings/danger-tab.tsx`

**Problem:** Organization name is hardcoded as "Demo Business". Export generates empty simulated data. Delete actions show success toast but do not call any backend.

**Implementation:**

1. Fetch real organization data for the org name:
```tsx
const { data: settings } = api.tenant.getSettings.useQuery()
const orgData = { isOwner: true, businessName: settings?.businessName ?? "Unknown" }
```

2. For export: This requires a backend endpoint that aggregates all data into a JSON export. If no such endpoint exists, keep the simulated export but add a "TODO" comment and do not show it as "Data exported successfully" -- instead show "Export functionality coming soon".

3. For delete operations: These require backend endpoints that do not exist yet. Mark buttons as disabled with "Coming soon" badges instead of allowing users to click through a confirmation flow that does nothing.

---

## Phase C3: Missing Feature Implementation

These tasks add missing features that the plan specified but were not implemented.

### C3.1: Customer Edit Dialog

**Priority:** P1
**Effort:** Medium
**File to create:** `src/components/customers/customer-edit-dialog.tsx`
**File to modify:** `src/app/admin/customers/page.tsx`

**Problem:** The "Edit" button in the customer detail sheet shows a toast "edit dialog not yet implemented".

**Implementation:**

1. Create `CustomerEditDialog` component following the same pattern as `CustomerCreateDialog`. It should:
   - Accept `customerId: string` and fetch current data via `api.customer.getById.useQuery`
   - Pre-populate form fields with current values
   - Call `api.customer.update.useMutation` on submit
   - Invalidate `customer.list` and `customer.getById` on success
   - Use the same field layout as the create dialog (name, email, phone, notes)

2. In `customers/page.tsx`, add state for the edit dialog:
```tsx
const [editCustomerId, setEditCustomerId] = useState<string | null>(null)
```

3. Update the `onEdit` callback in `CustomerDetailSheet`:
```tsx
onEdit={(id) => {
  setSelectedCustomerId(null)  // close sheet
  setEditCustomerId(id)        // open edit dialog
}}
```

4. Mount `CustomerEditDialog` at page root:
```tsx
<CustomerEditDialog
  customerId={editCustomerId}
  open={!!editCustomerId}
  onOpenChange={(open) => { if (!open) setEditCustomerId(null) }}
  onSuccess={() => { setEditCustomerId(null) }}
/>
```

**Backend endpoints used:**
- `customer.getById` -- fetch current data
- `customer.update` -- save changes

---

### C3.2: Customer GDPR Actions

**Priority:** P1
**Effort:** Small
**File to modify:** `src/components/customers/customer-detail-sheet.tsx`

**Problem:** The detail sheet has GDPR Export and Request Deletion buttons. The deletion button IS wired to `customer.anonymise` and works. The export button just shows a toast.

**Implementation:**

The GDPR export button currently does:
```tsx
toast.info("GDPR export initiated -- you will receive an email shortly.")
```

This should either:
1. Call a backend export endpoint if one exists (none currently does)
2. Generate a client-side JSON export of the customer data visible in the detail sheet

For now, implement option 2:
```tsx
const handleGdprExport = () => {
  if (!customer || !history) return
  const exportData = {
    exportedAt: new Date().toISOString(),
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
      isActive: customer.isActive,
    },
    bookings: history.map(b => ({
      date: b.scheduledDate,
      status: b.status,
      amount: b.totalAmount,
    })),
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `customer-${customer.id}-export.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success("Customer data exported")
}
```

**Note:** The anonymise (deletion) button is already wired and functional. No change needed for deletion.

---

### C3.3: React Error Boundaries

**Priority:** P1 (plan non-negotiable)
**Effort:** Medium
**Files to create:** `src/app/admin/error.tsx`, `src/app/(admin)/admin/error.tsx`, `src/app/forms/[sessionKey]/error.tsx`, `src/app/review/[token]/error.tsx`, `src/app/book/[tenantSlug]/error.tsx`, `src/app/platform/error.tsx`

**Problem:** The plan requires `<ErrorBoundary>` on every page. None are implemented.

**Implementation:**

In Next.js App Router, error boundaries are created by adding `error.tsx` files at route segments. These automatically wrap the corresponding `page.tsx` with a React error boundary.

Create a reusable error component:

```tsx
// src/app/admin/error.tsx
"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to Sentry or error tracking
    console.error("Admin page error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-center">Something went wrong</CardTitle>
          <CardDescription className="text-center">
            {error.message || "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

Create this file at each route segment listed above. The public-facing error pages (forms, review, booking) should use a simpler design without the admin layout.

---

### C3.4: Route Group Consolidation

**Priority:** P1
**Effort:** Medium
**Files to move:**
- `src/app/(admin)/admin/settings/page.tsx` -> `src/app/admin/settings/page.tsx`
- `src/app/(admin)/admin/audit/page.tsx` -> `src/app/admin/audit/page.tsx`
- `src/app/(admin)/admin/workflows/[id]/page.tsx` -> `src/app/admin/workflows/[id]/page.tsx`
- `src/app/(admin)/admin/workflows/[id]/executions/page.tsx` -> `src/app/admin/workflows/[id]/executions/page.tsx`

**Problem:** Pages are split between `src/app/admin/` and `src/app/(admin)/admin/`. The `(admin)` route group has NO `layout.tsx` file, which means those pages may NOT inherit the admin layout (sidebar, topbar, auth guard) defined in `src/app/admin/layout.tsx`.

**Implementation:**

1. Verify: Check if `src/app/(admin)/` has its own layout. From the glob search, it does NOT. This confirms the issue -- pages under `(admin)` do not get the admin layout.

2. Move all pages from `src/app/(admin)/admin/` to `src/app/admin/`:
   - Create necessary directories under `src/app/admin/` (settings/, audit/, workflows/[id]/, workflows/[id]/executions/)
   - Copy page files to new locations
   - Delete the `src/app/(admin)/` directory entirely

3. Update any imports that reference the old paths (none should exist since pages are not imported by other files, but verify).

4. The analytics page at `src/app/admin/analytics/page.tsx` is already in the correct location.

5. The workflows list at `src/app/admin/workflows/page.tsx` is already in the correct location.

**Risk:** URL routing may break if there are any `layout.tsx` or `loading.tsx` files in the `(admin)` group. Verify by checking for any files in the `(admin)` tree beyond the page files.

**Verification:** All admin pages render with the sidebar, topbar, and auth guard. No 404s. Settings, audit, and workflow editor all show the admin shell.

---

## Phase C4: Missing Pages (New Pages for Existing Backend APIs)

These are new pages that need to be built. Each has a fully functional backend API.

### C4.1: /admin/forms -- Form Template Management

**Priority:** P2
**Effort:** Large
**Files to create:**
- `src/app/admin/forms/page.tsx`

**Backend endpoints available:**
- `forms.listTemplates` -- list all form templates with search/pagination
- `forms.getTemplate` -- get template detail
- `forms.createTemplate` -- create new template
- `forms.updateTemplate` -- update template
- `forms.deleteTemplate` -- delete template
- `forms.sendForm` -- send form to customer (generates session token)
- `forms.listResponses` -- list form responses
- `forms.getResponse` -- get response detail

**Implementation approach:**

Follow the Bookings page pattern (table with filters, detail sheet, create dialog):

1. **Page layout:**
   - `PageHeader` with title "Forms" and "Create Template" button
   - Search input with debounce
   - Table: Name, Fields count, Responses count, Created, Status, Actions
   - Template detail sheet on row click
   - Create/edit dialog for template management

2. **Key features:**
   - Template list with search and pagination
   - Create template with field builder (name, description, fields array)
   - Send form to customer (search customer, generate link)
   - View responses for a template
   - Delete template with confirmation

3. **Data fetching:**
```tsx
const { data, isLoading, isError } = api.forms.listTemplates.useQuery({
  search: debouncedSearch || undefined,
  limit: 25,
  cursor,
})
```

4. After building, re-add the "Forms" item to nav-config.ts.

---

### C4.2: /admin/reviews -- Review Moderation

**Priority:** P2
**Effort:** Large
**Files to create:**
- `src/app/admin/reviews/page.tsx`

**Backend endpoints available:**
- `review.list` -- list reviews with filters
- `review.getById` -- get review detail
- `review.requestReview` -- send review request to customer
- `review.resolveIssue` -- resolve a negative review issue
- `review.getAutomation` -- get automation settings
- `review.updateAutomation` -- update automation settings

**Implementation approach:**

1. **Page layout:**
   - `PageHeader` with title "Reviews" and "Request Review" button
   - Filter chips: All, Pending, Published, Flagged
   - Rating filter (1-5 stars)
   - Table/card list: Customer name, Rating (stars), Comment preview, Date, Status, Actions
   - Detail sheet with full review, resolve action
   - Automation settings section (auto-publish threshold, auto-request after booking)

2. **Key features:**
   - Review list with filtering and pagination
   - Review detail sheet with full text and metadata
   - Resolve issue action for flagged reviews
   - Send review request (search customer + booking)
   - Automation settings panel

3. After building, re-add the "Reviews" item to nav-config.ts.

---

### C4.3: /admin/payments -- Invoice & Payment Management

**Priority:** P2
**Effort:** Large
**Files to create:**
- `src/app/admin/payments/page.tsx`

**Backend endpoints available:**
- `payment.listInvoices` -- list invoices with filters
- `payment.getInvoice` -- get invoice detail
- `payment.createInvoice` -- create invoice
- `payment.sendInvoice` -- send invoice to customer
- `payment.voidInvoice` -- void invoice
- `payment.recordPayment` -- record payment against invoice
- `payment.listPricingRules` -- list pricing rules

**Implementation approach:**

1. **Page layout:**
   - `PageHeader` with title "Payments" and "Create Invoice" button
   - Filter chips: All, Draft, Sent, Paid, Overdue, Voided
   - Table: Invoice #, Customer, Amount, Status, Due Date, Actions
   - Detail sheet: Full invoice with line items, payment history, actions (send, void, record payment)
   - Create invoice dialog: customer search, amount fields, due date

2. After building, re-add the "Payments" item to nav-config.ts.

---

### C4.4: /admin/developer -- Webhook Management

**Priority:** P2
**Effort:** Medium
**Files to create:**
- `src/app/admin/developer/page.tsx`

**Backend endpoints available:**
- `developer.listWebhookEndpoints` -- list webhooks
- `developer.createWebhookEndpoint` -- create webhook
- `developer.deleteWebhookEndpoint` -- delete webhook

**Implementation approach:**

1. **Page layout:**
   - `PageHeader` with title "Developer" and "Add Webhook" button
   - Table: URL, Events, Created, Status, Actions (delete)
   - Create webhook dialog: URL input, event type checkboxes
   - Secret display (shown once after creation)

2. **Note:** This overlaps with the Security tab webhook section. Consider whether to have a full page OR just wire the Security tab. If the Security tab is sufficient, skip this page and wire the tab instead (covered in C2.10).

3. After building, re-add the "Developer" item to nav-config.ts.

---

### C4.5: /admin/scheduling -- Schedule Management

**Priority:** P2
**Effort:** Large
**Files to create:**
- `src/app/admin/scheduling/page.tsx`

**Backend endpoints available:**
- `scheduling.listSlots` -- list slots with date/staff filters
- `scheduling.createSlot` -- create a slot
- `scheduling.updateSlot` -- update slot
- `scheduling.deleteSlot` -- delete slot
- `scheduling.bulkCreateSlots` -- bulk create
- `scheduling.generateRecurring` -- generate recurring slots
- `scheduling.checkAvailability` -- check staff availability
- `scheduling.getStaffRecommendations` -- get staff recommendations
- `scheduling.getAlerts` -- get scheduling alerts

**Implementation approach:**

1. **Page layout:**
   - `PageHeader` with title "Scheduling" and "Create Slot" button
   - Calendar view (week/day) showing slots by staff member
   - Slot creation dialog: date, time, duration, staff, recurring options
   - Alerts panel: scheduling conflicts, capacity warnings
   - Staff recommendation display for unassigned bookings

2. This is the most complex missing page and may benefit from reusing the existing calendar infrastructure.

3. After building, re-add the "Scheduling" item to nav-config.ts.

---

### C4.6: Global Search Integration

**Priority:** P2
**Effort:** Medium
**File to modify:** `src/components/layout/admin-topbar.tsx` (or wherever the command palette lives)

**Problem:** The nav has a "Search" link to `/admin/search` which does not exist. The plan says the command palette should use `search.globalSearch`.

**Implementation approach:**

Rather than creating a dedicated search page, integrate `search.globalSearch` into the existing command palette (Cmd+K). This is better UX than a separate page.

1. In the command palette component, when the user types a query:
```tsx
const { data: results } = api.search.globalSearch.useQuery(
  { query: searchInput, limit: 10 },
  { enabled: searchInput.length >= 2 }
)
```

2. Display results grouped by type (customers, bookings) with navigation links.

3. Remove the "Search" nav item from nav-config.ts since the command palette serves this purpose.

**Backend endpoints used:**
- `search.globalSearch` -- full-text search across customers and bookings

---

## Phase C5: Polish & Cleanup

### C5.1: Real Export Functions

**Priority:** P3
**Effort:** Medium
**Files to modify:** Analytics page, audit page, danger tab

**Problem:** All export functions use `setTimeout` fakes. No real files are generated.

**Implementation:**

For the analytics export: Generate CSV/PDF client-side from the data already fetched by the analytics queries. Use a library like `papaparse` for CSV generation:

```tsx
import Papa from "papaparse"

const handleExport = (format: "csv" | "pdf") => {
  if (format === "csv" && kpis.data) {
    const csv = Papa.unparse([
      { metric: "Bookings Created", value: kpis.data.bookings.created },
      { metric: "Revenue (Gross)", value: kpis.data.revenue.gross },
      // ...
    ])
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Analytics exported as CSV")
  }
}
```

For PDF export: Use `@react-pdf/renderer` or `jspdf`. This is more complex and can be deferred.

---

### C5.2: Platform Analytics Wiring

**Priority:** P3
**Effort:** Large
**File to modify:** `src/hooks/use-platform-analytics.ts`

**Problem:** The hook is completely stubbed. No backend procedures exist for platform-level analytics aggregation.

**Backend dependency:** This requires new backend procedures:
- `platform.getMetrics` -- aggregate metrics across all tenants (MRR, total tenants, churn rate)
- `platform.getMRRTimeSeries` -- MRR over time
- `platform.getTenantsByPlan` -- tenant distribution by plan
- `platform.getSignupTrend` -- new signups over time
- `platform.getChurnData` -- churned tenants list

**Implementation:** Blocked until backend procedures are created. Mark as "requires backend work" and leave the stub in place.

---

### C5.3: Dead Code Removal

**Priority:** P3
**Effort:** Small

1. Remove `console.log("Booking created:", bookingId)` from booking flow page (search for it in `src/app/book/[tenantSlug]/page.tsx`)
2. Remove hardcoded "System Status" section from dashboard (replaced in C2.1)
3. Remove "Connect your database" messaging from dashboard (replaced in C2.1)
4. Clean up unused imports in settings tabs after wiring them to real data

---

### C5.4: Settings Integrations Tab (OAuth)

**Priority:** P3
**Effort:** Large
**File to modify:** `src/components/settings/integrations-tab.tsx`

**Problem:** OAuth flow is placeholder only. `calendarSync.*` backend endpoints exist.

**Backend dependency:** OAuth requires:
- OAuth client credentials configured (Google, Microsoft)
- Backend endpoints for initiating OAuth flow and handling callbacks
- The `calendarSync` module needs to expose OAuth initiation endpoints

**Implementation:** This is largely a backend+infrastructure task. The frontend just needs to redirect to the OAuth URL provided by the backend. Defer until OAuth backend is ready.

**Also:** Fix the import -- currently uses `@/lib/trpc/client` instead of `@/lib/trpc/react`.

---

### C5.5: tRPC Client Import Consistency

**Priority:** P3
**Effort:** Small
**Files to modify:**
- `src/hooks/use-audit-log.ts` -- change `@/lib/trpc/client` to `@/lib/trpc/react`
- `src/components/settings/integrations-tab.tsx` -- change `@/lib/trpc/client` to `@/lib/trpc/react`

**Problem:** These files import from `@/lib/trpc/client` which is the vanilla tRPC client (no React Query hooks). They should import from `@/lib/trpc/react` which provides `.useQuery()`, `.useMutation()`, etc.

The vanilla client at `@/lib/trpc/client` uses `createTRPCClient` and does not have React Query integration. Using it in components with hooks will either fail or lose caching/deduplication benefits.

---

## Dependencies

```
C1.1 (FormFieldRenderer)      -- no deps, standalone
C1.2 (Merge Dialog)           -- no deps, standalone
C1.3 (Dead Nav Links)         -- no deps, standalone
C1.4 (Billing alert())        -- no deps, standalone
C1.5 (Audit Error Handling)   -- no deps, standalone

C2.1 (Dashboard)              -- no deps
C2.2 (Analytics Hook)         -- no deps
C2.3 (Settings General)       -- depends on C2.3 wiring use-settings-mutations first
C2.4 (Settings Modules)       -- depends on C2.3 wiring use-settings-mutations first
C2.5 (Settings Billing)       -- no deps
C2.6 (Settings Notifications) -- depends on C2.3 wiring use-settings-mutations first
C2.7 (Audit Log Hook)         -- depends on C1.5 (error handling un-commented)
C2.8 (Workflow Activate)      -- no deps
C2.9 (Customer Aggregates)    -- no deps
C2.10 (Security Webhooks)     -- no deps
C2.11 (Danger Tab)            -- no deps

C3.1 (Customer Edit)          -- no deps
C3.2 (Customer GDPR)          -- no deps
C3.3 (Error Boundaries)       -- no deps
C3.4 (Route Consolidation)    -- MUST be done before C4 (new pages need correct layout)

C4.1-C4.6 (New Pages)         -- depends on C3.4 (route consolidation)
                               -- depends on C1.3 (nav links removed, will re-add per page)

C5.1-C5.5 (Polish)            -- no hard deps, can be done anytime
```

---

## Parallel Execution Strategy

### Wave 1 (5 tasks, all independent -- 1-2 days)
Run all C1 tasks in parallel:
- C1.1: Wire FormFieldRenderer
- C1.2: Fix Customer Merge Dialog
- C1.3: Remove Dead Nav Links
- C1.4: Replace alert() in Billing Tab
- C1.5: Un-comment Audit Page Error Handling

### Wave 2 (4 tasks in parallel -- 2-3 days)
Start once C1 is complete. Group by dependency:
- **Agent A:** C2.1 (Dashboard) + C2.2 (Analytics Hook)
- **Agent B:** C2.3 (Settings General) + C2.4 (Settings Modules) + C2.5 (Settings Billing) + C2.6 (Settings Notifications) -- these share `use-settings-mutations.ts`
- **Agent C:** C2.7 (Audit Log) + C2.8 (Workflow Activate) + C2.9 (Customer Aggregates)
- **Agent D:** C2.10 (Security Webhooks) + C2.11 (Danger Tab)

### Wave 3 (4 tasks in parallel -- 2-3 days)
Start once Wave 2 is complete:
- **Agent A:** C3.1 (Customer Edit) + C3.2 (Customer GDPR)
- **Agent B:** C3.3 (Error Boundaries) -- all route segments
- **Agent C:** C3.4 (Route Group Consolidation)
- **Agent D:** C5.5 (tRPC Import Consistency) + C5.3 (Dead Code Removal)

### Wave 4 (6 tasks, can be parallelized -- 5-7 days)
Start once C3.4 is complete. Each new page is independent:
- **Agent A:** C4.1 (Forms Page)
- **Agent B:** C4.2 (Reviews Page)
- **Agent C:** C4.3 (Payments Page)
- **Agent D:** C4.4 (Developer Page) OR C4.6 (Search Integration)
- **Agent E:** C4.5 (Scheduling Page)

### Wave 5 (Polish -- 2-3 days)
- C5.1 (Real Exports)
- C5.2 (Platform Analytics -- blocked on backend)
- C5.4 (OAuth Integrations -- blocked on backend)

---

## Summary

| Phase | Tasks | Effort | Dependencies |
|-------|-------|--------|--------------|
| C1: Critical Fixes | 5 | 1-2 days | None |
| C2: Data Wiring | 11 | 3-4 days | C1 complete |
| C3: Missing Features | 4 | 2-3 days | C2 complete |
| C4: New Pages | 6 | 5-7 days | C3.4 complete |
| C5: Polish | 5 | 2-3 days | Anytime |

**Total estimated effort:** 13-19 engineering days (with 3-5 parallel agents, compresses to 5-7 calendar days).

**Backend work required for full completion:**
1. `analytics.getTopServices` -- aggregate endpoint for top services chart
2. `analytics.getChurnRiskList` -- aggregate endpoint for churn risk table
3. `platform.getMetrics` / `getMRRTimeSeries` / etc. -- platform analytics endpoints
4. OAuth initiation endpoints for calendar sync
5. `tenant.getAuditLog` -- tenant-scoped audit log (if needed for non-platform-admins)
6. Aggregate fields on `customer.list` response (to avoid N+1 for customer columns)

---

*Last updated: 2026-02-21*
