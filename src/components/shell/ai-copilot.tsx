"use client"

import { useState, useRef, useEffect } from "react"
import { NotificationToast } from "@/components/shared"
import { Icon, type IconName } from "./icon"

/* ── Types ──────────────────────────────────────────────────── */

interface AICopilotProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CopilotMessage {
  id: number
  role: "user" | "assistant"
  content: string
}

const COPILOT_DEMO_RESPONSES = [
  "Sprint 4 is 78% complete with 6h over forecast. NPS 9 from last touch. Outstanding is $4,200 on /inv_2041, 14 days old. I would recommend sending a friendly chase to Mira.",
  "Based on the last 3 sprints, velocity has increased 15% while scope accuracy improved. The team is delivering more predictably each cycle.",
  "Q3 forecast shows 340 billable hours across 4 active engagements. Utilisation is projected at 82%, up from 76% in Q2.",
  "Two clients show churn risk signals: Brigham Architects (paused 3 weeks, overdue invoice) and Bowery Mills (declining review scores).",
]

/* ── Component ──────────────────────────────────────────────── */

export function AICopilot({ open, onOpenChange }: AICopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    { id: 1, role: "user", content: "Summarise where we are with Northwind and what I should do today." },
  ])
  const [toast, setToast] = useState<{ message: string; tone?: string } | null>(null)
  const [nextId, setNextId] = useState(2)
  const composerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userId = nextId
    const aiId = nextId + 1
    setNextId(prev => prev + 2)
    setMessages(prev => [...prev, { id: userId, role: "user", content: text.trim() }])
    if (composerRef.current) composerRef.current.textContent = ""
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: aiId, role: "assistant",
        content: COPILOT_DEMO_RESPONSES[aiId % COPILOT_DEMO_RESPONSES.length],
      }])
    }, 800)
  }

  const handleSend = () => {
    const text = composerRef.current?.textContent || ""
    sendMessage(text)
  }

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
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({ message: "Context refreshed", tone: "ok" })}>
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
          <span className="ih-pill" style={{ cursor: "pointer" }} onClick={() => setToast({message: "Add context picker coming soon", tone: "info"})}>
            <Icon name="plus" size={9} /> add context
          </span>
        </div>

        {/* Conversation */}
        <div
          ref={scrollRef}
          className="scrollbar-thin"
          style={{ flex: 1, overflowY: "auto", padding: 18 }}
        >
          {messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 14 }}>
              {msg.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <Icon name="sparkles" size={13} style={{ color: "var(--ih-accent)", marginTop: 2 }} />
                    <div className="ih-eyebrow">Copilot</div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ih-ink-90)" }}>
                    <p style={{ margin: 0 }}>{msg.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Static action chips (shown once at end of initial assistant context) */}
          {messages.length <= 2 && (
            <>
              <div style={{ display: "grid", gap: 6, marginTop: 12, marginBottom: 14 }}>
                {(
                  [
                    ["mail", "Send chase to Mira", "approve"],
                    ["chat", "Open Sam's scope thread", "jump to thread"],
                    ["calendar", "Draft renewal slot", "draft event"],
                  ] as [IconName, string, string][]
                ).map(([icon, title, sub]) => (
                  <div
                    key={title}
                    className="ih-card"
                    style={{ padding: 10, display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, alignItems: "center", cursor: "pointer" }}
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
              <div style={{ padding: "10px 12px", border: "1px solid var(--ih-line)", borderRadius: 8, background: "var(--ih-surface-2)" }}>
                <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Sources</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontFamily: "var(--ih-font-mono)", fontSize: 10 }}>
                  {["/eng_0481", "/inv_2041", "/bk_2204", "/wf_204"].map((s) => (
                    <span key={s} style={{ padding: "2px 6px", background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: 4, color: "var(--ih-ink-65)" }}>{s}</span>
                  ))}
                </div>
              </div>
            </>
          )}
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
            <span key={p} className="ih-pill" style={{ fontSize: 10, padding: "4px 8px", cursor: "pointer" }} onClick={() => sendMessage(p)}>
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
              ref={composerRef}
              style={{ fontSize: 12, color: "var(--ih-ink)", minHeight: 32, outline: "none" }}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              onFocus={(e) => { if (e.currentTarget.textContent === "Ask, or use /command...") e.currentTarget.textContent = "" }}
            >
              Ask, or use /command...
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }} onClick={() => setToast({message: "Slash commands: /draft, /summarise, /find", tone: "info"})}>
                /
              </button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }} onClick={() => setToast({message: "Mention a person or record", tone: "info"})}>
                @
              </button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, padding: "0 6px" }} onClick={() => setToast({message: "Link a record to this conversation", tone: "info"})}>
                <Icon name="link" size={10} />
              </button>
            </div>
          </div>
          <button className="ih-btn ih-btn-accent" style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }} onClick={handleSend}>
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </div>

      {toast && <NotificationToast message={toast.message} tone={toast.tone as "ok"} onDismiss={() => setToast(null)} />}
    </>
  )
}
