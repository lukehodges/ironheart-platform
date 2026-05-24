import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { db } from "@/shared/db"
import { users } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"
import { PlatformShellClient } from "./platform-shell-client"

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user: workosUser } = await withAuth({ ensureSignedIn: true })

  if (!workosUser) {
    redirect("/sign-in")
  }

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
      redirect("/admin")
    }

    isPlatformAdmin = true
  } catch {
    redirect("/admin")
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
    role: isPlatformAdmin ? "platform admin" : "member",
  }

  return (
    <div className="h-screen overflow-hidden">
      <PlatformShellClient user={userForShell}>
        {children}
      </PlatformShellClient>
    </div>
  )
}
