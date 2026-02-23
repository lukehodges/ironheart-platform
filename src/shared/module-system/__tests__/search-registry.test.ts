import { describe, it, expect } from 'vitest'
import {
  SearchProviderRegistry,
  type SearchProvider,
  type SearchResult,
} from '../search-registry'

const makeProvider = (slug: string, type: string): SearchProvider => ({
  moduleSlug: slug,
  resultType: type,
  label: type.charAt(0).toUpperCase() + type.slice(1) + 's',
  async search() {
    return { hits: [], hasMore: false }
  },
  mapResult(hit) {
    return { type, id: hit.id, label: String(hit.id), secondary: null }
  },
})

describe('SearchProviderRegistry', () => {
  it('registers and retrieves providers', () => {
    const registry = new SearchProviderRegistry()
    const provider = makeProvider('customer', 'customer')
    registry.register(provider)

    expect(registry.getProviders()).toHaveLength(1)
    expect(registry.getProvider('customer')).toBe(provider)
  })

  it('returns null for unregistered module', () => {
    const registry = new SearchProviderRegistry()
    expect(registry.getProvider('nope')).toBeNull()
  })

  it('throws on duplicate registration', () => {
    const registry = new SearchProviderRegistry()
    const provider = makeProvider('customer', 'customer')
    registry.register(provider)
    expect(() => registry.register(provider)).toThrow('already registered')
  })

  it('getProviders returns all registered providers', () => {
    const registry = new SearchProviderRegistry()
    registry.register(makeProvider('customer', 'customer'))
    registry.register(makeProvider('booking', 'booking'))
    expect(registry.getProviders()).toHaveLength(2)
  })
})
