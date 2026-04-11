# Admin Client Management Pages — Design Spec

Convert all HTML mockups from `.superpowers/brainstorm/63013-1775327512/content/admin-*.html` into production Next.js pages wired to the existing `clientPortal.admin.*` tRPC procedures.

## Route Structure

```
src/app/admin/clients/
  page.tsx                          — Engagement list
  new/page.tsx                      — Create engagement form
  [engagementId]/page.tsx           — Tabbed engagement detail
  [engagementId]/proposals/new/page.tsx — Create proposal builder
```

All routes live under the existing admin layout (`src/app/admin/layout.tsx`). The sidebar "Clients" nav item links to `/admin/clients`.

## Components Directory

```
src/components/clients/
  engagement-stats-cards.tsx
  engagement-filters.tsx
  engagement-table.tsx
  engagement-row.tsx
  overview-tab.tsx
  proposals-tab.tsx
  milestones-tab.tsx
  milestone-card.tsx
  deliverables-tab.tsx
  invoices-tab.tsx
  approvals-tab.tsx
  payment-timeline.tsx
  proposal-form.tsx
  deliverable-list-builder.tsx
  payment-schedule-builder.tsx
  create-invoice-dialog.tsx
  share-deliverable-dialog.tsx
  request-approval-dialog.tsx
  mark-paid-dialog.tsx
  add-milestone-dialog.tsx
  edit-engagement-sheet.tsx
  create-engagement-form.tsx
```

## Page 1: Client List (`/admin/clients`)

**Mockup:** `admin-client-list.html`

### Layout
- PageHeader: "Clients" with description "Manage client engagements and proposals." and "New Engagement" button (links to `/admin/clients/new`)
- 3 stat cards in a grid: Active Engagements, Total Pipeline Value, Proposals Pending
- Search bar + status filter chips (All, Active, Proposed, Draft, Completed)
- Engagement table with columns: Client, Engagement, Type, Status, Value, Last Activity, Actions (dots menu)
- Pagination footer

### Data Flow
- `clientPortal.admin.listEngagements` — filtered by status, type, search text
- Stats are computed client-side from the returned list (or we can add a dedicated stats query later if pagination makes this inaccurate)
- Row click navigates to `/admin/clients/[engagementId]`
- Dots menu: View, Edit, Archive

### Components
- `EngagementStatsCards` — 3 stat cards, receives engagement list
- `EngagementFilters` — search input + chip buttons, controls parent state
- `EngagementTable` — renders `<Table>` with `EngagementRow` children
- `EngagementRow` — single table row with badges, formatted currency, relative time

### Notes
- The mockup shows client name in the table. The `EngagementRecord` has `customerId` but not `customerName`. The `listEngagements` service will need to join customer data. If it doesn't already, we'll need to update the repository to include customer name in the response. This is the one potential backend change needed.

## Page 2: Engagement Detail (`/admin/clients/[engagementId]`)

**Mockup:** `admin-engagement-detail.html`, `admin-manage-milestones.html`, `admin-manage-invoices.html`

### Layout
- Back link: "Back to Clients" → `/admin/clients`
- Engagement header: title, client name, type badge, status badge, Edit button
- Tab bar with 6 tabs (client-side state, no URL change): Overview, Proposals, Milestones, Deliverables, Invoices, Approvals

### Data Flow
- `clientPortal.admin.getEngagement` — returns engagement with related data
- Tab-specific data loaded on tab select (or eagerly if the response includes everything)

### Tab: Overview
**Mockup:** `admin-engagement-detail.html` Overview tab

- 2-column grid:
  - Left: "Engagement Details" card — type, start date, target completion, total value, amount paid, outstanding
  - Right top: "Quick Actions" card — buttons for Send Invoice, Share Deliverable, Request Approval, Add Milestone (each opens a dialog)
  - Right bottom: "Current Proposal" card — scope summary, deliverable count, payment schedule count, "View full proposal" link
- Full-width: "Recent Activity" card — activity feed with colored dots, text, timestamps

### Tab: Proposals
- List of proposals for this engagement
- Each shows: status badge, scope preview, price, sent date, action buttons
- "New Proposal" button → navigates to `/admin/clients/[id]/proposals/new`

### Tab: Milestones
**Mockup:** `admin-manage-milestones.html`

- Header: milestone count summary + "Add Milestone" button (opens dialog)
- Milestone cards in a vertical list:
  - Drag handle (6-dot grip) for reordering
  - Inline-editable title (input with dashed underline on hover/focus)
  - Subtitle: deliverable count + payment amount
  - Date input (inline editable)
  - Status stepper: 3 clickable segments (Upcoming / In Progress / Completed) — clicking one updates the status via `updateMilestone`
  - Expand toggle: shows nested deliverables with checkbox status
  - Dots menu: delete, add deliverable
- Active milestone has blue border highlight and "Current" badge
- Completed deliverables show strikethrough text + green "Approved"/"Delivered" badge

**Interactions:**
- Drag reorder: updates `sortOrder` via `updateMilestone` for affected milestones
- Status stepper click: `updateMilestone({ id, status })`
- Inline title edit: debounced `updateMilestone({ id, title })` on blur
- Inline date edit: `updateMilestone({ id, dueDate })` on change

### Tab: Deliverables
- Table view of all deliverables across all milestones
- Columns: Title, Milestone, Status, Delivered Date, Actions
- "Share Deliverable" button opens dialog

### Tab: Invoices
**Mockup:** `admin-manage-invoices.html`

- 3 stat cards: Total Invoiced (with progress bar vs total value), Paid, Outstanding
- Payment schedule reference card (dashed border, links to proposal)
- Invoice table: Invoice #, Description, Amount, Status, Due Date, Sent Date, Actions
  - Paid invoices: "View" button only
  - Sent invoices: "Mark Paid" button → opens MarkPaidDialog
  - Draft invoices: "Send" button → calls `sendInvoice`
  - Scheduled (not yet created): "Create" button → opens CreateInvoiceDialog
- Payment Timeline visualization (horizontal stepper with checkmarks for paid, clock for pending)

### Tab: Approvals
- List of approval requests
- Each shows: title, description, status badge, linked deliverable/milestone, client comment (if responded), responded date
- "Request Approval" button opens dialog

## Page 3: New Engagement (`/admin/clients/new`)

**Mockup:** `admin-create-engagement.html`

### Layout
- Back link: "Back to Clients" → `/admin/clients`
- Page title: "New Engagement"
- Single card form:
  - Client selector: search input with dropdown (searches existing customers), "Create new client" option at bottom
  - Engagement title: text input
  - Type toggle: Project | Retainer (segmented button)
  - Description: textarea
  - Start date: date input (optional)
- Footer: "Create as Draft" (outline button) + "Create & Add Proposal" (primary button)

### Data Flow
- Client search: needs a customer search/list query. The existing repo has `findCustomerByEmail` but no general search. Add `searchCustomers(tenantId, query)` to the repository and a `searchCustomers` procedure to the admin router.
- Submit: `clientPortal.admin.createEngagement`
- "Create & Add Proposal": creates engagement, then navigates to `/admin/clients/[newId]/proposals/new`

## Page 4: Create Proposal (`/admin/clients/[engagementId]/proposals/new`)

**Mockup:** `admin-create-proposal.html`

### Layout
- Back link: "Back to [Client Name]" → `/admin/clients/[engagementId]`
- Header: "Create Proposal" with engagement context subtitle, Preview button
- Narrow container (max-width: 800px)

### Form Sections

**Scope of Work:**
- Textarea, min-height 140px

**Deliverables:**
- Header row: "Deliverables" label + hint + "Add Deliverable" button
- List of deliverable items, each with:
  - Numbered circle (1, 2, 3...)
  - Title input
  - Description textarea (shorter, min-height 48px)
  - Remove button (trash icon, red on hover)
- Add button appends a new empty item

**Total Price:**
- Currency input with pound sign prefix, 200px width
- "Excluding VAT" hint

**Payment Schedule:**
- Header row: "Payment Schedule" label + hint + "Add Line" button
- Column headers: Description | Amount | Due | (remove)
- Grid rows, each with:
  - Description text input
  - Amount input (tabular nums)
  - Due type select: On proposal acceptance, On milestone completion, Specific date, On completion
  - Remove button (X icon)
- Footer: running total that sums amounts

**Terms & Conditions:**
- Textarea, min-height 120px
- Pre-populated with default terms

### Footer Actions
- Cancel (ghost button) → navigates back
- Save Draft (outline button) → `createProposal` only
- Send to Client (primary button with send icon) → `createProposal` then `sendProposal`

### Validation
- Scope required
- At least 1 deliverable with a title
- Price > 0
- Payment schedule amounts should sum to total price (warning, not blocking)
- Each payment schedule item needs a label and amount

## Dialogs

### CreateInvoiceDialog
- Amount (currency input)
- Description (text input)
- Due date (date picker)
- Optional: link to milestone (select from engagement milestones)
- Submit: `createInvoice` → optionally `sendInvoice` with "Create & Send" button

### ShareDeliverableDialog
- Title (text input)
- Description (textarea)
- Milestone (optional select)
- File upload (URL input for now — file upload can be added later)
- Submit: `createDeliverable` → `deliverDeliverable`

### RequestApprovalDialog
- Title (text input)
- Description (textarea)
- Link to deliverable (optional select)
- Link to milestone (optional select)
- Submit: `createApproval`

### MarkPaidDialog
- Payment method: Stripe | Bank Transfer (radio/select)
- Payment reference (optional text input)
- Submit: `markInvoicePaid`

### AddMilestoneDialog
- Title (text input)
- Description (optional textarea)
- Due date (optional date picker)
- Submit: `createMilestone`

### EditEngagementSheet
- Side sheet with current values pre-filled
- Fields: title, type, status, description, start date, end date
- Submit: `updateEngagement`

## Technical Decisions

### State Management
- All data fetching via tRPC `useQuery` / `useMutation` with React Query
- Tab state: `useState` in the engagement detail page, no URL params
- Optimistic updates for inline edits (milestone title, date, status)
- `utils.clientPortal.admin.getEngagement.invalidate()` after mutations

### Drag & Drop (Milestones)
- Use `@dnd-kit/core` + `@dnd-kit/sortable` if already in the project, otherwise use a simple `onDragStart/onDragEnd` with HTML5 drag API
- On drop: compute new sort orders and batch `updateMilestone` calls

### Currency Formatting
- Store as integer cents in the backend (already the case)
- Display with `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`
- Input: strip non-numeric, parse to cents on submit

### Backend Changes Required
Two small backend additions are needed:

1. **`listEngagements` must join customers:** The current `listEngagements` repo method selects only from `engagements`. The mockup shows client name in every row. Add an inner join with `customers` and return `customerName` and `customerEmail` alongside each engagement. Update `EngagementRecord` (or create an `EngagementWithCustomer` type) to include these fields.

2. **`searchCustomers` query:** The "New Engagement" form needs a client search dropdown. The repo has `findCustomerByEmail` (exact match) but no search. Add `searchCustomers(tenantId, query: string)` to the repository that does `ilike` on name and email, and expose it as `clientPortal.admin.searchCustomers` in the router.

### Existing UI Components Used
- `Button`, `Card`, `Table`, `Badge`, `Dialog`, `Sheet`, `Tabs`, `Input`, `Textarea`, `Select`, `Label`, `Separator`, `Skeleton`, `DropdownMenu`, `Tooltip`, `PageHeader`
- All from existing `src/components/ui/`

### Loading States
- Use `Skeleton` components matching the layout shape
- Each tab can show its own loading state independently

### Error Handling
- tRPC errors caught by the global error formatter
- Form validation errors shown inline below fields
- Toast notifications for successful mutations (create, send, mark paid, etc.)

## Out of Scope
- File upload for deliverables (URL input placeholder for now)
- Email notifications (backend events exist but email templates are mockup-only)
- Client portal dashboard pages (separate spec)
- Proposal preview/PDF generation
- Drag-and-drop for deliverable reordering within milestones
