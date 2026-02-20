"use client"

import { useState, useCallback } from "react"
import { Calendar } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookingsFilters } from "@/components/bookings/bookings-filters"
import { BookingsTable } from "@/components/bookings/bookings-table"
import BookingDetailSheet from "@/components/bookings/booking-detail-sheet"
import NewBookingWizard from "@/components/bookings/new-booking-wizard"
import { api } from "@/lib/trpc/react"
import type { BookingFilters } from "@/components/bookings/bookings-filters"

// ---------------------------------------------------------------------------
// Default filter state
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: BookingFilters = {
  statuses: [],
  dateFrom: "",
  dateTo: "",
  staffId: "",
  search: "",
  limit: 25,
  cursor: undefined,
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BookingsPage() {
  const utils = api.useUtils()

  // Filter state
  const [filters, setFilters] = useState<BookingFilters>(DEFAULT_FILTERS)

  // Detail sheet state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFiltersChange = useCallback((next: BookingFilters) => {
    setFilters(next)
  }, [])

  const handleRowClick = useCallback((bookingId: string) => {
    setSelectedBookingId(bookingId)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedBookingId(null)
  }, [])

  const handleWizardSuccess = useCallback(() => {
    void utils.booking.list.invalidate()
  }, [utils])

  const handleLimitChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, limit: Number(value), cursor: undefined }))
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Bookings"
        description="Manage all bookings across your organisation."
      >
        {/* Page size control — surfaced at page level for global filter coordination */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Show</span>
          <Select
            value={String(filters.limit)}
            onValueChange={handleLimitChange}
          >
            <SelectTrigger
              className="h-8 w-[70px] text-xs"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={() => setIsWizardOpen(true)}
          aria-label="Create a new booking"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
          New Booking
        </Button>
      </PageHeader>

      {/* Filters toolbar */}
      <BookingsFilters filters={filters} onChange={handleFiltersChange} />

      {/* Data table */}
      <BookingsTable filters={filters} onRowClick={handleRowClick} />

      {/* Detail sheet — mounted at root so it doesn't re-mount on table re-renders */}
      <BookingDetailSheet
        bookingId={selectedBookingId}
        onClose={handleSheetClose}
      />

      {/* New booking wizard */}
      <NewBookingWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
