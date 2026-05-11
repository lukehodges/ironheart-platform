"use client"

import { Icon, type IconName } from "@/components/shell"

/* ── Data ───────────────────────────────────────────────────────────────── */

type Tone = "muted" | "info" | "warn" | "ok" | "accent"

interface Deal { name: string; sub: string; value: string; size: string; tone: Tone }
interface Stage { name: string; count: number; value: string; deals: Deal[] }

const STAGES: Stage[] = [
  { name: "New", count: 4, value: "$28k", deals: [
    { name: "Marlow Ltd", sub: "Discovery call booked", value: "$8k", size: "S", tone: "muted" },
    { name: "Pinewood", sub: "Inbound \u00b7 brief in /docs", value: "$6k", size: "S", tone: "muted" },
    { name: "Halftime", sub: "Referral \u00b7 cold", value: "$4k", size: "M", tone: "muted" },
    { name: "Veridian", sub: "Cold outreach reply", value: "$10k", size: "M", tone: "muted" },
  ]},
  { name: "Qualified", count: 7, value: "$64k", deals: [
    { name: "Olsen Brands", sub: "Kickoff today 14:00", value: "$12k", size: "M", tone: "accent" },
    { name: "Bramble Co.", sub: "Awaiting brief", value: "$9k", size: "M", tone: "info" },
    { name: "Stoneworks", sub: "Demo Thu", value: "$8k", size: "S", tone: "info" },
    { name: "Field Notes", sub: "NDA out", value: "$7k", size: "M", tone: "muted" },
  ]},
  { name: "Proposal", count: 5, value: "$58k", deals: [
    { name: "Cardinal", sub: "Sent Mon \u00b7 open rate 4", value: "$22k", size: "L", tone: "warn" },
    { name: "Lume", sub: "Negotiating scope", value: "$14k", size: "M", tone: "warn" },
    { name: "Hatch & Co", sub: "Verbal yes", value: "$12k", size: "M", tone: "warn" },
  ]},
  { name: "Won", count: 3, value: "$34k", deals: [
    { name: "Olsen Brands", sub: "kickoff today", value: "$12k", size: "M", tone: "ok" },
    { name: "Bramble Co.", sub: "engagement /eng_0489", value: "$9k", size: "M", tone: "ok" },
  ]},
]

const STAGE_TONES: Tone[] = ["muted", "info", "warn", "ok"]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function PipelinePage() {
  return (
    <div style={{ margin: "-24px -24px 0" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Q2 \u00b7 19 open deals</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32 }}>Pipeline. <span className="ih-italic-red">$184k</span> weighted.</h1>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: "1px solid var(--ih-line)", borderRadius: 999, fontSize: 11.5 }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>FORECAST \u00b7 MAY</span>
            <span className="ih-num" style={{ fontWeight: 500 }}>$72k</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ok)" }}>+12%</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="filter" size={12}/> All sources</button>
            <button className="ih-btn ih-btn-ghost ih-btn-sm">Assigned to me</button>
            <button className="ih-btn ih-btn-ghost ih-btn-sm">Group by</button>
          </div>
        </div>
      </div>

      {/* Stage strip */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 0, borderBottom: "1px solid var(--ih-line)", background: "var(--ih-surface-2)" }}>
        {STAGES.map((s, i) => (
          <div key={s.name} style={{ padding: "14px 16px", borderLeft: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`ih-dot ih-dot-${STAGE_TONES[i]}`}/>
                <strong style={{ fontSize: 12.5 }}>{s.name}</strong>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>\u00b7 {s.count}</span>
              </span>
              <button className="ih-btn ih-btn-quiet" style={{ width: 20, height: 20, padding: 0 }}><Icon name="plus" size={11}/></button>
            </div>
            <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 0, minHeight: 460 }}>
        {STAGES.map((s, si) => (
          <div key={s.name} style={{ padding: 14, borderLeft: si === 0 ? "0" : "1px solid var(--ih-line)", display: "grid", gap: 8, alignContent: "start" }}>
            {s.deals.map((d, j) => (
              <div key={j} className="ih-card" style={{ padding: 12, cursor: "grab", position: "relative" }}>
                {j === 0 && si === 1 && <span style={{ position: "absolute", top: 0, bottom: 0, left: -1, width: 2, background: "var(--ih-accent)", borderRadius: 1 }}/>}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: 12.5, fontWeight: 500 }}>{d.name}</strong>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{d.size}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", lineHeight: 1.4, marginBottom: 10 }}>{d.sub}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--ih-line)", paddingTop: 8 }}>
                  <span className="ih-num" style={{ fontWeight: 500, fontSize: 12 }}>{d.value}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div className="ih-avatar" style={{ width: 18, height: 18, fontSize: 8 }}>LH</div>
                    {j % 2 === 0 && <div className="ih-avatar" style={{ width: 18, height: 18, fontSize: 8 }}>SR</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Forecast strip */}
      <div style={{ padding: "20px 28px", borderTop: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 18 }}>
        {[
          { l: "Best case", v: "$248k", sub: "all open \u00b7 raw" },
          { l: "Weighted", v: "$184k", sub: "by stage probability" },
          { l: "Commit", v: "$72k", sub: "verbal yes + won", color: "var(--ih-ok)" },
          { l: "Velocity \u00b7 avg", v: "23", vSuffix: "d", sub: "new \u2192 won, last 90d" },
        ].map((s) => (
          <div key={s.l}>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{s.l}</div>
            <div className="ih-serif" style={{ fontSize: 24, color: s.color || "var(--ih-ink)" }}>
              {s.v}{s.vSuffix && <span style={{ fontSize: 14, color: "var(--ih-ink-40)" }}>{s.vSuffix}</span>}
            </div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
