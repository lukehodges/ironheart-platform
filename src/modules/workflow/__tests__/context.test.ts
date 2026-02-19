import { describe, it, expect } from 'vitest'
import { resolveContext, resolveField, substituteVariables } from '../engine/context'
import type { WorkflowExecutionContext } from '../workflow.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(
  triggerData: Record<string, unknown> = {},
  variables: Record<string, unknown> = {},
  loopStack: WorkflowExecutionContext['loopStack'] = [],
): WorkflowExecutionContext {
  return {
    triggerData,
    variables,
    nodes: {},
    loopStack,
    __workflowDepth: 0,
  }
}

// ---------------------------------------------------------------------------
// resolveField
// ---------------------------------------------------------------------------

describe('resolveField', () => {
  it('resolves top-level key', () => {
    const data = { bookingId: 'b-1', status: 'CONFIRMED' }
    expect(resolveField('bookingId', data)).toBe('b-1')
    expect(resolveField('status', data)).toBe('CONFIRMED')
  })

  it('resolves nested dot-path', () => {
    const data = { booking: { serviceId: 'svc-1', customer: { email: 'a@b.com' } } }
    expect(resolveField('booking.serviceId', data)).toBe('svc-1')
    expect(resolveField('booking.customer.email', data)).toBe('a@b.com')
  })

  it('returns undefined for missing path', () => {
    const data = { foo: 'bar' }
    expect(resolveField('missing', data)).toBeUndefined()
    expect(resolveField('foo.nested', data)).toBeUndefined()
  })

  it('handles null intermediate — returns undefined', () => {
    const data = { booking: null }
    expect(resolveField('booking.serviceId', data as Record<string, unknown>)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// substituteVariables
// ---------------------------------------------------------------------------

describe('substituteVariables', () => {
  it('replaces single {{variable}}', () => {
    const ctx = makeCtx({ name: 'Alice' })
    expect(substituteVariables('Hello {{name}}', ctx)).toBe('Hello Alice')
  })

  it('replaces multiple {{variables}} in one string', () => {
    const ctx = makeCtx({ first: 'John', last: 'Doe' })
    expect(substituteVariables('{{first}} {{last}}', ctx)).toBe('John Doe')
  })

  it('handles dot-path: {{customer.email}}', () => {
    const ctx = makeCtx({ customer: { email: 'test@test.com' } })
    expect(substituteVariables('{{customer.email}}', ctx)).toBe('test@test.com')
  })

  it('returns empty string for missing variable', () => {
    const ctx = makeCtx()
    expect(substituteVariables('Value: {{missing}}', ctx)).toBe('Value: ')
  })

  it('does not error on empty context', () => {
    const ctx = makeCtx()
    expect(() => substituteVariables('No tokens here', ctx)).not.toThrow()
    expect(substituteVariables('No tokens here', ctx)).toBe('No tokens here')
  })
})

// ---------------------------------------------------------------------------
// resolveContext — variable priority order
// ---------------------------------------------------------------------------

describe('resolveContext — variable priority order', () => {
  it('variables override triggerData on key collision', () => {
    const ctx = makeCtx(
      { bookingId: 'trigger-id' },
      { bookingId: 'variable-id' },
    )
    const flat = resolveContext(ctx)
    // variables spread last, so they win
    expect(flat.bookingId).toBe('variable-id')
  })

  it('exposes loop item when loopStack is non-empty', () => {
    const ctx = makeCtx(
      { tenantId: 't1' },
      {},
      [
        {
          sourceField: 'variables.items',
          items: ['a', 'b', 'c'],
          currentIndex: 0,
          currentItem: 'a',
          itemVariableName: 'item',
        },
      ],
    )
    const flat = resolveContext(ctx)
    expect(flat['item']).toBe('a')
  })

  it('exposes loop index when indexVariableName configured', () => {
    const ctx = makeCtx(
      {},
      {},
      [
        {
          sourceField: 'variables.items',
          items: [10, 20, 30],
          currentIndex: 2,
          currentItem: 30,
          itemVariableName: 'item',
          indexVariableName: 'idx',
        },
      ],
    )
    const flat = resolveContext(ctx)
    expect(flat['idx']).toBe(2)
  })

  it('returns triggerData at top level for convenience', () => {
    const ctx = makeCtx({ tenantId: 't-1', bookingId: 'b-1' })
    const flat = resolveContext(ctx)
    // Top-level shortcuts from ...ctx.triggerData spread
    expect(flat.tenantId).toBe('t-1')
    expect(flat.bookingId).toBe('b-1')
    // Namespaced access still works
    expect((flat.triggerData as Record<string, unknown>).tenantId).toBe('t-1')
  })
})
