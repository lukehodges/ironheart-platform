# Client Portal V2 — Full Audit

> Generated 2026-04-06. Covers dead endpoints, mockup gaps, and missing features across admin, portal, proposals, and email.
>
> **Audit Status** — Last updated: 2026-04-07
> ✅ Complete | ❌ Not started | 🚧 Partial/Blocked

---

## Table of Contents

1. [Dead Endpoints & Dead Code](#1-dead-endpoints--dead-code)
2. [Broken Features (bugs in current code)](#2-broken-features)
3. [Entirely Unbuilt Pages](#3-entirely-unbuilt-pages)
4. [Entirely Unbuilt Emails](#4-entirely-unbuilt-emails)
5. [Admin Mockup vs Implementation Gaps](#5-admin-mockup-vs-implementation-gaps)
6. [Portal Mockup vs Implementation Gaps](#6-portal-mockup-vs-implementation-gaps)
7. [Proposal Flow Mockup vs Implementation Gaps](#7-proposal-flow-mockup-vs-implementation-gaps)
8. [Cross-Cutting UX Gaps](#8-cross-cutting-ux-gaps)
9. [Priority Ranking](#9-priority-ranking)
10. [File Reference](#10-file-reference)

---

## 1. Dead Endpoints & Dead Code

### ❌ 1.1 Six Proposal Edit/Delete Mutations — Never Called From UI

All six CRUD mutations for editing a saved draft proposal exist in the backend but have zero UI callers:

| Endpoint | Router Location | Service Location |
|----------|----------------|-----------------|
| `updateProposalSection` | `client-portal.router.ts:122` | `service.ts:405` |
| `deleteProposalSection` | `client-portal.router.ts:126` | `service.ts:411` |
| `updateProposalItem` | `client-portal.router.ts:136` | `service.ts:436` |
| `deleteProposalItem` | `client-portal.router.ts:140` | `service.ts:441` |
| `updatePaymentRule` | `client-portal.router.ts:148` | `service.ts:474` |
| `deletePaymentRule` | `client-portal.router.ts:152` | `service.ts:484` |

**Impact**: Once a proposal is saved as a draft, it cannot be edited — only sent or abandoned. No edit-draft UI exists.

### ✅ 1.2 Session-Based Approve/Decline — Dead Service Methods

`clientPortalService.approveProposal` (service line 702) and `clientPortalService.declineProposal` (service line 739) are defined but never called from any router procedure. The router exclusively uses the token-based variants (`approveProposalByToken`, `declineProposalByToken`).

**Status**: Intentionally unused — token-based variants are used instead. Low risk by design.

**Latent bug**: The session-based `approveProposal` does NOT run materialization (no milestones, deliverables, or invoices created). If ever wired up, it would produce an inconsistent state.

### ❌ 1.3 No Delete/Supersede Proposal Endpoint

No `deleteProposal` or `archiveProposal` mutation exists anywhere. The `SUPERSEDED` status is defined in `ProposalStatus` type and rendered in badge maps, but no mutation sets it.

### ✅ 1.4 Dead Buttons in Portal

| Button | Location | Status |
|--------|----------|--------|
| **Pay Now** | `portal-invoices-content.tsx:498-524` | ✅ Now routes to `/portal/invoices/[id]/pay` |
| **Download Receipt** | `portal-invoices-content.tsx:527-544` | ✅ Now routes to `/portal/invoices/[id]/receipt` |
| **Pay Deposit** (post-approval) | `proposal-approved.tsx:152-160` | ✅ Now routes to deposit invoice payment page |
| **Invoice "View"** (admin, PAID) | `invoices-tab.tsx:156-159` | ✅ Now routes to receipt |
| **Milestone "Delete"** (admin) | `milestone-card.tsx:157-161` | ❌ Dropdown item renders, no handler, no `deleteMilestone` endpoint exists |

---

## 2. Broken Features

### ✅ 2.1 Deposit Amount Reads Legacy JSONB — Broken for New Proposals

**File**: `src/app/portal/[token]/page.tsx:102-116`

`ProposalApproved` computes `depositAmount` by searching `proposal.paymentSchedule` for `dueType === "ON_APPROVAL"`. Proposals created with the new section/rule builder store rules in the relational `paymentRules` table, leaving `paymentSchedule` empty. Deposit card never renders for new proposals.

**Status**: FIXED — now reads from relational `paymentRules` with fallback to legacy JSONB.

### ✅ 2.2 PaymentTimeline Reads Legacy JSONB — Broken for New Proposals

**Files**: `payment-timeline.tsx`, `invoices-tab.tsx`

`PaymentTimeline` receives `schedule: PaymentScheduleItem[]` from `currentProposal?.paymentSchedule`. New proposals have empty `paymentSchedule: []` since data is in `paymentRules`. Timeline renders nothing.

**Status**: FIXED — relational first, JSONB fallback.

### ✅ 2.3 `customerName` Hardcoded as "Client"

**File**: `src/app/portal/[token]/page.tsx:109,123`

The caller passes `customerName="Client"` to `ProposalApproved`, `ProposalDeclined`, and `ProposalView`. All personalisation ("You're all set, Sarah") shows "Client" instead.

**Status**: FIXED — populated from customer record in repository.

### ✅ 2.4 Magic Link Email Never Sent

**File**: `client-portal.service.ts:963-973`

`requestMagicLink` creates a session token but has `// TODO: Emit portal/magic-link:requested event`. The `portal/magic-link:requested` event is not defined in the Inngest registry. Users see "Check your email" but get nothing.

**Status**: FIXED — event handler implemented, Inngest event registered.

### ✅ 2.5 Milestone Progress Bar Hardcoded at 50%

**File**: `portal-dashboard-content.tsx:787-795`

The IN_PROGRESS milestone progress bar uses `width: "50%"` as a literal. No deliverable completion ratio is computed.

**Status**: FIXED — now computed from deliverable completion ratio.

### 🚧 2.6 `getDashboard` Called Twice Per Page Load

**Files**: `(dashboard)/layout.tsx:28`, `dashboard/page.tsx:10`

Both the layout and the dashboard page independently call `getDashboard` with the same `engagementId`.

**Status**: Still exists — tRPC dedupes same-key queries so low impact. Not yet refactored.

---

## 3. Entirely Unbuilt Pages

These mockups have dedicated HTML designs but zero code implementation:

| Mockup File | Description | Impact | Status |
|-------------|-------------|--------|--------|
| `portal-invoice-payment.html` | Full payment page — Stripe card + bank transfer with copy buttons, payment method selector, security footer | **Critical** | ✅ BUILT at `src/app/portal/(dashboard)/invoices/[invoiceId]/pay/page.tsx` |
| `portal-receipt.html` | Receipt document with print/PDF toolbar, PAID stamp, line items, VAT breakdown, payment metadata | **High** | ✅ BUILT at `src/app/portal/(dashboard)/invoices/[invoiceId]/receipt/page.tsx` |
| `portal-deliverable-detail.html` | Deliverable detail page with file card, consultant notes, Request Changes textarea, accept/reject actions | **High** | ✅ BUILT at `src/app/portal/(dashboard)/deliverables/[deliverableId]/page.tsx` |
| `portal-approval-detail.html` | Approval detail page with consultant context card, review checklist, linked deliverable display | **Medium** | ❌ NOT BUILT |
| `portal-set-password.html` | Set password page inside sidebar layout (sidebar links to it but route doesn't exist) | **Medium** | ✅ BUILT at `src/app/portal/(dashboard)/set-password/page.tsx` |
| `admin-proposal-preview.html` | In-admin preview with Edit/Preview toggle, info banner "This is how Sarah will see your proposal" | **Low** | ✅ BUILT at `src/app/portal/preview/[engagementId]/page.tsx` (redirects to portal) |

---

## 4. Entirely Unbuilt Emails

✅ All 7 email templates have been built in `src/modules/client-portal/client-portal.events.ts`.

| Email Template | Inngest Event | Event Fires? | Email Sent? | Status |
|---------------|---------------|-------------|------------|--------|
| `email-proposal-sent.html` | `portal/proposal:sent` | Yes | Yes | ✅ |
| `email-proposal-approved.html` | `portal/proposal:approved` | Yes | Yes | ✅ |
| `email-invoice-sent.html` | `portal/invoice:sent` | Yes | Yes | ✅ |
| `email-invoice-overdue.html` | `portal/invoice:overdue` | Yes (daily cron detects + marks) | Yes | ✅ |
| `email-milestone-completed.html` | None | **No event defined** | Yes | ✅ |
| `email-deliverable-shared.html` | `portal/deliverable:shared` | Yes | Yes | ✅ |
| `email-approval-requested.html` | `portal/approval:requested` | Yes | Yes | ✅ |

**Infrastructure note**: Resend email provider is wired and functional (`src/modules/notification/providers/email/resend.provider.ts`). The plumbing is ready — only templates and event handler bodies are missing.

---

## 5. Admin Mockup vs Implementation Gaps

### ❌ 5.1 Dialogs vs Full Pages (Major Structural Gap)

Three flows are full dedicated pages in mockups but compact dialogs in implementation:

| Flow | Mockup | Implementation | What's Lost |
|------|--------|---------------|-------------|
| **Request Approval** | Full page with file upload zone, attachments list, info note | Compact dialog: title, description, deliverable/milestone selects | File attachments, upload zone, preview note |
| **Send Invoice** | Full page, 2-column: form + live invoice preview + financial context sidebar | Compact dialog: amount, description, due date, milestone | Live preview, financial context, payment schedule linkage |
| **Share Deliverable** | Full page with drag-drop file upload, multiple files, acceptance toggle | Compact dialog: title, description, milestone, single URL field | File upload, acceptance toggle, notification preview |

### ❌ 5.2 Create Proposal Form

| Mockup Element | Implementation |
|---------------|---------------|
| "Proposal Title" field (separate from engagement title) | Missing — no proposal-level title |
| "Preview" button in header | Missing — no inline preview |
| Flat deliverables list | Replaced by sections/items (more powerful but different) |
| Payment schedule with "Net 14", "Net 30" options | Replaced by trigger types (ON_APPROVAL, MILESTONE_COMPLETE, etc.) |
| Simple price field | Removed — total auto-computed from payment rules |

### ❌ 5.3 Invoices Tab

| Mockup Element | Implementation |
|---------------|---------------|
| "Scheduled" placeholder rows for unissued payments | Missing — only actual invoice records shown |
| "Create" button per scheduled entry | Missing |
| Payment schedule reference banner with "View proposal" link | Missing |
| Payment schedule linked to milestones showing payment amounts | Missing — only deliverable count shown |

### ❌ 5.4 Engagement List

| Mockup Element | Implementation |
|---------------|---------------|
| Per-row 3-dot action menu (Edit, Archive, View Portal) | Missing |
| "Last Activity" column with relative timestamps | Missing |
| Pipeline value/invoiced breakdown in stats | Simplified stats |

### 5.5 Other Admin Gaps

| Area | Gap | Status |
|------|-----|--------|
| Create engagement form | No "Create new client" inline in search dropdown | ❌ |
| Edit engagement sheet | Missing HYBRID type option, missing PAUSED status | ✅ FIXED |
| Overview tab | Shows "Retainer (Monthly)" for HYBRID engagements (wrong label) | ✅ FIXED |
| GripVertical on proposal sections | Decorative — no drag-drop binding | ❌ |
| `proposalPaymentIndex` | Never set in CreateInvoiceDialog — timeline slots never match | ❌ |
| Engagement type filter | Schema supports it, UI doesn't expose it | ❌ |
| PENDING deliverables | Can't be delivered from admin (no row action) | ❌ |

---

## 6. Portal Mockup vs Implementation Gaps

### ❌ 6.1 Dashboard

| Mockup Element | Implementation |
|---------------|---------------|
| Approval card shows contextual description below title | Only shows `approval.title` |
| Invoice card shows invoice title/name as primary label | Shows amount + due date only |
| Stats sub-labels: "of £X total", "N invoice due", "N awaiting acceptance" | Generic: "across all invoices", "pending payment", "completed" |
| Stats show Deliverables card (X/Y, N awaiting acceptance) | Shows Milestones card instead |
| Milestone items show date ranges (start → end) | Only single `dueDate` |
| Activity feed has bold event-type labels + descriptive text | Plain text `item.title` |
| Header hardcodes "Engagement with Luke Hodges" | Not tenant-aware |

### 🚧 6.2 Deliverables

| Mockup Element | Implementation | Status |
|---------------|---------------|--------|
| Grouped by milestone with section headers (name, status, date range) | Flat list, no grouping | ✅ FIXED — now grouped by milestone with section headers |
| Empty "upcoming milestone" dashed placeholder per group | Single global empty state | ❌ |
| Live preview link for prototype-type deliverables | Not present | ❌ |
| Download shown for DELIVERED items (before acceptance) | Only shown after ACCEPTED | ❌ |

### ❌ 6.3 Approvals

| Mockup Element | Implementation |
|---------------|---------------|
| "What to review" amber context box with guidance | Missing — only description shown |
| Linked deliverable/milestone shown on card | Not displayed |
| Past approvals show milestone name as subtitle | Only title + comment shown |

### 🚧 6.4 Sidebar & Navigation

| Mockup Element | Implementation | Status |
|---------------|---------------|--------|
| Customer name + email in footer | Hardcoded "Client" + engagement initial | ✅ FIXED — now from `dashboardData` |
| Pending deliverables badge | Always 0 — layout never computes it | ✅ FIXED — computed from deliverables list |
| Engagement switcher persists across navigation | State in `useState`, lost on page change | ✅ FIXED — URL search param persistence |
| Messages + Help nav items (from `client-dashboard.html`) | Not implemented | ❌ |
| Notification bell + search in topbar | Not implemented | ❌ |

### ✅ 6.5 Login & Auth

| Mockup Element | Implementation | Status |
|---------------|---------------|--------|
| Preserves redirect target after login | Always goes to `/portal/dashboard` | ✅ FIXED — `?redirectTo` param |
| Portal logout button | No endpoint, no button, no session clearing | ✅ FIXED — POST `/api/portal/logout` + sidebar button |
| Set password page | Route doesn't exist despite sidebar link | ✅ FIXED |

---

## 7. Proposal Flow Mockup vs Implementation Gaps

### ❌ 7.1 Proposal View (`proposal-view.html`)

| Mockup Element | Implementation |
|---------------|---------------|
| Italic/coloured emphasis in title | Static `engagement.title` string |
| Personalised context-aware greeting paragraph | Generic "here's everything we discussed" |
| Formatted reference number (PRO-2026-0058) | `proposal.id.slice(0, 8)` |
| Dynamic validity period ("Valid for 14 days") | Hardcoded "30 days" |
| Section heading h2 below amber label ("What we're building") | Only small label, no heading |
| Per-deliverable cost breakdown in pricing card | Only payment schedule steps shown |
| Milestone "Week N–N" label format | Only `milestone.title` |
| Date range per milestone (start + end) | Only `dueDate` |
| Bordered card around Terms collapsible | Bare toggle button |

### 🚧 7.2 Proposal States

| State | Mockup | Implementation Gap | Status |
|-------|--------|--------------------|--------|
| **Approved** | Shows deposit with "Pay Deposit" button linked to Stripe | Dead button, no payment integration, deposit reads legacy JSONB | ✅ Pay Deposit routes to deposit invoice; deposit reads relational data |
| **Approved** | "Go to Your Portal" links to authenticated dashboard | Falls back to `#` if session not set | ✅ FIXED — gated on `sessionToken` |
| **Declined** | Shows "proposal available for 14 days" expiry context | No expiry note displayed | ❌ |
| **Declined** | Phone number from tenant profile | Hardcoded placeholder `07XXX XXXXXX` | 🚧 Check current state |
| **Expired** | Phone contact option | Only email shown | ❌ |

### ❌ 7.3 Proposal Data Fields Missing from Schema

These fields are designed in the mockups but have no database column or type definition:

- `proposal.title` — separate from engagement title (a proposal-level display name)
- `proposal.introText` — personalised greeting paragraph per proposal
- `proposal.referenceNumber` — formatted as PRO-YYYY-NNNN
- `proposal.validDays` — dynamic validity period
- `milestone.startDate` — only `dueDate` exists
- Per-item pricing on deliverables/items (cost attributed to each item)

---

## 8. Cross-Cutting UX Gaps

### ❌ 8.1 No File Upload System

No file upload exists anywhere in the implementation. The schema has `fileUrl`, `fileName`, `fileSize` fields but:
- Share Deliverable uses a plain URL text field
- Request Approval has no attachment support
- No signed URL generation, no storage integration, no drag-drop upload

### ❌ 8.2 No Payment Integration

- No Stripe checkout flow
- No bank transfer details display
- `stripePaymentUrl` and `stripePaymentIntentId` fields exist on `PortalInvoiceRecord` but are never populated or consumed
- Pay Now, Pay Deposit, Download Receipt buttons are all non-functional

### 🚧 8.3 Hardcoded Personal Details

| Location | Hardcoded Value | Should Be | Status |
|----------|----------------|-----------|--------|
| `portal-dashboard-content.tsx:178` | "Engagement with Luke Hodges" | Tenant business name | ❌ |
| `proposal-view.tsx:489-496` | "Prepared by Luke Hodges" + email | Tenant/user profile | ✅ FIXED — uses `consultantName` prop |
| `proposal-declined.tsx` | Phone `07XXX XXXXXX` | Tenant phone | 🚧 Check current state |
| `portal/[token]/page.tsx:109,123` | `customerName="Client"` | Customer record name | ✅ FIXED |
| `portal-login-form.tsx` | Hardcoded email/brand | `NEXT_PUBLIC_CONTACT_EMAIL` / `BRAND_NAME` env vars | ✅ FIXED |
| `portal/(dashboard)/invoices/[invoiceId]/pay/page.tsx` | `BANK_DETAILS` hardcoded | `NEXT_PUBLIC_BANK_*` env vars | ✅ FIXED |

---

## 9. Priority Ranking

### Tier 1 — Broken / Critical (fix first)

1. ✅ **All 7 email templates** — DONE
2. ❌ **Payment flow** — Pay Now, Pay Deposit are dead buttons; no Stripe, no bank transfer
3. ✅ **`customerName` hardcoded as "Client"** — FIXED
4. ✅ **PaymentTimeline reads legacy JSONB** — FIXED
5. ✅ **Deposit detection reads legacy JSONB** — FIXED

### Tier 2 — Major Missing Pages

6. ✅ Invoice payment page (Stripe + bank transfer) — BUILT
7. ✅ Receipt/PDF page — BUILT
8. ✅ Deliverable detail page (notes, request changes) — BUILT
9. ✅ Set password page (route doesn't exist) — BUILT
10. ❌ File upload system (share deliverable, request approval)

### Tier 3 — Feature Gaps

11. ❌ Edit draft proposal flow (6 dead endpoints waiting for UI)
12. ❌ Admin dialogs → full pages (invoice, deliverable, approval)
13. ✅ Deliverables grouped by milestone in portal — FIXED
14. ❌ Scheduled invoice placeholder rows in admin
15. ❌ Delete/supersede proposal capability

### Tier 4 — UX Polish

16. ✅ Portal logout mechanism — FIXED
17. ✅ Login redirect preservation — FIXED
18. ✅ Engagement switcher URL persistence — FIXED
19. ❌ Dashboard stat sub-labels matching mockup copy
20. ✅ Milestone progress bar (real calculation vs hardcoded 50%) — FIXED
21. ❌ GripVertical drag-drop binding
22. ❌ Engagement type filter in list page
23. ✅ HYBRID/PAUSED in edit sheet — FIXED

---

## 10. File Reference

### Mockup Files

All in `.superpowers/brainstorm/63013-1775327512/content/`:

**Admin**: `admin-client-list.html`, `admin-clients.html`, `admin-create-engagement.html`, `admin-create-proposal.html`, `admin-engagement-detail.html`, `admin-manage-invoices.html`, `admin-manage-milestones.html`, `admin-proposal-preview.html`, `admin-request-approval.html`, `admin-send-invoice.html`, `admin-share-deliverable.html`

**Portal**: `portal-dashboard.html`, `portal-invoices.html`, `portal-invoice-payment.html`, `portal-receipt.html`, `portal-deliverables.html`, `portal-deliverable-detail.html`, `portal-approvals.html`, `portal-approval-detail.html`, `portal-login.html`, `portal-set-password.html`, `client-dashboard.html`, `client-journey.html`

**Proposals & Email**: `proposal-view.html`, `proposal-approved.html`, `proposal-declined.html`, `proposal-expired.html`, `email-proposal-sent.html`, `email-proposal-approved.html`, `email-invoice-sent.html`, `email-invoice-overdue.html`, `email-milestone-completed.html`, `email-deliverable-shared.html`, `email-approval-requested.html`

### Key Implementation Files

| Area | File |
|------|------|
| Router (all endpoints) | `src/modules/client-portal/client-portal.router.ts` |
| Service (business logic) | `src/modules/client-portal/client-portal.service.ts` |
| Repository (DB queries) | `src/modules/client-portal/client-portal.repository.ts` |
| Types | `src/modules/client-portal/client-portal.types.ts` |
| Schemas (Zod) | `src/modules/client-portal/client-portal.schemas.ts` |
| Events (email TODOs) | `src/modules/client-portal/client-portal.events.ts` |
| Inngest registry | `src/shared/inngest.ts` |
| Email provider | `src/modules/notification/providers/email/resend.provider.ts` |
| Proposal builder | `src/app/admin/clients/[engagementId]/proposals/new/page.tsx` |
| Engagement detail | `src/app/admin/clients/[engagementId]/page.tsx` |
| Portal token page | `src/app/portal/[token]/page.tsx` |
| Portal layout | `src/app/portal/(dashboard)/layout.tsx` |
| Proposal view | `src/components/portal/proposal/proposal-view.tsx` |
| Proposal approved | `src/components/portal/proposal/proposal-approved.tsx` |
| Portal dashboard | `src/components/portal/portal-dashboard-content.tsx` |
| Portal invoices | `src/components/portal/portal-invoices-content.tsx` |
| Portal sidebar | `src/components/portal/portal-sidebar.tsx` |
| Admin proposals tab | `src/components/clients/proposals-tab.tsx` |
| Admin invoices tab | `src/components/clients/invoices-tab.tsx` |
| Admin milestones | `src/components/clients/milestone-card.tsx` |
| Payment timeline | `src/components/clients/payment-timeline.tsx` |
| DB schema | `src/shared/db/schemas/client-portal.schema.ts` |
| Invoice payment page | `src/app/portal/(dashboard)/invoices/[invoiceId]/pay/page.tsx` |
| Receipt page | `src/app/portal/(dashboard)/invoices/[invoiceId]/receipt/page.tsx` |
| Deliverable detail page | `src/app/portal/(dashboard)/deliverables/[deliverableId]/page.tsx` |
| Set password page | `src/app/portal/(dashboard)/set-password/page.tsx` |
| Admin proposal preview | `src/app/portal/preview/[engagementId]/page.tsx` |
