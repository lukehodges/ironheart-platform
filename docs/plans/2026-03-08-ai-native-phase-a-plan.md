# AI-Native Platform — Phase A Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the AI module foundation, agent runtime, tool infrastructure, and chat interface so users can chat with the agent and it can read data across all modules (read-only — no mutations yet).

**Architecture:** Agent-in-AI module (Approach B). Agent runtime at `src/modules/ai/agent/`. Tool discovery via `AgentToolProvider` scanning module manifests. ReAct loop runs as a Trigger.dev task with Realtime streaming to the frontend. Two-phase tool selection keeps context lean.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), Trigger.dev v3, tRPC 11, Drizzle ORM, Zod v4, Redis (Upstash), React 19, Tailwind 4

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md`
**Tier 1 Design:** `docs/plans/2026-03-01-ai-module-tier1-design.md`

---

## Task Dependencies

```
Task 1 (Trigger.dev setup)         ─┐
Task 2 (DB schema)                  │
Task 3 (AI types)                   ├─ All independent, parallel
Task 4 (Agent types)                │
Task 5 (Provider abstraction)       ─┘
                                     │
Task 6 (AI Zod schemas)            ─── depends on Task 3
Task 7 (AgentToolProvider + registry)── depends on Task 4
                                     │
Task 8 (AI repository)             ─── depends on Tasks 2, 3, 6
Task 9 (Module tool declarations)  ─── depends on Task 7
                                     │
Task 10 (Agent context)            ─── depends on Tasks 4, 8
Task 11 (Agent planner)            ─── depends on Tasks 4, 5, 7
Task 12 (Agent executor)           ─── depends on Tasks 4, 7
Task 13 (Agent errors)             ─── depends on Task 4
Task 14 (Agent streaming)          ─── depends on Tasks 1, 4
                                     │
Task 15 (Agent runtime)            ─── depends on Tasks 10-14
                                     │
Task 16 (AI service)               ─── depends on Tasks 5, 7, 8, 15
Task 17 (AI router)                ─── depends on Tasks 6, 16
Task 18 (AI events)                ─── depends on Tasks 1, 16
Task 19 (AI manifest)              ─── depends on Task 3
                                     │
Task 20 (Wiring)                   ─── depends on Tasks 17, 18, 19
Task 21 (Tests)                    ─── depends on all above
```

---

## Task 1: Trigger.dev Setup

**Files:**
- Create: `src/shared/trigger/client.ts`
- Create: `trigger.config.ts` (project root)
- Modify: `package.json` (add dependency)
- Modify: `.env.example` (add env vars)

**Step 1: Install Trigger.dev SDK**

Run: `npm install @trigger.dev/sdk@latest`

**Step 2: Create Trigger.dev client**

```typescript
// src/shared/trigger/client.ts

import { configure } from "@trigger.dev/sdk/v3"

// Configure Trigger.dev — call this once at app startup
// Env vars: TRIGGER_SECRET_KEY (server), TRIGGER_PUBLIC_API_KEY (client)
export function initTrigger() {
  configure({
    secretKey: process.env.TRIGGER_SECRET_KEY,
  })
}
```

**Step 3: Create trigger.config.ts at project root**

```typescript
// trigger.config.ts

import { defineConfig } from "@trigger.dev/sdk/v3"

export default defineConfig({
  project: "ironheart",
  runtime: "node",
  logLevel: "log",
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["src/modules/ai/agent/tasks"],
})
```

**Step 4: Add env vars to .env.example**

Add:
```
# Trigger.dev
TRIGGER_SECRET_KEY=
TRIGGER_PUBLIC_API_KEY=
```

**Step 5: Commit**

```bash
git add src/shared/trigger/client.ts trigger.config.ts package.json package-lock.json .env.example
git commit -m "feat(ai): add Trigger.dev SDK setup and configuration"
```

---

## Task 2: AI Database Schema

**Files:**
- Create: `src/shared/db/schemas/ai.schema.ts`
- Modify: `src/shared/db/schema.ts` (add barrel export)

**Step 1: Create the AI schema file**

This defines 6 tables from the design doc: `ai_conversations`, `agent_actions`, `ai_knowledge_chunks`, `ai_corrections`, `ai_mcp_connections`, `ai_workflow_suggestions`. Plus the Tier 1 tables: `promptTemplates`, `aiUsageRecords`, `aiTenantConfig`.

```typescript
// src/shared/db/schemas/ai.schema.ts

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"

// --- Tier 1 Tables ---

export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  featureKey: text("feature_key").notNull(),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPrompt: text("user_prompt").notNull(),
  model: text("model"),
  maxTokens: integer("max_tokens"),
  temperature: text("temperature"), // stored as string to preserve precision
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_prompt_templates_tenant_feature").on(t.tenantId, t.featureKey),
])

export const aiUsageRecords = pgTable("ai_usage_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").references(() => users.id),
  featureKey: text("feature_key").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  costCents: integer("cost_cents").notNull().default(0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_usage_tenant_date").on(t.tenantId, t.createdAt),
])

export const aiTenantConfig = pgTable("ai_tenant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id).unique(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  defaultModel: text("default_model").notNull().default("claude-haiku-4-5-20251001"),
  maxTokensPerRequest: integer("max_tokens_per_request").notNull().default(2048),
  monthlyTokenBudget: integer("monthly_token_budget").notNull().default(1000000),
  // Agent-specific config (Phase A)
  guardrails: jsonb("guardrails").default({}),
  verticalProfile: jsonb("vertical_profile").default({}),
  toolDescriptionOverrides: jsonb("tool_description_overrides").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// --- Agent Tables ---

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title"),
  messages: jsonb("messages").notNull().default([]),
  status: text("status").notNull().default("active"),
  pageContext: jsonb("page_context"),
  tokenCount: integer("token_count").notNull().default(0),
  costCents: integer("cost_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_conversations_tenant_user").on(t.tenantId, t.userId),
  index("idx_ai_conversations_status").on(t.tenantId, t.status),
])

export const agentActions = pgTable("agent_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  toolName: text("tool_name").notNull(),
  toolInput: jsonb("tool_input").notNull(),
  toolOutput: jsonb("tool_output"),
  approvalTier: text("approval_tier").notNull(),
  approvalDecision: text("approval_decision"),
  approvedBy: uuid("approved_by").references(() => users.id),
  reasoning: text("reasoning"),
  compensationAvailable: boolean("compensation_available").notNull().default(false),
  compensatedAt: timestamp("compensated_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_agent_actions_conversation").on(t.conversationId),
  index("idx_agent_actions_tenant").on(t.tenantId, t.createdAt),
])

export const aiKnowledgeChunks = pgTable("ai_knowledge_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  title: text("title"),
  content: text("content").notNull(),
  // Note: embedding column (vector(1536)) added via raw SQL migration
  // pgvector requires the extension and cannot be defined via Drizzle yet
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_knowledge_tenant").on(t.tenantId),
])

export const aiCorrections = pgTable("ai_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  conversationId: uuid("conversation_id").references(() => aiConversations.id),
  toolName: text("tool_name").notNull(),
  attemptedParameters: jsonb("attempted_parameters").notNull(),
  correctionReason: text("correction_reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_corrections_tenant_tool").on(t.tenantId, t.toolName),
])

export const aiMcpConnections = pgTable("ai_mcp_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  serverUrl: text("server_url").notNull(),
  transportType: text("transport_type").notNull(),
  authType: text("auth_type").notNull(),
  authConfig: jsonb("auth_config").notNull().default({}),
  toolFilter: jsonb("tool_filter"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_mcp_connections_tenant").on(t.tenantId),
])

export const aiWorkflowSuggestions = pgTable("ai_workflow_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  nodes: jsonb("nodes").notNull(),
  edges: jsonb("edges").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  status: text("status").notNull().default("pending"), // pending | accepted | dismissed
  pattern: jsonb("pattern"), // The detected pattern that generated this suggestion
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_workflow_suggestions_tenant").on(t.tenantId, t.status),
])
```

**Step 2: Add barrel export**

In `src/shared/db/schema.ts`, add:
```typescript
export * from "./schemas/ai.schema"
```

**Step 3: Commit**

```bash
git add src/shared/db/schemas/ai.schema.ts src/shared/db/schema.ts
git commit -m "feat(ai): add AI module database schema (9 tables)"
```

---

## Task 3: AI Module Types

**Files:**
- Create: `src/modules/ai/ai.types.ts`

**Step 1: Write types file**

```typescript
// src/modules/ai/ai.types.ts

// --- Tier 1 Types ---

export type AIFeature =
  | "SMART_NOTIFICATION_COPY"
  | "REVIEW_RESPONSE_DRAFT"
  | "SEARCH_TRANSLATE"
  | "FORM_GENERATION"
  | "WORKFLOW_SUGGESTION"
  | "SMART_DEFAULTS"
  | "ENTITY_TAGGING"
  | "STRUCTURED_EXTRACTION"
  | "AGENT_CHAT" // Phase A

export interface AIPromptTemplate {
  id: string
  tenantId: string
  featureKey: string
  name: string
  systemPrompt: string
  userPrompt: string
  model: string | null
  maxTokens: number | null
  temperature: string | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AIUsageRecord {
  id: string
  tenantId: string
  userId: string | null
  featureKey: string
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface AITenantConfig {
  id: string
  tenantId: string
  isEnabled: boolean
  defaultModel: string
  maxTokensPerRequest: number
  monthlyTokenBudget: number
  guardrails: TenantGuardrails
  verticalProfile: VerticalProfile | null
  toolDescriptionOverrides: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

// --- Guardrails ---

export interface TenantGuardrails {
  toolOverrides: Record<string, "auto" | "confirm" | "escalate">
  maxAutonomousAmount: number
  maxBulkSize: number
  requireApprovalForComms: boolean
  blockedTools: string[]
  maxTokensPerSession: number
  maxToolCallsPerSession: number
  maxSessionsPerUserPerHour: number
  monthlyTokenBudget: number
  escalationUserId: string | null
  approvalTimeoutMinutes: number
}

export const DEFAULT_GUARDRAILS: TenantGuardrails = {
  toolOverrides: {},
  maxAutonomousAmount: 0,
  maxBulkSize: 10,
  requireApprovalForComms: true,
  blockedTools: [],
  maxTokensPerSession: 50000,
  maxToolCallsPerSession: 30,
  maxSessionsPerUserPerHour: 20,
  monthlyTokenBudget: 1000000,
  escalationUserId: null,
  approvalTimeoutMinutes: 30,
}

// --- Vertical Profile ---

export interface VerticalProfile {
  verticalSlug: string
  displayName: string
  terminology: {
    booking: string
    customer: string
    staff: string
    service: string
    deal: string
    invoice: string
    review: string
    workflow: string
  }
  domainContext: string
  complianceRules: string[]
  exampleInteractions: Array<{
    userMessage: string
    agentResponse: string
  }>
  regulatoryBody?: string
}

// --- Conversation ---

export interface AIConversation {
  id: string
  tenantId: string
  userId: string
  title: string | null
  messages: ConversationMessage[]
  status: "active" | "archived"
  pageContext: PageContext | null
  tokenCount: number
  costCents: number
  createdAt: Date
  updatedAt: Date
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant"
  content: string
  toolCalls?: ToolCallRecord[]
  toolResults?: ToolResultRecord[]
  pageContext?: PageContext
  timestamp: string
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

export interface PageContext {
  route: string
  entityType?: string
  entityId?: string
  listFilters?: Record<string, unknown>
  selectedIds?: string[]
}

// --- Agent Action ---

export interface AgentAction {
  id: string
  conversationId: string
  tenantId: string
  userId: string
  toolName: string
  toolInput: Record<string, unknown>
  toolOutput: unknown
  approvalTier: "auto" | "confirm" | "escalate"
  approvalDecision: "approved" | "rejected" | "modified" | "expired" | null
  approvedBy: string | null
  reasoning: string | null
  compensationAvailable: boolean
  compensatedAt: Date | null
  durationMs: number | null
  tokensUsed: number | null
  createdAt: Date
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/ai.types.ts
git commit -m "feat(ai): add AI module domain types"
```

---

## Task 4: Agent Types

**Files:**
- Create: `src/modules/ai/agent/agent.types.ts`

**Step 1: Write agent types**

```typescript
// src/modules/ai/agent/agent.types.ts

import type { ZodType } from "zod"
import type { PageContext, TenantGuardrails, ConversationMessage } from "../ai.types"

// --- Tool System ---

export interface AgentTool {
  name: string
  description: string
  parametersSchema: ZodType
  returnSchema?: ZodType
  handler: (ctx: TenantContext, input: unknown) => Promise<unknown>
  readOnly: boolean
  approvalTier: "auto" | "confirm" | "escalate"
  requiredPermission: string
  reversible: boolean
  compensationHandler?: (ctx: TenantContext, input: unknown) => Promise<void>
  tags: string[]
  costCategory: "free" | "low" | "medium" | "high"
}

export interface TenantContext {
  tenantId: string
  userId: string
}

export interface AgentToolProvider {
  getTools(tenantId: string, userId: string): Promise<AgentTool[]>
}

// --- Agent Session ---

export interface AgentTurnPayload {
  sessionId: string
  tenantId: string
  userId: string
  message: string
  pageContext?: PageContext
}

export interface AgentTurnResult {
  text: string
  actions: AgentActionRecord[]
  tokensUsed: number
  costCents: number
}

export interface AgentActionRecord {
  toolName: string
  input: unknown
  output: unknown
  tier: "auto" | "confirm" | "escalate"
  durationMs: number
  timestamp: Date
}

// --- Context Assembly ---

export interface AssembledContext {
  systemPrompt: string
  conversationHistory: ConversationMessage[]
  guardrails: TenantGuardrails
  tokenBudget: TokenBudget
}

export interface TokenBudget {
  system: number
  userContext: number
  pageContext: number
  conversation: number
  knowledge: number
  tools: number
  response: number
  total: number
}

export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  system: 500,
  userContext: 200,
  pageContext: 1500,
  conversation: 1000,
  knowledge: 2000,
  tools: 2500,
  response: 4000,
  total: 11700,
}

// --- Streaming ---

export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; params: unknown }
  | { type: "tool_result"; toolName: string; result: unknown; entityType?: string; entityId?: string }
  | { type: "approval_request"; actionId: string; toolName: string; params: unknown; reasoning: string; tokenId: string }
  | { type: "text"; content: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; summary: string; actionsCount: number; tokensUsed: number }

// --- Rich Response ---

export type AgentResponseBlock =
  | { type: "text"; content: string }
  | { type: "entity_card"; entityType: string; entityId: string; title: string; subtitle: string; fields: Record<string, string>; link: string }
  | { type: "data_table"; columns: string[]; rows: unknown[][]; caption?: string }
  | { type: "action_button"; label: string; toolName: string; params: unknown; tier: "auto" | "confirm" }
  | { type: "approval_card"; actionId: string; tokenId: string; description: string; impact: string; actions: ("approve" | "edit" | "reject")[] }

// --- Error types ---

export type AgentErrorCode =
  | "MALFORMED_LLM_RESPONSE"
  | "TOOL_TIMEOUT"
  | "APPROVAL_TIMEOUT"
  | "CONTEXT_OVERFLOW"
  | "SESSION_BUDGET_EXHAUSTED"
  | "MONTHLY_BUDGET_EXHAUSTED"
  | "RATE_LIMITED"
  | "PROVIDER_OUTAGE"
  | "INFINITE_LOOP"
```

**Step 2: Commit**

```bash
git add src/modules/ai/agent/agent.types.ts
git commit -m "feat(ai): add agent type definitions"
```

---

## Task 5: Provider Abstraction

**Files:**
- Create: `src/modules/ai/providers/types.ts`
- Create: `src/modules/ai/providers/anthropic.ts`
- Modify: `package.json` (add @anthropic-ai/sdk)

**Step 1: Install Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`

**Step 2: Write provider interface**

```typescript
// src/modules/ai/providers/types.ts

import type { ZodType } from "zod"

export interface AITextMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AIToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown> // JSON Schema
}

export interface AIGenerateTextOptions {
  messages: AITextMessage[]
  model?: string
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
}

export interface AIGenerateTextResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  stopReason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use"
}

export interface AIGenerateWithToolsOptions {
  system: string
  messages: AITextMessage[]
  tools: AIToolDefinition[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIToolCall {
  id: string
  name: string
  input: unknown
}

export interface AIGenerateWithToolsResult {
  text: string | null
  toolCalls: AIToolCall[]
  stopReason: "end_turn" | "tool_use" | "max_tokens"
  inputTokens: number
  outputTokens: number
  model: string
}

export interface AIGenerateStructuredOptions<T = unknown> {
  messages: AITextMessage[]
  schema: ZodType<T>
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIGenerateStructuredResult<T = unknown> {
  data: T
  inputTokens: number
  outputTokens: number
  model: string
}

export interface AIProvider {
  generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult>
  generateWithTools(options: AIGenerateWithToolsOptions): Promise<AIGenerateWithToolsResult>
  generateStructured<T>(options: AIGenerateStructuredOptions<T>): Promise<AIGenerateStructuredResult<T>>
}
```

**Step 3: Write Anthropic provider**

```typescript
// src/modules/ai/providers/anthropic.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import type {
  AIProvider,
  AIGenerateTextOptions,
  AIGenerateTextResult,
  AIGenerateWithToolsOptions,
  AIGenerateWithToolsResult,
  AIGenerateStructuredOptions,
  AIGenerateStructuredResult,
} from "./types"

const log = logger.child({ module: "ai.provider.anthropic" })

const DEFAULT_MODEL = "claude-haiku-4-5-20251001"
const DEFAULT_MAX_TOKENS = 1024

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")
    client = new Anthropic({ apiKey })
    log.info("Anthropic client initialized")
  }
  return client
}

export const anthropicProvider: AIProvider = {
  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    const c = getClient()
    const systemMessage = options.messages.find((m) => m.role === "system")
    const nonSystemMessages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

    const response = await c.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature,
      system: systemMessage?.content,
      messages: nonSystemMessages,
      stop_sequences: options.stopSequences,
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      stopReason: response.stop_reason === "end_turn" ? "end_turn"
        : response.stop_reason === "max_tokens" ? "max_tokens"
        : response.stop_reason === "tool_use" ? "tool_use"
        : "end_turn",
    }
  },

  async generateWithTools(options: AIGenerateWithToolsOptions): Promise<AIGenerateWithToolsResult> {
    const c = getClient()
    const nonSystemMessages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

    const response = await c.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature,
      system: options.system,
      messages: nonSystemMessages,
      tools: options.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
      })),
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") || null

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input }))

    return {
      text,
      toolCalls,
      stopReason: response.stop_reason === "tool_use" ? "tool_use"
        : response.stop_reason === "end_turn" ? "end_turn"
        : "max_tokens",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    }
  },

  async generateStructured<T>(options: AIGenerateStructuredOptions<T>): Promise<AIGenerateStructuredResult<T>> {
    // Use tool_use with a single tool to force structured output
    const c = getClient()
    const systemMessage = options.messages.find((m) => m.role === "system")
    const nonSystemMessages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

    // Convert Zod schema to JSON Schema for the tool definition
    const jsonSchema = zodToJsonSchema(options.schema)

    const response = await c.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature,
      system: systemMessage?.content,
      messages: nonSystemMessages,
      tools: [{
        name: "structured_output",
        description: "Return the structured response",
        input_schema: jsonSchema as Anthropic.Tool["input_schema"],
      }],
      tool_choice: { type: "tool", name: "structured_output" },
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )
    if (!toolUse) throw new Error("No structured output returned from LLM")

    const parsed = options.schema.parse(toolUse.input) as T

    return {
      data: parsed,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    }
  },
}

/**
 * Convert a Zod schema to JSON Schema for Anthropic tool definitions.
 * Minimal implementation — covers object, string, number, boolean, array, enum.
 */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // Use Zod's built-in JSON schema generation if available,
  // otherwise fall back to a manual traversal
  const s = schema as { _def?: { typeName?: string } }
  if (s?._def?.typeName === "ZodObject") {
    return convertZodObject(s as any)
  }
  // Fallback: treat as opaque object
  return { type: "object" }
}

function convertZodObject(schema: any): Record<string, unknown> {
  const shape = schema._def?.shape?.() ?? schema.shape ?? {}
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    properties[key] = convertZodType(value)
    const v = value as { _def?: { typeName?: string } }
    if (v?._def?.typeName !== "ZodOptional") {
      required.push(key)
    }
  }

  return { type: "object", properties, required }
}

function convertZodType(schema: unknown): Record<string, unknown> {
  const s = schema as { _def?: { typeName?: string; values?: string[]; innerType?: unknown; type?: unknown } }
  const typeName = s?._def?.typeName
  switch (typeName) {
    case "ZodString": return { type: "string" }
    case "ZodNumber": return { type: "number" }
    case "ZodBoolean": return { type: "boolean" }
    case "ZodEnum": return { type: "string", enum: s._def?.values }
    case "ZodArray": return { type: "array", items: convertZodType(s._def?.type) }
    case "ZodOptional": return convertZodType(s._def?.innerType)
    case "ZodObject": return convertZodObject(s)
    default: return {}
  }
}
```

**Step 4: Commit**

```bash
git add package.json package-lock.json src/modules/ai/providers/
git commit -m "feat(ai): add AI provider abstraction with Anthropic implementation"
```

---

## Task 6: AI Zod Schemas

**Files:**
- Create: `src/modules/ai/ai.schemas.ts`

**Step 1: Write Zod schemas for tRPC input validation**

```typescript
// src/modules/ai/ai.schemas.ts

import { z } from "zod"

// --- Chat Schemas ---

export const pageContextSchema = z.object({
  route: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  listFilters: z.record(z.string(), z.unknown()).optional(),
  selectedIds: z.array(z.string()).optional(),
})

export const chatSendSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(10000),
  pageContext: pageContextSchema.optional(),
})

export const chatHistorySchema = z.object({
  sessionId: z.string(),
})

export const chatSessionsSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export const chatExplainSchema = z.object({
  conversationId: z.string(),
})

// --- Approval Schemas ---

export const approvalDecisionSchema = z.object({
  tokenId: z.string(),
  decision: z.enum(["approve", "reject"]),
  modifiedParams: z.record(z.string(), z.unknown()).optional(),
})

// --- Prompt Template Schemas ---

export const listPromptTemplatesSchema = z.object({
  featureKey: z.string().optional(),
})

export const upsertPromptTemplateSchema = z.object({
  id: z.string().optional(),
  featureKey: z.string(),
  name: z.string().min(1).max(200),
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  model: z.string().optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
  temperature: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export const deletePromptTemplateSchema = z.object({
  id: z.string(),
})

// --- Usage Schemas ---

export const getUsageSummarySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  featureKey: z.string().optional(),
})

// --- AI Config Schemas ---

export const updateAIConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  defaultModel: z.string().optional(),
  maxTokensPerRequest: z.number().min(1).max(100000).optional(),
  monthlyTokenBudget: z.number().min(0).optional(),
  guardrails: z.record(z.string(), z.unknown()).optional(),
})
```

**Step 2: Commit**

```bash
git add src/modules/ai/ai.schemas.ts
git commit -m "feat(ai): add Zod schemas for AI module tRPC validation"
```

---

## Task 7: AgentToolProvider Interface + Tool Registry

**Files:**
- Create: `src/shared/module-system/tool-provider.ts`
- Create: `src/shared/module-system/tool-registry.ts`
- Modify: `src/shared/module-system/types.ts` (add ModuleToolDefinition)

**Step 1: Add ModuleToolDefinition to types.ts**

Add at the end of `src/shared/module-system/types.ts`, before the closing `}` of `ModuleManifest`:

```typescript
// In ModuleManifest interface, add:
  toolDefinitions?: ModuleToolDefinition[]
```

And add the interface before `ModuleManifest`:

```typescript
export interface ModuleToolDefinition {
  name: string
  description: string
  parametersSchema: string    // '{module}.schemas.{exportName}'
  handler: string             // '{module}.service.{methodName}'
  readOnly: boolean
  requiredPermission: string
  tags?: string[]
  approvalTier?: 'auto' | 'confirm' | 'escalate'
  reversible?: boolean
  costCategory?: 'free' | 'low' | 'medium' | 'high'
}
```

**Step 2: Create tool-provider.ts**

```typescript
// src/shared/module-system/tool-provider.ts

import type { ZodType } from "zod"

export interface AgentTool {
  name: string
  description: string
  parametersSchema: ZodType
  returnSchema?: ZodType
  handler: (ctx: AgentToolContext, input: unknown) => Promise<unknown>
  readOnly: boolean
  approvalTier: "auto" | "confirm" | "escalate"
  requiredPermission: string
  reversible: boolean
  compensationHandler?: (ctx: AgentToolContext, input: unknown) => Promise<void>
  tags: string[]
  costCategory: "free" | "low" | "medium" | "high"
}

export interface AgentToolContext {
  tenantId: string
  userId: string
}

export interface AgentToolProvider {
  getTools(tenantId: string, userId: string): Promise<AgentTool[]>
}
```

**Step 3: Create tool-registry.ts**

```typescript
// src/shared/module-system/tool-registry.ts

import { logger } from "@/shared/logger"
import type { ModuleRegistry } from "./registry"
import type { AgentTool, AgentToolContext, AgentToolProvider } from "./tool-provider"
import type { ModuleToolDefinition } from "./types"

const log = logger.child({ module: "tool-registry" })

// Lazy-loaded schema + handler cache
const resolvedTools = new Map<string, { schema: any; handler: Function }>()

/**
 * Resolves a module tool definition into an executable AgentTool.
 * Schema reference: '{module}.schemas.{exportName}' → lazy import
 * Handler reference: '{module}.service.{methodName}' → lazy import
 */
async function resolveToolDefinition(
  def: ModuleToolDefinition,
): Promise<AgentTool | null> {
  const cacheKey = `${def.name}`
  let resolved = resolvedTools.get(cacheKey)

  if (!resolved) {
    try {
      // Parse schema reference: 'booking.schemas.listBookingsSchema'
      const [schemaModule, , schemaExport] = def.parametersSchema.split(".")
      const schemaImport = await import(`@/modules/${schemaModule}/${schemaModule}.schemas`)
      const schema = schemaImport[schemaExport]
      if (!schema) {
        log.warn({ tool: def.name, ref: def.parametersSchema }, "Schema not found")
        return null
      }

      // Parse handler reference: 'booking.service.listBookings'
      const [handlerModule, , handlerMethod] = def.handler.split(".")
      const handlerImport = await import(`@/modules/${handlerModule}/${handlerModule}.service`)
      const service = handlerImport[`${handlerModule}Service`]
      const handler = service?.[handlerMethod]
      if (!handler) {
        log.warn({ tool: def.name, ref: def.handler }, "Handler not found")
        return null
      }

      resolved = { schema, handler }
      resolvedTools.set(cacheKey, resolved)
    } catch (err) {
      log.error({ tool: def.name, err }, "Failed to resolve tool definition")
      return null
    }
  }

  return {
    name: def.name,
    description: def.description,
    parametersSchema: resolved.schema,
    handler: async (ctx: AgentToolContext, input: unknown) => {
      return resolved!.handler.call(null, ctx, input)
    },
    readOnly: def.readOnly,
    approvalTier: def.approvalTier ?? (def.readOnly ? "auto" : "confirm"),
    requiredPermission: def.requiredPermission,
    reversible: def.reversible ?? false,
    tags: def.tags ?? [],
    costCategory: def.costCategory ?? "free",
  }
}

/**
 * ModuleToolRegistry implements AgentToolProvider by scanning manifests.
 */
export class ModuleToolRegistry implements AgentToolProvider {
  constructor(
    private moduleRegistry: ModuleRegistry,
    private isModuleEnabled: (tenantId: string, slug: string) => Promise<boolean>,
    private hasPermission: (userId: string, permission: string) => Promise<boolean>,
  ) {}

  async getTools(tenantId: string, userId: string): Promise<AgentTool[]> {
    const manifests = this.moduleRegistry.getAllManifests()
    const tools: AgentTool[] = []

    for (const manifest of manifests) {
      if (!manifest.toolDefinitions?.length) continue

      // Check module is enabled for tenant
      if (!manifest.isCore) {
        const enabled = await this.isModuleEnabled(tenantId, manifest.slug)
        if (!enabled) continue
      }

      for (const def of manifest.toolDefinitions) {
        // Check user permission
        const permitted = await this.hasPermission(userId, def.requiredPermission)
        if (!permitted) continue

        const tool = await resolveToolDefinition(def)
        if (tool) tools.push(tool)
      }
    }

    return tools
  }
}
```

**Step 4: Commit**

```bash
git add src/shared/module-system/types.ts src/shared/module-system/tool-provider.ts src/shared/module-system/tool-registry.ts
git commit -m "feat(ai): add AgentToolProvider interface and ModuleToolRegistry"
```

---

## Task 8: AI Repository

**Files:**
- Create: `src/modules/ai/ai.repository.ts`

**Step 1: Write repository**

```typescript
// src/modules/ai/ai.repository.ts

import { db } from "@/shared/db"
import { eq, and, desc, gte, lte, sql } from "drizzle-orm"
import {
  promptTemplates,
  aiUsageRecords,
  aiTenantConfig,
  aiConversations,
  agentActions,
  aiCorrections,
} from "@/shared/db/schema"
import { NotFoundError } from "@/shared/errors"
import { logger } from "@/shared/logger"
import type {
  AIPromptTemplate,
  AIUsageRecord,
  AITenantConfig,
  AIConversation,
  AgentAction,
  ConversationMessage,
} from "./ai.types"

const log = logger.child({ module: "ai.repository" })

export const aiRepository = {
  // --- Prompt Templates ---

  async listPromptTemplates(
    tenantId: string,
    featureKey?: string,
  ): Promise<AIPromptTemplate[]> {
    const conditions = [eq(promptTemplates.tenantId, tenantId)]
    if (featureKey) conditions.push(eq(promptTemplates.featureKey, featureKey))

    return db
      .select()
      .from(promptTemplates)
      .where(and(...conditions))
      .orderBy(desc(promptTemplates.createdAt))
  },

  async getPromptTemplate(
    tenantId: string,
    featureKey: string,
  ): Promise<AIPromptTemplate | null> {
    const rows = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.tenantId, tenantId),
          eq(promptTemplates.featureKey, featureKey),
          eq(promptTemplates.isDefault, true),
        ),
      )
      .limit(1)

    return rows[0] ?? null
  },

  async upsertPromptTemplate(
    tenantId: string,
    data: Omit<AIPromptTemplate, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<AIPromptTemplate> {
    const [row] = await db
      .insert(promptTemplates)
      .values({ ...data, tenantId })
      .onConflictDoUpdate({
        target: [promptTemplates.id],
        set: { ...data, updatedAt: new Date() },
      })
      .returning()
    return row!
  },

  async deletePromptTemplate(tenantId: string, id: string): Promise<void> {
    const result = await db
      .delete(promptTemplates)
      .where(and(eq(promptTemplates.id, id), eq(promptTemplates.tenantId, tenantId)))
    if (!result.rowCount) throw new NotFoundError("Prompt template not found")
  },

  // --- Usage Tracking ---

  async recordUsage(data: Omit<AIUsageRecord, "id" | "createdAt">): Promise<void> {
    await db.insert(aiUsageRecords).values(data)
  },

  async getUsageSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    featureKey?: string,
  ) {
    const conditions = [
      eq(aiUsageRecords.tenantId, tenantId),
      gte(aiUsageRecords.createdAt, startDate),
      lte(aiUsageRecords.createdAt, endDate),
    ]
    if (featureKey) conditions.push(eq(aiUsageRecords.featureKey, featureKey))

    const rows = await db
      .select({
        featureKey: aiUsageRecords.featureKey,
        totalInputTokens: sql<number>`sum(${aiUsageRecords.inputTokens})`,
        totalOutputTokens: sql<number>`sum(${aiUsageRecords.outputTokens})`,
        totalCostCents: sql<number>`sum(${aiUsageRecords.costCents})`,
        callCount: sql<number>`count(*)`,
      })
      .from(aiUsageRecords)
      .where(and(...conditions))
      .groupBy(aiUsageRecords.featureKey)

    return rows
  },

  async getMonthlyUsage(tenantId: string): Promise<number> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [row] = await db
      .select({
        totalTokens: sql<number>`coalesce(sum(${aiUsageRecords.inputTokens} + ${aiUsageRecords.outputTokens}), 0)`,
      })
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.tenantId, tenantId),
          gte(aiUsageRecords.createdAt, startOfMonth),
        ),
      )

    return row?.totalTokens ?? 0
  },

  // --- Tenant Config ---

  async getTenantConfig(tenantId: string): Promise<AITenantConfig | null> {
    const rows = await db
      .select()
      .from(aiTenantConfig)
      .where(eq(aiTenantConfig.tenantId, tenantId))
      .limit(1)

    return rows[0] as AITenantConfig | null
  },

  async upsertTenantConfig(
    tenantId: string,
    data: Partial<Omit<AITenantConfig, "id" | "tenantId" | "createdAt" | "updatedAt">>,
  ): Promise<AITenantConfig> {
    const [row] = await db
      .insert(aiTenantConfig)
      .values({ tenantId, ...data })
      .onConflictDoUpdate({
        target: [aiTenantConfig.tenantId],
        set: { ...data, updatedAt: new Date() },
      })
      .returning()
    return row as AITenantConfig
  },

  // --- Conversations ---

  async createConversation(
    tenantId: string,
    userId: string,
  ): Promise<AIConversation> {
    const [row] = await db
      .insert(aiConversations)
      .values({ tenantId, userId, messages: [] })
      .returning()
    return row as AIConversation
  },

  async getConversation(
    id: string,
    tenantId: string,
  ): Promise<AIConversation> {
    const rows = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.tenantId, tenantId)))
      .limit(1)

    const row = rows[0]
    if (!row) throw new NotFoundError("Conversation not found")
    return row as AIConversation
  },

  async appendMessage(
    id: string,
    message: ConversationMessage,
  ): Promise<void> {
    await db
      .update(aiConversations)
      .set({
        messages: sql`${aiConversations.messages} || ${JSON.stringify([message])}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, id))
  },

  async updateConversation(
    id: string,
    data: Partial<Pick<AIConversation, "title" | "status" | "tokenCount" | "costCents" | "pageContext">>,
  ): Promise<void> {
    await db
      .update(aiConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiConversations.id, id))
  },

  async listConversations(
    tenantId: string,
    userId: string,
    limit: number,
    cursor?: string,
  ) {
    const conditions = [
      eq(aiConversations.tenantId, tenantId),
      eq(aiConversations.userId, userId),
    ]
    if (cursor) {
      conditions.push(lte(aiConversations.createdAt, new Date(cursor)))
    }

    const rows = await db
      .select({
        id: aiConversations.id,
        title: aiConversations.title,
        status: aiConversations.status,
        tokenCount: aiConversations.tokenCount,
        createdAt: aiConversations.createdAt,
        updatedAt: aiConversations.updatedAt,
      })
      .from(aiConversations)
      .where(and(...conditions))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: rows.slice(0, limit),
      hasMore,
      nextCursor: hasMore ? rows[limit - 1]!.createdAt.toISOString() : undefined,
    }
  },

  // --- Agent Actions ---

  async recordAction(data: Omit<AgentAction, "id" | "createdAt">): Promise<AgentAction> {
    const [row] = await db
      .insert(agentActions)
      .values(data)
      .returning()
    return row as AgentAction
  },

  async getActions(conversationId: string): Promise<AgentAction[]> {
    return db
      .select()
      .from(agentActions)
      .where(eq(agentActions.conversationId, conversationId))
      .orderBy(agentActions.createdAt) as Promise<AgentAction[]>
  },

  // --- Corrections ---

  async createCorrection(data: {
    tenantId: string
    userId: string
    conversationId?: string
    toolName: string
    attemptedParameters: Record<string, unknown>
    correctionReason: string
  }): Promise<void> {
    await db.insert(aiCorrections).values(data)
  },

  async getRecentCorrections(
    tenantId: string,
    limit: number = 10,
  ): Promise<Array<{ toolName: string; correctionReason: string }>> {
    return db
      .select({
        toolName: aiCorrections.toolName,
        correctionReason: aiCorrections.correctionReason,
      })
      .from(aiCorrections)
      .where(eq(aiCorrections.tenantId, tenantId))
      .orderBy(desc(aiCorrections.createdAt))
      .limit(limit)
  },
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/ai.repository.ts
git commit -m "feat(ai): add AI repository (templates, usage, conversations, actions)"
```

---

## Task 9: Module Tool Declarations (Read-Only)

**Files:**
- Modify: `src/modules/booking/booking.manifest.ts`
- Modify: `src/modules/customer/customer.manifest.ts`
- Modify: `src/modules/team/team.manifest.ts`
- Modify: `src/modules/workflow/workflow.manifest.ts`
- Modify: `src/modules/analytics/analytics.manifest.ts`
- Modify: `src/modules/notification/notification.manifest.ts`
- (Repeat for remaining modules with read operations)

**Step 1: Add read-only toolDefinitions to booking manifest**

Add to the `bookingManifest` in `src/modules/booking/booking.manifest.ts`:

```typescript
  toolDefinitions: [
    {
      name: 'booking.list',
      description: 'List bookings with filters (status, date range, customer, staff)',
      parametersSchema: 'booking.schemas.listBookingsSchema',
      handler: 'booking.service.listBookings',
      readOnly: true,
      requiredPermission: 'bookings:read',
      tags: ['read', 'scheduling'],
    },
    {
      name: 'booking.getById',
      description: 'Get full details of a specific booking by ID',
      parametersSchema: 'booking.schemas.getBookingSchema',
      handler: 'booking.service.getBooking',
      readOnly: true,
      requiredPermission: 'bookings:read',
      tags: ['read', 'scheduling'],
    },
  ],
```

**Step 2: Repeat for each module**

Add similar `toolDefinitions` arrays to each manifest. For Phase A, include ONLY read operations. Each tool needs:
- A `name` following `{module}.{action}` convention
- A `description` written for the LLM (plain English, what it does and what filters exist)
- A `parametersSchema` reference to an existing Zod schema in the module's `.schemas.ts`
- A `handler` reference to an existing service method
- `readOnly: true` for all Phase A tools
- A `requiredPermission` matching existing RBAC permissions
- Relevant `tags` for two-phase tool selection categories

Key modules to instrument (priority order):
1. **booking** — list, getById, search
2. **customer** — list, getById, search
3. **team** — list, getById
4. **scheduling** — getAvailability, getSlots
5. **analytics** — getMetrics, getKPIs
6. **workflow** — list, getById
7. **notification** — list (sent notifications)
8. **payment** — list invoices, getInvoice
9. **forms** — list, getById
10. **review** — list, getById
11. **tenant** — getSettings
12. **audit** — search audit logs

Note: Some modules may need new schemas and service methods for agent-friendly list endpoints. Create these as needed — they should be thin wrappers around existing queries.

**Step 3: Commit per module batch**

```bash
git add src/modules/*/\*.manifest.ts
git commit -m "feat(ai): add read-only tool definitions to module manifests"
```

---

## Task 10: Agent Context Assembly

**Files:**
- Create: `src/modules/ai/agent/agent.context.ts`

**Step 1: Write context assembly**

```typescript
// src/modules/ai/agent/agent.context.ts

import { logger } from "@/shared/logger"
import { aiRepository } from "../ai.repository"
import type { AITenantConfig, ConversationMessage, PageContext, DEFAULT_GUARDRAILS } from "../ai.types"
import type { AssembledContext, TokenBudget, DEFAULT_TOKEN_BUDGET } from "./agent.types"

const log = logger.child({ module: "agent.context" })

/**
 * Assemble the full context window for an agent turn.
 * Each layer is token-budgeted to prevent overflow.
 */
export async function assembleContext(
  tenantId: string,
  userId: string,
  sessionId: string,
  pageContext?: PageContext,
): Promise<AssembledContext> {
  const config = await aiRepository.getTenantConfig(tenantId)
  const conversation = await aiRepository.getConversation(sessionId, tenantId)
  const corrections = await aiRepository.getRecentCorrections(tenantId, 10)

  const systemPrompt = buildSystemPrompt(config, corrections, pageContext)
  const conversationHistory = trimConversationHistory(
    conversation.messages,
    DEFAULT_TOKEN_BUDGET.conversation,
  )

  const guardrails = config?.guardrails
    ? { ...DEFAULT_GUARDRAILS, ...config.guardrails }
    : DEFAULT_GUARDRAILS

  return {
    systemPrompt,
    conversationHistory,
    guardrails,
    tokenBudget: DEFAULT_TOKEN_BUDGET,
  }
}

function buildSystemPrompt(
  config: AITenantConfig | null,
  corrections: Array<{ toolName: string; correctionReason: string }>,
  pageContext?: PageContext,
): string {
  const parts: string[] = []

  // Base agent identity
  parts.push(
    "You are an AI assistant for Ironheart, a business management platform. " +
    "You help users manage their operations by reading data and answering questions. " +
    "Be concise, helpful, and accurate. Always prefer showing real data over speculation."
  )

  // Vertical profile
  const profile = config?.verticalProfile
  if (profile && typeof profile === "object" && "displayName" in profile) {
    const vp = profile as { displayName: string; domainContext?: string; terminology?: Record<string, string>; complianceRules?: string[] }
    parts.push(`\nThis business is a ${vp.displayName}.`)
    if (vp.domainContext) parts.push(`\nDomain context:\n${vp.domainContext}`)
    if (vp.terminology) {
      const terms = Object.entries(vp.terminology)
        .map(([generic, specific]) => `- "${generic}" → "${specific}"`)
        .join("\n")
      parts.push(`\nTerminology (use these terms):\n${terms}`)
    }
    if (vp.complianceRules?.length) {
      parts.push(`\nCompliance rules:\n${vp.complianceRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`)
    }
  }

  // Page context
  if (pageContext) {
    parts.push(
      `\nThe user is currently viewing: ${pageContext.entityType ?? "page"} ` +
      `${pageContext.entityId ? `(ID: ${pageContext.entityId})` : ""} ` +
      `at ${pageContext.route}. When they say "this", "it", or "these", they refer to what's on their current page.`
    )
  }

  // Corrections
  if (corrections.length > 0) {
    parts.push(
      `\nPrevious corrections from this organization (avoid repeating these mistakes):\n` +
      corrections.map((c, i) => `${i + 1}. [${c.toolName}] "${c.correctionReason}"`).join("\n")
    )
  }

  return parts.join("\n")
}

/**
 * Trim conversation history to fit within token budget.
 * Keep the most recent messages, summarize older ones.
 * Simple heuristic: ~4 chars per token.
 */
function trimConversationHistory(
  messages: ConversationMessage[],
  maxTokens: number,
): ConversationMessage[] {
  const estimateTokens = (msg: ConversationMessage) =>
    Math.ceil(msg.content.length / 4)

  let totalTokens = 0
  const kept: ConversationMessage[] = []

  // Walk backwards, keep recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(messages[i]!)
    if (totalTokens + tokens > maxTokens) break
    kept.unshift(messages[i]!)
    totalTokens += tokens
  }

  return kept
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/agent/agent.context.ts
git commit -m "feat(ai): add agent context assembly with token budgeting"
```

---

## Task 11: Agent Planner (Two-Phase Tool Selection)

**Files:**
- Create: `src/modules/ai/agent/agent.planner.ts`

**Step 1: Write planner**

```typescript
// src/modules/ai/agent/agent.planner.ts

import { logger } from "@/shared/logger"
import type { AIProvider } from "../providers/types"
import type { AgentTool } from "./agent.types"

const log = logger.child({ module: "agent.planner" })

/**
 * Two-phase tool selection.
 * Phase 1: Cheap model classifies intent → selects relevant tool categories.
 * Phase 2: Returns only the matching tools with full schemas.
 */
export async function selectRelevantTools(
  message: string,
  allTools: AgentTool[],
  provider: AIProvider,
): Promise<AgentTool[]> {
  // If few tools, skip the classification step
  if (allTools.length <= 15) {
    log.info({ toolCount: allTools.length }, "Skipping two-phase selection (few tools)")
    return allTools
  }

  // Phase 1: Build compressed catalog (name + description only)
  const catalog = allTools
    .map((t) => `${t.name}: ${t.description}`)
    .join("\n")

  try {
    const result = await provider.generateStructured({
      messages: [
        {
          role: "user",
          content:
            `Select the tool names most relevant to this user message: "${message}"\n\n` +
            `Available tools:\n${catalog}\n\n` +
            `Select 5-15 tools. Include tools the user might need for follow-up actions.`,
        },
      ],
      schema: toolSelectionSchema(),
      model: "claude-haiku-4-5-20251001",
      maxTokens: 256,
      temperature: 0,
    })

    const selectedNames = new Set(result.data.tools)
    const selected = allTools.filter((t) => selectedNames.has(t.name))

    log.info(
      { total: allTools.length, selected: selected.length },
      "Two-phase tool selection complete",
    )

    // Always include at least the selected tools, but if selection is empty, return all
    return selected.length > 0 ? selected : allTools
  } catch (err) {
    log.warn({ err }, "Two-phase tool selection failed, using all tools")
    return allTools
  }
}

function toolSelectionSchema() {
  // Inline Zod to avoid circular dependency issues
  const { z } = require("zod")
  return z.object({
    tools: z.array(z.string()),
  })
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/agent/agent.planner.ts
git commit -m "feat(ai): add two-phase tool selection planner"
```

---

## Task 12: Agent Executor

**Files:**
- Create: `src/modules/ai/agent/agent.executor.ts`

**Step 1: Write executor**

```typescript
// src/modules/ai/agent/agent.executor.ts

import { logger } from "@/shared/logger"
import type { AgentTool, AgentActionRecord, TenantContext } from "./agent.types"

const log = logger.child({ module: "agent.executor" })

const TOOL_TIMEOUT_MS = 30_000

/**
 * Execute a tool call with Zod validation and timeout.
 */
export async function executeTool(
  tool: AgentTool,
  input: unknown,
  ctx: TenantContext,
): Promise<{ result: unknown; action: AgentActionRecord }> {
  const startTime = Date.now()

  // Validate input
  const validated = tool.parametersSchema.parse(input)

  // Execute with timeout
  const result = await Promise.race([
    tool.handler(ctx, validated),
    new Promise((_, reject) =>
      setTimeout(() => reject(new ToolTimeoutError(tool.name)), TOOL_TIMEOUT_MS)
    ),
  ])

  const durationMs = Date.now() - startTime
  log.info({ tool: tool.name, durationMs }, "Tool executed")

  return {
    result,
    action: {
      toolName: tool.name,
      input: validated,
      output: result,
      tier: tool.approvalTier,
      durationMs,
      timestamp: new Date(),
    },
  }
}

export class ToolTimeoutError extends Error {
  constructor(toolName: string) {
    super(`Tool "${toolName}" timed out after ${TOOL_TIMEOUT_MS}ms`)
    this.name = "ToolTimeoutError"
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/agent/agent.executor.ts
git commit -m "feat(ai): add agent tool executor with validation and timeout"
```

---

## Task 13: Agent Error Handling

**Files:**
- Create: `src/modules/ai/agent/agent.errors.ts`

**Step 1: Write error handling**

```typescript
// src/modules/ai/agent/agent.errors.ts

import { logger } from "@/shared/logger"
import type { AgentErrorCode } from "./agent.types"

const log = logger.child({ module: "agent.errors" })

export class AgentError extends Error {
  constructor(
    public code: AgentErrorCode,
    message: string,
    public recoverable: boolean = true,
    public userMessage?: string,
  ) {
    super(message)
    this.name = "AgentError"
  }
}

/** Track consecutive malformed responses per session */
const malformedCounts = new Map<string, number>()

export function trackMalformedResponse(sessionId: string): boolean {
  const count = (malformedCounts.get(sessionId) ?? 0) + 1
  malformedCounts.set(sessionId, count)
  if (count >= 3) {
    malformedCounts.delete(sessionId)
    return false // should halt
  }
  return true // can continue
}

export function clearMalformedCount(sessionId: string): void {
  malformedCounts.delete(sessionId)
}

/** Track repeated tool calls for infinite loop detection */
const toolCallHistory = new Map<string, Map<string, number>>()

export function detectInfiniteLoop(
  sessionId: string,
  toolName: string,
  input: unknown,
): boolean {
  const key = `${toolName}:${JSON.stringify(input)}`
  let history = toolCallHistory.get(sessionId)
  if (!history) {
    history = new Map()
    toolCallHistory.set(sessionId, history)
  }
  const count = (history.get(key) ?? 0) + 1
  history.set(key, count)
  return count >= 3 // true = infinite loop detected
}

export function clearLoopHistory(sessionId: string): void {
  toolCallHistory.delete(sessionId)
}

/** Track timed-out tools per session */
const timedOutTools = new Map<string, Set<string>>()

export function trackToolTimeout(sessionId: string, toolName: string): boolean {
  let tools = timedOutTools.get(sessionId)
  if (!tools) {
    tools = new Set()
    timedOutTools.set(sessionId, tools)
  }
  tools.add(toolName)
  return tools.size >= 2 // true = should exclude tool for rest of session
}

export function isToolExcluded(sessionId: string, toolName: string): boolean {
  return timedOutTools.get(sessionId)?.has(toolName) ?? false
}

export function clearSessionErrors(sessionId: string): void {
  malformedCounts.delete(sessionId)
  toolCallHistory.delete(sessionId)
  timedOutTools.delete(sessionId)
}

/**
 * Map internal errors to user-friendly messages.
 */
export function getUserMessage(code: AgentErrorCode): string {
  switch (code) {
    case "MALFORMED_LLM_RESPONSE":
      return "I'm having trouble processing that. Could you rephrase?"
    case "TOOL_TIMEOUT":
      return "That service is taking longer than expected. Let me try another way."
    case "APPROVAL_TIMEOUT":
      return "The approval request expired. You can ask me again or do it manually."
    case "CONTEXT_OVERFLOW":
      return "This conversation is getting complex. Let me summarize and continue."
    case "SESSION_BUDGET_EXHAUSTED":
      return "I've reached the processing limit for this conversation. Start a new one to continue."
    case "MONTHLY_BUDGET_EXHAUSTED":
      return "AI assistant usage has reached this month's limit. Contact your administrator."
    case "RATE_LIMITED":
      return "You've been very active! Please wait a few minutes before starting a new conversation."
    case "PROVIDER_OUTAGE":
      return "The AI service is temporarily unavailable. Please try again in a few minutes."
    case "INFINITE_LOOP":
      return "I seem to be going in circles. Let me step back and give you what I have so far."
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/agent/agent.errors.ts
git commit -m "feat(ai): add agent error handling for 9 failure modes"
```

---

## Task 14: Agent Streaming

**Files:**
- Create: `src/modules/ai/agent/agent.streaming.ts`

**Step 1: Write streaming bridge**

```typescript
// src/modules/ai/agent/agent.streaming.ts

import { logger } from "@/shared/logger"
import type { AgentStreamEvent } from "./agent.types"

const log = logger.child({ module: "agent.streaming" })

/**
 * Streaming bridge between the agent runtime and Trigger.dev Realtime.
 *
 * The agent runtime calls these functions during execution.
 * They update the Trigger.dev run's metadata, which the frontend
 * reads via useRealtimeRun().
 *
 * The `updateMetadata` function is injected by the Trigger.dev task context.
 */
export type MetadataUpdater = (
  key: string,
  value: unknown,
) => void

let eventSequence = 0

export function createStreamEmitter(updateMetadata: MetadataUpdater) {
  eventSequence = 0

  return {
    emit(event: AgentStreamEvent): void {
      eventSequence++
      // Store events as indexed metadata for ordered retrieval
      updateMetadata(`event_${eventSequence}`, event)
      updateMetadata("lastEventIndex", eventSequence)
      updateMetadata("lastEventType", event.type)

      if (event.type === "status") {
        updateMetadata("currentStatus", event.message)
      }
    },

    emitStatus(message: string): void {
      this.emit({ type: "status", message })
    },

    emitToolCall(toolName: string, params: unknown): void {
      this.emit({ type: "tool_call", toolName, params })
    },

    emitToolResult(toolName: string, result: unknown, entityType?: string, entityId?: string): void {
      this.emit({ type: "tool_result", toolName, result, entityType, entityId })
    },

    emitText(content: string): void {
      this.emit({ type: "text", content })
    },

    emitError(message: string, recoverable: boolean): void {
      this.emit({ type: "error", message, recoverable })
    },

    emitDone(summary: string, actionsCount: number, tokensUsed: number): void {
      this.emit({ type: "done", summary, actionsCount, tokensUsed })
    },
  }
}

export type StreamEmitter = ReturnType<typeof createStreamEmitter>
```

**Step 2: Commit**

```bash
git add src/modules/ai/agent/agent.streaming.ts
git commit -m "feat(ai): add Trigger.dev Realtime streaming bridge"
```

---

## Task 15: Agent Runtime (ReAct Loop)

**Files:**
- Create: `src/modules/ai/agent/agent.runtime.ts`

**Step 1: Write the core ReAct loop**

```typescript
// src/modules/ai/agent/agent.runtime.ts

import { task } from "@trigger.dev/sdk/v3"
import { logger } from "@/shared/logger"
import { assembleContext } from "./agent.context"
import { selectRelevantTools } from "./agent.planner"
import { executeTool, ToolTimeoutError } from "./agent.executor"
import { createStreamEmitter } from "./agent.streaming"
import {
  trackMalformedResponse,
  clearMalformedCount,
  detectInfiniteLoop,
  clearSessionErrors,
  clearLoopHistory,
  getUserMessage,
  AgentError,
} from "./agent.errors"
import { aiRepository } from "../ai.repository"
import { anthropicProvider } from "../providers/anthropic"
import type { AgentTurnPayload, AgentTurnResult, AgentActionRecord, AgentTool } from "./agent.types"
import type { AIToolDefinition } from "../providers/types"

const log = logger.child({ module: "agent.runtime" })

const MAX_ITERATIONS = 15

/**
 * Convert an AgentTool to an Anthropic tool definition (JSON Schema).
 */
function toAnthropicTool(tool: AgentTool): AIToolDefinition {
  // Convert Zod schema to JSON Schema
  // The zodToJsonSchema is in the anthropic provider but we need a simple version here
  const schema = tool.parametersSchema
  const s = schema as any
  let inputSchema: Record<string, unknown> = { type: "object" }

  // Attempt to extract shape from Zod object schema
  if (s?._def?.typeName === "ZodObject") {
    const shape = s._def?.shape?.() ?? s.shape ?? {}
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [key, value] of Object.entries(shape)) {
      const v = value as any
      const typeName = v?._def?.typeName
      if (typeName === "ZodString") properties[key] = { type: "string" }
      else if (typeName === "ZodNumber") properties[key] = { type: "number" }
      else if (typeName === "ZodBoolean") properties[key] = { type: "boolean" }
      else properties[key] = {}
      if (typeName !== "ZodOptional") required.push(key)
    }
    inputSchema = { type: "object", properties, required }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema,
  }
}

function toolResultMessage(toolCallId: string, result: unknown): { role: "user"; content: string } {
  return {
    role: "user",
    content: JSON.stringify({
      type: "tool_result",
      tool_use_id: toolCallId,
      content: typeof result === "string" ? result : JSON.stringify(result),
    }),
  }
}

export const agentReasoningLoop = task({
  id: "agent-reasoning-loop",
  retry: { maxAttempts: 1 },
  run: async (payload: AgentTurnPayload, { ctx }) => {
    const { sessionId, tenantId, userId, message, pageContext } = payload

    log.info({ sessionId, tenantId }, "Starting agent reasoning loop")

    // Metadata updater — in Trigger.dev, use ctx to update run metadata
    // For now, use a simple in-memory approach; Realtime integration is wired in Task 18
    const events: unknown[] = []
    const emitter = createStreamEmitter((key, value) => {
      events.push({ key, value })
    })

    try {
      emitter.emitStatus("Preparing context...")

      // 1. Assemble context
      const context = await assembleContext(tenantId, userId, sessionId, pageContext)

      // 2. Get all available tools (from tool registry — injected at runtime)
      // For Phase A, we import the tool registry directly
      const { getToolRegistryInstance } = await import("./agent.bootstrap")
      const toolRegistry = getToolRegistryInstance()
      const allTools = await toolRegistry.getTools(tenantId, userId)

      // 3. Two-phase tool selection
      emitter.emitStatus("Selecting relevant tools...")
      const relevantTools = await selectRelevantTools(message, allTools, anthropicProvider)

      // 4. ReAct loop
      const messages = [
        ...context.conversationHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ]

      let iterations = 0
      const actionLog: AgentActionRecord[] = []
      let totalInputTokens = 0
      let totalOutputTokens = 0

      while (iterations < MAX_ITERATIONS) {
        emitter.emitStatus(iterations === 0 ? "Thinking..." : "Continuing to think...")

        // Reason
        const response = await anthropicProvider.generateWithTools({
          system: context.systemPrompt,
          messages: messages.filter((m) => m.role !== "system"),
          tools: relevantTools.map(toAnthropicTool),
          model: "claude-sonnet-4-20250514",
          maxTokens: 4096,
        })

        totalInputTokens += response.inputTokens
        totalOutputTokens += response.outputTokens

        // If text response — done
        if (response.stopReason === "end_turn" || response.toolCalls.length === 0) {
          const text = response.text ?? "I couldn't generate a response."
          clearSessionErrors(sessionId)

          // Persist messages
          await aiRepository.appendMessage(sessionId, {
            role: "assistant",
            content: text,
            timestamp: new Date().toISOString(),
          })

          // Update usage
          await aiRepository.updateConversation(sessionId, {
            tokenCount: totalInputTokens + totalOutputTokens,
          })

          // Record usage
          await aiRepository.recordUsage({
            tenantId,
            userId,
            featureKey: "AGENT_CHAT",
            model: response.model,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costCents: estimateCost(totalInputTokens, totalOutputTokens, response.model),
            metadata: { sessionId, iterations, toolCallCount: actionLog.length },
          })

          emitter.emitText(text)
          emitter.emitDone(text.slice(0, 100), actionLog.length, totalInputTokens + totalOutputTokens)

          return {
            text,
            actions: actionLog,
            tokensUsed: totalInputTokens + totalOutputTokens,
            costCents: estimateCost(totalInputTokens, totalOutputTokens, response.model),
          } satisfies AgentTurnResult
        }

        // Execute tool calls (Phase A: all read-only, all AUTO tier)
        for (const toolCall of response.toolCalls) {
          const tool = relevantTools.find((t) => t.name === toolCall.name)

          if (!tool) {
            // Malformed: unknown tool
            const canContinue = trackMalformedResponse(sessionId)
            messages.push(toolResultMessage(toolCall.id, { error: `Unknown tool: ${toolCall.name}` }))
            if (!canContinue) {
              throw new AgentError(
                "MALFORMED_LLM_RESPONSE",
                "Too many malformed responses",
                false,
                getUserMessage("MALFORMED_LLM_RESPONSE"),
              )
            }
            continue
          }

          // Infinite loop detection
          if (detectInfiniteLoop(sessionId, tool.name, toolCall.input)) {
            throw new AgentError(
              "INFINITE_LOOP",
              `Infinite loop detected: ${tool.name}`,
              false,
              getUserMessage("INFINITE_LOOP"),
            )
          }

          clearMalformedCount(sessionId)

          emitter.emitToolCall(tool.name, toolCall.input)

          try {
            const { result, action } = await executeTool(
              tool,
              toolCall.input,
              { tenantId, userId },
            )

            actionLog.push(action)
            emitter.emitToolResult(tool.name, result)

            messages.push(toolResultMessage(toolCall.id, result))

            // Record action
            await aiRepository.recordAction({
              conversationId: sessionId,
              tenantId,
              userId,
              toolName: tool.name,
              toolInput: toolCall.input as Record<string, unknown>,
              toolOutput: result,
              approvalTier: "auto",
              approvalDecision: null,
              approvedBy: null,
              reasoning: null,
              compensationAvailable: false,
              compensatedAt: null,
              durationMs: action.durationMs,
              tokensUsed: null,
            })
          } catch (err) {
            if (err instanceof ToolTimeoutError) {
              emitter.emitError(`${tool.name} timed out`, true)
              messages.push(toolResultMessage(toolCall.id, { error: "Tool timed out" }))
            } else {
              const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
              messages.push(toolResultMessage(toolCall.id, { error: errorMsg }))
            }
          }
        }

        iterations++
      }

      // Max iterations reached
      const text = "I reached the maximum processing steps. Here's what I found so far."
      emitter.emitText(text)
      emitter.emitDone(text, actionLog.length, totalInputTokens + totalOutputTokens)

      return {
        text,
        actions: actionLog,
        tokensUsed: totalInputTokens + totalOutputTokens,
        costCents: estimateCost(totalInputTokens, totalOutputTokens, "claude-sonnet-4-20250514"),
      } satisfies AgentTurnResult
    } catch (err) {
      clearSessionErrors(sessionId)
      const agentErr = err instanceof AgentError ? err : null
      const message = agentErr?.userMessage ?? getUserMessage("PROVIDER_OUTAGE")
      emitter.emitError(message, agentErr?.recoverable ?? false)
      emitter.emitDone(message, 0, 0)

      log.error({ err, sessionId }, "Agent reasoning loop failed")

      return {
        text: message,
        actions: [],
        tokensUsed: 0,
        costCents: 0,
      } satisfies AgentTurnResult
    }
  },
})

function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Rough cost estimation in cents
  if (model.includes("haiku")) {
    return Math.ceil((inputTokens * 0.00025 + outputTokens * 0.00125) * 100)
  }
  if (model.includes("sonnet")) {
    return Math.ceil((inputTokens * 0.003 + outputTokens * 0.015) * 100)
  }
  return Math.ceil((inputTokens * 0.015 + outputTokens * 0.075) * 100)
}
```

**Step 2: Create bootstrap file for tool registry access**

```typescript
// src/modules/ai/agent/agent.bootstrap.ts

import { ModuleToolRegistry } from "@/shared/module-system/tool-registry"
import { moduleRegistry } from "@/shared/module-system/register-all"
import type { AgentToolProvider } from "@/shared/module-system/tool-provider"

let instance: AgentToolProvider | null = null

export function getToolRegistryInstance(): AgentToolProvider {
  if (!instance) {
    instance = new ModuleToolRegistry(
      moduleRegistry,
      async (tenantId, slug) => {
        // Lazy import to avoid circular dependencies
        const { tenantService } = await import("@/modules/tenant/tenant.service")
        return tenantService.isModuleEnabled(tenantId, slug)
      },
      async (userId, permission) => {
        const { hasPermission } = await import("@/modules/auth/rbac")
        // hasPermission needs user object — simplified for Phase A
        // Full implementation resolves user from DB
        return true // Phase A: read-only tools, always permitted
      },
    )
  }
  return instance
}
```

**Step 3: Commit**

```bash
git add src/modules/ai/agent/agent.runtime.ts src/modules/ai/agent/agent.bootstrap.ts
git commit -m "feat(ai): add ReAct reasoning loop as Trigger.dev task"
```

---

## Task 16: AI Service

**Files:**
- Create: `src/modules/ai/ai.service.ts`

**Step 1: Write service**

```typescript
// src/modules/ai/ai.service.ts

import { logger } from "@/shared/logger"
import { aiRepository } from "./ai.repository"
import { anthropicProvider } from "./providers/anthropic"
import { agentReasoningLoop } from "./agent/agent.runtime"
import type { AIProvider, AIGenerateTextOptions, AIGenerateTextResult, AIGenerateStructuredOptions, AIGenerateStructuredResult } from "./providers/types"
import type { PageContext } from "./ai.types"

const log = logger.child({ module: "ai.service" })

export const aiService = {
  // --- Provider Access (for other modules) ---

  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    return anthropicProvider.generateText(options)
  },

  async generateStructured<T>(options: AIGenerateStructuredOptions<T>): Promise<AIGenerateStructuredResult<T>> {
    return anthropicProvider.generateStructured(options)
  },

  getProvider(): AIProvider {
    return anthropicProvider
  },

  // --- Chat / Agent ---

  async startAgentTurn(input: {
    sessionId?: string
    tenantId: string
    userId: string
    message: string
    pageContext?: PageContext
  }) {
    // 1. Get or create conversation
    let sessionId = input.sessionId
    if (!sessionId) {
      const conversation = await aiRepository.createConversation(
        input.tenantId,
        input.userId,
      )
      sessionId = conversation.id

      // Generate title from first message (truncate)
      const title = input.message.slice(0, 100)
      await aiRepository.updateConversation(sessionId, { title })
    }

    // 2. Append user message
    await aiRepository.appendMessage(sessionId, {
      role: "user",
      content: input.message,
      pageContext: input.pageContext,
      timestamp: new Date().toISOString(),
    })

    // 3. Trigger agent reasoning loop
    const run = await agentReasoningLoop.trigger({
      sessionId,
      tenantId: input.tenantId,
      userId: input.userId,
      message: input.message,
      pageContext: input.pageContext,
    })

    log.info({ sessionId, runId: run.id }, "Agent turn triggered")

    return { runId: run.id, sessionId }
  },

  // --- Prompt Templates ---

  async listPromptTemplates(tenantId: string, featureKey?: string) {
    return aiRepository.listPromptTemplates(tenantId, featureKey)
  },

  async upsertPromptTemplate(
    tenantId: string,
    data: Parameters<typeof aiRepository.upsertPromptTemplate>[1],
  ) {
    return aiRepository.upsertPromptTemplate(tenantId, data)
  },

  async deletePromptTemplate(tenantId: string, id: string) {
    return aiRepository.deletePromptTemplate(tenantId, id)
  },

  // --- Usage ---

  async getUsageSummary(
    tenantId: string,
    startDate: string,
    endDate: string,
    featureKey?: string,
  ) {
    return aiRepository.getUsageSummary(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      featureKey,
    )
  },

  // --- Config ---

  async getTenantConfig(tenantId: string) {
    return aiRepository.getTenantConfig(tenantId)
  },

  async updateTenantConfig(
    tenantId: string,
    data: Parameters<typeof aiRepository.upsertTenantConfig>[1],
  ) {
    return aiRepository.upsertTenantConfig(tenantId, data)
  },

  // --- Conversations ---

  async getConversation(sessionId: string, tenantId: string) {
    return aiRepository.getConversation(sessionId, tenantId)
  },

  async listConversations(
    tenantId: string,
    userId: string,
    limit: number,
    cursor?: string,
  ) {
    return aiRepository.listConversations(tenantId, userId, limit, cursor)
  },

  // --- Explainer (Phase B, stub for now) ---

  async explainActions(conversationId: string, tenantId: string): Promise<string> {
    const actions = await aiRepository.getActions(conversationId)
    if (actions.length === 0) return "No actions were taken in this conversation."

    // Phase A: return structured summary without LLM call
    return actions
      .map((a) => `- ${a.toolName}: ${JSON.stringify(a.toolInput).slice(0, 100)}`)
      .join("\n")
  },
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/ai.service.ts
git commit -m "feat(ai): add AI service with agent turn orchestration"
```

---

## Task 17: AI Router

**Files:**
- Create: `src/modules/ai/ai.router.ts`

**Step 1: Write router**

```typescript
// src/modules/ai/ai.router.ts

import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc"
import { aiService } from "./ai.service"
import {
  chatSendSchema,
  chatHistorySchema,
  chatSessionsSchema,
  chatExplainSchema,
  listPromptTemplatesSchema,
  upsertPromptTemplateSchema,
  deletePromptTemplateSchema,
  getUsageSummarySchema,
  updateAIConfigSchema,
} from "./ai.schemas"

export const aiRouter = router({
  // --- Chat ---
  chat: router({
    send: tenantProcedure
      .input(chatSendSchema)
      .mutation(async ({ ctx, input }) => {
        return aiService.startAgentTurn({
          sessionId: input.sessionId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          message: input.message,
          pageContext: input.pageContext,
        })
      }),

    history: tenantProcedure
      .input(chatHistorySchema)
      .query(async ({ ctx, input }) => {
        return aiService.getConversation(input.sessionId, ctx.tenantId)
      }),

    sessions: tenantProcedure
      .input(chatSessionsSchema)
      .query(async ({ ctx, input }) => {
        return aiService.listConversations(
          ctx.tenantId,
          ctx.user.id,
          input.limit,
          input.cursor,
        )
      }),

    explain: tenantProcedure
      .input(chatExplainSchema)
      .query(async ({ ctx, input }) => {
        return aiService.explainActions(input.conversationId, ctx.tenantId)
      }),
  }),

  // --- Prompt Templates ---
  templates: router({
    list: tenantProcedure
      .input(listPromptTemplatesSchema)
      .query(async ({ ctx, input }) => {
        return aiService.listPromptTemplates(ctx.tenantId, input.featureKey)
      }),

    upsert: permissionProcedure("ai:write")
      .input(upsertPromptTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        return aiService.upsertPromptTemplate(ctx.tenantId, input)
      }),

    delete: permissionProcedure("ai:write")
      .input(deletePromptTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        return aiService.deletePromptTemplate(ctx.tenantId, input.id)
      }),
  }),

  // --- Usage ---
  usage: router({
    summary: tenantProcedure
      .input(getUsageSummarySchema)
      .query(async ({ ctx, input }) => {
        return aiService.getUsageSummary(
          ctx.tenantId,
          input.startDate,
          input.endDate,
          input.featureKey,
        )
      }),
  }),

  // --- Config ---
  config: router({
    get: tenantProcedure.query(async ({ ctx }) => {
      return aiService.getTenantConfig(ctx.tenantId)
    }),

    update: permissionProcedure("ai:admin")
      .input(updateAIConfigSchema)
      .mutation(async ({ ctx, input }) => {
        return aiService.updateTenantConfig(ctx.tenantId, input)
      }),
  }),
})
```

**Step 2: Commit**

```bash
git add src/modules/ai/ai.router.ts
git commit -m "feat(ai): add AI tRPC router with chat, templates, usage, config"
```

---

## Task 18: AI Events (Trigger.dev Tasks)

**Files:**
- Create: `src/modules/ai/ai.events.ts`
- Create: `src/modules/ai/agent/tasks/index.ts`

**Step 1: Write events file**

```typescript
// src/modules/ai/ai.events.ts

// Re-export Trigger.dev tasks for registration
// The agent reasoning loop is the primary task for Phase A
export { agentReasoningLoop } from "./agent/agent.runtime"

// Future Phase B+ tasks:
// export { agentExplainActions } from "./agent/tasks/explain-actions"
// export { agentExtractMemories } from "./agent/tasks/extract-memories"
// export { agentMorningBriefing } from "./agent/tasks/morning-briefing"
```

**Step 2: Create tasks barrel**

```typescript
// src/modules/ai/agent/tasks/index.ts

// Trigger.dev task barrel — all agent tasks registered here
// Trigger.dev auto-discovers tasks from the dirs config in trigger.config.ts
export { agentReasoningLoop } from "../agent.runtime"
```

**Step 3: Commit**

```bash
git add src/modules/ai/ai.events.ts src/modules/ai/agent/tasks/index.ts
git commit -m "feat(ai): add AI events and Trigger.dev task registration"
```

---

## Task 19: AI Manifest

**Files:**
- Create: `src/modules/ai/ai.manifest.ts`

**Step 1: Write manifest**

```typescript
// src/modules/ai/ai.manifest.ts

import type { ModuleManifest } from "@/shared/module-system/types"

export const aiManifest: ModuleManifest = {
  slug: "ai",
  name: "AI Assistant",
  description: "AI-powered agent, chat interface, and intelligent automation",
  icon: "Brain",
  category: "intelligence",
  dependencies: [],
  routes: [
    { path: "/admin/ai", label: "AI Assistant", permission: "ai:read" },
    { path: "/admin/ai/settings", label: "AI Settings", permission: "ai:admin" },
  ],
  sidebarItems: [
    {
      title: "AI Assistant",
      href: "/admin/ai",
      icon: "Brain",
      section: "intelligence",
      permission: "ai:read",
    },
  ],
  analyticsWidgets: [
    {
      id: "ai-usage",
      type: "bar",
      label: "AI Usage",
      size: "2x1",
      dataSource: { procedure: "ai.usage.summary" },
    },
  ],
  permissions: ["ai:read", "ai:write", "ai:admin"],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: "standard",
  settingsTab: {
    slug: "ai",
    label: "AI Settings",
    icon: "Brain",
    section: "module",
  },
  settingsDefinitions: [
    {
      key: "ai.enabled",
      label: "Enable AI Assistant",
      type: "boolean",
      defaultValue: false,
      category: "general",
      order: 1,
    },
    {
      key: "ai.defaultModel",
      label: "Default Model",
      type: "select",
      defaultValue: "claude-haiku-4-5-20251001",
      options: [
        { label: "Claude Haiku (fast, cheap)", value: "claude-haiku-4-5-20251001" },
        { label: "Claude Sonnet (balanced)", value: "claude-sonnet-4-20250514" },
      ],
      category: "general",
      order: 2,
    },
    {
      key: "ai.monthlyBudget",
      label: "Monthly Token Budget",
      type: "number",
      defaultValue: 1000000,
      validation: { min: 0 },
      category: "limits",
      order: 3,
    },
  ],
  auditResources: ["ai-conversation", "agent-action", "ai-config"],
}
```

**Step 2: Commit**

```bash
git add src/modules/ai/ai.manifest.ts
git commit -m "feat(ai): add AI module manifest"
```

---

## Task 20: Wiring (Root Router + Module Registry + Barrel)

**Files:**
- Create: `src/modules/ai/index.ts`
- Modify: `src/server/root.ts` (add ai router)
- Modify: `src/shared/module-system/register-all.ts` (register manifest)

**Step 1: Create barrel export**

```typescript
// src/modules/ai/index.ts

export { aiRouter } from "./ai.router"
export { aiService } from "./ai.service"
export { aiManifest } from "./ai.manifest"
```

**Step 2: Add to root router**

In `src/server/root.ts`, add import:
```typescript
import { aiRouter } from "@/modules/ai"
```

Add to appRouter object:
```typescript
  ai: aiRouter,
```

**Step 3: Register manifest**

In `src/shared/module-system/register-all.ts`, add import:
```typescript
import { aiManifest } from '@/modules/ai/ai.manifest'
```

Add registration (after the core modules section):
```typescript
moduleRegistry.register(aiManifest)
```

**Step 4: Commit**

```bash
git add src/modules/ai/index.ts src/server/root.ts src/shared/module-system/register-all.ts
git commit -m "feat(ai): wire AI module into root router and module registry"
```

---

## Task 21: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai.repository.test.ts`
- Create: `src/modules/ai/__tests__/ai.service.test.ts`
- Create: `src/modules/ai/agent/__tests__/agent.planner.test.ts`
- Create: `src/modules/ai/agent/__tests__/agent.executor.test.ts`
- Create: `src/modules/ai/agent/__tests__/agent.context.test.ts`
- Create: `src/modules/ai/agent/__tests__/agent.errors.test.ts`

**Step 1: Write agent.errors tests**

```typescript
// src/modules/ai/agent/__tests__/agent.errors.test.ts

import { describe, it, expect, beforeEach } from "vitest"
import {
  trackMalformedResponse,
  clearMalformedCount,
  detectInfiniteLoop,
  clearLoopHistory,
  clearSessionErrors,
  getUserMessage,
  AgentError,
} from "../agent.errors"

describe("agent.errors", () => {
  const sessionId = "test-session-1"

  beforeEach(() => {
    clearSessionErrors(sessionId)
  })

  describe("trackMalformedResponse", () => {
    it("returns true for first two malformed responses", () => {
      expect(trackMalformedResponse(sessionId)).toBe(true)
      expect(trackMalformedResponse(sessionId)).toBe(true)
    })

    it("returns false on third consecutive malformed response", () => {
      trackMalformedResponse(sessionId)
      trackMalformedResponse(sessionId)
      expect(trackMalformedResponse(sessionId)).toBe(false)
    })

    it("resets count when cleared", () => {
      trackMalformedResponse(sessionId)
      trackMalformedResponse(sessionId)
      clearMalformedCount(sessionId)
      expect(trackMalformedResponse(sessionId)).toBe(true)
    })
  })

  describe("detectInfiniteLoop", () => {
    it("returns false for first two identical calls", () => {
      const input = { query: "test" }
      expect(detectInfiniteLoop(sessionId, "booking.list", input)).toBe(false)
      expect(detectInfiniteLoop(sessionId, "booking.list", input)).toBe(false)
    })

    it("returns true on third identical call", () => {
      const input = { query: "test" }
      detectInfiniteLoop(sessionId, "booking.list", input)
      detectInfiniteLoop(sessionId, "booking.list", input)
      expect(detectInfiniteLoop(sessionId, "booking.list", input)).toBe(true)
    })

    it("does not trigger for different inputs", () => {
      detectInfiniteLoop(sessionId, "booking.list", { query: "a" })
      detectInfiniteLoop(sessionId, "booking.list", { query: "b" })
      expect(detectInfiniteLoop(sessionId, "booking.list", { query: "c" })).toBe(false)
    })
  })

  describe("getUserMessage", () => {
    it("returns user-friendly messages for all error codes", () => {
      const codes = [
        "MALFORMED_LLM_RESPONSE",
        "TOOL_TIMEOUT",
        "APPROVAL_TIMEOUT",
        "CONTEXT_OVERFLOW",
        "SESSION_BUDGET_EXHAUSTED",
        "MONTHLY_BUDGET_EXHAUSTED",
        "RATE_LIMITED",
        "PROVIDER_OUTAGE",
        "INFINITE_LOOP",
      ] as const

      for (const code of codes) {
        const msg = getUserMessage(code)
        expect(msg).toBeTruthy()
        expect(typeof msg).toBe("string")
      }
    })
  })

  describe("AgentError", () => {
    it("creates error with all properties", () => {
      const err = new AgentError("TOOL_TIMEOUT", "internal msg", true, "user msg")
      expect(err.code).toBe("TOOL_TIMEOUT")
      expect(err.message).toBe("internal msg")
      expect(err.recoverable).toBe(true)
      expect(err.userMessage).toBe("user msg")
      expect(err.name).toBe("AgentError")
    })
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/modules/ai/agent/__tests__/agent.errors.test.ts`
Expected: PASS

**Step 3: Write agent.planner tests**

```typescript
// src/modules/ai/agent/__tests__/agent.planner.test.ts

import { describe, it, expect, vi } from "vitest"
import { selectRelevantTools } from "../agent.planner"
import type { AgentTool } from "../agent.types"
import type { AIProvider } from "../../providers/types"
import { z } from "zod"

function makeTool(name: string): AgentTool {
  return {
    name,
    description: `Description for ${name}`,
    parametersSchema: z.object({}),
    handler: async () => ({}),
    readOnly: true,
    approvalTier: "auto",
    requiredPermission: "test:read",
    reversible: false,
    tags: [],
    costCategory: "free",
  }
}

describe("selectRelevantTools", () => {
  it("returns all tools when count <= 15", async () => {
    const tools = Array.from({ length: 10 }, (_, i) => makeTool(`tool.${i}`))
    const mockProvider = {} as AIProvider // not called when <= 15 tools

    const result = await selectRelevantTools("test message", tools, mockProvider)
    expect(result).toHaveLength(10)
  })

  it("calls provider for selection when > 15 tools", async () => {
    const tools = Array.from({ length: 20 }, (_, i) => makeTool(`tool.${i}`))
    const mockProvider: AIProvider = {
      generateText: vi.fn(),
      generateWithTools: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue({
        data: { tools: ["tool.0", "tool.5", "tool.10"] },
        inputTokens: 100,
        outputTokens: 20,
        model: "test",
      }),
    }

    const result = await selectRelevantTools("test message", tools, mockProvider)
    expect(result).toHaveLength(3)
    expect(result.map((t) => t.name)).toEqual(["tool.0", "tool.5", "tool.10"])
  })

  it("returns all tools on provider error", async () => {
    const tools = Array.from({ length: 20 }, (_, i) => makeTool(`tool.${i}`))
    const mockProvider: AIProvider = {
      generateText: vi.fn(),
      generateWithTools: vi.fn(),
      generateStructured: vi.fn().mockRejectedValue(new Error("API error")),
    }

    const result = await selectRelevantTools("test message", tools, mockProvider)
    expect(result).toHaveLength(20)
  })
})
```

**Step 4: Run test**

Run: `npx vitest run src/modules/ai/agent/__tests__/agent.planner.test.ts`
Expected: PASS

**Step 5: Write agent.executor tests**

```typescript
// src/modules/ai/agent/__tests__/agent.executor.test.ts

import { describe, it, expect, vi } from "vitest"
import { executeTool, ToolTimeoutError } from "../agent.executor"
import type { AgentTool } from "../agent.types"
import { z } from "zod"

describe("executeTool", () => {
  const ctx = { tenantId: "t1", userId: "u1" }

  it("validates input and calls handler", async () => {
    const handler = vi.fn().mockResolvedValue({ id: "123", name: "Test" })
    const tool: AgentTool = {
      name: "test.get",
      description: "Get test",
      parametersSchema: z.object({ id: z.string() }),
      handler,
      readOnly: true,
      approvalTier: "auto",
      requiredPermission: "test:read",
      reversible: false,
      tags: [],
      costCategory: "free",
    }

    const { result, action } = await executeTool(tool, { id: "123" }, ctx)
    expect(result).toEqual({ id: "123", name: "Test" })
    expect(action.toolName).toBe("test.get")
    expect(action.durationMs).toBeGreaterThanOrEqual(0)
    expect(handler).toHaveBeenCalledWith(ctx, { id: "123" })
  })

  it("throws on invalid input", async () => {
    const tool: AgentTool = {
      name: "test.get",
      description: "Get test",
      parametersSchema: z.object({ id: z.string() }),
      handler: vi.fn(),
      readOnly: true,
      approvalTier: "auto",
      requiredPermission: "test:read",
      reversible: false,
      tags: [],
      costCategory: "free",
    }

    await expect(executeTool(tool, { id: 123 }, ctx)).rejects.toThrow()
  })
})
```

**Step 6: Run test**

Run: `npx vitest run src/modules/ai/agent/__tests__/agent.executor.test.ts`
Expected: PASS

**Step 7: Write context assembly tests**

```typescript
// src/modules/ai/agent/__tests__/agent.context.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the repository before importing the module under test
vi.mock("../../ai.repository", () => ({
  aiRepository: {
    getTenantConfig: vi.fn().mockResolvedValue(null),
    getConversation: vi.fn().mockResolvedValue({
      id: "sess-1",
      messages: [],
      status: "active",
    }),
    getRecentCorrections: vi.fn().mockResolvedValue([]),
  },
}))

import { assembleContext } from "../agent.context"

describe("assembleContext", () => {
  it("returns context with default guardrails when no config", async () => {
    const ctx = await assembleContext("t1", "u1", "sess-1")
    expect(ctx.systemPrompt).toContain("AI assistant")
    expect(ctx.guardrails.maxToolCallsPerSession).toBe(30)
    expect(ctx.conversationHistory).toEqual([])
  })

  it("includes page context in system prompt", async () => {
    const ctx = await assembleContext("t1", "u1", "sess-1", {
      route: "/admin/bookings/abc-123",
      entityType: "booking",
      entityId: "abc-123",
    })
    expect(ctx.systemPrompt).toContain("booking")
    expect(ctx.systemPrompt).toContain("abc-123")
  })
})
```

**Step 8: Run test**

Run: `npx vitest run src/modules/ai/agent/__tests__/agent.context.test.ts`
Expected: PASS

**Step 9: Commit all tests**

```bash
git add src/modules/ai/__tests__/ src/modules/ai/agent/__tests__/
git commit -m "test(ai): add unit tests for agent errors, planner, executor, context"
```

---

## Task 22: TypeScript + Build Verification

**Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: 0 errors (fix any that appear)

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass including new AI tests

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(ai): resolve tsc and build issues"
```

---

## Future Phases (Outline)

### Phase B: Mutations, Approvals & Trust
- Tasks 23-30: Guardrail classification engine, approval flow with `wait.forToken()`, mutation tool declarations on manifests, compensation/undo stack, trust ratchet tracking, "Why" button explainer, all 9 failure mode tests, approval card React component

### Phase C: Workflow Intelligence
- Tasks 31-37: AI_DECISION node type in graph engine, AI_GENERATE node type, `ai_recover` error handling strategy, natural language → workflow generator, proactive workflow suggestion cron, `ai_workflow_suggestions` table integration, visual builder integration

### Phase D: Memory, Knowledge & Vertical Intelligence
- Tasks 38-44: Three-layer memory system (Redis/PG/pgvector), rolling conversation summarization, cross-session context, correction learning loop, document upload pipeline (chunk/embed/store), RAG retrieval, 6 pre-built vertical template packs, self-bootstrapping for custom verticals

### Phase E: Integrations
- Tasks 45-50: MCP server endpoint (`/api/mcp`), MCP client (discover + invoke external tools), event dispatcher replacing `inngest.send()`, begin Inngest → Trigger.dev Wave 2 migration (workflow, notification, booking modules)

### Phase F: Killer Features
- Tasks 51-57: Morning briefing cron, Ghost Operator (after-hours processing), Paste-to-Pipeline, Compliance Copilot, Voice of the Pipeline, Scenario Simulator, A2A protocol foundation
