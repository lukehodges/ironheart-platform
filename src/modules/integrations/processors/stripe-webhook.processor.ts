// src/modules/integrations/processors/stripe-webhook.processor.ts
/**
 * Stripe webhook processors — drain Stripe-source raw_events into the
 * domain event outbox.
 *
 * Registration happens at module load (import for side effects). The
 * integrations module index re-exports this file so registration runs
 * whenever the integrations module is loaded.
 */
import { registerProcessor } from '@/modules/jobs/processors/processor.registry'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'stripe-webhook.processor' })

interface StripeEventLike {
  data?: { object?: Record<string, unknown> }
}

function extractObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null
  const data = (payload as StripeEventLike).data
  if (!data || typeof data !== 'object') return null
  const obj = data.object
  if (!obj || typeof obj !== 'object') return null
  return obj as Record<string, unknown>
}

// ─── payment_intent.succeeded ─────────────────────────────────────────────
registerProcessor({
  source: 'stripe',
  kind: 'payment_intent.succeeded',
  version: 1,
  async handle(ctx, payload) {
    const obj = extractObject(payload)
    if (!obj) {
      log.warn({ rawEventId: ctx.rawEventId }, 'payment_intent.succeeded missing data.object')
      return { ok: true }
    }

    const customerExternalId = typeof obj.customer === 'string' ? obj.customer : null
    let contactId: string | undefined
    let companyId: string | undefined

    if (customerExternalId) {
      const resolved = await ctx.resolveContact({
        source: 'stripe',
        externalId: customerExternalId,
        autoCreate: false,
      })
      if (resolved) {
        contactId = resolved.contactId
        companyId = resolved.companyId
      }
    }

    await ctx.emit({
      kind: 'payment.received',
      entityType: contactId ? 'contact' : undefined,
      entityId: contactId,
      payload: {
        amount: typeof obj.amount === 'number' ? obj.amount : 0,
        currency: typeof obj.currency === 'string' ? obj.currency : 'usd',
        customerId: customerExternalId,
        contactId,
        companyId,
        paymentIntentId: typeof obj.id === 'string' ? obj.id : null,
      },
      actor: 'stripe-webhook',
    })

    return { ok: true }
  },
})

// ─── invoice.paid ──────────────────────────────────────────────────────────
registerProcessor({
  source: 'stripe',
  kind: 'invoice.paid',
  version: 1,
  async handle(ctx, payload) {
    const obj = extractObject(payload)
    if (!obj) {
      log.warn({ rawEventId: ctx.rawEventId }, 'invoice.paid missing data.object')
      return { ok: true }
    }

    const customerExternalId = typeof obj.customer === 'string' ? obj.customer : null
    let contactId: string | undefined

    if (customerExternalId) {
      const resolved = await ctx.resolveContact({
        source: 'stripe',
        externalId: customerExternalId,
        autoCreate: false,
      })
      contactId = resolved?.contactId
    }

    await ctx.emit({
      kind: 'invoice.paid',
      entityType: contactId ? 'contact' : undefined,
      entityId: contactId,
      payload: {
        amount: typeof obj.amount_paid === 'number' ? obj.amount_paid : 0,
        currency: typeof obj.currency === 'string' ? obj.currency : 'usd',
        invoiceId: typeof obj.id === 'string' ? obj.id : null,
        customerId: customerExternalId,
      },
      actor: 'stripe-webhook',
    })

    return { ok: true }
  },
})

// ─── stub processors (log only) ────────────────────────────────────────────
const STUB_KINDS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
] as const

for (const kind of STUB_KINDS) {
  registerProcessor({
    source: 'stripe',
    kind,
    version: 1,
    async handle(ctx, payload) {
      const obj = extractObject(payload)
      log.info(
        {
          rawEventId: ctx.rawEventId,
          tenantId: ctx.tenantId,
          kind,
          objectId: obj && typeof obj.id === 'string' ? obj.id : null,
        },
        'Stripe webhook stub processor — no app action wired',
      )
      return { ok: true }
    },
  })
}
