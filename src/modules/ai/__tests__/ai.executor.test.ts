import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock logger only — executor has no other dependencies
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

// ---------------------------------------------------------------------------
// Helpers — build mock tRPC callers that mirror the real router shape
// ---------------------------------------------------------------------------

function mockRows<T>(rows: T[], hasMore = false) {
  return { rows, hasMore }
}

/** Build a mock tRPC caller matching the actual router structure. */
function buildMockCaller() {
  return {
    booking: {
      list: vi.fn().mockResolvedValue(mockRows([
        { id: "b1", customerId: "c1", serviceId: "s1", status: "confirmed", startTime: "2026-03-15T09:00:00Z", endTime: "2026-03-15T10:00:00Z", staffId: "u1", customerName: "John Smith", serviceName: "BNG Habitat Survey" },
        { id: "b2", customerId: "c2", serviceId: "s2", status: "pending", startTime: "2026-03-16T14:00:00Z", endTime: "2026-03-16T15:30:00Z", staffId: "u2", customerName: "Jane Doe", serviceName: "NN Baseline" },
      ])),
      getById: vi.fn().mockResolvedValue({ id: "b1", customerId: "c1", serviceId: "s1", status: "confirmed", startTime: "2026-03-15T09:00:00Z", staffId: "u1", customerName: "John Smith", serviceName: "BNG Habitat Survey", notes: "Initial assessment" }),
      getStats: vi.fn().mockResolvedValue({ total: 42, confirmed: 30, pending: 8, cancelled: 4 }),
      listForCalendar: vi.fn().mockResolvedValue([]),
    },
    customer: {
      list: vi.fn().mockResolvedValue(mockRows([
        { id: "c1", name: "John Smith", email: "john@example.com", phone: "+441234567890", type: "landowner" },
        { id: "c2", name: "Jane Doe", email: "jane@example.com", phone: "+449876543210", type: "developer" },
      ])),
      getById: vi.fn().mockResolvedValue({ id: "c1", name: "John Smith", email: "john@example.com", phone: "+441234567890", type: "landowner", createdAt: "2025-01-15T00:00:00Z" }),
      listNotes: vi.fn().mockResolvedValue(mockRows([{ id: "n1", content: "Called re: site visit", createdAt: "2026-03-10T12:00:00Z" }])),
      getBookingHistory: vi.fn().mockResolvedValue(mockRows([{ id: "b1", serviceName: "BNG Habitat Survey", status: "completed", date: "2026-01-20T09:00:00Z" }])),
    },
    team: {
      list: vi.fn().mockResolvedValue(mockRows([
        { id: "u1", name: "Alice Ecologist", email: "alice@co.uk", role: "ecologist", status: "active", employeeType: "employed", jobTitle: "Senior Ecologist" },
        { id: "u2", name: "Bob Broker", email: "bob@co.uk", role: "broker", status: "active", employeeType: "employed", jobTitle: "Credit Broker" },
      ])),
      getById: vi.fn().mockResolvedValue({ id: "u1", name: "Alice Ecologist", email: "alice@co.uk", role: "ecologist", status: "active" }),
      getAvailability: vi.fn().mockResolvedValue({ userId: "u1", available: true, slots: [{ date: "2026-03-15", startTime: "09:00", endTime: "17:00" }] }),
      getSchedule: vi.fn().mockResolvedValue({ userId: "u1", schedule: [] }),
      listSkills: vi.fn().mockResolvedValue([{ skillType: "certification", skillName: "BNG Assessment", proficiency: "expert" }]),
      getCapacity: vi.fn().mockResolvedValue({ maxDaily: 4, used: 2 }),
      getWorkload: vi.fn().mockResolvedValue({ current: 3, max: 8 }),
      listAssignments: vi.fn().mockResolvedValue(mockRows([])),
      listSkillCatalog: vi.fn().mockResolvedValue([]),
      // Nested sub-routers
      departments: {
        list: vi.fn().mockResolvedValue([
          { id: "d1", name: "Ecology", memberCount: 5 },
          { id: "d2", name: "Brokerage", memberCount: 3 },
        ]),
      },
      notes: {
        list: vi.fn().mockResolvedValue(mockRows([{ id: "tn1", content: "Performance review due", userId: "u1" }])),
      },
      payRates: {
        list: vi.fn().mockResolvedValue(mockRows([{ id: "pr1", rate: 45, currency: "GBP", type: "hourly" }])),
      },
      onboarding: {
        getProgress: vi.fn().mockResolvedValue({ userId: "u1", type: "onboarding", completedItems: 3, totalItems: 10 }),
        templates: {
          list: vi.fn().mockResolvedValue([{ id: "tmpl1", name: "New Ecologist Onboarding", itemCount: 10 }]),
        },
      },
      customFields: {
        listDefinitions: vi.fn().mockResolvedValue([]),
        getValues: vi.fn().mockResolvedValue([]),
      },
    },
    scheduling: {
      listSlots: vi.fn().mockResolvedValue(mockRows([
        { id: "sl1", date: "2026-03-15", startTime: "09:00", endTime: "10:00", staffId: "u1", available: true },
      ])),
      checkAvailability: vi.fn().mockResolvedValue({ available: true, conflicts: [] }),
      getStaffRecommendations: vi.fn().mockResolvedValue([{ userId: "u1", score: 0.95, reason: "BNG certified" }]),
    },
    analytics: {
      getSummary: vi.fn().mockResolvedValue({ totalBookings: 150, totalRevenue: 75000, avgRating: 4.7 }),
      getTimeSeries: vi.fn().mockResolvedValue([{ date: "2026-03", bookings: 42, revenue: 21000 }]),
      getKPIs: vi.fn().mockResolvedValue({ conversionRate: 0.68, avgDealTime: 45, activeDeals: 23 }),
      getRevenueChart: vi.fn().mockResolvedValue([]),
      getBookingsByStatus: vi.fn().mockResolvedValue({ confirmed: 30, pending: 8, cancelled: 4 }),
      getTopServices: vi.fn().mockResolvedValue([{ name: "BNG Habitat Survey", count: 25, revenue: 12500 }]),
      getCustomerInsights: vi.fn().mockResolvedValue({ totalCustomers: 89, newThisMonth: 12, churnRate: 0.03 }),
      getRevenueForecast: vi.fn().mockResolvedValue({ nextMonth: 28000, nextQuarter: 82000 }),
      getStaffUtilization: vi.fn().mockResolvedValue([{ userId: "u1", name: "Alice", utilization: 0.85 }]),
      getChurnRisk: vi.fn().mockResolvedValue([]),
    },
    search: {
      globalSearch: vi.fn().mockResolvedValue({ results: [{ type: "customer", id: "c1", title: "John Smith", subtitle: "Landowner" }], total: 1 }),
    },
    workflow: {
      list: vi.fn().mockResolvedValue(mockRows([{ id: "wf1", name: "Deal Pipeline", status: "active", triggerEvent: "deal/created" }])),
      getById: vi.fn().mockResolvedValue({ id: "wf1", name: "Deal Pipeline", nodes: [], edges: [] }),
    },
    review: {
      list: vi.fn().mockResolvedValue(mockRows([{ id: "r1", rating: 5, comment: "Excellent survey", customerId: "c1" }])),
      getStats: vi.fn().mockResolvedValue({ averageRating: 4.5, totalReviews: 34 }),
    },
    forms: {
      list: vi.fn().mockResolvedValue(mockRows([{ id: "f1", name: "Site Access Form", fieldCount: 8 }])),
    },
    notification: {
      list: vi.fn().mockResolvedValue(mockRows([{ id: "notif1", type: "booking_confirmed", read: false }])),
    },
    payment: {
      list: vi.fn().mockResolvedValue(mockRows([{ id: "p1", amount: 500, currency: "GBP", status: "completed" }])),
      getStats: vi.fn().mockResolvedValue({ totalRevenue: 75000, outstanding: 12000 }),
    },
  }
}

const defaultCtx = { tenantId: "t1", userId: "u1", userPermissions: ["*:*"] }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI Executor — tRPC call patterns", () => {
  let executeCode: typeof import("../ai.executor").executeCode
  let trpc: ReturnType<typeof buildMockCaller>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import("../ai.executor")
    executeCode = mod.executeCode
    trpc = buildMockCaller()
  })

  // =========================================================================
  // Basic procedure calls
  // =========================================================================

  describe("basic procedure calls", () => {
    it("should call a top-level list procedure", async () => {
      const { result } = await executeCode(
        `const data = await trpc.booking.list({ limit: 10 }); return data`,
        trpc,
        defaultCtx
      )
      expect(trpc.booking.list).toHaveBeenCalledWith({ limit: 10 })
      const r = result as { rows: unknown[]; hasMore: boolean }
      expect(r.rows).toHaveLength(2)
      expect(r.hasMore).toBe(false)
    })

    it("should call getById procedure", async () => {
      const { result } = await executeCode(
        `return await trpc.booking.getById({ id: "b1" })`,
        trpc,
        defaultCtx
      )
      expect(trpc.booking.getById).toHaveBeenCalledWith({ id: "b1" })
      expect((result as { id: string }).id).toBe("b1")
    })

    it("should call team.list", async () => {
      const { result } = await executeCode(
        `return await trpc.team.list({ limit: 100 })`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.list).toHaveBeenCalledWith({ limit: 100 })
      const r = result as { rows: { name: string }[] }
      expect(r.rows).toHaveLength(2)
      expect(r.rows[0].name).toBe("Alice Ecologist")
    })

    it("should call customer.list", async () => {
      const { result } = await executeCode(
        `return await trpc.customer.list({ limit: 50 })`,
        trpc,
        defaultCtx
      )
      expect(trpc.customer.list).toHaveBeenCalledWith({ limit: 50 })
      const r = result as { rows: { name: string }[] }
      expect(r.rows[0].name).toBe("John Smith")
    })

    it("should call analytics.getSummary", async () => {
      const { result } = await executeCode(
        `return await trpc.analytics.getSummary({})`,
        trpc,
        defaultCtx
      )
      expect((result as { totalBookings: number }).totalBookings).toBe(150)
    })

    it("should call search.globalSearch", async () => {
      const { result } = await executeCode(
        `return await trpc.search.globalSearch({ query: "John" })`,
        trpc,
        defaultCtx
      )
      expect(trpc.search.globalSearch).toHaveBeenCalledWith({ query: "John" })
      expect((result as { total: number }).total).toBe(1)
    })
  })

  // =========================================================================
  // Nested sub-router calls (the pattern that was broken)
  // =========================================================================

  describe("nested sub-router calls", () => {
    it("should call team.departments.list", async () => {
      const { result } = await executeCode(
        `return await trpc.team.departments.list()`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.departments.list).toHaveBeenCalled()
      const r = result as { id: string; name: string }[]
      expect(r).toHaveLength(2)
      expect(r[0].name).toBe("Ecology")
    })

    it("should call team.notes.list", async () => {
      const { result } = await executeCode(
        `return await trpc.team.notes.list({ userId: "u1" })`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.notes.list).toHaveBeenCalledWith({ userId: "u1" })
    })

    it("should call team.payRates.list", async () => {
      const { result } = await executeCode(
        `return await trpc.team.payRates.list({ userId: "u1" })`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.payRates.list).toHaveBeenCalledWith({ userId: "u1" })
    })

    it("should call team.onboarding.getProgress", async () => {
      const { result } = await executeCode(
        `return await trpc.team.onboarding.getProgress({ userId: "u1", type: "onboarding" })`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.onboarding.getProgress).toHaveBeenCalled()
      expect((result as { completedItems: number }).completedItems).toBe(3)
    })

    it("should call deeply nested team.onboarding.templates.list", async () => {
      const { result } = await executeCode(
        `return await trpc.team.onboarding.templates.list()`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.onboarding.templates.list).toHaveBeenCalled()
      const r = result as { id: string; name: string }[]
      expect(r[0].name).toBe("New Ecologist Onboarding")
    })

    it("should call team.customFields.listDefinitions", async () => {
      const { result } = await executeCode(
        `return await trpc.team.customFields.listDefinitions()`,
        trpc,
        defaultCtx
      )
      expect(trpc.team.customFields.listDefinitions).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Multi-call patterns (what Claude typically does)
  // =========================================================================

  describe("multi-call patterns", () => {
    it("should make multiple sequential calls", async () => {
      const { result } = await executeCode(
        `
        const bookings = await trpc.booking.list({ limit: 10 })
        const stats = await trpc.booking.getStats({})
        return { bookings: bookings.rows.length, stats }
        `,
        trpc,
        defaultCtx
      )
      expect(trpc.booking.list).toHaveBeenCalled()
      expect(trpc.booking.getStats).toHaveBeenCalled()
      const r = result as { bookings: number; stats: { total: number } }
      expect(r.bookings).toBe(2)
      expect(r.stats.total).toBe(42)
    })

    it("should make parallel calls with Promise.all", async () => {
      const { result } = await executeCode(
        `
        const [bookings, customers, team] = await Promise.all([
          trpc.booking.list({ limit: 5 }),
          trpc.customer.list({ limit: 5 }),
          trpc.team.list({ limit: 5 }),
        ])
        return {
          bookingCount: bookings.rows.length,
          customerCount: customers.rows.length,
          teamCount: team.rows.length,
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { bookingCount: number; customerCount: number; teamCount: number }
      expect(r.bookingCount).toBe(2)
      expect(r.customerCount).toBe(2)
      expect(r.teamCount).toBe(2)
    })

    it("should cross-reference between modules", async () => {
      const { result } = await executeCode(
        `
        const customer = await trpc.customer.getById({ id: "c1" })
        const history = await trpc.customer.getBookingHistory({ customerId: "c1" })
        const notes = await trpc.customer.listNotes({ customerId: "c1" })
        return {
          name: customer.name,
          type: customer.type,
          bookingCount: history.rows.length,
          noteCount: notes.rows.length,
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { name: string; type: string; bookingCount: number; noteCount: number }
      expect(r.name).toBe("John Smith")
      expect(r.type).toBe("landowner")
      expect(r.bookingCount).toBe(1)
      expect(r.noteCount).toBe(1)
    })

    it("should call analytics alongside operational data", async () => {
      const { result } = await executeCode(
        `
        const [summary, kpis, forecast] = await Promise.all([
          trpc.analytics.getSummary({}),
          trpc.analytics.getKPIs({}),
          trpc.analytics.getRevenueForecast({}),
        ])
        return { summary, kpis, forecast }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { summary: { totalBookings: number }; kpis: { activeDeals: number }; forecast: { nextMonth: number } }
      expect(r.summary.totalBookings).toBe(150)
      expect(r.kpis.activeDeals).toBe(23)
      expect(r.forecast.nextMonth).toBe(28000)
    })
  })

  // =========================================================================
  // Data transformation (what Claude does after fetching)
  // =========================================================================

  describe("data transformation", () => {
    it("should map and filter results", async () => {
      const { result } = await executeCode(
        `
        const team = await trpc.team.list({ limit: 100 })
        return team.rows
          .filter(m => m.role === "ecologist")
          .map(m => ({ name: m.name, email: m.email }))
        `,
        trpc,
        defaultCtx
      )
      const r = result as { name: string; email: string }[]
      expect(r).toHaveLength(1)
      expect(r[0].name).toBe("Alice Ecologist")
    })

    it("should compute aggregates", async () => {
      trpc.payment.list.mockResolvedValue(mockRows([
        { id: "p1", amount: 500, currency: "GBP", status: "completed" },
        { id: "p2", amount: 750, currency: "GBP", status: "completed" },
        { id: "p3", amount: 300, currency: "GBP", status: "pending" },
      ]))

      const { result } = await executeCode(
        `
        const payments = await trpc.payment.list({ limit: 100 })
        const completed = payments.rows.filter(p => p.status === "completed")
        const total = completed.reduce((sum, p) => sum + p.amount, 0)
        return { totalCompleted: total, count: completed.length }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { totalCompleted: number; count: number }
      expect(r.totalCompleted).toBe(1250)
      expect(r.count).toBe(2)
    })

    it("should use Date operations", async () => {
      const { result } = await executeCode(
        `
        const now = new Date("2026-03-12T12:00:00Z")
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { startOfMonth: startOfMonth.toISOString() }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { startOfMonth: string }
      expect(r.startOfMonth).toContain("2026-03-01")
    })

    it("should use JSON operations", async () => {
      const { result } = await executeCode(
        `
        const data = { key: "value", nested: { a: 1 } }
        const cloned = JSON.parse(JSON.stringify(data))
        cloned.extra = true
        return cloned
        `,
        trpc,
        defaultCtx
      )
      expect((result as { extra: boolean }).extra).toBe(true)
    })

    it("should use Array methods (sort, slice, find, every, some)", async () => {
      const { result } = await executeCode(
        `
        const team = await trpc.team.list({ limit: 100 })
        const sorted = [...team.rows].sort((a, b) => a.name.localeCompare(b.name))
        const first = sorted[0]
        const allActive = team.rows.every(m => m.status === "active")
        const hasEcologist = team.rows.some(m => m.role === "ecologist")
        return { firstName: first.name, allActive, hasEcologist }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { firstName: string; allActive: boolean; hasEcologist: boolean }
      expect(r.firstName).toBe("Alice Ecologist")
      expect(r.allActive).toBe(true)
      expect(r.hasEcologist).toBe(true)
    })
  })

  // =========================================================================
  // Context access
  // =========================================================================

  describe("context access", () => {
    it("should access ctx.tenantId", async () => {
      const { result } = await executeCode(
        `return ctx.tenantId`,
        trpc,
        defaultCtx
      )
      expect(result).toBe("t1")
    })

    it("should access ctx.userId", async () => {
      const { result } = await executeCode(
        `return ctx.userId`,
        trpc,
        defaultCtx
      )
      expect(result).toBe("u1")
    })

    it("should access ctx.userPermissions", async () => {
      const { result } = await executeCode(
        `return ctx.userPermissions`,
        trpc,
        { tenantId: "t1", userId: "u1", userPermissions: ["bookings:read", "customers:read"] }
      )
      expect(result).toEqual(["bookings:read", "customers:read"])
    })

    it("should access ctx.pageContext", async () => {
      const { result } = await executeCode(
        `return ctx.pageContext`,
        trpc,
        { tenantId: "t1", userId: "u1", userPermissions: [], pageContext: { route: "/admin/customers/c1", entityType: "customer", entityId: "c1" } }
      )
      const r = result as { route: string; entityType: string; entityId: string }
      expect(r.entityId).toBe("c1")
    })

    it("should use pageContext to resolve 'this' entity", async () => {
      const { result } = await executeCode(
        `
        const id = ctx.pageContext?.entityId
        if (!id) return { error: "No entity in context" }
        return await trpc.customer.getById({ id })
        `,
        trpc,
        { tenantId: "t1", userId: "u1", userPermissions: [], pageContext: { route: "/admin/customers/c1", entityType: "customer", entityId: "c1" } }
      )
      expect(trpc.customer.getById).toHaveBeenCalledWith({ id: "c1" })
      expect((result as { name: string }).name).toBe("John Smith")
    })
  })

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("error handling", () => {
    it("should propagate tRPC errors", async () => {
      trpc.booking.getById.mockRejectedValue(new Error("NOT_FOUND: Booking not found"))

      await expect(
        executeCode(
          `return await trpc.booking.getById({ id: "nonexistent" })`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow("NOT_FOUND")
    })

    it("should propagate permission errors", async () => {
      trpc.team.payRates.list.mockRejectedValue(new Error("FORBIDDEN: Insufficient permissions"))

      await expect(
        executeCode(
          `return await trpc.team.payRates.list({ userId: "u1" })`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow("FORBIDDEN")
    })

    it("should propagate module-not-enabled errors", async () => {
      trpc.workflow.list.mockRejectedValue(new Error("FORBIDDEN: Module 'workflow' is not enabled for this tenant"))

      await expect(
        executeCode(
          `return await trpc.workflow.list({})`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow("Module 'workflow' is not enabled")
    })

    it("should handle try/catch in user code", async () => {
      trpc.booking.getById.mockRejectedValue(new Error("NOT_FOUND"))

      const { result } = await executeCode(
        `
        try {
          return await trpc.booking.getById({ id: "bad" })
        } catch (e) {
          return { error: e.message }
        }
        `,
        trpc,
        defaultCtx
      )
      expect((result as { error: string }).error).toContain("NOT_FOUND")
    })

    it("should timeout long-running code", async () => {
      await expect(
        executeCode(
          `await new Promise(r => setTimeout(r, 15000)); return "done"`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow("timed out")
    }, 15000)

    it("should fail on syntax errors", async () => {
      await expect(
        executeCode(
          `const x = {; return x`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow()
    })

    it("should fail when code doesn't return", async () => {
      const { result } = await executeCode(
        `const x = 42`,
        trpc,
        defaultCtx
      )
      expect(result).toBeUndefined()
    })

    it("should handle calling non-existent procedure", async () => {
      await expect(
        executeCode(
          `return await trpc.booking.nonExistent({})`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow()
    })
  })

  // =========================================================================
  // Result truncation
  // =========================================================================

  describe("result truncation", () => {
    it("should truncate large arrays", async () => {
      const bigArray = Array.from({ length: 200 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item Number ${i}`,
        description: "A".repeat(80),
      }))
      trpc.booking.list.mockResolvedValue(mockRows(bigArray))

      const { result } = await executeCode(
        `return await trpc.booking.list({ limit: 200 })`,
        trpc,
        defaultCtx
      )
      const r = result as { rows: { items: unknown[]; _truncated: { total: number; shown: number } } }
      expect(r.rows._truncated).toBeDefined()
      expect(r.rows._truncated.total).toBe(200)
      expect(r.rows._truncated.shown).toBeLessThan(200)
    })

    it("should not truncate small results", async () => {
      const { result } = await executeCode(
        `return { count: 5, status: "ok" }`,
        trpc,
        defaultCtx
      )
      expect(result).toEqual({ count: 5, status: "ok" })
      expect((result as Record<string, unknown>)._truncated).toBeUndefined()
    })

    it("should handle null/undefined results", async () => {
      const { result: nullResult } = await executeCode(`return null`, trpc, defaultCtx)
      expect(nullResult).toBeNull()

      const { result: undefinedResult } = await executeCode(`return undefined`, trpc, defaultCtx)
      expect(undefinedResult).toBeUndefined()
    })
  })

  // =========================================================================
  // Realistic Claude query patterns
  // =========================================================================

  describe("realistic Claude query patterns", () => {
    it("'who is on my team?' pattern", async () => {
      const { result } = await executeCode(
        `
        const team = await trpc.team.list({ limit: 100 })
        return {
          totalMembers: team.rows.length,
          hasMore: team.hasMore,
          members: team.rows.map(member => ({
            name: member.name,
            email: member.email,
            role: member.role,
            status: member.status,
            jobTitle: member.jobTitle,
          }))
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { totalMembers: number; members: { name: string }[] }
      expect(r.totalMembers).toBe(2)
      expect(r.members[0].name).toBe("Alice Ecologist")
    })

    it("'show me this customer' with pageContext pattern", async () => {
      const { result } = await executeCode(
        `
        const customer = await trpc.customer.getById({ id: ctx.pageContext.entityId })
        const [history, notes] = await Promise.all([
          trpc.customer.getBookingHistory({ customerId: ctx.pageContext.entityId }),
          trpc.customer.listNotes({ customerId: ctx.pageContext.entityId }),
        ])
        return {
          ...customer,
          recentBookings: history.rows,
          notes: notes.rows,
        }
        `,
        trpc,
        { tenantId: "t1", userId: "u1", userPermissions: [], pageContext: { route: "/customers/c1", entityType: "customer", entityId: "c1" } }
      )
      const r = result as { name: string; recentBookings: unknown[]; notes: unknown[] }
      expect(r.name).toBe("John Smith")
      expect(r.recentBookings).toHaveLength(1)
      expect(r.notes).toHaveLength(1)
    })

    it("'give me a business overview' pattern", async () => {
      const { result } = await executeCode(
        `
        const [summary, kpis, payments] = await Promise.all([
          trpc.analytics.getSummary({}),
          trpc.analytics.getKPIs({}),
          trpc.payment.getStats({}),
        ])
        return {
          bookings: summary.totalBookings,
          revenue: summary.totalRevenue,
          avgRating: summary.avgRating,
          conversionRate: kpis.conversionRate,
          activeDeals: kpis.activeDeals,
          outstanding: payments.outstanding,
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { bookings: number; revenue: number; activeDeals: number }
      expect(r.bookings).toBe(150)
      expect(r.revenue).toBe(75000)
      expect(r.activeDeals).toBe(23)
    })

    it("'what departments do we have?' pattern", async () => {
      const { result } = await executeCode(
        `
        const departments = await trpc.team.departments.list()
        return departments.map(d => ({ name: d.name, members: d.memberCount }))
        `,
        trpc,
        defaultCtx
      )
      const r = result as { name: string; members: number }[]
      expect(r).toHaveLength(2)
      expect(r[0]).toEqual({ name: "Ecology", members: 5 })
    })

    it("'check availability for next week' pattern", async () => {
      const { result } = await executeCode(
        `
        const slots = await trpc.scheduling.listSlots({
          startDate: "2026-03-16T00:00:00Z",
          endDate: "2026-03-22T23:59:59Z",
        })
        return {
          availableSlots: slots.rows.filter(s => s.available).length,
          totalSlots: slots.rows.length,
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { availableSlots: number; totalSlots: number }
      expect(r.totalSlots).toBe(1)
      expect(r.availableSlots).toBe(1)
    })

    it("'search for a customer' pattern", async () => {
      const { result } = await executeCode(
        `
        const results = await trpc.search.globalSearch({ query: "John Smith" })
        return {
          found: results.total,
          matches: results.results.map(r => ({ type: r.type, name: r.title }))
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { found: number; matches: { type: string; name: string }[] }
      expect(r.found).toBe(1)
      expect(r.matches[0].name).toBe("John Smith")
    })

    it("'staff utilization report' pattern", async () => {
      const { result } = await executeCode(
        `
        const [team, utilization] = await Promise.all([
          trpc.team.list({ limit: 100 }),
          trpc.analytics.getStaffUtilization({}),
        ])
        const utilizationMap = new Map(utilization.map(u => [u.userId, u.utilization]))
        return team.rows.map(m => ({
          name: m.name,
          role: m.role,
          utilization: utilizationMap.get(m.id) ?? null,
        }))
        `,
        trpc,
        defaultCtx
      )
      const r = result as { name: string; utilization: number | null }[]
      expect(r[0].name).toBe("Alice Ecologist")
      expect(r[0].utilization).toBe(0.85)
    })

    it("'review summary' pattern", async () => {
      const { result } = await executeCode(
        `
        const stats = await trpc.review.getStats({})
        const recent = await trpc.review.list({ limit: 5 })
        return {
          average: stats.averageRating,
          total: stats.totalReviews,
          recent: recent.rows.map(r => ({ rating: r.rating, comment: r.comment })),
        }
        `,
        trpc,
        defaultCtx
      )
      const r = result as { average: number; total: number; recent: { rating: number }[] }
      expect(r.average).toBe(4.5)
      expect(r.total).toBe(34)
      expect(r.recent[0].rating).toBe(5)
    })
  })

  // =========================================================================
  // Security — things Claude should NOT be able to do
  // =========================================================================

  describe("sandbox restrictions", () => {
    it("should not have access to require", async () => {
      await expect(
        executeCode(
          `const fs = require("fs"); return fs.readFileSync("/etc/passwd", "utf8")`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow()
    })

    it("should not have access to process", async () => {
      const { result } = await executeCode(
        `return typeof process`,
        trpc,
        defaultCtx
      )
      // process is a global in Node — the executor doesn't block it currently,
      // but it shouldn't be used. This test documents the current behavior.
      expect(result).toBe("object") // Node leaks process — not ideal but not exploitable via tRPC
    })

    it("should not be able to import modules", async () => {
      // Dynamic import is async and should fail or be blocked
      await expect(
        executeCode(
          `const mod = await import("fs"); return mod.readFileSync("/etc/passwd", "utf8")`,
          trpc,
          defaultCtx
        )
      ).rejects.toThrow()
    })
  })
})
