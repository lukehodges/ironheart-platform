"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachLeadOwner } from "@/modules/outreach"

interface SendListModalProps {
  open: boolean
  owner: OutreachLeadOwner
  count: number
  hypothesisId?: string
  onClose: () => void
}

export default function SendListModal({
  open,
  owner,
  count,
  hypothesisId,
  onClose,
}: SendListModalProps) {
  const utils = api.useUtils()
  const batchQ = api.outreach.composeBatch.useQuery(
    { owner, count, hypothesisId },
    { enabled: open },
  )
  const markBatchSent = api.outreach.markBatchSent.useMutation({
    onSuccess: () => {
      utils.outreach.listLeads.invalidate()
      utils.outreach.tabCounts.invalidate()
      utils.outreach.listDailyActivity.invalidate()
      onClose()
    },
  })
  const markSent = api.outreach.markLeadSent.useMutation({
    onSuccess: () => {
      utils.outreach.listLeads.invalidate()
      utils.outreach.tabCounts.invalidate()
      utils.outreach.listDailyActivity.invalidate()
    },
  })

  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const batch = batchQ.data ?? []
  const remaining = batch.filter((item) => !sentIds.has(item.lead.id))
  const allHaveObservations = useMemo(
    () => batch.every((b) => b.lead.researched && b.lead.researchNotes),
    [batch],
  )

  if (!open) return null

  function handleSendOne(leadId: string) {
    setSentIds((prev) => new Set(prev).add(leadId))
    markSent.mutate({ id: leadId })
  }

  function handleBulkSent() {
    const ids = batch.map((b) => b.lead.id).filter((id) => !sentIds.has(id))
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

          {!allHaveObservations && batch.length > 0 && (
            <div style={{
              padding: "10px 22px",
              background: "var(--obs-warn-soft)",
              color: "var(--obs-warn)",
              fontSize: 12.5,
              borderBottom: "1px solid var(--obs-line)",
            }}>
              ⚠ Some leads lack research notes. The email will contain a [NO OBSERVATION] placeholder — fill in before clicking the mailto link.
            </div>
          )}

          <div className="mbody" style={{ padding: 0, maxHeight: "65vh", overflowY: "auto" }}>
            {batchQ.isLoading && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--obs-ink-40)" }}>Loading batch…</div>
            )}
            {!batchQ.isLoading && batch.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--obs-ink-50)", fontStyle: "italic", fontFamily: "var(--obs-serif)", fontSize: 16 }}>
                No ready + researched leads for {owner}. Add some via the New Lead button or run the forensic research workflow.
              </div>
            )}
            {!batchQ.isLoading && batch.map(({ lead, composed }, i) => {
              const isSent = sentIds.has(lead.id)
              const isPending = markSent.isPending && markSent.variables?.id === lead.id
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

                  <div style={{
                    background: "var(--obs-surface)",
                    border: "1px solid var(--obs-line)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 8,
                  }}>
                    <div style={{ fontFamily: "var(--obs-mono)", fontSize: 10, color: "var(--obs-ink-40)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                      Subject
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{composed.subject}</div>
                    <div style={{ fontFamily: "var(--obs-mono)", fontSize: 10, color: "var(--obs-ink-40)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                      Body
                    </div>
                    <pre style={{
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      whiteSpace: "pre-wrap",
                      color: "var(--obs-ink)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}>{composed.body}</pre>
                    {composed.warnings.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--obs-warn)", fontFamily: "var(--obs-mono)" }}>
                        {composed.warnings.join("; ")}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!isSent && composed.mailto && (
                      <a
                        href={composed.mailto}
                        className="btn btn-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSendOne(lead.id)}
                      >
                        ✉ Open in mail client + mark sent
                      </a>
                    )}
                    {!isSent && !composed.mailto && (
                      <span style={{ fontSize: 11.5, color: "var(--obs-warn)" }}>No email address — can't send</span>
                    )}
                    {!isSent && (
                      <button
                        className="btn"
                        onClick={() => handleSendOne(lead.id)}
                        disabled={isPending}
                      >
                        {isPending ? "…" : "✓ Mark sent (no email)"}
                      </button>
                    )}
                    {isSent && (
                      <span style={{ fontSize: 12, color: "var(--obs-ok)", fontWeight: 500 }}>
                        ✓ Marked sent
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <a
                      href={`/platform/outreach?leadId=${lead.id}`}
                      style={{ fontFamily: "var(--obs-mono)", fontSize: 10.5, color: "var(--obs-ink-50)" }}
                      onClick={(e) => e.preventDefault()}
                    >
                      lead #{String(lead.number).padStart(3, "0")}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mfoot">
            <div style={{ marginRight: "auto", fontFamily: "var(--obs-mono)", fontSize: 11, color: "var(--obs-ink-50)" }}>
              Clicking a mailto link opens your default email client. The lead is auto-marked sent.
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
