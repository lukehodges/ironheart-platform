"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton, SkeletonStatCard } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { KPICard as KPICardType } from "@/types/analytics"

interface KPICardProps {
  label: string
  value: number | string
  change: number
  trend: "up" | "down" | "neutral"
  period: string
  isLoading?: boolean
}

const getTrendColor = (trend: "up" | "down" | "neutral"): string => {
  switch (trend) {
    case "up":
      return "text-success"
    case "down":
      return "text-destructive"
    case "neutral":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

const getTrendBackgroundColor = (trend: "up" | "down" | "neutral"): string => {
  switch (trend) {
    case "up":
      return "bg-success/10"
    case "down":
      return "bg-destructive/10"
    case "neutral":
      return "bg-muted/50"
    default:
      return "bg-muted/50"
  }
}

const getTrendArrow = (trend: "up" | "down" | "neutral"): React.ReactNode => {
  switch (trend) {
    case "up":
      return <ArrowUp className="h-4 w-4" aria-hidden="true" />
    case "down":
      return <ArrowDown className="h-4 w-4" aria-hidden="true" />
    case "neutral":
      return null
    default:
      return null
  }
}

export function KPICard({
  label,
  value,
  change,
  trend,
  period,
  isLoading = false,
}: KPICardProps) {
  if (isLoading) {
    return <SkeletonStatCard />
  }

  const trendColor = getTrendColor(trend)
  const trendBgColor = getTrendBackgroundColor(trend)
  const trendArrow = getTrendArrow(trend)

  const formattedChange = Math.abs(change)
  const changeSign = change >= 0 ? "+" : "-"

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left section: Label and Value */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-2 truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl font-bold text-foreground break-words">
                {value}
              </p>
            </div>
          </div>

          {/* Right section: Trend indicator */}
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg shrink-0",
              trendBgColor
            )}
          >
            {trendArrow && (
              <div className={cn("flex items-center justify-center", trendColor)}>
                {trendArrow}
              </div>
            )}
            <p
              className={cn(
                "text-sm font-semibold",
                trendColor
              )}
            >
              {changeSign}{formattedChange}%
            </p>
          </div>
        </div>

        {/* Period label at bottom */}
        <p className="text-xs text-muted-foreground mt-4 truncate">
          {period}
        </p>
      </CardContent>
    </Card>
  )
}

export function KPICardLoading() {
  return <SkeletonStatCard />
}
