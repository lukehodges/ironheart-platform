# Inngest AI Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the AI chat agent loop into a durable Inngest function with `step.ai.wrap()` observability, `step.waitForEvent()` approvals, and Redis list polling for SSE streaming.

**Architecture:** The synchronous agent loop in `ai.service.ts` gets refactored into reusable functions. A new Inngest function orchestrates the loop with durable steps. The SSE route handler becomes a thin dispatcher that polls a Redis list for stream events. Approval flow moves from Redis key polling to Inngest's durable event-based waiting.

**Tech Stack:** Inngest SDK v3 (`step.run`, `step.ai.wrap`, `step.waitForEvent`), Anthropic SDK, Upstash Redis (list operations), Next.js route handlers, tRPC

**Spec:** `docs/superpowers/specs/2026-03-20-inngest-ai-adoption-design.md`

---

### Task 1: Add New Event Types to Inngest

**Files:**
- Modify: `src/shared/inngest.ts:210-255`

- [ ] **Step 1: Add `ai/chat.requested` and `ai/approval.resolved` event types**

In `src/shared/inngest.ts`, add inside the `IronheartEvents` type after the existing `ai/ghost-operator.completed` entry (around line 227):

```typescript
"ai/chat.requested": {
  data: {
    sessionKey: string
    tenantId: string
    userId: string
    workosUserId: string
    userPermissions: string[]
    conversationId?: string
    message: string
    pageContext?: {
      route: string
      entityType?: string
      entityId?: string
    }
  }
};
"ai/approval.resolved": {
  data: {
    actionId: string
    sessionKey: string
    approved: boolean
  }
};
```

- [ ] **Step 2: Run tsc to verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/inngest.ts
git commit -m "feat(ai): add ai/chat.requested and ai/approval.resolved event types"
```

---

### Task 2: Add `sessionKey` to Approval Schema

**Files:**
- Modify: `src/modules/ai/ai.schemas.ts:30-33`

- [ ] **Step 1: Update `resolveApprovalSchema`**

In `src/modules/ai/ai.schemas.ts`, change:

```typescript
export const resolveApprovalSchema = z.object({
  actionId: z.string(),
  approved: z.boolean(),
})
```

To:

```typescript
export const resolveApprovalSchema = z.object({
  actionId: z.string(),
  sessionKey: z.string(),
  approved: z.boolean(),
})
```

- [ ] **Step 2: Update `resolveApproval` mutation in `ai.router.ts` to pass `sessionKey`**

This must happen in the same task to avoid intermediate tsc errors. Change the `resolveApproval` mutation in `src/modules/ai/ai.router.ts`:

```typescript
resolveApproval: moduleProcedure
  .input(resolveApprovalSchema)
  .mutation(async ({ input }) => {
    await resolveApprovalFromUI(input.actionId, input.sessionKey, input.approved)
    return { success: true }
  }),
```

- [ ] **Step 3: Run tsc to verify types**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/ai.schemas.ts src/modules/ai/ai.router.ts
git commit -m "feat(ai): add sessionKey to resolveApprovalSchema and router"
```

---

### Task 3: Refactor `ai.service.ts` — Extract Shared Helpers

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

This task extracts reusable functions from `sendMessageStreaming` so the Inngest function can share them. The existing `sendMessageStreaming` and `sendMessage` continue to work unchanged.

- [ ] **Step 1: Make `buildTrpcCaller` accept optional `req`**

Change the signature at line 80 from:

```typescript
async function buildTrpcCaller(ctx: AgentContext, req: Request) {
```

To:

```typescript
async function buildTrpcCaller(ctx: AgentContext, req: Request | null) {
```

The `req` is passed through to the tRPC context for IP rate limiting. When `null`, the tRPC middleware will skip IP-based rate limiting (already enforced at route handler level).

Also update the `createCaller` call to pass `req` as-is (it already handles null):

```typescript
return createCaller({
  db,
  session: { user: { id: ctx.workosUserId } } as any,
  tenantId: ctx.tenantId,
  tenantSlug: "",
  user: null,
  requestId: crypto.randomUUID(),
  req: req as any,
})
```

- [ ] **Step 2: Extract `setupAgentContext` function**

Add this new exported function above `aiService`:

```typescript
/**
 * Shared setup for both the direct SSE path and the Inngest durable path.
 * Returns everything needed to run the agent loop.
 */
export async function setupAgentContext(params: {
  tenantId: string
  userId: string
  workosUserId: string
  userPermissions: string[]
  conversationId?: string
  message: string
  pageContext?: PageContext
  req: Request | null
}) {
  // Get or create conversation
  let conversation = params.conversationId
    ? await aiRepository.getConversation(params.tenantId, params.conversationId)
    : null

  if (!conversation) {
    conversation = await aiRepository.createConversation(params.tenantId, params.userId)
  }

  if (conversation.tokenCount >= TOKEN_BUDGET) {
    throw new BadRequestError("This conversation has exceeded the token budget. Please start a new conversation.")
  }

  // Save user message
  await aiRepository.addMessage(conversation.id, {
    role: "user",
    content: params.message,
    pageContext: params.pageContext,
  })

  // Load effective history
  const { summary: conversationSummary, recentMessages } = await getEffectiveHistory(conversation.id)
  const anthropicMessages = rebuildAnthropicMessages(recentMessages)

  // Build context + caller
  const ctx: AgentContext = {
    tenantId: params.tenantId,
    userId: params.userId,
    workosUserId: params.workosUserId,
    userPermissions: params.userPermissions,
    pageContext: params.pageContext,
  }
  const trpcCaller = await buildTrpcCaller(ctx, params.req)
  const approvedProcedures = new Set<string>()
  const guardedCaller = await createGuardedCaller(trpcCaller, {
    tenantId: params.tenantId,
    userId: params.userId,
    conversationId: conversation.id,
    approvedProcedures,
  })

  // Load external tools
  let externalTools: ExternalToolEntry[] = []
  try {
    externalTools = await getExternalToolsForTenant(params.tenantId)
  } catch (err) {
    log.warn({ tenantId: params.tenantId, err }, "Failed to load external tools")
  }

  // Build system prompt
  const systemPrompt = await assembleSystemPrompt({
    tenantId: params.tenantId,
    pageContext: params.pageContext,
    userMessage: params.message,
    conversationSummary,
  })

  return {
    conversation,
    anthropicMessages,
    ctx,
    guardedCaller,
    approvedProcedures,
    externalTools,
    systemPrompt,
    history: recentMessages,
  }
}
```

- [ ] **Step 3: Extract `finalizeConversation` function**

Add this new exported function:

```typescript
/**
 * Shared finalization for both direct and durable paths.
 */
export async function finalizeConversation(params: {
  conversationId: string
  content: string
  allToolCalls: ToolCallRecord[]
  allToolResults: ToolResultRecord[]
  totalInputTokens: number
  totalOutputTokens: number
  conversationTokenCount: number
  conversationCostCents: number
  historyLength: number
  message: string
  pageContext?: PageContext
}) {
  const tokenUsage: TokenUsage = {
    inputTokens: params.totalInputTokens,
    outputTokens: params.totalOutputTokens,
    model: DEFAULT_MODEL,
  }

  await aiRepository.addMessage(params.conversationId, {
    role: "assistant",
    content: params.content,
    toolCalls: params.allToolCalls.length > 0 ? params.allToolCalls : undefined,
    toolResults: params.allToolResults.length > 0 ? params.allToolResults : undefined,
    tokenUsage,
  })

  const newTokenCount = params.conversationTokenCount + params.totalInputTokens + params.totalOutputTokens
  const updates: Record<string, unknown> = {
    tokenCount: newTokenCount,
    costCents: params.conversationCostCents + estimateCostCents(params.totalInputTokens, params.totalOutputTokens),
  }

  if (params.historyLength <= 2) {
    updates.title = params.message.slice(0, 100)
  }

  await aiRepository.updateConversation(params.conversationId, updates)

  // Fire-and-forget summarization
  maybeSummarize(params.conversationId).catch((err) =>
    log.warn({ err, conversationId: params.conversationId }, "Summarization failed")
  )

  // Update hot memory
  hotMemory.setSessionContext(params.conversationId, {
    recentToolCalls: params.allToolCalls.slice(-5).map((tc) => ({ name: tc.name, result: null })),
    currentIntent: null,
    pageHistory: params.pageContext?.route ? [params.pageContext.route] : [],
  }).catch(() => {})

  return tokenUsage
}
```

- [ ] **Step 4: Export `handleToolCall`, `getClient`, constants, and `rebuildAnthropicMessages`**

Add `export` to these existing functions/constants so the Inngest function can use them:

```typescript
export const MAX_TOOL_ITERATIONS = 5
export const DEFAULT_MODEL = "claude-sonnet-4-20250514"
export const MAX_TOKENS = 4096

export function getClient(): Anthropic { ... }
export async function handleToolCall(...) { ... }
export function rebuildAnthropicMessages(...) { ... }
export function estimateCostCents(...) { ... }
```

- [ ] **Step 5: Add `@deprecated` JSDoc to `sendMessageStreaming`**

Add above the method:

```typescript
/**
 * @deprecated Use the Inngest-based durable agent loop (ai/chat.requested event) instead.
 * This direct SSE path is kept as a fallback.
 */
```

- [ ] **Step 6: Run existing tests to verify no regressions**

Run: `npx vitest run src/modules/ai/__tests__/ --reporter=verbose`
Expected: All existing tests pass

- [ ] **Step 7: Commit**

```bash
git add src/modules/ai/ai.service.ts
git commit -m "refactor(ai): extract setupAgentContext, finalizeConversation, export shared helpers"
```

---

### Task 4: Update Approval Module

**Files:**
- Modify: `src/modules/ai/ai.approval.ts`

- [ ] **Step 1: Write failing test for new `resolveApprovalFromUI` behavior**

In `src/modules/ai/__tests__/ai-phase-b.test.ts`, add a test:

```typescript
it("resolveApprovalFromUI fires inngest event instead of setting Redis key", async () => {
  const { resolveApprovalFromUI } = await import("../ai.approval")

  await resolveApprovalFromUI("action-123", "session-abc", true)

  expect(mockInngestSend).toHaveBeenCalledWith({
    name: "ai/approval.resolved",
    data: {
      actionId: "action-123",
      sessionKey: "session-abc",
      approved: true,
    },
  })
})
```

Mock `inngest.send` at the top of the test file if not already mocked.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/ai/__tests__/ai-phase-b.test.ts -t "resolveApprovalFromUI fires inngest"`
Expected: FAIL

- [ ] **Step 3: Update `resolveApprovalFromUI` to fire Inngest event**

Update `resolveApprovalFromUI` to accept `sessionKey` and fire an Inngest event instead of setting a Redis key. **Keep `waitForApproval` in the file** — it's still used by the deprecated `sendMessageStreaming` path in `ai.service.ts`:

```typescript
// src/modules/ai/ai.approval.ts

import { redis } from "@/shared/redis"
import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.approval" })

/**
 * Resolve an approval from the chat UI (called by the router).
 * Fires an Inngest event that the durable agent loop picks up via step.waitForEvent().
 */
export async function resolveApprovalFromUI(
  actionId: string,
  sessionKey: string,
  approved: boolean
): Promise<void> {
  // Fire Inngest event for the durable agent loop
  await inngest.send({
    name: "ai/approval.resolved",
    data: { actionId, sessionKey, approved },
  })
  // Also set Redis key for the deprecated direct SSE path (waitForApproval)
  await redis.set(`ai:approval:${actionId}`, JSON.stringify({ approved }), { ex: 300 })
  log.info({ actionId, sessionKey, approved }, "Approval resolved — Inngest event fired + Redis key set")
}

/**
 * @deprecated Used by the legacy sendMessageStreaming direct SSE path.
 * The durable Inngest path uses step.waitForEvent() instead.
 */
export async function waitForApproval(actionId: string): Promise<{ approved: boolean }> {
  const maxWaitMs = 300_000
  const pollIntervalMs = 1_000
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const raw = await redis.get(`ai:approval:${actionId}`)
    if (raw) {
      await redis.del(`ai:approval:${actionId}`)
      return JSON.parse(raw as string)
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs))
  }

  return { approved: false }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/ai/__tests__/ai-phase-b.test.ts -t "resolveApprovalFromUI fires inngest"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/ai/ai.approval.ts src/modules/ai/__tests__/ai-phase-b.test.ts
git commit -m "feat(ai): switch approval resolution from Redis key to Inngest event"
```

---

### Task 5: Build the Durable Agent Inngest Function

**Files:**
- Modify: `src/modules/ai/ai.events.ts`

This is the core task — the new `chatAgent` Inngest function.

- [ ] **Step 1: Write test for the chatAgent function**

Create test in `src/modules/ai/__tests__/ai-inngest-durable.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock inngest
const mockStepRun = vi.fn()
const mockStepAiWrap = vi.fn()
const mockStepWaitForEvent = vi.fn()
const mockRedisRpush = vi.fn()
const mockRedisExpire = vi.fn()

vi.mock("@/shared/inngest", () => ({
  inngest: {
    createFunction: vi.fn((config, trigger, handler) => {
      // Store handler for testing
      ;(globalThis as any).__chatAgentHandler = handler
      return { id: config.id }
    }),
    send: vi.fn(),
  },
}))

vi.mock("@/shared/redis", () => ({
  redis: {
    rpush: (...args: unknown[]) => mockRedisRpush(...args),
    expire: (...args: unknown[]) => mockRedisExpire(...args),
  },
}))

vi.mock("../ai.service", () => ({
  setupAgentContext: vi.fn().mockResolvedValue({
    conversation: { id: "conv-1", tokenCount: 0, costCents: 0 },
    anthropicMessages: [{ role: "user", content: "hello" }],
    ctx: { tenantId: "t1", userId: "u1", workosUserId: "wos1", userPermissions: [] },
    guardedCaller: {},
    approvedProcedures: new Set(),
    externalTools: [],
    systemPrompt: "You are an assistant",
    history: [{ role: "user", content: "hello" }],
  }),
  finalizeConversation: vi.fn().mockResolvedValue({ inputTokens: 100, outputTokens: 50, model: "claude-sonnet-4-20250514" }),
  handleToolCall: vi.fn(),
  getClient: vi.fn(),
  MAX_TOOL_ITERATIONS: 5,
  DEFAULT_MODEL: "claude-sonnet-4-20250514",
  MAX_TOKENS: 4096,
}))

describe("chatAgent Inngest function", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("pushes stream events to Redis in correct order for simple query", async () => {
    // Import to trigger createFunction registration
    await import("../ai.events")

    const handler = (globalThis as any).__chatAgentHandler
    expect(handler).toBeDefined()

    // Mock step.run to execute the callback and return its result
    mockStepRun.mockImplementation(async (_name: string, fn: () => unknown) => fn())

    // Mock step.ai.wrap to return a simple text response (no tool calls)
    mockStepAiWrap.mockResolvedValue({
      content: [{ type: "text", text: "Hello! How can I help?" }],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: "end_turn",
    })

    const mockStepSendEvent = vi.fn()
    const mockEvent = {
      data: {
        sessionKey: "test-session",
        tenantId: "t1",
        userId: "u1",
        workosUserId: "wos1",
        userPermissions: [],
        message: "hello",
      },
    }

    await handler({
      event: mockEvent,
      step: {
        run: mockStepRun,
        ai: { wrap: mockStepAiWrap },
        waitForEvent: mockStepWaitForEvent,
        sendEvent: mockStepSendEvent,
      },
    })

    // Verify stream events published in correct order: status → text_delta → done
    const rpushCalls = mockRedisRpush.mock.calls
    const streamEvents = rpushCalls
      .filter((call: unknown[]) => (call[0] as string).startsWith("ai:stream:"))
      .map((call: unknown[]) => JSON.parse(call[1] as string).type)

    expect(streamEvents[0]).toBe("status")
    expect(streamEvents).toContain("text_delta")
    expect(streamEvents[streamEvents.length - 1]).toBe("done")

    // Verify step.sendEvent called for ai/chat.completed
    expect(mockStepSendEvent).toHaveBeenCalledWith("notify-chat-completed", expect.objectContaining({
      name: "ai/chat.completed",
    }))
  })
})
```

- [ ] **Step 2: Run test to verify it loads**

Run: `npx vitest run src/modules/ai/__tests__/ai-inngest-durable.test.ts --reporter=verbose`
Expected: Test suite loads and runs (may pass or fail — we're verifying the test infrastructure works)

- [ ] **Step 3: Add `pushToStream` helper to `ai.events.ts`**

Add at the top of `src/modules/ai/ai.events.ts`, after existing imports:

```typescript
import { redis } from "@/shared/redis"
import type { AgentStreamEvent } from "./ai.types"

/**
 * Push a stream event to the Redis list for a given session.
 * The SSE route handler polls this list.
 */
async function pushToStream(sessionKey: string, event: AgentStreamEvent): Promise<void> {
  const key = `ai:stream:${sessionKey}`
  await redis.rpush(key, JSON.stringify(event))
  // Set TTL on first push (10 min expiry for orphan cleanup)
  await redis.expire(key, 600)
}
```

- [ ] **Step 4: Add the `chatAgent` Inngest function**

Add to `src/modules/ai/ai.events.ts`, before the `aiFunctions` export:

```typescript
import Anthropic from "@anthropic-ai/sdk"
import {
  setupAgentContext,
  finalizeConversation,
  handleToolCall,
  getClient,
  MAX_TOOL_ITERATIONS,
  DEFAULT_MODEL,
  MAX_TOKENS,
} from "./ai.service"
import { agentTools } from "./tools"
import { CircleDetector } from "./ai.circle-detector"
import { ApprovalRequiredError, RestrictedProcedureError } from "./ai.guarded-caller"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import { correctionsRepository } from "./memory/corrections"
import type { ToolCallRecord, ToolResultRecord } from "./ai.types"

const chatAgent = inngest.createFunction(
  {
    id: "ai/chat-agent",
    name: "AI Chat Agent (Durable)",
    retries: 1,
    onFailure: async ({ event: failureEvent }) => {
      // Push error to Redis stream so SSE consumer doesn't hang until timeout
      const sessionKey = failureEvent.data.event?.data?.sessionKey
      if (sessionKey) {
        await pushToStream(sessionKey, {
          type: "error",
          message: "The AI agent encountered an error. Please try again.",
          recoverable: false,
        })
      }
    },
  },
  { event: "ai/chat.requested" },
  async ({ event, step }) => {
    const { sessionKey } = event.data

    // 1. Setup — durable checkpoint
    const setup = await step.run("setup", async () => {
      const result = await setupAgentContext({
        tenantId: event.data.tenantId,
        userId: event.data.userId,
        workosUserId: event.data.workosUserId,
        userPermissions: event.data.userPermissions,
        conversationId: event.data.conversationId,
        message: event.data.message,
        pageContext: event.data.pageContext,
        req: null, // No HTTP request in Inngest context
      })

      // Publish status event
      await pushToStream(sessionKey, { type: "status", message: "Processing your message..." })

      // Return serializable data (no functions/classes)
      return {
        conversationId: result.conversation.id,
        conversationTokenCount: result.conversation.tokenCount,
        conversationCostCents: result.conversation.costCents,
        anthropicMessages: result.anthropicMessages,
        systemPrompt: result.systemPrompt,
        historyLength: result.history.length,
      }
    })

    // 2. Agent loop
    // IMPORTANT: These accumulator arrays and state survive across iterations
    // because the for-loop runs in the same function invocation. On Inngest replay,
    // completed steps return cached results (the loop re-runs but steps skip).
    // However, in-memory objects like CircleDetector and approvedProcedures
    // are rebuilt fresh on replay. We track their state via serializable arrays
    // that accumulate from step return values.
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""
    let anthropicMessages = setup.anthropicMessages as Anthropic.MessageParam[]
    // Serializable state that survives replay — rebuilt from step return values
    const approvedProcedurePaths: string[] = []
    // Circle detection records — nested by iteration (preserves iteration boundaries on replay)
    const circleRecordsByIteration: Array<Array<{ name: string; input: unknown; error: string | null }>> = []

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      // LLM call — wrapped for observability
      const response = await step.ai.wrap(
        `llm-call-${iteration}`,
        getClient().messages.create.bind(getClient().messages),
        {
          model: DEFAULT_MODEL,
          max_tokens: MAX_TOKENS,
          system: setup.systemPrompt,
          messages: anthropicMessages,
          tools: agentTools as any,
        }
      )

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter((b: any) => b.type === "text")
      const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use")

      // Publish text deltas
      for (const block of textBlocks) {
        if ((block as any).text) {
          await pushToStream(sessionKey, { type: "text_delta", content: (block as any).text })
        }
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0) {
        finalContent = textBlocks.map((b: any) => b.text).join("\n")
        break
      }

      // Append assistant message
      anthropicMessages = [...anthropicMessages, { role: "assistant" as const, content: response.content }]

      // Execute tools — durable checkpoint
      const toolsResult = await step.run(`tools-${iteration}`, async () => {
        const ctx = {
          tenantId: event.data.tenantId,
          userId: event.data.userId,
          workosUserId: event.data.workosUserId,
          userPermissions: event.data.userPermissions,
          pageContext: event.data.pageContext,
        }

        // Rebuild guarded caller inside step (not serializable across steps)
        // Rebuild approvedProcedures from serializable array (survives replay)
        const approvedProcedures = new Set<string>(approvedProcedurePaths)
        const { createCallerFactory } = await import("@/shared/trpc")
        const { appRouter } = await import("@/server/root")
        const { db } = await import("@/shared/db")
        const { createGuardedCaller } = await import("./ai.guarded-caller")

        const createCaller = createCallerFactory(appRouter)
        const trpcCaller = createCaller({
          db,
          session: { user: { id: ctx.workosUserId } } as any,
          tenantId: ctx.tenantId,
          tenantSlug: "",
          user: null,
          requestId: crypto.randomUUID(),
          req: null as any,
        })
        const guardedCaller = await createGuardedCaller(trpcCaller, {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          conversationId: setup.conversationId,
          approvedProcedures,
        })

        const { getExternalToolsForTenant } = await import("./mcp/adapter")
        let externalTools: any[] = []
        try {
          externalTools = await getExternalToolsForTenant(ctx.tenantId)
        } catch {}

        const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
        const iterToolCalls: ToolCallRecord[] = []
        const iterToolResults: ToolResultRecord[] = []
        const iterCircleRecords: Array<{ name: string; input: unknown; error: string | null }> = []
        let pendingApproval: { actionId: string; procedurePath: string; procedureInput: unknown; description: string; toolUseId: string; toolName: string; toolInput: unknown } | null = null

        for (const toolUse of toolUseBlocks as any[]) {
          iterToolCalls.push({ id: toolUse.id, name: toolUse.name, input: toolUse.input })

          // Publish stream event
          if (toolUse.name === "execute_code") {
            await pushToStream(sessionKey, { type: "code_executing", code: (toolUse.input as any).code })
          } else {
            await pushToStream(sessionKey, { type: "tool_call", toolName: toolUse.name, input: toolUse.input })
          }

          let { result, durationMs, error, approvalRequired } = await handleToolCall(
            toolUse.name, toolUse.input, guardedCaller, ctx, externalTools
          )

          if (approvalRequired) {
            pendingApproval = {
              actionId: approvalRequired.actionId,
              procedurePath: approvalRequired.procedurePath,
              procedureInput: approvalRequired.procedureInput,
              description: approvalRequired.description,
              toolUseId: toolUse.id,
              toolName: toolUse.name,
              toolInput: toolUse.input,
            }
            await pushToStream(sessionKey, {
              type: "approval_required",
              actionId: approvalRequired.actionId,
              toolName: approvalRequired.procedurePath,
              description: approvalRequired.description,
              input: approvalRequired.procedureInput,
            })
            // Return partial result — approval handled outside step.run
            iterToolResults.push({ toolCallId: toolUse.id, output: null, error: "Awaiting approval" })
            toolResultBlocks.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: JSON.stringify({ status: "awaiting_approval" }),
            })
            continue
          }

          if (error) {
            iterToolResults.push({ toolCallId: toolUse.id, output: null, error })
            toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error }), is_error: true })
            if (toolUse.name === "execute_code") {
              await pushToStream(sessionKey, { type: "code_result", result: null, durationMs, error })
            } else {
              await pushToStream(sessionKey, { type: "tool_result", toolName: toolUse.name, result: { error }, durationMs })
            }
          } else {
            iterToolResults.push({ toolCallId: toolUse.id, output: result })
            toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result, null, 2) })
            if (toolUse.name === "execute_code") {
              await pushToStream(sessionKey, { type: "code_result", result, durationMs })
            } else {
              await pushToStream(sessionKey, { type: "tool_result", toolName: toolUse.name, result, durationMs })
            }
          }

          iterCircleRecords.push({ name: toolUse.name, input: toolUse.input, error: error ?? null })
        }

        return { toolResultBlocks, iterToolCalls, iterToolResults, pendingApproval, iterCircleRecords }
      })

      allToolCalls.push(...toolsResult.iterToolCalls)
      allToolResults.push(...toolsResult.iterToolResults)

      // Accumulate circle records as a new iteration group (preserves iteration boundaries on replay)
      circleRecordsByIteration.push(toolsResult.iterCircleRecords)

      // Handle approval flow if needed
      if (toolsResult.pendingApproval) {
        const approval = await step.waitForEvent(`approval-${iteration}`, {
          event: "ai/approval.resolved",
          timeout: "5m",
          if: `async.data.actionId == "${toolsResult.pendingApproval.actionId}"`,
        })

        // Return values from step.run so they survive Inngest replay.
        // Mutations to outer-scope arrays inside step.run callbacks are lost on replay
        // because completed steps return cached results without re-executing.
        const resolveResult = await step.run(`resolve-approval-${iteration}`, async () => {
          const pa = toolsResult.pendingApproval!
          if (approval && approval.data.approved) {
            // Approved path
            await agentActionsRepository.updateStatus(pa.actionId, { status: "approved", approvedBy: event.data.userId })
            await aiConfigRepository.recordApprovalDecision(event.data.tenantId, pa.procedurePath, true)

            // Re-execute tool with approval — rebuild caller with updated approvals
            const retryApprovedSet = new Set<string>([...approvedProcedurePaths, pa.procedurePath])
            const { createCallerFactory } = await import("@/shared/trpc")
            const { appRouter } = await import("@/server/root")
            const { db } = await import("@/shared/db")
            const { createGuardedCaller } = await import("./ai.guarded-caller")

            const createCaller = createCallerFactory(appRouter)
            const trpcCaller = createCaller({
              db,
              session: { user: { id: event.data.workosUserId } } as any,
              tenantId: event.data.tenantId,
              tenantSlug: "",
              user: null,
              requestId: crypto.randomUUID(),
              req: null as any,
            })
            const guardedCaller = await createGuardedCaller(trpcCaller, {
              tenantId: event.data.tenantId,
              userId: event.data.userId,
              conversationId: setup.conversationId,
              approvedProcedures: retryApprovedSet,
            })

            const retry = await handleToolCall(pa.toolName, pa.toolInput, guardedCaller, {
              tenantId: event.data.tenantId,
              userId: event.data.userId,
              workosUserId: event.data.workosUserId,
              userPermissions: event.data.userPermissions,
              pageContext: event.data.pageContext,
            })

            await pushToStream(sessionKey, { type: "approval_resolved", actionId: pa.actionId, approved: true })

            if (retry.error) {
              await pushToStream(sessionKey, { type: "code_result", result: null, durationMs: retry.durationMs, error: retry.error })
            } else {
              await pushToStream(sessionKey, { type: "code_result", result: retry.result, durationMs: retry.durationMs })
            }

            return {
              approvedPath: pa.procedurePath,
              updatedToolResult: { toolCallId: pa.toolUseId, output: retry.result, error: retry.error },
            }
          } else {
            // Rejected or timed out
            const isTimeout = !approval
            const error = isTimeout ? "Approval timed out" : `User rejected execution of ${pa.procedurePath}`

            await agentActionsRepository.updateStatus(pa.actionId, {
              status: "rejected",
              ...(isTimeout ? { error: "Approval timed out" } : {}),
            })
            await aiConfigRepository.recordApprovalDecision(event.data.tenantId, pa.procedurePath, false)

            if (!isTimeout) {
              const action = await agentActionsRepository.getById(pa.actionId)
              if (action) {
                await correctionsRepository.recordRejection({
                  tenantId: event.data.tenantId,
                  toolName: action.toolName,
                  attemptedInput: action.toolInput,
                  rejectionReason: "User rejected action",
                }).catch(() => {})
              }
            }

            await pushToStream(sessionKey, { type: "approval_resolved", actionId: pa.actionId, approved: false })

            return {
              approvedPath: null,
              updatedToolResult: { toolCallId: pa.toolUseId, output: null, error },
            }
          }
        })

        // Apply results outside step.run so they survive Inngest replay
        // (step.run returns cached resolveResult on replay, these lines still execute)
        if (resolveResult.approvedPath) {
          approvedProcedurePaths.push(resolveResult.approvedPath)
        }
        const idx = allToolResults.findIndex((r) => r.toolCallId === resolveResult.updatedToolResult.toolCallId)
        if (idx >= 0) {
          allToolResults[idx] = resolveResult.updatedToolResult
        }
      }

      // Circle detection — rebuild from serializable records preserving iteration boundaries
      // Each sub-array in circleRecordsByIteration corresponds to one agent loop iteration.
      // We replay them with endIteration() between groups so the detector sees the correct
      // number of completed iterations for its "consecutive iteration" comparison logic.
      const circleDetector = new CircleDetector()
      for (const iterRecords of circleRecordsByIteration) {
        for (const rec of iterRecords) {
          circleDetector.record(rec.name, rec.input, rec.error)
        }
        circleDetector.endIteration()
      }
      const circleReason = circleDetector.detect()
      if (circleReason) {
        finalContent = "I'm running into a repeated issue and don't want to waste your time retrying. " +
          "The error I keep hitting: " + (allToolResults.filter((r) => r.error).pop()?.error ?? "unknown") +
          ". Please try rephrasing your question or contact support if this persists."
        await pushToStream(sessionKey, { type: "text_delta", content: finalContent })
        break
      }

      // Append tool results to messages
      anthropicMessages = [
        ...anthropicMessages,
        { role: "user" as const, content: toolsResult.toolResultBlocks },
      ]

      // Penultimate iteration nudge
      if (iteration === MAX_TOOL_ITERATIONS - 2) {
        anthropicMessages = [
          ...anthropicMessages,
          { role: "user" as const, content: "[System: This is your last tool round. Respond with your best answer using the data you have. Do not call any more tools.]" },
        ]
      }
    }

    // Fallback content
    if (!finalContent && allToolResults.length > 0) {
      finalContent = "I wasn't able to fully resolve your question within the tool limit. Here's what I found so far — please try rephrasing or narrowing your question."
    }

    // 3. Finalize — durable checkpoint
    const tokenUsage = await step.run("finalize", async () => {
      const result = await finalizeConversation({
        conversationId: setup.conversationId,
        content: finalContent,
        allToolCalls,
        allToolResults,
        totalInputTokens,
        totalOutputTokens,
        conversationTokenCount: setup.conversationTokenCount,
        conversationCostCents: setup.conversationCostCents,
        historyLength: setup.historyLength,
        message: event.data.message,
        pageContext: event.data.pageContext,
      })

      return result
    })

    // Fire ai/chat.completed durably via step.sendEvent (not inngest.send)
    await step.sendEvent("notify-chat-completed", {
      name: "ai/chat.completed",
      data: {
        conversationId: setup.conversationId,
        tenantId: event.data.tenantId,
        tokensUsed: totalInputTokens + totalOutputTokens,
      },
    })

    // Push done event to stream (outside finalize step — runs after both steps complete)
    await step.run("push-done", async () => {

      await pushToStream(sessionKey, {
        type: "done",
        content: finalContent,
        tokenUsage,
        toolCallCount: allToolCalls.length,
        conversationId: setup.conversationId,
      })
    })

    return { conversationId: setup.conversationId, tokenUsage }
  }
)
```

- [ ] **Step 5: Add `chatAgent` to the `aiFunctions` export**

Change the last line:

```typescript
export const aiFunctions = [weeklyWorkflowSuggestions, mcpToolRefresh, mcpHealthCheck, morningBriefingJob, ghostOperatorJob, chatAgent]
```

- [ ] **Step 6: Run tsc to verify types**

Run: `npx tsc --noEmit`
Expected: No errors (may need to adjust type assertions)

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/modules/ai/__tests__/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/modules/ai/ai.events.ts src/modules/ai/__tests__/ai-inngest-durable.test.ts
git commit -m "feat(ai): add durable chatAgent Inngest function with step.ai.wrap and step.waitForEvent"
```

---

### Task 6: Rewrite SSE Route Handler

**Files:**
- Modify: `src/app/api/ai/stream/route.ts`

- [ ] **Step 1: Rewrite the route handler as a thin dispatcher + Redis list poller**

Replace the contents of `src/app/api/ai/stream/route.ts`:

```typescript
// src/app/api/ai/stream/route.ts

import { withAuth } from "@workos-inc/authkit-nextjs"
import { eq, and } from "drizzle-orm"
import { db } from "@/shared/db"
import { redis } from "@/shared/redis"
import { users, tenants } from "@/shared/db/schema"
import { getUserPermissions } from "@/modules/auth/rbac"
import { extractTenantSlugFromRequest } from "@/modules/auth/tenant"
import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"
import type { PageContext } from "@/modules/ai/ai.types"

const log = logger.child({ module: "api.ai.stream" })

const POLL_INTERVAL_MS = 100
const MAX_STREAM_DURATION_MS = 300_000 // 5 minutes

export async function POST(req: Request) {
  // 1. Authenticate via WorkOS session cookie
  const authResult = await withAuth()
  if (!authResult.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. Resolve tenant
  const { slug: tenantSlug } = extractTenantSlugFromRequest(req)
  const resolvedSlug = tenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? "default"

  let tenantId = "default"
  if (resolvedSlug !== "default") {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, resolvedSlug),
      columns: { id: true },
    })
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
    tenantId = tenant.id
  }

  // 3. Load user with roles/permissions
  const dbUser = await db.query.users.findFirst({
    where: and(
      eq(users.workosUserId, authResult.user.id),
      eq(users.tenantId, tenantId)
    ),
    with: {
      userRoles: {
        with: {
          role: {
            with: {
              rolePermissions: {
                with: { permission: true },
              },
            },
          },
        },
      },
    },
  })

  if (!dbUser) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const userWithRoles = {
    ...dbUser,
    roles: dbUser.userRoles.map((ur) => ({
      role: {
        ...ur.role,
        permissions: ur.role.rolePermissions.map((rp) => ({
          permission: rp.permission,
        })),
      },
    })),
  }

  const userPermissions = getUserPermissions(userWithRoles as Parameters<typeof getUserPermissions>[0])

  // 4. Parse request body
  let body: { conversationId?: string; message: string; pageContext?: PageContext }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!body.message || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 5. Rate limit check (moved from ai.service — must happen before dispatch)
  const rateLimitKey = `ai:rate:${tenantId}:${dbUser.id}`
  const current = await redis.incr(rateLimitKey)
  if (current === 1) {
    await redis.expire(rateLimitKey, 60)
  }
  if (current > 20) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 6. Generate session key and dispatch to Inngest
  const sessionKey = crypto.randomUUID()

  await inngest.send({
    name: "ai/chat.requested",
    data: {
      sessionKey,
      tenantId,
      userId: dbUser.id,
      workosUserId: authResult.user.id,
      userPermissions,
      conversationId: body.conversationId,
      message: body.message,
      pageContext: body.pageContext,
    },
  })

  // 7. Poll Redis list and pipe to SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const redisKey = `ai:stream:${sessionKey}`
      const startTime = Date.now()
      let done = false

      try {
        while (!done && Date.now() - startTime < MAX_STREAM_DURATION_MS) {
          // LRANGE+DEL has a theoretical race condition, but it's harmless here:
          // there is exactly one consumer (this SSE handler) per sessionKey.
          const events = await redis.lrange(redisKey, 0, -1)

          if (events.length > 0) {
            await redis.del(redisKey)

            for (const raw of events) {
              const eventStr = typeof raw === "string" ? raw : JSON.stringify(raw)
              controller.enqueue(encoder.encode(`data: ${eventStr}\n\n`))

              // Check if this is a terminal event
              try {
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
                if (parsed.type === "done" || (parsed.type === "error" && !parsed.recoverable)) {
                  done = true
                }
              } catch {}
            }
          }

          if (!done) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
          }
        }

        // Timeout safety
        if (!done) {
          const timeoutEvent = `data: ${JSON.stringify({ type: "error", message: "Stream timed out", recoverable: false })}\n\n`
          controller.enqueue(encoder.encode(timeoutEvent))
        }
      } catch (err) {
        log.error({ err, sessionKey }, "SSE stream error")
        const errorEvent = `data: ${JSON.stringify({ type: "error", message: "Internal server error", recoverable: false })}\n\n`
        controller.enqueue(encoder.encode(errorEvent))
      } finally {
        // Cleanup Redis key
        await redis.del(redisKey).catch(() => {})
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Session-Key": sessionKey, // Frontend needs this for approval resolution
    },
  })
}
```

Note the `X-Session-Key` response header — the frontend needs this to pass back to the `resolveApproval` mutation.

- [ ] **Step 2: Run tsc to verify types**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/stream/route.ts
git commit -m "feat(ai): rewrite SSE route as thin dispatcher with Redis list polling"
```

---

### Task 7: Update Manifest

**Files:**
- Modify: `src/modules/ai/ai.manifest.ts`

- [ ] **Step 1: Update events**

```typescript
eventsProduced: ["ai/chat.completed", "ai/approval.resolved"],
eventsConsumed: ["ai/chat.requested", "ai/approval.resolved"],
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ai/ai.manifest.ts
git commit -m "feat(ai): update manifest with new event types"
```

---

### Task 8: Extract Workflow AI Node LLM Calls

**Files:**
- Modify: `src/modules/workflow/engine/ai-nodes.ts`

- [ ] **Step 1: Extract `callAIDecision`**

Add a new exported function that encapsulates the LLM call + response parsing:

```typescript
/**
 * Raw LLM call for AI_DECISION — can be wrapped with step.ai.wrap() from Inngest.
 */
export async function callAIDecision(params: {
  model: string
  system: string
  prompt: string
  maxTokens: number
}): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const anthropic = getClient()
  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  return { text, usage: response.usage }
}
```

Then refactor `executeAIDecision` to use it:

```typescript
export async function executeAIDecision(
  node: WorkflowNode,
  context: WorkflowExecutionContext
): Promise<AIDecisionResult> {
  const cfg = node.config as AIDecisionNodeConfig
  const prompt = interpolatePrompt(cfg.prompt, context)
  const validHandles = cfg.outcomes.map((o) => o.handle)

  const outcomesDescription = cfg.outcomes
    .map((o) => `  - handle: "${o.handle}" — ${o.label}: ${o.description}`)
    .join("\n")

  const systemPrompt = [
    "You are a decision-making assistant embedded in an automated workflow.",
    "Based on the user prompt below, choose exactly ONE of the following outcomes.",
    "",
    "Outcomes:",
    outcomesDescription,
    "",
    "Respond with ONLY valid JSON (no markdown, no code fences):",
    '{ "handle": "<one of the handles above>", "reasoning": "<brief explanation>" }',
  ].join("\n")

  const model = cfg.model ?? "claude-haiku-4-5-20251001"
  const maxTokens = cfg.maxTokens ?? 512

  try {
    const { text } = await callAIDecision({ model, system: systemPrompt, prompt, maxTokens })

    let parsed: { handle?: string; reasoning?: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      log.warn({ nodeId: node.id, rawResponse: text }, "AI_DECISION returned invalid JSON, using defaultHandle")
      return { decision: cfg.defaultHandle, reasoning: "Failed to parse AI response JSON", handle: cfg.defaultHandle }
    }

    const handle = validHandles.includes(parsed.handle ?? "") ? parsed.handle! : cfg.defaultHandle

    if (handle !== parsed.handle) {
      log.warn({ nodeId: node.id, returnedHandle: parsed.handle, fallbackHandle: handle }, "AI_DECISION returned invalid handle, falling back to default")
    }

    log.info({ nodeId: node.id, handle }, "AI_DECISION resolved")
    return { decision: handle, reasoning: parsed.reasoning ?? "", handle }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ nodeId: node.id, error }, "AI_DECISION API call failed, using defaultHandle")
    return { decision: cfg.defaultHandle, reasoning: `AI API error: ${error}`, handle: cfg.defaultHandle }
  }
}
```

- [ ] **Step 2: Extract `callAIGenerate` and `callAIRecovery`**

Same pattern — extract the raw `anthropic.messages.create()` call into an exported function, then have the executor use it. Follow the identical pattern from Step 1.

```typescript
export async function callAIGenerate(params: {
  model: string
  system: string
  prompt: string
  maxTokens: number
}): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const anthropic = getClient()
  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  return { text, usage: response.usage }
}

export async function callAIRecovery(params: {
  system: string
  prompt: string
}): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const anthropic = getClient()
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  return { text, usage: response.usage }
}
```

Refactor `executeAIGenerate` and `attemptAIRecovery` to use these.

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/modules/workflow/engine/ai-nodes.ts
git commit -m "refactor(workflow): extract AI node LLM calls for step.ai.wrap compatibility"
```

---

### Task 9: Integration Test

**Files:**
- Create: `src/modules/ai/__tests__/ai-inngest-durable.test.ts` (extend from Task 5)

- [ ] **Step 1: Write integration test for full stream event sequence**

Add to the test file from Task 5:

```typescript
it("produces correct stream event sequence with tool calls", async () => {
  await import("../ai.events")
  const handler = (globalThis as any).__chatAgentHandler

  // First LLM call returns a tool_use, second returns text
  mockStepAiWrap
    .mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "tu1", name: "list_bookings", input: {} }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })
    .mockResolvedValueOnce({
      content: [{ type: "text", text: "Here are your bookings." }],
      usage: { input_tokens: 150, output_tokens: 80 },
    })

  // Mock handleToolCall to return success
  const { handleToolCall } = await import("../ai.service")
  ;(handleToolCall as ReturnType<typeof vi.fn>).mockResolvedValue({
    result: [{ id: "b1" }],
    durationMs: 50,
    error: null,
    approvalRequired: null,
  })

  mockStepRun.mockImplementation(async (_name: string, fn: () => unknown) => fn())
  const mockStepSendEvent = vi.fn()

  await handler({
    event: {
      data: {
        sessionKey: "test-session-2",
        tenantId: "t1", userId: "u1", workosUserId: "wos1",
        userPermissions: [], message: "list my bookings",
      },
    },
    step: {
      run: mockStepRun,
      ai: { wrap: mockStepAiWrap },
      waitForEvent: mockStepWaitForEvent,
      sendEvent: mockStepSendEvent,
    },
  })

  const rpushCalls = mockRedisRpush.mock.calls
  const streamEvents = rpushCalls
    .filter((call: unknown[]) => (call[0] as string).startsWith("ai:stream:"))
    .map((call: unknown[]) => JSON.parse(call[1] as string).type)

  // Verify sequence: status → tool_call → tool_result → text_delta → done
  expect(streamEvents[0]).toBe("status")
  expect(streamEvents).toContain("tool_call")
  expect(streamEvents).toContain("tool_result")
  expect(streamEvents).toContain("text_delta")
  expect(streamEvents[streamEvents.length - 1]).toBe("done")
})

it("handles approval flow with step.waitForEvent", async () => {
  await import("../ai.events")
  const handler = (globalThis as any).__chatAgentHandler

  // LLM returns a tool_use that requires approval
  mockStepAiWrap
    .mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "tu1", name: "delete_booking", input: { id: "b1" } }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })
    .mockResolvedValueOnce({
      content: [{ type: "text", text: "Booking deleted." }],
      usage: { input_tokens: 120, output_tokens: 40 },
    })

  // handleToolCall returns approval required on first call, success on retry
  const { handleToolCall } = await import("../ai.service")
  ;(handleToolCall as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({
      result: null,
      durationMs: 10,
      error: null,
      approvalRequired: {
        actionId: "act-1",
        procedurePath: "booking.delete",
        procedureInput: { id: "b1" },
        description: "Delete booking b1",
      },
    })
    .mockResolvedValueOnce({
      result: { deleted: true },
      durationMs: 50,
      error: null,
      approvalRequired: null,
    })

  // step.waitForEvent returns approval
  mockStepWaitForEvent.mockResolvedValue({
    data: { actionId: "act-1", approved: true },
  })

  mockStepRun.mockImplementation(async (_name: string, fn: () => unknown) => fn())
  const mockStepSendEvent = vi.fn()

  await handler({
    event: {
      data: {
        sessionKey: "test-session-3",
        tenantId: "t1", userId: "u1", workosUserId: "wos1",
        userPermissions: [], message: "delete booking b1",
      },
    },
    step: {
      run: mockStepRun,
      ai: { wrap: mockStepAiWrap },
      waitForEvent: mockStepWaitForEvent,
      sendEvent: mockStepSendEvent,
    },
  })

  // Verify step.waitForEvent was called with correct match
  expect(mockStepWaitForEvent).toHaveBeenCalledWith(
    "approval-0",
    expect.objectContaining({
      event: "ai/approval.resolved",
      timeout: "5m",
    })
  )

  // Verify approval_required and approval_resolved events in stream
  const rpushCalls = mockRedisRpush.mock.calls
  const streamEvents = rpushCalls
    .filter((call: unknown[]) => (call[0] as string).startsWith("ai:stream:"))
    .map((call: unknown[]) => JSON.parse(call[1] as string).type)

  expect(streamEvents).toContain("approval_required")
  expect(streamEvents).toContain("approval_resolved")
  expect(streamEvents[streamEvents.length - 1]).toBe("done")
})
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 3: Run tsc and build**

Run: `npx tsc --noEmit && npx next build`
Expected: Both pass

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/__tests__/ai-inngest-durable.test.ts
git commit -m "test(ai): add integration tests for durable agent Inngest function"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build`
Expected: Build succeeds

- [ ] **Step 4: Verify Inngest dev server picks up the new function**

Run: `npx inngest-cli@latest dev`
Expected: `ai/chat-agent` function appears in the dev server dashboard alongside existing functions
