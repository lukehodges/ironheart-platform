"use client"

import { usePlatformAnalytics } from "@/hooks/use-platform-analytics"
import { PlatformMetricsCards } from "@/components/platform/analytics/platform-metrics-cards"
import { MRRChart } from "@/components/platform/analytics/mrr-chart"
import { TenantsByPlanChart } from "@/components/platform/analytics/tenants-by-plan-chart"
import { SignupTrendChart } from "@/components/platform/analytics/signup-trend-chart"
import { ChurnTable } from "@/components/platform/analytics/churn-table"

export default function PlatformAnalyticsPage() {
  const analytics = usePlatformAnalytics()

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor platform-wide performance and trends
          </p>
        </div>
        {/* Date range picker can be added here */}
      </div>

      <div className="space-y-6">
        {/* KPI Cards */}
        <PlatformMetricsCards
          metrics={analytics.metrics.data}
          isLoading={analytics.metrics.isLoading}
        />

        {/* MRR Chart */}
        <MRRChart
          data={analytics.mrrData.data}
          isLoading={analytics.mrrData.isLoading}
        />

        {/* Two-column charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <TenantsByPlanChart
            data={analytics.tenantsByPlan.data}
            isLoading={analytics.tenantsByPlan.isLoading}
          />
          <SignupTrendChart
            data={analytics.signupTrend.data}
            isLoading={analytics.signupTrend.isLoading}
          />
        </div>

        {/* Churn Table */}
        <ChurnTable
          data={analytics.churnData.data}
          isLoading={analytics.churnData.isLoading}
        />
      </div>
    </div>
  )
}
