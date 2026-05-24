# Phase 5 Architecture — Ironheart Refactor
# CTO-Level Design Document
# Generated: 2026-02-19 | Based on: 4-agent parallel analysis
# Updated: 2026-02-19 — Section 3 expanded to full graph/n8n-parity engine

---

## Executive Summary

Phase 5 covers 7 core business modules: **team, customer, forms, review, workflow, tenant, and platform**. The original plan provides a reasonable skeleton but significantly underspecifies 3 critical areas: the workflow engine, the tenant settings model, and the team availability query engine.

**Key findings:**
- Plan estimates ~7,700 LOC; realistic estimate is ~16,400 LOC (workflow engine now graph-based)
- Workflow engine is a full graph executor with n8n-parity features: IF/SWITCH/MERGE/LOOP nodes, WAIT_FOR_EVENT, SET_VARIABLE, FILTER, TRANSFORM, EXECUTE_WORKFLOW, AND/OR condition groups
- `organizationSettings` table has 27 typed columns — not a key/value store as plan implies
- Customer merge cascades across 7 tables in a single transaction
- DB schema is production-ready; all tables exist and are complete
- No schema changes required for Phase 5 (schema was already complete)

**Directive:** This document provides the missing specifications so implementation can proceed without ambiguity.

---

## Table of Contents

1. [Module Overview & Complexity Matrix](#1-module-overview--complexity-matrix)
2. [Established Patterns Reference](#2-established-patterns-reference)
3. [Workflow Engine — Full Design (Graph Edition)](#3-workflow-engine--full-design-graph-edition)
4. [Team Module](#4-team-module)
5. [Customer Module](#5-customer-module)
6. [Forms Module](#6-forms-module)
7. [Review Module](#7-review-module)
8. [Tenant Module](#8-tenant-module)
9. [Platform Module](#9-platform-module)
10. [RBAC & Permission Matrix](#10-rbac--permission-matrix)
11. [Inngest Event Catalog — Phase 5 Additions](#11-inngest-event-catalog--phase-5-additions)
12. [Root Router Integration](#12-root-router-integration)
13. [Implementation Waves](#13-implementation-waves)
14. [Testing Strategy](#14-testing-strategy)
15. [Risk Register](#15-risk-register)
16. [File Checklist](#16-file-checklist)

---

## 1. Module Overview & Complexity Matrix

### Complexity vs. Plan Assessment

| Module | Plan LOC | Realistic LOC | Complexity | Primary Gaps |
|--------|----------|---------------|------------|--------------|
| workflow | 1,200 | 6,500 | EXTREME | Graph engine, IF/SWITCH/MERGE/LOOP nodes, condition groups, expression eval, sub-workflows, wait-for-event |
| team | 1,400 | 2,200 | HIGH | Availability query composition, capacity dual-source, timezone handling |
| customer | 500 | 1,300 | HIGH | 7-table merge cascade, GDPR stub, audit trail |
| review | 800 | 1,900 | HIGH | Automation pre-screening, state machine, issue resolution workflow |
| tenant | 1,600 | 2,100 | MEDIUM-HIGH | 27-column typed settings, mode switching, module dependency graph |
| forms | 700 | 1,600 | MEDIUM | Field validation at submit, template versioning, public token |
| platform | 500 | 800 | LOW-MEDIUM | Tenant provisioning, plan enforcement |
| **TOTAL** | **6,700** | **16,400** | | |

### Schema Completeness Check

All tables are present. No migrations required for Phase 5.

| Table | Status | Notes |
|-------|--------|-------|
| `users` (team context) | ✓ Complete | isTeamMember, hourlyRate, staffStatus, employeeType |
| `userAvailability` | ✓ Complete | RECURRING / SPECIFIC / BLOCKED enum |
| `userCapacities` | ✓ Complete | Per-day max booking caps |
| `customers` | ✓ Complete | Full customer model |
| `customerNotes` | ✓ Complete | noteType enum, isPrivate |
| `formTemplates` | ✓ Complete | fields JSONB, attachedServices, sendTiming |
| `completedForms` | ✓ Complete | responses JSONB, signature, expiresAt |
| `reviews` | ✓ Complete | issueCategory, resolutionStatus |
| `reviewRequests` | ✓ Complete | 6-state status enum |
| `reviewAutomationSettings` | ✓ Complete | preScreen, multi-channel, autoPublicMinRating |
| `workflows` | ✓ Complete | nodes/edges JSONB, conditions JSONB, delay, isVisual |
| `workflowActions` | ✓ Complete | 7 action types, config JSONB, order |
| `workflowExecutions` | ✓ Complete | Full audit: triggerData, actionResults JSONB |
| `organizationSettings` | ✓ Complete | 27 typed columns |
| `tenantModules` | ✓ Complete | enabled, config JSONB |
| `modules` / `moduleSettings` | ✓ Complete | Global defaults |
| `featureFlags` / `tenantFeatures` | ✓ Complete | Per-flag overrides |
| `tenants` | ✓ Complete | plan, status, trialEndsAt |

---

## 2. Established Patterns Reference

All Phase 5 modules MUST follow patterns established in Phases 1–4.

### 2.1 Module File Structure (canonical)

```
src/modules/{module}/
  {module}.types.ts          # TypeScript interfaces only (no Zod)
  {module}.schemas.ts        # Zod schemas for tRPC input validation
  {module}.repository.ts     # DB access: only Drizzle queries, no business logic
  {module}.service.ts        # Business logic: calls repository, emits Inngest events
  {module}.router.ts         # tRPC procedures: input validation → service calls
  {module}.events.ts         # Inngest functions registered at /api/inngest
  index.ts                   # Barrel: exports router, functions, service, types
  __tests__/
    {module}.test.ts         # Vitest unit tests with vi.mock for repository
```

### 2.2 tRPC Procedure Tiers

```typescript
// Use the correct procedure tier for each operation
publicProcedure         // No auth: form public submit, review token verify
tenantProcedure         // Authenticated + tenant context (most operations)
permissionProcedure     // Requires specific RBAC permission
platformAdminProcedure  // isPlatformAdmin flag required
```

### 2.3 Repository Pattern

```typescript
// CORRECT — Drizzle ORM
import { db } from '@/shared/db'
import { eq, and, desc, inArray } from 'drizzle-orm'

export const teamRepository = {
  async findById(tenantId: string, userId: string) {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
      .limit(1)
    return row ?? null
  },
}

// WRONG — never use Prisma patterns
await prisma.user.findUnique(...)
```

### 2.4 Service Pattern

```typescript
export const teamService = {
  async getStaffMember(ctx: TRPCContext, userId: string) {
    const member = await teamRepository.findById(ctx.tenantId, userId)
    if (!member) throw new NotFoundError('Staff member not found')
    return member
  },
}
```

### 2.5 Error Pattern

```typescript
import { NotFoundError, ForbiddenError, BadRequestError } from '@/shared/errors'
// These map to tRPC NOT_FOUND, FORBIDDEN, BAD_REQUEST codes
// NEVER throw raw Error() from service/router
```

### 2.6 Pino Logging

```typescript
const log = logger.child({ module: 'team.service' })
log.info({ userId, tenantId }, 'Staff member fetched')  // object FIRST, message second
```

### 2.7 Inngest Step Pattern

```typescript
export const myFunction = inngest.createFunction(
  { id: 'unique-kebab-id', retries: 3 },
  { event: 'module/event.name' },
  async ({ event, step }) => {
    const result = await step.run('step-name', async () => {
      // Every DB call inside step.run for durability
      return await someRepository.findById(event.data.id)
    })
    // step.run is idempotent — safe to retry
  }
)
```

---

## 3. Workflow Engine — Full Design (Graph Edition)

### 3.0 Design Philosophy

Phase 5 implements a **dual-mode workflow engine**:

- **Linear mode** (`isVisual = false`): reads `workflowActions ORDER BY order` — the original sequential executor. Simple automations (send email 24h after booking) live here. Fast to build, easy to understand.
- **Graph mode** (`isVisual = true`): reads `workflows.nodes` + `workflows.edges` JSONB — a full directed graph executor with branching, merging, looping, and event-waiting. N8n-parity feature set.

The `isVisual` flag is the mode gate. Both executors share action execution primitives (the 7 existing action types). The graph engine is a superset — it handles all node types including the original 7 actions.

The schema was already designed for this: `workflows.nodes` and `workflows.edges` JSONB columns exist but were unused in the original linear design. No schema changes required.

---

### 3.1 Architecture Overview

```
booking.service.confirmReservation()
  → inngest.send("booking/confirmed")
    → triggerOnBookingConfirmed() [Inngest function]
      → workflowRepository.findByTrigger(tenantId, "BOOKING_CONFIRMED")
        → for each matching workflow:
            → inngest.send("workflow/execute", { workflowId, triggerData, isVisual })
              → executeWorkflow() [Inngest function]
                → enrichTriggerData() [loads booking+customer+service context]
                → if isVisual:
                    GraphEngine.run(nodes, edges, context, step)
                else:
                    LinearEngine.run(actions, context, step)
                → workflowRepository.recordExecution(results)
```

---

### 3.2 Trigger Events

Workflows listen on these `triggerEvent` values (stored in `workflows.triggerEvent` text column):

| triggerEvent | Fired by | Context data available |
|---|---|---|
| `BOOKING_CREATED` | booking.service | bookingId, tenantId, customerId, staffId, serviceId |
| `BOOKING_CONFIRMED` | booking.service | bookingId, tenantId, customerId |
| `BOOKING_CANCELLED` | booking.service | bookingId, tenantId, customerId, reason |
| `BOOKING_COMPLETED` | booking.service | bookingId, tenantId, customerId, staffId |
| `FORM_SUBMITTED` | forms.service | formId, bookingId, tenantId, customerId |
| `REVIEW_SUBMITTED` | review.service | reviewId, bookingId, tenantId, customerId, rating |
| `PAYMENT_RECEIVED` | (future) | paymentId, bookingId, tenantId, amount |

---

### 3.3 Node Type Catalog

All node types supported in graph mode:

#### Flow Control Nodes

| Node Type | Description |
|---|---|
| `TRIGGER` | Entry point. Receives enriched trigger data. Every graph has exactly one. |
| `IF` | Evaluates a condition group → routes to `true` or `false` output edge |
| `SWITCH` | Evaluates a field value → routes to matching `case_N` edge, or `default` |
| `MERGE` | Waits for incoming parallel branches → combines contexts and continues |
| `LOOP` | Iterates over an array — runs the body subgraph once per item |
| `LOOP_END` | Marks end of loop body — signals back to LOOP node |
| `WAIT_FOR_EVENT` | Pauses execution until a specific Inngest event arrives (with timeout) |
| `WAIT_UNTIL` | Pauses until a datetime, duration, or field-resolved timestamp |
| `STOP` | Explicitly terminates execution (success) |
| `ERROR` | Explicitly terminates execution (failure) — triggers error branch of caller if sub-workflow |

#### Action Nodes (the original 7 — unchanged interface)

| Node Type | Description |
|---|---|
| `SEND_EMAIL` | Send email via Resend |
| `SEND_SMS` | Send SMS via Twilio |
| `WEBHOOK` | Outbound HTTP call (POST/PUT/PATCH, HTTPS only) |
| `CREATE_CALENDAR_EVENT` | Create event via calendar-sync service |
| `UPDATE_BOOKING_STATUS` | Update booking status (loop-guarded) |
| `CREATE_TASK` | Insert task record with priority + due date |
| `SEND_NOTIFICATION` | In-app push stub |

#### Data Nodes

| Node Type | Description |
|---|---|
| `SET_VARIABLE` | Compute and store named variables into execution context |
| `FILTER` | Filter an array from context using condition groups — outputs filtered array |
| `TRANSFORM` | Map/reshape data between nodes using field mappings and transforms |

#### Sub-workflow Node

| Node Type | Description |
|---|---|
| `EXECUTE_WORKFLOW` | Invoke another workflow synchronously (wait for result) or fire-and-forget |

---

### 3.4 Node & Edge Schema (stored in JSONB)

```typescript
// workflows.nodes JSONB stores WorkflowNode[]
interface WorkflowNode {
  id: string                              // UUID, unique within workflow
  type: WorkflowNodeType                  // enum of all node types above
  label?: string                          // display name for canvas
  position: { x: number; y: number }     // for visual builder canvas
  config: NodeConfig                      // type-specific config (see 3.5)
  errorHandling?: 'stop' | 'continue' | 'branch'  // default: 'stop'
}

// workflows.edges JSONB stores WorkflowEdge[]
interface WorkflowEdge {
  id: string
  source: string                          // source node id
  target: string                          // target node id
  sourceHandle: string                    // output port name (see below)
  label?: string                          // display label
}
```

**Source handles by node type:**

```
TRIGGER             → "output"
IF                  → "true" | "false"
SWITCH              → "case_0" | "case_1" | ... | "default"
MERGE               → "output"
LOOP                → "item" (per-iteration body) | "done" (after all iterations)
LOOP_END            → "output"
WAIT_FOR_EVENT      → "received" | "timeout"
WAIT_UNTIL          → "output"
SET_VARIABLE        → "output"
FILTER              → "output"
TRANSFORM           → "output"
SEND_EMAIL          → "output" | "error"
SEND_SMS            → "output" | "error"
WEBHOOK             → "output" | "error"
CREATE_CALENDAR_EVENT → "output" | "error"
UPDATE_BOOKING_STATUS → "output" | "error"
CREATE_TASK         → "output" | "error"
EXECUTE_WORKFLOW    → "output" | "error"
STOP / ERROR        → (terminal — no output handles)
```

---

### 3.5 Node Config Schemas

#### IF Node
```typescript
interface IfNodeConfig {
  conditions: WorkflowConditionGroup      // see 3.8 for AND/OR group spec
}
```

#### SWITCH Node
```typescript
interface SwitchNodeConfig {
  field: string                           // dot-path to evaluate: "booking.status"
  cases: Array<{
    handle: string                        // "case_0", "case_1", etc.
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: string
    label?: string
  }>
  // Unmatched cases route to "default" handle
}
```

#### MERGE Node
```typescript
interface MergeNodeConfig {
  mode: 'wait_all' | 'wait_any' | 'append'
  // wait_all: block until ALL incoming branches deliver — merge contexts (last writer wins)
  // wait_any: continue when FIRST branch completes — others cancelled
  // append:   collect ALL branch outputs into array at context key "mergedOutputs"
  timeout?: string               // ISO 8601 — for wait_all, give up after this duration
}
```

#### LOOP Node
```typescript
interface LoopNodeConfig {
  sourceField: string            // dot-path to array in context: "variables.bookings"
  itemVariableName: string       // name to expose current item: "item"
  indexVariableName?: string     // name to expose current index: "index"
  maxIterations?: number         // safety guard — default 100
  mode: 'sequential' | 'parallel'
  // sequential: one iteration at a time (preserves order, uses less Inngest concurrency)
  // parallel:   all iterations concurrently via Promise.all
}
```

#### WAIT_FOR_EVENT Node
```typescript
interface WaitForEventNodeConfig {
  event: string                  // Inngest event name: "payment/received"
  matchField: string             // field in the incoming event to match: "data.bookingId"
  matchSourceField: string       // field in current context to match against: "triggerData.bookingId"
  timeout: string                // ISO 8601: "P7D" — give up after 7 days
  timeoutBehavior: 'continue' | 'stop' | 'error'
  outputField?: string           // store incoming event data under this context key
}
// Execution: step.waitForEvent(nodeId, { event, match, timeout })
// Routes to "received" handle if event arrives, "timeout" handle if it does not
```

#### WAIT_UNTIL Node
```typescript
interface WaitUntilNodeConfig {
  mode: 'duration' | 'datetime' | 'field'
  duration?: string              // ISO 8601: "PT24H" — wait this long from now
  datetime?: string              // ISO 8601 timestamp: "2026-03-01T09:00:00Z"
  field?: string                 // dot-path to datetime string in context
}
// Execution: step.sleep(nodeId, resolvedValue)
```

#### SET_VARIABLE Node
```typescript
interface SetVariableNodeConfig {
  assignments: Array<{
    key: string                  // variable name added to context.variables
    valueType: 'literal' | 'expression' | 'field'
    literal?: string | number | boolean
    field?: string               // dot-path: "nodes.SendEmail_1.output.messageId"
    expression?: string          // arithmetic/string: "{{booking.price}} * 1.2"
  }>
}
// All assigned keys become available as {{variables.key}} downstream
```

#### FILTER Node
```typescript
interface FilterNodeConfig {
  sourceField: string            // dot-path to array: "variables.bookings"
  outputField: string            // where to store result in context.variables
  conditions: WorkflowConditionGroup
  // Each array item is tested against conditions with the item as the data root
}
```

#### TRANSFORM Node
```typescript
interface TransformNodeConfig {
  outputField: string            // where to store result in context.variables
  mappings: Array<{
    targetKey: string
    sourceField: string          // dot-path into full context
    transform?: 'uppercase' | 'lowercase' | 'trim' | 'toNumber' | 'toDate' | 'toBoolean' | 'toString'
  }>
}
```

#### EXECUTE_WORKFLOW Node
```typescript
interface ExecuteWorkflowNodeConfig {
  workflowId: string
  mode: 'sync' | 'fire_and_forget'
  inputMappings: Array<{         // what data to pass as triggerData to sub-workflow
    targetKey: string
    sourceField: string
  }>
  outputField?: string           // sync mode only: store sub-workflow output here
}
// sync execution: send workflow/execute + step.waitForEvent("workflow/completed", correlationId)
// fire_and_forget: send workflow/execute only
// Loop prevention: __workflowDepth is incremented before dispatch
```

#### Action Nodes (existing 7 — config unchanged, summarised)
```typescript
interface SendEmailActionConfig {
  templateId?: string; recipientField?: string; recipientEmail?: string
  subject?: string; body?: string; bodyHtml?: string; delay?: string
}
interface SendSmsActionConfig {
  templateId?: string; recipientField?: string; recipientPhone?: string
  body?: string; delay?: string
}
interface WebhookActionConfig {
  url: string; method: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>; bodyTemplate?: string
  timeout?: number; expectedStatus?: number
}
interface CreateCalendarEventActionConfig {
  userIdField?: string; titleTemplate?: string
  descriptionTemplate?: string; addCustomerAsAttendee?: boolean
}
interface UpdateBookingStatusActionConfig {
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'; reason?: string
}
interface CreateTaskActionConfig {
  title?: string; description?: string; assigneeField?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; dueDateOffset?: string
}
interface SendNotificationActionConfig {
  recipientField?: string; title?: string; body?: string
}
```

---

### 3.6 Execution Context

Each node receives and produces a context object that flows through the entire graph:

```typescript
interface WorkflowExecutionContext {
  // Enriched trigger data (immutable after enrichTriggerData())
  triggerData: Record<string, unknown>

  // Accumulated node outputs: nodeId → result
  nodes: Record<string, {
    output: Record<string, unknown>
    success: boolean
    skipped?: boolean
    error?: string
  }>

  // Named variables from SET_VARIABLE nodes
  variables: Record<string, unknown>

  // Loop frame stack (supports nested loops)
  loopStack: Array<{
    sourceField: string
    items: unknown[]
    currentIndex: number
    currentItem: unknown
    itemVariableName: string
    indexVariableName?: string
  }>

  // Loop / recursion prevention
  __workflowDepth: number
}
```

**Variable resolution order** when resolving `{{path}}` tokens (highest priority first):
1. `variables.*` — SET_VARIABLE outputs
2. `nodes.{nodeId}.output.*` — specific node output (e.g. `{{nodes.SendEmail_1.output.messageId}}`)
3. `loopStack[-1].{itemVariableName}` — current loop item (e.g. `{{item.email}}`)
4. `triggerData.*` — enriched trigger context

Convenience shorthand: top-level `{{bookingId}}` resolves `triggerData.bookingId` (variables override triggerData if key collision).

---

### 3.7 Condition Groups (AND / OR / Nested)

Conditions are now grouped with explicit logic operators, supporting full AND/OR nesting:

```typescript
// Single leaf condition (unchanged from linear engine)
interface WorkflowCondition {
  field: string           // dot-path into data: "customer.email", "rating"
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_not_set'
  value?: string          // not required for is_set / is_not_set
}

// Group node (can nest recursively)
interface WorkflowConditionGroup {
  logic: 'AND' | 'OR'
  conditions: Array<WorkflowCondition | WorkflowConditionGroup>
}
```

**Example:** `(rating >= 4 AND serviceName = "massage") OR (customerType = "VIP")`

```typescript
const example: WorkflowConditionGroup = {
  logic: 'OR',
  conditions: [
    {
      logic: 'AND',
      conditions: [
        { field: 'rating', operator: 'greater_than', value: '3' },
        { field: 'serviceName', operator: 'equals', value: 'massage' },
      ]
    },
    { field: 'customerType', operator: 'equals', value: 'VIP' }
  ]
}
```

**Evaluator (`src/modules/workflow/engine/conditions.ts`):**

```typescript
export function evaluateConditionGroup(
  group: WorkflowConditionGroup,
  data: Record<string, unknown>
): boolean {
  if (group.logic === 'AND') {
    return group.conditions.every(c =>
      'logic' in c ? evaluateConditionGroup(c, data) : evaluateCondition(c, data)
    )
  }
  return group.conditions.some(c =>
    'logic' in c ? evaluateConditionGroup(c, data) : evaluateCondition(c, data)
  )
}

function evaluateCondition(cond: WorkflowCondition, data: Record<string, unknown>): boolean {
  const parts = cond.field.split('.')
  let value: unknown = data
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return false
    value = (value as Record<string, unknown>)[part]
  }
  switch (cond.operator) {
    case 'is_set':       return value != null && value !== ''
    case 'is_not_set':   return value == null || value === ''
    case 'equals':       return String(value) === cond.value
    case 'not_equals':   return String(value) !== cond.value
    case 'contains':     return String(value).includes(cond.value ?? '')
    case 'greater_than': return Number(value) > Number(cond.value)
    case 'less_than':    return Number(value) < Number(cond.value)
    default:             return false
  }
}
```

**Backward compat:** The existing workflow `conditions` JSONB column (simple `WorkflowCondition[]`) is wrapped in `{ logic: 'AND', conditions: [...] }` at read time if not already a group object.

---

### 3.8 Variable Substitution

Extended to cover the full context resolution order:

```typescript
// src/modules/workflow/engine/context.ts

export function resolveContext(ctx: WorkflowExecutionContext): Record<string, unknown> {
  const loopFrame = ctx.loopStack[ctx.loopStack.length - 1]
  return {
    // Namespaced access
    triggerData: ctx.triggerData,
    nodes: ctx.nodes,
    variables: ctx.variables,
    // Current loop item (if inside a loop)
    ...(loopFrame ? { [loopFrame.itemVariableName]: loopFrame.currentItem } : {}),
    ...(loopFrame?.indexVariableName ? { [loopFrame.indexVariableName]: loopFrame.currentIndex } : {}),
    // Convenience: top-level shortcuts (variables override triggerData on collision)
    ...ctx.triggerData,
    ...ctx.variables,
  }
}

export function resolveField(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split('.')
  let value: unknown = data
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

export function substituteVariables(
  template: string,
  ctx: WorkflowExecutionContext
): string {
  const flat = resolveContext(ctx)
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = resolveField(path.trim(), flat)
    return value != null ? String(value) : ''
  })
}
```

**Context data enrichment** (called before any engine runs):

```typescript
// src/modules/workflow/engine/context.ts
export async function enrichTriggerData(
  tenantId: string,
  triggerData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const enriched = { ...triggerData }

  if (triggerData.bookingId) {
    const booking = await bookingRepository.findWithRelations(
      tenantId,
      triggerData.bookingId as string
    )
    if (booking) {
      enriched.customerEmail = booking.customer?.email ?? ''
      enriched.customerName = booking.customer?.name ?? ''
      enriched.customerPhone = booking.customer?.phone ?? ''
      enriched.staffEmail = booking.staff?.email ?? ''
      enriched.staffName = booking.staff?.name ?? ''
      enriched.serviceName = booking.service?.name ?? ''
      enriched.bookingDate = booking.startTime?.toISOString() ?? ''
      enriched.bookingStatus = booking.status ?? ''
    }
  }

  return enriched
}
```

---

### 3.9 Expression Evaluator

For `SET_VARIABLE` nodes using `valueType: 'expression'`. Performs variable substitution first, then safe arithmetic evaluation:

```typescript
// src/modules/workflow/engine/expressions.ts

export function evaluateExpression(
  expression: string,
  ctx: WorkflowExecutionContext
): string | number | boolean {
  // Step 1: substitute all {{field}} tokens
  const substituted = substituteVariables(expression, ctx)

  // Step 2: if result is purely numeric/arithmetic, evaluate it
  if (/^[\d\s+\-*/().]+$/.test(substituted.trim())) {
    // Safe: only digits and arithmetic operators — no identifiers or function calls
    return Function('"use strict"; return (' + substituted + ')')() as number
  }

  // Step 3: boolean literals
  if (substituted === 'true') return true
  if (substituted === 'false') return false

  return substituted
}
```

Supported expression patterns:
- `"{{booking.price}} * 1.2"` → numeric multiplication
- `"{{firstName}} {{lastName}}"` → string concatenation (via substitution)
- `"{{count}} + 1"` → increment
- `"true"` / `"false"` → boolean literals

Not supported (intentionally): function calls, conditionals, loops — use dedicated nodes for those.

---

### 3.10 Graph Engine Implementation

```typescript
// src/modules/workflow/engine/graph.engine.ts

export class GraphEngine {
  private nodes: Map<string, WorkflowNode>
  private adjacency: Map<string, WorkflowEdge[]>  // nodeId → outgoing edges

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.nodes = new Map(nodes.map(n => [n.id, n]))
    this.adjacency = new Map()
    for (const edge of edges) {
      if (!this.adjacency.has(edge.source)) this.adjacency.set(edge.source, [])
      this.adjacency.get(edge.source)!.push(edge)
    }
  }

  async run(
    startNodeId: string,
    context: WorkflowExecutionContext,
    step: InngestStep,
  ): Promise<WorkflowExecutionContext> {
    // Cycle detection guard (nodes visited in this execution path)
    const visitedNodes = new Set<string>()
    return this.executeNode(startNodeId, context, step, visitedNodes)
  }

  private async executeNode(
    nodeId: string,
    context: WorkflowExecutionContext,
    step: InngestStep,
    visitedNodes: Set<string>,
  ): Promise<WorkflowExecutionContext> {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found in graph`)

    // Cycle detection (LOOP nodes are exempt — handled separately)
    if (node.type !== 'LOOP' && node.type !== 'LOOP_END') {
      if (visitedNodes.has(nodeId)) {
        throw new Error(`Cycle detected at node ${nodeId} — workflow graph must be a DAG`)
      }
      visitedNodes.add(nodeId)
    }

    let output: Record<string, unknown> = {}
    let nextHandle = 'output'
    let updatedContext = context

    try {
      switch (node.type) {

        case 'TRIGGER':
          // Entry point — context already enriched, just pass through
          break

        case 'IF': {
          const cfg = node.config as IfNodeConfig
          const result = evaluateConditionGroup(cfg.conditions, resolveContext(context))
          nextHandle = result ? 'true' : 'false'
          output = { result }
          break
        }

        case 'SWITCH': {
          const cfg = node.config as SwitchNodeConfig
          const value = resolveField(cfg.field, resolveContext(context))
          const matched = cfg.cases.find(c =>
            evaluateCondition({ field: cfg.field, operator: c.operator, value: c.value }, resolveContext(context))
          )
          nextHandle = matched?.handle ?? 'default'
          output = { matchedCase: matched?.handle ?? 'default', value: String(value ?? '') }
          break
        }

        case 'MERGE': {
          // Merge is a convergence point — when reached by a single path, just pass through.
          // Parallel branch execution is handled by the caller before reaching here.
          nextHandle = 'output'
          break
        }

        case 'LOOP': {
          const cfg = node.config as LoopNodeConfig
          const items = resolveField(cfg.sourceField, resolveContext(context))
          if (!Array.isArray(items)) {
            output = { iterations: 0, results: [] }
            break
          }

          const loopItems = items.slice(0, cfg.maxIterations ?? 100)
          const iterationOutputs: unknown[] = []
          const itemEdge = this.adjacency.get(nodeId)?.find(e => e.sourceHandle === 'item')

          if (!itemEdge) {
            log.warn({ nodeId }, 'LOOP node has no "item" edge — skipping')
            break
          }

          if (cfg.mode === 'sequential') {
            for (let i = 0; i < loopItems.length; i++) {
              const loopCtx = pushLoopFrame(updatedContext, cfg, loopItems, i)
              const result = await this.executeNode(itemEdge.target, loopCtx, step, new Set(visitedNodes))
              iterationOutputs.push(result.nodes[itemEdge.target]?.output ?? {})
              // Merge variables back but not the loop frame
              updatedContext = popLoopFrame(result, updatedContext)
            }
          } else {
            // parallel mode
            const results = await Promise.all(
              loopItems.map((_, i) => {
                const loopCtx = pushLoopFrame(updatedContext, cfg, loopItems, i)
                return step.run(`loop-${nodeId}-iter-${i}`, () =>
                  this.executeNode(itemEdge.target, loopCtx, step, new Set(visitedNodes))
                )
              })
            )
            results.forEach((r, i) => iterationOutputs.push(r.nodes[itemEdge.target]?.output ?? {}))
          }

          output = { iterations: loopItems.length, results: iterationOutputs }

          // Follow "done" edge after all iterations
          const doneEdge = this.adjacency.get(nodeId)?.find(e => e.sourceHandle === 'done')
          if (doneEdge) {
            updatedContext = this.mergeNodeOutput(updatedContext, nodeId, output)
            return this.executeNode(doneEdge.target, updatedContext, step, visitedNodes)
          }
          return this.mergeNodeOutput(updatedContext, nodeId, output)
        }

        case 'WAIT_FOR_EVENT': {
          const cfg = node.config as WaitForEventNodeConfig
          const matchValue = resolveField(cfg.matchSourceField, resolveContext(context))
          const received = await step.waitForEvent(`wait-event-${nodeId}`, {
            event: cfg.event,
            match: `data.${cfg.matchField} == "${String(matchValue)}"`,
            timeout: cfg.timeout,
          })

          if (!received) {
            nextHandle = 'timeout'
            output = { timedOut: true }
            if (cfg.timeoutBehavior === 'stop') return context
            if (cfg.timeoutBehavior === 'error') {
              throw new Error(`WAIT_FOR_EVENT timed out waiting for ${cfg.event}`)
            }
          } else {
            nextHandle = 'received'
            output = cfg.outputField
              ? { [cfg.outputField]: received.data }
              : { receivedEvent: received.data }
            updatedContext = {
              ...context,
              variables: {
                ...context.variables,
                ...(cfg.outputField ? { [cfg.outputField]: received.data } : {}),
              }
            }
          }
          break
        }

        case 'WAIT_UNTIL': {
          const cfg = node.config as WaitUntilNodeConfig
          let sleepTarget: string
          if (cfg.mode === 'duration') sleepTarget = cfg.duration!
          else if (cfg.mode === 'datetime') sleepTarget = cfg.datetime!
          else sleepTarget = String(resolveField(cfg.field!, resolveContext(context)) ?? 'PT0S')
          await step.sleep(`sleep-${nodeId}`, sleepTarget)
          break
        }

        case 'SET_VARIABLE': {
          const cfg = node.config as SetVariableNodeConfig
          const newVars: Record<string, unknown> = {}
          for (const assignment of cfg.assignments) {
            if (assignment.valueType === 'literal') {
              newVars[assignment.key] = assignment.literal
            } else if (assignment.valueType === 'field') {
              newVars[assignment.key] = resolveField(assignment.field!, resolveContext(context))
            } else if (assignment.valueType === 'expression') {
              newVars[assignment.key] = evaluateExpression(assignment.expression!, context)
            }
          }
          output = newVars
          updatedContext = {
            ...context,
            variables: { ...context.variables, ...newVars }
          }
          break
        }

        case 'FILTER': {
          const cfg = node.config as FilterNodeConfig
          const arr = resolveField(cfg.sourceField, resolveContext(context))
          const filtered = Array.isArray(arr)
            ? arr.filter(item => evaluateConditionGroup(cfg.conditions, item as Record<string, unknown>))
            : []
          output = { [cfg.outputField]: filtered, count: filtered.length }
          updatedContext = {
            ...context,
            variables: { ...context.variables, [cfg.outputField]: filtered }
          }
          break
        }

        case 'TRANSFORM': {
          const cfg = node.config as TransformNodeConfig
          const flat = resolveContext(context)
          const result: Record<string, unknown> = {}
          for (const mapping of cfg.mappings) {
            let val = resolveField(mapping.sourceField, flat)
            if (mapping.transform) val = applyTransform(val, mapping.transform)
            result[mapping.targetKey] = val
          }
          output = { [cfg.outputField]: result }
          updatedContext = {
            ...context,
            variables: { ...context.variables, [cfg.outputField]: result }
          }
          break
        }

        case 'EXECUTE_WORKFLOW': {
          const cfg = node.config as ExecuteWorkflowNodeConfig
          const flat = resolveContext(context)
          const inputData: Record<string, unknown> = {}
          for (const m of cfg.inputMappings) {
            inputData[m.targetKey] = resolveField(m.sourceField, flat)
          }

          const subDepth = (context.__workflowDepth ?? 0) + 1
          if (subDepth >= 3) {
            log.warn({ nodeId, workflowId: cfg.workflowId }, 'Sub-workflow depth limit — skipping')
            output = { skipped: true, reason: 'depth-limit' }
            nextHandle = 'error'
            break
          }

          if (cfg.mode === 'fire_and_forget') {
            await step.run(`sub-wf-send-${nodeId}`, () =>
              inngest.send({
                name: 'workflow/execute',
                data: {
                  workflowId: cfg.workflowId,
                  tenantId: context.triggerData.tenantId as string,
                  triggerEvent: 'EXECUTE_WORKFLOW',
                  triggerData: { ...inputData, __workflowDepth: subDepth },
                }
              })
            )
          } else {
            // sync: send + wait for completion event
            const correlationId = crypto.randomUUID()
            await step.run(`sub-wf-send-${nodeId}`, () =>
              inngest.send({
                name: 'workflow/execute',
                data: {
                  workflowId: cfg.workflowId,
                  tenantId: context.triggerData.tenantId as string,
                  triggerEvent: 'EXECUTE_WORKFLOW',
                  triggerData: { ...inputData, __workflowDepth: subDepth, __correlationId: correlationId },
                }
              })
            )
            const result = await step.waitForEvent(`sub-wf-result-${nodeId}`, {
              event: 'workflow/completed',
              match: `data.correlationId == "${correlationId}"`,
              timeout: '1h',
            })
            if (result?.data?.output && cfg.outputField) {
              output = { [cfg.outputField]: result.data.output }
              updatedContext = {
                ...context,
                variables: { ...context.variables, [cfg.outputField]: result.data.output }
              }
            }
          }
          break
        }

        // Action nodes — delegate to shared executeAction()
        case 'SEND_EMAIL':
        case 'SEND_SMS':
        case 'WEBHOOK':
        case 'CREATE_CALENDAR_EVENT':
        case 'UPDATE_BOOKING_STATUS':
        case 'CREATE_TASK':
        case 'SEND_NOTIFICATION': {
          const enrichedConfig = substituteConfigVariables(node.config, context)
          const actionResult = await step.run(`action-${nodeId}`, () =>
            executeAction(node.type as WorkflowActionType, enrichedConfig, resolveContext(context))
          )
          output = actionResult ?? {}
          if (actionResult?.error) nextHandle = 'error'
          break
        }

        case 'STOP':
          return context  // terminal — do not follow edges

        case 'ERROR':
          throw new Error(`Workflow reached ERROR terminal node: ${node.label ?? nodeId}`)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      output = { error: errMsg }

      if (node.errorHandling === 'branch') {
        nextHandle = 'error'
        log.warn({ nodeId, err: errMsg }, 'Node failed — routing to error branch')
      } else if (node.errorHandling === 'continue') {
        log.warn({ nodeId, err: errMsg }, 'Node failed — continuing (errorHandling=continue)')
        nextHandle = 'output'
      } else {
        throw err  // 'stop' (default) — propagate so Inngest can retry
      }
    }

    // Merge this node's output into context
    updatedContext = this.mergeNodeOutput(updatedContext, nodeId, output)

    // Find matching outgoing edge
    const edges = this.adjacency.get(nodeId) ?? []
    const nextEdge = edges.find(e => e.sourceHandle === nextHandle)
    if (!nextEdge) return updatedContext  // terminal or no matching edge

    // Parallel branch detection: if next node is MERGE, check if all incoming branches arrived
    const nextNode = this.nodes.get(nextEdge.target)
    if (nextNode?.type === 'MERGE') {
      // Single-path arrival — just pass through; parallel resolution handled by executeParallelBranches()
      return updatedContext
    }

    return this.executeNode(nextEdge.target, updatedContext, step, visitedNodes)
  }

  private mergeNodeOutput(
    ctx: WorkflowExecutionContext,
    nodeId: string,
    output: Record<string, unknown>
  ): WorkflowExecutionContext {
    return {
      ...ctx,
      nodes: {
        ...ctx.nodes,
        [nodeId]: { output, success: true },
      }
    }
  }
}
```

---

### 3.11 Parallel Branch Execution (IF/SWITCH → MERGE)

When an IF or SWITCH fans out to multiple paths that reconverge at a MERGE node, the engine detects the fan-out and executes branches appropriately:

```typescript
// src/modules/workflow/engine/graph.engine.ts
async function executeParallelBranches(
  engine: GraphEngine,
  branchStartNodeIds: string[],
  mergeNodeId: string,
  mergeConfig: MergeNodeConfig,
  context: WorkflowExecutionContext,
  step: InngestStep,
): Promise<WorkflowExecutionContext> {

  if (mergeConfig.mode === 'wait_any') {
    // Race: first branch to reach MERGE wins; others are abandoned
    const result = await Promise.race(
      branchStartNodeIds.map(nodeId =>
        step.run(`branch-race-${nodeId}`, () => engine.run(nodeId, context, step))
      )
    )
    return result
  }

  // wait_all and append: execute all branches concurrently
  const results = await Promise.all(
    branchStartNodeIds.map(nodeId =>
      step.run(`branch-${nodeId}`, () => engine.run(nodeId, context, step))
    )
  )

  if (mergeConfig.mode === 'append') {
    return {
      ...context,
      nodes: {
        ...context.nodes,
        [mergeNodeId]: {
          output: { mergedOutputs: results.map(r => r.nodes) },
          success: true,
        }
      }
    }
  }

  // wait_all: deep-merge all contexts (last writer wins per key)
  return results.reduce((acc, r) => ({
    ...acc,
    nodes: { ...acc.nodes, ...r.nodes },
    variables: { ...acc.variables, ...r.variables },
  }), context)
}
```

---

### 3.12 Linear Engine (unchanged — backward compat)

```typescript
// src/modules/workflow/engine/linear.engine.ts
// Reads workflowActions ORDER BY order — original sequential executor

export async function runLinearEngine(
  actions: WorkflowAction[],
  context: WorkflowExecutionContext,
  step: InngestStep,
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = []

  for (const action of actions) {
    const startedAt = new Date().toISOString()

    if (action.config.delay) {
      await step.sleep(`delay-${action.id}`, action.config.delay)
    }

    try {
      const enrichedConfig = substituteConfigVariables(action.config, context)
      const output = await step.run(`action-${action.id}`, () =>
        executeAction(action.actionType, enrichedConfig, resolveContext(context))
      )
      results.push({
        actionId: action.id, actionType: action.actionType, order: action.order,
        success: true, startedAt, completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        output: output ?? {},
      })
    } catch (err) {
      results.push({
        actionId: action.id, actionType: action.actionType, order: action.order,
        success: false, startedAt, completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        error: err instanceof Error ? err.message : String(err),
      })
      throw err  // re-throw for Inngest retry
    }
  }

  return results
}
```

---

### 3.13 Per-Step Execution Logging

`workflowExecutions.actionResults` JSONB stores the full execution log (shared by both engines):

```typescript
interface NodeExecutionResult {
  nodeId: string                           // graph mode: node id; linear mode: action id
  nodeType: WorkflowNodeType | WorkflowActionType
  label?: string
  order?: number                           // linear mode only
  startedAt: string                        // ISO timestamp
  completedAt: string
  durationMs: number
  success: boolean
  skipped: boolean
  skipReason?: string
  nextHandle?: string                      // graph mode: which output edge was taken ("true", "false", "case_0")
  output?: Record<string, unknown>
  error?: string
  iterations?: number                      // LOOP nodes
  branchResults?: NodeExecutionResult[]    // parallel branch children
}
```

---

### 3.14 Idempotency

Two levels:

1. **Workflow-level:** `workflowExecutions` row inserted with composite natural key `(workflowId, triggerEvent, bookingId)`. If already COMPLETED, skip.
2. **Action-level:** For SEND_EMAIL/SEND_SMS, the notification module's `sentMessages` table deduplicates on `(bookingId, trigger, channel)`.
3. **Graph node-level:** Inngest `step.run` and `step.waitForEvent` are idempotent by step ID — replaying a failed function re-uses cached results for already-completed steps.

---

### 3.15 Loop Prevention

Two distinct loop risks:

**Event loop** (`UPDATE_BOOKING_STATUS` triggering new booking events):
```typescript
// Checked at executeWorkflow() entry
const depth = (triggerData.__workflowDepth ?? 0) as number
if (depth >= 3) {
  log.warn({ workflowId }, 'Workflow depth limit reached — halting')
  return { skipped: true, reason: 'loop-protection' }
}
enriched.__workflowDepth = depth + 1
```

**Graph cycle** (structural cycle in nodes/edges):
```typescript
// Detected at graph save time (validateWorkflowGraph) and at runtime (visitedNodes Set)
// LOOP/LOOP_END edges are exempted from cycle detection — they are intentional back-edges
```

---

### 3.16 Graph Validation (Service Layer)

Before saving a graph-mode workflow, validate it is structurally sound:

```typescript
// src/modules/workflow/workflow.service.ts
export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] {
  const errors: string[] = []
  const nodeIds = new Set(nodes.map(n => n.id))

  // 1. Exactly one TRIGGER node
  const triggers = nodes.filter(n => n.type === 'TRIGGER')
  if (triggers.length !== 1) errors.push('Workflow must have exactly one TRIGGER node')

  // 2. All edge references are valid node IDs
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) errors.push(`Edge ${edge.id} references unknown source node ${edge.source}`)
    if (!nodeIds.has(edge.target)) errors.push(`Edge ${edge.id} references unknown target node ${edge.target}`)
  }

  // 3. No orphan non-TRIGGER nodes (every non-TRIGGER must have at least one incoming edge)
  const hasIncoming = new Set(edges.map(e => e.target))
  for (const node of nodes.filter(n => n.type !== 'TRIGGER')) {
    if (!hasIncoming.has(node.id)) {
      errors.push(`Node "${node.label ?? node.id}" (${node.type}) has no incoming connections`)
    }
  }

  // 4. No structural cycles (DFS — LOOP back-edges are excluded from cycle check)
  if (hasCycle(nodes, edges)) errors.push('Workflow graph contains a cycle (use LOOP node for iteration)')

  // 5. IF nodes must have both "true" and "false" edges
  for (const node of nodes.filter(n => n.type === 'IF')) {
    const handles = edges.filter(e => e.source === node.id).map(e => e.sourceHandle)
    if (!handles.includes('true')) errors.push(`IF node "${node.label ?? node.id}" missing "true" branch`)
    if (!handles.includes('false')) errors.push(`IF node "${node.label ?? node.id}" missing "false" branch`)
  }

  // 6. SWITCH nodes must have at least one case edge
  for (const node of nodes.filter(n => n.type === 'SWITCH')) {
    if (!edges.some(e => e.source === node.id)) {
      errors.push(`SWITCH node "${node.label ?? node.id}" has no case edges`)
    }
  }

  // 7. LOOP nodes must have an "item" edge
  for (const node of nodes.filter(n => n.type === 'LOOP')) {
    if (!edges.some(e => e.source === node.id && e.sourceHandle === 'item')) {
      errors.push(`LOOP node "${node.label ?? node.id}" missing "item" edge (loop body)`)
    }
  }

  // 8. WAIT_FOR_EVENT nodes must specify both "received" and "timeout" edges OR at least "received"
  for (const node of nodes.filter(n => n.type === 'WAIT_FOR_EVENT')) {
    if (!edges.some(e => e.source === node.id && e.sourceHandle === 'received')) {
      errors.push(`WAIT_FOR_EVENT node "${node.label ?? node.id}" missing "received" edge`)
    }
  }

  return errors
}
```

---

### 3.17 Inngest Functions (Updated)

```typescript
// workflow.events.ts — all functions exported as workflowFunctions array

// 6 trigger dispatchers (one per booking lifecycle event + forms + review)
const triggerOnBookingCreated    // listens: 'booking/created'
const triggerOnBookingConfirmed  // listens: 'booking/confirmed'
const triggerOnBookingCancelled  // listens: 'booking/cancelled'
const triggerOnBookingCompleted  // listens: 'booking/completed'
const triggerOnFormSubmitted     // listens: 'forms/submitted'
const triggerOnReviewSubmitted   // listens: 'review/submitted'

// 1 executor (routes to linear or graph engine based on isVisual flag)
const executeWorkflow            // listens: 'workflow/execute', retries: 3
```

---

### 3.18 Complete File Structure

```
src/modules/workflow/
  engine/
    linear.engine.ts         # original sequential executor (unchanged interface)
    graph.engine.ts          # GraphEngine class — graph traversal, all node types
    conditions.ts            # evaluateConditionGroup, evaluateCondition (AND/OR/nested)
    expressions.ts           # evaluateExpression (safe arithmetic + substitution)
    context.ts               # resolveContext, resolveField, substituteVariables, enrichTriggerData
    actions.ts               # executeAction — all 7 action types (shared by both engines)
    parallel.ts              # executeParallelBranches (IF/SWITCH → MERGE fan-out)
    loop.ts                  # pushLoopFrame, popLoopFrame helpers
    transforms.ts            # applyTransform (uppercase, lowercase, toNumber, etc.)
    validate.ts              # validateWorkflowGraph, hasCycle (DFS)
  workflow.types.ts          # All interfaces: WorkflowNode, WorkflowEdge, WorkflowExecutionContext,
                             #   WorkflowConditionGroup, all NodeConfig variants, NodeExecutionResult
  workflow.schemas.ts        # Zod: createWorkflow (linear + graph), updateWorkflow, node/edge schemas
  workflow.repository.ts     # findById, findByTrigger, listByTenant, create, update, delete,
                             #   findActionsByWorkflowId, recordExecution, findExecution, listExecutions
  workflow.service.ts        # CRUD + getExecutionHistory + validateGraph + testTrigger
  workflow.router.ts         # tRPC: list, getById, create, update, delete, getExecutions, testTrigger, validateGraph
  workflow.events.ts         # Inngest: 6 trigger dispatchers + executeWorkflow executor
  index.ts                   # barrel
  __tests__/
    linear.engine.test.ts    # original sequential tests (condition eval, variable substitution, loop detection)
    graph.engine.test.ts     # graph traversal, IF true/false routing, SWITCH cases, MERGE modes, LOOP sequential+parallel
    conditions.test.ts       # AND/OR/nested group evaluation, all 7 operators, dot-path resolution
    expressions.test.ts      # evaluateExpression: arithmetic, string concat, boolean literals
    context.test.ts          # resolveContext variable precedence order, substituteVariables
    validate.test.ts         # graph validation: cycles, orphans, missing handles, LOOP without item edge
    integration.test.ts      # full workflow execution paths (mocked Inngest step functions)
```

---

## 4. Team Module

### 4.1 Availability Query Spec (Critical)

The booking system needs to know: *"Which staff are available at date X, time Y, for duration Z?"*

**Precedence rules (highest wins):**
1. `BLOCKED` entries covering the date → staff is NOT available
2. `SPECIFIC` entries for exact date → overrides recurring
3. `RECURRING` entries for that day of week → base availability
4. If nothing matches → staff is NOT available (no entry = not available)

```typescript
// In team.repository.ts
async function getStaffAvailableSlots(
  tenantId: string,
  staffId: string,
  date: Date,
  timezone: string
): Promise<{ startTime: string; endTime: string }[]> {
  const dayOfWeek = getDayInTimezone(date, timezone)  // 0=Sunday, 6=Saturday
  const dateStr = formatDateInTimezone(date, timezone) // "2026-02-19"

  // 1. Check blocked entries that cover this date
  const blocked = await db.select().from(userAvailability).where(
    and(
      eq(userAvailability.userId, staffId),
      eq(userAvailability.type, 'BLOCKED'),
      lte(userAvailability.specificDate, dateStr),
      or(
        isNull(userAvailability.endDate),
        gte(userAvailability.endDate, dateStr)
      )
    )
  )
  if (blocked.length > 0) return []  // Fully blocked

  // 2. Check SPECIFIC entries for this exact date
  const specific = await db.select().from(userAvailability).where(
    and(
      eq(userAvailability.userId, staffId),
      eq(userAvailability.type, 'SPECIFIC'),
      eq(userAvailability.specificDate, dateStr)
    )
  )
  if (specific.length > 0) {
    return specific.map(s => ({ startTime: s.startTime!, endTime: s.endTime! }))
  }

  // 3. Fall back to RECURRING entries for this day of week
  const recurring = await db.select().from(userAvailability).where(
    and(
      eq(userAvailability.userId, staffId),
      eq(userAvailability.type, 'RECURRING'),
      eq(userAvailability.dayOfWeek, dayOfWeek)
    )
  )
  return recurring.map(r => ({ startTime: r.startTime!, endTime: r.endTime! }))
}
```

### 4.2 Capacity Resolution

**Source of truth priority:**
1. `userCapacities` table entry for specific date (most specific)
2. `users.defaultMaxDailyBookings` column (fallback)
3. `organizationSettings.defaultSlotCapacity` (global fallback)

```typescript
async function getStaffCapacityForDate(
  tenantId: string,
  staffId: string,
  date: string
): Promise<number> {
  const [specific] = await db.select().from(userCapacities).where(
    and(eq(userCapacities.userId, staffId), eq(userCapacities.date, date))
  ).limit(1)
  if (specific) return specific.maxBookings

  const [staff] = await db.select({ maxBookings: users.defaultMaxDailyBookings })
    .from(users).where(eq(users.id, staffId)).limit(1)
  if (staff?.maxBookings) return staff.maxBookings

  const [settings] = await db.select({ cap: organizationSettings.defaultSlotCapacity })
    .from(organizationSettings).where(eq(organizationSettings.tenantId, tenantId)).limit(1)
  return settings?.cap ?? 8  // hard fallback
}
```

### 4.3 tRPC Router Procedures

```typescript
// team.router.ts
export const teamRouter = router({
  // Staff management
  list:           tenantProcedure.input(listStaffSchema).query()
  getById:        tenantProcedure.input(z.object({ userId: z.string() })).query()
  create:         permissionProcedure('staff:write').input(createStaffSchema).mutation()
  update:         permissionProcedure('staff:write').input(updateStaffSchema).mutation()
  deactivate:     permissionProcedure('staff:write').input(z.object({ userId: z.string() })).mutation()

  // Availability
  getAvailability:  tenantProcedure.input(getAvailabilitySchema).query()
  setAvailability:  permissionProcedure('staff:write').input(setAvailabilitySchema).mutation()
  blockDates:       permissionProcedure('staff:write').input(blockDatesSchema).mutation()

  // Capacity
  getCapacity:    tenantProcedure.input(getCapacitySchema).query()
  setCapacity:    permissionProcedure('staff:write').input(setCapacitySchema).mutation()

  // Schedule view
  getSchedule:    tenantProcedure.input(getScheduleSchema).query()
})
```

### 4.4 setAvailability Input Schema

The plan's schema only supports RECURRING. The full schema must cover all three types:

```typescript
export const availabilityEntrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RECURRING'),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    type: z.literal('SPECIFIC'),
    specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    type: z.literal('BLOCKED'),
    specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    reason: z.string().max(255).optional(),
    isAllDay: z.boolean().default(true),
  }),
])

export const setAvailabilitySchema = z.object({
  userId: z.string(),
  entries: z.array(availabilityEntrySchema).min(0),
  replaceAll: z.boolean().default(false), // if true, delete existing RECURRING entries first
})
```

---

## 5. Customer Module

### 5.1 Merge Cascade Spec

Customer merge is a critical, destructive, audited operation.

```typescript
// customer.service.ts
async function mergeCustomers(
  ctx: TRPCContext,
  sourceId: string,
  targetId: string
): Promise<void> {
  requirePermission(ctx.user, 'customers:write')

  // Load both to verify they exist and belong to tenant
  const [source, target] = await Promise.all([
    customerRepository.findById(ctx.tenantId, sourceId),
    customerRepository.findById(ctx.tenantId, targetId),
  ])
  if (!source) throw new NotFoundError('Source customer not found')
  if (!target) throw new NotFoundError('Target customer not found')

  // Snapshot source for audit before deletion
  const sourceSnapshot = { ...source }

  await db.transaction(async (tx) => {
    // Re-parent all 7 tables
    await tx.update(bookings).set({ customerId: targetId }).where(eq(bookings.customerId, sourceId))
    await tx.update(customerNotes).set({ customerId: targetId }).where(eq(customerNotes.customerId, sourceId))
    await tx.update(completedForms).set({ customerId: targetId }).where(eq(completedForms.customerId, sourceId))
    await tx.update(reviews).set({ customerId: targetId }).where(eq(reviews.customerId, sourceId))
    await tx.update(reviewRequests).set({ customerId: targetId }).where(eq(reviewRequests.customerId, sourceId))
    await tx.update(invoices).set({ customerId: targetId }).where(eq(invoices.customerId, sourceId))
    await tx.update(payments).set({ customerId: targetId }).where(eq(payments.customerId, sourceId))

    // Soft-delete source (set deletedAt, don't hard delete)
    await tx.update(customers)
      .set({ deletedAt: new Date(), mergedIntoId: targetId })
      .where(eq(customers.id, sourceId))

    // Write audit log
    await tx.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CUSTOMER_MERGED',
      entityType: 'customer',
      entityId: sourceId,
      oldValues: sourceSnapshot,
      newValues: { mergedIntoId: targetId },
      severity: 'WARNING',
      createdAt: new Date(),
    })
  })
}
```

### 5.2 GDPR Anonymization Stub

```typescript
async function anonymiseCustomer(ctx: TRPCContext, customerId: string): Promise<void> {
  requirePermission(ctx.user, 'customers:delete')

  const hash = crypto.createHash('sha256')
    .update(`${customerId}-${ctx.tenantId}`)
    .digest('hex')
    .slice(0, 8)

  await db.update(customers)
    .set({
      name: `[Anonymised ${hash}]`,
      email: `anonymised-${hash}@deleted.invalid`,
      phone: null,
      notes: null,
      tags: [],
      anonymisedAt: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, ctx.tenantId)))

  // Note: customerNotes with isPrivate=true should also be deleted
  await db.delete(customerNotes)
    .where(and(eq(customerNotes.customerId, customerId), eq(customerNotes.isPrivate, true)))
}
```

### 5.3 Router Procedures

```typescript
export const customerRouter = router({
  list:        tenantProcedure.input(listCustomersSchema).query()
  getById:     tenantProcedure.input(z.object({ id: z.string() })).query()
  create:      tenantProcedure.input(createCustomerSchema).mutation()
  update:      tenantProcedure.input(updateCustomerSchema).mutation()
  delete:      permissionProcedure('customers:delete').input(z.object({ id: z.string() })).mutation()
  merge:       permissionProcedure('customers:write').input(mergeCustomersSchema).mutation()
  anonymise:   permissionProcedure('customers:delete').input(z.object({ id: z.string() })).mutation()

  // Notes
  listNotes:   tenantProcedure.input(z.object({ customerId: z.string() })).query()
  addNote:     tenantProcedure.input(addNoteSchema).mutation()
  deleteNote:  permissionProcedure('customers:write').input(z.object({ noteId: z.string() })).mutation()

  // History
  getBookingHistory: tenantProcedure.input(z.object({ customerId: z.string() })).query()
})
```

---

## 6. Forms Module

### 6.1 Field Validation at Submit Time

When a form response is submitted, it must be validated against the template's field definitions.

```typescript
// forms.service.ts
async function submitFormResponse(
  token: string,
  responses: Record<string, unknown>
): Promise<void> {
  // Load form instance (completedForms row where sessionKey = token)
  const instance = await formsRepository.findByToken(token)
  if (!instance) throw new NotFoundError('Form not found')
  if (instance.status !== 'PENDING') throw new BadRequestError('Form already completed')
  if (instance.expiresAt && instance.expiresAt < new Date()) {
    throw new BadRequestError('Form link has expired')
  }

  // Load template for validation
  const template = await formsRepository.findTemplateById(instance.templateId)
  if (!template) throw new NotFoundError('Form template not found')

  // Validate responses against field definitions
  const errors = validateFormResponses(template.fields as FormField[], responses)
  if (errors.length > 0) {
    throw new BadRequestError(`Form validation failed: ${errors.join(', ')}`)
  }

  // Save
  await formsRepository.markCompleted(instance.id, responses)

  // Emit event for workflow triggers
  await inngest.send({
    name: 'forms/submitted',
    data: { formId: instance.id, bookingId: instance.bookingId, tenantId: instance.tenantId, customerId: instance.customerId },
  })
}
```

**Field validation logic:**
```typescript
interface FormField {
  id: string
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'DATE' | 'BOOLEAN' | 'EMAIL' | 'PHONE'
  label: string
  required: boolean
  options?: string[]           // For SELECT/MULTISELECT
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string           // Regex
    min?: string               // For DATE: ISO string
    max?: string
  }
}

function validateFormResponses(fields: FormField[], responses: Record<string, unknown>): string[] {
  const errors: string[] = []
  for (const field of fields) {
    const value = responses[field.id]

    if (field.required && (value == null || value === '')) {
      errors.push(`${field.label} is required`)
      continue
    }

    if (value != null && value !== '') {
      switch (field.type) {
        case 'EMAIL':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            errors.push(`${field.label} must be a valid email`)
          }
          break
        case 'SELECT':
          if (!field.options?.includes(String(value))) {
            errors.push(`${field.label}: invalid option`)
          }
          break
        case 'TEXT':
        case 'TEXTAREA':
          if (field.validation?.minLength && String(value).length < field.validation.minLength) {
            errors.push(`${field.label} must be at least ${field.validation.minLength} characters`)
          }
          if (field.validation?.maxLength && String(value).length > field.validation.maxLength) {
            errors.push(`${field.label} must be at most ${field.validation.maxLength} characters`)
          }
          break
      }
    }
  }
  return errors
}
```

### 6.2 Public Form Token

`completedForms.sessionKey` is the public token. Generation:

```typescript
// When creating form instance (on booking creation):
const sessionKey = crypto.randomUUID()

await db.insert(completedForms).values({
  id: crypto.randomUUID(),
  tenantId,
  templateId: template.id,
  bookingId,
  customerId,
  sessionKey,
  status: 'PENDING',
  expiresAt: addDays(new Date(), 7),  // 7-day expiry
  createdAt: new Date(),
})

// Return public URL: `${process.env.NEXT_PUBLIC_APP_URL}/forms/${sessionKey}`
```

### 6.3 Router Procedures

```typescript
export const formsRouter = router({
  // Admin
  listTemplates:    tenantProcedure.input(listTemplatesSchema).query()
  getTemplate:      tenantProcedure.input(z.object({ id: z.string() })).query()
  createTemplate:   permissionProcedure('forms:write').input(createTemplateSchema).mutation()
  updateTemplate:   permissionProcedure('forms:write').input(updateTemplateSchema).mutation()
  deleteTemplate:   permissionProcedure('forms:write').input(z.object({ id: z.string() })).mutation()
  sendForm:         permissionProcedure('forms:write').input(sendFormSchema).mutation()
  listResponses:    tenantProcedure.input(listResponsesSchema).query()
  getResponse:      tenantProcedure.input(z.object({ id: z.string() })).query()

  // Public (token-based)
  getFormByToken:   publicProcedure.input(z.object({ token: z.string() })).query()
  submitForm:       publicProcedure.input(submitFormSchema).mutation()
})
```

---

## 7. Review Module

### 7.1 State Machine

`reviewRequests.status` transitions:

```
PENDING → SENT (after Inngest function delivers email/SMS)
SENT    → DELIVERED (optional: webhook from provider)
SENT    → BOUNCED (provider confirms undeliverable)
SENT    → IGNORED (TTL expired, no response after 7 days)
SENT    → COMPLETED (customer submits review)
DELIVERED → COMPLETED
BOUNCED → (terminal)
IGNORED → (terminal)
```

Cron job (daily): Mark SENT requests older than 7 days as IGNORED.

### 7.2 Pre-Screening Logic

```typescript
// review.service.ts
async function shouldRequestReview(
  tenantId: string,
  bookingId: string,
  settings: ReviewAutomationSettings
): Promise<{ proceed: boolean; reason?: string }> {
  if (!settings.enabled) return { proceed: false, reason: 'automation-disabled' }
  if (!settings.preScreenEnabled) return { proceed: true }

  // Pre-screening: only proceed if customer is likely to leave a positive review
  // Check historical reviews from this customer
  const booking = await bookingRepository.findWithRelations(tenantId, bookingId)
  if (!booking?.customerId) return { proceed: true }

  const recentReviews = await reviewRepository.findByCustomer(tenantId, booking.customerId, { limit: 5 })
  if (recentReviews.length === 0) return { proceed: true }  // New customer, always proceed

  const avgRating = recentReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / recentReviews.length
  const threshold = settings.autoPublicMinRating ?? 4  // Default: only ask if avg >= 4

  if (avgRating < threshold) {
    return { proceed: false, reason: `pre-screen: avg rating ${avgRating} < threshold ${threshold}` }
  }
  return { proceed: true }
}
```

### 7.3 Review Automation: Multi-Channel Routing

```typescript
// review.events.ts — Inngest function
const scheduleReviewRequest = inngest.createFunction(
  { id: 'schedule-review-request', retries: 3 },
  { event: 'review/request.send' },
  async ({ event, step }) => {
    const { bookingId, customerId, delay } = event.data

    // Wait if delay specified (e.g., "PT24H")
    if (delay) {
      await step.sleep('wait-for-timing', delay)
    }

    const [settings, booking] = await step.run('load-data', async () => {
      const settings = await reviewRepository.getAutomationSettings(event.data.tenantId)
      const booking = await bookingRepository.findWithRelations(event.data.tenantId, bookingId)
      return { settings, booking }
    })

    if (!settings || !booking) return

    const { proceed, reason } = await step.run('pre-screen', () =>
      reviewService.shouldRequestReview(event.data.tenantId, bookingId, settings)
    )
    if (!proceed) {
      log.info({ bookingId, reason }, 'Review request skipped by pre-screen')
      return
    }

    // Create review request record
    const reviewRequest = await step.run('create-request', () =>
      reviewRepository.createRequest({
        tenantId: event.data.tenantId,
        bookingId,
        customerId,
        status: 'PENDING',
      })
    )

    // Route to enabled channels
    const token = reviewRequest.id  // Token for review submission URL
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reviews/${token}`

    if (settings.googleEnabled && booking.customer?.email) {
      await step.run('send-google-review-email', () =>
        inngest.send({
          name: 'notification/send.email',
          data: {
            to: booking.customer.email,
            subject: settings.messageTemplate ?? 'How was your appointment?',
            html: renderReviewEmailHtml({ reviewUrl, channel: 'google', booking }),
            tenantId: event.data.tenantId,
            trigger: 'REVIEW_REQUEST',
            bookingId,
          }
        })
      )
    }

    if (settings.privateEnabled) {
      // Private review goes to internal system
      await step.run('create-private-review-request', () =>
        reviewRepository.updateRequestStatus(reviewRequest.id, 'SENT')
      )
    }
  }
)
```

### 7.4 Issue Resolution Flow

When a review has a low rating, staff can flag and resolve it:

```typescript
// review.router.ts
resolveIssue: permissionProcedure('reviews:write')
  .input(z.object({
    reviewId: z.string(),
    resolutionStatus: z.enum(['CONTACTED', 'RESOLVED', 'DISMISSED']),
    resolutionNotes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    await reviewRepository.updateResolution(ctx.tenantId, input.reviewId, {
      resolutionStatus: input.resolutionStatus,
      resolutionNotes: input.resolutionNotes,
      resolvedBy: ctx.userId,
      resolvedAt: new Date(),
    })
  })
```

---

## 8. Tenant Module

### 8.1 organizationSettings — Typed Partial Update

The table has 27 typed columns. Updates must be strictly typed (no generic key/value):

```typescript
// tenant.schemas.ts
export const updateOrganizationSettingsSchema = z.object({
  // Business identity
  businessName:     z.string().max(255).optional(),
  legalName:        z.string().max(255).optional(),
  registrationNo:   z.string().max(50).optional(),
  vatNumber:        z.string().max(50).optional(),
  email:            z.string().email().optional(),
  phone:            z.string().max(30).optional(),
  website:          z.string().url().optional(),

  // Address
  addressLine1:     z.string().max(255).optional(),
  addressLine2:     z.string().max(255).optional(),
  city:             z.string().max(100).optional(),
  county:           z.string().max(100).optional(),
  postcode:         z.string().max(20).optional(),
  country:          z.string().max(2).optional(),   // ISO 3166-1 alpha-2

  // Locale
  timezone:         z.string().max(64).optional(),  // IANA tz: "Europe/London"
  currency:         z.string().length(3).optional(), // ISO 4217: "GBP"
  dateFormat:       z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat:       z.enum(['12h', '24h']).optional(),
  weekStartsOn:     z.number().int().min(0).max(6).optional(),

  // Branding
  logoUrl:          z.string().url().optional(),
  faviconUrl:       z.string().url().optional(),
  primaryColor:     z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor:   z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor:      z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily:       z.string().max(100).optional(),
  customCss:        z.string().max(10000).optional(),

  // Booking config
  bookingWindowDays:    z.number().int().min(1).max(365).optional(),
  minNoticeHours:       z.number().int().min(0).max(168).optional(),
  bufferMinutes:        z.number().int().min(0).max(120).optional(),
  allowSameDayBook:     z.boolean().optional(),
  slotDurationMins:     z.number().int().min(5).max(480).optional(),
  slotApprovalEnabled:  z.boolean().optional(),
  slotApprovalHours:    z.number().int().min(1).optional(),
  defaultSlotCapacity:  z.number().int().min(1).optional(),

  // Communication
  senderName:   z.string().max(100).optional(),
  senderEmail:  z.string().email().optional(),
  replyToEmail: z.string().email().optional(),
  emailFooter:  z.string().max(2000).optional(),
  smsSignature: z.string().max(160).optional(),

  // Labels
  customerLabel: z.string().max(50).optional(),
  bookingLabel:  z.string().max(50).optional(),
  staffLabel:    z.string().max(50).optional(),

  // Operational modes (high-impact — confirm with user before changing)
  availabilityMode: z.enum(['CALENDAR_BASED', 'SLOT_BASED', 'HYBRID']).optional(),
  capacityMode:     z.enum(['TENANT_LEVEL', 'CALENDAR_LEVEL', 'STAFF_LEVEL']).optional(),
})
```

### 8.2 Module Enable/Disable

Enabling/disabling a module does NOT cascade-delete data. It gates access at the API layer.

```typescript
// NOTE: tenantModules links via moduleId (UUID FK → modules.id), NOT a text slug column.
// Must join through the modules table to look up by slug.
async function isModuleEnabled(tenantId: string, moduleSlug: string): Promise<boolean> {
  // Check Redis cache first
  const cacheKey = `tenant:modules:${tenantId}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    const moduleMap = JSON.parse(cached) as Record<string, boolean>
    return moduleMap[moduleSlug] ?? false
  }

  // Load from DB — join modules table to resolve slug → moduleId
  const [row] = await db
    .select({ enabled: tenantModules.isEnabled })
    .from(tenantModules)
    .innerJoin(modules, eq(tenantModules.moduleId, modules.id))
    .where(and(eq(tenantModules.tenantId, tenantId), eq(modules.slug, moduleSlug)))
    .limit(1)
  return row?.enabled ?? false
}

// Usage in router:
const formsRouter = router({
  listTemplates: tenantProcedure.query(async ({ ctx }) => {
    if (!(await isModuleEnabled(ctx.tenantId, 'forms'))) {
      throw new ForbiddenError('Forms module is not enabled for this tenant')
    }
    return formsRepository.listTemplates(ctx.tenantId)
  }),
})
```

**Module slugs** (match `modules.slug` column — must exist in the `modules` table):
- `booking-core`, `auth`, `tenant-settings` — core, always enabled
- `team`, `customer`, `forms`, `review`, `workflow`, `calendar-sync`, `notification` — optional

**tenantModules column note:** The join key is `tenantModules.moduleId` (UUID FK → `modules.id`). There is no `moduleKey` text column on `tenantModules`. Always look up by `modules.slug` then join.

### 8.3 Router Procedures

```typescript
export const tenantRouter = router({
  // Settings
  getSettings:     tenantProcedure.query()
  updateSettings:  permissionProcedure('tenant:write').input(updateOrganizationSettingsSchema).mutation()

  // Modules
  listModules:     tenantProcedure.query()
  enableModule:    permissionProcedure('tenant:write').input(z.object({ moduleKey: z.string() })).mutation()
  disableModule:   permissionProcedure('tenant:write').input(z.object({ moduleKey: z.string() })).mutation()
  updateModuleConfig: permissionProcedure('tenant:write').input(updateModuleConfigSchema).mutation()

  // Venues (from venues table in tenant schema)
  listVenues:      tenantProcedure.query()
  createVenue:     permissionProcedure('tenant:write').input(createVenueSchema).mutation()
  updateVenue:     permissionProcedure('tenant:write').input(updateVenueSchema).mutation()
  deleteVenue:     permissionProcedure('tenant:write').input(z.object({ id: z.string() })).mutation()

  // Billing (portal to Stripe/billing - read only for Phase 5)
  getPlan:         tenantProcedure.query()
  getUsage:        tenantProcedure.query()
})
```

---

## 9. Platform Module

### 9.1 Platform Admin Procedures

Platform admins use `platformAdminProcedure` (requires `user.isPlatformAdmin === true` in DB).

```typescript
export const platformRouter = router({
  // Tenant management
  listTenants:     platformAdminProcedure.input(listTenantsSchema).query()
  getTenant:       platformAdminProcedure.input(z.object({ id: z.string() })).query()
  createTenant:    platformAdminProcedure.input(createTenantSchema).mutation()
  updateTenant:    platformAdminProcedure.input(updateTenantSchema).mutation()
  suspendTenant:   platformAdminProcedure.input(z.object({ id: z.string(), reason: z.string() })).mutation()
  activateTenant:  platformAdminProcedure.input(z.object({ id: z.string() })).mutation()

  // Plan management
  changePlan:      platformAdminProcedure.input(changePlanSchema).mutation()

  // Feature flags
  listFlags:       platformAdminProcedure.query()
  setFlag:         platformAdminProcedure.input(setFlagSchema).mutation()
  setTenantFlag:   platformAdminProcedure.input(setTenantFlagSchema).mutation()

  // Signup requests
  listSignupRequests: platformAdminProcedure.query()
  approveSignup:   platformAdminProcedure.input(z.object({ id: z.string() })).mutation()
  rejectSignup:    platformAdminProcedure.input(z.object({ id: z.string(), reason: z.string() })).mutation()

  // Audit
  getAuditLog:     platformAdminProcedure.input(auditLogQuerySchema).query()
})
```

### 9.2 Tenant Provisioning Flow

```typescript
// platform.service.ts
async function provisionTenant(input: CreateTenantInput): Promise<Tenant> {
  await db.transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.insert(tenants).values({
      id: crypto.randomUUID(),
      slug: generateSlug(input.businessName),
      name: input.businessName,
      plan: input.plan ?? 'TRIAL',
      status: 'ACTIVE',
      trialEndsAt: input.plan === 'TRIAL' ? addDays(new Date(), 14) : null,
      createdAt: new Date(),
    }).returning()

    // Create organizationSettings row with defaults
    await tx.insert(organizationSettings).values({
      id: crypto.randomUUID(),
      tenantId: tenant[0].id,
      businessName: input.businessName,
      email: input.email,
      timezone: 'Europe/London',
      currency: 'GBP',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      weekStartsOn: 1,  // Monday
      bookingWindowDays: 90,
      minNoticeHours: 24,
      bufferMinutes: 0,
      allowSameDayBook: false,
      slotDurationMins: 60,
      defaultSlotCapacity: 1,
      availabilityMode: 'SLOT_BASED',
      capacityMode: 'STAFF_LEVEL',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Enable default modules
    // IMPORTANT: must query modules table by slug to get UUIDs — no moduleKey text column on tenantModules
    const defaultSlugs = ['notification', 'calendar-sync', 'forms', 'review']
    const moduleRows = await tx.select({ id: modules.id, slug: modules.slug })
      .from(modules)
      .where(inArray(modules.slug, defaultSlugs))

    for (const mod of moduleRows) {
      await tx.insert(tenantModules).values({
        id: crypto.randomUUID(),
        tenantId: tenant[0].id,
        moduleId: mod.id,
        isEnabled: true,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return tenant[0]
  })
}
```

---

## 10. RBAC & Permission Matrix

### 10.1 Permission String Catalog (Phase 5)

All new permissions for Phase 5 routes:

| Resource | Actions | Required By |
|---|---|---|
| `staff` | read, write, delete | Team module |
| `customers` | read, write, delete | Customer module |
| `forms` | read, write, delete | Forms module |
| `reviews` | read, write, delete | Review module |
| `workflows` | read, write, delete | Workflow module |
| `tenant` | read, write | Tenant module |

### 10.2 Default Role Permissions

Recommended system role defaults (stored in `rolePermissions`):

| Role | Permissions |
|---|---|
| OWNER | `*:*` (all) |
| ADMIN | `*:*` (all) |
| MANAGER | `staff:read`, `staff:write`, `customers:*`, `forms:*`, `reviews:*`, `workflows:read` |
| MEMBER | `customers:read`, `forms:read`, `reviews:read` |

### 10.3 permissionProcedure Usage

```typescript
// All write operations require explicit RBAC
permissionProcedure('staff:write')     // Team mutations
permissionProcedure('customers:write') // Customer mutations
permissionProcedure('forms:write')     // Form template mutations
permissionProcedure('reviews:write')   // Review response mutations
permissionProcedure('workflows:write') // Workflow create/update
permissionProcedure('tenant:write')    // Settings mutations
platformAdminProcedure                 // Platform-level operations
```

---

## 11. Inngest Event Catalog — Phase 5 Additions

### Add to `src/shared/inngest.ts`

```typescript
// Workflow events
"workflow/execute": {
  data: {
    workflowId: string
    tenantId: string
    triggerEvent: string
    triggerData: Record<string, unknown>
  }
}

// Workflow completion (for sync EXECUTE_WORKFLOW node)
"workflow/completed": {
  data: {
    workflowId: string
    executionId: string
    correlationId?: string        // matches __correlationId in triggerData
    tenantId: string
    output?: Record<string, unknown>
    success: boolean
  }
}

// Forms events
"forms/submitted": {
  data: {
    formId: string
    bookingId: string | null
    tenantId: string
    customerId: string | null
  }
}

// Review events (existing but verify present)
"review/submitted": {
  data: {
    reviewId: string
    bookingId: string
    tenantId: string
    customerId: string
    rating: number
  }
}
```

### Register in `/api/inngest/route.ts`

```typescript
import { workflowFunctions } from '@/modules/workflow'
import { reviewFunctions } from '@/modules/review'
import { teamFunctions } from '@/modules/team'

serve({
  client: inngest,
  functions: [
    ...bookingFunctions,
    ...notificationFunctions,
    ...calendarSyncFunctions,
    ...workflowFunctions,    // NEW: Phase 5
    ...reviewFunctions,      // NEW: Phase 5
    ...teamFunctions,        // NEW: Phase 5 (team invite)
  ],
})
```

---

## 12. Root Router Integration

### `src/server/root.ts` — Final State After Phase 5

```typescript
export const appRouter = router({
  auth:             authRouter,
  booking:          bookingRouter,
  approval:         approvalRouter,
  completion:       completionRouter,
  portal:           portalRouter,
  slotAvailability: slotAvailabilityRouter,
  scheduling:       schedulingRouter,
  notification:     notificationRouter,
  calendarSync:     calendarSyncRouter,
  // Phase 5:
  team:             teamRouter,
  customer:         customerRouter,
  forms:            formsRouter,
  review:           reviewRouter,
  workflow:         workflowRouter,
  tenant:           tenantRouter,
  platform:         platformRouter,
})
```

---

## 13. Implementation Waves

### Wave 1 — Types & Schemas (4 parallel agents)

**Agent 1A:** Workflow types + schemas
- `workflow.types.ts` — WorkflowNode, WorkflowEdge, WorkflowExecutionContext, WorkflowConditionGroup, all NodeConfig interfaces, NodeExecutionResult
- `workflow.schemas.ts` — createWorkflow (linear + graph modes), updateWorkflow, node/edge Zod schemas
- `src/shared/inngest.ts` — add `workflow/execute`, `workflow/completed`, and `forms/submitted` events

**Agent 1B:** Team types + schemas
- `team.types.ts` — StaffMember, AvailabilityEntry, CapacityEntry, TeamSchedule
- `team.schemas.ts` — all discriminated union schemas including RECURRING/SPECIFIC/BLOCKED entries

**Agent 1C:** Customer + Forms types + schemas
- `customer.types.ts` / `customer.schemas.ts` — including mergeCustomers, addNote
- `forms.types.ts` / `forms.schemas.ts` — FormField interface, field validation rules

**Agent 1D:** Review + Tenant + Platform types + schemas
- `review.types.ts` / `review.schemas.ts` — including automation settings update
- `tenant.types.ts` / `tenant.schemas.ts` — full 27-column updateOrganizationSettings
- `platform.types.ts` / `platform.schemas.ts`

### Wave 2 — Repositories (4 parallel agents)

**Agent 2A:** `workflow.repository.ts`
- findById, findByTrigger(tenantId, triggerEvent), listByTenant, create, update, softDelete
- findActionsByWorkflowId (ordered by `order` column) — for linear mode
- recordExecution, findExecution (idempotency check), listExecutions

**Agent 2B:** `team.repository.ts`
- findById, listByTenant (with filters: status, search)
- getAvailability (3-type query as spec'd in section 4.1)
- setAvailabilityEntries (delete + re-insert pattern)
- getCapacity, setCapacity
- getAssignedBookings (date range)

**Agent 2C:** `customer.repository.ts` + `forms.repository.ts`
- Customer: findById, list (search, tags filter), create, update, softDelete, merge cascade (7 tables in tx)
- Forms: findTemplateById, listTemplates, createTemplate, updateTemplate
- Forms: findByToken (completedForms.sessionKey), markCompleted, listResponses

**Agent 2D:** `review.repository.ts` + `tenant.repository.ts` + `platform.repository.ts`
- Review: createRequest, updateRequestStatus, findByToken, listReviews, getAutomationSettings, updateAutomation
- Tenant: getSettings, updateSettings (upsert), listModules, toggleModule, listVenues
- Platform: listTenants, getTenant, createTenant, updateTenant, changePlan, getAuditLog

### Wave 3 — Engine & Services (4 parallel agents)

**Agent 3A:** Workflow engine + service
- `engine/conditions.ts` — evaluateConditionGroup, evaluateCondition (AND/OR/nested)
- `engine/expressions.ts` — evaluateExpression
- `engine/context.ts` — resolveContext, resolveField, substituteVariables, enrichTriggerData
- `engine/actions.ts` — executeAction (all 7 action types)
- `engine/transforms.ts` — applyTransform
- `engine/loop.ts` — pushLoopFrame, popLoopFrame
- `engine/parallel.ts` — executeParallelBranches
- `engine/validate.ts` — validateWorkflowGraph, hasCycle
- `engine/linear.engine.ts` — runLinearEngine
- `engine/graph.engine.ts` — GraphEngine class (all node types)
- `workflow.service.ts` — createWorkflow, updateWorkflow, deleteWorkflow, listWorkflows, getExecutionHistory, validateGraph

**Agent 3B:** `team.service.ts`
- getStaffMember, listStaff, createStaff, updateStaff, deactivate
- getAvailability (calls repo + formats for UI)
- setAvailability (with replaceAll support)
- getCapacity, setCapacity, getSchedule

**Agent 3C:** `customer.service.ts` + `forms.service.ts`
- Customer: full CRUD + mergeCustomers (with audit log) + anonymiseCustomer + addNote
- Forms: CRUD templates + sendForm (creates completedForms instance + emails link) + submitFormResponse (validates + saves) + listResponses

**Agent 3D:** `review.service.ts` + `tenant.service.ts` + `platform.service.ts`
- Review: requestReview (with automation check + pre-screening) + submitReview (token verify) + resolveIssue
- Tenant: getSettings + updateSettings + isModuleEnabled + toggleModule + listVenues + CRUD venues
- Platform: CRUD tenants + provisionTenant + changePlan + getAuditLog + feature flags

### Wave 4 — Routers & Inngest Events (4 parallel agents)

**Agent 4A:** `workflow.router.ts` + `workflow.events.ts` + `workflow/index.ts`
- Router: list, getById, create, update, delete, getExecutions, validateGraph
- Events: 6 trigger dispatchers + executeWorkflow executor (routes linear vs graph via isVisual)

**Agent 4B:** `team.router.ts` + `team.events.ts` + `team/index.ts`
- Router: all 11 procedures
- Events: sendTeamInvite stub

**Agent 4C:** `customer.router.ts` + `customer/index.ts` + `forms.router.ts` + `forms.events.ts` + `forms/index.ts`
- Customer router: all 11 procedures
- Forms router: all 8 procedures + public endpoints
- Forms events: sendFormLink (email with public token)

**Agent 4D:** `review.router.ts` + `review.events.ts` + `review/index.ts` + `tenant.router.ts` + `tenant/index.ts` + `platform.router.ts` + `platform/index.ts`

### Wave 5 — Wiring & Tests (2 parallel agents)

**Agent 5A:** Integration wiring
- Update `src/server/root.ts` — add all 7 new routers
- Update `src/app/api/inngest/route.ts` — register new function arrays
- Update `src/shared/inngest.ts` — add workflow/execute, workflow/completed, forms/submitted events
- Update `src/env.ts` — any new env vars
- Update `.env.example`

**Agent 5B:** Tests
- `workflow/__tests__/linear.engine.test.ts` — condition eval, variable substitution, loop detection, all 7 action types (unchanged from original design)
- `workflow/__tests__/graph.engine.test.ts` — IF true/false routing, SWITCH cases + default, MERGE wait_all/wait_any/append, LOOP sequential+parallel, WAIT_FOR_EVENT received+timeout, WAIT_UNTIL, SET_VARIABLE, FILTER, TRANSFORM, EXECUTE_WORKFLOW fire-and-forget+sync
- `workflow/__tests__/conditions.test.ts` — AND/OR/nested groups, all 7 operators, dot-path resolution
- `workflow/__tests__/expressions.test.ts` — arithmetic, string concat, boolean literals, missing variable
- `workflow/__tests__/context.test.ts` — variable resolution priority order, loop frame stack, substituteVariables
- `workflow/__tests__/validate.test.ts` — cycle detection, orphan nodes, missing handles (IF, LOOP), SWITCH without cases
- `customer/__tests__/customer.service.test.ts` — merge cascade (mocked tx), anonymise
- `forms/__tests__/forms.service.test.ts` — field validation (all types), token verification, expiry
- `review/__tests__/review.service.test.ts` — pre-screening logic, state machine transitions
- `team/__tests__/team.availability.test.ts` — all 3 type combinations, BLOCKED override, capacity resolution

### Wave 6 — Verification

**Single agent:**
- `npx tsc --noEmit` → 0 errors
- `npm run build` → succeeds
- `npm test` → all tests pass (target: 160+ total)

---

## 14. Testing Strategy

### Critical Test Scenarios

#### Linear Engine Tests (unchanged)
```typescript
describe('evaluateConditions', () => {
  it('returns true for empty conditions array')
  it('evaluates equals operator')
  it('evaluates not_equals operator')
  it('evaluates greater_than with numeric coercion')
  it('evaluates is_set for null vs empty string')
  it('evaluates dot-path fields: "booking.serviceId"')
  it('ALL conditions must pass (AND logic)')
  it('returns false if any condition fails')
})

describe('substituteVariables', () => {
  it('replaces single variable')
  it('replaces multiple variables in one string')
  it('handles dot-path variables: {{customer.email}}')
  it('returns empty string for missing variable')
  it('does not error on null data')
})

describe('executeWorkflow — loop protection', () => {
  it('aborts when __workflowDepth >= 3')
  it('increments __workflowDepth on each trigger')
})
```

#### Graph Engine Tests
```typescript
describe('GraphEngine — IF node', () => {
  it('routes to "true" edge when condition group passes')
  it('routes to "false" edge when condition group fails')
  it('evaluates AND group: all conditions must pass')
  it('evaluates OR group: any condition sufficient')
  it('evaluates nested AND inside OR group')
})

describe('GraphEngine — SWITCH node', () => {
  it('routes to matching case edge by value')
  it('routes to "default" edge when no case matches')
  it('evaluates contains operator for case matching')
})

describe('GraphEngine — MERGE node', () => {
  it('wait_all: continues after all branches complete, merges variables')
  it('wait_any: continues after first branch completes')
  it('append: collects all branch outputs into mergedOutputs array')
})

describe('GraphEngine — LOOP node', () => {
  it('sequential mode: iterates all items in order')
  it('parallel mode: executes all items concurrently')
  it('respects maxIterations guard')
  it('follows "done" edge after all iterations')
  it('exposes itemVariableName in loop body context')
  it('exposes indexVariableName if configured')
  it('skips gracefully if sourceField is not an array')
})

describe('GraphEngine — WAIT_FOR_EVENT node', () => {
  it('routes to "received" when event arrives')
  it('routes to "timeout" when event does not arrive')
  it('stores event data at outputField when received')
  it('stops execution when timeoutBehavior=stop')
  it('throws when timeoutBehavior=error on timeout')
})

describe('GraphEngine — SET_VARIABLE node', () => {
  it('stores literal value in context.variables')
  it('resolves field from context and stores in variables')
  it('evaluates arithmetic expression and stores result')
  it('makes variables available to downstream nodes via {{variables.key}}')
})

describe('GraphEngine — FILTER node', () => {
  it('filters array using condition group')
  it('stores filtered result at outputField')
  it('returns empty array for non-array sourceField')
})

describe('GraphEngine — EXECUTE_WORKFLOW node', () => {
  it('sends workflow/execute event in fire_and_forget mode')
  it('sends and waits for workflow/completed in sync mode')
  it('stores sub-workflow output at outputField in sync mode')
  it('skips execution when __workflowDepth >= 3')
})

describe('GraphEngine — error handling', () => {
  it('propagates error when errorHandling=stop (default)')
  it('routes to "error" edge when errorHandling=branch')
  it('continues to "output" edge when errorHandling=continue')
})

describe('GraphEngine — cycle detection', () => {
  it('throws when cycle detected in visited nodes')
  it('does not throw for LOOP back-edges')
})
```

#### Graph Validation Tests
```typescript
describe('validateWorkflowGraph', () => {
  it('passes for valid linear graph')
  it('passes for valid branching graph with IF + MERGE')
  it('returns error for zero TRIGGER nodes')
  it('returns error for multiple TRIGGER nodes')
  it('returns error for edge referencing unknown node')
  it('returns error for orphan non-TRIGGER node')
  it('returns error for structural cycle')
  it('returns error for IF node missing "true" edge')
  it('returns error for IF node missing "false" edge')
  it('returns error for LOOP node missing "item" edge')
  it('returns error for SWITCH node with no cases')
})
```

#### Customer Merge Tests
```typescript
describe('mergeCustomers', () => {
  it('re-parents bookings to target customer')
  it('re-parents all 7 table types in single transaction')
  it('soft-deletes source customer (sets deletedAt)')
  it('sets mergedIntoId on source')
  it('writes audit log entry')
  it('throws NotFoundError if source not in tenant')
  it('throws NotFoundError if target not in tenant')
})
```

#### Form Validation Tests
```typescript
describe('validateFormResponses', () => {
  it('returns error for missing required field')
  it('passes for optional field not provided')
  it('validates EMAIL type format')
  it('validates SELECT type against options list')
  it('validates TEXT minLength constraint')
  it('validates TEXT maxLength constraint')
  it('accepts valid responses')
})
```

#### Team Availability Tests
```typescript
describe('getStaffAvailableSlots', () => {
  it('returns empty for BLOCKED date')
  it('returns SPECIFIC slots when SPECIFIC + RECURRING both exist (SPECIFIC wins)')
  it('returns RECURRING slots when only RECURRING matches')
  it('returns empty when no entry matches')
  it('handles multi-day BLOCKED ranges correctly')
})
```

---

## 15. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Workflow loop via UPDATE_BOOKING_STATUS action | HIGH | `__workflowDepth` guard, max depth = 3 |
| Structural cycle in graph workflow | HIGH | validateWorkflowGraph at save time + visitedNodes Set at runtime |
| MERGE deadlock (wait_all branch never completes) | HIGH | MergeNodeConfig.timeout with configurable behavior |
| EXECUTE_WORKFLOW infinite recursion | HIGH | `__workflowDepth` applied to sub-workflows; abort at depth 3 |
| LOOP node iterating huge array | MEDIUM | maxIterations guard (default 100); log warning when truncated |
| Customer merge partial failure | HIGH | Full db.transaction, 7 tables in one tx, soft-delete only |
| Form token brute-force | MEDIUM | UUID v4 tokens (2^122 space); rate limit publicProcedure (60/min by IP) |
| Review pre-screening over-suppression | MEDIUM | Log every skip with reason; admin can view suppression stats |
| Workflow variable substitution returns empty | MEDIUM | Log warning when `{{field}}` resolves to empty string |
| Tenant settings mode switch (SLOT_BASED → HYBRID) | MEDIUM | Warn in UI; do not auto-migrate existing slots |
| availabilityMode/capacityMode switch breaks booking engine | HIGH | These are currently informational only; booking engine must read and enforce them |
| Module disable with active workflow executions | MEDIUM | Only gate new triggers; in-flight Inngest steps complete naturally |
| Availability query timezone edge cases | HIGH | All queries use IANA timezone; test DST boundaries |
| GDPR anonymise irreversibility | HIGH | Require confirmation input ("type CONFIRM") in mutation |
| WAIT_FOR_EVENT node waiting indefinitely | MEDIUM | timeout field is required; default suggestion "P7D" |
| Graph engine Inngest step ID collisions | MEDIUM | All step IDs include nodeId; must be unique within workflow execution |
| workflow/completed event not fired on linear mode | LOW | executeWorkflow emits workflow/completed in all modes for EXECUTE_WORKFLOW sync callers |
| Workflow execution table grows unbounded | LOW | Add scheduled cleanup for executions > 90 days old (Phase 6) |
| Platform admin bootstrap (first admin) | MEDIUM | Env var `PLATFORM_ADMIN_EMAIL` auto-promotes on first login (already implemented in trpc.ts) |

---

## 16. File Checklist

### New Files to Create (52 files)

```
src/modules/workflow/
  engine/
    linear.engine.ts
    graph.engine.ts
    conditions.ts
    expressions.ts
    context.ts
    actions.ts
    parallel.ts
    loop.ts
    transforms.ts
    validate.ts
  workflow.types.ts
  workflow.schemas.ts
  workflow.repository.ts
  workflow.service.ts
  workflow.router.ts
  workflow.events.ts
  index.ts
  __tests__/
    linear.engine.test.ts
    graph.engine.test.ts
    conditions.test.ts
    expressions.test.ts
    context.test.ts
    validate.test.ts
    integration.test.ts

src/modules/team/
  team.types.ts
  team.schemas.ts
  team.repository.ts
  team.service.ts
  team.router.ts
  team.events.ts
  index.ts
  __tests__/team.availability.test.ts

src/modules/customer/
  customer.types.ts
  customer.schemas.ts
  customer.repository.ts
  customer.service.ts
  customer.router.ts
  index.ts
  __tests__/customer.service.test.ts

src/modules/forms/
  forms.types.ts
  forms.schemas.ts
  forms.repository.ts
  forms.service.ts
  forms.router.ts
  forms.events.ts
  index.ts
  __tests__/forms.service.test.ts

src/modules/review/
  review.types.ts
  review.schemas.ts
  review.repository.ts
  review.service.ts
  review.router.ts
  review.events.ts
  index.ts
  __tests__/review.service.test.ts

src/modules/tenant/
  tenant.types.ts
  tenant.schemas.ts
  tenant.repository.ts
  tenant.service.ts
  tenant.router.ts
  index.ts

src/modules/platform/
  platform.types.ts
  platform.schemas.ts
  platform.repository.ts
  platform.service.ts
  platform.router.ts
  index.ts
```

### Files to Update

```
src/server/root.ts              — add 7 new routers
src/app/api/inngest/route.ts    — register new function arrays
src/shared/inngest.ts           — add workflow/execute, workflow/completed, forms/submitted events
.env.example                    — no new required vars for Phase 5
```

### Files to Update in Existing Modules (post-Phase-5 tenant settings integration)

After `tenantService.getTenantSettings()` is available, existing Phase 1–4 services should call it:

```
src/modules/booking/booking.service.ts      — validate bookingWindowDays, minNoticeHours, businessHours
src/modules/notification/notification.service.ts — use senderEmail, senderName, emailFooter, smsSignature
src/modules/calendar-sync/calendar-sync.service.ts — use timezone for calendar event times
```

These are secondary integration updates — they do not block Phase 5 module creation.

### Files NOT to Touch

All Phase 1–4 files remain as-is until integration pass. Do not modify:
- `src/modules/booking/*`
- `src/modules/scheduling/*`
- `src/modules/notification/*`
- `src/modules/calendar-sync/*`
- `src/shared/db/schemas/*` (schema is complete)

---

## Appendix: Full Node Type Summary

### Flow Control Nodes

| Node Type | Inputs | Output Handles | Key Config |
|---|---|---|---|
| `TRIGGER` | (entry point) | `output` | triggerEvent |
| `IF` | `input` | `true`, `false` | conditions: WorkflowConditionGroup |
| `SWITCH` | `input` | `case_N`, `default` | field, cases[] |
| `MERGE` | multiple | `output` | mode: wait_all\|wait_any\|append, timeout? |
| `LOOP` | `input` | `item` (body), `done` | sourceField, itemVariableName, mode: sequential\|parallel |
| `LOOP_END` | `input` | `output` | (none) |
| `WAIT_FOR_EVENT` | `input` | `received`, `timeout` | event, matchField, matchSourceField, timeout, timeoutBehavior |
| `WAIT_UNTIL` | `input` | `output` | mode: duration\|datetime\|field |
| `STOP` | `input` | (terminal) | (none) |
| `ERROR` | `input` | (terminal) | (none) |

### Action Nodes

| Node Type | Phase 5 | Output Handles | Key Config |
|---|---|---|---|
| `SEND_EMAIL` | ✓ Full | `output`, `error` | templateId?, recipientField, subject, bodyHtml, delay? |
| `SEND_SMS` | ✓ Full | `output`, `error` | templateId?, recipientField, body, delay? |
| `WEBHOOK` | ✓ Full | `output`, `error` | url (HTTPS), method, headers?, bodyTemplate?, timeout? |
| `CREATE_CALENDAR_EVENT` | ✓ Full | `output`, `error` | userIdField, titleTemplate, addCustomerAsAttendee? |
| `UPDATE_BOOKING_STATUS` | ✓ Full | `output`, `error` | status, reason? |
| `CREATE_TASK` | ✓ Full | `output`, `error` | title, assigneeField, priority, dueDateOffset? |
| `SEND_NOTIFICATION` | ✓ Stub | `output` | title, body |

### Data Nodes

| Node Type | Phase 5 | Output Handles | Key Config |
|---|---|---|---|
| `SET_VARIABLE` | ✓ Full | `output` | assignments[]: key, valueType, literal\|field\|expression |
| `FILTER` | ✓ Full | `output` | sourceField, outputField, conditions: WorkflowConditionGroup |
| `TRANSFORM` | ✓ Full | `output` | outputField, mappings[]: targetKey, sourceField, transform? |

### Sub-workflow Node

| Node Type | Phase 5 | Output Handles | Key Config |
|---|---|---|---|
| `EXECUTE_WORKFLOW` | ✓ Full | `output`, `error` | workflowId, mode: sync\|fire_and_forget, inputMappings[], outputField? |

---

*This document is the authoritative design reference for Phase 5 implementation.*
*All implementation agents must follow the patterns in Section 2 and the specific specs in each module section.*
