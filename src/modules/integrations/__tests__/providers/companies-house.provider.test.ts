// src/modules/integrations/__tests__/providers/companies-house.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────────
const mockUpdateSet = vi.fn((_set?: Record<string, unknown>) => ({
  where: vi.fn(async () => undefined),
}))
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))

const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}

vi.mock('@/shared/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    update: mockUpdate,
  },
}))

vi.mock('@/modules/jobs/event-emitter', () => ({
  emitEvent: vi.fn(async () => ({ eventId: 1 })),
}))

vi.mock('@/shared/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

vi.mock('@/shared/db/schema', () => ({
  companies: {
    id: 'id',
    tenantId: 'tenantId',
    enrichment: 'enrichment',
  },
}))

import { enrichCompany } from '../../providers/companies-house.service'
import { emitEvent } from '@/modules/jobs/event-emitter'

const TENANT = '00000000-0000-0000-0000-000000000001'
const COMPANY = '00000000-0000-0000-0000-000000000999'

describe('Companies House enrichment service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.COMPANIES_HOUSE_API_KEY = 'test-key'
  })

  it('writes enrichment to companies.enrichment and emits company.enriched', async () => {
    // 1st select: load company row
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        id: COMPANY,
        tenantId: TENANT,
        name: 'Acme Ltd',
        domain: 'acme.co.uk',
        employeeBand: null,
        ownerLed: false,
        enrichment: {},
      },
    ])

    // Mock global fetch — first call = search, second = profile, third = officers
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/search/companies')) {
        return new Response(
          JSON.stringify({ items: [{ company_number: '12345678', title: 'Acme Ltd' }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      if (url.includes('/officers')) {
        return new Response(
          JSON.stringify({
            items: [{ name: 'Smith, John', officer_role: 'director', appointed_on: '2020-01-01' }],
          }),
          { status: 200 },
        )
      }
      // profile
      return new Response(
        JSON.stringify({
          company_number: '12345678',
          company_name: 'Acme Ltd',
          company_status: 'active',
          type: 'ltd',
          date_of_creation: '2020-01-01',
          sic_codes: ['62012'],
          registered_office_address: {
            address_line_1: '1 Test St',
            locality: 'London',
            postal_code: 'EC1A 1AA',
            country: 'United Kingdom',
          },
          accounts: { next_due: '2026-12-31', last_accounts: { made_up_to: '2024-12-31' } },
        }),
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await enrichCompany(TENANT, COMPANY)

    expect(fetchMock).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledOnce()
    const setArg = mockUpdateSet.mock.calls[0]?.[0] as Record<string, unknown>
    expect(setArg).toBeDefined()
    const enrichmentWritten = setArg.enrichment as Record<string, unknown>
    expect(enrichmentWritten.companiesHouse).toMatchObject({
      companyNumber: '12345678',
      name: 'Acme Ltd',
      status: 'active',
    })
    // 1 director → infers ownerLed = true and employeeBand '1-2'
    expect(setArg.ownerLed).toBe(true)
    expect(setArg.employeeBand).toBe('1-2')

    expect(emitEvent).toHaveBeenCalledOnce()
    const emitArg = vi.mocked(emitEvent).mock.calls[0]![0]
    expect(emitArg.kind).toBe('company.enriched')
    expect(emitArg.entityId).toBe(COMPANY)
  })

  it('exits early when company row is not found', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await enrichCompany(TENANT, COMPANY)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(emitEvent).not.toHaveBeenCalled()
  })
})
