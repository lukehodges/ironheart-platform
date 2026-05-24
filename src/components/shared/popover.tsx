"use client"

import { useState, useRef, useEffect } from "react"
import type { ReactNode } from "react"
import { Icon } from "@/components/shell"

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface PopoverProps {
  /** Element that toggles the popover open/closed */
  trigger: ReactNode
  /** Render prop: receives a `close` callback so items can dismiss the popover */
  children: (close: () => void) => ReactNode
  /** Horizontal alignment of the dropdown panel relative to the trigger */
  align?: "left" | "right"
  /** Width of the panel in px (default 220) */
  width?: number
  /** Max height with scroll (default 380) */
  maxHeight?: number
}

export interface PopoverHeaderProps {
  children: ReactNode
}

export interface PopoverItemProps {
  onClick: () => void
  children: ReactNode
  /** Highlight item as currently selected */
  active?: boolean
  /** Render text in danger colour */
  danger?: boolean
}

/* ── Popover ────────────────────────────────────────────────────────────────── */

/**
 * Shared menu-style popover for admin pages.
 *
 * Uses a render-prop `children` so callers can embed arbitrary content
 * (grouped sections, active-state items, etc.) that can call `close()` to
 * dismiss. Outside-click and ESC both dismiss.
 *
 * Usage:
 *   <Popover align="right" width={200} trigger={<button>…</button>}>
 *     {close => (
 *       <>
 *         <PopoverHeader>Actions</PopoverHeader>
 *         <PopoverItem onClick={() => { doSomething(); close() }}>Do something</PopoverItem>
 *         <PopoverItem danger onClick={() => { destroy(); close() }}>Destroy</PopoverItem>
 *       </>
 *     )}
 *   </Popover>
 */
export function Popover({
  trigger,
  children,
  align = "left",
  width = 220,
  maxHeight = 380,
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Outside-click dismiss
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  // ESC dismiss
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div
          className="animate-pop-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align === "right" ? "right" : "left"]: 0,
            zIndex: 100,
            width,
            background: "var(--ih-surface)",
            border: "1px solid var(--ih-line)",
            borderRadius: "var(--ih-r-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: 4,
            maxHeight,
            overflowY: "auto",
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/* ── PopoverHeader ──────────────────────────────────────────────────────────── */

/** Section label inside a Popover */
export function PopoverHeader({ children }: PopoverHeaderProps) {
  return (
    <div
      className="ih-eyebrow"
      style={{ padding: "8px 10px 4px", fontSize: 9 }}
    >
      {children}
    </div>
  )
}

/* ── PopoverItem ────────────────────────────────────────────────────────────── */

/** Clickable row inside a Popover */
export function PopoverItem({ active, onClick, children, danger }: PopoverItemProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)"
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background =
          active ? "var(--ih-accent-soft)" : "transparent"
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "6px 10px",
        border: 0,
        background: active ? "var(--ih-accent-soft)" : "transparent",
        fontSize: 12,
        color: danger ? "var(--ih-danger)" : "var(--ih-ink)",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: "var(--ih-r-sm)",
      }}
    >
      {active && <Icon name="check" size={11} style={{ color: "var(--ih-accent)" }} />}
      {!active && <span style={{ width: 11 }} />}
      {children}
    </button>
  )
}
