export interface SearchResult {
  type: string
  id: string
  label: string
  secondary: string | null
}

export interface RawSearchHit {
  id: string
  [key: string]: unknown
}

export interface SearchHitResult {
  hits: RawSearchHit[]
  hasMore: boolean
}

export interface SearchProvider {
  /** Module slug - used for tenant-level gating via isModuleEnabled */
  moduleSlug: string
  /** Result type identifier - used in the types filter param */
  resultType: string
  /** Display name for the result group (e.g. "Customers") */
  label: string
  /** Execute full-text search, returning hits + hasMore flag */
  search(tenantId: string, query: string, limit: number): Promise<SearchHitResult>
  /** Map a raw DB hit to a display-ready SearchResult */
  mapResult(hit: RawSearchHit): SearchResult
}

export interface SearchResultGroup {
  type: string
  label: string
  results: SearchResult[]
  hasMore: boolean
}

export interface GlobalSearchResult {
  groups: SearchResultGroup[]
  query: string
  totalFound: number
}

export class SearchProviderRegistry {
  private providers = new Map<string, SearchProvider>()

  register(provider: SearchProvider): void {
    if (this.providers.has(provider.moduleSlug)) {
      throw new Error(
        `Search provider for module '${provider.moduleSlug}' is already registered`
      )
    }
    this.providers.set(provider.moduleSlug, provider)
  }

  getProviders(): SearchProvider[] {
    return Array.from(this.providers.values())
  }

  getProvider(moduleSlug: string): SearchProvider | null {
    return this.providers.get(moduleSlug) ?? null
  }
}

export const searchProviderRegistry = new SearchProviderRegistry()
