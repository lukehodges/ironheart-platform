import { describe, it, expect } from 'vitest'
import { ModuleRegistry } from '../registry'
import type { ModuleManifest } from '../types'

function m(overrides: Partial<ModuleManifest> & { slug: string }): ModuleManifest {
  return {
    name: overrides.slug,
    description: '',
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

describe('Module System Integration', () => {
  it('simulates a full tenant lifecycle', () => {
    const registry = new ModuleRegistry()

    // Register modules
    registry.register(m({ slug: 'auth', isCore: true }))
    registry.register(m({ slug: 'tenant', isCore: true }))
    registry.register(m({
      slug: 'customer',
      sidebarItems: [{ title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations' }],
      analyticsWidgets: [{ id: 'customers-kpi', type: 'kpi', label: 'Customers', size: '1x1', dataSource: { procedure: 'customer.analytics.kpi' } }],
      auditResources: ['customer'],
    }))
    registry.register(m({
      slug: 'booking',
      dependencies: ['customer'],
      sidebarItems: [{ title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations' }],
      analyticsWidgets: [{ id: 'bookings-kpi', type: 'kpi', label: 'Bookings', size: '1x1', dataSource: { procedure: 'booking.analytics.kpi' } }],
      auditResources: ['booking'],
    }))
    registry.register(m({
      slug: 'workflow',
      category: 'automation',
      sidebarItems: [{ title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation' }],
    }))

    registry.validate()

    // Tenant has: customer, booking, workflow enabled
    const enabled = ['customer', 'booking', 'workflow']

    // Sidebar shows 3 items from 2 sections
    const sidebar = registry.getSidebarItems(enabled)
    expect(sidebar).toHaveLength(3)

    // Analytics shows 2 widgets (customer + booking)
    const widgets = registry.getAnalyticsWidgets(enabled)
    expect(widgets).toHaveLength(2)

    // Try to disable customer - blocked by booking
    const disableResult = registry.canDisable('customer', enabled)
    expect(disableResult.allowed).toBe(false)
    expect(disableResult.blockedBy).toEqual(['booking'])

    // Disable booking first - allowed
    const disableBooking = registry.canDisable('booking', enabled)
    expect(disableBooking.allowed).toBe(true)

    // After disabling booking, customer can be disabled
    const enabledAfterBookingOff = ['customer', 'workflow']
    const disableCustomerNow = registry.canDisable('customer', enabledAfterBookingOff)
    expect(disableCustomerNow.allowed).toBe(true)

    // After disabling both, sidebar shows only workflow
    const enabledMinimal = ['workflow']
    const sidebarMinimal = registry.getSidebarItems(enabledMinimal)
    expect(sidebarMinimal).toHaveLength(1)
    expect(sidebarMinimal[0].title).toBe('Workflows')

    // Widgets show none (workflow has no widgets)
    const widgetsMinimal = registry.getAnalyticsWidgets(enabledMinimal)
    expect(widgetsMinimal).toHaveLength(0)

    // Re-enable booking - needs customer first
    const enableBooking = registry.canEnable('booking', enabledMinimal)
    expect(enableBooking.allowed).toBe(false)
    expect(enableBooking.missingDeps).toEqual(['customer'])

    // Enable customer first, then booking works
    const withCustomer = ['workflow', 'customer']
    const enableBookingNow = registry.canEnable('booking', withCustomer)
    expect(enableBookingNow.allowed).toBe(true)

    // Core modules cannot be disabled
    const disableAuth = registry.canDisable('auth', ['auth', 'tenant', 'customer'])
    expect(disableAuth.allowed).toBe(false)
    expect(disableAuth.blockedBy).toEqual(['__core__'])
  })

  it('audit resources aggregate from enabled modules only', () => {
    const registry = new ModuleRegistry()
    registry.register(m({ slug: 'customer', auditResources: ['customer', 'customer-note'] }))
    registry.register(m({ slug: 'booking', dependencies: ['customer'], auditResources: ['booking'] }))
    registry.validate()

    const enabled = registry.getEnabledManifests(['customer'])
    const auditResources = enabled.flatMap(m => m.auditResources ?? [])
    expect(auditResources).toEqual(['customer', 'customer-note'])
  })
})
