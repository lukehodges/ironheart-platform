import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlatformAnalyticsPage from '../analytics/page'

// Mock analytics hook
vi.mock('@/hooks/use-platform-analytics', () => ({
  usePlatformAnalytics: vi.fn(() => ({
    dateRange: '30d',
    setDateRange: vi.fn(),
    metrics: {
      data: undefined,
      isLoading: false,
      error: null,
    },
    mrrData: {
      data: undefined,
      isLoading: false,
      error: null,
    },
    tenantsByPlan: {
      data: undefined,
      isLoading: false,
      error: null,
    },
    signupTrend: {
      data: undefined,
      isLoading: false,
      error: null,
    },
    churnData: {
      data: undefined,
      isLoading: false,
      error: null,
    },
  })),
}))

// Mock analytics components
vi.mock('@/components/platform/analytics/platform-metrics-cards', () => ({
  PlatformMetricsCards: () => <div>Platform Metrics Cards</div>,
}))

vi.mock('@/components/platform/analytics/mrr-chart', () => ({
  MRRChart: () => <div>MRR Chart</div>,
}))

vi.mock('@/components/platform/analytics/tenants-by-plan-chart', () => ({
  TenantsByPlanChart: () => <div>Tenants By Plan Chart</div>,
}))

vi.mock('@/components/platform/analytics/signup-trend-chart', () => ({
  SignupTrendChart: () => <div>Signup Trend Chart</div>,
}))

vi.mock('@/components/platform/analytics/churn-table', () => ({
  ChurnTable: () => <div>Churn Table</div>,
}))

describe('PlatformAnalyticsPage', () => {
  it('renders without crashing', () => {
    render(<PlatformAnalyticsPage />)
    expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
  })

  it('displays main heading', () => {
    render(<PlatformAnalyticsPage />)
    expect(screen.getByRole('heading', { name: /platform analytics/i })).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<PlatformAnalyticsPage />)
    expect(screen.getByText('Monitor platform-wide performance and trends')).toBeInTheDocument()
  })

  it('renders all analytics components', () => {
    render(<PlatformAnalyticsPage />)
    expect(screen.getByText('Platform Metrics Cards')).toBeInTheDocument()
    expect(screen.getByText('MRR Chart')).toBeInTheDocument()
    expect(screen.getByText('Tenants By Plan Chart')).toBeInTheDocument()
    expect(screen.getByText('Signup Trend Chart')).toBeInTheDocument()
    expect(screen.getByText('Churn Table')).toBeInTheDocument()
  })
})
