import React from "react"

export interface MiniCardProps {
  eyebrow: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function MiniCard({ eyebrow, action, children }: MiniCardProps) {
  return (
    <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--ih-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="ih-eyebrow">{eyebrow}</span>
        {action}
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  )
}
