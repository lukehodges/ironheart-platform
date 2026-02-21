import type { ModuleManifest } from '@/shared/module-system/types'

export const bookingManifest: ModuleManifest = {
  slug: 'booking',
  name: 'Bookings',
  description: 'Appointment scheduling and management',
  icon: 'Calendar',
  category: 'operations',
  dependencies: ['customer'],
  routes: [
    { path: '/admin/bookings', label: 'Bookings', permission: 'bookings:read' },
    { path: '/admin/calendar', label: 'Calendar', permission: 'bookings:read' },
  ],
  sidebarItems: [
    { title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations', permission: 'bookings:read' },
    { title: 'Calendar', href: '/admin/calendar', icon: 'CalendarDays', section: 'operations', permission: 'bookings:read' },
  ],
  analyticsWidgets: [
    { id: 'bookings-this-week', type: 'kpi', label: 'Bookings This Week', size: '1x1',
      dataSource: { procedure: 'booking.analytics.thisWeek' } },
    { id: 'bookings-by-status', type: 'donut', label: 'Bookings by Status', size: '1x1',
      dataSource: { procedure: 'booking.analytics.byStatus' } },
    { id: 'booking-revenue', type: 'line', label: 'Booking Revenue', size: '2x1',
      dataSource: { procedure: 'booking.analytics.revenue' } },
  ],
  permissions: ['bookings:read', 'bookings:write', 'bookings:delete'],
  eventsProduced: ['booking/created', 'booking/confirmed', 'booking/cancelled', 'booking/completed'],
  eventsConsumed: ['payment/completed'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'booking-settings', label: 'Booking Defaults', icon: 'Calendar', section: 'module' },
  auditResources: ['booking', 'booking-slot', 'booking-assignment'],
}
