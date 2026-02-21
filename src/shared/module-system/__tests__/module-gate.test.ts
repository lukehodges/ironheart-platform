import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsModuleEnabled = vi.fn()
vi.mock('@/modules/tenant/tenant.service', () => ({
  tenantService: {
    isModuleEnabled: (...args: unknown[]) => mockIsModuleEnabled(...args),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

import { createModuleGate } from '../module-gate'

describe('createModuleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves true when module is enabled', async () => {
    mockIsModuleEnabled.mockResolvedValue(true)

    const result = await createModuleGate('booking').check('tenant-123')
    expect(result).toBe(true)
    expect(mockIsModuleEnabled).toHaveBeenCalledWith('tenant-123', 'booking')
  })

  it('throws FORBIDDEN when module is disabled', async () => {
    mockIsModuleEnabled.mockResolvedValue(false)

    await expect(createModuleGate('booking').check('tenant-123')).rejects.toThrow(
      /not enabled/
    )
  })
})
