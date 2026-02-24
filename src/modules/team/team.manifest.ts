import type { ModuleManifest } from '@/shared/module-system/types'

export const teamManifest: ModuleManifest = {
  slug: 'team',
  name: 'Team',
  description: 'Staff management, availability, and capacity',
  icon: 'UserCheck',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/team', label: 'Team', permission: 'team:read' },
    { path: '/admin/team/[id]', label: 'Staff Profile', permission: 'staff:read' },
  ],
  sidebarItems: [
    { title: 'Team', href: '/admin/team', icon: 'UserCheck', section: 'operations', permission: 'team:read' },
  ],
  analyticsWidgets: [
    { id: 'staff-utilization', type: 'heatmap', label: 'Staff Utilization', size: '2x2',
      dataSource: { procedure: 'team.analytics.utilization' } },
  ],
  permissions: ['team:read', 'team:write', 'staff:read', 'staff:write'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['team-member', 'availability'],
}
