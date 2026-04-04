# Client Portal Design Spec

**Date:** 2026-04-04
**Status:** Draft
**Author:** Luke Hodges + Claude

## Purpose

A client-facing portal for Luke's AI consulting business (and any adjacent services). Handles the full lifecycle from proposal through to project completion or ongoing retainer. Built as an Ironheart module with clean boundaries, so it integrates with existing infrastructure but could be extracted later.

## Goals

- Minimal friction: client goes from proposal link to active portal in one click
- Professional but not heavy: enough structure to protect both sides without feeling like a legal process
- Handles all engagement shapes: one-off projects, retainers, and projects that convert to retainers
- Makes Luke look organised without requiring manual effort on every update

## Non-Goals

- In-portal messaging (clients communicate via email/WhatsApp/etc. naturally)
- Generic multi-tenant feature (this is specifically for Luke's business)
- Real-time collaboration or editing
- Payment provider integration (Stripe/bank transfer designed for but wired up later)

---

## Client Journey

1. **The Call** — Luke and prospect agree on scope, price, and terms. Happens outside the portal.
2. **Proposal Created** — Luke creates a proposal from the admin. Scope, deliverables, timeline, price, payment schedule, terms. One click generates a unique link.
3. **Client Receives Proposal Link** — Email with a magic link. Clean proposal page with everything laid out. Client clicks "Approve & Get Started".
4. **Portal Activates** — On approval, the portal is live. Approved proposal is the first item in their activity history. Deposit payment available if applicable.
5. **Work Happens** — Luke updates milestones, shares deliverables, requests approvals, sends invoices from the admin. Client sees everything in their portal.
6. **Project Completes or Converts to Retainer** — Final deliverables shared, or a new retainer proposal created. Portal is the ongoing home for working with Luke.

---

## Data Model

### Engagement

The container for a client relationship.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| customerId | UUID | FK → customers |
| type | enum | `PROJECT`, `RETAINER` |
| status | enum | `DRAFT`, `PROPOSED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| title | text | e.g. "AI Chatbot for Reception Desk" |
| description | text | High-level summary |
| startDate | date | Nullable, set on activation |
| endDate | date | Nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Proposal

A formal offer attached to an engagement. An engagement can have multiple proposals over time (initial project, retainer upsell, scope change).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| engagementId | UUID | FK → engagements |
| status | enum | `DRAFT`, `SENT`, `APPROVED`, `DECLINED`, `SUPERSEDED` |
| scope | text | What's being done (rich text / markdown) |
| deliverables | jsonb | Array of `{ title, description }` |
| price | integer | Total price in pence |
| paymentSchedule | jsonb | Array of `{ label, amount, dueType }` where dueType is `ON_APPROVAL`, `ON_DATE`, `ON_MILESTONE`, `ON_COMPLETION` |
| terms | text | Terms and conditions text |
| token | text | Unique token for magic link (UUID v4) |
| tokenExpiresAt | timestamp | 30-day expiry from send |
| sentAt | timestamp | Nullable |
| approvedAt | timestamp | Nullable |
| declinedAt | timestamp | Nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Milestone

A checkpoint within an engagement.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| engagementId | UUID | FK → engagements |
| title | text | |
| description | text | Nullable |
| status | enum | `UPCOMING`, `IN_PROGRESS`, `COMPLETED` |
| sortOrder | integer | Display ordering |
| dueDate | date | Nullable |
| completedAt | timestamp | Nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Deliverable

A specific asset or output shared with the client.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| engagementId | UUID | FK → engagements |
| milestoneId | UUID | Nullable FK → milestones |
| title | text | |
| description | text | Nullable |
| status | enum | `PENDING`, `DELIVERED`, `ACCEPTED` |
| fileUrl | text | Nullable — URL to stored file |
| fileName | text | Nullable — original filename |
| fileSize | integer | Nullable — bytes |
| deliveredAt | timestamp | Nullable |
| acceptedAt | timestamp | Nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Approval Request

When Luke needs a client decision.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| engagementId | UUID | FK → engagements |
| deliverableId | UUID | Nullable FK → deliverables |
| milestoneId | UUID | Nullable FK → milestones |
| title | text | What needs approving |
| description | text | Context for the decision |
| status | enum | `PENDING`, `APPROVED`, `REJECTED` |
| clientComment | text | Nullable — client can add a note |
| respondedAt | timestamp | Nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Portal Invoice

A payment request sent to the client.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| engagementId | UUID | FK → engagements |
| milestoneId | UUID | Nullable FK → milestones |
| proposalPaymentIndex | integer | Nullable — maps to paymentSchedule array index |
| amount | integer | In pence |
| description | text | What this invoice is for |
| status | enum | `DRAFT`, `SENT`, `PAID`, `OVERDUE` |
| dueDate | date | |
| paidAt | timestamp | Nullable |
| paymentMethod | enum | Nullable — `STRIPE`, `BANK_TRANSFER` |
| paymentReference | text | Nullable — Stripe payment ID or bank ref |
| token | text | Unique token for pay link |
| sentAt | timestamp | Nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Portal Credential

Client password storage (one per customer, not per session).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| customerId | UUID | FK → customers (unique) |
| passwordHash | text | bcrypt hash |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Portal Session

Client session tracking.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| customerId | UUID | FK → customers |
| token | text | Magic link token (UUID v4) |
| tokenExpiresAt | timestamp | 7-day expiry |
| sessionToken | text | Nullable — cookie session token |
| sessionExpiresAt | timestamp | 30-day session expiry |
| lastAccessedAt | timestamp | |
| createdAt | timestamp | |

---

## Auth & Access

### Client Auth (separate from WorkOS admin auth)

- Every proposal and notification email contains a magic link with a unique token
- Token is tied to the customer record, 7-day expiry
- Clicking the link creates a session cookie (30-day expiry)
- Client can optionally set a password from their dashboard
- With a password set, they can log in at `/portal/login` with email + password
- Forgotten password sends a new magic link
- Clients never interact with WorkOS — entirely separate auth system

### Access Rules

- A client can only see their own engagements
- Portal tokens are scoped to a single customer record
- All portal routes use `portalProcedure` — a public procedure with token validation
- Similar pattern to existing `/forms/[sessionKey]` and `/review/[token]` routes

### Portal Procedure

New tRPC middleware that:
1. Reads session token from cookie or query param
2. Validates against `portalSessions` table
3. Checks expiry
4. Injects `customerId` into context
5. All downstream queries filter by `customerId`

---

## Module Structure

```
src/modules/client-portal/
  client-portal.types.ts        # Engagement, Proposal, Milestone, Deliverable, etc.
  client-portal.schemas.ts      # Zod input validation
  client-portal.repository.ts   # Drizzle queries
  client-portal.service.ts      # Business logic, event emission
  client-portal.router.ts       # tRPC procedures (admin + portal)
  client-portal.events.ts       # Inngest handlers (emails, status updates)
  index.ts                      # Barrel export
  __tests__/client-portal.test.ts
```

Follows established Ironheart patterns:
- Domain errors in repo/service (`NotFoundError`, `ForbiddenError`, etc.)
- No `TRPCError` in repo or service
- Pino logging: `logger.child({ module: 'client-portal.service' })`
- Zod v4: `z.uuid()` not `z.string().uuid()`

---

## tRPC Procedures

### Admin Procedures (behind `permissionProcedure`)

| Procedure | Permission | Description |
|-----------|-----------|-------------|
| `engagement.list` | `engagement:read` | List all engagements with filters |
| `engagement.get` | `engagement:read` | Get engagement detail with proposals, milestones, deliverables |
| `engagement.create` | `engagement:create` | Create new engagement for a customer |
| `engagement.update` | `engagement:update` | Update engagement status, details |
| `proposal.create` | `proposal:create` | Create proposal for an engagement |
| `proposal.send` | `proposal:send` | Send proposal (generates token, triggers email) |
| `milestone.create` | `milestone:create` | Add milestone to engagement |
| `milestone.update` | `milestone:update` | Update milestone status |
| `deliverable.create` | `deliverable:create` | Add deliverable with optional file |
| `deliverable.deliver` | `deliverable:update` | Mark as delivered, notify client |
| `approval.create` | `approval:create` | Request client approval |
| `invoice.create` | `invoice:create` | Create invoice |
| `invoice.send` | `invoice:send` | Send invoice to client |

### Portal Procedures (behind `portalProcedure`)

| Procedure | Description |
|-----------|-------------|
| `portal.getProposal` | View proposal by token |
| `portal.approveProposal` | Approve proposal |
| `portal.declineProposal` | Decline proposal |
| `portal.getDashboard` | Dashboard data: engagement overview, activity feed, pending actions |
| `portal.listDeliverables` | All deliverables for their engagement |
| `portal.acceptDeliverable` | Accept/sign off on a deliverable |
| `portal.listInvoices` | All invoices |
| `portal.payInvoice` | Initiate payment (Stripe checkout or mark bank transfer) |
| `portal.listApprovals` | Pending approval requests |
| `portal.respondToApproval` | Approve or reject with optional comment |
| `portal.setPassword` | Set a password for direct login |
| `portal.login` | Email + password login |
| `portal.requestMagicLink` | Send a new magic link (forgotten password flow) |

---

## Inngest Events

| Event | Trigger | Handler |
|-------|---------|---------|
| `portal/proposal:sent` | Admin sends proposal | Send proposal email with magic link |
| `portal/proposal:approved` | Client approves proposal | Activate engagement, notify Luke, send confirmation email |
| `portal/proposal:declined` | Client declines proposal | Notify Luke |
| `portal/deliverable:shared` | Admin shares deliverable | Email client with portal link |
| `portal/approval:requested` | Admin requests approval | Email client with approve/reject links |
| `portal/approval:responded` | Client responds to approval | Notify Luke |
| `portal/invoice:sent` | Admin sends invoice | Email client with pay link |
| `portal/invoice:paid` | Client pays invoice | Notify Luke, update invoice status |
| `portal/invoice:overdue` | Scheduled check | Send overdue reminder to client |

---

## Frontend Routes

### Client-Facing (public, token-validated)

| Route | Page | Description |
|-------|------|-------------|
| `/portal/[token]` | Proposal | View and approve/decline proposal |
| `/portal/[token]/dashboard` | Dashboard | Engagement overview, activity feed, pending actions |
| `/portal/[token]/deliverables` | Deliverables | List grouped by milestone, download files, accept |
| `/portal/[token]/invoices` | Invoices | View all, pay, download receipts |
| `/portal/[token]/approvals` | Approvals | Pending decisions, approve/reject |
| `/portal/login` | Login | Email + password login for returning clients |

### Admin (authenticated, permission-gated)

| Route | Page | Description |
|-------|------|-------------|
| `/admin/clients` | Client List | All engagements with status, client, value |
| `/admin/clients/[id]` | Engagement Detail | Full management view: proposals, milestones, deliverables, invoices, approvals |

---

## Notifications

### Client Receives Email When:
- Proposal sent (magic link to view & approve)
- Proposal approved (confirmation + portal link)
- New deliverable shared
- Approval requested (with one-click approve/reject links)
- Invoice sent (with pay link)
- Invoice overdue reminder
- Milestone completed

### Luke Receives Notification When:
- Client approves/declines a proposal
- Client approves/rejects an approval request
- Client pays an invoice
- Magic link used (client activity signal)

### Implementation
- Each notification is an Inngest event
- Event handlers send emails via the existing notification module
- Emails are clean and branded with a magic link to the relevant portal page
- No in-portal messaging — clients communicate via email/WhatsApp naturally

---

## Payment Design

Designed to support both Stripe and bank transfer, wired up later.

### Stripe Flow (future)
1. Client clicks "Pay" on invoice
2. Creates Stripe Checkout session with invoice amount
3. Redirects to Stripe
4. Webhook confirms payment → updates invoice status → fires `portal/invoice:paid`

### Bank Transfer Flow (future)
1. Client clicks "Pay by Bank Transfer" on invoice
2. Shown bank details + reference number
3. Luke manually marks as paid from admin → fires `portal/invoice:paid`

### For Now
- Invoices can be created and sent
- Payment status updated manually from admin
- Stripe/bank transfer integration added when ready

---

## Activity Feed

The dashboard shows a chronological activity feed built from existing data rather than a separate activity table. Constructed by querying:

- Proposal status changes (sent, approved)
- Milestone status changes (started, completed)
- Deliverables shared and accepted
- Approval requests and responses
- Invoices sent and paid

Each item rendered with timestamp, icon, and description. Most recent first.
