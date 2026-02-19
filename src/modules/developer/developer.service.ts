import { logger } from '@/shared/logger'
import { deliverWebhook } from './lib/webhook-delivery'
import type { CreateWebhookEndpointInput, WebhookEndpoint } from './developer.types'
import { db } from '@/shared/db'
import { webhookEndpoints } from '@/shared/db/schemas/phase6.schema'
import { eq, and, desc } from 'drizzle-orm'

const log = logger.child({ module: 'developer.service' })

export async function createWebhookEndpoint(
  tenantId: string,
  input: CreateWebhookEndpointInput
): Promise<WebhookEndpoint> {
  const { randomBytes } = await import('crypto')
  const secret = randomBytes(32).toString('hex')

  const [endpoint] = await db.insert(webhookEndpoints).values({
    tenantId,
    url:         input.url,
    secret,
    description: input.description ?? null,
    events:      input.events,
    status:      'ACTIVE',
  }).returning()

  log.info({ tenantId, endpointId: endpoint!.id }, 'Webhook endpoint created')
  return endpoint as WebhookEndpoint
}

export async function listWebhookEndpoints(tenantId: string): Promise<WebhookEndpoint[]> {
  const rows = await db.select().from(webhookEndpoints)
    .where(eq(webhookEndpoints.tenantId, tenantId))
    .orderBy(desc(webhookEndpoints.createdAt))
  return rows as WebhookEndpoint[]
}

export async function deleteWebhookEndpoint(tenantId: string, id: string): Promise<void> {
  await db.delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.tenantId, tenantId)))
  log.info({ tenantId, endpointId: id }, 'Webhook endpoint deleted')
}
