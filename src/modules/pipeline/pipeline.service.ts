import { logger } from "@/shared/logger"
import { NotFoundError, BadRequestError } from "@/shared/errors"
import { db } from "@/shared/db"
import { replies } from "@/shared/db/schemas/outreach.schema"
import { eq, and } from "drizzle-orm"
import { emitEvent } from "@/modules/jobs/event-emitter"
import { pipelineRepository } from "./pipeline.repository"
import {
  TERMINAL_STAGES,
  STAGE_ORDER,
  type CreateDealInput,
  type DealRecord,
  type DealEventRecord,
  type DealStage,
  type ListDealsFilters,
  type StageCounts,
  type UpdateDealInput,
} from "./pipeline.types"

const log = logger.child({ module: "pipeline.service" })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actorFromTenant(tenantId: string, ownerId?: string | null): string {
  return ownerId ?? `tenant:${tenantId}`
}

async function loadDealOrThrow(
  tenantId: string,
  dealId: string,
): Promise<DealRecord> {
  const deal = await pipelineRepository.getDealById(tenantId, dealId)
  if (!deal) throw new NotFoundError("Deal", dealId)
  return deal
}

// ===========================================================================
// PIPELINE SERVICE
// ===========================================================================

export const pipelineService = {
  // ----- Queries -----

  async listDeals(
    tenantId: string,
    filters: ListDealsFilters = {},
  ): Promise<DealRecord[]> {
    return pipelineRepository.listDeals(tenantId, filters)
  },

  async getDeal(tenantId: string, dealId: string): Promise<DealRecord> {
    return loadDealOrThrow(tenantId, dealId)
  },

  async listDealEvents(
    tenantId: string,
    dealId: string,
  ): Promise<DealEventRecord[]> {
    await loadDealOrThrow(tenantId, dealId)
    return pipelineRepository.listDealEvents(tenantId, dealId)
  },

  async getStageCounts(tenantId: string): Promise<StageCounts> {
    return pipelineRepository.getStageCounts(tenantId)
  },

  async getWeightedValue(tenantId: string): Promise<number> {
    return pipelineRepository.getWeightedValue(tenantId)
  },

  // ----- Mutations -----

  async createDeal(
    args: { tenantId: string; actor?: string | null } & CreateDealInput,
  ): Promise<DealRecord> {
    const { tenantId, actor, ...input } = args
    const initialStage = input.stage ?? "qualified"

    const deal = await pipelineRepository.createDeal(tenantId, {
      ...input,
      stage: initialStage,
    })

    await pipelineRepository.createDealEvent(tenantId, {
      dealId: deal.id,
      kind: "stage_changed",
      payload: { from: null, to: initialStage },
      actor: actor ?? null,
    })

    await emitEvent({
      tenantId,
      kind: "deal.created",
      entityType: "deal",
      entityId: deal.id,
      payload: {
        dealId: deal.id,
        companyId: deal.companyId,
        stage: deal.stage,
        product: deal.product,
        originTouchId: deal.originTouchId,
      },
      actor: actorFromTenant(tenantId, actor),
    })

    return deal
  },

  async moveStage(args: {
    tenantId: string
    dealId: string
    newStage: DealStage
    actor?: string | null
    reason?: string | null
  }): Promise<DealRecord> {
    const { tenantId, dealId, newStage, actor, reason } = args
    const existing = await loadDealOrThrow(tenantId, dealId)

    if (existing.stage === newStage) {
      // No-op, but still emit a stage_changed? We just return existing.
      return existing
    }

    const closedAt = TERMINAL_STAGES.has(newStage) ? new Date() : null

    const updated = await pipelineRepository.updateDeal(tenantId, dealId, {
      stage: newStage,
      closedAt,
      ...(reason ? { closeReason: reason } : {}),
    })

    await pipelineRepository.createDealEvent(tenantId, {
      dealId,
      kind: "stage_changed",
      payload: { from: existing.stage, to: newStage, reason: reason ?? null },
      actor: actor ?? null,
    })

    await emitEvent({
      tenantId,
      kind: "deal.stage_changed",
      entityType: "deal",
      entityId: dealId,
      payload: {
        dealId,
        from: existing.stage,
        to: newStage,
        reason: reason ?? null,
      },
      actor: actorFromTenant(tenantId, actor),
    })

    if (newStage === "won") {
      await emitEvent({
        tenantId,
        kind: "deal.won",
        entityType: "deal",
        entityId: dealId,
        payload: {
          dealId,
          companyId: updated.companyId,
          product: updated.product,
          valueEstimate: updated.valueEstimate,
        },
        actor: actorFromTenant(tenantId, actor),
      })
    }

    return updated
  },

  async updateDeal(args: {
    tenantId: string
    dealId: string
    patch: UpdateDealInput
    actor?: string | null
  }): Promise<DealRecord> {
    const { tenantId, dealId, patch, actor } = args
    await loadDealOrThrow(tenantId, dealId)
    const updated = await pipelineRepository.updateDeal(tenantId, dealId, patch)

    await emitEvent({
      tenantId,
      kind: "deal.updated",
      entityType: "deal",
      entityId: dealId,
      payload: { dealId, patch },
      actor: actorFromTenant(tenantId, actor),
    })

    return updated
  },

  async addNote(args: {
    tenantId: string
    dealId: string
    body: string
    actor?: string | null
  }): Promise<DealEventRecord> {
    const { tenantId, dealId, body, actor } = args
    await loadDealOrThrow(tenantId, dealId)

    const event = await pipelineRepository.createDealEvent(tenantId, {
      dealId,
      kind: "note_added",
      payload: { body },
      actor: actor ?? null,
    })

    await emitEvent({
      tenantId,
      kind: "deal.note_added",
      entityType: "deal",
      entityId: dealId,
      payload: { dealId, body, eventId: event.id },
      actor: actorFromTenant(tenantId, actor),
    })

    return event
  },

  async recordMeetingBooked(args: {
    tenantId: string
    dealId: string
    meetingPayload: Record<string, unknown>
    actor?: string | null
  }): Promise<DealEventRecord> {
    const { tenantId, dealId, meetingPayload, actor } = args
    await loadDealOrThrow(tenantId, dealId)

    const event = await pipelineRepository.createDealEvent(tenantId, {
      dealId,
      kind: "meeting_booked",
      payload: meetingPayload,
      actor: actor ?? null,
    })

    await emitEvent({
      tenantId,
      kind: "deal.meeting_booked",
      entityType: "deal",
      entityId: dealId,
      payload: { dealId, meeting: meetingPayload, eventId: event.id },
      actor: actorFromTenant(tenantId, actor),
    })

    return event
  },

  async recordProposalSent(args: {
    tenantId: string
    dealId: string
    proposalRef: Record<string, unknown>
    actor?: string | null
  }): Promise<DealRecord> {
    const { tenantId, dealId, proposalRef, actor } = args
    const existing = await loadDealOrThrow(tenantId, dealId)

    const event = await pipelineRepository.createDealEvent(tenantId, {
      dealId,
      kind: "proposal_sent",
      payload: proposalRef,
      actor: actor ?? null,
    })

    await emitEvent({
      tenantId,
      kind: "deal.proposal_sent",
      entityType: "deal",
      entityId: dealId,
      payload: { dealId, proposal: proposalRef, eventId: event.id },
      actor: actorFromTenant(tenantId, actor),
    })

    // Auto-advance stage to proposal if currently behind.
    let current = existing
    if (
      STAGE_ORDER[current.stage] < STAGE_ORDER.proposal &&
      !TERMINAL_STAGES.has(current.stage)
    ) {
      current = await this.moveStage({
        tenantId,
        dealId,
        newStage: "proposal",
        actor,
        reason: "auto: proposal_sent",
      })
    }

    return current
  },

  async recordContractSigned(args: {
    tenantId: string
    dealId: string
    contractRef: Record<string, unknown>
    actor?: string | null
  }): Promise<DealRecord> {
    const { tenantId, dealId, contractRef, actor } = args
    const existing = await loadDealOrThrow(tenantId, dealId)

    const event = await pipelineRepository.createDealEvent(tenantId, {
      dealId,
      kind: "contract_signed",
      payload: contractRef,
      actor: actor ?? null,
    })

    await emitEvent({
      tenantId,
      kind: "deal.contract_signed",
      entityType: "deal",
      entityId: dealId,
      payload: { dealId, contract: contractRef, eventId: event.id },
      actor: actorFromTenant(tenantId, actor),
    })

    if (existing.stage !== "won") {
      return this.moveStage({
        tenantId,
        dealId,
        newStage: "won",
        actor,
        reason: "auto: contract_signed",
      })
    }
    return existing
  },

  /**
   * Convert a positive outreach reply into a pipeline deal.
   *
   * Looks up the reply (tenant-scoped), uses its touchId as the deal's
   * origin_touch_id for attribution, then creates the deal.
   */
  async convertFromReply(args: {
    tenantId: string
    replyId: string
    dealInput: Omit<CreateDealInput, "originTouchId">
    actor?: string | null
  }): Promise<DealRecord> {
    const { tenantId, replyId, dealInput, actor } = args

    const [reply] = await db
      .select()
      .from(replies)
      .where(and(eq(replies.id, replyId), eq(replies.tenantId, tenantId)))
      .limit(1)

    if (!reply) throw new NotFoundError("Reply", replyId)

    if (!reply.touchId) {
      throw new BadRequestError(
        "Reply has no originating touch — cannot attribute deal",
      )
    }

    return this.createDeal({
      tenantId,
      actor,
      ...dealInput,
      originTouchId: reply.touchId,
    })
  },
}

export type PipelineService = typeof pipelineService
