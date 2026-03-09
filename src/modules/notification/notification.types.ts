/**
 * Notification Module - Type Definitions
 *
 * All types are kept in one file so other module files can import from a
 * single source of truth without circular dependencies.
 */

// ─── Trigger Enum ─────────────────────────────────────────────────────────────

/** Mirrors the messageTrigger DB enum - keep in sync with notifications.schema.ts */
export type MessageTrigger =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_REMINDER_24H'
  | 'BOOKING_REMINDER_2H'
  | 'BOOKING_COMPLETED'
  | 'APPROVAL_REQUIRED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'INVOICE_SENT'
  | 'REVIEW_REQUEST'
  | 'PORTAL_INVITE'

// ─── Channel Enum ─────────────────────────────────────────────────────────────

export type MessageChannel = 'EMAIL' | 'SMS' | 'PUSH'

// ─── Template Types ────────────────────────────────────────────────────────────

/**
 * All variables that can be injected into email/SMS templates.
 * Built by variable-builder.ts from a booking + tenant record.
 */
export interface TemplateVariables {
  // Customer
  customerName: string
  customerFirstName: string
  customerEmail: string
  customerPhone?: string

  // Booking
  bookingNumber: string
  bookingDate: string          // "Monday, 15 February 2026"
  bookingTime: string          // "2:30 PM"
  bookingDuration?: string     // "60 minutes"
  bookingUrl: string           // Deep link to portal booking page
  bookingStatus: string

  // Service
  serviceName: string
  serviceDescription?: string

  // Staff
  staffName?: string
  staffFirstName?: string

  // Location
  locationAddress?: string
  locationCity?: string
  locationType: string         // "IN_HOME" | "IN_STUDIO" | "VIRTUAL"

  // Tenant
  tenantName: string
  tenantLogoUrl?: string
  tenantPhone?: string
  tenantEmail?: string
  tenantWebsite?: string
  tenantAddress?: string

  // Portal
  portalUrl?: string

  // Review
  reviewUrl?: string
}

// ─── Template Records (DB rows) ────────────────────────────────────────────────

export interface MessageTemplateRecord {
  id: string
  tenantId: string
  name: string
  trigger: MessageTrigger
  channel: MessageChannel
  subject: string | null       // Email subject (null for SMS)
  body: string                 // Plain text body
  bodyHtml: string | null      // HTML body for email (null = use React Email system template)
  serviceId: string | null     // Service-specific override (null = applies to all services)
  isActive: boolean
}

// ─── Trigger With Module (for UI) ─────────────────────────────────────────────

export interface NotificationTriggerWithModule {
  key: string
  label: string
  description: string
  defaultChannels: string[]
  variables: string[]
  moduleSlug: string
  moduleName: string
  moduleEnabled: boolean
}

// ─── Template List Item (for UI) ──────────────────────────────────────────────

export interface TemplateListItem {
  id: string
  tenantId: string
  name: string
  trigger: string
  channel: string
  subject: string | null
  body: string
  active: boolean
  isSystem: boolean
  serviceId: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Send Request Types ────────────────────────────────────────────────────────

export interface EmailSendRequest {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  fromName?: string
  fromEmail?: string
  bookingId?: string
  tenantId: string
  templateId?: string
  trigger: MessageTrigger
}

export interface SmsSendRequest {
  to: string          // E.164 format
  body: string
  bookingId?: string
  tenantId: string
  templateId?: string
  trigger: MessageTrigger
}

// ─── Send Result Types ─────────────────────────────────────────────────────────

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ─── Notification Preferences ─────────────────────────────────────────────────

export interface NotificationPreferences {
  emailEnabled: boolean
  smsEnabled: boolean
  reminderEnabled: boolean
  marketingEnabled: boolean
}

// ─── Audit Record ─────────────────────────────────────────────────────────────

export interface SentMessageRecord {
  id: string
  tenantId: string
  bookingId: string | null
  templateId: string | null
  channel: MessageChannel
  trigger: MessageTrigger
  recipientEmail: string | null
  recipientPhone: string | null
  subject: string | null
  body: string
  status: 'SENT' | 'FAILED'
  sentAt: Date | null
  providerRef: string | null
  errorMessage: string | null
  createdAt: Date
}
