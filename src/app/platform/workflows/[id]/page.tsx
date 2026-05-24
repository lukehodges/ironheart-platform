"use client"

/* Workflow detail — read-only canonical view. */

import { useState, use as usePromise } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast } from "@/components/shared"
import {
  mockWorkflows,
  TRIGGER_META,
  STATUS_META,
  NODE_ICON,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowStatus,
  type Execution,
} from "@/lib/mock/workflows"

/* ── helpers ─────────────────────────────────────────────────────────────── */

function fmtDuration(ms: number): string {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

function StatusPill({ status }: { status: WorkflowStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`ih-pill ih-pill-${meta.tone}`} style={{ fontSize: 9, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span className={`ih-dot ih-dot-${meta.tone === "muted" ? "muted" : meta.tone}`} />
      {meta.label}
    </span>
  )
}

/* ── Graph canvas (SVG bezier between rectangular nodes) ─────────────────── */

const NODE_W = 168
const NODE_H = 58
const COL_GAP = 60
const ROW_GAP = 30

function GraphCanvas({ nodes, edges, selectedId, onSelect }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[];
  selectedId: string | null; onSelect: (id: string) => void;
}) {
  const maxCol = Math.max(0, ...nodes.map(n => n.col))
  const maxRow = Math.max(0, ...nodes.map(n => n.row))
  const width  = 80 + (maxCol + 1) * (NODE_W + COL_GAP)
  const height = 80 + (maxRow + 1) * (NODE_H + ROW_GAP)
  const pos = new Map<string, { x: number; y: number }>()
  nodes.forEach(n => {
    pos.set(n.id, {
      x: 40 + n.col * (NODE_W + COL_GAP),
      y: 40 + n.row * (NODE_H + ROW_GAP),
    })
  })

  return (
    <div className="scrollbar-thin" style={{ overflow: "auto", background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)" }}>
      <div style={{ position: "relative", width, height, minHeight: 220 }}>
        {/* dot grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, var(--ih-ink-30) 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }} />
        {/* edges */}
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {edges.map((e, i) => {
            const from = pos.get(e.from); const to = pos.get(e.to)
            if (!from || !to) return null
            const x1 = from.x + NODE_W
            const y1 = from.y + NODE_H / 2
            const x2 = to.x
            const y2 = to.y + NODE_H / 2
            const mx = (x1 + x2) / 2
            const path = `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
            const isTrue  = e.handle === "true"
            const isFalse = e.handle === "false"
            const stroke = isFalse ? "var(--ih-ink-30)" : isTrue ? "var(--ih-ok)" : "var(--ih-line-2)"
            return (
              <g key={i}>
                <path d={path} stroke={stroke} strokeWidth={1.6} fill="none" />
                {e.label && (
                  <text x={mx} y={(y1 + y2) / 2 - 5} fontSize={9} fill="var(--ih-ink-50)" textAnchor="middle" fontFamily="var(--ih-font-mono)">
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {/* nodes */}
        {nodes.map(n => {
          const p = pos.get(n.id)!
          const isSelected = selectedId === n.id
          const tone = n.type === "TRIGGER" ? "var(--ih-accent)"
            : n.type === "STOP" || n.type === "ERROR" ? "var(--ih-ink-50)"
            : n.type === "IF" || n.type === "SWITCH" ? "var(--ih-warn)"
            : "var(--ih-info)"
          return (
            <div key={n.id} onClick={() => onSelect(n.id)} style={{
              position: "absolute", left: p.x, top: p.y, width: NODE_W, height: NODE_H,
              background: "var(--ih-surface)",
              border: `1.5px solid ${isSelected ? "var(--ih-accent)" : tone}`,
              borderRadius: 10, padding: 10, cursor: "pointer",
              boxShadow: isSelected ? "0 0 0 3px var(--ih-accent-soft)" : "0 1px 2px rgba(0,0,0,.03)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Icon name={NODE_ICON[n.type] as IconName} size={11} style={{ color: tone }} />
                <span className="ih-mono" style={{ fontSize: 8.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{n.type}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</div>
              <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.summary}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Linear step list ────────────────────────────────────────────────────── */

function LinearStepList({ nodes, edges, selectedId, onSelect }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[];
  selectedId: string | null; onSelect: (id: string) => void;
}) {
  /* group child-of-branch nodes into indentation */
  const branchEdges = edges.filter(e => e.handle === "true" || e.handle === "false")
  const branchChildren = new Set<string>()
  branchEdges.forEach(e => branchChildren.add(e.to))

  return (
    <div className="ih-card" style={{ padding: 12, background: "var(--ih-surface-2)" }}>
      {nodes.map((n, i) => {
        const indented = branchChildren.has(n.id) && n.type !== "STOP"
        const tone = n.type === "TRIGGER" ? "var(--ih-accent)"
          : n.type === "STOP" || n.type === "ERROR" ? "var(--ih-ink-50)"
          : n.type === "IF" || n.type === "SWITCH" ? "var(--ih-warn)"
          : "var(--ih-info)"
        const branchEdge = branchEdges.find(e => e.to === n.id)
        const isSelected = selectedId === n.id
        return (
          <div key={n.id} onClick={() => onSelect(n.id)} style={{
            display: "flex", gap: 12, padding: "8px 10px",
            marginLeft: indented ? 28 : 0,
            background: isSelected ? "var(--ih-accent-soft-2)" : "var(--ih-surface)",
            border: `1px solid ${isSelected ? "var(--ih-accent)" : "var(--ih-line)"}`,
            borderRadius: "var(--ih-r-md)",
            marginBottom: 6, cursor: "pointer", alignItems: "center",
          }}>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 22, flexShrink: 0 }}>{(i + 1).toString().padStart(2, "0")}</div>
            <div style={{
              width: 26, height: 26, borderRadius: 7, background: "var(--ih-surface-2)",
              display: "flex", alignItems: "center", justifyContent: "center", color: tone, flexShrink: 0,
            }}>
              <Icon name={NODE_ICON[n.type] as IconName} size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{n.label}</span>
                {branchEdge && (
                  <span className={`ih-pill ih-pill-${branchEdge.handle === "true" ? "ok" : "muted"}`} style={{ fontSize: 8, padding: "1px 5px" }}>
                    {branchEdge.handle === "true" ? "if true" : "if false"}
                  </span>
                )}
              </div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{n.summary}</div>
            </div>
            <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>{n.type}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Execution step trace ────────────────────────────────────────────────── */

function ExecutionTrace({ ex }: { ex: Execution }) {
  return (
    <div style={{ padding: 14, background: "var(--ih-surface-2)", borderTop: "1px solid var(--ih-line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Trigger payload</div>
          <pre className="ih-mono" style={{ fontSize: 10.5, padding: 10, background: "var(--ih-surface)", borderRadius: "var(--ih-r-sm)", border: "1px solid var(--ih-line)", margin: 0, overflow: "auto", color: "var(--ih-ink-65)" }}>
{ex.trigger.payloadPreview}
          </pre>
        </div>
        <div>
          <div className="ih-eyebrow" style={{ marginBottom: 4 }}>Final output</div>
          <pre className="ih-mono" style={{ fontSize: 10.5, padding: 10, background: "var(--ih-surface)", borderRadius: "var(--ih-r-sm)", border: "1px solid var(--ih-line)", margin: 0, overflow: "auto", color: "var(--ih-ink-65)" }}>
{ex.outputPreview}
          </pre>
        </div>
      </div>
      <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Step trace</div>
      {ex.steps.map((s, si) => {
        const tone = s.status === "ok" ? "ok" : s.status === "fail" ? "danger" : s.status === "running" ? "accent" : "muted"
        return (
          <div key={si} style={{
            display: "grid", gridTemplateColumns: "22px 26px 1fr 80px 80px",
            gap: 10, alignItems: "center", padding: "8px 0",
            borderTop: si === 0 ? 0 : "1px dashed var(--ih-line)",
          }}>
            <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", textAlign: "right" }}>{(si + 1).toString().padStart(2, "0")}</span>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className={`ih-dot ih-dot-${tone}`} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{s.nodeLabel}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: s.error ? "var(--ih-danger)" : "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.error ?? s.outputPreview}
              </div>
            </div>
            <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 8.5, padding: "2px 5px", textAlign: "center" }}>{s.status}</span>
            <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-65)", textAlign: "right" }}>{fmtDuration(s.durationMs)}</span>
          </div>
        )
      })}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button className="ih-btn ih-btn-ghost ih-btn-sm"><Icon name="refresh" size={11} /> Retry from failed step</button>
        <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="play" size={11} /> Replay with same payload</button>
      </div>
    </div>
  )
}

/* ── Sparkline (30-day run counts) ───────────────────────────────────────── */

function Sparkline({ daily }: { daily: Workflow["stats"]["daily"] }) {
  const max = Math.max(1, ...daily.map(d => d.runs))
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
      {daily.map((d, i) => {
        const h = Math.max(2, (d.runs / max) * 56)
        const failPct = d.runs > 0 ? d.failures / d.runs : 0
        const tone = failPct > 0.2 ? "var(--ih-danger)" : failPct > 0 ? "var(--ih-warn)" : "var(--ih-ink-30)"
        return (
          <div key={i} title={`Day ${i + 1}: ${d.runs} run${d.runs !== 1 ? "s" : ""}, ${d.failures} failure${d.failures !== 1 ? "s" : ""}`}
            style={{ width: 8, height: h, background: tone, borderRadius: 1, opacity: d.runs ? 1 : 0.4 }} />
        )
      })}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const wf0 = mockWorkflows.getById(id)
  if (!wf0) notFound()

  const [statusOverride, setStatusOverride] = useState<WorkflowStatus | null>(null)
  const wf: Workflow = { ...wf0, status: statusOverride ?? wf0.status }
  const trigger = TRIGGER_META[wf.trigger.type]

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(wf.nodes[0]?.id ?? null)
  const [expandedExId, setExpandedExId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone?: "ok" | "info" | "warn" | "accent" | "danger" } | null>(null)
  const [testPayload, setTestPayload] = useState<string>('{ "example": true }')

  function toggleStatus() {
    const next = wf.status === "ENABLED" ? "DISABLED" : "ENABLED"
    setStatusOverride(next)
    setToast({ message: `${wf.name} ${next === "ENABLED" ? "enabled" : "paused"}`, tone: next === "ENABLED" ? "ok" : "warn" })
  }
  function runNow() { setToast({ message: `Run started · ${wf.name}`, tone: "info" }) }
  function runWithPayload() {
    try { JSON.parse(testPayload); setToast({ message: "Test run started with payload", tone: "info" }) }
    catch { setToast({ message: "Payload is not valid JSON", tone: "danger" }) }
  }

  const failures = wf.recentExecutions.filter(e => e.status === "failed")

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "-24px -24px", minHeight: "calc(100vh - 64px)" }}>
      {/* Top bar / breadcrumb */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "var(--ih-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/platform/workflows" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
            <Icon name="chevronLeft" size={12} />
            <span className="ih-eyebrow">Workflows</span>
          </Link>
          <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{wf.name}</span>
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{wf.id}</span>
          <StatusPill status={wf.status} />
          <span className="ih-eyebrow" style={{ color: "var(--ih-accent)" }}>★</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={toggleStatus}>
            <Icon name={wf.status === "ENABLED" ? "pause" : "play"} size={11} />
            {wf.status === "ENABLED" ? "Pause" : "Enable"}
          </button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={runNow}>
            <Icon name="play" size={11} /> Run now
          </button>
          <Link href={`/platform/workflows/${wf.id}/executions`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
            <Icon name="clock" size={11} /> Executions
          </Link>
          <Link href={`/platform/workflows/${wf.id}/edit`} className="ih-btn ih-btn-primary ih-btn-sm" style={{ textDecoration: "none" }}>
            <Icon name="code" size={11} /> Edit
          </Link>
        </div>
      </div>

      {/* Hero summary */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--ih-line)" }}>
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{wf.isVisual ? "Graph workflow" : "Linear workflow"} · {wf.nodes.length} nodes</div>
        <h1 className="ih-serif" style={{ fontSize: 32, margin: 0, lineHeight: 1.05 }}>
          {wf.name.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="ih-italic-red">{wf.name.split(" ").slice(-1)[0]}</span>
        </h1>
        <div style={{ fontSize: 13, color: "var(--ih-ink-65)", marginTop: 6, maxWidth: 700, lineHeight: 1.5 }}>
          {wf.description}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {wf.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>
      </div>

      {/* Body grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, flex: 1 }}>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, borderRight: "1px solid var(--ih-line)", minWidth: 0 }}>
          {/* trigger + stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
            <div className="ih-card" style={{ padding: 14 }}>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Trigger</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "var(--ih-accent-soft)",
                  color: "var(--ih-accent)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={trigger.icon as IconName} size={15} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{trigger.label}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{wf.trigger.configSummary}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden" }}>
              {[
                { label: "Runs · 30d",   value: String(wf.stats.runsLast30d),       tone: "var(--ih-ink)" },
                { label: "Success rate", value: `${wf.stats.successRate}%`,         tone: wf.stats.successRate >= 95 ? "var(--ih-ok)" : wf.stats.successRate >= 80 ? "var(--ih-warn)" : "var(--ih-danger)" },
                { label: "Avg duration", value: fmtDuration(wf.stats.avgDurationMs), tone: "var(--ih-ink)" },
                { label: "Last run",     value: wf.stats.lastRunAt ?? "—",          tone: "var(--ih-ink)" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--ih-surface)", padding: "12px 14px" }}>
                  <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
                  <div className="ih-serif ih-num" style={{ fontSize: 22, lineHeight: 1, color: s.tone }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Flow visualization */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="ih-eyebrow">{wf.isVisual ? "Flow graph" : "Linear steps"}</div>
              <Link href={`/platform/workflows/${wf.id}/edit`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="code" size={11} /> Edit
              </Link>
            </div>
            {wf.isVisual
              ? <GraphCanvas nodes={wf.nodes} edges={wf.edges} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
              : <LinearStepList nodes={wf.nodes} edges={wf.edges} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
            }
          </div>

          {/* Recent executions */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="ih-eyebrow">Recent executions · last {wf.recentExecutions.length}</div>
              <Link href={`/platform/workflows/${wf.id}/executions`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
                Full history
              </Link>
            </div>
            <div className="ih-card" style={{ overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--ih-surface-2)" }}>
                    <th style={{ ...TH, paddingLeft: 16 }}>Run ID</th>
                    <th style={TH}>Started</th>
                    <th style={TH}>Duration</th>
                    <th style={TH}>Trigger</th>
                    <th style={TH}>Steps</th>
                    <th style={TH}>Status</th>
                    <th style={{ width: 28 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {wf.recentExecutions.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ih-ink-40)" }}>No runs yet</td></tr>
                  )}
                  {wf.recentExecutions.map(ex => {
                    const tone = ex.status === "completed" ? "ok" : ex.status === "failed" ? "danger" : ex.status === "running" ? "accent" : "muted"
                    const isExpanded = expandedExId === ex.id
                    const progress = ex.stepsTotal ? Math.round((ex.stepsCompleted / ex.stepsTotal) * 100) : 0
                    return (
                      <>
                        <tr key={ex.id} onClick={() => setExpandedExId(isExpanded ? null : ex.id)} style={{ borderTop: "1px solid var(--ih-line)", cursor: "pointer", background: isExpanded ? "var(--ih-surface-2)" : undefined }}>
                          <td style={{ padding: "10px 12px 10px 16px" }}><span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{ex.id}</span></td>
                          <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{ex.startedAt}</span></td>
                          <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11 }}>{fmtDuration(ex.durationMs)}</span></td>
                          <td style={{ padding: "10px 12px" }}><span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{ex.trigger.summary}</span></td>
                          <td style={{ padding: "10px 12px", width: 140 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 50, height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${progress}%`, height: "100%", background: ex.status === "failed" ? "var(--ih-danger)" : "var(--ih-ok)" }} />
                              </div>
                              <span className="ih-mono" style={{ fontSize: 10.5 }}>{ex.stepsCompleted}/{ex.stepsTotal}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 9, padding: "2px 6px" }}>{ex.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={11} style={{ color: "var(--ih-ink-30)" }} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${ex.id}-trace`}>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <ExecutionTrace ex={ex} />
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance */}
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Performance · last 30 days</div>
            <div className="ih-card" style={{ padding: 14 }}>
              <Sparkline daily={wf.stats.daily} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--ih-ink-50)" }}>
                <span><span className="ih-num">{wf.stats.daily.reduce((s, d) => s + d.runs, 0)}</span> total runs</span>
                <span><span className="ih-num" style={{ color: "var(--ih-danger)" }}>{wf.stats.daily.reduce((s, d) => s + d.failures, 0)}</span> failures</span>
                <span><span className="ih-num">{fmtDuration(wf.stats.avgDurationMs)}</span> avg</span>
              </div>
            </div>
          </div>

          {/* Settings card */}
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Settings</div>
            <div className="ih-card" style={{ padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  ["Retry policy",   `${wf.settings.retryPolicy} · max ${wf.settings.retryMax}`],
                  ["Timeout",        `${(wf.settings.timeoutMs / 1000).toFixed(0)}s`],
                  ["Concurrency",    `${wf.settings.concurrency} parallel`],
                  ["Error handler",  wf.settings.errorHandler],
                  ["Owner",          wf.owner.name],
                  ["Last modified",  wf.lastModifiedAt],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Used by / uses */}
          {(wf.usesWorkflowIds.length > 0 || wf.usedByWorkflowIds.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Sub-workflows used</div>
                <div className="ih-card" style={{ padding: 4 }}>
                  {wf.usesWorkflowIds.length === 0 && <div style={{ padding: 14, fontSize: 11, color: "var(--ih-ink-40)" }}>none</div>}
                  {wf.usesWorkflowIds.map(id => {
                    const sub = mockWorkflows.getById(id)
                    if (!sub) return null
                    return (
                      <Link key={id} href={`/platform/workflows/${id}`} style={{ display: "flex", gap: 10, padding: "8px 10px", textDecoration: "none", color: "var(--ih-ink)", alignItems: "center", borderRadius: "var(--ih-r-sm)" }}>
                        <Icon name="workflow" size={12} style={{ color: "var(--ih-ink-50)" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{sub.name}</div>
                          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{sub.id}</div>
                        </div>
                        <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Used by</div>
                <div className="ih-card" style={{ padding: 4 }}>
                  {wf.usedByWorkflowIds.length === 0 && <div style={{ padding: 14, fontSize: 11, color: "var(--ih-ink-40)" }}>none</div>}
                  {wf.usedByWorkflowIds.map(id => {
                    const par = mockWorkflows.getById(id)
                    if (!par) return null
                    return (
                      <Link key={id} href={`/platform/workflows/${id}`} style={{ display: "flex", gap: 10, padding: "8px 10px", textDecoration: "none", color: "var(--ih-ink)", alignItems: "center", borderRadius: "var(--ih-r-sm)" }}>
                        <Icon name="workflow" size={12} style={{ color: "var(--ih-ink-50)" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{par.name}</div>
                          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>{par.id}</div>
                        </div>
                        <Icon name="chevronRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 18, background: "var(--ih-surface-2)", minWidth: 0 }}>
          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Quick actions</div>
            <div className="ih-card" style={{ padding: 14, background: "var(--ih-surface)", display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="ih-btn ih-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={runNow}>
                <Icon name="play" size={11} /> Run now
              </button>
              <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={toggleStatus}>
                <Icon name={wf.status === "ENABLED" ? "pause" : "play"} size={11} />
                {wf.status === "ENABLED" ? "Pause workflow" : "Enable workflow"}
              </button>
              <Link href={`/platform/workflows/${wf.id}/edit`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
                <Icon name="code" size={11} /> Open editor
              </Link>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => setToast({ message: `Duplicated · ${wf.name} (copy)`, tone: "ok" })}>
                <Icon name="folder" size={11} /> Clone
              </button>
            </div>
          </div>

          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Test with payload</div>
            <div className="ih-card" style={{ padding: 12, background: "var(--ih-surface)" }}>
              <textarea
                className="ih-input"
                value={testPayload}
                onChange={e => setTestPayload(e.target.value)}
                rows={5}
                style={{ fontFamily: "var(--ih-font-mono)", fontSize: 11, padding: 8, resize: "vertical" }}
              />
              <button className="ih-btn ih-btn-primary ih-btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={runWithPayload}>
                <Icon name="play" size={11} /> Test run
              </button>
            </div>
          </div>

          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Recent failures</div>
            <div className="ih-card" style={{ padding: 4, background: "var(--ih-surface)" }}>
              {failures.length === 0 && <div style={{ padding: 14, fontSize: 11, color: "var(--ih-ink-40)", textAlign: "center" }}>No failures</div>}
              {failures.slice(0, 3).map(f => (
                <div key={f.id} onClick={() => setExpandedExId(f.id)} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", cursor: "pointer", borderBottom: "1px dashed var(--ih-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{f.id}</span>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{f.startedAt}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ih-danger)", lineHeight: 1.35 }}>{f.failureReason}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Audit log</div>
            <div className="ih-card" style={{ padding: 4, background: "var(--ih-surface)" }}>
              {[
                { when: wf.lastModifiedAt, who: wf.owner.name, what: "Edited workflow definition" },
                { when: "Apr 12 2026", who: wf.owner.name, what: "Enabled workflow" },
                { when: wf.createdAt,    who: wf.owner.name, what: "Created workflow" },
              ].map((ev, i) => (
                <div key={i} style={{ padding: "8px 10px", borderBottom: i === 2 ? 0 : "1px dashed var(--ih-line)" }}>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{ev.when} · {ev.who}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)" }}>{ev.what}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}

const TH: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10,
  color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em",
  fontFamily: "var(--ih-font-mono)",
}
