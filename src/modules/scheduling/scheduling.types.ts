// Slot management
export interface SlotCreateInput {
  date: Date;
  time: string; // "HH:MM"
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
  id: string;
  available?: boolean;
}

export interface SlotListFilters {
  startDate: Date;
  endDate: Date;
  staffId?: string;
  serviceId?: string;
  venueId?: string;
  includeUnavailable?: boolean;
}

export interface RecurringSlotInput {
  baseSlot: SlotCreateInput;
  recurrenceRule: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    daysOfWeek?: number[]; // 0=Sun, 6=Sat
    count?: number;
    until?: Date;
  };
}

// Availability
export type AvailabilityStatus = "available" | "travel_time" | "unavailable";

export interface StaffAvailability {
  userId: string;
  staffName: string;
  status: AvailabilityStatus;
  travelMinutes?: number;
  nextBooking?: string;
  reason?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  reason?: string;
}

// Travel time
export interface TravelTimeResult {
  minutes: number;
  miles: number;
  status: "green" | "amber" | "red";
}

// Alerts
export type AlertType = "travel" | "back_to_back" | "conflict";
export type AlertSeverity = "warning" | "error";

export interface SchedulingAlert {
  id: string;
  bookingId: string;
  staffName: string;
  customerName: string;
  datetime: Date;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
}

// Assignment health
export type AssignmentStatus =
  | "optimal"
  | "tight_schedule"
  | "long_travel"
  | "conflict";

export interface AssignmentHealth {
  status: AssignmentStatus;
  icon: string;
  label: string;
  color: "green" | "amber" | "red";
  reason: string;
}

// Staff recommendation
export interface StaffRecommendation {
  userId: string;
  staffName: string;
  score: number;
  reasons: string[];
  travelTime?: number;
  availabilityStatus: AvailabilityStatus;
}

// Smart assignment
export type AssignmentStrategyType =
  | 'ROUND_ROBIN'
  | 'LEAST_LOADED'
  | 'SKILL_MATCH'
  | 'GEOGRAPHIC'
  | 'PREFERRED'

export interface AssignmentStrategy {
  type: AssignmentStrategyType
  tiebreaker?: 'ROUND_ROBIN' | 'AVAILABILITY'
}

export interface StaffCandidate {
  userId: string
  lastAssignedAt: Date | null
  bookingsToday: number
  skills: string[]
  homeLatitude: number | null
  homeLongitude: number | null
}

export interface AssignmentContext {
  serviceId: string
  requiredSkills?: string[]
  customerLatitude?: number
  customerLongitude?: number
  preferredStaffId?: string
  date: string
}

// Waitlist
export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'BOOKED' | 'EXPIRED'

export interface WaitlistEntry {
  id: string
  tenantId: string
  customerId: string
  serviceId: string
  staffId: string | null
  preferredDate: Date | null
  flexibilityDays: number
  status: WaitlistStatus
  expiresAt: Date
  createdAt: Date
}

// Booking shape used by scheduling lib (minimal — avoids circular import with booking module)
export interface SchedulingBooking {
  id: string;
  tenantId: string;
  staffId: string | null;
  scheduledDate: Date;
  scheduledTime: string;
  durationMinutes: number | null;
  status: string;
  locationPostcode?: string | null;
}

export interface SchedulingUser {
  id: string;
  firstName: string;
  lastName: string;
  staffStatus: string | null;
}
