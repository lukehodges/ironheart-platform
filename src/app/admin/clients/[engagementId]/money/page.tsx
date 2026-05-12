"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast, DropdownMenu } from "@/components/shared"
import { Icon } from "@/components/shell"

/* -- Data ----------------------------------------------------------------- */
const CASHFLOW = [
  { m: "Jan", paid: 0, expected: 0, recurring: false },
  { m: "Feb", paid: 0, expected: 0, recurring: false },
  { m: "Mar", paid: 12.25, expected: 0, recurring: false },
  { m: "Apr", paid: 0, expected: 6.125, recurring: false },
  { m: "May", paid: 0, expected: 6.125, recurring: false },
  { m: "Jun", paid: 0, expected: 4.2, recurring: true },
]

const INVOICES = [
  { n: "NW-001", desc: "Engagement deposit", amt: 12250, date: "Mar 20", paid: "Mar 22", due: "", status: "PAID", method: "Stripe · card" },
  { n: "NW-002", desc: "Audit findings (50%)", amt: 6125, date: "Apr 04", paid: "", due: "Apr 18", status: "SENT", method: "Stripe · pending" },
  { n: "NW-003", desc: "Roadmap & handover", amt: 6125, date: "—", paid: "", due: "On completion", status: "DRAFT", method: "Auto on milestone" },
]

/* -- Page ----------------------------------------------------------------- */
export default function MoneyPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)
  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Money {"·"} proposal {"·"} invoices {"·"} cashflow, fused</div>
          <h1 className="ih-serif" style={{ fontSize: 28, margin: 0 }}>The <span className="ih-italic-red">money</span></h1>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
          {[
            { l: "Total value", v: "£24,500", tone: "var(--ih-ink)" },
            { l: "Paid to date", v: "£12,250", tone: "var(--ih-ok)" },
            { l: "Outstanding", v: "£6,125", tone: "var(--ih-accent)" },
            { l: "Upcoming", v: "£6,125", tone: "var(--ih-ink-65)" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "right" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.l}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 22, color: s.tone, lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Proposal strip */}
      <div className="ih-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Proposal v2 {"·"} approved Mar 18</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Map workflows, audit, deliver 3-mo roadmap</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => router.push("/admin/clients/c-northwind/proposals/prop-v2")}><Icon name="eye" size={11} /> View</button>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Creating proposal revision...", tone: "info"})}><Icon name="plus" size={11} /> Revise</button>
          </div>
        </div>
        {/* Payment schedule horizontal */}
        <div style={{ display: "flex", gap: 0, alignItems: "stretch", marginTop: 14, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", background: "var(--ih-surface-2)" }}>
          {[
            { label: "Deposit", amt: "£12,250", trigger: "On signing", paid: true, sent: false },
            { label: "Audit done", amt: "£6,125", trigger: "On milestone #3", paid: false, sent: true },
            { label: "Handover", amt: "£6,125", trigger: "On completion", paid: false, sent: false },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ flex: 1, padding: "12px 14px", borderRight: i < arr.length - 1 ? "1px solid var(--ih-line)" : "none", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.14em" }}>0{i + 1}</span>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: s.paid ? "var(--ih-ok)" : s.sent ? "var(--ih-warn)" : "var(--ih-surface-3)", border: "1px solid var(--ih-line)" }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.label}</div>
              <div className="ih-num" style={{ fontSize: 16, marginTop: 4 }}>{s.amt}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-50)", marginTop: 4 }}>{s.trigger}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: s.paid ? "var(--ih-ok)" : s.sent ? "var(--ih-warn)" : "var(--ih-ink-40)", marginTop: 2 }}>
                {s.paid ? "● paid Mar 22" : s.sent ? "● sent · awaiting" : "● auto on milestone"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cashflow forecast */}
      <div className="ih-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Cashflow forecast {"·"} this engagement</div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-65)" }}>Includes retainer projection if proposal v3 is signed</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ih-ink-50)" }}>
            <span><span className="ih-dot ih-dot-ok" style={{ marginRight: 6 }} /> Paid</span>
            <span><span className="ih-dot ih-dot-accent" style={{ marginRight: 6 }} /> Expected</span>
            <span><span className="ih-dot ih-dot-muted" style={{ marginRight: 6 }} /> Projected retainer</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, padding: "8px 0", borderTop: "1px solid var(--ih-line)" }}>
          {CASHFLOW.map((c) => {
            const total = c.paid + c.expected
            const max = 14
            return (
              <div key={c.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-65)" }}>{"£"}{(total || c.expected).toFixed(1)}K</div>
                <div style={{ width: "100%", maxWidth: 80, height: 96, position: "relative", display: "flex", flexDirection: "column-reverse", gap: 1 }}>
                  {c.paid > 0 && <div style={{ height: `${(c.paid / max) * 96}px`, background: "var(--ih-ok)", borderRadius: c.expected ? 0 : "2px 2px 0 0" }} />}
                  {c.expected > 0 && <div style={{ height: `${(c.expected / max) * 96}px`, background: c.recurring ? "var(--ih-surface-3)" : "var(--ih-accent)", borderTop: c.recurring ? "1px dashed var(--ih-accent)" : "none", borderRadius: "2px 2px 0 0" }} />}
                </div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{c.m}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoice table */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="ih-eyebrow">Invoices {"·"} 3</div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Export started — check your downloads", tone: "ok"})}><Icon name="download" size={11} /> Export CSV</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)", borderBottom: "1px solid var(--ih-line)" }}>
              {["Invoice", "Description", "Amount", "Issued", "Due", "Status", "Method", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: "var(--ih-font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ih-ink-40)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.n} style={{ borderBottom: "1px solid var(--ih-line)" }}>
                <td style={{ padding: "10px 12px", fontFamily: "var(--ih-font-mono)", fontSize: 11 }}>{inv.n}</td>
                <td style={{ padding: "10px 12px" }}>{inv.desc}</td>
                <td style={{ padding: "10px 12px", fontFamily: "var(--ih-font-mono)", fontWeight: 500 }}>{"£"}{inv.amt.toLocaleString()}</td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }} className="ih-mono">{inv.date}</td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-65)" }} className="ih-mono">{inv.due || inv.paid}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span className={`ih-pill ${inv.status === "PAID" ? "ih-pill-ok" : inv.status === "SENT" ? "ih-pill-warn" : ""}`} style={{ fontSize: 9 }}>{inv.status}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--ih-ink-50)", fontSize: 11 }}>{inv.method}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <DropdownMenu
                    trigger={<button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="moreH" size={11} /></button>}
                    items={[
                      { label: "View details", onClick: () => setToast({ message: "Invoice details loaded", tone: "info" }) },
                      { label: "Send reminder", onClick: () => setToast({ message: "Payment reminder sent", tone: "ok" }) },
                      { label: "Download PDF", onClick: () => { setToast({ message: "Exporting PDF...", tone: "info" }); setTimeout(() => setToast({ message: "PDF downloaded", tone: "ok" }), 1000) } },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
