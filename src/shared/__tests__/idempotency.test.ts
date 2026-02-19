import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictError } from '../errors'

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

// Stateful Redis store: tracks what has been set so get() returns it
const redisStore: Record<string, string> = {}

vi.mock('@/shared/redis', () => ({
  redis: {
    get: vi.fn((key: string) => Promise.resolve(redisStore[key] ?? null)),
    set: vi.fn(
      (
        key: string,
        value: unknown,
        opts?: { nx?: boolean; ex?: number },
      ) => {
        if (opts?.nx) {
          // NX = only set if key not already present (lock semantics)
          if (redisStore[key] !== undefined) return Promise.resolve(null)
          redisStore[key] = String(value)
          return Promise.resolve('OK')
        }
        redisStore[key] = String(value)
        return Promise.resolve('OK')
      },
    ),
    del: vi.fn((key: string) => {
      delete redisStore[key]
      return Promise.resolve(1)
    }),
  },
}))

// ---------------------------------------------------------------------------
// Module under test — imported AFTER mocks are registered
// ---------------------------------------------------------------------------

import { withIdempotency } from '../idempotency'
import { redis } from '@/shared/redis'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEY = 'test-idempotency-key'
const TTL = 300

/** Reset shared state between tests. */
function clearStore() {
  for (const k of Object.keys(redisStore)) {
    delete redisStore[k]
  }
}

/** Reinstall stateful mock implementations after vi.clearAllMocks(). */
function reinstallMocks() {
  vi.mocked(redis.get).mockImplementation((key: string) =>
    Promise.resolve(redisStore[key] ?? null),
  )
  vi.mocked(redis.set).mockImplementation(
    (key: string, value: unknown, opts?: { nx?: boolean; ex?: number }) => {
      if (opts?.nx) {
        if (redisStore[key] !== undefined) return Promise.resolve(null)
        redisStore[key] = String(value)
        return Promise.resolve('OK')
      }
      redisStore[key] = String(value)
      return Promise.resolve('OK')
    },
  )
  vi.mocked(redis.del).mockImplementation((key: string) => {
    delete redisStore[key]
    return Promise.resolve(1)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('withIdempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearStore()
    reinstallMocks()
  })

  // ── Cache hit ─────────────────────────────────────────────────────────────

  describe('cache hit', () => {
    it('returns cached result without calling operation', async () => {
      const cachedPayload = { id: 'booking-1', status: 'CONFIRMED' }
      // Pre-populate cache key
      redisStore[`idempotency:${KEY}`] = JSON.stringify(cachedPayload)

      const operation = vi.fn().mockResolvedValue({ id: 'booking-NEW' })
      const result = await withIdempotency(KEY, TTL, operation)

      expect(result).toEqual(cachedPayload)
      expect(operation).not.toHaveBeenCalled()
    })

    it('does not acquire lock on cache hit', async () => {
      redisStore[`idempotency:${KEY}`] = JSON.stringify({ ok: true })

      await withIdempotency(KEY, TTL, vi.fn())

      // redis.set should not have been called (no lock needed)
      expect(redis.set).not.toHaveBeenCalled()
    })

    it('parses JSON from cache and returns typed result', async () => {
      const payload = { count: 42, tags: ['a', 'b'] }
      redisStore[`idempotency:${KEY}`] = JSON.stringify(payload)

      const result = await withIdempotency<typeof payload>(KEY, TTL, vi.fn())

      expect(result.count).toBe(42)
      expect(result.tags).toEqual(['a', 'b'])
    })

    it('checks the prefixed cache key (idempotency:{key})', async () => {
      redisStore[`idempotency:${KEY}`] = JSON.stringify({ hit: true })

      await withIdempotency(KEY, TTL, vi.fn())

      expect(redis.get).toHaveBeenCalledWith(`idempotency:${KEY}`)
    })
  })

  // ── Cache miss / fresh execution ──────────────────────────────────────────

  describe('cache miss — fresh execution', () => {
    it('calls operation when cache is empty', async () => {
      const operation = vi.fn().mockResolvedValue({ id: 'new-booking' })

      await withIdempotency(KEY, TTL, operation)

      expect(operation).toHaveBeenCalledOnce()
    })

    it('returns the operation result', async () => {
      const expected = { id: 'res-1', value: 'hello' }
      const operation = vi.fn().mockResolvedValue(expected)

      const result = await withIdempotency(KEY, TTL, operation)

      expect(result).toEqual(expected)
    })

    it('caches result in Redis with the given TTL', async () => {
      const payload = { bookingId: 'bk-1' }
      const operation = vi.fn().mockResolvedValue(payload)

      await withIdempotency(KEY, TTL, operation)

      // The cache set call — not the lock set — uses { ex: TTL }
      const cacheSetCall = vi.mocked(redis.set).mock.calls.find(
        ([k, , opts]) => k === `idempotency:${KEY}` && (opts as any)?.ex === TTL,
      )
      expect(cacheSetCall).toBeDefined()
      expect(cacheSetCall![1]).toBe(JSON.stringify(payload))
    })

    it('acquires lock with NX option before calling operation', async () => {
      const operation = vi.fn().mockResolvedValue({ ok: true })

      await withIdempotency(KEY, TTL, operation)

      expect(redis.set).toHaveBeenCalledWith(
        `idempotency:lock:${KEY}`,
        '1',
        expect.objectContaining({ nx: true }),
      )
    })

    it('sets lock with 30-second expiry', async () => {
      const operation = vi.fn().mockResolvedValue({})

      await withIdempotency(KEY, TTL, operation)

      expect(redis.set).toHaveBeenCalledWith(
        `idempotency:lock:${KEY}`,
        '1',
        expect.objectContaining({ ex: 30 }),
      )
    })
  })

  // ── Duplicate in-flight (lock already held) ───────────────────────────────

  describe('duplicate in-flight request', () => {
    it('throws ConflictError when lock is already held', async () => {
      // Pre-populate lock key so NX fails
      redisStore[`idempotency:lock:${KEY}`] = '1'

      const operation = vi.fn().mockResolvedValue({ ok: true })

      await expect(withIdempotency(KEY, TTL, operation)).rejects.toThrow(
        ConflictError,
      )
    })

    it('does not call operation when lock is already held', async () => {
      redisStore[`idempotency:lock:${KEY}`] = '1'
      const operation = vi.fn()

      await expect(withIdempotency(KEY, TTL, operation)).rejects.toThrow()

      expect(operation).not.toHaveBeenCalled()
    })

    it('ConflictError message mentions retry duration', async () => {
      redisStore[`idempotency:lock:${KEY}`] = '1'

      await expect(withIdempotency(KEY, TTL, vi.fn())).rejects.toThrow(
        /retry/i,
      )
    })
  })

  // ── Lock release ──────────────────────────────────────────────────────────

  describe('lock release', () => {
    it('releases lock after successful operation', async () => {
      const operation = vi.fn().mockResolvedValue({ ok: true })

      await withIdempotency(KEY, TTL, operation)

      expect(redis.del).toHaveBeenCalledWith(`idempotency:lock:${KEY}`)
    })

    it('releases lock even when operation throws', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('operation failed'))

      await expect(withIdempotency(KEY, TTL, operation)).rejects.toThrow(
        'operation failed',
      )

      expect(redis.del).toHaveBeenCalledWith(`idempotency:lock:${KEY}`)
    })

    it('propagates operation error after releasing lock', async () => {
      const err = new Error('downstream failure')
      const operation = vi.fn().mockRejectedValue(err)

      await expect(withIdempotency(KEY, TTL, operation)).rejects.toBe(err)
    })

    it('does not cache result when operation throws', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(withIdempotency(KEY, TTL, operation)).rejects.toThrow()

      // Cache key should NOT be set (lock key was del'd, that's it)
      expect(redisStore[`idempotency:${KEY}`]).toBeUndefined()
    })
  })

  // ── Key namespacing ───────────────────────────────────────────────────────

  describe('key namespacing', () => {
    it('uses idempotency: prefix for cache key', async () => {
      const operation = vi.fn().mockResolvedValue({})
      await withIdempotency('my-key', TTL, operation)

      const setCalls = vi.mocked(redis.set).mock.calls
      const cacheCall = setCalls.find(([k]) => k === 'idempotency:my-key')
      expect(cacheCall).toBeDefined()
    })

    it('uses idempotency:lock: prefix for lock key', async () => {
      const operation = vi.fn().mockResolvedValue({})
      await withIdempotency('my-key', TTL, operation)

      expect(redis.set).toHaveBeenCalledWith(
        'idempotency:lock:my-key',
        '1',
        expect.objectContaining({ nx: true }),
      )
    })

    it('different keys are independent (no cross-contamination)', async () => {
      const op1 = vi.fn().mockResolvedValue({ source: 'op1' })
      const op2 = vi.fn().mockResolvedValue({ source: 'op2' })

      const r1 = await withIdempotency('key-A', TTL, op1)
      const r2 = await withIdempotency('key-B', TTL, op2)

      expect(r1).toEqual({ source: 'op1' })
      expect(r2).toEqual({ source: 'op2' })
      expect(op1).toHaveBeenCalledOnce()
      expect(op2).toHaveBeenCalledOnce()
    })

    it('second call with same key returns cached result (operation not called twice)', async () => {
      const operation = vi.fn().mockResolvedValue({ result: 42 })

      // First call — executes operation and caches
      await withIdempotency(KEY, TTL, operation)

      // Second call — should hit cache
      const result = await withIdempotency(KEY, TTL, operation)

      expect(result).toEqual({ result: 42 })
      // Operation must only have been called once across both invocations
      expect(operation).toHaveBeenCalledOnce()
    })
  })
})
