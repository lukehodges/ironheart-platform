# Admin vs Platform UI Comparison Audit

**Date:** 2026-05-24
**Prepared by:** Investigation subagent
**Purpose:** Inventory both UI surfaces, document visual gaps, and recommend a migration path for porting `/admin/*` look-and-feel to `/platform/*`.

---

## Executive Summary

The gap is larger than expected — but it is mostly cosmetic, not structural. The admin surface is fully styled in the ih-* design system (inline CSS + global utility classes). The platform functional pages (0.1–0.5) use shadcn/Tailwind defaults with no ih-* tokens. The token system and utility classes exist in `globals.css`; what is missing is a skin layer on top of the platform components. The shared component library (`src/components/shared/`) already extracts many of the admin's visual patterns into reusable components — they just are not being consumed by platform pages yet.

**Recommended option: C (Hybrid).** Option A (copy + reroute) is attractive for speed but would throw away working tRPC wiring. Option B (full visual port) is the right approach for pages already built. Option C is pragmatic — apply Option B to functional pages (audit, onboarding, report, new-client form, superadmin) and Option A to the large stub pages (clients list, engagement detail, pipeline, calendar, payments).

---

## Side A: `/admin/*` Inventory

Total pages: **41** (including 3 redirect/empty stubs). Total lines: ~18,250.

All non-stub pages use the ih-* design system exclusively: inline `style={{ ... }}` props using `var(--ih-*)` CSS tokens, plus utility classes (`ih-serif`, `ih-eyebrow`, `ih-card`, `ih-btn`, `ih-pill`, `ih-dot`, `ih-mono`, `ih-num`). No shadcn components are present. All pages import from `@/components/shell` (Icon) and `@/components/shared` (shared primitives).

### Admin page inventory

| Page | Lines | Mock source | Layout pattern | Port priority |
|------|-------|-------------|----------------|---------------|
| `admin/page.tsx` | 5 | — | Redirect to dashboard | Skip |
| `admin/scheduling/page.tsx` | 5 | — | Empty/redirect stub | Skip |
| `admin/developer/page.tsx` | 5 | — | Empty/redirect stub | Skip |
| `admin/dashboard/page.tsx` | 273 | Inline const | Dashboard w/ "three things" hero + activity feed tabs | HIGH (port to `platform/today`) |
| `admin/clients/page.tsx` | 764 | `@/lib/mock/clients` | Segment rail + sortable table + view toggle | HIGH (port to `platform/clients`) |
| `admin/clients/new/page.tsx` | 237 | None | Single-column form, ih-* inputs | MEDIUM (restyle platform version) |
| `admin/clients/[engagementId]/page.tsx` | 945 | None (hardcoded) | Entity hub w/ tab bar (9 tabs), connection map, sprint tracker | HIGH (port to `platform/clients/[id]`) |
| `admin/clients/[engagementId]/hub/page.tsx` | 307 | None | Entity header w/ serif hero title + tab bar | HIGH (port to `platform/clients/[id]`) |
| `admin/clients/[engagementId]/overview/page.tsx` | 170 | None | Two-col overview tab content | Medium |
| `admin/clients/[engagementId]/audit/page.tsx` | 540 | None (local const) | 5-lens table w/ RAG badges + findings + recs | HIGH (restyle platform version) |
| `admin/clients/[engagementId]/audit/lens/page.tsx` | 330 | None | Lens drill-down detail | MEDIUM |
| `admin/clients/[engagementId]/report/page.tsx` | 246 | None | Phase-timeline report + summary table | HIGH (restyle platform version) |
| `admin/clients/[engagementId]/work/page.tsx` | 341 | None | Gantt-style milestone table + cashflow | LOW (no platform equivalent yet) |
| `admin/clients/[engagementId]/money/page.tsx` | 160 | None | Invoice list for engagement | LOW |
| `admin/clients/[engagementId]/proposals/new/page.tsx` | 406 | None | Multi-section proposal builder | LOW |
| `admin/clients/[engagementId]/proposals/[proposalId]/page.tsx` | 338 | None | Proposal viewer | LOW |
| `admin/customers/page.tsx` | 1018 | `@/lib/mock/customers` | Segment rail + table + right-side preview drawer | HIGH (port to `platform/clients`) |
| `admin/customers/[id]/page.tsx` | 559 | `@/lib/mock/customers` | Entity hub w/ tab bar (6 tabs) | HIGH |
| `admin/pipeline/page.tsx` | 1002 | `@/lib/mock/pipeline` | Table + kanban toggle + segment rail + drawer | HIGH (port to `platform/pipeline`) |
| `admin/pipeline/[id]/page.tsx` | 445 | `@/lib/mock/pipeline` | Deal detail hub w/ entity header | MEDIUM |
| `admin/calendar/page.tsx` | 1104 | `@/lib/mock/calendar` | Day/week/month time-grid calendar | MEDIUM (port to `platform/calendar`) |
| `admin/team/page.tsx` | 828 | `@/lib/mock/team` | Segment rail + table + right-side drawer | MEDIUM |
| `admin/team/[id]/page.tsx` | 1168 | `@/lib/mock/team` | Person hub w/ 5 tabs (activity, skills, bookings, etc.) | LOW |
| `admin/inbox/page.tsx` | 793 | `@/lib/mock/inbox` | Triage list w/ right-side message view | MEDIUM |
| `admin/payments/page.tsx` | 194 | None (local const) | Invoice table + overdue rail | MEDIUM |
| `admin/payments/new/page.tsx` | 344 | None | Payment creation form | LOW |
| `admin/payments/[id]/page.tsx` | 281 | None | Payment detail | LOW |
| `admin/bookings/page.tsx` | 133 | None (local const) | Compact bookings list | MEDIUM |
| `admin/bookings/new/page.tsx` | 272 | None | Booking creation form | LOW |
| `admin/bookings/[id]/page.tsx` | 237 | None | Booking detail | LOW |
| `admin/workflows/page.tsx` | 869 | `@/lib/mock/workflows` | List + kanban toggle + slide-in detail drawer | MEDIUM |
| `admin/workflows/[id]/page.tsx` | 607 | `@/lib/mock/workflows` | Workflow detail + execution log | MEDIUM |
| `admin/workflows/[id]/edit/page.tsx` | 669 | `@/lib/mock/workflows` | Linear + visual step editor (NO react-flow) | LOW (complex, flag below) |
| `admin/workflows/[id]/executions/page.tsx` | 293 | `@/lib/mock/workflows` | Execution history log | LOW |
| `admin/audit/page.tsx` | 414 | `@/lib/mock/audit-log` | System audit log (not client audit) — monospace log viewer | LOW |
| `admin/forms/page.tsx` | 166 | None (local const) | Template list + submission counts | MEDIUM |
| `admin/forms/[id]/page.tsx` | 329 | None | Form detail | LOW |
| `admin/forms/submissions/[id]/page.tsx` | 185 | None | Submission viewer | LOW |
| `admin/analytics/page.tsx` | 234 | None (local const) | Dashboard w/ bar charts (custom SVG), stat cards | MEDIUM |
| `admin/outreach/page.tsx` | 267 | None (local const) | CRM outreach sequences + queue + reply inbox | MEDIUM |
| `admin/reviews/page.tsx` | 232 | None (local const) | Review requests list | LOW |
| `admin/settings/page.tsx` | 309 | None | Settings w/ section cards | MEDIUM |
| `admin/ai-chat/page.tsx` | 228 | None | Chat interface | LOW |
| `admin/scheduling/page.tsx` | 5 | — | Stub | Skip |

**Potentially obsolete / skip-flag pages:**
- `admin/customers/*` — This appears to be a different entity from `admin/clients/*` (customers = contacts/leads; clients = engaged companies). The platform uses the same `customers` table from DB. Map `admin/customers/page.tsx` → `platform/clients` combined view, or retain as separate "Contacts" section. Requires naming clarification.
- `admin/audit/page.tsx` (414 lines) — This is a system activity/audit log (DEBUG/INFO/WARNING/ERROR/CRITICAL severity badges), not a client audit workspace. Has no platform equivalent. Low priority.
- `admin/workflows/[id]/edit/page.tsx` — The visual workflow editor uses a custom step-node renderer (not react-flow, not a canvas library). It is complex but self-contained. No platform equivalent yet. Flag as non-trivial to port.

---

## Side B: `/platform/*` Inventory

Total pages: **34**. Total lines: ~2,360. The difference in total lines (18,250 admin vs 2,360 platform) is the clearest signal of the gap.

### Platform page inventory

| Page | Lines | Type | Styling | Notes |
|------|-------|------|---------|-------|
| `platform/page.tsx` | 4 | Redirect to `/platform/today` | — | — |
| `platform/today/page.tsx` | 11 | STUB (PlaceholderPage) | shadcn | Admin equivalent: `admin/dashboard` (273 lines) |
| `platform/clients/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/clients` (764 lines) |
| `platform/clients/new/page.tsx` | 429 | FUNCTIONAL (Phase 0.1.B) | shadcn/Tailwind | Uses `Button`, `Input`, `Label`, `Card`, `Select` from shadcn. Real tRPC. |
| `platform/clients/[id]/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/clients/[engagementId]` (945 lines) + hub (307 lines) |
| `platform/clients/[id]/onboarding/page.tsx` | 45 | FUNCTIONAL thin shell (Phase 0.1.C) | shadcn (passes to `ChartEditor` component) | Real tRPC via ChartEditor |
| `platform/clients/[id]/audit/page.tsx` | 31 | FUNCTIONAL thin shell (Phase 0.3) | shadcn (passes to `AuditWorkspace` component) | Real tRPC via AuditWorkspace |
| `platform/clients/[id]/report/page.tsx` | 31 | FUNCTIONAL thin shell (Phase 0.4) | shadcn (passes to `ReportEditor` component) | Real tRPC via ReportEditor |
| `platform/superadmin/page.tsx` | 881 | FUNCTIONAL (Phase 0.1.B) | ih-* (exception — uses ih-* AND shared components) | Only platform page using ih-* + shared components |
| `platform/pipeline/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/pipeline` (1002 lines) |
| `platform/calendar/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/calendar` (1104 lines) |
| `platform/inbox/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/inbox` (793 lines) |
| `platform/team/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/team` (828 lines) |
| `platform/payments/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/payments` (194 lines) |
| `platform/invoices/page.tsx` | 11 | STUB | shadcn | No direct admin equivalent (payments covers this) |
| `platform/finance/page.tsx` | 11 | STUB | shadcn | New concept — no admin page |
| `platform/analytics/page.tsx` | 59 | Partial (DB queries, no UI) | shadcn | Admin equivalent: `admin/analytics` (234 lines) |
| `platform/reports/page.tsx` | 11 | STUB | shadcn | Different from per-client report — possibly report library |
| `platform/forms/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/forms` (166 lines) |
| `platform/outreach/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/outreach` (267 lines) |
| `platform/reviews/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/reviews` (232 lines) |
| `platform/workflows/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/workflows` (869 lines) |
| `platform/bookings/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/bookings` (133 lines) |
| `platform/settings/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/settings` (309 lines) |
| `platform/ai-chat/page.tsx` | 11 | STUB | shadcn | Admin equivalent: `admin/ai-chat` (228 lines) |
| `platform/revenue/page.tsx` | 118 | FUNCTIONAL (DB queries + basic render) | shadcn/Tailwind | Real DB — no admin equivalent |
| `platform/products/page.tsx` | 7 | FUNCTIONAL (server page, passes to client) | shadcn | SaaS product management — no admin equivalent |
| `platform/products/new/page.tsx` | 96 | FUNCTIONAL | shadcn/tRPC | — |
| `platform/products/[id]/page.tsx` | 82 | FUNCTIONAL | shadcn/tRPC | — |
| `platform/products/compare/page.tsx` | 212 | FUNCTIONAL | shadcn/tRPC | — |
| `platform/subscriptions/page.tsx` | 85 | FUNCTIONAL | shadcn | SaaS subscriptions — no admin equivalent |
| `platform/tenants/page.tsx` | 33 | FUNCTIONAL thin shell | shadcn | Uses `TenantListTable` from platform components |
| `platform/tenants/new/page.tsx` | 16 | FUNCTIONAL thin shell | shadcn | — |
| `platform/tenants/[id]/page.tsx` | 31 | FUNCTIONAL thin shell | shadcn | Uses `TenantDetailContent` component |

### Tenant portal pages

| Page | Lines | Type | Styling |
|------|-------|------|---------|
| `[tenantSlug]/dashboard/page.tsx` | 80 | FUNCTIONAL (Phase 0.1.B) | shadcn/Tailwind (`font-serif`, `text-muted-foreground`) |
| `[tenantSlug]/dashboard/onboarding/page.tsx` | 44 | FUNCTIONAL thin shell (Phase 0.1.C) | shadcn (passes to `ChartEditor`) |
| `[tenantSlug]/dashboard/audit/page.tsx` | 42 | FUNCTIONAL thin shell (Phase 0.2.C) | shadcn |
| `[tenantSlug]/dashboard/report/page.tsx` | 47 | FUNCTIONAL thin shell (Phase 0.5) | shadcn |

**Platform stub count:** 20 pages are PlaceholderPage stubs (11-line files). 14 pages have real implementations. Of those 14, only `superadmin/page.tsx` uses ih-* tokens. Every other functional platform page uses shadcn defaults.

---

## Shared Component Layers

```
src/components/
  shared/           — ih-* design system components (used by admin + superadmin)
  shell/            — Icon, Logo, Command palette, Sidebar, Topbar, Frame
  platform/         — Platform-specific: PlaceholderPage, sidebar/topbar, tenant cards, etc.
  audit/            — audit-workspace, capture-layer, processing-layer, report-ready-layer
  onboarding/       — chart-editor, chart-tree, node-inspector, activity-feed
  report/           — report-editor, markdown-editor, audit-summary-pane, status-bar
  tenant-portal/    — stage-strip, action-card (used by [tenantSlug]/dashboard)
  ui/               — shadcn primitives (Button, Card, Input, etc.)
  layout/           — Generic layout wrappers
  charts/           — Chart components
  stat-card/        — Stat card (see if ih-* or shadcn)
  ...
```

**Key observation:** `src/components/shared/` already contains implemented ih-* versions of the main admin visual patterns. These were extracted but are not imported by platform pages:

| Shared component | Matches admin pattern | Used by admin? | Used by platform? |
|------------------|-----------------------|----------------|-------------------|
| `entity-header.tsx` | SC-01 — large serif hero header | Yes (some pages) | No |
| `stage-pipeline.tsx` | SC-02 — horizontal stage strip | Yes | No |
| `activity-timeline.tsx` | SC-03 — grouped activity feed | Yes | No |
| `connection-map.tsx` | SC-04 — 6-col connection card grid | Yes | No |
| `stat-card.tsx` | SC-05 — eyebrow + big serif number | Yes | No |
| `data-table.tsx` | SC-06 — mono-header sortable table | Yes | No |
| `right-rail.tsx` | SC-07 — 320px contextual sidebar | Yes | No |
| `mini-card.tsx` | SC-08 — card with eyebrow header | Yes | No |
| `filter-tabs.tsx` | SC-09 — horizontal filter tab row | Yes | No |
| `segment-rail.tsx` | SC-10 — vertical grouped sidebar | Yes | No |
| `empty-state.tsx` | SC-11 — centered empty state | Yes | No |
| `confirm-dialog.tsx` | SC-12 | Yes | No |
| `status-pill.tsx` | SC-13 | Yes | No |
| `notification-toast.tsx` | SC-14 | Yes | Superadmin only |

This is a critical finding: **the ih-* shared component library already exists and is production-quality.** The platform pages simply never consumed it. Visual porting is primarily a matter of swapping shadcn primitives → ih-* shared components, not rebuilding from scratch.

---

## Functional Surface Comparison

| Surface | `/admin` equivalent | `/platform` equivalent | Status | Gap |
|---------|--------------------|-----------------------|--------|-----|
| Dashboard / Today | `admin/dashboard` — 273 lines, hero greeting + three-cards + activity feed | `platform/today` — 11-line stub | STUB | Full build needed. Copy admin version, wire tRPC for real activity. |
| Clients list | `admin/clients` — 764 lines, segment rail + sortable table + stage pipeline | `platform/clients` — 11-line stub | STUB | Full build needed. See Option A/C. |
| New client form | `admin/clients/new` — 237 lines, ih-* forms | `platform/clients/new` — 429 lines, shadcn forms, real tRPC | FUNCTIONAL but wrong skin | Restyle: swap shadcn `Button/Input/Label/Card` → ih-* equivalents. Logic stays. |
| Engagement detail (hub) | `admin/clients/[engagementId]` — 945 lines + `hub/` — 307 lines; entity header w/ serif title, 9 tabs, connection map, sprint tracker | `platform/clients/[id]` — 11-line stub | STUB | Big gap. Port admin hub page; replace mock data wiring. |
| Onboarding (org chart) | No admin equivalent (feature is new in 0.1.C) | `platform/clients/[id]/onboarding` — 45 lines shell → `ChartEditor` component | FUNCTIONAL | Visual port only. ChartEditor uses `border-border`, `text-muted-foreground` — needs ih-* skin. |
| Audit workspace | `admin/clients/[engagementId]/audit` — 540 lines, 5-lens table w/ RAG + findings | `platform/clients/[id]/audit` — 31 lines shell → `AuditWorkspace` component (3-layer) | FUNCTIONAL but diverged | Both implement audit, but differently. Admin is mockup; platform is real. Visual port the platform version — it is more complete functionally. |
| Report editor | `admin/clients/[engagementId]/report` — 246 lines, phase timeline + summary table, ih-* | `platform/clients/[id]/report` — 31 lines shell → `ReportEditor` component | FUNCTIONAL but wrong skin | Visual port. ReportEditor uses shadcn text classes. |
| Pipeline / Deals | `admin/pipeline` — 1002 lines, kanban + table toggle + segment rail + drawer | `platform/pipeline` — 11-line stub | STUB | Port admin version; rewire mock deal data → tRPC. |
| Calendar | `admin/calendar` — 1104 lines, day/week/month time grid | `platform/calendar` — 11-line stub | STUB | Large lift. Port admin version; real Cal.com integration pending. |
| Payments / Invoices | `admin/payments` — 194 lines, invoice table + overdue rail | `platform/payments` + `platform/invoices` — both stubs | STUB | Port admin version; wire to Stripe data. |
| Team | `admin/team` — 828 lines, segment rail + table + drawer | `platform/team` — 11-line stub | STUB | Port admin version; wire to WorkOS user data. |
| Inbox | `admin/inbox` — 793 lines, triage list + message pane | `platform/inbox` — 11-line stub | STUB | Port admin version; wire to messaging backend. |
| Superadmin (tenant list) | No direct admin equivalent | `platform/superadmin` — 881 lines, ih-* table + drawer | FUNCTIONAL + already ih-* | Already done. Uses ih-* tokens correctly. |
| Forms | `admin/forms` — 166 lines, template list | `platform/forms` — 11-line stub | STUB | Port admin version; wire to form service. |
| Analytics | `admin/analytics` — 234 lines, bar charts + stat cards | `platform/analytics` — 59 lines (DB query, no UI) | PARTIAL | Port admin UI; wire to real DB queries. |
| Settings | `admin/settings` — 309 lines, settings cards | `platform/settings` — 11-line stub | STUB | Port admin version. |
| Outreach | `admin/outreach` — 267 lines, sequences + queue | `platform/outreach` — 11-line stub | STUB | Port admin version; sequence backend TBD. |
| Products / Plans | No admin equivalent | `platform/products/*` — FUNCTIONAL (shadcn) | FUNCTIONAL | SaaS-only feature. Visual port only (shadcn → ih-*). |
| Revenue | No admin equivalent | `platform/revenue` — 118 lines, real DB | FUNCTIONAL | Visual port only. |
| Tenants | No admin equivalent | `platform/tenants/*` — FUNCTIONAL (shadcn) | FUNCTIONAL | Visual port only. |
| Client portal landing | No admin equivalent | `[tenantSlug]/dashboard` — 80 lines, shadcn | FUNCTIONAL | Visual port. Uses `font-serif` directly — close but not ih-* classes. |
| Client portal audit view | No admin equivalent | `[tenantSlug]/dashboard/audit` — 42 lines | FUNCTIONAL | Visual port. |
| Client portal report view | No admin equivalent | `[tenantSlug]/dashboard/report` — 47 lines | FUNCTIONAL | Visual port. |

---

## Visual Pattern Catalog

All of the following patterns originate in `/admin/*` and are candidates for systematic reuse in `/platform/*`.

### P-01: "Segment Rail" (SC-10)

- **Where used:** `admin/clients/page.tsx` (inline 200px), `admin/customers/page.tsx` (inline), `admin/team/page.tsx` (inline), `admin/pipeline/page.tsx` (inline)
- **Description:** Left sidebar with grouped filter items, active item gets accent left-edge stripe, monospace counts right-aligned.
- **Ingredients:** `var(--ih-surface-2)` bg, `var(--ih-line)` right border, `var(--ih-eyebrow)` group labels, `var(--ih-accent)` active stripe (2px absolute left edge), ih-pill tags for tag filters.
- **Reusability:** `src/components/shared/segment-rail.tsx` exists and is parameterized. **Use it.** Admin pages have it inline; platform pages should import the shared version.

### P-02: "Sortable Table w/ Mono Headers" (SC-06)

- **Where used:** `admin/clients`, `admin/customers`, `admin/pipeline`, `admin/payments`, `admin/team`, `admin/forms`, `admin/audit`
- **Description:** Sticky header row with 9-10px monospace uppercase column names, hover rows, inline status pills/dots, column visibility toggler.
- **Ingredients:** `TH_STYLE` pattern (`fontFamily: var(--ih-font-mono)`, `fontSize: 10`, `textTransform: uppercase`, `letterSpacing: 0.12em`, `color: var(--ih-ink-40)`), row hover uses `var(--ih-surface-2)`. Column toggle via Popover component.
- **Reusability:** `src/components/shared/data-table.tsx` exists. Admin pages embed tables inline — worth extracting Popover + column-toggle as reusable sub-components too.

### P-03: "Right-Side Preview Drawer" (SC-07)

- **Where used:** `admin/customers/page.tsx` (multi-tab drawer), `admin/workflows/page.tsx` (slide-in workflow preview)
- **Description:** A fixed 380-400px right-side aside that slides in (`animate-slide-in-right`) with its own tab strip and contextual detail. The main list shrinks to accommodate it.
- **Ingredients:** `position: fixed`, `right: 0`, `top: TOPBAR_H`, `width: 400`, `background: var(--ih-surface)`, `border-left: var(--ih-line)`, `animate-slide-in-right` CSS animation. Contains mini tab strip + scrollable content.
- **Reusability:** `src/components/shared/right-rail.tsx` is a static rail (320px); the preview drawer is animated and triggered by row click. Worth creating a `PreviewDrawer` shared component since this pattern is used in at least 2 admin pages and will be needed in platform.

### P-04: "Entity Hub w/ Tab Bar"

- **Where used:** `admin/clients/[engagementId]/page.tsx` (9 tabs), `admin/customers/[id]/page.tsx` (6 tabs), `admin/team/[id]/page.tsx` (5 tabs)
- **Description:** Full-width page with a hero header section (SC-01 below) and a sticky horizontal tab bar. Tab content fills the remaining viewport.
- **Ingredients:** Page wrapper `margin: -24px -24px` (negative margin to bleed past platform padding), tab bar with `borderBottom: var(--ih-line)`, active tab has bottom border in `var(--ih-accent)` and `fontWeight: 600`, inactive tab is `var(--ih-ink-50)`.
- **Reusability:** Could become an `<EntityHub tabs={...}>` wrapper component — high value because this pattern is the core of every entity detail page.

### P-05: "Serif Hero Header" (SC-01)

- **Where used:** `admin/clients/[engagementId]/hub/page.tsx`, `admin/customers/[id]/page.tsx`, `admin/dashboard/page.tsx`, `admin/pipeline/[id]/page.tsx`
- **Description:** Large avatar left (84x84 with italic initial letter), left rail of text with eyebrow ID + status pills + contact meta, right-aligned vital stats with serif numbers.
- **Ingredients:** `ih-avatar ih-hatch` avatar, `ih-serif` at 44px with `ih-italic-red` for emphasis word, `ih-eyebrow` for the ID line, `ih-pill` for status, `ih-pill-ok/warn` for tonal variants. Stats column: `ih-eyebrow` label + `ih-serif` number at 26px.
- **Reusability:** `src/components/shared/entity-header.tsx` is already a well-parameterized component. **Use it.**

### P-06: "Connection Map" (SC-04)

- **Where used:** `admin/clients/[engagementId]/page.tsx` (6-col grid), expandable to 3-col.
- **Description:** A 6-card row summarizing all related entities (bookings, invoices, pipeline deals, etc.) with icon + label + value + mono count. Clickable cards navigate to entity.
- **Ingredients:** CSS grid, `ih-card`, icon top-left with tonal color, `arrowUpRight` icon top-right, `ih-eyebrow` + body text + `ih-mono` count.
- **Reusability:** `src/components/shared/connection-map.tsx` exists. Use it.

### P-07: "Stage Pipeline Strip" (SC-02)

- **Where used:** `admin/clients/page.tsx` inline (8-segment progress bar under stage pill), `admin/clients/[engagementId]/page.tsx` (6-sprint grid), `admin/pipeline/page.tsx`
- **Description:** Horizontal strip of segments; completed segments use `var(--ih-ink)`, current segment uses `var(--ih-accent)`, future segments use `var(--ih-surface-3)`.
- **Ingredients:** `Array.from({ length: 8 })` flex row, each segment `height: 3`, `borderRadius: 1`.
- **Reusability:** `src/components/shared/stage-pipeline.tsx` exists. Use it.

### P-08: "Inline Popover (click-outside)"

- **Where used:** Almost every admin page. `admin/clients`, `admin/pipeline`, `admin/customers`, `admin/calendar`, `admin/workflows`, `admin/superadmin`, etc.
- **Description:** A lightweight dropdown triggered by a child element, closes on outside click. Contains a `PopoverHeader` + `PopoverItem` pattern with hover highlighting.
- **Ingredients:** `useRef` + `useEffect` click-outside handler, absolute positioned container using `var(--ih-surface)` bg + `var(--ih-line)` border + `animate-pop-in` animation.
- **Reusability:** This pattern is copy-pasted into every admin page — it is not yet a shared component. It should be extracted to `src/components/shared/popover.tsx`. High value.

### P-09: "RAG Badge"

- **Where used:** `admin/clients/[engagementId]/audit/page.tsx`, `admin/clients/[engagementId]/report/page.tsx`
- **Description:** Pill badge showing RED/AMBER/GREEN with matching colored dot, monospace uppercase text, pill border uses tonal color.
- **Ingredients:** Inline color map for `RED/AMBER/GREEN` using ih-danger/ih-warn/ih-ok tokens.
- **Reusability:** Already present in `src/components/shared/status-pill.tsx` (partially). Worth verifying the RAG-specific variant is covered.

### P-10: "Activity Feed w/ Filter Tabs" (SC-03 + SC-09)

- **Where used:** `admin/dashboard/page.tsx` (source-filtered activity feed), `admin/clients/[engagementId]/page.tsx` (activity tab)
- **Description:** Grouped-by-date list with tonal icon circles, bold actor + dim action + mono timestamp. Tab row above filters by source.
- **Ingredients:** `ih-dot-ok/warn/info/danger` color dots, `ih-eyebrow` date group headers, `ih-mono` timestamps.
- **Reusability:** `src/components/shared/activity-timeline.tsx` exists. Use it.

### P-11: "Dashboard 'Three Things' Hero"

- **Where used:** `admin/dashboard/page.tsx` only.
- **Description:** A 3-card row with ranked items (`/01 /02 /03` in large mono), serif title, body text, and a tonal CTA. Uniquely editorial feel — the `/0N` counter uses `font-size: 28` mono dimmed.
- **Ingredients:** `ih-mono` at 28px for rank counter (`color: var(--ih-ink-30)`), `ih-serif` at 20px for title, card footer with `borderTop: var(--ih-line)` + meta + action button.
- **Reusability:** Probably inline in the platform today page — the structure is unique enough that a shared component would be over-engineered.

### P-12: "Kanban Board Toggle"

- **Where used:** `admin/pipeline/page.tsx`, `admin/workflows/page.tsx`
- **Description:** List/board view toggle in the top bar. Board view renders columns by stage with drag-capable cards (no DnD library — simulated via buttons).
- **Ingredients:** `ih-btn ih-btn-ghost` for inactive view, `ih-btn ih-btn-ghost` active state has `background: var(--ih-surface-2)`. Board columns use `var(--ih-surface-2)` background.
- **Reusability:** Inline per page — the list/board state is local. Extract the board column rendering as a shared primitive if needed.

### SC-01..14 realisation status

All 14 shared components from the `2026-05-11-complete-ui-blueprint.md` spec are built and present in `src/components/shared/`. None are imported by platform pages (except `notification-toast` by superadmin). The spec has been fully realised in shared components — they are just unused on the platform side.

---

## Brand + Styling Token Audit

### `globals.css` — ih-* token inventory

Token categories defined:
- **Color:** `--ih-bg`, `--ih-surface`, `--ih-surface-2`, `--ih-surface-3`, `--ih-ink` (+ opacity variants 90/65/50/40/30), `--ih-line` (+ -2, -3), `--ih-accent` (#D13A1F, Ironheart red), `--ih-ok`, `--ih-warn`, `--ih-info`, `--ih-danger` (+ soft variants for all)
- **Typography:** `--ih-font-serif` (Instrument Serif), `--ih-font-sans` (Inter), `--ih-font-mono` (JetBrains Mono)
- **Radius:** `--ih-r-xs` through `--ih-r-pill`
- **Spacing:** `--ih-s-1` through `--ih-s-12`
- **Shadow:** `--ih-shadow-pop`, `--ih-shadow-modal`
- **Layout:** `--ih-sidebar-w` (232px), `--ih-sidebar-w-collapsed` (56px), `--ih-topbar-h` (48px)
- **Dark mode:** Full set of overrides in `@media (prefers-color-scheme: dark)`

Utility classes defined (via `@layer utilities`):
`ih-serif`, `ih-mono`, `ih-eyebrow`, `ih-italic-red`, `ih-num`, `ih-hr`, `ih-dot` (+ tonal variants), `ih-kbd`, `ih-btn` (+ size/tone modifiers), `ih-card`, `ih-card-pad`, `ih-card-flat`, `ih-pill` (+ tonal variants), `ih-input`, `ih-avatar` (+ size variants), `ih-hatch`

### Which surfaces use ih-* vs shadcn

| Surface | ih-* tokens | shadcn primitives | Assessment |
|---------|-------------|-------------------|------------|
| `/admin/*` (all 38 functional pages) | Yes — pervasive, inline style props + utility classes | None | Fully on-brand |
| `src/components/shared/*` | Yes — all shared components use ih-* | None | On-brand |
| `src/components/shell/*` | Yes — sidebar, topbar, icon, logo | None | On-brand |
| `platform/superadmin/page.tsx` | Yes | Minimal (imports shared) | On-brand (done correctly) |
| `platform/clients/new/page.tsx` | No | Yes — Button, Input, Label, Card, Select, Checkbox | Off-brand |
| `platform/products/*` | No | Yes — Button, Input, Textarea, Card | Off-brand |
| `platform/revenue/page.tsx` | No | Yes — Tailwind utilities only | Off-brand |
| `platform/tenants/*` | No | Yes — platform component wrappers | Off-brand |
| `src/components/audit/*` | No | Yes — `text-muted-foreground`, `border-border`, `font-serif` (bare Tailwind), `px-8 py-4` | Off-brand |
| `src/components/onboarding/*` | No | Yes — same pattern as audit | Off-brand |
| `src/components/report/*` | No | Yes — same pattern as audit | Off-brand |
| `src/components/tenant-portal/*` | No | Yes | Off-brand |
| `[tenantSlug]/dashboard/*` | No | Yes — `font-serif text-3xl`, `text-muted-foreground` | Off-brand |

**HANDOFF stated "the entire existing codebase uses ih-*" — this is correct for `/admin/*` only.** Everything built in Phases 0.1–0.5 uses shadcn/Tailwind defaults. The divergence happened because Phase 0.1 introduced the platform shell and functional pages following a different convention.

**Exception noted:** The bare `font-serif` usage in platform pages (`font-serif text-2xl`) correctly maps to `var(--ih-font-serif)` via the shadcn/Tailwind config (the serif font is registered as the `serif` font family). So serif typography is consistent even without ih-* classes — but sizing, color, and spacing are not.

---

## Migration Approach Options

### Option A: "Copy + Reroute" (fastest, ~1-2 sprints)

**Method:** Copy each high-priority admin page to the corresponding platform path. Replace mock data imports with tRPC calls. Delete functional 0.1–0.5 pages (audit workspace, report editor, onboarding chart editor) — replaced by admin mockup versions restyles.

**Scope:** 
- Replace `platform/clients/page.tsx` with `admin/clients/page.tsx` → wire to `api.clients.list`
- Replace `platform/clients/[id]/page.tsx` with `admin/clients/[engagementId]/page.tsx` → wire to `api.clients.getById`
- Replace `platform/clients/[id]/audit/page.tsx` + AuditWorkspace component with admin audit page → wire to `api.auditWorkspace`
- Replace `platform/clients/[id]/report/page.tsx` + ReportEditor component with admin report page → wire to `api.reportGenerator`
- Replace `platform/pipeline/page.tsx` with `admin/pipeline/page.tsx` → wire to deal tRPC router
- Port the remaining stubs similarly

**Risks:**
1. The admin audit page (`admin/clients/[engagementId]/audit/page.tsx`, 540 lines) is a completely different data model than the platform audit workspace. Admin shows a 5-lens RAG table with hardcoded findings. Platform has a 3-layer progressive workspace (capture → processing → report-ready). These are not equivalent — the platform version has more functionality, not less.
2. Same for the report page: admin version is a phase-timeline mockup with fake data. Platform `ReportEditor` has real Claude API generation, auto-save, PDF export, status transitions. Throwing it away and replacing with the admin mockup would be a significant regression.
3. Mock → tRPC rewiring for large pages (clients list = 764 lines, engagement detail = 945 lines, pipeline = 1002 lines) is substantial — likely 2-4 hours per page minimum.

**Verdict:** Viable for stub pages that have no real implementation. Not recommended for audit/report/onboarding which have real backends.

---

### Option B: "Visual Port" (highest quality, ~3-4 sprints)

**Method:** Keep all 0.1–0.5 functional pages. Restyle them using ih-* tokens. Import shared components (EntityHeader, SegmentRail, DataTable, etc.) into platform pages. Rebuild the large stub pages from scratch with real tRPC.

**Scope:**
- For each functional page (`clients/new`, `clients/[id]/audit`, `clients/[id]/onboarding`, `clients/[id]/report`, `superadmin`, `[tenantSlug]/dashboard/*`): replace shadcn imports with ih-* classes and shared components
- For each stub page (`clients/page`, `pipeline/page`, `calendar/page`, etc.): build from scratch using ih-* patterns
- Extract `Popover` pattern into a shared component (used everywhere)
- Create `PreviewDrawer` shared component

**Risks:**
1. Full rebuilds of large stub pages (clients list, pipeline, calendar) are significant investments. Calendar is 1104 admin lines — building a real calendar from scratch is a sprint by itself.
2. Quality ceiling: platform pages built fresh will still be behind admin mockup quality until polished.

**Verdict:** The right long-term approach, but more than can be done in a single phase.

---

### Option C: "Hybrid" (recommended, ~2 sprints)

**Method:** Split the work into two buckets based on whether a real implementation exists.

**Bucket 1 — Visual port (Option B approach) for functional pages:**
Pages that already have real tRPC wiring get reskinned, not replaced.

| Page | Work |
|------|------|
| `platform/clients/new` | Swap shadcn `Button/Input/Label/Card/Select` → `ih-btn/ih-input/ih-card` + inline styles. ~4 hours. |
| `components/audit/*` (capture-layer, processing-layer, report-ready-layer, audit-workspace) | Replace `border-border`, `text-muted-foreground`, `px-8 py-4` with ih-* equivalents. Add entity header to audit-workspace. ~8 hours. |
| `components/onboarding/*` (chart-editor, chart-tree, node-inspector) | Same treatment. ~6 hours. |
| `components/report/*` (report-editor, markdown-editor, status-bar) | Same treatment. ~4 hours. |
| `[tenantSlug]/dashboard/*` (portal pages) | Replace Tailwind utilities with ih-* equivalents. Add `StageStrip` ih-* styling. ~4 hours. |
| `platform/products/*`, `platform/revenue`, `platform/tenants/*`, `platform/subscriptions` | Restyle each. ~6 hours total. |

**Bucket 2 — Copy + rewire (Option A approach) for stub pages:**
High-priority admin pages are copied to platform paths. Mock data is identified and replaced with real tRPC calls.

| Admin page → Platform target | Lines | Rewire complexity |
|------------------------------|-------|-------------------|
| `admin/clients/page.tsx` → `platform/clients/page.tsx` | 764 | HIGH — mock segments, health, stages, filters → real DB. Need `api.clients.list` router. |
| `admin/clients/[engagementId]/page.tsx` → `platform/clients/[id]/page.tsx` | 945 | HIGH — mock engagement, sprint tracker, proposals → real DB. Need dedicated tRPC endpoint. |
| `admin/dashboard/page.tsx` → `platform/today/page.tsx` | 273 | MEDIUM — hardcoded activity items → real activity feed. Most structure stays. |
| `admin/pipeline/page.tsx` → `platform/pipeline/page.tsx` | 1002 | HIGH — mock deals → deal tRPC router needed first. |
| `admin/payments/page.tsx` → `platform/payments/page.tsx` | 194 | MEDIUM — mock invoices → Stripe/invoice tRPC. |
| `admin/forms/page.tsx` → `platform/forms/page.tsx` | 166 | LOW — mock templates → real form templates. |
| `admin/settings/page.tsx` → `platform/settings/page.tsx` | 309 | MEDIUM — sections are generic, mostly static. |
| `admin/analytics/page.tsx` → `platform/analytics/page.tsx` | 234 | LOW — shell exists, just needs real DB wiring. |

**Defer for later sprints:**
- `platform/calendar` (admin calendar is 1104 lines + needs Cal.com integration)
- `platform/team` (828 lines + needs WorkOS user management)
- `platform/inbox` (793 lines + needs messaging backend)
- `platform/workflows` (869 lines + execution engine not built)
- `platform/outreach` (267 lines + sequence backend not built)

---

## Recommended Next Steps (Prioritized)

1. **[Highest impact — do first] Visual port of audit + report components.** The audit workspace and report editor are the core product deliverable. They are functional but visually off-brand. Reskinning `src/components/audit/*` and `src/components/report/*` to use ih-* tokens gives the biggest visual upgrade for the least risk (no data wiring changes). Target: `AuditWorkspace`, `CaptureLayer`, `ProcessingLayer`, `ReportReadyLayer`, `ReportEditor`. Est: ~12-16 hours.

2. **[High impact — do second] Extract `Popover` + create `PreviewDrawer` shared components.** The Popover pattern is copy-pasted 15+ times across admin pages. Before porting any admin page to platform, extract it once to `src/components/shared/popover.tsx`. Also create `PreviewDrawer` as a shared component (needed for clients list, customers, pipeline, workflows). Est: ~4 hours.

3. **[High impact] Port `admin/clients/page.tsx` → `platform/clients/page.tsx` and wire with real tRPC.** The clients list is the first screen seen on login. Build it with the segment-rail + sortable-table + stage-pill visual pattern, using the shared components library. Requires a `clients.list` tRPC endpoint with filter/sort/segment support. Est: ~1-2 days including backend work.

4. **[High impact] Port `admin/clients/[engagementId]/page.tsx` + `hub/page.tsx` → `platform/clients/[id]/page.tsx`.** The engagement hub tab bar (Overview → Onboarding → Audit → Report → Work → Money tabs) is what makes the client detail page feel like a real product. The onboarding/audit/report tabs can delegate to the existing functional components (ChartEditor, AuditWorkspace, ReportEditor). Est: ~1-2 days.

5. **[Medium impact] Restyle `platform/clients/new/page.tsx`.** 429 lines of real tRPC, but heavily shadcn. Mechanical swap of components → ih-* equivalents. Est: ~4 hours.

6. **[Medium impact] Restyle tenant portal pages** (`[tenantSlug]/dashboard/*`). Client-facing surfaces should be polished. These are small pages (42-80 lines each) — quick wins. Est: ~6 hours.

7. **[Medium impact] Port `admin/dashboard/page.tsx` → `platform/today/page.tsx`.** The dashboard hero with "Three things matter today" editorial voice is the strongest brand moment in the codebase. Port it and replace the hardcoded activity items with a real `api.activity.recent` feed. Est: ~6 hours.

8. **[Defer] Pipeline, calendar, team, inbox, workflows.** These are high-visual-quality admin pages that require significant backend work before they can be wired. Port the visual shells but gate on backend sprints.

---

## Concerns

1. **Admin audit vs platform audit are architecturally diverged.** Do NOT replace the platform `AuditWorkspace` with the admin audit page. The admin version is a static mockup with hardcoded lenses. The platform version has real RAG scores, real finding storage, real status progression. Restyle the platform version — it is the correct implementation.

2. **Engagement detail page has tabs that don't exist in platform yet.** The admin hub has "Work" (Gantt milestones), "Money" (cashflow + invoices), "Proposals" sub-pages. None of these have platform equivalents or backends. Port the tab bar shell with working Onboarding/Audit/Report tabs, and stub the remaining tabs with PlaceholderPage content for now.

3. **`admin/workflows/[id]/edit/page.tsx` is a custom workflow canvas.** At 669 lines, it implements a linear + visual step-editor without any canvas library (no react-flow). Porting this requires significant effort. Deprioritize — there is no platform workflow editor yet.

4. **`admin/customers/*` naming collision.** The admin has both a `customers/` section (contact/lead-level entity) and a `clients/` section (engagement-level entity). Platform only has `clients/`. Decide whether the customer contact directory merges into the client hub (under a Contacts tab) or gets its own `platform/contacts/` route before porting.

5. **`admin/calendar/page.tsx` at 1104 lines is pure custom time-grid rendering** (no FullCalendar, no library). It is the largest single admin page and the most complex to port. The platform will need Cal.com integration for real data. Defer to a dedicated calendar sprint.

6. **The shared component library (SC-01..14) is not imported by platform pages** despite being production-quality. This is the single most leverageable finding — using these 14 components immediately gives all platform pages the admin visual DNA without rebuilding anything.

7. **Dark mode:** `globals.css` has full dark mode token overrides. Admin pages will correctly switch. Platform shadcn components will also switch (shadcn respects `dark:` Tailwind variants). After reskinning, verify that ih-* inline styles in platform pages have dark mode equivalents — the CSS variables handle this automatically if `var(--ih-*)` is used consistently.

---

## Summary

```
STATUS: DONE
AUDIT_DOC_PATH: docs/superpowers/plans/audits/2026-05-24-admin-vs-platform-ui-compare.md
ADMIN_PAGES_INVENTORIED: 41 (38 functional, 3 redirect/empty stubs)
PLATFORM_PAGES_INVENTORIED: 34 (14 functional, 20 stubs)
VISUAL_PATTERNS_CATALOGUED: 12 (P-01 through P-12)
RECOMMENDED_OPTION: C
KEY_FINDINGS:
  - All 14 SC-01..14 shared components are built in src/components/shared/ but zero platform pages import them
  - Only 1 platform page (superadmin) uses ih-* tokens; every other functional platform page uses shadcn defaults
  - Admin audit page (540 lines) and platform AuditWorkspace are architecturally different — do NOT replace platform with admin, restyle platform instead
  - The Popover pattern is copy-pasted 15+ times across admin pages and needs extraction before porting begins
  - clients/[id]/page.tsx (engagement hub) is a 11-line stub — the biggest single gap, corresponds to admin's 945+307 line hub pattern
TOP_PRIORITY: Restyle src/components/audit/* and src/components/report/* to use ih-* tokens — highest visual impact, zero risk (no wiring changes)
CONCERNS: admin/audit ≠ platform audit (keep platform); calendar is 1104 lines + needs Cal.com (defer); customers/* vs clients/* naming needs resolution before porting
```
