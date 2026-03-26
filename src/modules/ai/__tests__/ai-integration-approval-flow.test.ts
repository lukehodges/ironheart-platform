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

// Mock AI config repository
const mockGetOrCreate = vi.fn()
const mockRecordApprovalDecision = vi.fn()
vi.mock("../ai.config.repository", () => ({
  aiConfigRepository: {
    getOrCreate: (...args: unknown[]) => mockGetOrCreate(...args),
    recordApprovalDecision: (...args: unknown[]) => mockRecordApprovalDecision(...args),
    update: vi.fn(),
  },
}))

// Mock agent actions repository
const mockCreateAction = vi.fn()
const mockUpdateStatus = vi.fn()
const mockGetById = vi.fn()
vi.mock("../ai.actions.repository", () => ({
  agentActionsRepository: {
    create: (...args: unknown[]) => mockCreateAction(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    listByConversation: vi.fn(),
    listByTenant: vi.fn(),
  },
}))

// Mock corrections repository
const mockRecordRejection = vi.fn()
vi.mock("../memory/corrections", () => ({
  correctionsRepository: {
    recordRejection: (...args: unknown[]) => mockRecordRejection(...args),
    getForTool: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue([]),
  },
}))

// Mock ai.introspection
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
      { name: "create", type: "mutation", inputSchema: null },
      { name: "delete", type: "mutation", inputSchema: null },
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

describe("Approval Flow — Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrCreate.mockResolvedValue({
      id: "cfg-1",
      tenantId: "t1",
      isEnabled: true,
      guardrailOverrides: {},
      trustMetrics: {},
    })
    mockRecordApprovalDecision.mockResolvedValue(undefined)
    mockUpdateStatus.mockResolvedValue(undefined)
    mockRecordRejection.mockResolvedValue(undefined)
  })

  describe("full approval lifecycle", () => {
    it("CONFIRM mutation → approval → re-execution succeeds", async () => {
      const { createGuardedCaller, ApprovalRequiredError } = await import("../ai.guarded-caller")

      const caller = {
        booking: {
          list: vi.fn().mockResolvedValue({ rows: [] }),
          getById: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: "b-new", status: "pending" }),
          addNote: vi.fn().mockResolvedValue({ id: "note-1" }),
          cancel: vi.fn(),
        },
        customer: {
          list: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
        },
      }

      // Step 1: First attempt — should throw ApprovalRequiredError
      mockCreateAction.mockResolvedValueOnce({ id: "action-1" })
      const approvedProcedures = new Set<string>()
      const guarded = (await createGuardedCaller(caller, {
        tenantId: "t1",
        userId: "u1",
        conversationId: "conv-1",
        approvedProcedures,
      })) as typeof caller

      let caught: InstanceType<typeof ApprovalRequiredError> | null = null
      try {
        await guarded.booking.create({ serviceId: "s1" })
      } catch (err) {
        if (err instanceof ApprovalRequiredError) {
          caught = err
        }
      }
      expect(caught).not.toBeNull()
      expect(caught!.procedurePath).toBe("booking.create")
      expect(caught!.actionId).toBe("action-1")
      expect(caller.booking.create).not.toHaveBeenCalled()

      // Step 2: Simulate approval via Redis
      const { resolveApprovalFromUI } = await import("../ai.approval")
      await resolveApprovalFromUI("action-1", true)

      const { redis } = await import("@/shared/redis")
      expect(redis.set).toHaveBeenCalledWith("ai:approval:action-1", "approved", { ex: 60 })

      // Step 3: Add to approved set and retry
      approvedProcedures.add("booking.create")
      mockCreateAction.mockResolvedValueOnce({ id: "action-2" })

      const result = await guarded.booking.create({ serviceId: "s1" })
      expect(result).toEqual({ id: "b-new", status: "pending" })
      expect(caller.booking.create).toHaveBeenCalledWith({ serviceId: "s1" })
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-2", expect.objectContaining({
        status: "executed",
        approvedBy: "u1",
      }))
    })

    it("CONFIRM mutation → rejection → records correction", async () => {
      const { createGuardedCaller, ApprovalRequiredError } = await import("../ai.guarded-caller")

      const caller = {
        booking: {
          list: vi.fn(),
          getById: vi.fn(),
          create: vi.fn(),
          addNote: vi.fn(),
          cancel: vi.fn(),
        },
        customer: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
      }

      mockCreateAction.mockResolvedValueOnce({ id: "action-rej" })
      const guarded = (await createGuardedCaller(caller, {
        tenantId: "t1",
        userId: "u1",
        conversationId: "conv-1",
      })) as typeof caller

      // Trigger CONFIRM
      try {
        await guarded.booking.create({ serviceId: "s1" })
      } catch {
        // expected
      }

      // Simulate rejection
      const { redis } = await import("@/shared/redis")
      vi.mocked(redis.get).mockResolvedValueOnce("rejected")

      mockGetById.mockResolvedValueOnce({
        id: "action-rej",
        toolName: "booking.create",
        toolInput: { serviceId: "s1" },
      })

      const { waitForApproval } = await import("../ai.approval")
      const approved = await waitForApproval("action-rej", "t1", "booking.create", "u1")

      expect(approved).toBe(false)
      expect(mockUpdateStatus).toHaveBeenCalledWith("action-rej", { status: "rejected" })
      expect(mockRecordApprovalDecision).toHaveBeenCalledWith("t1", "booking.create", false)

      // Correction should be recorded
      expect(mockRecordRejection).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          toolName: "booking.create",
          attemptedInput: { serviceId: "s1" },
        })
      )
    })

    it("AUTO mutations bypass approval entirely", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")

      const caller = {
        booking: {
          list: vi.fn(),
          getById: vi.fn(),
          create: vi.fn(),
          addNote: vi.fn().mockResolvedValue({ id: "note-1" }),
          cancel: vi.fn(),
        },
        customer: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
      }

      mockCreateAction.mockResolvedValueOnce({ id: "auto-action" })

      const guarded = (await createGuardedCaller(caller, {
        tenantId: "t1",
        userId: "u1",
        conversationId: "conv-1",
      })) as typeof caller

      // booking.addNote is AUTO tier
      const result = await guarded.booking.addNote({ bookingId: "b1", content: "test" })

      expect(result).toEqual({ id: "note-1" })
      expect(caller.booking.addNote).toHaveBeenCalled()
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({ guardrailTier: "AUTO" })
      )
      expect(mockUpdateStatus).toHaveBeenCalledWith("auto-action", {
        status: "auto_executed",
        toolOutput: { id: "note-1" },
      })
    })

    it("RESTRICT mutations cannot be approved", async () => {
      const { createGuardedCaller, RestrictedProcedureError } = await import("../ai.guarded-caller")

      const caller = {
        booking: {
          list: vi.fn(),
          getById: vi.fn(),
          create: vi.fn(),
          addNote: vi.fn(),
          cancel: vi.fn(),
        },
        customer: {
          list: vi.fn(),
          create: vi.fn(),
          delete: vi.fn().mockResolvedValue({ success: true }),
        },
      }

      // Even with approved procedures set, RESTRICT blocks
      const guarded = (await createGuardedCaller(caller, {
        tenantId: "t1",
        userId: "u1",
        conversationId: "conv-1",
        approvedProcedures: new Set(["customer.delete"]),
      })) as typeof caller

      await expect(guarded.customer.delete({ id: "c1" })).rejects.toThrow(RestrictedProcedureError)
      expect(caller.customer.delete).not.toHaveBeenCalled()
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

    it("queries always pass through without guardrail checks", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")

      const caller = {
        booking: {
          list: vi.fn().mockResolvedValue({ rows: [{ id: "b1" }], hasMore: false }),
          getById: vi.fn().mockResolvedValue({ id: "b1" }),
          create: vi.fn(),
          addNote: vi.fn(),
          cancel: vi.fn(),
        },
        customer: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
      }

      const guarded = (await createGuardedCaller(caller, {
        tenantId: "t1",
        userId: "u1",
        conversationId: "conv-1",
      })) as typeof caller

      const listResult = await guarded.booking.list({})
      expect(listResult).toEqual({ rows: [{ id: "b1" }], hasMore: false })

      const getResult = await guarded.booking.getById({ id: "b1" })
      expect(getResult).toEqual({ id: "b1" })

      // No actions created for queries
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

    it("tenant override can promote CONFIRM to AUTO", async () => {
      const { createGuardedCaller } = await import("../ai.guarded-caller")

      // Tenant override: booking.create is AUTO instead of default CONFIRM
      mockGetOrCreate.mockResolvedValue({
        id: "cfg-1",
        tenantId: "t1",
        isEnabled: true,
        guardrailOverrides: { "booking.create": "AUTO" },
        trustMetrics: {},
      })

      const caller = {
        booking: {
          list: vi.fn(),
          getById: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: "b-new" }),
          addNote: vi.fn(),
          cancel: vi.fn(),
        },
        customer: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
      }

      mockCreateAction.mockResolvedValueOnce({ id: "auto-create" })

      const guarded = (await createGuardedCaller(caller, {
        tenantId: "t1",
        userId: "u1",
        conversationId: "conv-1",
      })) as typeof caller

      // booking.create should now execute without approval
      const result = await guarded.booking.create({ serviceId: "s1" })
      expect(result).toEqual({ id: "b-new" })
      expect(caller.booking.create).toHaveBeenCalled()
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({ guardrailTier: "AUTO" })
      )
    })
  })
})
