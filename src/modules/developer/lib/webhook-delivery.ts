import crypto from 'crypto'
import { logger } from '@/shared/logger'
import * as developerRepository from '../developer.repository'
import type { WebhookEndpoint, DeliveryResult } from '../developer.types'

const log = logger.child({ module: 'developer.webhook-delivery' })

// Exponential backoff delays: 10s, 60s, 5m, 30m, 2h
const RETRY_DELAYS_MS = [10_000, 60_000, 300_000, 1_800_000, 7_200_000]

export function createHmacSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

export function verifyHmacSignature(body: string, secret: string, received: string): boolean {
  const expected = Buffer.from(createHmacSignature(body, secret))
  const actual   = Buffer.from(received)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual) // timing-safe comparison
}

export async function deliverWebhook(
  endpoint: WebhookEndpoint,
  event: { name: string; id?: string; data: unknown }
): Promise<DeliveryResult> {
  const deliveryId = crypto.randomUUID()
  const payload = {
    id:      deliveryId,
    event:   event.name,
    created: new Date().toISOString(),
    data:    event.data,
  }

  const body      = JSON.stringify(payload)
  const signature = createHmacSignature(body, endpoint.secret)
  const startMs   = Date.now()

  let lastError: string = 'Unknown error'

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]!)
    }

    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event':     event.name,
          'X-Webhook-Delivery':  deliveryId,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })

      const durationMs = Date.now() - startMs

      if (res.ok) {
        await developerRepository.recordDelivery({
          endpointId:     endpoint.id,
          eventType:      event.name,
          eventId:        deliveryId,
          payload:        payload as Record<string, unknown>,
          attempt:        attempt + 1,
          status:         'SUCCESS',
          responseStatus: res.status,
          responseBody:   null,
          durationMs,
          deliveredAt:    new Date(),
          nextRetryAt:    null,
        })

        // Reset failure count on success
        await developerRepository.markEndpointStatus(endpoint.id, 'ACTIVE')

        log.info({ endpointId: endpoint.id, attempt: attempt + 1, durationMs }, 'Webhook delivered')
        return { status: 'SUCCESS', responseStatus: res.status, durationMs }
      }

      lastError = `HTTP ${res.status}`
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err)
      log.warn({ endpointId: endpoint.id, attempt: attempt + 1, error: lastError }, 'Webhook delivery attempt failed')
    }
  }

  // All retries exhausted
  const failureCount = await developerRepository.incrementFailureCount(endpoint.id)
  if (failureCount >= 10) {
    await developerRepository.markEndpointStatus(endpoint.id, 'DISABLED')
    log.error({ endpointId: endpoint.id, failureCount }, 'Webhook endpoint disabled after 10 failures')
  } else if (failureCount >= 3) {
    await developerRepository.markEndpointStatus(endpoint.id, 'FAILING')
  }

  await developerRepository.recordDelivery({
    endpointId:     endpoint.id,
    eventType:      event.name,
    eventId:        deliveryId,
    payload:        payload as Record<string, unknown>,
    attempt:        RETRY_DELAYS_MS.length + 1,
    status:         'FAILED',
    responseStatus: null,
    responseBody:   lastError,
    durationMs:     Date.now() - startMs,
    deliveredAt:    null,
    nextRetryAt:    null,
  })

  return { status: 'FAILED' }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
