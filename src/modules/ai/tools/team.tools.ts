import type { AgentTool } from "../ai.types"
import { teamRepository } from "@/modules/team/team.repository"

export const teamTools: AgentTool[] = [
  {
    name: "team.list",
    description:
      "List team members (ecologists, brokers, compliance officers). Returns name, email, role, status, and department. Use to find who is assigned to a site or deal.",
    module: "team",
    permission: "staff:read",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search by name or email",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
          description: "Filter by staff status",
        },
        departmentId: {
          type: "string",
          description: "Filter by department ID",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await teamRepository.listByTenant(ctx.tenantId, {
        search: params.search as string | undefined,
        status: params.status as "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined,
        departmentId: params.departmentId as string | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "team.getById",
    description:
      "Get full details of a specific team member by their user ID. Returns name, email, role, departments, status, and profile information.",
    module: "team",
    permission: "staff:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The team member's user ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return teamRepository.findById(ctx.tenantId, id)
    },
  },
]
