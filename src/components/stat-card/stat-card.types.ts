import type { LucideIcon } from "lucide-react"

export interface StatCardProps {
  /** The metric label (e.g. "Total Bookings") */
  label: string
  /** The primary value to display (e.g. "1,234" or "£5,600") */
  value: string | number
  /** Optional icon to display */
  icon?: LucideIcon
  /** Trend percentage (positive = up, negative = down) */
  trend?: number
  /** Description of comparison period (e.g. "vs last month") */
  trendLabel?: string
  /** Optional secondary value (e.g. "124 this week") */
  description?: string
  /** Loading state */
  isLoading?: boolean
  /** Additional class name */
  className?: string
}
