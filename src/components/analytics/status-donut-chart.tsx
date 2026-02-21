"use client"

import { useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  Legend as LegendComponent,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { BookingStatus } from "@/modules/booking/booking.types"
import { cn } from "@/lib/utils"

// Status to color mapping - follows BookingStatusBadge pattern
const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "#f59e0b", // amber-500
  APPROVED: "#10b981", // emerald-500
  REJECTED: "#ef4444", // red-500
  RESERVED: "#f59e0b", // amber-500
  RELEASED: "#6b7280", // gray-500
  CONFIRMED: "#10b981", // emerald-500
  IN_PROGRESS: "#3b82f6", // blue-500
  COMPLETED: "#6b7280", // gray-500
  CANCELLED: "#ef4444", // red-500
  NO_SHOW: "#dc2626", // red-600
}

// Status to variant mapping for badges
const STATUS_VARIANTS: Record<
  BookingStatus,
  "warning" | "success" | "destructive" | "info" | "secondary" | "default"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  RESERVED: "warning",
  RELEASED: "secondary",
  CONFIRMED: "success",
  IN_PROGRESS: "info",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
}

// Status display labels
const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESERVED: "Reserved",
  RELEASED: "Released",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
}

interface BookingByStatus {
  status: BookingStatus
  count: number
}

interface StatusDonutChartProps {
  data?: BookingByStatus[]
  isLoading?: boolean
  className?: string
}

interface ChartDataItem {
  name: string
  value: number
  status: BookingStatus
  color: string
}

/**
 * Custom label renderer for the donut chart center
 */
const renderCustomLabel = (total: number) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-2xl font-bold text-foreground">{total}</span>
      <span className="text-xs text-muted-foreground">Total</span>
    </div>
  )
}

/**
 * Custom tooltip for donut chart
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload as ChartDataItem
  const percentage = ((payload[0].value / payload[0].payload.total) * 100).toFixed(
    1
  )

  return (
    <div className="rounded-lg border border-border bg-background p-2 shadow-md">
      <p className="text-sm font-semibold text-foreground">{data.name}</p>
      <p className="text-sm text-muted-foreground">
        {payload[0].value} ({percentage}%)
      </p>
    </div>
  )
}

/**
 * Custom legend renderer with status badges
 */
const renderLegend = (props: any) => {
  const { payload } = props

  return (
    <div className="grid grid-cols-2 gap-2">
      {payload.map((entry: any, index: number) => {
        const data = entry.payload as ChartDataItem
        return (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
              aria-hidden="true"
            />
            <Badge variant={STATUS_VARIANTS[data.status]} className="text-xs">
              {data.name}: {entry.value}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Loading skeleton for donut chart
 */
function StatusDonutChartSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Bookings by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Chart skeleton */}
          <div className="relative h-64 w-64">
            <Skeleton className="h-full w-full rounded-full" />
          </div>

          {/* Legend skeleton */}
          <div className="grid w-full grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Status Donut Chart Component
 *
 * Displays bookings grouped by status in a donut chart with:
 * - Custom colors per status (following BookingStatusBadge pattern)
 * - Center label showing total count
 * - Legend with status badges
 * - Responsive sizing
 */
export function StatusDonutChart({
  data,
  isLoading = false,
  className,
}: StatusDonutChartProps) {
  // Transform and compute chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { items: [], total: 0 }
    }

    const items: ChartDataItem[] = data.map((item) => ({
      name: STATUS_LABELS[item.status],
      value: item.count,
      status: item.status,
      color: STATUS_COLORS[item.status],
    }))

    const total = items.reduce((sum, item) => sum + item.value, 0)

    return { items, total }
  }, [data])

  // Show loading state
  if (isLoading) {
    return <StatusDonutChartSkeleton />
  }

  // Show empty state
  if (!data || data.length === 0 || chartData.total === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Bookings by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">
              No booking data available
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Bookings by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Donut Chart */}
          <div className="w-full">
            <ResponsiveContainer
              width="100%"
              height={320}
              minWidth={0}
              minHeight={0}
            >
              <PieChart>
                <Pie
                  data={chartData.items}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                  isAnimationActive={true}
                >
                  {chartData.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={false} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label - overlaid on chart */}
            <div className="relative -mt-64 flex justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {chartData.total}
                </p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </div>

          {/* Legend with Status Badges */}
          <div className="w-full border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 md:grid-cols-2">
              {chartData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <Badge
                    variant={STATUS_VARIANTS[item.status]}
                    className="flex-1 justify-between text-xs"
                  >
                    <span>{item.name}</span>
                    <span className="ml-1">{item.value}</span>
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatusDonutChartLoading() {
  return <StatusDonutChartSkeleton />
}

export type { StatusDonutChartProps, BookingByStatus }
