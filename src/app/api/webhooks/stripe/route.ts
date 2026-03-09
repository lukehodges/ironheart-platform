import { type NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  let event: { type: string; id: string; data: { object: unknown } }

  try {
    const { constructStripeEvent } = await import('@/modules/payment/providers/stripe.provider')
    event = await constructStripeEvent(
      rawBody,
      sig,
      process.env['STRIPE_WEBHOOK_SECRET'] ?? ''
    )
  } catch {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  // Bridge to Inngest - all business logic lives in the durable Inngest handler
  await inngest.send({
    name: 'stripe/webhook.received',
    data: {
      eventType:     event.type,
      stripeEventId: event.id,
      payload:       event.data.object as Record<string, unknown>,
    },
  })

  return NextResponse.json({ received: true })
}
