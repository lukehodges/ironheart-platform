/**
 * resolveAuthRedirect — tenant routing logic after a successful WorkOS auth.
 *
 * Called from /auth/resolve (a Next.js Server Component) after handleAuth()
 * has exchanged the WorkOS code and set the session cookie.
 *
 * WHY a separate resolver page instead of handleAuth({ onSuccess })?
 * The @workos-inc/authkit-nextjs SDK (v0.x) defines onSuccess as:
 *   (data: HandleAuthSuccessData) => void | Promise<void>
 * The redirect Response is constructed *before* onSuccess is called, so
 * returning a string from onSuccess has no effect on the destination. The
 * SDK does not support redirect override from onSuccess. We therefore use
 * `returnPathname: "/auth/resolve"` on handleAuth() so every post-auth
 * flow lands here, where we have full Server Component access.
 *
 * Routing rules (locked in 0.1.B Task 5):
 *   isPlatformAdmin              → /platform
 *   0 org memberships            → /select-tenant?reason=no_tenants
 *   WorkOS orgs but no internal  → /select-tenant?reason=unprovisioned
 *   1 matching tenant            → /[slug]/dashboard
 *   multiple matching tenants    → /select-tenant
 */

import { db } from "@/shared/db"
import { users } from "@/shared/db/schemas/auth.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { eq, inArray } from "drizzle-orm"
import { getUserOrganizationMemberships } from "@/shared/workos"
import { logger } from "@/shared/logger"
import type { User } from "@workos-inc/node"

const log = logger.child({ module: "auth.resolve" })

export interface ResolveResult {
  /** Absolute pathname to redirect to (no host). */
  redirect: string
  /** Set to true when an internal user row was inserted during this call. */
  backfilledUser?: boolean
}

/**
 * Resolve the post-auth redirect path for the given WorkOS user.
 *
 * This is the single source of truth for "where should this user land?"
 * It is extracted from the Next.js layer so it can be unit-tested without
 * mocking Server Component / Response internals.
 */
export async function resolveAuthRedirect(workosUser: User): Promise<ResolveResult> {
  // ── 1. Find existing internal user row ──────────────────────────────────
  let internalUser = await db.query.users.findFirst({
    where: eq(users.workosUserId, workosUser.id),
  })

  // ── 2. Platform admin fast-path ─────────────────────────────────────────
  // Platform admin users are pre-seeded in the DB with isPlatformAdmin = true.
  // We do NOT attempt to backfill here — they must exist already.
  if (internalUser?.isPlatformAdmin) {
    log.info({ userId: internalUser.id }, "Platform admin login → /platform")
    return { redirect: "/platform" }
  }

  // ── 3. Resolve WorkOS org memberships ───────────────────────────────────
  const memberships = await getUserOrganizationMemberships({
    workosUserId: workosUser.id,
  })
  const orgIds = memberships.map((m) => m.organizationId)

  if (orgIds.length === 0) {
    log.warn(
      { workosUserId: workosUser.id },
      "No WorkOS org memberships — redirecting with no_tenants hint",
    )
    return { redirect: "/select-tenant?reason=no_tenants" }
  }

  // ── 4. Map WorkOS orgs → internal tenants ───────────────────────────────
  const matchingTenants = await db.query.tenants.findMany({
    where: (t, { inArray: inArr }) => inArr(t.workosOrgId, orgIds),
  })

  if (matchingTenants.length === 0) {
    log.warn(
      { workosUserId: workosUser.id, orgIds },
      "Has WorkOS memberships but no matching internal tenants → unprovisioned",
    )
    return { redirect: "/select-tenant?reason=unprovisioned" }
  }

  // ── 5. Backfill internal user row if missing ─────────────────────────────
  // We now know at least one tenant, so we can create the user row.
  // For multi-tenant users, anchor to the first matching tenant (the user
  // will be able to switch after landing on /select-tenant).
  let didBackfill = false
  if (!internalUser) {
    const anchorTenant = matchingTenants[0]
    try {
      const [created] = await db
        .insert(users)
        .values({
          // uuid() default is handled by DB default, but Drizzle needs explicit
          // value when the column has no $defaultFn. Use crypto.randomUUID().
          id: crypto.randomUUID(),
          tenantId: anchorTenant.id,
          workosUserId: workosUser.id,
          email: workosUser.email,
          firstName: workosUser.firstName ?? "",
          lastName: workosUser.lastName ?? "",
          updatedAt: new Date(),
          isPlatformAdmin: false,
        })
        .returning()
      internalUser = created
      didBackfill = true
      log.info(
        { workosUserId: workosUser.id, userId: created.id, tenantId: anchorTenant.id },
        "Backfilled internal user row from WorkOS invitation",
      )
    } catch (err) {
      // If a concurrent request already inserted the row, re-fetch.
      const refetched = await db.query.users.findFirst({
        where: eq(users.workosUserId, workosUser.id),
      })
      if (refetched) {
        internalUser = refetched
        log.info(
          { workosUserId: workosUser.id, userId: refetched.id },
          "Concurrent backfill detected — using existing row",
        )
      } else {
        log.error({ workosUserId: workosUser.id, err }, "Failed to backfill user row")
        // Fall through — routing still works without a local row
      }
    }
  }

  // ── 6. Route by tenant count ─────────────────────────────────────────────
  if (matchingTenants.length === 1) {
    const slug = matchingTenants[0].slug
    log.info(
      { userId: internalUser?.id, tenantSlug: slug },
      "Single tenant → dashboard",
    )
    return { redirect: `/${slug}/dashboard`, backfilledUser: didBackfill }
  }

  log.info(
    { userId: internalUser?.id, count: matchingTenants.length },
    "Multi-tenant user → selector",
  )
  return { redirect: "/select-tenant", backfilledUser: didBackfill }
}
