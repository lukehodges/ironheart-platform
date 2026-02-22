import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { settingsService } from "./settings.service";
import { tenantService } from "@/modules/tenant/tenant.service";
import {
  createApiKeySchema,
  revokeApiKeySchema,
} from "./settings.schemas";

export const settingsRouter = router({
  // -----------------------------------------------------------------------
  // API Keys
  // -----------------------------------------------------------------------

  createApiKey: permissionProcedure("settings:write")
    .input(createApiKeySchema)
    .mutation(({ ctx, input }) =>
      settingsService.createApiKey(ctx, input)
    ),

  listApiKeys: tenantProcedure
    .query(({ ctx }) => settingsService.listApiKeys(ctx)),

  revokeApiKey: permissionProcedure("settings:write")
    .input(revokeApiKeySchema)
    .mutation(({ ctx, input }) =>
      settingsService.revokeApiKey(ctx, input.id)
    ),

  // -----------------------------------------------------------------------
  // Module tabs — registry-driven discovery
  // -----------------------------------------------------------------------

  getModuleTabs: tenantProcedure
    .query(async ({ ctx }) => {
      const modules = await tenantService.listModules(ctx);
      const enabledSlugs = modules
        .filter((m) => m.isEnabled)
        .map((m) => m.moduleSlug);

      return settingsService.getModuleTabs(enabledSlugs);
    }),
});

export type SettingsRouter = typeof settingsRouter;
