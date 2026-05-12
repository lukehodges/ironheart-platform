"use client"

import { useState } from "react"
import { NotificationToast, ConfirmDialog } from "@/components/shared"
import { Icon } from "@/components/shell"

const FILTERS = ["All", "Published", "Pending Review", "Flagged", "Responded"] as const

const REVIEWS = [
  {
    id: 1, client: "Northwind", initials: "NC", rating: 5, date: "8 May 2026", engagement: "Q2 retainer",
    text: "Luke and the team transformed our internal operations. The audit uncovered three bottlenecks we had been ignoring for years. Sprint delivery was excellent and every milestone hit on time.",
    sentiment: "Positive" as const, status: "Published" as const, responded: true,
  },
  {
    id: 2, client: "Acme Studios", initials: "AS", rating: 5, date: "2 May 2026", engagement: "Q2 retainer",
    text: "Incredibly thorough discovery process. The questionnaires surfaced issues our leadership had never discussed openly. Already seeing measurable improvement in team alignment.",
    sentiment: "Positive" as const, status: "Published" as const, responded: false,
  },
  {
    id: 3, client: "Vellum & Co.", initials: "VC", rating: 4, date: "28 Apr 2026", engagement: "Portal rebuild",
    text: "Good progress on the portal rebuild. A couple of design iterations took longer than expected but the end result is solid. Would recommend for technical projects.",
    sentiment: "Positive" as const, status: "Published" as const, responded: true,
  },
  {
    id: 4, client: "Bowery Mills", initials: "BM", rating: 3, date: "20 Apr 2026", engagement: "Monthly ops retainer",
    text: "Useful monthly check-ins but would appreciate more proactive recommendations between sessions. The reports are detailed but sometimes arrive a day late.",
    sentiment: "Neutral" as const, status: "Pending Review" as const, responded: false,
  },
  {
    id: 5, client: "Sea Glass Studio", initials: "SG", rating: 5, date: "14 Apr 2026", engagement: "Discovery scoping",
    text: "Best discovery process I have experienced. Mira was fantastic at drawing out what we actually needed versus what we thought we wanted. Proposal was spot on.",
    sentiment: "Positive" as const, status: "Published" as const, responded: false,
  },
  {
    id: 6, client: "Brigham Architects", initials: "BA", rating: 2, date: "3 Apr 2026", engagement: "Workflow rebuild",
    text: "The workflow rebuild stalled after phase 1. Communication dropped off and we had to chase for updates multiple times. Invoice was sent before final deliverables were approved.",
    sentiment: "Negative" as const, status: "Flagged" as const, responded: false,
  },
]

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" size={13} style={{ color: i < count ? "var(--ih-warn)" : "var(--ih-ink-20)", fill: i < count ? "var(--ih-warn)" : "none" }} />
      ))}
    </div>
  )
}

function sentimentColor(s: "Positive" | "Neutral" | "Negative") {
  if (s === "Positive") return { bg: "var(--ih-ok-soft)", color: "var(--ih-ok)" }
  if (s === "Neutral") return { bg: "var(--ih-warn-soft)", color: "var(--ih-warn)" }
  return { bg: "var(--ih-danger-soft)", color: "var(--ih-danger)" }
}

export default function ReviewsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All")
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{title: string; desc: string; label: string; action: () => void}>({title:"",desc:"",label:"",action:()=>{}})

  const filtered = REVIEWS.filter((r) => {
    if (activeFilter === "All") return true
    if (activeFilter === "Published") return r.status === "Published"
    if (activeFilter === "Pending Review") return r.status === "Pending Review"
    if (activeFilter === "Flagged") return r.status === "Flagged"
    if (activeFilter === "Responded") return r.responded
    return true
  })

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Intelligence &middot; reviews</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>
            34 reviews. <span className="ih-italic-red">4.8</span> average.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Export started — check your downloads", tone: "ok"})}><Icon name="download" size={12} /> Export</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setToast({message: "Review requests sent to all recent clients", tone: "ok"})}><Icon name="mail" size={12} /> Request reviews</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { l: "Avg Rating", v: "4.8", d: "+0.2", h: "vs last quarter", icon: "star" as const },
          { l: "Response Rate", v: "72%", d: "+8%", h: "reviews responded to", icon: "chat" as const },
          { l: "NPS Score", v: "68", d: "+4", h: "net promoter score", icon: "target" as const },
          { l: "Positive Sentiment", v: "89%", d: "+3%", h: "of all reviews", icon: "check" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "var(--ih-ok)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`ih-btn ${activeFilter === f ? "ih-btn-ghost" : "ih-btn-quiet"} ih-btn-sm`}
            style={{ height: 28, fontSize: 11.5, fontWeight: activeFilter === f ? 500 : 400 }}
          >
            {f}
            {f === "Flagged" && <span style={{ marginLeft: 4, background: "var(--ih-danger-soft)", color: "var(--ih-danger)", borderRadius: 8, padding: "1px 6px", fontSize: 10 }}>1</span>}
          </button>
        ))}
        <span className="ih-mono" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--ih-ink-40)", alignSelf: "center" }}>
          {filtered.length} review{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Review cards */}
      <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
        {filtered.map((r) => (
          <div key={r.id} className="ih-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div className="ih-avatar" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>{r.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.client}</span>
                  <Stars count={r.rating} />
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r.date}</span>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>&middot; {r.engagement}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: sentimentColor(r.sentiment).bg,
                      color: sentimentColor(r.sentiment).color,
                    }}
                  >
                    {r.sentiment}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ih-ink-65)", lineHeight: 1.55, marginBottom: 12 }}>
                  {r.text}
                </p>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {r.status === "Published" ? (
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ok)", display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="ih-dot ih-dot-ok" /> Published
                    </span>
                  ) : r.status === "Flagged" ? (
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="flag" size={10} /> Flagged
                    </span>
                  ) : (
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-warn)", display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="ih-dot ih-dot-warn" /> Pending
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  {r.status !== "Published" && (
                    <button className="ih-btn ih-btn-primary ih-btn-sm" style={{ height: 24, fontSize: 10.5 }} onClick={() => setToast({message: "Review published", tone: "ok"})}>
                      <Icon name="check" size={10} /> Publish
                    </button>
                  )}
                  {!r.responded && (
                    <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ height: 24, fontSize: 10.5 }} onClick={() => setToast({message: "Response editor coming soon", tone: "info"})}>
                      <Icon name="chat" size={10} /> Respond
                    </button>
                  )}
                  {r.status !== "Flagged" && (
                    <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 24, fontSize: 10.5 }} onClick={() => setToast({message: "Review flagged for attention", tone: "warn"})}>
                      <Icon name="flag" size={10} /> Flag
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Automation section */}
      <div className="ih-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <span className="ih-eyebrow">Automation</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Review collection settings</h3>
          </div>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Review settings dialog coming soon", tone: "info"})}><Icon name="sliders" size={12} /> Configure</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div style={{ padding: 14, background: "var(--ih-surface-2)", borderRadius: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Auto-request</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Enabled</div>
            <p style={{ fontSize: 11, color: "var(--ih-ink-50)", margin: 0 }}>
              Sends review request 24h after engagement completion via email.
            </p>
          </div>
          <div style={{ padding: 14, background: "var(--ih-surface-2)", borderRadius: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Screening threshold</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>4.0 stars minimum</div>
            <p style={{ fontSize: 11, color: "var(--ih-ink-50)", margin: 0 }}>
              Reviews below threshold are held for manual review before publishing.
            </p>
          </div>
          <div style={{ padding: 14, background: "var(--ih-surface-2)", borderRadius: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Pre-screening rules</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>3 active rules</div>
            <p style={{ fontSize: 11, color: "var(--ih-ink-50)", margin: 0 }}>
              Flag profanity, auto-publish 5-star from repeat clients, notify on negative.
            </p>
          </div>
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      <ConfirmDialog open={confirmOpen} title={confirmAction.title} description={confirmAction.desc} confirmLabel={confirmAction.label} onConfirm={confirmAction.action} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
