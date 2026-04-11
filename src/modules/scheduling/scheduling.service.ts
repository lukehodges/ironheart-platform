import { addDays, addWeeks, addMonths } from "date-fns";
import { db } from "@/shared/db";
import { jobs, users, availableSlots, staffProfiles } from "@/shared/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  schedulingRepository,
  type SlotCreateInput,
  type SlotUpdateInput,
} from "./scheduling.repository";
import type {
  SlotListFilters,
  RecurringSlotInput,
  StaffAvailability,
  StaffRecommendation,
  SchedulingAlert,
  AssignmentHealth,
  TravelTimeResult,
  AssignmentStrategy,
  AssignmentContext,
  StaffCandidate,
} from "./scheduling.types";
import { isStaffAvailable, type ExternalEventBlock } from "./lib/availability";
import { calculateTravelTime } from "./lib/travel-time";
import { selectStaff } from "./lib/smart-assignment";
import { addToWaitlist, checkAndNotifyWaitlist } from "./lib/waitlist";

export { addToWaitlist, checkAndNotifyWaitlist };

export function assignStaff(
  candidates: StaffCandidate[],
  strategy: AssignmentStrategy,
  ctx: AssignmentContext
) {
  return selectStaff(candidates, strategy.type, ctx);
}

const log = logger.child({ module: "scheduling.service" });

const MAX_RECURRING_SLOTS = 365;

export const schedulingService = {

  // ---------------------------------------------------------------------------
  // Slot management
  // ---------------------------------------------------------------------------

  async createSlot(
    tenantId: string,
    input: SlotCreateInput,
    createdById: string,
  ) {
    const slot = await schedulingRepository.createSlot(tenantId, input);
    if (!slot) throw new NotFoundError("Slot", "created");
    log.info({ tenantId, slotId: slot.id, createdById }, "Slot created");
    return slot;
  },

  async bulkCreateSlots(
    tenantId: string,
    slots: SlotCreateInput[],
    createdById: string,
  ) {
    const created = await schedulingRepository.createManySlots(tenantId, slots);
    log.info({ tenantId, total: slots.length, created: created.length, createdById }, "Bulk slots created");
    return {
      total: slots.length,
      created: created.length,
      slots: created,
    };
  },

  async generateRecurringSlots(
    tenantId: string,
    input: RecurringSlotInput,
    createdById: string,
  ) {
    const { baseSlot, recurrenceRule } = input;
    const { frequency, interval, daysOfWeek, count, until } = recurrenceRule;

    const generatedSlots: SlotCreateInput[] = [];
    let current = new Date(baseSlot.date);
    const maxDate = until ?? addDays(new Date(baseSlot.date), MAX_RECURRING_SLOTS);
    const maxCount = Math.min(count ?? MAX_RECURRING_SLOTS, MAX_RECURRING_SLOTS);

    while (current <= maxDate && generatedSlots.length < maxCount) {
      const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat

      if (!daysOfWeek || daysOfWeek.includes(dayOfWeek)) {
        generatedSlots.push({ ...baseSlot, date: new Date(current) });
      }

      // Advance the cursor
      if (frequency === "daily") {
        current = addDays(current, interval);
      } else if (frequency === "weekly") {
        if (daysOfWeek && daysOfWeek.length > 0) {
          // Increment daily so we can filter by daysOfWeek each step.
          // When we wrap to a new week and the interval is >1, skip ahead
          // the remaining (interval - 1) full weeks.
          const nextDay = addDays(current, 1);
          const wrappedToNewWeek = nextDay.getDay() === 0 && current.getDay() !== 0;
          if (wrappedToNewWeek && interval > 1) {
            current = addWeeks(nextDay, interval - 1);
          } else {
            current = nextDay;
          }
        } else {
          // No day-of-week filter - jump by interval weeks at a time
          current = addWeeks(current, interval);
        }
      } else if (frequency === "monthly") {
        current = addMonths(current, interval);
      } else {
        // Unknown frequency - bail out to prevent an infinite loop
        break;
      }
    }

    const created = await schedulingRepository.createManySlots(tenantId, generatedSlots);
    log.info(
      { tenantId, frequency, generated: generatedSlots.length, created: created.length, createdById },
      "Recurring slots generated",
    );
    return {
      total: generatedSlots.length,
      created: created.length,
      slots: created,
    };
  },

  async updateSlot(
    tenantId: string,
    slotId: string,
    input: SlotUpdateInput,
  ) {
    const updated = await schedulingRepository.updateSlot(tenantId, slotId, input);
    if (!updated) throw new NotFoundError("Slot", slotId);
    log.info({ tenantId, slotId }, "Slot updated");
    return updated;
  },

  async deleteSlot(tenantId: string, slotId: string): Promise<void> {
    const existing = await schedulingRepository.findSlotById(tenantId, slotId);
    if (!existing) throw new NotFoundError("Slot", slotId);
    await schedulingRepository.deleteSlot(tenantId, slotId);
    log.info({ tenantId, slotId }, "Slot deleted");
  },

  async listSlots(tenantId: string, filters: SlotListFilters) {
    return schedulingRepository.listSlots(tenantId, filters);
  },

  async getSlotById(tenantId: string, slotId: string) {
    const slot = await schedulingRepository.findSlotById(tenantId, slotId);
    if (!slot) throw new NotFoundError("Slot", slotId);
    return slot;
  },

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  /**
   * Check whether a staff member is available for a given appointment window.
   *
   * @param tenantId        - Tenant context
   * @param userId          - Staff member's user ID
   * @param date            - The calendar date of the appointment
   * @param startTime       - Appointment start time as "HH:MM" string
   * @param durationMinutes - Length of the appointment in minutes
   *
   * NOTE: targetDate is constructed by combining `date` with the parsed `startTime`
   * string so the availability check uses a precise timestamp.
   */
  async checkStaffAvailability(
    tenantId: string,
    userId: string,
    date: Date,
    startTime: string,
    durationMinutes: number,
  ): Promise<StaffAvailability> {
    // Combine the calendar date with the startTime string
    const [hourStr, minuteStr] = startTime.split(":");
    const targetDate = new Date(date);
    targetDate.setHours(Number(hourStr), Number(minuteStr ?? "0"), 0, 0);
    const targetEnd = new Date(targetDate.getTime() + durationMinutes * 60 * 1000);

    // Fetch existing bookings and blocking external events in parallel
    const [staffBookings, externalEvents] = await Promise.all([
      schedulingRepository.getStaffBookingsForDate(tenantId, userId, date),
      schedulingRepository.getExternalEventsForUser(tenantId, userId, targetDate, targetEnd),
    ]);

    // Map external events to the shape expected by the availability lib
    const externalBlocks: ExternalEventBlock[] = externalEvents.map((ev) => ({
      id: ev.id,
      summary: ev.summary ?? "",
      startTime: ev.startTime,
      endTime: ev.endTime,
      isAllDay: ev.isAllDay ?? false,
    }));

    // Construct a minimal SchedulingUser placeholder.
    // A full users-repository call is not available in this module yet; the
    // availability lib uses firstName/lastName only for the staffName label in
    // the returned StaffAvailability object.
    const placeholderUser = {
      id: userId,
      firstName: "Staff",
      lastName: "",
      staffStatus: "ACTIVE",
    };

    // Map repository bookings to the SchedulingBooking shape used by the lib.
    // The bookings table stores address as a JSON blob (locationAddress), not a
    // dedicated postcode column, so locationPostcode is set to null here.
    const schedulingBookings = staffBookings.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      staffId: b.staffId,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      durationMinutes: b.durationMinutes,
      status: b.status,
      locationPostcode: null,
    }));

    return isStaffAvailable(
      placeholderUser,
      schedulingBookings,
      targetDate,
      durationMinutes,
      externalBlocks,
    );
  },

  /**
   * Return all staff available for a given slot.
   * Loads the slot, enumerates active team members for the tenant,
   * and checks each against existing bookings and external events.
   */
  async getAvailableStaffForSlot(
    tenantId: string,
    slotId: string,
  ): Promise<StaffAvailability[]> {
    const slot = await schedulingRepository.findSlotById(tenantId, slotId);
    if (!slot) throw new NotFoundError("Slot", slotId);

    // Load all active team members for the tenant
    const activeStaff = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        staffStatus: staffProfiles.staffStatus,
      })
      .from(users)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.status, "ACTIVE"),
        ),
      );

    if (activeStaff.length === 0) return [];

    // Parse slot time for availability check
    const slotDate = slot.date;
    const slotTime = slot.time; // "HH:MM"
    // Default to 60 minutes if no endTime
    let durationMinutes = 60;
    if (slot.endTime) {
      const [sh, sm] = slotTime.split(":").map(Number);
      const [eh, em] = slot.endTime.split(":").map(Number);
      durationMinutes = ((eh ?? 0) * 60 + (em ?? 0)) - ((sh ?? 0) * 60 + (sm ?? 0));
      if (durationMinutes <= 0) durationMinutes = 60;
    }

    // Check each staff member's availability
    const results: StaffAvailability[] = [];
    for (const staff of activeStaff) {
      const availability = await this.checkStaffAvailability(
        tenantId,
        staff.id,
        slotDate,
        slotTime,
        durationMinutes,
      );
      results.push(availability);
    }

    log.info({ tenantId, slotId, total: activeStaff.length, available: results.filter(r => r.status === "available").length }, "Staff availability checked for slot");
    return results;
  },

  /**
   * Return ranked staff recommendations for a given booking.
   * Scores staff by: service match, workload, and availability.
   */
  async getStaffRecommendations(
    tenantId: string,
    bookingId: string,
  ): Promise<StaffRecommendation[]> {
    // Load the booking
    const [booking] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, bookingId), eq(jobs.tenantId, tenantId)))
      .limit(1);

    if (!booking) throw new NotFoundError("Booking", bookingId);

    // Load active team members
    const activeStaff = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        staffStatus: staffProfiles.staffStatus,
      })
      .from(users)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.status, "ACTIVE"),
        ),
      );

    if (activeStaff.length === 0) return [];

    const recommendations: StaffRecommendation[] = [];

    for (const staff of activeStaff) {
      const reasons: string[] = [];
      let score = 50; // Base score

      // TODO: Service match will use resource pool skills in a future task

      // Workload: fewer bookings on that day = higher score
      const dayBookings = await schedulingRepository.getStaffBookingsForDate(
        tenantId,
        staff.id,
        booking.scheduledDate,
      );
      const activeBookings = dayBookings.filter(b => b.status !== "CANCELLED" && b.status !== "REJECTED");
      if (activeBookings.length === 0) {
        score += 20;
        reasons.push("No other bookings that day");
      } else if (activeBookings.length <= 2) {
        score += 10;
        reasons.push(`Light schedule (${activeBookings.length} booking${activeBookings.length > 1 ? "s" : ""})`);
      } else {
        score -= 10;
        reasons.push(`Busy schedule (${activeBookings.length} bookings)`);
      }

      // Availability check
      const availability = await this.checkStaffAvailability(
        tenantId,
        staff.id,
        booking.scheduledDate,
        booking.scheduledTime,
        booking.durationMinutes,
      );

      if (availability.status === "unavailable") {
        score = Math.max(0, score - 50);
        reasons.push("Currently unavailable");
      } else if (availability.status === "available") {
        reasons.push("Available at requested time");
      }

      recommendations.push({
        userId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`.trim(),
        score: Math.max(0, Math.min(100, score)),
        reasons,
        availabilityStatus: availability.status,
      });
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    log.info({ tenantId, bookingId, count: recommendations.length }, "Staff recommendations generated");
    return recommendations;
  },

  // ---------------------------------------------------------------------------
  // Alerts & health
  // ---------------------------------------------------------------------------

  /**
   * Return scheduling alerts (conflicts, travel issues, back-to-back) for a date.
   * Scans all non-cancelled bookings on the given date and detects overlapping
   * assignments and back-to-back bookings with no buffer.
   */
  async getSchedulingAlerts(
    tenantId: string,
    date: Date,
  ): Promise<SchedulingAlert[]> {
    // Load all non-terminal bookings on this date
    const dayBookings = await db
      .select({
        id: jobs.id,
        staffId: jobs.staffId,
        scheduledTime: jobs.scheduledTime,
        durationMinutes: jobs.durationMinutes,
        status: jobs.status,
        customerId: jobs.customerId,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          eq(jobs.scheduledDate, date),
          sql`${jobs.status} NOT IN ('CANCELLED', 'REJECTED')`,
        ),
      );

    if (dayBookings.length === 0) return [];

    // Group bookings by staffId
    const byStaff = new Map<string, typeof dayBookings>();
    for (const b of dayBookings) {
      if (!b.staffId) continue;
      const existing = byStaff.get(b.staffId) ?? [];
      existing.push(b);
      byStaff.set(b.staffId, existing);
    }

    const alerts: SchedulingAlert[] = [];

    // Helper to parse booking start as minutes-since-midnight
    function parseMinutes(time: string): number {
      const [h, m] = time.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    }

    for (const [staffId, staffBookings] of byStaff) {
      // Sort by time
      const sorted = staffBookings.sort(
        (a, b) => parseMinutes(a.scheduledTime) - parseMinutes(b.scheduledTime),
      );

      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i]!;
        const currentStart = parseMinutes(current.scheduledTime);
        const currentEnd = currentStart + current.durationMinutes;

        for (let j = i + 1; j < sorted.length; j++) {
          const next = sorted[j]!;
          const nextStart = parseMinutes(next.scheduledTime);

          // Conflict: overlapping times
          if (nextStart < currentEnd) {
            alerts.push({
              id: `conflict-${current.id}-${next.id}`,
              bookingId: current.id,
              staffName: staffId, // TODO: resolve staff name via join if needed
              customerName: current.customerId,
              datetime: date,
              type: "conflict",
              message: `Booking at ${current.scheduledTime} overlaps with booking at ${next.scheduledTime}`,
              severity: "error",
            });
          }
          // Back-to-back: no gap between bookings (0-minute buffer)
          else if (nextStart === currentEnd) {
            alerts.push({
              id: `b2b-${current.id}-${next.id}`,
              bookingId: current.id,
              staffName: staffId,
              customerName: current.customerId,
              datetime: date,
              type: "back_to_back",
              message: `Back-to-back booking: ${current.scheduledTime} ends exactly when ${next.scheduledTime} starts`,
              severity: "warning",
            });
          }
        }
      }
    }

    log.info({ tenantId, date, alertCount: alerts.length }, "Scheduling alerts computed");
    return alerts;
  },

  /**
   * Return assignment health for a specific booking.
   * Checks the assigned staff member's schedule on the booking date to determine
   * if the assignment is optimal, tight, or conflicting.
   */
  async getAssignmentHealth(bookingId: string): Promise<AssignmentHealth> {
    // Load the booking (cross-tenant lookup since we only have bookingId)
    const [booking] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, bookingId))
      .limit(1);

    if (!booking) {
      return {
        status: "optimal",
        icon: "?",
        label: "Unknown",
        color: "green",
        reason: "Booking not found",
      };
    }

    if (!booking.staffId) {
      return {
        status: "optimal",
        icon: "−",
        label: "Unassigned",
        color: "amber",
        reason: "No staff assigned to this booking",
      };
    }

    // Get all bookings for this staff member on the same date
    const dayBookings = await schedulingRepository.getStaffBookingsForDate(
      booking.tenantId,
      booking.staffId,
      booking.scheduledDate,
    );

    const activeBookings = dayBookings.filter(
      (b) => b.status !== "CANCELLED" && b.status !== "REJECTED",
    );

    // Helper to parse booking start as minutes-since-midnight
    function parseMinutes(time: string): number {
      const [h, m] = time.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    }

    const bookingStart = parseMinutes(booking.scheduledTime);
    const bookingEnd = bookingStart + booking.durationMinutes;

    // Check for direct conflicts (overlapping with other bookings)
    let hasConflict = false;
    let hasBackToBack = false;

    for (const other of activeBookings) {
      if (other.id === bookingId) continue;
      const otherStart = parseMinutes(other.scheduledTime);
      const otherEnd = otherStart + other.durationMinutes;

      if (bookingStart < otherEnd && otherStart < bookingEnd) {
        hasConflict = true;
        break;
      }
      // Back-to-back: no gap
      if (bookingEnd === otherStart || otherEnd === bookingStart) {
        hasBackToBack = true;
      }
    }

    if (hasConflict) {
      return {
        status: "conflict",
        icon: "!",
        label: "Conflict",
        color: "red",
        reason: "This booking overlaps with another booking for the same staff member",
      };
    }

    if (activeBookings.length >= 6) {
      return {
        status: "tight_schedule",
        icon: "~",
        label: "Heavy Load",
        color: "red",
        reason: `Staff has ${activeBookings.length} bookings on this date`,
      };
    }

    if (hasBackToBack || activeBookings.length >= 4) {
      return {
        status: "tight_schedule",
        icon: "~",
        label: "Tight Schedule",
        color: "amber",
        reason: hasBackToBack
          ? "Back-to-back bookings with no buffer"
          : `Staff has ${activeBookings.length} bookings on this date`,
      };
    }

    return {
      status: "optimal",
      icon: "✓",
      label: "Optimal",
      color: "green",
      reason: activeBookings.length <= 1
        ? "Light schedule"
        : `${activeBookings.length} bookings with adequate spacing`,
    };
  },

  // ---------------------------------------------------------------------------
  // Travel time
  // ---------------------------------------------------------------------------

  async getTravelTime(
    fromPostcode: string,
    toPostcode: string,
  ): Promise<TravelTimeResult> {
    return calculateTravelTime(fromPostcode, toPostcode);
  },
};
