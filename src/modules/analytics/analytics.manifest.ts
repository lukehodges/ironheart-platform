import type { ModuleManifest } from '@/shared/module-system/types'

export const analyticsManifest: ModuleManifest = {
  slug: 'analytics',
  name: 'Analytics',
  description: 'Composable analytics dashboard with module-registered widgets',
  icon: 'BarChart3',
  category: 'intelligence',
  dependencies: [],
  routes: [
    { path: '/admin/analytics', label: 'Analytics', permission: 'analytics:read' },
  ],
  sidebarItems: [
    { title: 'Analytics', href: '/admin/analytics', icon: 'BarChart3', section: 'intelligence', permission: 'analytics:read' },
  ],
  analyticsWidgets: [],
  permissions: ['analytics:read', 'analytics:configure'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
  auditResources: ['dashboard-layout'],
  settingsDefinitions: [
    { key: 'defaultPeriod', label: 'Default dashboard period', type: 'select', defaultValue: 'MONTH', category: 'Dashboard', order: 1, options: [{ label: 'Today', value: 'TODAY' }, { label: 'This week', value: 'WEEK' }, { label: 'This month', value: 'MONTH' }, { label: 'This quarter', value: 'QUARTER' }, { label: 'This year', value: 'YEAR' }] },
    { key: 'cacheTtlSeconds', label: 'Dashboard cache duration (seconds)', type: 'number', defaultValue: 300, category: 'Performance', order: 2, validation: { min: 0, max: 3600 } },
  ],
}
