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
