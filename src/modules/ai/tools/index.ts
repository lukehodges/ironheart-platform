import type { AgentTool } from "../ai.types"
import { bookingTools } from "./booking.tools"
import { customerTools } from "./customer.tools"
import { schedulingTools } from "./scheduling.tools"
import { reviewTools } from "./review.tools"
import { paymentTools } from "./payment.tools"
import { analyticsTools } from "./analytics.tools"
import { workflowTools } from "./workflow.tools"
import { teamTools } from "./team.tools"

export const allTools: AgentTool[] = [
  ...bookingTools,
  ...customerTools,
  ...schedulingTools,
  ...reviewTools,
  ...paymentTools,
  ...analyticsTools,
  ...workflowTools,
  ...teamTools,
]

export function getToolsForUser(tools: AgentTool[], userPermissions: string[]): AgentTool[] {
  return tools.filter(
    (tool) => tool.permission === null || userPermissions.includes(tool.permission)
  )
}
