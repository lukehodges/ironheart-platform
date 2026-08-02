"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import type { OutreachReplySentiment } from "@/modules/outreach"

const SENTIMENT_LABEL: Record<OutreachReplySentiment, string> = {
  positive: "Positive",
  neutral: "Not now",
  negative: "Negative",
}

export default function ReplyTriageSection() {
  const [showHandled, setShowHandled] = useState(false)
  const repliesQ = api.outreach.listRepliesEnriched.useQuery({
    needsReview: !showHandled || undefined,
    handled: showHandled ? true : undefined,
    sinceDays: 30,
    limit: 50,
  })
  const utils = api.useUtils()
  const classify = api.outreach.classifyReply.useMutation({
    onSuccess: () => {
      utils.outreach.listRepliesEnriched.invalidate()
      utils.outreach.listLeads.invalidate()
    },
  })
  const handle = api.outreach.markReplyHandled.useMutation({
    onSuccess: () => utils.outreach.listRepliesEnriched.invalidate(),
  })

  const replies = repliesQ.data ?? []

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="head">
        <div>
          <h4>Reply triage</h4>
          <div className="sub">
            INBOX · LAST 30 DAYS · {replies.length} {showHandled ? "HANDLED" : "TO REVIEW"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn ${!showHandled ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setShowHandled(false)}
          >
            ⚑ Needs review
          </button>
          <button
            className={`btn ${showHandled ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setShowHandled(true)}
          >
            ✓ Handled
          </button>
        </div>
      </div>
      <div style={{ maxHeight: 480, overflowY: "auto" }}>
        {repliesQ.isLoading && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--obs-ink-40)" }}>Loading…</div>
        )}
        {!repliesQ.isLoading && replies.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--obs-ink-50)", fontStyle: "italic", fontFamily: "var(--obs-serif)", fontSize: 16 }}>
            {showHandled
              ? "No handled replies in the last 30 days."
              : "Inbox clear. When inbound replies arrive (via Gmail processor), they'll appear here for classification."}
          </div>
        )}
        {replies.map((r) => (
          <div key={r.id} style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--obs-line)",
            background: r.sentiment === "positive" ? "var(--obs-ok-soft)"
              : r.sentiment === "negative" ? "var(--obs-danger-soft)"
              : "transparent",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {r.lead.name} <span style={{ color: "var(--obs-ink-65)", fontWeight: 400 }}>· {r.lead.company}</span>
                </div>
                <div style={{ fontFamily: "var(--obs-mono)", fontSize: 11, color: "var(--obs-ink-50)" }}>
                  {r.lead.email || "no email"} · {r.touch?.subjectRendered ?? r.subject ?? "(no subject)"} · {new Date(r.receivedAt).toLocaleDateString()}
                </div>
              </div>
              {r.sentiment && (
                <span className={`sentiment-chip ${r.sentiment}`}>
                  {SENTIMENT_LABEL[r.sentiment]}
                </span>
              )}
              <span className={`owner-chip ${r.lead.owner}`}>{r.lead.owner.toUpperCase()}</span>
            </div>
            <div style={{
              background: "var(--obs-surface-2)",
              borderRadius: 7,
              padding: "9px 12px",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--obs-ink)",
              marginBottom: 8,
              whiteSpace: "pre-wrap",
              maxHeight: 140,
              overflowY: "auto",
            }}>
              {r.body || <em style={{ color: "var(--obs-ink-40)" }}>(no body captured)</em>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!showHandled && (
                <>
                  <button
                    className="btn"
                    style={{ background: "var(--obs-ok-soft)", borderColor: "var(--obs-ok)", color: "var(--obs-ok)" }}
                    disabled={classify.isPending}
                    onClick={() => classify.mutate({ replyId: r.id, sentiment: "positive", classifiedBy: "luke" })}
                  >✓ Positive</button>
                  <button
                    className="btn"
                    onClick={() => classify.mutate({ replyId: r.id, sentiment: "neutral", classifiedBy: "luke" })}
                  >• Not now</button>
                  <button
                    className="btn"
                    style={{ color: "var(--obs-danger)", borderColor: "var(--obs-danger)" }}
                    onClick={() => classify.mutate({ replyId: r.id, sentiment: "negative", classifiedBy: "luke" })}
                  >× Negative</button>
                  <div style={{ flex: 1 }} />
                  <button
                    className="btn btn-ghost"
                    onClick={() => handle.mutate({ id: r.id, sentiment: r.sentiment ?? undefined })}
                  >Mark handled</button>
                </>
              )}
              {showHandled && (
                <>
                  <span style={{ fontSize: 11, color: "var(--obs-ink-50)", fontFamily: "var(--obs-mono)" }}>
                    handled {r.handledAt ? new Date(r.handledAt).toLocaleDateString() : ""}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button
                    className="btn btn-ghost"
                    onClick={() => handle.mutate({ id: r.id })}
                  >Reopen</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
