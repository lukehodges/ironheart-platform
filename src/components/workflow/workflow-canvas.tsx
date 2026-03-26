"use client"

import { useCallback, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { cn } from "@/lib/utils"
import type { WorkflowNodeTemplate } from "@/types/workflow-builder"

/**
 * Props for the WorkflowCanvas component
 */
interface WorkflowCanvasProps {
  /**
   * Initial nodes for the canvas
   * @default []
   */
  initialNodes?: Node[]

  /**
   * Initial edges for the canvas
   * @default []
   */
  initialEdges?: Edge[]

  /**
   * Callback when a node is selected
   * Receives the selected node ID
   */
  onNodeSelect?: (nodeId: string) => void

  /**
   * React Flow nodes change handler
   * Pass this directly from useWorkflowCanvas hook
   */
  onNodesChange?: OnNodesChange

  /**
   * React Flow edges change handler
   * Pass this directly from useWorkflowCanvas hook
   */
  onEdgesChange?: OnEdgesChange

  /**
   * React Flow connection handler
   * Pass this directly from useWorkflowCanvas hook
   */
  onConnect?: (connection: Connection) => void

  /**
   * Map of custom node types
   * Each key is a node type identifier, value is the React component
   */
  nodeTypes?: NodeTypes

  /**
   * CSS class name for additional styling
   */
  className?: string

  /**
   * Handle drag-and-drop from the palette
   * Should be called with node template when dropped
   */
  onDropNode?: (template: WorkflowNodeTemplate, position: { x: number; y: number }) => void
}

/**
 * WorkflowCanvas Component
 *
 * Main React Flow canvas for visualizing and editing workflows.
 *
 * Features:
 * - React Flow integration with custom node types
 * - Background grid visualization
 * - Zoom controls and fit-to-view
 * - MiniMap for navigation
 * - Node selection with callback
 * - Drag-and-drop support from palette
 * - Theme-aware (respects light/dark via Tailwind dark: variants)
 * - Responsive full-height canvas
 *
 * @example
 * ```tsx
 * <WorkflowCanvas
 *   initialNodes={nodes}
 *   initialEdges={edges}
 *   nodeTypes={customNodeTypes}
 *   onNodeSelect={handleNodeSelect}
 * />
 * ```
 *
 * @example With drag-and-drop
 * ```tsx
 * <WorkflowCanvas
 *   onDropNode={(template, position) => {
 *     canvas.addNode(template.type, position)
 *   }}
 * />
 * ```
 */
export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodeSelect,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes = {},
  className,
  onDropNode,
}: WorkflowCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Handle node click to select
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
      onNodeSelect?.(node.id)
    },
    [onNodeSelect]
  )

  // Handle canvas click to deselect
  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  return (
    <WorkflowCanvasInner
      nodes={initialNodes}
      edges={initialEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onPaneClick={handleCanvasClick}
      className={className}
      selectedNodeId={selectedNodeId}
      onDropNode={onDropNode}
    />
  )
}

/**
 * Inner component that wraps ReactFlow and handles drops
 * Separated so we can use useReactFlow() inside
 */
function WorkflowCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  onNodeClick,
  onPaneClick,
  className,
  selectedNodeId,
  onDropNode,
}: {
  nodes: Node[]
  edges: Edge[]
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: (connection: Connection) => void
  nodeTypes: NodeTypes
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  className?: string
  selectedNodeId: string | null
  onDropNode?: (template: WorkflowNodeTemplate, position: { x: number; y: number }) => void
}) {
  const reactFlowInstance = useReactFlow()

  // Handle connection with fallback
  const handleConnect = useCallback(
    (params: Connection) => {
      if (onConnect) {
        onConnect(params)
      }
    },
    [onConnect]
  )

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    console.log("Drag over")
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      console.log("Drop event!", event.dataTransfer.effectAllowed, event.dataTransfer.dropEffect)

      const data = event.dataTransfer.getData("application/json")
      if (!data) {
        console.log("No data found in dataTransfer")
        return
      }

      try {
        const template: WorkflowNodeTemplate = JSON.parse(data)
        console.log("Template:", template)

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        console.log("Position:", position)

        console.log("Calling onDropNode callback...")
        onDropNode?.(template, position)
        console.log("onDropNode callback completed")
      } catch (error) {
        console.error("Drop error:", error)
      }
    },
    [onDropNode, reactFlowInstance]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative w-full h-full overflow-hidden rounded-lg border",
        "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800",
        className
      )}
      role="region"
      aria-label="Workflow canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        attributionPosition="bottom-right"
        className="workflow-canvas-flow"
        defaultEdgeOptions={{
          animated: true,
          style: {
            strokeWidth: 2,
          },
        }}
      >
        {/* Background grid */}
        <Background
          className="workflow-canvas-bg"
          gap={16}
          size={1}
        />

        {/* Zoom and fit controls */}
        <Controls
          position="bottom-left"
          className={cn(
            "flex gap-2 p-2 rounded-lg border",
            "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          )}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.5rem",
          }}
        />

        {/* Mini map for navigation - only render if there are nodes to prevent NaN errors */}
        {nodes.length > 0 && (
          <MiniMap
            position="top-right"
            className={cn(
              "rounded-lg border overflow-hidden",
              "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            )}
            nodeColor={(node) => {
              if (selectedNodeId === node.id) {
                return "#7c3aed"
            }
            return "#cbd5e1"
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{
            width: "200px",
            height: "150px",
            borderRadius: "0.5rem",
          }}
        />
        )}
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none",
            "rounded-lg"
          )}
        >
          <div className={cn(
            "text-center p-8 rounded-lg border",
            "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
          )}>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Drag nodes from the palette to start building your workflow
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowCanvas
