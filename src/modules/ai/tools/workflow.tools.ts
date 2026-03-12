import type { AgentTool } from "../ai.types"
import { workflowRepository } from "@/modules/workflow/workflow.repository"

export const workflowTools: AgentTool[] = [
  {
    name: "workflow.list",
    description:
      "List workflows (deal processes, compliance workflows) with optional filters. Returns workflow name, status (active/inactive), type (linear/visual), and trigger events.",
    module: "workflow",
    permission: "workflows:read",
    inputSchema: {
      type: "object",
      properties: {
        triggerEvent: {
          type: "string",
          description: "Filter by trigger event name (e.g., 'booking/created', 'forms/submitted')",
        },
        isActive: {
          type: "boolean",
          description: "Filter by active status",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await workflowRepository.listByTenant(ctx.tenantId, {
        triggerEvent: params.triggerEvent as string | undefined,
        isActive: params.isActive as boolean | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "workflow.getById",
    description:
      "Get full details of a specific workflow by its ID. Returns workflow configuration including nodes, edges, conditions, and trigger setup.",
    module: "workflow",
    permission: "workflows:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The workflow ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return workflowRepository.findById(ctx.tenantId, id)
    },
  },
  {
    name: "workflow.listExecutions",
    description:
      "List recent workflow executions (runs) with optional workflow filter. Returns execution status, trigger event, start time, and errors. Useful for checking deal process progress or diagnosing failed automations.",
    module: "workflow",
    permission: "workflows:read",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "Filter by workflow ID",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await workflowRepository.listExecutions(ctx.tenantId, {
        workflowId: params.workflowId as string | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
]
