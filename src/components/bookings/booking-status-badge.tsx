import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BookingStatus } from "@/modules/booking/booking.types"

interface StatusConfig {
  label: string
  variant: "warning" | "success" | "info" | "secondary" | "destructive" | "default"
}

const STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  PENDING: { label: "Pending", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  RESERVED: { label: "Reserved", variant: "warning" },
  RELEASED: { label: "Released", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
}

interface BookingStatusBadgeProps {
  status: BookingStatus
  className?: string
}

export default function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant={config.variant}
      className={cn("shrink-0", className)}
      aria-label={`Booking status: ${config.label}`}
    >
      {config.label}
    </Badge>
  )
}

export { BookingStatusBadge }
export type { BookingStatusBadgeProps }
