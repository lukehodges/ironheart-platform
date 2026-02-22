# Workflow Trigger Refactor Summary

## Overview
Removed global `triggerEvent` field from workflows table and moved to node-based triggers following n8n best practices. Visual workflows now use TRIGGER nodes to define when they execute, allowing multiple triggers per workflow.

---

## ✅ Completed Changes

### 1. Database Schema
- **File**: `src/shared/db/schemas/shared.schema.ts`
- **Changes**:
  - Removed `triggerEvent` column from workflows table
  - Removed `workflows_triggerEvent_idx` index
- **Migration**: `drizzle/0005_remove_workflow_trigger_event.sql`
  ```sql
  DROP INDEX "workflows_triggerEvent_idx";
  ALTER TABLE "workflows" DROP COLUMN "triggerEvent";
  ```

### 2. TypeScript Types
- **File**: `src/modules/workflow/workflow.types.ts`
- **Changes**:
  - Removed `triggerEvent` from `WorkflowRecord`
  - Removed `triggerEvent` from `CreateWorkflowInput`
  - Removed `triggerEvent` from `UpdateWorkflowInput`
  - **Added** `TriggerNodeConfig` interface:
    ```typescript
    export interface TriggerNodeConfig {
      eventType: string
      conditions?: WorkflowConditionGroup
      debounceMs?: number
    }
    ```
  - Added `TriggerNodeConfig` to `NodeConfig` union type
  - **Note**: `WorkflowExecutionRecord` still has `triggerEvent` to record what event triggered the execution (historical data)

### 3. Zod Schemas
- **File**: `src/modules/workflow/workflow.schemas.ts`
- **Changes**:
  - Removed `triggerEvent` field from `createWorkflowSchema`
  - Removed `triggerEvent` field from `updateWorkflowSchema`
  - **Added** `.superRefine()` validation to `createWorkflowSchema`:
    - Ensures visual workflows have at least one TRIGGER node
    - Validates each TRIGGER node has `eventType` configured
  - **Added** `.superRefine()` validation to `updateWorkflowSchema`:
    - Validates TRIGGER nodes have `eventType` when updating nodes
  - Updated `listWorkflowsSchema` comment to clarify triggerEvent filter now searches JSONB

### 4. Repository Layer
- **File**: `src/modules/workflow/workflow.repository.ts`
- **Changes**:
  - **mapWorkflowRow()**: Removed `triggerEvent: row.triggerEvent` mapping
  - **findByTrigger()**: Now searches JSONB `nodes` array for TRIGGER nodes:
    ```typescript
    rawSql`EXISTS (
      SELECT 1
      FROM jsonb_array_elements(${workflows.nodes}) AS node
      WHERE node->>'type' = 'TRIGGER'
      AND node->'config'->>'eventType' = ${triggerEvent}
    )`
    ```
  - **listByTenant()**: Updated triggerEvent filter to use same JSONB search
  - **create()**: Removed `triggerEvent: input.triggerEvent` from insert
  - **update()**: Removed `triggerEvent` field handling
  - **Note**: Fixed `enabled`/`isActive` mapping (DB uses "enabled", types use "isActive")

### 5. Frontend - Toolbar Component
- **File**: `src/components/workflow/workflow-toolbar.tsx`
- **Changes**:
  - Removed `triggerEvent` from `WorkflowToolbarProps`
  - Removed `onTriggerChange` callback
  - Removed `TRIGGER_EVENTS` constant array
  - Removed trigger event `<Select>` dropdown
  - **Added** helpful hint: "Add TRIGGER nodes from the palette to define when this workflow runs"
  - Simplified layout to only show workflow name input

### 6. Frontend - Editor Page
- **File**: `src/app/(admin)/admin/workflows/[id]/page.tsx`
- **Changes**:
  - Removed `triggerEvent` state variable
  - Removed `setTriggerEvent` from workflow data initialization
  - **Updated** `validateWorkflow()`:
    - Removed triggerEvent validation
    - **Added** validation for at least one TRIGGER node
    - **Added** validation that each TRIGGER node has `eventType` configured
  - **Updated** `handleSave()`:
    - Removed `triggerEvent` from `mutations.create.mutate()`
    - Removed `triggerEvent` from `mutations.update.mutate()`
  - Removed `triggerEvent` from `WorkflowToolbar` props
  - Removed `onTriggerChange` handler

---

## 🚧 Remaining Backend Changes

### Task 5: Update Workflow Service
- **File**: `src/modules/workflow/workflow.service.ts`
- **Required Changes**:
  - **createWorkflow()**: Add validation for TRIGGER nodes
    ```typescript
    if (input.isVisual && input.nodes) {
      const triggerNodes = input.nodes.filter(n => n.type === 'TRIGGER')
      if (triggerNodes.length === 0) {
        throw new BadRequestError('Visual workflows must have at least one TRIGGER node')
      }
      triggerNodes.forEach((node, idx) => {
        if (!node.config?.eventType) {
          throw new BadRequestError(`TRIGGER node ${idx} missing eventType in config`)
        }
      })
    }
    ```
  - **updateWorkflow()**: Same validation when updating nodes
  - Remove any references to `input.triggerEvent`

### Task 6: Update Workflow Engine
- **File**: `src/modules/workflow/engine/graph.engine.ts`
- **Required Changes**:
  - Add `findMatchingTrigger()` function:
    ```typescript
    function findMatchingTrigger(
      nodes: WorkflowNode[],
      edges: WorkflowEdge[],
      triggerEvent: string,
      triggerData: Record<string, unknown>,
    ): WorkflowNode | null {
      const triggerNodes = nodes.filter(n => n.type === 'TRIGGER')

      for (const trigger of triggerNodes) {
        const eventType = trigger.config?.eventType as string
        if (eventType !== triggerEvent) continue

        // Optional: Match conditions
        const conditions = trigger.config?.conditions as WorkflowConditionGroup | undefined
        if (conditions) {
          const conditionsMet = evaluateConditionGroup(conditions, triggerData, {})
          if (!conditionsMet) continue
        }

        return trigger
      }

      return null
    }
    ```
  - **executeVisualWorkflow()**: Find matching TRIGGER node and start from there
    ```typescript
    const triggerNode = findMatchingTrigger(nodes, edges, triggerEvent, triggerData)
    if (!triggerNode) {
      throw new Error(`No matching TRIGGER node found for event: ${triggerEvent}`)
    }

    // Start execution from the matching trigger
    const result = await executeNode(
      triggerNode.id,
      { triggerData, variables: {}, loopStack: [] },
      nodes,
      edges,
      step,
      tenantId,
      new Set(),
    )
    ```

- **File**: `src/modules/workflow/engine/linear.engine.ts`
- **Required Changes**: None (linear workflows are deprecated, visual only)

### Task 9: Add TRIGGER Node Configuration UI
- **File**: `src/components/workflow/node-config-panel.tsx` (or create `trigger-node-config.tsx`)
- **Required Changes**:
  - Add TRIGGER node type handler to config panel
  - Create event type dropdown:
    ```typescript
    const TRIGGER_EVENTS = [
      { value: 'booking/created', label: 'Booking Created' },
      { value: 'booking/completed', label: 'Booking Completed' },
      { value: 'booking/cancelled', label: 'Booking Cancelled' },
      { value: 'booking/rescheduled', label: 'Booking Rescheduled' },
      { value: 'customer/created', label: 'Customer Created' },
      { value: 'review/submitted', label: 'Review Submitted' },
      { value: 'payment/received', label: 'Payment Received' },
      { value: 'payment/failed', label: 'Payment Failed' },
    ]
    ```
  - Add optional condition builder (reuse existing condition UI)
  - Add debounce milliseconds input

---

## 📊 Migration Path

Since this is **dev mode with no production data**:

1. **Run migration**: `npm run db:migrate`
2. **Verify schema**: Check that `triggerEvent` column is dropped
3. **Test workflow creation**: Create new workflow with TRIGGER nodes
4. **Test workflow execution**: Trigger event should match TRIGGER node's eventType

---

## 🎯 Benefits of This Approach

### 1. **Multiple Triggers Per Workflow**
- Single workflow can respond to multiple events
- Example: Workflow triggers on both `booking/created` AND `booking/rescheduled`

### 2. **Conditional Triggers**
- Each TRIGGER node can have its own conditions
- Example: Only trigger for bookings with `status === 'CONFIRMED'`

### 3. **Debounce Support**
- Prevent duplicate workflow executions within a time window
- Configured per TRIGGER node

### 4. **Cleaner UI**
- No confusing dual input (toolbar + canvas)
- All workflow logic visible in canvas
- Follows n8n best practices

### 5. **More Flexible Architecture**
- Triggers are just nodes, can be added/removed/edited like any other node
- Different entry points for different scenarios
- Better visualization of workflow behavior

---

## 🔍 What Didn't Change

### WorkflowExecutionRecord Still Has triggerEvent
The `workflowExecutions` table still has `triggerEvent` field to record **which event triggered the execution**. This is historical data and important for:
- Execution logs
- Debugging which trigger fired
- Analytics on workflow execution patterns

### Linear Workflows (Deprecated)
The linear workflow engine (`workflowActions` table) is deprecated and will be removed in future. All new workflows are visual (`isVisual=true`).

---

## 🧪 Testing Checklist

- [ ] Create new workflow with TRIGGER node
- [ ] Configure TRIGGER node with eventType
- [ ] Save workflow (should succeed)
- [ ] Try saving workflow without TRIGGER node (should fail validation)
- [ ] Try saving TRIGGER node without eventType (should fail validation)
- [ ] Trigger workflow via Inngest event
- [ ] Verify workflow executes from correct TRIGGER node
- [ ] Test multiple TRIGGER nodes in one workflow
- [ ] Test TRIGGER node with conditions
- [ ] Verify workflow list page filters by trigger event (JSONB search)

---

## 📝 Next Steps

1. Complete remaining backend tasks (5, 6, 9)
2. Run TypeScript compilation: `npx tsc --noEmit`
3. Run tests: `npm test`
4. Run migration: `npm run db:migrate`
5. Manual testing of workflow creation/execution
6. Update any seed data or demo workflows
