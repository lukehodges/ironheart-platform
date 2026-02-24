import { logger } from '@/shared/logger'
import { searchProviderRegistry } from '@/shared/module-system/search-registry'
import { moduleRegistry } from '@/shared/module-system/register-all'
import { tenantService } from '@/modules/tenant/tenant.service'
import type { GlobalSearchResult, SearchResultGroup } from './search.types'

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

    // 3. Filter by server-level manifest registration
    providers = providers.filter((p) => moduleRegistry.getManifest(p.moduleSlug) !== null)

    // 4. Filter by tenant-level module enablement
    if (providers.length > 0) {
      const checks = await Promise.all(
        providers.map(async (p) => ({
          provider: p,
          enabled: await tenantService.isModuleEnabled(tenantId, p.moduleSlug),
        }))
      )
      providers = checks.filter((c) => c.enabled).map((c) => c.provider)
    }

    // 5. Fan out searches in parallel (resilient to individual provider failures)
    const perTypeLimit = Math.ceil(limit / Math.max(providers.length, 1))
    const settled = await Promise.allSettled(
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

    const groups = settled
      .filter((r): r is PromiseFulfilledResult<SearchResultGroup> => r.status === 'fulfilled')
      .map((r) => r.value)

    for (const r of settled) {
      if (r.status === 'rejected') {
        log.error({ err: r.reason }, 'search provider failed')
      }
    }

    const totalFound = groups.reduce((sum, g) => sum + g.results.length, 0)
    return { groups, query, totalFound }
  },
}
