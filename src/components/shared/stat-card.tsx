"use client"

import { Icon, type IconName } from "@/components/shell"

export interface StatCardProps {
  eyebrow: string
  value: string
  delta?: string
  hint?: string
  icon?: IconName
  onClick?: () => void
}

function deltaColor(delta: string): string {
  if (delta.startsWith("+")) return "var(--ih-ok)"
  if (delta.startsWith("-") || delta.startsWith("\u2212")) return "var(--ih-accent)"
  return "var(--ih-ink-50)"
}

export function StatCard({ eyebrow, value, delta, hint, icon, onClick }: StatCardProps) {
  return (
    <div
      className="ih-card"
      style={{ padding: "14px 14px", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() } : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="ih-eyebrow">{eyebrow}</span>
        {icon && <Icon name={icon} size={12} style={{ color: "var(--ih-ink-30)" }} />}
      </div>
      <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{value}</div>
      {(delta || hint) && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
          {delta && (
            <span style={{ color: deltaColor(delta), fontWeight: 500 }} className="ih-mono">
              {delta}
            </span>
          )}
          {hint && <span>{hint}</span>}
          {onClick && <span style={{ marginLeft: "auto", color: "var(--ih-ink-30)" }}>{"\u2197"}</span>}
        </div>
      )}
    </div>
  )
}
