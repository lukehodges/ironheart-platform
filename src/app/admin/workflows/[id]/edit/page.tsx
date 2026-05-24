"use client"

/* Workflow builder/editor — Linear + Visual modes, no DnD, no react-flow. */

import { useState, useMemo, useRef, useEffect, use as usePromise } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Icon, type IconName } from "@/components/shell"
import { NotificationToast } from "@/components/shared"
import {
  mockWorkflows,
  NODE_ICON,
  ACTION_ICON,
  TRIGGER_META,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowNodeType,
  type ActionKind,
  type ActionNode,
  type IfNode,
  type WaitNode,
  type SubWorkflowNode,
  type TriggerNode,
  type TriggerType,
} from "@/lib/mock/workflows"

/* ── Popover ─────────────────────────────────────────────────────────────── */

function Popover({ trigger, children, align = "left", width = 220 }: {
  trigger: React.ReactNode; children: (close: () => void) => React.ReactNode;
  align?: "left" | "right"; width?: number;
}) {
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

function PopoverItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
        border: 0, background: "transparent",
        fontSize: 12, color: danger ? "var(--ih-danger)" : "var(--ih-ink)", cursor: "pointer",
        textAlign: "left", borderRadius: "var(--ih-r-sm)",
      }}>
      {children}
    </button>
  )
}

/* ── Node palette ────────────────────────────────────────────────────────── */

interface PaletteItem { label: string; type: WorkflowNodeType; icon: IconName; actionKind?: ActionKind }

const PALETTE: PaletteItem[] = [
  { label: "Send email",      type: "ACTION", icon: "mail",     actionKind: "send_email" },
  { label: "Send SMS",        type: "ACTION", icon: "chat",     actionKind: "send_sms" },
  { label: "Create invoice",  type: "ACTION", icon: "invoice",  actionKind: "create_invoice" },
  { label: "Create booking",  type: "ACTION", icon: "calendar", actionKind: "create_booking" },
  { label: "Update field",    type: "ACTION", icon: "code",     actionKind: "update_field" },
  { label: "Call webhook",    type: "ACTION", icon: "link",     actionKind: "call_webhook" },
  { label: "AI draft",        type: "ACTION", icon: "sparkles", actionKind: "ai_draft" },
  { label: "If / branch",     type: "IF",     icon: "filter" },
  { label: "Switch / cases",  type: "SWITCH", icon: "filter" },
  { label: "Wait",            type: "WAIT",   icon: "clock" },
  { label: "Loop",            type: "LOOP",   icon: "refresh" },
  { label: "Sub-workflow",    type: "SUB_WORKFLOW", icon: "workflow" },
  { label: "Stop",            type: "STOP",   icon: "x" },
]

function makeNode(item: PaletteItem, id: string, col: number, row: number): WorkflowNode {
  switch (item.type) {
    case "ACTION":       return { id, type: "ACTION", label: item.label, summary: "configure…", col, row, actionKind: item.actionKind ?? "update_field" }
    case "IF":           return { id, type: "IF",     label: "Branch",   summary: "condition…", col, row, condition: "field == value" }
    case "SWITCH":       return { id, type: "SWITCH", label: "Switch",   summary: "cases…",    col, row, cases: ["case_a", "case_b"] }
    case "WAIT":         return { id, type: "WAIT",   label: "Wait",     summary: "delay: 1h",  col, row, waitFor: "1h" }
    case "LOOP":         return { id, type: "LOOP",   label: "Loop",     summary: "over: items", col, row, over: "items", mode: "sequential" }
    case "SUB_WORKFLOW": return { id, type: "SUB_WORKFLOW", label: "Run sub-workflow", summary: "select target", col, row, targetWorkflowId: "", runMode: "sync" }
    case "STOP":         return { id, type: "STOP",   label: "End",      summary: "halt",       col, row }
    default:             return { id, type: "ACTION", label: item.label, summary: "configure…", col, row, actionKind: "update_field" }
  }
}

/* ── Graph layout (deterministic, recomputed when needed) ────────────────── */

const NODE_W = 168
const NODE_H = 58
const COL_GAP = 60
const ROW_GAP = 30

function layoutNodes(nodes: WorkflowNode[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>()
  nodes.forEach(n => {
    pos.set(n.id, {
      x: 40 + n.col * (NODE_W + COL_GAP),
      y: 40 + n.row * (NODE_H + ROW_GAP),
    })
  })
  return pos
}

/* ── Visual canvas ───────────────────────────────────────────────────────── */

function VisualCanvas({ nodes, edges, selectedId, onSelect }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[];
  selectedId: string | null; onSelect: (id: string) => void;
}) {
  const maxCol = Math.max(0, ...nodes.map(n => n.col))
  const maxRow = Math.max(0, ...nodes.map(n => n.row))
  const width  = 80 + (maxCol + 1) * (NODE_W + COL_GAP)
  const height = 80 + (maxRow + 1) * (NODE_H + ROW_GAP)
  const pos = layoutNodes(nodes)
  return (
    <div className="scrollbar-thin" style={{ overflow: "auto", height: "100%", background: "var(--ih-surface-2)", position: "relative" }}>
      <div style={{ position: "relative", width: Math.max(width, 600), height: Math.max(height, 360) }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, var(--ih-ink-30) 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }} />
        <svg width={Math.max(width, 600)} height={Math.max(height, 360)} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {edges.map((e, i) => {
            const from = pos.get(e.from); const to = pos.get(e.to)
            if (!from || !to) return null
            const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2
            const x2 = to.x,            y2 = to.y + NODE_H / 2
            const mx = (x1 + x2) / 2
            const stroke = e.handle === "false" ? "var(--ih-ink-30)" : e.handle === "true" ? "var(--ih-ok)" : "var(--ih-line-2)"
            return (
              <g key={i}>
                <path d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} stroke={stroke} strokeWidth={1.6} fill="none" />
                {e.label && (
                  <text x={mx} y={(y1 + y2) / 2 - 5} fontSize={9} fill="var(--ih-ink-50)" textAnchor="middle" fontFamily="var(--ih-font-mono)">
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
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

function LinearList({ nodes, edges, selectedId, onSelect, onAdd, onDelete }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (afterIndex: number, item: PaletteItem) => void;
  onDelete: (id: string) => void;
}) {
  const branchEdges = edges.filter(e => e.handle === "true" || e.handle === "false")
  const branchChildren = new Set(branchEdges.map(e => e.to))
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      {nodes.map((n, i) => {
        const indented = branchChildren.has(n.id) && n.type !== "STOP"
        const branchEdge = branchEdges.find(e => e.to === n.id)
        const tone = n.type === "TRIGGER" ? "var(--ih-accent)"
          : n.type === "STOP" || n.type === "ERROR" ? "var(--ih-ink-50)"
          : n.type === "IF" || n.type === "SWITCH" ? "var(--ih-warn)"
          : "var(--ih-info)"
        const isSelected = selectedId === n.id
        return (
          <div key={n.id}>
            <div onClick={() => onSelect(n.id)} style={{
              display: "flex", gap: 12, padding: "10px 12px",
              marginLeft: indented ? 28 : 0,
              background: isSelected ? "var(--ih-accent-soft-2)" : "var(--ih-surface)",
              border: `1px solid ${isSelected ? "var(--ih-accent)" : "var(--ih-line)"}`,
              borderRadius: "var(--ih-r-md)",
              cursor: "pointer", alignItems: "center",
            }}>
              <Icon name="moreV" size={12} style={{ color: "var(--ih-ink-30)" }} />
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", width: 22 }}>{(i + 1).toString().padStart(2, "0")}</div>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: "var(--ih-surface-2)",
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
              {n.type !== "TRIGGER" && (
                <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={e => { e.stopPropagation(); onDelete(n.id) }} title="Delete step">
                  <Icon name="x" size={11} />
                </button>
              )}
            </div>
            {/* Insert-step row */}
            {i < nodes.length - 1 && (
              <div style={{ display: "flex", justifyContent: "center", padding: "2px 0", marginLeft: indented ? 28 : 0 }}>
                <Popover trigger={
                  <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 20, width: 20, borderRadius: "50%", background: "var(--ih-surface-2)", border: "1px dashed var(--ih-line-2)" }} title="Insert step">
                    <Icon name="plus" size={10} />
                  </button>
                } width={200}>{(close) => (
                  <>
                    <div className="ih-eyebrow" style={{ padding: "8px 10px 4px", fontSize: 9 }}>Insert step</div>
                    {PALETTE.map(p => (
                      <PopoverItem key={p.label} onClick={() => { onAdd(i, p); close() }}>
                        <Icon name={p.icon} size={11} style={{ color: "var(--ih-ink-50)" }} />
                        {p.label}
                      </PopoverItem>
                    ))}
                  </>
                )}</Popover>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Node config (right rail) ────────────────────────────────────────────── */

function NodeConfig({ node, onChange }: { node: WorkflowNode; onChange: (next: WorkflowNode) => void }) {
  const tone = node.type === "TRIGGER" ? "var(--ih-accent)"
    : node.type === "IF" || node.type === "SWITCH" ? "var(--ih-warn)"
    : node.type === "STOP" ? "var(--ih-ink-50)"
    : "var(--ih-info)"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: "var(--ih-surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center", color: tone,
        }}>
          <Icon name={NODE_ICON[node.type] as IconName} size={16} />
        </div>
        <div>
          <div className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{node.type}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{node.label}</div>
        </div>
      </div>

      <Field label="label">
        <input className="ih-input" value={node.label} onChange={e => onChange({ ...node, label: e.target.value })} />
      </Field>
      <Field label="summary">
        <input className="ih-input" value={node.summary} onChange={e => onChange({ ...node, summary: e.target.value })} />
      </Field>

      {node.type === "TRIGGER" && (
        <Field label="trigger type">
          <select className="ih-input" value={(node as TriggerNode).triggerType}
            onChange={e => onChange({ ...node, triggerType: e.target.value as TriggerType } as TriggerNode)}>
            {(Object.keys(TRIGGER_META) as TriggerType[]).map(t => <option key={t} value={t}>{TRIGGER_META[t].label}</option>)}
          </select>
        </Field>
      )}

      {node.type === "ACTION" && (
        <Field label="action">
          <select className="ih-input" value={(node as ActionNode).actionKind}
            onChange={e => onChange({ ...node, actionKind: e.target.value as ActionKind } as ActionNode)}>
            {(Object.keys(ACTION_ICON) as ActionKind[]).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
      )}

      {node.type === "ACTION" && (node as ActionNode).actionKind === "send_email" && (
        <>
          <Field label="to">
            <input className="ih-input" placeholder="customer.email" defaultValue="{{ customer.email }}" />
          </Field>
          <Field label="subject">
            <input className="ih-input" defaultValue="Welcome!" />
          </Field>
          <Field label="body / template">
            <textarea className="ih-input" rows={4} defaultValue="template: welcome-v2" />
          </Field>
        </>
      )}

      {node.type === "ACTION" && (node as ActionNode).actionKind === "call_webhook" && (
        <>
          <Field label="url">
            <input className="ih-input" defaultValue="https://" />
          </Field>
          <Field label="method">
            <select className="ih-input"><option>POST</option><option>GET</option><option>PUT</option></select>
          </Field>
        </>
      )}

      {node.type === "IF" && (
        <Field label="condition">
          <input className="ih-input" value={(node as IfNode).condition}
            onChange={e => onChange({ ...node, condition: e.target.value, summary: e.target.value } as IfNode)} />
        </Field>
      )}

      {node.type === "WAIT" && (
        <Field label="wait for">
          <input className="ih-input" value={(node as WaitNode).waitFor}
            onChange={e => onChange({ ...node, waitFor: e.target.value, summary: `delay: ${e.target.value}` } as WaitNode)} />
        </Field>
      )}

      {node.type === "SUB_WORKFLOW" && (
        <>
          <Field label="target workflow">
            <select className="ih-input" value={(node as SubWorkflowNode).targetWorkflowId}
              onChange={e => onChange({ ...node, targetWorkflowId: e.target.value } as SubWorkflowNode)}>
              <option value="">— select —</option>
              {mockWorkflows.list().map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="mode">
            <select className="ih-input" value={(node as SubWorkflowNode).runMode}
              onChange={e => onChange({ ...node, runMode: e.target.value as "sync" | "fire_and_forget" } as SubWorkflowNode)}>
              <option value="sync">Wait for completion</option>
              <option value="fire_and_forget">Fire and forget</option>
            </select>
          </Field>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function WorkflowEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const original = mockWorkflows.getById(id)
  if (!original) notFound()

  /* edit state */
  const [name, setName] = useState(original.name)
  const [editingName, setEditingName] = useState(false)
  const [mode, setMode] = useState<"linear" | "visual">(original.isVisual ? "visual" : "linear")
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => structuredClone(original.nodes))
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => structuredClone(original.edges))
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null)
  const [testOpen, setTestOpen] = useState(false)
  const [testPayload, setTestPayload] = useState<string>('{ "example": true }')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone?: "ok" | "info" | "warn" | "danger" } | null>(null)
  const [savedVersion, setSavedVersion] = useState(3)
  const nextIdRef = useRef(1)
  const mintId = () => `n_new_${(nextIdRef.current++).toString(36)}`

  const selected = nodes.find(n => n.id === selectedId) ?? null

  /* validation */
  const validation = useMemo(() => {
    const issues: string[] = []
    if (nodes.length === 0) issues.push("Workflow has no nodes")
    if (!nodes.some(n => n.type === "TRIGGER")) issues.push("Missing trigger node")
    const ids = new Set(nodes.map(n => n.id))
    for (const e of edges) {
      if (!ids.has(e.from)) issues.push(`Edge from unknown node ${e.from}`)
      if (!ids.has(e.to))   issues.push(`Edge to unknown node ${e.to}`)
    }
    /* orphan check (except trigger) */
    const reachable = new Set<string>()
    nodes.filter(n => n.type === "TRIGGER").forEach(n => reachable.add(n.id))
    let added = true
    while (added) {
      added = false
      for (const e of edges) {
        if (reachable.has(e.from) && !reachable.has(e.to)) { reachable.add(e.to); added = true }
      }
    }
    nodes.forEach(n => { if (n.type !== "TRIGGER" && !reachable.has(n.id)) issues.push(`Orphan node: ${n.label}`) })
    return issues
  }, [nodes, edges])

  function updateNode(id: string, next: WorkflowNode) {
    setNodes(prev => prev.map(n => n.id === id ? next : n))
  }
  function deleteNode(id: string) {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id))
    if (selectedId === id) setSelectedId(null)
    setToast({ message: "Step removed", tone: "warn" })
  }
  function addStep(afterIndex: number, item: PaletteItem) {
    const newId = mintId()
    setNodes(prev => {
      const after = prev[afterIndex]
      const next = makeNode(item, newId, after.col + 1, after.row)
      /* shift subsequent nodes' col by 1 to make room */
      const updated = prev.map(n => n.col > after.col ? { ...n, col: n.col + 1 } : n)
      return [...updated.slice(0, afterIndex + 1), next, ...updated.slice(afterIndex + 1)]
    })
    setEdges(prev => {
      const after = nodes[afterIndex]
      const nextAfter = nodes[afterIndex + 1]
      let updated = [...prev]
      if (nextAfter) {
        /* re-route after→nextAfter through new node */
        updated = updated.filter(e => !(e.from === after.id && e.to === nextAfter.id))
        updated.push({ from: after.id, to: newId })
        updated.push({ from: newId, to: nextAfter.id })
      } else {
        updated.push({ from: after.id, to: newId })
      }
      return updated
    })
    setSelectedId(newId)
    setToast({ message: `${item.label} added`, tone: "ok" })
  }
  function addToVisual(item: PaletteItem) {
    const lastCol = Math.max(0, ...nodes.map(n => n.col))
    const newId = mintId()
    const node = makeNode(item, newId, lastCol + 1, 0)
    setNodes(prev => [...prev, node])
    setSelectedId(newId)
    setToast({ message: `${item.label} added`, tone: "ok" })
  }
  function save() {
    if (validation.length > 0) {
      setToast({ message: `Cannot save · ${validation.length} issue${validation.length !== 1 ? "s" : ""}`, tone: "danger" })
      return
    }
    setSavedVersion(v => v + 1)
    setToast({ message: `Workflow saved · v${savedVersion + 1}`, tone: "ok" })
  }
  function testRun() {
    try {
      JSON.parse(testPayload)
      setTestResult(nodes.map((n, i) => `${(i + 1).toString().padStart(2, "0")} · ${n.label} → ok (${n.type === "WAIT" ? "skipped (test)" : Math.floor(40 + Math.random() * 200) + "ms"})`).join("\n"))
      setToast({ message: "Test run complete", tone: "ok" })
    } catch {
      setTestResult("Invalid JSON payload")
      setToast({ message: "Payload is not valid JSON", tone: "danger" })
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", margin: "-24px -24px" }}>
      {/* Top toolbar */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "var(--ih-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Link href={`/admin/workflows/${original.id}`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
            <Icon name="chevronLeft" size={12} />
            <span className="ih-eyebrow">{original.name}</span>
          </Link>
          <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
          {editingName ? (
            <input className="ih-input" value={name} autoFocus
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === "Enter") setEditingName(false) }}
              onChange={e => setName(e.target.value)}
              style={{ height: 26, padding: "0 8px", fontSize: 13, fontWeight: 500, maxWidth: 320 }} />
          ) : (
            <span onClick={() => setEditingName(true)} title="Click to rename" style={{ fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}>{name}</span>
          )}
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>v{savedVersion} draft</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Popover align="right" width={180} trigger={
            <button className="ih-btn ih-btn-quiet ih-btn-sm">
              <Icon name="clock" size={11} /> Versions
            </button>
          }>{(close) => (
            <>
              <div className="ih-eyebrow" style={{ padding: "8px 10px 4px", fontSize: 9 }}>Recent versions</div>
              {[savedVersion, savedVersion - 1, savedVersion - 2].filter(v => v > 0).map(v => (
                <PopoverItem key={v} onClick={() => { setToast({ message: `Loaded v${v}`, tone: "info" }); close() }}>v{v} · {original.lastModifiedAt}</PopoverItem>
              ))}
            </>
          )}</Popover>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" onClick={() => setTestOpen(o => !o)}>
            <Icon name="play" size={11} /> Test
          </button>
          <div style={{ display: "flex", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", padding: 2, gap: 2 }}>
            <button onClick={() => setMode("linear")} className="ih-btn ih-btn-sm"
              style={{ height: 22, background: mode === "linear" ? "var(--ih-surface-2)" : "transparent", border: 0, color: mode === "linear" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
              <Icon name="list" size={11} /> Linear
            </button>
            <button onClick={() => setMode("visual")} className="ih-btn ih-btn-sm"
              style={{ height: 22, background: mode === "visual" ? "var(--ih-surface-2)" : "transparent", border: 0, color: mode === "visual" ? "var(--ih-ink)" : "var(--ih-ink-50)" }}>
              <Icon name="workflow" size={11} /> Visual
            </button>
          </div>
          <div style={{ width: 1, height: 18, background: "var(--ih-line)" }} />
          <Link href={`/admin/workflows/${original.id}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>Cancel</Link>
          <button className="ih-btn ih-btn-primary ih-btn-sm" onClick={save}>
            <Icon name="check" size={11} /> Save
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: mode === "visual" ? "200px 1fr 320px" : "1fr 320px", flex: 1, overflow: "hidden" }}>
        {mode === "visual" && (
          <aside style={{ borderRight: "1px solid var(--ih-line)", padding: 12, background: "var(--ih-surface-2)", overflowY: "auto" }} className="scrollbar-thin">
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Node palette</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {PALETTE.map(p => (
                <button key={p.label} onClick={() => addToVisual(p)} className="ih-card" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  background: "var(--ih-surface)", textAlign: "left", cursor: "pointer", border: "1px solid var(--ih-line)",
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--ih-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ih-ink-65)", flexShrink: 0 }}>
                    <Icon name={p.icon} size={12} />
                  </div>
                  <span style={{ fontSize: 12 }}>{p.label}</span>
                  <Icon name="plus" size={11} style={{ color: "var(--ih-ink-30)", marginLeft: "auto" }} />
                </button>
              ))}
            </div>
            <div className="ih-eyebrow" style={{ marginTop: 16, marginBottom: 6 }}>Hint</div>
            <div style={{ fontSize: 11, color: "var(--ih-ink-50)", lineHeight: 1.4 }}>
              Click a palette item to add a node. Click any node to edit. Layout is auto-computed from column/row.
            </div>
          </aside>
        )}

        <div style={{ overflowY: "auto", minWidth: 0, display: "flex", flexDirection: "column" }} className="scrollbar-thin">
          {mode === "linear" ? (
            <LinearList
              nodes={nodes}
              edges={edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={addStep}
              onDelete={deleteNode}
            />
          ) : (
            <VisualCanvas nodes={nodes} edges={edges} selectedId={selectedId} onSelect={setSelectedId} />
          )}

          {testOpen && (
            <div style={{ borderTop: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div className="ih-eyebrow">Test panel · paste a trigger payload</div>
                <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} onClick={() => setTestOpen(false)}>
                  <Icon name="x" size={11} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <textarea
                  className="ih-input" rows={6}
                  value={testPayload} onChange={e => setTestPayload(e.target.value)}
                  style={{ fontFamily: "var(--ih-font-mono)", fontSize: 11, padding: 8, resize: "vertical" }}
                />
                <pre className="ih-mono" style={{
                  fontSize: 10.5, padding: 10, background: "var(--ih-surface)",
                  borderRadius: "var(--ih-r-md)", border: "1px solid var(--ih-line)",
                  margin: 0, color: "var(--ih-ink-65)", overflow: "auto", maxHeight: 160,
                }}>
{testResult ?? "Click ‘Test run’ to simulate this workflow with the payload."}
                </pre>
              </div>
              <button className="ih-btn ih-btn-primary ih-btn-sm" style={{ marginTop: 8 }} onClick={testRun}>
                <Icon name="play" size={11} /> Test run
              </button>
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside style={{ borderLeft: "1px solid var(--ih-line)", background: "var(--ih-surface-2)", overflowY: "auto", padding: 16, minWidth: 0 }} className="scrollbar-thin">
          {selected ? (
            <NodeConfig node={selected} onChange={next => updateNode(selected.id, next)} />
          ) : (
            <div style={{ fontSize: 12, color: "var(--ih-ink-50)", textAlign: "center", padding: "40px 12px" }}>
              <Icon name="sparkles" size={20} style={{ color: "var(--ih-ink-30)", marginBottom: 8 }} />
              <div>Select a node to edit its config</div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom bar — validation */}
      <div style={{
        padding: "8px 18px", borderTop: "1px solid var(--ih-line)",
        background: validation.length === 0 ? "var(--ih-ok-soft)" : "var(--ih-warn-soft)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          {validation.length === 0 ? (
            <>
              <Icon name="check" size={12} style={{ color: "var(--ih-ok)" }} />
              <span style={{ color: "var(--ih-ok)", fontWeight: 500 }}>Valid</span>
              <span style={{ color: "var(--ih-ink-50)" }}>· {nodes.length} nodes · {edges.length} edges</span>
            </>
          ) : (
            <>
              <Icon name="flag" size={12} style={{ color: "var(--ih-warn)" }} />
              <span style={{ color: "var(--ih-warn)", fontWeight: 500 }}>{validation.length} issue{validation.length !== 1 ? "s" : ""}</span>
              <span style={{ color: "var(--ih-ink-65)" }}>· {validation[0]}{validation.length > 1 ? ` (+${validation.length - 1} more)` : ""}</span>
            </>
          )}
        </div>
        <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>
          {original.id} · {mode} mode
        </div>
      </div>

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
