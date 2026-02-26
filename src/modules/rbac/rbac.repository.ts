import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError, ForbiddenError, ConflictError } from "@/shared/errors";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from "@/shared/db/schema";
import { eq, and, sql, asc, count } from "drizzle-orm";
import { moduleRegistry } from "@/shared/module-system/register-all";
import type {
  RoleWithPermissions,
  PermissionGroup,
  UserRoleAssignment,
} from "./rbac.types";

const log = logger.child({ module: "rbac.repository" });

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapRoleWithPermissions(
  role: typeof roles.$inferSelect,
  permCount: number,
  perms: (typeof permissions.$inferSelect)[]
): RoleWithPermissions {
  return {
    id: role.id,
    tenantId: role.tenantId,
    name: role.name,
    description: role.description,
    color: role.color,
    isSystem: role.isSystem,
    isDefault: role.isDefault,
    permissionCount: permCount,
    permissions: perms.map((p) => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      description: p.description,
    })),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const rbacRepository = {
  /**
   * List all roles for a tenant with permission counts.
   */
  async listRoles(tenantId: string): Promise<RoleWithPermissions[]> {
    log.info({ tenantId }, "listRoles");

    // Get roles with permission count subquery
    const roleRows = await db
      .select({
        role: roles,
        permCount: sql<number>`(
          SELECT count(*)::int FROM role_permissions rp WHERE rp."roleId" = ${roles.id}
        )`,
      })
      .from(roles)
      .where(eq(roles.tenantId, tenantId))
      .orderBy(asc(roles.createdAt));

    // For each role, get its permissions
    const result: RoleWithPermissions[] = [];
    for (const row of roleRows) {
      const perms = await db
        .select({ permission: permissions })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, row.role.id));

      result.push(
        mapRoleWithPermissions(
          row.role,
          row.permCount,
          perms.map((p) => p.permission)
        )
      );
    }

    return result;
  },

  /**
   * Get a single role by ID with full permissions list.
   */
  async getRoleById(
    tenantId: string,
    roleId: string
  ): Promise<RoleWithPermissions> {
    log.info({ tenantId, roleId }, "getRoleById");

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
      .limit(1);

    if (!role) {
      throw new NotFoundError("Role", roleId);
    }

    const perms = await db
      .select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return mapRoleWithPermissions(
      role,
      perms.length,
      perms.map((p) => p.permission)
    );
  },

  /**
   * Create a new role with permission assignments.
   */
  async createRole(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      color?: string;
      permissionIds: string[];
      isDefault: boolean;
    }
  ): Promise<RoleWithPermissions> {
    log.info({ tenantId, name: data.name }, "createRole");

    const roleId = crypto.randomUUID();
    const now = new Date();

    return db.transaction(async (tx) => {
      // If setting as default, unset other default roles first
      if (data.isDefault) {
        await tx
          .update(roles)
          .set({ isDefault: false, updatedAt: now })
          .where(and(eq(roles.tenantId, tenantId), eq(roles.isDefault, true)));
      }

      await tx.insert(roles).values({
        id: roleId,
        tenantId,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? null,
        isSystem: false,
        isDefault: data.isDefault,
        createdAt: now,
        updatedAt: now,
      });

      if (data.permissionIds.length > 0) {
        await tx.insert(rolePermissions).values(
          data.permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          }))
        );
      }

      // Return full role
      const perms =
        data.permissionIds.length > 0
          ? await tx
              .select()
              .from(permissions)
              .where(
                sql`${permissions.id} IN ${data.permissionIds}`
              )
          : [];

      return mapRoleWithPermissions(
        {
          id: roleId,
          tenantId,
          name: data.name,
          description: data.description ?? null,
          color: data.color ?? null,
          isSystem: false,
          isDefault: data.isDefault,
          createdAt: now,
          updatedAt: now,
        },
        perms.length,
        perms
      );
    });
  },

  /**
   * Update an existing role. System roles cannot be updated.
   */
  async updateRole(
    tenantId: string,
    roleId: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      permissionIds?: string[];
      isDefault?: boolean;
    }
  ): Promise<RoleWithPermissions> {
    log.info({ tenantId, roleId }, "updateRole");

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Role", roleId);
      }

      if (existing.isSystem) {
        throw new ForbiddenError("System roles cannot be modified");
      }

      const now = new Date();

      // If setting as default, unset other default roles first
      if (data.isDefault) {
        await tx
          .update(roles)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(roles.tenantId, tenantId),
              eq(roles.isDefault, true),
              sql`${roles.id} != ${roleId}`
            )
          );
      }

      // Build update set
      const updateSet: Record<string, unknown> = { updatedAt: now };
      if (data.name !== undefined) updateSet.name = data.name;
      if (data.description !== undefined) updateSet.description = data.description;
      if (data.color !== undefined) updateSet.color = data.color;
      if (data.isDefault !== undefined) updateSet.isDefault = data.isDefault;

      await tx
        .update(roles)
        .set(updateSet)
        .where(eq(roles.id, roleId));

      // Replace permissions if provided
      if (data.permissionIds !== undefined) {
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));

        if (data.permissionIds.length > 0) {
          await tx.insert(rolePermissions).values(
            data.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            }))
          );
        }
      }

      // Re-read the full role
      const [updatedRole] = await tx
        .select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      const perms = await tx
        .select({ permission: permissions })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, roleId));

      return mapRoleWithPermissions(
        updatedRole,
        perms.length,
        perms.map((p) => p.permission)
      );
    });
  },

  /**
   * Delete a role. System roles cannot be deleted.
   */
  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    log.info({ tenantId, roleId }, "deleteRole");

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Role", roleId);
      }

      if (existing.isSystem) {
        throw new ForbiddenError("System roles cannot be deleted");
      }

      // Delete role permissions
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      // Delete user role assignments
      await tx.delete(userRoles).where(eq(userRoles.roleId, roleId));

      // Delete the role itself
      await tx.delete(roles).where(eq(roles.id, roleId));
    });
  },

  /**
   * List all permissions ordered by resource then action.
   */
  async listAllPermissions(): Promise<(typeof permissions.$inferSelect)[]> {
    log.info({}, "listAllPermissions");

    return db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action));
  },

  /**
   * Get permissions grouped by module using the module registry.
   */
  async getPermissionsGroupedByModule(
    enabledModuleSlugs: string[]
  ): Promise<PermissionGroup[]> {
    log.info({ enabledModuleSlugs }, "getPermissionsGroupedByModule");

    const allPerms = await db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action));

    // Build a map of resource prefix -> module slug/name from manifests
    const resourceToModule = new Map<string, { slug: string; name: string }>();
    const manifests = moduleRegistry.getEnabledManifests(enabledModuleSlugs);
    for (const manifest of manifests) {
      for (const perm of manifest.permissions) {
        const [resource] = perm.split(":");
        if (resource && !resourceToModule.has(resource)) {
          resourceToModule.set(resource, {
            slug: manifest.slug,
            name: manifest.name,
          });
        }
      }
    }

    // Group permissions by module
    const groupMap = new Map<string, PermissionGroup>();

    for (const perm of allPerms) {
      const moduleInfo = resourceToModule.get(perm.resource);
      const slug = moduleInfo?.slug ?? "other";
      const name = moduleInfo?.name ?? "Other";

      if (!groupMap.has(slug)) {
        groupMap.set(slug, {
          moduleSlug: slug,
          moduleName: name,
          permissions: [],
        });
      }
      groupMap.get(slug)!.permissions.push({
        id: perm.id,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      });
    }

    return Array.from(groupMap.values());
  },

  /**
   * Get roles assigned to a user.
   */
  async getUserRoles(
    tenantId: string,
    userId: string
  ): Promise<UserRoleAssignment[]> {
    log.info({ tenantId, userId }, "getUserRoles");

    const rows = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        grantedAt: userRoles.grantedAt,
        grantedBy: userRoles.grantedBy,
        expiresAt: userRoles.expiresAt,
        roleName: roles.name,
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.tenantId, tenantId)
        )
      );

    return rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      roleId: r.roleId,
      roleName: r.roleName,
      grantedAt: r.grantedAt,
      grantedBy: r.grantedBy,
      expiresAt: r.expiresAt,
    }));
  },

  /**
   * List all user-role assignments for a tenant.
   */
  async listUserAssignments(tenantId: string): Promise<UserRoleAssignment[]> {
    log.info({ tenantId }, "listUserAssignments");

    const rows = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        grantedAt: userRoles.grantedAt,
        grantedBy: userRoles.grantedBy,
        expiresAt: userRoles.expiresAt,
        roleName: roles.name,
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(eq(roles.tenantId, tenantId));

    return rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      roleId: r.roleId,
      roleName: r.roleName,
      grantedAt: r.grantedAt,
      grantedBy: r.grantedBy,
      expiresAt: r.expiresAt,
    }));
  },

  /**
   * Assign a role to a user.
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    grantedBy: string | null
  ): Promise<void> {
    log.info({ userId, roleId, grantedBy }, "assignRoleToUser");

    // Check for existing assignment
    const [existing] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .limit(1);

    if (existing) {
      throw new ConflictError(
        `User ${userId} already has role ${roleId} assigned`
      );
    }

    await db.insert(userRoles).values({
      userId,
      roleId,
      grantedAt: new Date(),
      grantedBy,
    });
  },

  /**
   * Remove a role from a user.
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    log.info({ userId, roleId }, "removeRoleFromUser");

    const [existing] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("UserRole", `${userId}:${roleId}`);
    }

    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  },
};
