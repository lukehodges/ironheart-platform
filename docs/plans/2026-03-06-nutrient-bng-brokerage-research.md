# Nutrient & BNG Credit Brokerage — End-to-End Business Process

> Research document for first vertical client. This maps the full operational workflow of a nutrient/BNG credit broker, intended as the foundation for software feature mapping.

## Context

Client business model: Partner with developers (demand side), send out ecological assessors, partner with farmers/landowners (supply side) to generate nutrient and biodiversity credits, take a 20% commission on each transaction.

This is the **first vertical** on a multi-industry platform. The abstractions identified here will inform the generic platform architecture.

---

## The Two Credit Markets

| | **Nutrient Neutrality (NN)** | **Biodiversity Net Gain (BNG)** |
|---|---|---|
| **Legal basis** | Habitats Regulations / Conservation of Habitats & Species Regs 2017 | Environment Act 2021 |
| **Requirement** | Net zero additional nitrogen/phosphorus to protected waterways | Minimum 10% biodiversity uplift |
| **Credit unit** | 1 kg/year of total nitrogen OR total phosphorus | 1 biodiversity unit (statutory metric) |
| **Geographic scope** | Catchment-locked (27 designated catchments in England/Wales) | England-wide (proximity multipliers apply) |
| **Duration** | 80–125 years (perpetuity) | Minimum 30 years |
| **Legal mechanism** | Section 106 agreement or Conservation Covenant | Section 106 agreement or Conservation Covenant |
| **Pricing** | £2,300–£100,000+ per kg depending on catchment and nutrient type | Varies by habitat type and location |

---

## SUPPLY SIDE: Partnering with Farmers/Landowners

### Phase 1 — Prospecting & Landowner Acquisition

1. **Identify target catchments** — Map the 27 designated NN catchments + areas with high BNG demand (near active development pipelines)
2. **Landowner outreach** — Approach farmers/estate owners in those catchments. Sell the proposition: "Generate income from your land without selling it"
3. **Initial screening call** — Assess: land size, current use (arable, pasture, dairy, pig), proximity to watercourses, existing environmental designations, willingness to commit 30–125 years
4. **Heads of terms** — Non-binding agreement outlining the broker's role, the 20% commission structure, and landowner obligations

### Phase 2 — Site Assessment (Send Out Assessors)

**For Nutrient Credits:**
1. **Baseline ecological survey** — Qualified ecologist visits site, records current habitat condition, soil type, drainage, existing nutrient loading
2. **Nutrient budget calculation** — Using Natural England's catchment-specific calculator:
   - Current land use nutrient output (kg N or P/year)
   - Proposed mitigation land use nutrient output
   - Difference = credit generation potential
   - Formula: `(Current loading - Proposed loading) × land area = annual credits (kg/year)`
3. **Mitigation scheme design** — Assessor recommends one of three approaches:
   - **Land use change**: Take arable/intensive land out of production → woodland, wetland, or grassland (highest credit yield, most disruptive to farmer)
   - **Management solutions**: Riparian buffer strips, drainage ditch management, nutrient interception features (less disruptive, compatible with continued farming)
   - **Constructed wetlands**: Purpose-built treatment wetlands filtering nutrient-rich runoff (needs water source access, less land required)
4. **Natural England Discretionary Advice Service (DAS)** — Submit scheme design for pre-approval confirmation that mitigation will be "suitable and effective in perpetuity"

**For BNG Credits:**
1. **Baseline habitat survey** — Ecologist surveys using the Statutory Biodiversity Metric tool, scoring existing habitat condition and distinctiveness
2. **Enhancement plan** — Design habitat creation/enhancement to generate maximum biodiversity units (aligned with Local Nature Recovery Strategy for bonus multipliers)
3. **Habitat Management & Monitoring Plan (HMMP)** — 30-year plan detailing: target habitat conditions, management interventions, monitoring schedule, remedial triggers

### Phase 3 — Legal Securing

1. **Instruct solicitors** — Broker arranges environmental/planning solicitors (cost borne by broker or split)
2. **Draft Section 106 agreement** — Between landowner and Local Planning Authority (LPA):
   - Land commitment: 80–125 years (NN) or 30 years (BNG)
   - Habitat creation and management obligations
   - Monitoring and reporting schedule
   - Payment terms and conditions
   - **Alternative**: Conservation Covenant with a Responsible Body (for BNG)
3. **Landowner signs S106/Covenant** — Land is now legally tied to mitigation delivery
4. **Register gain site** (BNG only) — Submit to Natural England's national biodiversity gain sites register:
   - Cost: £639
   - Documents: title deeds, boundary map, legal agreement, metric calculations, HMMP, local land charge certificate
   - Timeline: up to 6 weeks for review
   - Output: unique gain site reference number

**At this point, the broker has "banked" credits ready to sell.**

---

## DEMAND SIDE: Partnering with Developers

### Phase 4 — Developer Acquisition

1. **Pipeline identification** — Monitor planning applications in target catchments via LPA portals. Any residential or overnight accommodation development in a designated catchment needs NN credits. Any major development in England needs BNG.
2. **Developer outreach** — Approach housebuilders, housing associations, land promoters. Sell the proposition: "We have credits ready to unlock your stalled planning consent"
3. **Confirm developer's requirement:**

**For NN credits:**
- Developer (or their consultant) has already completed a **Nutrient Budget Calculation** using Natural England's 5-worksheet calculator:
  - Worksheet 1: Wastewater nutrients from new housing
  - Worksheet 2: Current land use nutrient loading
  - Worksheet 3: Future land use loading
  - Worksheet 4: SuDS nutrient removal
  - Worksheet 5: Final budget = `(Wastewater - Current + Future - SuDS) × 1.2` (the 1.2 is a mandatory 20% precautionary buffer)
- Output: X kg/year of nitrogen and/or Y kg/year of phosphorus mitigation needed

**For BNG credits:**
- Developer has completed the **Statutory Biodiversity Metric** calculation showing their deficit after on-site mitigation
- Output: X biodiversity units needed (by habitat type)

### Phase 5 — Matching & Quotation

1. **Match supply to demand** — Broker matches developer's credit requirement to banked supply from landowner portfolio. Must be in **same catchment** for NN credits.
2. **Price quotation** — Broker calculates:
   - Landowner payment (cost of credit generation + landowner profit share)
   - Broker margin (20% of total transaction value)
   - Developer price = Landowner payment + Broker cut
   - Typical NN range: £2,500–£10,000+ per dwelling (varies hugely by catchment — phosphorus can hit £100,000/kg in constrained areas)
3. **Credit Reservation Agreement** — Developer pays deposit (typically 10%) to reserve credits while planning progresses

### Phase 6 — Transaction Execution

1. **Credit Purchase Agreement** — Formal contract between developer and broker specifying:
   - Credit quantity (kg/year for NN, units for BNG)
   - Price and payment schedule
   - Delivery timeline
   - Warranties on credit validity
2. **Developer pays broker** — Lump sum or staged payments (e.g., reservation → planning approval → first occupation)
3. **Broker pays landowner** — Upfront payment minus 20% commission, or staged per agreement
4. **Allocate credits to development:**
   - **NN**: Evidence submitted to LPA as part of planning application / discharge of condition
   - **BNG**: Record allocation on Natural England's register, linking gain site reference to developer's planning application
5. **LPA confirmation** — Development management team confirms nutrient mitigation condition/obligation is satisfied → houses can be occupied

---

## ONGOING OBLIGATIONS (Post-Sale)

### Phase 7 — Long-Term Management & Compliance

| Task | NN (80–125 years) | BNG (30 years) |
|---|---|---|
| **Habitat management** | Per S106 terms | Per HMMP |
| **Monitoring** | Annual/periodic reporting to LPA | Annual condition assessments |
| **Remedial action** | If mitigation fails, landowner must rectify | If habitat degrades, remedial triggers in HMMP |
| **Who pays** | Funded from upfront credit sale proceeds (costed into price) | Same — 30-year management costs baked into unit price |
| **Broker's ongoing role** | Depends on contract — may manage on behalf of landowner for fee, or responsibility sits entirely with landowner | Same |

---

## THE BROKER'S REVENUE MODEL (20% Cut)

```
Developer pays:          £100,000 (for, say, 50 kg/year nitrogen credits)
├── Landowner receives:  £80,000  (credit generation + 80-125yr management costs)
└── Broker retains:      £20,000  (20% commission)

Broker costs from that £20,000:
├── Assessor fees (ecological surveys, metric calculations)
├── Legal costs (S106 drafting, solicitor fees — unless passed to parties)
├── Natural England registration fees (£639 for BNG)
├── DAS pre-approval costs (for NN)
├── Sales & BD costs
└── Net profit margin
```

The broker can structure this as:
- **Pure brokerage**: Just matches supply/demand, takes commission
- **Habitat bank operator**: Leases land from farmers, generates credits speculatively, sells to developers (higher risk, higher margin)
- **Hybrid**: Banks some credits speculatively, brokers others on demand

---

## KEY RISKS & ADMIN PAIN POINTS

| Risk | Detail |
|---|---|
| **Catchment lock-in** | NN credits can only be sold within the same catchment — stranded inventory if development pipeline dries up |
| **S106 negotiation delays** | LPAs are slow; S106 drafting can take 3–12 months |
| **Natural England DAS bottleneck** | Pre-approval queues for NN schemes |
| **Price volatility** | No standardised pricing — phosphorus credits have ranged from £2,300 to £100,000/kg |
| **Legislative change** | Government has considered scrapping NN requirements (attempted in Levelling Up Bill 2023, reversed). SI 2025/859 and SI 2026/157 continue to evolve the framework |
| **Landowner cold feet** | 80–125 year commitment is daunting — some farmers pull out pre-S106 |
| **Double counting** | Must ensure credits aren't already legally required (e.g., tree restocking obligations) |
| **Monitoring liability** | Who manages the land for 80+ years? Broker may need to set up endowment/trust structures |

---

## REGULATORY BODIES

| Body | Role |
|---|---|
| **Natural England** | Pre-approves NN schemes (DAS), operates BNG register, sells statutory BNG credits as last resort, publishes catchment calculators |
| **Local Planning Authority** | Signs S106 agreements, confirms planning conditions discharged, approves Biodiversity Gain Plans |
| **Responsible Bodies** | Sign Conservation Covenants (alternative to S106 for BNG) |
| **Environment Agency** | Water quality data, consenting for wetland construction near watercourses |
| **Defra** | Policy owner, statutory metric updates |

---

## MULTI-VERTICAL PLATFORM VISION

> The BNG/nutrient broker is the first client, but the platform is designed to serve any two-sided brokerage with regulated intermediation. The abstractions below show how the same 7 platform pillars apply across industries.

### Generic Platform Abstraction

| BNG/Nutrient-Specific | Generic Platform Concept | Applies Across All Verticals |
|---|---|---|
| Farmer/Landowner | **Supply Partner** | The party providing inventory |
| Developer | **Demand Partner** | The party consuming inventory |
| Ecological assessor | **Field Assessor / Inspector** | Domain expert sent to evaluate |
| Credit (kg/year, BNG unit) | **Tradeable Unit / Inventory** | The thing being matched and sold |
| Catchment area | **Geographic Constraint** | Spatial rules on matching |
| S106 / Conservation Covenant | **Regulated Agreement** | Legal instrument securing the deal |
| Natural England register | **External Registry Integration** | Regulatory body the platform talks to |
| 20% commission | **Transaction Fee Model** | How the broker gets paid |
| HMMP / monitoring | **Ongoing Compliance Tracking** | Post-sale obligations and deadlines |
| Nutrient budget calculator | **Requirement Calculator** | Tool to quantify demand |

### The 7 Platform Pillars

Every brokerage vertical maps onto these same pillars — what changes is configuration, not architecture:

```
                    CRM     ASSESS    INVENTORY   MATCH    TRANSACT   COMPLY    DOCS
                   ─────   ────────   ─────────   ─────   ────────   ──────   ──────
BNG/Nutrient        ✓        ✓           ✓         ✓        ✓         ✓        ✓
Carbon Credits      ✓        ✓           ✓         ✓        ✓         ✓        ✓
Real Estate         ✓        ✓           ✓         ✓        ✓         ✓        ✓
Construction        ✓        ✓           ✓         ✓        ✓         ✓        ✓
Energy Broker       ✓        ✓           ✓         ✓        ✓         ✓        ✓
Freight             ✓        ✓           ✓         ✓        ✓         ✓        ✓
Recruitment         ✓        ✓           ✓         ✓        ✓         ✓        ✓
Insurance           ✓        ✓           ✓         ✓        ✓         ✓        ✓
Waste               ✓        ✓           ✓         ✓        ✓         ✓        ✓
Renewables/PPA      ✓        ✓           ✓         ✓        ✓         ✓        ✓
```

### Whiteboard Architecture

```
SUPPLY LANE          PLATFORM LANE              DEMAND LANE
(Farmers)            (Your Software)            (Developers)

Prospect ──────────► CRM / Pipeline ◄────────── Prospect
                          │
Assess ────────────► Assessment Engine ◄──────── Requirements
(send assessor)      (forms, calcs, reports)    (calculator)
                          │
Legal ─────────────► Document Workflow ◄──────── Agreement
(S106, covenant)     (templates, tracking,      (purchase agreement)
                      e-signatures, status)
                          │
Bank ──────────────► Inventory / Registry ◄───── Search
(credits created)    (units, geo-constraints,   (match to need)
                      availability)
                          │
                     Matching Engine
                     (auto-match supply/demand)
                          │
                     Transaction Engine ◄──────── Quote / Reserve
                     (pricing, commission,        (deposit, staged pay)
                      invoicing, payments)
                          │
Monitor ───────────► Compliance Dashboard ◄───── Confirmation
(annual reports)     (deadlines, alerts,         (LPA discharge)
                      document storage)
```

---

## VERTICAL BREAKDOWN

### Tier 1 — Same DNA (Environmental Credits)

Almost identical operationally to BNG/nutrient credits. Same supply/demand/assess/match/transact/comply loop. Same landowner base — a single farmer could generate nutrient credits, BNG units AND carbon credits from the same land parcel.

#### Carbon Credits (Woodland & Peatland)
- **Supply**: Landowners plant woodland or restore peatland → generates Woodland Carbon Units (WCU) or Peatland Carbon Units
- **Demand**: Businesses needing to offset emissions (voluntary market) or UK ETS compliance
- **Assessors**: Woodland carbon assessors validate planting plans against the Woodland Carbon Code
- **Registry**: UK Woodland Carbon Registry / Peatland Code Registry
- **Commission**: Broker margin on credit sale
- **Market size**: UK voluntary carbon market growing rapidly, government projecting £50bn+ by 2030 globally

#### Water Neutrality Credits
- **Emerging market** — Sussex (around Arun District) already has water neutrality requirements
- **Same model**: Developers need to offset water consumption, landowners provide offsets through efficiency measures
- **Early mover advantage**: Very few brokers operating here yet

#### Flood Risk Credits / Natural Flood Management
- **Supply**: Landowners implement natural flood management (leaky dams, floodplain restoration)
- **Demand**: Developers, water companies, local authorities
- **Growing**: Environment Agency increasingly funding nature-based flood solutions
- **Same assessor skillset** as BNG/nutrient work

---

### Tier 2 — Same Shape, Different Domain (Property & Construction)

#### Real Estate
- **Supply**: Property vendors, landlords
- **Demand**: Buyers, tenants
- **Assessors**: Surveyors, valuers, EPC assessors
- **Inventory**: Listings (units with geographic constraints, price, availability)
- **Legal**: Conveyancing workflow, exchange contracts
- **Commission**: 1–3% sales, 8–12% lettings management
- **Compliance**: AML checks, EPC requirements, deposit protection
- **Why it fits**: CRM pipeline, assessment booking, document workflow, commission tracking, compliance deadlines — all identical platform concepts

#### Construction Subcontractor Brokerage
- **Supply**: Subcontractors (electricians, plumbers, groundworkers)
- **Demand**: Main contractors / developers needing trades
- **Assessors**: Site inspectors, H&S auditors
- **Inventory**: Available capacity (days/weeks), skill sets, geographic coverage
- **Commission**: 10–20% markup on day rates
- **Compliance**: CSCS cards, insurance verification, RAMS documents
- **Growing pain**: UK construction industry is massively fragmented, most matching is still done by phone

#### Planning Consultant Brokerage
- **Supply**: Independent planning consultants, ecologists, arboriculturists
- **Demand**: Developers needing planning support
- **Matching**: By specialism, geography, LPA familiarity
- **Feeds into BNG/nutrient vertical** — the assessors the broker sends out could be sourced through the same platform

---

### Tier 3 — Proven Brokerage Models (High Volume)

#### Energy Brokerage (Business Gas & Electric)
- **Supply**: Energy suppliers (EDF, Octopus, British Gas Business)
- **Demand**: SMEs needing gas/electricity contracts
- **Assessors**: Energy auditors (consumption analysis)
- **Commission**: 0.05–5p per kWh uplift, or 1–2% of contract value
- **Legal**: Ofgem-regulated, mandatory commission disclosure since Oct 2024
- **Volume play**: Every business switches every 1–3 years
- **Compliance**: Ofgem TPI Code of Practice, contract renewal tracking

#### Freight / Logistics Brokerage
- **Supply**: Hauliers with available truck capacity
- **Demand**: Shippers with loads to move
- **Matching**: Route, vehicle type, timing, load size
- **Commission**: Margin between shipper rate and carrier rate (typically 10–20%)
- **Real-time inventory**: Available capacity changes by the hour
- **UK market**: Highly fragmented, dominated by phone-and-email brokers. Digital freight matching is still early in UK vs US

#### Recruitment / Staffing
- **Supply**: Candidates
- **Demand**: Employers
- **Assessors**: Recruiters (screening, interviewing)
- **Commission**: 15–30% of first-year salary (perm), margin on day rate (temp)
- **Compliance**: IR35, right-to-work, DBS checks
- **Massive market**: UK recruitment industry worth £40bn+

#### Insurance Brokerage
- **Supply**: Insurers / underwriters
- **Demand**: Businesses or individuals needing cover
- **Assessors**: Risk assessors
- **Commission**: 10–20% of premium
- **Compliance**: FCA regulated, heavy document/audit trail requirements

---

### Tier 4 — Emerging / Niche (High Margin, Low Volume)

#### Agricultural Quotas & Entitlements
- **Supply**: Farmers with surplus Basic Payment Scheme entitlements, milk quotas (historic), or ELMS credits
- **Demand**: Farmers needing additional entitlements
- **Already brokered** but mostly by chartered surveyors with spreadsheets
- **Same landowner base** as BNG/nutrient client

#### Renewable Energy / PPA Brokerage
- **Supply**: Solar/wind farm operators generating electricity
- **Demand**: Businesses wanting Power Purchase Agreements (PPAs)
- **Commission**: Margin on per-MWh rate
- **Growing fast**: UK corporate PPA market expanding rapidly
- **Assessment**: Energy yield analysis, grid connection review

#### Waste & Recycling Brokerage
- **Supply**: Waste processors, recyclers
- **Demand**: Businesses producing waste
- **Matching**: Waste type, volume, geography, compliance (duty of care)
- **Commission**: Per-tonne margin
- **Compliance**: Waste transfer notes, carrier licences, EA permits

#### Professional Services Matching (Expert Witness, Consultants)
- **Supply**: Independent consultants, expert witnesses
- **Demand**: Law firms, insurers, corporates
- **Assessment**: Credential verification, availability, specialism
- **Commission**: 15–25% of engagement fee

---

## RECOMMENDED VERTICAL SEQUENCING

1. **BNG/Nutrient Credits** — First client, prove the platform, learn the pain points
2. **Carbon Credits** — Same landowner base, same assessors, minimal platform changes. Cross-sell to existing farmers
3. **Real Estate** — Existing leads. Different domain but identical platform shape. Proves the "multi-vertical" story
4. **Energy Brokerage** — High volume, recurring revenue, simpler transactions. Proves scale
5. **Everything else** — Once the 7 pillars are solid, each new vertical is mostly configuration

---

## THE PITCH

> "We're not BNG software. We're brokerage operations infrastructure. BNG happens to be where we started."

What changes per vertical is just configuration:
- **CRM**: What fields/stages exist on supply vs demand contacts
- **Assess**: What form the assessor fills in, what calculator runs
- **Inventory**: What the "unit" is (kg/year, BNG unit, listing, truck capacity, candidate)
- **Match**: What constraints apply (geography, time, specialism, habitat type)
- **Transact**: Commission model (%, fixed, per-unit, uplift)
- **Comply**: What deadlines/documents/renewals to track
- **Docs**: What templates (S106, tenancy agreement, waste transfer note)

---

## Sources

- [Natural England's nutrient mitigation scheme](https://www.gov.uk/government/publications/natural-englands-nutrient-mitigation-scheme-for-developers)
- [Greenshank Environmental — Nutrient Neutrality](https://www.greenshank-environmental.com/nutrient-neutrality)
- [Foot Anstey — Landowner's guide](https://www.footanstey.com/our-insights/articles-news/a-landowners-guide-to-nutrient-neutrality/)
- [Townsend Chartered Surveyors — Nutrient Trading](https://townsendcharteredsurveyors.co.uk/farm-quota/nutrient-neutrality-and-market-trading/)
- [Civity — How to Buy BNG Units](https://civitynge.com/2025/11/27/how-to-buy-bng-units-a-step-by-step-guide/)
- [GOV.UK — Sell biodiversity units](https://www.gov.uk/guidance/sell-biodiversity-units-as-a-land-manager)
- [GOV.UK — Register a biodiversity gain site](https://www.gov.uk/guidance/register-a-biodiversity-gain-site)
- [GOV.UK — Nutrient neutrality calculators](https://www.gov.uk/guidance/using-the-nutrient-neutrality-calculators)
- [Wild Capital — NN Credits](https://wild-capital.co.uk/nutrient-neutrality-credits/)
- [AHDB — Nature markets available](https://ahdb.org.uk/carbon-markets/how-carbon-markets-work)
- [UK Emissions Trading Scheme](https://icapcarbonaction.com/en/ets/uk-emissions-trading-scheme)
- [Carbon Credit Market 2025 Turning Point](https://carboncredits.com/the-carbon-credit-market-in-2025-is-a-turning-point-what-comes-next-for-2026-and-beyond/)
- [TIMOCOM — Logistics marketplace](https://www.timocom.co.uk)
- [Amazon Freight — Freight brokers explained](https://freight.amazon.co.uk/newsroom/freight-brokers)
