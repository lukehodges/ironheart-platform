"use client"

import { memo, useMemo } from "react"
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "reactflow"
import "reactflow/dist/style.css"
import { Folder, Tag, User, Plus, Trash2, type LucideIcon } from "lucide-react"
import { api } from "@/lib/trpc/react"
import type {
  InterviewMode,
  OrgChartNodeType,
  OrgChartTree,
} from "@/modules/onboarding/onboarding.types"

/* ---------- visual constants ---------- */

const NODE_W = 260
const NODE_H = 108
const X_GAP = 36
const Y_GAP = 88

const TYPE_ICONS: Record<OrgChartNodeType, LucideIcon> = {
  DEPARTMENT: Folder,
  ROLE: Tag,
  PERSON: User,
}

const TYPE_ACCENT: Record<OrgChartNodeType, string> = {
  DEPARTMENT: "var(--ih-ink-65)",
  ROLE: "var(--ih-info)",
  PERSON: "var(--ih-accent)",
}

const MODE_BADGE: Record<InterviewMode, { bg: string; color: string; border: string; strikethrough?: boolean }> = {
  ALL:        { bg: "rgba(47,111,92,0.10)",  color: "var(--ih-ok)",     border: "rgba(47,111,92,0.3)" },
  SAMPLE:     { bg: "rgba(184,134,11,0.10)", color: "var(--ih-warn)",   border: "rgba(184,134,11,0.3)" },
  OWNER_ONLY: { bg: "var(--ih-surface-2)",   color: "var(--ih-ink-65)", border: "var(--ih-line)" },
  SKIP:       { bg: "rgba(209,58,31,0.08)",  color: "var(--ih-danger)", border: "rgba(209,58,31,0.3)", strikethrough: true },
}

/* ---------- types ---------- */

interface OrgNodeData {
  label: string
  type: OrgChartNodeType
  contactName: string | null
  contactRole: string | null
  headcount: number | null
  interviewMode: InterviewMode
  sampleSize: number | null
  version: number
  childCount: number
  compact: boolean
  isSelected: boolean
  editable: boolean
  engagementId: string
  mode: "consultant" | "client"
}

interface ChartGraphProps {
  tree: OrgChartTree[]
  engagementId: string
  mode?: "consultant" | "client"
  selectedNodeId?: string | null
  onSelectNode?: (id: string) => void
  /** Compact = preview style: smaller height, no controls, no editing. */
  compact?: boolean
  /** Whether to expose add-child / delete buttons on hover. */
  editable?: boolean
  /** Fixed CSS height for the canvas container. */
  height?: number | string
}

/* ---------- tidy-tree layout ---------- */

function layout(roots: OrgChartTree[]): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
  const widthSlots = new Map<string, number>()

  function measure(n: OrgChartTree): number {
    if (n.children.length === 0) {
      widthSlots.set(n.id, 1)
      return 1
    }
    const w = n.children.reduce((s, c) => s + measure(c), 0)
    widthSlots.set(n.id, w)
    return w
  }
  for (const r of roots) measure(r)

  const nodes: Node<OrgNodeData>[] = []
  const edges: Edge[] = []
  let cursor = 0

  function place(n: OrgChartTree, depth: number, parentId: string | null) {
    const w = widthSlots.get(n.id) ?? 1
    const slotStart = cursor
    const centerSlot = slotStart + w / 2
    const x = centerSlot * (NODE_W + X_GAP) - NODE_W / 2
    const y = depth * (NODE_H + Y_GAP)

    nodes.push({
      id: n.id,
      type: "orgNode",
      position: { x, y },
      // data filled by caller (needs runtime flags); placeholder here
      data: {} as OrgNodeData,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      // selection styling handled inside custom node
      selectable: true,
      draggable: false,
    })

    if (parentId) {
      edges.push({
        id: `${parentId}__${n.id}`,
        source: parentId,
        target: n.id,
        type: "smoothstep",
        style: { stroke: "var(--ih-line)", strokeWidth: 1.5 },
      })
    }

    if (n.children.length === 0) {
      cursor += 1
    } else {
      for (const c of n.children) place(c, depth + 1, n.id)
    }
  }
  for (const r of roots) place(r, 0, null)

  return { nodes, edges }
}

function flatten(tree: OrgChartTree[]): Map<string, OrgChartTree> {
  const m = new Map<string, OrgChartTree>()
  const walk = (ns: OrgChartTree[]) => {
    for (const n of ns) {
      m.set(n.id, n)
      walk(n.children)
    }
  }
  walk(tree)
  return m
}

/* ---------- custom node ---------- */

const OrgNode = memo(function OrgNode({ id, data }: NodeProps<OrgNodeData>) {
  const Icon = TYPE_ICONS[data.type]
  const badge = MODE_BADGE[data.interviewMode]
  const accent = TYPE_ACCENT[data.type]
  const utils = api.useUtils()

  const invalidateChart = () =>
    utils.onboarding[data.mode === "consultant" ? "getChart" : "clientGetChart"].invalidate({
      engagementId: data.engagementId,
    })

  const createMutation =
    data.mode === "consultant"
      ? api.onboarding.createNode.useMutation({ onSuccess: invalidateChart })
      : api.onboarding.clientCreateNode.useMutation({ onSuccess: invalidateChart })

  const deleteMutation =
    data.mode === "consultant"
      ? api.onboarding.deleteNode.useMutation({ onSuccess: invalidateChart })
      : api.onboarding.clientDeleteNode.useMutation({ onSuccess: invalidateChart })

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    createMutation.mutate({
      engagementId: data.engagementId,
      parentId: id,
      label: "New node",
      type: "ROLE",
      sortOrder: data.childCount,
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete '${data.label}'${data.childCount ? ` and ${data.childCount} child${data.childCount === 1 ? "" : "ren"}` : ""}?`)) return
    deleteMutation.mutate({ id, version: data.version })
  }

  const modeLabel = data.interviewMode === "SAMPLE" ? `Sample(${data.sampleSize ?? 0})` : data.interviewMode

  return (
    <div
      data-org-node
      style={{
        position: "relative",
        width: NODE_W,
        height: NODE_H,
        borderRadius: 8,
        background: "var(--ih-surface)",
        border: `1px solid ${data.isSelected ? "var(--ih-accent)" : "var(--ih-line)"}`,
        boxShadow: data.isSelected
          ? "0 0 0 2px color-mix(in srgb, var(--ih-accent) 25%, transparent)"
          : "0 1px 0 rgba(0,0,0,0.02)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontFamily: "var(--ih-font-sans)",
        transition: "border-color 0.12s, box-shadow 0.12s",
      }}
      className="ih-org-node"
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />

      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 5,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={14} />
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ih-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {data.label}
        </span>
        {data.headcount != null && (
          <span
            className="ih-mono"
            style={{
              fontSize: 11,
              color: "var(--ih-ink-50)",
              flexShrink: 0,
            }}
          >
            ×{data.headcount}
          </span>
        )}
      </div>

      {/* secondary row: contact name/role */}
      {(data.contactName || data.contactRole) && (
        <div
          style={{
            fontSize: 12,
            color: "var(--ih-ink-50)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.contactName ?? "—"}
          {data.contactRole ? ` · ${data.contactRole}` : ""}
        </div>
      )}

      {/* footer row: type + interview mode */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
        <span
          className="ih-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ih-ink-40)",
          }}
        >
          {data.type}
        </span>
        <span
          className="ih-mono"
          style={{
            padding: "2px 6px",
            borderRadius: 3,
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            border: `1px solid ${badge.border}`,
            background: badge.bg,
            color: badge.color,
            textDecoration: badge.strikethrough ? "line-through" : "none",
          }}
        >
          {modeLabel}
        </span>
      </div>

      {/* hover toolbar */}
      {data.editable && (
        <div
          data-org-toolbar
          style={{
            position: "absolute",
            top: -10,
            right: 6,
            display: "flex",
            gap: 4,
            background: "var(--ih-surface)",
            border: "1px solid var(--ih-line)",
            borderRadius: 6,
            padding: 2,
            opacity: 0,
            transition: "opacity 0.12s ease",
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={handleAdd}
            disabled={createMutation.isPending}
            title="Add child"
            style={iconBtnStyle("var(--ih-ink-50)")}
          >
            <Plus size={11} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            title="Delete node"
            style={iconBtnStyle("var(--ih-danger)")}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  )
})

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    color,
    borderRadius: 4,
    cursor: "pointer",
    pointerEvents: "auto",
  }
}

const nodeTypes: NodeTypes = { orgNode: OrgNode }

/* ---------- main component ---------- */

export function ChartGraph({
  tree,
  engagementId,
  mode = "consultant",
  selectedNodeId,
  onSelectNode,
  compact = false,
  editable = false,
  height,
}: ChartGraphProps) {
  const { rfNodes, rfEdges } = useMemo(() => {
    const flat = flatten(tree)
    const { nodes, edges } = layout(tree)
    const rfNodes: Node<OrgNodeData>[] = nodes.map((n) => {
      const src = flat.get(n.id)!
      return {
        ...n,
        data: {
          label: src.label,
          type: src.type,
          contactName: src.contactName,
          contactRole: src.contactRole,
          headcount: src.headcount,
          interviewMode: src.interviewMode,
          sampleSize: src.sampleSize,
          version: src.version,
          childCount: src.children.length,
          compact,
          isSelected: selectedNodeId === n.id,
          editable,
          engagementId,
          mode,
        },
      }
    })
    return { rfNodes, rfEdges: edges }
  }, [tree, selectedNodeId, compact, editable, engagementId, mode])

  if (tree.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          fontSize: 13,
          color: "var(--ih-ink-50)",
          fontFamily: "var(--ih-font-sans)",
        }}
      >
        No chart nodes yet.
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: height ?? "100%",
        minHeight: compact ? 240 : 360,
        position: "relative",
        background: "var(--ih-bg)",
        borderRadius: compact ? 8 : 0,
        border: compact ? "1px solid var(--ih-line)" : "none",
        overflow: "hidden",
      }}
    >
      <style jsx global>{`
        .ih-org-node:hover [data-org-toolbar] {
          opacity: 1 !important;
        }
      `}</style>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: compact ? 0.15 : 0.18, maxZoom: compact ? 1.2 : 1.6, minZoom: 0.4 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1.1 }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!!onSelectNode}
        panOnScroll={!compact}
        zoomOnScroll={!compact}
        zoomOnDoubleClick={!compact}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_e, n) => onSelectNode?.(n.id)}
      >
        {!compact && <Controls showInteractive={false} />}
        {!compact && <Background gap={20} size={1} color="var(--ih-line)" />}
      </ReactFlow>
    </div>
  )
}
