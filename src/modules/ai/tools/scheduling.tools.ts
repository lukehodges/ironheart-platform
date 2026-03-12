import type { AgentTool } from "../ai.types"
import { schedulingRepository } from "@/modules/scheduling/scheduling.repository"

export const schedulingTools: AgentTool[] = [
  {
    name: "scheduling.listSlots",
    description:
      "List available booking slots for a date range. Returns slot date, time, capacity, staff, and service info. Use to check availability.",
    module: "scheduling",
    permission: "bookings:read",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD) — required",
        },
        endDate: {
          type: "string",
          description: "End date (YYYY-MM-DD) — required",
        },
        staffId: { type: "string", description: "Filter by staff member ID" },
        serviceId: { type: "string", description: "Filter by service ID" },
        venueId: { type: "string", description: "Filter by venue ID" },
        includeUnavailable: {
          type: "boolean",
          description: "Include fully-booked slots (default false)",
        },
      },
      required: ["startDate", "endDate"],
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await schedulingRepository.listSlots(ctx.tenantId, {
        startDate: new Date(params.startDate as string),
        endDate: new Date(params.endDate as string),
        staffId: params.staffId as string | undefined,
        serviceId: params.serviceId as string | undefined,
        venueId: params.venueId as string | undefined,
        includeUnavailable: (params.includeUnavailable as boolean) ?? false,
      })
      return result
    },
  },
  {
    name: "scheduling.getSlotById",
    description:
      "Get full details of a specific slot by its ID. Returns date, time, capacity, booked count, staff IDs, service IDs, and venue.",
    module: "scheduling",
    permission: "bookings:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The slot ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return (await schedulingRepository.findSlotById(ctx.tenantId, id)) ?? null
    },
  },
]
