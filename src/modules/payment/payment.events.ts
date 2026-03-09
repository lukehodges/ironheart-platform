import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import * as paymentService from './payment.service'
import * as paymentRepository from './payment.repository'

const log = logger.child({ module: 'payment.events' })

export const handleStripeWebhook = inngest.createFunction(
  { id: 'handle-stripe-webhook', retries: 3 },
  { event: 'stripe/webhook.received' },
  async ({ event, step }) => {
    const { eventType, stripeEventId, payload } = event.data

    log.info({ eventType, stripeEventId }, 'Stripe webhook received')

    switch (eventType) {
      case 'payment_intent.succeeded': {
        const result = await step.run('handle-payment-succeeded', async () => {
          const paymentIntent = payload as {
            id: string
            amount: number
            currency: string
            metadata?: { invoiceId?: string; tenantId?: string; bookingId?: string }
          }

          const invoiceId = paymentIntent.metadata?.invoiceId
          const tenantId = paymentIntent.metadata?.tenantId
          const bookingId = paymentIntent.metadata?.bookingId

          if (!invoiceId || !tenantId) {
            log.warn(
              { stripeEventId, paymentIntentId: paymentIntent.id },
              'Payment intent succeeded but missing invoiceId or tenantId in metadata - skipping'
            )
            return null
          }

          // Amount from Stripe is in minor units (pence/cents), convert to major units
          const amountInMajor = paymentIntent.amount / 100

          // Record the payment against the invoice (this also updates invoice status)
          const payment = await paymentService.recordPayment(tenantId, {
            invoiceId,
            bookingId: bookingId ?? null,
            amount: amountInMajor,
            method: 'CARD',
            stripePaymentIntentId: paymentIntent.id,
          })

          log.info(
            { tenantId, invoiceId, paymentId: payment.id, amount: amountInMajor },
            'Stripe payment recorded successfully'
          )

          return { paymentId: payment.id, tenantId, bookingId, amount: amountInMajor }
        })

        // Emit payment/intent.succeeded event for downstream consumers (e.g. workflows)
        if (result) {
          await step.run('emit-payment-succeeded', async () => {
            await inngest.send({
              name: 'payment/intent.succeeded',
              data: {
                paymentIntentId: (payload as { id: string }).id,
                bookingId: result.bookingId ?? '',
                tenantId: result.tenantId,
                amount: result.amount,
              },
            })
          })
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const result = await step.run('handle-payment-failed', async () => {
          const paymentIntent = payload as {
            id: string
            last_payment_error?: { message?: string; code?: string }
            metadata?: { invoiceId?: string; tenantId?: string; bookingId?: string }
          }

          const tenantId = paymentIntent.metadata?.tenantId
          const bookingId = paymentIntent.metadata?.bookingId
          const errorMessage =
            paymentIntent.last_payment_error?.message ?? 'Unknown payment failure'
          const errorCode = paymentIntent.last_payment_error?.code ?? 'unknown'

          log.warn(
            { stripeEventId, paymentIntentId: paymentIntent.id, errorMessage, errorCode, tenantId },
            'Payment intent failed'
          )

          // If we have an existing payment record for this intent, mark it as FAILED
          const existingPayment = await paymentRepository.findPaymentByStripePaymentIntentId(
            paymentIntent.id
          )
          if (existingPayment) {
            await paymentRepository.updatePaymentStatus(existingPayment.id, 'FAILED')
            log.info(
              { paymentId: existingPayment.id, paymentIntentId: paymentIntent.id },
              'Marked existing payment as FAILED'
            )
          }

          return { paymentIntentId: paymentIntent.id, tenantId, bookingId, errorMessage }
        })

        // Emit payment/intent.failed event for downstream consumers
        if (result?.tenantId) {
          await step.run('emit-payment-failed', async () => {
            await inngest.send({
              name: 'payment/intent.failed',
              data: {
                paymentIntentId: result.paymentIntentId,
                bookingId: result.bookingId ?? '',
                tenantId: result.tenantId!,
                error: result.errorMessage,
              },
            })
          })
        }
        break
      }

      case 'charge.dispute.created': {
        const result = await step.run('handle-dispute', async () => {
          const dispute = payload as {
            id: string
            amount: number
            currency: string
            payment_intent?: string
            reason?: string
            charge?: string
          }

          log.warn(
            { stripeEventId, disputeId: dispute.id, amount: dispute.amount, reason: dispute.reason },
            'Charge dispute created'
          )

          let tenantId: string | null = null
          let paymentId: string | null = null

          // Look up the associated payment via the payment intent
          if (dispute.payment_intent) {
            const payment = await paymentRepository.findPaymentByStripePaymentIntentId(
              dispute.payment_intent
            )
            if (payment) {
              paymentId = payment.id
              tenantId = payment.tenantId

              // Mark the payment as disputed (use CANCELLED status since there's no DISPUTED enum)
              await paymentRepository.updatePaymentStatus(payment.id, 'CANCELLED', {
                notes: `Dispute ${dispute.id}: ${dispute.reason ?? 'no reason provided'}`,
              })

              log.info(
                { paymentId: payment.id, disputeId: dispute.id },
                'Marked payment as disputed'
              )
            } else {
              log.warn(
                { paymentIntentId: dispute.payment_intent, disputeId: dispute.id },
                'Could not find payment for disputed payment intent'
              )
            }
          }

          // Amount from Stripe is in minor units
          const amountInMajor = dispute.amount / 100

          return { disputeId: dispute.id, paymentId, tenantId, amount: amountInMajor }
        })

        // Emit payment/dispute.created event for downstream consumers
        if (result?.tenantId && result?.paymentId) {
          await step.run('emit-dispute-created', async () => {
            await inngest.send({
              name: 'payment/dispute.created',
              data: {
                disputeId: result.disputeId,
                paymentId: result.paymentId!,
                tenantId: result.tenantId!,
                amount: result.amount,
              },
            })
          })
        }
        break
      }

      default:
        log.info({ eventType }, 'Unhandled Stripe webhook event type')
    }
  }
)

export const overdueInvoiceCron = inngest.createFunction(
  { id: 'overdue-invoice-cron', retries: 2 },
  { cron: '0 9 * * *' }, // Daily at 9am
  async ({ step }) => {
    const overdueInvoices = await step.run('find-overdue-invoices', async () => {
      const rows = await paymentRepository.findOverdueInvoices()
      log.info({ count: rows.length }, 'Found overdue invoices')
      return rows
    })

    if (overdueInvoices.length === 0) {
      log.info('No overdue invoices to process')
      return { marked: 0 }
    }

    let markedCount = 0

    await step.run('mark-overdue-invoices', async () => {
      for (const invoice of overdueInvoices) {
        const updated = await paymentRepository.updateInvoiceStatus(
          invoice.id,
          invoice.tenantId,
          invoice.version,
          'OVERDUE'
        )
        if (updated) {
          markedCount++
        } else {
          // Version conflict means another process updated this invoice - skip it (idempotent)
          log.info({ invoiceId: invoice.id }, 'Skipped invoice due to version conflict')
        }
      }
      log.info({ markedCount }, 'Marked invoices as overdue')
    })

    return { marked: markedCount }
  }
)
