import type { ModuleManifest } from '@/shared/module-system/types'

export const workflowManifest: ModuleManifest = {
  slug: 'workflow',
  name: 'Workflows',
  description: 'Visual workflow builder with linear and graph execution engines',
  icon: 'Zap',
  category: 'automation',
  dependencies: [],
  routes: [
    { path: '/admin/workflows', label: 'Workflows', permission: 'workflows:read' },
  ],
  sidebarItems: [
    { title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation', permission: 'workflows:read' },
  ],
  quickActions: [
    { title: 'New Workflow', href: '/admin/workflows/new', permission: 'workflows:write' },
  ],
  analyticsWidgets: [
    { id: 'workflow-executions', type: 'kpi', label: 'Workflow Runs', size: '1x1',
      dataSource: { procedure: 'workflow.analytics.executionCount' } },
  ],
  permissions: ['workflows:read', 'workflows:write', 'workflows:delete'],
  eventsProduced: ['workflow/trigger', 'workflow/execute', 'workflow/completed'],
  eventsConsumed: ['booking/created', 'booking/confirmed', 'booking/cancelled', 'booking/completed', 'forms/submitted', 'review/submitted'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'workflow-settings', label: 'Workflow Settings', icon: 'Zap', section: 'module' },
  auditResources: ['workflow', 'workflow-execution'],
}
