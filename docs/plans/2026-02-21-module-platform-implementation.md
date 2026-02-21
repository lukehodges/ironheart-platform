# Module Platform Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the manifest-driven module system so modules are self-contained, hot-swappable, and the sidebar/analytics/settings/audit are registry-driven.

**Architecture:** Every module exports a typed manifest declaring its routes, sidebar items, analytics widgets, dependencies, and permissions. A central ModuleRegistry collects manifests at startup and becomes the single query point. Cross-cutting features (sidebar, analytics, audit) query the registry instead of hardcoding module knowledge. Existing `createModuleMiddleware` stub in `src/shared/trpc.ts` is replaced with a real implementation backed by `tenantService.isModuleEnabled()`.

**Tech Stack:** TypeScript, tRPC 11, Drizzle ORM, Vitest, React 19, Next.js 16

**Existing infrastructure that already works:**
- `tenantService.isModuleEnabled(tenantId, slug)` with Redis cache (300s TTL)
- `tenantService.toggleModule(tenantId, slug, isEnabled)`
- `auditLogs` table with indexes (tenantId+createdAt, entityType+entityId, userId)
- `modules` table with slug, name, description, category, icon columns
- `tenantModules` table with isEnabled, isCustom, config columns
- `createModuleMiddleware(slug)` stub at `src/shared/trpc.ts:789-798`

---

## Phase 1: Module System Core

### Task 1: Create Module Manifest Types

**Files:**
- Create: `src/shared/module-system/types.ts`
- Test: `src/shared/module-system/__tests__/types.test.ts`

**Step 1: Write the type definitions**

```typescript
// src/shared/module-system/types.ts

export type ModuleCategory = 'operations' | 'automation' | 'finance' | 'intelligence'

export interface ModuleRoute {
  path: string
  label: string
  permission?: string
}

export interface ModuleSidebarItem {
  title: string
  href: string
  icon: string
  section: string
  permission?: string
  badge?: string
}

export interface AnalyticsWidgetDataSource {
  procedure: string
  refreshInterval?: number
}

export interface AnalyticsWidgetDefinition {
  id: string
  type: 'kpi' | 'line' | 'bar' | 'donut' | 'heatmap' | 'table' | 'custom'
  label: string
  size: '1x1' | '2x1' | '2x2' | '1x2' | '3x1' | '3x2'
  dataSource: AnalyticsWidgetDataSource
  component?: string
}

export interface ModuleSettingsTab {
  slug: string
  label: string
  icon: string
  section: 'module'
}

export interface ModuleManifest {
  slug: string
  name: string
  description: string
  icon: string
  category: ModuleCategory

  dependencies: string[]

  routes: ModuleRoute[]
  sidebarItems: ModuleSidebarItem[]
  analyticsWidgets: AnalyticsWidgetDefinition[]
  permissions: string[]

  eventsProduced: string[]
  eventsConsumed: string[]

  isCore: boolean
  availability: 'standard' | 'addon' | 'custom'

  settingsTab?: ModuleSettingsTab
  auditResources?: string[]
}
```

**Step 2: Write type validation tests**

```typescript
// src/shared/module-system/__tests__/types.test.ts
import { describe, it, expect } from 'vitest'
import type { ModuleManifest } from '../types'

describe('ModuleManifest types', () => {
  it('accepts a valid manifest', () => {
    const manifest: ModuleManifest = {
      slug: 'test-module',
      name: 'Test Module',
      description: 'A test module',
      icon: 'Zap',
      category: 'operations',
      dependencies: [],
      routes: [{ path: '/admin/test', label: 'Test' }],
      sidebarItems: [{ title: 'Test', href: '/admin/test', icon: 'Zap', section: 'operations' }],
      analyticsWidgets: [],
      permissions: ['test:read'],
      eventsProduced: [],
      eventsConsumed: [],
      isCore: false,
      availability: 'standard',
    }
    expect(manifest.slug).toBe('test-module')
  })

  it('accepts optional settingsTab', () => {
    const manifest: ModuleManifest = {
      slug: 'test',
      name: 'Test',
      description: 'Test',
      icon: 'Zap',
      category: 'operations',
      dependencies: [],
      routes: [],
      sidebarItems: [],
      analyticsWidgets: [],
      permissions: [],
      eventsProduced: [],
      eventsConsumed: [],
      isCore: false,
      availability: 'addon',
      settingsTab: { slug: 'test-settings', label: 'Test Settings', icon: 'Zap', section: 'module' },
      auditResources: ['test-resource'],
    }
    expect(manifest.settingsTab?.slug).toBe('test-settings')
  })

  it('accepts custom analytics widget with component key', () => {
    const widget: ModuleManifest['analyticsWidgets'][0] = {
      id: 'custom-widget',
      type: 'custom',
      label: 'Custom Widget',
      size: '3x2',
      dataSource: { procedure: 'test.analytics.custom' },
      component: 'custom-timeline',
    }
    expect(widget.component).toBe('custom-timeline')
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/shared/module-system/__tests__/types.test.ts`
Expected: 3 tests PASS

**Step 4: Commit**

```bash
git add src/shared/module-system/types.ts src/shared/module-system/__tests__/types.test.ts
git commit -m "feat(module-system): add ModuleManifest type definitions"
```

---

### Task 2: Create ModuleRegistry Class

**Files:**
- Create: `src/shared/module-system/registry.ts`
- Test: `src/shared/module-system/__tests__/registry.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/shared/module-system/__tests__/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ModuleRegistry } from '../registry'
import type { ModuleManifest } from '../types'

function createManifest(overrides: Partial<ModuleManifest> & { slug: string }): ModuleManifest {
  return {
    name: overrides.slug,
    description: 'Test module',
    icon: 'Zap',
    category: 'operations',
    dependencies: [],
    routes: [],
    sidebarItems: [],
    analyticsWidgets: [],
    permissions: [],
    eventsProduced: [],
    eventsConsumed: [],
    isCore: false,
    availability: 'standard',
    ...overrides,
  }
}

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry

  beforeEach(() => {
    registry = new ModuleRegistry()
  })

  describe('register', () => {
    it('registers a manifest', () => {
      const manifest = createManifest({ slug: 'booking' })
      registry.register(manifest)
      expect(registry.getManifest('booking')).toEqual(manifest)
    })

    it('throws on duplicate slug', () => {
      registry.register(createManifest({ slug: 'booking' }))
      expect(() => registry.register(createManifest({ slug: 'booking' }))).toThrow(
        "Module 'booking' is already registered"
      )
    })
  })

  describe('validate', () => {
    it('passes with valid dependency graph', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      expect(() => registry.validate()).not.toThrow()
    })

    it('throws on missing dependency', () => {
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      expect(() => registry.validate()).toThrow(
        "Module 'booking' depends on 'customer' which is not registered"
      )
    })

    it('throws on circular dependency', () => {
      registry.register(createManifest({ slug: 'a', dependencies: ['b'] }))
      registry.register(createManifest({ slug: 'b', dependencies: ['a'] }))
      expect(() => registry.validate()).toThrow(/circular/i)
    })

    it('detects deep circular dependency', () => {
      registry.register(createManifest({ slug: 'a', dependencies: ['b'] }))
      registry.register(createManifest({ slug: 'b', dependencies: ['c'] }))
      registry.register(createManifest({ slug: 'c', dependencies: ['a'] }))
      expect(() => registry.validate()).toThrow(/circular/i)
    })
  })

  describe('canDisable', () => {
    it('allows disabling module with no dependents', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canDisable('booking', ['customer', 'booking'])
      expect(result).toEqual({ allowed: true, blockedBy: [] })
    })

    it('blocks disabling module with active dependents', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canDisable('customer', ['customer', 'booking'])
      expect(result).toEqual({ allowed: false, blockedBy: ['booking'] })
    })

    it('allows disabling when dependent is not enabled', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canDisable('customer', ['customer'])
      expect(result).toEqual({ allowed: true, blockedBy: [] })
    })

    it('blocks disabling core module', () => {
      registry.register(createManifest({ slug: 'auth', isCore: true }))
      registry.validate()

      const result = registry.canDisable('auth', ['auth'])
      expect(result).toEqual({ allowed: false, blockedBy: ['__core__'] })
    })
  })

  describe('canEnable', () => {
    it('allows enabling when dependencies are met', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canEnable('booking', ['customer'])
      expect(result).toEqual({ allowed: true, missingDeps: [] })
    })

    it('blocks enabling when dependencies are missing', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canEnable('booking', [])
      expect(result).toEqual({ allowed: false, missingDeps: ['customer'] })
    })
  })

  describe('tenant-scoped queries', () => {
    beforeEach(() => {
      registry.register(createManifest({
        slug: 'customer',
        sidebarItems: [{ title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations' }],
        analyticsWidgets: [{ id: 'customers-kpi', type: 'kpi', label: 'Customers', size: '1x1', dataSource: { procedure: 'customer.analytics.kpi' } }],
        routes: [{ path: '/admin/customers', label: 'Customers', permission: 'customers:read' }],
        permissions: ['customers:read', 'customers:write'],
      }))
      registry.register(createManifest({
        slug: 'booking',
        dependencies: ['customer'],
        sidebarItems: [{ title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations' }],
        analyticsWidgets: [{ id: 'bookings-kpi', type: 'kpi', label: 'Bookings', size: '1x1', dataSource: { procedure: 'booking.analytics.kpi' } }],
        routes: [{ path: '/admin/bookings', label: 'Bookings', permission: 'bookings:read' }],
        permissions: ['bookings:read', 'bookings:write'],
      }))
      registry.register(createManifest({
        slug: 'workflow',
        sidebarItems: [{ title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation' }],
      }))
      registry.validate()
    })

    it('getSidebarItems returns items from enabled modules only', () => {
      const items = registry.getSidebarItems(['customer', 'booking'])
      expect(items).toHaveLength(2)
      expect(items.map(i => i.title)).toEqual(['Customers', 'Bookings'])
    })

    it('getSidebarItems excludes disabled modules', () => {
      const items = registry.getSidebarItems(['customer'])
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Customers')
    })

    it('getAnalyticsWidgets returns widgets from enabled modules only', () => {
      const widgets = registry.getAnalyticsWidgets(['customer'])
      expect(widgets).toHaveLength(1)
      expect(widgets[0].id).toBe('customers-kpi')
    })

    it('getRoutes returns routes from enabled modules only', () => {
      const routes = registry.getRoutes(['booking'])
      expect(routes).toHaveLength(1)
      expect(routes[0].path).toBe('/admin/bookings')
    })

    it('getPermissions returns permissions from enabled modules only', () => {
      const perms = registry.getPermissions(['customer'])
      expect(perms).toEqual(['customers:read', 'customers:write'])
    })

    it('getEnabledManifests returns full manifests', () => {
      const manifests = registry.getEnabledManifests(['workflow'])
      expect(manifests).toHaveLength(1)
      expect(manifests[0].slug).toBe('workflow')
    })

    it('getAllManifests returns everything', () => {
      expect(registry.getAllManifests()).toHaveLength(3)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/module-system/__tests__/registry.test.ts`
Expected: FAIL — ModuleRegistry not found

**Step 3: Write the ModuleRegistry implementation**

```typescript
// src/shared/module-system/registry.ts
import type {
  ModuleManifest,
  ModuleSidebarItem,
  AnalyticsWidgetDefinition,
  ModuleRoute,
} from './types'

export class ModuleRegistry {
  private manifests = new Map<string, ModuleManifest>()
  private dependentsMap = new Map<string, string[]>()
  private validated = false

  register(manifest: ModuleManifest): void {
    if (this.manifests.has(manifest.slug)) {
      throw new Error(`Module '${manifest.slug}' is already registered`)
    }
    this.manifests.set(manifest.slug, manifest)
    this.validated = false
  }

  validate(): void {
    // Check all dependencies exist
    for (const [slug, manifest] of this.manifests) {
      for (const dep of manifest.dependencies) {
        if (!this.manifests.has(dep)) {
          throw new Error(`Module '${slug}' depends on '${dep}' which is not registered`)
        }
      }
    }

    // Build dependents map
    this.dependentsMap.clear()
    for (const [slug] of this.manifests) {
      this.dependentsMap.set(slug, [])
    }
    for (const [slug, manifest] of this.manifests) {
      for (const dep of manifest.dependencies) {
        this.dependentsMap.get(dep)!.push(slug)
      }
    }

    // Detect circular dependencies via topological sort
    const visited = new Set<string>()
    const inStack = new Set<string>()

    const visit = (slug: string, path: string[]): void => {
      if (inStack.has(slug)) {
        throw new Error(`Circular dependency detected: ${[...path, slug].join(' -> ')}`)
      }
      if (visited.has(slug)) return

      inStack.add(slug)
      const manifest = this.manifests.get(slug)!
      for (const dep of manifest.dependencies) {
        visit(dep, [...path, slug])
      }
      inStack.delete(slug)
      visited.add(slug)
    }

    for (const slug of this.manifests.keys()) {
      visit(slug, [])
    }

    this.validated = true
  }

  // Core queries

  getManifest(slug: string): ModuleManifest | null {
    return this.manifests.get(slug) ?? null
  }

  getAllManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values())
  }

  // Dependency enforcement

  getDependents(slug: string): string[] {
    return this.dependentsMap.get(slug) ?? []
  }

  getDependencies(slug: string): string[] {
    return this.manifests.get(slug)?.dependencies ?? []
  }

  canDisable(
    slug: string,
    enabledSlugs: string[]
  ): { allowed: boolean; blockedBy: string[] } {
    const manifest = this.manifests.get(slug)
    if (!manifest) return { allowed: false, blockedBy: [] }

    if (manifest.isCore) {
      return { allowed: false, blockedBy: ['__core__'] }
    }

    const enabledSet = new Set(enabledSlugs)
    const blockedBy = (this.dependentsMap.get(slug) ?? []).filter((dep) =>
      enabledSet.has(dep)
    )

    return { allowed: blockedBy.length === 0, blockedBy }
  }

  canEnable(
    slug: string,
    enabledSlugs: string[]
  ): { allowed: boolean; missingDeps: string[] } {
    const manifest = this.manifests.get(slug)
    if (!manifest) return { allowed: false, missingDeps: [] }

    const enabledSet = new Set(enabledSlugs)
    const missingDeps = manifest.dependencies.filter((dep) => !enabledSet.has(dep))

    return { allowed: missingDeps.length === 0, missingDeps }
  }

  // Tenant-scoped queries

  getEnabledManifests(enabledSlugs: string[]): ModuleManifest[] {
    const set = new Set(enabledSlugs)
    return this.getAllManifests().filter((m) => set.has(m.slug))
  }

  getSidebarItems(enabledSlugs: string[]): ModuleSidebarItem[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.sidebarItems)
  }

  getAnalyticsWidgets(enabledSlugs: string[]): AnalyticsWidgetDefinition[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.analyticsWidgets)
  }

  getRoutes(enabledSlugs: string[]): ModuleRoute[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.routes)
  }

  getPermissions(enabledSlugs: string[]): string[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.permissions)
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/module-system/__tests__/registry.test.ts`
Expected: ALL PASS (16 tests)

**Step 5: Commit**

```bash
git add src/shared/module-system/registry.ts src/shared/module-system/__tests__/registry.test.ts
git commit -m "feat(module-system): implement ModuleRegistry with dependency graph"
```

---

### Task 3: Create Barrel Export and Register-All Scaffold

**Files:**
- Create: `src/shared/module-system/index.ts`
- Create: `src/shared/module-system/register-all.ts`

**Step 1: Create barrel export**

```typescript
// src/shared/module-system/index.ts
export { ModuleRegistry } from './registry'
export type {
  ModuleManifest,
  ModuleCategory,
  ModuleRoute,
  ModuleSidebarItem,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetDataSource,
  ModuleSettingsTab,
} from './types'
```

**Step 2: Create register-all scaffold**

This is initially empty — manifests will be added in Task 7.

```typescript
// src/shared/module-system/register-all.ts
import { ModuleRegistry } from './registry'

// Module manifests are registered here as they are created.
// Each module adds one import + one register() call.

export const moduleRegistry = new ModuleRegistry()

// --- Core modules (isCore: true, cannot be disabled) ---

// --- Standard modules ---

// --- Addon modules ---

// --- Custom modules ---

// Validate dependency graph at startup
moduleRegistry.validate()
```

**Step 3: Commit**

```bash
git add src/shared/module-system/index.ts src/shared/module-system/register-all.ts
git commit -m "feat(module-system): add barrel export and register-all scaffold"
```

---

## Phase 2: Module Gate Middleware

### Task 4: Implement createModuleMiddleware

**Files:**
- Modify: `src/shared/trpc.ts:789-798`
- Test: `src/shared/module-system/__tests__/module-gate.test.ts`

**Step 1: Write failing test**

```typescript
// src/shared/module-system/__tests__/module-gate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock tenant service
const mockIsModuleEnabled = vi.fn()
vi.mock('@/modules/tenant/tenant.service', () => ({
  tenantService: {
    isModuleEnabled: (...args: unknown[]) => mockIsModuleEnabled(...args),
  },
}))

// Mock logger
vi.mock('@/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}))

describe('createModuleMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls next when module is enabled', async () => {
    mockIsModuleEnabled.mockResolvedValue(true)

    // We test the logic directly since middleware is tRPC-internal
    const { createModuleGate } from '@/shared/module-system/module-gate'

    const result = await createModuleGate('booking').check('tenant-123')
    expect(result).toBe(true)
    expect(mockIsModuleEnabled).toHaveBeenCalledWith('tenant-123', 'booking')
  })

  it('throws FORBIDDEN when module is disabled', async () => {
    mockIsModuleEnabled.mockResolvedValue(false)

    const { createModuleGate } from '@/shared/module-system/module-gate'

    await expect(createModuleGate('booking').check('tenant-123')).rejects.toThrow(
      /not enabled/
    )
  })
})
```

**Step 2: Create the module gate utility**

```typescript
// src/shared/module-system/module-gate.ts
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

    /** tRPC middleware — drop into any procedure chain */
    middleware: async ({ ctx, next }: { ctx: { tenantId: string }; next: (opts: { ctx: typeof ctx }) => Promise<unknown> }) => {
      const enabled = await tenantService.isModuleEnabled(ctx.tenantId, moduleSlug)
      if (!enabled) {
        log.debug({ moduleSlug, tenantId: ctx.tenantId }, 'Module access denied — not enabled')
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Module '${moduleSlug}' is not enabled for this tenant`,
        })
      }
      return next({ ctx })
    },
  }
}
```

**Step 3: Update the stub in trpc.ts**

Replace lines 774-798 in `src/shared/trpc.ts`:

```typescript
// ---------------------------------------------------------------------------
// Module middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates middleware that checks whether a module is enabled for the current tenant.
 * Modules use this to gate their procedures behind module toggles.
 *
 * @example
 * const moduleGate = createModuleMiddleware("booking");
 * export const bookingRouter = router({
 *   list: tenantProcedure.use(moduleGate).query(...),
 * });
 */
export function createModuleMiddleware(moduleSlug: string) {
  return middleware(async ({ ctx, next }) => {
    const { tenantService } = await import("@/modules/tenant/tenant.service");
    const enabled = await tenantService.isModuleEnabled(ctx.tenantId, moduleSlug);
    if (!enabled) {
      logger.debug(
        { moduleSlug, tenantId: ctx.tenantId },
        "Module access denied — not enabled for tenant"
      );
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Module '${moduleSlug}' is not enabled for this tenant`,
      });
    }
    return next({ ctx });
  });
}
```

Note: Uses dynamic import to avoid circular dependency (trpc.ts is imported by modules that also import tenantService).

**Step 4: Add module-gate to barrel export**

Add to `src/shared/module-system/index.ts`:
```typescript
export { createModuleGate } from './module-gate'
```

**Step 5: Run tests**

Run: `npx vitest run src/shared/module-system/__tests__/module-gate.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/shared/trpc.ts src/shared/module-system/module-gate.ts src/shared/module-system/__tests__/module-gate.test.ts src/shared/module-system/index.ts
git commit -m "feat(module-system): implement createModuleMiddleware with tenant check"
```

---

## Phase 3: Audit Logger Utility

### Task 5: Create Shared Audit Logger

**Files:**
- Create: `src/shared/audit/audit-logger.ts`
- Create: `src/shared/audit/index.ts`
- Test: `src/shared/audit/__tests__/audit-logger.test.ts`

**Step 1: Write failing test**

```typescript
// src/shared/audit/__tests__/audit-logger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{}]) })

vi.mock('@/shared/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/shared/db/schema', () => ({
  auditLogs: { id: 'id' },
}))

vi.mock('@/shared/logger', () => ({
  logger: {
    child: () => ({ info: vi.fn(), error: vi.fn() }),
  },
}))

describe('auditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts an audit log entry', async () => {
    const { auditLog } = await import('../audit-logger')

    await auditLog({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      action: 'created',
      resourceType: 'booking',
      resourceId: 'booking-1',
      resourceName: 'Booking #BK-001',
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('includes changes as oldValues/newValues', async () => {
    const { auditLog } = await import('../audit-logger')

    await auditLog({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      action: 'updated',
      resourceType: 'booking',
      resourceId: 'booking-1',
      resourceName: 'Booking #BK-001',
      changes: [{ field: 'status', before: 'PENDING', after: 'CONFIRMED' }],
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('does not throw on write failure (fire-and-forget)', async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB error')),
    })

    const { auditLog } = await import('../audit-logger')

    await expect(
      auditLog({
        tenantId: 'tenant-1',
        actorId: 'user-1',
        action: 'deleted',
        resourceType: 'booking',
        resourceId: 'booking-1',
        resourceName: 'Booking #BK-001',
      })
    ).resolves.toBeUndefined()
  })
})
```

**Step 2: Implement audit logger**

```typescript
// src/shared/audit/audit-logger.ts
import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'audit-logger' })

export interface AuditLogInput {
  tenantId: string
  actorId: string
  action: 'created' | 'updated' | 'deleted'
  resourceType: string
  resourceId: string
  resourceName: string
  changes?: { field: string; before: unknown; after: unknown }[]
  metadata?: Record<string, unknown>
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    const oldValues = input.changes
      ? Object.fromEntries(input.changes.map((c) => [c.field, c.before]))
      : null
    const newValues = input.changes
      ? Object.fromEntries(input.changes.map((c) => [c.field, c.after]))
      : null

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.actorId,
      action: input.action,
      entityType: input.resourceType,
      entityId: input.resourceId,
      oldValues,
      newValues,
      metadata: {
        resourceName: input.resourceName,
        ...input.metadata,
      },
      createdAt: new Date(),
    })

    log.info(
      { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId },
      'Audit log entry written'
    )
  } catch (error) {
    // Fire-and-forget — audit logging must never break business logic
    log.error({ error, input }, 'Failed to write audit log entry')
  }
}
```

**Step 3: Create barrel export**

```typescript
// src/shared/audit/index.ts
export { auditLog, type AuditLogInput } from './audit-logger'
```

**Step 4: Run tests**

Run: `npx vitest run src/shared/audit/__tests__/audit-logger.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/shared/audit/
git commit -m "feat(audit): create shared audit logger utility"
```

---

## Phase 4: Module Manifests

### Task 6: Add Manifests to Core Modules

Core modules (`isCore: true`) that cannot be disabled. Create manifests for: `auth`, `tenant`.

**Files:**
- Create: `src/modules/auth/auth.manifest.ts`
- Create: `src/modules/tenant/tenant.manifest.ts`
- Modify: `src/shared/module-system/register-all.ts`

**Step 1: Create auth manifest**

```typescript
// src/modules/auth/auth.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const authManifest: ModuleManifest = {
  slug: 'auth',
  name: 'Authentication',
  description: 'User authentication and session management via WorkOS AuthKit',
  icon: 'Shield',
  category: 'operations',
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: [],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
}
```

**Step 2: Create tenant manifest**

```typescript
// src/modules/tenant/tenant.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const tenantManifest: ModuleManifest = {
  slug: 'tenant',
  name: 'Tenant Management',
  description: 'Organization settings, module gating, and venue management',
  icon: 'Building2',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/settings', label: 'Settings' },
  ],
  sidebarItems: [
    { title: 'Settings', href: '/admin/settings', icon: 'Settings', section: 'account' },
  ],
  analyticsWidgets: [],
  permissions: ['settings:read', 'settings:write'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
  auditResources: ['settings', 'module'],
}
```

**Step 3: Register in register-all.ts**

```typescript
// src/shared/module-system/register-all.ts
import { ModuleRegistry } from './registry'
import { authManifest } from '@/modules/auth/auth.manifest'
import { tenantManifest } from '@/modules/tenant/tenant.manifest'

export const moduleRegistry = new ModuleRegistry()

// --- Core modules (isCore: true, cannot be disabled) ---
moduleRegistry.register(authManifest)
moduleRegistry.register(tenantManifest)

// --- Standard modules ---

// --- Addon modules ---

// --- Custom modules ---

moduleRegistry.validate()
```

**Step 4: Run tests to verify nothing broke**

Run: `npx vitest run src/shared/module-system/__tests__/`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/modules/auth/auth.manifest.ts src/modules/tenant/tenant.manifest.ts src/shared/module-system/register-all.ts
git commit -m "feat(module-system): add manifests for core modules (auth, tenant)"
```

---

### Task 7: Add Manifests to Standard Modules (Batch 1)

Add manifests to: `booking`, `customer`, `team`, `scheduling`

**Files:**
- Create: `src/modules/booking/booking.manifest.ts`
- Create: `src/modules/customer/customer.manifest.ts`
- Create: `src/modules/team/team.manifest.ts`
- Create: `src/modules/scheduling/scheduling.manifest.ts`
- Modify: `src/shared/module-system/register-all.ts`

**Step 1: Create all 4 manifests**

```typescript
// src/modules/customer/customer.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const customerManifest: ModuleManifest = {
  slug: 'customer',
  name: 'Customers',
  description: 'Customer profiles, notes, and relationship management',
  icon: 'Users',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/customers', label: 'Customers', permission: 'customers:read' },
  ],
  sidebarItems: [
    { title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations', permission: 'customers:read' },
  ],
  analyticsWidgets: [
    { id: 'new-customers', type: 'kpi', label: 'New Customers', size: '1x1',
      dataSource: { procedure: 'customer.analytics.newThisWeek' } },
    { id: 'customer-churn', type: 'table', label: 'Churn Risk', size: '2x2',
      dataSource: { procedure: 'customer.analytics.churnRisk' } },
  ],
  permissions: ['customers:read', 'customers:write', 'customers:delete'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'customer-settings', label: 'Customer Settings', icon: 'Users', section: 'module' },
  auditResources: ['customer', 'customer-note'],
}
```

```typescript
// src/modules/booking/booking.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const bookingManifest: ModuleManifest = {
  slug: 'booking',
  name: 'Bookings',
  description: 'Appointment scheduling and management',
  icon: 'Calendar',
  category: 'operations',
  dependencies: ['customer'],
  routes: [
    { path: '/admin/bookings', label: 'Bookings', permission: 'bookings:read' },
    { path: '/admin/calendar', label: 'Calendar', permission: 'bookings:read' },
  ],
  sidebarItems: [
    { title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations', permission: 'bookings:read' },
    { title: 'Calendar', href: '/admin/calendar', icon: 'CalendarDays', section: 'operations', permission: 'bookings:read' },
  ],
  analyticsWidgets: [
    { id: 'bookings-this-week', type: 'kpi', label: 'Bookings This Week', size: '1x1',
      dataSource: { procedure: 'booking.analytics.thisWeek' } },
    { id: 'bookings-by-status', type: 'donut', label: 'Bookings by Status', size: '1x1',
      dataSource: { procedure: 'booking.analytics.byStatus' } },
    { id: 'booking-revenue', type: 'line', label: 'Booking Revenue', size: '2x1',
      dataSource: { procedure: 'booking.analytics.revenue' } },
  ],
  permissions: ['bookings:read', 'bookings:write', 'bookings:delete'],
  eventsProduced: ['booking/created', 'booking/confirmed', 'booking/cancelled', 'booking/completed'],
  eventsConsumed: ['payment/completed'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'booking-settings', label: 'Booking Defaults', icon: 'Calendar', section: 'module' },
  auditResources: ['booking', 'booking-slot', 'booking-assignment'],
}
```

```typescript
// src/modules/team/team.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const teamManifest: ModuleManifest = {
  slug: 'team',
  name: 'Team',
  description: 'Staff management, availability, and capacity',
  icon: 'UserCheck',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/team', label: 'Team', permission: 'team:read' },
  ],
  sidebarItems: [
    { title: 'Team', href: '/admin/team', icon: 'UserCheck', section: 'operations', permission: 'team:read' },
  ],
  analyticsWidgets: [
    { id: 'staff-utilization', type: 'heatmap', label: 'Staff Utilization', size: '2x2',
      dataSource: { procedure: 'team.analytics.utilization' } },
  ],
  permissions: ['team:read', 'team:write'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['team-member', 'availability'],
}
```

```typescript
// src/modules/scheduling/scheduling.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const schedulingManifest: ModuleManifest = {
  slug: 'scheduling',
  name: 'Scheduling',
  description: 'Slot availability, service definitions, and scheduling rules',
  icon: 'Clock',
  category: 'operations',
  dependencies: ['booking', 'team'],
  routes: [
    { path: '/admin/scheduling', label: 'Scheduling', permission: 'scheduling:read' },
  ],
  sidebarItems: [
    { title: 'Scheduling', href: '/admin/scheduling', icon: 'Clock', section: 'operations', permission: 'scheduling:read' },
  ],
  analyticsWidgets: [],
  permissions: ['scheduling:read', 'scheduling:write'],
  eventsProduced: ['slot/reserved', 'slot/released'],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['schedule', 'service'],
}
```

**Step 2: Add all 4 to register-all.ts**

Add imports and register calls under `// --- Standard modules ---`:

```typescript
import { customerManifest } from '@/modules/customer/customer.manifest'
import { bookingManifest } from '@/modules/booking/booking.manifest'
import { teamManifest } from '@/modules/team/team.manifest'
import { schedulingManifest } from '@/modules/scheduling/scheduling.manifest'

moduleRegistry.register(customerManifest)
moduleRegistry.register(bookingManifest)
moduleRegistry.register(teamManifest)
moduleRegistry.register(schedulingManifest)
```

**Step 3: Run validation**

Run: `npx vitest run src/shared/module-system/__tests__/registry.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/modules/booking/booking.manifest.ts src/modules/customer/customer.manifest.ts src/modules/team/team.manifest.ts src/modules/scheduling/scheduling.manifest.ts src/shared/module-system/register-all.ts
git commit -m "feat(module-system): add manifests for operations modules"
```

---

### Task 8: Add Manifests to Standard Modules (Batch 2)

Add manifests to: `workflow`, `forms`, `review`, `notification`, `calendar-sync`

**Files:**
- Create: `src/modules/workflow/workflow.manifest.ts`
- Create: `src/modules/forms/forms.manifest.ts`
- Create: `src/modules/review/review.manifest.ts`
- Create: `src/modules/notification/notification.manifest.ts`
- Create: `src/modules/calendar-sync/calendar-sync.manifest.ts`
- Modify: `src/shared/module-system/register-all.ts`

**Step 1: Create all 5 manifests**

```typescript
// src/modules/workflow/workflow.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const workflowManifest: ModuleManifest = {
  slug: 'workflow',
  name: 'Workflows',
  description: 'Visual workflow builder with linear and graph execution engines',
  icon: 'Zap',
  category: 'automation',
  dependencies: [],
  routes: [
    { path: '/admin/workflows', label: 'Workflows', permission: 'workflows:read' },
  ],
  sidebarItems: [
    { title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation', permission: 'workflows:read' },
  ],
  analyticsWidgets: [
    { id: 'workflow-executions', type: 'kpi', label: 'Workflow Runs', size: '1x1',
      dataSource: { procedure: 'workflow.analytics.executionCount' } },
  ],
  permissions: ['workflows:read', 'workflows:write', 'workflows:delete'],
  eventsProduced: ['workflow/trigger', 'workflow/execute', 'workflow/completed'],
  eventsConsumed: ['booking/created', 'booking/confirmed', 'booking/cancelled', 'booking/completed', 'forms/submitted', 'review/submitted'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'workflow-settings', label: 'Workflow Settings', icon: 'Zap', section: 'module' },
  auditResources: ['workflow', 'workflow-execution'],
}
```

```typescript
// src/modules/forms/forms.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const formsManifest: ModuleManifest = {
  slug: 'forms',
  name: 'Forms',
  description: 'Dynamic form builder with public submission links',
  icon: 'FileText',
  category: 'automation',
  dependencies: [],
  routes: [
    { path: '/admin/forms', label: 'Forms', permission: 'forms:read' },
  ],
  sidebarItems: [
    { title: 'Forms', href: '/admin/forms', icon: 'FileText', section: 'automation', permission: 'forms:read' },
  ],
  analyticsWidgets: [
    { id: 'forms-submitted', type: 'kpi', label: 'Forms Submitted', size: '1x1',
      dataSource: { procedure: 'forms.analytics.submittedCount' } },
  ],
  permissions: ['forms:read', 'forms:write'],
  eventsProduced: ['forms/submitted'],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['form', 'form-submission'],
}
```

```typescript
// src/modules/review/review.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const reviewManifest: ModuleManifest = {
  slug: 'review',
  name: 'Reviews',
  description: 'Customer review collection, moderation, and analytics',
  icon: 'Star',
  category: 'automation',
  dependencies: ['customer', 'booking'],
  routes: [
    { path: '/admin/reviews', label: 'Reviews', permission: 'reviews:read' },
  ],
  sidebarItems: [
    { title: 'Reviews', href: '/admin/reviews', icon: 'Star', section: 'automation', permission: 'reviews:read' },
  ],
  analyticsWidgets: [
    { id: 'avg-rating', type: 'kpi', label: 'Average Rating', size: '1x1',
      dataSource: { procedure: 'review.analytics.avgRating' } },
  ],
  permissions: ['reviews:read', 'reviews:write'],
  eventsProduced: ['review/submitted'],
  eventsConsumed: ['review/request.send'],
  isCore: false,
  availability: 'standard',
  auditResources: ['review', 'review-request'],
}
```

```typescript
// src/modules/notification/notification.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const notificationManifest: ModuleManifest = {
  slug: 'notification',
  name: 'Notifications',
  description: 'Email and SMS notification delivery',
  icon: 'Bell',
  category: 'automation',
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [
    { id: 'notifications-sent', type: 'kpi', label: 'Notifications Sent', size: '1x1',
      dataSource: { procedure: 'notification.analytics.sentCount' } },
  ],
  permissions: ['notifications:read', 'notifications:write'],
  eventsProduced: [],
  eventsConsumed: ['notification/send.email', 'notification/send.sms'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'notification-settings', label: 'Notifications', icon: 'Bell', section: 'module' },
  auditResources: ['notification'],
}
```

```typescript
// src/modules/calendar-sync/calendar-sync.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const calendarSyncManifest: ModuleManifest = {
  slug: 'calendar-sync',
  name: 'Calendar Sync',
  description: 'Google Calendar and Outlook synchronization',
  icon: 'CalendarSync',
  category: 'automation',
  dependencies: ['booking'],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ['calendar-sync:read', 'calendar-sync:write'],
  eventsProduced: [],
  eventsConsumed: ['calendar/sync.push', 'calendar/sync.pull', 'calendar/webhook.received'],
  isCore: false,
  availability: 'standard',
  auditResources: ['calendar-connection'],
}
```

**Step 2: Add all 5 to register-all.ts**

**Step 3: Run validation**

Run: `npx vitest run src/shared/module-system/__tests__/registry.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/modules/workflow/workflow.manifest.ts src/modules/forms/forms.manifest.ts src/modules/review/review.manifest.ts src/modules/notification/notification.manifest.ts src/modules/calendar-sync/calendar-sync.manifest.ts src/shared/module-system/register-all.ts
git commit -m "feat(module-system): add manifests for automation modules"
```

---

### Task 9: Add Manifests to Remaining Modules (Batch 3)

Add manifests to: `payment`, `analytics`, `developer`, `search`, `platform`, `portal`, `staff`

**Step 1: Create all 7 manifests** following the same pattern. Key details:
- `payment`: category `finance`, depends on `booking`
- `analytics`: category `intelligence`, isCore `true` (always available), no dependencies
- `developer`: category `intelligence`, permission `developer:read`
- `search`: category `intelligence`, isCore `true`
- `platform`: category `operations`, isCore `true`, routes under `/platform/`
- `portal`: depends on `booking`, public routes under `/book/`
- `staff`: depends on `team`

**Step 2: Register all in register-all.ts**

**Step 3: Run: `npx vitest run src/shared/module-system/__tests__/registry.test.ts`**

**Step 4: Commit**

```bash
git commit -m "feat(module-system): add manifests for remaining modules"
```

---

## Phase 5: Data Contracts

### Task 10: Create Customer Contract

**Files:**
- Create: `src/modules/customer/customer.contract.ts`
- Test: `src/shared/module-system/__tests__/contracts.test.ts`

**Step 1: Write the contract**

```typescript
// src/modules/customer/customer.contract.ts
import type { CustomerRecord } from './customer.types'

/**
 * Public API for the customer module.
 * Other modules that declare dependencies: ['customer'] may import ONLY this file.
 * Keep the surface area minimal.
 */
export interface CustomerContract {
  getById(tenantId: string, customerId: string): Promise<CustomerRecord | null>
  getByEmail(tenantId: string, email: string): Promise<CustomerRecord | null>
}

// Wire to real implementation
import { customerService } from './customer.service'

export const customerContract: CustomerContract = {
  getById: (tenantId, id) => customerService.getById(tenantId, id),
  getByEmail: (tenantId, email) => customerService.getByEmail(tenantId, email),
}
```

**Step 2: Write a type-safety test**

```typescript
// src/shared/module-system/__tests__/contracts.test.ts
import { describe, it, expect } from 'vitest'
import type { CustomerContract } from '@/modules/customer/customer.contract'

describe('Module contracts', () => {
  it('CustomerContract interface has expected shape', () => {
    // Type-level test: ensures the interface compiles
    const mock: CustomerContract = {
      getById: async () => null,
      getByEmail: async () => null,
    }
    expect(mock.getById).toBeDefined()
    expect(mock.getByEmail).toBeDefined()
  })
})
```

**Step 3: Run test**

Run: `npx vitest run src/shared/module-system/__tests__/contracts.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/modules/customer/customer.contract.ts src/shared/module-system/__tests__/contracts.test.ts
git commit -m "feat(module-system): add customer data contract"
```

---

## Phase 6: Dynamic Sidebar

### Task 11: Create Nav Builder

**Files:**
- Create: `src/components/layout/nav-builder.ts`
- Test: `src/components/layout/__tests__/nav-builder.test.ts`
- Modify: `src/components/layout/sidebar-nav.tsx`

**Step 1: Write failing test**

```typescript
// src/components/layout/__tests__/nav-builder.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ModuleRegistry } from '@/shared/module-system/registry'
import { buildNavSections } from '../nav-builder'
import type { ModuleManifest } from '@/shared/module-system/types'

function m(overrides: Partial<ModuleManifest> & { slug: string }): ModuleManifest {
  return {
    name: overrides.slug,
    description: '',
    icon: 'Zap',
    category: 'operations',
    dependencies: [],
    routes: [],
    sidebarItems: [],
    analyticsWidgets: [],
    permissions: [],
    eventsProduced: [],
    eventsConsumed: [],
    isCore: false,
    availability: 'standard',
    ...overrides,
  }
}

describe('buildNavSections', () => {
  let registry: ModuleRegistry

  beforeEach(() => {
    registry = new ModuleRegistry()
    registry.register(m({
      slug: 'customer',
      sidebarItems: [{ title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations', permission: 'customers:read' }],
    }))
    registry.register(m({
      slug: 'booking',
      sidebarItems: [{ title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations', permission: 'bookings:read' }],
    }))
    registry.register(m({
      slug: 'workflow',
      category: 'automation',
      sidebarItems: [{ title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation', permission: 'workflows:read' }],
    }))
    registry.validate()
  })

  it('returns items grouped by section', () => {
    const sections = buildNavSections(registry, ['customer', 'booking', 'workflow'], ['*:*'], false)
    const operationsSection = sections.find(s => s.title === 'Operations')
    expect(operationsSection?.items).toHaveLength(2)
  })

  it('excludes disabled modules', () => {
    const sections = buildNavSections(registry, ['customer'], ['*:*'], false)
    const allItems = sections.flatMap(s => s.items)
    expect(allItems.map(i => i.title)).toEqual(['Customers'])
  })

  it('filters by user permissions', () => {
    const sections = buildNavSections(registry, ['customer', 'booking'], ['bookings:read'], false)
    const allItems = sections.flatMap(s => s.items)
    expect(allItems.map(i => i.title)).toEqual(['Bookings'])
  })

  it('includes all when user has wildcard permission', () => {
    const sections = buildNavSections(registry, ['customer', 'booking'], ['*:*'], false)
    const allItems = sections.flatMap(s => s.items)
    expect(allItems).toHaveLength(2)
  })
})
```

**Step 2: Implement nav-builder**

```typescript
// src/components/layout/nav-builder.ts
import type { ModuleRegistry } from '@/shared/module-system/registry'
import type { ModuleSidebarItem } from '@/shared/module-system/types'

export interface NavItem {
  title: string
  href: string
  icon: string
  permission?: string
  badge?: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

const SECTION_LABELS: Record<string, string> = {
  operations: 'Operations',
  automation: 'Automation',
  finance: 'Finance',
  intelligence: 'Intelligence',
  account: 'Account',
}

const SECTION_ORDER = ['operations', 'automation', 'finance', 'intelligence', 'account']

function hasPermission(permission: string | undefined, permissions: string[]): boolean {
  if (!permission) return true
  if (permissions.includes('*:*')) return true
  if (permissions.includes(permission)) return true
  const [resource, action] = permission.split(':')
  if (permissions.includes(`${resource}:*`)) return true
  if (permissions.includes(`*:${action}`)) return true
  return false
}

export function buildNavSections(
  registry: ModuleRegistry,
  enabledSlugs: string[],
  permissions: string[],
  isPlatformAdmin: boolean
): NavSection[] {
  const allItems = registry.getSidebarItems(enabledSlugs)

  const permitted = allItems.filter((item) =>
    hasPermission(item.permission, permissions)
  )

  // Group by section
  const grouped = new Map<string, NavItem[]>()
  for (const item of permitted) {
    const section = item.section
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push({
      title: item.title,
      href: item.href,
      icon: item.icon,
      permission: item.permission,
      badge: item.badge,
    })
  }

  // Build ordered sections
  const sections: NavSection[] = []
  for (const sectionKey of SECTION_ORDER) {
    const items = grouped.get(sectionKey)
    if (items && items.length > 0) {
      sections.push({ title: SECTION_LABELS[sectionKey] ?? sectionKey, items })
    }
  }

  // Add any sections not in SECTION_ORDER
  for (const [sectionKey, items] of grouped) {
    if (!SECTION_ORDER.includes(sectionKey) && items.length > 0) {
      sections.push({ title: SECTION_LABELS[sectionKey] ?? sectionKey, items })
    }
  }

  // Platform admin section
  if (isPlatformAdmin) {
    sections.push({
      title: 'Platform Admin',
      items: [{ title: 'Platform Admin', href: '/platform', icon: 'Shield' }],
    })
  }

  return sections
}
```

**Step 3: Run tests**

Run: `npx vitest run src/components/layout/__tests__/nav-builder.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/components/layout/nav-builder.ts src/components/layout/__tests__/nav-builder.test.ts
git commit -m "feat(module-system): implement dynamic sidebar nav builder"
```

---

## Phase 7: Analytics Widget System

### Task 12: Create Widget Type Contracts and Custom Widget Registry

**Files:**
- Create: `src/shared/module-system/widgets/types.ts`
- Create: `src/shared/module-system/widgets/custom-widget-registry.ts`
- Create: `src/shared/module-system/widgets/index.ts`
- Test: `src/shared/module-system/widgets/__tests__/custom-widget-registry.test.ts`

**Step 1: Create standard widget data types**

```typescript
// src/shared/module-system/widgets/types.ts

export interface KPIWidgetData {
  value: number | string
  change: number
  trend: 'up' | 'down' | 'neutral'
  period: string
}

export interface LineWidgetData {
  points: { date: string; value: number }[]
}

export interface BarWidgetData {
  bars: { label: string; value: number }[]
}

export interface DonutWidgetData {
  segments: { label: string; value: number; color: string }[]
}

export interface HeatmapWidgetData {
  rows: { label: string; cells: { hour: number; value: number }[] }[]
}

export interface TableWidgetData {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface CustomWidgetProps {
  data: unknown
  label: string
  filters: { from: Date; to: Date }
  isLoading: boolean
}

export type StandardWidgetData =
  | KPIWidgetData
  | LineWidgetData
  | BarWidgetData
  | DonutWidgetData
  | HeatmapWidgetData
  | TableWidgetData
```

**Step 2: Create custom widget registry**

```typescript
// src/shared/module-system/widgets/custom-widget-registry.ts
import type { ComponentType } from 'react'
import type { CustomWidgetProps } from './types'

type WidgetComponent = ComponentType<CustomWidgetProps>

const customWidgets = new Map<string, WidgetComponent>()

export function registerCustomWidget(key: string, component: WidgetComponent): void {
  if (customWidgets.has(key)) {
    throw new Error(`Custom widget '${key}' is already registered`)
  }
  customWidgets.set(key, component)
}

export function getCustomWidget(key: string): WidgetComponent | null {
  return customWidgets.get(key) ?? null
}

export function getAllCustomWidgetKeys(): string[] {
  return Array.from(customWidgets.keys())
}
```

**Step 3: Write tests**

```typescript
// src/shared/module-system/widgets/__tests__/custom-widget-registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

// Reset the module between tests
let registerCustomWidget: typeof import('../custom-widget-registry').registerCustomWidget
let getCustomWidget: typeof import('../custom-widget-registry').getCustomWidget
let getAllCustomWidgetKeys: typeof import('../custom-widget-registry').getAllCustomWidgetKeys

describe('CustomWidgetRegistry', () => {
  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../custom-widget-registry')
    registerCustomWidget = mod.registerCustomWidget
    getCustomWidget = mod.getCustomWidget
    getAllCustomWidgetKeys = mod.getAllCustomWidgetKeys
  })

  it('registers and retrieves a custom widget', () => {
    const MockWidget = () => null
    registerCustomWidget('test-widget', MockWidget as any)
    expect(getCustomWidget('test-widget')).toBe(MockWidget)
  })

  it('returns null for unregistered widget', () => {
    expect(getCustomWidget('nonexistent')).toBeNull()
  })

  it('throws on duplicate registration', () => {
    const MockWidget = () => null
    registerCustomWidget('dup', MockWidget as any)
    expect(() => registerCustomWidget('dup', MockWidget as any)).toThrow(
      "Custom widget 'dup' is already registered"
    )
  })

  it('lists all registered keys', () => {
    registerCustomWidget('a', (() => null) as any)
    registerCustomWidget('b', (() => null) as any)
    expect(getAllCustomWidgetKeys()).toEqual(['a', 'b'])
  })
})
```

**Step 4: Create barrel export**

```typescript
// src/shared/module-system/widgets/index.ts
export { registerCustomWidget, getCustomWidget, getAllCustomWidgetKeys } from './custom-widget-registry'
export type {
  KPIWidgetData,
  LineWidgetData,
  BarWidgetData,
  DonutWidgetData,
  HeatmapWidgetData,
  TableWidgetData,
  CustomWidgetProps,
  StandardWidgetData,
} from './types'
```

**Step 5: Run tests**

Run: `npx vitest run src/shared/module-system/widgets/__tests__/custom-widget-registry.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/shared/module-system/widgets/
git commit -m "feat(module-system): add analytics widget types and custom widget registry"
```

---

## Phase 8: Integration Test

### Task 13: Full Integration Test

**Files:**
- Create: `src/shared/module-system/__tests__/integration.test.ts`

**Step 1: Write a full integration test**

```typescript
// src/shared/module-system/__tests__/integration.test.ts
import { describe, it, expect } from 'vitest'
import { ModuleRegistry } from '../registry'
import type { ModuleManifest } from '../types'

function m(overrides: Partial<ModuleManifest> & { slug: string }): ModuleManifest {
  return {
    name: overrides.slug,
    description: '',
    icon: 'Zap',
    category: 'operations',
    dependencies: [],
    routes: [],
    sidebarItems: [],
    analyticsWidgets: [],
    permissions: [],
    eventsProduced: [],
    eventsConsumed: [],
    isCore: false,
    availability: 'standard',
    ...overrides,
  }
}

describe('Module System Integration', () => {
  it('simulates a full tenant lifecycle', () => {
    const registry = new ModuleRegistry()

    // Register modules
    registry.register(m({ slug: 'auth', isCore: true }))
    registry.register(m({ slug: 'tenant', isCore: true }))
    registry.register(m({
      slug: 'customer',
      sidebarItems: [{ title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations' }],
      analyticsWidgets: [{ id: 'customers-kpi', type: 'kpi', label: 'Customers', size: '1x1', dataSource: { procedure: 'customer.analytics.kpi' } }],
      auditResources: ['customer'],
    }))
    registry.register(m({
      slug: 'booking',
      dependencies: ['customer'],
      sidebarItems: [{ title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations' }],
      analyticsWidgets: [{ id: 'bookings-kpi', type: 'kpi', label: 'Bookings', size: '1x1', dataSource: { procedure: 'booking.analytics.kpi' } }],
      auditResources: ['booking'],
    }))
    registry.register(m({
      slug: 'workflow',
      category: 'automation',
      sidebarItems: [{ title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation' }],
    }))

    registry.validate()

    // Tenant has: customer, booking, workflow enabled
    const enabled = ['customer', 'booking', 'workflow']

    // Sidebar shows 3 items from 2 sections
    const sidebar = registry.getSidebarItems(enabled)
    expect(sidebar).toHaveLength(3)

    // Analytics shows 2 widgets (customer + booking)
    const widgets = registry.getAnalyticsWidgets(enabled)
    expect(widgets).toHaveLength(2)

    // Try to disable customer — blocked by booking
    const disableResult = registry.canDisable('customer', enabled)
    expect(disableResult.allowed).toBe(false)
    expect(disableResult.blockedBy).toEqual(['booking'])

    // Disable booking first — allowed
    const disableBooking = registry.canDisable('booking', enabled)
    expect(disableBooking.allowed).toBe(true)

    // After disabling booking, customer can be disabled
    const enabledAfterBookingOff = ['customer', 'workflow']
    const disableCustomerNow = registry.canDisable('customer', enabledAfterBookingOff)
    expect(disableCustomerNow.allowed).toBe(true)

    // After disabling both, sidebar shows only workflow
    const enabledMinimal = ['workflow']
    const sidebarMinimal = registry.getSidebarItems(enabledMinimal)
    expect(sidebarMinimal).toHaveLength(1)
    expect(sidebarMinimal[0].title).toBe('Workflows')

    // Widgets show none (workflow has no widgets)
    const widgetsMinimal = registry.getAnalyticsWidgets(enabledMinimal)
    expect(widgetsMinimal).toHaveLength(0)

    // Re-enable booking — needs customer first
    const enableBooking = registry.canEnable('booking', enabledMinimal)
    expect(enableBooking.allowed).toBe(false)
    expect(enableBooking.missingDeps).toEqual(['customer'])

    // Enable customer first, then booking works
    const withCustomer = ['workflow', 'customer']
    const enableBookingNow = registry.canEnable('booking', withCustomer)
    expect(enableBookingNow.allowed).toBe(true)

    // Core modules cannot be disabled
    const disableAuth = registry.canDisable('auth', ['auth', 'tenant', 'customer'])
    expect(disableAuth.allowed).toBe(false)
    expect(disableAuth.blockedBy).toEqual(['__core__'])
  })

  it('audit resources aggregate from enabled modules only', () => {
    const registry = new ModuleRegistry()
    registry.register(m({ slug: 'customer', auditResources: ['customer', 'customer-note'] }))
    registry.register(m({ slug: 'booking', dependencies: ['customer'], auditResources: ['booking'] }))
    registry.validate()

    const enabled = registry.getEnabledManifests(['customer'])
    const auditResources = enabled.flatMap(m => m.auditResources ?? [])
    expect(auditResources).toEqual(['customer', 'customer-note'])
  })
})
```

**Step 2: Run all module-system tests**

Run: `npx vitest run src/shared/module-system/`
Expected: ALL PASS

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: Existing tests still pass, new tests pass

**Step 4: Commit**

```bash
git add src/shared/module-system/__tests__/integration.test.ts
git commit -m "test(module-system): add full lifecycle integration test"
```

---

## Summary

| Phase | Tasks | Files Created | Tests |
|-------|-------|---------------|-------|
| 1. Core | 1-3 | 5 | 19 |
| 2. Gate | 4 | 2 | 3 |
| 3. Audit | 5 | 3 | 3 |
| 4. Manifests | 6-9 | 19 | 0 (validated by registry) |
| 5. Contracts | 10 | 1 | 1 |
| 6. Sidebar | 11 | 2 | 4 |
| 7. Widgets | 12 | 4 | 4 |
| 8. Integration | 13 | 1 | 2 |
| **Total** | **13 tasks** | **37 files** | **36 tests** |

**No existing files are deleted or broken.** All changes are additive. The hardcoded `nav-config.ts` remains until the sidebar component is updated to use `nav-builder.ts` (a separate follow-up task). The `createModuleMiddleware` stub is replaced in-place with a real implementation.

**After completion:** Every module has a manifest. The registry validates the dependency graph at startup. The sidebar, analytics, and audit log can query the registry to dynamically render based on enabled modules. Modules communicate via events (Tier 1), contracts (Tier 2), or registry queries (Tier 3).
