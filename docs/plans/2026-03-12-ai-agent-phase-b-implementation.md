# AI Agent Phase B Implementation Plan (Updated for Code Execution Model)

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Add mutation support to the code execution engine, a guardrail/approval system at the tRPC procedure level, explainability ("Why" button), and a trust ratchet. The agent can now take actions (create bookings, update statuses, send notifications) via `execute_code` calling tRPC mutation procedures, with user approval where required. Every mutation is auditable and explainable.

**Timeline:** 6 working days

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md` (Section 2: Guardrails, Section 10: Phase B)
**Code Execution Engine Design:** `docs/plans/2026-03-12-ai-code-execution-engine-design.md`

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **No individual mutation tool files.** The agent writes TypeScript code via `execute_code` that calls tRPC procedures directly (e.g., `await trpc.booking.updateStatus({...})`). Mutations flow through the same tRPC middleware stack as queries.
2. **Three-tier guardrail classification at the procedure level.** Every tRPC mutation procedure is classified: `AUTO` (execute immediately), `CONFIRM` (pause for user approval), `RESTRICT` (blocked). Classification is per-procedure-path, overridable per-tenant via `ai_tenant_config.guardrailOverrides`.
3. **Guarded tRPC caller proxy.** A wrapper around the tRPC caller intercepts mutation calls. It checks the procedure's guardrail tier. For CONFIRM, it pauses execution and emits an `approval_required` stream event. For RESTRICT, it throws. For AUTO, it logs and executes.
4. **Code execution pauses on CONFIRM.** When code calls a CONFIRM mutation, the guarded proxy throws a special `ApprovalRequiredError` with the action details. The service catches this, emits the approval event, polls Redis for the user's decision, then re-executes the code if approved.
5. **`agent_actions` table tracks every mutation.** Already exists. Records procedure path, input, output, status, approval metadata.
6. **"Why" button uses Haiku.** Already implemented in `ai.explainer.ts`. Works with procedure names.
7. **Trust ratchet is passive in Phase B.** Already implemented in `ai.trust.ts`. Tracks acceptance/rejection rates per procedure per tenant.
8. **Approval flow uses Redis polling.** Already implemented in `ai.approval.ts`. Needs minor updates to work with procedure names instead of `MutatingAgentTool`.

---

## What Already Exists (from previous Phase B partial implementation)

These files exist and are mostly correct — they just need updates for the code execution model:

- `src/shared/db/schemas/ai.schema.ts` — `agentActions` + `aiTenantConfig` tables ✓
- `src/modules/ai/ai.actions.repository.ts` — CRUD for agent actions ✓
- `src/modules/ai/ai.config.repository.ts` — tenant config with guardrail overrides ✓
- `src/modules/ai/ai.approval.ts` — approval flow engine (needs MutatingAgentTool removal)
- `src/modules/ai/ai.explainer.ts` — "Why" button ✓ (works as-is)
- `src/modules/ai/ai.trust.ts` — trust ratchet ✓ (works as-is)
- `src/modules/ai/ai.types.ts` — has `GuardrailTier`, `AgentActionRecord`, `MutatingAgentTool`, etc.

---

## Progress Tracking

```
[ ] Task 1: Guardrail registry — default procedure classifications
[ ] Task 2: Update ai.introspection.ts — include mutations in module index
[ ] Task 3: Update ai.prompts.ts — allow mutations, add guardrail context
[ ] Task 4: Guarded tRPC caller proxy
[ ] Task 5: Update ai.approval.ts — remove MutatingAgentTool dependency
[ ] Task 6: Update ai.service.ts — integrate guarded caller + approval flow
[ ] Task 7: New Zod schemas + router procedures
[ ] Task 8: Update chat UI — approval cards + approval_resolved events
[ ] Task 9: Tests
[ ] Task 10: Verification — tsc + build + tests
```

---

## Codebase Patterns Reference

All patterns from Phase A apply. Key reminders:

```typescript
// Module structure
src/modules/{module}/
  {module}.types.ts, {module}.schemas.ts, {module}.repository.ts,
  {module}.service.ts, {module}.router.ts, {module}.events.ts, index.ts

// Pino logging: object FIRST, message SECOND
log.info({ field }, "message")

// Zod v4: z.uuid() not z.string().uuid()
// NEVER throw TRPCError in repo/service
// Lazy-init for external clients (Anthropic, etc.)

// Current tool model (2 tools only):
// execute_code — runs TypeScript against tRPC caller
// describe_module — returns procedure schemas for a module

// tRPC caller is built per-request in ai.service.ts:
// createCallerFactory(appRouter)({ db, session, tenantId, ... })
```

---

## Task 1: Guardrail Registry — Default Procedure Classifications

**Files:**
- Create: `src/modules/ai/ai.guardrails.ts`

This file defines the default guardrail tier for every mutation procedure. When not listed, mutations default to CONFIRM.

```typescript
// src/modules/ai/ai.guardrails.ts

import { aiConfigRepository } from "./ai.config.repository"
import type { GuardrailTier } from "./ai.types"

/**
 * Default guardrail tiers for mutation procedures.
 * Key = full tRPC procedure path (e.g., "booking.updateStatus").
 * Procedures not listed default to CONFIRM.
 */
const DEFAULT_GUARDRAIL_TIERS: Record<string, GuardrailTier> = {
  // --- AUTO: Low-risk, append-only operations ---
  "booking.addNote": "AUTO",
  "customer.addNote": "AUTO",
  "customer.updateTags": "AUTO",

  // --- CONFIRM: Significant state changes ---
  "booking.updateStatus": "CONFIRM",
  "booking.create": "CONFIRM",
  "booking.cancel": "CONFIRM",
  "customer.create": "CONFIRM",
  "customer.update": "CONFIRM",
  "customer.merge": "CONFIRM",
  "scheduling.createSlot": "CONFIRM",
  "scheduling.deleteSlot": "CONFIRM",
  "review.respond": "CONFIRM",
  "workflow.create": "CONFIRM",
  "workflow.update": "CONFIRM",
  "workflow.execute": "CONFIRM",
  "team.updateAvailability": "CONFIRM",
  "team.updateCapacity": "CONFIRM",

  // --- RESTRICT: Dangerous / irreversible ---
  "customer.delete": "RESTRICT",
  "tenant.updateSettings": "RESTRICT",
  "platform.createTenant": "RESTRICT",
  "platform.deleteTenant": "RESTRICT",
}

/**
 * Resolve the effective guardrail tier for a procedure.
 * Priority: tenant override > default registry > CONFIRM fallback.
 */
export async function resolveGuardrailTier(
  tenantId: string,
  procedurePath: string
): Promise<GuardrailTier> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  return (
    config.guardrailOverrides[procedurePath] ??
    DEFAULT_GUARDRAIL_TIERS[procedurePath] ??
    "CONFIRM"
  )
}

/**
 * Get the default tier (without tenant overrides) for a procedure.
 * Used for display/documentation purposes.
 */
export function getDefaultGuardrailTier(procedurePath: string): GuardrailTier {
  return DEFAULT_GUARDRAIL_TIERS[procedurePath] ?? "CONFIRM"
}

/**
 * List all procedures with explicit guardrail classifications.
 * Used by admin UI and trust ratchet.
 */
export function listGuardrailDefaults(): Record<string, GuardrailTier> {
  return { ...DEFAULT_GUARDRAIL_TIERS }
}
```

**Commit:** `feat(ai): add guardrail registry with default procedure classifications`

---

## Task 2: Update ai.introspection.ts — Include Mutations in Module Index

**Files:**
- Modify: `src/modules/ai/ai.introspection.ts`

Currently `getModuleIndex()` only shows query procedures. Update it to also show mutation procedures, annotated with their guardrail tier.

**Changes:**

1. Import `getDefaultGuardrailTier` from `./ai.guardrails`
2. Update `getModuleIndex()` to include a second section for mutation procedures
3. Each mutation line shows the guardrail tier: `.updateStatus({ id, status }) [CONFIRM]`

The updated `getModuleIndex()` should produce output like:

```
Available query procedures (use describe_module for full input schemas if needed):

  booking:
    .list({ status?, limit?, cursor?, customerId? })
    .getById({ id })

Available mutation procedures (guardrail tier shown):

  booking:
    .updateStatus({ id, status }) [CONFIRM]
    .addNote({ bookingId, content }) [AUTO]
  customer:
    .addNote({ customerId, content }) [AUTO]
    .updateTags({ customerId, tags }) [AUTO]
```

Read `src/modules/ai/ai.introspection.ts` before modifying. Update `getModuleIndex()` — add a second loop over mutation procedures with guardrail annotations. The `cachedIndex` field should be invalidated if guardrail defaults change (but in practice they're static).

**Commit:** `feat(ai): include mutation procedures with guardrail tiers in module index`

---

## Task 3: Update ai.prompts.ts — Allow Mutations

**Files:**
- Modify: `src/modules/ai/ai.prompts.ts`

**Changes:**

1. Remove "Read-only. Never attempt mutations." constraint
2. Add mutation rules explaining the guardrail system
3. Add explanation of what happens for each tier

Update the `SYSTEM_PROMPT_TEMPLATE` to include:

```
## Mutations

You can now call mutation procedures (marked in the procedure index below).
Each mutation has a guardrail tier:
- **AUTO**: Executes immediately. Low-risk operations like adding notes.
- **CONFIRM**: Requires user approval before executing. The UI will show an approval card.
- **RESTRICT**: Blocked. You cannot call these procedures.

When you call a CONFIRM mutation, the system will pause and ask the user to approve.
If approved, your code re-runs and the mutation executes. If rejected, you'll get an error.

RULES FOR MUTATIONS:
- Always explain what you're about to do BEFORE writing mutation code.
- For CONFIRM mutations, write the code — the system handles the approval flow.
- Never call RESTRICT mutations — they will throw an error.
- If a mutation fails, explain the error to the user.
```

Also remove the "Read-only mode" badge text reference if it exists in the prompt. The chat UI badge will be updated separately.

**Commit:** `feat(ai): update system prompt to allow mutations with guardrail rules`

---

## Task 4: Guarded tRPC Caller Proxy

**Files:**
- Create: `src/modules/ai/ai.guarded-caller.ts`

This is the core innovation. It wraps the tRPC caller with a Proxy that intercepts mutation procedure calls. Before executing a mutation, it checks the guardrail tier and either executes (AUTO), throws for approval (CONFIRM), or blocks (RESTRICT).

```typescript
// src/modules/ai/ai.guarded-caller.ts

import { logger } from "@/shared/logger"
import { resolveGuardrailTier } from "./ai.guardrails"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import { getModuleMap } from "./ai.introspection"
import type { GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.guarded-caller" })

/**
 * Error thrown when a mutation requires user approval.
 * The service layer catches this, emits the approval event,
 * and waits for the user's decision.
 */
export class ApprovalRequiredError extends Error {
  constructor(
    public readonly actionId: string,
    public readonly procedurePath: string,
    public readonly procedureInput: unknown,
    public readonly description: string
  ) {
    super(`Approval required for ${procedurePath}`)
    this.name = "ApprovalRequiredError"
  }
}

/**
 * Error thrown when a RESTRICT mutation is attempted.
 */
export class RestrictedProcedureError extends Error {
  constructor(public readonly procedurePath: string) {
    super(`Procedure "${procedurePath}" is restricted and cannot be called by the AI agent.`)
    this.name = "RestrictedProcedureError"
  }
}

interface GuardedCallerOptions {
  tenantId: string
  userId: string
  conversationId: string
  /** Set of procedure paths that have been approved in this execution */
  approvedProcedures?: Set<string>
}

/**
 * Wrap a tRPC caller with guardrail enforcement.
 *
 * For query procedures: pass through unchanged.
 * For mutation procedures:
 *   - AUTO: Log to agent_actions, execute
 *   - CONFIRM: Create pending agent_action, throw ApprovalRequiredError
 *   - RESTRICT: Throw RestrictedProcedureError
 *
 * Uses ES Proxy to intercept property access on the caller.
 * The tRPC caller is shaped like: caller.module.procedure(input)
 * So we need a two-level proxy: first for module access, then for procedure call.
 */
export async function createGuardedCaller(
  caller: unknown,
  options: GuardedCallerOptions
): Promise<unknown> {
  const moduleMap = await getModuleMap()

  return new Proxy(caller as Record<string, unknown>, {
    get(target, moduleName: string) {
      const moduleValue = target[moduleName]
      if (typeof moduleValue !== "object" || moduleValue === null) {
        return moduleValue
      }

      // Check if this module has any procedures we know about
      const moduleMeta = moduleMap.get(moduleName)
      if (!moduleMeta) {
        return moduleValue // Unknown module, pass through
      }

      // Proxy the module object to intercept procedure calls
      return new Proxy(moduleValue as Record<string, unknown>, {
        get(moduleTarget, procedureName: string) {
          const procedureValue = moduleTarget[procedureName]
          if (typeof procedureValue !== "function") {
            return procedureValue
          }

          const procedurePath = `${moduleName}.${procedureName}`
          const procMeta = moduleMeta.procedures.find((p) => p.name === procedureName)

          // If it's a query or unknown type, pass through
          if (!procMeta || procMeta.type === "query") {
            return procedureValue
          }

          // It's a mutation — wrap with guardrail check
          return async (input: unknown) => {
            const tier = await resolveGuardrailTier(options.tenantId, procedurePath)

            if (tier === "RESTRICT") {
              throw new RestrictedProcedureError(procedurePath)
            }

            if (tier === "AUTO") {
              // Log and execute
              const action = await agentActionsRepository.create({
                conversationId: options.conversationId,
                tenantId: options.tenantId,
                userId: options.userId,
                toolName: procedurePath,
                toolInput: input,
                guardrailTier: "AUTO",
                isReversible: false,
              })

              try {
                const result = await (procedureValue as (input: unknown) => Promise<unknown>)(input)
                await agentActionsRepository.updateStatus(action.id, {
                  status: "auto_executed",
                  toolOutput: result,
                })
                log.info({ procedurePath, actionId: action.id }, "AUTO mutation executed")
                return result
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Execution failed"
                await agentActionsRepository.updateStatus(action.id, {
                  status: "failed",
                  error: errorMsg,
                })
                throw err
              }
            }

            // CONFIRM tier
            // Check if already approved in this execution cycle
            if (options.approvedProcedures?.has(procedurePath)) {
              // Already approved — execute
              const action = await agentActionsRepository.create({
                conversationId: options.conversationId,
                tenantId: options.tenantId,
                userId: options.userId,
                toolName: procedurePath,
                toolInput: input,
                guardrailTier: "CONFIRM",
                isReversible: false,
              })

              try {
                const result = await (procedureValue as (input: unknown) => Promise<unknown>)(input)
                await agentActionsRepository.updateStatus(action.id, {
                  status: "executed",
                  toolOutput: result,
                  approvedBy: options.userId,
                })
                await aiConfigRepository.recordApprovalDecision(options.tenantId, procedurePath, true)
                return result
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Execution failed"
                await agentActionsRepository.updateStatus(action.id, {
                  status: "failed",
                  error: errorMsg,
                })
                throw err
              }
            }

            // Create pending action and throw for approval
            const action = await agentActionsRepository.create({
              conversationId: options.conversationId,
              tenantId: options.tenantId,
              userId: options.userId,
              toolName: procedurePath,
              toolInput: input,
              guardrailTier: "CONFIRM",
              isReversible: false,
            })

            throw new ApprovalRequiredError(
              action.id,
              procedurePath,
              input,
              `Execute ${procedurePath}`
            )
          }
        },
      })
    },
  })
}
```

**Commit:** `feat(ai): add guarded tRPC caller proxy with guardrail enforcement`

---

## Task 5: Update ai.approval.ts — Remove MutatingAgentTool Dependency

**Files:**
- Modify: `src/modules/ai/ai.approval.ts`

**Changes:**

1. Remove import of `MutatingAgentTool`
2. Update `resolveGuardrailTier` to use the guardrail registry directly (or remove — it's now in `ai.guardrails.ts`)
3. Keep `resolveApprovalFromUI` — it's used by the router
4. Remove `requestApproval` and `executeAutoAction` — these are now handled by the guarded caller proxy
5. Keep the file lean — just the UI-facing approval resolution

Updated file:

```typescript
// src/modules/ai/ai.approval.ts

import { redis } from "@/shared/redis"
import { logger } from "@/shared/logger"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"

const log = logger.child({ module: "ai.approval" })

const APPROVAL_TIMEOUT_MS = 300_000 // 5 minutes
const APPROVAL_POLL_INTERVAL_MS = 1000 // 1 second

/**
 * Resolve an approval from the chat UI (called by the router).
 */
export async function resolveApprovalFromUI(actionId: string, approved: boolean): Promise<void> {
  const redisKey = `ai:approval:${actionId}`
  await redis.set(redisKey, approved ? "approved" : "rejected", { ex: 60 })
  log.info({ actionId, approved }, "Approval resolved from UI")
}

/**
 * Wait for a user's approval decision via Redis polling.
 * Called by the service when an ApprovalRequiredError is caught.
 * Returns true if approved, false if rejected or timed out.
 */
export async function waitForApproval(
  actionId: string,
  tenantId: string,
  procedurePath: string,
  userId: string
): Promise<boolean> {
  const redisKey = `ai:approval:${actionId}`
  const startTime = Date.now()

  while (Date.now() - startTime < APPROVAL_TIMEOUT_MS) {
    const decision = await redis.get(redisKey)
    if (decision === "approved") {
      await agentActionsRepository.updateStatus(actionId, {
        status: "approved",
        approvedBy: userId,
      })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, true)
      log.info({ actionId }, "Action approved")
      return true
    }
    if (decision === "rejected") {
      await agentActionsRepository.updateStatus(actionId, { status: "rejected" })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, false)
      log.info({ actionId }, "Action rejected")
      return false
    }
    await new Promise((resolve) => setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS))
  }

  // Timeout
  await agentActionsRepository.updateStatus(actionId, { status: "rejected", error: "Approval timed out" })
  log.warn({ actionId }, "Approval timed out after 5 minutes")
  return false
}
```

**Commit:** `refactor(ai): simplify approval.ts for code execution model`

---

## Task 6: Update ai.service.ts — Integrate Guarded Caller + Approval Flow

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

**Changes:**

1. Import `createGuardedCaller`, `ApprovalRequiredError`, `RestrictedProcedureError` from `./ai.guarded-caller`
2. Import `waitForApproval` from `./ai.approval`
3. In `handleToolCall`, when executing `execute_code`:
   - Pass the guarded caller instead of the raw caller
   - Catch `ApprovalRequiredError`: emit `approval_required` event, call `waitForApproval()`, if approved, re-execute with the procedure pre-approved
   - Catch `RestrictedProcedureError`: return error message
4. In `sendMessageStreaming`: handle the approval flow within the tool execution loop

The key flow change:

```
User message → Claude writes code → execute_code with guarded caller
  → If code calls a CONFIRM mutation:
    1. Guarded proxy throws ApprovalRequiredError
    2. Service catches it, yields approval_required event
    3. Service calls waitForApproval() (polls Redis)
    4. If approved: re-execute code with procedure pre-approved
    5. If rejected: return error to Claude
  → If code calls an AUTO mutation:
    1. Guarded proxy logs action, executes, returns result
  → If code calls a RESTRICT mutation:
    1. Guarded proxy throws RestrictedProcedureError
    2. Error returned to Claude
```

Read the current `ai.service.ts` carefully before modifying. The main changes are in `handleToolCall` and the caller setup.

**Commit:** `feat(ai): integrate guarded tRPC caller and approval flow into agent service`

---

## Task 7: New Zod Schemas + Router Procedures

**Files:**
- Modify: `src/modules/ai/ai.schemas.ts`
- Modify: `src/modules/ai/ai.router.ts`
- Modify: `src/modules/ai/index.ts`

### New schemas in ai.schemas.ts:

```typescript
export const resolveApprovalSchema = z.object({
  actionId: z.string(),
  approved: z.boolean(),
})

export const explainActionSchema = z.object({
  actionId: z.string(),
})

export const undoActionSchema = z.object({
  actionId: z.string(),
})

export const listActionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
})

export const getTrustSuggestionsSchema = z.object({})

export const getConfigSchema = z.object({})

export const updateConfigSchema = z.object({
  guardrailOverrides: z.record(z.string(), z.enum(["AUTO", "CONFIRM", "RESTRICT"])).optional(),
})
```

### New router procedures in ai.router.ts:

```typescript
resolveApproval: moduleProcedure
  .input(resolveApprovalSchema)
  .mutation(async ({ input }) => {
    await resolveApprovalFromUI(input.actionId, input.approved)
    return { success: true }
  }),

explainAction: moduleProcedure
  .input(explainActionSchema)
  .mutation(async ({ ctx, input }) => {
    const explanation = await explainAction(input.actionId, ctx.tenantId)
    return { explanation }
  }),

undoAction: moduleProcedure
  .input(undoActionSchema)
  .mutation(async ({ ctx, input }) => {
    return undoAction(input.actionId, ctx.tenantId, ctx.user!.id)
  }),

listActions: moduleProcedure
  .input(listActionsSchema)
  .query(({ ctx, input }) =>
    agentActionsRepository.listByTenant(ctx.tenantId, input.limit, input.status as any)
  ),

getTrustSuggestions: moduleProcedure
  .input(getTrustSuggestionsSchema)
  .query(async ({ ctx }) => {
    const suggestions = await analyzeTrustMetrics(ctx.tenantId)
    return { suggestions }
  }),

getConfig: moduleProcedure
  .input(getConfigSchema)
  .query(({ ctx }) => aiConfigRepository.getOrCreate(ctx.tenantId)),

updateConfig: moduleProcedure
  .input(updateConfigSchema)
  .mutation(async ({ ctx, input }) => {
    if (input.guardrailOverrides) {
      await aiConfigRepository.update(ctx.tenantId, { guardrailOverrides: input.guardrailOverrides })
    }
    return { success: true }
  }),
```

Import the needed functions: `resolveApprovalFromUI` from `./ai.approval`, `explainAction`, `undoAction` from `./ai.explainer`, `analyzeTrustMetrics` from `./ai.trust`, `agentActionsRepository` from `./ai.actions.repository`, `aiConfigRepository` from `./ai.config.repository`.

### Update barrel exports in index.ts:

```typescript
export { aiRouter } from "./ai.router"
export { aiFunctions } from "./ai.events"
export { aiService } from "./ai.service"
export { agentActionsRepository } from "./ai.actions.repository"
export { aiConfigRepository } from "./ai.config.repository"
export type { AgentTool, AgentContext, ConversationRecord, MessageRecord, AgentResponse, GuardrailTier, TenantAIConfig } from "./ai.types"
```

**Commit:** `feat(ai): add approval, explainability, trust, and config router procedures`

---

## Task 8: Update Chat UI — Approval Cards

**Files:**
- Modify: `src/app/admin/ai-chat/page.tsx`

**Changes:**

1. Add `approval_required` and `approval_resolved` to the `StreamEvent` type
2. Create an `ApprovalCard` component:
   - Shows procedure name, input summary, "Approve" and "Reject" buttons
   - Calls `api.ai.resolveApproval.useMutation()` on button click
   - Shows status: pending (buttons), approved (green check), rejected (red x), timed out
3. Track pending approvals in streaming state
4. Update the `StreamingBubble` to render approval cards
5. Change the "Read-only mode" badge to show "AI Assistant" or similar (mutations are now supported)

### ApprovalCard component:

```tsx
function ApprovalCard({
  actionId,
  procedurePath,
  input,
  status,
  onResolve,
}: {
  actionId: string
  procedurePath: string
  input: unknown
  status: "pending" | "approved" | "rejected"
  onResolve: (actionId: string, approved: boolean) => void
}) {
  return (
    <div className="my-2 border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Approval Required
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            <code className="font-mono">{procedurePath}</code>
          </p>
          <pre className="text-xs text-amber-600 dark:text-amber-400 mt-1 overflow-x-auto">
            {JSON.stringify(input, null, 2)}
          </pre>
          {status === "pending" && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="default" onClick={() => onResolve(actionId, true)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onResolve(actionId, false)}>
                Reject
              </Button>
            </div>
          )}
          {status === "approved" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </p>
          )}
          {status === "rejected" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Rejected
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Stream event handling:

In the SSE stream reader switch statement, add:

```typescript
case "approval_required": {
  // Add a pending approval to streaming state
  const approval = {
    actionId: event.actionId,
    procedurePath: event.toolName,
    input: event.input,
    description: event.description,
    status: "pending" as const,
  }
  collectedApprovals.push(approval)
  setStreamingApprovals([...collectedApprovals])
  break
}

case "approval_resolved": {
  // Update the approval status
  const idx = collectedApprovals.findIndex(a => a.actionId === event.actionId)
  if (idx !== -1) {
    collectedApprovals[idx] = {
      ...collectedApprovals[idx],
      status: event.approved ? "approved" : "rejected",
    }
    setStreamingApprovals([...collectedApprovals])
  }
  break
}
```

**Commit:** `feat(ai): add approval card UI component and stream event handling`

---

## Task 9: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai-phase-b.test.ts`

Test:
1. **Guardrail registry**: Default tiers resolve correctly, CONFIRM fallback for unknown procedures
2. **Guarded caller proxy**: AUTO executes + logs, CONFIRM throws ApprovalRequiredError, RESTRICT throws RestrictedProcedureError, pre-approved procedures execute
3. **Approval flow**: waitForApproval returns true on "approved", false on "rejected", false on timeout
4. **Trust ratchet**: Promotion suggestions at 95%+ approval, demotion suggestions at 20%+ rejection
5. **Explainer**: Mock Anthropic, verify explanation generation
6. **Router procedures**: resolveApproval, listActions, getConfig, updateConfig

Mock:
- `db` and all Drizzle queries
- `redis` for approval flow
- `Anthropic` for explainer
- tRPC caller proxy tests can use a mock caller object

**Commit:** `test(ai): add Phase B tests for guardrails, approval flow, trust ratchet`

---

## Task 10: Verification — tsc + build + tests

Run:
1. `npx tsc --noEmit` — fix any type errors
2. `npm run build` — fix any build errors
3. `npm run test` — all tests must pass

Fix any issues. Commit with: `fix(ai): resolve Phase B verification issues`

---

## Post-Implementation Checklist

```
[ ] Guardrail registry maps procedure paths to AUTO/CONFIRM/RESTRICT
[ ] Module index shows mutation procedures with guardrail tier annotations
[ ] System prompt allows mutations and explains the guardrail system
[ ] Guarded tRPC caller proxy intercepts mutations and enforces tiers
[ ] CONFIRM mutations pause execution and wait for user approval
[ ] RESTRICT mutations throw immediately
[ ] AUTO mutations log to agent_actions and execute
[ ] Approval cards render in chat UI with Approve/Reject buttons
[ ] Redis-based approval polling works (approve, reject, timeout)
[ ] Trust ratchet tracks per-procedure acceptance/rejection rates
[ ] "Why" button explains actions via Haiku
[ ] New router procedures: resolveApproval, explainAction, listActions, getConfig, updateConfig
[ ] "Read-only mode" badge removed from chat header
[ ] All tests pass
[ ] tsc + build pass
```
