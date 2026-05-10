import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";
import { auditWorkspaceService } from "./audit-workspace.service";
import {
  createAuditSessionSchema,
  updateCallNotesSchema,
  upsertLensAnalysisSchema,
  createFindingSchema,
  updateFindingSchema,
  createRecommendationSchema,
  updateRecommendationSchema,
  getAuditSessionSchema,
  getByEngagementSchema,
  deleteFindingSchema,
  deleteRecommendationSchema,
} from "./audit-workspace.schemas";

const moduleGate = createModuleMiddleware("audit-workspace");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const auditWorkspaceRouter = router({
  createSession: moduleProcedure
    .input(createAuditSessionSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.createSession(ctx, input)),

  getSession: moduleProcedure
    .input(getAuditSessionSchema)
    .query(async ({ ctx, input }) => auditWorkspaceService.getSession(ctx, input)),

  getByEngagement: moduleProcedure
    .input(getByEngagementSchema)
    .query(async ({ ctx, input }) => auditWorkspaceService.getSessionByEngagement(ctx, input)),

  getFull: moduleProcedure
    .input(getAuditSessionSchema)
    .query(async ({ ctx, input }) => auditWorkspaceService.getFullSession(ctx, input)),

  updateCallNotes: moduleProcedure
    .input(updateCallNotesSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.updateCallNotes(ctx, input)),

  upsertLens: moduleProcedure
    .input(upsertLensAnalysisSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.upsertLensAnalysis(ctx, input)),

  createFinding: moduleProcedure
    .input(createFindingSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.createFinding(ctx, input)),

  updateFinding: moduleProcedure
    .input(updateFindingSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.updateFinding(ctx, input)),

  deleteFinding: moduleProcedure
    .input(deleteFindingSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.deleteFinding(ctx, input.id)),

  createRecommendation: moduleProcedure
    .input(createRecommendationSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.createRecommendation(ctx, input)),

  updateRecommendation: moduleProcedure
    .input(updateRecommendationSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.updateRecommendation(ctx, input)),

  deleteRecommendation: moduleProcedure
    .input(deleteRecommendationSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.deleteRecommendation(ctx, input.id)),

  validateReadiness: moduleProcedure
    .input(getAuditSessionSchema)
    .query(async ({ input }) => auditWorkspaceService.validateReadiness(input.auditSessionId)),

  markReadyForReport: moduleProcedure
    .input(getAuditSessionSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.markReadyForReport(ctx, input.auditSessionId)),
});
