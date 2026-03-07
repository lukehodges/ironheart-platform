# Brokerage Operations Platform — Buildable Blueprint

> Architecture design for transforming Ironheart into a multi-vertical brokerage operations platform. First vertical: BNG/Nutrient Credit Brokerage.

## Executive Summary

Ironheart already has **23 modules, 59 tables, 224+ tests**, and production-grade infrastructure (multi-tenant, RBAC, Stripe Connect, workflow engine, form builder, Inngest events). The codebase is **~60% ready** for a brokerage platform. This blueprint maps the 7 brokerage pillars to existing modules, identifies 3 new modules needed, and designs the vertical configuration layer that makes one codebase serve BNG, real estate, energy, and any future brokerage vertical.

---

## Part 1: Codebase Reuse Audit

### What Already Exists vs What's Needed

```
PILLAR          EXISTING (reuse/extend)              NEW BUILD
────────────    ─────────────────────────            ──────────────────
CRM             customers module (CRUD, merge,       Add contact "side" (supply/demand)
                search, notes, tags, address,        Add pipeline stages to contacts
                lat/lng, geo)

ASSESS          bookings + forms modules             Rename service concepts to
                (scheduling, dispatch, status         "assessment types"
                tracking, form templates,             Add site/property linking
                structured data collection,
                8 field types, public submission)

INVENTORY       ❌ Nothing                           New "inventory" module
                                                     (sites, units, allocations,
                                                      geographic constraints)

MATCH           ❌ Nothing                           New matching logic in
                                                     inventory module
                                                     (constraint-based filtering)

TRANSACT        invoices + payments modules           Add commission split logic
                (Stripe Connect already has           (Stripe Connect transfer_data
                transfer_data + application_fee!)     already supports this!)
                pricingRules, discountCodes,
                taxRules tables

COMPLY          audit module + workflows              New "compliance" module
                (audit logs, automated triggers,      (deadlines, renewals,
                notifications, task creation)          document storage, alerts)

DOCS            forms module (template builder,       Add document categories
                dynamic fields, public submit)        and versioning
                notification module (email/SMS
                templates)
```

### Existing Infrastructure That's Directly Applicable

| Infrastructure | Brokerage Use | Status |
|---|---|---|
| **Multi-tenancy** (`tenants`, `tenantModules`, `organizationSettings`) | Each brokerage firm = 1 tenant | Ready |
| **Module gating** (enable/disable per tenant, Redis-cached) | Enable "inventory" for BNG clients, disable for real estate | Ready |
| **RBAC** (`roles`, `permissions`, `resource:action`) | `deals:write`, `inventory:read`, `compliance:manage` | Ready |
| **Workflow engine** (linear + graph, 20+ node types, Inngest) | Auto-notify on deal stage change, compliance deadline alerts | Ready |
| **Stripe Connect** (`stripeConnectAccounts`, `transfer_data`, `application_fee_amount`) | Commission splits — developer pays → platform takes 20% → landowner receives 80% | Ready |
| **Form builder** (`formTemplates`, `completedForms`, 8 field types) | Assessment report forms, site survey forms, requirement calculators | Ready |
| **Booking system** (slot capacity, staff dispatch, status workflow) | Assessor dispatch, site visit scheduling | Ready |
| **Customer merge** (7-table cascade, audit log) | Merge duplicate landowner/developer records | Ready |
| **Notification system** (email via Resend, SMS via Twilio, templates) | Deal notifications, compliance reminders, assessment reports | Ready |
| **Search** (extensible per-module providers, tenant-gated) | Search across deals, sites, contacts, inventory | Ready |
| **Audit logging** (entity tracking, old/new values, metadata) | Regulatory audit trail for credit allocations | Ready |
| **Analytics** (`metricSnapshots`, dashboard widgets) | Pipeline value, credits sold, commission earned | Ready |
| **Custom labels** (`organizationSettings.customerLabel/bookingLabel/staffLabel`) | "Customer" → "Contact", "Booking" → "Assessment", "Staff" → "Assessor" | Ready |
| **Lat/Lng on customers** (`customers.latitude`, `customers.longitude`) | Geographic proximity for matching | Ready |
| **Tags on customers** (`customers.tags` text array) | Tag contacts as "landowner", "developer", "assessor" | Ready |
| **Projects + Tasks** (`projects`, `tasks`, `projectMembers`) | Deal project management, task assignment | Ready |

---

## Part 2: New Modules

### Module 1: `deals` (The Pipeline)

The core of every brokerage — tracking transactions from lead to completion.

#### Schema: `deals.schema.ts`

```sql
-- New enum
CREATE TYPE "DealSide" AS ENUM ('SUPPLY', 'DEMAND');
CREATE TYPE "DealStage" AS ENUM (
  'LEAD', 'QUALIFIED', 'ASSESSMENT_BOOKED', 'ASSESSMENT_COMPLETE',
  'LEGAL_IN_PROGRESS', 'REGISTERED', 'MATCHED', 'QUOTED',
  'RESERVED', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED', 'ALLOCATED',
  'COMPLETED', 'LOST'
);

-- Contacts are existing customers table, extended with:
ALTER TABLE customers ADD COLUMN "contactSide" "DealSide";  -- SUPPLY or DEMAND
ALTER TABLE customers ADD COLUMN "companyName" TEXT;
ALTER TABLE customers ADD COLUMN "companyType" TEXT;          -- e.g. "housebuilder", "farmer", "landowner"

-- New table: deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dealNumber TEXT NOT NULL,                    -- auto-generated (e.g. "D-0001")
  title TEXT NOT NULL,
  description TEXT,

  -- Parties
  supplyContactId UUID REFERENCES customers(id),   -- landowner/farmer
  demandContactId UUID REFERENCES customers(id),    -- developer/buyer

  -- Pipeline
  stage "DealStage" NOT NULL DEFAULT 'LEAD',
  stageChangedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  probability INTEGER DEFAULT 50,              -- 0-100% likelihood

  -- Financials
  estimatedValue NUMERIC(12,2),               -- total deal value
  commissionRate NUMERIC(5,4) DEFAULT 0.2000, -- 20% default
  commissionAmount NUMERIC(12,2),             -- calculated

  -- Inventory link
  siteId UUID REFERENCES sites(id),           -- linked supply site
  unitType TEXT,                               -- what's being traded
  unitQuantity NUMERIC(12,4),                 -- how many units

  -- Geography
  catchmentArea TEXT,                          -- geographic constraint key

  -- Dates
  expectedCloseDate DATE,
  closedAt TIMESTAMPTZ,
  lostReason TEXT,

  -- Metadata
  assignedToId UUID REFERENCES users(id),     -- deal owner (broker staff)
  tags TEXT[],
  metadata JSONB DEFAULT '{}',                -- vertical-specific data

  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  deletedAt TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,

  UNIQUE(tenantId, dealNumber)
);

CREATE INDEX deals_tenantId_stage_idx ON deals(tenantId, stage);
CREATE INDEX deals_supplyContactId_idx ON deals(supplyContactId);
CREATE INDEX deals_demandContactId_idx ON deals(demandContactId);
CREATE INDEX deals_siteId_idx ON deals(siteId);
CREATE INDEX deals_assignedToId_idx ON deals(assignedToId);
CREATE INDEX deals_catchmentArea_idx ON deals(catchmentArea);

-- Deal activity log (stage changes, notes, emails)
CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealId UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activityType TEXT NOT NULL,                  -- 'stage_change', 'note', 'email', 'call', 'document', 'task'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',                -- type-specific data
  createdById UUID REFERENCES users(id),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX deal_activities_dealId_idx ON deal_activities(dealId);
```

#### Module Files

```
src/modules/deals/
  deals.types.ts         — DealRecord, DealActivity, DealStage, DealSide, DealFilters
  deals.schemas.ts       — Zod: createDeal, updateDeal, moveDealStage, listDeals
  deals.repository.ts    — CRUD + listByStage + listByContact + pipeline aggregates
  deals.service.ts       — createDeal, moveStage (emits events), calculateCommission, matchToInventory
  deals.router.ts        — tenantProcedure for reads, permissionProcedure('deals:write') for mutations
  deals.events.ts        — deal/stage.changed → notify parties, deal/matched → create allocation
  deals.search-provider.ts — search deals by title, contact name, deal number
  index.ts
  __tests__/deals.test.ts
```

#### Key Procedures

| Procedure | Auth | Description |
|---|---|---|
| `deals.list` | tenant | List with filters (stage, contact, assignee, date range) |
| `deals.getById` | tenant | Full deal with contacts, site, activities |
| `deals.create` | permission('deals:write') | Create deal, auto-generate number |
| `deals.update` | permission('deals:write') | Update deal fields |
| `deals.moveStage` | permission('deals:write') | Change stage, log activity, emit event |
| `deals.pipeline` | tenant | Aggregate by stage (Kanban data) |
| `deals.addActivity` | permission('deals:write') | Add note/call/email log |
| `deals.stats` | tenant | KPIs: pipeline value, conversion rate, avg days per stage |

---

### Module 2: `inventory` (Sites, Units, Allocations)

The thing that makes brokerage different from CRM — tracking tradeable units.

#### Schema: `inventory.schema.ts`

```sql
CREATE TYPE "SiteStatus" AS ENUM (
  'PROSPECTING', 'UNDER_ASSESSMENT', 'LEGAL_IN_PROGRESS',
  'REGISTERED', 'ACTIVE', 'FULLY_ALLOCATED', 'EXPIRED', 'WITHDRAWN'
);

CREATE TYPE "AllocationStatus" AS ENUM (
  'RESERVED', 'CONFIRMED', 'DELIVERED', 'CANCELLED'
);

-- Sites: physical locations that generate units (land parcels, properties, etc.)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  siteReference TEXT NOT NULL,                 -- auto-generated (e.g. "S-0001")
  name TEXT NOT NULL,
  description TEXT,

  -- Owner
  contactId UUID REFERENCES customers(id),     -- the landowner/supplier

  -- Location
  addressLine1 TEXT,
  addressLine2 TEXT,
  city TEXT,
  county TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'GB',
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  boundaryGeoJson JSONB,                       -- site boundary polygon (future use)

  -- Geographic constraints
  catchmentArea TEXT,                           -- for nutrient credits
  localAuthority TEXT,                          -- LPA name
  region TEXT,                                  -- broader region

  -- Status
  status "SiteStatus" NOT NULL DEFAULT 'PROSPECTING',
  statusChangedAt TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Registration
  registryReference TEXT,                       -- Natural England gain site ref, etc.
  registeredAt TIMESTAMPTZ,
  registrationCost NUMERIC(10,2),

  -- Legal
  legalAgreementType TEXT,                     -- 'S106', 'CONSERVATION_COVENANT', etc.
  legalAgreementDate TIMESTAMPTZ,
  commitmentYears INTEGER,                     -- 30, 80, 125 etc.
  expiresAt TIMESTAMPTZ,

  -- Capacity
  totalUnits NUMERIC(12,4) DEFAULT 0,          -- total units this site generates
  allocatedUnits NUMERIC(12,4) DEFAULT 0,      -- units already allocated
  availableUnits NUMERIC(12,4) DEFAULT 0,      -- = total - allocated
  unitType TEXT,                                -- 'KG_NITROGEN', 'KG_PHOSPHORUS', 'BNG_UNIT', etc.
  unitPrice NUMERIC(12,2),                      -- price per unit

  -- Assessment
  assessmentDate TIMESTAMPTZ,
  assessmentReportId UUID,                     -- FK to completedForms (site survey)
  assessorId UUID REFERENCES users(id),
  baselineData JSONB,                          -- pre-assessment data (vertical-specific)

  -- Documents & metadata
  documents JSONB DEFAULT '[]',                -- [{name, url, type, uploadedAt}]
  metadata JSONB DEFAULT '{}',                 -- vertical-specific fields
  tags TEXT[],

  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  deletedAt TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,

  UNIQUE(tenantId, siteReference)
);

CREATE INDEX sites_tenantId_status_idx ON sites(tenantId, status);
CREATE INDEX sites_contactId_idx ON sites(contactId);
CREATE INDEX sites_catchmentArea_idx ON sites(catchmentArea);
CREATE INDEX sites_unitType_idx ON sites(unitType);
CREATE INDEX sites_localAuthority_idx ON sites(localAuthority);

-- Allocations: linking units from a site to a deal/development
CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  allocationReference TEXT NOT NULL,           -- "A-0001"

  siteId UUID NOT NULL REFERENCES sites(id),
  dealId UUID REFERENCES deals(id),
  demandContactId UUID REFERENCES customers(id), -- the developer/buyer

  unitType TEXT NOT NULL,
  unitQuantity NUMERIC(12,4) NOT NULL,
  unitPrice NUMERIC(12,2) NOT NULL,
  totalValue NUMERIC(12,2) NOT NULL,

  -- Status
  status "AllocationStatus" NOT NULL DEFAULT 'RESERVED',
  reservedAt TIMESTAMPTZ DEFAULT now(),
  confirmedAt TIMESTAMPTZ,
  deliveredAt TIMESTAMPTZ,
  cancelledAt TIMESTAMPTZ,
  cancellationReason TEXT,

  -- External references
  planningReference TEXT,                      -- developer's planning app ref
  registryAllocationRef TEXT,                  -- Natural England allocation ref

  metadata JSONB DEFAULT '{}',
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,

  UNIQUE(tenantId, allocationReference)
);

CREATE INDEX allocations_siteId_idx ON allocations(siteId);
CREATE INDEX allocations_dealId_idx ON allocations(dealId);
CREATE INDEX allocations_tenantId_status_idx ON allocations(tenantId, status);

-- Unit types: configurable per tenant (vertical-specific)
CREATE TABLE unit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                           -- 'KG_NITROGEN', 'BNG_UNIT', 'LISTING', etc.
  name TEXT NOT NULL,                           -- 'Nitrogen Credit (kg/year)'
  description TEXT,
  unit TEXT NOT NULL,                           -- 'kg/year', 'unit', 'sqft', etc.
  hasGeographicConstraint BOOLEAN DEFAULT false,
  constraintField TEXT,                         -- 'catchmentArea', 'localAuthority', 'region'
  sortOrder INTEGER DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenantId, code)
);
```

#### Module Files

```
src/modules/inventory/
  inventory.types.ts      — SiteRecord, AllocationRecord, UnitType, SiteFilters
  inventory.schemas.ts    — Zod: createSite, updateSite, createAllocation, matchAvailability
  inventory.repository.ts — Site CRUD, allocation CRUD, availability queries, geographic filtering
  inventory.service.ts    — createSite, allocateUnits (atomic: decrement available, create allocation),
                            releaseAllocation, matchSupplyToDemand, getAvailability
  inventory.router.ts     — CRUD + matching + availability endpoints
  inventory.events.ts     — site/registered, allocation/created, inventory/low-stock alerts
  inventory.search-provider.ts
  index.ts
  __tests__/inventory.test.ts
```

#### Matching Logic (The Core Differentiator)

```typescript
// inventory.service.ts — matchSupplyToDemand()
async function matchSupplyToDemand(input: {
  tenantId: string
  unitType: string
  quantityNeeded: number
  constraints: Record<string, string>  // e.g. { catchmentArea: "Solent" }
}) {
  // 1. Find sites with available units matching type + constraints
  const sites = await repo.findAvailableSites({
    tenantId: input.tenantId,
    unitType: input.unitType,
    minAvailable: input.quantityNeeded,
    ...input.constraints
  })

  // 2. Rank by: price (ascending), proximity (if lat/lng provided), available quantity
  const ranked = rankSites(sites, input)

  // 3. Return top matches with pricing
  return ranked.map(site => ({
    siteId: site.id,
    siteName: site.name,
    availableUnits: site.availableUnits,
    unitPrice: site.unitPrice,
    totalCost: site.unitPrice * input.quantityNeeded,
    commissionAmount: site.unitPrice * input.quantityNeeded * 0.20,
    constraints: { catchmentArea: site.catchmentArea },
  }))
}
```

---

### Module 3: `compliance` (Deadlines, Monitoring, Documents)

Tracks post-sale obligations — the 30-125 year tail.

#### Schema: `compliance.schema.ts`

```sql
CREATE TYPE "ComplianceItemStatus" AS ENUM (
  'UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'WAIVED', 'NOT_APPLICABLE'
);

CREATE TYPE "ComplianceFrequency" AS ENUM (
  'ONE_OFF', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL', 'CUSTOM'
);

CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What it relates to
  siteId UUID REFERENCES sites(id),
  dealId UUID REFERENCES deals(id),
  contactId UUID REFERENCES customers(id),

  -- The obligation
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,                      -- 'MONITORING', 'REPORTING', 'LEGAL', 'FINANCIAL', 'REGISTRATION'

  -- Timing
  dueDate TIMESTAMPTZ NOT NULL,
  frequency "ComplianceFrequency" DEFAULT 'ONE_OFF',
  nextDueDate TIMESTAMPTZ,                     -- for recurring items

  -- Status
  status "ComplianceItemStatus" NOT NULL DEFAULT 'UPCOMING',
  completedAt TIMESTAMPTZ,
  completedById UUID REFERENCES users(id),
  completionNotes TEXT,

  -- Assignment
  assignedToId UUID REFERENCES users(id),

  -- Alerts
  reminderDaysBefore INTEGER[] DEFAULT '{30,7,1}',
  lastReminderSentAt TIMESTAMPTZ,

  -- Documents
  documents JSONB DEFAULT '[]',                -- [{name, url, type, uploadedAt}]

  metadata JSONB DEFAULT '{}',
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX compliance_items_tenantId_status_idx ON compliance_items(tenantId, status);
CREATE INDEX compliance_items_dueDate_idx ON compliance_items(dueDate);
CREATE INDEX compliance_items_siteId_idx ON compliance_items(siteId);
CREATE INDEX compliance_items_dealId_idx ON compliance_items(dealId);
CREATE INDEX compliance_items_assignedToId_idx ON compliance_items(assignedToId);
```

#### Module Files

```
src/modules/compliance/
  compliance.types.ts       — ComplianceItem, ComplianceFrequency, ComplianceFilters
  compliance.schemas.ts     — Zod: create, update, complete, listByStatus
  compliance.repository.ts  — CRUD + listOverdue + listUpcoming + listBySite
  compliance.service.ts     — create, complete, generateNextOccurrence (for recurring),
                              getOverdueCount, sendReminders
  compliance.router.ts      — CRUD + dashboard summary endpoints
  compliance.events.ts      — Inngest cron: daily check for due items → send reminders
  compliance.search-provider.ts
  index.ts
  __tests__/compliance.test.ts
```

---

## Part 3: Extending Existing Modules

### Customer Module — Add Contact Sides

```sql
-- Add columns to existing customers table
ALTER TABLE customers ADD COLUMN "contactSide" "DealSide";     -- 'SUPPLY' or 'DEMAND'
ALTER TABLE customers ADD COLUMN "companyName" TEXT;
ALTER TABLE customers ADD COLUMN "companyType" TEXT;
```

Update `customer.types.ts` and `customer.schemas.ts` to include new fields. Add filter by `contactSide` to list procedure.

### Booking Module — Assessor Dispatch

Already supports staff assignment, scheduling, status tracking. Just needs:
- Assessment-specific form templates (create via forms module)
- Link booking to site: `bookings.projectId` can reference a site (or add `bookings.siteId`)
- Label customisation: `organizationSettings.bookingLabel = 'assessment'`

### Payment Module — Commission Splits

Stripe Connect `transfer_data` already exists in `stripe.provider.ts`. The flow:

```
Developer pays £100,000 to platform Stripe account
  → application_fee_amount: £20,000 (broker's 20%)
  → transfer_data.destination: landowner's connected Stripe account (£80,000)
```

This is already built. Just needs:
- Commission rate from `deals.commissionRate`
- Connected account from landowner's Stripe Connect setup
- Invoice generation with line items showing commission split

---

## Part 4: The Vertical Configuration Layer

This is what makes one codebase serve BNG, real estate, energy, and any future vertical.

### How It Works

Each tenant gets a **vertical template** that configures:

```typescript
// src/shared/verticals/vertical.types.ts
interface VerticalTemplate {
  slug: string                    // 'bng-nutrient', 'real-estate', 'energy'
  name: string                    // 'Environmental Credits', 'Real Estate', 'Energy Brokerage'

  // Module configuration
  enabledModules: string[]        // which modules to enable

  // Label overrides
  labels: {
    customer: string              // 'Contact' | 'Client' | 'Vendor'
    booking: string               // 'Assessment' | 'Viewing' | 'Audit'
    staff: string                 // 'Assessor' | 'Agent' | 'Consultant'
    supplyPartner: string         // 'Landowner' | 'Vendor' | 'Supplier'
    demandPartner: string         // 'Developer' | 'Buyer' | 'Consumer'
    unit: string                  // 'Credit' | 'Listing' | 'Contract'
    site: string                  // 'Site' | 'Property' | 'Account'
    deal: string                  // 'Deal' | 'Transaction' | 'Instruction'
  }

  // Deal pipeline stages (customisable per vertical)
  dealStages: {
    key: string                   // enum value
    label: string                 // display name
    color: string                 // badge colour
    side: 'supply' | 'demand' | 'both'
  }[]

  // Unit types pre-configured
  unitTypes: {
    code: string
    name: string
    unit: string
    hasGeographicConstraint: boolean
    constraintField?: string
  }[]

  // Assessment form templates (seeded on tenant creation)
  assessmentForms: {
    name: string
    fields: FormField[]
  }[]

  // Compliance templates (auto-created on deal completion)
  complianceTemplates: {
    title: string
    category: string
    frequency: ComplianceFrequency
    reminderDaysBefore: number[]
    offsetFromDealClose: number   // days after deal closes
  }[]

  // Dashboard widgets
  dashboardWidgets: string[]
}
```

### Vertical: BNG / Nutrient Credits

```typescript
const bngNutrientVertical: VerticalTemplate = {
  slug: 'bng-nutrient',
  name: 'Environmental Credits Brokerage',

  enabledModules: ['deals', 'inventory', 'compliance', 'customer', 'booking',
                    'forms', 'payment', 'workflow', 'notification', 'analytics'],

  labels: {
    customer: 'Contact',
    booking: 'Site Assessment',
    staff: 'Assessor',
    supplyPartner: 'Landowner',
    demandPartner: 'Developer',
    unit: 'Credit',
    site: 'Gain Site',
    deal: 'Deal',
  },

  dealStages: [
    { key: 'LEAD', label: 'Lead', color: 'gray', side: 'both' },
    { key: 'QUALIFIED', label: 'Qualified', color: 'blue', side: 'both' },
    { key: 'ASSESSMENT_BOOKED', label: 'Assessment Booked', color: 'indigo', side: 'supply' },
    { key: 'ASSESSMENT_COMPLETE', label: 'Assessment Complete', color: 'purple', side: 'supply' },
    { key: 'LEGAL_IN_PROGRESS', label: 'S106 In Progress', color: 'amber', side: 'supply' },
    { key: 'REGISTERED', label: 'NE Registered', color: 'green', side: 'supply' },
    { key: 'MATCHED', label: 'Matched to Developer', color: 'blue', side: 'demand' },
    { key: 'QUOTED', label: 'Quote Sent', color: 'indigo', side: 'demand' },
    { key: 'RESERVED', label: 'Credits Reserved', color: 'amber', side: 'demand' },
    { key: 'CONTRACT_SIGNED', label: 'Contract Signed', color: 'purple', side: 'demand' },
    { key: 'PAYMENT_RECEIVED', label: 'Payment Received', color: 'green', side: 'demand' },
    { key: 'ALLOCATED', label: 'Credits Allocated', color: 'emerald', side: 'demand' },
    { key: 'COMPLETED', label: 'Completed', color: 'green', side: 'both' },
    { key: 'LOST', label: 'Lost', color: 'red', side: 'both' },
  ],

  unitTypes: [
    { code: 'KG_NITROGEN', name: 'Nitrogen Credit', unit: 'kg/year', hasGeographicConstraint: true, constraintField: 'catchmentArea' },
    { code: 'KG_PHOSPHORUS', name: 'Phosphorus Credit', unit: 'kg/year', hasGeographicConstraint: true, constraintField: 'catchmentArea' },
    { code: 'BNG_UNIT', name: 'Biodiversity Unit', unit: 'unit', hasGeographicConstraint: true, constraintField: 'localAuthority' },
  ],

  assessmentForms: [
    {
      name: 'Nutrient Site Assessment',
      fields: [
        { type: 'SELECT', label: 'Current Land Use', options: ['Arable', 'Pasture', 'Dairy', 'Woodland', 'Wetland', 'Other'] },
        { type: 'NUMBER', label: 'Site Area (hectares)' },
        { type: 'SELECT', label: 'Soil Type', options: ['Clay', 'Sandy', 'Loam', 'Peat', 'Chalk'] },
        { type: 'TEXT', label: 'Catchment Area' },
        { type: 'NUMBER', label: 'Current Nutrient Loading (kg N/year)' },
        { type: 'NUMBER', label: 'Proposed Loading (kg N/year)' },
        { type: 'NUMBER', label: 'Credit Generation Potential (kg/year)' },
        { type: 'SELECT', label: 'Mitigation Type', options: ['Land Use Change', 'Management Solutions', 'Constructed Wetland'] },
        { type: 'TEXTAREA', label: 'Assessor Notes' },
        { type: 'FILE', label: 'Assessment Report' },
      ],
    },
    {
      name: 'BNG Baseline Survey',
      fields: [
        { type: 'NUMBER', label: 'Site Area (hectares)' },
        { type: 'SELECT', label: 'Habitat Type', options: ['Grassland', 'Woodland', 'Wetland', 'Heathland', 'Arable', 'Urban'] },
        { type: 'SELECT', label: 'Habitat Condition', options: ['Poor', 'Fairly Poor', 'Moderate', 'Fairly Good', 'Good'] },
        { type: 'NUMBER', label: 'Baseline Biodiversity Units' },
        { type: 'NUMBER', label: 'Projected Enhancement Units' },
        { type: 'NUMBER', label: 'Net BNG Units' },
        { type: 'TEXT', label: 'Local Nature Recovery Strategy Alignment' },
        { type: 'TEXTAREA', label: 'Enhancement Plan Summary' },
        { type: 'FILE', label: 'Statutory Metric Calculation' },
        { type: 'FILE', label: 'HMMP Document' },
      ],
    },
  ],

  complianceTemplates: [
    { title: 'Annual Habitat Monitoring Report', category: 'MONITORING', frequency: 'ANNUAL', reminderDaysBefore: [30, 7], offsetFromDealClose: 365 },
    { title: 'Natural England Registry Update', category: 'REGISTRATION', frequency: 'ANNUAL', reminderDaysBefore: [30, 7], offsetFromDealClose: 365 },
    { title: 'LPA Condition Discharge Evidence', category: 'LEGAL', frequency: 'ONE_OFF', reminderDaysBefore: [14, 7, 1], offsetFromDealClose: 30 },
    { title: 'S106 Compliance Review', category: 'LEGAL', frequency: 'BIANNUAL', reminderDaysBefore: [30, 7], offsetFromDealClose: 180 },
  ],

  dashboardWidgets: ['pipeline-value', 'credits-available', 'credits-allocated', 'commission-earned', 'overdue-compliance', 'deals-by-stage'],
}
```

### Vertical: Real Estate

```typescript
const realEstateVertical: VerticalTemplate = {
  slug: 'real-estate',
  name: 'Real Estate Brokerage',

  enabledModules: ['deals', 'inventory', 'compliance', 'customer', 'booking',
                    'forms', 'payment', 'workflow', 'notification', 'analytics'],

  labels: {
    customer: 'Contact',
    booking: 'Viewing',
    staff: 'Agent',
    supplyPartner: 'Vendor',
    demandPartner: 'Buyer',
    unit: 'Listing',
    site: 'Property',
    deal: 'Instruction',
  },

  dealStages: [
    { key: 'LEAD', label: 'Enquiry', color: 'gray', side: 'both' },
    { key: 'QUALIFIED', label: 'Qualified', color: 'blue', side: 'both' },
    { key: 'ASSESSMENT_BOOKED', label: 'Valuation Booked', color: 'indigo', side: 'supply' },
    { key: 'ASSESSMENT_COMPLETE', label: 'Valued', color: 'purple', side: 'supply' },
    { key: 'REGISTERED', label: 'On Market', color: 'green', side: 'supply' },
    { key: 'MATCHED', label: 'Viewings Arranged', color: 'blue', side: 'demand' },
    { key: 'QUOTED', label: 'Offer Made', color: 'indigo', side: 'demand' },
    { key: 'RESERVED', label: 'Under Offer', color: 'amber', side: 'demand' },
    { key: 'CONTRACT_SIGNED', label: 'Exchanged', color: 'purple', side: 'demand' },
    { key: 'COMPLETED', label: 'Completed', color: 'green', side: 'both' },
    { key: 'LOST', label: 'Fallen Through', color: 'red', side: 'both' },
  ],

  unitTypes: [
    { code: 'RESIDENTIAL_SALE', name: 'Residential Sale', unit: 'property', hasGeographicConstraint: true, constraintField: 'region' },
    { code: 'COMMERCIAL_LEASE', name: 'Commercial Lease', unit: 'sqft', hasGeographicConstraint: true, constraintField: 'localAuthority' },
    { code: 'COMMERCIAL_SALE', name: 'Commercial Sale', unit: 'property', hasGeographicConstraint: true, constraintField: 'region' },
  ],

  assessmentForms: [
    {
      name: 'Property Valuation',
      fields: [
        { type: 'SELECT', label: 'Property Type', options: ['Detached', 'Semi-Detached', 'Terraced', 'Flat', 'Bungalow', 'Commercial'] },
        { type: 'NUMBER', label: 'Bedrooms' },
        { type: 'NUMBER', label: 'Bathrooms' },
        { type: 'NUMBER', label: 'Square Footage' },
        { type: 'SELECT', label: 'Condition', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Renovation'] },
        { type: 'NUMBER', label: 'Estimated Value (£)' },
        { type: 'NUMBER', label: 'Recommended Asking Price (£)' },
        { type: 'TEXTAREA', label: 'Agent Notes' },
        { type: 'FILE', label: 'EPC Certificate' },
        { type: 'FILE', label: 'Floor Plan' },
      ],
    },
  ],

  complianceTemplates: [
    { title: 'AML Identity Check', category: 'LEGAL', frequency: 'ONE_OFF', reminderDaysBefore: [7, 1], offsetFromDealClose: -30 },
    { title: 'EPC Renewal', category: 'REGISTRATION', frequency: 'ANNUAL', reminderDaysBefore: [90, 30], offsetFromDealClose: 0 },
    { title: 'Deposit Protection Confirmation', category: 'FINANCIAL', frequency: 'ONE_OFF', reminderDaysBefore: [7, 1], offsetFromDealClose: 7 },
  ],

  dashboardWidgets: ['pipeline-value', 'properties-on-market', 'viewings-booked', 'commission-earned', 'days-on-market-avg', 'deals-by-stage'],
}
```

### Vertical: Energy Brokerage

```typescript
const energyVertical: VerticalTemplate = {
  slug: 'energy',
  name: 'Energy Brokerage',

  labels: {
    customer: 'Client',
    booking: 'Energy Audit',
    staff: 'Consultant',
    supplyPartner: 'Supplier',
    demandPartner: 'Business',
    unit: 'Contract',
    site: 'Meter Point',
    deal: 'Renewal',
  },

  dealStages: [
    { key: 'LEAD', label: 'Lead', color: 'gray', side: 'demand' },
    { key: 'QUALIFIED', label: 'LOA Signed', color: 'blue', side: 'demand' },
    { key: 'ASSESSMENT_COMPLETE', label: 'Consumption Analysed', color: 'purple', side: 'demand' },
    { key: 'QUOTED', label: 'Quotes Received', color: 'indigo', side: 'demand' },
    { key: 'RESERVED', label: 'Quote Accepted', color: 'amber', side: 'demand' },
    { key: 'CONTRACT_SIGNED', label: 'Contract Live', color: 'green', side: 'demand' },
    { key: 'COMPLETED', label: 'Completed', color: 'green', side: 'both' },
    { key: 'LOST', label: 'Lost', color: 'red', side: 'both' },
  ],

  unitTypes: [
    { code: 'GAS_CONTRACT', name: 'Gas Contract', unit: 'kWh/year', hasGeographicConstraint: false },
    { code: 'ELEC_CONTRACT', name: 'Electricity Contract', unit: 'kWh/year', hasGeographicConstraint: false },
    { code: 'WATER_CONTRACT', name: 'Water Contract', unit: 'm3/year', hasGeographicConstraint: false },
  ],

  complianceTemplates: [
    { title: 'Contract Renewal Reminder', category: 'FINANCIAL', frequency: 'ANNUAL', reminderDaysBefore: [180, 90, 30], offsetFromDealClose: 365 },
    { title: 'Ofgem TPI Disclosure', category: 'LEGAL', frequency: 'ONE_OFF', reminderDaysBefore: [7], offsetFromDealClose: 0 },
  ],

  dashboardWidgets: ['pipeline-value', 'renewals-due', 'commission-earned', 'contracts-live', 'avg-savings'],
}
```

---

## Part 5: Frontend Architecture

### New Pages

```
src/app/admin/
├── deals/                     ← NEW
│   ├── page.tsx              # Kanban pipeline view (adapt bp2-demo)
│   └── [id]/page.tsx         # Deal detail (contacts, site, activities, docs)
├── sites/                     ← NEW (or "properties" / "gain-sites" via label)
│   ├── page.tsx              # Site list with map + table toggle
│   └── [id]/page.tsx         # Site detail (units, allocations, assessments, docs)
├── inventory/                 ← NEW
│   └── page.tsx              # Availability dashboard (units by type, geography)
├── compliance/                ← NEW
│   └── page.tsx              # Calendar + list view of deadlines
├── matching/                  ← NEW
│   └── page.tsx              # Supply/demand matching tool
```

### Reusable Components (Already Built)

| Component | Use In Brokerage |
|---|---|
| **DataGrid** | Sites table, allocation list, compliance list |
| **Detail Sheet** | Deal detail, site detail, contact detail |
| **Filter Toolbar** | Deal stage filter, unit type filter, geography filter |
| **Status Pipeline** | Deal stage progress bar |
| **Stat Cards** | Dashboard KPIs |
| **Kanban (bp2-demo)** | Deal pipeline view — port from mockup to real component |
| **Form Builder** | Assessment forms, requirement forms |
| **Calendar views** | Compliance calendar, assessment scheduling |

### New Components Needed

| Component | Description |
|---|---|
| **DealKanban** | Drag-and-drop Kanban board (adapt bp2-demo `deals-pipeline`) |
| **SiteMap** | Map view of sites with pins (Leaflet/Mapbox — geographic visual) |
| **MatchingPanel** | Side-by-side: demand requirements ↔ available supply sites |
| **ComplianceCalendar** | Calendar grid with deadline items colour-coded by urgency |
| **CommissionBreakdown** | Visual showing deal value → commission → payout splits |
| **InventoryGauge** | Donut/bar showing allocated vs available per unit type |

---

## Part 6: Build Sequence

### Wave 1: Schema + Types (2-3 days)
- [ ] Create `deals.schema.ts` (deals, deal_activities tables)
- [ ] Create `inventory.schema.ts` (sites, allocations, unit_types tables)
- [ ] Create `compliance.schema.ts` (compliance_items table)
- [ ] Extend `customer.schema.ts` (add contactSide, companyName, companyType)
- [ ] Create types + schemas for all 3 new modules
- [ ] Run migration

### Wave 2: Repositories + Services (3-4 days)
- [ ] `deals.repository.ts` + `deals.service.ts`
- [ ] `inventory.repository.ts` + `inventory.service.ts` (including matching logic)
- [ ] `compliance.repository.ts` + `compliance.service.ts`
- [ ] Update customer repository for contactSide filtering

### Wave 3: Routers + Events + Wiring (2-3 days)
- [ ] `deals.router.ts` + `deals.events.ts`
- [ ] `inventory.router.ts` + `inventory.events.ts`
- [ ] `compliance.router.ts` + `compliance.events.ts`
- [ ] Register all in `root.ts` and `register-all.ts`
- [ ] Add search providers
- [ ] Add Inngest events to `inngest.ts`

### Wave 4: Vertical Config Layer (1-2 days)
- [ ] `src/shared/verticals/vertical.types.ts`
- [ ] `src/shared/verticals/bng-nutrient.ts`
- [ ] `src/shared/verticals/real-estate.ts`
- [ ] Vertical seeding in platform tenant creation
- [ ] Label resolution in frontend (read from organizationSettings)

### Wave 5: Frontend — Deal Pipeline (3-4 days)
- [ ] Port bp2-demo Kanban to real `DealKanban` component
- [ ] `/admin/deals/page.tsx` — Kanban view with drag-drop stage changes
- [ ] `/admin/deals/[id]/page.tsx` — Deal detail with activity feed
- [ ] Deal creation dialog
- [ ] Deal filters (stage, contact, assignee, date)

### Wave 6: Frontend — Sites + Inventory (2-3 days)
- [ ] `/admin/sites/page.tsx` — Table + map toggle
- [ ] `/admin/sites/[id]/page.tsx` — Site detail with units, allocations, documents
- [ ] `/admin/inventory/page.tsx` — Availability dashboard
- [ ] Allocation creation flow (from deal or from site)

### Wave 7: Frontend — Compliance + Matching (2-3 days)
- [ ] `/admin/compliance/page.tsx` — Calendar + list view
- [ ] `/admin/matching/page.tsx` — Supply/demand matching tool
- [ ] Commission breakdown component
- [ ] Dashboard widgets

### Wave 8: Tests + Polish (2-3 days)
- [ ] Tests for all 3 new modules (target: 50+ new tests)
- [ ] tsc clean, build passes
- [ ] End-to-end flow: create contact → create site → assess → register → match → deal → allocate → comply

### Total Estimate: ~20-25 days of development

---

## Part 7: Inngest Events (New)

Add to `src/shared/inngest.ts`:

```typescript
// Deals
'deal/created':        { dealId, tenantId, stage }
'deal/stage.changed':  { dealId, tenantId, fromStage, toStage, dealTitle }
'deal/matched':        { dealId, tenantId, siteId, demandContactId }
'deal/completed':      { dealId, tenantId, totalValue, commissionAmount }
'deal/lost':           { dealId, tenantId, reason }

// Inventory
'site/registered':     { siteId, tenantId, registryReference }
'allocation/created':  { allocationId, tenantId, siteId, dealId, unitQuantity }
'allocation/confirmed':{ allocationId, tenantId }
'allocation/cancelled':{ allocationId, tenantId, reason }
'inventory/low-stock': { tenantId, unitType, remainingUnits }

// Compliance
'compliance/due-soon':    { complianceItemId, tenantId, dueDate, daysBefore }
'compliance/overdue':     { complianceItemId, tenantId, dueDate }
'compliance/completed':   { complianceItemId, tenantId }
```

---

## Part 8: Why This Works for Multiple Verticals

The architecture separates **mechanism** from **policy**:

| Layer | Mechanism (shared) | Policy (per-vertical) |
|---|---|---|
| **Data** | deals, sites, allocations, compliance_items tables | Unit types, deal stages, form fields via vertical config |
| **Logic** | CRUD, matching algorithm, commission calculation, compliance cron | Matching constraints, commission rates, compliance schedules via config |
| **UI** | DataGrid, Kanban, DetailSheet, FilterToolbar, Calendar | Labels, colours, visible fields, dashboard widgets via config |
| **Events** | deal/stage.changed, compliance/overdue | Which events trigger which workflows via tenant workflow config |

Adding a new vertical = creating a new `VerticalTemplate` config object (~100 lines) + seeding it on tenant creation. No new code, no new tables, no new modules.

---

## Sources

- Codebase audit: 23 modules, 59 tables, 224+ tests analysed
- Infrastructure audit: tRPC, Inngest, module system, auth, Stripe Connect
- Frontend audit: 156 components, shadcn/Radix, DataGrid, bp2-demo mockups
- Business process: `docs/plans/2026-03-06-nutrient-bng-brokerage-research.md`
