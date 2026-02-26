import { describe, it, expect, vi, beforeEach } from 'vitest'

;(globalThis as Record<string, unknown>).__teamTestSelectQueue = []

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
  staffChecklistTemplates: {},
  staffChecklistProgress: {},
  staffCustomFieldDefinitions: { id: 'id', tenantId: 'tenantId', fieldKey: 'fieldKey', sortOrder: 'sortOrder', label: 'label' },
  staffCustomFieldValues: { tenantId: 'tenantId', userId: 'userId', fieldDefinitionId: 'fieldDefinitionId' },
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

vi.mock('@/shared/audit/audit-logger', () => ({
  auditLog: vi.fn(),
}))

vi.mock('@/shared/inngest', () => ({
  inngest: {
    send: vi.fn(),
    createFunction: vi.fn(),
  },
}))

vi.mock('@/shared/errors', async () => {
  const actual = await vi.importActual('@/shared/errors')
  return actual
})

import { teamService } from '../team.service'
import { BadRequestError } from '@/shared/errors'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-1'

const ctx = { tenantId: TENANT_ID, user: { id: 'admin-1' } } as any

function enqueue(...items: unknown[]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
  for (const item of items) {
    queue.push(item as unknown[])
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('teamService.setCustomFieldValues', () => {
  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).__teamTestSelectQueue = []
  })

  it('validates TEXT field accepts string', async () => {
    // Queue for listCustomFieldDefinitions (db.select)
    enqueue([
      {
        id: 'field-1',
        tenantId: TENANT_ID,
        fieldKey: 'notes',
        label: 'Notes',
        fieldType: 'TEXT',
        options: null,
        isRequired: false,
        showOnCard: false,
        showOnProfile: true,
        sortOrder: 0,
        groupName: null,
      },
    ])

    // Queue for transaction: delete result, then insert result
    enqueue([], [])

    await expect(
      teamService.setCustomFieldValues(ctx, {
        userId: 'user-1',
        values: [{ fieldDefinitionId: 'field-1', value: 'some text value' }],
      })
    ).resolves.toBeUndefined()
  })

  it('validates NUMBER field rejects string', async () => {
    // Queue for listCustomFieldDefinitions (db.select)
    enqueue([
      {
        id: 'field-1',
        tenantId: TENANT_ID,
        fieldKey: 'age',
        label: 'Age',
        fieldType: 'NUMBER',
        options: null,
        isRequired: false,
        showOnCard: false,
        showOnProfile: true,
        sortOrder: 0,
        groupName: null,
      },
    ])

    await expect(
      teamService.setCustomFieldValues(ctx, {
        userId: 'user-1',
        values: [{ fieldDefinitionId: 'field-1', value: 'not a number' }],
      })
    ).rejects.toThrow(BadRequestError)
  })

  it('validates SELECT field rejects value not in options', async () => {
    // Queue for listCustomFieldDefinitions (db.select)
    enqueue([
      {
        id: 'field-1',
        tenantId: TENANT_ID,
        fieldKey: 'color',
        label: 'Favorite Color',
        fieldType: 'SELECT',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
        ],
        isRequired: false,
        showOnCard: false,
        showOnProfile: true,
        sortOrder: 0,
        groupName: null,
      },
    ])

    await expect(
      teamService.setCustomFieldValues(ctx, {
        userId: 'user-1',
        values: [{ fieldDefinitionId: 'field-1', value: 'green' }],
      })
    ).rejects.toThrow(BadRequestError)
  })

  it('validates required fields cannot be null', async () => {
    // Queue for listCustomFieldDefinitions (db.select)
    enqueue([
      {
        id: 'field-1',
        tenantId: TENANT_ID,
        fieldKey: 'required-text',
        label: 'Required Text',
        fieldType: 'TEXT',
        options: null,
        isRequired: true,
        showOnCard: false,
        showOnProfile: true,
        sortOrder: 0,
        groupName: null,
      },
    ])

    await expect(
      teamService.setCustomFieldValues(ctx, {
        userId: 'user-1',
        values: [{ fieldDefinitionId: 'field-1', value: null }],
      })
    ).rejects.toThrow(BadRequestError)
  })
})
