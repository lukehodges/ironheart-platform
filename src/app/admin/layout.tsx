import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { AdminTopbar } from "@/components/layout/admin-topbar"
import { ImpersonationBanner } from "@/components/platform/impersonation-banner"
import { db } from "@/shared/db"
import { users } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"

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

  try {
    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isPlatformAdmin: users.isPlatformAdmin,
      })
      .from(users)
      .where(eq(users.workosUserId, workosUser.id))
      .limit(1)

    dbUser = result[0] ?? null

    if (dbUser?.isPlatformAdmin) {
      isPlatformAdmin = true
      permissions = ["*:*"]
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
      />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <ImpersonationBanner />
        <AdminTopbar
          user={userForDisplay}
          permissions={permissions}
          isPlatformAdmin={isPlatformAdmin}
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
