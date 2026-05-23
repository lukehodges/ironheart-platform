import { describe, it, expect, vi, beforeEach } from "vitest"
import { ValidationError } from "@/shared/errors"

// ── vi.hoisted — create mocks before module-hoisting ─────────────────────────

const mockRepo = vi.hoisted(() => ({
  getChartByEngagement: vi.fn(),
  createNode: vi.fn(),
  logActivity: vi.fn(),
}))

const mockDbQuery = vi.hoisted(() => ({
  engagements: { findFirst: vi.fn() },
  customers: { findFirst: vi.fn() },
}))

const mockInngestSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock("../onboarding.repository", () => ({
  onboardingRepository: mockRepo,
}))

vi.mock("@/shared/db", () => ({
  db: {
    query: mockDbQuery,
  },
}))

vi.mock("@/shared/inngest", () => ({
  inngest: { send: mockInngestSend },
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

// ── import after mocks ────────────────────────────────────────────────────────

import {
  resolveTier,
  matchQuestionnaireTemplate,
  mapNodeToTemplate,
  onboardingService,
} from "../onboarding.service"
import type { OrgChartNodeRecord } from "../onboarding.types"

// ── helpers ───────────────────────────────────────────────────────────────────

let nodeIdCounter = 0
function makeNode(overrides: Partial<OrgChartNodeRecord> = {}): OrgChartNodeRecord {
  return {
    id: `node-${++nodeIdCounter}`,
    tenantId: "tenant-1",
    engagementId: "eng-1",
    parentId: null,
    label: "Test Node",
    type: "DEPARTMENT",
    headcount: null,
    contactUserId: null,
    contactEmail: null,
    contactName: null,
    contactRole: null,
    interviewMode: "OWNER_ONLY",
    sampleSize: null,
    templateSlugOverride: null,
    sortOrder: 0,
    version: 1,
    lastEditedBy: "CONSULTANT",
    lastEditedAt: new Date("2026-01-01"),
    formSendId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  nodeIdCounter = 0
  // Default createNode returns a node with the label provided
  mockRepo.createNode.mockImplementation(async (input: { label: string }) =>
    makeNode({ label: input.label, id: `created-${++nodeIdCounter}` })
  )
  mockRepo.logActivity.mockResolvedValue({})
  mockInngestSend.mockResolvedValue(undefined)
})

// ── resolveTier ───────────────────────────────────────────────────────────────

describe("resolveTier", () => {
  it("returns MICRO for null teamSize", () => {
    expect(resolveTier(null)).toBe("MICRO")
  })

  it("returns MICRO for teamSize < 5", () => {
    expect(resolveTier(4)).toBe("MICRO")
    expect(resolveTier(0)).toBe("MICRO")
    expect(resolveTier(1)).toBe("MICRO")
  })

  it("returns SMALL for teamSize = 5", () => {
    expect(resolveTier(5)).toBe("SMALL")
  })

  it("returns SMALL for teamSize = 15", () => {
    expect(resolveTier(15)).toBe("SMALL")
  })

  it("returns MID for teamSize = 16", () => {
    expect(resolveTier(16)).toBe("MID")
  })

  it("returns MID for teamSize = 50", () => {
    expect(resolveTier(50)).toBe("MID")
  })

  it("returns LARGE for teamSize = 51", () => {
    expect(resolveTier(51)).toBe("LARGE")
  })

  it("returns LARGE for very large team", () => {
    expect(resolveTier(200)).toBe("LARGE")
  })
})

// ── matchQuestionnaireTemplate ────────────────────────────────────────────────

describe("matchQuestionnaireTemplate", () => {
  it("maps owner role to owner-director", () => {
    expect(matchQuestionnaireTemplate("Owner")).toBe("questionnaire-owner-director")
  })

  it("maps 'Finance Lead' to finance-admin", () => {
    expect(matchQuestionnaireTemplate("Finance Lead")).toBe("questionnaire-finance-admin")
  })

  it("maps 'VP Sales' to sales-marketing", () => {
    expect(matchQuestionnaireTemplate("VP Sales")).toBe("questionnaire-sales-marketing")
  })

  it("maps 'Operations Manager' to operations", () => {
    expect(matchQuestionnaireTemplate("Operations Manager")).toBe("questionnaire-operations")
  })

  it("maps unknown role 'Junior dev' to team-member", () => {
    expect(matchQuestionnaireTemplate("Junior dev")).toBe("questionnaire-team-member")
  })

  it("is case-insensitive", () => {
    expect(matchQuestionnaireTemplate("CEO")).toBe("questionnaire-owner-director")
    expect(matchQuestionnaireTemplate("ceo")).toBe("questionnaire-owner-director")
    expect(matchQuestionnaireTemplate("FINANCE MANAGER")).toBe("questionnaire-finance-admin")
  })

  it("matches on partial keyword", () => {
    expect(matchQuestionnaireTemplate("Marketing Specialist")).toBe("questionnaire-sales-marketing")
    expect(matchQuestionnaireTemplate("Bookkeeper")).toBe("questionnaire-finance-admin")
  })
})

// ── mapNodeToTemplate ─────────────────────────────────────────────────────────

describe("mapNodeToTemplate", () => {
  it("returns templateSlugOverride when set", () => {
    expect(
      mapNodeToTemplate({ templateSlugOverride: "custom-slug", contactRole: "Owner", label: "CEO" })
    ).toBe("custom-slug")
  })

  it("falls back to contactRole when no override", () => {
    expect(
      mapNodeToTemplate({
        templateSlugOverride: null,
        contactRole: "Finance Manager",
        label: "Some Label",
      })
    ).toBe("questionnaire-finance-admin")
  })

  it("falls back to label when no override and no contactRole", () => {
    expect(
      mapNodeToTemplate({ templateSlugOverride: null, contactRole: null, label: "Sales Lead" })
    ).toBe("questionnaire-sales-marketing")
  })

  it("returns team-member for unknown label with no override or role", () => {
    expect(
      mapNodeToTemplate({ templateSlugOverride: null, contactRole: null, label: "General Staff" })
    ).toBe("questionnaire-team-member")
  })
})

// ── seedChartFromTier ─────────────────────────────────────────────────────────

describe("onboardingService.seedChartFromTier", () => {
  const BASE = { tenantId: "tenant-1", engagementId: "eng-1" }

  function setupEngagement(teamSize: number | null) {
    mockDbQuery.engagements.findFirst.mockResolvedValue({
      id: "eng-1",
      customerId: "cust-1",
      qualificationData: teamSize != null ? { teamSize } : null,
    })
    mockDbQuery.customers.findFirst.mockResolvedValue({
      id: "cust-1",
      firstName: "Acme",
      lastName: "Corp",
      notes: "Acme Ltd",
    })
  }

  it("seeds MICRO tier: root + 2 children = 3 total nodes created", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(3) // teamSize 3 → MICRO

    const result = await onboardingService.seedChartFromTier(BASE)

    expect(result.tier).toBe("MICRO")
    expect(result.alreadySeeded).toBe(false)
    expect(result.created).toBe(3)
    expect(mockRepo.createNode).toHaveBeenCalledTimes(3)
  })

  it("seeds SMALL tier: root + 5 children = 6 total nodes created", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(10) // teamSize 10 → SMALL

    const result = await onboardingService.seedChartFromTier(BASE)

    expect(result.tier).toBe("SMALL")
    expect(result.created).toBe(6)
    expect(mockRepo.createNode).toHaveBeenCalledTimes(6)
  })

  it("seeds MID tier: root + 5 children = 6 total nodes created", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(30) // teamSize 30 → MID

    const result = await onboardingService.seedChartFromTier(BASE)

    expect(result.tier).toBe("MID")
    expect(result.created).toBe(6)
  })

  it("seeds LARGE tier: root + 9 children = 10 total nodes created", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(100) // teamSize 100 → LARGE

    const result = await onboardingService.seedChartFromTier(BASE)

    expect(result.tier).toBe("LARGE")
    expect(result.created).toBe(10)
    expect(mockRepo.createNode).toHaveBeenCalledTimes(10)
  })

  it("is idempotent — returns alreadySeeded=true when nodes already exist", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([makeNode()]) // existing nodes

    const result = await onboardingService.seedChartFromTier(BASE)

    expect(result.alreadySeeded).toBe(true)
    expect(result.created).toBe(0)
    expect(mockRepo.createNode).not.toHaveBeenCalled()
    expect(mockDbQuery.engagements.findFirst).not.toHaveBeenCalled()
  })

  it("logs activity with action chart.seeded after successful seed", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(5)

    await onboardingService.seedChartFromTier({ ...BASE, actorName: "TestActor" })

    expect(mockRepo.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "chart.seeded",
        actorName: "TestActor",
      })
    )
  })

  it("emits engagement/chart-seeded inngest event after successful seed", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(5)

    await onboardingService.seedChartFromTier(BASE)

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "engagement/chart-seeded" })
    )
  })

  it("does not throw if inngest send fails (non-blocking)", async () => {
    mockRepo.getChartByEngagement.mockResolvedValue([])
    setupEngagement(5)
    mockInngestSend.mockRejectedValueOnce(new Error("inngest down"))

    await expect(onboardingService.seedChartFromTier(BASE)).resolves.toBeDefined()
  })
})

// ── planOnboardingForms ───────────────────────────────────────────────────────

describe("onboardingService.planOnboardingForms", () => {
  const BASE = { tenantId: "tenant-1", engagementId: "eng-1" }

  beforeEach(() => {
    mockDbQuery.engagements.findFirst.mockResolvedValue({
      id: "eng-1",
      qualificationData: { teamSize: 10 },
    })
  })

  it("SKIP node contributes nothing to sends", async () => {
    const skipNode = makeNode({ id: "skip-1", interviewMode: "SKIP", parentId: null })
    mockRepo.getChartByEngagement.mockResolvedValue([skipNode])

    const plan = await onboardingService.planOnboardingForms(BASE)

    expect(plan.sends).toHaveLength(0)
    expect(plan.totalSends).toBe(0)
  })

  it("OWNER_ONLY node is not added itself but its children are walked", async () => {
    const parent = makeNode({ id: "p1", interviewMode: "OWNER_ONLY", parentId: null })
    const child = makeNode({
      id: "c1",
      interviewMode: "ALL",
      type: "PERSON",
      parentId: "p1",
      contactEmail: "child@example.com",
      contactName: "Child Person",
    })
    mockRepo.getChartByEngagement.mockResolvedValue([parent, child])

    const plan = await onboardingService.planOnboardingForms(BASE)

    expect(plan.sends).toHaveLength(1)
    expect(plan.sends[0].contactEmail).toBe("child@example.com")
  })

  it("ALL on PERSON node with email adds a send with correct template", async () => {
    const person = makeNode({
      id: "p1",
      type: "PERSON",
      interviewMode: "ALL",
      parentId: null,
      contactEmail: "alice@example.com",
      contactName: "Alice",
      contactRole: "Owner",
    })
    mockRepo.getChartByEngagement.mockResolvedValue([person])

    const plan = await onboardingService.planOnboardingForms(BASE)

    expect(plan.sends).toHaveLength(1)
    expect(plan.sends[0]).toMatchObject({
      nodeId: "p1",
      contactEmail: "alice@example.com",
      contactName: "Alice",
      templateSlug: "questionnaire-owner-director",
    })
  })

  it("ALL on ROLE recurses into PERSON children with email", async () => {
    const role = makeNode({ id: "r1", type: "ROLE", interviewMode: "ALL", parentId: null })
    const personA = makeNode({
      id: "pa",
      type: "PERSON",
      interviewMode: "OWNER_ONLY",
      parentId: "r1",
      contactEmail: "a@example.com",
      contactName: "Person A",
    })
    const personB = makeNode({
      id: "pb",
      type: "PERSON",
      interviewMode: "OWNER_ONLY",
      parentId: "r1",
      contactEmail: "b@example.com",
      contactName: "Person B",
    })
    mockRepo.getChartByEngagement.mockResolvedValue([role, personA, personB])

    const plan = await onboardingService.planOnboardingForms(BASE)

    expect(plan.sends).toHaveLength(2)
    expect(plan.sends.map((s) => s.contactEmail)).toEqual(
      expect.arrayContaining(["a@example.com", "b@example.com"])
    )
  })

  it("SAMPLE(3) with 2 named persons → 2 sends + 1 unfilled slot warning", async () => {
    const dept = makeNode({
      id: "dept-1",
      type: "DEPARTMENT",
      interviewMode: "SAMPLE",
      sampleSize: 3,
      parentId: null,
    })
    const p1 = makeNode({
      id: "sp1",
      type: "PERSON",
      parentId: "dept-1",
      contactEmail: "p1@example.com",
      contactName: "P1",
    })
    const p2 = makeNode({
      id: "sp2",
      type: "PERSON",
      parentId: "dept-1",
      contactEmail: "p2@example.com",
      contactName: "P2",
    })
    mockRepo.getChartByEngagement.mockResolvedValue([dept, p1, p2])

    const plan = await onboardingService.planOnboardingForms(BASE)

    expect(plan.sends).toHaveLength(2)
    expect(plan.unfilledSampleSlots).toHaveLength(1)
    expect(plan.unfilledSampleSlots[0]).toMatchObject({
      nodeId: "dept-1",
      needed: 1,
    })
  })

  it("SAMPLE(3) with 4 named persons → 4 sends, no unfilled slot warning", async () => {
    const dept = makeNode({
      id: "dept-2",
      type: "DEPARTMENT",
      interviewMode: "SAMPLE",
      sampleSize: 3,
      parentId: null,
    })
    const persons = ["a", "b", "c", "d"].map((x) =>
      makeNode({
        id: `sp-${x}`,
        type: "PERSON",
        parentId: "dept-2",
        contactEmail: `${x}@example.com`,
        contactName: x.toUpperCase(),
      })
    )
    mockRepo.getChartByEngagement.mockResolvedValue([dept, ...persons])

    const plan = await onboardingService.planOnboardingForms(BASE)

    expect(plan.sends).toHaveLength(4)
    expect(plan.unfilledSampleSlots).toHaveLength(0)
  })
})

// ── approvePlan ───────────────────────────────────────────────────────────────

describe("onboardingService.approvePlan", () => {
  const BASE = { tenantId: "tenant-1", engagementId: "eng-1" }

  beforeEach(() => {
    mockDbQuery.engagements.findFirst.mockResolvedValue({
      id: "eng-1",
      qualificationData: { teamSize: 10 },
    })
    mockRepo.getChartByEngagement.mockResolvedValue([]) // empty chart → zero sends
  })

  it("returns the plan with engagementId and totalSends", async () => {
    const plan = await onboardingService.approvePlan(BASE)
    expect(plan).toMatchObject({
      engagementId: "eng-1",
      totalSends: 0,
    })
  })

  it("logs activity with action plan.approved and correct actorName", async () => {
    await onboardingService.approvePlan({ ...BASE, actorName: "Luke" })

    expect(mockRepo.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "plan.approved",
        actorName: "Luke",
      })
    )
  })

  it("emits engagement/onboarding-plan-approved event", async () => {
    await onboardingService.approvePlan(BASE)

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "engagement/onboarding-plan-approved" })
    )
  })

  it("does not throw if inngest send fails (non-blocking)", async () => {
    mockInngestSend.mockRejectedValueOnce(new Error("inngest down"))
    await expect(onboardingService.approvePlan(BASE)).resolves.toBeDefined()
  })
})

// ── validateClientEditPatch ───────────────────────────────────────────────────

describe("onboardingService.validateClientEditPatch", () => {
  it("throws ValidationError when interviewMode is in patch", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ interviewMode: "ALL" })
    ).toThrow(ValidationError)
  })

  it("throws ValidationError when templateSlugOverride is in patch", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ templateSlugOverride: "custom" })
    ).toThrow(ValidationError)
  })

  it("throws ValidationError when sampleSize is in patch", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ sampleSize: 3 })
    ).toThrow(ValidationError)
  })

  it("does not throw for label (allowed client field)", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ label: "New Name" })
    ).not.toThrow()
  })

  it("does not throw for headcount (allowed client field)", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ headcount: 10 })
    ).not.toThrow()
  })

  it("does not throw for contactEmail (allowed client field)", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ contactEmail: "a@b.com" })
    ).not.toThrow()
  })

  it("does not throw for contactName (allowed client field)", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ contactName: "Alice" })
    ).not.toThrow()
  })

  it("does not throw for contactRole (allowed client field)", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ contactRole: "Manager" })
    ).not.toThrow()
  })

  it("error message names the restricted field", () => {
    expect(() =>
      onboardingService.validateClientEditPatch({ interviewMode: "SKIP" })
    ).toThrow("interviewMode")
  })
})
