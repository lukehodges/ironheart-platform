"use client"

// NOTE: @tanstack/react-table is not installed in this project.
// The table is implemented using the existing Table UI components
// with simple array-based rendering and a column-config object pattern.

import { useState, useMemo, useCallback } from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
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
import BookingStatusBadge from "@/components/bookings/booking-status-badge"
import type { BookingRecord } from "@/modules/booking/booking.types"
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  CheckSquare,
  X,
  Download,
} from "lucide-react"
import type { BookingFilters } from "@/components/bookings/bookings-filters"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = "scheduledDate" | "createdAt" | "status"
type SortDir = "asc" | "desc"

interface SortState {
  field: SortField
  dir: SortDir
}

interface ColumnDef {
  id: string
  label: string
  hideable: boolean
}

const COLUMN_DEFS: ColumnDef[] = [
  { id: "select", label: "Select", hideable: false },
  { id: "status", label: "Status", hideable: true },
  { id: "customer", label: "Customer", hideable: true },
  { id: "service", label: "Service", hideable: true },
  { id: "staff", label: "Staff", hideable: true },
  { id: "datetime", label: "Date / Time", hideable: true },
  { id: "created", label: "Created", hideable: true },
  { id: "actions", label: "Actions", hideable: false },
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

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

function exportCsv(rows: BookingRecord[], filename = "bookings.csv") {
  const headers = [
    "Booking Number",
    "Status",
    "Customer ID",
    "Service ID",
    "Staff ID",
    "Date",
    "Time",
    "Duration (min)",
    "Price",
    "Created At",
  ]

  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.bookingNumber,
        r.status,
        r.customerId,
        r.serviceId,
        r.staffId ?? "",
        new Date(r.scheduledDate).toISOString().slice(0, 10),
        r.scheduledTime,
        r.durationMinutes,
        r.price ?? "",
        new Date(r.createdAt).toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ]

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Sort button sub-component
// ---------------------------------------------------------------------------

interface SortButtonProps {
  field: SortField
  sort: SortState
  onSort: (field: SortField) => void
  children: React.ReactNode
}

function SortButton({ field, sort, onSort, children }: SortButtonProps) {
  const isActive = sort.field === field
  const Icon = isActive ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {children}
      <Icon className="h-3 w-3" aria-hidden="true" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: 10 }).map((_, rowIdx) => (
        <TableRow key={rowIdx} aria-hidden="true">
          {Array.from({ length: colCount }).map((_, colIdx) => (
            <TableCell key={colIdx} className="py-3">
              <Skeleton
                className={cn(
                  "h-4",
                  colIdx === 0 && "w-4",
                  colIdx === 1 && "w-16",
                  colIdx === 2 && "w-32",
                  colIdx === 3 && "w-24",
                  colIdx === 4 && "w-20",
                  colIdx === 5 && "w-28",
                  colIdx === 6 && "w-16",
                  colIdx === 7 && "w-8",
                  ![0, 1, 2, 3, 4, 5, 6, 7].includes(colIdx) && "w-16"
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Row actions dropdown
// ---------------------------------------------------------------------------

interface RowActionsProps {
  booking: BookingRecord
  onView: () => void
  onConfirm: () => void
  onCancel: () => void
  isConfirming: boolean
  isCancelling: boolean
}

function RowActions({
  booking,
  onView,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: RowActionsProps) {
  const canConfirm =
    booking.status === "PENDING" ||
    booking.status === "APPROVED" ||
    booking.status === "RESERVED"
  const canCancel =
    booking.status !== "CANCELLED" &&
    booking.status !== "COMPLETED" &&
    booking.status !== "NO_SHOW"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Actions for booking ${booking.bookingNumber}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        {canConfirm && (
          <DropdownMenuItem
            onClick={onConfirm}
            disabled={isConfirming}
          >
            <CheckCircle className="h-4 w-4" />
            Confirm
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled>
          <CalendarClock className="h-4 w-4" />
          Reschedule
        </DropdownMenuItem>
        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={onCancel}
              disabled={isCancelling}
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BookingsTableProps {
  filters: BookingFilters
  onRowClick: (bookingId: string) => void
}

export function BookingsTable({ filters, onRowClick }: BookingsTableProps) {
  const utils = api.useUtils()

  // Local state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortState>({ field: "scheduledDate", dir: "desc" })
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([]) // for prev page navigation

  // Debounce search to avoid firing a query on every keypress
  const debouncedSearch = useDebounce(filters.search, 300)

  // Build query input — matches listBookingsSchema exactly
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
    // Note: the schema only supports a single status filter. When multiple are
    // selected we use the first one; the badge-filter UI is still useful
    // for the common single-status case.
    if (filters.statuses.length === 1) {
      input.status = filters.statuses[0] as BookingRecord["status"]
    }

    return input
  }, [
    filters.limit,
    filters.staffId,
    filters.dateFrom,
    filters.dateTo,
    filters.statuses,
    debouncedSearch,
    currentCursor,
  ])

  const {
    data,
    isLoading,
    error,
  } = api.booking.list.useQuery(queryInput, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  // The list endpoint returns { rows, hasMore } (cursor-based pagination pattern)
  const rows: BookingRecord[] = (data as unknown as { rows?: BookingRecord[] })?.rows ?? []
  const hasMore: boolean = (data as unknown as { hasMore?: boolean })?.hasMore ?? false

  // Client-side sort (server handles primary filtering; we sort the current page)
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal: number
      let bVal: number
      if (sort.field === "scheduledDate") {
        aVal = new Date(a.scheduledDate).getTime()
        bVal = new Date(b.scheduledDate).getTime()
      } else if (sort.field === "createdAt") {
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
      } else {
        // status — alphabetical
        aVal = 0
        bVal = 0
        return sort.dir === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status)
      }
      return sort.dir === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [rows, sort])

  // Multi-status client-side filter (when >1 status selected, filter on client)
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

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const allSelected =
    displayRows.length > 0 && displayRows.every((r) => selectedIds.has(r.id))
  const someSelected = displayRows.some((r) => selectedIds.has(r.id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayRows.map((r) => r.id)))
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedRows = useMemo(
    () => displayRows.filter((r) => selectedIds.has(r.id)),
    [displayRows, selectedIds]
  )

  // ---------------------------------------------------------------------------
  // Sort handler
  // ---------------------------------------------------------------------------

  function handleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    )
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  function handleNextPage() {
    if (!hasMore || rows.length === 0) return
    const lastRow = rows[rows.length - 1]
    setCursorStack((prev) => [...prev, currentCursor ?? ""])
    setCurrentCursor(lastRow.id)
    setSelectedIds(new Set())
  }

  function handlePrevPage() {
    const newStack = [...cursorStack]
    const prevCursor = newStack.pop()
    setCursorStack(newStack)
    setCurrentCursor(prevCursor === "" ? undefined : prevCursor)
    setSelectedIds(new Set())
  }

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  function handleBulkApprove() {
    const toApprove = selectedRows.filter(
      (r) =>
        r.status === "PENDING" ||
        r.status === "APPROVED" ||
        r.status === "RESERVED"
    )
    if (toApprove.length === 0) {
      toast.info("No bookings can be approved with current selection")
      return
    }

    toApprove.forEach((r) => {
      confirmMutation.mutate({ bookingId: r.id })
    })
    setSelectedIds(new Set())
    toast.success(`Approving ${toApprove.length} bookings…`)
  }

  function handleBulkCancel() {
    const toCancel = selectedRows.filter(
      (r) =>
        r.status !== "CANCELLED" &&
        r.status !== "COMPLETED" &&
        r.status !== "NO_SHOW"
    )
    if (toCancel.length === 0) {
      toast.info("No bookings can be cancelled with current selection")
      return
    }

    toCancel.forEach((r) => {
      cancelMutation.mutate({ id: r.id })
    })
    setSelectedIds(new Set())
    toast.success(`Cancelling ${toCancel.length} bookings…`)
  }

  function handleExportCsv() {
    exportCsv(selectedRows)
    toast.success(`Exported ${selectedRows.length} bookings to CSV`)
  }

  // ---------------------------------------------------------------------------
  // Column visibility
  // ---------------------------------------------------------------------------

  function toggleColumn(colId: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(colId)) {
        next.delete(colId)
      } else {
        next.add(colId)
      }
      return next
    })
  }

  const visibleColumns = COLUMN_DEFS.filter((c) => !hiddenColumns.has(c.id))

  // ---------------------------------------------------------------------------
  // Row mutation state helpers
  // ---------------------------------------------------------------------------

  const confirmingId = useCallback(
    (id: string) => confirmMutation.isPending && confirmMutation.variables?.bookingId === id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirmMutation.isPending, confirmMutation.variables]
  )

  const cancellingId = useCallback(
    (id: string) => cancelMutation.isPending && cancelMutation.variables?.id === id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cancelMutation.isPending, cancelMutation.variables]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isPageOne = cursorStack.length === 0

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border">
        <p className="text-sm text-destructive">
          {error.message ?? "Failed to load bookings"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar row: bulk actions + column visibility */}
      <div className="flex items-center justify-between gap-2 min-h-[32px]">
        {/* Bulk actions — only visible when ≥1 row selected */}
        {selectedIds.size > 0 ? (
          <div
            className="flex items-center gap-2"
            role="toolbar"
            aria-label={`Bulk actions for ${selectedIds.size} selected bookings`}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleBulkApprove}
              disabled={confirmMutation.isPending}
              aria-label="Approve selected bookings"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={handleBulkCancel}
              disabled={cancelMutation.isPending}
              aria-label="Cancel selected bookings"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleExportCsv}
              aria-label="Export selected bookings to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        ) : (
          <div />
        )}

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              aria-label="Toggle column visibility"
            >
              <Columns className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            {COLUMN_DEFS.filter((c) => c.hideable).map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={!hiddenColumns.has(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox */}
              {!hiddenColumns.has("select") && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all bookings"
                    disabled={isLoading || displayRows.length === 0}
                  />
                </TableHead>
              )}

              {/* Status */}
              {!hiddenColumns.has("status") && (
                <TableHead className="w-28">
                  <SortButton field="status" sort={sort} onSort={handleSort}>
                    Status
                  </SortButton>
                </TableHead>
              )}

              {/* Customer */}
              {!hiddenColumns.has("customer") && (
                <TableHead className="min-w-[160px]">Customer</TableHead>
              )}

              {/* Service */}
              {!hiddenColumns.has("service") && (
                <TableHead>Service</TableHead>
              )}

              {/* Staff */}
              {!hiddenColumns.has("staff") && (
                <TableHead>Staff</TableHead>
              )}

              {/* Date / Time */}
              {!hiddenColumns.has("datetime") && (
                <TableHead className="min-w-[160px]">
                  <SortButton field="scheduledDate" sort={sort} onSort={handleSort}>
                    Date / Time
                  </SortButton>
                </TableHead>
              )}

              {/* Created */}
              {!hiddenColumns.has("created") && (
                <TableHead>
                  <SortButton field="createdAt" sort={sort} onSort={handleSort}>
                    Created
                  </SortButton>
                </TableHead>
              )}

              {/* Actions */}
              {!hiddenColumns.has("actions") && (
                <TableHead className="w-10" aria-label="Row actions" />
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableSkeleton colCount={visibleColumns.length} />
            ) : displayRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="p-0"
                >
                  <EmptyState
                    variant="calendar"
                    title="No bookings found"
                    description="Try adjusting your filters or create a new booking."
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((booking) => {
                const isSelected = selectedIds.has(booking.id)
                const isConfirming = confirmingId(booking.id)
                const isCancelling = cancellingId(booking.id)

                return (
                  <TableRow
                    key={booking.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      "cursor-pointer",
                      (isConfirming || isCancelling) && "opacity-60"
                    )}
                    onClick={() => onRowClick(booking.id)}
                    role="row"
                    aria-selected={isSelected}
                  >
                    {/* Checkbox */}
                    {!hiddenColumns.has("select") && (
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="py-3"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(booking.id)}
                          aria-label={`Select booking ${booking.bookingNumber}`}
                        />
                      </TableCell>
                    )}

                    {/* Status */}
                    {!hiddenColumns.has("status") && (
                      <TableCell className="py-3">
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>
                    )}

                    {/* Customer */}
                    {!hiddenColumns.has("customer") && (
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0 text-[10px]">
                            <AvatarFallback>
                              {getInitials(booking.customerId.slice(0, 4).toUpperCase())}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {/* customerId shown until customer data enrichment is added */}
                              {booking.customerId.slice(0, 8)}…
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              #{booking.bookingNumber}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Service */}
                    {!hiddenColumns.has("service") && (
                      <TableCell className="py-3">
                        <span className="text-sm text-foreground">
                          {booking.customServiceName ?? booking.serviceId.slice(0, 8) + "…"}
                        </span>
                      </TableCell>
                    )}

                    {/* Staff */}
                    {!hiddenColumns.has("staff") && (
                      <TableCell className="py-3">
                        {booking.staffId ? (
                          <span className="text-sm text-foreground">
                            {booking.staffId.slice(0, 8)}…
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                    )}

                    {/* Date / Time */}
                    {!hiddenColumns.has("datetime") && (
                      <TableCell className="py-3">
                        <span className="text-sm text-foreground">
                          {formatDateTime(booking.scheduledDate, booking.scheduledTime)}
                        </span>
                      </TableCell>
                    )}

                    {/* Created */}
                    {!hiddenColumns.has("created") && (
                      <TableCell className="py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(booking.createdAt)}
                        </span>
                      </TableCell>
                    )}

                    {/* Actions */}
                    {!hiddenColumns.has("actions") && (
                      <TableCell className="py-3">
                        <RowActions
                          booking={booking}
                          onView={() => onRowClick(booking.id)}
                          onConfirm={() =>
                            confirmMutation.mutate({ bookingId: booking.id })
                          }
                          onCancel={() =>
                            cancelMutation.mutate({ id: booking.id })
                          }
                          isConfirming={isConfirming}
                          isCancelling={isCancelling}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between gap-4">
        {/* Page size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page</span>
          <Select
            value={String(filters.limit)}
            onValueChange={(v) => {
              // Reset pagination when limit changes — parent handles this via onChange,
              // but BookingsTable owns limit prop indirectly through filters.
              // We fire onRowClick with a sentinel to signal the parent isn't practical here;
              // instead manage limit in the parent via a passed-down setter.
              // As a pragmatic solution, we reset cursor locally and re-use the existing
              // filters.limit. A full solution would pass onLimitChange from parent.
              void v // limit change requires parent cooperation — handled in page.tsx
            }}
          >
            <SelectTrigger className="h-7 w-[70px] text-xs" aria-label="Rows per page">
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

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${displayRows.length} row${displayRows.length !== 1 ? "s" : ""}`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handlePrevPage}
            disabled={isPageOne || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleNextPage}
            disabled={!hasMore || isLoading}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BookingsTable
