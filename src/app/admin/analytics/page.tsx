"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */

const REVENUE_MONTHS: { month: string; paid: number; outstanding: number }[] = [
  { month: "Dec", paid: 28, outstanding: 6 },
  { month: "Jan", paid: 32, outstanding: 8 },
  { month: "Feb", paid: 36, outstanding: 4 },
  { month: "Mar", paid: 42, outstanding: 10 },
  { month: "Apr", paid: 38, outstanding: 6 },
  { month: "May", paid: 48, outstanding: 12 },
]

const HEALTH_GRADES: { grade: string; count: number; tone: string }[] = [
  { grade: "A", count: 4, tone: "ok" },
  { grade: "B", count: 3, tone: "ok" },
  { grade: "C", count: 2, tone: "warn" },
  { grade: "D", count: 1, tone: "danger" },
  { grade: "F", count: 0, tone: "muted" },
]

const PIPELINE_STAGES: { stage: string; count: number; maxWidth: number; tone: string }[] = [
  { stage: "Discovery", count: 3, maxWidth: 30, tone: "info" },
  { stage: "Proposal", count: 5, maxWidth: 50, tone: "warn" },
  { stage: "Contracted", count: 2, maxWidth: 20, tone: "info" },
  { stage: "Auditing", count: 3, maxWidth: 30, tone: "info" },
  { stage: "Implementing", count: 4, maxWidth: 40, tone: "accent" },
  { stage: "Retainer", count: 2, maxWidth: 20, tone: "ok" },
  { stage: "Closed Won", count: 6, maxWidth: 60, tone: "ok" },
]

const TOP_CLIENTS: { name: string; revenue: number; engagements: number; health: string }[] = [
  { name: "Vellum & Co.", revenue: 64000, engagements: 2, health: "ok" },
  { name: "Northwind Logistics", revenue: 48200, engagements: 3, health: "ok" },
  { name: "Bowery Mills", revenue: 42000, engagements: 2, health: "ok" },
  { name: "Arden Health", revenue: 38000, engagements: 1, health: "ok" },
  { name: "Castor Foods", revenue: 22000, engagements: 1, health: "ok" },
]

const TH: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--ih-font-mono)" }

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const maxRev = Math.max(...REVENUE_MONTHS.map(m => m.paid + m.outstanding))

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Intelligence &middot; analytics</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            May 2026. Your business <span className="ih-italic-red">at a glance.</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Date picker coming soon", tone: "info"})}><Icon name="calendar" size={12}/> May 2026</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Export started — check your downloads", tone: "ok"})}><Icon name="download" size={12}/> Export</button>
        </div>
      </div>

      {/* 6 headline stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { l: "Revenue", v: "\u00a348k", d: "+14%", h: "MoM", icon: "money" as const, href: "/admin/payments" },
          { l: "Active clients", v: "12", d: "+2", h: "this quarter", icon: "users" as const, href: "/admin/clients" },
          { l: "Pipeline value", v: "\u00a3184k", d: "+\u00a322k", h: "weighted", icon: "pipeline" as const, href: "/admin/pipeline" },
          { l: "Avg engagement", v: "4.2mo", d: "+0.3", h: "vs last year", icon: "clock" as const, href: "/admin/bookings" },
          { l: "Hours delivered", v: "192h", d: "+38h", h: "this month", icon: "bolt" as const, href: "/admin/team" },
          { l: "NPS score", v: "72", d: "+4", h: "last 90d", icon: "star" as const, href: "/admin/reviews" },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }} onClick={() => router.push(s.href)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 28, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "var(--ih-ok)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Three sections row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr", gap: 14, marginBottom: 28 }}>
        {/* Revenue trend */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Revenue trend</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>6-month overview</h3>
          </div>
          <div style={{ padding: "20px 18px 14px" }}>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 160 }}>
              {REVENUE_MONTHS.map((m) => {
                const total = m.paid + m.outstanding
                const paidH = (m.paid / maxRev) * 140
                const outH = (m.outstanding / maxRev) * 140
                return (
                  <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 140, width: "100%", gap: 1 }}>
                      <div style={{ height: outH, background: "var(--ih-warn-soft)", borderRadius: "4px 4px 0 0", minHeight: outH > 0 ? 4 : 0 }} />
                      <div style={{ height: paidH, background: "var(--ih-ok)", borderRadius: outH > 0 ? "0" : "4px 4px 0 0", opacity: 0.8 }} />
                    </div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 8 }}>{m.month}</div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", fontWeight: 500 }}>&pound;{total}k</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--ih-line)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ih-ok)", opacity: 0.8 }} /> Collected
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ih-warn-soft)" }} /> Outstanding
              </span>
            </div>
          </div>
        </div>

        {/* Client health distribution */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Client health</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Distribution</h3>
          </div>
          <div style={{ padding: 18, display: "grid", gap: 8 }}>
            {HEALTH_GRADES.map((g) => (
              <div key={g.grade} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: "var(--ih-r-md)",
                background: g.tone === "ok" ? "var(--ih-ok-soft)" : g.tone === "warn" ? "var(--ih-warn-soft)" : g.tone === "danger" ? "var(--ih-danger-soft)" : "var(--ih-surface-2)",
              }}>
                <span className="ih-serif" style={{ fontSize: 24, width: 28, textAlign: "center", color: g.tone === "ok" ? "var(--ih-ok)" : g.tone === "warn" ? "var(--ih-warn)" : g.tone === "danger" ? "var(--ih-danger)" : "var(--ih-ink-40)" }}>{g.grade}</span>
                <div style={{ flex: 1 }}>
                  <div className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>{g.count} client{g.count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ width: 40, height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${(g.count / 4) * 100}%`, height: "100%", background: g.tone === "ok" ? "var(--ih-ok)" : g.tone === "warn" ? "var(--ih-warn)" : g.tone === "danger" ? "var(--ih-danger)" : "var(--ih-ink-30)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement pipeline */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
            <span className="ih-eyebrow">Pipeline</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Engagement funnel</h3>
          </div>
          <div style={{ padding: 18, display: "grid", gap: 8 }}>
            {PIPELINE_STAGES.map((s) => (
              <div key={s.stage}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{s.stage}</span>
                  <span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{s.count}</span>
                </div>
                <div style={{ height: 6, background: "var(--ih-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${s.maxWidth}%`, height: "100%", background: s.tone === "ok" ? "var(--ih-ok)" : s.tone === "warn" ? "var(--ih-warn)" : s.tone === "accent" ? "var(--ih-accent)" : "var(--ih-info)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 clients by revenue */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="ih-eyebrow">Leaderboard</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Top 5 clients by revenue</h3>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => router.push("/admin/customers")}>View all &rarr;</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)" }}>
              <th style={{ ...TH, paddingLeft: 18, width: 40 }}>#</th>
              <th style={TH}>Client</th>
              <th style={TH}>Revenue</th>
              <th style={TH}>Engagements</th>
              <th style={TH}>Health</th>
              <th style={TH}>Share</th>
            </tr>
          </thead>
          <tbody>
            {TOP_CLIENTS.map((c, i) => {
              const totalRev = TOP_CLIENTS.reduce((sum, cl) => sum + cl.revenue, 0)
              const share = Math.round((c.revenue / totalRev) * 100)
              return (
                <tr key={c.name} style={{ borderTop: "1px solid var(--ih-line)" }}>
                  <td style={{ padding: "10px 12px 10px 18px" }}>
                    <span className="ih-mono" style={{ fontSize: 14, color: "var(--ih-ink-30)" }}>{i + 1}</span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>&pound;{c.revenue.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 12 }}>{c.engagements}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className={`ih-dot ih-dot-${c.health}`} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: "var(--ih-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${share}%`, height: "100%", background: "var(--ih-accent)" }} />
                      </div>
                      <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{share}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
