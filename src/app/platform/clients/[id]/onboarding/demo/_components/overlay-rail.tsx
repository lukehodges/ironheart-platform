"use client"

import { useMemo } from "react"
import { Focus, Send, FileText, Flame } from "lucide-react"
import type { AuditFlag, DemoNode, FormStatus } from "./types"

/* ---------- shared avatar helpers ---------- */

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
const initialsOf = (name: string) =>
  name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

const PERSON_KINDS = new Set(["PERSON", "CONTRACTOR", "ADVISOR"])

/* ---------- Forms list ---------- */

const FORM_META: Record<FormStatus, { label: string; tone: string; bg: string; rank: number }> = {
  COMPLETED:   { label: "Completed",   tone: "var(--ih-ok)",     bg: "var(--ih-ok-soft)",     rank: 0 },
  IN_PROGRESS: { label: "In progress", tone: "var(--ih-warn)",   bg: "var(--ih-warn-soft)",   rank: 1 },
  OPENED:      { label: "Opened",      tone: "var(--ih-warn)",   bg: "var(--ih-warn-soft)",   rank: 2 },
  SENT:        { label: "Sent",        tone: "var(--ih-info)",   bg: "var(--ih-info-soft)",   rank: 3 },
  NOT_SENT:    { label: "Not sent",    tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)",   rank: 4 },
}

interface FormsListProps {
  nodes: DemoNode[]
  onFocus: (id: string) => void
  onSend: (id: string) => void
}

export function DemoFormsList({ nodes, onFocus, onSend }: FormsListProps): React.ReactElement {
  // Show nodes that have any interview involvement OR audit flags — those are the people
  // who actually need questionnaires.
  const list = useMemo(() => {
    return nodes
      .filter((n) => PERSON_KINDS.has(n.kind))
      .filter((n) => n.interviewStatus !== "NOT_TARGET" || n.auditFlags.length > 0)
      .sort((a, b) => {
        const oa = FORM_META[a.formStatus].rank
        const ob = FORM_META[b.formStatus].rank
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name)
      })
  }, [nodes])

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
        <p style={{ fontSize: 12, color: "var(--ih-ink-50)", margin: 0 }}>
          No questionnaire targets yet. Mark interview targets first.
        </p>
      ) : (
        <ul style={listStyle}>
          {list.map((n) => {
            const meta = FORM_META[n.formStatus]
            const a = avatarColors(n.avatarColor)
            return (
              <li key={n.id} style={rowStyle}>
                <button type="button" onClick={() => onFocus(n.id)} style={focusBtnStyle} aria-label={`Focus ${n.name}`}>
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
                <span className="ih-mono" style={{ padding: "2px 6px", borderRadius: 999, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", background: meta.bg, color: meta.tone, border: `1px solid ${meta.tone}1f`, flexShrink: 0 }}>
                  {meta.label}
                </span>
                {n.formStatus === "NOT_SENT" && (
                  <button type="button" onClick={() => onSend(n.id)} title="Send questionnaire" style={miniIconBtn()}>
                    <Send size={11} />
                  </button>
                )}
                <button type="button" onClick={() => onFocus(n.id)} title="Focus on graph" style={miniIconBtn()}>
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

/* ---------- Audit-critical list ---------- */

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

export function DemoAuditList({ nodes, onFocus }: AuditListProps): React.ReactElement {
  const list = useMemo(() => {
    return nodes
      .filter((n) => n.auditFlags.length > 0)
      .sort((a, b) => {
        const sev = (n: DemoNode) =>
          (n.auditFlags.includes("DPO") ? 0 : 1) +
          (n.auditFlags.includes("FINANCE_OWNER") ? 0 : 1) +
          (n.auditFlags.includes("DATA_OWNER") ? 0 : 1)
        const sa = sev(a)
        const sb = sev(b)
        return sa !== sb ? sa - sb : b.auditFlags.length - a.auditFlags.length
      })
  }, [nodes])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.05em" }}>
          {list.length} flagged
        </span>
      </div>
      {list.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--ih-ink-50)", margin: 0 }}>
          No audit-critical people yet. Add DPO / Finance / Data owner flags to surface gaps.
        </p>
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
                <button type="button" onClick={() => onFocus(n.id)} title="Focus on graph" style={miniIconBtn()}>
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

/* ---------- shared rail-card chrome (kept for any future stand-alone use) ---------- */

function RailCard({
  title,
  summary,
  icon,
  progressPct,
  progressTone,
  children,
}: {
  title: string
  summary?: string
  icon?: React.ReactNode
  progressPct?: number
  progressTone?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section
      style={{
        background: "var(--ih-surface)",
        border: "1px solid var(--ih-line)",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 className="ih-serif" style={{ fontSize: 17, margin: 0, color: "var(--ih-ink)", display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          {title}
        </h3>
        {summary && (
          <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.05em" }}>
            {summary}
          </span>
        )}
      </div>
      {progressPct != null && (
        <div style={{ height: 4, background: "var(--ih-surface-2)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: progressTone ?? "var(--ih-accent)", transition: "width 0.3s" }} />
        </div>
      )}
      {children}
    </section>
  )
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  // No maxHeight — the parent SlideDrawer scrolls so the list can fill all
  // available vertical space.
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

function miniIconBtn(): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--ih-line)",
    background: "transparent",
    cursor: "pointer",
    color: "var(--ih-ink-50)",
    borderRadius: 4,
    flexShrink: 0,
  }
}
