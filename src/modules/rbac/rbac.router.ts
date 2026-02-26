import { z } from "zod";
import { router, tenantProcedure, permissionProcedure } from "@/shared/trpc";
import { rbacService } from "./rbac.service";
import { tenantService } from "@/modules/tenant/tenant.service";
import {
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
  assignRoleSchema,
  removeRoleSchema,
} from "./rbac.schemas";

export const rbacRouter = router({
  // --- Roles ---

  listRoles: tenantProcedure.query(({ ctx }) =>
    rbacService.listRoles(ctx.tenantId)
  ),

  getRoleById: tenantProcedure
    .input(z.object({ roleId: z.uuid() }))
    .query(({ ctx, input }) =>
      rbacService.getRoleById(ctx.tenantId, input.roleId)
    ),

  createRole: permissionProcedure("settings:write")
    .input(createRoleSchema)
    .mutation(({ ctx, input }) =>
      rbacService.createRole(ctx.tenantId, input, ctx.user!.id)
    ),

  updateRole: permissionProcedure("settings:write")
    .input(updateRoleSchema)
    .mutation(({ ctx, input }) =>
      rbacService.updateRole(
        ctx.tenantId,
        input.roleId,
        {
          name: input.name,
          description: input.description,
          color: input.color,
          permissionIds: input.permissionIds,
          isDefault: input.isDefault,
        },
        ctx.user!.id
      )
    ),

  deleteRole: permissionProcedure("settings:write")
    .input(deleteRoleSchema)
    .mutation(({ ctx, input }) =>
      rbacService.deleteRole(ctx.tenantId, input.roleId, ctx.user!.id)
    ),

  // --- Permissions ---

  listAllPermissions: tenantProcedure.query(() =>
    rbacService.listAllPermissions()
  ),

  getPermissionsGroupedByModule: tenantProcedure.query(async ({ ctx }) => {
    // Get enabled module slugs for this tenant
    const tenantModules = await tenantService.listModules(ctx);
    const enabledSlugs = tenantModules
      .filter((m) => m.isEnabled)
      .map((m) => m.moduleSlug);

    return rbacService.getPermissionsGroupedByModule(enabledSlugs);
  }),

  // --- User Roles ---

  getUserRoles: tenantProcedure
    .input(z.object({ userId: z.uuid() }))
    .query(({ ctx, input }) =>
      rbacService.getUserRoles(ctx.tenantId, input.userId)
    ),

  listUserAssignments: tenantProcedure.query(({ ctx }) =>
    rbacService.listUserAssignments(ctx.tenantId)
  ),

  assignRole: permissionProcedure("settings:write")
    .input(assignRoleSchema)
    .mutation(({ ctx, input }) =>
      rbacService.assignRoleToUser(
        ctx.tenantId,
        input.userId,
        input.roleId,
        ctx.user!.id
      )
    ),

  removeRole: permissionProcedure("settings:write")
    .input(removeRoleSchema)
    .mutation(({ ctx, input }) =>
      rbacService.removeRoleFromUser(
        ctx.tenantId,
        input.userId,
        input.roleId,
        ctx.user!.id
      )
    ),
});

export type RbacRouter = typeof rbacRouter;
