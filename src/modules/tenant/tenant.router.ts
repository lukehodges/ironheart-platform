import { z } from "zod";
import { router, tenantProcedure, permissionProcedure, publicProcedure } from "@/shared/trpc";
import { tenantService } from "./tenant.service";
import {
  updateOrganizationSettingsSchema,
  updateModuleConfigSchema,
  createVenueSchema,
  updateVenueSchema,
} from "./tenant.schemas";

export const tenantRouter = router({
  // Settings
  getSettings: tenantProcedure
    .query(({ ctx }) => tenantService.getSettings(ctx)),

  // Public settings (for portal white-labeling)
  getPublicSettings: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => tenantService.getPublicSettings(input.slug)),

  updateSettings: permissionProcedure("tenant:write")
    .input(updateOrganizationSettingsSchema)
    .mutation(({ ctx, input }) => tenantService.updateSettings(ctx, input)),

  // Modules
  listModules: tenantProcedure
    .query(({ ctx }) => tenantService.listModules(ctx)),

  enableModule: permissionProcedure("tenant:write")
    .input(z.object({ moduleKey: z.string() }))
    .mutation(({ ctx, input }) => tenantService.toggleModule(ctx, input.moduleKey, true)),

  disableModule: permissionProcedure("tenant:write")
    .input(z.object({ moduleKey: z.string() }))
    .mutation(({ ctx, input }) => tenantService.toggleModule(ctx, input.moduleKey, false)),

  updateModuleConfig: permissionProcedure("tenant:write")
    .input(updateModuleConfigSchema)
    .mutation(({ ctx, input }) => tenantService.updateModuleConfig(ctx, input)),

  // Venues
  listVenues: tenantProcedure
    .query(({ ctx }) => tenantService.listVenues(ctx)),

  createVenue: permissionProcedure("tenant:write")
    .input(createVenueSchema)
    .mutation(({ ctx, input }) => tenantService.createVenue(ctx, input)),

  updateVenue: permissionProcedure("tenant:write")
    .input(updateVenueSchema)
    .mutation(({ ctx, input }) => tenantService.updateVenue(ctx, input.id, input)),

  deleteVenue: permissionProcedure("tenant:write")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => tenantService.deleteVenue(ctx, input.id)),

  // Billing (read-only stub for Phase 5)
  getPlan: tenantProcedure
    .query(({ ctx }) => tenantService.getPlan(ctx)),

  getUsage: tenantProcedure
    .query(({ ctx }) => tenantService.getUsage(ctx)),
});

export type TenantRouter = typeof tenantRouter;
