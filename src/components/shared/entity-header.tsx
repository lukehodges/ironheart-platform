"use client"

import React from "react"

export interface EntityHeaderPill {
  label: string
  tone?: "ok" | "warn" | "info" | "danger" | "accent" | "muted"
  dot?: boolean
}

export interface EntityHeaderStat {
  label: string
  value: string
  tone?: "ok" | "warn" | "info" | "danger" | "accent" | "muted"
}

export interface EntityHeaderProps {
  avatar: { initials: string; color?: string }
  title: React.ReactNode
  eyebrow?: string
  pills?: EntityHeaderPill[]
  stats?: EntityHeaderStat[]
  actions?: React.ReactNode
}

function toneColor(tone?: string): string {
  switch (tone) {
    case "ok": return "var(--ih-ok)"
    case "warn": return "var(--ih-warn)"
    case "info": return "var(--ih-info)"
    case "danger": return "var(--ih-danger)"
    case "accent": return "var(--ih-accent)"
    default: return "var(--ih-ink)"
  }
}

export function EntityHeader({ avatar, title, eyebrow, pills, stats, actions }: EntityHeaderProps) {
  return (
    <div
      style={{
        padding: "24px 28px 18px",
        borderBottom: "1px solid var(--ih-line)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 24,
        alignItems: "flex-end",
      }}
    >
      <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
        {/* Avatar */}
        <div
          className="ih-avatar ih-hatch"
          style={{
            width: 84,
            height: 84,
            borderRadius: 16,
            fontSize: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: avatar.color ?? "var(--ih-surface-2)",
            border: "1px solid var(--ih-line)",
          }}
        >
          <span style={{ fontStyle: "italic", fontFamily: "var(--ih-font-serif)", color: "var(--ih-ink)" }}>
            {avatar.initials}
          </span>
        </div>

        <div>
          {/* Eyebrow + pills */}
          {(eyebrow || (pills && pills.length > 0)) && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              {eyebrow && <span className="ih-eyebrow">{eyebrow}</span>}
              {pills?.map((p, i) => (
                <span
                  key={i}
                  className={`ih-pill${p.tone && p.tone !== "muted" ? ` ih-pill-${p.tone}` : ""}`}
                >
                  {p.dot && <span className={`ih-dot ih-dot-${p.tone ?? "muted"}`} />}
                  {p.label}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>
            {title}
          </h1>

          {/* Actions row beneath title on small layouts */}
          {actions && (
            <div style={{ marginTop: 12 }}>
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Vital stats */}
      {stats && stats.length > 0 && (
        <div style={{ display: "flex", gap: 22 }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{s.label}</div>
              <div
                className="ih-serif"
                style={{ fontSize: 26, lineHeight: 1, color: toneColor(s.tone) }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
