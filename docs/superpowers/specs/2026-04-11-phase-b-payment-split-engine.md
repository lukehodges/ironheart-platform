# Phase B — Payment Split Engine
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A (jobs + resources model)
**Unlocks:** Any client with commission splits, entertainer pay, practitioner fees, driver wages

---

## Goal

Replace every hardcoded payment split calculation with a rule-based engine. The Cotswold 258-line split file, the mileage lookup table, and the approval-config business-type switch are all deleted. Their logic becomes rows in the database.

---

## New Tables

### `splitRecipients`
Who gets paid. Can be a staff resource, an external party, the platform itself, or a named account.

```sql
splitRecipients {
  id              uuid PK
  tenantId        uuid FK → tenants
  name            text  -- 'Agency', 'Entertainer', 'Platform Fee'
  type            enum: RESOURCE | EXTERNAL_PARTY | PLATFORM | INTERNAL_ACCOUNT
  resourceId      uuid FK → resources (nullable — for RESOURCE type)
  externalEmail   text (nullable)
  paymentDetails  jsonb -- { stripeAccountId, bankSortCode, etc. }
  isActive        bool
  createdAt
}
```

### `splitLookupTables`
Table-driven cost lookups. Replaces the hardcoded Cotswold mileage cost table. A tenant can have multiple lookup tables (mileage, weight, volume, etc.).

```sql
splitLookupTables {
  id          uuid PK
  tenantId    uuid FK → tenants
  name        text  -- 'Cotswold Mileage Cost', 'Weight-Based Rate'
  lookupType  enum: TIME_MINUTES | DISTANCE_MILES | DISTANCE_KM | WEIGHT_KG | VOLUME_M3
  rows        jsonb -- [{ from: 0, to: 30, value: 0 }, { from: 30, to: 35, value: 5 }, ...]
  createdAt
}
```

### `splitRules`
Ordered list of rules evaluated at invoice generation time. Rules are evaluated in sequence order. Each rule produces one invoice line item for one recipient.

```sql
splitRules {
  id              uuid PK
  tenantId        uuid FK → tenants
  serviceId       uuid FK → services (nullable — null = applies to all services)
  recipientId     uuid FK → splitRecipients
  sequence        int  -- evaluation order (1, 2, 3...)
  type            enum: FIXED | PERCENTAGE | REMAINDER | LOOKUP | FORMULA
  value           decimal(10,4) (nullable) -- amount for FIXED; rate for PERCENTAGE
  lookupTableId   uuid FK → splitLookupTables (nullable — for LOOKUP type)
  lookupInput     text (nullable) -- field path to look up: 'job.travelMinutes'
  formula         text (nullable) -- for FORMULA: '(timeEntries.totalHours * resource.hourlyRate) + materials.totalCost'
  condition       jsonb (nullable) -- when rule applies: { field: 'job.locationType', op: 'neq', value: 'VENUE' }
  paymentTiming   enum: ON_CONFIRMATION | ON_COMPLETION | DAYS_BEFORE | DAYS_AFTER
  timingDays      int (nullable) -- for DAYS_BEFORE / DAYS_AFTER
  label           text -- invoice line item label: 'Agency Deposit', 'Entertainer Fee', 'Mileage'
  isActive        bool
  createdAt
}
```

---

## Engine Implementation

### Location
```
src/modules/payments/lib/split-engine.ts
```

### Interface

```typescript
interface SplitInput {
  job: Job
  resources: Resource[]
  travelMinutes?: number
  travelMiles?: number
  timeEntries?: JobTimeEntry[]
  materials?: JobMaterial[]
  customFields?: Record<string, unknown>
}

interface SplitResult {
  lines: InvoiceLine[]
  totalAmount: number
  recipients: { recipientId: string; amount: number; timing: PaymentTiming }[]
}

async function evaluateSplitRules(
  tenantId: string,
  serviceId: string,
  input: SplitInput
): Promise<SplitResult>
```

### Evaluation Logic

1. Load all active `splitRules` for `tenantId` where `serviceId` matches or is null, ordered by `sequence`
2. For each rule:
   - Evaluate `condition` against `input` — skip rule if condition is false
   - Calculate amount based on `type`:
     - `FIXED` → use `value` directly
     - `PERCENTAGE` → `value / 100 * currentTotal`
     - `LOOKUP` → resolve `lookupInput` field path from `input`, find matching row in `lookupTable.rows`
     - `REMAINDER` → `totalJobAmount - sum(previousLines)`
     - `FORMULA` → evaluate formula expression against `input` context (safe arithmetic only, same expression evaluator as workflow engine)
   - Create `InvoiceLine` for `recipientId` with calculated amount and `label`
3. Return all lines + total

### Condition Evaluator

Conditions use the same JSONLogic-compatible format as the workflow engine:
```json
{ "field": "job.locationType", "op": "neq", "value": "VENUE" }
{ "field": "job.travelMinutes", "op": "gt", "value": 30 }
{ "and": [...] }
```

---

## Cotswold Migration

The 258-line `cotswold-splits.ts` file is replaced by these database rows:

**splitRecipients:**
- `Agency` (INTERNAL_ACCOUNT)
- `Entertainer` (RESOURCE — references the assigned resource)

**splitLookupTables:**
- `Cotswold Mileage Cost` (TIME_MINUTES):
  `[{from:0,to:30,val:0},{from:30,to:35,val:5},{from:35,to:40,val:10},{from:40,to:46,val:20},{from:46,to:51,val:30},{from:51,to:56,val:40},{from:56,to:61,val:50},{from:61,to:66,val:60}]`

**splitRules (sequence order):**
1. `Agency Deposit` — FIXED £100 → Agency, ON_CONFIRMATION
2. `Mileage` — LOOKUP (travelMinutes → Cotswold Mileage Cost) → Entertainer, ON_COMPLETION, condition: locationType ≠ VENUE
3. `Entertainer Fee` — REMAINDER → Entertainer, DAYS_BEFORE 14

The per-name entertainer home postcodes (`bryony → GL15 5AA`) become `resources.homeAddressId` rows in the `addresses` table. The split engine looks up the assigned resource's home address for travel calculation — no name matching in code.

---

## Module Structure

```
src/modules/payments/
  payments.types.ts        -- extend with SplitRule, SplitRecipient, SplitResult
  payments.schemas.ts      -- Zod schemas for split rule CRUD
  payments.repository.ts   -- split rule/recipient/lookup CRUD queries
  lib/
    split-engine.ts        -- NEW: evaluateSplitRules()
    invoice-generator.ts   -- updated: calls split engine, creates invoice + lines
  payments.router.ts       -- add splitRule, splitRecipient, splitLookupTable procedures
  __tests__/
    split-engine.test.ts   -- NEW
```

---

## Router Procedures

```typescript
payments.splitRecipient.create
payments.splitRecipient.update
payments.splitRecipient.list
payments.splitRecipient.delete

payments.splitRule.create
payments.splitRule.update
payments.splitRule.list
payments.splitRule.reorder  -- update sequence numbers atomically
payments.splitRule.delete

payments.splitLookupTable.create
payments.splitLookupTable.update
payments.splitLookupTable.list
payments.splitLookupTable.delete
```

---

## Tests

`split-engine.test.ts` must cover:
- FIXED rule generates correct line item
- PERCENTAGE rule calculates correctly
- REMAINDER rule sums previous lines correctly
- LOOKUP rule finds correct table row for edge values (boundary conditions)
- FORMULA rule evaluates time + materials correctly
- Condition: rule skipped when condition is false
- Condition: rule applied when condition is true
- Sequence: rules evaluated in order (REMAINDER after PERCENTAGE)
- Cotswold scenario: full split matches expected output for known job values
- Unknown service: falls back to global rules (serviceId = null)
- Multiple recipients: all get correct amounts, total = job price

---

## Definition of Done

- [ ] `splitRecipients`, `splitRules`, `splitLookupTables` tables created
- [ ] `evaluateSplitRules()` engine implemented and tested
- [ ] Invoice generator calls split engine instead of any hardcoded logic
- [ ] Cotswold config rows seeded in tenant seed script
- [ ] `cotswold-splits.ts` deleted
- [ ] `approval-config.ts` business-type switch deleted
- [ ] Entertainer home addresses migrated to `resources.homeAddressId` in `addresses` table
- [ ] All split engine tests pass
- [ ] Existing payment/approval tests updated to use engine
- [ ] tsc passes, build passes
