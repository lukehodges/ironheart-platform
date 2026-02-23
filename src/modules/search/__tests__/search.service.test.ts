import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

const mockProviders = [
  {
    moduleSlug: 'customer',
    resultType: 'customer',
    label: 'Customers',
    search: vi.fn(),
    mapResult: vi.fn(),
  },
  {
    moduleSlug: 'booking',
    resultType: 'booking',
    label: 'Bookings',
    search: vi.fn(),
    mapResult: vi.fn(),
  },
]

vi.mock('@/shared/module-system/search-registry', () => ({
  searchProviderRegistry: {
    getProviders: vi.fn(() => [...mockProviders]),
  },
}))

vi.mock('@/modules/tenant/tenant.service', () => ({
  tenantService: {
    isModuleEnabled: vi.fn(),
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { searchService } from '../search.service'
import { tenantService } from '@/modules/tenant/tenant.service'

const TENANT = 'tenant-1'

describe('searchService.globalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: both modules enabled
    vi.mocked(tenantService.isModuleEnabled).mockResolvedValue(true)

    // Default search results
    mockProviders[0].search.mockResolvedValue({
      hits: [{ id: 'c1', firstName: 'John', lastName: 'Smith', email: 'j@x.com' }],
      hasMore: false,
    })
    mockProviders[0].mapResult.mockImplementation((hit: any) => ({
      type: 'customer',
      id: hit.id,
      label: `${hit.firstName} ${hit.lastName}`,
      secondary: hit.email,
    }))

    mockProviders[1].search.mockResolvedValue({
      hits: [{ id: 'b1', bookingNumber: 'BK-001', scheduledDate: '2026-03-01' }],
      hasMore: true,
    })
    mockProviders[1].mapResult.mockImplementation((hit: any) => ({
      type: 'booking',
      id: hit.id,
      label: hit.bookingNumber,
      secondary: hit.scheduledDate,
    }))
  })

  it('returns grouped results from all enabled providers', async () => {
    const result = await searchService.globalSearch(TENANT, 'john', undefined, 20)

    expect(result.groups).toHaveLength(2)
    expect(result.groups[0].type).toBe('customer')
    expect(result.groups[0].label).toBe('Customers')
    expect(result.groups[0].results).toHaveLength(1)
    expect(result.groups[0].hasMore).toBe(false)
    expect(result.groups[1].type).toBe('booking')
    expect(result.groups[1].hasMore).toBe(true)
    expect(result.totalFound).toBe(2)
    expect(result.query).toBe('john')
  })

  it('excludes providers for disabled tenant modules', async () => {
    vi.mocked(tenantService.isModuleEnabled).mockImplementation(
      async (_tid, slug) => slug !== 'booking'
    )

    const result = await searchService.globalSearch(TENANT, 'john', undefined, 20)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].type).toBe('customer')
  })

  it('filters by types param when provided', async () => {
    const result = await searchService.globalSearch(TENANT, 'john', ['customer'], 20)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].type).toBe('customer')
    // Booking provider should not have been called
    expect(mockProviders[1].search).not.toHaveBeenCalled()
  })

  it('returns empty groups when no providers match types filter', async () => {
    const result = await searchService.globalSearch(TENANT, 'john', ['workflow'], 20)

    expect(result.groups).toHaveLength(0)
    expect(result.totalFound).toBe(0)
  })

  it('returns empty groups when all modules disabled', async () => {
    vi.mocked(tenantService.isModuleEnabled).mockResolvedValue(false)

    const result = await searchService.globalSearch(TENANT, 'john', undefined, 20)

    expect(result.groups).toHaveLength(0)
    expect(result.totalFound).toBe(0)
  })
})
