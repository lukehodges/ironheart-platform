"use client"

import { useState, useMemo } from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DataGrid } from "@/components/data-grid"
import type {
  DataGridColumn,
  DataGridRowAction,
  DataGridBulkAction,
  DataGridSortState,
} from "@/components/data-grid"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import BookingStatusBadge from "@/components/bookings/booking-status-badge"
import type { BookingRecord } from "@/modules/booking/booking.types"
import { Eye, CheckCircle, XCircle, CalendarClock, CheckSquare, X } from "lucide-react"
import type { BookingFilters } from "@/components/bookings/bookings-filters"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDateTime(date: Date | string, time: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return `${dateStr} at ${time}`
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "yesterday"
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} months ago`
  return `${Math.floor(diffMonths / 12)} years ago`
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: DataGridColumn<BookingRecord>[] = [
  {
    id: "status",
    label: "Status",
    hideable: true,
    sortable: true,
    width: "w-28",
    cell: (row) => <BookingStatusBadge status={row.status} />,
    csvValue: (row) => row.status,
  },
  {
    id: "customer",
    label: "Customer",
    hideable: true,
    width: "min-w-[160px]",
    cell: (row) => (
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-6 w-6 shrink-0 text-[10px]">
          <AvatarFallback>{getInitials(row.customerName ?? "?")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.customerName ?? "Unknown customer"}
          </p>
          <p className="truncate text-xs text-muted-foreground">#{row.bookingNumber}</p>
        </div>
      </div>
    ),
    csvValue: (row) => row.customerName ?? row.customerId,
  },
  {
    id: "service",
    label: "Service",
    hideable: true,
    cell: (row) => (
      <span className="text-sm text-foreground">
        {row.customServiceName ?? row.serviceName ?? "Unknown service"}
      </span>
    ),
    csvValue: (row) => row.customServiceName ?? row.serviceName ?? row.serviceId,
  },
  {
    id: "staff",
    label: "Staff",
    hideable: true,
    cell: (row) =>
      row.staffId ? (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0 text-[10px]">
            <AvatarImage src={row.staffAvatarUrl ?? undefined} alt={row.staffName ?? "Staff"} />
            <AvatarFallback>{getInitials(row.staffName ?? "?")}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-foreground">
            {row.staffName ?? "Unknown staff"}
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Unassigned</span>
      ),
    csvValue: (row) => row.staffName ?? row.staffId ?? "",
  },
  {
    id: "scheduledDate",
    label: "Date / Time",
    hideable: true,
    sortable: true,
    width: "min-w-[160px]",
    cell: (row) => (
      <span className="text-sm text-foreground">
        {formatDateTime(row.scheduledDate, row.scheduledTime)}
      </span>
    ),
    csvValue: (row) =>
      `${new Date(row.scheduledDate).toISOString().slice(0, 10)} ${row.scheduledTime}`,
  },
  {
    id: "createdAt",
    label: "Created",
    hideable: true,
    sortable: true,
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{formatRelativeTime(row.createdAt)}</span>
    ),
    csvValue: (row) => new Date(row.createdAt).toISOString(),
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BookingsTableProps {
  filters: BookingFilters
  onRowClick: (bookingId: string) => void
}

export function BookingsTable({ filters, onRowClick }: BookingsTableProps) {
  const utils = api.useUtils()

  // Pagination state
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Sort state
  const [sort, setSort] = useState<DataGridSortState>({ field: "scheduledDate", direction: "desc" })

  // Debounce search
  const debouncedSearch = useDebounce(filters.search, 300)

  // Build query input
  const queryInput = useMemo(() => {
    const input: {
      limit: number
      cursor?: string
      search?: string
      staffId?: string
      startDate?: Date
      endDate?: Date
      status?: BookingRecord["status"]
    } = {
      limit: filters.limit,
      cursor: currentCursor,
    }

    if (debouncedSearch) input.search = debouncedSearch
    if (filters.staffId) input.staffId = filters.staffId
    if (filters.dateFrom) input.startDate = new Date(filters.dateFrom + "T00:00:00")
    if (filters.dateTo) input.endDate = new Date(filters.dateTo + "T23:59:59")
    if (filters.statuses.length === 1) {
      input.status = filters.statuses[0] as BookingRecord["status"]
    }

    return input
  }, [filters.limit, filters.staffId, filters.dateFrom, filters.dateTo, filters.statuses, debouncedSearch, currentCursor])

  const { data, isLoading, error } = api.booking.list.useQuery(queryInput, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const rows: BookingRecord[] = (data as unknown as { rows?: BookingRecord[] })?.rows ?? []
  const hasMore: boolean = (data as unknown as { hasMore?: boolean })?.hasMore ?? false

  // Client-side sort
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sort.field === "scheduledDate") {
        const aVal = new Date(a.scheduledDate).getTime()
        const bVal = new Date(b.scheduledDate).getTime()
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal
      }
      if (sort.field === "createdAt") {
        const aVal = new Date(a.createdAt).getTime()
        const bVal = new Date(b.createdAt).getTime()
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal
      }
      // status — alphabetical
      return sort.direction === "asc"
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status)
    })
  }, [rows, sort])

  // Multi-status client-side filter
  const displayRows = useMemo(() => {
    if (filters.statuses.length <= 1) return sortedRows
    return sortedRows.filter((r) => filters.statuses.includes(r.status))
  }, [sortedRows, filters.statuses])

  // Mutations
  const confirmMutation = api.approval.approveBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking confirmed")
      void utils.booking.list.invalidate()
    },
    onError: (err) => toast.error(err.message ?? "Failed to confirm booking"),
  })

  const cancelMutation = api.booking.cancel.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled")
      void utils.booking.list.invalidate()
    },
    onError: (err) => toast.error(err.message ?? "Failed to cancel booking"),
  })

  // Row actions
  const rowActions: DataGridRowAction<BookingRecord>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (row) => onRowClick(row.id),
    },
    {
      label: "Confirm",
      icon: CheckCircle,
      onClick: (row) => confirmMutation.mutate({ bookingId: row.id }),
      isVisible: (row) => ["PENDING", "APPROVED", "RESERVED"].includes(row.status),
      isPending: (row) => confirmMutation.isPending && confirmMutation.variables?.bookingId === row.id,
    },
    {
      label: "Reschedule",
      icon: CalendarClock,
      isDisabled: () => true,
      onClick: () => {},
    },
    {
      label: "Cancel",
      icon: XCircle,
      variant: "destructive",
      separator: true,
      onClick: (row) => cancelMutation.mutate({ id: row.id }),
      isVisible: (row) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(row.status),
      isPending: (row) => cancelMutation.isPending && cancelMutation.variables?.id === row.id,
    },
  ]

  // Bulk actions
  const bulkActions: DataGridBulkAction<BookingRecord>[] = [
    {
      label: "Approve",
      icon: CheckSquare,
      isPending: confirmMutation.isPending,
      isApplicable: (row) => ["PENDING", "APPROVED", "RESERVED"].includes(row.status),
      onAction: (rows) => {
        rows.forEach((r) => confirmMutation.mutate({ bookingId: r.id }))
        toast.success(`Approving ${rows.length} bookings...`)
      },
    },
    {
      label: "Cancel",
      icon: X,
      variant: "destructive",
      isPending: cancelMutation.isPending,
      isApplicable: (row) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(row.status),
      onAction: (rows) => {
        rows.forEach((r) => cancelMutation.mutate({ id: r.id }))
        toast.success(`Cancelling ${rows.length} bookings...`)
      },
    },
  ]

  return (
    <DataGrid
      columns={columns}
      data={displayRows}
      hasMore={hasMore}
      isLoading={isLoading}
      error={error?.message ?? null}
      onRowClick={(row) => onRowClick(row.id)}
      sort={sort}
      onSortChange={setSort}
      pageSize={filters.limit}
      onNextPage={(cursor) => {
        setCursorStack((prev) => [...prev, currentCursor ?? ""])
        setCurrentCursor(cursor)
      }}
      onPrevPage={() => {
        const newStack = [...cursorStack]
        const prev = newStack.pop()
        setCursorStack(newStack)
        setCurrentCursor(prev === "" ? undefined : prev)
      }}
      isFirstPage={cursorStack.length === 0}
      selectable
      bulkActions={bulkActions}
      rowActions={rowActions}
      emptyState={{
        title: "No bookings found",
        description: "Try adjusting your filters or create a new booking.",
      }}
      csvFilename="bookings.csv"
    />
  )
}

export default BookingsTable
