import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockValues = vi.fn().mockResolvedValue([{}])
const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

vi.mock('@/shared/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/shared/db/schema', () => ({
  auditLogs: { id: 'id' },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), error: vi.fn() }),
  },
}))

import { auditLog } from '../audit-logger'

describe('auditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValues.mockResolvedValue([{}])
    mockInsert.mockReturnValue({ values: mockValues })
  })

  it('inserts an audit log entry', async () => {
    await auditLog({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      action: 'created',
      resourceType: 'booking',
      resourceId: 'booking-1',
      resourceName: 'Booking #BK-001',
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('includes changes as oldValues/newValues', async () => {
    await auditLog({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      action: 'updated',
      resourceType: 'booking',
      resourceId: 'booking-1',
      resourceName: 'Booking #BK-001',
      changes: [{ field: 'status', before: 'PENDING', after: 'CONFIRMED' }],
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('does not throw on write failure (fire-and-forget without tx)', async () => {
    mockValues.mockRejectedValue(new Error('DB error'))
    mockInsert.mockReturnValue({ values: mockValues })

    await expect(
      auditLog({
        tenantId: 'tenant-1',
        actorId: 'user-1',
        action: 'deleted',
        resourceType: 'booking',
        resourceId: 'booking-1',
        resourceName: 'Booking #BK-001',
      })
    ).resolves.toBeUndefined()
  })

  it('uses transaction when tx is provided', async () => {
    const txValues = vi.fn().mockResolvedValue(undefined)
    const txInsert = vi.fn().mockReturnValue({ values: txValues })
    const tx = { insert: txInsert } as any

    await auditLog(
      {
        tenantId: 'tenant-1',
        actorId: 'user-1',
        action: 'created',
        resourceType: 'booking',
        resourceId: 'booking-1',
        resourceName: 'Booking #BK-001',
      },
      tx
    )

    expect(txInsert).toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('throws when insert fails with tx (transactional mode)', async () => {
    const txValues = vi.fn().mockRejectedValue(new Error('DB error'))
    const txInsert = vi.fn().mockReturnValue({ values: txValues })
    const tx = { insert: txInsert } as any

    await expect(
      auditLog(
        {
          tenantId: 'tenant-1',
          actorId: 'user-1',
          action: 'created',
          resourceType: 'booking',
          resourceId: 'booking-1',
          resourceName: 'Booking #BK-001',
        },
        tx
      )
    ).rejects.toThrow('DB error')
  })
})
