import type { CustomerRecord } from './customer.types'

/**
 * Public API for the customer module.
 * Other modules that declare dependencies: ['customer'] may import ONLY this file.
 * Keep the surface area minimal.
 */
export interface CustomerContract {
  findById(tenantId: string, customerId: string): Promise<CustomerRecord | null>
}

// Wire to real implementation via repository (service needs full Context)
import { customerRepository } from './customer.repository'

export const customerContract: CustomerContract = {
  findById: (tenantId, id) => customerRepository.findById(tenantId, id),
}
