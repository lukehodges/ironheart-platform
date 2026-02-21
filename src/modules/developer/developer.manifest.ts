import type { ModuleManifest } from '@/shared/module-system/types'

export const developerManifest: ModuleManifest = {
  slug: 'developer',
  name: 'Developer Tools',
  description: 'API keys, webhooks, and developer documentation',
  icon: 'Code',
  category: 'intelligence',
  dependencies: [],
  routes: [
    { path: '/admin/developer', label: 'Developer', permission: 'developer:read' },
  ],
  sidebarItems: [
    { title: 'Developer', href: '/admin/developer', icon: 'Code', section: 'intelligence', permission: 'developer:read' },
  ],
  analyticsWidgets: [],
  permissions: ['developer:read', 'developer:write'],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: false,
  availability: 'addon',
  auditResources: ['api-key', 'webhook'],
}
