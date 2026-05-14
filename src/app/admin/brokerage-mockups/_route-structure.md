# Brokerage Mockups — Route Structure

> All routes under `src/app/admin/brokerage-mockups/`
> These are mockup pages only — no real data connections. All data is hardcoded/mock.
> Designed for BNG/Nutrient Credit brokerage as the first vertical.

---

## Route Tree

```
src/app/admin/brokerage-mockups/
│
├── layout.tsx                          # Shared layout with brokerage sidebar nav
├── page.tsx                            # Mockup index — links to all sections
│
├── _data/                              # Shared mock data (not a route)
│   ├── deals.ts                        # Mock deals with stages, contacts, values
│   ├── sites.ts                        # Mock gain sites with units, coordinates
│   ├── contacts.ts                     # Mock contacts (landowners + developers)
│   ├── allocations.ts                  # Mock unit allocations
│   ├── compliance.ts                   # Mock compliance items and deadlines
│   ├── activities.ts                   # Mock deal/site activity feeds
│   └── financials.ts                   # Mock commissions, invoices, payments
│
│
│ ═══════════════════════════════════════════════════════════════
│  1. DASHBOARD
│ ═══════════════════════════════════════════════════════════════
│
├── dashboard/
│   └── page.tsx                        # Main brokerage operations dashboard
│                                       #   - Pipeline value summary (total, by stage)
│                                       #   - Credits available vs allocated gauge
│                                       #   - Commission earned (MTD / YTD)
│                                       #   - Overdue compliance count + alerts
│                                       #   - Deals by stage bar chart
│                                       #   - Recent activity feed
│                                       #   - Upcoming assessments
│                                       #   - Quick actions (new deal, new site, new contact)
│
│
│ ═══════════════════════════════════════════════════════════════
│  2. DEALS PIPELINE
│ ═══════════════════════════════════════════════════════════════
│
├── deals/
│   ├── page.tsx                        # Deals list — dual view toggle:
│   │                                   #   - Kanban board (drag-drop between stages)
│   │                                   #   - Table/list view with sortable columns
│   │                                   #   Filters: stage, contact, assignee, unit type,
│   │                                   #            date range, catchment area, value range
│   │                                   #   Toolbar: new deal button, export, bulk actions
│   │
│   ├── [id]/
│   │   └── page.tsx                    # Deal detail page
│   │                                   #   - Header: deal number, title, stage badge,
│   │                                   #     probability, assigned broker
│   │                                   #   - Stage progress bar (clickable to advance)
│   │                                   #   - Parties section: supply contact + demand contact
│   │                                   #     cards with links to contact profiles
│   │                                   #   - Linked site card (if supply deal)
│   │                                   #   - Financials: estimated value, commission rate,
│   │                                   #     commission amount, payment status
│   │                                   #   - Unit details: type, quantity, catchment area
│   │                                   #   - Activity timeline: stage changes, notes, emails,
│   │                                   #     calls, documents, tasks
│   │                                   #   - Add activity form (note/call/email/task)
│   │                                   #   - Documents section (uploaded files)
│   │                                   #   - Related compliance items
│   │                                   #   - Matching suggestions (if unmatched demand deal)
│   │
│   └── new/
│       └── page.tsx                    # New deal creation form
│                                       #   - Side selection (supply / demand)
│                                       #   - Contact picker (existing or create new)
│                                       #   - Deal title, description
│                                       #   - Unit type, quantity, catchment area
│                                       #   - Estimated value, expected close date
│                                       #   - Assign to broker
│                                       #   - Link to existing site (supply deals)
│
│
│ ═══════════════════════════════════════════════════════════════
│  3. SITES / GAIN SITES (supply-side inventory)
│ ═══════════════════════════════════════════════════════════════
│
├── sites/
│   ├── page.tsx                        # Sites list — dual view toggle:
│   │                                   #   - Table view with sortable columns
│   │                                   #   - Map view with site pins (Leaflet/Mapbox)
│   │                                   #   Columns: reference, name, status, contact,
│   │                                   #            catchment, total units, available units,
│   │                                   #            unit price, LPA
│   │                                   #   Filters: status, catchment area, unit type,
│   │                                   #            LPA, availability (has available units)
│   │
│   ├── [id]/
│   │   └── page.tsx                    # Site detail page
│   │                                   #   - Header: reference, name, status badge
│   │                                   #   - Location: address, map pin, boundary (future)
│   │                                   #   - Owner contact card (linked landowner)
│   │                                   #   - Geographic constraints: catchment, LPA, region
│   │                                   #   - Registration: registry ref, date, legal agreement
│   │                                   #     type, commitment years, expiry
│   │                                   #   - Capacity panel: total / allocated / available
│   │                                   #     units with gauge chart, unit type, unit price
│   │                                   #   - Allocations table: all allocations from this
│   │                                   #     site with status, deal link, buyer contact
│   │                                   #   - Assessment info: date, assessor, report link
│   │                                   #   - Baseline data display (vertical-specific)
│   │                                   #   - Documents list (upload/download)
│   │                                   #   - Activity timeline
│   │                                   #   - Linked deals table
│   │                                   #   - Compliance items for this site
│   │
│   └── new/
│       └── page.tsx                    # New site creation form
│                                       #   - Name, description
│                                       #   - Contact picker (landowner)
│                                       #   - Address fields + lat/lng
│                                       #   - Catchment area, LPA, region
│                                       #   - Unit type, total units, unit price
│                                       #   - Legal agreement type, commitment years
│
│
│ ═══════════════════════════════════════════════════════════════
│  4. INVENTORY / AVAILABILITY
│ ═══════════════════════════════════════════════════════════════
│
├── inventory/
│   ├── page.tsx                        # Inventory availability dashboard
│   │                                   #   - Summary cards per unit type:
│   │                                   #     total / allocated / available / reserved
│   │                                   #   - Availability by catchment area (grouped table
│   │                                   #     or heatmap)
│   │                                   #   - Gauge charts: allocated vs available per type
│   │                                   #   - Low stock alerts
│   │                                   #   - Price range analysis per unit type
│   │                                   #   - Filters: unit type, catchment, LPA, status
│   │
│   └── allocations/
│       ├── page.tsx                    # All allocations list
│       │                               #   - Table: reference, site, deal, buyer, unit type,
│       │                               #     quantity, price, total value, status
│       │                               #   - Filters: status, unit type, site, deal, date
│       │                               #   - Status badges: reserved, confirmed, delivered,
│       │                               #     cancelled
│       │
│       └── [id]/
│           └── page.tsx                # Allocation detail page
│                                       #   - Allocation reference, status, dates
│                                       #   - Linked site card
│                                       #   - Linked deal card
│                                       #   - Buyer contact card
│                                       #   - Unit details: type, quantity, price, total
│                                       #   - External references: planning ref, registry ref
│                                       #   - Status history / timeline
│
│
│ ═══════════════════════════════════════════════════════════════
│  5. MATCHING (supply <-> demand)
│ ═══════════════════════════════════════════════════════════════
│
├── matching/
│   └── page.tsx                        # Supply/demand matching tool
│                                       #   - Left panel: demand requirements
│                                       #     (unit type, quantity needed, catchment area,
│                                       #      budget, developer contact)
│                                       #   - Right panel: matching supply sites ranked by
│                                       #     price, proximity, available quantity
│                                       #   - Match result cards: site name, available units,
│                                       #     unit price, total cost, commission amount,
│                                       #     catchment match indicator
│                                       #   - Action: "Create Deal" from a match
│                                       #   - Unmatched demand deals list (deals needing
│                                       #     supply)
│                                       #   - Unmatched supply sites (sites with available
│                                       #     units and no pending deals)
│
│
│ ═══════════════════════════════════════════════════════════════
│  6. CONTACTS
│ ═══════════════════════════════════════════════════════════════
│
├── contacts/
│   ├── page.tsx                        # Contacts list (extended customers)
│   │                                   #   - Table: name, company, type (landowner/developer/
│   │                                   #     assessor), side (supply/demand), email, phone,
│   │                                   #     location, active deals count, tags
│   │                                   #   - Filters: side, company type, tags, location,
│   │                                   #     has active deals
│   │                                   #   - Tabs or toggle: All / Supply / Demand
│   │                                   #   - New contact button
│   │
│   ├── [id]/
│   │   └── page.tsx                    # Contact detail / profile page
│   │                                   #   - Header: name, company, type badge, side badge
│   │                                   #   - Contact info: email, phone, address, lat/lng
│   │                                   #   - Company details: name, type
│   │                                   #   - Deals tab: all deals involving this contact
│   │                                   #     (as supply or demand party)
│   │                                   #   - Sites tab: sites owned by this contact
│   │                                   #     (supply contacts only)
│   │                                   #   - Allocations tab: allocations linked to this
│   │                                   #     contact (demand contacts)
│   │                                   #   - Assessments tab: site visit bookings
│   │                                   #   - Notes tab: contact notes (existing feature)
│   │                                   #   - Documents section
│   │                                   #   - Activity timeline
│   │                                   #   - Financial summary: total deal value,
│   │                                   #     commission earned from this contact
│   │
│   └── new/
│       └── page.tsx                    # New contact creation form
│                                       #   - Side selection (supply / demand / both)
│                                       #   - Personal: name, email, phone
│                                       #   - Company: name, type (landowner, farmer,
│                                       #     housebuilder, developer, etc.)
│                                       #   - Address + lat/lng
│                                       #   - Tags
│
│
│ ═══════════════════════════════════════════════════════════════
│  7. ASSESSMENTS (site visits / surveys)
│ ═══════════════════════════════════════════════════════════════
│
├── assessments/
│   ├── page.tsx                        # Assessments list (bookings re-labelled)
│   │                                   #   - Table: reference, site, assessor, date,
│   │                                   #     status, assessment type, contact
│   │                                   #   - Calendar view toggle (week/month)
│   │                                   #   - Filters: status, assessor, date range,
│   │                                   #     assessment type, site
│   │                                   #   - Status badges: scheduled, in-progress,
│   │                                   #     completed, cancelled
│   │
│   ├── [id]/
│   │   └── page.tsx                    # Assessment detail page
│   │                                   #   - Header: reference, status, date/time
│   │                                   #   - Assessor assignment card
│   │                                   #   - Site card with map pin
│   │                                   #   - Contact (landowner) card
│   │                                   #   - Assessment form (filled or to fill)
│   │                                   #   - Report output / completed form data
│   │                                   #   - Photos / documents uploaded
│   │                                   #   - Link to resulting deal (if created)
│   │
│   └── new/
│       └── page.tsx                    # Schedule new assessment
│                                       #   - Assessment type (Nutrient Site Assessment,
│                                       #     BNG Baseline Survey)
│                                       #   - Site picker (existing or enter address)
│                                       #   - Contact picker (landowner)
│                                       #   - Assessor assignment (staff picker)
│                                       #   - Date/time picker
│                                       #   - Notes
│
│
│ ═══════════════════════════════════════════════════════════════
│  8. COMPLIANCE
│ ═══════════════════════════════════════════════════════════════
│
├── compliance/
│   ├── page.tsx                        # Compliance overview — dual view toggle:
│   │                                   #   - Calendar view: deadlines colour-coded by
│   │                                   #     urgency (green=upcoming, amber=due-soon,
│   │                                   #     red=overdue, grey=completed)
│   │                                   #   - List view: sortable table with filters
│   │                                   #   Summary bar: overdue count, due this week,
│   │                                   #     due this month, completed this month
│   │                                   #   Filters: status, category, site, deal, assignee,
│   │                                   #     frequency, date range
│   │
│   └── [id]/
│       └── page.tsx                    # Compliance item detail
│                                       #   - Title, description, category badge
│                                       #   - Status with urgency indicator
│                                       #   - Due date, frequency, next due date
│                                       #   - Assignment: assigned to (staff member)
│                                       #   - Linked site card
│                                       #   - Linked deal card
│                                       #   - Linked contact card
│                                       #   - Reminder schedule display
│                                       #   - Completion form: mark complete with notes
│                                       #   - Documents upload (evidence)
│                                       #   - History: past completions for recurring items
│
│
│ ═══════════════════════════════════════════════════════════════
│  9. FINANCIALS
│ ═══════════════════════════════════════════════════════════════
│
├── financials/
│   ├── page.tsx                        # Financial overview dashboard
│   │                                   #   - Revenue summary: total deal value, total
│   │                                   #     commission, collected vs outstanding
│   │                                   #   - Commission by month chart
│   │                                   #   - Commission by broker breakdown
│   │                                   #   - Outstanding payments list
│   │                                   #   - Recent transactions
│   │
│   ├── commissions/
│   │   └── page.tsx                    # Commission tracking
│   │                                   #   - Table: deal, value, rate, commission amount,
│   │                                   #     status (pending/invoiced/paid), broker
│   │                                   #   - Commission split breakdown:
│   │                                   #     developer pays -> platform takes X% ->
│   │                                   #     landowner receives Y%
│   │                                   #   - Filters: status, broker, date range,
│   │                                   #     unit type
│   │                                   #   - Totals: earned, invoiced, collected
│   │
│   ├── invoices/
│   │   ├── page.tsx                    # Invoices list
│   │   │                               #   - Table: invoice number, deal, contact,
│   │   │                               #     amount, status (draft/sent/paid/overdue),
│   │   │                               #     date issued, date due
│   │   │                               #   - Filters: status, contact, date range
│   │   │
│   │   └── [id]/
│   │       └── page.tsx                # Invoice detail
│   │                                   #   - Header: invoice number, status badge
│   │                                   #   - Billed to: contact details
│   │                                   #   - Line items: unit type, quantity, unit price,
│   │                                   #     subtotal, commission line
│   │                                   #   - Totals: subtotal, commission, VAT, grand total
│   │                                   #   - Payment history
│   │                                   #   - Linked deal
│   │                                   #   - Actions: mark paid, send reminder, download PDF
│   │
│   └── payments/
│       └── page.tsx                    # Payments ledger
│                                       #   - Table: date, contact, invoice, amount,
│                                       #     method, status
│                                       #   - Stripe Connect payout tracking
│                                       #   - Filters: date range, contact, status
│
│
│ ═══════════════════════════════════════════════════════════════
│  10. REPORTS / ANALYTICS
│ ═══════════════════════════════════════════════════════════════
│
├── reports/
│   ├── page.tsx                        # Reports hub — cards linking to each report
│   │
│   ├── pipeline/
│   │   └── page.tsx                    # Pipeline analytics
│   │                                   #   - Deals by stage funnel chart
│   │                                   #   - Pipeline value by stage
│   │                                   #   - Average days per stage
│   │                                   #   - Conversion rate between stages
│   │                                   #   - Win/loss ratio over time
│   │                                   #   - Filters: date range, broker, unit type
│   │
│   ├── inventory/
│   │   └── page.tsx                    # Inventory / credit analytics
│   │                                   #   - Credits by status (available, allocated,
│   │                                   #     delivered)
│   │                                   #   - Credits by catchment area
│   │                                   #   - Credit pricing trends
│   │                                   #   - Sites by status
│   │                                   #   - Allocation velocity (units allocated per month)
│   │
│   ├── financial/
│   │   └── page.tsx                    # Financial reports
│   │                                   #   - Revenue over time (monthly/quarterly)
│   │                                   #   - Commission earned vs target
│   │                                   #   - Average deal value
│   │                                   #   - Revenue by unit type
│   │                                   #   - Revenue by catchment area
│   │                                   #   - Outstanding receivables aging
│   │
│   └── compliance/
│       └── page.tsx                    # Compliance reports
│                                       #   - Compliance completion rate
│                                       #   - Overdue items trend
│                                       #   - Items by category breakdown
│                                       #   - Items by site
│                                       #   - Upcoming obligations calendar summary
│
│
│ ═══════════════════════════════════════════════════════════════
│  11. SETTINGS
│ ═══════════════════════════════════════════════════════════════
│
└── settings/
    ├── page.tsx                        # Settings overview / general settings
    │                                   #   - Organization name, branding
    │                                   #   - Default commission rate
    │                                   #   - Default unit prices
    │                                   #   - Label customisation preview (shows what
    │                                   #     "Site", "Deal", "Contact" etc. are called)
    │
    ├── pipeline/
    │   └── page.tsx                    # Pipeline stage configuration
    │                                   #   - Deal stages list (reorder, rename, set colour)
    │                                   #   - Stage side assignment (supply/demand/both)
    │                                   #   - Probability defaults per stage
    │                                   #   - Required fields per stage
    │
    ├── unit-types/
    │   └── page.tsx                    # Unit type configuration
    │                                   #   - List of unit types (code, name, unit measure)
    │                                   #   - Geographic constraint toggle + field
    │                                   #   - Active/inactive toggle
    │                                   #   - Sort order
    │                                   #   - Add new unit type form
    │
    ├── catchment-areas/
    │   └── page.tsx                    # Catchment area / geographic zone management
    │                                   #   - List of catchment areas
    │                                   #   - Map visualization of zones (future)
    │                                   #   - LPA mappings
    │
    ├── compliance-templates/
    │   └── page.tsx                    # Compliance template management
    │                                   #   - Template list: title, category, frequency,
    │                                   #     reminder schedule
    │                                   #   - Auto-create rules (which templates spawn
    │                                   #     on deal completion)
    │                                   #   - Add/edit template form
    │
    ├── assessment-forms/
    │   └── page.tsx                    # Assessment form template configuration
    │                                   #   - List of assessment form templates
    │                                   #   - Field builder preview (read-only, links to
    │                                   #     real form builder)
    │                                   #   - Default form per assessment type
    │
    └── team/
        └── page.tsx                    # Team / broker management
                                        #   - Staff list with roles (Broker, Assessor, Admin)
                                        #   - Assignment capacity settings
                                        #   - Active deals per broker summary
                                        #   - Commission split configuration per broker
```

---

## Route Count Summary

| Section              | Pages |
|----------------------|-------|
| Dashboard            | 1     |
| Deals                | 3     |
| Sites                | 3     |
| Inventory            | 3     |
| Matching             | 1     |
| Contacts             | 3     |
| Assessments          | 3     |
| Compliance           | 2     |
| Financials           | 5     |
| Reports              | 5     |
| Settings             | 7     |
| **Total**            | **36** |

Plus: `layout.tsx`, `page.tsx` (index), and `_data/` directory (non-route).

---

## Sidebar Navigation Structure

```
OVERVIEW
  Dashboard                    /brokerage-mockups/dashboard

PIPELINE
  Deals                        /brokerage-mockups/deals
  Matching                     /brokerage-mockups/matching

SUPPLY
  Sites                        /brokerage-mockups/sites
  Inventory                    /brokerage-mockups/inventory
  Allocations                  /brokerage-mockups/inventory/allocations

FIELD OPS
  Assessments                  /brokerage-mockups/assessments
  Compliance                   /brokerage-mockups/compliance

PEOPLE
  Contacts                     /brokerage-mockups/contacts

MONEY
  Financials                   /brokerage-mockups/financials
  Commissions                  /brokerage-mockups/financials/commissions
  Invoices                     /brokerage-mockups/financials/invoices
  Payments                     /brokerage-mockups/financials/payments

INSIGHTS
  Reports                      /brokerage-mockups/reports

CONFIGURATION
  Settings                     /brokerage-mockups/settings
```

---

## Key Design Decisions

1. **`/deals/new` as a standalone page** rather than a dialog — deal creation involves
   enough fields (side selection, contact picker, unit config, site linking) that a full
   page is warranted. Same for `/sites/new`, `/contacts/new`, and `/assessments/new`.

2. **Allocations nested under `/inventory/`** — allocations are the transactional records
   of inventory movement. They belong conceptually under inventory rather than as a
   top-level route.

3. **Financials split into sub-routes** — commissions, invoices, and payments are each
   distinct views with different data shapes. The `/financials` root page is the overview
   dashboard that ties them together.

4. **Reports as a separate section** — rather than embedding analytics into each entity
   page, dedicated report pages allow cross-cutting analysis (e.g., pipeline + financial
   combined views). Individual entity pages still show relevant stats inline.

5. **Settings sub-routes mirror the configurable aspects** of the vertical template:
   pipeline stages, unit types, catchment areas, compliance templates, assessment forms,
   and team roles.

6. **`_data/` directory** follows the bp2-demo pattern for mock data files that are
   imported by page components but not treated as routes by Next.js.

7. **No nested layouts beyond the root** — each section uses the shared brokerage
   layout. Individual pages handle their own tab/view switching internally.
