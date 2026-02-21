import { TRPCError } from '@trpc/server'
import { tenantService } from '@/modules/tenant/tenant.service'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'module-gate' })

export function createModuleGate(moduleSlug: string) {
  return {
    /** Direct check — for use outside tRPC middleware (e.g., Next.js pages) */
    async check(tenantId: string): Promise<boolean> {
      const enabled = await tenantService.isModuleEnabled(tenantId, moduleSlug)
      if (!enabled) {
        log.debug({ moduleSlug, tenantId }, 'Module access denied — not enabled')
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Module '${moduleSlug}' is not enabled for this tenant`,
        })
      }
      return true
    },
  }
}
