"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  Shield,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: any
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Tenants",
    href: "/platform/tenants",
    icon: Building2,
  },
  {
    title: "Analytics",
    href: "/platform/analytics",
    icon: BarChart3,
  },
  {
    title: "Platform Settings",
    href: "/platform/settings",
    icon: Settings,
  },
]

interface PlatformSidebarProps {
  user: {
    name: string
    email: string
    imageUrl?: string | null
  }
}

export function PlatformSidebar({ user }: PlatformSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-border bg-zinc-950 text-white">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Platform Admin</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white",
                    isActive && "bg-zinc-800 text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Back to Tenant Admin */}
        <div className="mt-8 border-t border-zinc-800 pt-4">
          <Link href="/admin">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.imageUrl ?? undefined} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
