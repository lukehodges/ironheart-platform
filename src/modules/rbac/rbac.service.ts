import { logger } from "@/shared/logger";
import { ForbiddenError } from "@/shared/errors";
import { auditLog } from "@/shared/audit/audit-logger";
import { rbacRepository } from "./rbac.repository";
import type { RoleWithPermissions, PermissionGroup, UserRoleAssignment } from "./rbac.types";

const log = logger.child({ module: "rbac.service" });

export const rbacService = {
  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------

  async listRoles(tenantId: string): Promise<RoleWithPermissions[]> {
    log.info({ tenantId }, "listRoles");
    return rbacRepository.listRoles(tenantId);
  },

  async getRoleById(
    tenantId: string,
    roleId: string
  ): Promise<RoleWithPermissions> {
    log.info({ tenantId, roleId }, "getRoleById");
    return rbacRepository.getRoleById(tenantId, roleId);
  },

  async createRole(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      color?: string;
      permissionIds: string[];
      isDefault: boolean;
    },
    actorId: string
  ): Promise<RoleWithPermissions> {
    log.info({ tenantId, name: data.name, actorId }, "createRole");

    const role = await rbacRepository.createRole(tenantId, data);

    await auditLog({
      tenantId,
      actorId,
      action: "created",
      resourceType: "role",
      resourceId: role.id,
      resourceName: role.name,
      metadata: {
        permissionCount: data.permissionIds.length,
        isDefault: data.isDefault,
      },
    });

    log.info({ tenantId, roleId: role.id, name: role.name }, "Role created");
    return role;
  },

  async updateRole(
    tenantId: string,
    roleId: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      permissionIds?: string[];
      isDefault?: boolean;
    },
    actorId: string
  ): Promise<RoleWithPermissions> {
    log.info({ tenantId, roleId, actorId }, "updateRole");

    const role = await rbacRepository.updateRole(tenantId, roleId, data);

    await auditLog({
      tenantId,
      actorId,
      action: "updated",
      resourceType: "role",
      resourceId: role.id,
      resourceName: role.name,
      metadata: {
        updatedFields: Object.keys(data),
      },
    });

    log.info({ tenantId, roleId: role.id, name: role.name }, "Role updated");
    return role;
  },

  async deleteRole(
    tenantId: string,
    roleId: string,
    actorId: string
  ): Promise<void> {
    log.info({ tenantId, roleId, actorId }, "deleteRole");

    // Get role name for audit before deletion
    const role = await rbacRepository.getRoleById(tenantId, roleId);

    await rbacRepository.deleteRole(tenantId, roleId);

    await auditLog({
      tenantId,
      actorId,
      action: "deleted",
      resourceType: "role",
      resourceId: roleId,
      resourceName: role.name,
    });

    log.info({ tenantId, roleId, name: role.name }, "Role deleted");
  },

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  async listAllPermissions() {
    log.info({}, "listAllPermissions");
    return rbacRepository.listAllPermissions();
  },

  async getPermissionsGroupedByModule(
    enabledModuleSlugs: string[]
  ): Promise<PermissionGroup[]> {
    log.info({ enabledModuleSlugs }, "getPermissionsGroupedByModule");
    return rbacRepository.getPermissionsGroupedByModule(enabledModuleSlugs);
  },

  // ---------------------------------------------------------------------------
  // User Roles
  // ---------------------------------------------------------------------------

  async getUserRoles(
    tenantId: string,
    userId: string
  ): Promise<UserRoleAssignment[]> {
    log.info({ tenantId, userId }, "getUserRoles");
    return rbacRepository.getUserRoles(tenantId, userId);
  },

  async listUserAssignments(tenantId: string): Promise<UserRoleAssignment[]> {
    log.info({ tenantId }, "listUserAssignments");
    return rbacRepository.listUserAssignments(tenantId);
  },

  async assignRoleToUser(
    tenantId: string,
    userId: string,
    roleId: string,
    grantedBy: string
  ): Promise<void> {
    log.info({ tenantId, userId, roleId, grantedBy }, "assignRoleToUser");

    await rbacRepository.assignRoleToUser(userId, roleId, grantedBy);

    // Get role name for audit
    const role = await rbacRepository.getRoleById(tenantId, roleId);

    await auditLog({
      tenantId,
      actorId: grantedBy,
      action: "created",
      resourceType: "user-role-assignment",
      resourceId: `${userId}:${roleId}`,
      resourceName: `Assigned role "${role.name}"`,
      metadata: { userId, roleId },
    });

    log.info({ tenantId, userId, roleId }, "Role assigned to user");
  },

  async removeRoleFromUser(
    tenantId: string,
    userId: string,
    roleId: string,
    actorId: string
  ): Promise<void> {
    log.info({ tenantId, userId, roleId, actorId }, "removeRoleFromUser");

    // Self-lockout prevention: if the actor is removing their own role,
    // check they would still have settings:write after removal
    if (actorId === userId) {
      const currentRoles = await rbacRepository.getUserRoles(tenantId, userId);
      const remainingRoles = currentRoles.filter((r) => r.roleId !== roleId);

      // Check if any remaining role has settings:write permission
      let hasSettingsWrite = false;
      for (const assignment of remainingRoles) {
        const role = await rbacRepository.getRoleById(
          tenantId,
          assignment.roleId
        );
        if (
          role.permissions.some(
            (p) =>
              (p.resource === "settings" && (p.action === "write" || p.action === "*")) ||
              (p.resource === "*" && (p.action === "write" || p.action === "*"))
          )
        ) {
          hasSettingsWrite = true;
          break;
        }
      }

      if (!hasSettingsWrite) {
        throw new ForbiddenError(
          "Cannot remove this role: you would lose settings management access. Assign another role with settings:write permission first."
        );
      }
    }

    // Get role name for audit before removal
    const role = await rbacRepository.getRoleById(tenantId, roleId);

    await rbacRepository.removeRoleFromUser(userId, roleId);

    await auditLog({
      tenantId,
      actorId,
      action: "deleted",
      resourceType: "user-role-assignment",
      resourceId: `${userId}:${roleId}`,
      resourceName: `Removed role "${role.name}"`,
      metadata: { userId, roleId },
    });

    log.info({ tenantId, userId, roleId }, "Role removed from user");
  },
};
