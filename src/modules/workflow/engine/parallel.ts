// ──────────────────────────────────────────────────────────────────────────────
// Parallel branch execution - handles IF/SWITCH → MERGE fan-out patterns
// ──────────────────────────────────────────────────────────────────────────────

import type { WorkflowExecutionContext, MergeNodeConfig } from '../workflow.types'

// Forward reference to GraphEngine to avoid circular dependency issues.
// The engine itself is imported at call time via the parameter.
export interface IGraphEngine {
  run(
    startNodeId: string,
    context: WorkflowExecutionContext,
    step: InngestStep
  ): Promise<WorkflowExecutionContext>
}

// Inngest step type - use any to avoid deep Inngest import chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InngestStep = any

/**
 * Execute multiple parallel branches that converge at a MERGE node.
 *
 * Behavior by merge mode:
 *   - 'wait_any': Race - first branch to complete wins; others abandoned
 *   - 'wait_all': All branches run concurrently; contexts deep-merged (last writer wins)
 *   - 'append':   All branches run concurrently; all outputs collected into mergedOutputs array
 *
 * @param engine              - GraphEngine instance (passed in to avoid circular dep)
 * @param branchStartNodeIds  - IDs of nodes to start each parallel branch from
 * @param mergeNodeId         - ID of the MERGE convergence node
 * @param mergeConfig         - MergeNodeConfig (mode, timeout)
 * @param context             - Execution context at point of fan-out
 * @param step                - Inngest step object for durability
 */
export async function executeParallelBranches(
  engine: IGraphEngine,
  branchStartNodeIds: string[],
  mergeNodeId: string,
  mergeConfig: MergeNodeConfig,
  context: WorkflowExecutionContext,
  step: InngestStep
): Promise<WorkflowExecutionContext> {
  if (mergeConfig.mode === 'wait_any') {
    // Race: first branch to reach MERGE wins; others are abandoned
    const result = await Promise.race(
      branchStartNodeIds.map(nodeId =>
        step.run(`branch-race-${nodeId}`, () => engine.run(nodeId, context, step))
      )
    )
    return result
  }

  // wait_all and append: execute all branches concurrently
  const results = await Promise.all(
    branchStartNodeIds.map(nodeId =>
      step.run(`branch-${nodeId}`, () => engine.run(nodeId, context, step))
    )
  )

  if (mergeConfig.mode === 'append') {
    return {
      ...context,
      nodes: {
        ...context.nodes,
        [mergeNodeId]: {
          output: { mergedOutputs: results.map(r => r.nodes) },
          success: true,
        },
      },
    }
  }

  // wait_all: deep-merge all contexts (last writer wins per key)
  return results.reduce(
    (acc, r) => ({
      ...acc,
      nodes: { ...acc.nodes, ...r.nodes },
      variables: { ...acc.variables, ...r.variables },
    }),
    context
  )
}
