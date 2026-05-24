import { router, tenantProcedure, createModuleMiddleware, portalProcedure } from "@/shared/trpc";
import { reportGeneratorService } from "./report-generator.service";
import {
  generateReportSchema,
  getReportSchema,
  getReportByEngagementSchema,
  updateReportContentSchema,
  transitionReportStatusSchema,
  triggerGenerateSchema,
  clientGetPublishedReportSchema,
} from "./report-generator.schemas";

const moduleGate = createModuleMiddleware("report-generator");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const reportGeneratorRouter = router({
  /**
   * Emit report/generate Inngest event — returns immediately.
   * The Inngest handler calls generateDraft() asynchronously.
   * Poll getByEngagement to check when status moves to DRAFT.
   */
  triggerGenerate: moduleProcedure
    .input(triggerGenerateSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.triggerGenerate(ctx, input)),

  /** Legacy: synchronous stub generation (no Claude). */
  generate: moduleProcedure
    .input(generateReportSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.generateReport(ctx, input)),

  get: moduleProcedure
    .input(getReportSchema)
    .query(async ({ ctx, input }) => reportGeneratorService.getReport(ctx, input)),

  getByEngagement: moduleProcedure
    .input(getReportByEngagementSchema)
    .query(async ({ ctx, input }) => reportGeneratorService.getReportByEngagement(ctx, input)),

  updateContent: moduleProcedure
    .input(updateReportContentSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.updateContent(ctx, input)),

  transitionStatus: moduleProcedure
    .input(transitionReportStatusSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.transitionStatus(ctx, input)),

  /**
   * Client portal: retrieve the published report for an engagement.
   * Only returns when status === PUBLISHED.
   */
  clientGetPublishedReport: portalProcedure
    .input(clientGetPublishedReportSchema)
    .query(async ({ ctx, input }) => reportGeneratorService.clientGetPublishedReport(ctx as any, input)),
});
