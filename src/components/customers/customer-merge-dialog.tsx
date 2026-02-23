"use client"

import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import { api } from "@/lib/trpc/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

interface CustomerMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The customer that will be KEPT after merge */
  primaryCustomerId: string
  /** The customer that will be DELETED (merged into primary) */
  secondaryCustomerId: string
  onSuccess?: () => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface CustomerCardProps {
  label: string
  customerId: string
  variant: "primary" | "secondary"
}

function CustomerCard({ label, customerId, variant }: CustomerCardProps) {
  const { data: customer, isLoading } = api.customer.getById.useQuery(
    { id: customerId },
    { enabled: !!customerId }
  )

  const { data: history, isLoading: historyLoading } = api.customer.getBookingHistory.useQuery(
    { customerId },
    { enabled: !!customerId }
  )

  const totalSpend = history?.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0) ?? 0
  const bookingCount = history?.length ?? 0

  const borderClass =
    variant === "primary"
      ? "border-primary/30 bg-primary/5"
      : "border-destructive/30 bg-destructive/5"

  const labelBadgeVariant =
    variant === "primary" ? ("info" as const) : ("destructive" as const)

  if (isLoading || historyLoading) {
    return (
      <div className={`rounded-lg border p-4 space-y-3 ${borderClass}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className={`rounded-lg border p-4 ${borderClass}`}>
        <p className="text-sm text-muted-foreground">Customer not found</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${borderClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <Badge variant={labelBadgeVariant} className="text-[10px]">
          {variant === "primary" ? "Kept" : "Deleted"}
        </Badge>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">{customer.name}</p>
        {customer.email && (
          <p className="text-xs text-muted-foreground mt-0.5">{customer.email}</p>
        )}
        {customer.phone && (
          <p className="text-xs text-muted-foreground">{customer.phone}</p>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <p className="text-xs text-muted-foreground">Bookings</p>
          <p className="text-sm font-medium">{bookingCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total spend</p>
          <p className="text-sm font-medium">{formatCurrency(totalSpend)}</p>
        </div>
      </div>
    </div>
  )
}

export function CustomerMergeDialog({
  open,
  onOpenChange,
  primaryCustomerId,
  secondaryCustomerId,
  onSuccess,
}: CustomerMergeDialogProps) {
  const utils = api.useUtils()

  const mergeMutation = api.customer.merge.useMutation({
    onSuccess: () => {
      toast.success("Customers merged successfully")
      void utils.customer.list.invalidate()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to merge customers")
    },
  })

  function handleMerge() {
    mergeMutation.mutate({
      sourceId: secondaryCustomerId,
      targetId: primaryCustomerId,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Customers</DialogTitle>
          <DialogDescription>
            Review the two customer records before merging. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-3">
            <CustomerCard
              label="Primary (kept)"
              customerId={primaryCustomerId}
              variant="primary"
            />
            <CustomerCard
              label="Secondary (deleted)"
              customerId={secondaryCustomerId}
              variant="secondary"
            />
          </div>

          {/* Warning banner */}
          <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                The secondary customer will be permanently deleted.
              </p>
              <p className="text-xs text-muted-foreground">
                All their bookings, notes, completed forms, reviews, review requests, invoices,
                and payments will be transferred to the primary customer. The secondary customer
                record will then be soft-deleted and cannot be recovered.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mergeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            loading={mergeMutation.isPending}
            onClick={handleMerge}
          >
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
