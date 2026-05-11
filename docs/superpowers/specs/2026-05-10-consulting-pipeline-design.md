# Ironheart Consulting Pipeline — End-to-End Design Spec

> **Date**: 2026-05-10
> **Scope**: Full client lifecycle from discovery call booking through audit, report, implementation, and retainer
> **Architecture**: Multi-tenant with engagement-centric data model

---

## 1. Overview

The Ironheart platform becomes the single system managing the entire consulting business — from prospect booking a 15-minute call through to ongoing retainer support. Each client company is provisioned as a tenant on the platform, with module gating controlling what they see. Ironheart (Luke's company) is a tenant with all modules enabled. The platform admin view provides cross-tenant visibility.

### Core Principles

- **Engagement from minute one** — the 15-min discovery call creates an engagement. No separate pipeline-to-engagement handoff.
- **Client tenant IS the portal** — no separate portal system. Clients log into their tenant with client modules enabled.
- **Module gating controls access** — existing `tenantModules` system determines what each tenant sees.
- **External tools linked, not rebuilt** — Plane.so for task management, Google Drive for documents, WorkOS for auth.
- **Premium polish, minimal noise** — client sees milestone-level updates, not every micro-change.

---

## 2. Engagement Lifecycle

```
DISCOVERY → PROPOSAL → CONTRACTED → ONBOARDING → AUDITING → REPORTING → IMPLEMENTING → RETAINER
```

Exit points at any stage:
- **CLOSED_WON** — engagement completed successfully (e.g., after audit-only engagement)
- **CLOSED_LOST** — prospect didn't proceed (with reason tracking)

### Engagement Entity Extensions

Extend the existing `engagements` table:

```
New fields:
  stage               ENUM (DISCOVERY, PROPOSAL, CONTRACTED, ONBOARDING, AUDITING, REPORTING, IMPLEMENTING, RETAINER, CLOSED_WON, CLOSED_LOST)
  clientTenantId      UUID FK nullable     -- the client's tenant (set at CONTRACTED)
  auditWindowStart    DATE nullable        -- when audit calls can be booked
  auditWindowEnd      DATE nullable
  closedReason        TEXT nullable         -- why engagement closed (if CLOSED_LOST)
  planeProjectId      TEXT nullable         -- linked Plane.so project ID
  driveFolderId       TEXT nullable         -- linked Google Drive folder ID
  discoveryCallId     UUID FK nullable      -- booking record for discovery call
  discoveryNotes      TEXT nullable         -- raw notes from discovery call
  qualificationData   JSONB nullable        -- structured qualification (revenue, team size, pain points)
```

---

## 3. The Three Tiers

### Platform Admin (Luke)
- `isPlatformAdmin` flag (already exists)
- Cross-tenant visibility via platform admin procedures
- Command centre dashboard aggregating engagements across all client tenants
- Manages pipeline, financials, and team on Ironheart tenant
- Enters any client tenant to manage audit/engagement

### Ironheart Tenant
- All modules enabled
- Ironheart employees are users on this tenant
- Pipeline & outreach live here
- Financial operations managed here
- Employees assigned to client engagements get cross-tenant access

### Client Tenants (one per client company)
- Auto-provisioned when engagement reaches CONTRACTED
- Limited modules enabled: `team`, `forms`, `booking`, `audit-client-view`, `report-view`, `implementation-progress`
- Client owner = tenant admin (WorkOS user, Google SSO)
- Client employees = restricted role (WorkOS users, Google SSO)
- Module set can be expanded during implementation phase

---

## 4. Authentication & User Provisioning

All users authenticate via WorkOS AuthKit (already integrated). First 1M monthly active users free.

### Provisioning Flow

1. **Engagement reaches CONTRACTED** → system creates WorkOS organization for client
2. **Client owner** receives invite email → clicks → Google SSO → account created on client tenant as admin
3. **Client owner adds team** via org chart → enters name, email, role per person
4. **System sends invite emails** to each team member → click → Google SSO → account created with restricted role
5. **Each invite includes** link to their assigned questionnaire + audit call booking

### Role Mapping

| Person | Tenant | WorkOS Role | Platform Access |
|--------|--------|-------------|-----------------|
| Luke | Ironheart | Admin | Platform admin — sees all |
| Ironheart employee | Ironheart | Member | RBAC-controlled, cross-tenant for assigned engagements |
| Client owner | Client tenant | Admin | Tenant admin — manages their team, sees engagement |
| Client employee | Client tenant | Member | Fills questionnaire, books call — minimal access |

---

## 5. Stage-by-Stage Detail

### 5.1 DISCOVERY

**Trigger**: Prospect books a 15-minute discovery call via public booking page or direct link sent during outreach.

**System automations**:
- Public booking page with "Discovery Call" appointment type (15 min)
- Booking confirmed → auto-create Customer record
- Auto-create Engagement at DISCOVERY stage on Ironheart tenant
- Calendar invite sent via Google Calendar sync
- Pre-call reminder email (T-1hr)
- CL-02 Pre-Call Research checklist auto-created (Plane.so task)

**Manual actions**:
- Pre-call research
- Run the 15-minute call
- Log call notes + qualification data on engagement
- Decision: proceed to proposal or close

**Exit**: Not a fit → CLOSED_LOST with reason + 60-day follow-up reminder.

### 5.2 PROPOSAL

**Trigger**: You advance engagement to PROPOSAL stage.

**System automations**:
- Proposal template pre-populated with client name, pain points from discovery notes, pricing
- Diagnostic one-pager auto-generated from call notes (AI-assisted)
- Branded web view URL generated for client
- PDF export available
- Engagement auto-advances to PROPOSAL when proposal is sent
- Follow-up reminders if no response (SOP-10 warm ghost recovery via workflow)

**Manual actions**:
- Customise proposal — add/remove sections, adjust pricing, write custom content
- Review diagnostic one-pager
- Send to client

**Exit**: Client declines → CLOSED_LOST. Ghost → SOP-10 recovery sequence auto-triggers.

### 5.3 CONTRACTED

**Trigger**: Client approves proposal (click-to-approve, e-signature layered later).

**System automations (the big moment)**:
1. Provision client tenant (WorkOS organization + tenant record + enable client module set)
2. Set `clientTenantId` on existing engagement + update `tenantId` to client tenant (engagement lives on client tenant, Luke accesses via platform admin)
3. Invite client owner via WorkOS (Google SSO)
4. Create Google Drive folder for engagement (via MCP)
5. Store contract/proposal in Drive folder
6. Send welcome email with login link
7. Auto-advance engagement to ONBOARDING

**Manual actions**:
- Confirm contract terms are correct
- Set audit window dates (auditWindowStart/End)

### 5.4 ONBOARDING

**Trigger**: Engagement reaches ONBOARDING (auto after CONTRACTED).

**Client owner experience**:
1. Logs in → sees onboarding dashboard with action cards
2. "Add Your Team" — enters name, email, role for each employee
3. "Your Questionnaire" — owner fills the Owner/Director questionnaire
4. "Book Your Audit Call" — books 90-min call within audit window

**System automations**:
- Owner adds team → system auto-assigns questionnaire by role:
  - Owner/Director → Owner questionnaire
  - Operations → Operations questionnaire
  - Finance → Finance questionnaire
  - Sales/Marketing → Sales questionnaire
  - Other → Team Member or Quick Pulse questionnaire
- Invite emails sent to each employee via WorkOS
- Each invite includes: questionnaire link + audit call booking link (20-min slot within audit window)
- Org chart view shows completion status per person (questionnaire done/pending, call booked/pending)
- Chase reminders for incomplete questionnaires at T-3 days before audit window start
- All booking links scoped to audit window — employees can only book within the dates you set

**Manual actions**:
- Override questionnaire assignments if needed
- Create custom questionnaires for specific contacts
- Monitor org chart completion
- Review completed questionnaires as they come in
- Prepare preliminary observations per lens

**Questionnaire auto-assignment mapping** (configurable defaults):

| Role keyword | Questionnaire template |
|-------------|----------------------|
| Owner, Director, CEO, Founder | Owner/Director |
| Operations, Ops, Delivery, Manager | Operations |
| Finance, Admin, Accounts, Bookkeeper | Finance/Admin |
| Sales, Marketing, BD, Business Dev | Sales/Marketing |
| (all others) | Team Member |

The owner can also send the Quick Pulse Check to any/all employees as an additional lightweight survey.

### 5.5 AUDITING

**Trigger**: First audit call begins (or manual advancement).

**System provides — Audit Workspace (new module)**:

**Layer 1 — Capture**:
- Team sidebar showing all contacts with their status (questionnaire done, call time, role)
- Per-person notes area — click a contact, see their questionnaire responses alongside a free-text notes field
- Notes auto-save as you type
- Each contact's questionnaire highlights shown at top of their notes area

**Layer 2 — Processing** (after calls):
- 5-lens tab interface: Revenue, Operations, Finance, Technology, Team
- Per lens:
  - RAG score selector (Red / Amber / Green) with justification text
  - Current state description (2-3 paragraphs)
  - Findings table: finding, impact (High/Medium/Low), evidence, priority (ranked)
  - Recommendations: specific action, estimated effort, rough cost
- Raw notes from all contacts visible for reference while processing

**Layer 3 — Ready for report**:
- All 5 lenses scored and structured
- System validates: all lenses have RAG score, at least one finding each, recommendations present
- "Generate Report" button becomes available

**Data model — Audit module**:

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
  contactUserId   UUID FK          -- the client employee
  rawNotes        TEXT
  callDate        TIMESTAMPTZ nullable
  callDuration    INT nullable     -- minutes
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

auditLensFindings
  id              UUID PK
  auditSessionId  UUID FK
  lens            ENUM (REVENUE, OPERATIONS, FINANCE, TECHNOLOGY, TEAM)
  ragScore        ENUM (RED, AMBER, GREEN)
  ragJustification TEXT
  currentState    TEXT              -- 2-3 paragraph description
  sortOrder       INT DEFAULT 0
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

auditFindings
  id              UUID PK
  lensId          UUID FK           -- auditLensFindings.id
  finding         TEXT NOT NULL
  impact          ENUM (HIGH, MEDIUM, LOW)
  evidence        TEXT
  priority        INT               -- ranked order within lens
  estimatedAnnualWaste  INT nullable  -- in pence
  createdAt       TIMESTAMPTZ

auditRecommendations
  id              UUID PK
  lensId          UUID FK
  action          TEXT NOT NULL
  estimatedEffort TEXT              -- "2 days", "1 week"
  estimatedCost   INT nullable      -- in pence
  priority        INT
  createdAt       TIMESTAMPTZ
```

### 5.6 REPORTING

**Trigger**: All 5 lenses scored, you click "Generate Report".

**System automations**:
- AI auto-drafts full report from:
  - Structured findings + RAG scores (all 5 lenses)
  - All questionnaire responses
  - All call notes
  - Industry benchmarks (if added)
  - Audit report template structure (executive summary, per-lens analysis, implementation roadmap)
- Report output: branded HTML + PDF
- Executive summary generated: top 3 findings + total estimated annual waste
- Implementation roadmap: phased, prioritised from findings
- Report stored in Google Drive folder
- CL-03 Report Review checklist auto-created (Plane.so task)

**Manual actions**:
- Trigger report generation
- Heavy review — human sniff test
- Edit, refine, add nuance AI missed
- Internal review (CL-03)
- Publish to client (makes report visible on client tenant + sends notification)
- Schedule walkthrough call via booking

**Report data model**:

```
auditReports
  id              UUID PK
  tenantId        UUID FK
  engagementId    UUID FK
  auditSessionId  UUID FK
  status          ENUM (GENERATING, DRAFT, IN_REVIEW, PUBLISHED)
  contentHtml     TEXT              -- the full report HTML
  contentJson     JSONB             -- structured report data for rendering
  executiveSummary TEXT
  totalEstimatedWaste INT           -- in pence, summed from findings
  driveFileId     TEXT nullable     -- Google Drive file ID
  publishedAt     TIMESTAMPTZ nullable
  generatedBy     TEXT              -- 'ai' or 'manual'
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ
```

**Exit**: Client only wanted the audit → mark CLOSED_WON. Report is the deliverable. Upsell to implementation is a new proposal on the same engagement.

### 5.7 IMPLEMENTING

**Trigger**: Client approves implementation proposal (second proposal on same engagement, or direct acceptance during walkthrough).

**System automations**:
- Create Plane.so project from audit findings/implementation roadmap (via MCP)
- Tasks auto-created in Plane from recommendations
- Additional modules enabled on client tenant (e.g., `implementation-progress`)
- Milestones + deliverables created on engagement
- Client sees milestone progress on their tenant
- Milestone completion → client notified for approval
- Latest update visible to client (milestone-level, not micro)

**Manual actions**:
- Execute tasks in Plane.so
- Daily change log updates (visible to client at milestone level)
- Weekly client checkpoint calls (via booking)
- Deliver and demo completed work
- Handover documentation (stored in Google Drive)

### 5.8 RETAINER

**Trigger**: Implementation complete, client moves to ongoing support.

**System automations**:
- Engagement status → RETAINER
- Monthly review calls auto-scheduled (recurring booking)
- Monthly review reports auto-generated (from activity data)
- Renewal reminders at 30 days before term end
- Client tenant stays active with support modules

**Manual actions**:
- Monthly review calls
- Bug fixes and optimisations
- Handle support requests

**Exit**: Client churns → offboarding checklist (CL-05). Tenant deactivated but preserved.

---

## 6. Client Tenant UI

### Navigation
Top nav with tabs that grow as engagement progresses:
- **ONBOARDING**: Dashboard, Team, Documents
- **AUDITING**: Dashboard, Team, Documents
- **REPORTING**: Dashboard, Team, Documents, Report
- **IMPLEMENTING**: Dashboard, Team, Documents, Report, Progress

### Dashboard Screens

**Onboarding**: Welcome message, progress bar showing current stage, action cards (Add Team, Fill Questionnaire, Book Call, Team Progress).

**Report Delivered**: Executive summary with RAG scores across 5 lenses, top 3 findings with waste figures, CTA to book walkthrough or view full report, PDF download.

**Implementation**: Milestone timeline with status per item (delivered/in-progress/upcoming), latest update card, deliverable approval flow (approve or request changes).

### Brand
Uses existing Ironheart brand tokens: Instrument Serif headings, Inter body, JetBrains Mono for data, warm backgrounds (#EFEAE0), accent red (#D13A1F), moss green (#2F6F5C), gold (#B8860B).

---

## 7. Module Inventory

### Already Built — Use As-Is (8 modules)

| Module | Role in Pipeline |
|--------|-----------------|
| **Booking** | Discovery calls, audit call booking (scoped to window), checkpoint calls |
| **Forms** | All questionnaires (7 templates seeded) |
| **Customer** | Client company record |
| **Workflow** | Stage transition automations, ghost recovery, reminders, chase sequences |
| **Notification** | Email invites, reminders, updates (Resend + Twilio) |
| **Team** | Org chart on client tenants, staff management on Ironheart tenant |
| **Tenant / Platform** | Multi-tenant isolation, module gating, tenant provisioning |
| **Review** | Post-engagement feedback collection |

### Extend (3 modules)

| Module | Changes |
|--------|---------|
| **Engagement** | New `stage` enum (DISCOVERY→RETAINER + CLOSED_WON/LOST), `clientTenantId`, `auditWindowStart/End`, `planeProjectId`, `driveFolderId`, `discoveryNotes`, `qualificationData` |
| **Proposal** | Template cloning from existing proposals, PDF export (HTML→PDF), branded web view URL |
| **Client Portal** | Not a separate system — the client tenant IS the portal. Register client-facing module slugs for gating. |

### New Modules (3)

| Module | Purpose | Estimated Scope |
|--------|---------|----------------|
| **Audit** | 5-lens workspace, call notes per contact, RAG scoring, findings tables, recommendations | ~3,000 LOC |
| **Report Generator** | AI report drafting from audit data, HTML + PDF output, review/edit/publish workflow | ~2,000 LOC |
| **Onboarding Orchestrator** | Coordinates CONTRACTED→ONBOARDING: tenant provisioning, WorkOS org creation, invite sending, questionnaire auto-assignment, audit window setup | ~1,500 LOC |

### External Integrations (4)

| Tool | Status | Integration Method |
|------|--------|-------------------|
| **WorkOS AuthKit** | Already integrated | Auth for all users, org provisioning for client tenants |
| **Google Calendar** | Already integrated | Booking module syncs events |
| **Plane.so** | MCP tools available | Auto-create projects + tasks from audit findings |
| **Google Drive** | MCP tools available | Auto-create folders, store contracts/reports/deliverables |

---

## 8. Questionnaire Seed Data

Seven form templates seeded during tenant provisioning, matching existing HTML questionnaires:

1. **Owner/Director** — business overview, revenue, challenges, tools, efficiency rating
2. **Operations** — daily workflow, handoffs, bottlenecks, quality control, tools
3. **Finance/Admin** — invoicing, expenses, cash flow, financial admin hours
4. **Sales/Marketing** — lead sources, sales process, conversion, follow-up
5. **Team Member** — daily tasks, communication, frustrations, workflow suggestions
6. **Quick Pulse Check** — 10 questions, 5 minutes, any employee
7. **General Pre-Audit** — original comprehensive questionnaire (6 sections)

Each maps to the existing Forms module field types (TEXT, TEXTAREA, SELECT, DATE, BOOLEAN, EMAIL, PHONE).

---

## 9. Workflow Templates

Pre-built workflow templates seeded for Ironheart tenant:

1. **Discovery → Proposal** — on discovery call completion, wait 60 min, if no proposal sent → remind consultant
2. **Ghost Recovery** — on proposal sent, if no response after 48hrs → trigger SOP-10 recovery sequence (3 touches over 7-21 days)
3. **Onboarding Orchestration** — on proposal approved → provision tenant → send welcome → wait for team roster → send invites → chase incomplete questionnaires
4. **Audit Prep** — at T-3 days before audit window → chase any incomplete questionnaires/unbookedcalls → notify consultant of gaps
5. **Report Delivery** — on report published → notify client → schedule walkthrough → if no response after 7 days → follow up
6. **Invoice Chase** — on invoice overdue → day 2 friendly reminder → day 7 phone call prompt → day 14 formal notice → day 30 escalation (per SOP-08)
7. **Renewal Reminder** — at T-30 days before engagement end date → notify consultant → send renewal discussion booking link to client

---

## 10. Checklist Templates (Plane.so)

Auto-created as Plane.so tasks at the right lifecycle moment:

| Checklist | Trigger | Tasks |
|-----------|---------|-------|
| CL-01 Prospect Research | Prospect added to pipeline | Website, reviews, social media, 2-3 specific observations |
| CL-02 Pre-Call Research | Discovery call booked | Website, reviews, social, ROI calculator ready, one-pager ready, pipeline entry review |
| CL-03 Report Review | Audit report draft complete | Second pair of eyes, branding check, number verification, proofread |
| CL-04 Post-Engagement Debrief | Engagement → CLOSED_WON | What went well, what didn't, time vs estimate, learnings |
| CL-05 Client Offboarding | Engagement ending | Final deliverable handoff, access revocation, data export, feedback, case study request |
| CL-07 Case Study | Engagement completed | Permission request, draft case study, client review |
| CL-09 Monthly Financial | 1st of month (cron) | Reconcile Zoho, check overdue, update forecasts |

---

## 11. Build Sequence

### Phase 1: Foundation
1. Extend Engagement entity (new fields + lifecycle)
2. Build Onboarding Orchestrator (tenant provisioning + invite flow)
3. Seed questionnaire form templates
4. Wire audit window into booking module (scope booking links to date range)

### Phase 2: Audit Core
5. Build Audit module (data model + capture layer + processing layer)
6. Build Report Generator (AI drafting + HTML/PDF output + publish flow)
7. Wire client tenant UI (dashboard screens per engagement stage)

### Phase 3: Integration
8. Plane.so integration (auto-create projects/tasks from audit findings)
9. Google Drive integration (auto-create folders, store documents)
10. Proposal extension (template cloning + PDF export)

### Phase 4: Automation
11. Build workflow templates (ghost recovery, onboarding orchestration, audit prep, invoice chase, renewal)
12. Seed checklist templates for Plane.so auto-creation
13. Wire milestone/deliverable approval flow on client tenant

---

## 12. What's NOT In Scope

- **Invoicing/payments** — handled by Zoho Books + existing tools, not a priority
- **Time tracking** — future phase, not needed for core pipeline
- **E-signature** — proposal click-to-approve is sufficient initially, DocuSign layered later
- **Custom report builder** — AI generates from template, manual editing in platform. No drag-and-drop report builder.
- **Mobile app** — responsive web only
- **Client-to-client isolation** — already handled by tenant isolation, no extra work needed
