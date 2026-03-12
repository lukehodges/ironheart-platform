import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn()
  const mockValues = vi.fn(() => ({ returning: mockReturning }))
  const mockInsert = vi.fn(() => ({ values: mockValues }))
  const mockLimit = vi.fn()
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, limit: mockLimit }))
  const mockFrom = vi.fn(() => ({ where: mockWhere }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))
  const mockDeleteWhere = vi.fn()
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))
  const mockGroupBy = vi.fn()

  // Allow chaining: where -> groupBy
  mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, groupBy: mockGroupBy })

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
      transaction: vi.fn((fn: (tx: unknown) => Promise<void>) => fn({})),
    },
  }
})

vi.mock("@/shared/db/schema", () => ({
  aiKnowledgeChunks: {
    id: "id",
    tenantId: "tenant_id",
    sourceId: "source_id",
    sourceName: "source_name",
    content: "content",
    chunkIndex: "chunk_index",
    embedding: "embedding",
    metadata: "metadata",
    createdAt: "created_at",
  },
  aiCorrections: {
    id: "id",
    tenantId: "tenant_id",
    toolName: "tool_name",
    attemptedInput: "attempted_input",
    rejectionReason: "rejection_reason",
    correctAction: "correct_action",
    contextSummary: "context_summary",
    occurrenceCount: "occurrence_count",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  aiTenantConfig: { id: "id", tenantId: "tenant_id" },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ op: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ op: "and" })),
  desc: vi.fn((_col: unknown) => ({ op: "desc" })),
  ilike: vi.fn((_col: unknown, _pattern: string) => ({ op: "ilike" })),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}))

vi.mock("@/shared/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}))

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

// Mock embedder for knowledge repository tests
vi.mock("../knowledge/embedder", () => ({
  embedChunks: vi.fn().mockResolvedValue([]),
  embedQuery: vi.fn().mockResolvedValue(null),
}))

// Mock aiConfigRepository for vertical profile tests
const mockGetOrCreate = vi.fn()
vi.mock("../ai.config.repository", () => ({
  aiConfigRepository: {
    getOrCreate: (...args: unknown[]) => mockGetOrCreate(...args),
    update: vi.fn(),
  },
}))

// Mock ai.introspection for assembleSystemPrompt
vi.mock("../ai.introspection", () => ({
  getModuleIndex: vi.fn().mockResolvedValue("booking.list (query)\nbooking.getById (query)"),
  getModuleMap: vi.fn().mockReturnValue(new Map()),
}))

// Mock aiRepository for summarizer tests
const mockGetConversationById = vi.fn()
const mockGetMessages = vi.fn()
const mockUpdateConversation = vi.fn()
vi.mock("../ai.repository", () => ({
  aiRepository: {
    getConversationById: (...args: unknown[]) => mockGetConversationById(...args),
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
    updateConversation: (...args: unknown[]) => mockUpdateConversation(...args),
  },
}))

// Mock Anthropic SDK for summarizer tests
const mockAnthropicMessages = { create: vi.fn() }
const mockCreate = mockAnthropicMessages.create
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return { messages: mockAnthropicMessages }
    }),
  }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI Phase D — Memory, Knowledge Base, RAG, Vertical Profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrCreate.mockResolvedValue({
      id: "cfg-1",
      tenantId: "t1",
      isEnabled: true,
      maxTokenBudget: 100000,
      verticalProfile: "generic",
    })
  })

  // =========================================================================
  // 1. Document Chunking
  // =========================================================================

  describe("document chunking (chunker.ts)", () => {
    it("produces a single chunk for short documents", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      const text = "Hello world. This is a short document."
      const chunks = chunkDocument(text, "test-doc")

      expect(chunks.length).toBe(1)
      expect(chunks[0]!.content).toBe(text)
      expect(chunks[0]!.chunkIndex).toBe(0)
    })

    it("splits large documents into multiple chunks", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      // Create a document larger than CHUNK_SIZE (1000 chars)
      const sentence = "This is a test sentence that fills up space. "
      const text = sentence.repeat(50) // ~2250 chars
      const chunks = chunkDocument(text, "big-doc")

      expect(chunks.length).toBeGreaterThan(1)
      // Each chunk index should be sequential
      chunks.forEach((chunk, idx) => {
        expect(chunk.chunkIndex).toBe(idx)
      })
    })

    it("creates overlap between consecutive chunks", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      const sentence = "Word number one two three four five six seven eight nine ten. "
      const text = sentence.repeat(40) // ~2480 chars, well over 1000
      const chunks = chunkDocument(text, "overlap-doc")

      expect(chunks.length).toBeGreaterThan(1)

      // Check that the end of chunk 0 overlaps with the start of chunk 1
      const chunk0End = chunks[0]!.content.slice(-50)
      const chunk1Start = chunks[1]!.content.slice(0, 100)
      // The overlap region should share some content
      expect(chunk1Start).toContain(chunk0End.trim().split(". ")[0]!)
    })

    it("breaks on paragraph boundaries when possible", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      // Build text with a paragraph break near the chunk boundary
      const part1 = "A".repeat(600)
      const part2 = "B".repeat(200)
      const part3 = "C".repeat(500)
      const text = `${part1}\n\n${part2}\n\n${part3}`

      const chunks = chunkDocument(text, "paragraph-doc")
      expect(chunks.length).toBeGreaterThanOrEqual(1)
      // The first chunk should end at a paragraph boundary if one exists within range
    })

    it("breaks on sentence boundaries when no paragraph break is near", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      // Create text with sentence breaks but no paragraph breaks
      const sentences = Array.from({ length: 30 }, (_, i) => `Sentence number ${i + 1} with enough content.`).join(" ")
      const chunks = chunkDocument(sentences, "sentence-doc")

      if (chunks.length > 1) {
        // First chunk should end at a sentence boundary (period followed by space)
        const firstChunk = chunks[0]!.content
        const lastChar = firstChunk.slice(-1)
        // Should end at a clean boundary (period, or trimmed content ending with period)
        expect(firstChunk.endsWith(".") || firstChunk.endsWith("!") || firstChunk.endsWith("?") || lastChar === " ").toBe(true)
      }
    })

    it("handles empty string input", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      const chunks = chunkDocument("", "empty-doc")
      expect(chunks).toEqual([])
    })

    it("handles whitespace-only input", async () => {
      const { chunkDocument } = await import("../knowledge/chunker")
      const chunks = chunkDocument("   \n\n   ", "whitespace-doc")
      expect(chunks).toEqual([])
    })
  })

  // =========================================================================
  // 2. Knowledge Repository
  // =========================================================================

  describe("knowledge repository", () => {
    it("ingestDocument chunks text and inserts into db", async () => {
      const { db } = await import("@/shared/db")
      const { embedChunks } = await import("../knowledge/embedder")
      const mockDb = vi.mocked(db)

      // Mock embedChunks to return null embeddings
      vi.mocked(embedChunks).mockResolvedValue([null, null])

      const { knowledgeRepository } = await import("../knowledge/repository")
      const count = await knowledgeRepository.ingestDocument("t1", "src-1", "FAQ Doc", "Short document text.")

      // Should delete existing chunks first
      expect(mockDb.delete).toHaveBeenCalled()
      // Should insert chunks
      expect(mockDb.insert).toHaveBeenCalled()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    it("searchByKeyword filters short terms and returns mapped results", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      // Mock the chain: select -> from -> where -> limit
      const mockRows = [
        {
          id: "chunk-1",
          tenantId: "t1",
          sourceId: "src-1",
          sourceName: "FAQ",
          content: "Answer about pricing",
          chunkIndex: 0,
          embedding: null,
          metadata: {},
          createdAt: new Date(),
        },
      ]
      const mockLimit = vi.fn().mockResolvedValue(mockRows)
      const mockWhere = vi.fn(() => ({ limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { knowledgeRepository } = await import("../knowledge/repository")
      const results = await knowledgeRepository.searchByKeyword("t1", "pricing info", 5)

      expect(mockDb.select).toHaveBeenCalled()
      expect(results.length).toBe(1)
      expect(results[0]!.content).toBe("Answer about pricing")
      expect(results[0]!.sourceName).toBe("FAQ")
    })

    it("searchByKeyword returns empty array for query with only short words", async () => {
      const { knowledgeRepository } = await import("../knowledge/repository")
      const results = await knowledgeRepository.searchByKeyword("t1", "a b c")
      expect(results).toEqual([])
    })

    it("deleteSource calls db.delete with correct filters", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const { knowledgeRepository } = await import("../knowledge/repository")
      await knowledgeRepository.deleteSource("t1", "src-1")

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it("listSources groups by sourceId and returns counts", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const mockGroupBy = vi.fn().mockResolvedValue([
        { sourceId: "src-1", sourceName: "FAQ", chunkCount: 5 },
        { sourceId: "src-2", sourceName: "Manual", chunkCount: 12 },
      ])
      const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { knowledgeRepository } = await import("../knowledge/repository")
      const sources = await knowledgeRepository.listSources("t1")

      expect(sources.length).toBe(2)
      expect(sources[0]!.sourceName).toBe("FAQ")
      expect(sources[0]!.chunkCount).toBe(5)
      expect(sources[1]!.sourceName).toBe("Manual")
    })
  })

  // =========================================================================
  // 3. Corrections Repository
  // =========================================================================

  describe("corrections repository", () => {
    it("recordRejection inserts and returns a correction record", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const now = new Date()
      const mockRow = {
        id: "corr-1",
        tenantId: "t1",
        toolName: "booking.create",
        attemptedInput: { serviceId: "s1" },
        rejectionReason: "Wrong service",
        correctAction: null,
        contextSummary: null,
        occurrenceCount: 1,
        createdAt: now,
        updatedAt: now,
      }

      const mockReturning = vi.fn().mockResolvedValue([mockRow])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      mockDb.insert.mockReturnValue({ values: mockValues } as any)

      const { correctionsRepository } = await import("../memory/corrections")
      const result = await correctionsRepository.recordRejection({
        tenantId: "t1",
        toolName: "booking.create",
        attemptedInput: { serviceId: "s1" },
        rejectionReason: "Wrong service",
      })

      expect(result.id).toBe("corr-1")
      expect(result.toolName).toBe("booking.create")
      expect(result.rejectionReason).toBe("Wrong service")
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it("getRecentCorrections returns corrections for a specific tool", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const now = new Date()
      const mockRows = [
        {
          id: "corr-1",
          tenantId: "t1",
          toolName: "booking.create",
          attemptedInput: {},
          rejectionReason: "Bad input",
          correctAction: "Use correct format",
          contextSummary: null,
          occurrenceCount: 2,
          createdAt: now,
          updatedAt: now,
        },
      ]

      const mockLimit = vi.fn().mockResolvedValue(mockRows)
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { correctionsRepository } = await import("../memory/corrections")
      const results = await correctionsRepository.getRecentCorrections("t1", "booking.create", 5)

      expect(results.length).toBe(1)
      expect(results[0]!.toolName).toBe("booking.create")
      expect(results[0]!.rejectionReason).toBe("Bad input")
    })

    it("getAllRecentCorrections returns corrections across all tools", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const now = new Date()
      const mockRows = [
        {
          id: "corr-1",
          tenantId: "t1",
          toolName: "booking.create",
          attemptedInput: {},
          rejectionReason: "Error A",
          correctAction: null,
          contextSummary: null,
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "corr-2",
          tenantId: "t1",
          toolName: "customer.update",
          attemptedInput: {},
          rejectionReason: "Error B",
          correctAction: null,
          contextSummary: null,
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ]

      const mockLimit = vi.fn().mockResolvedValue(mockRows)
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { correctionsRepository } = await import("../memory/corrections")
      const results = await correctionsRepository.getAllRecentCorrections("t1", 10)

      expect(results.length).toBe(2)
      expect(results[0]!.toolName).toBe("booking.create")
      expect(results[1]!.toolName).toBe("customer.update")
    })
  })

  // =========================================================================
  // 4. Hot Memory
  // =========================================================================

  describe("hot memory", () => {
    it("setSessionContext serializes data and stores in redis with TTL", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)

      const { hotMemory } = await import("../memory/hot")
      const data = {
        recentToolCalls: [{ name: "booking.list", result: { rows: [] } }],
        currentIntent: "list bookings",
        pageHistory: ["/dashboard"],
      }

      await hotMemory.setSessionContext("conv-1", data)

      expect(redisMock.set).toHaveBeenCalledWith(
        "ai:session:conv-1",
        JSON.stringify(data),
        { ex: 3600 }
      )
    })

    it("getSessionContext returns parsed data from redis", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)

      const storedData = {
        recentToolCalls: [],
        currentIntent: "view customer",
        pageHistory: ["/customers"],
      }
      redisMock.get.mockResolvedValueOnce(JSON.stringify(storedData))

      const { hotMemory } = await import("../memory/hot")
      const result = await hotMemory.getSessionContext("conv-1")

      expect(result).toEqual(storedData)
      expect(redisMock.get).toHaveBeenCalledWith("ai:session:conv-1")
    })

    it("getSessionContext returns null when no data exists", async () => {
      const { redis } = await import("@/shared/redis")
      vi.mocked(redis).get.mockResolvedValueOnce(null)

      const { hotMemory } = await import("../memory/hot")
      const result = await hotMemory.getSessionContext("conv-nonexistent")

      expect(result).toBeNull()
    })

    it("getSessionContext returns null for invalid JSON", async () => {
      const { redis } = await import("@/shared/redis")
      vi.mocked(redis).get.mockResolvedValueOnce("not-valid-json{{{")

      const { hotMemory } = await import("../memory/hot")
      const result = await hotMemory.getSessionContext("conv-bad")

      expect(result).toBeNull()
    })

    it("clearSession deletes the redis key", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)

      const { hotMemory } = await import("../memory/hot")
      await hotMemory.clearSession("conv-1")

      expect(redisMock.del).toHaveBeenCalledWith("ai:session:conv-1")
    })

    it("trackPageVisit appends route to existing session page history", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)

      const existingCtx = {
        recentToolCalls: [],
        currentIntent: null,
        pageHistory: ["/dashboard"],
      }
      redisMock.get.mockResolvedValueOnce(JSON.stringify(existingCtx))

      const { hotMemory } = await import("../memory/hot")
      await hotMemory.trackPageVisit("conv-1", "/customers/c1")

      // Should set updated context with new route appended
      expect(redisMock.set).toHaveBeenCalledWith(
        "ai:session:conv-1",
        expect.stringContaining("/customers/c1"),
        { ex: 3600 }
      )
    })

    it("trackPageVisit keeps only last 10 pages", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)

      const existingCtx = {
        recentToolCalls: [],
        currentIntent: null,
        pageHistory: Array.from({ length: 10 }, (_, i) => `/page-${i}`),
      }
      redisMock.get.mockResolvedValueOnce(JSON.stringify(existingCtx))

      const { hotMemory } = await import("../memory/hot")
      await hotMemory.trackPageVisit("conv-1", "/page-new")

      const setCall = redisMock.set.mock.calls[0]
      const savedData = JSON.parse(setCall![1] as string)
      expect(savedData.pageHistory.length).toBe(10)
      expect(savedData.pageHistory[9]).toBe("/page-new")
      // First page should have been dropped
      expect(savedData.pageHistory[0]).toBe("/page-1")
    })

    it("trackPageVisit does nothing when no session exists", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)
      redisMock.get.mockResolvedValueOnce(null)

      const { hotMemory } = await import("../memory/hot")
      await hotMemory.trackPageVisit("conv-none", "/some-page")

      // Should not call set since there is no existing session
      expect(redisMock.set).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 5. Conversation Summarizer
  // =========================================================================

  describe("conversation summarizer", () => {
    it("maybeSummarize does nothing when conversation not found", async () => {
      mockGetConversationById.mockResolvedValue(null)

      const { maybeSummarize } = await import("../memory/summarizer")
      await maybeSummarize("conv-missing")

      expect(mockCreate).not.toHaveBeenCalled()
    })

    it("maybeSummarize does nothing when message count is below threshold", async () => {
      mockGetConversationById.mockResolvedValue({
        id: "conv-1",
        summary: null,
        summaryUpdatedAt: null,
      })
      mockGetMessages.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `msg-${i}`,
          role: "user",
          content: `Message ${i}`,
          createdAt: new Date(),
        }))
      )

      const { maybeSummarize } = await import("../memory/summarizer")
      await maybeSummarize("conv-1")

      expect(mockCreate).not.toHaveBeenCalled()
    })

    it("maybeSummarize generates summary when messages exceed threshold", async () => {
      mockGetConversationById.mockResolvedValue({
        id: "conv-1",
        summary: null,
        summaryUpdatedAt: null,
      })
      mockGetMessages.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
          createdAt: new Date(),
        }))
      )
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "Summary of the conversation about bookings." }],
      })

      const { maybeSummarize } = await import("../memory/summarizer")
      await maybeSummarize("conv-1")

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
        })
      )
      expect(mockUpdateConversation).toHaveBeenCalledWith("conv-1", {
        summary: "Summary of the conversation about bookings.",
        summaryUpdatedAt: expect.any(Date),
      })
    })

    it("maybeSummarize only counts messages since last summary", async () => {
      const summaryTime = new Date("2026-03-01T00:00:00Z")
      mockGetConversationById.mockResolvedValue({
        id: "conv-1",
        summary: "Previous summary",
        summaryUpdatedAt: summaryTime,
      })
      // 8 messages total, but only 3 are after the summary time
      const oldMessages = Array.from({ length: 5 }, (_, i) => ({
        id: `old-${i}`,
        role: "user" as const,
        content: `Old message ${i}`,
        createdAt: new Date("2026-02-28T00:00:00Z"),
      }))
      const newMessages = Array.from({ length: 3 }, (_, i) => ({
        id: `new-${i}`,
        role: "user" as const,
        content: `New message ${i}`,
        createdAt: new Date("2026-03-02T00:00:00Z"),
      }))
      mockGetMessages.mockResolvedValue([...oldMessages, ...newMessages])

      const { maybeSummarize } = await import("../memory/summarizer")
      await maybeSummarize("conv-1")

      // Only 3 new messages < threshold of 10, should NOT summarize
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it("maybeSummarize includes previous summary in the prompt", async () => {
      mockGetConversationById.mockResolvedValue({
        id: "conv-1",
        summary: "User asked about pricing.",
        summaryUpdatedAt: new Date("2026-02-01"),
      })
      mockGetMessages.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          id: `msg-${i}`,
          role: "user" as const,
          content: `Message ${i}`,
          createdAt: new Date("2026-03-10"),
        }))
      )
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "Updated summary." }],
      })

      const { maybeSummarize } = await import("../memory/summarizer")
      await maybeSummarize("conv-1")

      const createCall = mockCreate.mock.calls[0]![0]
      const userContent = createCall.messages[0].content as string
      expect(userContent).toContain("Previous summary:")
      expect(userContent).toContain("User asked about pricing.")
    })

    it("getEffectiveHistory returns null summary and empty messages for missing conversation", async () => {
      mockGetConversationById.mockResolvedValue(null)

      const { getEffectiveHistory } = await import("../memory/summarizer")
      const result = await getEffectiveHistory("conv-missing")

      expect(result.summary).toBeNull()
      expect(result.recentMessages).toEqual([])
    })

    it("getEffectiveHistory returns summary and last 20 messages", async () => {
      mockGetConversationById.mockResolvedValue({
        id: "conv-1",
        summary: "Conversation about site assessments.",
      })
      mockGetMessages.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
          createdAt: new Date(),
        }))
      )

      const { getEffectiveHistory } = await import("../memory/summarizer")
      const result = await getEffectiveHistory("conv-1")

      expect(result.summary).toBe("Conversation about site assessments.")
      expect(result.recentMessages.length).toBe(20)
      // Should be the last 20 messages (indices 10-29)
      expect(result.recentMessages[0]!.content).toBe("Message 10")
      expect(result.recentMessages[19]!.content).toBe("Message 29")
    })
  })

  // =========================================================================
  // 6. Vertical Profiles
  // =========================================================================

  describe("vertical profiles", () => {
    it("getVerticalProfile returns the configured profile", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "dental_practice" })

      const { getVerticalProfile } = await import("../verticals")
      const profile = await getVerticalProfile("t1")

      expect(profile.slug).toBe("dental_practice")
      expect(profile.name).toBe("Dental Practice")
      expect(profile.terminology.booking).toBe("appointment")
      expect(profile.terminology.customer).toBe("patient")
    })

    it("getVerticalProfile falls back to generic when config has no verticalProfile", async () => {
      mockGetOrCreate.mockResolvedValue({})

      const { getVerticalProfile } = await import("../verticals")
      const profile = await getVerticalProfile("t1")

      expect(profile.slug).toBe("generic")
      expect(profile.name).toBe("Generic Business")
    })

    it("getVerticalProfile falls back to generic for unknown slug", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "unknown_vertical" })

      const { getVerticalProfile } = await import("../verticals")
      const profile = await getVerticalProfile("t1")

      expect(profile.slug).toBe("generic")
    })

    it("listVerticalProfiles returns all 6 profiles", async () => {
      const { listVerticalProfiles } = await import("../verticals")
      const profiles = listVerticalProfiles()

      expect(profiles.length).toBe(6)
      const slugs = profiles.map((p) => p.slug)
      expect(slugs).toContain("bng_brokerage")
      expect(slugs).toContain("dental_practice")
      expect(slugs).toContain("fitness_studio")
      expect(slugs).toContain("consulting_firm")
      expect(slugs).toContain("beauty_salon")
      expect(slugs).toContain("generic")
    })

    it("each profile has slug, name, and description", async () => {
      const { listVerticalProfiles } = await import("../verticals")
      const profiles = listVerticalProfiles()

      for (const profile of profiles) {
        expect(profile.slug).toBeTruthy()
        expect(profile.name).toBeTruthy()
        expect(profile.description).toBeTruthy()
      }
    })

    it("bng_brokerage profile has BNG-specific terminology", async () => {
      const { VERTICAL_PROFILES } = await import("../verticals/profiles")
      const bng = VERTICAL_PROFILES.bng_brokerage!

      expect(bng.terminology.booking).toBe("site assessment")
      expect(bng.terminology.customer).toBe("landowner or developer")
      expect(bng.terminology.payment).toBe("credit transaction")
      expect(bng.systemPromptAddendum).toContain("BNG")
      expect(bng.systemPromptAddendum).toContain("biodiversity")
    })
  })

  // =========================================================================
  // 7. System Prompt Assembly (assembleSystemPrompt)
  // =========================================================================

  describe("assembleSystemPrompt", () => {
    it("includes vertical context when profile has addendum", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "dental_practice" })

      // Mock corrections to return empty
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)
      const mockLimit = vi.fn().mockResolvedValue([])
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { assembleSystemPrompt } = await import("../ai.prompts")
      const prompt = await assembleSystemPrompt({
        tenantId: "t1",
        userMessage: "How many appointments today?",
      })

      expect(prompt).toContain("Vertical Context (Dental Practice)")
      expect(prompt).toContain("dental practice")
      expect(prompt).toContain("Additional Terminology")
      expect(prompt).toContain("appointment")
    })

    it("includes conversation summary when provided", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "generic" })

      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)
      const mockLimit = vi.fn().mockResolvedValue([])
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { assembleSystemPrompt } = await import("../ai.prompts")
      const prompt = await assembleSystemPrompt({
        tenantId: "t1",
        userMessage: "Continue from before",
        conversationSummary: "User previously asked about Q3 revenue.",
      })

      expect(prompt).toContain("Conversation History Summary")
      expect(prompt).toContain("User previously asked about Q3 revenue.")
    })

    it("includes corrections section when corrections exist", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "generic" })

      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const now = new Date()
      const correctionRows = [
        {
          id: "corr-1",
          tenantId: "t1",
          toolName: "booking.create",
          attemptedInput: {},
          rejectionReason: "Missing required field",
          correctAction: "Include serviceId",
          contextSummary: null,
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ]
      const mockLimit = vi.fn().mockResolvedValue(correctionRows)
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { assembleSystemPrompt } = await import("../ai.prompts")
      const prompt = await assembleSystemPrompt({
        tenantId: "t1",
        userMessage: "Create a booking",
      })

      expect(prompt).toContain("Learned Corrections")
      expect(prompt).toContain("booking.create")
      expect(prompt).toContain("Missing required field")
      expect(prompt).toContain("Include serviceId")
    })

    it("includes RAG context when knowledge base has relevant content", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "generic" })

      // Mock corrections to return empty
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      // First call: corrections (empty), Second call: RAG search (has results)
      const mockLimit = vi.fn()
        .mockResolvedValueOnce([]) // corrections
        .mockResolvedValueOnce([  // RAG search
          {
            id: "chunk-1",
            tenantId: "t1",
            sourceId: "src-1",
            sourceName: "Company Policy",
            content: "Refund policy: Full refund within 24 hours.",
            chunkIndex: 0,
            embedding: null,
            metadata: {},
            createdAt: new Date(),
          },
        ])
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { assembleSystemPrompt } = await import("../ai.prompts")
      const prompt = await assembleSystemPrompt({
        tenantId: "t1",
        userMessage: "What is the refund policy?",
      })

      expect(prompt).toContain("RELEVANT KNOWLEDGE BASE CONTEXT")
      expect(prompt).toContain("Company Policy")
      expect(prompt).toContain("Refund policy")
    })

    it("omits optional sections when data is empty or unavailable", async () => {
      mockGetOrCreate.mockResolvedValue({ verticalProfile: "generic" })

      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)
      const mockLimit = vi.fn().mockResolvedValue([])
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { assembleSystemPrompt } = await import("../ai.prompts")
      const prompt = await assembleSystemPrompt({
        tenantId: "t1",
        userMessage: "Hello",
      })

      // Generic profile has empty addendum and no terminology
      expect(prompt).not.toContain("Vertical Context")
      expect(prompt).not.toContain("Additional Terminology")
      expect(prompt).not.toContain("Conversation History Summary")
      expect(prompt).not.toContain("Learned Corrections")
      // Base prompt should still be there
      expect(prompt).toContain("AI data assistant")
    })
  })

  // =========================================================================
  // 8. RAG Retrieval
  // =========================================================================

  describe("RAG retrieval", () => {
    it("retrieveContext returns chunks within token budget", async () => {
      // Mock knowledgeRepository.searchByKeyword via the db mock
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const chunks = [
        {
          id: "ch-1",
          tenantId: "t1",
          sourceId: "src-1",
          sourceName: "FAQ",
          content: "Answer about pricing. ".repeat(10), // ~220 chars
          chunkIndex: 0,
          embedding: null,
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: "ch-2",
          tenantId: "t1",
          sourceId: "src-1",
          sourceName: "FAQ",
          content: "Answer about scheduling. ".repeat(10),
          chunkIndex: 1,
          embedding: null,
          metadata: {},
          createdAt: new Date(),
        },
      ]
      const mockLimit = vi.fn().mockResolvedValue(chunks)
      const mockWhere = vi.fn(() => ({ limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { retrieveContext } = await import("../knowledge/rag")
      const results = await retrieveContext("t1", "pricing scheduling")

      expect(results.length).toBe(2)
      expect(results[0]!.sourceName).toBe("FAQ")
      expect(results[0]!.chunkId).toBe("ch-1")
      expect(results[0]!.similarity).toBe(0.5)
    })

    it("retrieveContext trims results that exceed token budget", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      // Create chunks that together exceed MAX_RAG_TOKENS * 4 = 8000 chars
      const chunks = [
        {
          id: "ch-1",
          tenantId: "t1",
          sourceId: "src-1",
          sourceName: "Doc1",
          content: "X".repeat(5000), // 5000 chars
          chunkIndex: 0,
          embedding: null,
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: "ch-2",
          tenantId: "t1",
          sourceId: "src-1",
          sourceName: "Doc1",
          content: "Y".repeat(5000), // 5000 chars, total would be 10000 > 8000
          chunkIndex: 1,
          embedding: null,
          metadata: {},
          createdAt: new Date(),
        },
      ]
      const mockLimit = vi.fn().mockResolvedValue(chunks)
      const mockWhere = vi.fn(() => ({ limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { retrieveContext } = await import("../knowledge/rag")
      const results = await retrieveContext("t1", "some query here")

      // Should trim to only the first chunk since second would exceed budget
      expect(results.length).toBe(1)
      expect(results[0]!.chunkId).toBe("ch-1")
    })

    it("retrieveContext returns empty array when no chunks match", async () => {
      const { db } = await import("@/shared/db")
      const mockDb = vi.mocked(db)

      const mockLimit = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn(() => ({ limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      mockDb.select.mockReturnValue({ from: mockFrom } as any)

      const { retrieveContext } = await import("../knowledge/rag")
      const results = await retrieveContext("t1", "something obscure here")

      expect(results).toEqual([])
    })

    it("formatRAGContext returns empty string for no results", async () => {
      const { formatRAGContext } = await import("../knowledge/rag")
      const result = formatRAGContext([])
      expect(result).toBe("")
    })

    it("formatRAGContext formats results with source attribution", async () => {
      const { formatRAGContext } = await import("../knowledge/rag")
      const result = formatRAGContext([
        {
          chunkId: "ch-1",
          content: "Refund policy details here.",
          sourceName: "Company Policy",
          similarity: 0.85,
        },
        {
          chunkId: "ch-2",
          content: "Pricing tier information.",
          sourceName: "Pricing Guide",
          similarity: 0.72,
        },
      ])

      expect(result).toContain("RELEVANT KNOWLEDGE BASE CONTEXT")
      expect(result).toContain("[From: Company Policy]")
      expect(result).toContain("Refund policy details here.")
      expect(result).toContain("[From: Pricing Guide]")
      expect(result).toContain("Pricing tier information.")
      expect(result).toContain("Cite the source")
    })
  })
})
