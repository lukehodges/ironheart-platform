"use client"

import { Icon } from "@/components/shell"

/* ── Demo data ──────────────────────────────────────────────────────────── */

const UPCOMING = [
  {
    id: "s1",
    title: "Sprint review",
    date: "Tue 13 May",
    time: "11:30",
    duration: "45 min",
    location: "Zoom",
    joinUrl: "#",
  },
  {
    id: "s2",
    title: "Stand-up",
    date: "Wed 14 May",
    time: "09:00",
    duration: "15 min",
    location: "Zoom",
    joinUrl: "#",
  },
  {
    id: "s3",
    title: "Stakeholder demo",
    date: "Fri 16 May",
    time: "15:00",
    duration: "60 min",
    location: "Google Meet",
    joinUrl: "#",
  },
]

const PAST = [
  { id: "p1", title: "Sprint 3 retro", date: "06 May 2026", hasNotes: true },
  { id: "p2", title: "Mid-sprint check-in", date: "29 Apr 2026", hasNotes: true },
  { id: "p3", title: "Sprint 3 review", date: "22 Apr 2026", hasNotes: true },
  { id: "p4", title: "Discovery workshop", date: "08 Apr 2026", hasNotes: false },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function SessionsPage() {
  return (
    <div style={{ padding: "40px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>Your sessions</h1>
          <p style={{ marginTop: 10, fontSize: 14, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
            {UPCOMING.length} upcoming &middot; {PAST.length} past
          </p>
        </div>
        <button className="ih-btn ih-btn-accent ih-btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={12} />
          Book a new session
        </button>
      </div>

      {/* Upcoming */}
      <div style={{ marginTop: 32 }}>
        <h2 className="ih-eyebrow" style={{ marginBottom: 16 }}>Upcoming</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {UPCOMING.map((s) => (
            <div key={s.id} className="ih-card" style={{ padding: "22px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {/* Date block */}
                  <div style={{ textAlign: "center", minWidth: 56 }}>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>
                      {s.date.split(" ")[0]}
                    </div>
                    <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 2 }}>
                      {s.date.split(" ")[1]}
                    </div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>
                      {s.date.split(" ")[2]}
                    </div>
                  </div>

                  <div style={{ width: 1, height: 40, background: "var(--ih-line)" }} />

                  {/* Details */}
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{s.title}</h3>
                    <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>
                        {s.time}
                      </span>
                      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>
                        {s.duration}
                      </span>
                      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>
                        {s.location}
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={s.joinUrl}
                  className="ih-btn ih-btn-accent ih-btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}
                >
                  <Icon name="arrowUpRight" size={11} />
                  Join
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past sessions */}
      <div style={{ marginTop: 40 }}>
        <h2 className="ih-eyebrow" style={{ marginBottom: 16 }}>Past sessions</h2>
        <div className="ih-card" style={{ overflow: "hidden" }}>
          {PAST.map((s, i) => (
            <div
              key={s.id}
              style={{
                padding: "14px 20px",
                borderTop: i === 0 ? "none" : "1px solid var(--ih-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="calendar" size={13} style={{ color: "var(--ih-ink-40)" }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</span>
                <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>{s.date}</span>
              </div>
              {s.hasNotes && (
                <button className="ih-btn ih-btn-ghost ih-btn-sm">View notes</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
