import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// We test teamRepository.getStats by mocking @/shared/db with a chainable
// Drizzle-style mock. Same pattern as team.availability.test.ts.
// ---------------------------------------------------------------------------

(globalThis as Record<string, unknown>).__teamStatsSelectQueue = []

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__teamStatsSelectQueue
      return queue.shift() ?? []
    }
    const methods = [
      'from', 'where', 'limit', 'orderBy', 'insert', 'values',
      'update', 'set', 'returning', 'delete', 'leftJoin', 'innerJoin',
      'groupBy', 'having',
    ]
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  return {
    db: {
      select: vi.fn(() => makeSelectChain()),
      transaction: vi.fn(),
      insert: () => makeSelectChain(),
      update: () => makeSelectChain(),
      delete: () => makeSelectChain(),
    },
  }
})

vi.mock('@/shared/db/schema', () => ({
  users: { id: 'id', tenantId: 'tenantId', status: 'status' },
  staffProfiles: { userId: 'userId', staffStatus: 'staffStatus', employeeType: 'employeeType' },
  userAvailability: {
    userId: 'userId', type: 'type', specificDate: 'specificDate',
    endDate: 'endDate', dayOfWeek: 'dayOfWeek', startTime: 'startTime',
    endTime: 'endTime', reason: 'reason', isAllDay: 'isAllDay', createdAt: 'createdAt',
  },
  userCapacities: { tenantId: 'tenantId', userId: 'userId', date: 'date', maxBookings: 'maxBookings' },
  bookings: {},
  organizationSettings: { tenantId: 'tenantId', defaultSlotCapacity: 'defaultSlotCapacity' },
  staffDepartments: { id: 'id', tenantId: 'tenantId', name: 'name', isActive: 'isActive' },
  staffDepartmentMembers: { userId: 'userId', tenantId: 'tenantId', departmentId: 'departmentId', isPrimary: 'isPrimary' },
  staffNotes: {},
  staffPayRates: {},
  staffChecklistTemplates: {},
  staffChecklistProgress: {},
  staffCustomFieldDefinitions: {},
  staffCustomFieldValues: {},
  resourceSkills: {},
  resourceCapacities: { tenantId: 'tenantId', userId: 'userId', maxDaily: 'maxDaily' },
  resourceAssignments: { tenantId: 'tenantId', userId: 'userId', status: 'status', scheduledDate: 'scheduledDate' },
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
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  asc: vi.fn((a: unknown) => ({ asc: a })),
  desc: vi.fn((a: unknown) => ({ desc: a })),
  count: vi.fn((a?: unknown) => ({ count: a })),
  avg: vi.fn((a: unknown) => ({ avg: a })),
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

vi.mock('@/shared/errors', () => ({
  NotFoundError: class extends Error { constructor(r: string, id: string) { super(`${r} ${id} not found`) } },
  ForbiddenError: class extends Error { constructor(m: string) { super(m) } },
  ConflictError: class extends Error { constructor(m: string) { super(m) } },
  BadRequestError: class extends Error { constructor(m: string) { super(m) } },
}))

// Import teamRepository AFTER mocks are set up
import { teamRepository } from '../team.repository'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-1'

function setQueue(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamStatsSelectQueue
  queue.length = 0
  queue.push(...results)
}

// ---------------------------------------------------------------------------
// teamRepository.getStats
// ---------------------------------------------------------------------------

describe('teamRepository.getStats', () => {
  beforeEach(() => {
    setQueue()
  })

  it('returns aggregated stats when staff exist', async () => {
    setQueue(
      // Query 1: staff rows (users + staffProfiles join)
      [
        {
          user: { id: 'u1', tenantId: TENANT_ID, status: 'ACTIVE', email: 'a@b.com', displayName: 'A', firstName: 'A', lastName: '', phone: null, avatarUrl: null, workosUserId: null, createdAt: new Date(), updatedAt: new Date() },
          profile: { staffStatus: 'ACTIVE', employeeType: 'EMPLOYEE', userId: 'u1', hourlyRate: null, jobTitle: null, bio: null, reportsTo: null, emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null, addressLine1: null, addressLine2: null, addressCity: null, addressPostcode: null, addressCountry: null, dateOfBirth: null, taxId: null, dayRate: null, mileageRate: null, startDate: null },
        },
        {
          user: { id: 'u2', tenantId: TENANT_ID, status: 'SUSPENDED', email: 'b@b.com', displayName: 'B', firstName: 'B', lastName: '', phone: null, avatarUrl: null, workosUserId: null, createdAt: new Date(), updatedAt: new Date() },
          profile: { staffStatus: null, employeeType: null, userId: 'u2', hourlyRate: null, jobTitle: null, bio: null, reportsTo: null, emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null, addressLine1: null, addressLine2: null, addressCity: null, addressPostcode: null, addressCountry: null, dateOfBirth: null, taxId: null, dayRate: null, mileageRate: null, startDate: null },
        },
        {
          user: { id: 'u3', tenantId: TENANT_ID, status: 'DELETED', email: 'c@b.com', displayName: 'C', firstName: 'C', lastName: '', phone: null, avatarUrl: null, workosUserId: null, createdAt: new Date(), updatedAt: new Date() },
          profile: { staffStatus: 'TERMINATED', employeeType: null, userId: 'u3', hourlyRate: null, jobTitle: null, bio: null, reportsTo: null, emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null, addressLine1: null, addressLine2: null, addressCity: null, addressPostcode: null, addressCountry: null, dateOfBirth: null, taxId: null, dayRate: null, mileageRate: null, startDate: null },
        },
      ],
      // Query 2: active departments count
      [{ count: 3 }],
      // Query 3: average capacity
      [{ avgMax: 10, avgUsed: 4 }],
    )

    const result = await teamRepository.getStats(TENANT_ID)

    expect(result).toEqual({
      total: 3,
      activeCount: 1,
      inactiveCount: 1,
      suspendedCount: 1,
      departmentCount: 3,
      avgCapacityMax: 10,
      avgCapacityUsed: 4,
    })
  })

  it('returns zeros when no staff exist', async () => {
    setQueue(
      [], // no staff rows
      [{ count: 0 }], // no departments
      [{ avgMax: null, avgUsed: null }], // no capacity data
    )

    const result = await teamRepository.getStats(TENANT_ID)

    expect(result).toEqual({
      total: 0,
      activeCount: 0,
      inactiveCount: 0,
      suspendedCount: 0,
      departmentCount: 0,
      avgCapacityMax: 0,
      avgCapacityUsed: 0,
    })
  })
})
