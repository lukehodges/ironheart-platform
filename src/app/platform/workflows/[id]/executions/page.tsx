"use client"

/* Full execution history for a workflow. */

import { useState, useMemo, use as usePromise } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Icon } from "@/components/shell"
import { NotificationToast } from "@/components/shared"
import {
  mockWorkflows,
  NODE_ICON,
  type Execution,
  type ExecutionStatus,
} from "@/lib/mock/workflows"

const FILTERS: Array<"All" | "Queued" | "Running" | "Paused" | "Completed" | "Failed"> = ["All", "Queued", "Running", "Paused", "Completed", "Failed"]

function fmtDuration(ms: number): string {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

const STATUS_TONE: Record<ExecutionStatus, "ok" | "danger" | "accent" | "warn" | "muted"> = {
  completed: "ok", failed: "danger", running: "accent", paused: "warn", queued: "muted",
}

const TH: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10,
  color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em",
  fontFamily: "var(--ih-font-mono)",
}

/* ── Step trace + drawer ─────────────────────────────────────────────────── */

function ExecutionDrawer({ ex, onClose, onAction }: { ex: Execution; onClose: () => void; onAction: (msg: string, tone?: "ok" | "info" | "warn" | "danger") => void }) {
  return (
    <aside key={ex.id} className="animate-slide-in-right" style={{
      width: 460, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="ih-mono" style={{ fontSize: 11, fontWeight: 600 }}>{ex.id}</div>
          <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 4 }}>
            {ex.status} · {ex.startedAt} · {fmtDuration(ex.durationMs)}
          </div>
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
          <Icon name="x" size={12} />
        </button>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "Status",       value: ex.status },
            { label: "Steps",        value: `${ex.stepsCompleted} / ${ex.stepsTotal}` },
            { label: "Duration",     value: fmtDuration(ex.durationMs) },
            { label: "Triggered by", value: ex.triggeredBy.name },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 16, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {ex.failureReason && (
          <div style={{ background: "var(--ih-danger-soft)", borderRadius: "var(--ih-r-md)", padding: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="flag" size={14} style={{ color: "var(--ih-danger)", marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ih-danger)", marginBottom: 2 }}>Failure reason</div>
              <div style={{ fontSize: 12, color: "var(--ih-ink)", lineHeight: 1.45 }}>{ex.failureReason}</div>
            </div>
          </div>
        )}

        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Trigger</div>
        <div className="ih-card" style={{ padding: 12, marginBottom: 14, background: "var(--ih-surface)" }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{ex.trigger.summary}</div>
          <pre className="ih-mono" style={{ fontSize: 10, margin: 0, color: "var(--ih-ink-65)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{ex.trigger.payloadPreview}</pre>
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Step trace</div>
        <div className="ih-card" style={{ padding: 4, background: "var(--ih-surface)", marginBottom: 14 }}>
          {ex.steps.map((s, i) => {
            const tone = s.status === "ok" ? "ok" : s.status === "fail" ? "danger" : s.status === "running" ? "accent" : "muted"
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "22px 22px 1fr auto auto", gap: 8,
                alignItems: "center", padding: "8px 10px",
                borderBottom: i === ex.steps.length - 1 ? 0 : "1px dashed var(--ih-line)",
              }}>
                <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", textAlign: "right" }}>{(i + 1).toString().padStart(2, "0")}</span>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={NODE_ICON[s.nodeType] as never} size={11} style={{ color: "var(--ih-ink-50)" }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{s.nodeLabel}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: s.error ? "var(--ih-danger)" : "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
                    {s.error ?? s.outputPreview}
                  </div>
                </div>
                <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 8.5, padding: "2px 5px" }}>{s.status}</span>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-65)" }}>{fmtDuration(s.durationMs)}</span>
              </div>
            )
          })}
        </div>

        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Final output</div>
        <pre className="ih-mono" style={{ fontSize: 10.5, padding: 10, background: "var(--ih-surface)", borderRadius: "var(--ih-r-md)", border: "1px solid var(--ih-line)", margin: 0, color: "var(--ih-ink-65)", whiteSpace: "pre-wrap" }}>
{ex.outputPreview}
        </pre>
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", gap: 6, background: "var(--ih-surface)" }}>
        <button className="ih-btn ih-btn-accent" style={{ flex: 1, justifyContent: "center" }} onClick={() => onAction(`Retrying ${ex.id} from failed step`, "info")}>
          <Icon name="refresh" size={11} /> Retry
        </button>
        <button className="ih-btn ih-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => onAction(`Replaying ${ex.id} with same payload`, "info")}>
          <Icon name="play" size={11} /> Replay
        </button>
      </div>
    </aside>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function WorkflowExecutionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const wf = mockWorkflows.getById(id)
  if (!wf) notFound()

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All")
  const [search, setSearch] = useState("")
  const [openExId, setOpenExId] = useState<string | null>(wf.recentExecutions[0]?.id ?? null)
  const [toast, setToast] = useState<{ message: string; tone?: "ok" | "info" | "warn" | "danger" } | null>(null)

  const rows = useMemo(() => {
    let r = wf.recentExecutions
    if (filter !== "All") r = r.filter(e => e.status === filter.toLowerCase() as ExecutionStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(e => e.id.toLowerCase().includes(q) || e.trigger.summary.toLowerCase().includes(q))
    }
    return r
  }, [wf, filter, search])

  const completed = wf.recentExecutions.filter(e => e.status === "completed").length
  const failed = wf.recentExecutions.filter(e => e.status === "failed").length
  const successRate = wf.recentExecutions.length ? Math.round((completed / wf.recentExecutions.length) * 100) : 0
  const avgDur = wf.recentExecutions.length
    ? Math.round(wf.recentExecutions.reduce((s, e) => s + e.durationMs, 0) / wf.recentExecutions.length)
    : 0
  const selected = openExId ? wf.recentExecutions.find(e => e.id === openExId) ?? null : null

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", margin: "-24px -24px" }}>
      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar / breadcrumb */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/platform/workflows" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
              <Icon name="chevronLeft" size={12} />
              <span className="ih-eyebrow">Workflows</span>
            </Link>
            <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
            <Link href={`/platform/workflows/${wf.id}`} style={{ textDecoration: "none", color: "var(--ih-ink)", fontSize: 13, fontWeight: 500 }}>{wf.name}</Link>
            <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
            <span className="ih-eyebrow" style={{ color: "var(--ih-accent)" }}>Executions · ★</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setToast({ message: "Export queued · CSV ready in 30s", tone: "info" })}>
              <Icon name="download" size={11} /> Export CSV
            </button>
            <Link href={`/platform/workflows/${wf.id}`} className="ih-btn ih-btn-primary ih-btn-sm" style={{ textDecoration: "none" }}>
              <Icon name="chevronLeft" size={11} /> Back to workflow
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: "18px 24px 12px", borderBottom: "1px solid var(--ih-line)" }}>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{wf.id} · {wf.recentExecutions.length} runs</div>
          <h1 className="ih-serif" style={{ fontSize: 30, margin: 0, lineHeight: 1.05 }}>
            {wf.recentExecutions.length} runs. <span className="ih-italic-red">{completed}</span> completed.
          </h1>
        </div>

        {/* Stat strip */}
        <div style={{ padding: "12px 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Total runs",   value: String(wf.recentExecutions.length), tone: "var(--ih-ink)" },
            { label: "Success rate", value: `${successRate}%`,                   tone: successRate >= 95 ? "var(--ih-ok)" : successRate >= 80 ? "var(--ih-warn)" : "var(--ih-danger)" },
            { label: "Avg duration", value: fmtDuration(avgDur),                  tone: "var(--ih-ink)" },
            { label: "Failed",       value: String(failed),                       tone: failed ? "var(--ih-danger)" : "var(--ih-ink-50)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--ih-bg)", padding: "12px 16px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 24, lineHeight: 1, color: s.tone }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters bar */}
        <div style={{ padding: "10px 24px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--ih-line)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320, minWidth: 200 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
            <input className="ih-input" placeholder="Search run IDs, triggers…"
              style={{ paddingLeft: 30 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {FILTERS.map(f => {
              const count = f === "All" ? wf.recentExecutions.length : wf.recentExecutions.filter(e => e.status === f.toLowerCase() as ExecutionStatus).length
              const active = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)} className={`ih-btn ih-btn-sm ${active ? "ih-btn-ghost" : "ih-btn-quiet"}`} style={{ fontWeight: active ? 500 : 400 }}>
                  {f} <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: 4 }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 1 }}>
              <tr style={{ borderBottom: "1px solid var(--ih-line)" }}>
                <th style={{ ...TH, paddingLeft: 24 }}>Run ID</th>
                <th style={TH}>Started</th>
                <th style={TH}>Duration</th>
                <th style={TH}>Trigger</th>
                <th style={TH}>Triggered by</th>
                <th style={TH}>Steps</th>
                <th style={TH}>Status</th>
                <th style={{ width: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", fontSize: 12, color: "var(--ih-ink-40)" }}>No runs match these filters</td></tr>
              )}
              {rows.map(ex => {
                const tone = STATUS_TONE[ex.status]
                const isSelected = ex.id === openExId
                const progress = ex.stepsTotal ? Math.round((ex.stepsCompleted / ex.stepsTotal) * 100) : 0
                return (
                  <tr key={ex.id} onClick={() => setOpenExId(ex.id)} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer", background: isSelected ? "var(--ih-accent-soft-2)" : undefined }}>
                    <td style={{ padding: "10px 12px 10px 24px" }}><span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{ex.id}</span></td>
                    <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{ex.startedAt}</span></td>
                    <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{fmtDuration(ex.durationMs)}</span></td>
                    <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{ex.trigger.summary}</span></td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Icon name={ex.triggeredBy.type === "user" ? "user" : ex.triggeredBy.type === "webhook" ? "link" : ex.triggeredBy.type === "schedule" ? "clock" : "bolt"} size={11} style={{ color: "var(--ih-ink-50)" }} />
                        <span style={{ fontSize: 11.5 }}>{ex.triggeredBy.name}</span>
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", width: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 60, height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: ex.status === "failed" ? "var(--ih-danger)" : "var(--ih-ok)" }} />
                        </div>
                        <span className="ih-mono" style={{ fontSize: 10.5 }}>{ex.stepsCompleted}/{ex.stepsTotal}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                        {ex.status === "running" && <span className="ih-dot ih-dot-accent" style={{ marginRight: 4 }} />}
                        {ex.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}><Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <ExecutionDrawer ex={selected} onClose={() => setOpenExId(null)} onAction={(m, t) => setToast({ message: m, tone: t })} />}

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
