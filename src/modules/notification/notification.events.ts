/**
 * Notification Inngest Event Handlers
 *
 * Handles email and SMS delivery events emitted by notification.service.ts.
 * Each handler performs:
 *   1. Idempotency check (sentMessages table) - skips if already sent
 *   2. Provider delivery (emailProvider / smsProvider singletons)
 *   3. Audit log write (sentMessages table)
 *
 * Booking lifecycle handlers listen on booking/* events and call
 * notificationService.sendForBooking to emit notification/send.* events.
 */

import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import { notificationRepository } from './notification.repository'
import { emailProvider, smsProvider } from './providers/factory'
import { notificationService } from './notification.service'
import type { MessageTrigger, MessageChannel } from './notification.types'

const log = logger.child({ module: 'notification.events' })

// ─── Email Delivery Handler ────────────────────────────────────────────────────

/**
 * Handle email send events emitted by notification.service.ts.
 *
 * Performs idempotency check, sends via provider, records audit log.
 * Skips silently when the same (bookingId, trigger, EMAIL) triple is already SENT.
 */
export const handleNotificationSendEmail = inngest.createFunction(
  { id: 'handle-notification-send-email', name: 'Handle Notification: Send Email' },
  { event: 'notification/send.email' },
  async ({ event, step }) => {
    const { to, subject, html, text, bookingId, tenantId, trigger, templateId } = event.data

    // Idempotency check - skip if already sent for this booking+trigger+channel
    if (bookingId) {
      const alreadySent = await step.run('check-idempotency', async () => {
        return notificationRepository.hasNotificationBeenSent(
          bookingId,
          trigger as MessageTrigger,
          'EMAIL' as MessageChannel
        )
      })
      if (alreadySent) {
        log.info({ bookingId, trigger }, 'Email already sent - skipping (idempotent)')
        return { skipped: true, reason: 'already-sent' }
      }
    }

    // Send via provider
    const result = await step.run('send-email', async () => {
      return emailProvider.send({ to, subject, html, text })
    })

    // Record audit log
    await step.run('record-sent-message', async () => {
      await notificationRepository.recordSentMessage({
        tenantId,
        bookingId,
        templateId,
        channel: 'EMAIL',
        trigger: trigger as MessageTrigger,
        recipientEmail: to,
        subject,
        body: text ?? html.substring(0, 500),
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : undefined,
        providerRef: result.messageId,
        errorMessage: result.error,
      })
    })

    log.info({ bookingId, trigger, to, success: result.success }, 'Email send complete')

    return { success: result.success, messageId: result.messageId }
  }
)

// ─── SMS Delivery Handler ──────────────────────────────────────────────────────

/**
 * Handle SMS send events emitted by notification.service.ts.
 *
 * Performs idempotency check, sends via provider, records audit log.
 * Skips silently when the same (bookingId, trigger, SMS) triple is already SENT.
 */
export const handleNotificationSendSms = inngest.createFunction(
  { id: 'handle-notification-send-sms', name: 'Handle Notification: Send SMS' },
  { event: 'notification/send.sms' },
  async ({ event, step }) => {
    const { to, body, bookingId, tenantId, trigger, templateId } = event.data

    // Idempotency check - skip if already sent for this booking+trigger+channel
    if (bookingId) {
      const alreadySent = await step.run('check-idempotency', async () => {
        return notificationRepository.hasNotificationBeenSent(
          bookingId,
          trigger as MessageTrigger,
          'SMS' as MessageChannel
        )
      })
      if (alreadySent) {
        log.info({ bookingId, trigger }, 'SMS already sent - skipping (idempotent)')
        return { skipped: true, reason: 'already-sent' }
      }
    }

    // Send via provider
    const result = await step.run('send-sms', async () => {
      return smsProvider.send({ to, body })
    })

    // Record audit log
    await step.run('record-sent-message', async () => {
      await notificationRepository.recordSentMessage({
        tenantId,
        bookingId,
        templateId,
        channel: 'SMS',
        trigger: trigger as MessageTrigger,
        recipientPhone: to,
        body,
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : undefined,
        providerRef: result.messageId,
        errorMessage: result.error,
      })
    })

    log.info({ bookingId, trigger, to, success: result.success }, 'SMS send complete')

    return { success: result.success, messageId: result.messageId }
  }
)

// ─── Booking Lifecycle Handlers ────────────────────────────────────────────────

/**
 * Send booking confirmation notification.
 * Triggered by booking/confirmed event.
 *
 * NOTE: This function uses the same Inngest function ID as the stub in
 * booking.events.ts ("send-booking-confirmation-email"). The stub will be
 * removed from booking.events.ts in Wave 6 - until then, only one of these
 * should be registered in the inngest route.ts serve() call.
 */
export const sendBookingConfirmationEmail = inngest.createFunction(
  { id: 'send-booking-confirmation-email', name: 'Send Booking Confirmation Email' },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    await step.run('send-notification', async () => {
      await notificationService.sendForBooking(bookingId, 'BOOKING_CONFIRMED', tenantId)
    })
  }
)

/**
 * Send booking cancellation notification.
 * Triggered by booking/cancelled event.
 */
export const sendBookingCancellationNotification = inngest.createFunction(
  { id: 'send-booking-cancellation-notification', name: 'Send Booking Cancellation Notification' },
  { event: 'booking/cancelled' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    await step.run('send-notification', async () => {
      await notificationService.sendForBooking(bookingId, 'BOOKING_CANCELLED', tenantId)
    })
  }
)

/**
 * Send review request notification after booking completion.
 * Triggered by booking/completed event.
 */
export const sendReviewRequest = inngest.createFunction(
  { id: 'send-review-request', name: 'Send Review Request' },
  { event: 'booking/completed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    await step.run('send-notification', async () => {
      await notificationService.sendForBooking(bookingId, 'REVIEW_REQUEST', tenantId)
    })
  }
)

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * All notification Inngest functions.
 * Register in src/app/api/inngest/route.ts serve() call.
 *
 * Wave 6: When notificationFunctions is added to serve(), remove:
 *   - sendBookingConfirmationEmail from booking.events.ts bookingFunctions
 *   - pushBookingToCalendar stub once calendar-sync functions are registered
 */
export const notificationFunctions = [
  handleNotificationSendEmail,
  handleNotificationSendSms,
  sendBookingConfirmationEmail,
  sendBookingCancellationNotification,
  sendReviewRequest,
]
