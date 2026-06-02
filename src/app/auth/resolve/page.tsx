/**
 * /auth/resolve — Post-auth tenant resolver page.
 *
 * handleAuth() in /api/auth/callback always redirects here (via
 * returnPathname: "/auth/resolve"). This Server Component reads the
 * WorkOS session, runs the tenant routing logic, then issues the
 * final redirect to the appropriate destination.
 *
 * See src/lib/auth/resolve-redirect.ts for the routing rules.
 */

import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { resolveAuthRedirect } from "@/lib/auth/resolve-redirect"

export const dynamic = "force-dynamic"

export default async function AuthResolvePage() {
  const { user: workosUser } = await withAuth({ ensureSignedIn: true })

  if (!workosUser) {
    // ensureSignedIn should handle this, but be defensive.
    redirect("/sign-in")
  }

  const { redirect: destination } = await resolveAuthRedirect(workosUser)
  redirect(destination)
}
