import type { ModuleManifest } from '@/shared/module-system/types'

export const formsManifest: ModuleManifest = {
  slug: 'forms',
  name: 'Forms',
  description: 'Dynamic form builder with public submission links',
  icon: 'FileText',
  category: 'automation',
  dependencies: [],
  routes: [
    { path: '/admin/forms', label: 'Forms', permission: 'forms:read' },
  ],
  sidebarItems: [
    { title: 'Forms', href: '/admin/forms', icon: 'FileText', section: 'automation', permission: 'forms:read' },
  ],
  analyticsWidgets: [
    { id: 'forms-submitted', type: 'kpi', label: 'Forms Submitted', size: '1x1',
      dataSource: { procedure: 'forms.analytics.submittedCount' } },
  ],
  permissions: ['forms:read', 'forms:write'],
  eventsProduced: ['forms/submitted'],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['form', 'form-submission'],
}
