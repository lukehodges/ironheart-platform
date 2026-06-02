// src/modules/integrations/providers/stripe.queries.ts
/**
 * Pull-on-demand Stripe queries. NOT routed via raw_events — these are
 * direct API reads for Claude / the app to call when it needs current
 * Stripe state (MRR, active subs, recent payments).
 *
 * Per-tenant credential resolution: each query loads the API key for
 * the tenant's `integration_connections` row where provider_slug = 'stripe'.
 *
 * v1: the secrets_ref decryption mechanism is not yet built — fall back to
 *   process.env.STRIPE_SECRET_KEY. Fine for Luke's single-tenant deployment.
 *   See report.
 */
import Stripe from 'stripe'
import { db } from '@/shared/db'
import { integrationConnections } from '@/shared/db/schema'
import { and, eq } from 'drizzle-orm'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'stripe.queries' })

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/**
 * Resolve a Stripe API key for a tenant.
 * 1. Look up `integration_connections` row.
 * 2. If `secretsRef` set → TODO: decrypt via vault (not implemented).
 * 3. Fallback → process.env.STRIPE_SECRET_KEY.
 */
async function resolveStripeClient(tenantId: string): Promise<Stripe> {
  const [conn] = await db
    .select({ secretsRef: integrationConnections.secretsRef, enabled: integrationConnections.enabled })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, tenantId),
        eq(integrationConnections.providerSlug, 'stripe'),
      ),
    )
    .limit(1)

  if (conn && conn.enabled && conn.secretsRef) {
    // TODO: decrypt secretsRef via vault. For now we still fall back to env.
    log.debug(
      { tenantId },
      'integration_connections row found with secretsRef; vault decryption not implemented — using env STRIPE_SECRET_KEY',
    )
  }

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      `Stripe API key not resolvable for tenant ${tenantId} (no vault secret + STRIPE_SECRET_KEY unset)`,
    )
  }
  return new Stripe(key)
}

// ---------------------------------------------------------------------------
// MRR
// ---------------------------------------------------------------------------

export interface MRRResult {
  mrr: number
  currency: string
  activeSubscriptions: number
}

/**
 * Sum of all active subscription items, normalised to monthly recurring revenue.
 * - year interval → divided by 12
 * - week interval → multiplied by ~4.345
 * - day interval → multiplied by ~30
 *
 * Currency is taken from the first subscription encountered. Mixed-currency
 * tenants get a warning logged.
 */
export async function getMRR(tenantId: string): Promise<MRRResult> {
  const stripe = await resolveStripeClient(tenantId)
  let mrr = 0
  let currency: string | null = null
  let activeSubscriptions = 0
  let mixedCurrency = false

  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
    activeSubscriptions += 1
    for (const item of sub.items.data) {
      const price = item.price
      const recurring = price.recurring
      if (!recurring || !price.unit_amount) continue

      const unitAmount = price.unit_amount * (item.quantity ?? 1)
      const perMonth = normaliseToMonthly(unitAmount, recurring.interval, recurring.interval_count)
      mrr += perMonth

      if (!currency) currency = price.currency
      else if (currency !== price.currency) mixedCurrency = true
    }
  }

  if (mixedCurrency) {
    log.warn({ tenantId, currency }, 'getMRR encountered mixed currencies; returning total in first-seen currency')
  }

  return {
    mrr: Math.round(mrr),
    currency: currency ?? 'usd',
    activeSubscriptions,
  }
}

function normaliseToMonthly(amount: number, interval: Stripe.Price.Recurring.Interval, count: number): number {
  const perInterval = amount / count
  switch (interval) {
    case 'day':
      return perInterval * 30
    case 'week':
      return perInterval * (52 / 12)
    case 'month':
      return perInterval
    case 'year':
      return perInterval / 12
    default:
      return perInterval
  }
}

// ---------------------------------------------------------------------------
// Active subscriptions
// ---------------------------------------------------------------------------

export interface ActiveSubscriptionRow {
  customerId: string
  productName: string
  amount: number
  currency: string
  interval: string
  status: string
  currentPeriodEnd: Date
}

export async function getActiveSubscriptions(tenantId: string): Promise<ActiveSubscriptionRow[]> {
  const stripe = await resolveStripeClient(tenantId)
  const out: ActiveSubscriptionRow[] = []

  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.items.data.price.product'] })) {
    for (const item of sub.items.data) {
      const price = item.price
      const product = price.product as Stripe.Product | string | null
      const productName =
        product && typeof product !== 'string' && 'name' in product ? product.name : (typeof product === 'string' ? product : 'unknown')

      out.push({
        customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        productName,
        amount: (price.unit_amount ?? 0) * (item.quantity ?? 1),
        currency: price.currency,
        interval: price.recurring?.interval ?? 'unknown',
        status: sub.status,
        currentPeriodEnd: new Date(
          (sub.items.data[0]?.current_period_end ?? 0) * 1000,
        ),
      })
    }
  }

  return out
}

// ---------------------------------------------------------------------------
// Recent payments
// ---------------------------------------------------------------------------

export interface RecentPaymentRow {
  id: string
  amount: number
  currency: string
  customerId: string | null
  status: string
  createdAt: Date
}

export async function getRecentPayments(tenantId: string, days: number): Promise<RecentPaymentRow[]> {
  const stripe = await resolveStripeClient(tenantId)
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const out: RecentPaymentRow[] = []

  for await (const pi of stripe.paymentIntents.list({ created: { gte: since }, limit: 100 })) {
    if (pi.status !== 'succeeded') continue
    out.push({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      customerId: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null,
      status: pi.status,
      createdAt: new Date(pi.created * 1000),
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// Failed charges
// ---------------------------------------------------------------------------

export interface FailedChargeRow {
  id: string
  amount: number
  customerId: string | null
  failureReason: string | null
  createdAt: Date
}

export async function getFailedCharges(tenantId: string, days: number): Promise<FailedChargeRow[]> {
  const stripe = await resolveStripeClient(tenantId)
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const out: FailedChargeRow[] = []

  for await (const charge of stripe.charges.list({ created: { gte: since }, limit: 100 })) {
    if (charge.status !== 'failed') continue
    out.push({
      id: charge.id,
      amount: charge.amount,
      customerId: typeof charge.customer === 'string' ? charge.customer : charge.customer?.id ?? null,
      failureReason: charge.failure_message ?? charge.failure_code ?? null,
      createdAt: new Date(charge.created * 1000),
    })
  }

  return out
}
