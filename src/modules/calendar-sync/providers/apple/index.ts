import type {
  CalendarProvider,
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  ListEventsOptions,
  WatchChannelResult,
  OAuthTokens,
} from '../index'

/**
 * Apple Calendar (CalDAV) provider stub.
 *
 * Implement when Apple Calendar support is required.
 * Apple Calendar uses the CalDAV protocol (RFC 4791) rather than a REST API.
 *
 * Authentication:
 * - Sign in with Apple (SIWA) for OAuth tokens
 * - Or app-specific passwords for direct CalDAV access
 *
 * CalDAV base URL: https://caldav.icloud.com
 *
 * Push notifications:
 * - Apple CalDAV does NOT support push notifications (watchCalendar returns null).
 * - Use polling (cron-based pull) for Apple Calendar sync instead.
 *
 * Required packages when implementing:
 *   npm install tsdav  (CalDAV client)
 *
 * Required environment variables when implementing:
 *   APPLE_CLIENT_ID
 *   APPLE_CLIENT_SECRET (signed JWT)
 *   APPLE_TEAM_ID
 *   APPLE_KEY_ID
 *
 * All method signatures are locked — implement the bodies only.
 */
export class AppleCalendarProvider implements CalendarProvider {
  readonly providerName = 'APPLE_CALENDAR' as const

  createEvent(_tokens: OAuthTokens, _input: CreateEventInput): Promise<CalendarEvent> {
    throw new Error(
      'AppleCalendarProvider.createEvent is not yet implemented. ' +
      'See providers/apple/index.ts for implementation guidance.'
    )
  }

  updateEvent(_tokens: OAuthTokens, _input: UpdateEventInput): Promise<CalendarEvent> {
    throw new Error('AppleCalendarProvider.updateEvent is not yet implemented.')
  }

  deleteEvent(_tokens: OAuthTokens, _calendarId: string, _externalId: string): Promise<void> {
    throw new Error('AppleCalendarProvider.deleteEvent is not yet implemented.')
  }

  listEvents(
    _tokens: OAuthTokens,
    _calendarId: string,
    _options: ListEventsOptions
  ): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    throw new Error('AppleCalendarProvider.listEvents is not yet implemented.')
  }

  exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokens> {
    throw new Error('AppleCalendarProvider.exchangeCode is not yet implemented.')
  }

  refreshToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error('AppleCalendarProvider.refreshToken is not yet implemented.')
  }

  getAuthUrl(_state: string, _redirectUri: string): string {
    throw new Error('AppleCalendarProvider.getAuthUrl is not yet implemented.')
  }

  /**
   * Apple CalDAV does not support push webhook notifications.
   * Always returns null — callers should use polling instead.
   */
  async watchCalendar(
    _tokens: OAuthTokens,
    _calendarId: string,
    _webhookUrl: string
  ): Promise<WatchChannelResult | null> {
    return null  // Apple CalDAV has no push notification support
  }

  async stopWatch(_tokens: OAuthTokens, _channelId: string, _resourceId: string): Promise<void> {
    // No-op for Apple — no watch channels to stop
    return
  }

  async validateWebhookRequest(
    _request: Request,
    _storedChannelToken: string
  ): Promise<string | null> {
    // No-op for Apple — no webhooks to validate
    return null
  }
}
