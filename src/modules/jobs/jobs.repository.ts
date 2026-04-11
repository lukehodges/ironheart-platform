import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { ConflictError, NotFoundError } from "@/shared/errors";
import {
  jobs,
  jobStatusHistory,
  jobAssignments,
  availableSlots,
  customers,
  services,
  venues,
  users,
  tenants,
} from "@/shared/db/schema";
import { eq, and, or, gte, lte, isNull, inArray, sql, desc, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { JobStatus, CreateJobInput, UpdateJobInput, LocationAddress } from "./jobs.types";

const log = logger.child({ module: "jobs.repository" });

// --------------- Helper types ---------------

interface ListFilters {
  status?: JobStatus;
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

// --------------- Job number generator ---------------

async function generateJobNumber(tenantId: string): Promise<string> {
  const lastJob = await db
    .select({ bookingNumber: jobs.bookingNumber })
    .from(jobs)
    .where(eq(jobs.tenantId, tenantId))
    .orderBy(desc(jobs.createdAt))
    .limit(1);

  const year = new Date().getFullYear();
  let nextNumber = 1;
  if (lastJob[0]?.bookingNumber) {
    const match = lastJob[0].bookingNumber.match(/BK-\d+-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]!, 10) + 1;
    }
  }
  return `BK-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// Backward-compat alias
const generateBookingNumber = generateJobNumber;

// --------------- Calculate end time ---------------

function calculateEndTime(scheduledTime: string, durationMinutes: number): string {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const totalMinutes = (hours ?? 0) * 60 + (minutes ?? 0) + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
}

// ===============================================================
// JOB REPOSITORY
// ===============================================================

export const jobRepository = {

  // ---- READ ----

  async findById(tenantId: string, jobId: string) {
    const result = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async findByIdPublic(jobId: string) {
    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    return result[0] ?? null;
  },

  async findCustomerEmailForJob(jobId: string): Promise<string | null> {
    const result = await db
      .select({ email: customers.email })
      .from(jobs)
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .where(eq(jobs.id, jobId))
      .limit(1);
    return result[0]?.email ?? null;
  },

  // Backward-compat alias
  async findCustomerEmailForBooking(bookingId: string): Promise<string | null> {
    return jobRepository.findCustomerEmailForJob(bookingId);
  },

  async list(tenantId: string, filters: ListFilters, userId?: string) {
    const limit = filters.limit ?? 50;
    const conditions = [eq(jobs.tenantId, tenantId)];

    if (filters.status) conditions.push(eq(jobs.status, filters.status));
    if (filters.staffId) conditions.push(eq(jobs.staffId, filters.staffId));
    if (filters.customerId) conditions.push(eq(jobs.customerId, filters.customerId));
    if (filters.startDate) conditions.push(gte(jobs.scheduledDate, filters.startDate));
    if (filters.endDate) conditions.push(lte(jobs.scheduledDate, filters.endDate));
    if (filters.cursor) conditions.push(lte(jobs.createdAt, new Date(filters.cursor)));

    // RBAC: MEMBER users see only jobs they're assigned to
    if (userId) {
      // Get job IDs assigned to this user via jobAssignments
      const assignedIds = await db
        .select({ jobId: jobAssignments.jobId })
        .from(jobAssignments)
        .where(eq(jobAssignments.userId, userId));
      const assignedJobIds = assignedIds.map((a) => a.jobId);

      const rbacCondition = assignedJobIds.length > 0
        ? or(eq(jobs.staffId, userId), inArray(jobs.id, assignedJobIds))
        : eq(jobs.staffId, userId);
      conditions.push(rbacCondition!);
    }

    const staffUsers = alias(users, "staffUsers");

    const rows = await db
      .select({
        job: jobs,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        serviceName: services.name,
        staffDisplayName: staffUsers.displayName,
        staffFirstName: staffUsers.firstName,
        staffLastName: staffUsers.lastName,
        staffAvatarUrl: staffUsers.avatarUrl,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .leftJoin(staffUsers, eq(jobs.staffId, staffUsers.id))
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    const enrichedRows = sliced.map((r) => ({
      ...r.job,
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
      eq(jobs.tenantId, tenantId),
      gte(jobs.scheduledDate, startDate),
      lte(jobs.scheduledDate, endDate),
    ];
    if (staffId) conditions.push(eq(jobs.staffId, staffId));
    return db.select().from(jobs).where(and(...conditions)).orderBy(asc(jobs.scheduledDate));
  },

  async getStats(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86400000);

    const [total, todayRows, pendingRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.tenantId, tenantId)),
      db.select({ count: sql<number>`count(*)` }).from(jobs).where(
        and(eq(jobs.tenantId, tenantId), gte(jobs.createdAt, startOfToday), lte(jobs.createdAt, endOfToday))
      ),
      db.select({ count: sql<number>`count(*)` }).from(jobs).where(
        and(eq(jobs.tenantId, tenantId), eq(jobs.status, "PENDING"))
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

  async create(tenantId: string, input: CreateJobInput, createdById?: string) {
    const bookingNumber = await generateJobNumber(tenantId);
    const now = new Date();

    const isReserved = !input.skipReservation && !!input.slotId;
    const status = isReserved ? "RESERVED" : "PENDING";
    const reservationExpiresAt = isReserved ? new Date(now.getTime() + 15 * 60 * 1000) : null;

    const endTime = calculateEndTime(input.scheduledTime, input.durationMinutes);

    const [job] = await db
      .insert(jobs)
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
        type: input.type ?? "APPOINTMENT",
        pricingStrategy: input.pricingStrategy ?? "FIXED",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return job!;
  },

  async update(tenantId: string, jobId: string, input: UpdateJobInput) {
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
      .update(jobs)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T ? Record<string, unknown> : never)
      .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  },

  async updateStatus(tenantId: string, jobId: string, status: JobStatus, meta?: StatusMeta) {
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
      .update(jobs)
      .set(data as Parameters<typeof db.update>[0] extends infer T ? Record<string, unknown> : never)
      .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  },

  // ---- ASSIGNMENTS ----

  async upsertAssignments(tenantId: string, jobId: string, staffIds: string[]) {
    await db.delete(jobAssignments).where(eq(jobAssignments.jobId, jobId));
    if (staffIds.length > 0) {
      await db.insert(jobAssignments).values(
        staffIds.map((userId) => ({ id: crypto.randomUUID(), jobId, userId }))
      );
    }
  },

  // ---- STATUS HISTORY ----

  async recordStatusChange(
    jobId: string,
    fromStatus: JobStatus | null,
    toStatus: JobStatus,
    reason?: string,
    changedById?: string
  ) {
    await db.insert(jobStatusHistory).values({
      id: crypto.randomUUID(),
      jobId,
      fromStatus: fromStatus ?? null,
      toStatus,
      reason: reason ?? null,
      changedById: changedById ?? null,
    });
  },
};

// Backward-compat alias
export const bookingRepository = jobRepository;
