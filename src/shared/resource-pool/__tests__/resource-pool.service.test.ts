// src/shared/resource-pool/__tests__/resource-pool.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRepo = vi.hoisted(() => ({
  addSkill: vi.fn(),
  removeSkill: vi.fn(),
  listSkills: vi.fn(),
  findUsersWithSkill: vi.fn(),
  checkSkillValid: vi.fn(),
  setCapacity: vi.fn(),
  getCapacity: vi.fn(),
  listCapacities: vi.fn(),
  createAssignment: vi.fn(),
  getActiveWeightForDate: vi.fn(),
  completeAssignment: vi.fn(),
  cancelAssignment: vi.fn(),
  listAssignments: vi.fn(),
  getStaffWorkloadForDate: vi.fn(),
  // Skill catalog methods
  listSkillDefinitions: vi.fn(),
  getSkillDefinitionById: vi.fn(),
  createSkillDefinition: vi.fn(),
  updateSkillDefinition: vi.fn(),
  softDeleteSkillDefinition: vi.fn(),
  upsertSkillDefinitionBySlug: vi.fn(),
  assignSkillFromCatalog: vi.fn(),
  unassignSkillFromCatalog: vi.fn(),
  listSkillsForUser: vi.fn(),
  // Capacity type methods
  listCapacityTypeDefinitions: vi.fn(),
  getCapacityTypeDefinitionById: vi.fn(),
  upsertCapacityTypeDefinition: vi.fn(),
  updateCapacityTypeDefinition: vi.fn(),
  deactivateCapacityTypeByModule: vi.fn(),
  reactivateCapacityTypeByModule: vi.fn(),
  getSkillDefinitionBySlug: vi.fn(),
}))

vi.mock('../resource-pool.repository', () => ({
  resourcePoolRepository: mockRepo,
}))

// Mock organizationSettings query
;(globalThis as Record<string, unknown>).__rpServiceSelectQueue = []

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__rpServiceSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy']
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }
  return { db: { select: () => makeSelectChain() } }
})

vi.mock('@/shared/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { resourcePoolService } from '../resource-pool.service'

function setOrgSettings(enforcement: 'STRICT' | 'FLEXIBLE') {
  const queue = (globalThis as unknown as Record<string, unknown[]>).__rpServiceSelectQueue
  queue.length = 0
  queue.push([{ capacityEnforcement: enforcement }])
}

beforeEach(() => {
  vi.clearAllMocks()
})

const TENANT = 'tenant-1'
const USER = 'user-1'

// ---------------------------------------------------------------------------
// requestAssignment — capacity enforcement
// ---------------------------------------------------------------------------

describe('resourcePoolService.requestAssignment', () => {
  it('succeeds when under capacity', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(5)
    mockRepo.createAssignment.mockResolvedValue({ id: 'asgn-1' })

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-1', weight: 1, scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({ success: true, assignmentId: 'asgn-1' })
  })

  it('succeeds when no capacity rule exists (unlimited)', async () => {
    mockRepo.getCapacity.mockResolvedValue(null)
    mockRepo.createAssignment.mockResolvedValue({ id: 'asgn-2' })

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-2', scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({ success: true, assignmentId: 'asgn-2' })
  })

  it('rejects when over capacity without override reason', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(8)

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-3', weight: 1, scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({
      success: false,
      reason: 'CAPACITY_EXCEEDED',
      capacityType: 'bookings',
      current: 8,
      max: 8,
      enforcement: 'FLEXIBLE',
    })
    expect(mockRepo.createAssignment).not.toHaveBeenCalled()
  })

  it('allows override in FLEXIBLE mode with reason', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(8)
    setOrgSettings('FLEXIBLE')
    mockRepo.createAssignment.mockResolvedValue({ id: 'asgn-4' })

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-4', weight: 1, scheduledDate: '2026-06-15',
      overrideReason: 'Emergency appointment',
    })

    expect(result).toEqual({ success: true, assignmentId: 'asgn-4' })
    expect(mockRepo.createAssignment).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      overrideReason: 'Emergency appointment',
    }))
  })

  it('rejects FLEXIBLE override without reason', async () => {
    mockRepo.getCapacity.mockResolvedValue({ maxDaily: 8, capacityType: 'bookings' })
    mockRepo.getActiveWeightForDate.mockResolvedValue(8)
    setOrgSettings('FLEXIBLE')

    const result = await resourcePoolService.requestAssignment(TENANT, {
      userId: USER, moduleSlug: 'bookings', resourceType: 'booking',
      resourceId: 'bk-5', weight: 1, scheduledDate: '2026-06-15',
    })

    expect(result).toEqual({
      success: false,
      reason: 'CAPACITY_EXCEEDED',
      capacityType: 'bookings',
      current: 8,
      max: 8,
      enforcement: 'FLEXIBLE',
    })
  })
})

// ---------------------------------------------------------------------------
// getStaffWorkload
// ---------------------------------------------------------------------------

describe('resourcePoolService.getStaffWorkload', () => {
  it('returns workload summary with capacity usage', async () => {
    mockRepo.getStaffWorkloadForDate.mockResolvedValue([
      { moduleSlug: 'bookings', total: '5', count: 5 },
    ])
    mockRepo.listCapacities.mockResolvedValue([
      { capacityType: 'bookings', maxDaily: 8, effectiveFrom: new Date('2026-01-01'), effectiveUntil: null },
    ])

    const result = await resourcePoolService.getStaffWorkload(TENANT, USER, '2026-06-15')

    expect(result.capacities).toEqual([
      { capacityType: 'bookings', used: 5, max: 8, available: 3, isOver: false },
    ])
  })
})

// ---------------------------------------------------------------------------
// Skill Catalog (service delegation)
// ---------------------------------------------------------------------------

describe('resourcePoolService.skillCatalog', () => {
  it('createSkillDefinition delegates to repo', async () => {
    const def = { id: 'def-1', name: 'Pipe Fitting', slug: 'pipe-fitting' }
    mockRepo.createSkillDefinition.mockResolvedValue(def)

    const result = await resourcePoolService.createSkillDefinition(TENANT, {
      name: 'Pipe Fitting', skillType: 'QUALIFICATION',
    })

    expect(result).toEqual(def)
    expect(mockRepo.createSkillDefinition).toHaveBeenCalledWith(TENANT, {
      name: 'Pipe Fitting', skillType: 'QUALIFICATION',
    })
  })

  it('listSkillDefinitions delegates to repo with filter', async () => {
    mockRepo.listSkillDefinitions.mockResolvedValue([{ id: 'def-1' }])

    const result = await resourcePoolService.listSkillDefinitions(TENANT, { skillType: 'SERVICE' })

    expect(result).toHaveLength(1)
    expect(mockRepo.listSkillDefinitions).toHaveBeenCalledWith(TENANT, { skillType: 'SERVICE' })
  })

  it('softDeleteSkillDefinition delegates to repo', async () => {
    mockRepo.softDeleteSkillDefinition.mockResolvedValue({ id: 'def-1', isActive: false })

    const result = await resourcePoolService.softDeleteSkillDefinition(TENANT, 'def-1')
    expect(result.isActive).toBe(false)
  })

  it('assignSkillFromCatalog delegates to repo', async () => {
    const skill = { id: 'rs-1', userId: USER, skillDefinitionId: 'def-1' }
    mockRepo.assignSkillFromCatalog.mockResolvedValue(skill)

    const result = await resourcePoolService.assignSkillFromCatalog(TENANT, USER, 'def-1', {
      proficiency: 'EXPERT',
    })

    expect(result).toEqual(skill)
    expect(mockRepo.assignSkillFromCatalog).toHaveBeenCalledWith(TENANT, USER, 'def-1', {
      proficiency: 'EXPERT',
    })
  })
})

// ---------------------------------------------------------------------------
// Module Integration
// ---------------------------------------------------------------------------

describe('resourcePoolService.moduleIntegration', () => {
  it('registerModuleCapacity reactivates and upserts', async () => {
    mockRepo.reactivateCapacityTypeByModule.mockResolvedValue(undefined)
    mockRepo.upsertCapacityTypeDefinition.mockResolvedValue({ id: 'ct-1' })

    await resourcePoolService.registerModuleCapacity(TENANT, 'booking', {
      slug: 'bookings', name: 'Bookings', unit: 'COUNT',
      defaultMaxDaily: 8, defaultMaxWeekly: null, defaultMaxConcurrent: null,
    })

    expect(mockRepo.reactivateCapacityTypeByModule).toHaveBeenCalledWith(TENANT, 'booking')
    expect(mockRepo.upsertCapacityTypeDefinition).toHaveBeenCalledWith(TENANT, 'booking', expect.objectContaining({
      slug: 'bookings',
    }))
  })

  it('deactivateModuleCapacity delegates to repo', async () => {
    mockRepo.deactivateCapacityTypeByModule.mockResolvedValue(undefined)

    await resourcePoolService.deactivateModuleCapacity(TENANT, 'booking')
    expect(mockRepo.deactivateCapacityTypeByModule).toHaveBeenCalledWith(TENANT, 'booking')
  })

  it('seedSuggestedSkills calls upsert for each skill', async () => {
    mockRepo.upsertSkillDefinitionBySlug.mockResolvedValue(null)

    await resourcePoolService.seedSuggestedSkills(TENANT, [
      { slug: 'haircut', name: 'Haircut', skillType: 'SERVICE' },
      { slug: 'color', name: 'Color Treatment', skillType: 'SERVICE' },
    ])

    expect(mockRepo.upsertSkillDefinitionBySlug).toHaveBeenCalledTimes(2)
  })
})
