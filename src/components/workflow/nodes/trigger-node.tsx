"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Data structure for TRIGGER node
 */
export interface TriggerNodeData {
  label: string
  eventName?: string
  description?: string
}

/**
 * TriggerNode Component
 *
 * Custom React Flow node component for TRIGGER type workflows.
 *
 * Features:
 * - Purple border styling to indicate trigger entry point
 * - Zap icon for visual identification
 * - Event name display
 * - Bottom handle for outgoing edges
 * - Compatible with dark mode
 *
 * Node Configuration:
 * - Type: "trigger"
 * - Handle: Single output at bottom (source)
 * - Color: Purple (#a855f7)
 *
 * @example
 * ```tsx
 * const nodeTypes = {
 *   trigger: TriggerNode,
 * }
 *
 * const nodes = [
 *   {
 *     id: '1',
 *     type: 'trigger',
 *     position: { x: 0, y: 0 },
 *     data: {
 *       label: 'Booking Created',
 *       eventName: 'booking/created',
 *       description: 'Fires when a new booking is created'
 *     }
 *   }
 * ]
 * ```
 */
export const TriggerNode = memo(({ data, selected }: NodeProps<TriggerNodeData>) => {
  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border-2 bg-white shadow-md transition-all",
        "dark:bg-slate-900",
        selected
          ? "border-purple-500 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30"
          : "border-purple-400 hover:border-purple-500 hover:shadow-lg",
        "dark:shadow-purple-500/10"
      )}
      role="article"
      aria-label={`Trigger node: ${data.label}`}
    >
      {/* Node header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b",
        "bg-purple-50 dark:bg-purple-950/30",
        "border-purple-200 dark:border-purple-800"
      )}>
        <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
          Trigger
        </span>
      </div>

      {/* Node content */}
      <div className="px-3 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {data.label}
          </p>
          {data.eventName && (
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
              {data.eventName}
            </p>
          )}
          {data.description && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Output handle at bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className={cn(
          "!w-3 !h-3 !bg-purple-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all"
        )}
        aria-label="Trigger output connection point"
      />
    </div>
  )
})

TriggerNode.displayName = "TriggerNode"

export default TriggerNode
