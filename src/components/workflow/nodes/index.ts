/**
 * Workflow Node Components
 *
 * Custom React Flow node components for the workflow builder.
 *
 * Node Types:
 * - TriggerNode: Entry point for workflows (purple border)
 * - ActionNode: Generic action nodes (blue border)
 * - IfNode: Conditional branching (amber border)
 * - LoopNode: Iteration control (green border)
 *
 * Usage:
 * ```tsx
 * import { TriggerNode, ActionNode, IfNode, LoopNode } from '@/components/workflow/nodes'
 *
 * const nodeTypes = {
 *   trigger: TriggerNode,
 *   action: ActionNode,
 *   if: IfNode,
 *   loop: LoopNode,
 * }
 *
 * <ReactFlow nodeTypes={nodeTypes} ... />
 * ```
 */

export { TriggerNode } from "./trigger-node"
export { ActionNode } from "./action-node"
export { IfNode } from "./if-node"
export { LoopNode } from "./loop-node"

export type { TriggerNodeData } from "./trigger-node"
export type { ActionNodeData } from "./action-node"
export type { IfNodeData } from "./if-node"
export type { LoopNodeData } from "./loop-node"
