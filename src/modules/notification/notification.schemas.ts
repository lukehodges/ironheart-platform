import { z } from 'zod'

// ─── Trigger + Channel Enums ──────────────────────────────────────────────────

export const messageTriggerSchema = z.enum([
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_REMINDER_24H',
  'BOOKING_REMINDER_2H',
  'BOOKING_COMPLETED',
  'APPROVAL_REQUIRED',
  'BOOKING_APPROVED',
  'BOOKING_REJECTED',
  'PAYMENT_RECEIVED',
  'INVOICE_SENT',
  'REVIEW_REQUEST',
  'PORTAL_INVITE',
])

export const messageChannelSchema = z.enum(['EMAIL', 'SMS', 'PUSH'])

// ─── Email Send Schema ────────────────────────────────────────────────────────

export const emailSendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(255),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional(),
  bookingId: z.string().optional(),
  tenantId: z.string(),
  templateId: z.string().optional(),
  trigger: messageTriggerSchema,
})

// ─── SMS Send Schema ──────────────────────────────────────────────────────────

export const smsSendSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format (e.g. +441234567890)'),
  body: z.string().min(1).max(1600),
  bookingId: z.string().optional(),
  tenantId: z.string(),
  templateId: z.string().optional(),
  trigger: messageTriggerSchema,
})

// ─── Template Schemas ──────────────────────────────────────────────────────────

export const templateVariablesSchema = z.object({
  customerName: z.string(),
  customerFirstName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),

  bookingNumber: z.string(),
  bookingDate: z.string(),
  bookingTime: z.string(),
  bookingDuration: z.string().optional(),
  bookingUrl: z.string().url(),
  bookingStatus: z.string(),

  serviceName: z.string(),
  serviceDescription: z.string().optional(),

  staffName: z.string().optional(),
  staffFirstName: z.string().optional(),

  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationType: z.string(),

  tenantName: z.string(),
  tenantLogoUrl: z.string().url().optional(),
  tenantPhone: z.string().optional(),
  tenantEmail: z.string().email().optional(),
  tenantWebsite: z.string().url().optional(),
  tenantAddress: z.string().optional(),

  portalUrl: z.string().url().optional(),
  reviewUrl: z.string().url().optional(),
})

// ─── tRPC Router Input Schemas ────────────────────────────────────────────────

/** List sent messages for a booking */
export const listSentMessagesSchema = z.object({
  bookingId: z.string(),
})

/** Get notification preferences for the current user */
export const getPreferencesSchema = z.object({
  tenantId: z.string(),
})

/** Update notification preferences */
export const updatePreferencesSchema = z.object({
  tenantId: z.string(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  marketingEnabled: z.boolean().optional(),
})

/** Send a test notification (admin only) */
export const sendTestNotificationSchema = z.object({
  tenantId: z.string(),
  channel: messageChannelSchema,
  trigger: messageTriggerSchema,
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
})
