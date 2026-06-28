import { AdminShellClient } from "./admin-shell-client"

// ⚠️ DEMO WORKTREE ONLY — auth bypassed so the brokerage-mockups demo runs
// offline on any port (AUTH_PROVIDER=legacy). DO NOT MERGE. The original
// auth/DB/permission logic lives on the source branch; this branch
// (demo/brokerage-ai-assistant) is a throwaway local demo copy.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userForShell = {
    name: "Ironheart Demo",
    email: "demo@theironheart.org",
    initials: "IH",
    role: "platform admin",
  }

  return (
    <div className="h-screen overflow-hidden">
      <AdminShellClient user={userForShell}>
        <div className="p-6 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </AdminShellClient>
    </div>
  )
}
