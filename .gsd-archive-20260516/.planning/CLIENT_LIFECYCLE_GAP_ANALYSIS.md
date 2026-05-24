# Client Lifecycle Gap Analysis

> **Date**: 2026-04-27
> **Author**: Strategic Product Analysis
> **Scope**: Full client lifecycle coverage for an AI consulting practice managing 10-50 concurrent clients

---

## 1. The Ideal Client Lifecycle (10 Stages)

```
1. LEAD CAPTURE        ──► First touch: inbound form, referral, cold outreach
2. QUALIFICATION        ──► Assess fit, budget, timeline, urgency
3. PROPOSAL             ──► Scope, price, deliverables, ROI projection
4. CONTRACT/SOW         ──► Legal agreement, e-signature, terms
5. ONBOARDING           ──► Welcome sequence, access provisioning, kick-off
6. PROJECT DELIVERY     ──► Tasks, milestones, time tracking, resource allocation
7. MILESTONE REVIEWS    ──► Client approval, deliverable acceptance, feedback loops
8. INVOICING/COLLECTIONS──► Billing, payment processing, overdue chasing
9. MAINTENANCE/RETAINER ──► Ongoing support, hours banks, SLA monitoring
10. OFFBOARDING/RENEWAL ──► Knowledge transfer, data export, contract renewal
```

Each stage should flow into the next with automated triggers, no manual hand-off required.

---

## 2. Gap Analysis Per Stage

### Stage 1: Lead Capture

**What's Built:**
- Outreach module with multi-channel sequences (email, LinkedIn, call)
- A/B testing on sequences with variant tracking
- Sentiment analysis and reply categorization (INTERESTED, NOT_NOW, NOT_INTERESTED, WRONG_PERSON, AUTO_REPLY)
- Contact enrollment with step-by-step progression
- Daily dashboard showing due/overdue outreach actions
- Pipeline module with customizable stages, deal values, and stage history tracking
- Customer module with full CRUD, tags, referral source tracking
- Forms module with public submission and 8 field types
- AI paste-to-pipeline feature for quick lead import

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Web lead capture form builder | **High** | Forms module exists but lacks embeddable widget generation. Need: JavaScript embed snippet, iframe option, hosted landing page URLs. The form templates are there — missing the distribution mechanism to put them on external websites. |
| Lead source attribution | **Medium** | `referralSource` is a free-text string on customer. Need structured tracking: UTM parameters, referring URL, campaign ID. Should auto-populate when lead comes in via form, outreach conversion, or API. |
| Lead scoring model | **Medium** | Analytics has churn risk scoring (RFM model) but nothing for inbound lead quality. Need: scoring rules engine (company size, budget range, industry fit, engagement signals) that produces a 0-100 score and auto-assigns pipeline stage. |
| Inbound email parsing | **Low** | No way to auto-create leads from incoming emails. Would require email forwarding integration (e.g., Cloudflare Email Workers or SendGrid Inbound Parse) to create customer + pipeline entry from a received inquiry. |
| Social media lead capture | **Low** | LinkedIn connection/message tracking is defined in outreach channels but has no automation. Manual-only for now, which is fine for a solo consultant. |

**Specific Features Needed:**
- `FormDistribution` system: given a form template ID, generate a public URL (`/f/{slug}`), an embed `<script>` tag, and an iframe snippet. On submission, auto-create customer record, enroll in pipeline at first stage, trigger `lead/captured` workflow event.
- `LeadSource` structured type: `{ channel: 'FORM' | 'OUTREACH' | 'REFERRAL' | 'INBOUND_EMAIL' | 'API' | 'MANUAL', campaignId?: string, utmSource?: string, utmMedium?: string, utmCampaign?: string, referrerUrl?: string }` — stored as JSONB on customer or a dedicated `leadSources` table.

---

### Stage 2: Qualification

**What's Built:**
- Pipeline module with configurable stages and deal values
- Stage transitions with history, notes, and `changedById` tracking
- Customer tags for segmentation
- AI chat assistant with full tool access to query customer/booking/pipeline data
- Outreach reply categorization (INTERESTED/NOT_NOW/NOT_INTERESTED)
- Customer notes (GENERAL, MEDICAL, PREFERENCE, COMPLAINT, FOLLOWUP)

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Discovery call scheduling | **High** | Booking module is built for service appointments, not sales calls. Need a "meeting type" concept (discovery, demo, strategy session) that doesn't require a service/staff/venue. Should generate a booking link the prospect can self-schedule from. Existing slots system assumes capacity/staff assignment for service delivery. |
| Qualification framework | **Medium** | No structured qualification criteria (BANT, MEDDIC, or custom). Need: a qualification template with scored fields (budget range, authority level, need urgency, timeline) that attaches to pipeline members. Score auto-calculates and can trigger stage advancement. |
| Meeting notes & recordings | **Medium** | No structured meeting capture. Customer notes exist but lack meeting-specific context (date, attendees, action items, next steps). Need a `meetingNotes` entity linked to customer + optional booking with structured fields: attendees, agenda items, action items with assignees and due dates, follow-up date. |
| Competitor tracking | **Low** | No way to track which competitors a prospect is evaluating. Simple JSONB field on pipeline member would suffice. |

**Specific Features Needed:**
- `MeetingType` config: `{ id, tenantId, name, slug, durationMinutes, description, isPublic, bookingUrl }`. Separate from services — no pricing, no staff assignment required. Self-scheduling via public URL with calendar availability check.
- `QualificationTemplate`: `{ id, tenantId, name, fields: [{ key, label, type: 'SCORE' | 'SELECT' | 'TEXT', options?, weight }] }`. Applied to pipeline members. Total weighted score displayed on deal card.
- `MeetingNote`: `{ id, tenantId, customerId, bookingId?, date, attendees: string[], agendaItems: string[], notes: string, actionItems: [{ task, assigneeId?, dueDate?, completed }], followUpDate? }`.

---

### Stage 3: Proposal

**What's Built (Comprehensive):**
- Full proposal system: sections (PHASE, RECURRING, AD_HOC), line items with acceptance criteria
- Problem statement, exclusions, requirements lists
- ROI calculator (hours/week, automation %, hourly rate, additional value)
- Payment schedule with multiple trigger types (MILESTONE_COMPLETE, RECURRING, RELATIVE_DATE, FIXED_DATE, ON_APPROVAL)
- Token-based client viewing and approval/decline
- Proposal versioning with `revisionOf` tracking
- Payment rules with auto-send capability and recurring intervals (MONTHLY, QUARTERLY)
- Proposal status machine: DRAFT -> SENT -> APPROVED/DECLINED/SUPERSEDED

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Proposal templates/cloning | **Medium** | No way to save a proposal as a reusable template or clone an existing one. For a consultant doing similar AI implementation work, 80% of proposal content repeats. Need: `proposalTemplates` table, clone-from-template service method, variable substitution for client-specific fields. |
| Proposal analytics | **Low** | No tracking of when client views proposal, how long they spend on each section, whether they've opened it multiple times. Token access is logged in audit but not surfaced as engagement metrics. |
| Collaborative editing | **Low** | No commenting or suggestion system on proposals. Fine for solo consultant, but useful if a client wants to negotiate terms inline. |
| PDF export | **Medium** | No way to generate a PDF of the proposal for offline sharing or archival. Need: server-side PDF generation (React Email components or Puppeteer) triggered from admin UI. |

**Specific Features Needed:**
- `ProposalTemplate`: `{ id, tenantId, name, category: string, sections: ProposalSectionTemplate[], defaultTerms, defaultExclusions, defaultRequirements, roiDefaults }`. `cloneProposal(templateId, engagementId)` service method that deep-copies sections, items, and payment rules.
- PDF generation endpoint: `GET /api/proposals/{id}/pdf` using existing proposal data + branded template.

---

### Stage 4: Contract / SOW

**What's Built:**
- Proposals serve as lightweight SOWs with scope, deliverables, exclusions, requirements, terms, and payment schedule
- Approval workflow with token-based client sign-off
- `approvedAt` timestamp serves as implicit contract acceptance date

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Document management system | **Critical** | No document storage, versioning, or management at all. Contracts, NDAs, SOWs, MSAs need a home. Need: `documents` table with `{ id, tenantId, engagementId?, customerId?, type: 'CONTRACT' | 'NDA' | 'SOW' | 'MSA' | 'AMENDMENT' | 'OTHER', title, fileUrl, fileSize, mimeType, version, status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'VOID', signedAt?, expiresAt?, tags }`. File storage via S3/R2 with presigned URLs. |
| E-signature integration | **Critical** | Proposal approval is a click-to-approve, not a legally binding e-signature. For contracts, need DocuSign or equivalent integration. Minimum viable: build on existing integration hub pattern — `docusign.provider.ts` implementing `IntegrationProvider`. Send document, track status via webhook, store signed copy. |
| Contract terms tracking | **High** | No structured storage of contract terms (start date, end date, auto-renewal, notice period, governing law, liability caps). Need: `contractTerms` JSONB or dedicated columns on engagement or a `contracts` table: `{ engagementId, startDate, endDate, autoRenew, renewalNoticeDays, paymentTermsDays, governingLaw, liabilityCap, terminationNoticeDays, specialTerms: string[] }`. |
| Amendment management | **Medium** | No way to track changes to an existing contract. Proposal versioning exists (`revisionOf`) but there's no formal change order / amendment flow. Need: `amendments` table linked to engagement with scope change description, price impact, both-party approval. |
| Template library | **Medium** | No contract templates. A consultant needs: standard MSA, project SOW template, NDA template, data processing agreement. Need a template system (could extend document management) with variable substitution for client name, dates, scope. |

**Specific Features Needed:**
- **Documents module**: Full file lifecycle management.
  - Schema: `documents` table — `id, tenantId, engagementId?, customerId?, type (enum), title, description, fileKey (S3/R2 key), fileUrl (presigned, generated on read), fileName, fileSize, mimeType, version, parentDocumentId? (for versions), status, uploadedById, signedAt, expiresAt, metadata (JSONB), createdAt, updatedAt`.
  - Repository: CRUD, list by engagement/customer, version history.
  - Service: upload (presigned URL generation), download, version increment, status transitions.
  - Router: admin procedures for upload/list/get, portal procedure for client to download their documents.
  - Storage: Cloudflare R2 (S3-compatible) with presigned PUT for upload, presigned GET for download, 1-hour expiry.
- **Contract terms**: Add `contractTerms` JSONB column to `engagements` table or create dedicated `contracts` table.
- **DocuSign integration provider**: Follows existing `IntegrationProvider` pattern. Methods: `sendForSignature(documentId)`, `onWebhook(envelopeCompleted)`, status sync.

---

### Stage 5: Onboarding

**What's Built:**
- Team module has checklist templates (ONBOARDING/OFFBOARDING type) with item-level progress tracking — but these are for **staff** onboarding, not client onboarding
- Workflow automation can trigger email sequences on events
- Forms module can send intake forms with timing controls (IMMEDIATE, BEFORE_APPOINTMENT, AFTER_APPOINTMENT)
- Notification module handles email (Resend) and SMS (Twilio) delivery with templates
- Client portal with token-based access, session management, dashboard

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Client onboarding workflow template | **Critical** | No structured onboarding process for new clients. Need a client-facing checklist system (separate from staff checklists). Steps: sign contract, complete intake form, share access credentials, schedule kick-off, review project plan. Each step has an owner (consultant or client), due date (relative to engagement start), status, and can trigger automation when completed. |
| Welcome sequence automation | **High** | Workflow engine can send emails on triggers, but there's no pre-built "onboarding sequence" template. Need: a first-class onboarding workflow template that fires on `engagement/activated` (when proposal is approved). Steps: welcome email (day 0), intake form (day 0), access provisioning (day 1), kick-off scheduling link (day 2), project plan share (day 3). |
| Access provisioning | **Medium** | Client portal sessions exist but there's no automated flow to create portal access when an engagement starts. Currently manual. Need: auto-create `portalSession` on engagement activation, send magic link, track whether client has logged in. |
| Kick-off meeting scheduling | **Medium** | No meeting scheduling linked to onboarding. Booking module is service-oriented. Need the `MeetingType` system from Stage 2 — "kick-off call" type with auto-schedule on engagement activation. |
| Client-facing project timeline | **Medium** | Milestones exist but clients only see them in portal dashboard as a flat list. Need a visual timeline view showing milestone sequence, dates, dependencies, and current position. |

**Specific Features Needed:**
- **Client onboarding module** (or extend client-portal):
  - `OnboardingTemplate`: `{ id, tenantId, name, steps: OnboardingStep[] }` where `OnboardingStep = { key, title, description, owner: 'CONSULTANT' | 'CLIENT', relativeDueDays: number, automationTrigger?: string, formTemplateId?, isRequired }`.
  - `OnboardingProgress`: `{ id, engagementId, templateId, startedAt, completedAt, steps: [{ key, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED', completedAt?, completedBy? }] }`.
  - Auto-created when engagement moves to ACTIVE status.
  - Each step completion can trigger a workflow event (`onboarding/step-completed`) enabling chained automation.
  - Visible in client portal as a progress checklist.
- **Engagement activation automation**: Inngest function on `engagement/activated` that: (1) creates onboarding progress, (2) provisions portal access, (3) sends welcome email, (4) sends intake form.

---

### Stage 6: Project Delivery

**What's Built:**
- Engagements with type (PROJECT, RETAINER, HYBRID) and status lifecycle
- Milestones with status (UPCOMING, IN_PROGRESS, COMPLETED), sort order, due dates
- Deliverables with status (PENDING, DELIVERED, ACCEPTED, CANCELLED), file attachment (single file: URL, name, size)
- Workflow task creation action (`CREATE_TASK` node with title, description, assignee, priority, due date offset)
- Team module with departments, skills, certifications, pay rates, capacity tracking
- Scheduling module with smart assignment (ROUND_ROBIN, LEAST_LOADED, SKILL_MATCH, GEOGRAPHIC, PREFERRED)
- AI ghost operator that can auto-execute routine actions

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Task management system | **Critical** | `CREATE_TASK` exists as a workflow action type but there is no `tasks` table, no task CRUD, no task list/board view. The workflow can create a task that goes nowhere. Need: full task entity — `{ id, tenantId, engagementId?, milestoneId?, title, description, assigneeId, status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE', priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', dueDate, estimatedHours?, actualHours?, tags, parentTaskId?, sortOrder, createdById, completedAt }`. |
| Kanban board view | **High** | No board-style task visualization. Need a board view showing tasks grouped by status columns, with drag-and-drop reordering. Data structure already natural for this — tasks with status field, filterable by engagement/milestone/assignee. |
| Time tracking | **Critical** | No time tracking anywhere in the system. For a consultant billing by the hour or tracking project profitability, this is essential. Need: `timeEntries` table — `{ id, tenantId, userId, engagementId?, taskId?, date, startTime?, endTime?, durationMinutes, description, isBillable, hourlyRate?, invoiceId?, createdAt }`. Must support: start/stop timer, manual entry, weekly timesheet view, billable vs non-billable, and roll-up to invoice. |
| Project timeline / Gantt | **Medium** | Milestones have due dates and sort order but no dependency tracking or visual timeline. Need: `dependencies` on milestones/tasks (finish-to-start, start-to-start) and a Gantt-style rendering. For a solo consultant, a simple linear timeline with date bars may suffice — full Gantt is over-engineering. |
| Resource allocation view | **Medium** | Scheduling module has capacity tracking and smart assignment but it's booking-centric (service appointments). Need a project-level view: which staff are allocated to which engagements, what % of their time, for what date range. `resourceAllocations` table — `{ id, tenantId, userId, engagementId, allocationPercent, startDate, endDate, role }`. |
| File management per deliverable | **High** | Deliverables have a single file attachment (fileUrl, fileName, fileSize). Real deliverables often have multiple files, revisions, client feedback on each version. Ties into the Document Management system from Stage 4 — deliverables should link to documents, not store a single URL. |
| Progress reporting | **Medium** | No way to generate a project status report showing: milestones completed/remaining, tasks by status, hours logged vs estimated, budget consumed, risk items. Need a report generation service that compiles this data and optionally sends to client. |

**Specific Features Needed:**
- **Tasks module**: Full task lifecycle.
  - Schema: `tasks` table as described above. `taskComments` table for discussion: `{ id, taskId, authorId, content, createdAt }`. `taskAttachments` linking to documents table.
  - Repository: CRUD, list with filters (engagement, milestone, assignee, status, priority), board query (grouped by status), reorder within column.
  - Service: create, update status (with workflow event emission: `task/completed`), assign, add comment, log time against task.
  - Router: `permissionProcedure('task:read')` for list/get, `permissionProcedure('task:create')` for create, `permissionProcedure('task:update')` for status changes.
  - Portal: client can view tasks in their engagement (filtered), see status, but cannot modify.
- **Time tracking module**:
  - Schema: `timeEntries` table as described above.
  - Service: start timer (creates entry with startTime, no endTime), stop timer (sets endTime, calculates duration), manual entry, weekly summary, billable total per engagement, generate invoice line items from unbilled time.
  - Router: `tenantProcedure` for own entries, `permissionProcedure('time:manage')` for team view.
  - Integration: when creating invoice, pull unbilled time entries for engagement, auto-populate line items.

---

### Stage 7: Milestone Reviews

**What's Built (Good Coverage):**
- Approval requests with status (PENDING, APPROVED, REJECTED) and client comment
- Deliverables with acceptance workflow (PENDING -> DELIVERED -> ACCEPTED/CANCELLED)
- Client portal shows pending approvals on dashboard
- Portal procedures for client to respond to approvals and accept deliverables
- Milestone status tracking (UPCOMING -> IN_PROGRESS -> COMPLETED)
- Activity feed tracking proposal, milestone, deliverable, approval, and invoice events
- Review module with automated review requests, pre-screening, sentiment analysis

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Structured feedback collection | **Medium** | Approval responses are a simple approve/reject with a comment. For milestone reviews, need structured feedback: satisfaction rating (1-5), specific areas (communication, quality, timeliness), open comments, improvement suggestions. This is different from the review module (which targets post-booking reviews). |
| Revision workflow | **High** | When a deliverable is rejected, there's no formal revision cycle. Need: rejection creates a revision task, deliverable status goes to `REVISION_REQUESTED`, new version uploaded links back to original, re-submission triggers new approval request. Status flow: `DELIVERED -> REVISION_REQUESTED -> REDELIVERED -> ACCEPTED`. |
| Automated milestone reporting | **Medium** | No automatic report generation when a milestone completes. Need: on `milestone/completed` event, generate summary (deliverables delivered, time spent, budget consumed) and send to client via portal notification + email. |
| Change request tracking | **High** | No formal change request process. When scope changes mid-project, need: `changeRequests` table — `{ id, engagementId, title, description, requestedById, impactOnTimeline, impactOnBudget, additionalCost, status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED', approvedById, approvedAt }`. Links to amendment on contract. Client can submit via portal. |

**Specific Features Needed:**
- **Milestone feedback**: Extend `approvalRequests` or create `milestoneFeedback` table with structured rating fields. Auto-trigger on milestone completion.
- **Revision cycle**: Add `REVISION_REQUESTED` and `REDELIVERED` to `DeliverableStatus`. Add `revisionOf` field to deliverables for version chain. Service method: `requestRevision(deliverableId, feedback)` creates task and resets deliverable status.
- **Change requests module**: Lightweight module or sub-entity of client-portal. Table as described. Portal procedure for client submission. Admin procedure for review/approval. On approval, optionally auto-create amendment to contract terms and adjust milestone dates/budget.

---

### Stage 8: Invoicing & Collections

**What's Built (Comprehensive):**
- Invoice state machine: DRAFT -> SENT -> VIEWED -> PARTIALLY_PAID -> PAID (also OVERDUE, VOID, REFUNDED)
- Partial payments with multiple methods (CARD, BANK_TRANSFER, DIRECT_DEBIT, CASH)
- Stripe Connect for payment processing with charge and payout management
- GoCardless integration field (payment ID stored)
- Pricing rules engine with condition groups, modifiers (fixed price, discounts, surcharges), service/staff targeting, date ranges, usage limits
- Tax rules with country, reverse charge, service/product/all scope
- Discount codes (via pricing rules with conditions)
- Portal invoices with Stripe payment links, payment references
- Payment rules on proposals with auto-send and recurring triggers (MONTHLY, QUARTERLY)
- Notification templates for PAYMENT_RECEIVED and INVOICE_SENT
- Xero integration provider in integrations hub

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Automated overdue chasing | **High** | No automated follow-up when invoices become overdue. Need: workflow trigger `invoice/overdue` (Inngest cron checking due dates), configurable chase sequence (reminder at +1 day, +7 days, +14 days, +30 days), escalation (final notice, engagement pause). Payment rules have auto-send but no auto-chase. |
| Credit notes | **Medium** | Refund exists as a concept (REFUNDED status, RefundInput) but no formal credit note generation. Need: `creditNotes` table linked to invoice, reason, amount, status. Important for accounting accuracy and Xero sync. |
| Recurring invoice automation | **Medium** | Payment rules define RECURRING triggers with MONTHLY/QUARTERLY interval, but the actual generation of recurring invoices from these rules isn't clear. Need: Inngest cron function that checks active payment rules with recurring trigger, generates next invoice when period arrives, auto-sends if `autoSend` is true. |
| Revenue recognition | **Low** | No concept of earned vs unearned revenue. For a consultant with milestone-based billing, knowing how much revenue is "earned" (milestones completed) vs "billed" (invoices sent) vs "collected" (payments received) matters for forecasting. |
| Expense tracking | **Medium** | No expense management. A consultant has costs (software subscriptions, travel, subcontractors) that reduce project profitability. Need: `expenses` table — `{ id, tenantId, engagementId?, category, description, amount, date, receipt (document link), isBillable, invoiceId?, status }`. |
| Profitability reporting | **High** | Analytics has revenue metrics but no profit view. Need: revenue - (time cost at hourly rate + expenses) per engagement. Requires time tracking + expense tracking to be meaningful. |

**Specific Features Needed:**
- **Overdue chasing**: Add `invoice/overdue` event to Inngest. Cron function runs daily, finds invoices past due date with status SENT or PARTIALLY_PAID, emits event. Workflow template: "Invoice Chase Sequence" with configurable delays and escalation.
- **Recurring invoices**: Inngest cron function `recurring-invoice-generator` runs monthly. Queries active engagements with recurring payment rules. Generates next invoice if one hasn't been created for current period. Auto-sends if configured.
- **Expenses**: Lightweight table and CRUD. Category enum: `TRAVEL | SOFTWARE | SUBCONTRACTOR | EQUIPMENT | OFFICE | OTHER`. Link to documents for receipt storage. Billable flag to include on client invoice.

---

### Stage 9: Maintenance / Retainer

**What's Built:**
- Engagement type includes RETAINER and HYBRID
- Proposal sections support RECURRING type with estimated duration
- Payment rules support recurring billing (MONTHLY/QUARTERLY)
- Booking module handles ongoing appointments
- Scheduling with waitlist, capacity management, recurring slots

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Retainer hours bank | **Critical** | No concept of pre-paid hours. This is essential for retainer clients. Need: `retainerBanks` table — `{ id, tenantId, engagementId, monthlyHours, rolloverPolicy: 'NONE' | 'UNLIMITED' | 'CAPPED', rolloverCapHours?, currentBalance, periodStart, periodEnd }`. Monthly cron resets/rolls over balance. Time entries deduct from bank. Alert when usage exceeds 80%/100%. |
| SLA tracking | **High** | No SLA definition or monitoring. Need: `slaDefinitions` on engagement — `{ responseTimeHours, resolutionTimeHours, availabilityPercent, uptimeTarget?, supportChannels, businessHoursOnly }`. Track actual performance against targets. Dashboard showing SLA compliance per client. |
| Support ticket system | **High** | No way for retainer clients to submit support requests. The forms module could be adapted but lacks: priority levels, assignment, status tracking, SLA timer, escalation. Need either a lightweight ticket system or integrate with existing task system: client submits via portal form, auto-creates task with priority, starts SLA clock. |
| Usage reports | **High** | No client-facing report showing: hours used this period, hours remaining, activity log, breakdown by category. Need: monthly usage report auto-generated and shared to portal + emailed. |
| Retainer renewal automation | **Medium** | No automated renewal flow. Need: Inngest cron checking engagements approaching end date. Trigger: send renewal proposal, or auto-renew if contract terms allow. Notification to consultant X days before expiry. |
| Client health scoring | **Medium** | Analytics has churn risk (RFM model) but it's booking-frequency based — irrelevant for retainer clients. Need engagement-level health score based on: response time trends, support ticket volume, satisfaction ratings from milestone feedback, hours usage pattern (too low = disengaged, too high = scope creep), payment timeliness. |

**Specific Features Needed:**
- **Retainer module** (or extend client-portal):
  - Schema: `retainerBanks` as described. `retainerUsage` as a view over time entries filtered by engagement + period.
  - Service: `checkBalance(engagementId)`, `deductHours(engagementId, hours)` (called when time entry is created), `rolloverPeriod(engagementId)` (cron job), `getUsageReport(engagementId, period)`.
  - Router: admin view of all retainer balances. Portal procedure for client to see their balance + usage.
  - Alerts: workflow events — `retainer/threshold-reached` (80%), `retainer/exhausted` (100%), `retainer/period-ending` (7 days before).
- **Client health score**: Composite score calculated daily by Inngest cron. Inputs: days since last interaction, support ticket trend (increasing = bad), satisfaction trend, payment timeliness, hours utilization ratio. Output: 0-100 score with label (HEALTHY, AT_RISK, CRITICAL). Stored on engagement or customer. Surfaced in pipeline view and morning briefing.

---

### Stage 10: Offboarding / Renewal

**What's Built:**
- Customer anonymisation (GDPR compliance)
- Customer merge with 7-table cascade
- Audit logging of all actions
- Engagement status includes COMPLETED and CANCELLED

**What's Missing:**

| Gap | Priority | Details |
|-----|----------|---------|
| Offboarding checklist | **High** | No structured offboarding process. Need: checklist template (like onboarding) for client departures. Steps: final deliverable handoff, knowledge transfer session, access revocation, data export, feedback collection, case study permission, referral request. |
| Data export | **High** | No way for a client (or consultant) to export all engagement data: documents, deliverables, time logs, communications, invoices. Need: export service that compiles engagement data into a ZIP (JSON + files), generates download link, notifies client. GDPR data portability requirement. |
| Knowledge transfer documentation | **Medium** | No structured way to create handoff documentation. Need: template system for "project handoff document" that auto-populates with: all deliverables, access credentials given, systems configured, maintenance procedures, known issues. |
| Post-engagement feedback | **Medium** | Review module targets booking-level feedback. Need engagement-level feedback: NPS score, project satisfaction survey, testimonial request. Different from per-booking reviews — this covers the entire relationship. |
| Contract renewal workflow | **High** | No automated renewal flow. Need: X days before engagement end date, trigger renewal sequence. Options: auto-generate renewal proposal (clone current with updated dates/price), send renewal reminder, schedule renewal discussion call. If no action by end date, auto-transition to COMPLETED with offboarding trigger. |
| Win/loss analysis | **Low** | No structured analysis of why engagements end. Pipeline has `lostReason` for deals, but completed engagements lack an outcome assessment: was it successful, would client refer, what went well/poorly. |
| Case study generation | **Low** | AI module could auto-generate case study from engagement data (problem statement from proposal, deliverables completed, ROI data, client testimonial). Low priority but high value for sales — each completed engagement becomes marketing material. |

**Specific Features Needed:**
- **Offboarding template**: Reuse onboarding checklist pattern but with `type: 'OFFBOARDING'` and client-exit-specific steps.
- **Data export service**: `exportEngagementData(engagementId)` — queries all related tables (proposals, milestones, deliverables, invoices, payments, time entries, documents, notes, approval history), packages into JSON + files ZIP, uploads to R2, returns presigned download URL valid 24 hours.
- **Renewal automation**: Inngest cron runs daily, checks engagements where `endDate - today <= renewalNoticeDays` (from contract terms). Emits `engagement/renewal-due` event. Workflow template: send renewal proposal, wait for response, escalate if no response after X days.

---

## 3. Missing Modules / Systems (Detailed Specifications)

### 3.1 Document Management Module (Critical)

**Why**: Documents are the backbone of consulting. Every engagement produces contracts, SOWs, deliverables, reports. Currently the only file storage is a single `fileUrl` on deliverables.

**Schema:**
```
documents
  id            UUID PK
  tenantId      UUID FK
  engagementId  UUID FK nullable
  customerId    UUID FK nullable
  taskId        UUID FK nullable
  type          ENUM('CONTRACT','NDA','SOW','MSA','AMENDMENT','DELIVERABLE','REPORT','INVOICE','RECEIPT','OTHER')
  title         TEXT NOT NULL
  description   TEXT nullable
  fileKey       TEXT NOT NULL        -- S3/R2 object key
  fileName      TEXT NOT NULL
  fileSize      BIGINT NOT NULL
  mimeType      TEXT NOT NULL
  version       INT DEFAULT 1
  parentId      UUID FK nullable    -- previous version
  status        ENUM('DRAFT','FINAL','PENDING_SIGNATURE','SIGNED','EXPIRED','ARCHIVED')
  uploadedById  UUID FK
  signedAt      TIMESTAMPTZ nullable
  expiresAt     TIMESTAMPTZ nullable
  metadata      JSONB DEFAULT '{}'
  createdAt     TIMESTAMPTZ
  updatedAt     TIMESTAMPTZ
```

**Key Operations:**
- Upload: generate presigned PUT URL, client uploads directly to R2, webhook confirms
- Download: generate presigned GET URL (1-hour expiry)
- Version: create new document row with `parentId` pointing to previous version, increment `version`
- Portal access: clients see documents for their engagement, type-filtered (no internal docs)
- Search: full-text search on title + description
- Bulk download: ZIP multiple documents for export

**Integration Points:**
- Deliverables link to documents instead of storing `fileUrl` directly
- E-signature providers update document status via webhook
- Time entry receipts link to documents
- Client portal shows documents tab per engagement

---

### 3.2 Task Management Module (Critical)

**Why**: The workflow engine can `CREATE_TASK` but tasks have nowhere to land. Project delivery is impossible to track without tasks.

**Schema:**
```
tasks
  id              UUID PK
  tenantId        UUID FK
  engagementId    UUID FK nullable
  milestoneId     UUID FK nullable
  parentTaskId    UUID FK nullable   -- subtasks
  title           TEXT NOT NULL
  description     TEXT nullable
  assigneeId      UUID FK nullable
  reporterId      UUID FK
  status          ENUM('TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED')
  priority        ENUM('LOW','MEDIUM','HIGH','URGENT')
  dueDate         DATE nullable
  estimatedHours  DECIMAL nullable
  actualHours     DECIMAL nullable   -- rolled up from time entries
  tags            TEXT[] DEFAULT '{}'
  sortOrder       INT DEFAULT 0
  completedAt     TIMESTAMPTZ nullable
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

taskComments
  id          UUID PK
  taskId      UUID FK
  authorId    UUID FK
  content     TEXT NOT NULL
  createdAt   TIMESTAMPTZ

taskWatchers
  taskId  UUID FK
  userId  UUID FK
  PRIMARY KEY (taskId, userId)
```

**Views:**
- **List view**: Filterable table — engagement, milestone, assignee, status, priority, due date range
- **Board view**: Kanban columns by status (TODO | IN_PROGRESS | IN_REVIEW | DONE). Drag to change status. Filter by engagement/assignee.
- **My tasks**: Personal view of tasks assigned to current user, sorted by due date
- **Engagement tasks**: All tasks for an engagement, grouped by milestone
- **Portal tasks**: Client sees read-only task list for their engagement (filtered to non-internal tasks)

**Workflow Integration:**
- `CREATE_TASK` workflow action actually creates a row in tasks table
- `task/created`, `task/completed`, `task/overdue` events for workflow triggers
- Template tasks: when milestone is created from proposal section, auto-create tasks from proposal items

---

### 3.3 Time & Expense Tracking Module (Critical)

**Why**: A consultant needs to know project profitability, bill accurately, and track utilization. No time tracking = no way to know if an engagement is profitable.

**Schema:**
```
timeEntries
  id              UUID PK
  tenantId        UUID FK
  userId          UUID FK
  engagementId    UUID FK nullable
  taskId          UUID FK nullable
  date            DATE NOT NULL
  startTime       TIMESTAMPTZ nullable   -- for timer mode
  endTime         TIMESTAMPTZ nullable
  durationMinutes INT NOT NULL
  description     TEXT nullable
  isBillable      BOOLEAN DEFAULT true
  hourlyRate      INT nullable           -- rate in pence at time of entry
  invoiceId       UUID FK nullable       -- null until invoiced
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ

expenses
  id              UUID PK
  tenantId        UUID FK
  engagementId    UUID FK nullable
  category        ENUM('TRAVEL','SOFTWARE','SUBCONTRACTOR','EQUIPMENT','OFFICE','MEALS','OTHER')
  description     TEXT NOT NULL
  amount          INT NOT NULL           -- in pence
  date            DATE NOT NULL
  receiptDocId    UUID FK nullable       -- links to documents table
  isBillable      BOOLEAN DEFAULT false
  invoiceId       UUID FK nullable
  status          ENUM('PENDING','APPROVED','REJECTED','INVOICED')
  submittedById   UUID FK
  approvedById    UUID FK nullable
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ
```

**Key Features:**
- **Timer mode**: Start button creates entry with `startTime`, stop button sets `endTime` and calculates `durationMinutes`. Only one active timer per user.
- **Manual entry**: Enter date, duration, description directly.
- **Weekly timesheet**: Grid view — rows are engagements/tasks, columns are days of week, cells are hours. Quick entry.
- **Billable tracking**: Each entry flagged as billable/non-billable. Rate pulled from engagement contract or user's default.
- **Invoice integration**: Select unbilled time entries for an engagement, auto-create invoice line items with descriptions and amounts.
- **Utilization report**: Hours logged / available hours per user per period. Target utilization configurable (e.g., 70% for a consultant).
- **Profitability view**: Per engagement — total revenue (invoiced) minus total cost (time at cost rate + expenses). Shows margin and margin %.

---

### 3.4 Communication Hub (High)

**Why**: Client communications are scattered — emails via Resend, SMS via Twilio, notes on customers, outreach activities. No single timeline of all touchpoints with a client.

**What It Needs:**
```
communicationLog
  id              UUID PK
  tenantId        UUID FK
  customerId      UUID FK
  engagementId    UUID FK nullable
  channel         ENUM('EMAIL','SMS','PHONE','MEETING','PORTAL','INTERNAL_NOTE')
  direction       ENUM('INBOUND','OUTBOUND','INTERNAL')
  subject         TEXT nullable
  summary         TEXT NOT NULL          -- plain text summary
  fullContent     TEXT nullable          -- full email body or meeting notes
  senderId        UUID FK nullable       -- staff member
  externalRef     TEXT nullable          -- Resend message ID, Twilio SID
  relatedEntityType  TEXT nullable       -- 'booking', 'invoice', 'proposal'
  relatedEntityId    UUID nullable
  occurredAt      TIMESTAMPTZ NOT NULL
  createdAt       TIMESTAMPTZ
```

**Key Features:**
- **Unified timeline**: Single chronological view of ALL interactions with a client — emails sent, SMS sent, phone calls logged, meetings held, portal activity, internal notes. Currently these are spread across `sentMessages`, `outreachActivities`, `customerNotes`, and `auditLogs`.
- **Auto-logging**: When notification module sends email/SMS, auto-create communication log entry. When outreach activity occurs, same. When portal session accessed, log it.
- **Manual logging**: Phone call summary, meeting notes entry with structured fields (attendees, duration, action items).
- **Search**: Full-text search across all communications for a client.
- **Email threading**: Group related emails (same subject/conversation thread) into threads for readability.

This doesn't require a new email system — it's an aggregation layer that pulls from existing modules and provides a unified view. A database view or materialized view over `sentMessages + outreachActivities + customerNotes + auditLogs` filtered by customer.

---

### 3.5 Client Health & Segmentation (Medium)

**Why**: With 10-50 clients, you need to quickly identify who needs attention, who's at risk, and who's thriving.

**What It Needs:**
```
clientHealthScores
  id              UUID PK
  tenantId        UUID FK
  customerId      UUID FK
  engagementId    UUID FK nullable
  score           INT NOT NULL           -- 0-100
  label           ENUM('CRITICAL','AT_RISK','NEEDS_ATTENTION','HEALTHY','CHAMPION')
  factors         JSONB NOT NULL         -- breakdown of score components
  calculatedAt    TIMESTAMPTZ NOT NULL

clientSegments
  id              UUID PK
  tenantId        UUID FK
  name            TEXT NOT NULL
  slug            TEXT NOT NULL
  criteria        JSONB NOT NULL         -- filter rules
  color           TEXT nullable
  sortOrder       INT DEFAULT 0
  isAutomatic     BOOLEAN DEFAULT true   -- auto-assign based on criteria
```

**Health Score Factors:**
- **Engagement level** (25%): Days since last interaction, response time to messages, portal login frequency
- **Satisfaction** (25%): Average milestone feedback rating, review scores, NPS
- **Financial health** (25%): Payment timeliness (avg days to pay), outstanding balance, invoice disputes
- **Project momentum** (25%): Tasks completing on time, milestone progress vs plan, hours utilization vs plan

**Segmentation Criteria:**
- Engagement type (PROJECT, RETAINER, HYBRID)
- Revenue tier (based on total contract value or annual spend)
- Industry/sector
- Health score range
- Service type
- Tenure (months as client)

**Output:**
- Morning briefing includes: "3 clients need attention" with reasons
- Pipeline view colored by health score
- Segment-filtered views for targeted outreach (e.g., "send renewal proposal to all healthy retainer clients expiring in 60 days")

---

### 3.6 Meeting Management (Medium)

**Why**: Consultants spend significant time in meetings. Meeting outcomes drive project decisions. Currently no way to track meetings outside of booking appointments.

**Schema:**
```
meetings
  id              UUID PK
  tenantId        UUID FK
  engagementId    UUID FK nullable
  customerId      UUID FK nullable
  type            ENUM('DISCOVERY','KICKOFF','STANDUP','REVIEW','STRATEGY','ADHOC')
  title           TEXT NOT NULL
  scheduledAt     TIMESTAMPTZ NOT NULL
  durationMinutes INT NOT NULL
  location        TEXT nullable           -- Zoom link, office address
  attendees       JSONB DEFAULT '[]'      -- [{ name, email, role }]
  agendaItems     JSONB DEFAULT '[]'      -- [{ title, duration?, notes? }]
  notes           TEXT nullable
  actionItems     JSONB DEFAULT '[]'      -- [{ task, assigneeId?, dueDate?, completed }]
  recordingUrl    TEXT nullable
  status          ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')
  createdAt       TIMESTAMPTZ
  updatedAt       TIMESTAMPTZ
```

**Key Features:**
- **Pre-meeting**: Auto-generate agenda from template (by meeting type). Send agenda to attendees. Pre-populate with open action items from last meeting.
- **During meeting**: Note-taking interface. Action item capture with assignee and due date.
- **Post-meeting**: Auto-create tasks from action items. Send meeting summary to attendees. Log as communication event. Schedule follow-up if needed.
- **Recurring meetings**: Weekly standups, monthly reviews — auto-create next occurrence when current one completes.
- **Calendar integration**: Create calendar event via existing calendar-sync module when meeting is scheduled.

---

### 3.7 Reporting Portal (Medium)

**Why**: Clients want visibility into their projects. Currently the portal shows milestones, deliverables, approvals, and invoices — but no aggregated reporting.

**What It Needs:**
- **Project status report**: Auto-generated summary showing milestone progress, deliverables status, upcoming deadlines, hours consumed (if retainer), budget status. Template-driven with branded header.
- **Financial summary**: Total invoiced, total paid, outstanding balance, payment history chart. Already partially built in `FinancialSummary` type.
- **Time usage report** (for retainer clients): Hours used this period, hours remaining, breakdown by category/task, trend chart showing usage over time.
- **Scheduled reports**: Weekly or monthly auto-send of status report to client email. Inngest cron + email template.
- **Executive summary**: AI-generated one-paragraph summary of project health for busy executives. Uses existing AI module capabilities.

This is primarily a frontend concern — the data exists or will exist once time tracking and task management are built. Need report-generation service that compiles data and renders as HTML email or PDF.

---

## 4. Integration Gaps

### Currently Integrated:
- **Stripe** (Connect for payments, checkout for subscriptions)
- **Google Calendar** (OAuth, event sync, webhook)
- **Resend** (transactional email)
- **Twilio** (SMS)
- **Xero** (accounting sync via integration hub)
- **WorkOS** (authentication, SSO)
- **Inngest** (async job processing)
- **Upstash Redis** (caching)
- **Sentry** (error tracking)

### Missing Integrations:

| Integration | Priority | Purpose |
|------------|----------|---------|
| **Calendly / Cal.com** | **High** | Self-scheduling for discovery calls and meetings. Existing booking module is appointment-oriented. Cal.com (open source) has good API and is more customizable. Alternative: build lightweight meeting scheduling into booking module with public booking links. |
| **DocuSign / PandaDoc** | **High** | E-signatures on contracts. Essential for Stage 4 (Contract/SOW). PandaDoc also handles document generation with templates. Integration pattern: send document -> webhook on completion -> update document status. |
| **Google Drive / Dropbox / OneDrive** | **Medium** | File sync for document management. When document is uploaded to Ironheart, optionally sync to client's shared folder. Read: pull documents from shared folder into document management. |
| **Slack** | **Medium** | Real-time notifications for task assignments, approval requests, milestone completions. Many clients prefer Slack for day-to-day communication. Integration: send Slack message as notification channel (add to existing EMAIL/SMS/PUSH). |
| **Notion / Linear** | **Low** | Some clients track their own projects in Notion or Linear. Two-way sync of tasks/milestones would reduce double-entry. Complex to implement, low priority. |
| **QuickBooks** | **Medium** | Alternative to Xero for accounting sync. Same integration hub pattern — `quickbooks.provider.ts`. Many UK/US consultants use QuickBooks. |
| **Zapier / Make webhook** | **Low** | Generic webhook integration already exists (developer module webhooks + workflow webhook action). But a first-class Zapier app would allow clients to connect their own tools. Long-term. |
| **Outlook Calendar** | **Medium** | Calendar sync module mentions Apple and Outlook support in the description but implementation depth unclear. Ensure full parity with Google Calendar integration. |
| **Loom / recording platforms** | **Low** | Link recording URLs to meetings. No API integration needed — just a URL field on meetings, which the schema above includes. |
| **AI providers (beyond Claude)** | **Low** | AI module likely uses Anthropic. May want OpenAI fallback or specialized models for different tasks. Architecture likely supports this — check `ai.config.repository.ts` for model configuration. |

---

## 5. Recommended Implementation Roadmap

### Guiding Principles
- Solo consultant building this — every phase must be self-contained and immediately useful
- Prioritize features that reduce manual work TODAY over theoretical completeness
- Build modules that compound (document management enables contract tracking enables offboarding export)
- Follow established patterns (types -> schemas -> repository -> service -> router -> events -> tests)

---

### Phase A: Foundation (Weeks 1-3) -- Unblocks Everything Else
**Dependencies**: None. All other phases depend on this.

**1. Document Management Module**
- S3/R2 storage setup with presigned URLs
- `documents` table, repository, service, router
- Upload, download, version, list by engagement/customer
- Portal read access
- ~8 files, ~2,000 LOC following module pattern

**2. Task Management Module**
- `tasks` table with full CRUD
- `taskComments` table
- Board query (group by status)
- Wire `CREATE_TASK` workflow action to actually create task rows
- Task events: `task/created`, `task/status-changed`, `task/completed`
- Portal read access
- ~8 files, ~2,500 LOC

**Deliverable**: You can store documents and track tasks. Workflow task creation actually works. Clients can see both in portal.

---

### Phase B: Time & Money (Weeks 4-6) -- Enables Profitability Tracking
**Dependencies**: Phase A (tasks for time entry linking)

**1. Time Tracking**
- `timeEntries` table
- Timer start/stop, manual entry
- Weekly timesheet view data
- Billable/non-billable tracking
- Roll-up to task `actualHours`
- Invoice integration: pull unbilled time -> invoice line items
- ~6 files, ~1,500 LOC

**2. Expense Tracking**
- `expenses` table
- CRUD with receipt document linking (uses document management from Phase A)
- Category-based reporting
- Billable expense -> invoice line item
- ~6 files, ~1,000 LOC

**3. Profitability Reporting**
- Service layer functions: `getEngagementProfitability(engagementId)` — revenue minus (time cost + expenses)
- Utilization report: hours logged / available hours per user
- Add to analytics module or standalone
- ~2 files, ~500 LOC

**Deliverable**: You know exactly how profitable each engagement is. You can bill accurately from tracked time. Expenses don't disappear into a spreadsheet.

---

### Phase C: Client Lifecycle Automation (Weeks 7-9) -- Reduces Manual Handoffs
**Dependencies**: Phase A (document management for contracts, task management for onboarding tasks)

**1. Client Onboarding System**
- `onboardingTemplates` and `onboardingProgress` tables
- Template CRUD, progress tracking
- Auto-create on engagement activation
- Portal checklist view for clients
- Workflow events: `onboarding/started`, `onboarding/step-completed`, `onboarding/completed`
- ~6 files, ~1,500 LOC

**2. Contract Terms Tracking**
- Add `contractTerms` JSONB to engagements (or new `contracts` table)
- Renewal date alerting (Inngest cron)
- Terms display in portal
- ~3 files, ~800 LOC

**3. Offboarding Checklist**
- Reuse onboarding template pattern with `type: 'OFFBOARDING'`
- Data export service: compile engagement data to ZIP
- Post-engagement feedback form (extend forms module with engagement-level template)
- ~3 files, ~1,000 LOC

**4. Automated Invoice Chasing**
- `invoice/overdue` Inngest event and cron job
- Chase sequence workflow template (configurable delays)
- Escalation to engagement pause
- ~2 files, ~500 LOC

**Deliverable**: New clients get a structured onboarding experience. Contract renewals don't get missed. Overdue invoices chase themselves. Offboarding captures knowledge.

---

### Phase D: Visibility & Intelligence (Weeks 10-12) -- Know What Needs Attention
**Dependencies**: Phase B (time tracking for health scoring), Phase C (contract terms for renewal tracking)

**1. Communication Hub**
- `communicationLog` table or materialized view
- Auto-logging from notification sends, outreach activities
- Manual phone/meeting logging
- Unified timeline per customer
- ~6 files, ~1,500 LOC

**2. Client Health Scoring**
- `clientHealthScores` table
- Daily calculation Inngest cron
- Factor weights: engagement, satisfaction, financial, project momentum
- Integration with morning briefing AI feature
- ~4 files, ~1,000 LOC

**3. Meeting Management**
- `meetings` table with agenda, notes, action items
- Post-meeting auto-create tasks from action items
- Calendar sync integration for scheduling
- Recurring meeting support
- ~8 files, ~2,000 LOC

**4. Client Segmentation**
- `clientSegments` table with criteria-based auto-assignment
- Tier classification with service level rules
- Segment-filtered views across modules
- ~4 files, ~800 LOC

**Deliverable**: One place to see all client communications. Health scores surface at-risk clients. Meetings produce actionable tasks. Clients are properly segmented for differentiated service.

---

### Phase E: Advanced Features (Weeks 13-16) -- Polish & Scale
**Dependencies**: All previous phases

**1. Retainer Management**
- `retainerBanks` table
- Monthly hours allocation and rollover
- Balance tracking, threshold alerts
- Client-facing usage report in portal
- ~6 files, ~1,500 LOC

**2. Change Request Management**
- `changeRequests` table
- Portal submission for clients
- Impact assessment fields, approval workflow
- Link to contract amendments
- ~6 files, ~1,200 LOC

**3. Revision Workflow for Deliverables**
- Add REVISION_REQUESTED/REDELIVERED statuses
- Version chaining on deliverables
- Auto-create revision task on rejection
- ~2 files, ~500 LOC

**4. Proposal Templates & PDF Export**
- Proposal template system (save/clone)
- PDF generation service (React-to-PDF or Puppeteer)
- ~4 files, ~1,000 LOC

**5. Reporting Portal Enhancement**
- Project status report generation
- Time usage reports for retainer clients
- Scheduled report delivery (weekly/monthly cron)
- AI-generated executive summaries
- ~4 files, ~1,200 LOC

**Deliverable**: Retainer clients are fully managed. Scope changes are tracked formally. Clients get professional reports. Proposals are faster to create.

---

### Phase F: Integrations (Ongoing, Parallel)
**Dependencies**: Document management (Phase A) for e-signature integration

Each follows the established `IntegrationProvider` pattern in the integrations hub.

**Priority Order:**
1. **DocuSign/PandaDoc** (~1 week) — `docusign.provider.ts`, OAuth flow, send-for-signature, webhook status updates
2. **Cal.com** (~1 week) — or build lightweight self-scheduling into booking module with public links
3. **Slack** (~3 days) — add as notification channel, `slack.provider.ts`, webhook for incoming commands
4. **Google Drive** (~1 week) — `google-drive.provider.ts`, folder sync per engagement
5. **QuickBooks** (~1 week) — `quickbooks.provider.ts`, invoice/payment sync like Xero

---

## Summary: Priority Matrix

| Priority | Module | Stage Impact | Effort |
|----------|--------|-------------|--------|
| **Critical** | Document Management | 4, 6, 10 | ~2,000 LOC |
| **Critical** | Task Management | 6, 7 | ~2,500 LOC |
| **Critical** | Time Tracking | 6, 8, 9 | ~1,500 LOC |
| **Critical** | Retainer Hours Bank | 9 | ~1,500 LOC |
| **High** | Client Onboarding | 5 | ~1,500 LOC |
| **High** | Contract Terms | 4, 9, 10 | ~800 LOC |
| **High** | Invoice Chase Automation | 8 | ~500 LOC |
| **High** | Communication Hub | All | ~1,500 LOC |
| **High** | Client Health Scoring | 9, 10 | ~1,000 LOC |
| **High** | Offboarding System | 10 | ~1,000 LOC |
| **High** | Change Request Management | 7 | ~1,200 LOC |
| **High** | Meeting Management | 2, 5, 6 | ~2,000 LOC |
| **High** | DocuSign Integration | 4 | ~500 LOC |
| **Medium** | Expense Tracking | 8 | ~1,000 LOC |
| **Medium** | Proposal Templates | 3 | ~1,000 LOC |
| **Medium** | SLA Tracking | 9 | ~800 LOC |
| **Medium** | Client Segmentation | All | ~800 LOC |
| **Medium** | Reporting Portal | 6, 9 | ~1,200 LOC |
| **Medium** | Lead Scoring | 1 | ~800 LOC |
| **Medium** | Qualification Framework | 2 | ~600 LOC |
| **Medium** | Renewal Automation | 10 | ~500 LOC |
| **Medium** | Revision Workflow | 7 | ~500 LOC |
| **Low** | PDF Export | 3 | ~500 LOC |
| **Low** | Win/Loss Analysis | 10 | ~400 LOC |
| **Low** | Case Study Generation | 10 | ~400 LOC |

**Total estimated new LOC**: ~24,200 across all phases (roughly 18 weeks of solo development).

---

## Appendix: What's Already Strong (No Action Needed)

These areas are well-built and need no gap-filling for the client lifecycle:

1. **Payment processing** — Stripe Connect, partial payments, tax rules, pricing engine, discount codes. Comprehensive.
2. **Workflow automation** — Linear + graph modes, 20+ node types, AI decision nodes, sub-workflows. Powerful enough to automate any lifecycle transition.
3. **Notification system** — Email + SMS + push with templates, preferences, multi-trigger support. Solid.
4. **AI assistant** — Ghost operator, tool system, knowledge base, morning briefings, workflow suggestions. Differentiated and functional.
5. **Audit logging** — Comprehensive tracking of all actions. Compliance-ready.
6. **RBAC & multi-tenancy** — Granular permissions, module gating, tenant isolation. Enterprise-grade.
7. **Analytics** — Revenue forecasting, customer insights, churn risk, utilization metrics. The data layer is strong — needs more consuming features (reports, dashboards).
8. **Outreach & Pipeline** — Multi-channel sequences, A/B testing, stage management, deal tracking. Complete sales flow.
9. **Booking & Scheduling** — Full lifecycle, smart assignment, travel time, waitlist, capacity. Exceeds what most consulting platforms offer.
10. **Review management** — Automated requests, sentiment, resolution workflow, multi-platform. Complete.
