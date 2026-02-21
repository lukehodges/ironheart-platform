import { z } from 'zod'
import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from '@/shared/trpc'

const moduleGate = createModuleMiddleware('developer')
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)
import * as developerService from './developer.service'
import {
  createWebhookEndpointSchema,
} from './developer.schemas'

export const developerRouter = router({
  listWebhookEndpoints: moduleProcedure
    .query(async ({ ctx }) => {
      return developerService.listWebhookEndpoints(ctx.tenantId)
    }),

  createWebhookEndpoint: modulePermission('developer:write')
    .input(createWebhookEndpointSchema)
    .mutation(async ({ ctx, input }) => {
      return developerService.createWebhookEndpoint(ctx.tenantId, input)
    }),

  deleteWebhookEndpoint: modulePermission('developer:write')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await developerService.deleteWebhookEndpoint(ctx.tenantId, input.id)
      return { success: true }
    }),
})
