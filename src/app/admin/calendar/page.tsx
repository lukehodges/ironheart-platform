"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */

type CalEvent = {
  day: number; startHour: number; duration: number;
  title: string; subtitle: string; type: "discovery" | "audit" | "checkpoint" | "internal";
}

const EVENTS: CalEvent[] = [
  { day: 0, startHour: 10, duration: 0.5, title: "Stand-up", subtitle: "Internal \u00b7 15m", type: "internal" },
  { day: 0, startHour: 14, duration: 1, title: "Olsen \u00b7 Discovery call", subtitle: "Zoom \u00b7 60m \u00b7 3 attendees", type: "discovery" },
  { day: 1, startHour: 9, duration: 0.75, title: "Northwind \u00b7 Audit review", subtitle: "Q1 ops findings \u00b7 45m", type: "audit" },
  { day: 1, startHour: 15, duration: 0.5, title: "Castor \u00b7 Checkpoint", subtitle: "Sprint 2 review \u00b7 30m", type: "checkpoint" },
  { day: 2, startHour: 11, duration: 1, title: "Vellum \u00b7 Sprint review", subtitle: "Portal rebuild \u00b7 60m", type: "checkpoint" },
  { day: 2, startHour: 16, duration: 0.5, title: "Internal planning", subtitle: "Q3 roadmap \u00b7 30m", type: "internal" },
  { day: 3, startHour: 9, duration: 0.75, title: "Arden \u00b7 Audit walkthrough", subtitle: "Booking system \u00b7 45m", type: "audit" },
  { day: 4, startHour: 10, duration: 0.5, title: "Halcyon \u00b7 Handoff call", subtitle: "Final deliverables \u00b7 30m", type: "checkpoint" },
]

const DAYS = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"]
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  discovery:  { bg: "var(--ih-accent-soft)", border: "var(--ih-accent)", text: "var(--ih-accent)" },
  audit:      { bg: "var(--ih-info-soft)", border: "var(--ih-info)", text: "var(--ih-info)" },
  checkpoint: { bg: "var(--ih-ok-soft)", border: "var(--ih-ok)", text: "var(--ih-ok)" },
  internal:   { bg: "var(--ih-surface-2)", border: "var(--ih-ink-30)", text: "var(--ih-ink-50)" },
}

const VIEWS = ["Day", "Week", "Month"]

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function CalendarPage() {
  const [view, setView] = useState(1)

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Calendar &middot; this week</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            Week 20. <span className="ih-italic-red">May 12&ndash;16.</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="chevronLeft" size={11}/></button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm">Today</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="chevronRight" size={11}/></button>
          <div style={{ width: 1, height: 18, background: "var(--ih-line)", margin: "0 4px" }} />
          <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
            {VIEWS.map((v, i) => (
              <button key={v} onClick={() => setView(i)} className={`ih-btn ih-btn-sm ${i === view ? "" : "ih-btn-quiet"}`} style={{ height: 22, background: i === view ? "var(--ih-surface-2)" : "transparent", border: 0, color: i === view ? "var(--ih-ink)" : undefined }}>{v}</button>
            ))}
          </div>
          <button className="ih-btn ih-btn-primary ih-btn-sm"><Icon name="plus" size={12}/> New event</button>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        {/* Week grid */}
        <div className="ih-card" style={{ overflow: "hidden" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", borderBottom: "1px solid var(--ih-line)" }}>
            <div style={{ padding: "10px 8px", borderRight: "1px solid var(--ih-line)" }} />
            {DAYS.map((d, i) => (
              <div key={d} style={{ padding: "10px 12px", borderRight: i < 4 ? "1px solid var(--ih-line)" : undefined, textAlign: "center" }}>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{d.split(" ")[0]}</div>
                <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1, marginTop: 2, color: i === 0 ? "var(--ih-accent)" : "var(--ih-ink)" }}>{d.split(" ")[1]}</div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div style={{ position: "relative" }}>
            {HOURS.map((h) => (
              <div key={h} style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", height: 60, borderBottom: "1px solid var(--ih-line)" }}>
                <div style={{ padding: "4px 8px 0", textAlign: "right", borderRight: "1px solid var(--ih-line)" }}>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{h.toString().padStart(2, "0")}:00</span>
                </div>
                {[0, 1, 2, 3, 4].map((d) => (
                  <div key={d} style={{ borderRight: d < 4 ? "1px solid var(--ih-line)" : undefined, position: "relative" }}>
                    {EVENTS.filter(e => e.day === d && e.startHour === h).map((e) => {
                      const colors = TYPE_COLORS[e.type]
                      return (
                        <div key={e.title} style={{
                          position: "absolute", top: 2, left: 3, right: 3,
                          height: Math.max(e.duration * 60 - 4, 26),
                          background: colors.bg,
                          borderLeft: `3px solid ${colors.border}`,
                          borderRadius: "var(--ih-r-sm)",
                          padding: "4px 8px",
                          cursor: "pointer",
                          zIndex: 1,
                          overflow: "hidden",
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: colors.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                          {e.duration >= 0.5 && <div className="ih-mono" style={{ fontSize: 9, color: colors.text, opacity: 0.7, marginTop: 2 }}>{e.subtitle}</div>}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Today's focus */}
          <div className="ih-card ih-card-pad" style={{ marginBottom: 14 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Today&apos;s focus</div>
            <div className="ih-serif" style={{ fontSize: 20, lineHeight: 1.15, marginBottom: 12 }}>
              2 calls. <span className="ih-italic-red">3h 15m</span> scheduled.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 12 }}>
              {[
                { label: "Meetings", value: "2", tone: "var(--ih-ink)" },
                { label: "Free time", value: "5h", tone: "var(--ih-ok)" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
                  <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
                  <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1, color: s.tone }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="ih-card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Upcoming &middot; this week</span>
            </div>
            {EVENTS.map((e, i) => {
              const colors = TYPE_COLORS[e.type]
              return (
                <div key={i} style={{ padding: "10px 16px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: colors.border, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{DAYS[e.day]} &middot; {e.startHour}:00</div>
                  </div>
                  <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 14, padding: "0 4px" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Event types</div>
            <div style={{ display: "grid", gap: 6 }}>
              {([
                ["discovery", "Discovery calls"],
                ["audit", "Audit sessions"],
                ["checkpoint", "Checkpoints & reviews"],
                ["internal", "Internal"],
              ] as [string, string][]).map(([type, label]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLORS[type].bg, border: `1.5px solid ${TYPE_COLORS[type].border}` }} />
                  <span style={{ color: "var(--ih-ink-65)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
