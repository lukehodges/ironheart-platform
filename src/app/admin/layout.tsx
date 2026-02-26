import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { AdminTopbar } from "@/components/layout/admin-topbar"
import { ImpersonationBanner } from "@/components/platform/impersonation-banner"
import { db } from "@/shared/db"
import { users, userRoles, rolePermissions, permissions as permissionsTable } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"
import { tenantRepository } from "@/modules/tenant/tenant.repository"
import { redis } from "@/shared/redis"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require auth — WorkOS redirects to /sign-in automatically
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
      // should use /platform — they have no tenant context here
      const impersonationKey = `impersonate:${workosUser.id}`
      const impersonation = await redis.get(impersonationKey)
      if (!impersonation) {
        redirect("/platform")
      }
    }

    // OWNER and ADMIN user types have implicit full access (matches rbac.ts)
    if (!isPlatformAdmin && dbUser?.type && (dbUser.type === "OWNER" || dbUser.type === "ADMIN")) {
      permissions = ["*:*"]
    }

    // MEMBER users: load actual permissions from DB via userRoles → rolePermissions → permissions
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
    if (dbUser?.tenantId) {
      const modules = await tenantRepository.listModules(dbUser.tenantId)
      enabledModuleSlugs = modules
        .filter((m) => m.isEnabled)
        .map((m) => m.moduleSlug)
    }
  } catch {
    // DB unavailable (e.g. env not set in dev) — continue with basic profile
  }

  const displayName = workosUser.firstName
    ? `${workosUser.firstName} ${workosUser.lastName ?? ""}`.trim()
    : workosUser.email

  const userForDisplay = {
    name: displayName,
    email: workosUser.email,
    imageUrl: workosUser.profilePictureUrl ?? null,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        user={userForDisplay}
        permissions={permissions}
        isPlatformAdmin={isPlatformAdmin}
        enabledModuleSlugs={enabledModuleSlugs}
      />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <ImpersonationBanner />
        <AdminTopbar
          user={userForDisplay}
          permissions={permissions}
          isPlatformAdmin={isPlatformAdmin}
          enabledModuleSlugs={enabledModuleSlugs}
        />
        <main
          className="flex-1 overflow-y-auto scrollbar-thin"
          id="main-content"
        >
          <div className="container mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
