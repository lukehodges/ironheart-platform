import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc"
import { pipelineService } from "./pipeline.service"
import {
  createPipelineSchema,
  updatePipelineSchema,
  archivePipelineSchema,
  getPipelineByIdSchema,
  addStageSchema,
  updateStageSchema,
  removeStageSchema,
  reorderStagesSchema,
  addMemberSchema,
  moveMemberSchema,
  removeMemberSchema,
  updateMemberSchema,
  listMembersSchema,
  getSummarySchema,
  getMemberHistorySchema,
} from "./pipeline.schemas"

const moduleGate = createModuleMiddleware("pipeline")
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)

export const pipelineRouter = router({
  // Pipeline CRUD
  list: moduleProcedure
    .query(async ({ ctx }) => pipelineService.listPipelines(ctx)),

  getById: moduleProcedure
    .input(getPipelineByIdSchema)
    .query(async ({ ctx, input }) => pipelineService.getPipelineById(ctx, input.pipelineId)),

  getDefault: moduleProcedure
    .query(async ({ ctx }) => pipelineService.getDefaultPipeline(ctx)),

  create: modulePermission("pipeline:write")
    .input(createPipelineSchema)
    .mutation(async ({ ctx, input }) => pipelineService.createPipeline(ctx, input)),

  update: modulePermission("pipeline:write")
    .input(updatePipelineSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.updatePipeline(ctx, input.pipelineId, {
        name: input.name,
        description: input.description,
        isDefault: input.isDefault,
      })
    ),

  archive: modulePermission("pipeline:write")
    .input(archivePipelineSchema)
    .mutation(async ({ ctx, input }) => pipelineService.archivePipeline(ctx, input.pipelineId)),

  // Stage configuration
  addStage: modulePermission("pipeline:write")
    .input(addStageSchema)
    .mutation(async ({ ctx, input }) => pipelineService.addStage(ctx, input)),

  updateStage: modulePermission("pipeline:write")
    .input(updateStageSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.updateStage(ctx, input.stageId, {
        name: input.name,
        color: input.color,
        type: input.type,
        allowedTransitions: input.allowedTransitions,
      })
    ),

  removeStage: modulePermission("pipeline:write")
    .input(removeStageSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.removeStage(ctx, input.stageId, input.reassignToStageId)
    ),

  reorderStages: modulePermission("pipeline:write")
    .input(reorderStagesSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.reorderStages(ctx, input.pipelineId, input.stageIds)
    ),

  // Member operations
  addMember: modulePermission("pipeline:write")
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => pipelineService.addMember(ctx, input)),

  moveMember: modulePermission("pipeline:write")
    .input(moveMemberSchema)
    .mutation(async ({ ctx, input }) => pipelineService.moveMember(ctx, input)),

  removeMember: modulePermission("pipeline:write")
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => pipelineService.removeMember(ctx, input.memberId)),

  updateMember: modulePermission("pipeline:write")
    .input(updateMemberSchema)
    .mutation(async ({ ctx, input }) =>
      pipelineService.updateMember(ctx, input.memberId, {
        dealValue: input.dealValue,
        metadata: input.metadata,
      })
    ),

  listMembers: moduleProcedure
    .input(listMembersSchema)
    .query(async ({ ctx, input }) => pipelineService.listMembers(ctx, input.pipelineId)),

  getSummary: moduleProcedure
    .input(getSummarySchema)
    .query(async ({ ctx, input }) => pipelineService.getSummary(ctx, input.pipelineId)),

  getMemberHistory: moduleProcedure
    .input(getMemberHistorySchema)
    .query(async ({ ctx, input }) => pipelineService.getMemberHistory(ctx, input.memberId)),
})
