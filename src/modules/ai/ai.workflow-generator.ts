// src/modules/ai/ai.workflow-generator.ts
// Natural-language workflow generator — uses Claude to convert descriptions into workflow graphs

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { validateWorkflowGraph } from "@/modules/workflow/engine/validate"
import type { WorkflowNode, WorkflowEdge } from "@/modules/workflow/workflow.types"

const log = logger.child({ module: "ai.workflow-generator" })

// Lazy-init singleton — NEVER construct at module load time
let anthropicClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic() // reads ANTHROPIC_API_KEY from env
  }
  return anthropicClient
}

const GENERATOR_MODEL = "claude-sonnet-4-20250514"
const GENERATOR_MAX_TOKENS = 8192

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const GENERATOR_SYSTEM_PROMPT = `You are a workflow graph generator for a booking/scheduling platform. Given a natural-language description, you produce a valid workflow graph as JSON.

## Response Format

Respond ONLY with a JSON object — no markdown, no explanation, no wrapping. The JSON must have exactly these keys:

{
  "name": "Short workflow name",
  "description": "One-sentence description of what this workflow does",
  "nodes": [ ... ],
  "edges": [ ... ]
}

## Node Format

Each node is an object:
{
  "id": "unique_string_id",
  "type": "<NodeType>",
  "label": "Human-readable label",
  "position": { "x": <number>, "y": <number> },
  "config": { ... type-specific config ... }
}

Assign sensible positions: start the TRIGGER at (0, 0) and space subsequent nodes ~200px apart vertically.

## Edge Format

Each edge is an object:
{
  "id": "edge_unique_id",
  "source": "<source_node_id>",
  "target": "<target_node_id>",
  "sourceHandle": "<handle_name>",
  "label": "Optional label"
}

## Available Node Types

### Flow Control
- **TRIGGER** — exactly one per workflow. Config: { "eventType": "<event_name>", "conditions"?: <ConditionGroup>, "debounceMs"?: <number> }
  Events: "booking/created", "booking/updated", "booking/cancelled", "booking/completed", "payment/received", "forms/submitted", "review/submitted", "workflow/completed", "customer/created"
- **IF** — conditional branch. Config: { "conditions": <ConditionGroup> }
  Must have edges with sourceHandle "true" and "false".
- **SWITCH** — multi-way branch. Config: { "field": "<dot.path>", "cases": [{ "handle": "case_0", "operator": "equals"|"not_equals"|"contains"|"greater_than"|"less_than", "value": "<string>", "label"?: "<string>" }] }
  Each case needs an edge with the matching handle. Optionally add a "default" handle edge.
- **MERGE** — join parallel branches. Config: { "mode": "wait_all"|"wait_any"|"append", "timeout"?: "<ISO8601>" }
- **LOOP** — iterate over array. Config: { "sourceField": "<dot.path.to.array>", "itemVariableName": "<name>", "indexVariableName"?: "<name>", "maxIterations"?: <number>, "mode": "sequential"|"parallel" }
  Must have an edge with sourceHandle "item" (loop body). Use a LOOP_END node to mark end of loop body.
- **LOOP_END** — marks end of a loop body. Config: {} (empty). Connect back toward loop or next node.
- **WAIT_FOR_EVENT** — pause until event. Config: { "event": "<event_name>", "matchField": "<dot.path>", "matchSourceField": "<dot.path>", "timeout": "<ISO8601>", "timeoutBehavior": "continue"|"stop"|"error", "outputField"?: "<name>" }
  Must have an edge with sourceHandle "received". Optionally "timeout" handle.
- **WAIT_UNTIL** — delay. Config: { "mode": "duration"|"datetime"|"field", "duration"?: "<ISO8601>", "datetime"?: "<ISO8601>", "field"?: "<dot.path>" }
- **STOP** — end execution. Config: {} (empty).
- **ERROR** — throw error. Config: { "message"?: "<string>" } or empty.

### Action Nodes
- **SEND_EMAIL** — Config: { "recipientField"?: "<dot.path>", "recipientEmail"?: "<email>", "subject"?: "<template>", "body"?: "<template>", "bodyHtml"?: "<html>", "templateId"?: "<id>", "delay"?: "<ISO8601>" }
- **SEND_SMS** — Config: { "recipientField"?: "<dot.path>", "recipientPhone"?: "<phone>", "body"?: "<template>", "templateId"?: "<id>", "delay"?: "<ISO8601>" }
- **WEBHOOK** — Config: { "url": "<url>", "method": "POST"|"PUT"|"PATCH", "headers"?: {}, "bodyTemplate"?: "<template>", "timeout"?: <ms>, "expectedStatus"?: <number> }
- **CREATE_CALENDAR_EVENT** — Config: { "userIdField"?: "<dot.path>", "titleTemplate"?: "<template>", "descriptionTemplate"?: "<template>", "addCustomerAsAttendee"?: <boolean> }
- **UPDATE_BOOKING_STATUS** — Config: { "status": "CONFIRMED"|"CANCELLED"|"COMPLETED"|"NO_SHOW", "reason"?: "<string>" }
- **CREATE_TASK** — Config: { "title"?: "<template>", "description"?: "<template>", "assigneeField"?: "<dot.path>", "priority"?: "LOW"|"MEDIUM"|"HIGH"|"URGENT", "dueDateOffset"?: "<ISO8601>" }
- **SEND_NOTIFICATION** — Config: { "recipientField"?: "<dot.path>", "title"?: "<template>", "body"?: "<template>" }

### Data Nodes
- **SET_VARIABLE** — Config: { "assignments": [{ "key": "<name>", "valueType": "literal"|"expression"|"field", "literal"?: <value>, "field"?: "<dot.path>", "expression"?: "<expr>" }] }
- **FILTER** — Config: { "sourceField": "<dot.path>", "outputField": "<name>", "conditions": <ConditionGroup> }
- **TRANSFORM** — Config: { "outputField": "<name>", "mappings": [{ "targetKey": "<name>", "sourceField": "<dot.path>", "transform"?: "uppercase"|"lowercase"|"trim"|"toNumber"|"toDate"|"toBoolean"|"toString" }] }

### Sub-Workflow
- **EXECUTE_WORKFLOW** — Config: { "workflowId": "<id>", "mode": "sync"|"fire_and_forget", "inputMappings": [{ "targetKey": "<name>", "sourceField": "<dot.path>" }], "outputField"?: "<name>" }

### AI Nodes
- **AI_DECISION** — AI-powered branching. Config: { "prompt": "<prompt with {{variable}} placeholders>", "outcomes": [{ "handle": "<handle>", "label": "<label>", "description": "<when to choose this>" }], "defaultHandle": "<fallback_handle>", "model"?: "<model>", "maxTokens"?: <number> }
  Each outcome handle needs a corresponding edge.
- **AI_GENERATE** — AI content generation. Config: { "prompt": "<prompt with {{variable}} placeholders>", "outputField": "<name>", "outputSchema"?: {}, "model"?: "<model>", "maxTokens"?: <number> }

## ConditionGroup Format

{ "logic": "AND"|"OR", "conditions": [ { "field": "<dot.path>", "operator": "equals"|"not_equals"|"contains"|"greater_than"|"less_than"|"is_set"|"is_not_set", "value"?: "<string>" } ] }

Conditions can be nested: a condition entry can itself be a ConditionGroup.

## Template Syntax

Use {{dot.path}} for variable interpolation in strings, e.g. "Hello {{triggerData.customerName}}".

## Context Variable Paths

- triggerData.* — data from the triggering event
- variables.* — values set by SET_VARIABLE nodes
- nodes.<nodeId>.output.* — output of a previously executed node

## Rules

1. Every workflow must have exactly ONE TRIGGER node.
2. Every non-TRIGGER node must have at least one incoming edge.
3. IF nodes must have both "true" and "false" edges.
4. SWITCH nodes must have at least one case edge.
5. LOOP nodes must have an "item" edge.
6. WAIT_FOR_EVENT nodes must have a "received" edge.
7. No cycles (except LOOP back-edges).
8. Use descriptive node IDs like "trigger_1", "check_status", "send_confirmation" — not random UUIDs.
9. Always set a descriptive label on each node.
10. For SEND_EMAIL/SEND_SMS, prefer recipientField referencing triggerData unless a literal is specified.`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowGeneratorResult {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  name: string
  description: string
  validationErrors: string[]
}

export interface TenantContext {
  existingWorkflows?: Array<{ id: string; name: string; description?: string | null }>
  availableEvents?: string[]
}

// ---------------------------------------------------------------------------
// Generator function
// ---------------------------------------------------------------------------

export async function generateWorkflowFromDescription(
  description: string,
  tenantContext?: TenantContext
): Promise<WorkflowGeneratorResult> {
  log.info({ descriptionLength: description.length }, "Generating workflow from description")

  // Build user message with optional context
  let userMessage = description
  if (tenantContext) {
    const contextParts: string[] = []
    if (tenantContext.existingWorkflows?.length) {
      contextParts.push(
        `Existing workflows in this account:\n${tenantContext.existingWorkflows
          .map((w) => `- ${w.name}${w.description ? `: ${w.description}` : ""}`)
          .join("\n")}`
      )
    }
    if (tenantContext.availableEvents?.length) {
      contextParts.push(
        `Available trigger events: ${tenantContext.availableEvents.join(", ")}`
      )
    }
    if (contextParts.length > 0) {
      userMessage = `${contextParts.join("\n\n")}\n\n---\n\nUser request: ${description}`
    }
  }

  const client = getClient()

  const response = await client.messages.create({
    model: GENERATOR_MODEL,
    max_tokens: GENERATOR_MAX_TOKENS,
    system: GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  })

  // Extract text content
  const textBlock = response.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    log.error({ response: response.content }, "No text content in Claude response")
    return {
      nodes: [],
      edges: [],
      name: "",
      description: "",
      validationErrors: ["Claude returned no text content"],
    }
  }

  // Parse JSON response
  let parsed: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; name: string; description: string }
  try {
    // Strip potential markdown code fences
    let jsonText = textBlock.text.trim()
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }
    parsed = JSON.parse(jsonText)
  } catch (err) {
    log.error({ error: err, rawText: textBlock.text.slice(0, 500) }, "Failed to parse JSON from Claude response")
    return {
      nodes: [],
      edges: [],
      name: "",
      description: "",
      validationErrors: ["Failed to parse workflow JSON from AI response"],
    }
  }

  // Validate required fields
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    log.warn({ parsed }, "Response missing nodes or edges arrays")
    return {
      nodes: [],
      edges: [],
      name: parsed.name ?? "",
      description: parsed.description ?? "",
      validationErrors: ["AI response missing nodes or edges arrays"],
    }
  }

  // Validate the graph structure
  const validationErrors = validateWorkflowGraph(parsed.nodes, parsed.edges)

  if (validationErrors.length > 0) {
    log.warn(
      { validationErrors, nodeCount: parsed.nodes.length, edgeCount: parsed.edges.length },
      "Generated workflow has validation errors"
    )
  } else {
    log.info(
      { name: parsed.name, nodeCount: parsed.nodes.length, edgeCount: parsed.edges.length },
      "Successfully generated valid workflow"
    )
  }

  return {
    nodes: parsed.nodes,
    edges: parsed.edges,
    name: parsed.name ?? "",
    description: parsed.description ?? "",
    validationErrors,
  }
}
