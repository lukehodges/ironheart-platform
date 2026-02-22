import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that reference them
// ---------------------------------------------------------------------------

vi.mock('../payment.repository', () => ({
  createInvoice: vi.fn(),
  findInvoiceById: vi.fn(),
  updateInvoiceStatus: vi.fn(),
  createPayment: vi.fn(),
  listInvoices: vi.fn(),
  listPricingRules: vi.fn(),
}))

vi.mock('../lib/state-machine', () => ({
  assertValidInvoiceTransition: vi.fn(),
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

// ---------------------------------------------------------------------------
// Imports — after vi.mock declarations
// ---------------------------------------------------------------------------

import * as paymentService from '../payment.service'
import * as paymentRepository from '../payment.repository'
import { assertValidInvoiceTransition } from '../lib/state-machine'
import { NotFoundError, ConflictError } from '@/shared/errors'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const INVOICE_ID = '00000000-0000-0000-0000-000000000010'
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000020'
const BOOKING_ID = '00000000-0000-0000-0000-000000000030'

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    tenantId: TENANT_ID,
    invoiceNumber: 'INV-2026-00001',
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    status: 'DRAFT',
    subtotal: '100.00',
    taxAmount: '20.00',
    discountAmount: '0',
    totalAmount: '120.00',
    amountPaid: '0',
    amountDue: '120.00',
    lineItems: [],
    dueDate: new Date('2026-07-01'),
    notes: null,
    version: 1,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000040',
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    invoiceId: INVOICE_ID,
    bookingId: BOOKING_ID,
    amount: '120.00',
    method: 'CARD',
    status: 'COMPLETED',
    type: 'PAYMENT',
    stripePaymentIntentId: null,
    gocardlessPaymentId: null,
    notes: null,
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------

describe('paymentService.createInvoice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls repository with correct tenantId and input', async () => {
    const input = {
      bookingId: BOOKING_ID,
      customerId: CUSTOMER_ID,
      subtotal: 100,
      taxAmount: 20,
      totalAmount: 120,
    }
    const created = makeInvoice()
    vi.mocked(paymentRepository.createInvoice).mockResolvedValue(created as never)

    const result = await paymentService.createInvoice(TENANT_ID, input)

    expect(paymentRepository.createInvoice).toHaveBeenCalledWith(TENANT_ID, input)
    expect(result).toBe(created)
  })
})

// ---------------------------------------------------------------------------
// createInvoiceForBooking
// ---------------------------------------------------------------------------

describe('paymentService.createInvoiceForBooking', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates a DRAFT invoice with zero amounts', async () => {
    const created = makeInvoice({ subtotal: '0', taxAmount: '0', totalAmount: '0' })
    vi.mocked(paymentRepository.createInvoice).mockResolvedValue(created as never)

    const result = await paymentService.createInvoiceForBooking(TENANT_ID, BOOKING_ID, CUSTOMER_ID)

    expect(paymentRepository.createInvoice).toHaveBeenCalledWith(TENANT_ID, {
      bookingId: BOOKING_ID,
      customerId: CUSTOMER_ID,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
    })
    expect(result).toEqual({ id: INVOICE_ID })
  })

  it('returns only the id field, not the full invoice record', async () => {
    const created = makeInvoice()
    vi.mocked(paymentRepository.createInvoice).mockResolvedValue(created as never)

    const result = await paymentService.createInvoiceForBooking(TENANT_ID, BOOKING_ID, CUSTOMER_ID)

    expect(Object.keys(result)).toEqual(['id'])
  })
})

// ---------------------------------------------------------------------------
// findInvoice
// ---------------------------------------------------------------------------

describe('paymentService.findInvoice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns the invoice when found', async () => {
    const invoice = makeInvoice()
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)

    const result = await paymentService.findInvoice(TENANT_ID, INVOICE_ID)

    expect(paymentRepository.findInvoiceById).toHaveBeenCalledWith(INVOICE_ID, TENANT_ID)
    expect(result).toBe(invoice)
  })

  it('throws NotFoundError when invoice does not exist', async () => {
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(null as never)

    await expect(
      paymentService.findInvoice(TENANT_ID, INVOICE_ID)
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// sendInvoice
// ---------------------------------------------------------------------------

describe('paymentService.sendInvoice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('validates state transition and updates status to SENT', async () => {
    const invoice = makeInvoice({ status: 'DRAFT', version: 1 })
    const updated = makeInvoice({ status: 'SENT', version: 2 })
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)
    vi.mocked(paymentRepository.updateInvoiceStatus).mockResolvedValue(updated as never)

    const result = await paymentService.sendInvoice(TENANT_ID, INVOICE_ID, 1)

    expect(assertValidInvoiceTransition).toHaveBeenCalledWith('DRAFT', 'SENT')
    expect(paymentRepository.updateInvoiceStatus).toHaveBeenCalledWith(
      INVOICE_ID, TENANT_ID, 1, 'SENT'
    )
    expect(result).toBe(updated)
  })

  it('throws NotFoundError when invoice does not exist', async () => {
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(null as never)

    await expect(
      paymentService.sendInvoice(TENANT_ID, INVOICE_ID, 1)
    ).rejects.toThrow(NotFoundError)

    expect(assertValidInvoiceTransition).not.toHaveBeenCalled()
  })

  it('throws ConflictError on concurrent modification (version mismatch)', async () => {
    const invoice = makeInvoice({ status: 'DRAFT', version: 1 })
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)
    vi.mocked(paymentRepository.updateInvoiceStatus).mockResolvedValue(null as never)

    await expect(
      paymentService.sendInvoice(TENANT_ID, INVOICE_ID, 1)
    ).rejects.toThrow(ConflictError)
  })
})

// ---------------------------------------------------------------------------
// voidInvoice
// ---------------------------------------------------------------------------

describe('paymentService.voidInvoice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('validates transition and voids the invoice', async () => {
    const invoice = makeInvoice({ status: 'SENT', version: 3 })
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)
    vi.mocked(paymentRepository.updateInvoiceStatus).mockResolvedValue(
      makeInvoice({ status: 'VOID', version: 4 }) as never
    )

    await paymentService.voidInvoice(TENANT_ID, INVOICE_ID)

    expect(assertValidInvoiceTransition).toHaveBeenCalledWith('SENT', 'VOID')
    expect(paymentRepository.updateInvoiceStatus).toHaveBeenCalledWith(
      INVOICE_ID, TENANT_ID, 3, 'VOID'
    )
  })

  it('is idempotent — returns silently when invoice not found', async () => {
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(null as never)

    await expect(
      paymentService.voidInvoice(TENANT_ID, INVOICE_ID)
    ).resolves.toBeUndefined()

    expect(assertValidInvoiceTransition).not.toHaveBeenCalled()
    expect(paymentRepository.updateInvoiceStatus).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// recordPayment
// ---------------------------------------------------------------------------

describe('paymentService.recordPayment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates status to PAID when full amount is paid', async () => {
    const invoice = makeInvoice({ status: 'SENT', totalAmount: '100.00', amountPaid: '0', version: 2 })
    const payment = makePayment({ amount: '100.00' })
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)
    vi.mocked(paymentRepository.createPayment).mockResolvedValue(payment as never)
    vi.mocked(paymentRepository.updateInvoiceStatus).mockResolvedValue(
      makeInvoice({ status: 'PAID' }) as never
    )

    const input = {
      invoiceId: INVOICE_ID,
      bookingId: BOOKING_ID,
      amount: 100,
      method: 'CARD' as const,
    }

    const result = await paymentService.recordPayment(TENANT_ID, input)

    expect(assertValidInvoiceTransition).toHaveBeenCalledWith('SENT', 'PAID')
    expect(paymentRepository.createPayment).toHaveBeenCalledWith(TENANT_ID, {
      ...input,
      customerId: CUSTOMER_ID,
    })
    expect(paymentRepository.updateInvoiceStatus).toHaveBeenCalledWith(
      INVOICE_ID, TENANT_ID, 2, 'PAID',
      expect.objectContaining({ amountPaid: '100', paidAt: expect.any(Date) })
    )
    expect(result).toBe(payment)
  })

  it('updates status to PARTIALLY_PAID when partial amount is paid', async () => {
    const invoice = makeInvoice({ status: 'SENT', totalAmount: '200.00', amountPaid: '0', version: 1 })
    const payment = makePayment({ amount: '50.00' })
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)
    vi.mocked(paymentRepository.createPayment).mockResolvedValue(payment as never)
    vi.mocked(paymentRepository.updateInvoiceStatus).mockResolvedValue(
      makeInvoice({ status: 'PARTIALLY_PAID' }) as never
    )

    const input = {
      invoiceId: INVOICE_ID,
      bookingId: BOOKING_ID,
      amount: 50,
      method: 'BANK_TRANSFER' as const,
    }

    const result = await paymentService.recordPayment(TENANT_ID, input)

    expect(assertValidInvoiceTransition).toHaveBeenCalledWith('SENT', 'PARTIALLY_PAID')
    expect(paymentRepository.updateInvoiceStatus).toHaveBeenCalledWith(
      INVOICE_ID, TENANT_ID, 1, 'PARTIALLY_PAID',
      { amountPaid: '50' }
    )
    expect(result).toBe(payment)
  })

  it('throws NotFoundError when invoice does not exist', async () => {
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(null as never)

    const input = {
      invoiceId: INVOICE_ID,
      bookingId: null,
      amount: 50,
      method: 'CASH' as const,
    }

    await expect(
      paymentService.recordPayment(TENANT_ID, input)
    ).rejects.toThrow(NotFoundError)

    expect(paymentRepository.createPayment).not.toHaveBeenCalled()
  })

  it('accumulates partial payments correctly', async () => {
    // Invoice already has 60 paid of 100 total — paying another 40 should result in PAID
    const invoice = makeInvoice({
      status: 'PARTIALLY_PAID',
      totalAmount: '100.00',
      amountPaid: '60',
      version: 3,
    })
    const payment = makePayment({ amount: '40.00' })
    vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(invoice as never)
    vi.mocked(paymentRepository.createPayment).mockResolvedValue(payment as never)
    vi.mocked(paymentRepository.updateInvoiceStatus).mockResolvedValue(
      makeInvoice({ status: 'PAID' }) as never
    )

    const input = {
      invoiceId: INVOICE_ID,
      bookingId: BOOKING_ID,
      amount: 40,
      method: 'CARD' as const,
    }

    await paymentService.recordPayment(TENANT_ID, input)

    expect(assertValidInvoiceTransition).toHaveBeenCalledWith('PARTIALLY_PAID', 'PAID')
    expect(paymentRepository.updateInvoiceStatus).toHaveBeenCalledWith(
      INVOICE_ID, TENANT_ID, 3, 'PAID',
      expect.objectContaining({ amountPaid: '100', paidAt: expect.any(Date) })
    )
  })
})

// ---------------------------------------------------------------------------
// listInvoices
// ---------------------------------------------------------------------------

describe('paymentService.listInvoices', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('passes filters to repository and returns result', async () => {
    const filters = { status: 'SENT', customerId: CUSTOMER_ID, limit: 20, cursor: undefined }
    const repoResult = { rows: [makeInvoice()], hasMore: false }
    vi.mocked(paymentRepository.listInvoices).mockResolvedValue(repoResult as never)

    const result = await paymentService.listInvoices(TENANT_ID, filters)

    expect(paymentRepository.listInvoices).toHaveBeenCalledWith(TENANT_ID, filters)
    expect(result).toBe(repoResult)
  })

  it('returns empty list when no invoices match', async () => {
    const filters = { limit: 10 }
    const repoResult = { rows: [], hasMore: false }
    vi.mocked(paymentRepository.listInvoices).mockResolvedValue(repoResult as never)

    const result = await paymentService.listInvoices(TENANT_ID, filters)

    expect(result.rows).toHaveLength(0)
    expect(result.hasMore).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// listPricingRules
// ---------------------------------------------------------------------------

describe('paymentService.listPricingRules', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('delegates to repository', async () => {
    const rules = [{ id: 'rule-1', tenantId: TENANT_ID, name: 'Weekend surcharge' }]
    vi.mocked(paymentRepository.listPricingRules).mockResolvedValue(rules as never)

    const result = await paymentService.listPricingRules(TENANT_ID)

    expect(paymentRepository.listPricingRules).toHaveBeenCalledWith(TENANT_ID)
    expect(result).toBe(rules)
  })
})
