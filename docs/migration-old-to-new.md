# Ironheart Migration: Old → New Codebase

**Reference date:** 2026-04-11
**Old codebase:** `/Users/lukehodges/Documents/ironheart/` (referred to below as "old")
**New codebase:** `/Users/lukehodges/Documents/ironheart-refactor/` (referred to below as "new")

---

## 1. Overview

### What Changed and Why

The refactor is a ground-up architectural rewrite. The old codebase accumulated several compounding problems as features were added:

- **Prisma as a monolith ORM** — all queries went through a single `ctx.db` PrismaClient that loaded the full schema graph; cross-tenant data leaks were possible if a query omitted `tenantId`. Migration files lived in `prisma/migrations/` and required careful sequential application.
- **NextAuth credentials provider** — homegrown bcrypt-based auth stored password hashes in the `users` table. Session management was entirely custom (JWT strategy). Platform admin detection was a runtime check against the `PLATFORM_ADMIN_EMAILS` env var every request.
- **Vercel cron jobs** — 7 scheduled endpoints in `vercel.json`; each hit `/api/cron/*` routes that required a `CRON_SECRET` header. No retry, no observability, no concurrency control. Missed runs were invisible.
- **Flat router structure** — 32 tRPC routers all in `src/server/routers/`; business logic, Prisma calls, and HTTP concerns were mixed inside router files. No service/repository separation.
- **Google Calendar wired directly** — integration code lived in `src/lib/integrations/google-calendar-*.ts` and was called directly from cron jobs and the `staffIntegrations` router. No provider abstraction.

The new codebase resolves these systematically:

- **Drizzle ORM + postgres.js** — explicit, type-safe SQL. Tenant isolation enforced structurally in repository functions rather than by convention.
- **WorkOS AuthKit** — external identity provider. No password hashes stored. SSO, MFA, and social login come for free. `workosUserId` links the WorkOS identity to the internal `users` table row.
- **Inngest** — replaces all cron jobs and adds reliable event-driven background processing with retries, step functions, cancellation, and an observable dev dashboard.
- **Modular architecture** — 27 modules in `src/modules/{module}/`, each with its own `.types.ts`, `.schemas.ts`, `.repository.ts`, `.service.ts`, `.router.ts`, `.events.ts`, and `__tests__/`. No business logic in router files.
- **Calendar-sync module** — provider interface pattern. Google, Outlook, and Apple providers implement a common interface. Watch channel management handled by Inngest scheduled functions instead of cron.

### Migration Philosophy

The new codebase is a clean slate, not a refactor of the old files. The database schema is largely compatible (same table names, same column names where it matters), which makes data migration feasible without ETL rewrites. The main data migration concern is:

1. Adding `workosUserId` to existing `users` rows after WorkOS user creation
2. Ensuring `organizationSettings` rows exist for all tenants (new: 27 typed columns, not JSON blob)
3. Populating `staffProfiles` rows for users where `isTeamMember=true` in the old schema

---

## 2. Tech Stack Differences

| Concern | Old Codebase | New Codebase |
|---|---|---|
| **ORM** | Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`) | Drizzle ORM 0.45 (`drizzle-orm`, `drizzle-kit`) |
| **DB Driver** | `pg` 8 (via `@prisma/adapter-pg`) | `postgres` 3 (postgres.js) |
| **Auth** | NextAuth 4 credentials provider (bcrypt password hash) | WorkOS AuthKit 2 (`@workos-inc/authkit-nextjs`, `@workos-inc/node`) |
| **Background jobs** | Vercel cron (7 `vercel.json` endpoints) | Inngest 3 (event-driven + scheduled `createFunction`) |
| **Caching / Rate limiting** | None | Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) |
| **Email** | Nodemailer + SendGrid (`@sendgrid/mail`) | Resend only (provider abstraction in `notification` module) |
| **SMS** | Twilio (direct) | Twilio (via `notification` module provider) |
| **Error tracking** | None | Sentry (`@sentry/nextjs`) |
| **Logging** | `console.log` | Pino 10 (`pino`, `pino-pretty`) |
| **Email templating** | Handlebars string templates | React Email (`@react-email/components`, `@react-email/render`) |
| **UI components** | Custom components (`src/components/ui/`) | shadcn/ui — 18 Radix UI primitives + CVA |
| **Toasts** | `react-hot-toast` | Sonner |
| **Payments** | Not implemented (schema existed) | Stripe + GoCardless via payment module providers |
| **AI** | Not present | Anthropic Claude SDK + MCP server |
| **Workflow engine** | Single `engine.ts` (linear only) | Dual-mode: `linear.engine.ts` + `graph.engine.ts` with 20+ node types |
| **tRPC** | 11.0 (32 routers, flat in `src/server/routers/`) | 11.10 (27 modules, each owns its router) |
| **React** | 19.2.3 | 19.2.3 |
| **Next.js** | ^16.1.6 | 16.1.6 (pinned) |
| **Zod** | ^4.3.5 | ^4.3.6 |
| **Maps** | Mapbox GL + Leaflet | MapLibre GL (no commercial licence required) |
| **Calendar UI** | None (admin calendar not built) | FullCalendar 6 (`@fullcalendar/react`) |
| **Drag-and-drop** | Not present | `@dnd-kit/core`, `@dnd-kit/sortable` |
| **Flow diagrams** | `@xyflow/react` 12 | `reactflow` 11 |
| **Test runner** | Vitest 4 | Vitest 4 |
| **E2E** | Playwright | Playwright |

---

## 3. Module-by-Module Migration Map

### Bookings
| Old | New |
|---|---|
| `src/server/routers/booking.ts` | `src/modules/booking/booking.router.ts` |
| `src/server/routers/approval.ts` | `src/modules/booking/sub-routers/approval.router.ts` |
| `src/server/routers/completion.ts` | `src/modules/booking/sub-routers/completion.router.ts` |
| `src/server/routers/slot-availability.ts` + `slot-management.ts` | `src/modules/booking/sub-routers/slot.router.ts` |
| `src/lib/cron/release-slots.ts` | `src/modules/booking/booking.events.ts` → `releaseExpiredReservation` Inngest function |
| `src/lib/cron/send-reminders.ts` | `src/modules/notification/notification.events.ts` (booking reminder triggers) |
| Business logic inline in router | `src/modules/booking/booking.service.ts` + `booking.repository.ts` |
| Booking saga: none | `src/modules/booking/lib/booking-saga.ts` (compensating transactions) |
| Slot locking: disabled | `src/modules/booking/lib/slot-lock.ts` (Redis-backed distributed lock) |
| State transitions: ad hoc | `src/modules/booking/lib/booking-state-machine.ts` |
| Public booking flow: `src/app/book/[slug]/page.tsx` | `src/app/book/[tenantSlug]/page.tsx` |
| Approval admin page: `src/app/admin/approvals/page.tsx` | No dedicated approvals page yet (portal approval flow at `src/app/portal/(dashboard)/approvals/`) |

**Status:** Fully implemented. 224/224 tests pass. The new `bookings` table drops `mileageCost`, `additionalCharges`, `venueConfirmedAt`, `remindersSentAt`, `invoiceNumber` columns present in the old schema (invoice is now its own table with a proper FK).

### Scheduling
| Old | New |
|---|---|
| `src/server/routers/availability.ts` | `src/modules/scheduling/scheduling.router.ts` |
| `src/lib/availability-mode.ts` | `src/modules/scheduling/lib/availability.ts` |
| Slot-based availability: `src/lib/cron/sync-calendars.ts` | `src/modules/scheduling/scheduling.events.ts` |
| Travel time: `src/server/routers/travel.ts` | `src/modules/scheduling/lib/travel-time.ts` |
| Smart assignment: not present | `src/modules/scheduling/lib/smart-assignment.ts` |
| Waitlist: not present | `src/modules/scheduling/lib/waitlist.ts` |

**Status:** Fully implemented.

### Calendar Integration (Google Calendar)
| Old | New |
|---|---|
| `src/server/routers/staff-integrations.ts` | `src/modules/calendar-sync/calendar-sync.router.ts` |
| `src/lib/integrations/google-calendar-client.ts` | `src/modules/calendar-sync/providers/google/index.ts` |
| `src/lib/integrations/google-calendar-sync.ts` | `src/modules/calendar-sync/calendar-sync.service.ts` |
| `src/lib/integrations/google-calendar-pull.ts` | `src/modules/calendar-sync/providers/google/index.ts` (pull method) |
| `src/lib/integrations/google-calendar-watch.ts` | `src/modules/calendar-sync/providers/google/google.webhook.ts` |
| `src/lib/integrations/calendar-event-mapper.ts` | `src/modules/calendar-sync/lib/calendar-event-mapper.ts` |
| `src/lib/oauth/google-oauth.ts` | `src/modules/calendar-sync/providers/google/google.auth.ts` + `src/modules/calendar-sync/lib/oauth.ts` |
| `src/lib/crypto/token-encryption.ts` (key: `GCAL_ENCRYPTION_KEY_V1`) | `src/modules/calendar-sync/lib/oauth.ts` (key: `CALENDAR_TOKEN_ENCRYPTION_KEY`) |
| `/api/cron/sync-calendars` (every 5 min) | Inngest `calendar-sync.events.ts` → `pullCalendarEventsCron` (every 6 hours) |
| `/api/cron/pull-calendar-events` (every 15 min) | Covered by `pullCalendarEventsCron` |
| `/api/cron/refresh-calendar-tokens` (every 30 min) | Inngest `refreshCalendarTokensCron` (every 4 hours) |
| `/api/cron/renew-watch-channels` (daily at 02:00) | Inngest `renewWatchChannelsCron` (daily at 00:00) |
| `src/app/admin/staff/[id]/calendar-sync/page.tsx` | No dedicated page yet (settings modal in team module) |
| Outlook provider: not present | `src/modules/calendar-sync/providers/outlook/index.ts` (stub) |
| Apple provider: not present | `src/modules/calendar-sync/providers/apple/index.ts` (stub) |

**Token encryption key migration:** Old env var `GCAL_ENCRYPTION_KEY_V1`, new env var `CALENDAR_TOKEN_ENCRYPTION_KEY`. Same AES-256-GCM algorithm and `{iv}:{ciphertext}:{authTag}` format — tokens encrypted by the old codebase can be decrypted by the new one if the key value is the same (just rename the env var).

**Status:** Core Google Calendar push/pull/webhook fully implemented. Outlook and Apple are stubs. Calendar pull cron body is a placeholder (`return { triggered: true }`) — full per-integration paging is not yet implemented.

### Customers
| Old | New |
|---|---|
| `src/server/routers/customer.ts` | `src/modules/customer/customer.router.ts` |
| `src/app/admin/customers/page.tsx` | `src/app/admin/customers/page.tsx` |
| `src/app/admin/customers/[id]/page.tsx` | No equivalent yet (detail sheet via `customer.router.ts`) |
| Customer merge: not present | `src/modules/customer/customer.service.ts` → `mergeCustomers()` (7-table cascade in transaction) |
| Customer notes: inline in router | `src/modules/customer/customer.repository.ts` |
| GDPR anonymise: `src/lib/cron/data-retention.ts` + privacy router | `src/modules/customer/customer.service.ts` + `src/modules/settings/settings.service.ts` |
| Privacy page: `src/app/admin/privacy/page.tsx` | Not yet ported |

**Status:** Customer CRUD and merge fully implemented. GDPR/privacy page not yet ported.

### Staff / Team
| Old | New |
|---|---|
| `src/server/routers/staff.ts` | `src/modules/team/team.router.ts` |
| `src/app/admin/staff/page.tsx` | `src/app/admin/team/page.tsx` |
| `src/app/admin/staff/[id]/page.tsx` | `src/app/admin/team/[id]/page.tsx` |
| `src/app/admin/users/page.tsx` | Merged into team module |
| `users.isTeamMember = true` pattern | Dedicated `staffProfiles` table with `StaffStatus` enum |
| Departments: not present | `src/modules/team/team.router.ts` + `src/app/admin/team/departments/page.tsx` |
| Pay rates: not present | `staffPayRates` table + team router |
| Custom fields: not present | `staffCustomFieldDefinitions` + `staffCustomFieldValues` tables |
| Skills: not present | `skillDefinitions` + `resourceSkills` tables |
| Checklists (onboarding/offboarding): not present | `staffChecklistTemplates` + `staffChecklistProgress` tables |
| Capacity: `UserCapacity` model | `userCapacities` table (same columns, different snake_case names) |
| Staff availability: `UserAvailability` | `userAvailability` table |

**Status:** Fully implemented with 7 test files.

### Services and Venues
| Old | New |
|---|---|
| `src/server/routers/service.ts` | No dedicated `service.router.ts` — served by `scheduling.router.ts` |
| `src/server/routers/venue.ts` | No dedicated `venue.router.ts` — served by `scheduling.router.ts` |
| `src/server/routers/addon.ts` | Merged into scheduling/service management |
| `services`, `serviceCategories`, `serviceAddOns`, `venues`, `addOns` tables | Same tables exist in new schema |

**Note:** The old codebase had dedicated routers for services, venues, and add-ons. In the new codebase these are managed through the `scheduling` module. If you need fine-grained CRUD for services/venues you should add sub-routers to `src/modules/scheduling/scheduling.router.ts`. The pages `src/app/admin/settings/page.tsx` handles some of this.

**Status:** Tables exist; dedicated admin CRUD pages for services and venues have not yet been built in the new codebase.

### Forms
| Old | New |
|---|---|
| `src/server/routers/forms.ts` | `src/modules/forms/forms.router.ts` |
| Form templates stored as Handlebars strings | `formTemplates` table with typed `fields` JSONB |
| Public form submit: via booking flow | `src/app/forms/[sessionKey]/page.tsx` (public, token-gated) |
| `completedForms.sessionKey` = UUID v4 (7-day expiry) | Same — unchanged |
| Form send timing: not implemented | `FormSendTiming` enum + Inngest trigger in `forms.events.ts` |

**Status:** Fully implemented with `formsFunctions` registered in Inngest route.

### Reviews
| Old | New |
|---|---|
| `src/server/routers/review.ts` | `src/modules/review/review.router.ts` |
| `src/app/admin/reviews/page.tsx` | `src/app/admin/reviews/page.tsx` |
| Review automation: `ReviewAutomationSettings` model | `reviewAutomationSettings` table — same concept |
| Pre-screening against historical avg: not present | `src/modules/review/review.service.ts` → `autoPublicMinRating` threshold check |
| Review requests: `ReviewRequest` model | `reviewRequests` table |

**Status:** Fully implemented with `reviewFunctions` in Inngest route.

### Workflows
| Old | New |
|---|---|
| `src/server/routers/workflow.ts` | `src/modules/workflow/workflow.router.ts` |
| `src/lib/workflow/engine.ts` (linear only) | `src/modules/workflow/engine/linear.engine.ts` + `graph.engine.ts` |
| `src/lib/workflow/action-executor.ts` | `src/modules/workflow/engine/actions.ts` |
| `src/lib/workflow/condition-evaluator.ts` | `src/modules/workflow/engine/conditions.ts` |
| `src/lib/workflow/template-engine.ts` (Handlebars) | `src/modules/workflow/engine/` — same Handlebars approach |
| `src/lib/workflow/providers/sendgrid.ts` | `src/modules/notification/providers/email/resend.provider.ts` |
| `src/lib/workflow/providers/twilio.ts` | `src/modules/notification/providers/sms/twilio.provider.ts` |
| Workflow execution via event-bus in-process | Inngest `workflow/execute` event → `src/modules/workflow/workflow.events.ts` |
| Visual workflow editor: `@xyflow/react` 12 | `reactflow` 11 (same `@xyflow/react` under the hood) |
| `src/app/admin/workflows/[id]/edit/page.tsx` | `src/app/admin/workflows/[id]/page.tsx` |
| `src/app/admin/workflows/analytics/page.tsx` | Not yet ported |
| Workflow new page: `src/app/admin/workflows/new/page.tsx` | No dedicated new page (inline in list page) |
| Node types: TRIGGER, IF, ACTION | Full 20+ node type set including SWITCH, MERGE, LOOP, WAIT_FOR_EVENT, WAIT_UNTIL, STOP, ERROR, SET_VARIABLE, FILTER, TRANSFORM, EXECUTE_WORKFLOW |
| Sub-workflow execution: not present | `EXECUTE_WORKFLOW` node with sync/fire-and-forget modes |

**Status:** Fully implemented. Dual-mode engine with graph validation (`validateWorkflowGraph()`), cycle detection, and condition group nesting.

### Notifications / Communications
| Old | New |
|---|---|
| `src/server/routers/communications.ts` | `src/modules/notification/notification.router.ts` |
| `src/lib/email/service.ts` (Nodemailer + SendGrid) | `src/modules/notification/providers/email/resend.provider.ts` |
| `src/lib/sms/service.ts` (Twilio direct) | `src/modules/notification/providers/sms/twilio.provider.ts` |
| `MessageTemplate`, `SentMessage`, `Notification`, `NotificationPreference` models | Same tables in new schema |
| `src/app/admin/communications/page.tsx` | Not yet ported |
| Template variable builder: inline | `src/modules/notification/lib/variable-builder.ts` |
| Handlebars template engine | `src/modules/notification/lib/template-engine.ts` (same Handlebars) |

**Status:** Core notification send pipeline implemented. Admin communications page (`src/app/admin/communications/page.tsx`) not yet ported from old codebase.

### Settings
| Old | New |
|---|---|
| `src/server/routers/settings.ts` | `src/modules/settings/settings.router.ts` |
| `OrganizationSettings` as JSON blob columns | `organizationSettings` with 27 typed columns (enforced by Zod discriminated schema) |
| `src/app/admin/settings/page.tsx` | `src/app/admin/settings/page.tsx` |
| `src/app/admin/settings/branding/page.tsx` | Not yet ported |
| `src/app/admin/settings/dpa/page.tsx` | Not yet ported |
| `src/app/admin/settings/integrations/page.tsx` | Not yet ported |
| `src/app/admin/settings/portals/page.tsx` | Not yet ported (old portal system replaced by `client-portal` module) |
| Module settings: `ModuleSetting`, `TenantModuleSetting` | `moduleSettings`, `tenantModuleSettings` tables + `src/modules/settings/module-settings.service.ts` |

**Status:** Core settings read/write implemented. Branding, DPA, and integrations sub-pages not yet ported.

### Modules / Feature Flags
| Old | New |
|---|---|
| `src/server/routers/modules.ts` | `src/modules/tenant/tenant.router.ts` + `src/modules/settings/settings.router.ts` |
| `src/server/routers/features.ts` | Removed — feature flags merged into module system |
| `Module`, `TenantModule`, `TenantModuleSetting` models | Same tables; `tenantModules.moduleId` is UUID FK → `modules.id` (NOT a `moduleKey` text column) |
| `hasModuleAccess(tenantId, slug)` in `src/lib/module-access.ts` | `tenantService.isModuleEnabled(tenantId, slug)` with Redis cache |
| Module-gated procedures via `createModuleMiddleware()` | Same pattern: `createModuleMiddleware(moduleSlug)` in `src/shared/trpc.ts` |
| `src/app/admin/modules/page.tsx` | No equivalent yet |
| `src/app/admin/modules/[slug]/settings/page.tsx` | No equivalent yet |
| `FeatureFlag` model (per-tenant overrides) | `tenantFeatures` table (same concept) |

**Status:** Module gating implemented. Admin module management pages not yet ported.

### Platform Admin
| Old | New |
|---|---|
| `src/server/routers/platform.ts` | `src/modules/platform/platform.router.ts` |
| `src/server/routers/signup.ts` | Removed — tenant provisioning via `platform.service.ts` |
| `src/app/platform/page.tsx` | `src/app/platform/page.tsx` |
| `src/app/platform/tenants/[id]/page.tsx` | `src/app/platform/tenants/[id]/page.tsx` |
| `src/app/platform/signups/page.tsx` | Removed — signup requests handled in platform module |
| Platform admin check: `PLATFORM_ADMIN_EMAILS` env var every request | `users.isPlatformAdmin` DB flag; env var is bootstrap-only (auto-promotes then stops) |
| Tenant impersonation: cookie `platform_tenant_slug` | Redis-backed impersonation sessions (`impersonationSessions` table + `impersonate:{workosUserId}` Redis key) |
| Platform products/subscriptions: not present | `src/app/platform/products/`, `src/app/platform/subscriptions/`, `src/app/platform/revenue/` |

**Status:** Platform admin fully implemented. New: subscription management via `subscription` module, product plans via `product` module.

### Analytics
| Old | New |
|---|---|
| `src/server/routers/dashboard.ts` | `src/modules/analytics/analytics.router.ts` |
| `src/app/admin/analytics/page.tsx` | `src/app/admin/analytics/page.tsx` |
| Dashboard metrics: inline Prisma queries in router | `src/modules/analytics/analytics.repository.ts` + `analytics.service.ts` |
| Forecasting: not present | `src/modules/analytics/lib/forecasting.ts` |
| Customer intelligence: not present | `src/modules/analytics/lib/customer-intelligence.ts` |
| Metric snapshots: not present | `metricSnapshots` table + `computeMetricSnapshots` Inngest cron |
| `src/app/admin/today/page.tsx` | Not yet ported |

**Status:** Core analytics implemented. Today dashboard page not yet ported.

### Import / Export
| Old | New |
|---|---|
| `src/server/routers/import.ts` | Not yet implemented |
| `src/server/routers/export.ts` | Not yet implemented |
| `src/lib/export/csv.ts`, `excel.ts` | Not yet ported |
| `ImportSession`, `UserExternalEvent` models | `userExternalEvents` table exists; no `ImportSession`-equivalent table in new schema |
| `src/app/admin/import/page.tsx` | Not yet ported |
| CSV/XLSX import flow (`papaparse`, `xlsx`) | `papaparse` and `xlsx` packages removed from new `package.json` |

**Status:** Not implemented. The import/export pipeline is a significant gap. `papaparse` and `xlsx` packages need to be re-added to `package.json` before starting.

### Auth
| Old | New |
|---|---|
| `src/server/routers/auth.ts` | `src/modules/auth/router.ts` |
| `src/lib/auth.ts` (NextAuth config) | `src/modules/auth/auth.config.ts` + `workos.config.ts` |
| `src/app/login/page.tsx` (credentials form) | `src/app/(auth)/sign-in/page.tsx` (WorkOS redirect) |
| `src/app/signup/page.tsx` (tenant self-signup) | Removed — tenants provisioned by platform admin |
| `src/app/api/auth/[...nextauth]/route.ts` | `src/app/api/auth/callback/route.ts` |
| Staff portal: `src/app/staff/` (4 pages) | Not yet ported |
| `Session` table (NextAuth sessions) | `sessions` table kept but populated by WorkOS (different shape) |
| RBAC: `requirePermission()` in `src/server/middleware/permissions.ts` | `src/modules/auth/rbac.ts` + `src/modules/rbac/` module |

**Status:** WorkOS auth fully wired. Staff portal pages not yet ported.

### Payments
| Old | New |
|---|---|
| `src/server/routers/` — no payment router | `src/modules/payment/payment.router.ts` |
| `Invoice`, `Payment` models existed | `invoices`, `payments` tables + payment module |
| `src/app/admin/invoices/page.tsx` | `src/app/admin/payments/page.tsx` |
| Stripe: not implemented | `src/modules/payment/providers/stripe.provider.ts` + Stripe webhook via Inngest |
| GoCardless: not implemented | `src/modules/payment/providers/gocardless.provider.ts` |
| Pricing engine: not present | `src/modules/payment/lib/pricing-engine.ts` |
| Tax engine: not present | `src/modules/payment/lib/tax-engine.ts` |

**Status:** Fully implemented with Stripe webhook handling, overdue invoice cron, and payment state machine.

### Client Portal (New Feature — No Old Equivalent)
The old codebase had `src/server/routers/portal.ts` and `TenantPortal`/`PortalTemplate` models for configuring a *booking portal* (customer-facing booking page at `/book/[slug]`). That concept still exists in the new codebase via `src/app/book/[tenantSlug]/page.tsx`.

The new `client-portal` module is an entirely different feature — a B2B engagement portal for consulting/services firms:

- `src/modules/client-portal/` — engagements, proposals, deliverables, approvals, invoices, milestones
- `src/app/portal/(dashboard)/` — client-facing portal (magic link auth via `portal_session` cookie)
- `src/app/admin/clients/` — admin side of engagement management
- `src/app/portal/[token]/page.tsx` — magic link redemption
- `src/app/portal/preview/[engagementId]/page.tsx` — admin preview of portal

**Status:** Fully implemented including proposal depth fields (problem statement, exclusions, requirements, ROI calculator).

---

## 4. Database Migration

### ORM Query Pattern Changes

Every Prisma query must be rewritten as a Drizzle query. The patterns are fundamentally different.

**Old (Prisma):**
```typescript
// From src/server/routers/booking.ts
const booking = await ctx.db.booking.findFirst({
  where: { id: input.id, tenantId: ctx.tenantId },
  include: { customer: true, service: true, staff: true },
})
```

**New (Drizzle):**
```typescript
// From src/modules/booking/booking.repository.ts
const [booking] = await db
  .select()
  .from(bookings)
  .where(and(eq(bookings.id, input.id), eq(bookings.tenantId, ctx.tenantId)))
  .limit(1)
// Returns undefined if not found — use ?? null or throw NotFoundError
```

**Key differences:**

| Operation | Prisma | Drizzle |
|---|---|---|
| Find one | `findFirst({ where })` | `.select().from().where().limit(1).then(r => r[0] ?? null)` |
| Find many | `findMany({ where, orderBy, take })` | `.select().from().where().orderBy().limit()` |
| Create | `create({ data })` | `.insert().values().returning()` |
| Update | `update({ where, data })` | `.update().set().where().returning()` |
| Delete | `delete({ where })` | `.delete().where()` |
| Relations (includes) | `include: { customer: true }` | Separate query or `db.query.bookings.findFirst({ with: { customer: true } })` |
| Pagination | `skip`/`take` | `.offset(skip).limit(take)` |
| Transactions | `db.$transaction([...])` | `db.transaction(async (tx) => { ... })` |
| Array column contains | `{ column: { has: value } }` | `sql\`${value}::uuid = ANY(${table.column})\`` |
| JSON field query | `{ data: { path: [...], equals: value } }` | Raw SQL or `jsonb_path_exists` |

**DB connection:**
- Old: `src/lib/db.ts` exports `const db = new PrismaClient({ adapter: new PrismaPg(pool) })`
- New: `src/shared/db.ts` exports `const db = drizzle(sql, { schema })` where `sql = postgres(DATABASE_URL)`

### Key Schema Differences

**Tables present in old, absent from new:**
- `ImportSession` — no equivalent in new schema; import module not yet built
- `ContactMatchStatus` enum — was part of import session flow

**Tables present in new, absent from old:**
- `staffProfiles` — separate table replacing `users.isTeamMember = true`; has `staffStatus`, `employeeType`, `skills`, `payRates`
- `staffDepartments`, `staffDepartmentMembers` — new org structure
- `staffPayRates`, `staffNotes`, `staffChecklistTemplates`, `staffChecklistProgress` — team module features
- `staffCustomFieldDefinitions`, `staffCustomFieldValues` — extensible staff fields
- `resourceAssignments`, `resourceCapacities`, `resourceSkills`, `skillDefinitions`, `capacityTypeDefinitions` — resource pool system
- `impersonationSessions` — platform admin impersonation (Redis-backed)
- `agentActions`, `aiConversations`, `aiMessages`, `aiCorrections`, `aiKnowledgeChunks`, `aiMcpConnections`, `aiTenantConfig`, `aiWorkflowSuggestions` — AI module
- `outreachSequences`, `outreachContacts`, `outreachTemplates`, `outreachSnippets`, `outreachActivities` — outreach module
- `pipelineMembers`, `pipelineStageHistoryV2` — pipeline module
- `metricSnapshots` — analytics snapshots
- `sagaLog` — saga orchestration log
- `discountCodes`, `pricingRules`, `taxRules`, `stripeConnectAccounts` — payment module
- `webhookEndpoints`, `webhookDeliveries` — developer module
- `products`, `productPlans` — product/subscription module
- `bookingWaitlist` — waitlist feature
- `portalSessions` — client portal magic link sessions
- Client portal tables: `engagements`, `proposals`, `deliverables`, `milestones`, `portalApprovals`, `portalInvoices`, `portalInvoiceLineItems` (all in `client-portal.schema.ts`)

**Columns renamed or restructured:**
- `users.passwordHash` removed (WorkOS handles auth); `users.workosUserId` added
- `bookings.mileageCost`, `additionalCharges`, `remindersSentAt`, `venueConfirmedAt`, `invoiceNumber` removed
- `users.isTeamMember` boolean replaced by existence of `staffProfiles` row
- `organizationSettings`: old had some settings as JSON blob; new has 27 typed columns

### Migration for Existing Tenant Data

For existing Ironheart production tenants migrating from old to new:

1. **User → WorkOS mapping:** Create WorkOS users for all existing `users` rows, then backfill `users.workosUserId`. The `tenantProcedure` middleware handles this automatically on first login if `workosUserId` is null (it falls back to email lookup and backfills).

2. **Staff profiles:** For every user where `isTeamMember = true`, create a corresponding `staffProfiles` row. Run a one-time migration script after deploying the new schema.

3. **Organization settings:** The `organizationSettings` table structure changed from nullable JSON to 27 typed columns. A migration script needs to copy JSON blob values into the corresponding typed columns.

4. **Token re-encryption:** OAuth tokens stored in `userIntegrations.accessToken` / `refreshToken` were encrypted with key `GCAL_ENCRYPTION_KEY_V1`. In the new codebase the key env var is `CALENDAR_TOKEN_ENCRYPTION_KEY`. If you use the same 32-byte hex value, tokens decrypt correctly without re-encryption. Simply rename the env var.

5. **Drizzle migration baseline:** The `_prisma_migrations` table is present in the new schema (Drizzle won't touch it). Run `drizzle-kit push` or generate and apply Drizzle migrations for the new tables.

---

## 5. Authentication Migration

### Old: NextAuth Credentials Provider

- Users authenticate with email + password (bcrypt in `users.passwordHash`)
- Session stored as JWT; shape: `{ user: { id, email, tenantId, tenantSlug, isPlatformAdmin, ... } }`
- Context creation: `getServerSession(authConfig)` in `src/lib/auth.ts`
- Multi-tenant detection: attempts subdomain parsing, then `tenantSlug` credential field, then email lookup
- No SSO, no MFA, no social providers

### New: WorkOS AuthKit

- Users authenticate via WorkOS (email magic link, SSO, Google OAuth, etc.)
- No password hashes stored in the database
- Session shape: `WorkOSSession { user: { id (WorkOS ID), email, firstName, lastName, profilePictureUrl, emailVerified }, accessToken, organizationId, role, permissions }`
- Context creation: `withAuth()` from `@workos-inc/authkit-nextjs` in `src/shared/trpc.ts`
- `users.workosUserId` links the WorkOS identity to the internal DB user record
- On first request after migration, `tenantProcedure` falls back to email lookup, backfills `workosUserId`, and optionally calls `setWorkOSExternalId()` to set the reverse link in WorkOS
- Sign-in page: `src/app/(auth)/sign-in/page.tsx` (redirects to WorkOS hosted auth)
- Auth callback: `src/app/api/auth/callback/route.ts`

### RBAC Changes

| Concept | Old | New |
|---|---|---|
| Permission check | `requirePermission(userWithRoles, 'bookings:read')` in `src/server/middleware/permissions.ts` | `hasPermission(ctx.user, 'bookings:read')` in `src/modules/auth/rbac.ts` |
| Permission loading | Every `permissionProcedure` call fetched user+roles via Prisma include | `tenantProcedure` loads user+roles via Drizzle relational query, caches `users.id` in Redis (1hr TTL) |
| Module gating | `createModuleMiddleware(slug)` calling `hasModuleAccess()` (Prisma) | Same pattern but calls `tenantService.isModuleEnabled()` with Redis cache |
| Platform admin | Checked against `isPlatformAdmin` DB flag OR `PLATFORM_ADMIN_EMAILS` env var every request | `isPlatformAdmin` DB flag is primary; env var is bootstrap-only (auto-promotes, then ignored) |
| Tenant isolation | Manually enforced in each router query | `tenantProcedure` enforces `rawUser.tenantId === ctx.tenantId` before proceeding |
| Impersonation | Cookie `platform_tenant_slug` checked every request | Redis-backed session (`impersonate:{workosUserId}` key, 4hr expiry) |

### Procedure Tier Mapping

| Old Procedure | New Procedure | Notes |
|---|---|---|
| `publicProcedure` | `publicProcedure` | Same name; new one adds IP rate limiting via Upstash |
| `protectedProcedure` | `protectedProcedure` | Requires WorkOS session instead of NextAuth |
| `tenantProcedure` | `tenantProcedure` | Same semantics; now loads full user+roles into `ctx.user` |
| `permissionProcedure('x:y')` | `permissionProcedure('x:y')` | Same call signature; uses `hasPermission()` from rbac module |
| `platformAdminProcedure` | `platformAdminProcedure` | Same semantics |
| `patientProcedure`, `reviewProcedure`, `formsProcedure`, `staffProcedure` | Removed — use `tenantProcedure.use(createModuleMiddleware(slug))` inline per router | Module gating is now explicit per-router |
| `portalProcedure` (new, no old equivalent) | `portalProcedure` | Validates `portal_session` cookie for client portal routes |

---

## 6. Integration Migration

### Google Calendar — Integration Hub Pattern

**Old:** Calendar integration was a collection of standalone functions in `src/lib/integrations/`. The `staffIntegrationsRouter` called them directly. OAuth state was stored in `OAuthState` model. Tokens stored in `UserIntegration.accessToken` encrypted with `GCAL_ENCRYPTION_KEY_V1`.

**New:** Provider interface in `src/modules/calendar-sync/lib/provider-factory.ts`. Each provider (Google, Outlook, Apple) exports a class implementing the interface. `calendarSyncService` in `src/modules/calendar-sync/calendar-sync.service.ts` delegates to the appropriate provider.

```
Old: staffIntegrationsRouter → google-calendar-*.ts functions → Prisma
New: calendarSync.router → calendarSyncService → providerFactory → google/index.ts → Drizzle
```

**OAuth state storage:** Old used `OAuthState` Prisma model. New uses `oauthStates` Drizzle table (same data structure).

### Vercel Cron → Inngest

| Old Cron | Schedule | New Inngest Function | Schedule |
|---|---|---|---|
| `/api/cron/release-slots` | Every 1 min | `releaseExpiredReservation` in `booking.events.ts` | Event-driven (`slot/reserved` + `sleepUntil(expiresAt)`) — no polling |
| `/api/cron/sync-calendars` | Every 5 min | `pullCalendarEventsCron` in `calendar-sync.events.ts` | Every 6 hours (placeholder body) |
| `/api/cron/pull-calendar-events` | Every 15 min | Merged into `pullCalendarEventsCron` | Every 6 hours |
| `/api/cron/refresh-calendar-tokens` | Every 30 min | `refreshCalendarTokensCron` | Every 4 hours |
| `/api/cron/renew-watch-channels` | Daily at 02:00 | `renewWatchChannelsCron` | Daily at 00:00 |
| `/api/cron/send-reminders` | Every 15 min | Notification events triggered per-booking by `booking/confirmed` | Event-driven |
| `/api/cron/data-retention` | Monthly on 1st at 03:00 | Not yet implemented | — |

**Key differences in reliability:**
- Old cron: missed if Vercel deployment was down; no retries; no observability
- New Inngest: at-least-once delivery; configurable retries; step-level checkpointing; dev dashboard at `http://localhost:8288`
- Cancellation: `releaseExpiredReservation` auto-cancels when `booking/confirmed` or `booking/cancelled` fires (`cancelOn`)

### Token Encryption Key Migration

| | Old | New |
|---|---|---|
| Env var name | `GCAL_ENCRYPTION_KEY_V1` | `CALENDAR_TOKEN_ENCRYPTION_KEY` |
| Algorithm | AES-256-GCM | AES-256-GCM |
| Format | `{iv}:{ciphertext}:{authTag}` (base64) | `{iv}:{ciphertext}:{authTag}` (base64) |
| Key format | 64 hex chars (32 bytes) | 64 hex chars (32 bytes) |

If you use the same key value, existing encrypted tokens are compatible. Just rename the env var.

---

## 7. API Pattern Changes

### Old: Flat Router Structure

```
src/server/
  trpc.ts                    # initTRPC, procedures
  routers/
    _app.ts                  # appRouter combining all 32 routers
    booking.ts               # ~600 LOC with Prisma queries inline
    workflow.ts              # ~500 LOC
    settings.ts              # ~800 LOC
    ... (32 files)
```

All business logic, validation, and DB calls lived inside router files. No service/repository separation. Direct `ctx.db.booking.findFirst(...)` calls in handler bodies.

### New: Modular Architecture

```
src/modules/{module}/
  {module}.types.ts          # interfaces only (no Zod)
  {module}.schemas.ts        # Zod input schemas for tRPC
  {module}.repository.ts     # Drizzle queries only; throws domain errors
  {module}.service.ts        # Business logic; calls repo; emits Inngest events
  {module}.router.ts         # tRPC procedures; thin; calls service only
  {module}.events.ts         # Inngest functions
  {module}.manifest.ts       # Module metadata for module system registry
  index.ts                   # Barrel export
  __tests__/{module}.test.ts

src/server/root.ts           # appRouter combining 27+ module routers
```

**Router procedure call chain:**
```
Old: router handler → ctx.db.booking.findFirst(...)
New: router handler → service.method() → repository.method() → db.select().from()...
```

### Procedure Tier System

Procedures follow a four-tier model. Use the lowest tier that meets the security requirement:

```typescript
// 1. Public — no auth required (booking form, review submit token)
publicProcedure.input(schema).query(...)

// 2. Protected — WorkOS session required, no tenant enforcement
protectedProcedure.input(schema).mutation(...)

// 3. Tenant — auth + tenant isolation + user loaded into ctx.user
tenantProcedure.input(schema).query(...)

// 4. Permission — auth + tenant + specific RBAC permission
permissionProcedure('bookings:write').input(schema).mutation(...)

// 5. Platform admin — cross-tenant access, isPlatformAdmin flag required
platformAdminProcedure.input(schema).query(...)
```

### Root Router Comparison

| Old `_app.ts` key | New `root.ts` key | Status |
|---|---|---|
| `auth` | `auth` | Migrated |
| `user` | (merged into `team`/`auth`) | Migrated |
| `customer` | `customer` | Migrated |
| `service` | (merged into `scheduling`) | Migrated |
| `staff` | `team` | Migrated |
| `booking` | `booking` | Migrated |
| `dashboard` | `analytics` | Migrated |
| `venue` | (merged into `scheduling`) | Migrated |
| `settings` | `settings` | Migrated |
| `review` | `review` | Migrated |
| `forms` | `forms` | Migrated |
| `completion` | `completion` | Migrated |
| `modules` | `tenant` | Migrated |
| `availability` | `scheduling` | Migrated |
| `slotAvailability` | `slotAvailability` | Migrated |
| `slotManagement` | (merged into slot router) | Migrated |
| `approval` | `approval` | Migrated |
| `addOn` | (merged into scheduling) | Migrated |
| `export` | — | **Not migrated** |
| `portal` | `portal` | Partially (client portal = new module) |
| `staffIntegrations` | `calendarSync` | Migrated |
| `workflow` | `workflow` | Migrated |
| `communications` | `notification` | Migrated |
| `signup` | (merged into platform) | Migrated |
| `platform` | `platform` | Migrated |
| `travel` | (merged into scheduling) | Migrated |
| `auditLog` | `audit` | Migrated |
| `privacy` | (merged into customer/settings) | Partial |
| `import` | — | **Not migrated** |
| `places` | (merged into scheduling/travel) | Migrated |
| — | `payment` | New |
| — | `analytics` | New (expanded) |
| — | `developer` | New |
| — | `search` | New |
| — | `rbac` | New |
| — | `resourcePool` | New |
| — | `ai` | New |
| — | `pipeline` | New |
| — | `outreach` | New |
| — | `product` | New |
| — | `subscription` | New |
| — | `clientPortal` | New |

---

## 8. Frontend Migration

### Admin Pages Comparison

| Old `src/app/admin/` | New `src/app/admin/` | Status |
|---|---|---|
| `page.tsx` (dashboard) | `page.tsx` | Migrated |
| `bookings/page.tsx` | `bookings/page.tsx` | Migrated |
| `customers/page.tsx` | `customers/page.tsx` | Migrated |
| `customers/[id]/page.tsx` | — | **Not ported** |
| `analytics/page.tsx` | `analytics/page.tsx` | Migrated |
| `reviews/page.tsx` | `reviews/page.tsx` | Migrated |
| `forms/page.tsx` | `forms/page.tsx` | Migrated |
| `workflows/page.tsx` | `workflows/page.tsx` | Migrated |
| `workflows/[id]/edit/page.tsx` | `workflows/[id]/page.tsx` | Migrated (combined) |
| `workflows/analytics/page.tsx` | — | **Not ported** |
| `workflows/new/page.tsx` | — | Not ported (inline in list) |
| `workflows/[id]/executions/page.tsx` | `workflows/[id]/executions/page.tsx` | Migrated |
| `staff/page.tsx` | `team/page.tsx` | Migrated (renamed) |
| `staff/[id]/page.tsx` | `team/[id]/page.tsx` | Migrated |
| `staff/[id]/calendar-sync/page.tsx` | — | **Not ported** |
| `invoices/page.tsx` | `payments/page.tsx` | Migrated (expanded) |
| `approvals/page.tsx` | — | **Not ported** (moved to portal) |
| `communications/page.tsx` | — | **Not ported** |
| `import/page.tsx` | — | **Not ported** |
| `today/page.tsx` | — | **Not ported** |
| `patient-management/page.tsx` | — | **Not ported** |
| `privacy/page.tsx` | — | **Not ported** |
| `routes/page.tsx` | — | **Not ported** |
| `slots/page.tsx` | — | **Not ported** |
| `settings/page.tsx` | `settings/page.tsx` | Migrated (partial) |
| `settings/branding/page.tsx` | — | **Not ported** |
| `settings/dpa/page.tsx` | — | **Not ported** |
| `settings/integrations/page.tsx` | — | **Not ported** |
| `settings/portals/` | — | **Not ported** (old portal concept replaced) |
| `modules/page.tsx` | — | **Not ported** |
| `modules/[slug]/settings/page.tsx` | — | **Not ported** |
| `users/page.tsx` | — | Merged into team |
| — | `calendar/page.tsx` | New (FullCalendar) |
| — | `scheduling/page.tsx` | New |
| — | `audit/page.tsx` | New |
| — | `developer/page.tsx` | New |
| — | `ai-chat/page.tsx` | New |
| — | `clients/` | New (client portal admin) |
| — | `pipeline/page.tsx` | New |
| — | `outreach/` | New |
| — | `team/departments/page.tsx` | New |

### Public / Non-Admin Pages

| Old | New | Status |
|---|---|---|
| `src/app/book/[slug]/page.tsx` | `src/app/book/[tenantSlug]/page.tsx` | Migrated |
| `src/app/book/[slug]/privacy/page.tsx` | — | **Not ported** |
| `src/app/book/[slug]/terms/page.tsx` | — | **Not ported** |
| `src/app/book/[slug]/my-data/page.tsx` | — | **Not ported** |
| `src/app/confirmation/page.tsx` | — | **Not ported** |
| `src/app/login/page.tsx` | `src/app/(auth)/sign-in/page.tsx` | Migrated |
| `src/app/signup/page.tsx` | Removed | — |
| `src/app/staff/` (4 pages) | — | **Not ported** |
| — | `src/app/forms/[sessionKey]/page.tsx` | New |
| — | `src/app/portal/` | New (client portal) |

### New Booking Wizard

The old booking wizard was `src/components/forms/BookingForm.tsx` (a monolithic React form). The new booking wizard is `src/components/bookings/new-booking-wizard.tsx` — a multi-step dialog using shadcn/ui components with Radix Dialog, separate steps for customer search/create, service selection, slot picking, and confirmation. It uses `api.booking.*` tRPC calls directly.

The public booking flow at `src/app/book/[tenantSlug]/page.tsx` uses the step components from `src/components/booking-flow/` (wizard-progress, service-selector, slot-picker, customer-details-form, booking-success).

### Component Library Changes

**Old:** Custom components in `src/components/ui/` — `Modal.tsx`, `Toast.tsx`, `Input.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`, `Portal.tsx`. No Radix. Toasts via `react-hot-toast`.

**New:** shadcn/ui — 28 Radix-backed components in `src/components/ui/` (alert-dialog, avatar, badge, button, card, checkbox, collapsible, command, dialog, dropdown-menu, empty-state, error-card, input, label, page-header, popover, progress, scroll-area, select, separator, sheet, skeleton, slider, switch, table, tabs, textarea, tooltip). Toasts via `sonner`.

When porting old page components, replace:
- `<Modal>` → `<Dialog>` or `<Sheet>`
- `<Toast>` / `react-hot-toast` → `toast()` from `sonner`
- `<Input>` (custom) → `<Input>` from `@/components/ui/input`
- `<EmptyState>` → `<EmptyState>` from `@/components/ui/empty-state` (same name, Radix-based)
- `<LoadingSpinner>` → `<Skeleton>` or a custom spinner

---

## 9. Background Jobs Migration

### Old: Vercel Cron

7 endpoints in `vercel.json`. Each required `Authorization: Bearer {CRON_SECRET}` header. Business logic lived in `src/lib/cron/*.ts`. No retry, no observability, no cancellation.

```json
// Old vercel.json
{
  "crons": [
    { "path": "/api/cron/release-slots",           "schedule": "* * * * *" },
    { "path": "/api/cron/sync-calendars",           "schedule": "*/5 * * * *" },
    { "path": "/api/cron/pull-calendar-events",     "schedule": "*/15 * * * *" },
    { "path": "/api/cron/refresh-calendar-tokens",  "schedule": "*/30 * * * *" },
    { "path": "/api/cron/renew-watch-channels",     "schedule": "0 2 * * *" },
    { "path": "/api/cron/send-reminders",           "schedule": "*/15 * * * *" },
    { "path": "/api/cron/data-retention",           "schedule": "0 3 1 * *" }
  ]
}
```

### New: Inngest

All background work flows through `src/app/api/inngest/route.ts`. Functions are registered with `serve()`. Events are sent via `inngest.send(...)` from service methods.

| Module | Inngest Functions | Trigger |
|---|---|---|
| `booking.events.ts` | `releaseExpiredReservation` | `slot/reserved` event → `sleepUntil(expiresAt)` |
| `calendar-sync.events.ts` | `pushBookingToCalendar` | `calendar/sync.push` event |
| | `handleCalendarWebhook` | `calendar/webhook.received` event |
| | `pullCalendarEventsCron` | `cron: '0 */6 * * *'` |
| | `refreshCalendarTokensCron` | `cron: '0 */4 * * *'` |
| | `renewWatchChannelsCron` | `cron: '0 0 * * *'` |
| `notification.events.ts` | Email/SMS send functions | `notification/send.email`, `notification/send.sms` events |
| `scheduling.events.ts` | Waitlist notification | `waitlist/slot.available` event |
| `workflow.events.ts` | `executeWorkflow` | `workflow/execute` event |
| `review.events.ts` | `sendReviewRequest` | `review/request.send` event |
| `forms.events.ts` | `onFormSubmitted` | `forms/submitted` event |
| `payment.events.ts` | `handleStripeWebhook` | `stripe/webhook.received` event |
| | `overdueInvoiceCron` | Scheduled cron |
| `analytics.events.ts` | `computeMetricSnapshots` | Scheduled cron |
| `developer.events.ts` | `dispatchWebhooks` | Internal events |
| `ai.events.ts` | Multiple AI functions | `ai/*` events |
| `pipeline.events.ts` | Pipeline lifecycle | `pipeline/member.*` events |
| `outreach.events.ts` | Sequence processing | `outreach/*` events |
| `client-portal.events.ts` | Portal magic links, reminders | `portal/*` events |

**Data retention cron** (monthly): Not yet migrated to Inngest. Was in `src/lib/cron/data-retention.ts`.

---

## 10. What's Already Done vs What Needs Work

### Fully Implemented (with tests)

- Booking lifecycle (create, confirm, cancel, complete, approve, release reservation)
- Slot availability and locking (Redis-backed)
- Scheduling module (availability, smart assignment, waitlist, travel time)
- Calendar sync (Google push/pull/webhook, token encryption, OAuth flow)
- Auth (WorkOS, RBAC, impersonation, tenant isolation)
- Customer CRUD and merge
- Team / staff profiles (departments, pay rates, checklists, custom fields, skills)
- Forms (templates, public submit, session tokens, Inngest trigger)
- Reviews (automation, pre-screening, review requests)
- Workflow engine (dual-mode linear/graph, 20+ node types, conditions, expressions)
- Notifications (Resend email, Twilio SMS, React Email templates)
- Settings (27-column organizationSettings, module settings)
- Tenant (settings CRUD, module gating with Redis cache)
- Platform admin (tenant provisioning, impersonation, `isPlatformAdmin` bootstrap)
- Payment (Stripe + GoCardless providers, pricing/tax engines, Stripe webhooks, overdue cron)
- Analytics (KPIs, revenue charts, customer intelligence, forecasting, metric snapshots)
- Audit log
- RBAC (roles, permissions, seeder, module gate)
- Developer (webhook endpoints, webhook delivery)
- Search (cross-module full-text search registry)
- AI (Anthropic Claude, MCP server, agent loop, workflow generation, RAG knowledge base)
- Pipeline (stages, members, deal values, forecasting)
- Outreach (sequences, contacts, templates, activities, sentiment)
- Client portal (engagements, proposals, deliverables, approvals, invoices, milestones, magic links)
- Resource pool (capacities, assignments, skills)
- Subscription (Stripe-based tenant billing)
- Product (plans, pricing tiers)

### Partially Implemented

- **Calendar pull cron** (`pullCalendarEventsCron`) — function registered in Inngest, but the body just logs and returns `{ triggered: true }`. Full per-integration paging through `userIntegrations` not yet written.
- **Outlook calendar** (`src/modules/calendar-sync/providers/outlook/index.ts`) — stub. Methods throw "not implemented".
- **Apple calendar** (`src/modules/calendar-sync/providers/apple/index.ts`) — stub.
- **Settings admin pages** — core settings route exists (`src/app/admin/settings/page.tsx`) but branding, DPA, and integrations sub-pages not ported.
- **Customer detail page** — list page exists, but `src/app/admin/customers/[id]/page.tsx` not ported.
- **Data retention cron** — logic existed in `src/lib/cron/data-retention.ts`; not yet migrated to an Inngest function.

### Not Yet Started (Significant Gaps)

- **Import/Export module** — `src/server/routers/import.ts` and `export.ts` are not ported. No `ImportSession` table equivalent in new schema. `papaparse` and `xlsx` packages removed from `package.json`. Requires: add packages, design session table, port `src/lib/import/parse-calendar-events.ts` and export logic.
- **Communications admin page** — `src/app/admin/communications/page.tsx` (message template management, sent message history, notification preferences). Templates exist in DB but no admin UI.
- **Staff calendar sync UI** — `src/app/admin/staff/[id]/calendar-sync/page.tsx` not ported.
- **Privacy / GDPR page** — `src/app/admin/privacy/page.tsx` not ported.
- **Module management page** — `src/app/admin/modules/page.tsx` and `src/app/admin/modules/[slug]/settings/page.tsx` not ported.
- **Today's schedule page** — `src/app/admin/today/page.tsx` not ported.
- **Routes / travel optimisation page** — `src/app/admin/routes/page.tsx` not ported.
- **Booking confirmation page** — `src/app/confirmation/page.tsx` not ported.
- **Public booking legal pages** — `/book/[slug]/privacy`, `/book/[slug]/terms`, `/book/[slug]/my-data` not ported.
- **Staff portal** — `src/app/staff/` (4 pages: staff home, bookings, schedule, availability) not ported.
- **Workflow analytics page** — `src/app/admin/workflows/analytics/page.tsx` not ported.
- **Admin approvals page** — `src/app/admin/approvals/page.tsx` not ported (portal approvals exist but admin overview doesn't).
- **Branding system** — `src/lib/branding/` and `src/components/branding/` not ported.

---

## 11. Migration Priority Order

Prioritised by: business-critical first, dependencies resolved in order, quick wins early.

### Priority 1 — Core Functionality Gaps (block daily operations)

1. **Calendar pull cron implementation** — `pullCalendarEventsCron` in `src/modules/calendar-sync/calendar-sync.events.ts` has a stub body. Implement the per-integration paging logic to match `src/lib/cron/pull-calendar-events.ts`. This is a single function, low risk.

2. **Data retention Inngest function** — Port `src/lib/cron/data-retention.ts` to an Inngest scheduled function. Register in `src/app/api/inngest/route.ts`. Legal/GDPR requirement for production.

3. **Communications admin page** — `src/app/admin/communications/page.tsx`. Message templates are in the DB; the admin UI to manage them is missing. Notification module exists — just need the page.

4. **Staff calendar sync UI** — `src/app/admin/staff/[id]/calendar-sync/page.tsx` → needs to become `src/app/admin/team/[id]/calendar-sync/page.tsx`. Uses `calendarSync.router.ts` which is fully implemented.

### Priority 2 — Operational Gaps (impact admin daily use)

5. **Module management pages** — `src/app/admin/modules/page.tsx` and `src/app/admin/modules/[slug]/settings/page.tsx`. Uses `tenant.router.ts` + `settings.router.ts` — both implemented.

6. **Today's schedule page** — `src/app/admin/today/page.tsx`. Uses booking + scheduling routers — both implemented.

7. **Customer detail page** — `src/app/admin/customers/[id]/page.tsx`. Customer router and service are complete.

8. **Booking approvals admin page** — `src/app/admin/approvals/page.tsx`. Approval router is implemented.

9. **Settings sub-pages** — branding, DPA, integrations settings pages. Settings router is implemented.

### Priority 3 — Public-Facing Gaps (affect customers)

10. **Booking confirmation page** — `src/app/confirmation/page.tsx`. Needed after public booking completes.

11. **Public booking legal pages** — privacy, terms, my-data pages under `/book/[tenantSlug]/`. GDPR requirement.

12. **Privacy/GDPR admin page** — `src/app/admin/privacy/page.tsx`. Required for GDPR compliance controls.

### Priority 4 — Staff Experience

13. **Staff portal pages** — `src/app/staff/` (home, bookings, schedule, availability). Requires auth middleware for staff-only access, uses booking + scheduling routers.

### Priority 5 — Data Operations

14. **Import module** — Significant work. Steps: (a) add `papaparse` and `xlsx` to `package.json`, (b) design `importSessions` table in Drizzle schema, (c) port `src/lib/import/parse-calendar-events.ts`, (d) build `src/modules/` import service and router, (e) port `src/app/admin/import/page.tsx`. Depends on no other missing modules.

15. **Export module** — Can be done after import. Port `src/lib/export/csv.ts` and `excel.ts` to a new `export` service. Add export endpoints to relevant module routers.

### Priority 6 — Calendar Providers

16. **Outlook calendar provider** — Implement `src/modules/calendar-sync/providers/outlook/index.ts` beyond stub. Requires Microsoft Graph API credentials and OAuth flow.

17. **Apple calendar provider** — Implement `src/modules/calendar-sync/providers/apple/index.ts` (CalDAV).

### Priority 7 — Analytics and Workflow

18. **Workflow analytics page** — `src/app/admin/workflows/analytics/page.tsx`. Uses analytics + workflow routers — both implemented.

19. **Routes / travel page** — `src/app/admin/routes/page.tsx`. Uses scheduling + travel-time module.

---

*This document reflects codebase state as of 2026-04-11. Both codebases are under active development.*
