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
  settingsDefinitions: [
    { key: 'maxResultsPerSearch', label: 'Max results per search', type: 'number', defaultValue: 25, category: 'Search', order: 1, validation: { min: 5, max: 100 } },
    { key: 'recentSearchesEnabled', label: 'Save recent searches', type: 'boolean', defaultValue: true, category: 'Search', order: 2 },
  ],
}
