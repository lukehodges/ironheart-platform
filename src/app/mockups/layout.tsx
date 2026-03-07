import Link from "next/link"

const navItems = [
  { href: "/mockups/deals-pipeline", label: "Deals Pipeline" },
  { href: "/mockups/property-stock", label: "Property Stock" },
  { href: "/mockups/lease-calendar", label: "Lease Calendar" },
  { href: "/mockups/requirements-matcher", label: "Requirements" },
]

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center gap-8">
          <Link href="/mockups" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">BP</span>
            </div>
            <span className="text-sm font-semibold">BP2 Property</span>
            <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">demo</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
