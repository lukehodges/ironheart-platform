import { z } from 'zod'

export const summarySchema = z.object({
  period: z.enum(['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']),
})

export const timeSeriesSchema = z.object({
  metric: z.string(),
  periodType: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']),
  from: z.string(),
  to: z.string(),
  dimensions: z.record(z.string(), z.string()).optional(),
})

export const forecastSchema = z.object({
  weeks: z.number().int().min(1).max(52).default(12),
})

export const kpiSchema = z.object({
  period: z.enum(['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']),
})

export const revenueChartSchema = z.object({
  from: z.string(),
  to: z.string(),
  periodType: z.enum(['DAY', 'WEEK', 'MONTH']),
})

export const bookingsByStatusSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export const topServicesSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const staffUtilizationSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export const churnRiskSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).optional(),
})
