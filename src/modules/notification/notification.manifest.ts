import type { ModuleManifest } from '@/shared/module-system/types'

export const notificationManifest: ModuleManifest = {
  slug: 'notification',
  name: 'Notifications',
  description: 'Email and SMS notification delivery',
  icon: 'Bell',
  category: 'automation',
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [
    { id: 'notifications-sent', type: 'kpi', label: 'Notifications Sent', size: '1x1',
      dataSource: { procedure: 'notification.analytics.sentCount' } },
  ],
  permissions: ['notifications:read', 'notifications:write'],
  eventsProduced: [],
  eventsConsumed: ['notification/send.email', 'notification/send.sms'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'notification-settings', label: 'Notifications', icon: 'Bell', section: 'module' },
  auditResources: ['notification'],
}
