import type { AgentTool } from "../ai.types"
import * as analyticsRepo from "@/modules/analytics/analytics.repository"

export const analyticsTools: AgentTool[] = [
  {
    name: "analytics.getDashboardSummary",
    description:
      "Get a dashboard summary with booking counts, revenue, new customers, and average rating for a given period. Use to answer questions about business performance.",
    module: "analytics",
    permission: "analytics:read",
    inputSchema: {
      type: "object",
      properties: {
        periodStart: {
          type: "string",
          description:
            "Start of the period (YYYY-MM-DD). Defaults to 30 days ago.",
        },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const periodStart = params.periodStart
        ? new Date(params.periodStart as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [bookingCounts, revenue, outstanding, newCustomers, avgRating] =
        await Promise.all([
          analyticsRepo.getBookingCounts(ctx.tenantId, periodStart),
          analyticsRepo.getRevenueTotal(ctx.tenantId, periodStart),
          analyticsRepo.getOutstandingTotal(ctx.tenantId),
          analyticsRepo.getCustomerCount(ctx.tenantId, periodStart),
          analyticsRepo.getAverageRating(ctx.tenantId, periodStart),
        ])

      return {
        periodStart: periodStart.toISOString(),
        bookings: bookingCounts,
        revenue,
        outstanding,
        newCustomers,
        averageRating: avgRating,
      }
    },
  },
  {
    name: "analytics.getTopServices",
    description:
      "Get top services ranked by booking count. Returns service name, booking count, and revenue. Use to identify most popular services.",
    module: "analytics",
    permission: "analytics:read",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 10)" },
        from: { type: "string", description: "Start date (YYYY-MM-DD)" },
        to: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      return analyticsRepo.getTopServices(
        ctx.tenantId,
        (params.limit as number) ?? 10,
        params.from ? new Date(params.from as string) : undefined,
        params.to ? new Date(params.to as string) : undefined,
      )
    },
  },
]
