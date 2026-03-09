import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks - must be declared before any import that touches the mocked modules
// ---------------------------------------------------------------------------

vi.mock('../analytics.repository', () => ({
  getBookingCounts: vi.fn(),
  getRevenueTotal: vi.fn(),
  getOutstandingTotal: vi.fn(),
  getCustomerCount: vi.fn(),
  getAverageRating: vi.fn(),
  getRevenueChart: vi.fn(),
  getBookingsByStatus: vi.fn(),
  getTopServices: vi.fn(),
  getStaffUtilization: vi.fn(),
  getChurnRiskCandidates: vi.fn(),
  getTenantCohortStats: vi.fn(),
}))

vi.mock('@/shared/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

vi.mock('../lib/customer-intelligence', () => ({
  computeChurnScore: vi.fn(),
  computeChurnLabel: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import * as analyticsService from '../analytics.service'
import * as analyticsRepository from '../analytics.repository'
import { redis } from '@/shared/redis'
import { computeChurnScore } from '../lib/customer-intelligence'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001'

function mockBookingCounts(overrides: Partial<{ created: number; confirmed: number; cancelled: number; completed: number; noShow: number }> = {}) {
  return {
    created: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    noShow: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Reset all mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// getKPIs
// ===========================================================================

describe('getKPIs', () => {
  it('returns current vs previous period comparison with correct change percentages', async () => {
    // Current period: 50 bookings, 5000 revenue, 20 customers, 4.5 rating
    // Previous period: 40 bookings, 4000 revenue, 15 customers, 4.0 rating
    vi.mocked(analyticsRepository.getBookingCounts)
      .mockResolvedValueOnce(mockBookingCounts({ created: 50, confirmed: 30, completed: 15 }))
      .mockResolvedValueOnce(mockBookingCounts({ created: 40, confirmed: 25, completed: 10 }))
    vi.mocked(analyticsRepository.getRevenueTotal)
      .mockResolvedValueOnce(5000)
      .mockResolvedValueOnce(4000)
    vi.mocked(analyticsRepository.getCustomerCount)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(15)
    vi.mocked(analyticsRepository.getAverageRating)
      .mockResolvedValueOnce(4.5)
      .mockResolvedValueOnce(4.0)

    const result = await analyticsService.getKPIs(TENANT_ID, 'MONTH')

    expect(result.bookings.current).toBe(50)
    expect(result.bookings.previous).toBe(40)
    expect(result.bookings.change).toBe(25) // (50-40)/40 * 100 = 25%

    expect(result.revenue.current).toBe(5000)
    expect(result.revenue.previous).toBe(4000)
    expect(result.revenue.change).toBe(25) // (5000-4000)/4000 * 100 = 25%

    expect(result.customers.current).toBe(20)
    expect(result.customers.previous).toBe(15)
    expect(result.customers.change).toBeCloseTo(33.33) // (20-15)/15 * 100 = 33.33%

    expect(result.avgRating.current).toBe(4.5)
    expect(result.avgRating.previous).toBe(4.0)
    expect(result.avgRating.change).toBe(12.5) // (4.5-4.0)/4.0 * 100 = 12.5%
  })

  it('returns zeros and 0% change when both periods have no data', async () => {
    vi.mocked(analyticsRepository.getBookingCounts)
      .mockResolvedValue(mockBookingCounts())
    vi.mocked(analyticsRepository.getRevenueTotal)
      .mockResolvedValue(0)
    vi.mocked(analyticsRepository.getCustomerCount)
      .mockResolvedValue(0)
    vi.mocked(analyticsRepository.getAverageRating)
      .mockResolvedValue(0)

    const result = await analyticsService.getKPIs(TENANT_ID, 'WEEK')

    expect(result.bookings.current).toBe(0)
    expect(result.bookings.previous).toBe(0)
    expect(result.bookings.change).toBe(0)
    expect(result.revenue.change).toBe(0)
    expect(result.customers.change).toBe(0)
    expect(result.avgRating.change).toBe(0)
  })

  it('returns 100% change when previous period is zero but current has data', async () => {
    vi.mocked(analyticsRepository.getBookingCounts)
      .mockResolvedValueOnce(mockBookingCounts({ created: 10 }))
      .mockResolvedValueOnce(mockBookingCounts({ created: 0 }))
    vi.mocked(analyticsRepository.getRevenueTotal)
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(0)
    vi.mocked(analyticsRepository.getCustomerCount)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
    vi.mocked(analyticsRepository.getAverageRating)
      .mockResolvedValueOnce(4.8)
      .mockResolvedValueOnce(0)

    const result = await analyticsService.getKPIs(TENANT_ID, 'TODAY')

    // computeChange: previous=0, current>0 → 100
    expect(result.bookings.change).toBe(100)
    expect(result.revenue.change).toBe(100)
    expect(result.customers.change).toBe(100)
    expect(result.avgRating.change).toBe(100)
  })
})

// ===========================================================================
// getRevenueChart
// ===========================================================================

describe('getRevenueChart', () => {
  it('returns data points from repository with correct date/value structure', async () => {
    vi.mocked(analyticsRepository.getRevenueChart).mockResolvedValue([
      { date: '2025-01-01', value: 1200 },
      { date: '2025-01-02', value: 1500 },
      { date: '2025-01-03', value: 800 },
    ])

    const result = await analyticsService.getRevenueChart(
      TENANT_ID,
      '2025-01-01',
      '2025-01-03',
      'DAY'
    )

    expect(result.dataPoints).toHaveLength(3)
    expect(result.dataPoints[0]).toEqual({ date: '2025-01-01', value: 1200 })
    expect(result.dataPoints[1]).toEqual({ date: '2025-01-02', value: 1500 })
    expect(result.dataPoints[2]).toEqual({ date: '2025-01-03', value: 800 })
  })

  it('returns empty dataPoints array when no revenue data exists', async () => {
    vi.mocked(analyticsRepository.getRevenueChart).mockResolvedValue([])

    const result = await analyticsService.getRevenueChart(
      TENANT_ID,
      '2025-06-01',
      '2025-06-30',
      'MONTH'
    )

    expect(result.dataPoints).toEqual([])
    expect(result.dataPoints).toHaveLength(0)
  })

  it('passes correct Date objects and periodType to repository', async () => {
    vi.mocked(analyticsRepository.getRevenueChart).mockResolvedValue([])

    await analyticsService.getRevenueChart(TENANT_ID, '2025-03-01', '2025-03-31', 'WEEK')

    expect(analyticsRepository.getRevenueChart).toHaveBeenCalledWith(
      TENANT_ID,
      new Date('2025-03-01'),
      new Date('2025-03-31'),
      'WEEK'
    )
  })
})

// ===========================================================================
// getBookingsByStatus
// ===========================================================================

describe('getBookingsByStatus', () => {
  it('returns status distribution from repository', async () => {
    const mockData = [
      { status: 'CONFIRMED', count: 25 },
      { status: 'COMPLETED', count: 40 },
      { status: 'CANCELLED', count: 5 },
      { status: 'NO_SHOW', count: 3 },
    ]
    vi.mocked(analyticsRepository.getBookingsByStatus).mockResolvedValue(mockData)

    const result = await analyticsService.getBookingsByStatus(TENANT_ID, '2025-01-01', '2025-01-31')

    expect(result).toHaveLength(4)
    expect(result).toEqual(mockData)
  })

  it('returns empty array when no bookings exist', async () => {
    vi.mocked(analyticsRepository.getBookingsByStatus).mockResolvedValue([])

    const result = await analyticsService.getBookingsByStatus(TENANT_ID)

    expect(result).toEqual([])
  })

  it('passes undefined dates to repository when no date range provided', async () => {
    vi.mocked(analyticsRepository.getBookingsByStatus).mockResolvedValue([])

    await analyticsService.getBookingsByStatus(TENANT_ID)

    expect(analyticsRepository.getBookingsByStatus).toHaveBeenCalledWith(
      TENANT_ID,
      undefined,
      undefined
    )
  })
})

// ===========================================================================
// getTopServices
// ===========================================================================

describe('getTopServices', () => {
  it('returns ranked services by booking count', async () => {
    const mockServices = [
      { serviceId: 'svc-1', serviceName: 'Haircut', bookingCount: 50, revenue: 2500 },
      { serviceId: 'svc-2', serviceName: 'Colour', bookingCount: 30, revenue: 4500 },
      { serviceId: 'svc-3', serviceName: 'Beard Trim', bookingCount: 20, revenue: 600 },
    ]
    vi.mocked(analyticsRepository.getTopServices).mockResolvedValue(mockServices)

    const result = await analyticsService.getTopServices(TENANT_ID, 3, '2025-01-01', '2025-12-31')

    expect(result).toHaveLength(3)
    expect(result[0]!.serviceName).toBe('Haircut')
    expect(result[0]!.bookingCount).toBe(50)
    expect(result[1]!.bookingCount).toBe(30)
    expect(result[2]!.bookingCount).toBe(20)
  })

  it('returns empty array when no services have bookings', async () => {
    vi.mocked(analyticsRepository.getTopServices).mockResolvedValue([])

    const result = await analyticsService.getTopServices(TENANT_ID, 10)

    expect(result).toEqual([])
  })

  it('passes correct limit and optional dates to repository', async () => {
    vi.mocked(analyticsRepository.getTopServices).mockResolvedValue([])

    await analyticsService.getTopServices(TENANT_ID, 5, '2025-06-01')

    expect(analyticsRepository.getTopServices).toHaveBeenCalledWith(
      TENANT_ID,
      5,
      new Date('2025-06-01'),
      undefined
    )
  })
})

// ===========================================================================
// getStaffUtilization
// ===========================================================================

describe('getStaffUtilization', () => {
  const mockUtilData = [
    { staffId: 'staff-1', staffName: 'Alice Smith', bookingCount: 40, hoursBooked: 60 },
    { staffId: 'staff-2', staffName: 'Bob Jones', bookingCount: 25, hoursBooked: 37.5 },
  ]

  it('returns fresh data from repository on cache miss and caches the result', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(analyticsRepository.getStaffUtilization).mockResolvedValue(mockUtilData)
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    const result = await analyticsService.getStaffUtilization(TENANT_ID, '2025-01-01', '2025-06-30')

    expect(result).toEqual(mockUtilData)
    expect(analyticsRepository.getStaffUtilization).toHaveBeenCalledTimes(1)
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('analytics:staff-utilization:'),
      300, // 5 minutes TTL
      JSON.stringify(mockUtilData)
    )
  })

  it('returns cached data on Redis cache hit without calling repository', async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockUtilData))

    const result = await analyticsService.getStaffUtilization(TENANT_ID, '2025-01-01', '2025-06-30')

    expect(result).toEqual(mockUtilData)
    expect(analyticsRepository.getStaffUtilization).not.toHaveBeenCalled()
    expect(redis.setex).not.toHaveBeenCalled()
  })

  it('returns empty array from repository when no staff data exists', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(analyticsRepository.getStaffUtilization).mockResolvedValue([])
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    const result = await analyticsService.getStaffUtilization(TENANT_ID)

    expect(result).toEqual([])
    // Should still cache the empty result
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('analytics:staff-utilization:'),
      300,
      '[]'
    )
  })
})

// ===========================================================================
// getChurnRisk
// ===========================================================================

describe('getChurnRisk', () => {
  const now = new Date()

  // Helper: create a candidate whose last booking was N days ago with given interval
  function makeCandidate(id: string, name: string, lastBookingDaysAgo: number, intervalDays: number) {
    const lastBooking = new Date(now.getTime() - lastBookingDaysAgo * 24 * 60 * 60 * 1000)
    // Build scheduled dates so interval can be computed
    // We need at least 2 dates, spaced intervalDays apart, ending at lastBooking
    const date1 = new Date(lastBooking.getTime() - intervalDays * 24 * 60 * 60 * 1000)
    return {
      customerId: id,
      customerName: name,
      lastBooking,
      avgInterval: 0,
      scheduledDates: [date1, lastBooking],
    }
  }

  const cohortStats = { minR: 0, maxR: 365, minF: 0, maxF: 12, minM: 0, maxM: 500 }

  it('returns scored and sorted churn risk customers on cache miss', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    // Candidate 1: last booking 60 days ago, interval 30 days -> overdue (60 > 30)
    // Candidate 2: last booking 90 days ago, interval 30 days -> overdue (90 > 30)
    const candidates = [
      makeCandidate('cust-1', 'Jane Doe', 60, 30),
      makeCandidate('cust-2', 'John Smith', 90, 30),
    ]

    vi.mocked(analyticsRepository.getChurnRiskCandidates).mockResolvedValue(candidates)
    vi.mocked(analyticsRepository.getTenantCohortStats).mockResolvedValue(cohortStats)

    // Mock churn scores: cust-2 higher risk than cust-1
    vi.mocked(computeChurnScore)
      .mockReturnValueOnce(0.55) // cust-1
      .mockReturnValueOnce(0.82) // cust-2

    const result = await analyticsService.getChurnRisk(TENANT_ID, 10)

    // Sorted by churnScore descending
    expect(result).toHaveLength(2)
    expect(result[0]!.customerId).toBe('cust-2')
    expect(result[0]!.churnScore).toBe(0.82)
    expect(result[1]!.customerId).toBe('cust-1')
    expect(result[1]!.churnScore).toBe(0.55)

    // Should cache with 10 min TTL
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('analytics:churn-risk:'),
      600,
      expect.any(String)
    )
  })

  it('returns cached data on Redis cache hit without calling repository', async () => {
    const cachedData = [
      { customerId: 'cust-x', customerName: 'Cached User', lastBooking: null, avgInterval: 30, churnScore: 0.75 },
    ]
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cachedData))

    const result = await analyticsService.getChurnRisk(TENANT_ID, 5)

    expect(result).toEqual(cachedData)
    expect(analyticsRepository.getChurnRiskCandidates).not.toHaveBeenCalled()
    expect(analyticsRepository.getTenantCohortStats).not.toHaveBeenCalled()
    expect(redis.setex).not.toHaveBeenCalled()
  })

  it('excludes customers whose last booking is not overdue (lastBookingDaysAgo <= avgInterval)', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    // Candidate: last booking 10 days ago, interval 30 days -> NOT overdue (10 < 30)
    const candidates = [
      makeCandidate('cust-recent', 'Recent Customer', 10, 30),
    ]

    vi.mocked(analyticsRepository.getChurnRiskCandidates).mockResolvedValue(candidates)
    vi.mocked(analyticsRepository.getTenantCohortStats).mockResolvedValue(cohortStats)

    const result = await analyticsService.getChurnRisk(TENANT_ID, 10)

    // Not overdue, so excluded from results
    expect(result).toHaveLength(0)
    expect(computeChurnScore).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Additional edge case tests
// ===========================================================================

describe('getKPIs - period-specific behaviour', () => {
  it('calls repository with correct period dates for QUARTER period', async () => {
    vi.mocked(analyticsRepository.getBookingCounts)
      .mockResolvedValue(mockBookingCounts({ created: 100 }))
    vi.mocked(analyticsRepository.getRevenueTotal).mockResolvedValue(10000)
    vi.mocked(analyticsRepository.getCustomerCount).mockResolvedValue(50)
    vi.mocked(analyticsRepository.getAverageRating).mockResolvedValue(4.2)

    const result = await analyticsService.getKPIs(TENANT_ID, 'QUARTER')

    // Repository should have been called 8 times total: 4 current + 4 previous
    expect(analyticsRepository.getBookingCounts).toHaveBeenCalledTimes(2)
    expect(analyticsRepository.getRevenueTotal).toHaveBeenCalledTimes(2)
    expect(analyticsRepository.getCustomerCount).toHaveBeenCalledTimes(2)
    expect(analyticsRepository.getAverageRating).toHaveBeenCalledTimes(2)

    expect(result.bookings.current).toBe(100)
    expect(result.bookings.previous).toBe(100)
    // Same values both periods -> 0% change
    expect(result.bookings.change).toBe(0)
  })

  it('handles negative change (decline) correctly', async () => {
    // Current period lower than previous
    vi.mocked(analyticsRepository.getBookingCounts)
      .mockResolvedValueOnce(mockBookingCounts({ created: 30 }))
      .mockResolvedValueOnce(mockBookingCounts({ created: 50 }))
    vi.mocked(analyticsRepository.getRevenueTotal)
      .mockResolvedValueOnce(2000)
      .mockResolvedValueOnce(4000)
    vi.mocked(analyticsRepository.getCustomerCount)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20)
    vi.mocked(analyticsRepository.getAverageRating)
      .mockResolvedValueOnce(3.5)
      .mockResolvedValueOnce(4.0)

    const result = await analyticsService.getKPIs(TENANT_ID, 'YEAR')

    expect(result.bookings.change).toBe(-40) // (30-50)/50 * 100 = -40%
    expect(result.revenue.change).toBe(-50) // (2000-4000)/4000 * 100 = -50%
    expect(result.customers.change).toBe(-50) // (10-20)/20 * 100 = -50%
    expect(result.avgRating.change).toBe(-12.5) // (3.5-4.0)/4.0 * 100 = -12.5%
  })
})

describe('getStaffUtilization - cache key construction', () => {
  it('constructs cache key with date params when provided', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(analyticsRepository.getStaffUtilization).mockResolvedValue([])
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    await analyticsService.getStaffUtilization(TENANT_ID, '2025-01-01', '2025-06-30')

    expect(redis.get).toHaveBeenCalledWith(
      `analytics:staff-utilization:${TENANT_ID}:2025-01-01:2025-06-30`
    )
  })

  it('constructs cache key with "all" placeholders when no dates provided', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(analyticsRepository.getStaffUtilization).mockResolvedValue([])
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    await analyticsService.getStaffUtilization(TENANT_ID)

    expect(redis.get).toHaveBeenCalledWith(
      `analytics:staff-utilization:${TENANT_ID}:all:all`
    )
  })
})

describe('getChurnRisk - candidates with single booking are excluded from scoring', () => {
  it('handles candidates that have exactly 2 dates where one is barely overdue', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(redis.setex).mockResolvedValue(undefined as never)

    const now = new Date()
    // Last booking 31 days ago, interval 30 days -> barely overdue
    const lastBooking = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
    const firstBooking = new Date(lastBooking.getTime() - 30 * 24 * 60 * 60 * 1000)

    vi.mocked(analyticsRepository.getChurnRiskCandidates).mockResolvedValue([{
      customerId: 'cust-edge',
      customerName: 'Edge Case',
      lastBooking,
      avgInterval: 0,
      scheduledDates: [firstBooking, lastBooking],
    }])
    vi.mocked(analyticsRepository.getTenantCohortStats).mockResolvedValue({
      minR: 0, maxR: 365, minF: 0, maxF: 12, minM: 0, maxM: 500,
    })
    vi.mocked(computeChurnScore).mockReturnValue(0.45)

    const result = await analyticsService.getChurnRisk(TENANT_ID, 10)

    expect(result).toHaveLength(1)
    expect(result[0]!.customerId).toBe('cust-edge')
    expect(result[0]!.churnScore).toBe(0.45)
    expect(result[0]!.lastBooking).toBe(lastBooking.toISOString())
  })
})
