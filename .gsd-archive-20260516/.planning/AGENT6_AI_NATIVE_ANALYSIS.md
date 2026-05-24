# Agent 6 Analysis: Making Ironheart AI-Native and Agentic
# Date: 2026-03-08 | Analyst: Agent 6 of 10

---

## Thesis

Most platforms bolt AI onto existing features. Ironheart has an unusual opportunity to do the opposite: make the AI the primary interface and let modules become capabilities the AI wields. The existing architecture -- typed event bus, module manifest with toolDefinitions, graph workflow engine, RBAC-gated service layer -- is already 70% of an agent runtime. The remaining 30% is the hard part: context management, autonomy boundaries, and the feedback loops that make the system learn.

My core argument: **the agent should not be a feature of the platform. The platform should be a toolkit for the agent.** Every module, every workflow, every integration becomes a tool the agent can compose. The chat interface is just one surface -- the agent should also act autonomously in the background, triggered by events, making decisions within guardrails set by the tenant.

---

## 1. Architecture

### 1.1 The Agent Runtime Layer

The agentic layer is NOT a single module. It is a runtime that sits between the event bus and the module services, capable of both reactive (event-triggered) and interactive (chat-initiated) operation.

```
                    +--------------------+
                    |   Chat Interface   |  <-- tRPC streaming endpoint
                    +--------+-----------+
                             |
                    +--------v-----------+
                    |   Agent Runtime    |  <-- Core orchestration layer
                    |  +--------------+  |
                    |  | Planner      |  |  <-- Breaks goals into steps
                    |  | Executor     |  |  <-- Invokes tools with guardrails
                    |  | Memory       |  |  <-- Short + long-term context
                    |  | Evaluator    |  |  <-- Scores outcomes, learns
                    |  +--------------+  |
                    +--------+-----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | Module      |  | Inngest     |  | External    |
     | Tools       |  | Events      |  | MCP/APIs    |
     | (tRPC svc)  |  | (async)     |  | (webhooks)  |
     +-------------+  +-------------+  +-------------+
```

**Four sub-components of the runtime:**

1. **Planner** -- Takes a goal (from chat or event) and decomposes it into a sequence of tool calls. Uses the LLM with the full tool catalog as context. Crucially, the planner operates on *intent*, not instructions. "Make sure John's Thursday booking goes smoothly" becomes: check booking exists, verify staff availability, check if forms are submitted, check payment status, send reminder if needed.

2. **Executor** -- Takes a plan and executes it step by step. Each step is an Inngest step (for durability). Before executing any mutation, the executor checks the approval policy. Read-only tools execute immediately; mutating tools may require human approval depending on the tenant's configured autonomy level.

3. **Memory** -- A structured context store that gives the agent relevant information without overwhelming the context window. Three tiers:
   - **Session memory** (Redis, TTL 24h): current conversation, recent tool results, active plan state
   - **Tenant memory** (Postgres): tenant brand context, past decisions, learned preferences, entity relationships
   - **Episodic memory** (Postgres + vector embeddings): past conversations, past autonomous actions and their outcomes, enabling the agent to reason from precedent

4. **Evaluator** -- After every autonomous action, scores the outcome. Did the booking get confirmed? Did the customer respond to the notification? Did the workflow complete successfully? Feeds back into tenant memory to improve future decisions.

### 1.2 Key Architectural Decision: Agent-as-Inngest-Function

The agent runtime should be implemented as a long-running Inngest function, not as a standalone process. This is the critical insight that makes it work with the existing architecture:

```typescript
// src/modules/ai/agent/agent.runtime.ts

export const agentExecution = inngest.createFunction(
  {
    id: 'agent-execution',
    name: 'AI Agent: Execute Plan',
    retries: 3,
    cancelOn: [{ event: 'agent/cancel', match: 'data.executionId' }],
  },
  [
    { event: 'agent/chat.message' },     // User sends a message
    { event: 'agent/autonomous.trigger' }, // Event-driven autonomous action
  ],
  async ({ event, step }) => {
    // Step 1: Load context
    const ctx = await step.run('load-context', () =>
      agentMemory.loadContext(event.data.tenantId, event.data.sessionId)
    )

    // Step 2: Plan
    const plan = await step.run('plan', () =>
      agentPlanner.createPlan(ctx, event.data.goal ?? event.data.message)
    )

    // Step 3: Execute steps with approval gates
    for (const [i, action] of plan.steps.entries()) {
      if (action.requiresApproval) {
        // Emit approval request, wait for response
        await step.run(`request-approval-${i}`, () =>
          inngest.send({ name: 'agent/approval.requested', data: { ... } })
        )
        const approval = await step.waitForEvent(`approval-${i}`, {
          event: 'agent/approval.response',
          match: 'data.stepId',
          timeout: '24h',
        })
        if (!approval || approval.data.decision === 'reject') continue
      }

      const result = await step.run(`execute-${i}`, () =>
        agentExecutor.executeStep(action, ctx)
      )

      // Update context with result
      await step.run(`update-context-${i}`, () =>
        agentMemory.recordStepResult(ctx.sessionId, action, result)
      )
    }

    // Step 4: Evaluate and learn
    await step.run('evaluate', () =>
      agentEvaluator.scoreExecution(ctx.sessionId)
    )
  }
)
```

Why Inngest and not a raw process:
- **Durability**: If the server restarts mid-plan, execution resumes from the last completed step
- **Observability**: Every step is logged in Inngest's dashboard, matching the existing workflow execution pattern
- **Rate limiting**: Inngest's built-in concurrency controls prevent runaway agent loops
- **Cancellation**: `cancelOn` lets users abort an agent plan mid-execution
- **waitForEvent**: Human-in-the-loop approval uses the same primitive as WAIT_FOR_EVENT workflow nodes

### 1.3 Tool Resolution: Leveraging the Module Manifest

The Tier 1 design doc already specifies `ModuleToolDefinition` with `handler`, `parametersSchema`, `readOnly`, and `requiredPermission`. This is 90% of what the agent needs. The missing piece is **semantic tooling metadata** for the planner:

```typescript
export interface ModuleToolDefinition {
  // ... existing fields from Tier 1 design ...
  name: string
  description: string
  parametersSchema: string
  handler: string
  readOnly: boolean
  requiredPermission: string

  // NEW: Agent-specific metadata
  /** When should the agent consider using this tool? Semantic trigger description. */
  useCases: string[]
  /** What entity types does this tool operate on? For context prefetching. */
  entityTypes: string[]
  /** Can this tool's effects be reversed? If so, what tool reverses it? */
  reversible?: { reverseToolName: string; autoReverse: boolean }
  /** Estimated cost: 'free' | 'cheap' | 'expensive' (for planning budget) */
  costCategory: 'free' | 'cheap' | 'expensive'
  /** Does this tool have side effects outside the platform? (email, SMS, webhook) */
  externalSideEffects: boolean
}
```

The `useCases` field is important. Instead of relying solely on the LLM to figure out which tool to use from a flat list, the planner can do a first-pass filter: "The user wants to reschedule a booking" -> match tools where `useCases` includes "reschedule" or `entityTypes` includes "booking". This reduces the tool set presented to the LLM from 100+ to 5-10 relevant tools, improving accuracy and reducing token usage.

### 1.4 File Structure

```
src/modules/ai/
  ai.types.ts                    -- Existing (Tier 1)
  ai.schemas.ts                  -- Existing (Tier 1)
  ai.repository.ts               -- Existing (Tier 1) + agent memory queries
  ai.service.ts                  -- Existing (Tier 1) + agent orchestration
  ai.router.ts                   -- Existing (Tier 1) + chat streaming endpoint
  ai.events.ts                   -- Existing (Tier 1) + agent Inngest functions
  ai.manifest.ts                 -- Existing (Tier 1) + expanded toolDefinitions
  providers/
    types.ts                     -- Existing (Tier 1)
    anthropic.ts                 -- Existing (Tier 1) + streaming support
  agent/
    agent.runtime.ts             -- Main Inngest-based agent execution loop
    agent.planner.ts             -- Goal decomposition + tool selection
    agent.executor.ts            -- Tool invocation with guardrails
    agent.memory.ts              -- Context management (session/tenant/episodic)
    agent.evaluator.ts           -- Outcome scoring + feedback
    agent.policies.ts            -- Autonomy level configs + approval rules
    agent.tools.ts               -- Tool registry + resolution + invocation
    __tests__/
      agent.planner.test.ts
      agent.executor.test.ts
      agent.memory.test.ts
  index.ts
  __tests__/
    ai.service.test.ts           -- Existing (Tier 1)
```

---

## 2. Autonomy & Guardrails

### 2.1 The Autonomy Spectrum

The critical insight: different tenants, different users, and different actions need different levels of autonomy. A dog grooming salon might want the agent to auto-confirm bookings. A nuclear waste brokerage might want every action manually approved.

**Three autonomy levels, configured per tenant:**

| Level | Name | Behavior |
|-------|------|----------|
| 0 | **Advisor** | Agent suggests actions but never executes. Shows "I recommend..." messages. All actions require explicit user click. |
| 1 | **Assistant** | Agent auto-executes read-only operations and low-risk mutations (send reminder, add tag). Medium/high-risk mutations require approval. |
| 2 | **Autopilot** | Agent auto-executes most actions. Only irreversible external actions (refund payment, delete customer, send to external system) require approval. |

**Stored in `ai_tenant_config`:**
```typescript
// Add to ai_tenant_config:
autonomyLevel: integer().notNull().default(1),  // 0, 1, or 2
approvalTimeoutHours: integer().notNull().default(24),
autoApproveReadOnly: boolean().notNull().default(true),
```

### 2.2 Risk Classification

Every tool invocation is classified before execution:

```typescript
type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

function classifyRisk(tool: ModuleToolDefinition, params: unknown): RiskLevel {
  if (tool.readOnly) return 'none'
  if (tool.externalSideEffects) return 'high'  // emails, webhooks, payments
  if (!tool.reversible) return 'medium'         // irreversible internal mutations
  if (tool.costCategory === 'expensive') return 'medium'
  return 'low'                                   // reversible internal mutations
}
```

**Approval matrix:**

| Risk Level | Autonomy 0 (Advisor) | Autonomy 1 (Assistant) | Autonomy 2 (Autopilot) |
|------------|---------------------|----------------------|----------------------|
| none (reads) | Auto | Auto | Auto |
| low | Requires approval | Auto | Auto |
| medium | Requires approval | Requires approval | Auto |
| high | Requires approval | Requires approval | Requires approval |
| critical | Always requires approval | Always requires approval | Always requires approval |

### 2.3 Critical Guardrails

1. **Budget caps**: Every agent execution has a token budget (configurable per tenant). If the planner's estimated cost exceeds the budget, it asks the user to approve the overage or suggests a simpler approach.

2. **Action rate limits**: No more than N mutations per minute per tenant. Prevents runaway loops where the agent creates 10,000 bookings because a condition was wrong.

3. **Blast radius limits**: The agent cannot modify more than M records in a single plan without explicit approval. "Delete all cancelled bookings from last year" requires approval regardless of autonomy level.

4. **Idempotency keys**: Every agent-initiated mutation includes an idempotency key derived from `{executionId}:{stepIndex}`. If the agent retries (Inngest replay), the same mutation is not applied twice.

5. **Undo log**: Every agent mutation is recorded in an `agent_actions` table with enough information to reverse it. The `reversible` metadata on tools tells the system which reversals are possible.

6. **Kill switch**: `ai_tenant_config.enabled = false` immediately halts all agent activity for the tenant. Active Inngest functions check this flag at each step.

### 2.4 Approval UX

When the agent needs approval:
1. Agent emits `agent/approval.requested` Inngest event
2. A notification is sent to the user (in-app push, optionally email/SMS)
3. The approval request appears in both:
   - The chat interface (inline with the conversation)
   - A dedicated "Agent Actions" queue in the admin panel
4. User can: Approve, Reject, or Modify (edit parameters before approving)
5. The Inngest function's `waitForEvent` receives the response and continues

If no response within `approvalTimeoutHours`, the step is skipped and the agent moves on (or terminates, based on configuration).

---

## 3. Chat Interface

### 3.1 Architecture: Server-Sent Events via tRPC

The chat interface streams responses to the client using SSE (Server-Sent Events). This matches tRPC 11's subscription support and avoids WebSocket complexity:

```typescript
// ai.router.ts
chat: tenantProcedure
  .input(z.object({
    sessionId: z.string().optional(),  // Omit to start new session
    message: z.string().min(1).max(5000),
  }))
  .subscription(async function* ({ ctx, input }) {
    const sessionId = input.sessionId ?? crypto.randomUUID()

    // Load session context
    const session = await agentMemory.getOrCreateSession(
      ctx.tenantId, ctx.user.id, sessionId
    )

    // Stream planning phase
    yield { type: 'thinking', content: 'Analyzing your request...' }

    // Plan
    const plan = await agentPlanner.createPlan(session.context, input.message)
    yield { type: 'plan', steps: plan.steps.map(s => s.summary) }

    // Execute steps, streaming progress
    for (const [i, action] of plan.steps.entries()) {
      yield { type: 'step.start', stepIndex: i, tool: action.toolName }

      if (action.requiresApproval) {
        yield { type: 'approval.required', stepIndex: i, action: action.summary }
        // Pause until approval arrives via separate mutation
        return  // Client re-subscribes after approval
      }

      const result = await agentExecutor.executeStep(action, session.context)
      yield { type: 'step.complete', stepIndex: i, result: result.summary }
    }

    // Generate natural language summary
    const summary = await aiService.generateText({
      messages: [
        { role: 'system', content: 'Summarize what was done in 2-3 sentences.' },
        { role: 'user', content: JSON.stringify(plan.results) },
      ],
    })
    yield { type: 'response', content: summary.text, sessionId }
  })
```

### 3.2 Context Window Management

The LLM context window is precious and finite. The chat system uses a **three-layer context assembly** strategy:

**Layer 1: System Prompt (always present, ~500 tokens)**
- Tenant identity (name, brand context, tone from `ai_tenant_config`)
- Current date/time, timezone
- User identity and permissions
- Available tool categories (not individual tools -- those come in Layer 2)

**Layer 2: Relevant Tools (~200-1000 tokens depending on relevance)**
- The planner first classifies the user's intent (booking? customer? analytics?)
- Only tools matching the classified intent are included
- Each tool is described in ~30 tokens (name + description + key parameters)

**Layer 3: Conversation + Entity Context (~remaining budget)**
- Recent conversation messages (sliding window, most recent N messages)
- Entities mentioned in the conversation, loaded from DB on demand
- Previous tool results from this session (summarized, not raw)

The total context is capped at ~60% of the model's context window, leaving 40% for the response and tool calls.

### 3.3 Multi-Turn Conversations

The chat interface maintains conversation state across messages:

```typescript
interface AgentSession {
  id: string
  tenantId: string
  userId: string
  messages: AgentMessage[]      // Full conversation history
  activeEntities: Map<string, unknown>  // Entities referenced in conversation
  activePlan: AgentPlan | null  // If a multi-step plan is in progress
  context: AgentContext         // Assembled context for LLM
  createdAt: Date
  lastActivityAt: Date
}
```

Sessions are stored in Redis with a 24-hour TTL (configurable). Long-term conversation summaries are persisted to Postgres for episodic memory.

### 3.4 Proactive Messages

The chat interface is not just reactive. The agent can initiate conversations:

```typescript
// When the agent detects something noteworthy during autonomous operation:
await inngest.send({
  name: 'agent/proactive.message',
  data: {
    tenantId,
    userId,  // Which user should see this
    priority: 'info',  // 'info' | 'warning' | 'urgent'
    title: 'Unusual cancellation spike detected',
    body: '7 cancellations in the last 2 hours vs your daily average of 2. Would you like me to check if there is a scheduling conflict?',
    suggestedActions: ['investigate', 'dismiss'],
  },
})
```

These appear as ambient notifications in the chat panel. The user can engage or dismiss.

---

## 4. Workflow Intelligence

### 4.1 AI as a Workflow Node Type

The single most impactful addition to the existing workflow engine: an **AI_DECISION** node type.

```typescript
// Add to WorkflowNodeType:
| 'AI_DECISION'

interface AIDecisionNodeConfig {
  /** The question or decision to make, with {{variable}} interpolation */
  prompt: string
  /** What kind of output is expected */
  outputType: 'boolean' | 'category' | 'text' | 'structured'
  /** For 'category' type: the possible output categories (become edge handles) */
  categories?: string[]
  /** For 'structured' type: Zod schema reference */
  outputSchema?: string
  /** Maximum tokens for the AI response */
  maxTokens?: number
  /** Temperature: lower = more deterministic */
  temperature?: number
  /** Fallback handle if AI call fails */
  fallbackHandle?: string
}
```

This lets tenants build workflows where the AI makes decisions at branch points:

```
TRIGGER(booking/created) -->
  AI_DECISION("Is this booking likely to be a no-show based on customer history?
    Customer: {{customerName}}, booking count: {{customerBookingCount}},
    cancellation rate: {{customerCancellationRate}}")
    |-- "high_risk" --> SEND_SMS("Reminder: Your booking is confirmed for...")
    |-- "low_risk" --> (continue)
    |-- "fallback" --> (continue)
```

The AI_DECISION node:
- Resolves all variables from the workflow execution context
- Calls the AI provider with the assembled prompt
- For boolean: routes to `true`/`false` handles
- For category: routes to the matching category handle
- For text/structured: stores the output in context and routes to `output`
- On failure: routes to `fallbackHandle` (defaults to `output`)

### 4.2 Self-Healing Workflows

When a workflow execution fails, instead of just logging the error and stopping, the agent can attempt to diagnose and fix the issue:

```typescript
// In workflow.events.ts, when execution fails:

export const selfHealWorkflow = inngest.createFunction(
  { id: 'workflow-self-heal', name: 'AI: Self-Heal Failed Workflow' },
  { event: 'workflow/execution.failed' },
  async ({ event, step }) => {
    const { executionId, tenantId, errorMessage, failedNodeId } = event.data

    // Check if self-healing is enabled for this tenant
    const enabled = await step.run('check-enabled', () =>
      aiService.isFeatureEnabled(tenantId, 'WORKFLOW_SELF_HEAL')
    )
    if (!enabled) return

    // Load execution context and workflow definition
    const execution = await step.run('load-execution', () =>
      workflowRepository.getExecution(executionId)
    )

    // Ask AI to diagnose
    const diagnosis = await step.run('diagnose', () =>
      aiService.diagnoseWorkflowFailure({
        tenantId,
        workflowDefinition: execution.workflow,
        failedNodeId,
        errorMessage,
        executionContext: execution.context,
      })
    )

    // If diagnosis suggests a retry with modified parameters, attempt it
    if (diagnosis.action === 'retry_with_fix' && diagnosis.confidence > 0.8) {
      await step.run('retry', () =>
        workflowService.retryExecution(executionId, diagnosis.fixedContext)
      )
    } else {
      // Notify the user with the diagnosis
      await step.run('notify', () =>
        inngest.send({
          name: 'agent/proactive.message',
          data: {
            tenantId,
            userId: execution.triggeredByUserId,
            priority: 'warning',
            title: `Workflow "${execution.workflow.name}" failed`,
            body: diagnosis.explanation,
            suggestedActions: diagnosis.suggestedActions,
          },
        })
      )
    }
  }
)
```

### 4.3 Workflow Suggestion from Observed Patterns

The Tier 1 design already includes a daily cron that analyses audit logs and suggests workflows. The agentic version goes further:

- **Pattern detection**: Instead of just counting repeated manual actions, the agent identifies *sequences* of actions that commonly occur together. "When a booking is completed, the user usually creates an invoice within 30 minutes, then sends a follow-up email within 2 hours, then creates a review request the next day."

- **Workflow generation**: The agent doesn't just suggest -- it generates a complete workflow graph with nodes, edges, conditions, and delays that can be applied with one click.

- **A/B testing**: Once a suggested workflow is applied, the agent tracks its outcomes vs the manual baseline. If the automated version performs worse (lower review scores, more cancellations), it flags the regression.

### 4.4 Natural Language Workflow Builder

Instead of the visual drag-and-drop builder, users can describe a workflow in plain English:

> "When a customer books for the first time, wait 1 hour, then send them a welcome email. If they haven't submitted their intake form within 24 hours, send a reminder. If they still haven't submitted after 48 hours, create a task for the staff member to call them."

The AI generates the complete graph workflow (nodes + edges JSON) that maps to the existing graph engine. The user can then view and edit it in the visual builder.

This is not just a Tier 1 form generation feature -- it requires the AI to understand the full workflow node type system (IF, WAIT_UNTIL, SEND_EMAIL, CREATE_TASK, etc.) and produce valid graph structures that pass `validateWorkflowGraph()`.

---

## 5. Industry Agnosticism

### 5.1 The Vertical Context Layer

The platform is industry-agnostic, but the AI layer needs industry context to be useful. The solution: a **vertical context** configuration that shapes AI behavior without changing code.

```typescript
interface VerticalContext {
  /** Short identifier: 'bng', 'real_estate', 'dog_grooming', 'waste_management' */
  slug: string
  /** Human-readable: 'Biodiversity Net Gain Brokerage' */
  name: string
  /** 2-3 sentence description for AI system prompts */
  description: string
  /** Industry-specific terminology mapping */
  terminology: Record<string, string>  // { 'booking': 'credit transaction', 'customer': 'landowner' }
  /** Industry-specific entities and their fields */
  customEntities?: CustomEntityDefinition[]
  /** Regulatory considerations the AI should be aware of */
  compliance: string[]
  /** Common workflow patterns for this vertical */
  commonPatterns: string[]
}
```

This lives in `ai_tenant_config.verticalContext` (JSONB column). When assembled into the system prompt, it gives the AI everything it needs to speak the tenant's language:

```
You are an AI assistant for "Green Credits Ltd", a Biodiversity Net Gain Brokerage.
In this industry, "bookings" are called "credit transactions", "customers" are "landowners" or "developers".
Key terminology: habitat units, baseline assessment, BNG metric, 30-year management plan.
Regulatory context: Environment Act 2021, 10% net gain requirement, Natural England oversight.
```

### 5.2 Terminology Injection

The `terminology` map is applied bidirectionally:
1. **Inbound**: When the user says "show me all landowner transactions", the AI maps "landowner" -> "customer" and "transactions" -> "bookings" before querying tools
2. **Outbound**: When the agent returns results, it maps "bookings" -> "credit transactions" in its response

This is a simple find-and-replace at the prompt level, not a complex NLP pipeline. It is enough to make the agent feel native to the vertical.

### 5.3 Custom Entity Extensions

Some verticals need entity types that don't exist in the core platform. Rather than adding tables for every possible vertical, the agent uses the existing JSONB `metadata` columns on core entities to store and query vertical-specific fields:

```typescript
// The AI knows that for BNG tenants, bookings have these custom fields:
const bngBookingFields = {
  habitatUnits: { type: 'number', label: 'Habitat Units', required: true },
  baselineMetricScore: { type: 'number', label: 'Baseline Metric Score' },
  offsetSiteReference: { type: 'text', label: 'Offset Site Reference' },
}
```

These custom field definitions live in the module settings (already supported via `settingsDefinitions` in the manifest). The AI uses them when generating forms, suggesting defaults, and extracting data.

### 5.4 Zero-Configuration Vertical Detection

When a new tenant signs up and starts entering data, the agent can infer the vertical from the service names, customer patterns, and communication style:

```typescript
// After the tenant has created 5+ bookings:
const inferredVertical = await aiService.generateStructured({
  messages: [{
    role: 'system',
    content: 'Based on these service names, customer types, and booking patterns, identify the industry vertical.',
  }, {
    role: 'user',
    content: JSON.stringify({
      services: tenant.services.map(s => s.name),
      recentBookings: tenant.recentBookings.map(b => b.summary),
    }),
  }],
  schema: verticalContextSchema,
})
```

The agent then suggests the vertical to the tenant: "It looks like you are running a BNG brokerage. Would you like me to configure industry-specific terminology and compliance checks?"

---

## 6. Integration Strategy

### 6.1 MCP (Model Context Protocol) as the Universal Connector

MCP is the natural integration layer because it solves the N*M problem: instead of building N integrations for M AI features, you build N MCP servers and the agent consumes them all through one protocol.

**Ironheart as MCP Client:**
```typescript
// src/modules/ai/agent/mcp-client.ts
import { MCPClient } from '@modelcontextprotocol/sdk'

interface MCPIntegration {
  id: string
  tenantId: string
  name: string              // 'Xero Accounting', 'Google Sheets', 'Slack'
  serverUrl: string         // MCP server endpoint
  authConfig: Record<string, unknown>
  enabledTools: string[]    // Which MCP tools the tenant has enabled
}

class MCPIntegrationManager {
  // Load all active MCP integrations for a tenant
  async getAvailableTools(tenantId: string): Promise<MCPTool[]> {
    const integrations = await mcpRepository.listActive(tenantId)
    const tools: MCPTool[] = []

    for (const integration of integrations) {
      const client = await this.getOrCreateClient(integration)
      const serverTools = await client.listTools()
      tools.push(
        ...serverTools
          .filter(t => integration.enabledTools.includes(t.name))
          .map(t => ({ ...t, integrationId: integration.id }))
      )
    }
    return tools
  }

  // Execute an MCP tool call
  async executeTool(integrationId: string, toolName: string, args: unknown): Promise<unknown> {
    const integration = await mcpRepository.getById(integrationId)
    const client = await this.getOrCreateClient(integration)
    return client.callTool(toolName, args)
  }
}
```

**Ironheart as MCP Server:**

Expose the entire platform as an MCP server so external AI agents can interact with it:

```typescript
// src/app/api/mcp/route.ts
import { MCPServer } from '@modelcontextprotocol/sdk'

const server = new MCPServer({
  name: 'ironheart',
  version: '1.0.0',
})

// Register all module tools as MCP tools
for (const manifest of moduleRegistry.getAllManifests()) {
  for (const tool of manifest.toolDefinitions ?? []) {
    server.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: resolveZodToJsonSchema(tool.parametersSchema),
      handler: async (args, context) => {
        // Authenticate via MCP auth, resolve tenant, check permissions
        const result = await resolveAndInvokeHandler(tool.handler, args, context)
        return result
      },
    })
  }
}
```

### 6.2 A2A (Agent-to-Agent) Protocol

Google's Agent-to-Agent protocol enables cross-platform agent collaboration. Ironheart should support A2A for B2B scenarios:

- A developer's AI agent (via their project management tool) could negotiate a booking with Ironheart's agent
- A customer's personal AI assistant could manage their appointments via A2A
- Partner brokerages could exchange credit inventory through agent negotiation

```typescript
interface A2AEndpoint {
  tenantId: string
  agentCard: {
    name: string
    description: string
    capabilities: string[]
    endpoint: string
    authScheme: 'oauth2' | 'apiKey'
  }
}
```

### 6.3 Webhook Intelligence

Rather than simple webhook forwarding, the agent can interpret incoming webhook payloads:

```typescript
// When an unrecognized webhook arrives at the developer API:
export const interpretWebhook = inngest.createFunction(
  { id: 'ai-interpret-webhook' },
  { event: 'developer/webhook.received' },
  async ({ event, step }) => {
    const { tenantId, source, payload, headers } = event.data

    // Ask AI to interpret the webhook
    const interpretation = await step.run('interpret', () =>
      aiService.generateStructured({
        messages: [{
          role: 'system',
          content: `Interpret this webhook payload from ${source}.
            What happened? What entity does it relate to?
            What action should be taken?`,
        }, {
          role: 'user',
          content: JSON.stringify({ headers, payload }),
        }],
        schema: webhookInterpretationSchema,
      })
    )

    // Route to appropriate handler
    if (interpretation.data.suggestedAction) {
      await step.run('route', () =>
        agentExecutor.executeStep(interpretation.data.suggestedAction, {
          tenantId,
          source: 'webhook',
          triggerData: payload,
        })
      )
    }
  }
)
```

---

## 7. Data & Context

### 7.1 The Context Assembly Pipeline

Every AI call goes through a context assembly pipeline that ensures the LLM has the right information:

```
User Message/Event
       |
       v
+------------------+     +------------------+
| Intent Classifier| --> | Entity Resolver  |  Load referenced entities from DB
+------------------+     +------------------+
                                 |
                                 v
                          +------------------+
                          | Context Ranker   |  Score and select most relevant context
                          +------------------+
                                 |
                                 v
                          +------------------+
                          | Token Budgeter   |  Fit within context window limits
                          +------------------+
                                 |
                                 v
                          +------------------+
                          | Prompt Assembler |  Build final system + user messages
                          +------------------+
```

### 7.2 Entity Graph for Context

When the user mentions "John's booking next Thursday", the context resolver needs to:
1. Identify "John" as a customer entity
2. Find the booking associated with John on next Thursday
3. Load related entities: the service, the assigned staff member, any forms, payment status
4. Include recent interactions: last 3 customer notes, any open review requests

This entity graph traversal uses the existing repository methods. The key insight: **the agent should have a pre-defined set of entity relationship paths** so it knows what to prefetch:

```typescript
const ENTITY_RELATIONSHIPS: Record<string, string[]> = {
  booking: ['customer', 'service', 'staff', 'payment', 'forms', 'review'],
  customer: ['recentBookings', 'notes', 'pendingForms', 'reviews'],
  staff: ['availability', 'upcomingBookings', 'skills'],
  workflow: ['recentExecutions', 'triggerEvents'],
}
```

### 7.3 Tenant Learning

Over time, the agent learns tenant-specific patterns:

1. **Decision patterns**: When the agent proposes an action and the user modifies it before approving, the modification is stored. After N similar modifications, the agent adjusts its default behavior.

2. **Communication style**: The agent analyses the tenant's past notifications, review responses, and customer messages to match their tone and vocabulary.

3. **Workflow patterns**: The agent tracks which manual actions the tenant performs most frequently and suggests automations (Tier 1 already covers this).

4. **Seasonal patterns**: Over months, the agent learns booking patterns (busy seasons, quiet periods) and proactively suggests scheduling adjustments.

All of this is stored in `ai_tenant_context` (new table):

```sql
CREATE TABLE ai_tenant_context (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,    -- 'decision_pattern', 'communication_style', 'seasonal_pattern'
  key TEXT NOT NULL,             -- 'booking.reschedule.default_action', 'tone.formality_level'
  value JSONB NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1,
  last_updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(tenant_id, context_type, key)
);
```

### 7.4 Privacy and Data Boundaries

Critical: the agent must NEVER cross tenant boundaries. Every database query, every context load, every tool invocation includes `tenantId` in the WHERE clause. This is already enforced at the repository layer, and the agent inherits it.

Additionally:
- Conversation logs are tenant-scoped and subject to the same retention policies as audit logs
- The agent never sends tenant data to external services beyond the LLM provider
- Embedding vectors for episodic memory are stored per-tenant, never shared
- MCP server connections use per-tenant credentials

---

## 8. Killer Features

### 8.1 The Time Machine: Predictive Scheduling

The agent monitors booking patterns, cancellation rates, weather forecasts (via MCP), and seasonal trends to predict demand. It then proactively:

- Suggests opening additional slots on predicted busy days
- Recommends staff scheduling adjustments
- Warns about likely no-shows and suggests overbooking strategies
- Identifies underutilized time slots and suggests promotions

This is not just analytics -- it is the agent taking action on the analytics. "I notice Thursdays have been 40% busier than usual for the past 3 weeks. Sarah has availability on Thursdays that is not currently open for booking. Would you like me to open her Thursday 2-6pm slots?"

### 8.2 The Negotiator: Autonomous Customer Communication

When a customer sends a message (via portal, email, or form), the agent can:

1. Understand the intent (reschedule, cancel, ask a question, make a complaint)
2. Look up the relevant booking/customer context
3. Draft a response that handles the request
4. If the request is actionable (reschedule to next week), propose the action with a one-click approval
5. If autonomy allows, execute the action directly

The tenant sets the boundary: "The agent can handle rescheduling requests within 7 days and cancellations with 48+ hours notice autonomously. Anything else needs my approval."

### 8.3 The Auditor: Compliance Monitoring

For regulated industries (BNG, waste management, insurance), the agent continuously monitors for compliance issues:

- Expired certifications on staff members
- Missing required forms for specific service types
- Overdue invoices approaching regulatory deadlines
- Workflow executions that skipped mandatory steps

The agent generates a daily compliance digest and flags critical issues immediately. This is the agent reading from audit logs, form submissions, and workflow execution results -- all data that already exists.

### 8.4 The Optimizer: Revenue Intelligence

The agent identifies revenue opportunities that humans miss:

- Customers who haven't booked in their usual interval ("Jane normally books every 6 weeks and it's been 8 weeks")
- Services that are consistently fully booked (price too low?)
- Time slots that never sell (need a promotion?)
- Staff members whose customers have higher satisfaction scores (charge more? book them with high-value customers?)

### 8.5 The Orchestrator: Cross-Module Workflow Synthesis

Current workflows are defined by users as explicit graphs. The agent can compose ad-hoc cross-module workflows in response to complex requests:

> "A customer just told me they want to pause all their bookings for 2 months because they are having surgery. They have 4 upcoming appointments."

The agent:
1. Identifies the 4 upcoming bookings
2. Cancels each one (booking module)
3. Updates the customer record with a note (customer module)
4. Creates a follow-up task for 2 months from now (workflow module)
5. Sends a "we hope your recovery goes well" email (notification module)
6. Adjusts the staff schedules for the freed slots (scheduling module)

This is not a pre-defined workflow -- it is a plan the agent constructs on the fly from the available tools.

---

## 9. Risks & Pitfalls

### 9.1 The Hallucination Problem

**Risk**: The agent reports data that does not exist or takes actions based on hallucinated context.
**Mitigation**: Every factual claim the agent makes must be grounded in a tool result. The evaluator checks that response content references actual tool outputs. The system prompt includes: "Never state facts you have not verified via a tool call. If uncertain, say so."

### 9.2 The Runaway Agent

**Risk**: An autonomous agent enters a loop, creating hundreds of bookings or sending hundreds of emails.
**Mitigation**:
- Hard rate limits per tenant per minute (mutations)
- Inngest concurrency controls (max 1 concurrent agent execution per tenant)
- Budget caps per execution
- Kill switch in `ai_tenant_config.enabled`
- Blast radius limits on bulk operations

### 9.3 The Privacy Leak

**Risk**: Agent sends sensitive tenant data to external services via MCP or webhook.
**Mitigation**:
- All external tool calls require explicit tenant opt-in
- PII fields (email, phone, address) are redacted from AI context unless the specific tool needs them
- MCP server connections are logged in audit trail
- No cross-tenant data access (enforced at repository layer)

### 9.4 The Cost Spiral

**Risk**: AI API costs exceed what tenants are willing to pay, or what the platform margins can absorb.
**Mitigation**:
- Token usage tracking per feature per tenant (already in Tier 1 design)
- Monthly token budgets per plan tier
- The planner estimates cost before execution and chooses cheaper strategies when possible
- Cache frequent queries (e.g., "what bookings do I have today?" can be answered from Redis without an LLM call)
- Use smaller/cheaper models for simple tasks (intent classification, entity extraction) and larger models only for complex reasoning

### 9.5 The Complexity Cliff

**Risk**: The agent system becomes so complex that no developer can understand or debug it.
**Mitigation**:
- Every agent execution is logged as an Inngest function with discrete, inspectable steps
- The evaluator scores every execution, surfacing failures and poor outcomes
- Agent actions are recorded in the audit log (same as human actions)
- The agent explains its reasoning in the chat interface (chain-of-thought is shown to the user)
- Start with Autonomy Level 0 (Advisor) as default -- let tenants opt into more autonomy

### 9.6 The "AI Wrapper" Perception

**Risk**: Users perceive the AI features as thin wrappers around an LLM, not differentiated.
**Mitigation**: The differentiation is in the depth of integration, not the AI itself. The agent doesn't just answer questions -- it takes actions. It doesn't just summarize data -- it monitors, predicts, and acts on it. The module manifest system and typed tool registry are the moat: no competitor can quickly replicate the tight integration between 21 modules and an agent runtime.

### 9.7 Latency

**Risk**: Agent responses feel slow because they require multiple LLM calls and database queries.
**Mitigation**:
- Stream responses (SSE) so the user sees progress immediately
- Prefetch common context (today's bookings, active customers) into Redis on session start
- Use parallel tool calls where steps are independent
- For simple queries, detect and short-circuit to direct database queries without LLM reasoning

---

## 10. Implementation Priority

### Phase A: Foundation (Weeks 1-3)
**Prerequisite: Tier 1 must be implemented first.**

1. Implement the AI module as designed in the Tier 1 doc (provider abstraction, prompt templates, usage tracking, 8 features)
2. Add `toolDefinitions` to all 21 module manifests (read-only tools first)
3. Add `ModuleToolDefinition` extensions (useCases, entityTypes, costCategory, externalSideEffects)
4. Implement tool registry and resolution in `agent.tools.ts`

### Phase B: Chat Interface (Weeks 4-6)

5. Implement `agent.memory.ts` (session memory in Redis)
6. Implement `agent.planner.ts` (single-turn planning, tool selection, intent classification)
7. Implement `agent.executor.ts` (tool invocation with RBAC, error handling)
8. Add `chat` streaming subscription to `ai.router.ts`
9. Build the chat UI component (streaming messages, tool call visualization)

### Phase C: Autonomy & Guardrails (Weeks 7-9)

10. Implement `agent.policies.ts` (autonomy levels, risk classification, approval rules)
11. Add approval request/response flow (Inngest waitForEvent + UI)
12. Implement agent action rate limits and budget caps
13. Add undo log for agent-initiated mutations
14. Add mutating tools to module manifests

### Phase D: Workflow Intelligence (Weeks 10-12)

15. Add `AI_DECISION` node type to the graph engine
16. Implement self-healing workflow handler
17. Implement natural language workflow builder
18. Implement pattern detection for workflow suggestions (upgrade from Tier 1 basic version)

### Phase E: Memory & Learning (Weeks 13-15)

19. Implement `ai_tenant_context` table and learning pipeline
20. Implement episodic memory (conversation summaries, past action outcomes)
21. Implement entity relationship graph for context assembly
22. Implement proactive messaging system

### Phase F: Integrations (Weeks 16-18)

23. Implement MCP client for external integrations
24. Implement MCP server (expose platform as MCP)
25. Build 3 reference MCP integrations (Xero, Google Sheets, Slack)
26. Implement webhook interpretation

### Phase G: Killer Features (Weeks 19-24)

27. Predictive scheduling
28. Autonomous customer communication
29. Compliance monitoring
30. Revenue intelligence
31. Cross-module workflow synthesis

---

## Appendix: Schema Additions Summary

| Table | Purpose | New/Modified |
|-------|---------|-------------|
| `prompt_templates` | AI prompt templates | New (Tier 1) |
| `ai_usage_records` | Token usage tracking | New (Tier 1) |
| `ai_tenant_config` | Per-tenant AI config | New (Tier 1, extended) |
| `ai_review_drafts` | AI-drafted review responses | New (Tier 1) |
| `ai_workflow_suggestions` | AI-suggested workflows | New (Tier 1) |
| `ai_entity_tags` | AI-generated entity tags | New (Tier 1) |
| `agent_sessions` | Chat session state | New (Phase B) |
| `agent_actions` | Agent action audit log | New (Phase C) |
| `agent_approvals` | Pending approval requests | New (Phase C) |
| `ai_tenant_context` | Learned tenant patterns | New (Phase E) |
| `mcp_integrations` | External MCP server connections | New (Phase F) |

## Appendix: New Inngest Events

```typescript
// Agent events
"agent/chat.message":          { tenantId, userId, sessionId, message }
"agent/autonomous.trigger":    { tenantId, goal, triggerEvent, triggerData }
"agent/approval.requested":    { tenantId, userId, executionId, stepId, action, risk }
"agent/approval.response":     { tenantId, userId, executionId, stepId, decision, modifiedParams? }
"agent/proactive.message":     { tenantId, userId, priority, title, body, suggestedActions }
"agent/cancel":                { executionId }

// Workflow intelligence events
"workflow/execution.failed":   { executionId, tenantId, errorMessage, failedNodeId }
"workflow/self-heal.attempted": { executionId, tenantId, diagnosis, action }
```

---

*End of Agent 6 Analysis*
