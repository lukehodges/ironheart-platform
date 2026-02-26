# Dynamic Search Provider System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the global search module-aware and extensible via a search provider registry so adding search to a new module requires zero changes to the search module.

**Architecture:** Each searchable module registers a `SearchProvider` object. The search service discovers providers at runtime, filters by server-level registration and tenant-level enablement, fans out queries in parallel, and returns grouped results. Two existing FTS functions (customers, bookings) are wrapped as providers.

**Tech Stack:** TypeScript, vitest, Drizzle ORM, tRPC, Zod v4, Pino

---

### Task 1: Create SearchProviderRegistry

**Files:**
- Create: `src/shared/module-system/search-registry.ts`

**Step 1: Write the failing test**

Create `src/shared/module-system/__tests__/search-registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  SearchProviderRegistry,
  type SearchProvider,
  type SearchResult,
} from '../search-registry'

const makeProvider = (slug: string, type: string): SearchProvider => ({
  moduleSlug: slug,
  resultType: type,
  label: type.charAt(0).toUpperCase() + type.slice(1) + 's',
  async search() {
    return { hits: [], hasMore: false }
  },
  mapResult(hit) {
    return { type, id: hit.id, label: String(hit.id), secondary: null }
  },
})

describe('SearchProviderRegistry', () => {
  it('registers and retrieves providers', () => {
    const registry = new SearchProviderRegistry()
    const provider = makeProvider('customer', 'customer')
    registry.register(provider)

    expect(registry.getProviders()).toHaveLength(1)
    expect(registry.getProvider('customer')).toBe(provider)
  })

  it('returns null for unregistered module', () => {
    const registry = new SearchProviderRegistry()
    expect(registry.getProvider('nope')).toBeNull()
  })

  it('throws on duplicate registration', () => {
    const registry = new SearchProviderRegistry()
    const provider = makeProvider('customer', 'customer')
    registry.register(provider)
    expect(() => registry.register(provider)).toThrow('already registered')
  })

  it('getProviders returns all registered providers', () => {
    const registry = new SearchProviderRegistry()
    registry.register(makeProvider('customer', 'customer'))
    registry.register(makeProvider('booking', 'booking'))
    expect(registry.getProviders()).toHaveLength(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/module-system/__tests__/search-registry.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/shared/module-system/search-registry.ts`:

```typescript
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
  /** Module slug — used for tenant-level gating via isModuleEnabled */
  moduleSlug: string
  /** Result type identifier — used in the types filter param */
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/module-system/__tests__/search-registry.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/shared/module-system/search-registry.ts src/shared/module-system/__tests__/search-registry.test.ts
git commit -m "feat: add SearchProviderRegistry with types and tests"
```

---

### Task 2: Export search registry from module-system barrel

**Files:**
- Modify: `src/shared/module-system/index.ts`

**Step 1: Add exports**

Add to the end of `src/shared/module-system/index.ts`:

```typescript
export {
  SearchProviderRegistry,
  searchProviderRegistry,
  type SearchProvider,
  type SearchResult,
  type RawSearchHit,
  type SearchHitResult,
  type SearchResultGroup,
  type GlobalSearchResult,
} from './search-registry'
```

**Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (or pre-existing ones only)

**Step 3: Commit**

```bash
git add src/shared/module-system/index.ts
git commit -m "feat: export search registry from module-system barrel"
```

---

### Task 3: Create customer search provider

**Files:**
- Create: `src/modules/customer/customer.search-provider.ts`
- Modify: `src/modules/customer/index.ts`

**Step 1: Write the search provider**

Create `src/modules/customer/customer.search-provider.ts`:

```typescript
import type { SearchProvider } from '@/shared/module-system/search-registry'
import { fullTextSearchCustomers } from '@/modules/search/search.repository'

export const customerSearchProvider: SearchProvider = {
  moduleSlug: 'customer',
  resultType: 'customer',
  label: 'Customers',

  async search(tenantId, query, limit) {
    const rows = await fullTextSearchCustomers(tenantId, query, limit + 1)
    return {
      hits: rows.slice(0, limit),
      hasMore: rows.length > limit,
    }
  },

  mapResult(hit) {
    return {
      type: 'customer',
      id: hit.id,
      label: `${(hit.firstName as string) ?? ''} ${(hit.lastName as string) ?? ''}`.trim(),
      secondary: (hit.email as string) ?? null,
    }
  },
}
```

**Step 2: Add to barrel export**

Add to `src/modules/customer/index.ts`:

```typescript
export { customerSearchProvider } from './customer.search-provider'
```

**Step 3: Commit**

```bash
git add src/modules/customer/customer.search-provider.ts src/modules/customer/index.ts
git commit -m "feat: add customer search provider"
```

---

### Task 4: Create booking search provider

**Files:**
- Create: `src/modules/booking/booking.search-provider.ts`
- Modify: `src/modules/booking/index.ts`

**Step 1: Write the search provider**

Create `src/modules/booking/booking.search-provider.ts`:

```typescript
import type { SearchProvider } from '@/shared/module-system/search-registry'
import { fullTextSearchBookings } from '@/modules/search/search.repository'

export const bookingSearchProvider: SearchProvider = {
  moduleSlug: 'booking',
  resultType: 'booking',
  label: 'Bookings',

  async search(tenantId, query, limit) {
    const rows = await fullTextSearchBookings(tenantId, query, limit + 1)
    return {
      hits: rows.slice(0, limit),
      hasMore: rows.length > limit,
    }
  },

  mapResult(hit) {
    return {
      type: 'booking',
      id: hit.id,
      label: (hit.bookingNumber as string) ?? hit.id,
      secondary: hit.scheduledDate ? String(hit.scheduledDate) : null,
    }
  },
}
```

**Step 2: Add to barrel export**

Add to `src/modules/booking/index.ts`:

```typescript
export { bookingSearchProvider } from './booking.search-provider'
```

**Step 3: Commit**

```bash
git add src/modules/booking/booking.search-provider.ts src/modules/booking/index.ts
git commit -m "feat: add booking search provider"
```

---

### Task 5: Register providers in register-all.ts

**Files:**
- Modify: `src/shared/module-system/register-all.ts`

**Step 1: Add imports and registrations**

Add import at top (below existing module imports):

```typescript
import { searchProviderRegistry } from './search-registry'
import { customerSearchProvider } from '@/modules/customer/customer.search-provider'
import { bookingSearchProvider } from '@/modules/booking/booking.search-provider'
```

Add registrations after `moduleRegistry.validate()`:

```typescript
// --- Search providers (only for modules registered on this server instance) ---
searchProviderRegistry.register(customerSearchProvider)
searchProviderRegistry.register(bookingSearchProvider)
```

> **Note:** When the customer/booking modules are re-enabled in the module manifest section above, their search providers should be moved next to those registrations. While they're commented out as manifests, the search providers stay active since the FTS repo functions are in the search module (no dependency on domain module code).

**Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/module-system/register-all.ts
git commit -m "feat: register customer and booking search providers"
```

---

### Task 6: Update search types

**Files:**
- Modify: `src/modules/search/search.types.ts`

**Step 1: Replace hardcoded types with re-exports**

Replace the entire contents of `src/modules/search/search.types.ts` with:

```typescript
// Re-export all search types from the canonical source
export type {
  SearchResult,
  SearchResultGroup,
  GlobalSearchResult,
} from '@/shared/module-system/search-registry'
```

**Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Errors in search.service.ts and search.router.ts (expected — we'll fix those next)

**Step 3: Commit**

```bash
git add src/modules/search/search.types.ts
git commit -m "refactor: search types re-export from search-registry"
```

---

### Task 7: Rewrite search service to use provider registry

**Files:**
- Modify: `src/modules/search/search.service.ts`

**Step 1: Write the failing test**

Create `src/modules/search/__tests__/search.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

const mockProviders = [
  {
    moduleSlug: 'customer',
    resultType: 'customer',
    label: 'Customers',
    search: vi.fn(),
    mapResult: vi.fn(),
  },
  {
    moduleSlug: 'booking',
    resultType: 'booking',
    label: 'Bookings',
    search: vi.fn(),
    mapResult: vi.fn(),
  },
]

vi.mock('@/shared/module-system/search-registry', () => ({
  searchProviderRegistry: {
    getProviders: vi.fn(() => [...mockProviders]),
  },
}))

vi.mock('@/modules/tenant/tenant.service', () => ({
  tenantService: {
    isModuleEnabled: vi.fn(),
  },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { searchService } from '../search.service'
import { tenantService } from '@/modules/tenant/tenant.service'

const TENANT = 'tenant-1'

describe('searchService.globalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: both modules enabled
    vi.mocked(tenantService.isModuleEnabled).mockResolvedValue(true)

    // Default search results
    mockProviders[0].search.mockResolvedValue({
      hits: [{ id: 'c1', firstName: 'John', lastName: 'Smith', email: 'j@x.com' }],
      hasMore: false,
    })
    mockProviders[0].mapResult.mockImplementation((hit: any) => ({
      type: 'customer',
      id: hit.id,
      label: `${hit.firstName} ${hit.lastName}`,
      secondary: hit.email,
    }))

    mockProviders[1].search.mockResolvedValue({
      hits: [{ id: 'b1', bookingNumber: 'BK-001', scheduledDate: '2026-03-01' }],
      hasMore: true,
    })
    mockProviders[1].mapResult.mockImplementation((hit: any) => ({
      type: 'booking',
      id: hit.id,
      label: hit.bookingNumber,
      secondary: hit.scheduledDate,
    }))
  })

  it('returns grouped results from all enabled providers', async () => {
    const result = await searchService.globalSearch(TENANT, 'john', undefined, 20)

    expect(result.groups).toHaveLength(2)
    expect(result.groups[0].type).toBe('customer')
    expect(result.groups[0].label).toBe('Customers')
    expect(result.groups[0].results).toHaveLength(1)
    expect(result.groups[0].hasMore).toBe(false)
    expect(result.groups[1].type).toBe('booking')
    expect(result.groups[1].hasMore).toBe(true)
    expect(result.totalFound).toBe(2)
    expect(result.query).toBe('john')
  })

  it('excludes providers for disabled tenant modules', async () => {
    vi.mocked(tenantService.isModuleEnabled).mockImplementation(
      async (_tid, slug) => slug !== 'booking'
    )

    const result = await searchService.globalSearch(TENANT, 'john', undefined, 20)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].type).toBe('customer')
  })

  it('filters by types param when provided', async () => {
    const result = await searchService.globalSearch(TENANT, 'john', ['customer'], 20)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].type).toBe('customer')
    // Booking provider should not have been called
    expect(mockProviders[1].search).not.toHaveBeenCalled()
  })

  it('returns empty groups when no providers match types filter', async () => {
    const result = await searchService.globalSearch(TENANT, 'john', ['workflow'], 20)

    expect(result.groups).toHaveLength(0)
    expect(result.totalFound).toBe(0)
  })

  it('returns empty groups when all modules disabled', async () => {
    vi.mocked(tenantService.isModuleEnabled).mockResolvedValue(false)

    const result = await searchService.globalSearch(TENANT, 'john', undefined, 20)

    expect(result.groups).toHaveLength(0)
    expect(result.totalFound).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/search/__tests__/search.service.test.ts`
Expected: FAIL — service still has old signature/behavior

**Step 3: Rewrite search.service.ts**

Replace the entire contents of `src/modules/search/search.service.ts` with:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/search/__tests__/search.service.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/modules/search/search.service.ts src/modules/search/__tests__/search.service.test.ts
git commit -m "refactor: search service uses provider registry with tenant gating"
```

---

### Task 8: Update search router input schema

**Files:**
- Modify: `src/modules/search/search.router.ts`

**Step 1: Update the router**

Replace the entire contents of `src/modules/search/search.router.ts` with:

```typescript
import { z } from 'zod'
import { router, tenantProcedure } from '@/shared/trpc'
import { searchService } from './search.service'

export const searchRouter = router({
  globalSearch: tenantProcedure
    .input(z.object({
      query: z.string().min(2).max(100),
      types: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(({ ctx, input }) =>
      searchService.globalSearch(ctx.tenantId, input.query, input.types, input.limit)
    ),
})
```

**Step 2: Verify no tsc errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/modules/search/search.router.ts
git commit -m "refactor: search router accepts dynamic types array"
```

---

### Task 9: Update search barrel export

**Files:**
- Modify: `src/modules/search/index.ts`

**Step 1: Clean up the barrel**

Replace the entire contents of `src/modules/search/index.ts` with:

```typescript
export * from './search.types'
export { searchService } from './search.service'
export { searchRouter } from './search.router'
```

Note: `search.repository` is no longer re-exported from the search barrel since providers import it directly. The repository functions are still public for direct use by providers.

**Step 2: Check nothing else imports from the old barrel path**

Run: `grep -r "from.*modules/search.*search.repository" src/ --include="*.ts" | grep -v node_modules | grep -v search.repository.ts`

Expected: Only hits in `customer.search-provider.ts` and `booking.search-provider.ts` (which import `fullTextSearch*` directly from the repo file, not the barrel).

**Step 3: Commit**

```bash
git add src/modules/search/index.ts
git commit -m "refactor: clean up search barrel export"
```

---

### Task 10: Full verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (224 existing + 9 new = 233 total)

**Step 2: TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Build check**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: fix any remaining issues from search provider refactor"
```

---

## Summary of all files

| Action | File |
|--------|------|
| Create | `src/shared/module-system/search-registry.ts` |
| Create | `src/shared/module-system/__tests__/search-registry.test.ts` |
| Create | `src/modules/customer/customer.search-provider.ts` |
| Create | `src/modules/booking/booking.search-provider.ts` |
| Create | `src/modules/search/__tests__/search.service.test.ts` |
| Modify | `src/shared/module-system/index.ts` |
| Modify | `src/shared/module-system/register-all.ts` |
| Modify | `src/modules/customer/index.ts` |
| Modify | `src/modules/booking/index.ts` |
| Modify | `src/modules/search/search.types.ts` |
| Modify | `src/modules/search/search.service.ts` |
| Modify | `src/modules/search/search.router.ts` |
| Modify | `src/modules/search/index.ts` |
