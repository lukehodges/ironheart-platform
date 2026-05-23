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
    <div className="space-y-1">
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
        <div className="space-y-1 mt-1">
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
