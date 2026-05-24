"use client"

/**
 * DemoSuggestions — AI-style "next steps" card for the org-mapping demo.
 * Pure presentation: renders Suggestion[] and delegates clicks to onAction.
 * Dismissals are local-only (visual hide).
 */

import { useState } from "react"
import { X, ArrowRight, AlertOctagon, AlertTriangle, Info } from "lucide-react"
import type { Suggestion, SuggestionSeverity } from "./types"

interface DemoSuggestionsProps {
  suggestions: Suggestion[]
  onAction: (s: Suggestion) => void
}

const SEVERITY_META: Record<SuggestionSeverity, { dot: string; border: string; Icon: React.ComponentType<{ size?: number }> }> = {
  critical: { dot: "var(--ih-danger)", border: "var(--ih-danger)", Icon: AlertOctagon },
  warn:     { dot: "var(--ih-warn)",   border: "var(--ih-warn)",   Icon: AlertTriangle },
  info:     { dot: "var(--ih-ink-50)", border: "var(--ih-line-3)", Icon: Info },
}

export function DemoSuggestions({ suggestions, onAction }: DemoSuggestionsProps): React.ReactElement {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = suggestions.filter((s) => !dismissed.has(s.id))

  // Boxless — the parent SlideDrawer already owns the card chrome + title.
  // Renders just the list of suggestion cards (or an empty state).
  if (visible.length === 0) {
    return (
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
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visible.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          onAction={onAction}
          onDismiss={() =>
            setDismissed((prev) => {
              const next = new Set(prev)
              next.add(s.id)
              return next
            })
          }
        />
      ))}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onAction,
  onDismiss,
}: {
  suggestion: Suggestion
  onAction: (s: Suggestion) => void
  onDismiss: () => void
}): React.ReactElement {
  const meta = SEVERITY_META[suggestion.severity]
  return (
    <div
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
      {/* dismiss */}
      <button
        type="button"
        onClick={onDismiss}
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

      {/* title row with severity dot */}
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
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ih-ink)", lineHeight: 1.35 }}>
            {suggestion.title}
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
        {suggestion.body}
      </p>

      {suggestion.action && (
        <div style={{ paddingLeft: 16 }}>
          <button
            type="button"
            onClick={() => onAction(suggestion)}
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
            {suggestion.action.label}
            <ArrowRight size={10} />
          </button>
        </div>
      )}
    </div>
  )
}
