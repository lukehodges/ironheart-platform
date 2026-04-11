# Product Platform Architecture — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Turn Ironheart into a product factory where each module can be packaged as standalone SaaS, plus rebuild /platform as a proper command centre.

---

## Context

Ironheart is a multi-tenant platform with 23 modules, module gating per tenant, and white-label theming. The goal is to add a "product" layer so that any combination of modules can be packaged as a standalone SaaS product (e.g. "IronBook" for booking). Self-serve signup with Stripe billing. A rebuilt `/platform` serves as the command centre for managing all products, tenants, and revenue.

### What already exists
- 25 modules (23 fully implemented), 100 DB tables, 224 tests
- Module gating: `tenantModules` table + `isModuleEnabled()` + Redis cache
- Module manifests: each module self-declares nav items, permissions, routes
- Multi-tenant isolation: tenantId on every table, subdomain routing, WorkOS auth
- White-label theming: scoped CSS variables per tenant portal
- Tenant provisioning: transaction creates tenant + org settings + enables modules
- Stripe integration: exists for customer payments/invoices (not SaaS subscriptions)
- Platform admin: `isPlatformAdmin` flag, impersonation, basic tenant management

### What's missing
- No "product" concept mapping modules to a sellable package
- No self-serve signup (admin manually approves signup requests)
- No subscription billing (Stripe wired for invoices, not SaaS subscriptions)
- No standalone landing pages per product
- No product-scoped onboarding
- `/platform` is minimal — needs rebuild as a real operational tool

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Codebase | Single monorepo | One deploy, shared types, shared DB. /platform is an isolated route group, not a separate app |
| Product domains | Hybrid | Products live at /products/{slug} by default. Custom domains (ironbook.io) via DNS redirect — same page, no extra code |
| Pricing model | One plan per product (data model supports future tiers) | Don't build complex billing before having 10 customers. Schema supports tiers, UI shows one price |
| Landing pages | Built in Next.js as code | Developer builds them, one deploy, SSR/SEO works. Not a CMS — can add that later if needed |
| Billing UI | Stripe Customer Portal | Zero custom billing UI. Tenants manage cards, invoices, cancellation through Stripe hosted pages |
| Platform approach | Rebuild /platform with own layout, real dashboards | Not hollow dashboards — real data, daily-use operational tool |

---

## Data Model

### New table: `products`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| slug | text UNIQUE | URL-safe identifier ("ironbook") |
| name | text | Display name ("IronBook") |
| tagline | text | Short pitch for landing page hero |
| description | text | Longer description |
| logoUrl | text? | Product logo |
| domain | text? | Custom domain (null = /products/{slug}) |
| moduleSlugs | text[] | Modules included in this product |
| isPublished | boolean | Controls visibility on landing page + signup |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### New table: `productPlans`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| productId | UUID FK -> products | |
| slug | text | Plan identifier ("starter") |
| name | text | Display name ("Starter") |
| priceMonthly | integer | In pence (2900 = GBP 29) |
| priceYearly | integer? | Annual price in pence (null = no annual option) |
| trialDays | integer | Default 14 |
| stripePriceId | text | Stripe Price ID for checkout |
| features | jsonb | Feature list for landing page ["Unlimited bookings", ...] |
| isDefault | boolean | Shown on signup when only one plan |
| createdAt | timestamp | |

### Modified table: `tenants`

| New Column | Type | Description |
|------------|------|-------------|
| productId | UUID? FK -> products | null = full platform tenant (consulting), set = product-scoped SaaS customer |
| planId | UUID? FK -> productPlans | Active plan |

Existing `stripeCustomerId` and `subscriptionId` columns are reused.

### Key invariant

`productId = null` means full platform access (consulting clients, all modules available). `productId = <uuid>` means SaaS customer scoped to that product's `moduleSlugs`.

---

## Self-Serve Signup Flow

### Routes

```
/products/[productSlug]           — public landing page
/signup/[productSlug]             — signup form
/signup/[productSlug]/success     — post-checkout redirect
```

### Flow

1. **Landing page** — product pitch, features, pricing, single CTA ("Start Free Trial")
2. **Signup form** — 3 fields: business name, email, password. Creates WorkOS user + pending signup record with productId attached. Minimal friction.
3. **Stripe Checkout** — redirect to Stripe hosted checkout. Card collected, trial period from `productPlans.trialDays`. `productPlans.stripePriceId` determines price.
4. **Auto-provision** — `checkout.session.completed` webhook -> Inngest event -> provisions tenant with product's `moduleSlugs` enabled. No manual approval.
5. **Onboarding** — product-scoped setup wizard at `/admin/onboarding`. Only shows config for enabled modules (e.g. booking product: business hours, first service, team invite).

### Stripe Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Provision tenant, activate subscription, redirect to onboarding |
| `invoice.payment_failed` | Flag tenant, send dunning email via notification module |
| `customer.subscription.deleted` | Suspend tenant access (set status to SUSPENDED) |
| `customer.subscription.updated` | Update plan if changed via Stripe portal |

All webhook processing goes through Inngest for reliability and retry logic.

---

## Platform Command Centre (`/platform`)

Own layout (`src/app/platform/layout.tsx`), own sidebar, own topbar. Completely independent from `/admin`. Uses `platformAdminProcedure` for all tRPC calls.

### Navigation

**Products**
- All Products — list, create, edit products. Map modules, set pricing, toggle published
- Landing Pages — manage per-product landing page content

**Customers**
- Tenants — all tenants across all products. Filter by product, status, plan. Click to view detail, impersonate, suspend
- Users — all users across all tenants

**Revenue**
- Subscriptions — active, trialing, past due, cancelled. Stripe sync
- Revenue — MRR, ARR, growth rate, churn, LTV. Revenue per product. Real Stripe data

**Operations**
- Audit Log — cross-tenant audit trail
- Settings — platform-level configuration

### Dashboard KPIs

- MRR (with month-over-month change)
- Active Tenants (with new this month)
- Trial -> Paid conversion rate
- Churn rate
- Product breakdown (tenants + revenue per product)
- Recent signups feed

All metrics computed from real data (Stripe API + DB queries), not vanity numbers.

---

## Module System Changes

### Product-aware provisioning

When `productId` is set:
1. Look up `products.moduleSlugs`
2. Provision tenant with exactly those modules enabled via existing `tenantModules` mechanism
3. Module toggling locked — product-scoped tenants cannot add/remove modules

When `productId` is null:
- Existing flow unchanged. Manual provisioning, module picker wizard, full control.

### Sidebar rendering

Product-scoped tenants get:
- Only modules from `product.moduleSlugs` in sidebar (existing nav-builder already filters by enabled modules)
- A "Billing" nav item linking to Stripe Customer Portal
- "Powered by Ironheart" footer

Full platform tenants get:
- All enabled modules in sidebar (existing behaviour, unchanged)

### What does NOT change

- Module manifests — untouched
- Module registry — untouched
- `isModuleEnabled()` — untouched
- `tenantModules` table — still the source of truth
- `nav-builder.ts` — already filters by enabled modules
- All 23 module implementations — completely untouched
- `createModuleGate` — untouched

The product layer sits entirely on top of existing infrastructure.

---

## File Structure

### New DB schema

```
src/shared/db/schemas/product.schema.ts    — products + productPlans tables
```

### New module: `product`

```
src/modules/product/
  product.types.ts          — Product, ProductPlan interfaces
  product.schemas.ts        — Zod schemas for tRPC input
  product.repository.ts     — CRUD for products + plans
  product.service.ts        — product logic, plan resolution
  product.router.ts         — platformAdminProcedure endpoints
  index.ts
  __tests__/product.test.ts
```

### New module: `subscription`

```
src/modules/subscription/
  subscription.types.ts     — SubscriptionRecord, SubscriptionStatus
  subscription.schemas.ts   — Zod schemas
  subscription.repository.ts — Stripe subscription state in DB
  subscription.service.ts   — create checkout, handle webhooks, manage lifecycle
  subscription.router.ts    — public (checkout) + tenant (billing portal) + platform (overview)
  subscription.events.ts    — Inngest handlers for webhook processing
  index.ts
  __tests__/subscription.test.ts
```

### Modified files

```
src/shared/db/schemas/tenant.schema.ts  — add productId, planId columns to tenants
src/modules/platform/platform.service.ts — product-aware provisioning path
src/server/root.ts                       — add product + subscription routers
src/shared/inngest.ts                    — add stripe webhook events
src/app/api/webhooks/stripe/route.ts     — expand webhook handler
```

### New pages

```
src/app/products/[productSlug]/page.tsx      — public landing page
src/app/signup/[productSlug]/page.tsx            — signup form
src/app/signup/[productSlug]/success/page.tsx    — post-checkout success

src/app/platform/layout.tsx                  — platform command centre layout
src/app/platform/page.tsx                    — dashboard
src/app/platform/products/page.tsx           — product list + CRUD
src/app/platform/products/[id]/page.tsx      — product detail/edit
src/app/platform/tenants/page.tsx            — tenant list (rebuild)
src/app/platform/tenants/[id]/page.tsx       — tenant detail + impersonate
src/app/platform/subscriptions/page.tsx      — subscription overview
src/app/platform/revenue/page.tsx            — revenue analytics
src/app/platform/audit/page.tsx              — cross-tenant audit log
```

### New components

```
src/components/platform/
  platform-sidebar.tsx       — command centre nav
  platform-topbar.tsx        — platform header
  dashboard-kpis.tsx         — MRR, tenants, conversion, churn cards
  product-form.tsx           — create/edit product
  revenue-chart.tsx          — revenue over time
  tenant-table.tsx           — filterable tenant list
  subscription-table.tsx     — subscription status list

src/components/signup/
  signup-form.tsx            — business name + email + password
  checkout-redirect.tsx      — Stripe Checkout redirect handler
```

### Approximate scope

~25 new files, ~4,500 LOC. Two new backend modules following existing patterns exactly. Platform pages are the bulk of the work (real, functional dashboards with actual data).

---

## Testing Strategy

- **product module**: unit tests for CRUD, plan resolution, module slug validation
- **subscription module**: unit tests for checkout creation, webhook processing, lifecycle management. Mock Stripe API calls.
- **provisioning**: integration test that signup -> checkout webhook -> tenant provisioned with correct modules
- **platform pages**: component tests for dashboard KPIs, product form, tenant table
- **existing tests**: all 224 existing tests must continue passing (zero regressions)
