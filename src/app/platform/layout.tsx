import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { db } from "@/shared/db"
import { users } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"
import { PlatformSidebar } from "@/components/platform/platform-sidebar"
import { PlatformTopbar } from "@/components/platform/platform-topbar"

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require auth
  const { user: workosUser } = await withAuth({ ensureSignedIn: true })

  if (!workosUser) {
    redirect("/sign-in")
  }

  // Load user from DB and check isPlatformAdmin flag
  let isPlatformAdmin = false

  try {
    const result = await db
      .select({
        id: users.id,
        isPlatformAdmin: users.isPlatformAdmin,
      })
      .from(users)
      .where(eq(users.workosUserId, workosUser.id))
      .limit(1)

    const dbUser = result[0]

    if (!dbUser || !dbUser.isPlatformAdmin) {
      // Not a platform admin - redirect to tenant admin
      redirect("/admin")
    }

    isPlatformAdmin = true
  } catch {
    // DB error - deny access
    redirect("/admin")
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
      <PlatformSidebar user={userForDisplay} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <PlatformTopbar user={userForDisplay} />
        <main className="flex-1 overflow-y-auto" id="platform-content">
          {children}
        </main>
      </div>
    </div>
  )
}
