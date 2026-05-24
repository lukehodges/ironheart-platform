"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Building2,
  GitBranch,
  CalendarCheck,
  FileText,
  Workflow,
  Send,
  CreditCard,
  FileSpreadsheet,
  Wallet,
  Users,
  Users2,
  Star,
  BarChart3,
  FileBarChart,
  Sparkles,
  Shield,
  Package,
  BadgeDollarSign,
  TrendingUp,
  Settings,
  GraduationCap,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Today",
    items: [
      { title: "Today", href: "/platform/today", icon: LayoutDashboard },
      { title: "Inbox", href: "/platform/inbox", icon: Inbox },
      { title: "Calendar", href: "/platform/calendar", icon: Calendar },
    ],
  },
  {
    title: "Clients",
    items: [
      { title: "Clients", href: "/platform/clients", icon: Building2 },
      { title: "Pipeline", href: "/platform/pipeline", icon: GitBranch },
      { title: "Bookings", href: "/platform/bookings", icon: CalendarCheck },
      { title: "Customers", href: "/platform/customers", icon: Users2 },
    ],
  },
  {
    title: "Work",
    items: [
      { title: "Forms", href: "/platform/forms", icon: FileText },
      { title: "Workflows", href: "/platform/workflows", icon: Workflow },
      { title: "Outreach", href: "/platform/outreach", icon: Send },
    ],
  },
  {
    title: "Money",
    items: [
      { title: "Payments", href: "/platform/payments", icon: CreditCard },
      { title: "Invoices", href: "/platform/invoices", icon: FileSpreadsheet },
      { title: "Finance", href: "/platform/finance", icon: Wallet },
    ],
  },
  {
    title: "Team",
    items: [
      { title: "Team", href: "/platform/team", icon: Users },
      { title: "Educators", href: "/platform/educators", icon: GraduationCap },
      { title: "Reviews", href: "/platform/reviews", icon: Star },
    ],
  },
  {
    title: "Insights",
    items: [
      { title: "Analytics", href: "/platform/analytics", icon: BarChart3 },
      { title: "Reports", href: "/platform/reports", icon: FileBarChart },
      { title: "AI Chat", href: "/platform/ai-chat", icon: Sparkles },
    ],
  },
  {
    title: "Superadmin",
    items: [
      { title: "Tenants", href: "/platform/tenants", icon: Shield },
      { title: "Products", href: "/platform/products", icon: Package },
      { title: "Subscriptions", href: "/platform/subscriptions", icon: BadgeDollarSign },
      { title: "Revenue", href: "/platform/revenue", icon: TrendingUp },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Settings", href: "/platform/settings", icon: Settings },
    ],
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
        <span className="text-lg font-semibold">Ironheart</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/")
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
              </div>
            </div>
          ))}
        </nav>
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
