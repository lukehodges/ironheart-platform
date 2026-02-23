'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useChartData, useChartColors } from '@/hooks/use-chart-data'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { ChartDataPoint } from '@/types/analytics'

interface RevenueChartProps {
  data?: ChartDataPoint[]
  isLoading?: boolean
  isError?: boolean
  view?: 'week' | 'month'
  onViewChange?: (view: 'week' | 'month') => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) {
    return null
  }

  const dataPoint = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md">
      <p className="text-sm font-medium text-foreground">{dataPoint.date}</p>
      <p className="text-sm font-semibold text-primary">
        {formatCurrency(dataPoint.value)}
      </p>
      {dataPoint.label && (
        <p className="text-xs text-muted-foreground">{dataPoint.label}</p>
      )}
    </div>
  )
}

function RevenueChartSkeleton() {
  return (
    <div className="w-full h-80 rounded-lg border border-border bg-muted/30 p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function RevenueChart({
  data,
  isLoading = false,
  isError = false,
  view = 'week',
  onViewChange,
}: RevenueChartProps) {
  const [localView, setLocalView] = useState<'week' | 'month'>(view)
  const chartData = useChartData(data)
  const colors = useChartColors()

  const handleViewChange = (newView: 'week' | 'month') => {
    setLocalView(newView)
    onViewChange?.(newView)
  }

  // Determine X-axis tick interval based on view
  const tickInterval = useMemo(() => {
    if (localView === 'week') return 0
    return Math.ceil(chartData.length / 5)
  }, [chartData.length, localView])

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 10000
    return Math.max(...chartData.map((d) => d.value), 1000)
  }, [chartData])

  if (isLoading) {
    return <RevenueChartSkeleton />
  }

  if (isError) {
    return (
      <div className="w-full h-80 rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to load revenue data
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please try refreshing the page
          </p>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 rounded-lg border border-dashed border-border bg-muted/30 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No revenue data available
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Data will appear once bookings are completed
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Revenue</h3>
        <div className="flex gap-2">
          <Button
            variant={localView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('week')}
            className="text-xs"
          >
            Week
          </Button>
          <Button
            variant={localView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('month')}
            className="text-xs"
          >
            Month
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="w-full h-80 rounded-lg border border-border bg-background p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '0.75rem' }}
              interval={tickInterval}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '0.75rem' }}
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, maxValue]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.primary}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={500}
              fill="url(#revenueGradient)"
              fillOpacity={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-muted-foreground">
        Showing {localView === 'week' ? 'last 7 days' : 'last 30 days'} of revenue data
      </div>
    </div>
  )
}
