"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { ChartTree } from "./chart-tree"
import { NodeInspector } from "./node-inspector"
import { ActivityFeed } from "./activity-feed"
import { PlanPreviewModal } from "./plan-preview-modal"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"

export type ChartEditorMode = "consultant" | "client"

interface ChartEditorProps {
  mode: ChartEditorMode
  engagementId: string
  engagementTitle: string
  companyLabel: string
  clientTenantSlug?: string | null
  clientTenantProvisioned?: boolean
}

export function ChartEditor({
  mode,
  engagementId,
  engagementTitle,
  companyLabel,
  clientTenantProvisioned,
}: ChartEditorProps) {
  const utils = api.useUtils()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [planModalOpen, setPlanModalOpen] = useState(false)

  const chartQuery =
    mode === "consultant"
      ? api.onboarding.getChart.useQuery({ engagementId })
      : api.onboarding.clientGetChart.useQuery({ engagementId })

  const seedMutation = api.onboarding.seedChart.useMutation({
    onSuccess: () =>
      utils.onboarding.getChart.invalidate({ engagementId }),
  })

  if (chartQuery.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading chart…</div>
  }

  if (chartQuery.error) {
    return (
      <div className="p-8">
        <h1 className="font-serif text-2xl mb-2">Chart unavailable</h1>
        <p className="text-sm text-muted-foreground">{chartQuery.error.message}</p>
      </div>
    )
  }

  const tree = chartQuery.data ?? []
  const isEmpty = tree.length === 0
  const selectedNode = selectedNodeId ? findNodeInTree(tree, selectedNodeId) : null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Platform / Clients / {engagementTitle} / Onboarding
            </p>
            <h1 className="font-serif text-2xl mt-1">{companyLabel} — Org chart</h1>
          </div>
          <div className="flex gap-2">
            {isEmpty && mode === "consultant" && (
              <button
                onClick={() => seedMutation.mutate({ engagementId })}
                disabled={!clientTenantProvisioned || seedMutation.isPending}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seedMutation.isPending ? "Seeding…" : "Seed from tier"}
              </button>
            )}
            {!isEmpty && mode === "consultant" && (
              <button
                onClick={() => setPlanModalOpen(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Approve plan & preview
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tree (40%) */}
        <div
          className="border-r border-border overflow-y-auto p-6 min-w-0"
          style={{ flexBasis: "40%" }}
        >
          {isEmpty ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-sm">No chart yet.</p>
              {mode === "consultant" && !clientTenantProvisioned && (
                <p className="text-xs mt-2">
                  Engagement must be at CONTRACTED stage with provisioned tenant before seeding.
                </p>
              )}
              {mode === "consultant" && clientTenantProvisioned && (
                <p className="text-xs mt-2">Click "Seed from tier" to generate a starting chart.</p>
              )}
            </div>
          ) : (
            <ChartTree
              tree={tree}
              mode={mode}
              engagementId={engagementId}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}
        </div>

        {/* Inspector (40%) */}
        <div
          className="border-r border-border overflow-y-auto p-6 min-w-0"
          style={{ flexBasis: "40%" }}
        >
          {selectedNode ? (
            <NodeInspector
              node={selectedNode}
              mode={mode}
              engagementId={engagementId}
              onClearSelection={() => setSelectedNodeId(null)}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Select a node to edit.</div>
          )}
        </div>

        {/* Activity feed (20%) */}
        <div className="overflow-y-auto p-4" style={{ flexBasis: "20%" }}>
          <ActivityFeed mode={mode} engagementId={engagementId} />
        </div>
      </div>

      {planModalOpen && (
        <PlanPreviewModal
          engagementId={engagementId}
          onClose={() => setPlanModalOpen(false)}
        />
      )}
    </div>
  )
}

function findNodeInTree(tree: OrgChartTree[], id: string): OrgChartTree | null {
  for (const node of tree) {
    if (node.id === id) return node
    const found = findNodeInTree(node.children, id)
    if (found) return found
  }
  return null
}
