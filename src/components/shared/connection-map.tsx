"use client"

import { Icon, type IconName } from "@/components/shell"

export interface ConnectionCard {
  icon: IconName
  iconTone?: "ok" | "warn" | "info" | "danger" | "accent" | "muted"
  label: string
  value: string
  count: string
  href?: string
  onClick?: () => void
}

export interface ConnectionMapProps {
  cards: ConnectionCard[]
}

function toneColor(tone?: string): string {
  switch (tone) {
    case "ok": return "var(--ih-ok)"
    case "warn": return "var(--ih-warn)"
    case "info": return "var(--ih-info)"
    case "danger": return "var(--ih-danger)"
    case "accent": return "var(--ih-accent)"
    default: return "var(--ih-ink-40)"
  }
}

export function ConnectionMap({ cards }: ConnectionMapProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
      {cards.map((c) => {
        const inner = (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Icon name={c.icon} size={13} style={{ color: toneColor(c.iconTone) }} />
              <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{c.value}</div>
            <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{c.count}</div>
          </>
        )

        if (c.href) {
          return (
            <a
              key={c.label}
              href={c.href}
              className="ih-card"
              style={{ padding: 12, cursor: "pointer", textDecoration: "none", color: "inherit", display: "block" }}
            >
              {inner}
            </a>
          )
        }

        if (c.onClick) {
          return (
            <div key={c.label} className="ih-card" style={{ padding: 12, cursor: "pointer" }} onClick={c.onClick}>
              {inner}
            </div>
          )
        }

        return (
          <div key={c.label} className="ih-card" style={{ padding: 12 }}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
