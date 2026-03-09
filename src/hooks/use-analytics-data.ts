'use client'

import { useMemo } from 'react'
import { api } from '@/lib/trpc/react'
import type { AnalyticsFilters } from '@/schemas/analytics.schemas'

type SummaryPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'

/**
 * Maps filter presets (7d, 30d, 90d, 12m) to the analytics summary period enum.
 */
function mapPresetToPeriod(preset?: string): SummaryPeriod {
  switch (preset) {
    case '7d':
      return 'WEEK'
    case '30d':
      return 'MONTH'
    case '90d':
      return 'QUARTER'
    case '12m':
      return 'YEAR'
    default:
      return 'MONTH'
  }
}

/**
 * Computes ISO date strings for the time-series query based on filters.
 */
function getDateRange(filters: AnalyticsFilters): { from: string; to: string } {
  if (filters.from && filters.to) {
    return {
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
    }
  }

  const to = new Date()
  const from = new Date()

  switch (filters.preset) {
    case '7d':
      from.setDate(from.getDate() - 7)
      break
    case '90d':
      from.setMonth(from.getMonth() - 3)
      break
    case '12m':
      from.setFullYear(from.getFullYear() - 1)
      break
    case '30d':
    default:
      from.setMonth(from.getMonth() - 1)
      break
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * Maps a preset to the appropriate time-series period type for grouping.
 */
function mapPresetToPeriodType(preset?: string): 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' {
  switch (preset) {
    case '7d':
      return 'DAY'
    case '30d':
      return 'DAY'
    case '90d':
      return 'WEEK'
    case '12m':
      return 'MONTH'
    default:
      return 'DAY'
  }
}

/**
 * Analytics data hook
 *
 * Fetches all analytics data with appropriate refetch intervals
 *
 * @param filters - Analytics filter options (date range, staff, services)
 * @returns Object containing all analytics query results
 *
 * @example
 * ```tsx
 * const analytics = useAnalyticsData({ preset: '30d' })
 *
 * return (
 *   <>
 *     {analytics.kpis.isLoading && <Skeleton />}
 *     {analytics.kpis.data && <KPICards kpis={analytics.kpis.data} />}
 *   </>
 * )
 * ```
 */
export function useAnalyticsData(filters: AnalyticsFilters) {
  const period = mapPresetToPeriod(filters.preset)
  const dateRange = useMemo(() => getDateRange(filters), [filters.preset, filters.from, filters.to])
  const periodType = mapPresetToPeriodType(filters.preset)

  // KPI summary - maps filter preset to server-side period
  const kpis = api.analytics.getSummary.useQuery(
    { period },
    { refetchInterval: 60_000 }, // refresh every 60s
  )

  // Revenue time-series chart data
  const revenueChart = api.analytics.getTimeSeries.useQuery(
    {
      metric: 'revenue.gross',
      periodType,
      from: dateRange.from,
      to: dateRange.to,
    },
    { refetchInterval: 120_000 },
  )

  // Bookings by status - derived from the KPI summary data
  const bookingsByStatus = useMemo(() => {
    if (!kpis.data) {
      return {
        data: undefined,
        isLoading: kpis.isLoading,
        error: kpis.error,
        refetch: kpis.refetch,
      }
    }

    const { bookings } = kpis.data
    return {
      data: [
        { status: 'Created', count: bookings.created },
        { status: 'Confirmed', count: bookings.confirmed },
        { status: 'Completed', count: bookings.completed },
        { status: 'Cancelled', count: bookings.cancelled },
        { status: 'No Show', count: bookings.noShow },
      ],
      isLoading: false,
      error: null,
      refetch: kpis.refetch,
    }
  }, [kpis.data, kpis.isLoading, kpis.error, kpis.refetch])

  // TODO: Wire to analytics.getStaffUtilization when available
  // No endpoint currently exists for staff utilization breakdown
  const staffUtilization = {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: undefined }),
  }

  // TODO: Wire to analytics.getTopServices when available
  // No endpoint currently exists for top services ranking
  const topServices = {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: undefined }),
  }

  // TODO: Wire to analytics.getChurnRisk when available
  // getCustomerInsights exists but requires a specific customerId;
  // a tenant-wide churn risk summary endpoint is not yet available
  const churnRisk = {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: undefined }),
  }

  return {
    kpis,
    revenueChart,
    bookingsByStatus,
    topServices,
    staffUtilization,
    churnRisk,
  }
}
