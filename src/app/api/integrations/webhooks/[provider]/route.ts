// src/app/api/integrations/webhooks/[provider]/route.ts
import { NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'api.integrations.webhooks' })

/**
 * Dynamic webhook endpoint for all integration providers.
 * URL: POST /api/integrations/webhooks/google-calendar
 *
 * Design rules:
 * - Always respond 200 immediately (external providers retry on non-200)
 * - Never expose 404 for unknown channels (prevents enumeration)
 * - All processing happens async via Inngest
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  // Capture headers as plain object before reading body
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  let body: unknown = null
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }

  // Fire Inngest event asynchronously — do NOT await
  // This ensures we respond 200 before Google's 30s push timeout
  inngest
    .send({
      name: 'integration/webhook.received',
      data: { providerSlug: provider, headers, body },
    })
    .catch((err) => {
      log.error({ provider, err }, 'Failed to fire integration/webhook.received Inngest event')
    })

  log.info({ provider }, 'Webhook received — queued for async processing')
  return new NextResponse(null, { status: 200 })
}
