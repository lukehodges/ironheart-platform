# AI-Native Agentic Platform Design

> Ironheart's transformation from a multi-tenant brokerage SaaS into an AI-native agentic platform. The agent is not a feature — it is the primary intelligence layer through which the system operates.

**Date**: 2026-03-08
**Status**: Design — awaiting section-by-section approval
**Depends on**: AI Module Tier 1 (`docs/plans/2026-03-01-ai-module-tier1-design.md`)
**Methodology**: 10 independent analyst agents produced comprehensive proposals. This design synthesizes the MODE (8-10/10 agreement), MEDIAN (5-7/10), and selected OUTLIERS, incorporating CTO review feedback.

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [Guardrails, Failure Modes & Approval System](#2-guardrails-failure-modes--approval-system)
3. [Chat Interface](#3-chat-interface)
4. [Workflow Intelligence](#4-workflow-intelligence)
5. [Industry Agnosticism](#5-industry-agnosticism)
6. [Integration Strategy](#6-integration-strategy)
7. [Data, Context & Memory](#7-data-context--memory)
8. [Killer Features](#8-killer-features)
9. [Infrastructure Migration: Inngest → Trigger.dev](#9-infrastructure-migration-inngest--triggerdev)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Core Architecture

### 1.1 Design Principles

1. **Agent-in-AI module (Approach B)**: The agent runtime lives inside `src/modules/ai/agent/` as a subdirectory. Single AI surface for users — one router, one manifest. The `AgentToolProvider` interface lives in `src/shared/module-system/` for the workflow engine seam.
2. **No framework abstractions**: Direct Anthropic SDK with `tool_use`. No LangChain, no LlamaIndex. The module manifest IS the tool framework.
3. **Trigger.dev as execution backbone**: Agent sessions, workflow executions, and background tasks deploy to Trigger.dev's elastic infrastructure. Long-running agent reasoning loops don't block the web server.
4. **Two-phase tool selection from day one**: With 60-150+ tools across 21 modules, every agent invocation classifies intent first (cheap model), then loads only relevant tool schemas.
5. **Explainability built in, not bolted on**: Every agent action produces a "Why" trace from the execution log. Trust is the adoption bottleneck.

### 1.2 File Structure

```
src/modules/ai/
  # Tier 1 (already designed — provider, prompts, usage metering)
  providers/
    types.ts                    # AIProvider interface
    anthropic.ts                # Claude client (lazy-init singleton)
  ai.types.ts                  # AIFeature, AIPromptTemplate, AIUsageRecord
  ai.schemas.ts                # Zod schemas for tRPC input validation
  ai.repository.ts             # Prompt templates, usage tracking, conversations, knowledge
  ai.service.ts                # LLM orchestration + agent entry point
  ai.router.ts                 # Tier 1 procedures + chat subscription + agent management
  ai.events.ts                 # Trigger.dev tasks (Tier 1 async + agent sessions)
  ai.manifest.ts               # Module manifest with toolDefinitions

  # Agent Runtime (new — this design)
  agent/
    agent.runtime.ts            # Core ReAct loop as a Trigger.dev task
    agent.planner.ts            # Two-phase: intent classification → tool selection
    agent.executor.ts           # Tool invocation with Zod validation + side-effect tracking
    agent.guardrails.ts         # Three-tier approval + budget + rate limits + circuit breakers
    agent.memory.ts             # Session (Redis) + conversation (PG) + knowledge (pgvector)
    agent.context.ts            # Context window assembly, compression, token budgeting
    agent.streaming.ts          # Trigger.dev Realtime → frontend bridge
    agent.errors.ts             # Graceful degradation: malformed LLM, timeouts, budget exhaustion
    agent.explainer.ts          # "Why" button: execution trace → natural language explanation
    agent.types.ts              # AgentSession, AgentPlan, AgentAction, ToolInvocation, etc.

src/shared/module-system/
  tool-provider.ts              # AgentToolProvider interface (the sub-agent seam)
  tool-registry.ts              # Collects tools from manifests, resolves handlers, RBAC filter
```

### 1.3 The AgentToolProvider Interface (shared/)

This is the seam that allows sub-agents to be introduced later without rearchitecting.

```typescript
// src/shared/module-system/tool-provider.ts

export interface AgentTool {
  name: string                    // 'booking.list', 'customer.create'
  description: string             // For LLM tool selection
  parametersSchema: ZodType        // Resolved Zod schema (not a string reference)
  returnSchema?: ZodType
  handler: (ctx: TenantContext, input: unknown) => Promise<unknown>
  readOnly: boolean
  approvalTier: 'auto' | 'confirm' | 'escalate'
  requiredPermission: string
  reversible: boolean
  compensationHandler?: (ctx: TenantContext, input: unknown) => Promise<void>
  tags: string[]                  // ['read', 'financial', 'customer', 'scheduling']
  costCategory: 'free' | 'low' | 'medium' | 'high'
}

export interface AgentToolProvider {
  /** Returns tools available to this user in this tenant */
  getTools(tenantId: string, userId: string): Promise<AgentTool[]>
}
```

The module registry implements `AgentToolProvider` by scanning manifests. Future sub-agents can also implement `AgentToolProvider`, exposing their capabilities as tools to a parent agent.

### 1.4 Trigger.dev Event Dispatcher

Replaces `inngest.send()` with a typed dispatcher that maintains fan-out semantics:

```typescript
// src/shared/events/dispatcher.ts

import type { IronheartEvents } from './event-catalog'

type EventHandler<T> = { trigger: (data: T) => Promise<void> }
type HandlerMap = {
  [K in keyof IronheartEvents]?: EventHandler<IronheartEvents[K]['data']>[]
}

const registry: HandlerMap = {}

export function onEvent<K extends keyof IronheartEvents>(
  name: K,
  handler: EventHandler<IronheartEvents[K]['data']>
) {
  if (!registry[name]) registry[name] = []
  registry[name]!.push(handler)
}

export async function emitEvent<K extends keyof IronheartEvents>(
  name: K,
  data: IronheartEvents[K]['data']
) {
  const handlers = registry[name] ?? []
  await Promise.all(handlers.map(h => h.trigger(data)))
}
```

The typed event catalog (`IronheartEvents`) stays identical. Call sites change from `inngest.send({ name: "booking/confirmed", data })` to `emitEvent("booking/confirmed", data)`. Module event handlers register via `onEvent()` at startup.

### 1.5 Agent Execution Model

```
User message (chat) OR Workflow trigger (AI_DECISION node) OR Cron (proactive agent)
  │
  ▼
ai.service.processAgentRequest()
  │
  ├─► agent.context.ts: Assemble context window (token-budgeted)
  │     Layer 1: Tenant profile (vertical, brand, tone)             ~500 tokens
  │     Layer 2: User context (role, permissions, preferences)       ~200 tokens
  │     Layer 3: Page/entity context (what they're looking at)       ~1500 tokens
  │     Layer 4: Conversation summary (rolling, last 10 turns)       ~1000 tokens
  │     Layer 5: Retrieved knowledge (pgvector top 3 chunks)         ~2000 tokens
  │     Reserved for tools + response                                ~remaining
  │
  ├─► agent.planner.ts: Two-phase tool selection
  │     Phase 1: Classify intent → select relevant tool categories
  │              (Haiku, compressed catalog ~20 tokens/tool, ~200 token response)
  │     Phase 2: Load full Zod schemas for 5-15 selected tools only
  │
  ├─► agent.runtime.ts: ReAct loop (Trigger.dev task with checkpointing)
  │     Each iteration:
  │       1. LLM call with tools → returns tool_call or text response
  │       2. If tool_call → agent.guardrails.ts classifies approval tier
  │       3. If AUTO → agent.executor.ts invokes tool immediately
  │       4. If CONFIRM → wait.forToken() pauses, frontend shows approval card
  │       5. If ESCALATE → create notification, halt chain, return explanation
  │       6. Append tool result to context, check budget, check turn limit
  │       7. If text response → conversation turn complete
  │     Safety: max 15 tool calls per turn, max 50 turns per session
  │
  ├─► agent.explainer.ts: Log execution trace for "Why" button
  │     Every tool call + reasoning stored in agent_actions table
  │     On-demand: LLM summarizes trace into plain English narrative
  │
  └─► agent.streaming.ts: Trigger.dev Realtime → frontend
        Uses Trigger.dev Realtime API + React hooks
        Stream types: 'status' | 'tool_call' | 'tool_result' |
                      'approval_request' | 'text' | 'done'
```

### 1.6 The ReAct Loop (Trigger.dev Task)

```typescript
// src/modules/ai/agent/agent.runtime.ts (pseudocode)

import { task, wait } from "@trigger.dev/sdk/v3"

export const agentReasoningLoop = task({
  id: "agent-reasoning-loop",
  maxDuration: 300, // 5 minutes max per session turn
  retry: { maxAttempts: 2 },
  run: async (payload: AgentTurnPayload) => {
    const { sessionId, tenantId, userId, message, pageContext } = payload

    // 1. Assemble context
    const context = await assembleContext(tenantId, userId, sessionId, pageContext)

    // 2. Two-phase tool selection
    const relevantTools = await selectTools(message, tenantId, userId)

    // 3. ReAct loop
    let messages = [...context.conversationHistory, { role: 'user', content: message }]
    let iterations = 0
    const MAX_ITERATIONS = 15
    const actionLog: AgentAction[] = []

    while (iterations < MAX_ITERATIONS) {
      // Reason
      const response = await provider.generateWithTools({
        system: buildSystemPrompt(context),
        messages,
        tools: relevantTools.map(toAnthropicTool),
      })

      // If text response — done
      if (response.stopReason === 'end_turn') {
        await persistMessages(sessionId, messages, response.text)
        return { text: response.text, actions: actionLog }
      }

      // Execute tool calls
      for (const toolCall of response.toolCalls) {
        const tool = relevantTools.find(t => t.name === toolCall.name)
        if (!tool) {
          messages.push(toolResultMessage(toolCall.id, { error: 'Unknown tool' }))
          continue
        }

        // Guardrail check
        const tier = classifyApproval(tool, toolCall.input, context.guardrails)

        if (tier === 'escalate') {
          messages.push(toolResultMessage(toolCall.id, {
            error: 'This action requires manual intervention. Please use the platform UI.'
          }))
          continue
        }

        if (tier === 'confirm') {
          // Create token, stream approval request to frontend
          const token = await wait.createToken({ timeout: '30m' })
          streamApprovalRequest(sessionId, tool, toolCall.input, token)

          const approval = await wait.forToken(token.id)
          if (!approval.ok || approval.output?.decision === 'reject') {
            messages.push(toolResultMessage(toolCall.id, { error: 'Action rejected by user' }))
            continue
          }
          // If modified params, use those instead
          if (approval.output?.modifiedParams) {
            toolCall.input = approval.output.modifiedParams
          }
        }

        // Execute
        try {
          const validated = tool.parametersSchema.parse(toolCall.input)
          const result = await tool.handler({ tenantId, userId }, validated)

          actionLog.push({
            toolName: tool.name,
            input: toolCall.input,
            output: result,
            tier,
            timestamp: new Date(),
          })

          messages.push(toolResultMessage(toolCall.id, result))
        } catch (err) {
          messages.push(toolResultMessage(toolCall.id, {
            error: err instanceof Error ? err.message : 'Tool execution failed'
          }))
        }
      }

      iterations++
    }

    return { text: 'Reached maximum iterations. Please refine your request.', actions: actionLog }
  }
})
```

### 1.7 Trigger.dev Events (Agent-Specific)

New Trigger.dev tasks for the agent layer:

```typescript
// Agent session management
"agent-reasoning-loop"          // Core ReAct loop (per user message)
"agent-explain-actions"         // Generate "Why" explanation from execution trace
"agent-extract-memories"        // Post-session memory extraction
"agent-morning-briefing"        // Daily proactive briefing (cron)
"agent-workflow-suggest"        // Weekly workflow suggestion (cron)
"agent-anomaly-detection"       // Daily anomaly scan across tenant data (cron)
```

### 1.8 Database Schema Additions

```sql
-- Conversation persistence
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,                              -- AI-generated from first message
  messages JSONB NOT NULL DEFAULT '[]',    -- Array of {role, content, toolCalls?, toolResults?}
  status TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'archived'
  page_context JSONB,                      -- Last known page context
  token_count INTEGER NOT NULL DEFAULT 0,  -- Running total for budget tracking
  cost_cents INTEGER NOT NULL DEFAULT 0,   -- Running cost
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_tenant_user ON ai_conversations(tenant_id, user_id);
CREATE INDEX idx_ai_conversations_status ON ai_conversations(tenant_id, status);

-- Agent action audit trail (separate from audit_logs for agent-specific queries)
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,
  approval_tier TEXT NOT NULL,             -- 'auto' | 'confirm' | 'escalate'
  approval_decision TEXT,                  -- 'approved' | 'rejected' | 'modified' | null (auto)
  approved_by UUID REFERENCES users(id),
  reasoning TEXT,                          -- LLM's reasoning for this action
  compensation_available BOOLEAN NOT NULL DEFAULT FALSE,
  compensated_at TIMESTAMPTZ,
  duration_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_actions_conversation ON agent_actions(conversation_id);
CREATE INDEX idx_agent_actions_tenant ON agent_actions(tenant_id, created_at DESC);

-- Tenant knowledge base (pgvector)
CREATE TABLE ai_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_type TEXT NOT NULL,               -- 'document' | 'sop' | 'regulation' | 'faq' | 'learned'
  source_id TEXT,                          -- Reference to original document
  title TEXT,
  content TEXT NOT NULL,                   -- Chunk text (500-1000 tokens)
  embedding vector(1536),                  -- pgvector
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_knowledge_tenant ON ai_knowledge_chunks(tenant_id);
CREATE INDEX idx_ai_knowledge_embedding ON ai_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Agent correction memory (learns from rejections)
CREATE TABLE ai_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  tool_name TEXT NOT NULL,
  attempted_parameters JSONB NOT NULL,
  correction_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_corrections_tenant_tool ON ai_corrections(tenant_id, tool_name);
```

---

## 2. Guardrails, Failure Modes & Approval System

### 2.1 Three-Tier Approval Model

Every tool call passes through the guardrail engine before execution. Classification is determined by a combination of static metadata, tenant policy, and dynamic analysis.

| Tier | Criteria | Behavior | Examples |
|------|----------|----------|---------|
| **AUTO** | `readOnly: true` OR explicitly promoted by tenant | Execute immediately, stream result | List bookings, get customer, check availability, analytics queries, search |
| **CONFIRM** | Mutating AND medium blast radius | Show approval card in chat, `wait.forToken()` pause (30m timeout) | Create booking, send notification, update status, reschedule, add note |
| **ESCALATE** | Destructive, financial, bulk (>10 entities), or workflow modification | Create notification for admin, halt chain, return explanation | Delete customer, process refund, cancel all bookings, modify RBAC, bulk operations |

### 2.2 Classification Logic

```typescript
// src/modules/ai/agent/agent.guardrails.ts

function classifyApproval(
  tool: AgentTool,
  input: Record<string, unknown>,
  guardrails: TenantGuardrails,
): 'auto' | 'confirm' | 'escalate' {
  // 1. Check tenant-specific overrides (highest priority)
  const override = guardrails.toolOverrides[tool.name]
  if (override) return override

  // 2. Read-only tools are always auto
  if (tool.readOnly) return 'auto'

  // 3. Check blocked tools
  if (guardrails.blockedTools.includes(tool.name)) return 'escalate'

  // 4. Financial threshold check
  if (tool.tags.includes('financial')) {
    const amount = extractAmount(input)
    if (amount && amount > guardrails.maxAutonomousAmount) return 'escalate'
    return 'confirm' // All financial actions at least confirm
  }

  // 5. Bulk operation check
  if (isBulkOperation(input) && extractBatchSize(input) > guardrails.maxBulkSize) {
    return 'escalate'
  }

  // 6. External communication check
  if (tool.tags.includes('communication') && guardrails.requireApprovalForComms) {
    return 'confirm'
  }

  // 7. Default: use the tool's declared tier
  return tool.approvalTier
}
```

### 2.3 Tenant-Configurable Guardrails

Stored in `ai_tenant_config.guardrails` (JSONB column):

```typescript
interface TenantGuardrails {
  // Per-tool overrides (tool name → tier)
  toolOverrides: Record<string, 'auto' | 'confirm' | 'escalate'>

  // Global limits
  maxAutonomousAmount: number        // GBP, above this → escalate (default: 0 = all financial confirm)
  maxBulkSize: number                // Entities per batch before escalate (default: 10)
  requireApprovalForComms: boolean   // Emails/SMS need confirm? (default: true)
  blockedTools: string[]             // Tools the agent can never use

  // Budget
  maxTokensPerSession: number        // Default: 50,000
  maxToolCallsPerSession: number     // Default: 30
  maxSessionsPerUserPerHour: number  // Default: 20
  monthlyTokenBudget: number         // Tenant-wide monthly cap

  // Escalation
  escalationUserId: string | null    // Who gets notified on escalate (null = tenant admin)
  approvalTimeoutMinutes: number     // Default: 30
}
```

### 2.4 The Trust Ratchet

The system tracks acceptance rates per tool per tenant:

```typescript
// After each approval decision, update running stats
interface ToolTrustScore {
  toolName: string
  tenantId: string
  totalAttempts: number
  approved: number
  rejected: number
  modified: number
  acceptanceRate: number         // approved / totalAttempts
  lastCalculatedAt: Date
}
```

After 50+ decisions with >95% acceptance rate for a specific tool, the system suggests promoting it from CONFIRM to AUTO. This surfaces as a notification to the tenant admin: "Your team has approved 'booking.create' 48 out of 50 times. Would you like to let the agent do this automatically?"

The ratchet only goes up (more autonomy) on explicit opt-in. It automatically ratchets DOWN if rejection rate spikes above 20% over a 7-day window — demoting the tool back to CONFIRM and notifying the admin.

### 2.5 Agent Runtime Failure Modes

This section addresses the gap identified in CTO review: what happens when things go wrong at the agent level (not the workflow level).

| Failure Mode | Detection | Recovery | User Experience |
|---|---|---|---|
| **Malformed LLM response** | Tool call references non-existent tool, or params fail Zod validation | Log the error, inject error message as tool_result, let LLM self-correct. After 3 consecutive malformed responses, halt and return explanation. | "I encountered an issue processing that request. Let me try a different approach." / "I'm having trouble with this. Could you rephrase?" |
| **Tool timeout** | Tool handler exceeds 30s (configurable per tool) | Kill the call, inject timeout error as tool_result, LLM can retry or skip. After 2 timeouts on same tool, exclude tool for remainder of session. | "The [service] is taking longer than expected. Let me try another way." |
| **Approval timeout** | `wait.forToken()` expires after 30m | Log as `approval_decision: 'expired'`, inject expiry as tool_result, LLM generates summary of what it was trying to do and why. | "The approval for [action] expired. You can still do this manually at [link], or ask me again." |
| **Context window overflow** | Token count exceeds model limit during context assembly | Aggressive summarization: compress older conversation turns, drop tool result details, keep only entity IDs + summaries. If still over, start new session with handoff summary. | "This conversation is getting complex. Let me summarize what we've covered so far and continue." |
| **Budget exhaustion (session)** | Running token count exceeds `maxTokensPerSession` | Halt reasoning loop, return partial result + explanation of what remains. Do not attempt further LLM calls. | "I've reached the processing limit for this conversation. Here's what I found so far: [partial]. You can start a new conversation to continue." |
| **Budget exhaustion (monthly)** | Tenant monthly usage exceeds `monthlyTokenBudget` | Reject new agent sessions. Tier 1 features (single-call) can continue if budget allows. | "AI assistant usage has reached this month's limit. Contact your administrator to adjust. You can still use [list Tier 1 features still available]." |
| **Rate limit (per user)** | User exceeds `maxSessionsPerUserPerHour` | Reject new session with cooldown timer. | "You've been very active! Please wait [N minutes] before starting a new conversation." |
| **LLM provider outage** | API returns 5xx or connection timeout | Retry once after 5s. If still failing, return graceful error. Do not retry indefinitely. | "The AI service is temporarily unavailable. Please try again in a few minutes." |
| **Infinite loop detection** | Agent calls same tool with same params 3 times in one session | Break the loop, inject error, force the LLM to try a different approach or respond with what it has. | "I seem to be going in circles. Let me step back and give you what I have so far." |

### 2.6 Compensation / Undo Stack

Every mutating tool that declares `reversible: true` and a `compensationHandler` enables the undo pattern:

```typescript
// When a CONFIRM-tier action executes successfully:
await agentRepository.recordAction({
  conversationId,
  toolName: tool.name,
  toolInput: validatedInput,
  toolOutput: result,
  compensationAvailable: tool.reversible && !!tool.compensationHandler,
})

// When user says "undo that" or "cancel that booking you just made":
// 1. Agent looks up the most recent action with compensation_available = true
// 2. Calls tool.compensationHandler(ctx, originalInput)
// 3. Updates agent_actions.compensated_at
// 4. Responds: "Done. I've reversed [action description]."
```

This is forward-compensation (saga pattern), not database rollback. Not all actions are reversible — `compensationHandler` is optional. The agent tells the user when an action cannot be undone: "Note: this action cannot be reversed automatically."

### 2.7 The "Why" Button (Explainability)

Every agent action is logged to `agent_actions` with the full execution context. The "Why" button triggers a cheap LLM call that summarizes the trace:

```typescript
// src/modules/ai/agent/agent.explainer.ts

export async function explainActions(
  conversationId: string,
  tenantId: string,
): Promise<string> {
  const actions = await agentRepository.getActions(conversationId)
  const conversation = await agentRepository.getConversation(conversationId)

  return aiService.generateText({
    messages: [{
      role: 'user',
      content: `Explain these agent actions in plain English.
        User asked: "${conversation.messages[0]?.content}"
        Actions taken: ${JSON.stringify(actions.map(a => ({
          tool: a.toolName,
          input: a.toolInput,
          output: a.toolOutput,
          approval: a.approvalTier,
        })))}
        Explain WHY each action was chosen, not just WHAT happened.`,
    }],
    model: 'claude-haiku', // Cheap model for explanation
    maxTokens: 500,
  })
}
```

The frontend renders this as a slide-over panel on any entity that was touched by an agent:

> **Why the agent did this:**
> You asked to reschedule John's appointment. The agent searched for John Smith's upcoming bookings and found booking #B-0412 on March 10 at 2pm. It checked Tuesday March 15 availability and found an open slot at 2pm with the same staff member (Sarah). It moved the booking because the time, staff, and service matched your request. A confirmation notification was sent to John automatically because your "Booking Rescheduled" workflow is active.

---

---

## 3. Chat Interface

### 3.1 Architecture Overview

The chat is a persistent slide-over panel accessible from every screen. It streams agent responses in real-time using Trigger.dev's Realtime API with React hooks. The panel persists across navigation — it is not a page, it is an ambient control surface.

```
Browser (React)
  │
  ├─ useRealtimeRun() hook ←── Trigger.dev Realtime API (SSE)
  │    Streams: status, tool_call, tool_result, approval_request, text, done
  │
  ├─ useWaitToken() hook ←── Trigger.dev wait token completion
  │    Renders: approval cards with Approve / Edit / Reject buttons
  │
  └─ tRPC mutation: ai.chat.send({ sessionId?, message, pageContext? })
       │
       └─► Server: triggers agentReasoningLoop Trigger.dev task
            Returns: { runId, sessionId } for Realtime subscription
```

### 3.2 tRPC Endpoint

```typescript
// ai.router.ts — chat procedures

chat: {
  send: tenantProcedure
    .input(z.object({
      sessionId: z.string().optional(),       // null = new session
      message: z.string().min(1).max(10000),
      pageContext: z.object({
        route: z.string(),                    // '/admin/bookings/abc-123'
        entityType: z.string().optional(),    // 'booking'
        entityId: z.string().optional(),      // 'abc-123'
        listFilters: z.record(z.string(), z.unknown()).optional(),
        selectedIds: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get or create conversation
      const session = input.sessionId
        ? await aiRepository.getConversation(input.sessionId, ctx.tenantId)
        : await aiRepository.createConversation(ctx.tenantId, ctx.user.id)

      // 2. Append user message
      await aiRepository.appendMessage(session.id, {
        role: 'user',
        content: input.message,
        pageContext: input.pageContext,
      })

      // 3. Trigger agent reasoning loop on Trigger.dev
      const run = await agentReasoningLoop.trigger({
        sessionId: session.id,
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        message: input.message,
        pageContext: input.pageContext,
      })

      // 4. Return run handle for Realtime subscription
      return { runId: run.id, sessionId: session.id }
    }),

  history: tenantProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return aiRepository.getConversation(input.sessionId, ctx.tenantId)
    }),

  sessions: tenantProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return aiRepository.listConversations(ctx.tenantId, ctx.user.id, input.limit, input.cursor)
    }),

  explain: tenantProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return agentExplainer.explainActions(input.conversationId, ctx.tenantId)
    }),
}
```

### 3.3 Frontend Stream Protocol

The agent runtime publishes structured events via Trigger.dev's run metadata and Realtime API:

```typescript
type AgentStreamEvent =
  | { type: 'status'; message: string }                           // "Searching customers..."
  | { type: 'tool_call'; toolName: string; params: unknown }      // About to call
  | { type: 'tool_result'; toolName: string; result: unknown;
      entityType?: string; entityId?: string }                     // Call completed
  | { type: 'approval_request'; actionId: string;
      toolName: string; params: unknown;
      reasoning: string; tokenId: string }                         // Needs human approval
  | { type: 'text'; content: string }                              // Streamed token
  | { type: 'error'; message: string; recoverable: boolean }      // Agent error
  | { type: 'done'; summary: string; actionsCount: number;
      tokensUsed: number }                                         // Turn complete
```

### 3.4 Page Context Injection

Every page provides context to the chat via a React context provider:

```typescript
// Frontend hook
function useAgentContext() {
  const pathname = usePathname()
  const params = useParams()

  return useMemo(() => {
    // Parse route to extract entity context
    // /admin/bookings/abc-123 → { entityType: 'booking', entityId: 'abc-123' }
    // /admin/customers?status=active → { entityType: 'customer', listFilters: { status: 'active' } }
    return { route: pathname, ...extractEntityContext(pathname, params) }
  }, [pathname, params])
}
```

When the user is on a booking detail page and says "reschedule this to next Tuesday", the agent resolves "this" from `pageContext.entityId`. When they're on a filtered customer list and say "email all of these", the agent knows the active filters.

The agent's system prompt includes: "The user is currently viewing: [entityType] [entityId]. When they say 'this', 'it', or 'these', they are referring to the entity/entities on their current page."

### 3.5 Rich Response Components

Agent responses are not just text. They include structured blocks that the frontend renders as interactive components:

```typescript
type AgentResponseBlock =
  | { type: 'text'; content: string }
  | { type: 'entity_card'; entityType: string; entityId: string;
      title: string; subtitle: string; fields: Record<string, string>;
      link: string }                                                // Clickable card linking to entity
  | { type: 'data_table'; columns: string[];
      rows: unknown[][]; caption?: string }                         // Tabular data
  | { type: 'action_button'; label: string; toolName: string;
      params: unknown; tier: 'auto' | 'confirm' }                  // One-click action
  | { type: 'chart'; chartType: 'bar' | 'line' | 'pie';
      data: unknown; title: string }                                // Inline visualization
  | { type: 'approval_card'; actionId: string; tokenId: string;
      description: string; impact: string;
      actions: ['approve', 'edit', 'reject'] }                     // Approval UI
  | { type: 'why_link'; conversationId: string; label: string }    // "Why did I do this?" link
```

Example agent response rendering:

> I found John Smith's upcoming booking:
>
> **[Entity Card: Booking #B-0412]**
> John Smith — Ecological Survey — March 10, 2pm with Sarah
> [View booking →]
>
> Tuesday March 15 has an open slot at 2pm with Sarah.
>
> **[Approval Card]**
> Move booking #B-0412 from March 10 → March 15 at 2pm?
> A confirmation email will be sent to John automatically.
> [Approve] [Edit] [Reject]

### 3.6 Conversation Memory

**Short-term (per session)**: Full message history stored in `ai_conversations.messages` JSONB. The agent receives the last 10 turns verbatim. Older turns are compressed via a rolling summary: every 10 messages, the agent generates a ~200-token summary, replacing raw history.

**Cross-session continuity**: When a new session starts, the agent receives summaries of the user's 3 most recent sessions (stored as the first system message). This enables "Last time you asked me to set up a workflow for booking confirmations. Would you like me to refine it?"

**Pinned context**: Critical facts identified during conversation (e.g., "the user is working on Deal D-0089") are stored as session metadata. These survive summarization and are always included in the context window.

### 3.7 Conversation Lifecycle

```
New session → Active → Archived (after 24h of inactivity)

Active:   User can send messages, agent responds, approvals pending
Archived: Read-only. User can view history, "Why" explanations, and action log.
          Starting a new message creates a new session with cross-session context.
```

Sessions are soft-archived, never deleted. The `agent_actions` table provides a permanent audit trail regardless of conversation state.

---

## 4. Workflow Intelligence

### 4.1 AI_DECISION Node Type

Add a new node type to the graph workflow engine. This is the single highest-impact addition — it lets workflows make intelligent decisions at branch points using natural language conditions instead of hardcoded field comparisons.

```typescript
// Addition to WorkflowNodeType in workflow.types.ts
| 'AI_DECISION'

interface AIDecisionNodeConfig {
  /** Natural language instruction for the decision */
  prompt: string                    // "Should this booking be auto-confirmed or require manual review?"

  /** Which context fields to include in the LLM call */
  contextFields: string[]           // ['booking', 'customer', 'customer.reviewHistory']

  /** Possible output handles (edges connect to each) */
  outputHandles: Array<{
    id: string                      // 'auto_confirm', 'manual_review', 'reject'
    label: string                   // Human-readable label for the workflow builder
    description: string             // Helps the LLM understand what this handle means
  }>

  /** Fallback handle if LLM call fails entirely */
  fallbackHandle: string            // 'manual_review'

  /** LLM configuration */
  model?: string                    // Override default model (default: haiku for cost)
  maxTokens?: number                // Default: 256
  temperature?: number              // Default: 0.1 (low = deterministic)

  /** Cache identical decisions for this duration (ISO 8601) */
  cacheTTL?: string                 // 'PT1H' = 1 hour. Deduplicates identical contexts.
}
```

Implementation in the graph engine:

```typescript
// In graph.engine.ts, inside the executeNode switch:
case 'AI_DECISION': {
  const cfg = node.config as AIDecisionNodeConfig

  // 1. Resolve context fields from workflow execution context
  const contextData: Record<string, unknown> = {}
  for (const field of cfg.contextFields) {
    contextData[field] = resolveField(field, resolveContext(context))
  }

  // 2. Check cache
  const cacheKey = `ai_decision:${node.id}:${hashObject(contextData)}`
  if (cfg.cacheTTL) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      output = JSON.parse(cached)
      nextHandle = output.selectedHandle
      break
    }
  }

  // 3. Call LLM via shared agent tool provider (not ai module import)
  const decision = await aiService.generateStructured({
    messages: [{
      role: 'user',
      content: `Given this context:\n${JSON.stringify(contextData, null, 2)}\n\n${cfg.prompt}\n\nYou must select exactly one of these options:\n${cfg.outputHandles.map(h => `- "${h.id}": ${h.description}`).join('\n')}`,
    }],
    schema: z.object({
      selectedHandle: z.enum(cfg.outputHandles.map(h => h.id) as [string, ...string[]]),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
    }),
    model: cfg.model ?? 'claude-haiku',
    maxTokens: cfg.maxTokens ?? 256,
    temperature: cfg.temperature ?? 0.1,
  })

  // 4. Validate handle exists, fallback if not
  const validHandle = cfg.outputHandles.find(h => h.id === decision.data.selectedHandle)
  nextHandle = validHandle ? decision.data.selectedHandle : cfg.fallbackHandle
  output = {
    selectedHandle: nextHandle,
    reasoning: decision.data.reasoning,
    confidence: decision.data.confidence,
  }

  // 5. Cache if configured
  if (cfg.cacheTTL) {
    await redis.set(cacheKey, JSON.stringify(output), { ex: parseDuration(cfg.cacheTTL) })
  }

  break
}
```

Example workflow using AI_DECISION:

```
TRIGGER (booking/created)
  → AI_DECISION ("Should this booking be auto-confirmed?
      Consider: customer history, payment status, staff availability,
      and whether the customer has any previous no-shows.")
    → [auto_confirm] UPDATE_BOOKING_STATUS (confirmed) → SEND_EMAIL (confirmation)
    → [manual_review] SEND_NOTIFICATION (admin: "New booking needs review")
    → [reject] UPDATE_BOOKING_STATUS (rejected) → SEND_EMAIL (rejection reason)
```

### 4.2 AI_GENERATE Node Type

Produces text or structured data inline within a workflow:

```typescript
| 'AI_GENERATE'

interface AIGenerateNodeConfig {
  /** Prompt template with {{variable}} substitution */
  prompt: string

  /** Where to store the result in context.variables */
  outputVariable: string

  /** Output type */
  outputType: 'text' | 'structured'

  /** JSON schema for structured output (when outputType = 'structured') */
  outputSchema?: Record<string, unknown>

  /** LLM configuration */
  model?: string
  maxTokens?: number
  temperature?: number
}
```

Use cases:
- Generate a personalized email body mid-workflow: `AI_GENERATE → SEND_EMAIL`
- Summarize form responses before routing: `FORM_SUBMITTED → AI_GENERATE (summary) → AI_DECISION`
- Extract structured data from free-text input: `WEBHOOK → AI_GENERATE (parse payload) → CREATE_TASK`

### 4.3 Self-Healing Workflows

Add a fourth error handling strategy to the graph engine: `'ai_recover'`.

When a node fails with `errorHandling: 'ai_recover'`:

```typescript
// In graph.engine.ts catch block, new case:
case 'ai_recover': {
  const recovery = await aiService.generateStructured({
    messages: [{
      role: 'user',
      content: `A workflow step failed. Diagnose and suggest recovery.
        Node type: ${node.type}
        Node config: ${JSON.stringify(node.config)}
        Error: ${errMsg}
        Context: ${JSON.stringify(resolveContext(context))}
        Available handles: ${getOutgoingHandles(nodeId).join(', ')}

        Options:
        1. "retry_modified" — suggest config changes and retry
        2. "skip_to_handle" — skip this node and route to a specific handle
        3. "escalate" — cannot recover, alert a human`,
    }],
    schema: z.object({
      action: z.enum(['retry_modified', 'skip_to_handle', 'escalate']),
      configPatch: z.record(z.string(), z.unknown()).optional(),
      handle: z.string().optional(),
      diagnosis: z.string(),
    }),
    model: 'claude-haiku',
    maxTokens: 300,
  })

  if (recovery.data.action === 'retry_modified' && recovery.data.configPatch) {
    const modifiedConfig = { ...node.config, ...recovery.data.configPatch }
    // Re-execute with modified config (max 1 retry)
    return this.executeNode(nodeId, { ...context, __aiRetryCount: 1 }, step, visitedNodes)
  }

  if (recovery.data.action === 'skip_to_handle' && recovery.data.handle) {
    nextHandle = recovery.data.handle
    output = { skipped: true, diagnosis: recovery.data.diagnosis }
  }

  if (recovery.data.action === 'escalate') {
    await emitEvent('notification/send.email', {
      to: tenantAdminEmail,
      subject: `Workflow requires attention: ${workflow.name}`,
      html: `<p>Step failed: ${node.type}</p><p>Diagnosis: ${recovery.data.diagnosis}</p>`,
      tenantId,
      trigger: 'workflow.ai_recovery',
    })
    throw new Error(`AI recovery escalated: ${recovery.data.diagnosis}`)
  }
  break
}
```

### 4.4 Natural Language Workflow Builder

The chat agent can generate complete workflow definitions from plain English:

```
User: "When a booking is completed, wait 2 days, then send the customer a review
       request. If they don't submit a review within 5 days, send a reminder SMS."

Agent generates:
{
  nodes: [
    { id: 'trigger', type: 'TRIGGER', config: { event: 'booking/completed' } },
    { id: 'wait', type: 'WAIT_UNTIL', config: { duration: 'P2D' } },
    { id: 'email', type: 'SEND_EMAIL', config: { templateKey: 'review_request', to: '{{customer.email}}' } },
    { id: 'wait_review', type: 'WAIT_FOR_EVENT', config: { event: 'review/submitted', match: 'data.bookingId', timeout: 'P5D' } },
    { id: 'sms', type: 'SEND_SMS', config: { to: '{{customer.phone}}', body: 'We'd love your feedback...' } },
    { id: 'stop', type: 'STOP', config: {} },
  ],
  edges: [
    { source: 'trigger', target: 'wait', sourceHandle: 'output' },
    { source: 'wait', target: 'email', sourceHandle: 'output' },
    { source: 'email', target: 'wait_review', sourceHandle: 'output' },
    { source: 'wait_review', target: 'stop', sourceHandle: 'received' },
    { source: 'wait_review', target: 'sms', sourceHandle: 'timeout' },
    { source: 'sms', target: 'stop', sourceHandle: 'output' },
  ]
}
```

The agent validates the graph via `validateWorkflowGraph()` before presenting it. The user sees the visual graph in the workflow builder and can adjust before activating. This is a CONFIRM-tier action — the agent never auto-deploys workflows.

### 4.5 Proactive Workflow Suggestions

A scheduled Trigger.dev task runs weekly per tenant:

1. Query `auditLogs` for the last 30 days
2. Group actions by `(userId, resource, action)` sequences within 10-minute windows
3. Identify repeated sequences (e.g., "every time a booking is confirmed, this user sends a custom email within 15 minutes")
4. Generate workflow suggestions with confidence scores
5. Store in `ai_workflow_suggestions` table
6. Surface as in-app notifications: "I noticed you manually send a confirmation email after every booking. Want me to automate that?"

---

## 5. Industry Agnosticism

### 5.1 The Vertical Profile

The AI layer is industry-agnostic through data, not code. Every tenant has a `verticalProfile` that maps generic platform concepts to domain-specific language.

Stored in `ai_tenant_config.vertical_profile` (JSONB):

```typescript
interface VerticalProfile {
  /** Vertical identifier */
  verticalSlug: string                  // 'bng-brokerage', 'real-estate', 'insurance', 'waste-mgmt'
  displayName: string                   // 'BNG Credit Brokerage'

  /** Entity terminology — maps platform entities to domain language */
  terminology: {
    booking: string                     // 'Site Assessment', 'Property Viewing', 'Policy Quote'
    customer: string                    // 'Landowner', 'Buyer', 'Policyholder'
    staff: string                       // 'Ecologist', 'Estate Agent', 'Underwriter'
    service: string                     // 'Survey Type', 'Listing Type', 'Coverage Plan'
    deal: string                        // 'Credit Trade', 'Property Sale', 'Insurance Policy'
    invoice: string                     // 'Credit Invoice', 'Commission Statement', 'Premium Notice'
    review: string                      // 'Client Feedback', 'Buyer Review', 'Claim Satisfaction'
    workflow: string                    // 'Process Automation', 'Pipeline Rule', 'Claim Workflow'
  }

  /** Domain knowledge injected into every AI prompt */
  domainContext: string                 // 2-3 paragraphs explaining the business domain (max 4000 chars)

  /** Compliance rules the agent must always respect */
  complianceRules: string[]             // ["All credit trades must have a valid habitat survey", ...]

  /** Few-shot examples for the AI */
  exampleInteractions: Array<{
    userMessage: string
    agentResponse: string
  }>

  /** Regulatory body (if applicable) */
  regulatoryBody?: string               // 'Natural England', 'FCA', 'Environment Agency'
}
```

### 5.2 How the AI Uses the Vertical Profile

Every AI prompt — Tier 1 features, agent chat, AI_DECISION nodes, workflow suggestions — includes:

```
You are an AI assistant for {{tenantName}}, a {{verticalProfile.displayName}}.

Domain context:
{{verticalProfile.domainContext}}

Terminology (use these terms instead of generic platform terms):
- "Booking" → "{{terminology.booking}}"
- "Customer" → "{{terminology.customer}}"
- "Staff" → "{{terminology.staff}}"
[...etc]

Compliance rules you must always respect:
{{complianceRules as numbered list}}

{{exampleInteractions as few-shot examples}}
```

A BNG credit brokerage user says "allocate 4.2 biodiversity units from Greenfield Farm to the Oakwood Development deal" and the agent understands the domain language because it was injected into the prompt. The underlying tool calls are `inventory.allocate` and `deal.update` — generic platform operations.

### 5.3 Pre-Built Vertical Template Packs

Rather than making each tenant configure the vertical profile manually, the platform ships pre-built packs:

```typescript
interface VerticalPack {
  slug: string                          // 'bng-brokerage'
  name: string                          // 'BNG Credit Brokerage'
  verticalProfile: VerticalProfile      // Full profile pre-configured
  suggestedModules: string[]            // Which modules to enable
  promptTemplateOverrides: Record<string, { systemPrompt: string; userPrompt: string }>
  suggestedWorkflows: Array<{
    name: string
    description: string
    triggerEvent: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
  }>
  suggestedForms: Array<{
    name: string
    fields: FormFieldDefinition[]
  }>
}
```

Initial packs to ship:
- **BNG / Nutrient Credit Brokerage** — habitat banks, biodiversity units, Natural England registration
- **Real Estate Brokerage** — property listings, viewings, offers, conveyancing
- **Insurance Brokerage** — policies, claims, premiums, underwriting
- **Waste Management** — collections, waste streams, compliance certificates
- **Carbon Credit Brokerage** — carbon offsets, registry verification, retirement
- **Generic / Custom** — blank profile, tenant configures everything

During tenant onboarding, the platform provisioning flow applies the selected pack. The tenant can customize any field afterward.

### 5.4 Self-Bootstrapping for Unknown Verticals

When a tenant selects "Other" or "Custom" during onboarding, the agent conducts a conversational setup:

```
Agent: "Tell me about your business in a few sentences."
User: "We're a sports equipment rental company. We rent out gear
       for rugby, football, and cricket to schools and clubs."

Agent: [generates provisional vertical profile]
  terminology.booking = "Rental"
  terminology.customer = "Club/School"
  terminology.staff = "Warehouse Staff"
  terminology.service = "Equipment Category"
  domainContext = "Sports equipment rental brokerage connecting equipment
    suppliers with schools and sports clubs..."

Agent: "Here's how I'll set up your platform. Does this look right?
        [shows generated terminology + suggested modules]"
```

One LLM call generates the profile. The tenant reviews and adjusts. Over time, corrections are stored in `ai_corrections` and the profile can be refined.

### 5.5 Tool Description Overrides

Module tool descriptions use generic language by default. Allow per-tenant overrides so the LLM gets domain-appropriate tool descriptions:

```typescript
// In ai_tenant_config.tool_description_overrides (JSONB)
{
  "booking.list": "List all site assessments and ecological surveys with filters",
  "booking.create": "Schedule a new site assessment for a landowner or developer",
  "customer.search": "Search for landowners, developers, or local planning authorities"
}
```

The tool registry merges these: tenant override wins if present, otherwise the manifest default.

---

## 6. Integration Strategy

### 6.1 MCP Server — Expose Ironheart to External AI Agents

Expose the module tool registry as an MCP-compliant server. External AI systems (Claude Desktop, Cursor, custom agents) can discover and call Ironheart tools.

```
src/app/api/mcp/route.ts              -- MCP server endpoint
src/modules/ai/mcp/
  mcp-server.ts                        -- MCP protocol handler (SSE transport)
  mcp-tool-adapter.ts                  -- ModuleToolDefinition → MCP Tool format
  mcp-resource-adapter.ts              -- Entities as MCP resources (optional)
```

Authentication via API key from the developer module's `apiKeys` table. The MCP server:
1. Validates the API key → resolves tenant + permission scopes
2. Discovers available tools via `AgentToolProvider.getTools(tenantId, apiKeyUserId)`
3. Exposes them as MCP tools with Zod-derived JSON schemas
4. Executes tool calls through the same service layer as the internal agent
5. All actions audit-logged with `source: 'mcp'`

This means a tenant can connect their Ironheart to Claude Desktop and say "show me all overdue invoices for this month" — Claude calls Ironheart via MCP, gets the data, and presents it.

### 6.2 MCP Client — Connect External Tools to Ironheart's Agent

The agent can consume external MCP servers, extending its capabilities without custom integrations.

```sql
CREATE TABLE ai_mcp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,                    -- 'Company CRM', 'Xero Accounting', 'Google Drive'
  server_url TEXT NOT NULL,
  transport_type TEXT NOT NULL,          -- 'sse' | 'streamable-http'
  auth_type TEXT NOT NULL,               -- 'bearer' | 'api_key' | 'oauth2' | 'none'
  auth_config JSONB NOT NULL DEFAULT '{}', -- Encrypted credentials
  tool_filter JSONB,                     -- Whitelist of tool names to expose (null = all)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

At agent session start, the tool registry discovers external tools alongside native tools:

```typescript
async function resolveAllTools(tenantId: string, userId: string): Promise<AgentTool[]> {
  // 1. Native tools from module manifests
  const nativeTools = await toolRegistry.getTools(tenantId, userId)

  // 2. External tools from MCP connections
  const mcpConnections = await aiRepository.getActiveMCPConnections(tenantId)
  const externalTools: AgentTool[] = []
  for (const conn of mcpConnections) {
    const mcpTools = await mcpClient.discoverTools(conn)
    externalTools.push(...mcpTools.map(t => adaptMCPTool(t, conn)))
  }

  return [...nativeTools, ...externalTools]
}
```

The agent sees a unified tool set. It does not know or care whether a tool is internal or external. The guardrail engine applies the same approval tiers to MCP tools (default: CONFIRM for all external tool mutations).

### 6.3 A2A (Agent-to-Agent) Protocol

For multi-tenant agent communication — e.g., a broker's agent negotiating with a client's agent. This is forward-looking but the architecture should accommodate it.

A2A sits on top of the existing webhook infrastructure:

```typescript
interface A2AMessage {
  fromTenantId: string
  toEndpoint: string         // Webhook URL of receiving agent
  intent: string             // 'request_availability', 'propose_deal', 'confirm_transaction'
  payload: Record<string, unknown>
  correlationId: string      // For matching request-response pairs
  replyTo: string            // Webhook URL for response
  expiresAt: string          // ISO timestamp
}
```

Implementation deferred to Phase F. The current architecture supports it because:
- The webhook platform (Phase 6) handles inbound/outbound
- The agent can process A2A messages through the same reasoning loop
- `wait.forToken()` can pause for external agent responses

### 6.4 Webhook Intelligence

Extend the developer module's webhook platform with AI-powered capabilities:

**Inbound webhook understanding**: When an external system sends an unstructured webhook, the AI classifies and routes it:

```typescript
// New Trigger.dev task
export const classifyInboundWebhook = task({
  id: "classify-inbound-webhook",
  run: async ({ tenantId, payload, headers, sourceUrl }) => {
    const classification = await aiService.generateStructured({
      messages: [{ role: 'user', content: `Classify this webhook payload and determine what action to take.\nSource: ${sourceUrl}\nPayload: ${JSON.stringify(payload)}` }],
      schema: z.object({
        action: z.enum(['create_booking', 'update_customer', 'create_task', 'ignore', 'unknown']),
        mappedData: z.record(z.string(), z.unknown()),
        confidence: z.number(),
      }),
    })

    if (classification.data.confidence > 0.8 && classification.data.action !== 'unknown') {
      // Route to appropriate module handler
    } else {
      // Log for manual review
    }
  }
})
```

**AI-enriched outbound webhooks**: Optionally include an AI-generated summary with outbound webhook payloads:

```json
{
  "event": "booking/cancelled",
  "data": { "bookingId": "abc-123", "tenantId": "..." },
  "aiSummary": "Customer cancelled because the rescheduled time conflicted with their schedule. This is their second cancellation this month — consider reaching out."
}
```

---

## 7. Data, Context & Memory

### 7.1 Three-Layer Memory Architecture

**Layer 1 — Working Memory (Redis, TTL 1h)**
Current session state: active entity references, in-flight tool calls, pending approvals.
Key: `agent:session:{sessionId}`
Purpose: Fast access for the real-time chat loop.

**Layer 2 — Episodic Memory (PostgreSQL, ai_conversations + agent_actions)**
Complete conversation history and action audit trail. Persists indefinitely.
Purpose: Cross-session continuity, "Why" explanations, trust ratchet data, compliance audit.

**Layer 3 — Semantic Memory (PostgreSQL + pgvector, ai_knowledge_chunks)**
Tenant-specific knowledge: uploaded documents, SOPs, regulatory guides, learned facts.
Purpose: RAG retrieval for domain-specific questions the agent can't answer from platform data.

### 7.2 Context Window Budget

The context window is the most constrained resource. Every agent turn assembles context within a strict token budget:

| Layer | Max Tokens | Content | Cache |
|-------|-----------|---------|-------|
| System prompt | ~500 | Tenant profile, vertical context, compliance rules, tone | Redis, 1h TTL |
| User context | ~200 | Name, role, permissions, recent corrections | Redis, 5m TTL |
| Page context | ~1500 | Current entity data (pre-fetched from pageContext) | Per-request |
| Conversation | ~1000 | Last 10 messages verbatim OR rolling summary of older turns | Per-session |
| Knowledge RAG | ~2000 | Top 3 chunks from pgvector similarity search | Per-request |
| Tool schemas | ~2500 | Full Zod schemas for 5-15 selected tools (after two-phase selection) | Redis, 1h TTL |
| Response buffer | ~remaining | Reserved for LLM generation | — |

Total: fits within Claude Haiku's 200K context or Sonnet's 200K with room to spare. The budget ensures we never exceed limits even with large tool schemas.

### 7.3 Two-Phase Tool Selection (Detail)

With 21 modules and 60-150+ tools, including all tool schemas in every prompt is wasteful and degrades reasoning quality.

**Phase 1 — Intent Classification (Haiku, ~200 input tokens, ~50 output tokens)**

```typescript
// agent.planner.ts
async function selectRelevantTools(
  message: string,
  allTools: AgentTool[],
): Promise<AgentTool[]> {
  // Build compressed catalog: just name + one-line description
  const catalog = allTools.map(t => `${t.name}: ${t.description}`).join('\n')

  const selection = await aiService.generateStructured({
    messages: [{ role: 'user', content: `Select tools relevant to: "${message}"\n\n${catalog}` }],
    schema: z.object({ tools: z.array(z.string()) }),
    model: 'claude-haiku',
    maxTokens: 128,
  })

  return allTools.filter(t => selection.data.tools.includes(t.name))
}
```

**Phase 2 — Full Schema Loading**

Only the 5-15 selected tools get their full Zod schemas serialized into the prompt. This keeps the tool section under ~2500 tokens instead of 10,000+.

Cost: ~$0.001 per classification call (Haiku). Saves ~$0.01-0.03 per agent turn by reducing main prompt size. Pays for itself on first call.

### 7.4 Tenant Knowledge Base (RAG)

Tenants can upload documents (PDFs, markdown, text) that the agent references:

1. Upload via tRPC procedure → stored in object storage
2. Chunking: split into 500-1000 token chunks with overlap
3. Embedding: generate embeddings via Anthropic or dedicated embedding model
4. Storage: `ai_knowledge_chunks` table with pgvector
5. Retrieval: cosine similarity search, top 3 chunks per query

```typescript
// In agent.context.ts
async function retrieveKnowledge(tenantId: string, query: string): Promise<string[]> {
  const embedding = await aiService.generateEmbedding(query)
  const chunks = await aiRepository.searchKnowledge(tenantId, embedding, { limit: 3 })
  return chunks.map(c => c.content)
}
```

This is how the agent knows about a BNG broker's habitat management plan template, or an insurance broker's claims procedure, without the information being in the platform's structured data.

### 7.5 Learning from Corrections

When a user rejects an agent action and provides a reason, it's stored in `ai_corrections`:

```typescript
// After rejection
await aiRepository.createCorrection({
  tenantId,
  userId,
  conversationId,
  toolName: 'booking.create',
  attemptedParameters: { customerId: 'abc', serviceId: 'xyz', date: '2026-03-15' },
  correctionReason: 'We never book assessments on Fridays — our ecologists do fieldwork on Fridays',
})
```

Recent corrections (last 10 per tenant) are included in the agent's system prompt:

```
Previous corrections from this organization:
1. "We never book assessments on Fridays — our ecologists do fieldwork on Fridays"
2. "Always CC the project manager when emailing developers"
3. "Invoices for government clients need a PO number"
```

This creates a lightweight learning loop without fine-tuning. The agent avoids repeating the same mistakes.

---

## 8. Killer Features

### 8.1 "Ghost Operator" — After-Hours Autonomous Processing

When the office is closed, the agent handles incoming events autonomously within pre-configured guardrails:

- New booking request at 11pm → check availability, confirm if within AUTO rules, send confirmation email
- Review submitted at 3am → draft a response, flag for morning review if rating < 3
- Form response received → validate, attach to booking, trigger next workflow step
- Invoice payment received → update status, send receipt, move deal to next stage

Implemented as an always-on Trigger.dev task that processes events with the tenant's guardrail policy. Actions that would normally be CONFIRM tier during business hours follow a separate `afterHoursPolicy` (configurable — some tenants want full auto, others want queue-for-morning).

Produces a **Morning Briefing** delivered at the tenant's configured time:

> Good morning, Luke.
>
> **Overnight activity (11pm - 7am):**
> - Confirmed 3 booking requests (all within auto-confirm rules)
> - Drafted responses to 2 reviews (1 positive → auto-published, 1 mixed → needs your review)
> - Processed 1 invoice payment from Greenfield Estates ($12,400)
>
> **Needs your attention:**
> - [Review draft response to 3-star review from Thames Valley Council]
> - [Deal D-0089 has been in LEGAL_IN_PROGRESS for 31 days — average is 14]
> - [Customer Sarah Johnson cancelled for the 3rd time this month]
>
> **Today's schedule:** 4 site assessments, 2 desk reviews

### 8.2 "Paste-to-Pipeline" — Unstructured Input to Full Pipeline

A broker receives an email: "I have 150 acres of farmland near Bristol that I want to register for BNG. The site currently has low habitat value and I'm hoping to create wildflower meadows."

They paste it into the agent chat. The agent:

1. Extracts structured data (contact name, location, acreage, habitat type, intent)
2. Creates or updates the contact record
3. Creates a deal in LEAD stage
4. Estimates potential biodiversity units based on habitat type + area (using knowledge base)
5. Searches for matching demand-side deals within the geographic area
6. Drafts a response email to the landowner
7. Creates a task to schedule a site assessment

Seven actions from a single paste. Presented as an approval card with all actions listed. One click to approve all. This is the feature that makes brokers who live in email fall in love with the platform.

### 8.3 "Compliance Copilot" — Regulatory Intelligence

For regulated verticals, the agent monitors every deal stage transition against compliance requirements:

- Before moving a deal to ALLOCATED: check for approved habitat management plan, signed 30-year monitoring agreement, Natural England registration
- If any prerequisite missing: block the transition, explain exactly what's needed
- Generate compliance documentation by pulling data from deals, assessments, and forms into templates
- When compliance rules change (updated in the vertical profile): proactively scan active deals for impact

Implemented via `AI_DECISION` nodes in deal pipeline workflows + knowledge base seeded with regulatory requirements.

### 8.4 "Voice of the Pipeline" — Weekly Intelligence Report

A weekly Trigger.dev cron generates a narrative business report:

> **This week:**
> 3 deals moved to COMPLETED (total value: $127,400, commission earned: $25,480).
> 2 deals are at risk — Deal D-0089 has been in LEGAL_IN_PROGRESS for 31 days (average is 14), and Deal D-0102 has a compliance deadline in 3 days.
> Your top-performing broker (Sarah) closed 2 deals this week.
> 4 new supply-side leads came in. I've matched 2 of them to existing demand-side deals.
>
> **Compared to last week:** Revenue +15%, new leads -8%, deal velocity +2 days faster.

Uses the existing analytics metrics engine + AI summarization. Not a dashboard — a narrative that surfaces what matters.

### 8.5 "Scenario Simulator" — What-If Analysis

Natural language what-if queries answered with data:

- "What would happen if I increase my booking buffer from 15 to 30 minutes?" → Agent calculates lost capacity, estimates revenue impact
- "If I add a new staff member, how much additional revenue could we handle?" → Agent models capacity increase from historical booking density
- "What if I raise prices 10%?" → Agent estimates demand elasticity from historical no-show rates and booking frequency

Uses analytics data + LLM reasoning. The simulation is deterministic math; the AI makes it accessible and interpretable.

---

## 9. Infrastructure Migration: Inngest → Trigger.dev

### 9.1 Migration Strategy

**Wave 1 (concurrent with AI build):** All new agent/AI tasks built in Trigger.dev from day one. Existing Inngest functions continue running. Both systems coexist — the Next.js app talks to both.

**Wave 2 (background, module by module):** Migrate existing Inngest functions to Trigger.dev tasks. Each module's `.events.ts` is rewritten. The typed event catalog stays. The event dispatcher replaces `inngest.send()`.

### 9.2 Pattern Mapping

| Inngest Pattern | Trigger.dev Equivalent |
|---|---|
| `inngest.createFunction({ event: 'X' }, handler)` | `task({ id: 'X', run: handler })` + register in event dispatcher |
| `inngest.send({ name: 'X', data })` | `emitEvent('X', data)` → dispatcher triggers registered tasks |
| `step.run('name', fn)` | Code runs directly (checkpointed automatically) |
| `step.waitForEvent('X', { match, timeout })` | `wait.forToken(tokenId, { timeout })` + dispatcher completes token on matching event |
| `step.sleep('1h')` | `wait.for({ hours: 1 })` |
| `{ cron: '0 7 * * *' }` | Trigger.dev scheduled task with cron expression |
| Fan-out (multiple functions on same event) | Event dispatcher with handler registry |

### 9.3 Event Correlation Pattern

Inngest's `step.waitForEvent` with match expressions is the hardest pattern to replicate. The solution:

```typescript
// When a workflow needs to wait for a matching business event:

// 1. Create a token with a deterministic ID based on the correlation
const correlationKey = `${workflowId}:${bookingId}:review/submitted`
const token = await wait.createToken({ id: correlationKey, timeout: '7d' })

// 2. In the event dispatcher, when review/submitted fires:
onEvent('review/submitted', {
  trigger: async (data) => {
    // Check if any tokens are waiting for this correlation
    const correlationKey = `${data.workflowId}:${data.bookingId}:review/submitted`
    await wait.completeToken(correlationKey, data)
    // Also trigger any other handlers for this event
    await reviewHandler.trigger(data)
  }
})
```

This preserves the event correlation semantics using Trigger.dev's token system.

### 9.4 Files to Migrate (per module)

Each module migration touches:
1. `{module}.events.ts` — rewrite Inngest functions as Trigger.dev tasks
2. `{module}.service.ts` — replace `inngest.send()` calls with `emitEvent()`
3. Module tests that mock Inngest

The `src/shared/inngest.ts` file is replaced by:
- `src/shared/events/event-catalog.ts` — typed event definitions (same types, no Inngest import)
- `src/shared/events/dispatcher.ts` — event fan-out dispatcher
- `src/shared/events/trigger-client.ts` — Trigger.dev client initialization

### 9.5 Migration Order

1. **ai module** — new, built in Trigger.dev from scratch
2. **workflow module** — critical for AI_DECISION nodes, migrate early
3. **notification module** — agent sends notifications frequently
4. **booking module** — agent creates/modifies bookings
5. **remaining modules** — migrate in dependency order

---

## 10. Implementation Phases

### Phase A: AI Foundation + Agent Core (4-5 weeks)

**Tier 1 implementation** (already designed):
- AI module skeleton (types, schemas, repository, service, router, events, manifest)
- Provider abstraction + Anthropic client
- Prompt template system + default templates
- Usage metering + rate limiting

**Tool infrastructure**:
- `AgentToolProvider` interface in `shared/module-system/`
- `tool-registry.ts` with manifest scanning + RBAC filtering
- `ModuleToolDefinition` declarations on all 21 module manifests (read-only tools first)
- Two-phase tool selection (intent classification → schema loading)

**Agent runtime (read-only)**:
- `agent.runtime.ts` — ReAct loop as Trigger.dev task
- `agent.context.ts` — context window assembly with token budgeting
- `agent.planner.ts` — two-phase tool selection
- `agent.executor.ts` — tool invocation with Zod validation
- `agent.streaming.ts` — Trigger.dev Realtime bridge
- `ai_conversations` table + basic persistence

**Chat interface**:
- tRPC chat endpoint (send message → trigger task → return runId)
- Frontend: chat panel with Trigger.dev React hooks for streaming
- Page context injection via `useAgentContext()`

**Deliverable**: Users can chat with the agent and it can read data across all modules. No mutations yet.

### Phase B: Mutations, Approvals & Trust (2-3 weeks)

**Guardrails**:
- `agent.guardrails.ts` — three-tier classification with tenant overrides
- `TenantGuardrails` config on `ai_tenant_config`
- Approval flow via `wait.forToken()` + `useWaitToken()` React hook
- Approval cards in chat UI

**Mutation tools**:
- Add mutating `ModuleToolDefinition` entries (create, update, cancel) to key manifests
- Side-effect tracking in `agent_actions` table
- Compensation/undo stack for reversible actions

**Explainability**:
- `agent.explainer.ts` — "Why" button with trace summarization
- `agent.errors.ts` — all 9 failure modes with graceful degradation
- Audit log integration (agent actions tagged with `source: 'agent'`)

**Trust ratchet**:
- Track acceptance rates per tool per tenant
- Auto-suggest promotions at >95% acceptance over 50+ decisions
- Auto-demote on >20% rejection spike

**Deliverable**: The agent can take actions with user approval. Every action is explainable and auditable.

### Phase C: Workflow Intelligence (2-3 weeks)

**New node types**:
- `AI_DECISION` node in graph engine
- `AI_GENERATE` node in graph engine
- `ai_recover` error handling strategy

**Workflow generation**:
- Natural language → workflow graph (nodes + edges JSONB)
- Validation via `validateWorkflowGraph()` before presenting to user
- Integration with visual workflow builder for review

**Proactive suggestions**:
- Weekly audit log pattern detection (Trigger.dev scheduled task)
- `ai_workflow_suggestions` table + in-app notification

**Deliverable**: Workflows can use AI decision points. Users can describe workflows in English. Failing workflows self-heal.

### Phase D: Memory, Knowledge & Vertical Intelligence (2-3 weeks)

**Memory system**:
- `agent.memory.ts` — three-layer architecture (Redis / PG / pgvector)
- Rolling conversation summarization
- Cross-session context (summaries of recent sessions)
- Correction memory (learn from rejections)

**Knowledge base**:
- `ai_knowledge_chunks` table with pgvector
- Document upload → chunk → embed → store pipeline
- RAG retrieval in context assembly

**Vertical profiles**:
- `VerticalProfile` on `ai_tenant_config`
- 6 pre-built vertical template packs
- Self-bootstrapping for custom verticals
- Tool description overrides per tenant

**Deliverable**: The agent remembers context, learns from corrections, references tenant documents, and speaks the tenant's industry language.

### Phase E: Integrations (2-3 weeks)

**MCP server**:
- `/api/mcp` endpoint exposing module tools via MCP protocol
- API key authentication from developer module
- RBAC scoping per API key

**MCP client**:
- `ai_mcp_connections` table + admin UI
- External tool discovery + integration into agent tool set
- Guardrails apply to external tools (default: CONFIRM for mutations)

**Event infrastructure migration**:
- Event dispatcher replacing `inngest.send()`
- Begin Wave 2 migration (workflow, notification, booking modules)

**Deliverable**: Ironheart is both an MCP server and client. External AI agents can interact with the platform.

### Phase F: Killer Features (ongoing)

Priority order:
1. **Morning Briefing** — daily proactive intelligence (high adoption driver)
2. **Ghost Operator** — after-hours autonomous processing
3. **Paste-to-Pipeline** — unstructured input to pipeline actions
4. **Compliance Copilot** — regulatory monitoring for regulated verticals
5. **Voice of the Pipeline** — weekly narrative report
6. **Scenario Simulator** — what-if analysis
7. **A2A protocol** — agent-to-agent communication (when demand warrants)

### What NOT to Build

- **No LangChain/LlamaIndex** — direct Anthropic SDK. The manifest system IS the tool framework.
- **No fine-tuning per tenant** — prompt engineering + vertical profiles + corrections is sufficient.
- **No separate vector database** — pgvector in existing PostgreSQL.
- **No multi-agent orchestration at launch** — one agent with many tools. The `AgentToolProvider` seam is ready for sub-agents later.
- **No voice interface** — B2B platform, not a consumer app. Add only if demand proves it.
- **No custom LLM orchestration framework** — Trigger.dev provides the durability. Claude provides the reasoning. That's enough.

---

## Appendix A: Cost Estimates

| Operation | Model | Est. Tokens | Est. Cost |
|---|---|---|---|
| Two-phase tool selection | Haiku | ~300 | $0.001 |
| Single agent turn (1 tool call) | Sonnet | ~4,000 | $0.02 |
| Complex agent session (10 tool calls) | Sonnet | ~30,000 | $0.15 |
| AI_DECISION workflow node | Haiku | ~500 | $0.002 |
| AI_GENERATE workflow node | Sonnet | ~2,000 | $0.01 |
| "Why" explanation | Haiku | ~800 | $0.003 |
| Morning briefing generation | Sonnet | ~5,000 | $0.03 |
| Knowledge base embedding (per chunk) | Embedding model | ~500 | $0.0001 |

**Estimated monthly cost per active tenant** (20 users, moderate usage):
- ~500 agent sessions × $0.05 avg = $25
- ~200 workflow AI_DECISION calls × $0.002 = $0.40
- ~30 briefings × $0.03 = $0.90
- **Total: ~$26/month in AI costs per tenant**

This is well within the margin for a SaaS platform charging $200-500/month per tenant.

---

## Appendix B: New Database Tables Summary

| Table | Purpose | Key Indexes |
|---|---|---|
| `ai_conversations` | Chat session persistence | tenant_id+user_id, tenant_id+status |
| `agent_actions` | Agent action audit trail | conversation_id, tenant_id+created_at |
| `ai_knowledge_chunks` | Tenant knowledge base (RAG) | tenant_id, embedding (ivfflat) |
| `ai_corrections` | Learning from rejections | tenant_id+tool_name |
| `ai_mcp_connections` | External MCP server configs | tenant_id |
| `ai_workflow_suggestions` | Proactive workflow suggestions | tenant_id+status |
