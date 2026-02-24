import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

import { syncPermissions } from '../permission-seeder'
import { db } from '@/shared/db'
import type { ModuleManifest } from '../types'

function makeManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    slug: 'test',
    name: 'Test',
    description: '',
    icon: 'Box',
    category: 'operations',
    dependencies: [],
    routes: [],
    sidebarItems: [],
    analyticsWidgets: [],
    permissions: [],
    eventsProduced: [],
    eventsConsumed: [],
    isCore: true,
    availability: 'standard',
    ...overrides,
  }
}

describe('syncPermissions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('parses "resource:action" format correctly', async () => {
    const manifests = [
      makeManifest({ slug: 'booking', permissions: ['bookings:read', 'bookings:write'] }),
    ]

    // Mock existing DB permissions as empty
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    } as any)
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    } as any)
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as any)

    await syncPermissions(manifests)

    expect(db.insert).toHaveBeenCalled()
  })

  it('does nothing when manifests declare no permissions', async () => {
    const manifests = [makeManifest({ permissions: [] })]

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    } as any)

    await syncPermissions(manifests)

    expect(db.insert).not.toHaveBeenCalled()
  })
})
