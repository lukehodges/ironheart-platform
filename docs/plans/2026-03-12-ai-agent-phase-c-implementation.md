# AI Agent Phase C Implementation Plan

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Add AI-powered workflow intelligence: `AI_DECISION` and `AI_GENERATE` node types for the graph workflow engine, natural-language-to-workflow generation, AI error recovery for failing workflows, and proactive workflow suggestions based on audit log patterns.

**Timeline:** 8 working days

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md` (Section 4: Workflow Intelligence, Section 10: Phase C)
**Phase B Plan (prerequisite — must be complete):** `docs/plans/2026-03-12-ai-agent-phase-b-implementation.md`

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **Two new node types: `AI_DECISION` and `AI_GENERATE`.** These are added to the existing `WorkflowNodeType` union in `workflow.types.ts`. They run inside the graph engine alongside existing nodes.
2. **AI_DECISION uses Haiku** for fast, cheap decisions. It evaluates a prompt against the workflow execution context and returns a decision that routes the graph via handles (like IF, but with natural language conditions).
3. **AI_GENERATE uses Sonnet** for content generation. It takes a prompt template, interpolates context, calls Claude, and stores the output in `context.variables`.
4. **`ai_recover` error handling strategy.** When a node fails and has `errorHandling: 'ai_recover'`, the engine sends the error + context to Haiku to suggest a recovery action (retry, skip, substitute value).
5. **Natural-language workflow generation.** A new AI service method takes a plain English description and generates a valid workflow graph (nodes + edges). The graph is validated via `validateWorkflowGraph()` before presenting to the user. Users review and edit before saving.
6. **Proactive suggestions are Inngest scheduled tasks.** Weekly scan of audit logs / workflow execution history to detect patterns and suggest automations. Results stored in `ai_workflow_suggestions` table.
7. **Stay on Inngest.** All AI workflow nodes execute within the existing Inngest-based workflow engine. No separate runtime.

---

## Progress Tracking

```
[ ] Task 1: Database schema — ai_workflow_suggestions table
[ ] Task 2: Workflow types — add AI node types + configs
[ ] Task 3: AI node executor — AI_DECISION + AI_GENERATE
[ ] Task 4: Wire AI nodes into graph engine
[ ] Task 5: AI error recovery strategy
[ ] Task 6: Natural-language workflow generator
[ ] Task 7: Workflow suggestions repository + Inngest job
[ ] Task 8: AI workflow Zod schemas
[ ] Task 9: Router procedures for workflow intelligence
[ ] Task 10: Tests
[ ] Task 11: Verification — tsc + build + tests
```

---

## Codebase Patterns Reference

All patterns from Phase A+ and B apply. Additionally:

### Workflow engine patterns (MUST follow):
```typescript
// Node types are in src/modules/workflow/workflow.types.ts
// WorkflowNodeType union — add new types here
// NodeConfig union — add new config interfaces here

// Graph engine: src/modules/workflow/engine/graph.engine.ts
// Executes nodes by type, follows edges by sourceHandle
// Each node type has a handler in the executeNode switch/dispatch

// Actions: src/modules/workflow/engine/actions.ts
// Dispatches action-type nodes (SEND_EMAIL, etc.)

// Context: src/modules/workflow/engine/context.ts
// resolveContextField() for dot-path resolution in templates

// Validation: src/modules/workflow/engine/validate.ts
// validateWorkflowGraph() checks cycles, orphans, missing handles
```

### AI node execution pattern:
```typescript
// AI nodes call Claude within the workflow engine.
// They receive the WorkflowExecutionContext and return output to store in context.nodes.{id}.output
// They use step.run() for Inngest durability wrapping
```

---

## Task 1: Database Schema — ai_workflow_suggestions

**Files:**
- Modify: `src/shared/db/schemas/ai.schema.ts`

```typescript
// Add below existing tables in ai.schema.ts

// ---------------------------------------------------------------------------
// AI Workflow Suggestions — proactive automation suggestions
// ---------------------------------------------------------------------------

export const aiWorkflowSuggestions = pgTable("ai_workflow_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  /** The generated workflow graph (nodes + edges JSONB) */
  suggestedNodes: jsonb("suggested_nodes"),
  suggestedEdges: jsonb("suggested_edges"),
  /** What pattern was detected that led to this suggestion */
  detectedPattern: text("detected_pattern").notNull(),
  /** How confident is the AI in this suggestion (0.0-1.0) */
  confidence: integer("confidence").notNull().default(50), // stored as 0-100
  status: text("status").notNull().default("pending"),
  // 'pending' | 'accepted' | 'dismissed' | 'expired'
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_workflow_suggestions_tenant_status").on(t.tenantId, t.status),
])
```

**Commit:** `feat(ai): add ai_workflow_suggestions database table`

---

## Task 2: Workflow Types — Add AI Node Types + Configs

**Files:**
- Modify: `src/modules/workflow/workflow.types.ts`

**Step 1:** Add `AI_DECISION` and `AI_GENERATE` to the `WorkflowNodeType` union:

```typescript
export type WorkflowNodeType =
  // Flow control
  | 'TRIGGER'
  | 'IF'
  | 'SWITCH'
  | 'MERGE'
  | 'LOOP'
  | 'LOOP_END'
  | 'WAIT_FOR_EVENT'
  | 'WAIT_UNTIL'
  | 'STOP'
  | 'ERROR'
  // Action nodes (original 7)
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'WEBHOOK'
  | 'CREATE_CALENDAR_EVENT'
  | 'UPDATE_BOOKING_STATUS'
  | 'CREATE_TASK'
  | 'SEND_NOTIFICATION'
  // Data nodes
  | 'SET_VARIABLE'
  | 'FILTER'
  | 'TRANSFORM'
  // Sub-workflow
  | 'EXECUTE_WORKFLOW'
  // AI nodes (Phase C)
  | 'AI_DECISION'
  | 'AI_GENERATE'
```

**Step 2:** Add config interfaces:

```typescript
// ---------------------------------------------------------------------------
// AI Node Configs (Phase C)
// ---------------------------------------------------------------------------

export interface AIDecisionNodeConfig {
  /** The prompt template for the AI decision. Use {{variable}} for context interpolation. */
  prompt: string
  /** The possible outcomes — each maps to an output handle (like SWITCH cases) */
  outcomes: Array<{
    handle: string
    label: string
    description: string
  }>
  /** Default handle if AI can't decide */
  defaultHandle: string
  /** Model to use — defaults to Haiku for speed/cost */
  model?: string
  /** Max tokens for the AI response */
  maxTokens?: number
}

export interface AIGenerateNodeConfig {
  /** The prompt template. Use {{variable}} for context interpolation. */
  prompt: string
  /** Where to store the generated output in context.variables */
  outputField: string
  /** Optional: JSON schema the output should conform to */
  outputSchema?: Record<string, unknown>
  /** Model to use — defaults to Sonnet */
  model?: string
  /** Max tokens */
  maxTokens?: number
}
```

**Step 3:** Add to the `NodeConfig` union:

```typescript
export type NodeConfig =
  | TriggerNodeConfig
  | IfNodeConfig
  // ... existing configs ...
  | AIDecisionNodeConfig
  | AIGenerateNodeConfig
  | Record<string, unknown>
```

**Step 4:** Add `'ai_recover'` to the error handling options:

Find where `errorHandling` is typed (on `WorkflowNode`) and add `'ai_recover'`:
```typescript
errorHandling?: 'stop' | 'continue' | 'branch' | 'ai_recover'
```

**Commit:** `feat(workflow): add AI_DECISION and AI_GENERATE node types`

---

## Task 3: AI Node Executor

**Files:**
- Create: `src/modules/workflow/engine/ai-nodes.ts`

```typescript
// src/modules/workflow/engine/ai-nodes.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { resolveContextField } from "./context"
import type { WorkflowExecutionContext, AIDecisionNodeConfig, AIGenerateNodeConfig, WorkflowNode } from "../workflow.types"

const log = logger.child({ module: "workflow.engine.ai-nodes" })

// Lazy-init — never construct at module load time
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001"
const SONNET_MODEL = "claude-sonnet-4-20250514"

/**
 * Interpolate {{variable}} placeholders in a prompt template with context values.
 */
function interpolatePrompt(template: string, context: WorkflowExecutionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = resolveContextField(context, path.trim())
    if (value === undefined || value === null) return `[unknown: ${path.trim()}]`
    return typeof value === "object" ? JSON.stringify(value) : String(value)
  })
}

/**
 * Execute AI_DECISION node.
 * Sends prompt to Haiku, parses which outcome handle to follow.
 * Returns: { decision: string, reasoning: string, handle: string }
 */
export async function executeAIDecision(
  node: WorkflowNode,
  context: WorkflowExecutionContext
): Promise<{ decision: string; reasoning: string; handle: string }> {
  const config = node.config as AIDecisionNodeConfig
  const prompt = interpolatePrompt(config.prompt, context)
  const model = config.model ?? HAIKU_MODEL

  const outcomeList = config.outcomes
    .map((o) => `- "${o.handle}": ${o.description}`)
    .join("\n")

  const systemPrompt = `You are a decision engine inside a workflow automation system. You must choose exactly ONE outcome.

Available outcomes:
${outcomeList}

RULES:
- Respond with ONLY a JSON object: { "handle": "<chosen handle>", "reasoning": "<1 sentence>" }
- The handle MUST be one of the available outcomes listed above.
- If unsure, use the default: "${config.defaultHandle}"`

  const response = await getClient().messages.create({
    model,
    max_tokens: config.maxTokens ?? 256,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  // Parse JSON response
  try {
    const parsed = JSON.parse(text)
    const handle = config.outcomes.find((o) => o.handle === parsed.handle)
      ? parsed.handle
      : config.defaultHandle
    log.info({ nodeId: node.id, handle, model }, "AI_DECISION resolved")
    return { decision: handle, reasoning: parsed.reasoning ?? "", handle }
  } catch {
    log.warn({ nodeId: node.id, rawResponse: text }, "AI_DECISION failed to parse — using default")
    return { decision: config.defaultHandle, reasoning: "Failed to parse AI response", handle: config.defaultHandle }
  }
}

/**
 * Execute AI_GENERATE node.
 * Sends prompt to Sonnet, stores output in context.variables.
 * Returns: { content: string, model: string, tokens: number }
 */
export async function executeAIGenerate(
  node: WorkflowNode,
  context: WorkflowExecutionContext
): Promise<{ content: string; model: string; tokens: number }> {
  const config = node.config as AIGenerateNodeConfig
  const prompt = interpolatePrompt(config.prompt, context)
  const model = config.model ?? SONNET_MODEL

  let systemPrompt = "You are a content generation engine inside a workflow automation system. Generate the requested content based on the provided context."

  if (config.outputSchema) {
    systemPrompt += `\n\nYour response must conform to this JSON schema:\n${JSON.stringify(config.outputSchema, null, 2)}\n\nRespond with ONLY valid JSON.`
  }

  const response = await getClient().messages.create({
    model,
    max_tokens: config.maxTokens ?? 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  })

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  log.info({ nodeId: node.id, model, tokens: response.usage.output_tokens }, "AI_GENERATE completed")
  return { content, model, tokens: response.usage.output_tokens }
}

/**
 * AI error recovery — called when a node fails with errorHandling: 'ai_recover'.
 * Uses Haiku to suggest a recovery action.
 */
export async function attemptAIRecovery(
  failedNode: WorkflowNode,
  error: string,
  context: WorkflowExecutionContext
): Promise<{ action: "retry" | "skip" | "substitute"; value?: unknown; reasoning: string }> {
  const prompt = `A workflow node failed. Suggest a recovery action.

Node: ${failedNode.type} (${failedNode.label ?? failedNode.id})
Error: ${error}
Context variables: ${JSON.stringify(context.variables, null, 2).slice(0, 1000)}

Choose ONE action:
- "retry": Try the node again (useful for transient errors like timeouts)
- "skip": Skip this node and continue the workflow (use when the node is non-critical)
- "substitute": Provide a substitute value and continue

Respond with JSON: { "action": "retry|skip|substitute", "value": <if substitute>, "reasoning": "<1 sentence>" }`

  const response = await getClient().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  try {
    const parsed = JSON.parse(text)
    log.info({ nodeId: failedNode.id, action: parsed.action }, "AI recovery suggested")
    return {
      action: parsed.action ?? "skip",
      value: parsed.value,
      reasoning: parsed.reasoning ?? "",
    }
  } catch {
    log.warn({ nodeId: failedNode.id }, "AI recovery parse failed — defaulting to skip")
    return { action: "skip", reasoning: "Failed to parse AI recovery response" }
  }
}
```

**Commit:** `feat(workflow): add AI_DECISION, AI_GENERATE executors and AI error recovery`

---

## Task 4: Wire AI Nodes Into Graph Engine

**Files:**
- Modify: `src/modules/workflow/engine/graph.engine.ts`

Read the current graph engine first. Find the node type dispatch logic (likely a switch statement or if/else chain in the main execution function). Add handlers for `AI_DECISION` and `AI_GENERATE`:

1. **AI_DECISION**: Call `executeAIDecision(node, context)`. The returned `handle` determines which outgoing edge to follow (same pattern as IF/SWITCH).
2. **AI_GENERATE**: Call `executeAIGenerate(node, context)`. Store the `content` in `context.variables[config.outputField]`. Follow the default outgoing edge.
3. **ai_recover error handling**: In the error handling section, when `node.errorHandling === 'ai_recover'`, call `attemptAIRecovery()`. Based on the response:
   - `retry`: Re-execute the node (max 1 retry)
   - `skip`: Mark node as skipped, continue to next
   - `substitute`: Store substitute value in context, continue

Import from `./ai-nodes`:
```typescript
import { executeAIDecision, executeAIGenerate, attemptAIRecovery } from "./ai-nodes"
```

**Commit:** `feat(workflow): wire AI_DECISION and AI_GENERATE into graph engine`

---

## Task 5: Update Graph Validation for AI Nodes

**Files:**
- Modify: `src/modules/workflow/engine/validate.ts`

Add validation rules for the new node types:

1. **AI_DECISION**: Must have at least 2 outcomes in config. Each outcome handle must have a matching outgoing edge. Must have a valid `defaultHandle`.
2. **AI_GENERATE**: Must have a non-empty `prompt`. Must have a non-empty `outputField`.
3. Both nodes should have a warning (not error) if no ANTHROPIC_API_KEY is configured.

Read the current validation code before modifying. Follow the existing validation pattern.

**Commit:** `feat(workflow): add validation rules for AI_DECISION and AI_GENERATE nodes`

---

## Task 6: Natural-Language Workflow Generator

**Files:**
- Create: `src/modules/ai/ai.workflow-generator.ts`

```typescript
// src/modules/ai/ai.workflow-generator.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { validateWorkflowGraph } from "@/modules/workflow/engine/validate"
import type { WorkflowNode, WorkflowEdge } from "@/modules/workflow/workflow.types"

const log = logger.child({ module: "ai.workflow-generator" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const SONNET_MODEL = "claude-sonnet-4-20250514"

const GENERATOR_SYSTEM_PROMPT = `You are a workflow generator. Given a natural language description, generate a valid workflow graph.

AVAILABLE NODE TYPES:
- TRIGGER: Starting point. Config: { eventType: string, conditions?: WorkflowConditionGroup }
- IF: Conditional branch. Config: { conditions: WorkflowConditionGroup }. Handles: "true", "false"
- SWITCH: Multi-way branch. Config: { field: string, cases: [{ handle, operator, value }] }. Handles: "case_0", "case_1", ..., "default"
- MERGE: Join parallel branches. Config: { mode: "wait_all" | "wait_any" | "append" }
- LOOP: Iterate over array. Config: { sourceField, itemVariableName, mode: "sequential" | "parallel" }
- LOOP_END: Marks end of loop body
- SEND_EMAIL: Send email. Config: { recipientField?, recipientEmail?, subject?, body? }
- SEND_SMS: Send SMS. Config: { recipientField?, recipientPhone?, body? }
- WEBHOOK: HTTP call. Config: { url, method, bodyTemplate? }
- UPDATE_BOOKING_STATUS: Config: { status: "CONFIRMED"|"CANCELLED"|"COMPLETED"|"NO_SHOW" }
- CREATE_TASK: Config: { title, description?, assigneeField?, priority? }
- SEND_NOTIFICATION: Config: { recipientField?, title?, body? }
- SET_VARIABLE: Config: { assignments: [{ key, valueType, literal?, field?, expression? }] }
- WAIT_FOR_EVENT: Config: { event, matchField, matchSourceField, timeout, timeoutBehavior }
- WAIT_UNTIL: Config: { mode: "duration"|"datetime"|"field", duration?, datetime?, field? }
- AI_DECISION: AI-powered branch. Config: { prompt, outcomes: [{ handle, label, description }], defaultHandle }
- AI_GENERATE: AI content generation. Config: { prompt, outputField, outputSchema? }
- STOP: End workflow

EDGE FORMAT:
{ id, source, target, sourceHandle, label? }
- sourceHandle is "default" for most nodes
- For IF: "true" or "false"
- For SWITCH: "case_0", "case_1", ..., "default"
- For AI_DECISION: matches outcome handles
- For WAIT_FOR_EVENT: "received" or "timeout"

RULES:
1. Every workflow starts with exactly ONE TRIGGER node
2. Every path must end with a STOP node or loop back
3. No orphan nodes — every node must be reachable from TRIGGER
4. Use {{variable}} syntax in templates for context interpolation
5. Position nodes in a readable layout (x: left-to-right, y: top-to-bottom, ~200px spacing)

Respond with ONLY valid JSON:
{
  "nodes": [...],
  "edges": [...],
  "name": "Workflow name",
  "description": "What this workflow does"
}`

/**
 * Generate a workflow graph from a natural language description.
 * Returns the graph for user review — does NOT save it.
 */
export async function generateWorkflowFromDescription(
  description: string,
  tenantContext?: { existingWorkflows?: string[]; availableEvents?: string[] }
): Promise<{
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  name: string
  description: string
  validationErrors: string[]
}> {
  let userPrompt = `Generate a workflow for:\n\n${description}`

  if (tenantContext?.availableEvents?.length) {
    userPrompt += `\n\nAvailable trigger events: ${tenantContext.availableEvents.join(", ")}`
  }
  if (tenantContext?.existingWorkflows?.length) {
    userPrompt += `\n\nExisting workflows (avoid duplicates): ${tenantContext.existingWorkflows.join(", ")}`
  }

  const response = await getClient().messages.create({
    model: SONNET_MODEL,
    max_tokens: 4096,
    system: GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  let parsed: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; name: string; description: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    log.error({ rawResponse: text.slice(0, 500) }, "Failed to parse workflow generation response")
    throw new Error("Failed to generate workflow — AI returned invalid JSON")
  }

  // Validate the generated graph
  const validation = validateWorkflowGraph(parsed.nodes, parsed.edges)
  const validationErrors = validation.errors ?? []

  if (validationErrors.length > 0) {
    log.warn({ errors: validationErrors }, "Generated workflow has validation issues")
  }

  log.info({ name: parsed.name, nodeCount: parsed.nodes.length, edgeCount: parsed.edges.length }, "Workflow generated from description")

  return {
    nodes: parsed.nodes,
    edges: parsed.edges,
    name: parsed.name,
    description: parsed.description,
    validationErrors,
  }
}
```

**Commit:** `feat(ai): add natural-language workflow generator using Claude`

---

## Task 7: Workflow Suggestions Repository + Inngest Job

**Files:**
- Create: `src/modules/ai/ai.suggestions.repository.ts`
- Modify: `src/modules/ai/ai.events.ts`
- Modify: `src/shared/inngest.ts`

### ai.suggestions.repository.ts

```typescript
// src/modules/ai/ai.suggestions.repository.ts

import { db } from "@/shared/db"
import { aiWorkflowSuggestions } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.suggestions.repository" })

export interface WorkflowSuggestionRecord {
  id: string
  tenantId: string
  title: string
  description: string
  suggestedNodes: unknown[] | null
  suggestedEdges: unknown[] | null
  detectedPattern: string
  confidence: number
  status: "pending" | "accepted" | "dismissed" | "expired"
  acceptedAt: Date | null
  dismissedAt: Date | null
  createdAt: Date
}

function mapSuggestion(row: typeof aiWorkflowSuggestions.$inferSelect): WorkflowSuggestionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    suggestedNodes: row.suggestedNodes as unknown[] | null,
    suggestedEdges: row.suggestedEdges as unknown[] | null,
    detectedPattern: row.detectedPattern,
    confidence: row.confidence,
    status: row.status as WorkflowSuggestionRecord["status"],
    acceptedAt: row.acceptedAt,
    dismissedAt: row.dismissedAt,
    createdAt: row.createdAt,
  }
}

export const suggestionsRepository = {
  async create(data: {
    tenantId: string
    title: string
    description: string
    suggestedNodes?: unknown[]
    suggestedEdges?: unknown[]
    detectedPattern: string
    confidence: number
  }): Promise<WorkflowSuggestionRecord> {
    const [row] = await db
      .insert(aiWorkflowSuggestions)
      .values({
        tenantId: data.tenantId,
        title: data.title,
        description: data.description,
        suggestedNodes: data.suggestedNodes ?? null,
        suggestedEdges: data.suggestedEdges ?? null,
        detectedPattern: data.detectedPattern,
        confidence: data.confidence,
      })
      .returning()
    log.info({ suggestionId: row!.id, tenantId: data.tenantId }, "Workflow suggestion created")
    return mapSuggestion(row!)
  },

  async listByTenant(tenantId: string, status?: string, limit = 20): Promise<{ rows: WorkflowSuggestionRecord[]; hasMore: boolean }> {
    const conditions = [eq(aiWorkflowSuggestions.tenantId, tenantId)]
    if (status) conditions.push(eq(aiWorkflowSuggestions.status, status))

    const rows = await db
      .select()
      .from(aiWorkflowSuggestions)
      .where(and(...conditions))
      .orderBy(desc(aiWorkflowSuggestions.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: (hasMore ? rows.slice(0, limit) : rows).map(mapSuggestion),
      hasMore,
    }
  },

  async updateStatus(id: string, status: "accepted" | "dismissed"): Promise<void> {
    const updates: Record<string, unknown> = { status }
    if (status === "accepted") updates.acceptedAt = new Date()
    if (status === "dismissed") updates.dismissedAt = new Date()
    await db.update(aiWorkflowSuggestions).set(updates).where(eq(aiWorkflowSuggestions.id, id))
  },
}
```

### Add Inngest scheduled job to ai.events.ts:

```typescript
// Add to src/modules/ai/ai.events.ts:

import { inngest } from "@/shared/inngest"
import { suggestionsRepository } from "./ai.suggestions.repository"

const weeklyWorkflowSuggestions = inngest.createFunction(
  { id: "ai/weekly-workflow-suggestions", name: "Weekly Workflow Suggestions" },
  { cron: "0 9 * * 1" }, // Every Monday at 9 AM
  async ({ step }) => {
    // This is a placeholder — the actual pattern detection logic
    // would analyze workflow execution history and audit logs.
    // For Phase C, we wire the infrastructure. Advanced detection comes later.
    await step.run("detect-patterns", async () => {
      // TODO: Query workflow_executions for repeated manual patterns
      // TODO: Query audit_log for repetitive actions
      // TODO: Use Claude to analyze patterns and generate suggestions
      return { analyzed: true }
    })
  }
)

export const aiFunctions = [weeklyWorkflowSuggestions]
```

### Add Inngest event (src/shared/inngest.ts):

```typescript
"ai/workflow.suggested": {
  data: { suggestionId: string; tenantId: string; title: string }
}
```

**Commit:** `feat(ai): add workflow suggestions repository and weekly Inngest job`

---

## Task 8: AI Workflow Zod Schemas

**Files:**
- Modify: `src/modules/ai/ai.schemas.ts`

```typescript
// Add to ai.schemas.ts:

export const generateWorkflowSchema = z.object({
  description: z.string().min(10).max(5000),
})

export const listWorkflowSuggestionsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

export const resolveSuggestionSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(["accepted", "dismissed"]),
})
```

**Commit:** `feat(ai): add Zod schemas for workflow intelligence features`

---

## Task 9: Router Procedures for Workflow Intelligence

**Files:**
- Modify: `src/modules/ai/ai.router.ts`
- Modify: `src/modules/ai/index.ts`

### New router procedures:

```typescript
generateWorkflow: modulePermission("workflows:write")
  .input(generateWorkflowSchema)
  .mutation(async ({ ctx, input }) => {
    // Get existing workflow names to avoid duplicates
    const existing = await workflowRepository.list(ctx.tenantId, { limit: 100 })
    return generateWorkflowFromDescription(input.description, {
      existingWorkflows: existing.rows.map((w) => w.name),
      availableEvents: [
        "booking/created", "booking/confirmed", "booking/cancelled", "booking/completed",
        "forms/submitted", "review/submitted", "team/created",
      ],
    })
  }),

listWorkflowSuggestions: moduleProcedure
  .input(listWorkflowSuggestionsSchema)
  .query(({ ctx, input }) =>
    suggestionsRepository.listByTenant(ctx.tenantId, input.status, input.limit)
  ),

resolveSuggestion: modulePermission("workflows:write")
  .input(resolveSuggestionSchema)
  .mutation(async ({ input }) => {
    await suggestionsRepository.updateStatus(input.suggestionId, input.action)
    return { success: true }
  }),
```

### Update barrel exports (index.ts):

```typescript
export { generateWorkflowFromDescription } from "./ai.workflow-generator"
export { suggestionsRepository } from "./ai.suggestions.repository"
```

**Commit:** `feat(ai): add workflow intelligence router procedures`

---

## Task 10: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai-phase-c.test.ts`

Test:
1. **AI_DECISION executor**: Mock Anthropic SDK. Test valid decision, fallback to default on parse failure
2. **AI_GENERATE executor**: Mock Anthropic SDK. Test content generation, output field storage
3. **AI error recovery**: Mock Anthropic SDK. Test retry, skip, substitute recommendations
4. **Workflow generator**: Mock Anthropic SDK. Test valid graph generation, validation error detection
5. **Suggestions repository**: CRUD operations, list by status
6. **Prompt interpolation**: Test {{variable}} replacement with context values

**Commit:** `test(ai): add Phase C tests for AI workflow nodes, generator, and suggestions`

---

## Task 11: Verification — tsc + build + tests

Run:
1. `npx tsc --noEmit` — fix any type errors
2. `npm run build` — fix any build errors
3. `npm run test` — all tests must pass

Fix any issues found. Commit with: `fix(ai): resolve Phase C verification issues`

---

## Post-Implementation Checklist

```
[ ] AI_DECISION and AI_GENERATE added to WorkflowNodeType
[ ] Node configs added with proper interfaces
[ ] AI node executors work within graph engine
[ ] ai_recover error handling strategy implemented
[ ] Natural-language workflow generation returns valid graphs
[ ] ai_workflow_suggestions table created and accessible
[ ] Weekly Inngest job wired (infrastructure ready)
[ ] Graph validation updated for new node types
[ ] All tests pass
[ ] tsc + build pass
```
