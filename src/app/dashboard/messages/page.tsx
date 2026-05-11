"use client"

import { useState } from "react"
import { Icon } from "@/components/shell"

/* ── Demo data ──────────────────────────────────────────────────────────── */

interface Message {
  id: string
  sender: "consultant" | "client"
  name: string
  initials: string
  text: string
  time: string
  hasAttachment?: string
}

const MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "consultant",
    name: "Luke",
    initials: "LH",
    text: "Sprint 4 kicked off this morning. Approval workflow is the priority \u2014 I\u2019ll have a working prototype by Wednesday for you to test.",
    time: "Mon 5 May, 09:14",
  },
  {
    id: "m2",
    sender: "client",
    name: "Mira",
    initials: "MS",
    text: "Perfect. Can we make sure the approval chain supports delegation? Our team leads sometimes cover for each other.",
    time: "Mon 5 May, 10:32",
  },
  {
    id: "m3",
    sender: "consultant",
    name: "Luke",
    initials: "LH",
    text: "Already in the spec. Delegation + automatic escalation after 48h if the approver doesn\u2019t act. I\u2019ll walk you through it in the sprint review.",
    time: "Mon 5 May, 10:45",
  },
  {
    id: "m4",
    sender: "consultant",
    name: "Luke",
    initials: "LH",
    text: "Portal v2 is ready for your review. I went a bit over on the comments view (6 extra hours) but I think you\u2019ll see why in the demo.",
    time: "Thu 8 May, 16:20",
    hasAttachment: "portal-v2-preview.pdf",
  },
  {
    id: "m5",
    sender: "client",
    name: "Mira",
    initials: "MS",
    text: "Just had a look \u2014 this is really polished. I\u2019ll send detailed feedback in the deliverables section. The extra time was worth it.",
    time: "Fri 9 May, 09:08",
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function MessagesPage() {
  const [draft, setDraft] = useState("")

  return (
    <div style={{ padding: "40px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 className="ih-serif" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>Messages</h1>
      <p style={{ marginTop: 10, fontSize: 14, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
        Conversation with Luke Hodges &middot; Ironheart Studio
      </p>

      {/* Messages thread */}
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        {MESSAGES.map((msg) => {
          const isClient = msg.sender === "client"
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isClient ? "row-reverse" : "row",
                gap: 12,
                maxWidth: "80%",
                alignSelf: isClient ? "flex-end" : "flex-start",
                width: "100%",
              }}
            >
              {/* Avatar */}
              <div
                className="ih-avatar"
                style={{
                  width: 32,
                  height: 32,
                  fontSize: 10,
                  flexShrink: 0,
                  background: isClient ? "var(--ih-ink)" : "var(--ih-surface-2)",
                  color: isClient ? "#fff" : "var(--ih-ink)",
                }}
              >
                {msg.initials}
              </div>

              {/* Bubble */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: isClient ? "var(--ih-ink)" : "var(--ih-surface-2)",
                  color: isClient ? "#fff" : "var(--ih-ink)",
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{msg.name}</span>
                  <span
                    className="ih-mono"
                    style={{
                      fontSize: 9,
                      color: isClient ? "rgba(255,255,255,0.45)" : "var(--ih-ink-40)",
                    }}
                  >
                    {msg.time}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{msg.text}</p>

                {msg.hasAttachment && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: isClient ? "rgba(255,255,255,0.1)" : "var(--ih-surface)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                    }}
                  >
                    <Icon name="file" size={12} />
                    {msg.hasAttachment}
                    <Icon name="download" size={11} style={{ marginLeft: "auto", cursor: "pointer" }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div
        className="ih-card"
        style={{
          marginTop: 24,
          padding: "16px 20px",
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <button
          className="ih-btn ih-btn-ghost ih-btn-sm"
          style={{ height: 36, width: 36, padding: 0, flexShrink: 0 }}
          title="Attach file"
        >
          <Icon name="link" size={14} />
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          rows={1}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--ih-line)",
            background: "var(--ih-surface)",
            fontSize: 13,
            fontFamily: "inherit",
            lineHeight: 1.5,
            resize: "none",
            color: "var(--ih-ink)",
            minHeight: 36,
          }}
        />
        <button className="ih-btn ih-btn-accent ih-btn-sm" style={{ height: 36, flexShrink: 0 }}>
          Send
        </button>
      </div>
    </div>
  )
}
