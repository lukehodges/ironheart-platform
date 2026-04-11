// src/modules/integrations/providers/google-calendar.provider.ts
// STUB — full implementation in Task 5
import type { IntegrationProvider } from '../integrations.types'

export const googleCalendarProvider: IntegrationProvider = {
  slug: 'google-calendar',
  name: 'Google Calendar',
  handles: ['booking.confirmed', 'booking.cancelled'],
  onEvent: async () => ({ success: true }),
  onWebhook: async () => undefined,
  getOAuthUrl: () => '',
  exchangeCode: async () => undefined,
  disconnect: async () => undefined,
}
