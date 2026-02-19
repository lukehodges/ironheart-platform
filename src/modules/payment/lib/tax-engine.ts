import type { TaxRule, TaxCalculation } from '../payment.types'

/**
 * Tax calculation engine.
 * Invariant: taxAmount = round(subtotal * rate, 2) ALWAYS
 * Invariant: totalAmount = subtotal + taxAmount ALWAYS (never derived from total)
 * This prevents floating-point rounding drift on read-back.
 */
export function calculateTax(subtotal: number, rule: TaxRule): TaxCalculation {
  const taxAmount   = round2(subtotal * rule.rate)
  const totalAmount = round2(subtotal + taxAmount)

  return {
    subtotal,
    taxAmount,
    totalAmount,
    taxRate:         rule.rate,
    taxName:         rule.name,
    isReverseCharge: rule.isReverseCharge,
  }
}

export function calculateTaxFromRate(subtotal: number, rate: number): { taxAmount: number; totalAmount: number } {
  const taxAmount   = round2(subtotal * rate)
  const totalAmount = round2(subtotal + taxAmount)
  return { taxAmount, totalAmount }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
