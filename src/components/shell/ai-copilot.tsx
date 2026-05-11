"use client"

import { Icon, type IconName } from "./icon"

/* ── Types ──────────────────────────────────────────────────── */

interface AICopilotProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* ── Component ──────────────────────────────────────────────── */

export function AICopilot({ open, onOpenChange }: AICopilotProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            background: "rgba(14, 16, 19, 0.08)",
          }}
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          zIndex: 9991,
          background: "var(--ih-surface)",
          borderLeft: "1px solid var(--ih-line-2)",
          boxShadow: open ? "-12px 0 32px rgba(14,16,19,0.06)" : "none",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--ih-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="sparkles" size={15} style={{ color: "var(--ih-accent)" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Copilot</div>
              <div
                className="ih-mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--ih-ink-40)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                reading · Northwind Co.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm">
              <Icon name="refresh" size={11} />
            </button>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => onOpenChange(false)}>
              <Icon name="x" size={11} />
            </button>
          </div>
        </div>

        {/* Context chips */}
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--ih-line)",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <span
            className="ih-pill"
            style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent" }}
          >
            Northwind Co.
          </span>
          <span className="ih-pill">Q2 retainer</span>
          <span className="ih-pill">/inv_2041</span>
          <span className="ih-pill" style={{ cursor: "pointer" }}>
            <Icon name="plus" size={9} /> add context
          </span>
        </div>

        {/* Conversation */}
        <div
          className="scrollbar-thin"
          style={{ flex: 1, overflowY: "auto", padding: 18 }}
        >
          {/* User message */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <div
              style={{
                background: "var(--ih-ink)",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 14,
                borderBottomRightRadius: 4,
                maxWidth: 360,
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              Summarise where we are with Northwind and what I should do today.
            </div>
          </div>

          {/* Assistant message */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Icon name="sparkles" size={13} style={{ color: "var(--ih-accent)", marginTop: 2 }} />
              <div className="ih-eyebrow">Summary · 3 actions</div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ih-ink-90)" }}>
              <p style={{ margin: "0 0 10px" }}>
                Sprint 4 is <strong>78% complete</strong> with 6h over forecast — Portal v2 scope grew.
                NPS 9 from last touch, so the renewal posture is strong.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                Outstanding is <strong>$4,200</strong> on{" "}
                <span className="ih-mono" style={{ fontSize: 11 }}>/inv_2041</span>, 14 days old.
                Mira typically pays on chase.
              </p>
              <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
                <li>Send the friendly chase I drafted (one click).</li>
                <li>Confirm portal launch slips to sprint 5 — Sam needs your call.</li>
                <li>Open the Q3 renewal conversation in the last week of June.</li>
              </ul>
            </div>

            {/* Action chips */}
            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {(
                [
                  ["mail", "Send chase to Mira · friendly", "approve · 1 click"],
                  ["chat", "Open Sam's portal scope thread", "jump to thread"],
                  ["calendar", "Draft renewal slot · last wk Jun", "draft event"],
                ] as [IconName, string, string][]
              ).map(([icon, title, sub]) => (
                <div
                  key={title}
                  className="ih-card"
                  style={{
                    padding: 10,
                    display: "grid",
                    gridTemplateColumns: "24px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Icon name={icon} size={13} style={{ color: "var(--ih-ink-50)" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
                    <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{sub}</div>
                  </div>
                  <Icon name="arrowRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
                </div>
              ))}
            </div>

            {/* Sources */}
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                border: "1px solid var(--ih-line)",
                borderRadius: 8,
                background: "var(--ih-surface-2)",
              }}
            >
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Sources · 6</div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  fontFamily: "var(--ih-font-mono)",
                  fontSize: 10,
                }}
              >
                {["/eng_0481", "/inv_2041", "/bk_2204", "/wf_204", "/wf_887", "client.notes"].map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "2px 6px",
                      background: "var(--ih-surface)",
                      border: "1px solid var(--ih-line)",
                      borderRadius: 4,
                      color: "var(--ih-ink-65)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick prompts */}
        <div
          style={{
            padding: "8px 18px",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            borderTop: "1px solid var(--ih-line)",
            flexShrink: 0,
          }}
        >
          {["Draft a Q3 brief", "Compare last 3 sprints", "Forecast Q3 hours", "Who is at risk?"].map((p) => (
            <span key={p} className="ih-pill" style={{ fontSize: 10, padding: "4px 8px", cursor: "pointer" }}>
              {p}
            </span>
          ))}
        </div>

        {/* Composer */}
        <div
          style={{
            padding: 14,
            borderTop: "1px solid var(--ih-line)",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid var(--ih-line)",
              borderRadius: 10,
              padding: 10,
              background: "var(--ih-bg)",
            }}
          >
            <div
              style={{ fontSize: 12, color: "var(--ih-ink-40)", minHeight: 32 }}
              contentEditable
              suppressContentEditableWarning
            >
              Ask, or use /command. Try: /draft email · /summarise · /find
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }}>
                /
              </button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }}>
                @
              </button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }}>
                <Icon name="link" size={10} />
              </button>
            </div>
          </div>
          <button className="ih-btn ih-btn-accent" style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}>
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
