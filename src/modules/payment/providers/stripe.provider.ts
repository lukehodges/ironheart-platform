import Stripe from 'stripe'
import { BadRequestError } from '@/shared/errors'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'payment.stripe' })

// Lazy init -- never construct at module load time
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
      apiVersion: '2026-01-28.clover',
    })
  }
  return _stripe
}

export interface CreatePaymentIntentInput {
  amount: number           // in pence/cents
  currency: string
  customerId?: string
  bookingId?: string
  stripeConnectAccountId?: string
  platformFeeAmount?: number
  idempotencyKey?: string
}

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe()

  const params: Stripe.PaymentIntentCreateParams = {
    amount:   Math.round(input.amount * 100), // convert to smallest unit
    currency: input.currency.toLowerCase(),
    metadata: {
      bookingId:  input.bookingId  ?? '',
      customerId: input.customerId ?? '',
    },
  }

  if (input.stripeConnectAccountId) {
    params.transfer_data       = { destination: input.stripeConnectAccountId }
    params.application_fee_amount = input.platformFeeAmount
      ? Math.round(input.platformFeeAmount * 100)
      : undefined
  }

  try {
    return await stripe.paymentIntents.create(
      params,
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    )
  } catch (err: unknown) {
    const stripeErr = err as Stripe.errors.StripeError
    log.error({ code: stripeErr.code, message: stripeErr.message }, 'Stripe createPaymentIntent failed')
    throw new BadRequestError(stripeErr.message ?? 'Payment processing failed')
  }
}

export async function constructStripeEvent(rawBody: string, signature: string, secret: string): Promise<Stripe.Event> {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
