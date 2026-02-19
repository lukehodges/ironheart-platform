import type {
  StaffRecommendation,
  SchedulingBooking,
  SchedulingUser,
} from "../scheduling.types";
import { isStaffAvailable } from "./availability";
import { calculateAssignmentHealth } from "./assignment-health";
import { estimateTravelTime } from "./travel-time";

function scoreStaffMember(
  user: SchedulingUser,
  bookings: SchedulingBooking[],
  targetDate: Date,
  durationMinutes: number,
  targetLocation?: string
): StaffRecommendation {
  const reasons: string[] = [];
  let score = 100;

  const availability = isStaffAvailable(user, bookings, targetDate, durationMinutes);

  if (availability.status === "unavailable") {
    return {
      userId: user.id,
      staffName: `${user.firstName} ${user.lastName}`,
      score: 0,
      reasons: [availability.reason ?? "Not available"],
      availabilityStatus: "unavailable",
    };
  }
  if (availability.status === "travel_time") {
    score -= 50;
    reasons.push("Limited availability due to travel");
  }

  // Travel time penalty
  let travelTime: number | undefined;
  if (targetLocation) {
    travelTime = estimateTravelTime(undefined, targetLocation);
    if (travelTime > 45) {
      score -= 20;
      reasons.push(`Long travel time (${travelTime}min)`);
    } else if (travelTime > 30) {
      score -= 10;
      reasons.push(`Moderate travel time (${travelTime}min)`);
    } else {
      reasons.push(`Good travel time (${travelTime}min)`);
    }
  }

  // Assignment health
  const mockBooking: SchedulingBooking = {
    id: "__candidate__",
    tenantId: "",
    staffId: user.id,
    scheduledDate: targetDate,
    scheduledTime: targetDate.toTimeString().substring(0, 5),
    durationMinutes,
    status: "PENDING",
    locationPostcode: targetLocation,
  };
  const health = calculateAssignmentHealth(mockBooking, bookings);
  if (health.status === "optimal") { score += 10; reasons.push("Optimal schedule"); }
  else if (health.status === "tight_schedule") { score -= 15; reasons.push("Tight schedule"); }
  else if (health.status === "long_travel") { score -= 25; reasons.push("Travel issue in schedule"); }
  else if (health.status === "conflict") { return { userId: user.id, staffName: `${user.firstName} ${user.lastName}`, score: 0, reasons: ["Schedule conflict"], availabilityStatus: "unavailable" }; }

  // Workload balance
  const dayBookings = bookings.filter(
    (b) =>
      b.staffId === user.id &&
      b.scheduledDate.getFullYear() === targetDate.getFullYear() &&
      b.scheduledDate.getMonth() === targetDate.getMonth() &&
      b.scheduledDate.getDate() === targetDate.getDate()
  ).length;
  if (dayBookings < 3) { score += 5; reasons.push("Lighter schedule today"); }
  else if (dayBookings > 6) { score -= 10; reasons.push("Heavy schedule today"); }

  return {
    userId: user.id,
    staffName: `${user.firstName} ${user.lastName}`,
    score: Math.max(0, score),
    reasons,
    travelTime,
    availabilityStatus: availability.status,
  };
}

export function getStaffRecommendations(
  allStaff: SchedulingUser[],
  bookings: SchedulingBooking[],
  targetDate: Date,
  durationMinutes: number,
  targetLocation?: string
): StaffRecommendation[] {
  return allStaff
    .map((u) => scoreStaffMember(u, bookings, targetDate, durationMinutes, targetLocation))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function getBestStaffRecommendation(
  allStaff: SchedulingUser[],
  bookings: SchedulingBooking[],
  targetDate: Date,
  durationMinutes: number,
  targetLocation?: string
): StaffRecommendation | null {
  const recs = getStaffRecommendations(
    allStaff,
    bookings,
    targetDate,
    durationMinutes,
    targetLocation
  );
  return recs[0] ?? null;
}
