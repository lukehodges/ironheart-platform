"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachLeadOwner } from "@/modules/outreach"

interface SendListModalProps {
  open: boolean
  owner: OutreachLeadOwner
  count: number
  hypothesisId?: string
  onClose: () => void
}

interface Draft {
  subject: string
  body: string
}

/** Build a mailto: link from whatever the user has typed (spaces → %20). */
function buildMailto(to: string, subject: string, body: string): string {
  const qs = new URLSearchParams({ subject, body })
    .toString()
    .replace(/\+/g, "%20")
  return `mailto:${to}${qs ? `?${qs}` : ""}`
}

export default function SendListModal({
  open,
  owner,
  count,
  hypothesisId,
  onClose,
}: SendListModalProps) {
  const utils = api.useUtils()
  // Raw leads — no frozen template. You write the email on top of the research.
  const batchQ = api.outreach.pullBatch.useQuery(
    { owner, count, hypothesisId },
    { enabled: open },
  )
  const invalidate = () => {
    utils.outreach.listLeads.invalidate()
    utils.outreach.tabCounts.invalidate()
    utils.outreach.listDailyActivity.invalidate()
  }
  const markBatchSent = api.outreach.markBatchSent.useMutation({
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })
  const markSent = api.outreach.markLeadSent.useMutation({ onSuccess: invalidate })

  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const draftFor = (id: string): Draft => drafts[id] ?? { subject: "", body: "" }
  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }))

  const batch = batchQ.data ?? []
  const remaining = batch.filter((lead) => !sentIds.has(lead.id))

  if (!open) return null

  function handleSendOne(leadId: string) {
    setSentIds((prev) => new Set(prev).add(leadId))
    markSent.mutate({ id: leadId })
  }

  function handleBulkSent() {
    const ids = batch.map((l) => l.id).filter((id) => !sentIds.has(id))
    if (ids.length === 0) return
    markBatchSent.mutate({ leadIds: ids })
  }

  return (
    <div className="obs">
      <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal" style={{ width: "min(1100px, 100%)" }}>
          <div className="mhead">
            <div>
              <h3>Send list — {batch.length} leads · {owner.charAt(0).toUpperCase() + owner.slice(1)}</h3>
              <div style={{ fontFamily: "var(--obs-mono)", fontSize: 11, color: "var(--obs-ink-50)", marginTop: 2 }}>
                {remaining.length} remaining · {sentIds.size} marked sent this session
              </div>
            </div>
            <button className="close" onClick={onClose}>×</button>
          </div>

          <div style={{
            padding: "10px 22px",
            background: "var(--obs-surface-2)",
            color: "var(--obs-ink-65)",
            fontSize: 12.5,
            borderBottom: "1px solid var(--obs-line)",
          }}>
            Raw leads + research. Write the email on top — the research box is a
            reference, not something to paste. Typing fills the mailto link.
          </div>

          <div className="mbody" style={{ padding: 0, maxHeight: "65vh", overflowY: "auto" }}>
            {batchQ.isLoading && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--obs-ink-40)" }}>Loading leads…</div>
            )}
            {!batchQ.isLoading && batch.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--obs-ink-50)", fontStyle: "italic", fontFamily: "var(--obs-serif)", fontSize: 16 }}>
                No ready + researched leads for {owner}. Add some via the New Lead button or run the research workflow.
              </div>
            )}
            {!batchQ.isLoading && batch.map((lead, i) => {
              const isSent = sentIds.has(lead.id)
              const isPending = markSent.isPending && markSent.variables?.id === lead.id
              const draft = draftFor(lead.id)
              const canSend = !!lead.email && (draft.subject.trim() !== "" || draft.body.trim() !== "")
              return (
                <div
                  key={lead.id}
                  style={{
                    padding: "16px 22px",
                    borderBottom: "1px solid var(--obs-line)",
                    background: isSent ? "var(--obs-ok-soft)" : i % 2 === 0 ? "transparent" : "var(--obs-surface-2)",
                    opacity: isSent ? 0.65 : 1,
                    transition: "background 0.15s, opacity 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--obs-mono)", fontSize: 10.5, color: "var(--obs-ink-40)", minWidth: 28 }}>
                      #{i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>
                        {lead.name} <span style={{ color: "var(--obs-ink-65)", fontWeight: 400 }}>· {lead.company}</span>
                      </div>
                      <div style={{ fontFamily: "var(--obs-mono)", fontSize: 11, color: "var(--obs-ink-50)" }}>
                        {lead.email || "no email"} {lead.website && <>· <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--obs-info)" }}>{lead.website} ↗</a></>}
                      </div>
                    </div>
                    <span className={`status-pill ${lead.status}`} style={{ flexShrink: 0 }}>
                      <span className="dot" />{lead.status === "dnc" ? "DNC" : lead.status[0].toUpperCase() + lead.status.slice(1)}
                    </span>
                  </div>

                  {lead.researchNotes && (
                    <details style={{ marginBottom: 8 }}>
                      <summary style={{ fontFamily: "var(--obs-mono)", fontSize: 10, color: "var(--obs-ink-40)", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                        Research (reference — don't paste)
                      </summary>
                      <div style={{
                        marginTop: 6,
                        background: "var(--obs-surface)",
                        border: "1px solid var(--obs-line)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "var(--obs-ink-65)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}>{lead.researchNotes}</div>
                    </details>
                  )}

                  <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                    <input
                      value={draft.subject}
                      onChange={(e) => setDraft(lead.id, { subject: e.target.value })}
                      placeholder="Subject…"
                      disabled={isSent}
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        padding: "8px 12px",
                        border: "1px solid var(--obs-line)",
                        borderRadius: 8,
                        background: "var(--obs-surface)",
                        color: "var(--obs-ink)",
                      }}
                    />
                    <textarea
                      value={draft.body}
                      onChange={(e) => setDraft(lead.id, { body: e.target.value })}
                      placeholder="Write the email…"
                      rows={5}
                      disabled={isSent}
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        padding: "8px 12px",
                        border: "1px solid var(--obs-line)",
                        borderRadius: 8,
                        background: "var(--obs-surface)",
                        color: "var(--obs-ink)",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!isSent && canSend && (
                      <a
                        href={buildMailto(lead.email ?? "", draft.subject, draft.body)}
                        className="btn btn-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSendOne(lead.id)}
                      >
                        ✉ Open in mail client + mark sent
                      </a>
                    )}
                    {!isSent && !lead.email && (
                      <span style={{ fontSize: 11.5, color: "var(--obs-warn)" }}>No email address — can't send</span>
                    )}
                    {!isSent && (
                      <button
                        className="btn"
                        onClick={() => handleSendOne(lead.id)}
                        disabled={isPending}
                        title="Mark sent without opening the mail client (e.g. sent from Instantly / externally)"
                      >
                        {isPending ? "…" : "✓ Mark sent"}
                      </button>
                    )}
                    {isSent && (
                      <span style={{ fontSize: 12, color: "var(--obs-ok)", fontWeight: 500 }}>
                        ✓ Marked sent
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontFamily: "var(--obs-mono)", fontSize: 10.5, color: "var(--obs-ink-50)" }}>
                      lead #{String(lead.number).padStart(3, "0")}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mfoot">
            <div style={{ marginRight: "auto", fontFamily: "var(--obs-mono)", fontSize: 11, color: "var(--obs-ink-50)" }}>
              Clicking a mailto link opens your default email client with what you typed. The lead is auto-marked sent.
            </div>
            <button className="btn" onClick={onClose}>Close</button>
            {remaining.length > 0 && (
              <button
                className="btn"
                onClick={handleBulkSent}
                disabled={markBatchSent.isPending}
                title="Mark all remaining as sent without opening mail client (e.g. when you sent externally)"
              >
                {markBatchSent.isPending ? "Marking…" : `✓ Mark all ${remaining.length} as sent`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
