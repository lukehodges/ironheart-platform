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
  users: { id: 'id', tenantId: 'tenantId', displayName: 'displayName', firstName: 'firstName', lastName: 'lastName' },
  staffProfiles: { userId: 'userId', tenantId: 'tenantId' },
  userAvailability: {},
  bookings: {},
  staffDepartments: { id: 'id', name: 'name' },
  staffDepartmentMembers: { tenantId: 'tenantId', userId: 'userId', departmentId: 'departmentId' },
  staffNotes: { id: 'id', tenantId: 'tenantId', userId: 'userId', authorId: 'authorId', content: 'content', isPinned: 'isPinned', createdAt: 'createdAt' },
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

vi.mock('@/shared/errors', async () => {
  const actual = await vi.importActual('@/shared/errors')
  return actual
})

import { teamRepository } from '../team.repository'
import { ForbiddenError } from '@/shared/errors'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-1'
const USER_ID = 'user-1'
const AUTHOR_ID = 'author-1'

function enqueue(...items: unknown[]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__teamTestSelectQueue
  for (const item of items) {
    queue.push(item as unknown[])
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('team.repository - notes', () => {
  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).__teamTestSelectQueue = []
  })

  it('listNotes returns pinned notes first then chronological', async () => {
    const now = new Date()
    enqueue([
      {
        note: { id: 'note-1', tenantId: TENANT_ID, userId: USER_ID, authorId: AUTHOR_ID, content: 'Pinned note', isPinned: true, createdAt: now, updatedAt: now },
        authorName: 'John Doe',
        authorFirstName: 'John',
        authorLastName: 'Doe',
      },
      {
        note: { id: 'note-2', tenantId: TENANT_ID, userId: USER_ID, authorId: AUTHOR_ID, content: 'Regular note', isPinned: false, createdAt: now, updatedAt: now },
        authorName: 'John Doe',
        authorFirstName: 'John',
        authorLastName: 'Doe',
      },
    ])

    const result = await teamRepository.listNotes(TENANT_ID, USER_ID, { limit: 10 })

    expect(result.rows).toHaveLength(2)
    expect(result.hasMore).toBe(false)
    expect(result.rows[0].isPinned).toBe(true)
    expect(result.rows[0].id).toBe('note-1')
    expect(result.rows[1].isPinned).toBe(false)
    expect(result.rows[1].id).toBe('note-2')
  })

  it('createNote stores with authorId from context', async () => {
    const now = new Date()

    // First queue: insert returning
    enqueue([
      {
        id: 'note-new',
        tenantId: TENANT_ID,
        userId: USER_ID,
        authorId: AUTHOR_ID,
        content: 'New note content',
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Second queue: author name select
    enqueue([
      { displayName: 'John Doe', firstName: 'John', lastName: 'Doe' },
    ])

    const result = await teamRepository.createNote(TENANT_ID, AUTHOR_ID, {
      userId: USER_ID,
      content: 'New note content',
    })

    expect(result.authorId).toBe(AUTHOR_ID)
    expect(result.id).toBe('note-new')
    expect(result.content).toBe('New note content')
    expect(result.authorName).toBe('John Doe')
  })

  it('updateNote throws ForbiddenError if author does not match', async () => {
    const now = new Date()

    // Queue existing note with a different authorId
    enqueue([
      {
        id: 'note-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        authorId: 'other-user',
        content: 'Existing note',
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await expect(
      teamRepository.updateNote(TENANT_ID, AUTHOR_ID, {
        noteId: 'note-1',
        content: 'Updated content',
      })
    ).rejects.toThrow(ForbiddenError)
  })

  it('deleteNote throws ForbiddenError if author does not match', async () => {
    const now = new Date()

    // Queue existing note with a different authorId
    enqueue([
      {
        id: 'note-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        authorId: 'other-user',
        content: 'Existing note',
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await expect(
      teamRepository.deleteNote(TENANT_ID, AUTHOR_ID, 'note-1')
    ).rejects.toThrow(ForbiddenError)
  })
})
