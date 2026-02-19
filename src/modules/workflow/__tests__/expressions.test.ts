import { describe, it, expect } from 'vitest'
import { evaluateExpression } from '../engine/expressions'
import type { WorkflowExecutionContext } from '../workflow.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(
  triggerData: Record<string, unknown> = {},
  variables: Record<string, unknown> = {},
): WorkflowExecutionContext {
  return {
    triggerData,
    variables,
    nodes: {},
    loopStack: [],
    __workflowDepth: 0,
  }
}

describe('evaluateExpression', () => {
  it('returns substituted string when non-arithmetic', () => {
    const ctx = makeCtx({ name: 'Alice' })
    const result = evaluateExpression('Hello, {{name}}!', ctx)
    expect(result).toBe('Hello, Alice!')
  })

  it('evaluates simple arithmetic: "2 + 3" → 5', () => {
    const ctx = makeCtx()
    const result = evaluateExpression('2 + 3', ctx)
    expect(result).toBe(5)
  })

  it('evaluates substituted arithmetic: "{{price}} * 1.2" → number', () => {
    const ctx = makeCtx({ price: '100' })
    const result = evaluateExpression('{{price}} * 1.2', ctx)
    expect(result).toBe(120)
  })

  it('returns boolean true for literal "true"', () => {
    const ctx = makeCtx()
    const result = evaluateExpression('true', ctx)
    expect(result).toBe(true)
  })

  it('returns boolean false for literal "false"', () => {
    const ctx = makeCtx()
    const result = evaluateExpression('false', ctx)
    expect(result).toBe(false)
  })

  it('returns empty string for missing variable reference', () => {
    const ctx = makeCtx()
    // {{missing}} → '' (empty string); '' is not arithmetic, returns ''
    const result = evaluateExpression('{{missingVar}}', ctx)
    expect(result).toBe('')
  })

  it('handles string concatenation via substitution', () => {
    const ctx = makeCtx({ firstName: 'John', lastName: 'Doe' })
    const result = evaluateExpression('{{firstName}} {{lastName}}', ctx)
    expect(result).toBe('John Doe')
  })
})
