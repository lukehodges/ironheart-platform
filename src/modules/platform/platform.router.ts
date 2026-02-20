import { z } from "zod";
import { router, platformAdminProcedure } from "@/shared/trpc";
import { platformService } from "./platform.service";
import {
  createTenantSchema,
  updateTenantSchema,
  changePlanSchema,
  listTenantsSchema,
  setFlagSchema,
  setTenantFlagSchema,
  setTenantModuleSchema,
  listTenantFlagsSchema,
  auditLogQuerySchema,
  approveSignupSchema,
  rejectSignupSchema,
  suspendTenantSchema,
} from "./platform.schemas";

export const platformRouter = router({
  // Tenant management
  listTenants: platformAdminProcedure
    .input(listTenantsSchema)
    .query(({ input }) => platformService.listTenants(input)),

  getTenant: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => platformService.getTenant(input.id)),

  createTenant: platformAdminProcedure
    .input(createTenantSchema)
    .mutation(({ input }) => platformService.provisionTenant(input)),

  updateTenant: platformAdminProcedure
    .input(updateTenantSchema)
    .mutation(({ input }) => platformService.updateTenant(input.id, input)),

  suspendTenant: platformAdminProcedure
    .input(suspendTenantSchema)
    .mutation(({ input }) => platformService.suspendTenant(input.id, input.reason)),

  activateTenant: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => platformService.activateTenant(input.id)),

  // Plan management
  changePlan: platformAdminProcedure
    .input(changePlanSchema)
    .mutation(({ input }) => platformService.changePlan(input)),

  // Feature flags
  listFlags: platformAdminProcedure
    .query(() => platformService.listFlags()),

  setFlag: platformAdminProcedure
    .input(setFlagSchema)
    .mutation(({ input }) => platformService.setFlag(input)),

  setTenantFlag: platformAdminProcedure
    .input(setTenantFlagSchema)
    .mutation(({ input }) => platformService.setTenantFlag(input)),

  // Signup requests
  listSignupRequests: platformAdminProcedure
    .query(() => platformService.listSignupRequests()),

  approveSignup: platformAdminProcedure
    .input(approveSignupSchema)
    .mutation(({ input }) => platformService.approveSignup(input)),

  rejectSignup: platformAdminProcedure
    .input(rejectSignupSchema)
    .mutation(({ input }) => platformService.rejectSignup(input)),

  // Tenant feature flags
  listTenantFlags: platformAdminProcedure
    .input(listTenantFlagsSchema)
    .query(({ input }) => platformService.listTenantFlags(input.tenantId)),

  // Tenant modules
  listTenantModules: platformAdminProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(({ input }) => platformService.listTenantModules(input.tenantId)),

  setTenantModule: platformAdminProcedure
    .input(setTenantModuleSchema)
    .mutation(({ input }) => platformService.setTenantModule(input)),

  // Audit
  getAuditLog: platformAdminProcedure
    .input(auditLogQuerySchema)
    .query(({ input }) => platformService.getAuditLog(input)),
});

export type PlatformRouter = typeof platformRouter;
