import type { ModuleManifest } from '@/shared/module-system/types'

export const staffManifest: ModuleManifest = {
  slug: 'staff',
  name: 'Staff Portal',
  description: 'Staff self-service portal for schedules and availability',
  icon: 'UserCog',
  category: 'operations',
  dependencies: ['team'],
  routes: [
    { path: '/staff', label: 'Staff Portal' },
  ],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ['staff:read', 'staff:write'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
}
