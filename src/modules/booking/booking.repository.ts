import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { ConflictError, NotFoundError } from "@/shared/errors";
import {
  bookings,
  bookingStatusHistory,
  bookingAssignments,
  availableSlots,
  customers,
  services,
  venues,
  users,
  tenants,
} from "@/shared/db/schema";
import { eq, and, or, gte, lte, isNull, inArray, sql, desc, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { BookingStatus, CreateBookingInput, UpdateBookingInput, LocationAddress } from "./booking.types";

const log = logger.child({ module: "booking.repository" });

// --------------- Helper types ---------------

interface ListFilters {
  status?: BookingStatus;
  staffId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  cursor?: string;
}

interface StatusMeta {
  reason?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  approvedById?: string;
  rejectionReason?: string;
  changedById?: string;
}

// --------------- Booking number generator ---------------

async function generateBookingNumber(tenantId: string): Promise<string> {
  const lastBooking = await db
    .select({ bookingNumber: bookings.bookingNumber })
    .from(bookings)
    .where(eq(bookings.tenantId, tenantId))
    .orderBy(desc(bookings.createdAt))
    .limit(1);

  const year = new Date().getFullYear();
  let nextNumber = 1;
  if (lastBooking[0]?.bookingNumber) {
    const match = lastBooking[0].bookingNumber.match(/BK-\d+-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `BK-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// --------------- Calculate end time ---------------

function calculateEndTime(scheduledTime: string, durationMinutes: number): string {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const totalMinutes = (hours ?? 0) * 60 + (minutes ?? 0) + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
}

// ===============================================================
// BOOKING REPOSITORY
// ===============================================================

export const bookingRepository = {

  // ---- READ ----

  async findById(tenantId: string, bookingId: string) {
    const result = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async findByIdPublic(bookingId: string) {
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    return result[0] ?? null;
  },

  async findCustomerEmailForBooking(bookingId: string): Promise<string | null> {
    const result = await db
      .select({ email: customers.email })
      .from(bookings)
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    return result[0]?.email ?? null;
  },

  async list(tenantId: string, filters: ListFilters, userId?: string) {
    const limit = filters.limit ?? 50;
    const conditions = [eq(bookings.tenantId, tenantId)];

    if (filters.status) conditions.push(eq(bookings.status, filters.status));
    if (filters.staffId) conditions.push(eq(bookings.staffId, filters.staffId));
    if (filters.customerId) conditions.push(eq(bookings.customerId, filters.customerId));
    if (filters.startDate) conditions.push(gte(bookings.scheduledDate, filters.startDate));
    if (filters.endDate) conditions.push(lte(bookings.scheduledDate, filters.endDate));
    if (filters.cursor) conditions.push(lte(bookings.createdAt, new Date(filters.cursor)));

    // RBAC: MEMBER users see only bookings they're assigned to
    if (userId) {
      // Get booking IDs assigned to this user via bookingAssignments
      const assignedIds = await db
        .select({ jobId: bookingAssignments.jobId })
        .from(bookingAssignments)
        .where(eq(bookingAssignments.userId, userId));
      const assignedBookingIds = assignedIds.map((a) => a.jobId);

      const rbacCondition = assignedBookingIds.length > 0
        ? or(eq(bookings.staffId, userId), inArray(bookings.id, assignedBookingIds))
        : eq(bookings.staffId, userId);
      conditions.push(rbacCondition!);
    }

    // Alias the users table for the staff LEFT JOIN (since users is already
    // imported and could collide if used directly in two different joins)
    const staffUsers = alias(users, "staffUsers");

    const rows = await db
      .select({
        // All booking columns
        booking: bookings,
        // Enriched name / avatar fields from joined tables
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        serviceName: services.name,
        staffDisplayName: staffUsers.displayName,
        staffFirstName: staffUsers.firstName,
        staffLastName: staffUsers.lastName,
        staffAvatarUrl: staffUsers.avatarUrl,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(staffUsers, eq(bookings.staffId, staffUsers.id))
      .where(and(...conditions))
      .orderBy(desc(bookings.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    // Flatten each row: spread the booking columns and append the enriched fields
    const enrichedRows = sliced.map((r) => ({
      ...r.booking,
      customerName: r.customerFirstName && r.customerLastName
        ? `${r.customerFirstName} ${r.customerLastName}`
        : r.customerFirstName ?? r.customerLastName ?? null,
      serviceName: r.serviceName ?? null,
      staffName: r.staffDisplayName ?? (r.staffFirstName && r.staffLastName
        ? `${r.staffFirstName} ${r.staffLastName}`.trim()
        : r.staffFirstName ?? r.staffLastName ?? null),
      staffAvatarUrl: r.staffAvatarUrl ?? null,
    }));

    return { rows: enrichedRows, hasMore };
  },

  async listForCalendar(tenantId: string, startDate: Date, endDate: Date, staffId?: string) {
    const conditions = [
      eq(bookings.tenantId, tenantId),
      gte(bookings.scheduledDate, startDate),
      lte(bookings.scheduledDate, endDate),
    ];
    if (staffId) conditions.push(eq(bookings.staffId, staffId));
    return db.select().from(bookings).where(and(...conditions)).orderBy(asc(bookings.scheduledDate));
  },

  async getStats(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86400000);

    const [total, todayRows, pendingRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.tenantId, tenantId)),
      db.select({ count: sql<number>`count(*)` }).from(bookings).where(
        and(eq(bookings.tenantId, tenantId), gte(bookings.createdAt, startOfToday), lte(bookings.createdAt, endOfToday))
      ),
      db.select({ count: sql<number>`count(*)` }).from(bookings).where(
        and(eq(bookings.tenantId, tenantId), eq(bookings.status, "PENDING"))
      ),
    ]);

    return {
      total: Number(total[0]?.count ?? 0),
      today: Number(todayRows[0]?.count ?? 0),
      pending: Number(pendingRows[0]?.count ?? 0),
    };
  },

  // ---- SLOTS ----

  async findSlotsByDate(tenantId: string, date: Date, serviceId?: string, staffId?: string) {
    const conditions = [
      eq(availableSlots.tenantId, tenantId),
      eq(availableSlots.date, date),
      eq(availableSlots.available, true),
      // serviceIds and staffIds are uuid[] columns - filter using ANY() when provided
      serviceId ? sql`${serviceId}::uuid = ANY(${availableSlots.serviceIds})` : undefined,
      staffId ? sql`${staffId}::uuid = ANY(${availableSlots.staffIds})` : undefined,
    ].filter(Boolean) as Parameters<typeof and>;
    return db.select().from(availableSlots).where(and(...conditions)).orderBy(asc(availableSlots.time));
  },

  async findSlotsByDateRange(tenantId: string, startDate: Date, endDate: Date) {
    return db
      .select()
      .from(availableSlots)
      .where(
        and(
          eq(availableSlots.tenantId, tenantId),
          gte(availableSlots.date, startDate),
          lte(availableSlots.date, endDate),
          eq(availableSlots.available, true)
        )
      )
      .orderBy(asc(availableSlots.date), asc(availableSlots.time));
  },

  async findSlotById(tenantId: string, slotId: string) {
    const result = await db
      .select()
      .from(availableSlots)
      .where(and(eq(availableSlots.id, slotId), eq(availableSlots.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async decrementSlotCapacity(tenantId: string, slotId: string) {
    await db.transaction(async (tx) => {
      const [slot] = await tx
        .select({ bookedCount: availableSlots.bookedCount, capacity: availableSlots.capacity })
        .from(availableSlots)
        .where(and(eq(availableSlots.id, slotId), eq(availableSlots.tenantId, tenantId)))
        .limit(1);

      if (!slot) throw new NotFoundError("Slot", slotId);

      if (slot.bookedCount >= slot.capacity) {
        throw new ConflictError("Slot is at full capacity");
      }

      const newCount = slot.bookedCount + 1;
      await tx
        .update(availableSlots)
        .set({ bookedCount: newCount, available: newCount < slot.capacity, updatedAt: new Date() })
        .where(eq(availableSlots.id, slotId));
    });
  },

  async incrementSlotCapacity(tenantId: string, slotId: string) {
    const [slot] = await db
      .select({ bookedCount: availableSlots.bookedCount, capacity: availableSlots.capacity })
      .from(availableSlots)
      .where(and(eq(availableSlots.id, slotId), eq(availableSlots.tenantId, tenantId)))
      .limit(1);

    if (!slot) return; // slot may have been deleted - silently ignore

    const newCount = Math.max(0, slot.bookedCount - 1);
    await db
      .update(availableSlots)
      .set({ bookedCount: newCount, available: newCount < slot.capacity, updatedAt: new Date() })
      .where(eq(availableSlots.id, slotId));
  },

  // ---- WRITE ----

  async create(tenantId: string, input: CreateBookingInput, createdById?: string) {
    const bookingNumber = await generateBookingNumber(tenantId);
    const now = new Date();

    const isReserved = !input.skipReservation && !!input.slotId;
    const status = isReserved ? "RESERVED" : "PENDING";
    const reservationExpiresAt = isReserved ? new Date(now.getTime() + 15 * 60 * 1000) : null;

    const endTime = calculateEndTime(input.scheduledTime, input.durationMinutes);

    const [booking] = await db
      .insert(bookings)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        bookingNumber,
        customerId: input.customerId,
        serviceId: input.serviceId,
        staffId: input.staffId ?? null,
        venueId: input.venueId ?? null,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        endTime,
        durationMinutes: input.durationMinutes,
        locationType: input.locationType ?? "VENUE",
        locationAddress: input.locationAddress ?? null,
        price: input.price != null ? String(input.price) : null,
        customServiceName: input.customServiceName ?? null,
        customerNotes: input.customerNotes ?? null,
        adminNotes: input.adminNotes ?? null,
        source: input.source ?? "ADMIN",
        slotId: input.slotId ?? null,
        status,
        statusChangedAt: now,
        reservedAt: isReserved ? now : null,
        reservationExpiresAt,
        requiresApproval: false,
        createdById: createdById ?? null,
        confirmationTokenHash: input.confirmationTokenHash ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return booking!;
  },

  async update(tenantId: string, bookingId: string, input: UpdateBookingInput) {
    const now = new Date();
    const endTime = input.scheduledTime
      ? calculateEndTime(input.scheduledTime, input.durationMinutes ?? 60)
      : undefined;

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (input.staffId !== undefined) updateData.staffId = input.staffId;
    if (input.venueId !== undefined) updateData.venueId = input.venueId;
    if (input.scheduledDate !== undefined) updateData.scheduledDate = input.scheduledDate;
    if (input.scheduledTime !== undefined) updateData.scheduledTime = input.scheduledTime;
    if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (input.locationType !== undefined) updateData.locationType = input.locationType;
    if (input.locationAddress !== undefined) updateData.locationAddress = input.locationAddress;
    if (input.price !== undefined) updateData.price = input.price != null ? String(input.price) : null;
    if (input.customerNotes !== undefined) updateData.customerNotes = input.customerNotes;
    if (input.adminNotes !== undefined) updateData.adminNotes = input.adminNotes;
    if (input.slotId !== undefined) updateData.slotId = input.slotId;

    const [updated] = await db
      .update(bookings)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T ? Record<string, unknown> : never)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  },

  async updateStatus(tenantId: string, bookingId: string, status: BookingStatus, meta?: StatusMeta) {
    const now = new Date();
    const data: Record<string, unknown> = { status, statusChangedAt: now, updatedAt: now };

    if (status === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelledBy = meta?.cancelledBy ?? null;
      data.cancellationReason = meta?.cancellationReason ?? null;
    }
    if (status === "COMPLETED") {
      data.completedAt = now;
    }
    if (status === "APPROVED") {
      data.approvedAt = now;
      data.approvedById = meta?.approvedById ?? null;
    }
    if (status === "REJECTED") {
      data.rejectionReason = meta?.rejectionReason ?? null;
    }
    if (status === "CONFIRMED" || status === "PENDING") {
      data.reservedAt = null;
      data.reservationExpiresAt = null;
    }

    const [updated] = await db
      .update(bookings)
      .set(data as Parameters<typeof db.update>[0] extends infer T ? Record<string, unknown> : never)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  },

  // ---- ASSIGNMENTS ----

  async upsertAssignments(tenantId: string, bookingId: string, staffIds: string[]) {
    // Delete existing then re-insert
    await db.delete(bookingAssignments).where(eq(bookingAssignments.jobId, bookingId));
    if (staffIds.length > 0) {
      await db.insert(bookingAssignments).values(
        staffIds.map((userId) => ({ id: crypto.randomUUID(), jobId: bookingId, userId }))
      );
    }
  },

  // ---- STATUS HISTORY ----

  async recordStatusChange(
    bookingId: string,
    fromStatus: BookingStatus | null,
    toStatus: BookingStatus,
    reason?: string,
    changedById?: string
  ) {
    await db.insert(bookingStatusHistory).values({
      id: crypto.randomUUID(),
      jobId: bookingId,
      fromStatus: fromStatus ?? null,
      toStatus,
      reason: reason ?? null,
      changedById: changedById ?? null,
    });
  },
};
