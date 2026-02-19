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
 * Outlook Calendar provider stub.
 *
 * Implement when Outlook/Microsoft 365 support is required.
 * Uses the Microsoft Graph API: https://graph.microsoft.com/v1.0/me/events
 *
 * OAuth flow uses Microsoft Identity Platform (MSAL):
 * - Authorization endpoint: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
 * - Token endpoint: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
 *
 * Push notifications use Graph subscriptions (similar concept to Google watch channels):
 * - POST /v1.0/subscriptions
 * - Requires a publicly accessible webhook URL
 *
 * Required packages when implementing:
 *   npm install @microsoft/microsoft-graph-client @azure/identity
 *
 * Required environment variables when implementing:
 *   MICROSOFT_CLIENT_ID
 *   MICROSOFT_CLIENT_SECRET
 *   MICROSOFT_TENANT_ID (or 'common' for multi-tenant)
 *
 * All method signatures are locked — implement the bodies only.
 */
export class OutlookCalendarProvider implements CalendarProvider {
  readonly providerName = 'OUTLOOK_CALENDAR' as const

  createEvent(_tokens: OAuthTokens, _input: CreateEventInput): Promise<CalendarEvent> {
    throw new Error(
      'OutlookCalendarProvider.createEvent is not yet implemented. ' +
      'See providers/outlook/index.ts for implementation guidance.'
    )
  }

  updateEvent(_tokens: OAuthTokens, _input: UpdateEventInput): Promise<CalendarEvent> {
    throw new Error('OutlookCalendarProvider.updateEvent is not yet implemented.')
  }

  deleteEvent(_tokens: OAuthTokens, _calendarId: string, _externalId: string): Promise<void> {
    throw new Error('OutlookCalendarProvider.deleteEvent is not yet implemented.')
  }

  listEvents(
    _tokens: OAuthTokens,
    _calendarId: string,
    _options: ListEventsOptions
  ): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    throw new Error('OutlookCalendarProvider.listEvents is not yet implemented.')
  }

  exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokens> {
    throw new Error('OutlookCalendarProvider.exchangeCode is not yet implemented.')
  }

  refreshToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error('OutlookCalendarProvider.refreshToken is not yet implemented.')
  }

  getAuthUrl(_state: string, _redirectUri: string): string {
    throw new Error('OutlookCalendarProvider.getAuthUrl is not yet implemented.')
  }

  watchCalendar(
    _tokens: OAuthTokens,
    _calendarId: string,
    _webhookUrl: string
  ): Promise<WatchChannelResult | null> {
    // Microsoft Graph subscriptions support push notifications.
    // Implement using POST /v1.0/subscriptions when ready.
    throw new Error('OutlookCalendarProvider.watchCalendar is not yet implemented.')
  }

  stopWatch(_tokens: OAuthTokens, _channelId: string, _resourceId: string): Promise<void> {
    // DELETE /v1.0/subscriptions/{subscriptionId}
    throw new Error('OutlookCalendarProvider.stopWatch is not yet implemented.')
  }

  validateWebhookRequest(
    _request: Request,
    _storedChannelToken: string
  ): Promise<string | null> {
    // Microsoft Graph validates webhook subscriptions with a validationToken handshake.
    // Ongoing notifications include a clientState header for validation.
    throw new Error('OutlookCalendarProvider.validateWebhookRequest is not yet implemented.')
  }
}
