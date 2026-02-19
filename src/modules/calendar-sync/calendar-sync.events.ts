import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { calendarSyncService } from './calendar-sync.service'
import { calendarSyncRepository } from './calendar-sync.repository'
import { calendarSyncPushSchema, webhookReceivedSchema } from './calendar-sync.schemas'

const log = logger.child({ module: 'calendar-sync.events' })

/**
 * Push a booking to the user's calendar when it is created/confirmed.
 * NOTE: This upgrades the stub in booking.events.ts — uses the SAME function ID.
 */
export const pushBookingToCalendar = inngest.createFunction(
  { id: 'push-booking-to-calendar', name: 'Push Booking to Calendar' },
  { event: 'calendar/sync.push' },
  async ({ event, step }) => {
    const { bookingId, userId, tenantId } = calendarSyncPushSchema.parse(event.data)
    const result = await step.run('push-to-calendar', async () => {
      return calendarSyncService.pushBookingToCalendar(bookingId, userId, tenantId)
    })
    return result
  }
)

/**
 * Handle Google Calendar webhook notification.
 * Triggers an incremental pull for the affected calendar.
 */
export const handleCalendarWebhook = inngest.createFunction(
  { id: 'handle-calendar-webhook', name: 'Handle Calendar Webhook' },
  { event: 'calendar/webhook.received' },
  async ({ event, step }) => {
    const { channelId, resourceId } = webhookReceivedSchema.parse(event.data)
    await step.run('handle-webhook', async () => {
      await calendarSyncService.handleWebhook(channelId, resourceId)
    })
  }
)

/**
 * Pull external calendar events (triggered by cron or webhook).
 */
export const pullCalendarEventsCron = inngest.createFunction(
  {
    id: 'pull-calendar-events-cron',
    name: 'Pull Calendar Events (Cron)',
  },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ step }) => {
    // Find all active integrations and pull for each
    // For now, this is a placeholder — full implementation would page through all integrations
    log.info('Calendar pull cron triggered')
    return { triggered: true }
  }
)

/**
 * Refresh expiring OAuth tokens (cron).
 */
export const refreshCalendarTokensCron = inngest.createFunction(
  {
    id: 'refresh-calendar-tokens-cron',
    name: 'Refresh Calendar Tokens (Cron)',
  },
  { cron: '0 */4 * * *' }, // Every 4 hours
  async ({ step }) => {
    const now = new Date()
    const expiringBefore = new Date(now.getTime() + 30 * 60 * 1000) // Expiring in next 30 minutes

    const integrations = await step.run('find-expiring-tokens', async () => {
      return calendarSyncRepository.findExpiringTokens(expiringBefore)
    })

    const results = await step.run('refresh-tokens', async () => {
      return Promise.all(
        integrations.map(integration => calendarSyncService.refreshToken(integration.id))
      )
    })

    log.info({ count: results.length }, 'Calendar token refresh cron completed')
    return { refreshed: results.filter(r => r.refreshed).length }
  }
)

/**
 * Renew expiring watch channels (cron).
 */
export const renewWatchChannelsCron = inngest.createFunction(
  {
    id: 'renew-watch-channels-cron',
    name: 'Renew Watch Channels (Cron)',
  },
  { cron: '0 0 * * *' }, // Daily
  async ({ step }) => {
    const now = new Date()
    const expiringBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Expiring in next 24 hours

    const integrations = await step.run('find-expiring-channels', async () => {
      return calendarSyncRepository.findExpiringWatchChannels(expiringBefore)
    })

    const results = await step.run('renew-channels', async () => {
      return Promise.all(
        integrations.map(integration => calendarSyncService.renewWatchChannel(integration.id))
      )
    })

    log.info({ count: results.length }, 'Watch channel renewal cron completed')
    return { renewed: results.filter(r => r.renewed).length }
  }
)

/** Export all functions for registration in serve() */
export const calendarSyncFunctions = [
  pushBookingToCalendar,
  handleCalendarWebhook,
  pullCalendarEventsCron,
  refreshCalendarTokensCron,
  renewWatchChannelsCron,
]
