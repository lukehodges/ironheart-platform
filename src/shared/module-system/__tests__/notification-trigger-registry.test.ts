import { describe, it, expect, beforeEach } from 'vitest'
import { NotificationTriggerRegistry } from '../notification-trigger-registry'
import type { NotificationTriggerDefinition } from '../types'

const bookingTriggers: NotificationTriggerDefinition[] = [
  {
    key: 'booking.created',
    label: 'Booking Created',
    description: 'When a new booking is created',
    defaultChannels: ['EMAIL'],
    variables: ['customerName', 'bookingDate', 'serviceName'],
  },
  {
    key: 'booking.confirmed',
    label: 'Booking Confirmed',
    description: 'When a booking is confirmed',
    defaultChannels: ['EMAIL', 'SMS'],
    variables: ['customerName', 'bookingDate'],
  },
]

describe('NotificationTriggerRegistry', () => {
  let registry: NotificationTriggerRegistry

  beforeEach(() => {
    registry = new NotificationTriggerRegistry()
  })

  it('registers triggers for a module', () => {
    registry.register('booking', bookingTriggers)
    expect(registry.getAllTriggers()).toHaveLength(2)
  })

  it('retrieves a trigger by key', () => {
    registry.register('booking', bookingTriggers)
    const trigger = registry.getTrigger('booking.created')
    expect(trigger).not.toBeNull()
    expect(trigger!.label).toBe('Booking Created')
  })

  it('returns null for unknown trigger key', () => {
    expect(registry.getTrigger('nonexistent')).toBeNull()
  })

  it('returns triggers for a specific module', () => {
    registry.register('booking', bookingTriggers)
    registry.register('review', [
      { key: 'review.submitted', label: 'Review Submitted', description: '', defaultChannels: ['EMAIL'], variables: [] },
    ])

    expect(registry.getTriggersForModule('booking')).toHaveLength(2)
    expect(registry.getTriggersForModule('review')).toHaveLength(1)
  })

  it('returns available variables for a trigger', () => {
    registry.register('booking', bookingTriggers)
    expect(registry.getAvailableVariables('booking.created')).toEqual([
      'customerName', 'bookingDate', 'serviceName',
    ])
  })

  it('throws on duplicate trigger key', () => {
    registry.register('booking', bookingTriggers)
    expect(() =>
      registry.register('other', [{ key: 'booking.created', label: 'Dupe', description: '', defaultChannels: [], variables: [] }])
    ).toThrow()
  })
})
