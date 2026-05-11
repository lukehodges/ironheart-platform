"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon, type IconName } from "./icon"
import { Logo } from "./logo"
import { useLocalStorage } from "@/hooks/use-local-storage"

/* ── Types ── */

interface NavItemDef {
  id: string
  label: string
  icon: IconName
  href: string
  badge?: string
  trailing?: "new"
}

interface NavSectionDef {
  title?: string
  items: NavItemDef[]
}

export interface ShellSidebarProps {
  /** Which surface variant: tenant admin, client portal, or platform admin */
  surface?: "tenant" | "portal" | "platform"
  /** User display info */
  user?: {
    name?: string | null
    email?: string | null
    initials?: string
    role?: string
  }
  className?: string
}

/* ── Nav definitions ── */

const TENANT_SECTIONS: NavSectionDef[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/admin" },
      { id: "clients", label: "Clients", icon: "users", href: "/admin/clients", badge: "12" },
      { id: "inbox", label: "Inbox", icon: "chat", href: "/admin/inbox", badge: "4" },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "bookings", label: "Bookings", icon: "calendar", href: "/admin/bookings", badge: "3" },
      { id: "pipeline", label: "Pipeline", icon: "pipeline", href: "/admin/pipeline" },
      { id: "customers", label: "Customers", icon: "user", href: "/admin/customers" },
      { id: "calendar", label: "Calendar", icon: "bookings", href: "/admin/calendar" },
      { id: "team", label: "Team", icon: "users", href: "/admin/team" },
    ],
  },
  {
    title: "Automation",
    items: [
      { id: "workflow", label: "Workflows", icon: "workflow", href: "/admin/workflows", badge: "2" },
      { id: "forms", label: "Forms", icon: "file", href: "/admin/forms" },
      { id: "ai", label: "AI Copilot", icon: "sparkles", href: "/admin/ai-chat", trailing: "new" },
    ],
  },
  {
    title: "Finance",
    items: [
      { id: "invoices", label: "Invoices", icon: "invoice", href: "/admin/payments" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { id: "analytics", label: "Analytics", icon: "chart", href: "/admin/analytics" },
      { id: "reviews", label: "Reviews", icon: "star", href: "/admin/reviews" },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "audit", label: "Audit Log", icon: "audit", href: "/admin/audit" },
      { id: "settings", label: "Settings", icon: "settings", href: "/admin/settings" },
    ],
  },
]

const PORTAL_SECTIONS: NavSectionDef[] = [
  {
    items: [
      { id: "dashboard", label: "Overview", icon: "dashboard", href: "/portal" },
      { id: "deliverables", label: "Deliverables", icon: "file", href: "/portal/deliverables", badge: "4" },
      { id: "approvals", label: "Approvals", icon: "check", href: "/portal/approvals", badge: "2" },
      { id: "invoices", label: "Invoices", icon: "invoice", href: "/portal/invoices" },
      { id: "calendar", label: "Sessions", icon: "calendar", href: "/portal/sessions" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { id: "documents", label: "Documents", icon: "folder", href: "/portal/documents" },
      { id: "messages", label: "Messages", icon: "chat", href: "/portal/messages" },
    ],
  },
]

const PLATFORM_SECTIONS: NavSectionDef[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/platform" },
      { id: "tenants", label: "Tenants", icon: "building", href: "/platform/tenants", badge: "47" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { id: "products", label: "Products", icon: "grid", href: "/platform/products" },
      { id: "subscriptions", label: "Subscriptions", icon: "refresh", href: "/platform/subscriptions" },
      { id: "revenue", label: "Revenue", icon: "money", href: "/platform/revenue" },
    ],
  },
  {
    title: "Platform",
    items: [
      { id: "analytics", label: "Analytics", icon: "chart", href: "/platform/analytics" },
      { id: "audit", label: "Audit", icon: "audit", href: "/platform/audit" },
      { id: "settings", label: "Settings", icon: "settings", href: "/platform/settings" },
    ],
  },
]

const BRANDS: Record<string, { name: string; sub: string }> = {
  tenant:   { name: "Operations", sub: "studio workspace" },
  portal:   { name: "Acme Studio", sub: "client portal" },
  platform: { name: "Operations", sub: "platform admin" },
}

/* ── Helpers ── */

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin" || href === "/portal" || href === "/platform") {
    return pathname === href
  }
  return pathname.startsWith(href)
}

/* ── Component ── */

export function ShellSidebar({
  surface = "tenant",
  user,
  className,
}: ShellSidebarProps) {
  const pathname = usePathname()
  const [storedCollapsed, setCollapsed] = useLocalStorage("ih-sidebar-collapsed", false)
  const [hasMounted, setHasMounted] = React.useState(false)

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const collapsed = hasMounted ? storedCollapsed : false

  const sections =
    surface === "portal" ? PORTAL_SECTIONS
    : surface === "platform" ? PLATFORM_SECTIONS
    : TENANT_SECTIONS

  const brand = BRANDS[surface] ?? BRANDS.tenant

  const initials = user?.initials ?? "LH"
  const displayName = user?.name ?? "Luke Hodges"
  const displayRole = user?.role ?? "owner"

  return (
    <aside
      className={className}
      style={{
        width: collapsed ? "var(--ih-sidebar-w-collapsed)" : "var(--ih-sidebar-w)",
        background: "var(--ih-surface-2)",
        borderRight: "1px solid var(--ih-line)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        transition: "width 0.2s ease",
      }}
      aria-label="Sidebar navigation"
    >
      {/* Brand header */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          borderBottom: "1px solid var(--ih-line)",
          flexShrink: 0,
        }}
      >
        <Link href={surface === "platform" ? "/platform" : surface === "portal" ? "/portal" : "/admin"}>
          <Logo size={22} />
        </Link>
        {!collapsed && (
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{brand.name}</div>
            <div
              style={{
                fontFamily: "var(--ih-font-mono)",
                fontSize: 9,
                color: "var(--ih-ink-40)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {brand.sub}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="scrollbar-thin"
        style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}
      >
        {sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            {sec.title && !collapsed && (
              <div
                className="ih-eyebrow"
                style={{ padding: "10px 18px 4px", fontSize: 9 }}
              >
                {sec.title}
              </div>
            )}
            {collapsed && sec.title && i > 0 && (
              <div
                style={{
                  height: 1,
                  background: "var(--ih-line)",
                  margin: "6px 12px",
                }}
              />
            )}
            {sec.items.map((item) => {
              const active = isActive(item.href, pathname)
              return (
                <div key={item.id} style={{ padding: "0 8px" }}>
                  <Link
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: collapsed ? "7px 0" : "6px 10px",
                      borderRadius: "var(--ih-r-md)",
                      fontSize: 12.5,
                      fontWeight: active ? 500 : 400,
                      color: active ? "var(--ih-ink)" : "var(--ih-ink-65)",
                      background: active ? "var(--ih-surface)" : "transparent",
                      border: active ? "1px solid var(--ih-line)" : "1px solid transparent",
                      cursor: "pointer",
                      justifyContent: collapsed ? "center" : "flex-start",
                      position: "relative",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "rgba(14,16,19,0.04)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent"
                      }
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          left: -8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 2,
                          height: 14,
                          background: "var(--ih-accent)",
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <Icon name={item.icon} size={15} stroke={active ? 2 : 1.6} />
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span
                        className="ih-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--ih-ink-50)",
                          padding: "1px 5px",
                          background: "var(--ih-surface-3)",
                          borderRadius: 4,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {!collapsed && item.trailing === "new" && (
                      <span
                        className="ih-pill ih-pill-accent"
                        style={{ fontSize: 8, padding: "2px 5px" }}
                      >
                        NEW
                      </span>
                    )}
                  </Link>
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: "4px 8px", borderTop: "1px solid var(--ih-line)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: collapsed ? "6px 0" : "6px 10px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: "transparent",
            border: "none",
            borderRadius: "var(--ih-r-md)",
            cursor: "pointer",
            color: "var(--ih-ink-40)",
            fontSize: 11,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ih-ink-65)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ih-ink-40)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User footer */}
      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? 0 : "4px 6px",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <div
            className="ih-avatar"
            style={{
              background: "var(--ih-ink)",
              color: "#fff",
              borderColor: "transparent",
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.1, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                {displayRole}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
