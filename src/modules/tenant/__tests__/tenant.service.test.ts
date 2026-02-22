import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be before imports that use the mocked modules
// ---------------------------------------------------------------------------

vi.mock('../tenant.repository', () => ({
  tenantRepository: {
    getSettings: vi.fn(),
    upsertSettings: vi.fn(),
    isModuleEnabled: vi.fn(),
    listModules: vi.fn(),
    toggleModule: vi.fn(),
    updateModuleConfig: vi.fn(),
    listVenues: vi.fn(),
    createVenue: vi.fn(),
    updateVenue: vi.fn(),
    deleteVenue: vi.fn(),
    getUsageCounts: vi.fn(),
  },
}))

vi.mock('@/modules/platform/platform.repository', () => ({
  platformRepository: {
    getTenant: vi.fn(),
    getTenantBySlug: vi.fn(),
  },
}))

// Stateful Redis mock — tracks cached values between get/set/del
const redisStore: Record<string, string> = {}
vi.mock('@/shared/redis', () => ({
  redis: {
    get: vi.fn(async (key: string) => {
      const val = redisStore[key]
      return val ? JSON.parse(val) : null
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      redisStore[key] = JSON.stringify(value)
    }),
    del: vi.fn(async (key: string) => {
      delete redisStore[key]
    }),
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

import { tenantService } from '../tenant.service'
import { tenantRepository } from '../tenant.repository'
import { platformRepository } from '@/modules/platform/platform.repository'
import { redis } from '@/shared/redis'
import { NotFoundError } from '@/shared/errors'
import type { OrganizationSettings, TenantModule, VenueRecord } from '../tenant.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const VENUE_ID = '00000000-0000-0000-0000-000000000010'

function makeCtx(tenantId = TENANT_ID, userId = 'user-1') {
  return {
    tenantId,
    user: { id: userId, tenantId },
    db: {},
    session: null,
    requestId: 'req-1',
    req: {} as unknown,
    tenantSlug: 'test-tenant',
  } as unknown as import('@/shared/trpc').Context
}

function makeSettings(overrides: Partial<OrganizationSettings> = {}): OrganizationSettings {
  return {
    id: TENANT_ID,
    tenantId: TENANT_ID,
    businessName: 'Test Biz',
    legalName: null,
    registrationNo: null,
    vatNumber: null,
    email: 'biz@test.com',
    phone: null,
    website: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    county: null,
    postcode: null,
    country: 'GB',
    timezone: 'Europe/London',
    currency: 'GBP',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    weekStartsOn: 1,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#3B82F6',
    secondaryColor: null,
    accentColor: '#10B981',
    fontFamily: null,
    customCss: null,
    bookingWindowDays: 30,
    minNoticeHours: 24,
    bufferMinutes: 15,
    allowSameDayBook: false,
    slotDurationMins: 30,
    slotApprovalEnabled: false,
    slotApprovalHours: 48,
    defaultSlotCapacity: 1,
    senderName: null,
    senderEmail: null,
    replyToEmail: null,
    emailFooter: null,
    smsSignature: null,
    customerLabel: 'customer',
    bookingLabel: 'booking',
    staffLabel: 'staff',
    availabilityMode: 'CALENDAR_BASED',
    capacityMode: 'TENANT_LEVEL',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeTenantModule(
  slug: string,
  enabled: boolean,
  overrides: Partial<TenantModule> = {}
): TenantModule {
  return {
    id: crypto.randomUUID(),
    tenantId: TENANT_ID,
    moduleId: crypto.randomUUID(),
    moduleSlug: slug,
    moduleName: slug.charAt(0).toUpperCase() + slug.slice(1),
    isEnabled: enabled,
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeVenue(overrides: Partial<VenueRecord> = {}): VenueRecord {
  return {
    id: VENUE_ID,
    tenantId: TENANT_ID,
    name: 'Main Office',
    address: '123 High Street, London',
    phone: '+44 20 1234 5678',
    email: 'office@test.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tenantService.getSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear Redis store between tests
    for (const key of Object.keys(redisStore)) delete redisStore[key]
  })

  it('returns settings from the repository', async () => {
    const settings = makeSettings()
    vi.mocked(tenantRepository.getSettings).mockResolvedValue(settings as never)

    const ctx = makeCtx()
    const result = await tenantService.getSettings(ctx)

    expect(result).toEqual(settings)
    expect(tenantRepository.getSettings).toHaveBeenCalledWith(TENANT_ID)
  })

  it('returns null when no settings exist', async () => {
    vi.mocked(tenantRepository.getSettings).mockResolvedValue(null as never)

    const ctx = makeCtx()
    const result = await tenantService.getSettings(ctx)

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// tenantService.getPublicSettings
// ---------------------------------------------------------------------------

describe('tenantService.getPublicSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(redisStore)) delete redisStore[key]
  })

  it('resolves slug to tenant and returns settings', async () => {
    const settings = makeSettings()
    vi.mocked(platformRepository.getTenantBySlug).mockResolvedValue({
      id: TENANT_ID,
      slug: 'acme',
      name: 'Acme Inc',
      plan: 'pro',
      status: 'active',
      trialEndsAt: null,
      suspendedAt: null,
      suspendedReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    vi.mocked(tenantRepository.getSettings).mockResolvedValue(settings as never)

    const result = await tenantService.getPublicSettings('acme')

    expect(platformRepository.getTenantBySlug).toHaveBeenCalledWith('acme')
    expect(tenantRepository.getSettings).toHaveBeenCalledWith(TENANT_ID)
    expect(result).toEqual(settings)
  })

  it('throws NotFoundError when slug does not exist', async () => {
    vi.mocked(platformRepository.getTenantBySlug).mockResolvedValue(null as never)

    await expect(
      tenantService.getPublicSettings('nonexistent')
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// tenantService.updateSettings
// ---------------------------------------------------------------------------

describe('tenantService.updateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(redisStore)) delete redisStore[key]
  })

  it('updates settings and invalidates Redis cache', async () => {
    const updated = makeSettings({ businessName: 'Updated Biz' })
    vi.mocked(tenantRepository.upsertSettings).mockResolvedValue(updated as never)

    // Seed the Redis cache so we can verify it gets invalidated
    redisStore[`tenant:settings:${TENANT_ID}`] = JSON.stringify(makeSettings())

    const ctx = makeCtx()
    const result = await tenantService.updateSettings(ctx, { businessName: 'Updated Biz' })

    expect(result.businessName).toBe('Updated Biz')
    expect(tenantRepository.upsertSettings).toHaveBeenCalledWith(
      TENANT_ID,
      { businessName: 'Updated Biz' }
    )
    // Redis cache should have been deleted
    expect(redis.del).toHaveBeenCalledWith(`tenant:settings:${TENANT_ID}`)
    expect(redisStore[`tenant:settings:${TENANT_ID}`]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// tenantService.isModuleEnabled
// ---------------------------------------------------------------------------

describe('tenantService.isModuleEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(redisStore)) delete redisStore[key]
  })

  it('returns cached value when Redis has the module map', async () => {
    // Seed Redis with a module map
    const cacheKey = `tenant:modules:${TENANT_ID}`
    redisStore[cacheKey] = JSON.stringify({ booking: true, invoicing: false })

    const result = await tenantService.isModuleEnabled(TENANT_ID, 'booking')

    expect(result).toBe(true)
    // Should NOT have called the repository since cache was a hit
    expect(tenantRepository.isModuleEnabled).not.toHaveBeenCalled()
    expect(tenantRepository.listModules).not.toHaveBeenCalled()
  })

  it('returns false for unknown module slug when cached', async () => {
    const cacheKey = `tenant:modules:${TENANT_ID}`
    redisStore[cacheKey] = JSON.stringify({ booking: true })

    const result = await tenantService.isModuleEnabled(TENANT_ID, 'nonexistent')

    expect(result).toBe(false)
    expect(tenantRepository.isModuleEnabled).not.toHaveBeenCalled()
  })

  it('falls back to DB on cache miss and caches the result', async () => {
    vi.mocked(tenantRepository.isModuleEnabled).mockResolvedValue(true as never)
    vi.mocked(tenantRepository.listModules).mockResolvedValue([
      makeTenantModule('booking', true),
      makeTenantModule('invoicing', false),
      makeTenantModule('reviews', true),
    ] as never)

    const result = await tenantService.isModuleEnabled(TENANT_ID, 'booking')

    expect(result).toBe(true)
    expect(tenantRepository.isModuleEnabled).toHaveBeenCalledWith(TENANT_ID, 'booking')
    expect(tenantRepository.listModules).toHaveBeenCalledWith(TENANT_ID)

    // Should have written the full module map to Redis
    expect(redis.set).toHaveBeenCalledWith(
      `tenant:modules:${TENANT_ID}`,
      { booking: true, invoicing: false, reviews: true },
      { ex: 300 }
    )
  })
})

// ---------------------------------------------------------------------------
// tenantService.listModules
// ---------------------------------------------------------------------------

describe('tenantService.listModules', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns module list from repository', async () => {
    const mods = [
      makeTenantModule('booking', true),
      makeTenantModule('invoicing', false),
    ]
    vi.mocked(tenantRepository.listModules).mockResolvedValue(mods as never)

    const ctx = makeCtx()
    const result = await tenantService.listModules(ctx)

    expect(result).toHaveLength(2)
    expect(result[0].moduleSlug).toBe('booking')
    expect(result[1].isEnabled).toBe(false)
    expect(tenantRepository.listModules).toHaveBeenCalledWith(TENANT_ID)
  })
})

// ---------------------------------------------------------------------------
// tenantService.toggleModule
// ---------------------------------------------------------------------------

describe('tenantService.toggleModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(redisStore)) delete redisStore[key]
  })

  it('calls repository and invalidates Redis module cache', async () => {
    vi.mocked(tenantRepository.toggleModule).mockResolvedValue(undefined)

    // Seed the Redis cache so we can verify it gets cleared
    const cacheKey = `tenant:modules:${TENANT_ID}`
    redisStore[cacheKey] = JSON.stringify({ booking: false })

    const ctx = makeCtx()
    await tenantService.toggleModule(ctx, 'booking', true)

    expect(tenantRepository.toggleModule).toHaveBeenCalledWith(TENANT_ID, 'booking', true)
    expect(redis.del).toHaveBeenCalledWith(cacheKey)
    expect(redisStore[cacheKey]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// tenantService.listVenues / createVenue / deleteVenue
// ---------------------------------------------------------------------------

describe('tenantService.listVenues', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns venues from repository', async () => {
    const venueList = [makeVenue(), makeVenue({ id: 'v-2', name: 'Branch Office' })]
    vi.mocked(tenantRepository.listVenues).mockResolvedValue(venueList as never)

    const ctx = makeCtx()
    const result = await tenantService.listVenues(ctx)

    expect(result).toHaveLength(2)
    expect(tenantRepository.listVenues).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe('tenantService.createVenue', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates a venue and returns the record', async () => {
    const venue = makeVenue()
    vi.mocked(tenantRepository.createVenue).mockResolvedValue(venue as never)

    const ctx = makeCtx()
    const result = await tenantService.createVenue(ctx, {
      name: 'Main Office',
      address: '123 High Street, London',
      phone: '+44 20 1234 5678',
      email: 'office@test.com',
      isActive: true,
    })

    expect(result).toEqual(venue)
    expect(tenantRepository.createVenue).toHaveBeenCalledWith(TENANT_ID, {
      name: 'Main Office',
      address: '123 High Street, London',
      phone: '+44 20 1234 5678',
      email: 'office@test.com',
      isActive: true,
    })
  })

  it('passes null for optional fields when not provided', async () => {
    const venue = makeVenue({ address: null, phone: null, email: null })
    vi.mocked(tenantRepository.createVenue).mockResolvedValue(venue as never)

    const ctx = makeCtx()
    await tenantService.createVenue(ctx, { name: 'Minimal Venue', isActive: true })

    expect(tenantRepository.createVenue).toHaveBeenCalledWith(TENANT_ID, {
      name: 'Minimal Venue',
      address: null,
      phone: null,
      email: null,
      isActive: true,
    })
  })
})

describe('tenantService.deleteVenue', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('delegates to repository deleteVenue (soft-delete)', async () => {
    vi.mocked(tenantRepository.deleteVenue).mockResolvedValue(undefined)

    const ctx = makeCtx()
    await tenantService.deleteVenue(ctx, VENUE_ID)

    // Verify it calls the repo which does a soft-delete (sets active=false)
    expect(tenantRepository.deleteVenue).toHaveBeenCalledWith(TENANT_ID, VENUE_ID)
    expect(tenantRepository.deleteVenue).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// tenantService.getPlan
// ---------------------------------------------------------------------------

describe('tenantService.getPlan', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns plan info from platform repository', async () => {
    const trialEnd = new Date('2026-04-01')
    vi.mocked(platformRepository.getTenant).mockResolvedValue({
      id: TENANT_ID,
      slug: 'acme',
      name: 'Acme Inc',
      plan: 'pro',
      status: 'active',
      trialEndsAt: trialEnd,
      suspendedAt: null,
      suspendedReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const ctx = makeCtx()
    const result = await tenantService.getPlan(ctx)

    expect(result).toEqual({
      plan: 'pro',
      status: 'active',
      trialEndsAt: trialEnd,
    })
    expect(platformRepository.getTenant).toHaveBeenCalledWith(TENANT_ID)
  })

  it('returns undefined trialEndsAt when null', async () => {
    vi.mocked(platformRepository.getTenant).mockResolvedValue({
      id: TENANT_ID,
      slug: 'acme',
      name: 'Acme Inc',
      plan: 'starter',
      status: 'active',
      trialEndsAt: null,
      suspendedAt: null,
      suspendedReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const ctx = makeCtx()
    const result = await tenantService.getPlan(ctx)

    expect(result.plan).toBe('starter')
    expect(result.trialEndsAt).toBeUndefined()
  })

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(platformRepository.getTenant).mockResolvedValue(null as never)

    const ctx = makeCtx()
    await expect(tenantService.getPlan(ctx)).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// tenantService.getUsage
// ---------------------------------------------------------------------------

describe('tenantService.getUsage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns booking and staff counts from repository', async () => {
    vi.mocked(tenantRepository.getUsageCounts).mockResolvedValue({
      bookingCount: 42,
      staffCount: 5,
    } as never)

    const ctx = makeCtx()
    const result = await tenantService.getUsage(ctx)

    expect(result).toEqual({ bookingCount: 42, staffCount: 5 })
    expect(tenantRepository.getUsageCounts).toHaveBeenCalledWith(TENANT_ID)
  })

  it('returns zero counts when no data exists', async () => {
    vi.mocked(tenantRepository.getUsageCounts).mockResolvedValue({
      bookingCount: 0,
      staffCount: 0,
    } as never)

    const ctx = makeCtx()
    const result = await tenantService.getUsage(ctx)

    expect(result.bookingCount).toBe(0)
    expect(result.staffCount).toBe(0)
  })
})
