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
