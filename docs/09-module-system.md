# Module System & Feature Flags

## Module manifest

Every module declares a manifest for runtime registration:

```typescript
// src/modules/loyalty/loyalty.manifest.ts
import type { ModuleManifest } from '@/shared/module-system/types'

export const loyaltyManifest: ModuleManifest = {
  slug: 'loyalty',
  name: 'Loyalty Program',
  description: 'Customer loyalty points and rewards',
  icon: 'Gift',
  category: 'operations',
  dependencies: ['booking'],  // Requires booking module
  routes: [{ path: '/admin/loyalty', label: 'Loyalty', permission: 'loyalty:read' }],
  sidebarItems: [{
    title: 'Loyalty',
    href: '/admin/loyalty',
    icon: 'Gift',
    section: 'Operations',
    permission: 'loyalty:read',
  }],
  analyticsWidgets: [],
  permissions: ['loyalty:read', 'loyalty:write'],
  eventsProduced: ['loyalty/points.awarded'],
  eventsConsumed: ['booking/completed'],
  isCore: false,
  availability: 'addon',
  auditResources: ['loyalty_program', 'loyalty_balance'],
}
```

## Module gating checks

```typescript
// From tenantService (Redis-cached)
const enabled = await tenantService.isModuleEnabled(tenantId, 'loyalty')

// From module registry
import { moduleRegistry } from '@/shared/module-system/register-all'
const manifests = moduleRegistry.getEnabledManifests(enabledSlugs)
```

## tenantModules table

The `tenantModules` table has `moduleId` (UUID FK to `modules.id`) and `isEnabled` (boolean). There is NO `moduleKey` text column. To enable a module for a tenant, you must first query the `modules` table by slug to get the UUID:

```typescript
const [moduleRow] = await db
  .select({ id: modules.id })
  .from(modules)
  .where(eq(modules.slug, 'loyalty'))
  .limit(1)

await db.insert(tenantModules).values({
  id: crypto.randomUUID(),
  tenantId,
  moduleId: moduleRow.id,
  isEnabled: true,
})
```
