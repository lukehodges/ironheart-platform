// src/modules/ai/knowledge/embedder.ts

import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.knowledge.embedder" })

export async function embedChunks(chunks: string[]): Promise<(string | null)[]> {
  log.info({ chunkCount: chunks.length }, "Embedding chunks (placeholder — no provider configured)")
  return chunks.map(() => null)
}

export async function embedQuery(query: string): Promise<string | null> {
  return null
}
