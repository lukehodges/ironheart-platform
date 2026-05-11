"use client"

import { Icon, type IconName } from "@/components/shell"

export interface ActivityTimelineItem {
  time: string
  icon: IconName
  iconTone?: "ok" | "warn" | "info" | "danger" | "accent" | "muted"
  title: React.ReactNode
  meta?: string
  link?: string
}

export interface ActivityTimelineGroup {
  label: string
  items: ActivityTimelineItem[]
}

export interface ActivityTimelineProps {
  groups: ActivityTimelineGroup[]
}

function toneColors(tone?: string): { bg: string; fg: string } {
  switch (tone) {
    case "ok": return { bg: "var(--ih-ok-soft)", fg: "var(--ih-ok)" }
    case "warn": return { bg: "var(--ih-warn-soft)", fg: "var(--ih-warn)" }
    case "info": return { bg: "var(--ih-info-soft)", fg: "var(--ih-info)" }
    case "danger": return { bg: "var(--ih-danger-soft)", fg: "var(--ih-danger)" }
    case "accent": return { bg: "var(--ih-accent-soft)", fg: "var(--ih-accent)" }
    default: return { bg: "var(--ih-surface-2)", fg: "var(--ih-ink-50)" }
  }
}

export function ActivityTimeline({ groups }: ActivityTimelineProps) {
  return (
    <div>
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 16 : 0 }}>
          <div
            className="ih-eyebrow"
            style={{ padding: "8px 18px", fontSize: 9, background: "var(--ih-surface-2)" }}
          >
            {group.label}
          </div>
          {group.items.map((item, i) => {
            const { bg, fg } = toneColors(item.iconTone)
            const content = (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 26px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 18px",
                  borderBottom:
                    i < group.items.length - 1 ? "1px solid var(--ih-line)" : "0",
                }}
              >
                <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-40)" }}>
                  {item.time}
                </span>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: fg,
                  }}
                >
                  <Icon name={item.icon} size={11} stroke={2} />
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.4, minWidth: 0 }}>
                  {item.title}
                  {item.meta && (
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>
                      {item.meta}
                    </div>
                  )}
                </div>
                <Icon name="arrowUpRight" size={12} style={{ color: "var(--ih-ink-30)" }} />
              </div>
            )

            if (item.link) {
              return (
                <a
                  key={i}
                  href={item.link}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  {content}
                </a>
              )
            }
            return <div key={i}>{content}</div>
          })}
        </div>
      ))}
    </div>
  )
}
