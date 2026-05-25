"use client"

/**
 * Live-data heuristic suggestions for the consultant onboarding shell.
 *
 * This is a deliberately client-only computation — no Claude API, no tRPC
 * proc. Derives "next steps" from the demo-shape node list returned by
 * `flattenChart` so we can ship Tuesday's narrative theatre without standing
 * up an LLM pipeline.
 *
 * Replace later (Phase 1.x) with a server-side suggestion engine fed by the
 * audit graph + activity log.
 */

import { useEffect, useState } from "react"
import { ArrowRight, Sparkles, AlertOctagon, AlertTriangle, Info, X } from "lucide-react"
import { SlideDrawer } from "../demo/_components/floating-suggestions"
import type { DemoNode, Suggestion, SuggestionSeverity } from "../demo/_components/types"

// Sort order — critical first, then warn, then info.
const SEVERITY_RANK: Record<SuggestionSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
}

const SEVERITY_META: Record<SuggestionSeverity, { dot: string; border: string; Icon: React.ComponentType<{ size?: number }> }> = {
  critical: { dot: "var(--ih-danger)", border: "var(--ih-danger)", Icon: AlertOctagon },
  warn: { dot: "var(--ih-warn)", border: "var(--ih-warn)", Icon: AlertTriangle },
  info: { dot: "var(--ih-ink-50)", border: "var(--ih-line-3)", Icon: Info },
}

/**
 * Compute up to 6 suggestion cards from the live flattened node list.
 *
 * Heuristics fire in this order (critical → warn → info):
 *   1. CRITICAL — node with BOTH DPO + DATA_OWNER and not yet interviewed
 *   2. CRITICAL — fractional contractor without an interview scheduled
 *   3. WARN     — founder without scheduled / completed interview
 *   4. WARN     — vacancy roles (open headcount)
 *   5. INFO     — BUNDLE nodes (collapsed siblings worth confirming)
 *   6. INFO     — SENT forms not yet IN_PROGRESS (chase candidates)
 */
export function computeSuggestions(nodes: DemoNode[]): Suggestion[] {
  const out: Suggestion[] = []

  // 1) Critical — DPO + DATA_OWNER overlap (and not yet interviewed)
  for (const n of nodes) {
    if (
      n.auditFlags.includes("DPO") &&
      n.auditFlags.includes("DATA_OWNER") &&
      n.interviewStatus !== "COMPLETED"
    ) {
      out.push({
        id: `dpo-data-owner-${n.id}`,
        severity: "critical",
        title: `${n.name} owns both DPO and Data Owner`,
        body: "Confirm formal appointment in audit — overlapping roles need documented separation of duties.",
        action: { label: "Focus node", nodeId: n.id },
      })
    }
  }

  // 2) Critical — fractional contractor not yet interviewed (TARGET / INVITED / NOT_TARGET)
  for (const n of nodes) {
    if (
      n.isFractional &&
      n.interviewStatus !== "COMPLETED" &&
      n.interviewStatus !== "SCHEDULED"
    ) {
      out.push({
        id: `fractional-${n.id}`,
        severity: "critical",
        title: `${n.name} is fractional`,
        body: "Schedule first — fractional contractors have the lowest availability windows.",
        action: { label: "Focus node", nodeId: n.id },
      })
    }
  }

  // 3) Warn — founder without scheduled or completed interview
  for (const n of nodes) {
    if (
      n.isFounder &&
      n.interviewStatus !== "SCHEDULED" &&
      n.interviewStatus !== "COMPLETED"
    ) {
      out.push({
        id: `founder-${n.id}`,
        severity: "warn",
        title: `Interview founder ${n.name}`,
        body: "Slot before the audit phase begins — founder context anchors the entire engagement.",
        action: { label: "Focus node", nodeId: n.id },
      })
    }
  }

  // 4) Warn — vacancies
  for (const n of nodes) {
    if (n.kind === "VACANCY") {
      out.push({
        id: `vacancy-${n.id}`,
        severity: "warn",
        title: `Vacancy: ${n.name}`,
        body: "Confirm hiring plan before the recommendation phase — open roles change the org-design call.",
        action: { label: "Focus node", nodeId: n.id },
      })
    }
  }

  // 5) Info — bundles
  for (const n of nodes) {
    if (n.kind === "BUNDLE") {
      out.push({
        id: `bundle-${n.id}`,
        severity: "info",
        title: `${n.name} currently grouped`,
        body: "Confirm headcount accuracy — bundled siblings hide individual coverage gaps.",
        action: { label: "Focus node", nodeId: n.id },
      })
    }
  }

  // 6) Info — SENT forms not yet IN_PROGRESS (chase candidates)
  for (const n of nodes) {
    if (n.formStatus === "SENT") {
      out.push({
        id: `form-stalled-${n.id}`,
        severity: "info",
        title: `${n.name}'s questionnaire is overdue`,
        body: "Chase the assignee or reassign — form was sent but hasn't been opened.",
        action: { label: "Focus node", nodeId: n.id },
      })
    }
  }

  // Stable severity-ranked sort, cap to 6.
  out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  return out.slice(0, 6)
}

interface LiveSuggestionsDrawerProps {
  suggestions: Suggestion[]
  open: boolean
  onClose: () => void
  onAction: (s: Suggestion) => void
}

/**
 * Right-side drawer hosting the live suggestion cards. Mirrors the demo's
 * FloatingSuggestions visual but driven by openness state owned by the
 * consultant shell (which manages a single open-drawer-at-a-time policy
 * against the existing left-side overlays).
 */
export function LiveSuggestionsDrawer({ suggestions, open, onClose, onAction }: LiveSuggestionsDrawerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = suggestions.filter((s) => !dismissed.has(s.id))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <SlideDrawer
      side="left"
      open={open}
      onClose={onClose}
      title={
        suggestions.length === 0
          ? "Suggested next steps"
          : `Suggested next steps · ${visible.length}`
      }
    >
      {visible.length === 0 ? (
        <div
          style={{
            padding: "20px 12px",
            borderRadius: 8,
            background: "var(--ih-surface-2)",
            border: "1px dashed var(--ih-line-2)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 12.5, color: "var(--ih-ink-65)", margin: 0 }}>
            All clear — no flagged gaps right now.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((s) => {
            const meta = SEVERITY_META[s.severity]
            return (
              <div
                key={s.id}
                style={{
                  position: "relative",
                  padding: "10px 12px 12px",
                  borderRadius: 8,
                  background: "var(--ih-surface)",
                  border: "1px solid var(--ih-line)",
                  borderLeft: `3px solid ${meta.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDismissed((prev) => {
                      const next = new Set(prev)
                      next.add(s.id)
                      return next
                    })
                  }
                  aria-label="Dismiss suggestion"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    color: "var(--ih-ink-40)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <X size={11} />
                </button>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingRight: 22 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: meta.dot,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--ih-ink)",
                        lineHeight: 1.35,
                      }}
                    >
                      {s.title}
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ih-ink-65)",
                    lineHeight: 1.45,
                    margin: 0,
                    paddingLeft: 16,
                  }}
                >
                  {s.body}
                </p>

                {s.action && (
                  <div style={{ paddingLeft: 16 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(s)
                        onClose()
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--ih-line)",
                        background: "transparent",
                        color: "var(--ih-ink)",
                        fontSize: 11.5,
                        fontFamily: "var(--ih-font-sans)",
                        cursor: "pointer",
                      }}
                    >
                      {s.action.label}
                      <ArrowRight size={10} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SlideDrawer>
  )
}

/** Helper re-export — keeps the Sparkles icon import canonical for callers. */
export { Sparkles }
