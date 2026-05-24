"use client"

import { useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"
import { NotificationToast, type ToastTone } from "@/components/shared"
import {
  mockPipeline, STAGE_META, STAGE_ORDER, SOURCE_LABEL, STAGE_PROBABILITY,
  type Deal, type DealStage,
} from "@/lib/mock/pipeline"

/* ── Helpers ─────────────────────────────────────────────────────────────── */

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

function StageStrip({ current, onSet }: { current: DealStage; onSet: (s: DealStage) => void }) {
  const stages = STAGE_ORDER.filter(s => s !== "CLOSED_LOST")
  const currentIdx = STAGE_META[current].idx
  return (
    <div style={{ display: "flex", gap: 4, padding: "16px 28px", borderBottom: "1px solid var(--ih-line)", background: "var(--ih-surface-2)" }}>
      {stages.map((stage) => {
        const meta = STAGE_META[stage]
        const isComplete = meta.idx < currentIdx
        const isCurrent = stage === current
        return (
          <div key={stage} onClick={() => onSet(stage)}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "var(--ih-r-md)",
              border: `1px solid ${isCurrent ? "var(--ih-accent)" : "var(--ih-line)"}`,
              background: isCurrent ? "var(--ih-accent-soft)" : isComplete ? "var(--ih-surface)" : "transparent",
              textAlign: "center", cursor: "pointer", position: "relative",
            }}>
            <div className="ih-mono" style={{
              fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
              color: isCurrent ? "var(--ih-accent)" : isComplete ? "var(--ih-ok)" : "var(--ih-ink-40)",
            }}>
              {isComplete && <Icon name="check" size={9} style={{ marginRight: 3 }} />}
              {meta.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function PipelineDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const baseDeal = mockPipeline.getById(id)

  const [stageOverride, setStageOverride] = useState<DealStage | null>(null)
  const [lostReason, setLostReason] = useState<string | null>(null)
  const [extraNotes, setExtraNotes] = useState<Array<{ author: string; initials: string; when: string; body: string }>>([])
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null)
  const [form, setForm] = useState<"none" | "lost" | "proposal" | "note">("none")
  const [lostSel, setLostSel] = useState("Budget constraints")
  const [noteBody, setNoteBody] = useState("")

  if (!baseDeal) {
    return (
      <div style={{ padding: 40 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Pipeline · not found</div>
        <h1 className="ih-serif" style={{ fontSize: 28, margin: "0 0 12px" }}>
          Deal <span className="ih-italic-red">missing</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-65)", marginBottom: 16 }}>
          No deal matches <span className="ih-mono">{id}</span>.
        </p>
        <Link href="/admin/pipeline" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
          <Icon name="chevronLeft" size={12} /> Back to pipeline
        </Link>
      </div>
    )
  }

  const deal: Deal = {
    ...baseDeal,
    stage: stageOverride ?? baseDeal.stage,
    probability: stageOverride ? (STAGE_PROBABILITY[stageOverride] ?? baseDeal.probability) : baseDeal.probability,
    lostReason: lostReason ?? baseDeal.lostReason,
    notes: [...extraNotes, ...baseDeal.notes],
  }
  const meta = STAGE_META[deal.stage]
  const titleWords = deal.title.split(" ")
  const titleHead = titleWords.slice(0, -1).join(" ")
  const titleTail = titleWords.slice(-1)[0]

  function fireToast(msg: string, tone: ToastTone) { setToast({ msg, tone }) }

  function setStage(s: DealStage) {
    setStageOverride(s)
    fireToast(`Moved to ${STAGE_META[s].label}`, "ok")
  }
  function advance() {
    const cur = STAGE_ORDER.indexOf(deal.stage)
    for (let i = cur + 1; i < STAGE_ORDER.length; i++) {
      if (STAGE_ORDER[i] !== "CLOSED_LOST") { setStage(STAGE_ORDER[i]); return }
    }
  }
  function markWon() {
    setStageOverride("CLOSED_WON")
    fireToast("Deal marked Won — engagement queued", "ok")
  }
  function markLost(reason: string) {
    setStageOverride("CLOSED_LOST")
    setLostReason(reason)
    setForm("none")
    fireToast(`Marked lost · ${reason}`, "warn")
  }
  function saveNote() {
    if (!noteBody.trim()) return
    setExtraNotes(prev => [{ author: "Luke Hodges", initials: "LH", when: "just now", body: noteBody.trim() }, ...prev])
    setNoteBody("")
    setForm("none")
    fireToast("Note saved", "ok")
  }

  /* isPastDueClose precomputed at mock layer; override-aware: if user moved deal to terminal stage, treat as not overdue */
  const isPastDue = baseDeal.isPastDueClose && deal.stage !== "CLOSED_WON" && deal.stage !== "CLOSED_LOST"

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Entity header */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Link href="/admin/pipeline" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
              <Icon name="chevronLeft" size={12} /> Pipeline
            </Link>
            <span className="ih-eyebrow ih-mono" style={{ fontSize: 10 }}>/{deal.id} · pipeline</span>
          </div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 36, lineHeight: 1.05 }}>
            {titleHead}{titleHead && " "}<span className="ih-italic-red">{titleTail}</span>
          </h1>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="ih-serif ih-num" style={{ fontSize: 24 }}>£{deal.value.toLocaleString()}</span>
            <span className={`ih-pill ih-pill-${meta.tone}`} style={{ fontSize: 10 }}>{meta.label}</span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{deal.probability}% probability</span>
            <span className="ih-mono" style={{ fontSize: 11, color: isPastDue ? "var(--ih-danger)" : "var(--ih-ink-50)" }}>
              close {deal.expectedClose}{isPastDue && " · overdue"}
            </span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{deal.daysInStage}d in stage</span>
            {deal.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setForm(form === "proposal" ? "none" : "proposal")}>
            <Icon name="mail" size={11} /> Send proposal
          </button>
          {deal.engagementId
            ? <Link href={`/admin/clients/${deal.engagementId}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="handshake" size={11} /> Open engagement
              </Link>
            : <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={markWon}>
                <Icon name="check" size={11} /> Convert to engagement
              </button>}
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ color: "var(--ih-warn)" }} onClick={() => setForm(form === "lost" ? "none" : "lost")}>
            <Icon name="x" size={11} /> Mark lost
          </button>
          {deal.stage !== "CLOSED_WON" && deal.stage !== "CLOSED_LOST" && (
            <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={advance}>
              Advance <Icon name="arrowRight" size={11} />
            </button>
          )}
        </div>
      </div>

      <StageStrip current={deal.stage} onSet={setStage} />

      {/* Body — two-column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 0 }}>
        {/* Left column */}
        <div style={{ padding: "20px 28px 48px", borderRight: "1px solid var(--ih-line)" }}>
          {/* Deal info */}
          <SectionHead eyebrow="deal info" title="Details" />
          <div className="ih-card" style={{ marginBottom: 24 }}>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {([
                ["Source",         SOURCE_LABEL[deal.source]],
                ["Owner",          deal.owner.name],
                ["Created",        deal.createdAt],
                ["Expected close", deal.expectedClose],
                ["Customer",       deal.customer.name],
                ["Primary contact", `${deal.customer.contactName}`],
              ] as Array<[string, string]>).map(([label, value]) => (
                <div key={label}>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lost banner */}
          {deal.stage === "CLOSED_LOST" && deal.lostReason && (
            <div style={{ background: "var(--ih-danger-soft)", borderRadius: "var(--ih-r-md)", padding: "12px 14px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Icon name="x" size={16} style={{ color: "var(--ih-danger)", marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ih-danger)", marginBottom: 2 }}>Marked as lost</div>
                <div style={{ fontSize: 12.5, color: "var(--ih-ink)", lineHeight: 1.45 }}>{deal.lostReason}</div>
              </div>
            </div>
          )}

          {/* Inline forms */}
          {form === "lost" && (
            <div className="ih-card" style={{ padding: 14, marginBottom: 24 }}>
              <SectionHead eyebrow="mark lost" title="Why didn't this close?" />
              <select value={lostSel} onChange={e => setLostSel(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 13, background: "var(--ih-surface)", color: "var(--ih-ink)", marginBottom: 12 }}>
                <option>Budget constraints</option>
                <option>Timing not right</option>
                <option>Went with competitor</option>
                <option>No decision made</option>
                <option>Relationship lost</option>
                <option>Other</option>
              </select>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setForm("none")}>Cancel</button>
                <button className="ih-btn ih-btn-sm" style={{ background: "var(--ih-danger)", color: "#fff", border: 0 }} onClick={() => markLost(lostSel)}>Confirm lost</button>
              </div>
            </div>
          )}
          {form === "proposal" && (
            <div className="ih-card" style={{ padding: 14, marginBottom: 24 }}>
              <SectionHead eyebrow="draft proposal" title={`Send to ${deal.customer.contactName}`} />
              <input className="ih-input" defaultValue={`Proposal — ${deal.title}`} style={{ marginBottom: 8, fontSize: 12 }} />
              <textarea defaultValue={`Hi ${deal.customer.contactName.split(" ")[0]},\n\nProposal for "${deal.title}" — £${deal.value.toLocaleString()}. Available to walk through whenever.\n\nLuke`}
                style={{ width: "100%", minHeight: 140, padding: 12, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 12.5, fontFamily: "inherit", background: "var(--ih-surface)", color: "var(--ih-ink)", resize: "vertical", outline: "none", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setForm("none")}>Discard</button>
                <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setForm("none"); fireToast("Proposal sent · v" + ((deal.proposals[0]?.version ?? 0) + 1), "ok") }}>
                  <Icon name="mail" size={11} /> Send proposal
                </button>
              </div>
            </div>
          )}

          {/* Activity timeline */}
          <SectionHead eyebrow="activity" title="Timeline"
            action={<button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setForm(form === "note" ? "none" : "note")}>
              <Icon name="plus" size={11} /> Add note
            </button>} />

          {form === "note" && (
            <div className="ih-card" style={{ padding: 12, marginBottom: 12 }}>
              <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="What did you learn?"
                style={{ width: "100%", minHeight: 70, padding: 10, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-sm)", fontSize: 12.5, fontFamily: "inherit", background: "var(--ih-surface)", color: "var(--ih-ink)", resize: "vertical", outline: "none", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => { setForm("none"); setNoteBody("") }}>Cancel</button>
                <button className="ih-btn ih-btn-accent ih-btn-sm" disabled={!noteBody.trim()} onClick={saveNote}>Save note</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 0, marginBottom: 24 }}>
            {deal.activity.map((item, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "78px 50px 22px 1fr", gap: 10,
                padding: "10px 0", alignItems: "flex-start",
                borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
              }}>
                <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)", fontWeight: 500 }}>{item.date}</span>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", paddingTop: 2 }}>{item.time}</span>
                <Icon name={item.icon} size={13}
                  style={{
                    color: item.tone === "ok" ? "var(--ih-ok)"
                      : item.tone === "accent" ? "var(--ih-accent)"
                      : item.tone === "warn" ? "var(--ih-warn)"
                      : item.tone === "danger" ? "var(--ih-danger)"
                      : item.tone === "info" ? "var(--ih-info)"
                      : "var(--ih-ink-40)",
                    marginTop: 2,
                  }} />
                <div style={{ fontSize: 12.5 }}>
                  <strong style={{ fontWeight: 500 }}>{item.title}</strong>
                  <span style={{ color: "var(--ih-ink-65)", marginLeft: 6 }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <SectionHead eyebrow="notes" title="Internal notes" />
          {deal.notes.length === 0 && (
            <div style={{ padding: "12px 14px", borderRadius: "var(--ih-r-md)", border: "1px dashed var(--ih-line)", fontSize: 12, color: "var(--ih-ink-50)", marginBottom: 24 }}>
              No notes yet. Add the first one above.
            </div>
          )}
          {deal.notes.map((n, i) => (
            <div key={i} className="ih-card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{n.initials}</div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{n.author}</span>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{n.when}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>{n.body}</div>
            </div>
          ))}

          {/* Proposal history */}
          <SectionHead eyebrow="proposals" title="Proposal history" />
          {deal.proposals.length === 0 && (
            <div style={{ padding: "12px 14px", borderRadius: "var(--ih-r-md)", border: "1px dashed var(--ih-line)", fontSize: 12, color: "var(--ih-ink-50)", marginBottom: 24 }}>
              No proposals sent yet.{" "}
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }} onClick={() => setForm("proposal")}>
                Draft one
              </button>
            </div>
          )}
          {deal.proposals.map(p => (
            <Link key={p.id} href={`/admin/clients/${deal.customer.id}/proposals/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ih-card" style={{ padding: 12, marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>v{p.version} · £{p.value.toLocaleString()}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                    sent {p.sentAt}{p.openedAt && ` · opened ${p.openedAt}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`ih-pill ih-pill-${p.status === "ACCEPTED" ? "ok" : p.status === "DECLINED" ? "danger" : p.status === "OPENED" ? "info" : "warn"}`}
                    style={{ fontSize: 9, padding: "2px 6px" }}>{p.status}</span>
                  <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-40)" }} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Right rail */}
        <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Context</div>

          {/* Stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 14 }}>
            {[
              { label: "Value",       value: `£${deal.value.toLocaleString()}`,                  tone: "var(--ih-ink)" },
              { label: "Probability", value: `${deal.probability}%`,                             tone: deal.probability >= 70 ? "var(--ih-ok)" : "var(--ih-ink)" },
              { label: "Weighted",    value: `£${Math.round(deal.value * deal.probability / 100).toLocaleString()}`, tone: "var(--ih-accent)" },
              { label: "Days in stage", value: `${deal.daysInStage}d`,                           tone: deal.daysInStage > 14 ? "var(--ih-warn)" : "var(--ih-ink)" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
                <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
                <div className="ih-serif ih-num" style={{ fontSize: 18, color: s.tone, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Customer card */}
          <Link href={`/admin/customers/${deal.customer.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Customer</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic" }}>
                  {deal.customer.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{deal.customer.name}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>
                    {deal.engagementId ? "engagement open" : "prospect"}
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Contacts list */}
          <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Contacts · {deal.contacts.length}</span>
            </div>
            <div style={{ padding: "8px 14px" }}>
              {deal.contacts.map((c) => (
                <div key={c.email} style={{ padding: "8px 0", borderBottom: "1px dashed var(--ih-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</span>
                    {c.primary && <span className="ih-pill ih-pill-accent" style={{ fontSize: 8, padding: "1px 5px" }}>PRIMARY</span>}
                  </div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>{c.role}</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--ih-ink-65)" }}>
                    <Icon name="mail" size={10} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ wordBreak: "break-all" }}>{c.email}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--ih-ink-65)", marginTop: 2 }} className="ih-mono">
                    <Icon name="phone" size={10} style={{ flexShrink: 0, marginTop: 2 }} />
                    {c.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement card if won */}
          {deal.engagementId && (
            <Link href={`/admin/clients/${deal.engagementId}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-ok-soft)", borderColor: "transparent", cursor: "pointer" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(47,111,92,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ih-eyebrow" style={{ color: "var(--ih-ok)" }}>Engagement</span>
                  <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ok)" }} />
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Open engagement</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-65)" }}>{deal.engagementId}</div>
                </div>
              </div>
            </Link>
          )}

          {/* Quick actions */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Quick actions</div>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => fireToast(`Calling ${deal.customer.phone}`, "info")}>
              <Icon name="phone" size={11} /> Call {deal.customer.contactName.split(" ")[0]}
            </button>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => fireToast(`Meeting request drafted for ${deal.customer.contactName}`, "info")}>
              <Icon name="calendar" size={11} /> Schedule meeting
            </button>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => { router.push(`/admin/customers/${deal.customer.id}`) }}>
              <Icon name="user" size={11} /> Open customer
            </button>
          </div>
        </div>
      </div>

      {toast && <NotificationToast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
