import {
  router,
  tenantProcedure,
  permissionProcedure,
  createModuleMiddleware,
} from "@/shared/trpc"
import { pipelineService } from "./pipeline.service"
import {
  listDealsSchema,
  getDealSchema,
  createDealSchema,
  updateDealSchema,
  moveStageSchema,
  addNoteSchema,
  recordMeetingSchema,
  recordProposalSchema,
  recordContractSchema,
  convertFromReplySchema,
  listDealEventsSchema,
} from "./pipeline.schemas"

const moduleGate = createModuleMiddleware("pipeline")
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) =>
  permissionProcedure(perm).use(moduleGate)

function actorFor(ctx: { user: { id: string } | null }): string | null {
  return ctx.user?.id ?? null
}

export const pipelineRouter = router({
  // ---------- Queries ----------

  listDeals: moduleProcedure
    .input(listDealsSchema.optional())
    .query(async ({ ctx, input }) =>
      pipelineService.listDeals(ctx.tenantId, input ?? {}),
    ),

  getDeal: moduleProcedure
    .input(getDealSchema)
    .query(async ({ ctx, input }) =>
      pipelineService.getDeal(ctx.tenantId, input.dealId),
    ),

  listDealEvents: moduleProcedure
    .input(listDealEventsSchema)
    .query(async ({ ctx, input }) =>
      pipelineService.listDealEvents(ctx.tenantId, input.dealId),
    ),

  getStageCounts: moduleProcedure.query(async ({ ctx }) =>
    pipelineService.getStageCounts(ctx.tenantId),
  ),

  getWeightedValue: moduleProcedure.query(async ({ ctx }) =>
    pipelineService.getWeightedValue(ctx.tenantId),
  ),

  // ---------- Mutations ----------

  createDeal: modulePermission("pipeline:write")
    .input(createDealSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.createDeal({
        tenantId: ctx.tenantId,
        actor: actorFor(ctx),
        ...input,
      }),
    ),

  updateDeal: modulePermission("pipeline:write")
    .input(updateDealSchema)
    .mutation(async ({ ctx, input }) => {
      const { dealId, ...patch } = input
      return pipelineService.updateDeal({
        tenantId: ctx.tenantId,
        dealId,
        patch,
        actor: actorFor(ctx),
      })
    }),

  moveStage: modulePermission("pipeline:write")
    .input(moveStageSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.moveStage({
        tenantId: ctx.tenantId,
        dealId: input.dealId,
        newStage: input.newStage,
        reason: input.reason ?? null,
        actor: actorFor(ctx),
      }),
    ),

  addNote: modulePermission("pipeline:write")
    .input(addNoteSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.addNote({
        tenantId: ctx.tenantId,
        dealId: input.dealId,
        body: input.body,
        actor: actorFor(ctx),
      }),
    ),

  recordMeeting: modulePermission("pipeline:write")
    .input(recordMeetingSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.recordMeetingBooked({
        tenantId: ctx.tenantId,
        dealId: input.dealId,
        meetingPayload: input.meetingPayload,
        actor: actorFor(ctx),
      }),
    ),

  recordProposal: modulePermission("pipeline:write")
    .input(recordProposalSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.recordProposalSent({
        tenantId: ctx.tenantId,
        dealId: input.dealId,
        proposalRef: input.proposalRef,
        actor: actorFor(ctx),
      }),
    ),

  recordContract: modulePermission("pipeline:write")
    .input(recordContractSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.recordContractSigned({
        tenantId: ctx.tenantId,
        dealId: input.dealId,
        contractRef: input.contractRef,
        actor: actorFor(ctx),
      }),
    ),

  convertFromReply: modulePermission("pipeline:write")
    .input(convertFromReplySchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.convertFromReply({
        tenantId: ctx.tenantId,
        replyId: input.replyId,
        dealInput: input.dealInput,
        actor: actorFor(ctx),
      }),
    ),
})

export type PipelineRouter = typeof pipelineRouter
