import { router, tenantProcedure, createModuleMiddleware } from '@/shared/trpc'

const moduleGate = createModuleMiddleware('calendar-sync')
const moduleProcedure = tenantProcedure.use(moduleGate)
import { calendarSyncService } from './calendar-sync.service'
import { calendarSyncRepository } from './calendar-sync.repository'
import {
  initiateOAuthSchema,
  disconnectIntegrationSchema,
  getIntegrationSchema,
} from './calendar-sync.schemas'

export const calendarSyncRouter = router({
  /**
   * Initiate the OAuth flow — returns the authorization URL.
   */
  initiateOAuth: moduleProcedure
    .input(initiateOAuthSchema)
    .mutation(async ({ input, ctx }) => {
      const redirectUrl = `${process.env.APP_URL ?? ''}/api/oauth/calendar/callback`
      const authUrl = await calendarSyncService.initiateOAuth(
        ctx.user.id,
        input.tenantId,
        input.provider,
        redirectUrl
      )
      return { authUrl }
    }),

  /**
   * Get the current user's calendar integration status.
   */
  getIntegration: moduleProcedure
    .input(getIntegrationSchema)
    .query(async ({ input, ctx }) => {
      const integration = await calendarSyncRepository.findUserIntegration(
        ctx.user.id,
        input.tenantId,
        input.provider
      )
      if (!integration) return null
      return {
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        calendarId: integration.calendarId,
        lastSyncedAt: integration.lastSyncedAt,
        watchChannelExpiration: integration.watchChannelExpiration,
      }
    }),

  /**
   * Disconnect a calendar integration.
   */
  disconnect: moduleProcedure
    .input(disconnectIntegrationSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await calendarSyncService.disconnect(
        ctx.user.id,
        input.tenantId,
        input.provider
      )
      return result
    }),
})
