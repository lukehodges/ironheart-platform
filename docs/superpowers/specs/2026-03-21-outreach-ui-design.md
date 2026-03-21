# Outreach Module — Full UI Design Spec

> Comprehensive UI spec for the outreach management suite. Covers 6 views: Dashboard (morning cockpit), Contacts, Replies, Sequences, Analytics, and Templates. Backend spec: `2026-03-20-outreach-module-design.md`. Strategy doc: `2026-03-21-outreach-full-strategy.md`.

---

## Navigation & Routing

### Sidebar
Add "Outreach" section to admin sidebar with sub-items:
- Dashboard (`/admin/outreach`) — default landing
- Contacts (`/admin/outreach/contacts`)
- Replies (`/admin/outreach/replies`)
- Sequences (`/admin/outreach/sequences`)
- Analytics (`/admin/outreach/analytics`)
- Templates (`/admin/outreach/templates`)

### Design Decision: Hybrid Navigation
- **Separate routes** for each major view (listed above)
- **Sub-tabs within views** where needed (Analytics has Overview/Sectors/Timing/Revenue/Cohorts; Templates has Templates/Snippets)
- Rationale: each view has distinct data requirements and mental models; sub-tabs group related sub-views that share context

---

## 1. Dashboard — Morning Cockpit (`/admin/outreach`)

The centre of gravity. Where 90% of daily time is spent. Designed as a "morning cockpit" — open it, see what needs doing, do it, track progress.

### Layout
Two-column: main content (left, ~65%) + sidebar panel (right, ~35%).

### Components

#### 1.1 Daily Briefing Card
- Headline: "Today's Mission" with motivational streak counter ("Day 12")
- Summary: "15 contacts due, 3 overdue, 2 replies waiting"
- Estimated time: "~45 min" (calculated from contact count x ~3 min)
- Visual: progress indicator showing completion through the day

#### 1.2 Stats Strip
Four stat cards in a row:
- **Due Today** — count of ACTIVE contacts where `nextDueAt <= endOfToday`
- **Overdue** — count where `nextDueAt < startOfToday` (red highlight if > 0)
- **Sent Today** — count of SENT activities where `occurredAt >= startOfToday`
- **Replies Waiting** — count of contacts with status REPLIED and no follow-up logged

#### 1.3 Due Contacts Queue (main area)
Scrollable list of contact cards, ordered by `nextDueAt ASC` (overdue first).

**Filter chips** above the list:
- All | Overdue | sector chips (Recruitment, Cleaning, Dental, etc.)
- Clicking a sector filters to batch all contacts from that sector together

**Batch actions bar** (appears when contacts are checked):
- Select All checkbox
- "Mark Sent (N)" | "Skip (N)" | "Pause (N)" buttons
- Count indicator: "3 selected"

**Contact card** contains:
- Contact name (bold), company, sector badge (coloured pill)
- Sequence name + step indicator: "Step 2 of 4 · Email"
- Channel icon (email/LinkedIn/phone)
- Due time: "Due 9:00 AM" or "Overdue 2 days" (red)
- Subject line preview (truncated)
- Action buttons:
  - **Copy** — calls `getBody`, copies rendered subject + body to clipboard, shows toast
  - **Gmail** — `mailto:` link with pre-filled to/subject/body (or LinkedIn URL for LI steps)
  - **Mark Sent** — logs SENT activity, advances step, card slides away with 5-second undo toast
- Checkbox for batch selection

#### 1.4 Keyboard Shortcuts
- `j` / `k` — navigate up/down through contact cards
- `s` — mark current card as sent
- `c` — copy body to clipboard
- `o` — open in Gmail/LinkedIn
- `x` — toggle checkbox for batch selection
- `?` — show shortcuts panel

#### 1.5 Right Column — Recent Replies
List of contacts with status REPLIED, ordered by `lastActivityAt DESC`, limit 10.

Each reply card shows:
- Contact name, company
- Sentiment badge: Positive (green) / Neutral (grey) / Negative (red) / Not Now (amber)
- Reply preview (first ~100 chars)
- Quick actions: "Convert to Deal" button, "Follow Up" button
- Clicking opens the Replies view filtered to that contact

#### 1.6 Right Column — Progress Ring
Circular progress showing sent/total for today. Updates in real-time as contacts are marked sent.

#### 1.7 Right Column — Sequence Performance Mini-Table
Compact table: Sequence Name | Active | Reply Rate | Sent Today
Top 5 sequences by activity. Links to full Sequences view.

### Data Source
Extend the existing `outreach.dashboard.get` endpoint (from backend spec) to return the full cockpit payload: `{ briefing, dueContacts, overdueCount, todayStats, recentReplies, sequencePerformance }`. The briefing (streak counter, estimated time, summary) is computed server-side from the same data the endpoint already queries — no separate `getBriefing` endpoint needed.

**Sector filter chips**: derived client-side from `dueContacts` — extract distinct `sector` values from the returned contacts. No separate endpoint needed at current scale; add `outreach.sequence.listSectors` only if the distinct list needs to include sectors with no due contacts.

**Progress ring**: uses optimistic UI updates via tRPC `useMutation`'s `onMutate` — increment sent count and remove the card immediately on click, revert on error.

New endpoints needed:
- `outreach.contact.batchLogActivity` — batch mark sent/skip/pause (calls `logActivity` per contact in a transaction)
- `outreach.contact.undoActivity` — undo within 5-second window. Implementation: insert a compensating `UNDONE` activity (preserving append-only design), then revert the contact's `currentStep`, `status`, and `nextDueAt` to their pre-action values. The original activity's snapshot of these fields is stored in a `previousState` JSONB column on the activity record at write time, so undo can restore them exactly. The 5-second window is enforced client-side (button disappears after timeout); server-side validates `occurredAt` is within 30 seconds as a safety bound.

**Backend fix required**: The existing `outreach/activity.logged` Inngest event emission in the service layer is missing the `sector` field that the backend spec defines. This must be fixed when implementing these UI features — add `sector` (from the sequence record) to the event data.

---

## 2. Contacts (`/admin/outreach/contacts`)

Full contact management: browse, search, filter, import, and drill into any contact.

### Layout
Full-width data table with filter bar above. Contact detail opens as a slide-over panel.

### Components

#### 2.1 Status Summary Cards
Row of clickable cards at top, each showing a count. Clicking filters the table:
- Active (blue) | Replied (green) | Paused (amber) | Completed (grey) | Bounced (red) | Opted Out (dark) | Converted (purple)

#### 2.2 Filter Bar
- **Search** — text input, searches name/email/company
- **Sequence** — dropdown, filter by sequence
- **Sector** — dropdown, filter by sector
- **Assigned To** — dropdown, filter by user (for team mode)
- **Import** dropdown button with options:
  - Import CSV — opens CSV upload modal
  - Add Manually — opens quick-add form
  - Import from LinkedIn — opens LinkedIn paste modal
  - Bulk Enroll — opens sequence selector for checked contacts

#### 2.3 Data Table
Columns:
- Checkbox (for bulk operations)
- Name — bold, clickable (opens detail slide-over)
- Company
- Email
- Sequence — name with step progress dots (filled for completed steps, outlined for remaining)
- Status — coloured badge
- Next Due — relative date ("Tomorrow", "Overdue 2d")
- Last Activity — relative date
- Actions — kebab menu (Pause, Resume, Convert, Remove)

Pagination: cursor-based, 25 per page, "Load more" button.

#### 2.4 CSV Import Modal
- Drag-and-drop zone or file picker
- Column mapper: shows detected CSV headers, dropdown to map each to firstName/lastName/email/company/sector/notes
- Duplicate detection: highlights rows where email already exists in a sequence
- Preview table showing first 10 rows with mapped data
- "Enroll into sequence" dropdown (optional — can import without enrolling)
- Import button with count: "Import 47 contacts"

New endpoints:
- `outreach.contact.import` — accepts mapped CSV data, creates customers + enrolls. **Duplicate handling**: if a customer with the same email already exists for the tenant, use the existing customer record (do not create a duplicate). If that customer is already enrolled in the target sequence, skip them and include in a `skipped` count in the response. Response shape: `{ imported: number, skipped: number, skippedEmails: string[] }`.
- `outreach.contact.bulkEnroll` — enroll existing contacts into a sequence

#### 2.5 Contact Detail Slide-Over
Opens when clicking a contact name. Full-height right panel (~500px wide).

**Header:**
- Avatar (initials), name, company, sector badge
- Email (clickable mailto), LinkedIn URL (if available)
- Status badge, assigned user

**Quick Actions Grid** (2x3 grid of icon buttons):
- Mark Sent | Skip Step | Log Reply | Pause/Resume | Convert to Deal | Snooze

**Sequence Progress Indicator:**
- Horizontal step circles (1, 2, 3, 4...) connected by lines
- Completed steps: filled with checkmark
- Current step: highlighted ring
- Future steps: outlined
- Channel icon below each step (envelope, LinkedIn, phone)

**Activity Timeline:**
- Vertical timeline with dots and connecting line
- Each entry: timestamp, activity type badge, channel, details
- "Email sent — Step 2 · Email" with subject line preview
- Notes shown inline if present
- Sorted newest first

**Notes Section:**
- Editable textarea, auto-saves on blur
- Placeholder: "Add notes about this contact..."

**Related Deals:**
- If status is CONVERTED, shows pipeline card with: deal name, stage, value, pipeline name
- Link to pipeline view

**Enrichment Data** (future):
- Grid showing: title, phone, LinkedIn, company size, industry
- "Re-enrich" button (future Apollo/Clay integration)

---

## 3. Replies (`/admin/outreach/replies`)

Dedicated reply management interface. Email inbox-style split pane for processing responses efficiently.

### Layout
Two-column split pane: reply list (left, ~35%) + reply detail (right, ~65%).

### Components

#### 3.1 Reply List (Left Panel)
Filterable list of contacts with status REPLIED.

**Filters:**
- All | Uncategorized | Positive | Not Now | Negative
- Search by name/company

**Reply cards:**
- Contact name (bold if uncategorized — i.e. `replyCategory IS NULL`)
- Company
- Sentiment badge (colour-coded pill) — derived from `replyCategory` (see Sentiment section below)
- Reply preview (first ~80 chars)
- Sequence name tag
- Relative timestamp
- Blue dot indicator for uncategorized replies (`replyCategory IS NULL`) — this is NOT a separate read/unread tracking system

Sorted by `lastActivityAt DESC`.

#### 3.2 Reply Detail (Right Panel)
Full context for the selected reply.

**Contact Header:**
- Name, company, email, sector badge
- Step indicator: "Replied at Step 2 of 4"

**Action Bar:**
- Convert to Deal (primary button)
- Follow Up (opens follow-up scheduler)
- Snooze (opens snooze panel)

**One-Click Categorization Row:**
Five buttons in a row, each a quick-categorize action:
- Interested (green) | Not Now (amber) | Not Interested (red) | Wrong Person (grey) | Auto-Reply (light grey)
- Clicking sets `replyCategory` on the contact record
- Currently selected category is highlighted

**Reply Message:**
- Full reply text displayed
- Timestamp, from address
- Original outreach email shown below in collapsed/expandable accordion

**Sequence Context Card:**
- Sequence name, sector
- Which step they replied to
- How many days into the sequence

**Snooze Scheduler:**
- Preset buttons: "1 week", "2 weeks", "1 month", "Next quarter"
- Custom date picker
- Sets `snoozedUntil` on contact, transitions back to ACTIVE when date arrives, reappears in Dashboard queue

**Notes:**
- Editable textarea (same as contact detail)
- Persists to `outreach_contacts.notes`

**Convert to Deal (inline form):**
- Pipeline selector dropdown
- Stage selector dropdown
- Deal value input (currency)
- Source: auto-filled "Outreach — {sequence name}"
- "Convert" button — calls `outreach.contact.convert`

### Sentiment vs Reply Category

`replyCategory` is the primary field — set by the user via the One-Click Categorization Row. `sentiment` is auto-derived from `replyCategory` and never set independently:

| replyCategory | Auto-derived sentiment |
|---------------|----------------------|
| INTERESTED | POSITIVE |
| NOT_NOW | NOT_NOW |
| NOT_INTERESTED | NEGATIVE |
| WRONG_PERSON | NEUTRAL |
| AUTO_REPLY | NEUTRAL |

The `categorize` endpoint sets `replyCategory` and auto-computes `sentiment`. Dashboard reply cards and list filters use `sentiment` for colour-coded display; the Replies view uses `replyCategory` for the detailed categorization buttons.

### Schema Additions Required
- `outreach_contacts.sentiment` — pgEnum: POSITIVE | NEUTRAL | NEGATIVE | NOT_NOW (nullable, auto-derived from replyCategory)
- `outreach_contacts.replyCategory` — pgEnum: INTERESTED | NOT_NOW | NOT_INTERESTED | WRONG_PERSON | AUTO_REPLY (nullable)
- `outreach_contacts.snoozedUntil` — timestamp (nullable)

### State Machine Extension Required

The backend spec's state machine does NOT include `REPLIED → ACTIVE`. This transition must be added to the backend:
- **Trigger**: Inngest cron `outreach/check-snooze` finds contacts where `status = REPLIED AND snoozedUntil <= now()`
- **Action**: set `status = ACTIVE`, recompute `nextDueAt` from current step, clear `snoozedUntil`
- **Service change**: add `reactivateSnoozedContact` method (separate from `resumeContact` which only handles PAUSED)
- The `snooze` endpoint itself does NOT change status — it sets `snoozedUntil` while status remains REPLIED. The cron handles the transition.

New endpoints:
- `outreach.contact.categorize` — sets replyCategory + auto-derives sentiment
- `outreach.contact.snooze` — sets snoozedUntil on a REPLIED contact

---

## 4. Sequences (`/admin/outreach/sequences`)

Browse, compare, and edit sequences. A/B test insights front and centre.

### Layout
Grid of sequence cards with A/B spotlight section at top. Editor opens as slide-over.

### Components

#### 4.1 Filter Bar
- Filter pills: All | Active | Paused | Archived
- Sector filter dropdown
- "New Sequence" button (opens editor slide-over)

#### 4.2 A/B Test Spotlight
Shown when paired sequences exist. Side-by-side comparison card.

- Left card (Variant A) vs Right card (Variant B) with "VS" divider
- Each side shows: name, enrolled count, reply rate (large %), sent count
- Step-level reply rate bars: horizontal bars comparing reply rate at each step
- Confidence meter: "82% confidence A is better" (calculated from sample size + difference)
- "View Full Comparison" link to Analytics

#### 4.3 Sequence Cards Grid
Responsive grid (2-3 columns). Each card:

**Header:** Sequence name, sector badge, status pill (Active/Paused/Archived)

**Stats row:** Enrolled | Reply Rate | Avg Days to Reply | Sent

**Status distribution bar:** Horizontal stacked bar showing proportions:
- Active (blue) | Replied (green) | Completed (grey) | Bounced (red) | Opted Out (dark)

**Revenue:** "Revenue attributed: £12,500" (sum of converted deal values)

**Visual step flow:** Horizontal flow of step nodes:
- Each node: channel icon + step number
- Delay days shown between nodes ("3d" → "5d" → "4d")
- Colour: completed steps in solid, future in outlined

**Footer actions:** Edit | Duplicate | Archive | Pause/Resume

#### 4.4 Sequence Editor Slide-Over
Full-height right panel. Tabs: Settings | Steps | Contacts | Performance.

**Settings tab:**
- Name input
- Description textarea
- Sector dropdown
- Target ICP textarea
- A/B variant toggle: when enabled on a sequence without a pair, duplicates the current sequence with `abVariant: 'B'` and sets `pairedSequenceId` on both records (satisfying the CHECK constraint). When disabled, clears `abVariant` and `pairedSequenceId` on both sequences (the paired sequence is NOT deleted — it becomes a standalone sequence).
- Active/Paused status toggle

**Steps tab:**
- Collapsible accordion of steps, ordered by position
- Each step expands to show:
  - Channel selector: Email / LinkedIn Request / LinkedIn Message / Call (note: `channel` is stored as `text` in the schema, not a pgEnum — validation happens at the application layer via Zod enum)
  - Delay days input: "Wait N days after previous step"
  - Subject line input (email only)
  - Body editor: rich text area with template variable pills
    - Variable insertion bar: clickable pills for `{{firstName}}`, `{{company}}`, `{{sector}}`, `{{lastName}}`
    - Clicking a pill inserts the variable at cursor position
  - Internal notes textarea
  - AI assist bar (post-MVP): Rewrite | Shorter | More casual | Add social proof | Stronger CTA
    - Clicking generates 2-3 variants below for "Use this" selection
  - Preview mode: dropdown to select a real contact, renders the template with their data
- Drag handles on collapsed steps for reordering
- "Add Step" button at bottom
- Sticky save bar at bottom: "Save" + "Save & Close"

**Contacts tab:**
- Mini data table of contacts enrolled in this sequence
- Same columns as main Contacts table but filtered
- "Enroll Contact" button

**Performance tab:**
- Reply rate by step (bar chart)
- Status distribution (same as card)
- Activity timeline for this sequence

---

## 5. Analytics (`/admin/outreach/analytics`)

Deep performance insights. Sub-tabs for different analytical views.

### Sub-tabs
Overview | Sectors | Timing | Revenue | Cohorts

Date range selector in top-right corner (This Week / This Month / Last 30 Days / Last 90 Days / Custom).

### 5.1 Overview Tab

**Weekly Digest Banner:**
- "Week of March 17: 89 sent, 11 replies (12.4%), 3 conversions. Reply rate up 2.1% from last week."
- Generated by Inngest cron (Monday morning)

**State Machine + Conversion Funnel:**
- Visual funnel: Enrolled (410) → Replied (49) → Interested (18) → Converted (6)
- Conversion percentages between each stage
- Pipeline value at the end: "£32,500 pipeline generated"

**Channel Performance:**
- Bar chart: Email vs LinkedIn vs Call — reply rates per channel
- Insight callout box: "LinkedIn messages have 46% higher reply rate than email"

**Sequence Velocity:**
- Average days from enrollment to first reply
- Average days from reply to conversion
- Trend arrows (up/down vs previous period)

#### 5.2 Sectors Tab

**Sector Performance Table:**
- Columns: Sector | Enrolled | Sent | Replies | Reply Rate | Converted | Revenue | Trend
- Trend arrows: green up / red down vs previous period
- Sortable columns
- Clickable rows drill into sector detail

**Sector Heatmap** (if enough data):
- Grid of sectors x metrics, colour intensity = performance

#### 5.3 Timing Tab

**Best Time Heatmap:**
- Grid: Day of week (rows) x Hour of day (columns)
- Colour intensity = reply rate
- Highlight best cell: "Tuesday 9-11 AM: 18% reply rate"

**Optimal Sequence Length:**
- Bar chart showing % of replies by step number
- Insight: "68% of replies come by Step 3"
- Recommendation: "Consider 3-step sequences for sectors with low engagement"

#### 5.4 Revenue Tab

**Revenue Attribution:**
- Total pipeline value from outreach
- Revenue by sequence (bar chart)
- Revenue by sector (bar chart)

**Sequence Comparison Table:**
- Columns: Sequence | Enrolled | Replies | Converted | Revenue | Rev/Contact | Cost/Reply | ROI
- Ranked by ROI (revenue per contact enrolled)
- Highlights top performer

**Unit Economics:**
- Cost per reply (infrastructure cost / total replies)
- Revenue per contact enrolled
- Payback period

#### 5.5 Cohorts Tab

**Cohort Analysis Grid:**
- Rows: enrollment week cohorts
- Columns: Week 1 reply rate, Week 2, Week 3, Week 4
- Shows improving or declining performance over time
- Colour gradient: darker = higher reply rate

### Data Sources
- `outreach.analytics.sequences` — per-sequence stats with date range
- `outreach.analytics.sectors` — per-sector stats with date range
- New endpoints needed:
  - `outreach.analytics.timing` — reply rate by day/hour
  - `outreach.analytics.revenue` — revenue attribution by sequence/sector
  - `outreach.analytics.cohorts` — cohort reply rates by enrollment week

---

## 6. Templates (`/admin/outreach/templates`)

Template library and reusable snippet management. Post-MVP feature, but designed now for consistency.

### Sub-tabs
Templates | Snippets

### 6.1 Templates Tab

**Category Filter:**
- Pills: All | Intro | Follow-up | Break-up | Case Study | LinkedIn | Custom

**Template Cards Grid:**
Each card shows:
- Template name (bold)
- Category badge (coloured pill)
- Subject line with variable pills highlighted (e.g. `{{firstName}}` in blue pills)
- Body preview (first ~100 chars)
- Stats: Reply Rate (if used in sequences) | Times Used | Conversions
- Actions: Edit | Duplicate | Delete

**Template Editor Panel:**
Opens on card click or "New Template" button. Right panel or modal.

**Performance strip** at top: Reply Rate | Times Used | Conversions (from sequences using this template)

**Fields:**
- Name input
- Category selector
- Channel selector (Email / LinkedIn / Call script)
- Preview mode: dropdown to select a contact, renders variables highlighted in green
- Variable insertion bar: clickable pills for `{{firstName}}`, `{{company}}`, `{{sector}}`, `{{lastName}}`
- Subject line input (email only)
- Body editor (rich text)
- AI Assist section (post-MVP):
  - Buttons: Generate Variants | Shorter | More casual | Add social proof | Stronger CTA
  - Generated variants appear below with "Use this" buttons
- Tags input (for categorization/search)
- "Used in Sequences" list: shows which sequences reference this template, with links

### 6.2 Snippets Tab

Reusable content blocks that can be inserted into any template.

**Snippet Cards Grid:**
Each card:
- Snippet name
- Category: Case Study | CTA | Social Proof | Break-up Closer | Objection Handler
- Preview text
- Usage count: "Used in 4 templates"
- Actions: Edit | Copy | Delete

**Snippet Editor:**
- Name input
- Category selector
- Body editor (supports template variables)
- "Used in Templates" list

### Schema Additions Required

**New table: `outreach_templates`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK | |
| name | text | NOT NULL |
| category | text | NOT NULL (intro, follow-up, break-up, case-study, linkedin, custom) |
| channel | text | NOT NULL (EMAIL, LINKEDIN_REQUEST, LINKEDIN_MESSAGE, CALL) |
| subject | text | nullable (email only) |
| bodyMarkdown | text | NOT NULL |
| tags | text[] | nullable |
| isActive | boolean | DEFAULT true |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**New table: `outreach_snippets`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK | |
| name | text | NOT NULL |
| category | text | NOT NULL |
| bodyMarkdown | text | NOT NULL |
| isActive | boolean | DEFAULT true |
| createdAt | timestamp | |
| updatedAt | timestamp | |

New endpoints:
- `outreach.template.list` / `.getById` / `.create` / `.update` / `.delete`
- `outreach.snippet.list` / `.getById` / `.create` / `.update` / `.delete`

---

## Schema Changes Summary

### Modifications to `outreach_contacts`
- Add `sentiment` — pgEnum: POSITIVE | NEUTRAL | NEGATIVE | NOT_NOW (nullable, auto-derived from replyCategory)
- Add `replyCategory` — pgEnum: INTERESTED | NOT_NOW | NOT_INTERESTED | WRONG_PERSON | AUTO_REPLY (nullable)
- Add `snoozedUntil` — timestamp (nullable)

### Modifications to `outreach_activities`
- Add `performedByUserId` — uuid FK to users (nullable, for team attribution)
- Add `previousState` — jsonb (nullable, stores `{ currentStep, status, nextDueAt }` snapshot for undo support)

### New Tables
- `outreach_templates` — reusable email/message templates
- `outreach_snippets` — reusable content blocks

### New State Transition (backend extension required)
- `REPLIED → ACTIVE` — when `snoozedUntil` expires (snooze reactivation via Inngest cron `outreach/check-snooze`)
- Requires new service method `reactivateSnoozedContact` (distinct from existing `resumeContact` which handles PAUSED only)

### New Activity Type
- `UNDONE` — compensating activity for undo support (preserves append-only design)

### New Inngest Crons
- `outreach/check-snooze` — daily, reactivates snoozed contacts where `snoozedUntil <= now()`
- `outreach/check-stale-replies` — daily, flags REPLIED contacts with no follow-up in 48h
- `outreach/check-overdue` — daily, alerts on contacts overdue > 3 days
- `outreach/weekly-digest` — Monday, generates weekly performance summary

---

## New Endpoints Summary

### Dashboard
- Extend existing `outreach.dashboard.get` — add briefing (streak, estimated time, summary) to response
- `outreach.contact.batchLogActivity` — batch mark sent/skip/pause
- `outreach.contact.undoActivity` — compensating UNDONE activity + state revert (30s server-side limit)

### Contacts
- `outreach.contact.import` — CSV import with column mapping
- `outreach.contact.bulkEnroll` — enroll multiple contacts into a sequence
- `outreach.contact.getDetail` — aggregated contact detail (contact + activities + sequence progress)
- `outreach.contact.getActivities` — paginated activity timeline for a contact

### Replies
- `outreach.contact.categorize` — set replyCategory + auto-derive sentiment
- `outreach.contact.snooze` — set snoozedUntil on REPLIED contact

### Analytics
- `outreach.analytics.timing` — reply rate by day/hour
- `outreach.analytics.revenue` — revenue attribution by sequence/sector
- `outreach.analytics.cohorts` — cohort reply rates by enrollment week

### Templates
- `outreach.template.list` / `.getById` / `.create` / `.update` / `.delete`
- `outreach.snippet.list` / `.getById` / `.create` / `.update` / `.delete`

---

## Implementation Priority

### Phase 1 — Core Workflows (MVP)
1. Dashboard (morning cockpit) with due queue, batch actions, keyboard shortcuts
2. Contact detail slide-over with timeline and quick actions
3. Reply management with categorization and snooze
4. Contact import (CSV + manual)

### Phase 2 — Management
5. Sequence editor with step builder and preview
6. Pipeline integration UI (convert slide-over, revenue attribution)
7. Contacts page with full table, filters, status cards

### Phase 3 — Intelligence
8. Analytics: Overview, Sectors, Timing tabs
9. Analytics: Revenue and Cohorts tabs

### Phase 4 — Templates (Post-MVP)
10. Template library with editor
11. Snippet library
12. AI assist integration

---

## Visual Mockups

All 6 views have been prototyped as interactive HTML mockups:
- `.superpowers/brainstorm/8537-1774098977/dashboard.html`
- `.superpowers/brainstorm/8537-1774098977/contacts.html`
- `.superpowers/brainstorm/8537-1774098977/replies.html`
- `.superpowers/brainstorm/8537-1774098977/sequences.html`
- `.superpowers/brainstorm/8537-1774098977/analytics.html`
- `.superpowers/brainstorm/8537-1774098977/templates.html`
