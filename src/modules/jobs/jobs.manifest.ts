import type { ModuleManifest } from '@/shared/module-system/types'

export const jobsManifest: ModuleManifest = {
  slug: 'jobs',
  name: 'Jobs',
  description: 'Job scheduling and management',
  icon: 'Calendar',
  category: 'operations',
  dependencies: ['customer'],
  routes: [
    { path: '/admin/jobs', label: 'Jobs', permission: 'bookings:read' },
    { path: '/admin/calendar', label: 'Calendar', permission: 'bookings:read' },
  ],
  sidebarItems: [
    { title: 'Jobs', href: '/admin/jobs', icon: 'Calendar', section: 'operations', permission: 'bookings:read' },
    { title: 'Calendar', href: '/admin/calendar', icon: 'CalendarDays', section: 'operations', permission: 'bookings:read' },
  ],
  quickActions: [
    { title: 'New Job', href: '/admin/jobs/new', shortcut: '⌘N', permission: 'bookings:write' },
  ],
  analyticsWidgets: [
    { id: 'jobs-this-week', type: 'kpi', label: 'Jobs This Week', size: '1x1',
      dataSource: { procedure: 'jobs.analytics.thisWeek' } },
    { id: 'jobs-by-status', type: 'donut', label: 'Jobs by Status', size: '1x1',
      dataSource: { procedure: 'jobs.analytics.byStatus' } },
    { id: 'job-revenue', type: 'line', label: 'Job Revenue', size: '2x1',
      dataSource: { procedure: 'jobs.analytics.revenue' } },
  ],
  permissions: ['bookings:read', 'bookings:write', 'bookings:delete'],
  eventsProduced: ['job/created', 'job/confirmed', 'job/cancelled', 'job/completed'],
  eventsConsumed: ['payment/completed'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'job-settings', label: 'Job Defaults', icon: 'Calendar', section: 'module' },
  auditResources: ['job', 'job-slot', 'job-assignment'],
  settingsDefinitions: [
    { key: 'bookingWindowDays', label: 'Booking Window (days)', type: 'number', defaultValue: 90, validation: { min: 1, max: 365 }, category: 'Availability', order: 1 },
    { key: 'minNoticeHours', label: 'Minimum Notice (hours)', type: 'number', defaultValue: 24, validation: { min: 0, max: 168 }, category: 'Availability', order: 2 },
    { key: 'allowSameDayBook', label: 'Allow Same-Day Booking', type: 'boolean', defaultValue: false, category: 'Availability', order: 3 },
    { key: 'bufferMinutes', label: 'Buffer Between Jobs (minutes)', type: 'number', defaultValue: 15, validation: { min: 0, max: 120 }, category: 'Scheduling', order: 1 },
    { key: 'slotDurationMins', label: 'Default Slot Duration (minutes)', type: 'number', defaultValue: 60, validation: { min: 5, max: 480 }, category: 'Scheduling', order: 2 },
    { key: 'slotApprovalEnabled', label: 'Require Slot Approval', type: 'boolean', defaultValue: false, category: 'Approval', order: 1 },
    { key: 'slotApprovalHours', label: 'Auto-Approve After (hours)', type: 'number', defaultValue: 24, validation: { min: 1, max: 168 }, category: 'Approval', order: 2 },
    { key: 'defaultSlotCapacity', label: 'Default Slot Capacity', type: 'number', defaultValue: 1, validation: { min: 1, max: 100 }, category: 'Capacity', order: 1 },
    { key: 'availabilityMode', label: 'Availability Mode', type: 'select', defaultValue: 'CALENDAR_BASED', options: [{ label: 'Calendar Based', value: 'CALENDAR_BASED' }, { label: 'Slot Based', value: 'SLOT_BASED' }, { label: 'Hybrid', value: 'HYBRID' }], category: 'Mode', order: 1 },
    { key: 'capacityMode', label: 'Capacity Mode', type: 'select', defaultValue: 'TENANT_LEVEL', options: [{ label: 'Tenant Level', value: 'TENANT_LEVEL' }, { label: 'Calendar Level', value: 'CALENDAR_LEVEL' }, { label: 'Staff Level', value: 'STAFF_LEVEL' }], category: 'Mode', order: 2 },
  ],
  resourcePool: {
    capacityType: {
      slug: 'jobs',
      name: 'Jobs',
      unit: 'COUNT',
      defaultMaxDaily: 8,
      defaultMaxWeekly: null,
      defaultMaxConcurrent: null,
    },
    suggestedSkills: [
      { slug: 'haircut', name: 'Haircut', skillType: 'SERVICE' },
      { slug: 'color-treatment', name: 'Color Treatment', skillType: 'SERVICE' },
      { slug: 'beard-trim', name: 'Beard Trim', skillType: 'SERVICE' },
    ],
  },
}

// Backward-compat alias
export const bookingManifest = jobsManifest
