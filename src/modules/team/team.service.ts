import { logger } from "@/shared/logger";
import { NotFoundError, ForbiddenError, ValidationError } from "@/shared/errors";
import type { Context } from "@/shared/trpc";
import type { z } from "zod";
import type {
  StaffMember,
  AvailabilityEntry,
  AvailabilitySlot,
  CapacityEntry,
} from "./team.types";
import type {
  listStaffSchema,
  createStaffSchema,
  updateStaffSchema,
  getAvailabilitySchema,
  setAvailabilitySchema,
  blockDatesSchema,
  getCapacitySchema,
  setCapacitySchema,
  getScheduleSchema,
} from "./team.schemas";
import { teamRepository } from "./team.repository";

const log = logger.child({ module: "team.service" });

export const teamService = {

  // ---------------------------------------------------------------------------
  // STAFF MANAGEMENT
  // ---------------------------------------------------------------------------

  async getStaffMember(ctx: Context, userId: string): Promise<StaffMember> {
    const member = await teamRepository.findById(ctx.tenantId, userId);
    if (!member) throw new NotFoundError("Staff member", userId);

    // Ensure the found staff member belongs to the requesting tenant
    if (member.tenantId !== ctx.tenantId) {
      throw new ForbiddenError("Access denied to this staff member");
    }

    log.info({ userId, tenantId: ctx.tenantId }, "Staff member fetched");
    return member;
  },

  async listStaff(
    ctx: Context,
    input: z.infer<typeof listStaffSchema>
  ): Promise<{ rows: StaffMember[]; hasMore: boolean }> {
    const result = await teamRepository.listByTenant(ctx.tenantId, {
      search: input.search,
      status: input.status,
      limit: input.limit,
      cursor: input.cursor,
    });

    log.info(
      { tenantId: ctx.tenantId, count: result.rows.length, hasMore: result.hasMore },
      "Staff list fetched"
    );
    return result;
  },

  async createStaff(
    ctx: Context,
    input: z.infer<typeof createStaffSchema>
  ): Promise<StaffMember> {
    const member = await teamRepository.create(ctx.tenantId, {
      email: input.email,
      name: input.name,
      phone: input.phone,
      employeeType: input.employeeType,
      hourlyRate: input.hourlyRate,
      defaultMaxDailyBookings: input.defaultMaxDailyBookings,
    });

    log.info({ userId: ctx.user?.id, tenantId: ctx.tenantId, newMemberId: member.id }, "Staff created");
    return member;
  },

  async updateStaff(
    ctx: Context,
    userId: string,
    input: z.infer<typeof updateStaffSchema>
  ): Promise<StaffMember> {
    // Verify the staff member exists and belongs to this tenant
    const existing = await teamRepository.findById(ctx.tenantId, userId);
    if (!existing) throw new NotFoundError("Staff member", userId);

    const updated = await teamRepository.update(ctx.tenantId, userId, {
      email: input.email,
      name: input.name,
      phone: input.phone,
      employeeType: input.employeeType,
      hourlyRate: input.hourlyRate,
      defaultMaxDailyBookings: input.defaultMaxDailyBookings,
      status: input.status,
    });

    log.info({ userId: ctx.user?.id, tenantId: ctx.tenantId, updatedMemberId: userId }, "Staff updated");
    return updated;
  },

  async deactivateStaff(ctx: Context, userId: string): Promise<void> {
    // Verify the staff member exists and belongs to this tenant before deactivating
    const existing = await teamRepository.findById(ctx.tenantId, userId);
    if (!existing) throw new NotFoundError("Staff member", userId);

    await teamRepository.deactivate(ctx.tenantId, userId);

    log.info({ userId: ctx.user?.id, tenantId: ctx.tenantId, deactivatedMemberId: userId }, "Staff deactivated");
  },

  // ---------------------------------------------------------------------------
  // AVAILABILITY
  // ---------------------------------------------------------------------------

  async getAvailability(
    ctx: Context,
    input: z.infer<typeof getAvailabilitySchema>
  ): Promise<AvailabilityEntry[]> {
    const entries = await teamRepository.getAvailabilityEntries(
      ctx.tenantId,
      input.userId,
      {
        startDate: input.startDate,
        endDate: input.endDate,
      }
    );

    log.info(
      { tenantId: ctx.tenantId, userId: input.userId, count: entries.length },
      "Availability fetched"
    );
    return entries;
  },

  async setAvailability(
    ctx: Context,
    input: z.infer<typeof setAvailabilitySchema>
  ): Promise<void> {
    if (input.replaceAll && input.entries.length === 0) {
      log.warn(
        { tenantId: ctx.tenantId, userId: input.userId },
        "setAvailability called with replaceAll=true and empty entries — all availability will be cleared"
      );
    }

    await teamRepository.setAvailabilityEntries(
      ctx.tenantId,
      input.userId,
      input.entries as AvailabilityEntry[],
      input.replaceAll
    );

    log.info(
      { userId: ctx.user?.id, tenantId: ctx.tenantId, targetUserId: input.userId, count: input.entries.length, replaceAll: input.replaceAll },
      "Availability set"
    );
  },

  async blockDates(
    ctx: Context,
    input: z.infer<typeof blockDatesSchema>
  ): Promise<void> {
    // Validate date range when endDate is provided
    if (input.endDate && input.endDate < input.startDate) {
      throw new ValidationError("endDate must be on or after startDate");
    }

    await teamRepository.addBlockedEntry(
      ctx.tenantId,
      input.userId,
      input.startDate,
      input.endDate,
      input.reason
    );

    log.info(
      { userId: ctx.user?.id, tenantId: ctx.tenantId, targetUserId: input.userId, startDate: input.startDate, endDate: input.endDate },
      "Dates blocked"
    );
  },

  // ---------------------------------------------------------------------------
  // CAPACITY
  // ---------------------------------------------------------------------------

  async getCapacity(
    ctx: Context,
    input: z.infer<typeof getCapacitySchema>
  ): Promise<CapacityEntry[]> {
    const entries = await teamRepository.getCapacity(
      ctx.tenantId,
      input.userId,
      {
        startDate: input.startDate,
        endDate: input.endDate,
      }
    );

    log.info(
      { tenantId: ctx.tenantId, userId: input.userId, count: entries.length },
      "Capacity fetched"
    );
    return entries;
  },

  async setCapacity(
    ctx: Context,
    input: z.infer<typeof setCapacitySchema>
  ): Promise<void> {
    if (input.entries.length === 0) {
      log.info({ tenantId: ctx.tenantId, userId: input.userId }, "setCapacity called with no entries — no-op");
      return;
    }

    await teamRepository.setCapacityEntries(
      ctx.tenantId,
      input.userId,
      input.entries
    );

    log.info(
      { userId: ctx.user?.id, tenantId: ctx.tenantId, targetUserId: input.userId, count: input.entries.length },
      "Capacity set"
    );
  },

  // ---------------------------------------------------------------------------
  // SCHEDULE
  // ---------------------------------------------------------------------------

  async getSchedule(
    ctx: Context,
    input: z.infer<typeof getScheduleSchema>
  ): Promise<{
    userId: string;
    date: string;
    availableSlots: AvailabilitySlot[];
    capacity: number;
    assignedBookings: Array<{
      id: string;
      scheduledDate: Date;
      scheduledTime: string;
      durationMinutes: number;
      status: string;
    }>;
  }> {
    const timezone = input.timezone ?? "UTC";

    // Parse the requested date
    const dateObj = new Date(input.date);

    // Fetch available slots, capacity, and assigned bookings in parallel
    const [availableSlots, capacity, assignedBookings] = await Promise.all([
      teamRepository.getStaffAvailableSlots(ctx.tenantId, input.userId, dateObj, timezone),
      teamRepository.getCapacityForDate(ctx.tenantId, input.userId, input.date),
      teamRepository.getAssignedBookings(
        ctx.tenantId,
        input.userId,
        dateObj,
        dateObj
      ),
    ]);

    log.info(
      {
        tenantId: ctx.tenantId,
        userId: input.userId,
        date: input.date,
        slotCount: availableSlots.length,
        capacity,
        bookingCount: assignedBookings.length,
      },
      "Schedule fetched"
    );

    return {
      userId: input.userId,
      date: input.date,
      availableSlots,
      capacity,
      assignedBookings,
    };
  },
};
