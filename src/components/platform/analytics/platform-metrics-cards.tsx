"use client"

import { TenantStatsCard } from "../tenant-stats-card"
import { Building2, TrendingUp, DollarSign, AlertTriangle } from "lucide-react"
import type { PlatformMetrics } from "@/types/platform-analytics"
import { Skeleton } from "@/components/ui/skeleton"

interface PlatformMetricsCardsProps {
  metrics: PlatformMetrics | undefined
  isLoading: boolean
}

export function PlatformMetricsCards({ metrics, isLoading }: PlatformMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TenantStatsCard
        title="Total Tenants"
        value={metrics.totalTenants}
        subtitle={`${metrics.activeTenants} active`}
        icon={Building2}
        trend={{
          value: metrics.growthRate,
          isPositive: metrics.growthRate > 0,
        }}
      />

      <TenantStatsCard
        title="MRR"
        value={`$${metrics.mrr.toLocaleString()}`}
        subtitle={`$${metrics.arr.toLocaleString()} ARR`}
        icon={DollarSign}
      />

      <TenantStatsCard
        title="Avg Revenue/Tenant"
        value={`$${metrics.averageRevenuePerTenant.toFixed(0)}`}
        subtitle="per month"
        icon={TrendingUp}
      />

      <TenantStatsCard
        title="Churn Rate"
        value={`${metrics.churnRate.toFixed(1)}%`}
        subtitle="last 30 days"
        icon={AlertTriangle}
        trend={{
          value: metrics.churnRate,
          isPositive: false,
        }}
      />
    </div>
  )
}
