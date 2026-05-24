"use client"

/**
 * Slimmer prospect-side inspector. Shows ONLY:
 *   - Label (editable)
 *   - Email (editable via clientUpdateNodeMeta)
 *   - Tenure years (editable via clientUpdateNodeMeta)
 *   - isFractional (editable via clientUpdateNode patch on .type — actually
 *     not exposed: kept as a read-only pill since the client mutation schema
 *     forbids depth fields except via the dedicated procs)
 *   - Audit flags (read-only pills if any)
 *   - Interview status (read-only pill — consultant-only edit per HANDOFF)
 *
 * Hides: kind editor, audit-flag editor, form status edit, edge-style edit,
 * avatar colour, isFounder toggle, danger-delete.
 */

import { useEffect, useRef, useState } from "react"
import { X, Mail } from "lucide-react"
import { api } from "@/lib/trpc/react"
import type { DemoNode, AuditFlag as DemoAuditFlag, InterviewStatus as DemoInterviewStatus } from "@/app/platform/clients/[id]/onboarding/demo/_components/types"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"

const AVATAR_HEX: Record<string, { bg: string; fg: string }> = {
  indigo: { bg: "#E4E4F3", fg: "#3F3D8C" },
  amber: { bg: "#F4E9D0", fg: "#7A5910" },
  rose: { bg: "#F2DEE2", fg: "#8C3147" },
  teal: { bg: "#D6E8E5", fg: "#2F6F5C" },
  emerald: { bg: "#D8E8DD", fg: "#2F6F4C" },
  violet: { bg: "#E6DEEF", fg: "#5A3F84" },
  sky: { bg: "#D8E5EF", fg: "#2A5DBF" },
  stone: { bg: "#E5E2DA", fg: "#4A4740" },
}
const avatarColors = (key: string | null) => (key && AVATAR_HEX[key]) || { bg: "var(--ih-surface-2)", fg: "var(--ih-ink-65)" }
const initialsOf = (name: string) => name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

const INTERVIEW_META: Record<DemoInterviewStatus, { label: string; tone: string; bg: string }> = {
  NOT_TARGET: { label: "Not on shortlist", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)" },
  TARGET: { label: "Target", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  INVITED: { label: "Invited", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)" },
  SCHEDULED: { label: "Scheduled", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  COMPLETED: { label: "Interview done", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)" },
  DECLINED: { label: "Declined", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)" },
}

const FLAG_LABEL: Record<DemoAuditFlag, string> = {
  DECISION_MAKER: "Decision maker",
  FINANCE_OWNER: "Finance owner",
  DATA_OWNER: "Data owner",
  DPO: "DPO",
  SECURITY_OWNER: "Security owner",
  PROCESS_OWNER: "Process owner",
  FOUNDER: "Founder",
}

interface PortalInspectorProps {
  node: DemoNode
  row: OrgChartTree
  engagementId: string
  onClose: () => void
}

export function PortalInspector({ node, row, engagementId, onClose }: PortalInspectorProps) {
  const utils = api.useUtils()
  const invalidate = () => utils.onboarding.clientGetChart.invalidate({ engagementId })

  const updateNode = api.onboarding.clientUpdateNode.useMutation({ onSuccess: invalidate })
  const updateMeta = api.onboarding.clientUpdateNodeMeta.useMutation({ onSuccess: invalidate })

  const [labelDraft, setLabelDraft] = useState(row.label)
  const labelTimer = useRef<number | null>(null)
  useEffect(() => { setLabelDraft(row.label) }, [row.id, row.label])
  useEffect(() => {
    if (labelDraft === row.label) return
    if (labelTimer.current !== null) window.clearTimeout(labelTimer.current)
    labelTimer.current = window.setTimeout(() => {
      updateNode.mutate({ id: row.id, version: row.version, patch: { label: labelDraft } })
    }, 600)
    return () => { if (labelTimer.current !== null) window.clearTimeout(labelTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelDraft])

  const [emailDraft, setEmailDraft] = useState(row.email ?? "")
  const emailTimer = useRef<number | null>(null)
  useEffect(() => { setEmailDraft(row.email ?? "") }, [row.id, row.email])
  useEffect(() => {
    const trimmed = emailDraft.trim()
    const current = row.email ?? ""
    if (trimmed === current) return
    if (emailTimer.current !== null) window.clearTimeout(emailTimer.current)
    emailTimer.current = window.setTimeout(() => {
      updateMeta.mutate({ nodeId: row.id, email: trimmed === "" ? null : trimmed })
    }, 600)
    return () => { if (emailTimer.current !== null) window.clearTimeout(emailTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailDraft])

  const [tenureDraft, setTenureDraft] = useState<string>(row.tenureYears == null ? "" : String(row.tenureYears))
  const tenureTimer = useRef<number | null>(null)
  useEffect(() => { setTenureDraft(row.tenureYears == null ? "" : String(row.tenureYears)) }, [row.id, row.tenureYears])
  useEffect(() => {
    const parsed = tenureDraft.trim() === "" ? null : Math.max(0, Math.floor(Number(tenureDraft)))
    if (parsed === row.tenureYears) return
    if (tenureDraft.trim() !== "" && Number.isNaN(parsed)) return
    if (tenureTimer.current !== null) window.clearTimeout(tenureTimer.current)
    tenureTimer.current = window.setTimeout(() => {
      updateMeta.mutate({ nodeId: row.id, tenureYears: parsed })
    }, 600)
    return () => { if (tenureTimer.current !== null) window.clearTimeout(tenureTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenureDraft])

  const { bg: avBg, fg: avFg } = avatarColors(row.avatarColor)
  const isPersonish =
    node.kind === "PERSON" || node.kind === "CONTRACTOR" || node.kind === "ADVISOR" || node.kind === "EXTERNAL" || node.kind === "VACANCY"
  const interviewMeta = INTERVIEW_META[node.interviewStatus]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: -22,
          marginTop: -22,
          marginLeft: -22,
          marginRight: -22,
          paddingTop: 14,
          paddingBottom: 10,
          paddingLeft: 22,
          paddingRight: 22,
          background: "color-mix(in srgb, var(--ih-surface) 92%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderBottom: "1px solid var(--ih-line)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isPersonish && (
            <span style={{ width: 30, height: 30, borderRadius: 999, background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              {initialsOf(node.name) || "—"}
            </span>
          )}
          <span className="ih-eyebrow">{node.kind.toLowerCase()}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          style={{ width: 30, height: 30, borderRadius: 6, background: "var(--ih-surface)", border: "1px solid var(--ih-line-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ih-ink-65)" }}
        >
          <X size={14} />
        </button>
      </div>

      <Field label="Label">
        <input
          type="text"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          style={inputStyle()}
        />
      </Field>

      {isPersonish && (
        <>
          <Field label="Email">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={12} style={{ color: "var(--ih-ink-50)", flexShrink: 0 }} />
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="name@company.com"
                style={inputStyle()}
              />
            </div>
          </Field>

          <Field label="Tenure (years)">
            <input
              type="number"
              min={0}
              value={tenureDraft}
              onChange={(e) => setTenureDraft(e.target.value)}
              placeholder="0"
              style={inputStyle()}
            />
          </Field>

          {row.isFractional && (
            <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "3px 8px", borderRadius: 999, fontSize: 10.5, color: "var(--ih-warn)", background: "var(--ih-warn-soft)", border: "1px solid rgba(184,134,11,0.3)", letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "var(--ih-font-mono)" }}>
              Fractional
            </div>
          )}

          {node.auditFlags.length > 0 && (
            <Field label="Flagged by your consultant">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {node.auditFlags.map((f) => (
                  <span
                    key={f}
                    className="ih-mono"
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 9.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ih-ink-65)",
                      background: "var(--ih-surface-2)",
                      border: "1px solid var(--ih-line)",
                    }}
                  >
                    {FLAG_LABEL[f]}
                  </span>
                ))}
              </div>
            </Field>
          )}

          <Field label="Interview status (read-only)">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 6,
                background: interviewMeta.bg,
                border: `1px solid ${interviewMeta.tone}`,
                color: interviewMeta.tone,
                fontSize: 12,
                fontFamily: "var(--ih-font-sans)",
                fontWeight: 500,
                alignSelf: "flex-start",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: interviewMeta.tone }} />
              {interviewMeta.label}
            </div>
          </Field>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ih-eyebrow" style={{ marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid var(--ih-line-2)",
    background: "var(--ih-surface)",
    color: "var(--ih-ink)",
    fontSize: 13,
    fontFamily: "var(--ih-font-sans)",
    outline: "none",
    boxSizing: "border-box",
  }
}
