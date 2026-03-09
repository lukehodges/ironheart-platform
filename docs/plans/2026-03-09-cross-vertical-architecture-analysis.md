# Cross-Vertical Architecture Analysis

**Date:** 2026-03-09
**Context:** The BNG register gap analysis revealed that real BNG sites contain 10-100+ habitat parcels with complex multi-currency unit calculations. The current mockup data model is flat and insufficient. This document designs an abstraction layer that handles BNG's full complexity while remaining portable across verticals: Nutrients, Carbon, Water Neutrality, Real Estate, Energy, and international equivalents.

**Input documents:**
- `2026-03-09-bng-register-data-gap-analysis.md` — Register data vs mockup comparison
- `2026-03-07-brokerage-platform-blueprint.md` — Platform blueprint with vertical templates
- `2026-03-06-nutrient-bng-brokerage-research.md` — BNG/nutrient business process research

---

## 1. The Core Problem

The gap analysis against Natural England's Biodiversity Gain Site Register exposed a fundamental architectural mismatch. The current mockup treats a site as a flat entity with a single aggregate unit count:

```
Site → total: 95, allocated: 50, available: 45, unitType: "BNG"
```

The real data structure is:

```
Site
  └── 23 area habitat parcels (baseline) → 61.62 HUs across 6 habitat types
  └── 7 area habitat parcels (improvement) → 207.20 HUs across 3 habitat types
  └── 11 hedgerow parcels → 18.58 baseline HUs, 6.81 improvement HUs
  └── 1 individual tree parcel → 0.24 baseline HUs, 2.13 improvement HUs
  └── 12 allocations to developments (each linking to specific parcels)
```

A large site like Wendling Beck (BGS-121224001) has **114 area parcels, 37 hedgerow parcels, 4 watercourse parcels, and 524 individual trees** across dozens of habitat types.

This is not a UI polish problem. It is a data model problem. And crucially, **it cannot be solved by hardcoding BNG's structure**, because other verticals have their own complexity:

- **Nutrient Neutrality** has nitrogen AND phosphorus as separate currencies, catchment-locked geographic constraints, and 80-125 year commitment periods.
- **Carbon Credits** have Woodland Carbon Units and Peatland Carbon Units as separate registries with different verification standards.
- **Real Estate** has entirely different "parcels" (rooms, floors, outbuildings) with different "units" (square footage, bedrooms, listing price).

The platform blueprint's `VerticalTemplate` concept is correct at the configuration level but does not address the **data model layer** — specifically, how to structure the child entities (parcels/items) beneath a site, and how to handle multiple unit currencies, vertical-specific calculations, and parcel-level allocations.

---

## 2. The Vertical Comparison Matrix

### 2.1 Environmental Credits (UK)

| Dimension | BNG (Biodiversity Net Gain) | Nutrient Neutrality | Water Neutrality | Carbon Credits |
|---|---|---|---|---|
| **Site / supply unit** | Gain site (land parcel, 1-500+ ha) | Mitigation site (farmland converting use) | Water offset site (efficiency/supply schemes) | Woodland or peatland restoration site |
| **Unit(s) traded** | 3 currencies: Area HUs, Hedgerow HUs, Watercourse HUs (non-fungible between types) | 2 currencies: kg N/yr, kg P/yr (independent markets) | Water offset credits (litres/day) — single currency | 2 currencies: Woodland Carbon Units (WCU), Peatland Carbon Units (PCU) |
| **Parcels / sub-units** | 10-100+ habitat parcels per site, each with type, distinctiveness, condition, strategic significance, area | Relatively flat — nutrient budget is a site-level calculation, not parcel-level | Flat — offset calculated at scheme level | Flat to moderate — woodland planting areas, but less granular than BNG |
| **Assessment process** | Statutory Biodiversity Metric: per-parcel calculation with 6+ multipliers (distinctiveness, condition, significance, temporal risk, spatial risk, difficulty) | Nutrient Budget Calculator: 5-worksheet model calculating kg/yr loading change | Water balance calculation: consumption vs offset capacity | Woodland Carbon Code / Peatland Code verification: carbon sequestration modelling |
| **Geographic constraints** | National Character Area (NCA) + Local Nature Recovery Strategy (LNRS) — proximity preference, not hard lock | **Catchment-locked** (27 designated catchments) — credits CANNOT cross catchment boundaries | Catchment-locked (currently Sussex/Arun only) | No hard geographic constraint (UK voluntary market) |
| **Regulatory body / registry** | Natural England — national Biodiversity Gain Site Register | No national register — catchment-specific schemes managed by LPAs / Natural England | No formal register yet — emerging | UK Woodland Carbon Registry; Peatland Code Registry |
| **Legal mechanism** | S106 agreement or Conservation Covenant | S106 agreement, Conservation Covenant, or planning condition | Planning condition (emerging) | Woodland Carbon Code agreement |
| **Commitment duration** | Minimum 30 years | 80-125 years (effectively perpetuity) | TBD (likely 25-80 years) | 100 years (Woodland Carbon Code) |
| **Post-sale compliance** | Annual condition monitoring per parcel against HMMP targets; remedial triggers | Annual/periodic reporting to LPA on nutrient loading; remedial if mitigation fails | Monitoring of offset scheme delivery | Periodic verification audits; carbon stock monitoring |
| **Baseline vs improvement** | Yes — full baseline survey + improvement plan, both at parcel level | Yes — current loading vs proposed loading, but at site level | Yes — current consumption vs offset | Yes — baseline carbon stock vs projected sequestration |
| **Allocation granularity** | Per habitat parcel — developer gets X HUs of specific habitat type from specific parcels | Per site — developer gets X kg/yr from a site | Per scheme — developer gets X litres/day from a scheme | Per project — buyer gets X tCO2e from a project |

### 2.2 Environmental Credits (International Equivalents)

| Dimension | US Wetland/Species Mitigation Banking | Australian Biodiversity Offsets | EU Habitat Banking | Global Voluntary Carbon (Verra VCS, Gold Standard) |
|---|---|---|---|---|
| **Site / supply unit** | Mitigation bank (permitted wetland/habitat site) | Offset site (state-specific: Biobanking in NSW, Native Vegetation in VIC) | Habitat bank site (emerging under EU Biodiversity Strategy 2030) | Project site (anywhere globally) |
| **Unit(s) traded** | Mitigation credits — specific to habitat type (wetland, stream, species-specific) | Biodiversity credits (NSW), habitat hectares (VIC), environmental offsets (QLD) — each state different | Habitat units (TBD — likely aligned with EU Green Claims Directive) | Verified Carbon Units (VCUs) for Verra; Verified Emission Reductions (VERs) for Gold Standard |
| **Parcels / sub-units** | Yes — per-habitat-type credits within a bank, similar structure to BNG | Yes — ecological assessments at parcel level, particularly in NSW Biobanking | TBD — likely parcel-based given EU precedent | Moderate — monitoring plots, but credits are more fungible |
| **Assessment process** | US Army Corps of Engineers (USACE) Mitigation Rule assessment; Rapid Assessment methods | BioBanking Assessment Methodology (BBAM) in NSW; Habitat Hectares in VIC; state-specific tools | TBD — likely modelled on member state approaches | Verra VCS Methodology; Gold Standard methodology — project-specific |
| **Geographic constraints** | Service area defined per bank (typically watershed/ecoregion) — hard lock similar to UK nutrients | Bioregion-locked in NSW; CMA-based in VIC | Likely biogeographic region constraints | No hard constraint (global market) but co-benefits may be location-specific |
| **Regulatory body / registry** | US Army Corps of Engineers (USACE); RIBITS (Regulatory In-lieu fee and Bank Information Tracking System) | State environment departments (NSW DPIE, VIC DELWP, QLD DES) | European Environment Agency (emerging) | Verra Registry; Gold Standard Registry; IETA oversight |
| **Legal mechanism** | Conservation easement + banking instrument (USACE permit) | Biobanking agreement (NSW); offset management plan (VIC) | Conservation agreement (TBD) | Project Design Document + validation/verification cycle |
| **Commitment duration** | In perpetuity (conservation easement) | In perpetuity (NSW Biobanking) | TBD — likely 30+ years | 20-100 year crediting periods depending on methodology |
| **Post-sale compliance** | Annual monitoring reports to USACE; 5-year performance standards | Annual monitoring; adaptive management if targets not met | TBD | Periodic verification (every 5 years); buffer pool for permanence risk |

### 2.3 Non-Environmental Verticals

| Dimension | Real Estate | Energy Brokerage |
|---|---|---|
| **Site / supply unit** | Property (house, flat, commercial unit) | Meter point (MPAN for electricity, MPRN for gas) |
| **Unit(s) traded** | 1 unit per property (the property itself) — though multi-unit developments may list N units | 1 contract per meter point — but a client may have N meter points |
| **Parcels / sub-units** | Rooms, floors, outbuildings, gardens — but these are descriptive, not traded independently | Half-hourly consumption data, but this is analytical, not traded |
| **Assessment process** | Property valuation (RICS Red Book); EPC assessment; condition survey | Consumption analysis (12-month half-hourly data); bill validation; cost-per-kWh benchmarking |
| **Geographic constraints** | Region/postcode — soft constraint (buyer preference) | DNO region for electricity; GDN for gas — but switching is national |
| **Regulatory body / registry** | HM Land Registry; EPC Register | Ofgem; Xoserve (gas); ECOES (electricity) |
| **Legal mechanism** | Contract for sale; lease; tenancy agreement | Supply contract; Letter of Authority (LOA) |
| **Commitment duration** | Freehold (permanent) or lease term (years) | Contract term (1-5 years, typically) |
| **Post-sale compliance** | AML checks; deposit protection (lettings); EPC renewal (10 years) | Contract renewal tracking; Ofgem TPI Code compliance |
| **Baseline vs improvement** | Current condition vs post-renovation (for refurb projects) | Current tariff vs new tariff (savings calculation) |
| **Allocation granularity** | 1:1 — property to buyer | 1:1 — meter point to contract |

### 2.4 Cross-Cutting Patterns

The matrix reveals these architectural truths:

1. **Every vertical has a "site" concept** — but what constitutes a site varies wildly in internal structure.
2. **Most environmental verticals have multiple unit currencies** — BNG has 3, Nutrients have 2, Carbon has 2. Non-environmental are typically 1.
3. **Parcel-level granularity is specific to environmental credits** — and primarily to BNG and its international equivalents. Nutrients, carbon, and non-environmental verticals are flatter.
4. **Geographic constraints are universal but configured differently** — catchment-locked vs NCA-preference vs postcode-region vs none.
5. **Baseline/improvement duality is primarily environmental** — real estate has a weaker version (current vs renovated), energy has a trivial version (old tariff vs new tariff).
6. **Compliance duration spans 1 year to perpetuity** — the data model must handle decades of monitoring events.
7. **External registries are universal** — every regulated vertical has an external system of record.

---

## 3. The Abstraction Layer Design

### 3.1 Sites and Parcels

**Question:** Should sites have a generic "parcels" or "inventory items" child table?

**Answer:** Yes — but with a critical distinction. The child table should be called `site_parcels` and should represent **independently trackable, potentially allocatable sub-units** of a site. This is NOT the same as descriptive attributes (like property rooms). The deciding question is: "Can this sub-unit be independently allocated to a buyer?" If yes, it's a parcel. If no, it's metadata on the site.

| Vertical | What is a parcel? | Independently allocatable? |
|---|---|---|
| BNG | Habitat parcel (area/hedgerow/watercourse type) | Yes — allocations link to specific parcels |
| Nutrients | Nutrient zone (if site has multiple mitigation approaches) | Rarely — usually site-level allocation |
| Carbon | Planting area / restoration zone | Sometimes — vintage-based allocation |
| Real Estate | The property itself (site = development, parcel = individual unit) | Yes — for multi-unit developments |
| Energy | Meter point (if site = business with multiple meters) | Yes — each meter gets its own contract |

**Design:** `site_parcels` is optional per vertical. BNG sites will have 10-100+ parcels. Nutrient sites may have 0-3. Real estate may have 0 (single property) or N (development with multiple units). Energy may have N meter points.

**Baseline vs improvement:** This is BNG/environmental-specific. Model it as a `phase` field on the parcel: `baseline` or `improvement`. Non-environmental verticals ignore this field (or use `current` as the only phase). The parcel table holds BOTH phases — the relationship between baseline and improvement parcels is computed, not stored (improvement parcels replace/enhance baseline parcels, but they are different habitat types with different calculations).

### 3.2 Unit Currencies

**Question:** How do you handle multiple unit currencies per site?

**Answer:** Introduce a `site_unit_summaries` table (or computed view) that stores the aggregate unit position per currency per site. The `unit_types` table from the blueprint already handles configurable currency definitions per tenant. What is missing is the **per-site breakdown by currency**.

```
site_unit_summaries
  site_id          → FK to sites
  unit_type_code   → 'BNG_AREA_HU', 'BNG_HEDGEROW_HU', 'BNG_WATERCOURSE_HU', 'KG_NITROGEN', etc.
  total_units      → computed from parcels or entered directly
  allocated_units  → computed from allocations
  available_units  → total - allocated
  baseline_units   → for environmental: units before enhancement
  improvement_units → for environmental: units after enhancement
  net_gain         → improvement - baseline
```

For BNG, this table has 3-4 rows per site (area, hedgerow, watercourse, individual trees). For nutrients, 1-2 rows (nitrogen, phosphorus). For real estate, 1 row. For energy, 1 row per meter point.

**Calculation methods:** The blueprint proposes a `metadata JSONB` field on sites for vertical-specific data. The calculation engine should be a pluggable service — `calculateUnits(site, parcels, verticalConfig) → UnitSummary[]`. For BNG, this runs the statutory biodiversity metric formula. For nutrients, it runs the nutrient budget calculator. For real estate, it is a simple identity function (1 property = 1 unit). The platform does NOT need to implement every calculator — it needs to accept the OUTPUT of external calculators (metric spreadsheets, nutrient calculators) and store structured results.

### 3.3 Allocations

**Question:** BNG allocations link to specific habitat parcels at specific quantities. Real estate allocations are 1:1. How to abstract?

**Answer:** Two-tier allocation model:

```
allocations (deal-level)
  id, site_id, deal_id, unit_type_code, total_units, total_value, status, ...

allocation_parcels (parcel-level, optional)
  id, allocation_id, site_parcel_id, allocated_units, allocated_size, ...
```

For BNG: an allocation has N allocation_parcel rows, each linking to a specific habitat parcel with a specific HU quantity. For real estate: an allocation has 0 or 1 allocation_parcel rows (the property IS the unit). For nutrients: an allocation typically has 0 allocation_parcel rows (site-level allocation).

The `allocation_parcels` table is only populated when the vertical requires parcel-level granularity. The `allocations` table always has the aggregate figures.

### 3.4 Geographic Constraints

**Question:** How to make geographic matching configurable?

**Answer:** The blueprint's `unit_types.hasGeographicConstraint` + `constraintField` approach is correct but needs refinement. Geographic constraints should be modelled as a **constraint rule** per unit type:

| Constraint type | Example | Matching rule |
|---|---|---|
| `HARD_MATCH` | Nutrients: same catchment required | `site.catchmentArea === demand.catchmentArea` |
| `PREFERENCE_RANKED` | BNG: same NCA preferred, same LNRS preferred, but not required | Score-based: same NCA = 1.0, same LNRS = 0.9, same region = 0.7, anywhere = 0.5 |
| `SOFT_FILTER` | Real estate: same region/postcode area | Filter but don't exclude |
| `NONE` | Carbon (voluntary): no geographic constraint | No filtering |

This should be configured per unit type in the vertical template, not hardcoded. The matching engine applies the constraint rule when ranking supply against demand.

**Reference data:** Geographic classifications (NCAs, catchments, LNRSs, postcodes) should be stored as reference data tables, not free text. BNG needs an `nca_areas` reference table (159 rows). Nutrients need a `catchments` reference table (27 rows). Real estate needs postcode sectors. These are seeded per vertical.

### 3.5 Compliance

**Question:** How to template compliance per vertical?

**Answer:** The blueprint's `complianceTemplates` in the vertical config is correct. Extend it with:

1. **Template triggering:** Compliance items should be auto-generated when a site reaches a specific status (e.g., "REGISTERED" triggers 30 years of annual monitoring items for BNG) or when a deal reaches a specific stage (e.g., "COMPLETED" triggers LPA discharge evidence).

2. **Duration-aware generation:** For BNG's 30-year HMMP monitoring, the system should generate the first 5 years of annual compliance items on registration, then generate subsequent years via an annual Inngest cron. Do NOT generate 30 years of items upfront — that creates 30 rows per site immediately and is wasteful.

3. **Parcel-level compliance:** For BNG specifically, monitoring events should reference which parcels were assessed and whether condition scores changed. This is a `compliance_item_parcels` junction table (or a `parcels_assessed UUID[]` array on the compliance item).

4. **Template inheritance:** Compliance templates should be defined at the vertical level (defaults) but overridable at the tenant level (custom schedules). Store as: `vertical default → tenant override → site-specific override`.

### 3.6 Registries

**Question:** How to model external registry integration?

**Answer:** Abstract interface with per-vertical implementations:

```typescript
interface RegistryAdapter {
  slug: string;                              // 'natural-england-bgs', 'woodland-carbon-registry', etc.

  // Read
  lookupSite(registryRef: string): Promise<RegistryEntry | null>;
  lookupAllocation(registryRef: string): Promise<RegistryAllocation | null>;

  // Write (where API exists)
  submitRegistration?(site: SiteRecord): Promise<{ registryRef: string; status: string }>;
  recordAllocation?(allocation: AllocationRecord): Promise<{ registryRef: string }>;

  // Sync
  syncSiteData?(registryRef: string): Promise<Partial<SiteRecord>>;
}
```

For v1, registry integration is **manual** — the broker enters the registry reference number after registering externally. The adapter pattern allows future automation without schema changes. Natural England does not currently have a public API for registration, so the initial implementation is a reference number field + a link to the register for manual lookup.

Store registry references on both `sites` (site-level registration) and `allocations` (allocation-level registry entries).

---

## 4. Proposed Architecture

### 4.1 Core Tables (Shared Across All Verticals)

These tables exist for every tenant regardless of vertical:

```sql
-- ═══════════════════════════════════════════
-- SITES — Physical locations that generate units
-- ═══════════════════════════════════════════
sites (
  id                      UUID PK,
  tenant_id               UUID FK → tenants,
  site_reference          TEXT NOT NULL,              -- auto-generated "S-0001"
  name                    TEXT NOT NULL,
  description             TEXT,
  status                  TEXT NOT NULL,              -- vertical-configured status enum
  status_changed_at       TIMESTAMPTZ,

  -- Owner / contact
  contact_id              UUID FK → customers,        -- supply-side contact (landowner, vendor, etc.)

  -- Location (structured)
  address_line1           TEXT,
  address_line2           TEXT,
  city                    TEXT,
  county                  TEXT,
  postcode                TEXT,
  country                 TEXT DEFAULT 'GB',
  latitude                NUMERIC(10,8),
  longitude               NUMERIC(11,8),
  boundary_geojson        JSONB,                      -- site boundary polygon

  -- Geographic classification (configurable per vertical)
  geographic_area_1       TEXT,                        -- BNG: NCA | Nutrients: catchment | RE: region
  geographic_area_2       TEXT,                        -- BNG: LNRS | Nutrients: sub-catchment | RE: postcode area
  geographic_area_3       TEXT,                        -- BNG: LSOA | Nutrients: null | RE: null
  local_authority         TEXT,                        -- LPA / council

  -- Physical attributes
  total_area              NUMERIC(12,4),               -- hectares, sqft, sqm — unit defined by vertical
  area_unit               TEXT DEFAULT 'ha',           -- 'ha', 'sqft', 'sqm', 'acres'
  current_use             TEXT,                        -- freeform: "Arable", "Office", "Residential"

  -- Legal
  legal_agreement_type    TEXT,                        -- S106, conservation_covenant, lease, contract
  legal_agreement_date    DATE,
  commitment_years        INTEGER,                     -- 30, 80, 125, null (freehold)
  commitment_end_date     DATE,

  -- Registration (external registry)
  registry_reference      TEXT,                        -- BGS-XXXXXXXX, WCR ref, Land Registry title number
  registry_status         TEXT,                        -- not_started, submitted, registered, rejected
  registered_at           TIMESTAMPTZ,
  registration_cost       NUMERIC(10,2),

  -- Vertical-specific structured data
  -- These are fields that are queryable/filterable but only relevant to some verticals
  enhancement_start_date  DATE,                        -- BNG: when habitat works began
  imd_decile              INTEGER,                     -- BNG: Index of Multiple Deprivation (1-10)
  soil_type               TEXT,                        -- Environmental: soil classification
  baseline_loading        NUMERIC(12,4),               -- Nutrients: kg/yr before mitigation
  proposed_loading        NUMERIC(12,4),               -- Nutrients: kg/yr after mitigation
  mitigation_type         TEXT,                        -- Nutrients: land use change, wetland, etc.
  metric_version          TEXT,                        -- BNG: statutory metric version
  hmmp_status             TEXT,                        -- BNG: draft, submitted, approved

  -- Flexible metadata for truly vertical-specific data
  metadata                JSONB DEFAULT '{}',

  -- Audit
  tags                    TEXT[],
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  deleted_at              TIMESTAMPTZ,
  version                 INTEGER DEFAULT 1,

  UNIQUE(tenant_id, site_reference)
);

-- ═══════════════════════════════════════════
-- SITE PARCELS — Sub-units of a site (habitat parcels, property units, meter points)
-- ═══════════════════════════════════════════
site_parcels (
  id                      UUID PK,
  site_id                 UUID FK → sites,
  tenant_id               UUID FK → tenants,

  -- Identity
  parcel_reference        TEXT,                        -- internal ref or habitat type identifier
  parcel_type             TEXT NOT NULL,               -- 'habitat', 'nutrient_zone', 'property_unit', 'meter_point'

  -- Phase (environmental verticals)
  phase                   TEXT DEFAULT 'current',      -- 'baseline', 'improvement', 'current'

  -- Category (BNG-specific: area/hedgerow/watercourse/individual_tree)
  category                TEXT,                        -- BNG: 'area', 'hedgerow', 'watercourse', 'individual_tree'
                                                       -- RE: 'bedroom', 'reception', 'commercial_unit'
                                                       -- Energy: 'electricity', 'gas'

  -- Classification (vertical-specific taxonomy)
  primary_classification  TEXT,                        -- BNG: broad habitat type ("Grassland")
                                                       -- RE: property type ("Detached")
  secondary_classification TEXT,                       -- BNG: specific habitat type ("Other Neutral Grassland")
                                                       -- RE: sub-type ("4-bed detached")

  -- Quality scores (environmental)
  quality_score_1         NUMERIC(5,2),                -- BNG: distinctiveness (0-8)
  quality_score_1_label   TEXT,                        -- BNG: "v_high", "high", "medium", "low", "v_low"
  quality_score_2         NUMERIC(5,2),                -- BNG: condition (1-3)
  quality_score_2_label   TEXT,                        -- BNG: "good", "fairly_good", "moderate", etc.
  quality_score_3         NUMERIC(5,2),                -- BNG: strategic significance (1.0-1.15)
  quality_score_3_label   TEXT,                        -- BNG: "high", "medium", "low"

  -- Size / quantity
  parcel_count            INTEGER DEFAULT 1,           -- BNG: number of physical parcels of this habitat type
  size                    NUMERIC(12,4),               -- BNG: ha or km | RE: sqft | Energy: kWh/yr
  size_unit               TEXT,                        -- 'ha', 'km', 'trees', 'sqft', 'kWh'

  -- Calculated units
  biodiversity_units      NUMERIC(12,4),               -- the calculated tradeable units for this parcel
  unit_gain               NUMERIC(12,4),               -- improvement minus baseline (environmental only)

  -- Allocation tracking (denormalized for query performance)
  allocated_size          NUMERIC(12,4) DEFAULT 0,
  allocated_units         NUMERIC(12,4) DEFAULT 0,
  allocated_percent       NUMERIC(5,2) DEFAULT 0,
  retained_size           NUMERIC(12,4),               -- baseline parcels: how much is retained

  -- Risk multipliers (BNG-specific, but generic enough for other environmental)
  temporal_risk           NUMERIC(5,4),
  spatial_risk            NUMERIC(5,4),
  difficulty_multiplier   NUMERIC(5,4),

  -- Flexible metadata
  metadata                JSONB DEFAULT '{}',

  sort_order              INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX site_parcels_site_id_phase_idx ON site_parcels(site_id, phase);
CREATE INDEX site_parcels_category_idx ON site_parcels(site_id, category);
CREATE INDEX site_parcels_tenant_id_idx ON site_parcels(tenant_id);

-- ═══════════════════════════════════════════
-- SITE UNIT SUMMARIES — Aggregate unit position per currency per site
-- ═══════════════════════════════════════════
site_unit_summaries (
  id                      UUID PK,
  site_id                 UUID FK → sites,
  tenant_id               UUID FK → tenants,
  unit_type_code          TEXT NOT NULL,               -- 'BNG_AREA_HU', 'KG_NITROGEN', 'LISTING', etc.

  -- Aggregates
  total_units             NUMERIC(12,4) DEFAULT 0,
  allocated_units         NUMERIC(12,4) DEFAULT 0,
  available_units         NUMERIC(12,4) DEFAULT 0,
  unit_price              NUMERIC(12,2),

  -- Environmental-specific
  baseline_units          NUMERIC(12,4),
  improvement_units       NUMERIC(12,4),
  net_gain                NUMERIC(12,4),

  -- Parcel counts
  baseline_parcel_count   INTEGER,
  improvement_parcel_count INTEGER,
  baseline_size           NUMERIC(12,4),
  improvement_size        NUMERIC(12,4),

  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, unit_type_code)
);

-- ═══════════════════════════════════════════
-- ALLOCATIONS — Linking site units to deals/developments
-- ═══════════════════════════════════════════
allocations (
  id                      UUID PK,
  tenant_id               UUID FK → tenants,
  allocation_reference    TEXT NOT NULL,

  site_id                 UUID FK → sites,
  deal_id                 UUID FK → deals,
  demand_contact_id       UUID FK → customers,

  -- What is allocated
  unit_type_code          TEXT NOT NULL,
  unit_quantity           NUMERIC(12,4) NOT NULL,
  unit_price              NUMERIC(12,2) NOT NULL,
  total_value             NUMERIC(12,2) NOT NULL,

  -- Status
  status                  TEXT NOT NULL DEFAULT 'reserved',   -- reserved, confirmed, delivered, cancelled
  reserved_at             TIMESTAMPTZ DEFAULT now(),
  confirmed_at            TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancellation_reason     TEXT,

  -- External references
  planning_reference      TEXT,                        -- developer's planning application ref
  registry_allocation_ref TEXT,                        -- Natural England allocation ref, etc.

  -- Geographic
  distance_km             NUMERIC(8,2),                -- distance from site to development

  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  version                 INTEGER DEFAULT 1,

  UNIQUE(tenant_id, allocation_reference)
);

-- ═══════════════════════════════════════════
-- ALLOCATION PARCELS — Parcel-level allocation detail (BNG and parcel-granular verticals)
-- ═══════════════════════════════════════════
allocation_parcels (
  id                      UUID PK,
  allocation_id           UUID FK → allocations,
  site_parcel_id          UUID FK → site_parcels,

  allocated_size          NUMERIC(12,4),
  allocated_units         NUMERIC(12,4),

  created_at              TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- UNIT TYPES — Configurable per tenant (seeded from vertical template)
-- ═══════════════════════════════════════════
unit_types (
  id                      UUID PK,
  tenant_id               UUID FK → tenants,
  code                    TEXT NOT NULL,                -- 'BNG_AREA_HU', 'BNG_HEDGEROW_HU', etc.
  name                    TEXT NOT NULL,                -- 'Area Habitat Units'
  description             TEXT,
  measurement_unit        TEXT NOT NULL,                -- 'units', 'kg/yr', 'property', 'kWh/yr'
  category                TEXT,                         -- 'area', 'hedgerow', 'watercourse' (groups related unit types)

  -- Geographic constraint
  geographic_constraint   TEXT,                         -- 'HARD_MATCH', 'PREFERENCE_RANKED', 'SOFT_FILTER', 'NONE'
  constraint_field        TEXT,                         -- 'geographic_area_1', 'geographic_area_2', 'local_authority'

  sort_order              INTEGER DEFAULT 0,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, code)
);

-- ═══════════════════════════════════════════
-- COMPLIANCE ITEMS — Post-sale obligations and monitoring
-- ═══════════════════════════════════════════
-- (Already well-designed in the blueprint. Add parcel tracking:)

compliance_parcels (
  compliance_item_id      UUID FK → compliance_items,
  site_parcel_id          UUID FK → site_parcels,
  condition_before        TEXT,                         -- condition score before this monitoring event
  condition_after         TEXT,                         -- condition score after
  notes                   TEXT,
  PRIMARY KEY (compliance_item_id, site_parcel_id)
);

-- ═══════════════════════════════════════════
-- REFERENCE DATA — Vertical-specific taxonomies
-- ═══════════════════════════════════════════
reference_taxonomies (
  id                      UUID PK,
  tenant_id               UUID FK → tenants,           -- null = system-wide (shared across tenants)
  vertical_slug           TEXT NOT NULL,                -- 'bng', 'nutrients', 'real-estate'
  taxonomy_type           TEXT NOT NULL,                -- 'habitat_type', 'soil_type', 'property_type', etc.
  code                    TEXT NOT NULL,
  label                   TEXT NOT NULL,
  parent_code             TEXT,                         -- for hierarchical taxonomies (broad → specific habitat)
  metadata                JSONB DEFAULT '{}',           -- BNG habitat: { distinctiveness: 'medium', score: 4, isPriority: true }
  sort_order              INTEGER DEFAULT 0,
  is_active               BOOLEAN DEFAULT true,

  UNIQUE(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'), vertical_slug, taxonomy_type, code)
);
```

### 4.2 Structured vs Flexible Fields — Design Rationale

The schema above deliberately uses **named columns** (not JSONB) for fields that meet ANY of these criteria:

1. **Filterable in list views:** `status`, `geographic_area_1`, `local_authority`, `commitment_years`
2. **Used in matching logic:** `geographic_area_1`, `unit_type_code`, `available_units`
3. **Aggregated in reports/dashboards:** `total_units`, `allocated_units`, `unit_price`
4. **Used in compliance scheduling:** `commitment_years`, `commitment_end_date`, `enhancement_start_date`

JSONB `metadata` is reserved for:
- Truly vertical-specific data that is only displayed, never queried (e.g., BNG's connectivity multiplier details, real estate's parking availability)
- Future fields that haven't been identified yet
- Integration-specific payloads from external registries

The `quality_score_1/2/3` pattern on `site_parcels` deserves explanation. BNG has distinctiveness, condition, and strategic significance. Carbon has carbon density and permanence risk. Rather than naming these `distinctiveness` and `condition` (BNG-specific), they use generic numbered slots with a `_label` companion for display. The vertical template maps these:

```typescript
// In vertical config
parcelQualityScores: [
  { slot: 1, label: 'Distinctiveness', values: ['V.Low', 'Low', 'Medium', 'High', 'V.High'] },
  { slot: 2, label: 'Condition', values: ['Poor', 'Fairly Poor', 'Moderate', 'Fairly Good', 'Good'] },
  { slot: 3, label: 'Strategic Significance', values: ['Low', 'Medium', 'High'] },
]
```

This is the pragmatic middle ground between "hardcode BNG field names" (too rigid) and "put everything in JSONB" (too unstructured). Three quality score slots cover BNG, carbon, nutrient, and most environmental verticals. Non-environmental verticals that don't need quality scores simply leave them null.

### 4.3 How Each Vertical Uses the Schema

**BNG tenant:**
- `sites` → gain sites with `geographic_area_1` = NCA, `geographic_area_2` = LNRS, `geographic_area_3` = LSOA
- `site_parcels` → 10-100+ rows per site, `parcel_type` = 'habitat', `phase` = baseline/improvement, `category` = area/hedgerow/watercourse/individual_tree
- `site_unit_summaries` → 3-4 rows per site (area HUs, hedgerow HUs, watercourse HUs, tree HUs)
- `allocations` + `allocation_parcels` → parcel-level allocation
- `unit_types` → 4 types: BNG_AREA_HU, BNG_HEDGEROW_HU, BNG_WATERCOURSE_HU, BNG_TREE_HU
- `reference_taxonomies` → ~120 habitat types from the statutory metric with distinctiveness scores

**Nutrient tenant:**
- `sites` → mitigation sites with `geographic_area_1` = catchment, `baseline_loading` / `proposed_loading` populated
- `site_parcels` → 0-3 rows (only if site has multiple mitigation zones)
- `site_unit_summaries` → 1-2 rows (KG_NITROGEN, KG_PHOSPHORUS)
- `allocations` → site-level only (no `allocation_parcels`)
- `unit_types` → 2 types: KG_NITROGEN, KG_PHOSPHORUS with `geographic_constraint` = 'HARD_MATCH'

**Real estate tenant:**
- `sites` → properties with `geographic_area_1` = region, `total_area` in sqft
- `site_parcels` → 0 rows (single property) or N rows for multi-unit development
- `site_unit_summaries` → 1 row (LISTING)
- `allocations` → 1:1 allocation (property to buyer)
- `unit_types` → RESIDENTIAL_SALE, COMMERCIAL_LEASE, etc. with `geographic_constraint` = 'SOFT_FILTER'

---

## 5. What This Means for Implementation Sequence

### 5.1 Phase 1: Build for BNG Properly (Weeks 1-4)

BNG is the first client and the most complex vertical. Building it properly forces the right abstractions:

1. **Schema creation** — Implement `sites`, `site_parcels`, `site_unit_summaries`, `allocations`, `allocation_parcels`, `unit_types`, `reference_taxonomies` tables. Do NOT skip parcels or unit summaries — these are the tables that make BNG real.

2. **BNG reference data** — Seed the `reference_taxonomies` table with all habitat types from the statutory biodiversity metric (approximately 120 habitat types across area, hedgerow, and watercourse categories, each with a fixed distinctiveness score and priority habitat flag).

3. **Site detail page with habitat data** — The site detail page must display the full habitat breakdown (see Section 6). This is the feature that differentiates the product from a CRM with a "units" number.

4. **Parcel-level allocation flow** — When a broker allocates units from a site to a deal, they must specify which habitat parcels and how many HUs from each. This is how the real register works.

5. **Three-currency unit tracking** — Area HUs, hedgerow HUs, and watercourse HUs must be tracked independently. A developer might need 10 area HUs and 2 hedgerow HUs — these are separate line items on the allocation.

**Why build this complexity first:** If the platform handles BNG's 3-currency, parcel-level, baseline-vs-improvement, 30-year-compliance model, then nutrients (2 currencies, site-level, no parcels) and real estate (1 currency, 1:1 allocation) are trivially supported by the same schema with fewer rows populated.

### 5.2 Phase 2: Nutrient Neutrality (Weeks 5-6)

Nutrients are the natural second vertical because:
- Same client base (the first BNG broker client also handles nutrients)
- Same landowner pool (a single farm can generate both BNG units AND nutrient credits)
- Same assessor pool (ecologists who do BNG surveys also do nutrient assessments)

What is needed beyond BNG:
1. **Catchment reference data** — Seed the 27 designated nutrient neutrality catchments into `reference_taxonomies`
2. **Hard-match geographic constraint** — Configure `unit_types` for KG_NITROGEN and KG_PHOSPHORUS with `geographic_constraint` = 'HARD_MATCH' and `constraint_field` = 'geographic_area_1'
3. **Nutrient budget calculator integration** — Either build a simplified calculator or accept uploads of completed Natural England calculators
4. **Dual-credit sites** — A single site may appear in BOTH the BNG and nutrient systems. The `site_parcels` table handles this naturally — BNG parcels and nutrient zones are different parcel types on the same site.

No schema changes needed. The BNG schema already supports nutrients — it just uses fewer features.

### 5.3 Phase 3: Carbon Credits (Weeks 7-8)

Carbon is the third environmental vertical. Same landowner base, same platform structure:
1. **Woodland Carbon Code / Peatland Code reference data** — New taxonomy entries
2. **Registry integration stubs** — UK Woodland Carbon Registry has a public register; add lookup capability
3. **Vintage-based allocation** — Carbon credits are often allocated by vintage year. Model as parcel `category` = vintage year, or as metadata on the allocation.

Again, no schema changes. The platform is already flexible enough.

### 5.4 Phase 4: Real Estate (Weeks 9-12)

Real estate is the proving ground for multi-vertical. It is architecturally simpler than BNG but has completely different UI requirements:
1. **Property-focused site detail** — Photos, floor plans, room descriptions rather than habitat parcels
2. **Different deal stages** — Valuation → Marketing → Viewings → Offer → Exchange → Completion
3. **Different compliance** — AML, deposit protection, EPC renewals
4. **Different geographic matching** — Postcode-based, soft preference

Schema changes needed: **None** for the core tables. The vertical template handles label differences, deal stage configuration, and compliance templates. New UI components are needed (property gallery, viewing scheduler) but these are frontend concerns, not data model concerns.

### 5.5 International Expansion (Phase 5+)

International equivalents (US mitigation banking, Australian biodiversity offsets) are structurally very similar to BNG. The key differences are:

1. **Different regulatory bodies** — USACE instead of Natural England; state departments in Australia
2. **Different habitat taxonomies** — NWI wetland types instead of UK statutory metric habitat types
3. **Different legal mechanisms** — Conservation easements instead of S106
4. **Different geographic classifications** — Watersheds/HUCs instead of NCAs; bioregions instead of LNRSs

All of these are handled by the `reference_taxonomies` table and the vertical template configuration. The `site_parcels` table structure works for US mitigation banking parcels just as well as UK BNG habitat parcels.

What would need new work:
- Localisation (currency, date formats, regulatory terminology)
- Currency support on pricing (USD, AUD, EUR)
- Time zone handling for compliance deadlines
- Potentially different registry integrations (RIBITS for US)

---

## 6. The Habitat Detail Problem — Solved

### 6.1 TypeScript Interfaces

```typescript
// ═══════════════════════════════════════════
// ENUMS — BNG-specific values, but the type system is generic
// ═══════════════════════════════════════════

type HabitatCategory = 'area' | 'hedgerow' | 'watercourse' | 'individual_tree';
type ParcelPhase = 'baseline' | 'improvement';
type Distinctiveness = 'v_low' | 'low' | 'medium' | 'high' | 'v_high';
type HabitatCondition = 'poor' | 'fairly_poor' | 'moderate' | 'fairly_good' | 'good' | 'n_a';
type StrategicSignificance = 'low' | 'medium' | 'high';

// Numeric scores for calculation
const DISTINCTIVENESS_SCORES: Record<Distinctiveness, number> = {
  v_low: 0, low: 2, medium: 4, high: 6, v_high: 8,
};
const CONDITION_SCORES: Record<HabitatCondition, number> = {
  poor: 1, fairly_poor: 1.5, moderate: 2, fairly_good: 2.5, good: 3, n_a: 0,
};
const SIGNIFICANCE_MULTIPLIERS: Record<StrategicSignificance, number> = {
  low: 1.0, medium: 1.1, high: 1.15,
};

// ═══════════════════════════════════════════
// HABITAT PARCEL — the core entity
// ═══════════════════════════════════════════

interface HabitatParcel {
  id: string;
  siteId: string;
  phase: ParcelPhase;
  category: HabitatCategory;

  // Classification
  broadHabitatType: string;           // "Grassland", "Woodland", "Wetland"
  specificHabitatType: string;        // "Other Neutral Grassland", "Lowland Meadows"

  // Quality scores
  distinctiveness: Distinctiveness;
  distinctivenessScore: number;       // 0-8
  condition: HabitatCondition;
  conditionScore: number;             // 1-3
  strategicSignificance: StrategicSignificance;
  significanceMultiplier: number;     // 1.0-1.15

  // Size
  parcelCount: number;                // number of physical parcels of this habitat type
  size: number;                       // hectares (area), km (linear), count (trees)
  sizeUnit: 'ha' | 'km' | 'trees';

  // Calculated
  biodiversityUnits: number;          // area × distinctiveness × condition × significance
  unitGain: number | null;            // improvement parcels only: improvement HUs - baseline HUs

  // Allocation status (improvement parcels only)
  allocatedSize: number;
  allocatedPercent: number;
  allocatedUnits: number;

  // Baseline parcels only
  retainedSize: number | null;

  // Risk multipliers (post-development calculations)
  temporalRisk: number | null;
  spatialRisk: number | null;
  difficultyMultiplier: number | null;
}

// ═══════════════════════════════════════════
// HABITAT CATEGORY SUMMARY — aggregate per category
// ═══════════════════════════════════════════

interface HabitatCategorySummary {
  category: HabitatCategory;
  categoryLabel: string;              // "Areas", "Hedgerows", "Watercourses", "Individual Trees"

  // Parcel counts
  baselineParcelCount: number;
  improvementParcelCount: number;

  // Size
  baselineSize: number;
  improvementSize: number;
  retainedSize: number;
  sizeUnit: 'ha' | 'km' | 'trees';

  // Units
  baselineUnits: number;
  improvementUnits: number;
  unitGain: number;

  // Allocation
  allocatedSize: number;
  allocatedPercent: number;
  allocatedUnits: number;
}

// ═══════════════════════════════════════════
// SITE WITH HABITAT DATA — the full site record for BNG
// ═══════════════════════════════════════════

interface BNGSiteDetail {
  // -- Core site fields (from sites table) --
  id: string;
  siteReference: string;
  name: string;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
  totalAreaHectares: number;

  // -- BNG-specific identification --
  bgsReference: string | null;        // BGS-XXXXXXXX (Natural England)
  nationalCharacterArea: string | null;
  lnrsArea: string | null;
  lsoa: string | null;
  imdDecile: number | null;
  localAuthority: string;

  // -- Ownership --
  landowner: {
    contactId: string;
    name: string;
    company: string | null;
  };
  responsibleBody: string | null;

  // -- Legal --
  legalAgreementType: 's106' | 'conservation_covenant' | null;
  legalAgreementDate: string | null;
  commitmentYears: number;            // 30 minimum for BNG
  commitmentEndDate: string | null;

  // -- Registration --
  registryStatus: 'not_started' | 'submitted' | 'under_review' | 'registered' | 'rejected';
  registryReference: string | null;
  registeredAt: string | null;
  registrationCost: number | null;
  enhancementStartDate: string | null;

  // -- Metric --
  metricVersion: string | null;
  hmmpStatus: 'draft' | 'submitted' | 'approved' | null;

  // ══════════════════════════════════════
  // HABITAT DATA — the key addition
  // ══════════════════════════════════════

  // Category summaries (3-4 rows: area, hedgerow, watercourse, individual_tree)
  habitatSummary: HabitatCategorySummary[];

  // All habitat parcels, separated by phase
  baselineHabitats: HabitatParcel[];
  improvementHabitats: HabitatParcel[];

  // Site-level totals (across all categories)
  totalBaselineUnits: number;
  totalImprovementUnits: number;
  totalUnitGain: number;
  totalAllocatedUnits: number;
  totalAvailableUnits: number;

  // Allocation overview
  allocationCount: number;
  medianAllocationDistanceKm: number | null;
  allocations: SiteAllocation[];

  // Documents
  documents: SiteDocument[];
  complianceItems: SiteComplianceItem[];
}

interface SiteAllocation {
  id: string;
  allocationReference: string;
  dealId: string | null;
  dealTitle: string | null;
  demandContactName: string;
  planningReference: string | null;
  unitTypeCode: string;
  unitQuantity: number;
  totalValue: number;
  status: string;
  distanceKm: number | null;
  allocatedAt: string;
  parcels: {
    parcelId: string;
    habitatType: string;
    allocatedSize: number;
    allocatedUnits: number;
  }[];
}
```

### 6.2 Site Detail UI Layout

The site detail page for a BNG site should be structured as follows:

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Sites                                    [Edit] [⋮]  │
│                                                                 │
│ North Yorkshire Habitat Bank                 BGS-040825002      │
│ Status: Registered ●                         26.70 ha           │
│ Tees Lowlands (NCA) · North Yorkshire LPA · LNRS: NY & York    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ Net Gain  │ │ Allocated│ │ Available│ │Allocations│           │
│ │ +145.58   │ │ 32.59    │ │ 112.99   │ │    12     │           │
│ │ area HUs  │ │ area HUs │ │ area HUs │ │ deals     │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Habitat Summary] [Baseline] [Enhancement] [Allocations]       │
│ [Documents] [Compliance] [Activity]                             │
├─────────────────────────────────────────────────────────────────┤
```

**Tab 1: Habitat Summary** (default view)

This mirrors the Natural England register format — a 3-4 row summary table:

```
┌──────────────┬────────┬──────────┬──────────┬──────────┬──────────┬──────────┬─────────┬──────────┬──────────┐
│ Category     │Parcels │ Baseline │ Baseline │ Retained │ Improve  │ Improve  │ HU Gain │ Alloc'd  │ % Alloc  │
│              │        │ Size     │ HUs      │ Size     │ Size     │ HUs      │         │ HUs      │          │
├──────────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼──────────┼──────────┤
│ Areas        │   23   │ 26.49 ha │   61.62  │ 4.46 ha  │ 26.49 ha │  207.20  │ +145.58 │  32.59   │  22.35%  │
│ Hedgerows    │   11   │ 2.24 km  │   18.58  │ 2.24 km  │  3.10 km │   24.39  │  +3.55  │   0.00   │   0.00%  │
│ Watercourses │    0   │    —     │     —    │    —     │    —     │     —    │    —    │    —     │    —     │
│ Ind. Trees   │    1   │ 5 trees  │    0.24  │ 5 trees  │170 trees │    2.13  │  +1.89  │   0.00   │   0.00%  │
├──────────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼──────────┼──────────┤
│ TOTAL        │   35   │          │   80.44  │          │          │  233.72  │+151.02  │  32.59   │          │
└──────────────┴────────┴──────────┴──────────┴──────────┴──────────┴──────────┴─────────┴──────────┴──────────┘
```

**Tab 2: Baseline Habitats**

Table of all baseline habitat parcels, sortable by habitat type, distinctiveness, size, or HUs:

```
┌──────────────────────────────┬───────────────┬─────────┬───────────┬────────┐
│ Habitat Type                 │Distinctiveness│ Parcels │ Size (ha) │   HUs  │
├──────────────────────────────┼───────────────┼─────────┼───────────┼────────┤
│ Cereal Crops                 │ Low           │   12    │   22.03   │  44.06 │
│ Modified Grassland           │ Low           │    2    │    3.60   │  14.40 │
│ Other Neutral Grassland      │ Medium        │    4    │    0.59   │   2.36 │
│ Tall Forbs                   │ Low           │    2    │    0.11   │   0.44 │
│ Bramble Scrub                │ Medium        │    1    │    0.02   │   0.08 │
│ Bare Ground                  │ Low           │    2    │    0.14   │   0.28 │
├──────────────────────────────┼───────────────┼─────────┼───────────┼────────┤
│ TOTAL                        │               │   23    │   26.49   │  61.62 │
└──────────────────────────────┴───────────────┴─────────┴───────────┴────────┘

Filter: [All Categories ▾] [All Distinctiveness ▾]
```

Each row is expandable to show condition, strategic significance, and detailed calculation inputs.

**Tab 3: Enhancement Habitats**

Same structure but with additional columns for allocation status and HU gain:

```
┌──────────────────────────────┬───────────────┬─────────┬───────────┬──────────┬────────┬─────────┐
│ Habitat Type                 │Distinctiveness│ Parcels │ Size (ha) │ % Alloc  │   HUs  │ HU Gain │
├──────────────────────────────┼───────────────┼─────────┼───────────┼──────────┼────────┼─────────┤
│ Other Neutral Grassland      │ Medium        │    5    │   21.50   │   0.00%  │ 173.92 │ +126.94 │
│ Mixed Scrub                  │ Medium        │    1    │    2.66   │  22.35%  │  17.03 │    —    │
│ Other Woodland; Broadleaved  │ Medium        │    1    │    2.33   │   0.00%  │  10.92 │  +1.60  │
├──────────────────────────────┼───────────────┼─────────┼───────────┼──────────┼────────┼─────────┤
│ TOTAL                        │               │    7    │   26.49   │          │ 207.20 │ +145.58 │
└──────────────────────────────┴───────────────┴─────────┴───────────┴──────────┼────────┼─────────┘
```

A progress bar beneath each row shows allocation status visually (green = allocated, gray = available).

**Tab 4: Allocations**

List of allocations with expandable parcel detail:

```
┌────────┬────────────────────────┬──────────────┬───────────┬──────────┬───────────┬──────────┐
│ Ref    │ Development            │ Planning Ref │ Unit Type │ Quantity │ Distance  │ Status   │
├────────┼────────────────────────┼──────────────┼───────────┼──────────┼───────────┼──────────┤
│ A-0001 │ Stokesley Homes Phase 2│ NY/2025/0892 │ Area HU   │    5.20  │  12 km    │Confirmed │
│  └──── │ Mixed Scrub (0.59 ha → 3.81 HUs), Other Neutral Grassland (0.21 ha → 1.39 HUs)    │
├────────┼────────────────────────┼──────────────┼───────────┼──────────┼───────────┼──────────┤
│ A-0002 │ Darlington Gateway     │ DL/2025/1204 │ Area HU   │    8.40  │  31 km    │Reserved  │
│  └──── │ Other Neutral Grassland (1.04 ha → 8.40 HUs)                                       │
└────────┴────────────────────────┴──────────────┴───────────┴──────────┴───────────┴──────────┘
```

**Right sidebar (always visible):**

```
┌─────────────────────────┐
│ Site Details             │
├─────────────────────────┤
│ Landowner               │
│ John Thompson            │
│ Thompson Estates Ltd     │
│ ✉ john@thompson.co.uk   │
│ ☏ 01234 567890           │
├─────────────────────────┤
│ Registration             │
│ BGS-040825002            │
│ Registered 01/11/2024    │
│ S106 Agreement           │
│ 30-year commitment       │
│ Expires: 2054            │
│ Fee: £639 (paid)         │
├─────────────────────────┤
│ Geography                │
│ NCA: Tees Lowlands       │
│ LNRS: NY & York          │
│ LPA: North Yorkshire     │
│ LSOA: Hambleton 002D     │
│ IMD: Decile 4            │
├─────────────────────────┤
│ Metric                   │
│ Version: SM 1.0           │
│ HMMP: Approved ✓          │
│ Enhancement: 01/11/2024   │
├─────────────────────────┤
│ Key Documents            │
│ 📄 S106 Agreement         │
│ 📄 HMMP v2.1              │
│ 📄 Metric Calculation     │
│ 📄 Boundary Map           │
│ 📄 Title Deeds            │
└─────────────────────────┘
```

### 6.3 UI Component Architecture

The habitat tables should be built with these components:

1. **`HabitatSummaryTable`** — The 3-4 row category summary. This is a small, dense table component that uses the `HabitatCategorySummary[]` data. It should support:
   - Click-through on a category row to jump to the Baseline/Enhancement tab filtered to that category
   - Colour-coded HU Gain column (green for positive gain)
   - Progress indicator for % Allocated

2. **`HabitatParcelTable`** — The detailed parcel list used on Baseline and Enhancement tabs. Uses `HabitatParcel[]` data. Features:
   - Filterable by category (area/hedgerow/watercourse/tree) and distinctiveness
   - Expandable rows to show condition, strategic significance, risk multipliers, and calculation breakdown
   - For Enhancement tab: allocation progress bar per row
   - Sortable by any column
   - Footer row with totals

3. **`AllocationTable`** — The allocation list with expandable parcel detail. Features:
   - Expandable rows showing which parcels are allocated and how many HUs from each
   - Status badges (reserved/confirmed/delivered)
   - Distance display
   - Link to associated deal

4. **`UnitSummaryCards`** — The top-level summary cards showing net gain, allocated, available. For BNG, show the primary currency (area HUs) in the large cards, with hedgerow and watercourse in smaller indicators below.

### 6.4 How This Adapts Per Vertical

The same UI components serve different verticals:

**Nutrient site detail:**
- `HabitatSummaryTable` → replaced by a simpler `NutrientBudgetSummary` showing baseline loading → proposed loading → credits generated
- `HabitatParcelTable` → hidden (nutrients don't have parcels)
- `AllocationTable` → same component, but without parcel expansion
- `UnitSummaryCards` → shows kg N/yr and kg P/yr as separate cards

**Real estate property detail:**
- `HabitatSummaryTable` → replaced by `PropertySpecification` (bedrooms, bathrooms, sqft, EPC rating)
- `HabitatParcelTable` → replaced by `PropertyRooms` or hidden entirely
- `AllocationTable` → replaced by `OfferHistory` (offers received on the property)
- `UnitSummaryCards` → shows asking price, current offers, days on market

The component architecture should use **vertical-aware rendering** — the site detail page checks the tenant's vertical config and renders the appropriate component set. This is NOT a generic "render any schema" approach — each vertical gets purpose-built UI sections, but they share the same underlying data model and page layout structure.

---

## 7. Summary of Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Parcel table** | Dedicated `site_parcels` table, not JSONB | Parcels are independently allocated, monitored, and queried. They need proper relational integrity. |
| **Multi-currency units** | `site_unit_summaries` table with one row per currency per site | BNG has 3-4 currencies that cannot be mixed. The aggregate table enables fast filtering/sorting in list views. |
| **Quality scores** | 3 generic numbered slots on `site_parcels` | Covers BNG (distinctiveness/condition/significance), carbon (density/risk), and future verticals without BNG-specific column names. |
| **Geographic fields** | 3 generic `geographic_area_N` columns | Covers NCA/LNRS/LSOA (BNG), catchment (nutrients), region/postcode (real estate) without vertical-specific column names. |
| **Allocation granularity** | Two-tier: `allocations` (deal-level) + `allocation_parcels` (optional parcel-level) | BNG needs parcel-level. Nutrients and real estate don't. The junction table is optional. |
| **Compliance per parcel** | `compliance_parcels` junction table | BNG monitoring must track condition changes at the parcel level over 30 years. |
| **Reference data** | `reference_taxonomies` table with vertical + type keys | Habitat types, soil types, property types — all are vertical-specific taxonomies that should be queryable, not hardcoded. |
| **Vertical-specific fields on sites** | Named columns for queryable fields, JSONB for display-only | `baseline_loading`, `hmmp_status`, `imd_decile` are used in filters and reports. Pure display data goes in `metadata`. |
| **Registry integration** | Manual reference entry now, adapter pattern for future APIs | Natural England has no registration API. Design for future automation without over-engineering now. |
| **Build sequence** | BNG first with full parcel model, then nutrients (schema-compatible), then real estate (proves multi-vertical) | Building the most complex vertical first forces the right abstractions. Simpler verticals are trivially supported. |

---

## 8. What the Blueprint Needs to Change

The existing `2026-03-07-brokerage-platform-blueprint.md` is correct at the module and vertical config level but needs these amendments:

1. **`sites` table** — Add `geographic_area_1/2/3`, `enhancement_start_date`, `imd_decile`, `soil_type`, `baseline_loading`, `proposed_loading`, `mitigation_type`, `metric_version`, `hmmp_status`. Remove the single `totalUnits/allocatedUnits/availableUnits` (replaced by `site_unit_summaries`).

2. **New table: `site_parcels`** — The entire parcel model is missing from the blueprint. This is the biggest gap.

3. **New table: `site_unit_summaries`** — The blueprint has a single `unitType` + `totalUnits` on sites. This needs to become a child table supporting multiple currencies.

4. **New table: `allocation_parcels`** — The blueprint's `allocations` table is flat. It needs a child table for parcel-level allocation detail.

5. **New table: `reference_taxonomies`** — The blueprint mentions form templates for assessment data but does not have a reference data system for habitat types, distinctiveness scores, or condition criteria.

6. **New table: `compliance_parcels`** — The blueprint's compliance model is correct but needs parcel-level tracking for environmental monitoring.

7. **Vertical template extension** — The `VerticalTemplate` interface needs:
   - `parcelTypes` — what kind of parcels this vertical uses
   - `parcelQualityScores` — what the 3 quality score slots mean for this vertical
   - `geographicAreaLabels` — what the 3 geographic area slots mean
   - `unitCategories` — how unit types group (BNG: area/hedgerow/watercourse; nutrients: nitrogen/phosphorus)
   - `hasBaselineImprovement` — whether this vertical uses the baseline/improvement parcel model

8. **BNG assessment form** — The blueprint's "BNG Baseline Survey" form template is far too simplistic. It has 10 flat fields. The real assessment produces 10-100+ habitat parcels with per-parcel calculations. The assessment output should create `site_parcels` rows, not a single `completedForms` entry. The form builder is the wrong tool for BNG metric data entry — this needs a dedicated parcel management interface.

---

## Sources

- Natural England Biodiversity Gain Sites Register: https://environment.data.gov.uk/biodiversity-net-gain
- Bristol Trees BGS Viewer: https://bgs.bristoltrees.space/sites
- Statutory Biodiversity Metric Tools: https://www.gov.uk/government/publications/statutory-biodiversity-metric-tools-and-guides
- Environment Act 2021 Section 100: https://www.legislation.gov.uk/ukpga/2021/30/section/100
- GOV.UK Register a Biodiversity Gain Site: https://www.gov.uk/guidance/register-a-biodiversity-gain-site
- RIBITS (US Mitigation Banking): https://ribits.ops.usace.army.mil/
- NSW Biodiversity Offsets Scheme: https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity-offsets-scheme
- Verra VCS Program: https://verra.org/programs/verified-carbon-standard/
- Gold Standard: https://www.goldstandard.org/
- Internal documents: gap analysis, platform blueprint, brokerage research (referenced above)
