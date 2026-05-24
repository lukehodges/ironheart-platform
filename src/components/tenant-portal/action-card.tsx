"use client"

import Link from "next/link"
import {
  ListChecks,
  Calendar,
  FileText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

// Server-Component → Client-Component boundary: function components can't be
// serialized across the RSC wire. Callers pass a string name, ActionCard
// resolves to the actual Lucide icon internally.
const ICON_MAP: Record<string, LucideIcon> = {
  "list-checks": ListChecks,
  calendar: Calendar,
  "file-text": FileText,
  settings: Settings,
  users: Users,
}

export type ActionCardIcon = keyof typeof ICON_MAP

export interface ActionCardProps {
  icon: ActionCardIcon
  title: string
  subtitle: string
  href: string
  disabled?: boolean
  badge?: string
}

export function ActionCard({
  icon,
  title,
  subtitle,
  href,
  disabled = false,
  badge,
}: ActionCardProps) {
  const Icon = ICON_MAP[icon] ?? FileText
  const inner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 20,
        borderRadius: "var(--ih-r-md, 8px)",
        border: "1px solid var(--ih-line)",
        background: disabled ? "var(--ih-surface-2, #f9f9f7)" : "var(--ih-surface)",
        cursor: disabled ? "default" : "pointer",
        height: "100%",
        transition: "border-color 0.15s ease, background 0.15s ease",
        position: "relative",
        opacity: disabled ? 0.7 : 1,
        userSelect: "none",
        boxSizing: "border-box",
      }}
      onMouseEnter={disabled ? undefined : (e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = "var(--ih-ink-40)"
        el.style.background = "var(--ih-bg)"
      }}
      onMouseLeave={disabled ? undefined : (e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = "var(--ih-line)"
        el.style.background = "var(--ih-surface)"
      }}
      data-testid="action-card"
      data-disabled={disabled || undefined}
    >
      {/* Badge */}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 9,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--ih-surface-3, #f1f0ec)",
            color: "var(--ih-ink-50)",
            fontFamily: "var(--ih-font-mono)",
          }}
          data-testid="action-card-badge"
        >
          {badge}
        </span>
      )}

      {/* Icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--ih-r-md, 8px)",
          background: disabled
            ? "var(--ih-surface-3, #f1f0ec)"
            : "var(--ih-surface, #f5f4f0)",
          border: "1px solid var(--ih-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        data-testid="action-card-icon"
      >
        <Icon
          size={16}
          strokeWidth={1.8}
          style={{ color: disabled ? "var(--ih-ink-30)" : "var(--ih-ink-65)" }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: disabled ? "var(--ih-ink-40)" : "var(--ih-ink)",
            marginBottom: 4,
          }}
          data-testid="action-card-title"
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--ih-ink-50)",
            lineHeight: 1.4,
          }}
          data-testid="action-card-subtitle"
        >
          {subtitle}
        </div>
      </div>
    </div>
  )

  if (disabled) {
    return <div style={{ height: "100%" }}>{inner}</div>
  }

  return (
    <Link
      href={href}
      style={{ textDecoration: "none", display: "block", height: "100%" }}
      data-testid="action-card-link"
    >
      {inner}
    </Link>
  )
}
