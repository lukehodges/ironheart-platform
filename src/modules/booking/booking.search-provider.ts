import type { SearchProvider } from '@/shared/module-system/search-registry'
import { fullTextSearchBookings } from '@/modules/search/search.repository'

export const bookingSearchProvider: SearchProvider = {
  moduleSlug: 'booking',
  resultType: 'booking',
  label: 'Bookings',

  async search(tenantId, query, limit) {
    const rows = await fullTextSearchBookings(tenantId, query, limit + 1)
    return {
      hits: rows.slice(0, limit),
      hasMore: rows.length > limit,
    }
  },

  mapResult(hit) {
    return {
      type: 'booking',
      id: hit.id,
      label: (hit.bookingNumber as string) ?? hit.id,
      secondary: hit.scheduledDate ? String(hit.scheduledDate) : null,
    }
  },
}
