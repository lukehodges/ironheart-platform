"use client"

import { useState, useMemo, useCallback } from "react"
import { subDays } from "date-fns"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRangePicker, type DateRange } from "@/components/analytics/date-range-picker"
import { ExportMenu } from "@/components/analytics/export-menu"
import { KPICard } from "@/components/analytics/kpi-card"
import { RevenueChart } from "@/components/analytics/revenue-chart"
import { StatusDonutChart } from "@/components/analytics/status-donut-chart"
import { TopServicesChart } from "@/components/analytics/top-services-chart"
import { StaffUtilizationHeatmap } from "@/components/analytics/staff-utilization-heatmap"
import { ChurnRiskTable } from "@/components/analytics/churn-risk-table"
import { useAnalyticsData } from "@/hooks/use-analytics-data"
import { toast } from "sonner"
import type { AnalyticsFilters } from "@/schemas/analytics.schemas"
import type { KPICard as KPICardType } from "@/types/analytics"

/**
 * Analytics Dashboard Page
 *
 * Main analytics page displaying:
 * - KPI cards (4-column grid)
 * - Revenue chart (full width)
 * - Status donut chart + Top services bar chart (2-column grid)
 * - Staff utilization heatmap (full width)
 * - Churn risk table (full width)
 *
 * All components use useAnalyticsData hook with filters from date range picker.
 * Supports CSV/PDF export of all dashboard data.
 */
export default function AnalyticsPage() {
  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }))

  const [isExporting, setIsExporting] = useState(false)

  // Build filters for analytics queries
  const filters: AnalyticsFilters = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
  }), [dateRange])

  // Fetch all analytics data
  const analytics = useAnalyticsData(filters)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range)
  }, [])

  const handleDateRangeReset = useCallback(() => {
    setDateRange({
      from: subDays(new Date(), 30),
      to: new Date(),
    })
  }, [])

  const handleExport = useCallback(async (format: "csv" | "pdf") => {
    setIsExporting(true)
    try {
      if (format === "pdf") {
        toast.info("PDF export coming soon")
        return
      }

      // Build CSV from available analytics data
      const rows: string[][] = []
      rows.push(["Metric", "Value"])

      // KPIs
      const kpis = analytics.kpis.data
      if (kpis) {
        rows.push(["Bookings Created", String(kpis.bookings?.created ?? 0)])
        rows.push(["Bookings Confirmed", String(kpis.bookings?.confirmed ?? 0)])
        rows.push(["Bookings Completed", String(kpis.bookings?.completed ?? 0)])
        rows.push(["Revenue Gross", String(kpis.revenue?.gross ?? 0)])
        rows.push(["Revenue Net", String(kpis.revenue?.net ?? 0)])
        rows.push(["Revenue Outstanding", String(kpis.revenue?.outstanding ?? 0)])
        rows.push(["New Customers", String(kpis.customers?.new ?? 0)])
        rows.push(["Returning Customers", String(kpis.customers?.returning ?? 0)])
        rows.push(["Average Rating", String(kpis.reviews?.ratingAvg ?? 0)])
        rows.push(["Staff Utilisation", String(kpis.staffUtilisation ?? 0)])
      }

      const csvContent = rows
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Analytics data exported to CSV")
    } catch (error) {
      toast.error(`Failed to export analytics: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsExporting(false)
    }
  }, [analytics.kpis.data, analytics.bookingsByStatus.data, analytics.topServices.data])

  // Check if we have any data loading
  const isAnyLoading =
    analytics.kpis.isLoading ||
    analytics.revenueChart.isLoading ||
    analytics.bookingsByStatus.isLoading ||
    analytics.topServices.isLoading ||
    analytics.staffUtilization.isLoading ||
    analytics.churnRisk.isLoading

  // Check if all data has loaded (used for export button state)
  const hasData =
    analytics.kpis.data ||
    analytics.revenueChart.data ||
    analytics.bookingsByStatus.data ||
    analytics.topServices.data ||
    analytics.staffUtilization.data ||
    analytics.churnRisk.data

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header with Date Range Picker and Export Menu */}
      <PageHeader
        title="Analytics Dashboard"
        description="Insights and metrics for your business performance"
      >
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          onReset={handleDateRangeReset}
        />
        <ExportMenu
          onExport={handleExport}
          disabled={!hasData}
          isExporting={isExporting}
        />
      </PageHeader>

      {/* KPI Cards - 4 column grid (responsive) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analytics.kpis.isLoading ? (
          // Loading skeletons
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : analytics.kpis.error ? (
          // Error state
          <ErrorCard message="Failed to load KPIs" colSpan={4} />
        ) : analytics.kpis.data ? (
          // Render KPI cards from summary data
          <>
            <KPICard
              label="Bookings"
              value={analytics.kpis.data.bookings.created}
              change={0}
              trend="neutral"
              period={analytics.kpis.data.period}
            />
            <KPICard
              label="Revenue"
              value={`£${analytics.kpis.data.revenue.gross}`}
              change={0}
              trend="neutral"
              period={analytics.kpis.data.period}
            />
            <KPICard
              label="New Customers"
              value={analytics.kpis.data.customers.new}
              change={0}
              trend="neutral"
              period={analytics.kpis.data.period}
            />
            <KPICard
              label="Avg. Rating"
              value={analytics.kpis.data.reviews.ratingAvg || "N/A"}
              change={0}
              trend="neutral"
              period={analytics.kpis.data.period}
            />
          </>
        ) : (
          // Empty state
          <EmptyCard message="No KPI data available" colSpan={4} />
        )}
      </div>

      {/* Revenue Chart - Full width */}
      <section aria-labelledby="revenue-chart-title">
        <h2 id="revenue-chart-title" className="sr-only">
          Revenue Chart
        </h2>
        <RevenueChart
          data={analytics.revenueChart.data as any}
          isLoading={analytics.revenueChart.isLoading}
          isError={!!analytics.revenueChart.error}
        />
      </section>

      {/* 2-Column Grid: Status Donut + Top Services Bar Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bookings by Status - Donut Chart */}
        <section aria-labelledby="status-chart-title">
          <h2 id="status-chart-title" className="sr-only">
            Bookings by Status
          </h2>
          <StatusDonutChart
            data={analytics.bookingsByStatus.data as any}
            isLoading={analytics.bookingsByStatus.isLoading}
          />
        </section>

        {/* Top Services - Bar Chart */}
        <section aria-labelledby="top-services-title">
          <h2 id="top-services-title" className="sr-only">
            Top Services
          </h2>
          <TopServicesChart
            data={analytics.topServices.data as any}
            isLoading={analytics.topServices.isLoading}
          />
        </section>
      </div>

      {/* Staff Utilization Heatmap - Full width */}
      <section aria-labelledby="utilization-title">
        <h2 id="utilization-title" className="sr-only">
          Staff Utilization
        </h2>
        <StaffUtilizationHeatmap
          data={analytics.staffUtilization.data as any}
          isLoading={analytics.staffUtilization.isLoading}
          isError={!!analytics.staffUtilization.error}
        />
      </section>

      {/* Churn Risk Table - Full width */}
      <section aria-labelledby="churn-risk-title">
        <h2 id="churn-risk-title" className="sr-only">
          Churn Risk Customers
        </h2>
        <Card className="p-6">
          <ChurnRiskTable
            filters={{
              from: filters.from,
              to: filters.to,
            }}
          />
        </Card>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeleton Components
// ---------------------------------------------------------------------------

function KPICardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-12 w-16 shrink-0" />
        </div>
        <Skeleton className="h-3 w-20 mt-4" />
      </div>
    </Card>
  )
}

function ErrorCard({ message, colSpan }: { message: string; colSpan?: number }) {
  return (
    <Card
      className={`p-6 border-destructive/30 bg-destructive/5 ${colSpan ? `col-span-full lg:col-span-${colSpan}` : ""}`}
    >
      <div className="flex items-center justify-center h-24">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please try refreshing the page
          </p>
        </div>
      </div>
    </Card>
  )
}

function EmptyCard({ message, colSpan }: { message: string; colSpan?: number }) {
  return (
    <Card
      className={`p-6 border-dashed ${colSpan ? `col-span-full lg:col-span-${colSpan}` : ""}`}
    >
      <div className="flex items-center justify-center h-24">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </Card>
  )
}
