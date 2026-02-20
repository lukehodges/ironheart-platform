/**
 * Calendar link generators for Google Calendar, Apple Calendar, and Outlook
 *
 * Generates URLs and data URIs for "Add to Calendar" functionality.
 * Does not use any React hooks - pure utility functions.
 */

export interface CalendarEvent {
  title: string
  description: string
  startTime: Date
  endTime: Date
  location?: string
}

/**
 * Generates Google Calendar add link
 *
 * @example
 * ```ts
 * const link = generateGoogleCalendarLink({
 *   title: "Haircut Appointment",
 *   description: "Haircut with Jane Doe",
 *   startTime: new Date("2024-01-15T10:00:00"),
 *   endTime: new Date("2024-01-15T11:00:00"),
 *   location: "123 Main St, London"
 * })
 * // Returns: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...
 * ```
 */
export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    dates: `${formatGoogleDate(event.startTime)}/${formatGoogleDate(event.endTime)}`,
  })

  if (event.location) {
    params.set("location", event.location)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generates Apple Calendar (.ics) data URI
 *
 * Returns a data URI that can be used as a download link.
 * When clicked, triggers download of an .ics file that opens in Calendar.app
 *
 * @example
 * ```tsx
 * const icsData = generateAppleCalendarLink(event)
 * <a href={icsData} download="event.ics">Add to Apple Calendar</a>
 * ```
 */
export function generateAppleCalendarLink(event: CalendarEvent): string {
  const icsContent = generateICSContent(event)
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
  return URL.createObjectURL(blob)
}

/**
 * Generates Outlook Calendar link (web version)
 *
 * Works for Outlook.com and Office 365 web calendars.
 *
 * @example
 * ```ts
 * const link = generateOutlookCalendarLink(event)
 * // Returns: https://outlook.live.com/calendar/0/action/compose?subject=...
 * ```
 */
export function generateOutlookCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.description,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
  })

  if (event.location) {
    params.set("location", event.location)
  }

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`
}

/**
 * Generates Office 365 Calendar link (for enterprise Outlook)
 *
 * Similar to Outlook but uses the Office 365 domain.
 */
export function generateOffice365CalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.description,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
  })

  if (event.location) {
    params.set("location", event.location)
  }

  return `https://outlook.office.com/calendar/0/action/compose?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format date for Google Calendar (YYYYMMDDTHHmmssZ)
 */
function formatGoogleDate(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d{3}/g, "")
}

/**
 * Format date for ICS files (YYYYMMDDTHHmmssZ)
 */
function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d{3}/g, "")
}

/**
 * Generate ICS file content for Apple Calendar and other calendar apps
 *
 * Follows RFC 5545 (iCalendar) specification.
 */
function generateICSContent(event: CalendarEvent): string {
  const now = new Date()
  const dtstamp = formatICSDate(now)
  const dtstart = formatICSDate(event.startTime)
  const dtend = formatICSDate(event.endTime)

  // Generate unique ID for the event
  const uid = `${dtstamp}-${Math.random().toString(36).substring(2, 9)}@ironheart.app`

  // Escape special characters in ICS format
  const escapeICS = (str: string) =>
    str.replace(/[\\,;]/g, (match) => `\\${match}`).replace(/\n/g, "\\n")

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ironheart//Booking Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
  ]

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`)
  }

  lines.push("STATUS:CONFIRMED", "SEQUENCE:0", "END:VEVENT", "END:VCALENDAR")

  return lines.join("\r\n")
}

/**
 * Generate a downloadable .ics file for universal calendar support
 *
 * Alternative to generateAppleCalendarLink - creates an actual file download
 * instead of a data URI. Useful for supporting all calendar apps.
 *
 * @example
 * ```tsx
 * function DownloadCalendarButton({ event }: { event: CalendarEvent }) {
 *   const handleDownload = () => {
 *     downloadICSFile(event, "appointment.ics")
 *   }
 *   return <Button onClick={handleDownload}>Download .ics</Button>
 * }
 * ```
 */
export function downloadICSFile(event: CalendarEvent, filename = "event.ics"): void {
  const icsContent = generateICSContent(event)
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  // Create temporary link and trigger download
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
