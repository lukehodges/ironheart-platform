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
