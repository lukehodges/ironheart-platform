import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { ImpersonationBanner } from "@/components/platform/impersonation-banner"
import { db } from "@/shared/db"
import { users, userRoles, rolePermissions, permissions as permissionsTable } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"
import { tenantRepository } from "@/modules/tenant/tenant.repository"
import { redis } from "@/shared/redis"
import { AdminShellClient } from "./admin-shell-client"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require auth - WorkOS redirects to /sign-in automatically
  const { user: workosUser } = await withAuth({ ensureSignedIn: true })

  if (!workosUser) {
    redirect("/sign-in")
  }

  // Load Drizzle user for permissions and profile
  // Falls back gracefully if DB is unavailable
  let dbUser = null
  let permissions: string[] = []
  let isPlatformAdmin = false
  let enabledModuleSlugs: string[] = []

  try {
    const result = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        type: users.type,
        isPlatformAdmin: users.isPlatformAdmin,
      })
      .from(users)
      .where(eq(users.workosUserId, workosUser.id))
      .limit(1)

    dbUser = result[0] ?? null

    if (dbUser?.isPlatformAdmin) {
      isPlatformAdmin = true
      permissions = ["*:*"]

      // Platform admins without an active impersonation session
      // should use /platform - they have no tenant context here
      const impersonationKey = `impersonate:${workosUser.id}`
      const impersonation = await redis.get(impersonationKey) as { tenantId?: string } | null
      if (!impersonation) {
        redirect("/platform")
      }

      // Use the impersonated tenant's modules, not the platform tenant's
      if (impersonation?.tenantId) {
        const modules = await tenantRepository.listModules(impersonation.tenantId)
        enabledModuleSlugs = modules
          .filter((m) => m.isEnabled)
          .map((m) => m.moduleSlug)
      }
    }

    // OWNER and ADMIN user types have implicit full access (matches rbac.ts)
    if (!isPlatformAdmin && dbUser?.type && (dbUser.type === "OWNER" || dbUser.type === "ADMIN")) {
      permissions = ["*:*"]
    }

    // MEMBER users: load actual permissions from DB via userRoles -> rolePermissions -> permissions
    if (dbUser && permissions.length === 0) {
      const rows = await db
        .select({
          resource: permissionsTable.resource,
          action: permissionsTable.action,
        })
        .from(userRoles)
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
        .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissions.permissionId))
        .where(eq(userRoles.userId, dbUser.id))

      const permSet = new Set<string>()
      for (const row of rows) {
        permSet.add(`${row.resource}:${row.action}`)
      }
      permissions = Array.from(permSet)
    }

    // Load enabled modules for sidebar navigation
    // Skip if already loaded from impersonation session above
    if (dbUser?.tenantId && enabledModuleSlugs.length === 0) {
      const modules = await tenantRepository.listModules(dbUser.tenantId)
      enabledModuleSlugs = modules
        .filter((m) => m.isEnabled)
        .map((m) => m.moduleSlug)
    }
  } catch {
    // DB unavailable (e.g. env not set in dev) - continue with basic profile
  }

  const displayName = workosUser.firstName
    ? `${workosUser.firstName} ${workosUser.lastName ?? ""}`.trim()
    : workosUser.email

  const initials = workosUser.firstName
    ? `${workosUser.firstName[0]}${workosUser.lastName?.[0] ?? ""}`.toUpperCase()
    : (workosUser.email?.[0] ?? "U").toUpperCase()

  const userForShell = {
    name: displayName,
    email: workosUser.email,
    initials,
    role: isPlatformAdmin ? "platform admin" : (dbUser?.type?.toLowerCase() ?? "member"),
  }

  return (
    <div className="h-screen overflow-hidden">
      <ImpersonationBanner />
      <AdminShellClient user={userForShell}>
        <div className="p-6 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </AdminShellClient>
    </div>
  )
}
