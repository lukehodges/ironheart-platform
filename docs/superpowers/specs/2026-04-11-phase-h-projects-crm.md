# Phase H — Projects & CRM
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A, Phase G (time tracking for project billing)
**Unlocks:** Consultants, architects, agencies, IT projects, any milestone-based engagement

---

## Goal

Group multiple jobs under a project with phases. Invoice on milestone completion, not per-job. Track prospects through a CRM pipeline from first contact to signed contract.

---

## New Tables

### `projects`
Top-level engagement container. A project has phases; phases have jobs.

```sql
projects {
  id              uuid PK
  tenantId        uuid FK → tenants
  customerId      uuid FK → customers
  name            text
  description     text (nullable)
  status          enum: SCOPING | ACTIVE | ON_HOLD | COMPLETED | CANCELLED
  startDate       date (nullable)
  targetEndDate   date (nullable)
  actualEndDate   date (nullable)
  totalValue      decimal(10,2) (nullable)  -- agreed project value
  billingStrategy enum: FIXED_MILESTONES | TIME_AND_MATERIALS | RETAINER_PLUS_EXPENSES
  primaryContactId uuid FK → customerContacts (nullable)
  notes           text (nullable)
  metadata        jsonb
  createdAt, updatedAt
}
```

### `projectPhases`
Phases within a project. Jobs attach to phases. Invoice fires when phase completes.

```sql
projectPhases {
  id              uuid PK
  projectId       uuid FK → projects
  tenantId        uuid FK → tenants
  name            text  -- 'Discovery', 'Design', 'Build', 'Handover'
  sequence        int
  status          enum: NOT_STARTED | IN_PROGRESS | COMPLETED | CANCELLED
  startDate       date (nullable)
  targetEndDate   date (nullable)
  actualEndDate   date (nullable)
  invoiceAmount   decimal(10,2) (nullable)  -- for FIXED_MILESTONES: invoice this on completion
  invoicePercent  decimal(5,2) (nullable)   -- alternative: % of totalValue
  invoicedAt      timestamp (nullable)
  notes           text (nullable)
  createdAt
}
```

### `crmPipeline`
Prospect-to-client pipeline stages.

```sql
crmPipeline {
  id              uuid PK
  tenantId        uuid FK → tenants
  name            text  -- 'Initial Enquiry', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'
  sequence        int
  color           text  -- hex for UI
  isWon           bool default false  -- terminal won state
  isLost          bool default false  -- terminal lost state
  createdAt
}

crmDeals {
  id              uuid PK
  tenantId        uuid FK → tenants
  customerId      uuid FK → customers
  pipelineStageId uuid FK → crmPipeline
  name            text  -- deal name
  value           decimal(10,2) (nullable)
  probability     int (nullable)  -- 0-100%
  expectedCloseDate date (nullable)
  projectId       uuid FK → projects (nullable)  -- linked project when won
  assignedToId    uuid FK → users (nullable)
  notes           text (nullable)
  lostReason      text (nullable)
  wonAt           timestamp (nullable)
  lostAt          timestamp (nullable)
  createdAt, updatedAt
}

crmActivities {
  id              uuid PK
  dealId          uuid FK → crmDeals
  tenantId        uuid FK → tenants
  type            enum: NOTE | CALL | EMAIL | MEETING | PROPOSAL | CONTRACT
  summary         text
  scheduledAt     timestamp (nullable)  -- for future activities
  completedAt     timestamp (nullable)
  createdById     uuid FK → users
  createdAt
}
```

---

## Job → Project Linking

A job can optionally belong to a project phase:
- `jobs.projectId` FK → `projects` (added in Phase A)
- Add `phaseId` FK → `projectPhases` (add in this phase)

When all jobs in a phase are COMPLETED:
- Inngest function `checkPhaseCompletion` fires
- If all jobs complete → set `projectPhases.status = COMPLETED`, `actualEndDate = today`
- Emit `project/phase-completed`
- Notification trigger: notify project owner + customer contact

---

## Milestone Invoicing

On `project/phase-completed`:
- If `billingStrategy = FIXED_MILESTONES` and `phase.invoiceAmount > 0`:
  - Auto-generate invoice for `invoiceAmount`
  - Set `phase.invoicedAt = now`
  - Emit `invoice/created`

- If `billingStrategy = TIME_AND_MATERIALS`:
  - Sum all `jobTimeEntries.durationMinutes` for jobs in this phase
  - Sum all `jobMaterials.totalCost` for jobs in this phase
  - Apply FORMULA split rule (Phase B engine)
  - Generate invoice

- If `billingStrategy = RETAINER_PLUS_EXPENSES`:
  - Monthly retainer invoiced on schedule via `serviceContracts` (Phase E)
  - Expenses (materials) invoiced at phase completion

---

## CRM Pipeline

### Procedures

```typescript
crm.pipeline.list              // get stages in order
crm.pipeline.createStage
crm.pipeline.reorderStages

crm.deals.create
crm.deals.update
crm.deals.list                 // with filters: stage, assigned, probability
crm.deals.move(dealId, stageId) // move deal to different stage; log activity
crm.deals.markWon(dealId)      // set wonAt, link project, transition to ACTIVE
crm.deals.markLost(dealId, reason)

crm.activities.create
crm.activities.list(dealId)
crm.activities.complete(activityId)
```

### Default Pipeline Stages (seeded for new tenants)
1. Enquiry
2. Discovery Call
3. Proposal Sent
4. Negotiation
5. Won ✓
6. Lost ✗

### CRM → Project Connection

When a deal is marked Won:
- Automatically creates a `projects` row linked to the deal's customer
- Sets `projects.status = SCOPING`
- Moves the deal to Won stage
- Emits `crm/deal-won` → notification trigger fires (Phase C)

---

## Module Structure

```
src/modules/projects/
  projects.types.ts
  projects.schemas.ts
  projects.repository.ts
  projects.service.ts      -- create, updatePhase, completePhase, checkProjectCompletion
  projects.router.ts
  projects.events.ts       -- checkPhaseCompletion
  index.ts
  __tests__/
    projects.service.test.ts

src/modules/crm/
  crm.types.ts
  crm.schemas.ts
  crm.repository.ts
  crm.service.ts           -- deal lifecycle, pipeline management
  crm.router.ts
  index.ts
  __tests__/
    crm.service.test.ts
```

---

## Tests

`projects.service.test.ts`:
- Create project with phases
- Add job to phase
- Phase completes when all jobs COMPLETED
- Phase not completed if any job still IN_PROGRESS
- FIXED_MILESTONES: invoice generated on phase completion with correct amount
- TIME_AND_MATERIALS: invoice sums time + materials correctly
- Project completes when all phases complete
- Phase sequence: next phase starts when previous completes

`crm.service.test.ts`:
- Create deal in first stage
- Move deal to next stage: activity logged
- Mark won: project created, status SCOPING
- Mark lost: reason stored, stage set to lost
- Activity creation: scheduled activity appears in future list
- Activity completion: completedAt set
- Pipeline reorder: sequences updated atomically

---

## Definition of Done

- [ ] `projects` table created
- [ ] `projectPhases` table created
- [ ] `crmPipeline`, `crmDeals`, `crmActivities` tables created
- [ ] `jobs.phaseId` added (FK → projectPhases)
- [ ] `projects` module scaffolded with full CRUD
- [ ] `crm` module scaffolded with pipeline + deal management
- [ ] Phase completion detection Inngest function implemented
- [ ] Milestone invoicing implemented for all 3 billing strategies
- [ ] Deal Won → auto-create project implemented
- [ ] Default pipeline stages seeded for new tenants
- [ ] All tests pass
- [ ] tsc passes, build passes
