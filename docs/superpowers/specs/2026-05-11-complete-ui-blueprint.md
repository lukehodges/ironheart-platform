# Ironheart Complete UI Blueprint

> **Date**: 2026-05-11
> **Purpose**: Map every page, every component, every click target, every data shape. No dead ends. Complete product.

---

## Shared Components (Build Once, Use Everywhere)

These components appear across multiple pages. Build them as reusable components in `src/components/shared/` so every page renders consistently.

### SC-01: Entity Header
**Used on:** Client detail, customer detail, booking detail, deal detail, workflow detail, invoice detail
```
Props: { avatar (initials + color), title, subtitle (eyebrow), pills (status badges), stats (inline vital numbers), actions (buttons) }
```
Pattern: Large avatar left, serif title, eyebrow ID/type, pill row, vital stats right-aligned, action buttons far right.

### SC-02: Stage Pipeline Strip
**Used on:** Client hub, engagement overview, deal detail
```
Props: { stages: { id, label, done, current }[], currentDay?, totalDays? }
```
Pattern: Horizontal strip with numbered circles, check marks for done, accent ring for current, mono labels below.

### SC-03: Activity Timeline
**Used on:** Client hub, dashboard, customer detail, engagement overview, inbox
```
Props: { groups: { label: string, items: { time, icon, iconTone, title, meta, link? }[] }[] }
```
Pattern: Grouped by date, each item has colored icon + bold who + dim what + mono when. Click navigates.

### SC-04: Connection Map
**Used on:** Client hub, customer detail
```
Props: { cards: { icon, iconTone, label (eyebrow), value, count (mono), href }[] }
```
Pattern: 6-col grid of mini cards, each with icon top-left, arrow-up-right top-right, eyebrow label, value, count.

### SC-05: Stat Card
**Used on:** Dashboard, analytics, payments, platform admin, customers, forms
```
Props: { eyebrow, value (serif number), delta (mono, colored), hint, icon? }
```
Pattern: Card with eyebrow top, big serif number, delta + hint bottom. Click drills into detail.

### SC-06: Data Table
**Used on:** Clients list, customers, invoices, platform tenants, audit log, team, forms submissions
```
Props: { columns: { key, label, mono?, width? }[], rows: Record[], onRowClick?, selectedId? }
```
Pattern: Card wrapper, mono uppercase headers (9px), hover rows, status dots/pills inline. Selected row highlighted.

### SC-07: Right Rail
**Used on:** Client hub, booking detail, customer detail, inbox detail
```
Props: { children (cards stacked vertically) }
```
Pattern: 320px wide, surface-2 background, padded, scrollable. Contains contextual cards.

### SC-08: Mini Card (for right rail)
**Used on:** Contacts card, pinned notes, recent activity, AI summary
```
Props: { eyebrow, children, action? }
```
Pattern: ih-card, eyebrow header with optional action button, bordered bottom on items.

### SC-09: Filter Tabs
**Used on:** Clients list, customers, bookings, payments, forms, reviews
```
Props: { tabs: { label, count?, active? }[], onChange }
```
Pattern: Horizontal button row, active tab has ghost background + weight 500, inactive is quiet.

### SC-10: Segment Rail
**Used on:** Clients list, inbox
```
Props: { groups: { title?, items: { label, count, icon?, dot?, active? }[] }[] }
```
Pattern: Vertical sidebar-style rail, 260px, surface-2 background, grouped with eyebrow headers.

### SC-11: Empty State
**Used on:** Any page/section with no data
```
Props: { icon, title, description, action?: { label, href } }
```
Pattern: Centered, large dim icon, serif title, description, accent CTA button.

### SC-12: Confirmation Dialog
**Used on:** Stage transitions, deletions, approvals, publishing
```
Props: { title, description, confirmLabel, confirmTone?, onConfirm, onCancel, children? (extra fields like reason textarea) }
```

### SC-13: Status Pill
**Used on:** Everywhere
```
Props: { status, size? }
```
Map: ACTIVE→ok, DRAFT→muted, SENT→warn, PAID→ok, OVERDUE→danger, COMPLETED→ok, IN_PROGRESS→accent, PENDING→warn, CANCELLED→muted

### SC-14: Notification Toast
**Used on:** After mutations (save, create, delete, approve, transition)
```
Props: { message, tone?, duration? }
```

---

## Demo Data Consistency

ALL pages must use the SAME demo entities so clicking through feels real:

### Clients/Engagements
```
Northwind Co.       — Q2 retainer, sprint 4, ACTIVE, AUDITING stage, Sarah Chen (founder)
Vellum & Co.        — Portal rebuild, PROJECT, IMPLEMENTING, Tom Reeves
Sea Glass Studio    — Discovery scoping, PROJECT, PROPOSAL, Mira Patel
Bowery Mills        — Monthly ops retainer, RETAINER, Jonas Hale
Brigham Architects  — Workflow rebuild, PROJECT, PAUSED, Eleanor Brigham (overdue invoice)
Pebble & Pine       — Initial discovery, PROJECT, DISCOVERY, Asha Kapoor
Acme Studios        — Q2 retainer, ACTIVE, Sarah Rowe
Olsen Brands        — Kickoff today, PROJECT, CONTRACTED, new client
```

### Team Members (Ironheart staff)
```
Luke Hodges (LH) — Owner, platform admin
Sam Park (SP)    — Ops lead
```

### Invoices (consistent across payments + client detail + portal)
```
NW-001  Northwind  Deposit           £12,250  Mar 20  PAID     Stripe
NW-002  Northwind  Audit findings    £6,125   Apr 04  SENT     Stripe pending
NW-003  Northwind  Handover          £6,125   —       DRAFT    Auto on milestone
VC-001  Vellum     Sprint 1          £8,400   Feb 14  PAID     Bank transfer
VC-002  Vellum     Sprint 2          £8,400   Mar 28  PAID     Stripe
BA-001  Brigham    Phase 1           £4,000   Mar 01  OVERDUE  — 
AC-001  Acme       Q2 M2 retainer    £14,200  Apr 28  SENT     Stripe pending
OB-001  Olsen      Discovery deposit £3,000   May 11  DRAFT    —
```

### Bookings (consistent across calendar + bookings + client detail)
```
Tue 13 May 10:00  Stand-up (internal, 30m, Sam)
Tue 13 May 11:30  Northwind sprint review (45m, Zoom, Mira)
Tue 13 May 14:00  Olsen kickoff (60m, discovery, 3 attendees)
Tue 13 May 16:00  Acme invoice review (20m, Sarah)
Wed 14 May 09:00  Stand-up (internal, 15m, Sam)
Wed 14 May 14:00  Brigham check-in (30m, Eleanor)
Thu 15 May 10:00  Sea Glass discovery call (15m, Mira)
Fri 16 May 15:00  Northwind stakeholder demo (45m, HQ)
```

### Workflows
```
WF-204  Onboarding · Northwind     12 runs, 100% ok, triggered on new booking
WF-887  Stripe sync                186 runs, 1 paused (rate limit), hourly
WF-310  Monthly digest             3 runs, all sent, 1st of month
WF-102  Invoice chase              8 runs, 2 active, on overdue trigger
WF-445  Discovery follow-up        14 runs, 100% ok, 60min after call
```

### Forms
```
questionnaire-owner-director    Owner/Director       12 submissions, 92% complete rate
questionnaire-operations        Operations           8 submissions, 88% complete rate
questionnaire-finance-admin     Finance/Admin        6 submissions, 100% complete rate
questionnaire-sales-marketing   Sales/Marketing      5 submissions, 80% complete rate
questionnaire-team-member       Team Member          18 submissions, 94% complete rate
questionnaire-quick-pulse       Quick Pulse          24 submissions, 96% complete rate
questionnaire-general           General Pre-Audit    4 submissions, 100% complete rate
discovery-intake                Discovery Intake     14 submissions, 100% complete rate
```

---

## Page-by-Page Blueprint

### TIER 1: Core Product Flows

---

#### P-01: Client Hub Tab Content
**Route:** `/admin/clients/[id]` (tab views within the hub page)
**Current state:** Hub page has 9 tabs but only Overview has real content.

Each tab renders inline (not separate routes) using state. Content:

**Engagements tab:**
- List of all engagements for this client (most have 1, some have 2+)
- Each row: title, stage pipeline mini-strip, type badge, dates, value
- "New engagement" button
- Shows audit-only vs full implementation vs retainer

**Bookings tab:**
- Filtered booking list for this client only
- Same row pattern as bookings page but filtered
- "Book new session" button
- Shows upcoming + past with toggle

**Deals tab:**
- Pipeline deals associated with this client
- Stage column, value, probability, next action
- "New deal" button

**Invoices tab:**
- Invoice table filtered to this client
- Same columns as payments page: number, description, amount, status, method
- Running totals at top: total invoiced, paid, outstanding

**Workflows tab:**
- Workflows attached to this client/engagement
- Health dots, run counts, last execution
- "Attach workflow" button

**Documents tab:**
- Google Drive files linked to engagement
- File name, type icon, uploaded date, size
- "Upload" button + "Open Drive folder" link

**Activity tab:**
- Full activity timeline for this client (uses SC-03)
- Merges: stage transitions, deliverables, approvals, invoices, bookings, notes, emails

**Team tab:**
- Client's contacts (from onboarding) + Ironheart staff assigned
- Two sections: "Client team" (contacts with questionnaire/call status) + "Our team" (assigned consultants)

---

#### P-02: New Client Flow
**Route:** `/admin/clients/new` — REBUILD
**Design:**
- Step wizard or single-page form
- Fields: Company name, primary contact (name, email, phone), industry, source (referral/outreach/inbound), engagement type, title, notes
- On submit: creates customer + engagement at DISCOVERY, navigates to client hub
- Uses Ironheart form styling (ih-input, ih-card sections)

---

#### P-03: Proposal Detail
**Route:** `/admin/clients/[id]/proposals/[proposalId]`
**Design:**
- Branded proposal view (like the client sees it)
- Sections: scope, deliverables, payment schedule, ROI calculator, terms
- Status bar: DRAFT → SENT → APPROVED/DECLINED
- Actions: Edit, Send to Client, Download PDF, Clone as Template
- Side panel: proposal history (versions), client activity (viewed, opened)

---

#### P-04: New/Edit Proposal
**Route:** `/admin/clients/[id]/proposals/new` — REBUILD
**Design:**
- Form with sections matching the proposal template:
  - Problem statement (textarea)
  - Scope sections (repeatable: title, description, type, estimated duration)
  - Line items per section (repeatable: title, description, acceptance criteria)
  - Exclusions (repeatable list)
  - Requirements (repeatable list)
  - Payment schedule (milestone triggers + amounts)
  - ROI calculator (hours/week, automation %, hourly rate)
  - Terms (textarea)
- Preview toggle: see the branded proposal as the client will see it
- Save as draft / Send to client

---

#### P-05: Client Portal Sub-Pages
**Route:** `/dashboard/*`
**Current state:** Only overview page exists. Portal sidebar references: Deliverables, Approvals, Invoices, Sessions, Documents, Messages.

**Deliverables page** (`/dashboard/deliverables`):
- List of all deliverables for the engagement
- Status dots (accepted/delivered/pending)
- File download links
- Accept/comment buttons for delivered items

**Approvals page** (`/dashboard/approvals`):
- Pending approvals requiring client sign-off
- Each approval: title, description, deliverable link, approve/comment buttons
- Approved history below

**Invoices page** (`/dashboard/invoices`):
- Invoice list with status pills
- Click into detail: line items, payment button (Stripe), receipt download
- Outstanding total at top

**Sessions page** (`/dashboard/sessions`):
- Upcoming bookings with this consultant
- Book new session (within audit window if applicable)
- Past sessions with notes preview

**Documents page** (`/dashboard/documents`):
- Files from Google Drive engagement folder
- Organized by type: Proposals, Contracts, Reports, Deliverables
- Download links

**Messages page** (`/dashboard/messages`):
- Simple message thread between client and consultant
- Threaded conversation, file attachments
- Notification when new message

---

### TIER 2: Essential Admin Detail Pages

---

#### P-06: Booking Detail
**Route:** `/admin/bookings/[id]`
**Design:**
- Entity header: time, duration, client name, type badge, status
- Two-column: left (details card, notes, attendees), right rail (client context, related engagement, AI prep)
- Actions: Reschedule, Cancel, Mark Complete, Add Notes
- Notes section with auto-save
- Related records: linked engagement, linked invoice

---

#### P-07: New Booking
**Route:** `/admin/bookings/new`
**Design:**
- Client selector (search existing)
- Booking type: Discovery (15m), Audit call (20m/90m), Sprint review (30m), Checkpoint (30m), Custom
- Date/time picker (shows availability)
- Attendees (from client contacts + staff)
- Location: Zoom/Phone/On-site
- Notes
- "Book" button → creates booking, sends calendar invite

---

#### P-08: Pipeline Deal Detail
**Route:** `/admin/pipeline/[id]`
**Design:**
- Entity header: deal name, stage pill, value (serif number), probability
- Stage pipeline strip (like client detail but for pipeline stages: New → Qualified → Proposal → Negotiation → Won/Lost)
- Two-column: left (deal info, contact, activity), right rail (qualification data, next action, related client)
- Actions: Move to next stage, Create proposal, Convert to engagement, Mark lost (with reason)
- Activity timeline: outreach history, calls, emails, notes

---

#### P-09: Customer Detail
**Route:** `/admin/customers/[id]`
**Design:**
- Entity header: avatar, name, company, contact info (email/phone), tags, "client since" date
- Connection map: engagements, bookings, invoices, forms submitted, reviews, notes
- Two-column: left (engagement history, booking history, spend chart), right rail (contacts, AI summary, pinned notes, tags)
- Tabs: Overview, Engagements, Bookings, Invoices, Forms, Notes
- Actions: Edit, Add note, Merge, Anonymise

---

#### P-10: Invoice Detail
**Route:** `/admin/payments/[id]`
**Design:**
- Entity header: invoice number (mono), client name, amount (serif), status pill, due date
- Invoice body: line items table (description, quantity, rate, amount), subtotal, VAT, total
- Payment info: method, paid date, reference, Stripe link
- Actions: Send, Mark as Paid, Record Payment, Void, Download PDF, Send Chase
- Timeline: sent, viewed, paid events
- Related: engagement, proposal payment rule

---

#### P-11: New Invoice
**Route:** `/admin/payments/new`
**Design:**
- Client selector
- Line items (repeatable: description, quantity, rate, amount)
- Auto-calculate totals
- Due date, payment terms
- Link to engagement/milestone
- Send immediately or save as draft

---

#### P-12: Workflow Detail/Editor
**Route:** `/admin/workflows/[id]` — REBUILD
**Design:**
- Visual canvas: node graph with connections (matching the workflow canvas page)
- Node palette: trigger types, action types, conditions, loops
- Selected node inspector: configuration panel on the right
- Execution log: recent runs with status, duration, step-by-step trace
- Actions: Save, Activate/Deactivate, Run Test, Clone, Delete

---

#### P-13: Form Template Editor
**Route:** `/admin/forms/[id]`
**Design:**
- Left: form preview (live updating)
- Right: field editor — drag-to-reorder, add field (8 types), configure per field (label, required, options, validation)
- Header: template name (editable), description, send timing, requires signature toggle
- Submission list tab: table of all submissions for this template
- Actions: Save, Preview, Copy Share Link, Delete

---

#### P-14: Form Submission Detail
**Route:** `/admin/forms/submissions/[id]`
**Design:**
- Header: form name, submitted by, client, date, status
- Response viewer: each field label + response value, cleanly laid out
- Signature display if present
- Link to related booking/engagement
- Export as PDF

---

### TIER 3: Module Rebuilds

---

#### P-15: Reviews Page
**Route:** `/admin/reviews` — REBUILD
**Design:**
- Header: "34 reviews. 4.8 average." with trend
- Stat cards: avg rating, response rate, NPS, sentiment breakdown
- Filter tabs: All, Published, Pending, Flagged
- Review cards: star rating (visual), client name, date, text, sentiment pill, publish/unpublish toggle
- Automation panel: auto-request settings, screening thresholds

---

#### P-16: Outreach Pages
**Route:** `/admin/outreach/*` — REBUILD all 5 pages
- **Outreach main**: Active sequences, performance stats, daily touch count vs target
- **Sequences**: Sequence list with open/reply/conversion rates per sequence
- **Templates**: Email/LinkedIn/phone templates with A/B variant performance
- **Contacts**: Outreach contact list with status (contacted/responded/ghosted)
- **Replies**: Inbox for outreach replies with categorization (interested/not now/not interested)

---

#### P-17: Team Pages
**Route:** `/admin/team/*` — REBUILD
- **Team list**: Staff grid/table with role, department, availability status, active engagements
- **Team member detail**: Profile, skills, certifications, availability calendar, assigned engagements, hours logged
- **Departments**: Department cards with member counts, head count

---

#### P-18: AI Chat
**Route:** `/admin/ai-chat` — REBUILD
- Full-page AI conversation interface
- Context selector: choose client/engagement/module context
- Conversation history
- Tool use visualization (when AI queries data)
- Quick actions: /summarise, /draft, /find, /compare

---

## Click Target Map (What Links to What)

### Dashboard Page
| Click Target | Navigates To |
|---|---|
| Priority card "Review · $14.2k" | `/admin/payments/inv_2041` |
| Priority card "Open prep doc" | `/admin/bookings/bk_olsen` |
| Priority card "Resume run" | `/admin/workflows/wf_887` |
| Stat card "Active engagements" | `/admin/clients?stage=active` |
| Stat card "Bookings · 7d" | `/admin/bookings` |
| Stat card "Pipeline value" | `/admin/pipeline` |
| Stat card "Outstanding inv." | `/admin/payments?status=outstanding` |
| Activity row (any) | Relevant detail page |
| Schedule item (any) | `/admin/bookings/[id]` |
| "+ New" button | Client creation or command palette |
| "Ask copilot" button | Opens AI copilot drawer |

### Clients List Page
| Click Target | Navigates To |
|---|---|
| Client row | `/admin/clients/[id]` (client hub) |
| Segment item | Filters the list |
| "New client" button | `/admin/clients/new` |
| Preview drawer "Open" | `/admin/clients/[id]` |

### Client Hub Page
| Click Target | Navigates To |
|---|---|
| Tab: Overview | Inline tab content |
| Tab: Engagements | Inline — engagement cards |
| Tab: Bookings | Inline — booking list |
| Tab: Deals | Inline — deal cards |
| Tab: Invoices | Inline — invoice table |
| Tab: Workflows | Inline — workflow cards |
| Tab: Documents | Inline — file list |
| Tab: Activity | Inline — timeline |
| Tab: Team | Inline — contacts + staff |
| Connection map card | Opens relevant list page with client filter |
| "Open workspace" button | `/admin/clients/[id]/audit` |
| Sprint progress card | `/admin/clients/[id]/work` |
| Booking row | `/admin/bookings/[id]` |
| Invoice row | `/admin/payments/[id]` |
| Workflow card | `/admin/workflows/[id]` |
| Contact row | Customer detail or edit |
| "New booking" | `/admin/bookings/new?client=[id]` |

### Pipeline Page
| Click Target | Navigates To |
|---|---|
| Deal card | `/admin/pipeline/[id]` |
| "Add deal" | `/admin/pipeline/new` |
| Forecast number | Analytics drill-down |

### Bookings Page
| Click Target | Navigates To |
|---|---|
| Booking row | `/admin/bookings/[id]` |
| Day rail event | `/admin/bookings/[id]` |
| "New booking" | `/admin/bookings/new` |
| AI prep "Open prep doc" | Related document |
| Client name in row | `/admin/clients/[id]` |

### Payments Page
| Click Target | Navigates To |
|---|---|
| Invoice row | `/admin/payments/[id]` |
| "New invoice" | `/admin/payments/new` |
| Overdue chase "Chase" | Opens chase action (email draft) |
| Client name | `/admin/clients/[id]` |

### Inbox Page
| Click Target | Navigates To |
|---|---|
| Message row | Selects in detail panel |
| Detail panel "Approve" | Executes approval action |
| Related links | Navigate to entity |
| Source filter | Filters the stream |
| Client filter | Filters the stream |

### Forms Page
| Click Target | Navigates To |
|---|---|
| Template card "Edit" | `/admin/forms/[id]` |
| "New template" | `/admin/forms/new` |
| Submission row | `/admin/forms/submissions/[id]` |

### Workflows Page
| Click Target | Navigates To |
|---|---|
| Workflow node/card | `/admin/workflows/[id]` |
| "New workflow" | `/admin/workflows/new` |
| Run log entry | `/admin/workflows/[id]/executions` |

### Analytics Page
| Click Target | Navigates To |
|---|---|
| Revenue bar (month) | Filtered payments view |
| Health grade card | `/admin/clients?health=[grade]` |
| Pipeline funnel stage | `/admin/clients?stage=[stage]` |
| Top client row | `/admin/clients/[id]` |

### Settings Page
| Click Target | Navigates To |
|---|---|
| Tab: General | Inline form |
| Tab: Team | Inline team list |
| Tab: Integrations | Inline connection cards |
| Tab: Billing | Inline billing info |
| Tab: Modules | Inline module toggles |
| Team member | `/admin/team/[id]` |
| Integration "Configure" | Opens config panel |

---

## Build Order

### Wave 1: Shared Components (SC-01 through SC-14)
Build all shared components first. Every subsequent page uses them.

### Wave 2: Client Hub Tabs + Creation Flows
- Client hub tab content (inline)
- New client flow
- Proposal detail + creation

### Wave 3: Detail Pages
- Booking detail + creation
- Pipeline deal detail
- Customer detail
- Invoice detail + creation

### Wave 4: Editor Pages
- Workflow editor
- Form template editor
- Form submission viewer

### Wave 5: Portal Depth
- 6 client portal sub-pages

### Wave 6: Module Rebuilds
- Reviews
- Outreach (5 pages)
- Team (3 pages)
- AI Chat

### Wave 7: Polish
- Every click target verified
- Consistent demo data across all pages
- Loading states, empty states, error states
- Confirmation dialogs on all destructive actions
