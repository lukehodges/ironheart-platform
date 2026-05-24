"use client"

import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"
import { ChartNode } from "./chart-node"

interface ChartTreeProps {
  tree: OrgChartTree[]
  mode: "consultant" | "client"
  engagementId: string
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
}

export function ChartTree({
  tree,
  mode,
  engagementId,
  selectedNodeId,
  onSelectNode,
}: ChartTreeProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {tree.map((node) => (
        <ChartNodeRecursive
          key={node.id}
          node={node}
          depth={0}
          mode={mode}
          engagementId={engagementId}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  )
}

function ChartNodeRecursive({
  node,
  depth,
  mode,
  engagementId,
  selectedNodeId,
  onSelectNode,
}: {
  node: OrgChartTree
  depth: number
  mode: "consultant" | "client"
  engagementId: string
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
}) {
  return (
    <div>
      <ChartNode
        node={node}
        depth={depth}
        mode={mode}
        engagementId={engagementId}
        isSelected={selectedNodeId === node.id}
        onSelect={() => onSelectNode(node.id)}
      />
      {node.children.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {node.children.map((child) => (
            <ChartNodeRecursive
              key={child.id}
              node={child}
              depth={depth + 1}
              mode={mode}
              engagementId={engagementId}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
