import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";
import { consultingRepository } from "./consulting.repository";
import { reportGeneratorRepository } from "@/modules/report-generator/report-generator.repository";
import { NotFoundError, ForbiddenError } from "@/shared/errors";
import {
  getClientReportSchema,
  getClientProgressSchema,
} from "./client.schemas";

const moduleGate = createModuleMiddleware("consulting");
const moduleProcedure = tenantProcedure.use(moduleGate);

/**
 * Client-facing router.
 * These endpoints are called by the client tenant UI.
 * They are scoped to the client's own tenant via tenantProcedure.
 */
export const consultingClientRouter = router({
  /** Get the engagement for this client tenant */
  getEngagement: moduleProcedure.query(async ({ ctx }) => {
    // Find engagement where clientTenantId = this tenant
    const result = await consultingRepository.listByStage(ctx.tenantId);
    const engagement = result.rows[0];
    if (!engagement) throw new NotFoundError("Engagement for tenant", ctx.tenantId);
    return engagement;
  }),

  /** Get published report for this engagement (client view) */
  getReport: moduleProcedure
    .input(getClientReportSchema)
    .query(async ({ ctx, input }) => {
      const report = await reportGeneratorRepository.findByEngagement(
        ctx.tenantId,
        input.engagementId
      );
      if (!report) throw new NotFoundError("Report for engagement", input.engagementId);
      if (report.status !== "PUBLISHED") {
        throw new ForbiddenError("Report is not yet published");
      }
      return {
        id: report.id,
        status: report.status,
        contentHtml: report.contentHtml,
        contentJson: report.contentJson,
        executiveSummary: report.executiveSummary,
        totalEstimatedWaste: report.totalEstimatedWaste,
        publishedAt: report.publishedAt,
      };
    }),

  /** Get engagement stage and milestone progress */
  getProgress: moduleProcedure
    .input(getClientProgressSchema)
    .query(async ({ ctx, input }) => {
      const result = await consultingRepository.listByStage(ctx.tenantId);
      const engagement = result.rows.find((e: any) => e.id === input.engagementId);
      if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

      return {
        stage: (engagement as any).stage,
        title: (engagement as any).title,
        startDate: (engagement as any).startDate,
        endDate: (engagement as any).endDate,
      };
    }),
});
