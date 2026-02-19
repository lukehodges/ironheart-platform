import type { CreateEventInput } from '../providers'

/**
 * The shape of a booking record needed to generate a calendar event.
 * Returned by calendarSyncRepository.loadBookingForCalendar().
 */
export interface BookingForCalendar {
  id: string
  bookingNumber: string
  scheduledDate: Date
  scheduledTime: string          // "HH:MM"
  durationMinutes: number
  locationType: string
  locationAddress: Record<string, unknown> | null
  customer: {
    firstName: string
    lastName: string
    email: string | null
  } | null
  service: {
    name: string
  } | null
  staff: {
    firstName: string
    lastName: string
  } | null
  tenant: {
    name: string
  } | null
}

/**
 * Map a Booking record to a CreateEventInput for the CalendarProvider.
 * All times are normalised to UTC ISO 8601 strings.
 */
export function bookingToCalendarEvent(
  booking: BookingForCalendar,
  calendarId: string
): CreateEventInput {
  const startDateTime = buildStartDateTime(booking.scheduledDate, booking.scheduledTime)
  const endDateTime = addMinutes(startDateTime, booking.durationMinutes)

  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
    : 'Customer'

  const staffName = booking.staff
    ? `${booking.staff.firstName} ${booking.staff.lastName}`.trim()
    : null

  const descriptionLines = [
    `Booking Reference: ${booking.bookingNumber}`,
    booking.customer?.email ? `Customer Email: ${booking.customer.email}` : null,
    staffName ? `Staff: ${staffName}` : null,
    booking.tenant?.name ? `Provider: ${booking.tenant.name}` : null,
  ].filter((line): line is string => line !== null)

  return {
    calendarId,
    summary: [
      booking.service?.name ?? 'Appointment',
      '\u2014',
      customerName,
    ].join(' '),
    description: descriptionLines.join('\n'),
    location: formatLocation(booking.locationAddress),
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    attendees: booking.customer?.email ? [booking.customer.email] : [],
    idempotencyKey: `booking-${booking.id}`,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Combine a Date (date portion) and a "HH:MM" time string into a UTC Date.
 * The scheduledDate from the DB is stored in UTC, and the scheduledTime is
 * stored as a wall-clock time in the tenant's local timezone.
 * For simplicity we treat both as UTC here — the service layer should handle
 * timezone conversion if tenant timezones are tracked in future.
 */
function buildStartDateTime(date: Date, time: string): Date {
  const [hoursStr, minutesStr] = time.split(':')
  const hours = parseInt(hoursStr ?? '0', 10)
  const minutes = parseInt(minutesStr ?? '0', 10)

  const result = new Date(date)
  result.setUTCHours(hours, minutes, 0, 0)
  return result
}

/** Add minutes to a Date and return a new Date */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** Format locationAddress JSON into a readable string */
function formatLocation(address: Record<string, unknown> | null): string | undefined {
  if (!address) return undefined
  const parts = [
    address['line1'],
    address['line2'],
    address['city'],
    address['postcode'],
    address['country'],
  ].filter((p): p is string => typeof p === 'string' && p.length > 0)
  return parts.length > 0 ? parts.join(', ') : undefined
}
