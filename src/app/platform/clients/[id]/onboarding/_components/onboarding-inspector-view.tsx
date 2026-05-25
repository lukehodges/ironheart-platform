"use client"

/**
 * Read-only "view mode" rendering for the consultant inspector. Pairs with
 * onboarding-inspector.tsx (which is the edit-mode form). Renders the same
 * underlying OrgChartTree row + DemoNode pair but as prose / chips / pills
 * with NO inputs, NO segmented controls, NO delete button.
 *
 * Reads:
 *   - row.label                 → heading
 *   - row.contactRole / title   → subtitle
 *   - node.kind                 → eyebrow chip
 *   - node.auditFlags           → non-interactive flag chips
 *   - node.interviewStatus      → pill
 *   - node.formStatus           → pill
 *   - row.tenureYears           → labelled row (skip if null)
 *   - row.email                 → labelled row (skip if empty)
 *   - row.isFounder             → labelled row (Yes/No, skip if false)
 *   - row.isFractional          → labelled row (Yes/No, skip if false)
 *   - row.notes                 → <p> prose block (whitespace-pre-wrap)
 *   - row.avatarColor           → swatch, not clickable
 *   - row.edgeStyle             → labelled row (only if parentId)
 *
 * Reporting (manager + direct reports) stays clickable — view-mode still
 * allows read-only navigation across the chart.
 */

import { X, Crown, Wallet, Database, ShieldCheck, Lock, Workflow, Sparkles } from "lucide-react"
import type { DemoNode, AuditFlag as DemoAuditFlag } from "../demo/_components/types"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"
import { api } from "@/lib/trpc/react"

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
  name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

const AUDIT_META: Record<DemoAuditFlag, { label: string; tone: string; bg: string; Icon: React.ComponentType<{ size?: number }> }> = {
  DECISION_MAKER: { label: "Decision maker", tone: "var(--ih-accent)", bg: "var(--ih-accent-soft)", Icon: Crown },
  FINANCE_OWNER: { label: "Finance owner", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)", Icon: Wallet },
  DATA_OWNER: { label: "Data owner", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", Icon: Database },
  DPO: { label: "DPO", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)", Icon: ShieldCheck },
  SECURITY_OWNER: { label: "Security owner", tone: "#6A4C8A", bg: "var(--ih-info-soft)", Icon: Lock },
  PROCESS_OWNER: { label: "Process owner", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)", Icon: Workflow },
  FOUNDER: { label: "Founder", tone: "var(--ih-ink-65)", bg: "var(--ih-surface-2)", Icon: Sparkles },
}

const INTERVIEW_META: Record<string, { label: string; tone: string; bg: string }> = {
  NOT_TARGET: { label: "Not on shortlist", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)" },
  TARGET: { label: "Target", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  INVITED: { label: "Invited", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)" },
  SCHEDULED: { label: "Scheduled", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  COMPLETED: { label: "Interview done", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)" },
  DECLINED: { label: "Declined", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)" },
}

const FORM_META: Record<string, { label: string; tone: string; bg: string }> = {
  NOT_SENT: { label: "Not sent", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)" },
  SENT: { label: "Sent", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)" },
  OPENED: { label: "Opened", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)" },
  IN_PROGRESS: { label: "In progress", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  COMPLETED: { label: "Completed", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)" },
}

interface OnboardingInspectorViewProps {
  node: DemoNode
  row: OrgChartTree
  allNodes: DemoNode[]
  engagementId: string
  onClose: () => void
  onFocusNode: (id: string) => void
}

export function OnboardingInspectorView({ node, row, allNodes, engagementId, onClose, onFocusNode }: OnboardingInspectorViewProps) {
  const isPersonish =
    node.kind === "PERSON" ||
    node.kind === "CONTRACTOR" ||
    node.kind === "ADVISOR" ||
    node.kind === "EXTERNAL" ||
    node.kind === "VACANCY"

  // Resolve the assigned template name from its slug (read-only display).
  // Includes engagement-scoped clones + master library on the Ironheart tenant.
  const templatesQuery = api.forms.listTemplates.useQuery(
    { engagementId, limit: 100 },
    { enabled: isPersonish },
  )
  const resolvedTemplateName = (() => {
    if (!row.templateSlugOverride) return null
    const rows = templatesQuery.data?.rows ?? []
    // Prefer engagement-scoped over master.
    const scoped = rows.find((t) => t.slug === row.templateSlugOverride && t.engagementId === engagementId)
    if (scoped) return `${scoped.name} (client-specific)`
    const master = rows.find((t) => t.slug === row.templateSlugOverride && !t.engagementId)
    if (master) return master.name
    return row.templateSlugOverride
  })()
  const { bg: avBg, fg: avFg } = avatarColors(row.avatarColor)
  const interviewMeta = INTERVIEW_META[node.interviewStatus] ?? INTERVIEW_META.NOT_TARGET!
  const formMeta = FORM_META[node.formStatus] ?? FORM_META.NOT_SENT!
  const manager = node.parentId ? allNodes.find((n) => n.id === node.parentId) ?? null : null
  const reports = allNodes.filter((n) => n.parentId === node.id)

  // Compose value rows; we skip-render any whose value is null/empty so the
  // inspector never shows a "broken" "Field: " row.
  const rows: Array<{ label: string; value: React.ReactNode }> = []
  if (row.email && row.email.trim() !== "") {
    rows.push({ label: "Email", value: row.email })
  }
  if (row.tenureYears != null) {
    rows.push({ label: "Tenure", value: `${row.tenureYears} ${row.tenureYears === 1 ? "year" : "years"}` })
  }
  if (row.isFounder) rows.push({ label: "Founder", value: "Yes" })
  if (row.isFractional) rows.push({ label: "Fractional", value: "Yes" })
  if (row.parentId && row.edgeStyle && row.edgeStyle !== "SOLID") {
    rows.push({ label: "Edge", value: row.edgeStyle.charAt(0) + row.edgeStyle.slice(1).toLowerCase() })
  }
  if (isPersonish && resolvedTemplateName) {
    rows.push({ label: "Questionnaire", value: resolvedTemplateName })
  } else if (isPersonish && row.contactEmail) {
    rows.push({ label: "Questionnaire", value: "Default (auto-mapped to role)" })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22 }}>
      {/* Sticky header */}
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

      {/* Heading */}
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

      {/* Audit flag chips (non-interactive) */}
      {isPersonish && node.auditFlags.length > 0 && (
        <Field label="Audit flags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {node.auditFlags.map((f) => {
              const meta = AUDIT_META[f]
              const Icon = meta.Icon
              return (
                <span
                  key={f}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 9px",
                    borderRadius: 999,
                    border: `1px solid ${meta.tone}`,
                    background: meta.bg,
                    color: meta.tone,
                    fontSize: 11,
                    fontFamily: "var(--ih-font-sans)",
                    fontWeight: 600,
                  }}
                >
                  <Icon size={10} />
                  {meta.label}
                </span>
              )
            })}
          </div>
        </Field>
      )}

      {/* Interview + form status pills */}
      {isPersonish && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusPill label="Interview" tone={interviewMeta.tone} bg={interviewMeta.bg} text={interviewMeta.label} />
          <StatusPill label="Form" tone={formMeta.tone} bg={formMeta.bg} text={formMeta.label} />
        </div>
      )}

      {/* Value rows */}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <ValueRow key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      )}

      {/* Avatar colour swatch (non-interactive) */}
      {isPersonish && row.avatarColor && (
        <Field label="Avatar colour">
          <span
            aria-label={`Avatar colour ${row.avatarColor}`}
            style={{
              display: "inline-block",
              width: 22,
              height: 22,
              borderRadius: 999,
              background: avBg,
              border: "1px solid var(--ih-line-2)",
            }}
          />
        </Field>
      )}

      {/* Notes prose block */}
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

      {/* Reporting */}
      {(manager || reports.length > 0) && (
        <Field label="Reporting">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {manager && (
              <button
                type="button"
                onClick={() => onFocusNode(manager.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--ih-line)",
                  background: "var(--ih-surface)",
                  borderRadius: 6,
                  padding: "6px 9px",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--ih-ink)",
                  fontFamily: "var(--ih-font-sans)",
                  fontSize: 12,
                }}
              >
                <span
                  className="ih-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ih-ink-40)",
                    flexShrink: 0,
                  }}
                >
                  Reports to
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {manager.name}
                </span>
              </button>
            )}
            {reports.length > 0 && (
              <div>
                <p
                  className="ih-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ih-ink-40)",
                    margin: "0 0 4px",
                  }}
                >
                  Direct reports · {reports.length}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {reports.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onFocusNode(r.id)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        border: "1px solid var(--ih-line)",
                        background: "var(--ih-surface)",
                        color: "var(--ih-ink)",
                        fontSize: 11,
                        fontFamily: "var(--ih-font-sans)",
                        cursor: "pointer",
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                  {reports.length > 8 && (
                    <span style={{ fontSize: 11, color: "var(--ih-ink-50)", alignSelf: "center" }}>
                      +{reports.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
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

function ValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
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
          minWidth: 70,
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--ih-ink)", flex: 1, minWidth: 0, wordBreak: "break-word" }}>{value}</span>
    </div>
  )
}

function StatusPill({ label, text, tone, bg }: { label: string; text: string; tone: string; bg: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${tone}`,
        color: tone,
        fontSize: 11.5,
        fontFamily: "var(--ih-font-sans)",
        fontWeight: 500,
      }}
    >
      <span
        className="ih-mono"
        style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}
      >
        {label}
      </span>
      <span style={{ width: 4, height: 4, borderRadius: 999, background: tone }} />
      {text}
    </span>
  )
}
