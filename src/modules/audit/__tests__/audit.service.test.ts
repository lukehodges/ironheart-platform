import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that reference them
// ---------------------------------------------------------------------------

vi.mock('../audit.repository', () => ({
  auditRepository: {
    listAuditLogs: vi.fn(),
    countAuditLogs: vi.fn(),
    fetchForExport: vi.fn(),
  },
}))

vi.mock('@/shared/module-system/register-all', () => ({
  moduleRegistry: { getEnabledManifests: vi.fn().mockReturnValue([]) },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

import { auditService } from '../audit.service'
import { auditRepository } from '../audit.repository'
import { moduleRegistry } from '@/shared/module-system/register-all'
import { BadRequestError } from '@/shared/errors'
import type { AuditLogEntry } from '../audit.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000002'

function makeAuditEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    tenantId: TENANT_ID,
    userId: USER_ID,
    action: 'booking.created',
    entityType: 'booking',
    entityId: '00000000-0000-0000-0000-000000000020',
    oldValues: null,
    newValues: { status: 'CONFIRMED' },
    ipAddress: '127.0.0.1',
    userAgent: null,
    sessionId: null,
    requestId: null,
    severity: 'INFO',
    metadata: null,
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    actor: {
      id: USER_ID,
      name: 'Test User',
      email: 'test@example.com',
    },
    resourceName: '',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// auditService.list
// ---------------------------------------------------------------------------

describe('auditService.list', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns rows with hasMore=true when the repository indicates more pages', async () => {
    const rows = [
      makeAuditEntry({ id: 'a1', createdAt: new Date('2026-01-15T12:00:00Z') }),
      makeAuditEntry({ id: 'a2', createdAt: new Date('2026-01-15T11:00:00Z') }),
    ]
    vi.mocked(auditRepository.listAuditLogs).mockResolvedValue({ rows, hasMore: true })

    const result = await auditService.list(TENANT_ID, { limit: 2 })

    expect(result.rows).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it('returns hasMore=false on the last page', async () => {
    const rows = [makeAuditEntry({ id: 'a1' })]
    vi.mocked(auditRepository.listAuditLogs).mockResolvedValue({ rows, hasMore: false })

    const result = await auditService.list(TENANT_ID, { limit: 50 })

    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('generates nextCursor from last row createdAt when hasMore is true', async () => {
    const lastDate = new Date('2026-01-15T09:30:00.000Z')
    const rows = [
      makeAuditEntry({ id: 'a1', createdAt: new Date('2026-01-15T12:00:00Z') }),
      makeAuditEntry({ id: 'a2', createdAt: lastDate }),
    ]
    vi.mocked(auditRepository.listAuditLogs).mockResolvedValue({ rows, hasMore: true })

    const result = await auditService.list(TENANT_ID, { limit: 2 })

    expect(result.nextCursor).toBe(lastDate.toISOString())
  })

  it('returns nextCursor=null when hasMore is false even with rows', async () => {
    const rows = [makeAuditEntry({ id: 'a1' })]
    vi.mocked(auditRepository.listAuditLogs).mockResolvedValue({ rows, hasMore: false })

    const result = await auditService.list(TENANT_ID, { limit: 50 })

    expect(result.nextCursor).toBeNull()
  })

  it('passes filters correctly to repository', async () => {
    vi.mocked(auditRepository.listAuditLogs).mockResolvedValue({ rows: [], hasMore: false })

    const dateFrom = new Date('2026-01-01T00:00:00Z')
    const dateTo = new Date('2026-01-31T23:59:59Z')

    await auditService.list(TENANT_ID, {
      action: 'booking.created',
      resourceType: 'booking',
      userId: USER_ID,
      dateFrom,
      dateTo,
      limit: 25,
      cursor: '2026-01-15T12:00:00.000Z',
    })

    expect(auditRepository.listAuditLogs).toHaveBeenCalledWith(
      TENANT_ID,
      {
        action: 'booking.created',
        resourceType: 'booking',
        userId: USER_ID,
        dateFrom,
        dateTo,
      },
      25,
      '2026-01-15T12:00:00.000Z',
    )
  })

  it('always passes tenantId to the repository (tenant isolation)', async () => {
    vi.mocked(auditRepository.listAuditLogs).mockResolvedValue({ rows: [], hasMore: false })

    const otherTenantId = '00000000-0000-0000-0000-000000000099'
    await auditService.list(otherTenantId, { limit: 10 })

    expect(auditRepository.listAuditLogs).toHaveBeenCalledWith(
      otherTenantId,
      expect.any(Object),
      10,
      undefined,
    )
  })
})

// ---------------------------------------------------------------------------
// auditService.exportCsv
// ---------------------------------------------------------------------------

describe('auditService.exportCsv', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('generates proper CSV with correct headers', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(1)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([
      makeAuditEntry(),
    ])

    const csv = await auditService.exportCsv(TENANT_ID, {})

    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      'id,createdAt,action,entityType,entityId,userId,severity,ipAddress,oldValues,newValues,metadata'
    )
    // Second line is the data row
    expect(lines).toHaveLength(2)
    // Verify key fields appear in the data row
    expect(lines[1]).toContain('00000000-0000-0000-0000-000000000010')
    expect(lines[1]).toContain('booking.created')
    expect(lines[1]).toContain('INFO')
    expect(lines[1]).toContain('127.0.0.1')
  })

  it('returns headers-only CSV when no rows found', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(0)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([])

    const csv = await auditService.exportCsv(TENANT_ID, {})

    const lines = csv.split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe(
      'id,createdAt,action,entityType,entityId,userId,severity,ipAddress,oldValues,newValues,metadata'
    )
  })

  it('throws BadRequestError when row count exceeds 10,000', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(10_001)

    await expect(
      auditService.exportCsv(TENANT_ID, {})
    ).rejects.toThrow(BadRequestError)

    // Should NOT call fetchForExport when count exceeds limit
    expect(auditRepository.fetchForExport).not.toHaveBeenCalled()
  })

  it('does not throw when row count is exactly 10,000', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(10_000)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([])

    await expect(
      auditService.exportCsv(TENANT_ID, {})
    ).resolves.toBeDefined()

    expect(auditRepository.fetchForExport).toHaveBeenCalled()
  })

  it('escapes commas in field values with double-quotes', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(1)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([
      makeAuditEntry({ action: 'customer.updated,merged' }),
    ])

    const csv = await auditService.exportCsv(TENANT_ID, {})
    const dataLine = csv.split('\n')[1]!

    // The field with a comma should be wrapped in double-quotes
    expect(dataLine).toContain('"customer.updated,merged"')
  })

  it('escapes double-quote characters by doubling them', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(1)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([
      makeAuditEntry({ action: 'field with "quotes"' }),
    ])

    const csv = await auditService.exportCsv(TENANT_ID, {})
    const dataLine = csv.split('\n')[1]!

    // Inner quotes are doubled; entire field is wrapped
    expect(dataLine).toContain('"field with ""quotes"""')
  })

  it('escapes newlines in field values', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(1)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([
      makeAuditEntry({
        entityType: 'line1\nline2',
      }),
    ])

    const csv = await auditService.exportCsv(TENANT_ID, {})
    // The header + 1 data row; the escaped newline should NOT produce extra CSV rows
    // Split on \n but the data row wraps the entityType in quotes
    const headerLine = csv.split('\n')[0]!
    expect(headerLine).toContain('entityType')
    // The wrapped field should contain the literal newline inside quotes
    expect(csv).toContain('"line1\nline2"')
  })

  it('serializes JSON columns (oldValues, newValues, metadata)', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(1)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([
      makeAuditEntry({
        oldValues: { status: 'PENDING' },
        newValues: { status: 'CONFIRMED' },
        metadata: { source: 'api' },
      }),
    ])

    const csv = await auditService.exportCsv(TENANT_ID, {})
    const dataLine = csv.split('\n')[1]!

    // JSON stringified values should be present (may be quoted due to containing special chars)
    expect(csv).toContain('PENDING')
    expect(csv).toContain('CONFIRMED')
    expect(csv).toContain('api')
  })

  it('always passes tenantId to count and fetch (tenant isolation)', async () => {
    vi.mocked(auditRepository.countAuditLogs).mockResolvedValue(0)
    vi.mocked(auditRepository.fetchForExport).mockResolvedValue([])

    const otherTenantId = '00000000-0000-0000-0000-000000000099'
    await auditService.exportCsv(otherTenantId, {})

    expect(auditRepository.countAuditLogs).toHaveBeenCalledWith(
      otherTenantId,
      expect.any(Object),
    )
    expect(auditRepository.fetchForExport).toHaveBeenCalledWith(
      otherTenantId,
      expect.any(Object),
      10_000,
    )
  })
})

// ---------------------------------------------------------------------------
// auditService.getFilterOptions
// ---------------------------------------------------------------------------

describe('auditService.getFilterOptions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns resource types from enabled module manifests', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([
      { slug: 'booking', auditResources: ['booking', 'booking-slot'] },
      { slug: 'customer', auditResources: ['customer', 'customer-note'] },
    ] as never)

    const result = auditService.getFilterOptions(['booking', 'customer'])

    expect(result.resourceTypes).toEqual([
      'booking',
      'booking-slot',
      'customer',
      'customer-note',
    ])
  })

  it('returns empty array when no manifests are enabled', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([])

    const result = auditService.getFilterOptions([])

    expect(result.resourceTypes).toEqual([])
  })

  it('handles manifests without auditResources (undefined)', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([
      { slug: 'analytics' },
      { slug: 'customer', auditResources: ['customer'] },
    ] as never)

    const result = auditService.getFilterOptions(['analytics', 'customer'])

    expect(result.resourceTypes).toEqual(['customer'])
  })

  it('passes enabledSlugs to moduleRegistry.getEnabledManifests', () => {
    vi.mocked(moduleRegistry.getEnabledManifests).mockReturnValue([])

    const slugs = ['booking', 'customer', 'review']
    auditService.getFilterOptions(slugs)

    expect(moduleRegistry.getEnabledManifests).toHaveBeenCalledWith(slugs)
  })
})
