// src/modules/integrations/integration-connections.router.ts
/**
 * Admin-only CRUD for the `integration_connections` table.
 *
 * Listing/reading uses tenantProcedure (current tenant scope). Mutations use
 * platformAdminProcedure because connections hold secrets and govern
 * cross-tenant pull schedules.
 */
import { z } from "zod"
import {
  router,
  tenantProcedure,
  platformAdminProcedure,
} from "@/shared/trpc"
import { integrationConnectionsService } from "./integration-connections.service"

const createConnectionInput = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  providerSlug: z.string().min(1),
  name: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
  secretsRef: z.string().optional(),
})

const tenantConnectionIdInput = z.object({
  connectionId: z.string().uuid(),
})

export const integrationConnectionsRouter = router({
  create: platformAdminProcedure
    .input(createConnectionInput)
    .mutation(async ({ input }) => {
      return integrationConnectionsService.createConnection(input)
    }),

  list: tenantProcedure
    .input(z.object({ providerSlug: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return integrationConnectionsService.listConnections(
        ctx.tenantId,
        input?.providerSlug,
      )
    }),

  get: tenantProcedure
    .input(tenantConnectionIdInput)
    .query(async ({ input, ctx }) => {
      return integrationConnectionsService.getConnection(
        input.connectionId,
        ctx.tenantId,
      )
    }),

  enable: platformAdminProcedure
    .input(tenantConnectionIdInput.extend({ tenantId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await integrationConnectionsService.enable(
        input.connectionId,
        input.tenantId,
      )
      return { success: true }
    }),

  disable: platformAdminProcedure
    .input(tenantConnectionIdInput.extend({ tenantId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await integrationConnectionsService.disable(
        input.connectionId,
        input.tenantId,
      )
      return { success: true }
    }),

  runPull: platformAdminProcedure
    .input(tenantConnectionIdInput)
    .mutation(async ({ input }) => {
      return integrationConnectionsService.runPull(input.connectionId)
    }),
})
