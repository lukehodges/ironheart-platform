import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure } from '@/shared/trpc'
import * as analyticsService from './analytics.service'
import * as analyticsRepository from './analytics.repository'
import {
  summarySchema,
  timeSeriesSchema,
  forecastSchema,
  kpiSchema,
  revenueChartSchema,
  bookingsByStatusSchema,
  topServicesSchema,
  staffUtilizationSchema,
  churnRiskSchema,
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

  getKPIs: tenantProcedure
    .input(kpiSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getKPIs(ctx.tenantId, input.period)
    }),

  getRevenueChart: tenantProcedure
    .input(revenueChartSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getRevenueChart(
        ctx.tenantId,
        input.from,
        input.to,
        input.periodType
      )
    }),

  getBookingsByStatus: tenantProcedure
    .input(bookingsByStatusSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getBookingsByStatus(
        ctx.tenantId,
        input.from,
        input.to
      )
    }),

  getTopServices: tenantProcedure
    .input(topServicesSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getTopServices(
        ctx.tenantId,
        input.limit ?? 10,
        input.from,
        input.to
      )
    }),

  getStaffUtilization: permissionProcedure('analytics:read')
    .input(staffUtilizationSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getStaffUtilization(
        ctx.tenantId,
        input.from,
        input.to
      )
    }),

  getChurnRisk: permissionProcedure('analytics:read')
    .input(churnRiskSchema)
    .query(async ({ ctx, input }) => {
      return analyticsService.getChurnRisk(ctx.tenantId, input.limit ?? 20)
    }),
})
