import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// We test teamRepository.createPayRate and listPayRates
// by mocking @/shared/db with a chainable Drizzle-style mock.
//
// IMPORTANT: vi.mock() is hoisted to the top of the file, so we must not
// reference any variables declared outside the factory function.
// We use a module-level queue stored on globalThis to pass results.
// ---------------------------------------------------------------------------

(globalThis as Record<string, unknown>).__teamTestSelectQueue = []

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy', 'innerJoin', 'leftJoin', 'groupBy', 'insert', 'values', 'update', 'set', 'returning', 'delete', 'on', 'onConflictDoUpdate']
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  return {
    db: {
      select: () => makeSelectChain(),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () => makeSelectChain(),
          insert: () => makeSelectChain(),
          update: () => makeSelectChain(),
          delete: () => makeSelectChain(),
        }
        return fn(tx)
      }),
      insert: () => makeSelectChain(),
      update: () => makeSelectChain(),
      delete: () => makeSelectChain(),
    },
  }
})

vi.mock('@/shared/db/schema', () => ({
  users: { id: 'id', tenantId: 'tenantId' },
  staffProfiles: { userId: 'userId', tenantId: 'tenantId' },
  userAvailability: {},
  bookings: {},
  staffDepartments: {},
  staffDepartmentMembers: { tenantId: 'tenantId', userId: 'userId', departmentId: 'departmentId' },
  staffNotes: {},
  staffPayRates: { tenantId: 'tenantId', userId: 'userId', effectiveUntil: 'effectiveUntil', effectiveFrom: 'effectiveFrom' },
  staffChecklistTemplates: {},
  staffChecklistProgress: {},
  staffCustomFieldDefinitions: {},
  staffCustomFieldValues: {},
  resourceSkills: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  or: vi.fn((...args: unknown[]) => ({ or: args })),
  gte: vi.fn((a: unknown, b: unknown) => ({ gte: [a, b] })),
  lte: vi.fn((a: unknown, b: unknown) => ({ lte: [a, b] })),
  isNull: vi.fn((a: unknown) => ({ isNull: a })),
  isNotNull: vi.fn((a: unknown) => ({ isNotNull: a })),
  ilike: vi.fn((a: unknown, b: unknown) => ({ ilike: [a, b] })),
  inArray: vi.fn((a: unknown, b: unknown) => ({ inArray: [a, b] })),
  notInArray: vi.fn((a: unknown, b: unknown) => ({ notInArray: [a, b] })),
  sql: vi.fn(),
  asc: vi.fn((a: unknown) => ({ asc: a })),
  desc: vi.fn((a: unknown) => ({ desc: a })),
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

// Import teamRepository AFTER mocks are set up
import { teamRepository } from '../team.repository'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-1'
const USER_ID = 'user-1'

function setQueue(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
  queue.length = 0
  queue.push(...results)
}

// ---------------------------------------------------------------------------
// teamRepository — Pay Rates
// ---------------------------------------------------------------------------

describe('teamRepository.createPayRate', () => {
  beforeEach(() => {
    setQueue()
  })

  it('auto-closes previous rate effectiveUntil and returns new rate', async () => {
    const now = new Date()
    const newRate = {
      id: 'rate-new',
      tenantId: TENANT_ID,
      userId: USER_ID,
      rateType: 'HOURLY',
      amount: '25.00',
      currency: 'GBP',
      effectiveFrom: new Date('2026-03-01'),
      effectiveUntil: null,
      reason: 'Raise',
      createdBy: 'admin-1',
      createdAt: now,
    }

    // Queue results for the two operations inside the transaction:
    // 1. tx.update().set().where() → resolves (closing previous rate)
    // 2. tx.insert().values().returning() → returns the new rate row
    setQueue(
      [],          // tx.update: close previous rate (no rows returned)
      [newRate],   // tx.insert: new rate row
    )

    const result = await teamRepository.createPayRate(TENANT_ID, 'admin-1', {
      userId: USER_ID,
      rateType: 'HOURLY',
      amount: 25.00,
      currency: 'GBP',
      effectiveFrom: '2026-03-01',
      reason: 'Raise',
    })

    expect(result.id).toBe('rate-new')
    expect(result.amount).toBe(25)
    expect(result.rateType).toBe('HOURLY')
    expect(result.currency).toBe('GBP')
    expect(result.effectiveFrom).toEqual(new Date('2026-03-01'))
    expect(result.effectiveUntil).toBeNull()
    expect(result.reason).toBe('Raise')
    expect(result.createdBy).toBe('admin-1')
  })
})

describe('teamRepository.listPayRates', () => {
  beforeEach(() => {
    setQueue()
  })

  it('returns pay rates ordered by effectiveFrom desc with amount as number', async () => {
    const now = new Date()
    setQueue([
      {
        id: 'rate-2',
        tenantId: TENANT_ID,
        userId: USER_ID,
        rateType: 'HOURLY',
        amount: '30.00',
        currency: 'GBP',
        effectiveFrom: new Date('2026-03-01'),
        effectiveUntil: null,
        reason: 'Raise',
        createdBy: 'admin-1',
        createdAt: now,
      },
      {
        id: 'rate-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        rateType: 'HOURLY',
        amount: '25.00',
        currency: 'GBP',
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-02-28'),
        reason: 'Initial',
        createdBy: 'admin-1',
        createdAt: now,
      },
    ])

    const result = await teamRepository.listPayRates(TENANT_ID, USER_ID)

    expect(result).toHaveLength(2)

    // First rate (most recent)
    expect(result[0].id).toBe('rate-2')
    expect(result[0].amount).toBe(30)
    expect(typeof result[0].amount).toBe('number')
    expect(result[0].effectiveUntil).toBeNull()

    // Second rate (older, closed)
    expect(result[1].id).toBe('rate-1')
    expect(result[1].amount).toBe(25)
    expect(typeof result[1].amount).toBe('number')
    expect(result[1].effectiveUntil).toEqual(new Date('2026-02-28'))
    expect(result[1].reason).toBe('Initial')
  })
})
