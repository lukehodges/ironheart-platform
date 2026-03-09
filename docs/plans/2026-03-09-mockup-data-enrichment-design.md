# Mockup Data Enrichment — Design Document

**Date:** 2026-03-09
**Approach:** B — Data enrichment + targeted new UI sections
**Goal:** Make brokerage mockups reflect the real complexity of the live system so investors and customers can see the platform's value. The demos currently show flat aggregate numbers; they should show the genuine data model in action.

**Input documents:**
- `2026-03-09-bng-register-data-gap-analysis.md` — Register data vs mockup gap analysis
- `2026-03-09-cross-vertical-architecture-analysis.md` — Cross-vertical architecture with TypeScript interfaces and UI layout specs
- `2026-03-08-brokerage-mockup-enhancement-design.md` — Current mockup structure and patterns

---

## 1. Summary of Changes

Three layers of changes, delivered together:

1. **`types.ts`** — Add `HabitatParcel`, `HabitatCategorySummary`, `SiteAllocation` types; extend `Site` with optional BNG and nutrient fields
2. **`sites.ts` + `assessments.ts`** — Massively enrich mock data with real habitat parcel arrays, nutrient loading calculations, BGS references, NCA/LNRS/LSOA geography
3. **Three pages** — BNG site detail (habitat tabs), nutrient site detail (budget section), assessment detail (metric results panel)

No existing page structure is removed. All additions are additive.

---

## 2. Data Model (`types.ts`)

### 2.1 New Types

```typescript
// ── Habitat Parcel ──
// The core missing entity. Represents one habitat type on one site in one phase.
// Used for BNG sites only.

type HabitatCategory = "area" | "hedgerow" | "watercourse" | "individual_tree";
type ParcelPhase = "baseline" | "improvement";
type Distinctiveness = "v_low" | "low" | "medium" | "high" | "v_high";
type HabitatCondition = "poor" | "fairly_poor" | "moderate" | "fairly_good" | "good";
type StrategicSignificance = "low" | "medium" | "high";

interface HabitatParcel {
  id: string;
  phase: ParcelPhase;
  category: HabitatCategory;

  // Classification (from statutory biodiversity metric habitat list)
  broadHabitatType: string;        // e.g. "Woodland", "Grassland", "Wetland"
  specificHabitatType: string;     // e.g. "Lowland Mixed Deciduous Woodland", "Other Neutral Grassland"

  // Quality scores (inputs to the biodiversity metric formula)
  distinctiveness: Distinctiveness;
  distinctivenessScore: number;    // v_low=0, low=2, medium=4, high=6, v_high=8
  condition: HabitatCondition;
  conditionScore: number;          // poor=1, fairly_poor=1.5, moderate=2, fairly_good=2.5, good=3
  strategicSignificance: StrategicSignificance;
  significanceMultiplier: number;  // low=1.0, medium=1.1, high=1.15

  // Size
  parcelCount: number;             // number of physical parcels of this habitat type on site
  size: number;                    // hectares (area), km (linear), count (trees)
  sizeUnit: "ha" | "km" | "trees";

  // Calculated
  biodiversityUnits: number;       // size × distinctiveness × condition × significance (× risk multipliers for improvement)
  unitGain: number | null;         // improvement parcels only: improvement HUs minus baseline HUs for this type

  // Allocation status (populated on improvement parcels only)
  allocatedSize: number;
  allocatedPercent: number;
  allocatedUnits: number;

  // Baseline parcels only
  retainedSize: number | null;     // how much of the baseline habitat is retained (not converted)

  // Risk multipliers (improvement parcels, habitat bank / off-site credits)
  temporalRisk: number | null;     // discount for time taken to establish habitat (e.g. 0.75 for woodland)
  spatialRisk: number | null;      // discount for off-site delivery risk
  difficultyMultiplier: number | null;
}

// ── Habitat Category Summary ──
// One row per category (area / hedgerow / watercourse / individual_tree).
// Mirrors the Natural England register's summary table format.

interface HabitatCategorySummary {
  category: HabitatCategory;
  categoryLabel: string;           // "Areas", "Hedgerows", "Watercourses", "Individual Trees"

  baselineParcelCount: number;
  improvementParcelCount: number;

  baselineSize: number;
  improvementSize: number;
  retainedSize: number;
  sizeUnit: "ha" | "km" | "trees";

  baselineUnits: number;
  improvementUnits: number;
  unitGain: number;

  allocatedUnits: number;
  allocatedPercent: number;
}

// ── Site Allocation (with parcel detail) ──
// Replaces the flat allocation rows used on the current site detail page.
// Includes planning reference, distance, and per-parcel breakdown.

interface SiteAllocation {
  id: string;
  allocationRef: string;           // e.g. "A-0001"
  dealId: string;
  dealTitle: string;
  demandContactName: string;
  planningRef: string | null;      // e.g. "NY/2025/0892" — the developer's planning application ref
  unitTypeCode: "BNG_AREA_HU" | "BNG_HEDGEROW_HU" | "KG_NITROGEN" | "KG_PHOSPHORUS";
  unitQuantity: number;
  totalValue: number;
  status: "reserved" | "confirmed" | "delivered";
  distanceKm: number | null;       // distance from gain site to development
  allocatedDate: string;
  parcels: {                       // which specific habitat parcels are allocated
    habitatType: string;
    allocatedSize: number;
    allocatedUnits: number;
  }[];
}

// ── Assessment Metric Output ──
// Added to Assessment for BNG surveys: structured parcel data from the ecologist's survey.

interface AssessmentMetricOutput {
  metricVersion: string;           // e.g. "Statutory Metric 1.0"
  calculationDate: string;
  baselineParcels: HabitatParcel[];
  improvementParcels: HabitatParcel[];
  totalBaselineHUs: number;
  totalImprovementHUs: number;
  totalHUGain: number;
  hedgerowBaselineHUs: number;
  hedgerowImprovementHUs: number;
  hedgerowHUGain: number;
}

// ── Assessment Nutrient Output ──
// Added to Assessment for NN surveys: the nutrient budget calculation results.

interface AssessmentNutrientOutput {
  baselineLoadingKgYr: number;     // current land use loading to watercourse
  proposedLoadingKgYr: number;     // projected loading after mitigation management
  creditYieldKgYr: number;         // gross reduction (baseline minus proposed)
  loadingFactorBaseline: number;   // kg N/ha/yr under current use
  loadingFactorProposed: number;   // kg N/ha/yr under proposed use
  landUseChange: string;           // e.g. "Arable → Permanent Grassland + Buffer Strips"
}
```

### 2.2 Extensions to Existing `Site` Type

Add these optional fields to the existing `Site` interface:

```typescript
// BNG identification
bgsReference?: string;             // Natural England BGS-XXXXXXXX format
nationalCharacterArea?: string;    // NCA name (159 NCAs in England)
lnrsArea?: string;                 // Local Nature Recovery Strategy area
lsoa?: string;                     // Lower Layer Super Output Area
imdDecile?: number;                // Index of Multiple Deprivation (1-10)
enhancementStartDate?: string;     // ISO date: when habitat works began
metricVersion?: string;            // e.g. "Statutory Metric 1.0"
hmmpStatus?: "draft" | "submitted" | "approved";

// Nutrient-specific
baselineLoading?: number;          // kg N/yr or kg P/yr before mitigation
proposedLoading?: number;          // kg N/yr or kg P/yr after mitigation
mitigationType?: string;           // e.g. "Land Use Change: Arable → Permanent Grassland"

// Habitat data (BNG sites only)
habitatSummary?: HabitatCategorySummary[];
baselineHabitats?: HabitatParcel[];
improvementHabitats?: HabitatParcel[];

// Enriched allocations (replaces flat allocation data in site detail inline data)
siteAllocations?: SiteAllocation[];
```

The existing flat `total / allocated / available` fields are retained for backwards compatibility. For BNG sites they will be derived from the habitat data; for nutrient sites they remain as-is.

### 2.3 Extensions to Existing `Assessment` Type

```typescript
metricOutput?: AssessmentMetricOutput;    // BNG assessments only
nutrientOutput?: AssessmentNutrientOutput; // NN assessments only
```

---

## 3. Mock Data Enrichment

### 3.1 BNG Site — Fareham Woodland (S-0008)

**New fields added:**

```typescript
bgsReference: "BGS-040326001",
nationalCharacterArea: "South Hampshire Coast",
lnrsArea: "Hampshire and the Isle of Wight",
lsoa: "Fareham 014A",
imdDecile: 6,
enhancementStartDate: "2026-06-01",  // planned start once under assessment clears
metricVersion: "Statutory Metric 1.0",
hmmpStatus: "draft",
```

**Baseline habitats (8 area parcels, 18.0 ha, 59.0 HUs; 1 hedgerow parcel, 0.6 km, 1.2 HUs):**

| Habitat Type | Category | Distinctiveness | Condition | Parcels | Size | HUs |
|---|---|---|---|---|---|---|
| Woodland and Forest; Conifer Plantation | area | low (2) | poor (1.0) | 3 | 11.0 ha | 33.0 |
| Scrub | area | medium (4) | poor (1.0) | 2 | 4.5 ha | 18.0 |
| Bramble Scrub | area | medium (4) | poor (1.0) | 1 | 1.5 ha | 6.0 |
| Modified Grassland (rides) | area | low (2) | poor (1.0) | 2 | 1.0 ha | 2.0 |
| Hedgerow; No Associated Trees | hedgerow | low (2) | poor (1.0) | 1 | 0.6 km | 1.2 |

**Improvement habitats (8 area parcels, 18.0 ha, 205.8 HUs; 2 hedgerow parcels, 1.2 km, 13.5 HUs):**

Temporal risk multipliers applied (woodland takes time to establish):

| Habitat Type | Dist. | Cond. | Sig. | Temporal | Parcels | Size | HUs |
|---|---|---|---|---|---|---|---|
| Lowland Mixed Deciduous Woodland | v_high (8) | moderate (2.0) | medium (1.1) | 0.75 | 3 | 11.0 ha | 145.2 |
| Woodland Edge | medium (4) | fairly_good (2.5) | medium (1.1) | 0.85 | 2 | 4.5 ha | 41.9 |
| Scrub Mosaic (Mixed Scrub) | medium (4) | moderate (2.0) | low (1.0) | 0.90 | 2 | 1.5 ha | 10.8 |
| Species-rich Neutral Grassland | medium (4) | moderate (2.0) | medium (1.1) | 0.90 | 1 | 1.0 ha | 7.9 |
| Hedgerow; Native Species-rich | high (6) | moderate (2.0) | medium (1.1) | 0.85 | 2 | 1.2 km | 13.5 |

**Habitat summary (4 category rows):**

| Category | Parcels | Baseline | Baseline HUs | Improve | Improve HUs | HU Gain | Alloc'd | % |
|---|---|---|---|---|---|---|---|---|
| Areas | 8 | 18.0 ha | 59.0 | 18.0 ha | 205.8 | +146.8 | 0.0 | 0% |
| Hedgerows | 1 | 0.6 km | 1.2 | 1.2 km | 13.5 | +12.3 | 0.0 | 0% |
| Watercourses | 0 | — | — | — | — | — | — | — |
| Ind. Trees | 0 | — | — | — | — | — | — | — |

**Site total fields updated:**
- `total`: 205.8 (improvement area HUs — the new capacity)
- `allocated`: 0
- `available`: 205.8
- `totalLabel`: "205.8 area HUs" (net gain: +146.8 HUs over baseline)

### 3.2 Nutrient Sites (S-0001 through S-0006)

Loading data added to each site, internally consistent with existing `total` credit figures:

| Site | Area | Current Use | Baseline Loading | Proposed Loading | Credits | Mitigation Type |
|---|---|---|---|---|---|---|
| Whiteley Farm | 60 ha | Arable | 340 kg N/yr | 245 kg N/yr | 95 kg/yr | Land Use Change: Arable → Permanent Grassland + Buffer Strips |
| Botley Meadows | 85 ha | Pasture (dairy) | 425 kg N/yr | 305 kg N/yr | 120 kg/yr | Land Use Change: Dairy Pasture → Extensive Grassland + Wetland Margins |
| Hamble Valley | 45 ha | Mixed grazing | 180 kg N/yr | 100 kg N/yr | 80 kg/yr | Management Change: Mixed Grazing → Hay Meadow, Reduced Stocking Density |
| Manor Fields | 55 ha | Arable | 330 kg N/yr | 235 kg N/yr | 95 kg/yr | Land Use Change: Arable → Species-rich Chalk Grassland |
| Test Valley Grassland | 110 ha | Pasture (dairy) | 550 kg N/yr | 385 kg N/yr | 165 kg/yr | Management Change: Intensive Dairy → Extensive Grazing + Chalk Stream Buffers |

All sites also receive `nationalCharacterArea`, `lnrsArea`, and `lsoa` values appropriate to their geographic location.

### 3.3 Assessment Enrichment

**ASM-006 (Fareham Woodland, BNG)** receives `metricOutput` containing the full baseline and improvement parcel arrays (matching the site data above), plus `metricVersion: "Statutory Metric 1.0"` and `calculationDate: "2026-02-05"`.

**ASM-001 through ASM-005 (NN assessments)** each receive `nutrientOutput` with `baselineLoadingKgYr`, `proposedLoadingKgYr`, `creditYieldKgYr`, and `landUseChange` matching their site's data.

---

## 4. UI Changes

### 4.1 BNG Site Detail Page (`/sites/[id]/page.tsx` — S-0008)

**Changes: additive only. Existing layout preserved.**

**New tab bar** inserted after the stat cards:

```
[Habitat Summary] [Baseline] [Enhancement] [Allocations] [Documents] [Compliance]
```

**Habitat Summary tab (default):**

A dense table component mirroring the Natural England register format. 4 rows (area/hedgerows/watercourses/trees) + totals footer. Columns: Category · Parcels · Baseline Size · Baseline HUs · Retained · Improvement Size · Improvement HUs · HU Gain · Allocated HUs · % Allocated.

- HU Gain column: green badges for positive values
- % Allocated column: thin progress bar
- Rows with no data (watercourses, trees): show `—` not zeros
- Clicking a category row filters the Baseline/Enhancement tabs to that category

**Baseline tab:**

Sortable table of `baselineHabitats[]`. Columns: Habitat Type · Broad Type · Distinctiveness (badge) · Condition (badge) · Parcels · Size · HUs. Expandable rows reveal strategic significance, calculation formula (`size × distinctiveness × condition × significance = HUs`), and retained size. Filter chips: `[All Categories ▾]` `[All Distinctiveness ▾]`.

**Enhancement tab:**

Same structure as Baseline but with additional columns: `% Allocated` (progress bar) and `HU Gain` (green badge). Expandable rows show temporal/spatial risk multipliers and the full calculation including multipliers. Filter chips: `[All Categories ▾]` `[All Distinctiveness ▾]` `[Unallocated only]`.

**Allocations tab:**

Replaces the existing flat allocation table. New columns: `Ref · Development · Planning Ref · Unit Type · Quantity · Distance · Status`. Expandable rows show per-parcel allocation detail (`Lowland Mixed Deciduous Woodland → 5.20 HUs from 0.59 ha`).

**Right sidebar enrichment:**

Three new structured cards added:

*Registration card:* BGS reference (monospace badge), registered date, legal agreement type, commitment years, commitment end date, fee paid.

*Geography card:* NCA, LNRS, LPA, LSOA, IMD Decile.

*Metric card:* Version, HMMP status (badge), enhancement start date.

### 4.2 Nutrient Site Detail Pages (`/sites/[id]/page.tsx` — S-0001 through S-0006)

**New section added: Nutrient Budget**

Inserted between the existing site overview and the allocations section. A clean breakdown card:

```
Land use change
Arable → Permanent Grassland + Buffer Strips

Baseline loading    340 kg N/yr    (5.67 kg N/ha/yr × 60 ha)
Proposed loading  − 245 kg N/yr    (4.08 kg N/ha/yr × 60 ha)
──────────────────────────────────────
Credit yield         95 kg N/yr    ←  available to sell

Commitment: S106 Agreement · 80 years · expires 2105
```

Uses `baselineLoading`, `proposedLoading`, `mitigationType`, `areaHectares`, `legalAgreement`, `commitmentYears` fields from the site data. Rendered conditionally: only appears when `site.unitType !== "BNG"` and `site.baselineLoading` is populated.

Right sidebar gains the Geography card (NCA, LNRS, LPA, LSOA) on nutrient sites too.

### 4.3 Assessment Detail Page (`/assessments/[id]/page.tsx` — ASM-006 and ASM-001–005)

**New section added: Metric / Budget Results**

Inserted after the existing findings/photos section.

**For BNG assessments** (condition: `assessment.metricOutput` is present):

Panel header: `Biodiversity Metric Results · Statutory Metric 1.0 · Calculated 05 Feb 2026`

Two sub-tabs: `Baseline Survey` and `Proposed Enhancement`.

Each sub-tab shows the same habitat parcel table format as the site detail page (Habitat Type · Distinctiveness · Condition · Parcels · Size · HUs). A summary row at the bottom.

Below the tabs: a highlighted result banner:

```
╔══════════════════════════════════════════════╗
║  Net biodiversity gain available to register  ║
║  +146.8 area HUs  ·  +12.3 hedgerow HUs      ║
║  Metric v1.0  ·  Sarah Chen  ·  05 Feb 2026  ║
╚══════════════════════════════════════════════╝
```

**For NN assessments** (condition: `assessment.nutrientOutput` is present):

Compact nutrient budget panel (same format as site detail Nutrient Budget card) showing baseline loading → proposed loading → credit yield. Plus the loading factors per hectare used in the calculation.

---

## 5. File Scope

| File | Change type | Notes |
|---|---|---|
| `_mock-data/types.ts` | Extend | Add 5 new interfaces; extend `Site` and `Assessment` |
| `_mock-data/sites.ts` | Enrich | Add habitat parcels to S-0008; add loading data to S-0001–S-0006 |
| `_mock-data/assessments.ts` | Enrich | Add `metricOutput` to ASM-006; add `nutrientOutput` to ASM-001–005 |
| `sites/[id]/page.tsx` | Extend UI | Add tab bar, habitat tables, enriched sidebar — BNG and nutrient variants |
| `assessments/[id]/page.tsx` | Extend UI | Add metric/budget results panel |

No other files change. Shared mock data index (`_mock-data/index.ts`) needs no changes. All new types are exported from `types.ts` and imported where needed.

---

## 6. Design Constraints

- All pages remain `"use client"` with no API calls — pure mockup
- Tailwind 4 semantic tokens only (no hardcoded colours)
- shadcn/ui components throughout (Table, Badge, Card, Tabs, Progress)
- Recharts only where charts already exist — no new charts in this pass
- The BNG and nutrient site detail pages share the same route (`/sites/[id]/page.tsx`); the page detects `site.unitType` to render the appropriate sections
- All new components are inline (no new component files) to keep the mockup self-contained
