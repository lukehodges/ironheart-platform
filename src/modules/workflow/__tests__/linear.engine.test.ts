import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runLinearEngine } from '../engine/linear.engine'
import type { WorkflowActionRecord, WorkflowExecutionContext } from '../workflow.types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../engine/actions', () => ({
  executeAction: vi.fn().mockResolvedValue({ success: true }),
  substituteConfigVariables: vi.fn((config: unknown) => config),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAction(
  id: string,
  order: number,
  config: Record<string, unknown> = {},
): WorkflowActionRecord {
  return {
    id,
    workflowId: 'wf-1',
    tenantId: 'tenant-1',
    actionType: 'SEND_EMAIL',
    config,
    order,
    createdAt: new Date(),
  }
}

const baseContext: WorkflowExecutionContext = {
  triggerData: { bookingId: 'b1', tenantId: 'tenant-1' },
  nodes: {},
  variables: {},
  loopStack: [],
  __workflowDepth: 0,
}

// Mock step object — simulates Inngest step interface
function makeStep() {
  return {
    run: vi.fn((id: string, fn: () => Promise<unknown>) => fn()),
    sleep: vi.fn().mockResolvedValue(undefined),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runLinearEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes actions in order', async () => {
    const { executeAction } = await import('../engine/actions')
    const callOrder: string[] = []
    vi.mocked(executeAction).mockImplementation(async (actionType, config, data) => {
      callOrder.push((config as Record<string, unknown>).__id as string)
      return { success: true }
    })

    const actions = [
      makeAction('action-1', 1, { __id: 'action-1' }),
      makeAction('action-2', 2, { __id: 'action-2' }),
      makeAction('action-3', 3, { __id: 'action-3' }),
    ]
    const step = makeStep()

    await runLinearEngine(actions, baseContext, step)

    expect(callOrder).toEqual(['action-1', 'action-2', 'action-3'])
  })

  it('returns ActionExecutionResult for each action', async () => {
    const { executeAction } = await import('../engine/actions')
    vi.mocked(executeAction).mockResolvedValue({ success: true })

    const actions = [
      makeAction('a1', 1),
      makeAction('a2', 2),
    ]
    const step = makeStep()

    const results = await runLinearEngine(actions, baseContext, step)

    expect(results).toHaveLength(2)
    expect(results[0].nodeId).toBe('a1')
    expect(results[1].nodeId).toBe('a2')
  })

  it('marks result as success=true on normal completion', async () => {
    const { executeAction } = await import('../engine/actions')
    vi.mocked(executeAction).mockResolvedValue({ success: true })

    const actions = [makeAction('a1', 1)]
    const step = makeStep()

    const results = await runLinearEngine(actions, baseContext, step)

    expect(results[0].success).toBe(true)
    expect(results[0].skipped).toBe(false)
    expect(results[0].nodeType).toBe('SEND_EMAIL')
  })

  it('marks result as success=false and re-throws on action error', async () => {
    const { executeAction } = await import('../engine/actions')
    vi.mocked(executeAction).mockRejectedValue(new Error('Email service unavailable'))

    const actions = [makeAction('a1', 1)]
    const step = makeStep()
    // step.run must propagate the error
    step.run.mockImplementation((_id: string, fn: () => Promise<unknown>) => fn())

    await expect(runLinearEngine(actions, baseContext, step)).rejects.toThrow(
      'Email service unavailable'
    )
  })

  it('calls step.sleep when action has delay configured', async () => {
    const { executeAction } = await import('../engine/actions')
    vi.mocked(executeAction).mockResolvedValue({ success: true })

    const action = makeAction('a1', 1, { delay: 'PT24H' })
    const step = makeStep()

    await runLinearEngine([action], baseContext, step)

    expect(step.sleep).toHaveBeenCalledWith('delay-a1', 'PT24H')
  })

  it('calls step.run for each action', async () => {
    const { executeAction } = await import('../engine/actions')
    vi.mocked(executeAction).mockResolvedValue({ success: true })

    const actions = [
      makeAction('a1', 1),
      makeAction('a2', 2),
    ]
    const step = makeStep()

    await runLinearEngine(actions, baseContext, step)

    expect(step.run).toHaveBeenCalledTimes(2)
    expect(step.run).toHaveBeenCalledWith('action-a1', expect.any(Function))
    expect(step.run).toHaveBeenCalledWith('action-a2', expect.any(Function))
  })
})
