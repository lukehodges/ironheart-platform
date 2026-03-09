import { describe, it, expect } from 'vitest'
import {
  assertValidInvoiceTransition,
  isTerminalInvoiceStatus,
  getValidInvoiceTransitions,
} from '../lib/state-machine'
import { applyPricingRules } from '../lib/pricing-engine'
import { calculateTax, calculateTaxFromRate } from '../lib/tax-engine'
import { BadRequestError } from '@/shared/errors'
import type { PricingRule, PricingContext, TaxRule } from '../payment.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePricingRule(overrides: Partial<PricingRule> = {}): PricingRule {
  return {
    id: 'rule-1',
    tenantId: 'tenant-1',
    name: 'Test Rule',
    enabled: true,
    sortOrder: 1,
    conditions: { logic: 'AND', conditions: [] },
    modifierType: 'PERCENT_DISCOUNT',
    modifierValue: 10,
    serviceIds: null,
    staffIds: null,
    validFrom: null,
    validUntil: null,
    maxUses: null,
    currentUses: 0,
    ...overrides,
  }
}

function makePricingContext(overrides: Partial<PricingContext> = {}): PricingContext {
  return {
    basePrice: 100,
    booking: {
      serviceId: 'svc-1',
      dayOfWeek: 1,       // Monday
      timeOfDay: 600,     // 10:00 AM in minutes
      advanceDays: 7,
    },
    customer: {
      bookingCount: 5,
    },
    ...overrides,
  }
}

function makeTaxRule(overrides: Partial<TaxRule> = {}): TaxRule {
  return {
    id: 'tax-1',
    tenantId: 'tenant-1',
    name: 'Standard VAT',
    rate: 0.2,
    country: 'GB',
    taxCode: 'VAT20',
    appliesTo: 'ALL',
    isDefault: true,
    isReverseCharge: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// assertValidInvoiceTransition - valid transitions
// ---------------------------------------------------------------------------

describe('assertValidInvoiceTransition - valid transitions', () => {
  it('allows DRAFT → SENT', () => {
    expect(() => assertValidInvoiceTransition('DRAFT', 'SENT')).not.toThrow()
  })

  it('allows SENT → VIEWED', () => {
    expect(() => assertValidInvoiceTransition('SENT', 'VIEWED')).not.toThrow()
  })

  it('allows SENT → PAID', () => {
    expect(() => assertValidInvoiceTransition('SENT', 'PAID')).not.toThrow()
  })

  it('allows SENT → PARTIALLY_PAID', () => {
    expect(() => assertValidInvoiceTransition('SENT', 'PARTIALLY_PAID')).not.toThrow()
  })

  it('allows SENT → OVERDUE', () => {
    expect(() => assertValidInvoiceTransition('SENT', 'OVERDUE')).not.toThrow()
  })

  it('allows SENT → VOID', () => {
    expect(() => assertValidInvoiceTransition('SENT', 'VOID')).not.toThrow()
  })

  it('allows VIEWED → PAID', () => {
    expect(() => assertValidInvoiceTransition('VIEWED', 'PAID')).not.toThrow()
  })

  it('allows VIEWED → PARTIALLY_PAID', () => {
    expect(() => assertValidInvoiceTransition('VIEWED', 'PARTIALLY_PAID')).not.toThrow()
  })

  it('allows VIEWED → OVERDUE', () => {
    expect(() => assertValidInvoiceTransition('VIEWED', 'OVERDUE')).not.toThrow()
  })

  it('allows VIEWED → VOID', () => {
    expect(() => assertValidInvoiceTransition('VIEWED', 'VOID')).not.toThrow()
  })

  it('allows PARTIALLY_PAID → PAID', () => {
    expect(() => assertValidInvoiceTransition('PARTIALLY_PAID', 'PAID')).not.toThrow()
  })

  it('allows PARTIALLY_PAID → OVERDUE', () => {
    expect(() => assertValidInvoiceTransition('PARTIALLY_PAID', 'OVERDUE')).not.toThrow()
  })

  it('allows OVERDUE → PAID', () => {
    expect(() => assertValidInvoiceTransition('OVERDUE', 'PAID')).not.toThrow()
  })

  it('allows OVERDUE → PARTIALLY_PAID', () => {
    expect(() => assertValidInvoiceTransition('OVERDUE', 'PARTIALLY_PAID')).not.toThrow()
  })

  it('allows OVERDUE → VOID', () => {
    expect(() => assertValidInvoiceTransition('OVERDUE', 'VOID')).not.toThrow()
  })

  it('allows PAID → REFUNDED', () => {
    expect(() => assertValidInvoiceTransition('PAID', 'REFUNDED')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// assertValidInvoiceTransition - invalid transitions
// ---------------------------------------------------------------------------

describe('assertValidInvoiceTransition - invalid transitions', () => {
  it('throws BadRequestError for DRAFT → PAID (skips SENT)', () => {
    expect(() => assertValidInvoiceTransition('DRAFT', 'PAID')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for DRAFT → VOID (no direct DRAFT→VOID path)', () => {
    expect(() => assertValidInvoiceTransition('DRAFT', 'VOID')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for PAID → DRAFT (backwards transition)', () => {
    expect(() => assertValidInvoiceTransition('PAID', 'DRAFT')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for PAID → SENT (backwards transition)', () => {
    expect(() => assertValidInvoiceTransition('PAID', 'SENT')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for PAID → VOID (cannot void after payment)', () => {
    expect(() => assertValidInvoiceTransition('PAID', 'VOID')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for REFUNDED → PAID (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('REFUNDED', 'PAID')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for REFUNDED → DRAFT (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('REFUNDED', 'DRAFT')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for REFUNDED → VOID (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('REFUNDED', 'VOID')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for VOID → DRAFT (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('VOID', 'DRAFT')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for VOID → SENT (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('VOID', 'SENT')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for VOID → PAID (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('VOID', 'PAID')).toThrow(BadRequestError)
  })

  it('throws BadRequestError for VOID → REFUNDED (terminal state)', () => {
    expect(() => assertValidInvoiceTransition('VOID', 'REFUNDED')).toThrow(BadRequestError)
  })

  it('error message includes the invalid transition', () => {
    let caughtMessage = ''
    try {
      assertValidInvoiceTransition('PAID', 'DRAFT')
    } catch (e) {
      if (e instanceof BadRequestError) caughtMessage = e.message
    }
    expect(caughtMessage).toContain('PAID')
    expect(caughtMessage).toContain('DRAFT')
  })

  it('error message mentions terminal state when from VOID', () => {
    let caughtMessage = ''
    try {
      assertValidInvoiceTransition('VOID', 'PAID')
    } catch (e) {
      if (e instanceof BadRequestError) caughtMessage = e.message
    }
    expect(caughtMessage).toContain('terminal state')
  })
})

// ---------------------------------------------------------------------------
// isTerminalInvoiceStatus
// ---------------------------------------------------------------------------

describe('isTerminalInvoiceStatus', () => {
  it('returns true for VOID (terminal)', () => {
    expect(isTerminalInvoiceStatus('VOID')).toBe(true)
  })

  it('returns true for REFUNDED (terminal)', () => {
    expect(isTerminalInvoiceStatus('REFUNDED')).toBe(true)
  })

  it('returns false for DRAFT (not terminal)', () => {
    expect(isTerminalInvoiceStatus('DRAFT')).toBe(false)
  })

  it('returns false for SENT (not terminal)', () => {
    expect(isTerminalInvoiceStatus('SENT')).toBe(false)
  })

  it('returns false for VIEWED (not terminal)', () => {
    expect(isTerminalInvoiceStatus('VIEWED')).toBe(false)
  })

  it('returns false for PARTIALLY_PAID (not terminal)', () => {
    expect(isTerminalInvoiceStatus('PARTIALLY_PAID')).toBe(false)
  })

  it('returns false for OVERDUE (not terminal)', () => {
    expect(isTerminalInvoiceStatus('OVERDUE')).toBe(false)
  })

  it('returns false for PAID (not terminal - can still refund)', () => {
    expect(isTerminalInvoiceStatus('PAID')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getValidInvoiceTransitions
// ---------------------------------------------------------------------------

describe('getValidInvoiceTransitions', () => {
  it('returns empty array for VOID (terminal)', () => {
    expect(getValidInvoiceTransitions('VOID')).toEqual([])
  })

  it('returns empty array for REFUNDED (terminal)', () => {
    expect(getValidInvoiceTransitions('REFUNDED')).toEqual([])
  })

  it('returns SENT as only transition from DRAFT', () => {
    expect(getValidInvoiceTransitions('DRAFT')).toEqual(['SENT'])
  })

  it('returns REFUNDED as only transition from PAID', () => {
    expect(getValidInvoiceTransitions('PAID')).toEqual(['REFUNDED'])
  })

  it('returns multiple transitions from SENT', () => {
    const transitions = getValidInvoiceTransitions('SENT')
    expect(transitions).toContain('VIEWED')
    expect(transitions).toContain('PAID')
    expect(transitions).toContain('VOID')
    expect(transitions.length).toBeGreaterThan(2)
  })
})

// ---------------------------------------------------------------------------
// applyPricingRules - modifier types
// ---------------------------------------------------------------------------

describe('applyPricingRules - modifier types', () => {
  it('PERCENT_DISCOUNT: applies percentage off base price', () => {
    const rule = makePricingRule({ modifierType: 'PERCENT_DISCOUNT', modifierValue: 10 })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(90)
  })

  it('PERCENT_DISCOUNT: 20% off £150 = £120', () => {
    const rule = makePricingRule({ modifierType: 'PERCENT_DISCOUNT', modifierValue: 20 })
    const ctx = makePricingContext({ basePrice: 150 })
    expect(applyPricingRules([rule], ctx)).toBe(120)
  })

  it('FIXED_DISCOUNT: subtracts fixed amount from base price', () => {
    const rule = makePricingRule({ modifierType: 'FIXED_DISCOUNT', modifierValue: 25 })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(75)
  })

  it('FIXED_DISCOUNT: clamps to 0 when discount exceeds base price', () => {
    const rule = makePricingRule({ modifierType: 'FIXED_DISCOUNT', modifierValue: 200 })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(0)
  })

  it('FIXED_PRICE: overrides price completely (ignores base price)', () => {
    const rule = makePricingRule({ modifierType: 'FIXED_PRICE', modifierValue: 49.99 })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(49.99)
  })

  it('FIXED_SURCHARGE: adds fixed amount to base price', () => {
    const rule = makePricingRule({ modifierType: 'FIXED_SURCHARGE', modifierValue: 15 })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(115)
  })

  it('PERCENT_SURCHARGE: adds percentage to base price', () => {
    const rule = makePricingRule({ modifierType: 'PERCENT_SURCHARGE', modifierValue: 10 })
    const ctx = makePricingContext({ basePrice: 200 })
    expect(applyPricingRules([rule], ctx)).toBe(220)
  })
})

// ---------------------------------------------------------------------------
// applyPricingRules - rule filtering (enabled, maxUses, dates, serviceIds)
// ---------------------------------------------------------------------------

describe('applyPricingRules - rule filtering', () => {
  it('returns base price when no rules provided', () => {
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([], ctx)).toBe(100)
  })

  it('skips disabled rules and returns base price', () => {
    const rule = makePricingRule({ enabled: false, modifierType: 'PERCENT_DISCOUNT', modifierValue: 50 })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('skips rules that have hit maxUses', () => {
    const rule = makePricingRule({
      maxUses: 10,
      currentUses: 10,
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 50,
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('applies rule that has not yet reached maxUses', () => {
    const rule = makePricingRule({
      maxUses: 10,
      currentUses: 9,
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 20,
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(80)
  })

  it('skips rules whose validFrom is in the future', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    const rule = makePricingRule({
      validFrom: futureDate,
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 50,
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('skips rules whose validUntil has passed', () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const rule = makePricingRule({
      validUntil: pastDate,
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 50,
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('applies rule when validFrom is in the past', () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const rule = makePricingRule({
      validFrom: pastDate,
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 10,
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(90)
  })
})

// ---------------------------------------------------------------------------
// applyPricingRules - serviceIds filtering
// ---------------------------------------------------------------------------

describe('applyPricingRules - serviceIds filtering', () => {
  it('applies rule when booking.serviceId matches serviceIds list', () => {
    const rule = makePricingRule({
      serviceIds: ['svc-1', 'svc-2'],
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 15,
    })
    const ctx = makePricingContext({ basePrice: 100, booking: { serviceId: 'svc-1', dayOfWeek: 1, timeOfDay: 600, advanceDays: 7 } })
    expect(applyPricingRules([rule], ctx)).toBe(85)
  })

  it('skips rule when booking.serviceId is NOT in serviceIds list', () => {
    const rule = makePricingRule({
      serviceIds: ['svc-99'],
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 50,
    })
    const ctx = makePricingContext({ basePrice: 100, booking: { serviceId: 'svc-1', dayOfWeek: 1, timeOfDay: 600, advanceDays: 7 } })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('applies rule to any service when serviceIds is null', () => {
    const rule = makePricingRule({
      serviceIds: null,
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 5,
    })
    const ctx = makePricingContext({ basePrice: 100, booking: { serviceId: 'any-svc', dayOfWeek: 1, timeOfDay: 600, advanceDays: 7 } })
    expect(applyPricingRules([rule], ctx)).toBe(95)
  })
})

// ---------------------------------------------------------------------------
// applyPricingRules - conditions matching
// ---------------------------------------------------------------------------

describe('applyPricingRules - conditions matching', () => {
  it('applies rule when AND conditions all match', () => {
    const rule = makePricingRule({
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 20,
      conditions: {
        logic: 'AND',
        conditions: [
          { field: 'booking.dayOfWeek', operator: 'eq', value: 1 },
          { field: 'customer.bookingCount', operator: 'gte', value: 5 },
        ],
      },
    })
    const ctx = makePricingContext({
      basePrice: 100,
      booking: { serviceId: 'svc-1', dayOfWeek: 1, timeOfDay: 600, advanceDays: 7 },
      customer: { bookingCount: 5 },
    })
    expect(applyPricingRules([rule], ctx)).toBe(80)
  })

  it('skips rule when AND condition does not match', () => {
    const rule = makePricingRule({
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 20,
      conditions: {
        logic: 'AND',
        conditions: [
          { field: 'booking.dayOfWeek', operator: 'eq', value: 6 }, // Saturday - does not match Monday
        ],
      },
    })
    const ctx = makePricingContext({
      basePrice: 100,
      booking: { serviceId: 'svc-1', dayOfWeek: 1, timeOfDay: 600, advanceDays: 7 },
      customer: { bookingCount: 5 },
    })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('applies rule when OR conditions: at least one matches', () => {
    const rule = makePricingRule({
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 10,
      conditions: {
        logic: 'OR',
        conditions: [
          { field: 'booking.dayOfWeek', operator: 'eq', value: 6 }, // Saturday - does not match
          { field: 'customer.bookingCount', operator: 'gte', value: 5 }, // matches
        ],
      },
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(90)
  })

  it('skips rule when OR conditions: none match', () => {
    const rule = makePricingRule({
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 10,
      conditions: {
        logic: 'OR',
        conditions: [
          { field: 'booking.dayOfWeek', operator: 'eq', value: 6 }, // Saturday - no match (Monday)
          { field: 'customer.bookingCount', operator: 'gt', value: 100 }, // no match (count=5)
        ],
      },
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(100)
  })

  it('applies rule when empty conditions group (matches anything)', () => {
    const rule = makePricingRule({
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 5,
      conditions: { logic: 'AND', conditions: [] },
    })
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(95)
  })

  it('first-match-wins: only first matching rule is applied (sort order ascending)', () => {
    const rule1 = makePricingRule({
      sortOrder: 1,
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 10,
      conditions: { logic: 'AND', conditions: [] },
    })
    const rule2 = makePricingRule({
      id: 'rule-2',
      sortOrder: 2,
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 50, // would give a bigger discount if applied
      conditions: { logic: 'AND', conditions: [] },
    })
    const ctx = makePricingContext({ basePrice: 100 })
    // Only rule1 should be applied - first match wins
    expect(applyPricingRules([rule2, rule1], ctx)).toBe(90)
  })

  it('second rule applies when first is disabled', () => {
    const rule1 = makePricingRule({
      sortOrder: 1,
      enabled: false,
      modifierType: 'PERCENT_DISCOUNT',
      modifierValue: 50,
      conditions: { logic: 'AND', conditions: [] },
    })
    const rule2 = makePricingRule({
      id: 'rule-2',
      sortOrder: 2,
      enabled: true,
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 20,
      conditions: { logic: 'AND', conditions: [] },
    })
    const ctx = makePricingContext({ basePrice: 100 })
    // rule1 is disabled, rule2 should apply
    expect(applyPricingRules([rule1, rule2], ctx)).toBe(80)
  })

  it('condition: in operator - field value in array', () => {
    const rule = makePricingRule({
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 15,
      conditions: {
        logic: 'AND',
        conditions: [
          { field: 'booking.dayOfWeek', operator: 'in', value: [0, 6] }, // weekend
        ],
      },
    })
    // Saturday (6) matches
    const ctxSat = makePricingContext({ basePrice: 100, booking: { serviceId: 'svc-1', dayOfWeek: 6, timeOfDay: 600, advanceDays: 7 } })
    expect(applyPricingRules([rule], ctxSat)).toBe(85)
    // Monday (1) does not match
    const ctxMon = makePricingContext({ basePrice: 100, booking: { serviceId: 'svc-1', dayOfWeek: 1, timeOfDay: 600, advanceDays: 7 } })
    expect(applyPricingRules([rule], ctxMon)).toBe(100)
  })

  it('condition: not_in operator - field value not in array', () => {
    const rule = makePricingRule({
      modifierType: 'FIXED_DISCOUNT',
      modifierValue: 5,
      conditions: {
        logic: 'AND',
        conditions: [
          { field: 'booking.dayOfWeek', operator: 'not_in', value: [0, 6] }, // not weekend
        ],
      },
    })
    // Monday (1) is not in [0,6] - matches
    const ctx = makePricingContext({ basePrice: 100 })
    expect(applyPricingRules([rule], ctx)).toBe(95)
  })

  it('rounding invariant: result has at most 2 decimal places (PERCENT_DISCOUNT)', () => {
    const rule = makePricingRule({ modifierType: 'PERCENT_DISCOUNT', modifierValue: 33.3 })
    const ctx = makePricingContext({ basePrice: 100 })
    const result = applyPricingRules([rule], ctx)
    // 100 * (1 - 33.3/100) = 66.7 - check 2 dp
    const decimalParts = String(result).split('.')
    if (decimalParts[1]) {
      expect(decimalParts[1].length).toBeLessThanOrEqual(2)
    }
    expect(result).toBe(66.7)
  })
})

// ---------------------------------------------------------------------------
// calculateTax
// ---------------------------------------------------------------------------

describe('calculateTax', () => {
  it('basic tax: subtotal × rate = taxAmount', () => {
    const rule = makeTaxRule({ rate: 0.2 })
    const result = calculateTax(100, rule)
    expect(result.taxAmount).toBe(20)
    expect(result.totalAmount).toBe(120)
    expect(result.subtotal).toBe(100)
  })

  it('zero rate: taxAmount is 0, totalAmount equals subtotal', () => {
    const rule = makeTaxRule({ rate: 0 })
    const result = calculateTax(100, rule)
    expect(result.taxAmount).toBe(0)
    expect(result.totalAmount).toBe(100)
  })

  it('5% VAT on £79.99', () => {
    const rule = makeTaxRule({ rate: 0.05 })
    const result = calculateTax(79.99, rule)
    expect(result.taxAmount).toBe(4.0)
    expect(result.totalAmount).toBe(83.99)
  })

  it('preserves taxRate from rule', () => {
    const rule = makeTaxRule({ rate: 0.175 })
    const result = calculateTax(100, rule)
    expect(result.taxRate).toBe(0.175)
  })

  it('preserves taxName from rule', () => {
    const rule = makeTaxRule({ name: 'German USt' })
    const result = calculateTax(100, rule)
    expect(result.taxName).toBe('German USt')
  })

  it('preserves isReverseCharge from rule', () => {
    const rule = makeTaxRule({ isReverseCharge: true })
    const result = calculateTax(100, rule)
    expect(result.isReverseCharge).toBe(true)
  })

  it('isReverseCharge defaults to false for standard rules', () => {
    const rule = makeTaxRule({ isReverseCharge: false })
    const result = calculateTax(100, rule)
    expect(result.isReverseCharge).toBe(false)
  })

  it('rounding invariant: taxAmount has at most 2 decimal places', () => {
    const rule = makeTaxRule({ rate: 0.19 }) // 19% German USt - common rounding edge case
    const result = calculateTax(99.99, rule)
    const decimalParts = String(result.taxAmount).split('.')
    if (decimalParts[1]) {
      expect(decimalParts[1].length).toBeLessThanOrEqual(2)
    }
  })

  it('rounding invariant: totalAmount = subtotal + taxAmount (never accumulated drift)', () => {
    const rule = makeTaxRule({ rate: 0.19 })
    const subtotal = 99.99
    const result = calculateTax(subtotal, rule)
    // totalAmount must equal round2(subtotal) + round2(taxAmount), not raw float arithmetic
    const expectedTotal = Math.round((subtotal + result.taxAmount + Number.EPSILON) * 100) / 100
    expect(result.totalAmount).toBe(expectedTotal)
  })

  it('returns all required TaxCalculation fields', () => {
    const rule = makeTaxRule()
    const result = calculateTax(100, rule)
    expect(result).toHaveProperty('subtotal')
    expect(result).toHaveProperty('taxAmount')
    expect(result).toHaveProperty('totalAmount')
    expect(result).toHaveProperty('taxRate')
    expect(result).toHaveProperty('taxName')
    expect(result).toHaveProperty('isReverseCharge')
  })

  it('high-value invoice: 20% on £10,000', () => {
    const rule = makeTaxRule({ rate: 0.2 })
    const result = calculateTax(10000, rule)
    expect(result.taxAmount).toBe(2000)
    expect(result.totalAmount).toBe(12000)
  })
})

// ---------------------------------------------------------------------------
// calculateTaxFromRate
// ---------------------------------------------------------------------------

describe('calculateTaxFromRate', () => {
  it('basic calculation: 20% on £100', () => {
    const result = calculateTaxFromRate(100, 0.2)
    expect(result.taxAmount).toBe(20)
    expect(result.totalAmount).toBe(120)
  })

  it('zero rate: taxAmount is 0', () => {
    const result = calculateTaxFromRate(100, 0)
    expect(result.taxAmount).toBe(0)
    expect(result.totalAmount).toBe(100)
  })

  it('returns only taxAmount and totalAmount (no extra fields)', () => {
    const result = calculateTaxFromRate(100, 0.1)
    expect(Object.keys(result)).toHaveLength(2)
    expect(result).toHaveProperty('taxAmount')
    expect(result).toHaveProperty('totalAmount')
  })

  it('rounding invariant: result has at most 2 decimal places', () => {
    const result = calculateTaxFromRate(33.33, 0.19)
    const taxDp = String(result.taxAmount).split('.')[1]
    const totalDp = String(result.totalAmount).split('.')[1]
    if (taxDp) expect(taxDp.length).toBeLessThanOrEqual(2)
    if (totalDp) expect(totalDp.length).toBeLessThanOrEqual(2)
  })
})
