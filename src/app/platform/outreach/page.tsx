"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NotificationToast } from "@/components/shared"
import { Icon } from "@/components/shell"

const SEQUENCES = [
  { name: "Q2 consulting push", contacts: 34, openRate: 62, replyRate: 18, status: "active" as const },
  { name: "Ops audit leads", contacts: 22, openRate: 55, replyRate: 12, status: "active" as const },
  { name: "Referral re-engage", contacts: 15, openRate: 71, replyRate: 24, status: "paused" as const },
  { name: "Conference follow-up", contacts: 28, openRate: 48, replyRate: 9, status: "active" as const },
]

const QUEUE = [
  { channel: "mail" as const, action: "Email Sarah at Vellum", detail: "Follow-up 2 — value hook", time: "09:30" },
  { channel: "users" as const, action: "LinkedIn connect Jonas at Bowery", detail: "Mutual connection intro", time: "10:00" },
  { channel: "phone" as const, action: "Call Eleanor at Brigham", detail: "Re-engage after pause", time: "10:30" },
  { channel: "chat" as const, action: "DM Asha at Pebble & Pine", detail: "Discovery follow-up", time: "11:00" },
  { channel: "mail" as const, action: "Email Tom at Vellum", detail: "Case study share", time: "11:30" },
  { channel: "users" as const, action: "LinkedIn engage Mira at Sea Glass", detail: "Comment on post", time: "12:00" },
  { channel: "mail" as const, action: "Email Jamie at Westfield", detail: "Initial outreach", time: "13:00" },
  { channel: "phone" as const, action: "Call Sarah at Northwind", detail: "Referral ask", time: "14:00" },
]

const REPLIES = [
  { from: "Jonas Hale", company: "Bowery Mills", sentiment: "Interested" as const, preview: "Thanks for reaching out. We have been looking at streamlining ops — can you send more detail on the audit process?", time: "2h ago" },
  { from: "Mira Patel", company: "Sea Glass Studio", sentiment: "Interested" as const, preview: "Love the case study. Let us book a discovery call next week. What does your availability look like?", time: "4h ago" },
  { from: "Dave Chen", company: "Halcyon Corp", sentiment: "Not Now" as const, preview: "Appreciate the follow-up but we are heads down on a migration until Q3. Can you circle back in August?", time: "6h ago" },
  { from: "Nina Torres", company: "Beacon Digital", sentiment: "Wrong Person" as const, preview: "I am no longer heading up operations here — you will want to reach out to Marcus Reed instead.", time: "1d ago" },
  { from: "Tom Reeves", company: "Vellum & Co.", sentiment: "Interested" as const, preview: "Interesting timing. We just finished phase 1 of our portal and could use help on phase 2 planning.", time: "1d ago" },
]

const TEMPLATES = [
  { name: "Value hook", desc: "Lead with a specific insight about their business", openRate: 64, replyRate: 18 },
  { name: "Insight follow-up", desc: "Share a relevant case study or data point", openRate: 58, replyRate: 14 },
  { name: "Final nudge", desc: "Friendly close with clear CTA and deadline", openRate: 52, replyRate: 11 },
]

function sentimentStyle(s: "Interested" | "Not Now" | "Wrong Person") {
  if (s === "Interested") return { bg: "var(--ih-ok-soft)", color: "var(--ih-ok)" }
  if (s === "Not Now") return { bg: "var(--ih-warn-soft)", color: "var(--ih-warn)" }
  return { bg: "var(--ih-surface-2)", color: "var(--ih-ink-50)" }
}

function channelIcon(ch: "mail" | "users" | "phone" | "chat") {
  return ch
}

export default function OutreachPage() {
  const router = useRouter()
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<{message: string; tone?: string} | null>(null)

  const markDone = (idx: number) => {
    setDoneSet((prev) => new Set(prev).add(idx))
  }

  const touchesDone = 47
  const touchesTarget = 100
  const progressPct = Math.round((touchesDone / touchesTarget) * 100)

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Outreach &middot; command center · <span style={{ color: "var(--ih-accent)" }}>★</span></div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 44, lineHeight: 0.98 }}>
            Daily outreach. <span className="ih-italic-red">47</span> touches today.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => router.push("/platform/analytics")}><Icon name="chart" size={12} /> Analytics</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={() => setToast({message: "New sequence created", tone: "ok"})}><Icon name="plus" size={12} /> New sequence</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ih-card" style={{ padding: "14px 18px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Today&apos;s progress</span>
          <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{touchesDone}/{touchesTarget} touches</span>
        </div>
        <div style={{ height: 8, background: "var(--ih-surface-2)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--ih-accent)", borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: "var(--ih-ink-50)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="mail" size={10} /> 20 emails</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="users" size={10} /> 12 LinkedIn</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="phone" size={10} /> 8 calls</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="chat" size={10} /> 7 DMs</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { l: "Emails Sent", v: "20", d: "+5", h: "today", icon: "mail" as const },
          { l: "LinkedIn", v: "12", d: "+3", h: "connects + messages", icon: "users" as const },
          { l: "Calls Made", v: "8", d: "+2", h: "today", icon: "phone" as const },
          { l: "DMs Sent", v: "7", d: "+1", h: "today", icon: "chat" as const },
          { l: "Response Rate", v: "14%", d: "+2%", h: "this week", icon: "target" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "var(--ih-ok)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Sequences + Queue */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 28 }}>
        {/* Active sequences */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="ih-eyebrow">Active</span>
              <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Sequences</h3>
            </div>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Showing all sequences", tone: "ok"})}>View all &rarr;</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--ih-surface-2)" }}>
                {["Sequence", "Contacts", "Open %", "Reply %", "Status", ""].map((h) => (
                  <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEQUENCES.map((seq, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--ih-line)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{seq.name}</td>
                  <td style={{ padding: "10px 14px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{seq.contacts}</span></td>
                  <td style={{ padding: "10px 14px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{seq.openRate}%</span></td>
                  <td style={{ padding: "10px 14px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{seq.replyRate}%</span></td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className={`ih-dot ${seq.status === "active" ? "ih-dot-ok" : "ih-dot-warn"}`} />
                      <span style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{seq.status === "active" ? "Active" : "Paused"}</span>
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, fontSize: 10 }} onClick={() => setToast({message: seq.status === "active" ? "Sequence paused" : "Sequence resumed", tone: seq.status === "active" ? "warn" : "ok"})}>
                      {seq.status === "active" ? <><Icon name="pause" size={9} /> Pause</> : <><Icon name="play" size={9} /> Resume</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Today's queue */}
        <div className="ih-card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="ih-eyebrow">Today</span>
              <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Queue</h3>
            </div>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{QUEUE.length - doneSet.size} remaining</span>
          </div>
          <div>
            {QUEUE.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                  borderTop: i === 0 ? "0" : "1px solid var(--ih-line)",
                  opacity: doneSet.has(i) ? 0.4 : 1,
                  textDecoration: doneSet.has(i) ? "line-through" : "none",
                }}
              >
                <Icon name={channelIcon(item.channel)} size={13} style={{ color: "var(--ih-ink-40)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{item.action}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{item.detail} &middot; {item.time}</div>
                </div>
                {!doneSet.has(i) && (
                  <button
                    className="ih-btn ih-btn-ghost ih-btn-sm"
                    style={{ height: 22, fontSize: 10 }}
                    onClick={() => markDone(i)}
                  >
                    <Icon name="check" size={10} /> Done
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reply inbox preview */}
      <div className="ih-card" style={{ marginBottom: 28 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="ih-eyebrow">Incoming</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Recent replies</h3>
          </div>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({message: "Opening full inbox", tone: "ok"})}>Open full inbox &rarr;</button>
        </div>
        <div>
          {REPLIES.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
              <div className="ih-avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>
                {r.from.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{r.from}</span>
                  <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r.company}</span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 9999,
                      background: sentimentStyle(r.sentiment).bg,
                      color: sentimentStyle(r.sentiment).color,
                    }}
                  >
                    {r.sentiment}
                  </span>
                  <span className="ih-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ih-ink-40)" }}>{r.time}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.preview}
                </p>
              </div>
              <Icon name="arrowUpRight" size={12} style={{ color: "var(--ih-ink-30)", flexShrink: 0, marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span className="ih-eyebrow">Library</span>
            <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Templates</h3>
          </div>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({message: "Template editor opened", tone: "ok"})}><Icon name="plus" size={11} /> New template</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {TEMPLATES.map((t, i) => (
            <div key={i} className="ih-card" style={{ padding: 16 }}>
              <div className="ih-serif" style={{ fontSize: 16, marginBottom: 4 }}>{t.name}</div>
              <p style={{ fontSize: 12, color: "var(--ih-ink-65)", margin: "0 0 12px", lineHeight: 1.4 }}>{t.desc}</p>
              <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
                <span className="ih-mono" style={{ color: "var(--ih-ink-50)" }}>Open {t.openRate}%</span>
                <span className="ih-mono" style={{ color: "var(--ih-ink-50)" }}>Reply {t.replyRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toast && <NotificationToast message={toast.message} tone={toast.tone as any} onDismiss={() => setToast(null)} />}
    </div>
  )
}
