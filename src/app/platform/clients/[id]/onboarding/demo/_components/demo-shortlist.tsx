"use client"

/**
 * DemoShortlist — interview shortlist card for the org-mapping demo.
 * Filters all nodes down to anything on the shortlist, sorts by status,
 * and exposes Focus / Confirm / Skip actions on hover.
 */

import { useMemo } from "react"
import { Check, X, Focus } from "lucide-react"
import type { DemoNode, InterviewStatus } from "./types"

interface DemoShortlistProps {
  nodes: DemoNode[]
  onFocus: (id: string) => void
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
}

// ── colour map (shared shape with inspector) ─────────────────────────────

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

const STATUS_META: Record<InterviewStatus, { label: string; tone: string; bg: string }> = {
  NOT_TARGET: { label: "—", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)" },
  TARGET: { label: "Target", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  INVITED: { label: "Invited", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)" },
  SCHEDULED: { label: "Scheduled", tone: "var(--ih-info)", bg: "var(--ih-info-soft)" },
  COMPLETED: { label: "Completed", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)" },
  DECLINED: { label: "Declined", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)" },
}

const STATUS_ORDER: Record<InterviewStatus, number> = {
  COMPLETED: 0, SCHEDULED: 1, INVITED: 2, TARGET: 3, DECLINED: 4, NOT_TARGET: 5,
}

const CONFIRMED_STATUSES: InterviewStatus[] = ["INVITED", "SCHEDULED", "COMPLETED"]

// ── component ────────────────────────────────────────────────────────────

export function DemoShortlist({ nodes, onFocus, onConfirm, onSkip }: DemoShortlistProps): React.ReactElement {
  const list = useMemo(() => {
    return nodes
      .filter((n) => n.interviewStatus !== "NOT_TARGET")
      .sort((a, b) => {
        const oa = STATUS_ORDER[a.interviewStatus]
        const ob = STATUS_ORDER[b.interviewStatus]
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name)
      })
  }, [nodes])

  const total = list.length
  const confirmed = list.filter((n) => CONFIRMED_STATUSES.includes(n.interviewStatus)).length
  const completed = list.filter((n) => n.interviewStatus === "COMPLETED").length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  // Boxless — parent SlideDrawer provides the card chrome + title. Show the
  // "X/Y confirmed" summary as a small subhead instead of a separate card.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.05em" }}>
          {confirmed}/{total || 0} confirmed
        </span>
        {list.length > 0 && (
          <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-65)" }}>
            {completed}/{total} ({pct}%) done
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {list.map((node) => (
            <ShortlistRow key={node.id} node={node} onFocus={onFocus} onConfirm={onConfirm} onSkip={onSkip} />
          ))}
        </div>
      )}

      {list.length > 0 && (
        <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--ih-surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--ih-ok)", borderRadius: 999, transition: "width 0.3s ease" }} />
        </div>
      )}
    </div>
  )
}

function ShortlistRow({ node, onFocus, onConfirm, onSkip }: { node: DemoNode; onFocus: (id: string) => void; onConfirm: (id: string) => void; onSkip: (id: string) => void }): React.ReactElement {
  const { bg, fg } = avatarColors(node.avatarColor)
  const meta = STATUS_META[node.interviewStatus]
  const initials = initialsOf(node.name)
  const canConfirm = !CONFIRMED_STATUSES.includes(node.interviewStatus)

  return (
    <div className="ih-shortlist-row"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 8, background: "transparent", transition: "background 0.12s", position: "relative" }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = "var(--ih-surface-2)"
        const actions = e.currentTarget.querySelector<HTMLElement>("[data-shortlist-actions]")
        if (actions) actions.style.opacity = "1"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = "transparent"
        const actions = e.currentTarget.querySelector<HTMLElement>("[data-shortlist-actions]")
        if (actions) actions.style.opacity = "0"
      }}>
      <div style={{ width: 28, height: 28, borderRadius: 999, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", flexShrink: 0 }}>
        {initials || "—"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--ih-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</div>
        {node.title && (
          <div style={{ fontSize: 11, color: "var(--ih-ink-50)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.title}</div>
        )}
      </div>

      <div data-shortlist-actions style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.12s" }}>
        <RowIconButton title="Focus on chart" onClick={() => onFocus(node.id)}><Focus size={11} /></RowIconButton>
        {canConfirm && (
          <RowIconButton title="Confirm — mark as invited" tone="var(--ih-ok)" onClick={() => onConfirm(node.id)}><Check size={11} /></RowIconButton>
        )}
        <RowIconButton title="Skip" tone="var(--ih-danger)" onClick={() => onSkip(node.id)}><X size={11} /></RowIconButton>
      </div>

      <span className="ih-mono"
        style={{ padding: "2px 7px", borderRadius: 999, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: meta.tone, background: meta.bg, border: `1px solid ${meta.bg === "var(--ih-surface-2)" ? "var(--ih-line)" : "transparent"}`, whiteSpace: "nowrap", flexShrink: 0 }}>
        {meta.label}
      </span>
    </div>
  )
}

function RowIconButton({ children, onClick, title, tone }: { children: React.ReactNode; onClick: () => void; title: string; tone?: string }): React.ReactElement {
  return (
    <button type="button" title={title} onClick={onClick}
      style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid var(--ih-line)", background: "var(--ih-surface)", color: tone ?? "var(--ih-ink-65)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
      {children}
    </button>
  )
}

function EmptyState(): React.ReactElement {
  return (
    <div style={{ padding: "24px 12px", borderRadius: 8, background: "var(--ih-surface-2)", border: "1px dashed var(--ih-line-2)", textAlign: "center" }}>
      <p style={{ fontSize: 12.5, color: "var(--ih-ink-65)", margin: 0, lineHeight: 1.45 }}>No one on the shortlist yet.</p>
      <p style={{ fontSize: 11.5, color: "var(--ih-ink-50)", margin: "4px 0 0", lineHeight: 1.45 }}>
        Mark nodes as <em>target</em> from the inspector to start building it.
      </p>
    </div>
  )
}
