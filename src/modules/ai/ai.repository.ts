// src/modules/ai/ai.repository.ts

import { db } from "@/shared/db"
import { aiConversations, aiMessages } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"
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
    summary: row.summary ?? null,
    summaryUpdatedAt: row.summaryUpdatedAt ?? null,
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

  async getConversationById(conversationId: string): Promise<ConversationRecord | null> {
    const [row] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, conversationId))
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
    updates: { title?: string; status?: string; tokenCount?: number; costCents?: number; summary?: string; summaryUpdatedAt?: Date }
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
