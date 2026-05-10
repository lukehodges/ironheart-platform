import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";
import { reportGeneratorService } from "./report-generator.service";
import {
  generateReportSchema,
  getReportSchema,
  getReportByEngagementSchema,
  updateReportContentSchema,
  transitionReportStatusSchema,
} from "./report-generator.schemas";

const moduleGate = createModuleMiddleware("report-generator");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const reportGeneratorRouter = router({
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
});
