"use client"

import { Icon, type IconName } from "@/components/shell"

export interface SegmentRailItem {
  label: string
  count?: number
  icon?: IconName
  dot?: "ok" | "warn" | "info" | "danger" | "accent" | "muted"
  value: string
  active?: boolean
}

export interface SegmentRailGroup {
  title?: string
  items: SegmentRailItem[]
}

export interface SegmentRailProps {
  groups: SegmentRailGroup[]
  onChange?: (value: string) => void
}

export function SegmentRail({ groups, onChange }: SegmentRailProps) {
  return (
    <aside
      style={{
        width: 260,
        borderRight: "1px solid var(--ih-line)",
        padding: "12px 8px",
        overflowY: "auto",
        flexShrink: 0,
        background: "var(--ih-surface-2)",
      }}
      className="scrollbar-thin"
    >
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 12 }}>
          {group.title && (
            <div className="ih-eyebrow" style={{ padding: "8px 8px 4px", fontSize: 9 }}>
              {group.title}
            </div>
          )}
          {group.items.map((item) => (
            <button
              key={item.value}
              onClick={() => onChange?.(item.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "5px 8px",
                borderRadius: "var(--ih-r-sm)",
                background: item.active ? "var(--ih-surface)" : "transparent",
                border: item.active ? "1px solid var(--ih-line)" : "1px solid transparent",
                fontSize: 12,
                color: item.active ? "var(--ih-ink)" : "var(--ih-ink-65)",
                cursor: "pointer",
                position: "relative",
                textAlign: "left",
                fontFamily: "var(--ih-font-sans)",
              }}
            >
              {item.active && (
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
              {item.icon && (
                <Icon name={item.icon} size={12} style={{ color: "var(--ih-ink-40)" }} />
              )}
              <span style={{ flex: 1, fontWeight: item.active ? 500 : 400 }}>{item.label}</span>
              {item.dot && <span className={`ih-dot ih-dot-${item.dot}`} />}
              {item.count != null && (
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </aside>
  )
}
