'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { StaffUtilizationData } from '@/types/analytics'

interface StaffUtilizationHeatmapProps {
  data?: StaffUtilizationData[]
  isLoading?: boolean
  isError?: boolean
  hoursStart?: number
  hoursEnd?: number
}

/**
 * Get the appropriate color class based on utilization percentage
 * Uses gradient from muted (0%) to primary (100%)
 */
function getUtilizationColor(percent: number): string {
  // Clamp percentage between 0 and 100
  const clamped = Math.max(0, Math.min(100, percent))

  if (clamped === 0) {
    return 'bg-muted/30'
  }
  if (clamped <= 12) {
    return 'bg-muted/40'
  }
  if (clamped <= 25) {
    return 'bg-primary/20'
  }
  if (clamped <= 37) {
    return 'bg-primary/30'
  }
  if (clamped <= 50) {
    return 'bg-primary/40'
  }
  if (clamped <= 62) {
    return 'bg-primary/50'
  }
  if (clamped <= 75) {
    return 'bg-primary/60'
  }
  if (clamped <= 87) {
    return 'bg-primary/75'
  }
  return 'bg-primary'
}

/**
 * Format hour as 12-hour time (e.g., 8am, 12pm, 8pm)
 */
function formatHourLabel(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

/**
 * Loading skeleton matching heatmap grid shape
 */
function HeatmapSkeleton() {
  const staffCount = 5
  const hourCount = 13 // 8am to 8pm

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Utilization</CardTitle>
        <CardDescription>
          Hourly utilization percentage across your team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Grid container */}
          <div className="inline-block min-w-full">
            {/* Header row with hours */}
            <div className="flex gap-1 mb-4">
              <div className="w-32 flex-shrink-0" />
              {Array.from({ length: hourCount }).map((_, i) => (
                <Skeleton key={i} className="w-12 h-6" />
              ))}
            </div>

            {/* Staff rows */}
            {Array.from({ length: staffCount }).map((_, i) => (
              <div key={i} className="flex gap-1 mb-3">
                <Skeleton className="w-32 h-10 flex-shrink-0" />
                {Array.from({ length: hourCount }).map((_, j) => (
                  <Skeleton key={j} className="w-12 h-10" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state when no data is available
 */
function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Utilization</CardTitle>
        <CardDescription>
          Hourly utilization percentage across your team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border bg-muted/30">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No utilization data available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Data will appear once bookings are scheduled
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Heatmap cell showing utilization for a single hour slot
 */
function HeatmapCell({
  percent,
  staffName,
  hour,
}: {
  percent: number
  staffName: string
  hour: number
}) {
  const backgroundColor = getUtilizationColor(percent)
  const hourLabel = formatHourLabel(hour)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'w-12 h-10 rounded border border-border/50 flex items-center justify-center',
              'cursor-help transition-all hover:scale-110 hover:shadow-md',
              'flex-shrink-0',
              backgroundColor
            )}
            aria-label={`${staffName} at ${hourLabel}: ${percent}% utilized`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">{staffName}</p>
          <p>{hourLabel}</p>
          <p className="font-mono font-bold text-primary mt-1">{percent}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Staff Utilization Heatmap Component
 *
 * Displays a grid showing staff (rows) × time slots (columns) with color intensity
 * based on utilization percentage.
 *
 * @param data - Array of staff utilization data
 * @param isLoading - Show loading skeleton
 * @param isError - Show error state
 * @param hoursStart - Starting hour (default 8)
 * @param hoursEnd - Ending hour (default 20)
 */
export function StaffUtilizationHeatmap({
  data,
  isLoading = false,
  isError = false,
  hoursStart = 8,
  hoursEnd = 20,
}: StaffUtilizationHeatmapProps) {
  const hours = useMemo(() => {
    const result: number[] = []
    for (let i = hoursStart; i < hoursEnd; i++) {
      result.push(i)
    }
    return result
  }, [hoursStart, hoursEnd])

  if (isLoading) {
    return <HeatmapSkeleton />
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Utilization</CardTitle>
          <CardDescription>
            Hourly utilization percentage across your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">
                Failed to load utilization data
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Utilization</CardTitle>
        <CardDescription>
          Hourly utilization percentage across your team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="inline-block min-w-full">
            {/* Header row with hour labels */}
            <div className="flex gap-1 mb-4 pb-2 border-b border-border">
              {/* Empty space for row header column */}
              <div className="w-32 flex-shrink-0" />

              {/* Hour column headers */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="w-12 text-center text-xs font-medium text-muted-foreground flex-shrink-0"
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {/* Staff rows */}
            <div className="space-y-3">
              {data.map((staff) => (
                <div key={staff.staffId} className="flex gap-1 items-start">
                  {/* Row header: staff name */}
                  <div className="w-32 flex-shrink-0 pt-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {staff.staffName}
                    </p>
                  </div>

                  {/* Heatmap cells for each hour */}
                  <div className="flex gap-1">
                    {hours.map((hour) => {
                      const slot = staff.hourSlots.find((s) => s.hour === hour)
                      const percent = slot?.utilizationPercent ?? 0

                      return (
                        <HeatmapCell
                          key={`${staff.staffId}-${hour}`}
                          percent={percent}
                          staffName={staff.staffName}
                          hour={hour}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Utilization Scale
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-muted/30 border border-border/50" />
                    <span className="text-xs text-muted-foreground">0%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-primary/40 border border-border/50" />
                    <span className="text-xs text-muted-foreground">50%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-primary border border-border/50" />
                    <span className="text-xs text-muted-foreground">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StaffUtilizationHeatmapLoading() {
  return <HeatmapSkeleton />
}
