"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"
import { NotificationToast } from "@/components/shared"

/* ------------------------------------------------------------------ */
/*  Types + constants                                                  */
/* ------------------------------------------------------------------ */

interface LineItem {
  description: string
  quantity: number
  rate: number
}

const PAYMENT_TERMS = ["Due on receipt", "Net 7", "Net 14", "Net 30", "Custom"]

const CLIENTS = [
  { name: "Northwind Co.", contact: "Mira Sato", initials: "MS" },
  { name: "Olsen Brands", contact: "Tomas Olsen", initials: "TO" },
  { name: "Meridian Health", contact: "Dr. Priya Kapoor", initials: "PK" },
]

const ENGAGEMENTS = [
  { id: "eng_0481", label: "Q2 Retainer — Northwind" },
  { id: "eng_0312", label: "Initial Discovery — Northwind" },
]

const MILESTONES = [
  { id: "ms_01", label: "Audit findings (50%)" },
  { id: "ms_02", label: "Implementation (25%)" },
  { id: "ms_03", label: "Handover (25%)" },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="ih-eyebrow" style={{ display: "block", marginBottom: 6, fontSize: 10 }}>{children}</label>
}

function Btn({ children, accent, ghost, sm, onClick, style }: { children: React.ReactNode; accent?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  const cls = ["ih-btn", sm && "ih-btn-sm", ghost && "ih-btn-ghost", accent && "ih-btn-accent"].filter(Boolean).join(" ")
  return <button className={cls} onClick={onClick} style={style}>{children}</button>
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewInvoicePage() {
  const router = useRouter()
  const [toast, setToast] = useState<{ message: string; tone?: string } | null>(null)
  const [selectedClient, setSelectedClient] = useState("Northwind Co.")
  const [clientSearch, setClientSearch] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "Operational audit — findings report (50% milestone)", quantity: 1, rate: 5104.17 },
  ])
  const [vatEnabled, setVatEnabled] = useState(true)
  const [vatRate, setVatRate] = useState(20)
  const [dueDate, setDueDate] = useState("2025-05-24")
  const [paymentTerms, setPaymentTerms] = useState("Net 14")
  const [linkedEngagement, setLinkedEngagement] = useState("eng_0481")
  const [linkedMilestone, setLinkedMilestone] = useState("ms_01")
  const [notes, setNotes] = useState("")

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0
  const total = subtotal + vatAmount

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    if (field === "description") {
      updated[index] = { ...updated[index], description: value as string }
    } else {
      updated[index] = { ...updated[index], [field]: Number(value) || 0 }
    }
    setLineItems(updated)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const filteredClients = CLIENTS.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact.toLowerCase().includes(clientSearch.toLowerCase())
  )

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px" }} onClick={() => router.push("/platform/payments")}>
              <Icon name="chevronLeft" size={12} /> Back
            </button>
            <span className="ih-eyebrow">new invoice · <span style={{ color: "var(--ih-accent)" }}>★</span></span>
          </div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>Create invoice</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn sm ghost onClick={() => router.push("/platform/payments")}>Cancel</Btn>
          <Btn sm ghost onClick={() => { setToast({ message: "Invoice saved as draft", tone: "ok" }); setTimeout(() => router.push("/platform/payments"), 1500) }}><Icon name="file" size={11} /> Save Draft</Btn>
          <Btn sm accent onClick={() => { setToast({ message: "Invoice sent to client", tone: "ok" }); setTimeout(() => router.push("/platform/payments"), 1500) }}><Icon name="mail" size={11} /> Send to Client</Btn>
        </div>
      </div>

      {/* Form body */}
      <div style={{ maxWidth: 760, padding: "28px 28px 48px" }}>
        {/* Client selector */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Client</FieldLabel>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)" }}>
              <Icon name="search" size={13} style={{ color: "var(--ih-ink-40)" }} />
              <input
                type="text"
                placeholder="Search clients..."
                value={selectedClient || clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setSelectedClient("") }}
                style={{ flex: 1, border: 0, background: "transparent", fontSize: 13, color: "var(--ih-ink)", outline: "none" }}
              />
            </div>
            {clientSearch && !selectedClient && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {filteredClients.map((c) => (
                  <div
                    key={c.name}
                    onClick={() => { setSelectedClient(c.name); setClientSearch("") }}
                    style={{ display: "flex", gap: 10, padding: "10px 14px", cursor: "pointer", alignItems: "center", borderTop: "1px solid var(--ih-line)" }}
                  >
                    <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{c.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{c.contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <FieldLabel>Line items</FieldLabel>
            <Btn sm ghost onClick={addLineItem}><Icon name="plus" size={11} /> Add line</Btn>
          </div>
          <div className="ih-card" style={{ padding: 0 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px 32px", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--ih-line)" }}>
              {["Description", "Qty", "Rate (£)", "Amount", ""].map(h => (
                <div key={h} className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {lineItems.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px 32px", gap: 10, padding: "8px 14px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", alignItems: "center" }}>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLineItem(i, "description", e.target.value)}
                  placeholder="Description..."
                  style={{ border: 0, background: "transparent", fontSize: 13, color: "var(--ih-ink)", outline: "none", padding: "4px 0" }}
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 12, color: "var(--ih-ink)", textAlign: "right", background: "var(--ih-surface)" }}
                />
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) => updateLineItem(i, "rate", e.target.value)}
                  step="0.01"
                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 12, color: "var(--ih-ink)", textAlign: "right", background: "var(--ih-surface)" }}
                />
                <span className="ih-mono" style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>
                  £{(item.quantity * item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => removeLineItem(i)}
                  style={{ background: "none", border: 0, cursor: lineItems.length > 1 ? "pointer" : "default", color: lineItems.length > 1 ? "var(--ih-ink-40)" : "transparent", padding: 4 }}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, marginBottom: 24 }}>
          {/* VAT toggle */}
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <FieldLabel>VAT</FieldLabel>
              <button
                onClick={() => setVatEnabled(!vatEnabled)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  border: "1px solid var(--ih-line)",
                  background: vatEnabled ? "var(--ih-accent)" : "var(--ih-surface-2)",
                  cursor: "pointer",
                  position: "relative",
                  padding: 0,
                }}
              >
                <span style={{ position: "absolute", top: 2, left: vatEnabled ? 18 : 2, width: 14, height: 14, borderRadius: 7, background: "#fff", transition: "left 0.2s" }} />
              </button>
              {vatEnabled && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    style={{ width: 50, padding: "4px 8px", border: "1px solid var(--ih-line)", borderRadius: 6, fontSize: 12, textAlign: "right", background: "var(--ih-surface)", color: "var(--ih-ink)" }}
                  />
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>%</span>
                </div>
              )}
            </div>
          </div>
          {/* Total box */}
          <div style={{ padding: 16, border: "1px solid var(--ih-line)", borderRadius: 10, background: "var(--ih-surface-2)" }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ih-ink-65)" }}>
                <span>Subtotal</span>
                <span className="ih-mono">£{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {vatEnabled && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ih-ink-65)" }}>
                  <span>VAT ({vatRate}%)</span>
                  <span className="ih-mono">£{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--ih-line)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
                <span className="ih-serif" style={{ fontSize: 22 }}>£{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Due date + payment terms */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div>
            <FieldLabel>Due date</FieldLabel>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            />
          </div>
          <div>
            <FieldLabel>Payment terms</FieldLabel>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            >
              {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Linked engagement + milestone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div>
            <FieldLabel>Link to engagement (optional)</FieldLabel>
            <select
              value={linkedEngagement}
              onChange={(e) => setLinkedEngagement(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            >
              <option value="">None</option>
              {ENGAGEMENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Link to milestone (optional)</FieldLabel>
            <select
              value={linkedMilestone}
              onChange={(e) => setLinkedMilestone(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface)", fontSize: 13, color: "var(--ih-ink)" }}
            >
              <option value="">None</option>
              {MILESTONES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 32 }}>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes or message to client..."
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              border: "1px solid var(--ih-line)",
              borderRadius: 8,
              background: "var(--ih-surface)",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--ih-ink)",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        {/* Submit actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn sm ghost onClick={() => router.push("/platform/payments")}>Cancel</Btn>
          <Btn sm ghost onClick={() => { setToast({ message: "Invoice saved as draft", tone: "ok" }); setTimeout(() => router.push("/platform/payments"), 1500) }}><Icon name="file" size={11} /> Save Draft</Btn>
          <Btn sm accent onClick={() => { setToast({ message: "Invoice sent to client", tone: "ok" }); setTimeout(() => router.push("/platform/payments"), 1500) }}><Icon name="mail" size={11} /> Send to Client</Btn>
        </div>
      </div>

      {toast && <NotificationToast message={toast.message} tone={toast.tone as "ok"} onDismiss={() => setToast(null)} />}
    </div>
  )
}
