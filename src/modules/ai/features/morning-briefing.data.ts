// src/modules/ai/features/morning-briefing.data.ts

import { logger } from "@/shared/logger"
import type { BriefingMetrics } from "../ai.types"

const log = logger.child({ module: "ai.morning-briefing.data" })

/**
 * Gather data for the morning briefing using direct database queries.
 * Returns metrics and recent activity for the narrative generator.
 */
export async function gatherBriefingData(tenantId: string): Promise<{
  metrics: BriefingMetrics
  recentBookings: unknown[]
  recentReviews: unknown[]
  failedWorkflows: unknown[]
  pendingActions: unknown[]
}> {
  const { db } = await import("@/shared/db")
  const { sql } = await import("drizzle-orm")

  // Gather data in parallel where possible
  const [bookingsResult, reviewsResult] = await Promise.allSettled([
    db.execute(sql`
      SELECT id, status, created_at, customer_id
      FROM bookings
      WHERE tenant_id = ${tenantId}
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 50
    `),
    db.execute(sql`
      SELECT id, rating, comment, created_at
      FROM reviews
      WHERE tenant_id = ${tenantId}
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `),
  ])

  const recentBookings = bookingsResult.status === "fulfilled" ? (bookingsResult.value as unknown[]) : []
  const recentReviews = reviewsResult.status === "fulfilled" ? (reviewsResult.value as unknown[]) : []

  // Build metrics from gathered data
  const bookingsList = Array.isArray(recentBookings) ? recentBookings : []
  const reviewsList = Array.isArray(recentReviews) ? recentReviews : []

  const metrics: BriefingMetrics = {
    newBookings24h: bookingsList.length,
    completedBookings24h: bookingsList.filter((b: any) => b.status === "COMPLETED").length,
    cancelledBookings24h: bookingsList.filter((b: any) => b.status === "CANCELLED").length,
    newReviews24h: reviewsList.length,
    avgRating24h: reviewsList.length > 0
      ? reviewsList.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / reviewsList.length
      : null,
    overdueInvoices: 0,
    pendingApprovals: 0,
    workflowsTriggered24h: 0,
    workflowsFailed24h: 0,
  }

  log.info({ tenantId, metrics }, "Briefing data gathered")

  return {
    metrics,
    recentBookings: bookingsList,
    recentReviews: reviewsList,
    failedWorkflows: [],
    pendingActions: [],
  }
}
