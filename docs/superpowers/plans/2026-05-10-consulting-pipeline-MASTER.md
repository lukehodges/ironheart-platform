# Ironheart Consulting Pipeline — Master Build Plan

> **Created**: 2026-05-10
> **Status**: Phase 1 Backend COMPLETE. Everything else pending.
> **Spec**: `docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md`

---

## What We're Building

A complete end-to-end consulting business management system. Every stage from someone booking a 15-minute discovery call through to paid implementation and ongoing retainer — all managed in one platform. Each client company becomes a tenant. The module system controls what they see. Ironheart manages everything from a platform admin view.

```
DISCOVERY → PROPOSAL → CONTRACTED → ONBOARDING → AUDITING → REPORTING → IMPLEMENTING → RETAINER
```

---

## Architecture Decisions (Locked)

- **Engagement from minute one** — discovery call creates engagement, no pipeline handoff
- **Client tenant IS the portal** — no separate portal, clients log into their tenant
- **Everyone gets WorkOS accounts** — Google SSO, first 1M users free
- **Module gating controls access** — `tenantModules` determines what each tenant sees
- **External tools linked, not rebuilt** — Plane.so (tasks), Google Drive (docs), WorkOS (auth)
- **Three tiers**: Platform Admin (Luke) → Ironheart Tenant (staff) → Client Tenants (clients)
- **Engagement lives on client tenant** — Luke accesses via platform admin cross-tenant view

---

## Phase Overview

| Phase | Name | Status | What It Delivers |
|-------|------|--------|-----------------|
| **1A** | Foundation Backend | ✅ DONE | Engagement lifecycle, consulting module, stage transitions, questionnaire auto-assignment |
| **1B** | Foundation Frontend | ✅ DONE | Admin engagement management UI, stage transition controls |
| **2A** | Audit Core Backend | ✅ DONE | 5-lens workspace, call notes, RAG scoring, findings, audit data model |
| **2B** | Audit Core Frontend | ✅ DONE | Audit workspace UI (capture layer, processing layer) |
| **3A** | Report Generator Backend | ✅ DONE | AI report drafting, HTML/PDF output, publish workflow |
| **3B** | Report Generator Frontend | ✅ DONE | Report editor, branded preview, publish workflow |
| **4A** | Client Tenant Backend | ✅ DONE | Client-facing API endpoints, module registration, tenant provisioning orchestration |
| **4B** | Client Tenant Frontend | ✅ DONE | Onboarding dashboard, team view, report view, implementation progress |
| **5A** | Integration Backend | ✅ DONE | Plane.so auto-create projects, Google Drive folder creation |
| **5B** | Integration Frontend | ✅ DONE | Covered by engagement detail integrations tab |
| **6** | Automation & Seeding | ✅ DONE | Workflow templates, questionnaire seed data, checklist templates |
| **7** | Polish & QA | ❌ TODO | End-to-end testing, UX polish, mobile responsive, performance |

---

## Phase 1A: Foundation Backend ✅ DONE

**Commits**: `b5c77b6` → `b9d0559` (10 commits)
**Tests**: 19 passing, 0 regressions

### What was built

| File | Purpose |
|------|---------|
| `src/shared/db/schemas/client-portal.schema.ts` | Extended — `EngagementStage` enum + 10 new columns on engagements |
| `src/modules/client-portal/client-portal.types.ts` | Extended — `EngagementStage` type, `QualificationData` interface, new fields on `EngagementRecord` |
| `src/modules/consulting/consulting.types.ts` | Stage types, questionnaire mappings, all input/output interfaces |
| `src/modules/consulting/consulting.schemas.ts` | 7 Zod schemas for tRPC inputs |
| `src/modules/consulting/consulting.repository.ts` | Drizzle queries: stage updates, audit window, discovery notes, listing |
| `src/modules/consulting/consulting.service.ts` | Stage transition FSM with validation, discovery notes, listing |
| `src/modules/consulting/consulting.router.ts` | 6 tRPC procedures (stage, audit window, notes, list, listAll, suggestAssignments) |
| `src/modules/consulting/onboarding.service.ts` | Role → questionnaire template matching with configurable mappings |
| `src/modules/consulting/consulting.events.ts` | Inngest handler for `engagement/stage-changed` |
| `src/modules/consulting/index.ts` | Barrel export |
| `src/shared/inngest.ts` | Extended — 4 new engagement lifecycle events |
| `src/server/root.ts` | Extended — consulting router wired |
| `src/modules/consulting/__tests__/consulting.test.ts` | 6 stage transition tests |
| `src/modules/consulting/__tests__/onboarding.test.ts` | 13 questionnaire mapping tests |

### Stage transition rules (implemented)

```
DISCOVERY    → PROPOSAL, CLOSED_LOST
PROPOSAL     → CONTRACTED, CLOSED_LOST
CONTRACTED   → ONBOARDING, CLOSED_LOST
ONBOARDING   → AUDITING, CLOSED_LOST
AUDITING     → REPORTING, CLOSED_LOST
REPORTING    → IMPLEMENTING, CLOSED_WON, CLOSED_LOST
IMPLEMENTING → RETAINER, CLOSED_WON, CLOSED_LOST
RETAINER     → CLOSED_WON, CLOSED_LOST
```

---

## Phase 1B: Foundation Frontend ❌ TODO

### What needs to be built

**Admin Engagement Management Pages:**

1. **Engagement List Page** (`/admin/engagements`)
   - Table/card view of all engagements across stages
   - Filter by stage (tabs or dropdown)
   - Click into individual engagement
   - Stage badge with colour coding (red=discovery, gold=proposal, green=contracted+, black=retainer)

2. **Engagement Detail Page** (`/admin/engagements/[id]`)
   - Header: client name, stage badge, dates
   - Stage transition controls (buttons for valid next stages)
   - Discovery notes editor (rich text, auto-save)
   - Qualification data form (revenue, team size, pain points, industry, decision-maker)
   - Audit window date picker (start/end)
   - Timeline/activity log
   - Links to external tools (Plane project, Drive folder) when set

3. **Command Centre Dashboard** (`/admin/dashboard` or `/admin`)
   - Pipeline view: count of engagements per stage
   - Engagements needing attention (stuck in stage too long, incomplete onboarding)
   - Quick actions: create engagement, view by stage
   - Platform admin cross-tenant aggregation

### Existing patterns to follow

- Admin pages at `src/app/(admin)/admin/`
- Uses tRPC hooks for data fetching
- Tailwind CSS with Ironheart brand tokens
- Shadcn/ui components (check if installed)

### Dependencies

- Phase 1A (consulting module backend) ✅ Done

---

## Phase 2A: Audit Core Backend ❌ TODO

### New tables (Drizzle schema)

```
auditSessions
  id              UUID PK
  tenantId        UUID FK
  engagementId    UUID FK
  status          ENUM (IN_PROGRESS, PROCESSING, READY_FOR_REPORT, COMPLETE)
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

auditCallNotes
  id              UUID PK
  auditSessionId  UUID FK
  contactUserId   UUID FK
  rawNotes        TEXT
  callDate        TIMESTAMPTZ nullable
  callDuration    INT nullable (minutes)
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

auditLensFindings
  id              UUID PK
  auditSessionId  UUID FK
  lens            ENUM (REVENUE, OPERATIONS, FINANCE, TECHNOLOGY, TEAM)
  ragScore        ENUM (RED, AMBER, GREEN)
  ragJustification TEXT
  currentState    TEXT
  sortOrder       INT DEFAULT 0
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

auditFindings
  id              UUID PK
  lensId          UUID FK (auditLensFindings)
  finding         TEXT NOT NULL
  impact          ENUM (HIGH, MEDIUM, LOW)
  evidence        TEXT
  priority        INT
  estimatedAnnualWaste  INT nullable (pence)
  createdAt       TIMESTAMPTZ

auditRecommendations
  id              UUID PK
  lensId          UUID FK
  action          TEXT NOT NULL
  estimatedEffort TEXT
  estimatedCost   INT nullable (pence)
  priority        INT
  createdAt       TIMESTAMPTZ
```

### New module files

```
src/modules/audit-workspace/
  audit-workspace.types.ts
  audit-workspace.schemas.ts
  audit-workspace.repository.ts
  audit-workspace.service.ts
  audit-workspace.router.ts
  index.ts
  __tests__/audit-workspace.test.ts
```

Note: `src/modules/audit/` already exists (different purpose — internal audit logging). New module named `audit-workspace` to avoid collision.

### Key features

- Create audit session for an engagement
- Add/edit call notes per contact (auto-save)
- View questionnaire responses alongside call notes
- 5-lens tab interface with RAG scoring
- Add/edit/reorder findings per lens
- Add/edit recommendations per lens
- Validation: all lenses scored, at least one finding each before "ready for report"
- Auto-advance engagement to AUDITING when session created
- Auto-advance engagement to REPORTING when all lenses complete

### Tests needed

- CRUD for audit sessions, call notes, lens findings, findings, recommendations
- Validation logic (all lenses must be scored)
- Stage auto-advancement

### Dependencies

- Phase 1A ✅ Done
- No frontend dependency

---

## Phase 2B: Audit Core Frontend ❌ TODO

### What needs to be built

**Audit Workspace** (`/admin/engagements/[id]/audit`)

Three-layer interface (see visual mockup in `.superpowers/brainstorm/` session):

1. **Capture Layer** — Team sidebar (contacts + status), per-person notes area, questionnaire highlights visible alongside notes, auto-save

2. **Processing Layer** — 5-lens tabs (Revenue, Operations, Finance, Technology, Team), per lens: RAG score selector, current state editor, findings table (finding/impact/evidence/priority), recommendations list

3. **Report Ready** — validation indicator, "Generate Report" button when all lenses complete

### Key UX decisions

- Auto-save on notes (debounced, 500ms)
- Questionnaire responses shown as read-only highlights above call notes
- RAG score as three big clickable buttons (Red/Amber/Green)
- Findings table with inline editing and drag-to-reorder
- Tab badge shows completion status per lens

### Dependencies

- Phase 2A (audit workspace backend)
- Phase 1B (engagement detail page to link from)

---

## Phase 3A: Report Generator Backend ❌ TODO

### New table

```
auditReports
  id                  UUID PK
  tenantId            UUID FK
  engagementId        UUID FK
  auditSessionId      UUID FK
  status              ENUM (GENERATING, DRAFT, IN_REVIEW, PUBLISHED)
  contentHtml         TEXT
  contentJson         JSONB (structured report data)
  executiveSummary    TEXT
  totalEstimatedWaste INT (pence)
  driveFileId         TEXT nullable
  publishedAt         TIMESTAMPTZ nullable
  generatedBy         TEXT ('ai' or 'manual')
  createdAt           TIMESTAMPTZ
  updatedAt           TIMESTAMPTZ
```

### New module files

```
src/modules/report-generator/
  report-generator.types.ts
  report-generator.schemas.ts
  report-generator.repository.ts
  report-generator.service.ts
  report-generator.router.ts
  report-generator.events.ts
  index.ts
  __tests__/report-generator.test.ts
```

### Key features

- **AI auto-draft**: Take structured audit data (5 lenses, findings, recommendations, questionnaire responses, call notes) and generate full report following the Ironheart audit report template
- **Report structure**: Executive summary (top 3 findings + total waste), per-lens analysis (current state, RAG justification, findings table, recommendations), implementation roadmap (phased, prioritised)
- **HTML output**: Branded report using Ironheart design tokens
- **PDF export**: HTML → PDF (Puppeteer or similar)
- **Status workflow**: GENERATING → DRAFT → IN_REVIEW → PUBLISHED
- **Publish**: Makes report visible on client tenant + sends notification
- **Store in Google Drive**: Upload PDF to engagement's Drive folder

### AI integration approach

- Phase 1: Use Claude Code (manual AI generation via terminal)
- Phase 2: Build Anthropic API integration for automated drafting
- The `src/modules/ai/` module already has tool infrastructure that can be extended

### Tests needed

- Report creation and status transitions
- Data aggregation (total waste calculation)
- Publishing workflow

### Dependencies

- Phase 2A (audit workspace data to generate from)

---

## Phase 3B: Report Generator Frontend ❌ TODO

### What needs to be built

**Report Editor** (`/admin/engagements/[id]/report`)

- Report status indicator (GENERATING/DRAFT/IN_REVIEW/PUBLISHED)
- Rich text editor for report content (executive summary, per-lens sections)
- Side-by-side: structured audit data on left, report text on right
- "Generate Draft" button (triggers AI)
- Edit/refine generated content
- Internal review checklist (CL-03)
- "Publish to Client" button
- PDF download/preview

**Client Report View** (`/dashboard/report` on client tenant)

- Read-only branded report
- RAG scores across 5 lenses (visual summary)
- Top 3 findings with waste figures
- Full report expandable sections
- PDF download
- CTA: "Book Walkthrough Call" → booking link
- CTA: "Ready to fix what we found?" → implementation proposal

### Dependencies

- Phase 3A (report generator backend)
- Phase 2B (audit workspace to link from)

---

## Phase 4A: Client Tenant Backend ❌ TODO

### What needs to be built

1. **Tenant Provisioning Orchestrator**
   - On proposal approval → create WorkOS organization → create tenant record → enable client module set → invite owner
   - Inngest function triggered by `engagement/stage-changed` (toStage=CONTRACTED)
   - Creates Google Drive folder via MCP
   - Sends welcome email via notification module

2. **Client Module Registration**
   - Register module slugs: `consulting-client`, `audit-client-view`, `report-view`, `implementation-progress`
   - Each controls what the client sees at each engagement stage
   - Progressive module enabling: more modules unlocked as engagement progresses

3. **Client-Facing API Endpoints**
   - Team management: add contacts (name, email, role) → triggers WorkOS invite + questionnaire assignment
   - Onboarding status: which contacts have completed questionnaire, booked call
   - Engagement progress: current stage, milestones, deliverables
   - Report access: read-only report data when published
   - Deliverable approval: approve/request changes

4. **Audit Window Scoping for Booking**
   - Booking links for client contacts only show availability within audit window dates
   - 20-min slots for employees, 90-min for owner
   - Filter existing booking availability by engagement's auditWindowStart/End

### Dependencies

- Phase 1A ✅ Done
- WorkOS API integration for org creation + user invites

---

## Phase 4B: Client Tenant Frontend ❌ TODO

### What needs to be built

Four dashboard screens (see visual mockups in `.superpowers/brainstorm/` session):

1. **Onboarding Dashboard** — Welcome message, progress bar, action cards (Add Team, Fill Questionnaire, Book Call, Team Progress)

2. **Team View** — Org chart with per-person status, add members, send reminders

3. **Report View** — Executive summary, RAG scores, top findings, full report, PDF download, walkthrough CTA

4. **Implementation Progress** — Milestone timeline, latest update, deliverable approval flow

### Navigation

Top nav with tabs that grow as engagement progresses:
- ONBOARDING: Dashboard, Team, Documents
- REPORTING: + Report tab
- IMPLEMENTING: + Progress tab

### Brand

Ironheart design tokens: Instrument Serif headings, Inter body, JetBrains Mono data, warm bg (#EFEAE0), accent red (#D13A1F), moss green (#2F6F5C), gold (#B8860B)

### Dependencies

- Phase 4A (client tenant backend)
- Phase 3B (report view)

---

## Phase 5A: Integration Backend ❌ TODO

### Plane.so Integration

- Auto-create Plane project when engagement reaches IMPLEMENTING
- Create tasks from audit recommendations/implementation roadmap
- Store `planeProjectId` on engagement
- Sync task status for milestone progress view
- Use existing Plane MCP tools

### Google Drive Integration

- Auto-create client folder structure on CONTRACTED:
  ```
  /Ironheart Clients/[Company Name]/
    /Proposal/
    /Contract/
    /Audit/
    /Implementation/
  ```
- Store `driveFolderId` on engagement
- Upload reports to `/Audit/` subfolder
- Upload deliverables to `/Implementation/` subfolder
- Use existing Google Drive MCP tools

### Dependencies

- Phase 1A ✅ Done (engagement fields for external IDs)
- MCP tools configured and working

---

## Phase 5B: Integration Frontend ❌ TODO

### What needs to be built

- Engagement detail: links to Plane project and Drive folder
- Status indicators: connected/not connected
- Manual trigger buttons: "Create Plane Project" / "Create Drive Folder"
- Settings page: Plane.so API key, Google Drive connection

### Dependencies

- Phase 5A

---

## Phase 6: Automation & Seeding ❌ TODO

### Questionnaire Seed Data

Seven form templates seeded during Ironheart tenant setup:

| Template | Slug | Fields | Target |
|----------|------|--------|--------|
| Owner/Director | `questionnaire-owner-director` | ~20 fields | Business owner |
| Operations | `questionnaire-operations` | ~15 fields | Ops lead |
| Finance/Admin | `questionnaire-finance-admin` | ~12 fields | Finance person |
| Sales/Marketing | `questionnaire-sales-marketing` | ~12 fields | Sales lead |
| Team Member | `questionnaire-team-member` | ~12 fields | Any employee |
| Quick Pulse | `questionnaire-quick-pulse` | 10 fields | All employees |
| General Pre-Audit | `questionnaire-general` | ~25 fields | Original catch-all |

Each mapped to Forms module field types (TEXT, TEXTAREA, SELECT, DATE, BOOLEAN, EMAIL, PHONE). Content extracted from `the-ironheart-ltd/Templates/Questionnaires/`.

### Workflow Templates

Pre-built workflows seeded for Ironheart tenant:

| Workflow | Trigger | What It Does |
|----------|---------|-------------|
| Ghost Recovery | Proposal sent, no response 48hrs | SOP-10: 3-touch recovery over 7-21 days |
| Onboarding Orchestration | Proposal approved | Provision tenant → welcome → wait for roster → send invites → chase |
| Audit Prep | T-3 days before audit window | Chase incomplete questionnaires + unbooked calls |
| Report Delivery | Report published | Notify client → schedule walkthrough → follow up if no response |
| Invoice Chase | Invoice overdue | SOP-08: Day 2 reminder → Day 7 call → Day 14 notice → Day 30 escalation |
| Renewal Reminder | T-30 days before engagement end | Notify consultant → send renewal booking link |
| Discovery Follow-up | Discovery call complete, 60 min passed | Remind consultant if no proposal sent |

### Checklist Templates (Plane.so)

Auto-created as tasks at lifecycle triggers:

| Checklist | Trigger |
|-----------|---------|
| CL-01 Prospect Research | Prospect added to pipeline |
| CL-02 Pre-Call Research | Discovery call booked |
| CL-03 Report Review | Audit report draft complete |
| CL-04 Post-Engagement Debrief | Engagement → CLOSED_WON |
| CL-05 Client Offboarding | Engagement ending |
| CL-07 Case Study | Engagement completed successfully |
| CL-09 Monthly Financial | 1st of month (cron) |

### Dependencies

- Phase 1A ✅ Done (questionnaire mapping)
- Phase 2A (audit workspace for report review trigger)
- Phase 5A (Plane.so for checklist creation)
- Workflow module already built

---

## Phase 7: Polish & QA ❌ TODO

### End-to-End Testing

- Full lifecycle test: discovery → proposal → contract → onboard → audit → report → implement → retainer
- Test tenant provisioning and isolation
- Test role-based access (platform admin vs client owner vs client employee)
- Test stage transition guards
- Test questionnaire auto-assignment

### UX Polish

- Loading states and skeletons
- Error handling with recovery paths
- Empty states with helpful CTAs
- Mobile responsive (375px breakpoint)
- Keyboard navigation
- Accessibility (4.5:1 contrast, focus rings, aria labels)

### Performance

- Lazy load below-fold content
- Optimistic updates on stage transitions
- Debounced auto-save on notes/findings

### Dependencies

- All previous phases

---

## Existing Module Inventory

### Used As-Is (0 changes needed)

| Module | Role |
|--------|------|
| `booking` | Discovery calls, audit calls (scoped to window), checkpoint calls |
| `forms` | All questionnaires (7 templates) |
| `customer` | Client company record |
| `workflow` | Stage transition automations, ghost recovery, reminders |
| `notification` | Email invites, reminders, updates |
| `team` | Org chart on client tenants, staff on Ironheart tenant |
| `tenant` / `platform` | Multi-tenant isolation, module gating, provisioning |
| `review` | Post-engagement feedback |
| `analytics` | Revenue metrics, utilization |
| `pipeline` | Sales pipeline (pre-engagement outreach) |
| `outreach` | Multi-channel outreach sequences |

### Extended (minimal changes)

| Module | What Changes |
|--------|-------------|
| `client-portal` | Engagement schema extended ✅ DONE. Types extended ✅ DONE. |
| `consulting` | NEW module ✅ DONE |

### New Modules To Build

| Module | Phase | Purpose |
|--------|-------|---------|
| `audit-workspace` | 2A | 5-lens audit capture + processing |
| `report-generator` | 3A | AI report drafting + publish |

### External Tools

| Tool | Status | Integration |
|------|--------|-------------|
| WorkOS AuthKit | ✅ Integrated | Auth for all users, org provisioning |
| Google Calendar | ✅ Integrated | Booking syncs events |
| Plane.so | 🔧 MCP available | Auto-create projects/tasks (Phase 5) |
| Google Drive | 🔧 MCP available | Auto-create folders, store docs (Phase 5) |
| Zoho Books | 🔧 MCP available | Invoicing (not priority) |

---

## Build Order (Recommended)

```
Phase 1A ✅ → Phase 1B → Phase 2A → Phase 2B → Phase 3A → Phase 3B
                                                                  ↓
                                   Phase 4A → Phase 4B ← ← ← ← ←
                                        ↓
                                   Phase 5A → Phase 5B
                                        ↓
                                   Phase 6 (Automation)
                                        ↓
                                   Phase 7 (Polish)
```

Phases 4A/4B (client tenant) depend on Phases 2+3 being done first (client needs audit and report views). Phases 5A/5B (integrations) can technically run in parallel with Phase 4 but are lower priority.

---

## What's NOT In Scope

- **Invoicing/payments** — Zoho Books + existing tools handle this
- **Time tracking** — future feature, not needed for core pipeline
- **E-signature** — proposal click-to-approve sufficient initially, DocuSign later
- **Custom report builder** — AI generates, you edit. No drag-and-drop builder
- **Mobile app** — responsive web only
- **CRM beyond pipeline** — pipeline + outreach modules already handle sales flow

---

## Key Files Reference

```
docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md  — Full design spec
docs/superpowers/plans/2026-05-10-consulting-pipeline-MASTER.md  — This file
docs/superpowers/plans/2026-05-10-consulting-pipeline-phase1-foundation.md  — Phase 1A plan (done)

.superpowers/brainstorm/17412-1778444700/content/  — Visual mockups from brainstorming session
  client-experience.html      — Client tenant UI mockups (4 screens)
  audit-workspace.html        — Audit workspace 3-layer mockup
  client-journey.html         — Full stage-by-stage journey map
  integration-map.html        — Module integration diagram
  tenant-architecture.html    — Three-tier architecture diagram
  data-model.html             — Entity relationship diagram
```
