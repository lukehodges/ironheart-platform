/**
 * Calendar-Sync Service
 *
 * Orchestrates calendar operations — OAuth flows, event push/pull,
 * webhook handling, and token/watch-channel lifecycle management.
 *
 * Schema notes carried forward from the repository:
 *   - DB status enum: CONNECTED | DISCONNECTED | ERROR | EXPIRED
 *     (not ACTIVE / REVOKED / PENDING from the type definition)
 *   - UserIntegrationRecord.resourceId maps to DB column watchResourceId
 *   - upsertExternalEvent requires tenantId, userId, provider (NOT NULL in DB)
 *   - startTime and endTime are NOT NULL in userExternalEvents
 */

import { logger } from '@/shared/logger'
import { calendarSyncRepository } from './calendar-sync.repository'
import { getCalendarProvider } from './lib/provider-factory'
import { bookingToCalendarEvent } from './lib/calendar-event-mapper'
import {
  encryptOAuthTokens,
  decryptOAuthTokens,
  isTokenExpired,
} from './providers/google/google.auth'
import type {
  CalendarIntegrationProvider,
  SyncResult,
  CalendarPushResult,
  WatchChannelRenewalResult,
  TokenRefreshResult,
  DisconnectResult,
  UserIntegrationRecord,
} from './calendar-sync.types'
import type { OAuthTokens } from './providers'

const log = logger.child({ module: 'calendar-sync.service' })

export const calendarSyncService = {
  /**
   * Push a booking to the user's connected calendar.
   * Creates or updates the calendar event depending on whether it was previously synced.
   */
  async pushBookingToCalendar(
    bookingId: string,
    userId: string,
    tenantId: string
  ): Promise<CalendarPushResult | null> {
    // 1. Find the user's active integration
    // Note: DB enum is CONNECTED | DISCONNECTED | ERROR | EXPIRED; UserIntegrationRecord.status
    // type has different values — cast to string for comparison to avoid TS2367.
    const integration = await calendarSyncRepository.findUserIntegration(userId, tenantId)
    if (!integration || (integration.status as string) !== 'CONNECTED') {
      log.info({ userId, tenantId }, 'No active calendar integration — skipping push')
      return null
    }

    // 2. Decrypt tokens, refresh if needed
    const tokens = await getValidTokens(integration)
    if (!tokens) return null

    // 3. Load booking data
    const booking = await calendarSyncRepository.loadBookingForCalendar(bookingId)
    if (!booking) {
      log.warn({ bookingId }, 'Booking not found for calendar push')
      return null
    }

    // 4. Get provider and map booking to calendar event
    const provider = await getCalendarProvider(integration.provider)
    const calendarId = integration.calendarId ?? 'primary'
    const eventInput = bookingToCalendarEvent(booking, calendarId)

    // 5. Create the event
    const calendarEvent = await provider.createEvent(tokens, eventInput)

    // 6. Upsert the external event record
    // startTime and endTime are NOT NULL in the DB — fall back to now if missing
    // (in practice the provider will always return them for a created event)
    const now = new Date()
    await calendarSyncRepository.upsertExternalEvent({
      tenantId: integration.tenantId,
      userId: integration.userId,
      userIntegrationId: integration.id,
      externalEventId: calendarEvent.externalId,
      provider: integration.provider,
      bookingId,
      summary: calendarEvent.summary,
      startTime: calendarEvent.startTime ? new Date(calendarEvent.startTime) : now,
      endTime: calendarEvent.endTime ? new Date(calendarEvent.endTime) : now,
      isAllDay: calendarEvent.isAllDay,
      rawData: calendarEvent.raw,
    })

    log.info({ bookingId, externalEventId: calendarEvent.externalId }, 'Booking pushed to calendar')

    return {
      externalEventId: calendarEvent.externalId,
      calendarId,
      provider: integration.provider,
    }
  },

  /**
   * Pull external calendar events for a user (full range scan — no syncToken in current schema).
   */
  async pullCalendarEvents(userIntegrationId: string): Promise<SyncResult> {
    const result: SyncResult = { eventsCreated: 0, eventsUpdated: 0, eventsDeleted: 0, errors: [] }

    const integration = await calendarSyncRepository.findUserIntegrationById(userIntegrationId)
    // DB enum is CONNECTED | DISCONNECTED | ERROR | EXPIRED — cast to string to satisfy TS.
    if (!integration || (integration.status as string) !== 'CONNECTED') {
      result.errors.push('Integration not found or not connected')
      return result
    }

    const tokens = await getValidTokens(integration)
    if (!tokens) {
      result.errors.push('Could not obtain valid tokens')
      return result
    }

    const provider = await getCalendarProvider(integration.provider)
    const calendarId = integration.calendarId ?? 'primary'

    try {
      // List events in a rolling window: 30 days ago → 60 days ahead
      const now = new Date()
      const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

      let pageToken: string | undefined
      do {
        const { events, nextPageToken } = await provider.listEvents(tokens, calendarId, {
          timeMin,
          timeMax,
          pageToken,
          maxResults: 250,
        })

        for (const event of events) {
          // startTime / endTime are NOT NULL in the DB — skip events without them
          if (!event.startTime || !event.endTime) {
            log.warn(
              { externalEventId: event.externalId },
              'Skipping external event with missing start/end time'
            )
            continue
          }

          await calendarSyncRepository.upsertExternalEvent({
            tenantId: integration.tenantId,
            userId: integration.userId,
            userIntegrationId: integration.id,
            externalEventId: event.externalId,
            provider: integration.provider,
            summary: event.summary,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            isAllDay: event.isAllDay,
            rawData: event.raw,
          })
          result.eventsCreated++
        }

        pageToken = nextPageToken
      } while (pageToken)

      log.info(
        { userIntegrationId, eventsCreated: result.eventsCreated },
        'Calendar pull completed'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log.error({ userIntegrationId, err }, 'Calendar pull failed')
      result.errors.push(message)
      await calendarSyncRepository.markIntegrationError(integration.id)
    }

    return result
  },

  /**
   * Refresh the OAuth access token for a user integration.
   */
  async refreshToken(userIntegrationId: string): Promise<TokenRefreshResult> {
    const integration = await calendarSyncRepository.findUserIntegrationById(userIntegrationId)
    if (!integration) {
      return { userIntegrationId, refreshed: false, error: 'Integration not found' }
    }

    try {
      const decrypted = decryptOAuthTokens(integration)
      const provider = await getCalendarProvider(integration.provider)
      const newTokens = await provider.refreshToken(decrypted.refreshToken)
      const encrypted = encryptOAuthTokens(newTokens)

      await calendarSyncRepository.updateTokens(integration.id, encrypted)

      log.info({ userIntegrationId }, 'OAuth tokens refreshed')
      return {
        userIntegrationId,
        refreshed: true,
        expiresAt: encrypted.tokenExpiresAt,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log.error({ userIntegrationId, err }, 'Token refresh failed')
      await calendarSyncRepository.markIntegrationError(integration.id)
      return { userIntegrationId, refreshed: false, error: message }
    }
  },

  /**
   * Renew an expiring push notification watch channel.
   */
  async renewWatchChannel(userIntegrationId: string): Promise<WatchChannelRenewalResult> {
    const integration = await calendarSyncRepository.findUserIntegrationById(userIntegrationId)
    if (!integration) {
      return {
        userIntegrationId,
        channelId: '',
        expiresAt: '',
        renewed: false,
        error: 'Integration not found',
      }
    }

    try {
      const tokens = await getValidTokens(integration)
      if (!tokens) {
        return {
          userIntegrationId,
          channelId: '',
          expiresAt: '',
          renewed: false,
          error: 'Could not get valid tokens',
        }
      }

      const provider = await getCalendarProvider(integration.provider)
      const calendarId = integration.calendarId ?? 'primary'
      const webhookUrl = `${process.env.APP_URL ?? ''}/api/webhooks/google-calendar`

      // Stop existing channel if present — resourceId maps to watchResourceId in the DB
      if (integration.watchChannelId && integration.resourceId) {
        try {
          await provider.stopWatch(tokens, integration.watchChannelId, integration.resourceId)
        } catch (err) {
          log.warn(
            { userIntegrationId, err },
            'Failed to stop old watch channel — continuing with renewal'
          )
        }
      }

      const watchResult = await provider.watchCalendar(tokens, calendarId, webhookUrl)
      if (!watchResult) {
        return {
          userIntegrationId,
          channelId: '',
          expiresAt: '',
          renewed: false,
          error: 'Provider does not support push notifications',
        }
      }

      // updateWatchChannel accepts resourceId — maps to DB watchResourceId internally
      await calendarSyncRepository.updateWatchChannel(integration.id, {
        watchChannelId: watchResult.channelId,
        watchChannelToken: watchResult.channelToken,
        watchChannelExpiration: new Date(watchResult.expiresAt),
        resourceId: watchResult.resourceId,
      })

      log.info(
        { userIntegrationId, channelId: watchResult.channelId },
        'Watch channel renewed'
      )
      return {
        userIntegrationId,
        channelId: watchResult.channelId,
        expiresAt: watchResult.expiresAt,
        renewed: true,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log.error({ userIntegrationId, err }, 'Watch channel renewal failed')
      return { userIntegrationId, channelId: '', expiresAt: '', renewed: false, error: message }
    }
  },

  /**
   * Handle a calendar webhook notification — trigger incremental pull.
   * Called by the Inngest handler for calendar/webhook.received.
   */
  async handleWebhook(channelId: string, _resourceId: string): Promise<void> {
    const integration = await calendarSyncRepository.findByWatchChannelId(channelId)
    if (!integration) {
      log.warn({ channelId }, 'Webhook received for unknown channel')
      return
    }
    log.info({ channelId, integrationId: integration.id }, 'Webhook received — triggering pull')
    await calendarSyncService.pullCalendarEvents(integration.id)
  },

  /**
   * Start OAuth flow — generate state, return auth URL.
   */
  async initiateOAuth(
    userId: string,
    tenantId: string,
    provider: CalendarIntegrationProvider,
    redirectUrl: string
  ): Promise<string> {
    const calProvider = await getCalendarProvider(provider)
    const state = `${userId}:${tenantId}:${provider}:${Date.now()}`
    return calProvider.getAuthUrl(state, redirectUrl)
  },

  /**
   * Complete OAuth flow — exchange code, encrypt tokens, store integration.
   */
  async completeOAuth(
    code: string,
    userId: string,
    tenantId: string,
    provider: CalendarIntegrationProvider,
    redirectUrl: string
  ): Promise<void> {
    const calProvider = await getCalendarProvider(provider)
    const tokens = await calProvider.exchangeCode(code, redirectUrl)
    const encrypted = encryptOAuthTokens(tokens)

    await calendarSyncRepository.createUserIntegration({
      userId,
      tenantId,
      provider,
      encryptedAccessToken: encrypted.encryptedAccessToken,
      encryptedRefreshToken: encrypted.encryptedRefreshToken,
      tokenExpiresAt: encrypted.tokenExpiresAt,
      scopes: [],
      calendarId: 'primary',
    })

    log.info({ userId, tenantId, provider }, 'Calendar OAuth completed — integration created')
  },

  /**
   * Disconnect a user integration — stop watch channels, clear tokens.
   */
  async disconnect(
    userId: string,
    tenantId: string,
    provider: CalendarIntegrationProvider
  ): Promise<DisconnectResult> {
    const integration = await calendarSyncRepository.findUserIntegration(userId, tenantId, provider)
    if (!integration) {
      return { userId, provider, watchChannelStopped: false }
    }

    let watchChannelStopped = false
    // resourceId is the mapped name for DB watchResourceId on UserIntegrationRecord
    if (integration.watchChannelId && integration.resourceId) {
      try {
        const tokens = await getValidTokens(integration)
        if (tokens) {
          const calProvider = await getCalendarProvider(provider)
          await calProvider.stopWatch(tokens, integration.watchChannelId, integration.resourceId)
          watchChannelStopped = true
        }
      } catch (err) {
        log.warn({ userId, err }, 'Failed to stop watch channel during disconnect')
      }
    }

    await calendarSyncRepository.markIntegrationRevoked(integration.id)
    log.info({ userId, tenantId, provider }, 'Calendar integration disconnected')

    return { userId, provider, watchChannelStopped }
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get valid (non-expired) tokens for an integration.
 * Refreshes if needed and updates the DB.
 * Returns null if unable to get valid tokens.
 */
async function getValidTokens(integration: UserIntegrationRecord): Promise<OAuthTokens | null> {
  try {
    const decrypted = decryptOAuthTokens(integration)

    if (isTokenExpired(decrypted.expiresAt)) {
      log.info({ integrationId: integration.id }, 'Access token expired — refreshing')
      const provider = await getCalendarProvider(integration.provider)
      const newTokens = await provider.refreshToken(decrypted.refreshToken)
      const encrypted = encryptOAuthTokens(newTokens)
      await calendarSyncRepository.updateTokens(integration.id, encrypted)
      return newTokens
    }

    return decrypted
  } catch (err) {
    log.error({ integrationId: integration.id, err }, 'Failed to get valid tokens')
    return null
  }
}
