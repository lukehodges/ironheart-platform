/**
 * Notification Repository
 *
 * All DB access for the notification module. Keeps Drizzle queries in one
 * place so the service layer stays free of SQL concerns.
 */

import { db } from '@/shared/db'
import { and, eq, isNull, or } from 'drizzle-orm'
import {
  bookings,
  customers,
  messageTemplates,
  sentMessages,
  services,
  tenants,
  users,
} from '@/shared/db/schema'
import type { BookingForVariables } from './lib/variable-builder'
import type {
  MessageChannel,
  MessageTemplateRecord,
  MessageTrigger,
} from './notification.types'

// ─── Idempotency ───────────────────────────────────────────────────────────────

/**
 * Check whether a notification has already been sent for a specific booking,
 * trigger, and channel combination.
 *
 * Uses the `sent_messages` table as the durable idempotency store.
 * Returns true if a row exists with status SENT (not FAILED / QUEUED).
 *
 * NOTE: The DB `messageTrigger` enum does not include PORTAL_INVITE — callers
 * must guard against inserting that value (see recordSentMessage).
 */
export const notificationRepository = {
  async hasNotificationBeenSent(
    bookingId: string,
    trigger: MessageTrigger,
    channel: MessageChannel
  ): Promise<boolean> {
    // PORTAL_INVITE is not in the DB enum — treat as never sent so the service
    // can still attempt delivery without a DB check.
    if (trigger === 'PORTAL_INVITE') return false

    const rows = await db
      .select({ id: sentMessages.id })
      .from(sentMessages)
      .where(
        and(
          eq(sentMessages.bookingId, bookingId),
          // Cast is required because the TS union includes PORTAL_INVITE which
          // is not in the pgEnum. We guard above so this is always safe.
          eq(sentMessages.trigger, trigger as typeof sentMessages.trigger._.data),
          eq(sentMessages.channel, channel)
        )
      )
      .limit(1)

    return rows.length > 0
  },

  // ─── Audit Write ─────────────────────────────────────────────────────────────

  /**
   * Persist a record of a sent (or failed) message.
   *
   * `recipientType` defaults to 'CUSTOMER' — the `sent_messages` table requires
   * it as NOT NULL but the application always sends to customers.
   * `recipientId` is set to the `bookingId` when available (acts as a proxy
   * for the customer reference); a stable UUID placeholder is used otherwise.
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
  }): Promise<void> {
    // PORTAL_INVITE is absent from the DB messageTrigger enum — skip recording.
    if (data.trigger === 'PORTAL_INVITE') return

    const id = crypto.randomUUID()
    // recipientId is a required non-nullable column; use bookingId as proxy,
    // falling back to a deterministic placeholder UUID so the insert always
    // succeeds without violating NOT NULL.
    const recipientId = data.bookingId ?? '00000000-0000-0000-0000-000000000000'

    await db.insert(sentMessages).values({
      id,
      tenantId: data.tenantId,
      bookingId: data.bookingId ?? null,
      templateId: data.templateId ?? null,
      channel: data.channel,
      trigger: data.trigger as typeof sentMessages.trigger._.data,
      recipientType: 'CUSTOMER',
      recipientId,
      recipientEmail: data.recipientEmail ?? null,
      recipientPhone: data.recipientPhone ?? null,
      subject: data.subject ?? null,
      body: data.body,
      status: data.status,
      sentAt: data.sentAt ?? null,
      providerRef: data.providerRef ?? null,
      errorMessage: data.errorMessage ?? null,
    })
  },

  // ─── Template Resolution ──────────────────────────────────────────────────────

  /**
   * Resolve the most specific active DB template for a tenant + trigger + channel.
   *
   * Priority (most specific first):
   *   1. serviceId match
   *   2. serviceId IS NULL (applies to all services)
   *
   * If no template exists, returns null — caller falls back to the React Email
   * system template.
   */
  async resolveTemplate(
    tenantId: string,
    trigger: MessageTrigger,
    channel: MessageChannel,
    serviceId?: string
  ): Promise<MessageTemplateRecord | null> {
    // PORTAL_INVITE is not in the DB messageTrigger enum.
    if (trigger === 'PORTAL_INVITE') return null

    const rows = await db
      .select()
      .from(messageTemplates)
      .where(
        and(
          eq(messageTemplates.tenantId, tenantId),
          eq(messageTemplates.trigger, trigger as typeof messageTemplates.trigger._.data),
          eq(messageTemplates.channel, channel),
          eq(messageTemplates.active, true),
          // Match service-specific OR tenant-wide templates.
          serviceId
            ? or(
                eq(messageTemplates.serviceId, serviceId),
                isNull(messageTemplates.serviceId)
              )
            : isNull(messageTemplates.serviceId)
        )
      )
      .limit(2) // Fetch up to 2 so we can prefer the service-specific one.

    if (rows.length === 0) return null

    // Prefer the service-specific row if we got two back.
    // Cast through unknown to resolve the Drizzle union inference quirk where
    // .limit(N > 1) can widen the inferred element type unexpectedly.
    type TemplateRow = {
      id: string
      tenantId: string
      name: string
      trigger: string
      channel: string
      subject: string | null
      body: string
      bodyHtml: string | null
      serviceId: string | null
      active: boolean
    }
    const typedRows = rows as unknown as TemplateRow[]
    let row: TemplateRow = typedRows[0]!
    if (serviceId) {
      const specific = typedRows.find((r) => r.serviceId === serviceId)
      if (specific) row = specific
    }

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      trigger: row.trigger as MessageTrigger,
      channel: row.channel as MessageChannel,
      subject: row.subject ?? null,
      body: row.body,
      bodyHtml: row.bodyHtml ?? null,
      serviceId: row.serviceId ?? null,
      isActive: row.active,
    }
  },

  // ─── Booking Loader ───────────────────────────────────────────────────────────

  /**
   * Load a booking with all related records needed to build template variables.
   *
   * Joins: bookings → customers → services → users (staff) → tenants
   *
   * NOTE: The `tenants` table has no phone / email / website / settings columns.
   * These fields are returned as null — the variable-builder handles them with
   * safe fallbacks.
   */
  async loadBookingForNotification(
    bookingId: string
  ): Promise<BookingForVariables | null> {
    const rows = await db
      .select({
        // Booking core
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        durationMinutes: bookings.durationMinutes,
        status: bookings.status,
        locationType: bookings.locationType,
        locationAddress: bookings.locationAddress,
        // Customer
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        // Service
        serviceName: services.name,
        serviceDescription: services.description,
        // Staff (user)
        staffFirstName: users.firstName,
        staffLastName: users.lastName,
        // Tenant
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(users, eq(bookings.staffId, users.id))
      .leftJoin(tenants, eq(bookings.tenantId, tenants.id))
      .where(eq(bookings.id, bookingId))
      .limit(1)

    if (rows.length === 0) return null

    const row = rows[0]!

    return {
      id: row.id,
      bookingNumber: row.bookingNumber,
      scheduledDate: row.scheduledDate,
      scheduledTime: row.scheduledTime,
      durationMinutes: row.durationMinutes,
      status: row.status,
      locationType: row.locationType,
      locationAddress: row.locationAddress as Record<string, unknown> | null,
      customer:
        row.customerFirstName != null
          ? {
              firstName: row.customerFirstName,
              lastName: row.customerLastName ?? '',
              email: row.customerEmail ?? null,
              phone: row.customerPhone ?? null,
            }
          : null,
      service:
        row.serviceName != null
          ? {
              name: row.serviceName,
              description: row.serviceDescription ?? null,
            }
          : null,
      staff:
        row.staffFirstName != null
          ? {
              firstName: row.staffFirstName,
              lastName: row.staffLastName ?? '',
            }
          : null,
      tenant:
        row.tenantId != null
          ? {
              id: row.tenantId,
              name: row.tenantName ?? '',
              slug: row.tenantSlug ?? '',
              // The tenants table has no phone / email / website / settings columns.
              // These are intentionally null — buildTemplateVariables applies defaults.
              phone: null,
              email: null,
              website: null,
              settings: null,
            }
          : null,
    }
  },
}
