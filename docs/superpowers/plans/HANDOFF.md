# Handoff — Last Session State

> **Updated**: 2026-05-24 — Phases 0.1–0.4 done. Live-data seed populated. 5 post-0.4 bug fixes after manual click-through.
> **Branch**: `feature/product-platform`
> **Repo**: `/Users/lukehodges/Documents/ironheart-refactor`

If you're a fresh Claude chat picking up here, this is the fastest path to context. Read this top-to-bottom, then [`ROADMAP.md`](./ROADMAP.md), then dive into the next task.

---

## 1. Where we are

**Phase 0.1.A** (platform shell): ✅ done
**Phase 0.1.B** (tenant bootstrap / WorkOS): ✅ critical-path. Tasks 6.5 + 9 deferred (manual workarounds exist).
**Phase 0.1.C** (org chart): ✅ COMPLETE — schema, repo, service, router, stage-transition seed, consultant UI, client UI, router tests. 106 new tests passing.
**Phase 0.2** (form-template seeds + chart→forms wiring + portal audit tab): ✅ COMPLETE — 6 templates seeded, Inngest handler creates `completed_forms` PENDING rows, audit progress page lives at `/[slug]/dashboard/audit`. No email dispatch yet.
**Phase 0.3** (audit workspace UI — lens entry, RAG, findings): ✅ COMPLETE — backend gap-filled (7 new procedures), 3-layer UI at `/platform/clients/[id]/audit` with autosave throughout.
**Phase 0.4** (report generator — Claude API draft → editor → publish PDF): ✅ COMPLETE — Anthropic SDK w/ prompt caching, side-by-side editor at `/platform/clients/[id]/report`, branded PDF via `@react-pdf/renderer` at `/api/reports/[id]/pdf`.

**Live-data seed** (2026-05-24): one engagement `c950c06a-...` populated end-to-end with realistic content — org chart w/ named persons, 4 form completions, 5 lenses (AMBER/RED/AMBER/GREEN/AMBER), 11 findings (£235k waste), 11 recommendations, call notes, DRAFT report. Run `npm run db:seed-test-engagement` to (re-)apply. Visit:
- `/platform/clients/c950c06a-1b41-4f46-9c89-660845d96bee/onboarding`
- `/platform/clients/c950c06a-.../audit`
- `/platform/clients/c950c06a-.../report`
- `/test/dashboard/audit` (client view)

**Post-0.4 live-debug fixes** (chronological):
1. `be1f529` — enable consultant modules (`report-generator` etc.) across all tenants. Provisioning only enables client modules; consultant ops were blocked at the module gate.
2. `d37633b` — report-generator service was reading `ctx.tenantId` (Luke's home tenant, e.g. `demo`) but reports are stored under engagement.tenantId. Switched to resolve from engagement record. `getByEngagement` now returns null (was throwing).
3. `1aeec83` — `/api/reports/[id]/pdf` auth gate was comparing `dbUser.tenantId === PLATFORM_TENANT_ID` env var (never set). Now uses `users.isPlatformAdmin === true`.
4. `9ea51aa` — PDF template assumed `contentJson` has `{topFindings, lenses[], implementationRoadmap[]}`. Seed wrote a different shape. Template now guards with `?? []` / `Array.isArray`.

**Phase 0.5** (client report view + walkthrough booking): ⏭ next, OR refactor `ctx.tenantId` story first (see Tech debt §3).

**Verified live end-to-end** on 2026-05-23 evening:

```
Luke creates engagement in /platform/clients/new (real form, real DB)
  → stage manually transitioned to CONTRACTED
  → provisioningService fires (called direct via tsx, Inngest bypassed)
  → WorkOS Organization "Test" created (org_01KSB4A2R0A0EH1GBD7220K1DM)
  → internal tenants row "test" inserted, 5 client modules enabled
  → WorkOS Invitation sent to luke.hodges.dev@gmail.com (admin role)
  → invite accepted via WorkOS signup (Google SSO)
  → /api/auth/callback → resolver maps user → tenant
  → middleware enforces WorkOS membership (Redis-cached)
  → /test/dashboard renders: welcome, stage strip (CONTRACTED), 3 action cards
```

Test engagement still in DB: `c950c06a-1b41-4f46-9c89-660845d96bee` → tenant `bb749224-...` slug `test`.

---

## 2. Background processes running

| ID | Process | Purpose | Health |
|---|---|---|---|
| `bu44kfwz5` | `npm run dev` | Next.js on http://localhost:3000 | ✅ running |
| `b91ddpio9` | `npx inngest-cli dev` | Inngest dev server :8288 | ⚠️ running but rejects SDK (`sdk_version_denied`). Won't fire events. Bypass = call services direct via tsx scripts. |

**Stop them**: `lsof -ti:3000 -ti:8288 | xargs kill`

**Dev server logs**: `tail -f /private/tmp/claude-501/-Users-lukehodges-Documents-the-ironheart-ltd/4d6b0ca8-23dc-4e71-ba58-52fc4112abab/tasks/bu44kfwz5.output`

---

## 3. Open architectural questions / known gotchas

These will bite you if you don't know them:

### a) Migration framework is half-broken

`drizzle/0000_moaning_spot.sql` is a commented-out introspection baseline that crashes `npx drizzle-kit migrate`. The DB was originally migrated from Prisma. The 119 tables exist; most "new" migration files are no-ops because schema is already there.

**For new schema changes:** write a hand-rolled `scripts/apply-<feature>.ts` doing `ALTER TABLE` directly (idempotent check first). See `scripts/apply-workos-org-id.ts` for the pattern. **Don't try `drizzle-kit migrate`** until someone rebaselines the whole migration history (Phase 1.x).

### b) Inngest CLI rejects this SDK

`inngest-cli@1.22.0` doesn't accept the function registration from this codebase. For testing event-driven flows, call the service directly via tsx:

```bash
npx tsx --tsconfig tsconfig.json scripts/test-provision-direct.ts
```

Pattern: scripts under `scripts/` import services via `@/...` aliases and call them. The Inngest queue is intentionally bypassed for now.

### c) WorkOS SDK quirks

- `@workos-inc/node@8.5.0` Organization type has NO `slug` field — wrapper returns `null` for it
- `@workos-inc/node@8.5.0` Invitation type has NO `roleSlug` field — wrapper returns `null` for it
- `getUser` 404 detection uses `instanceof NotFoundException` (NOT `err.status === 404`)
- `@workos-inc/authkit-nextjs` doesn't support `onSuccess` returning a redirect string — we use a `/auth/resolve` server-component page pattern instead (see `src/app/auth/resolve/page.tsx`)

### d) Server Component → Client Component boundary

Function components (e.g. lucide-react icons) **cannot** be passed as props from a Server Component to a Client Component. Pattern: pass a string name, resolve to function via a map inside the client component. See `src/components/tenant-portal/action-card.tsx` (`ICON_MAP`).

### e) Middleware preserves authkit headers

`src/modules/auth/middleware.ts` MUST not create a fresh `NextResponse.next()` after calling authkit middleware — that loses `x-workos-middleware` markers and `withAuth()` throws "isn't covered". Tenant headers must be LAYERED onto authkit's response via the `x-middleware-override-headers` mechanism. See `93ba3f0` for the fix.

### f) Pre-existing dirty files on this branch

`git status` shows ~60 file deletions in `.planning/` from prior work. Those are NOT mine. **Never `git add -A`** — always `git add <specific-file>`.

### g) Schema gap: `users.tenantId` is NOT NULL

A user can be a member of multiple WorkOS orgs (multi-tenant). But our `users.tenantId` column is NOT NULL — designed for single-tenant. Auth resolver picks an arbitrary "primary" tenantId. Fix later via join table `user_tenant_memberships`. Logged as tech debt.

### h) Schema gap: `customers` has no `companyName` column

Provisioning stores company name in `customer.notes` field. Hacky but documented w/ TODO comment in `provisioning.service.ts`. Fix later via migration adding a real column.

### i) `IRONHEART_TENANT_ID` env var

Required for `consulting.createClientEngagement` to know which tenant owns a new engagement (Luke is flat in `/platform/*` so all his customers belong to one logical tenant). Set to `43cf4a66-4252-43e8-933e-9cfb73f12886` in current `.env.local`. Created via `npm run db:bootstrap-platform`.

### j) `ctx.tenantId` is unreliable for platform-admin actions

`tenantProcedure` resolves `ctx.tenantId` from the user's `users.tenantId` column. Luke (platform admin) has `users.tenantId = demo` (whatever the seed put him on). When he visits `/platform/clients/<X>/audit` or `.../report`, the engagement may belong to a DIFFERENT tenant. Every consultant procedure must:
- Either: derive tenant from input (e.g. `engagementId` → look up `engagement.tenantId`)
- Or: skip ctx.tenantId and gate on `users.isPlatformAdmin === true` (canonical platform admin check)

Phase 0.4 found this in report-generator (`d37633b`). The same pattern probably affects audit-workspace + onboarding consultant procedures — they "work" today only because the seed data happens to be on the same tenant as Luke for some routes. Proper fix: introduce `platformAdminProcedure` middleware that doesn't set `ctx.tenantId`. Logged as Phase 1.x tech debt.

### k) Module gating cache + provisioning gap

`tenant_modules` enable-list is Redis-cached 5 min. After enabling a new module on a tenant, bust the cache via `scripts/bust-tenant-module-cache.ts` or wait 5 min. Provisioning currently enables CLIENT_MODULE_SET only (`client-portal`, `onboarding`, `audit-view`, `forms`, `bookings`) — consultant-side modules (`report-generator`, `audit-workspace`, `consulting`) must be enabled separately via `scripts/enable-report-modules.ts`. Long-term: split CLIENT vs CONSULTANT module sets in provisioning service, enable both at engagement creation time.

---

## 4. Decision registry — read [`phase-0.1-decisions.md`](./2026-05-23-phase-0.1-decisions.md) for the WHY

| ID | Decision (short) |
|---|---|
| D-01 | Luke flat in `/platform/*`, NOT own tenant |
| D-02 | Client URL: subdomain eventual, path-prefix `/[tenantSlug]/dashboard` for now |
| D-03 | Org chart drives form routing, not headcount tiers |
| D-04 | Tier suggests defaults only, consultant always approves |
| D-05 | Sampling = client owner picks names |
| D-06 | Org chart is collaborative two-way, single table |
| D-09 | WorkOS only — no magic links |
| D-09.1 | Tenant selector page in 0.1 (deferred to after 0.1.C now) |
| D-09.2 | Primary contact = admin; others = member; 7d invite expiry; resend in 0.1 |
| D-10 | `/admin/*` is legacy — new work goes to `/platform/*` |

---

## 5. Next-up: Phase 0.1.C — Org chart

Read [`2026-05-23-phase-0.1-org-chart.md`](./2026-05-23-phase-0.1-org-chart.md) for the full spec.

**Build order** (dependencies form a chain — sequential dispatches per subagent rule):

1. **Drizzle schema + DB apply** — `engagement_org_chart` + `engagement_org_chart_activity` tables + indexes. NOTE: use hand-rolled `scripts/apply-org-chart-schema.ts` per gotcha (a), NOT `drizzle-kit migrate`.
2. **Types** — `src/modules/onboarding/onboarding.types.ts`
3. **Repository** — CRUD + optimistic concurrency
4. **Service** — `resolveTier`, `seedChartFromTier`, `planOnboardingForms`, `getOnboardingStatus`
5. **tRPC router** — procedures for consultant (full perms) + client (limited perms)
6. **Inngest events** — wire `engagement/stage-changed` → seed chart on CONTRACTED transition
7. **Consultant UI** — `/platform/clients/[id]/onboarding` (tree editor + inspector + activity feed)
8. **Client UI** — `/[tenantSlug]/dashboard/onboarding` (same chart, limited perms)
9. **Activity log integration** — diff messages, both sides see
10. **Tests** — service + repo + perm gates + E2E manual

Per the `superpowers:subagent-driven-development` skill: dispatch one implementer subagent per task, run spec review + code review after each, never parallel implementations.

---

## 6. Useful scripts in `scripts/`

| Script | Purpose |
|---|---|
| `apply-workos-org-id.ts` | One-off schema migration (workosOrgId column on tenants) |
| `apply-org-chart-schema.ts` | Org chart + activity tables migration (0.1.C) |
| `apply-report-pdf-storage-key.ts` | Add pdfStorageKey/Url columns to audit_reports (0.4) |
| `apply-form-template-slug.ts` | Slug column + unique index on form_templates (0.2.A) |
| `apply-chart-node-form-send-id.ts` | formSendId column on engagement_org_chart (0.2.B) |
| `bootstrap-platform-tenant.ts` | Idempotent: create the `ironheart` platform tenant. Prints UUID. |
| `check-migrations.ts` | Diff schema vs DB; lists which columns/tables/enums exist |
| `check-provision-result.ts` | Inspect tenant + modules + org settings for a given test |
| `reinvite-test-client.ts` | Revoke old WorkOS invite + send new (parameter-hardcoded for the current test engagement) |
| `test-provision-direct.ts` | Bypass Inngest — call `provisioningService.provisionClientTenant` directly |
| `test-trigger-provision.ts` | Update engagement stage + (try to) fire Inngest event |
| `list-orgs.ts` | Cross-reference WorkOS orgs vs internal tenants |
| `seed-questionnaire-templates.ts` | Seed 6 form templates on Ironheart tenant (0.2.A) |
| `seed-test-engagement.ts` | Populate test engagement w/ realistic audit content — chart, forms, lenses, findings, recs, call notes, DRAFT report |
| `enable-report-modules.ts` | Enable `report-generator` + `audit-workspace` + `consulting` modules on all tenants |
| `bust-tenant-module-cache.ts` | Clear Redis `tenant:modules:*` keys after enabling modules |
| `fix-activity-actor-id.ts` | One-off ALTER: actorId uuid → text (WorkOS user ids are text) |

---

## 7. Commit log (current branch)

```
93ba3f0  fix(tenant-portal): preserve authkit headers + RSC-safe action icons
d9620a0  feat(tenant-portal): dashboard landing at /[tenantSlug]/dashboard (0.1.B Task 7)
72bee6e  feat(middleware): tenant resolution + WorkOS membership gate (0.1.B Task 6)
68c1018  feat(auth): resolve tenant from WorkOS memberships in callback (0.1.B Task 5)
a33938b  feat(consulting): provision tenant on CONTRACTED stage transition (0.1.B Task 4)
c6429bd  fix(consulting): provisioning follow-ups — migration, module guard, schema narrow (0.1.B Task 3)
dd4da40  feat(consulting): real WorkOS provisioning service (0.1.B Task 3)
b66063b  fix(platform/clients): db transaction + auto-resolve tenant + a11y (0.1.B Task 2 fixes)
bdfd679  feat(platform/clients): real new-client form replacing stub (0.1.B Task 2)
157e6e9  fix(workos): correct 404 detection + register error code (0.1.B Task 1 fixes)
e141660  feat(workos): typed wrapper for org + invitation management (0.1.B Task 1)
cea9bf4  feat(platform): expand sidebar nav + stub pages for Luke's workspace (0.1.A Task 2)
```

---

## 8. Reset state (if needed)

To remove the test tenant + engagement and start fresh:

```bash
cd /Users/lukehodges/Documents/ironheart-refactor

# Revoke WorkOS invitation (do via WorkOS dashboard if no API call ready)
# Then clear local state:
npx tsx -e 'import { config } from "dotenv"; config({ path: ".env.local" }); import("postgres").then(async ({default: pg}) => { const sql = pg(process.env.DATABASE_URL); await sql`UPDATE engagements SET "clientTenantId"=NULL, stage='\''DISCOVERY'\'' WHERE id='\''c950c06a-1b41-4f46-9c89-660845d96bee'\''`; await sql`DELETE FROM tenant_modules WHERE "tenantId"='\''bb749224-5ca0-4751-ab36-891eb8bcbd28'\''`; await sql`DELETE FROM organization_settings WHERE "tenantId"='\''bb749224-5ca0-4751-ab36-891eb8bcbd28'\''`; await sql`DELETE FROM tenants WHERE id='\''bb749224-5ca0-4751-ab36-891eb8bcbd28'\''`; console.log("✓ cleaned"); await sql.end(); })'
```

Then delete `Test` Organization from WorkOS dashboard manually.
