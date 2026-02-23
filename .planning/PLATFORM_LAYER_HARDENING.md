# Platform Layer Hardening Plan

Focus: Make the always-on platform layer (auth, tenant, platform, analytics, search, audit, notification, settings) rock solid before re-enabling vertical modules.

---

## P0 — Broken Without These (platform literally doesn't function)

| # | Source | Issue | Why |
|---|--------|-------|-----|
| 1 | MVP Gap #12 | **Modules table not seeded** | `isModuleEnabled()` returns false for everything — no module gating works at all. The `tenantModules` table references `modules.id` by FK. Without rows in `modules`, nothing can be enabled. |
| 2 | Bookmark #16 | **Seed data overhaul** | Can't develop or test anything without representative data. Current seed scripts reference modules that may not exist in the DB. |

## P1 — Security (platform is unsafe)

| # | Source | Issue | Why |
|---|--------|-------|-----|
| 3 | MVP Gap #9 | **RBAC bypass for MEMBER users** | OWNER/ADMIN get `["*:*"]` (fixed). But MEMBER users still get `permissions = []` → sidebar shows everything because `hasPermission()` returns true when no permissions are loaded. Need to load actual permission strings from `userPermissions` table for MEMBER users. |
| 4 | MVP Gap #10 | **Inngest route handler audit** | Must confirm all platform module event handlers (notification, audit, etc.) are registered in `/api/inngest/route.ts`. Unregistered handlers silently fail. |

## P2 — Architecture Cleanup (inconsistent/confusing)

| # | Source | Issue | Why |
|---|--------|-------|-----|
| 5 | MVP Gap #4 | **Settings vs Tenant overlap** | Two modules both claim `/admin/settings`. `tenant.router.ts` handles org settings, `settings.router.ts` handles API keys and module tab discovery. The settings page has 7 tabs but ownership is split across two routers. Need clear boundaries. |
| 6 | MVP Gap #7 | **Search has no service layer** | The search router calls the repository directly — the only platform module violating the established router → service → repository pattern. Also only covers 2 entity types (customers + bookings). |
| 7 | MVP Gap #11 | **shared.schema.ts is a 776-line monolith** | Contains tables for modules, tenantModules, auditLogs, workflows, invoices, payments, reviews, formTemplates, organizationSettings, and more. Needs splitting into domain-specific schema files that match module boundaries. |

## P3 — Platform Features (make it actually good)

| # | Source | Issue | Why |
|---|--------|-------|-----|
| 8 | Bookmark #6 | **Settings module deep architecture** | Need clear separation: tenant/org settings, user/personal settings, staff settings (as staff vs as manager), module settings (per-module config). This is foundational infrastructure for any vertical. |
| 9 | Bookmark #1 | **Dashboard system overhaul** | Dashboard cards assume booking module is enabled. Need module-aware widget system where modules register their own dashboard widgets. Shares pattern with analytics page. |
| 10 | Bookmark #7 | **Module settings system** | Each module should register its own settings schema. Settings UI auto-generates from module config. Needed before re-enabling vertical modules so they each have proper configuration. |

## P4 — Future (needs its own design session)

| # | Source | Issue | Why |
|---|--------|-------|-----|
| 11 | Bookmark #8 | **Billing system architecture** | Per-module pricing? Per-seat? Usage-based? Stripe integration, plan tiers, feature gating, trial periods, invoice generation. Very large scope — needs its own architecture document. |

---

## Platform Layer Modules (isCore: true)

| Module | Status | Role |
|--------|--------|------|
| auth | Complete | WorkOS AuthKit, RBAC, sessions, tenant resolution |
| tenant | Complete | Org settings, module gating, venue CRUD |
| platform | Complete | Tenant provisioning, plans, feature flags, impersonation |
| analytics | Complete | KPIs, time series, revenue charts, forecasting |
| search | Partial | Global search — no service layer, only 2 entity types |
| audit | Complete | Paginated list, CSV export, filter by module |
| notification | Complete | Email/SMS via Resend/Twilio, templates, preferences |
| settings | Complete | API key management, module tab discovery |

## Disabled Vertical Modules (re-enable after platform is solid)

customer, team, booking, scheduling, payment, workflow, forms, review, calendar-sync, developer, portal, staff

All code intact in `src/modules/`. Manifests commented out in `register-all.ts`. Routers still in `root.ts` for type safety. Re-enable by uncommenting in `register-all.ts` and adding slugs back to `defaultSlugs` in `platform.service.ts`.
