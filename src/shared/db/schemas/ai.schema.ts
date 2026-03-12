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
