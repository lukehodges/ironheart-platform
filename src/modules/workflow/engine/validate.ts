// ──────────────────────────────────────────────────────────────────────────────
// Graph validation - structural checks before saving a graph-mode workflow
// ──────────────────────────────────────────────────────────────────────────────

import type { WorkflowNode, WorkflowEdge } from '../workflow.types'

/**
 * Validate a workflow graph before saving.
 * Returns an array of human-readable error strings (empty = valid).
 *
 * Checks performed:
 *   1. Exactly one TRIGGER node
 *   2. All edge source/target references are valid node IDs
 *   3. No orphan non-TRIGGER nodes (every non-TRIGGER must have ≥1 incoming edge)
 *   4. No structural cycles (LOOP back-edges are excluded)
 *   5. IF nodes must have both "true" and "false" edges
 *   6. SWITCH nodes must have at least one case edge
 *   7. LOOP nodes must have an "item" edge (loop body)
 *   8. WAIT_FOR_EVENT nodes must have a "received" edge
 */
export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] {
  const errors: string[] = []
  const nodeIds = new Set(nodes.map(n => n.id))

  // 1. Exactly one TRIGGER node
  const triggers = nodes.filter(n => n.type === 'TRIGGER')
  if (triggers.length !== 1) errors.push('Workflow must have exactly one TRIGGER node')

  // 2. All edge references are valid node IDs
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references unknown source node ${edge.source}`)
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references unknown target node ${edge.target}`)
    }
  }

  // 3. No orphan non-TRIGGER nodes (every non-TRIGGER must have at least one incoming edge)
  const hasIncoming = new Set(edges.map(e => e.target))
  for (const node of nodes.filter(n => n.type !== 'TRIGGER')) {
    if (!hasIncoming.has(node.id)) {
      errors.push(`Node "${node.label ?? node.id}" (${node.type}) has no incoming connections`)
    }
  }

  // 4. No structural cycles (DFS - LOOP back-edges are excluded from cycle check)
  if (hasCycle(nodes, edges)) {
    errors.push('Workflow graph contains a cycle (use LOOP node for iteration)')
  }

  // 5. IF nodes must have both "true" and "false" edges
  for (const node of nodes.filter(n => n.type === 'IF')) {
    const handles = edges.filter(e => e.source === node.id).map(e => e.sourceHandle)
    if (!handles.includes('true')) {
      errors.push(`IF node "${node.label ?? node.id}" missing "true" branch`)
    }
    if (!handles.includes('false')) {
      errors.push(`IF node "${node.label ?? node.id}" missing "false" branch`)
    }
  }

  // 6. SWITCH nodes must have at least one case edge
  for (const node of nodes.filter(n => n.type === 'SWITCH')) {
    if (!edges.some(e => e.source === node.id)) {
      errors.push(`SWITCH node "${node.label ?? node.id}" has no case edges`)
    }
  }

  // 7. LOOP nodes must have an "item" edge
  for (const node of nodes.filter(n => n.type === 'LOOP')) {
    if (!edges.some(e => e.source === node.id && e.sourceHandle === 'item')) {
      errors.push(`LOOP node "${node.label ?? node.id}" missing "item" edge (loop body)`)
    }
  }

  // 8. WAIT_FOR_EVENT nodes must specify a "received" edge
  for (const node of nodes.filter(n => n.type === 'WAIT_FOR_EVENT')) {
    if (!edges.some(e => e.source === node.id && e.sourceHandle === 'received')) {
      errors.push(`WAIT_FOR_EVENT node "${node.label ?? node.id}" missing "received" edge`)
    }
  }

  return errors
}

/**
 * Detect structural cycles in the workflow graph using iterative DFS.
 *
 * LOOP/LOOP_END edges are intentional back-edges and are excluded from this check.
 * Standard DFS with two sets:
 *   - visited: nodes whose full subtree has been explored (complete)
 *   - inStack: nodes currently on the DFS exploration path
 * If we reach a node that is already in inStack, a cycle exists.
 */
export function hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  // Build adjacency list, excluding edges from LOOP and LOOP_END nodes
  // (these are intentional back-edges for iteration)
  const loopNodeIds = new Set(
    nodes.filter(n => n.type === 'LOOP' || n.type === 'LOOP_END').map(n => n.id)
  )

  const adjacency = new Map<string, string[]>()
  for (const node of nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of edges) {
    if (!loopNodeIds.has(edge.source)) {
      adjacency.get(edge.source)?.push(edge.target)
    }
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true   // cycle detected
    if (visited.has(nodeId)) return false  // already fully explored - safe

    inStack.add(nodeId)
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true
    }
    inStack.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }

  return false
}
