"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { PlatformMRRData } from "@/types/platform-admin"
import { Skeleton } from "@/components/ui/skeleton"

interface MRRChartProps {
  data: PlatformMRRData | undefined
  isLoading: boolean
}

export function MRRChart({ data, isLoading }: MRRChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Recurring Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const changePercent = data.change.toFixed(1)
  const isPositive = data.change > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monthly Recurring Revenue</CardTitle>
            <p className="text-2xl font-bold mt-2">
              ${data.currentMRR.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">vs last month</p>
            <p className={isPositive ? "text-green-600" : "text-red-600"}>
              {isPositive ? "+" : ""}{changePercent}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
