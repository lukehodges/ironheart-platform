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
  settingsDefinitions: [
    { key: 'retentionDays', label: 'Log retention period (days)', type: 'number', defaultValue: 365, category: 'Storage', order: 1, validation: { min: 30, max: 2555 } },
    { key: 'maxExportRows', label: 'Max rows per export', type: 'number', defaultValue: 10000, category: 'Export', order: 2, validation: { min: 100, max: 50000 } },
  ],
}
