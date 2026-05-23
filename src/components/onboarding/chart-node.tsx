"use client"

import { Folder, Tag, User, Plus, Trash2, type LucideIcon } from "lucide-react"
import { api } from "@/lib/trpc/react"
import type { OrgChartTree, OrgChartNodeType, InterviewMode } from "@/modules/onboarding/onboarding.types"

// TODO: drag-to-reparent deferred to Phase 0.1.C v2 — wire up @dnd-kit/sortable
// when reparentNode is ready to be called from the UI.

const TYPE_ICONS: Record<OrgChartNodeType, LucideIcon> = {
  DEPARTMENT: Folder,
  ROLE: Tag,
  PERSON: User,
}

const MODE_BADGE_STYLE: Record<InterviewMode, string> = {
  ALL: "bg-emerald-100 text-emerald-800 border-emerald-300",
  SAMPLE: "bg-amber-100 text-amber-800 border-amber-300",
  OWNER_ONLY: "bg-zinc-100 text-zinc-700 border-zinc-300",
  SKIP: "bg-red-100 text-red-800 border-red-300 line-through",
}

interface ChartNodeProps {
  node: OrgChartTree
  depth: number
  mode: "consultant" | "client"
  engagementId: string
  isSelected: boolean
  onSelect: () => void
}

export function ChartNode({
  node,
  depth,
  mode,
  engagementId,
  isSelected,
  onSelect,
}: ChartNodeProps) {
  const Icon = TYPE_ICONS[node.type]
  const utils = api.useUtils()

  const invalidateChart = () =>
    utils.onboarding[mode === "consultant" ? "getChart" : "clientGetChart"].invalidate({
      engagementId,
    })

  const createMutation =
    mode === "consultant"
      ? api.onboarding.createNode.useMutation({ onSuccess: invalidateChart })
      : api.onboarding.clientCreateNode.useMutation({ onSuccess: invalidateChart })

  const deleteMutation =
    mode === "consultant"
      ? api.onboarding.deleteNode.useMutation({ onSuccess: invalidateChart })
      : api.onboarding.clientDeleteNode.useMutation({ onSuccess: invalidateChart })

  const handleAddChild = () => {
    createMutation.mutate({
      engagementId,
      parentId: node.id,
      label: "New node",
      type: "ROLE" as OrgChartNodeType,
      sortOrder: node.children.length,
    })
  }

  const handleDelete = () => {
    const subtreeCount = countDescendants(node)
    const message =
      subtreeCount > 0
        ? `Delete '${node.label}' and ${subtreeCount} child node${subtreeCount === 1 ? "" : "s"}?`
        : `Delete '${node.label}'?`
    if (!confirm(message)) return
    deleteMutation.mutate({ id: node.id, version: node.version })
  }

  const modeBadgeLabel =
    node.interviewMode === "SAMPLE"
      ? `Sample(${node.sampleSize ?? 0})`
      : node.interviewMode

  return (
    <div
      onClick={onSelect}
      className={[
        "group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer",
        isSelected ? "bg-muted ring-1 ring-primary" : "",
      ].join(" ")}
      style={{ marginLeft: depth * 20 }}
    >
      <Icon size={14} className="text-muted-foreground flex-shrink-0" />

      <span className="font-medium text-sm truncate flex-1">{node.label}</span>

      <span
        className={[
          "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border",
          MODE_BADGE_STYLE[node.interviewMode],
        ].join(" ")}
      >
        {modeBadgeLabel}
      </span>

      {node.headcount != null && (
        <span className="text-xs font-mono text-muted-foreground">{node.headcount}p</span>
      )}

      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleAddChild()
          }}
          className="rounded p-1 hover:bg-background"
          title="Add child"
          disabled={createMutation.isPending}
        >
          <Plus size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="rounded p-1 hover:bg-background text-red-600"
          title="Delete"
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function countDescendants(node: { children: { id: string; children: OrgChartTree[] }[] }): number {
  let count = node.children.length
  for (const c of node.children) count += countDescendants(c)
  return count
}
