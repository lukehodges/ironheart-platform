"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
      <div>
        <div className="ih-eyebrow">{eyebrow}</div>
        <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{title}</h3>
      </div>
      {action}
    </div>
  )
}

function Btn({ children, accent, ghost, sm, onClick, style }: { children: React.ReactNode; accent?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  const cls = ["ih-btn", sm && "ih-btn-sm", ghost && "ih-btn-ghost", accent && "ih-btn-accent"].filter(Boolean).join(" ")
  return <button className={cls} onClick={onClick} style={style}>{children}</button>
}

/* ------------------------------------------------------------------ */
/*  Stage pipeline strip                                               */
/* ------------------------------------------------------------------ */

const STAGES = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]

function StagePipelineStrip({ current }: { current: string }) {
  const currentIdx = STAGES.indexOf(current)
  return (
    <div style={{ display: "flex", gap: 4, padding: "16px 28px", borderBottom: "1px solid var(--ih-line)", background: "var(--ih-surface-2)" }}>
      {STAGES.map((stage, i) => {
        const isComplete = i < currentIdx
        const isCurrent = stage === current
        const isTerminal = stage === "Won" || stage === "Lost"
        return (
          <div
            key={stage}
            style={{
              flex: isTerminal ? 0.7 : 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${isCurrent ? "var(--ih-accent)" : "var(--ih-line)"}`,
              background: isCurrent ? "var(--ih-accent-soft)" : isComplete ? "var(--ih-surface)" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div className="ih-mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: isCurrent ? "var(--ih-accent)" : isComplete ? "var(--ih-ok)" : "var(--ih-ink-40)" }}>
              {isComplete && <Icon name="check" size={9} style={{ marginRight: 3 }} />}
              {stage}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PipelineDealDetailPage() {
  const router = useRouter()
  const [showLostDialog, setShowLostDialog] = useState(false)
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)

  const deal = {
    name: "Olsen Brands",
    description: "Discovery + kickoff",
    value: 12000,
    stage: "Qualified",
    probability: "40%",
    source: "Referral from Northwind",
    contact: "Tomas Olsen",
    contactRole: "CEO",
    contactEmail: "tomas@olsenbrands.co",
    createdDate: "22 Mar 2025",
    expectedClose: "15 Jun 2025",
  }

  const qualification = [
    { label: "Budget", value: "Confirmed", tone: "ok" },
    { label: "Authority", value: "Decision maker", tone: "ok" },
    { label: "Need", value: "Operational audit", tone: "ok" },
    { label: "Timeline", value: "Q2 2025", tone: "accent" },
  ]

  const activity = [
    { date: "Today", time: "09:15", icon: "mail" as const, tone: "accent", title: "Email sent", desc: "Follow-up on discovery call notes" },
    { date: "Today", time: "08:30", icon: "sparkles" as const, tone: "muted", title: "Copilot", desc: "Drafted proposal outline based on call transcript" },
    { date: "9 May", time: "14:00", icon: "phone" as const, tone: "ok", title: "Discovery call", desc: "45m with Tomas. Discussed ops bottlenecks and audit scope" },
    { date: "7 May", time: "10:00", icon: "mail" as const, tone: "muted", title: "Email received", desc: "Tomas confirmed interest, shared team org chart" },
    { date: "5 May", time: "11:00", icon: "flag" as const, tone: "accent", title: "Stage change", desc: "Moved from New to Qualified" },
    { date: "22 Mar", time: "16:30", icon: "plus" as const, tone: "muted", title: "Deal created", desc: "Referral from Mira Sato at Northwind" },
  ]

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* ---- Entity header ---- */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Link href="/admin/pipeline" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
              <Icon name="chevronLeft" size={12} /> Pipeline
            </Link>
            <span className="ih-eyebrow">/deal_0472 {"·"} pipeline</span>
          </div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 36, lineHeight: 1 }}>
            {deal.name} <span style={{ color: "var(--ih-ink-50)", fontWeight: 400 }}>&mdash;</span> <span style={{ fontWeight: 400 }}>{deal.description}</span>
          </h1>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <span className="ih-serif" style={{ fontSize: 24 }}>{"\u00A3"}{deal.value.toLocaleString()}</span>
            <span className="ih-pill ih-pill-info" style={{ fontSize: 10 }}>{deal.stage}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{deal.probability} probability</span>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Btn sm ghost onClick={() => setToast({message: "AI is drafting proposal...", tone: "info"})}>Create proposal</Btn>
          <Btn sm ghost onClick={() => setToast({message: "Converting deal to engagement...", tone: "ok"})}>Convert to engagement</Btn>
          <Btn sm ghost onClick={() => setShowLostDialog(true)} style={{ color: "var(--ih-warn)" }}>Mark lost</Btn>
          <Btn sm accent onClick={() => setToast({message: "Deal moved to Proposal stage", tone: "ok"})}>Move to Proposal <Icon name="arrowRight" size={11} /></Btn>
        </div>
      </div>

      {/* Stage pipeline strip */}
      <StagePipelineStrip current={deal.stage} />

      {/* ---- Body: two-column ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 0 }}>
        {/* Left column */}
        <div style={{ padding: "20px 28px 48px", borderRight: "1px solid var(--ih-line)" }}>
          {/* Deal info card */}
          <SectionHead eyebrow="deal info" title="Details" />
          <div className="ih-card" style={{ marginBottom: 24 }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {([
                  ["Source", deal.source],
                  ["Contact", `${deal.contact} (${deal.contactRole})`],
                  ["Created", deal.createdDate],
                  ["Expected close", deal.expectedClose],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Qualification (BANT) */}
          <SectionHead eyebrow="qualification" title="BANT assessment" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            {qualification.map((q) => (
              <div key={q.label} className="ih-card" style={{ padding: 14, textAlign: "center" }}>
                <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{q.label}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span className={`ih-dot ih-dot-${q.tone}`} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{q.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Activity timeline */}
          <SectionHead eyebrow="activity" title="Timeline" />
          <div style={{ display: "grid", gap: 0 }}>
            {activity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 44px 20px 1fr",
                  gap: 10,
                  padding: "10px 0",
                  alignItems: "flex-start",
                  borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
                }}
              >
                <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", fontWeight: 500 }}>{item.date}</span>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", paddingTop: 2 }}>{item.time}</span>
                <Icon
                  name={item.icon}
                  size={13}
                  style={{
                    color:
                      item.tone === "ok" ? "var(--ih-ok)"
                      : item.tone === "accent" ? "var(--ih-accent)"
                      : "var(--ih-ink-40)",
                    marginTop: 2,
                  }}
                />
                <div style={{ fontSize: 12.5 }}>
                  <strong style={{ fontWeight: 500 }}>{item.title}</strong>
                  <span style={{ color: "var(--ih-ink-65)", marginLeft: 6 }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Right rail {"·"} context</div>

          {/* Contact card */}
          <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Primary contact</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <div className="ih-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>TO</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{deal.contact}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{deal.contactRole} {"·"} Olsen Brands</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 6, fontSize: 11.5 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--ih-ink-65)" }}>
                  <Icon name="mail" size={10} /> {deal.contactEmail}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--ih-ink-65)" }}>
                  <Icon name="phone" size={10} /> +44 7911 123456
                </div>
              </div>
            </div>
          </div>

          {/* Related client link */}
          <Link href="/admin/clients/c-olsen" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Related client</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 12, background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)" }}>
                  <span style={{ fontStyle: "italic", fontFamily: "var(--ih-font-serif)" }}>O</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Olsen Brands</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>Prospect {"·"} no engagement yet</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Next action card */}
          <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Next action</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Send proposal draft</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", marginTop: 4 }}>Based on discovery call. Tomas expecting by end of week.</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-accent)", marginTop: 8 }}>Due: Fri 16 May</div>
            </div>
          </div>

          {/* AI summary */}
          <div className="ih-card ih-card-pad" style={{ background: "var(--ih-ink)", color: "#fff", padding: 16, borderColor: "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Icon name="sparkles" size={13} style={{ color: "#fff" }} />
              <span className="ih-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>Copilot {"·"} deal intel</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
              Strong fit. Tomas confirmed <strong style={{ color: "#fff" }}>budget authority</strong> and wants to start Q2. Their ops team (4 people) mirrors Northwind&apos;s structure &mdash; your retainer playbook applies. Referral from Mira adds trust. Recommend moving to Proposal after sending the draft.
            </p>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="ih-btn ih-btn-sm" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} onClick={() => setToast({message: "AI is drafting proposal...", tone: "info"})}>Draft proposal</button>
              <button className="ih-btn ih-btn-sm" style={{ background: "transparent", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" }} onClick={() => setToast({message: "AI is analyzing win strategy...", tone: "info"})}>Win strategy</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lost dialog (simplified) */}
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      {showLostDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="ih-card" style={{ width: 420, padding: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Mark deal as lost</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ih-ink-65)" }}>Why did this deal not close? This helps improve future qualification.</p>
            <div style={{ marginBottom: 16 }}>
              <label className="ih-eyebrow" style={{ display: "block", marginBottom: 6, fontSize: 10 }}>Reason</label>
              <select style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, fontSize: 13, background: "var(--ih-surface)", color: "var(--ih-ink)" }}>
                <option>Budget constraints</option>
                <option>Timing not right</option>
                <option>Went with competitor</option>
                <option>No decision made</option>
                <option>Relationship lost</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="ih-eyebrow" style={{ display: "block", marginBottom: 6, fontSize: 10 }}>Notes</label>
              <textarea placeholder="Optional..." style={{ width: "100%", minHeight: 80, padding: 12, border: "1px solid var(--ih-line)", borderRadius: 8, fontSize: 13, background: "var(--ih-surface)", color: "var(--ih-ink)", fontFamily: "inherit", resize: "vertical", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn sm ghost onClick={() => setShowLostDialog(false)}>Cancel</Btn>
              <Btn sm style={{ background: "var(--ih-warn)", color: "#fff", border: "none" }} onClick={() => { setShowLostDialog(false); setToast({message: "Deal marked as lost", tone: "warn"}) }}>Mark as lost</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
