"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Handshake,
  MapPin,
  Package,
  GitCompareArrows,
  ShieldCheck,
  Users,
  PoundSterling,
} from "lucide-react"

const navItems = [
  { href: "/admin/brokerage-mockups/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/brokerage-mockups/deals", label: "Deals", icon: Handshake },
  { href: "/admin/brokerage-mockups/sites", label: "Sites", icon: MapPin },
  { href: "/admin/brokerage-mockups/inventory", label: "Inventory", icon: Package },
  { href: "/admin/brokerage-mockups/matching", label: "Matching", icon: GitCompareArrows },
  { href: "/admin/brokerage-mockups/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/admin/brokerage-mockups/contacts", label: "Contacts", icon: Users },
  { href: "/admin/brokerage-mockups/financials", label: "Financials", icon: PoundSterling },
]

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
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
