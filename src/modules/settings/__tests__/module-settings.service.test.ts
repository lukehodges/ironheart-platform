import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

vi.mock('@/shared/module-system/register-all', () => ({
  moduleRegistry: {
    getManifest: vi.fn(),
    getAllManifests: vi.fn().mockReturnValue([]),
  },
}))

import { moduleSettingsService } from '../module-settings.service'
import { moduleRegistry } from '@/shared/module-system/register-all'
import type { ModuleManifest } from '@/shared/module-system/types'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const MODULE_ID = '00000000-0000-0000-0000-000000000099'

describe('moduleSettingsService.getModuleSettings', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns default values when no tenant overrides exist', async () => {
    vi.mocked(moduleRegistry.getManifest).mockReturnValue({
      slug: 'booking',
      settingsDefinitions: [
        { key: 'bookingWindowDays', label: 'Booking Window', type: 'number', defaultValue: 30 },
        { key: 'allowSameDayBook', label: 'Same Day', type: 'boolean', defaultValue: false },
      ],
    } as unknown as ModuleManifest)

    // Mock: first select = modules lookup (with .limit), second = tenant overrides (no .limit)
    const { db } = await import('@/shared/db')
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: MODULE_ID }]),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any)

    const settings = await moduleSettingsService.getModuleSettings(TENANT_ID, 'booking')

    expect(settings).toEqual({
      bookingWindowDays: 30,
      allowSameDayBook: false,
    })
  })

  it('returns empty object when manifest has no settings definitions', async () => {
    vi.mocked(moduleRegistry.getManifest).mockReturnValue({
      slug: 'auth',
      settingsDefinitions: undefined,
    } as unknown as ModuleManifest)

    const settings = await moduleSettingsService.getModuleSettings(TENANT_ID, 'auth')

    expect(settings).toEqual({})
  })
})
