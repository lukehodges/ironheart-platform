import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be defined before imports
// ---------------------------------------------------------------------------

vi.mock('../settings.repository', () => ({
  settingsRepository: {
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    revokeApiKey: vi.fn(),
    findById: vi.fn(),
    findApiKeyByHash: vi.fn(),
    updateLastUsed: vi.fn(),
  },
}))

vi.mock('@/shared/audit', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/shared/module-system/register-all', () => ({
  moduleRegistry: {
    getEnabledManifests: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { settingsService } from '../settings.service'
import { settingsRepository } from '../settings.repository'
import { auditLog } from '@/shared/audit'
import { moduleRegistry } from '@/shared/module-system/register-all'
import { NotFoundError } from '@/shared/errors'
import type { ApiKey } from '../settings.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000002'
const API_KEY_ID = '00000000-0000-0000-0000-000000000010'

function makeCtx(tenantId = TENANT_ID, userId = USER_ID) {
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

function makeApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: API_KEY_ID,
    tenantId: TENANT_ID,
    name: 'Test Key',
    keyPrefix: 'ih_live_abcd',
    scopes: null,
    rateLimit: 1000,
    lastUsedAt: null,
    usageCount: 0,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date(),
    createdBy: USER_ID,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// settingsService.createApiKey
// ---------------------------------------------------------------------------

describe('settingsService.createApiKey', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns raw key with ih_live_ prefix', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    const result = await settingsService.createApiKey(ctx, { name: 'My Key' })

    expect(result.rawKey).toBeDefined()
    expect(result.rawKey.startsWith('ih_live_')).toBe(true)
  })

  it('raw key has 64 hex chars after the prefix (32 random bytes)', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    const result = await settingsService.createApiKey(ctx, { name: 'My Key' })

    const hexPart = result.rawKey.slice('ih_live_'.length)
    expect(hexPart).toHaveLength(64)
    expect(hexPart).toMatch(/^[0-9a-f]{64}$/)
  })

  it('stores SHA-256 hash in repository, not the raw key', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    const result = await settingsService.createApiKey(ctx, { name: 'My Key' })

    // The second argument (keyHash) should be a 64-char hex SHA-256 digest
    const callArgs = vi.mocked(settingsRepository.createApiKey).mock.calls[0]
    const storedHash = callArgs[2] // keyHash is the 3rd positional arg

    expect(storedHash).toHaveLength(64)
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/)
    // The hash must NOT equal the raw key
    expect(storedHash).not.toBe(result.rawKey)
  })

  it('passes keyPrefix as first 12 chars of raw key', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    const result = await settingsService.createApiKey(ctx, { name: 'My Key' })

    const callArgs = vi.mocked(settingsRepository.createApiKey).mock.calls[0]
    const storedPrefix = callArgs[3] // keyPrefix is the 4th positional arg

    expect(storedPrefix).toBe(result.rawKey.slice(0, 12))
  })

  it('calls auditLog with action "created"', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    await settingsService.createApiKey(ctx, { name: 'My Key' })

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        actorId: USER_ID,
        action: 'created',
        resourceType: 'ApiKey',
        resourceId: API_KEY_ID,
        resourceName: 'My Key',
      })
    )
  })

  it('forwards scopes and expiresAt to repository', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    const expiresAt = new Date('2027-01-01')
    await settingsService.createApiKey(ctx, {
      name: 'Scoped Key',
      scopes: ['read:bookings', 'write:bookings'],
      expiresAt,
    })

    const callArgs = vi.mocked(settingsRepository.createApiKey).mock.calls[0]
    const opts = callArgs[4] // options object is the 5th positional arg
    expect(opts).toEqual(
      expect.objectContaining({
        scopes: ['read:bookings', 'write:bookings'],
        expiresAt,
        createdBy: USER_ID,
      })
    )
  })

  it('generates a unique key on each call', async () => {
    vi.mocked(settingsRepository.createApiKey).mockResolvedValue(makeApiKey())

    const ctx = makeCtx()
    const result1 = await settingsService.createApiKey(ctx, { name: 'Key 1' })
    const result2 = await settingsService.createApiKey(ctx, { name: 'Key 2' })

    expect(result1.rawKey).not.toBe(result2.rawKey)
  })
})

// ---------------------------------------------------------------------------
// settingsService.listApiKeys
// ---------------------------------------------------------------------------

describe('settingsService.listApiKeys', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns keys from repository', async () => {
    const keys = [makeApiKey({ id: 'key-1', name: 'Key 1' }), makeApiKey({ id: 'key-2', name: 'Key 2' })]
    vi.mocked(settingsRepository.listApiKeys).mockResolvedValue(keys)

    const ctx = makeCtx()
    const result = await settingsService.listApiKeys(ctx)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Key 1')
    expect(result[1].name).toBe('Key 2')
  })

  it('returned keys do NOT contain rawKey or keyHash fields', async () => {
    const keys = [makeApiKey()]
    vi.mocked(settingsRepository.listApiKeys).mockResolvedValue(keys)

    const ctx = makeCtx()
    const result = await settingsService.listApiKeys(ctx)

    for (const key of result) {
      expect(key).not.toHaveProperty('rawKey')
      expect(key).not.toHaveProperty('keyHash')
    }
  })

  it('passes tenantId to repository', async () => {
    vi.mocked(settingsRepository.listApiKeys).mockResolvedValue([])

    const ctx = makeCtx()
    await settingsService.listApiKeys(ctx)

    expect(settingsRepository.listApiKeys).toHaveBeenCalledWith(TENANT_ID)
  })
})

// ---------------------------------------------------------------------------
// settingsService.revokeApiKey
// ---------------------------------------------------------------------------

describe('settingsService.revokeApiKey', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws NotFoundError when key does not exist', async () => {
    vi.mocked(settingsRepository.findById).mockResolvedValue(null)

    const ctx = makeCtx()
    await expect(
      settingsService.revokeApiKey(ctx, 'nonexistent-id')
    ).rejects.toThrow(NotFoundError)
  })

  it('calls repository revokeApiKey with tenantId and id', async () => {
    vi.mocked(settingsRepository.findById).mockResolvedValue(makeApiKey())
    vi.mocked(settingsRepository.revokeApiKey).mockResolvedValue(undefined)

    const ctx = makeCtx()
    await settingsService.revokeApiKey(ctx, API_KEY_ID)

    expect(settingsRepository.revokeApiKey).toHaveBeenCalledWith(TENANT_ID, API_KEY_ID)
  })

  it('calls auditLog with action "deleted"', async () => {
    vi.mocked(settingsRepository.findById).mockResolvedValue(makeApiKey({ name: 'Revoked Key' }))
    vi.mocked(settingsRepository.revokeApiKey).mockResolvedValue(undefined)

    const ctx = makeCtx()
    await settingsService.revokeApiKey(ctx, API_KEY_ID)

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        actorId: USER_ID,
        action: 'deleted',
        resourceType: 'ApiKey',
        resourceId: API_KEY_ID,
        resourceName: 'Revoked Key',
      })
    )
  })

  it('does not call revokeApiKey if key is not found', async () => {
    vi.mocked(settingsRepository.findById).mockResolvedValue(null)

    const ctx = makeCtx()
    await expect(settingsService.revokeApiKey(ctx, 'missing')).rejects.toThrow()

    expect(settingsRepository.revokeApiKey).not.toHaveBeenCalled()
  })

  it('uses "system" as actorId when ctx.user is undefined', async () => {
    vi.mocked(settingsRepository.findById).mockResolvedValue(makeApiKey())
    vi.mocked(settingsRepository.revokeApiKey).mockResolvedValue(undefined)

    const ctx = { tenantId: TENANT_ID, user: undefined } as unknown as import('@/shared/trpc').Context
    await settingsService.revokeApiKey(ctx, API_KEY_ID)

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'system' })
    )
  })
})

// ---------------------------------------------------------------------------
// settingsService.getModuleTabs
// ---------------------------------------------------------------------------

describe('settingsService.getModuleTabs', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns empty array when no manifests have settingsTab', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([
      { slug: 'booking', settingsTab: undefined } as never,
      { slug: 'team', settingsTab: undefined } as never,
    ])

    const result = settingsService.getModuleTabs(['booking', 'team'])
    expect(result).toEqual([])
  })

  it('returns tabs only from manifests that have settingsTab defined', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([
      {
        slug: 'booking',
        settingsTab: { slug: 'booking-settings', label: 'Booking', icon: 'calendar', section: 'module' },
      } as never,
      { slug: 'team', settingsTab: undefined } as never,
      {
        slug: 'review',
        settingsTab: { slug: 'review-settings', label: 'Reviews', icon: 'star', section: 'module' },
      } as never,
    ])

    const result = settingsService.getModuleTabs(['booking', 'team', 'review'])

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      slug: 'booking-settings',
      label: 'Booking',
      icon: 'calendar',
      section: 'module',
    })
    expect(result[1]).toEqual({
      slug: 'review-settings',
      label: 'Reviews',
      icon: 'star',
      section: 'module',
    })
  })

  it('passes enabledSlugs to moduleRegistry.getEnabledManifests', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([])

    const slugs = ['booking', 'workflow', 'forms']
    settingsService.getModuleTabs(slugs)

    expect(moduleRegistry.getEnabledManifests).toHaveBeenCalledWith(slugs)
  })

  it('returns empty array when enabledSlugs is empty', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([])

    const result = settingsService.getModuleTabs([])
    expect(result).toEqual([])
  })
})
