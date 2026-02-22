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
      return analyticsService.getSummary(ctx.tenantId, input.period)
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
