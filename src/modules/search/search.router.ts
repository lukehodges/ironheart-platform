import { z } from 'zod'
import { router, tenantProcedure } from '@/shared/trpc'
import * as searchRepository from './search.repository'

export const searchRouter = router({
  globalSearch: tenantProcedure
    .input(z.object({
      query: z.string().min(2).max(100),
      types: z.array(z.enum(['customers', 'bookings'])).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const includeCustomers = !input.types || input.types.includes('customers')
      const includeBookings  = !input.types || input.types.includes('bookings')
      const perTypeLimit     = Math.ceil(input.limit / 2)

      const [customerResults, bookingResults] = await Promise.all([
        includeCustomers
          ? searchRepository.fullTextSearchCustomers(ctx.tenantId, input.query, perTypeLimit)
          : Promise.resolve([]),
        includeBookings
          ? searchRepository.fullTextSearchBookings(ctx.tenantId, input.query, perTypeLimit)
          : Promise.resolve([]),
      ])

      const results = [
        ...customerResults.map((c) => ({
          type:      'customer' as const,
          id:        c.id,
          label:     `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
          secondary: c.email ?? null,
        })),
        ...bookingResults.map((b) => ({
          type:      'booking' as const,
          id:        b.id,
          label:     b.bookingNumber ?? b.id,
          secondary: b.scheduledDate ? String(b.scheduledDate) : null,
        })),
      ].slice(0, input.limit)

      return { results, query: input.query, totalFound: results.length }
    }),
})
