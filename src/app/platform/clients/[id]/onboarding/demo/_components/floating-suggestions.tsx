"use client"

import { useEffect } from "react"
import { Sparkles, X } from "lucide-react"
import { DemoSuggestions } from "./demo-suggestions"
import type { Suggestion } from "./types"

interface FloatingSuggestionsProps {
  suggestions: Suggestion[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (s: Suggestion) => void
}

/**
 * Top-right pill in the graph canvas that toggles a LEFT-side slide-in
 * drawer holding the suggestion list. Pill stays visible while the drawer is
 * open; clicking it again, hitting Esc, or the drawer X closes it.
 */
export function FloatingSuggestions({ suggestions, open, onOpenChange, onAction }: FloatingSuggestionsProps): React.ReactElement | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (suggestions.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        title={open ? "Hide suggestions" : "Show suggestions"}
        style={{
          position: "absolute",
          // Stacked under the Overlay menu pill. When the drawer opens, the
          // drawer (z 20) sits *above* this button, so the button visibly
          // tucks behind the panel — exactly what the user asked for.
          top: 56,
          left: 14,
          zIndex: 15,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 999,
          background: open ? "var(--ih-ink)" : "var(--ih-surface)",
          color: open ? "#fff" : "var(--ih-ink)",
          border: `1px solid ${open ? "var(--ih-ink)" : "var(--ih-line-2)"}`,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "var(--ih-font-sans)",
          fontWeight: 500,
          boxShadow: "0 6px 18px -10px rgba(0,0,0,0.30)",
          transition: "background 0.12s, color 0.12s, border-color 0.12s",
        }}
      >
        <Sparkles size={12} style={{ color: open ? "#fff" : "var(--ih-accent)" }} />
        <span>Suggestions</span>
        <span
          className="ih-mono"
          style={{
            padding: "1px 6px",
            borderRadius: 999,
            background: open ? "rgba(255,255,255,0.18)" : "var(--ih-accent)",
            color: "#fff",
            fontSize: 10,
            lineHeight: "1.4",
          }}
        >
          {suggestions.length}
        </span>
      </button>

      <SlideDrawer side="left" open={open} onClose={() => onOpenChange(false)} title="Suggested next steps">
        <DemoSuggestions
          suggestions={suggestions}
          onAction={(s) => {
            onAction(s)
            onOpenChange(false)
          }}
        />
      </SlideDrawer>
    </>
  )
}

/* ------- shared slide-in drawer (exported for reuse with overlays) ------- */

interface SlideDrawerProps {
  side: "left" | "right"
  open: boolean
  onClose: () => void
  title?: string
  width?: number
  children: React.ReactNode
}

export function SlideDrawer({ side, open, onClose, title, width = 400, children }: SlideDrawerProps): React.ReactElement {
  const closed = side === "left" ? `translateX(-${width + 24}px)` : `translateX(${width + 24}px)`
  const sideEdge: React.CSSProperties = side === "left" ? { left: 14 } : { right: 14 }
  return (
    <aside
      aria-hidden={!open}
      style={{
        position: "absolute",
        ...sideEdge,
        top: 14,
        bottom: 14,
        width,
        maxWidth: "calc(100% - 28px)",
        background: "var(--ih-surface)",
        borderRadius: 12,
        border: "1px solid var(--ih-line)",
        boxShadow: open ? "0 18px 50px -12px rgba(0,0,0,0.30)" : "none",
        transform: open ? "translateX(0)" : closed,
        transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms ease",
        display: "flex",
        flexDirection: "column",
        // z 30 — sits above any floating pills (which live at z ~15) so the
        // drawer header and its content are never half-obscured.
        zIndex: 30,
        overflow: "hidden",
      }}
    >
      {title && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: "1px solid var(--ih-line)",
          }}
        >
          <span className="ih-eyebrow">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            style={{
              width: 26,
              height: 26,
              border: "1px solid var(--ih-line-2)",
              background: "var(--ih-surface)",
              cursor: "pointer",
              borderRadius: 6,
              color: "var(--ih-ink-65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={12} />
          </button>
        </header>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>{children}</div>
    </aside>
  )
}
