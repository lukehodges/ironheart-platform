// src/modules/ai/memory/corrections.ts

import { db } from "@/shared/db"
import { aiCorrections } from "@/shared/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logger } from "@/shared/logger"
import type { CorrectionRecord } from "../ai.types"

const log = logger.child({ module: "ai.memory.corrections" })

function mapCorrection(row: typeof aiCorrections.$inferSelect): CorrectionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    toolName: row.toolName,
    attemptedInput: row.attemptedInput,
    rejectionReason: row.rejectionReason,
    correctAction: row.correctAction,
    contextSummary: row.contextSummary,
    occurrenceCount: row.occurrenceCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const correctionsRepository = {
  async recordRejection(data: {
    tenantId: string
    toolName: string
    attemptedInput: unknown
    rejectionReason?: string
    contextSummary?: string
  }): Promise<CorrectionRecord> {
    const [row] = await db
      .insert(aiCorrections)
      .values({
        tenantId: data.tenantId,
        toolName: data.toolName,
        attemptedInput: data.attemptedInput,
        rejectionReason: data.rejectionReason ?? null,
        contextSummary: data.contextSummary ?? null,
      })
      .returning()
    log.info({ tenantId: data.tenantId, toolName: data.toolName }, "Correction recorded")
    return mapCorrection(row!)
  },

  async getRecentCorrections(tenantId: string, toolName: string, limit = 5): Promise<CorrectionRecord[]> {
    const rows = await db
      .select()
      .from(aiCorrections)
      .where(and(eq(aiCorrections.tenantId, tenantId), eq(aiCorrections.toolName, toolName)))
      .orderBy(desc(aiCorrections.updatedAt))
      .limit(limit)
    return rows.map(mapCorrection)
  },

  async getAllRecentCorrections(tenantId: string, limit = 10): Promise<CorrectionRecord[]> {
    const rows = await db
      .select()
      .from(aiCorrections)
      .where(eq(aiCorrections.tenantId, tenantId))
      .orderBy(desc(aiCorrections.updatedAt))
      .limit(limit)
    return rows.map(mapCorrection)
  },
}
