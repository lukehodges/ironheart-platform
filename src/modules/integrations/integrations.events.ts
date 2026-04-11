// src/modules/integrations/integrations.events.ts
import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { integrationsService } from './integrations.service'

const log = logger.child({ module: 'integrations.events' })

/**
 * Route booking confirmation to connected integrations.
 * Listens to the existing booking/confirmed event — no booking module changes needed.
 */
export const onBookingConfirmed = inngest.createFunction(
  {
    id: 'integrations-on-booking-confirmed',
    name: 'Integrations: Route booking.confirmed',
    retries: 3,
  },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    await step.run('route-to-providers', async () => {
      await integrationsService.routeEvent(
        { type: 'booking.confirmed', data: { bookingId, tenantId } },
        tenantId
      )
    })

    log.info({ bookingId, tenantId }, 'Integration routing complete for booking.confirmed')
  }
)

/**
 * Route booking cancellation to connected integrations.
 */
export const onBookingCancelled = inngest.createFunction(
  {
    id: 'integrations-on-booking-cancelled',
    name: 'Integrations: Route booking.cancelled',
    retries: 3,
  },
  { event: 'booking/cancelled' },
  async ({ event, step }) => {
    const { bookingId, tenantId, reason } = event.data

    await step.run('route-to-providers', async () => {
      await integrationsService.routeEvent(
        { type: 'booking.cancelled', data: { bookingId, tenantId, reason } },
        tenantId
      )
    })

    log.info({ bookingId, tenantId }, 'Integration routing complete for booking.cancelled')
  }
)

/**
 * Process an inbound webhook from an external provider.
 * Fires after the webhook API route responds 200.
 */
export const onIntegrationWebhook = inngest.createFunction(
  {
    id: 'integrations-on-webhook-received',
    name: 'Integrations: Process inbound webhook',
    retries: 2,
  },
  { event: 'integration/webhook.received' },
  async ({ event, step }) => {
    const { providerSlug, headers, body } = event.data

    await step.run('handle-webhook', async () => {
      await integrationsService.handleWebhook(providerSlug, { headers, body })
    })

    log.info({ providerSlug }, 'Integration webhook processed')
  }
)

/** Export for registration in the Inngest serve() handler */
export const integrationsFunctions = [
  onBookingConfirmed,
  onBookingCancelled,
  onIntegrationWebhook,
]
