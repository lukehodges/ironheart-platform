import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure } from '@/shared/trpc'
import * as developerService from './developer.service'
import {
  createWebhookEndpointSchema,
} from './developer.schemas'

export const developerRouter = router({
  listWebhookEndpoints: tenantProcedure
    .query(async ({ ctx }) => {
      return developerService.listWebhookEndpoints(ctx.tenantId)
    }),

  createWebhookEndpoint: permissionProcedure('developer:write')
    .input(createWebhookEndpointSchema)
    .mutation(async ({ ctx, input }) => {
      return developerService.createWebhookEndpoint(ctx.tenantId, input)
    }),

  deleteWebhookEndpoint: permissionProcedure('developer:write')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await developerService.deleteWebhookEndpoint(ctx.tenantId, input.id)
      return { success: true }
    }),
})
