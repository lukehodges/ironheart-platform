import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'
import * as analyticsRepository from './analytics.repository'
import { computeChurnScore, computeChurnLabel } from './lib/customer-intelligence'
import type { CustomerInsights, RevenueForecast, MetricKey } from './analytics.types'

const log = logger.child({ module: 'analytics.service' })

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
  // For now return a stub — full implementation requires joining bookings+payments
  // This provides the correct structure for the router
  const daysAgo = 30
  const frequency = 1
  const avgValue = 100
  const cohortStats = { minR: 0, maxR: 365, minF: 0, maxF: 12, minM: 0, maxM: 500 }

  const score = computeChurnScore(daysAgo, frequency, avgValue, cohortStats)
  const label = computeChurnLabel(score, daysAgo, 30)

  log.info({ tenantId, customerId }, 'Customer insights computed')

  return {
    customerId,
    ltv:                    avgValue * 12,
    avgBookingValue:        avgValue,
    bookingFrequencyDays:   30,
    lastBookingDaysAgo:     daysAgo,
    noShowRate:             0,
    churnRiskScore:         score,
    churnRiskLabel:         label,
    nextPredictedBookingDate: null,
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
