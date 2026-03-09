// ──────────────────────────────────────────────────────────────────────────────
// Linear workflow engine - original sequential executor
// Reads WorkflowActionRecord[] ORDER BY order - backward compatible
// ──────────────────────────────────────────────────────────────────────────────

import { logger } from '@/shared/logger'
import type { WorkflowActionRecord, WorkflowExecutionContext, ActionExecutionResult } from '../workflow.types'
import { substituteConfigVariables, executeAction } from './actions'
import { resolveContext } from './context'

const log = logger.child({ module: 'workflow.linear-engine' })

// Inngest step type - use any to avoid deep Inngest import chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InngestStep = any

/**
 * Run the linear workflow engine.
 *
 * Executes each action in order, honoring optional per-action delays.
 * All action executions are wrapped in step.run() for Inngest durability.
 * On failure, re-throws for Inngest retry semantics.
 *
 * @param actions - Ordered array of WorkflowActionRecord (from workflowActions table)
 * @param context - Execution context (triggerData + variables)
 * @param step    - Inngest step object for durability and delay support
 * @returns       - Array of ActionExecutionResult (one per action)
 */
export async function runLinearEngine(
  actions: WorkflowActionRecord[],
  context: WorkflowExecutionContext,
  step: InngestStep
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = []

  for (const action of actions) {
    const startedAt = new Date()

    // Per-action delay (ISO 8601 duration, e.g. "PT24H")
    const cfgDelay = (action.config as Record<string, unknown>)?.delay
    if (cfgDelay && typeof cfgDelay === 'string') {
      log.debug({ actionId: action.id, delay: cfgDelay }, 'Applying action delay')
      await step.sleep(`delay-${action.id}`, cfgDelay)
    }

    try {
      const enrichedConfig = substituteConfigVariables(action.config, context)
      const output = await step.run(`action-${action.id}`, () =>
        executeAction(action.actionType, enrichedConfig, resolveContext(context))
      )

      const completedAt = new Date()
      results.push({
        nodeId: action.id,
        nodeType: action.actionType,
        label: undefined,
        order: action.order,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        success: true,
        skipped: false,
        output: output ?? {},
      })
    } catch (err) {
      const completedAt = new Date()
      const error = err instanceof Error ? err.message : String(err)
      log.error({ actionId: action.id, actionType: action.actionType, error }, 'Action failed')

      results.push({
        nodeId: action.id,
        nodeType: action.actionType,
        label: undefined,
        order: action.order,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        success: false,
        skipped: false,
        error,
      })

      throw err  // re-throw for Inngest retry
    }
  }

  return results
}
