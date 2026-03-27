import { type NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  let event: { type: string; id: string; data: { object: Record<string, unknown> } }

  try {
    const { constructStripeEvent } = await import('@/modules/payment/providers/stripe.provider')
    event = await constructStripeEvent(
      rawBody,
      sig,
      process.env['STRIPE_WEBHOOK_SECRET'] ?? ''
    ) as unknown as typeof event
  } catch {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  const obj = event.data.object

  // Route subscription-related events to subscription module
  if (event.type === 'checkout.session.completed' && obj['mode'] === 'subscription') {
    const metadata = (obj['metadata'] ?? {}) as Record<string, string>
    const subscription = obj['subscription'] as string | undefined
    const customer = obj['customer'] as string | undefined

    if (metadata['productSlug'] && subscription && customer) {
      await inngest.send({
        name: 'subscription/checkout.completed',
        data: {
          stripeSessionId: event.id,
          stripeCustomerId: customer,
          stripeSubscriptionId: subscription,
          productSlug: metadata['productSlug'],
          businessName: metadata['businessName'] ?? '',
          email: metadata['email'] ?? '',
          planId: metadata['planId'] ?? '',
        },
      })
      return NextResponse.json({ received: true })
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const subscription = obj['subscription'] as string | undefined
    const customer = obj['customer'] as string | undefined
    if (subscription && customer) {
      await inngest.send({
        name: 'subscription/payment.failed',
        data: {
          stripeSubscriptionId: subscription,
          tenantId: '', // Resolved in handler
          stripeCustomerId: customer,
        },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscriptionId = obj['id'] as string | undefined
    if (subscriptionId) {
      await inngest.send({
        name: 'subscription/cancelled',
        data: {
          stripeSubscriptionId: subscriptionId,
          tenantId: '', // Resolved in handler
        },
      })
    }
  }

  // Fallback: bridge all other events to existing payment handler
  await inngest.send({
    name: 'stripe/webhook.received',
    data: {
      eventType: event.type,
      stripeEventId: event.id,
      payload: obj,
    },
  })

  return NextResponse.json({ received: true })
}
