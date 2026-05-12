"use client"

import { useState } from "react"
import Link from "next/link"
import { NotificationToast, ConfirmDialog } from "@/components/shared"
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InvoiceDetailPage() {
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{title: string; desc: string; label: string; action: () => void}>({title:"",desc:"",label:"",action:()=>{}})
  const invoice = {
    number: "NW-002",
    client: "Northwind Co.",
    description: "Audit findings (50%)",
    amount: 6125,
    currency: "\u00A3",
    status: "SENT",
    issuedDate: "4 Apr 2025",
    dueDate: "18 Apr 2025",
    vat: 1020.83,
    subtotal: 5104.17,
  }

  const lineItems = [
    { description: "Operational audit \u2014 findings report (50% milestone)", qty: 1, rate: 5104.17, amount: 5104.17 },
  ]

  const timeline = [
    { date: "4 Apr 2025", time: "09:00", event: "Invoice sent", icon: "mail" as const, tone: "ok" },
    { date: "4 Apr 2025", time: "09:42", event: "Email opened by Mira Sato", icon: "eye" as const, tone: "info" },
    { date: "12 Apr 2025", time: "10:00", event: "Friendly chase sent (auto)", icon: "mail" as const, tone: "muted" },
    { date: "18 Apr 2025", time: "\u2014", event: "Due date passed \u2014 14 days overdue", icon: "flag" as const, tone: "warn" },
  ]

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* ---- Entity header ---- */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Link href="/admin/payments" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
              <Icon name="chevronLeft" size={12} /> Invoices
            </Link>
            <span className="ih-eyebrow">/inv_2041 {"·"} invoice</span>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
            <h1 className="ih-mono" style={{ margin: 0, fontSize: 32, lineHeight: 1, letterSpacing: "-0.02em" }}>{invoice.number}</h1>
            <span style={{ fontSize: 16, color: "var(--ih-ink-65)" }}>{invoice.client}</span>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <span className="ih-serif" style={{ fontSize: 28 }}>{invoice.currency}{invoice.amount.toLocaleString()}</span>
            <span className="ih-pill ih-pill-warn" style={{ fontSize: 10 }}>
              <span className="ih-dot ih-dot-warn" /> {invoice.status}
            </span>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>Due {invoice.dueDate}</span>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Btn sm ghost onClick={() => setToast({message: "Payment reminder sent", tone: "ok"})}><Icon name="mail" size={11} /> Send Reminder</Btn>
          <Btn sm ghost onClick={() => { setConfirmAction({title:"Mark as paid?",desc:"This will update the invoice status to PAID.",label:"Mark Paid",action:() => { setConfirmOpen(false); setToast({message:"Invoice marked as paid",tone:"ok"}) }}); setConfirmOpen(true) }}><Icon name="check" size={11} /> Mark as Paid</Btn>
          <Btn sm ghost onClick={() => setToast({message: "Payment recorded", tone: "ok"})}><Icon name="money" size={11} /> Record Payment</Btn>
          <Btn sm ghost style={{ color: "var(--ih-warn)" }} onClick={() => { setConfirmAction({title:"Void invoice?",desc:"This action cannot be undone. The invoice will be marked as void.",label:"Void",action:() => { setConfirmOpen(false); setToast({message:"Invoice voided",tone:"warn"}) }}); setConfirmOpen(true) }}>Void</Btn>
          <Btn sm ghost onClick={() => setToast({message: "Export started — check your downloads", tone: "ok"})}><Icon name="download" size={11} /> PDF</Btn>
          <Btn sm accent onClick={() => setToast({message: "Chase email sent to client", tone: "ok"})}><Icon name="mail" size={11} /> Send Chase</Btn>
        </div>
      </div>

      {/* ---- Body: two-column ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 0 }}>
        {/* Left column */}
        <div style={{ padding: "20px 28px 48px", borderRight: "1px solid var(--ih-line)" }}>
          {/* Invoice body card */}
          <SectionHead eyebrow="invoice" title="Line items" />
          <div className="ih-card" style={{ marginBottom: 24 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 90px", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--ih-line)" }}>
              {["Description", "Qty", "Rate", "Amount"].map(h => (
                <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: h !== "Description" ? "right" : "left" }}>{h}</div>
              ))}
            </div>
            {/* Line items */}
            {lineItems.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 90px", gap: 12, padding: "12px 20px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{item.description}</span>
                <span className="ih-mono" style={{ textAlign: "right", color: "var(--ih-ink-65)" }}>{item.qty}</span>
                <span className="ih-mono" style={{ textAlign: "right" }}>{invoice.currency}{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="ih-mono" style={{ textAlign: "right", fontWeight: 600 }}>{invoice.currency}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {/* Totals */}
            <div style={{ borderTop: "1px solid var(--ih-line)", padding: "12px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8, maxWidth: 280, marginLeft: "auto" }}>
                <span style={{ fontSize: 12, color: "var(--ih-ink-65)" }}>Subtotal</span>
                <span className="ih-mono" style={{ fontSize: 12, textAlign: "right" }}>{invoice.currency}{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span style={{ fontSize: 12, color: "var(--ih-ink-65)" }}>VAT (20%)</span>
                <span className="ih-mono" style={{ fontSize: 12, textAlign: "right" }}>{invoice.currency}{invoice.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
                <span className="ih-mono" style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{invoice.currency}{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <SectionHead eyebrow="payment" title="Payment information" />
          <div className="ih-card" style={{ marginBottom: 24 }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Method</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Stripe</div>
                </div>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Reference</div>
                  <div className="ih-mono" style={{ fontSize: 12 }}>pi_3NdX2sKb5a...pending</div>
                </div>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Stripe link</div>
                  <button
                    className="ih-btn ih-btn-quiet ih-btn-sm"
                    style={{ fontSize: 12, color: "var(--ih-accent)", padding: 0, height: "auto" }}
                    onClick={() => setToast({ message: "Opening Stripe dashboard...", tone: "info" })}
                  >
                    Open in Stripe <Icon name="arrowUpRight" size={10} />
                  </button>
                </div>
                <div>
                  <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Paid date</div>
                  <div className="ih-mono" style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>{"\u2014"} awaiting payment</div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <SectionHead eyebrow="timeline" title="Invoice history" />
          <div style={{ display: "grid", gap: 0 }}>
            {timeline.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 44px 20px 1fr",
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
                      : item.tone === "warn" ? "var(--ih-warn)"
                      : item.tone === "info" ? "var(--ih-info)"
                      : "var(--ih-ink-40)",
                    marginTop: 2,
                  }}
                />
                <span style={{ fontSize: 12.5 }}>{item.event}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ padding: "20px 20px 48px", background: "var(--ih-surface-2)" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 14 }}>Right rail {"·"} context</div>

          {/* Client link */}
          <Link href="/admin/clients/c-northwind" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Client</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 12, background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)" }}>
                  <span style={{ fontStyle: "italic", fontFamily: "var(--ih-font-serif)" }}>N</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Northwind Co.</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>Mira Sato {"·"} Founder</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Linked engagement */}
          <Link href="/admin/clients/c-northwind" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)", cursor: "pointer" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ih-eyebrow">Linked engagement</span>
                <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Q2 Retainer {"·"} Sprint 4</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 4 }}>/eng_0481 {"·"} AUDITING</div>
              </div>
            </div>
          </Link>

          {/* Payment rule reference */}
          <div className="ih-card" style={{ marginBottom: 12, background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Payment rule</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>50/25/25 milestone split</div>
              <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", marginTop: 4 }}>This invoice covers the audit findings milestone (50% of {"\u00A3"}12,250 total).</div>
              <div style={{ display: "grid", gap: 4, marginTop: 10 }}>
                {([
                  ["50% Audit findings", "\u00A36,125", "warn", true],
                  ["25% Implementation", "\u00A33,062", "muted", false],
                  ["25% Handover", "\u00A33,063", "muted", false],
                ] as [string, string, string, boolean][]).map(([label, amt, tone, current]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 6, border: current ? "1px solid var(--ih-accent)" : "1px solid var(--ih-line)", background: current ? "var(--ih-accent-soft)" : "transparent" }}>
                    <span style={{ fontSize: 11, fontWeight: current ? 500 : 400 }}>{label}</span>
                    <span className="ih-mono" style={{ fontSize: 11, fontWeight: 600 }}>{amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="ih-card" style={{ background: "var(--ih-surface)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              <span className="ih-eyebrow">Invoice stats</span>
            </div>
            <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
              {([
                ["Days since sent", "36 days"],
                ["Days overdue", "22 days"],
                ["Client avg. pay time", "12 days"],
                ["Chases sent", "1"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11.5, color: "var(--ih-ink-65)" }}>{label}</span>
                  <span className="ih-mono" style={{ fontSize: 11.5, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
      <ConfirmDialog open={confirmOpen} title={confirmAction.title} description={confirmAction.desc} confirmLabel={confirmAction.label} onConfirm={confirmAction.action} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
