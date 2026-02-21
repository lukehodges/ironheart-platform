import type { ModuleManifest } from '@/shared/module-system/types'

export const platformManifest: ModuleManifest = {
  slug: 'platform',
  name: 'Platform Admin',
  description: 'Tenant provisioning, module management, and platform analytics',
  icon: 'Shield',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/platform', label: 'Platform Dashboard' },
    { path: '/platform/tenants', label: 'Tenants' },
    { path: '/platform/modules', label: 'Modules' },
  ],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ['platform:read', 'platform:write', 'platform:tenant-manage'],
  eventsProduced: ['tenant/provisioned', 'tenant/suspended'],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
  auditResources: ['tenant', 'platform-config'],
}
