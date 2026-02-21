import { describe, it, expect } from 'vitest'
import type { CustomerContract } from '@/modules/customer/customer.contract'

describe('Module contracts', () => {
  it('CustomerContract interface has expected shape', () => {
    // Type-level test: ensures the interface compiles
    const mock: CustomerContract = {
      findById: async () => null,
    }
    expect(mock.findById).toBeDefined()
  })
})
