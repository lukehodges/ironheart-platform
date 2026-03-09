// ──────────────────────────────────────────────────────────────────────────────
// Execution context utilities - variable resolution, substitution, enrichment
// ──────────────────────────────────────────────────────────────────────────────

import type { WorkflowExecutionContext } from '../workflow.types'

/**
 * Flatten the execution context into a single data object for field resolution.
 * Resolution priority (highest → lowest):
 *   1. context.variables (SET_VARIABLE outputs)
 *   2. context.nodes.{nodeId}.output (specific node output)
 *   3. loopStack[-1] current item + index
 *   4. context.triggerData (enriched trigger data)
 */
export function resolveContext(ctx: WorkflowExecutionContext): Record<string, unknown> {
  const loopFrame = ctx.loopStack[ctx.loopStack.length - 1]
  return {
    // Namespaced access
    triggerData: ctx.triggerData,
    nodes: ctx.nodes,
    variables: ctx.variables,
    // Current loop item (if inside a loop)
    ...(loopFrame ? { [loopFrame.itemVariableName]: loopFrame.currentItem } : {}),
    ...(loopFrame?.indexVariableName ? { [loopFrame.indexVariableName]: loopFrame.currentIndex } : {}),
    // Convenience: top-level shortcuts (variables override triggerData on collision)
    ...ctx.triggerData,
    ...ctx.variables,
  }
}

/**
 * Resolve a dot-path field in a flat data object.
 * Returns undefined if any intermediate key is missing or null.
 */
export function resolveField(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split('.')
  let value: unknown = data
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

/**
 * Substitute all {{field}} tokens in a template string using the current context.
 * Missing fields are replaced with empty string.
 */
export function substituteVariables(
  template: string,
  ctx: WorkflowExecutionContext
): string {
  const flat = resolveContext(ctx)
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = resolveField(path.trim(), flat)
    return value != null ? String(value) : ''
  })
}

/**
 * Enrich trigger data with related booking/customer/staff/service info.
 * Uses dynamic import to avoid circular dependency with booking module.
 *
 * If bookingId is present in triggerData, attempts to load booking context
 * and flattens key fields to the top level for easy template access.
 */
export async function enrichTriggerData(
  tenantId: string,
  triggerData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const enriched = { ...triggerData }

  if (triggerData.bookingId) {
    try {
      const { bookingRepository } = await import('@/modules/booking/booking.repository')
      const booking = await bookingRepository.findById(
        tenantId,
        triggerData.bookingId as string
      )
      if (booking) {
        // Basic booking fields available from findById
        enriched.bookingDate = (booking.scheduledDate instanceof Date
          ? booking.scheduledDate.toISOString()
          : String(booking.scheduledDate ?? ''))
        enriched.bookingStatus = booking.status ?? ''
        // staffId / customerId available from booking record
        if (booking.staffId) enriched.staffId = booking.staffId
        if (booking.customerId) enriched.customerId = booking.customerId
      }
    } catch {
      // Enrichment is best-effort - do not fail workflow execution
    }
  }

  return enriched
}
