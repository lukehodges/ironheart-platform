import React from "react"

export interface RightRailProps {
  children: React.ReactNode
}

export function RightRail({ children }: RightRailProps) {
  return (
    <aside
      style={{
        width: 320,
        padding: "20px 20px 48px",
        background: "var(--ih-surface-2)",
        overflowY: "auto",
        flexShrink: 0,
      }}
      className="scrollbar-thin"
    >
      {children}
    </aside>
  )
}
