
import type {
  StaffAvailability,
  TimeSlot,
  SchedulingBooking,
  SchedulingUser,
} from "../scheduling.types";

/**
 * Parse a booking's scheduled start time as a Date object.
 * Handles the legacy ".5:" malformed format (e.g. "14.5:00" -> 14:30).
 */
function parseBookingDateTime(booking: SchedulingBooking): Date {
  const dateStr = booking.scheduledDate instanceof Date
    ? booking.scheduledDate.toISOString().split("T")[0]
    : String(booking.scheduledDate);
  // Fix malformed ".5:" format
  const timeStr = booking.scheduledTime.replace(/(\d+)\.5:/, (_m, h: string) =>
    `${String(Number(h)).padStart(2, "0")}:30:`
  );
  return new Date(`${dateStr}T${timeStr}:00`);
}

function parseBookingEndDateTime(booking: SchedulingBooking): Date {
  const start = parseBookingDateTime(booking);
  const durationMs = (booking.durationMinutes ?? 60) * 60 * 1000;
  return new Date(start.getTime() + durationMs);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a time range [startA, endA) overlaps [startB, endB).
 */
function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

export interface ExternalEventBlock {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
}

/**
 * Determine if a staff member is available for a booking at targetDate/startTime
 * for durationMinutes. Returns an AvailabilityStatus with optional reason.
 */
export function isStaffAvailable(
  user: SchedulingUser,
  bookings: SchedulingBooking[],
  targetDate: Date,
  durationMinutes: number,
  externalEvents: ExternalEventBlock[] = []
): StaffAvailability {
  const staffName = `${user.firstName} ${user.lastName}`;
  const targetEnd = new Date(targetDate.getTime() + durationMinutes * 60 * 1000);

  const staffBookings = bookings.filter(
    (b) =>
      b.staffId === user.id &&
      b.status !== "CANCELLED" &&
      b.status !== "REJECTED" &&
      isSameDay(b.scheduledDate, targetDate)
  );

  // Check for overlap with existing bookings (+ 15 min travel buffer)
  for (const b of staffBookings) {
    const bStart = parseBookingDateTime(b);
    const bEnd = parseBookingEndDateTime(b);
    const bufferMs = 15 * 60 * 1000;
    const bStartWithBuffer = new Date(bStart.getTime() - bufferMs);
    const bEndWithBuffer = new Date(bEnd.getTime() + bufferMs);

    if (overlaps(targetDate, targetEnd, bStartWithBuffer, bEndWithBuffer)) {
      return {
        userId: user.id,
        staffName,
        status: "unavailable",
        nextBooking: b.scheduledTime,
        reason: "Conflicts with existing booking (including travel buffer)",
      };
    }
  }

  // Check external calendar blocks
  for (const ev of externalEvents) {
    if (ev.isAllDay) {
      return {
        userId: user.id,
        staffName,
        status: "unavailable",
        reason: `All-day block: ${ev.summary}`,
      };
    }
    if (overlaps(targetDate, targetEnd, ev.startTime, ev.endTime)) {
      return {
        userId: user.id,
        staffName,
        status: "unavailable",
        reason: `Calendar block: ${ev.summary}`,
      };
    }
  }

  return { userId: user.id, staffName, status: "available" };
}

/**
 * Return all staff who are available for a given slot.
 */
export function getAvailableStaff(
  allStaff: SchedulingUser[],
  bookings: SchedulingBooking[],
  targetDate: Date,
  durationMinutes: number
): StaffAvailability[] {
  return allStaff
    .map((u) => isStaffAvailable(u, bookings, targetDate, durationMinutes))
    .filter((a) => a.status === "available");
}

/**
 * Generate 30-minute time slots for a staff member on a given day (9am–5pm).
 */
export function getStaffTimeSlots(
  user: SchedulingUser,
  bookings: SchedulingBooking[],
  date: Date,
  slotDurationMinutes = 30
): TimeSlot[] {
  const dayBookings = bookings.filter(
    (b) => b.staffId === user.id && isSameDay(b.scheduledDate, date)
  );

  const slots: TimeSlot[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(17, 0, 0, 0);

  let cursor = dayStart;
  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + slotDurationMinutes * 60 * 1000);
    let available = true;
    let reason: string | undefined;

    for (const b of dayBookings) {
      const bStart = parseBookingDateTime(b);
      const bEnd = parseBookingEndDateTime(b);
      if (overlaps(cursor, slotEnd, bStart, bEnd)) {
        available = false;
        reason = "Booking exists";
        break;
      }
    }

    slots.push({ start: new Date(cursor), end: slotEnd, available, reason });
    cursor = slotEnd;
  }

  return slots;
}
