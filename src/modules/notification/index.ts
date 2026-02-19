/**
 * Notification Module — Public API
 *
 * Import from this barrel when referencing the notification module from:
 *   - src/server/root.ts (router)
 *   - src/app/api/inngest/route.ts (functions)
 *   - Other modules that need to trigger notifications
 */

export { notificationRouter } from './notification.router'
export { notificationFunctions } from './notification.events'
export { notificationService } from './notification.service'
export { notificationRepository } from './notification.repository'
export type { MessageTrigger, MessageChannel, TemplateVariables, SendResult } from './notification.types'
