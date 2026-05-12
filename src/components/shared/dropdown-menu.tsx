"use client"

import { useState, useRef, useEffect } from "react"

export interface DropdownMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

export interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: "left" | "right"
}

export function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          [align === "right" ? "right" : "left"]: 0,
          zIndex: 100,
          minWidth: 160,
          background: "var(--ih-surface)",
          border: "1px solid var(--ih-line)",
          borderRadius: "var(--ih-r-md)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          padding: "4px 0",
          animation: "ih-slide-in 0.1s ease-out",
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false) }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 14px",
                border: 0,
                background: "transparent",
                fontSize: 12.5,
                color: item.danger ? "var(--ih-danger, #C0392B)" : "var(--ih-ink)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
