# AI Code Execution Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 25 individual AI tools with 2 tools (`describe_module` + `execute_code`) that let Claude write TypeScript against the tRPC API.

**Architecture:** Router introspection walks `appRouter._def.record` at startup, converts Zod schemas to JSON Schema via `z.toJSONSchema()`, and caches the result. `execute_code` runs Claude-authored TypeScript via `AsyncFunction` constructor with a pre-authenticated tRPC caller injected. All auth/RBAC/tenant isolation enforced by existing tRPC middleware.

**Tech Stack:** tRPC v11 (`createCallerFactory`), Zod v4 (`toJSONSchema`), Anthropic SDK, `AsyncFunction` constructor, existing SSE streaming.

**Design Spec:** `docs/plans/2026-03-12-ai-code-execution-engine-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/modules/ai/ai.introspection.ts` | Walk router tree, build module index + per-module procedure metadata. Cache at startup. |
| `src/modules/ai/ai.executor.ts` | `executeCode()` — AsyncFunction constructor, 10s timeout, 4KB result truncation. |
| `src/modules/ai/tools/execute-code.tool.ts` | Anthropic tool definition for `execute_code`. |
| `src/modules/ai/tools/describe-module.tool.ts` | Anthropic tool definition for `describe_module`. |

### Modified Files
| File | Changes |
|------|---------|
| `src/modules/ai/ai.types.ts` | Add `code_executing` + `code_result` stream event types, add `workosUserId` to `AgentContext`. |
| `src/modules/ai/ai.prompts.ts` | Replace tool-oriented prompt with code-execution prompt + auto-generated module index. |
| `src/modules/ai/ai.service.ts` | Build tRPC caller per request, replace tool dispatch with 2-tool system, emit new stream events. |
| `src/modules/ai/tools/index.ts` | Export only `describeModuleTool` + `executeCodeTool`. Remove old tool imports. |
| `src/modules/ai/index.ts` | Re-export introspection initialization if needed. |
| `src/app/api/ai/stream/route.ts` | Pass `workosUserId` and `req` to service. |
| `src/modules/ai/ai.router.ts` | Pass `workosUserId` and `req` to service. |
| `src/app/admin/ai-chat/page.tsx` | Add `CodeExecutionBlock` component, handle `code_executing`/`code_result` events. |

### Deleted Files (after new system works)
All 11 files in `src/modules/ai/tools/`:
- `booking.tools.ts`, `customer.tools.ts`, `scheduling.tools.ts`, `review.tools.ts`
- `payment.tools.ts`, `analytics.tools.ts`, `workflow.tools.ts`, `team.tools.ts`
- `booking.mutation-tools.ts`, `customer.mutation-tools.ts`, `notification.mutation-tools.ts`

### Untouched
- `ai.repository.ts`, `ai.schemas.ts`, `ai.router.ts` — conversation persistence unchanged
- `ai.approval.ts`, `ai.trust.ts` — kept for future mutation support
- `ai.actions.repository.ts`, `ai.config.repository.ts`, `ai.explainer.ts` — unchanged
- All tRPC routers, services, repositories — the module layer doesn't change
- `src/app/api/ai/stream/route.ts` — SSE endpoint unchanged (still calls `aiService.sendMessageStreaming`)

---

## Chunk 1: Introspection + Types

### Task 1: Add new stream event types to ai.types.ts

**Files:**
- Modify: `src/modules/ai/ai.types.ts`

- [ ] **Step 1: Read the current file**

Read `src/modules/ai/ai.types.ts` to confirm current state.

- [ ] **Step 2: Add code execution stream events and types**

Add these types at the end of the `AgentStreamEvent` union (before the closing of the type):

```typescript
// In the AgentStreamEvent type, add two new event types:
  | { type: "code_executing"; code: string }
  | { type: "code_result"; result: unknown; durationMs: number; callCount: number; error?: string }
```

Also add `workosUserId` to `AgentContext` (needed for building tRPC caller):

```typescript
export interface AgentContext {
  tenantId: string
  userId: string
  workosUserId: string  // <-- ADD THIS
  userPermissions: string[]
  pageContext?: PageContext
}
```

- [ ] **Step 3: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to ai.types.ts

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/ai.types.ts
git commit -m "feat(ai): add code execution stream event types"
```

---

### Task 2: Build router introspection

**Files:**
- Create: `src/modules/ai/ai.introspection.ts`

This is the most critical new file. It walks the tRPC router tree, extracts procedure names and input schemas, and caches them.

- [ ] **Step 1: Create the introspection module**

Create `src/modules/ai/ai.introspection.ts`:

```typescript
// src/modules/ai/ai.introspection.ts

import { z } from "zod"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.introspection" })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcedureMetadata {
  name: string
  type: "query" | "mutation"
  inputSchema: Record<string, unknown> | null
}

export interface ModuleMetadata {
  module: string
  procedures: ProcedureMetadata[]
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedModules: Map<string, ModuleMetadata> | null = null
let cachedIndex: string | null = null

// ---------------------------------------------------------------------------
// Introspection
// ---------------------------------------------------------------------------

/**
 * tRPC v11 stores a flattened `procedures` map in `appRouter._def.procedures`
 * with dot-separated keys like "booking.list", "booking.getById", etc.
 * Each value is a function (procedure) with a `_def` containing `type` and `inputs`.
 *
 * This is far simpler than walking the nested `record` tree — we just iterate
 * the flattened map and group by the first path segment (module name).
 */
function getRouter() {
  // Lazy import to avoid circular dependency:
  // ai.service.ts -> @/server/root -> @/modules/ai -> ai.service.ts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { appRouter } = require("@/server/root") as { appRouter: { _def: { procedures: Record<string, unknown> } } }
  return appRouter
}

function extractInputSchema(procedure: unknown): Record<string, unknown> | null {
  try {
    const def = (procedure as { _def?: { inputs?: unknown[] } })?._def
    const inputs = def?.inputs
    if (!inputs || inputs.length === 0) return null

    // tRPC v11 stores input validators in _def.inputs array.
    // The last entry is typically the user-defined .input() schema.
    const zodSchema = inputs[inputs.length - 1]
    if (zodSchema && typeof zodSchema === "object" && "_zod" in (zodSchema as Record<string, unknown>)) {
      const jsonSchema = z.toJSONSchema(zodSchema as z.ZodType) as Record<string, unknown>
      // Remove $schema key to save tokens
      delete jsonSchema["$schema"]
      return jsonSchema
    }
    return null
  } catch (err) {
    log.warn({ err }, "Failed to convert input schema to JSON Schema")
    return null
  }
}

/**
 * Build the module metadata map from appRouter._def.procedures.
 * Called once, cached thereafter.
 */
export function getModuleMap(): Map<string, ModuleMetadata> {
  if (cachedModules) return cachedModules

  const appRouter = getRouter()
  const procedures = (appRouter._def as { procedures: Record<string, unknown> }).procedures
  const moduleMap = new Map<string, ModuleMetadata>()

  for (const [path, procedure] of Object.entries(procedures)) {
    // path is like "booking.list" or "booking.approval.getPendingBookings"
    const segments = path.split(".")
    const moduleName = segments[0]
    const procedureName = segments.slice(1).join(".")

    if (!moduleName || !procedureName) continue

    const def = (procedure as { _def?: { type?: string } })?._def
    const type = def?.type
    if (type !== "query" && type !== "mutation") continue

    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, { module: moduleName, procedures: [] })
    }

    moduleMap.get(moduleName)!.procedures.push({
      name: procedureName,
      type: type as "query" | "mutation",
      inputSchema: extractInputSchema(procedure),
    })
  }

  cachedModules = moduleMap
  log.info(
    { moduleCount: moduleMap.size, totalProcedures: Array.from(moduleMap.values()).reduce((sum, m) => sum + m.procedures.length, 0) },
    "Router introspection complete"
  )
  return moduleMap
}

/**
 * Get the compact module index for the system prompt.
 * Lists only query procedure names grouped by module.
 */
export function getModuleIndex(): string {
  if (cachedIndex) return cachedIndex

  const moduleMap = getModuleMap()
  const lines: string[] = ["Available modules (use describe_module to see input schemas):"]

  for (const [moduleName, meta] of moduleMap) {
    const queryProcs = meta.procedures
      .filter((p) => p.type === "query")
      .map((p) => p.name)

    if (queryProcs.length > 0) {
      lines.push(`  ${moduleName}: ${queryProcs.join(", ")}`)
    }
  }

  cachedIndex = lines.join("\n")
  return cachedIndex
}

/**
 * Get full procedure metadata for a specific module.
 * Returns null if module not found.
 */
export function getModuleMetadata(moduleName: string): ModuleMetadata | null {
  const moduleMap = getModuleMap()
  return moduleMap.get(moduleName) ?? null
}

/**
 * Reset the cache (useful for testing).
 */
export function resetIntrospectionCache(): void {
  cachedModules = null
  cachedIndex = null
}
```

> **Note on tRPC v11 internals:** `appRouter._def.procedures` is a flattened `Record<string, Procedure>` where keys are dot-separated paths like `"booking.list"`. Each procedure is a function with `._def.type` ("query" | "mutation") and `._def.inputs` (array of Zod validators). This is much simpler than walking the nested `_def.record` tree and avoids issues with sub-router detection. The `appRouter` is lazy-imported via `require()` to avoid a circular dependency (ai.service → root → ai module → ai.service).

- [ ] **Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to ai.introspection.ts

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/ai.introspection.ts
git commit -m "feat(ai): add router introspection for module discovery"
```

---

### Task 3: Build the code executor

**Files:**
- Create: `src/modules/ai/ai.executor.ts`

- [ ] **Step 1: Create the executor module**

Create `src/modules/ai/ai.executor.ts`:

```typescript
// src/modules/ai/ai.executor.ts

import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.executor" })

const MAX_RESULT_BYTES = 4096
const EXECUTION_TIMEOUT_MS = 10_000

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>

/**
 * Execute a TypeScript code snippet with a pre-authenticated tRPC caller.
 *
 * The code runs in an async context with two injected variables:
 * - `trpc`: pre-authenticated tRPC caller (e.g., `await trpc.booking.list({})`)
 * - `ctx`: { tenantId, userId, userPermissions, pageContext }
 *
 * The code MUST use `return` to produce a result.
 *
 * NOT accessible: require, import, fetch, process, fs, globalThis, db, redis.
 */
export async function executeCode(
  code: string,
  trpc: unknown,
  ctx: { tenantId: string; userId: string; userPermissions: string[]; pageContext?: unknown }
): Promise<{ result: unknown; durationMs: number }> {
  const fn = new AsyncFunction("trpc", "ctx", code)
  const start = Date.now()

  const result = await Promise.race([
    fn(trpc, ctx),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Code execution timed out (10s limit)")), EXECUTION_TIMEOUT_MS)
    ),
  ])

  const durationMs = Date.now() - start
  log.info({ durationMs }, "Code execution complete")

  return { result: truncateResult(result), durationMs }
}

/**
 * Truncate large results to stay within context window budget.
 * Arrays are trimmed to first N items with _truncated metadata.
 */
function truncateResult(result: unknown): unknown {
  if (result === undefined || result === null) return result

  try {
    const json = JSON.stringify(result)
    if (json.length <= MAX_RESULT_BYTES) return result

    // If it's an array, trim items
    if (Array.isArray(result)) {
      return truncateArray(result)
    }

    // If it's an object with a `rows` array, trim that
    if (typeof result === "object" && result !== null && "rows" in result) {
      const obj = result as Record<string, unknown>
      if (Array.isArray(obj.rows)) {
        return { ...obj, rows: truncateArray(obj.rows) }
      }
    }

    // Last resort: take first N keys of the object
    if (typeof result === "object" && result !== null && !Array.isArray(result)) {
      const keys = Object.keys(result as Record<string, unknown>)
      const trimmed: Record<string, unknown> = {}
      for (const key of keys) {
        trimmed[key] = (result as Record<string, unknown>)[key]
        if (JSON.stringify(trimmed).length > MAX_RESULT_BYTES - 100) {
          delete trimmed[key]
          break
        }
      }
      return { ...trimmed, _truncated: { totalKeys: keys.length, shownKeys: Object.keys(trimmed).length } }
    }

    return { _error: "Result too large to serialize", _sizeBytes: json.length }
  } catch {
    return { _error: "Result too large to serialize" }
  }
}

function truncateArray(arr: unknown[]): unknown {
  const total = arr.length
  // Binary search for max items that fit
  let shown = Math.min(total, 10)
  while (shown > 1) {
    const slice = arr.slice(0, shown)
    const json = JSON.stringify(slice)
    if (json.length <= MAX_RESULT_BYTES - 100) break // leave room for metadata
    shown = Math.floor(shown / 2)
  }
  return {
    items: arr.slice(0, shown),
    _truncated: { total, shown },
  }
}
```

- [ ] **Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/ai.executor.ts
git commit -m "feat(ai): add code execution engine with timeout and truncation"
```

---

## Chunk 2: Tool Definitions + Prompt

### Task 4: Create describe_module tool

**Files:**
- Create: `src/modules/ai/tools/describe-module.tool.ts`

- [ ] **Step 1: Create the tool file**

Create `src/modules/ai/tools/describe-module.tool.ts`:

```typescript
// src/modules/ai/tools/describe-module.tool.ts

import type Anthropic from "@anthropic-ai/sdk"
import { getModuleMetadata } from "../ai.introspection"

export const describeModuleTool: Anthropic.Tool = {
  name: "describe_module",
  description:
    "Returns procedure names, types (query/mutation), and input schemas for a given module. " +
    "Call this before writing execute_code to learn available procedures and their expected inputs.",
  input_schema: {
    type: "object" as const,
    properties: {
      module: {
        type: "string",
        description: "The module name from the module index (e.g., 'booking', 'customer', 'analytics').",
      },
    },
    required: ["module"],
  },
}

export function handleDescribeModule(input: { module: string }): {
  result: unknown
  durationMs: number
} {
  const start = Date.now()
  const metadata = getModuleMetadata(input.module)

  if (!metadata) {
    return {
      result: { error: `Module "${input.module}" not found. Check the module index in the system prompt.` },
      durationMs: Date.now() - start,
    }
  }

  return {
    result: metadata,
    durationMs: Date.now() - start,
  }
}
```

- [ ] **Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/tools/describe-module.tool.ts
git commit -m "feat(ai): add describe_module tool for schema discovery"
```

---

### Task 5: Create execute_code tool

**Files:**
- Create: `src/modules/ai/tools/execute-code.tool.ts`

- [ ] **Step 1: Create the tool file**

Create `src/modules/ai/tools/execute-code.tool.ts`:

```typescript
// src/modules/ai/tools/execute-code.tool.ts

import type Anthropic from "@anthropic-ai/sdk"

export const executeCodeTool: Anthropic.Tool = {
  name: "execute_code",
  description:
    "Execute TypeScript code against the platform's tRPC API. " +
    "The code runs in an async context with `trpc` (pre-authenticated caller) and `ctx` (tenantId, userId, userPermissions, pageContext). " +
    "Use `return` to produce a result. Use `await` for all trpc calls. " +
    "Standard JS built-ins are available (Date, Math, JSON, Promise, Array methods). " +
    "Do NOT use require, import, fetch, or access globals beyond trpc and ctx.",
  input_schema: {
    type: "object" as const,
    properties: {
      code: {
        type: "string",
        description:
          "TypeScript code to execute. Must use `return` to produce a result. " +
          "Example: `const bookings = await trpc.booking.list({ limit: 10 }); return bookings;`",
      },
    },
    required: ["code"],
  },
}
```

- [ ] **Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/tools/execute-code.tool.ts
git commit -m "feat(ai): add execute_code tool definition"
```

---

### Task 6: Replace tools/index.ts

**Files:**
- Modify: `src/modules/ai/tools/index.ts`

- [ ] **Step 1: Replace the entire file**

Replace `src/modules/ai/tools/index.ts` with:

```typescript
// src/modules/ai/tools/index.ts

import type Anthropic from "@anthropic-ai/sdk"
import { describeModuleTool } from "./describe-module.tool"
import { executeCodeTool } from "./execute-code.tool"

export { describeModuleTool, handleDescribeModule } from "./describe-module.tool"
export { executeCodeTool } from "./execute-code.tool"

/**
 * The two tools sent to Claude in every request.
 * Replaces the previous 25-tool array.
 */
export const agentTools: Anthropic.Tool[] = [
  describeModuleTool,
  executeCodeTool,
]
```

- [ ] **Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Errors in ai.service.ts (it still imports old tools) — that's expected, we fix it in Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/tools/index.ts
git commit -m "feat(ai): replace 25-tool barrel with 2-tool exports"
```

---

### Task 7: Rewrite system prompt

**Files:**
- Modify: `src/modules/ai/ai.prompts.ts`

- [ ] **Step 1: Read current file**

Read `src/modules/ai/ai.prompts.ts` to confirm current state.

- [ ] **Step 2: Replace the entire file**

Replace `src/modules/ai/ai.prompts.ts` with:

```typescript
// src/modules/ai/ai.prompts.ts

import { getModuleIndex } from "./ai.introspection"
import type { PageContext } from "./ai.types"

const SYSTEM_PROMPT_TEMPLATE = `You are an AI assistant for a BNG (Biodiversity Net Gain) credit brokerage platform. You have access to the platform's tRPC API via a pre-authenticated \`trpc\` caller.

To answer questions, write TypeScript code that calls tRPC procedures and returns the relevant data. Your code runs in an async context — use await freely.

RULES FOR CODE:
- Always \`return\` your result — the return value is what you'll see.
- Use \`await\` for all trpc calls: \`await trpc.booking.list({ limit: 10 })\`
- You can use standard JS: filter, map, reduce, Promise.all, Date, Math, JSON, etc.
- Keep code concise. Fetch only what you need.
- If a call fails, the error message will tell you why. Try a different approach.
- Do NOT use require, import, fetch, or access any globals beyond trpc and ctx.
- Call describe_module("moduleName") to see input schemas before writing code.
- For list endpoints, results come back as { rows: [...], hasMore: boolean }.

DOMAIN CONTEXT:
This platform manages BNG (Biodiversity Net Gain) and nutrient credit brokerage. Key concepts:
- Sites: Habitat sites that produce biodiversity units (BDUs) or nutrient credits.
- Deals: Transactions between landowners (supply) and developers (demand). Stages: Lead → Qualified → Assessment Booked → Assessment Complete → S106 In Progress → NE Registered → Matched → Quote Sent → Credits Reserved → Contract Signed → Payment Received → Credits Allocated → Completed.
- Compliance: NE registration, HMMP, S106 agreements, monitoring reports.
- Catchments: Geographic regions constraining site/developer matching.
- Assessments: Ecological surveys (NN Baseline, BNG Habitat Survey).

TERMINOLOGY:
- Bookings → "site assessments" or "ecological surveys"
- Customers → "landowners" or "developers"
- Staff/Team → "ecologists", "brokers", "compliance officers"
- Workflows → "deal processes" or "compliance workflows"

RULES:
- You can ONLY query data (read-only). Do not attempt mutations.
- Always use tools to look up real data. Never guess or make up data.
- When the user refers to "this", "it", or "these", check ctx.pageContext to resolve the reference.
- Present data clearly. Use structured formats when showing multiple records.
- If a call returns null or empty results, say so clearly.
- Keep responses concise. Lead with the answer, then explain if needed.
- Use BNG domain terminology in responses.

PAGE CONTEXT:
{{pageContext}}

MODULE INDEX:
{{moduleIndex}}`

export function buildSystemPrompt(pageContext?: PageContext): string {
  const contextStr = pageContext
    ? `Route: ${pageContext.route}${pageContext.entityType ? `, Entity: ${pageContext.entityType}` : ""}${pageContext.entityId ? ` (ID: ${pageContext.entityId})` : ""}`
    : "No specific page context"

  return SYSTEM_PROMPT_TEMPLATE
    .replace("{{pageContext}}", contextStr)
    .replace("{{moduleIndex}}", getModuleIndex())
}
```

- [ ] **Step 3: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/ai.prompts.ts
git commit -m "feat(ai): rewrite system prompt for code execution model"
```

---

## Chunk 3: Service Layer Rewrite

### Task 8: Rewrite ai.service.ts for code execution

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

This is the largest change. The service layer switches from dispatching individual tools to handling two tools: `describe_module` (sync lookup) and `execute_code` (runs user code via executor).

- [ ] **Step 1: Read current file**

Read `src/modules/ai/ai.service.ts` to confirm current state.

- [ ] **Step 2: Replace the entire file**

Replace `src/modules/ai/ai.service.ts` with:

```typescript
// src/modules/ai/ai.service.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { redis } from "@/shared/redis"
import { db } from "@/shared/db"
import { BadRequestError } from "@/shared/errors"
import { createCallerFactory } from "@/shared/trpc"
import { aiRepository } from "./ai.repository"
import { agentTools, handleDescribeModule } from "./tools"
import { executeCode } from "./ai.executor"
import { buildSystemPrompt } from "./ai.prompts"
import type {
  AgentContext,
  AgentResponse,
  AgentStreamEvent,
  ToolCallRecord,
  ToolResultRecord,
  TokenUsage,
  PageContext,
} from "./ai.types"

const log = logger.child({ module: "ai.service" })

// Lazy-init singleton — NEVER construct at module load time
let anthropicClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic() // reads ANTHROPIC_API_KEY from env
  }
  return anthropicClient
}

// Lazy-init to avoid circular import (ai.service -> root -> ai module -> ai.service)
let cachedCreateCaller: ReturnType<typeof createCallerFactory> | null = null
function getCreateCaller() {
  if (!cachedCreateCaller) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { appRouter } = require("@/server/root") as { appRouter: Parameters<typeof createCallerFactory>[0] }
    cachedCreateCaller = createCallerFactory(appRouter)
  }
  return cachedCreateCaller
}

const MAX_TOOL_ITERATIONS = 5
const DEFAULT_MODEL = "claude-sonnet-4-20250514"
const MAX_TOKENS = 4096
const TOKEN_BUDGET = 50_000
const RATE_LIMIT_PER_MINUTE = 20

async function checkRateLimit(tenantId: string, userId: string): Promise<boolean> {
  const key = `ai:rate:${tenantId}:${userId}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60)
  }
  return current <= RATE_LIMIT_PER_MINUTE
}

/**
 * Build a pre-authenticated tRPC caller for the AI agent.
 * Every call goes through the full middleware stack: auth, tenant isolation, RBAC, rate limiting.
 *
 * IMPORTANT: `session.user.id` must be the WorkOS user ID (not internal DB ID),
 * because `tenantProcedure` middleware uses it to look up the DB user via
 * `eq(users.workosUserId, workosUserId)`.
 *
 * The original `Request` is threaded through for correct IP-based rate limiting.
 */
function buildTrpcCaller(ctx: AgentContext, req: Request) {
  const createCaller = getCreateCaller()
  return createCaller({
    db,
    session: { user: { id: ctx.workosUserId } } as Parameters<typeof createCaller>[0]["session"],
    tenantId: ctx.tenantId,
    tenantSlug: "",
    user: null, // Populated by tenantProcedure middleware from session
    requestId: crypto.randomUUID(),
    req,
  })
}

/**
 * Handle a tool call from Claude — either describe_module or execute_code.
 */
async function handleToolCall(
  toolName: string,
  toolInput: unknown,
  trpcCaller: ReturnType<typeof buildTrpcCaller>,
  ctx: AgentContext
): Promise<{ result: unknown; durationMs: number; callCount?: number; error?: string }> {
  if (toolName === "describe_module") {
    const input = toolInput as { module: string }
    return handleDescribeModule(input)
  }

  if (toolName === "execute_code") {
    const input = toolInput as { code: string }
    try {
      // Count tRPC calls by wrapping the caller with a proxy
      let callCount = 0
      const countingCaller = createCountingProxy(trpcCaller, () => { callCount++ })

      const { result, durationMs } = await executeCode(
        input.code,
        countingCaller,
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          userPermissions: ctx.userPermissions,
          pageContext: ctx.pageContext,
        }
      )
      return { result, durationMs, callCount }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Code execution failed"
      log.error({ err, code: input.code.slice(0, 200) }, "Code execution error")
      return { result: null, durationMs: 0, error: errorMsg }
    }
  }

  return { result: null, durationMs: 0, error: `Unknown tool: ${toolName}` }
}

/**
 * Create a proxy that counts procedure calls on the tRPC caller.
 * Works by intercepting property access at the procedure level.
 */
function createCountingProxy(caller: unknown, onCall: () => void): unknown {
  return new Proxy(caller as object, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === "function") {
        // This is a procedure call (e.g., trpc.booking.list)
        return (...args: unknown[]) => {
          onCall()
          return (value as (...a: unknown[]) => unknown).apply(target, args)
        }
      }
      if (typeof value === "object" && value !== null) {
        // This is a namespace (e.g., trpc.booking) — recurse
        return createCountingProxy(value, onCall)
      }
      return value
    },
  })
}

export const aiService = {
  async *sendMessageStreaming(
    tenantId: string,
    userId: string,
    workosUserId: string,
    userPermissions: string[],
    req: Request,
    input: {
      conversationId?: string
      message: string
      pageContext?: PageContext
    }
  ): AsyncGenerator<AgentStreamEvent> {
    // Rate limit check
    const allowed = await checkRateLimit(tenantId, userId)
    if (!allowed) {
      throw new BadRequestError("Rate limit exceeded. Please wait a moment before sending another message.")
    }

    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await aiRepository.getConversation(tenantId, input.conversationId)
      : null

    if (!conversation) {
      conversation = await aiRepository.createConversation(tenantId, userId)
    }

    // Token budget check
    if (conversation.tokenCount >= TOKEN_BUDGET) {
      throw new BadRequestError("This conversation has exceeded the token budget. Please start a new conversation.")
    }

    yield { type: "status", message: "Processing your message..." }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load conversation history
    const history = await aiRepository.getMessages(conversation.id, 20)

    // 4. Build Anthropic messages array from history
    const anthropicMessages: Anthropic.MessageParam[] = rebuildAnthropicMessages(history)

    // 5. Build agent context and tRPC caller
    const ctx: AgentContext = { tenantId, userId, workosUserId, userPermissions, pageContext: input.pageContext }
    const trpcCaller = buildTrpcCaller(ctx, req)

    // 6. Agent loop with streaming
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      log.info({ conversationId: conversation.id, iteration }, "Agent streaming iteration")

      const stream = getClient().messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(input.pageContext),
        messages: anthropicMessages,
        tools: agentTools,
      })

      const response = await stream.finalMessage()

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

      // Yield text deltas from text blocks
      for (const block of textBlocks) {
        if (block.text) {
          yield { type: "text_delta" as const, content: block.text }
        }
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0) {
        finalContent = textBlocks.map((b) => b.text).join("\n")
        break
      }

      // Append assistant message with tool_use content
      anthropicMessages.push({ role: "assistant", content: response.content })

      // Execute each tool call
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        const toolCallRecord: ToolCallRecord = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        }
        allToolCalls.push(toolCallRecord)

        // Emit appropriate stream event
        if (toolUse.name === "execute_code") {
          const codeInput = toolUse.input as { code: string }
          yield { type: "code_executing" as const, code: codeInput.code }
        } else {
          yield { type: "tool_call" as const, toolName: toolUse.name, input: toolUse.input }
        }

        // Execute
        const { result, durationMs, callCount, error } = await handleToolCall(
          toolUse.name,
          toolUse.input,
          trpcCaller,
          ctx
        )

        if (error) {
          allToolResults.push({ toolCallId: toolUse.id, output: null, error })
          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error }),
            is_error: true,
          })

          if (toolUse.name === "execute_code") {
            yield { type: "code_result" as const, result: null, durationMs, callCount: callCount ?? 0, error }
          } else {
            yield { type: "tool_result" as const, toolName: toolUse.name, result: { error }, durationMs }
          }
        } else {
          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result, null, 2),
          })

          if (toolUse.name === "execute_code") {
            yield { type: "code_result" as const, result, durationMs, callCount: callCount ?? 0 }
          } else {
            yield { type: "tool_result" as const, toolName: toolUse.name, result, durationMs }
          }
        }
      }

      // Append tool results
      anthropicMessages.push({ role: "user", content: toolResultBlocks })
    }

    // 7. Save assistant response
    const tokenUsage: TokenUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model: DEFAULT_MODEL,
    }

    await aiRepository.addMessage(conversation.id, {
      role: "assistant",
      content: finalContent,
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      tokenUsage,
    })

    // 8. Update conversation
    const newTokenCount = conversation.tokenCount + totalInputTokens + totalOutputTokens
    const updates: Record<string, unknown> = {
      tokenCount: newTokenCount,
      costCents: conversation.costCents + estimateCostCents(totalInputTokens, totalOutputTokens),
    }

    if (!conversation.title && history.length <= 2) {
      updates.title = input.message.slice(0, 100)
    }

    await aiRepository.updateConversation(conversation.id, updates)

    log.info(
      { conversationId: conversation.id, toolCalls: allToolCalls.length, inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      "Agent streaming response complete"
    )

    yield {
      type: "done" as const,
      content: finalContent,
      tokenUsage,
      toolCallCount: allToolCalls.length,
      conversationId: conversation.id,
    }
  },

  async sendMessage(
    tenantId: string,
    userId: string,
    workosUserId: string,
    userPermissions: string[],
    req: Request,
    input: {
      conversationId?: string
      message: string
      pageContext?: PageContext
    }
  ): Promise<AgentResponse> {
    // Rate limit check
    const allowed = await checkRateLimit(tenantId, userId)
    if (!allowed) {
      throw new BadRequestError("Rate limit exceeded. Please wait a moment before sending another message.")
    }

    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await aiRepository.getConversation(tenantId, input.conversationId)
      : null

    if (!conversation) {
      conversation = await aiRepository.createConversation(tenantId, userId)
    }

    if (conversation.tokenCount >= TOKEN_BUDGET) {
      throw new BadRequestError("This conversation has exceeded the token budget. Please start a new conversation.")
    }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load history + build messages
    const history = await aiRepository.getMessages(conversation.id, 20)
    const anthropicMessages: Anthropic.MessageParam[] = rebuildAnthropicMessages(history)

    // 4. Build context + caller
    const ctx: AgentContext = { tenantId, userId, workosUserId, userPermissions, pageContext: input.pageContext }
    const trpcCaller = buildTrpcCaller(ctx, req)

    // 5. Agent loop
    const allToolCalls: ToolCallRecord[] = []
    const allToolResults: ToolResultRecord[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalContent = ""

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      log.info({ conversationId: conversation.id, iteration }, "Agent iteration")

      const response = await getClient().messages.create({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(input.pageContext),
        messages: anthropicMessages,
        tools: agentTools,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

      if (toolUseBlocks.length === 0) {
        finalContent = textBlocks.map((b) => b.text).join("\n")
        break
      }

      anthropicMessages.push({ role: "assistant", content: response.content })
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        allToolCalls.push({ id: toolUse.id, name: toolUse.name, input: toolUse.input })

        const { result, error } = await handleToolCall(toolUse.name, toolUse.input, trpcCaller, ctx)

        if (error) {
          allToolResults.push({ toolCallId: toolUse.id, output: null, error })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error }), is_error: true })
        } else {
          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result, null, 2) })
        }
      }

      anthropicMessages.push({ role: "user", content: toolResultBlocks })
    }

    // 6. Save + update
    const tokenUsage: TokenUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model: DEFAULT_MODEL,
    }

    const assistantMessage = await aiRepository.addMessage(conversation.id, {
      role: "assistant",
      content: finalContent,
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      tokenUsage,
    })

    const newTokenCount = conversation.tokenCount + totalInputTokens + totalOutputTokens
    const updates: Record<string, unknown> = {
      tokenCount: newTokenCount,
      costCents: conversation.costCents + estimateCostCents(totalInputTokens, totalOutputTokens),
    }

    if (!conversation.title && history.length <= 2) {
      updates.title = input.message.slice(0, 100)
    }

    await aiRepository.updateConversation(conversation.id, updates)

    log.info(
      { conversationId: conversation.id, toolCalls: allToolCalls.length, inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      "Agent response complete"
    )

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      content: finalContent,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
      tokenUsage,
    }
  },
}

/**
 * Rebuild Anthropic-compatible messages from stored history.
 */
function rebuildAnthropicMessages(
  history: { role: string; content: string; toolCalls?: ToolCallRecord[] | null; toolResults?: ToolResultRecord[] | null }[]
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = []

  for (const m of history) {
    if (m.role === "system") continue

    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      const contentBlocks: Anthropic.ContentBlockParam[] = []

      if (m.content) {
        contentBlocks.push({ type: "text", text: m.content })
      }

      for (const tc of m.toolCalls) {
        contentBlocks.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.input as Record<string, unknown>,
        })
      }

      msgs.push({ role: "assistant", content: contentBlocks })

      if (m.toolResults && m.toolResults.length > 0) {
        const resultBlocks: Anthropic.ToolResultBlockParam[] = m.toolResults.map((tr) => ({
          type: "tool_result" as const,
          tool_use_id: tr.toolCallId,
          content: tr.error
            ? JSON.stringify({ error: tr.error })
            : JSON.stringify(tr.output, null, 2),
          ...(tr.error ? { is_error: true } : {}),
        }))
        msgs.push({ role: "user", content: resultBlocks })
      }
    } else {
      msgs.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    }
  }

  return msgs
}

function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 300
  const outputCostPer1M = 1500
  const cost = (inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M
  return Math.ceil(cost)
}
```

- [ ] **Step 3: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (or only errors in test files which reference old tool types — fixed next).

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/ai.service.ts
git commit -m "feat(ai): rewrite service layer for code execution model"
```

---

### Task 8b: Update callers to pass workosUserId and req

**Files:**
- Modify: `src/app/api/ai/stream/route.ts`
- Modify: `src/modules/ai/ai.router.ts`

The service now requires `workosUserId` and `req`. Both callers need updating.

- [ ] **Step 1: Update SSE route**

In `src/app/api/ai/stream/route.ts`, update the call to `aiService.sendMessageStreaming`:

```typescript
// Change from:
const eventStream = aiService.sendMessageStreaming(
  tenantId,
  dbUser.id,
  userPermissions,
  {
    conversationId: body.conversationId,
    message: body.message,
    pageContext: body.pageContext,
  }
)

// Change to:
const eventStream = aiService.sendMessageStreaming(
  tenantId,
  dbUser.id,
  authResult.user.id,  // WorkOS user ID
  userPermissions,
  req,                  // Original request for IP-based rate limiting
  {
    conversationId: body.conversationId,
    message: body.message,
    pageContext: body.pageContext,
  }
)
```

- [ ] **Step 2: Update tRPC router**

In `src/modules/ai/ai.router.ts`, update the `sendMessage` mutation to pass WorkOS user ID and request:

```typescript
sendMessage: moduleProcedure
  .input(sendMessageSchema)
  .mutation(async ({ ctx, input }) => {
    const userPermissions = getUserPermissions(ctx.user as UserWithRoles)

    return aiService.sendMessage(
      ctx.tenantId,
      ctx.user!.id,
      ctx.session!.user.id,  // WorkOS user ID from session
      userPermissions,
      ctx.req,               // Original request from tRPC context
      {
        conversationId: input.conversationId,
        message: input.message,
        pageContext: input.pageContext,
      }
    )
  }),
```

- [ ] **Step 3: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/stream/route.ts src/modules/ai/ai.router.ts
git commit -m "feat(ai): thread workosUserId and request through to tRPC caller"
```

---

## Chunk 4: Delete Old Tools + Update Tests

### Task 9: Delete old tool files

**Files:**
- Delete: All 11 old tool files

- [ ] **Step 1: Delete old tool files**

```bash
rm src/modules/ai/tools/booking.tools.ts
rm src/modules/ai/tools/customer.tools.ts
rm src/modules/ai/tools/scheduling.tools.ts
rm src/modules/ai/tools/review.tools.ts
rm src/modules/ai/tools/payment.tools.ts
rm src/modules/ai/tools/analytics.tools.ts
rm src/modules/ai/tools/workflow.tools.ts
rm src/modules/ai/tools/team.tools.ts
rm src/modules/ai/tools/booking.mutation-tools.ts
rm src/modules/ai/tools/customer.mutation-tools.ts
rm src/modules/ai/tools/notification.mutation-tools.ts
```

- [ ] **Step 2: Verify no import errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
The only remaining errors should be in the test file (ai.test.ts) — nothing else should reference these files.

- [ ] **Step 3: Commit**

```bash
git add -u src/modules/ai/tools/
git commit -m "refactor(ai): remove 11 individual tool files replaced by code execution"
```

---

### Task 10: Update tests

**Files:**
- Modify: `src/modules/ai/__tests__/ai.test.ts`

The existing tests mock individual tools. We need to update them for the new 2-tool system.

- [ ] **Step 1: Read current test file**

Read `src/modules/ai/__tests__/ai.test.ts` in full.

- [ ] **Step 2: Rewrite tests for new architecture**

The test file needs significant changes. Key test cases for the new system:

1. **Introspection**: `getModuleMap()` returns modules with procedures, `getModuleIndex()` returns compact string
2. **Executor**: `executeCode()` runs code, respects timeout, truncates results
3. **Tool handling**: `handleDescribeModule()` returns metadata, handles unknown module
4. **Service integration**: The agent loop correctly dispatches describe_module and execute_code

Replace the test file with tests covering these. The exact test code should be adapted based on what the current test file actually tests (read it first, then rewrite to match the new architecture).

Key mock structure stays the same (mock db, schema, redis, anthropic) — the test patterns don't change, just what's being tested.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/modules/ai/__tests__/ai.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/__tests__/ai.test.ts
git commit -m "test(ai): rewrite tests for code execution engine"
```

---

## Chunk 5: Frontend — CodeExecutionBlock

### Task 11: Add CodeExecutionBlock to chat UI

**Files:**
- Modify: `src/app/admin/ai-chat/page.tsx`

- [ ] **Step 1: Read current page.tsx**

Read the full file to confirm current state.

- [ ] **Step 2: Add new stream event types**

Update the `StreamEvent` type to include the new events:

```typescript
type StreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; result: unknown; durationMs: number }
  | { type: "code_executing"; code: string }
  | { type: "code_result"; result: unknown; durationMs: number; callCount: number; error?: string }
  | { type: "text_delta"; content: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; content: string; tokenUsage: TokenUsage; toolCallCount: number; conversationId?: string }
```

- [ ] **Step 3: Add CodeExecutionBlock component**

Add this component after the existing `StreamingToolCall` component (around line 133):

```tsx
// ---------------------------------------------------------------------------
// Code Execution Block
// ---------------------------------------------------------------------------

import { Code2, ChevronDown, ChevronRight } from "lucide-react"

function CodeExecutionBlock({
  code,
  result,
  durationMs,
  callCount,
  error,
  isStreaming,
}: {
  code: string
  result?: unknown
  durationMs?: number
  callCount?: number
  error?: string
  isStreaming?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isDone = result !== undefined || error !== undefined

  return (
    <div className="my-2">
      {/* Summary line */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs w-full text-left hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
      >
        <div className="shrink-0">
          {isDone ? (
            error ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
          )}
        </div>
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-foreground">
          {isDone
            ? error
              ? "Code execution failed"
              : `Executed ${callCount ?? 0} tRPC call${callCount === 1 ? "" : "s"} in ${durationMs}ms`
            : "Executing code..."}
        </span>
        <div className="ml-auto shrink-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded: code + result */}
      {expanded && (
        <div className="mt-1.5 border border-border rounded-lg overflow-hidden text-xs">
          <pre className="bg-muted/50 p-3 overflow-x-auto font-mono text-foreground/80 leading-relaxed">
            {code}
          </pre>
          {isDone && (
            <>
              <div className="border-t border-border" />
              <pre className={`p-3 overflow-x-auto font-mono leading-relaxed ${error ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20" : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"}`}>
                {error
                  ? `Error: ${error}`
                  : `Result: ${JSON.stringify(result, null, 2)}`}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

Also add `Code2`, `ChevronDown`, `ChevronRight` to the lucide-react import at the top of the file.

- [ ] **Step 4: Add streaming state for code execution**

Add new state to the `StreamingToolState` interface and `StreamingBubble`:

Update `StreamingToolState`:
```typescript
interface StreamingToolState {
  toolName: string
  input: unknown
  result?: unknown
  durationMs?: number
  error?: string
}

interface StreamingCodeState {
  code: string
  result?: unknown
  durationMs?: number
  callCount?: number
  error?: string
}
```

Add state in `AIChatPage`:
```typescript
const [streamingCodeBlocks, setStreamingCodeBlocks] = useState<StreamingCodeState[]>([])
```

Reset in the `handleSend` function alongside the other resets:
```typescript
setStreamingCodeBlocks([])
```

Also reset in the `finally` block:
```typescript
setStreamingCodeBlocks([])
```

- [ ] **Step 5: Handle new events in the stream reader**

In the `handleSend` function's event switch statement, add cases:

```typescript
case "code_executing": {
  const codeBlock: StreamingCodeState = { code: event.code }
  collectedCodeBlocks.push(codeBlock)
  setStreamingCodeBlocks([...collectedCodeBlocks])
  setStreamingStatus(null)
  break
}

case "code_result": {
  const lastBlock = collectedCodeBlocks[collectedCodeBlocks.length - 1]
  if (lastBlock) {
    lastBlock.result = event.result
    lastBlock.durationMs = event.durationMs
    lastBlock.callCount = event.callCount
    if (event.error) lastBlock.error = event.error
    setStreamingCodeBlocks([...collectedCodeBlocks])
  }
  break
}
```

Add `const collectedCodeBlocks: StreamingCodeState[] = []` alongside the existing `collectedToolCalls`.

- [ ] **Step 6: Update StreamingBubble to render code blocks**

Pass `codeBlocks` to `StreamingBubble` and render them:

```tsx
function StreamingBubble({
  content,
  toolCalls,
  codeBlocks,
  statusMessage,
}: {
  content: string
  toolCalls: StreamingToolState[]
  codeBlocks: StreamingCodeState[]
  statusMessage: string | null
}) {
  // In the render, add code blocks after tool calls:
  {codeBlocks.length > 0 && (
    <>
      {codeBlocks.map((cb, i) => (
        <CodeExecutionBlock
          key={`code-${i}`}
          code={cb.code}
          result={cb.result}
          durationMs={cb.durationMs}
          callCount={cb.callCount}
          error={cb.error}
          isStreaming={cb.result === undefined && cb.error === undefined}
        />
      ))}
      {content && <Separator className="my-3" />}
    </>
  )}
```

Update the `<StreamingBubble>` invocation to pass the new prop:
```tsx
<StreamingBubble
  content={streamingContent}
  toolCalls={streamingToolCalls}
  codeBlocks={streamingCodeBlocks}
  statusMessage={streamingStatus}
/>
```

- [ ] **Step 7: Update MessageBubble for stored code execution blocks**

For loaded messages that used `execute_code`, we need to render them as code blocks too. In `MessageBubble`, detect tool calls named `execute_code` and render them with `CodeExecutionBlock` instead of `ToolCallDisplay`:

In the assistant message rendering section, update the tool call display logic:

```tsx
{message.toolCalls && message.toolCalls.length > 0 && (
  <>
    {message.toolCalls.some((tc) => tc.name === "execute_code") ? (
      // Code execution blocks
      message.toolCalls
        .filter((tc) => tc.name === "execute_code")
        .map((tc) => {
          const result = (message.toolResults ?? []).find((r) => r.toolCallId === tc.id)
          const codeInput = tc.input as { code: string }
          return (
            <CodeExecutionBlock
              key={tc.id}
              code={codeInput.code}
              result={result?.output}
              durationMs={undefined}
              callCount={undefined}
              error={result?.error}
            />
          )
        })
    ) : (
      <>
        <p className="text-xs text-muted-foreground italic mb-2">
          Reasoning across modules...
        </p>
        <ToolCallDisplay
          toolCalls={message.toolCalls}
          toolResults={message.toolResults}
        />
      </>
    )}
    {/* describe_module calls (if any alongside execute_code) */}
    {message.toolCalls.some((tc) => tc.name === "describe_module") && (
      <div className="space-y-1.5 my-1">
        {message.toolCalls
          .filter((tc) => tc.name === "describe_module")
          .map((tc) => {
            const result = (message.toolResults ?? []).find((r) => r.toolCallId === tc.id)
            return (
              <StreamingToolCall
                key={tc.id}
                toolName={tc.name}
                input={tc.input}
                result={result?.output}
                durationMs={undefined}
                error={result?.error}
              />
            )
          })}
      </div>
    )}
    {message.content && <Separator className="my-3" />}
  </>
)}
```

- [ ] **Step 8: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/ai-chat/page.tsx
git commit -m "feat(ai): add CodeExecutionBlock component for new execution model"
```

---

## Chunk 6: Build + Full Verification

### Task 12: Full build and test verification

- [ ] **Step 1: Run tsc**

Run: `npx tsc --noEmit --pretty`
Expected: 0 errors.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (224+ tests).

- [ ] **Step 3: Run next build**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -30`
Expected: Build succeeds.

- [ ] **Step 4: Verify file tree**

The final `src/modules/ai/tools/` directory should contain exactly:
```
src/modules/ai/tools/
  describe-module.tool.ts
  execute-code.tool.ts
  index.ts
```

Run: `ls src/modules/ai/tools/`
Expected: Only 3 files.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(ai): resolve build issues from code execution migration"
```

---

## Implementation Notes

### tRPC Caller Session Handling

The `buildTrpcCaller` passes `workosUserId` as `session.user.id` because `tenantProcedure` middleware does `eq(users.workosUserId, ctx.session.user.id)` to load the DB user. The `workosUserId` is threaded from the SSE route (which has `authResult.user.id`) through the service. The original `Request` is also threaded through for correct IP-based rate limiting.

### Introspection Approach

Uses `appRouter._def.procedures` — a flattened `Record<string, Procedure>` with dot-separated keys (e.g., `"booking.list"`). This is simpler and more reliable than walking the nested `_def.record` tree.

Edge cases:
- Sub-routers (like `booking.approval`) appear as deeper paths: `"approval.getPendingBookings"`.
- Some procedures may use `z.void()` or no input — `inputSchema` will be `null`.
- The `_zod` property check ensures we only try to convert actual Zod schemas.
- Both `appRouter` and `createCallerFactory(appRouter)` are lazy-imported via `require()` to break the circular dependency: `ai.service → root → ai module → ai.service`.

### AsyncFunction Security

The `executeCode` function uses `AsyncFunction` which runs in the **same V8 context** as the server. This means `process`, `require`, `globalThis`, and other Node globals are technically accessible from within the executed code. The system prompt instructs Claude not to use them, and the tRPC middleware enforces auth/RBAC/tenant isolation on all API calls, but there is **no runtime sandbox**.

This is acceptable because:
1. The AI is our code author, not untrusted user input
2. All data access goes through tRPC middleware (auth, RBAC, tenant isolation)
3. The design spec explicitly notes this trade-off and flags `isolated-vm` as a future upgrade

If end users ever write code (not just Claude), swap `AsyncFunction` for `isolated-vm` or `vm.runInNewContext` with a restricted global scope.

### Counting Proxy

The counting proxy wraps the tRPC caller to track how many procedure calls the AI's code makes. This is used for the UI summary ("Executed 3 tRPC calls in 240ms"). It uses recursive Proxy to handle nested namespaces (e.g., `trpc.booking.list()` — first access `booking`, then call `list`).

### Backward Compatibility

Old conversations that stored tool calls with names like `booking_list` will still render — the `MessageBubble` component falls back to `ToolCallDisplay` for non-`execute_code` tool calls. No migration needed.
