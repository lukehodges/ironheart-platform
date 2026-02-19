export { authRouter } from "./router";
export type { WorkOSSession, WorkOSUser } from "./auth.config";
export {
  AUTH_SIGNIN_PATH,
  AUTH_CALLBACK_PATH,
  PUBLIC_ROUTES,
  PUBLIC_ROUTE_PREFIXES,
} from "./auth.config";
export type { UserWithRoles } from "./rbac";
export {
  hasPermission,
  requirePermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  canAccessResource,
} from "./rbac";
export {
  extractTenantSlugFromRequest,
  extractSubdomainFromHostname,
  tenantCacheKey,
} from "./tenant";
export { checkUserPermission, usePermission } from "./hooks";
