// src/modules/integrations/integrations.router.ts
import { tenantProcedure, router } from '@/shared/trpc'
import { integrationsService } from './integrations.service'
import { initiateOAuthSchema, completeOAuthSchema, disconnectSchema } from './integrations.schemas'

export const integrationsRouter = router({
  /**
   * Start OAuth flow for a provider. Returns the URL to redirect the user to.
   */
  initiateOAuth: tenantProcedure
    .input(initiateOAuthSchema)
    .mutation(async ({ input, ctx }) => {
      const url = await integrationsService.initiateOAuth(
        ctx.userId,
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
        ctx.userId,
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
      await integrationsService.disconnect(ctx.userId, ctx.tenantId, input.providerSlug)
      return { success: true }
    }),

  /**
   * List which integrations are currently connected for the current user.
   */
  listConnected: tenantProcedure
    .query(async ({ ctx }) => {
      return integrationsService.listConnected(ctx.userId, ctx.tenantId)
    }),
})
