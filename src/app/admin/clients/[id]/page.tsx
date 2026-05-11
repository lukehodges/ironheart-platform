"use client"

import { useState } from "react"
import { Icon, type IconName } from "@/components/shell"

/* ── Data ────────────────────────────────────────────────────────────────── */
const STAGES = [
  { id: "DISCOVERY", label: "Discovery", done: true },
  { id: "PROPOSAL", label: "Proposal", done: true },
  { id: "CONTRACTED", label: "Contracted", done: true },
  { id: "ONBOARDING", label: "Onboarding", done: true },
  { id: "AUDITING", label: "Auditing", current: true },
  { id: "REPORTING", label: "Reporting" },
  { id: "IMPLEMENTING", label: "Implementing" },
  { id: "RETAINER", label: "Retainer" },
]

interface TimelineItem { time: string; tone: string; icon: IconName; title: string; meta: string; link?: string }
interface TimelineDay { day: string; items: TimelineItem[] }

const TIMELINE: TimelineDay[] = [
  { day: "Today \u00b7 Thu Apr 04", items: [
    { time: "10:42", tone: "info", icon: "file", title: "Draft audit report shared", meta: "Deliverable \u00b7 4 files \u00b7 22 pages", link: "audit-summary-v3.pdf" },
    { time: "10:38", tone: "accent", icon: "workflow", title: "Workflow \u2192 audit-completion-bundle ran", meta: "5 actions \u00b7 invoice queued \u00b7 Drive sync \u00b7 Slack ping" },
    { time: "09:11", tone: "info", icon: "invoice", title: "Invoice #2 queued (\u00a312,000)", meta: "Triggered by approval on Audit Summary" },
  ]},
  { day: "Yesterday \u00b7 Wed Apr 03", items: [
    { time: "16:24", tone: "ok", icon: "check", title: "Milestone completed: Audit findings", meta: "All 4 deliverables accepted" },
    { time: "14:02", tone: "ok", icon: "check", title: "Sarah approved \u2018Audit Summary\u2019", meta: "Comment: \"This is excellent \u2014 invoice when ready.\"" },
    { time: "11:18", tone: "info", icon: "chat", title: "Email from Sarah Chen", meta: "Re: any concerns about timeline \u2026" },
  ]},
  { day: "Mon Apr 01", items: [
    { time: "\u2014", tone: "warn", icon: "clock", title: "Approval requested: Audit Summary", meta: "Sent to sarah@northwind.co" },
    { time: "\u2014", tone: "info", icon: "calendar", title: "Mid-engagement check-in call", meta: "30 min \u00b7 with Sarah & Tom \u00b7 notes attached" },
  ]},
  { day: "Mar 26 \u2192 28", items: [
    { time: "\u2014", tone: "info", icon: "audit", title: "Audit fieldwork \u2014 week 2", meta: "12 interviews \u00b7 4 workflows mapped \u00b7 time-on-task data captured" },
  ]},
  { day: "Mar 18 \u00b7 kickoff", items: [
    { time: "\u2014", tone: "ok", icon: "handshake", title: "Engagement signed", meta: "Proposal v2 (\u00a324,500) \u00b7 6-week project \u00b7 audit-then-implement" },
    { time: "\u2014", tone: "info", icon: "calendar", title: "Discovery call", meta: "60 min \u00b7 Zoom recording \u00b7 transcript attached" },
  ]},
]

/* ── Sub-components ──────────────────────────────────────────────────────── */

function InfoRow({ label, value, mono = false, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)", fontSize: 12 }}>
      <span style={{ color: "var(--ih-ink-50)" }}>{label}</span>
      <span style={{ color: accent || "var(--ih-ink)", textAlign: "right", fontFamily: mono ? "var(--ih-font-mono)" : undefined, fontVariantNumeric: mono ? "tabular-nums" : undefined }}>{value}</span>
    </div>
  )
}

function StageStrip() {
  return (
    <div style={{ background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-xl)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
      {STAGES.map((s, i) => {
        const fill = s.done ? "var(--ih-ink)" : s.current ? "var(--ih-accent)" : "var(--ih-surface-3)"
        const fg = s.done || s.current ? "#fff" : "var(--ih-ink-50)"
        return (
          <div key={s.id} style={{ display: "contents" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" }}>
              <div style={{ width: 24, height: 24, borderRadius: "var(--ih-r-pill)", background: fill, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ih-font-mono)", fontSize: 10, fontWeight: 600, border: s.current ? "3px solid var(--ih-accent-soft)" : "none", boxShadow: s.current ? "0 0 0 1px var(--ih-accent)" : "none" }}>
                {s.done ? <Icon name="check" size={10} stroke={2.5} /> : i + 1}
              </div>
              <div style={{ fontSize: 10.5, marginTop: 6, fontWeight: s.current ? 600 : 400, color: s.current ? "var(--ih-accent)" : s.done ? "var(--ih-ink-65)" : "var(--ih-ink-40)", fontFamily: "var(--ih-font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              {s.current && <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", marginTop: 2 }}>day 14 of 21</div>}
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ flex: 0.4, height: 1, background: s.done ? "var(--ih-ink)" : "var(--ih-line-2)", marginTop: -18, opacity: s.done ? 1 : 0.6 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LeftRail() {
  return (
    <aside style={{ width: 280, borderRight: "1px solid var(--ih-line)", padding: "20px 16px", overflowY: "auto", flexShrink: 0 }} className="scrollbar-thin">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div className="ih-avatar ih-avatar-xl" style={{ background: "var(--ih-surface-2)", color: "var(--ih-accent)" }}>N</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Northwind Logistics</div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 2 }}>customer {"\u00b7"} since aug 2024</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {["#fintech", "#repeat", "#priority"].map(t => (
          <span key={t} className="ih-pill" style={{ fontSize: 9, fontFamily: "var(--ih-font-sans)", textTransform: "lowercase", letterSpacing: "0.02em", padding: "2px 7px" }}>{t}</span>
        ))}
      </div>

      <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Primary contact</div>
      <InfoRow label="Name" value="Sarah Chen" />
      <InfoRow label="Role" value="Head of Operations" />
      <InfoRow label="Email" value="sarah@northwind.co" />
      <InfoRow label="Phone" value="+44 20 7946 0412" mono />

      <div className="ih-eyebrow" style={{ marginTop: 18, marginBottom: 4 }}>Customer record</div>
      <InfoRow label="Total spend" value="\u00a332,500" mono />
      <InfoRow label="Engagements" value="2" mono />
      <InfoRow label="Bookings" value="14" mono />
      <InfoRow label="Last booking" value="Mar 18" mono />
      <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ marginTop: 6, width: "100%", justifyContent: "space-between" }}>
        Open customer profile <Icon name="arrowUpRight" size={11} />
      </button>

      <div className="ih-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Client portal</div>
      <div className="ih-card" style={{ padding: 10, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="ih-pill ih-pill-ok" style={{ fontSize: 9 }}>{"\u25cf"} Active</span>
          <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>last seen 2h ago</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>
          Sarah, Tom & 2 others have access.<br/>Magic-link works for 14 days.
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="link" size={11}/> Copy link</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="eye" size={11}/> Preview</button>
        </div>
      </div>

      <div className="ih-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Linked resources</div>
      {[
        { icon: "folder" as const, label: "Drive folder", sub: "/clients/northwind/q1-audit", tone: "ok" },
        { icon: "code" as const, label: "Plane project", sub: "NW-Q1 \u00b7 12 issues \u00b7 4 done", tone: "ok" },
        { icon: "calendar" as const, label: "Discovery call", sub: "Zoom \u00b7 Mar 18 \u00b7 62 min \u00b7 transcript", tone: "ok" },
        { icon: "chat" as const, label: "Slack channel", sub: "#proj-northwind-q1 \u00b7 4 unread", tone: "warn" },
      ].map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px dashed var(--ih-line)" }}>
          <Icon name={r.icon} size={14} style={{ color: "var(--ih-ink-50)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5 }}>{r.label}</div>
            <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
          </div>
          <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-40)" }} />
        </div>
      ))}

      <div className="ih-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Team</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div className="ih-avatar ih-avatar-lg" style={{ background: "var(--ih-ink)", color: "#fff" }}>LH</div>
        <div style={{ flex: 1, fontSize: 11.5 }}>
          <div>Luke Hodges</div>
          <div style={{ color: "var(--ih-ink-40)", fontSize: 10 }}>lead {"\u00b7"} 24h logged</div>
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="plus" size={11} /></button>
      </div>
    </aside>
  )
}

function RightRail() {
  return (
    <aside style={{ width: 320, borderLeft: "1px solid var(--ih-line)", padding: "20px 16px", overflowY: "auto", flexShrink: 0, background: "var(--ih-surface-2)" }} className="scrollbar-thin">
      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Money</div>
      <div className="ih-card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <svg width={68} height={68} viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ih-surface-3)" strokeWidth="4"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ih-ok)" strokeWidth="4" strokeDasharray="48.7 97.4" strokeDashoffset="0" transform="rotate(-90 18 18)" strokeLinecap="butt"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ih-accent)" strokeWidth="4" strokeDasharray="24.35 97.4" strokeDashoffset="-48.7" transform="rotate(-90 18 18)"/>
            <text x="18" y="20" textAnchor="middle" fontFamily="var(--ih-font-serif)" fontSize="8" fill="var(--ih-ink)">{"\u00a3"}24.5K</text>
          </svg>
          <div style={{ flex: 1, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--ih-ink-50)" }}><span className="ih-dot ih-dot-ok" /> Paid</span>
              <span className="ih-mono">{"\u00a3"}12,250</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--ih-ink-50)" }}><span className="ih-dot ih-dot-accent" /> Outstanding</span>
              <span className="ih-mono">{"\u00a3"}6,125</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--ih-ink-50)" }}><span className="ih-dot ih-dot-muted" /> Upcoming</span>
              <span className="ih-mono">{"\u00a3"}6,125</span>
            </div>
          </div>
        </div>
        <div className="ih-hr" style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
          <span style={{ color: "var(--ih-ink-50)" }}>Next invoice</span>
          <span className="ih-mono">#NW{"\u2011"}003 {"\u00b7"} {"\u00a3"}6,125</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
          <span style={{ color: "var(--ih-ink-50)" }}>Auto{"\u2011"}send</span>
          <span style={{ color: "var(--ih-ok)" }}>{"\u25cf"} on milestone</span>
        </div>
      </div>

      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Awaiting client {"\u00b7"} 1</div>
      <div className="ih-card" style={{ padding: 12, marginBottom: 14, borderColor: "var(--ih-warn-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Audit Summary</span>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-warn)" }}>sent 4h ago</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ih-ink-50)", marginBottom: 10 }}>Approval requested from sarah@northwind.co</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}><Icon name="mail" size={11} /> Nudge</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }}>View</button>
        </div>
      </div>

      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Upcoming</div>
      {[
        { d: "Fri Apr 05", t: "Audit window closes", tone: "warn" },
        { d: "Wed Apr 10", t: "Findings call \u00b7 Sarah", tone: "info" },
        { d: "Mon Apr 15", t: "Invoice #2 due", tone: "muted" },
        { d: "Fri Apr 26", t: "Project end \u00b7 proposed", tone: "muted" },
      ].map((u, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px dashed var(--ih-line)" }}>
          <span className={`ih-dot ih-dot-${u.tone}`} style={{ marginTop: 6 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5 }}>{u.t}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{u.d}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 18, border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-xl)", background: "var(--ih-surface)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Icon name="sparkles" size={12} style={{ color: "var(--ih-accent)" }} />
          <span className="ih-eyebrow">Copilot</span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ih-ink-90)" }}>
          Sarah has been very responsive (avg 3h reply). The Q1 audit looks <span className="ih-italic-red">ready to expand</span> into a 6-month retainer based on the workflow gaps you flagged.
        </div>
        <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ marginTop: 10, width: "100%" }}>
          Draft retainer proposal <Icon name="arrowRight" size={11} />
        </button>
      </div>
    </aside>
  )
}

/* ── Main screen ──────────────────────────────────────────────────────────── */

export default function ClientDetailPage() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ["Overview", "Money", "Work", "Activity", "Files", "Workflows"]

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <LeftRail />

      <section className="scrollbar-thin" style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "24px 28px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.14em" }}>/04 {"\u00b7"} ENG{"\u2011"}0027</span>
            <span className="ih-pill ih-pill-ok" style={{ fontSize: 9 }}>{"\u25cf"} Active</span>
            <span className="ih-pill" style={{ fontSize: 9 }}>Project {"\u00b7"} fixed{"\u2011"}price</span>
            <span className="ih-pill" style={{ fontSize: 9 }}>{"\u00a3"}24,500</span>
          </div>
          <h1 className="ih-serif" style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>
            Q1 operations <span className="ih-italic-red">audit</span>
          </h1>
          <div style={{ fontSize: 13, color: "var(--ih-ink-65)", marginTop: 6, maxWidth: 700 }}>
            Map every operations workflow, identify automation candidates, deliver a 3-month roadmap. Audit window 21 days {"\u00b7"} Mar 18 {"\u2192"} Apr 08.
          </div>
        </div>

        {/* Stage strip */}
        <div style={{ marginBottom: 24 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Engagement progress</div>
          <StageStrip />
        </div>

        {/* AI panel */}
        <div style={{ border: "1px solid var(--ih-accent-soft)", background: "var(--ih-accent-soft-2)", borderRadius: "var(--ih-r-xl)", padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="sparkles" size={14} style={{ color: "var(--ih-accent)", marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div className="ih-eyebrow" style={{ color: "var(--ih-accent)", marginBottom: 6 }}>What&apos;s next {"\u00b7"} ai{"\u2011"}suggested</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Finalise audit findings report", badge: "due Fri", tone: "warn" },
                  { label: "Draft retainer proposal v1", badge: "recommended", tone: "info" },
                  { label: "Schedule findings call with Sarah", badge: "this week", tone: "info" },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "var(--ih-surface)", borderRadius: "var(--ih-r-md)", border: "1px solid var(--ih-line)" }}>
                    <span style={{ fontSize: 12 }}>{s.label}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={`ih-pill ih-pill-${s.tone}`} style={{ fontSize: 9 }}>{s.badge}</span>
                      <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22 }}>Schedule <Icon name="chevronRight" size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid var(--ih-line)", display: "flex", gap: 0, marginBottom: 16 }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)} style={{ padding: "10px 14px", fontSize: 12.5, color: activeTab === i ? "var(--ih-ink)" : "var(--ih-ink-50)", fontWeight: activeTab === i ? 500 : 400, border: 0, background: "transparent", borderBottom: activeTab === i ? "2px solid var(--ih-accent)" : "2px solid transparent", marginBottom: -1, cursor: "pointer" }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6, padding: "6px 0" }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="filter" size={11} /> All events</button>
            <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="plus" size={11} /> Log activity</button>
          </div>
        </div>

        {/* Timeline */}
        <div className="ih-eyebrow" style={{ marginBottom: 12 }}>Unified timeline {"\u00b7"} everything in one place</div>
        {TIMELINE.map((day) => (
          <div key={day.day} style={{ marginBottom: 22 }}>
            <div style={{ position: "sticky", top: 0, background: "var(--ih-bg)", padding: "4px 0", zIndex: 1 }}>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{day.day}</span>
            </div>
            <div style={{ position: "relative", paddingLeft: 24, marginTop: 8 }}>
              <div style={{ position: "absolute", left: 7, top: 4, bottom: 4, width: 1, background: "var(--ih-line)" }} />
              {day.items.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", position: "relative" }}>
                  <div style={{ position: "absolute", left: -22, top: 12, width: 14, height: 14, borderRadius: 999, background: "var(--ih-surface)", border: `1.5px solid ${it.tone === "accent" ? "var(--ih-accent)" : it.tone === "ok" ? "var(--ih-ok)" : it.tone === "warn" ? "var(--ih-warn)" : "var(--ih-line-2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={it.icon} size={8} style={{ color: it.tone === "accent" ? "var(--ih-accent)" : it.tone === "ok" ? "var(--ih-ok)" : it.tone === "warn" ? "var(--ih-warn)" : "var(--ih-ink-65)" }} />
                  </div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 42, flexShrink: 0, paddingTop: 4 }}>{it.time}</div>
                  <div style={{ flex: 1, padding: "6px 12px", background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ih-ink-50)", marginTop: 2 }}>{it.meta}</div>
                    {it.link && (
                      <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ih-accent)" }}>
                        <Icon name="file" size={10} /> {it.link} <Icon name="arrowUpRight" size={10} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <RightRail />
    </div>
  )
}
