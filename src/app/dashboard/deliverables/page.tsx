"use client"

import { useState } from "react"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

/* ── Demo data ──────────────────────────────────────────────────────────── */

interface Deliverable {
  id: string
  title: string
  status: "live" | "in-review" | "queued"
  description: string
  shippedDate: string | null
  file: string | null
}

const DELIVERABLES: Deliverable[] = [
  {
    id: "d1",
    title: "Stripe \u2192 Airtable sync",
    status: "live",
    description: "Bi-directional sync between Stripe payments and Airtable project tracker. Runs every 15 minutes via scheduled Inngest function.",
    shippedDate: "22 Apr 2026",
    file: "stripe-sync-runbook.pdf",
  },
  {
    id: "d2",
    title: "Approval workflow",
    status: "live",
    description: "Multi-step approval chain for invoices and deliverables. Supports delegation, escalation, and automatic reminders after 48h.",
    shippedDate: "06 May 2026",
    file: "approval-workflow-spec.pdf",
  },
  {
    id: "d3",
    title: "Portal v2",
    status: "in-review",
    description: "Redesigned client portal with deliverables view, invoice management, document hub, and real-time messaging. Currently awaiting your review.",
    shippedDate: null,
    file: null,
  },
  {
    id: "d4",
    title: "Monthly digest email",
    status: "queued",
    description: "Automated monthly summary email with sprint progress, hours consumed, upcoming sessions, and outstanding approvals.",
    shippedDate: null,
    file: null,
  },
]

const STATUS_CONFIG = {
  "live":      { label: "Live",      dot: "ok",     pill: "ih-pill-ok" },
  "in-review": { label: "In review", dot: "accent", pill: "ih-pill-accent" },
  "queued":    { label: "Queued",    dot: "muted",  pill: "" },
} as const

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DeliverablesPage() {
  const [reviewComment, setReviewComment] = useState("")
  const [toast, setToast] = useState<{ message: string; tone?: string } | null>(null)
  const [deliverables, setDeliverables] = useState(DELIVERABLES)
  const liveCount = deliverables.filter(d => d.status === "live").length
  const reviewCount = deliverables.filter(d => d.status === "in-review").length
  const queuedCount = deliverables.filter(d => d.status === "queued").length

  return (
    <div style={{ padding: "40px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 className="ih-serif" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>Your deliverables</h1>
      <p style={{ marginTop: 10, fontSize: 14, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
        {deliverables.length} items &middot; {liveCount} shipped, {reviewCount} in review, {queuedCount} queued
      </p>

      {/* Deliverable cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
        {deliverables.map((d) => {
          const cfg = STATUS_CONFIG[d.status]
          return (
            <div key={d.id} className="ih-card" style={{ padding: "24px 28px" }}>
              {/* Top row: title + status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`ih-dot ih-dot-${cfg.dot}`} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{d.title}</h3>
                </div>
                <span className={`ih-pill ${cfg.pill}`} style={{ fontSize: 10 }}>{cfg.label}</span>
              </div>

              {/* Description */}
              <p style={{ margin: 0, fontSize: 13, color: "var(--ih-ink-65)", lineHeight: 1.6, maxWidth: 640 }}>
                {d.description}
              </p>

              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 14 }}>
                {d.shippedDate && (
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>
                    Shipped {d.shippedDate}
                  </span>
                )}
                {d.file && (
                  <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ display: "flex", alignItems: "center", gap: 5 }} onClick={() => setToast({message: "Download started — check your downloads", tone: "ok"})}>
                    <Icon name="download" size={11} />
                    {d.file}
                  </button>
                )}
              </div>

              {/* Review section for in-review items */}
              {d.status === "in-review" && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--ih-line)" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ih-ink-65)", display: "block", marginBottom: 8 }}>
                    Leave a comment
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Notes, questions, or change requests..."
                    style={{
                      width: "100%",
                      minHeight: 80,
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid var(--ih-line)",
                      background: "var(--ih-surface)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                      resize: "vertical",
                      color: "var(--ih-ink)",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => {
                      setDeliverables(prev => prev.map(item => item.id === d.id ? { ...item, status: "live" as const, shippedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) } : item))
                      setReviewComment("")
                      setToast({ message: "Feedback submitted", tone: "ok" })
                    }}>Submit feedback</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {toast && <NotificationToast message={toast.message} tone={toast.tone as "ok"} onDismiss={() => setToast(null)} />}
    </div>
  )
}
