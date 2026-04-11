import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import * as developerRepository from './developer.repository'
import { deliverWebhook } from './lib/webhook-delivery'
import type { WebhookEndpoint } from './developer.types'

const log = logger.child({ module: 'developer.events' })

/**
 * Dispatches webhooks to all subscribed endpoints when business events occur.
 * Retries are handled internally by deliverWebhook - Inngest retries are disabled.
 */
export const dispatchWebhooks = inngest.createFunction(
  { id: 'dispatch-webhooks', retries: 0 },
  [
    { event: 'job/created' },
    { event: 'job/confirmed' },
    { event: 'job/cancelled' },
    { event: 'job/completed' },
    { event: 'review/submitted' },
    { event: 'forms/submitted' },
  ],
  async ({ event, step }) => {
    const data     = event.data as { tenantId?: string }
    const tenantId = data.tenantId

    if (!tenantId) {
      log.warn({ eventName: event.name }, 'Webhook dispatch: no tenantId in event data')
      return
    }

    const endpoints = await step.run('load-endpoints', () =>
      developerRepository.findActiveEndpoints(tenantId, event.name)
    ) as unknown as Awaited<ReturnType<typeof developerRepository.findActiveEndpoints>>

    log.info({ eventName: event.name, endpointCount: endpoints.length }, 'Dispatching webhooks')

    await Promise.all(
      endpoints.map((ep) =>
        step.run(`deliver-${ep.id}`, () =>
          deliverWebhook(ep as unknown as WebhookEndpoint, {
            name: event.name,
            id:   (event as { id?: string }).id ?? '',
            data: event.data,
          })
        )
      )
    )
  }
)
