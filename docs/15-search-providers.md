# Search Providers

The global search system is **module-aware and dynamic**. Each module that wants its data to be searchable registers a **search provider**. The search service discovers providers at runtime, filters by what's enabled, and fans out queries in parallel.

## How it works

```
User types "john" in global search bar
        │
        ▼
  Search Service
        │
        ├── 1. Get all registered providers from SearchProviderRegistry
        ├── 2. Filter by user-requested types (if any)
        ├── 3. Filter by tenant module enablement (isModuleEnabled)
        ├── 4. Fan out search() calls in parallel
        └── 5. Return grouped results
```

**Two levels of gating:**

| Level | Where | Effect |
|-------|-------|--------|
| Server-level | `register-all.ts` | If a module isn't registered on this server instance, its search provider doesn't exist |
| Tenant-level | `tenantService.isModuleEnabled()` | If a module is registered but disabled for a tenant, results are excluded at query time |

## SearchProvider interface

```typescript
// src/shared/module-system/search-registry.ts

interface RawSearchHit {
  id: string
  [key: string]: unknown
}

interface SearchHitResult {
  hits: RawSearchHit[]
  hasMore: boolean
}

interface SearchProvider {
  /** Module slug — used for tenant-level gating */
  moduleSlug: string
  /** Result type identifier — used in the `types` filter */
  resultType: string
  /** Display name for the result group (e.g. "Customers") */
  label: string
  /** Execute the search query, returning hits + hasMore flag */
  search(tenantId: string, query: string, limit: number): Promise<SearchHitResult>
  /** Map a raw DB hit to a display-ready SearchResult */
  mapResult(hit: RawSearchHit): SearchResult
}
```

## Response shape

Results are grouped by type so the frontend can render sections:

```typescript
interface GlobalSearchResult {
  groups: SearchResultGroup[]
  query: string
  totalFound: number
}

interface SearchResultGroup {
  type: string            // e.g. 'customer'
  label: string           // e.g. 'Customers'
  results: SearchResult[] // top N hits for this type
  hasMore: boolean        // true = more results exist beyond the limit
}

interface SearchResult {
  type: string
  id: string
  label: string
  secondary: string | null
}
```

The `hasMore` flag uses the **fetch limit + 1** pattern (no extra COUNT query). When `hasMore` is true, the frontend shows a "Show all" link that re-queries with `types: ['customer']`.

## Adding search to a module

### Step 1: Create a search provider file

```typescript
// src/modules/loyalty/loyalty.search-provider.ts
import type { SearchProvider } from '@/shared/module-system/search-registry'
import { loyaltyRepository } from './loyalty.repository'

export const loyaltySearchProvider: SearchProvider = {
  moduleSlug: 'loyalty',
  resultType: 'loyalty_program',
  label: 'Loyalty Programs',

  async search(tenantId, query, limit) {
    const rows = await loyaltyRepository.fullTextSearch(tenantId, query, limit + 1)
    return {
      hits: rows.slice(0, limit),
      hasMore: rows.length > limit,
    }
  },

  mapResult(hit) {
    return {
      type: 'loyalty_program',
      id: hit.id,
      label: hit.name as string,
      secondary: hit.isActive ? 'Active' : 'Inactive',
    }
  },
}
```

**Rules:**
- The provider file lives in the module that owns the data, not in `src/modules/search/`
- `moduleSlug` must match the module's manifest slug exactly
- `search()` must use `limit + 1` and return `{ hits, hasMore }`
- `mapResult()` must return a `SearchResult` with `type`, `id`, `label`, and `secondary`

### Step 2: Add a full-text search function to your repository

```typescript
// In your module's repository file
export async function fullTextSearch(tenantId: string, query: string, limit: number) {
  // Option A: FTS with search_vector column (preferred)
  return db
    .select({ id: myTable.id, name: myTable.name })
    .from(myTable)
    .where(
      and(
        eq(myTable.tenantId, tenantId),
        sql`${myTable}.search_vector @@ plainto_tsquery('english', ${query})`
      )
    )
    .orderBy(sql`ts_rank(${myTable}.search_vector, plainto_tsquery('english', ${query})) DESC`)
    .limit(limit)

  // Option B: ILIKE fallback (if no search_vector column)
  return db
    .select({ id: myTable.id, name: myTable.name })
    .from(myTable)
    .where(
      and(
        eq(myTable.tenantId, tenantId),
        sql`${myTable.name} ILIKE ${'%' + query + '%'}`
      )
    )
    .limit(limit)
}
```

### Step 3: Register the provider

In `src/shared/module-system/register-all.ts`, import and register your provider alongside the module manifest:

```typescript
import { loyaltySearchProvider } from '@/modules/loyalty/loyalty.search-provider'

// After moduleRegistry.register(loyaltyManifest):
searchProviderRegistry.register(loyaltySearchProvider)
```

### Step 4: Export from barrel

```typescript
// src/modules/loyalty/index.ts
export { loyaltySearchProvider } from './loyalty.search-provider'
```

That's it. No changes to the search module, router, or service are needed.

## Existing providers

| Module | Result type | What's searched |
|--------|-------------|-----------------|
| `customer` | `customer` | Customer name, email (FTS with ILIKE fallback) |
| `booking` | `booking` | Booking number (FTS with ILIKE fallback) |

## How the search service works internally

The search service is a pure orchestrator. It does not import any domain module.

```typescript
// Simplified flow in search.service.ts
async globalSearch(tenantId, query, types, limit) {
  // 1. Get all registered providers
  let providers = searchProviderRegistry.getProviders()

  // 2. Filter by user-requested types
  if (types?.length) {
    providers = providers.filter(p => types.includes(p.resultType))
  }

  // 3. Filter by tenant module enablement (parallel checks)
  const checks = await Promise.all(
    providers.map(async p => ({
      provider: p,
      enabled: await tenantService.isModuleEnabled(tenantId, p.moduleSlug),
    }))
  )
  providers = checks.filter(c => c.enabled).map(c => c.provider)

  // 4. Fan out searches in parallel, build grouped response
  const perTypeLimit = Math.ceil(limit / Math.max(providers.length, 1))
  const groups = await Promise.all(
    providers.map(async p => {
      const { hits, hasMore } = await p.search(tenantId, query, perTypeLimit)
      return {
        type: p.resultType,
        label: p.label,
        results: hits.map(h => p.mapResult(h)),
        hasMore,
      }
    })
  )

  // 5. Return grouped results
  const totalFound = groups.reduce((sum, g) => sum + g.results.length, 0)
  return { groups, query, totalFound }
}
```

## Frontend usage

The `types` input parameter lets the frontend filter to a single module:

```typescript
// Global search (all enabled modules)
trpc.search.globalSearch.useQuery({ query: 'john', limit: 20 })

// Filtered to one type (e.g. "Show all customers" link)
trpc.search.globalSearch.useQuery({ query: 'john', types: ['customer'], limit: 50 })
```

The `types` field accepts any string — it's validated against registered providers at runtime, not a hardcoded enum. Unknown types are silently ignored (no provider matches, no results for that type).
