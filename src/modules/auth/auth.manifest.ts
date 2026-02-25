import type { ModuleManifest } from '@/shared/module-system/types'

export const authManifest: ModuleManifest = {
  slug: 'auth',
  name: 'Authentication',
  description: 'User authentication and session management via WorkOS AuthKit',
  icon: 'Shield',
  category: 'operations',
  dependencies: [],
  routes: [],
  sidebarItems: [],
  analyticsWidgets: [],
  permissions: [],
  eventsProduced: [],
  eventsConsumed: [],
  isCore: true,
  availability: 'standard',
  settingsDefinitions: [
    { key: 'sessionTimeoutMinutes', label: 'Session timeout (minutes)', type: 'number', defaultValue: 480, category: 'Security', order: 1, validation: { min: 15, max: 10080 } },
    { key: 'mfaEnforced', label: 'Require multi-factor authentication', type: 'boolean', defaultValue: false, category: 'Security', order: 2 },
    { key: 'maxLoginAttempts', label: 'Max failed login attempts before lockout', type: 'number', defaultValue: 5, category: 'Security', order: 3, validation: { min: 3, max: 20 } },
  ],
}
