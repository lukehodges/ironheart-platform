"use client"

import { Icon } from "@/components/shell"

/* ── Demo data ──────────────────────────────────────────────────────────── */

const INVOICES = [
  {
    id: "NW-001",
    description: "Sprint 3 — discovery + Stripe sync build",
    amount: "\u00a312,250",
    status: "paid" as const,
    dueDate: "18 Apr 2026",
    paidDate: "16 Apr 2026",
  },
  {
    id: "NW-002",
    description: "Sprint 4 (1 of 2) — approval workflow + portal v2 start",
    amount: "\u00a36,125",
    status: "sent" as const,
    dueDate: "15 May 2026",
    paidDate: null,
  },
  {
    id: "NW-003",
    description: "Sprint 4 (2 of 2) — portal v2 completion + digest email",
    amount: "\u00a36,125",
    status: "draft" as const,
    dueDate: "30 May 2026",
    paidDate: null,
  },
]

const STATUS_CONFIG = {
  paid:  { label: "Paid",  pill: "ih-pill-ok" },
  sent:  { label: "Sent",  pill: "ih-pill-warn" },
  draft: { label: "Draft", pill: "" },
} as const

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function InvoicesPage() {
  const total = "\u00a324,500"
  const paid = "\u00a312,250"
  const due = "\u00a36,125"

  return (
    <div style={{ padding: "40px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 className="ih-serif" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>Your invoices</h1>
      <p style={{ marginTop: 10, fontSize: 14, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
        {total} total &middot; {paid} paid &middot; {due} due
      </p>

      {/* Invoice cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
        {INVOICES.map((inv) => {
          const cfg = STATUS_CONFIG[inv.status]
          return (
            <div key={inv.id} className="ih-card" style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Left side */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span className="ih-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--ih-ink-65)" }}>{inv.id}</span>
                    <span className={`ih-pill ${cfg.pill}`} style={{ fontSize: 9 }}>{cfg.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>
                    {inv.description}
                  </p>
                  <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                    <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>
                      Due {inv.dueDate}
                    </span>
                    {inv.paidDate && (
                      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ok)" }}>
                        Paid {inv.paidDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: amount + action */}
                <div style={{ textAlign: "right", marginLeft: 24, flexShrink: 0 }}>
                  <div className="ih-serif" style={{ fontSize: 28, lineHeight: 1, fontWeight: 500 }}>{inv.amount}</div>
                  {inv.status === "sent" && (
                    <button className="ih-btn ih-btn-accent ih-btn-sm" style={{ marginTop: 12 }}>
                      Pay now
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Payment note */}
      <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 8, color: "var(--ih-ink-40)" }}>
        <Icon name="shield" size={13} />
        <span style={{ fontSize: 12 }}>Payments processed securely via Stripe</span>
      </div>
    </div>
  )
}
