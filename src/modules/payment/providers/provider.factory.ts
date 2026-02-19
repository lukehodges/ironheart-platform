import type { PaymentMethod } from '../payment.types'
import { BadRequestError } from '@/shared/errors'

export function getPaymentProviderName(method: PaymentMethod): string {
  switch (method) {
    case 'CARD':          return 'stripe'
    case 'DIRECT_DEBIT':  return 'gocardless'
    case 'BANK_TRANSFER': return 'manual'
    case 'CASH':          return 'cash'
    default:
      throw new BadRequestError(`Unknown payment method: ${method as string}`)
  }
}
