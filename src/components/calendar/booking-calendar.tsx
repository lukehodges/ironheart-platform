"use client"

import { useRef, useState, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import type { EventClickArg, DatesSetArg, EventInput, EventDropArg } from "@fullcalendar/core"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"
import type { BookingStatus } from "@/modules/booking/booking.types"
import "./calendar.css"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map booking status → hex color for calendar events */
const STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING:     "#f59e0b",
  RESERVED:    "#f59e0b",
  RELEASED:    "#6b7280",
  APPROVED:    "#22c55e",
  CONFIRMED:   "#22c55e",
  IN_PROGRESS: "#3b82f6",
  COMPLETED:   "#6b7280",
  CANCELLED:   "#ef4444",
  REJECTED:    "#ef4444",
  NO_SHOW:     "#ef4444",
}

/** Combine scheduledDate + scheduledTime → ISO string FullCalendar can use */
function toISOStart(date: Date | string, time: string): string {
  const d = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10)
  return `${d}T${time}:00`
}

/** Add durationMinutes to a start ISO string → end ISO string */
function addMinutes(isoStr: string, minutes: number): string {
  const ms = new Date(isoStr).getTime() + minutes * 60_000
  return new Date(ms).toISOString()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingCalendarProps {
  /** When non-empty, only bookings for these staff IDs are shown */
  selectedStaffIds: string[]
  /** Called when the user clicks an event */
  onEventClick: (bookingId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingCalendar({ selectedStaffIds, onEventClick }: BookingCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Track the current visible date range so we can re-fetch when the user navigates
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const now = new Date()
    // Default to current week
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return { start, end }
  })

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const { data: rawBookings, isFetching } = api.booking.listForCalendar.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      // NOTE: the router only accepts a single staffId; multi-staff filter is
      // applied client-side below when selectedStaffIds.length > 1
      staffId: selectedStaffIds.length === 1 ? selectedStaffIds[0] : undefined,
    },
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  )

  // ---------------------------------------------------------------------------
  // Build FullCalendar events
  // ---------------------------------------------------------------------------

  const events: EventInput[] = (rawBookings ?? [])
    // Client-side staff filter when multiple staff are selected
    .filter((b) => {
      if (selectedStaffIds.length === 0) return true
      if (!b.staffId) return false
      return selectedStaffIds.includes(b.staffId)
    })
    .map((b) => {
      const customerLabel = b.customerId ? "Customer" : "Unknown"
      const serviceLabel = b.customServiceName ?? "Booking"
      const start = toISOStart(b.scheduledDate, b.scheduledTime)
      const end = b.endTime
        ? toISOStart(b.scheduledDate, b.endTime)
        : addMinutes(start, b.durationMinutes)

      return {
        id: b.id,
        title: `${customerLabel} - ${serviceLabel}`,
        start,
        end,
        backgroundColor: STATUS_COLOR[b.status],
        borderColor: STATUS_COLOR[b.status],
        textColor: "#ffffff",
        extendedProps: {
          bookingId: b.id,
          status: b.status,
          staffId: b.staffId,
        },
      } satisfies EventInput
    })

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const utils = api.useUtils()

  const updateMutation = api.booking.update.useMutation({
    onSuccess: () => {
      void utils.booking.listForCalendar.invalidate()
    },
    onError: (err, _vars, context) => {
      toast.error(err.message ?? "Failed to reschedule booking")
      // Revert the optimistic drag by re-fetching
      void utils.booking.listForCalendar.invalidate()
      // Also instruct FullCalendar to revert via the context flag
      if (context && typeof context === "object" && "revert" in context) {
        (context as { revert: () => void }).revert()
      }
    },
  })

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({ start: arg.start, end: arg.end })
  }, [])

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const bookingId = arg.event.extendedProps.bookingId as string | undefined
      if (bookingId) onEventClick(bookingId)
    },
    [onEventClick]
  )

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      const bookingId = arg.event.extendedProps.bookingId as string | undefined
      if (!bookingId) {
        arg.revert()
        return
      }

      const newStart = arg.event.start
      if (!newStart) {
        arg.revert()
        return
      }

      const scheduledDate = new Date(newStart)
      scheduledDate.setHours(0, 0, 0, 0)

      const hours = String(newStart.getHours()).padStart(2, "0")
      const minutes = String(newStart.getMinutes()).padStart(2, "0")
      const scheduledTime = `${hours}:${minutes}`

      updateMutation.mutate(
        {
          id: bookingId,
          scheduledDate,
          scheduledTime,
        },
        {
          // Attach revert so the error handler can call it
          onError: () => {
            arg.revert()
          },
        }
      )
    },
    [updateMutation]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Loading overlay */}
      {isFetching && (
        <div className="fc-calendar-loading-overlay" aria-label="Loading calendar events">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2 w-24" />
          </div>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        /* Enterprise density */
        height="auto"
        contentHeight={640}
        expandRows
        /* Events */
        events={events}
        /* Interaction */
        editable
        selectable
        selectMirror
        dayMaxEvents
        /* Handlers */
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        /* Accessibility */
        eventDisplay="block"
        nowIndicator
        /* Styling */
        dayHeaderFormat={{ weekday: "short", day: "numeric" }}
        slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        /* Business hours hint */
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "18:00",
        }}
      />
    </div>
  )
}

export { BookingCalendar }
export type { BookingCalendarProps }
