import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// We test teamRepository.getStaffAvailableSlots
// by mocking @/shared/db with a chainable Drizzle-style mock.
//
// IMPORTANT: vi.mock() is hoisted to the top of the file, so we must not
// reference any variables declared outside the factory function.
// We use a module-level queue stored on globalThis to pass results.
// ---------------------------------------------------------------------------

// We store the select result queue globally so the mock factory can access it
// without referencing variables that would cause "Cannot access before initialization" errors.
// This is safe because pool: "forks" in vitest.config.ts isolates each test file.
(globalThis as Record<string, unknown>).__teamTestSelectQueue = []

vi.mock('@/shared/db', () => {
  // Build a chainable mock that resolves to the next item in the globalThis queue
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy', 'insert', 'values', 'update', 'set', 'returning', 'delete']
    for (const m of methods) {
      chain[m] = () => chain
    }
    // Make thenable
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  return {
    db: {
      select: () => makeSelectChain(),
      transaction: vi.fn(),
      insert: () => makeSelectChain(),
      update: () => makeSelectChain(),
      delete: () => makeSelectChain(),
    },
  }
})

vi.mock('@/shared/db/schema', () => ({
  users: { id: 'id', tenantId: 'tenantId' },
  userAvailability: {
    userId: 'userId',
    type: 'type',
    specificDate: 'specificDate',
    endDate: 'endDate',
    dayOfWeek: 'dayOfWeek',
    startTime: 'startTime',
    endTime: 'endTime',
    reason: 'reason',
    isAllDay: 'isAllDay',
    createdAt: 'createdAt',
  },
  userCapacities: {
    tenantId: 'tenantId',
    userId: 'userId',
    date: 'date',
    maxBookings: 'maxBookings',
  },
  bookings: {},
  organizationSettings: {
    tenantId: 'tenantId',
    defaultSlotCapacity: 'defaultSlotCapacity',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  or: vi.fn((...args: unknown[]) => ({ or: args })),
  gte: vi.fn((a: unknown, b: unknown) => ({ gte: [a, b] })),
  lte: vi.fn((a: unknown, b: unknown) => ({ lte: [a, b] })),
  isNull: vi.fn((a: unknown) => ({ isNull: a })),
  ilike: vi.fn((a: unknown, b: unknown) => ({ ilike: [a, b] })),
  inArray: vi.fn((a: unknown, b: unknown) => ({ inArray: [a, b] })),
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
const TEST_DATE = new Date('2026-06-15T12:00:00Z')
const DATE_STR = '2026-06-15'

function setQueue(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
  queue.length = 0
  queue.push(...results)
}

function makeAvailRow(type: string, overrides: Record<string, unknown> = {}) {
  return {
    userId: USER_ID,
    type,
    specificDate: new Date(DATE_STR),
    endDate: null,
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    reason: null,
    isAllDay: false,
    createdAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// teamRepository.getStaffAvailableSlots
// ---------------------------------------------------------------------------

describe('teamRepository.getStaffAvailableSlots', () => {
  beforeEach(() => {
    setQueue()
  })

  it('returns [] when a BLOCKED entry covers the date', async () => {
    // blocked query returns a row → returns []
    setQueue(
      [makeAvailRow('BLOCKED')],
      [],
      [],
    )

    const result = await teamRepository.getStaffAvailableSlots(
      TENANT_ID, USER_ID, TEST_DATE, 'Europe/London'
    )
    expect(result).toEqual([])
  })

  it('returns SPECIFIC entries when present for exact date', async () => {
    setQueue(
      [],  // blocked: none
      [makeAvailRow('SPECIFIC', { startTime: '10:00', endTime: '14:00' })],
      [],  // recurring: not needed
    )

    const result = await teamRepository.getStaffAvailableSlots(
      TENANT_ID, USER_ID, TEST_DATE, 'Europe/London'
    )
    expect(result).toHaveLength(1)
    expect(result[0].startTime).toBe('10:00')
    expect(result[0].endTime).toBe('14:00')
  })

  it('returns RECURRING entries when no SPECIFIC found', async () => {
    setQueue(
      [],  // blocked: none
      [],  // specific: none
      [makeAvailRow('RECURRING', { startTime: '08:00', endTime: '16:00' })],
    )

    const result = await teamRepository.getStaffAvailableSlots(
      TENANT_ID, USER_ID, TEST_DATE, 'Europe/London'
    )
    expect(result).toHaveLength(1)
    expect(result[0].startTime).toBe('08:00')
  })

  it('returns [] when no availability entries match at all', async () => {
    setQueue([], [], [])

    const result = await teamRepository.getStaffAvailableSlots(
      TENANT_ID, USER_ID, TEST_DATE, 'Europe/London'
    )
    expect(result).toEqual([])
  })

  it('BLOCKED entries take precedence over SPECIFIC entries', async () => {
    setQueue(
      [makeAvailRow('BLOCKED')],  // blocked takes priority
      [makeAvailRow('SPECIFIC', { startTime: '10:00', endTime: '12:00' })],
      [],
    )

    const result = await teamRepository.getStaffAvailableSlots(
      TENANT_ID, USER_ID, TEST_DATE, 'Europe/London'
    )
    expect(result).toEqual([])
  })
})

