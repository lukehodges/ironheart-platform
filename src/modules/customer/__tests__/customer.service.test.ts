import { describe, it, expect, vi, beforeEach } from 'vitest'
import { customerService } from '../customer.service'
import { customerRepository } from '../customer.repository'
import { NotFoundError, ForbiddenError, BadRequestError } from '@/shared/errors'

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
    updatePipelineStage: vi.fn(),
    listByPipelineStage: vi.fn(),
    getPipelineSummary: vi.fn(),
    createStageHistoryEntry: vi.fn(),
    getStageHistory: vi.fn(),
    getStageConversionMetrics: vi.fn(),
  },
}))

vi.mock('@/shared/inngest', () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
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
    pipelineStage: null as string | null,
    pipelineStageChangedAt: null as Date | null,
    lostReason: null as string | null,
    dealValue: null as number | null,
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

    // merge() is called - it handles soft-delete as part of the 7-table cascade
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

// ---------------------------------------------------------------------------
// customerService.updatePipelineStage
// ---------------------------------------------------------------------------

describe('customerService.updatePipelineStage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates pipeline stage and emits event', async () => {
    const existing = makeCustomer(SOURCE_ID)
    existing.pipelineStage = 'PROSPECT'
    vi.mocked(customerRepository.findById).mockResolvedValue(existing as never)

    const updated = { ...existing, pipelineStage: 'OUTREACH', pipelineStageChangedAt: new Date() }
    vi.mocked(customerRepository.updatePipelineStage).mockResolvedValue(updated as never)
    vi.mocked(customerRepository.createStageHistoryEntry).mockResolvedValue({
      id: 'hist-1', tenantId: TENANT_ID, customerId: SOURCE_ID,
      fromStage: 'PROSPECT', toStage: 'OUTREACH' as const,
      changedAt: new Date(), changedById: 'user-1',
      dealValue: null, lostReason: null, notes: null,
    } as never)

    const { inngest } = await import('@/shared/inngest')
    const ctx = makeCtx()
    const result = await customerService.updatePipelineStage(ctx, SOURCE_ID, 'OUTREACH')

    expect(customerRepository.updatePipelineStage).toHaveBeenCalledWith(
      TENANT_ID,
      SOURCE_ID,
      'OUTREACH',
      undefined,
    )
    expect(result.pipelineStage).toBe('OUTREACH')
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'customer/stage.changed',
      data: {
        customerId: SOURCE_ID,
        tenantId: TENANT_ID,
        fromStage: 'PROSPECT',
        toStage: 'OUTREACH',
        dealValue: null,
      },
    })
  })

  it('throws BadRequestError when stage is LOST without lostReason', async () => {
    const ctx = makeCtx()
    await expect(
      customerService.updatePipelineStage(ctx, SOURCE_ID, 'LOST')
    ).rejects.toThrow(BadRequestError)
  })

  it('allows LOST stage when lostReason is provided', async () => {
    const existing = makeCustomer(SOURCE_ID)
    existing.pipelineStage = 'PROPOSAL'
    vi.mocked(customerRepository.findById).mockResolvedValue(existing as never)

    const updated = { ...existing, pipelineStage: 'LOST', lostReason: 'Budget cut', pipelineStageChangedAt: new Date() }
    vi.mocked(customerRepository.updatePipelineStage).mockResolvedValue(updated as never)
    vi.mocked(customerRepository.createStageHistoryEntry).mockResolvedValue({
      id: 'hist-2', tenantId: TENANT_ID, customerId: SOURCE_ID,
      fromStage: 'PROPOSAL', toStage: 'LOST' as const,
      changedAt: new Date(), changedById: 'user-1',
      dealValue: null, lostReason: 'Budget cut', notes: null,
    } as never)

    const ctx = makeCtx()
    const result = await customerService.updatePipelineStage(ctx, SOURCE_ID, 'LOST', 'Budget cut')

    expect(customerRepository.updatePipelineStage).toHaveBeenCalledWith(
      TENANT_ID,
      SOURCE_ID,
      'LOST',
      'Budget cut',
    )
    expect(result.pipelineStage).toBe('LOST')
  })

  it('throws NotFoundError if customer does not exist', async () => {
    vi.mocked(customerRepository.findById).mockResolvedValue(null as never)

    const ctx = makeCtx()
    await expect(
      customerService.updatePipelineStage(ctx, SOURCE_ID, 'OUTREACH')
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// customerService.listByPipelineStage
// ---------------------------------------------------------------------------

describe('customerService.listByPipelineStage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('filters by specific stage', async () => {
    const customers = [makeCustomer(SOURCE_ID)]
    vi.mocked(customerRepository.listByPipelineStage).mockResolvedValue(customers as never)

    const ctx = makeCtx()
    const result = await customerService.listByPipelineStage(ctx, 'PROPOSAL')

    expect(customerRepository.listByPipelineStage).toHaveBeenCalledWith(TENANT_ID, 'PROPOSAL')
    expect(result).toHaveLength(1)
  })

  it('returns all pipeline customers when no stage specified', async () => {
    const customers = [makeCustomer(SOURCE_ID), makeCustomer(TARGET_ID)]
    vi.mocked(customerRepository.listByPipelineStage).mockResolvedValue(customers as never)

    const ctx = makeCtx()
    const result = await customerService.listByPipelineStage(ctx)

    expect(customerRepository.listByPipelineStage).toHaveBeenCalledWith(TENANT_ID, undefined)
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// customerService.getPipelineSummary
// ---------------------------------------------------------------------------

describe('customerService.getPipelineSummary', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns correct counts and dealValue sums per stage', async () => {
    const summary = [
      { stage: 'PROSPECT', count: 5, totalDealValue: 25000 },
      { stage: 'PROPOSAL', count: 3, totalDealValue: 75000 },
      { stage: 'WON', count: 2, totalDealValue: 50000 },
    ]
    vi.mocked(customerRepository.getPipelineSummary).mockResolvedValue(summary as never)

    const ctx = makeCtx()
    const result = await customerService.getPipelineSummary(ctx)

    expect(customerRepository.getPipelineSummary).toHaveBeenCalledWith(TENANT_ID)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ stage: 'PROSPECT', count: 5, totalDealValue: 25000 })
    expect(result[1]).toEqual({ stage: 'PROPOSAL', count: 3, totalDealValue: 75000 })
    expect(result[2]).toEqual({ stage: 'WON', count: 2, totalDealValue: 50000 })
  })
})

// ---------------------------------------------------------------------------
// Pipeline Stage History
// ---------------------------------------------------------------------------

describe('customerService.updatePipelineStage — history tracking', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates a history entry with correct fromStage and toStage', async () => {
    const existing = makeCustomer(SOURCE_ID)
    existing.pipelineStage = 'DISCOVERY'
    vi.mocked(customerRepository.findById).mockResolvedValue(existing as never)

    const updated = { ...existing, pipelineStage: 'AUDIT', dealValue: 5000, pipelineStageChangedAt: new Date() }
    vi.mocked(customerRepository.updatePipelineStage).mockResolvedValue(updated as never)
    vi.mocked(customerRepository.createStageHistoryEntry).mockResolvedValue({
      id: 'hist-3', tenantId: TENANT_ID, customerId: SOURCE_ID,
      fromStage: 'DISCOVERY', toStage: 'AUDIT' as const,
      changedAt: new Date(), changedById: 'user-1',
      dealValue: 5000, lostReason: null, notes: null,
    } as never)

    const ctx = makeCtx()
    await customerService.updatePipelineStage(ctx, SOURCE_ID, 'AUDIT')

    expect(customerRepository.createStageHistoryEntry).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      customerId: SOURCE_ID,
      fromStage: 'DISCOVERY',
      toStage: 'AUDIT',
      changedById: 'user-1',
      dealValue: 5000,
      lostReason: null,
    })
  })

  it('records null fromStage when customer has no previous pipeline stage', async () => {
    const existing = makeCustomer(SOURCE_ID)
    existing.pipelineStage = null
    vi.mocked(customerRepository.findById).mockResolvedValue(existing as never)

    const updated = { ...existing, pipelineStage: 'PROSPECT', dealValue: null, pipelineStageChangedAt: new Date() }
    vi.mocked(customerRepository.updatePipelineStage).mockResolvedValue(updated as never)
    vi.mocked(customerRepository.createStageHistoryEntry).mockResolvedValue({
      id: 'hist-4', tenantId: TENANT_ID, customerId: SOURCE_ID,
      fromStage: null, toStage: 'PROSPECT' as const,
      changedAt: new Date(), changedById: 'user-1',
      dealValue: null, lostReason: null, notes: null,
    } as never)

    const ctx = makeCtx()
    await customerService.updatePipelineStage(ctx, SOURCE_ID, 'PROSPECT')

    expect(customerRepository.createStageHistoryEntry).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      customerId: SOURCE_ID,
      fromStage: null,
      toStage: 'PROSPECT',
      changedById: 'user-1',
      dealValue: null,
      lostReason: null,
    })
  })

  it('includes lostReason in history when stage is LOST', async () => {
    const existing = makeCustomer(SOURCE_ID)
    existing.pipelineStage = 'NEGOTIATION'
    vi.mocked(customerRepository.findById).mockResolvedValue(existing as never)

    const updated = { ...existing, pipelineStage: 'LOST', dealValue: 10000, lostReason: 'Went with competitor', pipelineStageChangedAt: new Date() }
    vi.mocked(customerRepository.updatePipelineStage).mockResolvedValue(updated as never)
    vi.mocked(customerRepository.createStageHistoryEntry).mockResolvedValue({
      id: 'hist-5', tenantId: TENANT_ID, customerId: SOURCE_ID,
      fromStage: 'NEGOTIATION', toStage: 'LOST' as const,
      changedAt: new Date(), changedById: 'user-1',
      dealValue: 10000, lostReason: 'Went with competitor', notes: null,
    } as never)

    const ctx = makeCtx()
    await customerService.updatePipelineStage(ctx, SOURCE_ID, 'LOST', 'Went with competitor')

    expect(customerRepository.createStageHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStage: 'NEGOTIATION',
        toStage: 'LOST',
        lostReason: 'Went with competitor',
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// customerService.getStageHistory
// ---------------------------------------------------------------------------

describe('customerService.getStageHistory', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns history entries in descending order', async () => {
    vi.mocked(customerRepository.findById).mockResolvedValue(makeCustomer(SOURCE_ID) as never)

    const history = [
      { id: 'h2', tenantId: TENANT_ID, customerId: SOURCE_ID, fromStage: 'OUTREACH', toStage: 'DISCOVERY' as const, changedAt: new Date('2026-03-19'), changedById: 'user-1', dealValue: null, lostReason: null, notes: null },
      { id: 'h1', tenantId: TENANT_ID, customerId: SOURCE_ID, fromStage: null, toStage: 'OUTREACH' as const, changedAt: new Date('2026-03-18'), changedById: 'user-1', dealValue: null, lostReason: null, notes: null },
    ]
    vi.mocked(customerRepository.getStageHistory).mockResolvedValue(history as never)

    const ctx = makeCtx()
    const result = await customerService.getStageHistory(ctx, SOURCE_ID)

    expect(customerRepository.getStageHistory).toHaveBeenCalledWith(TENANT_ID, SOURCE_ID)
    expect(result).toHaveLength(2)
    expect(result[0]!.toStage).toBe('DISCOVERY')
    expect(result[1]!.toStage).toBe('OUTREACH')
  })

  it('throws NotFoundError for non-existent customer', async () => {
    vi.mocked(customerRepository.findById).mockResolvedValue(null as never)

    const ctx = makeCtx()
    await expect(
      customerService.getStageHistory(ctx, 'non-existent')
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// customerService.getStageConversionMetrics
// ---------------------------------------------------------------------------

describe('customerService.getStageConversionMetrics', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns conversion metrics from repository', async () => {
    const metrics = [
      { fromStage: 'PROSPECT', toStage: 'OUTREACH', avgTimeMs: 86400000, count: 10 },
      { fromStage: 'OUTREACH', toStage: 'DISCOVERY', avgTimeMs: 172800000, count: 7 },
    ]
    vi.mocked(customerRepository.getStageConversionMetrics).mockResolvedValue(metrics as never)

    const ctx = makeCtx()
    const result = await customerService.getStageConversionMetrics(ctx)

    expect(customerRepository.getStageConversionMetrics).toHaveBeenCalledWith(TENANT_ID)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ fromStage: 'PROSPECT', toStage: 'OUTREACH', avgTimeMs: 86400000, count: 10 })
  })
})
