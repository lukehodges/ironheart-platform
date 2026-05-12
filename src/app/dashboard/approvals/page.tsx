"use client"

import { useState } from "react"
import { NotificationToast, ConfirmDialog } from "@/components/shared"
import { Icon } from "@/components/shell"

/* ── Demo data ──────────────────────────────────────────────────────────── */

const PENDING = [
  {
    id: "a1",
    title: "Q2 final invoice",
    description: "Sprint 4 completion billing \u2014 covers 40 hours at the retainer rate plus 6 hours of overage on Portal v2.",
    amount: "\u00a314,200",
    type: "invoice" as const,
  },
  {
    id: "a2",
    title: "Portal v2 copy review",
    description: "Three strings in the messaging view need your confirmation before we push to production on Friday.",
    amount: null,
    type: "review" as const,
  },
]

const HISTORY = [
  { id: "h1", title: "Sprint 3 invoice", date: "18 Apr 2026" },
  { id: "h2", title: "Engagement contract renewal", date: "02 Apr 2026" },
  { id: "h3", title: "Stripe sync scope sign-off", date: "21 Mar 2026" },
  { id: "h4", title: "Q1 final invoice", date: "28 Feb 2026" },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ApprovalsPage() {
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{title: string; desc: string; label: string; action: () => void}>({title:"",desc:"",label:"",action:()=>{}})
  return (
    <div style={{ padding: "40px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 className="ih-serif" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>
        {PENDING.length} items need your sign-off
      </h1>
      <p style={{ marginTop: 10, fontSize: 14, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
        Review and approve to keep things moving.
      </p>

      {/* Pending approvals */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
        {PENDING.map((item) => (
          <div key={item.id} className="ih-card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="ih-dot ih-dot-accent" />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{item.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ih-ink-65)", lineHeight: 1.6, maxWidth: 560 }}>
                  {item.description}
                </p>
              </div>
              {item.amount && (
                <div className="ih-serif" style={{ fontSize: 24, fontWeight: 500, whiteSpace: "nowrap", marginLeft: 24 }}>
                  {item.amount}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={() => { setConfirmAction({title:"Approve this item?",desc:"This will mark the item as approved and notify the studio.",label:"Approve",action:() => { setConfirmOpen(false); setToast({message:"Item approved",tone:"ok"}) }}); setConfirmOpen(true) }}>Approve</button>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Comment dialog coming soon", tone: "info"})}>Comment</button>
            </div>
          </div>
        ))}
      </div>

      {/* Approved history */}
      <div style={{ marginTop: 48 }}>
        <h2 className="ih-eyebrow" style={{ marginBottom: 16 }}>Previously approved</h2>
        <div className="ih-card" style={{ overflow: "hidden" }}>
          {HISTORY.map((item, i) => (
            <div
              key={item.id}
              style={{
                padding: "14px 20px",
                borderTop: i === 0 ? "none" : "1px solid var(--ih-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="check" size={13} style={{ color: "var(--ih-ok)" }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</span>
              </div>
              <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      <ConfirmDialog open={confirmOpen} title={confirmAction.title} description={confirmAction.desc} confirmLabel={confirmAction.label} onConfirm={confirmAction.action} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
