import { describe, it, expect, vi, beforeEach } from "vitest"
import { pipelineService } from "../pipeline.service"
import { pipelineRepository } from "../pipeline.repository"
import { NotFoundError, BadRequestError } from "@/shared/errors"
import { emitEvent } from "@/modules/jobs/event-emitter"
import type { DealRecord, DealEventRecord } from "../pipeline.types"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../pipeline.repository", () => ({
  pipelineRepository: {
    getDealById: vi.fn(),
    listDeals: vi.fn(),
    getDealsByOriginTouch: vi.fn(),
    findDealByCompany: vi.fn(),
    getStageCounts: vi.fn(),
    getWeightedValue: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    deleteDeal: vi.fn(),
    listDealEvents: vi.fn(),
    createDealEvent: vi.fn(),
  },
}))

vi.mock("@/modules/jobs/event-emitter", () => ({
  emitEvent: vi.fn().mockResolvedValue({ eventId: 1 }),
}))

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "reply-1",
              tenantId: "tenant-1",
              touchId: "touch-1",
            },
          ]),
        }),
      }),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = "00000000-0000-0000-0000-000000000001"
const DEAL_ID = "00000000-0000-0000-0000-000000000100"
const COMPANY_ID = "00000000-0000-0000-0000-000000000200"
const CONTACT_ID = "00000000-0000-0000-0000-000000000300"
const ACTOR = "user-1"

function makeDeal(overrides: Partial<DealRecord> = {}): DealRecord {
  return {
    id: DEAL_ID,
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    primaryContactId: CONTACT_ID,
    originTouchId: null,
    name: "Sample Deal",
    stage: "qualified",
    product: "audit",
    valueEstimate: 3500,
    probability: 30,
    expectedClose: null,
    ownerUserId: null,
    notes: null,
    closedAt: null,
    closeReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeEvent(
  overrides: Partial<DealEventRecord> = {},
): DealEventRecord {
  return {
    id: "evt-1",
    tenantId: TENANT_ID,
    dealId: DEAL_ID,
    kind: "note_added",
    payload: {},
    at: new Date(),
    actor: ACTOR,
    ...overrides,
  }
}

const repo = pipelineRepository as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// Service tests
// ===========================================================================

describe("pipelineService", () => {
  describe("listDeals", () => {
    it("delegates to repository with filters", async () => {
      const deals = [makeDeal()]
      repo.listDeals.mockResolvedValue(deals)

      const result = await pipelineService.listDeals(TENANT_ID, {
        stage: "qualified",
      })

      expect(result).toEqual(deals)
      expect(repo.listDeals).toHaveBeenCalledWith(TENANT_ID, {
        stage: "qualified",
      })
    })
  })

  describe("getDeal", () => {
    it("returns deal when found", async () => {
      const deal = makeDeal()
      repo.getDealById.mockResolvedValue(deal)
      const result = await pipelineService.getDeal(TENANT_ID, DEAL_ID)
      expect(result).toEqual(deal)
    })

    it("throws NotFoundError when missing", async () => {
      repo.getDealById.mockResolvedValue(null)
      await expect(
        pipelineService.getDeal(TENANT_ID, DEAL_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe("createDeal", () => {
    it("inserts deal + initial stage_changed event + emits deal.created", async () => {
      const created = makeDeal()
      repo.createDeal.mockResolvedValue(created)
      repo.createDealEvent.mockResolvedValue(makeEvent({ kind: "stage_changed" }))

      const result = await pipelineService.createDeal({
        tenantId: TENANT_ID,
        actor: ACTOR,
        companyId: COMPANY_ID,
        name: "Sample Deal",
      })

      expect(result).toEqual(created)
      expect(repo.createDeal).toHaveBeenCalled()
      expect(repo.createDealEvent).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          dealId: DEAL_ID,
          kind: "stage_changed",
          payload: { from: null, to: "qualified" },
        }),
      )
      expect(emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          kind: "deal.created",
          entityId: DEAL_ID,
        }),
      )
    })
  })

  describe("moveStage", () => {
    it("updates stage, logs event, emits deal.stage_changed", async () => {
      const existing = makeDeal({ stage: "qualified" })
      const updated = makeDeal({ stage: "demo" })
      repo.getDealById.mockResolvedValue(existing)
      repo.updateDeal.mockResolvedValue(updated)
      repo.createDealEvent.mockResolvedValue(makeEvent())

      const result = await pipelineService.moveStage({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        newStage: "demo",
        actor: ACTOR,
      })

      expect(result).toEqual(updated)
      expect(repo.updateDeal).toHaveBeenCalledWith(
        TENANT_ID,
        DEAL_ID,
        expect.objectContaining({ stage: "demo", closedAt: null }),
      )
      expect(emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "deal.stage_changed" }),
      )
    })

    it("sets closedAt + emits deal.won when moving to won", async () => {
      const existing = makeDeal({ stage: "proposal" })
      const updated = makeDeal({ stage: "won", closedAt: new Date() })
      repo.getDealById.mockResolvedValue(existing)
      repo.updateDeal.mockResolvedValue(updated)
      repo.createDealEvent.mockResolvedValue(makeEvent())

      await pipelineService.moveStage({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        newStage: "won",
        actor: ACTOR,
      })

      expect(repo.updateDeal).toHaveBeenCalledWith(
        TENANT_ID,
        DEAL_ID,
        expect.objectContaining({
          stage: "won",
          closedAt: expect.any(Date),
        }),
      )
      const kinds = (emitEvent as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => (c[0] as { kind: string }).kind,
      )
      expect(kinds).toContain("deal.stage_changed")
      expect(kinds).toContain("deal.won")
    })

    it("is a no-op when stage unchanged", async () => {
      const existing = makeDeal({ stage: "demo" })
      repo.getDealById.mockResolvedValue(existing)

      const result = await pipelineService.moveStage({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        newStage: "demo",
      })

      expect(result).toEqual(existing)
      expect(repo.updateDeal).not.toHaveBeenCalled()
      expect(emitEvent).not.toHaveBeenCalled()
    })
  })

  describe("addNote", () => {
    it("creates note event and emits deal.note_added", async () => {
      const deal = makeDeal()
      repo.getDealById.mockResolvedValue(deal)
      const event = makeEvent({ kind: "note_added", payload: { body: "Hi" } })
      repo.createDealEvent.mockResolvedValue(event)

      const result = await pipelineService.addNote({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        body: "Hi",
        actor: ACTOR,
      })

      expect(result).toEqual(event)
      expect(repo.createDealEvent).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ kind: "note_added", payload: { body: "Hi" } }),
      )
      expect(emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "deal.note_added" }),
      )
    })
  })

  describe("recordProposalSent", () => {
    it("auto-advances stage from qualified → proposal", async () => {
      const existing = makeDeal({ stage: "qualified" })
      const advanced = makeDeal({ stage: "proposal" })

      // First getDealById call (recordProposalSent), then second (moveStage).
      repo.getDealById
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing)
      repo.createDealEvent.mockResolvedValue(makeEvent({ kind: "proposal_sent" }))
      repo.updateDeal.mockResolvedValue(advanced)

      const result = await pipelineService.recordProposalSent({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        proposalRef: { proposalId: "p1" },
        actor: ACTOR,
      })

      expect(result.stage).toBe("proposal")
      expect(repo.updateDeal).toHaveBeenCalledWith(
        TENANT_ID,
        DEAL_ID,
        expect.objectContaining({ stage: "proposal" }),
      )
    })

    it("does not regress when already at won", async () => {
      const existing = makeDeal({ stage: "won" })
      repo.getDealById.mockResolvedValue(existing)
      repo.createDealEvent.mockResolvedValue(makeEvent({ kind: "proposal_sent" }))

      const result = await pipelineService.recordProposalSent({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        proposalRef: {},
      })

      expect(result).toEqual(existing)
      expect(repo.updateDeal).not.toHaveBeenCalled()
    })
  })

  describe("recordContractSigned", () => {
    it("auto-moves to won", async () => {
      const existing = makeDeal({ stage: "proposal" })
      const won = makeDeal({ stage: "won", closedAt: new Date() })
      repo.getDealById
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing)
      repo.createDealEvent.mockResolvedValue(makeEvent({ kind: "contract_signed" }))
      repo.updateDeal.mockResolvedValue(won)

      const result = await pipelineService.recordContractSigned({
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        contractRef: { contractId: "c1" },
      })

      expect(result.stage).toBe("won")
    })
  })

  describe("convertFromReply", () => {
    it("creates deal with origin_touch_id from reply", async () => {
      const created = makeDeal({ originTouchId: "touch-1" })
      repo.createDeal.mockResolvedValue(created)
      repo.createDealEvent.mockResolvedValue(makeEvent({ kind: "stage_changed" }))

      const result = await pipelineService.convertFromReply({
        tenantId: TENANT_ID,
        replyId: "reply-1",
        dealInput: {
          companyId: COMPANY_ID,
          name: "From reply",
        },
        actor: ACTOR,
      })

      expect(result).toEqual(created)
      expect(repo.createDeal).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ originTouchId: "touch-1" }),
      )
    })
  })

  describe("listDealEvents", () => {
    it("returns events when deal exists", async () => {
      const deal = makeDeal()
      const events = [makeEvent()]
      repo.getDealById.mockResolvedValue(deal)
      repo.listDealEvents.mockResolvedValue(events)

      const result = await pipelineService.listDealEvents(TENANT_ID, DEAL_ID)
      expect(result).toEqual(events)
    })

    it("throws NotFoundError when deal missing", async () => {
      repo.getDealById.mockResolvedValue(null)
      await expect(
        pipelineService.listDealEvents(TENANT_ID, DEAL_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe("aggregations", () => {
    it("getStageCounts delegates", async () => {
      const counts = {
        qualified: 1,
        demo: 2,
        proposal: 0,
        won: 3,
        lost: 0,
        dormant: 0,
      }
      repo.getStageCounts.mockResolvedValue(counts)
      expect(await pipelineService.getStageCounts(TENANT_ID)).toEqual(counts)
    })

    it("getWeightedValue delegates", async () => {
      repo.getWeightedValue.mockResolvedValue(1234.5)
      expect(await pipelineService.getWeightedValue(TENANT_ID)).toBe(1234.5)
    })
  })

  // Sanity: ensure BadRequestError is importable / referenced so test file
  // doesn't get tree-shaken weirdly under coverage.
  it("BadRequestError exists", () => {
    expect(BadRequestError).toBeDefined()
  })
})
