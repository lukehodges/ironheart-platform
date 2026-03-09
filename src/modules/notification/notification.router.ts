/**
 * Notification tRPC Router
 *
 * Thin router that exposes notification management endpoints to the frontend.
 *
 * Procedures:
 *   - listTriggers       - tenant, query: all registered triggers with module info
 *   - listTemplates      - tenant, query: message templates with optional filters
 *   - getTemplate        - tenant, query: single template by id
 *   - createTemplate     - permission, mutation: create a new template
 *   - updateTemplate     - permission, mutation: update an existing template
 *   - deleteTemplate     - permission, mutation: delete a template
 *   - listSentMessages   - tenant, query: audit trail for a booking
 *   - sendTest           - platform admin, mutation: trigger a test notification
 */

import { z } from 'zod'
import { router, tenantProcedure, platformAdminProcedure, permissionProcedure, createModuleMiddleware } from '@/shared/trpc'

const moduleGate = createModuleMiddleware('notification')
const moduleProcedure = tenantProcedure.use(moduleGate)
import { notificationService } from './notification.service'
import {
  listSentMessagesSchema,
  sendTestNotificationSchema,
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesSchema,
} from './notification.schemas'

export const notificationRouter = router({
  // ─── Trigger & Template Management ─────────────────────────────────────────

  /** List all registered notification triggers enriched with module info. */
  listTriggers: tenantProcedure.query(async ({ ctx }) => {
    return notificationService.listTriggersWithModules(ctx.tenantId)
  }),

  /** List message templates with optional filters. */
  listTemplates: tenantProcedure
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) => {
      return notificationService.listTemplates(ctx.tenantId, input)
    }),

  /** Get a single template by ID. */
  getTemplate: tenantProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return notificationService.getTemplate(ctx.tenantId, input.id)
    }),

  /** Create a new message template. */
  createTemplate: permissionProcedure('notifications:write')
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      return notificationService.createTemplate(ctx.tenantId, input)
    }),

  /** Update an existing message template. */
  updateTemplate: permissionProcedure('notifications:write')
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return notificationService.updateTemplate(ctx.tenantId, id, data)
    }),

  /** Delete a message template. */
  deleteTemplate: permissionProcedure('notifications:write')
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      return notificationService.deleteTemplate(ctx.tenantId, input.id)
    }),

  // ─── Legacy Procedures ─────────────────────────────────────────────────────

  /**
   * List sent messages for a booking (for audit/history display).
   *
   * Currently returns empty array - full query can be added when UI is built.
   * The endpoint signature is locked so the frontend client type is stable.
   */
  listSentMessages: moduleProcedure
    .input(listSentMessagesSchema)
    .query(async () => {
      // Full query implementation deferred to when the audit UI is built.
      return []
    }),

  /**
   * Send a test notification (platform admin only).
   *
   * Calls notificationService.sendForBooking with a placeholder bookingId.
   * Only triggers email channel - SMS requires a real phone and is skipped
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
