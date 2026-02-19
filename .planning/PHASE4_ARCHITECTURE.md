# Phase 4 Architecture Report: Notification + Calendar-Sync Modules

**Authored:** 2026-02-19
**Author role:** Senior Engineer / CTO architectural review
**Stack:** Next.js 16, tRPC 11, Drizzle ORM, Inngest 3, React 19, Zod 4

---

## Table of Contents

1. [What Phase 4 Must Deliver](#section-1-what-phase-4-must-deliver)
2. [Notification Module Architecture](#section-2-notification-module-architecture-the-10x-design)
3. [Calendar-Sync Module Architecture](#section-3-calendar-sync-module-architecture-the-10x-design)
4. [Template System Design (Resend React Email)](#section-4-template-system-design-resend-react-email)
5. [Event Catalog Additions](#section-5-event-catalog-additions)
6. [Database Schema Gaps](#section-6-database-schema-gaps)
7. [Implementation Wave Plan](#section-7-implementation-wave-plan)
8. [Package Dependencies](#section-8-package-dependencies)

---

## Section 1: What Phase 4 Must Deliver

### Deliverables from PHASE4_PLAN.md — Evaluated

#### Notification Module (14 files)

| File | Plan Quality | Assessment |
|------|-------------|------------|
| `notification.types.ts` | Good | The `TemplateVariables` interface is well-designed. No changes needed. Missing: `REVIEW_REQUEST` is in the trigger enum but `BOOKING_REJECTED` is not listed in the `messageTrigger` DB enum — add it. |
| `notification.schemas.ts` | Good | Correct Zod 4 patterns. No changes. |
| `notification.service.ts` | Good | Two-step dispatch pattern (service emits events → handlers call providers) is correct. One gap: the `notification/send.email` event schema uses `Record<string, string>` for `variables` but the service packs `subject`, `html`, `tenantId`, `bookingId` into it — this is structurally awkward. See Section 5 for the corrected event schema. |
| `notification.router.ts` | Good | Thin, correct. |
| `notification.events.ts` | Good with one bug | Uses `db.sentMessage.create()` (Prisma syntax). Must be rewritten using Drizzle: `db.insert(sentMessages).values({...})`. Also references `notificationRepository` which is not defined in the plan — must create `notification.repository.ts`. |
| `providers/email.provider.ts` | Good | Resend wrapper is correct. Confirmed: `resend.emails.send()` accepts `html` (string) after pre-rendering. The `react` property also exists and Resend renders it server-side — but pre-rendering via `@react-email/render` and passing `html` string is the more explicit and testable pattern. Use `html` not `react`. |
| `providers/sms.provider.ts` | Good | Twilio wrapper is correct. |
| `templates/booking-confirmation.tsx` | Good | React Email component pattern is correct. |
| `templates/booking-reminder-24h.tsx` | Good | Needs explicit file implementation (plan gives brief description only). |
| `templates/booking-cancellation.tsx` | Good | Needs explicit file implementation. |
| `templates/booking-approved.tsx` | Good | Needs explicit file implementation. |
| `templates/booking-reminder-sms.ts` | Good | SMS template functions are clean. |
| `lib/template-engine.ts` | Good | Well-specified. |
| `lib/variable-builder.ts` | Good | Well-specified. |

**Plan gaps identified:**
1. `notification.repository.ts` is referenced in `notification.events.ts` (`notificationRepository.hasNotificationBeenSent`, `loadBookingForNotification`) but is not listed as a deliverable in the plan's file table. This file MUST be created.
2. The `notification/send.email` event schema (`variables: Record<string, string>`) is too loose — it is being used as a side channel to pass rendered HTML, subjects, and IDs. This should be a typed envelope. See Section 5.
3. Missing `BOOKING_REJECTED` from the DB `messageTrigger` enum (it is in `MessageTrigger` TypeScript type but not in the schema). Either add it to the schema or remove it from the type.

#### Calendar-Sync Module (13 files)

| File | Plan Quality | Assessment |
|------|-------------|------------|
| `calendar-sync.types.ts` | Good | Well-specified. |
| `calendar-sync.schemas.ts` | Good | Standard pattern. |
| `calendar-sync.repository.ts` | Good | Standard Drizzle pattern. |
| `calendar-sync.service.ts` | Good | OAuth + sync orchestration. |
| `calendar-sync.router.ts` | Good | Thin admin router. |
| `calendar-sync.events.ts` | Good | Fills Phase 2 stubs. Correct approach. |
| `lib/google-calendar-client.ts` | Good | Port from legacy with `bottleneck` rate limiting. |
| `lib/google-calendar-sync.ts` | Good | Push bookings to Google Calendar. |
| `lib/google-calendar-pull.ts` | Good | Pull external events. |
| `lib/google-calendar-watch.ts` | Good | Watch channel management. |
| `lib/calendar-event-mapper.ts` | Good | Booking ↔ Google event mapping. |
| `lib/oauth.ts` | Good | AES-256-GCM token encryption. |
| `index.ts` | Good | Barrel export. |

**Plan gap identified:**
The plan puts all calendar logic in `lib/google-*` files but does NOT define a `CalendarProvider` interface or any provider abstraction layer. This is the single largest architectural gap relative to the CTO brief ("make it modular... if things change... Outlook/Apple Calendar... we are golden"). Section 3 defines the complete provider abstraction.

#### New Webhook Route

| File | Plan Quality | Assessment |
|------|-------------|------------|
| `src/app/api/integrations/google-calendar/webhook/route.ts` | Good | Plan specifies channel token validation in Phase 4 (correct). One improvement: the webhook route path should be generalized as `/api/webhooks/google-calendar/route.ts` to match a consistent webhook namespace. |

### Summary Verdict on PHASE4_PLAN.md

The plan is 90% correct and implementable as-is. The critical improvements are:
1. Add `notification.repository.ts` to the file list
2. Fix `notification.events.ts` to use Drizzle not Prisma syntax
3. Add a `CalendarProvider` interface to calendar-sync for future-proofing
4. Tighten the `notification/send.email` event payload schema

---

## Section 2: Notification Module Architecture (the 10x Design)

### Complete File Structure

```
src/modules/notification/
├── providers/
│   ├── email/
│   │   ├── index.ts                    (EmailProvider interface)
│   │   ├── resend.provider.ts          (Resend implementation)
│   │   └── console.provider.ts         (dev/test — logs to console)
│   └── sms/
│       ├── index.ts                    (SMSProvider interface)
│       ├── twilio.provider.ts          (Twilio implementation)
│       └── console.provider.ts         (dev/test — logs to console)
├── templates/
│   ├── email/
│   │   ├── _base-layout.tsx            (shared layout wrapper)
│   │   ├── booking-confirmed.tsx
│   │   ├── booking-reminder-24h.tsx
│   │   ├── booking-cancellation.tsx
│   │   ├── booking-approved.tsx
│   │   ├── booking-rejected.tsx
│   │   ├── portal-invite.tsx
│   │   └── review-request.tsx
│   └── sms/
│       └── booking-sms.ts              (SMS_TEMPLATES constant)
├── notification.types.ts
├── notification.schemas.ts
├── notification.repository.ts          (MISSING from plan — required)
├── notification.service.ts
├── notification.events.ts
├── notification.router.ts
└── index.ts
```

**Note on the original plan's flat `providers/` structure:** The plan specifies `providers/email.provider.ts` and `providers/sms.provider.ts` as flat files. This works for Phase 4's scope. However, to honour the CTO brief (swappable providers without application code changes), the subdirectory structure above is recommended. In Phase 4, only the Resend and Twilio implementations need to exist; the `console.provider.ts` files are trivial to add and save significant pain in CI/local development.

### Provider Interfaces

#### `src/modules/notification/providers/email/index.ts`

```typescript
export interface EmailSendInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  fromName?: string
  fromEmail?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Contract that every email provider must implement.
 * Swap Resend → Postmark → SES by swapping the implementation
 * behind this interface — zero application code changes.
 */
export interface EmailProvider {
  send(input: EmailSendInput): Promise<EmailSendResult>
}
```

#### `src/modules/notification/providers/sms/index.ts`

```typescript
export interface SmsSendInput {
  to: string       // E.164 format enforced before calling
  body: string
}

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Contract that every SMS provider must implement.
 * Swap Twilio → Vonage → AWS SNS by swapping the implementation.
 */
export interface SMSProvider {
  send(input: SmsSendInput): Promise<SmsSendResult>
}
```

### Provider Selection Pattern

Provider selection is driven by an environment variable:

```
NOTIFICATION_EMAIL_PROVIDER=resend     # default; also: console
NOTIFICATION_SMS_PROVIDER=twilio       # default; also: console
```

The factory function (in `notification.service.ts` or a dedicated `providers/factory.ts`):

```typescript
// src/modules/notification/providers/factory.ts

import type { EmailProvider } from './email'
import type { SMSProvider } from './sms'

export function getEmailProvider(): EmailProvider {
  const provider = process.env.NOTIFICATION_EMAIL_PROVIDER ?? 'resend'
  switch (provider) {
    case 'console': return new ConsoleEmailProvider()
    case 'resend':  return new ResendEmailProvider()
    default:
      throw new Error(`Unknown email provider: ${provider}`)
  }
}

export function getSmsProvider(): SMSProvider {
  const provider = process.env.NOTIFICATION_SMS_PROVIDER ?? 'twilio'
  switch (provider) {
    case 'console': return new ConsoleSmsProvider()
    case 'twilio':  return new TwilioSmsProvider()
    default:
      throw new Error(`Unknown SMS provider: ${provider}`)
  }
}
```

**Singleton pattern:** Providers are instantiated at module load time (module-level singleton). The `getEmailProvider()` factory is called once at startup, not per-request. This avoids repeated client initialization overhead with the Resend and Twilio SDKs.

```typescript
// At the bottom of factory.ts:
export const emailProvider = getEmailProvider()
export const smsProvider = getSmsProvider()
```

### ConsoleEmailProvider (dev/test)

```typescript
// src/modules/notification/providers/email/console.provider.ts
import { logger } from '@/shared/logger'
import type { EmailProvider, EmailSendInput, EmailSendResult } from './index'

export class ConsoleEmailProvider implements EmailProvider {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const log = logger.child({ module: 'console.email.provider' })
    log.info({
      to: input.to,
      subject: input.subject,
      html: input.html.substring(0, 200) + '...',
    }, '[DEV] Email would be sent')
    return { success: true, messageId: `console-${Date.now()}` }
  }
}
```

### ResendEmailProvider

```typescript
// src/modules/notification/providers/email/resend.provider.ts
import { Resend } from 'resend'
import { logger } from '@/shared/logger'
import type { EmailProvider, EmailSendInput, EmailSendResult } from './index'

const resend = new Resend(process.env.RESEND_API_KEY)
const log = logger.child({ module: 'resend.email.provider' })

export class ResendEmailProvider implements EmailProvider {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (!process.env.RESEND_API_KEY) {
      log.warn({ to: input.to }, 'RESEND_API_KEY not set — email not sent')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const from = input.fromEmail
      ? `${input.fromName ?? 'Ironheart'} <${input.fromEmail}>`
      : `${input.fromName ?? 'Ironheart'} <${process.env.RESEND_FROM_EMAIL}>`

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      })

      if (error) {
        log.error({ to: input.to, error }, 'Resend API error')
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log.error({ to: input.to, err }, 'Email send failed')
      return { success: false, error: message }
    }
  }
}
```

### Template Rendering Decoupled from Transport

The rendering pipeline is entirely separate from the transport layer:

```
1. Template resolution   (notification.service.ts)
   DB template (tenant-specific) → React Email component (system fallback)

2. Rendering             (notification.service.ts)
   React Email component → await render(component) → HTML string
   (Uses @react-email/render, NOT passed directly to Resend as `react` prop)

3. Dispatch event        (notification.service.ts emits Inngest event)
   { to, subject, html, text, tenantId, bookingId } → notification/send.email

4. Transport             (notification.events.ts handler)
   emailProvider.send({ to, subject, html }) → Resend API
   → Write to sent_messages table
```

This separation means:
- Templates can be unit-tested by rendering them to HTML without touching the network
- Transport failures retry independently of template rendering
- Swapping the email provider requires zero changes to template code

### NotificationPayload Type

The `notification/send.email` event payload is a clean typed envelope (not `Record<string, string>`):

```typescript
// In inngest.ts — replace existing loose type
"notification/send.email": {
  data: {
    to: string              // recipient email
    subject: string         // rendered subject
    html: string            // rendered HTML body
    text?: string           // rendered plain text fallback
    replyTo?: string
    bookingId?: string      // for SentMessage audit log
    tenantId: string        // for SentMessage audit log
    templateId?: string     // DB template ID if used (null = system React Email)
    trigger: string         // MessageTrigger enum value for audit
  }
}

"notification/send.sms": {
  data: {
    to: string              // E.164 phone number
    body: string            // rendered SMS body
    bookingId?: string
    tenantId: string
    templateId?: string
    trigger: string
  }
}
```

The `notification.service.ts` renders the template and packs the rendered output directly into the event payload — not through a `variables` map. The handler just reads `event.data.html` and calls the provider. No re-rendering in the handler.

### Notification Preferences

Check `notificationPreferences` table before emitting events:

```typescript
// In notification.service.ts sendForBooking():
const prefs = await db.query.notificationPreferences.findFirst({
  where: eq(notificationPreferences.userId, booking.customer.userId),
})

// Only emit email event if email is enabled (default: true)
if (!prefs || prefs.emailEnabled) {
  await inngest.send({ name: 'notification/send.email', data: emailPayload })
}

// Only emit SMS event if SMS is enabled (default: false)
if (prefs?.smsEnabled && booking.customer.phone) {
  await inngest.send({ name: 'notification/send.sms', data: smsPayload })
}
```

### Idempotency

The `sent_messages` table is the idempotency store. Before sending any notification, check if a row already exists for the combination of `(bookingId, trigger, channel)`. The `hasNotificationBeenSent` check uses this pattern:

```typescript
// notification.repository.ts
async hasNotificationBeenSent(
  bookingId: string,
  trigger: string,
  channel: 'EMAIL' | 'SMS'
): Promise<boolean> {
  const existing = await db
    .select({ id: sentMessages.id })
    .from(sentMessages)
    .where(
      and(
        eq(sentMessages.bookingId, bookingId),
        // Store trigger in a metadata column — see Section 6 for schema gap
        eq(sentMessages.status, 'SENT'),
        eq(sentMessages.channel, channel),
      )
    )
    .limit(1)
  return existing.length > 0
}
```

**Note:** The current `sent_messages` schema lacks a `trigger` column — see Section 6 for the required schema addition.

### notification.repository.ts (Missing File)

This file is referenced in `notification.events.ts` but not listed in the plan. It must exist:

```typescript
// src/modules/notification/notification.repository.ts
import { db } from '@/shared/db'
import { eq, and } from 'drizzle-orm'
import { sentMessages, messageTemplates, bookings } from '@/shared/db/schema'
import type { BookingForVariables } from './lib/variable-builder'
import type { MessageTrigger, MessageChannel } from './notification.types'

export const notificationRepository = {
  /**
   * Load a booking with all relations needed for template variable building.
   * Joins: customer, service, staff, venue, tenant, tenant.settings
   */
  async loadBookingForNotification(bookingId: string): Promise<BookingForVariables | null> { ... },

  /**
   * Idempotency check: has a notification been sent for this booking+trigger+channel?
   */
  async hasNotificationBeenSent(
    bookingId: string,
    trigger: MessageTrigger,
    channel: MessageChannel
  ): Promise<boolean> { ... },

  /**
   * Write a SentMessage audit record.
   * Uses ON CONFLICT DO NOTHING to be safe under concurrent retries.
   */
  async recordSentMessage(data: {
    tenantId: string
    bookingId?: string
    templateId?: string
    channel: MessageChannel
    trigger: MessageTrigger
    recipientEmail?: string
    recipientPhone?: string
    subject?: string
    body: string
    status: 'SENT' | 'FAILED'
    sentAt?: Date
    providerRef?: string
    errorMessage?: string
  }): Promise<void> { ... },

  /**
   * Query MessageTemplate rows for a tenant+trigger+channel combination.
   * Returns service-specific template first, then general template, then null.
   */
  async resolveTemplate(
    tenantId: string,
    trigger: MessageTrigger,
    channel: MessageChannel,
    serviceId?: string
  ): Promise<MessageTemplateRow | null> { ... },
}
```

---

## Section 3: Calendar-Sync Module Architecture (the 10x Design)

### The Missing Abstraction Layer

The PHASE4_PLAN.md builds everything Google-specific directly into the module. This violates the CTO brief. The fix: introduce a thin `CalendarProvider` interface that all provider implementations must satisfy. The Google implementation is the only concrete implementation in Phase 4; Outlook and Apple are stubs.

### Complete File Structure

```
src/modules/calendar-sync/
├── providers/
│   ├── index.ts                        (CalendarProvider interface — NEW)
│   ├── google/
│   │   ├── index.ts                    (GoogleCalendarProvider implements CalendarProvider)
│   │   ├── google.auth.ts              (OAuth2 token management, refresh)
│   │   └── google.webhook.ts           (watch channel management)
│   ├── outlook/
│   │   └── index.ts                    (stub — OutlookCalendarProvider)
│   └── apple/
│       └── index.ts                    (stub — AppleCalendarProvider)
├── lib/
│   ├── calendar-event-mapper.ts        (Booking ↔ CalendarEvent canonical mapping)
│   ├── oauth.ts                        (AES-256-GCM token encryption/decryption)
│   ├── rate-limiter.ts                 (Bottleneck instance — shared by all providers)
│   └── provider-factory.ts             (resolves CalendarProvider from userIntegration.provider)
├── calendar-sync.types.ts
├── calendar-sync.schemas.ts
├── calendar-sync.repository.ts
├── calendar-sync.service.ts
├── calendar-sync.events.ts
├── calendar-sync.router.ts
└── index.ts
```

### CalendarProvider Interface

```typescript
// src/modules/calendar-sync/providers/index.ts

/**
 * Canonical calendar event — the common denominator across Google, Outlook, Apple.
 * All provider implementations map to/from this shape.
 */
export interface CalendarEvent {
  /** Provider-specific event ID (opaque string) */
  externalId: string
  /** Calendar ID the event belongs to */
  calendarId: string
  summary: string
  description?: string
  location?: string
  /** ISO 8601 UTC */
  startTime: string
  /** ISO 8601 UTC */
  endTime: string
  isAllDay: boolean
  /** Attendees as email strings */
  attendees?: string[]
  /** Raw provider-specific metadata for round-tripping */
  raw?: Record<string, unknown>
}

export interface CreateEventInput {
  calendarId: string
  summary: string
  description?: string
  location?: string
  startTime: string   // ISO 8601 UTC
  endTime: string     // ISO 8601 UTC
  attendees?: string[]
  /** Idempotency key — providers that support it use this to prevent duplicates */
  idempotencyKey?: string
}

export interface UpdateEventInput {
  calendarId: string
  externalId: string
  summary?: string
  description?: string
  location?: string
  startTime?: string
  endTime?: string
}

export interface WatchChannelResult {
  channelId: string
  channelToken: string
  resourceId: string
  /** ISO 8601 UTC — when the watch channel expires */
  expiresAt: string
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  /** Unix timestamp in ms */
  expiresAt: number
}

/**
 * The contract that every calendar provider must implement.
 *
 * Swapping Google → Outlook → Apple requires:
 * 1. A new class implementing this interface
 * 2. A new row in the CalendarIntegrationProvider enum
 * 3. Adding to the factory in provider-factory.ts
 *
 * Zero changes to calendar-sync.service.ts, calendar-sync.events.ts,
 * or any application logic.
 */
export interface CalendarProvider {
  readonly providerName: string   // 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR' | 'APPLE_CALENDAR'

  // ─── Event CRUD ──────────────────────────────────────────────────────────
  createEvent(tokens: OAuthTokens, input: CreateEventInput): Promise<CalendarEvent>
  updateEvent(tokens: OAuthTokens, input: UpdateEventInput): Promise<CalendarEvent>
  deleteEvent(tokens: OAuthTokens, calendarId: string, externalId: string): Promise<void>
  listEvents(tokens: OAuthTokens, calendarId: string, options: {
    timeMin: string   // ISO 8601 UTC
    timeMax: string   // ISO 8601 UTC
    pageToken?: string
    maxResults?: number
  }): Promise<{ events: CalendarEvent[]; nextPageToken?: string }>

  // ─── OAuth ───────────────────────────────────────────────────────────────
  /**
   * Exchange authorization code for access + refresh tokens.
   */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>

  /**
   * Refresh an expired access token using the refresh token.
   */
  refreshToken(refreshToken: string): Promise<OAuthTokens>

  /**
   * Generate the OAuth authorization URL.
   */
  getAuthUrl(state: string, redirectUri: string): string

  // ─── Webhooks ────────────────────────────────────────────────────────────
  /**
   * Register a push notification channel (Google: watch channels; Outlook: subscriptions).
   * Returns null for providers that don't support push notifications (Apple).
   */
  watchCalendar(tokens: OAuthTokens, calendarId: string, webhookUrl: string): Promise<WatchChannelResult | null>

  /**
   * Stop/delete a push notification channel.
   */
  stopWatch(tokens: OAuthTokens, channelId: string, resourceId: string): Promise<void>

  /**
   * Validate an incoming webhook notification.
   * Returns the calendarId or null if the notification is invalid.
   */
  validateWebhookRequest(request: Request, storedChannelToken: string): Promise<string | null>
}
```

### GoogleCalendarProvider

```typescript
// src/modules/calendar-sync/providers/google/index.ts
import { google, calendar_v3 } from 'googleapis'
import Bottleneck from 'bottleneck'
import retry from 'async-retry'
import type { CalendarProvider, CalendarEvent, CreateEventInput, UpdateEventInput,
              WatchChannelResult, OAuthTokens } from '../index'
import { getGoogleOAuth2Client } from './google.auth'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'google.calendar.provider' })

// Shared rate limiter — 10 requests/second, max 100 concurrent
const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 })

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
    return limiter.schedule(() =>
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
        return mapGoogleEventToCanonical(response.data)
      }, { retries: 3, minTimeout: 1000, factor: 2 })
    )
  }

  async updateEvent(tokens: OAuthTokens, input: UpdateEventInput): Promise<CalendarEvent> {
    return limiter.schedule(() =>
      retry(async () => {
        const cal = this.getClient(tokens)
        const response = await cal.events.patch({
          calendarId: input.calendarId,
          eventId: input.externalId,
          requestBody: {
            summary: input.summary,
            description: input.description,
            location: input.location,
            ...(input.startTime && { start: { dateTime: input.startTime, timeZone: 'UTC' } }),
            ...(input.endTime && { end: { dateTime: input.endTime, timeZone: 'UTC' } }),
          },
        })
        return mapGoogleEventToCanonical(response.data)
      }, { retries: 3, minTimeout: 1000, factor: 2 })
    )
  }

  async deleteEvent(tokens: OAuthTokens, calendarId: string, externalId: string): Promise<void> {
    return limiter.schedule(() =>
      retry(async () => {
        const cal = this.getClient(tokens)
        await cal.events.delete({ calendarId, eventId: externalId })
      }, { retries: 3, minTimeout: 1000, factor: 2 })
    )
  }

  async listEvents(tokens: OAuthTokens, calendarId: string, options: {
    timeMin: string; timeMax: string; pageToken?: string; maxResults?: number
  }): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    return limiter.schedule(() =>
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
          events: (response.data.items ?? []).map(mapGoogleEventToCanonical),
          nextPageToken: response.data.nextPageToken ?? undefined,
        }
      }, { retries: 3, minTimeout: 1000, factor: 2 })
    )
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const auth = getGoogleOAuth2Client(redirectUri)
    const { tokens } = await auth.getToken(code)
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: tokens.expiry_date!,
    }
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const auth = getGoogleOAuth2Client()
    auth.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await auth.refreshAccessToken()
    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token ?? refreshToken,
      expiresAt: credentials.expiry_date!,
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

  async watchCalendar(tokens: OAuthTokens, calendarId: string, webhookUrl: string): Promise<WatchChannelResult | null> {
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
        params: { ttl: '604800' }, // 7 days in seconds
      },
    })
    return {
      channelId,
      channelToken,
      resourceId: response.data.resourceId!,
      expiresAt: new Date(Number(response.data.expiration)).toISOString(),
    }
  }

  async stopWatch(tokens: OAuthTokens, channelId: string, resourceId: string): Promise<void> {
    const cal = this.getClient(tokens)
    await cal.channels.stop({
      requestBody: { id: channelId, resourceId },
    })
  }

  async validateWebhookRequest(request: Request, storedChannelToken: string): Promise<string | null> {
    // Google sends: X-Goog-Channel-Token and X-Goog-Resource-State headers
    const channelToken = request.headers.get('X-Goog-Channel-Token')
    const resourceState = request.headers.get('X-Goog-Resource-State')
    const calendarId = request.headers.get('X-Goog-Resource-Id')

    if (!channelToken || channelToken !== storedChannelToken) {
      return null  // Invalid token — reject
    }
    if (resourceState === 'sync') {
      return null  // Sync message — not a real event change, ignore
    }
    return calendarId  // Valid notification
  }
}

function mapGoogleEventToCanonical(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    externalId: event.id!,
    calendarId: 'primary', // caller knows the calendarId
    summary: event.summary ?? '(No title)',
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    startTime: event.start?.dateTime ?? event.start?.date + 'T00:00:00Z',
    endTime: event.end?.dateTime ?? event.end?.date + 'T00:00:00Z',
    isAllDay: !event.start?.dateTime,
    attendees: event.attendees?.map(a => a.email ?? '').filter(Boolean),
    raw: event as unknown as Record<string, unknown>,
  }
}
```

### Outlook and Apple Stubs

```typescript
// src/modules/calendar-sync/providers/outlook/index.ts
import type { CalendarProvider, CalendarEvent, CreateEventInput, UpdateEventInput,
              WatchChannelResult, OAuthTokens } from '../index'

/**
 * Outlook Calendar provider stub.
 * Implement when Outlook support is needed — all method signatures are locked.
 * Uses Microsoft Graph API (https://graph.microsoft.com/v1.0/me/events).
 */
export class OutlookCalendarProvider implements CalendarProvider {
  readonly providerName = 'OUTLOOK_CALENDAR' as const

  createEvent(_tokens: OAuthTokens, _input: CreateEventInput): Promise<CalendarEvent> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  updateEvent(_tokens: OAuthTokens, _input: UpdateEventInput): Promise<CalendarEvent> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  deleteEvent(_tokens: OAuthTokens, _calendarId: string, _externalId: string): Promise<void> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  listEvents(_tokens: OAuthTokens, _calendarId: string, _options: unknown): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokens> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  refreshToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  getAuthUrl(_state: string, _redirectUri: string): string {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  watchCalendar(_tokens: OAuthTokens, _calendarId: string, _webhookUrl: string): Promise<WatchChannelResult | null> {
    // Outlook uses Graph subscriptions — similar concept, different API
    throw new Error('OutlookCalendarProvider not implemented')
  }
  stopWatch(_tokens: OAuthTokens, _channelId: string, _resourceId: string): Promise<void> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
  async validateWebhookRequest(_request: Request, _storedChannelToken: string): Promise<string | null> {
    throw new Error('OutlookCalendarProvider not implemented')
  }
}
```

### Provider Factory

```typescript
// src/modules/calendar-sync/lib/provider-factory.ts
import type { CalendarProvider } from '../providers'
import { GoogleCalendarProvider } from '../providers/google'
import { OutlookCalendarProvider } from '../providers/outlook'

/**
 * Resolve the CalendarProvider implementation from the stored provider enum value.
 * Called per-integration — the provider is stored in userIntegrations.provider.
 */
export function getCalendarProvider(provider: 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR'): CalendarProvider {
  switch (provider) {
    case 'GOOGLE_CALENDAR':
      return new GoogleCalendarProvider()
    case 'OUTLOOK_CALENDAR':
      return new OutlookCalendarProvider()
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}
```

### OAuth Token Encryption

```typescript
// src/modules/calendar-sync/lib/oauth.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12        // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16  // 128-bit authentication tag

function getEncryptionKey(): Buffer {
  const hex = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a plaintext OAuth token for storage.
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypt an encrypted token from storage.
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
```

### Webhook Routing — Generic Pattern

The webhook route should be named for the provider it serves, but all validation is delegated to the `CalendarProvider` interface:

```typescript
// src/app/api/webhooks/google-calendar/route.ts
import { NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'
import { calendarSyncRepository } from '@/modules/calendar-sync/calendar-sync.repository'
import { GoogleCalendarProvider } from '@/modules/calendar-sync/providers/google'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'google-calendar.webhook' })
const provider = new GoogleCalendarProvider()

export async function POST(request: Request) {
  const channelId = request.headers.get('X-Goog-Channel-ID')

  if (!channelId) {
    log.warn('Webhook received without X-Goog-Channel-ID header')
    return NextResponse.json({ ok: false }, { status: 200 }) // Always 200 to Google
  }

  // Look up the stored watch channel record
  const integration = await calendarSyncRepository.findByWatchChannelId(channelId)
  if (!integration) {
    log.warn({ channelId }, 'Webhook received for unknown channel — ignoring')
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  // Delegate validation to the provider — provider-agnostic call site
  const calendarId = await provider.validateWebhookRequest(request, integration.watchChannelToken ?? '')
  if (!calendarId) {
    log.warn({ channelId }, 'Webhook validation failed — invalid channel token')
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  // Emit Inngest event — actual sync happens there
  await inngest.send({
    name: 'calendar/webhook.received',
    data: {
      channelId,
      resourceId: request.headers.get('X-Goog-Resource-Id') ?? '',
    },
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
```

**Why always return 200?** Google (and most webhook systems) will retry if it receives any non-2xx response. Returning 200 even on validation failure prevents retry storms. The validation failure is logged and the event is simply not emitted.

### Canonical CalendarEvent Type

The `CalendarEvent` interface above (in `providers/index.ts`) is the canonical type that maps to all three providers. The `calendar-event-mapper.ts` translates between `Booking` (Drizzle row) and `CalendarEvent`:

```typescript
// src/modules/calendar-sync/lib/calendar-event-mapper.ts
import type { CalendarEvent, CreateEventInput } from '../providers'

export interface BookingForCalendar {
  id: string
  bookingNumber: string
  scheduledDate: Date
  scheduledTime: string   // "HH:MM"
  durationMinutes: number
  locationType: string
  locationAddress: Record<string, unknown> | null
  customer: { firstName: string; lastName: string; email: string | null } | null
  service: { name: string } | null
  staff: { firstName: string; lastName: string } | null
  tenant: { name: string } | null
}

/**
 * Map a Booking row to a CalendarEvent CreateInput.
 * All times are normalized to UTC ISO 8601.
 */
export function bookingToCalendarEvent(
  booking: BookingForCalendar,
  calendarId: string
): CreateEventInput {
  const startDateTime = buildStartDateTime(booking.scheduledDate, booking.scheduledTime)
  const endDateTime = addMinutes(startDateTime, booking.durationMinutes)

  return {
    calendarId,
    summary: `${booking.service?.name ?? 'Booking'} — ${booking.customer?.firstName ?? 'Customer'} ${booking.customer?.lastName ?? ''}`.trim(),
    description: [
      `Booking: ${booking.bookingNumber}`,
      booking.customer?.email ? `Customer: ${booking.customer.email}` : null,
      booking.staff ? `Staff: ${booking.staff.firstName} ${booking.staff.lastName}` : null,
    ].filter(Boolean).join('\n'),
    location: formatLocation(booking.locationAddress),
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    attendees: booking.customer?.email ? [booking.customer.email] : [],
    idempotencyKey: `booking-${booking.id}`,
  }
}
```

### calendar-sync.service.ts Key Methods

```typescript
export const calendarSyncService = {
  /**
   * Push a booking to the user's connected calendar.
   * Called by the Inngest handler for calendar/sync.push.
   */
  async pushBookingToCalendar(bookingId: string, userId: string): Promise<void>,

  /**
   * Pull external calendar events for a user (incremental sync).
   * Called by the cron-based Inngest handler.
   */
  async pullCalendarEvents(userIntegrationId: string): Promise<void>,

  /**
   * Refresh OAuth token for a user integration.
   * Called by the token refresh cron handler.
   */
  async refreshToken(userIntegrationId: string): Promise<void>,

  /**
   * Renew an expiring watch channel.
   * Called by the watch channel cron handler.
   */
  async renewWatchChannel(userIntegrationId: string): Promise<void>,

  /**
   * Handle a calendar webhook notification — trigger incremental pull.
   */
  async handleWebhook(channelId: string, resourceId: string): Promise<void>,

  /**
   * Start OAuth flow — generate state, store in oauth_states table, return auth URL.
   */
  async initiateOAuth(userId: string, tenantId: string, redirectUrl: string): Promise<string>,

  /**
   * Complete OAuth flow — exchange code, encrypt tokens, store in user_integrations.
   */
  async completeOAuth(code: string, state: string): Promise<void>,

  /**
   * Disconnect a user integration — stop watch channels, delete tokens.
   */
  async disconnect(userId: string, tenantId: string): Promise<void>,
}
```

---

## Section 4: Template System Design (Resend React Email)

### The Two Approaches — When to Use Each

| Approach | When to Use | Mechanism |
|----------|-------------|-----------|
| Pass `react` prop to Resend | Quick prototypes, server environment is pure Next.js | Resend renders the component server-side |
| Pre-render with `@react-email/render` + pass `html` | **Recommended for Ironheart** — gives explicit, testable HTML | `await render(<Component />)` returns HTML string |

**Ironheart uses the pre-render approach.** Reasons:
1. The pre-rendered HTML can be stored in logs and the `sent_messages` table for debugging
2. Template unit tests can verify the rendered HTML without mocking Resend
3. The `notification.service.ts` owns rendering; the provider just transports bytes
4. Avoids Next.js Server Components restrictions on the `react` prop pattern

### `@react-email/render` API (as of React Email 5.x)

```typescript
import { render } from '@react-email/render'

// Async (React Email 5.x — renderAsync is deprecated)
const html = await render(<BookingConfirmationEmail {...props} />)

// Options
const html = await render(<MyTemplate />, {
  pretty: false,    // Don't pretty-print (smaller payload)
})

// Get plain text version
const text = await render(<MyTemplate />, {
  plainText: true,
})
```

**Important:** As of React Email 5.0, `renderAsync` is deprecated. Use `render` (which is now async). Always `await` it.

### Base Layout Component

```tsx
// src/modules/notification/templates/email/_base-layout.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Hr,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BaseLayoutProps {
  children: React.ReactNode
  tenantName: string
  tenantLogoUrl?: string
  previewText?: string
}

/**
 * Base email layout — shared wrapper for all Ironheart email templates.
 * Provides consistent header (logo), body container, and footer.
 * Never hardcode tenant names or logos — always use props.
 */
export function BaseLayout({ children, tenantName, tenantLogoUrl, previewText }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        {/* Preview text trick: invisible text shown in email clients' inbox preview */}
        {previewText && (
          <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
            {previewText}
          </div>
        )}
      </Head>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>
          {/* Header */}
          <Section style={{ padding: '24px 32px', textAlign: 'center' as const }}>
            {tenantLogoUrl
              ? <Img src={tenantLogoUrl} alt={tenantName} width="150" height="40" style={{ objectFit: 'contain' }} />
              : <Text style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>{tenantName}</Text>
            }
          </Section>

          {/* Content area */}
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px', margin: '0 0 24px' }}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 16px' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }}>
            {tenantName}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

### Template Component Pattern

```tsx
// src/modules/notification/templates/email/booking-confirmed.tsx
import { Text, Heading, Hr, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

interface BookingConfirmedEmailProps {
  customerName: string
  serviceName: string
  bookingDate: string     // "Monday, 15 February 2026"
  bookingTime: string     // "2:30 PM"
  bookingDuration?: string
  bookingNumber: string
  bookingUrl: string
  locationAddress?: string
  tenantName: string
  tenantLogoUrl?: string
  tenantPhone?: string
  tenantEmail?: string
}

export function BookingConfirmedEmail(props: BookingConfirmedEmailProps) {
  const {
    customerName, serviceName, bookingDate, bookingTime, bookingDuration,
    bookingNumber, bookingUrl, locationAddress, tenantName, tenantLogoUrl,
    tenantPhone, tenantEmail,
  } = props

  return (
    <BaseLayout
      tenantName={tenantName}
      tenantLogoUrl={tenantLogoUrl}
      previewText={`Your ${serviceName} booking is confirmed for ${bookingDate}`}
    >
      <Heading style={{ color: '#059669', fontSize: '24px', margin: '0 0 16px' }}>
        Booking Confirmed
      </Heading>
      <Text style={{ color: '#374151', margin: '0 0 24px' }}>
        Hi {customerName}, your booking has been confirmed.
      </Text>

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />

      {/* Details table */}
      <Row style={{ marginBottom: '12px' }}>
        <Column style={{ color: '#6b7280', width: '40%' }}>Service</Column>
        <Column style={{ fontWeight: '600', color: '#111827' }}>{serviceName}</Column>
      </Row>
      <Row style={{ marginBottom: '12px' }}>
        <Column style={{ color: '#6b7280', width: '40%' }}>Date</Column>
        <Column style={{ fontWeight: '600', color: '#111827' }}>{bookingDate}</Column>
      </Row>
      <Row style={{ marginBottom: '12px' }}>
        <Column style={{ color: '#6b7280', width: '40%' }}>Time</Column>
        <Column style={{ fontWeight: '600', color: '#111827' }}>{bookingTime}</Column>
      </Row>
      {bookingDuration && (
        <Row style={{ marginBottom: '12px' }}>
          <Column style={{ color: '#6b7280', width: '40%' }}>Duration</Column>
          <Column style={{ color: '#111827' }}>{bookingDuration}</Column>
        </Row>
      )}
      {locationAddress && (
        <Row style={{ marginBottom: '12px' }}>
          <Column style={{ color: '#6b7280', width: '40%' }}>Location</Column>
          <Column style={{ color: '#111827' }}>{locationAddress}</Column>
        </Row>
      )}
      <Row style={{ marginBottom: '12px' }}>
        <Column style={{ color: '#6b7280', width: '40%' }}>Reference</Column>
        <Column style={{ color: '#111827' }}>{bookingNumber}</Column>
      </Row>

      <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

      <Text style={{ color: '#374151' }}>
        <Link href={bookingUrl} style={{ color: '#059669' }}>View your booking</Link>
      </Text>

      <Text style={{ color: '#374151' }}>
        Questions?{' '}
        {tenantPhone && <Link href={`tel:${tenantPhone}`} style={{ color: '#059669' }}>{tenantPhone}</Link>}
        {tenantPhone && tenantEmail && ' · '}
        {tenantEmail && <Link href={`mailto:${tenantEmail}`} style={{ color: '#059669' }}>{tenantEmail}</Link>}
      </Text>

      <Text style={{ color: '#374151', margin: '24px 0 0' }}>
        Thank you,<br />
        <strong>{tenantName}</strong>
      </Text>
    </BaseLayout>
  )
}

export default BookingConfirmedEmail
```

### Rendering in notification.service.ts

```typescript
import { render } from '@react-email/render'
import { BookingConfirmedEmail } from './templates/email/booking-confirmed'

// Inside sendForBooking():
const html = await render(
  BookingConfirmedEmail({
    customerName: vars.customerName,
    serviceName: vars.serviceName,
    bookingDate: vars.bookingDate,
    bookingTime: vars.bookingTime,
    bookingDuration: vars.bookingDuration,
    bookingNumber: vars.bookingNumber,
    bookingUrl: vars.bookingUrl,
    tenantName: vars.tenantName,
    tenantLogoUrl: vars.tenantLogoUrl,
    tenantPhone: vars.tenantPhone,
    tenantEmail: vars.tenantEmail,
  })
)

const text = await render(
  BookingConfirmedEmail({ ...sameProps }),
  { plainText: true }
)
```

### Development Preview Server

The `react-email` package includes a dev server for live-previewing templates:

```bash
npx react-email dev --dir src/modules/notification/templates/email --port 3001
```

Add to `package.json`:
```json
"email:dev": "react-email dev --dir src/modules/notification/templates/email --port 3001"
```

### Next.js Configuration

React Email requires the following in `next.config.js` (or `next.config.ts`) to avoid bundling issues:

```javascript
const nextConfig = {
  serverExternalPackages: ['@react-email/render', '@react-email/components'],
}
```

**Why:** `@react-email/render` uses Node.js-specific APIs that cannot run in the Next.js edge runtime. Marking them as external ensures they run in the full Node.js runtime only.

### Resend Dashboard Templates vs React Email

| Resend Dashboard Templates | React Email (our approach) |
|---------------------------|---------------------------|
| Visual editor, non-technical team use | Code-first, TypeScript-typed |
| Templates stored in Resend cloud | Templates stored in codebase, version-controlled |
| Limited programmability | Full React props, conditionals, loops |
| `templateId` API (different endpoint) | `html` string (standard endpoint) |

**Decision:** Use React Email components checked into the codebase. This gives version control, TypeScript type safety for template props, and local testability. Resend dashboard templates are designed for marketing teams to edit without code access — not appropriate for transactional booking notifications that are tightly coupled to booking data types.

---

## Section 5: Event Catalog Additions

### Current Events (in inngest.ts) — Problems to Fix

The existing `notification/send.email` and `notification/send.sms` events use `variables: Record<string, string>` as a side channel for passing rendered HTML, subject lines, and metadata. This is fragile and untyped. Replace with proper typed envelopes.

### Corrected and New Event Definitions

Replace the existing `notification/send.email` and `notification/send.sms` in `src/shared/inngest.ts`:

```typescript
// REPLACE existing notification events:
"notification/send.email": {
  data: {
    to: string
    subject: string
    html: string
    text?: string
    replyTo?: string
    bookingId?: string
    tenantId: string
    templateId?: string   // null = system React Email template was used
    trigger: string       // MessageTrigger value — for audit log
  }
}

"notification/send.sms": {
  data: {
    to: string            // E.164 format
    body: string
    bookingId?: string
    tenantId: string
    templateId?: string
    trigger: string
  }
}

// ADD — calendar events (calendar/sync.push and calendar/webhook.received already exist):
// No new calendar events needed; the existing three cover all Phase 4 use cases:
//   calendar/sync.push   → push booking to calendar
//   calendar/sync.pull   → pull external events for a user
//   calendar/webhook.received → Google push notification received
```

### Complete Event Catalog (Phase 4 state)

| Event | Producer | Consumer | Status |
|-------|----------|----------|--------|
| `booking/created` | booking.service | booking.events | Exists |
| `booking/confirmed` | booking.service | notification.events, scheduling.events | Exists |
| `booking/cancelled` | booking.service | notification.events | Exists |
| `booking/completed` | booking.service | review.events | Exists |
| `booking/reservation.expired` | booking.events | booking.service | Exists |
| `slot/reserved` | booking.service | booking.events | Exists |
| `slot/released` | booking.service | (cleanup) | Exists |
| `notification/send.email` | notification.service | notification.events | **Reshape** |
| `notification/send.sms` | notification.service | notification.events | **Reshape** |
| `calendar/sync.push` | booking.events (stub) | calendar-sync.events | Exists — upgrade stub |
| `calendar/sync.pull` | scheduling.events | calendar-sync.events | Exists |
| `calendar/webhook.received` | webhook route | calendar-sync.events | Exists |
| `workflow/trigger` | (future) | (future) | Exists |
| `review/request.send` | booking.events | notification.events | Exists |

**No new event names needed for Phase 4.** The existing catalog covers all use cases.

### Inngest Function ID Stability

The plan correctly specifies upgrading stubs in-place. This table maps stub IDs to their Phase 4 owners:

| Inngest Function ID | Current Location | Phase 4 Location | Action |
|---------------------|------------------|------------------|--------|
| `send-booking-confirmation-email` | `booking.events.ts` | `notification.events.ts` | **Remove from booking.events.ts — add to notification.events.ts** |
| `push-booking-to-calendar` | `booking.events.ts` | `calendar-sync.events.ts` | **Remove from booking.events.ts — add to calendar-sync.events.ts** |
| `pull-calendar-events-cron` | `scheduling.events.ts` | `scheduling.events.ts` | **Upgrade stub body in-place** |
| `refresh-calendar-tokens-cron` | `scheduling.events.ts` | `scheduling.events.ts` | **Upgrade stub body in-place** |
| `renew-watch-channels-cron` | `scheduling.events.ts` | `scheduling.events.ts` | **Upgrade stub body in-place** |
| `handle-notification-send-email` | (new) | `notification.events.ts` | Create |
| `handle-notification-send-sms` | (new) | `notification.events.ts` | Create |
| `send-booking-confirmation-notification` | (new) | `notification.events.ts` | Create |
| `send-booking-cancellation-notification` | (new) | `notification.events.ts` | Create |
| `send-review-request` | (new) | `notification.events.ts` | Create |
| `handle-calendar-webhook` | (new) | `calendar-sync.events.ts` | Create |

**Warning on moving function IDs:** Moving `send-booking-confirmation-email` from `booking.events.ts` to `notification.events.ts` under the SAME function ID is safe — Inngest identifies functions by ID, not file location. The function just needs to be registered in the `serve()` call. Remove the booking.events stub body and re-register the same ID in notification.events.ts with the real implementation.

---

## Section 6: Database Schema Gaps

### notifications.schema.ts Gaps

#### Gap 1: Missing `trigger` column on `sent_messages`

The idempotency check (`hasNotificationBeenSent`) needs to distinguish "has a BOOKING_CONFIRMED email been sent" from "has a BOOKING_CANCELLED email been sent". Currently there is no `trigger` column on `sent_messages`.

**Required addition:**
```typescript
// In sentMessages table definition:
trigger: messageTrigger(),   // NOT NULL — add after migration
```

**Migration impact:** Add column with default value or make nullable (`messageTrigger()`). Existing rows can be NULL; new rows must always have a trigger value.

#### Gap 2: Missing `bodyHtml` column on `message_templates`

The plan's `MessageTemplateRecord` interface specifies `bodyHtml?: string | null` for HTML email bodies, but the schema only has `body` (plain text). The existing `MessageTemplate` table needs a `bodyHtml` column to store custom HTML templates that override the React Email system template.

**Required addition:**
```typescript
// In messageTemplates table definition:
bodyHtml: text(),   // nullable — HTML body for EMAIL templates
```

#### Gap 3: `tenantId` NOT NULL on `message_templates` conflicts with system templates

The plan states system templates have `tenantId: null` but the schema has `tenantId: uuid().notNull()`. System React Email templates are not stored in the DB (they're code), so this is actually fine for Phase 4 — but the `MessageTemplateRecord` TypeScript interface has `tenantId: string | null` which creates a mismatch with the DB schema. Either:
- Remove `tenantId: null` from the TypeScript type (it's never null in DB)
- Make `tenantId` nullable in the DB schema for future system template seeding

**Recommendation:** Keep the DB column as NOT NULL (as-is). Remove `string | null` from the TypeScript type — system templates are React Email components, not DB rows. Update the `MessageTemplateRecord` interface accordingly.

#### Gap 4: `BOOKING_REJECTED` and `REVIEW_REQUEST` missing from `messageTrigger` enum

The TypeScript `MessageTrigger` union type includes `BOOKING_REJECTED` and `REVIEW_REQUEST`, but the DB `messageTrigger` enum is:
```
BOOKING_CREATED | BOOKING_CONFIRMED | BOOKING_CANCELLED | BOOKING_REMINDER_24H |
BOOKING_REMINDER_2H | BOOKING_COMPLETED | APPROVAL_REQUIRED | BOOKING_APPROVED |
BOOKING_REJECTED | PAYMENT_RECEIVED | INVOICE_SENT
```

`REVIEW_REQUEST` is missing from the DB enum. Add it.

**Required addition:**
```sql
ALTER TYPE "MessageTrigger" ADD VALUE 'REVIEW_REQUEST';
```

In Drizzle schema:
```typescript
export const messageTrigger = pgEnum("MessageTrigger", [
  'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
  'BOOKING_REMINDER_24H', 'BOOKING_REMINDER_2H', 'BOOKING_COMPLETED',
  'APPROVAL_REQUIRED', 'BOOKING_APPROVED', 'BOOKING_REJECTED',
  'PAYMENT_RECEIVED', 'INVOICE_SENT',
  'REVIEW_REQUEST',   // ADD THIS
])
```

### calendar.schema.ts Gaps

#### Gap 5: `integrations` table is tenant-level but calendar is user-level

The `integrations` table tracks tenant-level integrations (Stripe, Xero, etc.) and has its own `accessToken`/`refreshToken` columns (not encrypted). The `userIntegrations` table is the correct home for per-user calendar tokens (it already uses `encryptedAccessToken`/`encryptedRefreshToken`). No changes needed here, but agents must NOT use the `integrations` table for Google Calendar — always use `userIntegrations`.

#### Gap 6: `userIntegrations` lacks a `syncPageToken` column

Google Calendar incremental sync uses a `syncToken` (or page token) to fetch only changed events since the last sync. This needs to be stored per-integration. Without it, every pull does a full sync (expensive, rate-limit risk).

**Required addition:**
```typescript
// In userIntegrations table:
syncToken: text(),    // Google Calendar sync token for incremental pulls
```

#### Gap 7: Missing index on `userIntegrations.watchChannelId`

The webhook route does `findByWatchChannelId()` on every webhook POST. Without an index this is a full table scan. The schema already has `watchChannelExpiration` indexed but not `watchChannelId`.

**Required addition:**
```typescript
index("user_integrations_watchChannelId_idx").using("btree", table.watchChannelId.asc().nullsLast().op("text_ops")),
```

#### Gap 8: `userExternalEvents` unique index uses `uuid_ops` on a `text` column

```typescript
uniqueIndex("user_external_events_userIntegrationId_externalEventId_key")
  .using("btree", ..., table.externalEventId.asc().nullsLast().op("uuid_ops"))
```

`externalEventId` is a `text()` column but the unique index uses `uuid_ops`. This will fail at runtime if Google's event IDs don't conform to UUID format (they don't — they're Base32 encoded strings). Change to `text_ops`.

**Required fix:**
```typescript
uniqueIndex("user_external_events_userIntegrationId_externalEventId_key")
  .using("btree",
    table.userIntegrationId.asc().nullsLast().op("uuid_ops"),
    table.externalEventId.asc().nullsLast().op("text_ops")   // FIX: text_ops not uuid_ops
  ),
```

### Summary of Schema Changes Required

| Change | Table | Type | Priority |
|--------|-------|------|----------|
| Add `trigger` column | `sent_messages` | Missing column | HIGH — idempotency depends on it |
| Add `bodyHtml` column | `message_templates` | Missing column | HIGH — custom HTML templates |
| Add `REVIEW_REQUEST` to enum | `messageTrigger` | Missing enum value | HIGH — code references it |
| Add `syncToken` column | `user_integrations` | Missing column | HIGH — incremental sync |
| Add index on `watchChannelId` | `user_integrations` | Missing index | MEDIUM — webhook performance |
| Fix `uuid_ops` → `text_ops` | `user_external_events` | Wrong index op | HIGH — runtime failure |

---

## Section 7: Implementation Wave Plan

Waves are designed for parallel agent execution. Dependencies are explicit. Each agent operates on a non-overlapping file set.

### Wave 1: Foundation (Parallel — no dependencies between agents)

All Wave 1 files have no imports from other Phase 4 files.

**Agent A: Schema + Dependencies**
- Update `src/shared/db/schemas/notifications.schema.ts` — add `trigger`, `bodyHtml` columns; add `REVIEW_REQUEST` to enum
- Update `src/shared/db/schemas/calendar.schema.ts` — add `syncToken` to `userIntegrations`; fix `uuid_ops` → `text_ops`; add `watchChannelId` index
- Run `npm install resend twilio @react-email/components react-email @react-email/render googleapis bottleneck async-retry`
- Run `npm install --save-dev @types/async-retry`
- Update `next.config.js` to add `serverExternalPackages: ['@react-email/render', '@react-email/components']`
- Update `src/shared/inngest.ts` — reshape `notification/send.email` and `notification/send.sms` event data types

**Agent B: Notification Types + Schemas**
- Write `src/modules/notification/notification.types.ts` (as specified in PHASE4_PLAN.md T02)
- Write `src/modules/notification/notification.schemas.ts` (as specified in PHASE4_PLAN.md T09)

**Agent C: Calendar Types + Schemas**
- Write `src/modules/calendar-sync/calendar-sync.types.ts` (as specified in PHASE4_PLAN.md T13)
- Write `src/modules/calendar-sync/calendar-sync.schemas.ts`

**Agent D: Provider Interfaces**
- Write `src/modules/notification/providers/email/index.ts` (EmailProvider interface)
- Write `src/modules/notification/providers/sms/index.ts` (SMSProvider interface)
- Write `src/modules/calendar-sync/providers/index.ts` (CalendarProvider interface + canonical types)

### Wave 2: Core Infrastructure (Parallel — depends on Wave 1)

**Agent E: Email Provider Implementations**
- Depends on: Agent D (EmailProvider interface)
- Write `src/modules/notification/providers/email/resend.provider.ts`
- Write `src/modules/notification/providers/email/console.provider.ts`
- Write `src/modules/notification/providers/factory.ts`

**Agent F: SMS Provider Implementations**
- Depends on: Agent D (SMSProvider interface)
- Write `src/modules/notification/providers/sms/twilio.provider.ts`
- Write `src/modules/notification/providers/sms/console.provider.ts`

**Agent G: Template Engine + Variable Builder**
- Depends on: Agent B (notification.types.ts)
- Write `src/modules/notification/lib/template-engine.ts` (PHASE4_PLAN.md T03)
- Write `src/modules/notification/lib/variable-builder.ts` (PHASE4_PLAN.md T04)

**Agent H: OAuth + Calendar Crypto**
- Depends on: Agent C (calendar-sync.types.ts)
- Write `src/modules/calendar-sync/lib/oauth.ts` (AES-256-GCM token encryption)
- Write `src/modules/calendar-sync/lib/rate-limiter.ts` (Bottleneck shared instance)

**Agent I: Google Calendar Auth**
- Depends on: Agent D (CalendarProvider interface), Agent H (oauth.ts)
- Write `src/modules/calendar-sync/providers/google/google.auth.ts`

**Agent J: Calendar Provider Stubs**
- Depends on: Agent D (CalendarProvider interface)
- Write `src/modules/calendar-sync/providers/outlook/index.ts` (stub)
- Write `src/modules/calendar-sync/providers/apple/index.ts` (stub, if desired)

### Wave 3: Implementations (Parallel — depends on Wave 2)

**Agent K: React Email Templates**
- Depends on: Agent B (notification.types.ts — for TemplateVariables type)
- Write `src/modules/notification/templates/email/_base-layout.tsx`
- Write `src/modules/notification/templates/email/booking-confirmed.tsx`
- Write `src/modules/notification/templates/email/booking-reminder-24h.tsx`
- Write `src/modules/notification/templates/email/booking-cancellation.tsx`
- Write `src/modules/notification/templates/email/booking-approved.tsx`
- Write `src/modules/notification/templates/email/booking-rejected.tsx`
- Write `src/modules/notification/templates/email/review-request.tsx`
- Write `src/modules/notification/templates/sms/booking-sms.ts`

**Agent L: Google Calendar Provider Implementation**
- Depends on: Agent D (CalendarProvider interface), Agent I (google.auth.ts), Agent H (rate-limiter.ts)
- Write `src/modules/calendar-sync/providers/google/index.ts` (GoogleCalendarProvider)
- Write `src/modules/calendar-sync/providers/google/google.webhook.ts`
- Write `src/modules/calendar-sync/lib/provider-factory.ts`

**Agent M: Calendar Event Mapper + Repository**
- Depends on: Agent D (CalendarProvider interface), Agent C (calendar-sync.types.ts)
- Write `src/modules/calendar-sync/lib/calendar-event-mapper.ts`
- Write `src/modules/calendar-sync/calendar-sync.repository.ts`

### Wave 4: Service + Repository Layer (Sequential — depends on Wave 3)

**Agent N: Notification Repository + Service**
- Depends on: Agents G, E, F, K (all notification infrastructure)
- Write `src/modules/notification/notification.repository.ts` (**MISSING from plan**)
- Write `src/modules/notification/notification.service.ts` (PHASE4_PLAN.md T08)

**Agent O: Calendar Sync Service**
- Depends on: Agents L, M (calendar provider + repository)
- Write `src/modules/calendar-sync/calendar-sync.service.ts`

### Wave 5: Routers + Event Handlers (Parallel — depends on Wave 4)

**Agent P: Notification Router + Events**
- Depends on: Agent N (notification.service.ts)
- Write `src/modules/notification/notification.router.ts` (PHASE4_PLAN.md T10)
- Write `src/modules/notification/notification.events.ts` (PHASE4_PLAN.md T11)
- Write `src/modules/notification/index.ts` (PHASE4_PLAN.md T12)

**Agent Q: Calendar Router + Events**
- Depends on: Agent O (calendar-sync.service.ts)
- Write `src/modules/calendar-sync/calendar-sync.router.ts`
- Write `src/modules/calendar-sync/calendar-sync.events.ts`
- Write `src/modules/calendar-sync/index.ts`

### Wave 6: Wiring + Stub Upgrades (Sequential — depends on Wave 5)

**Agent R: Stub Upgrades + Registration**
- Depends on: Agents P, Q (all events.ts files)
- Update `src/modules/booking/booking.events.ts` — remove `sendBookingConfirmationEmail` stub body (keep Inngest ID, point to new handler); remove `pushBookingToCalendar` stub
- Update `src/modules/scheduling/scheduling.events.ts` — upgrade `pullCalendarEventsCron`, `refreshCalendarTokensCron`, `renewWatchChannelsCron` stub bodies with real implementation (call calendarSyncService)
- Update `src/app/api/inngest/route.ts` — add `notificationFunctions` and `calendarSyncFunctions` to `serve()` call
- Update `src/server/root.ts` — add `notificationRouter` and `calendarSyncRouter`
- Write `src/app/api/webhooks/google-calendar/route.ts` (webhook receiver)
- Update `.env.example` with all 10 new environment variables

### Wave 7: Verification

- Run `tsc --noEmit` — fix any type errors
- Run `npm run build` — fix any build errors
- Run `npm test` — all 73 tests must still pass
- Start Inngest dev server — verify all handler IDs are registered
- Test `notification/send.email` event from Inngest dashboard — verify Resend test mode delivery
- Test `calendar/sync.push` event — verify Google Calendar event creation

---

## Section 8: Package Dependencies

### Already in package.json

| Package | Version | Status |
|---------|---------|--------|
| `zod` | ^4.3.6 | Present |
| `drizzle-orm` | ^0.45.1 | Present |
| `inngest` | ^3.52.1 | Present |
| `react` | 19.2.3 | Present |
| `react-dom` | 19.2.3 | Present |
| `next` | 16.1.6 | Present |
| `pino` | ^10.3.1 | Present |
| `@upstash/redis` | ^1.36.2 | Present |

### New Packages Required (not in package.json)

**Production dependencies:**

| Package | Purpose | Install Command |
|---------|---------|-----------------|
| `resend` | Resend email API client | `npm install resend` |
| `twilio` | Twilio SMS client | `npm install twilio` |
| `@react-email/components` | Email UI components (Html, Body, Text, etc.) | `npm install @react-email/components` |
| `@react-email/render` | Renders React Email to HTML string | `npm install @react-email/render` |
| `react-email` | Dev preview server + CLI | `npm install react-email` |
| `googleapis` | Google Calendar API client | `npm install googleapis` |
| `bottleneck` | Rate limiting for API calls | `npm install bottleneck` |
| `async-retry` | Retry logic with exponential backoff | `npm install async-retry` |

**Development dependencies:**

| Package | Purpose | Install Command |
|---------|---------|-----------------|
| `@types/async-retry` | TypeScript types for async-retry | `npm install --save-dev @types/async-retry` |

**Note on `@types/twilio`:** The plan mentions this but the `twilio` package ships its own TypeScript declarations. Do NOT install `@types/twilio` — it does not exist on npm and would cause an install error.

**Note on `bottleneck`:** The `bottleneck` package ships TypeScript declarations. No `@types/bottleneck` needed.

**Note on `googleapis`:** The `googleapis` package ships TypeScript declarations. No separate `@types` package needed.

### Complete Install Command

```bash
cd /Users/lukehodges/Documents/ironheart-refactor

npm install \
  resend \
  twilio \
  @react-email/components \
  @react-email/render \
  react-email \
  googleapis \
  bottleneck \
  async-retry

npm install --save-dev \
  @types/async-retry
```

### next.config.js Addition Required

```javascript
// next.config.js (or next.config.ts)
const nextConfig = {
  // ... existing config
  serverExternalPackages: [
    '@react-email/render',
    '@react-email/components',
  ],
}
```

This prevents Next.js from trying to bundle these Node.js-specific packages in the edge runtime.

---

## Appendix: Key Architectural Decisions

### Decision 1: Pre-render HTML, pass `html` string to Resend (not `react` prop)

**Rationale:** The `react` prop on `resend.emails.send()` is convenient but less transparent. Pre-rendering with `await render(<Component />)` gives us the HTML string we can: inspect in logs, store in `sent_messages.body`, unit test, and debug. The rendered HTML travels through the Inngest event as a string, making the pipeline fully observable.

### Decision 2: Provider interface per channel (not one mega-interface)

`EmailProvider` and `SMSProvider` are separate interfaces. A future "push notification provider" can be added without touching email or SMS. The factory resolves them independently.

### Decision 3: CalendarProvider per-user, not per-tenant

Calendar integrations are stored in `userIntegrations` (per-user). A tenant can have multiple staff each with their own Google Calendar. The `calendarSyncService` always operates on a `userIntegrationId`, not a `tenantId`.

### Decision 4: `NOTIFICATION_EMAIL_PROVIDER=console` in development/test

Never send real emails in development or CI. The `ConsoleEmailProvider` logs to Pino instead. The factory reads `process.env.NOTIFICATION_EMAIL_PROVIDER` at startup. Add `NOTIFICATION_EMAIL_PROVIDER=console` to `.env.local`.

### Decision 5: Idempotency stored in `sent_messages`, not Redis

The `sent_messages` table is the permanent audit log. An idempotency check that reads from the DB is durable across Inngest retries and pod restarts. Redis would lose idempotency data on cache eviction.

### Decision 6: Webhook route always returns 200

Returning non-2xx to Google Calendar webhooks causes retry storms. Always return 200. Log and discard invalid requests silently. Only emit the Inngest event for validated requests.

### Decision 7: AES-256-GCM for OAuth tokens, not legacy approach

The legacy `encryptToken`/`decryptToken` in `src/lib/crypto/token-encryption.ts` should be reviewed before porting. Phase 4's `oauth.ts` implements a fresh, explicit AES-256-GCM with authentication tags — this provides confidentiality AND integrity verification, protecting against bit-flip attacks on encrypted tokens.
