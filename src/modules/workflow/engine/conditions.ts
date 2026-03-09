// ──────────────────────────────────────────────────────────────────────────────
// Condition evaluation - supports AND/OR nested groups
// ──────────────────────────────────────────────────────────────────────────────

import type { WorkflowCondition, WorkflowConditionGroup } from '../workflow.types'

/**
 * Evaluate a recursive AND/OR condition group against a flat data object.
 * Supports arbitrary nesting depth.
 */
export function evaluateConditionGroup(
  group: WorkflowConditionGroup,
  data: Record<string, unknown>
): boolean {
  if (group.logic === 'AND') {
    return group.conditions.every(c =>
      'logic' in c ? evaluateConditionGroup(c as WorkflowConditionGroup, data) : evaluateCondition(c as WorkflowCondition, data)
    )
  }
  return group.conditions.some(c =>
    'logic' in c ? evaluateConditionGroup(c as WorkflowConditionGroup, data) : evaluateCondition(c as WorkflowCondition, data)
  )
}

/**
 * Evaluate a single leaf condition.
 * Resolves the field via dot-path into data, then applies the operator.
 */
function evaluateCondition(cond: WorkflowCondition, data: Record<string, unknown>): boolean {
  const parts = cond.field.split('.')
  let value: unknown = data
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return false
    value = (value as Record<string, unknown>)[part]
  }
  switch (cond.operator) {
    case 'is_set':       return value != null && value !== ''
    case 'is_not_set':   return value == null || value === ''
    case 'equals':       return String(value) === cond.value
    case 'not_equals':   return String(value) !== cond.value
    case 'contains':     return String(value).includes(cond.value ?? '')
    case 'greater_than': return Number(value) > Number(cond.value)
    case 'less_than':    return Number(value) < Number(cond.value)
    default:             return false
  }
}

// Export for use in graph.engine.ts SWITCH node evaluation
export { evaluateCondition }
