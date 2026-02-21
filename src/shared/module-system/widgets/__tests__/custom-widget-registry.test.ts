import { describe, it, expect, beforeEach, vi } from 'vitest'

let registerCustomWidget: typeof import('../custom-widget-registry').registerCustomWidget
let getCustomWidget: typeof import('../custom-widget-registry').getCustomWidget
let getAllCustomWidgetKeys: typeof import('../custom-widget-registry').getAllCustomWidgetKeys

describe('CustomWidgetRegistry', () => {
  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../custom-widget-registry')
    registerCustomWidget = mod.registerCustomWidget
    getCustomWidget = mod.getCustomWidget
    getAllCustomWidgetKeys = mod.getAllCustomWidgetKeys
  })

  it('registers and retrieves a custom widget', () => {
    const MockWidget = () => null
    registerCustomWidget('test-widget', MockWidget as any)
    expect(getCustomWidget('test-widget')).toBe(MockWidget)
  })

  it('returns null for unregistered widget', () => {
    expect(getCustomWidget('nonexistent')).toBeNull()
  })

  it('throws on duplicate registration', () => {
    const MockWidget = () => null
    registerCustomWidget('dup', MockWidget as any)
    expect(() => registerCustomWidget('dup', MockWidget as any)).toThrow(
      "Custom widget 'dup' is already registered"
    )
  })

  it('lists all registered keys', () => {
    registerCustomWidget('a', (() => null) as any)
    registerCustomWidget('b', (() => null) as any)
    expect(getAllCustomWidgetKeys()).toEqual(['a', 'b'])
  })
})
