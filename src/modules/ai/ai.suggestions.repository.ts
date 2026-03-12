import { db } from "@/shared/db"
import { aiWorkflowSuggestions } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.suggestions.repository" })

export interface WorkflowSuggestionRecord {
  id: string
  tenantId: string
  title: string
  description: string
  suggestedNodes: unknown[] | null
  suggestedEdges: unknown[] | null
  detectedPattern: string
  confidence: number
  status: "pending" | "accepted" | "dismissed" | "expired"
  acceptedAt: Date | null
  dismissedAt: Date | null
  createdAt: Date
}

function mapSuggestion(row: typeof aiWorkflowSuggestions.$inferSelect): WorkflowSuggestionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    suggestedNodes: row.suggestedNodes as unknown[] | null,
    suggestedEdges: row.suggestedEdges as unknown[] | null,
    detectedPattern: row.detectedPattern,
    confidence: row.confidence,
    status: row.status as WorkflowSuggestionRecord["status"],
    acceptedAt: row.acceptedAt,
    dismissedAt: row.dismissedAt,
    createdAt: row.createdAt,
  }
}

export const suggestionsRepository = {
  async create(data: {
    tenantId: string
    title: string
    description: string
    suggestedNodes?: unknown[]
    suggestedEdges?: unknown[]
    detectedPattern: string
    confidence: number
  }): Promise<WorkflowSuggestionRecord> {
    const [row] = await db
      .insert(aiWorkflowSuggestions)
      .values({
        tenantId: data.tenantId,
        title: data.title,
        description: data.description,
        suggestedNodes: data.suggestedNodes ?? null,
        suggestedEdges: data.suggestedEdges ?? null,
        detectedPattern: data.detectedPattern,
        confidence: data.confidence,
      })
      .returning()
    log.info({ suggestionId: row!.id, tenantId: data.tenantId }, "Workflow suggestion created")
    return mapSuggestion(row!)
  },

  async listByTenant(tenantId: string, status?: string, limit = 20): Promise<{ rows: WorkflowSuggestionRecord[]; hasMore: boolean }> {
    const conditions = [eq(aiWorkflowSuggestions.tenantId, tenantId)]
    if (status) conditions.push(eq(aiWorkflowSuggestions.status, status))

    const rows = await db
      .select()
      .from(aiWorkflowSuggestions)
      .where(and(...conditions))
      .orderBy(desc(aiWorkflowSuggestions.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: (hasMore ? rows.slice(0, limit) : rows).map(mapSuggestion),
      hasMore,
    }
  },

  async updateStatus(id: string, status: "accepted" | "dismissed"): Promise<void> {
    const updates: Record<string, unknown> = { status }
    if (status === "accepted") updates.acceptedAt = new Date()
    if (status === "dismissed") updates.dismissedAt = new Date()
    await db.update(aiWorkflowSuggestions).set(updates).where(eq(aiWorkflowSuggestions.id, id))
  },
}
