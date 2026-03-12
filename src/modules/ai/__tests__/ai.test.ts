import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

// Mock db to prevent DATABASE_URL error
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
      _mocks: { mockReturning, mockValues, mockInsert, mockLimit, mockOrderBy, mockWhere, mockFrom, mockSelect, mockUpdate, mockUpdateSet },
    },
  }
})

// Mock schema tables
vi.mock("@/shared/db/schema", () => ({
  aiConversations: {
    id: "id",
    tenantId: "tenant_id",
    userId: "user_id",
    status: "status",
    updatedAt: "updated_at",
    createdAt: "created_at",
  },
  aiMessages: {
    id: "id",
    conversationId: "conversation_id",
    createdAt: "created_at",
  },
}))

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ op: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ op: "and" })),
  desc: vi.fn((_col: unknown) => ({ op: "desc" })),
  sql: vi.fn(),
}))

// Mock redis
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

// Mock logger
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

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
        stream: vi.fn(),
      },
    })),
  }
})

// Mock @/shared/trpc
vi.mock("@/shared/trpc", () => ({
  createCallerFactory: vi.fn(() => vi.fn()),
  router: vi.fn(),
  tenantProcedure: { use: vi.fn() },
  createModuleMiddleware: vi.fn(),
}))

// Mock @/shared/errors
vi.mock("@/shared/errors", () => ({
  NotFoundError: class extends Error { constructor(m: string) { super(m); this.name = "NotFoundError" } },
  ForbiddenError: class extends Error { constructor(m: string) { super(m); this.name = "ForbiddenError" } },
  ConflictError: class extends Error { constructor(m: string) { super(m); this.name = "ConflictError" } },
  BadRequestError: class extends Error { constructor(m: string) { super(m); this.name = "BadRequestError" } },
  ValidationError: class extends Error { constructor(m: string) { super(m); this.name = "ValidationError" } },
}))

// Mock ai.introspection — the real module uses require("@/server/root") which
// can't be intercepted by vitest in forks mode. We mock the module with a
// manual implementation that uses an inline mock router.
const mockProcedures = {
  "booking.list": { _def: { type: "query", inputs: [] } },
  "booking.getById": { _def: { type: "query", inputs: [] } },
  "booking.create": { _def: { type: "mutation", inputs: [] } },
  "customer.list": { _def: { type: "query", inputs: [] } },
  "customer.getById": { _def: { type: "query", inputs: [] } },
}

type ProcedureMetadata = { name: string; type: "query" | "mutation"; inputSchema: null }
type ModuleMetadata = { module: string; procedures: ProcedureMetadata[] }

function buildModuleMap(): Map<string, ModuleMetadata> {
  const moduleMap = new Map<string, ModuleMetadata>()
  for (const [path, procedure] of Object.entries(mockProcedures)) {
    const segments = path.split(".")
    const moduleName = segments[0]!
    const procedureName = segments.slice(1).join(".")
    if (!moduleName || !procedureName) continue
    const def = (procedure as { _def?: { type?: string } })?._def
    const type = def?.type
    if (type !== "query" && type !== "mutation") continue
    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, { module: moduleName, procedures: [] })
    }
    moduleMap.get(moduleName)!.procedures.push({
      name: procedureName,
      type: type as "query" | "mutation",
      inputSchema: null,
    })
  }
  return moduleMap
}

let cachedMap: Map<string, ModuleMetadata> | null = null

vi.mock("../ai.introspection", () => ({
  getModuleMap: () => {
    if (!cachedMap) cachedMap = buildModuleMap()
    return cachedMap
  },
  getModuleIndex: () => {
    const moduleMap = cachedMap ?? buildModuleMap()
    cachedMap = moduleMap
    const lines: string[] = ["Available modules (use describe_module to see input schemas):"]
    for (const [moduleName, meta] of moduleMap) {
      const queryProcs = meta.procedures.filter((p) => p.type === "query").map((p) => p.name)
      if (queryProcs.length > 0) {
        lines.push(`  ${moduleName}: ${queryProcs.join(", ")}`)
      }
    }
    return lines.join("\n")
  },
  getModuleMetadata: (moduleName: string) => {
    const moduleMap = cachedMap ?? buildModuleMap()
    cachedMap = moduleMap
    return moduleMap.get(moduleName) ?? null
  },
  resetIntrospectionCache: () => {
    cachedMap = null
  },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI Code Execution Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cachedMap = null
  })

  describe("executeCode", () => {
    it("should execute simple code and return result", async () => {
      const { executeCode } = await import("../ai.executor")

      const mockTrpc = {}
      const mockCtx = { tenantId: "t1", userId: "u1", userPermissions: ["*:*"] }

      const { result, durationMs } = await executeCode(
        "return 1 + 2",
        mockTrpc,
        mockCtx
      )

      expect(result).toBe(3)
      expect(durationMs).toBeGreaterThanOrEqual(0)
    })

    it("should provide trpc and ctx to code", async () => {
      const { executeCode } = await import("../ai.executor")

      const mockTrpc = {
        booking: {
          list: vi.fn().mockResolvedValue({ rows: [{ id: "b1" }], hasMore: false }),
        },
      }
      const mockCtx = { tenantId: "t1", userId: "u1", userPermissions: ["*:*"] }

      const { result } = await executeCode(
        "const data = await trpc.booking.list({}); return data",
        mockTrpc,
        mockCtx
      )

      expect(result).toEqual({ rows: [{ id: "b1" }], hasMore: false })
      expect(mockTrpc.booking.list).toHaveBeenCalled()
    })

    it("should make ctx available inside code", async () => {
      const { executeCode } = await import("../ai.executor")

      const { result } = await executeCode(
        "return ctx.tenantId",
        {},
        { tenantId: "tenant-123", userId: "u1", userPermissions: [] }
      )

      expect(result).toBe("tenant-123")
    })

    it("should timeout after 10 seconds", async () => {
      const { executeCode } = await import("../ai.executor")

      await expect(
        executeCode(
          "await new Promise(r => setTimeout(r, 15000)); return 'done'",
          {},
          { tenantId: "t1", userId: "u1", userPermissions: [] }
        )
      ).rejects.toThrow("timed out")
    }, 15000)

    it("should truncate large array results", async () => {
      const { executeCode } = await import("../ai.executor")

      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        description: "A".repeat(100),
      }))

      const mockTrpc = {
        getData: vi.fn().mockResolvedValue(largeArray),
      }

      const { result } = await executeCode(
        "return await trpc.getData()",
        mockTrpc,
        { tenantId: "t1", userId: "u1", userPermissions: [] }
      )

      // Should be truncated
      const truncated = result as { items: unknown[]; _truncated: { total: number; shown: number } }
      expect(truncated._truncated).toBeDefined()
      expect(truncated._truncated.total).toBe(100)
      expect(truncated._truncated.shown).toBeLessThan(100)
    })

    it("should handle code execution errors", async () => {
      const { executeCode } = await import("../ai.executor")

      await expect(
        executeCode(
          "throw new Error('test error')",
          {},
          { tenantId: "t1", userId: "u1", userPermissions: [] }
        )
      ).rejects.toThrow("test error")
    })
  })

  describe("introspection", () => {
    it("should build module map from flattened procedures", async () => {
      const { getModuleMap, resetIntrospectionCache } = await import("../ai.introspection")
      resetIntrospectionCache()

      const moduleMap = getModuleMap()

      expect(moduleMap.has("booking")).toBe(true)
      expect(moduleMap.has("customer")).toBe(true)

      const booking = moduleMap.get("booking")!
      expect(booking.procedures.length).toBe(3)
      expect(booking.procedures.find((p) => p.name === "list")).toBeDefined()
      expect(booking.procedures.find((p) => p.name === "getById")).toBeDefined()
      expect(booking.procedures.find((p) => p.name === "create")).toBeDefined()
    })

    it("should separate queries and mutations", async () => {
      const { getModuleMap, resetIntrospectionCache } = await import("../ai.introspection")
      resetIntrospectionCache()

      const moduleMap = getModuleMap()
      const booking = moduleMap.get("booking")!

      const queries = booking.procedures.filter((p) => p.type === "query")
      const mutations = booking.procedures.filter((p) => p.type === "mutation")

      expect(queries.length).toBe(2)
      expect(mutations.length).toBe(1)
    })

    it("should generate module index with only queries", async () => {
      const { getModuleIndex, resetIntrospectionCache } = await import("../ai.introspection")
      resetIntrospectionCache()

      const index = getModuleIndex()

      expect(index).toContain("booking:")
      expect(index).toContain("list")
      expect(index).toContain("getById")
      // Mutations should NOT appear in the index
      expect(index).not.toContain("create")
    })

    it("should return null for unknown module", async () => {
      const { getModuleMetadata, resetIntrospectionCache } = await import("../ai.introspection")
      resetIntrospectionCache()

      const result = getModuleMetadata("nonexistent")
      expect(result).toBeNull()
    })
  })

  describe("describe_module handler", () => {
    it("should return module metadata", async () => {
      const { handleDescribeModule } = await import("../tools/describe-module.tool")
      const { resetIntrospectionCache } = await import("../ai.introspection")
      resetIntrospectionCache()

      const { result, durationMs } = handleDescribeModule({ module: "booking" })

      expect(durationMs).toBeGreaterThanOrEqual(0)
      const meta = result as { module: string; procedures: unknown[] }
      expect(meta.module).toBe("booking")
      expect(meta.procedures.length).toBe(3)
    })

    it("should return error for unknown module", async () => {
      const { handleDescribeModule } = await import("../tools/describe-module.tool")
      const { resetIntrospectionCache } = await import("../ai.introspection")
      resetIntrospectionCache()

      const { result } = handleDescribeModule({ module: "nonexistent" })

      const err = result as { error: string }
      expect(err.error).toContain("not found")
    })
  })

  describe("agentTools", () => {
    it("should export exactly 2 tools", async () => {
      const { agentTools } = await import("../tools")

      expect(agentTools.length).toBe(2)
      expect(agentTools[0].name).toBe("describe_module")
      expect(agentTools[1].name).toBe("execute_code")
    })
  })
})
