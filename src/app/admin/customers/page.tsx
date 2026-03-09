"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet"
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog"
import { CustomerEditDialog } from "@/components/customers/customer-edit-dialog"
import { CustomerSearchDialog } from "@/components/customers/customer-search-dialog"
import { CustomerMergeDialog } from "@/components/customers/customer-merge-dialog"
import type { CustomerRecord } from "@/modules/customer/customer.types"

// ---------------------------------------------------------------------------
// Per-row aggregate component (N+1 accepted for now - see U3.9)
// ---------------------------------------------------------------------------

function CustomerAggregateCell({
  customerId,
  field,
}: {
  customerId: string
  field: "bookings" | "spend" | "lastBooking"
}) {
  const { data, isLoading } = api.customer.getBookingHistory.useQuery(
    { customerId },
    { staleTime: 5 * 60 * 1000 },
  )

  if (isLoading) return <Skeleton className="h-4 w-12 inline-block" />

  const bookings = data ?? []

  if (field === "bookings") {
    return (
      <span className="text-sm tabular-nums">{bookings.length}</span>
    )
  }

  if (field === "spend") {
    const total = bookings.reduce(
      (sum, b) => sum + (b.totalAmount ?? 0),
      0,
    )
    // Format as currency - assumes GBP for now
    const formatted =
      total > 0
        ? new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "GBP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(total)
        : " - "
    return <span className="text-sm tabular-nums">{formatted}</span>
  }

  // lastBooking
  if (bookings.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">{" - "}</span>
    )
  }

  const sorted = [...bookings].sort(
    (a, b) =>
      new Date(b.scheduledDate).getTime() -
      new Date(a.scheduledDate).getTime(),
  )
  const lastDate = sorted[0]?.scheduledDate ?? null

  return (
    <span className="text-xs text-muted-foreground">
      {formatRelativeDate(lastDate)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25

function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
  const isFuture = diffMs < 0

  if (diffDays === 0) return "Today"

  if (isFuture) {
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `in ${diffDays} days`
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)}w`
    if (diffDays < 365) return `in ${Math.floor(diffDays / 30)}mo`
    return `in ${Math.floor(diffDays / 365)}y`
  }

  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Customer row
// ---------------------------------------------------------------------------

interface CustomerRowProps {
  customer: CustomerRecord
  onView: (id: string) => void
  onEdit: (id: string) => void
  onMerge: (id: string) => void
}

function CustomerRow({ customer, onView, onEdit, onMerge }: CustomerRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onView(customer.id)}
      aria-label={`View customer ${customer.name}`}
    >
      {/* Name + Avatar */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage
              src={customer.avatarUrl ?? undefined}
              alt={customer.name}
            />
            <AvatarFallback className="text-xs">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm text-foreground truncate max-w-[160px]">
            {customer.name}
          </span>
        </div>
      </TableCell>

      {/* Email */}
      <TableCell>
        <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
          {customer.email ?? <span className="italic text-xs">-</span>}
        </span>
      </TableCell>

      {/* Phone */}
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {customer.phone ?? <span className="italic text-xs">-</span>}
        </span>
      </TableCell>

      {/* Total Bookings */}
      <TableCell>
        <CustomerAggregateCell customerId={customer.id} field="bookings" />
      </TableCell>

      {/* Total Spend */}
      <TableCell>
        <CustomerAggregateCell customerId={customer.id} field="spend" />
      </TableCell>

      {/* Last Booking */}
      <TableCell>
        <CustomerAggregateCell customerId={customer.id} field="lastBooking" />
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={customer.isActive ? "success" : "secondary"}
          className="text-[10px]"
        >
          {customer.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${customer.name}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(customer.id)}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(customer.id)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onMerge(customer.id)}
            >
              Merge into another customer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Sheet / dialog state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editState, setEditState] = useState<{ open: boolean; customerId: string }>({
    open: false,
    customerId: "",
  })
  const [mergeSearchOpen, setMergeSearchOpen] = useState(false)
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string | null>(null)
  const [mergeState, setMergeState] = useState<{
    open: boolean
    primaryId: string
    secondaryId: string
  }>({ open: false, primaryId: "", secondaryId: "" })

  // Derive isActive filter
  const isActiveFilter =
    statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined

  const { data, isLoading, isError, refetch } = api.customer.list.useQuery({
    search: debouncedSearch || undefined,
    isActive: isActiveFilter,
    limit: PAGE_SIZE,
    cursor,
  })

  const rows = (data?.rows ?? []) as CustomerRecord[]
  const hasMore = data?.hasMore ?? false

  // Pagination helpers
  function goToNextPage() {
    if (!hasMore || rows.length === 0) return
    const nextCursor = rows[rows.length - 1]!.id
    setCursorStack((prev) => [...prev, cursor ?? ""])
    setCursor(nextCursor)
  }

  function goToPrevPage() {
    if (cursorStack.length === 0) return
    const prevCursor = cursorStack[cursorStack.length - 1]
    setCursorStack((prev) => prev.slice(0, -1))
    setCursor(prevCursor === "" ? undefined : prevCursor)
  }

  const isFirstPage = cursorStack.length === 0

  // Reset pagination when filters change
  function handleSearchChange(value: string) {
    setSearchInput(value)
    setCursor(undefined)
    setCursorStack([])
  }

  function handleStatusFilter(status: StatusFilter) {
    setStatusFilter(status)
    setCursor(undefined)
    setCursorStack([])
  }

  const handleView = useCallback((id: string) => {
    setSelectedCustomerId(id)
  }, [])

  const handleEditOpen = useCallback((customerId: string) => {
    setEditState({ open: true, customerId })
  }, [])

  const handleMergeOpen = useCallback((secondaryId: string) => {
    setMergeSecondaryId(secondaryId)
    setMergeSearchOpen(true)
  }, [])

  function handleCreateSuccess(customerId: string) {
    setSelectedCustomerId(customerId)
  }

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Customers"
        description="Manage your customer records and history."
      >
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          aria-label="Add new customer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Customer
        </Button>
      </PageHeader>

      {/* Search + filters */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search customers..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search customers"
          />
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusFilter(opt.value)}
              className={[
                "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground border-transparent shadow"
                  : "border-input bg-background text-foreground hover:bg-accent",
              ].join(" ")}
              aria-pressed={statusFilter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-destructive font-medium">
              Failed to load customers
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[80px]">Bookings</TableHead>
                <TableHead className="w-[100px]">Spend</TableHead>
                <TableHead className="w-[100px]">Last Booking</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[48px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      variant={debouncedSearch ? "search" : "users"}
                      title={
                        debouncedSearch
                          ? "No customers found"
                          : "No customers yet"
                      }
                      description={
                        debouncedSearch
                          ? `No customers match "${debouncedSearch}". Try adjusting your search.`
                          : "Add your first customer to get started."
                      }
                      action={
                        !debouncedSearch
                          ? {
                              label: "Add Customer",
                              onClick: () => setCreateDialogOpen(true),
                            }
                          : undefined
                      }
                    />
                  </td>
                </TableRow>
              ) : (
                rows.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    onView={handleView}
                    onEdit={handleEditOpen}
                    onMerge={handleMergeOpen}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {rows.length} customer{rows.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToPrevPage}
              disabled={isFirstPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToNextPage}
              disabled={!hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      <CustomerDetailSheet
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onEdit={(id) => {
          setEditState({ open: true, customerId: id })
        }}
      />

      {/* Create dialog */}
      <CustomerCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit dialog */}
      {editState.customerId && (
        <CustomerEditDialog
          customerId={editState.customerId}
          open={editState.open}
          onOpenChange={(open) =>
            setEditState((prev) => ({ ...prev, open }))
          }
        />
      )}

      {/* Merge search dialog - pick the primary (target) customer */}
      <CustomerSearchDialog
        open={mergeSearchOpen}
        onOpenChange={setMergeSearchOpen}
        excludeId={mergeSecondaryId ?? undefined}
        title="Select Target Customer"
        description="Choose the customer to merge into. The selected customer will be kept."
        onSelect={(primary) => {
          setMergeSearchOpen(false)
          if (mergeSecondaryId) {
            setMergeState({
              open: true,
              primaryId: primary.id,
              secondaryId: mergeSecondaryId,
            })
          }
        }}
      />

      {/* Merge confirmation dialog */}
      {mergeState.open && mergeState.primaryId && mergeState.secondaryId && (
        <CustomerMergeDialog
          open={mergeState.open}
          onOpenChange={(open) =>
            setMergeState((prev) => ({ ...prev, open }))
          }
          primaryCustomerId={mergeState.primaryId}
          secondaryCustomerId={mergeState.secondaryId}
          onSuccess={() => {
            setMergeState({ open: false, primaryId: "", secondaryId: "" })
            setMergeSecondaryId(null)
            setSelectedCustomerId(null)
          }}
        />
      )}
    </div>
  )
}
