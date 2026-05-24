"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { ChartGraph } from "./chart-graph"
import { NodeInspector } from "./node-inspector"
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
    return (
      <div style={{ padding: 32, fontSize: 13, color: "var(--ih-ink-50)", fontFamily: "var(--ih-font-sans)" }}>
        Loading chart…
      </div>
    )
  }

  if (chartQuery.error) {
    return (
      <div style={{ padding: 32, background: "var(--ih-bg)" }}>
        <h1 style={{ fontFamily: "var(--ih-font-serif)", fontSize: 28, marginBottom: 8, color: "var(--ih-ink)" }}>
          Chart unavailable
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>{chartQuery.error.message}</p>
      </div>
    )
  }

  const tree = chartQuery.data ?? []
  const isEmpty = tree.length === 0
  const selectedNode = selectedNodeId ? findNodeInTree(tree, selectedNodeId) : null

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 560, background: "var(--ih-bg)" }}>
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--ih-line)",
          padding: "16px 32px",
          background: "var(--ih-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            className="ih-mono"
            style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ih-ink-40)", marginBottom: 4 }}
          >
            Platform / Clients / {engagementTitle} / Onboarding
          </p>
          <h1
            className="ih-serif"
            style={{ fontSize: 24, margin: 0, color: "var(--ih-ink)" }}
          >
            {companyLabel} — Org chart
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isEmpty && mode === "consultant" && (
            <button
              onClick={() => seedMutation.mutate({ engagementId })}
              disabled={!clientTenantProvisioned || seedMutation.isPending}
              style={{
                borderRadius: 6,
                border: "1px solid var(--ih-line)",
                background: "var(--ih-surface)",
                padding: "7px 16px",
                fontSize: 13,
                color: "var(--ih-ink)",
                cursor: seedMutation.isPending || !clientTenantProvisioned ? "not-allowed" : "pointer",
                opacity: seedMutation.isPending || !clientTenantProvisioned ? 0.5 : 1,
              }}
            >
              {seedMutation.isPending ? "Seeding…" : "Seed from tier"}
            </button>
          )}
          {!isEmpty && mode === "consultant" && (
            <button
              onClick={() => setPlanModalOpen(true)}
              style={{
                borderRadius: 6,
                background: "var(--ih-accent)",
                border: "none",
                padding: "7px 16px",
                fontSize: 13,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Approve plan & preview
            </button>
          )}
        </div>
      </div>

      {/* Full-bleed graph with slide-in inspector drawer */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        {isEmpty ? (
          <div style={{ textAlign: "center", color: "var(--ih-ink-50)", padding: "48px 24px" }}>
            <p style={{ fontSize: 13 }}>No chart yet.</p>
            {mode === "consultant" && !clientTenantProvisioned && (
              <p style={{ fontSize: 11, marginTop: 8 }}>
                Engagement must be at CONTRACTED stage with provisioned tenant before seeding.
              </p>
            )}
            {mode === "consultant" && clientTenantProvisioned && (
              <p style={{ fontSize: 11, marginTop: 8 }}>Click "Seed from tier" to generate a starting chart.</p>
            )}
          </div>
        ) : (
          <ChartGraph
            tree={tree}
            engagementId={engagementId}
            mode={mode}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            editable={mode === "consultant"}
          />
        )}

        {/* Inspector — slides in from right when a node is selected */}
        <aside
          aria-hidden={!selectedNode}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            maxWidth: "90%",
            background: "var(--ih-surface)",
            borderLeft: "1px solid var(--ih-line)",
            boxShadow: selectedNode ? "-12px 0 32px -16px rgba(0,0,0,0.18)" : "none",
            transform: selectedNode ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.22s ease, box-shadow 0.22s ease",
            overflowY: "auto",
            zIndex: 5,
          }}
        >
          {selectedNode && (
            <NodeInspector
              node={selectedNode}
              mode={mode}
              engagementId={engagementId}
              onClearSelection={() => setSelectedNodeId(null)}
            />
          )}
        </aside>
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
