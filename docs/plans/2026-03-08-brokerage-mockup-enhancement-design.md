# Brokerage Mockup Enhancement — Design Document

> Complete mockup demo for nutrient/BNG credit brokerage, designed as a sales and fundraising tool. Every screen demonstrates how the platform handles the entire lifecycle of a brokerage business.

## Goals

1. **Full system coverage** — Mock up every nook and cranny of the brokerage lifecycle from prospecting through 80-year compliance
2. **Demo-ready** — Guided walkthrough mode that tells the story of a single deal end-to-end
3. **Multiple variations** — Keep and expand design variations per page for later decision-making
4. **Evergreen/multi-vertical** — All UI structure and navigation uses generic brokerage terms; domain-specific content (BNG, nutrient, catchments) lives in the data/config layer only
5. **Data consistency** — Shared mock data source across all 40 pages, no conflicting numbers

---

## Navigation Structure (14 items)

```
Dashboard
Deals
Sites
Contacts
Assessments        ← NEW
Inventory
Matching
Documents          ← NEW
Compliance
Financials
Reports            ← NEW
Settings           ← NEW
──────────
Demo Walkthrough   ← NEW (guided story mode)
```

---

## Deal Lifecycle Bar (Hybrid Feature)

Every Deal detail page gets a persistent horizontal timeline bar:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PROSPECT → ASSESS → LEGAL → MATCH → QUOTE → AGREEMENT → PAYMENT →     │
│ ALLOCATE → CONFIRM → COMPLIANCE                                         │
│    ✓         ✓        ✓      ✓       ●      ○           ○          ○    │
└──────────────────────────────────────────────────────────────────────────┘
```

- ✓ completed (green), ● current (blue, pulsing), ○ upcoming (gray)
- Each node is clickable — jumps to the relevant module page scoped to that deal
- Bar adapts by deal type:
  - **Supply-side deal**: Prospect → Assess → Legal → Banking
  - **Demand-side deal**: Prospect → Requirement → (waits for match)
  - **Matched deal**: Full end-to-end, both tracks merged

Dashboard gets a **lifecycle funnel widget** showing all active deals plotted across stages.

---

## Complete Page Inventory (40 pages)

### Dashboard (existing — enhance)
- 3 variations (keep V1/V2/V3)
- ADD: lifecycle funnel widget, deal velocity summary
- FIX: stat card numbers computed from shared mock data

### Deals (existing + 3 new pages)

**`/deals`** — Pipeline
- Kanban + Table views (keep existing)
- FIX: make cards/rows clickable, link to deal detail
- FIX: consistent stage names and colours

**`/deals/[id]`** — Deal Detail
- Keep existing layout
- ADD: lifecycle bar across top (the hybrid feature)
- ADD: supply track + demand track indicators
- FIX: use URL params for dynamic data lookup
- FIX: cross-links to contacts, sites, assessments, documents

**`/deals/[id]/quote`** — NEW Quote/Proposal Generator
- Credit type, quantity, unit price inputs (pre-filled from matching)
- Commission calculator (configurable %, not hardcoded 20%)
- Landowner payment breakdown
- Developer price = landowner payment + broker commission
- "Send Quote" button with preview
- Variation: simple quote vs detailed proposal with cover letter

**`/deals/[id]/agreement`** — NEW Credit Purchase Agreement View
- Agreement summary: parties, credit quantity, price, payment schedule, warranties
- Linked document (S106 or Purchase Agreement) with signature status
- Stage timeline: Draft → Sent → Negotiation → Signed → Executed
- Payment schedule table (deposit → milestones → final)

**`/deals/new`** — NEW New Deal Form
- Side toggle: Supply deal (landowner onboarding) vs Demand deal (developer requirement)
- Contact picker (or create new inline)
- Site linker (supply) or requirement capture (demand)
- Assigned broker picker
- Initial stage selection

### Sites (existing + 2 new pages)

**`/sites`** — List
- Table + Map + Grid views (keep existing)
- FIX: dark mode (replace hardcoded colours with semantic tokens)
- FIX: make rows/cards clickable, link to site detail
- FIX: consistent data with inventory page

**`/sites/[id]`** — Site Detail
- Keep existing layout
- ADD: assessment history section (links to assessment detail)
- ADD: legal status section (S106/Covenant progress)
- FIX: use URL params for dynamic data lookup

**`/sites/[id]/registration`** — NEW BNG Registration Tracker
- Natural England register submission status
- Required documents checklist (title deeds, boundary map, legal agreement, metric calcs, HMMP, land charge cert)
- Document upload slots with status (uploaded/missing/approved)
- Timeline: Submitted → Under Review → Queries → Approved → Gain Site Ref Issued
- Registration fee: £639 (shown)
- Output: unique gain site reference number
- Note: this page structure is generic "external registry submission" — works for any regulated registration

**`/sites/new`** — NEW New Site Onboarding Form
- Landowner contact picker (or create new)
- Location: address, map pin placement (catchment auto-detected from coordinates)
- Land details: area, current use, soil type
- Credit type: Nitrogen / Phosphorus / BNG / Multiple
- Initial status: Prospecting
- Variation: wizard steps vs single form

### Contacts (existing + 2 new pages)

**`/contacts`** — List (keep existing)
- FIX: make "View Profile" links work

**`/contacts/[id]`** — NEW Contact Detail
- Header: name, company, type badge, side badge (Supply/Demand), edit button
- **Supply contact variant:**
  - Sites owned (table linking to site detail)
  - Assessment history across their sites
  - Active deals (as supply partner)
  - Credit portfolio summary (total credits generated)
  - Payment history (what they've been paid)
  - Documents (heads of terms, S106 agreements)
  - Communication log (calls, emails, notes timeline)
- **Demand contact variant:**
  - Developments/projects (with planning refs)
  - Credit requirements (needed vs fulfilled)
  - Active deals (as demand partner)
  - Invoice/payment history (what they've paid)
  - Documents (purchase agreements, LPA correspondence)
  - Communication log
- Right sidebar: key stats, relationship timeline, tags, assigned broker

**`/contacts/new`** — NEW New Contact Form
- Side toggle: Supply / Demand
- Name, company, role, email, phone, location
- Type: Landowner / Farmer / Developer / Housebuilder / Land Agent / Assessor
- Tags, notes
- Assigned broker

### Assessments (5 new pages — entirely new section)

**`/assessments`** — Assessment Dashboard
- 4 stat cards: Scheduled, In Progress, Awaiting Review, Completed (this month)
- Calendar view showing assessment visits by date
- Table view: Site, Assessor, Type, Date, Status, Report link
- Filter by: assessor, type, catchment, date range, status
- Variations: calendar-focused vs table-focused vs split view
- Note: "Assessment" is generic — works for ecological survey, property survey, energy audit, risk assessment

**`/assessments/[id]`** — Assessment Detail
- Header: site name, assessor name + avatar, assessment date, type badge
- Left column:
  - Site summary card (links to site detail)
  - Survey data panel (habitat types, condition scores, soil, drainage, nutrient loading)
  - Photos section (grid of site photos with captions)
  - Findings/notes (assessor free text)
  - Metric calculation results (credit yield for NN, biodiversity units for BNG)
- Right sidebar:
  - Assessment timeline (Scheduled → Visited → Data Submitted → Reviewed → Approved)
  - Assessor profile card
  - Linked documents (survey report, metric spreadsheet, photos)
  - Actions: Approve, Request Revision, Generate Report

**`/assessments/schedule`** — Schedule New Assessment
- Step 1: Select site (searchable dropdown, site card preview)
- Step 2: Assessment type (configurable list — NN Baseline, BNG Habitat Survey, Annual Monitoring, Reassessment)
- Step 3: Assign assessor (available assessors with calendar availability, specialisms, distance from site)
- Step 4: Pick date/time (calendar picker showing assessor availability)
- Step 5: Confirmation summary with "Send to Assessor" button
- Variation: single form vs wizard steps

**`/assessments/calculator`** — Nutrient Budget Calculator
- Mockup of Natural England's 5-worksheet calculator:
  - Tab 1: Wastewater nutrients (dwelling count, occupancy rate, treatment works)
  - Tab 2: Current land use loading (land type, area, loading factor)
  - Tab 3: Future land use loading
  - Tab 4: SuDS nutrient removal
  - Tab 5: Summary — final budget with 20% precautionary buffer
- Output: "This development requires X kg/year nitrogen mitigation"
- "Find Matching Supply" button → links to Matching page
- Note: this is a domain-specific calculator template — the platform supports pluggable calculators per vertical

**`/assessments/metric`** — BNG Statutory Metric
- Baseline habitats table (habitat type, area, condition, distinctiveness, strategic significance → baseline units)
- Proposed habitats table (same columns → proposed units)
- Net change calculation: proposed − baseline = deficit
- 10% uplift requirement highlighted
- Output: "This development needs X biodiversity units off-site"
- "Find Matching Supply" button → links to Matching page

### Inventory (existing — enhance)
- 3 variations (keep V1/V2/V3)
- FIX: dark mode (semantic tokens)
- FIX: data consistency with sites page (computed from shared mock data)

### Matching (existing — enhance)
- Keep existing layout
- ADD: matching constraint display shows rules as configurable ("Geographic: same catchment") not hardcoded
- ADD: "Create Deal from Match" buttons link to new deal form with pre-filled data
- ADD: multi-site partial fill workflow (split requirement across 2+ supply sites)

### Documents (3 new pages — entirely new section)

**`/documents`** — Document Library
- All documents across the platform in one searchable view
- Columns: Name, Type badge (S106/Covenant/Agreement/Report/Invoice/HMMP), Linked Entity (deal/site/contact), Uploaded By, Date, Status (Draft/Sent/Signed/Expired)
- Filter by: type, entity, status, date range
- Bulk actions: download, archive
- Variations: table vs grid (with document preview thumbnails)
- Note: document types are configurable per vertical — S106 is just one template

**`/documents/templates`** — Template Library
- Card grid of document templates:
  - S106 Agreement (NN)
  - Conservation Covenant (BNG)
  - Credit Purchase Agreement
  - Heads of Terms
  - Habitat Management & Monitoring Plan (HMMP)
  - Credit Reservation Agreement
  - Invoice template
- Each card: template name, description, last updated, "Use Template" button, preview thumbnail
- Note: templates are vertical-specific configuration, easily swapped

**`/documents/[id]`** — Document Detail
- Document viewer panel (mock PDF preview)
- Right sidebar:
  - Status timeline (Created → Sent → Viewed → Signed by Party A → Signed by Party B → Completed)
  - E-signature tracking (who's signed, who hasn't, reminder button)
  - Linked entities (deal, site, contacts)
  - Version history
  - Actions: Send for Signature, Download, Archive

### Compliance (existing + 1 new page)

**`/compliance`** — Overview (keep existing Calendar + List)
- FIX: consistent data from shared mock source

**`/compliance/[id]`** — NEW Compliance Item Detail
- Header: title, category badge, status badge, due date
- Linked entity cards (site and/or deal)
- Requirements checklist (what needs to be done)
- Evidence upload section (monitoring report, photos, data)
- History: previous compliance submissions for this recurring item
- Actions: Mark Complete, Request Extension, Flag Issue
- Right sidebar: responsible person, frequency, next due date, linked documents

### Financials (existing + 3 new pages)

**`/financials`** — Overview (keep existing 3 variations: executive/dashboard/accountant)
- FIX: consistent numbers from shared mock data

**`/financials/invoices`** — NEW Invoice Management
- Table: Invoice #, Deal, Contact, Amount, Commission %, Status (Draft/Sent/Viewed/Paid/Overdue), Issued, Due, Days Outstanding
- Stat cards: Total Outstanding, Overdue Amount, Avg Days to Payment, Collection Rate
- "Create Invoice" button → invoice form/template
- Variations: list view vs aging buckets view

**`/financials/payments`** — NEW Payment Tracking
- Two tabs: Incoming (from developers) and Outgoing (to landowners)
- Each tab: table of payments with date, contact, deal, amount, method, status
- Reconciliation status indicators
- Running balance

**`/financials/commissions`** — NEW Commission Breakdown
- Commission by: broker, deal, catchment, time period (toggle)
- Charts: commission trends, broker leaderboard, commission by credit type
- Detailed table with drill-down to individual deals
- Target vs actual tracking per broker
- Note: commission model is configurable (%, fixed, per-unit) — shown in settings

### Reports (4 new pages — entirely new section)

**`/reports`** — Report Gallery
- Card grid of prebuilt reports with descriptions and preview thumbnails
- Categories: Pipeline, Financial, Compliance, Inventory, Performance

**`/reports/pipeline`** — Pipeline Analytics
- Funnel chart: deals by lifecycle stage with conversion rates
- Avg time in each stage
- Deal velocity trends
- Win/loss analysis
- Filter by catchment, broker, date range, credit type

**`/reports/catchment`** — Catchment Heatmap
- Map of England showing 27 NN catchments colour-coded by:
  - Supply availability (green = surplus, red = constrained)
  - Demand pressure (development pipeline intensity)
  - Price indicators
- Click a catchment → drill down to sites, deals, inventory in that area
- Note: "geographic region" view — works for any vertical with spatial constraints

**`/reports/broker-performance`** — Broker KPIs
- Per-broker cards: deals closed, commission earned, pipeline value, avg deal cycle time
- Comparison charts: broker vs broker
- Activity metrics: calls logged, assessments arranged, deals progressed

### Settings (4 new pages — entirely new section)

**`/settings`** — General
- Company profile (name, logo, address)
- Commission configuration (default %, per-credit-type overrides, configurable model)
- Catchment/region management (which areas you operate in)
- Credit type / unit configuration
- Deal stage customisation (add/remove/reorder stages)

**`/settings/users`** — Team Management
- User list: name, role (Admin/Broker/Assessor/Finance), email, status, last active
- Role permissions matrix
- Invite user flow

**`/settings/integrations`** — Integrations
- Integration cards with connected/disconnected status:
  - Natural England Register (BNG)
  - LPA Planning Portals
  - Xero / QuickBooks
  - Email (Outlook / Gmail)
  - Document signing (DocuSign)
- Each card: last sync, configure button
- Note: integrations are vertical-specific — swappable

**`/settings/notifications`** — Notification Preferences
- Alert preferences by category: compliance deadlines, payment reminders, deal stage changes, assessment scheduling
- Channel toggles: in-app, email, SMS
- Frequency settings

**`/settings/vertical`** — Vertical Configuration (demo flex page)
- Current vertical: "Nutrient & BNG Credits" (dropdown suggesting Carbon, Real Estate, Energy, Freight, etc.)
- Shows what's configurable per vertical: unit types, assessment templates, document templates, matching rules, compliance schedules, commission model
- Proves to investors: this isn't BNG software, it's brokerage OS

### Demo Walkthrough (1 new page)

**`/demo`** — Guided Story Mode
- Floating overlay panel (side drawer or bottom-right) with:
  - Step counter: "Step 3 of 14"
  - Current narrative text
  - "Next" / "Back" buttons
  - Auto-navigation to relevant page per step
  - Highlight/pulse on relevant page sections
- Can be dismissed and resumed at any point

**The Script (14 steps):**

| Step | Screen | Narrative |
|---|---|---|
| 1 | Dashboard | "Here's your daily command centre. 18 active deals, £2.3M pipeline, 3 overdue compliance items. The lifecycle funnel shows where every deal sits." |
| 2 | Contacts → New | "A landowner calls in. We capture Robert Whiteley — farmer, Solent catchment, 60 hectares. Tagged as Supply." |
| 3 | Sites → New | "We onboard his farm as a potential supply site. Land size, current use, location — catchment auto-detected." |
| 4 | Assessments → Schedule | "Send an ecologist. Pick the site, assign Sarah Chen who's free Thursday and specialises in nutrient surveys." |
| 5 | Assessments → Detail | "Sarah visits, records baseline data. The system calculates: 95 kg/year nitrogen credit yield." |
| 6 | Assessments → Calculator | "The Natural England nutrient budget methodology running inside your platform — no more emailed spreadsheets." |
| 7 | Documents → S106 | "Legal kicks off. S106 generated from template, signatures tracked. 80-year commitment secured." |
| 8 | Sites → Detail | "Whiteley Farm is live. 95 kg/year banked, ready to sell. Capacity gauge shows 100% available." |
| 9 | Contacts → Demand | "Taylor Wimpey's Rachel Morrison needs 30 kg/year nitrogen, Solent catchment." |
| 10 | Matching | "One click — 3 matching supply sites ranked by price. Whiteley Farm best value at £2,500/kg." |
| 11 | Deals → Quote | "Quote generated: 30 kg/yr × £2,500 = £75,000. Your 20% commission: £15,000." |
| 12 | Deals → Detail | "Deal D-0038 in progress. Lifecycle bar shows current stage, all linked entities visible." |
| 13 | Financials → Invoices | "£75,000 in from Taylor Wimpey. £60,000 to Robert. £15,000 commission. All tracked." |
| 14 | Compliance | "Deal closes, but 80-year obligations begin. Monitoring auto-scheduled, reminders fire, nothing falls through." |

**Closing moment:** "That's one deal. You're running 18 simultaneously across 6 catchments. And when you're ready to broker carbon credits, real estate, or energy — same platform, different configuration." → Links to `/settings/vertical`.

---

## Evergreen Architecture Principles

All mockup pages follow these rules to ensure the platform isn't locked to BNG/nutrient:

1. **Navigation uses generic terms**: Sites, Assessments, Inventory, Matching, Compliance — not Gain Sites, Ecological Surveys, Credit Bank
2. **Lifecycle stages are universal**: Prospect → Assess → Legal → Match → Quote → Agreement → Payment → Allocate → Confirm → Comply — applies to real estate, energy, recruitment, freight
3. **Domain-specific content is data, not structure**: Catchment names, kg/year units, S106 references, NE calculator — all come from the mock data layer and could be swapped
4. **Settings show configurability**: Commission models, deal stages, unit types, assessment templates, document templates, matching rules — all presented as configurable, not hardcoded
5. **Matching constraints are rules, not logic**: Displayed as configurable rules ("Geographic: same catchment") not baked into the UI
6. **Assessment forms are templates**: The ecologist survey is one template; the platform supports any assessment type
7. **Document templates are per-vertical**: S106 is BNG config; same slot holds a tenancy agreement or waste transfer note
8. **`/settings/vertical` proves the point**: One page showing the entire vertical is swappable configuration

---

## Shared Mock Data Strategy

All pages import from a single shared data source to eliminate conflicting numbers.

```
src/app/admin/brokerage-mockups/_mock-data/
  sites.ts          — 6 supply sites with consistent capacity/allocation figures
  deals.ts          — 18 deals cross-referenced to correct sites/contacts
  contacts.ts       — 15 contacts (8 supply, 7 demand)
  assessments.ts    — Assessment records linked to sites and assessors
  assessors.ts      — 5 assessors with specialisms and availability
  documents.ts      — 12 documents linked across deals/sites/contacts
  compliance.ts     — 15 compliance items linked to correct entities
  financials.ts     — Invoices, payments, commissions derived from deal data
  index.ts          — Barrel export
```

Dashboard stats, inventory totals, and financial figures are all computed from these shared arrays — not hardcoded per page.

### Core Mock Data

**6 Supply Sites:**

| Ref | Name | Catchment | Type | Total | Allocated | Available | Price/unit |
|---|---|---|---|---|---|---|---|
| S-0001 | Whiteley Farm | Solent | Nitrogen | 95 kg/yr | 50 | 45 | £3,200 |
| S-0002 | Botley Meadows | Solent | Nitrogen | 120 kg/yr | 35 | 85 | £2,500 |
| S-0003 | Hamble Valley | Solent | Nitrogen | 80 kg/yr | 80 | 0 | £2,800 |
| S-0005 | Manor Fields | Solent | Nitrogen | 95 kg/yr | 50 | 45 | £3,000 |
| S-0006 | Test Valley Grassland | Test Valley | Nitrogen | 165 kg/yr | 0 | 165 | £2,300 |
| S-0008 | Fareham Woodland | Solent | BNG | 22.5 units | 0 | 22.5 | £25,000 |

**18 Deals, 15 Contacts, 15 Compliance Items** — existing data normalised and cross-referenced.

**5 Assessors** (new):
- Sarah Chen — Senior Ecologist, NN specialist, Solent
- David Park — BNG Habitat Surveyor, Hampshire-wide
- Emma Walsh — Monitoring Specialist, annual compliance surveys
- Tom Briggs — Junior Ecologist, NN and BNG
- Lisa Grant — Independent Assessor, carbon and BNG

**12 Documents** (new) — linked to specific deals, sites, and contacts across the lifecycle.

---

## Existing Page Fixes

Applied during implementation alongside new pages:

1. **Dark mode**: Replace hardcoded Tailwind colours with semantic tokens on sites, inventory, contacts pages
2. **Dynamic routing**: Deal and site detail pages use URL params to look up data from shared mock source
3. **Cross-linking**: All clickable-looking elements actually navigate (deal cards, site rows, contact names, "View Profile" links)
4. **Data consistency**: All stat cards, totals, and figures computed from shared mock data
5. **Stage consistency**: Unified stage names and colours across dashboard, deals pipeline, and deal detail
6. **Navigation**: Import and use Next.js Link on all pages that currently lack it

---

## Total Scope

| Category | Count |
|---|---|
| Existing pages (enhanced/fixed) | 16 |
| New pages | 24 |
| Shared mock data files | 9 |
| **Total pages** | **40** |
| Design variations across pages | ~12 |
| Demo walkthrough steps | 14 |
