"use client"

import Link from "next/link"
import { Icon } from "@/components/shell"

/* ── Data ───────────────────────────────────────────────────────────────── */

type Tone = "muted" | "info" | "accent" | "warn"

interface Booking { time: string; dur: string; title: string; sub: string; tone: Tone; tag: string }

const TODAY: (Booking & { id: string })[] = [
  { id: "bk_standup", time: "10:00", dur: "30m", title: "Stand-up · internal",         sub: "Mira, Sam",                       tone: "muted",  tag: "internal" },
  { id: "bk_0913",    time: "11:30", dur: "45m", title: "Northwind · sprint review",   sub: "Mira Sato · Zoom",                  tone: "info",   tag: "engagement" },
  { id: "bk_olsen",   time: "14:00", dur: "60m", title: "Olsen Brands · kickoff",      sub: "3 attendees · discovery",            tone: "accent", tag: "booking" },
  { id: "bk_acme_inv",time: "16:00", dur: "20m", title: "Acme · invoice review",       sub: "Sarah Rowe · /inv_2041",            tone: "warn",   tag: "invoice" },
]

const TOMORROW: (Booking & { id: string })[] = [
  { id: "bk_standup2",time: "09:00", dur: "30m", title: "Stand-up · internal",         sub: "Mira, Sam",                       tone: "muted",  tag: "internal" },
  { id: "bk_0914",    time: "11:30", dur: "45m", title: "Northwind · sprint review",   sub: "Mira Sato · Zoom",                  tone: "info",   tag: "engagement" },
]

const LATER: (Booking & { id: string })[] = [
  { id: "bk_standup3",time: "10:00", dur: "30m", title: "Stand-up · internal",         sub: "Mira, Sam",                       tone: "muted",  tag: "internal" },
  { id: "bk_nw_demo", time: "15:00", dur: "45m", title: "Stakeholder demo",              sub: "Northwind HQ",                    tone: "accent", tag: "booking" },
]

const GROUPS = [
  { label: "Today · Tue 12", items: TODAY },
  { label: "Tomorrow · Wed 13", items: TOMORROW },
  { label: "Later · Thu 14 +", items: LATER },
]

function toneColor(t: Tone): string {
  return t === "accent" ? "var(--ih-accent)" : t === "warn" ? "var(--ih-warn)" : t === "info" ? "var(--ih-info)" : "var(--ih-ink-30)"
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function BookingsPage() {
  return (
    <div style={{ margin: "-24px -24px 0" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>This week · 23 bookings <span style={{ color: "var(--ih-accent)", marginLeft: 8 }}>★ Demo data</span></div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32 }}>Bookings. <span className="ih-italic-red">Tuesday</span>, 12 May.</h1>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ background: "var(--ih-surface)" }}><Icon name="list" size={11}/></button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="calendar" size={11}/></button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="grid" size={11}/></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", height: "calc(100vh - 216px)" }}>
        {/* List */}
        <div style={{ overflowY: "auto" }} className="scrollbar-thin">
          {GROUPS.map((group, gi) => (
            <div key={group.label}>
              <div className="ih-eyebrow" style={{ padding: "16px 24px 6px" }}>{group.label}</div>
              {group.items.map((b, i) => {
                const isHighlight = gi === 0 && i === 2
                return (
                  <Link key={i} href={`/platform/bookings/${b.id}`} style={{
                    padding: "12px 24px", borderTop: "1px solid var(--ih-line)",
                    display: "grid", gridTemplateColumns: "60px 1fr auto auto", gap: 14, alignItems: "center",
                    background: isHighlight ? "var(--ih-accent-soft-2)" : "transparent",
                    borderLeft: isHighlight ? "2px solid var(--ih-accent)" : "2px solid transparent",
                    textDecoration: "none", color: "inherit",
                  }}>
                    <div>
                      <div className="ih-mono" style={{ fontSize: 13, fontWeight: 500 }}>{b.time}</div>
                      <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{b.dur}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 2 }}>{b.sub}</div>
                    </div>
                    <span className={`ih-pill ${b.tone !== "muted" ? `ih-pill-${b.tone}` : ""}`} style={{ fontSize: 9 }}>{b.tag}</span>
                    <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }}/>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Right: day rail */}
        <div style={{ borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", overflowY: "auto", padding: 18 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 12 }}>Day · 12 May</div>
          <div style={{ position: "relative", height: 480, background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: 8, overflow: "hidden" }}>
            {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((h, i) => (
              <div key={h} style={{ position: "absolute", top: i * 52, left: 0, right: 0, height: 52, borderBottom: "1px solid var(--ih-line)", paddingLeft: 38 }}>
                <span className="ih-mono" style={{ position: "absolute", left: 6, top: 4, fontSize: 9, color: "var(--ih-ink-40)" }}>{h}:00</span>
              </div>
            ))}
            {/* Events */}
            {[
              { top: 56,  h: 26, title: "Stand-up",          tone: "muted" as Tone, at: "10:00 · 30m" },
              { top: 134, h: 38, title: "Northwind review",   tone: "info" as Tone,  at: "11:30 · 45m" },
              { top: 264, h: 52, title: "Olsen kickoff",      tone: "accent" as Tone, at: "14:00 · 60m" },
              { top: 372, h: 18, title: "Acme invoice",       tone: "warn" as Tone,  at: "16:00 · 20m" },
            ].map((e, i) => (
              <div key={i} style={{
                position: "absolute", top: e.top, left: 44, right: 12, height: e.h,
                borderRadius: 6, padding: "5px 8px", fontSize: 10.5,
                background: e.tone === "accent" ? "var(--ih-accent-soft)" : e.tone === "warn" ? "var(--ih-warn-soft)" : e.tone === "info" ? "var(--ih-info-soft)" : "var(--ih-surface-2)",
                borderLeft: `3px solid ${toneColor(e.tone)}`,
                overflow: "hidden",
              }}>
                <div style={{ fontWeight: 500 }}>{e.title}</div>
                <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-50)" }}>{e.at}</div>
              </div>
            ))}
            {/* Now line */}
            <div style={{ position: "absolute", top: 156, left: 36, right: 0, height: 1, background: "var(--ih-accent)" }}>
              <div style={{ position: "absolute", left: -6, top: -4, width: 8, height: 8, background: "var(--ih-accent)", borderRadius: 999 }}/>
            </div>
          </div>

          <div className="ih-card ih-card-pad" style={{ marginTop: 14, padding: 14, background: "var(--ih-surface)" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>AI prep · next session</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>
              <strong>Olsen kickoff</strong> in 5h 12m. I drafted a discovery script, pulled their brief from /docs and surfaced 3 risk areas. <span style={{ color: "var(--ih-accent)", cursor: "pointer" }}>Open prep doc →</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
