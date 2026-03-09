import Bottleneck from 'bottleneck'

/**
 * Shared Bottleneck rate limiter for Google Calendar API calls.
 *
 * Google Calendar API limits:
 * - 10 queries per second per user
 * - 1,000,000 queries per day
 *
 * Configuration:
 * - maxConcurrent: 10 - no more than 10 in-flight requests at once
 * - minTime: 100ms - minimum 100ms between request starts (= max 10/sec)
 * - reservoir: 500 - burst allowance (refreshed every 10 seconds)
 *
 * Usage:
 *   import { calendarRateLimiter } from './rate-limiter'
 *   const result = await calendarRateLimiter.schedule(() => api.call())
 */
export const calendarRateLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 100,           // ms between each request start
  reservoir: 500,         // token bucket
  reservoirRefreshAmount: 500,
  reservoirRefreshInterval: 10_000, // refill every 10 seconds
})

/**
 * Bottleneck instance for token refresh operations.
 * More lenient - token refreshes are infrequent but must succeed.
 */
export const tokenRefreshLimiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
})
