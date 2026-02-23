import { z } from 'zod'
import { router, tenantProcedure } from '@/shared/trpc'
import { searchService } from './search.service'

export const searchRouter = router({
  globalSearch: tenantProcedure
    .input(z.object({
      query: z.string().min(2).max(100),
      types: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(({ ctx, input }) =>
      searchService.globalSearch(ctx.tenantId, input.query, input.types, input.limit)
    ),
})
