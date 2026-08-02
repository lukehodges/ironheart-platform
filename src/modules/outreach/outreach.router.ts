/**
 * Outreach module — tRPC router.
 *
 * Three feature areas mirror the spreadsheet model:
 *   - leads
 *   - dailyActivity
 *   - hypothesis (7-day loop)
 *
 * Plus replies (inbox) and dnc (suppression).
 */

import { z } from "zod"
import {
  router,
  tenantProcedure,
  createModuleMiddleware,
} from "@/shared/trpc"
import { outreachService } from "./outreach.service"
import { crossProviderOverlap, replyRateByTag } from "./intelligence.service"
import { promoteLeadToTwenty, dueForFollowUp } from "./twenty-bridge.service"
import {
  // leads
  listLeadsSchema,
  createLeadSchema,
  updateLeadSchema,
  markLeadSentSchema,
  getLeadSchema,
  // daily activity
  listDailyActivitySchema,
  upsertDailyActivitySchema,
  // hypothesis
  listHypothesesSchema,
  createHypothesisSchema,
  endWeekSchema,
  // pull batch
  pullBatchSchema,
  // replies
  listRepliesSchema,
  classifyReplySchema,
  // dnc
  addDncSchema,
  listDncSchema,
  checkDncSchema,
} from "./outreach.schemas"

const moduleGate = createModuleMiddleware("outreach")
const moduleProcedure = tenantProcedure.use(moduleGate)

const uuid = z.string().uuid()

export const outreachRouter = router({
  // ─── Leads ──────────────────────────────────────────────────────
  listLeads: moduleProcedure
    .input(listLeadsSchema)
    .query(({ ctx, input }) => outreachService.listLeads(ctx, input)),

  countLeads: moduleProcedure
    .input(listLeadsSchema.omit({ limit: true, offset: true }))
    .query(({ ctx, input }) => outreachService.countLeads(ctx, input)),

  tabCounts: moduleProcedure
    .query(({ ctx }) => outreachService.tabCounts(ctx)),

  getLead: moduleProcedure
    .input(getLeadSchema)
    .query(({ ctx, input }) => outreachService.getLead(ctx, input.id)),

  createLead: moduleProcedure
    .input(createLeadSchema)
    .mutation(({ ctx, input }) => outreachService.createLead(ctx, input)),

  updateLead: moduleProcedure
    .input(updateLeadSchema)
    .mutation(({ ctx, input }) => outreachService.updateLead(ctx, input)),

  markLeadSent: moduleProcedure
    .input(markLeadSentSchema)
    .mutation(({ ctx, input }) =>
      outreachService.markLeadSent(ctx, input.id, input.date),
    ),

  // pullBatch is the raw-lead primitive: N ready + researched leads, DNC-excluded.
  // The email is written on top (by Claude / the send modal), not frozen in a
  // template — so the approach can change any time without a code edit.
  pullBatch: moduleProcedure
    .input(pullBatchSchema)
    .query(({ ctx, input }) => outreachService.pullBatch(ctx, input)),

  markBatchSent: moduleProcedure
    .input(
      z.object({
        leadIds: z.array(uuid).min(1).max(100),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .mutation(({ ctx, input }) => outreachService.markBatchSent(ctx, input)),

  // ─── Daily activity ─────────────────────────────────────────────
  listDailyActivity: moduleProcedure
    .input(listDailyActivitySchema)
    .query(({ ctx, input }) => outreachService.listDailyActivity(ctx, input)),

  upsertDailyActivity: moduleProcedure
    .input(upsertDailyActivitySchema)
    .mutation(({ ctx, input }) =>
      outreachService.upsertDailyActivity(ctx, input),
    ),

  // ─── Weekly hypothesis ──────────────────────────────────────────
  listHypotheses: moduleProcedure
    .input(listHypothesesSchema)
    .query(({ ctx, input }) => outreachService.listHypotheses(ctx, input)),

  getActiveHypothesis: moduleProcedure
    .query(({ ctx }) => outreachService.getActiveHypothesis(ctx)),

  createHypothesis: moduleProcedure
    .input(createHypothesisSchema)
    .mutation(({ ctx, input }) =>
      outreachService.createHypothesis(ctx, input),
    ),

  endWeek: moduleProcedure
    .input(endWeekSchema)
    .mutation(({ ctx, input }) => outreachService.endWeek(ctx, input)),

  // ─── Replies ────────────────────────────────────────────────────
  listReplies: moduleProcedure
    .input(listRepliesSchema)
    .query(({ ctx, input }) => outreachService.listReplies(ctx, input)),

  listRepliesEnriched: moduleProcedure
    .input(listRepliesSchema)
    .query(({ ctx, input }) =>
      outreachService.listRepliesEnriched(ctx, input),
    ),

  classifyReply: moduleProcedure
    .input(classifyReplySchema)
    .mutation(({ ctx, input }) => outreachService.classifyReply(ctx, input)),

  markReplyHandled: moduleProcedure
    .input(
      z.object({
        id: uuid,
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      outreachService.markReplyHandled(ctx, input.id, input.sentiment),
    ),

  // ─── DNC ────────────────────────────────────────────────────────
  addDnc: moduleProcedure
    .input(addDncSchema)
    .mutation(({ ctx, input }) => outreachService.addDnc(ctx, input)),

  listDnc: moduleProcedure
    .input(listDncSchema)
    .query(({ ctx, input }) => outreachService.listDnc(ctx, input)),

  checkDnc: moduleProcedure
    .input(checkDncSchema)
    .query(({ ctx, input }) => outreachService.isOnDnc(ctx, input.email)),

  // ─── Intelligence (Phase 2) ─────────────────────────────────────
  crossProviderOverlap: moduleProcedure
    .query(({ ctx }) => crossProviderOverlap(ctx.tenantId)),

  replyRateByTag: moduleProcedure
    .input(z.object({ namespace: z.string().min(1) }))
    .query(({ ctx, input }) => replyRateByTag(ctx.tenantId, input.namespace)),

  // ─── Twenty CRM bridge (Phase 3) ────────────────────────────────
  promoteToTwenty: moduleProcedure
    .input(z.object({ leadId: uuid }))
    .mutation(({ ctx, input }) => promoteLeadToTwenty(ctx.tenantId, input.leadId)),

  dueForFollowUp: moduleProcedure
    .query(({ ctx }) => dueForFollowUp(ctx.tenantId)),
})

export type OutreachRouter = typeof outreachRouter
