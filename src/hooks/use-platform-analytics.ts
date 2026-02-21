'use client'

import { api } from '@/lib/trpc/react'
import type { PlatformAnalyticsDateRange } from '@/types/platform-analytics'
import { useState } from 'react'

export function usePlatformAnalytics() {
  const [dateRange, setDateRange] = useState<PlatformAnalyticsDateRange>('30d')

  // TODO: Implement platform analytics procedures
  // For now, stub to make build pass
  const stubQuery = {
    data: undefined,
    isLoading: false,
    error: null,
  }

  const metrics = stubQuery
  const mrrData = stubQuery
  const tenantsByPlan = stubQuery
  const signupTrend = stubQuery
  const churnData = stubQuery

  return {
    dateRange,
    setDateRange,
    metrics,
    mrrData,
    tenantsByPlan,
    signupTrend,
    churnData,
  }
}
