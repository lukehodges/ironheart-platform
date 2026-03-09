"use client"

import { useRef } from "react"
import { X, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import type { BookingStatus } from "@/modules/booking/booking.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingFilters {
  statuses: string[]
  dateFrom: string
  dateTo: string
  staffId: string
  search: string
  limit: number
  cursor?: string
}

interface BookingsFiltersProps {
  filters: BookingFilters
  onChange: (filters: BookingFilters) => void
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingsFilters({ filters, onChange }: BookingsFiltersProps) {
  // Debounced search - we store the raw (immediate) value locally to keep the
  // input responsive, then propagate the debounced value to the parent.
  const searchInputRef = useRef<HTMLInputElement>(null)

  // We use a controlled pattern: the raw input is tracked via the parent's
  // filters.search (which is set immediately on type for the input value, but
  // the query itself uses the debounced value handled in the table).
  const debouncedSearch = useDebounce(filters.search, 300)
  void debouncedSearch // consumed by parent's query; kept in sync here for clarity

  // Load staff list for the dropdown
  const { data: staffData } = api.team.list.useQuery(
    { status: "ACTIVE", limit: 50 },
    { staleTime: 60_000 }
  )
  const staffMembers = staffData?.rows ?? []

  // Derived: are any filters active?
  const hasActiveFilters =
    filters.statuses.length > 0 ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.staffId ||
    !!filters.search

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function toggleStatus(status: string) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses: next, cursor: undefined })
  }

  function handleSearchChange(value: string) {
    onChange({ ...filters, search: value, cursor: undefined })
  }

  function handleDateFromChange(value: string) {
    onChange({ ...filters, dateFrom: value, cursor: undefined })
  }

  function handleDateToChange(value: string) {
    onChange({ ...filters, dateTo: value, cursor: undefined })
  }

  function handleStaffChange(value: string) {
    onChange({ ...filters, staffId: value === "__all__" ? "" : value, cursor: undefined })
  }

  function handleClear() {
    onChange({
      statuses: [],
      dateFrom: "",
      dateTo: "",
      staffId: "",
      search: "",
      limit: filters.limit,
      cursor: undefined,
    })
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="flex flex-col gap-3"
      role="search"
      aria-label="Booking filters"
    >
      {/* Row 1: Search + Date range + Staff + Clear */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            placeholder="Search bookings…"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-8 text-xs"
            aria-label="Search bookings by name, number or service"
          />
        </div>

        {/* Date from */}
        <div className="flex items-center gap-1">
          <label
            htmlFor="filter-date-from"
            className="shrink-0 text-xs text-muted-foreground"
          >
            From
          </label>
          <Input
            id="filter-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="h-8 w-[130px] text-xs"
            aria-label="Filter from date"
          />
        </div>

        {/* Date to */}
        <div className="flex items-center gap-1">
          <label
            htmlFor="filter-date-to"
            className="shrink-0 text-xs text-muted-foreground"
          >
            To
          </label>
          <Input
            id="filter-date-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="h-8 w-[130px] text-xs"
            aria-label="Filter to date"
          />
        </div>

        {/* Staff dropdown */}
        <Select
          value={filters.staffId || "__all__"}
          onValueChange={handleStaffChange}
        >
          <SelectTrigger
            className="h-8 w-[160px] text-xs"
            aria-label="Filter by staff member"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All staff</SelectItem>
            {staffMembers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            aria-label="Clear all filters"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>

      {/* Row 2: Status badge toggles */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map(({ value, label }) => {
          const isActive = filters.statuses.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleStatus(value)}
              aria-pressed={isActive}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {label}
            </button>
          )
        })}

        {/* Active filter count indicator */}
        {filters.statuses.length > 0 && (
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
            {filters.statuses.length} selected
          </Badge>
        )}
      </div>
    </div>
  )
}

export default BookingsFilters
