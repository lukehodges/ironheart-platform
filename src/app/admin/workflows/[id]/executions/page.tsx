"use client"

import Link from "next/link"
import { Icon } from "@/components/shell"
import { useState } from "react"

/* ── Demo Data ─────────────────────────────────────────────────────────── */

type ExecStatus = "completed" | "running" | "failed"
type StepStatus = "ok" | "running" | "fail" | "skipped"

type Execution = {
  id: string; trigger: string; started: string; duration: string;
  status: ExecStatus; steps: number; stepsOk: number;
  trace: { node: string; kind: string; status: StepStatus; duration: string; detail: string }[];
}

const STATUS_TONE: Record<ExecStatus, string> = { completed: "ok", running: "accent", failed: "danger" }
const STEP_TONE: Record<StepStatus, string> = { ok: "ok", running: "accent", fail: "danger", skipped: "muted" }

const EXECUTIONS: Execution[] = [
  {
    id: "run_2041", trigger: "booking/created", started: "Today 10:14 AM", duration: "1.24s", status: "completed", steps: 5, stepsOk: 5,
    trace: [
      { node: "New booking", kind: "TRIGGER", status: "ok", duration: "2ms", detail: "booking_id=bk-9281" },
      { node: "Send welcome email", kind: "SEND_EMAIL", status: "ok", duration: "312ms", detail: "to: sarah@northwind.io" },
      { node: "Wait 24 hours", kind: "WAIT", status: "ok", duration: "24h", detail: "resumed at 11:14 AM" },
      { node: "Plan tier?", kind: "IF", status: "ok", duration: "4ms", detail: "plan=pro \u2192 true branch" },
      { node: "Draft onboarding", kind: "AI_ACTION", status: "ok", duration: "908ms", detail: "claude-3.5 \u00b7 tone:warm \u00b7 342 tokens" },
    ],
  },
  {
    id: "run_2040", trigger: "booking/created", started: "Today 08:42 AM", duration: "0.89s", status: "completed", steps: 5, stepsOk: 5,
    trace: [
      { node: "New booking", kind: "TRIGGER", status: "ok", duration: "1ms", detail: "booking_id=bk-9278" },
      { node: "Send welcome email", kind: "SEND_EMAIL", status: "ok", duration: "287ms", detail: "to: tom@vellum.co" },
      { node: "Wait 24 hours", kind: "WAIT", status: "ok", duration: "24h", detail: "resumed at 09:42 AM" },
      { node: "Plan tier?", kind: "IF", status: "ok", duration: "3ms", detail: "plan=pro \u2192 true branch" },
      { node: "Draft onboarding", kind: "AI_ACTION", status: "ok", duration: "596ms", detail: "claude-3.5 \u00b7 tone:warm \u00b7 298 tokens" },
    ],
  },
  {
    id: "run_2039", trigger: "booking/created", started: "Today 07:14 AM", duration: "0.62s", status: "completed", steps: 5, stepsOk: 5,
    trace: [
      { node: "New booking", kind: "TRIGGER", status: "ok", duration: "2ms", detail: "booking_id=bk-9275" },
      { node: "Send welcome email", kind: "SEND_EMAIL", status: "ok", duration: "301ms", detail: "to: yuki@castor.co" },
      { node: "Wait 24 hours", kind: "WAIT", status: "ok", duration: "24h", detail: "resumed at 08:14 AM" },
      { node: "Plan tier?", kind: "IF", status: "ok", duration: "3ms", detail: "plan=lite \u2192 false branch" },
      { node: "Send basic guide", kind: "SEND_EMAIL", status: "ok", duration: "312ms", detail: "template: lite-welcome" },
    ],
  },
  {
    id: "run_2038", trigger: "booking/created", started: "Mon 4:32 PM", duration: "30.01s", status: "failed", steps: 5, stepsOk: 3,
    trace: [
      { node: "New booking", kind: "TRIGGER", status: "ok", duration: "2ms", detail: "booking_id=bk-9270" },
      { node: "Send welcome email", kind: "SEND_EMAIL", status: "ok", duration: "298ms", detail: "to: liam@greystone.io" },
      { node: "Wait 24 hours", kind: "WAIT", status: "ok", duration: "24h", detail: "resumed at 5:32 PM" },
      { node: "Plan tier?", kind: "IF", status: "fail", duration: "30004ms", detail: "ERROR: timeout evaluating condition after 30s" },
      { node: "Draft onboarding", kind: "AI_ACTION", status: "skipped", duration: "-", detail: "skipped: upstream failure" },
    ],
  },
  {
    id: "run_2037", trigger: "booking/created", started: "Mon 2:18 PM", duration: "1.01s", status: "completed", steps: 5, stepsOk: 5,
    trace: [
      { node: "New booking", kind: "TRIGGER", status: "ok", duration: "1ms", detail: "booking_id=bk-9268" },
      { node: "Send welcome email", kind: "SEND_EMAIL", status: "ok", duration: "310ms", detail: "to: eleanor@brigham.com" },
      { node: "Wait 24 hours", kind: "WAIT", status: "ok", duration: "24h", detail: "resumed at 3:18 PM" },
      { node: "Plan tier?", kind: "IF", status: "ok", duration: "3ms", detail: "plan=pro \u2192 true branch" },
      { node: "Draft onboarding", kind: "AI_ACTION", status: "ok", duration: "694ms", detail: "claude-3.5 \u00b7 tone:warm \u00b7 310 tokens" },
    ],
  },
  {
    id: "run_2036", trigger: "booking/created", started: "Mon 11:05 AM", duration: "0.94s", status: "completed", steps: 5, stepsOk: 5,
    trace: [
      { node: "New booking", kind: "TRIGGER", status: "ok", duration: "2ms", detail: "booking_id=bk-9264" },
      { node: "Send welcome email", kind: "SEND_EMAIL", status: "ok", duration: "305ms", detail: "to: jonas@bowery.com" },
      { node: "Wait 24 hours", kind: "WAIT", status: "ok", duration: "24h", detail: "resumed at 12:05 PM" },
      { node: "Plan tier?", kind: "IF", status: "ok", duration: "4ms", detail: "plan=pro \u2192 true branch" },
      { node: "Draft onboarding", kind: "AI_ACTION", status: "ok", duration: "627ms", detail: "claude-3.5 \u00b7 tone:warm \u00b7 275 tokens" },
    ],
  },
]

const FILTERS = ["All", "Running", "Completed", "Failed"] as const

const TH: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--ih-font-mono)" }

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function WorkflowExecutionsPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === "All"
    ? EXECUTIONS
    : EXECUTIONS.filter((e) => e.status === filter.toLowerCase())

  const completedCount = EXECUTIONS.filter((e) => e.status === "completed").length
  const failedCount = EXECUTIONS.filter((e) => e.status === "failed").length

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Link href="/admin/workflows" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ih-ink-50)" }}>
              <Icon name="chevronLeft" size={12}/>
              <span className="ih-eyebrow">Workflows</span>
            </Link>
            <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
            <span className="ih-eyebrow">WF-204 Onboarding Northwind</span>
            <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
            <span className="ih-eyebrow" style={{ color: "var(--ih-accent)" }}>Executions</span>
          </div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 0.98 }}>
            {EXECUTIONS.length} runs. <span className="ih-italic-red">{completedCount}</span> completed.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="download" size={12}/> Export</button>
          <Link href="/admin/workflows/wf-204" className="ih-btn ih-btn-primary ih-btn-sm" style={{ textDecoration: "none" }}><Icon name="chevronLeft" size={11}/> Back to editor</Link>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Total runs", v: String(EXECUTIONS.length), d: "+3", h: "today", icon: "play" as const },
          { l: "Success rate", v: `${Math.round((completedCount / EXECUTIONS.length) * 100)}%`, d: "\u22121 fail", h: "this week", icon: "check" as const },
          { l: "Avg duration", v: "1.08s", d: "\u22120.2s", h: "vs last week", icon: "clock" as const },
          { l: "Failed", v: String(failedCount), d: "1 timeout", h: "Monday", icon: "flag" as const, danger: true },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "14px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div className="ih-serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ih-ink-50)", display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "danger" in s ? "var(--ih-danger)" : "var(--ih-ok)", fontWeight: 500 }} className="ih-mono">{s.d}</span>
              <span>{s.h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {FILTERS.map((f) => {
          const count = f === "All" ? EXECUTIONS.length : EXECUTIONS.filter((e) => e.status === f.toLowerCase()).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`ih-btn ih-btn-sm ${filter === f ? "ih-btn-ghost" : "ih-btn-quiet"}`}
              style={{ fontWeight: filter === f ? 500 : 400 }}
            >
              {f} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: 4 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Executions table */}
      <div className="ih-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)" }}>
              <th style={{ ...TH, paddingLeft: 18 }}>Run ID</th>
              <th style={TH}>Trigger</th>
              <th style={TH}>Started</th>
              <th style={TH}>Duration</th>
              <th style={TH}>Status</th>
              <th style={TH}>Steps</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <>
                <tr
                  key={e.id}
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer", background: expanded === e.id ? "var(--ih-surface-2)" : undefined }}
                >
                  <td style={{ padding: "10px 12px 10px 18px" }}>
                    <span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{e.id}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-65)" }}>{e.trigger}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>{e.started}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{e.duration}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className={`ih-pill ih-pill-${STATUS_TONE[e.status]}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                      {e.status === "running" && <span className="ih-dot ih-dot-accent" style={{ marginRight: 4 }}/>}
                      {e.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="ih-mono" style={{ fontSize: 10.5 }}>{e.stepsOk}/{e.steps}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Icon name={expanded === e.id ? "chevronDown" : "chevronRight"} size={11} style={{ color: "var(--ih-ink-30)" }}/>
                  </td>
                </tr>

                {/* Expanded trace */}
                {expanded === e.id && (
                  <tr key={`${e.id}-trace`}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div style={{ padding: "12px 18px 16px", background: "var(--ih-surface-2)", borderTop: "1px solid var(--ih-line)" }}>
                        <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Step-by-step trace</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {e.trace.map((s, si) => (
                            <div key={si} style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 80px auto", gap: 10, alignItems: "center", padding: "8px 0", borderTop: si === 0 ? "0" : "1px solid var(--ih-line)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span className={`ih-dot ih-dot-${STEP_TONE[s.status]}`}/>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{s.node}</div>
                                <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 2 }}>{s.kind}</div>
                              </div>
                              <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-65)" }}>{s.duration}</span>
                              <span className={`ih-pill ih-pill-${STEP_TONE[s.status]}`} style={{ fontSize: 8.5, padding: "2px 5px", textAlign: "center" }}>{s.status}</span>
                              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{s.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
