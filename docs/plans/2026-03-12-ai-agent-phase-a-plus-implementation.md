# AI Agent Phase A+ Implementation Plan

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Build a working AI agent ("Thin Agent") that queries all existing modules via read-only tools, streams responses to a chat UI, and persists conversations. Delivers the Phase A mockup experience with real data from real modules.

**Timeline:** 10 working days (Week 1: backend, Week 2: frontend + streaming + polish)

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md`
**Mockup Reference:** `src/app/admin/brokerage-mockups/ai-assistant/phase-a/page.tsx`
**Prior Phase A Plan (superseded):** `docs/plans/2026-03-08-ai-native-phase-a-plan.md`

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **Stay on Inngest.** Do NOT introduce Trigger.dev. The agent reasoning loop runs as a direct async function in the service layer (sub-30s execution). Inngest is used only for async events (Phase B+). Streaming is via Redis pub/sub + tRPC subscription.
2. **No ReAct loop.** Use Claude's native `tool_use` protocol. The "loop" is: call Claude with tools → if tool_use blocks in response, execute tools, call Claude again with results → repeat until text response (max 5 iterations).
3. **Tools call repositories directly**, not tRPC. The agent operates server-side at the same privilege level as services.
4. **15-20 hardcoded read-only tools** initially. No manifest scanning, no two-phase tool selection, no AgentToolProvider registry. Those come in Phase A.2.
5. **Two DB tables only:** `ai_conversations` and `ai_messages`. No agent_actions, no ai_knowledge_chunks, no ai_corrections, no ai_mcp_connections.
6. **Use `claude-sonnet-4-20250514`** for the agent (balance of speed and quality). Configurable per-tenant later.

---

## Progress Tracking

Update this section as tasks are completed:

```
[ ] Task 1: Install Anthropic SDK
[ ] Task 2: AI database schema (2 tables)
[ ] Task 3: AI module types
[ ] Task 4: AI Zod schemas
[ ] Task 5: AI repository
[ ] Task 6: Read-only tools (batch 1 — 10 tools)
[ ] Task 7: AI service (agent loop)
[ ] Task 8: AI router
[ ] Task 9: AI manifest + wiring
[ ] Task 10: System prompt engineering + 5 more tools
[ ] Task 11: Chat UI component (real, not mockup)
[ ] Task 12: SSE streaming endpoint
[ ] Task 13: Wire streaming to chat UI
[ ] Task 14: Guardrails (budget, rate limit, RBAC)
[ ] Task 15: Tests
```

---

## Codebase Patterns Reference

### Module file structure (MUST follow exactly)
```
src/modules/ai/
  ai.types.ts           # Interfaces only (no Zod)
  ai.schemas.ts         # Zod schemas for tRPC input validation
  ai.repository.ts      # Drizzle queries only; throws domain errors
  ai.service.ts         # Business logic; calls repo; agent loop here
  ai.router.ts          # tRPC procedures; thin layer; calls service
  ai.prompts.ts         # System prompt templates (NOT inline strings)
  ai.events.ts          # Inngest functions (empty array for Phase A)
  ai.manifest.ts        # Module manifest
  tools/
    booking.tools.ts
    customer.tools.ts
    scheduling.tools.ts
    review.tools.ts
    workflow.tools.ts
    payment.tools.ts
    analytics.tools.ts
    team.tools.ts
    compliance.tools.ts  # If compliance module exists, otherwise skip
    index.ts             # Barrel: flat AgentTool[] array
  index.ts              # Barrel export
  __tests__/ai.test.ts
```

### Import patterns
```typescript
// DB and schema
import { db } from "@/shared/db"
import { tableName } from "@/shared/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"

// Errors (throw these in repo/service, NEVER throw TRPCError)
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError, ValidationError } from "@/shared/errors"

// Logger (object FIRST, message SECOND — Pino v8)
import { logger } from "@/shared/logger"
const log = logger.child({ module: "ai.service" })
log.info({ tenantId, messageId }, "Processing agent request")

// tRPC procedures
import { router, tenantProcedure, permissionProcedure, publicProcedure, createModuleMiddleware } from "@/shared/trpc"

// Inngest (for events only — agent loop does NOT use Inngest in Phase A)
import { inngest } from "@/shared/inngest"

// Zod (v4 — use z.uuid() not z.string().uuid())
import { z } from "zod"
```

### Drizzle ORM patterns
```typescript
// Select one
const [row] = await db.select().from(table).where(and(eq(table.id, id), eq(table.tenantId, tenantId))).limit(1)
return row ?? null

// Paginated list (fetch limit+1, return hasMore)
const limit = input.limit ?? 50
const rows = await db.select().from(table).where(conditions).orderBy(desc(table.createdAt)).limit(limit + 1)
const hasMore = rows.length > limit
return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore }

// Insert
const [created] = await db.insert(table).values({ id: crypto.randomUUID(), ...data }).returning()
return created!

// Transaction
await db.transaction(async (tx) => { /* use tx instead of db */ })
```

### Router patterns
```typescript
const moduleGate = createModuleMiddleware('ai')
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)

export const aiRouter = router({
  // Reads use moduleProcedure (tenantProcedure + module gate)
  list: moduleProcedure.input(schema).query(({ ctx, input }) => service.method(ctx.tenantId, input)),
  // Writes use modulePermission
  create: modulePermission("ai:write").input(schema).mutation(({ ctx, input }) => service.method(ctx, input)),
})
```

### Inngest event patterns
```typescript
// In shared/inngest.ts — add new events to the IronheartEvents type:
"ai/chat.completed": { data: { conversationId: string; tenantId: string; tokensUsed: number } }

// In events file:
export const aiFunctions = [] // Empty for Phase A — agent runs synchronously

// In src/app/api/inngest/route.ts — add:
import { aiFunctions } from "@/modules/ai"
// Then add ...aiFunctions to the functions array
```

### Schema barrel pattern
```typescript
// In src/shared/db/schema.ts — add this line:
export * from "./schemas/ai.schema"
```

### Module registration pattern
```typescript
// In src/shared/module-system/register-all.ts — add:
import { aiManifest } from '@/modules/ai/ai.manifest'
moduleRegistry.register(aiManifest)
```

### Root router pattern
```typescript
// In src/server/root.ts — add:
import { aiRouter } from "@/modules/ai"
// Then add to router():  ai: aiRouter,
```

---

## Task 1: Install Anthropic SDK

**Files:**
- Modify: `package.json`

**Step 1:** Run:
```bash
npm install @anthropic-ai/sdk
```

**Step 2:** Verify it installed by checking `package.json` has `"@anthropic-ai/sdk"` in dependencies.

**Step 3:** Add env var to `.env.example`:
```
# AI Agent
ANTHROPIC_API_KEY=
```

**Commit:** `feat(ai): add Anthropic SDK dependency`

---

## Task 2: AI Database Schema

**Files:**
- Create: `src/shared/db/schemas/ai.schema.ts`
- Modify: `src/shared/db/schema.ts` (add barrel export)

**Step 1: Create the AI schema file**

Only 2 tables. Keep it minimal — more tables come in Phase A.2/B.

```typescript
// src/shared/db/schemas/ai.schema.ts

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"

// ---------------------------------------------------------------------------
// AI Conversations — one per chat session
// ---------------------------------------------------------------------------

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title"),
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  tokenCount: integer("token_count").notNull().default(0),
  costCents: integer("cost_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_conversations_tenant_user").on(t.tenantId, t.userId),
  index("idx_ai_conversations_status").on(t.tenantId, t.status),
])

// ---------------------------------------------------------------------------
// AI Messages — individual turns in a conversation
// ---------------------------------------------------------------------------

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id),
  role: text("role").notNull(), // 'system' | 'user' | 'assistant'
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"), // Array of { id, name, input } — null if no tool calls
  toolResults: jsonb("tool_results"), // Array of { toolCallId, output, error? } — null if not a tool result turn
  tokenUsage: jsonb("token_usage"), // { inputTokens, outputTokens, model } — only on assistant messages
  pageContext: jsonb("page_context"), // { route, entityType?, entityId? } — only on user messages
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_messages_conversation").on(t.conversationId),
  index("idx_ai_messages_created").on(t.conversationId, t.createdAt),
])
```

**Step 2: Add barrel export**

In `src/shared/db/schema.ts`, add at the end:
```typescript
export * from "./schemas/ai.schema"
```

**Commit:** `feat(ai): add AI conversations and messages database schema`

---

## Task 3: AI Module Types

**Files:**
- Create: `src/modules/ai/ai.types.ts`

```typescript
// src/modules/ai/ai.types.ts

import type { z, ZodType } from "zod"

// ---------------------------------------------------------------------------
// Agent Tool — the contract every tool implements
// ---------------------------------------------------------------------------

export interface AgentTool {
  /** Namespaced tool name: 'booking.list', 'customer.getById' */
  name: string
  /** Natural language description for the LLM */
  description: string
  /** JSON Schema for the tool's input parameters */
  inputSchema: Record<string, unknown>
  /** Execute the tool — receives validated input and tenant context */
  execute: (input: unknown, ctx: AgentContext) => Promise<unknown>
  /** Which module this tool belongs to */
  module: string
  /** Required RBAC permission (checked before execution). Null = no check. */
  permission: string | null
}

// ---------------------------------------------------------------------------
// Agent Context — passed to every tool execution
// ---------------------------------------------------------------------------

export interface AgentContext {
  tenantId: string
  userId: string
  userPermissions: string[]
  pageContext?: PageContext
}

export interface PageContext {
  route: string
  entityType?: string
  entityId?: string
  listFilters?: Record<string, unknown>
  selectedIds?: string[]
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface ConversationRecord {
  id: string
  tenantId: string
  userId: string
  title: string | null
  status: "active" | "archived"
  tokenCount: number
  costCents: number
  createdAt: Date
  updatedAt: Date
}

export interface MessageRecord {
  id: string
  conversationId: string
  role: "system" | "user" | "assistant"
  content: string
  toolCalls: ToolCallRecord[] | null
  toolResults: ToolResultRecord[] | null
  tokenUsage: TokenUsage | null
  pageContext: PageContext | null
  createdAt: Date
}

export interface ToolCallRecord {
  id: string
  name: string
  input: unknown
}

export interface ToolResultRecord {
  toolCallId: string
  output: unknown
  error?: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: string
}

// ---------------------------------------------------------------------------
// Agent Response — returned from the agent service to the router
// ---------------------------------------------------------------------------

export interface AgentResponse {
  conversationId: string
  messageId: string
  content: string
  toolCalls: ToolCallRecord[]
  toolResults: ToolResultRecord[]
  tokenUsage: TokenUsage
}

// ---------------------------------------------------------------------------
// Streaming Events — emitted via Redis pub/sub for SSE
// ---------------------------------------------------------------------------

export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; result: unknown; durationMs: number }
  | { type: "text_delta"; content: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; content: string; tokenUsage: TokenUsage; toolCallCount: number }
```

**Commit:** `feat(ai): add AI module domain types`

---

## Task 4: AI Zod Schemas

**Files:**
- Create: `src/modules/ai/ai.schemas.ts`

```typescript
// src/modules/ai/ai.schemas.ts

import { z } from "zod"

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(), // null = new conversation
  message: z.string().min(1).max(10000),
  pageContext: z.object({
    route: z.string(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    listFilters: z.record(z.string(), z.unknown()).optional(),
    selectedIds: z.array(z.string()).optional(),
  }).optional(),
})

export const listConversationsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export const getConversationSchema = z.object({
  conversationId: z.string(),
})

export const archiveConversationSchema = z.object({
  conversationId: z.string(),
})
```

**Commit:** `feat(ai): add AI module Zod schemas`

---

## Task 5: AI Repository

**Files:**
- Create: `src/modules/ai/ai.repository.ts`

```typescript
// src/modules/ai/ai.repository.ts

import { db } from "@/shared/db"
import { aiConversations, aiMessages } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import type { ConversationRecord, MessageRecord, PageContext, TokenUsage, ToolCallRecord, ToolResultRecord } from "./ai.types"

const log = logger.child({ module: "ai.repository" })

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapConversation(row: typeof aiConversations.$inferSelect): ConversationRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    title: row.title,
    status: row.status as "active" | "archived",
    tokenCount: row.tokenCount,
    costCents: row.costCents,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapMessage(row: typeof aiMessages.$inferSelect): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "system" | "user" | "assistant",
    content: row.content,
    toolCalls: (row.toolCalls as ToolCallRecord[] | null) ?? null,
    toolResults: (row.toolResults as ToolResultRecord[] | null) ?? null,
    tokenUsage: (row.tokenUsage as TokenUsage | null) ?? null,
    pageContext: (row.pageContext as PageContext | null) ?? null,
    createdAt: row.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const aiRepository = {
  // ---- Conversations ----

  async createConversation(tenantId: string, userId: string): Promise<ConversationRecord> {
    const [row] = await db
      .insert(aiConversations)
      .values({ tenantId, userId })
      .returning()
    log.info({ tenantId, conversationId: row!.id }, "Conversation created")
    return mapConversation(row!)
  },

  async getConversation(tenantId: string, conversationId: string): Promise<ConversationRecord | null> {
    const [row] = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.tenantId, tenantId)))
      .limit(1)
    return row ? mapConversation(row) : null
  },

  async listConversations(tenantId: string, userId: string, limit: number, cursor?: string) {
    const conditions = [
      eq(aiConversations.tenantId, tenantId),
      eq(aiConversations.userId, userId),
    ]
    // TODO: cursor-based pagination if needed
    const rows = await db
      .select()
      .from(aiConversations)
      .where(and(...conditions))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: (hasMore ? rows.slice(0, limit) : rows).map(mapConversation),
      hasMore,
    }
  },

  async updateConversation(
    conversationId: string,
    updates: { title?: string; status?: string; tokenCount?: number; costCents?: number }
  ) {
    await db
      .update(aiConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId))
  },

  // ---- Messages ----

  async addMessage(
    conversationId: string,
    message: {
      role: string
      content: string
      toolCalls?: ToolCallRecord[]
      toolResults?: ToolResultRecord[]
      tokenUsage?: TokenUsage
      pageContext?: PageContext
    }
  ): Promise<MessageRecord> {
    const [row] = await db
      .insert(aiMessages)
      .values({
        conversationId,
        role: message.role,
        content: message.content,
        toolCalls: message.toolCalls ?? null,
        toolResults: message.toolResults ?? null,
        tokenUsage: message.tokenUsage ?? null,
        pageContext: message.pageContext ?? null,
      })
      .returning()
    return mapMessage(row!)
  },

  async getMessages(conversationId: string, limit = 50): Promise<MessageRecord[]> {
    const rows = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt)
      .limit(limit)
    return rows.map(mapMessage)
  },
}
```

**Commit:** `feat(ai): add AI repository for conversations and messages`

---

## Task 6: Read-Only Tools (Batch 1 — 10 tools)

**Files:**
- Create: `src/modules/ai/tools/booking.tools.ts`
- Create: `src/modules/ai/tools/customer.tools.ts`
- Create: `src/modules/ai/tools/scheduling.tools.ts`
- Create: `src/modules/ai/tools/review.tools.ts`
- Create: `src/modules/ai/tools/payment.tools.ts`
- Create: `src/modules/ai/tools/analytics.tools.ts`
- Create: `src/modules/ai/tools/index.ts`

### Critical rules for tools:
- Every tool calls **repository methods directly** (import from the module's repository)
- Every tool receives `AgentContext` with `tenantId` — **always pass tenantId** to repo calls
- Tool `inputSchema` is **JSON Schema** (not Zod) — the Anthropic SDK uses JSON Schema for tool definitions
- Tool `execute` returns **serializable data** (no Date objects — convert to ISO strings)
- Keep tool descriptions **concise but specific** — Claude uses these to decide which tool to call

### Example tool file:

```typescript
// src/modules/ai/tools/booking.tools.ts

import type { AgentTool } from "../ai.types"
import { bookingRepository } from "@/modules/booking/booking.repository"

export const bookingTools: AgentTool[] = [
  {
    name: "booking.list",
    description: "List bookings with optional filters. Returns bookings with customer name, service, date, status. Use this to find upcoming, past, or filtered bookings.",
    module: "booking",
    permission: "bookings:read",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["PENDING", "APPROVED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
          description: "Filter by booking status",
        },
        customerId: { type: "string", description: "Filter by customer ID" },
        staffId: { type: "string", description: "Filter by assigned staff ID" },
        dateFrom: { type: "string", description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: "string", description: "End date (YYYY-MM-DD)" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await bookingRepository.list(ctx.tenantId, {
        status: params.status as string | undefined,
        customerId: params.customerId as string | undefined,
        staffId: params.staffId as string | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "booking.getById",
    description: "Get full details of a specific booking by its ID. Returns all booking fields including customer, service, staff, dates, status, and notes.",
    module: "booking",
    permission: "bookings:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The booking ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return bookingRepository.findById(ctx.tenantId, id)
    },
  },
]
```

### Tool barrel file:

```typescript
// src/modules/ai/tools/index.ts

import type { AgentTool } from "../ai.types"
import { bookingTools } from "./booking.tools"
import { customerTools } from "./customer.tools"
import { schedulingTools } from "./scheduling.tools"
import { reviewTools } from "./review.tools"
import { paymentTools } from "./payment.tools"
import { analyticsTools } from "./analytics.tools"

export const allTools: AgentTool[] = [
  ...bookingTools,
  ...customerTools,
  ...schedulingTools,
  ...reviewTools,
  ...paymentTools,
  ...analyticsTools,
]

export function getToolsForUser(tools: AgentTool[], userPermissions: string[]): AgentTool[] {
  return tools.filter(
    (tool) => tool.permission === null || userPermissions.includes(tool.permission)
  )
}
```

**Important:** When implementing each tool file, you MUST:
1. Read the corresponding module's repository file first to understand available methods and their signatures
2. Read the module's types file to understand the data shapes
3. Match the repository method signatures exactly (tenantId, filters, etc.)
4. Handle the case where a repository method returns null (for getById-style tools)

**Build 2 tools per module for these modules:** booking, customer, scheduling, review, payment. That gives 10 tools. Each module gets a `list` and a `getById` tool at minimum.

**Commit:** `feat(ai): add 10 read-only agent tools across 5 modules`

---

## Task 7: AI Service (Agent Loop)

**Files:**
- Create: `src/modules/ai/ai.service.ts`
- Create: `src/modules/ai/ai.prompts.ts`

### ai.prompts.ts

```typescript
// src/modules/ai/ai.prompts.ts

export const SYSTEM_PROMPT = `You are an AI assistant for a multi-tenant business platform. You have access to read-only tools that can query bookings, customers, scheduling, reviews, payments, analytics, and more.

RULES:
- You can ONLY read data. You cannot create, update, or delete anything.
- Always use tools to look up real data. Never guess or make up data.
- When the user refers to "this", "it", or "these", check the page context to resolve the reference.
- Present data clearly. Use structured formats when showing multiple records.
- If a tool returns null or empty results, say so clearly.
- Keep responses concise. Lead with the answer, then explain if needed.
- If you need more information to answer, ask a specific clarifying question.
- Respect tenant isolation — you only have access to this tenant's data.

PAGE CONTEXT:
The user is currently viewing: {{pageContext}}
When they say "this" or "here", they are referring to the entity on this page.`

export function buildSystemPrompt(pageContext?: { route: string; entityType?: string; entityId?: string }): string {
  const contextStr = pageContext
    ? `Route: ${pageContext.route}${pageContext.entityType ? `, Entity: ${pageContext.entityType}` : ""}${pageContext.entityId ? ` (ID: ${pageContext.entityId})` : ""}`
    : "No specific page context"

  return SYSTEM_PROMPT.replace("{{pageContext}}", contextStr)
}
```

### ai.service.ts

```typescript
// src/modules/ai/ai.service.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { aiRepository } from "./ai.repository"
import { allTools, getToolsForUser } from "./tools"
import { buildSystemPrompt } from "./ai.prompts"
import type { AgentContext, AgentResponse, AgentStreamEvent, ToolCallRecord, ToolResultRecord, TokenUsage, PageContext } from "./ai.types"

const log = logger.child({ module: "ai.service" })

// Lazy-init singleton — NEVER construct at module load time
let anthropicClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic()  // reads ANTHROPIC_API_KEY from env
  }
  return anthropicClient
}

const MAX_TOOL_ITERATIONS = 5
const DEFAULT_MODEL = "claude-sonnet-4-20250514"
const MAX_TOKENS = 4096

export const aiService = {
  async sendMessage(
    tenantId: string,
    userId: string,
    userPermissions: string[],
    input: {
      conversationId?: string
      message: string
      pageContext?: PageContext
    }
  ): Promise<AgentResponse> {
    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await aiRepository.getConversation(tenantId, input.conversationId)
      : null

    if (!conversation) {
      conversation = await aiRepository.createConversation(tenantId, userId)
    }

    // 2. Save user message
    await aiRepository.addMessage(conversation.id, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
    })

    // 3. Load conversation history (last 20 messages max for context window)
    const history = await aiRepository.getMessages(conversation.id, 20)

    // 4. Build Anthropic messages array from history
    const anthropicMessages: Anthropic.MessageParam[] = history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))

    // 5. Get tools available to this user
    const ctx: AgentContext = { tenantId, userId, userPermissions, pageContext: input.pageContext }
    const availableTools = getToolsForUser(allTools, userPermissions)

    // 6. Convert tools to Anthropic format
    const anthropicTools: Anthropic.Tool[] = availableTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
    }))

    // 7. Agent loop — call Claude, execute tools, repeat
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
        tools: anthropicTools,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      // Extract text blocks and tool_use blocks
      const textBlocks = response.content.filter((b) => b.type === "text")
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use")

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
        finalContent = textBlocks.map((b) => b.text).join("\n")
        break
      }

      // Append assistant message with tool_use content
      anthropicMessages.push({ role: "assistant", content: response.content })

      // Execute each tool call
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        const tool = availableTools.find((t) => t.name === toolUse.name)
        const toolCallRecord: ToolCallRecord = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        }
        allToolCalls.push(toolCallRecord)

        if (!tool) {
          const errorResult = { toolCallId: toolUse.id, output: null, error: `Unknown tool: ${toolUse.name}` }
          allToolResults.push(errorResult)
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: errorResult.error }) })
          continue
        }

        try {
          const startMs = Date.now()
          const result = await tool.execute(toolUse.input, ctx)
          const durationMs = Date.now() - startMs

          const resultStr = JSON.stringify(result, null, 2)
          log.info({ tool: toolUse.name, durationMs }, "Tool executed")

          allToolResults.push({ toolCallId: toolUse.id, output: result })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: resultStr })
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
          log.error({ err, tool: toolUse.name }, "Tool execution error")

          allToolResults.push({ toolCallId: toolUse.id, output: null, error: errorMsg })
          toolResultBlocks.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: errorMsg }), is_error: true })
        }
      }

      // Append tool results
      anthropicMessages.push({ role: "user", content: toolResultBlocks })
    }

    // 8. Save assistant response
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

    // 9. Update conversation token count + generate title if first message
    const newTokenCount = conversation.tokenCount + totalInputTokens + totalOutputTokens
    const updates: Record<string, unknown> = {
      tokenCount: newTokenCount,
      costCents: conversation.costCents + estimateCostCents(totalInputTokens, totalOutputTokens),
    }

    if (!conversation.title && history.length <= 2) {
      // Auto-generate title from first user message (truncate)
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

// Rough cost estimation (Sonnet 4 pricing — update if model changes)
function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 300  // $3.00 per 1M input tokens
  const outputCostPer1M = 1500 // $15.00 per 1M output tokens
  const cost = (inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M
  return Math.ceil(cost) // Round up to nearest cent
}
```

**Commit:** `feat(ai): add AI service with Claude tool-use agent loop`

---

## Task 8: AI Router

**Files:**
- Create: `src/modules/ai/ai.router.ts`

```typescript
// src/modules/ai/ai.router.ts

import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc"
import { aiService } from "./ai.service"
import { aiRepository } from "./ai.repository"
import { sendMessageSchema, listConversationsSchema, getConversationSchema, archiveConversationSchema } from "./ai.schemas"

const moduleGate = createModuleMiddleware("ai")
const moduleProcedure = tenantProcedure.use(moduleGate)

export const aiRouter = router({
  sendMessage: moduleProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // Extract user permissions from ctx.user
      const userPermissions = ctx.user?.roles?.flatMap((r) => r.permissions ?? []) ?? []

      return aiService.sendMessage(ctx.tenantId, ctx.user!.id, userPermissions, {
        conversationId: input.conversationId,
        message: input.message,
        pageContext: input.pageContext,
      })
    }),

  listConversations: moduleProcedure
    .input(listConversationsSchema)
    .query(({ ctx, input }) =>
      aiRepository.listConversations(ctx.tenantId, ctx.user!.id, input.limit, input.cursor)
    ),

  getConversation: moduleProcedure
    .input(getConversationSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await aiRepository.getConversation(ctx.tenantId, input.conversationId)
      if (!conversation) return null

      const messages = await aiRepository.getMessages(input.conversationId)
      return { ...conversation, messages }
    }),

  archiveConversation: moduleProcedure
    .input(archiveConversationSchema)
    .mutation(async ({ ctx, input }) => {
      await aiRepository.updateConversation(input.conversationId, { status: "archived" })
      return { success: true }
    }),
})

export type AIRouter = typeof aiRouter
```

**Important:** The `ctx.user` shape depends on how your tRPC context loads users. Check `src/shared/trpc.ts` for how `tenantProcedure` populates `ctx.user` and specifically how permissions/roles are structured. The `userPermissions` extraction above may need adjusting based on the actual `UserWithRoles` type.

**Commit:** `feat(ai): add AI tRPC router`

---

## Task 9: AI Manifest + Wiring

**Files:**
- Create: `src/modules/ai/ai.manifest.ts`
- Create: `src/modules/ai/ai.events.ts`
- Create: `src/modules/ai/index.ts`
- Modify: `src/shared/module-system/register-all.ts`
- Modify: `src/server/root.ts`
- Modify: `src/app/api/inngest/route.ts`
- Modify: `src/shared/inngest.ts`

### ai.manifest.ts

```typescript
// src/modules/ai/ai.manifest.ts

import type { ModuleManifest } from "@/shared/module-system/types"

export const aiManifest: ModuleManifest = {
  slug: "ai",
  name: "AI Assistant",
  description: "AI-powered assistant with read-only access to all modules",
  icon: "Brain",
  category: "intelligence",
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ["ai:read", "ai:write"],
  eventsProduced: ["ai/chat.completed"],
  eventsConsumed: [],
  isCore: false,
  availability: "addon",
  auditResources: ["ai-conversation"],
}
```

### ai.events.ts

```typescript
// src/modules/ai/ai.events.ts

// Phase A: No Inngest functions — agent runs synchronously in service layer.
// Phase B will add: approval handling, overnight processing, morning briefing.

export const aiFunctions = []
```

### index.ts

```typescript
// src/modules/ai/index.ts

export { aiRouter } from "./ai.router"
export { aiFunctions } from "./ai.events"
export { aiService } from "./ai.service"
export type { AgentTool, AgentContext, ConversationRecord, MessageRecord, AgentResponse } from "./ai.types"
```

### Wiring changes:

**src/shared/inngest.ts** — Add to the `IronheartEvents` type:
```typescript
"ai/chat.completed": { data: { conversationId: string; tenantId: string; tokensUsed: number } }
```

**src/shared/module-system/register-all.ts** — Add:
```typescript
import { aiManifest } from "@/modules/ai/ai.manifest"
// Then in the registration block:
moduleRegistry.register(aiManifest)
```

**src/server/root.ts** — Add:
```typescript
import { aiRouter } from "@/modules/ai"
// Then in router({ ... }):
ai: aiRouter,
```

**src/app/api/inngest/route.ts** — Add:
```typescript
import { aiFunctions } from "@/modules/ai"
// Then in functions array:
...aiFunctions,
```

**Commit:** `feat(ai): wire AI module into root router, registry, and Inngest`

---

## Task 10: System Prompt Engineering + 5 More Tools

**Files:**
- Modify: `src/modules/ai/ai.prompts.ts` (enhance system prompt with BNG context)
- Create: `src/modules/ai/tools/workflow.tools.ts`
- Create: `src/modules/ai/tools/team.tools.ts`
- Modify: `src/modules/ai/tools/index.ts` (add new tool imports)

### Enhanced system prompt

Read the BNG brokerage mockup data at `src/app/admin/brokerage-mockups/` to understand the domain terminology (sites, biodiversity units, catchments, habitat types, deals, compliance). Update the system prompt in `ai.prompts.ts` to include this context.

The prompt should include a section like:
```
DOMAIN CONTEXT:
This platform manages BNG (Biodiversity Net Gain) credit brokerage. Key concepts:
- Sites: Habitat sites that produce biodiversity units (BDUs). Each site has a location, area, habitat type, and registration status with Natural England (NE).
- Deals: Transactions between landowners (supply) and developers (demand) for biodiversity units.
- Compliance: Regulatory requirements including NE registration, HMMP (Habitat Management & Monitoring Plans), and S106 agreements.
- Catchments: Geographic regions (e.g., Solent, Thames) that constrain which sites can serve which developers.

When referring to bookings, they are "site assessments" or "ecological surveys" in this context.
When referring to customers, they are "landowners" or "developers".
When referring to staff, they are "ecologists" or "compliance officers".
```

### Additional tools:
- `workflow.list` — list active workflows
- `workflow.getById` — get workflow details
- `team.list` — list team members
- `team.getById` — get team member details
- One more tool that is particularly useful for BNG queries (check what repos have relevant methods)

**Commit:** `feat(ai): enhance system prompt with BNG domain context and add 5 more tools`

---

## Task 11: Chat UI Component

**Files:**
- Create: `src/app/admin/ai-chat/page.tsx` (or appropriate route)
- Reuse/adapt components from `src/app/admin/brokerage-mockups/ai-assistant/_components/`

This task creates the real chat UI. The approach:

1. **Read the existing mockup components** at `src/app/admin/brokerage-mockups/ai-assistant/_components/` — specifically `streaming-tool-call.tsx`, `entity-card.tsx`, and `approval-card.tsx`. These are the design reference.
2. **Build a "use client" page** with:
   - Message list (user messages + assistant messages)
   - Text input with submit button
   - Loading state while waiting for agent response
   - Tool call visualization using the `StreamingToolCall` component pattern
   - Conversation sidebar listing past conversations
3. **Wire to tRPC**: `trpc.ai.sendMessage.mutate()`, `trpc.ai.listConversations.useQuery()`, `trpc.ai.getConversation.useQuery()`
4. **No streaming yet** — this task shows a loading spinner, then renders the full response. Task 12 adds streaming.

**Commit:** `feat(ai): add live AI chat page with tool call visualization`

---

## Task 12: SSE Streaming Endpoint

**Files:**
- Create: `src/app/api/ai/stream/route.ts` (Next.js route handler for SSE)
- Modify: `src/modules/ai/ai.service.ts` (add streaming variant)

### Approach:

Use `anthropic.messages.stream()` instead of `.create()`. The streaming variant yields events as they happen.

The Next.js route handler returns a `ReadableStream` that the frontend consumes as an `EventSource`.

```typescript
// src/app/api/ai/stream/route.ts (pseudocode structure)

export async function POST(req: Request) {
  // 1. Authenticate request (extract session from headers/cookies)
  // 2. Parse body: { conversationId?, message, pageContext? }
  // 3. Create ReadableStream
  // 4. In the stream controller:
  //    - Call aiService.sendMessageStreaming() which yields AgentStreamEvent objects
  //    - For each event, write SSE-formatted data to the stream
  // 5. Return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

The service method `sendMessageStreaming` uses `client.messages.stream()` and yields events for each tool call and text delta. The frontend receives these events and renders them progressively.

**Commit:** `feat(ai): add SSE streaming endpoint for real-time agent responses`

---

## Task 13: Wire Streaming to Chat UI

**Files:**
- Modify: Chat UI page from Task 11

Replace the mutation-based approach with SSE streaming:
1. On submit, POST to `/api/ai/stream` with the message
2. Read the SSE stream and dispatch events to state
3. Render tool calls as they arrive (using `StreamingToolCall` component)
4. Render text deltas as they arrive
5. Show final response when `done` event arrives

**Commit:** `feat(ai): wire SSE streaming to chat UI for real-time tool call display`

---

## Task 14: Guardrails

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

Add these checks to `sendMessage`:

1. **Token budget**: If conversation `tokenCount` exceeds 50,000, reject with a message explaining the limit. Start a new conversation.
2. **Rate limiting**: Use Redis to track messages per user per minute. Limit: 20 messages/minute. Key: `ai:rate:{tenantId}:{userId}`.
3. **RBAC on tools**: Already handled by `getToolsForUser()` — verify it works correctly.
4. **Tool call timeout**: Wrap each `tool.execute()` in a Promise.race with a 10-second timeout.
5. **Max message length**: Already in schema (10,000 chars) — verify Zod validates this.

```typescript
// Redis rate limiting pattern (use existing Upstash Redis):
import { redis } from "@/shared/redis"

async function checkRateLimit(tenantId: string, userId: string): Promise<boolean> {
  const key = `ai:rate:${tenantId}:${userId}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60) // 1 minute window
  }
  return current <= 20
}
```

**Commit:** `feat(ai): add rate limiting, token budget, and tool timeout guardrails`

---

## Task 15: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai.test.ts`

Test the following:
1. **Repository**: Create conversation, add messages, list conversations, get messages
2. **Tool execution**: Mock a tool's repository dependency, verify tool returns expected data
3. **Service**: Mock the Anthropic SDK, verify:
   - Single-turn (no tools) → returns text response
   - Multi-turn (tool calls) → executes tools and returns final response
   - Unknown tool → returns error in tool result
   - Tool timeout → returns error in tool result
4. **Rate limiting**: Verify rate limit is enforced
5. **RBAC**: Verify tools are filtered by user permissions

Use `vitest` with `pool: "forks"` (already configured in `vitest.config.ts`).

Mock the Anthropic SDK:
```typescript
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
      stream: vi.fn(),
    },
  })),
}))
```

**Commit:** `test(ai): add AI module tests for repository, service, and tools`

---

## Post-Implementation Checklist

After all 15 tasks are complete, verify:

```
[ ] `npm run build` passes with no tsc errors
[ ] `npm run test` passes (all existing 224 tests + new AI tests)
[ ] AI module registered in module-system/register-all.ts
[ ] AI router wired into root.ts
[ ] AI events wired into Inngest route
[ ] AI schema exported from schema barrel
[ ] .env.example has ANTHROPIC_API_KEY
[ ] Chat UI accessible at the configured route
[ ] Can type a question and get a real response with tool calls
[ ] Tool calls are visible in the chat UI
[ ] Conversation history is persisted and loadable
[ ] Rate limiting works (>20 messages/min returns error)
```

---

## Phase A.2 (Deferred — Build After Phase A+ is Stable)

These items are explicitly deferred. Do NOT build them during Phase A+:

- [ ] AgentToolProvider interface + manifest-based tool discovery
- [ ] Two-phase tool selection (Haiku for intent classification)
- [ ] Inngest function for durable agent execution (needed for Phase B approval pauses)
- [ ] Redis pub/sub streaming (alternative to SSE if needed)
- [ ] Agent actions audit table (separate from messages)
- [ ] ai_knowledge_chunks + pgvector (Phase D)
- [ ] ai_corrections table (Phase D)
- [ ] ai_mcp_connections table (Phase E)
- [ ] MCP server/client (Phase E)
- [ ] Trigger.dev migration (may never be needed)
- [ ] Trust ratchet system (Phase B)
- [ ] Approval/CONFIRM tier (Phase B)
- [ ] Ghost Operator / autonomous operations (Phase E)
