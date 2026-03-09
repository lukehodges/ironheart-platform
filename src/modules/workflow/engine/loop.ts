// ──────────────────────────────────────────────────────────────────────────────
// Loop frame management - push/pop loop context for LOOP node execution
// ──────────────────────────────────────────────────────────────────────────────

import type { WorkflowExecutionContext, LoopNodeConfig } from '../workflow.types'

/**
 * Push a new loop frame onto the context's loopStack.
 * Returns a new context with the current iteration's item and index
 * exposed via the configured variable names.
 *
 * @param ctx - Parent context before this iteration
 * @param cfg - LOOP node configuration (itemVariableName, indexVariableName, etc.)
 * @param items - Full array being iterated
 * @param index - Current iteration index
 */
export function pushLoopFrame(
  ctx: WorkflowExecutionContext,
  cfg: LoopNodeConfig,
  items: unknown[],
  index: number
): WorkflowExecutionContext {
  const frame = {
    sourceField: cfg.sourceField,
    items,
    currentIndex: index,
    currentItem: items[index],
    itemVariableName: cfg.itemVariableName,
    indexVariableName: cfg.indexVariableName,
  }

  return {
    ...ctx,
    loopStack: [...ctx.loopStack, frame],
    // Expose the current item and index as named variables for convenience
    variables: {
      ...ctx.variables,
      [cfg.itemVariableName]: items[index],
      ...(cfg.indexVariableName ? { [cfg.indexVariableName]: index } : {}),
    },
  }
}

/**
 * Pop the innermost loop frame after an iteration completes.
 * Merges any new variables the loop body added back into the parent context,
 * but restores the parent's loopStack (removes the inner frame).
 *
 * @param result - Context after inner loop body executed
 * @param parent - Context that existed before pushLoopFrame was called
 */
export function popLoopFrame(
  result: WorkflowExecutionContext,
  parent: WorkflowExecutionContext
): WorkflowExecutionContext {
  return {
    ...result,
    // Restore parent's loopStack - removes the frame we pushed
    loopStack: parent.loopStack,
    // Merge any new node outputs produced in this iteration
    nodes: { ...parent.nodes, ...result.nodes },
    // Merge variables back (loop body may have SET_VARIABLE nodes)
    variables: { ...parent.variables, ...result.variables },
  }
}
