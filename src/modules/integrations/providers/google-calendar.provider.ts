// src/modules/integrations/providers/google-calendar.provider.ts
import { calendarSyncService } from '@/modules/calendar-sync'
import { logger } from '@/shared/logger'
import type { IntegrationProvider, DomainEvent, IntegrationContext, IntegrationResult, WebhookPayload } from '../integrations.types'

const log = logger.child({ module: 'google-calendar.provider' })

/**
 * Google Calendar Integration Provider
 *
 * Thin adapter over calendarSyncService — all Google API logic lives there.
 * This file only translates between the IntegrationProvider interface
 * and the calendarSyncService API.
 */
export const googleCalendarProvider: IntegrationProvider = {
  slug: 'google-calendar',
  name: 'Google Calendar',
  handles: ['booking.confirmed', 'booking.cancelled'],

  async onEvent(event: DomainEvent, ctx: IntegrationContext): Promise<IntegrationResult> {
    try {
      if (event.type === 'booking.confirmed') {
        await calendarSyncService.pushBookingToCalendar(
          event.data.bookingId,
          ctx.userId,
          ctx.tenantId
        )
        return { success: true }
      }

      if (event.type === 'booking.cancelled') {
        await calendarSyncService.cancelBookingFromCalendar(
          event.data.bookingId,
          ctx.userId,
          ctx.tenantId
        )
        return { success: true }
      }

      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      log.warn({ event, ctx, error }, 'Google Calendar onEvent failed')
      return { success: false, error }
    }
  },

  async onWebhook(payload: WebhookPayload, _ctx: IntegrationContext): Promise<void> {
    const channelId = payload.headers['x-goog-channel-id']
    const resourceId = payload.headers['x-goog-resource-id']
    const resourceState = payload.headers['x-goog-resource-state']

    if (!channelId || resourceState === 'sync') {
      // 'sync' is the initial handshake — no action needed
      return
    }

    try {
      await calendarSyncService.handleWebhook(channelId, resourceId ?? '')
    } catch (err) {
      log.warn({ channelId, err }, 'Google Calendar onWebhook failed')
    }
  },

  getOAuthUrl(_state: string, _redirectUri: string): string {
    // Google Calendar OAuth requires async DB state creation (PKCE verifier storage).
    // integrationsService.initiateOAuth() calls calendarSyncService.initiateOAuth()
    // directly for 'google-calendar' instead of going through this method.
    // This stub satisfies the interface contract but is never called in practice.
    // Providers that can build the URL synchronously should return a real URL here.
    return ''
  },

  async exchangeCode(code: string, userId: string, tenantId: string, redirectUri: string): Promise<void> {
    await calendarSyncService.completeOAuth(code, userId, tenantId, 'GOOGLE_CALENDAR', redirectUri)
  },

  async disconnect(userId: string, tenantId: string): Promise<void> {
    await calendarSyncService.disconnect(userId, tenantId, 'GOOGLE_CALENDAR')
  },
}
