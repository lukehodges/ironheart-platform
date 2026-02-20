# Ironheart Frontend Plan

**Stack:** Next.js 16 · React 19 · Tailwind 4 · tRPC 11 · shadcn/ui · Radix UI
**Target:** Enterprise-grade SaaS for large companies — secure, dense, accessible, white-labelable

---

## Status Overview

```
Phase 7A — Design System + Shell     ✓ COMPLETE  (commit 150268a)
Phase 7B — Admin Core                ✓ COMPLETE  (2026-02-20)
Phase 7C — Customer Portal           ← NEXT
Phase 7D — Advanced Admin            · planned
Phase 7E — Platform Admin            · planned
```

---

## Phase 7A — Design System + Shell ✓

**Goal:** Consistent, accessible, themeable foundation that every screen builds on.

### Delivered
- **26 UI components** — Button (7 variants, loading state), Input, Textarea, Label, Card, Badge (success/warning/info), Avatar, Separator, Skeleton (+ layout presets), Select, Checkbox, Switch, Tabs, ScrollArea, Progress, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Command, Table, Collapsible, EmptyState, PageHeader
- **Design token system** — CSS custom properties for light/dark/sidebar/charts, `@theme inline` for Tailwind v4 utility generation
- **tRPC React client** — `api` hook, React Query provider, singleton QueryClient, devtools in dev
- **Providers** — `ThemeProvider` (next-themes), `TRPCReactProvider`, `Toaster` (sonner), `CommandPaletteProvider`
- **Admin Sidebar** — dark zinc-950, collapsible (localStorage persisted), 8 nav sections / 15 routes, RBAC permission filtering, module-aware, mobile Sheet drawer
- **Admin Topbar** — breadcrumbs, ⌘K command palette, notification bell, user dropdown (profile, settings, theme toggle, sign out)
- **Root layout** — Inter font, provider composition, `suppressHydrationWarning`
- **Admin layout** — WorkOS auth guard, sidebar + topbar shell, main content area
- **3 utility hooks** — `useDebounce`, `useLocalStorage`, `useMediaQuery` / `useIsMobile`

---

## Phase 7B — Admin Core ✓

**Goal:** The daily-driver screens covering 90% of admin usage.

### Delivered (2026-02-20)
- **17 new files**, ~5,700 LOC across 5 agent waves
- **Shared booking components:** `BookingStatusBadge` (10-status exhaustive map), `BookingDetailSheet` (confirm/cancel mutations, optimistic updates), `NewBookingWizard` (3-step: customer search → slot picker → confirm)
- **`/admin/calendar`:** FullCalendar (week/day/month/list views), staff filter chips, drag-to-reschedule with revert on error, `calendar.css` dark mode overrides
- **`/admin/bookings`:** server-filtered table (status, date range, staff, search), bulk approve/cancel, CSV export, column visibility toggle, cursor pagination
- **`/admin/customers`:** debounced search, status filters, detail sheet (bookings/notes/forms tabs), create dialog, merge dialog (side-by-side diff)
- **`/admin/team`:** responsive staff grid, `AvailabilityEditor` (7×12 weekly grid, specific date overrides), capacity settings, add member dialog
- **Bug fixed:** `drizzle()` was missing relations — `db.query.*` with `with:` clauses now works (merged `relations.ts` into schema passed to `drizzle()`)

### Screen 1: Booking Calendar `/admin/calendar`
The highest-value screen. Admins live here.

**Features:**
- Week view default, day/month toggle
- FullCalendar React wrapper with custom event renderer
- Events colour-coded by status (PENDING=amber, CONFIRMED=green, CANCELLED=red, IN_PROGRESS=blue, COMPLETED=gray)
- Staff filter chips at the top (multi-select, avatars)
- Click event → `<Sheet side="right">` slide-over with full booking detail
  - Status badge, service, customer, staff assigned, date/time, location, notes
  - Action buttons: Confirm, Cancel, Reschedule, View Customer
- Drag event to reschedule → optimistic update → `booking.update` tRPC call → revert on error
- New booking button → 3-step modal wizard:
  1. Customer search (existing) or create new
  2. Service select + slot picker (calls `scheduling.getSlotsForDate`)
  3. Summary → Confirm (calls `booking.createBooking`)
- Loading skeleton that matches calendar grid shape

**Tech:** `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`

---

### Screen 2: Booking List `/admin/bookings`
Server-side filterable data table.

**Features:**
- TanStack Table via shadcn data-table pattern
- Server-side filtering: status (multi-select), date range (date picker), service, staff member, search query
- Columns: Status badge, Customer name+avatar, Service, Staff, Date/time, Created, Actions
- Row click → same booking slide-over as calendar
- Bulk actions toolbar (appears when rows selected): Approve, Cancel, Export CSV
- Pagination with page size selector (10/25/50/100)
- Column visibility toggle
- Export to CSV
- Empty state per filter combination ("No cancelled bookings in this period")

---

### Screen 3: Customers `/admin/customers`
Search-first customer management.

**Features:**
- Prominent search bar at top (debounced, backed by `/trpc/search.globalSearch`)
- Customer list with avatar, name, email, phone, total bookings, total spend, last seen
- Filter by: status (ACTIVE/INACTIVE/BLOCKED), date joined, total spend range
- Row click → customer detail sheet (right slide-over):
  - Profile card: avatar, name, email, phone, joined date, tags
  - Stats: total bookings, total spend, avg rating given, last booking
  - Booking history tab (paginated list)
  - Notes tab (add/edit/delete notes, calls `customer.addNote`)
  - Forms tab (completed forms)
- Create customer button → modal form
- Merge customers: select two → side-by-side diff view → confirm merge (calls `customer.mergeCustomers`)
- GDPR: export data, request deletion buttons (permission gated)

---

### Screen 4: Team `/admin/team`
Staff management and availability.

**Features:**
- Staff grid: avatar card per team member, name, role, status badge (ACTIVE/ON_LEAVE/INACTIVE)
- Click staff → detail sheet:
  - Profile + contact info
  - Availability editor: visual 7-day weekly grid
    - Click cell to toggle available/blocked
    - Drag to create recurring windows
    - Specific date overrides listed below
  - Capacity settings: default max daily bookings, override per day
  - Assigned bookings today (mini list)
- Add team member button (permission gated)
- Filter by: role, status, service capability
- "Who's available now" indicator

---

## Phase 7C — Customer Portal

**Goal:** The public-facing booking experience. First impressions, conversion-optimised, white-labelable per tenant.

### Booking Flow `/book/[tenantSlug]`
3-step wizard, no full-page reloads (single-page with animated step transitions):

**Step 1 — Select a Service**
- Service cards: name, duration, price, short description, staff count
- Category filter if multiple categories
- Mobile: vertical card stack. Desktop: grid.

**Step 2 — Pick a Slot**
- Month calendar with available dates highlighted
- Click date → time slots appear for that day
- Real-time availability (refetchInterval: 30s, stale indicator)
- Staff preference selector (optional — "No preference" default)
- If slot taken between load and confirm → graceful "Slot just filled" message + prompt to pick another

**Step 3 — Your Details**
- Name, email, phone (pre-filled if returning customer)
- Dynamic form fields from `FormTemplate` attached to service
- Booking summary card (service, staff, date/time, price)
- Confirm button → calls `booking.createBooking` → success screen

**Success Screen**
- Booking reference number
- Date/time/service/staff summary
- Add to calendar (Google/Apple/Outlook links)
- Email confirmation note
- Animated check / confetti (party bookings)

### Public Form `/forms/[sessionKey]`
- Render `FormTemplate` fields dynamically
- 8 field types: text, textarea, email, phone, dropdown, checkbox, date, file upload
- Multi-step for long forms (progress bar)
- Submit → calls `forms.submitForm` → thank you screen

### Review Submission `/review/[token]`
- Star rating (1–5, interactive)
- Written feedback textarea
- Submit → calls `review.submitReview` → thank you screen
- Single-use token validation on load

### Tenant Portal Theme
- Load `organizationSettings` (logo, brand colour, business name)
- Inject brand colour as `--color-primary` CSS variable override
- Logo in header replacing "Ironheart" wordmark
- Business name in browser title
- Looks like the tenant's product, not ours

---

## Phase 7D — Advanced Admin

**Goal:** Power features that justify the enterprise price point.

### Analytics Dashboard `/admin/analytics`
- KPI cards row: bookings this week (vs last), revenue this month (vs last), avg rating, new customers
- Revenue chart: line graph (Recharts), weekly/monthly toggle, hover tooltips
- Bookings by status: donut chart
- Top services by revenue: horizontal bar chart
- Staff utilisation: heatmap grid (staff × time)
- Churn risk table: customers flagged by RFM model (High/Medium/Low) with last booking date
- Date range picker (presets: 7d, 30d, 90d, 12m + custom)
- Export to CSV / PDF

### Workflow Builder `/admin/workflows`
Visual canvas — the key differentiator.

- **Canvas:** React Flow with custom node types
- **Sidebar:** draggable node palette grouped by type (Trigger, Actions, Control Flow)
- **Node types rendered:**
  - Trigger: event selector (booking.confirmed etc.)
  - Action nodes: Send Email, Send SMS, Create Calendar Event, Update Status, Send Notification, Create Task, Webhook
  - Control flow: IF, SWITCH, MERGE, LOOP, Wait for Event, Set Variable
- **Node config panel:** click node → right panel with type-specific config form
  - Send Email: template selector, recipient path, variable mapping
  - IF: condition builder (field + operator + value)
  - Delay: ISO 8601 duration picker
- **Execution history:** table of `workflowExecutions` with per-step status (green/red/pending)
- **Activate/deactivate toggle** per workflow
- Save → `workflow.create` or `workflow.update`

### Settings `/admin/settings`
Tabbed layout:

| Tab | Content |
|-----|---------|
| General | Business name, address, timezone, currency, logo upload |
| Notifications | Email/SMS template editor, reminder timing, opt-out settings |
| Integrations | Google Calendar connect/disconnect, Outlook connect/disconnect |
| Billing | Current plan, usage, upgrade CTA |
| Modules | Enable/disable platform modules (toggle cards) |
| Security | API keys list, create/revoke, webhook endpoints |
| Danger | Delete data, GDPR export |

### Audit Log `/admin/audit`
- Timeline of all state changes with actor, timestamp, before/after diff
- Filter by: resource type, actor, date range
- Export to CSV

---

## Phase 7E — Platform Admin

**Goal:** Multi-tenant management for platform operators.

**Route group:** `/platform` (requires `isPlatformAdmin = true`)

### Tenant List `/platform/tenants`
- Table: name, plan, user count, booking count, created date, status
- Filter by plan, status
- Row click → tenant detail

### Tenant Detail `/platform/tenants/[id]`
- Profile: name, domain, plan, created date
- Usage stats: bookings, users, storage
- Module enable/disable toggles
- Plan override (upgrade/downgrade without Stripe)
- Suspend / unsuspend toggle
- Impersonate (login as tenant admin) — high-permission action with audit log

### Create Tenant `/platform/tenants/new`
Wizard:
1. Business details (name, domain, industry)
2. Plan selection
3. Admin user (email → WorkOS invite)
4. Module selection
5. Confirm → `platform.createTenant`

### Platform Analytics `/platform/analytics`
- MRR across all tenants
- Active tenants by plan
- New signups over time
- Churn rate

---

## Non-Negotiables (apply to all phases)

| Concern | Requirement |
|---------|-------------|
| **Accessibility** | WCAG 2.1 AA minimum. All Radix components ship this for free — don't break it. Every custom interactive element needs aria- attributes, keyboard navigation, visible focus ring. |
| **Mobile** | Admin screens must work at 390px. Calendar collapses to agenda view. Tables collapse to card stack. Sidebar becomes sheet drawer (already done). |
| **Loading states** | Every async page has a matching skeleton. No blank white flashes. |
| **Empty states** | Every list/table has an empty state with icon + message + CTA. Use the `EmptyState` component. |
| **Optimistic updates** | Status changes, note adds, availability toggles — update UI before server confirms. Revert on error. |
| **Error handling** | All errors go through `sonner` toast. No `alert()`. `<ErrorBoundary>` on every page. |
| **Dark mode** | All screens must look correct in both modes. Token system handles this if you don't hardcode colours. |
| **White-label** | Customer portal injects tenant brand colour as `--color-primary` CSS variable. |
| **Enterprise density** | Tighter spacing than consumer apps. Power users want to see more data. `text-sm` for body, `text-xs` for metadata. |

---

## Package Additions Needed Per Phase

| Phase | Packages |
|-------|---------|
| 7B | `@fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list` |
| 7C | None (all UI components already available) |
| 7D | `reactflow` (workflow builder), `recharts` (charts) |
| 7E | None |

---

## Build Order Within Each Phase

Each phase follows the same agent wave pattern:
1. **Types + schemas** — TypeScript interfaces for page props, filter state, form values
2. **Data layer** — tRPC hooks, query/mutation wrappers, optimistic update helpers
3. **Core components** — the main page components
4. **Sub-components** — slide-overs, modals, forms
5. **Tests** — component tests for critical flows
6. **Verify** — tsc + build check

---

*Last updated: 2026-02-20*
*Backend: Phases 0–6 complete — 548 tests, 0 tsc errors*
*Frontend: Phases 7A–7B complete — 0 tsc errors, build passes*
