"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"

type EngagementType = "PROJECT" | "RETAINER" | "HYBRID"
type Source = "REFERRAL" | "OUTREACH" | "INBOUND" | "OTHER"

export default function NewClientPage() {
  const router = useRouter()

  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [industry, setIndustry] = useState("")
  const [source, setSource] = useState<Source>("REFERRAL")
  const [engagementType, setEngagementType] = useState<EngagementType>("PROJECT")
  const [engagementTitle, setEngagementTitle] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = () => {
    // Demo only — would call tRPC mutation
    router.push("/admin/clients")
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: 13,
    border: "1px solid var(--ih-line)",
    borderRadius: 8,
    background: "var(--ih-surface)",
    color: "var(--ih-ink)",
    outline: "none",
    fontFamily: "inherit",
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    color: "var(--ih-ink-65)",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/clients")}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: "var(--ih-ink-50)",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        <Icon name="chevronLeft" size={11} /> Back to Clients
      </button>

      {/* Header */}
      <h1 className="ih-serif" style={{ margin: "0 0 6px", fontSize: 32 }}>New Client</h1>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--ih-ink-50)" }}>
        Create a new client with their first engagement. They&apos;ll start at Discovery.
      </p>

      {/* Company section */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 16 }}>Company</div>
        <div>
          <label style={labelStyle}>Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Northwind Co."
            style={inputStyle}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Industry</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Architecture, Property Management, SaaS"
            style={inputStyle}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as Source)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="REFERRAL">Referral</option>
            <option value="OUTREACH">Outreach</option>
            <option value="INBOUND">Inbound</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Primary contact section */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 16 }}>Primary contact</div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Mira Sato"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="mira@northwind.co"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 7700 900482"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Engagement section */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 16 }}>First engagement</div>

        {/* Type toggle buttons */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Engagement type</label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["PROJECT", "RETAINER", "HYBRID"] as EngagementType[]).map((t) => (
              <button
                key={t}
                onClick={() => setEngagementType(t)}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: engagementType === t ? 600 : 400,
                  border: `1px solid ${engagementType === t ? "var(--ih-accent)" : "var(--ih-line)"}`,
                  borderRadius: 6,
                  background: engagementType === t ? "var(--ih-accent-soft)" : "transparent",
                  color: engagementType === t ? "var(--ih-accent)" : "var(--ih-ink-65)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Engagement title</label>
          <input
            type="text"
            value={engagementTitle}
            onChange={(e) => setEngagementTitle(e.target.value)}
            placeholder="e.g. Q2 Retainer, Portal Rebuild, Workflow Audit"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Notes section */}
      <div className="ih-card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 16 }}>Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything relevant — how you met, their pain points, referral context..."
          rows={4}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 80,
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => router.push("/admin/clients")}
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            color: "var(--ih-ink-50)",
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          Cancel
        </button>
        <button
          className="ih-btn ih-btn-accent"
          onClick={handleSubmit}
          style={{ padding: "10px 24px", fontSize: 13 }}
        >
          Create Client
        </button>
      </div>
    </div>
  )
}
