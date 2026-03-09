import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'
import * as analyticsRepository from './analytics.repository'
import { computeChurnScore, computeChurnLabel } from './lib/customer-intelligence'
import type { CustomerInsights, RevenueForecast, MetricKey, MetricSummary, CohortStats } from './analytics.types'

const log = logger.child({ module: 'analytics.service' })

// ---------------------------------------------------------------------------
// getSummary - real DB aggregation
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

// ---------------------------------------------------------------------------
// getKPIs - period comparison (current vs previous period)
// ---------------------------------------------------------------------------

export interface KPIMetric {
  current: number
  previous: number
  change: number // percentage change
}

export interface KPIResult {
  bookings: KPIMetric
  revenue: KPIMetric
  customers: KPIMetric
  avgRating: KPIMetric
}

function computeChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 10000) / 100
}

function getPreviousPeriodStart(period: SummaryPeriod, currentPeriodStart: Date): Date {
  const d = new Date(currentPeriodStart)
  switch (period) {
    case 'TODAY':   d.setDate(d.getDate() - 1); break
    case 'WEEK':    d.setDate(d.getDate() - 7); break
    case 'MONTH':   d.setMonth(d.getMonth() - 1); break
    case 'QUARTER': d.setMonth(d.getMonth() - 3); break
    case 'YEAR':    d.setFullYear(d.getFullYear() - 1); break
  }
  return d
}

export async function getKPIs(tenantId: string, period: SummaryPeriod): Promise<KPIResult> {
  const now = new Date()
  const currentPeriodStart = getPeriodStart(period, now)
  const previousPeriodStart = getPreviousPeriodStart(period, currentPeriodStart)

  // Fetch both periods in parallel
  const [currentData, previousData] = await Promise.all([
    Promise.all([
      analyticsRepository.getBookingCounts(tenantId, currentPeriodStart),
      analyticsRepository.getRevenueTotal(tenantId, currentPeriodStart),
      analyticsRepository.getCustomerCount(tenantId, currentPeriodStart),
      analyticsRepository.getAverageRating(tenantId, currentPeriodStart),
    ]),
    Promise.all([
      analyticsRepository.getBookingCounts(tenantId, previousPeriodStart),
      analyticsRepository.getRevenueTotal(tenantId, previousPeriodStart),
      analyticsRepository.getCustomerCount(tenantId, previousPeriodStart),
      analyticsRepository.getAverageRating(tenantId, previousPeriodStart),
    ]),
  ])

  const [curBookings, curRevenue, curCustomers, curRating] = currentData
  const [prevBookings, prevRevenue, prevCustomers, prevRating] = previousData

  log.info({ tenantId, period }, 'KPIs computed')

  return {
    bookings: {
      current:  curBookings.created,
      previous: prevBookings.created,
      change:   computeChange(curBookings.created, prevBookings.created),
    },
    revenue: {
      current:  curRevenue,
      previous: prevRevenue,
      change:   computeChange(curRevenue, prevRevenue),
    },
    customers: {
      current:  curCustomers,
      previous: prevCustomers,
      change:   computeChange(curCustomers, prevCustomers),
    },
    avgRating: {
      current:  curRating,
      previous: prevRating,
      change:   computeChange(curRating, prevRating),
    },
  }
}

// ---------------------------------------------------------------------------
// getRevenueChart - time series data for revenue chart
// ---------------------------------------------------------------------------

export interface RevenueDataPoint {
  date: string
  value: number
}

export async function getRevenueChart(
  tenantId: string,
  from: string,
  to: string,
  periodType: 'DAY' | 'WEEK' | 'MONTH'
): Promise<{ dataPoints: RevenueDataPoint[] }> {
  const dataPoints = await analyticsRepository.getRevenueChart(
    tenantId,
    new Date(from),
    new Date(to),
    periodType
  )

  log.info({ tenantId, from, to, periodType, pointCount: dataPoints.length }, 'Revenue chart computed')

  return { dataPoints }
}

// ---------------------------------------------------------------------------
// getBookingsByStatus - status distribution for donut chart
// ---------------------------------------------------------------------------

export interface BookingStatusCount {
  status: string
  count: number
}

export async function getBookingsByStatus(
  tenantId: string,
  from?: string,
  to?: string
): Promise<BookingStatusCount[]> {
  const result = await analyticsRepository.getBookingsByStatus(
    tenantId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  )

  log.info({ tenantId, statusCount: result.length }, 'Bookings by status computed')

  return result
}

// ---------------------------------------------------------------------------
// getTopServices - ranked services by booking count
// ---------------------------------------------------------------------------

export interface TopService {
  serviceId: string
  serviceName: string
  bookingCount: number
  revenue: number
}

export async function getTopServices(
  tenantId: string,
  limit: number,
  from?: string,
  to?: string
): Promise<TopService[]> {
  const result = await analyticsRepository.getTopServices(
    tenantId,
    limit,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  )

  log.info({ tenantId, limit, serviceCount: result.length }, 'Top services computed')

  return result
}

// ---------------------------------------------------------------------------
// getStaffUtilization - staff utilization data (cached 5 min)
// ---------------------------------------------------------------------------

export interface StaffUtilization {
  staffId: string
  staffName: string
  bookingCount: number
  hoursBooked: number
}

export async function getStaffUtilization(
  tenantId: string,
  from?: string,
  to?: string
): Promise<StaffUtilization[]> {
  const cacheKey = `analytics:staff-utilization:${tenantId}:${from ?? 'all'}:${to ?? 'all'}`

  // Check Redis cache first
  const cached = await redis.get<string>(cacheKey)
  if (cached) {
    log.info({ tenantId, cacheKey }, 'Staff utilization served from cache')
    return JSON.parse(cached) as StaffUtilization[]
  }

  const result = await analyticsRepository.getStaffUtilization(
    tenantId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  )

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result))

  log.info({ tenantId, staffCount: result.length }, 'Staff utilization computed')

  return result
}

// ---------------------------------------------------------------------------
// getChurnRisk - at-risk customers (cached 10 min)
// ---------------------------------------------------------------------------

export interface ChurnRiskCustomer {
  customerId: string
  customerName: string
  lastBooking: string | null
  avgInterval: number
  churnScore: number
}

export async function getChurnRisk(
  tenantId: string,
  limit: number
): Promise<ChurnRiskCustomer[]> {
  const cacheKey = `analytics:churn-risk:${tenantId}:${limit}`

  // Check Redis cache first
  const cached = await redis.get<string>(cacheKey)
  if (cached) {
    log.info({ tenantId, cacheKey }, 'Churn risk served from cache')
    return JSON.parse(cached) as ChurnRiskCustomer[]
  }

  const candidates = await analyticsRepository.getChurnRiskCandidates(tenantId, limit)
  const cohortStats = await analyticsRepository.getTenantCohortStats(tenantId)
  const now = new Date()

  const scored: ChurnRiskCustomer[] = []

  for (const candidate of candidates) {
    // Compute average interval between bookings
    let avgInterval = 0
    if (candidate.scheduledDates.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < candidate.scheduledDates.length; i++) {
        const prev = candidate.scheduledDates[i - 1]!
        const curr = candidate.scheduledDates[i]!
        const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
        intervals.push(diffDays)
      }
      avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    }

    // Compute churn score using RFM model
    const lastBookingDaysAgo = candidate.lastBooking
      ? Math.floor((now.getTime() - candidate.lastBooking.getTime()) / (1000 * 60 * 60 * 24))
      : 365

    // Only include if overdue: days since last booking > average interval
    if (avgInterval > 0 && lastBookingDaysAgo > avgInterval) {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const bookingsInLast90 = candidate.scheduledDates.filter((d) => d >= ninetyDaysAgo).length

      const churnScore = computeChurnScore(
        lastBookingDaysAgo,
        bookingsInLast90,
        0, // monetary not used for ranking here
        cohortStats
      )

      scored.push({
        customerId:   candidate.customerId,
        customerName: candidate.customerName,
        lastBooking:  candidate.lastBooking ? candidate.lastBooking.toISOString() : null,
        avgInterval,
        churnScore:   Math.round(churnScore * 100) / 100,
      })
    }
  }

  // Sort by churn score descending (highest risk first) and limit
  scored.sort((a, b) => b.churnScore - a.churnScore)
  const result = scored.slice(0, limit)

  // Cache for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(result))

  log.info({ tenantId, limit, atRiskCount: result.length }, 'Churn risk computed')

  return result
}
