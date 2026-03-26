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

vi.mock("@/shared/db/schema", () => ({
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

// Mock aiConfigRepository
const mockGetOrCreate = vi.fn()
const mockRecordApprovalDecision = vi.fn()
vi.mock("../ai.config.repository", () => ({
  aiConfigRepository: {
    getOrCreate: (...args: unknown[]) => mockGetOrCreate(...args),
    recordApprovalDecision: (...args: unknown[]) => mockRecordApprovalDecision(...args),
    update: vi.fn(),
    getGuardrailTier: vi.fn(),
  },
}))

// Mock agentActionsRepository
const mockCreateAction = vi.fn()
const mockUpdateStatus = vi.fn()
vi.mock("../ai.actions.repository", () => ({
  agentActionsRepository: {
    create: (...args: unknown[]) => mockCreateAction(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    getById: vi.fn(),
    listByConversation: vi.fn(),
    listByTenant: vi.fn(),
    getPendingByConversation: vi.fn(),
  },
}))

// Mock ai.introspection — build a module map with known procedures
type ProcedureMetadata = { name: string; type: "query" | "mutation"; inputSchema: null }
type ModuleMetadata = { module: string; procedures: ProcedureMetadata[] }

function buildTestModuleMap(): Map<string, ModuleMetadata> {
  const map = new Map<string, ModuleMetadata>()
  map.set("booking", {
    module: "booking",
    procedures: [
      { name: "list", type: "query", inputSchema: null },
      { name: "getById", type: "query", inputSchema: null },
      { name: "create", type: "mutation", inputSchema: null },
      { name: "addNote", type: "mutation", inputSchema: null },
      { name: "cancel", type: "mutation", inputSchema: null },
    ],
  })
  map.set("customer", {
    module: "customer",
    procedures: [
      { name: "list", type: "query", inputSchema: null },
      { name: "getById", type: "query", inputSchema: null },
      { name: "create", type: "mutation", inputSchema: null },
      { name: "delete", type: "mutation", inputSchema: null },
      { name: "addNote", type: "mutation", inputSchema: null },
    ],
  })
  return map
}

vi.mock("../ai.introspection", () => ({
  getModuleMap: () => buildTestModuleMap(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI Phase B — Guardrails, Approval, Guarded Caller", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return config with no overrides
    mockGetOrCreate.mockResolvedValue({
      id: "cfg-1",
      tenantId: "t1",
      isEnabled: true,
      maxTokenBudget: 100000,
      maxMessagesPerMinute: 30,
      defaultModel: "claude-sonnet-4-20250514",
      guardrailOverrides: {},
      trustMetrics: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockRecordApprovalDecision.mockResolvedValue(undefined)
    mockUpdateStatus.mockResolvedValue(undefined)
  })

  // =========================================================================
  // 1. Guardrail Registry
  // =========================================================================

  describe("guardrail registry", () => {
    it("resolveGuardrailTier returns AUTO for booking.addNote", async () => {
      const { resolveGuardrailTier } = await import("../ai.guardrails")
      const tier = await resolveGuardrailTier("t1", "booking.addNote")
      expect(tier).toBe("AUTO")
    })

    it("resolveGuardrailTier returns CONFIRM for booking.create", async () => {
      const { resolveGuardrailTier } = await import("../ai.guardrails")
      const tier = await resolveGuardrailTier("t1", "booking.create")
      expect(tier).toBe("CONFIRM")
    })

    it("resolveGuardrailTier returns RESTRICT for customer.delete", async () => {
      const { resolveGuardrailTier } = await import("../ai.guardrails")
      const tier = await resolveGuardrailTier("t1", "customer.delete")
      expect(tier).toBe("RESTRICT")
    })

    it("unknown procedures fallback to CONFIRM", async () => {
      const { resolveGuardrailTier } = await import("../ai.guardrails")
      const tier = await resolveGuardrailTier("t1", "some.unknownProcedure")
      expect(tier).toBe("CONFIRM")
    })

    it("tenant overrides take priority over defaults", async () => {
      // Override booking.addNote from AUTO to CONFIRM at tenant level
      mockGetOrCreate.mockResolvedValue({
        id: "cfg-1",
        tenantId: "t1",
        isEnabled: true,
        maxTokenBudget: 100000,
        maxMessagesPerMinute: 30,
        defaultModel: "claude-sonnet-4-20250514",
        guardrailOverrides: { "booking.addNote": "CONFIRM" },
        trustMetrics: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { resolveGuardrailTier } = await import("../ai.guardrails")
      const tier = await resolveGuardrailTier("t1", "booking.addNote")
      expect(tier).toBe("CONFIRM")
    })

    it("getDefaultGuardrailTier works without tenant context", async () => {
      const { getDefaultGuardrailTier } = await import("../ai.guardrails")

      expect(getDefaultGuardrailTier("booking.addNote")).toBe("AUTO")
      expect(getDefaultGuardrailTier("booking.create")).toBe("CONFIRM")
      expect(getDefaultGuardrailTier("customer.delete")).toBe("RESTRICT")
      expect(getDefaultGuardrailTier("unknown.proc")).toBe("CONFIRM")
    })

    it("listGuardrailDefaults returns a copy of all defaults", async () => {
      const { listGuardrailDefaults } = await import("../ai.guardrails")
      const defaults = listGuardrailDefaults()

      expect(defaults["booking.addNote"]).toBe("AUTO")
      expect(defaults["customer.delete"]).toBe("RESTRICT")
      expect(defaults["booking.create"]).toBe("CONFIRM")

      // Should be a copy, not the original
      defaults["booking.addNote"] = "RESTRICT"
      const defaults2 = listGuardrailDefaults()
      expect(defaults2["booking.addNote"]).toBe("AUTO")
    })
  })

  // =========================================================================
  // 2. Guarded Caller Proxy
  // =========================================================================

  describe("guarded caller proxy", () => {
    const callerOptions = {
      tenantId: "t1",
      userId: "u1",
      conversationId: "conv-1",
    }

    function buildMockCaller() {
      return {
        booking: {
          list: vi.fn().mockResolvedValue({ rows: [], hasMore: false }),
          getById: vi.fn().mockResolvedValue({ id: "b1" }),
          create: vi.fn().mockResolvedValue({ id: "b-new" }),
          addNote: vi.fn().mockResolvedValue({ id: "note-1" }),
          cancel: vi.fn().mockResolvedValue({ id: "b1", status: "cancelled" }),
        },
        customer: {
          list: vi.fn().mockResolvedValue({ rows: [], hasMore: false }),
          getById: vi.fn().mockResolvedValue({ id: "c1" }),
          create: vi.fn().mockResolvedValue({ id: "c-new" }),
          delete: vi.fn().mockResolvedValue({ success: true }),
          addNote: vi.fn().mockResolvedValue({ id: "cn-1" }),
        },
        unknownModule: {
          doStuff: vi.fn().mockResolvedValue("ok"),
        },
      }
    }

    it("query procedures pass through unchanged", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()
      const guarded = (await createGuardedCaller(caller, callerOptions)) as typeof caller

      const result = await guarded.booking.list({})
      expect(result).toEqual({ rows: [], hasMore: false })
      expect(caller.booking.list).toHaveBeenCalledWith({})
      // No agent action should be created for queries
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

    it("AUTO mutations execute, create agent_action record, and return result", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()
      mockCreateAction.mockResolvedValue({ id: "action-1" })

      const guarded = (await createGuardedCaller(caller, callerOptions)) as typeof caller
      const result = await guarded.booking.addNote({ bookingId: "b1", content: "Test note" })

      expect(result).toEqual({ id: "note-1" })
      expect(caller.booking.addNote).toHaveBeenCalledWith({ bookingId: "b1", content: "Test note" })
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "conv-1",
          tenantId: "t1",
          userId: "u1",
          toolName: "booking.addNote",
          toolInput: { bookingId: "b1", content: "Test note" },
          guardrailTier: "AUTO",
        })
      )
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-1", {
        status: "auto_executed",
        toolOutput: { id: "note-1" },
      })
    })

    it("CONFIRM mutations throw ApprovalRequiredError with correct action details", async () => {
      const { createGuardedCaller, ApprovalRequiredError } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()
      mockCreateAction.mockResolvedValue({ id: "action-2" })

      const guarded = (await createGuardedCaller(caller, callerOptions)) as typeof caller

      try {
        await guarded.booking.create({ serviceId: "s1", customerId: "c1" })
        expect.fail("Should have thrown ApprovalRequiredError")
      } catch (err) {
        expect(err).toBeInstanceOf(ApprovalRequiredError)
        const approvalErr = err as InstanceType<typeof ApprovalRequiredError>
        expect(approvalErr.actionId).toBe("action-2")
        expect(approvalErr.procedurePath).toBe("booking.create")
        expect(approvalErr.procedureInput).toEqual({ serviceId: "s1", customerId: "c1" })
        expect(approvalErr.description).toContain("booking.create")
      }

      // The procedure itself should NOT have been called
      expect(caller.booking.create).not.toHaveBeenCalled()
      // But an agent action should have been created in pending state
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "booking.create",
          guardrailTier: "CONFIRM",
        })
      )
    })

    it("RESTRICT mutations throw RestrictedProcedureError", async () => {
      const { createGuardedCaller, RestrictedProcedureError } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()

      const guarded = (await createGuardedCaller(caller, callerOptions)) as typeof caller

      try {
        await guarded.customer.delete({ id: "c1" })
        expect.fail("Should have thrown RestrictedProcedureError")
      } catch (err) {
        expect(err).toBeInstanceOf(RestrictedProcedureError)
        const restrictErr = err as InstanceType<typeof RestrictedProcedureError>
        expect(restrictErr.procedurePath).toBe("customer.delete")
        expect(restrictErr.message).toContain("restricted")
      }

      // No action record for restricted procedures, no call executed
      expect(caller.customer.delete).not.toHaveBeenCalled()
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

    it("pre-approved procedures (in approvedProcedures Set) execute without throwing", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()
      mockCreateAction.mockResolvedValue({ id: "action-3" })

      const approvedProcedures = new Set(["booking.create"])
      const guarded = (await createGuardedCaller(caller, {
        ...callerOptions,
        approvedProcedures,
      })) as typeof caller

      // booking.create is normally CONFIRM, but it's in the approved set
      const result = await guarded.booking.create({ serviceId: "s1", customerId: "c1" })

      expect(result).toEqual({ id: "b-new" })
      expect(caller.booking.create).toHaveBeenCalled()
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "booking.create",
          guardrailTier: "CONFIRM",
        })
      )
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-3", expect.objectContaining({
        status: "executed",
        approvedBy: "u1",
      }))
      expect(mockRecordApprovalDecision).toHaveBeenCalledWith("t1", "booking.create", true)
    })

    it("unknown modules default to CONFIRM guardrail instead of passing through", async () => {
      const { createGuardedCaller, ApprovalRequiredError } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()
      mockCreateAction.mockResolvedValue({ id: "action-unknown" })

      const guarded = (await createGuardedCaller(caller, callerOptions)) as typeof caller

      // Unknown module functions should trigger CONFIRM approval, not pass through
      await expect(guarded.unknownModule.doStuff({})).rejects.toThrow(ApprovalRequiredError)
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "unknownModule.doStuff",
          guardrailTier: "CONFIRM",
        })
      )
    })

    it("AUTO mutation failure records failed status", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")
      const caller = buildMockCaller()
      mockCreateAction.mockResolvedValue({ id: "action-fail" })
      caller.booking.addNote.mockRejectedValue(new Error("DB connection error"))

      const guarded = (await createGuardedCaller(caller, callerOptions)) as typeof caller

      await expect(guarded.booking.addNote({ bookingId: "b1", content: "x" })).rejects.toThrow("DB connection error")

      expect(mockUpdateStatus).toHaveBeenCalledWith("action-fail", {
        status: "failed",
        error: "DB connection error",
      })
    })
  })

  // =========================================================================
  // 3. Approval Flow
  // =========================================================================

  describe("approval flow", () => {
    it("resolveApprovalFromUI sets Redis key correctly for approval", async () => {
      const { redis } = await import("@/shared/redis")
      const { resolveApprovalFromUI } = await import("../ai.approval")

      await resolveApprovalFromUI("action-123", true)

      expect(redis.set).toHaveBeenCalledWith("ai:approval:action-123", "approved", { ex: 60 })
    })

    it("resolveApprovalFromUI sets Redis key correctly for rejection", async () => {
      const { redis } = await import("@/shared/redis")
      const { resolveApprovalFromUI } = await import("../ai.approval")

      await resolveApprovalFromUI("action-456", false)

      expect(redis.set).toHaveBeenCalledWith("ai:approval:action-456", "rejected", { ex: 60 })
    })

    it("waitForApproval returns true when Redis has 'approved'", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)
      // First poll: return "approved"
      redisMock.get.mockResolvedValueOnce("approved")

      const { waitForApproval } = await import("../ai.approval")
      const result = await waitForApproval("action-789", "t1", "booking.create", "u1")

      expect(result).toBe(true)
      expect(redisMock.get).toHaveBeenCalledWith("ai:approval:action-789")
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-789", {
        status: "approved",
        approvedBy: "u1",
      })
      expect(redisMock.del).toHaveBeenCalledWith("ai:approval:action-789")
      expect(mockRecordApprovalDecision).toHaveBeenCalledWith("t1", "booking.create", true)
    })

    it("waitForApproval returns false when Redis has 'rejected'", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)
      redisMock.get.mockResolvedValueOnce("rejected")

      const { waitForApproval } = await import("../ai.approval")
      const result = await waitForApproval("action-rej", "t1", "booking.cancel", "u1")

      expect(result).toBe(false)
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-rej", { status: "rejected" })
      expect(redisMock.del).toHaveBeenCalledWith("ai:approval:action-rej")
      expect(mockRecordApprovalDecision).toHaveBeenCalledWith("t1", "booking.cancel", false)
    })

    it("waitForApproval returns false on timeout", async () => {
      const { redis } = await import("@/shared/redis")
      const redisMock = vi.mocked(redis)
      // Always return null — never resolved
      redisMock.get.mockResolvedValue(null)

      // We need to override the timeout constant. The simplest approach:
      // mock Date.now to fast-forward past the 5-minute timeout.
      const realDateNow = Date.now
      let callCount = 0
      vi.spyOn(Date, "now").mockImplementation(() => {
        callCount++
        // First call returns 0, second call returns past the 5-minute timeout
        if (callCount <= 1) return 0
        return 400_000 // > 300_000ms timeout
      })

      const { waitForApproval } = await import("../ai.approval")
      const result = await waitForApproval("action-timeout", "t1", "booking.create", "u1")

      expect(result).toBe(false)
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-timeout", {
        status: "rejected",
        error: "Approval timed out",
      })

      Date.now = realDateNow
      vi.restoreAllMocks()
    })
  })

  // =========================================================================
  // 4. Trust Analysis
  // =========================================================================

  describe("trust analysis", () => {
    it("suggests promotion from CONFIRM to AUTO when approval rate is high", async () => {
      mockGetOrCreate.mockResolvedValue({
        id: "cfg-1",
        tenantId: "t1",
        isEnabled: true,
        maxTokenBudget: 100000,
        maxMessagesPerMinute: 30,
        defaultModel: "claude-sonnet-4-20250514",
        guardrailOverrides: {},
        trustMetrics: {
          "booking.create": { approved: 49, rejected: 1 }, // 98% > 95% threshold, 50 total = min
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { analyzeTrustMetrics } = await import("../ai.trust")
      const suggestions = await analyzeTrustMetrics("t1")

      expect(suggestions.length).toBe(1)
      expect(suggestions[0].toolName).toBe("booking.create")
      expect(suggestions[0].currentTier).toBe("CONFIRM")
      expect(suggestions[0].suggestedTier).toBe("AUTO")
    })

    it("suggests demotion from AUTO to CONFIRM when rejection rate is high", async () => {
      mockGetOrCreate.mockResolvedValue({
        id: "cfg-1",
        tenantId: "t1",
        isEnabled: true,
        maxTokenBudget: 100000,
        maxMessagesPerMinute: 30,
        defaultModel: "claude-sonnet-4-20250514",
        guardrailOverrides: { "booking.addNote": "AUTO" },
        trustMetrics: {
          "booking.addNote": { approved: 15, rejected: 5 }, // 25% rejection > 20% threshold, 20 total
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { analyzeTrustMetrics } = await import("../ai.trust")
      const suggestions = await analyzeTrustMetrics("t1")

      expect(suggestions.length).toBe(1)
      expect(suggestions[0].toolName).toBe("booking.addNote")
      expect(suggestions[0].currentTier).toBe("AUTO")
      expect(suggestions[0].suggestedTier).toBe("CONFIRM")
    })

    it("returns no suggestions when metrics are below thresholds", async () => {
      mockGetOrCreate.mockResolvedValue({
        id: "cfg-1",
        tenantId: "t1",
        isEnabled: true,
        maxTokenBudget: 100000,
        maxMessagesPerMinute: 30,
        defaultModel: "claude-sonnet-4-20250514",
        guardrailOverrides: {},
        trustMetrics: {
          "booking.create": { approved: 10, rejected: 0 }, // Only 10 decisions, below 50 min
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { analyzeTrustMetrics } = await import("../ai.trust")
      const suggestions = await analyzeTrustMetrics("t1")

      expect(suggestions.length).toBe(0)
    })
  })
})
