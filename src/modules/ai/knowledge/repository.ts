// src/modules/ai/knowledge/repository.ts

import { db } from "@/shared/db"
import { aiKnowledgeChunks } from "@/shared/db/schema"
import { eq, and, sql, ilike } from "drizzle-orm"
import { logger } from "@/shared/logger"
import { chunkDocument } from "./chunker"
import { embedChunks } from "./embedder"
import type { KnowledgeChunkRecord } from "../ai.types"

const log = logger.child({ module: "ai.knowledge.repository" })

function mapChunk(row: typeof aiKnowledgeChunks.$inferSelect): KnowledgeChunkRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    sourceId: row.sourceId,
    sourceName: row.sourceName,
    content: row.content,
    chunkIndex: row.chunkIndex,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  }
}

export const knowledgeRepository = {
  async ingestDocument(tenantId: string, sourceId: string, sourceName: string, text: string, metadata?: Record<string, unknown>): Promise<number> {
    const chunks = chunkDocument(text, sourceName)
    const embeddings = await embedChunks(chunks.map((c) => c.content))

    await db.delete(aiKnowledgeChunks).where(
      and(eq(aiKnowledgeChunks.tenantId, tenantId), eq(aiKnowledgeChunks.sourceId, sourceId))
    )

    for (let i = 0; i < chunks.length; i++) {
      await db.insert(aiKnowledgeChunks).values({
        tenantId,
        sourceId,
        sourceName,
        content: chunks[i]!.content,
        chunkIndex: chunks[i]!.chunkIndex,
        embedding: embeddings[i] ?? null,
        metadata: metadata ?? {},
      })
    }

    log.info({ tenantId, sourceId, chunks: chunks.length }, "Document ingested")
    return chunks.length
  },

  async searchByKeyword(tenantId: string, query: string, limit = 5): Promise<KnowledgeChunkRecord[]> {
    const terms = query.split(/\s+/).filter((t) => t.length > 2).slice(0, 5)
    if (terms.length === 0) return []

    // Use ILIKE with OR for each term
    const conditions = terms.map((term) => ilike(aiKnowledgeChunks.content, `%${term}%`))

    const rows = await db
      .select()
      .from(aiKnowledgeChunks)
      .where(and(eq(aiKnowledgeChunks.tenantId, tenantId), sql`(${sql.join(conditions, sql` OR `)})`))
      .limit(limit)

    return rows.map(mapChunk)
  },

  async deleteSource(tenantId: string, sourceId: string): Promise<void> {
    await db.delete(aiKnowledgeChunks).where(
      and(eq(aiKnowledgeChunks.tenantId, tenantId), eq(aiKnowledgeChunks.sourceId, sourceId))
    )
    log.info({ tenantId, sourceId }, "Knowledge source deleted")
  },

  async listSources(tenantId: string): Promise<Array<{ sourceId: string; sourceName: string; chunkCount: number }>> {
    const rows = await db
      .select({
        sourceId: aiKnowledgeChunks.sourceId,
        sourceName: aiKnowledgeChunks.sourceName,
        chunkCount: sql<number>`count(*)::int`,
      })
      .from(aiKnowledgeChunks)
      .where(eq(aiKnowledgeChunks.tenantId, tenantId))
      .groupBy(aiKnowledgeChunks.sourceId, aiKnowledgeChunks.sourceName)

    return rows
  },
}
