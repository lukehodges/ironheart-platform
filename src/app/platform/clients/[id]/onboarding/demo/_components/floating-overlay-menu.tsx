"use client"

import { useEffect, useRef, useState } from "react"
import {
  CircleDot,
  FileText,
  Flame,
  Layers,
  Network,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react"
import type { Overlay } from "./types"

interface FloatingOverlayMenuProps {
  overlay: Overlay
  onOverlayChange: (o: Overlay) => void
}

const OVERLAYS: Array<{ key: Overlay; label: string; icon: React.ComponentType<{ size?: number }>; hint: string }> = [
  { key: "NONE", label: "Default", icon: Layers, hint: "No overlay" },
  { key: "INTERVIEW_COVERAGE", label: "Interviews", icon: CircleDot, hint: "Surface interview coverage" },
  { key: "FORM_STATUS", label: "Forms", icon: FileText, hint: "Surface questionnaire state" },
  { key: "AUDIT_CRITICAL", label: "Audit-critical", icon: Flame, hint: "Highlight audit-critical people" },
  { key: "TENURE", label: "Tenure", icon: Sparkles, hint: "Saturation by years at the company" },
  { key: "REPORTING_DEPTH", label: "Depth", icon: Network, hint: "Gradient by distance from CEO" },
]

/**
 * Compact dropdown pill in the graph canvas: shows the current overlay and
 * lets the user switch / clear. Replaces the toolbar overlay-tabs section
 * so we don't waste a whole row of chrome for something used occasionally.
 */
export function FloatingOverlayMenu({ overlay, onOverlayChange }: FloatingOverlayMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const current = OVERLAYS.find((o) => o.key === overlay) ?? OVERLAYS[0]!
  const CurrentIcon = current.icon
  const isActive = overlay !== "NONE"

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        // Top-left, with the Suggestions pill stacked just beneath it.
        // When the dropdown is open we raise this wrapper to z 50 so the
        // dropdown sits above the Suggestions pill below it (without raising
        // it we'd be stuck inside the wrapper's stacking context). When closed
        // we drop back to 15 so the suggestions / overlay drawers can tuck
        // the pill behind them cleanly.
        top: 14,
        left: 14,
        zIndex: open ? 50 : 15,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Choose an overlay"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          background: isActive ? "var(--ih-ink)" : "var(--ih-surface)",
          color: isActive ? "#fff" : "var(--ih-ink)",
          border: `1px solid ${isActive ? "var(--ih-ink)" : "var(--ih-line-2)"}`,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "var(--ih-font-sans)",
          fontWeight: 500,
          boxShadow: "0 6px 18px -10px rgba(0,0,0,0.30)",
        }}
      >
        <CurrentIcon size={12} />
        <span>Overlay: {current.label}</span>
        <ChevronDown size={11} style={{ opacity: 0.75 }} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: 220,
            background: "var(--ih-surface)",
            border: "1px solid var(--ih-line)",
            borderRadius: 10,
            boxShadow: "0 14px 38px -12px rgba(0,0,0,0.30)",
            overflow: "hidden",
            // High z so the dropdown sits above the Suggestions pill (z 15)
            // it visually overlaps below it.
            zIndex: 50,
            animation: "ih-overlay-menu-pop 180ms cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <style jsx global>{`
            @keyframes ih-overlay-menu-pop {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          {OVERLAYS.map((o) => {
            const Icon = o.icon
            const selected = o.key === overlay
            return (
              <button
                key={o.key}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onOverlayChange(o.key)
                  setOpen(false)
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  border: "none",
                  background: selected ? "var(--ih-surface-2)" : "transparent",
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontFamily: "var(--ih-font-sans)",
                  color: "var(--ih-ink)",
                  textAlign: "left",
                }}
              >
                <Icon size={12} />
                <span style={{ flex: 1 }}>{o.label}</span>
                {selected && <Check size={12} style={{ color: "var(--ih-accent)" }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
