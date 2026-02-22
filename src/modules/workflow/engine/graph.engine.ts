// ──────────────────────────────────────────────────────────────────────────────
// Graph workflow engine — full directed-graph executor
// Supports: IF, SWITCH, MERGE, LOOP, WAIT_FOR_EVENT, WAIT_UNTIL,
//           SET_VARIABLE, FILTER, TRANSFORM, EXECUTE_WORKFLOW + 7 action nodes
// ──────────────────────────────────────────────────────────────────────────────

import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  WorkflowActionType,
  IfNodeConfig,
  SwitchNodeConfig,
  LoopNodeConfig,
  WaitForEventNodeConfig,
  WaitUntilNodeConfig,
  SetVariableNodeConfig,
  FilterNodeConfig,
  TransformNodeConfig,
  ExecuteWorkflowNodeConfig,
  MergeNodeConfig,
} from '../workflow.types'
import { evaluateConditionGroup, evaluateCondition } from './conditions'
import { resolveContext, resolveField } from './context'
import { evaluateExpression } from './expressions'
import { applyTransform } from './transforms'
import { substituteConfigVariables, executeAction } from './actions'
import { pushLoopFrame, popLoopFrame } from './loop'
import { migrateNodeConfig } from './migrations/node-config.migrations'

const log = logger.child({ module: 'workflow.graph-engine' })

// Inngest step type — use any to avoid deep Inngest import chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InngestStep = any

/**
 * Find the TRIGGER node that matches the incoming event.
 *
 * Supports:
 * - Event type matching (node.config.eventType === triggerEvent)
 * - Optional condition filtering (node.config.conditions)
 *
 * Returns the first matching TRIGGER node, or null if none match.
 */
export function findMatchingTrigger(
  nodes: WorkflowNode[],
  triggerEvent: string,
  triggerData: Record<string, unknown>,
): WorkflowNode | null {
  const triggerNodes = nodes.filter(n => n.type === 'TRIGGER')

  for (const trigger of triggerNodes) {
    // Type-safe access to TriggerNodeConfig properties
    const config = trigger.config as any
    const eventType = config?.eventType as string | undefined

    // Match event type
    if (eventType !== triggerEvent) continue

    // Optional: Match conditions
    const conditions = config?.conditions
    if (conditions) {
      const conditionsMet = evaluateConditionGroup(conditions, triggerData)
      if (!conditionsMet) continue
    }

    // Found matching trigger
    return trigger
  }

  return null
}

/**
 * GraphEngine — executes a workflow defined as nodes + edges (DAG with LOOP back-edges).
 *
 * The engine traverses the graph starting from the TRIGGER node, evaluating each
 * node in turn and following the appropriate output edge based on node type and result.
 *
 * Key design decisions:
 * - Cycle detection via visitedNodes Set (LOOP/LOOP_END nodes are exempt)
 * - All async operations use step.run() for Inngest durability and replay safety
 * - Error handling respects node.errorHandling: 'stop' (default), 'continue', 'branch'
 * - Context is immutable — each node produces a new context via spread
 */
export class GraphEngine {
  private nodes: Map<string, WorkflowNode>
  private adjacency: Map<string, WorkflowEdge[]>  // nodeId → outgoing edges

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.nodes = new Map(nodes.map(n => [n.id, n]))
    this.adjacency = new Map()
    for (const edge of edges) {
      if (!this.adjacency.has(edge.source)) this.adjacency.set(edge.source, [])
      this.adjacency.get(edge.source)!.push(edge)
    }
  }

  /**
   * Run the graph starting from a given node.
   * Creates a fresh visitedNodes set for cycle detection.
   */
  async run(
    startNodeId: string,
    context: WorkflowExecutionContext,
    step: InngestStep,
  ): Promise<WorkflowExecutionContext> {
    const visitedNodes = new Set<string>()
    return this.executeNode(startNodeId, context, step, visitedNodes)
  }

  /**
   * Execute a single node, then follow the appropriate outgoing edge.
   * Recursively traverses the graph until a terminal node or dead end.
   */
  async executeNode(
    nodeId: string,
    context: WorkflowExecutionContext,
    step: InngestStep,
    visitedNodes: Set<string>,
  ): Promise<WorkflowExecutionContext> {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found in graph`)

    // Cycle detection (LOOP and LOOP_END nodes are exempt — they are intentional back-edges)
    if (node.type !== 'LOOP' && node.type !== 'LOOP_END') {
      if (visitedNodes.has(nodeId)) {
        throw new Error(`Cycle detected at node ${nodeId} — workflow graph must be a DAG`)
      }
      visitedNodes.add(nodeId)
    }

    // Apply any pending config migrations before executing the node.
    // This ensures that configs stored in DB with older schemas are upgraded
    // transparently without mutating the stored node object.
    const { config: migratedConfig } = migrateNodeConfig(node)
    const node$ = { ...node, config: migratedConfig }

    let output: Record<string, unknown> = {}
    let nextHandle = 'output'
    let updatedContext = context

    try {
      switch (node$.type) {

        case 'TRIGGER':
          // Entry point — context already enriched, just pass through
          break

        case 'IF': {
          const cfg = node$.config as IfNodeConfig
          const result = evaluateConditionGroup(cfg.conditions, resolveContext(context))
          nextHandle = result ? 'true' : 'false'
          output = { result }
          break
        }

        case 'SWITCH': {
          const cfg = node$.config as SwitchNodeConfig
          const value = resolveField(cfg.field, resolveContext(context))
          const matched = cfg.cases.find(c =>
            evaluateCondition(
              { field: cfg.field, operator: c.operator, value: c.value },
              resolveContext(context)
            )
          )
          nextHandle = matched?.handle ?? 'default'
          output = { matchedCase: matched?.handle ?? 'default', value: String(value ?? '') }
          break
        }

        case 'MERGE': {
          // Merge is a convergence point — when reached by a single path, just pass through.
          // Parallel branch execution is handled by the caller before reaching here.
          nextHandle = 'output'
          break
        }

        case 'LOOP': {
          const cfg = node$.config as LoopNodeConfig
          const items = resolveField(cfg.sourceField, resolveContext(context))
          if (!Array.isArray(items)) {
            output = { iterations: 0, results: [] }
            break
          }

          const loopItems = items.slice(0, cfg.maxIterations ?? 100)
          const iterationOutputs: unknown[] = []
          const itemEdge = this.adjacency.get(nodeId)?.find(e => e.sourceHandle === 'item')

          if (!itemEdge) {
            log.warn({ nodeId }, 'LOOP node has no "item" edge — skipping')
            break
          }

          if (cfg.mode === 'sequential') {
            for (let i = 0; i < loopItems.length; i++) {
              const loopCtx = pushLoopFrame(updatedContext, cfg, loopItems, i)
              const result = await this.executeNode(itemEdge.target, loopCtx, step, new Set(visitedNodes))
              iterationOutputs.push(result.nodes[itemEdge.target]?.output ?? {})
              // Merge variables back but not the loop frame
              updatedContext = popLoopFrame(result, updatedContext)
            }
          } else {
            // parallel mode — each iteration runs concurrently via step.run
            const results = await Promise.all(
              loopItems.map((_, i) => {
                const loopCtx = pushLoopFrame(updatedContext, cfg, loopItems, i)
                return step.run(`loop-${nodeId}-iter-${i}`, () =>
                  this.executeNode(itemEdge.target, loopCtx, step, new Set(visitedNodes))
                )
              })
            )
            results.forEach((r: WorkflowExecutionContext, i: number) => {
              iterationOutputs.push(r.nodes[itemEdge.target]?.output ?? {})
            })
          }

          output = { iterations: loopItems.length, results: iterationOutputs }

          // Follow "done" edge after all iterations complete
          const doneEdge = this.adjacency.get(nodeId)?.find(e => e.sourceHandle === 'done')
          if (doneEdge) {
            updatedContext = this.mergeNodeOutput(updatedContext, nodeId, output)
            return this.executeNode(doneEdge.target, updatedContext, step, visitedNodes)
          }
          return this.mergeNodeOutput(updatedContext, nodeId, output)
        }

        case 'WAIT_FOR_EVENT': {
          const cfg = node$.config as WaitForEventNodeConfig
          const matchValue = resolveField(cfg.matchSourceField, resolveContext(context))
          const received = await step.waitForEvent(`wait-event-${nodeId}`, {
            event: cfg.event,
            match: `data.${cfg.matchField} == "${String(matchValue)}"`,
            timeout: cfg.timeout,
          })

          if (!received) {
            nextHandle = 'timeout'
            output = { timedOut: true }
            if (cfg.timeoutBehavior === 'stop') return context
            if (cfg.timeoutBehavior === 'error') {
              throw new Error(`WAIT_FOR_EVENT timed out waiting for ${cfg.event}`)
            }
          } else {
            nextHandle = 'received'
            output = cfg.outputField
              ? { [cfg.outputField]: received.data }
              : { receivedEvent: received.data }
            updatedContext = {
              ...context,
              variables: {
                ...context.variables,
                ...(cfg.outputField ? { [cfg.outputField]: received.data } : {}),
              }
            }
          }
          break
        }

        case 'WAIT_UNTIL': {
          const cfg = node$.config as WaitUntilNodeConfig
          let sleepTarget: string
          if (cfg.mode === 'duration') {
            sleepTarget = cfg.duration!
          } else if (cfg.mode === 'datetime') {
            sleepTarget = cfg.datetime!
          } else {
            sleepTarget = String(resolveField(cfg.field!, resolveContext(context)) ?? 'PT0S')
          }
          await step.sleep(`sleep-${nodeId}`, sleepTarget)
          break
        }

        case 'SET_VARIABLE': {
          const cfg = node$.config as SetVariableNodeConfig
          const newVars: Record<string, unknown> = {}
          for (const assignment of cfg.assignments) {
            if (assignment.valueType === 'literal') {
              newVars[assignment.key] = assignment.literal
            } else if (assignment.valueType === 'field') {
              newVars[assignment.key] = resolveField(assignment.field!, resolveContext(context))
            } else if (assignment.valueType === 'expression') {
              newVars[assignment.key] = evaluateExpression(assignment.expression!, context)
            }
          }
          output = newVars
          updatedContext = {
            ...context,
            variables: { ...context.variables, ...newVars }
          }
          break
        }

        case 'FILTER': {
          const cfg = node$.config as FilterNodeConfig
          const arr = resolveField(cfg.sourceField, resolveContext(context))
          const filtered = Array.isArray(arr)
            ? arr.filter(item => evaluateConditionGroup(cfg.conditions, item as Record<string, unknown>))
            : []
          output = { [cfg.outputField]: filtered, count: filtered.length }
          updatedContext = {
            ...context,
            variables: { ...context.variables, [cfg.outputField]: filtered }
          }
          break
        }

        case 'TRANSFORM': {
          const cfg = node$.config as TransformNodeConfig
          const flat = resolveContext(context)
          const result: Record<string, unknown> = {}
          for (const mapping of cfg.mappings) {
            let val = resolveField(mapping.sourceField, flat)
            if (mapping.transform) val = applyTransform(val, mapping.transform)
            result[mapping.targetKey] = val
          }
          output = { [cfg.outputField]: result }
          updatedContext = {
            ...context,
            variables: { ...context.variables, [cfg.outputField]: result }
          }
          break
        }

        case 'EXECUTE_WORKFLOW': {
          const cfg = node$.config as ExecuteWorkflowNodeConfig
          const flat = resolveContext(context)
          const inputData: Record<string, unknown> = {}
          for (const m of cfg.inputMappings) {
            inputData[m.targetKey] = resolveField(m.sourceField, flat)
          }

          const subDepth = ((context.__workflowDepth ?? 0) as number) + 1
          if (subDepth >= 3) {
            log.warn({ nodeId, workflowId: cfg.workflowId }, 'Sub-workflow depth limit reached — skipping')
            output = { skipped: true, reason: 'depth-limit' }
            nextHandle = 'error'
            break
          }

          if (cfg.mode === 'fire_and_forget') {
            await step.run(`sub-wf-send-${nodeId}`, () =>
              inngest.send({
                name: 'workflow/execute',
                data: {
                  workflowId: cfg.workflowId,
                  tenantId: context.triggerData.tenantId as string,
                  triggerEvent: 'EXECUTE_WORKFLOW',
                  triggerData: { ...inputData, __workflowDepth: subDepth },
                }
              })
            )
          } else {
            // sync mode: send + wait for completion event using correlationId
            const correlationId = crypto.randomUUID()
            await step.run(`sub-wf-send-${nodeId}`, () =>
              inngest.send({
                name: 'workflow/execute',
                data: {
                  workflowId: cfg.workflowId,
                  tenantId: context.triggerData.tenantId as string,
                  triggerEvent: 'EXECUTE_WORKFLOW',
                  triggerData: { ...inputData, __workflowDepth: subDepth, __correlationId: correlationId },
                }
              })
            )
            const result = await step.waitForEvent(`sub-wf-result-${nodeId}`, {
              event: 'workflow/completed',
              match: `data.correlationId == "${correlationId}"`,
              timeout: '1h',
            })
            if (result?.data?.output && cfg.outputField) {
              output = { [cfg.outputField]: result.data.output }
              updatedContext = {
                ...context,
                variables: { ...context.variables, [cfg.outputField]: result.data.output }
              }
            }
          }
          break
        }

        // Action nodes — delegate to shared executeAction()
        case 'SEND_EMAIL':
        case 'SEND_SMS':
        case 'WEBHOOK':
        case 'CREATE_CALENDAR_EVENT':
        case 'UPDATE_BOOKING_STATUS':
        case 'CREATE_TASK':
        case 'SEND_NOTIFICATION': {
          const enrichedConfig = substituteConfigVariables(node$.config as import('../workflow.types').NodeConfig, context)
          const actionResult = await step.run(`action-${nodeId}`, () =>
            executeAction(node$.type as WorkflowActionType, enrichedConfig, resolveContext(context))
          )
          output = actionResult ?? {}
          if (actionResult?.error) nextHandle = 'error'
          break
        }

        case 'STOP':
          return context  // terminal — do not follow edges

        case 'ERROR':
          throw new Error(`Workflow reached ERROR terminal node: ${node$.label ?? nodeId}`)

        case 'LOOP_END':
          // LOOP_END is a marker node — just pass through
          break
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      output = { error: errMsg }

      if (node.errorHandling === 'branch') {
        nextHandle = 'error'
        log.warn({ nodeId, err: errMsg }, 'Node failed — routing to error branch')
      } else if (node.errorHandling === 'continue') {
        log.warn({ nodeId, err: errMsg }, 'Node failed — continuing (errorHandling=continue)')
        nextHandle = 'output'
      } else {
        throw err  // 'stop' (default) — propagate so Inngest can retry
      }
    }

    // Merge this node's output into context
    updatedContext = this.mergeNodeOutput(updatedContext, nodeId, output)

    // Find matching outgoing edge by handle name
    const edges = this.adjacency.get(nodeId) ?? []
    const nextEdge = edges.find(e => e.sourceHandle === nextHandle)
    if (!nextEdge) return updatedContext  // terminal or no matching edge

    // Parallel branch detection: if next node is MERGE, check mode
    const nextNode = this.nodes.get(nextEdge.target)
    if (nextNode?.type === 'MERGE') {
      // Single-path arrival at MERGE — just pass through
      // Full parallel resolution is handled by executeParallelBranches() at the fan-out point
      return updatedContext
    }

    return this.executeNode(nextEdge.target, updatedContext, step, visitedNodes)
  }

  /**
   * Immutably merge a node's output into the context's nodes map.
   */
  private mergeNodeOutput(
    ctx: WorkflowExecutionContext,
    nodeId: string,
    output: Record<string, unknown>
  ): WorkflowExecutionContext {
    return {
      ...ctx,
      nodes: {
        ...ctx.nodes,
        [nodeId]: { output, success: true },
      }
    }
  }
}
