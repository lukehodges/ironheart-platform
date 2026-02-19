import type { RecordPaymentInput } from '../payment.types'

/** Cash payments: no external provider -- just record locally */
export async function recordCashPayment(_input: RecordPaymentInput): Promise<{ success: boolean }> {
  // Cash is always immediately "processed" -- no external call needed
  return { success: true }
}
