// src/modules/integrations/integrations.registry.ts
import type { IntegrationProvider } from './integrations.types'
import { googleCalendarProvider } from './providers/google-calendar.provider'

/**
 * Provider registry — the single source of truth for all registered integrations.
 *
 * To add a new integration: import its provider and add it to this map.
 * Nothing else needs to change.
 */
const PROVIDERS: Record<string, IntegrationProvider> = {
  [googleCalendarProvider.slug]: googleCalendarProvider,
}

/**
 * Look up a provider by slug. Returns null if not registered.
 */
export function getProvider(slug: string): IntegrationProvider | null {
  return PROVIDERS[slug] ?? null
}

/**
 * All registered providers. Used by the hub to route events.
 */
export function getAllProviders(): IntegrationProvider[] {
  return Object.values(PROVIDERS)
}
