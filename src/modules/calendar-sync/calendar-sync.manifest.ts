import type { ModuleManifest } from '@/shared/module-system/types'

export const calendarSyncManifest: ModuleManifest = {
  slug: 'calendar-sync',
  name: 'Calendar Sync',
  description: 'Google Calendar and Outlook synchronization',
  icon: 'CalendarSync',
  category: 'automation',
  dependencies: ['booking'],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: ['calendar-sync:read', 'calendar-sync:write'],
  eventsProduced: [],
  eventsConsumed: ['calendar/sync.push', 'calendar/sync.pull', 'calendar/webhook.received'],
  isCore: false,
  availability: 'standard',
  auditResources: ['calendar-connection'],
}
