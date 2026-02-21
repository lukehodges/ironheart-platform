import type { ModuleManifest } from '@/shared/module-system/types'

export const searchManifest: ModuleManifest = {
  slug: 'search',
  name: 'Search',
  description: 'Global search across all enabled modules',
  icon: 'Search',
  category: 'intelligence',
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
