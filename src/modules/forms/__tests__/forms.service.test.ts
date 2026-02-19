import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formsService } from '../forms.service'
import { formsRepository } from '../forms.repository'
import { inngest } from '@/shared/inngest'
import { NotFoundError, ValidationError } from '@/shared/errors'
import type { FormTemplateRecord, CompletedFormRecord } from '../forms.types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../forms.repository', () => ({
  formsRepository: {
    listTemplates: vi.fn(),
    findTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    createInstance: vi.fn(),
    findByToken: vi.fn(),
    markCompleted: vi.fn(),
    listResponses: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const TEMPLATE_ID = '00000000-0000-0000-0000-000000000002'
const INSTANCE_ID = '00000000-0000-0000-0000-000000000003'
const TOKEN = 'test-session-token-uuid'

function makeTemplate(overrides: Partial<FormTemplateRecord> = {}): FormTemplateRecord {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    name: 'Test Form',
    description: null,
    fields: [
      { id: 'f1', label: 'Name', type: 'TEXT', required: true },
      { id: 'f2', label: 'Email', type: 'EMAIL', required: false },
      {
        id: 'f3',
        label: 'Option',
        type: 'SELECT',
        required: false,
        options: ['opt1', 'opt2'],
      },
    ],
    isActive: true,
    attachedServices: null,
    sendTiming: 'IMMEDIATE',
    sendOffsetHours: null,
    requiresSignature: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeInstance(overrides: Partial<CompletedFormRecord> = {}): CompletedFormRecord {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return {
    id: INSTANCE_ID,
    tenantId: TENANT_ID,
    templateId: TEMPLATE_ID,
    bookingId: null,
    customerId: null,
    sessionKey: TOKEN,
    status: 'PENDING',
    responses: null,
    signature: null,
    completedAt: null,
    expiresAt: future,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeCtx(tenantId = TENANT_ID) {
  return {
    tenantId,
    user: { id: 'user-1', tenantId },
    db: {},
    session: null,
    requestId: 'req-1',
    req: {} as unknown,
    tenantSlug: 'test-tenant',
  } as unknown as import('@/shared/trpc').Context
}

// ---------------------------------------------------------------------------
// formsService.submitFormResponse
// ---------------------------------------------------------------------------

describe('formsService.submitFormResponse', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws NotFoundError if token not found', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(null as never)

    await expect(
      formsService.submitFormResponse(TOKEN, { f1: 'Alice' })
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ValidationError if form already completed', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(
      makeInstance({ status: 'COMPLETED' }) as never
    )

    await expect(
      formsService.submitFormResponse(TOKEN, { f1: 'Alice' })
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError if form expired', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(
      makeInstance({ expiresAt: new Date(Date.now() - 1000) }) as never
    )

    await expect(
      formsService.submitFormResponse(TOKEN, { f1: 'Alice' })
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for required field missing', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(makeInstance() as never)
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)

    // f1 is required but not provided
    await expect(
      formsService.submitFormResponse(TOKEN, {})
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid email field', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(makeInstance() as never)
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)

    // f1 is required and provided; f2 is EMAIL type with invalid value
    await expect(
      formsService.submitFormResponse(TOKEN, { f1: 'Alice', f2: 'not-an-email' })
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid SELECT option', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(makeInstance() as never)
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)

    // f3 is SELECT with options ['opt1', 'opt2']; provide invalid option
    await expect(
      formsService.submitFormResponse(TOKEN, { f1: 'Alice', f3: 'invalid-option' })
    ).rejects.toThrow(ValidationError)
  })

  it('calls formsRepository.markCompleted with responses', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(makeInstance() as never)
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)
    vi.mocked(formsRepository.markCompleted).mockResolvedValue(undefined)

    const responses = { f1: 'Alice', f2: 'alice@example.com', f3: 'opt1' }
    await formsService.submitFormResponse(TOKEN, responses)

    expect(formsRepository.markCompleted).toHaveBeenCalledWith(
      INSTANCE_ID,
      responses,
      undefined,
    )
  })

  it('emits forms/submitted inngest event on success', async () => {
    vi.mocked(formsRepository.findByToken).mockResolvedValue(makeInstance() as never)
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)
    vi.mocked(formsRepository.markCompleted).mockResolvedValue(undefined)

    await formsService.submitFormResponse(TOKEN, { f1: 'Alice' })

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'forms/submitted' })
    )
  })
})

// ---------------------------------------------------------------------------
// formsService.sendForm
// ---------------------------------------------------------------------------

describe('formsService.sendForm', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates form instance with PENDING status', async () => {
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)
    vi.mocked(formsRepository.createInstance).mockResolvedValue(makeInstance() as never)

    const ctx = makeCtx()
    await formsService.sendForm(ctx, { templateId: TEMPLATE_ID })

    expect(formsRepository.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' })
    )
  })

  it('generates a unique sessionKey (UUID)', async () => {
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)
    const createdInstances: string[] = []
    vi.mocked(formsRepository.createInstance).mockImplementation(async (input) => {
      createdInstances.push(input.sessionKey)
      return makeInstance({ sessionKey: input.sessionKey }) as never
    })

    const ctx = makeCtx()
    await formsService.sendForm(ctx, { templateId: TEMPLATE_ID })
    await formsService.sendForm(ctx, { templateId: TEMPLATE_ID })

    expect(createdInstances[0]).not.toBe(createdInstances[1])
    // UUID v4 pattern
    expect(createdInstances[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('sets expiresAt to ~7 days in the future', async () => {
    vi.mocked(formsRepository.findTemplateById).mockResolvedValue(makeTemplate() as never)
    let capturedExpiresAt: Date | null = null
    vi.mocked(formsRepository.createInstance).mockImplementation(async (input) => {
      capturedExpiresAt = input.expiresAt
      return makeInstance({ expiresAt: input.expiresAt }) as never
    })

    const ctx = makeCtx()
    const beforeCall = Date.now()
    await formsService.sendForm(ctx, { templateId: TEMPLATE_ID })
    const afterCall = Date.now()

    expect(capturedExpiresAt).not.toBeNull()
    const expiresAtMs = capturedExpiresAt!.getTime()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    // Should be approximately 7 days from now (within a 5 second tolerance)
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeCall + sevenDaysMs - 5000)
    expect(expiresAtMs).toBeLessThanOrEqual(afterCall + sevenDaysMs + 5000)
  })
})
