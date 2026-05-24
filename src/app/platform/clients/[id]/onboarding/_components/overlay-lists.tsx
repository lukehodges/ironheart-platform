"use client"

/**
 * Live-data ports of the demo's DemoShortlist + DemoFormsList + DemoAuditList.
 * Display logic is the same; mutations are wired to the chart-depth procs
 * (setInterviewStatus / setFormStatus). Filtering operates on the live
 * DemoNode-shaped projection produced by ./adapter.
 */

import { useMemo } from "react"
import { Focus, Send, Check, X } from "lucide-react"
import { api } from "@/lib/trpc/react"
import type { DemoNode, FormStatus, InterviewStatus, AuditFlag } from "../demo/_components/types"

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

const PERSON_KINDS = new Set<DemoNode["kind"]>(["PERSON", "CONTRACTOR", "ADVISOR"])

// ── Shortlist ────────────────────────────────────────────────────────────────

const INTERVIEW_META: Record<InterviewStatus, { label: string; tone: string; bg: string }> = {
  NOT_TARGET: { label: "—", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)" },
  TARGET: { label: "Target", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  INVITED: { label: "Invited", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)" },
  SCHEDULED: { label: "Scheduled", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  COMPLETED: { label: "Completed", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)" },
  DECLINED: { label: "Declined", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)" },
}
const STATUS_ORDER: Record<InterviewStatus, number> = {
  COMPLETED: 0,
  SCHEDULED: 1,
  INVITED: 2,
  TARGET: 3,
  DECLINED: 4,
  NOT_TARGET: 5,
}

interface ShortlistProps {
  nodes: DemoNode[]
  engagementId: string
  onFocus: (id: string) => void
}

export function Shortlist({ nodes, engagementId, onFocus }: ShortlistProps): React.ReactElement {
  const utils = api.useUtils()
  const setStatus = api.onboarding.setInterviewStatus.useMutation({
    onSuccess: () => utils.onboarding.getChart.invalidate({ engagementId }),
  })

  const list = useMemo(
    () =>
      nodes
        .filter((n) => PERSON_KINDS.has(n.kind) && n.interviewStatus !== "NOT_TARGET")
        .sort((a, b) => {
          const oa = STATUS_ORDER[a.interviewStatus]
          const ob = STATUS_ORDER[b.interviewStatus]
          return oa !== ob ? oa - ob : a.name.localeCompare(b.name)
        }),
    [nodes],
  )

  const total = list.length
  const completed = list.filter((n) => n.interviewStatus === "COMPLETED").length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.05em" }}>
          {completed}/{total || 0} done
        </span>
      </div>
      {list.length === 0 ? (
        <EmptyHint text="No one on the shortlist yet. Mark a person as 'TARGET' to add them." />
      ) : (
        <ul style={listStyle}>
          {list.map((n) => {
            const meta = INTERVIEW_META[n.interviewStatus]
            const a = avatarColors(n.avatarColor)
            return (
              <li key={n.id} style={rowStyle}>
                <button type="button" onClick={() => onFocus(n.id)} style={focusBtnStyle}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: a.bg, color: a.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                    {initialsOf(n.name)}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ih-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</span>
                    {n.title && (
                      <span style={{ fontSize: 11, color: "var(--ih-ink-50)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    )}
                  </span>
                </button>
                <span className="ih-mono" style={{ padding: "2px 7px", borderRadius: 999, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: meta.tone, background: meta.bg, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {meta.label}
                </span>
                {n.interviewStatus === "TARGET" && (
                  <button type="button" onClick={() => setStatus.mutate({ nodeId: n.id, status: "INVITED" })} title="Confirm — mark as invited" style={miniBtn("var(--ih-ok)")}>
                    <Check size={11} />
                  </button>
                )}
                <button type="button" onClick={() => setStatus.mutate({ nodeId: n.id, status: "NONE" })} title="Skip" style={miniBtn("var(--ih-danger)")}>
                  <X size={11} />
                </button>
                <button type="button" onClick={() => onFocus(n.id)} title="Focus on graph" style={miniBtn()}>
                  <Focus size={11} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {total > 0 && (
        <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--ih-surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--ih-ok)", borderRadius: 999, transition: "width 0.3s ease" }} />
        </div>
      )}
    </div>
  )
}

// ── Forms list ───────────────────────────────────────────────────────────────

const FORM_META: Record<FormStatus, { label: string; tone: string; bg: string; rank: number }> = {
  COMPLETED: { label: "Completed", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)", rank: 0 },
  IN_PROGRESS: { label: "In progress", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)", rank: 1 },
  OPENED: { label: "Opened", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)", rank: 2 },
  SENT: { label: "Sent", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", rank: 3 },
  NOT_SENT: { label: "Not sent", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)", rank: 4 },
}

interface FormsListProps {
  nodes: DemoNode[]
  engagementId: string
  onFocus: (id: string) => void
}

export function FormsList({ nodes, engagementId, onFocus }: FormsListProps): React.ReactElement {
  const utils = api.useUtils()
  const setForm = api.onboarding.setFormStatus.useMutation({
    onSuccess: () => utils.onboarding.getChart.invalidate({ engagementId }),
  })

  const list = useMemo(
    () =>
      nodes
        .filter((n) => PERSON_KINDS.has(n.kind))
        .filter((n) => n.interviewStatus !== "NOT_TARGET" || n.auditFlags.length > 0)
        .sort((a, b) => {
          const oa = FORM_META[a.formStatus].rank
          const ob = FORM_META[b.formStatus].rank
          return oa !== ob ? oa - ob : a.name.localeCompare(b.name)
        }),
    [nodes],
  )

  const total = list.length
  const completed = list.filter((n) => n.formStatus === "COMPLETED").length
  const sent = list.filter((n) => n.formStatus !== "NOT_SENT").length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.05em" }}>
          {completed}/{total} returned
        </span>
        {total > 0 && (
          <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-65)" }}>
            {sent} sent · {total - sent} pending
          </span>
        )}
      </div>
      {total > 0 && (
        <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--ih-surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--ih-info)", borderRadius: 999, transition: "width 0.3s ease" }} />
        </div>
      )}
      {total === 0 ? (
        <EmptyHint text="No questionnaire targets yet. Mark interview targets first." />
      ) : (
        <ul style={listStyle}>
          {list.map((n) => {
            const meta = FORM_META[n.formStatus]
            const a = avatarColors(n.avatarColor)
            return (
              <li key={n.id} style={rowStyle}>
                <button type="button" onClick={() => onFocus(n.id)} style={focusBtnStyle}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: a.bg, color: a.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                    {initialsOf(n.name)}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ih-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</span>
                    {n.title && (
                      <span style={{ fontSize: 11, color: "var(--ih-ink-50)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    )}
                  </span>
                </button>
                <span className="ih-mono" style={{ padding: "2px 6px", borderRadius: 999, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", background: meta.bg, color: meta.tone, flexShrink: 0 }}>
                  {meta.label}
                </span>
                {n.formStatus === "NOT_SENT" && (
                  <button type="button" onClick={() => setForm.mutate({ nodeId: n.id, status: "SENT" })} title="Mark sent" style={miniBtn()}>
                    <Send size={11} />
                  </button>
                )}
                <button type="button" onClick={() => onFocus(n.id)} title="Focus on graph" style={miniBtn()}>
                  <Focus size={11} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Audit-critical list ──────────────────────────────────────────────────────

const FLAG_LABEL: Record<AuditFlag, string> = {
  DECISION_MAKER: "Decision maker",
  FINANCE_OWNER: "Finance owner",
  DATA_OWNER: "Data owner",
  DPO: "Data protection officer",
  SECURITY_OWNER: "Security owner",
  PROCESS_OWNER: "Process owner",
  FOUNDER: "Founder",
}
const FLAG_TONE: Record<AuditFlag, string> = {
  DPO: "var(--ih-danger)",
  FINANCE_OWNER: "var(--ih-warn)",
  DATA_OWNER: "var(--ih-info)",
  SECURITY_OWNER: "#6A4C8A",
  DECISION_MAKER: "var(--ih-ink)",
  FOUNDER: "var(--ih-ink-65)",
  PROCESS_OWNER: "var(--ih-ink-65)",
}

interface AuditListProps {
  nodes: DemoNode[]
  onFocus: (id: string) => void
}

export function AuditList({ nodes, onFocus }: AuditListProps): React.ReactElement {
  const list = useMemo(
    () =>
      nodes
        .filter((n) => n.auditFlags.length > 0)
        .sort((a, b) => b.auditFlags.length - a.auditFlags.length),
    [nodes],
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.05em" }}>
        {list.length} flagged
      </span>
      {list.length === 0 ? (
        <EmptyHint text="No audit-critical people yet. Add flags from the inspector." />
      ) : (
        <ul style={listStyle}>
          {list.map((n) => {
            const a = avatarColors(n.avatarColor)
            const topFlag = n.auditFlags[0]!
            return (
              <li key={n.id} style={rowStyle}>
                <button type="button" onClick={() => onFocus(n.id)} style={focusBtnStyle}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: a.bg, color: a.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                    {initialsOf(n.name)}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ih-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</span>
                    <span style={{ fontSize: 11, color: FLAG_TONE[topFlag], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {FLAG_LABEL[topFlag]}
                      {n.auditFlags.length > 1 && <span style={{ color: "var(--ih-ink-40)" }}> · +{n.auditFlags.length - 1}</span>}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => onFocus(n.id)} title="Focus on graph" style={miniBtn()}>
                  <Focus size={11} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── shared bits ──────────────────────────────────────────────────────────────

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: "16px 12px", borderRadius: 8, background: "var(--ih-surface-2)", border: "1px dashed var(--ih-line-2)", textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--ih-ink-50)", margin: 0, lineHeight: 1.45 }}>{text}</p>
    </div>
  )
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 4px",
  borderRadius: 6,
  borderBottom: "1px dashed var(--ih-line)",
}

const focusBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  minWidth: 0,
}

function miniBtn(color?: string): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--ih-line)",
    background: "transparent",
    cursor: "pointer",
    color: color ?? "var(--ih-ink-50)",
    borderRadius: 4,
    flexShrink: 0,
  }
}
