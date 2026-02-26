import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// We test teamRepository department methods by mocking @/shared/db with a
// chainable Drizzle-style mock.
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
  users: { id: 'id', tenantId: 'tenantId', displayName: 'displayName', firstName: 'firstName', lastName: 'lastName' },
  staffProfiles: { userId: 'userId', tenantId: 'tenantId', staffStatus: 'staffStatus', employeeType: 'employeeType' },
  userAvailability: {},
  bookings: {},
  staffDepartments: { id: 'id', tenantId: 'tenantId', name: 'name', slug: 'slug', isActive: 'isActive', sortOrder: 'sortOrder', parentId: 'parentId' },
  staffDepartmentMembers: { tenantId: 'tenantId', userId: 'userId', departmentId: 'departmentId', isPrimary: 'isPrimary' },
  staffNotes: {},
  staffPayRates: {},
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

function setQueue(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
  queue.length = 0
  queue.push(...results)
}

// ---------------------------------------------------------------------------
// Department tests
// ---------------------------------------------------------------------------

describe('teamRepository departments', () => {
  beforeEach(() => {
    setQueue()
  })

  // ---- listDepartments ----

  describe('listDepartments', () => {
    it('returns a tree structure with children nested under parents', async () => {
      const flatDepts = [
        { id: 'dept-1', tenantId: 'tenant-1', name: 'Engineering', slug: 'engineering', description: null, parentId: null, managerId: null, color: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'dept-2', tenantId: 'tenant-1', name: 'Frontend', slug: 'frontend', description: null, parentId: 'dept-1', managerId: null, color: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]

      const memberCounts = [
        { departmentId: 'dept-1', count: 5 },
        { departmentId: 'dept-2', count: 3 },
      ]

      setQueue(flatDepts, memberCounts)

      const result = await teamRepository.listDepartments(TENANT_ID)

      // Only root departments are returned at top level
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('dept-1')
      expect(result[0].name).toBe('Engineering')
      expect(result[0].memberCount).toBe(5)

      // Child is nested under parent
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].id).toBe('dept-2')
      expect(result[0].children[0].name).toBe('Frontend')
      expect(result[0].children[0].memberCount).toBe(3)
    })
  })

  // ---- createDepartment ----

  describe('createDepartment', () => {
    it('auto-generates slug from name', async () => {
      setQueue(
        [{ id: 'dept-new', tenantId: TENANT_ID, name: 'Engineering', slug: 'engineering', description: null, parentId: null, managerId: null, color: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }]
      )

      const result = await teamRepository.createDepartment(TENANT_ID, { name: 'Engineering' })

      expect(result.slug).toBe('engineering')
      expect(result.name).toBe('Engineering')
      expect(result.id).toBe('dept-new')
      expect(result.memberCount).toBe(0)
      expect(result.children).toEqual([])
    })
  })

  // ---- updateDepartment ----

  describe('updateDepartment', () => {
    it('throws NotFoundError when department does not exist', async () => {
      // .returning() yields empty array -> row is undefined -> throws NotFoundError
      setQueue(
        [],  // update returning: no row
      )

      await expect(
        teamRepository.updateDepartment(TENANT_ID, { id: 'nonexistent-dept', name: 'Nope' })
      ).rejects.toThrow('Department')
    })
  })

  // ---- deleteDepartment ----

  describe('deleteDepartment', () => {
    it('soft deletes by setting isActive = false', async () => {
      // .returning({ id }) yields one row -> no throw
      setQueue(
        [{ id: 'dept-del' }]
      )

      await expect(
        teamRepository.deleteDepartment(TENANT_ID, 'dept-del')
      ).resolves.toBeUndefined()
    })
  })

  // ---- addDepartmentMember ----

  describe('addDepartmentMember', () => {
    it('clears other primaries when isPrimary is true', async () => {
      // Transaction mock: tx.update() resolves (clear primaries), tx.insert() resolves (add member)
      setQueue(
        [],  // tx.update result (clear primaries)
        [],  // tx.insert result (add new membership)
      )

      await expect(
        teamRepository.addDepartmentMember(TENANT_ID, {
          userId: 'user-1',
          departmentId: 'dept-1',
          isPrimary: true,
        })
      ).resolves.toBeUndefined()
    })
  })
})
