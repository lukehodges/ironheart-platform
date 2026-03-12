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

vi.mock("@/shared/db/schema", () => ({}))

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

// Mock Anthropic SDK — shared mock so tests can configure per-call responses
const mockCreate = vi.fn()

function MockAnthropic() {
  return {
    messages: {
      create: mockCreate,
    },
  }
}

vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropic,
}))

// Mock workflow graph validation for generator tests
const mockValidateWorkflowGraph = vi.fn().mockReturnValue([])
vi.mock("@/modules/workflow/engine/validate", () => ({
  validateWorkflowGraph: (...args: unknown[]) => mockValidateWorkflowGraph(...args),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { WorkflowExecutionContext } from "@/modules/workflow/workflow.types"
import type { WorkflowNode } from "@/modules/workflow/workflow.types"

function makeContext(overrides?: Partial<WorkflowExecutionContext>): WorkflowExecutionContext {
  return {
    triggerData: { customerName: "Alice", bookingId: "b-123" },
    nodes: {},
    variables: {},
    loopStack: [],
    __workflowDepth: 0,
    ...overrides,
  }
}

function makeAIDecisionNode(overrides?: Partial<WorkflowNode>): WorkflowNode {
  return {
    id: "decision_1",
    type: "AI_DECISION",
    label: "Check priority",
    position: { x: 0, y: 0 },
    config: {
      prompt: "Is {{customerName}} a VIP?",
      outcomes: [
        { handle: "vip", label: "VIP", description: "Customer is VIP" },
        { handle: "regular", label: "Regular", description: "Customer is regular" },
      ],
      defaultHandle: "regular",
    },
    ...overrides,
  }
}

function makeAIGenerateNode(overrides?: Partial<WorkflowNode>): WorkflowNode {
  return {
    id: "generate_1",
    type: "AI_GENERATE",
    label: "Generate message",
    position: { x: 0, y: 200 },
    config: {
      prompt: "Write a greeting for {{customerName}}",
      outputField: "greeting",
    },
    ...overrides,
  }
}

function anthropicResponse(text: string, inputTokens = 50, outputTokens = 30) {
  return {
    content: [{ type: "text", text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI Phase C — Workflow Intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateWorkflowGraph.mockReturnValue([])
  })

  // =========================================================================
  // 1. interpolatePrompt
  // =========================================================================

  describe("interpolatePrompt", () => {
    it("replaces {{variable}} with context values", async () => {
      const { interpolatePrompt } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )
      const ctx = makeContext({
        triggerData: { customerName: "Alice", amount: 99 },
      })

      const result = interpolatePrompt(
        "Hello {{customerName}}, you owe {{amount}}",
        ctx
      )

      expect(result).toBe("Hello Alice, you owe 99")
    })

    it("resolves nested dot-path variables", async () => {
      const { interpolatePrompt } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )
      const ctx = makeContext({
        triggerData: {
          customer: { name: "Bob", tier: "gold" },
        },
      })

      const result = interpolatePrompt(
        "Customer {{triggerData.customer.name}} is {{triggerData.customer.tier}}",
        ctx
      )

      expect(result).toBe("Customer Bob is gold")
    })

    it("replaces missing values with empty string", async () => {
      const { interpolatePrompt } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )
      const ctx = makeContext({ triggerData: {} })

      const result = interpolatePrompt(
        "Hello {{missingField}}, your order {{deep.nested.path}}",
        ctx
      )

      expect(result).toBe("Hello , your order ")
    })

    it("resolves variables from context.variables", async () => {
      const { interpolatePrompt } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )
      const ctx = makeContext({
        variables: { greeting: "Hi there" },
      })

      const result = interpolatePrompt("{{greeting}}, welcome!", ctx)

      expect(result).toBe("Hi there, welcome!")
    })
  })

  // =========================================================================
  // 2. AI_DECISION executor
  // =========================================================================

  describe("executeAIDecision", () => {
    it("returns correct handle from Claude response", async () => {
      const { executeAIDecision } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(JSON.stringify({ handle: "vip", reasoning: "High spend customer" }))
      )

      const node = makeAIDecisionNode()
      const ctx = makeContext()

      const result = await executeAIDecision(node, ctx)

      expect(result.handle).toBe("vip")
      expect(result.decision).toBe("vip")
      expect(result.reasoning).toBe("High spend customer")
      expect(mockCreate).toHaveBeenCalledOnce()
    })

    it("falls back to defaultHandle when JSON parse fails", async () => {
      const { executeAIDecision } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse("this is not valid json at all")
      )

      const node = makeAIDecisionNode()
      const ctx = makeContext()

      const result = await executeAIDecision(node, ctx)

      expect(result.handle).toBe("regular")
      expect(result.decision).toBe("regular")
      expect(result.reasoning).toContain("Failed to parse")
    })

    it("falls back to defaultHandle when handle not in outcomes", async () => {
      const { executeAIDecision } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(JSON.stringify({ handle: "unknown_handle", reasoning: "confused" }))
      )

      const node = makeAIDecisionNode()
      const ctx = makeContext()

      const result = await executeAIDecision(node, ctx)

      expect(result.handle).toBe("regular")
      expect(result.decision).toBe("regular")
    })

    it("falls back to defaultHandle on API error", async () => {
      const { executeAIDecision } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockRejectedValueOnce(new Error("API rate limited"))

      const node = makeAIDecisionNode()
      const ctx = makeContext()

      const result = await executeAIDecision(node, ctx)

      expect(result.handle).toBe("regular")
      expect(result.reasoning).toContain("API rate limited")
    })
  })

  // =========================================================================
  // 3. AI_GENERATE executor
  // =========================================================================

  describe("executeAIGenerate", () => {
    it("returns content from Claude response", async () => {
      const { executeAIGenerate } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse("Dear Alice, welcome to our service!", 40, 25)
      )

      const node = makeAIGenerateNode()
      const ctx = makeContext()

      const result = await executeAIGenerate(node, ctx)

      expect(result.content).toBe("Dear Alice, welcome to our service!")
    })

    it("includes model and token count in result", async () => {
      const { executeAIGenerate } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse("Generated content", 100, 200)
      )

      const node = makeAIGenerateNode()
      const ctx = makeContext()

      const result = await executeAIGenerate(node, ctx)

      expect(result.model).toBe("claude-sonnet-4-20250514")
      expect(result.tokens).toBe(300)
    })

    it("uses custom model when specified in config", async () => {
      const { executeAIGenerate } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse("Result", 10, 20)
      )

      const node = makeAIGenerateNode({
        config: {
          prompt: "Write something",
          outputField: "output",
          model: "claude-haiku-4-5-20251001",
          maxTokens: 1024,
        },
      })
      const ctx = makeContext()

      const result = await executeAIGenerate(node, ctx)

      expect(result.model).toBe("claude-haiku-4-5-20251001")
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
        })
      )
    })
  })

  // =========================================================================
  // 4. AI error recovery
  // =========================================================================

  describe("attemptAIRecovery", () => {
    const failedNode: WorkflowNode = {
      id: "send_email_1",
      type: "SEND_EMAIL",
      label: "Send confirmation",
      position: { x: 0, y: 0 },
      config: {},
    }

    it("returns retry action", async () => {
      const { attemptAIRecovery } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(
          JSON.stringify({
            action: "retry",
            reasoning: "Transient network error, retrying should work",
          })
        )
      )

      const ctx = makeContext()
      const result = await attemptAIRecovery(failedNode, new Error("ETIMEDOUT"), ctx)

      expect(result.action).toBe("retry")
      expect(result.reasoning).toContain("Transient")
    })

    it("returns skip action", async () => {
      const { attemptAIRecovery } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(
          JSON.stringify({
            action: "skip",
            reasoning: "Non-critical notification, safe to skip",
          })
        )
      )

      const ctx = makeContext()
      const result = await attemptAIRecovery(failedNode, "Some error", ctx)

      expect(result.action).toBe("skip")
      expect(result.reasoning).toContain("Non-critical")
    })

    it("defaults to skip on parse failure", async () => {
      const { attemptAIRecovery } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse("I think you should retry but I can't format JSON")
      )

      const ctx = makeContext()
      const result = await attemptAIRecovery(failedNode, new Error("DB error"), ctx)

      expect(result.action).toBe("skip")
      expect(result.reasoning).toContain("Failed to parse")
    })

    it("defaults to skip on API error", async () => {
      const { attemptAIRecovery } = await import(
        "@/modules/workflow/engine/ai-nodes"
      )

      mockCreate.mockRejectedValueOnce(new Error("Service unavailable"))

      const ctx = makeContext()
      const result = await attemptAIRecovery(failedNode, new Error("original"), ctx)

      expect(result.action).toBe("skip")
      expect(result.reasoning).toContain("Service unavailable")
    })
  })

  // =========================================================================
  // 5. Workflow generator
  // =========================================================================

  describe("generateWorkflowFromDescription", () => {
    it("returns valid workflow from Claude response", async () => {
      const { generateWorkflowFromDescription } = await import(
        "../ai.workflow-generator"
      )

      const validWorkflow = {
        name: "Booking Confirmation",
        description: "Send confirmation email when booking is created",
        nodes: [
          {
            id: "trigger_1",
            type: "TRIGGER",
            label: "On booking created",
            position: { x: 0, y: 0 },
            config: { eventType: "booking/created" },
          },
          {
            id: "send_email_1",
            type: "SEND_EMAIL",
            label: "Send confirmation",
            position: { x: 0, y: 200 },
            config: {
              recipientField: "triggerData.customerEmail",
              subject: "Booking confirmed",
              body: "Your booking {{triggerData.bookingId}} is confirmed",
            },
          },
        ],
        edges: [
          {
            id: "edge_1",
            source: "trigger_1",
            target: "send_email_1",
            sourceHandle: "default",
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(JSON.stringify(validWorkflow))
      )
      mockValidateWorkflowGraph.mockReturnValueOnce([])

      const result = await generateWorkflowFromDescription(
        "Send a confirmation email when a booking is created"
      )

      expect(result.name).toBe("Booking Confirmation")
      expect(result.description).toBe(
        "Send confirmation email when booking is created"
      )
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
      expect(result.validationErrors).toHaveLength(0)
    })

    it("reports validation errors from graph validation", async () => {
      const { generateWorkflowFromDescription } = await import(
        "../ai.workflow-generator"
      )

      const workflowWithIssues = {
        name: "Bad Workflow",
        description: "Has issues",
        nodes: [
          {
            id: "trigger_1",
            type: "TRIGGER",
            label: "Trigger",
            position: { x: 0, y: 0 },
            config: { eventType: "booking/created" },
          },
        ],
        edges: [],
      }

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(JSON.stringify(workflowWithIssues))
      )
      mockValidateWorkflowGraph.mockReturnValueOnce([
        "TRIGGER node has no outgoing edges",
      ])

      const result = await generateWorkflowFromDescription("Do something")

      expect(result.validationErrors).toHaveLength(1)
      expect(result.validationErrors[0]).toContain("no outgoing edges")
      // Still returns what was generated
      expect(result.nodes).toHaveLength(1)
    })

    it("returns validation error on invalid JSON from Claude", async () => {
      const { generateWorkflowFromDescription } = await import(
        "../ai.workflow-generator"
      )

      mockCreate.mockResolvedValueOnce(
        anthropicResponse("Sorry, I can't generate a workflow for that request.")
      )

      const result = await generateWorkflowFromDescription("gibberish input")

      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
      expect(result.validationErrors).toHaveLength(1)
      expect(result.validationErrors[0]).toContain("Failed to parse")
    })

    it("strips markdown code fences from response", async () => {
      const { generateWorkflowFromDescription } = await import(
        "../ai.workflow-generator"
      )

      const validWorkflow = {
        name: "Fenced Workflow",
        description: "Response wrapped in code fences",
        nodes: [
          {
            id: "trigger_1",
            type: "TRIGGER",
            label: "Trigger",
            position: { x: 0, y: 0 },
            config: { eventType: "booking/created" },
          },
        ],
        edges: [],
      }

      // Wrap JSON in markdown code fences
      const fencedJson = "```json\n" + JSON.stringify(validWorkflow) + "\n```"
      mockCreate.mockResolvedValueOnce(anthropicResponse(fencedJson))
      mockValidateWorkflowGraph.mockReturnValueOnce([])

      const result = await generateWorkflowFromDescription("Create a workflow")

      expect(result.name).toBe("Fenced Workflow")
      expect(result.nodes).toHaveLength(1)
    })

    it("includes tenant context in the prompt when provided", async () => {
      const { generateWorkflowFromDescription } = await import(
        "../ai.workflow-generator"
      )

      const validWorkflow = {
        name: "Contextual Workflow",
        description: "Built with tenant context",
        nodes: [
          {
            id: "trigger_1",
            type: "TRIGGER",
            label: "Trigger",
            position: { x: 0, y: 0 },
            config: { eventType: "booking/created" },
          },
        ],
        edges: [],
      }

      mockCreate.mockResolvedValueOnce(
        anthropicResponse(JSON.stringify(validWorkflow))
      )
      mockValidateWorkflowGraph.mockReturnValueOnce([])

      await generateWorkflowFromDescription("Send reminders", {
        existingWorkflows: [
          { id: "w1", name: "Existing Workflow", description: "Does stuff" },
        ],
        availableEvents: ["booking/created", "booking/cancelled"],
      })

      // Verify that the user message passed to the API includes tenant context
      const callArgs = mockCreate.mock.calls[0][0]
      const userMessage = callArgs.messages[0].content
      expect(userMessage).toContain("Existing Workflow")
      expect(userMessage).toContain("booking/created")
      expect(userMessage).toContain("booking/cancelled")
    })
  })
})
