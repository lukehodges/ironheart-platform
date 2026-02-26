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
  quickActions: [
    { title: 'New Booking', href: '/admin/bookings/new', shortcut: '⌘N', permission: 'bookings:write' },
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
  settingsDefinitions: [
    { key: 'bookingWindowDays', label: 'Booking Window (days)', type: 'number', defaultValue: 90, validation: { min: 1, max: 365 }, category: 'Availability', order: 1 },
    { key: 'minNoticeHours', label: 'Minimum Notice (hours)', type: 'number', defaultValue: 24, validation: { min: 0, max: 168 }, category: 'Availability', order: 2 },
    { key: 'allowSameDayBook', label: 'Allow Same-Day Booking', type: 'boolean', defaultValue: false, category: 'Availability', order: 3 },
    { key: 'bufferMinutes', label: 'Buffer Between Bookings (minutes)', type: 'number', defaultValue: 15, validation: { min: 0, max: 120 }, category: 'Scheduling', order: 1 },
    { key: 'slotDurationMins', label: 'Default Slot Duration (minutes)', type: 'number', defaultValue: 60, validation: { min: 5, max: 480 }, category: 'Scheduling', order: 2 },
    { key: 'slotApprovalEnabled', label: 'Require Slot Approval', type: 'boolean', defaultValue: false, category: 'Approval', order: 1 },
    { key: 'slotApprovalHours', label: 'Auto-Approve After (hours)', type: 'number', defaultValue: 24, validation: { min: 1, max: 168 }, category: 'Approval', order: 2 },
    { key: 'defaultSlotCapacity', label: 'Default Slot Capacity', type: 'number', defaultValue: 1, validation: { min: 1, max: 100 }, category: 'Capacity', order: 1 },
    { key: 'availabilityMode', label: 'Availability Mode', type: 'select', defaultValue: 'CALENDAR_BASED', options: [{ label: 'Calendar Based', value: 'CALENDAR_BASED' }, { label: 'Slot Based', value: 'SLOT_BASED' }, { label: 'Hybrid', value: 'HYBRID' }], category: 'Mode', order: 1 },
    { key: 'capacityMode', label: 'Capacity Mode', type: 'select', defaultValue: 'TENANT_LEVEL', options: [{ label: 'Tenant Level', value: 'TENANT_LEVEL' }, { label: 'Calendar Level', value: 'CALENDAR_LEVEL' }, { label: 'Staff Level', value: 'STAFF_LEVEL' }], category: 'Mode', order: 2 },
  ],
}
