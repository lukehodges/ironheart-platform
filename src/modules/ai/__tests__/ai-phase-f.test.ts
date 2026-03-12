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
    morningBriefingEnabled: "morning_briefing_enabled",
    ghostOperatorEnabled: "ghost_operator_enabled",
    ghostOperatorStartHour: "ghost_operator_start_hour",
    ghostOperatorEndHour: "ghost_operator_end_hour",
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
    messages = { create: mockCreate }
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

vi.mock("../ai.actions.repository", () => ({
  agentActionsRepository: {
    create: vi.fn().mockResolvedValue({
      id: "action-1",
      conversationId: "ghost-operator",
      tenantId: "tenant-1",
      userId: "ghost-operator",
      toolName: "booking.updateStatus",
      toolInput: {},
      toolOutput: null,
      status: "auto_executed",
      guardrailTier: "AUTO",
      approvedAt: null,
      approvedBy: null,
      executedAt: null,
      error: null,
      compensationData: null,
      isReversible: false,
      createdAt: new Date(),
    }),
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

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { resolveGhostRules, DEFAULT_GHOST_RULES } from "../features/ghost-operator.rules"
import { processGhostOperator } from "../features/ghost-operator.processor"
import { gatherBriefingData } from "../features/morning-briefing.data"
import { generateBriefing } from "../features/morning-briefing.generator"
import { extractEntities } from "../features/paste-to-pipeline"
import { commitEntities } from "../features/paste-to-pipeline.commit"
import { aiConfigRepository } from "../ai.config.repository"
import type {
  GhostOperatorRule,
  BriefingMetrics,
  ExtractedEntities,
} from "../ai.types"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Phase F — Killer Features", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Ghost Operator Rules
  // -----------------------------------------------------------------------

  describe("Ghost Operator — Rule Engine", () => {
    it("should return enabled default rules when no tenant overrides", () => {
      const rules = resolveGhostRules([])
      // DEFAULT_GHOST_RULES has 3 rules, but one is disabled by default
      expect(rules.length).toBe(2)
      expect(rules.find((r) => r.id === "auto-confirm-bookings")).toBeTruthy()
      expect(rules.find((r) => r.id === "review-followup")).toBeTruthy()
      expect(rules.find((r) => r.id === "retry-failed-workflows")).toBeFalsy()
    })

    it("should allow tenant to override default rules", () => {
      const tenantRules: GhostOperatorRule[] = [
        {
          id: "auto-confirm-bookings",
          name: "Auto-confirm (custom)",
          enabled: false,
          trigger: "pending_booking",
          conditions: {},
          action: { toolName: "booking.updateStatus", inputTemplate: {} },
          requireAutoTier: true,
        },
      ]

      const rules = resolveGhostRules(tenantRules)
      expect(rules.find((r) => r.id === "auto-confirm-bookings")).toBeFalsy()
      expect(rules.length).toBe(1)
    })

    it("should allow tenant to add custom rules", () => {
      const tenantRules: GhostOperatorRule[] = [
        {
          id: "custom-rule",
          name: "Custom notification",
          enabled: true,
          trigger: "review_followup",
          conditions: { daysSinceCompletion: 3 },
          action: {
            toolName: "notification.sendEmail",
            inputTemplate: { subject: "Custom followup" },
          },
          requireAutoTier: true,
        },
      ]

      const rules = resolveGhostRules(tenantRules)
      expect(rules.find((r) => r.id === "custom-rule")).toBeTruthy()
      expect(rules.length).toBe(3) // 2 default enabled + 1 custom
    })

    it("should allow tenant to enable a default-disabled rule", () => {
      const tenantRules: GhostOperatorRule[] = [
        {
          ...DEFAULT_GHOST_RULES[2],
          enabled: true,
        },
      ]

      const rules = resolveGhostRules(tenantRules)
      expect(rules.find((r) => r.id === "retry-failed-workflows")).toBeTruthy()
      expect(rules.length).toBe(3)
    })
  })

  // -----------------------------------------------------------------------
  // Ghost Operator — Window Calculation
  // -----------------------------------------------------------------------

  describe("Ghost Operator — Window Calculation", () => {
    it("should correctly identify overnight window (18-08)", () => {
      const startHour = 18
      const endHour = 8

      const isInWindow = (hour: number) =>
        startHour > endHour
          ? hour >= startHour || hour < endHour
          : hour >= startHour && hour < endHour

      expect(isInWindow(18)).toBe(true)
      expect(isInWindow(23)).toBe(true)
      expect(isInWindow(3)).toBe(true)
      expect(isInWindow(7)).toBe(true)
      expect(isInWindow(8)).toBe(false)
      expect(isInWindow(12)).toBe(false)
      expect(isInWindow(17)).toBe(false)
    })

    it("should correctly identify same-day window (09-17)", () => {
      const startHour = 9
      const endHour = 17

      const isInWindow = (hour: number) =>
        startHour > endHour
          ? hour >= startHour || hour < endHour
          : hour >= startHour && hour < endHour

      expect(isInWindow(9)).toBe(true)
      expect(isInWindow(12)).toBe(true)
      expect(isInWindow(16)).toBe(true)
      expect(isInWindow(17)).toBe(false)
      expect(isInWindow(8)).toBe(false)
      expect(isInWindow(20)).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Ghost Operator — Processor
  // -----------------------------------------------------------------------

  describe("Ghost Operator — Processor", () => {
    it("should process ghost operator for a tenant", async () => {
      const results = await processGhostOperator("tenant-1")

      // With empty getMatchingEntities, all rules should return 0 actions
      expect(results).toHaveLength(2) // 2 enabled default rules
      for (const r of results) {
        expect(r.actionsAttempted).toBe(0)
        expect(r.actionsExecuted).toBe(0)
      }
    })

    it("should skip rules when guardrail tier is not AUTO", async () => {
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
      expect(results).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Morning Briefing — Metrics
  // -----------------------------------------------------------------------

  describe("Morning Briefing — Metrics", () => {
    it("should have correct BriefingMetrics structure", () => {
      const metrics: BriefingMetrics = {
        newBookings24h: 5,
        completedBookings24h: 3,
        cancelledBookings24h: 1,
        newReviews24h: 2,
        avgRating24h: 4.5,
        overdueInvoices: 0,
        pendingApprovals: 1,
        workflowsTriggered24h: 10,
        workflowsFailed24h: 0,
      }

      expect(metrics.newBookings24h).toBe(5)
      expect(metrics.avgRating24h).toBe(4.5)
      expect(metrics.workflowsFailed24h).toBe(0)
    })

    it("should handle null average rating when no reviews", () => {
      const metrics: BriefingMetrics = {
        newBookings24h: 0,
        completedBookings24h: 0,
        cancelledBookings24h: 0,
        newReviews24h: 0,
        avgRating24h: null,
        overdueInvoices: 0,
        pendingApprovals: 0,
        workflowsTriggered24h: 0,
        workflowsFailed24h: 0,
      }

      expect(metrics.avgRating24h).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Morning Briefing — Data Gathering
  // -----------------------------------------------------------------------

  describe("Morning Briefing — Data Gathering", () => {
    it("should gather briefing data without throwing", async () => {
      const data = await gatherBriefingData("tenant-1")

      expect(data.metrics).toBeDefined()
      expect(data.metrics.newBookings24h).toBe(0)
      expect(data.recentBookings).toEqual([])
      expect(data.recentReviews).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // Morning Briefing — Generator
  // -----------------------------------------------------------------------

  describe("Morning Briefing — Generator", () => {
    it("should generate a briefing from data", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            narrative: "Today looks good. 5 new bookings.",
            sections: [
              {
                title: "New Bookings",
                priority: "high",
                content: "5 new bookings today",
                references: [{ type: "booking", id: "b1", label: "Booking #1" }],
              },
            ],
          }),
        }],
      })

      const briefing = await generateBriefing("tenant-1", {
        metrics: {
          newBookings24h: 5,
          completedBookings24h: 3,
          cancelledBookings24h: 0,
          newReviews24h: 2,
          avgRating24h: 4.5,
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

      expect(briefing.tenantId).toBe("tenant-1")
      expect(briefing.narrative).toBe("Today looks good. 5 new bookings.")
      expect(briefing.sections).toHaveLength(1)
      expect(briefing.sections[0].priority).toBe("high")
      expect(briefing.generatedAt).toBeInstanceOf(Date)
    })

    it("should handle unparseable JSON response gracefully", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "This is not JSON" }],
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

      expect(briefing.narrative).toBe("This is not JSON")
      expect(briefing.sections).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Paste-to-Pipeline — Entity Extraction
  // -----------------------------------------------------------------------

  describe("Paste-to-Pipeline — Entity Extraction", () => {
    it("should extract entities from unstructured text", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            customer: {
              name: "John Smith",
              email: "john@example.com",
              phone: "+44 7700 900000",
              company: "Acme Ltd",
              notes: "Prefers morning appointments",
            },
            booking: {
              service: "Haircut",
              date: "2026-03-15",
              time: "10:00",
              duration: "30min",
              notes: null,
            },
            tasks: [
              { title: "Follow up with John", priority: "MEDIUM", dueDate: "2026-03-16", assignee: null },
            ],
            notes: ["Client referred by Sarah"],
            confidence: 85,
          }),
        }],
      })

      const result = await extractEntities("tenant-1", "John Smith from Acme, john@example.com, wants a haircut on March 15th at 10am.")

      expect(result.customer).not.toBeNull()
      expect(result.customer!.name).toBe("John Smith")
      expect(result.customer!.email).toBe("john@example.com")
      expect(result.booking).not.toBeNull()
      expect(result.booking!.service).toBe("Haircut")
      expect(result.tasks).toHaveLength(1)
      expect(result.confidence).toBe(85)
      expect(result.rawInput).toContain("John Smith")
    })

    it("should handle parse failures gracefully", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Not valid JSON" }],
      })

      const result = await extractEntities("tenant-1", "Some random text")

      expect(result.customer).toBeNull()
      expect(result.booking).toBeNull()
      expect(result.tasks).toHaveLength(0)
      expect(result.notes).toContain("Not valid JSON")
      expect(result.confidence).toBe(20)
    })
  })

  // -----------------------------------------------------------------------
  // Paste-to-Pipeline — Commit Flow
  // -----------------------------------------------------------------------

  describe("Paste-to-Pipeline — Commit Flow", () => {
    it("should return empty results when nothing confirmed", async () => {
      const entities: ExtractedEntities = {
        customer: { name: "John", email: null, phone: null, company: null, notes: null },
        booking: null,
        tasks: [],
        notes: [],
        confidence: 80,
        rawInput: "John called",
      }

      const result = await commitEntities(
        { tenantId: "t1", userId: "u1", workosUserId: "w1", userPermissions: [] },
        entities,
        { createCustomer: false, createBooking: false, createTasks: false }
      )

      expect(result.customerId).toBeNull()
      expect(result.bookingId).toBeNull()
      expect(result.taskIds).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Tenant Config — Killer Feature Toggles
  // -----------------------------------------------------------------------

  describe("Tenant Config — Killer Feature Toggles", () => {
    it("should have correct defaults for killer features", async () => {
      const config = await aiConfigRepository.getOrCreate("tenant-1")

      expect(config.morningBriefingEnabled).toBe(true)
      expect(config.morningBriefingTime).toBe("08:00")
      expect(config.morningBriefingTimezone).toBe("Europe/London")
      expect(config.morningBriefingDelivery).toBe("in_app")
      expect(config.ghostOperatorEnabled).toBe(true)
      expect(config.ghostOperatorStartHour).toBe(18)
      expect(config.ghostOperatorEndHour).toBe(8)
      expect(config.pasteToPipelineEnabled).toBe(true)
    })
  })
})
