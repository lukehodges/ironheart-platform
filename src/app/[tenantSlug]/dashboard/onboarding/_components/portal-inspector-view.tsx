"use client"

/**
 * Read-only view-mode inspector for the prospect portal. Strict subset of
 * portal-inspector.tsx — no inputs, no debounced mutations. Shows label,
 * email (if any), tenure, isFractional chip, audit flags (read-only),
 * interview status pill, notes prose.
 */

import { X } from "lucide-react"
import type {
  DemoNode,
  AuditFlag as DemoAuditFlag,
  InterviewStatus as DemoInterviewStatus,
} from "@/app/platform/clients/[id]/onboarding/demo/_components/types"
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
const avatarColors = (key: string | null) =>
  (key && AVATAR_HEX[key]) || { bg: "var(--ih-surface-2)", fg: "var(--ih-ink-65)" }
const initialsOf = (name: string) =>
  name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

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

interface PortalInspectorViewProps {
  node: DemoNode
  row: OrgChartTree
  onClose: () => void
}

export function PortalInspectorView({ node, row, onClose }: PortalInspectorViewProps) {
  const isPersonish =
    node.kind === "PERSON" ||
    node.kind === "CONTRACTOR" ||
    node.kind === "ADVISOR" ||
    node.kind === "EXTERNAL" ||
    node.kind === "VACANCY"
  const { bg: avBg, fg: avFg } = avatarColors(row.avatarColor)
  const interviewMeta = INTERVIEW_META[node.interviewStatus]

  // Skip-render rows whose value is null/empty — keeps the inspector from
  // ever showing a broken "Field: " line.
  const valueRows: Array<{ label: string; value: React.ReactNode }> = []
  if (row.email && row.email.trim() !== "") valueRows.push({ label: "Email", value: row.email })
  if (row.tenureYears != null)
    valueRows.push({
      label: "Tenure",
      value: `${row.tenureYears} ${row.tenureYears === 1 ? "year" : "years"}`,
    })

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
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: avBg,
                color: avFg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {initialsOf(node.name) || "—"}
            </span>
          )}
          <span className="ih-eyebrow">{node.kind.toLowerCase()}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: "var(--ih-surface)",
            border: "1px solid var(--ih-line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--ih-ink-65)",
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--ih-font-serif)",
            fontSize: 22,
            color: "var(--ih-ink)",
            lineHeight: 1.2,
          }}
        >
          {row.label}
        </h2>
        {(node.title || row.contactRole) && (
          <span style={{ fontSize: 12.5, color: "var(--ih-ink-65)", fontFamily: "var(--ih-font-sans)" }}>
            {node.title || row.contactRole}
          </span>
        )}
      </div>

      {valueRows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {valueRows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                fontSize: 12.5,
                fontFamily: "var(--ih-font-sans)",
              }}
            >
              <span
                className="ih-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ih-ink-40)",
                  minWidth: 60,
                }}
              >
                {r.label}
              </span>
              <span style={{ color: "var(--ih-ink)", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {isPersonish && row.isFractional && (
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "3px 8px",
            borderRadius: 999,
            fontSize: 10.5,
            color: "var(--ih-warn)",
            background: "var(--ih-warn-soft)",
            border: "1px solid rgba(184,134,11,0.3)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: "var(--ih-font-mono)",
          }}
        >
          Fractional
        </div>
      )}

      {isPersonish && node.auditFlags.length > 0 && (
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

      {isPersonish && (
        <Field label="Interview status">
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
      )}

      {row.notes && row.notes.trim() !== "" && (
        <Field label="Notes">
          <p
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--ih-surface-2)",
              border: "1px solid var(--ih-line)",
              color: "var(--ih-ink)",
              fontSize: 12.5,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              fontFamily: "var(--ih-font-sans)",
            }}
          >
            {row.notes}
          </p>
        </Field>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ih-eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </p>
      {children}
    </div>
  )
}
