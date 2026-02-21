import type { ModuleManifest } from '@/shared/module-system/types'

export const customerManifest: ModuleManifest = {
  slug: 'customer',
  name: 'Customers',
  description: 'Customer profiles, notes, and relationship management',
  icon: 'Users',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/customers', label: 'Customers', permission: 'customers:read' },
  ],
  sidebarItems: [
    { title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations', permission: 'customers:read' },
  ],
  analyticsWidgets: [
    { id: 'new-customers', type: 'kpi', label: 'New Customers', size: '1x1',
      dataSource: { procedure: 'customer.analytics.newThisWeek' } },
    { id: 'customer-churn', type: 'table', label: 'Churn Risk', size: '2x2',
      dataSource: { procedure: 'customer.analytics.churnRisk' } },
  ],
  permissions: ['customers:read', 'customers:write', 'customers:delete'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'customer-settings', label: 'Customer Settings', icon: 'Users', section: 'module' },
  auditResources: ['customer', 'customer-note'],
}
