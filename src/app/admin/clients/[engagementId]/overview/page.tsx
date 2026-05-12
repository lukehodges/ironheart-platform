"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast } from "@/components/shared"
import { Icon, type IconName } from "@/components/shell"

/* -- Data ----------------------------------------------------------------- */
type RagScore = "RED" | "AMBER" | "GREEN"

interface LensSummary {
  id: string; name: string; icon: IconName
  rag: RagScore; waste: number
  findings: number
}

const LENSES: LensSummary[] = [
  { id: "REVENUE",    name: "Revenue",    icon: "chart",    rag: "AMBER", waste: 84000,  findings: 4 },
  { id: "OPERATIONS", name: "Operations", icon: "workflow",  rag: "RED",   waste: 168000, findings: 6 },
  { id: "FINANCE",    name: "Finance",    icon: "invoice",   rag: "AMBER", waste: 46000,  findings: 3 },
  { id: "TECHNOLOGY", name: "Technology", icon: "code",      rag: "AMBER", waste: 38000,  findings: 2 },
  { id: "TEAM",       name: "Team",       icon: "users",     rag: "GREEN", waste: 12000,  findings: 1 },
]

const TOTAL_WASTE = LENSES.reduce((s, l) => s + l.waste, 0)
const TOTAL_FINDINGS = LENSES.reduce((s, l) => s + l.findings, 0)

const RAG_TONE: Record<RagScore, { bg: string; color: string; border: string }> = {
  RED:   { bg: "rgba(192,57,43,0.08)", color: "#C0392B", border: "rgba(192,57,43,0.25)" },
  AMBER: { bg: "rgba(214,154,67,0.08)", color: "#B8821F", border: "rgba(214,154,67,0.25)" },
  GREEN: { bg: "rgba(47,111,92,0.08)", color: "#2F6F5C", border: "rgba(47,111,92,0.25)" },
}

const fmtGBP = (n: number) => "£" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n))

function RagBadge({ score, size = "md" }: { score: RagScore; size?: "sm" | "md" }) {
  const t = RAG_TONE[score]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: size === "sm" ? "2px 7px" : "3px 9px",
      background: t.bg, color: t.color,
      border: `1px solid ${t.border}`, borderRadius: "var(--ih-r-pill)",
      fontFamily: "var(--ih-font-mono)", fontSize: size === "sm" ? 9 : 10,
      fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.color }} />
      {score}
    </span>
  )
}

/* -- Page ----------------------------------------------------------------- */
export default function EngagementOverviewPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  return (
    <div style={{ padding: "20px 28px" }}>
      {/* Top header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", letterSpacing: "0.14em", textTransform: "uppercase" }}>ENG{"‑"}0027 {"·"} linked to AS{"‑"}0027 {"·"} AR{"‑"}0027</span>
          <span className="ih-pill ih-pill-ok" style={{ fontSize: 9 }}>{"●"} Active</span>
        </div>
        <h1 className="ih-serif" style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>
          Q1 operations <span className="ih-italic-red">audit</span>
        </h1>
      </div>

      {/* Audit hero block */}
      <div style={{
        border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-xl)",
        background: "var(--ih-surface)", overflow: "hidden", marginBottom: 22,
      }}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* Left: identity + status */}
          <div style={{ width: 280, padding: "18px 20px", borderRight: "1px solid var(--ih-line)", background: "var(--ih-surface-2)" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Audit workspace {"·"} AS{"‑"}0027</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="ih-pill ih-pill-warn" style={{ fontSize: 9 }}>{"●"} IN_PROGRESS</span>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>day 14 / 21</span>
            </div>
            <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Recoverable / yr</div>
            <div className="ih-serif" style={{ fontSize: 38, lineHeight: 0.95, color: "var(--ih-accent)" }}>{fmtGBP(TOTAL_WASTE)}</div>
            <div style={{ fontSize: 11, color: "var(--ih-ink-50)", marginTop: 6 }}>{TOTAL_FINDINGS} findings {"·"} 5 lenses</div>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ marginTop: 14, width: "100%", justifyContent: "space-between" }} onClick={() => router.push("/admin/clients/c-northwind/audit")}>
              Open audit workspace <Icon name="arrowRight" size={11} />
            </button>
          </div>

          {/* Middle: 5 lens RAG strip */}
          <div style={{ flex: 1, padding: "18px 20px" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 12 }}>The five lenses</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LENSES.map((l) => {
                const t = RAG_TONE[l.rag]
                return (
                  <div key={l.id} style={{ display: "grid", gridTemplateColumns: "20px 110px 1fr 70px 80px", gap: 10, alignItems: "center", padding: "5px 0" }}>
                    <Icon name={l.icon} size={12} style={{ color: t.color }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{l.name}</span>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--ih-surface-3)", overflow: "hidden", position: "relative" }}>
                      <div style={{ height: "100%", width: `${(l.waste / TOTAL_WASTE) * 100}%`, background: t.color, borderRadius: 999 }} />
                    </div>
                    <RagBadge score={l.rag} size="sm" />
                    <span className="ih-num ih-mono" style={{ fontSize: 11, textAlign: "right", fontWeight: 600, color: t.color }}>{fmtGBP(l.waste)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: outputs queue */}
          <div style={{ width: 280, padding: "18px 20px", borderLeft: "1px solid var(--ih-line)" }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>What this becomes</div>
            {[
              { i: 1, t: "Audit report",       sub: "DRAFT · AR-0027",          tone: "warn",  cta: "Review →" },
              { i: 2, t: "6-month roadmap",    sub: "13 milestones · 3 phases", tone: "info",  cta: "View"     },
              { i: 3, t: "Retainer proposal",  sub: "£4,200/mo · queued",  tone: "muted", cta: "Draft →" },
              { i: 4, t: "Implementation eng.", sub: "to be created",                 tone: "muted", cta: "—"   },
            ].map((o) => (
              <div key={o.i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--ih-line)" }}>
                <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>/0{o.i}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5 }}>{o.t}</div>
                  <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{o.sub}</div>
                </div>
                <span style={{ fontSize: 10.5, color: o.tone === "warn" ? "#B8821F" : o.tone === "info" ? "var(--ih-accent)" : "var(--ih-ink-40)" }}>{o.cta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: validation/next-step strip */}
        <div style={{
          padding: "10px 20px", background: "var(--ih-accent-soft-2)",
          borderTop: "1px solid var(--ih-accent-soft)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Icon name="sparkles" size={12} style={{ color: "var(--ih-accent)" }} />
          <span style={{ fontSize: 12, color: "var(--ih-ink-90)" }}>
            One lens still needs a justification before the report can publish &mdash; <strong>Technology</strong>.
          </span>
          <div style={{ flex: 1 }} />
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => router.push("/admin/clients/c-northwind/audit/lens")}>Fix justification {"→"}</button>
          <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => setToast({message: "AI is generating report...", tone: "info"})}>Generate report</button>
        </div>
      </div>

      {/* Bottom cards: progress, money, approvals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Engagement progress</div>
          <div style={{ fontSize: 13 }}>Day 14 of 21 {"·"} AUDITING</div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>Next stage: REPORTING &mdash; Apr 08</div>
        </div>
        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Money</div>
          <div style={{ fontSize: 13 }}>{"£"}12,250 paid {"·"} {"£"}12,250 outstanding</div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>Next invoice on milestone #3</div>
        </div>
        <div className="ih-card" style={{ padding: 14 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Approvals</div>
          <div style={{ fontSize: 13 }}>1 awaiting client {"·"} 0 overdue</div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>Audit Summary {"·"} sent 4h ago</div>
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
