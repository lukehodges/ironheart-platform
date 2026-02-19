import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/shared/redis'

/**
 * API key tier rate limits (sliding window — more accurate than token bucket).
 * Applied per apiKey.id, not per key string (prevents bypass via rotation).
 */
export const apiRateLimits = {
  STARTER:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100,    '1 m') }),
  PROFESSIONAL: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(500,    '1 m') }),
  BUSINESS:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(2_000,  '1 m') }),
  ENTERPRISE:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10_000, '1 m') }),
} as const

/**
 * tRPC layer rate limits (by userId for authenticated, by IP for public).
 */
export const tRPCRateLimits = {
  public:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '1 m') }),
  tenant:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, '1 m') }),
  mutation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '1 m') }),
} as const

export type ApiRateLimitTier = keyof typeof apiRateLimits
