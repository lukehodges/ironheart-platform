"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react"
import type { EngagementStage } from "@/modules/client-portal/client-portal.types"

const ONBOARDING_STAGES: EngagementStage[] = [
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
]

interface NavItem {
  label: string
  href: (slug: string) => string
  icon: React.ElementType
  disabled?: boolean
  badge?: string
  show?: boolean
}

export interface TenantDashboardShellProps {
  children: React.ReactNode
  tenantName: string
  tenantSlug: string
  engagementStage?: EngagementStage | null
  user: {
    firstName?: string | null
    lastName?: string | null
    email: string
  }
}

export function TenantDashboardShell({
  children,
  tenantName,
  tenantSlug,
  engagementStage,
  user,
}: TenantDashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const showOnboarding =
    engagementStage != null && ONBOARDING_STAGES.includes(engagementStage)

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: (slug) => `/${slug}/dashboard`,
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Onboarding",
      href: (slug) => `/${slug}/dashboard/onboarding`,
      icon: ClipboardList,
      show: showOnboarding,
    },
    {
      label: "Audit",
      href: (slug) => `/${slug}/dashboard/audit`,
      icon: ClipboardCheck,
      show: showOnboarding, // same CONTRACTED+ gate as Onboarding
    },
    {
      label: "Documents",
      href: (slug) => `/${slug}/dashboard/documents`,
      icon: FileText,
      disabled: true,
      badge: "Soon",
      show: true,
    },
    {
      label: "Sessions",
      href: (slug) => `/${slug}/dashboard/sessions`,
      icon: Calendar,
      disabled: true,
      badge: "Soon",
      show: true,
    },
    {
      label: "Settings",
      href: (slug) => `/${slug}/dashboard/settings`,
      icon: Settings,
      disabled: true,
      show: true,
    },
  ]

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email

  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    router.push("/sign-out")
  }

  function isActive(href: string): boolean {
    if (href === `/${tenantSlug}/dashboard`) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--ih-bg)",
        color: "var(--ih-ink)",
        fontFamily: "var(--ih-font-sans)",
        fontSize: 13,
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 56 : 220,
          minWidth: collapsed ? 56 : 220,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--ih-line)",
          background: "var(--ih-bg)",
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflow: "hidden",
        }}
        data-testid="tenant-sidebar"
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
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tenantName}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ih-ink-40)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontFamily: "var(--ih-font-mono)",
                }}
              >
                Client Portal
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const href = item.href(tenantSlug)
              const active = isActive(href)
              const IconComponent = item.icon

              if (item.disabled) {
                return (
                  <div key={item.label} style={{ padding: "0 8px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: collapsed ? "7px 0" : "6px 10px",
                        borderRadius: "var(--ih-r-md)",
                        fontSize: 12.5,
                        color: "var(--ih-ink-30)",
                        cursor: "not-allowed",
                        justifyContent: collapsed ? "center" : "flex-start",
                        userSelect: "none",
                      }}
                      aria-disabled="true"
                      title={collapsed ? item.label : undefined}
                    >
                      <IconComponent size={15} strokeWidth={1.6} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {item.badge && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "var(--ih-ink-40)",
                                padding: "1px 5px",
                                background: "var(--ih-surface-3)",
                                borderRadius: 4,
                                fontFamily: "var(--ih-font-mono)",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div key={item.label} style={{ padding: "0 8px" }}>
                  <Link
                    href={href}
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
                      border: active
                        ? "1px solid var(--ih-line)"
                        : "1px solid transparent",
                      cursor: "pointer",
                      justifyContent: collapsed ? "center" : "flex-start",
                      position: "relative",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
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
                    <IconComponent
                      size={15}
                      strokeWidth={active ? 2 : 1.6}
                    />
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  </Link>
                </div>
              )
            })}
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
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} />
                <span>Collapse</span>
              </>
            )}
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
                flexShrink: 0,
              }}
              title={displayName}
              aria-label={`User: ${displayName}`}
            >
              {initials}
            </div>
            {!collapsed && (
              <div style={{ lineHeight: 1.1, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </div>
                <div style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                  {user.email}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleSignOut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "5px 6px",
                marginTop: 4,
                background: "transparent",
                border: "none",
                borderRadius: "var(--ih-r-md)",
                cursor: "pointer",
                color: "var(--ih-ink-50)",
                fontSize: 11,
              }}
              data-testid="sign-out-button"
            >
              <LogOut size={12} />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            borderBottom: "1px solid var(--ih-line)",
            background: "rgba(250,250,247,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            flexShrink: 0,
          }}
          data-testid="tenant-topbar"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontWeight: 500,
                fontSize: 13,
                color: "var(--ih-ink-65)",
              }}
            >
              {tenantName}
            </span>
          </div>

          {/* User menu — simplified avatar for now */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              className="ih-avatar"
              style={{
                background: "var(--ih-ink)",
                color: "#fff",
                borderColor: "transparent",
                cursor: "default",
              }}
              title={displayName}
              aria-label={`Signed in as ${displayName}`}
              data-testid="topbar-avatar"
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="scrollbar-thin"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
