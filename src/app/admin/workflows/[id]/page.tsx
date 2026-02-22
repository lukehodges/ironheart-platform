"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ReactFlowProvider, type NodeTypes } from "reactflow"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { useWorkflowCanvas } from "@/hooks/use-workflow-canvas"
import { useWorkflowMutations } from "@/hooks/use-workflow-mutations"
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas"
import { NodePalette } from "@/components/workflow/node-palette"
import { NodeConfigPanel } from "@/components/workflow/node-config-panel"
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar"
import { TriggerNode } from "@/components/workflow/nodes/trigger-node"
import { ActionNode } from "@/components/workflow/nodes/action-node"
import { IfNode } from "@/components/workflow/nodes/if-node"
import { LoopNode } from "@/components/workflow/nodes/loop-node"
import { Button } from "@/components/ui/button"
import { validateWorkflowGraph } from "@/modules/workflow/engine/validate"
import type { WorkflowNodeTemplate } from "@/types/workflow-builder"
import type { Node, Edge } from "reactflow"
import { cn } from "@/lib/utils"

/**
 * Map of custom node types for React Flow
 */
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  if: IfNode,
  loop: LoopNode,
}

/**
 * Workflow Editor Page
 *
 * Full-screen canvas layout for visual workflow editing.
 *
 * Features:
 * - WorkflowCanvas (center, full height)
 * - NodePalette (left sidebar, collapsible, 280px width)
 * - NodeConfigPanel (right, conditional on selected node)
 * - WorkflowToolbar (top, fixed)
 * - Load workflow data on mount via api.workflow.get
 * - Save workflow via api.workflow.update
 * - Validation before save (cycles, orphaned nodes)
 *
 * Layout:
 * ```
 * ┌────────────────────────────────────────────────────┐
 * │ Workflow Toolbar (name, trigger, save, active)     │
 * ├──────┬────────────────────────────────────┬────────┤
 * │      │                                    │        │
 * │ Node │        Canvas (React Flow)         │ Config │
 * │ Pal  │                                    │ Panel  │
 * │ ette │                                    │ (cond) │
 * │      │                                    │        │
 * └──────┴────────────────────────────────────┴────────┘
 * ```
 *
 * @route /admin/workflows/[id]
 */
export default function WorkflowEditorPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string

  // State
  const [workflowName, setWorkflowName] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Load workflow data
  const { data: workflow, isLoading, error } = api.workflow.getById.useQuery(
    { id: workflowId },
    {
      enabled: !!workflowId && workflowId !== "new",
    }
  )

  // Mutations
  const mutations = useWorkflowMutations()

  // Canvas state - initialize with empty arrays, will be populated from workflow
  const canvas = useWorkflowCanvas([], [])

  // Initialize canvas with workflow data (only once when workflow loads)
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name)
      setIsActive(workflow.isActive)

      // Parse nodes and edges from workflow
      if (workflow.isVisual && workflow.nodes && workflow.edges) {
        // Map backend WorkflowNode[] to React Flow Node[]
        const flowNodes: Node[] = workflow.nodes.map((node: any) => ({
          id: node.id,
          type: mapNodeTypeToFlowType(node.type),
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.label || node.type,
            nodeType: node.type, // Store backend type for config panel
            ...node.config,
          },
        }))

        // Map backend WorkflowEdge[] to React Flow Edge[]
        const flowEdges: Edge[] = workflow.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        }))

        canvas.setNodes(flowNodes)
        canvas.setEdges(flowEdges)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id]) // Only re-run if workflow ID changes, not on every workflow update

  /**
   * Map backend node type to React Flow node type
   */
  function mapNodeTypeToFlowType(backendType: string): string {
    const mapping: Record<string, string> = {
      TRIGGER: "trigger",
      SEND_EMAIL: "action",
      SEND_SMS: "action",
      WEBHOOK: "action",
      CREATE_BOOKING: "action",
      UPDATE_BOOKING: "action",
      SEND_NOTIFICATION: "action",
      LOG_MESSAGE: "action",
      IF: "if",
      SWITCH: "if", // Use if-node styling for switch
      LOOP: "loop",
      WAIT_UNTIL: "action",
      WAIT_FOR_EVENT: "action",
      MERGE: "action",
      STOP: "action",
      ERROR: "action",
      SET_VARIABLE: "action",
      FILTER: "action",
      TRANSFORM: "action",
      EXECUTE_WORKFLOW: "action",
    }
    return mapping[backendType] || "action"
  }

  /**
   * Handle node drop from palette
   */
  const handleDropNode = useCallback(
    (template: WorkflowNodeTemplate, position: { x: number; y: number }) => {
      const flowType = mapNodeTypeToFlowType(template.type)
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: flowType,
        position,
        data: {
          label: template.label,
          nodeType: template.type, // Store backend type for config panel
          ...template.defaultConfig,
        },
      }
      canvas.setNodes((nds) => [...nds, newNode])
      toast.success(`Added ${template.label} node`)
    },
    [canvas]
  )

  /**
   * Handle node selection
   */
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  /**
   * Handle node configuration save
   */
  const handleNodeConfigSave = useCallback(
    (config: Record<string, unknown>) => {
      if (!selectedNodeId) return
      canvas.updateNodeData(selectedNodeId, config)
      toast.success("Node configuration updated")
    },
    [selectedNodeId, canvas]
  )

  /**
   * Handle node deletion
   */
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      canvas.deleteNode(nodeId)
      setSelectedNodeId(null)
      toast.success("Node deleted")
    },
    [canvas]
  )

  /**
   * Validate workflow before save
   */
  const validateWorkflow = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Validate form fields
    if (!workflowName.trim()) {
      errors.push("Workflow name is required")
    }

    // Convert React Flow nodes/edges to backend format for validation
    const backendNodes = canvas.nodes.map((node) => ({
      id: node.id,
      type: getBackendNodeType(node.type, node.data),
      label: node.data.label || node.type,
      position: node.position,
      config: node.data,
    }))

    const backendEdges = canvas.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))

    // Validate at least one TRIGGER node exists
    const triggerNodes = backendNodes.filter(n => n.type === 'TRIGGER')
    if (triggerNodes.length === 0) {
      errors.push("At least one TRIGGER node is required")
    }

    // Validate each TRIGGER node has eventType configured
    triggerNodes.forEach((node, idx) => {
      if (!node.config?.eventType) {
        errors.push(`TRIGGER node ${idx + 1} must have an event type configured`)
      }
    })

    // Validate graph structure
    const graphErrors = validateWorkflowGraph(backendNodes as any, backendEdges as any)
    errors.push(...graphErrors)

    return { valid: errors.length === 0, errors }
  }, [canvas.nodes, canvas.edges, workflowName])

  /**
   * Get backend node type from React Flow node
   */
  function getBackendNodeType(flowType: string | undefined, data: any): string {
    // If we stored the backend type in node data, use it
    if (data.nodeType) {
      return data.nodeType
    }

    // Fallback to guessing (for backward compatibility)
    if (flowType === "trigger") return "TRIGGER"
    if (flowType === "if") return data.cases ? "SWITCH" : "IF"
    if (flowType === "loop") return "LOOP"
    // For action nodes, use the actionType from config or default to SEND_EMAIL
    return data.actionType || "SEND_EMAIL"
  }

  /**
   * Handle workflow save
   */
  const handleSave = useCallback(async () => {
    // Validate first
    const validation = validateWorkflow()
    if (!validation.valid) {
      toast.error("Workflow validation failed", {
        description: validation.errors.join(", "),
      })
      return
    }

    // Convert to backend format
    const backendNodes = canvas.nodes.map((node) => ({
      id: node.id,
      type: getBackendNodeType(node.type, node.data),
      label: node.data.label || node.type,
      position: node.position,
      config: node.data,
    }))

    const backendEdges = canvas.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))

    // Save workflow
    if (workflowId === "new") {
      mutations.create.mutate({
        name: workflowName,
        isVisual: true,
        nodes: backendNodes as any,
        edges: backendEdges as any,
        isActive,
      })
    } else {
      mutations.update.mutate({
        id: workflowId,
        name: workflowName,
        nodes: backendNodes as any,
        edges: backendEdges as any,
        isActive,
      })
    }
  }, [
    workflowId,
    workflowName,
    isActive,
    canvas.nodes,
    canvas.edges,
    validateWorkflow,
    mutations,
  ])

  /**
   * Handle active toggle
   */
  const handleToggleActive = useCallback((active: boolean) => {
    setIsActive(active)
  }, [])

  /**
   * Calculate validation status
   */
  const validationStatus = useMemo(() => {
    const { valid, errors } = validateWorkflow()
    return {
      errorCount: valid ? 0 : errors.length,
      warningCount: 0, // Future: add warnings
    }
  }, [validateWorkflow])

  /**
   * Get selected node for config panel
   */
  const selectedNode = useMemo(() => {
    return canvas.nodes.find((n) => n.id === selectedNodeId)
  }, [canvas.nodes, selectedNodeId])

  // Loading state
  if (isLoading && workflowId !== "new") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">Failed to load workflow</p>
          <Button onClick={() => router.push("/admin/workflows")}>
            Back to Workflows
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Workflow Toolbar (top, fixed) */}
        <WorkflowToolbar
          workflowName={workflowName}
          isActive={isActive}
          errorCount={validationStatus.errorCount}
          warningCount={validationStatus.warningCount}
          isSaving={mutations.update.isPending || mutations.create.isPending}
          onNameChange={setWorkflowName}
          onSave={handleSave}
          onToggleActive={handleToggleActive}
        />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Node Palette (left sidebar, collapsible) */}
          <div
            className={cn(
              "relative border-r border-border bg-background transition-all duration-300",
              isPaletteOpen ? "w-[280px]" : "w-0"
            )}
          >
            {isPaletteOpen && (
              <NodePalette
                onNodeDragStart={(event, nodeType, defaultConfig) => {
                  // Handled by WorkflowCanvas onDropNode
                }}
              />
            )}

            {/* Toggle button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className={cn(
                "absolute -right-3 top-4 z-10",
                "h-6 w-6 rounded-full border border-border bg-background shadow-md",
                "hover:bg-accent"
              )}
              aria-label={isPaletteOpen ? "Close palette" : "Open palette"}
            >
              {isPaletteOpen ? (
                <ChevronLeft className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Workflow Canvas (center, full height) */}
          <div className="flex-1 relative">
            <WorkflowCanvas
              initialNodes={canvas.nodes}
              initialEdges={canvas.edges}
              nodeTypes={nodeTypes}
              onNodeSelect={handleNodeSelect}
              onNodesChange={canvas.onNodesChange}
              onEdgesChange={canvas.onEdgesChange}
              onConnect={canvas.onConnect}
              onDropNode={handleDropNode}
            />
          </div>

          {/* Node Config Panel (right, conditional) */}
          {selectedNode && (
            <NodeConfigPanel
              nodeId={selectedNode.id}
              nodeType={getBackendNodeType(selectedNode.type, selectedNode.data)}
              config={selectedNode.data}
              onSave={handleNodeConfigSave}
              onDelete={handleNodeDelete}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  )
}
