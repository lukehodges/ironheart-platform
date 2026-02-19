import { BadRequestError } from '@/shared/errors'
import type { InvoiceStatus } from '../payment.types'

/**
 * Formally specified invoice state machine.
 * Terminal states: VOID, REFUNDED -- accept no outgoing transitions.
 */
const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT:          ['SENT'],
  SENT:           ['VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID'],
  VIEWED:         ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE'],
  OVERDUE:        ['PAID', 'PARTIALLY_PAID', 'VOID'],
  PAID:           ['REFUNDED'],
  VOID:           [],
  REFUNDED:       [],
}

export function assertValidInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  const allowed = VALID_INVOICE_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid invoice transition: ${from} -> ${to}. ` +
        `Valid from ${from}: ${allowed.join(', ') || 'none (terminal state)'}`
    )
  }
}

export function isTerminalInvoiceStatus(status: InvoiceStatus): boolean {
  return VALID_INVOICE_TRANSITIONS[status].length === 0
}

export function getValidInvoiceTransitions(status: InvoiceStatus): InvoiceStatus[] {
  return VALID_INVOICE_TRANSITIONS[status]
}
