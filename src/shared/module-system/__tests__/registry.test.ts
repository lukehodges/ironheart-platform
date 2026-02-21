import { describe, it, expect, beforeEach } from 'vitest'
import { ModuleRegistry } from '../registry'
import type { ModuleManifest } from '../types'

function createManifest(overrides: Partial<ModuleManifest> & { slug: string }): ModuleManifest {
  return {
    name: overrides.slug,
    description: 'Test module',
    icon: 'Zap',
    category: 'operations',
    dependencies: [],
    routes: [],
    sidebarItems: [],
    analyticsWidgets: [],
    permissions: [],
    eventsProduced: [],
    eventsConsumed: [],
    isCore: false,
    availability: 'standard',
    ...overrides,
  }
}

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry

  beforeEach(() => {
    registry = new ModuleRegistry()
  })

  describe('register', () => {
    it('registers a manifest', () => {
      const manifest = createManifest({ slug: 'booking' })
      registry.register(manifest)
      expect(registry.getManifest('booking')).toEqual(manifest)
    })

    it('throws on duplicate slug', () => {
      registry.register(createManifest({ slug: 'booking' }))
      expect(() => registry.register(createManifest({ slug: 'booking' }))).toThrow(
        "Module 'booking' is already registered"
      )
    })
  })

  describe('validate', () => {
    it('passes with valid dependency graph', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      expect(() => registry.validate()).not.toThrow()
    })

    it('throws on missing dependency', () => {
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      expect(() => registry.validate()).toThrow(
        "Module 'booking' depends on 'customer' which is not registered"
      )
    })

    it('throws on circular dependency', () => {
      registry.register(createManifest({ slug: 'a', dependencies: ['b'] }))
      registry.register(createManifest({ slug: 'b', dependencies: ['a'] }))
      expect(() => registry.validate()).toThrow(/circular/i)
    })

    it('detects deep circular dependency', () => {
      registry.register(createManifest({ slug: 'a', dependencies: ['b'] }))
      registry.register(createManifest({ slug: 'b', dependencies: ['c'] }))
      registry.register(createManifest({ slug: 'c', dependencies: ['a'] }))
      expect(() => registry.validate()).toThrow(/circular/i)
    })
  })

  describe('canDisable', () => {
    it('allows disabling module with no dependents', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canDisable('booking', ['customer', 'booking'])
      expect(result).toEqual({ allowed: true, blockedBy: [] })
    })

    it('blocks disabling module with active dependents', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canDisable('customer', ['customer', 'booking'])
      expect(result).toEqual({ allowed: false, blockedBy: ['booking'] })
    })

    it('allows disabling when dependent is not enabled', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canDisable('customer', ['customer'])
      expect(result).toEqual({ allowed: true, blockedBy: [] })
    })

    it('blocks disabling core module', () => {
      registry.register(createManifest({ slug: 'auth', isCore: true }))
      registry.validate()

      const result = registry.canDisable('auth', ['auth'])
      expect(result).toEqual({ allowed: false, blockedBy: ['__core__'] })
    })
  })

  describe('canEnable', () => {
    it('allows enabling when dependencies are met', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canEnable('booking', ['customer'])
      expect(result).toEqual({ allowed: true, missingDeps: [] })
    })

    it('blocks enabling when dependencies are missing', () => {
      registry.register(createManifest({ slug: 'customer' }))
      registry.register(createManifest({ slug: 'booking', dependencies: ['customer'] }))
      registry.validate()

      const result = registry.canEnable('booking', [])
      expect(result).toEqual({ allowed: false, missingDeps: ['customer'] })
    })
  })

  describe('tenant-scoped queries', () => {
    beforeEach(() => {
      registry.register(createManifest({
        slug: 'customer',
        sidebarItems: [{ title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations' }],
        analyticsWidgets: [{ id: 'customers-kpi', type: 'kpi', label: 'Customers', size: '1x1', dataSource: { procedure: 'customer.analytics.kpi' } }],
        routes: [{ path: '/admin/customers', label: 'Customers', permission: 'customers:read' }],
        permissions: ['customers:read', 'customers:write'],
      }))
      registry.register(createManifest({
        slug: 'booking',
        dependencies: ['customer'],
        sidebarItems: [{ title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations' }],
        analyticsWidgets: [{ id: 'bookings-kpi', type: 'kpi', label: 'Bookings', size: '1x1', dataSource: { procedure: 'booking.analytics.kpi' } }],
        routes: [{ path: '/admin/bookings', label: 'Bookings', permission: 'bookings:read' }],
        permissions: ['bookings:read', 'bookings:write'],
      }))
      registry.register(createManifest({
        slug: 'workflow',
        sidebarItems: [{ title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation' }],
      }))
      registry.validate()
    })

    it('getSidebarItems returns items from enabled modules only', () => {
      const items = registry.getSidebarItems(['customer', 'booking'])
      expect(items).toHaveLength(2)
      expect(items.map(i => i.title)).toEqual(['Customers', 'Bookings'])
    })

    it('getSidebarItems excludes disabled modules', () => {
      const items = registry.getSidebarItems(['customer'])
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Customers')
    })

    it('getAnalyticsWidgets returns widgets from enabled modules only', () => {
      const widgets = registry.getAnalyticsWidgets(['customer'])
      expect(widgets).toHaveLength(1)
      expect(widgets[0].id).toBe('customers-kpi')
    })

    it('getRoutes returns routes from enabled modules only', () => {
      const routes = registry.getRoutes(['booking'])
      expect(routes).toHaveLength(1)
      expect(routes[0].path).toBe('/admin/bookings')
    })

    it('getPermissions returns permissions from enabled modules only', () => {
      const perms = registry.getPermissions(['customer'])
      expect(perms).toEqual(['customers:read', 'customers:write'])
    })

    it('getEnabledManifests returns full manifests', () => {
      const manifests = registry.getEnabledManifests(['workflow'])
      expect(manifests).toHaveLength(1)
      expect(manifests[0].slug).toBe('workflow')
    })

    it('getAllManifests returns everything', () => {
      expect(registry.getAllManifests()).toHaveLength(3)
    })
  })
})
