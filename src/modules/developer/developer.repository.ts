import { db } from '@/shared/db'
import { eq, and, sql } from 'drizzle-orm'
import { webhookEndpoints, webhookDeliveries } from '@/shared/db/schemas/phase6.schema'
import type { WebhookEndpoint, WebhookDelivery } from './developer.types'

export async function findActiveEndpoints(
  tenantId: string,
  eventType: string
): Promise<WebhookEndpoint[]> {
  const rows = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.tenantId, tenantId),
        eq(webhookEndpoints.status, 'ACTIVE'),
        sql`${webhookEndpoints.events} @> ARRAY[${eventType}]::text[]`
      )
    )
  return rows as WebhookEndpoint[]
}

export async function recordDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<void> {
  await db.insert(webhookDeliveries).values({
    endpointId:     delivery.endpointId,
    eventType:      delivery.eventType,
    eventId:        delivery.eventId,
    payload:        delivery.payload,
    attempt:        delivery.attempt,
    status:         delivery.status,
    responseStatus: delivery.responseStatus,
    responseBody:   delivery.responseBody,
    durationMs:     delivery.durationMs,
    deliveredAt:    delivery.deliveredAt,
    nextRetryAt:    delivery.nextRetryAt,
  })
}

export async function incrementFailureCount(endpointId: string): Promise<number> {
  const [updated] = await db
    .update(webhookEndpoints)
    .set({
      failureCount:  sql`${webhookEndpoints.failureCount} + 1`,
      lastFailureAt: new Date(),
      updatedAt:     new Date(),
    })
    .where(eq(webhookEndpoints.id, endpointId))
    .returning({ failureCount: webhookEndpoints.failureCount })

  return updated?.failureCount ?? 0
}

export async function markEndpointStatus(
  endpointId: string,
  status: 'ACTIVE' | 'DISABLED' | 'FAILING'
): Promise<void> {
  await db
    .update(webhookEndpoints)
    .set({ status, updatedAt: new Date() })
    .where(eq(webhookEndpoints.id, endpointId))
}
