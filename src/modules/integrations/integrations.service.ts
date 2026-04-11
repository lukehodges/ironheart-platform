// src/modules/integrations/integrations.service.ts
import { logger } from '@/shared/logger'
import { BadRequestError } from '@/shared/errors'
import { calendarSyncService, calendarSyncRepository } from '@/modules/calendar-sync'
import { getProvider, getAllProviders } from './integrations.registry'
import { integrationsRepository } from './integrations.repository'
import type { DomainEvent, WebhookPayload } from './integrations.types'

const log = logger.child({ module: 'integrations.service' })

/** Map provider slug to DB enum value used in user_integrations.provider */
const SLUG_TO_DB_PROVIDER: Record<string, string> = {
  'google-calendar': 'GOOGLE_CALENDAR',
  'outlook-calendar': 'OUTLOOK_CALENDAR',
}

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
   *
   * For Google Calendar, the real IntegrationContext is resolved from the
   * x-goog-channel-id header before onWebhook is called. If the channel ID
   * cannot be matched to a known integration, the webhook is discarded.
   */
  async handleWebhook(providerSlug: string, payload: WebhookPayload): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) {
      log.warn({ providerSlug }, 'Webhook received for unknown provider — ignoring')
      return
    }

    // Resolve real context from the webhook headers
    const channelId = payload.headers['x-goog-channel-id']
    if (!channelId) {
      log.warn({ providerSlug }, 'Webhook missing channel ID header — ignoring')
      return
    }

    const integration = await calendarSyncRepository.findByWatchChannelId(channelId)
    if (!integration) {
      log.warn({ providerSlug, channelId }, 'Webhook channel ID not matched to any integration — ignoring')
      return
    }

    const ctx = {
      tenantId: integration.tenantId,
      userId: integration.userId,
      userIntegrationId: integration.id,
    }

    try {
      await provider.onWebhook(payload, ctx)
    } catch (err) {
      log.error({ providerSlug, channelId, err }, 'Unexpected error in provider.onWebhook')
    }
  },

  /**
   * Initiate OAuth for a user — returns the URL to redirect to.
   *
   * The service is responsible for generating and persisting the CSRF state
   * UUID. For Google Calendar, calendarSyncService.initiateOAuth handles state
   * generation and PKCE storage internally. For other providers, the service
   * generates a UUID state and passes it to provider.getOAuthUrl(state, redirectUri).
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
    if (!provider) throw new BadRequestError(`Unknown provider: ${providerSlug}`)

    // Service generates and passes the CSRF state UUID.
    // The provider only receives the state to embed in its OAuth URL.
    const state = crypto.randomUUID()
    return provider.getOAuthUrl(state, redirectUri)
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
    if (!provider) throw new BadRequestError(`Unknown provider: ${providerSlug}`)
    await provider.exchangeCode(code, userId, tenantId, redirectUri)
  },

  /**
   * Disconnect a provider for a user — revokes tokens, stops webhooks.
   */
  async disconnect(userId: string, tenantId: string, providerSlug: string): Promise<void> {
    const provider = getProvider(providerSlug)
    if (!provider) throw new BadRequestError(`Unknown provider: ${providerSlug}`)
    await provider.disconnect(userId, tenantId)
  },

  /**
   * List which providers are currently connected for a user.
   * Works generically for all registered providers via the integrations repository.
   */
  async listConnected(
    userId: string,
    tenantId: string
  ): Promise<Array<{ slug: string; name: string; connectedAt?: string }>> {
    const allProviders = getAllProviders()
    const results: Array<{ slug: string; name: string; connectedAt?: string }> = []

    for (const provider of allProviders) {
      const dbProviderValue = SLUG_TO_DB_PROVIDER[provider.slug]
      if (!dbProviderValue) {
        // Provider slug not mapped to a DB enum value — skip
        log.warn({ slug: provider.slug }, 'listConnected: no DB provider mapping for slug — skipping')
        continue
      }

      const rows = await integrationsRepository.findConnectedIntegrationsForUser(
        userId,
        tenantId,
        dbProviderValue
      )

      if (rows.length > 0) {
        results.push({
          slug: provider.slug,
          name: provider.name,
          connectedAt: rows[0]?.createdAt?.toString(),
        })
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
