import { describe, it, expect, beforeEach } from 'vitest'
import { ModuleRegistry } from '@/shared/module-system/registry'
import { buildNavSections } from '../nav-builder'
import type { ModuleManifest } from '@/shared/module-system/types'

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

describe('buildNavSections', () => {
  let registry: ModuleRegistry

  beforeEach(() => {
    registry = new ModuleRegistry()
    registry.register(m({
      slug: 'customer',
      sidebarItems: [{ title: 'Customers', href: '/admin/customers', icon: 'Users', section: 'operations', permission: 'customers:read' }],
    }))
    registry.register(m({
      slug: 'booking',
      sidebarItems: [{ title: 'Bookings', href: '/admin/bookings', icon: 'Calendar', section: 'operations', permission: 'bookings:read' }],
    }))
    registry.register(m({
      slug: 'workflow',
      category: 'automation',
      sidebarItems: [{ title: 'Workflows', href: '/admin/workflows', icon: 'Zap', section: 'automation', permission: 'workflows:read' }],
    }))
    registry.validate()
  })

  it('returns items grouped by section', () => {
    const sections = buildNavSections(registry, ['customer', 'booking', 'workflow'], ['*:*'], false)
    const operationsSection = sections.find(s => s.title === 'Operations')
    expect(operationsSection?.items).toHaveLength(2)
  })

  it('excludes disabled modules', () => {
    const sections = buildNavSections(registry, ['customer'], ['*:*'], false)
    const allItems = sections.flatMap(s => s.items)
    expect(allItems.map(i => i.title)).toEqual(['Customers'])
  })

  it('filters by user permissions', () => {
    const sections = buildNavSections(registry, ['customer', 'booking'], ['bookings:read'], false)
    const allItems = sections.flatMap(s => s.items)
    expect(allItems.map(i => i.title)).toEqual(['Bookings'])
  })

  it('includes all when user has wildcard permission', () => {
    const sections = buildNavSections(registry, ['customer', 'booking'], ['*:*'], false)
    const allItems = sections.flatMap(s => s.items)
    expect(allItems).toHaveLength(2)
  })
})
