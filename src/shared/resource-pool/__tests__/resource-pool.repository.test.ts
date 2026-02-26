import { describe, it, expect, vi, beforeEach } from 'vitest'

// Queue-based mock for Drizzle
;(globalThis as Record<string, unknown>).__rpTestSelectQueue = []
;(globalThis as Record<string, unknown>).__rpTestInsertResult = []
;(globalThis as Record<string, unknown>).__rpTestUpdateResult = []
;(globalThis as Record<string, unknown>).__rpTestDeleteResult = { rowCount: 1 }

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy', 'innerJoin', 'leftJoin']
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  function makeInsertChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestInsertResult
      return queue.shift() ?? []
    }
    chain.values = () => chain
    chain.returning = () => chain
    chain.onConflictDoUpdate = () => chain
    chain.onConflictDoNothing = () => chain
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  function makeUpdateChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestUpdateResult
      return queue.shift() ?? []
    }
    chain.set = () => chain
    chain.where = () => chain
    chain.returning = () => chain
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  function makeDeleteChain() {
    const chain: Record<string, unknown> = {}
    chain.where = () => chain
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve((globalThis as Record<string, unknown>).__rpTestDeleteResult).then(resolve)
    return chain
  }

  return {
    db: {
      select: () => makeSelectChain(),
      insert: () => makeInsertChain(),
      update: () => makeUpdateChain(),
      delete: (_table: unknown) => makeDeleteChain(),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
        select: () => makeSelectChain(),
        insert: () => makeInsertChain(),
        update: () => makeUpdateChain(),
        delete: (_table: unknown) => makeDeleteChain(),
      })),
    },
  }
})

vi.mock('@/shared/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))

import { resourcePoolRepository } from '../resource-pool.repository'

function setSelectQueue(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestSelectQueue
  queue.length = 0
  queue.push(...results)
}

function setInsertResult(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestInsertResult
  queue.length = 0
  queue.push(...results)
}

function setUpdateResult(...results: unknown[][]) {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpTestUpdateResult
  queue.length = 0
  queue.push(...results)
}

const TENANT = 'tenant-1'
const USER = 'user-1'

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.skills', () => {
  it('addSkill inserts and returns the skill record', async () => {
    const skill = {
      id: 'skill-1', tenantId: TENANT, userId: USER,
      skillType: 'SERVICE', skillId: 'svc-1', skillName: 'Haircut',
      proficiency: 'EXPERT', verifiedAt: null, verifiedBy: null,
      expiresAt: null, metadata: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([skill])

    const result = await resourcePoolRepository.addSkill(TENANT, USER, {
      skillType: 'SERVICE', skillId: 'svc-1', skillName: 'Haircut', proficiency: 'EXPERT',
    })

    expect(result).toEqual(skill)
  })

  it('listSkills returns skills for a user', async () => {
    const skills = [
      { id: 'skill-1', skillType: 'SERVICE', skillId: 'svc-1', skillName: 'Haircut', proficiency: 'EXPERT' },
      { id: 'skill-2', skillType: 'CERTIFICATION', skillId: 'first-aid', skillName: 'First Aid', proficiency: 'ADVANCED' },
    ]
    setSelectQueue(skills)

    const result = await resourcePoolRepository.listSkills(TENANT, USER)
    expect(result).toHaveLength(2)
  })

  it('listSkills filters by skillType', async () => {
    setSelectQueue([{ id: 'skill-1', skillType: 'SERVICE' }])

    const result = await resourcePoolRepository.listSkills(TENANT, USER, 'SERVICE')
    expect(result).toHaveLength(1)
  })

  it('findUsersWithSkill returns user IDs', async () => {
    setSelectQueue([{ userId: 'user-1' }, { userId: 'user-2' }])

    const result = await resourcePoolRepository.findUsersWithSkill(TENANT, 'SERVICE', 'svc-1')
    expect(result).toEqual(['user-1', 'user-2'])
  })
})

// ---------------------------------------------------------------------------
// Capacities
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.capacities', () => {
  it('setCapacity upserts and returns the capacity record', async () => {
    const cap = {
      id: 'cap-1', tenantId: TENANT, userId: USER,
      capacityType: 'bookings', maxConcurrent: null, maxDaily: 8,
      maxWeekly: null, unit: 'COUNT',
      effectiveFrom: new Date('2026-01-01'), effectiveUntil: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([cap])

    const result = await resourcePoolRepository.setCapacity(TENANT, USER, {
      capacityType: 'bookings', maxDaily: 8, effectiveFrom: '2026-01-01',
    })

    expect(result.maxDaily).toBe(8)
  })

  it('getCapacity returns the effective capacity for a date', async () => {
    setSelectQueue([{
      id: 'cap-1', capacityType: 'bookings', maxDaily: 8,
      effectiveFrom: new Date('2026-01-01'), effectiveUntil: null,
    }])

    const result = await resourcePoolRepository.getCapacity(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.maxDaily).toBe(8)
  })

  it('getCapacity returns null when no capacity is set', async () => {
    setSelectQueue([])

    const result = await resourcePoolRepository.getCapacity(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.assignments', () => {
  it('createAssignment inserts and returns the record', async () => {
    const assignment = {
      id: 'asgn-1', tenantId: TENANT, userId: USER,
      moduleSlug: 'bookings', resourceType: 'booking', resourceId: 'bk-1',
      status: 'ASSIGNED', weight: '1.00', scheduledDate: new Date('2026-06-15'),
      assignedAt: new Date(), startedAt: null, completedAt: null,
      assignedBy: null, overrideReason: null, metadata: null,
    }
    setInsertResult([assignment])

    const result = await resourcePoolRepository.createAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-1', scheduledDate: '2026-06-15',
    })

    expect(result.moduleSlug).toBe('bookings')
  })

  it('getActiveWeightForDate returns sum of weights', async () => {
    setSelectQueue([{ total: '5.50' }])

    const result = await resourcePoolRepository.getActiveWeightForDate(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).toBe(5.5)
  })

  it('getActiveWeightForDate returns 0 when no assignments', async () => {
    setSelectQueue([{ total: null }])

    const result = await resourcePoolRepository.getActiveWeightForDate(TENANT, USER, 'bookings', '2026-06-15')
    expect(result).toBe(0)
  })

  it('completeAssignment sets status and completedAt', async () => {
    setUpdateResult([{ id: 'asgn-1', status: 'COMPLETED' }])

    const result = await resourcePoolRepository.completeAssignment(TENANT, 'asgn-1')
    expect(result.status).toBe('COMPLETED')
  })

  it('cancelAssignment sets status to CANCELLED', async () => {
    setUpdateResult([{ id: 'asgn-1', status: 'CANCELLED' }])

    const result = await resourcePoolRepository.cancelAssignment(TENANT, 'asgn-1')
    expect(result.status).toBe('CANCELLED')
  })

  it('listAssignments returns paginated results', async () => {
    const assignments = Array.from({ length: 3 }, (_, i) => ({
      id: `asgn-${i}`, userId: USER, moduleSlug: 'bookings',
    }))
    setSelectQueue(assignments)

    const result = await resourcePoolRepository.listAssignments(TENANT, USER, { limit: 50 })
    expect(result.rows).toHaveLength(3)
    expect(result.hasMore).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Skill Definitions (Catalog)
// ---------------------------------------------------------------------------

describe('resourcePoolRepository.skillDefinitions', () => {
  it('createSkillDefinition inserts and returns the record', async () => {
    const def = {
      id: 'def-1', tenantId: TENANT, slug: 'pipe-fitting', name: 'Pipe Fitting',
      skillType: 'QUALIFICATION', category: 'Trade Skills', description: null,
      requiresVerification: false, requiresExpiry: false, isActive: true,
      metadata: null, createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([def])

    const result = await resourcePoolRepository.createSkillDefinition(TENANT, {
      name: 'Pipe Fitting', skillType: 'QUALIFICATION', category: 'Trade Skills',
    })

    expect(result).toEqual(def)
  })

  it('createSkillDefinition auto-generates slug from name', async () => {
    const def = {
      id: 'def-2', tenantId: TENANT, slug: 'first-aid-certificate', name: 'First Aid Certificate',
      skillType: 'CERTIFICATION', category: 'Safety', description: null,
      requiresVerification: true, requiresExpiry: true, isActive: true,
      metadata: null, createdAt: new Date(), updatedAt: new Date(),
    }
    setInsertResult([def])

    const result = await resourcePoolRepository.createSkillDefinition(TENANT, {
      name: 'First Aid Certificate', skillType: 'CERTIFICATION', category: 'Safety',
      requiresVerification: true, requiresExpiry: true,
    })

    expect(result.slug).toBe('first-aid-certificate')
  })

  it('listSkillDefinitions returns definitions for a tenant', async () => {
    const defs = [
      { id: 'def-1', slug: 'pipe-fitting', name: 'Pipe Fitting' },
      { id: 'def-2', slug: 'first-aid', name: 'First Aid' },
    ]
    setSelectQueue(defs)

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT)
    expect(result).toHaveLength(2)
  })

  it('listSkillDefinitions filters by skillType', async () => {
    setSelectQueue([{ id: 'def-1', skillType: 'CERTIFICATION' }])

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT, { skillType: 'CERTIFICATION' })
    expect(result).toHaveLength(1)
  })

  it('listSkillDefinitions filters by isActive', async () => {
    setSelectQueue([{ id: 'def-1', isActive: true }])

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT, { isActive: true })
    expect(result).toHaveLength(1)
  })

  it('listSkillDefinitions filters by search term', async () => {
    setSelectQueue([{ id: 'def-1', name: 'Pipe Fitting' }])

    const result = await resourcePoolRepository.listSkillDefinitions(TENANT, { search: 'pipe' })
    expect(result).toHaveLength(1)
  })

  it('getSkillDefinitionById returns the definition or null', async () => {
    setSelectQueue([{ id: 'def-1', slug: 'pipe-fitting' }])

    const result = await resourcePoolRepository.getSkillDefinitionById(TENANT, 'def-1')
    expect(result).not.toBeNull()
    expect(result!.slug).toBe('pipe-fitting')
  })

  it('getSkillDefinitionById returns null when not found', async () => {
    setSelectQueue([])

    const result = await resourcePoolRepository.getSkillDefinitionById(TENANT, 'nonexistent')
    expect(result).toBeNull()
  })

  it('updateSkillDefinition updates and returns the record', async () => {
    setUpdateResult([{ id: 'def-1', name: 'Updated Name', isActive: true }])

    const result = await resourcePoolRepository.updateSkillDefinition(TENANT, 'def-1', { name: 'Updated Name' })
    expect(result.name).toBe('Updated Name')
  })

  it('updateSkillDefinition throws NotFoundError when missing', async () => {
    setUpdateResult([])

    await expect(
      resourcePoolRepository.updateSkillDefinition(TENANT, 'nonexistent', { name: 'X' })
    ).rejects.toThrow('not found')
  })

  it('softDeleteSkillDefinition sets isActive to false', async () => {
    setUpdateResult([{ id: 'def-1', isActive: false }])

    const result = await resourcePoolRepository.softDeleteSkillDefinition(TENANT, 'def-1')
    expect(result.isActive).toBe(false)
  })

  it('upsertSkillDefinitionBySlug is idempotent', async () => {
    // First call inserts
    setInsertResult([{ id: 'def-1', slug: 'haircut', name: 'Haircut' }])
    const first = await resourcePoolRepository.upsertSkillDefinitionBySlug(TENANT, {
      slug: 'haircut', name: 'Haircut', skillType: 'SERVICE',
    })
    expect(first).not.toBeNull()

    // Second call with conflict returns null (no-op)
    setInsertResult([])
    const second = await resourcePoolRepository.upsertSkillDefinitionBySlug(TENANT, {
      slug: 'haircut', name: 'Haircut', skillType: 'SERVICE',
    })
    expect(second).toBeNull()
  })
})
