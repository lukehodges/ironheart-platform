"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  FileBarChart,
  TrendingUp,
} from "lucide-react"

// Placeholder engagement stage — in production this comes from the API
const MOCK_STAGE = "AUDITING" as const

type EngagementStage =
  | "DISCOVERY"
  | "PROPOSAL"
  | "CONTRACTED"
  | "ONBOARDING"
  | "AUDITING"
  | "REPORTING"
  | "IMPLEMENTING"
  | "RETAINER"
  | "CLOSED_WON"
  | "CLOSED_LOST"

const STAGE_ORDER: EngagementStage[] = [
  "DISCOVERY",
  "PROPOSAL",
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
  "CLOSED_WON",
  "CLOSED_LOST",
]

function stageAtLeast(current: EngagementStage, target: EngagementStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target)
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  minStage?: EngagementStage
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Team", href: "/dashboard/team", icon: <Users className="h-4 w-4" /> },
  { label: "Report", href: "/dashboard/report", icon: <FileBarChart className="h-4 w-4" />, minStage: "REPORTING" },
  { label: "Progress", href: "/dashboard/progress", icon: <TrendingUp className="h-4 w-4" />, minStage: "IMPLEMENTING" },
]

// Placeholder user
const MOCK_USER = { name: "Sarah Mitchell", initials: "SM" }

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const stage = MOCK_STAGE

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.minStage || stageAtLeast(stage, item.minStage)
  )

  return (
    <div className="min-h-screen bg-[#EFEAE0]">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D13A1F]">
              <span className="text-sm font-bold text-white">IH</span>
            </div>
            <span className="font-serif text-xl tracking-tight text-stone-900">
              The Ironheart
            </span>
          </Link>

          {/* Navigation tabs */}
          <nav className="flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User pill */}
          <div className="flex items-center gap-3 rounded-full border border-stone-200 py-1.5 pl-1.5 pr-4">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#2F6F5C] text-[10px] text-white">
                {MOCK_USER.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-stone-700">
              {MOCK_USER.name}
            </span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}
