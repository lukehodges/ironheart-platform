'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { SignupTrendData } from '@/types/platform-admin'

interface SignupTrendChartProps {
  data?: SignupTrendData[]
  isLoading?: boolean
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) {
    return null
  }

  const dataPoint = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md">
      <p className="text-sm font-medium text-foreground">{dataPoint.date}</p>
      <div className="mt-2 space-y-1">
        <p className="text-sm text-foreground">
          <span className="font-medium" style={{ color: 'hsl(var(--primary))' }}>
            Signups:
          </span>{' '}
          {dataPoint.signups}
        </p>
        <p className="text-sm text-foreground">
          <span className="font-medium" style={{ color: 'hsl(var(--success))' }}>
            Conversions:
          </span>{' '}
          {dataPoint.conversions}
        </p>
      </div>
    </div>
  )
}

function SignupTrendChartSkeleton() {
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

export function SignupTrendChart({ data, isLoading = false }: SignupTrendChartProps) {
  if (isLoading) {
    return <SignupTrendChartSkeleton />
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className="w-full h-80 rounded-lg border border-border bg-background p-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: '0.875rem',
            }}
          />
          <Line
            type="monotone"
            dataKey="signups"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={500}
            name="Signups"
          />
          <Line
            type="monotone"
            dataKey="conversions"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={500}
            name="Conversions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
