import { addDays, addWeeks, addMonths } from "date-fns";
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
} from "./scheduling.types";
import { isStaffAvailable, type ExternalEventBlock } from "./lib/availability";
import { calculateTravelTime } from "./lib/travel-time";

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
          // No day-of-week filter — jump by interval weeks at a time
          current = addWeeks(current, interval);
        }
      } else if (frequency === "monthly") {
        current = addMonths(current, interval);
      } else {
        // Unknown frequency — bail out to prevent an infinite loop
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
   * TODO: wire to a users/staff repository to enumerate all active staff for the tenant.
   */
  async getAvailableStaffForSlot(
    _tenantId: string,
    _slotId: string,
  ): Promise<StaffAvailability[]> {
    // TODO: load all active staff for tenant and check availability against the slot window
    return [];
  },

  /**
   * Return ranked staff recommendations for a given booking.
   * TODO: wire to booking repository and staff list once scheduling has access to those.
   */
  async getStaffRecommendations(
    _tenantId: string,
    _bookingId: string,
  ): Promise<StaffRecommendation[]> {
    // TODO: load booking details and active staff list, then call lib/recommendations.ts
    return [];
  },

  // ---------------------------------------------------------------------------
  // Alerts & health
  // ---------------------------------------------------------------------------

  /**
   * Return scheduling alerts (conflicts, travel issues, back-to-back) for a date.
   * TODO: wire to booking repository in a later phase — this service currently has
   * no direct access to the bookings table outside of the per-staff availability queries.
   */
  async getSchedulingAlerts(
    _tenantId: string,
    _date: Date,
  ): Promise<SchedulingAlert[]> {
    // TODO: wire to booking repository in a later phase
    return [];
  },

  /**
   * Return assignment health for a specific booking.
   * TODO: wire to booking repository to fetch the booking and its sibling bookings
   * for the assigned staff member, then delegate to lib/assignment-health.ts.
   */
  async getAssignmentHealth(_bookingId: string): Promise<AssignmentHealth> {
    // TODO: wire to booking repository in a later phase
    return {
      status: "optimal",
      icon: "✓",
      label: "Optimal",
      color: "green",
      reason: "Assignment health calculation not yet wired to booking data",
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
