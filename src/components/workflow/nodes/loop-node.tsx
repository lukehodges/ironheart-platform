"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Data structure for LOOP node
 */
export interface LoopNodeData {
  label: string
  itemCount?: number
  itemVariableName?: string
  mode?: "sequential" | "parallel"
  description?: string
}

/**
 * LoopNode Component
 *
 * Custom React Flow node component for LOOP control flow.
 *
 * Features:
 * - Green border styling to indicate iteration
 * - RotateCw icon for visual identification
 * - Input handle at top
 * - Loop body output at bottom (executes for each item)
 * - Loop end connector at right (continues after loop completes)
 * - Item count display
 * - Compatible with dark mode
 *
 * Node Configuration:
 * - Type: "loop"
 * - Handles:
 *   - Input at top (target)
 *   - Loop body at bottom (source: "loop-body")
 *   - Loop end at right (source: "loop-end")
 * - Color: Green (#22c55e)
 *
 * @example
 * ```tsx
 * const nodeTypes = {
 *   loop: LoopNode,
 * }
 *
 * const nodes = [
 *   {
 *     id: '4',
 *     type: 'loop',
 *     position: { x: 0, y: 300 },
 *     data: {
 *       label: 'For Each Booking',
 *       itemCount: 5,
 *       itemVariableName: 'booking',
 *       mode: 'sequential',
 *       description: 'Process each booking in the list'
 *     }
 *   }
 * ]
 *
 * const edges = [
 *   { id: 'e1', source: '4', sourceHandle: 'loop-body', target: '5' }, // Loop body
 *   { id: 'e2', source: '4', sourceHandle: 'loop-end', target: '6' },  // Continue after loop
 * ]
 * ```
 */
export const LoopNode = memo(({ data, selected }: NodeProps<LoopNodeData>) => {
  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border-2 bg-white shadow-md transition-all",
        "dark:bg-slate-900",
        selected
          ? "border-green-500 shadow-lg shadow-green-500/20 ring-2 ring-green-500/30"
          : "border-green-400 hover:border-green-500 hover:shadow-lg",
        "dark:shadow-green-500/10"
      )}
      role="article"
      aria-label={`Loop node: ${data.label}`}
    >
      {/* Input handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className={cn(
          "!w-3 !h-3 !bg-green-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all"
        )}
        aria-label="Loop input connection point"
      />

      {/* Node header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b",
        "bg-green-50 dark:bg-green-950/30",
        "border-green-200 dark:border-green-800"
      )}>
        <RotateCw className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-green-900 dark:text-green-100">
          Loop
        </span>
        {data.mode && (
          <span className={cn(
            "ml-auto text-xs px-1.5 py-0.5 rounded",
            "bg-green-100 dark:bg-green-900/50",
            "text-green-700 dark:text-green-300"
          )}>
            {data.mode}
          </span>
        )}
      </div>

      {/* Node content */}
      <div className="px-3 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {data.label}
          </p>
          {data.itemVariableName && (
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
              item: {data.itemVariableName}
            </p>
          )}
          {data.itemCount !== undefined && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {data.itemCount} {data.itemCount === 1 ? "item" : "items"}
            </p>
          )}
          {data.description && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Loop body output handle at bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop-body"
        className={cn(
          "!w-3 !h-3 !bg-green-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all"
        )}
        aria-label="Loop body output (executes for each item)"
      />

      {/* Loop end handle at right */}
      <Handle
        type="source"
        position={Position.Right}
        id="loop-end"
        className={cn(
          "!w-3 !h-3 !bg-slate-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all",
          "!top-[50%]"
        )}
        aria-label="Loop end output (continues after loop completes)"
      />

      {/* Visual labels for handles */}
      <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-xs font-medium text-green-600 dark:text-green-400">
        body
      </div>
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 dark:text-slate-400">
        end
      </div>
    </div>
  )
})

LoopNode.displayName = "LoopNode"

export default LoopNode
