# Phase 3: Auth Migration — WorkOS AuthKit — Executable Plan

**Written:** 2026-02-19
**Status:** Ready to execute (after Phase 2 completes)
**Depends on:** Phase 0 (shared infra, WorkOS config scaffold, tRPC stub), Phase 1 (booking module), Phase 2 (scheduling module)

---

## Overview

**Phase goal:** Replace the legacy dual-auth system (NextAuth v4 + custom JWT, ~5 files, ~1,107 LOC) with WorkOS AuthKit. This is the highest-risk phase — it rewires authentication at every layer of the stack. Run both systems in parallel for one release cycle before cutting over.

**Risk level:** HIGH. Auth touches every authenticated tRPC procedure, all middleware, and all protected pages. A broken auth migration locks every user out. Mitigation strategy: incremental wiring, verification at every task, and keeping the Phase 0 stubs intact until the final cutover step.

### What gets built

| File | Purpose |
|------|---------|
| `src/modules/auth/auth.config.ts` | WorkOS AuthKit configuration and session types |
| `src/modules/auth/rbac.ts` | RBAC permission checking — preserved exactly from legacy |
| `src/modules/auth/tenant.ts` | Tenant detection (subdomain → header → query param) |
| `src/modules/auth/middleware.ts` | Next.js Edge Middleware using WorkOS `authkitMiddleware` |
| `src/modules/auth/hooks.ts` | `usePermission()` and client hooks |
| `src/modules/auth/router.ts` | Auth tRPC procedures (me, updateProfile, signOut) |
| `src/modules/auth/index.ts` | Barrel export |
| `src/app/api/auth/callback/route.ts` | WorkOS OAuth callback (scaffolded in Phase 0, completed here) |
| `src/app/(auth)/sign-in/page.tsx` | Sign-in page with WorkOS redirect |
| `src/app/(auth)/sign-out/page.tsx` | Sign-out handler |
| `src/middleware.ts` | Replace Phase 0 stub with WorkOS middleware |

### Source files (legacy reference — read, do not copy)

| Legacy file | LOC | Disposition |
|-------------|-----|-------------|
| `src/lib/auth.ts` | ~441 | NextAuth config → replaced by `auth.config.ts` + WorkOS |
| `src/lib/jwt.ts` | ~146 | Custom JWT → deleted (WorkOS handles tokens) |
| `src/lib/jwt-client.ts` | ~177 | Client token utils → deleted (WorkOS session) |
| `src/lib/session-manager.ts` | ~285 | Session management → deleted (WorkOS handles) |
| `src/lib/session-utils.ts` | ~40 | Session utilities → deleted (WorkOS `getUser()`) |
| `middleware.ts` (root) | ~31 | NextAuth middleware → replaced by WorkOS |
| `src/server/trpc.ts` | ~274 | tRPC context → updated to use WorkOS session |

### Success Criteria

Phase 3 is complete when ALL of the following are true:

- [ ] `npm run build` exits with 0 TypeScript errors
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `GET /api/auth/callback` handles WorkOS OAuth flow and sets the session cookie
- [ ] `GET /sign-in` redirects unauthenticated users to WorkOS hosted auth UI
- [ ] `GET /sign-out` clears the WorkOS session and redirects to `/sign-in`
- [ ] `tenantProcedure` loads the correct `User` record from Drizzle using WorkOS user identity
- [ ] `permissionProcedure('bookings:read')` throws `FORBIDDEN` for a user without that permission
- [ ] `permissionProcedure('bookings:read')` passes for OWNER/ADMIN users
- [ ] RBAC wildcard matching tests pass: `bookings:*`, `*:read`, `*:*` all work correctly
- [ ] `usePermission('bookings:read')` hook returns correct boolean on the client
- [ ] All legacy auth files deleted: `src/lib/auth.ts`, `src/lib/jwt.ts`, `src/lib/jwt-client.ts`, `src/lib/session-manager.ts`, `src/lib/session-utils.ts`
- [ ] `src/app/api/auth/[...nextauth]/` route deleted
- [ ] NextAuth dependency removed from `package.json`
- [ ] `src/shared/trpc.ts` `createContext()` stub replaced with real WorkOS session retrieval
- [ ] `npx tsx scripts/backfill-workos-users.ts` runs with 0 failures before go-live
- [ ] Every active user in the database has a non-null `workosUserId`
- [ ] `GET /auth/account-not-found` renders without requiring authentication

---

## Architectural Notes

### WorkOS AuthKit Session Flow

WorkOS AuthKit (`@workos-inc/authkit-nextjs`) works differently from NextAuth:

1. **No credentials provider** — WorkOS hosts its own login UI (email/password, SSO, magic link, etc.). The application never handles passwords.
2. **Session cookie** — WorkOS sets an encrypted session cookie (`WORKOS_COOKIE_PASSWORD` is the encryption key). The `getUser()` helper reads and decrypts this cookie server-side.
3. **No database sessions** — WorkOS manages sessions internally. The legacy `Session` database table is no longer needed for auth (can be retained for audit logs).
4. **Callback route** — After successful auth, WorkOS redirects to `/api/auth/callback`. The `handleAuth()` handler exchanges the code for a session cookie.
5. **Middleware** — `authkitMiddleware()` automatically redirects unauthenticated requests to WorkOS. It runs in the Edge runtime.

### WorkOS User → Drizzle User Linking

WorkOS users and Drizzle users are separate concepts:

- **WorkOS user** — auth identity (managed by WorkOS, has a WorkOS user ID like `user_01H...`)
- **Drizzle user** — application user record (has `tenantId`, RBAC roles, team member fields)

They are linked via a `workosUserId` column added to the Drizzle `users` table in this phase. The `tenantProcedure` middleware uses the WorkOS user to find the Drizzle user record.

**Lookup chain in `tenantProcedure`:**
```
WorkOS session → WorkOS user ID → Drizzle users.workosUserId → Drizzle User record
```

**Fallback for users created before WorkOS migration:**
If no Drizzle user found by `workosUserId`, fall back to email lookup. On first match, backfill `workosUserId`.

### tRPC Context After Phase 3

The `Context` type in `src/shared/trpc.ts` changes from the Phase 0 stub to:

```typescript
export type Context = {
  db: typeof db
  session: {
    user: WorkOSUser           // From WorkOS getUser()
    organizationId?: string    // WorkOS organization (not yet mapped to tenantId)
    accessToken: string
  } | null
  tenantId: string             // Resolved from Drizzle (not WorkOS organization)
  tenantSlug: string
  user: DrizzleUser | null     // Loaded from Drizzle in tenantProcedure
}
```

### RBAC: Identical Logic, Different Source

The RBAC logic (`resource:action` + wildcards) is **identical** to legacy. The only change is the source of truth:

| Legacy | Phase 3 |
|--------|---------|
| `ctx.session.user.permissions[]` — flattened in JWT callback | Load from Drizzle `User → UserRole → Role → Permission` |
| Permissions baked into JWT at login | Permissions loaded fresh from DB per request (current, not stale) |
| OWNER/ADMIN bypass via `user.type` in JWT | OWNER/ADMIN bypass via `user.type` from Drizzle |

Loading permissions fresh per request is slower (1 DB query per `permissionProcedure` call) but eliminates stale permission bugs (e.g., user role changed but session not refreshed). The `permissionProcedure` already loads `UserWithRoles` — this is unchanged.

### Tenant Detection: Preserved Exactly

Tenant resolution order (matches legacy exactly):
1. `X-Tenant-Slug` header (set by middleware from subdomain)
2. `platform_tenant_slug` cookie (platform admin override)
3. WorkOS organization ID → look up in `tenants` table (new, replaces session-based detection)
4. `DEFAULT_TENANT_SLUG` env var (fallback/dev)

### Multi-Tenant and WorkOS Organizations

Two valid strategies — choose one before starting PHASE3-T02:

**Option A (Recommended): Independent tenant system**
- WorkOS users have no WorkOS organization membership
- Tenant is resolved by the Drizzle `users.tenantId` column (same as legacy)
- WorkOS is used purely for auth identity, not org management
- Simpler, no WorkOS org setup required

**Option B: WorkOS organizations map to tenants**
- Each Ironheart tenant has a corresponding WorkOS organization
- WorkOS `organizationId` from session → look up `tenants.workosOrgId` in Drizzle
- Requires creating WorkOS organizations for every existing tenant
- More complex but enables WorkOS SSO per organization

**This plan uses Option A.** WorkOS is identity only; tenants are resolved from Drizzle.

---

## Task Breakdown

---

### PHASE3-T01: Add `workosUserId` column to the Drizzle schema

**Goal:** Add `workosUserId` as a nullable unique column on the `users` table. This links WorkOS auth identities to Drizzle application users. Run the migration before any WorkOS session code is written.

**Step 1 — Update the Drizzle schema:**

Edit `src/shared/db/schema.ts`. Find the `users` table definition and add the column:

```typescript
// In the users pgTable definition, add:
workosUserId: text("workos_user_id").unique(),
```

The column is nullable (`text()` without `.notNull()`) because existing users will not have a WorkOS user ID until their first login after migration.

**Step 2 — Generate and apply the migration:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx drizzle-kit generate --name=add_workos_user_id
npx drizzle-kit migrate
```

This creates a new SQL migration file in `./drizzle/` and applies it to the live database. Existing users are unaffected — `workosUserId` defaults to `NULL`.

**Step 3 — Verify:**

```bash
# Check migration file exists
ls /Users/lukehodges/Documents/ironheart-refactor/drizzle/

# Check column exists in the live DB
psql $DATABASE_URL -c "\d users" | grep workos
# Expected: workos_user_id | text | nullable | unique
```

**Verification:** `tsc --noEmit` still passes. The schema file compiles. DB migration applied without errors.

---

### PHASE3-T02: Write `src/modules/auth/auth.config.ts`

**Goal:** Define WorkOS AuthKit session types and configuration constants. This file is the single source of truth for the WorkOS integration. Phase 0 scaffolded a stub here — this task replaces it with the real implementation.

**File: `src/modules/auth/auth.config.ts`**

```typescript
/**
 * WorkOS AuthKit configuration.
 *
 * WorkOS AuthKit (`@workos-inc/authkit-nextjs`) is a hosted auth service.
 * It manages auth tokens internally — no database session table needed.
 *
 * Required environment variables:
 *   WORKOS_CLIENT_ID       — From WorkOS dashboard → API Keys
 *   WORKOS_API_KEY         — From WorkOS dashboard → API Keys
 *   WORKOS_REDIRECT_URI    — http://localhost:3000/api/auth/callback (dev)
 *   WORKOS_COOKIE_PASSWORD — 32+ char random string (openssl rand -base64 32)
 *
 * The SDK reads these automatically from process.env.
 * No explicit client instantiation is required.
 *
 * @see https://workos.com/docs/user-management
 */

/** WorkOS user object shape (returned by getUser() from the SDK) */
export type WorkOSUser = {
  id: string               // e.g. "user_01H..."
  email: string
  firstName: string | null
  lastName: string | null
  profilePictureUrl: string | null
  emailVerified: boolean
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
}

/**
 * WorkOS session shape — available in tRPC context after authentication.
 *
 * The accessToken is the WorkOS access token (opaque — do NOT decode client-side).
 * organizationId is present if the WorkOS user belongs to a WorkOS organization
 * (only relevant for Option B tenant strategy — unused in this implementation).
 */
export type WorkOSSession = {
  user: WorkOSUser
  accessToken: string
  organizationId?: string
  role?: string
  permissions?: string[]
}

/** Route where unauthenticated users are redirected */
export const AUTH_SIGNIN_PATH = '/sign-in'

/** WorkOS OAuth callback route (registered in WorkOS dashboard) */
export const AUTH_CALLBACK_PATH = '/api/auth/callback'

/** Route after successful sign-out */
export const AUTH_SIGNOUT_REDIRECT = '/sign-in'

/**
 * Routes that do NOT require authentication.
 * These are matched by the middleware and skipped for WorkOS session checks.
 *
 * Format: exact paths or path prefixes (e.g., '/book' matches /book/cotswolds)
 */
export const PUBLIC_ROUTES: string[] = [
  '/',
  '/sign-in',
  '/sign-out',
  '/api/auth/callback',
  '/api/inngest',           // Inngest serve endpoint (secured by Inngest signing key)
  '/api/trpc',              // tRPC publicProcedure calls — auth checked per-procedure
  '/book',                  // Customer booking portal
  '/confirmation',          // Booking confirmation page
]

/**
 * Route prefixes exempt from WorkOS auth middleware.
 * Checked using startsWith().
 */
export const PUBLIC_ROUTE_PREFIXES: string[] = [
  '/book/',
  '/api/auth/',
  '/api/inngest',
  '/_next/',
]
```

**Verification:** File compiles. `import { WorkOSSession, AUTH_SIGNIN_PATH } from '@/modules/auth/auth.config'` resolves.

---

### PHASE3-T03: Write `src/modules/auth/rbac.ts`

**Goal:** Preserve the RBAC permission logic exactly from legacy. The function signatures, wildcard matching logic, and OWNER/ADMIN bypass must be byte-for-byte compatible with the legacy `src/server/middleware/permissions.ts`. Any deviation breaks existing `permissionProcedure('bookings:read')` calls throughout the codebase.

**File: `src/modules/auth/rbac.ts`**

```typescript
/**
 * Role-Based Access Control (RBAC) utilities.
 *
 * Permission format: "resource:action" (e.g., "bookings:read", "staff:delete")
 * Wildcards:
 *   "bookings:*"  — all actions on bookings resource
 *   "*:read"      — read action on all resources
 *   "*:*"         — full access (equivalent to OWNER/ADMIN)
 *
 * User type bypass:
 *   OWNER / ADMIN  — implicit full access, no DB permission check needed
 *   MEMBER         — access via assigned Role → Permission records
 *   CUSTOMER / API — no admin permissions
 *
 * This is a direct port of the legacy src/server/middleware/permissions.ts.
 * The logic is intentionally unchanged — only the type imports differ
 * (Drizzle types instead of Prisma types).
 */

import { TRPCError } from '@trpc/server'
import type { InferSelectModel } from 'drizzle-orm'
import type { users, roles, permissions, userRoles, rolePermissions } from '@/shared/db/schema'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type User = InferSelectModel<typeof users>
type Role = InferSelectModel<typeof roles>
type Permission = InferSelectModel<typeof permissions>

/**
 * User with their full role and permission tree loaded from the DB.
 * This is the shape expected by hasPermission() and permissionProcedure().
 */
export type UserWithRoles = User & {
  roles: {
    role: Role & {
      permissions: {
        permission: Permission
      }[]
    }
  }[]
}

// ---------------------------------------------------------------------------
// Permission checking
// ---------------------------------------------------------------------------

/**
 * Check if a user has a specific permission.
 *
 * @param user   - User with roles and permissions loaded from DB
 * @param requiredPermission - "resource:action" string
 * @returns true if user has the permission
 *
 * @example
 * hasPermission(user, 'bookings:read')   // true/false
 * hasPermission(user, 'staff:delete')    // true/false
 */
export function hasPermission(
  user: UserWithRoles,
  requiredPermission: string
): boolean {
  // OWNER and ADMIN have all permissions implicitly — no DB check
  if (user.type === 'OWNER' || user.type === 'ADMIN') {
    return true
  }

  // CUSTOMER and API users never have admin permissions
  if (user.type === 'CUSTOMER' || user.type === 'API') {
    return false
  }

  const [requiredResource, requiredAction] = requiredPermission.split(':')

  if (!requiredResource || !requiredAction) {
    console.warn(
      `Invalid permission format: ${requiredPermission}. Expected "resource:action"`
    )
    return false
  }

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission

      // Exact match: "bookings:read" === "bookings:read"
      if (perm.resource === requiredResource && perm.action === requiredAction) {
        return true
      }
      // Wildcard action: "bookings:*" grants all actions on bookings
      if (perm.resource === requiredResource && perm.action === '*') {
        return true
      }
      // Wildcard resource: "*:read" grants read on all resources
      if (perm.resource === '*' && perm.action === requiredAction) {
        return true
      }
      // Full wildcard: "*:*" grants everything
      if (perm.resource === '*' && perm.action === '*') {
        return true
      }
    }
  }

  return false
}

/**
 * Require a permission. Throw FORBIDDEN if user lacks it.
 * Use in service layer for imperative permission checks.
 *
 * @throws TRPCError { code: 'FORBIDDEN' }
 */
export function requirePermission(
  user: UserWithRoles,
  requiredPermission: string
): void {
  if (!hasPermission(user, requiredPermission)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Permission denied: ${requiredPermission}`,
    })
  }
}

/** True if user has at least one of the given permissions. */
export function hasAnyPermission(
  user: UserWithRoles,
  permissions: string[]
): boolean {
  return permissions.some((p) => hasPermission(user, p))
}

/** True if user has every one of the given permissions. */
export function hasAllPermissions(
  user: UserWithRoles,
  permissions: string[]
): boolean {
  return permissions.every((p) => hasPermission(user, p))
}

/**
 * Return all permission strings for a user.
 * OWNER/ADMIN return ["*:*"]. MEMBER users return their actual permissions.
 * Used to populate the client-side session for `usePermission()`.
 */
export function getUserPermissions(user: UserWithRoles): string[] {
  if (user.type === 'OWNER' || user.type === 'ADMIN') {
    return ['*:*']
  }

  const permissionSet = new Set<string>()
  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission
      permissionSet.add(`${perm.resource}:${perm.action}`)
    }
  }
  return Array.from(permissionSet).sort()
}

/**
 * Check if user can access a specific row-level resource.
 * OWNER/ADMIN access everything. MEMBER only their own assigned resources.
 */
export function canAccessResource(
  user: User,
  _resourceType: 'booking' | 'staff' | 'customer',
  resourceOwnerId?: string | null
): boolean {
  if (user.type === 'OWNER' || user.type === 'ADMIN') {
    return true
  }
  if (!resourceOwnerId) return false
  return user.id === resourceOwnerId
}
```

**Write tests for this file (`src/modules/auth/rbac.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest'
import { hasPermission } from './rbac'
import type { UserWithRoles } from './rbac'

/** Factory: create a minimal UserWithRoles for testing */
function makeUser(
  type: string,
  permissions: Array<{ resource: string; action: string }>
): UserWithRoles {
  return {
    id: 'user-1',
    type,
    email: 'test@example.com',
    tenantId: 'tenant-1',
    // ... other required Drizzle fields
    roles: [
      {
        role: {
          id: 'role-1',
          name: 'Test Role',
          permissions: permissions.map((p) => ({
            permission: { id: 'perm-1', resource: p.resource, action: p.action },
          })),
        },
      },
    ],
  } as unknown as UserWithRoles
}

describe('hasPermission', () => {
  it('OWNER has all permissions', () => {
    const user = makeUser('OWNER', [])
    expect(hasPermission(user, 'bookings:read')).toBe(true)
    expect(hasPermission(user, 'staff:delete')).toBe(true)
    expect(hasPermission(user, 'anything:anything')).toBe(true)
  })

  it('ADMIN has all permissions', () => {
    const user = makeUser('ADMIN', [])
    expect(hasPermission(user, 'bookings:read')).toBe(true)
  })

  it('CUSTOMER has no admin permissions', () => {
    const user = makeUser('CUSTOMER', [{ resource: 'bookings', action: 'read' }])
    expect(hasPermission(user, 'bookings:read')).toBe(false)
  })

  it('exact match: bookings:read', () => {
    const user = makeUser('MEMBER', [{ resource: 'bookings', action: 'read' }])
    expect(hasPermission(user, 'bookings:read')).toBe(true)
    expect(hasPermission(user, 'bookings:write')).toBe(false)
  })

  it('wildcard action: bookings:*', () => {
    const user = makeUser('MEMBER', [{ resource: 'bookings', action: '*' }])
    expect(hasPermission(user, 'bookings:read')).toBe(true)
    expect(hasPermission(user, 'bookings:write')).toBe(true)
    expect(hasPermission(user, 'bookings:delete')).toBe(true)
    expect(hasPermission(user, 'staff:read')).toBe(false)
  })

  it('wildcard resource: *:read', () => {
    const user = makeUser('MEMBER', [{ resource: '*', action: 'read' }])
    expect(hasPermission(user, 'bookings:read')).toBe(true)
    expect(hasPermission(user, 'staff:read')).toBe(true)
    expect(hasPermission(user, 'bookings:write')).toBe(false)
  })

  it('full wildcard: *:*', () => {
    const user = makeUser('MEMBER', [{ resource: '*', action: '*' }])
    expect(hasPermission(user, 'bookings:read')).toBe(true)
    expect(hasPermission(user, 'staff:delete')).toBe(true)
  })

  it('rejects malformed permission string', () => {
    const user = makeUser('MEMBER', [{ resource: 'bookings', action: 'read' }])
    expect(hasPermission(user, 'invalid-no-colon')).toBe(false)
    expect(hasPermission(user, '')).toBe(false)
  })
})
```

**Additional tests for `tenantProcedure` and `platformAdminProcedure` behaviour.**

Write these in a separate file so they can be run independently from the RBAC unit tests:

**File: `src/modules/auth/__tests__/tenant-procedure.test.ts`**

```typescript
// src/modules/auth/__tests__/tenant-procedure.test.ts

describe('tenantProcedure - tenant isolation', () => {
  it('rejects user who belongs to a different tenant', async () => {
    // Setup: user is authenticated with WorkOS but belongs to tenant-A
    // Act: call tenantProcedure with tenant-B context (subdomain mismatch)
    // Assert: throws UNAUTHORIZED
  })

  it('rejects inactive users', async () => {
    // Setup: user.status === 'INACTIVE' in Drizzle
    // Act: call tenantProcedure
    // Assert: throws UNAUTHORIZED('User account is inactive')
  })

  it('allows OWNER to bypass RBAC checks', async () => {
    // Setup: user.type === 'OWNER'
    // Act: call permissionProcedure('bookings:delete')
    // Assert: does not throw (OWNER bypasses all permission checks)
  })

  it('rejects MEMBER without required permission', async () => {
    // Setup: user.type === 'MEMBER', no bookings:delete permission
    // Act: call permissionProcedure('bookings:delete')
    // Assert: throws FORBIDDEN
  })

  it('allows MEMBER with wildcard permission', async () => {
    // Setup: user.type === 'MEMBER', has permission 'bookings:*'
    // Act: call permissionProcedure('bookings:delete')
    // Assert: does not throw
  })
})

describe('platformAdminProcedure', () => {
  it('allows email in PLATFORM_ADMIN_EMAILS', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@example.com'
    // Setup: authenticated user email === 'admin@example.com'
    // Act: call platformAdminProcedure
    // Assert: does not throw
  })

  it('rejects email not in PLATFORM_ADMIN_EMAILS', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@example.com'
    // Setup: authenticated user email === 'other@example.com'
    // Act: call platformAdminProcedure
    // Assert: throws FORBIDDEN
  })
})
```

**Install Vitest (if not already present):**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npm install --save-dev vitest
```

**Run tests:**

```bash
npx vitest run src/modules/auth/rbac.test.ts
npx vitest run src/modules/auth/__tests__/tenant-procedure.test.ts
```

Expected: All 8 rbac.test.ts cases pass. All 7 tenant-procedure.test.ts cases pass.

**Verification:** Tests pass. File compiles with 0 TypeScript errors.

---

### PHASE3-T04: Write `src/modules/auth/tenant.ts`

**Goal:** Tenant detection utilities used by both the middleware and tRPC `createContext`. These are pure functions — no async operations, no DB calls (DB lookup happens in the tRPC context, not here).

**File: `src/modules/auth/tenant.ts`**

```typescript
/**
 * Tenant detection utilities.
 *
 * Resolution order (matches legacy exactly):
 *   1. X-Tenant-Slug header (set by middleware from subdomain)
 *   2. platform_tenant_slug cookie (platform admin override)
 *   3. DEFAULT_TENANT_SLUG environment variable (fallback/dev)
 *
 * The actual DB lookup (slug → tenantId) happens in src/shared/trpc.ts createContext(),
 * not here. These utilities only extract the slug string from request objects.
 */

/**
 * Extract tenant slug from a Request's headers and cookies.
 *
 * Returns the slug string and what detected it (for logging).
 * Returns null if no tenant can be detected — caller should use DEFAULT_TENANT_SLUG.
 */
export function extractTenantSlugFromRequest(req: Request): {
  slug: string | null
  source: 'header' | 'cookie' | 'default' | null
} {
  // 1. X-Tenant-Slug header (set by middleware from subdomain detection)
  const headerSlug = req.headers.get('x-tenant-slug')
  if (headerSlug) {
    return { slug: headerSlug, source: 'header' }
  }

  // 2. platform_tenant_slug cookie (platform admin override)
  const cookieHeader = req.headers.get('cookie') || ''
  const cookieMatch = cookieHeader.match(/platform_tenant_slug=([^;]+)/)
  if (cookieMatch?.[1]) {
    const decoded = decodeURIComponent(cookieMatch[1])
    return { slug: decoded, source: 'cookie' }
  }

  // 3. Environment fallback
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG
  if (defaultSlug) {
    return { slug: defaultSlug, source: 'default' }
  }

  return { slug: null, source: null }
}

/**
 * Extract tenant slug from a Next.js Request hostname.
 * Used by middleware to inject X-Tenant-Slug header.
 *
 * "cotswolds.ironheart.app" → "cotswolds"
 * "localhost:3000"          → null (not a real subdomain)
 * "app.ironheart.app"       → null (reserved subdomain)
 * "127.0.0.1"               → null
 */
export function extractSubdomainFromHostname(hostname: string): string | null {
  // Strip port if present
  const host = hostname.split(':')[0]

  // Ignore IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null

  const parts = host.split('.')

  // Need at least subdomain.domain.tld (3 parts)
  if (parts.length < 3) return null

  const subdomain = parts[0]

  // Reserved/non-tenant subdomains
  const reserved = ['www', 'app', 'api', 'localhost', 'staging', 'preview']
  if (reserved.includes(subdomain)) return null

  return subdomain
}

/**
 * Build the full tenant cache key for Redis.
 * Consistent format used everywhere Redis is read/written for tenant data.
 */
export function tenantCacheKey(slug: string): string {
  return `tenant:slug:${slug}`
}

/**
 * Check if the current path is a public route that bypasses tenant detection.
 */
export function isPublicPath(pathname: string, publicPaths: string[]): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
}
```

**Verification:** File compiles. `extractSubdomainFromHostname('cotswolds.ironheart.app')` returns `'cotswolds'`. `extractSubdomainFromHostname('localhost:3000')` returns `null`.

---

### PHASE3-T05: Write `src/modules/auth/middleware.ts`

**Goal:** The Next.js Edge Middleware that enforces WorkOS authentication and injects tenant headers. This replaces the Phase 0 stub in `src/middleware.ts`.

**Critical constraint:** Next.js middleware runs in the **Edge runtime** — no Node.js APIs (`fs`, `crypto`, `path`), no Prisma, no Drizzle. Only fetch-based operations and the WorkOS SDK.

**File: `src/modules/auth/middleware.ts`**

```typescript
import { authkitMiddleware } from '@workos-inc/authkit-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  extractSubdomainFromHostname,
  isPublicPath,
} from './tenant'
import {
  PUBLIC_ROUTES,
  PUBLIC_ROUTE_PREFIXES,
  AUTH_SIGNIN_PATH,
} from './auth.config'

/**
 * WorkOS AuthKit middleware configuration.
 *
 * authkitMiddleware() handles:
 * - Reading the WorkOS session cookie
 * - Redirecting unauthenticated requests to /sign-in (which redirects to WorkOS)
 * - Refreshing the session token when it nears expiry
 *
 * We extend it to also:
 * - Inject X-Tenant-Slug header from subdomain detection
 * - Pass platform_tenant_slug cookie through as X-Tenant-Slug override
 * - Allow public routes to pass through without auth check
 */

/** Routes that must be publicly accessible — skip WorkOS auth check */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Inject tenant headers into the request.
 * Returns a new Headers object with X-Tenant-Slug set (if detectable).
 */
function injectTenantHeaders(req: NextRequest): Headers {
  const requestHeaders = new Headers(req.headers)

  // Check for platform admin override cookie first
  const overrideCookie = req.cookies.get('platform_tenant_slug')?.value
  if (overrideCookie) {
    requestHeaders.set('x-tenant-slug', decodeURIComponent(overrideCookie))
    return requestHeaders
  }

  // Extract subdomain from hostname
  const hostname = req.headers.get('host') || ''
  const subdomain = extractSubdomainFromHostname(hostname)
  if (subdomain) {
    requestHeaders.set('x-tenant-slug', subdomain)
  }

  return requestHeaders
}

/**
 * The composed middleware function.
 *
 * Execution order:
 * 1. Allow platform admin routes through without tenant check
 * 2. Inject X-Tenant-Slug header
 * 3. If public route: pass through (no WorkOS auth check)
 * 4. If protected route: delegate to authkitMiddleware()
 */
export async function ironheartMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  // Skip WorkOS auth for all public routes
  if (isPublicRoute(pathname)) {
    const requestHeaders = injectTenantHeaders(req)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // For protected routes, inject tenant headers then run WorkOS auth check.
  // authkitMiddleware() returns a middleware function — call it with our modified request.
  const requestHeaders = injectTenantHeaders(req)
  const modifiedRequest = new Request(req.url, {
    method: req.method,
    headers: requestHeaders,
    body: req.body,
  })

  // WorkOS authkitMiddleware checks the session cookie and redirects if not authenticated.
  // redirectUri points unauthenticated users to our sign-in page.
  const workosMiddleware = authkitMiddleware({
    redirectUri: `${req.nextUrl.origin}${AUTH_SIGNIN_PATH}`,
  })

  return workosMiddleware(req as unknown as Parameters<typeof workosMiddleware>[0])
}
```

**Auth rollback mechanism:**

Add a feature flag to `src/modules/auth/middleware.ts` immediately after the imports block. This provides a 5-minute rollback path if WorkOS has an outage on go-live day — no code deploy required.

```typescript
// Emergency rollback: set AUTH_PROVIDER=legacy in environment to revert to
// previous NextAuth behaviour without a code deploy.
// This provides a 5-minute rollback path if WorkOS has an outage on go-live day.
const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? 'workos'

export function createMiddleware() {
  if (AUTH_PROVIDER === 'legacy') {
    // Return a pass-through middleware that doesn't enforce WorkOS auth.
    // Legacy NextAuth session cookies are still valid during the transition window.
    return (req: NextRequest) => NextResponse.next()
  }
  return authkitMiddleware(/* ... */)
}
```

Apply the same flag in `src/shared/trpc.ts` `createContext()`:

```typescript
const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? 'workos'

export async function createContext(opts: CreateNextContextOptions) {
  if (AUTH_PROVIDER === 'legacy') {
    // Legacy NextAuth session retrieval — keep this code path until Phase 3 is stable.
    // ...
  }
  // WorkOS session retrieval (default path)
  // ...
}
```

**Rollback procedure:**
> If WorkOS authentication fails at scale after go-live:
> 1. Set `AUTH_PROVIDER=legacy` in Vercel environment variables
> 2. Redeploy (takes ~2 minutes)
> 3. Users are back on legacy sessions immediately
> 4. Investigate and fix before re-enabling WorkOS

**Note on `authkitMiddleware` API:** The exact `authkitMiddleware` call signature depends on the installed version of `@workos-inc/authkit-nextjs`. Before using the above, check the installed SDK's exports:

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
node -e "const sdk = require('@workos-inc/authkit-nextjs'); console.log(Object.keys(sdk))"
```

If `authkitMiddleware` is not exported, the SDK may use `withAuth` or a different export name. Check the SDK's TypeScript types (`node_modules/@workos-inc/authkit-nextjs/dist/index.d.ts`) and adjust accordingly.

**Verification:** File compiles in the Edge runtime (no Node.js imports). All public paths pass through. Authenticated requests get X-Tenant-Slug header injected.

---

### PHASE3-T06: Update `src/middleware.ts` (root)

**Goal:** Replace the Phase 0 stub middleware with the WorkOS-integrated version. The root `src/middleware.ts` is a thin re-export of the module middleware.

**File: `src/middleware.ts`**

```typescript
import { ironheartMiddleware } from '@/modules/auth/middleware'
import type { NextRequest } from 'next/server'

/**
 * Next.js Edge Middleware entry point.
 *
 * Delegates to the auth module middleware which handles:
 * - WorkOS session validation (authenticated routes)
 * - Tenant slug injection (X-Tenant-Slug header)
 * - Public route pass-through
 *
 * Phase 0: Minimal stub (subdomain detection only)
 * Phase 3: WorkOS session validation added
 */
export { ironheartMiddleware as middleware }

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Image files (svg, png, jpg, etc.)
     *
     * Note: API routes ARE included — auth is checked per-procedure in tRPC,
     * but the X-Tenant-Slug header injection must run for all API requests.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Verification:** `npm run dev` starts. Accessing a protected route (e.g., `/admin`) redirects to `/sign-in`. Accessing a public route (e.g., `/book/test`) passes through.

---

### PHASE3-T07: Complete `src/app/api/auth/callback/route.ts`

**Goal:** The Phase 0 stub already created this file with `export const GET = handleAuth()`. Verify it is correct and add error handling.

**Read the existing file first:**

```bash
cat /Users/lukehodges/Documents/ironheart-refactor/src/app/api/auth/callback/route.ts
```

**Expected content (from Phase 0):**

```typescript
import { handleAuth } from '@workos-inc/authkit-nextjs'
export const GET = handleAuth()
```

**Replace with full implementation:**

```typescript
import { handleAuth } from '@workos-inc/authkit-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * WorkOS AuthKit callback route.
 *
 * WorkOS redirects here after successful authentication.
 * handleAuth() exchanges the authorization code for a WorkOS session,
 * sets the encrypted session cookie (using WORKOS_COOKIE_PASSWORD),
 * and redirects to the returnPathname (default: '/').
 *
 * Route: GET /api/auth/callback?code=...&state=...
 *
 * The returnPathname is encoded in the `state` parameter by WorkOS.
 * Users who were on /admin/bookings before being redirected to sign-in
 * will return to /admin/bookings after auth completes.
 */
export const GET = handleAuth()
```

**Note:** `handleAuth()` from `@workos-inc/authkit-nextjs` v2+ handles everything automatically — code exchange, cookie setting, and redirect. No additional code is needed here. The comment block is for documentation only.

**Verification:** After setting up WorkOS credentials (PHASE3-T13), hitting `/api/auth/callback?code=...` should set the session cookie and redirect.

---

### PHASE3-T08: Create sign-in and sign-out pages

**Goal:** Create the sign-in page that redirects to WorkOS hosted auth, and the sign-out page that clears the session.

**Create directory:**

```bash
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/\(auth\)/sign-in
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/\(auth\)/sign-out
```

**File: `src/app/(auth)/sign-in/page.tsx`**

```typescript
import { getSignInUrl } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'

/**
 * Sign-in page.
 *
 * Server component — immediately redirects to the WorkOS hosted auth UI.
 * WorkOS handles email/password, magic link, and SSO.
 * After successful auth, WorkOS redirects back to /api/auth/callback.
 *
 * The returnPathname can be passed as a query param:
 *   /sign-in?return_path=/admin/bookings
 *
 * WorkOS encodes this in the `state` param and decodes it after auth.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_path?: string }>
}) {
  const params = await searchParams
  const returnPathname = params.return_path ?? '/'

  const signInUrl = await getSignInUrl({ returnPathname })
  redirect(signInUrl)
}
```

**File: `src/app/(auth)/sign-out/page.tsx`**

```typescript
import { signOut } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'

/**
 * Sign-out page.
 *
 * Server component — clears the WorkOS session cookie and redirects to /sign-in.
 * Can also be triggered via a POST request from a sign-out button.
 */
export default async function SignOutPage() {
  await signOut()
  redirect('/sign-in')
}
```

**Note on `getSignInUrl` vs `signIn`:** Check the installed SDK version for the correct export names. The SDK may export `signIn()` (returns void, redirects automatically) instead of `getSignInUrl()` (returns URL string for manual redirect). Check with:

```bash
node -e "const sdk = require('@workos-inc/authkit-nextjs'); console.log(Object.keys(sdk).filter(k => k.toLowerCase().includes('sign')))"
```

**Verification:** `http://localhost:3000/sign-in` redirects to a WorkOS auth URL. After signing in at WorkOS, the user is redirected to `/api/auth/callback` then to `/`.

---

### PHASE3-T09: Update `src/shared/trpc.ts` — replace the Phase 0 stub

**Goal:** This is the central cutover task. Replace the Phase 0 `createContext()` stub (which always returned `session: null`) with real WorkOS session retrieval. Also update `tenantProcedure` to load the Drizzle `User` record using the WorkOS identity.

**Read the current file first to understand what changes:**

The Phase 0 `src/shared/trpc.ts` has these stubs:
- `createContext()` — always returns `session: null`
- `tenantProcedure` — `user` stays null, tenantId stays "default"
- `permissionProcedure` — always throws (no user loaded)

**Replace the stubs in `src/shared/trpc.ts`:**

**Step 1 — Update the `Context` type:**

```typescript
// Replace the existing Context type with:
import type { WorkOSSession } from '@/modules/auth/auth.config'
import type { UserWithRoles } from '@/modules/auth/rbac'

export type Context = {
  db: typeof db
  /**
   * WorkOS session. null for unauthenticated requests.
   * Set by createContext() using getUser() from @workos-inc/authkit-nextjs.
   */
  session: WorkOSSession | null
  /** Resolved tenantId for this request. */
  tenantId: string
  /** Human-readable tenant slug (used in URLs). */
  tenantSlug: string
  /**
   * Fully loaded Drizzle User record with roles and permissions.
   * Set by tenantProcedure. null in publicProcedure context.
   */
  user: UserWithRoles | null
}
```

**Step 2 — Replace `createContext()` stub:**

```typescript
import { getUser } from '@workos-inc/authkit-nextjs'
import { extractTenantSlugFromRequest } from '@/modules/auth/tenant'
import { eq } from 'drizzle-orm'
import { users } from '@/shared/db/schema'

export async function createContext({
  req,
}: {
  req: Request
}): Promise<Context> {
  // -------------------------------------------------------------------------
  // Step 1: Get WorkOS session
  // -------------------------------------------------------------------------
  // getUser() reads the WorkOS session cookie (set by /api/auth/callback).
  // Returns { user: WorkOSUser } if authenticated, or { user: null } if not.
  // The cookie is encrypted with WORKOS_COOKIE_PASSWORD.
  let session: Context['session'] = null
  try {
    const { user } = await getUser()
    if (user) {
      session = {
        user,
        accessToken: '',  // WorkOS v2: accessToken available via getSession() if needed
      }
    }
  } catch (err) {
    logger.debug('WorkOS getUser() failed (unauthenticated request)', { err })
  }

  // -------------------------------------------------------------------------
  // Step 2: Tenant detection
  // -------------------------------------------------------------------------
  // Extract tenant slug from the request (header → cookie → env default)
  const { slug: tenantSlug, source: tenantSource } =
    extractTenantSlugFromRequest(req)

  if (tenantSource === 'header') {
    logger.debug('Tenant resolved from subdomain header', { tenantSlug })
  }

  // Resolve tenantId from slug via Drizzle.
  // Uses Redis cache in production (Phase 3+ TODO).
  let tenantId = 'default'
  if (tenantSlug && tenantSlug !== 'default') {
    // TODO Phase 3 enhancement: Cache tenant lookup in Redis (5 min TTL)
    //   const cached = await redis.get<{ id: string }>(tenantCacheKey(tenantSlug))
    //   if (cached) { tenantId = cached.id } else { ...DB lookup + cache }
    const tenant = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.slug, tenantSlug),
      columns: { id: true },
    })
    if (tenant) {
      tenantId = tenant.id
    }
  }

  return {
    db,
    session,
    tenantId,
    tenantSlug: tenantSlug ?? 'default',
    user: null,
  }
}
```

**Step 3 — Replace `tenantProcedure` stub:**

```typescript
export const tenantProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    // ctx.session is guaranteed non-null here (protectedProcedure checked)
    const workosUserId = ctx.session!.user.id
    const workosEmail = ctx.session!.user.email

    // Load the full Drizzle User record with roles and permissions.
    // Try by workosUserId first, fall back to email for users created before migration.
    let userWithRoles = await ctx.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.workosUserId, workosUserId),
      with: {
        roles: {
          with: {
            role: {
              with: {
                permissions: {
                  with: { permission: true },
                },
              },
            },
          },
        },
      },
    })

    // Email fallback for pre-migration users (backfills workosUserId)
    if (!userWithRoles) {
      userWithRoles = await ctx.db.query.users.findFirst({
        where: (u, { eq, and }) =>
          and(eq(u.email, workosEmail.toLowerCase()), eq(u.tenantId, ctx.tenantId)),
        with: {
          roles: {
            with: {
              role: {
                with: {
                  permissions: {
                    with: { permission: true },
                  },
                },
              },
            },
          },
        },
      })

      // Backfill workosUserId for existing users on first WorkOS login
      if (userWithRoles) {
        await ctx.db
          .update(users)
          .set({ workosUserId })
          .where(eq(users.id, userWithRoles.id))
        userWithRoles = { ...userWithRoles, workosUserId }
        logger.info('Backfilled workosUserId for existing user', {
          userId: userWithRoles.id,
          workosUserId,
        })
      }
    }

    if (!userWithRoles) {
      // Don't throw a bare UNAUTHORIZED — redirect to a recovery page.
      // This catches the case where WorkOS auth succeeded but no DB record exists
      // (e.g., user was created in WorkOS but the backfill script was not run).
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Your account could not be found. Please contact your administrator or visit /auth/account-not-found',
      })
    }

    // Validate user is active
    if (userWithRoles.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your account is not active. Please contact support.',
      })
    }

    // Validate tenant matches
    if (userWithRoles.tenantId !== ctx.tenantId && ctx.tenantId !== 'default') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied: you do not belong to this tenant.',
      })
    }

    return next({
      ctx: {
        ...ctx,
        user: userWithRoles as UserWithRoles,
        tenantId: userWithRoles.tenantId,
        tenantSlug: ctx.tenantSlug,
      },
    })
  }
)
```

**Step 4 — Update `permissionProcedure` to use RBAC module:**

```typescript
import { hasPermission } from '@/modules/auth/rbac'

export function permissionProcedure(requiredPermission: string) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    // ctx.user is guaranteed non-null here (tenantProcedure loaded it)
    if (!ctx.user) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User record not loaded — cannot check permissions',
      })
    }

    if (!hasPermission(ctx.user, requiredPermission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${requiredPermission}`,
      })
    }

    return next({ ctx })
  })
}
```

**Account-not-found recovery page:**

Create `src/app/auth/account-not-found/page.tsx` that shows a friendly, unauthenticated-accessible message when a WorkOS session exists but no DB record is found. This page must not require authentication — add `/auth/account-not-found` to `PUBLIC_ROUTES` in `auth.config.ts`.

```typescript
// src/app/auth/account-not-found/page.tsx
// This page must be publicly accessible (no auth required).
// It is linked from the UNAUTHORIZED error message in tenantProcedure.

export default function AccountNotFoundPage() {
  return (
    <main>
      <h1>Account Not Found</h1>
      <p>
        Your account could not be found. This can happen during system upgrades
        or if your account was not fully set up.
      </p>
      <p>
        Please contact your administrator or platform support for assistance.
      </p>
    </main>
  )
}
```

> **Note:** Populate the contact links with `tenantEmail` and `platformEmail` values once multi-tenant configuration is available. For now a static message is sufficient — the priority is that the page exists and is accessible.

**Critical note on `getUser()` API:** The exact export name from `@workos-inc/authkit-nextjs` may differ by version. Check:

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
node -e "const sdk = require('@workos-inc/authkit-nextjs'); console.log(Object.keys(sdk))"
```

Common alternatives: `getUser()`, `getSession()`, `withAuth()`. Adjust the import accordingly.

**Verification:**
- `tsc --noEmit` passes
- `tenantProcedure` loads the Drizzle user when WorkOS session is set
- `permissionProcedure('bookings:read')` returns 403 for MEMBER without `bookings:read` permission
- `permissionProcedure('bookings:read')` passes for OWNER

---

### PHASE3-T10: Write `src/modules/auth/hooks.ts`

**Goal:** Client-side React hooks for permission checking and session access. The `usePermission()` hook must have the same interface as the legacy system so no component changes are needed.

**The legacy `usePermission` pattern (from legacy frontend components):**
```typescript
const canView = usePermission('bookings:read')
// Returns boolean, true if user has permission
```

**With WorkOS AuthKit, the session is available via `useUser()` from the SDK — but it doesn't carry RBAC permissions.** Instead, we need to load permissions from the tRPC `auth.me` procedure (implemented in the next task).

**File: `src/modules/auth/hooks.ts`**

```typescript
'use client'

/**
 * Client-side auth hooks.
 *
 * usePermission(permission) — check if the current user has a specific RBAC permission.
 * useCurrentUser()          — get the current user from the WorkOS session + Drizzle enrichment.
 * useIsAuthenticated()      — boolean: true if user has an active WorkOS session.
 *
 * WorkOS AuthKit provides useUser() for the WorkOS identity.
 * We wrap it with tRPC to enrich with Drizzle user data (type, permissions, tenantId).
 */

import { useUser } from '@workos-inc/authkit-nextjs/components'
import { api } from '@/lib/trpc/client'  // tRPC client — path depends on Phase 0 setup

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClientUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  type: string            // 'OWNER' | 'ADMIN' | 'MEMBER' | 'CUSTOMER' | 'API'
  tenantId: string
  tenantSlug: string
  permissions: string[]  // Flattened permission strings, e.g. ["bookings:read", "*:*"]
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// useCurrentUser
// ---------------------------------------------------------------------------

/**
 * Returns the current user with Drizzle-enriched data (type, permissions, tenant).
 *
 * Combines WorkOS `useUser()` (for auth state) with a tRPC `auth.me` query
 * (for application-layer data like user.type and permissions).
 *
 * Returns null if not authenticated or loading.
 */
export function useCurrentUser(): ClientUser | null {
  const { user: workosUser, isLoading: workosLoading } = useUser()
  const meQuery = api.auth.me.useQuery(undefined, {
    enabled: !!workosUser,  // Only fetch when WorkOS session exists
    staleTime: 5 * 60 * 1000,  // 5 min — permissions don't change often
  })

  if (workosLoading || meQuery.isLoading) {
    return null
  }

  if (!workosUser || !meQuery.data) {
    return null
  }

  return {
    id: meQuery.data.id,
    email: meQuery.data.email,
    firstName: meQuery.data.firstName,
    lastName: meQuery.data.lastName,
    type: meQuery.data.type,
    tenantId: meQuery.data.tenantId,
    tenantSlug: meQuery.data.tenantSlug,
    permissions: meQuery.data.permissions,
    isLoading: false,
  }
}

// ---------------------------------------------------------------------------
// useIsAuthenticated
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has an active WorkOS session.
 * Safe to call on any page including public ones.
 */
export function useIsAuthenticated(): boolean {
  const { user } = useUser()
  return !!user
}

// ---------------------------------------------------------------------------
// usePermission
// ---------------------------------------------------------------------------

/**
 * Check if the current user has a specific RBAC permission.
 *
 * @param requiredPermission - "resource:action" string (e.g., "bookings:read")
 * @returns true if user has the permission, false if not or not authenticated
 *
 * Supports wildcards: "bookings:*", "*:read", "*:*"
 *
 * @example
 * const canViewBookings = usePermission('bookings:read')
 * const canDeleteStaff = usePermission('staff:delete')
 *
 * if (!canViewBookings) return <AccessDenied />
 */
export function usePermission(requiredPermission: string): boolean {
  const user = useCurrentUser()
  if (!user) return false

  // OWNER and ADMIN have all permissions
  if (user.type === 'OWNER' || user.type === 'ADMIN') return true

  // CUSTOMER and API have no admin permissions
  if (user.type === 'CUSTOMER' || user.type === 'API') return false

  const [requiredResource, requiredAction] = requiredPermission.split(':')
  if (!requiredResource || !requiredAction) return false

  return user.permissions.some((perm) => {
    const [resource, action] = perm.split(':')
    if (!resource || !action) return false

    const resourceMatch = resource === requiredResource || resource === '*'
    const actionMatch = action === requiredAction || action === '*'
    return resourceMatch && actionMatch
  })
}

/**
 * Returns true if the user has at least one of the given permissions.
 */
export function useAnyPermission(permissions: string[]): boolean {
  const user = useCurrentUser()
  if (!user) return false
  return permissions.some((p) => {
    // Reuse the logic from usePermission inline (avoids hook-in-loop issues)
    if (user.type === 'OWNER' || user.type === 'ADMIN') return true
    const [requiredResource, requiredAction] = p.split(':')
    if (!requiredResource || !requiredAction) return false
    return user.permissions.some((perm) => {
      const [resource, action] = perm.split(':')
      if (!resource || !action) return false
      return (resource === requiredResource || resource === '*') &&
             (action === requiredAction || action === '*')
    })
  })
}
```

**Note on `useUser` import:** The correct import path for the client-side `useUser` hook from WorkOS depends on the SDK version. Check:
```bash
node -e "const pkg = require('@workos-inc/authkit-nextjs/package.json'); console.log(pkg.exports)"
```
The hook may be exported from `@workos-inc/authkit-nextjs` (main) or `@workos-inc/authkit-nextjs/components` (subpath). Use whichever resolves correctly.

**Note on tRPC client import:** The `api` import path (`@/lib/trpc/client`) depends on where the tRPC React Query client was set up in Phase 0. Adjust to match the actual path.

**Verification:** File compiles. `usePermission('bookings:read')` returns a boolean. No TypeScript errors.

---

### PHASE3-T11: Write `src/modules/auth/router.ts`

**Goal:** The auth tRPC router. Exposes the `me` procedure (returns enriched user data for the `useCurrentUser()` hook) and other auth-related procedures.

**File: `src/modules/auth/router.ts`**

```typescript
import { router, tenantProcedure, publicProcedure } from '@/shared/trpc'
import { getUserPermissions } from '@/modules/auth/rbac'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '@/shared/db/schema'
import { toTRPCError } from '@/shared/errors'

export const authRouter = router({

  /**
   * Get the current authenticated user with enriched data.
   *
   * Used by the client-side `useCurrentUser()` hook.
   * Returns: id, email, name, type, tenantId, tenantSlug, permissions[].
   *
   * Permissions are flattened into ["bookings:read", "staff:*", ...].
   * OWNER/ADMIN return ["*:*"].
   */
  me: tenantProcedure.query(({ ctx }) => {
    const user = ctx.user!
    const permissions = getUserPermissions(user)

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      type: user.type,
      status: user.status,
      tenantId: user.tenantId,
      tenantSlug: ctx.tenantSlug,
      isTeamMember: user.isTeamMember,
      isPlatformAdmin: user.isPlatformAdmin ?? false,
      permissions,
    }
  }),

  /**
   * Update the current user's profile.
   * Limited to fields users can change themselves.
   */
  updateProfile: tenantProcedure
    .input(
      z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updated = await ctx.db
          .update(users)
          .set({
            ...(input.firstName && { firstName: input.firstName }),
            ...(input.lastName && { lastName: input.lastName }),
            ...(input.displayName !== undefined && { displayName: input.displayName }),
            ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user!.id))
          .returning()

        return updated[0]
      } catch (e) {
        throw toTRPCError(e)
      }
    }),

  /**
   * Public endpoint — check if the API is reachable.
   * Also useful for testing tRPC setup without auth.
   */
  ping: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })),
})
```

**Verification:** File compiles. `api.auth.me.useQuery()` in a component returns the user object.

---

### PHASE3-T12: Write `src/modules/auth/index.ts` barrel export

**File: `src/modules/auth/index.ts`**

```typescript
// Replace the Phase 0 placeholder with real exports

export { authRouter } from './router'
export type { WorkOSSession, WorkOSUser } from './auth.config'
export { AUTH_SIGNIN_PATH, AUTH_CALLBACK_PATH, PUBLIC_ROUTES } from './auth.config'
export type { UserWithRoles } from './rbac'
export {
  hasPermission,
  requirePermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  canAccessResource,
} from './rbac'
export {
  extractTenantSlugFromRequest,
  extractSubdomainFromHostname,
  tenantCacheKey,
} from './tenant'
export { usePermission, useCurrentUser, useIsAuthenticated, useAnyPermission } from './hooks'
```

**Update `src/server/root.ts` to include the auth router:**

```typescript
import { authRouter } from '@/modules/auth'

export const appRouter = router({
  // ... existing routers from Phase 1 and Phase 2
  auth: authRouter,
})
```

**Verification:** `import { authRouter } from '@/modules/auth'` resolves. `tsc --noEmit` passes.

---

### PHASE3-T13: Configure WorkOS environment variables and test the auth flow end-to-end

**Goal:** Set up WorkOS credentials and verify the full auth flow works locally.

**Step 1 — Create WorkOS account and app:**

1. Go to `https://dashboard.workos.com`
2. Create a new application (name: "Ironheart Refactor Dev")
3. Go to API Keys — copy `Client ID` and `Secret Key`
4. Go to Redirects — add `http://localhost:3000/api/auth/callback`
5. Go to User Management → Auth Methods — enable Email + Password

**Step 2 — Set environment variables in `.env.local`:**

```bash
WORKOS_CLIENT_ID=client_01H...
WORKOS_API_KEY=sk_test_...
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
WORKOS_COOKIE_PASSWORD=<output of: openssl rand -base64 32>
```

**Step 3 — Create a test user in WorkOS:**

In the WorkOS dashboard → User Management → Users → Create User. Create a user with the same email as an existing user in the Drizzle `users` table (so the email fallback lookup works).

**Step 4 — Run the dev server and test:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npm run dev
```

Test flow:
1. Navigate to `http://localhost:3000/admin` (or any protected route)
2. Should redirect to `/sign-in`, then to WorkOS hosted auth
3. Log in with the test user credentials
4. Should redirect to `/api/auth/callback`, then to `/admin`
5. Open browser DevTools → Application → Cookies — verify WorkOS session cookie is set

**Step 5 — Test tRPC `auth.me` procedure:**

```bash
# With the session cookie set, test the me endpoint
curl -X POST http://localhost:3000/api/trpc/auth.me \
  -H "Content-Type: application/json" \
  -b "wos-session=<your-session-cookie-value>"
```

Expected: Returns user object with `id`, `email`, `type`, `tenantId`, `permissions`.

**Verification:** Full auth flow works. `auth.me` returns the correct Drizzle user enriched with permissions.

---

### PHASE3-T13b: Pre-migration WorkOS user backfill script

**Goal:** Before Phase 3 go-live, every existing user in the Drizzle `users` table must be created in WorkOS and their `workosUserId` backfilled. Without this, the email fallback path in `tenantProcedure` is the only safety net — and it silently locks out users whose emails don't match exactly.

Run this script once, before enabling WorkOS authentication in production. The script is idempotent — it skips users who already have a `workosUserId` or whose email already exists in WorkOS.

**File: `scripts/backfill-workos-users.ts`**

```typescript
// scripts/backfill-workos-users.ts
// Run ONCE before Phase 3 go-live: npx tsx scripts/backfill-workos-users.ts

import { WorkOS } from '@workos-inc/node'
import { db } from '../src/shared/db'
import { users } from '../src/shared/db/schema'
import { isNull, eq } from 'drizzle-orm'

const workos = new WorkOS(process.env.WORKOS_API_KEY!)

async function backfillWorkOSUsers() {
  // Find all users without a workosUserId
  const usersToMigrate = await db
    .select()
    .from(users)
    .where(isNull(users.workosUserId))

  console.log(`Found ${usersToMigrate.length} users to migrate`)

  const results = { success: 0, failed: 0, skipped: 0 }
  const failures: Array<{ userId: string; email: string; error: string }> = []

  for (const user of usersToMigrate) {
    try {
      // Check if WorkOS user already exists for this email
      const existing = await workos.userManagement.listUsers({ email: user.email })

      let workosUserId: string

      if (existing.data.length > 0) {
        workosUserId = existing.data[0].id
        results.skipped++
      } else {
        // Create WorkOS user
        const workosUser = await workos.userManagement.createUser({
          email: user.email,
          firstName: user.name?.split(' ')[0] ?? '',
          lastName: user.name?.split(' ').slice(1).join(' ') ?? '',
          emailVerified: true,
        })
        workosUserId = workosUser.id
        results.success++
      }

      // Backfill workosUserId in Drizzle
      await db
        .update(users)
        .set({ workosUserId })
        .where(eq(users.id, user.id))

    } catch (error) {
      results.failed++
      failures.push({
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  console.log('Migration complete:', results)
  if (failures.length > 0) {
    console.error('Failed users:', failures)
    console.error('These users will be locked out after Phase 3 go-live. Fix before proceeding.')
    process.exit(1)  // Fail the script if any users couldn't be migrated
  }
}

backfillWorkOSUsers()
```

**Run the script:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsx scripts/backfill-workos-users.ts
```

The script exits with code 1 if any user fails — this is intentional. All failures must be resolved before proceeding to PHASE3-T14.

**Verification:**
- [ ] `npx tsx scripts/backfill-workos-users.ts` runs with 0 failures before go-live
- [ ] Every active user in the database has a non-null `workosUserId`

```bash
# Confirm no nulls remain:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users WHERE workos_user_id IS NULL AND status = 'ACTIVE'"
# Expected: 0
```

---

### PHASE3-T14: Delete legacy auth files

**Goal:** Remove the legacy NextAuth + custom JWT files. Only do this AFTER all auth flow tests in PHASE3-T13 pass.

**Delete files:**

```bash
# Legacy auth files to delete
rm /Users/lukehodges/Documents/ironheart-refactor/src/lib/auth.ts
rm /Users/lukehodges/Documents/ironheart-refactor/src/lib/jwt.ts
rm /Users/lukehodges/Documents/ironheart-refactor/src/lib/jwt-client.ts
rm /Users/lukehodges/Documents/ironheart-refactor/src/lib/session-manager.ts
rm /Users/lukehodges/Documents/ironheart-refactor/src/lib/session-utils.ts

# Delete NextAuth API route (if it exists in the refactor project)
# Check first:
ls /Users/lukehodges/Documents/ironheart-refactor/src/app/api/auth/ 2>/dev/null
# Only delete [...nextauth] if it exists — the callback route stays
rm -rf /Users/lukehodges/Documents/ironheart-refactor/src/app/api/auth/\[...nextauth\] 2>/dev/null || true

# Delete OAuth utilities if they exist
rm -rf /Users/lukehodges/Documents/ironheart-refactor/src/lib/oauth/ 2>/dev/null || true
```

**Remove NextAuth from package.json:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npm uninstall next-auth
npm uninstall bcryptjs @types/bcryptjs 2>/dev/null || true
npm uninstall jsonwebtoken @types/jsonwebtoken 2>/dev/null || true
```

**Note:** If any other file still imports from `next-auth`, `bcryptjs`, or `jsonwebtoken`, those imports will now break. Run `tsc --noEmit` immediately after deletion to catch any broken imports:

```bash
npx tsc --noEmit 2>&1 | grep "error" | head -20
```

Fix any broken imports before proceeding.

**Verification:**
```bash
npx tsc --noEmit   # 0 errors
npm run build      # 0 errors
```

No references to `next-auth`, `getServerSession`, `authConfig`, `JWT_SECRET`, or `JWT_REFRESH_SECRET` remain in the source code (outside of comments).

---

### PHASE3-T15: Update `.env.example` with Phase 3 variables

**Goal:** Document the new WorkOS variables and remove the legacy auth variables.

**Update `.env.example`** — remove the sections for `NEXTAUTH_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` and confirm the WorkOS section now shows `[REQUIRED]` (not `[REQUIRED in Phase 3]`):

```bash
# Remove from .env.example:
# NEXTAUTH_SECRET=...
# JWT_SECRET=...
# JWT_REFRESH_SECRET=...

# Update the WorkOS section header from:
# [REQUIRED in Phase 3] Get these from WorkOS dashboard → API Keys
# To:
# [REQUIRED] Get these from WorkOS dashboard → API Keys
```

Also add the new `NEXT_PUBLIC_WORKOS_CLIENT_ID` if it's needed for any client-side SDK features, and the `AUTH_PROVIDER` rollback flag:

```bash
# WorkOS AuthKit
WORKOS_CLIENT_ID=client_01H...
WORKOS_API_KEY=sk_test_...
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
WORKOS_COOKIE_PASSWORD=your-32-character-random-string-here
# Only needed for client-side WorkOS SDK features (optional)
# NEXT_PUBLIC_WORKOS_CLIENT_ID=client_01H...

# Auth provider selection - 'workos' (default) or 'legacy' (rollback)
AUTH_PROVIDER=workos
```

**Verification:** `.env.example` accurately describes all required variables. No references to deleted env vars.

---

### PHASE3-T16: Full end-to-end verification

**Run in order:**

**Step 1 — TypeScript:**
```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsc --noEmit
```
Expected: 0 errors.

**Step 2 — Build:**
```bash
npm run build
```
Expected: 0 errors. No warnings about missing env vars at build time.

**Step 3 — RBAC unit tests:**
```bash
npx vitest run src/modules/auth/rbac.test.ts
```
Expected: All 8 tests pass.

**Step 4 — Auth flow test (dev server):**
```bash
npm run dev
```
Manual checks:
- [ ] `/sign-in` redirects to WorkOS hosted auth UI
- [ ] After successful auth, `/api/auth/callback` sets cookie and redirects
- [ ] `/admin` (protected route) requires auth — unauthenticated users go to `/sign-in`
- [ ] `/book/test` (public route) does not require auth
- [ ] `tRPC auth.ping` returns `{ status: 'ok' }` without auth
- [ ] `tRPC auth.me` requires auth — returns user with permissions
- [ ] Sign-out at `/sign-out` clears session and redirects to `/sign-in`

**Step 5 — Permission procedure tests:**

Using a test user with MEMBER type and `bookings:read` permission only:
```typescript
// These should pass:
await trpc.auth.me.query()          // tenantProcedure — user is authenticated
await trpc.booking.list.query({...}) // permissionProcedure('bookings:read') — user has it

// These should return 403 FORBIDDEN:
await trpc.booking.create.mutate({...}) // permissionProcedure('bookings:write') — no permission
await trpc.scheduling.createSlot.mutate({...}) // permissionProcedure('schedule:write') — no permission
```

**Step 6 — Wildcard permission tests:**

Using a test user with `*:*` permission (equivalent to OWNER):
- All `permissionProcedure(...)` calls should pass regardless of the permission string

**Step 7 — Directory and file cleanup verification:**
```bash
# These files should NOT exist:
ls /Users/lukehodges/Documents/ironheart-refactor/src/lib/auth.ts 2>/dev/null && echo "ERROR: still exists" || echo "OK: deleted"
ls /Users/lukehodges/Documents/ironheart-refactor/src/lib/jwt.ts 2>/dev/null && echo "ERROR: still exists" || echo "OK: deleted"
ls /Users/lukehodges/Documents/ironheart-refactor/src/lib/jwt-client.ts 2>/dev/null && echo "ERROR: still exists" || echo "OK: deleted"
ls /Users/lukehodges/Documents/ironheart-refactor/src/lib/session-manager.ts 2>/dev/null && echo "ERROR: still exists" || echo "OK: deleted"
ls /Users/lukehodges/Documents/ironheart-refactor/src/lib/session-utils.ts 2>/dev/null && echo "ERROR: still exists" || echo "OK: deleted"

# These files MUST exist:
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/auth.config.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/rbac.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/tenant.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/middleware.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/hooks.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/router.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/modules/auth/index.ts
ls /Users/lukehodges/Documents/ironheart-refactor/src/app/api/auth/callback/route.ts

# Package.json should NOT contain next-auth:
grep "next-auth" /Users/lukehodges/Documents/ironheart-refactor/package.json && echo "ERROR: next-auth still installed" || echo "OK: removed"
```

---

## Key Design Decisions

### 1. WorkOS is identity only — tenants stay in Drizzle

This implementation uses Option A (independent tenant system). WorkOS manages auth identities. Tenant membership is determined by `users.tenantId` in the Drizzle database, not by WorkOS organizations.

**Why:** Option A requires zero WorkOS configuration changes (no org setup, no org membership management). The existing tenant structure in Drizzle continues to work as-is. WorkOS organizations can be added later (Phase 5+) without breaking this implementation.

### 2. `workosUserId` column with email fallback

Adding `workosUserId` to the `users` table is the cleanest long-term solution. The email fallback handles the migration window where existing users log in for the first time after WorkOS is activated.

**Why not email as primary key:** Email can change. WorkOS user IDs are permanent. Using email as the primary link creates a fragile dependency.

### 3. Permissions loaded fresh from DB per request

The legacy system baked permissions into the JWT at login time. This means a role change doesn't take effect until the user logs out and back in (7-day window).

The new system loads `User → UserRole → Role → Permission` on every `tenantProcedure` call. This is slightly slower (1 DB query) but ensures permissions are always current.

**Performance note:** This query is cached by Drizzle's query layer and is fast (indexed on `userId`). For high-traffic deployments, add a Redis cache in `tenantProcedure` with a 5-minute TTL.

### 4. `permissionProcedure` uses the same RBAC logic as legacy

The `hasPermission()` function in `src/modules/auth/rbac.ts` is a direct port of `src/server/middleware/permissions.ts` from the legacy codebase. Every wildcard pattern (`bookings:*`, `*:read`, `*:*`) works identically. The unit tests in `rbac.test.ts` verify this parity.

### 5. Middleware runs in Edge, tRPC context runs in Node.js

The Next.js middleware (`src/middleware.ts`) runs in the Edge runtime — it calls `authkitMiddleware()` from WorkOS but does NOT access Drizzle (no Node.js driver in Edge). The actual user lookup from Drizzle happens in `tenantProcedure` (Node.js serverless function).

This matches the legacy architecture where middleware only set headers and the tRPC context did the DB lookup.

### 6. `usePermission` is client-side only

The client-side `usePermission()` hook reads the `permissions` array from the `auth.me` query result. This is a UI affordance — it hides buttons and menus. The actual enforcement happens server-side in `permissionProcedure`.

Never trust client-side permission checks for security decisions.

---

## Environment Variables

All variables introduced or changed in Phase 3:

| Variable | Required | Phase | Purpose |
|---|---|---|---|
| `WORKOS_CLIENT_ID` | Yes | Phase 3 | WorkOS app client ID |
| `WORKOS_API_KEY` | Yes | Phase 3 | WorkOS server secret key |
| `WORKOS_REDIRECT_URI` | Yes | Phase 3 | OAuth callback URL |
| `WORKOS_COOKIE_PASSWORD` | Yes | Phase 3 | Session cookie encryption (32+ chars) |
| `NEXT_PUBLIC_WORKOS_CLIENT_ID` | Optional | Phase 3 | Client-side SDK features only |
| `AUTH_PROVIDER` | Optional | Phase 3 | `workos` (default) or `legacy` (emergency rollback — no redeploy needed) |

**Removed env vars (from legacy):**
- `NEXTAUTH_SECRET` — NextAuth JWT signing key (removed with next-auth)
- `JWT_SECRET` — Custom JWT access token key (removed with jwt.ts)
- `JWT_REFRESH_SECRET` — Custom JWT refresh token key (removed with jwt.ts)

---

## Files to Read in Legacy Codebase (Reference Only)

| File | What to read for |
|------|-----------------|
| `/Users/lukehodges/Documents/ironheart/src/lib/auth.ts` | JWT callback shape: `token.type`, `token.tenantId`, `token.permissions[]`, `token.roles[]` — these fields must be preserved in the WorkOS `auth.me` response |
| `/Users/lukehodges/Documents/ironheart/src/lib/jwt.ts` | Token payload shape (`JWTPayload`) — understand what `userId`, `tenantId`, `sessionId` map to in WorkOS |
| `/Users/lukehodges/Documents/ironheart/src/lib/session-manager.ts` | `createSessionWithJWT()` — the full DB query for user with tenant; this is the reference for the `tenantProcedure` Drizzle query |
| `/Users/lukehodges/Documents/ironheart/src/server/trpc.ts` | `permissionProcedure` pattern: how it loads `userWithRoles`, calls `requirePermission()`, and extends context with `userWithRoles` |
| `/Users/lukehodges/Documents/ironheart/src/server/middleware/permissions.ts` | Full RBAC logic — `hasPermission()`, `requirePermission()`, `getUserPermissions()`, `applyPermissionFilter()` — copy logic exactly |
| `/Users/lukehodges/Documents/ironheart/src/lib/session-utils.ts` | `getTenantFromSession()` pattern — the `tenantProcedure` tenant resolution replaces this |
| `/Users/lukehodges/Documents/ironheart/middleware.ts` | Middleware structure: platform admin override cookie, `simpleTenantMiddleware` delegation pattern |

---

## What Phase 4 Will Build On

Phase 4 (Notification + Calendar-sync modules) requires the following from Phase 3:

1. **`tenantProcedure`** — fully working with WorkOS session + Drizzle user lookup. All email/SMS triggering endpoints in the notification module use `tenantProcedure`.
2. **`ctx.user`** — populated with the Drizzle user record including `email`, `firstName`, `tenantId`. Notification triggers need the current user's identity.
3. **`permissionProcedure`** — RBAC enforcement on admin notification settings endpoints.
4. **`usePermission()` hook** — UI permission gating for notification settings pages.
5. **WorkOS session cookie** — set correctly so all subsequent phase tests can authenticate.

---

*Phase 3 Plan — Ironheart Refactor*
*Written: 2026-02-19*
