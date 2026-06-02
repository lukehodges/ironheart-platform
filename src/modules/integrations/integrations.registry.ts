// src/modules/integrations/integrations.registry.ts
import type { IntegrationProvider } from './integrations.types'
import { googleCalendarProvider } from './providers/google-calendar.provider'
import { gmailProvider } from './providers/gmail.provider'
import { stripeProvider } from './providers/stripe.provider'
import { companiesHouseProvider } from './providers/companies-house.provider'

// Side-effect import: registers Stripe webhook processors against
// (source='stripe', kind=...) in the processor registry.
import './processors/stripe-webhook.processor'

/**
 * Provider registry — the single source of truth for all registered integrations.
 *
 * To add a new integration: import its provider and add it to this map.
 * Nothing else needs to change.
 */
const PROVIDERS: Record<string, IntegrationProvider> = {
  [googleCalendarProvider.slug]: googleCalendarProvider,
  [gmailProvider.slug]: gmailProvider,
  [stripeProvider.slug]: stripeProvider,
  [companiesHouseProvider.slug]: companiesHouseProvider,
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
