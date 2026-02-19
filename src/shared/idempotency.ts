import { redis } from '@/shared/redis'
import { ConflictError } from '@/shared/errors'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'shared.idempotency' })

/**
 * Wraps an operation with idempotency guarantee.
 * Formal guarantee (I5): calling with the same key twice produces the same result
 * and exactly one side effect.
 */
export async function withIdempotency<T>(
  key: string,
  ttlSeconds: number,
  operation: () => Promise<T>
): Promise<T> {
  const cacheKey = `idempotency:${key}`
  const lockKey  = `idempotency:lock:${key}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    log.info({ key }, 'Idempotency cache hit — returning cached result')
    return JSON.parse(cached as string) as T
  }

  const acquired = await redis.set(lockKey, '1', { nx: true, ex: 30 })
  if (!acquired) {
    throw new ConflictError('Duplicate request in flight — retry in 30 seconds')
  }

  try {
    const result = await operation()
    await redis.set(cacheKey, JSON.stringify(result), { ex: ttlSeconds })
    return result
  } finally {
    await redis.del(lockKey)
  }
}
