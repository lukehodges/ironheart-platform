import { router, publicProcedure, permissionProcedure } from "@/shared/trpc";
import { z } from "zod";

/**
 * Portal configuration sub-router.
 * Public endpoint: getPortalConfig (used by customer-facing portal).
 * Protected endpoints: portal CRUD (Phase 5 will implement TenantPortal management).
 *
 * Phase 1: Stubs that return empty results. Full implementation in Phase 5 (portal module).
 */
export const portalRouter = router({
  // Public — returns merged portal config for customer portal
  getPortalConfig: publicProcedure
    .input(z.object({ slug: z.string(), portalPath: z.string().optional() }))
    .query(() => {
      // Phase 5: query tenantPortals + portalTemplates, merge settings
      return null;
    }),

  // Protected — list portal templates
  listTemplates: permissionProcedure("settings:read").query(() => []),

  // Protected — list portals for tenant
  listTenantPortals: permissionProcedure("settings:read").query(() => []),

  // Protected — get single portal
  getPortal: permissionProcedure("settings:read")
    .input(z.object({ portalId: z.string().uuid() }))
    .query(() => null),

  // Protected — create portal
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

  // Protected — update portal
  updatePortal: permissionProcedure("settings:write")
    .input(z.object({ portalId: z.string().uuid(), displayName: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(() => null),

  // Protected — delete portal
  deletePortal: permissionProcedure("settings:write")
    .input(z.object({ portalId: z.string().uuid() }))
    .mutation(() => ({ success: true })),
});
