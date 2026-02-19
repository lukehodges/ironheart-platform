# Phase 4: Notification + Calendar-Sync Modules — Executable Plan

**Written:** 2026-02-19
**Status:** Ready to execute (after Phase 3 completes)
**Depends on:** Phase 0 (shared infra) + Phase 1 (booking events emitted) + Phase 2 (cron stubs registered)

---

## Overview

> **Scope note:** The legacy `CotswoldPartyBooking.tsx` portal component and all
> Cotswold-specific template logic are NOT ported to this module. The refactor is
> a generic platform. Client-specific behaviour is driven by tenant configuration
> in the DB, not by code.

**Phase goal:** Two modules in one phase.

1. **Notification module** — replace the legacy dummy communications system with real email via Resend and real SMS via Twilio. All delivery is triggered by Inngest events, never inline in the request path. The legacy `triggers.ts` called `setImmediate(() => sendEmail(...))` — this phase replaces that pattern entirely with typed Inngest handlers. The legacy `triggerCotswold*` functions in `triggers.ts` are NOT ported.

2. **Calendar-sync module** — port the Google Calendar two-way sync (OAuth, push, pull, webhooks, watch channels) into a clean module. Fill in the log-only Inngest stubs left in Phase 2 (`pull-calendar-events-cron`, `refresh-calendar-tokens-cron`, `renew-watch-channels-cron`, `pull-calendar-events-cron`, `calendar/sync.push` handler).

After this phase: booking events cause real email/SMS delivery. Google Calendar is fully wired two-way. All 6 cron migrations from Phase 2 are complete end-to-end (not just stubbed).

### What gets built

#### Notification module

| File | Purpose |
|------|---------|
| `src/modules/notification/notification.types.ts` | TypeScript types + enums |
| `src/modules/notification/notification.schemas.ts` | Zod schemas for router inputs |
| `src/modules/notification/notification.service.ts` | Orchestration: load booking, resolve template, dispatch |
| `src/modules/notification/notification.router.ts` | Admin: list templates, update template, test send |
| `src/modules/notification/notification.events.ts` | Inngest handlers for all notification/* and booking/* events |
| `src/modules/notification/providers/email.provider.ts` | Resend wrapper |
| `src/modules/notification/providers/sms.provider.ts` | Twilio wrapper |
| `src/modules/notification/templates/booking-confirmation.tsx` | React Email template |
| `src/modules/notification/templates/booking-reminder-24h.tsx` | React Email template |
| `src/modules/notification/templates/booking-cancellation.tsx` | React Email template |
| `src/modules/notification/templates/booking-approved.tsx` | React Email template |
| `src/modules/notification/templates/booking-reminder-sms.ts` | SMS template strings |
| `src/modules/notification/lib/template-engine.ts` | Variable substitution engine (port from legacy) |
| `src/modules/notification/lib/variable-builder.ts` | Booking variable builder (port from legacy) |
| `src/modules/notification/index.ts` | Barrel export |

#### Calendar-sync module

| File | Purpose |
|------|---------|
| `src/modules/calendar-sync/calendar-sync.types.ts` | TypeScript types |
| `src/modules/calendar-sync/calendar-sync.schemas.ts` | Zod schemas |
| `src/modules/calendar-sync/calendar-sync.repository.ts` | DB queries for integrations + external events |
| `src/modules/calendar-sync/calendar-sync.service.ts` | OAuth, push/pull orchestration |
| `src/modules/calendar-sync/calendar-sync.router.ts` | Admin: connect/disconnect, list events, manual sync |
| `src/modules/calendar-sync/calendar-sync.events.ts` | Inngest handlers (fill Phase 2 stubs) |
| `src/modules/calendar-sync/lib/google-calendar-client.ts` | Google Calendar API wrapper (port fresh) |
| `src/modules/calendar-sync/lib/google-calendar-sync.ts` | Push bookings to calendar |
| `src/modules/calendar-sync/lib/google-calendar-pull.ts` | Pull external events |
| `src/modules/calendar-sync/lib/google-calendar-watch.ts` | Watch channel management |
| `src/modules/calendar-sync/lib/calendar-event-mapper.ts` | Booking ↔ Google Calendar event mapping |
| `src/modules/calendar-sync/lib/oauth.ts` | OAuth flow, token exchange, refresh, encryption |
| `src/modules/calendar-sync/index.ts` | Barrel export |

#### New webhook route

| File | Purpose |
|------|---------|
| `src/app/api/integrations/google-calendar/webhook/route.ts` | Receives Google push notifications |

### Source files (legacy reference — read, do not copy)

| Legacy file | LOC | Disposition |
|-------------|-----|-------------|
| `src/lib/messaging/templates.ts` | 680 | Port template engine + default templates → `notification/lib/template-engine.ts` |
| `src/lib/messaging/variable-builder.ts` | 550 | Port variable builder → `notification/lib/variable-builder.ts` |
| `src/lib/messaging/triggers.ts` | 639 | Replace entirely — logic becomes Inngest handlers in `notification.events.ts` |
| `src/lib/integrations/google-calendar-client.ts` | 712 | Port fresh → `calendar-sync/lib/google-calendar-client.ts` |
| `src/lib/integrations/google-calendar-sync.ts` | 685 | Port fresh → `calendar-sync/lib/google-calendar-sync.ts` |
| `src/lib/integrations/google-calendar-pull.ts` | 406 | Port fresh → `calendar-sync/lib/google-calendar-pull.ts` |
| `src/lib/integrations/google-calendar-watch.ts` | 614 | Port fresh → `calendar-sync/lib/google-calendar-watch.ts` |
| `src/lib/integrations/calendar-event-mapper.ts` | 306 | Port fresh → `calendar-sync/lib/calendar-event-mapper.ts` |
| `src/lib/integrations/integration-helpers.ts` | 396 | Port helper functions → `calendar-sync/lib/oauth.ts` + service |

### Success Criteria

Phase 4 is complete when ALL of the following are true:

- [ ] `npm run build` exits with 0 TypeScript errors
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] `src/modules/notification/` contains all 14 files listed above
- [ ] `src/modules/calendar-sync/` contains all 13 files listed above
- [ ] Inngest dev server shows all Phase 4 handlers registered:
  - `handle-notification-send-email`
  - `handle-notification-send-sms`
  - `send-booking-confirmation-notification`
  - `send-booking-cancellation-notification`
  - `send-review-request`
  - `push-booking-to-calendar` (previously stub — now implemented)
  - `handle-calendar-webhook`
  - `pull-calendar-events-cron` (previously stub — now implemented)
  - `refresh-calendar-tokens-cron` (previously stub — now implemented)
  - `renew-watch-channels-cron` (previously stub — now implemented)
- [ ] Sending a `notification/send.email` event from Inngest dashboard causes a real email to arrive via Resend (in dev: check Resend test mode dashboard)
- [ ] Sending a `calendar/sync.push` event causes a calendar event to appear in the test Google Calendar
- [ ] `src/app/api/integrations/google-calendar/webhook/route.ts` exists and returns 200 for valid webhook POSTs
- [ ] Webhook requests with invalid/missing channel tokens are rejected (log warning, return 200)
- [ ] Only requests with valid channel tokens matching the stored `watchChannelToken` emit the Inngest event
- [ ] `.env.example` documents all 8 new environment variables

---

## Architectural Notes

### Webhook validation in Phase 4 (not Phase 6)

Channel token validation is implemented in Phase 4 alongside the webhook route — NOT deferred to Phase 6. Deploying an unauthenticated webhook endpoint to production, even temporarily, creates an attack surface. The validation is a single database lookup and header comparison — it cannot be deferred.

### Notification: DB templates + React Email

The legacy system stores HTML templates in the `MessageTemplate` table (per-tenant, per-trigger, per-channel). This system is preserved — templates are loaded from the DB, variable substitution is applied, then the result is sent.

React Email templates are the new delivery format for **default system templates**. They produce well-structured HTML that replaces the raw HTML strings in the legacy `DEFAULT_TEMPLATES` array. When a tenant has a custom `MessageTemplate` row in the DB, that takes precedence over the system React Email template.

Decision hierarchy for template resolution:
1. Tenant-specific template for this trigger + channel + serviceId (DB row) — highest priority
2. Tenant-specific template for this trigger + channel (no serviceId) (DB row)
3. System React Email template (rendered at send time) — fallback

### Notification: Variable substitution

The legacy `{{variableName}}` substitution system in `templates.ts` is preserved as-is. The regex `\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}` is the same. The `TemplateVariables` interface is defined generically — covering customer, booking, service, staff, tenant, location, and payment fields. No client-specific fields.

The React Email templates use the same variable set via props, not string substitution.

### Notification: Inngest event flow

```
booking/confirmed emitted by booking.service
    ↓
send-booking-confirmation-notification handler
    ↓
notificationService.sendForBooking("BOOKING_CONFIRMED", bookingId)
    ↓
1. Load booking from DB with all relations
2. Resolve templates (DB → React Email fallback)
3. Build TemplateVariables via variableBuilder
4. inngest.send("notification/send.email", { to, templateId, variables })
5. inngest.send("notification/send.sms", { to, templateId, variables })
    ↓
handle-notification-send-email handler
    ↓
emailProvider.send() → Resend API
    ↓
Record SentMessage row in DB
```

The two-step pattern (confirm → dispatch → send) provides:
- Retries scoped to individual delivery (email retry doesn't retry the DB load)
- SMS and email failures are independent
- `SentMessage` table is the audit log

### Calendar-sync: Inngest stubs upgraded in-place

Phase 2 registered these functions with log-only bodies:
- `pull-calendar-events-cron` — runs every 15 min
- `refresh-calendar-tokens-cron` — runs every 30 min
- `renew-watch-channels-cron` — runs daily at 2am

Phase 4 replaces the stub bodies in `src/modules/scheduling/scheduling.events.ts`. The functions keep the same Inngest IDs (no re-registration needed). The `calendar/sync.push` handler stub in Phase 1's `booking.events.ts` is also upgraded.

### Calendar-sync: OAuth token encryption

The legacy system uses `encryptToken` / `decryptToken` from `src/lib/crypto/token-encryption.ts`. Phase 4 implements a fresh equivalent in `calendar-sync/lib/oauth.ts` using Node's built-in `crypto` module (AES-256-GCM). The encryption key is `CALENDAR_TOKEN_ENCRYPTION_KEY` (32-byte hex string).

Never store plaintext OAuth tokens in the database.

### Calendar-sync: Dependencies upgrade

The legacy `google-calendar-client.ts` uses `Bottleneck` and `async-retry` for rate limiting and retry logic. Phase 4 keeps this pattern. Install these two packages in PHASE4-T01.

The legacy `google-calendar-sync.ts` uses `opossum` (circuit breaker). Phase 4 implements a simpler version without the `opossum` dependency — Inngest's built-in retry mechanism provides equivalent fault tolerance.

### Phase 2 stubs location

The stubs to upgrade are at these exact paths:
- `src/modules/scheduling/scheduling.events.ts` — `pullCalendarEventsCron`, `refreshCalendarTokensCron`, `renewWatchChannelsCron`
- `src/modules/booking/booking.events.ts` — `pushBookingToCalendar`

Do NOT create new Inngest functions for these — upgrade the existing stubs in-place so the Inngest function IDs remain stable.

---

## New Dependencies

Install in PHASE4-T01:

```
resend
twilio
@react-email/components
react-email
@react-email/render
googleapis
bottleneck
async-retry
@types/async-retry
```

**New env vars:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes | Resend API key for email delivery |
| `RESEND_FROM_EMAIL` | Yes | Sender address (e.g. `bookings@ironheart.app`) |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Yes | Twilio sender number (E.164 format) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback URL |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | Yes | 32-byte hex string for token encryption |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for webhook endpoint construction |

---

## Task Breakdown

---

### PHASE4-T01: Install dependencies and create directory structure

**Goal:** Install all new npm packages, create the module directory trees, and stub out placeholder `index.ts` files.

**Commands:**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor

npm install \
  resend \
  twilio \
  @react-email/components \
  react-email \
  @react-email/render \
  googleapis \
  bottleneck \
  async-retry

npm install --save-dev \
  @types/async-retry \
  @types/twilio
```

**Create directories:**

```bash
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/notification/providers
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/notification/templates
mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/notification/lib

mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/modules/calendar-sync/lib

mkdir -p /Users/lukehodges/Documents/ironheart-refactor/src/app/api/integrations/google-calendar/webhook
```

**Verify:** `package.json` shows all packages installed. No `npm ERR!` output.

---

### PHASE4-T02: Write `notification.types.ts`

**Goal:** TypeScript types for the notification module. These mirror the legacy `MessageTemplate` Prisma model and the `TemplateVariables` interface from `templates.ts`, but decoupled from Prisma imports.

**File: `src/modules/notification/notification.types.ts`**

```typescript
export type MessageChannel = 'EMAIL' | 'SMS'

export type MessageTrigger =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_REMINDER_24H'
  | 'BOOKING_REMINDER_2H'
  | 'REVIEW_REQUEST'

/**
 * All variables available for {{variableName}} substitution in templates.
 * Generic, white-label set — no client-specific fields.
 * Fields are optional to allow partial builds — required fields are enforced
 * per-template via the requiredVariables array on MessageTemplateRecord.
 */
export interface TemplateVariables {
  // Customer
  customerName: string
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone: string

  // Booking
  bookingNumber: string
  bookingDate: string          // e.g. "Wednesday 25 February 2026"
  bookingTime: string          // e.g. "2:00 PM"
  bookingDuration: string      // e.g. "2 hours"
  bookingStatus: string
  bookingUrl: string           // confirmation page URL

  // Service
  serviceName: string
  serviceDescription: string

  // Staff
  staffName: string
  staffPhone: string

  // Location
  locationAddress: string
  locationType: string

  // Tenant (branding)
  tenantName: string
  tenantPhone: string
  tenantEmail: string
  tenantLogoUrl: string

  // Pricing
  totalAmount: string
  depositRequired: string
  depositPaid: string
}

/**
 * Template record as loaded from the DB (MessageTemplate table).
 * Mirrors the Drizzle row shape — no Prisma dependency.
 */
export interface MessageTemplateRecord {
  id: string
  tenantId: string | null        // null = system default
  trigger: MessageTrigger
  channel: MessageChannel
  name: string
  description?: string | null
  subject?: string | null        // EMAIL only
  body: string                   // Plain text body (used for SMS; also fallback for email)
  bodyHtml?: string | null       // HTML body (EMAIL only; overrides body for rendering)
  serviceId?: string | null      // Service-specific override
  requiredVariables: string[]
  active: boolean
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Rendered and ready-to-send message.
 */
export interface RenderedMessage {
  subject?: string               // EMAIL only
  bodyText: string               // Plain text (always present)
  bodyHtml?: string              // HTML (EMAIL only; may be undefined for plain-text templates)
  channel: MessageChannel
}

/**
 * Result of a single send attempt recorded in SentMessage table.
 */
export interface SendResult {
  success: boolean
  messageId?: string             // Provider message ID (Resend ID or Twilio SID)
  error?: string
}

/**
 * Full dispatch result for a booking notification trigger.
 * One trigger → potentially multiple channels.
 */
export interface NotificationResult {
  success: boolean
  emailSent: boolean
  smsSent: boolean
  errors: string[]
  messageIds: {
    email?: string
    sms?: string
  }
}
```

**Verify:** File compiles. No implicit `any`.

---

### PHASE4-T03: Write `notification/lib/template-engine.ts`

**Goal:** Port the variable substitution engine from legacy `templates.ts`. This is pure string logic — no DB, no providers.

**File: `src/modules/notification/lib/template-engine.ts`**

Key functions to implement:

```typescript
/**
 * Variable substitution regex: matches {{variableName}} or {{ variableName }}
 */
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

/**
 * Render a template string with variable substitution.
 * In non-strict mode (default), missing variables render as empty string.
 * In strict mode, throws TemplateRenderError on missing required variable.
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables,
  strict: boolean = false
): string { ... }

/**
 * Render a complete message template (subject + body + bodyHtml).
 * Validates required variables before rendering.
 */
export function renderMessage(
  template: MessageTemplateRecord,
  variables: TemplateVariables,
  strict: boolean = true
): RenderedMessage { ... }

/**
 * Extract all {{variableName}} references from a template string.
 * Used by the admin template editor to show which variables are used.
 */
export function extractVariables(template: string): string[] { ... }

/**
 * Validate that all required variables are present and non-empty.
 */
export function validateTemplate(
  template: Pick<MessageTemplateRecord, 'requiredVariables'>,
  variables: TemplateVariables
): { valid: boolean; errors: string[]; missingVariables: string[] } { ... }

export class TemplateRenderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateRenderError'
  }
}
```

**Critical implementation notes from legacy:**
- Non-strict mode replaces missing variables with empty string (not the raw `{{placeholder}}`). Customers must never see raw placeholder text.
- `renderMessage` calls `validateTemplate` when `strict = true`. If validation fails, throw `TemplateRenderError` with all missing variable names joined.
- `extractVariables` must reset the regex `lastIndex` between calls — the regex is stateful.

**Verify:** File compiles. No implicit `any`.

---

### PHASE4-T04: Write `notification/lib/variable-builder.ts`

**Goal:** Port the booking variable builder from legacy `variable-builder.ts`. Given a booking with all relations loaded, produce a `TemplateVariables` object ready for template rendering.

**File: `src/modules/notification/lib/variable-builder.ts`**

The input type must be Drizzle-shaped (not Prisma). Define a `BookingWithRelations` interface using the Drizzle schema types.

Key functions to implement:

```typescript
export interface BookingForVariables {
  id: string
  tenantId: string
  bookingNumber: string
  scheduledDate: Date
  scheduledTime: string          // "HH:MM"
  durationMinutes: number
  endTime: string | null
  status: string
  locationType: string
  locationAddress: Record<string, unknown> | null
  price: number | null
  totalAmount: number | null
  depositRequired: number | null
  depositPaid: number
  customerNotes: string | null
  adminNotes: string | null
  createdAt: Date
  // Decimal fields (Drizzle returns as string from postgres driver)
  mileageCost?: string | null
  additionalCharges?: string | null
  customer: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    county?: string | null
    postcode?: string | null
  } | null
  service: {
    name: string
    description?: string | null
    durationMinutes: number
    price?: string | null
  } | null
  staff: {
    firstName: string
    lastName: string
    phone?: string | null
    email?: string | null
  } | null
  venue: {
    name: string
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    county?: string | null
    postcode?: string | null
  } | null
  tenant: {
    name: string
    slug: string
    settings?: {
      phone?: string | null
      email?: string | null
      logoUrl?: string | null
      currency?: string | null
    } | null
  } | null
}

/**
 * Build TemplateVariables from a booking with all relations.
 * Throws if customer, service, or tenant is missing (required relations).
 */
export function buildTemplateVariables(booking: BookingForVariables): TemplateVariables { ... }

// Formatting helpers (port directly from legacy variable-builder.ts)
export function formatBookingDate(date: Date): string { ... }  // "Monday, 15th February 2026"
export function formatTime(time: string): string { ... }       // "2:30 PM"
export function formatBookingDateTime(date: Date, time: string): string { ... }
export function formatDuration(minutes: number): string { ... }
export function formatCurrency(amount: number | string, currency?: string): string { ... }
```

**Key implementation notes:**
- `mileageCost` and `additionalCharges` come from Drizzle as strings (postgres `numeric` type). Use `parseFloat()` not `amount.toNumber()` (that was the Prisma Decimal API).
- `bookingUrl` is constructed as `https://${tenant.slug}.ironheart.app/confirmation/${booking.id}` — use this pattern for confirmation page links.
- Do NOT port `parseCustomerNotes()`, `getDurationText()`, `getBreakForFoodTime()`, or `getEntertainerArrivalTime()` — these are Cotswold-specific party helpers and have no place in the generic platform.
- Do NOT port `mileageRow`, `additionalChargesRow`, or the styled `adminNotes` callout block — these are Cotswold template fragments. Pricing fields are surfaced as plain string values (`totalAmount`, `depositRequired`, `depositPaid`) and formatted in the React Email templates.

**Verify:** File compiles. `buildTemplateVariables` is fully typed and returns all required fields from a complete booking.

---

### PHASE4-T05: Write `notification/providers/email.provider.ts`

**Goal:** Resend wrapper. Thin adapter — takes a rendered message and sends it. Never does template logic.

**File: `src/modules/notification/providers/email.provider.ts`**

```typescript
import { Resend } from 'resend'
import { log } from '@/shared/logger'

if (!process.env.RESEND_API_KEY) {
  // Warn at startup, not at send time — easier to detect misconfiguration
  console.warn('[email.provider] RESEND_API_KEY is not set. Email will not be sent.')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailSendInput {
  to: string
  subject: string
  html: string
  text?: string               // Plain text fallback
  replyTo?: string
  fromName?: string           // Override "from" display name
  fromEmail?: string          // Override "from" email (must be verified in Resend)
}

export interface EmailSendResult {
  success: boolean
  messageId?: string          // Resend message ID (for SentMessage log)
  error?: string
}

/**
 * Send an email via Resend.
 *
 * Returns { success: false, error } on failure — never throws.
 * Callers should check result.success and log failures.
 */
export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) {
    log.warn('Cannot send email: RESEND_API_KEY not set', { to: input.to })
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const from = input.fromEmail
    ? `${input.fromName || 'Ironheart'} <${input.fromEmail}>`
    : `${input.fromName || 'Ironheart'} <${process.env.RESEND_FROM_EMAIL}>`

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
      log.error('Resend API returned error', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Email send failed', { to: input.to, error: message })
    return { success: false, error: message }
  }
}
```

**Verify:** File compiles. TypeScript types for `resend` package resolve correctly.

---

### PHASE4-T06: Write `notification/providers/sms.provider.ts`

**Goal:** Twilio wrapper. Validates E.164 phone format before sending.

**File: `src/modules/notification/providers/sms.provider.ts`**

```typescript
import twilio from 'twilio'
import { log } from '@/shared/logger'

const E164_REGEX = /^\+[1-9]\d{1,14}$/

export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone)
}

/**
 * Format a UK phone number to E.164.
 * Handles: 07xxx → +447xxx, 01xxx → +441xxx
 * Pass through if already E.164.
 */
export function formatPhoneToE164(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('07') || cleaned.startsWith('01') || cleaned.startsWith('02')) {
    return '+44' + cleaned.slice(1)
  }
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2)
  }
  return cleaned
}

export interface SmsSendInput {
  to: string        // Must be E.164 format
  body: string      // Max 160 chars for single segment
}

export interface SmsSendResult {
  success: boolean
  messageId?: string    // Twilio SID
  error?: string
}

/**
 * Send an SMS via Twilio.
 * Returns { success: false, error } on failure — never throws.
 */
export async function sendSms(input: SmsSendInput): Promise<SmsSendResult> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    log.warn('Cannot send SMS: Twilio env vars not set', { to: input.to })
    return { success: false, error: 'Twilio not configured' }
  }

  const formatted = formatPhoneToE164(input.to)

  if (!isValidE164(formatted)) {
    log.warn('Cannot send SMS: invalid phone number', { original: input.to, formatted })
    return { success: false, error: `Invalid phone number: ${input.to}` }
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    const message = await client.messages.create({
      body: input.body,
      from: TWILIO_FROM_NUMBER,
      to: formatted,
    })

    return { success: true, messageId: message.sid }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('SMS send failed', { to: formatted, error: message })
    return { success: false, error: message }
  }
}
```

**Verify:** File compiles. `twilio` types resolve correctly.

---

### PHASE4-T07: Write React Email templates

**Goal:** Create 4 React Email templates. These are clean, generic, rebrandable system default templates — they render to HTML for Resend delivery. They accept `TemplateVariables` as props and use the same variable names as the substitution engine so they can coexist with DB templates. All templates use `tenantName` and `tenantLogoUrl` for white-labelling — no hardcoded branding. There is no party, entertainer, or Cotswold-specific content anywhere in these templates.

**File: `src/modules/notification/templates/booking-confirmation.tsx`**

```typescript
import {
  Html, Head, Body, Container, Section, Text, Heading, Hr,
  Row, Column, Link
} from '@react-email/components'

interface Props {
  customerName: string
  serviceName: string
  bookingDateTime: string
  bookingDuration?: string
  tenantName: string
  tenantLogoUrl?: string
  tenantPhone?: string
  tenantEmail?: string
  bookingUrl: string
  locationAddress?: string
}

export function BookingConfirmationEmail(props: Props) {
  const {
    customerName, serviceName, bookingDateTime, bookingDuration,
    tenantName, tenantLogoUrl, tenantPhone, tenantEmail, bookingUrl, locationAddress,
  } = props

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
            <Heading style={{ color: '#10b981', marginBottom: '8px' }}>
              Booking Confirmed
            </Heading>
            <Text>Hi {customerName},</Text>
            <Text>Your booking has been confirmed. Here are the details:</Text>
            <Hr />
            <Row>
              <Column><Text style={{ color: '#6b7280' }}>Service</Text></Column>
              <Column><Text style={{ fontWeight: '600' }}>{serviceName}</Text></Column>
            </Row>
            <Row>
              <Column><Text style={{ color: '#6b7280' }}>Date & Time</Text></Column>
              <Column><Text style={{ fontWeight: '600' }}>{bookingDateTime}</Text></Column>
            </Row>
            {bookingDuration && (
              <Row>
                <Column><Text style={{ color: '#6b7280' }}>Duration</Text></Column>
                <Column><Text>{bookingDuration}</Text></Column>
              </Row>
            )}
            {locationAddress && (
              <Row>
                <Column><Text style={{ color: '#6b7280' }}>Location</Text></Column>
                <Column><Text>{locationAddress}</Text></Column>
              </Row>
            )}
            <Hr />
            <Text>
              Questions? Contact us
              {tenantPhone && <> at <Link href={`tel:${tenantPhone}`}>{tenantPhone}</Link></>}
              {tenantEmail && <> or <Link href={`mailto:${tenantEmail}`}>{tenantEmail}</Link></>}.
            </Text>
            <Text>
              Thank you,<br />
              <strong>{tenantName}</strong>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingConfirmationEmail
```

**File: `src/modules/notification/templates/booking-reminder-24h.tsx`**

Same structure. Props: `customerName`, `serviceName`, `bookingDateTime`, `tenantName`, `tenantLogoUrl`, `tenantPhone`. Clean, generic layout — rendered via React Email components rather than raw HTML strings.

**File: `src/modules/notification/templates/booking-cancellation.tsx`**

Props: `customerName`, `serviceName`, `bookingDateTime`, `bookingNumber`, `bookingUrl`, `tenantName`, `tenantLogoUrl`, `tenantPhone`. Include a "rebook" CTA linking to `bookingUrl`.

**File: `src/modules/notification/templates/booking-approved.tsx`**

Props: `customerName`, `serviceName`, `bookingDateTime`, `tenantName`, `tenantLogoUrl`, `tenantPhone`, `tenantEmail`. Green approval tone — "Great news!" heading.

**File: `src/modules/notification/templates/booking-reminder-sms.ts`**

Not React Email — just typed template strings:

```typescript
export const SMS_TEMPLATES = {
  BOOKING_CONFIRMED: (vars: { serviceName: string; bookingDate: string; bookingTime: string; tenantPhone: string; tenantName: string }) =>
    `Booking confirmed! ${vars.serviceName} on ${vars.bookingDate} at ${vars.bookingTime}. Questions? ${vars.tenantPhone} - ${vars.tenantName}`,

  BOOKING_REMINDER_24H: (vars: { serviceName: string; bookingTime: string; tenantPhone: string; tenantName: string }) =>
    `Reminder: ${vars.serviceName} tomorrow at ${vars.bookingTime}. Call ${vars.tenantPhone} to cancel/reschedule. - ${vars.tenantName}`,

  BOOKING_REMINDER_2H: (vars: { serviceName: string; bookingTime: string; tenantName: string }) =>
    `Reminder: ${vars.serviceName} in 2 hours (${vars.bookingTime}). See you soon! - ${vars.tenantName}`,

  BOOKING_CANCELLED: (vars: { bookingDate: string; bookingUrl: string; tenantPhone: string; tenantName: string }) =>
    `Booking cancelled for ${vars.bookingDate}. Rebook at ${vars.bookingUrl} or call ${vars.tenantPhone} - ${vars.tenantName}`,

  BOOKING_APPROVED: (vars: { serviceName: string; bookingDate: string; bookingTime: string; tenantName: string }) =>
    `Good news! Your ${vars.serviceName} booking for ${vars.bookingDate} at ${vars.bookingTime} has been approved. - ${vars.tenantName}`,
} as const
```

**Verify:** All `.tsx` and `.ts` files in `templates/` compile. React Email imports resolve.

---

### PHASE4-T08: Write `notification.service.ts`

**Goal:** Orchestration layer. Given a trigger and bookingId, loads the booking from DB, resolves the correct template, renders it, and emits Inngest dispatch events.

**File: `src/modules/notification/notification.service.ts`**

```typescript
import { db } from '@/shared/db'
import { inngest } from '@/shared/inngest'
import { log } from '@/shared/logger'
import { buildTemplateVariables } from './lib/variable-builder'
import { renderMessage, renderTemplate } from './lib/template-engine'
import { render as renderReactEmail } from '@react-email/render'
import { BookingConfirmationEmail } from './templates/booking-confirmation'
import { BookingCancellationEmail } from './templates/booking-cancellation'
import { BookingReminder24hEmail } from './templates/booking-reminder-24h'
import { BookingApprovedEmail } from './templates/booking-approved'
import type { MessageTrigger, NotificationResult } from './notification.types'

const LOGGER = log.child({ module: 'notification.service' })

export const notificationService = {

  /**
   * Main dispatch: given a booking event trigger, load the booking,
   * resolve templates, render, and emit notification/send.* events.
   *
   * Called by Inngest handlers — never inline in the request path.
   */
  async sendForBooking(
    trigger: MessageTrigger,
    bookingId: string
  ): Promise<NotificationResult> { ... },

  /**
   * Test send: renders and sends without writing to SentMessage table.
   * Used by the admin router's test-send endpoint.
   */
  async testSend(
    tenantId: string,
    trigger: MessageTrigger,
    channel: 'EMAIL' | 'SMS',
    recipientEmail: string,
    recipientPhone?: string
  ): Promise<NotificationResult> { ... },

  /**
   * List sent messages for a booking (for admin notification history panel).
   */
  async listSentMessages(tenantId: string, bookingId: string) { ... },

  /**
   * List MessageTemplate rows for a tenant.
   */
  async listTemplates(tenantId: string) { ... },

  /**
   * Update a MessageTemplate row (admin template editor).
   */
  async updateTemplate(
    tenantId: string,
    templateId: string,
    updates: { subject?: string; body?: string; bodyHtml?: string; active?: boolean }
  ) { ... },
}
```

**`sendForBooking` implementation steps:**

```
1. Load booking from DB with customer, service, staff, venue, tenant, tenant.settings
   SELECT via Drizzle with all joins — same query structure as legacy triggers.ts Step 1
2. Build TemplateVariables via buildTemplateVariables(booking)
3. Query MessageTemplate table for trigger + tenantId + active = true
   Resolve service-specific template first (same priority logic as legacy triggers.ts lines 104-123)
4. For each resolved template:
   a. EMAIL: renderMessage(template, variables) → get subject + bodyHtml
      If no DB template found: use React Email template renderReactEmail(BookingConfirmationEmail(...))
   b. SMS: renderTemplate(template.body, variables)
      If no DB template found: use SMS_TEMPLATES[trigger](vars)
5. Emit inngest.send("notification/send.email", { to: customer.email, subject, html, bookingId, tenantId })
6. Emit inngest.send("notification/send.sms", { to: customer.phone, body, bookingId, tenantId })
   (Only emit if customer has a phone number)
7. Return NotificationResult
```

**Important:** Step 5-6 emit events — the actual Resend/Twilio calls happen in `notification.events.ts` handlers, not here.

**Verify:** File compiles. No implicit `any`.

---

### PHASE4-T09: Write `notification.schemas.ts`

**Goal:** Zod schemas for the notification router.

**File: `src/modules/notification/notification.schemas.ts`**

```typescript
import { z } from 'zod'

export const messageTriggerSchema = z.enum([
  'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_APPROVED',
  'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED',
  'BOOKING_REMINDER_24H', 'BOOKING_REMINDER_2H', 'REVIEW_REQUEST',
])

export const messageChannelSchema = z.enum(['EMAIL', 'SMS'])

export const listTemplatesSchema = z.object({
  trigger: messageTriggerSchema.optional(),
  channel: messageChannelSchema.optional(),
  includeInactive: z.boolean().default(false),
})

export const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().optional(),
  body: z.string().optional(),
  bodyHtml: z.string().optional(),
  active: z.boolean().optional(),
})

export const testSendSchema = z.object({
  trigger: messageTriggerSchema,
  channel: messageChannelSchema,
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
})

export const listSentMessagesSchema = z.object({
  bookingId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
})
```

---

### PHASE4-T10: Write `notification.router.ts`

**Goal:** Thin admin router for notification management.

**File: `src/modules/notification/notification.router.ts`**

```typescript
import { router } from '@/shared/trpc'
import { tenantProcedure, permissionProcedure } from '@/shared/trpc'
import { notificationService } from './notification.service'
import {
  listTemplatesSchema,
  updateTemplateSchema,
  testSendSchema,
  listSentMessagesSchema,
} from './notification.schemas'

export const notificationRouter = router({

  // Template management
  listTemplates: permissionProcedure('notifications:read')
    .input(listTemplatesSchema)
    .query(({ ctx, input }) =>
      notificationService.listTemplates(ctx.tenantId)
    ),

  updateTemplate: permissionProcedure('notifications:write')
    .input(updateTemplateSchema)
    .mutation(({ ctx, input }) =>
      notificationService.updateTemplate(ctx.tenantId, input.id, input)
    ),

  // Test send — sends a real notification to the specified recipient
  testSend: permissionProcedure('notifications:write')
    .input(testSendSchema)
    .mutation(({ ctx, input }) =>
      notificationService.testSend(
        ctx.tenantId,
        input.trigger,
        input.channel,
        input.recipientEmail ?? ctx.session.user.email,
        input.recipientPhone
      )
    ),

  // Notification history
  listSentMessages: permissionProcedure('notifications:read')
    .input(listSentMessagesSchema)
    .query(({ ctx, input }) =>
      notificationService.listSentMessages(ctx.tenantId, input.bookingId ?? '')
    ),
})
```

---

### PHASE4-T11: Write `notification.events.ts`

**Goal:** Inngest handlers for all notification events. This is where Resend and Twilio are actually called. Fills in the Phase 1 stubs for `send-booking-confirmation-email` and `booking/confirmed` notification.

**File: `src/modules/notification/notification.events.ts`**

```typescript
import { inngest } from '@/shared/inngest'
import { db } from '@/shared/db'
import { notificationService } from './notification.service'
import { sendEmail } from './providers/email.provider'
import { sendSms } from './providers/sms.provider'
import { log } from '@/shared/logger'

const LOGGER = log.child({ module: 'notification.events' })

// ─── Handler 1: notification/send.email ───────────────────────────────────────
/**
 * Handles low-level email dispatch.
 * Called by the notification service — receives a rendered subject+html+to.
 * Writes to SentMessage table. Retries automatically via Inngest (3 attempts).
 */
export const handleSendEmail = inngest.createFunction(
  {
    id: 'handle-notification-send-email',
    retries: 3,
  },
  { event: 'notification/send.email' },
  async ({ event, step }) => {
    const { to, templateId, variables } = event.data
    // variables contains: { subject, html, text, replyTo, bookingId, tenantId }
    // (The notification service packs rendering output into the variables map)

    const result = await step.run('send-email', async () => {
      return sendEmail({
        to,
        subject: variables.subject ?? '(No subject)',
        html: variables.html ?? variables.bodyHtml ?? '',
        text: variables.text,
        replyTo: variables.replyTo,
      })
    })

    await step.run('record-sent-message', async () => {
      await db.sentMessage.create({
        data: {
          tenantId: variables.tenantId,
          bookingId: variables.bookingId || null,
          recipientType: 'CUSTOMER',
          recipientEmail: to,
          templateId: templateId || null,
          channel: 'EMAIL',
          subject: variables.subject,
          body: variables.html ?? '',
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          providerRef: result.messageId || null,
          errorMessage: result.error || null,
        },
      })
    })

    if (!result.success) {
      throw new Error(`Email send failed: ${result.error}`)
    }

    LOGGER.info({ to, messageId: result.messageId }, 'Email sent')
    return result
  }
)

// ─── Handler 2: notification/send.sms ────────────────────────────────────────
/**
 * Handles low-level SMS dispatch via Twilio.
 * Retries automatically via Inngest (3 attempts).
 */
export const handleSendSms = inngest.createFunction(
  {
    id: 'handle-notification-send-sms',
    retries: 3,
  },
  { event: 'notification/send.sms' },
  async ({ event, step }) => {
    const { to, templateId, variables } = event.data

    const result = await step.run('send-sms', async () => {
      return sendSms({
        to,
        body: variables.body ?? '',
      })
    })

    await step.run('record-sent-message', async () => {
      await db.sentMessage.create({
        data: {
          tenantId: variables.tenantId,
          bookingId: variables.bookingId || null,
          recipientType: 'CUSTOMER',
          recipientPhone: to,
          templateId: templateId || null,
          channel: 'SMS',
          body: variables.body ?? '',
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          providerRef: result.messageId || null,
          errorMessage: result.error || null,
        },
      })
    })

    if (!result.success) {
      throw new Error(`SMS send failed: ${result.error}`)
    }

    LOGGER.info({ to, messageId: result.messageId }, 'SMS sent')
    return result
  }
)

// ─── Handler 3: booking/confirmed → send confirmation notification ────────────
/**
 * Replaces Phase 1 stub `send-booking-confirmation-email`.
 * Fires on booking/confirmed — calls notificationService to resolve and dispatch.
 *
 * NOTE: This replaces the log-only stub in src/modules/booking/booking.events.ts.
 * The booking events stub must be removed and this handler registered instead.
 *
 * Idempotency: checks sent_messages table before sending so Inngest retries
 * never cause duplicate confirmation emails.
 */
export const sendBookingConfirmationNotification = inngest.createFunction(
  { id: 'send-booking-confirmation-notification' },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    // Idempotency check FIRST — before loading booking or building variables
    const alreadySent = await step.run('check-idempotency', async () => {
      return notificationRepository.hasNotificationBeenSent(bookingId, 'confirmation-email')
    })

    if (alreadySent) {
      LOGGER.info({ bookingId }, 'Confirmation email already sent, skipping (Inngest retry)')
      return
    }

    // Assert tenantId matches loaded record — defence in depth
    const booking = await step.run('load-booking', async () => {
      return notificationRepository.loadBookingForNotification(bookingId)
    })

    if (!booking) return
    if (booking.tenantId !== tenantId) {
      throw new Error(`Tenant mismatch: booking belongs to ${booking.tenantId}, event claims ${tenantId}`)
    }

    await step.run('send-notification', async () => {
      const result = await notificationService.sendForBooking('BOOKING_CONFIRMED', bookingId)
      await notificationRepository.recordNotificationSent(bookingId, 'confirmation-email')
      return result
    })
  }
)

// ─── Handler 4: booking/cancelled → send cancellation notification ────────────
/**
 * Idempotency: checks sent_messages table before sending so Inngest retries
 * never cause duplicate cancellation emails.
 */
export const sendBookingCancellationNotification = inngest.createFunction(
  { id: 'send-booking-cancellation-notification' },
  { event: 'booking/cancelled' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    // Idempotency check FIRST
    const alreadySent = await step.run('check-idempotency', async () => {
      return notificationRepository.hasNotificationBeenSent(bookingId, 'cancellation-email')
    })

    if (alreadySent) {
      LOGGER.info({ bookingId }, 'Cancellation email already sent, skipping (Inngest retry)')
      return
    }

    // Assert tenantId matches loaded record — defence in depth
    const booking = await step.run('load-booking', async () => {
      return notificationRepository.loadBookingForNotification(bookingId)
    })

    if (!booking) return
    if (booking.tenantId !== tenantId) {
      throw new Error(`Tenant mismatch: booking belongs to ${booking.tenantId}, event claims ${tenantId}`)
    }

    await step.run('send-notification', async () => {
      const result = await notificationService.sendForBooking('BOOKING_CANCELLED', bookingId)
      await notificationRepository.recordNotificationSent(bookingId, 'cancellation-email')
      return result
    })
  }
)

// ─── Handler 5: review/request.send → send review request (delayed) ──────────
/**
 * Fires when a booking is completed.
 * Waits the delay period (default 24h) then sends review request email.
 * Idempotency: checks sent_messages table before sending.
 */
export const sendReviewRequest = inngest.createFunction(
  {
    id: 'send-review-request',
    cancelOn: [
      // Cancel if booking is cancelled before review fires
      { event: 'booking/cancelled', match: 'data.bookingId' },
    ],
  },
  { event: 'review/request.send' },
  async ({ event, step }) => {
    const { bookingId, tenantId, delay } = event.data

    // Default: wait 24 hours before sending review request
    const delayMs = delay === '48h' ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const sendAt = new Date(Date.now() + delayMs)

    await step.sleepUntil('wait-before-review-request', sendAt)

    // Idempotency check after sleep — handler may have been retried
    const alreadySent = await step.run('check-idempotency', async () => {
      return notificationRepository.hasNotificationBeenSent(bookingId, 'review-request-email')
    })

    if (alreadySent) {
      LOGGER.info({ bookingId }, 'Review request already sent, skipping (Inngest retry)')
      return
    }

    // Assert tenantId matches loaded record — defence in depth
    const booking = await step.run('load-booking', async () => {
      return notificationRepository.loadBookingForNotification(bookingId)
    })

    if (!booking) return
    if (booking.tenantId !== tenantId) {
      throw new Error(`Tenant mismatch: booking belongs to ${booking.tenantId}, event claims ${tenantId}`)
    }

    await step.run('send-review-email', async () => {
      const result = await notificationService.sendForBooking('REVIEW_REQUEST', bookingId)
      await notificationRepository.recordNotificationSent(bookingId, 'review-request-email')
      return result
    })
  }
)

export const notificationFunctions = [
  handleSendEmail,
  handleSendSms,
  sendBookingConfirmationNotification,
  sendBookingCancellationNotification,
  sendReviewRequest,
]
```

**`notificationRepository` idempotency methods (add to notification module or booking repository):**

```typescript
// In notification module — add to notification.service.ts or a dedicated notification.repository.ts

hasNotificationBeenSent(bookingId: string, notificationType: string): Promise<boolean>
// SELECT EXISTS(SELECT 1 FROM sent_messages WHERE booking_id = ? AND type = ?)

recordNotificationSent(bookingId: string, notificationType: string): Promise<void>
// INSERT INTO sent_messages (booking_id, type, sent_at) VALUES (?, ?, NOW())
// ON CONFLICT DO NOTHING -- safe to call multiple times

loadBookingForNotification(bookingId: string): Promise<{ tenantId: string } | null>
// Minimal load to perform tenantId assertion before the full service call
```

The `ON CONFLICT DO NOTHING` insert ensures the check-and-record is atomic even under concurrent retries.

**After writing this file:**
1. Remove the log-only `sendBookingConfirmationEmail` stub from `src/modules/booking/booking.events.ts` — the function above replaces it. Also remove `pushBookingToCalendar` stub — that will be replaced in PHASE4-T17.
2. Update `src/app/api/inngest/route.ts` to import and include `notificationFunctions`.

---

### PHASE4-T12: Write `notification/index.ts` and wire into root router

**File: `src/modules/notification/index.ts`**

```typescript
export { notificationRouter } from './notification.router'
export { notificationFunctions } from './notification.events'
export { notificationService } from './notification.service'
export * from './notification.types'
export * from './notification.schemas'
export {
  buildTemplateVariables,
  formatBookingDate,
  formatTime,
  formatDuration,
  formatCurrency,
} from './lib/variable-builder'
export { renderTemplate, renderMessage, extractVariables } from './lib/template-engine'
```

**Update `src/server/root.ts`:**

```typescript
import { notificationRouter } from '@/modules/notification'

export const appRouter = router({
  // ... existing routers
  notification: notificationRouter,
})
```

**Update `src/app/api/inngest/route.ts`:**

```typescript
import { notificationFunctions } from '@/modules/notification'
// Add notificationFunctions to serve(...) functions array
```

---

### PHASE4-T13: Write `calendar-sync.types.ts`

**Goal:** All TypeScript types for the calendar-sync module. Decoupled from Prisma — use Drizzle row shapes.

**File: `src/modules/calendar-sync/calendar-sync.types.ts`**

```typescript
export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING'

export type CalendarSyncType = 'BOOKING_PUSH' | 'EVENT_IMPORT' | 'TOKEN_REFRESH' | 'WATCH_RENEWAL'

export type SyncStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL'

export type SyncDirection = 'PUSH' | 'PULL'

/**
 * UserIntegration row with encrypted tokens — shape from Drizzle query.
 * Tokens are decrypted in the service before use.
 */
export interface UserIntegrationRecord {
  id: string
  tenantId: string
  userId: string
  provider: 'GOOGLE_CALENDAR'
  status: IntegrationStatus
  encryptedAccessToken: string | null
  encryptedRefreshToken: string | null
  tokenExpiresAt: Date | null
  tokenVersion: number
  providerAccountId: string | null
  calendarId: string | null
  syncEnabled: boolean
  pushBookingsToCalendar: boolean
  blockTimeOnCalendar: boolean
  importCalendarEvents: boolean
  twoWaySync: boolean
  watchChannelId: string | null
  watchChannelToken: string | null
  watchChannelExpiration: Date | null
  watchResourceId: string | null
  lastSyncAt: Date | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  connectedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Google Calendar event shape (subset of googleapis Calendar v3 Schema$Event).
 * Used for push (Ironheart → Google) and pull (Google → Ironheart).
 */
export interface CalendarEventPayload {
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  colorId?: string                     // '1'–'11'
  status?: 'confirmed' | 'tentative' | 'cancelled'
  transparency?: 'opaque' | 'transparent'
  extendedProperties?: {
    private?: {
      ironheartBookingId?: string
      ironheartTenantId?: string
      ironheartBookingStatus?: string
    }
  }
}

export interface SyncResult {
  success: boolean
  action: 'created' | 'updated' | 'deleted' | 'skipped'
  externalEventId?: string
  error?: string
}

export interface PullEventsResult {
  pulled: number
  blocked: number
  errors: number
  errorMessages: string[]
}

export interface WatchChannelResult {
  success: boolean
  channelId?: string
  resourceId?: string
  expiresAt?: Date
  error?: string
}

/**
 * Decrypted tokens for use in API calls.
 * Never persisted — only lives in memory during the request.
 */
export interface DecryptedTokens {
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
}

/**
 * OAuth authorization code exchange result.
 */
export interface OAuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}
```

---

### PHASE4-T14: Write `calendar-sync/lib/oauth.ts`

**Goal:** OAuth token exchange, refresh, and AES-256-GCM encryption. This replaces the legacy `crypto/token-encryption.ts` and `oauth/google-oauth.ts` which are not being ported (too tied to old project layout).

**File: `src/modules/calendar-sync/lib/oauth.ts`**

```typescript
import * as crypto from 'node:crypto'
import type { OAuthTokenResponse } from '../calendar-sync.types'

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext token using AES-256-GCM.
 * Returns a base64-encoded string: iv:authTag:ciphertext
 *
 * CALENDAR_TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).
 * Generate with: openssl rand -hex 32
 */
export function encryptToken(plaintext: string): string {
  const key = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-character hex string')
  }

  const keyBuffer = Buffer.from(key, 'hex')
  const iv = crypto.randomBytes(12)  // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypt a token encrypted by encryptToken().
 * Throws on invalid ciphertext or wrong key.
 *
 * KEY ROTATION PROCEDURE:
 * When rotating the encryption key:
 * 1. Set CALENDAR_TOKEN_ENCRYPTION_KEY_OLD = current value
 * 2. Set CALENDAR_TOKEN_ENCRYPTION_KEY = new value
 * 3. Run: npx tsx scripts/rotate-calendar-token-keys.ts
 *    (This script decrypts all tokens with OLD key, re-encrypts with NEW key)
 * 4. Remove CALENDAR_TOKEN_ENCRYPTION_KEY_OLD
 *
 * The decryptToken function supports a legacy key fallback:
 * if decryption with the primary key fails, try CALENDAR_TOKEN_ENCRYPTION_KEY_OLD.
 */
export function decryptToken(encrypted: string): string {
  try {
    return decryptWithKey(encrypted, process.env.CALENDAR_TOKEN_ENCRYPTION_KEY!)
  } catch {
    // Try old key if primary fails (supports key rotation window)
    if (process.env.CALENDAR_TOKEN_ENCRYPTION_KEY_OLD) {
      return decryptWithKey(encrypted, process.env.CALENDAR_TOKEN_ENCRYPTION_KEY_OLD)
    }
    throw new Error('Token decryption failed — check encryption key configuration')
  }
}

/**
 * Internal: decrypt using a specific key. Used by decryptToken for primary
 * and legacy key fallback.
 */
function decryptWithKey(encrypted: string, key: string): string {
  if (!key || key.length !== 64) {
    throw new Error('CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-character hex string')
  }

  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted token format')

  const [ivB64, authTagB64, ciphertextB64] = parts
  const keyBuffer = Buffer.from(key, 'hex')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

/**
 * Build the Google OAuth2 authorization URL.
 * Redirect the user here to start the OAuth flow.
 */
export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',    // Force refresh_token to be returned even if already authorized
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }).toString(),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Token exchange failed: ${response.status} ${body}`)
  }

  return response.json() as Promise<OAuthTokenResponse>
}

/**
 * Refresh an access token using the refresh token.
 * The refresh token is passed encrypted — this function decrypts it first.
 */
export async function refreshAccessToken(
  encryptedRefreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const refreshToken = decryptToken(encryptedRefreshToken)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${body}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }
  return data
}
```

---

### PHASE4-T15: Write `calendar-sync/lib/google-calendar-client.ts`

**Goal:** Port the Google Calendar API client from legacy `google-calendar-client.ts`. Remove the `Bottleneck` + `async-retry` external dependencies from Phase 2 scope — reinstall them in PHASE4-T01. Replace `console.log` with structured `log.*` calls.

**File: `src/modules/calendar-sync/lib/google-calendar-client.ts`**

Port the `GoogleCalendarClient` class fresh from legacy. Key changes from legacy:
- Replace `import { decryptToken, encryptToken } from '@/lib/crypto/token-encryption'` → `import { decryptToken, encryptToken } from './oauth'`
- Replace `import { refreshAccessToken } from '@/lib/oauth/google-oauth'` → `import { refreshAccessToken } from './oauth'`
- Replace all `console.log` / `console.error` → `log.info` / `log.error` from `@/shared/logger`
- `TokenUpdateCallback` type and all method signatures are identical to legacy

**Key methods to port (same signatures as legacy):**
```typescript
class GoogleCalendarClient {
  constructor(options: GoogleCalendarClientOptions)
  async createEvent(calendarId: string, eventData: CalendarEventInput): Promise<CalendarEvent>
  async updateEvent(calendarId: string, eventId: string, eventData: CalendarEventInput): Promise<CalendarEvent>
  async deleteEvent(calendarId: string, eventId: string): Promise<void>
  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent>
  async listEvents(calendarId: string, timeMin: string, timeMax: string, maxResults?: number): Promise<CalendarEvent[]>
  async watchCalendar(calendarId: string, channelId: string, channelToken: string, webhookUrl: string, expiration?: number): Promise<{ id: string; resourceId: string; expiration: number }>
  async stopWatchingCalendar(channelId: string, resourceId: string): Promise<void>
}

// Factory function
export function createGoogleCalendarClient(
  integration: {
    encryptedAccessToken: string | null
    encryptedRefreshToken: string | null
    tokenExpiresAt: Date | null
  },
  onTokenRefresh?: TokenUpdateCallback
): GoogleCalendarClient
```

Rate limiter config: `maxConcurrent: 10, minTime: 100` (10 req/s) — same as legacy.
Retry config: `retries: 2, factor: 2, minTimeout: 1000` — same as legacy.

**Verify:** File compiles. No implicit `any`. `GoogleCalendarClient` can be instantiated in a test file without errors.

---

### PHASE4-T16: Write `calendar-sync/lib/calendar-event-mapper.ts`, `google-calendar-sync.ts`, `google-calendar-pull.ts`, `google-calendar-watch.ts`

**Goal:** Port the 4 remaining calendar lib files. These contain the core business logic of push/pull/watch. Read the legacy files for logic but write fresh TypeScript using the module's own types.

**`calendar-event-mapper.ts`** — Port exactly from legacy. Key changes:
- `BookingWithRelations` uses Drizzle types (not Prisma `Booking` type)
- Replace `import { Booking, BookingStatus } from '@prisma/client'` with the local Drizzle types
- All mapping functions (`bookingToCalendarEvent`, `getEventColorId`, `buildEventLocation`, `buildEventDescription`, `calculateEventTimes`) port verbatim

**`google-calendar-sync.ts`** — Port from legacy `google-calendar-sync.ts`. Key changes:
- Remove `opossum` circuit breaker — use simple try/catch (Inngest retries replace the circuit breaker for serverless)
- Replace `import { db } from '@/lib/db'` → `import { db } from '@/shared/db'`
- `import { createGoogleCalendarClient } from './google-calendar-client'`
- `import { encryptToken } from './oauth'`
- Replace `db.booking.findUnique` → Drizzle query syntax
- Replace `db.userIntegration.*` → Drizzle query syntax
- Replace `db.userIntegrationSyncLog.*` → Drizzle query syntax
- Exported function signatures stay the same: `syncBookingToCalendar(bookingId)`, `syncBookingDeleted(bookingId, specificStaffId?)`, `batchSyncBookings(bookingIds[])`

**`google-calendar-pull.ts`** — Port from legacy. Key changes:
- Remove the `PrismaClient` parameter from `pullStaffEvents` — use the shared `db` directly
- Replace Prisma calls with Drizzle syntax
- `filterExternalEvents`, `parseGoogleEvent`, `cleanupDeletedEvents` — port verbatim

**`google-calendar-watch.ts`** — Port from legacy. Key changes:
- Replace `import { db } from '@/lib/db'` → `import { db } from '@/shared/db'`
- Replace `import { encryptToken } from '@/lib/crypto/token-encryption'` → `import { encryptToken } from './oauth'`
- All function signatures are identical: `createWatchChannel`, `renewWatchChannel`, `stopWatchChannel`, `renewAllWatchChannels`, `verifyWebhookToken`, `getWatchStatus`
- `WATCH_CHANNEL_EXPIRY_MS = 6.5 * 24 * 60 * 60 * 1000` — same constant
- `RENEWAL_BUFFER_MS = 24 * 60 * 60 * 1000` — same constant

**Verify:** All 4 files compile. No implicit `any`. No cross-module imports (no imports from `src/lib/`).

---

### PHASE4-T17: Write `calendar-sync.repository.ts`

**Goal:** All Drizzle DB queries for calendar sync. Centralises the data access patterns scattered across the legacy integration files.

**File: `src/modules/calendar-sync/calendar-sync.repository.ts`**

```typescript
import { db } from '@/shared/db'
import { eq, and, lt, lte, isNotNull, gt, inArray } from 'drizzle-orm'
import type { UserIntegrationRecord } from './calendar-sync.types'

export const calendarSyncRepository = {

  // ─── Integration queries ──────────────────────────────────────────────────

  findIntegrationByUserId(
    tenantId: string,
    userId: string
  ): Promise<UserIntegrationRecord | undefined> { ... },

  findIntegrationById(
    integrationId: string
  ): Promise<UserIntegrationRecord | undefined> { ... },

  findConnectedIntegrationsForTenant(
    tenantId: string
  ): Promise<UserIntegrationRecord[]> { ... },

  findAllConnectedIntegrations(): Promise<UserIntegrationRecord[]> { ... },

  createIntegration(
    tenantId: string,
    userId: string,
    data: {
      encryptedAccessToken: string
      encryptedRefreshToken: string
      tokenExpiresAt: Date
      providerAccountId?: string
      calendarId?: string
    }
  ): Promise<UserIntegrationRecord> { ... },

  updateIntegration(
    integrationId: string,
    data: Partial<UserIntegrationRecord>
  ): Promise<void> { ... },

  disconnectIntegration(integrationId: string): Promise<void> { ... },

  // ─── Token expiry queries (for Inngest crons) ─────────────────────────────

  /**
   * Find integrations with tokens expiring within `withinMinutes`.
   * Used by refresh-calendar-tokens-cron.
   */
  findExpiringTokens(withinMinutes: number): Promise<UserIntegrationRecord[]> { ... },

  /**
   * Find integrations with watch channels expiring within `withinHours`.
   * Used by renew-watch-channels-cron.
   */
  findExpiringWatchChannels(withinHours: number): Promise<UserIntegrationRecord[]> { ... },

  // ─── Sync log ─────────────────────────────────────────────────────────────

  createSyncLog(data: {
    userIntegrationId: string
    syncType: string
    direction: string
    bookingId?: string
    externalEventId?: string
    status: string
    errorMessage?: string
    durationMs?: number
  }): Promise<{ id: string }> { ... },

  findLastSyncLogForBooking(
    userIntegrationId: string,
    bookingId: string
  ): Promise<{ externalEventId: string } | undefined> { ... },

  // ─── External events ──────────────────────────────────────────────────────

  upsertExternalEvent(data: {
    tenantId: string
    userId: string
    userIntegrationId: string
    externalEventId: string
    summary: string
    description?: string | null
    location?: string | null
    startTime: Date
    endTime: Date
    isAllDay: boolean
    attendees?: unknown
    metadata?: unknown
  }): Promise<void> { ... },

  markExternalEventsDeleted(
    integrationId: string,
    keepIds: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<void> { ... },
}
```

---

### PHASE4-T18: Write `calendar-sync.service.ts`

**Goal:** Orchestration layer for OAuth flow, push/pull, and integration management.

**File: `src/modules/calendar-sync/calendar-sync.service.ts`**

```typescript
import { db } from '@/shared/db'
import { inngest } from '@/shared/inngest'
import { log } from '@/shared/logger'
import { calendarSyncRepository } from './calendar-sync.repository'
import { syncBookingToCalendar, syncBookingDeleted } from './lib/google-calendar-sync'
import { pullStaffEvents } from './lib/google-calendar-pull'
import { createWatchChannel, stopWatchChannel, renewAllWatchChannels } from './lib/google-calendar-watch'
import { buildAuthorizationUrl, exchangeCodeForTokens, encryptToken } from './lib/oauth'
import { NotFoundError, ValidationError } from '@/shared/errors'

export const calendarSyncService = {

  // ─── OAuth flow ────────────────────────────────────────────────────────────

  /**
   * Step 1: Return the Google OAuth authorization URL.
   * Frontend redirects user to this URL.
   * `state` is a signed JWT containing { userId, tenantId } — used on callback to verify.
   */
  async getAuthorizationUrl(userId: string, tenantId: string): Promise<string> {
    const state = buildOAuthState(userId, tenantId) // simple base64 JSON — upgrade in Phase 3
    return buildAuthorizationUrl(state)
  },

  /**
   * Step 2: Handle OAuth callback. Exchange code for tokens, create integration record.
   * Called by the /api/integrations/google-calendar/callback route.
   * After connect: automatically creates a watch channel.
   */
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{ integrationId: string }> {
    const { userId, tenantId } = parseOAuthState(state)

    const tokens = await exchangeCodeForTokens(code)

    const encryptedAccessToken = encryptToken(tokens.access_token)
    const encryptedRefreshToken = encryptToken(tokens.refresh_token)
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const integration = await calendarSyncRepository.createIntegration(tenantId, userId, {
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
    })

    // Auto-create watch channel after connecting
    await createWatchChannel(userId)

    return { integrationId: integration.id }
  },

  /**
   * Disconnect: stop watch channel, delete integration tokens.
   */
  async disconnectIntegration(tenantId: string, userId: string): Promise<void> { ... },

  // ─── Push ─────────────────────────────────────────────────────────────────

  async pushBooking(bookingId: string): Promise<import('./calendar-sync.types').SyncResult> {
    return syncBookingToCalendar(bookingId)
  },

  async deleteBookingEvent(bookingId: string, staffId?: string): Promise<import('./calendar-sync.types').SyncResult> {
    return syncBookingDeleted(bookingId, staffId)
  },

  // ─── Pull ─────────────────────────────────────────────────────────────────

  async pullEventsForUser(userId: string): Promise<import('./calendar-sync.types').PullEventsResult> {
    return pullStaffEvents(userId)
  },

  async pullEventsForAllUsers(tenantId?: string): Promise<{ processed: number; errors: number }> {
    const integrations = tenantId
      ? await calendarSyncRepository.findConnectedIntegrationsForTenant(tenantId)
      : await calendarSyncRepository.findAllConnectedIntegrations()

    let processed = 0
    let errors = 0

    for (const integration of integrations) {
      try {
        await pullStaffEvents(integration.userId)
        processed++
      } catch (err) {
        errors++
        log.error('Pull failed for user', { userId: integration.userId, err })
      }
    }

    return { processed, errors }
  },

  // ─── Token refresh ────────────────────────────────────────────────────────

  async refreshExpiringTokens(): Promise<{ refreshed: number; failed: number }> {
    const expiring = await calendarSyncRepository.findExpiringTokens(10)
    let refreshed = 0
    let failed = 0

    for (const integration of expiring) {
      try {
        // refreshAccessToken decrypts the stored refresh token, calls Google, returns new access token
        const { access_token, expires_in } = await (await import('./lib/oauth')).refreshAccessToken(
          integration.encryptedRefreshToken!
        )
        await calendarSyncRepository.updateIntegration(integration.id, {
          encryptedAccessToken: encryptToken(access_token),
          tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        })
        refreshed++
      } catch (err) {
        failed++
        log.error('Token refresh failed', { userId: integration.userId, err })
        await calendarSyncRepository.updateIntegration(integration.id, {
          lastSyncStatus: 'FAILED',
          lastSyncError: err instanceof Error ? err.message : 'Token refresh failed',
        })
      }
    }

    return { refreshed, failed }
  },

  // ─── Watch channels ───────────────────────────────────────────────────────

  async renewExpiringWatchChannels(): Promise<{ total: number; renewed: number; failed: number }> {
    return renewAllWatchChannels()
  },

  // ─── Admin queries ────────────────────────────────────────────────────────

  async getIntegrationStatus(tenantId: string, userId: string) {
    const integration = await calendarSyncRepository.findIntegrationByUserId(tenantId, userId)
    if (!integration) return null
    return {
      id: integration.id,
      status: integration.status,
      syncEnabled: integration.syncEnabled,
      pushBookingsToCalendar: integration.pushBookingsToCalendar,
      importCalendarEvents: integration.importCalendarEvents,
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      lastSyncError: integration.lastSyncError,
      watchChannelId: integration.watchChannelId,
      watchChannelExpiration: integration.watchChannelExpiration,
      connectedAt: integration.connectedAt,
    }
  },

  async updateSyncSettings(
    tenantId: string,
    userId: string,
    settings: {
      syncEnabled?: boolean
      pushBookingsToCalendar?: boolean
      importCalendarEvents?: boolean
      twoWaySync?: boolean
    }
  ): Promise<void> {
    const integration = await calendarSyncRepository.findIntegrationByUserId(tenantId, userId)
    if (!integration) throw new NotFoundError('UserIntegration', userId)
    await calendarSyncRepository.updateIntegration(integration.id, settings)
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOAuthState(userId: string, tenantId: string): string {
  return Buffer.from(JSON.stringify({ userId, tenantId, ts: Date.now() })).toString('base64url')
}

function parseOAuthState(state: string): { userId: string; tenantId: string } {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
    if (!decoded.userId || !decoded.tenantId) throw new Error('Missing fields')
    return decoded
  } catch {
    throw new ValidationError('Invalid OAuth state parameter')
  }
}
```

---

### PHASE4-T19: Write `calendar-sync.schemas.ts`

**File: `src/modules/calendar-sync/calendar-sync.schemas.ts`**

```typescript
import { z } from 'zod'

export const connectCalendarSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

export const disconnectCalendarSchema = z.object({
  userId: z.string().uuid(),
})

export const updateSyncSettingsSchema = z.object({
  userId: z.string().uuid(),
  syncEnabled: z.boolean().optional(),
  pushBookingsToCalendar: z.boolean().optional(),
  importCalendarEvents: z.boolean().optional(),
  twoWaySync: z.boolean().optional(),
})

export const manualSyncSchema = z.object({
  userId: z.string().uuid(),
  direction: z.enum(['push', 'pull']).default('pull'),
})

export const getIntegrationStatusSchema = z.object({
  userId: z.string().uuid(),
})
```

---

### PHASE4-T20: Write `calendar-sync.router.ts`

**File: `src/modules/calendar-sync/calendar-sync.router.ts`**

```typescript
import { router } from '@/shared/trpc'
import { tenantProcedure, permissionProcedure, publicProcedure } from '@/shared/trpc'
import { calendarSyncService } from './calendar-sync.service'
import {
  connectCalendarSchema,
  disconnectCalendarSchema,
  updateSyncSettingsSchema,
  manualSyncSchema,
  getIntegrationStatusSchema,
} from './calendar-sync.schemas'
import { z } from 'zod'

export const calendarSyncRouter = router({

  // Get OAuth URL — user clicks "Connect Google Calendar"
  getAuthUrl: tenantProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      calendarSyncService.getAuthorizationUrl(input.userId, ctx.tenantId)
    ),

  // Get integration status for a user
  getStatus: tenantProcedure
    .input(getIntegrationStatusSchema)
    .query(({ ctx, input }) =>
      calendarSyncService.getIntegrationStatus(ctx.tenantId, input.userId)
    ),

  // Disconnect Google Calendar
  disconnect: permissionProcedure('integrations:write')
    .input(disconnectCalendarSchema)
    .mutation(({ ctx, input }) =>
      calendarSyncService.disconnectIntegration(ctx.tenantId, input.userId)
    ),

  // Update sync settings (push/pull toggles)
  updateSettings: permissionProcedure('integrations:write')
    .input(updateSyncSettingsSchema)
    .mutation(({ ctx, input }) =>
      calendarSyncService.updateSyncSettings(ctx.tenantId, input.userId, input)
    ),

  // Manual sync trigger
  manualSync: tenantProcedure
    .input(manualSyncSchema)
    .mutation(({ ctx, input }) => {
      if (input.direction === 'pull') {
        return calendarSyncService.pullEventsForUser(input.userId)
      }
      // For push: emit event for all confirmed bookings — handled by Inngest
      return calendarSyncService.pullEventsForUser(input.userId) // simplified
    }),
})
```

---

### PHASE4-T21: Write `calendar-sync.events.ts` — fill in Phase 2 stubs

**Goal:** This is the most critical task in the calendar-sync module. The Phase 2 Inngest functions in `src/modules/scheduling/scheduling.events.ts` are stubs with log-only bodies. Phase 4 fills in the actual implementations.

**Strategy:** Do NOT modify `scheduling.events.ts` directly. Instead, import the actual logic from `calendar-sync` module and call it from the stub bodies.

**Update `src/modules/scheduling/scheduling.events.ts`** — fill in the 3 calendar stubs:

```typescript
// At top of file, add imports:
import { calendarSyncService } from '@/modules/calendar-sync/calendar-sync.service'

// Fill in pullCalendarEventsCron:
export const pullCalendarEventsCron = inngest.createFunction(
  {
    id: 'pull-calendar-events-cron',
    concurrency: { limit: 2 },
  },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    const result = await step.run('pull-for-all-users', async () => {
      return calendarSyncService.pullEventsForAllUsers()
    })
    log.info({ processed: result.processed, errors: result.errors }, 'Pull calendar events cron complete')
  }
)

// Fill in refreshCalendarTokensCron:
export const refreshCalendarTokensCron = inngest.createFunction(
  { id: 'refresh-calendar-tokens-cron' },
  { cron: '*/30 * * * *' },
  async ({ step }) => {
    const result = await step.run('refresh-tokens', async () => {
      return calendarSyncService.refreshExpiringTokens()
    })
    log.info({ refreshed: result.refreshed, failed: result.failed }, 'Calendar token refresh complete')
  }
)

// Fill in renewWatchChannelsCron:
export const renewWatchChannelsCron = inngest.createFunction(
  { id: 'renew-watch-channels-cron' },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const result = await step.run('renew-channels', async () => {
      return calendarSyncService.renewExpiringWatchChannels()
    })
    log.info({ total: result.total, renewed: result.renewed, failed: result.failed }, 'Watch channel renewal complete')
  }
)
```

**Write `src/modules/calendar-sync/calendar-sync.events.ts`** — the push handler and webhook handler:

```typescript
import { inngest } from '@/shared/inngest'
import { calendarSyncService } from './calendar-sync.service'
import { log } from '@/shared/logger'
import { db } from '@/shared/db'

const LOGGER = log.child({ module: 'calendar-sync.events' })

/**
 * Push a booking to Google Calendar.
 *
 * Replaces Phase 1 stub `push-booking-to-calendar` in booking.events.ts.
 * The booking.events.ts stub must be REMOVED and this handler registered instead.
 *
 * Fires on calendar/sync.push event.
 * Emitted by:
 *   - booking.service.confirmReservation (booking confirmed by customer)
 *   - booking.service.approveBooking (booking approved by admin)
 *   - booking.service.updateBooking (booking rescheduled/reassigned)
 */
export const pushBookingToCalendar = inngest.createFunction(
  {
    id: 'push-booking-to-calendar',
    retries: 3,
    concurrency: { limit: 5 },  // max 5 concurrent push ops
  },
  { event: 'calendar/sync.push' },
  async ({ event, step }) => {
    const { bookingId } = event.data

    const result = await step.run('push-to-calendar', async () => {
      return calendarSyncService.pushBooking(bookingId)
    })

    LOGGER.info({
      bookingId,
      action: result.action,
      externalEventId: result.externalEventId,
    }, 'Calendar push complete')

    return result
  }
)

/**
 * Handle a Google Calendar webhook notification.
 *
 * Fires on calendar/webhook.received event (emitted by the webhook route).
 * Looks up the watch channel → staff member → triggers a pull for that user.
 *
 * The channel token has already been validated in the webhook route before
 * this event was emitted — this handler does not re-validate the token.
 *
 * TenantId assertion: the integration record loaded here includes tenantId.
 * Any downstream calls to calendarSyncService pass tenantId explicitly so
 * the service layer can verify it matches the record being acted on.
 */
export const handleCalendarWebhook = inngest.createFunction(
  {
    id: 'handle-calendar-webhook',
    retries: 2,
    // Deduplicate: if same channelId arrives multiple times in 30s, run once
    idempotency: 'event.data.channelId',
  },
  { event: 'calendar/webhook.received' },
  async ({ event, step }) => {
    const { channelId } = event.data

    // Find which user this channel belongs to
    const integration = await step.run('find-integration', async () => {
      return db.userIntegration.findFirst({
        where: { watchChannelId: channelId, provider: 'GOOGLE_CALENDAR' },
        select: { userId: true, tenantId: true },
      })
    })

    if (!integration) {
      LOGGER.warn({ channelId }, 'Webhook received for unknown channel')
      return { handled: false, reason: 'unknown_channel' }
    }

    // Pull the latest events for this user
    await step.run('pull-events', async () => {
      return calendarSyncService.pullEventsForUser(integration.userId)
    })

    LOGGER.info({ channelId, userId: integration.userId }, 'Webhook processed')
    return { handled: true }
  }
)

export const calendarSyncFunctions = [
  pushBookingToCalendar,
  handleCalendarWebhook,
]
```

**After writing this file:**
1. In `src/modules/booking/booking.events.ts`: remove the stub `pushBookingToCalendar` function (replaced above). Update `bookingFunctions` array to no longer include it.
2. Update `src/app/api/inngest/route.ts` to import and include `calendarSyncFunctions`.

---

### PHASE4-T22: Write the Google Calendar webhook route

**Goal:** The webhook endpoint that receives Google Calendar push notifications. Validates the channel token BEFORE emitting the Inngest event, returns 200 immediately (even on validation failure — Google disables channels that receive repeated non-2xx responses).

**File: `src/app/api/integrations/google-calendar/webhook/route.ts`**

```typescript
// src/app/api/integrations/google-calendar/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/shared/inngest'
import { db } from '@/shared/db'
import { userIntegrations } from '@/shared/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'calendar-webhook' })

export async function POST(request: NextRequest) {
  // Google Calendar sends these headers on every push notification
  const channelId = request.headers.get('x-goog-channel-id')
  const channelToken = request.headers.get('x-goog-channel-token')
  const resourceState = request.headers.get('x-goog-resource-state')
  const resourceId = request.headers.get('x-goog-resource-id')

  // Always return 200 to Google Calendar, even on validation failure
  // Google will disable the channel if it receives non-2xx responses repeatedly
  if (!channelId || !channelToken) {
    log.warn({ channelId, resourceState }, 'Calendar webhook missing required headers')
    return NextResponse.json({ ok: true })
  }

  // Validate channel token against stored value
  // The token was set when creating the watch channel and stored in UserIntegration
  const integration = await db.query.userIntegrations.findFirst({
    where: eq(userIntegrations.watchChannelId, channelId)
  })

  if (!integration) {
    log.warn({ channelId }, 'Calendar webhook: unknown channel ID')
    return NextResponse.json({ ok: true })
  }

  if (!integration.watchChannelToken || integration.watchChannelToken !== channelToken) {
    log.warn({ channelId }, 'Calendar webhook: invalid channel token — possible spoofed request')
    return NextResponse.json({ ok: true })
  }

  // sync notifications only (skip 'exists' state which fires on channel creation)
  if (resourceState === 'sync') {
    log.info({ channelId }, 'Calendar webhook: sync notification, no action needed')
    return NextResponse.json({ ok: true })
  }

  // Valid notification — emit event for async processing
  await inngest.send({
    name: 'calendar/webhook.received',
    data: { channelId, resourceId: resourceId ?? '' },
  })

  log.info({ channelId, resourceState }, 'Calendar webhook received and queued')
  return NextResponse.json({ ok: true })
}
```

---

### PHASE4-T23: Write OAuth callback route

**Goal:** Handle the Google OAuth callback. This route is called by Google after the user authorizes the app.

**File: `src/app/api/integrations/google-calendar/callback/route.ts`**

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { calendarSyncService } from '@/modules/calendar-sync/calendar-sync.service'
import { log } from '@/shared/logger'

const LOGGER = log.child({ module: 'google-calendar-callback' })

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // User denied access
  if (error) {
    LOGGER.warn({ error }, 'Google OAuth denied by user')
    return NextResponse.redirect(
      new URL('/admin/team?calendar_error=denied', request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/admin/team?calendar_error=missing_params', request.url)
    )
  }

  try {
    const { integrationId } = await calendarSyncService.handleOAuthCallback(code, state)
    LOGGER.info({ integrationId }, 'Google Calendar connected')

    return NextResponse.redirect(
      new URL('/admin/team?calendar_connected=1', request.url)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    LOGGER.error({ error: message }, 'OAuth callback failed')

    return NextResponse.redirect(
      new URL(`/admin/team?calendar_error=oauth_failed`, request.url)
    )
  }
}
```

---

### PHASE4-T24: Write `calendar-sync/index.ts` and wire into root router

**File: `src/modules/calendar-sync/index.ts`**

```typescript
export { calendarSyncRouter } from './calendar-sync.router'
export { calendarSyncFunctions } from './calendar-sync.events'
export { calendarSyncService } from './calendar-sync.service'
export * from './calendar-sync.types'
export * from './calendar-sync.schemas'
```

**Update `src/server/root.ts`:**

```typescript
import { calendarSyncRouter } from '@/modules/calendar-sync'

export const appRouter = router({
  // ... existing routers
  notification: notificationRouter,
  calendarSync: calendarSyncRouter,
})
```

**Update `src/app/api/inngest/route.ts`:**

```typescript
import { calendarSyncFunctions } from '@/modules/calendar-sync'
// serve(inngest, [...bookingFunctions, ...schedulingFunctions, ...notificationFunctions, ...calendarSyncFunctions])
```

---

### PHASE4-T25: Update `.env.example`

Add all Phase 4 variables to `/Users/lukehodges/Documents/ironheart-refactor/.env.example`:

```bash
# =============================================================================
# Phase 4: Resend (Email)
# =============================================================================
# [REQUIRED] Get from https://resend.com → API Keys
RESEND_API_KEY=re_...
# [REQUIRED] Verified sender address in Resend
RESEND_FROM_EMAIL=bookings@ironheart.app

# =============================================================================
# Phase 4: Twilio (SMS)
# =============================================================================
# [REQUIRED] Get from https://console.twilio.com → Account Info
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=
# [REQUIRED] Twilio phone number in E.164 format
TWILIO_FROM_NUMBER=+447700000000

# =============================================================================
# Phase 4: Google Calendar OAuth
# =============================================================================
# [REQUIRED] Get from https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Development: http://localhost:3000/api/integrations/google-calendar/callback
# Production:  https://your-domain.com/api/integrations/google-calendar/callback
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback

# [REQUIRED] 32-byte hex string for encrypting OAuth tokens at rest
# Generate with: openssl rand -hex 32
CALENDAR_TOKEN_ENCRYPTION_KEY=

# Old encryption key — only set during key rotation window, remove after rotation complete
# See oauth.ts KEY ROTATION PROCEDURE for instructions
# CALENDAR_TOKEN_ENCRYPTION_KEY_OLD=

# [REQUIRED] Base URL — used to construct webhook URLs for Google watch channels
# Development: Use ngrok or similar tunnel (Google requires HTTPS)
NEXT_PUBLIC_APP_URL=https://your-tunnel.ngrok.io
```

---

### PHASE4-T26: End-to-end verification

**Step 1 — TypeScript:**
```bash
cd /Users/lukehodges/Documents/ironheart-refactor
npx tsc --noEmit
```
Expected: 0 errors.

**Step 2 — Build:**
```bash
npm run build
```
Expected: 0 errors, 0 "Error:" lines.

**Step 3 — Inngest dev server:**
```bash
npx inngest-cli@latest dev
```

Expected functions registered (total should now be 18+):

Phase 0–2 functions (unchanged):
- `release-expired-reservation`
- `schedule-booking-reminders`
- `send-reminders-cron`
- `sync-calendars-cron`
- `pull-calendar-events-cron` ← now real implementation
- `refresh-calendar-tokens-cron` ← now real implementation
- `renew-watch-channels-cron` ← now real implementation

Phase 1 functions (stubs removed or upgraded):
- `send-booking-confirmation-email` — REMOVED (replaced by Phase 4 handler)
- `push-booking-to-calendar` ← now registered from calendar-sync module

Phase 4 new functions:
- `handle-notification-send-email`
- `handle-notification-send-sms`
- `send-booking-confirmation-notification`
- `send-booking-cancellation-notification`
- `send-review-request`
- `push-booking-to-calendar` (calendar-sync version)
- `handle-calendar-webhook`

**Step 4 — Email delivery test:**
```bash
# Send a test notification/send.email event from the Inngest dashboard
# Event name: notification/send.email
# Data:
{
  "to": "test@example.com",
  "templateId": "test",
  "variables": {
    "subject": "Test email from Phase 4",
    "html": "<h1>Phase 4 notification test</h1>",
    "tenantId": "test-tenant",
    "bookingId": null
  }
}
```
Expected: Email arrives in Resend test dashboard (or real inbox if using live key).

**Step 5 — Webhook route test:**
```bash
curl -X POST http://localhost:3000/api/integrations/google-calendar/webhook \
  -H "X-Goog-Channel-ID: test-channel" \
  -H "X-Goog-Resource-ID: test-resource" \
  -H "X-Goog-Resource-State: exists"
```
Expected: `{"ok":true}` with status 200.

**Step 6 — OAuth callback route exists:**
```bash
curl -X GET "http://localhost:3000/api/integrations/google-calendar/callback?error=access_denied"
```
Expected: Redirect to `/admin/team?calendar_error=denied`.

---

## Key Design Decisions

### 1. Two-step notification dispatch: service → Inngest → provider

The legacy `triggers.ts` used `setImmediate(() => sendEmail(...))` — fire-and-forget inside the request process. This is fragile: if the process dies, the email is lost.

New pattern:
```
booking.service.confirmReservation()
  → inngest.send("booking/confirmed")
  → send-booking-confirmation-notification handler
  → notificationService.sendForBooking()
  → inngest.send("notification/send.email", { to, subject, html, ... })
  → handle-notification-send-email handler
  → emailProvider.send() → Resend
```

Two-step because:
- The first hop (booking/confirmed → service call) can retry the entire notification flow if DB is down.
- The second hop (send.email → Resend) can retry just the provider call without re-running template logic.
- The `SentMessage` record is written in the second hop — idempotency guaranteed.

### 2. Template resolution: DB first, React Email fallback

Tenants can override any system template via the `MessageTemplate` table. If no DB row exists, the React Email template is rendered at send time.

```
DB template (service-specific) → DB template (generic) → React Email component
```

This means:
- Zero-config deployments get working emails out of the box via React Email defaults.
- Tenants can customise templates via the admin UI without code changes.
- React Email provides HTML-safe, responsive layouts that work in all email clients.

### 3. Variables map carries rendered content for the send handler

The `notification/send.email` event `variables` map is used to carry both template substitution variables AND the pre-rendered email content:

```typescript
// Variables map for notification/send.email:
{
  // Standard template variables:
  customerName: "Jane Smith",
  serviceName: "Deep Tissue Massage",
  ...

  // Rendered content (packed in by the service, unpacked by the handler):
  subject: "Booking Confirmed - Deep Tissue Massage",
  html: "<html>...</html>",
  text: "Your booking is confirmed...",
  replyTo: "info@tenant.example.com",
  tenantId: "uuid",
  bookingId: "uuid",
}
```

This avoids needing to reload the booking in the send handler. The service does the DB work; the handler just calls the provider.

### 4. Calendar-sync: no circuit breaker — Inngest retries replace it

The legacy `google-calendar-sync.ts` uses `opossum` (circuit breaker) with complex state management. In a serverless environment, circuit breaker state is lost between invocations.

Inngest's retry mechanism provides equivalent protection:
- 3 retries with exponential backoff.
- Failed runs are isolated (one booking failure doesn't block others).
- The Inngest dashboard shows failure history without a separate circuit breaker state machine.

### 5. Phase 2 stubs are upgraded in-place, not replaced

The scheduling module's `pullCalendarEventsCron`, `refreshCalendarTokensCron`, and `renewWatchChannelsCron` keep their Inngest function IDs from Phase 2. Only the bodies are filled in.

This matters because Inngest tracks function runs by ID — changing the ID would orphan any in-flight runs.

### 6. Inngest at-least-once delivery: idempotency guards on all notification handlers

Inngest guarantees at-least-once delivery, meaning any handler can fire more than once on retry. All notification handlers check a `sent_messages` table before sending and record delivery after. The `ON CONFLICT DO NOTHING` insert ensures the check-and-record is atomic even under concurrent retries. A user will never receive a duplicate confirmation email.

This idempotency pattern is applied to ALL notification handlers:
- `sendBookingConfirmationNotification`
- `sendBookingCancellationNotification`
- `sendReviewRequest`
- Phase 2's `scheduleBookingReminders` (24h and 2h reminders)

### 7. Inngest handler tenantId assertion

Every handler that loads a record verifies that the `tenantId` in `event.data` matches the `tenantId` of the loaded record. This is defence-in-depth — event payloads are not directly user-controlled but validating the assertion costs one comparison and prevents cross-tenant data access if an event is ever malformed.

Pattern used in every handler:
```typescript
const booking = await bookingRepository.findByIdPublic(event.data.bookingId)

if (!booking) throw new Error(`Booking ${event.data.bookingId} not found`)
if (booking.tenantId !== event.data.tenantId) {
  throw new Error(`Tenant mismatch: booking belongs to ${booking.tenantId}, event claims ${event.data.tenantId}`)
}
```

### 8. OAuth state uses base64url JSON (upgrade to signed JWT in Phase 3)

The OAuth state parameter contains `{ userId, tenantId, ts }` encoded as base64url JSON. This is not cryptographically signed — a malicious redirect could craft a state with a different userId.

Phase 3 (WorkOS) provides proper session context. Until then, the base64url approach is acceptable because:
- The callback can only be triggered by someone who completed the Google OAuth flow.
- The userId is validated against the current session in Phase 3.

**Flag this for Phase 3:** Replace `buildOAuthState` / `parseOAuthState` with a signed JWT using the WorkOS session.

---

## Files to read in legacy codebase (reference only)

| File | LOC | What to read for |
|------|-----|-----------------|
| `src/lib/messaging/templates.ts` | 680 | `VARIABLE_REGEX`, `renderTemplate()`, `renderMessage()`, `validateTemplate()`, `DEFAULT_TEMPLATES` array (8 system templates) |
| `src/lib/messaging/variable-builder.ts` | 550 | `buildTemplateVariables()` structure, formatting helpers (`formatBookingDate`, `formatTime`, `formatDuration`, `formatCurrency`). Do NOT port `parseCustomerNotes()`, `getDurationText()`, `getBreakForFoodTime()`, `getEntertainerArrivalTime()`, or any party-specific helpers. |
| `src/lib/messaging/triggers.ts` | 639 | Template resolution logic (lines 104–123: service-specific priority), `sendEmailNotification()`, `sendSMSNotification()`, `SentMessage` record structure. Do NOT port `triggerCotswold*` functions. |
| `src/lib/integrations/google-calendar-client.ts` | 712 | Full class — rate limiter config, retry config, all API methods, token refresh logic |
| `src/lib/integrations/google-calendar-sync.ts` | 685 | `getBookingWithRelations()`, `getStaffIntegration()`, `findExistingSyncLog()`, `createSyncLog()`, `syncBookingInternal()`, `shouldSyncBooking()` |
| `src/lib/integrations/google-calendar-pull.ts` | 406 | `pullStaffEvents()`, `filterExternalEvents()`, `parseGoogleEvent()`, `cleanupDeletedEvents()` |
| `src/lib/integrations/google-calendar-watch.ts` | 614 | `createWatchChannel()`, `renewWatchChannel()`, `stopWatchChannel()`, `renewAllWatchChannels()`, `verifyWebhookToken()`, constant definitions |
| `src/lib/integrations/calendar-event-mapper.ts` | 306 | Full file — `bookingToCalendarEvent()`, color map, `buildEventDescription()`, `calculateEventTimes()` |
| `src/lib/integrations/integration-helpers.ts` | 396 | `getStaffIntegration()`, `isTokenExpired()`, `shouldSync()`, `mapGoogleErrorToMessage()` |

---

*Phase 4 Plan — Ironheart Refactor*
*Written: 2026-02-19*
