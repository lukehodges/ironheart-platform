// ──────────────────────────────────────────────────────────────────────────────
// Workflow Service - CRUD, graph validation, and workflow execution orchestration
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { NotFoundError, ValidationError } from '@/shared/errors'
import type { Context } from '@/shared/trpc'
import { workflowRepository } from './workflow.repository'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowConditionGroup,
  WorkflowCondition,
  WorkflowExecutionContext,
} from './workflow.types'
import type {
  createWorkflowSchema,
  updateWorkflowSchema,
  listWorkflowsSchema,
} from './workflow.schemas'
import { validateWorkflowGraph } from './engine/validate'
import { enrichTriggerData } from './engine/context'
import { GraphEngine } from './engine/graph.engine'
import { runLinearEngine } from './engine/linear.engine'

const log = logger.child({ module: 'workflow.service' })

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a conditions field: if it's a flat WorkflowCondition[],
 * wrap it in an AND group for backward compatibility.
 */
function normalizeConditions(
  conditions: WorkflowConditionGroup | WorkflowCondition[] | null | undefined
): WorkflowConditionGroup | null {
  if (!conditions) return null
  if (Array.isArray(conditions)) {
    return { logic: 'AND', conditions }
  }
  return conditions
}

/**
 * Create the initial WorkflowExecutionContext for a new execution.
 */
function createInitialContext(
  triggerData: Record<string, unknown>,
  depth: number
): WorkflowExecutionContext {
  return {
    triggerData,
    nodes: {},
    variables: {},
    loopStack: [],
    __workflowDepth: depth,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export const workflowService = {

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  async listWorkflows(
    ctx: Context,
    input: z.infer<typeof listWorkflowsSchema>
  ) {
    log.info({ tenantId: ctx.tenantId, input }, 'listWorkflows called')
    return workflowRepository.listByTenant(ctx.tenantId, {
      triggerEvent: input.triggerEvent,
      isActive: input.isActive,
      limit: input.limit,
      cursor: input.cursor,
    })
  },

  async getWorkflow(ctx: Context, workflowId: string) {
    log.info({ tenantId: ctx.tenantId, workflowId }, 'getWorkflow called')
    const workflow = await workflowRepository.findById(ctx.tenantId, workflowId)
    if (!workflow) throw new NotFoundError('Workflow', workflowId)
    return workflow
  },

  async createWorkflow(
    ctx: Context,
    input: z.infer<typeof createWorkflowSchema>
  ) {
    log.info({ tenantId: ctx.tenantId, name: input.name }, 'createWorkflow called')

    // If graph mode, validate before saving
    if (input.isVisual && input.nodes && input.edges) {
      const nodes = input.nodes as WorkflowNode[]
      const edges = input.edges as WorkflowEdge[]

      // Validate graph structure
      const errors = validateWorkflowGraph(nodes, edges)
      if (errors.length > 0) {
        throw new ValidationError(`Workflow graph validation failed: ${errors.join('; ')}`)
      }

      // Validate at least one TRIGGER node exists
      const triggerNodes = nodes.filter(n => n.type === 'TRIGGER')
      if (triggerNodes.length === 0) {
        throw new ValidationError('Visual workflows must have at least one TRIGGER node')
      }

      // Validate each TRIGGER node has eventType configured
      triggerNodes.forEach((node, idx) => {
        const config = node.config as any
        if (!config?.eventType) {
          throw new ValidationError(`TRIGGER node ${idx + 1} must have an eventType configured in its config`)
        }
      })
    }

    return workflowRepository.create(ctx.tenantId, {
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
      isVisual: input.isVisual ?? false,
      conditions: input.conditions
        ? normalizeConditions(input.conditions as WorkflowConditionGroup | WorkflowCondition[])
        : null,
      delay: input.delay ?? null,
      nodes: input.nodes ? (input.nodes as WorkflowNode[]) : null,
      edges: input.edges ? (input.edges as WorkflowEdge[]) : null,
    })
  },

  async updateWorkflow(
    ctx: Context,
    workflowId: string,
    input: z.infer<typeof updateWorkflowSchema>
  ) {
    log.info({ tenantId: ctx.tenantId, workflowId }, 'updateWorkflow called')

    // Ensure workflow exists and belongs to this tenant
    const existing = await workflowRepository.findById(ctx.tenantId, workflowId)
    if (!existing) throw new NotFoundError('Workflow', workflowId)

    // Validate graph if updating nodes/edges
    if (input.nodes && input.edges) {
      const nodes = input.nodes as WorkflowNode[]
      const edges = input.edges as WorkflowEdge[]

      // Validate graph structure
      const errors = validateWorkflowGraph(nodes, edges)
      if (errors.length > 0) {
        throw new ValidationError(`Workflow graph validation failed: ${errors.join('; ')}`)
      }

      // Validate TRIGGER nodes (if this is or will be a visual workflow)
      const isVisual = input.isVisual ?? existing.isVisual
      if (isVisual) {
        const triggerNodes = nodes.filter(n => n.type === 'TRIGGER')

        // Validate each TRIGGER node has eventType configured
        triggerNodes.forEach((node, idx) => {
          const config = node.config as any
          if (!config?.eventType) {
            throw new ValidationError(`TRIGGER node ${idx + 1} must have an eventType configured in its config`)
          }
        })
      }
    }

    return workflowRepository.update(ctx.tenantId, workflowId, {
      name: input.name,
      description: input.description,
      isActive: input.isActive,
      isVisual: input.isVisual,
      conditions: input.conditions !== undefined
        ? normalizeConditions(input.conditions as WorkflowConditionGroup | WorkflowCondition[] | null)
        : undefined,
      delay: input.delay,
      nodes: input.nodes ? (input.nodes as WorkflowNode[]) : (input.nodes === null ? null : undefined),
      edges: input.edges ? (input.edges as WorkflowEdge[]) : (input.edges === null ? null : undefined),
    })
  },

  async deleteWorkflow(ctx: Context, workflowId: string) {
    log.info({ tenantId: ctx.tenantId, workflowId }, 'deleteWorkflow called')

    const existing = await workflowRepository.findById(ctx.tenantId, workflowId)
    if (!existing) throw new NotFoundError('Workflow', workflowId)

    await workflowRepository.softDelete(ctx.tenantId, workflowId)
    return { deleted: true, id: workflowId }
  },

  // ---------------------------------------------------------------------------
  // Execution history
  // ---------------------------------------------------------------------------

  async getExecutionDetail(ctx: Context, executionId: string) {
    log.info({ tenantId: ctx.tenantId, executionId }, 'getExecutionDetail called')
    const result = await workflowRepository.findExecutionById(ctx.tenantId, executionId)
    if (!result) throw new NotFoundError('WorkflowExecution', executionId)

    const { workflowName, ...execution } = result

    // Compute duration in milliseconds from startedAt/completedAt
    let durationMs: number | null = null
    if (execution.startedAt && execution.completedAt) {
      durationMs = execution.completedAt.getTime() - execution.startedAt.getTime()
    }

    return {
      ...execution,
      workflowName,
      durationMs,
    }
  },

  async getExecutionHistory(
    ctx: Context,
    opts: { workflowId?: string; limit: number; cursor?: string }
  ) {
    log.info({ tenantId: ctx.tenantId, opts }, 'getExecutionHistory called')
    return workflowRepository.listExecutions(ctx.tenantId, {
      workflowId: opts.workflowId,
      limit: opts.limit,
      cursor: opts.cursor,
    })
  },

  // ---------------------------------------------------------------------------
  // Graph validation (exposed as tRPC procedure)
  // ---------------------------------------------------------------------------

  async validateGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<string[]> {
    return validateWorkflowGraph(nodes, edges)
  },

  // ---------------------------------------------------------------------------
  // Workflow execution (called from workflow.events.ts Inngest function)
  // ---------------------------------------------------------------------------

  /**
   * Execute a workflow triggered by an Inngest event.
   *
   * Steps:
   * 1. Load workflow record from DB
   * 2. Check __workflowDepth loop prevention (max 3)
   * 3. Enrich trigger data with booking/customer context
   * 4. Idempotency check via findExecution
   * 5. Record execution start (status = 'running')
   * 6. Route to GraphEngine (isVisual=true) or LinearEngine (isVisual=false)
   * 7. Update execution record with final status and results
   * 8. Emit workflow/completed event if correlationId present (EXECUTE_WORKFLOW sync mode)
   */
  async executeWorkflow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    step: any,
    event: {
      data: {
        workflowId: string
        tenantId: string
        triggerEvent: string
        triggerData: Record<string, unknown>
      }
    }
  ): Promise<void> {
    const { workflowId, tenantId, triggerEvent, triggerData } = event.data

    log.info({ workflowId, tenantId, triggerEvent }, 'executeWorkflow called')

    // Step 1: Load workflow
    const workflow = await step.run('load-workflow', async () => {
      const wf = await workflowRepository.findById(tenantId, workflowId)
      if (!wf) throw new NotFoundError('Workflow', workflowId)
      if (!wf.isActive) {
        log.info({ workflowId }, 'Workflow is inactive - skipping')
        return null
      }
      return wf
    })

    if (!workflow) return

    // Step 2: Loop prevention - check __workflowDepth
    const depth = (triggerData.__workflowDepth ?? 0) as number
    if (depth >= 3) {
      log.warn({ workflowId, depth }, 'Workflow depth limit reached - halting execution')
      return
    }

    // Step 3: Enrich trigger data
    const enriched = await step.run('enrich-trigger-data', async () => {
      return enrichTriggerData(tenantId, { ...triggerData, tenantId, __workflowDepth: depth + 1 })
    })

    // Step 4: Idempotency check
    const bookingId = enriched.bookingId as string | undefined
    if (bookingId) {
      const existing = await step.run('check-idempotency', async () => {
        return workflowRepository.findExecution(workflowId, triggerEvent, bookingId)
      })
      if (existing && existing.status === 'completed') {
        log.info({ workflowId, bookingId }, 'Workflow already completed for this booking - skipping')
        return
      }
    }

    // Step 5: Record execution start
    const execution = await step.run('record-execution-start', async () => {
      return workflowRepository.recordExecution({
        workflowId,
        tenantId,
        triggerEvent,
        triggerData: enriched,
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
        actionResults: null,
        error: null,
      })
    })

    const executionId = execution.id
    const correlationId = triggerData.__correlationId as string | undefined

    // Build initial execution context
    const context = createInitialContext(enriched, depth + 1)

    let finalStatus: 'completed' | 'failed' = 'completed'
    let finalError: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let actionResults: any[] = []

    try {
      // Step 6: Route to appropriate engine
      if (workflow.isVisual && workflow.nodes && workflow.edges) {
        // Graph mode
        const engine = new GraphEngine(workflow.nodes, workflow.edges)

        // Find the TRIGGER node that matches this event
        const { findMatchingTrigger } = await import('./engine/graph.engine')
        const triggerNode = findMatchingTrigger(workflow.nodes, triggerEvent, enriched)

        if (!triggerNode) {
          log.info({ workflowId, triggerEvent }, 'No matching TRIGGER node found for this event - skipping')
          await workflowRepository.updateExecution(executionId, {
            status: 'completed',
            completedAt: new Date(),
            actionResults: [],
          })
          return
        }

        const finalContext = await engine.run(triggerNode.id, context, step)

        // Collect node execution results for audit log
        actionResults = Object.entries(finalContext.nodes).map(([nodeId, nodeResult]) => ({
          nodeId,
          success: nodeResult.success,
          output: nodeResult.output,
          skipped: nodeResult.skipped ?? false,
        }))
      } else {
        // Linear mode
        const actions = await step.run('load-actions', async () => {
          return workflowRepository.findActionsByWorkflowId(workflowId)
        })

        // Check workflow-level conditions before running actions
        if (workflow.conditions) {
          const { evaluateConditionGroup } = await import('./engine/conditions')
          const group = normalizeConditions(workflow.conditions)
          if (group) {
            const { resolveContext } = await import('./engine/context')
            const shouldRun = evaluateConditionGroup(group, resolveContext(context))
            if (!shouldRun) {
              log.info({ workflowId }, 'Workflow conditions not met - skipping execution')
              await workflowRepository.updateExecution(executionId, {
                status: 'completed',
                completedAt: new Date(),
                actionResults: [],
              })
              return
            }
          }
        }

        actionResults = await runLinearEngine(actions, context, step)
      }
    } catch (err) {
      finalStatus = 'failed'
      finalError = err instanceof Error ? err.message : String(err)
      log.error({ workflowId, executionId, error: finalError }, 'Workflow execution failed')
    }

    // Step 7: Update execution record
    await step.run('record-execution-complete', async () => {
      return workflowRepository.updateExecution(executionId, {
        status: finalStatus,
        completedAt: new Date(),
        actionResults,
        error: finalError ?? undefined,
      })
    })

    // Step 8: Emit workflow/completed event for EXECUTE_WORKFLOW sync mode
    if (correlationId) {
      await step.run('emit-workflow-completed', async () => {
        return inngest.send({
          name: 'workflow/completed',
          data: {
            workflowId,
            executionId,
            correlationId,
            tenantId,
            success: finalStatus === 'completed',
            output: actionResults.length > 0 ? { results: actionResults } : undefined,
          },
        })
      })
    }

    log.info({ workflowId, executionId, status: finalStatus }, 'Workflow execution complete')
  },
}
