"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/trpc/react"

interface AddToDncDialogProps {
  open: boolean
  lead: { id: string; name: string; company: string; email: string | null } | null
  onClose: () => void
  onAdded?: () => void
}

type Scope = "email" | "domain"

const RADIO_LABEL: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: 0,
  textTransform: "none",
  letterSpacing: 0,
  fontFamily: "inherit",
  fontSize: 13,
}

function domainOf(email: string | null): string | null {
  if (!email) return null
  const at = email.indexOf("@")
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

export default function AddToDncDialog({
  open,
  lead,
  onClose,
  onAdded,
}: AddToDncDialogProps) {
  const [scope, setScope] = useState<Scope>("email")
  const [reason, setReason] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const utils = api.useUtils()
  const addDnc = api.outreach.addDnc.useMutation()
  const updateLead = api.outreach.updateLead.useMutation()

  useEffect(() => {
    if (open) {
      setScope("email")
      setReason("")
      setErr(null)
      setBusy(false)
    }
  }, [open, lead?.id])

  if (!open || !lead) return null

  const domain = domainOf(lead.email)
  const canSubmit =
    reason.trim().length > 0 &&
    !busy &&
    (scope === "email" ? Boolean(lead.email) : Boolean(domain))

  async function handleSubmit() {
    if (!lead) return
    setErr(null)
    setBusy(true)
    try {
      const payload =
        scope === "email"
          ? { email: lead.email ?? undefined, reason: reason.trim() }
          : { domain: domain ?? undefined, reason: reason.trim() }
      await addDnc.mutateAsync(payload)
      await updateLead.mutateAsync({ id: lead.id, status: "dnc" })
      await Promise.all([
        utils.outreach.listLeads.invalidate(),
        utils.outreach.tabCounts.invalidate(),
        utils.outreach.listDnc.invalidate(),
      ])
      onAdded?.()
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add to DNC"
      setErr(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="obs">
      <div
        className="modal-bg"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="modal" style={{ width: "min(520px,100%)" }}>
          <div className="mhead">
            <h3>Add to DNC — {lead.name}</h3>
            <button className="close" onClick={onClose} type="button">×</button>
          </div>
          <div className="mbody">
            <div
              style={{
                background: "var(--obs-surface-2)",
                borderRadius: 9,
                padding: "12px 14px",
                marginBottom: 14,
                fontFamily: "var(--obs-mono)",
                fontSize: 12,
                color: "var(--obs-ink-65)",
                lineHeight: 1.7,
              }}
            >
              <div><b style={{ color: "var(--obs-ink)" }}>{lead.name}</b> · {lead.company}</div>
              <div>{lead.email ?? "no email on file"}</div>
            </div>

            <label>Scope</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ ...RADIO_LABEL, color: "var(--obs-ink)" }}>
                <input type="radio" name="dnc-scope" checked={scope === "email"} onChange={() => setScope("email")} disabled={!lead.email} style={{ width: "auto" }} />
                Block this email only{lead.email ? ` (${lead.email})` : ""}
              </label>
              <label style={{ ...RADIO_LABEL, color: domain ? "var(--obs-ink)" : "var(--obs-ink-40)" }}>
                <input type="radio" name="dnc-scope" checked={scope === "domain"} onChange={() => setScope("domain")} disabled={!domain} style={{ width: "auto" }} />
                Block whole domain{domain ? ` (@${domain})` : ""}
              </label>
            </div>

            <label>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this lead going to DNC?"
            />

            {err ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 7,
                  background: "var(--obs-danger-soft)",
                  color: "var(--obs-danger)",
                  fontSize: 12,
                }}
              >
                {err}
              </div>
            ) : null}
          </div>
          <div className="mfoot">
            <button className="btn" onClick={onClose} type="button" disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              style={{ background: "var(--obs-danger)", borderColor: "var(--obs-danger)" }}
            >
              {busy ? "Adding…" : "Add to DNC"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
