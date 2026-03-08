# Brokerage Mockups — Page Content Outlines

> Content specifications for every page in the brokerage mockup route structure.
> All data is hardcoded. All names, values, and references are fake but realistic for a BNG/Nutrient Credit brokerage operating in the Solent catchment area.

---

## Priority Pages (Full Detail)

---

### 1. Dashboard (`/dashboard/page.tsx`)

**Layout**: 4-column grid at top (stat cards), then 2-column grid below (charts + lists), then full-width activity feed.

**Section A — Stat Cards (row of 4)**

| Card | Value | Subtitle | Icon | Trend |
|------|-------|----------|------|-------|
| Pipeline Value | £2,340,000 | 18 active deals | PoundSterling | +12% vs last month (green arrow) |
| Credits Available | 1,247 kg N/yr | across 6 active sites | Leaf | -8% (amber arrow, stock depleting) |
| Commission Earned (YTD) | £187,400 | £42,600 this month | TrendingUp | +24% vs same period last year |
| Overdue Compliance | 3 items | 7 due this week | AlertTriangle | Red badge with count |

**Section B — Left Column (60% width)**

- **Deals by Stage** — Horizontal stacked bar chart. One bar per stage, coloured by stage config. Stages: Lead (3), Qualified (4), Assessment Booked (2), Assessment Complete (2), S106 In Progress (1), NE Registered (1), Matched (2), Quote Sent (1), Credits Reserved (1), Contract Signed (1). Hovering shows count + total value per stage.
- **Credits Gauge** — Donut chart showing: Allocated 2,180 kg / Available 1,247 kg / Reserved 340 kg. Legend below with colour swatches. Centre text: "3,767 kg total capacity".

**Section C — Right Column (40% width)**

- **Upcoming Assessments** — List of 4 items. Each row: date badge (e.g. "Mon 10 Mar"), site name, assessor avatar + name, status pill (Scheduled = blue, Confirmed = green). Example items:
  - 10 Mar — Whiteley Farm, Tom Jenkins, Confirmed
  - 12 Mar — Manor Fields, Sarah Croft, Scheduled
  - 14 Mar — Riverside Meadows, Tom Jenkins, Scheduled
  - 18 Mar — Oakwood Estate, Sarah Croft, Confirmed
- **Overdue Compliance Alerts** — List of 3 items with red left border. Each: title, site name, due date in red text, assigned person avatar. Example:
  - "Annual Habitat Monitoring Report" — Whiteley Farm — Due 28 Feb 2026 (7 days overdue)
  - "NE Registry Update" — Botley Meadows — Due 01 Mar 2026 (6 days overdue)
  - "S106 Compliance Review" — Hamble Wetlands — Due 03 Mar 2026 (4 days overdue)

**Section D — Full Width**

- **Recent Activity Feed** — Timeline list, 8 items. Each row: timestamp, user avatar, action text, entity link. Examples:
  - "2 hours ago — James Harris moved Deal D-0042 to 'Quote Sent'"
  - "3 hours ago — Sarah Croft completed assessment at Manor Fields"
  - "Yesterday — System: Credits Reserved for D-0038 (45 kg N/yr from Whiteley Farm)"
  - "Yesterday — James Harris added note on D-0041: 'Developer confirmed budget'"
  - "2 days ago — New contact added: Bellway Homes (Developer)"

**Quick Actions** — Floating bottom-right FAB or top-right button group: "+ New Deal", "+ New Site", "+ New Contact". Each opens the respective /new page.

**Interactions**: Date range selector (7d / 30d / 90d / YTD) at top-right affecting the stat cards and charts. Clicking any stat card navigates to the relevant section.

---

### 2. Deals Pipeline — Kanban (`/deals/page.tsx`)

**Layout**: Full-width page. Toolbar at top, then view-switchable content area.

**Toolbar**:
- View toggle: Kanban (default) | Table — pill-style toggle buttons
- Filter bar (collapsible): Stage multiselect, Contact search, Assigned Broker select, Unit Type select (Nitrogen / Phosphorus / BNG), Catchment Area select, Value range slider (£0 — £500k), Date range picker
- Right side: "+ New Deal" primary button, Export dropdown (CSV, PDF)

**Kanban View**:
- Horizontal scrollable board. One column per active stage. Column header: stage name, count badge, total value.
- Columns shown: Lead | Qualified | Assessment Booked | Assessment Complete | S106 In Progress | NE Registered | Matched | Quote Sent | Credits Reserved | Contract Signed | Payment Received | Credits Allocated
- "Completed" and "Lost" collapsed on far right as a summary count, expandable.

**Deal Cards** (within each column):
- Top: Deal number in muted text (D-0042), deal title bold
- Middle: Contact name with side indicator (green dot = supply, blue dot = demand), unit badge (e.g. "45 kg N/yr"), catchment pill ("Solent")
- Bottom row: estimated value (£125,000), probability pill (70%), assigned broker avatar
- Left border colour matches stage colour
- Hover: slight lift shadow. Click: navigate to deal detail.

**Mock Deals** (18 total, spread across stages):

| Deal# | Title | Stage | Supply Contact | Demand Contact | Units | Value |
|-------|-------|-------|----------------|----------------|-------|-------|
| D-0035 | Whiteley Farm Nitrogen Credits | Completed | Robert Whiteley | Barratt Homes | 120 kg N/yr | £360,000 |
| D-0036 | Botley Meadows Phase 1 | NE Registered | Margaret Thornton | — | 85 kg N/yr | £212,500 |
| D-0037 | Hamble Wetlands BNG | S106 In Progress | John Hamble | — | 14.2 BNG units | £198,800 |
| D-0038 | Manor Fields N Credits | Credits Reserved | David Ashford | Taylor Wimpey | 45 kg N/yr | £135,000 |
| D-0039 | Riverside Meadows | Assessment Booked | Susan Marsh | — | TBD | Est. £180,000 |
| D-0040 | Fareham Creek Wetland | Qualified | Peter Langstone | — | Est. 60 kg N/yr | £150,000 |
| D-0041 | Bellway Whiteley Development | Quote Sent | — | Bellway Homes | 55 kg N/yr | £165,000 |
| D-0042 | Taylor Wimpey Hedge End | Matched | — | Taylor Wimpey | 30 kg N/yr | £90,000 |
| D-0043 | Eastleigh Meadow P Credits | Lead | George Palmer | — | Est. 40 kg P/yr | £100,000 |
| D-0044 | Wickham Solar Farm BNG | Lead | Helen Wickham | — | Est. 8 BNG | £96,000 |
| D-0045 | Persimmon North Whiteley | Qualified | — | Persimmon Homes | 75 kg N/yr | £225,000 |
| D-0046 | Test Valley Grassland | Assessment Complete | Ian Stockbridge | — | 95 kg N/yr | £237,500 |
| D-0047 | Havant Coastal Wetland | Lead | Claire Brighton | — | Est. 50 kg N/yr | £125,000 |
| D-0048 | Linden Homes Botley | Contract Signed | — | Linden Homes | 38 kg N/yr | £114,000 |
| D-0049 | Curdridge Farm Conversion | Qualified | William Curdridge | — | Est. 70 kg N/yr | £175,000 |
| D-0050 | Miller Homes Fair Oak | Payment Received | — | Miller Homes | 25 kg N/yr | £75,000 |
| D-0051 | Hedge End Extension BNG | Credits Allocated | — | David Wilson Homes | 6.5 BNG | £78,000 |
| D-0052 | Bishop's Waltham Pasture | Assessment Booked | Catherine Wells | — | TBD | Est. £200,000 |

**Table View** (alternate toggle):
- Sortable columns: Deal#, Title, Stage (coloured badge), Supply Contact, Demand Contact, Unit Type, Quantity, Catchment, Value, Probability, Broker, Expected Close
- Row click navigates to deal detail
- Bulk action checkbox column on left; bulk actions: Move Stage, Assign Broker, Export

---

### 3. Deal Detail (`/deals/[id]/page.tsx`)

**Layout**: Two-column layout. Left 65% for main content, right 35% for sidebar panels. Full-width header.

**Use deal D-0038 (Manor Fields N Credits) as the default detail page.**

**Header**:
- Breadcrumb: Deals > D-0038
- Title: "Manor Fields Nitrogen Credits" — large heading
- Right-aligned: Stage badge ("Credits Reserved" — amber), Probability badge (80%), Edit button, More actions dropdown (Delete, Duplicate, Export PDF)

**Stage Progress Bar** (full width, below header):
- Horizontal segmented bar showing all stages. Current stage highlighted. Completed stages filled solid. Future stages outlined. Clicking a stage shows a "Move to this stage?" confirmation dialog.
- Current: Credits Reserved (7th demand-side stage). Previous stages show green checkmarks.

**Left Column — Main Content**:

**Parties Section** (two cards side by side):
- Supply Contact Card: Avatar, "David Ashford" (name linked to /contacts/[id]), role "Landowner", company "Ashford Farm Estate", phone, email, green "Supply" side badge
- Demand Contact Card: Avatar, "Taylor Wimpey" (linked), role "Developer", company "Taylor Wimpey Southern", phone, email of contact person "Rachel Morrison", blue "Demand" side badge

**Linked Site Card**:
- Mini card: Site icon, "Manor Fields" (S-0005), status "Active" green badge, "Solent" catchment pill, "45 of 95 kg N/yr available", link arrow to /sites/[id]

**Unit Details Panel**:
- Grid of 4 items: Unit Type: "Nitrogen Credit (kg/yr)" | Quantity: 45 | Unit Price: £3,000/kg | Catchment: Solent
- Total Value row: £135,000

**Activity Timeline** (scrollable, showing 10+ items):
- Each item: icon (stage change = arrow, note = pencil, email = mail, call = phone, document = file), timestamp, user, description
- Mock entries:
  - "5 Mar — James Harris moved deal to Credits Reserved"
  - "4 Mar — James Harris: Note — 'Taylor Wimpey legal team confirmed. Awaiting deposit.'"
  - "28 Feb — Email sent to Rachel Morrison: Credit Reservation Confirmation"
  - "25 Feb — James Harris moved deal to Matched"
  - "20 Feb — System matched demand to Manor Fields (45 kg N/yr available in Solent)"
  - "18 Feb — Rachel Morrison (Taylor Wimpey) enquiry received: 30-50 kg N/yr needed, Solent"
  - "15 Feb — Deal created by James Harris"
- "Add Activity" button at bottom opens inline form with type selector (Note / Call / Email / Task) and text area

**Documents Section**:
- Table: filename, type (PDF/DOCX/IMG), uploaded by, date, download icon
- Mock files: "Credit_Reservation_D0038.pdf", "TaylorWimpey_PlanningApp.pdf", "ManorFields_Assessment.pdf"
- Upload button (non-functional in mockup, shows dropzone)

**Right Sidebar**:

**Financials Panel**:
- Estimated Value: £135,000
- Commission Rate: 20%
- Commission Amount: £27,000 (highlighted)
- Payment Status: "Awaiting Deposit" amber badge
- Visual: small stacked bar — Developer pays £135,000 → Platform commission £27,000 → Landowner receives £108,000

**Key Dates Panel**:
- Created: 15 Feb 2026
- Stage Changed: 5 Mar 2026
- Expected Close: 28 Mar 2026
- Days in Pipeline: 20 days

**Related Compliance Items**:
- Mini list: 2 items linked to this deal
  - "S106 Compliance Review" — Due 15 Apr 2026 — Upcoming (green)
  - "LPA Condition Discharge" — Due 28 Apr 2026 — Upcoming (green)

**Matching Suggestions** (shown only if deal is unmatched demand):
- Not shown for D-0038 (already matched), but the panel exists and would show ranked site matches

---

### 4. Sites List (`/sites/page.tsx`)

**Layout**: Toolbar at top, then view-switchable content (Table | Map). Map view is a 50/50 split — map left, list right.

**Toolbar**:
- View toggle: Table (default) | Map — pill buttons
- Filter bar: Status multiselect (Prospecting, Under Assessment, Legal In Progress, Registered, Active, Fully Allocated), Catchment Area select (Solent, Test Valley, New Forest, Chichester Harbour), LPA select, Unit Type select, Availability toggle ("Has available units only")
- Right: "+ New Site" primary button, Export button

**Mock Sites** (8 sites):

| Ref | Name | Status | Contact | Catchment | Unit Type | Total | Allocated | Available | Price | LPA |
|-----|------|--------|---------|-----------|-----------|-------|-----------|-----------|-------|-----|
| S-0001 | Whiteley Farm | Active | Robert Whiteley | Solent | kg N/yr | 180 | 165 | 15 | £3,200 | Winchester |
| S-0002 | Botley Meadows | Active | Margaret Thornton | Solent | kg N/yr | 130 | 45 | 85 | £2,500 | Eastleigh |
| S-0003 | Hamble Wetlands | Legal In Progress | John Hamble | Solent | BNG units | 22.5 | 0 | 22.5 | £14,000 | Eastleigh |
| S-0004 | Riverside Meadows | Under Assessment | Susan Marsh | Solent | kg N/yr | TBD | 0 | TBD | TBD | Fareham |
| S-0005 | Manor Fields | Active | David Ashford | Solent | kg N/yr | 95 | 50 | 45 | £3,000 | Winchester |
| S-0006 | Test Valley Grassland | Registered | Ian Stockbridge | Test Valley | kg N/yr | 150 | 0 | 150 | £2,800 | Test Valley |
| S-0007 | Wickham Solar Farm | Prospecting | Helen Wickham | Solent | BNG units | Est. 12 | 0 | Est. 12 | TBD | Winchester |
| S-0008 | Curdridge Farm | Prospecting | William Curdridge | Solent | kg N/yr | Est. 100 | 0 | Est. 100 | TBD | Eastleigh |

**Table View**:
- Sortable columns matching data above
- Status column uses coloured badges: Active = green, Registered = emerald, Under Assessment = blue, Legal In Progress = amber, Prospecting = gray, Fully Allocated = purple
- Available units column: bold green if > 0, muted gray if 0, "TBD" in italic if unknown
- Row click navigates to site detail

**Map View** (split panel):
- Left 55%: Embedded map centred on Hampshire/Solent area (lat ~50.85, lng ~-1.3, zoom 10). Site pins coloured by status (same colours as badges). Pin tooltip on hover shows name + available units. Pin click selects site and scrolls the right panel to it.
- Right 45%: Scrollable card list of sites. Selected site card highlighted with border. Each card: name, status badge, catchment pill, capacity bar (allocated/available), contact name, price per unit.

---

### 5. Site Detail (`/sites/[id]/page.tsx`)

**Layout**: Full-width header, then two-column (65/35). Use site S-0005 (Manor Fields) as default.

**Header**:
- Breadcrumb: Sites > S-0005
- Title: "Manor Fields"
- Status badge: "Active" (green)
- Right: Edit button, More dropdown (Archive, Export)

**Left Column**:

**Location Section**:
- Address: Manor Farm Lane, Kings Worthy, Winchester, SO21 1HR
- Small embedded map with single pin at lat 51.0925, lng -1.3108
- Catchment: "Solent" pill, LPA: "Winchester City Council", Region: "Hampshire"

**Owner Contact Card**:
- Avatar, "David Ashford", "Landowner", "Ashford Farm Estate", phone: 07700 900456, email: d.ashford@ashfordfarm.co.uk, link to contact profile

**Registration Details**:
- Grid layout:
  - Registry Ref: NE-SOL-2024-0087
  - Registered: 14 Nov 2024
  - Legal Agreement: S106
  - Commitment: 30 years
  - Expires: 14 Nov 2054
  - Registration Cost: £4,200

**Baseline Data Panel** (BNG/Nutrient-specific):
- Grid: Current Land Use: Arable | Site Area: 12.4 ha | Soil Type: Clay | Current Loading: 142 kg N/yr | Proposed Loading: 47 kg N/yr | Mitigation: Land Use Change

**Allocations Table**:
- Table within site detail. Columns: Ref, Deal, Buyer, Quantity, Unit Price, Total, Status, Date
- Mock rows:
  - A-0008 | D-0035 | Barratt Homes | 45 kg N/yr | £3,000 | £135,000 | Delivered | Nov 2025
  - A-0012 | D-0038 | Taylor Wimpey | 45 kg N/yr | £3,000 | £135,000 | Reserved | Mar 2026
  - A-0003 | D-0029 | Persimmon Homes | 5 kg N/yr | £2,800 | £14,000 | Confirmed | Sep 2025
- Status badges: Delivered = green, Confirmed = blue, Reserved = amber

**Documents**:
- File list: "ManorFields_NE_Registration.pdf", "ManorFields_S106_Agreement.pdf", "ManorFields_SiteAssessment_2024.pdf", "ManorFields_BoundaryPlan.dwg"
- Upload button

**Activity Timeline**: Last 5 activities for this site, same format as deal timeline.

**Linked Deals Table**: Deals involving this site (D-0035, D-0038), showing deal#, title, stage badge, contact, value.

**Right Sidebar**:

**Capacity Panel** (prominent):
- Donut gauge chart: centre shows "45 available"
- Legend: Total: 95 kg N/yr | Allocated: 50 kg N/yr (52.6%) | Available: 45 kg N/yr (47.4%)
- Unit Type: "Nitrogen Credit (kg/yr)"
- Unit Price: £3,000 / kg N/yr
- Colour: allocated = blue, available = green

**Assessment Info**:
- Assessment Date: 8 Oct 2024
- Assessor: Tom Jenkins (avatar)
- Assessment Type: Nutrient Site Assessment
- Report: link to completed form / PDF

**Compliance Items for This Site**:
- 3 items listed as mini cards:
  - "Annual Habitat Monitoring" — Due 14 Nov 2026 — Upcoming
  - "NE Registry Update" — Due 14 Nov 2026 — Upcoming
  - "S106 Compliance Review" — Due 14 May 2026 — Due Soon (amber)

---

### 6. Inventory Availability (`/inventory/page.tsx`)

**Layout**: Summary cards row, then two-column grid (grouped table + gauge charts), then alerts section.

**Summary Cards (row of 4)**:

| Card | Value | Detail |
|------|-------|--------|
| Total Nitrogen Credits | 555 kg N/yr | across 5 sites |
| Available Nitrogen | 295 kg N/yr | 53.2% of total |
| Total BNG Units | 22.5 units | across 1 site |
| Available BNG | 22.5 units | 100% (none allocated) |

Each card has a thin progress bar at bottom showing allocated/available ratio.

**Left Column — Availability by Catchment (grouped table)**:
- Grouped by catchment area, then by unit type within each catchment
- Columns: Catchment | Unit Type | Sites | Total | Allocated | Available | Avg Price | Demand Pipeline

| Catchment | Unit Type | Sites | Total | Allocated | Available | Avg Price | Demand |
|-----------|-----------|-------|-------|-----------|-----------|-----------|--------|
| **Solent** | Nitrogen (kg/yr) | 4 | 405 | 260 | 145 | £2,925 | 160 kg needed |
| **Solent** | BNG (units) | 1 | 22.5 | 0 | 22.5 | £14,000 | 6.5 units needed |
| **Test Valley** | Nitrogen (kg/yr) | 1 | 150 | 0 | 150 | £2,800 | 0 |

- Demand column shows total from open demand deals in that catchment. If demand > available, show red text with warning icon.
- "Solent Nitrogen" demand (160) exceeds available (145) — flagged with "Supply gap: 15 kg N/yr" in red.

**Right Column — Gauge Charts**:
- Two donut charts stacked vertically:
  - Nitrogen Credits: allocated 260 / available 295 / reserved 45
  - BNG Units: allocated 0 / available 22.5 / reserved 0
- Below each: price range bar (min — avg — max): Nitrogen: £2,500 — £2,925 — £3,200 per kg

**Low Stock Alerts Section** (full width, below):
- Amber/red alert banners:
  - "Solent Nitrogen Credits: Only 145 kg/yr available against 160 kg/yr demand pipeline. Consider sourcing new sites." (red)
  - "Whiteley Farm (S-0001): Only 15 kg/yr remaining — 92% allocated" (amber)

**Filters**: Unit Type select, Catchment Area select, LPA select, "Show depleted sites" toggle.

---

### 7. Matching Tool (`/matching/page.tsx`)

**Layout**: Two-panel horizontal split. Left 45% = demand selector, Right 55% = matching results. Full-width header.

**Header**: "Supply / Demand Matching" title, subtitle "Find available supply sites for demand requirements"

**Left Panel — Demand Requirements**:
- **Select Demand Deal** dropdown (pre-populated with open demand deals):
  - D-0042 — Taylor Wimpey Hedge End — 30 kg N/yr — Solent
  - D-0045 — Persimmon North Whiteley — 75 kg N/yr — Solent
  - D-0041 — Bellway Whiteley Development — 55 kg N/yr — Solent
- On selection, panel populates:
  - Developer: Taylor Wimpey (avatar + name)
  - Unit Type: Nitrogen Credit (kg/yr)
  - Quantity Needed: 30 kg N/yr
  - Catchment Required: Solent
  - Max Budget: £100,000 (£3,333/kg)
  - Planning Ref: F/24/95231
- OR: Manual entry form — Unit Type select, Quantity input, Catchment select, Budget input
- "Find Matches" button (primary, large)

**Right Panel — Matching Results** (shown after selecting a demand deal):
- Heading: "3 matching sites found" with green checkmark
- Sorted by: Price (default) — toggle to sort by Available Quantity or Distance

**Match Result Cards** (stacked vertically):

Card 1 (Best Match — highlighted with green left border):
- Site: Botley Meadows (S-0002) — "Active" badge
- Contact: Margaret Thornton (Landowner)
- Available: 85 kg N/yr (more than enough — green text)
- Unit Price: £2,500 / kg — "Lowest price" chip
- Total Cost: £75,000 (for 30 kg)
- Commission (20%): £15,000
- Catchment Match: Solent = Solent (green checkmark)
- **"Create Deal" button** (primary)

Card 2:
- Site: Manor Fields (S-0005) — "Active" badge
- Contact: David Ashford
- Available: 45 kg N/yr
- Unit Price: £3,000 / kg
- Total Cost: £90,000
- Commission: £18,000
- Catchment Match: Solent = Solent (green checkmark)
- "Create Deal" button (secondary)

Card 3:
- Site: Whiteley Farm (S-0001) — "Active" badge — "Low Stock" amber warning
- Contact: Robert Whiteley
- Available: 15 kg N/yr (insufficient — amber text: "Partial fill only: 15 of 30 kg needed")
- Unit Price: £3,200 / kg — "Highest price" chip
- Total Cost: £48,000 (for 15 kg only)
- Commission: £9,600
- Catchment Match: Solent = Solent (green checkmark)
- "Create Deal (Partial)" button (outline)

**Below results**:
- Divider
- **Unmatched Demand Deals** — mini table of demand deals with no current matches (wrong catchment, insufficient supply):
  - Shows 1 row: "No unmatched demand deals in current filters"
- **Unmatched Supply** — sites with available units and no pending demand deals:
  - Test Valley Grassland (S-0006) — 150 kg N/yr available — No demand in Test Valley catchment

---

### 8. Compliance Calendar (`/compliance/page.tsx`)

**Layout**: Summary bar at top, then view-switchable content (Calendar | List). Calendar is the default view.

**Summary Bar (row of 4 mini stat cards)**:

| Stat | Value | Colour |
|------|-------|--------|
| Overdue | 3 | Red background |
| Due This Week | 2 | Amber background |
| Due This Month | 5 | Blue background |
| Completed This Month | 4 | Green background |

**Calendar View**:
- Monthly calendar grid (March 2026). Each day cell shows compliance item dots/chips.
- Colour coding: Red = overdue, Amber = due within 7 days, Green = upcoming (> 7 days), Gray = completed
- Clicking a day expands to show full item list for that day
- Items shown as small pills within day cells: truncated title + colour dot

**Mock Compliance Items** (15 items):

| Title | Category | Site | Due Date | Status | Assigned | Frequency |
|-------|----------|------|----------|--------|----------|-----------|
| Annual Habitat Monitoring Report | MONITORING | Whiteley Farm | 28 Feb 2026 | OVERDUE | Tom Jenkins | Annual |
| NE Registry Update | REGISTRATION | Botley Meadows | 01 Mar 2026 | OVERDUE | James Harris | Annual |
| S106 Compliance Review | LEGAL | Hamble Wetlands | 03 Mar 2026 | OVERDUE | James Harris | Biannual |
| LPA Condition Discharge Evidence | LEGAL | Manor Fields | 10 Mar 2026 | DUE_SOON | James Harris | One-off |
| Annual Habitat Monitoring Report | MONITORING | Botley Meadows | 12 Mar 2026 | DUE_SOON | Tom Jenkins | Annual |
| NE Registry Update | REGISTRATION | Whiteley Farm | 20 Mar 2026 | UPCOMING | James Harris | Annual |
| S106 Compliance Review | LEGAL | Manor Fields | 15 Apr 2026 | UPCOMING | James Harris | Biannual |
| LPA Condition Discharge | LEGAL | D-0038 | 28 Apr 2026 | UPCOMING | Sarah Croft | One-off |
| Annual Habitat Monitoring | MONITORING | Manor Fields | 14 Nov 2026 | UPCOMING | Tom Jenkins | Annual |
| NE Registry Update | REGISTRATION | Manor Fields | 14 Nov 2026 | UPCOMING | James Harris | Annual |
| Annual Habitat Monitoring | MONITORING | Whiteley Farm | 28 Feb 2025 | COMPLETED | Tom Jenkins | Annual |
| NE Registry Update | REGISTRATION | Whiteley Farm | 28 Feb 2025 | COMPLETED | James Harris | Annual |
| S106 Compliance Review | LEGAL | Hamble Wetlands | 03 Sep 2025 | COMPLETED | James Harris | Biannual |
| LPA Condition Discharge | LEGAL | D-0035 | 15 Dec 2025 | COMPLETED | Sarah Croft | One-off |

**List View** (alternate toggle):
- Sortable table: Title, Category badge, Site/Deal link, Due Date, Status badge, Assigned (avatar + name), Frequency pill
- Category badges: MONITORING = purple, LEGAL = amber, REGISTRATION = blue, FINANCIAL = green
- Status badges use urgency colours as above
- Filters: Status multiselect, Category multiselect, Site select, Deal select, Assigned select, Frequency select, Date range picker

---

### 9. Contacts List (`/contacts/page.tsx`)

**Layout**: Toolbar with tabs and filters, then data table. No map view for contacts.

**Tabs**: All (15) | Supply (8) | Demand (7) — filtering by contactSide

**Toolbar**:
- Search input (by name, company, email)
- Filters: Company Type select (Landowner, Farmer, Housebuilder, Developer, Land Agent, Assessor), Tags multiselect, Location text, "Has Active Deals" toggle
- Right: "+ New Contact" button, Export

**Mock Contacts**:

**Supply-side contacts:**

| Name | Company | Type | Side | Email | Phone | Location | Active Deals | Tags |
|------|---------|------|------|-------|-------|----------|--------------|------|
| Robert Whiteley | Whiteley Farm Estate | Landowner | Supply | r.whiteley@whiteleyfarm.co.uk | 07700 900123 | Whiteley, Hampshire | 1 | landowner, nitrogen |
| Margaret Thornton | Thornton Land | Landowner | Supply | m.thornton@thorntonland.co.uk | 07700 900234 | Botley, Hampshire | 1 | landowner, nitrogen |
| John Hamble | Hamble Estate Ltd | Landowner | Supply | j.hamble@hambleestate.co.uk | 07700 900345 | Hamble, Hampshire | 1 | landowner, bng |
| David Ashford | Ashford Farm Estate | Landowner | Supply | d.ashford@ashfordfarm.co.uk | 07700 900456 | Kings Worthy, Winchester | 1 | landowner, nitrogen |
| Susan Marsh | — | Farmer | Supply | s.marsh@gmail.com | 07700 900567 | Fareham, Hampshire | 1 | farmer, nitrogen |
| Ian Stockbridge | Stockbridge Estates | Landowner | Supply | i.stockbridge@stockbridge.co.uk | 07700 900678 | Stockbridge, Hampshire | 1 | landowner, nitrogen |
| Helen Wickham | — | Farmer | Supply | h.wickham@outlook.com | 07700 900789 | Wickham, Hampshire | 1 | farmer, bng, solar |
| William Curdridge | Curdridge Hall Farm | Landowner | Supply | w.curdridge@curdridgehall.co.uk | 07700 900890 | Curdridge, Hampshire | 1 | landowner, nitrogen |

**Demand-side contacts:**

| Name | Company | Type | Side | Email | Phone | Location | Active Deals |
|------|---------|------|------|-------|-------|----------|--------------|
| Rachel Morrison | Taylor Wimpey Southern | Developer | Demand | r.morrison@taylorwimpey.com | 020 7000 1234 | London | 2 |
| Simon Barratt | Barratt Homes Hampshire | Housebuilder | Demand | s.barratt@barrattdev.co.uk | 020 7000 2345 | Southampton | 1 |
| James Bellway | Bellway Homes South | Housebuilder | Demand | j.bellway@bellway.co.uk | 020 7000 3456 | Basingstoke | 1 |
| Karen Persimmon | Persimmon Homes Solent | Developer | Demand | k.persimmon@persimmonhomes.com | 023 8000 4567 | Southampton | 1 |
| Mark Linden | Linden Homes South | Housebuilder | Demand | m.linden@lindenhomes.co.uk | 020 7000 5678 | Southampton | 1 |
| Paul Miller | Miller Homes Southern | Housebuilder | Demand | p.miller@millerhomes.co.uk | 023 8000 6789 | Eastleigh | 1 |
| Sarah Wilson | David Wilson Homes | Housebuilder | Demand | s.wilson@dwh.co.uk | 023 8000 7890 | Winchester | 1 |

**Table Columns**: Name (linked), Company, Type badge, Side badge (green "Supply" / blue "Demand"), Email, Phone, Location, Active Deals count, Tags pills.

**Visual details**:
- Side badges: Supply = green outline badge with leaf icon, Demand = blue outline badge with building icon
- Type badges: Landowner = earth-tone, Farmer = green, Developer = blue, Housebuilder = indigo, Land Agent = purple, Assessor = teal
- Active deals column: number with a mini bar if > 0
- Row hover shows "View Profile" link

---

### 10. Financials Overview (`/financials/page.tsx`)

**Layout**: Stat cards row, then two-column grid (chart + breakdown), then full-width recent transactions table.

**Stat Cards (row of 4)**:

| Card | Value | Subtitle |
|------|-------|----------|
| Total Deal Value (YTD) | £1,875,000 | 14 deals closed or in progress |
| Total Commission (YTD) | £187,400 | at 20% average rate |
| Collected | £142,800 | 76.2% of earned |
| Outstanding | £44,600 | 3 invoices pending |

Collected/Outstanding cards have a progress bar showing collection ratio.

**Left Column — Commission by Month (bar chart)**:
- Vertical bar chart, last 6 months (Oct 2025 — Mar 2026)
- Each bar split: collected (solid green) + outstanding (hatched amber)
- Values: Oct £18,200, Nov £31,500, Dec £22,800, Jan £28,400, Feb £43,900, Mar £42,600

**Right Column — Commission by Broker**:
- Horizontal bar chart or table:
  - James Harris: £112,440 (60%) — 9 deals
  - Sarah Croft: £56,220 (30%) — 4 deals
  - Tom Jenkins: £18,740 (10%) — 1 deal (assessment-related bonus)
- Each broker row: avatar, name, commission amount, deal count, progress bar relative to total

**Outstanding Payments Section** (full width):
- Table: Invoice#, Deal, Contact, Amount, Status badge, Issued Date, Due Date, Days Overdue
- 3 rows:
  - INV-0019 | D-0038 | Taylor Wimpey | £27,000 | Sent (blue) | 5 Mar 2026 | 5 Apr 2026 | — |
  - INV-0017 | D-0048 | Linden Homes | £11,400 | Overdue (red) | 15 Feb 2026 | 15 Mar 2026 | 0 days (due today) |
  - INV-0015 | D-0046 | — (supply side) | £6,200 | Draft (gray) | — | — | — |
- "View All Invoices" link at bottom

**Recent Transactions** (full width):
- Table: Date, Type badge (Commission/Payment/Refund), Contact, Deal, Amount, Method, Status
- 5 rows:
  - 3 Mar — Payment Received — Barratt Homes — D-0035 — £72,000 — Bank Transfer — Cleared
  - 28 Feb — Commission Earned — D-0050 — Miller Homes — £15,000 — — — Pending Invoice
  - 25 Feb — Payment Received — Persimmon Homes — D-0029 — £2,800 — Stripe — Cleared
  - 20 Feb — Commission Earned — D-0051 — David Wilson Homes — £15,600 — — — Invoiced
  - 15 Feb — Payment Received — Linden Homes — D-0048 — £22,800 — Bank Transfer — Cleared

---

## Remaining Pages (Brief Outlines)

---

### 11. Deals — New (`/deals/new/page.tsx`)

Multi-step form. Step 1: Side selection (Supply/Demand radio). Step 2: Contact picker with search + "Create New" inline. Step 3: Deal details — title, description, unit type select, quantity, catchment area select, estimated value, expected close date. Step 4: Assign broker dropdown, link to existing site (supply only). Submit creates deal at "Lead" stage. Form uses card-style sections with clear labels.

### 12. Site Detail — New (`/sites/new/page.tsx`)

Single-page form with sections. Site info: name, description. Contact picker (landowner). Address fields + postcode lookup button (mockup). Geographic: catchment area select, LPA select, region. Capacity: unit type select, total units, unit price. Legal: agreement type select (S106 / Conservation Covenant / Other), commitment years (30/80/125 dropdown). Creates at "Prospecting" status.

### 13. Allocation List (`/inventory/allocations/page.tsx`)

Full-width table of all allocations across all sites. Columns: Ref, Site link, Deal link, Buyer, Unit Type, Quantity, Unit Price, Total Value, Status badge (Reserved/Confirmed/Delivered/Cancelled). Filters: status, unit type, site, deal, date range. Summary row at top: total allocated value, total units allocated.

### 14. Allocation Detail (`/inventory/allocations/[id]/page.tsx`)

Header with allocation ref (A-0012) and status badge. Three linked cards: Site (Manor Fields), Deal (D-0038), Buyer (Taylor Wimpey). Unit details grid: type, quantity, price, total. External refs: planning reference, registry allocation ref. Status timeline showing reservation -> confirmation -> delivery dates.

### 15. Contact Detail (`/contacts/[id]/page.tsx`)

Header with name, company, type/side badges. Contact info card (email, phone, address). Tabbed content: Deals tab (table of deals involving this contact), Sites tab (sites owned, supply only), Allocations tab (allocations as buyer, demand only), Notes tab (free-text notes list), Documents tab. Right sidebar: financial summary (total deal value, commission earned from this contact), activity timeline.

### 16. Contact — New (`/contacts/new/page.tsx`)

Form with side selection (Supply/Demand/Both radio). Personal info: first name, last name, email, phone. Company: company name, company type dropdown (Landowner, Farmer, Developer, Housebuilder, Land Agent, Assessor, Other). Address fields. Tags multiselect/freeform. Save button.

### 17. Assessments List (`/assessments/page.tsx`)

Toolbar with view toggle (Table | Calendar). Table: ref, site link, assessor avatar+name, date/time, status badge (Scheduled/In-Progress/Completed/Cancelled), assessment type, contact. Calendar view: week/month toggle showing assessment slots. Filters: status, assessor, date range, assessment type, site.

### 18. Assessment Detail (`/assessments/[id]/page.tsx`)

Header with ref and status. Assessor card with avatar. Site card with mini map. Contact (landowner) card. Assessment form section showing completed fields from the Nutrient Site Assessment template (land use, soil type, loading values, etc.). Report output panel. Photos/documents section. Link to resulting deal if created.

### 19. Assessment — New (`/assessments/new/page.tsx`)

Form: assessment type dropdown (Nutrient Site Assessment / BNG Baseline Survey). Site picker (search existing or enter new address). Contact picker (landowner). Assessor assignment dropdown (staff list). Date/time picker. Notes textarea. "Schedule Assessment" submit button.

### 20. Compliance Detail (`/compliance/[id]/page.tsx`)

Header with title, category badge, urgency-coloured status. Due date with countdown ("7 days overdue" in red or "Due in 23 days" in green). Frequency pill and next due date. Assigned person card. Linked site card. Linked deal card. Completion form: "Mark Complete" button with notes textarea and file upload for evidence. History section for recurring items showing past completions with dates and who completed.

### 21. Commission Tracking (`/financials/commissions/page.tsx`)

Table: deal link, deal value, commission rate, commission amount, status badge (Pending/Invoiced/Paid), broker avatar+name. Commission split diagram at top showing the flow: Developer pays -> Platform takes X% -> Landowner receives Y%. Filters: status, broker, date range, unit type. Totals summary: total earned, total invoiced, total collected.

### 22. Invoices List (`/financials/invoices/page.tsx`)

Table: invoice number, deal link, contact, amount, status badge (Draft/Sent/Paid/Overdue), date issued, date due, days overdue. Filters: status, contact, date range. Summary cards: total invoiced, total paid, total overdue. "+ New Invoice" button.

### 23. Invoice Detail (`/financials/invoices/[id]/page.tsx`)

Invoice-style layout. Header: invoice number, status badge, "Billed To" contact block. Line items table: description (unit type + quantity), unit price, subtotal. Totals section: subtotal, commission line, VAT (20%), grand total. Payment history section. Linked deal card. Action buttons: Mark Paid, Send Reminder, Download PDF.

### 24. Payments Ledger (`/financials/payments/page.tsx`)

Chronological table: date, contact link, invoice link, amount, payment method (Bank Transfer/Stripe/Cheque), status (Cleared/Pending/Failed). Running balance or monthly totals. Stripe Connect payout tracking section showing platform payouts. Filters: date range, contact, status, method.

### 25. Reports Hub (`/reports/page.tsx`)

Grid of 4 report cards, each with icon, title, description, and "View Report" link. Cards: Pipeline Analytics (funnel icon), Inventory Analytics (box icon), Financial Reports (pound icon), Compliance Reports (shield icon). Each card shows a mini stat preview (e.g., "18 active deals, £2.3M pipeline").

### 26. Pipeline Report (`/reports/pipeline/page.tsx`)

Funnel chart showing deals by stage with count and value. Pipeline value by stage horizontal bars. Average days per stage bar chart. Conversion rate between consecutive stages (percentage labels on funnel). Win/loss ratio donut chart. Filters: date range, broker, unit type.

### 27. Inventory Report (`/reports/inventory/page.tsx`)

Credits by status stacked bar (Available/Allocated/Delivered). Credits by catchment grouped bar chart. Credit pricing trends line chart over 12 months. Sites by status pie chart. Allocation velocity line chart (units allocated per month). Filters: unit type, catchment, date range.

### 28. Financial Report (`/reports/financial/page.tsx`)

Revenue over time line chart (monthly, 12 months). Commission earned vs target gauge. Average deal value trend line. Revenue by unit type pie chart. Revenue by catchment horizontal bars. Outstanding receivables aging table (0-30/31-60/61-90/90+ days). Filters: date range, broker, unit type.

### 29. Compliance Report (`/reports/compliance/page.tsx`)

Compliance completion rate donut (completed vs total). Overdue items trend line chart (6 months). Items by category bar chart. Items by site grouped table. Upcoming obligations summary: count per month for next 12 months as a small heatmap-style calendar.

### 30. Settings — General (`/settings/page.tsx`)

Form sections: Organization name input, logo upload area. Defaults: commission rate percentage input, default unit prices by type. Label customisation preview table showing current labels (Customer = "Contact", Booking = "Site Assessment", Staff = "Assessor", etc.) with edit icons. Save button.

### 31. Settings — Pipeline (`/settings/pipeline/page.tsx`)

Draggable reorderable list of deal stages. Each row: drag handle, stage name (editable), colour picker dot, side assignment radio (Supply/Demand/Both), probability default input (0-100), required fields checklist. "Add Stage" button at bottom. Visual pipeline preview showing the configured stages as a horizontal flow.

### 32. Settings — Unit Types (`/settings/unit-types/page.tsx`)

Table of unit types: code, display name, unit measure, geographic constraint toggle + field selector, active toggle, sort order. "Add Unit Type" button opens inline form. 3 pre-populated rows: Nitrogen Credit (kg/yr), Phosphorus Credit (kg/yr), Biodiversity Unit (unit).

### 33. Settings — Catchment Areas (`/settings/catchment-areas/page.tsx`)

Table of catchment areas: name, code, LPA mappings (chips), site count, active toggle. "Add Catchment" button. 3 rows: Solent (4 LPAs), Test Valley (2 LPAs), New Forest (3 LPAs). Future: map visualization placeholder with "Coming soon" overlay.

### 34. Settings — Compliance Templates (`/settings/compliance-templates/page.tsx`)

Table of templates: title, category badge, frequency pill, reminder schedule (e.g., "30, 7 days before"), auto-create rule text. "Add Template" button opens form dialog. 4 pre-populated rows matching the BNG vertical config templates. Edit and delete buttons per row.

### 35. Settings — Assessment Forms (`/settings/assessment-forms/page.tsx`)

Card list of assessment form templates. Each card: form name, field count, default-for badge (e.g., "Default for Nutrient Site Assessment"), last modified date, "Preview" and "Edit" buttons. 2 cards: Nutrient Site Assessment (10 fields), BNG Baseline Survey (10 fields). Preview opens a read-only rendering of the form fields.

### 36. Settings — Team (`/settings/team/page.tsx`)

Staff table: avatar, name, email, role badge (Broker/Assessor/Admin), active deals count, commission split percentage, capacity (max concurrent deals). 3 rows: James Harris (Broker, 9 deals, 20% split, capacity 15), Sarah Croft (Broker, 4 deals, 20% split, capacity 12), Tom Jenkins (Assessor, 0 deals, 10% assessment bonus, capacity 8 assessments/week). "Invite Team Member" button. Commission configuration section below.
