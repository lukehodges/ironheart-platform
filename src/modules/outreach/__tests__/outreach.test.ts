import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before imports
vi.mock("@/shared/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn() },
}))
vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))
vi.mock("@/modules/outreach/outreach.repository", () => ({
  outreachRepository: {
    findContactById: vi.fn(),
    findSequenceById: vi.fn(),
    categorizeContact: vi.fn(),
    snoozeContact: vi.fn(),
    logActivity: vi.fn(),
    updateContactStatus: vi.fn(),
    reactivateSnoozedContacts: vi.fn(),
    findActivityById: vi.fn(),
    getDueContacts: vi.fn(),
    getOverdueContacts: vi.fn(),
    getRecentReplies: vi.fn(),
    getTodayStats: vi.fn(),
    listSequences: vi.fn(),
    getContactActivities: vi.fn(),
  },
}))
vi.mock("@/modules/pipeline/pipeline.service", () => ({
  pipelineService: { addMember: vi.fn() },
}))

import { outreachService } from "../outreach.service"
import { outreachRepository } from "../outreach.repository"
import { inngest } from "@/shared/inngest"
import { BadRequestError } from "@/shared/errors"

const repo = outreachRepository as unknown as Record<string, ReturnType<typeof vi.fn>>

const TENANT_ID = "t-00000000-0000-0000-0000-000000000001"
const CONTACT_ID = "c-00000000-0000-0000-0000-000000000001"
const SEQUENCE_ID = "s-00000000-0000-0000-0000-000000000001"
const CUSTOMER_ID = "u-00000000-0000-0000-0000-000000000001"
const ACTIVITY_ID = "a-00000000-0000-0000-0000-000000000001"

const ctx = { tenantId: TENANT_ID, userId: "user-1", permissions: ["outreach:write"] }

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTACT_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    sequenceId: SEQUENCE_ID,
    assignedUserId: null,
    status: "ACTIVE",
    currentStep: 1,
    nextDueAt: new Date(),
    enrolledAt: new Date(),
    completedAt: null,
    lastActivityAt: null,
    pipelineMemberId: null,
    notes: null,
    sentiment: null,
    replyCategory: null,
    snoozedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSequence(overrides: Record<string, unknown> = {}) {
  return {
    id: SEQUENCE_ID,
    tenantId: TENANT_ID,
    name: "Test Sequence",
    description: null,
    sector: "recruitment",
    targetIcp: null,
    isActive: true,
    abVariant: null,
    pairedSequenceId: null,
    steps: [
      { position: 1, channel: "EMAIL", delayDays: 0, subject: "Hello {{firstName}}", bodyMarkdown: "Hi there", notes: null },
      { position: 2, channel: "EMAIL", delayDays: 3, subject: "Follow up", bodyMarkdown: "Following up", notes: null },
    ],
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTIVITY_ID,
    tenantId: TENANT_ID,
    contactId: CONTACT_ID,
    sequenceId: SEQUENCE_ID,
    customerId: CUSTOMER_ID,
    stepPosition: 1,
    channel: "EMAIL",
    activityType: "SENT",
    deliveredTo: null,
    notes: null,
    performedByUserId: null,
    previousState: null,
    occurredAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe("outreachService.categorizeContact", () => {
  it("sets replyCategory and derives sentiment for a REPLIED contact", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "REPLIED" }))
    repo.categorizeContact.mockResolvedValue(
      makeContact({ status: "REPLIED", replyCategory: "INTERESTED", sentiment: "POSITIVE" }),
    )

    const result = await outreachService.categorizeContact(ctx, {
      contactId: CONTACT_ID,
      replyCategory: "INTERESTED",
    })

    expect(repo.categorizeContact).toHaveBeenCalledWith(
      TENANT_ID,
      CONTACT_ID,
      "INTERESTED",
      "POSITIVE",
    )
    expect(result.replyCategory).toBe("INTERESTED")
    expect(result.sentiment).toBe("POSITIVE")
  })

  it("rejects categorization for non-REPLIED contacts", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE" }))

    await expect(
      outreachService.categorizeContact(ctx, { contactId: CONTACT_ID, replyCategory: "INTERESTED" }),
    ).rejects.toThrow(BadRequestError)
  })
})

describe("outreachService.snoozeContact", () => {
  it("sets snoozedUntil for a REPLIED contact", async () => {
    const snoozedUntil = new Date("2026-04-01")
    repo.findContactById.mockResolvedValue(makeContact({ status: "REPLIED" }))
    repo.snoozeContact.mockResolvedValue(
      makeContact({ status: "REPLIED", snoozedUntil }),
    )

    const result = await outreachService.snoozeContact(ctx, {
      contactId: CONTACT_ID,
      snoozedUntil,
    })

    expect(repo.snoozeContact).toHaveBeenCalledWith(TENANT_ID, CONTACT_ID, snoozedUntil)
    expect(result.snoozedUntil).toEqual(snoozedUntil)
  })

  it("rejects snooze for non-REPLIED contacts", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE" }))

    await expect(
      outreachService.snoozeContact(ctx, { contactId: CONTACT_ID, snoozedUntil: new Date() }),
    ).rejects.toThrow(BadRequestError)
  })
})

describe("outreachService.logActivity — sector in event", () => {
  it("includes sector in the outreach/activity.logged event", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE" }))
    repo.findSequenceById.mockResolvedValue(makeSequence())
    repo.logActivity.mockResolvedValue(makeActivity())
    repo.updateContactStatus.mockResolvedValue(makeContact({ currentStep: 2 }))

    await outreachService.logActivity(ctx, { contactId: CONTACT_ID, activityType: "SENT" })

    expect(inngest.send).toHaveBeenCalledWith({
      name: "outreach/activity.logged",
      data: expect.objectContaining({ sector: "recruitment" }),
    })
  })
})

describe("outreachService.undoActivity", () => {
  it("reverts contact state and logs UNDONE activity", async () => {
    const originalState = { currentStep: 1, status: "ACTIVE", nextDueAt: "2026-03-21T00:00:00.000Z" }
    repo.findActivityById.mockResolvedValue(
      makeActivity({ previousState: originalState, occurredAt: new Date() }),
    )
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE", currentStep: 2 }))
    repo.findSequenceById.mockResolvedValue(makeSequence())
    repo.updateContactStatus.mockResolvedValue(makeContact(originalState))
    repo.logActivity.mockResolvedValue(makeActivity({ activityType: "UNDONE" }))

    await outreachService.undoActivity(ctx, { contactId: CONTACT_ID, activityId: ACTIVITY_ID })

    expect(repo.updateContactStatus).toHaveBeenCalledWith(
      TENANT_ID,
      CONTACT_ID,
      expect.objectContaining({
        currentStep: 1,
        status: "ACTIVE",
      }),
    )
    expect(repo.logActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ activityType: "UNDONE" }),
    )
  })

  it("rejects undo if activity belongs to a different contact", async () => {
    repo.findActivityById.mockResolvedValue(
      makeActivity({ contactId: "other-contact-id", previousState: { currentStep: 1, status: "ACTIVE", nextDueAt: null }, occurredAt: new Date() }),
    )

    await expect(
      outreachService.undoActivity(ctx, { contactId: CONTACT_ID, activityId: ACTIVITY_ID }),
    ).rejects.toThrow(BadRequestError)
  })

  it("rejects undo if activity is older than 30 seconds", async () => {
    const oldDate = new Date(Date.now() - 60_000) // 60 seconds ago
    repo.findActivityById.mockResolvedValue(
      makeActivity({ previousState: { currentStep: 1, status: "ACTIVE", nextDueAt: null }, occurredAt: oldDate }),
    )

    await expect(
      outreachService.undoActivity(ctx, { contactId: CONTACT_ID, activityId: ACTIVITY_ID }),
    ).rejects.toThrow(BadRequestError)
  })
})

describe("outreachService.batchLogActivity", () => {
  it("logs activity for multiple contacts", async () => {
    const contact2Id = "c-00000000-0000-0000-0000-000000000002"
    repo.findContactById
      .mockResolvedValueOnce(makeContact())
      .mockResolvedValueOnce(makeContact({ id: contact2Id }))
    repo.findSequenceById.mockResolvedValue(makeSequence())
    repo.logActivity.mockResolvedValue(makeActivity())
    repo.updateContactStatus.mockResolvedValue(makeContact({ currentStep: 2 }))

    const result = await outreachService.batchLogActivity(ctx, {
      contactIds: [CONTACT_ID, contact2Id],
      activityType: "SENT",
    })

    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(0)
  })
})

describe("outreachService.reactivateSnoozedContacts", () => {
  it("reactivates contacts whose snooze has expired", async () => {
    repo.reactivateSnoozedContacts.mockResolvedValue(3)

    const count = await outreachService.reactivateSnoozedContacts()

    expect(repo.reactivateSnoozedContacts).toHaveBeenCalled()
    expect(count).toBe(3)
  })
})
