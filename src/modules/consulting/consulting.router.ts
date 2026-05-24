import { z } from "zod";
import { router, tenantProcedure, platformAdminProcedure, createModuleMiddleware } from "@/shared/trpc";
import { consultingService } from "./consulting.service";
import { onboardingService } from "./onboarding.service";
import { provisioningService } from "./provisioning.service";
import { integrationService } from "./integration.service";
import { auditWorkspaceService } from "@/modules/audit-workspace/audit-workspace.service";
import {
  stageTransitionSchema,
  setAuditWindowSchema,
  updateDiscoveryNotesSchema,
  listEngagementsByStageSchema,
  listForPlatformSchema,
  addTeamContactSchema,
  provisionClientTenantSchema,
  createPlaneProjectSchema,
  createDriveFolderSchema,
  getIntegrationStatusSchema,
  createClientEngagementSchema,
} from "./consulting.schemas";

const moduleGate = createModuleMiddleware("consulting");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const consultingRouter = router({
  transitionStage: moduleProcedure
    .input(stageTransitionSchema)
    .mutation(async ({ ctx, input }) => consultingService.transitionStage(ctx, input)),

  setAuditWindow: moduleProcedure
    .input(setAuditWindowSchema)
    .mutation(async ({ ctx, input }) => consultingService.setAuditWindow(ctx, input)),

  updateDiscoveryNotes: moduleProcedure
    .input(updateDiscoveryNotesSchema)
    .mutation(async ({ ctx, input }) => consultingService.updateDiscoveryNotes(ctx, input)),

  list: moduleProcedure
    .input(listEngagementsByStageSchema)
    .query(async ({ ctx, input }) => consultingService.listEngagements(ctx, input)),

  listAll: platformAdminProcedure
    .input(listEngagementsByStageSchema)
    .query(async ({ input }) => consultingService.listAllEngagements(input)),

  listForPlatform: platformAdminProcedure
    .input(listForPlatformSchema)
    .query(async ({ input }) => consultingService.listForPlatform(input)),

  suggestAssignments: moduleProcedure
    .input(addTeamContactSchema)
    .query(async ({ input }) => onboardingService.suggestQuestionnaireAssignments(input.contacts)),

  provisionClientTenant: moduleProcedure
    .input(provisionClientTenantSchema)
    .mutation(async ({ input }) => provisioningService.provisionClientTenant(input.engagementId)),

  createPlaneProject: moduleProcedure
    .input(createPlaneProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const fullSession = await auditWorkspaceService.getFullSession(ctx, {
        auditSessionId: input.auditSessionId,
      });
      return integrationService.createPlaneProjectFromAudit(
        ctx.tenantId, input.engagementId, fullSession, input.projectName
      );
    }),

  createDriveFolder: moduleProcedure
    .input(createDriveFolderSchema)
    .mutation(async ({ ctx, input }) =>
      integrationService.createDriveFolder(ctx.tenantId, input.engagementId, input.companyName)
    ),

  integrationStatus: moduleProcedure
    .input(getIntegrationStatusSchema)
    .query(async ({ ctx, input }) =>
      integrationService.getIntegrationStatus(ctx.tenantId, input.engagementId)
    ),

  createClientEngagement: platformAdminProcedure
    .input(createClientEngagementSchema)
    .mutation(async ({ input }) => consultingService.createClientEngagement(input)),
});
