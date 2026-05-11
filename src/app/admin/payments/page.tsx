"use client"

import { Icon } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */

type Invoice = {
  id: string; number: string; client: string; description: string;
  amount: number; issued: string; due: string;
  status: "paid" | "sent" | "overdue" | "draft"; method: string;
}

const INVOICES: Invoice[] = [
  { id: "inv-1", number: "INV-2041", client: "Northwind Logistics", description: "Q2 retainer \u00b7 Month 2", amount: 14200, issued: "Apr 28", due: "May 12", status: "sent", method: "Stripe" },
  { id: "inv-2", number: "INV-2039", client: "Northwind Logistics", description: "Q2 retainer \u00b7 Month 1", amount: 14200, issued: "Mar 28", due: "Apr 11", status: "paid", method: "Stripe" },
  { id: "inv-3", number: "INV-2035", client: "Vellum & Co.", description: "Portal rebuild \u00b7 Sprint 3", amount: 16000, issued: "Apr 15", due: "Apr 29", status: "paid", method: "Bank transfer" },
  { id: "inv-4", number: "INV-2032", client: "Castor Foods", description: "Customer ops audit", amount: 22000, issued: "Apr 10", due: "Apr 24", status: "paid", method: "Stripe" },
  { id: "inv-5", number: "INV-2028", client: "Brigham Architects", description: "Workflow rebuild \u00b7 Phase 2", amount: 4000, issued: "Mar 20", due: "Apr 03", status: "overdue", method: "Bank transfer" },
  { id: "inv-6", number: "INV-2024", client: "Arden Health", description: "Booking system audit", amount: 38000, issued: "Mar 12", due: "Mar 26", status: "paid", method: "Stripe" },
  { id: "inv-7", number: "INV-2050", client: "Olsen Brands", description: "Discovery sprint", amount: 8400, issued: "May 8", due: "May 22", status: "draft", method: "\u2014" },
  { id: "inv-8", number: "INV-2020", client: "Bowery Mills", description: "Monthly retainer \u00b7 April", amount: 4200, issued: "Apr 01", due: "Apr 15", status: "paid", method: "Stripe" },
]

type OverdueItem = {
  id: string; client: string; amount: number; daysOverdue: number; lastChase: string;
}

const OVERDUE: OverdueItem[] = [
  { id: "od-1", client: "Brigham Architects", amount: 4000, daysOverdue: 37, lastChase: "3 reminders sent \u00b7 no reply" },
  { id: "od-2", client: "Sea Glass Studio", amount: 1800, daysOverdue: 14, lastChase: "1 reminder sent \u00b7 opened" },
  { id: "od-3", client: "Greystone Digital", amount: 600, daysOverdue: 8, lastChase: "Invoice sent \u00b7 not opened" },
]

const STATUS_TONE: Record<string, string> = { paid: "ok", sent: "warn", overdue: "danger", draft: "muted" }

const TH: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--ih-font-mono)" }

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function PaymentsPage() {
  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Finance &middot; invoices & payments</div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            &pound;184k invoiced. <span className="ih-italic-red">&pound;142k</span> collected.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={12}/> Export</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm"><Icon name="plus" size={12}/> New invoice</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Total invoiced", v: "\u00a3184k", d: "+12%", h: "this quarter", icon: "invoice" as const, tone: "var(--ih-ink)" },
          { l: "Collected", v: "\u00a3142k", d: "+\u00a318k", h: "this month", icon: "check" as const, tone: "var(--ih-ok)" },
          { l: "Outstanding", v: "\u00a328.4k", d: "6 invoices", h: "awaiting payment", icon: "clock" as const, tone: "var(--ih-warn)" },
          { l: "Overdue", v: "\u00a36.4k", d: "3 invoices", h: "chase required", icon: "flag" as const, tone: "var(--ih-danger)" },
          { l: "Avg days to pay", v: "14d", d: "\u22122d", h: "improving", icon: "bolt" as const, tone: "var(--ih-ink)" },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 28, lineHeight: 1, color: s.tone }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: s.tone === "var(--ih-danger)" ? "var(--ih-danger)" : "var(--ih-ok)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Invoices + Overdue chase */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
        {/* Invoice table */}
        <div className="ih-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="ih-eyebrow">All invoices</span>
              <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Ledger</h3>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="filter" size={11}/> Filter</button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="search" size={11}/></button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--ih-surface-2)" }}>
                <th style={{ ...TH, paddingLeft: 18 }}>Number</th>
                <th style={TH}>Client</th>
                <th style={TH}>Description</th>
                <th style={TH}>Amount</th>
                <th style={TH}>Issued</th>
                <th style={TH}>Due</th>
                <th style={TH}>Status</th>
                <th style={TH}>Method</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer" }}>
                  <td style={{ padding: "10px 12px 10px 18px" }}>
                    <span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{inv.number}</span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{inv.client}</td>
                  <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }}>{inv.description}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>&pound;{inv.amount.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{inv.issued}</span></td>
                  <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: inv.status === "overdue" ? "var(--ih-danger)" : "var(--ih-ink-50)" }}>{inv.due}</span></td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className={`ih-pill ih-pill-${STATUS_TONE[inv.status]}`} style={{ fontSize: 9, padding: "2px 6px" }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{inv.method}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
            <span>8 invoices</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronLeft" size={11}/></button>
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronRight" size={11}/></button>
            </div>
          </div>
        </div>

        {/* Overdue chase queue */}
        <div>
          <div className="ih-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", background: "var(--ih-danger-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="flag" size={13} style={{ color: "var(--ih-danger)" }} />
                <span className="ih-eyebrow" style={{ color: "var(--ih-danger)" }}>Chase queue &middot; overdue</span>
              </div>
              <div className="ih-serif" style={{ fontSize: 20, marginTop: 4, color: "var(--ih-danger)" }}>&pound;6,400 outstanding</div>
            </div>
            {OVERDUE.map((item, i) => (
              <div key={item.id} style={{ padding: 16, borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.client}</div>
                    <div className="ih-mono" style={{ fontSize: 11, color: "var(--ih-danger)", marginTop: 2 }}>&pound;{item.amount.toLocaleString()} &middot; {item.daysOverdue}d overdue</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ih-ink-50)", marginBottom: 10 }}>{item.lastChase}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="ih-btn ih-btn-accent ih-btn-sm"><Icon name="mail" size={11}/> Chase</button>
                  <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="phone" size={11}/> Call</button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment summary */}
          <div className="ih-card ih-card-pad" style={{ marginTop: 14 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>This month</div>
            {([
              ["Paid", "\u00a318,200", "ok"],
              ["Pending", "\u00a314,200", "warn"],
              ["Overdue", "\u00a36,400", "danger"],
            ] as [string, string, string][]).map(([label, value, tone]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--ih-line)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span className={`ih-dot ih-dot-${tone}`} /> {label}
                </span>
                <span className="ih-mono" style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
