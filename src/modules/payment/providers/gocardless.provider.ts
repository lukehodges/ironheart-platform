import { logger } from '@/shared/logger'
import { BadRequestError } from '@/shared/errors'

const log = logger.child({ module: 'payment.gocardless' })

// Stub -- full GoCardless implementation requires @gocardless/node-client
// This provides the interface; implementation wired when credentials are available

export interface GCMandate {
  id: string
  status: string
  customerId: string
  bankAccount: string
}

export interface GCPayment {
  id: string
  amount: number
  status: string
  mandateId: string
}

export async function createMandate(
  _customerId: string,
  _bankAccount: { accountNumber: string; sortCode: string; accountHolderName: string }
): Promise<GCMandate> {
  log.warn({}, 'GoCardless mandate creation: not yet configured')
  throw new BadRequestError('GoCardless not configured -- contact support to enable direct debit')
}

export async function createPayment(
  _mandateId: string,
  _amount: number,
  _reference: string
): Promise<GCPayment> {
  log.warn({}, 'GoCardless payment creation: not yet configured')
  throw new BadRequestError('GoCardless not configured -- contact support to enable direct debit')
}
