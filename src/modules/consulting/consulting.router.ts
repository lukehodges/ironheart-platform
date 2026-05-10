import { z } from "zod";
import { router, tenantProcedure, platformAdminProcedure, createModuleMiddleware } from "@/shared/trpc";
import { consultingService } from "./consulting.service";
import { onboardingService } from "./onboarding.service";
import { provisioningService } from "./provisioning.service";
import {
  stageTransitionSchema,
  setAuditWindowSchema,
  updateDiscoveryNotesSchema,
  listEngagementsByStageSchema,
  addTeamContactSchema,
  provisionClientTenantSchema,
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

  suggestAssignments: moduleProcedure
    .input(addTeamContactSchema)
    .query(async ({ input }) => onboardingService.suggestQuestionnaireAssignments(input.contacts)),

  provisionClientTenant: moduleProcedure
    .input(provisionClientTenantSchema)
    .mutation(async ({ ctx, input }) => provisioningService.provisionClientTenant(ctx.tenantId, input)),
});
