// ──────────────────────────────────────────────────────────────────────────────
// Expression evaluator — AST-based safe parser
// Invariant I9: no eval(), no Function() constructor
// Uses expr-eval library (zero dependencies, 8KB minified, no member access)
// ──────────────────────────────────────────────────────────────────────────────

import { Parser } from 'expr-eval'
import type { WorkflowExecutionContext } from '../workflow.types'
import { substituteVariables } from './context'

const parser = new Parser({
  allowMemberAccess: false, // blocks obj.prop traversal — prevents prototype chain attacks
})

/**
 * Evaluate an expression string with variable substitution and safe arithmetic.
 *
 * Steps:
 *   1. Substitute all {{field}} tokens from context
 *   2. Try to parse + evaluate as math/boolean expression via AST
 *   3. On parse failure, return as string literal
 *
 * Supported: + - * / ^ % == != < > <= >= && || ! ternary
 * NOT supported (by design): function calls, property access, assignment
 */
export function evaluateExpression(
  expression: string,
  ctx: WorkflowExecutionContext
): string | number | boolean {
  // Step 1: substitute all {{field}} tokens from context
  const substituted = substituteVariables(expression, ctx)

  // Step 2: try AST parse + evaluate
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = parser.evaluate(substituted)
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) return result
    if (typeof result === 'boolean') return result
  } catch {
    // Not a parseable expression — return as string literal
  }

  return substituted
}
