import type { SchedulingAlert, SchedulingBooking } from "../scheduling.types";
import { calculateAssignmentHealth } from "./assignment-health";

export function generateSchedulingAlerts(
  bookings: SchedulingBooking[]
): SchedulingAlert[] {
  const alerts: SchedulingAlert[] = [];

  for (const booking of bookings) {
    const health = calculateAssignmentHealth(booking, bookings);

    if (health.status === "optimal") continue;

    const alertTypeMap = {
      conflict: "conflict" as const,
      long_travel: "travel" as const,
      tight_schedule: "back_to_back" as const,
    };

    const severityMap = {
      conflict: "error" as const,
      long_travel: "warning" as const,
      tight_schedule: "warning" as const,
    };

    const type = alertTypeMap[health.status];
    const severity = severityMap[health.status];

    alerts.push({
      id: `alert-${booking.id}-${health.status}`,
      bookingId: booking.id,
      staffName: booking.staffId ?? "Unassigned",
      customerName: "",
      datetime: booking.scheduledDate,
      type,
      message: health.reason,
      severity,
    });
  }

  // Sort: errors first, then by datetime
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity)
      return a.severity === "error" ? -1 : 1;
    return a.datetime.getTime() - b.datetime.getTime();
  });
}

export function getAlertsBySeverity(
  alerts: SchedulingAlert[],
  severity: "warning" | "error"
): SchedulingAlert[] {
  return alerts.filter((a) => a.severity === severity);
}

export function getAlertsByType(
  alerts: SchedulingAlert[],
  type: SchedulingAlert["type"]
): SchedulingAlert[] {
  return alerts.filter((a) => a.type === type);
}

export function getAlertsForStaff(
  alerts: SchedulingAlert[],
  staffName: string
): SchedulingAlert[] {
  return alerts.filter((a) => a.staffName === staffName);
}

export function getAlertsForDateRange(
  alerts: SchedulingAlert[],
  startDate: Date,
  endDate: Date
): SchedulingAlert[] {
  return alerts.filter(
    (a) => a.datetime >= startDate && a.datetime <= endDate
  );
}

export function getAlertSummary(alerts: SchedulingAlert[]) {
  return {
    total: alerts.length,
    errors: alerts.filter((a) => a.severity === "error").length,
    warnings: alerts.filter((a) => a.severity === "warning").length,
    conflicts: alerts.filter((a) => a.type === "conflict").length,
    travelIssues: alerts.filter((a) => a.type === "travel").length,
    tightSchedule: alerts.filter((a) => a.type === "back_to_back").length,
  };
}
