# AI Chat — Manual Testing Plan

**Date:** 2026-03-19
**Status:** Pre-testing — streaming endpoint likely missing

## Critical Finding

The streaming endpoint (`/api/ai/stream`) that the UI calls does not exist as a Next.js route handler. The backend has `aiService.sendMessageStreaming()` as an async generator but there is no API route to bridge it to SSE. The UI is built to consume SSE events but has nothing to connect to.

---

## Gap Summary

| Area | UI Expects | Backend Has | Status |
|------|-----------|------------|--------|
| Streaming Chat | SSE stream to `/api/ai/stream` | tRPC mutation `sendMessage` | **BROKEN** — wrong protocol |
| Tool Calls | Real-time `tool_call` → `tool_result` events | `sendMessageStreaming()` async generator | **MISSING** — no route handler |
| Code Execution | `code_executing` + `code_result` events | `executeCode()` in ai.executor.ts | **PARTIAL** — backend exists, no SSE bridge |
| Approvals | Streaming `approval_required` event | `resolveApproval` mutation + `waitForApproval` polling | **PARTIAL** — no streaming emit source |
| Approval Tiers | CONFIRM/ESCALATE with expiration | AUTO/CONFIRM/RESTRICT tiers | **PARTIAL** — no tier UI beyond mockup |
| Token Usage | `TokenUsage` object in stream | Tracked in service, returned in `done` event | **PARTIAL** — needs route to surface it |
| Undo | Time-windowed undo stack | `undoAction` mutation | **PARTIAL** — no deadline tracking |
| Knowledge Base | RAG retrieval | Full CRUD endpoints | **ORPHANED** — no UI consumer |
| Vertical Profiles | Industry selection | `setVerticalProfile`, `listVerticalProfiles` | **ORPHANED** — no UI consumer |
| MCP Connections | External tool management | Full CRUD + refresh + health | **ORPHANED** — no UI consumer |
| Paste-to-Pipeline | Entity extraction + commit | `pasteToPipelineExtract`, `pasteToPipelineCommit` | **ORPHANED** — no UI call |
| Morning Briefing | Overnight digest display | `generateBriefingNow` + Inngest cron | **PARTIAL** — unclear UI integration |
| Ghost Operator | After-hours rule config | `processGhostOperator` + Inngest cron | **PARTIAL** — no config UI |
| Workflow Generation | Visual builder with AI nodes | `generateWorkflow` mutation | **PARTIAL** — no node/edge UI |
| Trust Suggestions | Auto-promotion thresholds | `getTrustSuggestions` query | **ORPHANED** — no UI consumer |
| Conversation History | Message list with tool calls | `getConversation` + `getMessages` | **UNCLEAR** — type shapes may mismatch |

---

## Phase 0: Can You Even Chat?

| # | Test | Steps | Expected Issue |
|---|------|-------|----------------|
| 1 | Page loads | Open `/admin/ai-chat` | Should load — it is a React component |
| 2 | Send a message | Type "Hello" and hit send | **Will 404** — no route handler at `/api/ai/stream` |
| 3 | Check Network tab | Open browser DevTools → Network → send a message | Confirm the 404 or check if there is a tRPC fallback |
| 4 | Check Console | Open browser DevTools → Console | Look for JS errors, type mismatches, missing imports |

---

## Phase 1: Streaming Infrastructure

| # | Test | What to Check |
|---|------|--------------|
| 5 | `/api/ai/stream` route exists | Check `src/app/api/ai/` for `stream/route.ts` — likely missing |
| 6 | `/api/mcp/route.ts` exists | The MCP endpoint was planned — check if it is wired |
| 7 | tRPC `ai.sendMessage` directly | Use tRPC devtools or browser console to call the mutation — does it return a response or error? |

---

## Phase 2: Conversation Management

| # | Test | Steps | What to Check |
|---|------|-------|--------------|
| 8 | Sidebar list | Open ai-chat, look at left sidebar | Does `ai.listConversations` return data or empty array? |
| 9 | Load conversation | Click on a conversation in sidebar | Does `ai.getConversation` load with messages? Do messages render? |
| 10 | Archive | Click archive/delete button on a conversation | Does it call `ai.archiveConversation`? Does it disappear from list? |
| 11 | New conversation | Click "New Chat" button | Does it clear the view? Does next message create a new conversation? |

---

## Phase 3: Approval Flow (Phase B)

> **Prerequisite:** Streaming must work for these tests. If Phase 0 test #2 fails, skip to "What Needs Building First" below.

| # | Test | Steps | What to Check |
|---|------|-------|--------------|
| 12 | Trigger CONFIRM | Ask "create a booking for John at 10am tomorrow" | Should trigger CONFIRM guardrail → `approval_required` SSE event |
| 13 | Approval card renders | Wait for approval card to appear | Does `ApprovalCard` show with procedure name, input preview, approve/reject buttons? |
| 14 | Approve | Click "Approve" on the card | Does it call `ai.resolveApproval({ actionId, approved: true })`? Does the agent re-execute the mutation? |
| 15 | Reject | Trigger another CONFIRM, click "Reject" | Does it record rejection? Does the agent explain why it wanted to do it? |
| 16 | RESTRICT block | Ask "delete customer John Smith" | Should immediately refuse — `customer.delete` is RESTRICT tier |
| 17 | AUTO passthrough | Ask "add a note to booking B123: client confirmed" | Should execute without approval — `booking.addNote` is AUTO tier |

---

## Phase 4: Tool Call Visualisation

> **Prerequisite:** Streaming must work.

| # | Test | Steps | What to Check |
|---|------|-------|--------------|
| 18 | Read query | Ask "how many bookings do I have?" | Should show `execute_code` tool call → code block with `trpc.booking.list({})` |
| 19 | Tool call card | Watch the streaming response | Does `StreamingToolCall` component show tool name + input JSON? |
| 20 | Code execution block | Watch for code result | Does `CodeExecutionBlock` show the code snippet + returned data + duration? |
| 21 | Module introspection | Ask "what can the booking module do?" | Should show `describe_module` tool call → module metadata |
| 22 | Multi-step query | Ask "show me my team members and their upcoming bookings" | Should show multiple tool calls in sequence (describe → execute → execute) |
| 23 | Error handling | Ask about a module that does not exist | Should show error gracefully, not crash the UI |

---

## Phase 5: Phase F Features

| # | Test | Steps | What to Check |
|---|------|-------|--------------|
| 24 | Paste-to-pipeline UI | Look for a paste/import button or text area | Likely missing — backend has `pasteToPipelineExtract` but no UI wired to it |
| 25 | Paste-to-pipeline via chat | Ask "I just got an email from John Smith (john@acme.com) about a haircut tomorrow at 10am" | Does the agent offer to create entities? Does it use paste-to-pipeline internally? |
| 26 | Morning briefing button | Look for "Generate Briefing" in the UI | Does `ai.generateBriefingNow` exist as a button? Does it return structured data? |
| 27 | Ghost operator config | Look for after-hours settings | Is there a UI to configure start/end hours, rules, timezone? |

---

## Phase 6: Settings and Configuration

| # | Test | Steps | What to Check |
|---|------|-------|--------------|
| 28 | AI config page | Navigate to AI settings (if it exists) | Can you view/edit guardrail overrides per procedure? |
| 29 | Knowledge base | Look for document upload UI | Likely missing — `ai.ingestDocument` exists but no UI |
| 30 | MCP connections | Look for external tool server config | Likely missing — full CRUD backend but no UI |
| 31 | Vertical profiles | Look for industry/vertical selector | Likely missing — `ai.listVerticalProfiles` exists but no UI |
| 32 | Trust ratchet | Look for promotion/demotion suggestions | Likely missing — `ai.getTrustSuggestions` exists but no UI |

---

## Prediction: What Will Break

1. **Test #2 will fail immediately** — the `/api/ai/stream` route does not exist
2. **Tests #12-17 will not be reachable** until streaming works
3. **Tests #18-23 depend on streaming** working end-to-end
4. **Tests #24, #26-32 will have no UI** — these are backend-only features with no frontend

---

## What Needs Building First

To make the chatbot work end-to-end, in priority order:

### 1. Create SSE streaming route

Create `src/app/api/ai/stream/route.ts` that:
- Accepts POST with `{ conversationId?, message, pageContext? }`
- Authenticates via WorkOS session (same as tRPC middleware)
- Calls `aiService.sendMessageStreaming()`
- Converts the async generator yields to SSE `data:` lines
- Returns `new Response(stream, { headers: { "Content-Type": "text/event-stream" } })`

### 2. Wire authentication

The route needs to:
- Read the WorkOS session from cookies/headers
- Resolve `tenantId`, `userId`, `workosUserId`, `userPermissions`
- Pass these to `aiService.sendMessageStreaming()`

### 3. Test the happy path

Once the route exists:
- Send "Hello" → get a text response back via SSE
- Send "how many bookings?" → see tool calls streamed, then final text
- Send "create a booking" → see approval flow trigger

### 4. Build missing UI for orphaned features

After streaming works, build UI for:
- Paste-to-pipeline (text input → entity extraction → review → commit)
- Knowledge base management (upload documents, list sources, delete)
- MCP connection management (add external tool servers)
- Guardrail configuration (per-procedure tier overrides)
- Vertical profile selection
- Morning briefing display
- Ghost operator rule configuration

---

## Automated Test Coverage (Already Complete)

For reference, the following integration tests already pass (245 total in AI module):

| Test File | Tests | Covers |
|-----------|-------|--------|
| `ai-integration-agent-loop.test.ts` | 10 | Full `sendMessage` flow, tool calls, rate limits, token budgets, multi-iteration |
| `ai-integration-approval-flow.test.ts` | 6 | CONFIRM→approval→re-execution, rejection→corrections, AUTO bypass, RESTRICT blocking |
| `ai-integration-mcp-server.test.ts` | 7 | Auth, tools/list introspection, rate limiting, tool name parsing |
| `ai-integration-features.test.ts` | 11 | Ghost operator, morning briefing, paste-to-pipeline commit + extraction |
| `ai-phase-b.test.ts` | 21 | Guardrail tiers, guarded caller proxy, approval flow, trust analysis |
| `ai-phase-c.test.ts` | 20 | AI workflow nodes, prompt interpolation, workflow generation |
| `ai-phase-d.test.ts` | 44 | Memory layers, knowledge base, RAG, vertical profiles, system prompt assembly |
| `ai-phase-e.test.ts` | 20 | MCP types, adapter, client, server, external tools, schemas |
| `ai-phase-f.test.ts` | 15 | Ghost operator rules/window, morning briefing, paste-to-pipeline, config toggles |
| `ai.test.ts` | 13 | Core executor, introspection, describe_module, agentTools |
| `ai.executor.test.ts` | 44 | tRPC call patterns, nested routers, context, errors, sandbox, truncation |
| `ai.circle-detector.test.ts` | 18 | Infinite loop detection across all check types |
