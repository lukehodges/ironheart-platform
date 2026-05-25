"use client"

/**
 * Live-data inspector for /platform/clients/[id]/onboarding.
 *
 * Wires every editable field through the new onboarding.* procs:
 *   label                       → onboarding.updateNode
 *   kind                        → onboarding.setNodeKind
 *   email/tenureYears/founder/  → onboarding.updateNodeMeta
 *     fractional/avatarColor
 *   auditFlags                  → onboarding.setAuditFlags
 *   interviewStatus             → onboarding.setInterviewStatus
 *   formStatus                  → onboarding.setFormStatus
 *   edgeStyle                   → onboarding.setEdgeStyle
 *   delete                      → onboarding.deleteNode
 *
 * Uses optimistic invalidation: each mutation invalidates onboarding.getChart
 * on success, refetching the tree.
 */

import { useEffect, useRef, useState } from "react"
import {
  X,
  Mail,
  Trash2,
  Crown,
  Wallet,
  Database,
  ShieldCheck,
  Lock,
  Workflow,
  Sparkles,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import type { DemoNode, AuditFlag as DemoAuditFlag, InterviewStatus as DemoInterviewStatus, FormStatus as DemoFormStatus, EdgeStyle as DemoEdgeStyle } from "../demo/_components/types"
import type { OrgChartTree, NodeKind as BackendNodeKind } from "@/modules/onboarding/onboarding.types"
import {
  demoFlagToBackend,
  formToBackend,
  interviewToBackend,
} from "./adapter"

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
const AVATAR_KEYS = Object.keys(AVATAR_HEX)
const avatarColors = (key: string | null) => (key && AVATAR_HEX[key]) || { bg: "var(--ih-surface-2)", fg: "var(--ih-ink-65)" }
const initialsOf = (name: string) => name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

const KINDS: BackendNodeKind[] = ["PERSON", "VACANCY", "CONTRACTOR", "ADVISOR", "EXTERNAL"]
const INTERVIEW_STATUSES: DemoInterviewStatus[] = ["NOT_TARGET", "TARGET", "INVITED", "SCHEDULED", "COMPLETED"]
const FORM_STATUSES: DemoFormStatus[] = ["NOT_SENT", "SENT", "IN_PROGRESS", "COMPLETED"]
const EDGE_STYLES: DemoEdgeStyle[] = ["SOLID", "DOTTED", "MATRIX"]

const ALL_AUDIT_FLAGS: DemoAuditFlag[] = [
  "DECISION_MAKER",
  "FINANCE_OWNER",
  "DATA_OWNER",
  "DPO",
  "SECURITY_OWNER",
  "PROCESS_OWNER",
  "FOUNDER",
]

const AUDIT_META: Record<DemoAuditFlag, { label: string; tone: string; bg: string; Icon: React.ComponentType<{ size?: number }> }> = {
  DECISION_MAKER: { label: "Decision maker", tone: "var(--ih-accent)", bg: "var(--ih-accent-soft)", Icon: Crown },
  FINANCE_OWNER: { label: "Finance owner", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)", Icon: Wallet },
  DATA_OWNER: { label: "Data owner", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", Icon: Database },
  DPO: { label: "DPO", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)", Icon: ShieldCheck },
  SECURITY_OWNER: { label: "Security owner", tone: "#6A4C8A", bg: "var(--ih-info-soft)", Icon: Lock },
  PROCESS_OWNER: { label: "Process owner", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)", Icon: Workflow },
  FOUNDER: { label: "Founder", tone: "var(--ih-ink-65)", bg: "var(--ih-surface-2)", Icon: Sparkles },
}

interface OnboardingInspectorProps {
  node: DemoNode
  row: OrgChartTree
  /** Flat list of every node in the chart — used to render manager / direct-report links. */
  allNodes: DemoNode[]
  engagementId: string
  onClose: () => void
  /** Click a manager / direct-report chip to focus that node on the graph. */
  onFocusNode: (id: string) => void
}

export function OnboardingInspector({ node, row, allNodes, engagementId, onClose, onFocusNode }: OnboardingInspectorProps) {
  const utils = api.useUtils()
  const invalidate = () => utils.onboarding.getChart.invalidate({ engagementId })

  const updateNode = api.onboarding.updateNode.useMutation({ onSuccess: invalidate })
  const setKind = api.onboarding.setNodeKind.useMutation({ onSuccess: invalidate })
  const setAuditFlags = api.onboarding.setAuditFlags.useMutation({ onSuccess: invalidate })
  const setInterviewStatus = api.onboarding.setInterviewStatus.useMutation({ onSuccess: invalidate })
  const setFormStatus = api.onboarding.setFormStatus.useMutation({ onSuccess: invalidate })
  const setEdgeStyle = api.onboarding.setEdgeStyle.useMutation({ onSuccess: invalidate })
  const updateMeta = api.onboarding.updateNodeMeta.useMutation({ onSuccess: invalidate })
  const deleteNode = api.onboarding.deleteNode.useMutation({
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  // Debounced label edit
  const [labelDraft, setLabelDraft] = useState(row.label)
  const labelTimer = useRef<number | null>(null)
  useEffect(() => { setLabelDraft(row.label) }, [row.id, row.label])
  useEffect(() => {
    if (labelDraft === row.label) return
    if (labelTimer.current !== null) window.clearTimeout(labelTimer.current)
    labelTimer.current = window.setTimeout(() => {
      updateNode.mutate({ id: row.id, version: row.version, patch: { label: labelDraft } })
    }, 500)
    return () => { if (labelTimer.current !== null) window.clearTimeout(labelTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelDraft])

  // Debounced email edit
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
    }, 500)
    return () => { if (emailTimer.current !== null) window.clearTimeout(emailTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailDraft])

  // Debounced tenure edit
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
    }, 500)
    return () => { if (tenureTimer.current !== null) window.clearTimeout(tenureTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenureDraft])

  const isPersonish =
    node.kind === "PERSON" || node.kind === "CONTRACTOR" || node.kind === "ADVISOR" || node.kind === "EXTERNAL" || node.kind === "VACANCY"

  const { bg: avBg, fg: avFg } = avatarColors(row.avatarColor)

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

      {/* Label */}
      <Field label="Label">
        <input
          type="text"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          style={inputStyle()}
        />
      </Field>

      {/* Kind — only for non-structural rows (skip for the synthetic ORG root + DEPARTMENT rows). */}
      {node.kind !== "ORG" && node.kind !== "DEPARTMENT" && (
        <Field label="Kind">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {KINDS.map((k) => {
              const active = row.kind === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind.mutate({ nodeId: row.id, kind: k })}
                  disabled={active || setKind.isPending}
                  style={segBtn(active)}
                >
                  {k.charAt(0) + k.slice(1).toLowerCase()}
                </button>
              )
            })}
          </div>
        </Field>
      )}

      {/* Email + tenure + flags only on person-ish rows */}
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

          <Field label="Flags">
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Toggle
                label="Founder"
                checked={row.isFounder}
                onChange={(v) => updateMeta.mutate({ nodeId: row.id, isFounder: v })}
              />
              <Toggle
                label="Fractional"
                checked={row.isFractional}
                onChange={(v) => updateMeta.mutate({ nodeId: row.id, isFractional: v })}
              />
            </div>
          </Field>

          <Field label="Avatar colour">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {AVATAR_KEYS.map((k) => {
                const palette = AVATAR_HEX[k]!
                const active = row.avatarColor === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => updateMeta.mutate({ nodeId: row.id, avatarColor: active ? null : k })}
                    title={k}
                    aria-label={`Avatar colour ${k}`}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: palette.bg,
                      border: active ? `2px solid var(--ih-accent)` : `1px solid var(--ih-line-2)`,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                )
              })}
            </div>
          </Field>

          <Field label="Audit flags">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_AUDIT_FLAGS.map((f) => {
                const meta = AUDIT_META[f]
                const Icon = meta.Icon
                const active = node.auditFlags.includes(f)
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? node.auditFlags.filter((x) => x !== f)
                        : [...node.auditFlags, f]
                      setAuditFlags.mutate({
                        nodeId: row.id,
                        flags: next.map(demoFlagToBackend),
                      })
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 9px",
                      borderRadius: 999,
                      border: `1px solid ${active ? meta.tone : "var(--ih-line-2)"}`,
                      background: active ? meta.bg : "var(--ih-surface)",
                      color: active ? meta.tone : "var(--ih-ink-65)",
                      fontSize: 11,
                      fontFamily: "var(--ih-font-sans)",
                      cursor: "pointer",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <Icon size={10} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Interview status">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {INTERVIEW_STATUSES.map((s) => {
                const active = node.interviewStatus === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInterviewStatus.mutate({ nodeId: row.id, status: interviewToBackend(s) })}
                    disabled={active || setInterviewStatus.isPending}
                    style={segBtn(active)}
                  >
                    {prettyStatus(s)}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Form status">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {FORM_STATUSES.map((s) => {
                const active = node.formStatus === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormStatus.mutate({ nodeId: row.id, status: formToBackend(s) })}
                    disabled={active || setFormStatus.isPending}
                    style={segBtn(active)}
                  >
                    {prettyStatus(s)}
                  </button>
                )
              })}
            </div>
          </Field>
        </>
      )}

      {/* Questionnaire template (consultant-only). Dropdown of engagement-scoped + master templates. */}
      {isPersonish && (
        <Field label="Questionnaire template">
          <TemplateSelect
            engagementId={engagementId}
            value={row.templateSlugOverride ?? ""}
            onChange={(slug) =>
              updateNode.mutate({
                id: row.id,
                version: row.version,
                patch: { templateSlugOverride: slug || null },
              })
            }
          />
        </Field>
      )}

      {/* Reporting — manager + direct reports */}
      <ReportingSection node={node} allNodes={allNodes} onFocusNode={onFocusNode} />

      {/* Edge style is meaningful on any non-root row */}
      {row.parentId && (
        <Field label="Edge style (from parent)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {EDGE_STYLES.map((s) => {
              const active = row.edgeStyle === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEdgeStyle.mutate({ nodeId: row.id, style: s })}
                  disabled={active || setEdgeStyle.isPending}
                  style={segBtn(active)}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              )
            })}
          </div>
        </Field>
      )}

      {/* Danger zone */}
      <div
        style={{
          marginTop: 8,
          padding: 12,
          borderRadius: 8,
          border: "1px dashed var(--ih-danger)",
          background: "rgba(192,57,43,0.04)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (!confirm(`Delete '${row.label}' and all its children?`)) return
            deleteNode.mutate({ id: row.id, version: row.version })
          }}
          disabled={deleteNode.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--ih-danger)",
            background: "transparent",
            color: "var(--ih-danger)",
            cursor: deleteNode.isPending ? "wait" : "pointer",
            fontSize: 12,
            fontFamily: "var(--ih-font-sans)",
          }}
        >
          <Trash2 size={11} />
          {deleteNode.isPending ? "Deleting…" : "Delete node"}
        </button>
      </div>
    </div>
  )
}

// ── tiny helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ih-eyebrow" style={{ marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ih-ink-65)", cursor: "pointer", fontFamily: "var(--ih-font-sans)" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
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

function segBtn(active: boolean): React.CSSProperties {
  return {
    padding: "4px 9px",
    borderRadius: 6,
    border: `1px solid ${active ? "var(--ih-ink)" : "var(--ih-line-2)"}`,
    background: active ? "var(--ih-ink)" : "var(--ih-surface)",
    color: active ? "#fff" : "var(--ih-ink-65)",
    cursor: active ? "default" : "pointer",
    fontSize: 11,
    fontFamily: "var(--ih-font-sans)",
    fontWeight: active ? 600 : 500,
  }
}

function prettyStatus(s: string): string {
  return s.split("_").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ")
}

/**
 * Dropdown of templates a consultant can pin on a node.
 *   - "" → "Default (auto-mapped to role)"
 *   - Engagement-scoped templates first (Client-specific group)
 *   - Master Ironheart library second
 *
 * Persists via the inspector's updateNode mutation. The value stored on the
 * node is the template SLUG (so the form-send flow can resolve the
 * engagement-scoped clone vs master at dispatch time).
 */
function TemplateSelect({
  engagementId,
  value,
  onChange,
}: {
  engagementId: string
  value: string
  onChange: (slug: string) => void
}) {
  const templatesQuery = api.forms.listTemplates.useQuery({ engagementId, limit: 100 })
  const rows = templatesQuery.data?.rows ?? []
  const scoped = rows.filter((r) => r.engagementId === engagementId)
  const master = rows.filter((r) => !r.engagementId)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={templatesQuery.isLoading}
      style={inputStyle()}
    >
      <option value="">Default (auto-mapped to role)</option>
      {scoped.length > 0 && (
        <optgroup label="Client-specific">
          {scoped.map((t) => (
            <option key={t.id} value={t.slug ?? t.id}>
              {t.name} ({t.fields?.length ?? 0} qs)
            </option>
          ))}
        </optgroup>
      )}
      {master.length > 0 && (
        <optgroup label="Master library">
          {master.map((t) => (
            <option key={t.id} value={t.slug ?? t.id}>
              {t.name} ({t.fields?.length ?? 0} qs)
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

function ReportingSection({ node, allNodes, onFocusNode }: { node: DemoNode; allNodes: DemoNode[]; onFocusNode: (id: string) => void }) {
  const manager = node.parentId ? allNodes.find((n) => n.id === node.parentId) ?? null : null
  const reports = allNodes.filter((n) => n.parentId === node.id)
  if (!manager && reports.length === 0) return null
  return (
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
            <span className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ih-ink-40)", flexShrink: 0 }}>
              Reports to
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {manager.name}
            </span>
          </button>
        )}
        {reports.length > 0 && (
          <div>
            <p className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ih-ink-40)", margin: "0 0 4px" }}>
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
  )
}
