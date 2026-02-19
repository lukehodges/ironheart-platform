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

export const staffPerformanceSchema = z.object({
  staffId: z.string().optional(),
  from: z.string(),
  to: z.string(),
})

export const revenueSchema = z.object({
  from: z.string(),
  to: z.string(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
})

export const funnelSchema = z.object({
  from: z.string(),
  to: z.string(),
  serviceId: z.string().optional(),
})

export const forecastSchema = z.object({
  weeks: z.number().int().min(1).max(52).default(12),
})
