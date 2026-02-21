"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import {
  Mail,
  MessageSquare,
  Webhook,
  Database,
  Send,
  Calendar,
  FileText,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Data structure for ACTION node
 */
export interface ActionNodeData {
  label: string
  actionType?: string
  configSummary?: string
  description?: string
}

/**
 * Map action types to their corresponding icons
 */
const ACTION_ICONS: Record<string, LucideIcon> = {
  SEND_EMAIL: Mail,
  SEND_SMS: MessageSquare,
  WEBHOOK: Webhook,
  CREATE_BOOKING: Calendar,
  UPDATE_BOOKING: Calendar,
  CREATE_CUSTOMER: Database,
  UPDATE_CUSTOMER: Database,
  CREATE_NOTE: FileText,
  default: Send,
}

/**
 * Get icon component for action type
 */
function getActionIcon(actionType?: string): LucideIcon {
  if (!actionType) return ACTION_ICONS.default
  return ACTION_ICONS[actionType] || ACTION_ICONS.default
}

/**
 * ActionNode Component
 *
 * Generic action node component for all workflow action types.
 * Supports: SEND_EMAIL, SEND_SMS, WEBHOOK, CREATE_BOOKING, UPDATE_BOOKING,
 * CREATE_CUSTOMER, UPDATE_CUSTOMER, CREATE_NOTE
 *
 * Features:
 * - Blue border styling to indicate action
 * - Dynamic icon based on action type
 * - Input handle (top) and output handle (bottom)
 * - Configuration summary display (1 line)
 * - Compatible with dark mode
 *
 * Node Configuration:
 * - Type: "action"
 * - Handles: Input at top (target), output at bottom (source)
 * - Color: Blue (#3b82f6)
 *
 * @example
 * ```tsx
 * const nodeTypes = {
 *   action: ActionNode,
 * }
 *
 * const nodes = [
 *   {
 *     id: '2',
 *     type: 'action',
 *     position: { x: 0, y: 100 },
 *     data: {
 *       label: 'Send Confirmation Email',
 *       actionType: 'SEND_EMAIL',
 *       configSummary: 'Template: booking-confirmation',
 *       description: 'Sends confirmation email to customer'
 *     }
 *   }
 * ]
 * ```
 */
export const ActionNode = memo(({ data, selected }: NodeProps<ActionNodeData>) => {
  const Icon = getActionIcon(data.actionType)

  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border-2 bg-white shadow-md transition-all",
        "dark:bg-slate-900",
        selected
          ? "border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30"
          : "border-blue-400 hover:border-blue-500 hover:shadow-lg",
        "dark:shadow-blue-500/10"
      )}
      role="article"
      aria-label={`Action node: ${data.label}`}
    >
      {/* Input handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className={cn(
          "!w-3 !h-3 !bg-blue-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all"
        )}
        aria-label="Action input connection point"
      />

      {/* Node header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b",
        "bg-blue-50 dark:bg-blue-950/30",
        "border-blue-200 dark:border-blue-800"
      )}>
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Action
        </span>
      </div>

      {/* Node content */}
      <div className="px-3 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {data.label}
          </p>
          {data.configSummary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {data.configSummary}
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
          "!w-3 !h-3 !bg-blue-500 !border-2 !border-white",
          "dark:!border-slate-900",
          "hover:!w-4 hover:!h-4 transition-all"
        )}
        aria-label="Action output connection point"
      />
    </div>
  )
})

ActionNode.displayName = "ActionNode"

export default ActionNode
