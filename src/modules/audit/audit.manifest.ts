import type { ModuleManifest } from '@/shared/module-system/types'

export const auditManifest: ModuleManifest = {
  slug: 'audit',
  name: 'Audit Log',
  description: 'Immutable audit trail of all tenant operations',
  icon: 'ScrollText',
  category: 'intelligence',
  dependencies: [],
  routes: [
    { path: '/admin/audit', label: 'Audit Log', permission: 'audit:read' },
  ],
  sidebarItems: [
    { title: 'Audit Log', href: '/admin/audit', icon: 'ScrollText', section: 'intelligence', permission: 'audit:read' },
  ],
  analyticsWidgets: [],
  permissions: ['audit:read', 'audit:export'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
  auditResources: ['audit_log'],
}
