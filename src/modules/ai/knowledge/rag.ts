// src/modules/ai/knowledge/rag.ts

import { logger } from "@/shared/logger"
import { knowledgeRepository } from "./repository"
import type { RAGResult } from "../ai.types"

const log = logger.child({ module: "ai.knowledge.rag" })

const MAX_RAG_RESULTS = 3
const MAX_RAG_TOKENS = 2000

export async function retrieveContext(tenantId: string, query: string): Promise<RAGResult[]> {
  const chunks = await knowledgeRepository.searchByKeyword(tenantId, query, MAX_RAG_RESULTS)

  const results: RAGResult[] = chunks.map((chunk) => ({
    chunkId: chunk.id,
    content: chunk.content,
    sourceName: chunk.sourceName,
    similarity: 0.5,
  }))

  let totalChars = 0
  const trimmedResults: RAGResult[] = []
  for (const result of results) {
    totalChars += result.content.length
    if (totalChars > MAX_RAG_TOKENS * 4) break
    trimmedResults.push(result)
  }

  if (trimmedResults.length > 0) {
    log.info({ tenantId, results: trimmedResults.length, query: query.slice(0, 50) }, "RAG context retrieved")
  }

  return trimmedResults
}

export function formatRAGContext(results: RAGResult[]): string {
  if (results.length === 0) return ""

  const sections = results.map(
    (r) => `[From: ${r.sourceName}]\n${r.content}`
  )

  return `\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${sections.join("\n\n")}\n\nUse this context to inform your responses when relevant. Cite the source when using this information.`
}
