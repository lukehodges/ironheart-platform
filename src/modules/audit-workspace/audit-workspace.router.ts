import { router, tenantProcedure, createModuleMiddleware, platformAdminProcedure } from "@/shared/trpc";
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
  getOrCreateSessionSchema,
  upsertCallNoteByEngagementSchema,
  upsertLensAnalysisByEngagementSchema,
  reorderFindingsSchema,
  reorderRecommendationsSchema,
  validateSessionByEngagementSchema,
  markReadyByEngagementSchema,
} from "./audit-workspace.schemas";

const moduleGate = createModuleMiddleware("audit-workspace");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const auditWorkspaceRouter = router({
  // ── Tenant-facing procedures (client portal) ──────────────────────────

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

  // ── Consultant-facing procedures (platformAdminProcedure) ─────────────
  // Used by the /platform/clients/[id]/audit UI (3-layer audit workspace).

  /**
   * Idempotent fetch-or-create. Returns AuditSessionWithLenses.
   * Auto-creates session and auto-advances engagement ONBOARDING → AUDITING.
   */
  getOrCreate: platformAdminProcedure
    .input(getOrCreateSessionSchema)
    .query(async ({ input }) => auditWorkspaceService.getOrCreateSession(input.engagementId)),

  /**
   * Autosave-friendly call note upsert using engagementId as the key.
   * No need to look up the sessionId in the UI first.
   */
  upsertCallNoteByEngagement: platformAdminProcedure
    .input(upsertCallNoteByEngagementSchema)
    .mutation(async ({ input }) => auditWorkspaceService.upsertCallNoteByEngagement(input)),

  /**
   * Autosave-friendly lens upsert using engagementId as the key.
   */
  upsertLensByEngagement: platformAdminProcedure
    .input(upsertLensAnalysisByEngagementSchema)
    .mutation(async ({ input }) => auditWorkspaceService.upsertLensAnalysisByEngagement(input)),

  /**
   * Reorder findings within a lens by supplying an array of IDs in new priority order.
   */
  reorderFindings: platformAdminProcedure
    .input(reorderFindingsSchema)
    .mutation(async ({ input }) => auditWorkspaceService.reorderFindings(input)),

  /**
   * Reorder recommendations within a lens by supplying an array of IDs in new priority order.
   */
  reorderRecommendations: platformAdminProcedure
    .input(reorderRecommendationsSchema)
    .mutation(async ({ input }) => auditWorkspaceService.reorderRecommendations(input)),

  /**
   * Validate session readiness by engagementId.
   */
  validateByEngagement: platformAdminProcedure
    .input(validateSessionByEngagementSchema)
    .query(async ({ input }) => auditWorkspaceService.validateByEngagement(input.engagementId)),

  /**
   * Transition session → READY_FOR_REPORT by engagementId.
   */
  markReadyByEngagement: platformAdminProcedure
    .input(markReadyByEngagementSchema)
    .mutation(async ({ input }) => auditWorkspaceService.markReadyByEngagement(input.engagementId)),
});
