# AI Code Execution Engine — Design Spec

> Replace individual AI tools with a TypeScript code execution model where Claude writes code against the tRPC API.

**Date:** 2026-03-12
**Status:** Approved
**Replaces:** Current individual tool system (25 tools across 11 files)

---

## Problem

The current AI agent has 25 hardcoded tools, each wrapping a single repository method. The platform has ~180 tRPC procedures across 25 modules. Scaling the tool-per-procedure approach is unsustainable — every new procedure needs a new tool file, JSON Schema definition, and wiring. The tool definitions also consume significant context window space when sent to Claude.

## Solution

Give Claude two tools:

1. **`describe_module`** — returns procedure names + input schemas for a given module
2. **`execute_code`** — runs a TypeScript snippet against a pre-authenticated tRPC caller

Claude writes real TypeScript that calls `trpc.module.procedure()` directly. The code runs server-side via `new Function()` with the tRPC caller and agent context injected. All auth, RBAC, tenant isolation, and module gating are enforced by the existing tRPC middleware stack.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Security boundary | tRPC middleware, not sandbox | The AI is our code author, not untrusted user input. tRPC already enforces auth, RBAC, tenant isolation, rate limiting. |
| Discovery model | System prompt index + `describe_module` tool | Compact index (~500 tokens) gives Claude the full landscape. Schema lookup only when needed — one round trip. |
| Execution runtime | `new Function('trpc', 'ctx', code)` | Clean async/await, zero dependencies. No `isolated-vm` overhead. Upgradeable later. |
| Result handling | Truncation at 4KB | Arrays trimmed with `_truncated` metadata. Prevents context bloat. Dual output (data + summary) noted as future option. |
| UI rendering | Collapsible code block with summary | Collapsed: `Executed 3 tRPC calls in 240ms`. Expandable: syntax-highlighted code + result. Clean chat, full traceability. |
| Mutation access | Read-only initially | System prompt and module index only expose query procedures. Mutation approval system stays for future wiring. |

---

## Architecture

### Current Flow
```
User message → Claude → tool_use("booking_list", {limit:20}) → bookingRepository.list() → result → Claude → response
```

### New Flow
```
User message → Claude → tool_use("execute_code", code) → new Function(code)(trpcCaller, ctx) → result → Claude → response
```

### tRPC Caller

Built once per AI request using the existing `createCallerFactory`:

```typescript
import { createCallerFactory } from "@/shared/trpc"
import { appRouter } from "@/server/root"

const createCaller = createCallerFactory(appRouter)
const trpc = createCaller({
  db,
  session: userSession,
  tenantId,
  tenantSlug,
  user: userWithRoles,
  requestId: crypto.randomUUID(),
  req: originalRequest,
})
```

Every call the AI makes goes through the full middleware stack: auth, tenant isolation, RBAC, rate limiting, module gating, error conversion. No new auth layer needed.

### Code Execution

```typescript
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

async function executeCode(
  code: string,
  trpc: TRPCCaller,
  ctx: AgentContext
): Promise<{ result: unknown; durationMs: number }> {
  const fn = new AsyncFunction('trpc', 'ctx', code)
  const start = Date.now()
  const result = await Promise.race([
    fn(trpc, ctx),
    timeout(10_000),
  ])
  return { result, durationMs: Date.now() - start }
}
```

**Accessible inside code:** `trpc` (pre-authenticated caller), `ctx` (tenantId, userId, userPermissions, pageContext), standard JS built-ins (Date, Math, JSON, Promise, Array methods).

**Not accessible:** `require`, `import`, `fetch`, `process`, `fs`, `globalThis`, database, Redis, or any server internals.

### Result Truncation

After execution, the result is JSON-serialized. If it exceeds 4KB:
- Arrays are trimmed to first N items
- A `_truncated: { total: 47, shown: 10 }` field is appended
- Claude sees the shape of the data without context window bloat

### Error Handling

If code throws (syntax error, tRPC error, timeout), we catch and return:
```json
{ "error": "FORBIDDEN: Permission denied: payments:write", "code": "EXECUTION_ERROR" }
```
Claude can explain the error or try a different approach.

---

## Discovery

### System Prompt Index

A compact module index is baked into the system prompt, generated from router introspection at startup:

```
Available modules (query procedures only):
  booking: list, getById, getStats, listForCalendar
  booking.approval: getPendingBookings
  customer: list, getById, listNotes, getBookingHistory
  team: list, getById, getAvailability, getWorkload, getSchedule
  scheduling: listSlots, getSlotById, checkAvailability
  analytics: getSummary, getTimeSeries, getKPIs, getTopServices, ...
  review: list, getById, getAutomation
  workflow: list, getById, getExecutions
  payment: listInvoices, getInvoice, listPricingRules
  tenant: getSettings, listModules, listVenues, getPlan, getUsage
  search: globalSearch
  ...
```

~500 tokens. Claude immediately knows what's available.

### `describe_module` Tool

Returns full procedure metadata for a module:

```json
{
  "module": "booking",
  "procedures": [
    {
      "name": "list",
      "type": "query",
      "permission": "bookings:read",
      "inputSchema": {
        "type": "object",
        "properties": {
          "status": { "type": "string", "enum": ["PENDING", "CONFIRMED", ...] },
          "limit": { "type": "number", "default": 20 },
          "cursor": { "type": "string" },
          "customerId": { "type": "string" }
        }
      }
    }
  ]
}
```

### Router Introspection

Walks the tRPC router tree at startup using `_def.procedures` and `_def.inputs`. Zod schemas are converted to JSON Schema via `zodToJsonSchema()`. Result is cached — the router structure doesn't change at runtime. Both the system prompt index and `describe_module` responses are generated from the same cached data.

---

## UI Rendering

### New Stream Events

```typescript
type AgentStreamEvent =
  | { type: "code_executing"; code: string }
  | { type: "code_result"; result: unknown; durationMs: number; callCount: number; error?: string }
  | // ...existing events (status, text_delta, done, etc.)
```

### CodeExecutionBlock Component

**Collapsed (default):**
```
✓ Executed 3 tRPC calls in 240ms          [▶ Show code]
```

**Expanded:**
```
✓ Executed 3 tRPC calls in 240ms          [▼ Hide code]
┌─────────────────────────────────────────
│ const bookings = await trpc.booking.list({
│   status: "CONFIRMED", limit: 50
│ })
│ const overdue = bookings.rows.filter(
│   b => new Date(b.date) < new Date()
│ )
│ return { total: bookings.rows.length, overdue: overdue.length }
├─────────────────────────────────────────
│ Result: { total: 47, overdue: 3 }
└─────────────────────────────────────────
```

**Error state:** Red icon, error message visible. Code expandable.

**Streaming state:** Spinner while executing, code already visible if expanded.

The `describe_module` tool uses the existing step-style rendering (spinner → checkmark) since it's a simple lookup.

---

## System Prompt

Shifts from "you have tools" to "you write TypeScript":

```
You have access to the platform's tRPC API via a pre-authenticated `trpc` caller.
To answer questions, write TypeScript code that calls tRPC procedures and returns
the relevant data. Your code runs in an async context — use await freely.

RULES FOR CODE:
- Always `return` your result — the return value is what you'll see.
- Use `await` for all trpc calls.
- You can use standard JS: filter, map, reduce, Promise.all, Date, Math, etc.
- Keep code concise. Fetch only what you need.
- If a call fails, the error message will tell you why.
- Do NOT use require, import, fetch, or access any globals beyond trpc and ctx.
- Call describe_module("moduleName") to see input schemas before writing code.

[Domain context: BNG terminology, page context, etc. — unchanged]

[Module index: auto-generated from router introspection]
```

---

## File Changes

### New Files

```
src/modules/ai/
  ai.executor.ts            # executeCode() — Function constructor, timeout, truncation
  ai.introspection.ts       # Router introspection — walks router tree, caches index
  tools/
    execute-code.tool.ts    # execute_code tool definition
    describe-module.tool.ts # describe_module tool definition
```

### Modified Files

```
src/modules/ai/
  ai.service.ts             # Build tRPC caller, pass to execute_code, new stream events
  ai.prompts.ts             # New system prompt with module index + code conventions
  ai.types.ts               # New stream event types (code_executing, code_result)
  tools/index.ts            # Replace allTools with [describeModuleTool, executeCodeTool]

src/app/admin/ai-chat/
  page.tsx                  # New CodeExecutionBlock component, handle new event types
```

### Removed

```
src/modules/ai/tools/
  booking.tools.ts
  customer.tools.ts
  scheduling.tools.ts
  review.tools.ts
  payment.tools.ts
  analytics.tools.ts
  workflow.tools.ts
  team.tools.ts
  booking.mutation-tools.ts
  customer.mutation-tools.ts
  notification.mutation-tools.ts
```

11 tool files replaced by 2 tools that cover all ~180 procedures.

### Untouched

- All tRPC routers, services, repositories — the module layer doesn't change
- `ai.repository.ts`, `ai.schemas.ts`, `ai.router.ts` — conversation persistence unchanged
- `ai.approval.ts`, `ai.trust.ts` — kept for future mutation support

---

## Future Extensions

- **Mutation support:** Wire the approval system at the tRPC caller level (intercept mutation calls, check guardrail tier, request approval before executing).
- **Dual output:** `return { data, summary }` pattern where Claude controls what it sees vs what the UI renders. Reduces token waste on large datasets.
- **Workflow conversion:** AI-generated code snippets can be saved as workflow steps that run without Claude in the loop — the code is already deterministic tRPC calls.
- **`isolated-vm` upgrade:** If we ever let end users write code (not just Claude), swap the Function constructor for a proper V8 isolate.
- **Caching:** Cache `describe_module` results in the conversation context so Claude doesn't re-fetch schemas it's already seen.
