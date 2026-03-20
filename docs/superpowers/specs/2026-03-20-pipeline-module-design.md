# Pipeline Module — Design Spec

## Overview

Extract pipeline functionality from the customer module into an independent `pipeline` module with configurable stages, multiple pipelines per tenant, multi-membership support, and workflow engine integration for automation rules.

### Motivation

- **Separation of concerns** — pipeline is a distinct sales CRM domain, not customer data management
- **Extensibility** — configurable stages, multiple pipelines, automation rules need their own home
- **Module gating** — pipeline should be independently toggleable via `tenantModules`

### Approach

Clean break. New tables, new module, drop pipeline columns from customers. No backwards compatibility layer — greenfield project with no production data.

---

## Data Model

### New Tables

#### `pipelines`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → organizations | |
| name | text NOT NULL | e.g., "Sales", "Partner" |
| description | text | |
| isDefault | boolean | Enforced: partial unique index `UNIQUE(tenantId) WHERE isDefault = true` |
| isArchived | boolean | Soft archive |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### `pipeline_stages`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → organizations | Denormalized for query efficiency |
| pipelineId | uuid FK → pipelines | |
| name | text NOT NULL | e.g., "Prospect" |
| slug | text NOT NULL | e.g., "prospect" |
| position | integer | Sort order |
| color | text | Hex or tailwind token |
| type | enum (OPEN, WON, LOST) | Terminal stage semantics |
| allowedTransitions | uuid[] | Stage IDs this stage can move to. Empty = terminal (no moves allowed). |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Constraints: `UNIQUE(pipelineId, slug)`, `UNIQUE(pipelineId, position)`.

Indexes: `(pipelineId)`, `(tenantId)`.

#### `pipeline_members`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK | |
| pipelineId | uuid FK → pipelines | |
| customerId | uuid FK → customers | |
| stageId | uuid FK → pipeline_stages | |
| dealValue | numeric(12,2) | |
| lostReason | text | |
| enteredStageAt | timestamp | When moved to current stage |
| addedAt | timestamp | When added to pipeline |
| closedAt | timestamp | Set when entering WON/LOST stage; cleared if moved back to OPEN |
| metadata | jsonb | Extensible (future: scoring, custom fields) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Constraint: `UNIQUE(pipelineId, customerId)` — one membership per pipeline per customer.

Indexes: `(pipelineId, stageId)`, `(customerId)`, `(tenantId)`.

#### `pipeline_stage_history` (refactored from existing)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK | |
| memberId | uuid FK → pipeline_members | |
| fromStageId | uuid FK → pipeline_stages | Nullable (initial add) |
| toStageId | uuid FK → pipeline_stages | |
| changedAt | timestamp | |
| changedById | uuid FK → users | Nullable |
| dealValue | numeric(12,2) | Snapshot at time of move |
| lostReason | text | |
| notes | text | |

Indexes: `(memberId)`, `(tenantId, changedAt)`.

### Removed from Customer Schema

- Drop columns from `customers`: `pipelineStage`, `pipelineStageChangedAt`, `dealValue`, `lostReason`
- Drop index: `customers_tenantId_pipelineStage_idx`
- Drop `pipeline_stage` pgEnum
- Drop existing `pipeline_stage_history` table (replaced by refactored version above)

---

## Module Structure

```
src/modules/pipeline/
  pipeline.types.ts          — Pipeline, PipelineStage, PipelineMember, etc.
  pipeline.schemas.ts        — Zod input schemas for tRPC
  pipeline.repository.ts     — Drizzle queries for all 4 tables
  pipeline.service.ts        — Business logic, event emission
  pipeline.router.ts         — tRPC procedures
  pipeline.events.ts         — Inngest event handlers
  pipeline.manifest.ts       — Module registration, sidebar nav
  pipeline.seed.ts           — Default pipeline + stages template
  index.ts                   — Barrel export
  __tests__/
    pipeline.test.ts
```

---

## Router Procedures (17 total)

### Pipeline CRUD

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `pipeline.list` | query | tenant | List all pipelines for tenant |
| `pipeline.getById` | query | tenant | Get pipeline with its stages |
| `pipeline.getDefault` | query | tenant | Get tenant's default pipeline with stages |
| `pipeline.create` | mutation | pipeline:write | Create pipeline with initial stages |
| `pipeline.update` | mutation | pipeline:write | Update name/description |
| `pipeline.archive` | mutation | pipeline:write | Soft-archive (rejects if active members exist) |

### Stage Configuration

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `pipeline.addStage` | mutation | pipeline:write | Add stage to pipeline |
| `pipeline.updateStage` | mutation | pipeline:write | Rename, recolor, reorder, update transitions |
| `pipeline.removeStage` | mutation | pipeline:write | Remove stage (must reassign members first; strips removed ID from sibling `allowedTransitions`) |
| `pipeline.reorderStages` | mutation | pipeline:write | Bulk reorder stage positions |

### Member Operations

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `pipeline.addMember` | mutation | pipeline:write | Add customer to pipeline at a stage |
| `pipeline.moveMember` | mutation | pipeline:write | Move member to new stage (validates transitions). Accepts optional `notes`, `lostReason`, `dealValue`. Sets `closedAt` on WON/LOST; clears it if moving back to OPEN. |
| `pipeline.removeMember` | mutation | pipeline:write | Remove customer from pipeline |
| `pipeline.updateMember` | mutation | pipeline:write | Update dealValue, metadata |
| `pipeline.listMembers` | query | tenant | List all members in a pipeline (grouped by stage) |
| `pipeline.getSummary` | query | tenant | Stage counts + deal value totals for a given pipelineId |
| `pipeline.getMemberHistory` | query | tenant | Stage change audit trail for a member |

---

## Inngest Events

Replace `customer/stage.changed` with:

| Event | Data |
|-------|------|
| `pipeline/member.added` | memberId, pipelineId, customerId, stageId, tenantId |
| `pipeline/member.moved` | memberId, pipelineId, customerId, fromStageId, toStageId, dealValue, tenantId |
| `pipeline/member.removed` | memberId, pipelineId, customerId, tenantId |
| `pipeline/member.closed` | memberId, pipelineId, customerId, stageType ("WON" or "LOST"), dealValue, tenantId |

When a member moves to a WON/LOST stage, both `pipeline/member.moved` AND `pipeline/member.closed` fire (moved first, then closed). Workflow authors can listen to either depending on their use case.

These events are what the workflow engine hooks into for automation rules. The pipeline module emits events; the workflow engine handles the rest. No direct coupling.

Event type definitions must be added to `src/shared/inngest.ts` in the `IronheartEvents` type. The existing `customer/stage.changed` event type must be removed from the same file as part of cleanup.

---

## Default Pipeline Seed

`pipeline.seed.ts` exports `seedDefaultPipeline(tenantId: string)` called during tenant provisioning.

Default "Sales Pipeline" stages:

| Position | Name | Slug | Type | Transitions to |
|----------|------|------|------|----------------|
| 0 | Prospect | prospect | OPEN | Outreach, Lost |
| 1 | Outreach | outreach | OPEN | Discovery, Lost |
| 2 | Discovery | discovery | OPEN | Audit, Lost |
| 3 | Audit | audit | OPEN | Proposal, Lost |
| 4 | Proposal | proposal | OPEN | Negotiation, Lost |
| 5 | Negotiation | negotiation | OPEN | Won, Lost |
| 6 | Won | won | WON | Delivering |
| 7 | Delivering | delivering | OPEN | Complete |
| 8 | Complete | complete | WON | *(terminal)* |
| 9 | Lost | lost | LOST | *(terminal)* |

`isDefault: true` on this pipeline. Shown by default in the UI.

---

## UI Changes

### Modified: Kanban Board (`src/app/admin/pipeline/page.tsx`)

- Remove all hardcoded constants: `PIPELINE_STAGES`, `STAGE_LABELS`, `STAGE_COLORS`, `STAGE_TRANSITIONS`
- Fetch pipeline + stages dynamically from `pipeline.getById`
- Render columns from `pipeline_stages` rows sorted by position
- Stage colors, names, transitions all from DB
- Queries become `pipeline.listMembers` and `pipeline.getSummary`
- New: pipeline selector dropdown — if tenant has multiple pipelines, switch between them

### Modified: Add Prospect Dialog

- Becomes "Add to Pipeline" dialog
- Calls `pipeline.addMember` instead of `customer.create`
- Can select existing customer OR create new one inline
- Initial stage = first OPEN stage by position

### Modified: Move Stage Dialog

- Transitions from `stage.allowedTransitions` instead of hardcoded map
- Stage type (WON/LOST) determines which fields to show
- Calls `pipeline.moveMember`

### Modified: Customer Card

- Displays member data from `pipeline_members` instead of customer columns
- Action menu transitions from stage's `allowedTransitions`

### New: Pipeline Settings Page (`src/app/admin/settings/pipeline/page.tsx`)

- List all pipelines (create / archive / set default)
- Edit stages (add / remove / rename / reorder via drag)
- Configure stage colors and type (OPEN / WON / LOST)
- Define allowed transitions per stage

---

## Cross-Module Integration

### Pipeline → Workflow Engine

- `pipeline/member.moved` and `pipeline/member.closed` are standard Inngest events
- Workflow engine picks these up via existing trigger mechanism
- Users configure automations by creating workflows triggered by pipeline events
- Pipeline module has no awareness of workflow module

### Pipeline → Customer Module

- Pipeline reads customer data (name, email, tags) via DB join on `customerId`
- Customer module has no pipeline awareness — clean separation
- `addMember` can optionally create a new customer inline (calls customer service `create`)

### Pipeline → Platform Module

- `seedDefaultPipeline(tenantId)` called during `createTenant` flow
- Pipeline registers in `pipeline.manifest.ts` with module slug `'pipeline'`

### AI Module Update

- `paste-to-pipeline` feature calls `pipeline.addMember` instead of setting `customer.pipelineStage`

---

## Customer Module Cleanup

Remove from customer module:

- **Types:** `PipelineStage`, `PipelineStageHistoryRecord`, `StageConversionMetric`, pipeline fields from `CustomerRecord`, `CreateCustomerInput`, `UpdateCustomerInput`
- **Schemas:** `pipelineStageSchema`, `updatePipelineStageSchema`, `listByPipelineStageSchema`, `getStageHistorySchema`
- **Repository:** `updatePipelineStage`, `listByPipelineStage`, `getPipelineSummary`, `createStageHistoryEntry`, `getStageHistory`, `getStageConversionMetrics`
- **Service:** `updatePipelineStage`, `listByPipelineStage`, `getPipelineSummary`, `getStageHistory`, `getStageConversionMetrics`
- **Router:** 5 procedures (`updatePipelineStage`, `listByPipelineStage`, `getPipelineSummary`, `getStageHistory`, `getStageConversionMetrics`)
- **Events:** `customer/stage.changed` event definition (from `src/shared/inngest.ts`) + `onStageChanged` handler
- **Manifest:** Pipeline sidebar entry moves to `pipeline.manifest.ts`

---

## Out of Scope (Future Work)

- Weighted deal scoring / probability per stage
- Stage requirements/gates
- Pipeline analytics/reporting (conversion rates, velocity, forecasting)
- Activity timeline (calls, emails, notes per membership)
- Additional views (list view, funnel visualization)
- Stale deal alerts
- Drag-and-drop kanban moves
