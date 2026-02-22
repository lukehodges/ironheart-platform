import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TenantListTable } from '../tenant-list-table'

// Mock hooks
vi.mock('@/hooks/use-platform-tenants', () => ({
  usePlatformTenants: vi.fn(() => ({
    list: {
      data: {
        rows: [
          {
            id: 'tenant-1',
            name: 'Test Tenant',
            plan: 'PROFESSIONAL',
            status: 'ACTIVE',
            userCount: 5,
            bookingCount: 120,
            createdAt: new Date('2026-01-15').toISOString(),
          },
        ],
        hasMore: false,
      },
      isLoading: false,
      error: null,
    },
    filters: {},
    setFilters: vi.fn(),
  })),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

describe('TenantListTable', () => {
  it('renders without crashing', () => {
    render(<TenantListTable />)
    expect(screen.getByText('Test Tenant')).toBeInTheDocument()
  })

  it('displays table headers', () => {
    render(<TenantListTable />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('displays tenant data in rows', () => {
    render(<TenantListTable />)
    expect(screen.getByText('Test Tenant')).toBeInTheDocument()
    expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
  })
})
