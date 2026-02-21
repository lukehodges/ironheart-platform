"use client"

import { useState, useCallback } from "react"
import { useNodesState, useEdgesState, addEdge, type Connection } from "reactflow"
import type { WorkflowCanvasState } from "@/types/workflow-builder"

/**
 * Workflow canvas state management hook
 *
 * Manages React Flow canvas state including nodes, edges, and node selection.
 * Provides callbacks for connecting nodes, adding nodes, updating node data, and deleting nodes.
 *
 * Features:
 * - useNodesState and useEdgesState from React Flow
 * - Node selection tracking
 * - Connection handling between nodes
 * - Node CRUD operations (add, update, delete)
 * - Returns all handlers needed for canvas integration
 *
 * @param initialNodes - Array of initial nodes (defaults to empty array)
 * @param initialEdges - Array of initial edges (defaults to empty array)
 *
 * @returns Object with nodes, edges, selectedNodeId, handlers, and state setters
 *
 * @example
 * ```tsx
 * const canvas = useWorkflowCanvas(initialNodes, initialEdges)
 *
 * <ReactFlow
 *   nodes={canvas.nodes}
 *   edges={canvas.edges}
 *   onNodesChange={canvas.onNodesChange}
 *   onEdgesChange={canvas.onEdgesChange}
 *   onConnect={canvas.onConnect}
 * >
 *   {canvas.nodes.map(node => (
 *     <div key={node.id} onClick={() => canvas.setSelectedNodeId(node.id)}>
 *       {node.data.label}
 *     </div>
 *   ))}
 * </ReactFlow>
 * ```
 */
export function useWorkflowCanvas(initialNodes = [], initialEdges = []) {
  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Selected node tracking
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  /**
   * Handle connection between two nodes
   * Uses React Flow's addEdge utility to create a new edge
   */
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  /**
   * Add a new node to the canvas
   * Generates a unique ID based on timestamp
   *
   * @param type - Node type (matches backend node types)
   * @param position - Canvas position {x, y}
   */
  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label: type },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  /**
   * Update data properties of a node
   * Merges provided data with existing node data
   *
   * @param nodeId - ID of the node to update
   * @param data - Partial data object to merge
   */
  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      )
    },
    [setNodes]
  )

  /**
   * Delete a node and all connected edges
   * Automatically removes edges where this node is source or target
   *
   * @param nodeId - ID of the node to delete
   */
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      )
    },
    [setNodes, setEdges]
  )

  return {
    // State
    nodes,
    edges,
    selectedNodeId,

    // State setters
    setSelectedNodeId,
    setNodes,
    setEdges,

    // React Flow handlers
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Node operations
    addNode,
    updateNodeData,
    deleteNode,
  }
}
