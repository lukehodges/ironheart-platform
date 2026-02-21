import type { ModuleManifest } from '@/shared/module-system/types'

export const portalManifest: ModuleManifest = {
  slug: 'portal',
  name: 'Booking Portal',
  description: 'Public-facing booking portal for customers',
  icon: 'Globe',
  category: 'operations',
  dependencies: ['booking'],
  routes: [
    { path: '/book/[tenantSlug]', label: 'Booking Portal' },
  ],
  sidebarItems: [],
  analyticsWidgets: [
    { id: 'portal-visits', type: 'kpi', label: 'Portal Visits', size: '1x1',
      dataSource: { procedure: 'portal.analytics.visits' } },
  ],
  permissions: [],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
}
