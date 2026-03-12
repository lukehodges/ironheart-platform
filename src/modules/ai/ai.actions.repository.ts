// src/modules/ai/ai.actions.repository.ts

import { db } from "@/shared/db"
import { agentActions } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"
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
