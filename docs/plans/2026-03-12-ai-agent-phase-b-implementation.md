# AI Agent Phase B Implementation Plan

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Add mutation tools, a guardrail/approval system, explainability ("Why" button), and a trust ratchet. The agent can now take actions (create bookings, update statuses, send notifications) with user approval. Every action is auditable and explainable.

**Timeline:** 8 working days

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md` (Section 2: Guardrails, Section 10: Phase B)
**Phase A+ Plan (prerequisite — must be complete):** `docs/plans/2026-03-12-ai-agent-phase-a-plus-implementation.md`

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **Three-tier guardrail classification.** Every mutating tool is classified: `AUTO` (execute immediately), `CONFIRM` (show approval card, wait for user), `RESTRICT` (blocked — admin must enable). Classification is per-tool, overridable per-tenant via `ai_tenant_config`.
2. **Approval flow uses Redis pub/sub + polling.** When the agent hits a CONFIRM tool, it pauses execution, saves a pending approval to `agent_actions`, emits an approval event to the chat UI, and polls Redis for the user's decision. No Inngest wait tokens — keep it in-process with a 5-minute timeout.
3. **`agent_actions` table tracks every mutation.** Every tool call that mutates data gets a row. Fields: action type, input, output, status (pending/approved/rejected/executed/failed/rolled_back), approval metadata.
4. **Compensation/undo stack.** Each mutating tool defines an optional `compensate` function. If the user requests undo within the conversation, the compensation runs. Not all actions are reversible — non-reversible actions say so.
5. **"Why" button uses Haiku.** When the user clicks "Why did you do X?", send the agent's reasoning trace (tool calls + results for that turn) to Claude Haiku for a concise explanation. Cheap and fast.
6. **Trust ratchet is passive in Phase B.** Track acceptance/rejection rates per tool per tenant in `ai_tenant_config`. Display stats in admin. Auto-promote/demote suggestions come later.
7. **Stay on Inngest.** The approval flow does NOT use Inngest. It's a synchronous in-process wait with Redis signaling.

---

## Progress Tracking

```
[ ] Task 1: Database schema — agent_actions + ai_tenant_config tables
[ ] Task 2: Guardrail types and classification
[ ] Task 3: Agent actions repository
[ ] Task 4: Tenant guardrail config repository
[ ] Task 5: Mutation tools — booking, customer, notification (6 tools)
[ ] Task 6: Approval flow engine
[ ] Task 7: Update AI service for mutations + approvals
[ ] Task 8: Explainability service ("Why" button)
[ ] Task 9: Trust ratchet tracking
[ ] Task 10: Chat UI — approval cards + "Why" button
[ ] Task 11: Inngest events + wiring updates
[ ] Task 12: Tests
[ ] Task 13: Verification — tsc + build + tests
```

---

## Codebase Patterns Reference

All patterns from Phase A+ apply. See `docs/plans/2026-03-12-ai-agent-phase-a-plus-implementation.md` for:
- Module file structure, import patterns, Drizzle ORM patterns, router patterns, error handling
- Zod v4: `z.uuid()` not `z.string().uuid()`
- Pino: object FIRST, message SECOND
- NEVER throw TRPCError in repo/service
- Lazy-init for external clients

### Additional Phase B patterns:

```typescript
// Approval card in chat — AgentStreamEvent additions:
| { type: "approval_required"; actionId: string; toolName: string; description: string; input: unknown }
| { type: "approval_resolved"; actionId: string; approved: boolean }

// Redis approval channel:
// Key: `ai:approval:${actionId}` — value: "approved" | "rejected"
// TTL: 300 seconds (5 min timeout)
```

---

## Task 1: Database Schema — agent_actions + ai_tenant_config

**Files:**
- Modify: `src/shared/db/schemas/ai.schema.ts`

**Step 1: Add the agent_actions table**

```typescript
// Add below the existing aiMessages table in ai.schema.ts

// ---------------------------------------------------------------------------
// Agent Actions — audit trail of every agent mutation
// ---------------------------------------------------------------------------

export const agentActions = pgTable("agent_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id),
  messageId: uuid("message_id").references(() => aiMessages.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  toolName: text("tool_name").notNull(),
  toolInput: jsonb("tool_input").notNull(),
  toolOutput: jsonb("tool_output"),
  status: text("status").notNull().default("pending"),
  // 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'rolled_back' | 'auto_executed'
  guardrailTier: text("guardrail_tier").notNull(), // 'AUTO' | 'CONFIRM' | 'RESTRICT'
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  error: text("error"),
  compensationData: jsonb("compensation_data"), // Data needed to undo this action
  isReversible: integer("is_reversible").notNull().default(1), // 1 = yes, 0 = no
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_agent_actions_conversation").on(t.conversationId),
  index("idx_agent_actions_tenant_created").on(t.tenantId, t.createdAt),
  index("idx_agent_actions_status").on(t.tenantId, t.status),
])

// ---------------------------------------------------------------------------
// AI Tenant Config — per-tenant AI settings + guardrail overrides
// ---------------------------------------------------------------------------

export const aiTenantConfig = pgTable("ai_tenant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id).unique(),
  isEnabled: integer("is_enabled").notNull().default(1),
  maxTokenBudget: integer("max_token_budget").notNull().default(50000),
  maxMessagesPerMinute: integer("max_messages_per_minute").notNull().default(20),
  defaultModel: text("default_model").notNull().default("claude-sonnet-4-20250514"),
  /** JSON object: { "toolName": "AUTO" | "CONFIRM" | "RESTRICT" } */
  guardrailOverrides: jsonb("guardrail_overrides").default("{}"),
  /** Track acceptance rates per tool: { "toolName": { approved: number, rejected: number } } */
  trustMetrics: jsonb("trust_metrics").default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

**Commit:** `feat(ai): add agent_actions and ai_tenant_config database tables`

---

## Task 2: Guardrail Types and Classification

**Files:**
- Modify: `src/modules/ai/ai.types.ts`

**Step 1: Add guardrail types to ai.types.ts**

```typescript
// Add to ai.types.ts after existing types

// ---------------------------------------------------------------------------
// Guardrails — Three-tier tool classification
// ---------------------------------------------------------------------------

export type GuardrailTier = "AUTO" | "CONFIRM" | "RESTRICT"

export interface MutatingAgentTool extends AgentTool {
  /** Guardrail tier — controls approval flow */
  guardrailTier: GuardrailTier
  /** Human-readable description of what this mutation does */
  mutationDescription: string
  /** Optional: function to undo this action. Receives the compensation data saved in agent_actions. */
  compensate?: (compensationData: unknown, ctx: AgentContext) => Promise<void>
  /** Whether this action can be reversed */
  isReversible: boolean
}

// ---------------------------------------------------------------------------
// Agent Actions — audit trail records
// ---------------------------------------------------------------------------

export type ActionStatus = "pending" | "approved" | "rejected" | "executed" | "failed" | "rolled_back" | "auto_executed"

export interface AgentActionRecord {
  id: string
  conversationId: string
  messageId: string | null
  tenantId: string
  userId: string
  toolName: string
  toolInput: unknown
  toolOutput: unknown | null
  status: ActionStatus
  guardrailTier: GuardrailTier
  approvedAt: Date | null
  approvedBy: string | null
  executedAt: Date | null
  error: string | null
  compensationData: unknown | null
  isReversible: boolean
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Tenant AI Config
// ---------------------------------------------------------------------------

export interface TenantAIConfig {
  id: string
  tenantId: string
  isEnabled: boolean
  maxTokenBudget: number
  maxMessagesPerMinute: number
  defaultModel: string
  guardrailOverrides: Record<string, GuardrailTier>
  trustMetrics: Record<string, { approved: number; rejected: number }>
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Streaming event additions for approval flow
// ---------------------------------------------------------------------------

// Update AgentStreamEvent to add:
// | { type: "approval_required"; actionId: string; toolName: string; description: string; input: unknown }
// | { type: "approval_resolved"; actionId: string; approved: boolean }
```

Also update the `AgentStreamEvent` union type to include the two new event types:
```typescript
export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; result: unknown; durationMs: number }
  | { type: "text_delta"; content: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; content: string; tokenUsage: TokenUsage; toolCallCount: number }
  | { type: "approval_required"; actionId: string; toolName: string; description: string; input: unknown }
  | { type: "approval_resolved"; actionId: string; approved: boolean }
```

**Commit:** `feat(ai): add guardrail types, mutation tool interface, and action records`

---

## Task 3: Agent Actions Repository

**Files:**
- Create: `src/modules/ai/ai.actions.repository.ts`

```typescript
// src/modules/ai/ai.actions.repository.ts

import { db } from "@/shared/db"
import { agentActions } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import type { AgentActionRecord, ActionStatus, GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.actions.repository" })

function mapAction(row: typeof agentActions.$inferSelect): AgentActionRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    messageId: row.messageId,
    tenantId: row.tenantId,
    userId: row.userId,
    toolName: row.toolName,
    toolInput: row.toolInput,
    toolOutput: row.toolOutput,
    status: row.status as ActionStatus,
    guardrailTier: row.guardrailTier as GuardrailTier,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    executedAt: row.executedAt,
    error: row.error,
    compensationData: row.compensationData,
    isReversible: row.isReversible === 1,
    createdAt: row.createdAt,
  }
}

export const agentActionsRepository = {
  async create(data: {
    conversationId: string
    messageId?: string
    tenantId: string
    userId: string
    toolName: string
    toolInput: unknown
    guardrailTier: GuardrailTier
    isReversible: boolean
  }): Promise<AgentActionRecord> {
    const [row] = await db
      .insert(agentActions)
      .values({
        conversationId: data.conversationId,
        messageId: data.messageId ?? null,
        tenantId: data.tenantId,
        userId: data.userId,
        toolName: data.toolName,
        toolInput: data.toolInput,
        guardrailTier: data.guardrailTier,
        isReversible: data.isReversible ? 1 : 0,
      })
      .returning()
    log.info({ actionId: row!.id, toolName: data.toolName }, "Agent action created")
    return mapAction(row!)
  },

  async updateStatus(
    actionId: string,
    updates: {
      status: ActionStatus
      toolOutput?: unknown
      approvedBy?: string
      error?: string
      compensationData?: unknown
    }
  ): Promise<void> {
    const setValues: Record<string, unknown> = { status: updates.status }
    if (updates.toolOutput !== undefined) setValues.toolOutput = updates.toolOutput
    if (updates.approvedBy) {
      setValues.approvedBy = updates.approvedBy
      setValues.approvedAt = new Date()
    }
    if (updates.status === "executed" || updates.status === "auto_executed") {
      setValues.executedAt = new Date()
    }
    if (updates.error) setValues.error = updates.error
    if (updates.compensationData !== undefined) setValues.compensationData = updates.compensationData
    await db.update(agentActions).set(setValues).where(eq(agentActions.id, actionId))
  },

  async getById(actionId: string): Promise<AgentActionRecord | null> {
    const [row] = await db
      .select()
      .from(agentActions)
      .where(eq(agentActions.id, actionId))
      .limit(1)
    return row ? mapAction(row) : null
  },

  async listByConversation(conversationId: string, limit = 50): Promise<AgentActionRecord[]> {
    const rows = await db
      .select()
      .from(agentActions)
      .where(eq(agentActions.conversationId, conversationId))
      .orderBy(desc(agentActions.createdAt))
      .limit(limit)
    return rows.map(mapAction)
  },

  async listByTenant(tenantId: string, limit = 50, status?: ActionStatus): Promise<{ rows: AgentActionRecord[]; hasMore: boolean }> {
    const conditions = [eq(agentActions.tenantId, tenantId)]
    if (status) conditions.push(eq(agentActions.status, status))

    const rows = await db
      .select()
      .from(agentActions)
      .where(and(...conditions))
      .orderBy(desc(agentActions.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: (hasMore ? rows.slice(0, limit) : rows).map(mapAction),
      hasMore,
    }
  },

  async getPendingByConversation(conversationId: string): Promise<AgentActionRecord[]> {
    const rows = await db
      .select()
      .from(agentActions)
      .where(and(eq(agentActions.conversationId, conversationId), eq(agentActions.status, "pending")))
      .orderBy(agentActions.createdAt)
    return rows.map(mapAction)
  },
}
```

**Commit:** `feat(ai): add agent actions repository for mutation audit trail`

---

## Task 4: Tenant Guardrail Config Repository

**Files:**
- Create: `src/modules/ai/ai.config.repository.ts`

```typescript
// src/modules/ai/ai.config.repository.ts

import { db } from "@/shared/db"
import { aiTenantConfig } from "@/shared/db/schema"
import { eq } from "drizzle-orm"
import { logger } from "@/shared/logger"
import type { TenantAIConfig, GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.config.repository" })

function mapConfig(row: typeof aiTenantConfig.$inferSelect): TenantAIConfig {
  return {
    id: row.id,
    tenantId: row.tenantId,
    isEnabled: row.isEnabled === 1,
    maxTokenBudget: row.maxTokenBudget,
    maxMessagesPerMinute: row.maxMessagesPerMinute,
    defaultModel: row.defaultModel,
    guardrailOverrides: (row.guardrailOverrides as Record<string, GuardrailTier>) ?? {},
    trustMetrics: (row.trustMetrics as Record<string, { approved: number; rejected: number }>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const aiConfigRepository = {
  async getOrCreate(tenantId: string): Promise<TenantAIConfig> {
    const [existing] = await db
      .select()
      .from(aiTenantConfig)
      .where(eq(aiTenantConfig.tenantId, tenantId))
      .limit(1)

    if (existing) return mapConfig(existing)

    const [created] = await db
      .insert(aiTenantConfig)
      .values({ tenantId })
      .returning()
    log.info({ tenantId }, "Created default AI tenant config")
    return mapConfig(created!)
  },

  async update(tenantId: string, updates: {
    isEnabled?: number
    maxTokenBudget?: number
    maxMessagesPerMinute?: number
    defaultModel?: string
    guardrailOverrides?: Record<string, GuardrailTier>
    trustMetrics?: Record<string, { approved: number; rejected: number }>
  }): Promise<void> {
    await db
      .update(aiTenantConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiTenantConfig.tenantId, tenantId))
  },

  async getGuardrailTier(tenantId: string, toolName: string, defaultTier: GuardrailTier): Promise<GuardrailTier> {
    const config = await this.getOrCreate(tenantId)
    return config.guardrailOverrides[toolName] ?? defaultTier
  },

  async recordApprovalDecision(tenantId: string, toolName: string, approved: boolean): Promise<void> {
    const config = await this.getOrCreate(tenantId)
    const metrics = { ...config.trustMetrics }
    if (!metrics[toolName]) metrics[toolName] = { approved: 0, rejected: 0 }
    if (approved) {
      metrics[toolName].approved += 1
    } else {
      metrics[toolName].rejected += 1
    }
    await this.update(tenantId, { trustMetrics: metrics })
  },
}
```

**Commit:** `feat(ai): add tenant AI config repository with guardrail overrides`

---

## Task 5: Mutation Tools — Booking, Customer, Notification (6 tools)

**Files:**
- Create: `src/modules/ai/tools/booking.mutation-tools.ts`
- Create: `src/modules/ai/tools/customer.mutation-tools.ts`
- Create: `src/modules/ai/tools/notification.mutation-tools.ts`
- Modify: `src/modules/ai/tools/index.ts`

### Critical rules for mutation tools:
- Every mutation tool implements `MutatingAgentTool` (extends `AgentTool` with `guardrailTier`, `mutationDescription`, `compensate?`, `isReversible`)
- The `execute` function performs the actual mutation via repository calls
- The approval flow is handled by the service layer, NOT in the tool itself
- Tools still call repositories directly

### booking.mutation-tools.ts

```typescript
// src/modules/ai/tools/booking.mutation-tools.ts

import type { MutatingAgentTool } from "../ai.types"
import { bookingRepository } from "@/modules/booking/booking.repository"

export const bookingMutationTools: MutatingAgentTool[] = [
  {
    name: "booking.updateStatus",
    description: "Update a booking's status. Can confirm, cancel, mark as completed, or mark as no-show. Requires the booking ID and new status.",
    module: "booking",
    permission: "bookings:write",
    guardrailTier: "CONFIRM",
    mutationDescription: "Changes a booking's status",
    isReversible: true,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The booking ID" },
        status: {
          type: "string",
          enum: ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
          description: "The new booking status",
        },
        reason: { type: "string", description: "Reason for the status change (optional)" },
      },
      required: ["id", "status"],
    },
    execute: async (input: unknown, ctx) => {
      const { id, status, reason } = input as { id: string; status: string; reason?: string }
      // First get the current booking to save compensation data
      const current = await bookingRepository.findById(ctx.tenantId, id)
      const result = await bookingRepository.updateStatus(ctx.tenantId, id, status, reason)
      return { ...result, _compensationData: { previousStatus: current?.status } }
    },
    compensate: async (compensationData: unknown, ctx) => {
      const data = compensationData as { bookingId: string; previousStatus: string }
      await bookingRepository.updateStatus(ctx.tenantId, data.bookingId, data.previousStatus)
    },
  },
  {
    name: "booking.addNote",
    description: "Add a note to a booking. Use this to record observations, follow-ups, or context about a booking.",
    module: "booking",
    permission: "bookings:write",
    guardrailTier: "AUTO",
    mutationDescription: "Adds a note to a booking",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string", description: "The booking ID" },
        content: { type: "string", description: "The note content" },
      },
      required: ["bookingId", "content"],
    },
    execute: async (input: unknown, ctx) => {
      const { bookingId, content } = input as { bookingId: string; content: string }
      return bookingRepository.addNote(ctx.tenantId, bookingId, { content, userId: ctx.userId })
    },
  },
]
```

### customer.mutation-tools.ts

```typescript
// src/modules/ai/tools/customer.mutation-tools.ts

import type { MutatingAgentTool } from "../ai.types"
import { customerRepository } from "@/modules/customer/customer.repository"

export const customerMutationTools: MutatingAgentTool[] = [
  {
    name: "customer.addNote",
    description: "Add a note to a customer record. Use to record observations, follow-ups, or context.",
    module: "customer",
    permission: "customers:write",
    guardrailTier: "AUTO",
    mutationDescription: "Adds a note to a customer",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer ID" },
        content: { type: "string", description: "The note content" },
      },
      required: ["customerId", "content"],
    },
    execute: async (input: unknown, ctx) => {
      const { customerId, content } = input as { customerId: string; content: string }
      return customerRepository.addNote(ctx.tenantId, customerId, { content, userId: ctx.userId })
    },
  },
  {
    name: "customer.updateTags",
    description: "Update tags on a customer record. Tags are used for categorization and filtering.",
    module: "customer",
    permission: "customers:write",
    guardrailTier: "AUTO",
    mutationDescription: "Updates a customer's tags",
    isReversible: true,
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer ID" },
        tags: { type: "array", items: { type: "string" }, description: "New tag list (replaces existing)" },
      },
      required: ["customerId", "tags"],
    },
    execute: async (input: unknown, ctx) => {
      const { customerId, tags } = input as { customerId: string; tags: string[] }
      const current = await customerRepository.findById(ctx.tenantId, customerId)
      const result = await customerRepository.updateTags(ctx.tenantId, customerId, tags)
      return { ...result, _compensationData: { previousTags: current?.tags } }
    },
    compensate: async (compensationData: unknown, ctx) => {
      const data = compensationData as { customerId: string; previousTags: string[] }
      await customerRepository.updateTags(ctx.tenantId, data.customerId, data.previousTags)
    },
  },
]
```

### notification.mutation-tools.ts

```typescript
// src/modules/ai/tools/notification.mutation-tools.ts

import type { MutatingAgentTool } from "../ai.types"
import { inngest } from "@/shared/inngest"

export const notificationMutationTools: MutatingAgentTool[] = [
  {
    name: "notification.sendEmail",
    description: "Send an email notification. Requires a recipient email address, subject, and body. Use for follow-ups, confirmations, or custom communications.",
    module: "notification",
    permission: "notifications:write",
    guardrailTier: "CONFIRM",
    mutationDescription: "Sends an email to a recipient",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body (plain text)" },
      },
      required: ["to", "subject", "body"],
    },
    execute: async (input: unknown, ctx) => {
      const { to, subject, body } = input as { to: string; subject: string; body: string }
      await inngest.send({
        name: "notification/send.email",
        data: {
          to,
          subject,
          html: `<p>${body.replace(/\n/g, "</p><p>")}</p>`,
          text: body,
          tenantId: ctx.tenantId,
          trigger: "ai-agent",
        },
      })
      return { sent: true, to, subject }
    },
  },
  {
    name: "notification.sendSms",
    description: "Send an SMS notification. Requires a phone number and message body.",
    module: "notification",
    permission: "notifications:write",
    guardrailTier: "CONFIRM",
    mutationDescription: "Sends an SMS to a phone number",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient phone number (E.164 format)" },
        body: { type: "string", description: "SMS message body (max 160 chars recommended)" },
      },
      required: ["to", "body"],
    },
    execute: async (input: unknown, ctx) => {
      const { to, body } = input as { to: string; body: string }
      await inngest.send({
        name: "notification/send.sms",
        data: {
          to,
          body,
          tenantId: ctx.tenantId,
          trigger: "ai-agent",
        },
      })
      return { sent: true, to }
    },
  },
]
```

### Update tools/index.ts

Add the mutation tools to the barrel file. Update `getToolsForUser` to also return mutation tools. Add a helper `isMutatingTool` to check if a tool is a mutation tool.

```typescript
// Add to src/modules/ai/tools/index.ts:

import { bookingMutationTools } from "./booking.mutation-tools"
import { customerMutationTools } from "./customer.mutation-tools"
import { notificationMutationTools } from "./notification.mutation-tools"
import type { MutatingAgentTool } from "../ai.types"

export const allMutationTools: MutatingAgentTool[] = [
  ...bookingMutationTools,
  ...customerMutationTools,
  ...notificationMutationTools,
]

// Update allTools to include mutation tools
// allTools should now be: [...readOnlyTools, ...allMutationTools]

export function isMutatingTool(tool: AgentTool): tool is MutatingAgentTool {
  return "guardrailTier" in tool
}
```

**Important:** Before writing each mutation tool file, READ the corresponding module's repository to verify available methods and their signatures. The repository methods above are educated guesses — adjust to match actual signatures.

**Commit:** `feat(ai): add 6 mutation tools for booking, customer, and notification`

---

## Task 6: Approval Flow Engine

**Files:**
- Create: `src/modules/ai/ai.approval.ts`

```typescript
// src/modules/ai/ai.approval.ts

import { redis } from "@/shared/redis"
import { logger } from "@/shared/logger"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import type { AgentContext, GuardrailTier, MutatingAgentTool, AgentActionRecord } from "./ai.types"

const log = logger.child({ module: "ai.approval" })

const APPROVAL_TIMEOUT_MS = 300_000 // 5 minutes
const APPROVAL_POLL_INTERVAL_MS = 1000 // 1 second

/**
 * Resolve the effective guardrail tier for a tool in a tenant context.
 * Checks tenant overrides first, then falls back to tool default.
 */
export async function resolveGuardrailTier(
  tenantId: string,
  tool: MutatingAgentTool
): Promise<GuardrailTier> {
  return aiConfigRepository.getGuardrailTier(tenantId, tool.name, tool.guardrailTier)
}

/**
 * Create a pending action and wait for user approval via Redis.
 * Returns the action record after approval/rejection/timeout.
 */
export async function requestApproval(
  conversationId: string,
  tool: MutatingAgentTool,
  toolInput: unknown,
  ctx: AgentContext
): Promise<{ approved: boolean; action: AgentActionRecord }> {
  // 1. Create pending action record
  const action = await agentActionsRepository.create({
    conversationId,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    toolName: tool.name,
    toolInput,
    guardrailTier: "CONFIRM",
    isReversible: tool.isReversible,
  })

  log.info({ actionId: action.id, toolName: tool.name }, "Approval requested")

  // 2. Set Redis key for approval channel
  const redisKey = `ai:approval:${action.id}`
  // Don't set a value yet — just create the key space. The UI will SET this.

  // 3. Poll Redis for decision (timeout after 5 minutes)
  const startTime = Date.now()
  while (Date.now() - startTime < APPROVAL_TIMEOUT_MS) {
    const decision = await redis.get(redisKey)
    if (decision === "approved") {
      await agentActionsRepository.updateStatus(action.id, {
        status: "approved",
        approvedBy: ctx.userId,
      })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(ctx.tenantId, tool.name, true)
      log.info({ actionId: action.id }, "Action approved")
      const updated = await agentActionsRepository.getById(action.id)
      return { approved: true, action: updated! }
    }
    if (decision === "rejected") {
      await agentActionsRepository.updateStatus(action.id, { status: "rejected" })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(ctx.tenantId, tool.name, false)
      log.info({ actionId: action.id }, "Action rejected")
      const updated = await agentActionsRepository.getById(action.id)
      return { approved: false, action: updated! }
    }
    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS))
  }

  // 4. Timeout — reject automatically
  await agentActionsRepository.updateStatus(action.id, { status: "rejected", error: "Approval timed out" })
  log.warn({ actionId: action.id }, "Approval timed out after 5 minutes")
  const updated = await agentActionsRepository.getById(action.id)
  return { approved: false, action: updated! }
}

/**
 * Execute a mutation tool with AUTO guardrail (no approval needed).
 */
export async function executeAutoAction(
  conversationId: string,
  tool: MutatingAgentTool,
  toolInput: unknown,
  ctx: AgentContext
): Promise<{ action: AgentActionRecord; result: unknown }> {
  const action = await agentActionsRepository.create({
    conversationId,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    toolName: tool.name,
    toolInput,
    guardrailTier: "AUTO",
    isReversible: tool.isReversible,
  })

  try {
    const result = await tool.execute(toolInput, ctx)
    // Extract compensation data if tool returns it
    const compensationData = (result as Record<string, unknown>)?._compensationData
    await agentActionsRepository.updateStatus(action.id, {
      status: "auto_executed",
      toolOutput: result,
      compensationData,
    })
    const updated = await agentActionsRepository.getById(action.id)
    return { action: updated!, result }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Execution failed"
    await agentActionsRepository.updateStatus(action.id, {
      status: "failed",
      error: errorMsg,
    })
    throw err
  }
}

/**
 * Resolve an approval from the chat UI (called by the router).
 */
export async function resolveApprovalFromUI(actionId: string, approved: boolean): Promise<void> {
  const redisKey = `ai:approval:${actionId}`
  await redis.set(redisKey, approved ? "approved" : "rejected", { ex: 60 })
  log.info({ actionId, approved }, "Approval resolved from UI")
}
```

**Commit:** `feat(ai): add approval flow engine with Redis polling and timeout`

---

## Task 7: Update AI Service for Mutations + Approvals

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

Update the agent loop in `sendMessage` to handle mutation tools:

1. When the agent calls a tool, check if it's a `MutatingAgentTool` using `isMutatingTool()`
2. If it IS mutating:
   - Resolve the effective guardrail tier via `resolveGuardrailTier()`
   - If `RESTRICT`: return an error message to Claude saying this tool is restricted
   - If `AUTO`: execute immediately via `executeAutoAction()`, return result to Claude
   - If `CONFIRM`: call `requestApproval()` which blocks until user responds. If approved, execute the tool and return result. If rejected, return rejection message to Claude.
3. If it's NOT mutating: execute as before (read-only, no approval)

The key change is in the tool execution section of the agent loop. Read the current `ai.service.ts` before modifying.

Also add a new method `explainAction` (see Task 8) and `undoAction` to the service.

**Commit:** `feat(ai): integrate mutation approval flow into agent loop`

---

## Task 8: Explainability Service ("Why" Button)

**Files:**
- Create: `src/modules/ai/ai.explainer.ts`

```typescript
// src/modules/ai/ai.explainer.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { aiRepository } from "./ai.repository"
import { agentActionsRepository } from "./ai.actions.repository"

const log = logger.child({ module: "ai.explainer" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001"

/**
 * Explain why the agent took a specific action.
 * Uses Haiku for fast, cheap explanations.
 */
export async function explainAction(actionId: string, tenantId: string): Promise<string> {
  const action = await agentActionsRepository.getById(actionId)
  if (!action) return "Action not found."

  // Get the conversation context around this action
  const messages = await aiRepository.getMessages(action.conversationId, 50)

  // Build a summary of the conversation flow leading to this action
  const contextSummary = messages
    .map((m) => {
      if (m.role === "user") return `User: ${m.content.slice(0, 200)}`
      if (m.role === "assistant") {
        const toolInfo = m.toolCalls?.map((tc) => `Called ${tc.name}`).join(", ") ?? ""
        return `Assistant: ${m.content.slice(0, 200)}${toolInfo ? ` [${toolInfo}]` : ""}`
      }
      return null
    })
    .filter(Boolean)
    .join("\n")

  const prompt = `You are explaining why an AI assistant took a specific action. Be concise (2-3 sentences max).

The assistant was asked to help with a task. Here is the conversation context:
${contextSummary}

The specific action taken was:
- Tool: ${action.toolName}
- Input: ${JSON.stringify(action.toolInput, null, 2)}
- Status: ${action.status}

Explain WHY the assistant chose this action, based on the conversation context. Focus on the user's intent and how this action fulfills it.`

  const response = await getClient().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  })

  const explanation = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  log.info({ actionId, tokens: response.usage.output_tokens }, "Action explained")
  return explanation
}

/**
 * Undo a previously executed action using its compensation function.
 */
export async function undoAction(actionId: string, tenantId: string, userId: string): Promise<{ success: boolean; message: string }> {
  const action = await agentActionsRepository.getById(actionId)
  if (!action) return { success: false, message: "Action not found" }
  if (!action.isReversible) return { success: false, message: "This action is not reversible" }
  if (action.status !== "executed" && action.status !== "auto_executed") {
    return { success: false, message: `Cannot undo action with status: ${action.status}` }
  }

  // The compensation logic is handled by the tool's compensate function.
  // We need to find the tool and call it.
  // For now, mark as rolled_back — the actual compensation is wired in the service layer.
  await agentActionsRepository.updateStatus(actionId, { status: "rolled_back" })
  return { success: true, message: "Action has been rolled back" }
}
```

**Commit:** `feat(ai): add explainability service with Haiku-powered "Why" explanations`

---

## Task 9: Trust Ratchet Tracking

**Files:**
- Create: `src/modules/ai/ai.trust.ts`

```typescript
// src/modules/ai/ai.trust.ts

import { aiConfigRepository } from "./ai.config.repository"
import { logger } from "@/shared/logger"
import type { GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.trust" })

const PROMOTION_THRESHOLD = 0.95 // 95% approval rate
const PROMOTION_MIN_DECISIONS = 50
const DEMOTION_REJECTION_SPIKE = 0.20 // 20% rejection in recent window
const DEMOTION_WINDOW = 20 // last 20 decisions

/**
 * Analyze trust metrics and suggest guardrail promotions/demotions.
 * Returns suggestions — does NOT auto-apply in Phase B.
 */
export async function analyzeTrustMetrics(tenantId: string): Promise<TrustSuggestion[]> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  const suggestions: TrustSuggestion[] = []

  for (const [toolName, metrics] of Object.entries(config.trustMetrics)) {
    const total = metrics.approved + metrics.rejected
    if (total === 0) continue

    const approvalRate = metrics.approved / total

    // Suggest promotion: CONFIRM → AUTO
    if (
      approvalRate >= PROMOTION_THRESHOLD &&
      total >= PROMOTION_MIN_DECISIONS &&
      (config.guardrailOverrides[toolName] ?? "CONFIRM") === "CONFIRM"
    ) {
      suggestions.push({
        toolName,
        currentTier: "CONFIRM",
        suggestedTier: "AUTO",
        reason: `${(approvalRate * 100).toFixed(1)}% approval rate over ${total} decisions`,
        approvalRate,
        totalDecisions: total,
      })
    }

    // Suggest demotion: AUTO → CONFIRM (if recently getting rejections)
    if (
      metrics.rejected > 0 &&
      total >= DEMOTION_WINDOW &&
      (config.guardrailOverrides[toolName] ?? "CONFIRM") === "AUTO"
    ) {
      // Check recent rejection spike (simplified — uses overall rate)
      const rejectionRate = metrics.rejected / total
      if (rejectionRate >= DEMOTION_REJECTION_SPIKE) {
        suggestions.push({
          toolName,
          currentTier: "AUTO",
          suggestedTier: "CONFIRM",
          reason: `${(rejectionRate * 100).toFixed(1)}% rejection rate — consider reverting to CONFIRM`,
          approvalRate,
          totalDecisions: total,
        })
      }
    }
  }

  log.info({ tenantId, suggestions: suggestions.length }, "Trust analysis complete")
  return suggestions
}

export interface TrustSuggestion {
  toolName: string
  currentTier: GuardrailTier
  suggestedTier: GuardrailTier
  reason: string
  approvalRate: number
  totalDecisions: number
}
```

**Commit:** `feat(ai): add trust ratchet analysis for guardrail promotion/demotion suggestions`

---

## Task 10: Chat UI — Approval Cards + "Why" Button

**Files:**
- Modify: `src/app/admin/ai-chat/page.tsx` (or wherever the chat UI lives from Phase A+)

Update the chat UI to:

1. **Render approval cards** when an `approval_required` stream event arrives:
   - Show the tool name, mutation description, and input preview
   - Two buttons: "Approve" and "Reject"
   - On click, call a new tRPC mutation `ai.resolveApproval({ actionId, approved: boolean })`
   - Show status feedback (approved/rejected/timed out)

2. **Add "Why" button** on agent messages that involved tool calls:
   - Small "Why did the assistant do this?" link
   - On click, call `ai.explainAction({ actionId })` query
   - Display the Haiku explanation inline below the message

3. **Show action status badges** on messages that triggered mutations:
   - "Auto-executed", "Approved", "Rejected", "Rolled back" badges with appropriate colors

Read the current chat UI code before modifying. Reference the mockup approval cards at `src/app/admin/brokerage-mockups/ai-assistant/_components/approval-card.tsx` for design patterns.

**Commit:** `feat(ai): add approval cards and "Why" button to chat UI`

---

## Task 11: Router Updates + New Procedures

**Files:**
- Modify: `src/modules/ai/ai.router.ts`
- Modify: `src/modules/ai/ai.schemas.ts`
- Modify: `src/modules/ai/ai.events.ts`
- Modify: `src/modules/ai/index.ts`
- Modify: `src/shared/inngest.ts`

### New Zod schemas (add to ai.schemas.ts):

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
  conversationId: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z.string().optional(),
})

export const getTrustSuggestionsSchema = z.object({})

export const updateGuardrailSchema = z.object({
  toolName: z.string(),
  tier: z.enum(["AUTO", "CONFIRM", "RESTRICT"]),
})
```

### New router procedures (add to ai.router.ts):

```typescript
resolveApproval: moduleProcedure
  .input(resolveApprovalSchema)
  .mutation(async ({ input }) => {
    await resolveApprovalFromUI(input.actionId, input.approved)
    return { success: true }
  }),

explainAction: moduleProcedure
  .input(explainActionSchema)
  .query(async ({ ctx, input }) => {
    return { explanation: await explainAction(input.actionId, ctx.tenantId) }
  }),

undoAction: moduleProcedure
  .input(undoActionSchema)
  .mutation(async ({ ctx, input }) => {
    return undoAction(input.actionId, ctx.tenantId, ctx.user!.id)
  }),

listActions: moduleProcedure
  .input(listActionsSchema)
  .query(async ({ ctx, input }) => {
    if (input.conversationId) {
      return { rows: await agentActionsRepository.listByConversation(input.conversationId, input.limit), hasMore: false }
    }
    return agentActionsRepository.listByTenant(ctx.tenantId, input.limit, input.status as any)
  }),

trustSuggestions: modulePermission("ai:write")
  .input(getTrustSuggestionsSchema)
  .query(async ({ ctx }) => {
    return { suggestions: await analyzeTrustMetrics(ctx.tenantId) }
  }),

updateGuardrail: modulePermission("ai:write")
  .input(updateGuardrailSchema)
  .mutation(async ({ ctx, input }) => {
    const config = await aiConfigRepository.getOrCreate(ctx.tenantId)
    const overrides = { ...config.guardrailOverrides, [input.toolName]: input.tier }
    await aiConfigRepository.update(ctx.tenantId, { guardrailOverrides: overrides })
    return { success: true }
  }),
```

### Inngest events (add to src/shared/inngest.ts):

```typescript
"ai/action.executed": {
  data: { actionId: string; conversationId: string; tenantId: string; toolName: string; status: string }
}
"ai/action.approved": {
  data: { actionId: string; conversationId: string; tenantId: string; toolName: string }
}
"ai/action.rejected": {
  data: { actionId: string; conversationId: string; tenantId: string; toolName: string }
}
```

### Update barrel export (index.ts):

Add exports for new files:
```typescript
export { agentActionsRepository } from "./ai.actions.repository"
export { aiConfigRepository } from "./ai.config.repository"
export { explainAction, undoAction } from "./ai.explainer"
export { analyzeTrustMetrics } from "./ai.trust"
```

**Commit:** `feat(ai): add approval, explainability, and trust management router procedures`

---

## Task 12: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai-phase-b.test.ts`

Test:
1. **Agent actions repository**: create, update status, list by conversation, list by tenant
2. **AI config repository**: getOrCreate, update guardrail overrides, record approval decision
3. **Approval flow**: Mock Redis. Test AUTO execution (no approval needed), CONFIRM flow (mock Redis returning "approved"), CONFIRM rejection, timeout
4. **Guardrail tier resolution**: Default tier, tenant override
5. **Explainability**: Mock Anthropic SDK (Haiku), verify it returns a concise explanation
6. **Trust ratchet**: Test promotion suggestion at 95%+ over 50 decisions, demotion suggestion at 20%+ rejection
7. **Mutation tools**: Mock repositories, verify each mutation tool executes correctly

Use `vi.mock()` for Redis and Anthropic SDK. Follow existing test patterns from Phase A+.

**Commit:** `test(ai): add Phase B tests for approvals, guardrails, trust ratchet, and mutation tools`

---

## Task 13: Verification — tsc + build + tests

Run:
1. `npx tsc --noEmit` — fix any type errors
2. `npm run build` — fix any build errors
3. `npm run test` — all tests must pass

Fix any issues found. If fixes are needed, commit with: `fix(ai): resolve Phase B verification issues`

---

## Post-Implementation Checklist

```
[ ] agent_actions table added to schema + barrel exported
[ ] ai_tenant_config table added to schema + barrel exported
[ ] 6 mutation tools created (2 booking, 2 customer, 2 notification)
[ ] Approval flow works: CONFIRM tools pause and wait for user response
[ ] AUTO tools execute immediately with audit trail
[ ] RESTRICT tools are blocked with explanation
[ ] "Why" button calls Haiku and returns explanation
[ ] Trust metrics tracked per tool per tenant
[ ] New router procedures: resolveApproval, explainAction, undoAction, listActions, trustSuggestions, updateGuardrail
[ ] Chat UI shows approval cards and "Why" button
[ ] All tests pass
[ ] tsc + build pass
```
