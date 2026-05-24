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
  clientRequestProposalSchema,
} from "./report-generator.schemas";
import { inngest } from "@/shared/inngest";
import { db } from "@/shared/db";
import { engagements } from "@/shared/db/schemas/client-portal.schema";
import { customers } from "@/shared/db/schemas/customer.schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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

  /**
   * Client portal: request an implementation proposal for this engagement.
   * Emits engagement/proposal-requested Inngest event.
   * Consultant notification handler wires in Task 3.
   */
  clientRequestProposal: portalProcedure
    .input(clientRequestProposalSchema)
    .mutation(async ({ ctx, input }) => {
      // Resolve engagement and verify it belongs to the portal customer
      const engagement = await db.query.engagements.findFirst({
        where: eq(engagements.id, input.engagementId),
      });
      if (!engagement) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Engagement not found" });
      }

      // Verify the portal customer belongs to this engagement
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, ctx.portalCustomerId),
      });
      if (!customer || customer.id !== engagement.customerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised for this engagement" });
      }

      const clientTenantId = engagement.clientTenantId;
      if (!clientTenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Engagement has no client tenant" });
      }

      await inngest.send({
        name: "engagement/proposal-requested",
        data: {
          engagementId: input.engagementId,
          clientTenantId,
          requestedByCustomerId: ctx.portalCustomerId,
          requestedByEmail: customer.email ?? null,
          notes: input.notes ?? null,
        },
      });

      return { queued: true };
    }),
});
