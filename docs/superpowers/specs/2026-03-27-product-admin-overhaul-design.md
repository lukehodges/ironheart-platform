# Product Admin System Overhaul — Design Spec

**Date:** 2026-03-27
**Status:** Draft
**Scope:** Overhaul `/platform/products` from minimal CRUD into a granular, data-dense internal admin system for managing products as module-set combinations.

---

## Context

The current `/platform/products` pages are functional but minimal: a basic list, a simple create/edit form, and a plan display section. For an internal power tool managing the core business abstraction (products = elements of the powerset of 15 modules), this needs to be a proper admin system with granular control.

### What exists today

- **Product list** (`/platform/products/page.tsx`): name, tagline, module tags, Live/Draft status, tenant count. No search, no filters, no MRR data.
- **Product form** (`/components/platform/product-form.tsx`): slug, name, tagline, description, domain, flat module toggle grid (15 toggles), published switch. Shared between create and edit.
- **Product detail** (`/platform/products/[id]/page.tsx`): renders the form + a basic plans section showing plan cards.
- **Product create** (`/platform/products/new/page.tsx`): wraps the form component.
- **Backend**: full product CRUD + plan CRUD via `product` module (types, schemas, repository, service, router). All tRPC endpoints behind `platformAdminProcedure`.
- **Data model**: `products` table (id, slug, name, tagline, description, logoUrl, domain, moduleSlugs, isPublished) + `product_plans` table (id, productId, slug, name, priceMonthly, priceYearly, trialDays, stripePriceId, features jsonb, isDefault).

### What's missing

- No data density on the list (no MRR, growth indicators, plan counts)
- No search or filtering
- No tabbed detail view — editing is a single flat form
- No feature matrix for plans (features are just a string array)
- No per-product tenant management view
- No product comparison / module set visualization
- No clone/archive lifecycle actions
- No per-product analytics
- No landing page preview/management from admin
- Module toggles are flat with no categorization or dependency hints

---

## Design

### 1. Product List View (`/platform/products`)

A data-dense table replacing the current simple list.

**Columns:**
| Column | Content |
|--------|---------|
| Product | Name (bold) + slug + plan count on second line |
| Modules | First 2 module badges + "+N" overflow badge |
| Tenants | Count + growth indicator ("↑ 3 this month" in green) |
| MRR | Calculated from active tenants × default plan price |
| Status | Badge: Live (green), Draft (grey), Archived (dim) |
| Actions | "⋯" menu |

**Toolbar:**
- Search input (filters by name/slug)
- Status dropdown filter (Live / Draft / Archived / All)
- Module dropdown filter (select module to show only products containing it)
- "Compare" button (opens compare view)
- "+ New Product" button (primary action)

**Row actions (⋯ menu):**
- Clone Product
- Archive Product (soft-archive, reversible)
- Delete Product (only if 0 tenants, requires confirmation)

**Row click:** navigates to `/platform/products/[id]` detail view.

**Sorting:** clickable column headers for Name (alpha), Tenants (count), MRR (value), Status.

---

### 2. Product Detail View (`/platform/products/[id]`)

A full management workspace with a product header and 6 tabs.

#### Header (persistent across tabs)
- Product name (large) + slug + created date
- Action buttons: Clone, Archive, Save Changes
- Status indicator (Live/Draft)

#### Tab: Overview

**Left column — Settings card:**
- Name (text input)
- Tagline (text input)
- Slug (read-only when editing, shown as monospace)
- Description (textarea)
- Domain (text input, optional)
- Published toggle (switch)

**Right column — Quick Stats card:**
- Active Tenants (count)
- Monthly Revenue (MRR in £)
- Modules Enabled (count)
- Pricing Plans (count)

**Right column — Module Summary card:**
- All enabled modules as badge chips (read-only, links to Modules tab)

#### Tab: Modules

**Categorized grid with dependency hints.**

Four categories, each rendered as a section with a heading:

| Category | Modules |
|----------|---------|
| **Core** | booking, scheduling, customer, team, payment |
| **Engagement** | forms, review, notification, outreach, ai |
| **Operations** | workflow, analytics, calendar-sync, pipeline |
| **Developer** | developer |

Each module is a card with:
- Module name + icon placeholder
- Toggle switch (on/off)
- Dependency hint: when toggling ON a module, if a commonly-paired module is OFF, show a subtle hint. E.g., enabling `review` shows "Works best with: customer". Non-blocking — just informational.

**Dependency hints (soft suggestions, not enforced):**
| Module | Suggests |
|--------|----------|
| booking | scheduling |
| review | customer |
| forms | customer |
| outreach | customer, notification |
| workflow | notification |
| pipeline | customer |
| calendar-sync | booking, scheduling |

**Module count** shown in section header: "Core (3/5 enabled)"

#### Tab: Plans & Pricing

Two sections: **Plan Cards** and **Feature Matrix**.

**Plan Cards:**
- Each plan rendered as a card with inline-editable fields:
  - Name, Slug
  - Monthly price (in pence, displayed as £XX.XX)
  - Yearly price (optional, in pence)
  - Trial days (number)
  - Stripe Price ID (text, monospace)
  - Default plan toggle (radio — only one can be default)
- Actions per card: Edit (expand inline), Delete (confirmation required, blocked if tenants on this plan)
- "+ Add Plan" button at end
- Up/down arrows for reordering (order affects display on landing page)

**Feature Matrix:**
- A comparison table where:
  - Rows = features (global list, editable)
  - Columns = plans
  - Cells = checkmark/cross toggle
- "Add Feature" button adds a new row
- Features are string labels (e.g., "Unlimited bookings", "Priority support", "Custom branding")
- Inline editing of feature labels
- Delete feature row (removes from all plans)
- This replaces the current `features` jsonb array — the matrix is the source of truth, serialized back to the jsonb array per plan on save

**Feature matrix data flow:**
- On load: union all plans' `features` arrays to build the global feature list, mark which plan includes which feature
- On save: for each plan, collect checked features into its `features` jsonb array
- No schema change needed — `features` jsonb stays as-is, the matrix is a UI abstraction over it

#### Tab: Tenants

A filtered table of tenants attached to this product (`tenants.productId = product.id`).

**Columns:** Tenant name, Plan, Status (active/trial/suspended/cancelled), Subscription ID, Created date, Actions

**Filters:** Status dropdown, Plan dropdown

**Quick actions per tenant:**
- Suspend / Activate
- Change Plan (dropdown of this product's plans)
- Impersonate (opens tenant admin in new tab)

**Pending Signups section** (below table):
- Shows signup requests for this product that are pending approval
- Approve / Reject buttons

**Empty state:** "No tenants on this product yet" with context about publishing the product.

#### Tab: Landing Page

Preview and management of the public `/products/{slug}` page.

**Content:**
- Hero text preview (name, tagline, description — pulled from Overview tab, read-only here)
- Logo preview + upload button
- "View Live Page" button → opens `/products/{slug}` in new tab
- "Copy Signup URL" button → copies `/signup/{slug}` to clipboard
- Published status indicator with link to toggle in Overview tab

This tab is intentionally lightweight — the actual content comes from the Overview tab fields. This tab is about previewing and accessing the public-facing page.

#### Tab: Analytics

Per-product metrics dashboard.

**KPI cards:**
- MRR (with month-over-month change %)
- Total Tenants
- Trial Conversion Rate (trials → paid)
- Churn Rate (cancelled / total, trailing 30 days)

**Charts (simple, not charting-library-heavy):**
- Plan distribution: horizontal bar showing tenant count per plan
- Tenant growth: simple count over time (could be a styled number list for MVP, upgrade to charts later)

**Data source:** computed from `tenants` table filtered by `productId`, using `subscriptionStatus`, `createdAt`, plan associations.

---

### 3. Compare Products View (`/platform/products/compare`)

Accessed from the product list toolbar.

**Flow:**
1. Select 2-3 products from a dropdown/picker
2. Render a Venn diagram visualization showing module sets

**Venn Diagram:**
- For 2 products: classic 2-circle Venn. Shared modules in intersection, unique modules in each wing.
- For 3 products: 3-circle Venn with all 7 regions.
- Module names displayed inside their region.
- Color-coded by product.

**Implementation:** CSS/SVG-based Venn diagram. No external charting library. Products are small sets (max 15 elements) so layout is manageable.

**Below the Venn:** a simple diff table listing all 15 modules with checkmarks per product, for those who prefer tabular data.

---

### 4. Product Create (`/platform/products/new`)

Reuses the Overview tab layout as a standalone page (no tabs — they appear after creation).

**Fields:** Name, Slug (auto-generated from name, editable), Tagline, Description, Domain.
**Module selection:** same categorized grid from the Modules tab.
**No plans on create** — redirects to the detail view Plans tab after creation.

After successful creation: redirect to `/platform/products/[id]` with the Plans tab active and a prompt to add the first plan.

---

### 5. Clone Product

Deep-copies:
- All product fields (new slug = `{original-slug}-copy`, new name = `{name} (Copy)`)
- All plans with their features
- Sets `isPublished = false` (Draft)

Does NOT copy:
- Tenants
- Analytics/revenue data

Redirects to the new product's detail view after clone.

---

### 6. Archive Product

- Sets a soft `isArchived` flag (or status field)
- Archived products hidden from list by default (show with "Archived" status filter)
- Archived products' landing pages return 404
- Existing tenants on archived products are unaffected (they keep running)
- Unarchive action available from the archived product's detail view

**Schema consideration:** The `products` table doesn't have an `isArchived` column. Options:
- Add `isArchived boolean DEFAULT false` to the products table
- Or reuse `isPublished = false` and add a separate `archivedAt timestamp` for archive state

Recommended: add `archivedAt timestamp DEFAULT null` — null = active, non-null = archived. This preserves the `isPublished` toggle as independent (a product can be unpublished/draft without being archived).

---

## Component Architecture

### New components

```
src/components/platform/
  product-list-table.tsx       — data-dense table with search/filters/sorting
  product-detail-header.tsx    — persistent header with name, actions, status
  product-tabs.tsx             — tab navigation component
  product-overview-tab.tsx     — settings + quick stats
  product-modules-tab.tsx      — categorized module grid with dependency hints
  product-plans-tab.tsx        — plan cards + feature matrix
  product-tenants-tab.tsx      — tenant table with quick actions
  product-landing-tab.tsx      — preview + links
  product-analytics-tab.tsx    — per-product metrics
  product-compare.tsx          — Venn diagram + diff table
  module-category-grid.tsx     — reusable categorized module toggle grid
  feature-matrix.tsx           — plan × feature comparison table
  plan-card.tsx                — individual plan card with inline editing
```

### Modified components

```
src/components/platform/product-form.tsx  — replaced by tab components (can be removed or kept for create-only)
```

### Modified pages

```
src/app/platform/products/page.tsx        — rebuild with product-list-table
src/app/platform/products/[id]/page.tsx   — rebuild as tabbed detail view
src/app/platform/products/new/page.tsx    — rebuild with categorized module grid
```

### New pages

```
src/app/platform/products/compare/page.tsx — compare view
```

---

## Backend Changes

### Schema change

Add to `products` table:
```sql
archivedAt TIMESTAMP DEFAULT NULL
```

Add to `product.schema.ts`:
```typescript
archivedAt: timestamp("archived_at"),
```

### New tRPC endpoints (product router)

| Endpoint | Procedure | Description |
|----------|-----------|-------------|
| `cloneProduct` | `platformAdminProcedure` | Deep-copy product + plans, return new product |
| `archiveProduct` | `platformAdminProcedure` | Set archivedAt timestamp |
| `unarchiveProduct` | `platformAdminProcedure` | Clear archivedAt timestamp |
| `reorderPlans` | `platformAdminProcedure` | Update plan display order |
| `getProductAnalytics` | `platformAdminProcedure` | Compute MRR, tenant count, churn, conversion for a product |
| `getProductComparison` | `platformAdminProcedure` | Return module sets for 2-3 products |

### Modified endpoints

| Endpoint | Change |
|----------|--------|
| `listProducts` | Add optional filters: `status` (live/draft/archived), `moduleSlug`, `search` (name/slug). Add computed fields: `tenantCount`, `mrr`, `planCount` |
| `getProduct` | Add computed fields: `tenantCount`, `mrr`, `tenantsByPlan`, `recentSignups` |

### Repository additions

```typescript
// product.repository.ts
cloneProduct(productId: string): Promise<ProductRecord>
archiveProduct(productId: string): Promise<void>
unarchiveProduct(productId: string): Promise<void>
getProductAnalytics(productId: string): Promise<ProductAnalytics>
getProductComparison(productIds: string[]): Promise<ProductComparison[]>
listProducts(filters: ProductListFilters): Promise<PaginatedResult<ProductWithStats>>
```

### Type additions

```typescript
// product.types.ts
interface ProductWithStats extends ProductRecord {
  tenantCount: number;
  activeTenantCount: number;
  trialTenantCount: number;
  mrr: number;
  planCount: number;
  tenantGrowthThisMonth: number;
}

interface ProductAnalytics {
  mrr: number;
  mrrChange: number; // percentage vs last month
  totalTenants: number;
  trialConversionRate: number;
  churnRate: number;
  tenantsByPlan: { planId: string; planName: string; count: number }[];
}

interface ProductComparison {
  productId: string;
  productName: string;
  moduleSlugs: string[];
}

interface ProductListFilters {
  search?: string;
  status?: 'live' | 'draft' | 'archived';
  moduleSlug?: string;
}
```

---

## What stays the same

- All existing tRPC endpoints continue working (additive changes only)
- Product module file structure follows established patterns
- `platformAdminProcedure` for all endpoints
- Drizzle ORM patterns (select/where/limit, transactions for clones)
- Error handling (domain errors in repo/service, never TRPCError)
- Pino logging (object first, message second)
- Existing tests pass without modification

---

## Out of scope

- Charting library (analytics uses simple styled numbers/bars for MVP)
- Drag-and-drop plan reordering (use up/down arrows for MVP, drag later)
- Real-time data updates (standard page load/refresh)
- Product versioning/history (clone is sufficient for now)
- Module dependency enforcement (hints only, not enforced)
- Custom landing page builder (content comes from product fields)
