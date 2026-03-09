import { logger } from '@/shared/logger'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { assertValidInvoiceTransition } from './lib/state-machine'
import * as paymentRepository from './payment.repository'
import type { CreateInvoiceInput, RecordPaymentInput, InvoiceStatus } from './payment.types'

const log = logger.child({ module: 'payment.service' })

// ---------------------------------------------------------------------------
// Invoice operations
// ---------------------------------------------------------------------------

export async function createInvoice(tenantId: string, input: CreateInvoiceInput) {
  const invoice = await paymentRepository.createInvoice(tenantId, input)
  log.info({ tenantId, invoiceId: invoice.id }, 'Invoice created')
  return invoice
}

/**
 * Called by the booking saga - creates a DRAFT invoice for a booking.
 * The booking saga is responsible for supplying the correct customerId.
 */
export async function createInvoiceForBooking(
  tenantId: string,
  bookingId: string,
  customerId: string
): Promise<{ id: string }> {
  const invoice = await paymentRepository.createInvoice(tenantId, {
    bookingId,
    customerId,
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  })
  return { id: invoice.id }
}

export async function findInvoice(tenantId: string, invoiceId: string) {
  const invoice = await paymentRepository.findInvoiceById(invoiceId, tenantId)
  if (!invoice) throw new NotFoundError('Invoice', invoiceId)
  return invoice
}

export async function sendInvoice(tenantId: string, invoiceId: string, version: number) {
  const invoice = await paymentRepository.findInvoiceById(invoiceId, tenantId)
  if (!invoice) throw new NotFoundError('Invoice', invoiceId)

  assertValidInvoiceTransition(invoice.status as InvoiceStatus, 'SENT')

  const updated = await paymentRepository.updateInvoiceStatus(
    invoiceId,
    tenantId,
    version,
    'SENT'
  )
  if (!updated) throw new ConflictError('Concurrent modification - refresh and retry')

  log.info({ tenantId, invoiceId }, 'Invoice sent')
  return updated
}

export async function voidInvoice(tenantId: string, invoiceId: string): Promise<void> {
  const invoice = await paymentRepository.findInvoiceById(invoiceId, tenantId)
  if (!invoice) return // already gone - idempotent

  assertValidInvoiceTransition(invoice.status as InvoiceStatus, 'VOID')
  await paymentRepository.updateInvoiceStatus(invoice.id, tenantId, invoice.version, 'VOID')
  log.info({ tenantId, invoiceId }, 'Invoice voided')
}

// ---------------------------------------------------------------------------
// Payment operations
// ---------------------------------------------------------------------------

export async function recordPayment(tenantId: string, input: RecordPaymentInput) {
  const invoice = await paymentRepository.findInvoiceById(input.invoiceId, tenantId)
  if (!invoice) throw new NotFoundError('Invoice', input.invoiceId)

  const amountPaid = parseFloat(invoice.amountPaid as unknown as string) + input.amount
  const total      = parseFloat(invoice.totalAmount as unknown as string)
  const newStatus: InvoiceStatus = amountPaid >= total ? 'PAID' : 'PARTIALLY_PAID'

  assertValidInvoiceTransition(invoice.status as InvoiceStatus, newStatus)

  const payment = await paymentRepository.createPayment(tenantId, {
    ...input,
    customerId: invoice.customerId,
  })

  await paymentRepository.updateInvoiceStatus(
    input.invoiceId,
    tenantId,
    invoice.version,
    newStatus,
    newStatus === 'PAID'
      ? { amountPaid: String(amountPaid), paidAt: new Date() }
      : { amountPaid: String(amountPaid) }
  )

  log.info({ tenantId, invoiceId: input.invoiceId, amount: input.amount, newStatus }, 'Payment recorded')
  return payment
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function listInvoices(
  tenantId: string,
  filters: { status?: string; customerId?: string; limit: number; cursor?: string }
) {
  return paymentRepository.listInvoices(tenantId, filters)
}

export async function listPricingRules(tenantId: string) {
  return paymentRepository.listPricingRules(tenantId)
}
