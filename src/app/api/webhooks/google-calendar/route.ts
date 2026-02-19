import { NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'
import { calendarSyncRepository } from '@/modules/calendar-sync/calendar-sync.repository'
import { GoogleCalendarProvider } from '@/modules/calendar-sync/providers/google'
import { logger } from '@/shared/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'google-calendar.webhook' })
const provider = new GoogleCalendarProvider()

export async function POST(request: Request) {
  const channelId = request.headers.get('X-Goog-Channel-ID')

  if (!channelId) {
    log.warn('Webhook received without X-Goog-Channel-ID header')
    // Always return 200 to Google — non-2xx causes retry storms
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  // Look up the stored watch channel record
  const integration = await calendarSyncRepository.findByWatchChannelId(channelId)
  if (!integration) {
    log.warn({ channelId }, 'Webhook received for unknown channel — ignoring')
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  // Validate the webhook request using the provider
  const resourceId = await provider.validateWebhookRequest(
    request,
    integration.watchChannelToken ?? ''
  )

  if (!resourceId) {
    log.warn({ channelId }, 'Webhook validation failed — invalid or sync message')
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  // Emit Inngest event — actual sync happens in the Inngest handler
  await inngest.send({
    name: 'calendar/webhook.received',
    data: { channelId, resourceId },
  })

  log.info({ channelId, resourceId }, 'Calendar webhook processed — Inngest event emitted')
  return NextResponse.json({ ok: true }, { status: 200 })
}
