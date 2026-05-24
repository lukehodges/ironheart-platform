"use client"

import { useEffect, useRef, useState } from "react"
import { HelpCircle, X } from "lucide-react"

/**
 * Bottom-left pill that, when clicked, opens a small popover explaining the
 * meaning of dots, audit chips, edge styles, and node kinds used on the chart.
 */
export function FloatingLegend(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        // Top-right — reactflow's Controls + MiniMap occupy bottom-left and
        // bottom-right, so legend lives up top out of their way.
        top: 14,
        right: 14,
        zIndex: 15,
      }}
    >
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            background: "var(--ih-surface)",
            border: "1px solid var(--ih-line)",
            borderRadius: 10,
            padding: 14,
            boxShadow: "0 14px 38px -12px rgba(0,0,0,0.30)",
            animation: "ih-legend-pop 180ms cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <style jsx global>{`
            @keyframes ih-legend-pop {
              from { opacity: 0; transform: translateY(4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="ih-eyebrow">Legend</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close legend" style={miniBtn()}>
              <X size={11} />
            </button>
          </header>

          <Section title="Interview dot (left)">
            <Row dot="var(--ih-ok)"    label="Completed" />
            <Row dot="var(--ih-warn)"  label="Scheduled / Invited" />
            <Row dot="var(--ih-info)"  label="Target" />
            <Row dot="var(--ih-danger)" label="Declined" />
          </Section>

          <Section title="Questionnaire dot (right)">
            <Row dot="var(--ih-ok)"   label="Completed" />
            <Row dot="var(--ih-warn)" label="In progress / Opened" />
            <Row dot="var(--ih-info)" label="Sent" />
          </Section>

          <Section title="Audit chips">
            <Chip bg="rgba(192,57,43,0.10)" fg="var(--ih-danger)" border="rgba(192,57,43,0.30)" label="DPO" desc="Data Protection Officer" />
            <Chip bg="rgba(184,134,11,0.10)" fg="var(--ih-warn)" border="rgba(184,134,11,0.30)" label="FIN" desc="Finance owner" />
            <Chip bg="rgba(42,93,191,0.10)" fg="var(--ih-info)" border="rgba(42,93,191,0.30)" label="DATA" desc="Data owner" />
            <Chip bg="rgba(106,76,138,0.10)" fg="#6A4C8A" border="rgba(106,76,138,0.30)" label="SEC" desc="Security owner" />
            <Chip bg="var(--ih-surface-2)" fg="var(--ih-ink)" border="var(--ih-line-2)" label="DM" desc="Decision maker" />
            <Chip bg="transparent" fg="var(--ih-ink-65)" border="var(--ih-line-3)" label="FNDR" desc="Founder" />
          </Section>

          <Section title="Edges">
            <Row line="solid"  label="Direct report" />
            <Row line="dashed" label="Dotted-line / advisor" />
            <Row line="dotted" label="Matrix / cross-functional" />
          </Section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="What do the colours mean?"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 11px",
          borderRadius: 999,
          background: open ? "var(--ih-ink)" : "var(--ih-surface)",
          color: open ? "#fff" : "var(--ih-ink-65)",
          border: `1px solid ${open ? "var(--ih-ink)" : "var(--ih-line-2)"}`,
          cursor: "pointer",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
          fontWeight: 500,
          boxShadow: "0 6px 18px -10px rgba(0,0,0,0.30)",
        }}
      >
        <HelpCircle size={12} />
        Legend
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ih-ink-40)", margin: "0 0 6px" }}>
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  )
}

function Row({ dot, line, label }: { dot?: string; line?: "solid" | "dashed" | "dotted"; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ih-ink-65)" }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {line && (
        <span
          style={{
            width: 24,
            height: 0,
            borderTopWidth: line === "solid" ? 1.5 : 1.5,
            borderTopStyle: line === "dotted" ? "dotted" : line === "dashed" ? "dashed" : "solid",
            borderTopColor: line === "dashed" ? "var(--ih-ink-30)" : line === "dotted" ? "var(--ih-info)" : "var(--ih-line)",
            flexShrink: 0,
          }}
        />
      )}
      <span>{label}</span>
    </div>
  )
}

function Chip({ bg, fg, border, label, desc }: { bg: string; fg: string; border: string; label: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ih-ink-65)" }}>
      <span
        className="ih-mono"
        style={{
          fontSize: 8.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "1px 5px",
          borderRadius: 3,
          background: bg,
          color: fg,
          border: `1px solid ${border}`,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span>{desc}</span>
    </div>
  )
}

function miniBtn(): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    border: "1px solid var(--ih-line)",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 4,
    color: "var(--ih-ink-50)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }
}
