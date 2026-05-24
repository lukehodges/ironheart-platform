"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "./icon"
import { useBreadcrumbLabels } from "./breadcrumb-context"
import { api } from "@/lib/trpc/react"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_ID_RE = /^[0-9a-f]{16,}$/i  // long hex / opaque ids

interface Crumb {
  label: string
  href: string
  isLast: boolean
}

export interface ShellTopbarProps {
  /** Override breadcrumb labels (auto-derived from pathname if not provided) */
  crumbs?: string[]
  /** Extra buttons to render in the right section */
  rightActions?: React.ReactNode
  /** User initials for the avatar */
  userInitials?: string
}

function useResolvedCrumbs(): Crumb[] {
  const pathname = usePathname()
  const overrideLabels = useBreadcrumbLabels()

  // Server-side resolver — fills in labels for known id-shaped segments.
  // Skipped when the path contains nothing to resolve, and stale labels are
  // kept while a new path is fetching (smooth navigation).
  const needsResolve = React.useMemo(
    () => pathname.split("/").some((s) => UUID_RE.test(s)),
    [pathname],
  )
  const resolved = api.breadcrumb.resolve.useQuery(
    { path: pathname },
    { enabled: needsResolve, staleTime: 60_000, gcTime: 5 * 60_000 },
  )

  return React.useMemo<Crumb[]>(() => {
    const segments = pathname.split("/").filter(Boolean)
    const labels: Record<string, string> = {
      ...(resolved.data?.labels ?? {}),
      ...overrideLabels, // overrides win over server resolver
    }
    const out: Crumb[] = []
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const href = "/" + segments.slice(0, i + 1).join("/")
      let label: string | null
      if (labels[seg]) {
        label = labels[seg]
      } else if (UUID_RE.test(seg) || NUMERIC_ID_RE.test(seg)) {
        label = null  // hide unresolved id segments
      } else {
        label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ")
      }
      if (label !== null) out.push({ label, href, isLast: false })
    }
    if (out.length > 0) out[out.length - 1].isLast = true
    return out
  }, [pathname, overrideLabels, resolved.data])
}

export function ShellTopbar({
  crumbs,
  rightActions,
  userInitials = "LH",
}: ShellTopbarProps) {
  const autoCrumbs = useResolvedCrumbs()
  // When caller passes static label list, wrap them with no hrefs.
  const displayCrumbs: Crumb[] = crumbs
    ? crumbs.map((label, i) => ({ label, href: "", isLast: i === crumbs.length - 1 }))
    : autoCrumbs

  // ⌘K handler
  const handleSearchClick = React.useCallback(() => {
    // Dispatch ⌘K so the existing CommandPaletteProvider picks it up
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
    )
  }, [])

  return (
    <header
      style={{
        height: "var(--ih-topbar-h)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        borderBottom: "1px solid var(--ih-line)",
        background: "rgba(250,250,247,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        flexShrink: 0,
      }}
    >
      {/* Breadcrumbs */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: "var(--ih-ink-50)",
          flex: 1,
          minWidth: 0,
        }}
        aria-label="Breadcrumb"
      >
        {displayCrumbs.map((c, i) => {
          const baseStyle: React.CSSProperties = {
            color: c.isLast ? "var(--ih-ink)" : "var(--ih-ink-50)",
            fontWeight: c.isLast ? 500 : 400,
            textDecoration: "none",
            padding: "2px 4px",
            borderRadius: 4,
            transition: "color 0.15s ease, background 0.15s ease",
          }
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <Icon name="chevronRight" size={11} style={{ opacity: 0.4 }} />
              )}
              {c.isLast || !c.href ? (
                <span style={baseStyle}>{c.label}</span>
              ) : (
                <Link
                  href={c.href}
                  style={baseStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--ih-ink)"
                    e.currentTarget.style.background = "var(--ih-surface-2)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--ih-ink-50)"
                    e.currentTarget.style.background = "transparent"
                  }}
                >
                  {c.label}
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      {/* Search trigger */}
      <button
        className="ih-btn ih-btn-ghost ih-btn-sm"
        style={{
          width: 260,
          justifyContent: "flex-start",
          color: "var(--ih-ink-40)",
        }}
        onClick={handleSearchClick}
        aria-label="Search (⌘K)"
      >
        <Icon name="search" size={13} />
        <span style={{ flex: 1, textAlign: "left" }}>
          Search clients, bookings, invoices...
        </span>
        <span className="ih-kbd">⌘K</span>
      </button>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {rightActions}
        <button
          className="ih-btn ih-btn-quiet ih-btn-icon"
          title="Inbox"
          style={{ position: "relative" }}
          onClick={handleSearchClick}
        >
          <Icon name="inbox" size={15} />
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--ih-accent)",
            }}
          />
        </button>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" title="Notifications" onClick={handleSearchClick}>
          <Icon name="bell" size={15} />
        </button>
        <div
          style={{
            width: 1,
            height: 18,
            background: "var(--ih-line)",
            margin: "0 4px",
          }}
        />
        <div
          className="ih-avatar"
          style={{
            background: "var(--ih-ink)",
            color: "#fff",
            borderColor: "transparent",
          }}
        >
          {userInitials}
        </div>
      </div>
    </header>
  )
}
