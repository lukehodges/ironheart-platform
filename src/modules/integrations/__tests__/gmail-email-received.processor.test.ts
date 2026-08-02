/**
 * Smoke test for the Gmail email-received processor. Mocks outreach service
 * + repository so we can assert recordReply is called with the right shape.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/modules/jobs/processors/processor.registry", () => ({
  registerProcessor: vi.fn(),
}))

const recordReply = vi.fn().mockResolvedValue({ id: "reply-1" })
vi.mock("@/modules/outreach", () => ({
  outreachService: { recordReply },
}))

const findTouchByExternalMessageId = vi.fn()
vi.mock("@/modules/outreach/outreach.repository", () => ({
  outreachRepository: { findTouchByExternalMessageId },
}))

vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

import { gmailEmailReceivedProcessor } from "../processors/gmail-email-received.processor"
import type {
  ProcessorContext,
  ResolveLeadInput,
  ResolvedLead,
} from "@/modules/jobs/processors/processor.types"
import type { GmailEmailPayload } from "../providers/gmail.provider"

const TENANT_ID = "00000000-0000-0000-0000-000000000001"
const LEAD_ID = "00000000-0000-0000-0000-000000000002"

function makeCtx(opts: {
  resolve?: ResolvedLead | null
} = {}): ProcessorContext {
  const resolveLead = vi.fn(async (_: ResolveLeadInput) =>
    opts.resolve === undefined
      ? { leadId: LEAD_ID }
      : opts.resolve,
  )
  return {
    rawEventId: "raw-1",
    tenantId: TENANT_ID,
    receivedAt: new Date("2026-05-31T10:00:00Z"),
    attempt: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: undefined as any,
    emit: vi.fn(),
    resolveLead,
  }
}

function makePayload(overrides: Partial<GmailEmailPayload> = {}): GmailEmailPayload {
  return {
    messageId: "<msg-1@gmail>",
    threadId: "thread-1",
    from: { name: "Simon Gerrard", email: "simon@example.com" },
    to: [{ name: "Luke", email: "luke@theironheart.org" }],
    subject: "Re: chandelier hire",
    body: "Sounds good — let's book.",
    inReplyTo: "outbound-msg-id-1",
    references: ["outbound-msg-id-1"],
    date: "2026-05-31T09:00:00.000Z",
    rawHeaders: {},
    ...overrides,
  }
}

beforeEach(() => {
  recordReply.mockClear()
  findTouchByExternalMessageId.mockReset()
})

describe("gmailEmailReceivedProcessor", () => {
  it("drops unknown senders silently", async () => {
    const ctx = makeCtx({ resolve: null })
    const result = await gmailEmailReceivedProcessor.handle(ctx, makePayload())
    expect(result).toEqual({ ok: true })
    expect(recordReply).not.toHaveBeenCalled()
  })

  it("records reply with correlated touchId when In-Reply-To matches", async () => {
    findTouchByExternalMessageId.mockResolvedValue({
      id: "touch-1",
      tenantId: TENANT_ID,
    })

    const ctx = makeCtx()
    await gmailEmailReceivedProcessor.handle(ctx, makePayload())

    expect(findTouchByExternalMessageId).toHaveBeenCalledWith(
      TENANT_ID,
      "outbound-msg-id-1",
    )
    expect(recordReply).toHaveBeenCalledOnce()
    const [, input] = recordReply.mock.calls[0]
    expect(input).toMatchObject({
      leadId: LEAD_ID,
      touchId: "touch-1",
      subject: "Re: chandelier hire",
      rawEventId: "raw-1",
    })
  })

  it("records reply with null touchId when no correlation", async () => {
    findTouchByExternalMessageId.mockResolvedValue(null)

    const ctx = makeCtx()
    await gmailEmailReceivedProcessor.handle(
      ctx,
      makePayload({ inReplyTo: null, references: [] }),
    )

    expect(recordReply).toHaveBeenCalledOnce()
    const [, input] = recordReply.mock.calls[0]
    expect(input.touchId).toBeNull()
  })

  it("leaves sentiment null on OOO subject (no rule fires for OOO)", async () => {
    const ctx = makeCtx()
    await gmailEmailReceivedProcessor.handle(
      ctx,
      makePayload({ subject: "Out of office — back Monday" }),
    )
    const [, input] = recordReply.mock.calls[0]
    expect(input.sentiment).toBeNull()
    expect(input.classifiedBy).toBeNull()
  })

  it("leaves sentiment null on noreply sender", async () => {
    const ctx = makeCtx()
    await gmailEmailReceivedProcessor.handle(
      ctx,
      makePayload({ from: { name: null, email: "noreply@bigco.com" } }),
    )
    const [, input] = recordReply.mock.calls[0]
    expect(input.sentiment).toBeNull()
  })

  it("classifies unsubscribe body text as negative via 'rule' classifier", async () => {
    const ctx = makeCtx()
    await gmailEmailReceivedProcessor.handle(
      ctx,
      makePayload({ body: "please unsubscribe me from this list" }),
    )
    const [, input] = recordReply.mock.calls[0]
    expect(input.sentiment).toBe("negative")
    expect(input.classifiedBy).toBe("rule")
  })

  it("leaves sentiment null when no rule fires", async () => {
    const ctx = makeCtx()
    await gmailEmailReceivedProcessor.handle(ctx, makePayload())
    const [, input] = recordReply.mock.calls[0]
    expect(input.sentiment).toBeNull()
    expect(input.classifiedBy).toBeNull()
  })

  it("returns ok:false when tenantId is missing", async () => {
    const ctx = makeCtx()
    const result = await gmailEmailReceivedProcessor.handle(
      { ...ctx, tenantId: null },
      makePayload(),
    )
    expect(result).toEqual({
      ok: false,
      error: "Missing tenantId",
      retryable: false,
    })
  })
})
