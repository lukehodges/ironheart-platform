"use client"

import { useState } from "react"
import { CalendarPlus } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import BookingDetailSheet from "@/components/bookings/booking-detail-sheet"
import NewBookingWizard from "@/components/bookings/new-booking-wizard"
import StaffFilterChips from "@/components/calendar/staff-filter-chips"
import BookingCalendar from "@/components/calendar/booking-calendar"
import { api } from "@/lib/trpc/react"

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])

  const utils = api.useUtils()

  const handleEventClick = (bookingId: string) => {
    setSelectedBookingId(bookingId)
  }

  const handleSheetClose = () => {
    setSelectedBookingId(null)
  }

  const handleWizardSuccess = () => {
    // Invalidate the calendar query so new booking appears immediately
    void utils.booking.listForCalendar.invalidate()
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Calendar"
        description="View and manage bookings across all staff."
      >
        <Button
          size="sm"
          onClick={() => setIsWizardOpen(true)}
          aria-label="Create new booking"
        >
          <CalendarPlus className="h-4 w-4" />
          New Booking
        </Button>
      </PageHeader>

      {/* Staff filter row */}
      <StaffFilterChips
        selectedIds={selectedStaffIds}
        onChange={setSelectedStaffIds}
      />

      {/* Calendar */}
      <BookingCalendar
        selectedStaffIds={selectedStaffIds}
        onEventClick={handleEventClick}
      />

      {/* Booking detail sheet — mounted at root so it slides over the calendar */}
      <BookingDetailSheet
        bookingId={selectedBookingId}
        onClose={handleSheetClose}
      />

      {/* New booking wizard dialog */}
      <NewBookingWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
