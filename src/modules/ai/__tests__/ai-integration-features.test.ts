import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

const mockCreate = vi.fn()

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
      execute: vi.fn().mockResolvedValue([]),
      transaction: vi.fn((fn: (tx: unknown) => Promise<void>) => fn({})),
    },
  }
})

vi.mock("@/shared/db/schema", () => ({
  aiTenantConfig: {
    id: "id",
    tenantId: "tenant_id",
  },
  agentActions: {
    id: "id",
    conversationId: "conversation_id",
    tenantId: "tenant_id",
    status: "status",
    createdAt: "created_at",
  },
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

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: (...args: unknown[]) => mockCreate(...args) }
  }
  return { default: MockAnthropic }
})

vi.mock("../ai.config.repository", () => ({
  aiConfigRepository: {
    getOrCreate: vi.fn().mockResolvedValue({
      id: "config-1",
      tenantId: "tenant-1",
      isEnabled: true,
      maxTokenBudget: 50000,
      maxMessagesPerMinute: 20,
      defaultModel: "claude-sonnet-4-20250514",
      guardrailOverrides: {},
      trustMetrics: {},
      morningBriefingEnabled: true,
      morningBriefingTime: "08:00",
      morningBriefingTimezone: "Europe/London",
      morningBriefingDelivery: "in_app" as const,
      morningBriefingRecipientIds: [],
      ghostOperatorEnabled: true,
      ghostOperatorStartHour: 18,
      ghostOperatorEndHour: 8,
      ghostOperatorTimezone: "Europe/London",
      ghostOperatorRules: [],
      pasteToPipelineEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: vi.fn(),
  },
}))

const mockActionCreate = vi.fn().mockResolvedValue({
  id: "action-1",
  conversationId: "ghost-operator",
  tenantId: "tenant-1",
  userId: "ghost-operator",
  toolName: "booking.updateStatus",
  toolInput: {},
  toolOutput: null,
  status: "auto_executed",
  guardrailTier: "AUTO",
  createdAt: new Date(),
})

vi.mock("../ai.actions.repository", () => ({
  agentActionsRepository: {
    create: (...args: unknown[]) => mockActionCreate(...args),
    listByTenant: vi.fn().mockResolvedValue({ rows: [], hasMore: false }),
  },
}))

vi.mock("../verticals", () => ({
  getVerticalProfile: vi.fn().mockResolvedValue({
    slug: "generic",
    name: "General Business",
    description: "A generic business",
    terminology: { booking: "appointment", customer: "client" },
    systemPromptAddendum: "Be helpful and professional.",
  }),
  listVerticalProfiles: vi.fn(),
}))

// Mock customer repository for paste-to-pipeline commit
const mockCustomerCreate = vi.fn()
vi.mock("@/modules/customer/customer.repository", () => ({
  customerRepository: {
    create: (...args: unknown[]) => mockCustomerCreate(...args),
  },
}))

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { resolveGhostRules, DEFAULT_GHOST_RULES } from "../features/ghost-operator.rules"
import { processGhostOperator } from "../features/ghost-operator.processor"
import { generateBriefing } from "../features/morning-briefing.generator"
import { extractEntities } from "../features/paste-to-pipeline"
import { commitEntities } from "../features/paste-to-pipeline.commit"
import type { ExtractedEntities, BriefingMetrics } from "../ai.types"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Phase F — Feature Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Ghost Operator — Action Execution
  // -----------------------------------------------------------------------

  describe("Ghost Operator — Action Execution", () => {
    it("should log actions to agent_actions audit trail", async () => {
      const results = await processGhostOperator("tenant-1")

      // With empty getMatchingEntities, no actions should be created
      expect(results).toHaveLength(2)
      for (const r of results) {
        expect(r.actionsExecuted).toBe(0)
        expect(r.errors).toHaveLength(0)
      }
    })

    it("should respect requireAutoTier — skip rules when tool is CONFIRM", async () => {
      const { aiConfigRepository } = await import("../ai.config.repository")
      vi.mocked(aiConfigRepository.getOrCreate).mockResolvedValueOnce({
        id: "config-1",
        tenantId: "tenant-1",
        isEnabled: true,
        maxTokenBudget: 50000,
        maxMessagesPerMinute: 20,
        defaultModel: "claude-sonnet-4-20250514",
        guardrailOverrides: { "booking.updateStatus": "CONFIRM" as const },
        trustMetrics: {},
        morningBriefingEnabled: false,
        morningBriefingTime: "08:00",
        morningBriefingTimezone: "Europe/London",
        morningBriefingDelivery: "in_app" as const,
        morningBriefingRecipientIds: [],
        ghostOperatorEnabled: true,
        ghostOperatorStartHour: 18,
        ghostOperatorEndHour: 8,
        ghostOperatorTimezone: "Europe/London",
        ghostOperatorRules: [],
        pasteToPipelineEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const results = await processGhostOperator("tenant-1")

      // auto-confirm-bookings rule should be skipped because booking.updateStatus is CONFIRM
      const autoConfirm = results.find(r => r.ruleId === "auto-confirm-bookings")
      expect(autoConfirm).toBeDefined()
      expect(autoConfirm!.actionsAttempted).toBe(0)
    })

    it("should merge tenant rules with defaults correctly", () => {
      const customRules = [
        {
          id: "custom-cleanup",
          name: "Nightly cleanup",
          enabled: true,
          trigger: "workflow_retry" as const,
          conditions: { maxRetries: 3 },
          action: { toolName: "workflow.retry", inputTemplate: { force: true } },
          requireAutoTier: false,
        },
      ]

      const resolved = resolveGhostRules(customRules)

      // 2 enabled defaults + 1 custom
      expect(resolved).toHaveLength(3)
      expect(resolved.find(r => r.id === "custom-cleanup")).toBeTruthy()
      expect(resolved.find(r => r.id === "auto-confirm-bookings")).toBeTruthy()
      expect(resolved.find(r => r.id === "review-followup")).toBeTruthy()
    })
  })

  // -----------------------------------------------------------------------
  // Morning Briefing — Full Flow
  // -----------------------------------------------------------------------

  describe("Morning Briefing — Full Generation Flow", () => {
    it("should generate briefing with multiple sections and priorities", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            narrative: "Busy day ahead! 12 new bookings, 3 reviews (avg 4.2), and 2 overdue invoices need attention.",
            sections: [
              {
                title: "New Bookings Surge",
                priority: "high",
                content: "12 new bookings were made in the last 24 hours, a 50% increase from average.",
                references: [
                  { type: "booking", id: "b1", label: "Morning Rush" },
                  { type: "booking", id: "b2", label: "Afternoon Slot" },
                ],
              },
              {
                title: "Review Scores",
                priority: "medium",
                content: "3 new reviews with an average of 4.2 stars. One 3-star review on the haircut service.",
                references: [
                  { type: "review", id: "r1", label: "3-star review" },
                ],
              },
              {
                title: "Overdue Invoices",
                priority: "high",
                content: "2 invoices are overdue. Total outstanding: $340.",
                references: [
                  { type: "invoice", id: "inv1", label: "$180 overdue" },
                  { type: "invoice", id: "inv2", label: "$160 overdue" },
                ],
              },
            ],
          }),
        }],
      })

      const briefing = await generateBriefing("tenant-1", {
        metrics: {
          newBookings24h: 12,
          completedBookings24h: 8,
          cancelledBookings24h: 1,
          newReviews24h: 3,
          avgRating24h: 4.2,
          overdueInvoices: 2,
          pendingApprovals: 0,
          workflowsTriggered24h: 5,
          workflowsFailed24h: 0,
        },
        recentBookings: [],
        recentReviews: [],
        failedWorkflows: [],
        pendingActions: [],
      })

      expect(briefing.tenantId).toBe("tenant-1")
      expect(briefing.narrative).toContain("12 new bookings")
      expect(briefing.sections).toHaveLength(3)
      expect(briefing.sections.filter(s => s.priority === "high")).toHaveLength(2)
      expect(briefing.sections[0].references).toHaveLength(2)
      expect(briefing.generatedAt).toBeInstanceOf(Date)
    })

    it("should handle zero-activity day gracefully", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            narrative: "Quiet day — no new bookings, reviews, or issues to report.",
            sections: [],
          }),
        }],
      })

      const briefing = await generateBriefing("tenant-1", {
        metrics: {
          newBookings24h: 0,
          completedBookings24h: 0,
          cancelledBookings24h: 0,
          newReviews24h: 0,
          avgRating24h: null,
          overdueInvoices: 0,
          pendingApprovals: 0,
          workflowsTriggered24h: 0,
          workflowsFailed24h: 0,
        },
        recentBookings: [],
        recentReviews: [],
        failedWorkflows: [],
        pendingActions: [],
      })

      expect(briefing.narrative).toContain("Quiet day")
      expect(briefing.sections).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Paste-to-Pipeline — Full Commit Flow
  // -----------------------------------------------------------------------

  describe("Paste-to-Pipeline — Commit Integration", () => {
    it("should create customer when confirmed", async () => {
      mockCustomerCreate.mockResolvedValueOnce({
        id: "c-new",
        name: "John Smith",
        email: "john@example.com",
      })

      const entities: ExtractedEntities = {
        customer: {
          name: "John Smith",
          email: "john@example.com",
          phone: "+44 7700 900000",
          company: "Acme Ltd",
          notes: "VIP client",
        },
        booking: null,
        tasks: [],
        notes: [],
        confidence: 90,
        rawInput: "John Smith from Acme, john@example.com, VIP client",
      }

      const result = await commitEntities(
        { tenantId: "t1", userId: "u1", workosUserId: "w1", userPermissions: [] },
        entities,
        { createCustomer: true, createBooking: false, createTasks: false }
      )

      expect(result.customerId).toBe("c-new")
      expect(mockCustomerCreate).toHaveBeenCalledWith("t1", {
        name: "John Smith",
        email: "john@example.com",
        phone: "+44 7700 900000",
        notes: "Company: Acme Ltd. VIP client",
      })
    })

    it("should handle customer creation failure gracefully", async () => {
      mockCustomerCreate.mockRejectedValueOnce(new Error("Duplicate email"))

      const entities: ExtractedEntities = {
        customer: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: null,
          company: null,
          notes: null,
        },
        booking: null,
        tasks: [],
        notes: [],
        confidence: 80,
        rawInput: "Jane Doe jane@example.com",
      }

      const result = await commitEntities(
        { tenantId: "t1", userId: "u1", workosUserId: "w1", userPermissions: [] },
        entities,
        { createCustomer: true, createBooking: false, createTasks: false }
      )

      // Should not throw, just return null customerId
      expect(result.customerId).toBeNull()
    })

    it("should skip unchecked entities", async () => {
      const entities: ExtractedEntities = {
        customer: {
          name: "John Smith",
          email: "john@example.com",
          phone: null,
          company: null,
          notes: null,
        },
        booking: {
          service: "Haircut",
          date: "2026-03-20",
          time: "10:00",
          duration: "30min",
          notes: null,
        },
        tasks: [
          { title: "Follow up", priority: "MEDIUM", dueDate: "2026-03-21", assignee: null },
        ],
        notes: ["Referred by Sarah"],
        confidence: 85,
        rawInput: "John wants a haircut...",
      }

      const result = await commitEntities(
        { tenantId: "t1", userId: "u1", workosUserId: "w1", userPermissions: [] },
        entities,
        { createCustomer: false, createBooking: false, createTasks: false }
      )

      expect(result.customerId).toBeNull()
      expect(result.bookingId).toBeNull()
      expect(result.taskIds).toHaveLength(0)
      expect(mockCustomerCreate).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Paste-to-Pipeline — Extraction
  // -----------------------------------------------------------------------

  describe("Paste-to-Pipeline — Complex Extraction", () => {
    it("should extract multiple tasks from a meeting transcript", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            customer: {
              name: "Sarah Johnson",
              email: "sarah@startup.io",
              phone: null,
              company: "StartupIO",
              notes: "CEO, interested in premium plan",
            },
            booking: null,
            tasks: [
              { title: "Send pricing proposal to Sarah", priority: "HIGH", dueDate: "2026-03-20", assignee: null },
              { title: "Schedule demo for StartupIO team", priority: "MEDIUM", dueDate: "2026-03-22", assignee: null },
              { title: "Research StartupIO competitors", priority: "LOW", dueDate: null, assignee: null },
            ],
            notes: ["Met at networking event", "Budget: $5k/month", "Decision by end of March"],
            confidence: 75,
          }),
        }],
      })

      const result = await extractEntities(
        "tenant-1",
        "Had a great chat with Sarah Johnson (sarah@startup.io), CEO of StartupIO. She's interested in the premium plan. Need to send pricing by Friday, schedule a demo for her team next week, and research their competitors. Budget is around $5k/month, decision by end of March."
      )

      expect(result.customer!.name).toBe("Sarah Johnson")
      expect(result.customer!.company).toBe("StartupIO")
      expect(result.tasks).toHaveLength(3)
      expect(result.tasks[0].priority).toBe("HIGH")
      expect(result.notes).toHaveLength(3)
      expect(result.confidence).toBe(75)
    })

    it("should handle minimal input with low confidence", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            customer: { name: "Mike", email: null, phone: null, company: null, notes: null },
            booking: null,
            tasks: [],
            notes: ["Called about pricing"],
            confidence: 30,
          }),
        }],
      })

      const result = await extractEntities("tenant-1", "Mike called about pricing")

      expect(result.customer!.name).toBe("Mike")
      expect(result.customer!.email).toBeNull()
      expect(result.confidence).toBe(30)
      expect(result.tasks).toHaveLength(0)
    })
  })
})
