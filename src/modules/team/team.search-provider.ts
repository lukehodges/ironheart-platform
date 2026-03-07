import type { SearchProvider } from '@/shared/module-system/search-registry'
import { fullTextSearchStaff } from '@/modules/search/search.repository'

export const teamSearchProvider: SearchProvider = {
  moduleSlug: 'team',
  resultType: 'staff',
  label: 'Staff',

  async search(tenantId, query, limit) {
    const rows = await fullTextSearchStaff(tenantId, query, limit + 1)
    return {
      hits: rows.slice(0, limit),
      hasMore: rows.length > limit,
    }
  },

  mapResult(hit) {
    return {
      type: 'staff',
      id: hit.id,
      label: `${(hit.firstName as string) ?? ''} ${(hit.lastName as string) ?? ''}`.trim(),
      secondary: (hit.jobTitle as string) ?? (hit.email as string) ?? null,
    }
  },
}
