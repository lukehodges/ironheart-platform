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
}
