"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Icon } from "./icon"

export interface ShellTopbarProps {
  /** Override breadcrumb labels (auto-derived from pathname if not provided) */
  crumbs?: string[]
  /** Extra buttons to render in the right section */
  rightActions?: React.ReactNode
  /** User initials for the avatar */
  userInitials?: string
}

function useBreadcrumbs(): string[] {
  const pathname = usePathname()

  return React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    return segments.map((seg) =>
      seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ")
    )
  }, [pathname])
}

export function ShellTopbar({
  crumbs,
  rightActions,
  userInitials = "LH",
}: ShellTopbarProps) {
  const autoCrumbs = useBreadcrumbs()
  const displayCrumbs = crumbs ?? autoCrumbs

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
        {displayCrumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <Icon
                name="chevronRight"
                size={11}
                style={{ opacity: 0.4 }}
              />
            )}
            <span
              style={{
                color:
                  i === displayCrumbs.length - 1
                    ? "var(--ih-ink)"
                    : "var(--ih-ink-50)",
                fontWeight: i === displayCrumbs.length - 1 ? 500 : 400,
              }}
            >
              {c}
            </span>
          </React.Fragment>
        ))}
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
