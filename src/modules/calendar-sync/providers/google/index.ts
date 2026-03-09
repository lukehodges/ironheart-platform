import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'
import retry from 'async-retry'
import { calendarRateLimiter } from '../../lib/rate-limiter'
import { getGoogleOAuth2Client } from './google.auth'
import { logger } from '@/shared/logger'
import type {
  CalendarProvider,
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  ListEventsOptions,
  WatchChannelResult,
  OAuthTokens,
} from '../index'

const log = logger.child({ module: 'google.calendar.provider' })

const RETRY_OPTIONS: retry.Options = {
  retries: 3,
  minTimeout: 1000,
  factor: 2,
  onRetry: (err, attempt) => {
    log.warn({ err, attempt }, 'Retrying Google Calendar API call')
  },
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly providerName = 'GOOGLE_CALENDAR' as const

  private getClient(tokens: OAuthTokens) {
    const auth = getGoogleOAuth2Client()
    auth.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiresAt,
    })
    return google.calendar({ version: 'v3', auth })
  }

  async createEvent(tokens: OAuthTokens, input: CreateEventInput): Promise<CalendarEvent> {
    return calendarRateLimiter.schedule(() =>
      retry(async () => {
        const cal = this.getClient(tokens)
        const response = await cal.events.insert({
          calendarId: input.calendarId,
          requestBody: {
            summary: input.summary,
            description: input.description,
            location: input.location,
            start: { dateTime: input.startTime, timeZone: 'UTC' },
            end: { dateTime: input.endTime, timeZone: 'UTC' },
            attendees: input.attendees?.map(email => ({ email })),
          },
        })
        log.info({ calendarId: input.calendarId, eventId: response.data.id }, 'Google Calendar event created')
        return mapGoogleEventToCanonical(response.data, input.calendarId)
      }, RETRY_OPTIONS)
    )
  }

  async updateEvent(tokens: OAuthTokens, input: UpdateEventInput): Promise<CalendarEvent> {
    return calendarRateLimiter.schedule(() =>
      retry(async () => {
        const cal = this.getClient(tokens)
        const response = await cal.events.patch({
          calendarId: input.calendarId,
          eventId: input.externalId,
          requestBody: {
            ...(input.summary !== undefined && { summary: input.summary }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.location !== undefined && { location: input.location }),
            ...(input.startTime !== undefined && { start: { dateTime: input.startTime, timeZone: 'UTC' } }),
            ...(input.endTime !== undefined && { end: { dateTime: input.endTime, timeZone: 'UTC' } }),
          },
        })
        return mapGoogleEventToCanonical(response.data, input.calendarId)
      }, RETRY_OPTIONS)
    )
  }

  async deleteEvent(tokens: OAuthTokens, calendarId: string, externalId: string): Promise<void> {
    return calendarRateLimiter.schedule(() =>
      retry(async () => {
        const cal = this.getClient(tokens)
        await cal.events.delete({ calendarId, eventId: externalId })
        log.info({ calendarId, externalId }, 'Google Calendar event deleted')
      }, RETRY_OPTIONS)
    )
  }

  async listEvents(
    tokens: OAuthTokens,
    calendarId: string,
    options: ListEventsOptions
  ): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    return calendarRateLimiter.schedule(() =>
      retry(async () => {
        const cal = this.getClient(tokens)
        const response = await cal.events.list({
          calendarId,
          timeMin: options.timeMin,
          timeMax: options.timeMax,
          pageToken: options.pageToken,
          maxResults: options.maxResults ?? 250,
          singleEvents: true,
          orderBy: 'startTime',
        })
        return {
          events: (response.data.items ?? []).map(e => mapGoogleEventToCanonical(e, calendarId)),
          nextPageToken: response.data.nextPageToken ?? undefined,
        }
      }, RETRY_OPTIONS)
    )
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const auth = getGoogleOAuth2Client(redirectUri)
    const { tokens } = await auth.getToken(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Google OAuth token exchange did not return required tokens')
    }
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600_000,
    }
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const auth = getGoogleOAuth2Client()
    auth.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await auth.refreshAccessToken()
    if (!credentials.access_token) {
      throw new Error('Google token refresh did not return a new access token')
    }
    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token ?? refreshToken,
      expiresAt: credentials.expiry_date ?? Date.now() + 3600_000,
    }
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const auth = getGoogleOAuth2Client(redirectUri)
    return auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state,
      prompt: 'consent',
    })
  }

  async watchCalendar(
    tokens: OAuthTokens,
    calendarId: string,
    webhookUrl: string
  ): Promise<WatchChannelResult | null> {
    const cal = this.getClient(tokens)
    const channelId = crypto.randomUUID()
    const channelToken = crypto.randomUUID()

    const response = await cal.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: channelToken,
        params: { ttl: '604800' }, // 7 days
      },
    })

    if (!response.data.resourceId || !response.data.expiration) {
      throw new Error('Google Calendar watch response missing resourceId or expiration')
    }

    log.info({ calendarId, channelId }, 'Google Calendar watch channel registered')
    return {
      channelId,
      channelToken,
      resourceId: response.data.resourceId,
      expiresAt: new Date(Number(response.data.expiration)).toISOString(),
    }
  }

  async stopWatch(tokens: OAuthTokens, channelId: string, resourceId: string): Promise<void> {
    const cal = this.getClient(tokens)
    await cal.channels.stop({
      requestBody: { id: channelId, resourceId },
    })
    log.info({ channelId }, 'Google Calendar watch channel stopped')
  }

  async validateWebhookRequest(
    request: Request,
    storedChannelToken: string
  ): Promise<string | null> {
    const channelToken = request.headers.get('X-Goog-Channel-Token')
    const resourceState = request.headers.get('X-Goog-Resource-State')
    const resourceId = request.headers.get('X-Goog-Resource-Id')

    if (!channelToken || channelToken !== storedChannelToken) {
      log.warn({ received: channelToken }, 'Google webhook: invalid channel token')
      return null
    }

    if (resourceState === 'sync') {
      // Initial sync confirmation - not a real change event, ignore
      return null
    }

    return resourceId
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapGoogleEventToCanonical(
  event: calendar_v3.Schema$Event,
  calendarId: string
): CalendarEvent {
  const startTime = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00Z` : '')
  const endTime = event.end?.dateTime ?? (event.end?.date ? `${event.end.date}T00:00:00Z` : '')

  return {
    externalId: event.id ?? '',
    calendarId,
    summary: event.summary ?? '(No title)',
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    startTime,
    endTime,
    isAllDay: !event.start?.dateTime,
    attendees: event.attendees
      ?.map(a => a.email ?? '')
      .filter(Boolean) ?? [],
    raw: event as unknown as Record<string, unknown>,
  }
}
