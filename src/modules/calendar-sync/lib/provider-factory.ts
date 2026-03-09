import type { CalendarProvider } from '../providers'
import type { CalendarIntegrationProvider } from '../calendar-sync.types'

/**
 * Resolve the CalendarProvider implementation for a given provider enum value.
 *
 * This is called per-integration - the provider value is stored in
 * userIntegrations.provider and drives which implementation is used.
 *
 * Adding a new calendar provider requires:
 * 1. Create a class implementing CalendarProvider in providers/{name}/index.ts
 * 2. Add the provider name to CalendarIntegrationProvider type
 * 3. Add a case here
 *
 * Zero other changes needed.
 *
 * Note: dynamic import() is used instead of require() because this project
 * uses ESM modules ("module": "esnext"). The factory is async as a result.
 */
export async function getCalendarProvider(
  provider: CalendarIntegrationProvider
): Promise<CalendarProvider> {
  switch (provider) {
    case 'GOOGLE_CALENDAR': {
      const { GoogleCalendarProvider } = await import('../providers/google')
      return new GoogleCalendarProvider()
    }
    case 'OUTLOOK_CALENDAR': {
      const { OutlookCalendarProvider } = await import('../providers/outlook')
      return new OutlookCalendarProvider()
    }
    case 'APPLE_CALENDAR': {
      const { AppleCalendarProvider } = await import('../providers/apple')
      return new AppleCalendarProvider()
    }
    default: {
      const exhaustive: never = provider
      throw new Error(`Unsupported calendar provider: ${exhaustive}`)
    }
  }
}
