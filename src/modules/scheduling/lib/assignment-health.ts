import type { AssignmentHealth, SchedulingBooking } from "../scheduling.types";
import { estimateTravelTime } from "./travel-time";

function parseBookingStart(booking: SchedulingBooking): Date {
  const dateStr =
    booking.scheduledDate instanceof Date
      ? booking.scheduledDate.toISOString().split("T")[0]
      : String(booking.scheduledDate);
  const timeStr = booking.scheduledTime.replace(
    /(\d+)\.5:/,
    (_m, h: string) => `${String(Number(h)).padStart(2, "0")}:30:`
  );
  return new Date(`${dateStr}T${timeStr}:00`);
}

function parseBookingEnd(booking: SchedulingBooking): Date {
  const start = parseBookingStart(booking);
  return new Date(start.getTime() + (booking.durationMinutes ?? 60) * 60 * 1000);
}

export function calculateAssignmentHealth(
  booking: SchedulingBooking,
  otherBookings: SchedulingBooking[]
): AssignmentHealth {
  if (!booking.staffId || booking.staffId === "any") {
    return {
      status: "optimal",
      icon: "✓",
      label: "Unassigned",
      color: "green",
      reason: "No staff assigned",
    };
  }

  const staffBookings = otherBookings.filter(
    (b) =>
      b.id !== booking.id &&
      b.staffId === booking.staffId &&
      b.staffId !== "any" &&
      b.status !== "CANCELLED" &&
      b.status !== "REJECTED"
  );

  const bStart = parseBookingStart(booking);
  const bEnd = parseBookingEnd(booking);

  // Check for direct time conflicts
  for (const other of staffBookings) {
    const oStart = parseBookingStart(other);
    const oEnd = parseBookingEnd(other);
    if (bStart < oEnd && oStart < bEnd) {
      return {
        status: "conflict",
        icon: "✗",
        label: "Conflict",
        color: "red",
        reason: "Time conflict with another booking",
      };
    }
  }

  // Check travel from previous booking
  const prevBookings = staffBookings
    .filter((b) => parseBookingEnd(b) <= bStart)
    .sort((a, b) => parseBookingEnd(b).getTime() - parseBookingEnd(a).getTime());
  const prevBooking = prevBookings[0];

  if (prevBooking) {
    const prevEnd = parseBookingEnd(prevBooking);
    const availableMinutes = (bStart.getTime() - prevEnd.getTime()) / 60000;
    const travelMinutes = estimateTravelTime(
      prevBooking.locationPostcode ?? undefined,
      booking.locationPostcode ?? undefined
    );
    if (availableMinutes < travelMinutes) {
      return {
        status: "long_travel",
        icon: "⚠",
        label: "Travel time issue",
        color: "red",
        reason: `Only ${Math.round(availableMinutes)}min before next booking, needs ${travelMinutes}min travel`,
      };
    }
    if (availableMinutes - travelMinutes < 15) {
      return {
        status: "tight_schedule",
        icon: "⚡",
        label: "Tight schedule",
        color: "amber",
        reason: `Only ${Math.round(availableMinutes - travelMinutes)}min buffer after travel`,
      };
    }
  }

  // Check travel to next booking
  const nextBookings = staffBookings
    .filter((b) => parseBookingStart(b) >= bEnd)
    .sort((a, b) => parseBookingStart(a).getTime() - parseBookingStart(b).getTime());
  const nextBooking = nextBookings[0];

  if (nextBooking) {
    const nextStart = parseBookingStart(nextBooking);
    const availableMinutes = (nextStart.getTime() - bEnd.getTime()) / 60000;
    const travelMinutes = estimateTravelTime(
      booking.locationPostcode ?? undefined,
      nextBooking.locationPostcode ?? undefined
    );
    if (availableMinutes < travelMinutes) {
      return {
        status: "long_travel",
        icon: "⚠",
        label: "Travel time issue",
        color: "red",
        reason: `Only ${Math.round(availableMinutes)}min before next booking, needs ${travelMinutes}min travel`,
      };
    }
    if (availableMinutes - travelMinutes < 15) {
      return {
        status: "tight_schedule",
        icon: "⚡",
        label: "Tight schedule",
        color: "amber",
        reason: `Only ${Math.round(availableMinutes - travelMinutes)}min buffer after travel`,
      };
    }
  }

  return {
    status: "optimal",
    icon: "✓",
    label: "Optimal",
    color: "green",
    reason: "No scheduling issues",
  };
}

export function calculateMultipleAssignmentHealth(
  bookings: SchedulingBooking[]
): Map<string, AssignmentHealth> {
  const result = new Map<string, AssignmentHealth>();
  for (const booking of bookings) {
    result.set(booking.id, calculateAssignmentHealth(booking, bookings));
  }
  return result;
}

export function getAssignmentHealthStats(bookings: SchedulingBooking[]) {
  let optimal = 0, tight = 0, conflicts = 0, longTravel = 0;
  for (const b of bookings) {
    const h = calculateAssignmentHealth(b, bookings);
    if (h.status === "optimal") optimal++;
    else if (h.status === "tight_schedule") tight++;
    else if (h.status === "conflict") conflicts++;
    else if (h.status === "long_travel") longTravel++;
  }
  return { optimal, tight, conflicts, longTravel };
}
