// src/modules/integrations/integrations.service.ts
import { logger } from '@/shared/logger'
import { calendarSyncService } from '@/modules/calendar-sync'
import { getProvider, getAllProviders } from './integrations.registry'
import { integrationsRepository } from './integrations.repository'
import type { DomainEvent, WebhookPayload } from './integrations.types'

const log = logger.child({ module: 'integrations.service' })

export const integrationsService = {
  /**
   * Route a domain event to all providers that handle it.
   *
   * For each connected user on the booking, look up which providers they have
   * connected, filter to those that handle this event type, and call onEvent.
   *
   * Never throws — integration failures must not fail the calling operation.
   */
  async routeEvent(event: DomainEvent, tenantId: string): Promise<void> {
    const connectedUsers = await integrationsRepository.findConnectedUsersForBooking(
      event.data.bookingId,
      tenantId
    )

    if (connectedUsers.length === 0) {
      log.info({ event: event.type, tenantId }, 'No connected integrations — skipping routing')
      return
    }

    await Promise.allSettled(
      connectedUsers.map(async (userIntegration) => {
        // Map DB enum ('GOOGLE_CALENDAR') to provider slug ('google-calendar')
        const slug = dbProviderToSlug(userIntegration.provider)
        const provider = getProvider(slug)

        if (!provider) {
          log.warn({ provider: userIntegration.provider }, 'No provider registered for slug — skipping')
          return
        }

        if (!provider.handles.includes(event.type)) {
          return // This provider doesn't handle this event type
        }

        const ctx = {
          tenantId,
          userId: userIntegration.userId,
          userIntegrationId: userIntegration.id,
        }

        try {
          const result = await provider.onEvent(event, ctx)
          if (!result.success) {
            log.warn({ event: event.type, provider: slug, error: result.error }, 'Integration event failed')
          } else {
            log.info({ event: event.type, provider: slug, userId: ctx.userId }, 'Integration event processed')
          }
        } catch (err) {
          log.error({ event: event.type, provider: slug, err }, 'Unexpected error in provider.onEvent')
        }
      })
    )
  },

  /**
   * Route an inbound webhook to the correct provider.
   * providerSlug comes from the URL: /api/integrations/webhooks/google-calendar
   */
  async handleWebhook(providerSlug: string, payload: WebhookPayload): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) {
      log.warn({ providerSlug }, 'Webhook received for unknown provider — ignoring')
      return
    }

    // For user context on webhooks, we look up by channel ID from headers
    // The Google Calendar provider handles this internally via calendarSyncService
    const ctx = {
      tenantId: '',    // Resolved by provider from channel token
      userId: '',      // Resolved by provider from channel token
      userIntegrationId: '',
    }

    try {
      await provider.onWebhook(payload, ctx)
    } catch (err) {
      log.error({ providerSlug, err }, 'Unexpected error in provider.onWebhook')
    }
  },

  /**
   * Initiate OAuth for a user — returns the URL to redirect to.
   */
  async initiateOAuth(
    userId: string,
    tenantId: string,
    providerSlug: string,
    redirectUri: string
  ): Promise<string> {
    // For Google Calendar, delegate to calendarSyncService which handles PKCE state
    if (providerSlug === 'google-calendar') {
      return calendarSyncService.initiateOAuth(userId, tenantId, 'GOOGLE_CALENDAR', redirectUri)
    }
    const provider = getProvider(providerSlug)
    if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)
    return provider.getOAuthUrl('', redirectUri)
  },

  /**
   * Complete OAuth — exchange code, store credentials.
   */
  async completeOAuth(
    code: string,
    userId: string,
    tenantId: string,
    providerSlug: string,
    redirectUri: string
  ): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)
    await provider.exchangeCode(code, userId, tenantId, redirectUri)
  },

  /**
   * Disconnect a provider for a user — revokes tokens, stops webhooks.
   */
  async disconnect(userId: string, tenantId: string, providerSlug: string): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)
    await provider.disconnect(userId, tenantId)
  },

  /**
   * List which providers are currently connected for a user.
   */
  async listConnected(
    userId: string,
    tenantId: string
  ): Promise<Array<{ slug: string; name: string; connectedAt?: string }>> {
    const allProviders = getAllProviders()
    const results: Array<{ slug: string; name: string; connectedAt?: string }> = []

    for (const provider of allProviders) {
      if (provider.slug === 'google-calendar') {
        const { calendarSyncRepository } = await import('@/modules/calendar-sync')
        const integration = await calendarSyncRepository.findUserIntegration(userId, tenantId)
        if (integration && (integration.status as string) === 'CONNECTED') {
          results.push({
            slug: provider.slug,
            name: provider.name,
            connectedAt: integration.connectedAt?.toString(),
          })
        }
      }
    }

    return results
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map DB enum value to provider slug used in registry */
function dbProviderToSlug(dbProvider: string): string {
  const map: Record<string, string> = {
    GOOGLE_CALENDAR: 'google-calendar',
    OUTLOOK_CALENDAR: 'outlook-calendar',
  }
  return map[dbProvider] ?? dbProvider.toLowerCase().replace(/_/g, '-')
}
