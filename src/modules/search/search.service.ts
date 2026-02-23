import { logger } from '@/shared/logger'
import { searchProviderRegistry } from '@/shared/module-system/search-registry'
import { tenantService } from '@/modules/tenant/tenant.service'
import type { GlobalSearchResult } from './search.types'

const log = logger.child({ module: 'search.service' })

export const searchService = {
  async globalSearch(
    tenantId: string,
    query: string,
    types: string[] | undefined,
    limit: number
  ): Promise<GlobalSearchResult> {
    log.info({ query, tenantId }, 'global search')

    // 1. Get all registered providers
    let providers = searchProviderRegistry.getProviders()

    // 2. Filter by user-requested types (if specified)
    if (types?.length) {
      providers = providers.filter((p) => types.includes(p.resultType))
    }

    // 3. Filter by tenant-level module enablement
    if (providers.length > 0) {
      const checks = await Promise.all(
        providers.map(async (p) => ({
          provider: p,
          enabled: await tenantService.isModuleEnabled(tenantId, p.moduleSlug),
        }))
      )
      providers = checks.filter((c) => c.enabled).map((c) => c.provider)
    }

    // 4. Fan out searches in parallel, build grouped response
    const perTypeLimit = Math.ceil(limit / Math.max(providers.length, 1))
    const groups = await Promise.all(
      providers.map(async (p) => {
        const { hits, hasMore } = await p.search(tenantId, query, perTypeLimit)
        return {
          type: p.resultType,
          label: p.label,
          results: hits.map((h) => p.mapResult(h)),
          hasMore,
        }
      })
    )

    const totalFound = groups.reduce((sum, g) => sum + g.results.length, 0)
    return { groups, query, totalFound }
  },
}
