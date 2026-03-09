import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted variables - available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockTransaction, mockQuery } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockQuery: {
    tenants: { findFirst: vi.fn() },
    users: { findFirst: vi.fn() },
  },
}))

// ---------------------------------------------------------------------------
// Mocks - must be declared BEFORE importing the service
// ---------------------------------------------------------------------------

vi.mock('../platform.repository', () => ({
  platformRepository: {
    listTenants: vi.fn(),
    getTenant: vi.fn(),
    updateTenant: vi.fn(),
    suspendTenant: vi.fn(),
    activateTenant: vi.fn(),
    changePlan: vi.fn(),
    insertAuditLog: vi.fn(),
    listFlags: vi.fn(),
    upsertFlag: vi.fn(),
    setTenantFlag: vi.fn(),
    listTenantFlags: vi.fn(),
    listTenantModules: vi.fn(),
    setTenantModule: vi.fn(),
    listSignupRequests: vi.fn(),
    findSignupRequestById: vi.fn(),
    updateSignupRequest: vi.fn(),
    queryAuditLog: vi.fn(),
  },
}))

vi.mock('@/modules/tenant/tenant.repository', () => ({
  tenantRepository: {},
}))

vi.mock('@/shared/db', () => ({
  db: {
    transaction: mockTransaction,
    query: mockQuery,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}))

vi.mock('@/shared/db/schema', () => ({
  tenants: { id: 'tenants.id', name: 'tenants.name', slug: 'tenants.slug', status: 'tenants.status', plan: 'tenants.plan', billingEmail: 'tenants.billingEmail', trialEndsAt: 'tenants.trialEndsAt', createdAt: 'tenants.createdAt', updatedAt: 'tenants.updatedAt', $inferInsert: {} },
  organizationSettings: { tenantId: 'organizationSettings.tenantId' },
  modules: { id: 'modules.id', slug: 'modules.slug' },
  tenantModules: { id: 'tenantModules.id', tenantId: 'tenantModules.tenantId', moduleId: 'tenantModules.moduleId' },
  impersonationSessions: { id: 'impersonationSessions.id' },
  users: { workosUserId: 'users.workosUserId' },
}))

vi.mock('@/shared/redis', () => ({
  redis: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
}))

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports - AFTER mocks
// ---------------------------------------------------------------------------

import { platformService } from '../platform.service'
import { platformRepository } from '../platform.repository'
import { db } from '@/shared/db'
import { redis } from '@/shared/redis'
import { NotFoundError, ForbiddenError } from '@/shared/errors'
import type {
  TenantRecord,
  FeatureFlag,
  TenantFeature,
  TenantModule,
  AuditLogRecord,
  SignupRequest,
} from '../platform.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const TENANT_ID_2 = '00000000-0000-0000-0000-000000000002'
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000010'
const ADMIN_DB_ID = '00000000-0000-0000-0000-000000000011'
const SESSION_ID = '00000000-0000-0000-0000-000000000020'
const SIGNUP_ID = '00000000-0000-0000-0000-000000000030'
const MODULE_ID = '00000000-0000-0000-0000-000000000040'
const FLAG_ID = '00000000-0000-0000-0000-000000000050'

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeTenant(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: TENANT_ID,
    slug: 'test-tenant',
    name: 'Test Business',
    plan: 'STARTER',
    status: 'ACTIVE',
    trialEndsAt: null,
    suspendedAt: null,
    suspendedReason: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeSignupRequest(overrides: Partial<SignupRequest> = {}): SignupRequest {
  return {
    id: SIGNUP_ID,
    tenantId: TENANT_ID,
    name: 'John Doe',
    email: 'john@example.com',
    businessName: 'John Corp',
    status: 'PENDING',
    reason: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeAuditLog(overrides: Partial<AuditLogRecord> = {}): AuditLogRecord {
  return {
    id: '00000000-0000-0000-0000-000000000099',
    tenantId: TENANT_ID,
    userId: null,
    action: 'TENANT_SUSPENDED',
    entityType: 'tenant',
    entityId: TENANT_ID,
    oldValues: null,
    newValues: null,
    severity: 'INFO',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeFeatureFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: FLAG_ID,
    slug: 'dark-mode',
    name: 'Dark Mode',
    description: null,
    defaultEnabled: false,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeTenantModule(overrides: Partial<TenantModule> = {}): TenantModule {
  return {
    id: MODULE_ID,
    tenantId: TENANT_ID,
    moduleId: '00000000-0000-0000-0000-000000000041',
    moduleSlug: 'forms',
    moduleName: 'Forms',
    isEnabled: true,
    monthlyRate: null,
    activatedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT_ID,
    user: { id: 'user-1', tenantId: TENANT_ID },
    session: {
      user: {
        id: ADMIN_USER_ID,
        email: 'admin@platform.com',
      },
    },
    db: {},
    requestId: 'req-1',
    req: {
      headers: {
        get: (key: string) => {
          const map: Record<string, string> = {
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'TestAgent/1.0',
          }
          return map[key] ?? null
        },
      },
    },
    tenantSlug: 'test-tenant',
    ...overrides,
  } as unknown as import('@/shared/trpc').Context
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// platformService.listTenants
// ---------------------------------------------------------------------------

describe('platformService.listTenants', () => {
  it('returns paginated tenant list from repository', async () => {
    const tenantList = { rows: [makeTenant(), makeTenant({ id: TENANT_ID_2 })], hasMore: false }
    vi.mocked(platformRepository.listTenants).mockResolvedValue(tenantList)

    const result = await platformService.listTenants({ limit: 50 })

    expect(result.rows).toHaveLength(2)
    expect(result.hasMore).toBe(false)
    expect(platformRepository.listTenants).toHaveBeenCalledWith({
      search: undefined,
      plan: undefined,
      status: undefined,
      limit: 50,
      cursor: undefined,
    })
  })

  it('passes search/plan/status filters to repository', async () => {
    vi.mocked(platformRepository.listTenants).mockResolvedValue({ rows: [], hasMore: false })

    await platformService.listTenants({
      search: 'acme',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      limit: 10,
      cursor: '2025-01-01T00:00:00Z',
    })

    expect(platformRepository.listTenants).toHaveBeenCalledWith({
      search: 'acme',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      limit: 10,
      cursor: '2025-01-01T00:00:00Z',
    })
  })
})

// ---------------------------------------------------------------------------
// platformService.getTenant
// ---------------------------------------------------------------------------

describe('platformService.getTenant', () => {
  it('returns tenant when found', async () => {
    const tenant = makeTenant()
    vi.mocked(platformRepository.getTenant).mockResolvedValue(tenant)

    const result = await platformService.getTenant(TENANT_ID)

    expect(result).toEqual(tenant)
    expect(platformRepository.getTenant).toHaveBeenCalledWith(TENANT_ID)
  })

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(platformRepository.getTenant).mockResolvedValue(null as never)

    await expect(platformService.getTenant(TENANT_ID)).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// platformService.provisionTenant
// ---------------------------------------------------------------------------

describe('platformService.provisionTenant', () => {
  it('calls db.transaction and returns the created tenant', async () => {
    // The service uses db.transaction directly with inline SQL operations.
    // We mock the transaction to execute the callback with a mock tx.
    const mockInsertReturning = vi.fn()
    const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })
    // defaultSlugs is empty - platform modules are all isCore, no tenantModules needed
    const mockSelectFromWhere = vi.fn().mockResolvedValue([])
    const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectFromWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom })

    // First insert (tenant) returns a row, subsequent inserts return nothing important
    let insertCallCount = 0
    mockInsertReturning.mockImplementation(() => {
      insertCallCount++
      if (insertCallCount === 1) {
        return Promise.resolve([{
          id: TENANT_ID,
          slug: 'test-business-abc12',
          name: 'Test Business',
          plan: 'STARTER',
          status: 'ACTIVE',
          trialEndsAt: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        }])
      }
      return Promise.resolve([])
    })

    const mockTx = {
      insert: mockInsert,
      select: mockSelect,
    }

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      return fn(mockTx)
    })

    const result = await platformService.provisionTenant({
      businessName: 'Test Business',
      email: 'test@example.com',
      plan: 'STARTER',
    })

    expect(result).toBeDefined()
    expect(result.id).toBe(TENANT_ID)
    expect(result.name).toBe('Test Business')
    expect(result.status).toBe('ACTIVE')
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    // At least 3 inserts: tenant, organizationSettings, and N module inserts
    expect(mockInsert).toHaveBeenCalled()
  })

  it('creates a TRIAL tenant with 14-day trial end date', async () => {
    const mockInsertReturning = vi.fn()
    const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })
    const mockSelectFromWhere = vi.fn().mockResolvedValue([])
    const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectFromWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom })

    const capturedValues: Record<string, unknown>[] = []
    mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
      capturedValues.push(vals)
      return { returning: mockInsertReturning }
    })

    mockInsertReturning.mockResolvedValueOnce([{
      id: TENANT_ID,
      slug: 'trial-biz-abc12',
      name: 'Trial Biz',
      plan: 'TRIAL',
      status: 'ACTIVE',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]).mockResolvedValue([])

    const mockTx = { insert: mockInsert, select: mockSelect }
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => fn(mockTx))

    const result = await platformService.provisionTenant({
      businessName: 'Trial Biz',
      email: 'trial@example.com',
      plan: 'TRIAL',
    })

    expect(result.plan).toBe('TRIAL')
    // The first insert should have a trialEndsAt value approximately 14 days from now
    const tenantInsert = capturedValues[0]
    expect(tenantInsert).toBeDefined()
    expect(tenantInsert!.trialEndsAt).toBeInstanceOf(Date)
    const trialEnd = tenantInsert!.trialEndsAt as Date
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
    // Allow 5 seconds of tolerance
    expect(Math.abs(trialEnd.getTime() - Date.now() - fourteenDaysMs)).toBeLessThan(5000)
  })
})

// ---------------------------------------------------------------------------
// platformService.updateTenant
// ---------------------------------------------------------------------------

describe('platformService.updateTenant', () => {
  it('passes mapped updates to repository', async () => {
    const updated = makeTenant({ name: 'New Name' })
    vi.mocked(platformRepository.updateTenant).mockResolvedValue(updated)

    const result = await platformService.updateTenant(TENANT_ID, {
      id: TENANT_ID,
      businessName: 'New Name',
    })

    expect(result.name).toBe('New Name')
    expect(platformRepository.updateTenant).toHaveBeenCalledWith(TENANT_ID, { name: 'New Name' })
  })
})

// ---------------------------------------------------------------------------
// platformService.suspendTenant
// ---------------------------------------------------------------------------

describe('platformService.suspendTenant', () => {
  it('calls repository.suspendTenant and inserts audit log', async () => {
    vi.mocked(platformRepository.suspendTenant).mockResolvedValue(undefined)
    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    await platformService.suspendTenant(TENANT_ID, 'Terms violation')

    expect(platformRepository.suspendTenant).toHaveBeenCalledWith(TENANT_ID, 'Terms violation')
    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        action: 'TENANT_SUSPENDED',
        entityType: 'tenant',
        entityId: TENANT_ID,
        newValues: { reason: 'Terms violation' },
        severity: 'WARNING',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// platformService.activateTenant
// ---------------------------------------------------------------------------

describe('platformService.activateTenant', () => {
  it('calls repository.activateTenant and inserts audit log', async () => {
    vi.mocked(platformRepository.activateTenant).mockResolvedValue(undefined)
    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    await platformService.activateTenant(TENANT_ID)

    expect(platformRepository.activateTenant).toHaveBeenCalledWith(TENANT_ID)
    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        action: 'TENANT_ACTIVATED',
        entityType: 'tenant',
        entityId: TENANT_ID,
        newValues: { status: 'ACTIVE' },
        severity: 'INFO',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// platformService.changePlan
// ---------------------------------------------------------------------------

describe('platformService.changePlan', () => {
  it('calls repository.changePlan and inserts audit log with reason', async () => {
    vi.mocked(platformRepository.changePlan).mockResolvedValue(undefined)
    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    await platformService.changePlan({
      tenantId: TENANT_ID,
      plan: 'ENTERPRISE',
      reason: 'Upgrade request',
    })

    expect(platformRepository.changePlan).toHaveBeenCalledWith(TENANT_ID, 'ENTERPRISE')
    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        action: 'PLAN_CHANGED',
        newValues: { plan: 'ENTERPRISE', reason: 'Upgrade request' },
        severity: 'INFO',
      })
    )
  })

  it('records null reason when not provided', async () => {
    vi.mocked(platformRepository.changePlan).mockResolvedValue(undefined)
    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    await platformService.changePlan({ tenantId: TENANT_ID, plan: 'PROFESSIONAL' })

    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        newValues: { plan: 'PROFESSIONAL', reason: null },
      })
    )
  })
})

// ---------------------------------------------------------------------------
// platformService.listFlags / setFlag
// ---------------------------------------------------------------------------

describe('platformService.listFlags', () => {
  it('returns flags from repository', async () => {
    const flags = [makeFeatureFlag(), makeFeatureFlag({ slug: 'beta-feature' })]
    vi.mocked(platformRepository.listFlags).mockResolvedValue(flags)

    const result = await platformService.listFlags()

    expect(result).toHaveLength(2)
    expect(platformRepository.listFlags).toHaveBeenCalled()
  })
})

describe('platformService.setFlag', () => {
  it('upserts flag via repository', async () => {
    const flag = makeFeatureFlag({ defaultEnabled: true })
    vi.mocked(platformRepository.upsertFlag).mockResolvedValue(flag)

    const result = await platformService.setFlag({ flagSlug: 'dark-mode', defaultEnabled: true })

    expect(result.defaultEnabled).toBe(true)
    expect(platformRepository.upsertFlag).toHaveBeenCalledWith('dark-mode', { defaultEnabled: true })
  })
})

// ---------------------------------------------------------------------------
// platformService.setTenantModule
// ---------------------------------------------------------------------------

describe('platformService.setTenantModule', () => {
  it('calls repository and inserts MODULE_ENABLED audit log', async () => {
    const mod = makeTenantModule()
    vi.mocked(platformRepository.setTenantModule).mockResolvedValue(mod)
    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    const result = await platformService.setTenantModule({
      tenantId: TENANT_ID,
      moduleId: '00000000-0000-0000-0000-000000000041',
      isEnabled: true,
    })

    expect(result.isEnabled).toBe(true)
    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        action: 'MODULE_ENABLED',
        entityType: 'tenantModule',
        entityId: MODULE_ID,
        newValues: expect.objectContaining({ isEnabled: true }),
      })
    )
  })

  it('records MODULE_DISABLED when disabling', async () => {
    const mod = makeTenantModule({ isEnabled: false })
    vi.mocked(platformRepository.setTenantModule).mockResolvedValue(mod)
    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    await platformService.setTenantModule({
      tenantId: TENANT_ID,
      moduleId: '00000000-0000-0000-0000-000000000041',
      isEnabled: false,
    })

    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MODULE_DISABLED',
        newValues: expect.objectContaining({ isEnabled: false }),
      })
    )
  })
})

// ---------------------------------------------------------------------------
// platformService.approveSignup
// ---------------------------------------------------------------------------

describe('platformService.approveSignup', () => {
  it('approves signup request and activates tenant when tenantId present', async () => {
    const signup = makeSignupRequest({ tenantId: TENANT_ID })
    vi.mocked(platformRepository.findSignupRequestById).mockResolvedValue(signup)
    vi.mocked(platformRepository.updateSignupRequest).mockResolvedValue(undefined)
    vi.mocked(platformRepository.activateTenant).mockResolvedValue(undefined)

    await platformService.approveSignup({ id: SIGNUP_ID })

    expect(platformRepository.findSignupRequestById).toHaveBeenCalledWith(SIGNUP_ID)
    expect(platformRepository.updateSignupRequest).toHaveBeenCalledWith(SIGNUP_ID, {
      status: 'APPROVED',
    })
    expect(platformRepository.activateTenant).toHaveBeenCalledWith(TENANT_ID)
  })

  it('does not activate tenant when signup request has no tenantId', async () => {
    const signup = makeSignupRequest({ tenantId: null })
    vi.mocked(platformRepository.findSignupRequestById).mockResolvedValue(signup)
    vi.mocked(platformRepository.updateSignupRequest).mockResolvedValue(undefined)

    await platformService.approveSignup({ id: SIGNUP_ID })

    expect(platformRepository.updateSignupRequest).toHaveBeenCalledWith(SIGNUP_ID, {
      status: 'APPROVED',
    })
    expect(platformRepository.activateTenant).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when signup request does not exist', async () => {
    vi.mocked(platformRepository.findSignupRequestById).mockResolvedValue(null as never)

    await expect(platformService.approveSignup({ id: SIGNUP_ID })).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// platformService.rejectSignup
// ---------------------------------------------------------------------------

describe('platformService.rejectSignup', () => {
  it('updates signup request status to REJECTED', async () => {
    vi.mocked(platformRepository.updateSignupRequest).mockResolvedValue(undefined)

    await platformService.rejectSignup({ id: SIGNUP_ID, reason: 'Spam' })

    expect(platformRepository.updateSignupRequest).toHaveBeenCalledWith(SIGNUP_ID, {
      status: 'REJECTED',
    })
  })
})

// ---------------------------------------------------------------------------
// platformService.listSignupRequests
// ---------------------------------------------------------------------------

describe('platformService.listSignupRequests', () => {
  it('returns signup requests from repository', async () => {
    const signups = [makeSignupRequest()]
    vi.mocked(platformRepository.listSignupRequests).mockResolvedValue(signups)

    const result = await platformService.listSignupRequests({ status: 'PENDING' })

    expect(result).toHaveLength(1)
    expect(platformRepository.listSignupRequests).toHaveBeenCalledWith({ status: 'PENDING' })
  })

  it('passes undefined opts when called without arguments', async () => {
    vi.mocked(platformRepository.listSignupRequests).mockResolvedValue([])

    await platformService.listSignupRequests()

    expect(platformRepository.listSignupRequests).toHaveBeenCalledWith(undefined)
  })
})

// ---------------------------------------------------------------------------
// platformService.getAuditLog
// ---------------------------------------------------------------------------

describe('platformService.getAuditLog', () => {
  it('returns paginated audit log from repository', async () => {
    const logEntry = makeAuditLog()
    vi.mocked(platformRepository.queryAuditLog).mockResolvedValue({
      rows: [logEntry],
      hasMore: false,
    })

    const result = await platformService.getAuditLog({
      tenantId: TENANT_ID,
      action: 'TENANT_SUSPENDED',
      limit: 50,
    })

    expect(result.rows).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(platformRepository.queryAuditLog).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      action: 'TENANT_SUSPENDED',
      entityType: undefined,
      severity: undefined,
      limit: 50,
      cursor: undefined,
    })
  })
})

// ---------------------------------------------------------------------------
// platformService.startImpersonation
// ---------------------------------------------------------------------------

describe('platformService.startImpersonation', () => {
  it('creates impersonation session and stores in Redis', async () => {
    const ctx = makeCtx()

    // Mock tenant lookup
    mockQuery.tenants.findFirst.mockResolvedValue({
      id: TENANT_ID,
      name: 'Test Business',
      status: 'ACTIVE',
    })

    // Mock platform admin user lookup
    mockQuery.users.findFirst.mockResolvedValue({
      id: ADMIN_DB_ID,
    })

    // Mock impersonation session insert
    const mockInsertReturning = vi.fn().mockResolvedValue([{
      id: SESSION_ID,
      platformAdminId: ADMIN_DB_ID,
      tenantId: TENANT_ID,
    }])
    const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning })
    vi.mocked(db.insert).mockReturnValue({ values: mockInsertValues } as never)

    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    const result = await platformService.startImpersonation(ctx, TENANT_ID)

    expect(result.sessionId).toBe(SESSION_ID)
    expect(result.tenantId).toBe(TENANT_ID)
    expect(result.tenantName).toBe('Test Business')
    expect(redis.setex).toHaveBeenCalledWith(
      `impersonate:${ADMIN_USER_ID}`,
      86400,
      expect.objectContaining({ sessionId: SESSION_ID, tenantId: TENANT_ID }),
    )
    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'IMPERSONATE_START',
        severity: 'WARNING',
        tenantId: TENANT_ID,
      })
    )
  })

  it('throws ForbiddenError when no session user', async () => {
    const ctx = makeCtx({ session: null })

    await expect(platformService.startImpersonation(ctx, TENANT_ID)).rejects.toThrow(ForbiddenError)
  })

  it('throws NotFoundError when tenant does not exist', async () => {
    const ctx = makeCtx()
    mockQuery.tenants.findFirst.mockResolvedValue(null)

    await expect(platformService.startImpersonation(ctx, TENANT_ID)).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when tenant is suspended', async () => {
    const ctx = makeCtx()
    mockQuery.tenants.findFirst.mockResolvedValue({
      id: TENANT_ID,
      name: 'Suspended Corp',
      status: 'SUSPENDED',
    })

    await expect(platformService.startImpersonation(ctx, TENANT_ID)).rejects.toThrow(ForbiddenError)
  })
})

// ---------------------------------------------------------------------------
// platformService.endImpersonation
// ---------------------------------------------------------------------------

describe('platformService.endImpersonation', () => {
  it('ends session, updates DB, deletes from Redis, and creates audit log', async () => {
    const ctx = makeCtx()

    // Redis returns cached session data (Upstash auto-deserializes)
    vi.mocked(redis.get).mockResolvedValue({
      sessionId: SESSION_ID,
      tenantId: TENANT_ID,
      platformAdminEmail: 'admin@platform.com',
    } as never)

    // Mock impersonation session update
    const mockSetWhere = vi.fn().mockResolvedValue([])
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockSetWhere })
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never)

    // Mock platform admin user lookup for audit log
    mockQuery.users.findFirst.mockResolvedValue({ id: ADMIN_DB_ID })

    vi.mocked(platformRepository.insertAuditLog).mockResolvedValue(undefined)

    await platformService.endImpersonation(ctx)

    expect(redis.get).toHaveBeenCalledWith(`impersonate:${ADMIN_USER_ID}`)
    expect(redis.del).toHaveBeenCalledWith(`impersonate:${ADMIN_USER_ID}`)
    expect(db.update).toHaveBeenCalled()
    expect(platformRepository.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'IMPERSONATE_END',
        tenantId: TENANT_ID,
        severity: 'INFO',
      })
    )
  })

  it('returns silently when no active impersonation session in Redis', async () => {
    const ctx = makeCtx()
    vi.mocked(redis.get).mockResolvedValue(null)

    // Should not throw
    await platformService.endImpersonation(ctx)

    expect(redis.del).not.toHaveBeenCalled()
    expect(platformRepository.insertAuditLog).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError when no session user', async () => {
    const ctx = makeCtx({ session: null })

    await expect(platformService.endImpersonation(ctx)).rejects.toThrow(ForbiddenError)
  })
})

// ---------------------------------------------------------------------------
// platformService.getActiveImpersonation
// ---------------------------------------------------------------------------

describe('platformService.getActiveImpersonation', () => {
  it('returns active session from Redis with tenant name', async () => {
    const ctx = makeCtx()

    vi.mocked(redis.get).mockResolvedValue({
      sessionId: SESSION_ID,
      tenantId: TENANT_ID,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    } as never)

    mockQuery.tenants.findFirst.mockResolvedValue({ name: 'Test Business' })

    const result = await platformService.getActiveImpersonation(ctx)

    expect(result).toEqual({
      tenantId: TENANT_ID,
      tenantName: 'Test Business',
      sessionId: SESSION_ID,
    })
  })

  it('returns null when no session user', async () => {
    const ctx = makeCtx({ session: null })

    const result = await platformService.getActiveImpersonation(ctx)

    expect(result).toBeNull()
  })

  it('returns null when no cached session in Redis', async () => {
    const ctx = makeCtx()
    vi.mocked(redis.get).mockResolvedValue(null)

    const result = await platformService.getActiveImpersonation(ctx)

    expect(result).toBeNull()
  })

  it('cleans up and returns null when session is expired', async () => {
    const ctx = makeCtx()

    vi.mocked(redis.get).mockResolvedValue({
      sessionId: SESSION_ID,
      tenantId: TENANT_ID,
      expiresAt: Date.now() - 1000, // expired 1 second ago
    } as never)

    const result = await platformService.getActiveImpersonation(ctx)

    expect(result).toBeNull()
    expect(redis.del).toHaveBeenCalledWith(`impersonate:${ADMIN_USER_ID}`)
  })

  it('cleans up and returns null when tenant no longer exists', async () => {
    const ctx = makeCtx()

    vi.mocked(redis.get).mockResolvedValue({
      sessionId: SESSION_ID,
      tenantId: TENANT_ID,
      expiresAt: Date.now() + 60 * 60 * 1000,
    } as never)

    mockQuery.tenants.findFirst.mockResolvedValue(null)

    const result = await platformService.getActiveImpersonation(ctx)

    expect(result).toBeNull()
    expect(redis.del).toHaveBeenCalledWith(`impersonate:${ADMIN_USER_ID}`)
  })
})
