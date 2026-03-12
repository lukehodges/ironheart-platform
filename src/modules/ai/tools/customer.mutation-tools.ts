// src/modules/ai/tools/customer.mutation-tools.ts

import type { MutatingAgentTool } from "../ai.types"
import { customerRepository } from "@/modules/customer/customer.repository"

export const customerMutationTools: MutatingAgentTool[] = [
  {
    name: "customer.addNote",
    description: "Add a note to a customer record. Use to record observations, follow-ups, or context.",
    module: "customer",
    permission: "customers:write",
    guardrailTier: "AUTO",
    mutationDescription: "Adds a note to a customer",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer ID" },
        content: { type: "string", description: "The note content" },
      },
      required: ["customerId", "content"],
    },
    execute: async (input: unknown, ctx) => {
      const { customerId, content } = input as { customerId: string; content: string }
      return customerRepository.addNote(ctx.tenantId, { customerId, content, userId: ctx.userId })
    },
  },
  {
    name: "customer.updateTags",
    description: "Update tags on a customer record. Tags are used for categorization and filtering.",
    module: "customer",
    permission: "customers:write",
    guardrailTier: "AUTO",
    mutationDescription: "Updates a customer's tags",
    isReversible: true,
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer ID" },
        tags: { type: "array", items: { type: "string" }, description: "New tag list (replaces existing)" },
      },
      required: ["customerId", "tags"],
    },
    execute: async (input: unknown, ctx) => {
      const { customerId, tags } = input as { customerId: string; tags: string[] }
      const current = await customerRepository.findById(ctx.tenantId, customerId)
      const result = await customerRepository.update(ctx.tenantId, customerId, { tags })
      return { ...result, _compensationData: { customerId, previousTags: current?.tags } }
    },
    compensate: async (compensationData: unknown, ctx) => {
      const data = compensationData as { customerId: string; previousTags: string[] }
      await customerRepository.update(ctx.tenantId, data.customerId, { tags: data.previousTags })
    },
  },
]
