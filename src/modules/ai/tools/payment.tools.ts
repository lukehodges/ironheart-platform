import type { AgentTool } from "../ai.types"
import * as paymentRepo from "@/modules/payment/payment.repository"

export const paymentTools: AgentTool[] = [
  {
    name: "payment.listInvoices",
    description:
      "List invoices with optional filters. Returns invoice number, status, amounts, customer, and due date. Use to find outstanding or overdue invoices.",
    module: "payment",
    permission: "payments:read",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "DRAFT",
            "SENT",
            "VIEWED",
            "PARTIALLY_PAID",
            "PAID",
            "OVERDUE",
            "CANCELLED",
            "REFUNDED",
          ],
          description: "Filter by invoice status",
        },
        customerId: { type: "string", description: "Filter by customer ID" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await paymentRepo.listInvoices(ctx.tenantId, {
        status: params.status as string | undefined,
        customerId: params.customerId as string | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "payment.getInvoiceById",
    description:
      "Get full details of a specific invoice by its ID. Returns invoice number, status, line items, amounts, payment history, and customer.",
    module: "payment",
    permission: "payments:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The invoice ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return paymentRepo.findInvoiceById(id, ctx.tenantId)
    },
  },
]
