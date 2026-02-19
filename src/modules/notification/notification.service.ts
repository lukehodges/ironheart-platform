/**
 * Notification Service
 *
 * Orchestration layer for outbound notifications.
 *
 * Responsibilities:
 *   - Load booking data and build template variables
 *   - Resolve DB custom templates (with fallback to React Email system templates)
 *   - Emit Inngest events — providers are invoked by the Inngest event handlers,
 *     NOT directly from this service
 *
 * Idempotency is enforced by the event handler (notification.events.ts) which
 * checks the sentMessages table before calling providers.
 */

import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { render } from '@react-email/render'
import { notificationRepository } from './notification.repository'
import { buildTemplateVariables } from './lib/variable-builder'
import { resolveEmailContent, resolveSmsContent } from './lib/template-engine'
import { getSmsBody } from './templates/sms/booking-sms'
import { BookingConfirmedEmail } from './templates/email/booking-confirmed'
import { BookingReminder24hEmail } from './templates/email/booking-reminder-24h'
import { BookingCancellationEmail } from './templates/email/booking-cancellation'
import { BookingApprovedEmail } from './templates/email/booking-approved'
import { BookingRejectedEmail } from './templates/email/booking-rejected'
import { ReviewRequestEmail } from './templates/email/review-request'
import { PortalInviteEmail } from './templates/email/portal-invite'
import type { MessageTrigger } from './notification.types'
import type { TemplateVariables } from './notification.types'

const log = logger.child({ module: 'notification.service' })

// ─── System Template Renderer ─────────────────────────────────────────────────

/**
 * Render a React Email system template to { subject, html, text } for a given
 * trigger and variable set.
 *
 * Returns null when no system template is mapped to the trigger (e.g.
 * BOOKING_CREATED, PAYMENT_RECEIVED — no customer-facing email is needed by
 * default).
 *
 * Components are called as plain functions (not JSX) because this is a .ts
 * file, not a .tsx file.
 */
async function renderSystemEmailTemplate(
  trigger: MessageTrigger,
  vars: TemplateVariables
): Promise<{ subject: string; html: string; text: string } | null> {
  switch (trigger) {
    case 'BOOKING_CONFIRMED': {
      const props = {
        customerName: vars.customerName,
        serviceName: vars.serviceName,
        bookingDate: vars.bookingDate,
        bookingTime: vars.bookingTime,
        bookingDuration: vars.bookingDuration,
        bookingNumber: vars.bookingNumber,
        bookingUrl: vars.bookingUrl,
        locationAddress: vars.locationAddress,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
        tenantPhone: vars.tenantPhone,
        tenantEmail: vars.tenantEmail,
      }
      const html = await render(BookingConfirmedEmail(props))
      const text = await render(BookingConfirmedEmail(props), { plainText: true })
      return {
        subject: `Booking Confirmed — ${vars.serviceName}`,
        html,
        text,
      }
    }

    case 'BOOKING_REMINDER_24H': {
      const props = {
        customerName: vars.customerName,
        serviceName: vars.serviceName,
        bookingDate: vars.bookingDate,
        bookingTime: vars.bookingTime,
        bookingDuration: vars.bookingDuration,
        bookingNumber: vars.bookingNumber,
        bookingUrl: vars.bookingUrl,
        locationAddress: vars.locationAddress,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
        tenantPhone: vars.tenantPhone,
        tenantEmail: vars.tenantEmail,
      }
      const html = await render(BookingReminder24hEmail(props))
      const text = await render(BookingReminder24hEmail(props), { plainText: true })
      return {
        subject: `Reminder: ${vars.serviceName} tomorrow at ${vars.bookingTime}`,
        html,
        text,
      }
    }

    case 'BOOKING_CANCELLED': {
      const props = {
        customerName: vars.customerName,
        serviceName: vars.serviceName,
        bookingDate: vars.bookingDate,
        bookingTime: vars.bookingTime,
        bookingNumber: vars.bookingNumber,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
        tenantPhone: vars.tenantPhone,
        tenantEmail: vars.tenantEmail,
        portalUrl: vars.portalUrl,
      }
      const html = await render(BookingCancellationEmail(props))
      const text = await render(BookingCancellationEmail(props), { plainText: true })
      return {
        subject: `Your ${vars.serviceName} booking has been cancelled`,
        html,
        text,
      }
    }

    case 'BOOKING_APPROVED': {
      const props = {
        customerName: vars.customerName,
        serviceName: vars.serviceName,
        bookingDate: vars.bookingDate,
        bookingTime: vars.bookingTime,
        bookingDuration: vars.bookingDuration,
        bookingNumber: vars.bookingNumber,
        bookingUrl: vars.bookingUrl,
        locationAddress: vars.locationAddress,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
        tenantPhone: vars.tenantPhone,
        tenantEmail: vars.tenantEmail,
      }
      const html = await render(BookingApprovedEmail(props))
      const text = await render(BookingApprovedEmail(props), { plainText: true })
      return {
        subject: `Your ${vars.serviceName} booking has been approved`,
        html,
        text,
      }
    }

    case 'BOOKING_REJECTED': {
      const props = {
        customerName: vars.customerName,
        serviceName: vars.serviceName,
        bookingDate: vars.bookingDate,
        bookingTime: vars.bookingTime,
        bookingNumber: vars.bookingNumber,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
        tenantPhone: vars.tenantPhone,
        tenantEmail: vars.tenantEmail,
        portalUrl: vars.portalUrl,
      }
      const html = await render(BookingRejectedEmail(props))
      const text = await render(BookingRejectedEmail(props), { plainText: true })
      return {
        subject: `Update regarding your ${vars.serviceName} booking request`,
        html,
        text,
      }
    }

    case 'REVIEW_REQUEST': {
      // reviewUrl is required by ReviewRequestEmail — skip if absent.
      if (!vars.reviewUrl) {
        log.warn(
          { trigger, bookingNumber: vars.bookingNumber },
          'notification.service: REVIEW_REQUEST skipped — reviewUrl is missing'
        )
        return null
      }
      const props = {
        customerName: vars.customerName,
        serviceName: vars.serviceName,
        bookingDate: vars.bookingDate,
        staffName: vars.staffName,
        reviewUrl: vars.reviewUrl,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
      }
      const html = await render(ReviewRequestEmail(props))
      const text = await render(ReviewRequestEmail(props), { plainText: true })
      return {
        subject: `How was your ${vars.serviceName} experience?`,
        html,
        text,
      }
    }

    case 'PORTAL_INVITE': {
      // portalUrl is required — skip if absent.
      if (!vars.portalUrl) {
        log.warn(
          { trigger },
          'notification.service: PORTAL_INVITE skipped — portalUrl is missing'
        )
        return null
      }
      const props = {
        customerName: vars.customerName,
        tenantName: vars.tenantName,
        tenantLogoUrl: vars.tenantLogoUrl,
        portalUrl: vars.portalUrl,
        tenantPhone: vars.tenantPhone,
        tenantEmail: vars.tenantEmail,
      }
      const html = await render(PortalInviteEmail(props))
      const text = await render(PortalInviteEmail(props), { plainText: true })
      return {
        subject: `You've been invited to ${vars.tenantName}'s client portal`,
        html,
        text,
      }
    }

    // These triggers have no customer-facing email system template.
    case 'BOOKING_CREATED':
    case 'BOOKING_REMINDER_2H':
    case 'BOOKING_COMPLETED':
    case 'APPROVAL_REQUIRED':
    case 'PAYMENT_RECEIVED':
    case 'INVOICE_SENT':
      return null
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const notificationService = {
  /**
   * Send all relevant notifications for a booking event.
   *
   * Flow:
   *   1. Load booking data (early-return with warning if not found)
   *   2. Build template variables
   *   3. Resolve email content (DB template → system template)
   *   4. Emit notification/send.email Inngest event (if customer has email)
   *   5. Resolve SMS body (DB template → SMS template function)
   *   6. Emit notification/send.sms Inngest event (if customer has phone)
   *
   * This method does NOT call providers directly. The Inngest event handlers
   * are responsible for idempotency, provider selection, and delivery.
   */
  async sendForBooking(
    bookingId: string,
    trigger: MessageTrigger,
    tenantId: string
  ): Promise<void> {
    // 1. Load booking
    const booking = await notificationRepository.loadBookingForNotification(bookingId)
    if (!booking) {
      log.warn(
        { bookingId, trigger, tenantId },
        'notification.service: booking not found — skipping notification'
      )
      return
    }

    // 2. Build variables
    const vars = buildTemplateVariables(booking)
    const customerEmail = vars.customerEmail
    const customerPhone = vars.customerPhone

    // 3 + 4. Email
    if (customerEmail) {
      let emailContent: { subject: string; html: string; text: string } | null = null

      // Try DB template first
      const dbTemplate = await notificationRepository.resolveTemplate(
        tenantId,
        trigger,
        'EMAIL',
        booking.service != null
          ? (booking as unknown as BookingWithServiceId).serviceId
          : undefined
      )

      if (dbTemplate) {
        emailContent = resolveEmailContent(dbTemplate, vars)
      }

      // Fall back to React Email system template
      if (!emailContent) {
        emailContent = await renderSystemEmailTemplate(trigger, vars)
      }

      if (emailContent) {
        await inngest.send({
          name: 'notification/send.email',
          data: {
            to: customerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            bookingId,
            tenantId,
            templateId: dbTemplate?.id,
            trigger,
          },
        })

        log.info(
          { bookingId, trigger, to: customerEmail, tenantId },
          'notification.service: email event emitted'
        )
      } else {
        log.warn(
          { bookingId, trigger, tenantId },
          'notification.service: no email template available for trigger — skipping email'
        )
      }
    }

    // 5 + 6. SMS
    if (customerPhone) {
      let smsBody: string | null = null

      // Try DB template first
      const dbSmsTemplate = await notificationRepository.resolveTemplate(
        tenantId,
        trigger,
        'SMS',
        booking.service != null
          ? (booking as unknown as BookingWithServiceId).serviceId
          : undefined
      )

      if (dbSmsTemplate) {
        const resolved = resolveSmsContent(dbSmsTemplate, vars)
        smsBody = resolved?.body ?? null
      }

      // Fall back to system SMS template function
      if (!smsBody) {
        smsBody = getSmsBody(trigger, vars)
      }

      if (smsBody) {
        await inngest.send({
          name: 'notification/send.sms',
          data: {
            to: customerPhone,
            body: smsBody,
            bookingId,
            tenantId,
            templateId: dbSmsTemplate?.id,
            trigger,
          },
        })

        log.info(
          { bookingId, trigger, to: customerPhone, tenantId },
          'notification.service: SMS event emitted'
        )
      }
    }
  },
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Type narrowing helper: loadBookingForNotification only returns the shape
 * defined in BookingForVariables (no serviceId). We use a cast here to pass
 * the serviceId to resolveTemplate without modifying the public interface.
 *
 * In practice, the raw DB row always has a serviceId — it is NOT NULL in the
 * schema — so this cast is safe.
 */
interface BookingWithServiceId {
  serviceId: string
}
