/**
 * Calendar-Sync Repository
 *
 * Schema notes (deviations from the original plan spec):
 *
 * 1. `userIntegrations.watchResourceId` - the DB column is `watchResourceId`,
 *    not `resourceId`. UserIntegrationRecord.resourceId maps to this column.
 *
 * 2. `userIntegrations.lastSyncAt` - the DB column is `lastSyncAt`, not
 *    `lastSyncedAt`.
 *
 * 3. `integrationStatus` enum values in the DB are DISCONNECTED | CONNECTED |
 *    ERROR | EXPIRED - not the ACTIVE / REVOKED / PENDING values declared in
 *    UserIntegrationRecord.  All CRUD methods use the actual DB enum values
 *    ('CONNECTED' for active, 'DISCONNECTED' for revoked/disconnected).
 *
 * 4. `userIntegrations` has no `scopes` column in the current DB schema.
 *    The createUserIntegration data.scopes parameter is accepted in the
 *    method signature for forward-compatibility but is NOT persisted until
 *    the schema is updated.
 *
 * 5. `userExternalEvents` has no `bookingId` or `rawData` columns. The
 *    bookingId and raw provider payload are stored in the `metadata` jsonb
 *    column instead.  startTime and endTime are NOT NULL in the DB - callers
 *    must always provide them.
 *
 * 6. `calendarIntegrationProvider` DB enum only contains GOOGLE_CALENDAR and
 *    OUTLOOK_CALENDAR (not APPLE_CALENDAR). CalendarIntegrationProvider type
 *    includes APPLE_CALENDAR for interface completeness; where the value is
 *    passed to Drizzle it is cast to the DB enum union.
 */

import { db } from '@/shared/db'
import { eq, and, lt, isNotNull, desc } from 'drizzle-orm'
import {
  userIntegrations,
  userExternalEvents,
  userIntegrationSyncLogs,
  bookings,
  customers,
  services,
  users,
  tenants,
} from '@/shared/db/schema'
import type { UserIntegrationRecord } from './calendar-sync.types'
import type { BookingForCalendar } from './lib/calendar-event-mapper'
import type { CalendarIntegrationProvider } from './calendar-sync.types'

// The DB enum only has these two values - APPLE_CALENDAR is not in the DB yet.
// Cast CalendarIntegrationProvider to this type when passing to Drizzle.
type DbCalendarProvider = 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR'

export const calendarSyncRepository = {
  /**
   * Find a user's active calendar integration for a given provider.
   */
  async findUserIntegration(
    userId: string,
    tenantId: string,
    provider?: CalendarIntegrationProvider
  ): Promise<UserIntegrationRecord | null> {
    const conditions = [
      eq(userIntegrations.userId, userId),
      eq(userIntegrations.tenantId, tenantId),
    ]
    if (provider) {
      // Cast required: DB enum is GOOGLE_CALENDAR | OUTLOOK_CALENDAR only
      conditions.push(eq(userIntegrations.provider, provider as DbCalendarProvider))
    }

    const rows = await db
      .select()
      .from(userIntegrations)
      .where(and(...conditions))
      .limit(1)

    return rows[0] ? mapIntegrationRow(rows[0]) : null
  },

  /**
   * Find a user integration by its primary key.
   */
  async findUserIntegrationById(id: string): Promise<UserIntegrationRecord | null> {
    const rows = await db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.id, id))
      .limit(1)

    return rows[0] ? mapIntegrationRow(rows[0]) : null
  },

  /**
   * Find a user integration by its watch channel ID (used in webhook handler).
   */
  async findByWatchChannelId(channelId: string): Promise<UserIntegrationRecord | null> {
    const rows = await db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.watchChannelId, channelId))
      .limit(1)

    return rows[0] ? mapIntegrationRow(rows[0]) : null
  },

  /**
   * Create a new user integration record.
   *
   * Note: `data.scopes` is accepted for API compatibility but the current
   * DB schema does not have a `scopes` column - it is not persisted.
   */
  async createUserIntegration(data: {
    userId: string
    tenantId: string
    provider: CalendarIntegrationProvider
    encryptedAccessToken: string
    encryptedRefreshToken: string
    tokenExpiresAt: Date
    scopes: string[]
    providerAccountId?: string
    calendarId?: string
  }): Promise<UserIntegrationRecord> {
    const rows = await db
      .insert(userIntegrations)
      .values({
        id: crypto.randomUUID(),
        userId: data.userId,
        tenantId: data.tenantId,
        // Cast required: DB enum is GOOGLE_CALENDAR | OUTLOOK_CALENDAR only
        provider: data.provider as DbCalendarProvider,
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        // DB enum uses CONNECTED rather than ACTIVE
        status: 'CONNECTED',
        providerAccountId: data.providerAccountId ?? null,
        calendarId: data.calendarId ?? null,
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    if (!rows[0]) {
      throw new Error('Failed to create user integration: no row returned')
    }

    return mapIntegrationRow(rows[0])
  },

  /**
   * Update tokens after a successful refresh.
   */
  async updateTokens(
    integrationId: string,
    data: {
      encryptedAccessToken: string
      encryptedRefreshToken: string
      tokenExpiresAt: Date
    }
  ): Promise<void> {
    await db
      .update(userIntegrations)
      .set({
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        // DB enum: CONNECTED rather than ACTIVE
        status: 'CONNECTED',
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integrationId))
  },

  /**
   * Update watch channel info after registering a push notification channel.
   * Note: the DB column is `watchResourceId`, not `resourceId`.
   */
  async updateWatchChannel(
    integrationId: string,
    data: {
      watchChannelId: string
      watchChannelToken: string
      watchChannelExpiration: Date
      resourceId: string
    }
  ): Promise<void> {
    await db
      .update(userIntegrations)
      .set({
        watchChannelId: data.watchChannelId,
        watchChannelToken: data.watchChannelToken,
        watchChannelExpiration: data.watchChannelExpiration,
        // DB column is watchResourceId - maps to UserIntegrationRecord.resourceId
        watchResourceId: data.resourceId,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integrationId))
  },

  /**
   * Update the sync token after a successful incremental sync.
   * Note: the DB column is `lastSyncAt`, not `lastSyncedAt`.
   */
  async updateSyncToken(integrationId: string, syncToken: string): Promise<void> {
    await db
      .update(userIntegrations)
      .set({
        syncToken,
        // DB column is lastSyncAt (not lastSyncedAt)
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integrationId))
  },

  /**
   * Mark an integration as errored.
   */
  async markIntegrationError(integrationId: string): Promise<void> {
    await db
      .update(userIntegrations)
      .set({ status: 'ERROR', updatedAt: new Date() })
      .where(eq(userIntegrations.id, integrationId))
  },

  /**
   * Mark an integration as disconnected / revoked.
   * DB enum uses DISCONNECTED (not REVOKED).
   */
  async markIntegrationRevoked(integrationId: string): Promise<void> {
    await db
      .update(userIntegrations)
      .set({
        // DB enum: DISCONNECTED rather than REVOKED
        status: 'DISCONNECTED',
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        watchChannelId: null,
        watchChannelToken: null,
        syncToken: null,
        disconnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integrationId))
  },

  /**
   * Find integrations with watch channels expiring soon (for renewal cron).
   * DB enum: CONNECTED rather than ACTIVE.
   */
  async findExpiringWatchChannels(expiringBefore: Date): Promise<UserIntegrationRecord[]> {
    const rows = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.status, 'CONNECTED'),
          isNotNull(userIntegrations.watchChannelId),
          lt(userIntegrations.watchChannelExpiration, expiringBefore)
        )
      )

    return rows.map(mapIntegrationRow)
  },

  /**
   * Find integrations with tokens expiring soon (for refresh cron).
   * DB enum: CONNECTED rather than ACTIVE.
   */
  async findExpiringTokens(expiringBefore: Date): Promise<UserIntegrationRecord[]> {
    const rows = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.status, 'CONNECTED'),
          isNotNull(userIntegrations.encryptedRefreshToken),
          lt(userIntegrations.tokenExpiresAt, expiringBefore)
        )
      )

    return rows.map(mapIntegrationRow)
  },

  /**
   * Upsert an external calendar event including all required NOT NULL columns.
   *
   * Note: `userExternalEvents` has no `bookingId` or `rawData` columns.
   * Both are stored in the `metadata` jsonb column.
   * `summary`, `startTime`, and `endTime` are NOT NULL in the DB schema.
   *
   * Note: the DB calendarIntegrationProvider enum only has
   * GOOGLE_CALENDAR | OUTLOOK_CALENDAR - provider is cast accordingly.
   */
  async upsertExternalEvent(data: {
    tenantId: string
    userId: string
    userIntegrationId: string
    externalEventId: string
    provider: CalendarIntegrationProvider
    bookingId?: string
    summary?: string
    startTime: Date
    endTime: Date
    isAllDay: boolean
    rawData?: Record<string, unknown>
  }): Promise<void> {
    const metadata: Record<string, unknown> = {}
    if (data.bookingId) metadata['bookingId'] = data.bookingId
    if (data.rawData) metadata['raw'] = data.rawData
    const metadataValue = Object.keys(metadata).length > 0 ? metadata : null

    await db
      .insert(userExternalEvents)
      .values({
        id: crypto.randomUUID(),
        tenantId: data.tenantId,
        userId: data.userId,
        userIntegrationId: data.userIntegrationId,
        externalEventId: data.externalEventId,
        // Cast required: DB enum is GOOGLE_CALENDAR | OUTLOOK_CALENDAR only
        provider: data.provider as DbCalendarProvider,
        summary: data.summary ?? '',
        startTime: data.startTime,
        endTime: data.endTime,
        isAllDay: data.isAllDay,
        metadata: metadataValue,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userExternalEvents.userIntegrationId, userExternalEvents.externalEventId],
        set: {
          summary: data.summary ?? '',
          startTime: data.startTime,
          endTime: data.endTime,
          isAllDay: data.isAllDay,
          metadata: metadataValue,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      })
  },

  /**
   * Delete an external event by its external ID (when provider reports it deleted).
   */
  async deleteExternalEvent(userIntegrationId: string, externalEventId: string): Promise<void> {
    await db
      .delete(userExternalEvents)
      .where(
        and(
          eq(userExternalEvents.userIntegrationId, userIntegrationId),
          eq(userExternalEvents.externalEventId, externalEventId)
        )
      )
  },

  /**
   * Load a booking with all relations needed for calendar event creation.
   *
   * Note: the DB column for the assigned staff is `staffId` (not
   * `assignedStaffId`). The JOIN uses `bookings.staffId`.
   */
  async loadBookingForCalendar(bookingId: string): Promise<BookingForCalendar | null> {
    const rows = await db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        durationMinutes: bookings.durationMinutes,
        locationType: bookings.locationType,
        locationAddress: bookings.locationAddress,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        serviceName: services.name,
        staffFirstName: users.firstName,
        staffLastName: users.lastName,
        tenantName: tenants.name,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      // DB column: bookings.staffId (not assignedStaffId)
      .leftJoin(users, eq(bookings.staffId, users.id))
      .leftJoin(tenants, eq(bookings.tenantId, tenants.id))
      .where(eq(bookings.id, bookingId))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    return {
      id: row.id,
      bookingNumber: row.bookingNumber,
      scheduledDate: row.scheduledDate,
      scheduledTime: row.scheduledTime,
      durationMinutes: row.durationMinutes,
      locationType: row.locationType,
      locationAddress: row.locationAddress as Record<string, unknown> | null,
      customer: row.customerFirstName
        ? {
            firstName: row.customerFirstName,
            lastName: row.customerLastName ?? '',
            email: row.customerEmail ?? null,
          }
        : null,
      service: row.serviceName ? { name: row.serviceName } : null,
      staff: row.staffFirstName
        ? {
            firstName: row.staffFirstName,
            lastName: row.staffLastName ?? '',
          }
        : null,
      tenant: row.tenantName ? { name: row.tenantName } : null,
    }
  },

  /**
   * Find the most recent successful BOOKING_PUSH sync log for a booking.
   * Used by cancelBookingFromCalendar to look up the external calendar event ID.
   */
  async findSyncLogByBooking(
    bookingId: string,
    userIntegrationId: string
  ): Promise<{ externalId: string | null } | null> {
    const [row] = await db
      .select({ externalId: userIntegrationSyncLogs.externalId })
      .from(userIntegrationSyncLogs)
      .where(
        and(
          eq(userIntegrationSyncLogs.userIntegrationId, userIntegrationId),
          eq(userIntegrationSyncLogs.entityId, bookingId),
          eq(userIntegrationSyncLogs.syncType, 'BOOKING_PUSH'),
          eq(userIntegrationSyncLogs.status, 'SUCCESS')
        )
      )
      .orderBy(desc(userIntegrationSyncLogs.startedAt))
      .limit(1)

    return row ?? null
  },
}

// ─── Row Mapper ───────────────────────────────────────────────────────────────

/**
 * Map a raw DB row from `userIntegrations` to a `UserIntegrationRecord`.
 *
 * Key mappings:
 *   DB `watchResourceId`  → record `resourceId`
 *   DB `lastSyncAt`       → record `lastSyncedAt`
 *   DB status enum (CONNECTED | DISCONNECTED | ERROR | EXPIRED) is cast to
 *     UserIntegrationRecord.status - service layer must use DB enum values.
 */
function mapIntegrationRow(
  row: typeof userIntegrations.$inferSelect
): UserIntegrationRecord {
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    provider: row.provider as CalendarIntegrationProvider,
    providerAccountId: row.providerAccountId ?? null,
    encryptedAccessToken: row.encryptedAccessToken ?? null,
    encryptedRefreshToken: row.encryptedRefreshToken ?? null,
    tokenExpiresAt: row.tokenExpiresAt ?? null,
    // scopes: not present in DB schema - return empty array
    scopes: [],
    // DB enum values differ from UserIntegrationRecord.status type -
    // cast to satisfy the interface (service layer must use DB enum values)
    status: row.status as UserIntegrationRecord['status'],
    calendarId: row.calendarId ?? null,
    watchChannelId: row.watchChannelId ?? null,
    watchChannelToken: row.watchChannelToken ?? null,
    watchChannelExpiration: row.watchChannelExpiration ?? null,
    // DB column is watchResourceId - mapped to resourceId on the record type
    resourceId: row.watchResourceId ?? null,
    syncToken: row.syncToken ?? null,
    // DB column is lastSyncAt - mapped to lastSyncedAt on the record type
    lastSyncedAt: row.lastSyncAt ?? null,
    metadata: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
