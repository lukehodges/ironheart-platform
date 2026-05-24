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

const MODE_BADGE_COLORS: Record<InterviewMode, { bg: string; color: string; border: string; strikethrough?: boolean }> = {
  ALL:        { bg: "rgba(47,111,92,0.10)", color: "var(--ih-ok)",     border: "rgba(47,111,92,0.3)" },
  SAMPLE:     { bg: "rgba(184,134,11,0.10)", color: "var(--ih-warn)",  border: "rgba(184,134,11,0.3)" },
  OWNER_ONLY: { bg: "var(--ih-surface-2)",  color: "var(--ih-ink-65)", border: "var(--ih-line)" },
  SKIP:       { bg: "rgba(209,58,31,0.08)", color: "var(--ih-danger)", border: "rgba(209,58,31,0.3)", strikethrough: true },
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

  const badge = MODE_BADGE_COLORS[node.interviewMode]

  return (
    <div
      onClick={onSelect}
      className="group"
      style={{
        marginLeft: depth * 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        background: isSelected ? "var(--ih-surface)" : "transparent",
        border: isSelected ? "1px solid var(--ih-accent)" : "1px solid transparent",
        transition: "background 0.12s ease, border-color 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--ih-surface-2)"
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"
      }}
    >
      <Icon size={14} style={{ color: "var(--ih-ink-50)", flexShrink: 0 }} />

      <span style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: "var(--ih-ink)" }}>
        {node.label}
      </span>

      <span
        style={{
          padding: "1px 6px",
          borderRadius: 4,
          fontSize: 9,
          fontFamily: "var(--ih-font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          border: `1px solid ${badge.border}`,
          background: badge.bg,
          color: badge.color,
          textDecoration: badge.strikethrough ? "line-through" : "none",
          flexShrink: 0,
        }}
      >
        {modeBadgeLabel}
      </span>

      {node.headcount != null && (
        <span style={{ fontSize: 11, fontFamily: "var(--ih-font-mono)", color: "var(--ih-ink-50)", flexShrink: 0 }}>
          {node.headcount}p
        </span>
      )}

      <div style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.1s ease" }}
        className="group-hover:opacity-100"
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleAddChild()
          }}
          style={{
            borderRadius: 4,
            padding: 3,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ih-ink-50)",
            display: "flex",
            alignItems: "center",
          }}
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
          style={{
            borderRadius: 4,
            padding: 3,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ih-danger)",
            display: "flex",
            alignItems: "center",
          }}
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
