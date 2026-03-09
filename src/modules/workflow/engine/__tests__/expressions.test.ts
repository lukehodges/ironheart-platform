/**
 * Comprehensive tests for evaluateExpression
 *
 * evaluateExpression is a pure function after variable substitution.
 * It uses expr-eval (AST-based; no eval/Function) to parse arithmetic and
 * boolean expressions. On parse failure it returns the substituted string.
 *
 * Security invariant (I9): no member access, no eval(), no Function().
 */

import { describe, it, expect } from 'vitest'
import { evaluateExpression } from '../expressions'
import type { WorkflowExecutionContext } from '../../workflow.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal WorkflowExecutionContext with custom triggerData/variables.
 * Other fields are set to safe empty defaults.
 */
function makeCtx(
  triggerData: Record<string, unknown> = {},
  variables: Record<string, unknown> = {},
  nodes: WorkflowExecutionContext['nodes'] = {},
): WorkflowExecutionContext {
  return {
    triggerData,
    variables,
    nodes,
    loopStack: [],
    __workflowDepth: 0,
  }
}

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

describe('evaluateExpression - variable substitution', () => {
  it('substitutes a top-level {{field}} from triggerData', () => {
    const ctx = makeCtx({ greeting: 'Hello' })
    expect(evaluateExpression('{{greeting}}, world!', ctx)).toBe('Hello, world!')
  })

  it('substitutes {{customer.email}} via dot-path resolution', () => {
    const ctx = makeCtx({ customer: { email: 'alice@example.com' } })
    expect(evaluateExpression('{{customer.email}}', ctx)).toBe('alice@example.com')
  })

  it('substitutes {{booking.status}} from nested object', () => {
    const ctx = makeCtx({ booking: { status: 'CONFIRMED' } })
    expect(evaluateExpression('Status: {{booking.status}}', ctx)).toBe(
      'Status: CONFIRMED',
    )
  })

  it('replaces missing variable with empty string', () => {
    const ctx = makeCtx()
    expect(evaluateExpression('{{nonExistentField}}', ctx)).toBe('')
  })

  it('handles deeply nested path: {{a.b.c}}', () => {
    const ctx = makeCtx({ a: { b: { c: 'deep' } } })
    expect(evaluateExpression('value={{a.b.c}}', ctx)).toBe('value=deep')
  })

  it('substitutes multiple tokens in a single expression', () => {
    const ctx = makeCtx({ firstName: 'John', lastName: 'Doe' })
    const result = evaluateExpression('{{firstName}} {{lastName}}', ctx)
    expect(result).toBe('John Doe')
  })

  it('substitutes variables (SET_VARIABLE outputs) over triggerData', () => {
    // variables take precedence over triggerData on key collision
    const ctx = makeCtx({ price: '50' }, { price: '100' })
    // The substituted result '100' parses as arithmetic and returns number
    const result = evaluateExpression('{{price}}', ctx)
    expect(result).toBe(100)
  })

  it('returns empty string for undefined nested path mid-chain', () => {
    const ctx = makeCtx({ booking: null })
    expect(evaluateExpression('{{booking.status}}', ctx)).toBe('')
  })

  it('handles expression with no tokens as plain string', () => {
    const ctx = makeCtx()
    expect(evaluateExpression('no tokens here', ctx)).toBe('no tokens here')
  })

  it('substitutes numeric value as string in non-arithmetic context', () => {
    const ctx = makeCtx({ count: 7 })
    // '7 items' - after substitution it is '7 items', not parseable as pure number
    const result = evaluateExpression('{{count}} items', ctx)
    expect(result).toBe('7 items')
  })
})

// ---------------------------------------------------------------------------
// Arithmetic evaluation
// ---------------------------------------------------------------------------

describe('evaluateExpression - arithmetic', () => {
  it('"1 + 2" → 3', () => {
    expect(evaluateExpression('1 + 2', makeCtx())).toBe(3)
  })

  it('"10 - 4" → 6', () => {
    expect(evaluateExpression('10 - 4', makeCtx())).toBe(6)
  })

  it('"10 * 5" → 50', () => {
    expect(evaluateExpression('10 * 5', makeCtx())).toBe(50)
  })

  it('"100 / 4" → 25', () => {
    expect(evaluateExpression('100 / 4', makeCtx())).toBe(25)
  })

  it('"2 ^ 3" → 8 (exponentiation)', () => {
    expect(evaluateExpression('2 ^ 3', makeCtx())).toBe(8)
  })

  it('"10 % 3" → 1 (modulo)', () => {
    expect(evaluateExpression('10 % 3', makeCtx())).toBe(1)
  })

  it('floating-point arithmetic: "1.5 + 2.5" → 4', () => {
    expect(evaluateExpression('1.5 + 2.5', makeCtx())).toBe(4)
  })

  it('parentheses affect evaluation order: "(2 + 3) * 4" → 20', () => {
    expect(evaluateExpression('(2 + 3) * 4', makeCtx())).toBe(20)
  })

  it('returns a number (not string) for arithmetic expressions', () => {
    const result = evaluateExpression('7 * 8', makeCtx())
    expect(typeof result).toBe('number')
  })

  it('unary negation: "-5 + 10" → 5', () => {
    expect(evaluateExpression('-5 + 10', makeCtx())).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Post-substitution arithmetic
// ---------------------------------------------------------------------------

describe('evaluateExpression - post-substitution arithmetic', () => {
  it('{{booking.price}} * 1.2 → number', () => {
    const ctx = makeCtx({ booking: { price: 100 } })
    const result = evaluateExpression('{{booking.price}} * 1.2', ctx)
    expect(result).toBe(120)
  })

  it('{{qty}} * {{unitPrice}} → product', () => {
    const ctx = makeCtx({ qty: '3', unitPrice: '25' })
    const result = evaluateExpression('{{qty}} * {{unitPrice}}', ctx)
    expect(result).toBe(75)
  })

  it('{{total}} - {{discount}} → difference', () => {
    const ctx = makeCtx({ total: '200', discount: '30' })
    expect(evaluateExpression('{{total}} - {{discount}}', ctx)).toBe(170)
  })

  it('{{score}} ^ 2 → power', () => {
    const ctx = makeCtx({ score: '4' })
    expect(evaluateExpression('{{score}} ^ 2', ctx)).toBe(16)
  })

  it('missing variable combined with text causes parse failure → returns substituted string', () => {
    const ctx = makeCtx()
    // '{{missing}} items' becomes ' items' which is not valid arithmetic
    const result = evaluateExpression('{{missing}} items remaining', ctx)
    // Returns the substituted string (not a number)
    expect(typeof result).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Boolean / comparison expressions
// ---------------------------------------------------------------------------

describe('evaluateExpression - comparisons', () => {
  it('"5 > 3" → true', () => {
    expect(evaluateExpression('5 > 3', makeCtx())).toBe(true)
  })

  it('"3 > 5" → false', () => {
    expect(evaluateExpression('3 > 5', makeCtx())).toBe(false)
  })

  it('"2 == 2" → true', () => {
    expect(evaluateExpression('2 == 2', makeCtx())).toBe(true)
  })

  it('"2 == 3" → false', () => {
    expect(evaluateExpression('2 == 3', makeCtx())).toBe(false)
  })

  it('"1 != 2" → true', () => {
    expect(evaluateExpression('1 != 2', makeCtx())).toBe(true)
  })

  it('"2 != 2" → false', () => {
    expect(evaluateExpression('2 != 2', makeCtx())).toBe(false)
  })

  it('"5 >= 5" → true', () => {
    expect(evaluateExpression('5 >= 5', makeCtx())).toBe(true)
  })

  it('"4 >= 5" → false', () => {
    expect(evaluateExpression('4 >= 5', makeCtx())).toBe(false)
  })

  it('"3 <= 2" → false', () => {
    expect(evaluateExpression('3 <= 2', makeCtx())).toBe(false)
  })

  it('"2 <= 2" → true', () => {
    expect(evaluateExpression('2 <= 2', makeCtx())).toBe(true)
  })

  it('returns boolean (not string) for comparison results', () => {
    const result = evaluateExpression('10 > 1', makeCtx())
    expect(typeof result).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Logical operators
//
// expr-eval uses "and" / "or" / "not" keywords (not && / || / !).
// Expressions with && or || are not parseable and fall back to string.
// ---------------------------------------------------------------------------

describe('evaluateExpression - logical operators (expr-eval syntax)', () => {
  it('"true and false" → false', () => {
    expect(evaluateExpression('true and false', makeCtx())).toBe(false)
  })

  it('"true and true" → true', () => {
    expect(evaluateExpression('true and true', makeCtx())).toBe(true)
  })

  it('"true or false" → true', () => {
    expect(evaluateExpression('true or false', makeCtx())).toBe(true)
  })

  it('"false or false" → false', () => {
    expect(evaluateExpression('false or false', makeCtx())).toBe(false)
  })

  it('"not true" → false', () => {
    expect(evaluateExpression('not true', makeCtx())).toBe(false)
  })

  it('"not false" → true', () => {
    expect(evaluateExpression('not false', makeCtx())).toBe(true)
  })

  it('compound: "(1 > 0) and (2 > 1)" → true', () => {
    expect(evaluateExpression('(1 > 0) and (2 > 1)', makeCtx())).toBe(true)
  })

  it('compound: "(1 > 0) and (2 < 1)" → false', () => {
    expect(evaluateExpression('(1 > 0) and (2 < 1)', makeCtx())).toBe(false)
  })

  it('"&&" operator is not supported - falls back to string', () => {
    // expr-eval does not parse && - the expression is returned as a string
    const result = evaluateExpression('true && false', makeCtx())
    expect(typeof result).toBe('string')
  })

  it('"||" operator is not supported - falls back to string', () => {
    const result = evaluateExpression('true || false', makeCtx())
    expect(typeof result).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Ternary expression
// ---------------------------------------------------------------------------

describe('evaluateExpression - ternary', () => {
  it('"1 > 0 ? 10 : 20" → 10', () => {
    const result = evaluateExpression('1 > 0 ? 10 : 20', makeCtx())
    expect(result).toBe(10)
  })

  it('"0 > 1 ? 10 : 20" → 20', () => {
    const result = evaluateExpression('0 > 1 ? 10 : 20', makeCtx())
    expect(result).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Literal boolean values
// ---------------------------------------------------------------------------

describe('evaluateExpression - boolean literals', () => {
  it('"true" → boolean true', () => {
    expect(evaluateExpression('true', makeCtx())).toBe(true)
  })

  it('"false" → boolean false', () => {
    expect(evaluateExpression('false', makeCtx())).toBe(false)
  })

  it('"1 + 1" returns number, not boolean', () => {
    const result = evaluateExpression('1 + 1', makeCtx())
    expect(typeof result).toBe('number')
    expect(result).not.toBe(true)
  })
})

// ---------------------------------------------------------------------------
// String fallback - non-parseable expressions
// ---------------------------------------------------------------------------

describe('evaluateExpression - string fallback on parse failure', () => {
  it('returns substituted string for arbitrary text', () => {
    const result = evaluateExpression('hello world', makeCtx())
    expect(result).toBe('hello world')
  })

  it('returns empty string when single token is missing', () => {
    const result = evaluateExpression('{{noSuchField}}', makeCtx())
    expect(result).toBe('')
  })

  it('returns the raw string for expressions with commas (not arithmetic)', () => {
    const result = evaluateExpression('a, b, c', makeCtx())
    expect(typeof result).toBe('string')
  })

  it('returns string for email-like values', () => {
    const ctx = makeCtx({ email: 'user@example.com' })
    const result = evaluateExpression('{{email}}', ctx)
    // '@' makes it non-arithmetic; returns string
    expect(result).toBe('user@example.com')
  })

  it('returns string for URL-like values', () => {
    const ctx = makeCtx({ url: 'https://example.com/path' })
    const result = evaluateExpression('{{url}}', ctx)
    expect(typeof result).toBe('string')
    expect(result).toBe('https://example.com/path')
  })
})

// ---------------------------------------------------------------------------
// Security - invariant I9: no member access, no prototype leaks
// ---------------------------------------------------------------------------

describe('evaluateExpression - security (invariant I9)', () => {
  it('returns expression as string when member access is attempted (allowMemberAccess=false)', () => {
    const ctx = makeCtx()
    // expr-eval with allowMemberAccess=false will throw on obj.prop access
    // The catch block returns the substituted string
    const result = evaluateExpression('process.env', ctx)
    // Should NOT return process.env object; should return string
    expect(typeof result).toBe('string')
    expect(result).not.toBeTypeOf('object')
  })

  it('does not expose environment variables via expression', () => {
    const ctx = makeCtx()
    const result = evaluateExpression('process.env.NODE_ENV', ctx)
    // Must not return the actual env value - returns string or throws+falls back
    expect(typeof result).toBe('string')
    expect(result).not.toBe(process.env.NODE_ENV)
  })

  it('returns string for "constructor" access attempt', () => {
    const ctx = makeCtx()
    const result = evaluateExpression('constructor', ctx)
    expect(typeof result).toBe('string')
  })

  it('returns string for "prototype" keyword', () => {
    const ctx = makeCtx()
    const result = evaluateExpression('prototype', ctx)
    expect(typeof result).toBe('string')
  })

  it('does not evaluate arbitrary function calls', () => {
    const ctx = makeCtx()
    // expr-eval does not support user-defined function calls by default
    // Attempting to call an undefined function should fail gracefully
    const result = evaluateExpression('fetch("http://evil.com")', ctx)
    // Falls back to the string - no network call is made
    expect(typeof result).toBe('string')
  })

  it('NaN/Infinity from bad arithmetic is NOT returned as number (filtered)', () => {
    const ctx = makeCtx()
    // 0/0 in expr-eval results in NaN; the implementation filters NaN
    // So it falls back to the substituted string "0 / 0"
    const result = evaluateExpression('0 / 0', ctx)
    // Either returns NaN filtered as string, or the implementation returns
    // the string. The key invariant: NaN is not returned as a number.
    if (typeof result === 'number') {
      expect(Number.isNaN(result)).toBe(false)
    }
  })

  it('Infinity is NOT returned as a finite number', () => {
    const ctx = makeCtx()
    // 1 / 0 = Infinity in JavaScript; expr-eval may produce this
    const result = evaluateExpression('1 / 0', ctx)
    if (typeof result === 'number') {
      expect(Number.isFinite(result)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Node output resolution via context.nodes
// ---------------------------------------------------------------------------

describe('evaluateExpression - node output context', () => {
  it('resolves {{nodes.SendEmail_1.output.messageId}} from nodes context', () => {
    const ctx = makeCtx(
      {},
      {},
      {
        SendEmail_1: {
          output: { messageId: 'msg-abc' },
          success: true,
        },
      },
    )
    const result = evaluateExpression('{{nodes.SendEmail_1.output.messageId}}', ctx)
    expect(result).toBe('msg-abc')
  })
})

// ---------------------------------------------------------------------------
// Loop stack context
// ---------------------------------------------------------------------------

describe('evaluateExpression - loop stack context', () => {
  it('resolves loop item variable from loopStack', () => {
    const ctx: WorkflowExecutionContext = {
      triggerData: {},
      variables: {},
      nodes: {},
      loopStack: [
        {
          sourceField: 'variables.items',
          items: ['alpha', 'beta'],
          currentIndex: 0,
          currentItem: 'alpha',
          itemVariableName: 'item',
          indexVariableName: 'idx',
        },
      ],
      __workflowDepth: 0,
    }

    const result = evaluateExpression('{{item}}', ctx)
    expect(result).toBe('alpha')
  })

  it('resolves loop index variable from loopStack', () => {
    const ctx: WorkflowExecutionContext = {
      triggerData: {},
      variables: {},
      nodes: {},
      loopStack: [
        {
          sourceField: 'variables.items',
          items: ['x', 'y'],
          currentIndex: 1,
          currentItem: 'y',
          itemVariableName: 'item',
          indexVariableName: 'idx',
        },
      ],
      __workflowDepth: 0,
    }

    const result = evaluateExpression('{{idx}} + 1', ctx)
    expect(result).toBe(2)
  })
})
