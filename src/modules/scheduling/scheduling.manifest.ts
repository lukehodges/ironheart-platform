import type { ModuleManifest } from '@/shared/module-system/types'

export const schedulingManifest: ModuleManifest = {
  slug: 'scheduling',
  name: 'Scheduling',
  description: 'Slot availability, service definitions, and scheduling rules',
  icon: 'Clock',
  category: 'operations',
  dependencies: ['booking', 'team'],
  routes: [
    { path: '/admin/scheduling', label: 'Scheduling', permission: 'scheduling:read' },
  ],
  sidebarItems: [
    { title: 'Scheduling', href: '/admin/scheduling', icon: 'Clock', section: 'operations', permission: 'scheduling:read' },
  ],
  analyticsWidgets: [],
  permissions: ['scheduling:read', 'scheduling:write'],
  eventsProduced: ['slot/reserved', 'slot/released'],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['schedule', 'service'],
}
