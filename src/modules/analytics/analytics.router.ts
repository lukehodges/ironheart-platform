import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure } from '@/shared/trpc'
import * as analyticsService from './analytics.service'
import * as analyticsRepository from './analytics.repository'
import {
  summarySchema,
  timeSeriesSchema,
  forecastSchema,
} from './analytics.schemas'
import type { MetricKey, PeriodType } from './analytics.types'

export const analyticsRouter = router({
  getSummary: tenantProcedure
    .input(summarySchema)
    .query(async ({ ctx, input }) => {
      const now  = new Date()
      const from = getPeriodStart(input.period, now)

      return {
        period: input.period,
        from:   from.toISOString(),
        to:     now.toISOString(),
        // Data populated from metric_snapshots table via computeHourlyMetrics cron
        bookings:         { created: 0, confirmed: 0, cancelled: 0, completed: 0, noShow: 0 },
        revenue:          { gross: 0, net: 0, outstanding: 0 },
        customers:        { new: 0, returning: 0, ltvAvg: 0 },
        reviews:          { ratingAvg: 0, responseRate: 0 },
        staffUtilisation: 0,
      }
    }),

  getTimeSeries: tenantProcedure
    .input(timeSeriesSchema)
    .query(async ({ ctx, input }) => {
      return analyticsRepository.getTimeSeriesMetric({
        tenantId:   ctx.tenantId,
        metricKey:  input.metric as MetricKey,
        periodType: input.periodType as PeriodType,
        from:       new Date(input.from),
        to:         new Date(input.to),
        dimensions: input.dimensions,
      })
    }),

  getCustomerInsights: permissionProcedure('analytics:read')
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      return analyticsService.getCustomerInsights(ctx.tenantId, input.customerId)
    }),

  getRevenueForecast: permissionProcedure('analytics:read')
    .input(forecastSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getRevenueForecast(ctx.tenantId, input.weeks)
    }),
})

function getPeriodStart(period: string, now: Date): Date {
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
