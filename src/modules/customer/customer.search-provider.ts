import type { SearchProvider } from '@/shared/module-system/search-registry'
import { fullTextSearchCustomers } from '@/modules/search/search.repository'

export const customerSearchProvider: SearchProvider = {
  moduleSlug: 'customer',
  resultType: 'customer',
  label: 'Customers',

  async search(tenantId, query, limit) {
    const rows = await fullTextSearchCustomers(tenantId, query, limit + 1)
    return {
      hits: rows.slice(0, limit),
      hasMore: rows.length > limit,
    }
  },

  mapResult(hit) {
    return {
      type: 'customer',
      id: hit.id,
      label: `${(hit.firstName as string) ?? ''} ${(hit.lastName as string) ?? ''}`.trim(),
      secondary: (hit.email as string) ?? null,
    }
  },
}
