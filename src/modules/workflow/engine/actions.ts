// ──────────────────────────────────────────────────────────────────────────────
// Action executor — handles all 7 workflow action types
// Shared by both linear engine and graph engine
// ──────────────────────────────────────────────────────────────────────────────

import { inngest } from '@/shared/inngest'
import { logger } from '@/shared/logger'
import type {
  WorkflowActionType,
  NodeConfig,
  WorkflowExecutionContext,
  SendEmailActionConfig,
  SendSmsActionConfig,
  WebhookActionConfig,
  CreateCalendarEventActionConfig,
  UpdateBookingStatusActionConfig,
  CreateTaskActionConfig,
  SendNotificationActionConfig,
} from '../workflow.types'
import { substituteVariables, resolveContext, resolveField } from './context'

const log = logger.child({ module: 'workflow.actions' })

/**
 * Execute a single action of one of the 7 supported action types.
 *
 * @param actionType  - The action node type
 * @param config      - Node config (already variable-substituted for string fields)
 * @param data        - Flat resolved context for field resolution
 * @returns           - { success: true, ...output } or { success: false, error: string }
 */
export async function executeAction(
  actionType: WorkflowActionType,
  config: NodeConfig,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    switch (actionType) {
      case 'SEND_EMAIL': {
        const cfg = config as SendEmailActionConfig
        const to = cfg.recipientEmail ?? (resolveField(cfg.recipientField ?? '', data) as string) ?? ''
        await inngest.send({
          name: 'notification/send.email',
          data: {
            to: String(to),
            subject: String(cfg.subject ?? ''),
            html: String(cfg.bodyHtml ?? cfg.body ?? ''),
            text: cfg.body ? String(cfg.body) : undefined,
            tenantId: String(data.tenantId ?? ''),
            templateId: cfg.templateId,
            trigger: 'workflow',
          },
        })
        log.info({ to, actionType }, 'SEND_EMAIL dispatched')
        return { success: true, to }
      }

      case 'SEND_SMS': {
        const cfg = config as SendSmsActionConfig
        const to = cfg.recipientPhone ?? (resolveField(cfg.recipientField ?? '', data) as string) ?? ''
        await inngest.send({
          name: 'notification/send.sms',
          data: {
            to: String(to),
            body: String(cfg.body ?? ''),
            tenantId: String(data.tenantId ?? ''),
            templateId: cfg.templateId,
            trigger: 'workflow',
          },
        })
        log.info({ to, actionType }, 'SEND_SMS dispatched')
        return { success: true, to }
      }

      case 'WEBHOOK': {
        const cfg = config as WebhookActionConfig
        // HTTPS only — reject non-HTTPS URLs
        if (!cfg.url.startsWith('https://')) {
          throw new Error(`WEBHOOK action requires HTTPS URL, got: ${cfg.url}`)
        }
        const response = await fetch(cfg.url, {
          method: cfg.method,
          headers: {
            'Content-Type': 'application/json',
            ...(cfg.headers ?? {}),
          },
          body: cfg.bodyTemplate ? JSON.stringify(data) : undefined,
          signal: cfg.timeout ? AbortSignal.timeout(cfg.timeout) : undefined,
        })
        const expectedStatus = cfg.expectedStatus ?? 200
        if (response.status !== expectedStatus) {
          throw new Error(`WEBHOOK returned status ${response.status}, expected ${expectedStatus}`)
        }
        log.info({ url: cfg.url, status: response.status, actionType }, 'WEBHOOK completed')
        return { success: true, status: response.status }
      }

      case 'CREATE_CALENDAR_EVENT': {
        const cfg = config as CreateCalendarEventActionConfig
        const bookingId = String(data.bookingId ?? '')
        const userId = cfg.userIdField
          ? String(resolveField(cfg.userIdField, data) ?? data.staffId ?? '')
          : String(data.staffId ?? '')
        await inngest.send({
          name: 'calendar/sync.push',
          data: {
            bookingId,
            userId,
            tenantId: String(data.tenantId ?? ''),
          },
        })
        log.info({ bookingId, userId, actionType }, 'CREATE_CALENDAR_EVENT dispatched')
        return { success: true, bookingId, userId }
      }

      case 'UPDATE_BOOKING_STATUS': {
        const cfg = config as UpdateBookingStatusActionConfig
        const bookingId = String(data.bookingId ?? '')
        const tenantId = String(data.tenantId ?? '')
        if (!bookingId || !tenantId) {
          throw new Error('UPDATE_BOOKING_STATUS requires bookingId and tenantId in context')
        }
        // Dynamic import to avoid circular dependency with booking module
        const { bookingRepository } = await import('@/modules/booking/booking.repository')
        await bookingRepository.updateStatus(tenantId, bookingId, cfg.status)
        log.info({ bookingId, status: cfg.status, actionType }, 'UPDATE_BOOKING_STATUS completed')
        return { success: true, bookingId, newStatus: cfg.status }
      }

      case 'CREATE_TASK': {
        // Stub — no tasks table spec yet
        const cfg = config as CreateTaskActionConfig
        log.info({ title: cfg.title, actionType }, 'CREATE_TASK stub — no tasks table yet')
        return { success: true, stubbed: true, title: cfg.title ?? '' }
      }

      case 'SEND_NOTIFICATION': {
        const cfg = config as SendNotificationActionConfig
        const to = cfg.recipientField
          ? String(resolveField(cfg.recipientField, data) ?? '')
          : ''
        await inngest.send({
          name: 'notification/send.email',
          data: {
            to,
            subject: String(cfg.title ?? 'Notification'),
            html: String(cfg.body ?? ''),
            tenantId: String(data.tenantId ?? ''),
            trigger: 'workflow-notification',
          },
        })
        log.info({ to, title: cfg.title, actionType }, 'SEND_NOTIFICATION dispatched')
        return { success: true, to }
      }

      default: {
        log.warn({ actionType }, 'Unknown action type — skipping')
        return { success: false, error: `Unknown action type: ${actionType}` }
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ actionType, error }, 'Action execution failed')
    return { success: false, error }
  }
}

/**
 * Substitute all {{field}} tokens in all string-valued config fields.
 * Produces a new config object safe for use in executeAction().
 */
export function substituteConfigVariables(
  config: NodeConfig,
  ctx: WorkflowExecutionContext
): NodeConfig {
  if (config == null || typeof config !== 'object') return config

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = substituteVariables(value, ctx)
    } else if (Array.isArray(value)) {
      result[key] = value
    } else if (value !== null && typeof value === 'object') {
      result[key] = substituteConfigVariables(value as NodeConfig, ctx)
    } else {
      result[key] = value
    }
  }
  return result as NodeConfig
}
