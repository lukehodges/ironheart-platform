import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'payment.events' })

export const handleStripeWebhook = inngest.createFunction(
  { id: 'handle-stripe-webhook', retries: 3 },
  { event: 'stripe/webhook.received' },
  async ({ event, step }) => {
    const { eventType, stripeEventId, payload } = event.data

    log.info({ eventType, stripeEventId }, 'Stripe webhook received')

    switch (eventType) {
      case 'payment_intent.succeeded':
        await step.run('handle-payment-succeeded', () => {
          log.info({ stripeEventId, payload }, 'Payment intent succeeded')
          // TODO: update payment status in DB
        })
        break

      case 'payment_intent.payment_failed':
        await step.run('handle-payment-failed', () => {
          log.info({ stripeEventId, payload }, 'Payment intent failed')
          // TODO: update payment status, notify tenant
        })
        break

      case 'charge.dispute.created':
        await step.run('handle-dispute', () => {
          log.warn({ stripeEventId, payload }, 'Charge dispute created')
          // TODO: flag booking, notify tenant
        })
        break

      default:
        log.info({ eventType }, 'Unhandled Stripe webhook event type')
    }
  }
)

export const overdueInvoiceCron = inngest.createFunction(
  { id: 'overdue-invoice-cron', retries: 2 },
  { cron: '0 9 * * *' }, // Daily at 9am
  async ({ step }) => {
    await step.run('mark-overdue-invoices', async () => {
      log.info('Checking for overdue invoices')
      // TODO: query invoices with dueDate < NOW() in SENT|VIEWED|PARTIALLY_PAID status
      // and transition to OVERDUE
    })
  }
)
