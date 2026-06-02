// src/modules/integrations/integrations.router.ts
import { z } from 'zod'
import { tenantProcedure, router } from '@/shared/trpc'
import { integrationsService } from './integrations.service'
import { initiateOAuthSchema, completeOAuthSchema, disconnectSchema } from './integrations.schemas'
import { enrichCompany, batchEnrichCompanies } from './providers/companies-house.service'

export const integrationsRouter = router({
  /**
   * Start OAuth flow for a provider. Returns the URL to redirect the user to.
   */
  initiateOAuth: tenantProcedure
    .input(initiateOAuthSchema)
    .mutation(async ({ input, ctx }) => {
      const url = await integrationsService.initiateOAuth(
        ctx.user.id,
        ctx.tenantId,
        input.providerSlug,
        input.redirectUri
      )
      return { url }
    }),

  /**
   * Complete OAuth — exchange code and store credentials.
   * Called from the OAuth callback page.
   */
  completeOAuth: tenantProcedure
    .input(completeOAuthSchema)
    .mutation(async ({ input, ctx }) => {
      await integrationsService.completeOAuth(
        input.code,
        ctx.user.id,
        ctx.tenantId,
        input.providerSlug,
        input.redirectUri
      )
      return { success: true }
    }),

  /**
   * Disconnect a provider — revokes tokens and stops webhooks.
   */
  disconnect: tenantProcedure
    .input(disconnectSchema)
    .mutation(async ({ input, ctx }) => {
      await integrationsService.disconnect(ctx.user.id, ctx.tenantId, input.providerSlug)
      return { success: true }
    }),

  /**
   * List which integrations are currently connected for the current user.
   */
  listConnected: tenantProcedure
    .query(async ({ ctx }) => {
      return integrationsService.listConnected(ctx.user.id, ctx.tenantId)
    }),

  /**
   * Enrich a single company from Companies House on demand.
   */
  enrichCompanyFromCompaniesHouse: tenantProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await enrichCompany(ctx.tenantId, input.companyId)
      return { success: true }
    }),

  /**
   * Cron-able batch enrichment — pulls up to `limit` unenriched companies.
   */
  batchEnrichCompaniesFromCompaniesHouse: tenantProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .mutation(async ({ input, ctx }) => {
      return batchEnrichCompanies(ctx.tenantId, input.limit)
    }),
})
