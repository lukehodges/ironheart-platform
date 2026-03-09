# Mockup Data Enrichment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the brokerage mockups with real-world data complexity — full BNG habitat parcel arrays, nutrient loading calculations, and new UI sections so investors can see the platform's genuine data model in action.

**Architecture:** Pure mock-data enrichment + additive UI changes. No backend. All pages remain `"use client"` components. New types added to `types.ts`; shared `sites.ts` and `assessments.ts` enriched in-place. Three pages get new sections rendered conditionally based on `site.unitType`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui (Tabs, Table, Badge, Card, Progress), TypeScript

**Design doc:** `docs/plans/2026-03-09-mockup-data-enrichment-design.md`

---

## Important context before starting

Read these before touching any file:

- `src/app/admin/brokerage-mockups/_mock-data/types.ts` — current type definitions
- `src/app/admin/brokerage-mockups/_mock-data/sites.ts` — current site data (6 sites, all flat)
- `src/app/admin/brokerage-mockups/_mock-data/assessments.ts` — current assessment data
- `src/app/admin/brokerage-mockups/sites/[id]/page.tsx` — has its own inline `SITES_DATA` record AND imports from shared mock data; uses module-level variables set before render
- `src/app/admin/brokerage-mockups/assessments/[id]/page.tsx` — has hardcoded `HABITAT_DATA` constant and hardcoded numbers in the NN metric results section

The `sites/[id]/page.tsx` pattern: it has both a `SITES_DATA` record (inline, used for the detail layout) AND imports `sites as sharedSites` from the shared mock data. For BNG habitat data, use `sharedSites.find(s => s.ref === siteId)` to access the enriched data. For nutrient loading numbers, enrich both `SITES_DATA` entries AND `sharedSites`.

---

## Task 1: Extend `types.ts` with new interfaces

**Files:**
- Modify: `src/app/admin/brokerage-mockups/_mock-data/types.ts`

### Step 1: Add the new types

Open `types.ts`. After the existing `// ── Sites ──` section (after the `Site` interface), add the following new interfaces. Insert before the `// ── Deals ──` comment:

```typescript
// ── Habitat Parcels (BNG) ──
export type HabitatCategory = "area" | "hedgerow" | "watercourse" | "individual_tree";
export type ParcelPhase = "baseline" | "improvement";
export type Distinctiveness = "v_low" | "low" | "medium" | "high" | "v_high";
export type HabitatCondition = "poor" | "fairly_poor" | "moderate" | "fairly_good" | "good";
export type StrategicSignificance = "low" | "medium" | "high";

export interface HabitatParcel {
  id: string;
  phase: ParcelPhase;
  category: HabitatCategory;
  broadHabitatType: string;
  specificHabitatType: string;
  distinctiveness: Distinctiveness;
  distinctivenessScore: number;    // v_low=0, low=2, medium=4, high=6, v_high=8
  condition: HabitatCondition;
  conditionScore: number;          // poor=1, fairly_poor=1.5, moderate=2, fairly_good=2.5, good=3
  strategicSignificance: StrategicSignificance;
  significanceMultiplier: number;  // low=1.0, medium=1.1, high=1.15
  parcelCount: number;
  size: number;
  sizeUnit: "ha" | "km" | "trees";
  biodiversityUnits: number;
  unitGain: number | null;         // improvement parcels only
  allocatedSize: number;
  allocatedPercent: number;
  allocatedUnits: number;
  retainedSize: number | null;     // baseline parcels only
  temporalRisk: number | null;     // improvement parcels: discount for establishment time
  spatialRisk: number | null;
  difficultyMultiplier: number | null;
}

export interface HabitatCategorySummary {
  category: HabitatCategory;
  categoryLabel: string;
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

export interface SiteAllocation {
  id: string;
  allocationRef: string;
  dealId: string;
  dealTitle: string;
  demandContactName: string;
  planningRef: string | null;
  unitTypeCode: "BNG_AREA_HU" | "BNG_HEDGEROW_HU" | "KG_NITROGEN" | "KG_PHOSPHORUS";
  unitQuantity: number;
  totalValue: number;
  status: "reserved" | "confirmed" | "delivered";
  distanceKm: number | null;
  allocatedDate: string;
  parcels: { habitatType: string; allocatedSize: number; allocatedUnits: number }[];
}

export interface AssessmentMetricOutput {
  metricVersion: string;
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

export interface AssessmentNutrientOutput {
  baselineLoadingKgYr: number;
  proposedLoadingKgYr: number;
  creditYieldKgYr: number;
  loadingFactorBaseline: number;   // kg N/ha/yr
  loadingFactorProposed: number;   // kg N/ha/yr
  landUseChange: string;
}
```

### Step 2: Extend the existing `Site` interface

In the `Site` interface, add these optional fields at the end (before the closing `}`):

```typescript
  // BNG identification
  bgsReference?: string;
  nationalCharacterArea?: string;
  lnrsArea?: string;
  lsoa?: string;
  imdDecile?: number;
  enhancementStartDate?: string;
  metricVersion?: string;
  hmmpStatus?: "draft" | "submitted" | "approved";

  // Nutrient-specific
  baselineLoading?: number;
  proposedLoading?: number;
  mitigationType?: string;

  // Habitat data (BNG sites only)
  habitatSummary?: HabitatCategorySummary[];
  baselineHabitats?: HabitatParcel[];
  improvementHabitats?: HabitatParcel[];
  siteAllocations?: SiteAllocation[];
```

### Step 3: Extend the existing `Assessment` interface

In the `Assessment` interface, add at the end:

```typescript
  metricOutput?: AssessmentMetricOutput;
  nutrientOutput?: AssessmentNutrientOutput;
```

### Step 4: Verify TypeScript compiles

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new types. (Existing errors about missing properties are OK at this stage — they will be resolved as we add data.)

### Step 5: Commit

```bash
git add src/app/admin/brokerage-mockups/_mock-data/types.ts
git commit -m "feat(mockups): add BNG habitat parcel types and extend Site/Assessment interfaces"
```

---

## Task 2: Enrich `sites.ts` — Fareham Woodland BNG (S-0008)

**Files:**
- Modify: `src/app/admin/brokerage-mockups/_mock-data/sites.ts`

### Step 1: Replace the S-0008 entry

Find the S-0008 site object (starts with `ref: "S-0008"`) and replace the entire object with:

```typescript
  {
    ref: "S-0008",
    name: "Fareham Woodland",
    status: "Under Assessment",
    contact: "C-008",
    contactName: "Ian Stockbridge",
    catchment: "Solent",
    unitType: "BNG",
    total: 206.0,
    totalLabel: "206.0 area HUs",
    allocated: 0,
    allocatedLabel: "0 units",
    available: 206.0,
    availableLabel: "206.0 area HUs",
    price: 25000,
    priceLabel: "£25,000/unit",
    lpa: "Fareham",
    lat: 50.8450,
    lng: -1.2100,
    address: "Fareham Woodland, Cams Hill, Fareham PO16 8AB",
    areaHectares: 18,
    currentUse: "Conifer plantation with modified understorey",
    soilType: "Clay with flints",
    legalAgreement: "Conservation Covenant",
    bgsReference: "BGS-040326001",
    nationalCharacterArea: "South Hampshire Coast",
    lnrsArea: "Hampshire and the Isle of Wight",
    lsoa: "Fareham 014A",
    imdDecile: 6,
    enhancementStartDate: "2026-06-01",
    metricVersion: "Statutory Metric 1.0",
    hmmpStatus: "draft",
    habitatSummary: [
      {
        category: "area",
        categoryLabel: "Areas",
        baselineParcelCount: 8,
        improvementParcelCount: 8,
        baselineSize: 18.0,
        improvementSize: 18.0,
        retainedSize: 0.0,
        sizeUnit: "ha",
        baselineUnits: 59.0,
        improvementUnits: 206.0,
        unitGain: 147.0,
        allocatedUnits: 0.0,
        allocatedPercent: 0.0,
      },
      {
        category: "hedgerow",
        categoryLabel: "Hedgerows",
        baselineParcelCount: 1,
        improvementParcelCount: 2,
        baselineSize: 0.6,
        improvementSize: 1.2,
        retainedSize: 0.6,
        sizeUnit: "km",
        baselineUnits: 1.2,
        improvementUnits: 13.5,
        unitGain: 12.3,
        allocatedUnits: 0.0,
        allocatedPercent: 0.0,
      },
    ],
    baselineHabitats: [
      {
        id: "BP-001",
        phase: "baseline",
        category: "area",
        broadHabitatType: "Woodland",
        specificHabitatType: "Woodland and Forest; Conifer Plantation",
        distinctiveness: "low",
        distinctivenessScore: 2,
        condition: "poor",
        conditionScore: 1.0,
        strategicSignificance: "low",
        significanceMultiplier: 1.0,
        parcelCount: 3,
        size: 11.0,
        sizeUnit: "ha",
        biodiversityUnits: 33.0,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: 0.0,
        temporalRisk: null,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "BP-002",
        phase: "baseline",
        category: "area",
        broadHabitatType: "Scrub",
        specificHabitatType: "Scrub",
        distinctiveness: "medium",
        distinctivenessScore: 4,
        condition: "poor",
        conditionScore: 1.0,
        strategicSignificance: "low",
        significanceMultiplier: 1.0,
        parcelCount: 2,
        size: 4.5,
        sizeUnit: "ha",
        biodiversityUnits: 18.0,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: 0.0,
        temporalRisk: null,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "BP-003",
        phase: "baseline",
        category: "area",
        broadHabitatType: "Scrub",
        specificHabitatType: "Bramble Scrub",
        distinctiveness: "medium",
        distinctivenessScore: 4,
        condition: "poor",
        conditionScore: 1.0,
        strategicSignificance: "low",
        significanceMultiplier: 1.0,
        parcelCount: 1,
        size: 1.5,
        sizeUnit: "ha",
        biodiversityUnits: 6.0,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: 0.0,
        temporalRisk: null,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "BP-004",
        phase: "baseline",
        category: "area",
        broadHabitatType: "Grassland",
        specificHabitatType: "Modified Grassland",
        distinctiveness: "low",
        distinctivenessScore: 2,
        condition: "poor",
        conditionScore: 1.0,
        strategicSignificance: "low",
        significanceMultiplier: 1.0,
        parcelCount: 2,
        size: 1.0,
        sizeUnit: "ha",
        biodiversityUnits: 2.0,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: 0.0,
        temporalRisk: null,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "BP-005",
        phase: "baseline",
        category: "hedgerow",
        broadHabitatType: "Hedgerow",
        specificHabitatType: "Hedgerow; No Associated Trees",
        distinctiveness: "low",
        distinctivenessScore: 2,
        condition: "poor",
        conditionScore: 1.0,
        strategicSignificance: "low",
        significanceMultiplier: 1.0,
        parcelCount: 1,
        size: 0.6,
        sizeUnit: "km",
        biodiversityUnits: 1.2,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: 0.6,
        temporalRisk: null,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
    ],
    improvementHabitats: [
      {
        id: "IP-001",
        phase: "improvement",
        category: "area",
        broadHabitatType: "Woodland",
        specificHabitatType: "Lowland Mixed Deciduous Woodland",
        distinctiveness: "v_high",
        distinctivenessScore: 8,
        condition: "moderate",
        conditionScore: 2.0,
        strategicSignificance: "medium",
        significanceMultiplier: 1.1,
        parcelCount: 3,
        size: 11.0,
        sizeUnit: "ha",
        biodiversityUnits: 145.2,
        unitGain: 112.2,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: null,
        temporalRisk: 0.75,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "IP-002",
        phase: "improvement",
        category: "area",
        broadHabitatType: "Woodland",
        specificHabitatType: "Woodland Edge",
        distinctiveness: "medium",
        distinctivenessScore: 4,
        condition: "fairly_good",
        conditionScore: 2.5,
        strategicSignificance: "medium",
        significanceMultiplier: 1.1,
        parcelCount: 2,
        size: 4.5,
        sizeUnit: "ha",
        biodiversityUnits: 42.1,
        unitGain: 24.1,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: null,
        temporalRisk: 0.85,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "IP-003",
        phase: "improvement",
        category: "area",
        broadHabitatType: "Scrub",
        specificHabitatType: "Scrub Mosaic (Mixed Scrub)",
        distinctiveness: "medium",
        distinctivenessScore: 4,
        condition: "moderate",
        conditionScore: 2.0,
        strategicSignificance: "low",
        significanceMultiplier: 1.0,
        parcelCount: 2,
        size: 1.5,
        sizeUnit: "ha",
        biodiversityUnits: 10.8,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: null,
        temporalRisk: 0.90,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "IP-004",
        phase: "improvement",
        category: "area",
        broadHabitatType: "Grassland",
        specificHabitatType: "Species-rich Neutral Grassland",
        distinctiveness: "medium",
        distinctivenessScore: 4,
        condition: "moderate",
        conditionScore: 2.0,
        strategicSignificance: "medium",
        significanceMultiplier: 1.1,
        parcelCount: 1,
        size: 1.0,
        sizeUnit: "ha",
        biodiversityUnits: 7.9,
        unitGain: null,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: null,
        temporalRisk: 0.90,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
      {
        id: "IP-005",
        phase: "improvement",
        category: "hedgerow",
        broadHabitatType: "Hedgerow",
        specificHabitatType: "Hedgerow; Native Species-rich",
        distinctiveness: "high",
        distinctivenessScore: 6,
        condition: "moderate",
        conditionScore: 2.0,
        strategicSignificance: "medium",
        significanceMultiplier: 1.1,
        parcelCount: 2,
        size: 1.2,
        sizeUnit: "km",
        biodiversityUnits: 13.5,
        unitGain: 12.3,
        allocatedSize: 0,
        allocatedPercent: 0,
        allocatedUnits: 0,
        retainedSize: null,
        temporalRisk: 0.85,
        spatialRisk: null,
        difficultyMultiplier: null,
      },
    ],
    siteAllocations: [],
  },
```

### Step 2: Verify TypeScript compiles

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no type errors on sites.ts.

### Step 3: Commit

```bash
git add src/app/admin/brokerage-mockups/_mock-data/sites.ts
git commit -m "feat(mockups): add full BNG habitat parcel data to Fareham Woodland (S-0008)"
```

---

## Task 3: Enrich `sites.ts` — Nutrient sites (S-0001 through S-0006)

**Files:**
- Modify: `src/app/admin/brokerage-mockups/_mock-data/sites.ts`

### Step 1: Add loading data + geography to each nutrient site

For each of the 5 nutrient sites, add the following fields at the end of the object (before the closing `},`). The values are pre-calculated to be consistent with each site's existing `total` credit figure.

**S-0001 (Whiteley Farm, 60 ha, Arable, 95 kg/yr):**
```typescript
    baselineLoading: 340,
    proposedLoading: 245,
    mitigationType: "Land Use Change: Arable → Permanent Grassland + Riparian Buffer Strips",
    nationalCharacterArea: "South Hampshire Coast",
    lnrsArea: "Hampshire and the Isle of Wight",
    lsoa: "Fareham 012B",
    imdDecile: 5,
```

**S-0002 (Botley Meadows, 85 ha, Pasture/dairy, 120 kg/yr):**
```typescript
    baselineLoading: 425,
    proposedLoading: 305,
    mitigationType: "Land Use Change: Dairy Pasture → Extensive Grassland + Wetland Margins",
    nationalCharacterArea: "South Hampshire Coast",
    lnrsArea: "Hampshire and the Isle of Wight",
    lsoa: "Eastleigh 008A",
    imdDecile: 4,
```

**S-0003 (Hamble Valley, 45 ha, Mixed grazing, 80 kg/yr):**
```typescript
    baselineLoading: 180,
    proposedLoading: 100,
    mitigationType: "Management Change: Mixed Grazing → Hay Meadow, Reduced Stocking Density",
    nationalCharacterArea: "South Hampshire Coast",
    lnrsArea: "Hampshire and the Isle of Wight",
    lsoa: "Eastleigh 011C",
    imdDecile: 5,
```

**S-0005 (Manor Fields, 55 ha, Arable, 95 kg/yr):**
```typescript
    baselineLoading: 330,
    proposedLoading: 235,
    mitigationType: "Land Use Change: Arable → Species-rich Chalk Grassland",
    nationalCharacterArea: "Hampshire Downs",
    lnrsArea: "Hampshire and the Isle of Wight",
    lsoa: "Fareham 018D",
    imdDecile: 7,
```

**S-0006 (Test Valley Grassland, 110 ha, Pasture/dairy, 165 kg/yr):**
```typescript
    baselineLoading: 550,
    proposedLoading: 385,
    mitigationType: "Management Change: Intensive Dairy → Extensive Grazing + Chalk Stream Buffers",
    nationalCharacterArea: "Hampshire Downs",
    lnrsArea: "Hampshire and the Isle of Wight",
    lsoa: "Test Valley 006A",
    imdDecile: 8,
```

### Step 2: Verify TypeScript compiles

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

### Step 3: Commit

```bash
git add src/app/admin/brokerage-mockups/_mock-data/sites.ts
git commit -m "feat(mockups): add nutrient loading calculations and geography to all nutrient sites"
```

---

## Task 4: Enrich `assessments.ts` — metric and nutrient outputs

**Files:**
- Modify: `src/app/admin/brokerage-mockups/_mock-data/assessments.ts`

### Step 1: Add import for new types

At the top of `assessments.ts`, update the import to include the new types:

```typescript
import type { Assessment, AssessmentMetricOutput, AssessmentNutrientOutput } from "./types";
```

### Step 2: Add `metricOutput` to ASM-006 (Fareham Woodland BNG)

Find ASM-006 and add after `reportDocId: "DOC-010"`:

```typescript
    metricOutput: {
      metricVersion: "Statutory Metric 1.0",
      calculationDate: "2026-02-05",
      baselineParcels: [
        {
          id: "BP-001", phase: "baseline", category: "area",
          broadHabitatType: "Woodland", specificHabitatType: "Woodland and Forest; Conifer Plantation",
          distinctiveness: "low", distinctivenessScore: 2, condition: "poor", conditionScore: 1.0,
          strategicSignificance: "low", significanceMultiplier: 1.0,
          parcelCount: 3, size: 11.0, sizeUnit: "ha", biodiversityUnits: 33.0,
          unitGain: null, allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: 0.0, temporalRisk: null, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "BP-002", phase: "baseline", category: "area",
          broadHabitatType: "Scrub", specificHabitatType: "Scrub",
          distinctiveness: "medium", distinctivenessScore: 4, condition: "poor", conditionScore: 1.0,
          strategicSignificance: "low", significanceMultiplier: 1.0,
          parcelCount: 2, size: 4.5, sizeUnit: "ha", biodiversityUnits: 18.0,
          unitGain: null, allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: 0.0, temporalRisk: null, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "BP-003", phase: "baseline", category: "area",
          broadHabitatType: "Scrub", specificHabitatType: "Bramble Scrub",
          distinctiveness: "medium", distinctivenessScore: 4, condition: "poor", conditionScore: 1.0,
          strategicSignificance: "low", significanceMultiplier: 1.0,
          parcelCount: 1, size: 1.5, sizeUnit: "ha", biodiversityUnits: 6.0,
          unitGain: null, allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: 0.0, temporalRisk: null, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "BP-004", phase: "baseline", category: "area",
          broadHabitatType: "Grassland", specificHabitatType: "Modified Grassland",
          distinctiveness: "low", distinctivenessScore: 2, condition: "poor", conditionScore: 1.0,
          strategicSignificance: "low", significanceMultiplier: 1.0,
          parcelCount: 2, size: 1.0, sizeUnit: "ha", biodiversityUnits: 2.0,
          unitGain: null, allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: 0.0, temporalRisk: null, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "BP-005", phase: "baseline", category: "hedgerow",
          broadHabitatType: "Hedgerow", specificHabitatType: "Hedgerow; No Associated Trees",
          distinctiveness: "low", distinctivenessScore: 2, condition: "poor", conditionScore: 1.0,
          strategicSignificance: "low", significanceMultiplier: 1.0,
          parcelCount: 1, size: 0.6, sizeUnit: "km", biodiversityUnits: 1.2,
          unitGain: null, allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: 0.6, temporalRisk: null, spatialRisk: null, difficultyMultiplier: null,
        },
      ],
      improvementParcels: [
        {
          id: "IP-001", phase: "improvement", category: "area",
          broadHabitatType: "Woodland", specificHabitatType: "Lowland Mixed Deciduous Woodland",
          distinctiveness: "v_high", distinctivenessScore: 8, condition: "moderate", conditionScore: 2.0,
          strategicSignificance: "medium", significanceMultiplier: 1.1,
          parcelCount: 3, size: 11.0, sizeUnit: "ha", biodiversityUnits: 145.2, unitGain: 112.2,
          allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: null, temporalRisk: 0.75, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "IP-002", phase: "improvement", category: "area",
          broadHabitatType: "Woodland", specificHabitatType: "Woodland Edge",
          distinctiveness: "medium", distinctivenessScore: 4, condition: "fairly_good", conditionScore: 2.5,
          strategicSignificance: "medium", significanceMultiplier: 1.1,
          parcelCount: 2, size: 4.5, sizeUnit: "ha", biodiversityUnits: 42.1, unitGain: 24.1,
          allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: null, temporalRisk: 0.85, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "IP-003", phase: "improvement", category: "area",
          broadHabitatType: "Scrub", specificHabitatType: "Scrub Mosaic (Mixed Scrub)",
          distinctiveness: "medium", distinctivenessScore: 4, condition: "moderate", conditionScore: 2.0,
          strategicSignificance: "low", significanceMultiplier: 1.0,
          parcelCount: 2, size: 1.5, sizeUnit: "ha", biodiversityUnits: 10.8, unitGain: null,
          allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: null, temporalRisk: 0.90, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "IP-004", phase: "improvement", category: "area",
          broadHabitatType: "Grassland", specificHabitatType: "Species-rich Neutral Grassland",
          distinctiveness: "medium", distinctivenessScore: 4, condition: "moderate", conditionScore: 2.0,
          strategicSignificance: "medium", significanceMultiplier: 1.1,
          parcelCount: 1, size: 1.0, sizeUnit: "ha", biodiversityUnits: 7.9, unitGain: null,
          allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: null, temporalRisk: 0.90, spatialRisk: null, difficultyMultiplier: null,
        },
        {
          id: "IP-005", phase: "improvement", category: "hedgerow",
          broadHabitatType: "Hedgerow", specificHabitatType: "Hedgerow; Native Species-rich",
          distinctiveness: "high", distinctivenessScore: 6, condition: "moderate", conditionScore: 2.0,
          strategicSignificance: "medium", significanceMultiplier: 1.1,
          parcelCount: 2, size: 1.2, sizeUnit: "km", biodiversityUnits: 13.5, unitGain: 12.3,
          allocatedSize: 0, allocatedPercent: 0, allocatedUnits: 0,
          retainedSize: null, temporalRisk: 0.85, spatialRisk: null, difficultyMultiplier: null,
        },
      ],
      totalBaselineHUs: 59.0,
      totalImprovementHUs: 206.0,
      totalHUGain: 147.0,
      hedgerowBaselineHUs: 1.2,
      hedgerowImprovementHUs: 13.5,
      hedgerowHUGain: 12.3,
    } satisfies AssessmentMetricOutput,
```

### Step 3: Add `nutrientOutput` to NN assessments (ASM-001 through ASM-005)

Add after the existing `reportDocId` or `conditionScore` field on each assessment:

**ASM-001 (Whiteley Farm, 95 kg/yr):**
```typescript
    nutrientOutput: {
      baselineLoadingKgYr: 340,
      proposedLoadingKgYr: 245,
      creditYieldKgYr: 95,
      loadingFactorBaseline: 5.67,
      loadingFactorProposed: 4.08,
      landUseChange: "Arable → Permanent Grassland + Riparian Buffer Strips",
    },
```

**ASM-002 (Botley Meadows, 120 kg/yr):**
```typescript
    nutrientOutput: {
      baselineLoadingKgYr: 425,
      proposedLoadingKgYr: 305,
      creditYieldKgYr: 120,
      loadingFactorBaseline: 5.0,
      loadingFactorProposed: 3.59,
      landUseChange: "Dairy Pasture → Extensive Grassland + Wetland Margins",
    },
```

**ASM-003 (Hamble Valley, 80 kg/yr):**
```typescript
    nutrientOutput: {
      baselineLoadingKgYr: 180,
      proposedLoadingKgYr: 100,
      creditYieldKgYr: 80,
      loadingFactorBaseline: 4.0,
      loadingFactorProposed: 2.22,
      landUseChange: "Mixed Grazing → Hay Meadow, Reduced Stocking Density",
    },
```

**ASM-004 (Manor Fields, 95 kg/yr):**
```typescript
    nutrientOutput: {
      baselineLoadingKgYr: 330,
      proposedLoadingKgYr: 235,
      creditYieldKgYr: 95,
      loadingFactorBaseline: 6.0,
      loadingFactorProposed: 4.27,
      landUseChange: "Arable → Species-rich Chalk Grassland",
    },
```

**ASM-005 (Test Valley, 165 kg/yr):**
```typescript
    nutrientOutput: {
      baselineLoadingKgYr: 550,
      proposedLoadingKgYr: 385,
      creditYieldKgYr: 165,
      loadingFactorBaseline: 5.0,
      loadingFactorProposed: 3.5,
      landUseChange: "Intensive Dairy → Extensive Grazing + Chalk Stream Buffers",
    },
```

### Step 4: Verify TypeScript compiles

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

### Step 5: Commit

```bash
git add src/app/admin/brokerage-mockups/_mock-data/assessments.ts
git commit -m "feat(mockups): add structured metric and nutrient outputs to all assessments"
```

---

## Task 5: BNG site detail page — habitat tabs + enriched sidebar

**Files:**
- Modify: `src/app/admin/brokerage-mockups/sites/[id]/page.tsx`

### Step 1: Read the file

Read the full file to understand the current structure before editing. Key things to note:
- `SITES_DATA` record at the top with inline `SiteData` interface — has entries for S-0005 and S-0001
- Module-level `let` variables set from `SITES_DATA` before render
- `sharedSites` is already imported from `../../_mock-data`
- The page already uses `Tabs` from shadcn/ui

### Step 2: Add new Lucide icon imports

In the existing lucide-react import block, add `TreeDeciduous, Sprout, Globe, Building2` to the list.

### Step 3: Add `Progress` import

After the existing `import { Tabs, TabsContent, TabsList, TabsTrigger }` line, add:

```typescript
import { Progress } from "@/components/ui/progress"
```

### Step 4: Add BNG helper constants

After the `complianceBorderColor` record and before the `activityIcon` function, add:

```typescript
// ── BNG helpers ──────────────────────────────────────────────────────────────

const DISTINCTIVENESS_LABELS: Record<string, string> = {
  v_low: "V.Low", low: "Low", medium: "Medium", high: "High", v_high: "V.High",
}

const DISTINCTIVENESS_COLORS: Record<string, string> = {
  v_low: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
  v_high: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300",
}

const CONDITION_LABELS: Record<string, string> = {
  poor: "Poor", fairly_poor: "Fairly Poor", moderate: "Moderate",
  fairly_good: "Fairly Good", good: "Good",
}

const CATEGORY_LABELS: Record<string, string> = {
  area: "Areas", hedgerow: "Hedgerows", watercourse: "Watercourses", individual_tree: "Ind. Trees",
}
```

### Step 5: Add the BNGSiteContent component

After the `activityIcon` function and before the `PageHeader` component, insert this entire component:

```typescript
// ── BNG Site Content (habitat tabs + enriched sidebar) ───────────────────────

function BNGSiteContent({ sharedSite }: { sharedSite: NonNullable<ReturnType<typeof sharedSites.find>> }) {
  const [activeTab, setActiveTab] = useState("summary")
  const [baselineFilter, setBaselineFilter] = useState<string>("all")
  const [enhancementFilter, setEnhancementFilter] = useState<string>("all")

  const habitatSummary = sharedSite.habitatSummary ?? []
  const baselineHabitats = sharedSite.baselineHabitats ?? []
  const improvementHabitats = sharedSite.improvementHabitats ?? []

  const filteredBaseline = baselineFilter === "all"
    ? baselineHabitats
    : baselineHabitats.filter(h => h.category === baselineFilter)

  const filteredImprovement = enhancementFilter === "all"
    ? improvementHabitats
    : improvementHabitats.filter(h => h.category === enhancementFilter)

  const totalBaselineHUs = habitatSummary.reduce((s, r) => s + r.baselineUnits, 0)
  const totalImprovementHUs = habitatSummary.reduce((s, r) => s + r.improvementUnits, 0)
  const totalHUGain = habitatSummary.reduce((s, r) => s + r.unitGain, 0)
  const totalAllocatedHUs = habitatSummary.reduce((s, r) => s + r.allocatedUnits, 0)

  return (
    <div className="mt-6 space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Net HU Gain</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">+{totalHUGain.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">area HUs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Improvement HUs</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalImprovementHUs.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">total capacity</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Allocated</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalAllocatedHUs.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">area HUs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(totalImprovementHUs - totalAllocatedHUs).toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">area HUs</p>
        </div>
      </div>

      {/* Main tabs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Habitat Summary</TabsTrigger>
              <TabsTrigger value="baseline">Baseline</TabsTrigger>
              <TabsTrigger value="enhancement">Enhancement</TabsTrigger>
              <TabsTrigger value="allocations">Allocations</TabsTrigger>
            </TabsList>

            {/* ── Habitat Summary tab ─────────────────────────────────── */}
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Habitat Category Summary</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Mirrors Natural England Biodiversity Gain Site Register format
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Parcels</TableHead>
                          <TableHead className="text-right">Baseline</TableHead>
                          <TableHead className="text-right">Baseline HUs</TableHead>
                          <TableHead className="text-right">Improvement</TableHead>
                          <TableHead className="text-right">Improve HUs</TableHead>
                          <TableHead className="text-right">HU Gain</TableHead>
                          <TableHead className="text-right">Alloc'd HUs</TableHead>
                          <TableHead className="text-right">% Alloc</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {["area", "hedgerow", "watercourse", "individual_tree"].map(cat => {
                          const row = habitatSummary.find(r => r.category === cat)
                          if (!row) {
                            return (
                              <TableRow key={cat} className="text-muted-foreground">
                                <TableCell className="font-medium">{CATEGORY_LABELS[cat]}</TableCell>
                                <TableCell className="text-right">0</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">—</TableCell>
                              </TableRow>
                            )
                          }
                          const parcelCount = row.baselineParcelCount + row.improvementParcelCount
                          return (
                            <TableRow key={cat}>
                              <TableCell className="font-medium text-foreground">{row.categoryLabel}</TableCell>
                              <TableCell className="text-right">{parcelCount}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {row.baselineSize} {row.sizeUnit}
                              </TableCell>
                              <TableCell className="text-right">{row.baselineUnits.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {row.improvementSize} {row.sizeUnit}
                              </TableCell>
                              <TableCell className="text-right">{row.improvementUnits.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  +{row.unitGain.toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{row.allocatedUnits.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress value={row.allocatedPercent} className="h-1.5 w-16" />
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {row.allocatedPercent.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      <tfoot>
                        <tr className="border-t border-border font-semibold bg-muted/30">
                          <td className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {habitatSummary.reduce((s, r) => s + r.baselineParcelCount + r.improvementParcelCount, 0)}
                          </td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-sm text-right">{totalBaselineHUs.toFixed(2)}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-sm text-right">{totalImprovementHUs.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400 font-semibold">
                            +{totalHUGain.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{totalAllocatedHUs.toFixed(2)}</td>
                          <td className="px-4 py-2" />
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Baseline tab ────────────────────────────────────────── */}
            <TabsContent value="baseline">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Baseline Habitats</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {baselineHabitats.length} parcels surveyed · {baselineHabitats.reduce((s, p) => s + p.size, 0).toFixed(1)} ha + {baselineHabitats.filter(p => p.category === "hedgerow").reduce((s, p) => s + p.size, 0).toFixed(1)} km hedgerow
                      </p>
                    </div>
                    <select
                      value={baselineFilter}
                      onChange={e => setBaselineFilter(e.target.value)}
                      className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
                    >
                      <option value="all">All Categories</option>
                      <option value="area">Areas</option>
                      <option value="hedgerow">Hedgerows</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Habitat Type</TableHead>
                        <TableHead>Broad Type</TableHead>
                        <TableHead>Distinctiveness</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Parcels</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="text-right">HUs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBaseline.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground text-sm">
                            {p.specificHabitatType}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.broadHabitatType}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${DISTINCTIVENESS_COLORS[p.distinctiveness]}`}>
                              {DISTINCTIVENESS_LABELS[p.distinctiveness]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">
                            {CONDITION_LABELS[p.condition]}
                          </TableCell>
                          <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                          <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right">
                          {filteredBaseline.reduce((s, p) => s + p.parcelCount, 0)}
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                          {filteredBaseline.reduce((s, p) => s + p.biodiversityUnits, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Enhancement tab ─────────────────────────────────────── */}
            <TabsContent value="enhancement">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Enhancement Habitats</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Target habitat types after management · temporal risk multipliers applied
                      </p>
                    </div>
                    <select
                      value={enhancementFilter}
                      onChange={e => setEnhancementFilter(e.target.value)}
                      className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
                    >
                      <option value="all">All Categories</option>
                      <option value="area">Areas</option>
                      <option value="hedgerow">Hedgerows</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Habitat Type</TableHead>
                        <TableHead>Distinctiveness</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Parcels</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="text-right">HUs</TableHead>
                        <TableHead className="text-right">HU Gain</TableHead>
                        <TableHead className="text-right">% Alloc</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredImprovement.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground text-sm">
                            <div>{p.specificHabitatType}</div>
                            {p.temporalRisk !== null && (
                              <div className="text-xs text-muted-foreground">
                                Temporal risk ×{p.temporalRisk}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${DISTINCTIVENESS_COLORS[p.distinctiveness]}`}>
                              {DISTINCTIVENESS_LABELS[p.distinctiveness]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {CONDITION_LABELS[p.condition]}
                          </TableCell>
                          <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                          <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {p.unitGain !== null ? (
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                +{p.unitGain.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Progress value={p.allocatedPercent} className="h-1.5 w-12" />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {p.allocatedPercent.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-foreground">TOTAL</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right">
                          {filteredImprovement.reduce((s, p) => s + p.parcelCount, 0)}
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                          {filteredImprovement.reduce((s, p) => s + p.biodiversityUnits, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-right text-green-600 dark:text-green-400">
                          +{totalHUGain.toFixed(2)}
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    </tfoot>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Allocations tab ──────────────────────────────────────── */}
            <TabsContent value="allocations">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allocations</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    No allocations yet — site is Under Assessment
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-3">
                      <Leaf className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No allocations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allocations will appear here once the site is registered and matched to developments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* BNG right sidebar */}
        <div className="space-y-4">
          {/* Registration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">BGS Reference</p>
                <p className="font-mono font-medium text-foreground">{sharedSite.bgsReference ?? "Pending"}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Legal Agreement</p>
                  <p className="font-medium text-foreground">{sharedSite.legalAgreement ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commitment</p>
                  <p className="font-medium text-foreground">{sharedSite.commitmentYears ?? 30} years</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enhancement Start</p>
                <p className="font-medium text-foreground">{sharedSite.enhancementStartDate ?? "TBD"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Geography */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Geography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">National Character Area</p>
                <p className="font-medium text-foreground">{sharedSite.nationalCharacterArea ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LNRS Area</p>
                <p className="font-medium text-foreground">{sharedSite.lnrsArea ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">LPA</p>
                  <p className="font-medium text-foreground">{sharedSite.lpa}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IMD Decile</p>
                  <p className="font-medium text-foreground">{sharedSite.imdDecile ?? "—"} / 10</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LSOA</p>
                <p className="font-medium text-foreground">{sharedSite.lsoa ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Metric */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sprout className="h-4 w-4 text-muted-foreground" />
                Biodiversity Metric
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Metric Version</p>
                <p className="font-medium text-foreground">{sharedSite.metricVersion ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">HMMP Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  sharedSite.hmmpStatus === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : sharedSite.hmmpStatus === "submitted"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                }`}>
                  {sharedSite.hmmpStatus ?? "not started"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

### Step 6: Wire up BNGSiteContent in the page component

Find the `export default function SiteDetail()` component. Near the top of the component body (after `useParams` and `useState`), look up the shared site:

Find where the component resolves the site ID and add:

```typescript
  const sharedSite = sharedSites.find(s => s.ref === siteId) ?? null
  const isBNG = sharedSite?.unitType === "BNG"
```

Then find where the V1 layout renders the main content (the capacity chart section and allocations table). After the existing content but before the right sidebar, conditionally insert the BNG content:

```typescript
{isBNG && sharedSite && <BNGSiteContent sharedSite={sharedSite} />}
```

Also add the BNG sidebar cards conditionally when rendering the right sidebar: wrap the existing capacity chart with `{!isBNG && (/* existing capacity/baseline section */)}`.

### Step 7: Verify TypeScript compiles and page renders

```bash
npx tsc --noEmit 2>&1 | head -30
```

Then start dev server and navigate to `/admin/brokerage-mockups/sites/S-0008`. Verify:
- [ ] Stat cards show: Net HU Gain +147.0, Improvement HUs 206.0, Allocated 0, Available 206.0
- [ ] Habitat Summary tab shows the register-format table with Areas and Hedgerows rows
- [ ] Baseline tab shows 5 rows (4 area + 1 hedgerow)
- [ ] Enhancement tab shows 5 rows with temporal risk multipliers
- [ ] Right sidebar shows BGS reference, NCA, LNRS, LSOA, HMMP status
- [ ] Other sites (S-0001, S-0005) still render their existing layout without BNG sections

### Step 8: Commit

```bash
git add src/app/admin/brokerage-mockups/sites/[id]/page.tsx
git commit -m "feat(mockups): add BNG habitat tabs and enriched sidebar to site detail page"
```

---

## Task 6: Nutrient site detail page — Nutrient Budget section

**Files:**
- Modify: `src/app/admin/brokerage-mockups/sites/[id]/page.tsx`

### Step 1: Add the NutrientBudgetCard component

After the `BNGSiteContent` component (added in Task 5) and before `PageHeader`, insert:

```typescript
// ── Nutrient Budget Card ─────────────────────────────────────────────────────

function NutrientBudgetCard({ sharedSite }: { sharedSite: NonNullable<ReturnType<typeof sharedSites.find>> }) {
  if (!sharedSite.baselineLoading || !sharedSite.proposedLoading) return null
  const creditYield = sharedSite.baselineLoading - sharedSite.proposedLoading
  const reductionPct = Math.round((creditYield / sharedSite.baselineLoading) * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-500" />
          Nutrient Budget
        </CardTitle>
        {sharedSite.mitigationType && (
          <p className="text-sm text-muted-foreground">{sharedSite.mitigationType}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 font-mono text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Baseline loading</span>
            <span className="font-semibold text-foreground">{sharedSite.baselineLoading.toLocaleString()} kg N/yr</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="pl-2">({(sharedSite.baselineLoading / sharedSite.areaHectares).toFixed(2)} kg N/ha/yr × {sharedSite.areaHectares} ha)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Proposed loading</span>
            <span className="font-semibold text-foreground">− {sharedSite.proposedLoading.toLocaleString()} kg N/yr</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="pl-2">({(sharedSite.proposedLoading / sharedSite.areaHectares).toFixed(2)} kg N/ha/yr × {sharedSite.areaHectares} ha)</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Credit yield</span>
            <span className="font-bold text-green-600 dark:text-green-400">{creditYield.toLocaleString()} kg N/yr</span>
          </div>
        </div>
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30 text-center">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            {reductionPct}% reduction in nitrogen loading to watercourse
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            {creditYield.toLocaleString()} kg/yr available · {sharedSite.legalAgreement ?? "S106"} · {sharedSite.commitmentYears ?? 80}-year commitment
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 2: Add a Geography card component for nutrient sites

After `NutrientBudgetCard`, add:

```typescript
function GeographyCard({ sharedSite }: { sharedSite: NonNullable<ReturnType<typeof sharedSites.find>> }) {
  if (!sharedSite.nationalCharacterArea && !sharedSite.lnrsArea) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Geography
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {sharedSite.nationalCharacterArea && (
          <div>
            <p className="text-xs text-muted-foreground">National Character Area</p>
            <p className="font-medium text-foreground">{sharedSite.nationalCharacterArea}</p>
          </div>
        )}
        {sharedSite.lnrsArea && (
          <div>
            <p className="text-xs text-muted-foreground">LNRS Area</p>
            <p className="font-medium text-foreground">{sharedSite.lnrsArea}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Catchment</p>
            <p className="font-medium text-foreground">{sharedSite.catchment}</p>
          </div>
          {sharedSite.lsoa && (
            <div>
              <p className="text-xs text-muted-foreground">LSOA</p>
              <p className="font-medium text-foreground">{sharedSite.lsoa}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 3: Insert NutrientBudgetCard and GeographyCard into the page

In the `SiteDetail` component, after the `sharedSite` and `isBNG` lookups from Task 5, find where the V1 layout's left column renders the assessment card or baseline section.

For nutrient sites (`!isBNG && sharedSite`), add after the assessment section and before the allocations table:

```typescript
{!isBNG && sharedSite && <NutrientBudgetCard sharedSite={sharedSite} />}
```

In the right sidebar (for both V1 and V2), add the geography card:

```typescript
{sharedSite && <GeographyCard sharedSite={sharedSite} />}
```

### Step 4: Add `Globe` to the lucide imports

If not already added in Task 5, ensure `Globe` is in the lucide-react import list.

### Step 5: Verify

```bash
npx tsc --noEmit 2>&1 | head -30
```

Navigate to `/admin/brokerage-mockups/sites/S-0001`. Verify:
- [ ] Nutrient Budget card appears with 340 / 245 / 95 kg N/yr breakdown
- [ ] Land use change description shown
- [ ] 28% reduction percentage calculated correctly
- [ ] Geography card shows NCA "South Hampshire Coast", LNRS "Hampshire and the Isle of Wight"

Navigate to S-0006 (Test Valley). Verify:
- [ ] Shows 550 / 385 / 165 kg N/yr
- [ ] NCA "Hampshire Downs"

### Step 6: Commit

```bash
git add src/app/admin/brokerage-mockups/sites/[id]/page.tsx
git commit -m "feat(mockups): add nutrient budget section and geography cards to nutrient site detail"
```

---

## Task 7: Assessment detail page — replace hardcoded data + add BNG metric results

**Files:**
- Modify: `src/app/admin/brokerage-mockups/assessments/[id]/page.tsx`

### Step 1: Replace hardcoded HABITAT_DATA with live data

Find and delete this entire constant at the top of the file:

```typescript
const HABITAT_DATA = [
  { type: "Arable (cereal)", area: "35.0 ha", condition: 2.1, distinctiveness: "Low" },
  { type: "Improved grassland", area: "18.0 ha", condition: 3.5, distinctiveness: "Low" },
  { type: "Riparian buffer (proposed)", area: "4.5 ha", condition: "N/A", distinctiveness: "Medium" },
  { type: "Hedgerow network", area: "2.5 ha", condition: 4.0, distinctiveness: "Medium" },
]
```

In the Survey Data card, find the `HABITAT_DATA.map(...)` section. Replace the entire `<Table>` block with:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Habitat Type</TableHead>
      <TableHead>Area</TableHead>
      <TableHead>Condition</TableHead>
      <TableHead>Distinctiveness</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {(assessment.metricOutput?.baselineParcels ?? assessment.nutrientOutput ? [
      { type: assessment.nutrientOutput?.landUseChange.split("→")[0]?.trim() ?? "Current land use", area: `${site?.areaHectares ?? "?"} ha`, condition: "—", distinctiveness: "—" },
    ] : [
      { type: assessment.habitatTypes?.[0] ?? "Survey data not available", area: `${site?.areaHectares ?? "?"} ha`, condition: "—", distinctiveness: "—" },
    ]).map((h, i) => (
      <TableRow key={i}>
        <TableCell className="font-medium text-foreground">{h.type}</TableCell>
        <TableCell className="text-muted-foreground">{h.area}</TableCell>
        <TableCell className="text-muted-foreground">{h.condition}</TableCell>
        <TableCell className="text-muted-foreground">{h.distinctiveness}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Step 2: Fix hardcoded NN metric numbers

Find the `Metric Calculation Results` card (condition: `assessment.type === "NN Baseline"`). The card currently shows hardcoded `2,538 kg/yr` and `510 kg/yr`. Replace those hardcoded values with live data:

```tsx
{assessment.type === "NN Baseline" && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Metric Calculation Results</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">Baseline Loading</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {assessment.nutrientOutput?.baselineLoadingKgYr.toLocaleString() ?? "—"} kg/yr
          </p>
          <p className="text-xs text-muted-foreground">
            {assessment.nutrientOutput
              ? `${assessment.nutrientOutput.loadingFactorBaseline} kg/ha × ${site?.areaHectares ?? "?"} ha`
              : "current land use"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">Proposed Loading</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {assessment.nutrientOutput?.proposedLoadingKgYr.toLocaleString() ?? "—"} kg/yr
          </p>
          <p className="text-xs text-muted-foreground">
            {assessment.nutrientOutput
              ? `${assessment.nutrientOutput.loadingFactorProposed} kg/ha × ${site?.areaHectares ?? "?"} ha`
              : "after mitigation"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">Credit Yield</p>
          <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
            {assessment.nutrientOutput?.creditYieldKgYr ?? assessment.creditYield ?? "—"} kg/yr
          </p>
          <p className="text-xs text-muted-foreground">nitrogen credits</p>
        </div>
      </div>
      {assessment.nutrientOutput && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Land use change: </span>
          {assessment.nutrientOutput.landUseChange}
        </div>
      )}
      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
        <p className="text-sm text-green-800 dark:text-green-300">
          This site can generate{" "}
          <span className="font-bold">
            {assessment.nutrientOutput?.creditYieldKgYr ?? assessment.creditYield ?? "—"} kg/year nitrogen credits
          </span>
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### Step 3: Add BNG Metric Results panel

After the NN metric card block, add the BNG metric results block:

```tsx
{assessment.type === "BNG Habitat Survey" && assessment.metricOutput && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Biodiversity Metric Results</CardTitle>
      <p className="text-xs text-muted-foreground">
        {assessment.metricOutput.metricVersion} · Calculated {assessment.metricOutput.calculationDate}
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      <Tabs defaultValue="baseline">
        <TabsList className="mb-3">
          <TabsTrigger value="baseline">Baseline Survey</TabsTrigger>
          <TabsTrigger value="proposed">Proposed Enhancement</TabsTrigger>
        </TabsList>

        <TabsContent value="baseline">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Habitat Type</TableHead>
                <TableHead>Distinctiveness</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Parcels</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">HUs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessment.metricOutput.baselineParcels.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium text-foreground">{p.specificHabitatType}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
                      p.distinctiveness === "v_high" ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300"
                      : p.distinctiveness === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : p.distinctiveness === "medium" ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}>
                      {p.distinctiveness === "v_low" ? "V.Low" : p.distinctiveness === "v_high" ? "V.High" : p.distinctiveness.charAt(0).toUpperCase() + p.distinctiveness.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {p.condition.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                  <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={5} className="px-4 py-2 text-sm font-semibold">TOTAL</td>
                <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                  {assessment.metricOutput.totalBaselineHUs.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </Table>
        </TabsContent>

        <TabsContent value="proposed">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Habitat Type</TableHead>
                <TableHead>Distinctiveness</TableHead>
                <TableHead className="text-right">Parcels</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">HUs</TableHead>
                <TableHead className="text-right">HU Gain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessment.metricOutput.improvementParcels.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium text-foreground">
                    <div>{p.specificHabitatType}</div>
                    {p.temporalRisk && (
                      <div className="text-xs text-muted-foreground">Temporal risk ×{p.temporalRisk}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
                      p.distinctiveness === "v_high" ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300"
                      : p.distinctiveness === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : p.distinctiveness === "medium" ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}>
                      {p.distinctiveness === "v_low" ? "V.Low" : p.distinctiveness === "v_high" ? "V.High" : p.distinctiveness.charAt(0).toUpperCase() + p.distinctiveness.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{p.parcelCount}</TableCell>
                  <TableCell className="text-right text-sm">{p.size} {p.sizeUnit}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{p.biodiversityUnits.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm">
                    {p.unitGain !== null ? (
                      <span className="font-semibold text-green-600 dark:text-green-400">+{p.unitGain.toFixed(2)}</span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={4} className="px-4 py-2 text-sm font-semibold">TOTAL</td>
                <td className="px-4 py-2 text-sm font-semibold text-right font-mono">
                  {assessment.metricOutput.totalImprovementHUs.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-sm font-semibold text-right text-green-600 dark:text-green-400">
                  +{assessment.metricOutput.totalHUGain.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Result banner */}
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 text-center dark:border-green-800 dark:bg-green-950/30">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          Net biodiversity gain available to register
        </p>
        <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">
          +{assessment.metricOutput.totalHUGain.toFixed(1)} area HUs
          <span className="text-base font-medium ml-2">
            · +{assessment.metricOutput.hedgerowHUGain.toFixed(1)} hedgerow HUs
          </span>
        </p>
        <p className="mt-1 text-xs text-green-700 dark:text-green-400">
          {assessment.metricOutput.metricVersion} · {assessment.assessorName} · {assessment.metricOutput.calculationDate}
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### Step 4: Add Tabs import to assessment page

The assessment page doesn't currently import Tabs. Add:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```

### Step 5: Verify

```bash
npx tsc --noEmit 2>&1 | head -30
```

Navigate to `/admin/brokerage-mockups/assessments/ASM-001`. Verify:
- [ ] Metric Calculation Results shows 340 / 245 / 95 kg N/yr (not the old hardcoded 2,538 / 510)
- [ ] Land use change description shown

Navigate to `/admin/brokerage-mockups/assessments/ASM-006`. Verify:
- [ ] "Biodiversity Metric Results" card appears
- [ ] Baseline tab shows 5 rows (4 area + 1 hedgerow), total 59.0 HUs + 1.2 HUs
- [ ] Proposed tab shows 5 rows with temporal risk notes
- [ ] Result banner shows "+147.0 area HUs · +12.3 hedgerow HUs"

### Step 6: Commit

```bash
git add src/app/admin/brokerage-mockups/assessments/[id]/page.tsx
git commit -m "feat(mockups): add BNG metric results panel and fix NN hardcoded numbers on assessment detail"
```

---

## Final verification

After all tasks complete:

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors in the mockup files.

Quick smoke test — navigate to each of these URLs and confirm no console errors:
- `/admin/brokerage-mockups/sites/S-0008` — BNG habitat tabs
- `/admin/brokerage-mockups/sites/S-0001` — Nutrient budget card
- `/admin/brokerage-mockups/sites/S-0005` — Existing layout still works
- `/admin/brokerage-mockups/assessments/ASM-001` — Live NN metric numbers
- `/admin/brokerage-mockups/assessments/ASM-006` — BNG metric results + result banner
