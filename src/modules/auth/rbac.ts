/**
 * Role-Based Access Control (RBAC) utilities - auth module level.
 *
 * Permission format: "resource:action" (e.g., "bookings:read", "staff:delete")
 * Wildcards: "bookings:*" (all booking actions), "*:read" (read all), "*:*" (full access)
 *
 * OWNER and ADMIN user types have implicit full access.
 * MEMBER users have access only through assigned Role → Permission records.
 * CUSTOMER and API users have no admin permissions.
 */

import type { InferSelectModel } from "drizzle-orm";
import type { users, roles, permissions } from "@/shared/db/schema";
import { TRPCError } from "@trpc/server";

type User = InferSelectModel<typeof users>;
type Role = InferSelectModel<typeof roles>;
type Permission = InferSelectModel<typeof permissions>;

/** User with their full role and permission tree loaded from the DB. */
export type UserWithRoles = User & {
  roles: {
    role: Role & {
      permissions: {
        permission: Permission;
      }[];
    };
  }[];
};

/**
 * Check if a user has a specific permission.
 *
 * @param user - User with roles and permissions loaded
 * @param requiredPermission - Permission string e.g. "bookings:read"
 * @returns true if user has the permission
 */
export function hasPermission(
  user: UserWithRoles,
  requiredPermission: string
): boolean {
  // OWNER and ADMIN have all permissions implicitly
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return true;
  }

  // CUSTOMER and API users never have admin permissions
  if (user.type === "CUSTOMER" || user.type === "API") {
    return false;
  }

  const [requiredResource, requiredAction] = requiredPermission.split(":");

  if (!requiredResource || !requiredAction) {
    console.warn(
      `Invalid permission format: ${requiredPermission}. Expected "resource:action"`
    );
    return false;
  }

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission;

      // Exact match
      if (perm.resource === requiredResource && perm.action === requiredAction) {
        return true;
      }
      // Wildcard action: "bookings:*"
      if (perm.resource === requiredResource && perm.action === "*") {
        return true;
      }
      // Wildcard resource: "*:read"
      if (perm.resource === "*" && perm.action === requiredAction) {
        return true;
      }
      // Full wildcard: "*:*"
      if (perm.resource === "*" && perm.action === "*") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Require a permission, throw FORBIDDEN if user lacks it.
 * Use in service layer for imperative checks.
 */
export function requirePermission(
  user: UserWithRoles,
  requiredPermission: string
): void {
  if (!hasPermission(user, requiredPermission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: ${requiredPermission}`,
    });
  }
}

/** True if user has at least one of the given permissions. */
export function hasAnyPermission(
  user: UserWithRoles,
  permissions: string[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/** True if user has every one of the given permissions. */
export function hasAllPermissions(
  user: UserWithRoles,
  permissions: string[]
): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

/**
 * Return all permission strings for a user.
 * OWNER/ADMIN return ["*:*"]. MEMBER users return their actual permissions.
 */
export function getUserPermissions(user: UserWithRoles): string[] {
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return ["*:*"];
  }

  const permissionSet = new Set<string>();
  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission;
      permissionSet.add(`${perm.resource}:${perm.action}`);
    }
  }
  return Array.from(permissionSet).sort();
}

/**
 * Check if user can access a specific row-level resource.
 * OWNER/ADMIN can access everything. MEMBER can only access their own.
 */
export function canAccessResource(
  user: User,
  _resourceType: "booking" | "staff" | "customer",
  resourceOwnerId?: string | null
): boolean {
  if (user.type === "OWNER" || user.type === "ADMIN") {
    return true;
  }
  if (!resourceOwnerId) {
    return false;
  }
  return user.id === resourceOwnerId;
}
