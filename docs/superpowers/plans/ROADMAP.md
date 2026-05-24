# Ironheart Refactor Roadmap

> **Last updated**: 2026-05-23 (late evening — Phase 0.1 + 0.2 complete)
> **Branch**: `feature/product-platform`
> **Pickup point**: **Phase 0.5 starting** — Client report view at /[slug]/dashboard/report + walkthrough booking. After 0.5 the audit-ready baseline (north star) is complete.

## ⚡ Quick pickup if you're a fresh chat

1. Read this file
2. Read [`HANDOFF.md`](./HANDOFF.md) for last-session state + open tool-call backlog
3. Read [`phase-0.1-decisions.md`](./2026-05-23-phase-0.1-decisions.md) for locked architecture decisions (D-01 to D-10.x)
4. `git log --oneline -20` to see what landed
5. Open `[phase-0.1-org-chart.md](./2026-05-23-phase-0.1-org-chart.md)` for next-up tasks

## ✅ What works end-to-end (verified live 2026-05-23)

Created engagement → CONTRACTED → provisioning fired → WorkOS Organization + Invitation sent → invite accepted → client landed at `/[slug]/dashboard` with welcome, stage strip, action cards. Real DB. Real WorkOS. **Tenant provisioning loop is live.**

This is the canonical roadmap. If you've lost context across chats, **start here**. Each phase below points to its own plan file with full task detail and decisions.

---

## Vision

End-to-end software platform that runs the entire Ironheart consulting business — discovery → audit → report → implementation → retainer — with every client logging into their own tenant. Replaces Tally forms, Google Sheets pipeline trackers, and ad-hoc audit deliverables. First real test: an audit with the next inbound client.

## North Star for Phase 0.x

**By end of Phase 0.5, Luke can run an end-to-end audit on real client software**: client logs in via WorkOS, fills questionnaires inside the platform, attends calls scoped to audit window, sees lens analyses in their portal once published, receives PDF report inside the platform.

That's the proof point. After 0.5, every later phase is incremental polish + scale.

---

## Phase status legend

- ✅ Done
- 🚧 In progress
- ⏭️ Up next (queued)
- 📋 Planned (file exists, not started)
- 💭 Outlined (covered in roadmap, no plan file yet)

---

## Phase 0.x — Audit-Ready Baseline

The minimum thing that runs a real audit. ~4 weeks of work split across 5 sub-phases.

| Phase | Goal | Plan file | Status |
|---|---|---|---|
| **0.1** | Platform shell + tenant bootstrap + collaborative org chart | [`2026-05-23-phase-0.1-MASTER.md`](./2026-05-23-phase-0.1-MASTER.md) | ✅ |
| **0.2** | Form template seeds + chart→forms wiring + portal audit progress tab | [`2026-05-23-phase-0.2-forms-wiring.md`](./2026-05-23-phase-0.2-forms-wiring.md) | ✅ |
| **0.3** | Audit workspace UI (call notes capture, RAG entry, findings) | [`2026-05-23-phase-0.3-audit-workspace.md`](./2026-05-23-phase-0.3-audit-workspace.md) | ✅ |
| **0.4** | Report generator (Claude API draft → editor → publish + PDF) | [`2026-05-23-phase-0.4-report-generator.md`](./2026-05-23-phase-0.4-report-generator.md) | ✅ |
| **0.5** | Client report view + audit walkthrough booking link | [`2026-05-23-phase-0.5-client-report.md`](./2026-05-23-phase-0.5-client-report.md) | 📋 |

### Why this order

- 0.1 is foundation — without tenant + WorkOS + chart, nothing else has a place to live
- 0.2 turns the chart into actual form sends; without this, audits still depend on Tally
- 0.3 is where Luke does the actual audit work (his side); without UI it's still SQL pokes
- 0.4 generates the deliverable Luke can sell; this is the value moment
- 0.5 closes the loop — client receives report **inside the platform**, books walkthrough from there

### Dependencies between phases

```
0.1 ──> 0.2 ──> 0.3 ──> 0.4 ──> 0.5
 │                       ▲
 └───────────────────────┘
 (report generator reads chart structure for context)
```

---

## Phase 0.1 sub-task tree (active)

| Sub-phase | File | Tasks | Status |
|---|---|---|---|
| 0.1.A — Platform shell | [`phase-0.1-platform-shell.md`](./2026-05-23-phase-0.1-platform-shell.md) | 5 | ✅ (`cea9bf4`) |
| 0.1.B — Tenant bootstrap (WorkOS) | [`phase-0.1-tenant-bootstrap.md`](./2026-05-23-phase-0.1-tenant-bootstrap.md) | 9 | ✅ critical-path (6.5, 8, 9 deferred) |
| 0.1.C — Org chart | [`phase-0.1-org-chart.md`](./2026-05-23-phase-0.1-org-chart.md) | 10 | ✅ ALL 8 sub-tasks complete |

### 0.1.C granular status (2026-05-23)

| Task | Status | Commit | Notes |
|---|---|---|---|
| 1 — Schema + DB apply | ✅ | `ed7126b` | 2 tables, hand-rolled `apply-org-chart-schema.ts` (drizzle-kit broken) |
| 2 — Types + repository | ✅ | `55ddbea` | 27 tests, OptimisticConcurrencyError added |
| 3 — Service (tier + seed + plan) | ✅ | `b5ae54a` | 59 tests |
| 4 — tRPC router (16 procedures) | ✅ | `af780da` | Tests deferred to Task 8 |
| 5 — Wire chart seed into stage transition | ✅ | `cb96e3e` | Chains after provisioning |
| 6 — Consultant editor UI | ✅ | `902baf7` | 3-col layout, no drag-reparent (deferred) |
| 7 — Client editor UI | ✅ | `42ff53f` | mode="client" reuse + banner |
| 8 — Router tests | ✅ | `6958649` | 20 tests via mock-trpc fallback |

**Total tests added in 0.1.C: 106 (27 + 59 + 20).**
**Total Phase 0.1 commits: 22 (incl. `1ffadac` actorId fix).**

### 0.2 granular status (2026-05-23)

| Task | Status | Commit | Notes |
|---|---|---|---|
| 0.2.A — Seed 6 questionnaire templates | ✅ | `0985ff4` | Hand-authored ~100 fields across 6 files; slug col added |
| 0.2.B — Wire approvePlan → form sends | ✅ | `bb5e18d` | Inngest handler + `formSendId` col on chart nodes; 6 new tests |
| 0.2.C — Portal audit progress tab | ✅ | `ec082c9` | `clientGetAuditProgress` procedure + sidebar link |

**Tests in 0.2: 6 new (+ all existing pass).** Total commits in 0.2: 3.

### 0.3 granular status (2026-05-23)

| Task | Status | Commit | Notes |
|---|---|---|---|
| 1 — Backend gap-fill | ✅ | `f9bad9c` | 7 new procedures (getOrCreate, upsertCallNoteByEngagement, upsertLensByEngagement, reorderFindings, reorderRecommendations, validateByEngagement, markReadyByEngagement). 14 new tests pass. |
| 2-4 — Audit workspace UI (combined) | ✅ | `13eb35f` | 3-layer UI: Capture (contacts + notes autosave) + Processing (5 lens tabs w/ RAG + findings + recs) + Report Ready (validation gate). 11 new components. |

**Tests in 0.3: 14 new.** Total commits in 0.3: 2.

### 0.4 granular status (2026-05-24)

| Task | Status | Commit | Notes |
|---|---|---|---|
| 1 — Backend + Claude draft service | ✅ | `9bf793a` | Anthropic SDK + prompt caching on system prompt, `claude-opus-4-7` model. Inngest async generation. 16 new tests. |
| 2 — Report editor UI | ✅ | `e95cb92` | `/platform/clients/[id]/report` side-by-side: audit summary + markdown editor w/ preview toggle. Status bar w/ Regenerate + Publish CTAs. |
| 3 — PDF export + storage | ✅ (concerns) | `1f6e331` | `@react-pdf/renderer` branded template (cover + exec summary + 5 lens cards + roadmap). `/api/reports/[reportId]/pdf` route. On-demand render (no blob storage yet — deferred). Auto-export on publish. |

**Tests in 0.4: 16 new.** Total commits in 0.4: 3.

### 0.4 known gaps (defer to 0.5+)

- **PDF storage** — PDFs render on-demand each GET (~200-500ms cold). 0.5 will add `@vercel/blob` storage when `BLOB_READ_WRITE_TOKEN` is set.
- **Custom fonts** — Instrument Serif + Inter aren't registered in React-PDF; using Helvetica/Times fallbacks. Font files need to be hosted + registered for brand match.
- **`PLATFORM_TENANT_ID` env var** — referenced by the PDF route's auth gate. Verify it matches `IRONHEART_TENANT_ID` (or alias them) before first real publish.

### 0.2 known gaps (defer to 0.3+)

- **No email dispatch** on form send — `completed_forms` rows are created in PENDING state but no email goes out. Real-send wiring is its own task.
- **cross-tenant FK risk** — `completed_forms.customerId` references `customers.id`. Form instances created on Ironheart tenant point at customers on the client tenant. If FK is strictly enforced this will fail at real send time. Mitigation: use `formsRepository.createInstance` (no FK violation observed in tests). Production smoke test needed.
- **Upcoming sessions** in audit progress = always empty (`bookings` table has no engagement linkage in 0.1). Phase 0.4+ wires session→engagement.
- **`completed_forms.completedAt`** column doesn't exist; using `submittedAt` instead.

### 0.1.B granular status (2026-05-23)

| Task | Status | Commit(s) |
|---|---|---|
| 1 — WorkOS wrapper | ✅ | `e141660` + `157e6e9` (fix: 404 + error registry + PII mask) |
| 2 — New-client form | ✅ | `bdfd679` + `b66063b` (fix: tx + auto-resolve tenant + a11y) |
| 3 — Provisioning service | ✅ | `dd4da40` + `c6429bd` (fix: migration + module guard + schema narrow) |
| 4 — Wire stage transition | ✅ | `a33938b` |
| 5 — Auth callback resolution | ✅ | `68c1018` (used resolver page pattern; SDK doesn't support onSuccess redirect) |
| 6 — Tenant middleware | ✅ | `72bee6e` (merged w/ existing subdomain logic) |
| 6.5 — Tenant selector page | ⏸ deferred | Not blocking — auth resolver handles single-tenant case; selector only needed when user is in 2+ provisioned tenants. Resume after 0.1.C. |
| 7 — Tenant dashboard landing | ✅ | `d9620a0` + `93ba3f0` (live-test fixes: middleware header preservation + RSC-safe icons) |
| 8 — Consolidated tests | ⏸ deferred | Each task has its own tests passing; consolidation pass not blocking. |
| 9 — Invitations management UI | ⏸ deferred | Manual resend via WorkOS dashboard works for now. Build with 0.1.C team or after. |

**Live test passed 2026-05-23 evening — engagement `c950c06a-...` provisioned to tenant slug `test`, invitation accepted as `luke.hodges.dev@gmail.com`, lands at `/test/dashboard`.**

### Tech debt logged (Phase 1.x cleanup)

- LucideIcon type consistency in `platform-sidebar.tsx`
- `customers.companyName` column missing — stored in `notes` as workaround (TODO comment in service)
- `users.tenantId` NOT NULL conflicts w/ multi-tenant users
- **Drizzle migration framework partially broken** — `0000_moaning_spot.sql` is commented-out introspection baseline blocking `drizzle-kit migrate`. `0003_workos_org_id.sql` mostly already-applied state; only the `ALTER TABLE tenants ADD COLUMN workosOrgId text` was actually applied (via hand-written `scripts/apply-workos-org-id.ts`). Future schema changes should follow that pattern OR consolidate migrations into a fresh baseline.
- N+1 query in tenant dashboard layout/page (engagements queried twice)
- 5 client modules must exist in `modules` table (seed extended in `c6429bd`)
- `inngest-cli@1.22.0` rejects this codebase's Inngest SDK w/ `sdk_version_denied` — bypass by calling services directly via tsx for testing. Fix later: pin compatible CLI or update SDK.

### Operator pre-flight (before first real tenant provisioning)

1. Set `IRONHEART_TENANT_ID` env var (or ensure tenant with slug `ironheart` exists)
2. Apply migration: `npx drizzle-kit migrate` (review `drizzle/0003_workos_org_id.sql` first)
3. Run seed: `npm run db:seed` (adds 5 client module slugs)
4. WorkOS dashboard config: redirect URIs, invitation email branding, Google SSO enabled
5. Verify `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `UPSTASH_REDIS_REST_URL` env vars set
| Locked decisions | [`phase-0.1-decisions.md`](./2026-05-23-phase-0.1-decisions.md) | n/a | reference |

**Subagent execution order** (one implementer at a time per skill rules):

1. **0.1.A** all tasks sequentially (shell needed before others mount under it)
2. **0.1.B** all tasks sequentially (provisioning + auth + selector + dashboard)
3. **0.1.C** schema + repo + service can dispatch first (no UI dep), then both UIs

Each task: implementer subagent (Sonnet) → spec reviewer (Sonnet) → code reviewer (Sonnet) → mark done.

---

## Phase 1.x — Beyond Audit-Ready (Post Phase 0)

After the audit-ready baseline, scale features. Files don't exist yet; flesh out when 0.5 lands.

| Phase | Goal | Status |
|---|---|---|
| 1.1 | Multi-stakeholder coordination (Phase 4B in old plan) — team tab on portal, member invites flow | 💭 |
| 1.2 | Implementation tracking (Phase 4B/5 in old plan) — milestones, deliverable approvals, Plane.so sync | 💭 |
| 1.3 | Billing surface (Stripe payment links, invoices on portal) | 💭 |
| 1.4 | Retainer engagement support (renewal reminders, scheduled check-ins) | 💭 |
| 1.5 | Outreach/pipeline modules properly built (replaces JARVIS scripts) | 💭 |
| 1.6 | `/admin/*` → `/platform/*` migration (legacy cleanup) | 💭 |
| 1.7 | Subdomain DNS + wildcard certs (`slug.ironheart.app`) | 💭 |
| 1.8 | Domain capture for client auto-join | 💭 |

---

## How to use this roadmap

### If you're picking up after a break

1. Read this file top-to-bottom
2. Find the phase marked 🚧 — that's where work stopped
3. Open its plan file
4. Open `phase-0.1-decisions.md` to recall **why** any choice was made
5. Check git log for last commit referencing the phase — that's where the implementer left off

### If you're starting a new phase

1. Mark previous phase ✅ + commit roadmap update
2. Mark new phase 🚧 + commit
3. Read plan file, dispatch first implementer subagent
4. Follow `superpowers:subagent-driven-development` skill workflow

### If you're adding a new phase mid-stream

1. Append to relevant section above
2. Create plan file with same naming pattern: `YYYY-MM-DD-phase-N.M-name.md`
3. Update dependencies block if it shifts ordering

---

## Architecture decisions (live registry)

These are decided. Don't re-litigate.

| ID | Decision | File |
|---|---|---|
| D-01 | Luke flat in `/platform/*`, NOT own tenant | `phase-0.1-decisions.md` |
| D-02 | Client URL = `slug.ironheart.app/dashboard` (subdomain eventual, path-prefix v1) | `phase-0.1-decisions.md` |
| D-03 | Org chart drives form routing, not headcount tiers | `phase-0.1-decisions.md` |
| D-04 | Tier suggests defaults only, consultant always approves | `phase-0.1-decisions.md` |
| D-05 | Sampling = client owner picks names | `phase-0.1-decisions.md` |
| D-06 | Org chart collaborative two-way, single table | `phase-0.1-decisions.md` |
| D-07 | Quick-pulse template decision deferred to 0.2 | `phase-0.1-decisions.md` |
| D-08 | Chart activity log local to chart for 0.1 | `phase-0.1-decisions.md` |
| D-09 | WorkOS only — magic links removed | `phase-0.1-decisions.md` |
| D-09.1 | Tenant selector page = build. Domain capture = deferred | `phase-0.1-decisions.md` |
| D-09.2 | Role: primary=admin, others=member, 7d invite expiry, resend in 0.1 | `phase-0.1-decisions.md` |
| D-10 | `/admin/*` migration deferred — new work goes to `/platform/*` | `phase-0.1-decisions.md` |

---

## Key reference docs (outside roadmap)

- `docs/superpowers/specs/2026-05-11-complete-ui-blueprint.md` — UI blueprint, shared components SC-01..SC-14
- `docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md` — original 3-tier spec (superseded by D-01)
- `.claude/worktrees/demo-refactor/DEMO_MAP.html` — 206-route target map
- `docs/01-overview.md` — tech stack
- `docs/02-module-architecture.md` — module patterns

## Memory

Architecture decisions also persisted in `~/.claude/projects/-Users-lukehodges-Documents-the-ironheart-ltd/memory/project_ironheart_refactor_architecture.md`.
