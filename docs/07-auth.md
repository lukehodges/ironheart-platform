# Authentication & Authorization

## Auth flow

1. **WorkOS AuthKit** handles sign-in/sign-up
2. `withAuth()` retrieves the WorkOS session in server components and tRPC context
3. `tenantProcedure` middleware resolves the Drizzle user record (with roles/permissions)
4. `permissionProcedure(perm)` checks RBAC

## RBAC model

```
User → UserRoles → Role → RolePermissions → Permission
```

Permissions follow `resource:action` format:

```typescript
'bookings:read'
'bookings:write'
'customers:read'
'customers:write'
'loyalty:read'
'loyalty:write'
'audit:read'
```

Check in service/middleware:

```typescript
import { hasPermission } from '@/modules/auth/rbac'

if (!hasPermission(ctx.user, 'loyalty:write')) {
  throw new ForbiddenError('Permission denied: loyalty:write')
}
```

## Platform admin

```typescript
// users.isPlatformAdmin is the source of truth
// PLATFORM_ADMIN_EMAILS env var is bootstrap-only (first login promotion)
platformAdminProcedure  // Checks isPlatformAdmin flag
```

## Module gating

```typescript
// tRPC middleware (in router)
const moduleGate = createModuleMiddleware('loyalty')
const moduleProcedure = tenantProcedure.use(moduleGate)

// Page-level gating (in Next.js pages)
import { createModuleGate } from '@/shared/module-system/module-gate'
const gate = createModuleGate('loyalty')
await gate.check(tenantId)  // Throws if module disabled
```
