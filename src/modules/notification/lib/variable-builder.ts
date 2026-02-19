import type { TemplateVariables } from '../notification.types'

/**
 * The shape of a fully-joined booking record needed to build template variables.
 * This is what notification.repository.ts returns from loadBookingForNotification().
 */
export interface BookingForVariables {
  id: string
  bookingNumber: string
  scheduledDate: Date
  scheduledTime: string          // "HH:MM"
  durationMinutes: number
  status: string
  locationType: string
  locationAddress: Record<string, unknown> | null
  customer: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  } | null
  service: {
    name: string
    description: string | null
  } | null
  staff: {
    firstName: string
    lastName: string
  } | null
  tenant: {
    id: string
    name: string
    slug: string
    phone: string | null
    email: string | null
    website: string | null
    settings: {
      logoUrl?: string
      address?: string
      portalBaseUrl?: string
    } | null
  } | null
}

/**
 * Build the TemplateVariables object from a loaded booking + base URL.
 *
 * All formatting is locale-aware but defaults to en-GB for date display.
 * The portal URL is constructed from the tenant's portalBaseUrl setting or
 * falls back to the APP_URL env var.
 */
export function buildTemplateVariables(
  booking: BookingForVariables
): TemplateVariables {
  const customer = booking.customer
  const service = booking.service
  const staff = booking.staff
  const tenant = booking.tenant
  const settings = tenant?.settings ?? {}

  const customerName = customer
    ? `${customer.firstName} ${customer.lastName}`.trim()
    : 'Customer'

  const staffName = staff
    ? `${staff.firstName} ${staff.lastName}`.trim()
    : undefined

  const portalBase =
    settings.portalBaseUrl ??
    process.env.APP_URL ??
    'https://app.ironheart.app'

  const bookingUrl = `${portalBase}/bookings/${booking.id}`
  const reviewUrl = `${portalBase}/bookings/${booking.id}/review`
  const portalUrl = portalBase

  return {
    // Customer
    customerName,
    customerFirstName: customer?.firstName ?? 'Customer',
    customerEmail: customer?.email ?? '',
    customerPhone: customer?.phone ?? undefined,

    // Booking
    bookingNumber: booking.bookingNumber,
    bookingDate: formatDate(booking.scheduledDate),
    bookingTime: formatTime(booking.scheduledTime),
    bookingDuration: formatDuration(booking.durationMinutes),
    bookingUrl,
    bookingStatus: booking.status,

    // Service
    serviceName: service?.name ?? 'Service',
    serviceDescription: service?.description ?? undefined,

    // Staff
    staffName,
    staffFirstName: staff?.firstName ?? undefined,

    // Location
    locationAddress: formatAddress(booking.locationAddress),
    locationCity: extractCity(booking.locationAddress),
    locationType: booking.locationType,

    // Tenant
    tenantName: tenant?.name ?? 'Ironheart',
    tenantLogoUrl: settings.logoUrl ?? undefined,
    tenantPhone: tenant?.phone ?? undefined,
    tenantEmail: tenant?.email ?? undefined,
    tenantWebsite: tenant?.website ?? undefined,
    tenantAddress: settings.address ?? undefined,

    // Links
    portalUrl,
    reviewUrl,
  }
}

// ─── Formatting Helpers ────────────────────────────────────────────────────────

/** Format a Date to "Monday, 15 February 2026" */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Format "HH:MM" to "2:30 PM" */
function formatTime(time: string): string {
  const [hoursStr, minutesStr] = time.split(':')
  const hours = parseInt(hoursStr ?? '0', 10)
  const minutes = parseInt(minutesStr ?? '0', 10)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/** Format minutes to "1 hour 30 minutes" */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hourPart = `${h} hour${h === 1 ? '' : 's'}`
  if (m === 0) return hourPart
  return `${hourPart} ${m} minute${m === 1 ? '' : 's'}`
}

/** Extract a formatted address string from the locationAddress JSON */
function formatAddress(address: Record<string, unknown> | null): string | undefined {
  if (!address) return undefined
  const parts = [
    address['line1'],
    address['line2'],
    address['city'],
    address['postcode'],
  ].filter((p): p is string => typeof p === 'string' && p.length > 0)
  return parts.length > 0 ? parts.join(', ') : undefined
}

/** Extract city from locationAddress JSON */
function extractCity(address: Record<string, unknown> | null): string | undefined {
  if (!address) return undefined
  const city = address['city']
  return typeof city === 'string' && city.length > 0 ? city : undefined
}
