"use client"

/* Workflows dashboard — list, board, slide-in detail drawer. */

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast } from "@/components/shared"
import {
  mockWorkflows,
  TRIGGER_META,
  STATUS_META,
  NODE_ICON,
  type Workflow,
  type WorkflowFilters,
  type WorkflowSortBy,
  type WorkflowSortDir,
  type WorkflowStatus,
  type TriggerType,
  type WorkflowNode,
  type WorkflowEdge,
  type Execution,
} from "@/lib/mock/workflows"

/* ── Lightweight Popover (click outside) ─────────────────────────────────── */

function Popover({
  trigger, children, align = "left", width = 220,
}: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="animate-pop-in" style={{
          position: "absolute", top: "calc(100% + 6px)", [align === "right" ? "right" : "left"]: 0,
          zIndex: 100, width, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
          borderRadius: "var(--ih-r-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 4,
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function PopoverHeader({ children }: { children: React.ReactNode }) {
  return <div className="ih-eyebrow" style={{ padding: "8px 10px 4px", fontSize: 9 }}>{children}</div>
}
function PopoverItem({ active, onClick, children, danger }: { active?: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "var(--ih-accent-soft)" : "transparent" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
        border: 0, background: active ? "var(--ih-accent-soft)" : "transparent",
        fontSize: 12, color: danger ? "var(--ih-danger)" : "var(--ih-ink)", cursor: "pointer",
        textAlign: "left", borderRadius: "var(--ih-r-sm)",
      }}>
      {active && <Icon name="check" size={11} style={{ color: "var(--ih-accent)" }} />}
      {!active && <span style={{ width: 11 }} />}
      {children}
    </button>
  )
}

/* ── Segment rail ────────────────────────────────────────────────────────── */

function SegmentRail({
  activeSegment, onSegmentChange,
  activeTags, onTagToggle,
}: {
  activeSegment: string; onSegmentChange: (id: string) => void;
  activeTags: string[]; onTagToggle: (tag: string) => void;
}) {
  const segments = mockWorkflows.segments()
  return (
    <aside style={{ width: 200, borderRight: "1px solid var(--ih-line)", padding: "12px 8px", overflowY: "auto", flexShrink: 0 }} className="scrollbar-thin">
      {segments.map((sec, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div className="ih-eyebrow" style={{ padding: "8px 8px 4px", fontSize: 9 }}>{sec.group}</div>
          {sec.items?.map((it) => {
            const isActive = it.id === activeSegment
            return (
              <div key={it.id} onClick={() => onSegmentChange(it.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 8px", borderRadius: "var(--ih-r-sm)",
                background: isActive ? "var(--ih-surface)" : "transparent",
                border: isActive ? "1px solid var(--ih-line)" : "1px solid transparent",
                fontSize: 12, color: isActive ? "var(--ih-ink)" : "var(--ih-ink-65)", cursor: "pointer",
                position: "relative",
              }}>
                {isActive && <span style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 2, height: 14, background: "var(--ih-accent)", borderRadius: 2 }} />}
                {it.pinned && <Icon name="pin" size={10} style={{ color: "var(--ih-accent)" }} />}
                {!it.pinned && it.icon && <Icon name={it.icon as IconName} size={12} style={{ color: "var(--ih-ink-40)" }} />}
                {!it.pinned && !it.icon && <span style={{ width: 12 }} />}
                <span style={{ flex: 1, fontWeight: isActive ? 500 : 400 }}>{it.label}</span>
                {it.dot && <span className={`ih-dot ih-dot-${it.dot}`} />}
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{it.count}</span>
              </div>
            )
          })}
          {sec.tags && (
            <div style={{ padding: "4px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
              {sec.tags.map((t) => {
                const on = activeTags.includes(t)
                return (
                  <span key={t} onClick={() => onTagToggle(t)} className="ih-pill"
                    style={{
                      fontSize: 9, padding: "2px 6px", textTransform: "lowercase",
                      letterSpacing: "0.02em", fontFamily: "var(--ih-font-sans)",
                      cursor: "pointer",
                      background: on ? "var(--ih-accent-soft)" : undefined,
                      color: on ? "var(--ih-accent)" : undefined,
                      borderColor: on ? "transparent" : undefined,
                    }}>
                    #{t}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </aside>
  )
}

/* ── Reusable bits ───────────────────────────────────────────────────────── */

function StatusPill({ status, onClick }: { status: WorkflowStatus; onClick?: () => void }) {
  const meta = STATUS_META[status]
  return (
    <span
      onClick={onClick ? e => { e.stopPropagation(); onClick() } : undefined}
      className={`ih-pill ih-pill-${meta.tone}`}
      style={{ fontSize: 9, padding: "2px 6px", cursor: onClick ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}
      title={onClick ? `Filter by status: ${meta.label}` : undefined}
    >
      <span className={`ih-dot ih-dot-${meta.tone === "muted" ? "muted" : meta.tone}`} />
      {meta.label}
    </span>
  )
}

function TriggerPill({ type, onClick, summary }: { type: TriggerType; onClick?: () => void; summary?: string }) {
  const meta = TRIGGER_META[type]
  return (
    <span
      onClick={onClick ? e => { e.stopPropagation(); onClick() } : undefined}
      className={`ih-pill ih-pill-${meta.tone}`}
      style={{ fontSize: 9, padding: "2px 6px", cursor: onClick ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}
      title={onClick ? `Filter by trigger: ${meta.label}` : summary}
    >
      <Icon name={meta.icon as IconName} size={9} />
      {meta.label}
    </span>
  )
}

function SuccessBar({ value }: { value: number }) {
  const tone = value >= 95 ? "var(--ih-ok)" : value >= 80 ? "var(--ih-warn)" : "var(--ih-danger)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 40, height: 4, background: "var(--ih-surface-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: tone }} />
      </div>
      <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{value}%</span>
    </div>
  )
}

function fmtDuration(ms: number): string {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

function SuccessRing({ value, size = 44 }: { value: number; size?: number }) {
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = value >= 95 ? "var(--ih-ok)" : value >= 80 ? "var(--ih-warn)" : "var(--ih-danger)"
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ih-surface-3)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="ih-num" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{value}</div>
    </div>
  )
}

/* ── Mini-graph (SVG) — column/row layout from node fields ───────────────── */

function MiniGraph({ nodes, edges, width = 320, height = 140, accentRunningId }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[]; width?: number; height?: number; accentRunningId?: string | null
}) {
  const maxCol = Math.max(0, ...nodes.map(n => n.col))
  const maxRow = Math.max(0, ...nodes.map(n => n.row))
  const padX = 18, padY = 16
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const colStep = maxCol > 0 ? innerW / maxCol : 0
  const rowStep = maxRow > 0 ? innerH / Math.max(1, maxRow) : 0
  const positions = new Map<string, { x: number; y: number }>()
  for (const n of nodes) {
    const x = padX + n.col * colStep
    const y = padY + (maxRow === 0 ? innerH / 2 : n.row * rowStep)
    positions.set(n.id, { x, y })
  }

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* edges as bezier curves */}
      {edges.map((e, i) => {
        const from = positions.get(e.from); const to = positions.get(e.to)
        if (!from || !to) return null
        const mx = (from.x + to.x) / 2
        const path = `M ${from.x + 6} ${from.y} C ${mx} ${from.y} ${mx} ${to.y} ${to.x - 6} ${to.y}`
        const isTrue  = e.handle === "true"
        const isFalse = e.handle === "false"
        return (
          <g key={i}>
            <path d={path}
              stroke={isFalse ? "var(--ih-ink-30)" : isTrue ? "var(--ih-ok)" : "var(--ih-line-2)"}
              strokeWidth={1.2} fill="none" />
            {e.label && (
              <text x={mx} y={(from.y + to.y) / 2 - 3} fontSize={8} fill="var(--ih-ink-40)" textAnchor="middle" fontFamily="var(--ih-font-mono)">
                {e.label}
              </text>
            )}
          </g>
        )
      })}
      {/* nodes */}
      {nodes.map(n => {
        const p = positions.get(n.id)!
        const tone = n.type === "TRIGGER" ? "var(--ih-accent)"
          : n.type === "STOP" || n.type === "ERROR" ? "var(--ih-ink-50)"
          : n.type === "IF" || n.type === "SWITCH" ? "var(--ih-warn)"
          : "var(--ih-info)"
        const isAccent = accentRunningId === n.id
        return (
          <g key={n.id}>
            <rect x={p.x - 6} y={p.y - 6} width={12} height={12} rx={3}
              fill="var(--ih-surface)"
              stroke={isAccent ? "var(--ih-accent)" : tone}
              strokeWidth={isAccent ? 2 : 1.2} />
            <circle cx={p.x} cy={p.y} r={2.2} fill={tone} />
          </g>
        )
      })}
    </svg>
  )
}

/* ── Stage / status helpers for last-run dot ─────────────────────────────── */

function LastRunCell({ wf }: { wf: Workflow }) {
  const status = wf.stats.lastRunStatus
  if (!status || !wf.stats.lastRunAt) return <span style={{ color: "var(--ih-ink-30)" }}>—</span>
  const tone = status === "completed" ? "ok" : status === "failed" ? "danger" : status === "running" ? "accent" : "muted"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span className={`ih-dot ih-dot-${tone}`} />
      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{wf.stats.lastRunAt}</span>
    </div>
  )
}

/* ── Table row ───────────────────────────────────────────────────────────── */

function WorkflowRow({
  wf, isSelected, onClick, onAddFilter, onToggleStatus, onRunNow, onDuplicate,
}: {
  wf: Workflow; isSelected: boolean;
  onClick: () => void;
  onAddFilter: <K extends keyof WorkflowFilters>(k: K, v: string) => void;
  onToggleStatus: (wf: Workflow) => void;
  onRunNow: (wf: Workflow) => void;
  onDuplicate: (wf: Workflow) => void;
}) {
  return (
    <tr onClick={onClick} style={{
      background: isSelected ? "var(--ih-accent-soft-2)" : "transparent",
      borderTop: "1px solid var(--ih-line)", cursor: "pointer",
    }}>
      <td style={{ padding: "10px 10px 10px 14px", width: 28 }}>
        <input type="checkbox" style={{ accentColor: "var(--ih-accent)" }} onClick={e => e.stopPropagation()} />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: "var(--ih-surface-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: wf.status === "ENABLED" ? "var(--ih-accent)" : "var(--ih-ink-50)", flexShrink: 0,
          }}>
            <Icon name="workflow" size={14} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 500, fontSize: 12.5 }}>{wf.name}</span>
              {wf.isVisual && <span className="ih-pill" style={{ fontSize: 8, padding: "1px 5px" }}>graph</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{wf.description}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 10px" }}>
        <TriggerPill type={wf.trigger.type} onClick={() => onAddFilter("trigger", wf.trigger.type)} summary={wf.trigger.configSummary} />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <StatusPill status={wf.status} onClick={() => onAddFilter("status", wf.status)} />
      </td>
      <td style={{ padding: "10px 10px" }}>
        <span className="ih-num" style={{ fontSize: 12.5 }}>{wf.stats.runsLast30d}</span>
      </td>
      <td style={{ padding: "10px 10px" }}><SuccessBar value={wf.stats.successRate} /></td>
      <td style={{ padding: "10px 10px" }}>
        <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>{fmtDuration(wf.stats.avgDurationMs)}</span>
      </td>
      <td style={{ padding: "10px 10px" }}><LastRunCell wf={wf} /></td>
      <td style={{ padding: "10px 10px" }}>
        <div className="ih-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{wf.owner.initials}</div>
      </td>
      <td style={{ padding: "10px 14px 10px 10px" }} onClick={e => e.stopPropagation()}>
        <Popover align="right" width={170} trigger={
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}>
            <Icon name="moreH" size={12} />
          </button>
        }>{(close) => (
          <>
            <Link href={`/platform/workflows/${wf.id}`} style={{ textDecoration: "none" }}>
              <PopoverItem onClick={close}>Open</PopoverItem>
            </Link>
            <Link href={`/platform/workflows/${wf.id}/edit`} style={{ textDecoration: "none" }}>
              <PopoverItem onClick={close}>Edit</PopoverItem>
            </Link>
            <PopoverItem onClick={() => { onRunNow(wf); close() }}>Run now</PopoverItem>
            <PopoverItem onClick={() => { onToggleStatus(wf); close() }}>
              {wf.status === "ENABLED" ? "Pause" : "Enable"}
            </PopoverItem>
            <PopoverItem onClick={() => { onDuplicate(wf); close() }}>Duplicate</PopoverItem>
            <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
            <PopoverItem danger onClick={close}>Archive</PopoverItem>
          </>
        )}</Popover>
      </td>
    </tr>
  )
}

/* ── Cards view ──────────────────────────────────────────────────────────── */

function CardsView({ rows, onRowClick, selectedId }: { rows: Workflow[]; onRowClick: (id: string) => void; selectedId: string | null }) {
  return (
    <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {rows.map(wf => (
          <div key={wf.id} onClick={() => onRowClick(wf.id)} className="ih-card" style={{
            padding: 14, cursor: "pointer",
            borderColor: wf.id === selectedId ? "var(--ih-accent)" : undefined,
            boxShadow: wf.id === selectedId ? "0 0 0 3px var(--ih-accent-soft)" : undefined,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: "var(--ih-surface-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: wf.status === "ENABLED" ? "var(--ih-accent)" : "var(--ih-ink-50)",
              }}>
                <Icon name="workflow" size={18} />
              </div>
              <SuccessRing value={wf.stats.successRate} />
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4, lineHeight: 1.2 }}>{wf.name}</div>
            <div style={{ fontSize: 11, color: "var(--ih-ink-50)", marginBottom: 10, lineHeight: 1.4, minHeight: 30 }}>{wf.description}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <TriggerPill type={wf.trigger.type} summary={wf.trigger.configSummary} />
              <StatusPill status={wf.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ih-ink-50)", borderTop: "1px solid var(--ih-line)", paddingTop: 8 }}>
              <span><span className="ih-num">{wf.stats.runsLast30d}</span> runs · 30d</span>
              <span className="ih-mono">{wf.stats.lastRunAt ?? "never"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function DetailDrawer({ wf, onClose, onToggleStatus, onRunNow, onDuplicate, onOpenExecution }: {
  wf: Workflow
  onClose: () => void
  onToggleStatus: (wf: Workflow) => void
  onRunNow: (wf: Workflow) => void
  onDuplicate: (wf: Workflow) => void
  onOpenExecution: (e: Execution) => void
}) {
  const trigger = TRIGGER_META[wf.trigger.type]
  return (
    <aside key={wf.id} className="animate-slide-in-right" style={{
      width: 380, borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ih-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "var(--ih-surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: wf.status === "ENABLED" ? "var(--ih-accent)" : "var(--ih-ink-50)", flexShrink: 0,
          }}>
            <Icon name="workflow" size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StatusPill status={wf.status} />
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{wf.id}</span>
            </div>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginTop: 4 }}>{wf.isVisual ? "Graph workflow" : "Linear workflow"} · {wf.nodes.length} nodes</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href={`/platform/workflows/${wf.id}`} className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24, textDecoration: "none" }} title="Open full page">
            <Icon name="arrowUpRight" size={12} />
          </Link>
          <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 24, width: 24 }} onClick={onClose} title="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="ih-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
          {wf.name.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="ih-italic-red">{wf.name.split(" ").slice(-1)[0]}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.5, marginBottom: 12 }}>
          {wf.description}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {wf.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, padding: "2px 6px", textTransform: "lowercase" }}>#{t}</span>)}
        </div>

        {/* mini-graph */}
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{wf.isVisual ? "Flow graph" : "Steps"}</div>
        <div className="ih-card" style={{ padding: 4, marginBottom: 14, background: "var(--ih-surface)" }}>
          {wf.isVisual ? (
            <MiniGraph nodes={wf.nodes} edges={wf.edges} width={342} height={150} />
          ) : (
            <div style={{ padding: 10 }}>
              {wf.nodes.map((n, i) => (
                <div key={n.id} style={{ display: "flex", gap: 10, padding: "5px 0", alignItems: "center", borderTop: i === 0 ? 0 : "1px dashed var(--ih-line)" }}>
                  <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", width: 18 }}>{(i + 1).toString().padStart(2, "0")}</span>
                  <Icon name={NODE_ICON[n.type] as IconName} size={11} style={{ color: "var(--ih-ink-50)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 500 }}>{n.label}</div>
                    <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{n.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* trigger card */}
        <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Trigger</div>
        <div className="ih-card" style={{ padding: 12, marginBottom: 14, background: "var(--ih-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name={trigger.icon as IconName} size={14} style={{ color: "var(--ih-accent)" }} />
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{trigger.label}</span>
          </div>
          <div className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>{wf.trigger.configSummary}</div>
        </div>

        {/* 4-stat row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1,
          background: "var(--ih-line)", border: "1px solid var(--ih-line)",
          borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 14,
        }}>
          {[
            { label: "Runs · 30d", value: String(wf.stats.runsLast30d), tone: "var(--ih-ink)" },
            { label: "Success",    value: `${wf.stats.successRate}%`,    tone: wf.stats.successRate >= 95 ? "var(--ih-ok)" : wf.stats.successRate >= 80 ? "var(--ih-warn)" : "var(--ih-danger)" },
            { label: "Avg dur",    value: fmtDuration(wf.stats.avgDurationMs), tone: "var(--ih-ink)" },
            { label: "Last run",   value: wf.stats.lastRunAt ?? "—",      tone: "var(--ih-ink)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--ih-surface)", padding: "10px 12px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 17, color: s.tone, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* recent executions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div className="ih-eyebrow">Recent executions</div>
          <Link href={`/platform/workflows/${wf.id}/executions`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 20, fontSize: 10, textDecoration: "none" }}>
            View all
          </Link>
        </div>
        {wf.recentExecutions.length === 0 && (
          <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--ih-ink-40)", textAlign: "center" }}>No runs yet</div>
        )}
        {wf.recentExecutions.slice(0, 6).map((ex) => {
          const tone = ex.status === "completed" ? "ok" : ex.status === "failed" ? "danger" : ex.status === "running" ? "accent" : "muted"
          return (
            <div key={ex.id} onClick={() => onOpenExecution(ex)} style={{
              display: "grid", gridTemplateColumns: "10px 1fr auto auto", gap: 8, padding: "8px 0",
              borderTop: "1px dashed var(--ih-line)", cursor: "pointer", alignItems: "center",
            }}>
              <span className={`ih-dot ih-dot-${tone}`} />
              <div style={{ minWidth: 0 }}>
                <div className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{ex.id}</div>
                <div style={{ fontSize: 10.5, color: "var(--ih-ink-50)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                  {ex.trigger.summary}
                </div>
              </div>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{ex.startedAt}</span>
              <span className="ih-mono" style={{ fontSize: 10.5 }}>{fmtDuration(ex.durationMs)}</span>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: "1px solid var(--ih-line)", padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "var(--ih-surface)" }}>
        <Link href={`/platform/workflows/${wf.id}`} className="ih-btn ih-btn-accent" style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}>
          <Icon name="arrowUpRight" size={12} /> Open workflow
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onRunNow(wf)}>
            <Icon name="play" size={11} /> Run now
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onToggleStatus(wf)}>
            <Icon name={wf.status === "ENABLED" ? "pause" : "play"} size={11} />
            {wf.status === "ENABLED" ? "Pause" : "Enable"}
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ flex: 1 }} onClick={() => onDuplicate(wf)}>
            <Icon name="folder" size={11} /> Duplicate
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ── Filter chip bar ─────────────────────────────────────────────────────── */

function FilterChips({
  filters, activeTags, search,
  onRemoveFilter, onRemoveTag, onClearSearch, onClearAll,
}: {
  filters: WorkflowFilters; activeTags: string[]; search: string;
  onRemoveFilter: <K extends keyof WorkflowFilters>(k: K, v?: string) => void;
  onRemoveTag: (t: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const chips: React.ReactNode[] = []
  filters.status?.forEach(s => chips.push(
    <span key={`status-${s}`} className="ih-pill" onClick={() => onRemoveFilter("status", s)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      Status: {STATUS_META[s].label} <Icon name="x" size={9} />
    </span>
  ))
  filters.trigger?.forEach(t => chips.push(
    <span key={`trigger-${t}`} className="ih-pill" onClick={() => onRemoveFilter("trigger", t)} style={{ cursor: "pointer" }}>
      Trigger: {TRIGGER_META[t].label} <Icon name="x" size={9} />
    </span>
  ))
  if (filters.failing) chips.push(
    <span key="failing" className="ih-pill ih-pill-danger" onClick={() => onRemoveFilter("failing")} style={{ cursor: "pointer" }}>
      Failing now <Icon name="x" size={9} />
    </span>
  )
  activeTags.forEach(t => chips.push(
    <span key={`tag-${t}`} className="ih-pill" onClick={() => onRemoveTag(t)}
      style={{ background: "var(--ih-accent-soft)", color: "var(--ih-accent)", borderColor: "transparent", cursor: "pointer" }}>
      #{t} <Icon name="x" size={9} />
    </span>
  ))
  if (search.trim()) chips.push(
    <span key="search" className="ih-pill" onClick={onClearSearch} style={{ cursor: "pointer" }}>
      Search: &quot;{search}&quot; <Icon name="x" size={9} />
    </span>
  )
  if (chips.length === 0) return null
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {chips}
      <button onClick={onClearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, fontSize: 10 }}>Clear all</button>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function WorkflowsListPage() {
  const [view, setView] = useState<"table" | "cards">("table")
  const [selectedId, setSelectedId] = useState<string | null>("wf-invoice-on-payment")
  const [activeSegment, setActiveSegment] = useState("all")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<WorkflowFilters>({})
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<WorkflowSortBy>("runsLast30d")
  const [sortDir, setSortDir] = useState<WorkflowSortDir>("desc")
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WorkflowStatus>>({})
  const [toast, setToast] = useState<{ message: string; tone?: "ok" | "info" | "warn" | "accent" | "danger" } | null>(null)

  const rows = useMemo(() => {
    const base = mockWorkflows.list({
      segment: activeSegment, search,
      filters: { ...filters, tag: activeTags.length ? activeTags : undefined },
      sortBy, sortDir,
    })
    return base.map(w => statusOverrides[w.id] ? { ...w, status: statusOverrides[w.id] } : w)
  }, [activeSegment, search, filters, activeTags, sortBy, sortDir, statusOverrides])

  const stats = useMemo(() => mockWorkflows.stats(rows), [rows])
  const total = mockWorkflows.total()
  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? mockWorkflows.getById(selectedId) : null

  const activeFilterCount =
    (filters.status?.length ?? 0) + (filters.trigger?.length ?? 0)
    + (filters.failing ? 1 : 0) + activeTags.length

  function addFilter<K extends keyof WorkflowFilters>(key: K, value: string) {
    setFilters(prev => {
      if (key === "failing") return { ...prev, failing: true }
      const current = (prev[key] as string[] | undefined) ?? []
      if (current.includes(value)) return prev
      return { ...prev, [key]: [...current, value] as WorkflowFilters[K] }
    })
  }
  function removeFilter<K extends keyof WorkflowFilters>(key: K, value?: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (key === "failing" || value === undefined) { delete next[key]; return next }
      const current = (prev[key] as string[] | undefined) ?? []
      const remaining = current.filter(v => v !== value)
      if (remaining.length === 0) { delete next[key]; return next }
      return { ...next, [key]: remaining as WorkflowFilters[K] }
    })
  }
  function toggleTag(t: string) {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function clearAll() {
    setFilters({}); setActiveTags([]); setSearch("")
  }

  function toggleStatus(wf: Workflow) {
    const next: WorkflowStatus = wf.status === "ENABLED" ? "DISABLED" : "ENABLED"
    setStatusOverrides(prev => ({ ...prev, [wf.id]: next }))
    setToast({
      message: `${wf.name} ${next === "ENABLED" ? "enabled" : "paused"}`,
      tone: next === "ENABLED" ? "ok" : "warn",
    })
  }
  function runNow(wf: Workflow) {
    setToast({ message: `Run started · ${wf.name}`, tone: "info" })
  }
  function duplicate(wf: Workflow) {
    setToast({ message: `Duplicated · ${wf.name} (copy)`, tone: "ok" })
  }
  function openExecution(ex: Execution) {
    setToast({ message: `Execution ${ex.id} · ${ex.status}`, tone: ex.status === "failed" ? "danger" : "info" })
  }

  const viewLabel = activeSegment === "all" ? "All workflows"
    : mockWorkflows.segments().flatMap(s => s.items ?? []).find(i => i.id === activeSegment)?.label
    ?? "Workflows"

  const TH: React.CSSProperties = {
    textAlign: "left", padding: "10px 10px", fontWeight: 500, fontSize: 10,
    color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em",
    fontFamily: "var(--ih-font-mono)", cursor: "pointer", userSelect: "none",
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", margin: "-24px -24px" }}>
      <SegmentRail
        activeSegment={activeSegment} onSegmentChange={setActiveSegment}
        activeTags={activeTags} onTagToggle={toggleTag}
      />

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Hero header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ih-line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 6 }}>Automation · {viewLabel} · <span style={{ color: "var(--ih-accent)" }}>★ Demo data</span></div>
              <h1 className="ih-serif" style={{ fontSize: 26, margin: 0 }}>
                Workflows. Your <span className="ih-italic-red">operating system</span>.
              </h1>
              <div style={{ fontSize: 12, color: "var(--ih-ink-50)", marginTop: 4 }}>
                {rows.length} workflow{rows.length !== 1 ? "s" : ""} · {rows.filter(r => r.stats.lastRunStatus === "failed").length} failing now · last refreshed just now
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Popover width={240} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} /> {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}` : "Filter"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Status</PopoverHeader>
                  {(["ENABLED", "DISABLED", "DRAFT"] as WorkflowStatus[]).map(s => {
                    const active = filters.status?.includes(s) ?? false
                    return <PopoverItem key={s} active={active} onClick={() => active ? removeFilter("status", s) : addFilter("status", s)}>{STATUS_META[s].label}</PopoverItem>
                  })}
                  <PopoverHeader>Trigger</PopoverHeader>
                  {(Object.keys(TRIGGER_META) as TriggerType[]).map(t => {
                    const active = filters.trigger?.includes(t) ?? false
                    return <PopoverItem key={t} active={active} onClick={() => active ? removeFilter("trigger", t) : addFilter("trigger", t)}>{TRIGGER_META[t].label}</PopoverItem>
                  })}
                  <PopoverHeader>State</PopoverHeader>
                  <PopoverItem active={!!filters.failing} onClick={() => filters.failing ? removeFilter("failing") : addFilter("failing", "true")}>Failing now</PopoverItem>
                </>
              )}</Popover>

              <Popover align="right" width={200} trigger={
                <button className="ih-btn ih-btn-quiet ih-btn-sm">
                  <Icon name="filter" size={11} />
                  Sort: {sortBy} {sortDir === "desc" ? "↓" : "↑"}
                </button>
              }>{() => (
                <>
                  <PopoverHeader>Sort by</PopoverHeader>
                  {(["runsLast30d", "successRate", "name", "lastRun"] as WorkflowSortBy[]).map(s => (
                    <PopoverItem key={s} active={sortBy === s} onClick={() => setSortBy(s)}>{s}</PopoverItem>
                  ))}
                  <PopoverHeader>Direction</PopoverHeader>
                  <PopoverItem active={sortDir === "desc"} onClick={() => setSortDir("desc")}>Descending</PopoverItem>
                  <PopoverItem active={sortDir === "asc"} onClick={() => setSortDir("asc")}>Ascending</PopoverItem>
                </>
              )}</Popover>

              <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
              <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
                <button onClick={() => setView("table")} className="ih-btn ih-btn-sm"
                  style={{ height: 22, background: view === "table" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "table" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
                  <Icon name="list" size={11} /> Table
                </button>
                <button onClick={() => setView("cards")} className="ih-btn ih-btn-sm"
                  style={{ height: 22, background: view === "cards" ? "var(--ih-surface-2)" : "transparent", border: 0, color: view === "cards" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
                  <Icon name="grid" size={11} /> Cards
                </button>
              </div>

              <Link href="/platform/workflows/wf-quote-followup/edit" className="ih-btn ih-btn-primary ih-btn-sm" style={{ textDecoration: "none" }}>
                <Icon name="plus" size={11} /> New
              </Link>
            </div>
          </div>
        </div>

        {/* Stat strip (filtered) */}
        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
          {[
            { label: "Enabled",         value: String(stats.enabled),                    sub: `of ${rows.length} shown`,                  tone: "var(--ih-ink)"  },
            { label: "Runs today",      value: String(stats.runsToday),                  sub: "across all visible",                       tone: "var(--ih-ink)"  },
            { label: "Success · 7d",    value: `${stats.successRate7d}%`,                sub: "weighted by volume",                        tone: stats.successRate7d >= 95 ? "var(--ih-ok)" : stats.successRate7d >= 80 ? "var(--ih-warn)" : "var(--ih-danger)" },
            { label: "Failures today",  value: String(stats.failuresToday),              sub: stats.failuresToday ? "needs review" : "all clear",  tone: stats.failuresToday ? "var(--ih-danger)" : "var(--ih-ink-50)" },
            { label: "Avg duration",    value: fmtDuration(stats.avgDurationMs),         sub: "weighted by runs",                          tone: "var(--ih-ink)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--ih-bg)", padding: "12px 16px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 26, lineHeight: 1, color: s.tone }}>{s.value}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Search + chip bar */}
        <div style={{ padding: "10px 20px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--ih-line)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320, minWidth: 220 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 8, color: "var(--ih-ink-40)" }} />
            <input className="ih-input" placeholder="Search workflows, triggers, tags…"
              style={{ paddingLeft: 30 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <FilterChips
            filters={filters} activeTags={activeTags} search={search}
            onRemoveFilter={removeFilter} onRemoveTag={(t) => toggleTag(t)}
            onClearSearch={() => setSearch("")} onClearAll={clearAll}
          />
          <div style={{ flex: 1 }} />
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
            SORT: {sortBy.toUpperCase()} {sortDir === "desc" ? "↓" : "↑"}
          </span>
        </div>

        {view === "table" ? (
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--ih-bg)", zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--ih-line)" }}>
                  <th style={{ width: 28, padding: "10px 10px 10px 14px" }}></th>
                  <th style={TH} onClick={() => { setSortBy("name"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Workflow {sortBy === "name" && (sortDir === "desc" ? "↓" : "↑")}</th>
                  <th style={TH}>Trigger</th>
                  <th style={TH}>Status</th>
                  <th style={TH} onClick={() => { setSortBy("runsLast30d"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Runs 30d {sortBy === "runsLast30d" && (sortDir === "desc" ? "↓" : "↑")}</th>
                  <th style={TH} onClick={() => { setSortBy("successRate"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Success {sortBy === "successRate" && (sortDir === "desc" ? "↓" : "↑")}</th>
                  <th style={TH}>Avg dur</th>
                  <th style={TH} onClick={() => { setSortBy("lastRun"); setSortDir(d => d === "asc" ? "desc" : "asc") }}>Last run {sortBy === "lastRun" && (sortDir === "desc" ? "↓" : "↑")}</th>
                  <th style={TH}>Owner</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <WorkflowRow key={r.id} wf={r}
                    isSelected={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                    onAddFilter={addFilter}
                    onToggleStatus={toggleStatus}
                    onRunNow={runNow}
                    onDuplicate={duplicate}
                  />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>
                    No workflows match these filters.{" "}
                    <button onClick={clearAll} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 22, marginLeft: 4 }}>Clear filters</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <CardsView rows={rows} onRowClick={setSelectedId} selectedId={selectedId} />
        )}

        <div style={{ padding: "8px 20px", borderTop: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--ih-ink-50)" }}>
          <span>{rows.length} of {total} workflows</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronLeft" size={11} /></button>
            <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }}><Icon name="chevronRight" size={11} /></button>
          </div>
        </div>
      </section>

      {selected && <DetailDrawer
        wf={selected}
        onClose={() => setSelectedId(null)}
        onToggleStatus={toggleStatus}
        onRunNow={runNow}
        onDuplicate={duplicate}
        onOpenExecution={openExecution}
      />}

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
