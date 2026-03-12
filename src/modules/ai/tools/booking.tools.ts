import type { AgentTool } from "../ai.types"
import { bookingRepository } from "@/modules/booking/booking.repository"

export const bookingTools: AgentTool[] = [
  {
    name: "booking.list",
    description:
      "List bookings with optional filters. Returns bookings with customer name, service, date, status. Use this to find upcoming, past, or filtered bookings.",
    module: "booking",
    permission: "bookings:read",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "PENDING",
            "APPROVED",
            "CONFIRMED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
          ],
          description: "Filter by booking status",
        },
        customerId: { type: "string", description: "Filter by customer ID" },
        staffId: { type: "string", description: "Filter by assigned staff ID" },
        dateFrom: { type: "string", description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: "string", description: "End date (YYYY-MM-DD)" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await bookingRepository.list(ctx.tenantId, {
        status: params.status as string | undefined,
        customerId: params.customerId as string | undefined,
        staffId: params.staffId as string | undefined,
        startDate: params.dateFrom
          ? new Date(params.dateFrom as string)
          : undefined,
        endDate: params.dateTo
          ? new Date(params.dateTo as string)
          : undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "booking.getById",
    description:
      "Get full details of a specific booking by its ID. Returns all booking fields including customer, service, staff, dates, status, and notes.",
    module: "booking",
    permission: "bookings:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The booking ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return bookingRepository.findById(ctx.tenantId, id)
    },
  },
]
