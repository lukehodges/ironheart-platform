import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'
import * as analyticsRepository from './analytics.repository'
import { computeChurnScore, computeChurnLabel } from './lib/customer-intelligence'
import type { CustomerInsights, RevenueForecast, MetricKey, MetricSummary } from './analytics.types'

const log = logger.child({ module: 'analytics.service' })

// ---------------------------------------------------------------------------
// getSummary — real DB aggregation
// ---------------------------------------------------------------------------

export type SummaryPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'

function getPeriodStart(period: SummaryPeriod, now: Date): Date {
  const d = new Date(now)
  switch (period) {
    case 'TODAY':   d.setHours(0, 0, 0, 0); break
    case 'WEEK':    d.setDate(d.getDate() - 7); break
    case 'MONTH':   d.setMonth(d.getMonth() - 1); break
    case 'QUARTER': d.setMonth(d.getMonth() - 3); break
    case 'YEAR':    d.setFullYear(d.getFullYear() - 1); break
  }
  return d
}

export async function getSummary(tenantId: string, period: SummaryPeriod) {
  const now = new Date()
  const periodStart = getPeriodStart(period, now)

  const [bookingCounts, revenueGross, outstanding, newCustomers, avgRating] =
    await Promise.all([
      analyticsRepository.getBookingCounts(tenantId, periodStart),
      analyticsRepository.getRevenueTotal(tenantId, periodStart),
      analyticsRepository.getOutstandingTotal(tenantId),
      analyticsRepository.getCustomerCount(tenantId, periodStart),
      analyticsRepository.getAverageRating(tenantId, periodStart),
    ])

  log.info({ tenantId, period, periodStart }, 'Summary computed')

  return {
    period,
    from: periodStart.toISOString(),
    to:   now.toISOString(),
    bookings:         bookingCounts,
    revenue:          { gross: revenueGross, net: revenueGross, outstanding },
    customers:        { new: newCustomers, returning: 0, ltvAvg: 0 },
    reviews:          { ratingAvg: avgRating, responseRate: 0 },
    staffUtilisation: 0,
  }
}

export async function computeHourlyMetrics(tenantId: string): Promise<void> {
  const now = new Date()
  const hourStart = new Date(now)
  hourStart.setMinutes(0, 0, 0)

  // Read today's Redis counters for real-time metrics
  const today = now.toISOString().split('T')[0]

  const metricKeys: MetricKey[] = [
    'bookings.created', 'bookings.confirmed', 'bookings.cancelled',
    'bookings.completed', 'bookings.no_show',
    'revenue.gross', 'revenue.net',
    'customers.new', 'customers.returning',
  ]

  for (const key of metricKeys) {
    const redisKey = `metrics:${tenantId}:${key}:${today}`
    const rawValue = await redis.get(redisKey)
    const value = rawValue ? parseFloat(rawValue as string) : 0

    await analyticsRepository.upsertSnapshot({
      tenantId,
      metricKey:   key,
      dimensions:  {},
      periodType:  'HOUR',
      periodStart: hourStart,
      value,
    })
  }

  log.info({ tenantId, hourStart }, 'Hourly metrics computed')
}

export async function getCustomerInsights(
  tenantId: string,
  customerId: string
): Promise<CustomerInsights> {
  // Fetch real booking stats and cohort data in parallel
  const [stats, cohortStats] = await Promise.all([
    analyticsRepository.getCustomerBookingStats(tenantId, customerId),
    analyticsRepository.getTenantCohortStats(tenantId),
  ])

  const now = new Date()

  // --- Recency: days since last booking ---
  const lastBookingDaysAgo = stats.lastBookingDate
    ? Math.floor((now.getTime() - stats.lastBookingDate.getTime()) / (1000 * 60 * 60 * 24))
    : 365 // no bookings = treat as maximally stale

  // --- Frequency: average interval between bookings (in days) ---
  let bookingFrequencyDays = 0
  if (stats.scheduledDates.length >= 2) {
    const intervals: number[] = []
    for (let i = 1; i < stats.scheduledDates.length; i++) {
      const prev = stats.scheduledDates[i - 1]!
      const curr = stats.scheduledDates[i]!
      const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      intervals.push(diffDays)
    }
    bookingFrequencyDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
  }

  // Frequency per 90 days (for RFM model)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const bookingsInLast90 = stats.scheduledDates.filter((d) => d >= ninetyDaysAgo).length

  // --- Monetary: average booking value ---
  const avgBookingValue = stats.totalBookings > 0
    ? Math.round((stats.totalSpent / stats.totalBookings) * 100) / 100
    : 0

  // --- LTV: total spent to date ---
  const ltv = stats.totalSpent

  // --- No-show rate ---
  const noShowRate = stats.totalBookings > 0
    ? Math.round((stats.noShowBookings / stats.totalBookings) * 10000) / 10000
    : 0

  // --- RFM churn scoring ---
  const churnRiskScore = computeChurnScore(
    lastBookingDaysAgo,
    bookingsInLast90,
    avgBookingValue,
    cohortStats
  )
  const churnRiskLabel = computeChurnLabel(
    churnRiskScore,
    lastBookingDaysAgo,
    bookingFrequencyDays || 30 // fallback to 30 days if no interval data
  )

  // --- Next predicted booking date ---
  let nextPredictedBookingDate: Date | null = null
  if (stats.lastBookingDate && bookingFrequencyDays > 0) {
    const predicted = new Date(stats.lastBookingDate.getTime() + bookingFrequencyDays * 24 * 60 * 60 * 1000)
    // Only predict future dates
    if (predicted > now) {
      nextPredictedBookingDate = predicted
    }
  }

  log.info({ tenantId, customerId, totalBookings: stats.totalBookings, churnRiskLabel }, 'Customer insights computed')

  return {
    customerId,
    ltv,
    avgBookingValue,
    bookingFrequencyDays,
    lastBookingDaysAgo,
    noShowRate,
    churnRiskScore,
    churnRiskLabel,
    nextPredictedBookingDate,
  }
}

export async function getRevenueForecast(
  tenantId: string,
  weeks: number
): Promise<RevenueForecast[]> {
  const { forecastRevenue } = await import('./lib/forecasting')

  // Get 12 weeks of daily revenue snapshots
  const to   = new Date()
  const from = new Date(to.getTime() - 84 * 24 * 60 * 60 * 1000) // 12 weeks

  const snapshots = await analyticsRepository.getTimeSeriesMetric({
    tenantId,
    metricKey:  'revenue.gross',
    periodType: 'DAY',
    from,
    to,
  })

  const history = snapshots.map((s) => ({
    date:    s.periodStart.toISOString().split('T')[0]!,
    revenue: parseFloat(s.value as unknown as string),
  }))

  log.info({ tenantId, weeks, historyPoints: history.length }, 'Revenue forecast computed')

  return forecastRevenue(history, weeks * 7)
}
