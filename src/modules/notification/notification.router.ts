/**
 * Notification tRPC Router
 *
 * Thin router that exposes notification management endpoints to the frontend.
 *
 * Procedures:
 *   - listSentMessages   — tenant, query: audit trail for a booking
 *   - sendTest           — platform admin, mutation: trigger a test notification
 */

import { router, tenantProcedure, platformAdminProcedure } from '@/shared/trpc'
import { notificationService } from './notification.service'
import {
  listSentMessagesSchema,
  sendTestNotificationSchema,
} from './notification.schemas'

export const notificationRouter = router({
  /**
   * List sent messages for a booking (for audit/history display).
   *
   * Currently returns empty array — full query can be added when UI is built.
   * The endpoint signature is locked so the frontend client type is stable.
   */
  listSentMessages: tenantProcedure
    .input(listSentMessagesSchema)
    .query(async () => {
      // Full query implementation deferred to when the audit UI is built.
      return []
    }),

  /**
   * Send a test notification (platform admin only).
   *
   * Calls notificationService.sendForBooking with a placeholder bookingId.
   * Only triggers email channel — SMS requires a real phone and is skipped
   * if no bookingId resolves (service returns early when booking not found).
   */
  sendTest: platformAdminProcedure
    .input(sendTestNotificationSchema)
    .mutation(async ({ input }) => {
      await notificationService.sendForBooking(
        'test-booking-id',
        input.trigger,
        input.tenantId
      )
      return { queued: true }
    }),
})
