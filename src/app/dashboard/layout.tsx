"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@/components/shell"
import type { IconName } from "@/components/shell/icon"

/* ── Portal nav items ────────────────────────────────────────────────────── */

const NAV_ITEMS: { label: string; href: string; icon: IconName }[] = [
  { label: "Overview",      href: "/dashboard",              icon: "dashboard" },
  { label: "Deliverables",  href: "/dashboard/deliverables", icon: "file" },
  { label: "Approvals",     href: "/dashboard/approvals",    icon: "check" },
  { label: "Invoices",      href: "/dashboard/invoices",     icon: "invoice" },
  { label: "Documents",     href: "/dashboard/documents",    icon: "folder" },
]

/* ── Layout ──────────────────────────────────────────────────────────────── */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: "100vh", background: "var(--ih-surface)" }}>
      {/* Top nav bar */}
      <header style={{
        height: 52,
        borderBottom: "1px solid var(--ih-line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--ih-surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {/* Left: logo + client name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: "var(--ih-ink)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "var(--ih-font-mono)" }}>IH</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Ironheart</span>
          </div>
          <span style={{ width: 1, height: 20, background: "var(--ih-line)" }}/>
          <span style={{ fontSize: 12, color: "var(--ih-ink-65)" }}>Northwind Co.</span>
        </div>

        {/* Center: nav links */}
        <nav style={{ display: "flex", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  color: isActive ? "var(--ih-ink)" : "var(--ih-ink-50)",
                  background: isActive ? "var(--ih-surface-2)" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Icon name={item.icon} size={12}/>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: user pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 28, width: 28, padding: 0 }}>
            <Icon name="bell" size={13}/>
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 10px 4px 4px", borderRadius: 999,
            border: "1px solid var(--ih-line)", cursor: "pointer",
          }}>
            <div className="ih-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>MS</div>
            <span style={{ fontSize: 11.5, fontWeight: 500 }}>Mira Sato</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        {children}
      </main>
    </div>
  )
}
