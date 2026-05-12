"use client"

import { useState, useMemo } from "react"
import { Icon, type IconName } from "@/components/shell"

/* ── Data ───────────────────────────────────────────────────────────────── */

type Tone = "accent" | "warn" | "info" | "ok" | "muted"

interface InboxItem {
  group?: string
  tone?: Tone
  icon?: IconName
  source?: string
  who?: string
  body?: string
  meta?: string
  unread?: boolean
  selected?: boolean
}

const ITEMS: InboxItem[] = [
  { group: "Needs you · 3" },
  { tone: "accent",  icon: "check",    source: "Approval",     who: "Sarah at Acme",        body: "Approve Q2 final invoice · $14,200",                      meta: "/inv_2041 · 4h ago", unread: true,  selected: true },
  { tone: "warn",    icon: "bolt",     source: "Workflow",      who: "Stripe sync",          body: "Run paused — rate limit. 12 invoices queued.",            meta: "/wf_887 · 3h ago",   unread: true },
  { tone: "info",    icon: "chat",     source: "Portal reply",  who: "Jamie at Westfield",   body: "\"The portal copy looks great but can we tighten…\"",   meta: "design review · 2h ago", unread: true },
  { group: "Today" },
  { tone: "ok",      icon: "money",    source: "Payment",       who: "Stripe",               body: "Acme Studios paid $4,200",                                meta: "/inv_2039 · 09:42",  unread: false },
  { tone: "muted",   icon: "audit",    source: "Audit",         who: "you",                  body: "Logged into platform admin",                              meta: "ip 82.34.21.4 · 08:14", unread: false },
  { tone: "info",    icon: "user",     source: "Pipeline",      who: "Pipeline",             body: "Deal moved to Won · Olsen Brands · $12k",                 meta: "/deal_443 · auto‑engagement created", unread: false },
  { tone: "ok",      icon: "star",     source: "Review",        who: "Mira at Northwind",    body: "Left a 5★ for sprint 3 demo",                             meta: "/review_88 · Sun", unread: false },
  { group: "Yesterday" },
  { tone: "muted",   icon: "file",     source: "Form",          who: "Form",                 body: "New submission · Discovery intake",                        meta: "/form_intake · routed to pipeline", unread: false },
  { tone: "info",    icon: "calendar", source: "Booking",       who: "Northwind",            body: "Booked sprint review · Tue 11:30",                        meta: "/bk_2204 · Mon", unread: false },
  { tone: "ok",      icon: "workflow", source: "Workflow",      who: "Monthly digest",       body: "Sent 8 client digests successfully",                      meta: "/wf_310 · Sun 09:00", unread: false },
]

function toneColor(t: Tone): string {
  return t === "accent" ? "var(--ih-accent)" : t === "warn" ? "var(--ih-warn)" : t === "info" ? "var(--ih-info)" : t === "ok" ? "var(--ih-ok)" : "var(--ih-ink-40)"
}

/* ── Page ───────────────────────────────────────────────────────────────── */

type FilterType = "all" | "unread" | "mentions" | "assigned" | string

export default function InboxPage() {
  const [selectedIdx, setSelectedIdx] = useState(1)
  const [filter, setFilter] = useState<FilterType>("all")

  const filteredItems = useMemo(() => {
    return ITEMS.filter(r => {
      if (r.group) return true // always show group headers
      switch (filter) {
        case "all": return true
        case "unread": return r.unread === true
        case "mentions": return r.body?.includes("\"") || false // portal replies with quotes
        case "assigned": return r.source === "Approval" || r.source === "Workflow" // assigned to me
        // Source filters
        case "Approvals": return r.source === "Approval"
        case "Portal replies": return r.source === "Portal reply"
        case "Workflow events": return r.source === "Workflow"
        case "Payment events": return r.source === "Payment"
        case "Audit alerts": return r.source === "Audit"
        case "Reviews": return r.source === "Review"
        // Client filters
        case "Northwind": return r.who?.includes("Northwind") || r.body?.includes("Northwind") || false
        case "Acme": return r.who?.includes("Acme") || r.body?.includes("Acme") || false
        case "Olsen": return r.who?.includes("Olsen") || r.body?.includes("Olsen") || false
        case "Westfield": return r.who?.includes("Westfield") || r.body?.includes("Westfield") || false
        case "Halcyon": return r.who?.includes("Halcyon") || r.body?.includes("Halcyon") || false
        default: return true
      }
    }).filter((r, i, arr) => {
      // Remove group headers that have no items after them
      if (!r.group) return true
      const nextIdx = arr.indexOf(r) + 1
      return nextIdx < arr.length && !arr[nextIdx]?.group
    })
  }, [filter])

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 360px", height: "calc(100vh - 120px)", margin: "-24px -24px 0" }}>
      {/* Source rail */}
      <div style={{ borderRight: "1px solid var(--ih-line)", padding: "20px 12px", background: "var(--ih-surface-2)", overflowY: "auto" }}>
        <div className="ih-eyebrow" style={{ padding: "0 8px 8px" }}>Filters</div>
        {([
          ["All", "23", "all"],
          ["Unread", "12", "unread"],
          ["Mentions", "3", "mentions"],
          ["Assigned to me", "8", "assigned"],
        ] as [string, string, FilterType][]).map(([l, c, key]) => {
          const a = filter === key
          return (
            <div key={l} onClick={() => setFilter(key)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, fontSize: 12, fontWeight: a ? 500 : 400, background: a ? "var(--ih-surface)" : "transparent", border: a ? "1px solid var(--ih-line)" : "1px solid transparent", cursor: "pointer" }}>
              <span>{l}</span><span className="ih-mono" style={{ color: "var(--ih-ink-40)", fontSize: 10 }}>{c}</span>
            </div>
          )
        })}
        <div className="ih-eyebrow" style={{ padding: "16px 8px 8px" }}>By source</div>
        {([
          ["bell","Approvals",6,"accent"],
          ["chat","Portal replies",4,"info"],
          ["bolt","Workflow events",8,"warn"],
          ["money","Payment events",2,"ok"],
          ["audit","Audit alerts",1,"muted"],
          ["star","Reviews",2,"ok"],
        ] as [IconName, string, number, Tone][]).map(([i, l, c, t]) => (
          <div key={l} onClick={() => setFilter(l)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12, color: filter === l ? "var(--ih-ink)" : "var(--ih-ink-65)", cursor: "pointer", background: filter === l ? "var(--ih-surface)" : "transparent", borderRadius: 6, fontWeight: filter === l ? 500 : 400 }}>
            <Icon name={i} size={12} style={{ color: toneColor(t) }}/>
            <span style={{ flex: 1 }}>{l}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{c}</span>
          </div>
        ))}
        <div className="ih-eyebrow" style={{ padding: "16px 8px 8px" }}>By client</div>
        {[["Northwind",5],["Acme",4],["Olsen",3],["Westfield",2],["Halcyon",2]].map(([n, c]) => (
          <div key={n as string} onClick={() => setFilter(n as string)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", fontSize: 12, color: filter === n ? "var(--ih-ink)" : "var(--ih-ink-65)", cursor: "pointer", background: filter === n ? "var(--ih-surface)" : "transparent", borderRadius: 6, fontWeight: filter === n ? 500 : 400 }}>
            <div className="ih-avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{(n as string)[0]}</div>
            <span style={{ flex: 1 }}>{n as string}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{c as number}</span>
          </div>
        ))}
      </div>

      {/* Stream */}
      <div style={{ overflowY: "auto" }} className="scrollbar-thin">
        <div style={{ padding: "20px 24px 12px" }}>
          <div className="ih-eyebrow">23 events · last 24h</div>
          <h1 className="ih-serif" style={{ margin: "6px 0 0", fontSize: 32 }}>Inbox. <span className="ih-italic-red">One</span> stream, every source.</h1>
        </div>
        <div>
          {filteredItems.map((r, i) => {
            if (r.group) return <div key={i} className="ih-eyebrow" style={{ padding: "16px 24px 6px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>{r.group}</div>
            const isSelected = i === selectedIdx
            return (
              <div key={i} onClick={() => setSelectedIdx(i)} style={{
                display: "grid", gridTemplateColumns: "24px 24px 1fr auto", gap: 10, alignItems: "center",
                padding: "12px 24px", borderTop: "1px solid var(--ih-line)",
                background: isSelected ? "var(--ih-accent-soft-2)" : r.unread ? "var(--ih-surface)" : "transparent",
                borderLeft: isSelected ? "2px solid var(--ih-accent)" : "2px solid transparent",
                cursor: "pointer",
              }}>
                {r.unread && !isSelected ? <span style={{ width: 6, height: 6, background: "var(--ih-accent)", borderRadius: 999 }}/> : <span />}
                <Icon name={r.icon!} size={13} style={{ color: toneColor(r.tone!) }}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, marginBottom: 2 }}>
                    <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 8 }}>{r.source}</span>
                    <strong style={{ fontWeight: 500 }}>{r.who}</strong>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.body}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 3 }}>{r.meta}</div>
                </div>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>↵</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail / actions */}
      <div style={{ borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", padding: 20, overflowY: "auto" }}>
        <span className="ih-eyebrow">/inv_2041 · approval</span>
        <h2 className="ih-serif" style={{ margin: "6px 0 14px", fontSize: 22, lineHeight: 1.15 }}>Acme · Q2 final<br/><span className="ih-italic-red">$14,200</span> due Apr 28.</h2>

        <div className="ih-card" style={{ padding: 14, marginBottom: 12, background: "var(--ih-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div className="ih-avatar">SR</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Sarah Rowe</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>finance · acme · 4h ago</div>
            </div>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.6 }}>
            &ldquo;Final invoice ready for sign-off. Same scope as the Q2 brief &mdash; happy to push back if anything changed on your side.&rdquo;
          </p>
        </div>

        <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14, marginBottom: 12 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Invoice summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, fontSize: 12 }}>
            <span style={{ color: "var(--ih-ink-65)" }}>Retainer · Q2 final</span><span className="ih-num">$12,000</span>
            <span style={{ color: "var(--ih-ink-65)" }}>Approved scope creep</span><span className="ih-num">$1,800</span>
            <span style={{ color: "var(--ih-ink-65)" }}>VAT @ 0%</span><span className="ih-num">&mdash;</span>
            <div style={{ gridColumn: "1 / -1", height: 1, background: "var(--ih-line)", margin: "6px 0" }}/>
            <strong>Total</strong><strong className="ih-num">$14,200</strong>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <button className="ih-btn ih-btn-accent" style={{ height: 36, justifyContent: "center" }}><Icon name="check" size={12}/> Approve & send</button>
          <button className="ih-btn ih-btn-ghost" style={{ height: 32 }}><Icon name="chat" size={11}/> Reply with notes</button>
          <button className="ih-btn ih-btn-quiet" style={{ height: 32 }}><Icon name="x" size={11}/> Push back</button>
        </div>

        <div className="ih-hr" style={{ margin: "20px 0 12px" }}/>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Related</div>
        <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
          <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ih-ink)", cursor: "pointer" }}><Icon name="handshake" size={11}/> Engagement · Acme Q2 retainer →</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ih-ink)", cursor: "pointer" }}><Icon name="invoice" size={11}/> Previous · /inv_2027 (paid) →</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ih-ink)", cursor: "pointer" }}><Icon name="user" size={11}/> Client · Acme Studios →</span>
        </div>
      </div>
    </div>
  )
}
