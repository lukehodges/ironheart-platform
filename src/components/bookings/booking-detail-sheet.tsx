"use client"

import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import BookingStatusBadge from "@/components/bookings/booking-status-badge"
import type { LocationAddress } from "@/modules/booking/booking.types"
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  DollarSign,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  CalendarClock,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingDetailSheetProps {
  bookingId: string | null
  onClose: () => void
  onCustomerClick?: (customerId: string) => void
}

// ---------------------------------------------------------------------------
// Helper: format date + time
// ---------------------------------------------------------------------------

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount)
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Detail row
// ---------------------------------------------------------------------------

function DetailRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function BookingDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Separator />
      {/* Detail rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5 py-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
      <Separator />
      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingDetailSheet({
  bookingId,
  onClose,
  onCustomerClick,
}: BookingDetailSheetProps) {
  const utils = api.useUtils()

  // Fetch booking
  const {
    data: booking,
    isLoading,
    error,
  } = api.booking.getById.useQuery(
    { id: bookingId! },
    {
      enabled: !!bookingId,
      staleTime: 30_000,
    }
  )

  // Fetch customer (separate query — only when we have customerId)
  const { data: customer } = api.customer.getById.useQuery(
    { id: booking?.customerId ?? "" },
    {
      enabled: !!booking?.customerId,
      staleTime: 60_000,
    }
  )

  // Fetch staff member (via team.getById when staffId is set)
  const { data: staffMember } = api.team.getById.useQuery(
    { userId: booking?.staffId ?? "" },
    {
      enabled: !!booking?.staffId,
      staleTime: 60_000,
    }
  )

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const invalidate = () => {
    void utils.booking.getById.invalidate({ id: bookingId! })
    void utils.booking.list.invalidate()
    void utils.booking.listForCalendar.invalidate()
  }

  const confirmMutation = api.approval.approveBooking.useMutation({
    onMutate: () => {
      toast.loading("Confirming booking…", { id: "booking-action" })
    },
    onSuccess: () => {
      toast.success("Booking confirmed", { id: "booking-action" })
      invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to confirm booking", { id: "booking-action" })
    },
  })

  const cancelMutation = api.booking.cancel.useMutation({
    onMutate: () => {
      toast.loading("Cancelling booking…", { id: "booking-action" })
    },
    onSuccess: () => {
      toast.success("Booking cancelled", { id: "booking-action" })
      invalidate()
      onClose()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to cancel booking", { id: "booking-action" })
    },
  })

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isMutating = confirmMutation.isPending || cancelMutation.isPending

  const locationAddress = booking?.locationAddress as LocationAddress | null | undefined
  const locationLabel =
    booking?.locationType === "VENUE"
      ? locationAddress?.line1 ?? "Venue"
      : booking?.locationType === "CUSTOMER_HOME"
        ? "Customer home"
        : booking?.locationType === "CUSTOMER_WORK"
          ? "Customer work"
          : "Other"

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={!!bookingId} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {booking ? (
              <BookingStatusBadge status={booking.status} />
            ) : (
              <Skeleton className="h-5 w-20 rounded-md" />
            )}
            <SheetTitle className="text-base font-semibold">
              {booking ? (
                <>#{booking.bookingNumber}</>
              ) : (
                <Skeleton className="h-5 w-28 inline-block" />
              )}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {booking ? (
              `Created ${new Date(booking.createdAt).toLocaleDateString("en-GB")}`
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <BookingDetailSkeleton />
          ) : error ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-destructive">{error.message}</p>
            </div>
          ) : booking ? (
            <div className="flex flex-col gap-5">
              {/* Service */}
              <DetailRow
                icon={FileText}
                label="Service"
                value={booking.customServiceName ?? "—"}
              />

              {/* Date & Time */}
              <DetailRow
                icon={CalendarDays}
                label="Date"
                value={formatDate(booking.scheduledDate)}
              />
              <DetailRow
                icon={Clock}
                label="Time"
                value={
                  <>
                    {booking.scheduledTime}
                    {booking.endTime ? ` — ${booking.endTime}` : ""}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({booking.durationMinutes} min)
                    </span>
                  </>
                }
              />

              {/* Location */}
              <DetailRow
                icon={MapPin}
                label="Location"
                value={
                  locationAddress?.city
                    ? `${locationLabel} · ${locationAddress.city}`
                    : locationLabel
                }
              />

              <Separator />

              {/* Customer */}
              {customer ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={customer.avatarUrl ?? undefined} alt={customer.name} />
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Customer
                    </p>
                    <button
                      type="button"
                      onClick={() => onCustomerClick?.(customer.id)}
                      className={cn(
                        "mt-0.5 truncate text-sm font-medium text-foreground",
                        onCustomerClick &&
                          "cursor-pointer underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
                      )}
                      aria-label={`View customer profile for ${customer.name}`}
                    >
                      {customer.name}
                    </button>
                    {customer.email && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        {customer.email}
                      </p>
                    )}
                    {customer.phone && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              )}

              {/* Staff */}
              {booking.staffId && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage
                      src={staffMember?.avatarUrl ?? undefined}
                      alt={staffMember?.name}
                    />
                    <AvatarFallback>
                      {staffMember ? getInitials(staffMember.name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Staff
                    </p>
                    <p className="mt-0.5 truncate text-sm text-foreground">
                      {staffMember?.name ?? "Loading…"}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Price */}
              <DetailRow
                icon={DollarSign}
                label="Price"
                value={
                  <span className="font-semibold">
                    {formatPrice(Number(booking.totalAmount ?? booking.price ?? 0))}
                  </span>
                }
              />

              {/* Notes */}
              {booking.customerNotes && (
                <DetailRow
                  icon={FileText}
                  label="Customer notes"
                  value={
                    <span className="whitespace-pre-line text-sm text-muted-foreground">
                      {booking.customerNotes}
                    </span>
                  }
                />
              )}
              {booking.adminNotes && (
                <DetailRow
                  icon={FileText}
                  label="Admin notes"
                  value={
                    <span className="whitespace-pre-line text-sm text-muted-foreground">
                      {booking.adminNotes}
                    </span>
                  }
                />
              )}
            </div>
          ) : null}
        </div>

        {/* Action footer */}
        {booking && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Confirm — only shown when not already confirmed/completed/cancelled */}
              {(booking.status === "PENDING" || booking.status === "APPROVED" || booking.status === "RESERVED") && (
                <Button
                  size="sm"
                  variant="success"
                  className="flex-1"
                  disabled={isMutating}
                  loading={confirmMutation.isPending}
                  onClick={() =>
                    confirmMutation.mutate({ bookingId: booking.id })
                  }
                  aria-label="Confirm this booking"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Confirm
                </Button>
              )}

              {/* Cancel — not shown if already cancelled/completed */}
              {booking.status !== "CANCELLED" &&
                booking.status !== "COMPLETED" &&
                booking.status !== "NO_SHOW" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={isMutating}
                    loading={cancelMutation.isPending}
                    onClick={() =>
                      cancelMutation.mutate({ id: booking.id })
                    }
                    aria-label="Cancel this booking"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                )}

              {/* Reschedule */}
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={isMutating}
                aria-label="Reschedule this booking"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Reschedule
              </Button>

              {/* View customer */}
              {onCustomerClick && customer && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => onCustomerClick(customer.id)}
                  aria-label={`View customer profile for ${customer.name}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Customer
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export { BookingDetailSheet }
export type { BookingDetailSheetProps }
