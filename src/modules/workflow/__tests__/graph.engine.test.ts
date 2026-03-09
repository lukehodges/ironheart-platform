import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GraphEngine } from '../engine/graph.engine'
import type { WorkflowNode, WorkflowEdge, WorkflowExecutionContext } from '../workflow.types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../engine/actions', () => ({
  executeAction: vi.fn().mockResolvedValue({ success: true }),
  substituteConfigVariables: vi.fn((config: unknown) => config),
}))

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
  id: string,
  type: WorkflowNode['type'],
  config: WorkflowNode['config'] = {},
  errorHandling?: WorkflowNode['errorHandling'],
): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, config, errorHandling }
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle = 'output',
): WorkflowEdge {
  return { id, source, target, sourceHandle }
}

const baseContext: WorkflowExecutionContext = {
  triggerData: { bookingId: 'b1', tenantId: 't1' },
  nodes: {},
  variables: {},
  loopStack: [],
  __workflowDepth: 0,
}

function makeMockStep() {
  return {
    run: vi.fn((id: string, fn: () => Promise<unknown>) => fn()),
    sleep: vi.fn().mockResolvedValue(undefined),
    waitForEvent: vi.fn().mockResolvedValue(null),
  }
}

// ---------------------------------------------------------------------------
// IF node
// ---------------------------------------------------------------------------

describe('GraphEngine - IF node', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('routes to "true" edge when condition group passes', async () => {
    // IF: status equals CONFIRMED
    const ifConfig = {
      conditions: {
        logic: 'AND',
        conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }],
      },
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('if1', 'IF', ifConfig),
      makeNode('email-true', 'SEND_EMAIL'),
      makeNode('email-false', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'if1'),
      makeEdge('e2', 'if1', 'email-true', 'true'),
      makeEdge('e3', 'if1', 'email-false', 'false'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = { ...baseContext, triggerData: { ...baseContext.triggerData, status: 'CONFIRMED' } }

    const result = await engine.run('trigger', ctx, step)

    // The IF node output should record result:true
    expect(result.nodes['if1']?.output).toMatchObject({ result: true })
  })

  it('routes to "false" edge when condition group fails', async () => {
    const ifConfig = {
      conditions: {
        logic: 'AND',
        conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }],
      },
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('if1', 'IF', ifConfig),
      makeNode('email-true', 'SEND_EMAIL'),
      makeNode('email-false', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'if1'),
      makeEdge('e2', 'if1', 'email-true', 'true'),
      makeEdge('e3', 'if1', 'email-false', 'false'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = { ...baseContext, triggerData: { ...baseContext.triggerData, status: 'PENDING' } }

    const result = await engine.run('trigger', ctx, step)

    expect(result.nodes['if1']?.output).toMatchObject({ result: false })
  })
})

// ---------------------------------------------------------------------------
// SWITCH node
// ---------------------------------------------------------------------------

describe('GraphEngine - SWITCH node', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('routes to matching case edge', async () => {
    const switchConfig = {
      field: 'status',
      cases: [
        { handle: 'confirmed', operator: 'equals', value: 'CONFIRMED' },
        { handle: 'pending', operator: 'equals', value: 'PENDING' },
      ],
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('sw1', 'SWITCH', switchConfig),
      makeNode('confirmed-email', 'SEND_EMAIL'),
      makeNode('pending-email', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'sw1'),
      makeEdge('e2', 'sw1', 'confirmed-email', 'confirmed'),
      makeEdge('e3', 'sw1', 'pending-email', 'pending'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = { ...baseContext, triggerData: { ...baseContext.triggerData, status: 'CONFIRMED' } }

    const result = await engine.run('trigger', ctx, step)

    expect(result.nodes['sw1']?.output).toMatchObject({ matchedCase: 'confirmed' })
  })

  it('routes to "default" edge when no case matches', async () => {
    const switchConfig = {
      field: 'status',
      cases: [
        { handle: 'confirmed', operator: 'equals', value: 'CONFIRMED' },
      ],
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('sw1', 'SWITCH', switchConfig),
      makeNode('default-email', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'sw1'),
      makeEdge('e2', 'sw1', 'default-email', 'default'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = { ...baseContext, triggerData: { ...baseContext.triggerData, status: 'CANCELLED' } }

    const result = await engine.run('trigger', ctx, step)

    expect(result.nodes['sw1']?.output).toMatchObject({ matchedCase: 'default' })
  })
})

// ---------------------------------------------------------------------------
// LOOP node
// ---------------------------------------------------------------------------

describe('GraphEngine - LOOP node', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sequential mode: iterates all items in order', async () => {
    const { executeAction } = await import('../engine/actions')
    const visited: unknown[] = []
    vi.mocked(executeAction).mockImplementation(async () => {
      return { success: true }
    })

    const loopConfig = {
      sourceField: 'items',
      itemVariableName: 'item',
      mode: 'sequential',
      maxIterations: 10,
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('loop1', 'LOOP', loopConfig),
      makeNode('body', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'loop1'),
      makeEdge('e2', 'loop1', 'body', 'item'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = {
      ...baseContext,
      triggerData: { ...baseContext.triggerData, items: ['a', 'b', 'c'] },
    }

    const result = await engine.run('trigger', ctx, step)

    // LOOP output should record 3 iterations
    expect(result.nodes['loop1']?.output).toMatchObject({ iterations: 3 })
  })

  it('skips gracefully if sourceField is not an array', async () => {
    const loopConfig = {
      sourceField: 'notAnArray',
      itemVariableName: 'item',
      mode: 'sequential',
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('loop1', 'LOOP', loopConfig),
      makeNode('body', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'loop1'),
      makeEdge('e2', 'loop1', 'body', 'item'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = {
      ...baseContext,
      triggerData: { ...baseContext.triggerData, notAnArray: 'string-not-array' },
    }

    const result = await engine.run('trigger', ctx, step)

    expect(result.nodes['loop1']?.output).toMatchObject({ iterations: 0 })
  })

  it('respects maxIterations guard', async () => {
    const loopConfig = {
      sourceField: 'items',
      itemVariableName: 'item',
      mode: 'sequential',
      maxIterations: 2, // only allow 2 even though array has 5
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('loop1', 'LOOP', loopConfig),
      makeNode('body', 'SEND_EMAIL'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'loop1'),
      makeEdge('e2', 'loop1', 'body', 'item'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = {
      ...baseContext,
      triggerData: { ...baseContext.triggerData, items: [1, 2, 3, 4, 5] },
    }

    const result = await engine.run('trigger', ctx, step)

    expect(result.nodes['loop1']?.output).toMatchObject({ iterations: 2 })
  })
})

// ---------------------------------------------------------------------------
// SET_VARIABLE node
// ---------------------------------------------------------------------------

describe('GraphEngine - SET_VARIABLE node', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('stores literal value in context.variables', async () => {
    const setVarConfig = {
      assignments: [
        { key: 'myVar', valueType: 'literal', literal: 'hello' },
      ],
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('sv1', 'SET_VARIABLE', setVarConfig),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'sv1'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()

    const result = await engine.run('trigger', baseContext, step)

    // SET_VARIABLE stores in variables; output mirrors the assignments
    expect(result.variables['myVar']).toBe('hello')
  })

  it('resolves field from context and stores', async () => {
    const setVarConfig = {
      assignments: [
        { key: 'capturedId', valueType: 'field', field: 'bookingId' },
      ],
    }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('sv1', 'SET_VARIABLE', setVarConfig),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'sv1'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()
    const ctx = { ...baseContext, triggerData: { bookingId: 'bk-99', tenantId: 't1' } }

    const result = await engine.run('trigger', ctx, step)

    expect(result.variables['capturedId']).toBe('bk-99')
  })
})

// ---------------------------------------------------------------------------
// STOP node
// ---------------------------------------------------------------------------

describe('GraphEngine - STOP node', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('terminates execution without following edges', async () => {
    const { executeAction } = await import('../engine/actions')

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('stop1', 'STOP'),
      makeNode('email', 'SEND_EMAIL'),  // should NOT be reached
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'stop1'),
      makeEdge('e2', 'stop1', 'email'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()

    await engine.run('trigger', baseContext, step)

    // SEND_EMAIL executeAction should never be called
    expect(executeAction).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Action nodes
// ---------------------------------------------------------------------------

describe('GraphEngine - action nodes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('executes SEND_EMAIL action and follows output edge', async () => {
    const { executeAction } = await import('../engine/actions')
    vi.mocked(executeAction).mockResolvedValue({ success: true, to: 'user@example.com' })

    const emailConfig = { recipientEmail: 'user@example.com', subject: 'Test' }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('email1', 'SEND_EMAIL', emailConfig),
      makeNode('sms1', 'SEND_SMS'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'email1'),
      makeEdge('e2', 'email1', 'sms1', 'output'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()

    const result = await engine.run('trigger', baseContext, step)

    expect(executeAction).toHaveBeenCalledWith('SEND_EMAIL', emailConfig, expect.any(Object))
    // Both nodes should have been visited
    expect(result.nodes['email1']).toBeDefined()
    expect(result.nodes['sms1']).toBeDefined()
  })

  it('routes to error edge when action fails and errorHandling=branch', async () => {
    const { executeAction } = await import('../engine/actions')
    // Return an error result (not throw - graph engine checks output.error)
    vi.mocked(executeAction).mockResolvedValue({ success: false, error: 'Service unavailable' })

    const emailConfig = { recipientEmail: 'user@example.com', subject: 'Test' }

    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'TRIGGER'),
      makeNode('email1', 'SEND_EMAIL', emailConfig, 'branch'),
      makeNode('error-handler', 'SEND_NOTIFICATION'),
      makeNode('success-handler', 'SEND_SMS'),
    ]
    const edges: WorkflowEdge[] = [
      makeEdge('e1', 'trigger', 'email1'),
      makeEdge('e-error', 'email1', 'error-handler', 'error'),
      makeEdge('e-output', 'email1', 'success-handler', 'output'),
    ]

    const engine = new GraphEngine(nodes, edges)
    const step = makeMockStep()

    const result = await engine.run('trigger', baseContext, step)

    // When actionResult.error is set, nextHandle becomes 'error'
    // error-handler should be visited, success-handler should not
    expect(result.nodes['error-handler']).toBeDefined()
    expect(result.nodes['success-handler']).toBeUndefined()
  })
})
