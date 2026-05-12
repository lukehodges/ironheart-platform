"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

export interface EmailDraftDialogProps {
  open: boolean
  onClose: () => void
  to: string
  subject: string
  body: string
  onSend: () => void
}

export function EmailDraftDialog({ open, onClose, to, subject, body, onSend }: EmailDraftDialogProps) {
  const [toVal, setToVal] = useState(to)
  const [subjectVal, setSubjectVal] = useState(subject)
  const [bodyVal, setBodyVal] = useState(body)

  if (!open) return null

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(14,16,19,0.3)" }} onClick={onClose} />
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9991,
        width: "100%",
        maxWidth: 560,
        background: "var(--ih-surface)",
        border: "1px solid var(--ih-line)",
        borderRadius: "var(--ih-r-xl, 12px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="mail" size={14} style={{ color: "var(--ih-accent)" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Draft email</span>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={onClose}>
            <Icon name="x" size={12} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ih-ink-50)", marginBottom: 4 }}>To</label>
            <input className="ih-input" value={toVal} onChange={e => setToVal(e.target.value)} style={{ width: "100%", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ih-ink-50)", marginBottom: 4 }}>Subject</label>
            <input className="ih-input" value={subjectVal} onChange={e => setSubjectVal(e.target.value)} style={{ width: "100%", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ih-ink-50)", marginBottom: 4 }}>Body</label>
            <textarea className="ih-input" value={bodyVal} onChange={e => setBodyVal(e.target.value)} rows={8} style={{ width: "100%", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", padding: "10px 12px" }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={onClose}>Cancel</button>
          <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={onSend}>
            <Icon name="mail" size={11} /> Send
          </button>
        </div>
      </div>
    </>
  )
}
