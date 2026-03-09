import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  staffPayRates: {},
  staffChecklistTemplates: { id: 'id', tenantId: 'tenantId', name: 'name', type: 'type' },
  staffChecklistProgress: { id: 'id', tenantId: 'tenantId', userId: 'userId', templateId: 'templateId', status: 'status', createdAt: 'createdAt' },
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

vi.mock('@/shared/errors', async () => {
  const actual = await vi.importActual('@/shared/errors')
  return actual
})

import { teamRepository } from '../team.repository'
import { BadRequestError } from '@/shared/errors'

const TENANT_ID = 'tenant-1'
const USER_ID = 'user-1'

function enqueue(...items: unknown[]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
  queue.push(...items)
}

describe('teamRepository.completeChecklistItem', () => {
  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).__teamTestSelectQueue = []
  })

  it('marks item as complete and transitions status to COMPLETED when all required items done', async () => {
    const now = new Date()

    // Queue 1: select existing progress (innerJoin with template)
    enqueue([{
      progress: {
        id: 'prog-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        templateId: 'tmpl-1',
        status: 'NOT_STARTED',
        items: [
          { key: 'item-1', label: 'Do thing', description: '', isRequired: true, order: 1, completedAt: null, completedBy: null },
          { key: 'item-2', label: 'Other', description: '', isRequired: false, order: 2, completedAt: null, completedBy: null },
        ],
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      templateName: 'Onboarding',
    }])

    // Queue 2: update returning - item-1 completed, only required item done → COMPLETED
    enqueue([{
      id: 'prog-1',
      userId: USER_ID,
      templateId: 'tmpl-1',
      status: 'COMPLETED',
      items: [
        { key: 'item-1', label: 'Do thing', description: '', isRequired: true, order: 1, completedAt: now.toISOString(), completedBy: USER_ID },
        { key: 'item-2', label: 'Other', description: '', isRequired: false, order: 2, completedAt: null, completedBy: null },
      ],
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    }])

    const result = await teamRepository.completeChecklistItem(TENANT_ID, USER_ID, 'prog-1', 'item-1')

    expect(result.items[0].completedAt).not.toBeNull()
    expect(result.status).toBe('COMPLETED')
  })

  it('transitions status to IN_PROGRESS when not all required items are done', async () => {
    const now = new Date()

    // Queue 1: select existing progress - two required items, none completed
    enqueue([{
      progress: {
        id: 'prog-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        templateId: 'tmpl-1',
        status: 'NOT_STARTED',
        items: [
          { key: 'item-1', label: 'A', description: '', isRequired: true, order: 1, completedAt: null, completedBy: null },
          { key: 'item-2', label: 'B', description: '', isRequired: true, order: 2, completedAt: null, completedBy: null },
        ],
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      templateName: 'Onboarding',
    }])

    // Queue 2: update returning - only item-1 completed, item-2 still pending → IN_PROGRESS
    enqueue([{
      id: 'prog-1',
      userId: USER_ID,
      templateId: 'tmpl-1',
      status: 'IN_PROGRESS',
      items: [
        { key: 'item-1', label: 'A', description: '', isRequired: true, order: 1, completedAt: now.toISOString(), completedBy: USER_ID },
        { key: 'item-2', label: 'B', description: '', isRequired: true, order: 2, completedAt: null, completedBy: null },
      ],
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }])

    const result = await teamRepository.completeChecklistItem(TENANT_ID, USER_ID, 'prog-1', 'item-1')

    expect(result.items[0].completedAt).not.toBeNull()
    expect(result.status).toBe('IN_PROGRESS')
  })

  it('throws BadRequestError for unknown item key', async () => {
    const now = new Date()

    // Queue 1: select existing progress - valid progress record
    enqueue([{
      progress: {
        id: 'prog-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        templateId: 'tmpl-1',
        status: 'NOT_STARTED',
        items: [
          { key: 'item-1', label: 'Do thing', description: '', isRequired: true, order: 1, completedAt: null, completedBy: null },
        ],
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      templateName: 'Onboarding',
    }])

    await expect(
      teamRepository.completeChecklistItem(TENANT_ID, USER_ID, 'prog-1', 'nonexistent')
    ).rejects.toThrow(BadRequestError)
  })
})
