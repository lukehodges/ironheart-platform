"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Data structure for IF node
 */
export interface IfNodeData {
  label: string
  conditionSummary?: string
  description?: string
}

/**
 * IfNode Component
 *
 * Custom React Flow node component for IF control flow.
 *
 * Features:
 * - Amber border styling to indicate conditional logic
 * - GitBranch icon for visual identification
 * - Input handle at top
 * - Two output handles: "true" (right) and "false" (left)
 * - Condition summary display
 * - Compatible with dark mode
 *
 * Node Configuration:
 * - Type: "if"
 * - Handles: Input at top (target), outputs at left/right (source)
 * - Color: Amber (#f59e0b)
 * - Output handles: "true" (right), "false" (left)
 *
 * @example
 * ```tsx
 * const nodeTypes = {
 *   if: IfNode,
 * }
 *
 * const nodes = [
 *   {
 *     id: '3',
 *     type: 'if',
 *     position: { x: 0, y: 200 },
 *     data: {
 *       label: 'Check Booking Status',
 *       conditionSummary: 'status == "CONFIRMED"',
 *       description: 'Branch based on booking status'
 *     }
 *   }
 * ]
 *
 * const edges = [
 *   { id: 'e1', source: '3', sourceHandle: 'true', target: '4' },
 *   { id: 'e2', source: '3', sourceHandle: 'false', target: '5' },
 * ]
 * ```
 */
export const IfNode = memo(({ data, selected }: NodeProps<IfNodeData>) => {
  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border-2 bg-white shadow-md transition-all",
        "dark:bg-slate-900",
        selected
          ? "border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30"
          : "border-amber-400 hover:border-amber-500 hover:shadow-lg",
        "dark:shadow-amber-500/10"
      )}
      role="article"
      aria-label={`If node: ${data.label}`}
    >
      {/* Input handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className={cn(
          "!w-3 !h-3 !bg-amber-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all"
        )}
        aria-label="If input connection point"
      />

      {/* Node header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b",
        "bg-amber-50 dark:bg-amber-950/30",
        "border-amber-200 dark:border-amber-800"
      )}>
        <GitBranch className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          If Condition
        </span>
      </div>

      {/* Node content */}
      <div className="px-3 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {data.label}
          </p>
          {data.conditionSummary && (
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
              {data.conditionSummary}
            </p>
          )}
          {data.description && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* True output handle at right */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className={cn(
          "!w-3 !h-3 !bg-green-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all",
          "!top-[50%]"
        )}
        aria-label="True condition output"
      />

      {/* False output handle at left */}
      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className={cn(
          "!w-3 !h-3 !bg-red-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all",
          "!top-[50%]"
        )}
        aria-label="False condition output"
      />

      {/* Visual labels for handles */}
      <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600 dark:text-green-400">
        true
      </div>
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs font-medium text-red-600 dark:text-red-400">
        false
      </div>
    </div>
  )
})

IfNode.displayName = "IfNode"

export default IfNode
