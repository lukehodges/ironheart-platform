/**
 * Tests for onboarding.events.ts — handleOnboardingPlanApproved Inngest handler
 *
 * Pattern: inngest.createFunction is mocked to return the handler directly
 * (same pattern as consulting.events.test.ts). step.run executes callbacks
 * immediately.
 *
 * DB mock strategy: db.select() returns a chain where .where() returns a
 * "thenable builder" — an object that is both a Promise (has .then) AND has
 * .limit(). This handles both query shapes in the handler:
 *   - .select().from().where()          → template batch fetch (no limit)
 *   - .select().from().where().limit(1) → node check / customer lookup
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Hoisted mock factories
// ---------------------------------------------------------------------------

const mockFormsRepo = vi.hoisted(() => ({
  createInstance: vi.fn(),
}))

/** Queue of per-select-call results. Each entry is the array a query will resolve with. */
const dbSelectQueue = vi.hoisted(() => ({ queue: [] as unknown[][] }))

const mockDb = vi.hoisted(() => {
  /**
   * Build a thenable builder that also has .limit(). This lets the handler
   * await either the builder directly (template fetch) or call .limit(n)
   * first (node/customer queries).
   */
  function makeBuilder(resultPromise: Promise<unknown[]>) {
    const builder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function (this: unknown) {
        // Return new thenable builder wrapping same promise
        const inner = {
          limit: vi.fn((_n: number) => resultPromise),
          then: (onFulfilled: (v: unknown[]) => unknown, onRejected?: (e: unknown) => unknown) =>
            resultPromise.then(onFulfilled, onRejected),
          catch: (onRejected: (e: unknown) => unknown) => resultPromise.catch(onRejected),
        }
        return inner
      }),
    }
    return builder
  }

  const dbMock = {
    select: vi.fn().mockImplementation(() => {
      // Pop from queue, or default to []
      const result = dbSelectQueue.queue.shift() ?? []
      return makeBuilder(Promise.resolve(result))
    }),
    insert: vi.fn(),
    update: vi.fn(),
  }

  // Default insert: supports .values().returning() and plain .values() (no returning)
  dbMock.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "default-id" }]),
    }),
  })

  dbMock.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })

  return dbMock
})

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/inngest", () => ({
  inngest: {
    createFunction: vi.fn(
      (_meta: unknown, _trigger: unknown, handler: (args: unknown) => unknown) =>
        handler
    ),
  },
}))

vi.mock("@/shared/logger", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

vi.mock("@/shared/db", () => ({ db: mockDb }))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), inArray: vi.fn() }
})

vi.mock("@/shared/db/schemas/onboarding-chart.schema", () => ({
  engagementOrgChart: { id: "engagementOrgChart", formSendId: "formSendId" },
  engagementOrgChartActivity: { id: "activity" },
}))

vi.mock("@/shared/db/schema", () => ({
  formTemplates: { id: "ft.id", tenantId: "ft.tenantId", slug: "ft.slug" },
  completedForms: {},
}))

vi.mock("@/shared/db/schemas/customer.schema", () => ({
  customers: { id: "c.id", tenantId: "c.tenantId", email: "c.email" },
}))

vi.mock("@/modules/forms/forms.repository", () => ({
  formsRepository: mockFormsRepo,
}))

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------

import { handleOnboardingPlanApproved } from "../onboarding.events"
import type { OnboardingPlan } from "../onboarding.types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000001"
const CLIENT_TENANT_ID = "00000000-0000-0000-0000-000000000002"
const IRONHEART_TENANT_ID = "00000000-0000-0000-0000-000000000099"

function makePlan(sends: OnboardingPlan["sends"] = []): OnboardingPlan {
  return {
    engagementId: ENGAGEMENT_ID,
    tier: "MICRO",
    totalSends: sends.length,
    sends,
    unfilledSampleSlots: [],
  }
}

function makeSend(overrides: Partial<OnboardingPlan["sends"][number]> = {}): OnboardingPlan["sends"][number] {
  return {
    nodeId: "node-1",
    contactEmail: "alice@example.com",
    contactName: "Alice Smith",
    templateSlug: "questionnaire-owner-director",
    reason: "OWNER_ONLY",
    ...overrides,
  }
}

function makeEvent(plan: OnboardingPlan) {
  return { data: { engagementId: ENGAGEMENT_ID, tenantId: CLIENT_TENANT_ID, plan } }
}

function makeStep() {
  return { run: vi.fn((_id: string, fn: () => Promise<unknown>) => fn()) }
}

function invokeHandler(event: ReturnType<typeof makeEvent>, step = makeStep()) {
  return (
    handleOnboardingPlanApproved as unknown as (
      args: { event: typeof event; step: typeof step }
    ) => Promise<unknown>
  )({ event, step })
}

function makeFormInstance(overrides: Partial<{ id: string }> = {}) {
  return {
    id: overrides.id ?? "form-instance-id",
    tenantId: IRONHEART_TENANT_ID,
    templateId: "template-uuid-1",
    sessionKey: "session-key",
    status: "PENDING",
    responses: null,
    signature: null,
    completedAt: null,
    expiresAt: new Date(Date.now() + 7 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Push an ordered sequence of result arrays into the DB select queue.
 *
 * The handler makes these db.select calls (in order):
 *   1. fetch-templates (no limit — returns array of { id, slug })
 *   2. check-node-<nodeId>  (limit 1 — returns [{ formSendId }] or [])
 *   3. resolve-customer-<nodeId> (limit 1 — returns [{ id }] or [])
 * Repeat steps 2–3 for each send.
 */
function queueSelectResults(...results: unknown[][]) {
  dbSelectQueue.queue.push(...results)
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  dbSelectQueue.queue = []
  process.env.IRONHEART_TENANT_ID = IRONHEART_TENANT_ID

  mockFormsRepo.createInstance.mockResolvedValue(makeFormInstance())

  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "created-customer-id" }]),
    }),
  })

  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
})

// ---------------------------------------------------------------------------
// Test: empty plan
// ---------------------------------------------------------------------------

describe("empty plan", () => {
  it("returns { sent:0, skipped:0, errors:0 } without calling DB or forms repo", async () => {
    const result = await invokeHandler(makeEvent(makePlan([])))

    expect(result).toEqual({ sent: 0, skipped: 0, errors: 0 })
    expect(mockDb.select).not.toHaveBeenCalled()
    expect(mockFormsRepo.createInstance).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test: 3 successful sends
// ---------------------------------------------------------------------------

describe("3 successful sends", () => {
  it("sends 3 forms, sets formSendId on each node, logs activity", async () => {
    const sends = [
      makeSend({ nodeId: "node-1", templateSlug: "questionnaire-owner-director" }),
      makeSend({ nodeId: "node-2", templateSlug: "questionnaire-team-member", contactEmail: "bob@example.com", contactName: "Bob Jones" }),
      makeSend({ nodeId: "node-3", templateSlug: "questionnaire-finance-admin", contactEmail: "carol@example.com", contactName: "Carol White" }),
    ]

    // Queue: template fetch → node-1 check → node-1 customer → node-2 check → node-2 customer → node-3 check → node-3 customer
    queueSelectResults(
      [
        { id: "tpl-owner", slug: "questionnaire-owner-director" },
        { id: "tpl-team", slug: "questionnaire-team-member" },
        { id: "tpl-finance", slug: "questionnaire-finance-admin" },
      ],
      [{ formSendId: null }],  // node-1 check
      [],                      // node-1 customer not found → create
      [{ formSendId: null }],  // node-2 check
      [],                      // node-2 customer not found → create
      [{ formSendId: null }],  // node-3 check
      [],                      // node-3 customer not found → create
    )

    let formIdx = 0
    mockFormsRepo.createInstance.mockImplementation(async () => makeFormInstance({ id: `form-${++formIdx}` }))

    const step = makeStep()
    const result = await invokeHandler(makeEvent(makePlan(sends)), step)

    expect(result).toEqual({ sent: 3, skipped: 0, errors: 0 })
    expect(mockFormsRepo.createInstance).toHaveBeenCalledTimes(3)

    // formSendId linked for each node
    expect(mockDb.update).toHaveBeenCalledTimes(3)

    // Activity log inserted (plus 3 customer creates = 4 inserts total)
    expect(mockDb.insert).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test: unknown template slug
// ---------------------------------------------------------------------------

describe("unknown template slug", () => {
  it("counts missing slug as error, still processes known slugs", async () => {
    const sends = [
      makeSend({ nodeId: "node-1", templateSlug: "questionnaire-owner-director" }),
      makeSend({ nodeId: "node-2", templateSlug: "questionnaire-does-not-exist", contactEmail: "bob@example.com", contactName: "Bob" }),
    ]

    queueSelectResults(
      [{ id: "tpl-owner", slug: "questionnaire-owner-director" }],  // template fetch — only owner exists
      [{ formSendId: null }],  // node-1 check
      [],                      // node-1 customer lookup
      // node-2: template not found → error before any DB call for node-2
    )

    const result = await invokeHandler(makeEvent(makePlan(sends)))

    expect(result).toEqual({ sent: 1, skipped: 0, errors: 1 })
    expect(mockFormsRepo.createInstance).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Test: idempotency — nodes with existing formSendId are skipped
// ---------------------------------------------------------------------------

describe("idempotency", () => {
  it("skips a node that already has formSendId set", async () => {
    const sends = [makeSend({ nodeId: "node-already-sent" })]

    queueSelectResults(
      [{ id: "tpl-owner", slug: "questionnaire-owner-director" }],  // template fetch
      [{ formSendId: "existing-form-send-uuid" }],                    // node check → already sent
    )

    const result = await invokeHandler(makeEvent(makePlan(sends)))

    expect(result).toEqual({ sent: 0, skipped: 1, errors: 0 })
    expect(mockFormsRepo.createInstance).not.toHaveBeenCalled()
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test: activity log entry
// ---------------------------------------------------------------------------

describe("activity log", () => {
  it("inserts an activity row with correct engagementId, action, and message", async () => {
    const sends = [makeSend()]

    queueSelectResults(
      [{ id: "tpl-owner", slug: "questionnaire-owner-director" }],
      [{ formSendId: null }],
      [],
    )

    const capturedValues: unknown[] = []
    mockDb.insert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((vals: unknown) => {
        capturedValues.push(vals)
        return { returning: vi.fn().mockResolvedValue([{ id: "some-id" }]) }
      }),
    }))

    await invokeHandler(makeEvent(makePlan(sends)))

    // The activity insert is the last insert call (after customer insert)
    const activityEntry = capturedValues[capturedValues.length - 1] as Record<string, unknown>
    expect(activityEntry).toMatchObject({
      engagementId: ENGAGEMENT_ID,
      actorType: "SYSTEM",
      actorName: "Onboarding bot",
      action: "forms.sent",
    })
    expect(activityEntry.message).toContain("Sent 1 form invitation")
    expect((activityEntry.toValue as Record<string, number>).sent).toBe(1)
    expect((activityEntry.toValue as Record<string, number>).skipped).toBe(0)
    expect((activityEntry.toValue as Record<string, number>).errors).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test: missing IRONHEART_TENANT_ID
// ---------------------------------------------------------------------------

describe("missing IRONHEART_TENANT_ID", () => {
  it("throws when env var is not set", async () => {
    delete process.env.IRONHEART_TENANT_ID
    await expect(invokeHandler(makeEvent(makePlan([makeSend()])))).rejects.toThrow(
      "IRONHEART_TENANT_ID not set"
    )
  })
})
