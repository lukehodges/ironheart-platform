// src/modules/integrations/providers/stripe.provider.ts
import Stripe from 'stripe'
import { ingestRawEvent } from '@/modules/jobs/ingest'
import { logger } from '@/shared/logger'
import type {
  IntegrationProvider,
  DomainEvent,
  IntegrationContext,
  IntegrationResult,
  WebhookPayload,
} from '../integrations.types'

const log = logger.child({ module: 'stripe.provider' })

/**
 * Stripe Integration Provider — read-only + webhook ingestion.
 *
 * Webhooks land in raw_events via ingestRawEvent. Processors in
 * `processors/stripe-webhook.processor.ts` drain them into the
 * outbox or domain side-effects.
 *
 * Pull-on-demand queries (MRR, active subs, recent payments) live in
 * `stripe.queries.ts` and call the Stripe API directly.
 */

// Stripe events we currently emit/handle. Add to this list as we
// wire more processors.
const PRODUCED_KINDS = [
  'payment_intent.succeeded',
  'invoice.paid',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
] as const

export const STRIPE_PRODUCED = PRODUCED_KINDS.map((kind) => ({
  source: 'stripe' as const,
  kind,
}))

/**
 * Lazily resolve a Stripe client. Single-tenant deployment: API key + webhook
 * secret come from env. Per-tenant secrets via `integration_connections.secretsRef`
 * is NOT yet implemented — see report.
 */
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  // apiVersion left undefined → SDK uses its pinned version.
  return new Stripe(key)
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return secret
}

/**
 * Construct a Stripe.Event from the raw webhook payload + signature.
 * Exposed for unit-test injection.
 */
export function verifyStripeWebhook(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret = getWebhookSecret(),
  client: Stripe = getStripeClient(),
): Stripe.Event {
  return client.webhooks.constructEvent(rawBody, signature, webhookSecret)
}

export const stripeProvider: IntegrationProvider = {
  slug: 'stripe',
  name: 'Stripe',
  handles: [],

  async onEvent(_event: DomainEvent, _ctx: IntegrationContext): Promise<IntegrationResult> {
    // Stripe doesn't currently consume any domain events from us — we just
    // ingest webhooks and expose pull queries.
    return { success: true }
  },

  async onWebhook(payload: WebhookPayload, ctx: IntegrationContext): Promise<void> {
    try {
      const signature = payload.headers['stripe-signature']
      if (!signature) {
        log.warn({ tenantId: ctx.tenantId }, 'Stripe webhook missing stripe-signature header')
        return
      }

      // The hub parses JSON before calling us, but Stripe signature verification
      // needs the raw body. Webhook route MUST pass the raw body string via
      // payload.body for signatures to verify; we accept either string or already-
      // parsed object as a graceful fallback (signature will fail on parsed obj).
      const rawBody =
        typeof payload.body === 'string' || Buffer.isBuffer(payload.body)
          ? (payload.body as string | Buffer)
          : JSON.stringify(payload.body)

      const event = verifyStripeWebhook(rawBody, signature)

      await ingestRawEvent({
        source: 'stripe',
        sourceEventId: event.id,
        kind: event.type,
        payload: event as unknown as Record<string, unknown>,
        tenantId: ctx.tenantId,
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      log.warn({ tenantId: ctx.tenantId, error }, 'Stripe webhook ingestion failed')
    }
  },

  getOAuthUrl(_state: string, _redirectUri: string): string {
    // Stripe Connect OAuth is out of scope for v1 (single-tenant deployment).
    // The webhook secret + API key are configured via env vars.
    return ''
  },

  async exchangeCode(
    _code: string,
    _userId: string,
    _tenantId: string,
    _redirectUri: string,
  ): Promise<void> {
    // No OAuth flow — see getOAuthUrl.
  },

  async disconnect(_userId: string, _tenantId: string): Promise<void> {
    // No per-user OAuth tokens to revoke; env-var creds remain.
  },
}
