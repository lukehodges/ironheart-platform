import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks (must be set up before importing the service)
// ---------------------------------------------------------------------------

const insertReturning = vi.fn().mockResolvedValue([{ id: "evt-1" }])
const insertValues = vi.fn().mockReturnValue({ returning: insertReturning })

vi.mock("@/shared/db", () => ({
  db: {
    // service uses db.insert(events).values(...) to write to outbox
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  },
}))

vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

vi.mock("../outreach.repository", () => ({
  outreachRepository: {
    // companies
    listCompanies: vi.fn(),
    findCompanyById: vi.fn(),
    findCompanyByDomain: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    bulkInsertCompanies: vi.fn(),
    // contacts
    listContacts: vi.fn(),
    findContactById: vi.fn(),
    findContactsByEmails: vi.fn().mockResolvedValue([]),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    markContactBounced: vi.fn(),
    bulkInsertContacts: vi.fn(),
    // campaigns
    listCampaigns: vi.fn(),
    findCampaignById: vi.fn(),
    createCampaign: vi.fn(),
    // templates
    listTemplates: vi.fn(),
    findTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    // touches
    listTouches: vi.fn(),
    findTouchById: vi.fn(),
    listOpenTouches: vi.fn(),
    findTouchByExternalMessageId: vi.fn(),
    insertTouch: vi.fn(),
    updateTouch: vi.fn(),
    // replies
    listReplies: vi.fn(),
    findReplyById: vi.fn(),
    listRepliesNeedingReview: vi.fn(),
    insertReply: vi.fn(),
    updateReply: vi.fn(),
    markReplyHandled: vi.fn(),
    // dnc
    listDnc: vi.fn(),
    insertDnc: vi.fn(),
    flipMatchingContactsDnc: vi.fn().mockResolvedValue(0),
    flipMatchingCompaniesDnc: vi.fn().mockResolvedValue(0),
    isDoNotContact: vi.fn().mockResolvedValue(false),
  },
}))

import { outreachService } from "../outreach.service"
import { outreachRepository } from "../outreach.repository"
import { BadRequestError, NotFoundError } from "@/shared/errors"

const repo = outreachRepository as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>

const TENANT_ID = "00000000-0000-0000-0000-000000000001"
const COMPANY_ID = "00000000-0000-0000-0000-0000000000c1"
const CONTACT_ID = "00000000-0000-0000-0000-000000000c01"
const TOUCH_ID = "00000000-0000-0000-0000-000000000401"
const REPLY_ID = "00000000-0000-0000-0000-000000000501"
const DNC_ID = "00000000-0000-0000-0000-000000000d01"

const ctx = {
  tenantId: TENANT_ID,
  user: { id: "user-1", tenantId: TENANT_ID },
  db: {},
  session: null,
  requestId: "req-1",
  req: {} as unknown,
  tenantSlug: "test-tenant",
} as unknown as import("@/shared/trpc").Context

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTACT_ID,
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    fullName: "Test Contact",
    role: null,
    email: "test@example.com",
    phone: null,
    linkedinUrl: null,
    isOwner: false,
    isDecisionMaker: false,
    bounced: false,
    doNotContact: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeTouch(overrides: Record<string, unknown> = {}) {
  return {
    id: TOUCH_ID,
    tenantId: TENANT_ID,
    campaignId: null,
    contactId: CONTACT_ID,
    templateId: null,
    channel: "email" as const,
    sentAt: null,
    subjectRendered: "Subject",
    bodyRendered: "Body",
    deliveryStatus: "queued" as const,
    openAt: null,
    clickAt: null,
    replyStatus: "none" as const,
    replyAt: null,
    replySummary: null,
    nextAction: null,
    nextActionAt: null,
    externalMessageId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeReply(overrides: Record<string, unknown> = {}) {
  return {
    id: REPLY_ID,
    tenantId: TENANT_ID,
    touchId: TOUCH_ID,
    contactId: CONTACT_ID,
    receivedAt: new Date(),
    subject: "Re: Hello",
    body: "Sure, let's talk",
    classifiedAs: null,
    classifiedBy: null,
    classificationConfidence: null,
    needsReview: true,
    handled: false,
    handledAt: null,
    rawEventId: null,
    createdAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  insertReturning.mockResolvedValue([{ id: "evt-1" }])
  insertValues.mockReturnValue({ returning: insertReturning })
  repo.isDoNotContact.mockResolvedValue(false)
  repo.findContactsByEmails.mockResolvedValue([])
  repo.flipMatchingContactsDnc.mockResolvedValue(0)
  repo.flipMatchingCompaniesDnc.mockResolvedValue(0)
})

// ---------------------------------------------------------------------------
// COMPANIES
// ---------------------------------------------------------------------------

describe("outreachService.createCompany", () => {
  it("creates a company and emits company.created", async () => {
    const company = {
      id: COMPANY_ID,
      tenantId: TENANT_ID,
      name: "Acme",
      domain: "acme.test",
    } as never
    repo.createCompany.mockResolvedValue(company)

    const result = await outreachService.createCompany(ctx, {
      name: "Acme",
      domain: "acme.test",
    })

    expect(result).toBe(company)
    expect(repo.createCompany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ name: "Acme" }),
    )
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "company.created" }),
    )
  })
})

describe("outreachService.getCompany", () => {
  it("throws NotFoundError if missing", async () => {
    repo.findCompanyById.mockResolvedValue(null)
    await expect(outreachService.getCompany(ctx, COMPANY_ID)).rejects.toThrow(
      NotFoundError,
    )
  })
})

// ---------------------------------------------------------------------------
// CONTACTS
// ---------------------------------------------------------------------------

describe("outreachService.createContact", () => {
  it("inserts a contact and emits contact.created", async () => {
    repo.createContact.mockResolvedValue(makeContact() as never)

    await outreachService.createContact(ctx, {
      companyId: COMPANY_ID,
      fullName: "Test Contact",
      email: "test@example.com",
    })

    expect(repo.createContact).toHaveBeenCalledTimes(1)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "contact.created" }),
    )
  })
})

// ---------------------------------------------------------------------------
// TOUCHES — sendTouch
// ---------------------------------------------------------------------------

describe("outreachService.sendTouch", () => {
  it("rejects when contact is on DNC", async () => {
    repo.findContactById.mockResolvedValue(makeContact() as never)
    repo.isDoNotContact.mockResolvedValue(true)

    await expect(
      outreachService.sendTouch(ctx, {
        contactId: CONTACT_ID,
        channel: "email",
      }),
    ).rejects.toThrow(BadRequestError)

    expect(repo.insertTouch).not.toHaveBeenCalled()
  })

  it("rejects when contact has do_not_contact flag", async () => {
    repo.findContactById.mockResolvedValue(
      makeContact({ doNotContact: true, email: null }) as never,
    )

    await expect(
      outreachService.sendTouch(ctx, {
        contactId: CONTACT_ID,
        channel: "email",
      }),
    ).rejects.toThrow(BadRequestError)
  })

  it("inserts a queued touch and emits touch.queued", async () => {
    repo.findContactById.mockResolvedValue(makeContact() as never)
    repo.insertTouch.mockResolvedValue(makeTouch() as never)

    const result = await outreachService.sendTouch(ctx, {
      contactId: CONTACT_ID,
      channel: "email",
      renderedSubject: "Hi",
      renderedBody: "Body",
    })

    expect(result.id).toBe(TOUCH_ID)
    expect(repo.insertTouch).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        contactId: CONTACT_ID,
        channel: "email",
        deliveryStatus: "queued",
      }),
    )
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "touch.queued", entityType: "touch" }),
    )
  })
})

describe("outreachService.markTouchSent / Delivered / Bounced", () => {
  it("markTouchSent updates and emits touch.sent", async () => {
    repo.updateTouch.mockResolvedValue(
      makeTouch({ deliveryStatus: "sent" }) as never,
    )
    const at = new Date()
    await outreachService.markTouchSent(ctx, TOUCH_ID, at, "msg-123")
    expect(repo.updateTouch).toHaveBeenCalledWith(
      TENANT_ID,
      TOUCH_ID,
      expect.objectContaining({ deliveryStatus: "sent", sentAt: at }),
    )
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "touch.sent" }),
    )
  })

  it("markTouchDelivered updates and emits touch.delivered", async () => {
    repo.updateTouch.mockResolvedValue(
      makeTouch({ deliveryStatus: "delivered" }) as never,
    )
    await outreachService.markTouchDelivered(ctx, TOUCH_ID)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "touch.delivered" }),
    )
  })

  it("markTouchBounced flips contact.bounced and emits touch.bounced", async () => {
    repo.updateTouch.mockResolvedValue(
      makeTouch({ deliveryStatus: "bounced" }) as never,
    )
    repo.markContactBounced.mockResolvedValue(
      makeContact({ bounced: true }) as never,
    )
    await outreachService.markTouchBounced(ctx, TOUCH_ID)
    expect(repo.markContactBounced).toHaveBeenCalledWith(TENANT_ID, CONTACT_ID)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "touch.bounced" }),
    )
  })
})

// ---------------------------------------------------------------------------
// REPLIES
// ---------------------------------------------------------------------------

describe("outreachService.recordReply", () => {
  it("inserts reply, updates parent touch, emits reply.received", async () => {
    repo.insertReply.mockResolvedValue(makeReply() as never)
    repo.updateTouch.mockResolvedValue(makeTouch() as never)

    const result = await outreachService.recordReply(ctx, {
      contactId: CONTACT_ID,
      touchId: TOUCH_ID,
      subject: "Re: hello",
      body: "interested",
      classifiedAs: "positive",
      classifiedBy: "claude",
    })

    expect(result.id).toBe(REPLY_ID)
    expect(repo.updateTouch).toHaveBeenCalledWith(
      TENANT_ID,
      TOUCH_ID,
      expect.objectContaining({ replyStatus: "positive" }),
    )
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "reply.received" }),
    )
  })
})

describe("outreachService.classifyReply", () => {
  it("clears needsReview when confidence > 0.8", async () => {
    repo.updateReply.mockResolvedValue(
      makeReply({ needsReview: false, classifiedAs: "positive" }) as never,
    )
    await outreachService.classifyReply(
      ctx,
      REPLY_ID,
      "positive",
      "claude",
      0.95,
    )
    expect(repo.updateReply).toHaveBeenCalledWith(
      TENANT_ID,
      REPLY_ID,
      expect.objectContaining({ needsReview: false }),
    )
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "reply.classified" }),
    )
  })

  it("keeps needsReview when confidence <= 0.8", async () => {
    repo.updateReply.mockResolvedValue(
      makeReply({ needsReview: true, touchId: null }) as never,
    )
    await outreachService.classifyReply(
      ctx,
      REPLY_ID,
      "positive",
      "claude",
      0.5,
    )
    expect(repo.updateReply).toHaveBeenCalledWith(
      TENANT_ID,
      REPLY_ID,
      expect.objectContaining({ needsReview: true }),
    )
  })
})

// ---------------------------------------------------------------------------
// DNC
// ---------------------------------------------------------------------------

describe("outreachService.addToDnc", () => {
  it("throws when neither email nor domain provided", async () => {
    await expect(outreachService.addToDnc(ctx, {})).rejects.toThrow(
      BadRequestError,
    )
  })

  it("inserts DNC, flips contacts, emits dnc.added", async () => {
    repo.insertDnc.mockResolvedValue({
      id: DNC_ID,
      tenantId: TENANT_ID,
      email: "spam@evil.test",
      domain: null,
    } as never)

    await outreachService.addToDnc(ctx, {
      email: "spam@evil.test",
      reason: "complaint",
    })

    expect(repo.insertDnc).toHaveBeenCalled()
    expect(repo.flipMatchingContactsDnc).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ email: "spam@evil.test" }),
    )
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "dnc.added" }),
    )
  })

  it("flips matching companies when domain provided", async () => {
    repo.insertDnc.mockResolvedValue({
      id: DNC_ID,
      tenantId: TENANT_ID,
      email: null,
      domain: "evil.test",
    } as never)
    await outreachService.addToDnc(ctx, { domain: "evil.test" })
    expect(repo.flipMatchingCompaniesDnc).toHaveBeenCalledWith(
      TENANT_ID,
      "evil.test",
      null,
    )
  })
})

describe("outreachService.checkDnc", () => {
  it("returns repository result", async () => {
    repo.isDoNotContact.mockResolvedValue(true)
    const result = await outreachService.checkDnc(ctx, "x@y.com")
    expect(result).toEqual({ doNotContact: true })
  })
})

// ---------------------------------------------------------------------------
// BULK IMPORT
// ---------------------------------------------------------------------------

describe("outreachService.bulkImportLeads", () => {
  it("dedups by company domain + contact email, returns counts", async () => {
    repo.findCompanyByDomain.mockResolvedValue(null)
    repo.bulkInsertCompanies.mockResolvedValue([
      { id: "co-1", tenantId: TENANT_ID, domain: "acme.test", name: "Acme" },
    ] as never)
    repo.findContactsByEmails.mockResolvedValue([])
    repo.bulkInsertContacts.mockResolvedValue([
      makeContact({ id: "ct-1", email: "a@acme.test" }),
    ] as never)

    const result = await outreachService.bulkImportLeads(ctx, [
      {
        companyName: "Acme",
        domain: "acme.test",
        contactName: "Alice",
        email: "a@acme.test",
      },
      {
        // duplicate domain — should not double-insert company
        companyName: "Acme",
        domain: "acme.test",
        contactName: "Bob",
        email: "a@acme.test", // duplicate email — should skip
      },
    ])

    expect(result.companiesCreated).toBe(1)
    expect(result.contactsCreated).toBe(1)
    expect(result.skipped).toBe(1)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "leads.imported" }),
    )
  })
})
