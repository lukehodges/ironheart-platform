"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { TenantsByPlanData } from "@/types/platform-admin"
import { Skeleton } from "@/components/ui/skeleton"

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#94a3b8",
  STARTER: "#60a5fa",
  PROFESSIONAL: "#8b5cf6",
  ENTERPRISE: "#f59e0b",
}

interface TenantsByPlanChartProps {
  data: TenantsByPlanData[] | undefined
  isLoading: boolean
}

export function TenantsByPlanChart({ data, isLoading }: TenantsByPlanChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenants by Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="plan"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(entry: any) => `${entry.plan}: ${entry.count}`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.plan] ?? "#888"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
