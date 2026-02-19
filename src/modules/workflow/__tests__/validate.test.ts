import { describe, it, expect } from 'vitest'
import { validateWorkflowGraph, hasCycle } from '../engine/validate'
import type { WorkflowNode, WorkflowEdge } from '../workflow.types'

// ---------------------------------------------------------------------------
// Node / Edge factory helpers
// ---------------------------------------------------------------------------

function makeNode(
  id: string,
  type: WorkflowNode['type'],
  label?: string,
): WorkflowNode {
  return {
    id,
    type,
    label,
    position: { x: 0, y: 0 },
    config: {},
  }
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle = 'output',
): WorkflowEdge {
  return { id, source, target, sourceHandle }
}

// ---------------------------------------------------------------------------
// validateWorkflowGraph
// ---------------------------------------------------------------------------

describe('validateWorkflowGraph', () => {
  it('returns empty errors for a valid 2-node graph (TRIGGER → SEND_EMAIL)', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('e1', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('edge-1', 't1', 'e1', 'output'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors).toHaveLength(0)
  })

  it('returns error for zero TRIGGER nodes', () => {
    const nodes: WorkflowNode[] = [makeNode('e1', 'SEND_EMAIL')]
    const edges: WorkflowEdge[] = []
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('TRIGGER'))).toBe(true)
  })

  it('returns error for multiple TRIGGER nodes', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('t2', 'TRIGGER'),
      makeNode('e1', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('edge-1', 't1', 'e1'),
      makeEdge('edge-2', 't2', 'e1'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('TRIGGER'))).toBe(true)
  })

  it('returns error for edge referencing unknown source node', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('e1', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('bad-edge', 'nonexistent-node', 'e1'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('nonexistent-node'))).toBe(true)
  })

  it('returns error for edge referencing unknown target node', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('bad-edge', 't1', 'unknown-target'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('unknown-target'))).toBe(true)
  })

  it('returns error for orphan non-TRIGGER node (no incoming edges)', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('orphan', 'SEND_EMAIL', 'OrphanEmail'),
    ]
    const edges: WorkflowEdge[] = []  // no edges connecting orphan
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('OrphanEmail') || e.includes('no incoming'))).toBe(true)
  })

  it('returns error for structural cycle', () => {
    // A → B → C → A (cycle)
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('a', 'SEND_EMAIL', 'A'),
      makeNode('b', 'SEND_EMAIL', 'B'),
      makeNode('c', 'SEND_EMAIL', 'C'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 't1', 'a'),
      makeEdge('e2', 'a', 'b'),
      makeEdge('e3', 'b', 'c'),
      makeEdge('e4', 'c', 'a'), // cycle back to a
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('cycle'))).toBe(true)
  })

  it('returns error for IF node missing "true" edge', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('if1', 'IF', 'CheckStatus'),
      makeNode('e1', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e-trigger', 't1', 'if1'),
      // Only false edge — missing true edge
      makeEdge('e-false', 'if1', 'e1', 'false'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('true'))).toBe(true)
  })

  it('returns error for IF node missing "false" edge', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('if1', 'IF', 'CheckStatus'),
      makeNode('e1', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e-trigger', 't1', 'if1'),
      // Only true edge — missing false edge
      makeEdge('e-true', 'if1', 'e1', 'true'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('false'))).toBe(true)
  })

  it('returns error for LOOP node missing "item" edge', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('loop1', 'LOOP', 'MyLoop'),
      makeNode('body', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e-trigger', 't1', 'loop1'),
      // loop1 has edge to body but with wrong handle (not 'item')
      makeEdge('e-done', 'loop1', 'body', 'done'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('item'))).toBe(true)
  })

  it('returns error for SWITCH node with no case edges', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('sw1', 'SWITCH', 'RouteByStatus'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e-trigger', 't1', 'sw1'),
      // No edges from sw1
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('RouteByStatus') || e.includes('case'))).toBe(true)
  })

  it('returns error for WAIT_FOR_EVENT node missing "received" edge', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('wait1', 'WAIT_FOR_EVENT', 'WaitPayment'),
      makeNode('e1', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e-trigger', 't1', 'wait1'),
      // Only timeout edge — no "received" edge
      makeEdge('e-timeout', 'wait1', 'e1', 'timeout'),
    ]
    const errors = validateWorkflowGraph(nodes, edges)
    expect(errors.some(e => e.includes('received'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// hasCycle
// ---------------------------------------------------------------------------

describe('hasCycle', () => {
  it('returns false for a linear graph', () => {
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('a', 'SEND_EMAIL'),
      makeNode('b', 'SEND_SMS'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 't1', 'a'),
      makeEdge('e2', 'a', 'b'),
    ]
    expect(hasCycle(nodes, edges)).toBe(false)
  })

  it('returns true for a 3-node cycle', () => {
    const nodes: WorkflowNode[] = [
      makeNode('a', 'SEND_EMAIL'),
      makeNode('b', 'SEND_SMS'),
      makeNode('c', 'WEBHOOK'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'a', 'b'),
      makeEdge('e2', 'b', 'c'),
      makeEdge('e3', 'c', 'a'), // cycle
    ]
    expect(hasCycle(nodes, edges)).toBe(true)
  })

  it('does not flag LOOP→LOOP_END as a cycle', () => {
    // LOOP and LOOP_END nodes are excluded from cycle detection
    const nodes: WorkflowNode[] = [
      makeNode('t1', 'TRIGGER'),
      makeNode('loop1', 'LOOP'),
      makeNode('body', 'SEND_EMAIL'),
      makeNode('loopEnd', 'LOOP_END'),
      makeNode('done', 'SEND_SMS'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 't1', 'loop1'),
      makeEdge('e2', 'loop1', 'body', 'item'),
      makeEdge('e3', 'body', 'loopEnd'),
      // LOOP_END → LOOP is an intentional back-edge (excluded from cycle check)
      makeEdge('e4', 'loopEnd', 'loop1'),
      makeEdge('e5', 'loop1', 'done', 'done'),
    ]
    expect(hasCycle(nodes, edges)).toBe(false)
  })
})
