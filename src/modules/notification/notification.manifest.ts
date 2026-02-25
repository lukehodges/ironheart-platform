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
  isCore: true,
  availability: 'standard',
  settingsTab: { slug: 'notification-settings', label: 'Notifications', icon: 'Bell', section: 'module' },
  auditResources: ['notification'],
  settingsDefinitions: [
    { key: 'emailEnabled', label: 'Enable email notifications', type: 'boolean', defaultValue: true, category: 'Channels', order: 1 },
    { key: 'smsEnabled', label: 'Enable SMS notifications', type: 'boolean', defaultValue: false, category: 'Channels', order: 2 },
    { key: 'digestEnabled', label: 'Send daily digest to staff', type: 'boolean', defaultValue: false, category: 'Delivery', order: 3 },
    { key: 'quietHoursStart', label: 'Quiet hours start (24h)', type: 'select', defaultValue: 'disabled', category: 'Delivery', order: 4, options: [{ label: 'Disabled', value: 'disabled' }, { label: '20:00', value: '20' }, { label: '21:00', value: '21' }, { label: '22:00', value: '22' }] },
    { key: 'quietHoursEnd', label: 'Quiet hours end (24h)', type: 'select', defaultValue: '08', category: 'Delivery', order: 5, options: [{ label: '06:00', value: '06' }, { label: '07:00', value: '07' }, { label: '08:00', value: '08' }, { label: '09:00', value: '09' }] },
  ],
}
