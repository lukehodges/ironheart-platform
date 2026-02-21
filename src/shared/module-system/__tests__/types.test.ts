import { describe, it, expect } from 'vitest'
import type { ModuleManifest } from '../types'

describe('ModuleManifest types', () => {
  it('accepts a valid manifest', () => {
    const manifest: ModuleManifest = {
      slug: 'test-module',
      name: 'Test Module',
      description: 'A test module',
      icon: 'Zap',
      category: 'operations',
      dependencies: [],
      routes: [{ path: '/admin/test', label: 'Test' }],
      sidebarItems: [{ title: 'Test', href: '/admin/test', icon: 'Zap', section: 'operations' }],
      analyticsWidgets: [],
      permissions: ['test:read'],
      eventsProduced: [],
      eventsConsumed: [],
      isCore: false,
      availability: 'standard',
    }
    expect(manifest.slug).toBe('test-module')
  })

  it('accepts optional settingsTab', () => {
    const manifest: ModuleManifest = {
      slug: 'test',
      name: 'Test',
      description: 'Test',
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
      availability: 'addon',
      settingsTab: { slug: 'test-settings', label: 'Test Settings', icon: 'Zap', section: 'module' },
      auditResources: ['test-resource'],
    }
    expect(manifest.settingsTab?.slug).toBe('test-settings')
  })

  it('accepts custom analytics widget with component key', () => {
    const widget: ModuleManifest['analyticsWidgets'][0] = {
      id: 'custom-widget',
      type: 'custom',
      label: 'Custom Widget',
      size: '3x2',
      dataSource: { procedure: 'test.analytics.custom' },
      component: 'custom-timeline',
    }
    expect(widget.component).toBe('custom-timeline')
  })
})
