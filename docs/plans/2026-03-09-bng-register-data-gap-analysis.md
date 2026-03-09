# BNG Register Data Gap Analysis

**Date:** 2026-03-09
**Purpose:** Compare the Natural England Biodiversity Gain Site Register data structure against the Ironheart brokerage mockup data model to identify gaps and inform product decisions.

---

## Section 1: Real BNG Register Data Structure

Data sourced from the [Natural England Biodiversity Gain Sites Register](https://environment.data.gov.uk/biodiversity-net-gain), the [Environment Act 2021 Section 100](https://www.legislation.gov.uk/ukpga/2021/30/section/100), the [Statutory Biodiversity Metric tools](https://www.gov.uk/government/publications/statutory-biodiversity-metric-tools-and-guides), and the [Bristol Trees BGS viewer](https://bgs.bristoltrees.space/sites) which provides a structured view of the public register data.

### 1.1 Site-Level Fields (per gain site entry)

| Field | Example (BGS-040825002) | Notes |
|---|---|---|
| **BGS Reference** | BGS-040825002 | Unique identifier assigned by Natural England |
| **Site Name** | North Yorkshire Habitat Bank | Free text |
| **Responsible Body** | North Yorkshire LPA | Organisation managing the site |
| **Site Area (ha)** | 26.70 | Total hectares |
| **Enhancement Start Date** | 01/11/2024 | When habitat works began |
| **Location (lat/lng)** | 54.49758, -1.18257 | Centroid coordinates |
| **National Character Area (NCA)** | Tees Lowlands | NCA classification (159 NCAs in England) |
| **Local Planning Authority (LPA)** | North Yorkshire LPA | Administrative boundary |
| **Local Nature Recovery Strategy (LNRS)** | North Yorkshire and York | LNRS area |
| **LSOA** | Hambleton 002D | Lower Layer Super Output Area |
| **IMD Decile** | (1-10) | Index of Multiple Deprivation |
| **Allocation Count** | 12 | Number of allocations to developments |
| **Median Allocation Distance** | 31 km | How far away allocated developments are |

### 1.2 Habitat Summary (aggregate per site)

The register presents habitat data in a **summary table** with three distinct habitat categories, each tracked independently:

| Category | Columns Tracked |
|---|---|
| **Areas** | # Parcels, Baseline Size (ha), Baseline HUs, Retained Size, Improvement Size, Improvement HUs, HU Gain, Allocated Size, % Allocated, Allocated HUs |
| **Hedgerows** | # Parcels, Baseline Size (km), Baseline HUs, Retained Size, Improvement Size, Improvement HUs, HU Gain, Allocated Size, % Allocated, Allocated HUs |
| **Watercourses** | # Parcels, Baseline Size (km), Baseline HUs, Retained Size, Improvement Size, Improvement HUs, HU Gain, Allocated Size, % Allocated, Allocated HUs |
| **Individual Trees** | # Parcels, Baseline Count (trees), Baseline HUs, Retained Count, Improvement Count, Improvement HUs, HU Gain, Allocated Count, % Allocated, Allocated HUs |

**Example data from BGS-040825002:**
- Areas: 23 parcels, 26.49 ha baseline, 61.62 baseline HUs, 207.20 improvement HUs, 145.58 HU gain
- Hedgerows: 11 parcels, 2.24 km baseline, 18.58 baseline HUs, 6.81 improvement HUs, 3.55 HU gain
- Individual Trees: 1 parcel, 5 trees baseline, 0.24 baseline HUs, 170 improvement trees, 2.13 improvement HUs

### 1.3 Baseline Habitat Parcels (per habitat type)

Each site lists every **baseline** habitat parcel with:

| Column | Example |
|---|---|
| **Habitat Type** | Cereal Crops, Modified Grassland, Bare Ground, Other Neutral Grassland, etc. |
| **Distinctiveness** | V.Low, Low, Medium, High, V.High |
| **Number of Parcels** | 12 |
| **Size (ha or km)** | 22.03 |
| **Biodiversity Units (HUs)** | 44.06 |

**Example baseline habitats from BGS-040825002:**

| Habitat Type | Distinctiveness | Parcels | Size (ha) | HUs |
|---|---|---|---|---|
| Bare Ground | Low | 2 | 0.14 | 0.28 |
| Bramble Scrub | Medium | 1 | 0.02 | 0.08 |
| Cereal Crops | Low | 12 | 22.03 | 44.06 |
| Modified Grassland | Low | 2 | 3.60 | 14.40 |
| Other Neutral Grassland | Medium | 4 | 0.59 | 2.36 |
| Tall Forbs | Low | 2 | 0.11 | 0.44 |

### 1.4 Improvement Habitat Parcels (target habitats)

Each site lists every **improvement/target** habitat with:

| Column | Example |
|---|---|
| **Habitat Type** | Mixed Scrub, Other Neutral Grassland, Other Woodland; Broadleaved, etc. |
| **Distinctiveness** | Medium, High, V.High |
| **Number of Parcels** | 5 |
| **Size (ha)** | 21.50 |
| **% Allocated** | 22.35% |
| **Biodiversity Units (HUs)** | 173.92 |
| **HU Gain** | 126.94 |

**Example improvement habitats from BGS-040825002:**

| Habitat Type | Distinctiveness | Parcels | Size (ha) | % Allocated | HUs | HU Gain |
|---|---|---|---|---|---|---|
| Mixed Scrub | Medium | 1 | 2.66 | 22.35% | 17.03 | - |
| Other Neutral Grassland | Medium | 5 | 21.50 | - | 173.92 | 126.94 |
| Other Woodland; Broadleaved | Medium | 1 | 2.33 | - | 10.92 | 1.60 |

### 1.5 Larger Site Example (BGS-121224001 — Wendling Beck, 537 ha)

This site demonstrates the scale and complexity of real data:
- **114 area parcels** across **14 baseline habitat types** and **15 improvement habitat types**
- **37 hedgerow parcels** (7.49 km baseline, 11.64 km improvement)
- **4 watercourse parcels** (1.80 km baseline, 2.07 km improvement)
- **524 individual trees** (improvement only)
- **19 allocations** to developments
- **809.20 area HU gain**, 82.62 hedgerow HU gain, 7.23 watercourse HU gain

Habitat types included: Arable Field Margins, Fens, Floodplain Wetland Mosaic, Lowland Heathland, Lowland Dry Acid Grassland, Lowland Meadows, Lowland Mixed Deciduous Woodland, Mixed Scrub, Open Mosaic Habitats, Other Neutral Grassland, Other Woodland, Ponds (Priority and Non-priority), Reedbeds, Traditional Orchards.

### 1.6 Statutory Biodiversity Metric — Calculation Inputs

The biodiversity metric tool (which feeds the register) uses these inputs per habitat parcel:

| Input | Description |
|---|---|
| **Broad Habitat Type** | Top-level classification (e.g., Grassland, Woodland, Wetland) |
| **Specific Habitat Type** | Detailed type (e.g., "Lowland Meadows", "Other Neutral Grassland") |
| **Area (ha) / Length (km)** | Physical size of the parcel |
| **Distinctiveness** | V.Low (0), Low (2), Medium (4), High (6), V.High (8) — fixed per habitat type |
| **Condition** | Poor (1), Fairly Poor (1.5), Moderate (2), Fairly Good (2.5), Good (3) |
| **Strategic Significance** | Low (1.0), Medium (1.1), High (1.15) — based on local nature recovery strategy alignment |
| **Connectivity** | Multiplier based on spatial relationship to other habitats |
| **Temporal Risk** | Multiplier for time delay in habitat creation |
| **Spatial Risk** | Multiplier for delivery risk (off-site vs on-site) |
| **Difficulty of Creation** | Multiplier reflecting habitat creation complexity |

**Formula:** `Biodiversity Units = Area x Distinctiveness x Condition x Strategic Significance x (further risk multipliers for post-development)`

### 1.7 Registration Requirements (what must be submitted)

Per [GOV.UK guidance](https://www.gov.uk/guidance/register-a-biodiversity-gain-site):

1. **Title deeds or lease** — proof of ownership
2. **Written authorisation** — if applying on behalf of landowner
3. **Land boundary document/image** — must not include personal information
4. **Legal agreement** — S106 or Conservation Covenant, securing land for minimum 30 years
5. **Completed statutory biodiversity metric** — calculations covering all secured land
6. **Habitat Management and Monitoring Plan (HMMP)** — can be incorporated into legal agreement
7. **Local land charge search certificate**
8. **Registration fee** — currently £639

### 1.8 Allocation Data (linking gain sites to developments)

Each allocation connects a gain site to a development, recording:
- Which habitat parcels are allocated
- Size/area allocated
- HUs allocated
- The development/planning reference it's allocated to
- Distance between gain site and development

---

## Section 2: Current Mockup Data Structure

### 2.1 Site Type (`types.ts`)

```typescript
interface Site {
  ref: string;              // "S-0001"
  name: string;
  status: SiteStatus;       // Active | Registered | Under Assessment | Legal In Progress | Prospecting | Fully Allocated
  contact: string;          // Contact.id
  contactName: string;
  catchment: Catchment;     // Solent | Test Valley | Stour | Exe | Tees
  unitType: UnitType;       // Nitrogen | Phosphorus | BNG
  total: number;            // single aggregate number
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
```

### 2.2 Site Detail Page Data (`sites/[id]/page.tsx`)

The detail page uses a richer inline interface:

```typescript
interface SiteData {
  ref: string;
  name: string;
  status: string;
  address: string;
  lat: number; lng: number;
  catchment: string;
  lpa: string;
  region: string;
  owner: { name, role, company, phone, email, initials };
  registration: { ref, date, agreement, commitment, expires, cost };
  baseline: { landUse, area, soil, currentLoading, proposedLoading, mitigation };
  allocations: { ref, deal, buyer, quantity, unitPrice, total, status, date }[];
  documents: { name, type, size, uploaded, by }[];
  linkedDeals: { ref, title, stage, contact, value }[];
  activities: { icon, time, user, text }[];
  capacityData: { name, value, color }[];  // for pie chart
  capacityTotal: number;
  capacityAllocated: number;
  capacityAvailable: number;
  complianceItems: { title, due, status }[];
  assessment: { date, assessor, initials, type };
}
```

### 2.3 Related Types

- **Assessment**: `id, siteRef, siteName, assessorId, assessorName, type, date, status, findings?, creditYield?, creditYieldLabel?, habitatTypes?, conditionScore?, reportDocId?`
- **Document**: `id, name, type, linkedEntityType, linkedEntityId, linkedEntityLabel, uploadedBy, uploadedDate, status, fileSize, signatories?, versions?`
- **Compliance**: `id, title, category, siteRef?, siteName?, dealRef?, dealTitle?, dueDate, status, assigned, assignedInitials, frequency, completedDate?, description?`

### 2.4 Mock Site Data (6 sites)

All sites use a **single flat number** for units (e.g., `total: 95`, `allocated: 50`, `available: 45`). Most are Nitrogen type; one is BNG. There is **no habitat breakdown** at all — just an aggregate number and a `unitType` flag.

---

## Section 3: Gap Analysis — What's Missing

### 3.1 CRITICAL GAPS — Habitat Data Model

| Gap | Register Reality | Current Mockup |
|---|---|---|
| **Multiple habitat types per site** | A single site has 6-15+ distinct habitat types, each with their own area, condition, distinctiveness, and biodiversity units | Single `unitType` field per site — no habitat breakdown at all |
| **Baseline vs improvement habitats** | Two separate datasets: what the land was BEFORE and what it WILL BE after enhancement | Single `currentUse` string (e.g., "Arable") |
| **Habitat parcels** | Each habitat type may have multiple parcels (e.g., 12 parcels of Cereal Crops across 22 ha) | No parcel concept |
| **Biodiversity units per habitat** | Each habitat type has calculated HUs based on area x distinctiveness x condition x significance | Single aggregate `total` number |
| **HU gain calculation** | Improvement HUs minus baseline HUs = gain, tracked per habitat type | No gain calculation |
| **Three unit categories** | Area units (ha), hedgerow units (km), watercourse units (km) — tracked and traded separately | Single `unitType` enum (Nitrogen/Phosphorus/BNG) conflates nutrient credits with BNG units |
| **Individual trees** | Tracked separately with tree count rather than area | Not modelled |
| **Retained vs improved** | Some baseline habitat is retained, some is improved — tracked separately | Not modelled |
| **Distinctiveness scores** | V.Low/Low/Medium/High/V.High — fixed per habitat type, directly affects unit calculation | Not modelled |
| **Condition assessment** | Poor to Good (5 bands) — directly affects unit calculation | Single `conditionScore` on Assessment type (not on Site) |
| **Strategic significance** | Low/Medium/High — multiplier based on LNRS alignment | Not modelled |

### 3.2 SIGNIFICANT GAPS — Site Identification & Geography

| Gap | Register Reality | Current Mockup |
|---|---|---|
| **BGS reference number** | Natural England-issued BGS-XXXXXXXX format | Custom `registrationRef` in different format (e.g., "NN-SOL-2025-0012") |
| **National Character Area (NCA)** | Standardised NCA classification (159 in England) | Not modelled |
| **LNRS area** | Local Nature Recovery Strategy area | Not modelled |
| **LSOA** | Lower Layer Super Output Area for deprivation analysis | Not modelled |
| **IMD Decile** | Index of Multiple Deprivation — relevant for environmental justice | Not modelled |
| **Enhancement start date** | When habitat works actually began | Not modelled |
| **Responsible body** | Organisation managing the site (may differ from landowner) | Only `contact/contactName` |

### 3.3 SIGNIFICANT GAPS — Allocation Structure

| Gap | Register Reality | Current Mockup |
|---|---|---|
| **Allocation by habitat type** | Allocations are tied to specific habitat parcels, not just aggregate units | Allocations are flat: `quantity: "45 kg N/yr"` |
| **Allocation distance** | Median distance between gain site and allocated development | Not tracked |
| **% allocated per habitat** | Each improvement habitat shows what percentage has been allocated | Not modelled |
| **Allocated HUs** | Specific HU count allocated per habitat category (area/hedgerow/watercourse) | Not modelled |
| **Development planning reference** | Allocations reference the planning application they serve | Not modelled — allocations reference `deal` instead |

### 3.4 SIGNIFICANT GAPS — Legal & Registration

| Gap | Register Reality | Current Mockup |
|---|---|---|
| **30-year minimum** | Statutory requirement — all gain sites secured for at least 30 years | `commitmentYears: 80` exists but 80 is wrong for BNG (that's nutrient neutrality) |
| **Legal agreement type** | S106 agreement or Conservation Covenant — different legal instruments | `legalAgreement: "S106"` exists but no detail |
| **HMMP** | Habitat Management and Monitoring Plan — a major document | Document types include "HMMP" but no structured HMMP data |
| **Land charge search** | Local land charge search certificate required | Not modelled |
| **Registration fee** | £639 fee, payable within 28 days | Not tracked |
| **Registration decision timeline** | 6-week processing period | No workflow/status tracking for registration |

### 3.5 MODERATE GAPS — Metric & Assessment

| Gap | Register Reality | Current Mockup |
|---|---|---|
| **Statutory biodiversity metric output** | Full metric spreadsheet with all parcel-level calculations | Assessment has `creditYield` and `habitatTypes` but no metric structure |
| **Condition assessment per habitat** | Standardised condition criteria per habitat type | Single `conditionScore` number on Assessment |
| **Temporal/spatial risk multipliers** | Applied to post-development calculations | Not modelled |
| **Difficulty of creation multiplier** | Varies by habitat type | Not modelled |

### 3.6 CONCEPTUAL GAPS — Nutrient Credits vs BNG Units

The current mockup conflates two completely different market systems:

| Aspect | Nutrient Credits (NN/NP) | BNG Units |
|---|---|---|
| **What's measured** | kg of nitrogen or phosphorus removed per year | Biodiversity value (habitat area x quality factors) |
| **Unit of trade** | kg/yr of nutrient | Biodiversity units (area, hedgerow, or watercourse) |
| **Commitment period** | 80-125 years (perpetuity in practice) | Minimum 30 years |
| **Register** | No national register (catchment-specific schemes) | National register (Natural England) |
| **Calculation method** | Nutrient budget calculator (nitrogen/phosphorus loading) | Statutory biodiversity metric (habitat-based) |
| **Habitat data needed** | Minimal — focus is on nutrient loading reduction | Extensive — full habitat parcel breakdown required |
| **Legal mechanism** | S106, Conservation Covenant, or planning condition | S106 or Conservation Covenant only |

The mockup treats these as variants of the same `unitType` enum. In reality, a single site could provide BOTH nutrient credits AND BNG units simultaneously — these are separate environmental markets operating on the same land.

---

## Section 4: Recommended Data Model Changes

### 4.1 New Types/Interfaces Needed

#### HabitatParcel — the core missing type

```typescript
type HabitatCategory = "area" | "hedgerow" | "watercourse" | "individual_tree";
type Distinctiveness = "v_low" | "low" | "medium" | "high" | "v_high";
type HabitatCondition = "poor" | "fairly_poor" | "moderate" | "fairly_good" | "good" | "n/a";
type StrategicSignificance = "low" | "medium" | "high";
type ParcelPhase = "baseline" | "improvement";

interface HabitatParcel {
  id: string;
  siteRef: string;
  phase: ParcelPhase;                    // baseline or improvement
  category: HabitatCategory;            // area, hedgerow, watercourse, individual_tree
  broadHabitatType: string;             // e.g., "Grassland", "Woodland"
  specificHabitatType: string;          // e.g., "Other Neutral Grassland", "Lowland Meadows"
  distinctiveness: Distinctiveness;
  condition: HabitatCondition;
  strategicSignificance: StrategicSignificance;
  parcelCount: number;                   // number of physical parcels of this type
  size: number;                          // hectares for area, km for linear, count for trees
  sizeUnit: "ha" | "km" | "trees";
  biodiversityUnits: number;            // calculated HUs
  huGain?: number;                       // improvement HUs minus baseline HUs (improvement phase only)
  allocatedSize?: number;               // how much has been allocated
  allocatedPercent?: number;
  allocatedHUs?: number;
  retainedSize?: number;                // how much baseline is retained (baseline phase only)
}
```

#### HabitatSummary — aggregate per category

```typescript
interface HabitatSummary {
  category: HabitatCategory;
  parcelCount: number;
  baselineSize: number;
  baselineHUs: number;
  retainedSize: number;
  improvementSize: number;
  improvementHUs: number;
  huGain: number;
  allocatedSize: number;
  allocatedPercent: number;
  allocatedHUs: number;
}
```

#### Updated Site interface

```typescript
interface BNGSite {
  // -- Identification --
  ref: string;                          // internal reference
  bgsReference?: string;                // Natural England BGS-XXXXXXXX
  name: string;
  status: SiteStatus;

  // -- Geography --
  address: string;
  lat: number;
  lng: number;
  areaHectares: number;
  lpa: string;
  nationalCharacterArea?: string;       // NCA classification
  lnrsArea?: string;                    // Local Nature Recovery Strategy area
  lsoa?: string;                        // Lower Layer Super Output Area
  imdDecile?: number;                   // Index of Multiple Deprivation (1-10)

  // -- Ownership --
  landowner: {
    contactId: string;
    name: string;
    company?: string;
  };
  responsibleBody?: {                   // may differ from landowner
    name: string;
    type: string;
  };

  // -- Legal --
  legalAgreementType?: "s106" | "conservation_covenant";
  legalAgreementDate?: string;
  commitmentYears: number;              // minimum 30 for BNG
  commitmentEndDate?: string;

  // -- Registration --
  registrationStatus: "not_started" | "application_submitted" | "under_review" | "registered" | "rejected";
  registrationRef?: string;
  registrationDate?: string;
  registrationFee?: number;
  enhancementStartDate?: string;

  // -- Habitat Data (the key addition) --
  habitatSummary: HabitatSummary[];     // one per category (area, hedgerow, watercourse, tree)
  baselineHabitats: HabitatParcel[];    // all baseline parcels
  improvementHabitats: HabitatParcel[]; // all improvement/target parcels

  // -- Totals --
  totalBaselineHUs: number;
  totalImprovementHUs: number;
  totalHUGain: number;
  totalAllocatedHUs: number;
  totalAvailableHUs: number;

  // -- Allocation tracking --
  allocationCount: number;
  medianAllocationDistanceKm?: number;

  // -- HMMP --
  hmmpDocumentId?: string;
  hmmpStatus?: "draft" | "submitted" | "approved";

  // -- Metric --
  metricVersion?: string;               // e.g., "Statutory Metric 1.0"
  metricCalculationId?: string;         // reference to uploaded metric spreadsheet
}
```

#### NutrientSite — separate from BNG

```typescript
interface NutrientSite {
  ref: string;
  name: string;
  status: SiteStatus;
  address: string;
  lat: number;
  lng: number;
  areaHectares: number;
  catchment: string;                    // e.g., "Solent"
  lpa: string;
  nutrientType: "nitrogen" | "phosphorus";

  // -- Nutrient-specific fields --
  baselineLoading: number;              // kg/yr before mitigation
  proposedLoading: number;              // kg/yr after mitigation
  totalCredits: number;                 // kg/yr available (difference)
  allocatedCredits: number;
  availableCredits: number;
  mitigationType: string;               // e.g., "Land Use Change", "Wetland Creation"

  // -- Land data --
  currentUse: string;
  soilType: string;

  // -- Legal --
  legalAgreementType?: string;
  commitmentYears?: number;             // typically 80-125 for nutrients

  // -- Registration (catchment-specific, not Natural England) --
  registrationRef?: string;
  registrationDate?: string;

  // -- Pricing --
  pricePerUnit: number;
  priceLabel: string;
}
```

### 4.2 Changes to Sites Mock Data

The current `sites.ts` array of 6 flat objects needs to be split into two collections and massively enriched:

1. **Separate BNG sites from nutrient sites** — they are fundamentally different products
2. **Add habitat parcel arrays to BNG sites** — each BNG site needs 5-15+ habitat parcels for baseline and 3-10+ for improvement
3. **Add habitat summary rows** — aggregate data per category (area/hedgerow/watercourse/tree)
4. **Add NCA, LNRS, LSOA data** — geographic classifications
5. **Add real habitat type names** — from the statutory metric's habitat classification (e.g., "Other Neutral Grassland", "Mixed Scrub", "Lowland Meadows")
6. **Add distinctiveness and condition data** — per parcel
7. **Add proper BGS reference format** — BGS-XXXXXXXX

### 4.3 New UI Sections Needed on Site Detail Page

The current site detail page needs these additional sections for BNG sites:

1. **Habitat Summary Table** — the 3-4 row summary (area/hedgerow/watercourse/tree) showing baseline vs improvement vs allocated, mirroring the register's format
2. **Baseline Habitats Tab** — table of all baseline habitat parcels with type, distinctiveness, parcels, size, HUs
3. **Improvement Habitats Tab** — table of all improvement habitat parcels with type, distinctiveness, parcels, size, % allocated, HUs, HU gain
4. **Metric Calculation Section** — link to uploaded metric spreadsheet, version info, calculation date
5. **HMMP Section** — habitat management and monitoring plan status, document link, approval status
6. **Geographic Classification Card** — NCA, LNRS, LSOA, IMD data
7. **Registration Timeline** — showing the registration workflow (submitted > under review > registered)
8. **Allocation Map/Distance** — showing where allocated developments are relative to the gain site

The nutrient site detail page would be different, focusing on nutrient loading calculations rather than habitat parcels.

### 4.4 Habitat Data Structure Recommendation

Habitat data should be structured as **nested arrays of habitat parcels**, each with full metric inputs:

```
Site
  └── habitatSummary[]           (3-4 rows: area, hedgerow, watercourse, tree)
  └── baselineHabitats[]         (5-15 parcels, each with type/distinctiveness/condition/size/HUs)
  └── improvementHabitats[]      (3-15 parcels, each with type/distinctiveness/condition/size/HUs/gain)
  └── allocations[]
        └── allocatedParcels[]   (which specific habitat parcels are allocated)
```

This mirrors how the real register works: a site is a collection of habitat parcels that transition from baseline to improvement states, with biodiversity units calculated per parcel and then aggregated.

---

## Section 5: What This Means for the Real Schema

When mockups become real database tables, the following schema would be needed:

### 5.1 Core Tables

```
gain_sites
  id                        UUID PK
  tenant_id                 UUID FK → organizations
  internal_ref              TEXT       -- e.g., "S-0001"
  bgs_reference             TEXT       -- BGS-XXXXXXXX (nullable until registered)
  name                      TEXT
  site_type                 TEXT       -- "bng" | "nutrient_nitrogen" | "nutrient_phosphorus"
  status                    TEXT
  address                   TEXT
  lat                       DECIMAL
  lng                       DECIMAL
  area_hectares             DECIMAL
  lpa                       TEXT
  national_character_area   TEXT       -- NCA (BNG only)
  lnrs_area                 TEXT       -- LNRS (BNG only)
  lsoa                      TEXT       -- LSOA
  imd_decile                INTEGER    -- 1-10
  catchment                 TEXT       -- Solent, etc. (nutrient sites)
  current_use               TEXT
  soil_type                 TEXT
  legal_agreement_type      TEXT       -- s106, conservation_covenant
  legal_agreement_date      DATE
  commitment_years          INTEGER
  commitment_end_date       DATE
  registration_status       TEXT
  registration_ref          TEXT
  registration_date         DATE
  registration_fee          DECIMAL
  enhancement_start_date    DATE
  metric_version            TEXT
  hmmp_status               TEXT
  -- nutrient-specific columns --
  baseline_loading          DECIMAL    -- kg/yr (nutrient sites only)
  proposed_loading          DECIMAL
  total_credits             DECIMAL
  mitigation_type           TEXT
  created_at                TIMESTAMPTZ
  updated_at                TIMESTAMPTZ
```

### 5.2 Habitat Parcels Table (BNG-specific)

```
habitat_parcels
  id                        UUID PK
  site_id                   UUID FK → gain_sites
  phase                     TEXT       -- "baseline" | "improvement"
  category                  TEXT       -- "area" | "hedgerow" | "watercourse" | "individual_tree"
  broad_habitat_type        TEXT       -- e.g., "Grassland"
  specific_habitat_type     TEXT       -- e.g., "Other Neutral Grassland"
  distinctiveness           TEXT       -- v_low | low | medium | high | v_high
  distinctiveness_score     DECIMAL    -- 0, 2, 4, 6, 8
  condition                 TEXT       -- poor | fairly_poor | moderate | fairly_good | good
  condition_score           DECIMAL    -- 1, 1.5, 2, 2.5, 3
  strategic_significance    TEXT       -- low | medium | high
  significance_multiplier   DECIMAL    -- 1.0, 1.1, 1.15
  parcel_count              INTEGER
  size                      DECIMAL    -- ha, km, or tree count
  size_unit                 TEXT       -- "ha" | "km" | "trees"
  biodiversity_units        DECIMAL    -- calculated HUs
  hu_gain                   DECIMAL    -- improvement minus baseline (improvement only)
  retained_size             DECIMAL    -- baseline only
  temporal_risk_multiplier  DECIMAL
  spatial_risk_multiplier   DECIMAL
  difficulty_multiplier     DECIMAL
  created_at                TIMESTAMPTZ
  updated_at                TIMESTAMPTZ
```

### 5.3 Allocations Table

```
site_allocations
  id                        UUID PK
  site_id                   UUID FK → gain_sites
  deal_id                   UUID FK → deals (nullable)
  development_ref           TEXT       -- planning application reference
  development_name          TEXT
  allocated_by_user_id      UUID FK → users
  allocation_date           DATE
  status                    TEXT       -- reserved | confirmed | delivered | revoked
  distance_km               DECIMAL    -- distance from gain site to development
  -- per allocation, there may be multiple habitat types allocated --
  created_at                TIMESTAMPTZ
  updated_at                TIMESTAMPTZ

allocation_parcels
  id                        UUID PK
  allocation_id             UUID FK → site_allocations
  habitat_parcel_id         UUID FK → habitat_parcels
  allocated_size            DECIMAL
  allocated_hus             DECIMAL
  created_at                TIMESTAMPTZ
```

### 5.4 Supporting Tables

```
habitat_type_reference
  id                        UUID PK
  category                  TEXT       -- area | hedgerow | watercourse
  broad_type                TEXT       -- e.g., "Grassland"
  specific_type             TEXT       -- e.g., "Other Neutral Grassland"
  distinctiveness           TEXT       -- fixed per type
  distinctiveness_score     DECIMAL
  is_priority_habitat       BOOLEAN
  is_irreplaceable          BOOLEAN
  -- lookup table from the statutory metric --

condition_assessment_criteria
  id                        UUID PK
  habitat_type_id           UUID FK → habitat_type_reference
  criterion_number          INTEGER
  criterion_text            TEXT
  -- standardised condition assessment criteria per habitat type --

site_monitoring_events
  id                        UUID PK
  site_id                   UUID FK → gain_sites
  monitoring_date           DATE
  monitoring_type           TEXT       -- annual, 5-yearly, ad-hoc
  assessor_id               UUID FK
  report_document_id        UUID FK → documents
  findings                  JSONB
  habitat_parcels_assessed  UUID[]     -- which parcels were assessed
  condition_changes         JSONB      -- any condition score changes
  created_at                TIMESTAMPTZ
```

### 5.5 Scale Implications

- A typical BNG site has **10-30 habitat parcels** (baseline) and **5-15 habitat parcels** (improvement)
- A large habitat bank can have **100+ parcels** across both phases
- Each parcel has **~15 data fields** including metric calculation inputs
- Allocations link to specific parcels, not just aggregate site units
- The system needs to handle **three separate unit currencies** (area HUs, hedgerow HUs, watercourse HUs) that cannot be mixed or traded interchangeably
- Monitoring events need to track condition changes at the parcel level over 30+ years

### 5.6 Key Architectural Decisions

1. **Separate BNG from Nutrients** — these are fundamentally different products with different data models, different regulators, different registers, and different calculation methods. The mockup's `unitType` enum is insufficient.

2. **Habitat parcels are first-class entities** — not a JSON blob on the site record. They need their own table because they're individually allocated, monitored, and tracked over decades.

3. **Reference data tables** — habitat types, distinctiveness scores, and condition criteria come from the statutory metric and should be stored as reference data, not hardcoded.

4. **Metric calculation as a document** — the full statutory biodiversity metric spreadsheet should be stored as a document/attachment, with the structured parcel data extracted into the database for querying and allocation.

5. **Allocation granularity** — allocations must work at the parcel level, not the site level. A developer might need 5 area HUs of "Other Neutral Grassland" and 2 hedgerow HUs, from specific parcels on a specific site.

6. **30-year compliance tracking** — the system must track habitat condition changes over 30+ years per parcel. This means monitoring events linked to specific parcels with condition score changes recorded over time.
