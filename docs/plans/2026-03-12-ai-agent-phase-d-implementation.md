# AI Agent Phase D Implementation Plan

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Add memory system (three-layer: Redis/PG/pgvector), rolling conversation summarization, correction memory (learn from rejections), knowledge base with RAG retrieval, and vertical industry profiles. The agent remembers context across sessions, references tenant documents, and speaks the tenant's industry language.

**Timeline:** 8 working days

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md` (Section 7: Data, Context & Memory, Section 5: Industry Agnosticism, Section 10: Phase D)
**Phase C Plan (prerequisite — must be complete):** `docs/plans/2026-03-12-ai-agent-phase-c-implementation.md`
**Code Execution Engine Design:** `docs/plans/2026-03-12-ai-code-execution-engine-design.md` — The agent uses 2 tools (`execute_code` + `describe_module`) with a tRPC caller, not individual tool files.

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **Three-layer memory architecture.** Hot (Redis — current session context, 1hr TTL), Warm (PostgreSQL — conversation summaries, corrections), Cold (pgvector — knowledge chunks for RAG). No separate vector database — pgvector in existing PostgreSQL.
2. **Rolling conversation summarization.** After every 10 messages in a conversation, summarize the conversation so far using Haiku and store the summary. When loading history, use summary + last 10 messages instead of loading all messages. This keeps context windows manageable.
3. **Correction memory.** When a user rejects an agent action (from Phase B), store the rejection context in `ai_corrections`. The agent's system prompt includes recent corrections for the tool, so it learns from past mistakes. Corrections are tenant-scoped.
4. **Knowledge base uses pgvector.** Tenants can upload documents. Documents are chunked, embedded (using Anthropic's embedding model or a local model), and stored in `ai_knowledge_chunks`. RAG retrieval runs before each agent turn to inject relevant context.
5. **Vertical profiles on `ai_tenant_config`.** A `verticalProfile` field stores the tenant's industry (e.g., "bng_brokerage", "dental_practice", "fitness_studio"). The system prompt adapts terminology, tool descriptions, and behavioral preferences per vertical.
6. **No fine-tuning.** Prompt engineering + vertical profiles + corrections is sufficient. The system prompt is dynamically assembled from: base prompt + vertical context + page context + recent corrections + RAG results.

---

## Progress Tracking

```
[ ] Task 1: Database schema — ai_corrections + ai_knowledge_chunks tables
[ ] Task 2: Memory types and interfaces
[ ] Task 3: Redis hot memory layer
[ ] Task 4: Conversation summarizer
[ ] Task 5: Correction memory repository + auto-capture
[ ] Task 6: Knowledge base — chunking + embedding pipeline
[ ] Task 7: RAG retrieval service
[ ] Task 8: Vertical profiles
[ ] Task 9: Dynamic system prompt assembly
[ ] Task 10: Update AI service to use memory layers
[ ] Task 11: Router procedures + schemas
[ ] Task 12: Tests
[ ] Task 13: Verification — tsc + build + tests
```

---

## Codebase Patterns Reference

All patterns from Phase A+, B, and C apply. Additionally:

### pgvector pattern:
```typescript
// pgvector column in Drizzle (requires drizzle-orm pgvector support):
import { vector } from "drizzle-orm/pg-core"
// vector("embedding", { dimensions: 1536 }) — adjust dimensions for model

// Similarity search:
// Use raw SQL for cosine similarity: 1 - (embedding <=> $1::vector)
import { sql } from "drizzle-orm"
```

### Redis patterns:
```typescript
import { redis } from "@/shared/redis"
// Hot memory: redis.set(key, JSON.stringify(data), { ex: 3600 }) — 1hr TTL
// redis.get(key) → parse JSON
```

---

## Task 1: Database Schema — ai_corrections + ai_knowledge_chunks

**Files:**
- Modify: `src/shared/db/schemas/ai.schema.ts`

```typescript
// Add below existing tables in ai.schema.ts

// ---------------------------------------------------------------------------
// AI Corrections — learn from rejection patterns
// ---------------------------------------------------------------------------

export const aiCorrections = pgTable("ai_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  toolName: text("tool_name").notNull(), // Stores tRPC procedure path, e.g., "booking.updateStatus"
  /** What the agent tried to do */
  attemptedInput: jsonb("attempted_input").notNull(),
  /** Why the user rejected it (extracted from context or explicit feedback) */
  rejectionReason: text("rejection_reason"),
  /** What the correct action should have been (if known) */
  correctAction: text("correct_action"),
  /** Original conversation context summary */
  contextSummary: text("context_summary"),
  /** How many times this pattern has been seen */
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_corrections_tenant_tool").on(t.tenantId, t.toolName),
])

// ---------------------------------------------------------------------------
// AI Knowledge Chunks — tenant knowledge base for RAG
// ---------------------------------------------------------------------------

export const aiKnowledgeChunks = pgTable("ai_knowledge_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  /** Source document identifier (filename, URL, etc.) */
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  /** The text chunk */
  content: text("content").notNull(),
  /** Chunk index within the source document */
  chunkIndex: integer("chunk_index").notNull().default(0),
  /** pgvector embedding — 1536 dimensions (text-embedding-3-small) */
  embedding: text("embedding"), // Store as text for now; upgrade to vector() when pgvector extension is confirmed
  /** Metadata: document type, section headers, etc. */
  metadata: jsonb("metadata").default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_knowledge_chunks_tenant").on(t.tenantId),
  index("idx_ai_knowledge_chunks_source").on(t.tenantId, t.sourceId),
])
```

**Note on pgvector:** The embedding column is stored as `text` initially. When the pgvector extension is confirmed available on the database, it should be migrated to `vector(1536)` with an ivfflat index. This lets us ship without blocking on database extension availability.

Also add a `verticalProfile` field and `conversationSummary` support to existing tables:

Add to `aiTenantConfig`:
```typescript
verticalProfile: text("vertical_profile"), // e.g., "bng_brokerage", "dental_practice"
verticalCustomTerms: jsonb("vertical_custom_terms").default("{}"),
```

Add to `aiConversations`:
```typescript
summary: text("summary"), // Rolling conversation summary
summaryUpdatedAt: timestamp("summary_updated_at", { withTimezone: true }),
```

**Commit:** `feat(ai): add ai_corrections, ai_knowledge_chunks tables and vertical profile fields`

---

## Task 2: Memory Types and Interfaces

**Files:**
- Modify: `src/modules/ai/ai.types.ts`

```typescript
// Add to ai.types.ts:

// ---------------------------------------------------------------------------
// Memory System
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  summary: string
  messageCount: number
  lastSummarizedAt: Date
}

export interface CorrectionRecord {
  id: string
  tenantId: string
  toolName: string
  attemptedInput: unknown
  rejectionReason: string | null
  correctAction: string | null
  contextSummary: string | null
  occurrenceCount: number
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeChunkRecord {
  id: string
  tenantId: string
  sourceId: string
  sourceName: string
  content: string
  chunkIndex: number
  metadata: Record<string, unknown>
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Vertical Profiles
// ---------------------------------------------------------------------------

export interface VerticalProfile {
  slug: string
  name: string
  description: string
  /** Term mappings: generic term → vertical-specific term */
  terminology: Record<string, string>
  /** Additional system prompt context for this vertical */
  systemPromptAddendum: string
  // Note: No toolDescriptionOverrides — the module index is auto-generated from
  // router introspection (see ai.introspection.ts). Vertical-specific terminology
  // is handled via the terminology map and systemPromptAddendum.
}

// ---------------------------------------------------------------------------
// RAG Context
// ---------------------------------------------------------------------------

export interface RAGResult {
  chunkId: string
  content: string
  sourceName: string
  similarity: number
}

// ---------------------------------------------------------------------------
// Assembled Prompt Context
// ---------------------------------------------------------------------------

export interface AssembledContext {
  systemPrompt: string
  corrections: CorrectionRecord[]
  ragResults: RAGResult[]
  conversationSummary: string | null
  recentMessages: MessageRecord[]
}
```

**Commit:** `feat(ai): add memory system, vertical profile, and RAG type definitions`

---

## Task 3: Redis Hot Memory Layer

**Files:**
- Create: `src/modules/ai/memory/hot.ts`

```typescript
// src/modules/ai/memory/hot.ts

import { redis } from "@/shared/redis"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.memory.hot" })

const HOT_MEMORY_TTL = 3600 // 1 hour

/**
 * Store session context in Redis for fast retrieval during active conversations.
 */
export const hotMemory = {
  async setSessionContext(conversationId: string, data: {
    recentToolCalls: Array<{ name: string; result: unknown }>
    currentIntent: string | null
    pageHistory: string[]
  }): Promise<void> {
    const key = `ai:session:${conversationId}`
    await redis.set(key, JSON.stringify(data), { ex: HOT_MEMORY_TTL })
  },

  async getSessionContext(conversationId: string): Promise<{
    recentToolCalls: Array<{ name: string; result: unknown }>
    currentIntent: string | null
    pageHistory: string[]
  } | null> {
    const key = `ai:session:${conversationId}`
    const raw = await redis.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw as string)
    } catch {
      return null
    }
  },

  async clearSession(conversationId: string): Promise<void> {
    const key = `ai:session:${conversationId}`
    await redis.del(key)
  },

  /**
   * Track page navigation for context-aware responses.
   */
  async trackPageVisit(conversationId: string, route: string): Promise<void> {
    const ctx = await this.getSessionContext(conversationId)
    if (ctx) {
      ctx.pageHistory = [...ctx.pageHistory.slice(-9), route] // Keep last 10
      await this.setSessionContext(conversationId, ctx)
    }
  },
}
```

**Commit:** `feat(ai): add Redis hot memory layer for active session context`

---

## Task 4: Conversation Summarizer

**Files:**
- Create: `src/modules/ai/memory/summarizer.ts`

```typescript
// src/modules/ai/memory/summarizer.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"
import { aiRepository } from "../ai.repository"

const log = logger.child({ module: "ai.memory.summarizer" })

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001"
const SUMMARIZE_THRESHOLD = 10 // Summarize after every 10 messages

/**
 * Check if a conversation needs summarization and do it if so.
 * Called after each new message.
 */
export async function maybeSummarize(conversationId: string): Promise<void> {
  const conversation = await aiRepository.getConversation("*", conversationId)
  if (!conversation) return

  const messages = await aiRepository.getMessages(conversationId, 100)
  const messagesSinceSummary = conversation.summary
    ? messages.filter((m) => !conversation.summaryUpdatedAt || m.createdAt > conversation.summaryUpdatedAt)
    : messages

  if (messagesSinceSummary.length < SUMMARIZE_THRESHOLD) return

  log.info({ conversationId, messageCount: messages.length }, "Summarizing conversation")

  const existingSummary = conversation.summary ?? ""
  const newMessages = messagesSinceSummary
    .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
    .join("\n")

  const prompt = existingSummary
    ? `Previous summary:\n${existingSummary}\n\nNew messages:\n${newMessages}\n\nUpdate the summary to include the new messages. Keep it under 500 words. Focus on: what the user wanted, what actions were taken, what information was found, any decisions or preferences expressed.`
    : `Conversation messages:\n${newMessages}\n\nSummarize this conversation in under 500 words. Focus on: what the user wanted, what actions were taken, what information was found, any decisions or preferences expressed.`

  const response = await getClient().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  })

  const summary = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  await aiRepository.updateConversation(conversationId, {
    summary,
    summaryUpdatedAt: new Date(),
  })

  log.info({ conversationId }, "Conversation summarized")
}

/**
 * Get the effective conversation history: summary + recent messages.
 * This replaces loading all messages when the conversation is long.
 */
export async function getEffectiveHistory(conversationId: string): Promise<{
  summary: string | null
  recentMessages: Awaited<ReturnType<typeof aiRepository.getMessages>>
}> {
  const conversation = await aiRepository.getConversation("*", conversationId)
  const recentMessages = await aiRepository.getMessages(conversationId, 20)

  return {
    summary: conversation?.summary ?? null,
    recentMessages,
  }
}
```

**Note:** The `aiRepository.getConversation` call with `"*"` as tenantId is a simplification — you'll need to add a method that gets by ID without tenant check (internal use only), or pass the actual tenantId through. Read the repository before implementing.

**Commit:** `feat(ai): add conversation summarizer with rolling summary generation`

---

## Task 5: Correction Memory Repository + Auto-Capture

**Files:**
- Create: `src/modules/ai/memory/corrections.ts`

```typescript
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
    toolName: string // tRPC procedure path, e.g., "booking.updateStatus"
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
```

**Integration with Phase B approval flow:** When an action is rejected in the approval flow (`resolveApprovalFromUI` with `approved: false`), automatically call `correctionsRepository.recordRejection()` with the action details. Wire this into `src/modules/ai/ai.approval.ts`.

**Commit:** `feat(ai): add correction memory repository with auto-capture on rejection`

---

## Task 6: Knowledge Base — Chunking + Embedding Pipeline

**Files:**
- Create: `src/modules/ai/knowledge/chunker.ts`
- Create: `src/modules/ai/knowledge/embedder.ts`
- Create: `src/modules/ai/knowledge/repository.ts`

### chunker.ts

```typescript
// src/modules/ai/knowledge/chunker.ts

const CHUNK_SIZE = 1000 // characters
const CHUNK_OVERLAP = 200 // characters overlap between chunks

/**
 * Split a document into overlapping chunks for embedding.
 * Tries to split on paragraph/sentence boundaries.
 */
export function chunkDocument(text: string, sourceName: string): Array<{ content: string; chunkIndex: number }> {
  const chunks: Array<{ content: string; chunkIndex: number }> = []
  let position = 0
  let chunkIndex = 0

  while (position < text.length) {
    let end = Math.min(position + CHUNK_SIZE, text.length)

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const breakPoints = ["\n\n", "\n", ". ", "! ", "? "]
      for (const bp of breakPoints) {
        const lastBreak = text.lastIndexOf(bp, end)
        if (lastBreak > position + CHUNK_SIZE / 2) {
          end = lastBreak + bp.length
          break
        }
      }
    }

    const content = text.slice(position, end).trim()
    if (content.length > 0) {
      chunks.push({ content, chunkIndex })
      chunkIndex++
    }

    position = end - CHUNK_OVERLAP
    if (position <= chunks.length > 0 ? end - CHUNK_SIZE : 0) {
      position = end // Prevent infinite loop
    }
  }

  return chunks
}
```

### embedder.ts

```typescript
// src/modules/ai/knowledge/embedder.ts

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.knowledge.embedder" })

// Note: Anthropic doesn't have an embedding model as of Phase D.
// Use a placeholder that stores null embeddings.
// When an embedding provider is available (OpenAI, Voyage, etc.), swap this.

/**
 * Generate embeddings for text chunks.
 * Currently returns null embeddings — RAG falls back to keyword search.
 * Replace with actual embedding call when provider is chosen.
 */
export async function embedChunks(chunks: string[]): Promise<(string | null)[]> {
  log.info({ chunkCount: chunks.length }, "Embedding chunks (placeholder — no provider configured)")
  // Return null for each chunk — keyword-based fallback will be used
  return chunks.map(() => null)
}

/**
 * Generate embedding for a query string.
 */
export async function embedQuery(query: string): Promise<string | null> {
  // Placeholder — no provider configured
  return null
}
```

### repository.ts

```typescript
// src/modules/ai/knowledge/repository.ts

import { db } from "@/shared/db"
import { aiKnowledgeChunks } from "@/shared/db/schema"
import { eq, and, sql, desc, ilike } from "drizzle-orm"
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
  /**
   * Ingest a document: chunk it, embed chunks, store in DB.
   */
  async ingestDocument(tenantId: string, sourceId: string, sourceName: string, text: string, metadata?: Record<string, unknown>): Promise<number> {
    // 1. Chunk the document
    const chunks = chunkDocument(text, sourceName)

    // 2. Generate embeddings (placeholder)
    const embeddings = await embedChunks(chunks.map((c) => c.content))

    // 3. Delete existing chunks for this source (re-ingest)
    await db.delete(aiKnowledgeChunks).where(
      and(eq(aiKnowledgeChunks.tenantId, tenantId), eq(aiKnowledgeChunks.sourceId, sourceId))
    )

    // 4. Insert new chunks
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(aiKnowledgeChunks).values({
        tenantId,
        sourceId,
        sourceName,
        content: chunks[i].content,
        chunkIndex: chunks[i].chunkIndex,
        embedding: embeddings[i],
        metadata: metadata ?? {},
      })
    }

    log.info({ tenantId, sourceId, chunks: chunks.length }, "Document ingested")
    return chunks.length
  },

  /**
   * Search knowledge base by keyword (fallback when no embeddings available).
   */
  async searchByKeyword(tenantId: string, query: string, limit = 5): Promise<KnowledgeChunkRecord[]> {
    // Simple keyword search using ILIKE
    const terms = query.split(/\s+/).filter((t) => t.length > 2).slice(0, 5)
    if (terms.length === 0) return []

    // Search for chunks containing any of the search terms
    const rows = await db
      .select()
      .from(aiKnowledgeChunks)
      .where(
        and(
          eq(aiKnowledgeChunks.tenantId, tenantId),
          sql`${aiKnowledgeChunks.content} ILIKE ${"%" + terms.join("% OR " + aiKnowledgeChunks.content + " ILIKE %") + "%"}`
        )
      )
      .limit(limit)

    // Fallback: if the SQL is too complex, use a simpler approach
    // This is a simplified version — adjust based on what Drizzle supports
    return rows.map(mapChunk)
  },

  /**
   * Delete all chunks for a source document.
   */
  async deleteSource(tenantId: string, sourceId: string): Promise<void> {
    await db.delete(aiKnowledgeChunks).where(
      and(eq(aiKnowledgeChunks.tenantId, tenantId), eq(aiKnowledgeChunks.sourceId, sourceId))
    )
    log.info({ tenantId, sourceId }, "Knowledge source deleted")
  },

  /**
   * List all sources for a tenant.
   */
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
```

**Commit:** `feat(ai): add knowledge base with document chunking, embedding pipeline, and repository`

---

## Task 7: RAG Retrieval Service

**Files:**
- Create: `src/modules/ai/knowledge/rag.ts`

```typescript
// src/modules/ai/knowledge/rag.ts

import { logger } from "@/shared/logger"
import { knowledgeRepository } from "./repository"
import type { RAGResult } from "../ai.types"

const log = logger.child({ module: "ai.knowledge.rag" })

const MAX_RAG_RESULTS = 3
const MAX_RAG_TOKENS = 2000 // Approximate token limit for RAG context

/**
 * Retrieve relevant knowledge chunks for a user query.
 * Currently uses keyword search. Will use vector similarity when embeddings are available.
 */
export async function retrieveContext(tenantId: string, query: string): Promise<RAGResult[]> {
  const chunks = await knowledgeRepository.searchByKeyword(tenantId, query, MAX_RAG_RESULTS)

  const results: RAGResult[] = chunks.map((chunk) => ({
    chunkId: chunk.id,
    content: chunk.content,
    sourceName: chunk.sourceName,
    similarity: 0.5, // Placeholder — no real similarity score for keyword search
  }))

  // Trim to stay within token budget (rough: 4 chars per token)
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

/**
 * Format RAG results for injection into the system prompt.
 */
export function formatRAGContext(results: RAGResult[]): string {
  if (results.length === 0) return ""

  const sections = results.map(
    (r) => `[From: ${r.sourceName}]\n${r.content}`
  )

  return `\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${sections.join("\n\n")}\n\nUse this context to inform your responses when relevant. Cite the source when using this information.`
}
```

**Commit:** `feat(ai): add RAG retrieval service with keyword search fallback`

---

## Task 8: Vertical Profiles

**Files:**
- Create: `src/modules/ai/verticals/index.ts`
- Create: `src/modules/ai/verticals/profiles.ts`

### profiles.ts

```typescript
// src/modules/ai/verticals/profiles.ts

import type { VerticalProfile } from "../ai.types"

export const VERTICAL_PROFILES: Record<string, VerticalProfile> = {
  bng_brokerage: {
    slug: "bng_brokerage",
    name: "BNG Credit Brokerage",
    description: "Biodiversity Net Gain credit trading and ecological services",
    terminology: {
      booking: "site assessment",
      customer: "landowner or developer",
      staff: "ecologist or compliance officer",
      service: "ecological survey or habitat assessment",
      payment: "credit transaction",
      invoice: "credit purchase invoice",
    },
    systemPromptAddendum: `You are assisting a BNG (Biodiversity Net Gain) credit brokerage. Key concepts:
- Sites produce biodiversity units (BDUs). Each has location, area, habitat type, and NE registration status.
- Deals match landowners (supply) with developers (demand) for biodiversity units.
- Compliance includes NE registration, HMMP plans, and S106 agreements.
- Catchments constrain which sites serve which developers.
When users say "booking", they mean "site assessment". "Customer" means "landowner" or "developer".`,
  },
  dental_practice: {
    slug: "dental_practice",
    name: "Dental Practice",
    description: "Dental clinic appointment and patient management",
    terminology: {
      booking: "appointment",
      customer: "patient",
      staff: "dentist or hygienist",
      service: "dental procedure",
    },
    systemPromptAddendum: `You are assisting a dental practice. Bookings are "appointments", customers are "patients", staff are "dentists" or "hygienists". Be mindful of patient confidentiality.`,
  },
  fitness_studio: {
    slug: "fitness_studio",
    name: "Fitness Studio",
    description: "Fitness class scheduling and member management",
    terminology: {
      booking: "class booking",
      customer: "member",
      staff: "trainer or instructor",
      service: "class or session",
    },
    systemPromptAddendum: `You are assisting a fitness studio. Bookings are "class bookings", customers are "members", staff are "trainers" or "instructors".`,
  },
  consulting_firm: {
    slug: "consulting_firm",
    name: "Consulting Firm",
    description: "Professional services engagement and project management",
    terminology: {
      booking: "engagement session",
      customer: "client",
      staff: "consultant or analyst",
      service: "advisory session",
    },
    systemPromptAddendum: `You are assisting a consulting firm. Bookings are "engagement sessions", customers are "clients", staff are "consultants".`,
  },
  beauty_salon: {
    slug: "beauty_salon",
    name: "Beauty Salon",
    description: "Beauty and wellness appointment management",
    terminology: {
      booking: "appointment",
      customer: "client",
      staff: "stylist or therapist",
      service: "treatment",
    },
    systemPromptAddendum: `You are assisting a beauty salon. Bookings are "appointments", customers are "clients", staff are "stylists" or "therapists".`,
  },
  generic: {
    slug: "generic",
    name: "Generic Business",
    description: "General multi-tenant business platform",
    terminology: {},
    systemPromptAddendum: "",
  },
}
```

### index.ts

```typescript
// src/modules/ai/verticals/index.ts

import { VERTICAL_PROFILES } from "./profiles"
import { aiConfigRepository } from "../ai.config.repository"
import type { VerticalProfile } from "../ai.types"

export { VERTICAL_PROFILES } from "./profiles"

/**
 * Get the vertical profile for a tenant.
 * Falls back to "generic" if no profile is set.
 */
export async function getVerticalProfile(tenantId: string): Promise<VerticalProfile> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  const slug = config.verticalProfile ?? "generic"
  return VERTICAL_PROFILES[slug] ?? VERTICAL_PROFILES.generic
}

/**
 * List available vertical profiles for tenant selection.
 */
export function listVerticalProfiles(): Array<{ slug: string; name: string; description: string }> {
  return Object.values(VERTICAL_PROFILES).map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
  }))
}
```

**Commit:** `feat(ai): add 6 vertical industry profiles with terminology mapping`

---

## Task 9: Dynamic System Prompt Assembly

**Files:**
- Modify: `src/modules/ai/ai.prompts.ts`

Replace the static system prompt with a dynamic assembler that combines:
1. Base prompt (existing)
2. Vertical profile context
3. Page context
4. Recent corrections for relevant tools
5. RAG context from knowledge base
6. Conversation summary (if available)

```typescript
// Updated ai.prompts.ts structure:

import { getVerticalProfile } from "./verticals"
import { correctionsRepository } from "./memory/corrections"
import { retrieveContext, formatRAGContext } from "./knowledge/rag"
import type { PageContext, CorrectionRecord, RAGResult } from "./ai.types"

const BASE_PROMPT = `You are an AI assistant for a multi-tenant business platform...` // existing base

export async function assembleSystemPrompt(params: {
  tenantId: string
  pageContext?: PageContext
  userMessage: string
  conversationSummary?: string | null
  // Note: No toolNames parameter — the module index is auto-generated from router
  // introspection and baked into the base prompt. Corrections are keyed by procedure
  // path (e.g., "booking.updateStatus"), not individual tool names.
}): Promise<string> {
  const parts: string[] = [BASE_PROMPT]

  // 1. Vertical profile
  const vertical = await getVerticalProfile(params.tenantId)
  if (vertical.systemPromptAddendum) {
    parts.push(vertical.systemPromptAddendum)
  }

  // 2. Page context
  if (params.pageContext) {
    parts.push(buildPageContextSection(params.pageContext))
  }

  // 3. Conversation summary
  if (params.conversationSummary) {
    parts.push(`\nCONVERSATION SUMMARY (earlier messages):\n${params.conversationSummary}`)
  }

  // 4. Recent corrections (keyed by tRPC procedure path, e.g., "booking.updateStatus")
  const corrections = await correctionsRepository.getAllRecentCorrections(params.tenantId, 5)
  if (corrections.length > 0) {
    const correctionText = corrections
      .map((c) => `- Procedure "${c.toolName}": Previously rejected. ${c.rejectionReason ?? "No reason given."}`)
      .join("\n")
    parts.push(`\nLEARNED CORRECTIONS (avoid these mistakes):\n${correctionText}`)
  }

  // 5. RAG context
  const ragResults = await retrieveContext(params.tenantId, params.userMessage)
  const ragText = formatRAGContext(ragResults)
  if (ragText) {
    parts.push(ragText)
  }

  return parts.join("\n\n")
}
```

**Commit:** `feat(ai): add dynamic system prompt assembly with memory, RAG, and vertical context`

---

## Task 10: Update AI Service to Use Memory Layers

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

Update `sendMessage` to:
1. Call `assembleSystemPrompt()` instead of `buildSystemPrompt()` — the new assembler includes memory, corrections, RAG, and vertical context. The module index (from router introspection) is already baked into the base prompt.
2. Use `getEffectiveHistory()` instead of `getMessages()` directly (summary + recent)
3. After each response, call `maybeSummarize()` to trigger rolling summarization
4. Update hot memory with recent code execution results after each turn

Read the current service code before modifying.

**Commit:** `feat(ai): integrate memory layers, RAG, and summarization into agent service`

---

## Task 11: Router Procedures + Schemas

**Files:**
- Modify: `src/modules/ai/ai.schemas.ts`
- Modify: `src/modules/ai/ai.router.ts`
- Modify: `src/modules/ai/index.ts`

### New schemas:

```typescript
export const ingestDocumentSchema = z.object({
  sourceId: z.string().min(1),
  sourceName: z.string().min(1),
  content: z.string().min(1).max(500000), // 500KB max
})

export const deleteDocumentSchema = z.object({
  sourceId: z.string(),
})

export const listKnowledgeSourcesSchema = z.object({})

export const setVerticalProfileSchema = z.object({
  verticalSlug: z.string(),
})

export const listVerticalProfilesSchema = z.object({})
```

### New router procedures:

```typescript
ingestDocument: modulePermission("ai:write")
  .input(ingestDocumentSchema)
  .mutation(async ({ ctx, input }) => {
    const chunks = await knowledgeRepository.ingestDocument(
      ctx.tenantId, input.sourceId, input.sourceName, input.content
    )
    return { chunksCreated: chunks }
  }),

deleteDocument: modulePermission("ai:write")
  .input(deleteDocumentSchema)
  .mutation(async ({ ctx, input }) => {
    await knowledgeRepository.deleteSource(ctx.tenantId, input.sourceId)
    return { success: true }
  }),

listKnowledgeSources: moduleProcedure
  .input(listKnowledgeSourcesSchema)
  .query(({ ctx }) => knowledgeRepository.listSources(ctx.tenantId)),

setVerticalProfile: modulePermission("ai:write")
  .input(setVerticalProfileSchema)
  .mutation(async ({ ctx, input }) => {
    await aiConfigRepository.update(ctx.tenantId, { verticalProfile: input.verticalSlug })
    return { success: true }
  }),

listVerticalProfiles: moduleProcedure
  .input(listVerticalProfilesSchema)
  .query(() => ({ profiles: listVerticalProfiles() })),
```

**Commit:** `feat(ai): add knowledge base and vertical profile management router procedures`

---

## Task 12: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai-phase-d.test.ts`

Test:
1. **Document chunking**: Various document sizes, overlap, boundary detection
2. **Knowledge repository**: Ingest, search by keyword, delete, list sources
3. **Corrections repository**: Record rejection, get recent corrections, tenant scoping
4. **Hot memory**: Set/get/clear session context
5. **Conversation summarizer**: Mock Anthropic (Haiku), verify summary generation
6. **Vertical profiles**: Get by slug, fallback to generic, list all profiles
7. **System prompt assembly**: Verify all sections are included when data exists
8. **RAG retrieval**: Search returns relevant chunks, respects token budget

**Commit:** `test(ai): add Phase D tests for memory, knowledge base, RAG, and vertical profiles`

---

## Task 13: Verification — tsc + build + tests

Run:
1. `npx tsc --noEmit` — fix any type errors
2. `npm run build` — fix any build errors
3. `npm run test` — all tests must pass

Fix any issues. Commit with: `fix(ai): resolve Phase D verification issues`

---

## Post-Implementation Checklist

```
[ ] ai_corrections table created with tenant+tool index
[ ] ai_knowledge_chunks table created with tenant index
[ ] verticalProfile + conversationSummary fields added to existing tables
[ ] Redis hot memory layer working for session context
[ ] Rolling conversation summarization triggers after 10 messages
[ ] Correction memory auto-captures on Phase B rejections
[ ] Document ingestion pipeline: chunk → embed (placeholder) → store
[ ] RAG retrieval returns relevant knowledge chunks
[ ] 6 vertical profiles defined with terminology mapping
[ ] Dynamic system prompt assembly includes all context layers
[ ] Knowledge base CRUD router procedures working
[ ] All tests pass
[ ] tsc + build pass
```
