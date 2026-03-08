"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  Handshake,
  MapPin,
  Package,
  GitCompareArrows,
  ShieldCheck,
  Users,
  PoundSterling,
  ClipboardCheck,
  FileText,
  BarChart3,
  Settings,
  Play,
} from "lucide-react"

const navItems = [
  { href: "/admin/brokerage-mockups/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/brokerage-mockups/deals", label: "Deals", icon: Handshake },
  { href: "/admin/brokerage-mockups/sites", label: "Sites", icon: MapPin },
  { href: "/admin/brokerage-mockups/contacts", label: "Contacts", icon: Users },
  { href: "/admin/brokerage-mockups/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/admin/brokerage-mockups/inventory", label: "Inventory", icon: Package },
  { href: "/admin/brokerage-mockups/matching", label: "Matching", icon: GitCompareArrows },
  { href: "/admin/brokerage-mockups/documents", label: "Documents", icon: FileText },
  { href: "/admin/brokerage-mockups/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/admin/brokerage-mockups/financials", label: "Financials", icon: PoundSterling },
  { href: "/admin/brokerage-mockups/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/brokerage-mockups/settings", label: "Settings", icon: Settings },
]

const demoItem = {
  href: "/admin/brokerage-mockups/demo",
  label: "Demo",
  icon: Play,
}

export default function BrokerageMockupsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center gap-8">
          <Link href="/admin/brokerage-mockups" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">IH</span>
            </div>
            <span className="text-sm font-semibold">Ironheart Brokerage</span>
            <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">mockup</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              )
            })}
            <Separator orientation="vertical" className="h-5 mx-1" />
            {(() => {
              const Icon = demoItem.icon
              const isActive = pathname?.startsWith(demoItem.href)
              return (
                <Link
                  href={demoItem.href}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium"
                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {demoItem.label}
                </Link>
              )
            })()}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
