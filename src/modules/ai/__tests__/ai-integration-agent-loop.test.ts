import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Mocks ---
// Mock the Anthropic SDK
const mockCreate = vi.fn()
const mockStream = vi.fn()

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => mockCreate(...args),
      stream: (...args: unknown[]) => mockStream(...args),
    }
  }
  return { default: MockAnthropic }
})

// Mock DB
vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn()
  const mockValues = vi.fn(() => ({ returning: mockReturning }))
  const mockInsert = vi.fn(() => ({ values: mockValues }))
  const mockLimit = vi.fn()
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, limit: mockLimit }))
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))
  const mockUpdateSet = vi.fn(() => ({ where: vi.fn() }))
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      transaction: vi.fn((fn: (tx: unknown) => Promise<void>) => fn({})),
    },
  }
})

vi.mock("@/shared/db/schema", () => ({
  aiConversations: { id: "id", tenantId: "tenant_id", userId: "user_id", updatedAt: "updated_at" },
  aiMessages: { id: "id", conversationId: "conversation_id", createdAt: "created_at" },
  aiTenantConfig: { id: "id", tenantId: "tenant_id" },
  agentActions: { id: "id", conversationId: "conversation_id", tenantId: "tenant_id", status: "status", createdAt: "created_at" },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ op: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ op: "and" })),
  desc: vi.fn((_col: unknown) => ({ op: "desc" })),
  sql: vi.fn(),
}))

vi.mock("@/shared/redis", () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
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

// Mock aiRepository
const mockCreateConversation = vi.fn()
const mockGetConversation = vi.fn()
const mockAddMessage = vi.fn()
const mockUpdateConversation = vi.fn()

vi.mock("../ai.repository", () => ({
  aiRepository: {
    createConversation: (...args: unknown[]) => mockCreateConversation(...args),
    getConversation: (...args: unknown[]) => mockGetConversation(...args),
    addMessage: (...args: unknown[]) => mockAddMessage(...args),
    updateConversation: (...args: unknown[]) => mockUpdateConversation(...args),
    getMessages: vi.fn().mockResolvedValue([]),
    getConversationById: vi.fn(),
    listConversations: vi.fn(),
  },
}))

// Mock memory/summarizer
vi.mock("../memory/summarizer", () => ({
  getEffectiveHistory: vi.fn().mockResolvedValue({
    summary: null,
    recentMessages: [],
  }),
  maybeSummarize: vi.fn().mockResolvedValue(undefined),
}))

// Mock memory/hot
vi.mock("../memory/hot", () => ({
  hotMemory: {
    setSessionContext: vi.fn().mockResolvedValue(undefined),
    getSessionContext: vi.fn().mockResolvedValue(null),
  },
}))

// Mock prompts
vi.mock("../ai.prompts", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("You are an AI assistant."),
  assembleSystemPrompt: vi.fn().mockResolvedValue("You are an AI assistant."),
}))

// Mock guarded caller - returns the caller as-is for simplicity
vi.mock("../ai.guarded-caller", () => ({
  createGuardedCaller: vi.fn().mockImplementation((caller: unknown) => Promise.resolve(caller)),
  ApprovalRequiredError: class ApprovalRequiredError extends Error {
    constructor(
      public readonly actionId: string,
      public readonly procedurePath: string,
      public readonly procedureInput: unknown,
      public readonly description: string
    ) {
      super(`Approval required for ${procedurePath}`)
      this.name = "ApprovalRequiredError"
    }
  },
  RestrictedProcedureError: class RestrictedProcedureError extends Error {
    constructor(public readonly procedurePath: string) {
      super(`Procedure "${procedurePath}" is restricted`)
      this.name = "RestrictedProcedureError"
    }
  },
}))

// Mock MCP adapter
vi.mock("../mcp/adapter", () => ({
  getExternalToolsForTenant: vi.fn().mockResolvedValue([]),
}))

// Mock tRPC
vi.mock("@/shared/trpc", () => ({
  createCallerFactory: vi.fn(() => vi.fn().mockReturnValue({})),
}))

vi.mock("@/server/root", () => ({
  appRouter: {},
}))

// Mock ai.introspection (needed by guarded-caller and describe_module tool)
vi.mock("../ai.introspection", () => ({
  getModuleMap: vi.fn().mockResolvedValue(new Map()),
  getModuleMetadata: vi.fn().mockResolvedValue({
    module: "booking",
    procedures: [
      { name: "list", type: "query", inputSchema: { type: "object", properties: {} } },
      { name: "create", type: "mutation", inputSchema: { type: "object", properties: {} } },
      { name: "cancel", type: "mutation", inputSchema: { type: "object", properties: {} } },
    ],
  }),
}))

// Mock config
vi.mock("../ai.config.repository", () => ({
  aiConfigRepository: {
    getOrCreate: vi.fn().mockResolvedValue({
      id: "cfg-1",
      tenantId: "t1",
      isEnabled: true,
      guardrailOverrides: {},
      trustMetrics: {},
    }),
    recordApprovalDecision: vi.fn(),
  },
}))

vi.mock("../ai.actions.repository", () => ({
  agentActionsRepository: {
    create: vi.fn().mockResolvedValue({ id: "action-1" }),
    updateStatus: vi.fn(),
  },
}))

// --- Tests ---

describe("Agent Loop — Integration", () => {
  const fakeConversation = {
    id: "conv-1",
    tenantId: "t1",
    userId: "u1",
    title: null,
    status: "active",
    tokenCount: 0,
    costCents: 0,
    summary: null,
    summaryUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const fakeMessage = {
    id: "msg-1",
    conversationId: "conv-1",
    role: "assistant",
    content: "Hello!",
    toolCalls: null,
    toolResults: null,
    tokenUsage: null,
    pageContext: null,
    createdAt: new Date(),
  }

  const fakeReq = new Request("https://localhost/api/ai/chat")

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateConversation.mockResolvedValue(fakeConversation)
    mockGetConversation.mockResolvedValue(fakeConversation)
    mockAddMessage.mockResolvedValue(fakeMessage)
    mockUpdateConversation.mockResolvedValue(undefined)
  })

  it("completes a simple text-only response (no tool calls)", async () => {
    // Anthropic returns a simple text response with no tool_use
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hello! How can I help you today?" }],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: "end_turn",
    })

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", ["booking:read"],
      fakeReq,
      { message: "Hello" }
    )

    expect(response.content).toBe("Hello! How can I help you today?")
    expect(response.toolCalls).toHaveLength(0)
    expect(response.toolResults).toHaveLength(0)
    expect(response.conversationId).toBe("conv-1")
    expect(response.tokenUsage.inputTokens).toBe(100)
    expect(response.tokenUsage.outputTokens).toBe(50)

    // Verify conversation was created
    expect(mockCreateConversation).toHaveBeenCalledWith("t1", "u1")
    // Verify messages were saved (user + assistant)
    expect(mockAddMessage).toHaveBeenCalledTimes(2)
    // First call: user message
    expect(mockAddMessage.mock.calls[0][1]).toMatchObject({ role: "user", content: "Hello" })
    // Second call: assistant message
    expect(mockAddMessage.mock.calls[1][1]).toMatchObject({ role: "assistant", content: "Hello! How can I help you today?" })
    // Conversation updated with token count
    expect(mockUpdateConversation).toHaveBeenCalledWith("conv-1", expect.objectContaining({
      tokenCount: 150,
    }))
  })

  it("handles a single tool call (describe_module) then final text", async () => {
    // First iteration: Claude requests describe_module
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "Let me look up the booking module." },
        { type: "tool_use", id: "tc-1", name: "describe_module", input: { module: "booking" } },
      ],
      usage: { input_tokens: 150, output_tokens: 80 },
      stop_reason: "tool_use",
    })

    // Second iteration: Claude returns final text
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "The booking module has list, create, and cancel procedures." }],
      usage: { input_tokens: 200, output_tokens: 60 },
      stop_reason: "end_turn",
    })

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", ["booking:read"],
      fakeReq,
      { message: "What can the booking module do?" }
    )

    expect(response.content).toBe("The booking module has list, create, and cancel procedures.")
    expect(response.toolCalls).toHaveLength(1)
    expect(response.toolCalls[0].name).toBe("describe_module")
    expect(response.tokenUsage.inputTokens).toBe(350)
    expect(response.tokenUsage.outputTokens).toBe(140)
  })

  it("handles execute_code tool call with tRPC query", async () => {
    // First iteration: Claude requests execute_code
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", id: "tc-1", name: "execute_code", input: { code: "return await trpc.booking.list({})" } },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
      stop_reason: "tool_use",
    })

    // Second iteration: Claude returns final text using the tool result
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "You have 3 bookings." }],
      usage: { input_tokens: 300, output_tokens: 50 },
      stop_reason: "end_turn",
    })

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", ["booking:read"],
      fakeReq,
      { message: "How many bookings do I have?" }
    )

    expect(response.content).toBe("You have 3 bookings.")
    expect(response.toolCalls).toHaveLength(1)
    expect(response.toolCalls[0].name).toBe("execute_code")
  })

  it("uses existing conversation when conversationId is provided", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Sure, continuing our chat." }],
      usage: { input_tokens: 200, output_tokens: 30 },
      stop_reason: "end_turn",
    })

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", [],
      fakeReq,
      { conversationId: "conv-1", message: "Continue" }
    )

    expect(response.conversationId).toBe("conv-1")
    expect(mockGetConversation).toHaveBeenCalledWith("t1", "conv-1")
    // Should NOT create a new conversation
    expect(mockCreateConversation).not.toHaveBeenCalled()
  })

  it("creates new conversation when conversationId not found", async () => {
    mockGetConversation.mockResolvedValueOnce(null)

    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hello, starting fresh!" }],
      usage: { input_tokens: 100, output_tokens: 20 },
      stop_reason: "end_turn",
    })

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", [],
      fakeReq,
      { conversationId: "nonexistent", message: "Hi" }
    )

    expect(response.conversationId).toBe("conv-1")
    expect(mockCreateConversation).toHaveBeenCalled()
  })

  it("throws on rate limit exceeded", async () => {
    const { redis } = await import("@/shared/redis")
    vi.mocked(redis.incr).mockResolvedValueOnce(21) // Exceeds RATE_LIMIT_PER_MINUTE = 20

    const { aiService } = await import("../ai.service")

    await expect(
      aiService.sendMessage("t1", "u1", "wos-u1", [], fakeReq, { message: "Hi" })
    ).rejects.toThrow("Rate limit exceeded")
  })

  it("throws on token budget exceeded", async () => {
    mockGetConversation.mockResolvedValueOnce({
      ...fakeConversation,
      tokenCount: 50_001, // Exceeds TOKEN_BUDGET = 50_000
    })

    const { aiService } = await import("../ai.service")

    await expect(
      aiService.sendMessage("t1", "u1", "wos-u1", [], fakeReq, { conversationId: "conv-1", message: "Hi" })
    ).rejects.toThrow("token budget")
  })

  it("sets conversation title from first message", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Sure!" }],
      usage: { input_tokens: 50, output_tokens: 10 },
      stop_reason: "end_turn",
    })

    // Return empty history (first message in conversation)
    const { getEffectiveHistory } = await import("../memory/summarizer")
    vi.mocked(getEffectiveHistory).mockResolvedValueOnce({
      summary: null,
      recentMessages: [],
    })

    const { aiService } = await import("../ai.service")
    await aiService.sendMessage(
      "t1", "u1", "wos-u1", [],
      fakeReq,
      { message: "Help me with my bookings for next week" }
    )

    expect(mockUpdateConversation).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({
        title: "Help me with my bookings for next week",
      })
    )
  })

  it("handles multiple tool iterations before final response", async () => {
    // Iteration 1: describe_module
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", id: "tc-1", name: "describe_module", input: { module: "booking" } },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: "tool_use",
    })

    // Iteration 2: execute_code
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", id: "tc-2", name: "execute_code", input: { code: "return await trpc.booking.list({})" } },
      ],
      usage: { input_tokens: 200, output_tokens: 80 },
      stop_reason: "tool_use",
    })

    // Iteration 3: final text
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Here are your bookings." }],
      usage: { input_tokens: 300, output_tokens: 40 },
      stop_reason: "end_turn",
    })

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", [],
      fakeReq,
      { message: "Show me my bookings" }
    )

    expect(response.content).toBe("Here are your bookings.")
    expect(response.toolCalls).toHaveLength(2)
    expect(response.toolCalls[0].name).toBe("describe_module")
    expect(response.toolCalls[1].name).toBe("execute_code")
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it("stops and returns fallback message when MAX_TOOL_ITERATIONS exhausted", async () => {
    // All 5 iterations return tool calls (never a final text)
    for (let i = 0; i < 5; i++) {
      mockCreate.mockResolvedValueOnce({
        content: [
          { type: "tool_use", id: `tc-${i}`, name: "describe_module", input: { module: "booking" } },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: "tool_use",
      })
    }

    const { aiService } = await import("../ai.service")
    const response = await aiService.sendMessage(
      "t1", "u1", "wos-u1", [],
      fakeReq,
      { message: "Complex query" }
    )

    // Should return a fallback message (not empty)
    expect(response.content).toContain("tool limit")
    expect(response.toolCalls).toHaveLength(5)
    expect(mockCreate).toHaveBeenCalledTimes(5)
  })
})
