"use client"

import { useState } from "react"
import Link from "next/link"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

const TEAM = [
  {
    name: "Luke Hodges", initials: "LH", role: "Owner & Lead Consultant", department: "Consulting",
    engagements: 6, hours: 32, maxHours: 40, availability: "available" as const,
    skills: ["Strategy", "Operations", "Leadership", "Workflow Design", "AI Integration"],
    email: "luke@ironheart.io", joined: "Jan 2024",
  },
  {
    name: "Sam Park", initials: "SP", role: "Ops Lead", department: "Operations",
    engagements: 2, hours: 6, maxHours: 40, availability: "available" as const,
    skills: ["Operations", "Process Design", "Client Onboarding", "Data Analysis"],
    email: "sam@ironheart.io", joined: "Mar 2024",
  },
]

const DEPARTMENTS = [
  { name: "Consulting", count: 1, color: "var(--ih-accent)" },
  { name: "Operations", count: 1, color: "var(--ih-info)" },
]

function availabilityDot(status: "available" | "busy" | "away") {
  if (status === "available") return "ih-dot-ok"
  if (status === "busy") return "ih-dot-warn"
  return "ih-dot-muted"
}

function availabilityLabel(status: "available" | "busy" | "away") {
  if (status === "available") return "Available"
  if (status === "busy") return "Busy"
  return "Away"
}

export default function TeamPage() {
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const totalEngagements = TEAM.reduce((s, m) => s + m.engagements, 0)
  const totalHours = TEAM.reduce((s, m) => s + m.hours, 0)
  const totalMaxHours = TEAM.reduce((s, m) => s + m.maxHours, 0)
  const utilization = totalMaxHours > 0 ? Math.round((totalHours / totalMaxHours) * 1000) / 10 : 0

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Team &middot; workspace</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>
            Your team. <span className="ih-italic-red">{TEAM.length}</span> active.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setToast({message: "Add team member form coming soon", tone: "info"})}><Icon name="plus" size={12} /> Add team member</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { l: "Team Size", v: String(TEAM.length), d: "", h: "active members", icon: "users" as const },
          { l: "Active Engagements", v: String(totalEngagements), d: "", h: "across team", icon: "handshake" as const },
          { l: "Hours This Week", v: `${totalHours}/${totalMaxHours}h`, d: "", h: "logged / capacity", icon: "clock" as const },
          { l: "Utilization", v: `${utilization}%`, d: "", h: "team average", icon: "chart" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)" }}>
              {s.h}
            </div>
          </div>
        ))}
      </div>

      {/* Team grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 28 }}>
        {TEAM.map((m) => (
          <div key={m.name} className="ih-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div className="ih-avatar" style={{ width: 56, height: 56, fontSize: 18, flexShrink: 0 }}>{m.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span className="ih-serif" style={{ fontSize: 20 }}>{m.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className={`ih-dot ${availabilityDot(m.availability)}`} />
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{availabilityLabel(m.availability)}</span>
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", marginBottom: 10 }}>
                  {m.role}
                  <span style={{ margin: "0 6px", color: "var(--ih-ink-30)" }}>&middot;</span>
                  <span style={{ padding: "2px 8px", borderRadius: 9999, background: "var(--ih-surface-2)", fontSize: 10.5, fontWeight: 500 }}>{m.department}</span>
                </div>

                {/* Quick stats */}
                <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                  <div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginBottom: 2 }}>Engagements</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{m.engagements}</div>
                  </div>
                  <div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginBottom: 2 }}>Hours/week</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{m.hours}<span style={{ color: "var(--ih-ink-40)", fontWeight: 400, fontSize: 12 }}>/{m.maxHours}h</span></div>
                  </div>
                  <div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginBottom: 2 }}>Utilization</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 48, height: 4, background: "var(--ih-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((m.hours / m.maxHours) * 100)}%`, height: "100%", background: "var(--ih-ink)" }} />
                      </div>
                      <span className="ih-mono" style={{ fontSize: 11 }}>{Math.round((m.hours / m.maxHours) * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                  {m.skills.map((sk) => (
                    <span key={sk} style={{ padding: "2px 8px", borderRadius: 9999, background: "var(--ih-surface-2)", fontSize: 10.5, color: "var(--ih-ink-65)" }}>{sk}</span>
                  ))}
                </div>

                <Link href={`/admin/team/${m.initials.toLowerCase()}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ height: 26, fontSize: 11, textDecoration: "none" }}>
                  View profile <Icon name="arrowRight" size={10} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Departments */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span className="ih-eyebrow">Structure</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Departments</h3>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {DEPARTMENTS.map((d) => (
            <div key={d.name} className="ih-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: d.color, opacity: 0.15, position: "relative" }}>
                <Icon name="building" size={16} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: d.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                <div className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>{d.count} member{d.count !== 1 ? "s" : ""}</div>
              </div>
              <Icon name="chevronRight" size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
          ))}
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
