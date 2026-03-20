# Inngest AI Adoption — Durable Agent Loop with step.ai Observability

## Summary

Move the AI chat agent loop from a synchronous SSE route handler into a durable Inngest function. Wrap all LLM calls in `step.ai.wrap()` for token/cost observability. Replace Redis polling approval flow with `step.waitForEvent()`. Bridge streaming to the frontend via Redis list polling (Upstash HTTP-compatible).

This is Option B from the Inngest vs Trigger.dev evaluation — stay on Inngest, adopt its AI primitives incrementally, future-proof for AgentKit/useAgent adoption later.

## Motivation

Current state:
- Agent loop runs synchronously inside `POST /api/ai/stream/route.ts`
- If the process crashes mid-conversation, the entire response is lost
- Approval flow polls a Redis key every 1s for up to 5 minutes — dies on restart
- No LLM observability — token usage is tracked manually in application code
- Workflow AI nodes (`AI_DECISION`, `AI_GENERATE`) make direct Anthropic calls with no retry/observability

After this change:
- Agent loop is durable — Inngest retries from the last checkpoint on crash
- Approval flow uses `step.waitForEvent()` — survives process restarts, deployments
- Every LLM call tracked in Inngest dashboard (tokens, cost, latency, model)
- Workflow AI nodes get `step.ai.wrap()` observability when called from Inngest
- Clean foundation for future AgentKit/useAgent adoption

## Architecture

### Execution Flow

```
Browser
  ↓ POST /api/ai/stream
Route Handler (thin)
  ├─ Authenticate (WorkOS)
  ├─ Resolve tenant + user + permissions
  ├─ Rate limit check
  ├─ Generate sessionKey (UUID)
  ├─ inngest.send("ai/chat.requested", { sessionKey, ... })
  ├─ Poll Redis list "ai:stream:{sessionKey}" via LRANGE + LTRIM
  └─ Pipe events → SSE response

Inngest Function (durable)
  ├─ step.run("setup")
  │     Get/create conversation, load history, build system prompt, load external tools
  │
  ├─ for iteration 0..4:
  │   ├─ step.ai.wrap("llm-call-{N}")
  │   │     Claude messages.create() — observability tracked by Inngest
  │   │     Publish text_delta events to Redis after completion
  │   │
  │   ├─ if no tool_use blocks → break
  │   │
  │   ├─ step.run("tools-{N}")
  │   │     Build guarded tRPC caller, execute tools
  │   │     Publish code_executing, code_result, tool_call, tool_result to Redis
  │   │     If ApprovalRequiredError → publish approval_required, return marker
  │   │
  │   ├─ if approval needed:
  │   │   ├─ step.waitForEvent("approval-{N}")
  │   │   │     event: "ai/approval.resolved", match: "data.actionId", timeout: "5m"
  │   │   └─ step.run("retry-{N}")
  │   │         Re-execute with approval, publish result
  │   │
  │   └─ Circle detection + penultimate iteration nudge
  │
  └─ step.run("finalize")
        Save messages, update token count, trigger summarization, publish done
```

### Streaming Trade-off

`step.ai.wrap()` wraps `messages.create()` (non-streaming) as one retriable unit. Text arrives per-iteration rather than token-by-token. For most agent responses (1-3 sentences between tool calls), this is barely noticeable. The final natural language response arrives as one block after 1-3 seconds of LLM time.

If token-by-token streaming becomes critical later: switch to `messages.stream()` inside `step.run()` (not `step.ai.wrap()`), publish deltas to Redis in real-time, and log token usage manually. This trades Inngest AI observability for streaming granularity. Not needed now.

### Approval Flow Change

Before:
```
GuardedCaller throws ApprovalRequiredError
  → Service catches, yields approval_required SSE event
  → waitForApproval() polls Redis key every 1s for 5 minutes
  → UI calls resolveApprovalFromUI() which sets Redis key
  → Polling loop detects key, resumes
```

After:
```
GuardedCaller throws ApprovalRequiredError
  → Inngest function pushes approval_required to Redis list
  → step.waitForEvent("ai/approval.resolved", { match: "data.actionId", timeout: "5m" })
  → Inngest function pauses (no compute, survives restarts)
  → UI calls approval endpoint which fires inngest.send("ai/approval.resolved", { actionId, approved })
  → Inngest function resumes with approval decision
```

## New Events

Added to `src/shared/inngest.ts`:

```typescript
"ai/chat.requested": {
  data: {
    sessionKey: string        // Redis channel key + idempotency
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
}

"ai/approval.resolved": {
  data: {
    actionId: string
    sessionKey: string
    approved: boolean
  }
}
```

## Streaming Bridge: Redis List Polling

Upstash Redis uses HTTP REST calls, not persistent TCP connections. Traditional Redis pub/sub (`subscribe()`) requires a persistent connection, which Upstash does not support. Instead, we use a Redis list as an event queue:

**Publisher (Inngest function):**
```
redis.rpush("ai:stream:{sessionKey}", JSON.stringify(event))
```

**Consumer (SSE route handler):**
```
Poll loop (every 100ms):
  events = redis.lrange("ai:stream:{sessionKey}", 0, -1)
  if events.length > 0:
    redis.del("ai:stream:{sessionKey}")  // atomic clear after read
    for each event: write to SSE
    if event.type === "done" or "error": close SSE, stop polling
```

The 100ms polling interval adds negligible latency (LLM calls take 2-30 seconds). The Redis list auto-expires after 10 minutes via `redis.expire()` on first push, preventing orphaned keys.

Alternative: `LPOP` in a loop (pop-and-process) avoids the LRANGE+DEL race. But with a single consumer per sessionKey, the race is harmless — the SSE handler is the only reader.

## Approval Flow — Complete Side Effects

When `step.waitForEvent("approval-N")` resolves, the Inngest function must handle all three outcomes in `step.run("resolve-approval-N")`:

**On approval (event.data.approved === true):**
1. `agentActionsRepository.updateStatus(actionId, { status: "approved", approvedBy: userId })`
2. `aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, true)` — trust metrics
3. Add procedure to `approvedProcedures` set
4. Re-execute tool call with approval

**On rejection (event.data.approved === false):**
1. `agentActionsRepository.updateStatus(actionId, { status: "rejected" })`
2. `aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, false)` — trust metrics
3. `correctionsRepository.recordRejection({ tenantId, toolName, attemptedInput, rejectionReason })` — correction learning
4. Push rejection error to Redis stream

**On timeout (step.waitForEvent returns null):**
1. `agentActionsRepository.updateStatus(actionId, { status: "rejected", error: "Approval timed out" })`
2. `aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, false)` — trust metrics
3. Push timeout error to Redis stream

## buildTrpcCaller Without a Request Object

The current `buildTrpcCaller(ctx, req)` requires a `Request` for IP-based rate limiting in the tRPC middleware. Inside an Inngest function, there is no HTTP request.

Solution: Make `req` optional in `buildTrpcCaller`. When called from the Inngest function, pass `null`. IP-based rate limiting is already enforced in the route handler before dispatching the event — the tRPC middleware rate limit is a secondary check that can be skipped for Inngest-initiated calls.

## File Changes

### Modified Files

**`src/shared/inngest.ts`**
- Add `ai/chat.requested` and `ai/approval.resolved` event types to `IronheartEvents`

**`src/modules/ai/ai.events.ts`**
- Add `chatAgent` Inngest function triggered by `ai/chat.requested`
- Contains the full durable agent loop (setup, iterations, approval waits, finalize)
- Add to `aiFunctions` export array
- New `pushToStream(sessionKey, event)` helper — `redis.rpush("ai:stream:{sessionKey}", JSON.stringify(event))`

**`src/modules/ai/ai.service.ts`**
- Extract shared logic into reusable functions:
  - `setupAgentContext(data)` — conversation get/create, history, system prompt, external tools
  - `executeToolCalls(toolUseBlocks, guardedCaller, ctx, externalTools)` — tool execution loop
  - `finalizeConversation(conversationId, messages, tokenUsage)` — save, update, summarize, update hot memory
- `sendMessageStreaming` stays but is marked with a `@deprecated` JSDoc comment (legacy path)
- `sendMessage` (non-streaming) unchanged
- `buildTrpcCaller` updated to accept optional `req: Request | null` parameter

**`src/modules/ai/ai.schemas.ts`**
- Add `sessionKey: z.string()` to `resolveApprovalSchema`

**`src/modules/ai/ai.approval.ts`**
- `resolveApprovalFromUI` changes from `redis.set()` to `inngest.send("ai/approval.resolved", { actionId, sessionKey, approved })`
- Remove `waitForApproval` function entirely (replaced by `step.waitForEvent`)
- All approval side effects (status updates, trust metrics, correction recording) move into the Inngest function's `step.run("resolve-approval-N")`

**`src/app/api/ai/stream/route.ts`**
- Remove `aiService.sendMessageStreaming` import
- After auth/tenant/user resolution: generate sessionKey, fire event, poll Redis list, pipe to SSE
- Poll `redis.lrange("ai:stream:{sessionKey}", 0, -1)` every 100ms
- Clear list with `redis.del()` after each batch read
- Close SSE when a `done` or `error` event arrives
- Add timeout safety (5 minutes max SSE connection)

**`src/modules/ai/ai.manifest.ts`**
- Add `ai/chat.requested` and `ai/approval.resolved` to `eventsConsumed`
- Add `ai/approval.resolved` to `eventsProduced` (fired by approval UI)

**`src/modules/workflow/engine/ai-nodes.ts`**
- Extract the `anthropic.messages.create()` call from each executor into a standalone async function:
  - `callAIDecision(params: { model, system, prompt, maxTokens })` — the full LLM call including prompt + response parsing
  - `callAIGenerate(params: { model, system, prompt, maxTokens })` — the full LLM call including response extraction
  - `callAIRecovery(params: { system, prompt })` — the full LLM call including response parsing
- The public `executeAIDecision`, `executeAIGenerate`, `attemptAIRecovery` functions handle config resolution and interpolation, then delegate to the `call*` functions
- When called from within an Inngest step context (workflow execution), the caller wraps the `call*` function with `step.ai.wrap()` — the wrapping boundary is the entire LLM call including prompt assembly and response parsing

**`src/modules/ai/ai.router.ts`**
- `resolveApproval` mutation: accept `sessionKey` (from updated schema), pass to `resolveApprovalFromUI` which now fires `inngest.send("ai/approval.resolved", { actionId, sessionKey, approved })`

### Not Changed

- `ai.executor.ts` — code execution logic unchanged
- `ai.guarded-caller.ts` — guardrail proxy unchanged
- `ai.prompts.ts` — prompt assembly unchanged
- `ai.actions.repository.ts` — imported in Inngest function for approval side effects, but the file itself is unchanged
- `ai.config.repository.ts` — imported in Inngest function for trust metrics, but the file itself is unchanged
- `memory/*` — summarizer, hot memory, corrections unchanged (hot memory called from finalize step)
- `mcp/*` — MCP client/server unchanged
- `tools/*` — tool definitions unchanged
- `ai.types.ts` — stream event types unchanged
- `sendMessage` (non-streaming variant) — stays as-is for programmatic use

## Finalize Step — Complete Operations

The `step.run("finalize")` performs all of:
1. Save assistant message to `ai_messages` via `aiRepository.addMessage()`
2. Update conversation token count + cost via `aiRepository.updateConversation()`
3. Fire `inngest.send("ai/chat.completed", { conversationId, tenantId, tokensUsed })` — event type already exists, was never fired
4. Trigger `maybeSummarize(conversationId)` (fire-and-forget)
5. Update `hotMemory.setSessionContext()` with recent tool calls and page context
6. Push `done` event to Redis stream

## Testing

**Update `ai-phase-b.test.ts`:**
- Approval flow tests: mock `inngest.send` instead of Redis key set/get
- Verify `step.waitForEvent` is called with correct event name and match expression

**New test coverage in existing test files:**
- Mock `step.run`, `step.ai.wrap`, `step.waitForEvent` for the chatAgent function
- Verify Redis publish calls in correct order: status → text_delta → tool events → done
- Verify approval flow: approval_required published → step.waitForEvent called → approval resolved → retry executed
- Verify circle detection still works across durable iterations
- Verify finalization: messages saved, token count updated, summarization triggered

**Integration test:**
- Dispatch `ai/chat.requested` event with mocked Anthropic responses
- Verify complete Redis stream event sequence

## Dependencies

- Inngest SDK `^3.52.1` (already installed, supports `step.ai.wrap`)
- `@anthropic-ai/sdk` (already installed)
- Upstash Redis (already available via `@/shared/redis` — list operations for stream bridge)

No new packages required.

## Migration

- The old direct SSE path (`sendMessageStreaming` called from route handler) stays as a deprecated fallback
- The route handler switches to the Inngest dispatch path
- If issues arise, reverting is a one-file change in `route.ts` (switch back to direct `sendMessageStreaming`)
- The `sendMessage` non-streaming variant is unaffected

## Future Path

This design is the foundation layer for:
1. **AgentKit adoption** — when Realtime exits preview, replace Redis list polling bridge with `useAgent()` hook
2. **Multi-agent routing** — the Inngest function structure maps directly to `createNetwork()`
3. **step.ai.infer()** — swap `step.ai.wrap()` for `step.ai.infer()` to sleep during inference (cost savings on serverless)
4. **Token cost dashboard** — Inngest's SQL-queryable AI insights give this for free once `step.ai.wrap` is in place
