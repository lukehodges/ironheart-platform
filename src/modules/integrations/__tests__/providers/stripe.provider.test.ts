// src/modules/integrations/__tests__/providers/stripe.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/modules/jobs/ingest', () => ({
  ingestRawEvent: vi.fn(async () => ({ rawEventId: 'raw-1', deduplicated: false })),
}))

vi.mock('@/shared/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import { stripeProvider } from '../../providers/stripe.provider'
import { ingestRawEvent } from '@/modules/jobs/ingest'
import type { IntegrationContext } from '../../integrations.types'

const CTX: IntegrationContext = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  userIntegrationId: '00000000-0000-0000-0000-000000000003',
}

describe('stripeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  })

  it('has slug=stripe and zero handled domain events', () => {
    expect(stripeProvider.slug).toBe('stripe')
    expect(stripeProvider.name).toBe('Stripe')
    expect(stripeProvider.handles).toEqual([])
  })

  it('onWebhook ingests verified events into raw_events', async () => {
    // Stub stripe SDK signature verification by mocking the verifier export
    const fakeEvent = {
      id: 'evt_test_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', amount: 5000, currency: 'gbp', customer: 'cus_1' } },
    }

    // Reach into the module to override the SDK call by mocking webhooks.constructEvent
    const stripeModule = await import('stripe')
    const StripeClass = stripeModule.default
    const verifySpy = vi
      .spyOn(StripeClass.prototype.webhooks as { constructEvent: (...args: unknown[]) => unknown }, 'constructEvent')
      .mockReturnValue(fakeEvent as never)

    await stripeProvider.onWebhook(
      {
        headers: { 'stripe-signature': 't=123,v1=abc' },
        body: JSON.stringify(fakeEvent),
      },
      CTX,
    )

    expect(verifySpy).toHaveBeenCalledOnce()
    expect(ingestRawEvent).toHaveBeenCalledOnce()
    expect(vi.mocked(ingestRawEvent)).toHaveBeenCalledWith({
      source: 'stripe',
      sourceEventId: 'evt_test_123',
      kind: 'payment_intent.succeeded',
      payload: fakeEvent,
      tenantId: CTX.tenantId,
    })
  })

  it('onWebhook bails silently when signature header is missing', async () => {
    await stripeProvider.onWebhook(
      { headers: {}, body: '{}' },
      CTX,
    )
    expect(ingestRawEvent).not.toHaveBeenCalled()
  })

  it('onEvent is a noop (no domain events handled)', async () => {
    const result = await stripeProvider.onEvent(
      { type: 'booking.confirmed', data: { bookingId: 'b1', tenantId: CTX.tenantId } },
      CTX,
    )
    expect(result.success).toBe(true)
  })
})
