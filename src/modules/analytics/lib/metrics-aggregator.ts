import { redis } from '@/shared/redis'
import type { MetricKey } from '../analytics.types'

/**
 * Increments Redis real-time counters for live dashboard.
 * Key format: metrics:{tenantId}:{metricKey}:{YYYY-MM-DD}
 * TTL: 48 hours (yesterday + today always available)
 */
export async function incrementMetricCounter(
  tenantId: string,
  metricKey: MetricKey,
  date: Date,
  amount = 1
): Promise<void> {
  const dateStr = date.toISOString().split('T')[0]
  const key = `metrics:${tenantId}:${metricKey}:${dateStr}`

  if (Number.isInteger(amount)) {
    await redis.incr(key)
  } else {
    await redis.incrbyfloat(key, amount)
  }
  await redis.expire(key, 48 * 60 * 60) // 48 hours TTL
}

export async function getMetricCounter(
  tenantId: string,
  metricKey: MetricKey,
  date: Date
): Promise<number> {
  const dateStr = date.toISOString().split('T')[0]
  const key = `metrics:${tenantId}:${metricKey}:${dateStr}`
  const val = await redis.get(key)
  return val ? parseFloat(val as string) : 0
}
