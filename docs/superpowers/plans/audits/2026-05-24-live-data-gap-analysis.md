# /platform/* Live-Data Gap Analysis

**Date**: 2026-05-24
**Branch**: `feature/product-platform`
**Author**: Audit-only pass (read-only)

## Purpose

We have two generations of `/platform/*` pages:

1. **Generation A — "live-wired"** (eclipsed): Waves D/E (`23f134b`, `d9afda3`) plus Phase 0.1.C/0.3/0.4 work — pulled real data via tRPC, looked rough.
2. **Generation B — "literal copy"** (current HEAD): commits `1f3da47` → `50fa942` — byte-for-byte copies of `/admin/*`, pixel-perfect, **all hardcoded mock data** (the `/admin/*` source also runs on mocks — `grep useQuery src/app/admin/` returns zero matches).

Goal: keep Generation B visuals, restore Generation A data wiring. For each page below: what mock arrays exist, what live data we need, what's already shipped in `src/modules/*` and `src/shared/db/schemas/*`, and how big the gap is.

## Key context

- All mock data lives in `src/lib/mock/{clients,customers,pipeline,calendar,inbox,workflows,team,platform,audit-log}.ts`. Each file has a JSDoc header listing intended DB tables and tRPC procedure signatures — invaluable as a spec.
- Existing tRPC root (`src/server/root.ts`) already mounts: `booking`, `customer`, `forms`, `review`, `workflow`, `tenant`, `platform`, `payment`, `analytics`, `audit`, `pipeline`, `outreach`, `team`, `ai`, `consulting`, `auditWorkspace`, `reportGenerator`, `onboarding`, `settings`, plus more.
- Existing tables (from `src/shared/db/schemas/`): `engagements`, `customers`, `bookings`, `invoices`, `payments`, `workflows`, `workflowExecutions`, `pipelines`/`pipelineMembers`/`pipelineStageHistory`, `outreachSequences`/`outreachContacts`/`outreachActivities`/`outreachTemplates`/`outreachSnippets`, `formTemplates`/`completedForms`, `reviews`/`reviewRequests`/`reviewAutomationSettings`, `staffProfiles`/`staffDepartments`, `tenants`/`tenantModules`/`tenantFeatures`, `auditLogs`, `aiConversations`/`aiMessages`/`agentActions`, `auditSessions`/`auditFindings`/`auditCallNotes`/`auditReports`, etc.
- **Notable missing tables**: `calendarEvents` (user-facing calendar — `calendar.schema.ts` is integration-sync only), `inboxItems` (unified inbox), platform-level `revenue_snapshots` / `module_adoption_30d` / `health_flags` tables for superadmin.

## Wiring legend

- `[ ] CONNECT` — table + procedure both exist, swap mock for `trpc.xxx.useQuery()`
- `[ ] EXTEND` — table exists, but missing columns or missing procedure
- `[ ] BUILD` — fully new schema + repo + procedure required

Effort: **S** = 1–2h, **M** = half-day, **L** = full day or more.

---

## /platform/dashboard

**Current state (HEAD)**: `src/app/platform/dashboard/page.tsx` — renders KPI cards + activity feed from a hardcoded `ACTIVITY` array (7 rows, fields: `time, icon, tone, who, verb, obj, amt, trail, href, source`). KPI tiles for revenue/bookings/clients are baked into JSX literals.

**Prior live-wired version**: commit `d3a6f3b` had a real dashboard pulling product KPIs. Eclipsed by Wave H literal copy at `bc11efe`.

**Mock data shapes**: inline `ACTIVITY = [...]`, `ACTIVITY_TABS = ["All", "Bookings", "Workflows", "Invoices", "Approvals"]` — no `/lib/mock` import.

**Data needed live**:
- Tables: `bookings`, `invoices`, `payments`, `workflowExecutions`, `pipelineStageHistory`, `formCompletions`, `auditLogs` (for cross-module activity stream); `engagements` + `tenants` for KPI tile counts.
- tRPC procedures:
  - **Existing**: `analytics.getKPIs`, `analytics.getRevenueChart`, `analytics.getBookingsByStatus`, `consulting.list` for engagement counts.
  - **NEW**: `dashboard.activityFeed({ tab?, limit }) -> ActivityRow[]` — unified cross-module event stream. Could live in a new top-level `dashboardRouter` or be appended to `analyticsRouter` as `analytics.activityFeed`.
- Repo functions: NEW `dashboardRepository.activityFeed()` — `UNION ALL` across bookings/invoices/workflow_executions/audit_logs ordered by ts. Or: persist a `dashboardEvents` materialized stream populated by event listeners (cleaner but more work).

**Gap classification**:
- [ ] EXTEND (KPI tiles — analytics router has the procs, just wire them up)
- [ ] BUILD (activity feed — needs new aggregator procedure; tables exist but no UNION proc)

**Effort estimate**: M

---

## /platform/clients (list)

**Current state (HEAD)**: `src/app/platform/clients/page.tsx` (commit `1f3da47`) — literal copy of `/admin/clients`. Imports `mockClients, STAGE_META, STAGE_ORDER, TYPE_LABEL` from `@/lib/mock/clients`.

**Prior live-wired version**: commit `23f134b` (Wave D) — used `<ClientsListView />` from `@/components/platform-clients/clients-list-view`, backed by `consulting.listForPlatform` (platformAdminProcedure, real DB).

**Mock data shapes**: `mockClients.segments()`, `mockClients.list(query) -> ClientEngagement[]`. Each engagement: `{ id, customer: CustomerSummary, title, type, status, stage, health, value, valueUnit, nextAction, owner, tags, lastActivityAt, lastActivity, proposed, risk, qualification }`.

**Data needed live**:
- Tables: `engagements` (exists), `customers` (exists), `users` for owner resolution (exists).
- tRPC procedures:
  - **Existing**: `consulting.listForPlatform(input) -> EngagementListItem[]`, `consulting.countByStage()`. Both already shipped in Wave D.
  - **NEW**: none for the list itself. Possibly an `engagement.nextAction` derivation if we want to surface the literal-copy "Next action" column properly (could derive from latest pipeline event / unfinished checklist).
- Repo functions: `consultingRepository.listForPlatform` and `countByStage` already shipped. May need EXTEND to return `health`, `value`, `tags`, `nextAction` — Wave D version returned a thinner shape.

**Gap classification**:
- [x] CONNECT (replace mockClients with `trpc.consulting.listForPlatform.useQuery`)
- [ ] EXTEND (add value, health, nextAction fields to the listForPlatform output — engagements table may need `value`, `valueUnit`, `health` columns if not already present)

**Effort estimate**: S (CONNECT) + S (EXTEND missing columns) = **S–M**

---

## /platform/clients/[id] (engagement hub)

**Current state (HEAD)**: `src/app/platform/clients/[id]/page.tsx` — 946-line literal copy from admin. Renders hero, stage strip, tabs (Overview, Team, Activity, Audit, Report). No mock import — data appears to be inline / fetched via existing wiring. Need closer read.

**Prior live-wired version**: commit `d9afda3` (Wave E) — `<EngagementHub />` from `@/components/platform-clients/engagement-hub.tsx`. Pulled from `consulting.getById`, `onboarding.getChart`, `auditWorkspace.*`, `reportGenerator.*`. **Zero mock.**

**Mock data shapes**: None obviously imported. Sub-pages `/onboarding`, `/audit`, `/report` still use the Wave E / Phase 0.1.C / 0.3 / 0.4 live wiring — those are already on real data.

**Data needed live**:
- Tables: `engagements`, `engagementOrgChart` (exists), `engagementMilestones` (exists), `auditSessions`, `auditFindings`, `auditReports` (all exist).
- tRPC procedures: all live — `consulting.getById`, `onboarding.getChart`, `auditWorkspace.getSession`, `reportGenerator.getReport`.

**Gap classification**:
- [x] CONNECT (this page is already wired correctly via Wave E components — verify the literal-copy at HEAD didn't displace the live-wired engagement-hub component)

**Effort estimate**: S (mostly verification — and re-merge engagement-hub.tsx into the literal-copy hero if Wave I overwrote it)

---

## /platform/customers (list) and /platform/customers/[id]

**Current state (HEAD)**: `customers/page.tsx` (1018 lines) + `customers/[id]/page.tsx` (559 lines) — literal copy from admin. Both import from `@/lib/mock/customers`.

**Prior live-wired version**: none — fully greenfield in platform space (only added in Wave I, `d119a62`).

**Mock data shapes**: `mockCustomers.list()`, `mockCustomers.getById(id)`, `mockCustomers.stats()`. `Customer` fields: `id, name, initials, status, since, lifetimeValue, openInvoicesCount, address, industry, employeesBand, source, notes, ownerId, contacts[], tags[], activity[], engagements[]`.

**Data needed live**:
- Tables: `customers` (exists), `customerNotes` (exists), `engagements` (exists), `bookings`, `invoices` (exist). Probable EXTEND on `customers` for: `industry`, `employeesBand`, `source`, `lifetimeValue`, `tags` (if not present), `ownerId` (if not present).
- tRPC procedures:
  - **Existing**: `customer.list`, `customer.getById`, `customer.listNotes`, `customer.getBookingHistory`, `customer.merge`, `customer.anonymise`.
  - **NEW**: `customer.stats() -> CustomerStats`, `customer.listActivity({ customerId }) -> CustomerActivity[]` (or join across bookings/invoices/audit_logs).
- Repo functions: customer repository exists. EXTEND to compute lifetime value (sum of paid invoices) and open invoice count.

**Gap classification**:
- [ ] EXTEND (add missing customer columns, add `customer.stats`, add `customer.listActivity` aggregator)

**Effort estimate**: M

---

## /platform/pipeline (list) and /platform/pipeline/[id] (deal detail)

**Current state (HEAD)**: `pipeline/page.tsx` (1002 lines) + `pipeline/[id]/page.tsx` — Wave H literal copy. Both import from `@/lib/mock/pipeline`. Also a `_components/` dir with pipeline-list / pipeline-forecast / pipeline-right-panel.

**Prior live-wired version**: none for the literal-copy admin view. The existing `pipelineRouter` was built for resource-scheduling pipelines (`pipelineMembers`, `pipelineStageHistory`), NOT a sales-deal CRM pipeline.

**Mock data shapes**: `mockPipeline.list()`, `getById()`. `Deal` fields: `id, customer, title, stage, value, currency, probability, expectedCloseAt, source, ownerId, tags, lastActivityAt, daysInStage, engagementId, lostReason, contacts[], notes[], activity[], proposals[]`.

**Data needed live**:
- Tables: **NEW** `deals`, `dealActivity`, `dealNotes`, `dealContacts`, `dealProposals` (or extend the existing `pipelines`/`pipelineMembers` schema with deal-CRM columns — likely a separate schema is cleaner since semantics differ).
- tRPC procedures: existing `pipelineRouter` is wrong shape. **NEW**: `pipeline.listDeals`, `pipeline.getDealById`, `pipeline.advanceStage`, `pipeline.markWon`, `pipeline.markLost`, `pipeline.stats`. Either add to existing `pipelineRouter` (with naming collision risk) or create a new `dealsRouter`.
- Repo functions: full new `dealsRepository`.

**Gap classification**:
- [ ] BUILD (full sales-CRM deals schema + router + repo)

**Effort estimate**: L

---

## /platform/bookings (list), /platform/bookings/[id], /platform/bookings/new

**Current state (HEAD)**: All three files (`133` / `237` / `272` lines) use **inline hardcoded arrays** (`TODAY`, `TOMORROW`, `LATER`, `BOOKING_TYPES`, `CLIENTS`, `LOCATIONS`) — no `/lib/mock` import.

**Prior live-wired version**: none for these literal-copy versions.

**Mock data shapes**: `Booking = { id, time, dur, title, sub, tone, tag }`; new-page has `BOOKING_TYPES`, `CLIENTS`, `LOCATIONS` hardcoded.

**Data needed live**:
- Tables: `bookings` (exists), `bookingStatusHistory`, `bookingAssignments`, `bookingWaitlist`, `appointmentCompletions` — all exist.
- tRPC procedures:
  - **Existing**: `booking.getById`, `booking.getPublicById`, `booking.create`, `booking.update`, `booking.cancel`, `booking.getStats`, `booking.listForCalendar`.
  - **NEW**: `booking.listGrouped({ groupBy: "today"|"tomorrow"|"later" }) -> Booking[]` — or just use `booking.listForCalendar` and group client-side.
- Repo functions: full booking repo exists.

**Gap classification**:
- [x] CONNECT (use existing `booking.listForCalendar` + client-side grouping; `booking.create` for the new page)

**Effort estimate**: S

---

## /platform/calendar

**Current state (HEAD)**: `calendar/page.tsx` — Wave H literal copy. Imports `mockCalendar, TYPE_LABEL, TONE_COLOR, TONE_SOFT, TODAY_DAY_OFFSET` and types from `@/lib/mock/calendar`.

**Prior live-wired version**: none — fully greenfield.

**Mock data shapes**: `CalendarEvent` discriminated union (`booking | internal | personal | deadline | reminder`). Fields: `id, type, title, startsAt, endsAt, allDay, tone, location, status, recurringRule, notes, customerId, engagementId, bookingId, attendees[], preparation[]`.

**Data needed live**:
- Tables:
  - **NEW** `calendarEvents` table (NOT to be confused with existing `calendar.schema.ts` which is for Google Calendar integration-sync). Schema is well-specified in `src/lib/mock/calendar.ts` JSDoc header.
  - **NEW** `calendarEventAttendees`, `calendarEventPreparation`.
  - Reuse: `bookings.startsAt`/`endsAt` for the `booking` variant (UNION view), `engagementMilestones` for `deadline`.
- tRPC procedures: **NEW** `calendar.list(query)`, `calendar.getById`, `calendar.eventsForDay`, `calendar.eventsForWeek`, `calendar.stats`. (`calendarSyncRouter` exists but is for Google Sync, not user-facing events.)
- Repo functions: NEW `calendarRepository` — or compose from `bookingRepository` + a small `personalEventsRepository`.

**Gap classification**:
- [ ] BUILD (new schema + repo + router for non-booking event types: internal meetings, deadlines, reminders, personal)

**Effort estimate**: L

---

## /platform/forms, /platform/forms/[id], /platform/forms/submissions/[id]

**Current state (HEAD)**: All three use **inline hardcoded data** (`TEMPLATES`, `INITIAL_FIELDS`, `SUBMISSION`, `RESPONSES`) — no `/lib/mock` import.

**Prior live-wired version**: forms backend is fully built (`formsRouter`, `formTemplates`, `completedForms` tables) and used by the `[tenantSlug]/dashboard/audit` flow. The /platform/forms pages just don't consume it.

**Mock data shapes**: `Template = { id, name, description, fields, submissions, lastUsed, status }`; `Submission = { id, form, submittedBy, client, date, status }`; `FormField = { id, label, type, required, placeholder, options, helpText, value }`.

**Data needed live**:
- Tables: `formTemplates` (exists), `completedForms` (exists).
- tRPC procedures:
  - **Existing**: `forms.listTemplates`, `forms.getTemplate`, `forms.listResponses`, `forms.getResponse`, `forms.getFormByToken`, `forms.submitForm`.
  - **NEW**: possibly `forms.templateStats({ templateId }) -> { submissions, lastUsed }` for the template list row counts.
- Repo functions: forms repo exists. May need EXTEND to compute submission count + last-used timestamps per template.

**Gap classification**:
- [x] CONNECT (just swap inline arrays for `trpc.forms.*.useQuery` — the procedures already exist)
- [ ] EXTEND (template stats aggregator)

**Effort estimate**: S

---

## /platform/inbox

**Current state (HEAD)**: `inbox/page.tsx` — imports `mockInbox` and the full discriminated-union of item types from `@/lib/mock/inbox`.

**Prior live-wired version**: none — fully greenfield.

**Mock data shapes**: `InboxItem` discriminated union across 9 types: `approval | message | workflow | payment | review | audit | pipeline | form | booking`. Each has `id, type, tone, source, who, preview, meta, occurredAt, occurredAtTs, bucket, unread, related[]` plus type-specific payload.

**Data needed live**:
- Tables: **NEW** `inboxItems` table (`id, type, source, who, body, occurredAt, unread, tenantId, payload jsonb`), `inboxItemRelations`. Alternatively: persist nothing and synthesize on read by UNION-ALL across `approvalRequests`, `aiMessages` (portal), `workflowExecutions`, `payments`, `reviews`, `auditLogs`, `pipelineStageHistory`, `completedForms`, `bookingStatusHistory`. The synthesize approach is faster to build but harder to query for "unread" state — need a separate `inboxReads` table either way.
- tRPC procedures: **NEW** `inbox.list(filters)`, `inbox.markRead(id)`, `inbox.reply({ id, body })`, `inbox.approve(id)`, `inbox.stats()`.
- Repo functions: NEW `inboxRepository`.

**Gap classification**:
- [ ] BUILD (large — either a new persistence model or a complex UNION aggregator)

**Effort estimate**: L

---

## /platform/outreach

**Current state (HEAD)**: `outreach/page.tsx` — **inline hardcoded arrays** `SEQUENCES`, `QUEUE`, `REPLIES`, `STATS` (no `/lib/mock` import).

**Prior live-wired version**: outreach backend is comprehensive (`outreachSequences`, `outreachContacts`, `outreachActivities`, `outreachTemplates`, `outreachSnippets`) but the `/platform/outreach` page doesn't use it.

**Mock data shapes**: `SEQUENCES = [{ name, contacts, openRate, replyRate, status }]`; `QUEUE = [{ channel, action, detail, time }]`; `REPLIES = [{ from, company, sentiment, preview, time }]`.

**Data needed live**:
- Tables: all exist (`outreachSequences`, `outreachContacts`, `outreachActivities`, `outreachTemplates`, `outreachSnippets`).
- tRPC procedures:
  - **Existing**: `outreach.listSequences`, `outreach.getSequenceById`, `outreach.listContacts`, `outreach.getContactDetail`, `outreach.getContactActivities`, `outreach.getDashboard`, `outreach.sequenceAnalytics`, `outreach.sectorAnalytics`, `outreach.listTemplates`, `outreach.listSnippets`.
  - **NEW**: `outreach.todaysQueue() -> QueueItem[]` (scheduled outbound actions for today). Might already be derivable from `outreachActivities` with `scheduledAt = today AND status = pending`.
- Repo functions: rich outreach repo exists.

**Gap classification**:
- [x] CONNECT (page is ~90% covered by existing procs)
- [ ] EXTEND (`outreach.todaysQueue` if not already implied by `getDashboard`)

**Effort estimate**: S

---

## /platform/payments, /platform/payments/[id], /platform/payments/new

**Current state (HEAD)**: All three use **inline hardcoded** `INVOICES` array + `OverdueItem` array, `CLIENTS`, `ENGAGEMENTS`, `LineItem`, `PAYMENT_TERMS`. No `/lib/mock` import.

**Prior live-wired version**: none.

**Mock data shapes**: `Invoice = { id, number, client, description, amount, issued, due, status, method }`; `OverdueItem = { id, client, amount, daysOverdue, lastChase }`.

**Data needed live**:
- Tables: `invoices` (exists), `payments` (exists), `pricingRules` (exists), `customers`, `engagements`.
- tRPC procedures:
  - **Existing**: `payment.listInvoices`, `payment.getInvoice`, `payment.createInvoice`, `payment.sendInvoice`, `payment.voidInvoice`, `payment.recordPayment`, `payment.listPricingRules`.
  - **NEW**: `payment.listOverdue()` (could be `listInvoices({ status: "overdue" })` already), `payment.stats()` for KPI tiles.
- Repo functions: payment repo exists.

**Gap classification**:
- [x] CONNECT (procs all exist — just swap arrays for queries)
- [ ] EXTEND (small — payment stats / overdue filter)

**Effort estimate**: S

---

## /platform/workflows, /platform/workflows/[id], /platform/workflows/[id]/edit, /platform/workflows/[id]/executions

**Current state (HEAD)**: All four use `@/lib/mock/workflows` — `mockWorkflows.list()`, `getById()`, `TRIGGER_META`, `STATUS_META`, `NODE_ICON`. Types: `Workflow, WorkflowNode, WorkflowEdge, Execution`.

**Prior live-wired version**: none for platform — but `workflowRouter` + tables already shipped in Phase 5.

**Mock data shapes**: `Workflow = { id, tenantId, name, description, status, trigger, isVisual, nodes, edges, tags, ownerId, lastModifiedAt, createdAt, retryPolicy, timeoutMs, concurrency, errorHandler }`; `Execution = { id, workflowId, status, startedAt, endedAt, triggerData, stepResults, failureReason, triggeredBy }`.

**Data needed live**:
- Tables: `workflows` (exists), `workflowActions` (exists), `workflowExecutions` (exists).
- tRPC procedures:
  - **Existing**: `workflow.list`, `workflow.getById`, `workflow.getExecutionDetail`, `workflow.getExecutions`, `workflow.validateGraph`.
  - **NEW**: `workflow.create`, `workflow.update`, `workflow.publish`, `workflow.enable`, `workflow.disable`, `workflow.delete` — needed for the edit page (and probably already partially exist; need to check `workflowRouter` more carefully).
- Repo functions: workflow repo exists.

**Gap classification**:
- [x] CONNECT (list / detail / executions: procs exist — swap mocks)
- [ ] EXTEND (edit page — confirm CRUD mutations exist, add what's missing)

**Effort estimate**: M

---

## /platform/reviews

**Current state (HEAD)**: `reviews/page.tsx` — **inline hardcoded** `REVIEWS` array (12 reviews) + `FILTERS`. No `/lib/mock` import.

**Prior live-wired version**: none — but `reviewRouter` + `reviews` table exist.

**Mock data shapes**: `Review = { id, client, initials, rating, date, engagement, text, sentiment, status, responded }`.

**Data needed live**:
- Tables: `reviews` (exists), `reviewRequests` (exists), `reviewAutomationSettings` (exists).
- tRPC procedures:
  - **Existing**: `review.list`, `review.getById`, `review.getAutomation`, `review.submitReview` (public).
  - **NEW**: possibly `review.respond({ id, body })`, `review.publish(id)`, `review.flag(id)`.
- Repo functions: review repo exists.

**Gap classification**:
- [x] CONNECT
- [ ] EXTEND (response/publish/flag mutations if missing)

**Effort estimate**: S

---

## /platform/team (list) and /platform/team/[id]

**Current state (HEAD)**: Both use `@/lib/mock/team` — `mockTeam.list()`, `getById()`. Very rich `TeamMember` model with employment, compensation, capacity, assignments, skills, certifications, reviews, timeOff, goals, documents, equipment, permissions, audit.

**Prior live-wired version**: none for /platform — but `teamRouter` is built out.

**Mock data shapes**: see header of `src/lib/mock/team.ts` — 13+ sub-entities per member.

**Data needed live**:
- Tables: `staffProfiles` (exists), `staffDepartments` (exists), `staffDepartmentMembers` (exists), `staffNotes` (exists), `staffPayRates` (exists), `staffChecklistTemplates`/`Progress` (exists), `staffCustomFieldDefinitions`/`Values` (exists), `userCapacities` (exists), `resourceSkills` (exists), `userAvailability` (exists).
- tRPC procedures:
  - **Existing**: `team.list`, `team.stats`, `team.getById`, `team.getAvailability`, `team.listSkills`, `team.getCapacity`, `team.getWorkload`, `team.listAssignments`, `team.getSchedule`, `team.listSkillCatalog`, plus checklists, custom fields.
  - **NEW**: `team.listGoals`, `team.listTimeOff`, `team.listDocuments`, `team.listEquipment`, `team.listCertifications`, `team.listReviews` — these may not exist if there's no underlying schema (HR-grade features).
- Repo functions: team repo is rich; may need new tables for `staffGoals`, `staffTimeOff`, `staffDocuments`, `staffEquipment`, `staffCertifications`, `staffReviews`.

**Gap classification**:
- [x] CONNECT (basic list/detail/skills/capacity/assignments)
- [ ] EXTEND (workload/schedule connections)
- [ ] BUILD (HR-grade: goals, time-off balances, documents, equipment, certifications, reviews — likely missing tables)

**Effort estimate**: L (if we want full Workday-grade depth) / M (if we ship the basics and stub the HR tabs)

---

## /platform/ai-chat

**Current state (HEAD)**: `ai-chat/page.tsx` — **inline hardcoded** `DEMO_MESSAGES` array (sample conversation with tool-use breakdowns).

**Prior live-wired version**: none for /platform/ai-chat, but `aiRouter` exists with full conversation/message/approval/action support.

**Mock data shapes**: `{ id, role: "user"|"assistant", content, toolUse?: { label, count }, body, actions?[] }`.

**Data needed live**:
- Tables: `aiConversations` (exists), `aiMessages` (exists), `agentActions` (exists), `aiCorrections` (exists).
- tRPC procedures:
  - **Existing**: `ai.sendMessage`, `ai.listConversations`, `ai.getConversation`, `ai.archiveConversation`, `ai.resolveApproval`, `ai.explainAction`, `ai.undoAction`, `ai.listActions`, plus knowledge / MCP / config.
  - **NEW**: none — full surface area exists.
- Repo functions: AI repo is fully built.

**Gap classification**:
- [x] CONNECT (swap demo messages for `trpc.ai.getConversation` + `trpc.ai.sendMessage.useMutation`)

**Effort estimate**: S

---

## /platform/settings

**Current state (HEAD)**: `settings/page.tsx` — **inline hardcoded** `TEAM`, `INTEGRATIONS`, `MODULES` arrays.

**Prior live-wired version**: none.

**Mock data shapes**: `TeamMember = { initials, name, email, role, roleTone }`; `Integration = { name, icon, connected, description }`; `Module = { name, slug, description, enabled }`.

**Data needed live**:
- Tables: `users` (exists), `userRoles` (exists), `roles` (exists), `tenantModules` (exists), `tenantFeatures` (exists), `integrations` (exists), `apiKeys` (exists), `moduleSettings` (exists), `organizationSettings` (exists).
- tRPC procedures:
  - **Existing**: `settings.createApiKey`, `settings.listApiKeys`, `settings.revokeApiKey`, `settings.getModuleTabs`; `tenant.getSettings`, `tenant.updateSettings`, `tenant.listModules`, `tenant.enableModule`, `tenant.disableModule`, `tenant.updateModuleConfig`, `tenant.getPlan`, `tenant.getUsage`; `team.list`.
  - **NEW**: `settings.listIntegrations` (or wire to `integrations` table directly via a new procedure).
- Repo functions: mostly exist.

**Gap classification**:
- [x] CONNECT (team tab: `team.list`; modules tab: `tenant.listModules`; api keys: `settings.listApiKeys`)
- [ ] EXTEND (integrations tab: needs an `integrations.list` procedure if not already in `integrationsRouter`)

**Effort estimate**: S

---

## /platform/audit-log

**Current state (HEAD)**: `audit-log/page.tsx` — uses `@/lib/mock/audit-log` (`mockAuditLog`, `AuditLogEntry`, filters, severity types).

**Prior live-wired version**: none, but the backend already exists.

**Mock data shapes**: `AuditLogEntry = { id, severity, when, whenTs, actor: { name, role }, action, entity, diff, ip }`.

**Data needed live**:
- Tables: `auditLogs` (exists in `shared.schema.ts`: `id, tenantId, userId, action, entityType, entityId, oldValues, newValues, ...`).
- tRPC procedures:
  - **Existing**: `audit.list`, `audit.exportCsv`, `audit.getFilterOptions` — all in place.
  - **NEW**: none.
- Repo functions: audit repo exists.

**Gap classification**:
- [x] CONNECT (procs exist — possible field-name mismatch between mock `severity/actor/diff` and table `action/oldValues/newValues`; may need a small projection in the service layer)
- [ ] EXTEND (add `severity` derivation or column if log entries need severity classification beyond what's stored)

**Effort estimate**: S

---

## /platform/superadmin (tenant directory, MRR, modules)

**Current state (HEAD)**: `superadmin/page.tsx` — uses `@/lib/mock/platform` (`mockPlatform`, `PLAN_LABEL`, `STATUS_LABEL`).

**Prior live-wired version**: none.

**Mock data shapes**: `Tenant = { id, name, plan, planLabel, planPrice, status, mrr, seats, activityScore, healthGrade, lastSeenAt, modulesEnabledCount, region, since, ownerUserId, billingEmail, tags }`; plus `ModuleAdoption`, `Revenue`, `Subscription`, `HealthFlag`.

**Data needed live**:
- Tables: `tenants` (exists), `tenantModules` (exists), `tenants` likely needs EXTEND for: `plan`, `planLabel`, `planPrice`, `mrr`, `seats`, `activityScore`, `healthGrade`, `region`, `tags`, `billingEmail` columns (some may already exist).
- **NEW**: `subscriptions` (Stripe-shaped), `revenueSnapshots` (monthly MRR/ARR history), `healthFlags`, `moduleAdoption30d` (could be a view/materialized aggregation).
- tRPC procedures: **NEW** under `platformRouter`: `platform.tenants.list`, `platform.tenants.getById`, `platform.modules.adoption`, `platform.revenue`, `platform.subscriptions.list`, `platform.healthFlags`, `platform.stats`.
- Repo functions: NEW.

**Gap classification**:
- [ ] EXTEND (tenants table + tenantModules — add commercial/health columns)
- [ ] BUILD (subscriptions, revenue snapshots, health flags, module adoption aggregator)

**Effort estimate**: L

---

## Pages NOT covered in this audit

These exist under `/platform/` but were not in the user-supplied scope; calling them out so they're not forgotten:

- `/platform/products`, `/platform/products/new`, `/platform/products/[id]`, `/platform/products/compare` — already live-wired (commits `1020175` through `2b33351`).
- `/platform/subscriptions`, `/platform/revenue` — already live-wired (`08a889c`).
- `/platform/analytics` — wired (`86b4b14`).
- `/platform/tenants`, `/platform/tenants/[id]`, `/platform/tenants/new` — separate from superadmin; verify wiring state.
- `/platform/educators`, `/platform/today`, `/platform/finance`, `/platform/invoices`, `/platform/reports` — sidebar stubs from `cea9bf4`; may be placeholder pages.
- `/platform/clients/[id]/onboarding`, `/audit`, `/report` — Phase 0.1.C / 0.3 / 0.4 — **already on live data**.

---

## Execution waves

Grouped by gap type, then by effort (S → L) within each group. This is a logical port order — start with the easy CONNECTs to build momentum and find any wiring boilerplate issues early, then work through EXTENDs, then tackle the heavy BUILDs.

### Wave 1 — CONNECT (procs and tables exist; just swap mocks)

Small, fast wins. Should be 1–2h each.

1. **/platform/clients (list)** [S] — restore Wave D `<ClientsListView />` + `consulting.listForPlatform`. Verify field coverage.
2. **/platform/clients/[id]** [S] — verify Wave E `<EngagementHub />` still in place; re-merge if displaced by Wave I.
3. **/platform/ai-chat** [S] — swap `DEMO_MESSAGES` for `ai.getConversation` / `ai.sendMessage`.
4. **/platform/bookings** + **/bookings/new** + **/bookings/[id]** [S] — `booking.listForCalendar` (group client-side), `booking.create`, `booking.getById`.
5. **/platform/forms** + **/forms/[id]** + **/forms/submissions/[id]** [S] — `forms.listTemplates`, `forms.getTemplate`, `forms.listResponses`, `forms.getResponse`.
6. **/platform/payments** + **/payments/new** + **/payments/[id]** [S] — `payment.listInvoices`, `payment.createInvoice`, `payment.getInvoice`.
7. **/platform/outreach** [S] — `outreach.listSequences`, `outreach.getDashboard`, `outreach.getContactActivities`.
8. **/platform/reviews** [S] — `review.list`, `review.getById`.
9. **/platform/audit-log** [S] — `audit.list` (mind the field projection between `auditLogs` table and mock shape).
10. **/platform/settings** [S] — `team.list`, `tenant.listModules`, `settings.listApiKeys`.

### Wave 2 — EXTEND (table exists, missing columns or procedures)

Half-day each.

11. **/platform/customers** + **/customers/[id]** [M] — extend `customers` with `industry`, `employeesBand`, `source`, `lifetimeValue`, `tags`; add `customer.stats`, `customer.listActivity` procedures.
12. **/platform/dashboard** [M] — wire `analytics.getKPIs`/`getRevenueChart` for tiles; add `analytics.activityFeed` aggregator.
13. **/platform/workflows** + **/workflows/[id]** + **/workflows/[id]/edit** + **/workflows/[id]/executions** [M] — list/detail/executions CONNECT; verify or add CRUD mutations (`create`, `update`, `enable`, `disable`, `delete`, `publish`) for edit flow.

### Wave 3 — BUILD (new schema, repo, router)

Full day or more each.

14. **/platform/calendar** [L] — new `calendarEvents` table + attendees + preparation; new `calendar.list/getById/eventsForDay/eventsForWeek/stats`. Compose with existing `bookings` for the `booking` event variant.
15. **/platform/team** + **/team/[id]** [L] — partial CONNECT for skills/capacity/assignments + new HR tables for goals, timeOff, documents, equipment, certifications, reviews (or stub those tabs and ship the basics in Wave 2 sized as M).
16. **/platform/pipeline** + **/pipeline/[id]** [L] — full sales-CRM `deals` / `dealActivity` / `dealNotes` / `dealContacts` / `dealProposals` schema + router + repo. The existing `pipelineRouter` is a different domain (resource-pool scheduling).
17. **/platform/inbox** [L] — either new `inboxItems` + `inboxItemRelations` + `inboxReads` schema, or a synthesize-on-read UNION-ALL approach across 9 source tables with a separate read-tracking table.
18. **/platform/superadmin** [L] — extend `tenants` with commercial columns; new `subscriptions`, `revenueSnapshots`, `healthFlags` tables; new `platform.tenants.*` / `platform.revenue` / `platform.modules.adoption` / `platform.healthFlags` procedures.

### Sequencing suggestion

- Knock out **all 10 Wave 1 items** in a single 2-day push (each ~1–2h). This re-establishes live data across ~half of `/platform/*` with minimal risk.
- Then **Wave 2** (3 items, ~half-day each) over 1.5 days.
- **Wave 3** is roadmap-sized: each BUILD item is its own mini-project. Sequence by business value — `superadmin` and `pipeline` likely highest (commercial visibility, sales motion); `calendar` second (operational); `team` HR-grade and `inbox` can be deferred or scoped down.

## Notes / open questions

- The `/admin/*` source is **also** mock-driven (confirmed via `grep useQuery src/admin/`), so this wiring work has zero benefit duplicated in `/admin/*` — when these wires land in `/platform/*`, `/admin/*` could potentially be deleted (it's been superseded as the consultant workspace per Luke's product direction).
- The JSDoc headers in `src/lib/mock/*.ts` are a **gold-mine spec** — they enumerate the exact column lists and tRPC procedure signatures intended for each entity. They were written as forward-looking contracts. Use them as the source of truth for table designs in Wave 2/3.
- Several pages mix `/lib/mock/*` imports with inline hardcoded constants. The pages with **inline-only** constants (bookings, forms, payments, outreach, reviews, ai-chat, settings, dashboard) are easier to migrate because their shape isn't shared across many call sites.
- "Generation A" pages preserved at `src/components/platform-clients/clients-list-view.tsx` and `src/components/platform-clients/engagement-hub.tsx` — these are the live-wired survivors and should be the visual+data reference for clients pages going forward (merge their tRPC wiring into the literal-copy hero shell).
