# Brokerage Mockup Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand brokerage mockups from 16 to 40 pages covering the full brokerage lifecycle, with shared mock data, deal lifecycle bar, guided demo walkthrough, and evergreen multi-vertical architecture.

**Architecture:** Static Next.js pages under `src/app/admin/brokerage-mockups/`. All pages are `"use client"` components with inline state management (useState/useMemo). Mock data lives in a shared `_mock-data/` directory imported by all pages. No backend, no API calls, no database — pure UI mockups with hardcoded data.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui, Recharts, Lucide React icons

**Design Doc:** `docs/plans/2026-03-08-brokerage-mockup-enhancement-design.md`

---

## Code Patterns (MUST follow)

Every page in this mockup suite follows these exact patterns. Deviation will cause visual inconsistency.

### File Template

```tsx
"use client";

// shadcn imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// ... other shadcn as needed

// lucide icons
import { Plus, Search, Filter } from "lucide-react";

// next
import Link from "next/link";
import { useParams } from "next/navigation"; // only for [id] pages

// recharts (only if charts needed)
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

// shared mock data
import { deals, sites, contacts } from "../_mock-data";

// Types defined inline after imports
interface PageSpecificType {
  // ...
}

// Constants after types
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // ...
};

export default function PageName() {
  // useState for view modes, filters, sorting
  // useMemo for computed/filtered data
  // return JSX
}
```

### Styling Rules

- **ALWAYS** use semantic Tailwind tokens: `bg-card`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`
- **NEVER** use hardcoded colours like `bg-white`, `text-gray-900`, `border-gray-200`
- Exception: status/accent colours like `bg-emerald-50`, `text-emerald-700` for badges are fine
- Dark mode must work on every page

### Available shadcn Components

```
button, input, textarea, label, card, badge, avatar, separator, skeleton,
select, checkbox, switch, tabs, dialog, scroll-area, progress, alert-dialog,
sheet, dropdown-menu, popover, table, collapsible, empty-state, page-header,
command, tooltip, error-card
```

### Import Paths

- shadcn: `@/components/ui/{component}`
- Icons: `lucide-react`
- Navigation: `next/link`, `next/navigation`
- Charts: `recharts`
- Mock data: relative path to `_mock-data` (e.g., `../_mock-data` or `../../_mock-data`)

### Component Export

Always `export default function PageName()` — Next.js App Router convention.

---

## Wave 0: Shared Mock Data Layer

**Why first:** Every page depends on this. Consistent numbers across 40 pages.

### Task 0.1: Create mock data directory and types

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/types.ts`

**What to build:**

Shared TypeScript interfaces used across all mock data files and pages. This is the single source of truth for all type definitions.

```ts
// ── Contacts ──
export type ContactSide = "supply" | "demand";
export type ContactType = "Landowner" | "Farmer" | "Developer" | "Housebuilder" | "Land Agent" | "Assessor";

export interface Contact {
  id: string;
  name: string;
  initials: string;
  company: string;
  type: ContactType;
  side: ContactSide;
  email: string;
  phone: string;
  location: string;
  activeDeals: number;
  tags: string[];
  lastActivity: string;
  avatarColor: string;
  role?: string;
}

// ── Sites ──
export type SiteStatus = "Active" | "Registered" | "Under Assessment" | "Legal In Progress" | "Prospecting" | "Fully Allocated";
export type UnitType = "Nitrogen" | "Phosphorus" | "BNG";
export type Catchment = "Solent" | "Test Valley" | "Stour" | "Exe" | "Tees";
export type LPA = "Eastleigh" | "Fareham" | "Winchester" | "Test Valley" | "New Forest";

export interface Site {
  ref: string;
  name: string;
  status: SiteStatus;
  contact: string;        // Contact.id
  contactName: string;
  catchment: Catchment;
  unitType: UnitType;
  total: number;
  totalLabel: string;
  allocated: number;
  allocatedLabel: string;
  available: number;
  availableLabel: string;
  price: number;
  priceLabel: string;
  lpa: LPA;
  lat: number;
  lng: number;
  address: string;
  areaHectares: number;
  currentUse: string;
  soilType: string;
  registrationRef?: string;
  registeredDate?: string;
  legalAgreement?: string;
  commitmentYears?: number;
}

// ── Deals ──
export type DealStage =
  | "Prospecting" | "Initial Contact" | "Requirements Gathered"
  | "Site Matched" | "Quote Sent" | "Quote Accepted"
  | "Legal Drafting" | "Legal Review" | "Contracts Signed"
  | "Payment Pending" | "Payment Received" | "Credits Allocated"
  | "LPA Confirmed" | "Completed";

export type DealSide = "supply" | "demand" | "matched";

export interface Deal {
  id: string;
  title: string;
  stage: DealStage;
  side: DealSide;
  supplyContact: string;    // Contact.id
  supplyContactName: string;
  demandContact: string;    // Contact.id
  demandContactName: string;
  siteRef: string;           // Site.ref
  siteName: string;
  unitType: UnitType;
  units: number;
  unitsLabel: string;
  catchment: Catchment;
  value: number;
  displayValue: string;
  commission: number;
  commissionRate: number;
  probability: number;
  broker: string;
  brokerInitials: string;
  expectedClose: string;
  createdDate: string;
}

// ── Assessments ──
export type AssessmentType = "NN Baseline" | "BNG Habitat Survey" | "Annual Monitoring" | "Reassessment";
export type AssessmentStatus = "Scheduled" | "In Progress" | "Data Submitted" | "Under Review" | "Approved" | "Revision Requested";

export interface Assessor {
  id: string;
  name: string;
  initials: string;
  specialism: string[];
  region: string;
  email: string;
  phone: string;
  avatarColor: string;
  availability: string[];  // ISO date strings of available days
}

export interface Assessment {
  id: string;
  siteRef: string;
  siteName: string;
  assessorId: string;
  assessorName: string;
  type: AssessmentType;
  date: string;
  status: AssessmentStatus;
  findings?: string;
  creditYield?: number;
  creditYieldLabel?: string;
  habitatTypes?: string[];
  conditionScore?: number;
  reportDocId?: string;
}

// ── Documents ──
export type DocumentType = "S106" | "Conservation Covenant" | "Purchase Agreement" | "Heads of Terms" | "HMMP" | "Reservation Agreement" | "Invoice" | "Survey Report" | "Metric Calculation" | "Site Photos";
export type DocumentStatus = "Draft" | "Sent" | "Viewed" | "Signed" | "Completed" | "Expired";

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  linkedEntityType: "deal" | "site" | "contact";
  linkedEntityId: string;
  linkedEntityLabel: string;
  uploadedBy: string;
  uploadedDate: string;
  status: DocumentStatus;
  fileSize: string;
  signatories?: { name: string; signed: boolean; signedDate?: string }[];
  versions?: { version: number; date: string; author: string }[];
}

// ── Compliance ──
export type ComplianceStatus = "Overdue" | "Due Soon" | "Upcoming" | "Completed";
export type ComplianceCategory = "Monitoring" | "Legal" | "Registration" | "Financial";
export type Frequency = "One-off" | "Annual" | "Quarterly" | "Monthly" | "5-yearly";

export interface ComplianceItem {
  id: string;
  title: string;
  category: ComplianceCategory;
  siteRef?: string;
  siteName?: string;
  dealRef?: string;
  dealTitle?: string;
  dueDate: string;
  status: ComplianceStatus;
  assigned: string;
  assignedInitials: string;
  frequency: Frequency;
  completedDate?: string;
  description?: string;
}

// ── Financials ──
export type InvoiceStatus = "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue";
export type PaymentDirection = "incoming" | "outgoing";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  dealId: string;
  dealTitle: string;
  contactId: string;
  contactName: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
}

export interface Payment {
  id: string;
  date: string;
  direction: PaymentDirection;
  contactId: string;
  contactName: string;
  dealId: string;
  dealTitle: string;
  amount: number;
  method: string;
  status: string;
}

// ── Lifecycle ──
export type LifecycleStage =
  | "Prospect" | "Assess" | "Legal" | "Match"
  | "Quote" | "Agreement" | "Payment" | "Allocate"
  | "Confirm" | "Compliance";

export interface DealLifecycle {
  dealId: string;
  currentStage: LifecycleStage;
  completedStages: LifecycleStage[];
  track: "supply" | "demand" | "matched";
}
```

**Step 1:** Create the file with all types above.

**Step 2:** Verify: `npx tsc --noEmit src/app/admin/brokerage-mockups/_mock-data/types.ts` — no errors.

---

### Task 0.2: Create contacts mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/contacts.ts`

**What to build:**

15 contacts (8 supply, 7 demand) — reuse existing names from current mockups but with consistent cross-referenced IDs. Import `Contact` from `./types`.

Supply contacts:
1. `C-001` Robert Whiteley — Farmer, Whiteley Farm, Solent (owns S-0001)
2. `C-002` Margaret Thornton — Landowner, Botley Estate, Solent (owns S-0002)
3. `C-003` John Hamble — Farmer, Hamble Valley Farm, Solent (owns S-0003)
4. `C-005` David Ashford — Landowner, Manor Fields, Solent (owns S-0005)
5. `C-006` Susan Marsh — Farmer, Test Valley, Test Valley (owns S-0006)
6. `C-008` Ian Stockbridge — Landowner, Fareham, Solent (owns S-0008)
7. `C-007` Helen Wickham — Land Agent, Hampshire Land Partners
8. `C-009` William Curdridge — Farmer, Curdridge, Solent

Demand contacts:
1. `C-101` Rachel Morrison — Developer, Taylor Wimpey
2. `C-102` Simon Barratt — Developer, Barratt Homes
3. `C-103` James Bellway — Developer, Bellway Homes
4. `C-104` Karen Persimmon — Developer, Persimmon Homes
5. `C-105` Mark Linden — Developer, Linden Homes
6. `C-106` Paul Miller — Housebuilder, Miller Homes
7. `C-107` Sarah Wilson — Developer, David Wilson Homes

Each contact must have all fields from the `Contact` interface populated with realistic data.

**Step 1:** Create the file exporting `export const contacts: Contact[] = [...]`.

**Step 2:** Verify TypeScript compiles.

---

### Task 0.3: Create sites mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/sites.ts`

**What to build:**

6 supply sites with consistent allocation figures. Import `Site` from `./types`.

| Ref | Name | Contact | Catchment | Type | Total | Allocated | Available | Price |
|---|---|---|---|---|---|---|---|---|
| S-0001 | Whiteley Farm | C-001 | Solent | Nitrogen | 95 kg/yr | 50 | 45 | £3,200 |
| S-0002 | Botley Meadows | C-002 | Solent | Nitrogen | 120 kg/yr | 35 | 85 | £2,500 |
| S-0003 | Hamble Valley | C-003 | Solent | Nitrogen | 80 kg/yr | 80 | 0 | £2,800 |
| S-0005 | Manor Fields | C-005 | Solent | Nitrogen | 95 kg/yr | 50 | 45 | £3,000 |
| S-0006 | Test Valley Grassland | C-006 | Test Valley | Nitrogen | 165 kg/yr | 0 | 165 | £2,300 |
| S-0008 | Fareham Woodland | C-008 | Solent | BNG | 22.5 units | 0 | 22.5 | £25,000 |

Each site must have all fields populated: address, lat/lng (Hampshire area), area in hectares, current land use, soil type, LPA, registration details for active sites.

**Computed exports to add:**

```ts
export const totalNitrogenCredits = sites
  .filter(s => s.unitType === "Nitrogen")
  .reduce((sum, s) => sum + s.total, 0);

export const availableNitrogenCredits = sites
  .filter(s => s.unitType === "Nitrogen")
  .reduce((sum, s) => sum + s.available, 0);

export const totalBNGUnits = sites
  .filter(s => s.unitType === "BNG")
  .reduce((sum, s) => sum + s.total, 0);

export const availableBNGUnits = sites
  .filter(s => s.unitType === "BNG")
  .reduce((sum, s) => sum + s.available, 0);
```

**Step 1:** Create the file with all 6 sites and computed exports.

**Step 2:** Verify TypeScript compiles.

---

### Task 0.4: Create deals mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/deals.ts`

**What to build:**

18 deals across various stages, correctly cross-referencing contacts and sites. Import `Deal` from `./types`.

Key deals (used in demo walkthrough):
- `D-0038` — Taylor Wimpey / Whiteley Farm, 30 kg N/yr, Solent, £75,000, Quote stage
- `D-0035` — Barratt Homes / Botley Meadows, 35 kg N/yr, Solent, £87,500, Completed
- `D-0042` — Taylor Wimpey secondary, 45 kg N/yr, Solent, £135,000, Requirements Gathered
- `D-0045` — Persimmon / Manor Fields, 50 kg N/yr, Solent, £150,000, Legal Drafting

Remaining 14 deals spread across all stages with realistic data. Total pipeline value should sum to approximately £2,340,000 (matching dashboard stat).

**Computed exports:**

```ts
export const pipelineValue = deals
  .filter(d => d.stage !== "Completed")
  .reduce((sum, d) => sum + d.value, 0);

export const activeDealsCount = deals
  .filter(d => d.stage !== "Completed").length;

export const dealsByStage = Object.groupBy(deals, d => d.stage);

export const commissionYTD = deals
  .filter(d => ["Payment Received", "Credits Allocated", "LPA Confirmed", "Completed"].includes(d.stage))
  .reduce((sum, d) => sum + d.commission, 0);
```

**Step 1:** Create the file with all 18 deals and computed exports.

**Step 2:** Verify TypeScript compiles and `pipelineValue` ≈ £2,340,000.

---

### Task 0.5: Create assessors and assessments mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/assessors.ts`
- Create: `src/app/admin/brokerage-mockups/_mock-data/assessments.ts`

**What to build:**

**5 Assessors:**
1. `A-001` Sarah Chen — Senior Ecologist, NN specialist, Solent/Hampshire
2. `A-002` David Park — BNG Habitat Surveyor, Hampshire-wide
3. `A-003` Emma Walsh — Monitoring Specialist, annual compliance
4. `A-004` Tom Briggs — Junior Ecologist, NN and BNG
5. `A-005` Lisa Grant — Independent Assessor, carbon and BNG

Each with realistic availability dates (March 2026), specialism arrays, contact details.

**8 Assessments** linked to sites:
1. S-0001 Whiteley Farm — NN Baseline, Approved, Sarah Chen, credit yield 95 kg/yr
2. S-0002 Botley Meadows — NN Baseline, Approved, Sarah Chen, credit yield 120 kg/yr
3. S-0003 Hamble Valley — NN Baseline, Approved, Tom Briggs, credit yield 80 kg/yr
4. S-0005 Manor Fields — NN Baseline, Approved, David Park, credit yield 95 kg/yr
5. S-0006 Test Valley — NN Baseline, Approved, Lisa Grant, credit yield 165 kg/yr
6. S-0008 Fareham Woodland — BNG Habitat Survey, Approved, David Park, 22.5 BNG units
7. S-0001 Whiteley Farm — Annual Monitoring, Scheduled (upcoming), Emma Walsh
8. S-0002 Botley Meadows — Annual Monitoring, Scheduled (upcoming), Emma Walsh

**Step 1:** Create both files.

**Step 2:** Verify TypeScript compiles.

---

### Task 0.6: Create documents mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/documents.ts`

**What to build:**

12 documents linked across deals/sites/contacts:

1. S106 Agreement — S-0001 Whiteley Farm, Completed
2. S106 Agreement — S-0002 Botley Meadows, Completed
3. S106 Agreement — S-0003 Hamble Valley, Completed
4. Conservation Covenant — S-0008 Fareham Woodland, Signed
5. Heads of Terms — S-0005 Manor Fields, Signed
6. Purchase Agreement — D-0035 Barratt/Botley, Completed
7. Purchase Agreement — D-0038 Taylor Wimpey/Whiteley, Draft
8. HMMP — S-0008 Fareham Woodland, Draft
9. Survey Report — Assessment for S-0001, Completed
10. Metric Calculation — Assessment for S-0008, Completed
11. Reservation Agreement — D-0042, Sent
12. Invoice — D-0035, Completed

Each with realistic signatories, version history, file sizes, dates.

**Step 1:** Create the file.

**Step 2:** Verify TypeScript compiles.

---

### Task 0.7: Create compliance mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/compliance.ts`

**What to build:**

15 compliance items linked to correct sites and deals. Mix of statuses:
- 3 Overdue (red)
- 2 Due Soon (within 7 days)
- 5 Upcoming (> 7 days)
- 5 Completed

Categories: Monitoring, Legal, Registration, Financial. Frequencies: Annual, Quarterly, One-off, 5-yearly.

Linked to real site refs and deal IDs from shared data.

**Computed exports:**

```ts
export const overdueCount = complianceItems.filter(c => c.status === "Overdue").length;
export const dueSoonCount = complianceItems.filter(c => c.status === "Due Soon").length;
export const upcomingCount = complianceItems.filter(c => c.status === "Upcoming").length;
export const completedThisMonth = complianceItems.filter(c => c.status === "Completed").length;
```

**Step 1:** Create the file.

**Step 2:** Verify TypeScript compiles.

---

### Task 0.8: Create financials mock data

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/financials.ts`

**What to build:**

Derived from deals data:

**Invoices** (5):
- INV-001 D-0035 Barratt Homes £87,500 — Paid
- INV-002 D-0038 Taylor Wimpey £75,000 — Sent
- INV-003 D-0045 Persimmon £150,000 — Overdue
- INV-004 D-0042 Taylor Wimpey £135,000 — Draft
- INV-005 D-0040 Bellway £62,000 — Sent

**Payments** (8) — mix of incoming (developer) and outgoing (landowner):
- Incoming from Barratt £87,500 (for D-0035)
- Outgoing to Margaret Thornton £70,000 (D-0035 landowner share)
- Plus 6 more across other completed/in-progress deals

**Monthly commission data** (for charts):
- Oct 2025 through Mar 2026, 6 data points

**Broker commission breakdown**:
- James Harris: £112,440 (60%, 9 deals)
- Sarah Croft: £56,220 (30%, 4 deals)
- Tom Jenkins: £18,740 (10%, 1 deal)

**Computed exports:**

```ts
export const totalDealValueYTD = invoices.reduce((sum, i) => sum + i.amount, 0);
export const totalCommissionYTD = invoices.reduce((sum, i) => sum + i.commissionAmount, 0);
export const collectedAmount = invoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0);
export const outstandingAmount = invoices.filter(i => i.status !== "Paid" && i.status !== "Draft").reduce((sum, i) => sum + i.amount, 0);
```

**Step 1:** Create the file.

**Step 2:** Verify TypeScript compiles.

---

### Task 0.9: Create barrel export

**Files:**
- Create: `src/app/admin/brokerage-mockups/_mock-data/index.ts`

**What to build:**

```ts
export * from "./types";
export * from "./contacts";
export * from "./sites";
export * from "./deals";
export * from "./assessors";
export * from "./assessments";
export * from "./documents";
export * from "./compliance";
export * from "./financials";
```

**Step 1:** Create the file.

**Step 2:** Run `npx tsc --noEmit` on the barrel export — no errors.

**Step 3:** Commit: `feat(mockups): add shared mock data layer with consistent cross-referenced data`

---

## Wave 1: Layout & Navigation Updates

### Task 1.1: Update layout with new nav items

**Files:**
- Modify: `src/app/admin/brokerage-mockups/layout.tsx`

**What to change:**

Update `navItems` array to add 5 new entries (14 total):

```
Existing (keep):
  Dashboard    → /brokerage-mockups/dashboard     → LayoutDashboard
  Deals        → /brokerage-mockups/deals          → Handshake
  Sites        → /brokerage-mockups/sites          → MapPin
  Inventory    → /brokerage-mockups/inventory      → Package
  Matching     → /brokerage-mockups/matching       → GitCompareArrows
  Compliance   → /brokerage-mockups/compliance     → ShieldCheck
  Contacts     → /brokerage-mockups/contacts       → Users
  Financials   → /brokerage-mockups/financials     → PoundSterling

Add (in this order, inserted to maintain logical grouping):
  Assessments  → /brokerage-mockups/assessments    → ClipboardCheck    (after Contacts)
  Documents    → /brokerage-mockups/documents       → FileText          (after Matching)
  Reports      → /brokerage-mockups/reports         → BarChart3         (after Financials)
  Settings     → /brokerage-mockups/settings        → Settings          (last)
  ─── separator ───
  Demo         → /brokerage-mockups/demo            → Play              (below separator)
```

Final nav order:
1. Dashboard
2. Deals
3. Sites
4. Contacts
5. Assessments ← new
6. Inventory
7. Matching
8. Documents ← new
9. Compliance
10. Financials
11. Reports ← new
12. Settings ← new
13. (separator)
14. Demo Walkthrough ← new

Also add new lucide imports: `ClipboardCheck`, `FileText`, `BarChart3`, `Settings`, `Play`.

Add a visual separator before the Demo item (a `<div className="h-px bg-border my-2" />` or `<Separator />`).

Style the Demo nav item distinctly — e.g., a subtle gradient or accent background to draw attention.

**Step 1:** Edit layout.tsx with the new nav items.

**Step 2:** Verify: `next build` passes, navigate to `/admin/brokerage-mockups` and confirm all 14 nav items render.

**Step 3:** Commit: `feat(mockups): update layout navigation with assessments, documents, reports, settings, demo`

---

### Task 1.2: Update landing page with new sections

**Files:**
- Modify: `src/app/admin/brokerage-mockups/page.tsx`

**What to change:**

Add 5 new section cards to the grid (matching new nav items):

- Assessments: icon ClipboardCheck, description "Schedule assessors, track surveys, calculate metrics", stat "5 this month"
- Documents: icon FileText, description "Templates, agreements, e-signatures, version tracking", stat "12 active"
- Reports: icon BarChart3, description "Pipeline analytics, catchment heatmaps, broker KPIs", stat "8 reports"
- Settings: icon Settings, description "Verticals, commission rates, team, integrations", stat "Configure"
- Demo Walkthrough: icon Play, description "Guided tour through a complete deal lifecycle", stat "14 steps"

Use semantic Tailwind colours (not hardcoded). Fix any existing hardcoded colours on the page.

**Step 1:** Edit page.tsx.

**Step 2:** Verify renders correctly.

**Step 3:** Commit: `feat(mockups): add new sections to landing page`

---

## Wave 2: New Simple Pages (can be built in parallel)

Each task in this wave is independent. Use `superpowers:frontend-design` skill for each page to generate high-quality mockup UI.

### Task 2.1: Contact Detail page

**Files:**
- Modify or replace: `src/app/admin/brokerage-mockups/contacts/[id]/page.tsx`

**What to build:**

A contact detail page that adapts based on contact side (supply vs demand). Use `useParams()` to get `id`, look up from shared `contacts` data. Fallback to first contact if ID not found.

**Supply contact layout:**
- Header: name, company, type badge, "Supply" badge (green), Edit button, More dropdown
- Left column (65%):
  - Sites owned: table of sites from shared data where `site.contact === contact.id`
  - Assessment history: assessments linked to their sites
  - Active deals: deals where `deal.supplyContact === contact.id`
  - Communication log: 5-6 hardcoded timeline entries (calls, emails, notes with dates)
- Right sidebar (35%):
  - Key stats card: total credits generated, total value of deals, years as partner
  - Relationship timeline: first contact → assessment → S106 signed → first sale
  - Tags: editable tag pills
  - Assigned broker: avatar + name

**Demand contact layout:**
- Same header but "Demand" badge (blue)
- Left column:
  - Developments/projects: table with planning refs, status
  - Credit requirements: needed vs fulfilled progress bars
  - Active deals: deals where `deal.demandContact === contact.id`
  - Communication log
- Right sidebar:
  - Key stats: total credits purchased, total spend, active requirements
  - Relationship timeline
  - Tags, assigned broker

Use shadcn: Card, Badge, Table, Avatar, Separator, Tabs (for switching sections if needed), DropdownMenu.

**Step 1:** Build the page.

**Step 2:** Verify: navigate to `/admin/brokerage-mockups/contacts/C-001` (supply) and `/contacts/C-101` (demand) — both render correctly with appropriate variant.

**Step 3:** Commit: `feat(mockups): add contact detail page with supply/demand variants`

---

### Task 2.2: New Contact form

**Files:**
- Create: `src/app/admin/brokerage-mockups/contacts/new/page.tsx`

**What to build:**

A form page for creating a new contact. All inputs are non-functional (mockup only) but should look complete.

- Side toggle at top: Supply / Demand (changes available type options)
- Form fields: Name, Company, Role, Email, Phone, Location
- Type dropdown: Supply → Landowner/Farmer/Land Agent/Assessor; Demand → Developer/Housebuilder
- Tags input
- Notes textarea
- Assigned broker dropdown
- "Save Contact" primary button, "Cancel" secondary button (both non-functional)

Use shadcn: Input, Select, Textarea, Button, Label, Card, Switch or Tabs for the side toggle.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add new contact form page`

---

### Task 2.3: New Deal form

**Files:**
- Create: `src/app/admin/brokerage-mockups/deals/new/page.tsx`

**What to build:**

- Side toggle: Supply deal (landowner onboarding) vs Demand deal (developer requirement)
- Contact picker: searchable dropdown showing contacts filtered by selected side
- Site linker (supply side): dropdown of sites from shared data
- Requirement capture (demand side): unit type, quantity needed, catchment, max budget, planning ref
- Assigned broker picker
- Initial stage: auto-set to "Prospecting"
- Action buttons: "Create Deal", "Cancel"

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add new deal form page`

---

### Task 2.4: Deal Quote page

**Files:**
- Create: `src/app/admin/brokerage-mockups/deals/[id]/quote/page.tsx`

**What to build:**

Quote/proposal generator for a specific deal. Use `useParams()` to get deal ID, look up from shared data (default to D-0038).

- Header: "Quote for D-0038 — Taylor Wimpey / Whiteley Farm"
- Left column:
  - Credit details: pre-filled from deal (unit type, quantity, catchment)
  - Pricing:
    - Unit price input (pre-filled from site's price)
    - Quantity (from deal)
    - Subtotal (computed)
    - Commission rate input (default 20%, editable)
    - Commission amount (computed)
    - Landowner payment (subtotal - commission)
    - **Total to developer** (bold, large)
  - Payment terms: dropdown (Lump sum / Staged — deposit + milestones)
  - Validity period: 30 days (editable)
  - Notes/terms textarea
- Right sidebar:
  - Deal summary card
  - Supply site capacity check (available units vs requested — green if sufficient, amber if partial)
  - Parties: supply contact card, demand contact card
- Action bar: "Send Quote" primary, "Save Draft" secondary, "Download PDF" outline
- Variation: simple quote view vs detailed proposal with cover letter section

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add deal quote/proposal page`

---

### Task 2.5: Deal Agreement page

**Files:**
- Create: `src/app/admin/brokerage-mockups/deals/[id]/agreement/page.tsx`

**What to build:**

Credit Purchase Agreement view for a deal. Tracks the legal agreement from draft to execution.

- Header: breadcrumb (Deals > D-0038 > Agreement)
- Agreement summary panel:
  - Parties (supply contact, demand contact, broker)
  - Credit details (type, quantity, unit price, total)
  - Payment schedule table: rows for deposit (10%), planning approval milestone, completion
  - Warranties section (credit validity, monitoring commitment)
  - Duration: commitment period
- Document section: linked agreement document with e-signature status (from shared documents data)
- Stage timeline: Draft → Sent → Negotiation → Signed by Supply → Signed by Demand → Executed
- Right sidebar:
  - Key dates (created, sent, expected signing)
  - Related documents list
  - Actions: Send for Signature, Download, Archive

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add deal agreement page`

---

### Task 2.6: New Site form

**Files:**
- Create: `src/app/admin/brokerage-mockups/sites/new/page.tsx`

**What to build:**

Site onboarding form.

- Landowner contact picker (searchable dropdown from contacts, or "Create new" link)
- Location section: address input, map placeholder (rectangle with pin icon), catchment auto-detected label
- Land details: area (hectares), current land use dropdown (Arable, Pasture, Dairy, Woodland, Mixed), soil type
- Credit type: Nitrogen / Phosphorus / BNG / Multiple (checkboxes)
- Initial status: "Prospecting" (pre-set)
- Notes textarea
- Actions: "Create Site", "Cancel"
- Variation: wizard steps (1. Contact → 2. Location → 3. Land Details → 4. Confirm) vs single form

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add new site onboarding form`

---

### Task 2.7: Site Registration Tracker page

**Files:**
- Create: `src/app/admin/brokerage-mockups/sites/[id]/registration/page.tsx`

**What to build:**

BNG registration tracker (Natural England register submission). Generic enough to work as any "external registry submission" page.

- Header: breadcrumb (Sites > S-0008 > Registration)
- Status timeline: Submitted → Under Review → Queries Raised → Approved → Gain Site Ref Issued
  - Current step highlighted (e.g., "Under Review" with pulsing indicator)
- Required documents checklist:
  - Title deeds — ✓ Uploaded
  - Boundary map — ✓ Uploaded
  - Legal agreement (Conservation Covenant) — ✓ Uploaded
  - Metric calculations — ✓ Uploaded
  - HMMP — ⚠ Draft (link to document)
  - Local land charge certificate — ✗ Missing
  - Each row: document name, status icon, upload button or link to existing doc
- Registration details panel:
  - Registry: Natural England BNG Register
  - Fee: £639 (paid/unpaid status)
  - Submitted date
  - Expected review: up to 6 weeks
  - Gain site reference: pending / issued number
- Right sidebar:
  - Site summary card
  - Contact (landowner)
  - Linked documents
  - Timeline of submission events

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add site registration tracker page`

---

## Wave 3: Assessment Pages (can be built in parallel with Wave 2)

### Task 3.1: Assessment Dashboard

**Files:**
- Create: `src/app/admin/brokerage-mockups/assessments/page.tsx`

**What to build:**

- 4 stat cards: Scheduled (2), In Progress (0), Awaiting Review (1), Completed (5)
  - Computed from shared assessments data
- Dual view toggle: Calendar / Table
- **Calendar view:**
  - Monthly calendar (March 2026)
  - Assessment visits shown as coloured dots on dates
  - Colour by type: NN Baseline (blue), BNG Habitat (green), Monitoring (amber)
  - Click a date to see details in a popover or side panel
- **Table view:**
  - Columns: Ref, Site, Assessor (avatar + name), Type badge, Date, Status badge, Report link
  - Sortable, filterable
- Filter bar: Assessor dropdown, Type dropdown, Catchment, Date range, Status
- "+ Schedule Assessment" primary button (links to /assessments/schedule)
- Variations: calendar-focused, table-focused, split view (calendar left, upcoming list right)

Import assessments, assessors from shared mock data.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add assessment dashboard page`

---

### Task 3.2: Assessment Detail

**Files:**
- Create: `src/app/admin/brokerage-mockups/assessments/[id]/page.tsx`

**What to build:**

Use `useParams()` to get assessment ID, look up from shared data (default to first assessment — Whiteley Farm NN Baseline).

- Header: breadcrumb (Assessments > ASM-001), site name, type badge, status badge
- Left column (65%):
  - **Site summary card:** links to site detail, shows address, catchment, area
  - **Survey data panel:**
    - Habitat types recorded (table: type, area, condition score, distinctiveness)
    - Soil type, drainage assessment
    - Current nutrient loading (kg/ha/yr)
    - Proposed mitigation: land use change description
  - **Photos section:** 2x3 grid of placeholder images (grey rectangles with camera icon and captions like "Northern boundary", "Watercourse buffer")
  - **Findings/notes:** assessor's free text observations (2-3 paragraphs)
  - **Metric calculation results:**
    - For NN: Current loading X kg/yr → Proposed loading Y kg/yr → Credit yield (X-Y) kg/yr
    - For BNG: Baseline units → Proposed units → Net gain units
    - Highlighted output: "This site can generate **95 kg/year nitrogen credits**"
- Right sidebar (35%):
  - **Assessment timeline:** Scheduled → Visited → Data Submitted → Reviewed → Approved (with dates)
  - **Assessor card:** avatar, name, specialism badges, contact details
  - **Linked documents:** survey report, metric spreadsheet, photos zip
  - **Actions:** Approve (green), Request Revision (amber), Generate Report (outline)

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add assessment detail page`

---

### Task 3.3: Schedule Assessment

**Files:**
- Create: `src/app/admin/brokerage-mockups/assessments/schedule/page.tsx`

**What to build:**

Multi-step wizard for scheduling a new assessment.

- Step indicator at top: 1. Site → 2. Type → 3. Assessor → 4. Date → 5. Confirm
- **Step 1 — Select Site:**
  - Searchable dropdown of sites from shared data
  - On selection: shows site card preview (name, address, catchment, current status)
- **Step 2 — Assessment Type:**
  - Radio cards: NN Baseline, BNG Habitat Survey, Annual Monitoring, Reassessment
  - Each with icon, title, description
- **Step 3 — Assign Assessor:**
  - Card grid of assessors from shared data
  - Each card: avatar, name, specialism badges, region, next available date
  - Highlight matching assessors (whose specialism matches selected type)
  - Distance from site indicator
- **Step 4 — Pick Date:**
  - Calendar picker showing selected assessor's availability
  - Available dates in green, unavailable greyed out
  - Time slot selection (AM / PM / Full day)
- **Step 5 — Confirmation:**
  - Summary card: site, type, assessor, date/time
  - Estimated travel distance
  - "Send to Assessor" primary button, "Save as Draft" secondary
  - Confirmation message on "send" (just visual, no real action)

Variation: wizard steps (default) vs single scrollable form

**Step 1:** Build the page.

**Step 2:** Verify renders, step through all 5 steps.

**Step 3:** Commit: `feat(mockups): add assessment scheduling wizard`

---

### Task 3.4: Nutrient Budget Calculator

**Files:**
- Create: `src/app/admin/brokerage-mockups/assessments/calculator/page.tsx`

**What to build:**

Mockup of Natural England's 5-worksheet nutrient budget calculator, embedded in the platform.

- Tab bar: Worksheet 1 | Worksheet 2 | Worksheet 3 | Worksheet 4 | Summary
- **Worksheet 1 — Wastewater Nutrients:**
  - Inputs: Number of dwellings (200), Occupancy rate (2.4), Treatment works (Peel Common)
  - Calculation display: Dwellings × Occupancy × Treatment factor = X kg/yr N
  - Pre-filled with D-0038 Taylor Wimpey data
- **Worksheet 2 — Current Land Use:**
  - Table: Land parcel rows with type (Arable, Grassland), area (ha), loading factor (kg/ha/yr)
  - Subtotal: Current loading = Y kg/yr
- **Worksheet 3 — Future Land Use:**
  - Same table structure but for proposed post-development use
  - Subtotal: Future loading = Z kg/yr
- **Worksheet 4 — SuDS Removal:**
  - SuDS features table: type (attenuation pond, swale), area, removal rate
  - Subtotal: SuDS removal = W kg/yr
- **Summary tab:**
  - Formula displayed clearly:
    ```
    Wastewater (X) - Current (Y) + Future (Z) - SuDS (W) = Net Budget
    Net Budget × 1.2 (20% precautionary buffer) = TOTAL MITIGATION REQUIRED
    ```
  - Large highlighted output: "**37.2 kg/year nitrogen mitigation required**"
  - "Find Matching Supply →" primary button (links to /matching)
  - "Save Calculation" secondary button
  - "Export to PDF" outline button

All numbers pre-filled and computed (hardcoded results, but displayed as if calculated). The visual should feel like a real calculator tool.

**Step 1:** Build the page.

**Step 2:** Verify renders, click through all 5 tabs.

**Step 3:** Commit: `feat(mockups): add nutrient budget calculator mockup`

---

### Task 3.5: BNG Statutory Metric

**Files:**
- Create: `src/app/admin/brokerage-mockups/assessments/metric/page.tsx`

**What to build:**

Mockup of the statutory biodiversity metric scoring tool.

- Header: "Biodiversity Metric 4.0 — Off-Site Assessment"
- **Baseline Habitats table:**
  - Columns: Habitat Type, Area (ha), Condition, Distinctiveness, Strategic Significance, Baseline Units
  - 4-5 rows: e.g., "Modified grassland, 2.5 ha, Poor, Low, Within LNRS, 1.25 units"
  - Total baseline units at bottom
- **Proposed Habitats table:**
  - Same columns but for post-enhancement
  - e.g., "Wildflower meadow, 2.5 ha, Moderate, Medium, Within LNRS, 5.0 units"
  - Total proposed units at bottom
- **Net Change calculation:**
  - Visual: Proposed (5.0) - Baseline (1.25) = **+3.75 biodiversity units**
  - 10% uplift requirement bar: required X units, provided Y units, surplus/deficit
  - Colour-coded: green if surplus, red if deficit
- **Summary panel:**
  - Large output: "This site generates **3.75 biodiversity units** for off-site allocation"
  - Trading rules: proximity multiplier note, habitat type restrictions
  - "Register as Gain Site →" button (links to /sites/[id]/registration)
  - "Find Matching Demand →" button (links to /matching)

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add BNG statutory metric mockup`

---

## Wave 4: Document, Report & Settings Pages (can be built in parallel)

### Task 4.1: Document Library

**Files:**
- Create: `src/app/admin/brokerage-mockups/documents/page.tsx`

**What to build:**

All documents across the platform in one searchable view.

- Stat cards: Total Documents (12), Awaiting Signature (3), Completed (7), Expired (0)
- Dual view: Table (default) / Grid (card thumbnails)
- **Table view:**
  - Columns: Name, Type badge, Linked Entity (with link), Uploaded By, Date, Status badge, Actions (download, view)
  - Type badges coloured: S106 (amber), Covenant (green), Agreement (blue), Report (gray), Invoice (purple), HMMP (teal)
  - Status badges: Draft (gray), Sent (blue), Viewed (cyan), Signed (green), Completed (emerald), Expired (red)
- **Grid view:**
  - Document cards with:
    - Mock document thumbnail (coloured rectangle with document type icon)
    - Name, type badge, status badge
    - Linked entity label
    - Quick actions on hover
- Filter bar: Type dropdown, Entity dropdown, Status, Date range, Search
- "+ Upload Document" button
- Variations: table, grid, split (table left + document preview right)

Import documents from shared mock data.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add document library page`

---

### Task 4.2: Document Templates

**Files:**
- Create: `src/app/admin/brokerage-mockups/documents/templates/page.tsx`

**What to build:**

Card grid of 7 document templates:

1. **S106 Agreement** — "Standard Section 106 agreement for nutrient neutrality sites", Legal category, last updated Feb 2026
2. **Conservation Covenant** — "BNG conservation covenant with responsible body", Legal category
3. **Credit Purchase Agreement** — "Standard credit purchase agreement for developers", Transaction category
4. **Heads of Terms** — "Non-binding agreement for new landowner partnerships", Onboarding category
5. **HMMP** — "30-year Habitat Management & Monitoring Plan template", Compliance category
6. **Credit Reservation Agreement** — "Deposit-backed credit reservation for developers", Transaction category
7. **Invoice Template** — "Standard invoice template with commission breakdown", Financial category

Each card:
- Coloured top stripe by category
- Document type icon
- Title, description (2 lines)
- Category badge
- Last updated date
- "Use Template" primary button, "Preview" outline button
- Usage count: "Used 12 times"

Note at bottom of page: "Templates are configurable per vertical. These templates are for the Nutrient & BNG Credits vertical."

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add document templates page`

---

### Task 4.3: Document Detail

**Files:**
- Create: `src/app/admin/brokerage-mockups/documents/[id]/page.tsx`

**What to build:**

Document viewer with e-signature tracking. Use `useParams()`, default to first S106 document.

- Header: breadcrumb (Documents > S106 Agreement — Whiteley Farm), status badge, type badge
- Left column (65%):
  - **Document preview panel:** large gray rectangle simulating PDF viewer
    - Mock content: "S106 Agreement" title, party names, key clauses listed as placeholder text
    - Page navigation: "Page 1 of 8" with prev/next
    - Zoom controls
  - **Version history:** table of versions (V1 Draft, V2 Reviewed, V3 Final) with dates and authors
- Right sidebar (35%):
  - **Signature status timeline:**
    - Created by James Harris — ✓ 15 Jan 2026
    - Sent to Robert Whiteley (Landowner) — ✓ 16 Jan 2026
    - Viewed by Robert Whiteley — ✓ 17 Jan 2026
    - Signed by Robert Whiteley — ✓ 20 Jan 2026
    - Sent to Eastleigh LPA — ✓ 21 Jan 2026
    - Signed by LPA — ✓ 5 Feb 2026
    - Status: **Completed** ✓
  - **Linked entities:**
    - Site: S-0001 Whiteley Farm (link)
    - Deal: D-0038 (link)
    - Contacts: Robert Whiteley, Rachel Morrison (links)
  - **Actions:** Download, Send Reminder, Archive, Create New Version

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add document detail page with e-signature tracking`

---

### Task 4.4: Compliance Item Detail

**Files:**
- Create: `src/app/admin/brokerage-mockups/compliance/[id]/page.tsx`

**What to build:**

Detail page for a single compliance item. Use `useParams()`, default to first overdue item.

- Header: breadcrumb (Compliance > Annual Monitoring Report), status badge (Overdue/Due Soon/Upcoming/Completed), category badge
- Left column (65%):
  - **Linked entities:** site card and/or deal card (from shared data)
  - **Requirements checklist:**
    - ☑ Site visit completed
    - ☑ Habitat condition photos taken
    - ☐ Water quality samples collected
    - ☐ Monitoring report written
    - ☐ Report submitted to LPA
  - **Evidence upload section:**
    - Drag-and-drop zone (mockup)
    - Previously uploaded files: photo set, data readings CSV
  - **Submission history:** table of previous compliance submissions for this recurring item
    - e.g., "Annual Monitoring 2025 — Submitted 15 Mar 2025 — Approved"
- Right sidebar (35%):
  - **Responsible person:** avatar, name, role
  - **Schedule:** frequency (Annual), next due date, previous completion date
  - **Linked documents:** monitoring report template, previous reports
  - **Actions:** Mark Complete (green), Request Extension (amber), Flag Issue (red), Reassign

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add compliance item detail page`

---

### Task 4.5: Invoice Management

**Files:**
- Create: `src/app/admin/brokerage-mockups/financials/invoices/page.tsx`

**What to build:**

- 4 stat cards:
  - Total Outstanding: computed from shared invoices data
  - Overdue: count + amount
  - Avg Days to Payment: 18 days (hardcoded)
  - Collection Rate: 76.2% (with progress bar)
- Dual view: List (default) / Aging Buckets
- **List view:**
  - Table: Invoice #, Deal (link), Contact (link), Amount, Commission %, Commission Amount, Status badge, Issued Date, Due Date, Days Outstanding
  - Sortable by any column
  - Row actions: View, Send Reminder, Mark Paid, Download
- **Aging Buckets view:**
  - 4 columns: Current (0-30 days), 31-60 days, 61-90 days, 90+ days
  - Cards in each column showing invoice summary
  - Total per bucket at top
- Filter: Status, Contact, Date range, Amount range
- "+ Create Invoice" button
- Variation: table-focused vs aging-focused

Import invoices from shared mock data.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add invoice management page`

---

### Task 4.6: Payment Tracking

**Files:**
- Create: `src/app/admin/brokerage-mockups/financials/payments/page.tsx`

**What to build:**

- Tabs: Incoming (from developers) | Outgoing (to landowners)
- Stat cards per tab:
  - Incoming: Total Received, Pending, This Month
  - Outgoing: Total Paid, Pending, This Month
- Table per tab: Date, Contact (link), Deal (link), Amount, Method (Bank Transfer/Cheque/Card), Status badge (Completed/Pending/Failed), Reference
- Running balance display
- Reconciliation indicators: matched ✓ or unmatched ⚠
- Filter: Direction, Contact, Date range, Status
- Variations: table view, timeline view (chronological)

Import payments from shared mock data.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add payment tracking page`

---

### Task 4.7: Commission Breakdown

**Files:**
- Create: `src/app/admin/brokerage-mockups/financials/commissions/page.tsx`

**What to build:**

- Toggle: By Broker | By Deal | By Catchment | By Period
- **By Broker (default):**
  - Broker cards: avatar, name, commission earned, deal count, pipeline value, progress bar vs target
  - Horizontal bar chart: brokers ranked by commission
  - Detailed table: each broker's deals with individual commission amounts
- **By Deal:**
  - Table: Deal, Supply Contact, Demand Contact, Value, Rate, Commission, Status
  - Total row at bottom
- **By Catchment:**
  - Bar chart: commission by catchment area
  - Table breakdown
- **By Period:**
  - Monthly bar chart (last 12 months)
  - Cumulative trend line
  - YTD total prominent
- Target vs actual section: overall team target, current progress, projected year-end
- Note: "Commission rate is configurable per deal. Default: 20%"

Import broker commission data from shared mock data.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add commission breakdown page`

---

### Task 4.8: Report Gallery

**Files:**
- Create: `src/app/admin/brokerage-mockups/reports/page.tsx`

**What to build:**

Card grid of prebuilt reports grouped by category.

**Pipeline Reports:**
- Pipeline Analytics — "Deal conversion rates, velocity, and forecasting" → links to /reports/pipeline
- Stage Breakdown — "Time spent in each deal stage" → links to /reports/pipeline
- Win/Loss Analysis — "Why deals succeed or fail" → links to /reports/pipeline

**Financial Reports:**
- Revenue Summary — "Commission earned, collected, outstanding" → links to /financials
- Invoice Aging — "Outstanding payments by age bracket" → links to /financials/invoices
- Broker Performance — "Individual broker KPIs and targets" → links to /reports/broker-performance

**Inventory Reports:**
- Supply Availability — "Credits available by catchment and type" → links to /inventory
- Catchment Heatmap — "Geographic supply/demand visualization" → links to /reports/catchment
- Demand Forecast — "Upcoming developer requirements pipeline"

**Compliance Reports:**
- Compliance Calendar — "Upcoming deadlines and obligations" → links to /compliance
- Monitoring Schedule — "Assessment and monitoring visit plan"

Each card: icon, title, description, category badge, "View Report →" link, last generated date.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add report gallery page`

---

### Task 4.9: Pipeline Analytics Report

**Files:**
- Create: `src/app/admin/brokerage-mockups/reports/pipeline/page.tsx`

**What to build:**

- Filter bar: Date range, Catchment, Broker, Credit type
- **Conversion Funnel:**
  - Recharts funnel/bar chart showing deals at each stage
  - Conversion rate between stages (e.g., "Quote Sent → Quote Accepted: 67%")
  - Drop-off percentages highlighted in red
- **Deal Velocity:**
  - Average days per stage (horizontal bar chart)
  - Highlight bottleneck stages (longest average time)
  - Trend: improving or worsening vs last quarter
- **Win/Loss Analysis:**
  - Pie chart: Won / Lost / In Progress
  - Loss reasons (mockup): Price too high, Competitor won, Developer pulled out, Legal delays
  - Table of recent lost deals with reason
- **Forecasting:**
  - Projected pipeline value by month (next 6 months, based on probability × value)
  - Expected commission (bar chart)
- Stats: Avg Deal Size, Avg Time to Close, Win Rate

Import deals from shared data, compute metrics.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add pipeline analytics report page`

---

### Task 4.10: Catchment Heatmap Report

**Files:**
- Create: `src/app/admin/brokerage-mockups/reports/catchment/page.tsx`

**What to build:**

Geographic intelligence view — big demo moment.

- **Map section** (top, 60% height):
  - Simplified England outline (CSS/SVG, similar approach to existing sites map)
  - 5-6 catchment regions shown as coloured zones:
    - Solent: green (high supply, high demand)
    - Test Valley: blue (surplus supply, low demand)
    - Stour: amber (balanced)
    - Exe: red (high demand, low supply)
    - Tees: gray (inactive)
  - Legend: colour = supply/demand balance
  - Clickable regions
- **Catchment detail panel** (below map or side panel on click):
  - Selected catchment name and stats:
    - Supply sites: count, total credits, available credits
    - Active demand: deal count, total units needed
    - Balance: surplus X units / deficit Y units
    - Price range: min — avg — max per unit
    - Active deals in this catchment (mini table)
  - "View Sites in Catchment" button → links to /sites with catchment filter
- Variations: map + side panel, map + bottom detail, full-page map with overlay cards

Import sites, deals from shared data, group by catchment.

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add catchment heatmap report page`

---

### Task 4.11: Broker Performance Report

**Files:**
- Create: `src/app/admin/brokerage-mockups/reports/broker-performance/page.tsx`

**What to build:**

- Filter: Date range, Broker select
- **Broker comparison cards** (row of 3):
  - James Harris: 9 deals, £112,440 commission, 14 avg days/stage, £1.8M pipeline
  - Sarah Croft: 4 deals, £56,220 commission, 18 avg days/stage, £400K pipeline
  - Tom Jenkins: 1 deal, £18,740 commission, 22 avg days/stage, £140K pipeline
  - Each card: avatar, name, 4 KPI metrics, small sparkline trend
- **Charts:**
  - Deals closed by broker (grouped bar chart, monthly)
  - Commission earned by broker (stacked bar chart, monthly)
  - Pipeline value by broker (horizontal bar)
- **Activity metrics table:**
  - Columns: Broker, Calls Logged, Emails Sent, Assessments Arranged, Site Visits, Deals Progressed, New Contacts Added
  - Hardcoded activity numbers
- **Target tracking:**
  - Each broker: annual target vs actual progress bar
  - On/off track indicator

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add broker performance report page`

---

### Task 4.12: Settings — General

**Files:**
- Create: `src/app/admin/brokerage-mockups/settings/page.tsx`

**What to build:**

Settings page with tabbed sections.

- Tabs: Company | Commission | Regions | Stages | Units
- **Company tab:**
  - Company name: "Hampshire BNG Solutions Ltd" (input)
  - Logo placeholder (upload zone)
  - Address: textarea
  - Primary contact: input
  - Website: input
- **Commission tab:**
  - Default commission rate: 20% (number input with slider)
  - Per-credit-type overrides table: Nitrogen 20%, Phosphorus 20%, BNG 18%
  - Commission model: dropdown (Percentage / Fixed per unit / Hybrid)
  - Note: "These defaults can be overridden on individual deals"
- **Regions tab:**
  - Active catchments/regions checklist: ✓ Solent, ✓ Test Valley, ☐ Stour, ☐ Exe, ☐ Tees
  - "Add Custom Region" button
- **Stages tab:**
  - Sortable list of deal stages (drag handles, implied)
  - Each stage: name, colour picker dot, enabled/disabled toggle
  - "Add Stage" button
- **Units tab:**
  - Unit types table: Nitrogen (kg/yr), Phosphorus (kg/yr), BNG (biodiversity units)
  - Each: name, abbreviation, unit label, enabled toggle
  - "Add Unit Type" button

All inputs pre-filled with current mock values. "Save Changes" button at bottom (non-functional).

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add settings general page`

---

### Task 4.13: Settings — Users/Team

**Files:**
- Create: `src/app/admin/brokerage-mockups/settings/users/page.tsx`

**What to build:**

- User list table:
  - Columns: Avatar, Name, Email, Role badge, Status badge (Active/Invited/Disabled), Last Active, Actions
  - 5 users:
    - James Harris — Admin/Broker, Active
    - Sarah Croft — Broker, Active
    - Tom Jenkins — Broker, Active
    - Emma Walsh — Assessor, Active
    - David Park — Assessor, Active
  - Role badges: Admin (red), Broker (blue), Assessor (green), Finance (purple)
- Role permissions matrix:
  - Table: Role vs Permission (View Deals, Edit Deals, View Financials, Manage Settings, etc.)
  - Checkmarks showing which roles have which permissions
- "+ Invite User" button → shows invite form section:
  - Email input, Role dropdown, "Send Invite" button

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add settings users/team page`

---

### Task 4.14: Settings — Integrations

**Files:**
- Create: `src/app/admin/brokerage-mockups/settings/integrations/page.tsx`

**What to build:**

Integration cards grid (2 columns):

1. **Natural England Register** — Connected ✓, "Sync BNG gain site registrations", Last sync: 2 hours ago, Configure button
2. **LPA Planning Portals** — Connected ✓, "Monitor planning applications in target catchments", 3 LPAs connected, Configure button
3. **Xero** — Connected ✓, "Sync invoices and payments", Last sync: 1 hour ago, Configure button
4. **Outlook/Gmail** — Connected ✓, "Email tracking and logging", 3 accounts connected, Configure button
5. **DocuSign** — Not Connected, "Digital document signing and tracking", Connect button (primary)
6. **Ordnance Survey** — Not Connected, "Map data and boundary verification", Connect button

Each card:
- Integration logo placeholder (coloured circle with first letter)
- Name, description
- Status: Connected (green badge) / Not Connected (gray badge)
- Last sync time or setup prompt
- Configure / Connect button

Note at bottom: "Integrations are configurable per vertical. Additional integrations available for Carbon Credits, Real Estate, and Energy verticals."

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add settings integrations page`

---

### Task 4.15: Settings — Notifications

**Files:**
- Create: `src/app/admin/brokerage-mockups/settings/notifications/page.tsx`

**What to build:**

Notification preference matrix.

- Table layout:
  - Rows: notification types grouped by category
    - **Compliance:** Deadline approaching (7 days), Deadline approaching (1 day), Item overdue, Item completed
    - **Deals:** Stage changed, New deal created, Deal won, Deal lost
    - **Payments:** Invoice sent, Payment received, Payment overdue
    - **Assessments:** Assessment scheduled, Assessment completed, Revision requested
  - Columns: In-App toggle, Email toggle, SMS toggle
  - All toggles using shadcn Switch component
- Frequency section:
  - Daily digest: toggle + time picker
  - Weekly summary: toggle + day picker (Monday default)
  - Real-time alerts: toggle (for urgent items like overdue)
- "Save Preferences" button

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add settings notifications page`

---

### Task 4.16: Settings — Vertical Configuration

**Files:**
- Create: `src/app/admin/brokerage-mockups/settings/vertical/page.tsx`

**What to build:**

This is the "brokerage OS" proof page — shows the platform is multi-vertical.

- **Current vertical header:**
  - "Active Vertical: Nutrient & BNG Credits" (large, with green status badge)
  - Dropdown showing other verticals (disabled/demo): Carbon Credits, Real Estate, Energy Brokerage, Freight, Recruitment, Insurance
  - "Switch Vertical" button (shows confirmation dialog mockup)
- **Configuration matrix** — what changes per vertical:
  - Table with columns: Configuration Area, Current Setting, Description
  - Rows:
    - Unit Types: "Nitrogen (kg/yr), Phosphorus (kg/yr), BNG (units)" — "What's being traded"
    - Assessment Templates: "NN Baseline, BNG Habitat Survey, Annual Monitoring" — "What assessors collect"
    - Document Templates: "S106, Conservation Covenant, HMMP, Purchase Agreement" — "Legal instruments"
    - Matching Rules: "Geographic (same catchment), Unit type match" — "How supply meets demand"
    - Compliance Schedules: "Annual monitoring, 5-year review, 80-year commitment" — "Ongoing obligations"
    - Commission Model: "20% of transaction value" — "How the broker gets paid"
    - External Registries: "Natural England BNG Register" — "Regulatory integrations"
    - Calculator Tools: "NE Nutrient Budget, BNG Statutory Metric" — "Domain-specific calculations"
- **Visual comparison panel:**
  - Side-by-side mini cards showing how 3 verticals differ:
    - BNG/Nutrient: Unit = kg/yr, Constraint = Catchment, Duration = 80 years
    - Real Estate: Unit = Property listing, Constraint = Geography, Duration = Tenancy term
    - Energy: Unit = kWh, Constraint = Grid region, Duration = Contract term
  - Message: "Same 7 platform pillars. Different configuration."
- Footer quote: *"We're not BNG software. We're brokerage operations infrastructure. BNG happens to be where we started."*

**Step 1:** Build the page.

**Step 2:** Verify renders.

**Step 3:** Commit: `feat(mockups): add vertical configuration page (brokerage OS proof)`

---

## Wave 5: Deal Lifecycle Bar Component

### Task 5.1: Create reusable lifecycle bar component

**Files:**
- Create: `src/app/admin/brokerage-mockups/_components/deal-lifecycle-bar.tsx`

**What to build:**

Reusable component that renders the deal lifecycle timeline.

```tsx
interface DealLifecycleBarProps {
  currentStage: LifecycleStage;
  completedStages: LifecycleStage[];
  track: "supply" | "demand" | "matched";
  dealId: string;
}
```

**Supply track stages:** Prospect → Assess → Legal → Banking
**Demand track stages:** Prospect → Requirement → (waiting)
**Matched track stages:** Prospect → Assess → Legal → Match → Quote → Agreement → Payment → Allocate → Confirm → Compliance

Visual:
- Horizontal bar with nodes connected by lines
- Each node: circle + label below
- ✓ completed = filled green circle
- ● current = filled blue circle with subtle pulse animation (CSS keyframe)
- ○ upcoming = outlined gray circle
- Lines between nodes: solid green for completed segments, dashed gray for upcoming
- Each completed/current node is a `<Link>` to the relevant page:
  - Assess → `/assessments/{linked assessment id}`
  - Legal → `/documents/{linked document id}`
  - Match → `/matching`
  - Quote → `/deals/{dealId}/quote`
  - Agreement → `/deals/{dealId}/agreement`
  - Payment → `/financials/invoices`
  - Allocate → `/inventory`
  - Confirm → `/compliance`
  - Compliance → `/compliance`

Responsive: horizontal scroll on mobile, full width on desktop.

**Step 1:** Build the component.

**Step 2:** Verify: import into deal detail page and render — visual check.

**Step 3:** Commit: `feat(mockups): add deal lifecycle bar component`

---

### Task 5.2: Add lifecycle bar to deal detail page

**Files:**
- Modify: `src/app/admin/brokerage-mockups/deals/[id]/page.tsx`

**What to change:**

1. Import shared mock data (replace inline mock data)
2. Use `useParams()` to dynamically select deal by ID
3. Add `<DealLifecycleBar>` component below the header, above the main content
4. Add lifecycle data to shared mock data: each deal gets `lifecycleStage` and `completedStages` fields
5. Fix cross-page links: contact names link to `/contacts/[id]`, site names link to `/sites/[id]`

**Step 1:** Edit the file.

**Step 2:** Verify: navigate to `/deals/D-0038` — lifecycle bar renders with correct stages.

**Step 3:** Commit: `feat(mockups): integrate lifecycle bar into deal detail page`

---

### Task 5.3: Add lifecycle funnel widget to dashboard

**Files:**
- Modify: `src/app/admin/brokerage-mockups/dashboard/page.tsx`

**What to change:**

1. Import shared mock data (replace inline mock data)
2. Add a new "Deal Lifecycle" section to the dashboard (all 3 variations):
  - Horizontal funnel/bar chart showing deal count at each lifecycle stage
  - Stages: Prospect (5) → Assess (3) → Legal (2) → Match (3) → Quote (2) → Agreement (1) → Payment (1) → Allocate (0) → Confirm (0) → Compliance (1)
  - Each bar is clickable (links to deals page filtered by that stage)
  - Colour gradient from light blue (early) to dark green (complete)
3. Fix stat card values to use computed exports from shared data
4. Fix any hardcoded colours → semantic tokens

**Step 1:** Edit the file.

**Step 2:** Verify: dashboard renders with lifecycle funnel and consistent numbers.

**Step 3:** Commit: `feat(mockups): add lifecycle funnel to dashboard, integrate shared mock data`

---

## Wave 6: Demo Walkthrough

### Task 6.1: Build demo walkthrough page

**Files:**
- Create: `src/app/admin/brokerage-mockups/demo/page.tsx`

**What to build:**

Guided story mode — floating overlay that walks through 14 steps of a deal lifecycle.

**State management:**
- `currentStep` (0-13) via useState
- `isPlaying` (auto-advance toggle)

**Layout:**
- Full-page view with two sections:
  - Main content area showing the current step's "screen preview" (embedded mockup or screenshot placeholder)
  - Bottom panel (fixed, ~200px height) with:
    - Progress bar: step N of 14
    - Step title (bold)
    - Narrative text (1-2 sentences)
    - "← Previous" and "Next →" buttons
    - "Go to Page →" button (links to the actual mockup page for this step)
    - Step dots: 14 small circles showing progress

**14 Steps:**

```ts
const DEMO_STEPS = [
  {
    title: "Command Centre",
    page: "/admin/brokerage-mockups/dashboard",
    narrative: "Your daily command centre. 18 active deals, £2.3M pipeline, 3 overdue compliance items. The lifecycle funnel shows where every deal sits across your business.",
    highlight: "stat-cards, lifecycle-funnel"
  },
  {
    title: "New Supply Contact",
    page: "/admin/brokerage-mockups/contacts/new",
    narrative: "A landowner calls in. We capture Robert Whiteley — farmer in the Solent catchment, 60 hectares of arable land. He's tagged as a Supply partner.",
    highlight: "supply-toggle, contact-form"
  },
  {
    title: "Onboard Site",
    page: "/admin/brokerage-mockups/sites/new",
    narrative: "We onboard Whiteley Farm as a potential supply site. Land size, current use, location captured. Catchment auto-detected from coordinates.",
    highlight: "site-form, map-pin"
  },
  {
    title: "Schedule Assessment",
    page: "/admin/brokerage-mockups/assessments/schedule",
    narrative: "Time to send an ecologist. We pick the site, select assessment type, and assign Sarah Chen — she's free Thursday and specialises in nutrient surveys.",
    highlight: "assessor-cards, calendar"
  },
  {
    title: "Assessment Results",
    page: "/admin/brokerage-mockups/assessments/ASM-001",
    narrative: "Sarah visits the site, records baseline data. The system calculates: this land can generate 95 kg/year nitrogen credits. Photos and findings all captured.",
    highlight: "metric-results, credit-yield"
  },
  {
    title: "Nutrient Calculator",
    page: "/admin/brokerage-mockups/assessments/calculator",
    narrative: "The Natural England nutrient budget methodology running inside your platform. No more spreadsheets emailed back and forth — it's all here.",
    highlight: "calculator-tabs, output"
  },
  {
    title: "Legal & Documents",
    page: "/admin/brokerage-mockups/documents/DOC-001",
    narrative: "Legal kicks off. S106 agreement generated from a template, sent for signatures. We track who's signed and who hasn't. 80-year commitment secured.",
    highlight: "signature-timeline, document-viewer"
  },
  {
    title: "Site Goes Live",
    page: "/admin/brokerage-mockups/sites/S-0001",
    narrative: "Whiteley Farm is now an active supply site. 95 kg/year banked and ready to sell. The capacity gauge shows 100% available — nothing allocated yet.",
    highlight: "capacity-gauge, status-badge"
  },
  {
    title: "Developer Requirement",
    page: "/admin/brokerage-mockups/contacts/C-101",
    narrative: "Meanwhile, Rachel Morrison at Taylor Wimpey needs credits for a 200-home development in Eastleigh. Requirement: 30 kg/year nitrogen, Solent catchment.",
    highlight: "requirements-panel, demand-badge"
  },
  {
    title: "Supply Matching",
    page: "/admin/brokerage-mockups/matching",
    narrative: "One click — the system finds 3 matching supply sites in the Solent catchment, ranked by price. Whiteley Farm offers the best value at £2,500/kg.",
    highlight: "match-results, best-match"
  },
  {
    title: "Generate Quote",
    page: "/admin/brokerage-mockups/deals/D-0038/quote",
    narrative: "We generate a quote: 30 kg/year at £2,500/kg = £75,000 total. Your 20% commission: £15,000. One click to send to Rachel.",
    highlight: "pricing-panel, commission-calc"
  },
  {
    title: "Deal in Progress",
    page: "/admin/brokerage-mockups/deals/D-0038",
    narrative: "Deal D-0038 is now live. The lifecycle bar shows exactly where we are — agreement stage. All parties, documents, and financials linked in one view.",
    highlight: "lifecycle-bar, deal-header"
  },
  {
    title: "Payment & Commission",
    page: "/admin/brokerage-mockups/financials/invoices",
    narrative: "Payment comes through. £75,000 from Taylor Wimpey. £60,000 to Robert Whiteley. £15,000 is your commission. Every penny tracked.",
    highlight: "invoice-row, commission-split"
  },
  {
    title: "Ongoing Compliance",
    page: "/admin/brokerage-mockups/compliance",
    narrative: "The deal closes, but obligations continue for 80 years. Annual monitoring is auto-scheduled, reminders fire before deadlines. Nothing falls through the cracks.",
    highlight: "calendar-view, overdue-items"
  }
];
```

**After step 14, show closing panel:**
- Large text: "That's one deal."
- "You're running 18 simultaneously across 6 catchments."
- "And when you're ready to broker carbon credits, real estate, or energy — it's the same platform, different configuration."
- "See how →" button linking to `/settings/vertical`
- "Restart Demo" button

**Step 1:** Build the page.

**Step 2:** Verify: navigate through all 14 steps, confirm "Go to Page" links work.

**Step 3:** Commit: `feat(mockups): add guided demo walkthrough with 14-step deal lifecycle story`

---

## Wave 7: Existing Page Fixes (can be built in parallel)

### Task 7.1: Fix sites page — dark mode and linking

**Files:**
- Modify: `src/app/admin/brokerage-mockups/sites/page.tsx`

**Changes:**
1. Import shared mock data, replace inline `SITES` array
2. Replace all hardcoded Tailwind colours with semantic tokens:
   - `bg-white` → `bg-card`
   - `text-gray-900` → `text-foreground`
   - `border-gray-200` → `border-border`
   - `text-gray-500` → `text-muted-foreground`
   - etc.
3. Make table rows / grid cards clickable: wrap in `<Link href={/admin/brokerage-mockups/sites/${site.ref}}>`
4. Import `Link` from `next/link`
5. Replace native `<select>` elements with shadcn `<Select>` components for consistency

**Step 1:** Edit the file.

**Step 2:** Verify: dark mode works, clicking a row navigates to site detail.

**Step 3:** Commit: `fix(mockups): fix sites page dark mode and add navigation links`

---

### Task 7.2: Fix site detail page — dynamic routing

**Files:**
- Modify: `src/app/admin/brokerage-mockups/sites/[id]/page.tsx`

**Changes:**
1. Import shared mock data
2. Use `useParams()` to get `id`, look up site from shared `sites` array
3. Remove hardcoded S-0005 data, replace with dynamic lookup
4. Add assessment history section (from shared assessments data, filtered by site ref)
5. Add legal status section linking to documents
6. Ensure all cross-links work (contacts, deals, documents)

**Step 1:** Edit the file.

**Step 2:** Verify: `/sites/S-0001` and `/sites/S-0005` show correct data.

**Step 3:** Commit: `fix(mockups): make site detail page use dynamic routing and shared data`

---

### Task 7.3: Fix deals page — linking and consistency

**Files:**
- Modify: `src/app/admin/brokerage-mockups/deals/page.tsx`

**Changes:**
1. Import shared mock data, replace inline `DEALS` array
2. Make kanban cards clickable: wrap in `<Link href={...}>`
3. Make table rows clickable: wrap in `<Link href={...}>`
4. Ensure stage names and colours are consistent with dashboard
5. Import `Link` from `next/link`

**Step 1:** Edit the file.

**Step 2:** Verify: clicking a deal navigates to its detail page.

**Step 3:** Commit: `fix(mockups): add deal navigation links and use shared mock data`

---

### Task 7.4: Fix deal detail page — dynamic routing

**Files:**
- Modify: `src/app/admin/brokerage-mockups/deals/[id]/page.tsx`

**Changes:**
1. Import shared mock data
2. Use `useParams()` properly — look up deal by ID from shared data
3. Lifecycle bar integration (done in Wave 5 Task 5.2, but ensure data is correct)
4. Fix all cross-links: contact names → `/contacts/[id]`, site name → `/sites/[ref]`
5. Add links to quote page and agreement page in appropriate sections

**Note:** This overlaps with Task 5.2. If done in sequence, Task 5.2 handles lifecycle bar, this task handles remaining fixes. If done in parallel, merge carefully.

**Step 1:** Edit the file.

**Step 2:** Verify: `/deals/D-0038` and `/deals/D-0035` show correct data with working links.

**Step 3:** Commit: `fix(mockups): make deal detail page use dynamic routing with cross-links`

---

### Task 7.5: Fix inventory page — dark mode and data

**Files:**
- Modify: `src/app/admin/brokerage-mockups/inventory/page.tsx`

**Changes:**
1. Import shared mock data, replace inline data
2. Compute summary stats from shared sites data (total nitrogen, available nitrogen, total BNG, available BNG)
3. Replace hardcoded Tailwind colours with semantic tokens (same as sites fix)

**Step 1:** Edit the file.

**Step 2:** Verify: numbers match sites page, dark mode works.

**Step 3:** Commit: `fix(mockups): fix inventory page dark mode and use shared mock data`

---

### Task 7.6: Fix contacts page — linking

**Files:**
- Modify: `src/app/admin/brokerage-mockups/contacts/page.tsx`

**Changes:**
1. Import shared mock data, replace inline contacts array
2. Make "View Profile" dropdown action actually navigate: use `<Link>` or `router.push`
3. Make contact names in table rows clickable (link to `/contacts/[id]`)

**Step 1:** Edit the file.

**Step 2:** Verify: clicking a contact navigates to contact detail page.

**Step 3:** Commit: `fix(mockups): add contact navigation links and use shared mock data`

---

### Task 7.7: Fix compliance page — data consistency

**Files:**
- Modify: `src/app/admin/brokerage-mockups/compliance/page.tsx`

**Changes:**
1. Import shared mock data, replace inline compliance items
2. Ensure site/deal refs link to correct detail pages
3. Make compliance items clickable → link to `/compliance/[id]`

**Step 1:** Edit the file.

**Step 2:** Verify: numbers match, links work.

**Step 3:** Commit: `fix(mockups): use shared compliance data and add navigation links`

---

### Task 7.8: Fix financials page — data consistency

**Files:**
- Modify: `src/app/admin/brokerage-mockups/financials/page.tsx`

**Changes:**
1. Import shared mock data for financial figures
2. Ensure stat card values are computed from shared data (or at minimum, consistent with other pages)
3. Add links to new sub-pages: "View all invoices →" links to `/financials/invoices`, etc.

**Step 1:** Edit the file.

**Step 2:** Verify: numbers consistent, links to sub-pages work.

**Step 3:** Commit: `fix(mockups): use shared financial data and add sub-page links`

---

### Task 7.9: Fix matching page — action buttons

**Files:**
- Modify: `src/app/admin/brokerage-mockups/matching/page.tsx`

**Changes:**
1. Import shared mock data
2. Make "Create Deal" buttons link to `/deals/new` with pre-filled context (or just navigate without context for mockup)
3. Show matching constraints as configurable rules: add a small "Matching Rules" panel showing "Geographic: Same catchment ✓", "Unit Type: Match required ✓", "Availability: Check stock ✓" — making it clear these are configurable, not hardcoded
4. Add note: "Matching rules are configurable per vertical in Settings"

**Step 1:** Edit the file.

**Step 2:** Verify: "Create Deal" buttons navigate, rules panel renders.

**Step 3:** Commit: `fix(mockups): add deal creation links and configurable matching rules display`

---

## Wave 8: Final Verification

### Task 8.1: Full build and link verification

**Steps:**

1. Run `npx next build` — must pass with zero errors
2. Run dev server: `npx next dev`
3. Navigate through every page — verify:
   - All 40 pages render without errors
   - All navigation links work (no dead ends)
   - Dark mode works on every page (toggle browser theme)
   - Stat card numbers are consistent across dashboard, inventory, financials
   - Demo walkthrough steps through all 14 steps correctly
   - Lifecycle bar renders on deal detail pages
4. Fix any issues found

**Step 1:** Run build.

**Step 2:** Manual navigation check through all pages.

**Step 3:** Fix any issues.

**Step 4:** Final commit: `feat(mockups): complete brokerage mockup suite — 40 pages, guided demo, shared data`

---

## Execution Order Summary

```
Wave 0: Shared Mock Data (9 files)                    — sequential, ~30 min
Wave 1: Layout + Landing Page (2 tasks)                — sequential, ~15 min
Wave 2: Simple New Pages (7 tasks)                     — PARALLEL, ~45 min each
Wave 3: Assessment Pages (5 tasks)                     — PARALLEL, ~45 min each
Wave 4: Documents/Reports/Settings (16 tasks)          — PARALLEL, ~30-45 min each
Wave 5: Lifecycle Bar (3 tasks)                        — sequential, ~30 min
Wave 6: Demo Walkthrough (1 task)                      — sequential, ~45 min
Wave 7: Existing Page Fixes (9 tasks)                  — PARALLEL, ~20 min each
Wave 8: Verification (1 task)                          — sequential, ~30 min
```

**Waves 2, 3, and 4 can all run in parallel** (they create independent new pages).
**Wave 7 can run in parallel with Waves 2-4** (fixes to existing pages don't conflict with new page creation, except Task 7.4 which overlaps with Task 5.2).
**Wave 5 depends on Wave 0** (needs shared data) and should run before Wave 7 Task 7.4.
**Wave 6 depends on all other waves** (demo links to all pages).
**Wave 8 is always last.**

---

## Dependency Graph

```
Wave 0 (mock data)
  ├──→ Wave 1 (layout)
  ├──→ Wave 2 (new simple pages)      ─┐
  ├──→ Wave 3 (assessment pages)       ├──→ Wave 6 (demo) ──→ Wave 8 (verify)
  ├──→ Wave 4 (docs/reports/settings)  │
  ├──→ Wave 5 (lifecycle bar)          │
  └──→ Wave 7 (existing fixes) ───────┘
```
