import { describe, it, expect } from 'vitest'
import { evaluateConditionGroup } from '../engine/conditions'
import type { WorkflowConditionGroup } from '../workflow.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function andGroup(...conditions: WorkflowConditionGroup['conditions']): WorkflowConditionGroup {
  return { logic: 'AND', conditions }
}

function orGroup(...conditions: WorkflowConditionGroup['conditions']): WorkflowConditionGroup {
  return { logic: 'OR', conditions }
}

describe('evaluateConditionGroup', () => {
  it('returns true for empty conditions array with AND', () => {
    const group = andGroup()
    // Array.every() on empty array returns true
    expect(evaluateConditionGroup(group, {})).toBe(true)
  })

  it('evaluates equals operator', () => {
    const group = andGroup({ field: 'status', operator: 'equals', value: 'CONFIRMED' })
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED' })).toBe(true)
    expect(evaluateConditionGroup(group, { status: 'PENDING' })).toBe(false)
  })

  it('evaluates not_equals operator', () => {
    const group = andGroup({ field: 'status', operator: 'not_equals', value: 'CANCELLED' })
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED' })).toBe(true)
    expect(evaluateConditionGroup(group, { status: 'CANCELLED' })).toBe(false)
  })

  it('evaluates greater_than with numeric coercion', () => {
    const group = andGroup({ field: 'amount', operator: 'greater_than', value: '100' })
    expect(evaluateConditionGroup(group, { amount: 150 })).toBe(true)
    expect(evaluateConditionGroup(group, { amount: 50 })).toBe(false)
    expect(evaluateConditionGroup(group, { amount: 100 })).toBe(false)
  })

  it('evaluates less_than', () => {
    const group = andGroup({ field: 'rating', operator: 'less_than', value: '3' })
    expect(evaluateConditionGroup(group, { rating: 2 })).toBe(true)
    expect(evaluateConditionGroup(group, { rating: 5 })).toBe(false)
    expect(evaluateConditionGroup(group, { rating: 3 })).toBe(false)
  })

  it('evaluates contains - substring match', () => {
    const group = andGroup({ field: 'email', operator: 'contains', value: '@example' })
    expect(evaluateConditionGroup(group, { email: 'user@example.com' })).toBe(true)
    expect(evaluateConditionGroup(group, { email: 'user@other.com' })).toBe(false)
  })

  it('evaluates is_set for non-null/non-empty value', () => {
    const group = andGroup({ field: 'phone', operator: 'is_set' })
    expect(evaluateConditionGroup(group, { phone: '+441234567890' })).toBe(true)
    expect(evaluateConditionGroup(group, { phone: null })).toBe(false)
    expect(evaluateConditionGroup(group, { phone: '' })).toBe(false)
    expect(evaluateConditionGroup(group, {})).toBe(false)
  })

  it('evaluates is_not_set for null', () => {
    const group = andGroup({ field: 'phone', operator: 'is_not_set' })
    expect(evaluateConditionGroup(group, { phone: null })).toBe(true)
  })

  it('evaluates is_not_set for empty string', () => {
    const group = andGroup({ field: 'phone', operator: 'is_not_set' })
    expect(evaluateConditionGroup(group, { phone: '' })).toBe(true)
    expect(evaluateConditionGroup(group, { phone: '0123' })).toBe(false)
  })

  it('evaluates dot-path fields: "booking.serviceId"', () => {
    const group = andGroup({ field: 'booking.serviceId', operator: 'equals', value: 'svc-1' })
    expect(evaluateConditionGroup(group, { booking: { serviceId: 'svc-1' } })).toBe(true)
    expect(evaluateConditionGroup(group, { booking: { serviceId: 'svc-2' } })).toBe(false)
    // null intermediate should return false (not crash)
    expect(evaluateConditionGroup(group, { booking: null })).toBe(false)
  })

  it('AND logic: all conditions must pass', () => {
    const group = andGroup(
      { field: 'status', operator: 'equals', value: 'CONFIRMED' },
      { field: 'amount', operator: 'greater_than', value: '50' },
    )
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED', amount: 100 })).toBe(true)
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED', amount: 10 })).toBe(false)
    expect(evaluateConditionGroup(group, { status: 'PENDING', amount: 100 })).toBe(false)
  })

  it('AND logic: returns false if any condition fails', () => {
    const group = andGroup(
      { field: 'a', operator: 'equals', value: '1' },
      { field: 'b', operator: 'equals', value: '2' },
      { field: 'c', operator: 'equals', value: '3' },
    )
    expect(evaluateConditionGroup(group, { a: '1', b: '2', c: '3' })).toBe(true)
    expect(evaluateConditionGroup(group, { a: '1', b: '2', c: '9' })).toBe(false)
  })

  it('OR logic: returns true if any condition passes', () => {
    const group = orGroup(
      { field: 'status', operator: 'equals', value: 'CONFIRMED' },
      { field: 'status', operator: 'equals', value: 'PENDING' },
    )
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED' })).toBe(true)
    expect(evaluateConditionGroup(group, { status: 'PENDING' })).toBe(true)
    expect(evaluateConditionGroup(group, { status: 'CANCELLED' })).toBe(false)
  })

  it('OR logic: returns false if all conditions fail', () => {
    const group = orGroup(
      { field: 'x', operator: 'equals', value: 'a' },
      { field: 'x', operator: 'equals', value: 'b' },
    )
    expect(evaluateConditionGroup(group, { x: 'c' })).toBe(false)
  })

  it('nested groups: AND inside OR', () => {
    // (status == CONFIRMED AND amount > 50) OR (status == PENDING)
    const group = orGroup(
      andGroup(
        { field: 'status', operator: 'equals', value: 'CONFIRMED' },
        { field: 'amount', operator: 'greater_than', value: '50' },
      ),
      { field: 'status', operator: 'equals', value: 'PENDING' },
    )
    // Matches the AND branch
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED', amount: 100 })).toBe(true)
    // Matches the single condition branch
    expect(evaluateConditionGroup(group, { status: 'PENDING', amount: 10 })).toBe(true)
    // AND branch fails (amount too low), single condition also fails
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED', amount: 10 })).toBe(false)
    // Neither branch matches
    expect(evaluateConditionGroup(group, { status: 'CANCELLED', amount: 100 })).toBe(false)
  })

  it('nested groups: OR inside AND', () => {
    // (status == CONFIRMED OR status == PENDING) AND amount > 0
    const group = andGroup(
      orGroup(
        { field: 'status', operator: 'equals', value: 'CONFIRMED' },
        { field: 'status', operator: 'equals', value: 'PENDING' },
      ),
      { field: 'amount', operator: 'greater_than', value: '0' },
    )
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED', amount: 10 })).toBe(true)
    expect(evaluateConditionGroup(group, { status: 'PENDING', amount: 10 })).toBe(true)
    // amount fails
    expect(evaluateConditionGroup(group, { status: 'CONFIRMED', amount: 0 })).toBe(false)
    // status fails
    expect(evaluateConditionGroup(group, { status: 'CANCELLED', amount: 10 })).toBe(false)
  })
})
