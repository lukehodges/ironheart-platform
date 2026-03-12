import type { AgentTool, MutatingAgentTool } from "../ai.types"
import { bookingTools } from "./booking.tools"
import { customerTools } from "./customer.tools"
import { schedulingTools } from "./scheduling.tools"
import { reviewTools } from "./review.tools"
import { paymentTools } from "./payment.tools"
import { analyticsTools } from "./analytics.tools"
import { workflowTools } from "./workflow.tools"
import { teamTools } from "./team.tools"
import { bookingMutationTools } from "./booking.mutation-tools"
import { customerMutationTools } from "./customer.mutation-tools"
import { notificationMutationTools } from "./notification.mutation-tools"

export const allMutationTools: MutatingAgentTool[] = [
  ...bookingMutationTools,
  ...customerMutationTools,
  ...notificationMutationTools,
]

export const allTools: AgentTool[] = [
  ...bookingTools,
  ...customerTools,
  ...schedulingTools,
  ...reviewTools,
  ...paymentTools,
  ...analyticsTools,
  ...workflowTools,
  ...teamTools,
  ...allMutationTools,
]

export function getToolsForUser(tools: AgentTool[], userPermissions: string[]): AgentTool[] {
  // OWNER/ADMIN users get "*:*" which grants access to all tools
  const hasWildcard = userPermissions.includes("*:*")
  return tools.filter(
    (tool) => tool.permission === null || hasWildcard || userPermissions.includes(tool.permission)
  )
}

export function isMutatingTool(tool: AgentTool): tool is MutatingAgentTool {
  return "guardrailTier" in tool
}
