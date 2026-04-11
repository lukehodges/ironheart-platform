// src/modules/integrations/integrations.repository.ts
import { db } from '@/shared/db'
import { jobs, userIntegrations } from '@/shared/db/schema'
import { and, eq } from 'drizzle-orm'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'integrations.repository' })

/**
 * A minimal record from user_integrations — just what the hub needs for routing.
 */
export interface ConnectedIntegrationRecord {
  id: string
  userId: string
  /** DB enum value e.g. 'GOOGLE_CALENDAR' */
  provider: string
  status: string
  createdAt?: Date | null
}

export const integrationsRepository = {
  /**
   * Find all CONNECTED user_integrations rows for a given user and tenant,
   * optionally filtered by provider DB enum value (e.g. 'GOOGLE_CALENDAR').
   */
  async findConnectedIntegrationsForUser(
    userId: string,
    tenantId: string,
    providerDbValue?: string
  ): Promise<ConnectedIntegrationRecord[]> {
    const conditions = [
      eq(userIntegrations.userId, userId),
      eq(userIntegrations.tenantId, tenantId),
      eq(userIntegrations.status, 'CONNECTED'),
    ]

    if (providerDbValue) {
      conditions.push(eq(userIntegrations.provider, providerDbValue as 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR'))
    }

    return db
      .select({
        id: userIntegrations.id,
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        status: userIntegrations.status,
        createdAt: userIntegrations.createdAt,
      })
      .from(userIntegrations)
      .where(and(...conditions))
  },

  /**
   * Find all user_integrations rows that are CONNECTED for the staff member
   * assigned to the given booking.
   *
   * Only looks at jobs.staffId (primary staff). For multi-staff bookings,
   * extend this to join booking_assignments when needed.
   */
  async findConnectedUsersForBooking(
    bookingId: string,
    tenantId: string
  ): Promise<ConnectedIntegrationRecord[]> {
    // Step 1: get the booking's staffId
    const [booking] = await db
      .select({ staffId: jobs.staffId })
      .from(jobs)
      .where(and(eq(jobs.id, bookingId), eq(jobs.tenantId, tenantId)))
      .limit(1)

    if (!booking?.staffId) {
      log.info({ bookingId }, 'No staffId on booking — skipping integration routing')
      return []
    }

    // Step 2: find all CONNECTED integrations for that staff member
    return db
      .select({
        id: userIntegrations.id,
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        status: userIntegrations.status,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, booking.staffId),
          eq(userIntegrations.tenantId, tenantId),
          eq(userIntegrations.status, 'CONNECTED')
        )
      )
  },
}
