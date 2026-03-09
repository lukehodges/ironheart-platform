"use client";

/**
 * Client-side auth hooks.
 *
 * NOTE: The tRPC client import path needs to be updated once the tRPC React Query
 * client provider is set up. For now this file is structured but the API calls
 * are stubbed.
 */

// Wildcard permission check logic (mirrors rbac.ts but runs client-side)
function checkPermission(
  userType: string,
  userPermissions: string[],
  requiredPermission: string
): boolean {
  if (userType === "OWNER" || userType === "ADMIN") return true;
  if (userType === "CUSTOMER" || userType === "API") return false;

  const [reqResource, reqAction] = requiredPermission.split(":");
  if (!reqResource || !reqAction) return false;

  return userPermissions.some((perm) => {
    const [resource, action] = perm.split(":");
    if (!resource || !action) return false;
    return (
      (resource === reqResource || resource === "*") &&
      (action === reqAction || action === "*")
    );
  });
}

export type ClientUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  type: string;
  tenantId: string;
  tenantSlug: string;
  permissions: string[];
};

/**
 * Check if the current user has a permission.
 * Pass in the user from your auth context/state.
 *
 * @example
 * const user = useAuthUser(); // from your auth provider
 * const canRead = checkUserPermission(user, "bookings:read");
 */
export function checkUserPermission(
  user: ClientUser | null,
  requiredPermission: string
): boolean {
  if (!user) return false;
  return checkPermission(user.type, user.permissions, requiredPermission);
}

/**
 * usePermission hook - returns boolean.
 * Requires user to be passed from the parent auth context.
 * Auth is provided by WorkOS AuthKit via the admin layout.
 */
export function usePermission(
  user: ClientUser | null,
  requiredPermission: string
): boolean {
  return checkUserPermission(user, requiredPermission);
}
