import type { AgentTool } from "../ai.types"
import { customerRepository } from "@/modules/customer/customer.repository"

export const customerTools: AgentTool[] = [
  {
    name: "customer.list",
    description:
      "List customers with optional search and filters. Returns customer name, email, phone, tags, and active status. Use to find customers by name or email.",
    module: "customer",
    permission: "customers:read",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search by name or email (partial match)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (customer must have ALL specified tags)",
        },
        isActive: { type: "boolean", description: "Filter by active status" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await customerRepository.list(ctx.tenantId, {
        search: params.search as string | undefined,
        tags: params.tags as string[] | undefined,
        isActive: params.isActive as boolean | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "customer.getById",
    description:
      "Get full details of a specific customer by their ID. Returns name, email, phone, address, tags, notes, and active status.",
    module: "customer",
    permission: "customers:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The customer ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return customerRepository.findById(ctx.tenantId, id)
    },
  },
]
