import type { ModuleManifest } from '@/shared/module-system/types'

export const settingsManifest: ModuleManifest = {
  slug: 'settings',
  name: 'Settings',
  description: 'API key management and module configuration discovery',
  icon: 'Settings',
  category: 'operations',
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ['settings:read', 'settings:write'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
  auditResources: ['api_key', 'settings'],
}
