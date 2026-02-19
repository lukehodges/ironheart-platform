import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Mock the developer repository before importing the module under test.
// ---------------------------------------------------------------------------
vi.mock('../developer.repository', () => ({
  recordDelivery:       vi.fn().mockResolvedValue(undefined),
  incrementFailureCount: vi.fn().mockResolvedValue(1),
  markEndpointStatus:   vi.fn().mockResolvedValue(undefined),
  findActiveEndpoints:  vi.fn().mockResolvedValue([]),
}))

// Mock the logger so tests stay silent
vi.mock('@/shared/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info:  vi.fn(),
      warn:  vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

import { createHmacSignature, verifyHmacSignature, deliverWebhook } from '../lib/webhook-delivery'
import * as developerRepository from '../developer.repository'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEndpoint(overrides: Partial<{
  id: string
  tenantId: string
  url: string
  secret: string
  status: 'ACTIVE' | 'DISABLED' | 'FAILING'
  failureCount: number
}> = {}): import('../developer.types').WebhookEndpoint {
  return {
    id:                'ep-1',
    tenantId:          'tenant-1',
    url:               'https://example.com/webhook',
    secret:            'super-secret',
    description:       null,
    events:            ['booking.created'],
    status:            'ACTIVE',
    failureCount:      0,
    lastSuccessAt:     null,
    lastFailureAt:     null,
    lastFailureReason: null,
    createdAt:         new Date(),
    updatedAt:         new Date(),
    ...overrides,
  }
}

function makeFetchOk(status = 200): Response {
  return {
    ok:     true,
    status,
    json:   async () => ({}),
    text:   async () => '',
  } as unknown as Response
}

function makeFetchError(status: number): Response {
  return {
    ok:     false,
    status,
    json:   async () => ({}),
    text:   async () => 'Internal Server Error',
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// createHmacSignature
// ---------------------------------------------------------------------------

describe('createHmacSignature', () => {
  it('produces a hex string of the expected length (64 chars for sha256)', () => {
    const sig = createHmacSignature('hello world', 'secret')
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic: same inputs always produce the same signature', () => {
    const body   = JSON.stringify({ id: '123', event: 'booking.created' })
    const secret = 'my-signing-secret'
    const sig1   = createHmacSignature(body, secret)
    const sig2   = createHmacSignature(body, secret)
    expect(sig1).toBe(sig2)
  })

  it('produces a different signature when the body differs', () => {
    const secret = 'same-secret'
    const sig1   = createHmacSignature('body-a', secret)
    const sig2   = createHmacSignature('body-b', secret)
    expect(sig1).not.toBe(sig2)
  })

  it('produces a different signature when the secret differs', () => {
    const body = 'same-body'
    const sig1 = createHmacSignature(body, 'secret-1')
    const sig2 = createHmacSignature(body, 'secret-2')
    expect(sig1).not.toBe(sig2)
  })

  it('matches crypto.createHmac sha256 directly', () => {
    const body   = '{"event":"test"}'
    const secret = 'test-key'
    const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    expect(createHmacSignature(body, secret)).toBe(expected)
  })

  it('handles empty body without throwing and returns a valid hex signature', () => {
    const sig = createHmacSignature('', 'secret')
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[0-9a-f]+$/)
  })
})

// ---------------------------------------------------------------------------
// verifyHmacSignature
// ---------------------------------------------------------------------------

describe('verifyHmacSignature', () => {
  it('returns true when the received signature matches the computed signature', () => {
    const body     = '{"id":"abc","event":"booking.created"}'
    const secret   = 'webhook-secret'
    const computed = createHmacSignature(body, secret)
    expect(verifyHmacSignature(body, secret, computed)).toBe(true)
  })

  it('returns false when the received signature is wrong', () => {
    const body     = '{"id":"abc","event":"booking.created"}'
    const secret   = 'webhook-secret'
    const bad      = 'a'.repeat(64)
    expect(verifyHmacSignature(body, secret, bad)).toBe(false)
  })

  it('returns false for a completely different signature', () => {
    const body   = 'payload'
    const secret = 'secret'
    expect(verifyHmacSignature(body, secret, 'wrong')).toBe(false)
  })

  it('is timing-safe: partial prefix match still fails', () => {
    const body     = 'payload'
    const secret   = 'secret'
    const computed = createHmacSignature(body, secret)
    // Take first half — different length → should fail
    const partial  = computed.slice(0, 32)
    expect(verifyHmacSignature(body, secret, partial)).toBe(false)
  })

  it('returns false when body differs even if secret is the same', () => {
    const secret   = 'same-secret'
    const validSig = createHmacSignature('original-body', secret)
    expect(verifyHmacSignature('tampered-body', secret, validSig)).toBe(false)
  })

  it('handles empty body verification correctly', () => {
    const secret   = 'secret'
    const computed = createHmacSignature('', secret)
    expect(verifyHmacSignature('', secret, computed)).toBe(true)
  })

  it('returns true when verifying against a freshly computed signature (round-trip)', () => {
    const body   = JSON.stringify({ id: 'evt-999', data: { amount: 500 } })
    const secret = 'round-trip-secret'
    const sig    = createHmacSignature(body, secret)
    expect(verifyHmacSignature(body, secret, sig)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// deliverWebhook
// ---------------------------------------------------------------------------

describe('deliverWebhook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(developerRepository.recordDelivery).mockResolvedValue(undefined)
    vi.mocked(developerRepository.markEndpointStatus).mockResolvedValue(undefined)
    vi.mocked(developerRepository.incrementFailureCount).mockResolvedValue(1)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('SUCCESS: fetch returns 200 → result status is SUCCESS', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(makeFetchOk(200))

    const endpoint = makeEndpoint()
    const result   = await deliverWebhook(endpoint, { name: 'booking.created', data: { id: '1' } })

    expect(result.status).toBe('SUCCESS')
    expect(result.responseStatus).toBe(200)
  })

  it('SUCCESS: records the delivery with status SUCCESS', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    await deliverWebhook(makeEndpoint(), { name: 'booking.created', data: {} })

    expect(developerRepository.recordDelivery).toHaveBeenCalledOnce()
    const call = vi.mocked(developerRepository.recordDelivery).mock.calls[0]![0]
    expect(call.status).toBe('SUCCESS')
    expect(call.responseStatus).toBe(200)
  })

  it('SUCCESS: marks endpoint status as ACTIVE after success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    await deliverWebhook(makeEndpoint({ id: 'ep-42' }), { name: 'test', data: {} })

    expect(developerRepository.markEndpointStatus).toHaveBeenCalledWith('ep-42', 'ACTIVE')
  })

  it('SUCCESS: includes X-Webhook-Signature header in the fetch call', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    await deliverWebhook(makeEndpoint({ secret: 'my-secret' }), { name: 'test', data: {} })

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers  = init?.headers as Record<string, string>
    expect(headers['X-Webhook-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/)
  })

  it('SUCCESS: includes correct X-Webhook-Event header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    await deliverWebhook(makeEndpoint(), { name: 'booking.confirmed', data: {} })

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers  = init?.headers as Record<string, string>
    expect(headers['X-Webhook-Event']).toBe('booking.confirmed')
  })

  it('SUCCESS: uses POST method', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    await deliverWebhook(makeEndpoint(), { name: 'test', data: {} })

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    expect(init?.method).toBe('POST')
  })

  it('SUCCESS: posts to the endpoint URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    await deliverWebhook(makeEndpoint({ url: 'https://hooks.myapp.com/recv' }), { name: 'test', data: {} })

    const [url] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe('https://hooks.myapp.com/recv')
  })

  it('FAILURE: when all attempts return 500, result status is FAILED', async () => {
    // 6 attempts total (1 initial + 5 retries), all failing
    // We mock each sleep so retries run immediately
    vi.mocked(fetch).mockResolvedValue(makeFetchError(500))

    const deliverPromise = deliverWebhook(makeEndpoint(), { name: 'test', data: {} })

    // Advance timers for all 5 retry delays: 10s, 60s, 5m, 30m, 2h
    for (const delay of [10_000, 60_000, 300_000, 1_800_000, 7_200_000]) {
      await vi.advanceTimersByTimeAsync(delay)
    }

    const result = await deliverPromise
    expect(result.status).toBe('FAILED')
  })

  it('FAILURE: incrementFailureCount is called after all retries fail', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchError(500))

    const deliverPromise = deliverWebhook(makeEndpoint({ id: 'ep-fail' }), { name: 'test', data: {} })
    for (const delay of [10_000, 60_000, 300_000, 1_800_000, 7_200_000]) {
      await vi.advanceTimersByTimeAsync(delay)
    }
    await deliverPromise

    expect(developerRepository.incrementFailureCount).toHaveBeenCalledWith('ep-fail')
  })

  it('FAILURE: records delivery with status FAILED after all retries fail', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchError(500))

    const deliverPromise = deliverWebhook(makeEndpoint(), { name: 'test', data: {} })
    for (const delay of [10_000, 60_000, 300_000, 1_800_000, 7_200_000]) {
      await vi.advanceTimersByTimeAsync(delay)
    }
    await deliverPromise

    const recordCall = vi.mocked(developerRepository.recordDelivery).mock.calls.at(-1)![0]
    expect(recordCall.status).toBe('FAILED')
    expect(recordCall.deliveredAt).toBeNull()
  })

  it('FAILURE: marks endpoint FAILING after 3+ failures (incrementFailureCount returns 3)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchError(500))
    vi.mocked(developerRepository.incrementFailureCount).mockResolvedValue(3)

    const deliverPromise = deliverWebhook(makeEndpoint(), { name: 'test', data: {} })
    for (const delay of [10_000, 60_000, 300_000, 1_800_000, 7_200_000]) {
      await vi.advanceTimersByTimeAsync(delay)
    }
    await deliverPromise

    expect(developerRepository.markEndpointStatus).toHaveBeenCalledWith(expect.any(String), 'FAILING')
  })

  it('FAILURE: marks endpoint DISABLED when failureCount reaches 10', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchError(500))
    vi.mocked(developerRepository.incrementFailureCount).mockResolvedValue(10)

    const deliverPromise = deliverWebhook(makeEndpoint(), { name: 'test', data: {} })
    for (const delay of [10_000, 60_000, 300_000, 1_800_000, 7_200_000]) {
      await vi.advanceTimersByTimeAsync(delay)
    }
    await deliverPromise

    expect(developerRepository.markEndpointStatus).toHaveBeenCalledWith(expect.any(String), 'DISABLED')
  })

  it('succeeds on second attempt: first fails, second returns 200', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchError(503))
      .mockResolvedValueOnce(makeFetchOk(200))

    const deliverPromise = deliverWebhook(makeEndpoint(), { name: 'test', data: {} })
    // Advance past first retry delay
    await vi.advanceTimersByTimeAsync(10_000)
    const result = await deliverPromise

    expect(result.status).toBe('SUCCESS')
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it('HMAC signature in header matches computed signature from request body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchOk(200))

    const secret = 'verify-me'
    await deliverWebhook(makeEndpoint({ secret }), { name: 'booking.created', data: { id: 'b1' } })

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers  = init?.headers as Record<string, string>
    const bodyStr  = init?.body as string
    const sigHeader = headers['X-Webhook-Signature']!

    // Strip "sha256=" prefix
    const receivedHex = sigHeader.replace('sha256=', '')
    expect(verifyHmacSignature(bodyStr, secret, receivedHex)).toBe(true)
  })
})
