import { router, publicProcedure, permissionProcedure } from "@/shared/trpc";
import { z } from "zod";

export const portalRouter = router({
  getPortalConfig: publicProcedure
    .input(z.object({ slug: z.string(), portalPath: z.string().optional() }))
    .query(() => {
      return null;
    }),

  listTemplates: permissionProcedure("settings:read").query(() => []),

  listTenantPortals: permissionProcedure("settings:read").query(() => []),

  getPortal: permissionProcedure("settings:read")
    .input(z.object({ portalId: z.string().uuid() }))
    .query(() => null),

  createPortal: permissionProcedure("settings:write")
    .input(
      z.object({
        templateId: z.string().uuid(),
        urlPath: z.string().regex(/^[a-z0-9-]+$/),
        displayName: z.string().min(1).max(100),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(() => null),

  updatePortal: permissionProcedure("settings:write")
    .input(z.object({ portalId: z.string().uuid(), displayName: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(() => null),

  deletePortal: permissionProcedure("settings:write")
    .input(z.object({ portalId: z.string().uuid() }))
    .mutation(() => ({ success: true })),
});
