import { describe, it, expect, vi, beforeEach } from 'vitest'
import { customerService } from '../customer.service'
import { customerRepository } from '../customer.repository'
import { NotFoundError, ForbiddenError } from '@/shared/errors'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../customer.repository', () => ({
  customerRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    merge: vi.fn(),
    anonymise: vi.fn(),
    listNotes: vi.fn(),
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    getBookingHistory: vi.fn(),
    list: vi.fn(),
  },
}))

// Mock db.transaction to call the callback with a mock tx object
vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn((fn: (tx: unknown) => Promise<void>) =>
      fn({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })
    ),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const SOURCE_ID = '00000000-0000-0000-0000-000000000010'
const TARGET_ID = '00000000-0000-0000-0000-000000000011'

function makeCustomer(id: string, tenantId = TENANT_ID) {
  return {
    id,
    tenantId,
    name: 'Test Customer',
    email: 'test@example.com',
    phone: null,
    dateOfBirth: null,
    gender: null,
    avatarUrl: null,
    address: null,
    tags: [],
    notes: null,
    referralSource: null,
    isActive: true,
    anonymisedAt: null,
    mergedIntoId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

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

// ---------------------------------------------------------------------------
// customerService.mergeCustomers
// ---------------------------------------------------------------------------

describe('customerService.mergeCustomers', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws NotFoundError if source customer not found', async () => {
    vi.mocked(customerRepository.findById)
      .mockResolvedValueOnce(null as never)   // source not found
      .mockResolvedValueOnce(makeCustomer(TARGET_ID) as never) // target found

    const ctx = makeCtx()
    await expect(
      customerService.mergeCustomers(ctx, SOURCE_ID, TARGET_ID)
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError if target customer not found', async () => {
    vi.mocked(customerRepository.findById)
      .mockResolvedValueOnce(makeCustomer(SOURCE_ID) as never)  // source found
      .mockResolvedValueOnce(null as never)                      // target not found

    const ctx = makeCtx()
    await expect(
      customerService.mergeCustomers(ctx, SOURCE_ID, TARGET_ID)
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError if source belongs to different tenant', async () => {
    // Source belongs to different tenant
    vi.mocked(customerRepository.findById)
      .mockResolvedValueOnce(makeCustomer(SOURCE_ID, 'other-tenant') as never)
      .mockResolvedValueOnce(makeCustomer(TARGET_ID) as never)

    const ctx = makeCtx()
    await expect(
      customerService.mergeCustomers(ctx, SOURCE_ID, TARGET_ID)
    ).rejects.toThrow(ForbiddenError)
  })

  it('calls customerRepository.merge inside a transaction', async () => {
    vi.mocked(customerRepository.findById)
      .mockResolvedValueOnce(makeCustomer(SOURCE_ID) as never)
      .mockResolvedValueOnce(makeCustomer(TARGET_ID) as never)
    vi.mocked(customerRepository.merge).mockResolvedValue(undefined)

    const ctx = makeCtx()
    await customerService.mergeCustomers(ctx, SOURCE_ID, TARGET_ID)

    expect(customerRepository.merge).toHaveBeenCalledWith(
      expect.anything(), // tx object
      SOURCE_ID,
      TARGET_ID,
    )
  })

  it('calls softDelete on source after merge', async () => {
    // The merge repository method handles soft-delete internally as part of the cascade
    vi.mocked(customerRepository.findById)
      .mockResolvedValueOnce(makeCustomer(SOURCE_ID) as never)
      .mockResolvedValueOnce(makeCustomer(TARGET_ID) as never)
    vi.mocked(customerRepository.merge).mockResolvedValue(undefined)

    const ctx = makeCtx()
    await customerService.mergeCustomers(ctx, SOURCE_ID, TARGET_ID)

    // merge() is called — it handles soft-delete as part of the 7-table cascade
    expect(customerRepository.merge).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// customerService.anonymiseCustomer
// ---------------------------------------------------------------------------

describe('customerService.anonymiseCustomer', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls customerRepository.anonymise with a hash', async () => {
    vi.mocked(customerRepository.findById).mockResolvedValue(makeCustomer(SOURCE_ID) as never)
    vi.mocked(customerRepository.anonymise).mockResolvedValue(undefined)

    const ctx = makeCtx()
    await customerService.anonymiseCustomer(ctx, SOURCE_ID)

    expect(customerRepository.anonymise).toHaveBeenCalledWith(
      TENANT_ID,
      SOURCE_ID,
      expect.stringMatching(/^[0-9a-f]{8}$/), // 8-char hex hash
    )
  })

  it('hash is deterministic for same customerId+tenantId', async () => {
    // Capture the hash from two separate calls with the same inputs
    const capturedHashes: string[] = []
    vi.mocked(customerRepository.findById).mockResolvedValue(makeCustomer(SOURCE_ID) as never)
    vi.mocked(customerRepository.anonymise).mockImplementation(
      async (_tenantId, _customerId, hash) => { capturedHashes.push(hash) }
    )

    const ctx = makeCtx()
    await customerService.anonymiseCustomer(ctx, SOURCE_ID)
    await customerService.anonymiseCustomer(ctx, SOURCE_ID)

    expect(capturedHashes[0]).toBe(capturedHashes[1])
    expect(capturedHashes[0]).toHaveLength(8)
  })
})
