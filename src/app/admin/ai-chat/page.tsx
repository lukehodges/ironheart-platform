"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

const DEMO_MESSAGES = [
  {
    id: 1, role: "user" as const,
    content: "Which clients are most at risk of churn right now?",
  },
  {
    id: 2, role: "assistant" as const,
    content: "",
    toolUse: { label: "Searched engagements, invoices, and booking history", count: 3 },
    body: "Based on engagement activity and payment patterns, two clients stand out:\n\n**Brigham Architects** — workflow rebuild has been paused for 3 weeks. No bookings scheduled. Invoice BA-001 is overdue by 40+ days. Recommend reaching out to Eleanor directly.\n\n**Bowery Mills** — monthly retainer check-ins have dropped in engagement quality. Last review was 3 stars with feedback about late reports. Consider a proactive strategy session.",
  },
  {
    id: 3, role: "user" as const,
    content: "Draft a re-engagement email to Eleanor at Brigham",
  },
  {
    id: 4, role: "assistant" as const,
    content: "",
    toolUse: { label: "Pulled client context and engagement history", count: 2 },
    body: "Here is a draft:\n\n---\n\n**Subject:** Catching up on the workflow project\n\nHi Eleanor,\n\nI wanted to reach out personally. I know the workflow rebuild hit a natural pause point and I want to make sure we get it back on track in a way that works for your team.\n\nI have been reviewing our Phase 1 deliverables and I think we are closer to the finish line than it might feel. Would you be open to a 30-minute call this week to talk through next steps?\n\nNo pressure at all — just want to make sure we deliver what we promised.\n\nBest,\nLuke",
    actions: [
      { label: "Send via email", icon: "mail" as const },
      { label: "Copy to clipboard", icon: "link" as const },
      { label: "Edit draft", icon: "sliders" as const },
    ],
  },
  {
    id: 5, role: "user" as const,
    content: "Compare Q1 vs Q2 revenue so far",
  },
  {
    id: 6, role: "assistant" as const,
    content: "",
    toolUse: { label: "Queried invoices and payments across both quarters", count: 4 },
    body: "**Q1 2026 (Jan-Mar):** Total invoiced $48,775. Paid $40,375. Outstanding $8,400.\n\n**Q2 2026 (Apr-May to date):** Total invoiced $37,325. Paid $18,200. Outstanding $19,125.\n\nQ2 is tracking 28% ahead of Q1 on a per-month basis. However, the outstanding balance is higher — driven by the Brigham overdue invoice ($4,000) and pending Acme retainer ($14,200).\n\nIf both clear this month, Q2 collection rate will match Q1.",
  },
]

const SUGGESTED_PROMPTS = [
  "Summarise this week",
  "Draft a proposal for Olsen",
  "Which clients are at risk?",
  "Compare Q1 vs Q2",
]

const CONTEXTS = ["All", "Northwind", "Vellum", "Acme", "Olsen", "Brigham"]

export default function AIChatPage() {
  const [input, setInput] = useState("")
  const [context, setContext] = useState("All")

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Intelligence &middot; assistant</div>
        <h1 className="ih-serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>AI Assistant</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ih-ink-50)" }}>Ask anything about your business</p>
      </div>

      {/* Context bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, alignItems: "center" }}>
        <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginRight: 4 }}>Context:</span>
        {CONTEXTS.map((c) => (
          <button
            key={c}
            onClick={() => setContext(c)}
            className={`ih-btn ${context === c ? "ih-btn-ghost" : "ih-btn-quiet"} ih-btn-sm`}
            style={{ height: 24, fontSize: 10.5, fontWeight: context === c ? 500 : 400 }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="ih-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {DEMO_MESSAGES.map((msg) => (
            <div key={msg.id} style={{ padding: "12px 20px" }}>
              {msg.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "70%", background: "var(--ih-ink)", color: "var(--ih-bg)", borderRadius: "16px 16px 4px 16px", padding: "10px 16px", fontSize: 13, lineHeight: 1.5 }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0, background: "var(--ih-accent-soft)", color: "var(--ih-accent)" }}>
                    <Icon name="sparkles" size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Tool use visualization */}
                    {msg.toolUse && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "6px 10px", background: "var(--ih-surface-2)", borderRadius: 8, width: "fit-content" }}>
                        <Icon name="search" size={11} style={{ color: "var(--ih-ink-40)" }} />
                        <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{msg.toolUse.label}</span>
                        <span style={{ fontSize: 10, color: "var(--ih-ink-40)", background: "var(--ih-bg)", borderRadius: 4, padding: "1px 5px" }}>{msg.toolUse.count} sources</span>
                      </div>
                    )}
                    {/* Message body */}
                    <div style={{ background: "var(--ih-surface)", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", fontSize: 13, lineHeight: 1.6, color: "var(--ih-ink-80)" }}>
                      {msg.body?.split("\n").map((line, i) => {
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return <div key={i} style={{ fontWeight: 600, marginTop: i > 0 ? 8 : 0 }}>{line.replace(/\*\*/g, "")}</div>
                        }
                        if (line.startsWith("**")) {
                          const parts = line.split("**")
                          return (
                            <div key={i} style={{ marginTop: i > 0 ? 8 : 0 }}>
                              {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>)}
                            </div>
                          )
                        }
                        if (line === "---") return <div key={i} style={{ borderTop: "1px solid var(--ih-line)", margin: "8px 0" }} />
                        if (line === "") return <div key={i} style={{ height: 6 }} />
                        return <div key={i}>{line}</div>
                      })}
                    </div>
                    {/* Action suggestions */}
                    {msg.actions && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        {msg.actions.map((a) => (
                          <button key={a.label} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ height: 26, fontSize: 10.5 }}>
                            <Icon name={a.icon} size={10} /> {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Suggested prompts */}
        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              className="ih-btn ih-btn-quiet ih-btn-sm"
              style={{ height: 26, fontSize: 10.5 }}
              onClick={() => setInput(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask anything... Use "/" for commands, "@" to mention'
              rows={1}
              style={{
                width: "100%", resize: "none", border: "1px solid var(--ih-line)", borderRadius: 10,
                padding: "10px 14px", fontSize: 13, fontFamily: "inherit", background: "var(--ih-surface-2)",
                color: "var(--ih-ink)", outline: "none", minHeight: 42, maxHeight: 120,
              }}
            />
          </div>
          <button className="ih-btn ih-btn-primary" style={{ height: 42, width: 42, padding: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
