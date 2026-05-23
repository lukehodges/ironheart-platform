/**
 * onboarding.router.test.ts
 *
 * Tests for onboarding tRPC router — focused on:
 *   - describeUpdate helper: action + message for node.updated vs mode.changed
 *   - actorDisplayName helper: full name / email fallback
 *   - Procedure handler bodies: repo + service delegation, activity log
 *     attribution (actorType, action, message), perm gate (assertClientMembership),
 *     Zod .strict() rejection, OptimisticConcurrencyError propagation,
 *     Inngest event emission
 *
 * Approach:
 *   - @/shared/trpc is mocked with a minimal pass-through builder so the router
 *     file can be imported without pulling in Next.js server modules.
 *   - Procedure handlers are extracted from the assembled router object and
 *     called directly with a hand-crafted context + input.
 *   - describeUpdate and actorDisplayName are tested as pure functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// vi.hoisted — create mock handles before module hoisting
// ---------------------------------------------------------------------------

const mockRepoGetChartTree = vi.hoisted(() => vi.fn())
const mockRepoCreateNode = vi.hoisted(() => vi.fn())
const mockRepoUpdateNode = vi.hoisted(() => vi.fn())
const mockRepoDeleteNode = vi.hoisted(() => vi.fn())
const mockRepoLogActivity = vi.hoisted(() => vi.fn())
const mockRepoGetActivity = vi.hoisted(() => vi.fn())

const mockServiceSeedChart = vi.hoisted(() => vi.fn())
const mockServicePlanForms = vi.hoisted(() => vi.fn())
const mockServiceApprovePlan = vi.hoisted(() => vi.fn())
const mockServiceValidateClientEditPatch = vi.hoisted(() => vi.fn())

const mockInngestSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

const mockDbQueryEngagements = vi.hoisted(() => ({ findFirst: vi.fn() }))
const mockDbQueryTenants = vi.hoisted(() => ({ findFirst: vi.fn() }))
const mockDbQueryEngagementOrgChart = vi.hoisted(() => ({ findFirst: vi.fn() }))

const mockIsMemberOfOrg = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/**
 * Mock @/shared/trpc to avoid pulling in @workos-inc/authkit-nextjs which
 * depends on Next.js server modules unavailable in vitest's jsdom environment.
 *
 * We provide a minimal procedure builder that records the resolver function
 * so tests can call it directly.
 */
vi.mock("@/shared/trpc", () => {
  /**
   * A minimal procedure builder that creates a fresh leaf object for every
   * .input() call, so that each procedure in the router captures its own
   * handler independently (rather than overwriting a shared singleton).
   *
   * Shape:
   *   baseProcedure.input(schema) → leaf  (fresh per call)
   *   leaf.query(handler) | leaf.mutation(handler) → leaf  (stores _handler)
   */
  function makeLeaf(): any {
    const leaf: any = {
      _handler: null,
      query(handler: Function) {
        leaf._handler = handler
        return leaf
      },
      mutation(handler: Function) {
        leaf._handler = handler
        return leaf
      },
    }
    return leaf
  }

  function makeBaseProcedure(): any {
    const base: any = {
      use: () => base,
      input: () => makeLeaf(),
    }
    return base
  }

  // router() just returns its input — the router object IS the procedure map.
  return {
    router: (procedures: Record<string, any>) => procedures,
    platformAdminProcedure: makeBaseProcedure(),
    protectedProcedure: makeBaseProcedure(),
    tenantProcedure: makeBaseProcedure(),
    publicProcedure: makeBaseProcedure(),
    createCallerFactory: vi.fn(),
    middleware: vi.fn(),
  }
})

vi.mock("../onboarding.repository", () => ({
  onboardingRepository: {
    getChartTree: mockRepoGetChartTree,
    createNode: mockRepoCreateNode,
    updateNode: mockRepoUpdateNode,
    deleteNode: mockRepoDeleteNode,
    logActivity: mockRepoLogActivity,
    getActivity: mockRepoGetActivity,
  },
}))

vi.mock("../onboarding.service", () => ({
  onboardingService: {
    seedChartFromTier: mockServiceSeedChart,
    planOnboardingForms: mockServicePlanForms,
    approvePlan: mockServiceApprovePlan,
    validateClientEditPatch: mockServiceValidateClientEditPatch,
  },
}))

vi.mock("@/shared/inngest", () => ({
  inngest: { send: mockInngestSend },
}))

vi.mock("@/shared/db", () => ({
  db: {
    query: {
      engagements: mockDbQueryEngagements,
      tenants: mockDbQueryTenants,
      engagementOrgChart: mockDbQueryEngagementOrgChart,
    },
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ _eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
  desc: vi.fn((a: unknown) => ({ _desc: a })),
  lt: vi.fn((a: unknown, b: unknown) => ({ _lt: [a, b] })),
  sql: vi.fn(),
  inArray: vi.fn(),
  max: vi.fn(),
}))

vi.mock("@/lib/auth/tenant-resolver", () => ({
  isMemberOfOrg: mockIsMemberOfOrg,
}))

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Schema modules depend on db schema imports — stub lightly
vi.mock("@/shared/db/schemas/client-portal.schema", () => ({
  engagements: { id: "engagements.id" },
}))

vi.mock("@/shared/db/schemas/tenant.schema", () => ({
  tenants: { id: "tenants.id" },
}))

vi.mock("@/shared/db/schemas/onboarding-chart.schema", () => ({
  engagementOrgChart: { id: "engagementOrgChart.id", tenantId: "engagementOrgChart.tenantId" },
  engagementOrgChartActivity: {},
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { onboardingRouter } from "../onboarding.router"
import { describeUpdate, actorDisplayName } from "../onboarding.router"
import { OptimisticConcurrencyError } from "@/shared/errors"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENG_ID = "00000000-0000-0000-0000-000000000010"
const TENANT_ID = "00000000-0000-0000-0000-000000000020"
const NODE_ID = "00000000-0000-0000-0000-000000000030"
const WORKOS_ORG_ID = "org_workos_123"

const ADMIN_USER = {
  id: "workos_user_admin",
  email: "luke@theironheart.org",
  firstName: "Luke",
  lastName: "Hodges",
  profilePictureUrl: null,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const CLIENT_USER = {
  id: "workos_user_client",
  email: "simon@crescentmoon.co",
  firstName: "Simon",
  lastName: "Gerrard",
  profilePictureUrl: null,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const MOCK_NODE = {
  id: NODE_ID,
  tenantId: TENANT_ID,
  engagementId: ENG_ID,
  parentId: null,
  label: "Operations",
  type: "DEPARTMENT" as const,
  headcount: 12,
  contactUserId: null,
  contactEmail: null,
  contactName: null,
  contactRole: null,
  interviewMode: "OWNER_ONLY" as const,
  sampleSize: null,
  templateSlugOverride: null,
  sortOrder: 0,
  version: 1,
  lastEditedBy: "CONSULTANT" as const,
  lastEditedAt: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

function makeAdminCtx() {
  return {
    session: { user: ADMIN_USER, accessToken: "tok_admin" },
    tenantId: TENANT_ID,
  }
}

function makeClientCtx() {
  return {
    session: { user: CLIENT_USER, accessToken: "tok_client" },
    tenantId: TENANT_ID,
  }
}

// ---------------------------------------------------------------------------
// Helper: call a procedure handler directly (bypassing tRPC middleware stack)
// ---------------------------------------------------------------------------

function callHandler(
  procedure: any,
  ctx: any,
  input: any
): Promise<any> {
  if (!procedure?._handler) {
    throw new Error(
      `No _handler found on procedure. Keys: ${JSON.stringify(Object.keys(procedure ?? {}))}`
    )
  }
  return procedure._handler({ ctx, input })
}

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function stubEngagementAndTenant() {
  mockDbQueryEngagements.findFirst.mockResolvedValue({
    id: ENG_ID,
    clientTenantId: TENANT_ID,
  })
  mockDbQueryTenants.findFirst.mockResolvedValue({
    id: TENANT_ID,
    workosOrgId: WORKOS_ORG_ID,
  })
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockRepoLogActivity.mockResolvedValue({})
  mockServiceValidateClientEditPatch.mockReturnValue(undefined)
})

// ============================================================================
// Pure-function helpers
// ============================================================================

describe("describeUpdate helper", () => {
  it("returns node.updated when patch contains label field", () => {
    const result = describeUpdate({ label: "New Name" }, "Operations", "Luke Hodges")
    expect(result.action).toBe("node.updated")
    expect(result.message).toContain("Luke Hodges")
    expect(result.message).toContain("Operations")
    expect(result.message).toContain("label")
  })

  it("returns mode.changed when patch contains ONLY interviewMode", () => {
    const result = describeUpdate({ interviewMode: "SAMPLE" }, "Operations", "Luke Hodges")
    expect(result.action).toBe("mode.changed")
    expect(result.message).toContain("SAMPLE")
    expect(result.message).toContain("Operations")
  })

  it("returns node.updated (not mode.changed) when patch has interviewMode PLUS other fields", () => {
    const result = describeUpdate(
      { interviewMode: "ALL", label: "Renamed" },
      "Operations",
      "Luke"
    )
    expect(result.action).toBe("node.updated")
  })
})

describe("actorDisplayName helper", () => {
  it("returns full name when both firstName and lastName present", () => {
    expect(actorDisplayName({ firstName: "Luke", lastName: "Hodges", email: "luke@example.com" }))
      .toBe("Luke Hodges")
  })

  it("falls back to email when firstName and lastName are null", () => {
    expect(actorDisplayName({ firstName: null, lastName: null, email: "luke@example.com" }))
      .toBe("luke@example.com")
  })

  it("uses only firstName when lastName is null", () => {
    expect(actorDisplayName({ firstName: "Luke", lastName: null, email: "luke@example.com" }))
      .toBe("Luke")
  })
})

// ============================================================================
// getChart — consultant procedure
// ============================================================================

describe("getChart procedure", () => {
  it("resolves tenantId from engagement and returns repo chart tree", async () => {
    const tree = [{ ...MOCK_NODE, children: [] }]
    stubEngagementAndTenant()
    mockRepoGetChartTree.mockResolvedValue(tree)

    const result = await callHandler(
      (onboardingRouter as any).getChart,
      makeAdminCtx(),
      { engagementId: ENG_ID }
    )

    expect(result).toEqual(tree)
    expect(mockRepoGetChartTree).toHaveBeenCalledWith(TENANT_ID, ENG_ID)
  })
})

// ============================================================================
// seedChart — consultant procedure
// ============================================================================

describe("seedChart procedure", () => {
  it("delegates to onboardingService.seedChartFromTier with correct args", async () => {
    const seedResult = { seeded: 5 }
    stubEngagementAndTenant()
    mockServiceSeedChart.mockResolvedValue(seedResult)

    const result = await callHandler(
      (onboardingRouter as any).seedChart,
      makeAdminCtx(),
      { engagementId: ENG_ID }
    )

    expect(result).toEqual(seedResult)
    expect(mockServiceSeedChart).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      engagementId: ENG_ID,
      actorId: ADMIN_USER.id,
      actorName: "Luke Hodges",
    })
  })
})

// ============================================================================
// createNode — consultant procedure
// ============================================================================

describe("createNode procedure", () => {
  it("inserts node via repo with editedBy CONSULTANT and logs node.created activity", async () => {
    stubEngagementAndTenant()
    mockRepoCreateNode.mockResolvedValue(MOCK_NODE)

    const result = await callHandler(
      (onboardingRouter as any).createNode,
      makeAdminCtx(),
      {
        engagementId: ENG_ID,
        parentId: null,
        label: "Operations",
        type: "DEPARTMENT",
        sortOrder: 0,
      }
    )

    expect(result).toEqual(MOCK_NODE)
    expect(mockRepoCreateNode).toHaveBeenCalledWith(
      expect.objectContaining({ editedBy: "CONSULTANT", label: "Operations" })
    )

    expect(mockRepoLogActivity).toHaveBeenCalledTimes(1)
    const logCall = mockRepoLogActivity.mock.calls[0][0]
    expect(logCall.actorType).toBe("CONSULTANT")
    expect(logCall.actorId).toBe(ADMIN_USER.id)
    expect(logCall.action).toBe("node.created")
  })
})

// ============================================================================
// updateNode — consultant procedure
// ============================================================================

describe("updateNode procedure", () => {
  it("applies patch, logs node.updated when patch contains label field", async () => {
    mockDbQueryEngagementOrgChart.findFirst.mockResolvedValue(MOCK_NODE)
    stubEngagementAndTenant()
    const updated = { ...MOCK_NODE, label: "Ops Renamed", version: 2 }
    mockRepoUpdateNode.mockResolvedValue(updated)

    const result = await callHandler(
      (onboardingRouter as any).updateNode,
      makeAdminCtx(),
      { id: NODE_ID, version: 1, patch: { label: "Ops Renamed" } }
    )

    expect(result).toEqual(updated)
    expect(mockRepoUpdateNode).toHaveBeenCalledWith(
      expect.objectContaining({
        id: NODE_ID,
        expectedVersion: 1,
        editedBy: "CONSULTANT",
        patch: { label: "Ops Renamed" },
      })
    )

    const logCall = mockRepoLogActivity.mock.calls[0][0]
    expect(logCall.action).toBe("node.updated")
    expect(logCall.actorType).toBe("CONSULTANT")
  })

  it("logs mode.changed action when patch contains ONLY interviewMode=SAMPLE", async () => {
    mockDbQueryEngagementOrgChart.findFirst.mockResolvedValue(MOCK_NODE)
    stubEngagementAndTenant()
    const updated = { ...MOCK_NODE, interviewMode: "SAMPLE" as const, version: 2 }
    mockRepoUpdateNode.mockResolvedValue(updated)

    await callHandler(
      (onboardingRouter as any).updateNode,
      makeAdminCtx(),
      { id: NODE_ID, version: 1, patch: { interviewMode: "SAMPLE" } }
    )

    const logCall = mockRepoLogActivity.mock.calls[0][0]
    expect(logCall.action).toBe("mode.changed")
    expect(logCall.message).toContain("SAMPLE")
  })

  it("propagates OptimisticConcurrencyError without logging activity", async () => {
    mockDbQueryEngagementOrgChart.findFirst.mockResolvedValue(MOCK_NODE)
    stubEngagementAndTenant()
    mockRepoUpdateNode.mockRejectedValue(
      new OptimisticConcurrencyError("OrgChartNode")
    )

    await expect(
      callHandler(
        (onboardingRouter as any).updateNode,
        makeAdminCtx(),
        { id: NODE_ID, version: 1, patch: { label: "stale" } }
      )
    ).rejects.toThrow(OptimisticConcurrencyError)

    expect(mockRepoLogActivity).not.toHaveBeenCalled()
  })
})

// ============================================================================
// deleteNode — cascade subtree count in activity message
// ============================================================================

describe("deleteNode procedure", () => {
  it("logs message with node label and subtree deletedCount", async () => {
    const parentNode = { ...MOCK_NODE, label: "IT" }
    mockDbQueryEngagementOrgChart.findFirst.mockResolvedValue(parentNode)
    stubEngagementAndTenant()
    mockRepoDeleteNode.mockResolvedValue({ deletedCount: 4 })

    await callHandler(
      (onboardingRouter as any).deleteNode,
      makeAdminCtx(),
      { id: NODE_ID, version: 1 }
    )

    const logCall = mockRepoLogActivity.mock.calls[0][0]
    expect(logCall.action).toBe("node.deleted")
    expect(logCall.message).toContain("IT")
    expect(logCall.message).toContain("4")
  })
})

// ============================================================================
// planForms — consultant procedure
// ============================================================================

describe("planForms procedure", () => {
  it("returns OnboardingPlan from onboardingService.planOnboardingForms", async () => {
    stubEngagementAndTenant()
    const plan = { forms: ["form_a", "form_b"] }
    mockServicePlanForms.mockResolvedValue(plan)

    const result = await callHandler(
      (onboardingRouter as any).planForms,
      makeAdminCtx(),
      { engagementId: ENG_ID }
    )

    expect(result).toEqual(plan)
    expect(mockServicePlanForms).toHaveBeenCalledWith({ tenantId: TENANT_ID, engagementId: ENG_ID })
  })
})

// ============================================================================
// approvePlan — consultant procedure
// ============================================================================

describe("approvePlan procedure", () => {
  it("delegates to onboardingService.approvePlan with actor args from session", async () => {
    stubEngagementAndTenant()
    const approveResult = { approved: true }
    mockServiceApprovePlan.mockResolvedValue(approveResult)

    const result = await callHandler(
      (onboardingRouter as any).approvePlan,
      makeAdminCtx(),
      { engagementId: ENG_ID }
    )

    expect(result).toEqual(approveResult)
    expect(mockServiceApprovePlan).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      engagementId: ENG_ID,
      actorId: ADMIN_USER.id,
      actorName: "Luke Hodges",
    })
  })
})

// ============================================================================
// clientGetChart — protectedProcedure + org membership gate
// ============================================================================

describe("clientGetChart procedure", () => {
  it("returns chart tree when user IS a member of the engagement's WorkOS org", async () => {
    const tree = [{ ...MOCK_NODE, children: [] }]
    stubEngagementAndTenant()
    mockIsMemberOfOrg.mockResolvedValue(true)
    mockRepoGetChartTree.mockResolvedValue(tree)

    const result = await callHandler(
      (onboardingRouter as any).clientGetChart,
      makeClientCtx(),
      { engagementId: ENG_ID }
    )

    expect(result).toEqual(tree)
    expect(mockIsMemberOfOrg).toHaveBeenCalledWith(CLIENT_USER.id, WORKOS_ORG_ID)
  })

  it("throws ForbiddenError when user is NOT a member of the engagement's WorkOS org", async () => {
    stubEngagementAndTenant()
    mockIsMemberOfOrg.mockResolvedValue(false)

    await expect(
      callHandler(
        (onboardingRouter as any).clientGetChart,
        makeClientCtx(),
        { engagementId: ENG_ID }
      )
    ).rejects.toThrow("Not a member")
  })
})

// ============================================================================
// clientUpdateNode — Zod .strict() and CLIENT attribution
// ============================================================================

describe("clientUpdateNode procedure", () => {
  it("validates schema — rejects patch containing interviewMode (consultant-only field)", async () => {
    // We exercise Zod .strict() by importing the schema directly and calling parse.
    // The router's middleware has already rejected it before the handler runs.
    const { clientUpdateNodeSchema } = await import("../onboarding.schemas")
    const parseResult = clientUpdateNodeSchema.safeParse({
      id: NODE_ID,
      version: 1,
      patch: { interviewMode: "ALL" },
    })
    expect(parseResult.success).toBe(false)
    // Confirm service/repo were never touched
    expect(mockRepoUpdateNode).not.toHaveBeenCalled()
  })

  it("calls repo with editedBy CLIENT and logs activity with actorType CLIENT", async () => {
    const clientNode = { ...MOCK_NODE, engagementId: ENG_ID }
    mockDbQueryEngagementOrgChart.findFirst.mockResolvedValue(clientNode)
    stubEngagementAndTenant()
    mockIsMemberOfOrg.mockResolvedValue(true)
    const updated = { ...MOCK_NODE, label: "Client Renamed", version: 2 }
    mockRepoUpdateNode.mockResolvedValue(updated)

    const result = await callHandler(
      (onboardingRouter as any).clientUpdateNode,
      makeClientCtx(),
      { id: NODE_ID, version: 1, patch: { label: "Client Renamed" } }
    )

    expect(result).toEqual(updated)
    expect(mockRepoUpdateNode).toHaveBeenCalledWith(
      expect.objectContaining({ editedBy: "CLIENT" })
    )

    const logCall = mockRepoLogActivity.mock.calls[0][0]
    expect(logCall.actorType).toBe("CLIENT")
    expect(logCall.actorId).toBe(CLIENT_USER.id)
  })
})

// ============================================================================
// clientNotifyConsultantReady — Inngest + activity log
// ============================================================================

describe("clientNotifyConsultantReady procedure", () => {
  it("emits engagement/chart-client-ready event and logs chart.client-ready activity", async () => {
    stubEngagementAndTenant()
    mockIsMemberOfOrg.mockResolvedValue(true)
    mockInngestSend.mockResolvedValue(undefined)

    const result = await callHandler(
      (onboardingRouter as any).clientNotifyConsultantReady,
      makeClientCtx(),
      { engagementId: ENG_ID }
    )

    expect(result).toEqual({ ok: true })
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "engagement/chart-client-ready",
        data: expect.objectContaining({ engagementId: ENG_ID }),
      })
    )

    const logCall = mockRepoLogActivity.mock.calls[0][0]
    expect(logCall.actorType).toBe("CLIENT")
    expect(logCall.action).toBe("chart.client-ready")
    expect(logCall.message).toContain("ready")
  })
})
