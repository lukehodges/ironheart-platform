# Client Portal V2 — Design Spec

## Overview

Redesign the client portal from a read-only proposal viewer into a full engagement management system. Proposals become the canonical source of truth — everything downstream (milestones, deliverables, invoices) traces back to what was promised.

**Approach:** Normalize proposals (relational line items replacing JSONB), add materialization engine, automate invoice lifecycle, and layer on collaboration features.

**Build waves:**
- **Wave A (foundational):** Richer proposal structure → Proposal materialization → Automated invoice lifecycle
- **Wave B (value-add):** Proposal versioning, Progress visualization (dashboard), Engagement templates
- **Wave C (collaboration):** Comments/threads, Document uploads, Change requests

---

## 1. Data Model

### 1.1 Engagement Changes

**Modified: `engagements`**
- `type`: add `HYBRID` to existing `PROJECT | RETAINER` enum
- `status`: add `PAUSED` to existing `DRAFT | PROPOSED | ACTIVE | COMPLETED | CANCELLED` enum
- `activeProposalId`: new nullable FK → `proposals.id` — points to the currently approved proposal

### 1.2 Proposal Normalization

**Modified: `proposals`**
- Remove: `deliverables` (jsonb), `paymentSchedule` (jsonb), `price` (integer) — replaced by relational tables below
- Add: `version` (integer, default 1)
- Add: `revisionOf` (nullable FK → `proposals.id`) — revision chain
- Add: `templateId` (nullable FK → `engagement_templates.id`) — tracks which template it was created from
- Keep: `id`, `engagementId`, `status`, `scope`, `terms`, `token`, `tokenExpiresAt`, `sentAt`, `approvedAt`, `declinedAt`, `createdAt`, `updatedAt`

**New: `proposal_sections`**
- `id`: uuid PK
- `proposalId`: uuid FK → proposals
- `title`: text (e.g., "Phase 1: Discovery")
- `description`: text (nullable)
- `type`: enum `PHASE | RECURRING | AD_HOC`
- `sortOrder`: integer
- `estimatedDuration`: text (nullable, e.g., "2 weeks")
- `createdAt`, `updatedAt`

**New: `proposal_items`**
- `id`: uuid PK
- `sectionId`: uuid FK → proposal_sections
- `proposalId`: uuid FK → proposals (denormalized for queries)
- `title`: text (e.g., "Brand audit document")
- `description`: text (nullable)
- `acceptanceCriteria`: text (nullable)
- `sortOrder`: integer
- `createdAt`, `updatedAt`

**New: `payment_rules`**
- `id`: uuid PK
- `proposalId`: uuid FK → proposals
- `sectionId`: uuid FK → proposal_sections (nullable — engagement-wide if null)
- `tenantId`: uuid FK → tenants (denormalized — needed for efficient cron queries)
- `label`: text (e.g., "Discovery milestone payment")
- `amount`: integer (pence)
- `trigger`: enum `MILESTONE_COMPLETE | RECURRING | RELATIVE_DATE | FIXED_DATE | ON_APPROVAL`
- `recurringInterval`: enum `MONTHLY | QUARTERLY` (nullable — only for RECURRING trigger)
- `relativeDays`: integer (nullable — days after approval or milestone completion)
- `fixedDate`: date (nullable — only for FIXED_DATE trigger)
- `autoSend`: boolean (default false — auto-send invoice or require admin confirmation)
- `sortOrder`: integer
- `createdAt`, `updatedAt`

### 1.3 Lineage Tracking

**Modified: `engagement_milestones`**
- Add: `sourceSectionId` (nullable FK → `proposal_sections.id`) — which proposal section created this milestone

**Modified: `deliverables`**
- Add: `sourceProposalItemId` (nullable FK → `proposal_items.id`) — which proposal item this deliverable fulfills
- Add status: `CANCELLED` to existing `PENDING | DELIVERED | ACCEPTED` enum (used during re-scoping when deliverables are removed)

**Modified: `portal_invoices`**
- Add: `sourcePaymentRuleId` (nullable FK → `payment_rules.id`) — which payment rule generated this invoice
- Add: `stripePaymentIntentId` (text, nullable)
- Add: `stripePaymentUrl` (text, nullable)
- Add: `invoiceNumber` (text, unique per tenant — format: `INV-{year}-{seq}`)
- Add status: `VOID` to existing `DRAFT | SENT | PAID | OVERDUE` enum

### 1.4 Engagement Templates (Wave B)

**New: `engagement_templates`**
- `id`: uuid PK
- `tenantId`: uuid FK → tenants
- `name`: text (e.g., "AI Audit Package")
- `description`: text (nullable)
- `type`: enum `PROJECT | RETAINER | HYBRID`
- `isActive`: boolean (default true)
- `createdAt`, `updatedAt`

**New: `template_sections`** (mirrors proposal_sections)
- `id`: uuid PK
- `templateId`: uuid FK → engagement_templates
- `title`, `description`, `type`, `sortOrder`, `estimatedDuration`
- `createdAt`, `updatedAt`

**New: `template_items`** (mirrors proposal_items)
- `id`: uuid PK
- `sectionId`: uuid FK → template_sections
- `templateId`: uuid FK → engagement_templates (denormalized)
- `title`, `description`, `acceptanceCriteria`, `sortOrder`
- `createdAt`, `updatedAt`

**New: `template_payment_rules`** (mirrors payment_rules)
- `id`: uuid PK
- `templateId`: uuid FK → engagement_templates
- `sectionId`: uuid FK → template_sections (nullable)
- `label`, `amount`, `trigger`, `recurringInterval`, `relativeDays`, `fixedDate`, `autoSend`, `sortOrder`
- `createdAt`, `updatedAt`

Separate tables (not polymorphic FKs) because: cleaner constraints, templates evolve independently, no risk of template edits affecting sent proposals, simpler queries.

### 1.5 Client Actions (Wave C)

**New: `engagement_comments`**
- `id`: uuid PK
- `engagementId`: uuid FK → engagements
- `milestoneId`: uuid FK → engagement_milestones (nullable)
- `deliverableId`: uuid FK → deliverables (nullable)
- `parentId`: uuid FK → self (nullable — one level of threading only)
- `authorType`: enum `ADMIN | CLIENT`
- `authorId`: uuid
- `body`: text
- `createdAt`, `updatedAt`

Scoping: no milestoneId/deliverableId = engagement-level; set one = scoped to that entity.

**New: `engagement_documents`**
- `id`: uuid PK
- `engagementId`: uuid FK → engagements
- `milestoneId`: uuid FK → engagement_milestones (nullable)
- `uploadedBy`: enum `ADMIN | CLIENT`
- `uploaderId`: uuid
- `fileName`: text
- `fileUrl`: text
- `fileSize`: integer (bytes)
- `mimeType`: text
- `category`: enum `BRIEF | ASSET | REFERENCE | OTHER`
- `createdAt`

Storage: S3-compatible (R2/S3). Pre-signed upload URLs for clients, expiring download URLs (1 hour).

**New: `change_requests`**
- `id`: uuid PK
- `engagementId`: uuid FK → engagements
- `deliverableId`: uuid FK → deliverables (nullable)
- `milestoneId`: uuid FK → engagement_milestones (nullable)
- `customerId`: uuid FK → customers
- `title`: text
- `description`: text
- `status`: enum `PENDING | ACCEPTED | DECLINED`
- `adminResponse`: text (nullable)
- `impactNote`: text (nullable — admin notes on scope/cost impact)
- `createdAt`, `updatedAt`

Change requests don't auto-modify scope. They're a communication channel that can optionally trigger a proposal revision.

### 1.6 Tenant Settings Additions

**Modified: `organizationSettings`**
- Add: `invoiceReminderDaysBefore` (integer, default 3)
- Add: `invoiceOverdueReminderDays` (integer[], default [7, 14, 30])
- Add: `invoiceAutoRemind` (boolean, default true)
- Add: `bankAccountName` (text, nullable)
- Add: `bankSortCode` (text, nullable)
- Add: `bankAccountNumber` (text, nullable)
- Add: `stripeEnabled` (boolean, default false)
- Add: `stripeAccountId` (text, nullable)

---

## 2. Proposal Materialization Engine

### 2.1 Approval Flow

When a client approves a proposal, a single atomic transaction executes:

1. `proposal.status` → `APPROVED`, `approvedAt` → now
2. `engagement.status` → `ACTIVE`, `engagement.activeProposalId` → proposal.id
3. `engagement.type` → inferred from sections (all PHASE → PROJECT, all RECURRING → RETAINER, mix → HYBRID)
4. For each section where `type = PHASE`:
   - Create `engagement_milestone` (title, description, sortOrder, dueDate computed from estimatedDuration, sourceSectionId)
   - For each `proposal_item` in section: create `deliverable` (title, description, sourceProposalItemId, milestoneId)
5. For each section where `type = AD_HOC`:
   - For each `proposal_item`: create `deliverable` (no milestoneId — standalone)
6. For each section where `type = RECURRING`:
   - No milestones or deliverables created — the payment_rules with trigger RECURRING handle ongoing invoice generation via the daily cron
7. For each `payment_rule`:
   - `ON_APPROVAL` → create invoice (DRAFT, dueDate: now + 14 days)
   - `FIXED_DATE` → create invoice (DRAFT, dueDate: fixedDate)
   - `RELATIVE_DATE` → create invoice (DRAFT, dueDate: now + relativeDays)
   - `MILESTONE_COMPLETE` → skip (created when milestone completes)
   - `RECURRING` → skip (created by Inngest cron)
8. Create portal session for customer (30-day)

After commit, emit events: `portal/proposal:approved`, `portal/invoices:generated`, `portal/engagement:activated`

### 2.2 Milestone-Triggered Invoices

When admin marks a milestone as COMPLETED:

1. `milestone.status` → `COMPLETED`, `completedAt` → now
2. Find `payment_rules` where `trigger = MILESTONE_COMPLETE` AND `sectionId = milestone.sourceSectionId`
3. For each matching rule: create invoice (sourcePaymentRuleId, amount, label, dueDate: now + relativeDays or 14 default)
4. If `rule.autoSend = true`: invoice.status → SENT, emit `portal/invoice:sent`
5. Emit `portal/milestone:completed`

### 2.3 Recurring Invoice Generation

Inngest cron, daily at 9am:

1. Find all `payment_rules` where `trigger = RECURRING`, proposal is APPROVED, engagement is ACTIVE
2. For each rule, check if an invoice is due: MONTHLY = last invoice > 30 days ago (or none yet), QUARTERLY = > 90 days ago
3. For each due rule: create invoice (DRAFT or SENT based on autoSend)
4. Emit `portal/invoices:generated`

### 2.4 Re-scoping (Proposal v2+)

When a new proposal version is approved on an existing active engagement:

1. Existing deliverables with `sourceProposalItemId` in the OLD proposal: keep as-is (work already done)
2. New proposal_items not in old proposal: create new deliverables
3. Removed proposal_items: flag corresponding deliverables as CANCELLED
4. Payment rules: void unfulfilled invoices from old rules, create new ones from new rules
5. `engagement.activeProposalId` → new proposal.id

This is a diff materialization, not a full re-creation.

### 2.5 Idempotency

Materialization checks for existing deliverables/invoices by `sourceProposalItemId`/`sourcePaymentRuleId` before creating. Safe to retry.

---

## 3. Invoice Lifecycle

### 3.1 State Machine

```
DRAFT → SENT → PAID
              → OVERDUE → PAID
DRAFT → VOID (cancelled/superseded)
SENT → VOID
```

VOID is for cancelled or superseded invoices. Financial records are never deleted.

### 3.2 Stripe Integration

When an invoice status → SENT and Stripe is enabled for the tenant:

1. Create Stripe Payment Intent (amount in pence, currency GBP, metadata: invoiceId + engagementId)
2. Create Stripe Checkout Session (success_url: /portal/invoices?paid={id}, cancel_url: /portal/invoices)
3. Store `stripePaymentIntentId` and `stripePaymentUrl` on invoice
4. Set `paymentMethod: STRIPE`

Payment confirmation via webhook (`checkout.session.completed`):
- Match by `metadata.invoiceId`
- `invoice.status` → PAID, `paidAt` → now, `paymentReference` → Stripe PI id
- Emit `portal/invoice:paid`
- Idempotent: if already PAID, no-op

Bank transfer: admin manually marks paid with reference string. Same event emitted.

Stripe is lazy-init (follows existing pattern). Bank transfer is always available.

### 3.3 Automated Reminders

Same daily Inngest cron handles reminders:

- **Upcoming:** invoices where `status = SENT` and `dueDate` within `invoiceReminderDaysBefore` days → emit `portal/invoice:reminder` (type: upcoming)
- **Overdue detection:** `status = SENT` and `dueDate < now` → `status` → OVERDUE, emit `portal/invoice:overdue`
- **Overdue follow-up:** based on `invoiceOverdueReminderDays` array (default [7, 14, 30]) → emit reminders at each interval
- All configurable per tenant. `invoiceAutoRemind = false` disables.

### 3.4 Invoice Numbers

Auto-generated sequential per tenant: `INV-{year}-{seq}`. Assigned when invoice is created. New column `invoiceNumber` (text, unique per tenant).

### 3.5 Portal Invoice View

Clients see:
- Invoice details (description, amount, due date, status)
- "Pay with Card" button (if Stripe enabled → opens Checkout Session URL)
- "Bank Transfer Details" section (account name, sort code, account number, reference — from tenant org settings)

---

## 4. Portal Dashboard

### 4.1 Layout & Priority Stack

Dashboard sections in order of priority:

1. **Project Progress** (top) — overall progress bar (completed deliverables / total) + milestone cards showing status, deliverable count per milestone
2. **Needs Your Attention** — pending approval requests and overdue/upcoming invoices, sorted by urgency (overdue > pending > upcoming), each with direct action button
3. **Financials** — three summary cards: Total Value, Paid (amount + %), Outstanding (amount + overdue count)
4. **Recent Activity** — chronological feed of state changes (deliverables shared, milestones completed, invoices paid, etc.)

### 4.2 Sidebar Navigation

- Engagement switcher dropdown (existing)
- Dashboard
- Milestones
- Deliverables
- Invoices
- Documents (Wave C)
- Messages (Wave C — filtered engagement-level comments)

### 4.3 Engagement Header

Shows: engagement title, start date, current phase ("Phase 2 of 4"), status badge (ACTIVE/PAUSED/COMPLETED).

---

## 5. Proposal Versioning

### 5.1 Revision Chain

`proposals.version` (integer) + `proposals.revisionOf` (FK → proposals.id) creates a linked list of versions.

### 5.2 Creating a New Version

1. Admin clicks "Create Revision"
2. System deep-copies: proposal row (version + 1, revisionOf = previous.id), all proposal_sections, all proposal_items, all payment_rules
3. New proposal status = DRAFT
4. Admin edits sections/items/rules
5. Admin sends → previous.status = SUPERSEDED, new.status = SENT

Each version is a complete immutable snapshot — no shared references between versions.

### 5.3 Client Portal View

Version history list showing all versions with status and dates. Each version viewable as standalone document. No diff view — clients don't need line-by-line comparison. Current (approved) version highlighted.

---

## 6. Engagement Templates

### 6.1 Template Structure

Templates use separate tables (`template_sections`, `template_items`, `template_payment_rules`) that mirror the proposal structure.

### 6.2 Creating from Template

1. Admin creates engagement, optionally selects template
2. System copies template structure into a new proposal (v1, DRAFT): template_sections → proposal_sections, template_items → proposal_items, template_payment_rules → payment_rules
3. `proposal.templateId` set for tracking
4. Admin customizes for this client (adjust scope, amounts, dates, add/remove items)

Template is a starting point, not a constraint. Once copied, the proposal is fully independent.

### 6.3 Save as Template

Any existing proposal can be reverse-copied into a new template. This lets you productise organically from real engagements.

### 6.4 Template Management

Admin page listing templates with: name, type, phase count, base price. Actions: Use (create engagement from template), Edit, Deactivate. "Create Template" for building from scratch.

---

## 7. Client-Side Actions (Wave C)

### 7.1 Comments / Threads

Scoped to engagement, milestone, or deliverable via nullable FKs. One level of threading via `parentId` self-FK. Both admin and client can comment. Email notifications on new comments via Inngest events.

The sidebar "Messages" nav item filters to engagement-level comments (no milestoneId/deliverableId set).

### 7.2 Document Uploads

S3-compatible storage (R2/S3). Clients upload via pre-signed URLs (never touches app server). Downloads via expiring pre-signed URLs (1 hour). Categories: BRIEF, ASSET, REFERENCE, OTHER. Scoped to engagement or milestone.

### 7.3 Change Requests

Client-initiated requests for scope changes. Scoped to a deliverable or milestone. Admin can accept (with optional impact note), decline (with response), or escalate to a proposal revision. Change requests don't auto-modify scope — they're a formal communication channel.

---

## 8. Inngest Events

### 8.1 New Events

- `portal/engagement:activated` — engagement status → ACTIVE
- `portal/invoices:generated` — batch invoice creation (materialization or recurring)
- `portal/invoice:reminder` — upcoming/overdue reminder (data includes type: upcoming | overdue_7d | overdue_14d | overdue_30d)
- `portal/invoice:overdue` — invoice transitioned to OVERDUE
- `portal/milestone:completed` — milestone marked complete
- `portal/change-request:created` — client submitted change request
- `portal/change-request:accepted` — admin accepted change request
- `portal/change-request:declined` — admin declined change request
- `portal/comment:created` — new comment posted
- `portal/document:uploaded` — new document uploaded

### 8.2 New Cron Jobs

- `portal/daily-invoice-check` — daily at 9am: generate recurring invoices, detect overdue, send reminders

### 8.3 Existing Events (unchanged)

- `portal/proposal:sent`, `portal/proposal:approved`
- `portal/deliverable:shared`, `portal/approval:requested`
- `portal/invoice:sent`, `portal/invoice:paid`

---

## 9. API Changes

### 9.1 New Admin Procedures

- `createProposalSection`, `updateProposalSection`, `deleteProposalSection`
- `createProposalItem`, `updateProposalItem`, `deleteProposalItem`
- `createPaymentRule`, `updatePaymentRule`, `deletePaymentRule`
- `createProposalRevision` — deep copy current proposal into new version
- `voidInvoice` — set invoice status to VOID
- `listTemplates`, `createTemplate`, `updateTemplate`, `deactivateTemplate`
- `createFromTemplate` — create engagement + proposal from template
- `saveAsTemplate` — copy proposal structure into new template
- `respondToChangeRequest` — accept or decline

### 9.2 New Portal Procedures (authenticated client)

- `listComments`, `createComment` — scoped to engagement/milestone/deliverable
- `listDocuments`, `uploadDocument` (returns pre-signed URL), `downloadDocument` (returns pre-signed URL)
- `createChangeRequest`
- `getProposalVersions` — list all versions for current engagement

### 9.3 Modified Procedures

- `createProposal` — no longer accepts deliverables/paymentSchedule JSONB; creates empty proposal, admin adds sections/items/rules separately
- `approveProposal` — now triggers materialization engine
- `updateMilestone` — when status → COMPLETED, triggers milestone-triggered invoice generation
- `sendInvoice` — now creates Stripe Checkout Session if Stripe enabled
- `getDashboard` — enhanced with progress data, financial summary, action items

### 9.4 Webhook Endpoint

- `POST /api/webhooks/stripe` — handles `checkout.session.completed` events

---

## 10. Migration Strategy

### 10.1 Schema Migration

Single Drizzle migration that:
1. Adds new tables (proposal_sections, proposal_items, payment_rules, and Wave B/C tables)
2. Adds new columns to existing tables (engagements, proposals, deliverables, portal_invoices, engagement_milestones, organizationSettings)
3. Adds new enum values (HYBRID, PAUSED, VOID)

### 10.2 Data Migration

For existing proposals with JSONB data:
1. For each proposal with non-null `deliverables` JSONB: create a single proposal_section (type: AD_HOC) and proposal_items from the array
2. For each proposal with non-null `paymentSchedule` JSONB: create payment_rules (trigger: FIXED_DATE or ON_APPROVAL based on dueType)
3. Compute and verify: sum of payment_rules amounts should equal old `price` column
4. After verification: drop old JSONB columns

This is a one-time migration script, not a rolling migration. Run during a maintenance window.

---

## 11. What's NOT In Scope

- **Meeting scheduler** — use Cal.com/Calendly link in sidebar instead
- **Proposal diff view** — clients view each version standalone, no line-by-line diff
- **Real-time updates** — polling or manual refresh, no WebSockets
- **Multi-currency** — GBP only for now (amount stored in pence)
- **Stripe Connect** — direct Stripe integration only, no marketplace/platform model
- **PDF export** — proposals and invoices are web-only for now
