"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"

const ACTIVITY = [
  { time: "09:42", icon: "money" as const, tone: "ok",      who: "Stripe",     verb: "received payment from", obj: "Acme Studios", amt: "$4,200", trail: "/inv_2039 · paid in full", href: "/platform/payments/inv_2039", source: "Invoices" },
  { time: "09:28", icon: "bolt" as const,  tone: "info",    who: "Workflow",   verb: "ran",                  obj: "Send onboarding · Olsen", amt: "23 steps", trail: "/wf_204 · 1.4s", href: "/platform/workflows/wf_204", source: "Workflows" },
  { time: "08:51", icon: "check" as const, tone: "ok",      who: "Mira (you)", verb: "approved",             obj: "Q2 retainer brief · Northwind", amt: "",        trail: "/eng_0481 · note added", href: "/platform/clients/eng_0481", source: "Approvals" },
  { time: "08:33", icon: "chat" as const,  tone: "muted",   who: "Portal",     verb: "comment from",         obj: "Jamie at Westfield",      amt: "",         trail: "design review · 1 reply pending", href: "/platform/inbox", source: "Bookings" },
  { time: "07:14", icon: "x" as const,     tone: "danger",  who: "Stripe sync",verb: "failed on",            obj: "rate limit · resume?",    amt: "12 queued", trail: "/wf_887 · auto‑retry off", href: "/platform/workflows/wf_887", source: "Workflows" },
  { time: "Mon",   icon: "file" as const,  tone: "muted",   who: "Form",       verb: "new submission ·",     obj: "Discovery / leadership",  amt: "",         trail: "/form_intake · routed to pipeline", href: "/platform/forms", source: "Bookings" },
  { time: "Mon",   icon: "user" as const,  tone: "info",    who: "Pipeline",   verb: "deal moved to",        obj: "Won · Olsen Brands",      amt: "$12k",     trail: "/deal_443 · engagement auto‑created", href: "/platform/pipeline/deal_443", source: "Bookings" },
]

const ACTIVITY_TABS = ["All", "Bookings", "Workflows", "Invoices", "Approvals"]

export default function DashboardPage() {
  const router = useRouter()
  const [activityTab, setActivityTab] = useState(0)

  const filteredActivity = useMemo(() => {
    const tabLabel = ACTIVITY_TABS[activityTab]
    if (tabLabel === "All") return ACTIVITY
    return ACTIVITY.filter(r => r.source === tabLabel)
  }, [activityTab])

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Hero greeting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Tuesday &middot; 12 May &middot; week 20 <span style={{ color: "var(--ih-accent)", marginLeft: 8 }}>★</span></div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>
            Morning Luke. <span className="ih-italic-red">Three</span> things matter today.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="calendar" size={12}/> May</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="filter" size={12}/> All clients</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={12}/></button>
        </div>
      </div>

      {/* The three things */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { rank: 1, kind: "Approvals", title: "Acme final invoice", body: "Sarah's been chasing for 2 days. Sign or push back today or it slips into next sprint.", action: "Review · $14.2k", tone: "accent" as const, meta: "/inv_2041 · 4hrs ago", href: "/platform/payments/inv_2041" },
          { rank: 2, kind: "Bookings",  title: "Olsen kickoff at 14:00", body: "Discovery call. Brief is in /docs. Prep doc auto‑drafted by copilot — open to review.", action: "Open prep doc", tone: "ink" as const, meta: "in 5h 12m", href: "/platform/bookings/bk_olsen" },
          { rank: 3, kind: "Workflow",  title: "Stripe sync paused", body: "Run /wf_887 stopped on rate limit at 06:14. 12 invoices queued behind it.", action: "Resume run", tone: "warn" as const, meta: "/wf_887 · stripe", href: "/platform/workflows/wf_887" },
        ].map((t) => (
          <div key={t.rank} className="ih-card" style={{ padding: 18, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="ih-mono" style={{ fontSize: 28, color: "var(--ih-ink-30)", lineHeight: 1 }}>/0{t.rank}</span>
              <div style={{ flex: 1 }}>
                <span className="ih-eyebrow">{t.kind}</span>
              </div>
              <Icon name="moreH" size={14} style={{ color: "var(--ih-ink-40)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 20, lineHeight: 1.1, marginBottom: 8 }}>{t.title}</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5, minHeight: 56 }}>{t.body}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--ih-line)" }}>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{t.meta}</span>
              <Link href={t.href} className={`ih-btn ${t.tone === "accent" ? "ih-btn-accent" : t.tone === "warn" ? "ih-btn-ghost" : "ih-btn-primary"} ih-btn-sm`} style={{ textDecoration: "none" }}>
                {t.action} <Icon name="arrowRight" size={11}/>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Drillable stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { l: "Active engagements", v: "08", d: "+1", h: "this month", icon: "handshake" as const, href: "/platform/clients?stage=active" },
          { l: "Bookings · 7d",      v: "23", d: "+4", h: "vs last 7d",  icon: "calendar" as const, href: "/platform/bookings" },
          { l: "Pipeline value",     v: "$184k", d: "−2.1%", h: "MRR equiv", icon: "pipeline" as const, href: "/platform/pipeline" },
          { l: "Hours saved · auto", v: "192h", d: "+38h", h: "this month", icon: "bolt" as const, href: "/platform/workflows" },
          { l: "Outstanding inv.",   v: "$28.4k", d: "3 over", h: "due >7d", icon: "invoice" as const, href: "/platform/payments?status=outstanding" },
        ].map((s) => (
          <Link key={s.l} href={s.href} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: s.d.startsWith("+") ? "var(--ih-ok)" : "var(--ih-accent)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
              <span style={{ marginLeft: "auto", color: "var(--ih-ink-30)" }}>↗</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column: Activity stream + Today's schedule */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 28 }}>
        {/* Activity stream */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="ih-eyebrow">Cross‑module activity</span>
              <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>The pulse</h3>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {ACTIVITY_TABS.map((t, i) => (
                <button key={t} onClick={() => setActivityTab(i)} className={`ih-btn ${i===activityTab?"ih-btn-ghost":"ih-btn-quiet"} ih-btn-sm`} style={{ height: 22, fontSize: 11 }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            {filteredActivity.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>No activity in this category.</div>
            ) : null}
            {filteredActivity.map((row, i) => (
              <Link key={i} href={row.href} style={{ display: "grid", gridTemplateColumns: "44px 26px 1fr auto", gap: 10, alignItems: "center", padding: "10px 18px", borderBottom: i === filteredActivity.length - 1 ? "0" : "1px solid var(--ih-line)", textDecoration: "none", color: "inherit" }}>
                <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-40)" }}>{row.time}</span>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: row.tone === "accent" ? "var(--ih-accent-soft)" : row.tone === "ok" ? "var(--ih-ok-soft)" : row.tone === "warn" ? "var(--ih-warn-soft)" : row.tone === "info" ? "var(--ih-info-soft)" : row.tone === "danger" ? "var(--ih-danger-soft)" : "var(--ih-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: row.tone === "ok" ? "var(--ih-ok)" : row.tone === "warn" ? "var(--ih-warn)" : row.tone === "info" ? "var(--ih-info)" : row.tone === "danger" ? "var(--ih-danger)" : "var(--ih-ink-50)" }}>
                  <Icon name={row.icon} size={11} stroke={2}/>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.4, minWidth: 0 }}>
                  <strong style={{ fontWeight: 500 }}>{row.who}</strong>
                  <span style={{ color: "var(--ih-ink-65)" }}> {row.verb} </span>
                  <span style={{ borderBottom: "1px dashed var(--ih-line-2)" }}>{row.obj}</span>
                  {row.amt && <span className="ih-mono" style={{ color: "var(--ih-ink-50)", marginLeft: 8, fontSize: 11 }}>· {row.amt}</span>}
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{row.trail}</div>
                </div>
                <Icon name="arrowUpRight" size={12} style={{ color: "var(--ih-ink-30)" }}/>
              </Link>
            ))}
          </div>
          <div style={{ padding: "10px 18px", textAlign: "center" }}>
            <Link href="/platform/audit" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>View full timeline →</Link>
          </div>
        </div>

        {/* Today */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Today · 12 May</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Schedule</h3>
          </div>
          <div style={{ padding: "8px 0" }}>
            {[
              { time: "10:00", dur: "30m", title: "Stand‑up · internal", tag: "team", tone: "muted", live: false, sub: "Mira, Sam", href: "/platform/bookings/bk_standup" },
              { time: "11:30", dur: "45m", title: "Northwind · review", tag: "engagement", tone: "info", live: false, sub: "Q2 deliverables, /eng_0481", href: "/platform/bookings/bk_0913" },
              { time: "14:00", dur: "60m", title: "Olsen Brands · kickoff", tag: "booking", tone: "accent", live: true, sub: "Discovery / leadership · 3 attendees", href: "/platform/bookings/bk_olsen" },
              { time: "16:00", dur: "20m", title: "Acme · invoice review", tag: "invoice", tone: "warn", live: false, sub: "/inv_2041 · $14.2k", href: "/platform/bookings/bk_acme_inv" },
            ].map((b, i) => (
              <Link key={i} href={b.href} style={{ padding: "10px 18px", display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 12, alignItems: "center", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", position: "relative", textDecoration: "none", color: "inherit" }}>
                {b.live && <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 2, background: "var(--ih-accent)" }}/>}
                <div>
                  <div className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>{b.time}</div>
                  <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{b.dur}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {b.title}
                    {b.live && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8, padding: "2px 5px" }}><span className="ih-dot ih-dot-accent" /> next</span>}
                  </div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>{b.sub}</div>
                </div>
                <Icon name="chevronRight" size={12} style={{ color: "var(--ih-ink-30)" }}/>
              </Link>
            ))}
          </div>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>4 events · 2h 35m scheduled</span>
            <Link href="/platform/calendar" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>Open calendar →</Link>
          </div>
        </div>
      </div>

      {/* Bottom row: Active engagements + Pipeline mini + Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.9fr", gap: 14 }}>
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between" }}>
            <div><span className="ih-eyebrow">Active</span><h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Engagements</h3></div>
            <Link href="/platform/clients?stage=active" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>All 8 →</Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--ih-surface-2)" }}>
                {["Client", "Stage", "Hours", "Burn", "Next", ""].map(h => <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {([
                ["Northwind",  "Q2 retainer", "Sprint 4", "32/40h", 78, "Tue · review",   "ok", "c-northwind"],
                ["Olsen Brands","Kickoff",    "Discovery","6/30h",  20, "Today · 14:00",  "accent", "c-olsen"],
                ["Westfield",  "Build",       "Sprint 2", "48/60h", 80, "Thu · standup",  "info", "c-westfield"],
                ["Halcyon",    "Audit",       "Wrap",     "78/80h", 97, "Fri · handoff",  "warn", "c-halcyon"],
                ["Acme Studios","Retainer",   "Month 3",  "22/40h", 55, "Mon · invoice",  "ok", "c-acme"],
              ] as [string, string, string, string, number, string, string, string][]).map((row, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer" }} onClick={() => router.push(`/platform/clients/${row[7]}`)}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{(row[0] as string).split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                      <strong style={{ fontSize: 12.5, fontWeight: 500 }}>{row[0]}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--ih-ink-65)" }}>{row[1]}</td>
                  <td style={{ padding: "10px 14px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{row[2]}</span></td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 4, background: "var(--ih-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: row[4]+"%", height: "100%", background: row[6]==="warn"?"var(--ih-warn)": row[6]==="accent"?"var(--ih-accent)":"var(--ih-ink)" }}/>
                      </div>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{row[3]}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{row[5]}</span></td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}><Icon name="chevronRight" size={12} style={{ color: "var(--ih-ink-30)" }}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Pipeline</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>This quarter</h3>
          </div>
          <div style={{ padding: 18 }}>
            {([
              ["New",       "$28k", 4, 20, "muted"],
              ["Qualified", "$64k", 7, 40, "info"],
              ["Proposal",  "$58k", 5, 70, "warn"],
              ["Won",       "$34k", 3, 95, "ok"],
            ] as [string, string, number, number, string][]).map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className={`ih-dot ih-dot-${s[4]}`}/> {s[0]} <span className="ih-mono" style={{ color: "var(--ih-ink-40)" }}>· {s[2]}</span></span>
                  <span className="ih-mono" style={{ fontWeight: 500 }}>{s[1]}</span>
                </div>
                <div style={{ height: 6, background: "var(--ih-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: s[3]+"%", height: "100%", background: s[4]==="ok"?"var(--ih-ok)":s[4]==="warn"?"var(--ih-warn)":s[4]==="info"?"var(--ih-info)":"var(--ih-ink-30)" }}/>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="ih-eyebrow">Weighted</span>
              <span className="ih-serif" style={{ fontSize: 22 }}>$184<span style={{ color: "var(--ih-ink-40)" }}>k</span></span>
            </div>
          </div>
        </div>

        <div className="ih-card ih-card-pad">
          <span className="ih-eyebrow">Quick actions</span>
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {([
              ["plus","Create booking","B", "/platform/bookings/new"],
              ["plus","New client","C", "/platform/clients/new"],
              ["plus","Draft invoice","I", "/platform/payments/new"],
              ["workflow","Run workflow","W", "/platform/workflows"],
              ["sparkles","Ask copilot",".", "/platform/ai-chat"],
              ["search","Search anything","K", "/platform"],
            ] as [string, string, string, string][]).map(([icon, label, key, href]) => (
              <Link key={label} href={href} className="ih-btn ih-btn-ghost" style={{ height: 32, justifyContent: "flex-start", padding: "0 10px", textDecoration: "none" }}>
                <Icon name={icon as "plus" | "workflow" | "sparkles" | "search"} size={13} style={{ color: icon==="sparkles" ? "var(--ih-accent)" : "var(--ih-ink-50)" }}/>
                <span style={{ flex: 1, textAlign: "left", fontWeight: 400, fontSize: 12 }}>{label}</span>
                <span className="ih-kbd">⌘{key}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
