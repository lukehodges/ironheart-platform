"use client"

import { useState } from "react"
import Link from "next/link"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

const MEMBER = {
  name: "Luke Hodges", initials: "LH", role: "Owner & Lead Consultant", department: "Consulting",
  email: "luke@ironheart.io", phone: "+44 7700 900123", joined: "Jan 2024",
  engagements: [
    { client: "Northwind", title: "Q2 retainer", stage: "Sprint 4", status: "active" as const },
    { client: "Acme Studios", title: "Q2 retainer", stage: "Month 3", status: "active" as const },
    { client: "Olsen Brands", title: "Kickoff", stage: "Discovery", status: "active" as const },
    { client: "Vellum & Co.", title: "Portal rebuild", stage: "Sprint 2", status: "active" as const },
    { client: "Sea Glass Studio", title: "Discovery scoping", stage: "Proposal", status: "active" as const },
    { client: "Brigham Architects", title: "Workflow rebuild", stage: "Paused", status: "paused" as const },
  ],
  skills: [
    { name: "Strategy", level: "Expert" }, { name: "Operations", level: "Expert" },
    { name: "Leadership Coaching", level: "Advanced" }, { name: "Workflow Design", level: "Expert" },
    { name: "AI Integration", level: "Advanced" }, { name: "Change Management", level: "Intermediate" },
    { name: "Financial Analysis", level: "Intermediate" },
  ],
  weeklyHours: [
    { week: "W17", hours: 28 }, { week: "W18", hours: 34 }, { week: "W19", hours: 30 }, { week: "W20", hours: 32 },
  ],
  upcomingBookings: [
    { time: "Tue 10:00", title: "Stand-up", client: "Internal", dur: "30m" },
    { time: "Tue 11:30", title: "Sprint review", client: "Northwind", dur: "45m" },
    { time: "Tue 14:00", title: "Kickoff", client: "Olsen Brands", dur: "60m" },
    { time: "Tue 16:00", title: "Invoice review", client: "Acme Studios", dur: "20m" },
  ],
}

const TABS = ["Overview", "Engagements", "Availability", "Skills", "Notes"] as const
type Tab = typeof TABS[number]

const AVAIL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const AVAIL_HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
const BUSY_SLOTS: Record<string, string[]> = {
  Tue: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  Wed: ["09:00", "14:00"],
  Thu: ["10:00"],
  Fri: ["15:00", "16:00"],
}

function levelColor(level: string) {
  if (level === "Expert") return { bg: "var(--ih-ok-soft)", color: "var(--ih-ok)" }
  if (level === "Advanced") return { bg: "var(--ih-info-soft)", color: "var(--ih-info)" }
  return { bg: "var(--ih-surface-2)", color: "var(--ih-ink-50)" }
}

export default function TeamMemberDetailPage() {
  const [tab, setTab] = useState<Tab>("Overview")
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const m = MEMBER
  const maxHrs = 40

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Back */}
      <Link href="/admin/team" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ih-ink-50)", textDecoration: "none", marginBottom: 18 }}>
        <Icon name="chevronLeft" size={12} /> Team
      </Link>

      {/* Entity header */}
      <div className="ih-card" style={{ padding: 22, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div className="ih-avatar" style={{ width: 64, height: 64, fontSize: 22, flexShrink: 0 }}>{m.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 className="ih-serif" style={{ margin: 0, fontSize: 28 }}>{m.name}</h1>
              <span style={{ padding: "2px 8px", borderRadius: 9999, background: "var(--ih-surface-2)", fontSize: 11, fontWeight: 500 }}>{m.department}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--ih-ink-65)", marginBottom: 10 }}>{m.role}</div>
            <div style={{ display: "flex", gap: 18, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="mail" size={11} /> {m.email}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="phone" size={11} /> {m.phone}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="calendar" size={11} /> Joined {m.joined}</span>
            </div>
          </div>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Profile updated", tone: "ok"})}><Icon name="sliders" size={12} /> Edit</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`ih-btn ${tab === t ? "ih-btn-ghost" : "ih-btn-quiet"} ih-btn-sm`}
            style={{ height: 30, fontSize: 12, fontWeight: tab === t ? 500 : 400 }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Active engagements */}
          <div className="ih-card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Active</span>
              <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Engagements</h3>
            </div>
            <div>
              {m.engagements.filter((e) => e.status === "active").map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
                  <div className="ih-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{e.client.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.client}</div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{e.title} &middot; {e.stage}</div>
                  </div>
                  <span className={`ih-dot ${e.status === "active" ? "ih-dot-ok" : "ih-dot-warn"}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Hours chart */}
          <div className="ih-card" style={{ padding: 18 }}>
            <span className="ih-eyebrow">Logged</span>
            <h3 style={{ margin: "2px 0 12px", fontSize: 15, fontWeight: 600 }}>Hours &middot; last 4 weeks</h3>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 120 }}>
              {m.weeklyHours.map((w) => (
                <div key={w.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span className="ih-mono" style={{ fontSize: 10, fontWeight: 500 }}>{w.hours}h</span>
                  <div style={{ width: "100%", background: "var(--ih-surface-2)", borderRadius: 4, overflow: "hidden", height: 90 }}>
                    <div style={{ height: `${(w.hours / maxHrs) * 100}%`, background: "var(--ih-ink)", borderRadius: 4, marginTop: "auto", position: "relative", top: `${100 - (w.hours / maxHrs) * 100}%` }} />
                  </div>
                  <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{w.week}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming bookings */}
          <div className="ih-card" style={{ gridColumn: "1 / -1" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">This week</span>
              <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Upcoming bookings</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {m.upcomingBookings.map((b, i) => (
                <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid var(--ih-line)" : "none" }}>
                  <div className="ih-mono" style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>{b.time}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{b.client} &middot; {b.dur}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Engagements" && (
        <div className="ih-card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--ih-surface-2)" }}>
                {["Client", "Engagement", "Stage", "Status"].map((h) => (
                  <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.engagements.map((e, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--ih-line)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{e.client.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
                      <span style={{ fontWeight: 500 }}>{e.client}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--ih-ink-65)" }}>{e.title}</td>
                  <td style={{ padding: "10px 14px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{e.stage}</span></td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className={`ih-dot ${e.status === "active" ? "ih-dot-ok" : "ih-dot-warn"}`} />
                      <span style={{ fontSize: 11 }}>{e.status === "active" ? "Active" : "Paused"}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Availability" && (
        <div className="ih-card" style={{ padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Weekly availability</h3>
          <div style={{ display: "grid", gridTemplateColumns: "50px repeat(5, 1fr)", gap: 2 }}>
            {/* Header row */}
            <div />
            {AVAIL_DAYS.map((d) => (
              <div key={d} className="ih-mono" style={{ textAlign: "center", fontSize: 10, fontWeight: 500, padding: "4px 0", color: "var(--ih-ink-50)" }}>{d}</div>
            ))}
            {/* Time rows */}
            {AVAIL_HOURS.map((hour) => (
              <>
                <div key={hour} className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", paddingTop: 4, textAlign: "right", paddingRight: 8 }}>{hour}</div>
                {AVAIL_DAYS.map((day) => {
                  const isBusy = BUSY_SLOTS[day]?.includes(hour)
                  return (
                    <div
                      key={`${day}-${hour}`}
                      style={{
                        height: 24, borderRadius: 4,
                        background: isBusy ? "var(--ih-accent-soft)" : "var(--ih-surface-2)",
                        border: isBusy ? "1px solid var(--ih-accent)" : "1px solid var(--ih-line)",
                        opacity: isBusy ? 1 : 0.6,
                      }}
                    />
                  )
                })}
              </>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 10.5, color: "var(--ih-ink-50)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ih-accent-soft)", border: "1px solid var(--ih-accent)" }} /> Booked</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)" }} /> Available</span>
          </div>
        </div>
      )}

      {tab === "Skills" && (
        <div className="ih-card" style={{ padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Skills &amp; proficiency</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {m.skills.map((sk) => {
              const lc = levelColor(sk.level)
              return (
                <div key={sk.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9999, background: lc.bg, border: `1px solid ${lc.color}20` }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{sk.name}</span>
                  <span style={{ fontSize: 10, color: lc.color, fontWeight: 500 }}>{sk.level}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === "Notes" && (
        <div className="ih-card" style={{ padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Notes</h3>
          <div style={{ padding: 14, background: "var(--ih-surface-2)", borderRadius: 8, minHeight: 120 }}>
            <p style={{ fontSize: 12.5, color: "var(--ih-ink-65)", margin: 0, lineHeight: 1.6 }}>
              Luke is the founder and primary consultant. Manages all client relationships and handles strategy, operations, and leadership coaching engagements.
              Prefers morning slots for deep work and client calls in the afternoon. Currently at 80% utilization — room for one more retainer.
            </p>
          </div>
        </div>
      )}
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
