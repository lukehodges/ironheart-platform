import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError, ForbiddenError } from "@/shared/errors"
import { events } from "@/shared/db/schemas/event-framework.schema"
import { replies as repliesTable } from "@/shared/db/schemas/outreach.schema"
import { and, eq } from "drizzle-orm"
import type { Context } from "@/shared/trpc"
import { outreachRepository } from "./outreach.repository"
import type {
  LeadRecord,
  DailyActivityRecord,
  WeeklyHypothesisRecord,
  ReplyRecord,
  DncRecord,
  EnrichedReplyRecord,
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsInput,
  ListDailyActivityInput,
  UpsertDailyActivityInput,
  CreateHypothesisInput,
  EndWeekInput,
  RecordReplyInput,
  AddDncInput,
  OutreachClassifier,
  OutreachLeadOwner,
  OutreachReplySentiment,
  OutreachHypothesisStatus,
} from "./outreach.types"
import type { OutreachEventKind } from "./outreach.events"

const log = logger.child({ module: "outreach.service" })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function emitEvent(params: {
  tenantId: string
  kind: OutreachEventKind
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  actor?: string | null
}): Promise<void> {
  await db.insert(events).values({
    tenantId: params.tenantId,
    kind: params.kind,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
    actor: params.actor ?? null,
  })
}

function actorFromCtx(ctx: Context): string | null {
  return ctx.user?.id ?? null
}

function ensureTenant(ctx: Context): string {
  if (!ctx.tenantId) throw new ForbiddenError("Tenant scope required")
  return ctx.tenantId
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ===========================================================================
// OUTREACH SERVICE
// ===========================================================================

export const outreachService = {
  // -------------------------------------------------------------------------
  // LEADS
  // -------------------------------------------------------------------------

  async listLeads(ctx: Context, input: ListLeadsInput): Promise<LeadRecord[]> {
    return outreachRepository.listLeads(ensureTenant(ctx), input)
  },

  async countLeads(
    ctx: Context,
    input: Omit<ListLeadsInput, "limit" | "offset">,
  ): Promise<number> {
    return outreachRepository.countLeads(ensureTenant(ctx), input)
  },

  async getLead(ctx: Context, id: string): Promise<LeadRecord> {
    const lead = await outreachRepository.getLead(ensureTenant(ctx), id)
    if (!lead) throw new NotFoundError("Lead", id)
    return lead
  },

  async createLead(
    ctx: Context,
    input: CreateLeadInput,
  ): Promise<LeadRecord> {
    const tenantId = ensureTenant(ctx)
    let hypothesisWeekId = input.hypothesisWeekId
    if (hypothesisWeekId === undefined || hypothesisWeekId === null) {
      const active = await outreachRepository.getActiveHypothesis(tenantId)
      hypothesisWeekId = active?.id ?? null
    }
    const lead = await outreachRepository.createLead(tenantId, {
      ...input,
      hypothesisWeekId,
    })
    await emitEvent({
      tenantId,
      kind: "lead.created",
      entityType: "lead",
      entityId: lead.id,
      payload: {
        owner: lead.owner,
        name: lead.name,
        company: lead.company,
        email: lead.email,
      },
      actor: actorFromCtx(ctx),
    })
    return lead
  },

  async updateLead(
    ctx: Context,
    input: UpdateLeadInput,
  ): Promise<LeadRecord> {
    const tenantId = ensureTenant(ctx)
    const lead = await outreachRepository.updateLead(tenantId, input)
    await emitEvent({
      tenantId,
      kind: "lead.updated",
      entityType: "lead",
      entityId: lead.id,
      payload: { changes: input },
      actor: actorFromCtx(ctx),
    })
    return lead
  },

  async markLeadSent(
    ctx: Context,
    id: string,
    date?: string,
  ): Promise<LeadRecord> {
    const tenantId = ensureTenant(ctx)
    const when = date ?? today()
    const lead = await outreachRepository.updateLead(tenantId, {
      id,
      status: "sent",
      lastContactedAt: when,
    })
    const touch = await outreachRepository.createTouch(tenantId, {
      leadId: lead.id,
      channel: "email",
      sentAt: new Date(),
    })
    await outreachRepository.incrementDailyActivity(
      tenantId,
      when,
      lead.owner,
      "sent",
      1,
    )
    await emitEvent({
      tenantId,
      kind: "touch.sent",
      entityType: "touch",
      entityId: touch.id,
      payload: { leadId: lead.id, owner: lead.owner, date: when },
      actor: actorFromCtx(ctx),
    })
    return lead
  },

  // Gmail-critical: keep this signature stable for the gmail processor.
  async recordReply(
    ctx: Context,
    input: RecordReplyInput,
  ): Promise<ReplyRecord> {
    const tenantId = ensureTenant(ctx)
    const reply = await outreachRepository.createReply(tenantId, input)
    const leadUpdate: UpdateLeadInput = { id: input.leadId, reply: true }
    if (input.sentiment !== undefined && input.sentiment !== null) {
      leadUpdate.replySentiment = input.sentiment
    }
    const lead = await outreachRepository.updateLead(tenantId, leadUpdate)
    if (input.sentiment) {
      const when = today()
      await outreachRepository.incrementDailyActivity(
        tenantId,
        when,
        lead.owner,
        "replies",
        1,
      )
      if (input.sentiment === "positive") {
        await outreachRepository.incrementDailyActivity(
          tenantId,
          when,
          lead.owner,
          "positive",
          1,
        )
      }
    }
    await emitEvent({
      tenantId,
      kind: "reply.received",
      entityType: "reply",
      entityId: reply.id,
      payload: {
        leadId: input.leadId,
        sentiment: input.sentiment ?? null,
        classifiedBy: input.classifiedBy ?? null,
      },
      actor: actorFromCtx(ctx),
    })
    return reply
  },

  async classifyReply(
    ctx: Context,
    input: {
      replyId: string
      sentiment: OutreachReplySentiment
      classifiedBy: OutreachClassifier
    },
  ): Promise<ReplyRecord> {
    const tenantId = ensureTenant(ctx)
    const [reply] = await db
      .select()
      .from(repliesTable)
      .where(
        and(
          eq(repliesTable.tenantId, tenantId),
          eq(repliesTable.id, input.replyId),
        ),
      )
      .limit(1)
    if (!reply) throw new NotFoundError("Reply", input.replyId)
    const wasPositive = reply.sentiment === "positive"
    const becomesPositive = input.sentiment === "positive"
    const [updated] = await db
      .update(repliesTable)
      .set({ sentiment: input.sentiment, classifiedBy: input.classifiedBy })
      .where(
        and(
          eq(repliesTable.tenantId, tenantId),
          eq(repliesTable.id, input.replyId),
        ),
      )
      .returning()
    const lead = await outreachRepository.updateLead(tenantId, {
      id: reply.leadId,
      replySentiment: input.sentiment,
    })
    if (!wasPositive && becomesPositive) {
      await outreachRepository.incrementDailyActivity(
        tenantId,
        today(),
        lead.owner,
        "positive",
        1,
      )
    }
    await emitEvent({
      tenantId,
      kind: "reply.classified",
      entityType: "reply",
      entityId: updated.id,
      payload: { sentiment: input.sentiment, classifiedBy: input.classifiedBy },
      actor: actorFromCtx(ctx),
    })
    return updated
  },

  async markReplyHandled(
    ctx: Context,
    id: string,
    sentiment?: OutreachReplySentiment,
  ): Promise<void> {
    const tenantId = ensureTenant(ctx)
    await outreachRepository.markReplyHandled(tenantId, id, sentiment)
    await emitEvent({
      tenantId,
      kind: "reply.handled",
      entityType: "reply",
      entityId: id,
      payload: { sentiment: sentiment ?? null },
      actor: actorFromCtx(ctx),
    })
  },

  async listReplies(
    ctx: Context,
    opts: {
      needsReview?: boolean
      handled?: boolean
      leadId?: string
      sinceDays?: number
      limit?: number
    },
  ): Promise<ReplyRecord[]> {
    return outreachRepository.listReplies(ensureTenant(ctx), opts)
  },

  async listRepliesEnriched(
    ctx: Context,
    opts: { needsReview?: boolean; sinceDays?: number; limit?: number },
  ): Promise<EnrichedReplyRecord[]> {
    return outreachRepository.listRepliesEnriched(ensureTenant(ctx), opts)
  },

  async tabCounts(ctx: Context) {
    return outreachRepository.tabCounts(ensureTenant(ctx))
  },

  // -------------------------------------------------------------------------
  // DAILY ACTIVITY
  // -------------------------------------------------------------------------

  async listDailyActivity(
    ctx: Context,
    input: ListDailyActivityInput,
  ): Promise<DailyActivityRecord[]> {
    return outreachRepository.listDailyActivity(ensureTenant(ctx), input)
  },

  async upsertDailyActivity(
    ctx: Context,
    input: UpsertDailyActivityInput,
  ): Promise<DailyActivityRecord> {
    return outreachRepository.upsertDailyActivity(ensureTenant(ctx), input)
  },

  // -------------------------------------------------------------------------
  // WEEKLY HYPOTHESIS
  // -------------------------------------------------------------------------

  async listHypotheses(
    ctx: Context,
    opts: { status?: OutreachHypothesisStatus; limit?: number } = {},
  ): Promise<WeeklyHypothesisRecord[]> {
    return outreachRepository.listHypotheses(ensureTenant(ctx), opts)
  },

  async getActiveHypothesis(
    ctx: Context,
  ): Promise<WeeklyHypothesisRecord | null> {
    return outreachRepository.getActiveHypothesis(ensureTenant(ctx))
  },

  async createHypothesis(
    ctx: Context,
    input: CreateHypothesisInput,
  ): Promise<WeeklyHypothesisRecord> {
    const tenantId = ensureTenant(ctx)
    const currentActive = await outreachRepository.getActiveHypothesis(tenantId)
    if (currentActive) {
      await outreachRepository.updateHypothesisStatus(
        tenantId,
        currentActive.id,
        "complete",
      )
    }
    return outreachRepository.createHypothesis(tenantId, input)
  },

  async endWeek(
    ctx: Context,
    input: EndWeekInput,
  ): Promise<{
    previous: WeeklyHypothesisRecord
    next: WeeklyHypothesisRecord | null
  }> {
    const tenantId = ensureTenant(ctx)
    const previous = await outreachRepository.updateHypothesisStatus(
      tenantId,
      input.hypothesisId,
      "complete",
      input.verdict,
      input.resultSummary,
    )
    let next: WeeklyHypothesisRecord | null = null
    if (input.nextHypothesis) {
      next = await outreachRepository.createHypothesis(tenantId, {
        ...input.nextHypothesis,
        prevWeekId: input.hypothesisId,
      })
    }
    return { previous, next }
  },

  // -------------------------------------------------------------------------
  // PULL BATCH (the "Pull 25" button)
  // -------------------------------------------------------------------------

  async pullBatch(
    ctx: Context,
    input: { owner: OutreachLeadOwner; count: number; hypothesisId?: string },
  ): Promise<LeadRecord[]> {
    return outreachRepository.listLeads(ensureTenant(ctx), {
      status: "ready",
      owner: input.owner,
      researched: true,
      hypothesisWeekId: input.hypothesisId,
      excludeDnc: true, // hard suppression gate — never pull a DNC'd lead
      limit: input.count,
      offset: 0,
    })
  },

  /**
   * Pull a batch AND render each lead's email (subject + body + mailto).
   * Returns an array of (lead, composed) pairs the UI can iterate.
   */
  async composeBatch(
    ctx: Context,
    input: { owner: OutreachLeadOwner; count: number; hypothesisId?: string },
  ): Promise<Array<{ lead: LeadRecord; composed: import("./copy/rotations").ComposedEmail }>> {
    const { composeEmail } = await import("./copy/rotations")
    const leads = await this.pullBatch(ctx, input)
    const sender = input.owner === "alex" ? "Alex" : "Luke"
    return leads.map((lead, i) => ({
      lead,
      composed: composeEmail(lead, {
        index: i,
        sender,
        proofVariant: "auto",
        local: /\b(Bath|Bristol|Wells|Frome)\b/i.test(lead.company + " " + (lead.notes ?? "")),
      }),
    }))
  },

  /** Mark a list of leads sent in one shot — used by the send-list modal. */
  async markBatchSent(
    ctx: Context,
    input: { leadIds: string[]; date?: string },
  ): Promise<{ updated: number }> {
    let updated = 0
    for (const id of input.leadIds) {
      try {
        await this.markLeadSent(ctx, id, input.date)
        updated++
      } catch {
        // continue — skip any lead that's already sent / not found
      }
    }
    return { updated }
  },

  // -------------------------------------------------------------------------
  // DNC
  // -------------------------------------------------------------------------

  async addDnc(
    ctx: Context,
    input: AddDncInput,
    addedBy?: string,
  ): Promise<DncRecord> {
    const tenantId = ensureTenant(ctx)
    const row = await outreachRepository.addDnc(
      tenantId,
      input,
      addedBy ?? actorFromCtx(ctx) ?? undefined,
    )
    // Keep the roster coherent: flip any matching lead rows to "dnc" so they
    // stop showing as pullable. (The send path is already gated by excludeDnc.)
    await outreachRepository.suppressMatchingLeads(
      tenantId,
      row.email,
      row.domain,
    )
    await emitEvent({
      tenantId,
      kind: "dnc.added",
      entityType: "dnc",
      entityId: row.id,
      payload: { email: row.email, domain: row.domain, reason: row.reason },
      actor: actorFromCtx(ctx),
    })
    return row
  },

  async isOnDnc(ctx: Context, email: string): Promise<boolean> {
    return outreachRepository.isOnDnc(ensureTenant(ctx), email)
  },

  async listDnc(
    ctx: Context,
    opts: { search?: string; limit?: number },
  ): Promise<DncRecord[]> {
    return outreachRepository.listDnc(ensureTenant(ctx), opts)
  },
}

export type OutreachService = typeof outreachService

void log
