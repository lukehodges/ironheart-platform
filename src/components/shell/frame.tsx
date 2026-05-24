"use client"

import type { ReactNode } from "react"
import { ShellSidebar, type ShellSidebarProps } from "./sidebar"
import { ShellTopbar, type ShellTopbarProps } from "./topbar"
import { BreadcrumbProvider } from "./breadcrumb-context"

export interface FrameProps {
  children: ReactNode
  /** Sidebar surface variant */
  surface?: ShellSidebarProps["surface"]
  /** User info passed to sidebar */
  user?: ShellSidebarProps["user"]
  /** Override breadcrumb labels */
  crumbs?: ShellTopbarProps["crumbs"]
  /** Extra topbar actions */
  rightActions?: ShellTopbarProps["rightActions"]
  /** User initials for topbar avatar */
  userInitials?: string
}

export function Frame({
  children,
  surface = "tenant",
  user,
  crumbs,
  rightActions,
  userInitials,
}: FrameProps) {
  return (
    <BreadcrumbProvider>
      <div
        style={{
          display: "flex",
          position: "relative",
          background: "var(--ih-bg)",
          color: "var(--ih-ink)",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          fontFamily: "var(--ih-font-sans)",
          fontSize: 13,
        }}
      >
        <ShellSidebar surface={surface} user={user} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <ShellTopbar
            crumbs={crumbs}
            rightActions={rightActions}
            userInitials={userInitials}
          />
          <main
            className="scrollbar-thin"
            style={{ flex: 1, overflowY: "auto" }}
          >
            {children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  )
}
