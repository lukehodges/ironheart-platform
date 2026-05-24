# Platform Shell Audit — 2026-05-23

> **Phase**: 0.1.A — Task 1
> **Type**: Read-only inventory. No source files modified.
> **Purpose**: Establish ground truth before adding `/platform/*` stubs in Task 4.

---

## 1. Current `/platform/*` Tree

All files under `src/app/platform/`, relative to `src/app/`.

| Path (relative to src/app/) | Type | Description | Flag |
|---|---|---|---|
| `platform/layout.tsx` | layout.tsx | Full auth gate: WorkOS session + `isPlatformAdmin` DB check; wraps children in `PlatformShellClient` (Frame + CommandPalette + AICopilot). Meaningful implementation. | KEEP |
| `platform/page.tsx` | page.tsx | Full tenant management dashboard — tenant table/card view, KPI row, module adoption chart, health flags, revenue chart, drawer. ~882 lines, mock data via `@/lib/mock/platform`. No redirect to `/platform/today`. | KEEP |
| `platform/platform-shell-client.tsx` | component | Client wrapper composing `Frame` (surface="platform"), `CommandPalette`, and `AICopilot`. Passes user prop from server layout. | KEEP |
| `platform/error.tsx` | error.tsx | Error boundary using `ErrorCard`, home link set to `/platform`. | KEEP |
| `platform/actions.ts` | route.ts (server action) | Single `signOutAction()` server action — calls WorkOS `signOut()`. | KEEP |
| `platform/analytics/page.tsx` | page.tsx | Real implementation: uses `usePlatformAnalytics` hook + 5 chart components (MRRChart, TenantsByPlanChart, SignupTrendChart, ChurnTable, PlatformMetricsCards). ~59 lines. | KEEP / **COLLISION** |
| `platform/revenue/page.tsx` | page.tsx | Real implementation: server component; DB query for products/plans, calculates MRR/ARR per product, renders table. ~118 lines. | KEEP |
| `platform/subscriptions/page.tsx` | page.tsx | Real implementation: server component; lists all tenants with `subscriptionId`, maps to product name. ~85 lines. | KEEP |
| `platform/tenants/page.tsx` | page.tsx | Real implementation: renders `TenantListTable` in Suspense with a "Create Tenant" button. ~33 lines. | KEEP |
| `platform/tenants/new/page.tsx` | page.tsx | Real implementation: renders `TenantWizard` component for multi-step tenant creation. ~16 lines. | KEEP |
| `platform/tenants/[id]/page.tsx` | page.tsx | Real implementation: renders `TenantDetailContent` in Suspense. ~31 lines. | KEEP |
| `platform/products/page.tsx` | page.tsx | Real implementation: server component; calls `productService.listProductsWithStats`, passes to `ProductListClient`. ~8 lines. | KEEP |
| `platform/products/new/page.tsx` | page.tsx | Real implementation: client component with full form (name, slug, tagline, description, domain, module selector). tRPC mutation to create product. ~96 lines. | KEEP |
| `platform/products/[id]/page.tsx` | page.tsx | Real implementation: server component; DB queries for product + plans + tenants + analytics, passes to `ProductDetailClient`. ~82 lines. | KEEP |
| `platform/products/compare/page.tsx` | page.tsx | Real implementation: tRPC-powered product comparison with Venn diagram visualization and diff table. ~212 lines. | KEEP |
| `platform/__tests__/platform-analytics.test.tsx` | test | Vitest unit test for `PlatformAnalyticsPage` — mocks hook and 5 chart components, 4 test cases. | KEEP |

**Summary**: 16 files, 0 stubs. Every existing `/platform/*` file has real implementation content.

---

## 2. Current `/admin/*` and `/(admin)/*` Tree

**`/(admin)/` route group**: The directory at `src/app/(admin)/` **exists but is completely empty** (created 2026-02-21, no files). This is a vestigial placeholder — no layout, no routes.

**`src/app/admin/`** — full file list:

| Path (relative to src/app/admin/) | Type | Description | Flag |
|---|---|---|---|
| `layout.tsx` | layout.tsx | Full auth + RBAC layout: WorkOS session, DB user load, permission set, enabled modules, impersonation via Redis. Platform admins are redirected to `/platform` unless impersonating a tenant. Renders `ImpersonationBanner` + `AdminShellClient`. ~129 lines. | KEEP |
| `page.tsx` | page.tsx | Admin root — ~273 lines, full dashboard | KEEP |
| `admin-shell-client.tsx` | component | Client shell for admin, parallel to `platform-shell-client.tsx` | KEEP |
| `error.tsx` | error.tsx | Error boundary for admin | KEEP |
| `dashboard/page.tsx` | page.tsx | Dashboard page — ~273 lines, real implementation | KEEP |
| `clients/page.tsx` | page.tsx | Full client engagement list — table/board view, segment rail, preview drawer, sorting/filtering. ~764 lines, mock data. | KEEP |
| `clients/new/page.tsx` | page.tsx | New engagement form — ~237 lines, real implementation | KEEP |
| `clients/[engagementId]/page.tsx` | page.tsx | Engagement detail — ~945 lines, full implementation | KEEP |
| `clients/[engagementId]/hub/page.tsx` | page.tsx | Client hub sub-view — ~307 lines | KEEP |
| `clients/[engagementId]/audit/page.tsx` | page.tsx | Audit workspace — ~540 lines | KEEP |
| `clients/[engagementId]/audit/lens/page.tsx` | page.tsx | Audit lens sub-view | KEEP |
| `clients/[engagementId]/overview/page.tsx` | page.tsx | Engagement overview sub-view | KEEP |
| `clients/[engagementId]/money/page.tsx` | page.tsx | Financial sub-view — ~160 lines | KEEP |
| `clients/[engagementId]/report/page.tsx` | page.tsx | Report sub-view — ~246 lines | KEEP |
| `clients/[engagementId]/work/page.tsx` | page.tsx | Work/task sub-view — ~341 lines | KEEP |
| `clients/[engagementId]/proposals/new/page.tsx` | page.tsx | New proposal form | KEEP |
| `clients/[engagementId]/proposals/[proposalId]/page.tsx` | page.tsx | Proposal detail | KEEP |
| `pipeline/page.tsx` | page.tsx | Full pipeline — ~1002 lines, kanban + list, mock data | KEEP |
| `pipeline/[id]/page.tsx` | page.tsx | Pipeline deal detail | KEEP |
| `pipeline/_components/pipeline-forecast.tsx` | component | Pipeline forecast widget | KEEP |
| `pipeline/_components/pipeline-list.tsx` | component | Pipeline list view | KEEP |
| `pipeline/_components/pipeline-right-panel.tsx` | component | Pipeline right panel/drawer | KEEP |
| `pipeline/_mock-data.ts` | component | Mock data for pipeline | KEEP |
| `bookings/page.tsx` | page.tsx | Bookings list — ~133 lines, real implementation | KEEP |
| `bookings/new/page.tsx` | page.tsx | New booking form | KEEP |
| `bookings/[id]/page.tsx` | page.tsx | Booking detail | KEEP |
| `calendar/page.tsx` | page.tsx | Calendar view — ~1104 lines, full month/week/day calendar | KEEP |
| `analytics/page.tsx` | page.tsx | Analytics dashboard — ~234 lines, real implementation | KEEP |
| `forms/page.tsx` | page.tsx | Forms list — ~166 lines | KEEP |
| `forms/[id]/page.tsx` | page.tsx | Form detail/editor | KEEP |
| `forms/submissions/[id]/page.tsx` | page.tsx | Form submission detail | KEEP |
| `inbox/page.tsx` | page.tsx | Inbox/messages — ~793 lines, full implementation | KEEP |
| `outreach/page.tsx` | page.tsx | Outreach module — ~267 lines | KEEP |
| `outreach/_mock-data.ts` | component | Mock data for outreach | KEEP |
| `payments/page.tsx` | page.tsx | Payments list — ~194 lines | KEEP |
| `payments/new/page.tsx` | page.tsx | New payment form | KEEP |
| `payments/[id]/page.tsx` | page.tsx | Payment detail | KEEP |
| `workflows/page.tsx` | page.tsx | Workflow list — ~869 lines, full implementation | KEEP |
| `workflows/[id]/page.tsx` | page.tsx | Workflow detail | KEEP |
| `workflows/[id]/edit/page.tsx` | page.tsx | Workflow editor | KEEP |
| `workflows/[id]/executions/page.tsx` | page.tsx | Workflow execution history | KEEP |
| `reviews/page.tsx` | page.tsx | Reviews list — ~232 lines | KEEP |
| `settings/page.tsx` | page.tsx | Settings page — ~309 lines, real implementation | KEEP |
| `team/page.tsx` | page.tsx | Team management — ~828 lines, full implementation | KEEP |
| `team/[id]/page.tsx` | page.tsx | Team member detail | KEEP |
| `ai-chat/page.tsx` | page.tsx | AI chat interface — ~228 lines, real implementation | KEEP |
| `customers/page.tsx` | page.tsx | Customers CRM — ~1018 lines, full implementation | KEEP |
| `customers/[id]/page.tsx` | page.tsx | Customer detail — ~559 lines | KEEP |
| `audit/page.tsx` | page.tsx | Audit workspace — ~414 lines | KEEP |
| `scheduling/page.tsx` | page.tsx | Redirect stub → `redirect("/admin/calendar")` (5 lines) | STUB |
| `developer/page.tsx` | page.tsx | Redirect stub → `redirect("/admin/settings")` (5 lines) | STUB |

**Parallel pairs** (legacy `/admin/*` routes vs planned `/platform/*` routes):

| Planned `/platform/` route | Legacy `/admin/` source | Notes |
|---|---|---|
| `clients` | `admin/clients/page.tsx` | Full ~764-line implementation in admin |
| `clients/new` | `admin/clients/new/page.tsx` | ~237 lines in admin |
| `clients/[id]` | `admin/clients/[engagementId]/page.tsx` | ~945 lines; note param name difference: `[id]` vs `[engagementId]` |
| `clients/[id]/onboarding` | No direct equivalent | Closest: `admin/clients/[engagementId]/hub/page.tsx` or `overview` |
| `pipeline` | `admin/pipeline/page.tsx` | Full ~1002-line implementation |
| `bookings` | `admin/bookings/page.tsx` | ~133 lines |
| `calendar` | `admin/calendar/page.tsx` | Full ~1104-line implementation |
| `forms` | `admin/forms/page.tsx` | ~166 lines |
| `inbox` | `admin/inbox/page.tsx` | Full ~793-line implementation |
| `outreach` | `admin/outreach/page.tsx` | ~267 lines |
| `payments` | `admin/payments/page.tsx` | ~194 lines |
| `workflows` | `admin/workflows/page.tsx` | Full ~869-line implementation |
| `reviews` | `admin/reviews/page.tsx` | ~232 lines |
| `analytics` | `admin/analytics/page.tsx` | ~234 lines (also exists at `platform/analytics/page.tsx`) |
| `team` | `admin/team/page.tsx` | Full ~828-line implementation |
| `settings` | `admin/settings/page.tsx` | ~309 lines |
| `ai-chat` | `admin/ai-chat/page.tsx` | ~228 lines |
| `invoices` | No equivalent in admin | New route |
| `finance` | No equivalent in admin | New route |
| `reports` | No equivalent in admin | New route |
| `today` | No equivalent | New route |

---

## 3. Routes to Add under `/platform/*`

For each planned stub from Task 4:

| Route | In `/platform/` already? | In `/admin/` with content? | Recommendation |
|---|---|---|---|
| `today` | No | No | SAFE TO STUB |
| `clients` | No | Yes — `admin/clients/page.tsx` (~764 lines) | SAFE TO STUB |
| `clients/new` | No | Yes — `admin/clients/new/page.tsx` (~237 lines) | SAFE TO STUB |
| `clients/[id]` | No | Yes — `admin/clients/[engagementId]/page.tsx` (~945 lines) | SAFE TO STUB |
| `clients/[id]/onboarding` | No | Partial — no direct match; closest is `admin/clients/[engagementId]/hub/` or `overview/` | SAFE TO STUB |
| `pipeline` | No | Yes — `admin/pipeline/page.tsx` (~1002 lines) | SAFE TO STUB |
| `bookings` | No | Yes — `admin/bookings/page.tsx` (~133 lines) | SAFE TO STUB |
| `calendar` | No | Yes — `admin/calendar/page.tsx` (~1104 lines) | SAFE TO STUB |
| `forms` | No | Yes — `admin/forms/page.tsx` (~166 lines) | SAFE TO STUB |
| `inbox` | No | Yes — `admin/inbox/page.tsx` (~793 lines) | SAFE TO STUB |
| `outreach` | No | Yes — `admin/outreach/page.tsx` (~267 lines) | SAFE TO STUB |
| `payments` | No | Yes — `admin/payments/page.tsx` (~194 lines) | SAFE TO STUB |
| `invoices` | No | No | SAFE TO STUB |
| `finance` | No | No | SAFE TO STUB |
| `workflows` | No | Yes — `admin/workflows/page.tsx` (~869 lines) | SAFE TO STUB |
| `reviews` | No | Yes — `admin/reviews/page.tsx` (~232 lines) | SAFE TO STUB |
| `analytics` | **YES** — `platform/analytics/page.tsx` (59 lines, real chart implementation) | Yes — `admin/analytics/page.tsx` (~234 lines) | **MERGE** — page exists and has real content; Task 4 must NOT overwrite this file |
| `reports` | No | No | SAFE TO STUB |
| `team` | No | Yes — `admin/team/page.tsx` (~828 lines) | SAFE TO STUB |
| `settings` | No | Yes — `admin/settings/page.tsx` (~309 lines) | SAFE TO STUB |
| `ai-chat` | No | Yes — `admin/ai-chat/page.tsx` (~228 lines) | SAFE TO STUB |

**COLLISION count**: 1 — `platform/analytics/page.tsx` already exists with real content.

---

## 4. Layout Collision Check

### Does `src/app/platform/layout.tsx` already exist?

**Yes.** It is a full implementation (64 lines), not a default placeholder. Content:
- WorkOS auth via `withAuth({ ensureSignedIn: true })`
- DB check for `isPlatformAdmin` on the `users` table
- Redirects to `/admin` on failure (note: plan says redirect to `/auth/login?redirect=/platform` — the existing implementation differs, see Section 5)
- Wraps children in `<div className="h-screen overflow-hidden"><PlatformShellClient ...>{children}</PlatformShellClient></div>`

**Task 2 plans to create `src/app/platform/layout.tsx` — it already exists with a meaningful implementation.** Task 2 must treat this as a MERGE/UPDATE, not a create.

### Do any `src/app/platform/{section}/layout.tsx` files exist?

No — there are no sub-layouts anywhere under `src/app/platform/`. Only the root `platform/layout.tsx` exists. Adding new child routes will slot cleanly under it.

### Next.js layout composition risk

The existing `platform/layout.tsx` wraps children with:
```tsx
<div className="h-screen overflow-hidden">
  <PlatformShellClient user={userForShell}>
    {children}
  </PlatformShellClient>
</div>
```

This is a fixed-height full-viewport shell. Existing children (`/platform/page.tsx`, `/platform/analytics/`, `/platform/tenants/`, etc.) are already written to expect this wrapper — they use inline CSS with heights relative to the viewport or use `overflow: auto` internally. New stub children will be wrapped the same way automatically. **No breaking risk from adding child routes.**

One nuance: the `AdminShellClient` in `admin/layout.tsx` adds an extra `<div className="p-6 max-w-screen-2xl mx-auto">` around children, but `PlatformShellClient` does not — children receive no automatic padding. New platform stubs should include their own padding, consistent with existing platform pages which use `padding: "24px 28px"` or `p-8` directly.

---

## 5. Auth Gate Pattern

### File path
`src/app/platform/layout.tsx` (already the auth gate for `/platform/*`)

There is **no separate** `src/app/(admin)/layout.tsx` — the `(admin)` route group directory exists but is empty. The active auth gate for `/admin/*` is `src/app/admin/layout.tsx`.

### How the existing `/platform/layout.tsx` auth gate works

```tsx
// 1. Require WorkOS session
const { user: workosUser } = await withAuth({ ensureSignedIn: true })
if (!workosUser) redirect("/sign-in")

// 2. DB lookup — check isPlatformAdmin flag
const result = await db
  .select({ id: users.id, isPlatformAdmin: users.isPlatformAdmin })
  .from(users)
  .where(eq(users.workosUserId, workosUser.id))
  .limit(1)

const dbUser = result[0]
if (!dbUser || !dbUser.isPlatformAdmin) redirect("/admin")
// (catch block also redirects to "/admin")
```

Session: WorkOS AuthKit via `withAuth({ ensureSignedIn: true })` — this is server-side; WorkOS handles the redirect to sign-in automatically.

Platform admin check: `isPlatformAdmin` column on the `users` table in Drizzle schema (file: `src/shared/db/schemas/auth.schema`). If false or user not found, redirects to `/admin`.

### How `/admin/layout.tsx` auth gate works (for reference/comparison)

```tsx
const { user: workosUser } = await withAuth({ ensureSignedIn: true })
// DB check same as platform layout
// Additionally: loads permissions via userRoles → rolePermissions → permissions
// Additionally: loads enabledModuleSlugs from tenantRepository
// If isPlatformAdmin AND no Redis impersonation key → redirect("/platform")
```

The admin layout is more complex: it loads RBAC permissions, handles impersonation via Redis (`impersonate:{workosUserId}` key), and redirects platform admins away to `/platform` unless they're impersonating.

### Pattern to copy for `/platform/*` auth gate

The `/platform/layout.tsx` auth gate is **already the correct pattern** — it does not need to be added; it exists. Task 3 should verify the existing implementation satisfies acceptance criteria:

1. No session → `withAuth({ ensureSignedIn: true })` handles redirect (WorkOS redirects to sign-in). **Existing code: handled.**
2. Not platform admin → `redirect("/admin")`. **Existing code redirects to `/admin`, plan says `/[tenantSlug]/dashboard` or `/403`. Divergence to note.**
3. `isPlatformAdmin` true → proceed. **Existing code: correct.**

---

## 6. Design Tokens / Brand

### File paths

- Primary: `src/app/globals.css` — contains all Ironheart tokens as CSS custom properties
- Reference: `.reference-design/` directory (contains `index.html`, `app-tokens.css`, `design-canvas.jsx`, `screens/`, `ds/`, etc.) — source-of-truth design system

### Key tokens (from `globals.css`)

```css
/* Backgrounds */
--ih-bg:        #FAFAF7;        /* warm off-white page background */
--ih-surface:   #FFFFFF;        /* card/panel surface */
--ih-surface-2: #F4F2EC;        /* elevated surface, sidebar */
--ih-surface-3: #ECE9E1;        /* further elevated */

/* Ink */
--ih-ink:       #0E1013;        /* near-black body text */

/* Accent */
--ih-accent:    #D13A1F;        /* Ironheart ember red */

/* Semantic */
--ih-ok:        #2F6F5C;        /* moss green (success) */
--ih-warn:      #B8860B;        /* amber (warning) */
--ih-info:      #2A5DBF;        /* info blue */
--ih-danger:    #C0392B;        /* danger red */

/* No explicit gold token defined. Amber warn (#B8860B) is closest. */

/* Fonts */
--ih-font-serif: "Instrument Serif", Georgia, serif;    /* headings */
--ih-font-sans:  "Inter", ui-sans-serif, system-ui;     /* body */
--ih-font-mono:  "JetBrains Mono", ui-monospace;        /* data/code */

/* Shell dimensions */
--ih-sidebar-w: 232px;
--ih-sidebar-w-collapsed: 56px;
--ih-topbar-h: 48px;
```

Tailwind v4 `@theme inline` block in `globals.css` bridges shadcn HSL variables to Ironheart values (e.g. `--background: 60 20% 98%` maps to `#FAFAF7`).

No explicit "moss green" utility class — `--ih-ok` (`#2F6F5C`) is the moss green equivalent.

### shadcn/ui

**Installed and configured.** `components.json` at project root:
- Style: `"default"`
- RSC: `true`
- Base color: `"zinc"` (overridden by Ironheart HSL vars)
- CSS variables: `true`
- Icon library: `lucide`
- No prefix

Important: the existing platform pages use **both** shadcn components (`Button`, `Card`, `Input`, `Skeleton`, `Badge`, `Table` etc.) and raw Ironheart CSS-var inline styles (`var(--ih-accent)`, `var(--ih-surface)`, etc.) depending on which was written first. The tenants/products/analytics pages use shadcn. The main `/platform/page.tsx` and `/admin/*` pages use inline Ironheart tokens. Task 2 should pick one approach and document it — the plan references Ironheart tokens specifically.

---

## 7. Open Issues / Risks

- **COLLISION — `platform/analytics/page.tsx` already exists**: Task 4 stub list includes `analytics` but the file is a real implementation using `usePlatformAnalytics` hook + 5 chart components. Do NOT stub this route. Either skip it in Task 4 or treat it as already complete. The plan's own tree diagram notes this with "ALREADY EXISTS — merge or rename".

- **Layout already exists**: Task 2 says "Create: `src/app/platform/layout.tsx`" but the file exists and is functional. Task 2 must update/extend rather than create from scratch. The shell client (`PlatformShellClient`) that renders `Frame` with `surface="platform"` is also already in place.

- **Auth redirect mismatch**: Existing `platform/layout.tsx` redirects unauthorized users to `/admin`. The plan (Task 3) says redirect to `/[tenantSlug]/dashboard` or `/403`. These are not the same. Task 3 needs to decide whether to update the existing redirect target and how to resolve `[tenantSlug]` without a session-level tenant context.

- **`/platform/page.tsx` is the tenant overview, not `today`**: The existing `/platform` root page is a full tenant management dashboard (the list with KPI row). The plan says `/platform` should land on `/platform/today`. This is a divergence: either `page.tsx` needs a redirect added, or `today` replaces it. The current page has no redirect to `today`.

- **Two auth patterns coexist**: `/admin/layout.tsx` has impersonation, RBAC, module loading. `/platform/layout.tsx` is simpler (only `isPlatformAdmin` check). They use the same `withAuth` + Drizzle pattern but diverge on impersonation. Task 2/3 should not accidentally merge these.

- **`(admin)` route group is an empty directory**: `src/app/(admin)/` exists but contains no files. It was presumably created as a placeholder for grouping but never used. Harmless but worth noting — it is not the auth group referenced in the plans.

- **Styling consistency gap**: Existing `/platform/page.tsx` uses raw `var(--ih-*)` inline styles. `platform/analytics`, `tenants`, `products`, `revenue`, `subscriptions` pages use shadcn Tailwind classes. Two visual patterns exist side-by-side. Task 2's sidebar/topbar design needs to pick one. The plan references Ironheart tokens specifically.

- **`platform/page.tsx` uses mock data**: The main `/platform` dashboard uses `@/lib/mock/platform` entirely. It will not reflect real tenant data until the mock is replaced. This is known from the plan but worth flagging as it may confuse test validation.

- **No `today`, `finance`, `invoices`, `reports` anywhere in codebase**: These four routes are entirely new with no admin equivalent to draw from. Stubs are safe; just no migration source.
