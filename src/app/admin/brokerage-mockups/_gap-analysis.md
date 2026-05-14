# Brokerage Mockup Dashboards -- Gap Analysis

> Comprehensive UX review of all 12 mockup pages. Covers cross-page navigation, missing UI elements, data consistency, missing connections, visual improvements, missing features per page, and a ranked priority fix list.

---

## 1. CROSS-PAGE NAVIGATION GAPS

### 1.1 Dashboard stat cards are not clickable links

**File:** `dashboard/page.tsx` (lines 181-238, V1; lines 472-528, V2; lines 740-798, V3)

All three dashboard variations render stat cards as plain `<Card>` or `<div>` elements. None of them link to the relevant detail pages:

- "Pipeline Value / 18 active deals" should link to `/admin/brokerage-mockups/deals`
- "Credits Available / across 6 active sites" should link to `/admin/brokerage-mockups/inventory`
- "Commission YTD" should link to `/admin/brokerage-mockups/financials`
- "Overdue Compliance / 3 items" should link to `/admin/brokerage-mockups/compliance`

### 1.2 Dashboard list items lack navigation

**File:** `dashboard/page.tsx`

- **Upcoming Assessments** list items (lines 330-354, V1) -- clicking an assessment row should navigate to the relevant site detail page (e.g., `/admin/brokerage-mockups/sites/S-0001` for Whiteley Farm). No `Link` component is used.
- **Overdue Compliance Alerts** (lines 369-385, V1) -- compliance items should link to `/admin/brokerage-mockups/compliance` or open a detail dialog. No navigation exists.
- **Recent Activity** items (lines 399-414, V1) -- Deal references like "D-0042" and site names like "Manor Fields" should link to their respective detail pages. Currently plain text.
- Same issues repeat in V2 (lines 610-694) and V3 (lines 880-998).

### 1.3 Deals pipeline page -- deal cards/rows do not navigate to deal detail

**File:** `deals/page.tsx`

- **Kanban cards** (`KanbanDealCard`, line 403-434): The cards have `cursor-pointer` and hover styles but no `Link` wrapper or `onClick` navigation. Clicking a deal card should navigate to `/admin/brokerage-mockups/deals/[id]` (e.g., `/admin/brokerage-mockups/deals/D-0038`).
- **Table rows** (lines 638-685): Same issue -- rows have `cursor-pointer` but no navigation handler.
- **Contact names** in table cells (line 660): Contact names are plain text. Should link to `/admin/brokerage-mockups/contacts`.

### 1.4 Sites page -- site rows/cards do not navigate to site detail

**File:** `sites/page.tsx`

- **Table rows** (lines 685-745): Have `cursor-pointer` but no `Link` or click handler to navigate to `/admin/brokerage-mockups/sites/[ref]`.
- **Grid view cards** (lines 917-1005): Same issue -- `cursor-pointer` but no navigation. The "View details" text on hover (line 1000-1002) uses `<ExternalLink>` icon but is not wrapped in a `Link`.
- **Map view cards** (lines 852-889): The "View" link in each card (line 885-887) is inside a `<button>` element, not a `<Link>`. It shows an `<ExternalLink>` icon but does not actually navigate.
- **Contact names** in table (line 712): Plain text, should link to contacts page.
- `import Link from "next/link"` is NOT imported in `sites/page.tsx` -- it uses `next/link` nowhere.

### 1.5 Contacts page -- no contact detail page exists

**File:** `contacts/page.tsx`

- Contact rows have action menus with "View Profile" (via DropdownMenuItem) but there is no `/admin/brokerage-mockups/contacts/[id]/page.tsx` route. The "View Profile" action would lead to a 404.
- Contact names in tables/cards should link to a contact detail page. No such page exists.

### 1.6 Matching page -- demand/supply cards lack navigation

**File:** `matching/page.tsx`

- Demand deal cards show deal refs (e.g., "D-0045") but they do not link to `/admin/brokerage-mockups/deals/D-0045`.
- Supply match cards show site refs (e.g., "S-0005") and site names but they do not link to `/admin/brokerage-mockups/sites/S-0005`.
- Contact/developer names are plain text.

### 1.7 Compliance page -- site references lack navigation

**File:** `compliance/page.tsx`

- Compliance items reference sites (e.g., "Whiteley Farm", siteRef: "S-0001") and deal refs (e.g., "D-0037") but these are rendered as plain text, not links.
- No breadcrumb navigation exists on this page.

### 1.8 Financials page -- deal references lack navigation

**File:** `financials/page.tsx`

- Invoice tables show deal references (e.g., "D-0035") and contact names but these are plain text, not links to the deal detail or contact pages.

### 1.9 Breadcrumbs are missing on most pages

Only the deal detail page (`deals/[id]/page.tsx`, line ~varies) has breadcrumb navigation (using `Link` to go back to deals list). The following pages have NO breadcrumbs:

- `dashboard/page.tsx` -- no breadcrumb
- `deals/page.tsx` -- no breadcrumb
- `sites/page.tsx` -- no breadcrumb
- `sites/[id]/page.tsx` -- has breadcrumb (uses `Link` back to sites list)
- `inventory/page.tsx` -- no breadcrumb
- `matching/page.tsx` -- no breadcrumb
- `compliance/page.tsx` -- no breadcrumb
- `contacts/page.tsx` -- no breadcrumb
- `financials/page.tsx` -- no breadcrumb

### 1.10 "View All" links are missing

- Dashboard Upcoming Assessments section has no "View All" link to a dedicated assessments/bookings page.
- Dashboard Overdue Compliance section has no "View All" link to `/admin/brokerage-mockups/compliance`.
- Dashboard Activity Feed has no "View All" link.
- Inventory alerts section has no "View All" link to compliance.

### 1.11 Layout nav does not highlight sub-routes correctly

**File:** `layout.tsx` (line 44)

The `isActive` check is `pathname?.startsWith(item.href)`. This means navigating to `/admin/brokerage-mockups/deals/D-0038` correctly highlights "Deals". However, the landing page `/admin/brokerage-mockups` will not highlight any nav item (which is correct). No issue here, but noted for completeness.

---

## 2. MISSING UI ELEMENTS

### 2.1 No confirmation dialogs

No page has confirmation dialogs for destructive or important actions:
- **Deals page:** "New Deal" button has no creation dialog/form.
- **Sites page:** "New Site" button has no creation dialog/form.
- **Contacts page:** "New Contact" and delete actions have no confirmation.
- **Matching page:** "Confirm Match" and "Create Deal from Match" buttons have no confirmation flow.
- **Compliance page:** "Mark Complete" has no confirmation.
- **Financials page:** "Record Payment" has no flow.

### 2.2 Empty states are partially implemented

**Implemented:**
- `deals/page.tsx` (lines 885-894): Shows a "No deals found" message with `Search` icon when filters return 0 results.
- `sites/page.tsx`: Table view (line 746-752), Map view (line 892-895), Grid view (line 1008-1012) all have empty states.

**Missing:**
- `dashboard/page.tsx`: No empty state for Upcoming Assessments or Recent Activity if they were empty.
- `inventory/page.tsx`: No empty state for the inventory table if all stock is zero.
- `matching/page.tsx`: No empty state for "no matches found" scenario.
- `compliance/page.tsx`: Calendar view has no empty state for months with no items. List view has no empty state for filtered results returning 0.
- `contacts/page.tsx`: No empty state shown when contact filters return 0 results.
- `financials/page.tsx`: No empty state for invoice/payment tables.

### 2.3 No loading skeletons

None of the 12 pages implement loading skeleton states. In a real application, all data-fetching pages would need:
- Skeleton cards for stat rows
- Skeleton rows for tables
- Skeleton charts (placeholder rectangles)
- Skeleton list items for activity feeds

Since these are static mockups, this is acceptable, but worth noting for the production implementation.

### 2.4 No quick-view / detail popovers

- **Deals Kanban:** Clicking a deal card should either navigate to the deal detail or open a quick-view popover with key info. Currently does neither.
- **Sites Table:** No hover preview or quick-view for site details.
- **Contacts:** No quick-view card on hover over contact names in other pages.
- **Compliance Calendar:** No popover detail when clicking a date/event.

### 2.5 No toast/notification feedback

- No toast notifications for button actions (Export, New Deal, New Site, New Contact, Mark Complete, etc.)
- No success/error feedback for any interactive element.

### 2.6 Responsive design gaps

- **Deals Kanban** (`deals/page.tsx`): The kanban board uses `overflow-x-auto` (line 505) which works, but 13 columns at `w-72` each (line 468) = 936px minimum. On mobile, this is scrollable but the UX is poor. No mobile-specific layout (e.g., vertical stage accordion).
- **Dashboard V3** (`dashboard/page.tsx`): Uses 12-column grid (line 801) which will collapse poorly on tablets.
- **Sites Map View** (`sites/page.tsx`): Uses `lg:w-[55%]` / `lg:w-[45%]` split which collapses to stacked on mobile, but the map placeholder is quite tall.
- **Layout header nav** (`layout.tsx`): Uses `overflow-x-auto` (line 41) which is correct, but 8 nav items may be awkward on smaller screens. Consider a hamburger menu or dropdown for narrow viewports.
- **Matching page:** The master-detail panel layout will be difficult on mobile.

---

## 3. DATA CONSISTENCY

### 3.1 Pipeline value discrepancy

- **Landing page** (`page.tsx`, line 18): States "GBP2.3M pipeline"
- **Dashboard V1** (`dashboard/page.tsx`, line 191): Shows "GBP2,340,000"
- **Dashboard V2** (`dashboard/page.tsx`, line 482): Shows "GBP2.34M"
- **Dashboard V3** (`dashboard/page.tsx`, line 747): Shows "GBP2,340,000"
- **Deals page** (`deals/page.tsx`): Sum of all DEALS values = GBP3,116,800 (line 771 calculates `pipelineValue` from all deals including Completed). The total of all 18 deals is significantly higher than GBP2.34M.
- **DEALS_BY_STAGE** on dashboard (lines 52-63): Sums to 321000+550000+380000+237500+198800+212500+90000+165000+135000+114000 = GBP2,403,800. This is also different from GBP2,340,000 shown in the stat card.

**Root cause:** Dashboard DEALS_BY_STAGE data and deals page DEALS array are defined independently with different totals. They should use the same source data.

### 3.2 Deal count discrepancy

- **Landing page** (`page.tsx`, line 26): States "18 active deals"
- **Dashboard** (all 3 variations): States "18 active deals"
- **Deals page** (`deals/page.tsx`, line 125-144): DEALS array has exactly 18 entries -- this is consistent.
- But the dashboard says "18 active deals" while the deals page counts 17 active (1 is Completed at stage "Completed").

### 3.3 Stage name inconsistencies

Dashboard DEALS_BY_STAGE uses abbreviated stage names:
- "Assess. Booked" vs deals page "Assessment Booked"
- "Assess. Complete" vs deals page "Assessment Complete"

These abbreviations are only in the dashboard chart data. The full names should be used consistently, or the dashboard chart should explicitly label them as abbreviated.

### 3.4 Credits available inconsistency

- **Landing page** (`page.tsx`, line 42): "1,247 kg N/yr available"
- **Dashboard** (all variations): "1,247 kg N/yr"
- **CREDITS_GAUGE** (`dashboard/page.tsx`, line 67): Available = 1,247
- **Sites page** stat computation (line 472-473): Calculates `totalAvailableN` from SITES data = 15 + 85 + 45 + 150 = 295 kg N/yr available. This is dramatically different from 1,247 shown on dashboard.

**Root cause:** Sites page SITES array represents only 8 sites with their own capacity numbers. Dashboard uses a separate CREDITS_GAUGE constant. These data sources are completely disconnected.

### 3.5 Contact data is not shared

- **Deals page** contacts (e.g., "Robert Whiteley", "Margaret Thornton", "Taylor Wimpey")
- **Sites page** contacts (e.g., "Robert Whiteley", "Margaret Thornton", "John Hamble")
- **Contacts page** has its own CONTACTS array with different people
- **Deal detail** (`deals/[id]/page.tsx`) references "David Ashford" and "Rachel Morrison" (Taylor Wimpey) -- "David Ashford" appears in sites as Manor Fields contact, but "Rachel Morrison" does not appear in the contacts page at all.

### 3.6 Site data inconsistencies

- **Sites page** Manor Fields (`S-0005`): contact is "David Ashford", 95 total, 50 allocated, 45 available, price GBP3,000
- **Site detail** (`sites/[id]/page.tsx`): Hardcoded to Manor Fields S-0005 with same numbers (consistent here)
- **Deal detail** (`deals/[id]/page.tsx`, line 404): References "45 of 95 kg N/yr available" -- consistent with sites page
- **Dashboard** CREDITS_GAUGE: total 3,767 kg capacity -- the sites page total capacity sums to 180+130+95+150 = 555 kg N/yr (only nitrogen sites). This is wildly different.

### 3.7 Compliance item data

- **Dashboard** (line 79-82): 3 overdue items: "Annual Habitat Monitoring Report" at Whiteley Farm, "NE Registry Update" at Botley Meadows, "S106 Compliance Review" at Hamble Wetlands
- **Compliance page** COMPLIANCE_ITEMS: Also has 3 overdue items matching the same titles/sites -- this is consistent.
- **Landing page** (line 58): "3 overdue items" -- consistent.

### 3.8 Financials data

- **Landing page** (line 74): "GBP187K earned YTD"
- **Dashboard** (all variations): "GBP187,400" commission YTD -- consistent.
- **Financials page** STAT_CARDS: totalCommission = 187,400 -- consistent.

### 3.9 Status color inconsistencies

- **Deals page** stage colors use a detailed 13-color palette (STAGE_CONFIG, lines 83-97) with granular colors per stage.
- **Dashboard** DEALS_BY_STAGE uses a different set of colors (lines 52-63) that don't align with the deals page palette:
  - Dashboard "Lead" = `#94a3b8` (slate-400) vs Deals "Lead" = `bg-slate-400` -- visually similar
  - Dashboard "Qualified" = `#60a5fa` (blue-400) vs Deals "Qualified" = `bg-blue-400` -- consistent
  - Dashboard "Matched" = `#2dd4bf` (teal) vs Deals "Matched" = `bg-amber-400` -- INCONSISTENT
  - Dashboard "Quote Sent" = `#fb923c` (orange) vs Deals "Quote Sent" = `bg-orange-400` -- similar
  - Dashboard "Credits Reserved" = `#f472b6` (pink) vs Deals "Credits Reserved" = `bg-yellow-500` -- INCONSISTENT

### 3.10 Broker data

- **Deals page**: 3 brokers -- James Harris (JH), Sarah Croft (SC), Tom Jenkins (TJ)
- **Dashboard**: Mentions same 3 brokers in activity feed and assessments -- consistent
- **Contacts page**: Does NOT list brokers as contacts (they are staff, not contacts) -- correct separation

---

## 4. MISSING CONNECTIONS

### 4.1 Dashboard to detail pages

| Dashboard Element | Expected Link Target | Currently Links? |
|---|---|---|
| Pipeline Value stat card | `/admin/brokerage-mockups/deals` | No |
| Credits Available stat card | `/admin/brokerage-mockups/inventory` | No |
| Commission YTD stat card | `/admin/brokerage-mockups/financials` | No |
| Overdue Compliance stat card | `/admin/brokerage-mockups/compliance` | No |
| Each assessment list item | `/admin/brokerage-mockups/sites/[ref]` | No |
| Each compliance alert | `/admin/brokerage-mockups/compliance` | No |
| Activity feed deal refs (D-XXXX) | `/admin/brokerage-mockups/deals/[id]` | No |
| Activity feed site names | `/admin/brokerage-mockups/sites/[ref]` | No |
| "New Deal" button | Deal creation dialog | No (button does nothing) |
| "New Site" button | Site creation dialog | No (button does nothing) |
| "New Contact" button | Contact creation dialog | No (button does nothing) |
| "Deals by Stage" chart bar click | Filtered deals page | No |

### 4.2 Deals page to other pages

| Deals Element | Expected Link Target | Currently Links? |
|---|---|---|
| Deal card / table row click | `/admin/brokerage-mockups/deals/[id]` | No |
| Contact name in table | `/admin/brokerage-mockups/contacts` | No |
| Site reference in deal | `/admin/brokerage-mockups/sites/[ref]` | No (not shown in deals list) |

### 4.3 Sites page to other pages

| Sites Element | Expected Link Target | Currently Links? |
|---|---|---|
| Site row / card click | `/admin/brokerage-mockups/sites/[ref]` | No |
| Contact name | `/admin/brokerage-mockups/contacts` | No |
| "View details" on grid/map cards | `/admin/brokerage-mockups/sites/[ref]` | No (no Link component) |

### 4.4 Deal detail to other pages

| Deal Detail Element | Expected Link Target | Currently Links? |
|---|---|---|
| Back arrow / breadcrumb | `/admin/brokerage-mockups/deals` | YES (lines use Link) |
| Supply party name | `/admin/brokerage-mockups/contacts/david-ashford` | YES (line 301) |
| Demand party name | `/admin/brokerage-mockups/contacts/rachel-morrison` | YES (line 346) |
| Linked site "Manor Fields" | `/admin/brokerage-mockups/sites/S-0005` | YES (line 388) |
| External link icon for site | `/admin/brokerage-mockups/sites/S-0005` | YES (line 410) |
| Related Compliance items | `/admin/brokerage-mockups/compliance` | No |

### 4.5 Site detail to other pages

| Site Detail Element | Expected Link Target | Currently Links? |
|---|---|---|
| Back arrow / breadcrumb | `/admin/brokerage-mockups/sites` | YES (uses Link) |
| Contact name | `/admin/brokerage-mockups/contacts` | Partial (links to a contact ID) |
| Related deals table rows | `/admin/brokerage-mockups/deals/[id]` | YES (uses Link) |
| Compliance items | `/admin/brokerage-mockups/compliance` | No |

### 4.6 Inventory to sites/deals

| Inventory Element | Expected Link Target | Currently Links? |
|---|---|---|
| Site names in tables | `/admin/brokerage-mockups/sites/[ref]` | No |
| "View Sites" or similar | `/admin/brokerage-mockups/sites` | No |
| Alert site references | `/admin/brokerage-mockups/sites/[ref]` | No |

### 4.7 Matching to deals/sites/contacts

| Matching Element | Expected Link Target | Currently Links? |
|---|---|---|
| Demand deal ref (D-XXXX) | `/admin/brokerage-mockups/deals/[id]` | No |
| Supply site ref (S-XXXX) | `/admin/brokerage-mockups/sites/[ref]` | No |
| Developer/contact name | `/admin/brokerage-mockups/contacts` | No |
| "Create Deal from Match" | `/admin/brokerage-mockups/deals/new` | No (no action) |

### 4.8 Compliance to sites/deals

| Compliance Element | Expected Link Target | Currently Links? |
|---|---|---|
| Site name on item | `/admin/brokerage-mockups/sites/[ref]` | No |
| Deal ref on item | `/admin/brokerage-mockups/deals/[id]` | No |
| Assigned person | Contact/team detail | No |

### 4.9 Contacts to deals/sites

| Contacts Element | Expected Link Target | Currently Links? |
|---|---|---|
| "Active Deals" count | Filtered deals list | No |
| "View Profile" action | Contact detail page | No (page doesn't exist) |
| "View Deal History" action | Filtered deals | No |

### 4.10 Financials to deals/contacts

| Financials Element | Expected Link Target | Currently Links? |
|---|---|---|
| Deal ref in invoice table | `/admin/brokerage-mockups/deals/[id]` | No |
| Contact name | `/admin/brokerage-mockups/contacts` | No |
| "View Deal" action | `/admin/brokerage-mockups/deals/[id]` | No |

---

## 5. VISUAL IMPROVEMENTS

### 5.1 Styling framework inconsistency

The pages use two different styling approaches:

- **Dashboard, Deals, Deal Detail:** Use shadcn/ui semantic colors (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) -- dark mode compatible.
- **Sites, Inventory, Contacts:** Use hardcoded Tailwind colors (`bg-white`, `text-gray-900`, `text-gray-400`, `border-gray-200`) -- NOT dark mode compatible.
- **Compliance, Matching, Financials:** Mix of both approaches.

This is the single largest visual inconsistency. Pages using hardcoded colors will look broken in dark mode.

**Affected files and key lines:**
- `sites/page.tsx`: Nearly all styling uses hardcoded gray-* colors (e.g., line 268 `bg-slate-100`, line 332 `text-gray-900`, line 378 `bg-white text-gray-700`)
- `sites/[id]/page.tsx`: Same pattern
- `inventory/page.tsx`: Same pattern
- `contacts/page.tsx`: Mixed -- uses some shadcn components but some hardcoded colors

### 5.2 Header style inconsistency

Each page has a different header pattern:
- **Dashboard:** No sticky sub-header, just content header in each variation
- **Deals:** Sticky sub-header below nav (line 788 `sticky top-14 z-30`)
- **Sites:** Static header with no sticky behavior
- **Inventory:** Static header
- **Matching:** Static header with different layout
- **All others:** Static headers

Recommendation: All list pages should use the same sticky sub-header pattern as the deals page.

### 5.3 Stat card component divergence

At least 4 different stat card implementations exist:
1. `dashboard/page.tsx` V1: Uses `<Card><CardContent>` with icon badge + trend arrow
2. `dashboard/page.tsx` V2: Dark-themed div with gradient background
3. `deals/page.tsx` `StatCard` component (line 241-270): Horizontal layout with icon + text
4. `sites/page.tsx` `StatCard` (line 316-337): Vertical layout with large value text

These should be unified into one or two reusable patterns.

### 5.4 Badge/pill styling inconsistency

- **Deals page** `StageBadge` (line 194-207): Uses `rounded border` with colored background
- **Sites page** `StatusBadge` (line 244-252): Uses `rounded-md border` with different color system
- **Compliance page**: Uses `Badge` component from shadcn with various color overrides
- **Contacts page**: Uses inline badge styles

### 5.5 Chart tooltip format inconsistency

- **Dashboard** (`CustomBarTooltip`, line 114-123): Custom component with `bg-popover` semantic class
- **Site detail** page: Uses recharts default tooltip with `contentStyle` override
- **Financials page**: Uses recharts default tooltip with `contentStyle` override
- **Deal detail** (`deals/[id]/page.tsx`): Uses recharts Tooltip with `contentStyle` inline

These should all use the same custom tooltip component.

### 5.6 Table header style inconsistency

- **Deals page** table: Uses `SortHeader` component with `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` (line 542)
- **Sites page** table: Uses `SortButton` wrapping headers with different font size (`text-xs font-semibold uppercase tracking-wider text-gray-400`, line 652)
- **Contacts page** table: Uses `TableHead` from shadcn
- **Financials page** table: Uses `TableHead` from shadcn with different sizing

### 5.7 Filter bar inconsistency

- **Deals page**: Custom `FilterBar` component using shadcn `Select` components with show/hide toggle
- **Sites page**: Native `<select>` elements via `FilterSelect` component (line 366-388)
- **Compliance page**: Uses shadcn `Select` components
- **Contacts page**: Uses shadcn `Select` and `Input` components
- **Inventory page**: Uses shadcn `Select` with custom filter panel

The sites page using native `<select>` elements is visually jarring next to all other pages using shadcn Select.

### 5.8 Spacing/padding inconsistency

- **Dashboard V1/V2:** Uses `max-w-screen-xl` (line 140/425)
- **Dashboard V3:** Uses `max-w-screen-2xl` (line 703)
- **Deals page:** Uses `max-w-screen-2xl` (line 884)
- **Sites page:** Uses `max-w-screen-2xl` (line 479)
- **Landing page:** Uses `max-w-screen-lg` (line 82)

The dashboard V1/V2 using `max-w-screen-xl` while every other page uses `max-w-screen-2xl` creates a width mismatch when navigating between pages.

---

## 6. MISSING FEATURES PER PAGE

### 6.1 Landing Page (`page.tsx`)

- **Missing:** No search/filter across all mockups
- **Missing:** No "last viewed" or "recently updated" section
- **Missing:** No global search that spans deals, sites, contacts
- **Minor:** Stats on cards (e.g., "18 active deals") are hardcoded and disconnected from actual page data

### 6.2 Dashboard (`dashboard/page.tsx`)

- **Missing:** Broker performance comparison (who has most deals, highest value pipeline)
- **Missing:** Pipeline velocity chart (avg days per stage)
- **Missing:** Revenue forecast / target vs actual
- **Missing:** Geographic heatmap of deal/site activity
- **Missing:** Notification bell / alert center
- **Missing:** Quick search from dashboard
- **Missing:** Date range selector should actually change displayed data (currently decorative)
- **Missing:** "View All" links on every list section (assessments, compliance, activity)
- **Improvement:** Activity feed should show more context (deal values, site details) on hover

### 6.3 Deals Pipeline (`deals/page.tsx`)

- **Missing:** Deal drag-and-drop on Kanban (cards are static, no DnD library)
- **Missing:** Deal quick-view popup (click card to see summary without navigating away)
- **Missing:** Bulk actions (select multiple deals, bulk update stage, bulk assign broker)
- **Missing:** Deal value summary bar across top showing weighted pipeline by probability
- **Missing:** Probability-weighted pipeline value calculation (deals * probability)
- **Missing:** Side filter (supply vs demand) -- the data has `side` field but no filter for it
- **Missing:** Date range filter for expected close date
- **Missing:** Pagination for table view (all 18 deals shown at once)
- **Missing:** Deal age indicator (days since last stage change)
- **Missing:** Deal count by broker summary
- **Improvement:** "New Deal" button should open a creation form/dialog
- **Improvement:** "Export" button should trigger a download (currently decorative)

### 6.4 Deal Detail (`deals/[id]/page.tsx`)

- **Missing:** Deal stage transition buttons ("Move to next stage" / "Move to..." dropdown)
- **Missing:** Edit mode for deal fields (title, value, probability, etc.)
- **Missing:** Add note/activity inline form
- **Missing:** Email integration (send email from within deal)
- **Missing:** Related deals section (other deals with same contact or site)
- **Missing:** Print/PDF export of deal summary
- **Missing:** Deal duplication action
- **Missing:** "Mark as Lost" with reason capture
- **Missing:** Deal tags management
- **Improvement:** Stage progress bar scrolls horizontally but has no scroll indicator
- **Note:** The page hardcodes deal D-0038 data. The `params.id` from the URL is unused -- this should dynamically select from a deals map.

### 6.5 Sites List (`sites/page.tsx`)

- **Missing:** Bulk actions on sites
- **Missing:** "Add to Watchlist" or favorite/pin functionality
- **Missing:** Site comparison view (select 2+ sites to compare side-by-side)
- **Missing:** Allocation history per site (which deals allocated from this site)
- **Missing:** Last activity date for each site
- **Missing:** Map clustering for dense areas
- **Missing:** Map legend for capacity (size-coded pins based on available units)
- **Missing:** Import/export CSV
- **Improvement:** Map view is a placeholder (CSS-drawn). Should note plans for real map (Leaflet/Mapbox).

### 6.6 Site Detail (`sites/[id]/page.tsx`)

- **Missing:** Site status change workflow (buttons to move between statuses)
- **Missing:** Assessment scheduling from site detail
- **Missing:** Document upload interaction
- **Missing:** Site notes/journal
- **Missing:** Weather/environmental data widget (relevant for BNG sites)
- **Missing:** Neighbouring sites or sites within same catchment
- **Note:** Hardcoded to Manor Fields S-0005 -- should use params to select site data.

### 6.7 Inventory (`inventory/page.tsx`)

- **Missing:** Drill-down from catchment row to see individual sites
- **Missing:** Historical trend chart (stock levels over time)
- **Missing:** Projection/forecast of future availability
- **Missing:** Price comparison across catchments
- **Missing:** Demand pipeline overlay (show upcoming demand against available supply)
- **Missing:** Alert configuration (set custom low-stock thresholds)
- **Missing:** "Reserve Units" action from inventory view
- **Improvement:** The 3-variation toggle (V1/V2/V3) uses non-descriptive labels. Better: "Dashboard" / "Table" / "Analytics"

### 6.8 Matching (`matching/page.tsx`)

- **Missing:** Auto-match algorithm visibility (show scoring breakdown)
- **Missing:** Historical match success rate
- **Missing:** Match comparison (select multiple supply options to compare)
- **Missing:** "Send Quote" action from match result
- **Missing:** Rejection reason capture when dismissing a match
- **Missing:** Match expiry/timeout (how long is a match valid)
- **Missing:** Cost calculator with commission preview
- **Missing:** Map view of demand location vs supply site locations
- **Improvement:** The matching interface is one of the most complex and feature-rich pages -- well done. But the "Create Deal from Match" button does nothing.

### 6.9 Compliance (`compliance/page.tsx`)

- **Missing:** Bulk mark complete
- **Missing:** Snooze/defer deadline
- **Missing:** Compliance document upload directly from item
- **Missing:** Email reminder trigger (manual)
- **Missing:** Compliance score/health rating for each site
- **Missing:** Export compliance report
- **Missing:** Compliance item creation form
- **Missing:** Recurring item management (edit frequency, pause)
- **Improvement:** Calendar view is well-built but clicking a day should filter the list to that day's items.

### 6.10 Contacts (`contacts/page.tsx`)

- **Missing:** Contact detail page (`contacts/[id]/page.tsx`)
- **Missing:** Contact merge functionality
- **Missing:** Deal history per contact
- **Missing:** Communication log (emails sent, calls made)
- **Missing:** Contact import from CSV
- **Missing:** Contact grouping by company
- **Missing:** Map view of contacts by location
- **Missing:** Contact lifecycle stage (prospect, active, dormant)
- **Improvement:** The supply/demand segmented tabs are good, but the "All" tab should be default.

### 6.11 Financials (`financials/page.tsx`)

- **Missing:** Invoice generation/creation form
- **Missing:** Payment recording form
- **Missing:** Bank reconciliation view
- **Missing:** Tax summary (VAT calculations)
- **Missing:** Financial year comparison
- **Missing:** Broker payout tracking (how much each broker has earned)
- **Missing:** Export to accounting software (Xero, QuickBooks)
- **Missing:** Aged debt report
- **Improvement:** Commission rate assumptions should be configurable, not hardcoded at 20%.

---

## 7. PRIORITY FIXES

Ranked by impact on usability and impression quality. Each item includes the specific file and what to change.

### P1 (Critical -- Core Navigation)

**1. Make deal cards/rows navigate to deal detail**
- **File:** `src/app/admin/brokerage-mockups/deals/page.tsx`
- **What:** Wrap `KanbanDealCard` (line 403-434) in `<Link href={/admin/brokerage-mockups/deals/${deal.id}}>`. Wrap table rows (lines 638-685) in a clickable `<Link>` or add `onClick={() => router.push(...)}`. Import `Link` from `next/link`.
- **Impact:** Deals are the core entity. Users cannot access deal detail from the pipeline -- this is the biggest UX gap.

**2. Make site rows/cards navigate to site detail**
- **File:** `src/app/admin/brokerage-mockups/sites/page.tsx`
- **What:** Import `Link` from `next/link`. Wrap table rows (lines 685-745) in `<Link href={/admin/brokerage-mockups/sites/${site.ref}}>`. Wrap grid card divs (line 918-1005) and map card buttons (line 855-889) in `<Link>`.
- **Impact:** Sites are the second most-viewed entity. Currently dead-end UI.

**3. Make dashboard stat cards clickable links**
- **File:** `src/app/admin/brokerage-mockups/dashboard/page.tsx`
- **What:** Wrap each stat card `<Card>` in a `<Link>` to the relevant page. Add cursor-pointer and hover styling. Apply to all 3 variations (V1 lines 181-238, V2 lines 472-528, V3 lines 740-798).
- **Impact:** Dashboard is the first page users see. Stat cards that don't go anywhere feel broken.

**4. Make dashboard list items (assessments, compliance, activity) clickable**
- **File:** `src/app/admin/brokerage-mockups/dashboard/page.tsx`
- **What:** Add `Link` wrappers or `onClick` handlers. Assessment items should link to site detail. Compliance items should link to compliance page. Activity feed entities should link to relevant deal/site pages. Apply to all 3 variations.
- **Impact:** Every list item looks clickable (hover states exist) but goes nowhere.

**5. Create contacts detail page**
- **File:** Create `src/app/admin/brokerage-mockups/contacts/[id]/page.tsx`
- **What:** Build a contact detail page showing contact info, deal history, site associations, communication log, and notes. The deal detail page already links to contact pages (lines 301, 346) which would 404 without this.
- **Impact:** The deal detail page has broken links to contact pages that don't exist.

### P2 (High -- Data Quality)

**6. Unify pipeline value across dashboard and deals page**
- **Files:** `src/app/admin/brokerage-mockups/dashboard/page.tsx`, `src/app/admin/brokerage-mockups/deals/page.tsx`
- **What:** Dashboard DEALS_BY_STAGE (lines 52-63) should be derived from the same deal data as the deals page, or at minimum show the same total. Currently dashboard shows GBP2,340,000 but deals page data sums to GBP3,116,800. Either reduce deal values or update dashboard stat.
- **Impact:** Contradictory numbers destroy trust in the mockup.

**7. Unify credits available across dashboard, sites, and inventory**
- **Files:** `src/app/admin/brokerage-mockups/dashboard/page.tsx`, `src/app/admin/brokerage-mockups/sites/page.tsx`, `src/app/admin/brokerage-mockups/inventory/page.tsx`
- **What:** Dashboard shows 1,247 kg available. Sites page data sums to 295 kg. Inventory page has its own data (145 kg for Solent nitrogen). These three values for the same metric should be identical.
- **Impact:** Three different numbers for "available credits" is confusing.

**8. Fix stage color mismatch between dashboard and deals page**
- **Files:** `src/app/admin/brokerage-mockups/dashboard/page.tsx` (lines 52-63), `src/app/admin/brokerage-mockups/deals/page.tsx` (lines 83-97)
- **What:** Dashboard uses `#2dd4bf` (teal) for "Matched" while deals page uses `bg-amber-400`. Dashboard uses `#f472b6` (pink) for "Credits Reserved" while deals page uses `bg-yellow-500`. Align colors so the dashboard chart and deals kanban tell the same visual story.
- **Impact:** Users switching between dashboard and deals see different color coding for the same stages.

### P3 (Medium -- Visual Consistency)

**9. Convert hardcoded colors to semantic theme tokens**
- **Files:** `src/app/admin/brokerage-mockups/sites/page.tsx`, `src/app/admin/brokerage-mockups/sites/[id]/page.tsx`, `src/app/admin/brokerage-mockups/inventory/page.tsx`, `src/app/admin/brokerage-mockups/contacts/page.tsx`
- **What:** Replace `bg-white`, `text-gray-900`, `text-gray-400`, `border-gray-200` etc. with `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. This affects hundreds of class strings across these files.
- **Impact:** 4 of 12 pages will look broken in dark mode. All pages should use the same theming approach.

**10. Standardize max-width across all pages**
- **Files:** All page files
- **What:** Dashboard V1/V2 uses `max-w-screen-xl` while all other pages use `max-w-screen-2xl`. Change dashboard V1/V2 to `max-w-screen-2xl` for consistent width. Alternatively, keep V3 (compact) as the default variation which already uses `max-w-screen-2xl`.
- **Impact:** Navigating from deals (wide) to dashboard (narrower) feels like a layout shift.

**11. Replace native select elements in sites page with shadcn Select**
- **File:** `src/app/admin/brokerage-mockups/sites/page.tsx` (lines 366-388)
- **What:** Replace `FilterSelect` component using `<select>` with shadcn `Select/SelectTrigger/SelectContent/SelectItem` pattern used everywhere else.
- **Impact:** Native dropdowns look visually inconsistent with the rest of the application.

### P4 (Low-Medium -- Feature Completions)

**12. Add "View All" links to dashboard sections**
- **File:** `src/app/admin/brokerage-mockups/dashboard/page.tsx`
- **What:** Add "View All" or arrow links in section headers: Upcoming Assessments header (no assessments page exists, but could link to sites or a future bookings page), Overdue Compliance (link to `/admin/brokerage-mockups/compliance`), Activity Feed (could expand or paginate). Apply to all 3 variations.
- **Impact:** Users expect section headers to have navigation actions.

**13. Add deal refs as links throughout matching, compliance, and financials pages**
- **Files:** `src/app/admin/brokerage-mockups/matching/page.tsx`, `src/app/admin/brokerage-mockups/compliance/page.tsx`, `src/app/admin/brokerage-mockups/financials/page.tsx`
- **What:** Any deal ref (D-XXXX) or site ref (S-XXXX) rendered as text should become a `<Link>` to the appropriate detail page. Same for contact names where they appear.
- **Impact:** Cross-page connectivity is what makes an operations platform feel cohesive.

**14. Add breadcrumbs to all list pages**
- **Files:** All page-level components except landing page
- **What:** Add a consistent breadcrumb component: `Brokerage > [Section Name]` for list pages, `Brokerage > [Section] > [Item Name]` for detail pages. The deals and sites detail pages already have basic back-navigation; extend this pattern to all pages.
- **Impact:** Users need wayfinding context, especially on detail pages.

**15. Make deal detail page dynamic (use URL params)**
- **File:** `src/app/admin/brokerage-mockups/deals/[id]/page.tsx`
- **What:** Currently hardcodes deal D-0038 data regardless of URL. Create a DEALS_MAP lookup and use `params.id` to select the correct deal data. Same for `sites/[id]/page.tsx` which hardcodes S-0005.
- **Impact:** Navigation from deals list to deal detail currently shows the same deal regardless of which deal was clicked. This defeats the purpose of having a detail page.

---

## Summary Statistics

| Category | Issues Found |
|---|---|
| Navigation gaps | 11 areas |
| Missing UI elements | 6 categories |
| Data inconsistencies | 10 items |
| Missing cross-page connections | 10 tables, ~50 individual links |
| Visual inconsistencies | 8 areas |
| Missing features per page | 11 pages, ~80 items |
| Priority fixes | 15 ranked items |

The mockups are visually polished and demonstrate strong domain knowledge. The deal detail page and matching page are particularly well-executed. The primary issues are: (1) dead-end navigation where clickable-looking elements don't actually navigate, (2) disconnected data between pages, and (3) inconsistent theming approach (semantic vs hardcoded colors). Fixing the top 5 priority items would transform these from static visual mockups into a navigable prototype.
