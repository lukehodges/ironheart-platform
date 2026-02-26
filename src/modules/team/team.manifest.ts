import type { ModuleManifest } from '@/shared/module-system/types'

export const teamManifest: ModuleManifest = {
  slug: 'team',
  name: 'Team',
  description: 'Staff management, availability, capacity, departments, and onboarding',
  icon: 'UserCheck',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/team', label: 'Team', permission: 'team:read' },
    { path: '/admin/team/[id]', label: 'Staff Profile', permission: 'staff:read' },
    { path: '/admin/team/departments', label: 'Departments', permission: 'staff:departments:write' },
  ],
  sidebarItems: [
    { title: 'Team', href: '/admin/team', icon: 'UserCheck', section: 'operations', permission: 'team:read' },
    { title: 'Departments', href: '/admin/team/departments', icon: 'Network', section: 'operations', permission: 'staff:departments:write' },
  ],
  analyticsWidgets: [
    { id: 'staff-utilization', type: 'heatmap', label: 'Staff Utilization', size: '2x2',
      dataSource: { procedure: 'team.analytics.utilization' } },
  ],
  permissions: [
    'team:read', 'team:write',
    'staff:read', 'staff:write',
    'staff:notes:read', 'staff:notes:write',
    'staff:sensitive:read',
    'staff:departments:write',
    'staff:onboarding:write',
    'staff:custom-fields:write',
  ],
  eventsProduced: [
    'team/created', 'team/updated', 'team/deactivated',
    'team/onboarding.completed', 'team/offboarding.completed',
  ],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['team-member', 'availability', 'department', 'staff-note', 'pay-rate'],
}
