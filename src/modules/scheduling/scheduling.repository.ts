import { db } from "@/shared/db";
import {
  availableSlots,
  bookings,
  users,
  userIntegrations,
  userExternalEvents,
  userAvailability,
  sentMessages,
  messageTemplates,
} from "@/shared/db/schema";
import {
  eq,
  and,
  gte,
  lte,
  or,
  isNull,
  isNotNull,
  sql,
} from "drizzle-orm";
import type { SlotListFilters } from "./scheduling.types";

export type { SlotListFilters };

// --------------- Input Types ---------------

export interface SlotCreateInput {
  date: Date;
  time: string;
  endTime?: string;
  staffIds: string[];
  serviceIds: string[];
  venueId?: string;
  capacity: number;
  requiresApproval: boolean;
  estimatedLocation?: string;
  previousSlotId?: string;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
}

export interface SlotUpdateInput extends Partial<SlotCreateInput> {
  available?: boolean;
}

// ===============================================================
// SCHEDULING REPOSITORY
// ===============================================================

export const schedulingRepository = {

  // ---------------------------------------------------------------
  // Slot CRUD
  // ---------------------------------------------------------------

  async createSlot(
    tenantId: string,
    input: SlotCreateInput,
  ): Promise<typeof availableSlots.$inferSelect> {
    const rows = await db
      .insert(availableSlots)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        date: input.date,
        time: input.time,
        endTime: input.endTime ?? null,
        staffIds: input.staffIds,
        serviceIds: input.serviceIds,
        venueId: input.venueId ?? null,
        capacity: input.capacity,
        requiresApproval: input.requiresApproval,
        estimatedLocation: input.estimatedLocation ?? null,
        previousSlotId: input.previousSlotId ?? null,
        metadata: input.metadata ?? null,
        sortOrder: input.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .returning();

    const row = rows[0];
    if (!row) throw new Error("Failed to create slot");
    return row;
  },

  async createManySlots(
    tenantId: string,
    slots: SlotCreateInput[],
  ): Promise<Array<typeof availableSlots.$inferSelect>> {
    if (slots.length === 0) return [];

    const rows = await db
      .insert(availableSlots)
      .values(
        slots.map((input) => ({
          id: crypto.randomUUID(),
          tenantId,
          date: input.date,
          time: input.time,
          endTime: input.endTime ?? null,
          staffIds: input.staffIds,
          serviceIds: input.serviceIds,
          venueId: input.venueId ?? null,
          capacity: input.capacity,
          requiresApproval: input.requiresApproval,
          estimatedLocation: input.estimatedLocation ?? null,
          previousSlotId: input.previousSlotId ?? null,
          metadata: input.metadata ?? null,
          sortOrder: input.sortOrder ?? 0,
          updatedAt: new Date(),
        })),
      )
      .returning();

    return rows;
  },

  async updateSlot(
    tenantId: string,
    slotId: string,
    input: SlotUpdateInput,
  ): Promise<typeof availableSlots.$inferSelect> {
    const updateValues: Partial<typeof availableSlots.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.date !== undefined) updateValues.date = input.date;
    if (input.time !== undefined) updateValues.time = input.time;
    if (input.endTime !== undefined) updateValues.endTime = input.endTime;
    if (input.staffIds !== undefined) updateValues.staffIds = input.staffIds;
    if (input.serviceIds !== undefined) updateValues.serviceIds = input.serviceIds;
    if (input.venueId !== undefined) updateValues.venueId = input.venueId;
    if (input.capacity !== undefined) updateValues.capacity = input.capacity;
    if (input.requiresApproval !== undefined) updateValues.requiresApproval = input.requiresApproval;
    if (input.estimatedLocation !== undefined) updateValues.estimatedLocation = input.estimatedLocation;
    if (input.previousSlotId !== undefined) updateValues.previousSlotId = input.previousSlotId;
    if (input.metadata !== undefined) updateValues.metadata = input.metadata;
    if (input.sortOrder !== undefined) updateValues.sortOrder = input.sortOrder;
    if (input.available !== undefined) updateValues.available = input.available;

    const rows = await db
      .update(availableSlots)
      .set(updateValues)
      .where(and(eq(availableSlots.id, slotId), eq(availableSlots.tenantId, tenantId)))
      .returning();

    const row = rows[0];
    if (!row) throw new Error(`Slot not found: ${slotId}`);
    return row;
  },

  async deleteSlot(tenantId: string, slotId: string): Promise<void> {
    await db
      .delete(availableSlots)
      .where(and(eq(availableSlots.id, slotId), eq(availableSlots.tenantId, tenantId)));
  },

  async findSlotById(
    tenantId: string,
    slotId: string,
  ): Promise<typeof availableSlots.$inferSelect | undefined> {
    const rows = await db
      .select()
      .from(availableSlots)
      .where(and(eq(availableSlots.id, slotId), eq(availableSlots.tenantId, tenantId)))
      .limit(1);

    return rows[0];
  },

  async listSlots(
    tenantId: string,
    filters: SlotListFilters,
  ): Promise<Array<typeof availableSlots.$inferSelect>> {
    const conditions = [
      eq(availableSlots.tenantId, tenantId),
      gte(availableSlots.date, filters.startDate),
      lte(availableSlots.date, filters.endDate),
    ];

    if (!filters.includeUnavailable) {
      conditions.push(eq(availableSlots.available, true));
    }

    if (filters.venueId) {
      conditions.push(eq(availableSlots.venueId, filters.venueId));
    }

    // For array column filtering, use PostgreSQL @> (contains) operator
    if (filters.staffId) {
      conditions.push(
        sql`${availableSlots.staffIds} @> ARRAY[${sql.raw(`'${filters.staffId}'`)}]::uuid[]`,
      );
    }

    if (filters.serviceId) {
      conditions.push(
        sql`${availableSlots.serviceIds} @> ARRAY[${sql.raw(`'${filters.serviceId}'`)}]::uuid[]`,
      );
    }

    return db
      .select()
      .from(availableSlots)
      .where(and(...conditions))
      .orderBy(availableSlots.date, availableSlots.time, availableSlots.sortOrder);
  },

  // ---------------------------------------------------------------
  // Availability queries
  // ---------------------------------------------------------------

  async getStaffBookingsForDate(
    tenantId: string,
    userId: string,
    date: Date,
  ): Promise<Array<typeof bookings.$inferSelect>> {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.staffId, userId),
          eq(bookings.scheduledDate, date),
          // Exclude terminal statuses
          sql`${bookings.status} NOT IN ('CANCELLED', 'REJECTED')`,
        ),
      )
      .orderBy(bookings.scheduledTime);
  },

  async getUserAvailabilityWindows(
    _tenantId: string,
    userId: string,
    date: Date,
  ): Promise<Array<typeof userAvailability.$inferSelect>> {
    // userAvailability has no tenantId column — queried by userId only
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    return db
      .select()
      .from(userAvailability)
      .where(
        and(
          eq(userAvailability.userId, userId),
          or(
            // Recurring windows that apply on this day of week
            and(
              eq(userAvailability.type, "RECURRING"),
              eq(userAvailability.dayOfWeek, dayOfWeek),
            ),
            // Specific date windows
            and(
              eq(userAvailability.type, "SPECIFIC"),
              eq(userAvailability.specificDate, date),
            ),
            // Blocked periods on this specific date
            and(
              eq(userAvailability.type, "BLOCKED"),
              eq(userAvailability.specificDate, date),
            ),
          ),
        ),
      );
  },

  async getExternalEventsForUser(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<typeof userExternalEvents.$inferSelect>> {
    return db
      .select()
      .from(userExternalEvents)
      .where(
        and(
          eq(userExternalEvents.tenantId, tenantId),
          eq(userExternalEvents.userId, userId),
          eq(userExternalEvents.blocksAvailability, true),
          isNull(userExternalEvents.deletedAt),
          // Overlap: event starts before endDate AND event ends after startDate
          lte(userExternalEvents.startTime, endDate),
          gte(userExternalEvents.endTime, startDate),
        ),
      )
      .orderBy(userExternalEvents.startTime);
  },

  // ---------------------------------------------------------------
  // Reminder queries
  // ---------------------------------------------------------------

  // Cross-tenant: intentionally queries all tenants to find upcoming bookings
  async findBookingsNeedingReminders(
    hoursAhead: number,
    windowMinutes: number,
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      scheduledDate: Date;
      scheduledTime: string;
      bookedCount: number;
    }>
  > {
    // Calculate the target time window: (now + hoursAhead) ± windowMinutes
    const targetMs = Date.now() + hoursAhead * 60 * 60 * 1000;
    const windowStart = new Date(targetMs - windowMinutes * 60 * 1000);
    const windowEnd = new Date(targetMs + windowMinutes * 60 * 1000);

    // Derive the date boundaries from the window
    const windowStartDate = new Date(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      windowStart.getDate(),
    );
    const windowEndDate = new Date(
      windowEnd.getFullYear(),
      windowEnd.getMonth(),
      windowEnd.getDate(),
    );

    // Use a raw SQL expression to combine scheduledDate + scheduledTime into a timestamp
    // and compare against the target window
    const rows = await db
      .select({
        id: bookings.id,
        tenantId: bookings.tenantId,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "CONFIRMED"),
          gte(bookings.scheduledDate, windowStartDate),
          lte(bookings.scheduledDate, windowEndDate),
          // Combine date + time into a timestamptz and check it falls in the window
          sql`(${bookings.scheduledDate}::date + ${bookings.scheduledTime}::time)::timestamptz >= ${windowStart}`,
          sql`(${bookings.scheduledDate}::date + ${bookings.scheduledTime}::time)::timestamptz <= ${windowEnd}`,
        ),
      );

    return rows.map((row) => ({
      ...row,
      bookedCount: 1, // Each row represents a single booking
    }));
  },

  async hasReminderBeenSent(
    bookingId: string,
    reminderType: "24h" | "2h",
  ): Promise<boolean> {
    // sentMessages has no trigger column; the trigger is on messageTemplates.
    // Map reminderType to the messageTrigger enum value.
    const triggerValue =
      reminderType === "24h" ? "BOOKING_REMINDER_24H" : "BOOKING_REMINDER_2H";

    const rows = await db
      .select({ id: sentMessages.id })
      .from(sentMessages)
      .innerJoin(messageTemplates, eq(sentMessages.templateId, messageTemplates.id))
      .where(
        and(
          eq(sentMessages.bookingId, bookingId),
          eq(messageTemplates.trigger, triggerValue),
        ),
      )
      .limit(1);

    return rows.length > 0;
  },

  // ---------------------------------------------------------------
  // Calendar sync queries
  // ---------------------------------------------------------------

  async findUsersWithActiveCalendarIntegration(
    tenantId?: string,
  ): Promise<Array<{ id: string; email: string }>> {
    const conditions = [
      eq(userIntegrations.provider, "GOOGLE_CALENDAR"),
      eq(userIntegrations.status, "CONNECTED"),
      eq(userIntegrations.syncEnabled, true),
    ];

    if (tenantId) {
      conditions.push(eq(userIntegrations.tenantId, tenantId));
    }
    // Cross-tenant when tenantId is undefined

    return db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(userIntegrations)
      .innerJoin(users, eq(userIntegrations.userId, users.id))
      .where(and(...conditions));
  },

  async findRecentlyUpdatedBookings(
    sinceMinutes: number,
    tenantId?: string,
  ): Promise<Array<typeof bookings.$inferSelect>> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

    const conditions = [gte(bookings.updatedAt, since)];

    if (tenantId) {
      conditions.push(eq(bookings.tenantId, tenantId));
    }
    // Cross-tenant when tenantId is undefined

    return db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(bookings.updatedAt);
  },

  async findExpiringTokens(
    withinMinutes: number,
  ): Promise<
    Array<{ id: string; userId: string; encryptedAccessToken: string | null }>
  > {
    // Cross-tenant: token expiry is checked across all tenants
    const expiryThreshold = new Date(Date.now() + withinMinutes * 60 * 1000);

    return db
      .select({
        id: userIntegrations.id,
        userId: userIntegrations.userId,
        encryptedAccessToken: userIntegrations.encryptedAccessToken,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.status, "CONNECTED"),
          isNotNull(userIntegrations.tokenExpiresAt),
          lte(userIntegrations.tokenExpiresAt, expiryThreshold),
        ),
      );
  },

  async findExpiringWatchChannels(
    withinHours: number,
  ): Promise<Array<{ id: string; userId: string }>> {
    // Cross-tenant: watch channel expiry checked across all tenants
    // Column: userIntegrations.watchChannelExpiration (not watchChannelExpiresAt)
    const expiryThreshold = new Date(Date.now() + withinHours * 60 * 60 * 1000);

    return db
      .select({
        id: userIntegrations.id,
        userId: userIntegrations.userId,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.status, "CONNECTED"),
          isNotNull(userIntegrations.watchChannelExpiration),
          lte(userIntegrations.watchChannelExpiration, expiryThreshold),
        ),
      );
  },
};
