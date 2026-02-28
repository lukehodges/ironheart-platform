import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { StatCardProps } from "./stat-card.types"

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  description,
  isLoading,
  className,
}: StatCardProps) {
  const trendIsPositive = trend !== undefined && trend > 0
  const trendIsNegative = trend !== undefined && trend < 0
  const trendIsNeutral = trend !== undefined && trend === 0

  function formatTrend(t: number): string {
    if (t > 0) return `+${t}%`
    if (t < 0) return `${t}%`
    return "0%"
  }

  return (
    <Card className={cn(className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && (
            <div className="rounded-lg bg-muted p-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="mt-2">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <span className="text-2xl font-bold">{value}</span>
          )}
        </div>

        {(trend !== undefined || description) && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            {trend !== undefined && (
              <>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    trendIsPositive && "text-success",
                    trendIsNegative && "text-destructive",
                    trendIsNeutral && "text-muted-foreground"
                  )}
                >
                  {trendIsPositive && <TrendingUp className="h-4 w-4" />}
                  {trendIsNegative && <TrendingDown className="h-4 w-4" />}
                  {trendIsNeutral && <Minus className="h-4 w-4" />}
                  {formatTrend(trend)}
                </span>
                {trendLabel && (
                  <span className="text-muted-foreground">{trendLabel}</span>
                )}
              </>
            )}
            {description && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
