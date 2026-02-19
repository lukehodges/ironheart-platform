import type { PricingRule, PricingContext, ModifierType } from '../payment.types'

/**
 * Evaluates pricing rules in sortOrder ASC; first matching rule wins.
 * Uses the same condition structure as WorkflowConditionGroup.
 */
export function applyPricingRules(rules: PricingRule[], ctx: PricingContext): number {
  const now = new Date()
  const sorted = [...rules].sort((a, b) => a.sortOrder - b.sortOrder)

  for (const rule of sorted) {
    if (!rule.enabled) continue
    if (rule.maxUses !== null && rule.currentUses >= rule.maxUses) continue
    if (rule.validFrom && now < rule.validFrom) continue
    if (rule.validUntil && now > rule.validUntil) continue
    if (rule.serviceIds?.length && !rule.serviceIds.includes(ctx.booking.serviceId)) continue

    if (matchesConditions(rule.conditions, ctx)) {
      return applyModifier(ctx.basePrice, rule.modifierType, rule.modifierValue)
    }
  }

  return ctx.basePrice
}

function matchesConditions(
  group: PricingRule['conditions'],
  ctx: PricingContext
): boolean {
  const fieldValues: Record<string, unknown> = {
    'booking.dayOfWeek':      ctx.booking.dayOfWeek,
    'booking.timeOfDay':      ctx.booking.timeOfDay,
    'booking.advanceDays':    ctx.booking.advanceDays,
    'booking.serviceId':      ctx.booking.serviceId,
    'customer.bookingCount':  ctx.customer.bookingCount,
  }

  const condResults = group.conditions.map((c) => {
    const val = fieldValues[c.field]
    return evaluateCondition(val, c.operator, c.value)
  })

  const groupResults = (group.groups ?? []).map((g) => matchesConditions(g, ctx))
  const allResults = [...condResults, ...groupResults]

  if (allResults.length === 0) return true
  return group.logic === 'AND'
    ? allResults.every(Boolean)
    : allResults.some(Boolean)
}

function evaluateCondition(fieldValue: unknown, operator: string, ruleValue: unknown): boolean {
  const fv = Number(fieldValue)
  const rv = Number(ruleValue)

  switch (operator) {
    case 'eq':  case '==': return fieldValue == ruleValue
    case 'neq': case '!=': return fieldValue != ruleValue
    case 'gt':  case '>':  return fv > rv
    case 'gte': case '>=': return fv >= rv
    case 'lt':  case '<':  return fv < rv
    case 'lte': case '<=': return fv <= rv
    case 'in':  return Array.isArray(ruleValue) && ruleValue.includes(fieldValue)
    case 'not_in': return Array.isArray(ruleValue) && !ruleValue.includes(fieldValue)
    default: return false
  }
}

function applyModifier(price: number, type: ModifierType, value: number): number {
  switch (type) {
    case 'FIXED_PRICE':       return value
    case 'FIXED_DISCOUNT':    return Math.max(0, round2(price - value))
    case 'PERCENT_DISCOUNT':  return round2(price * (1 - value / 100))
    case 'FIXED_SURCHARGE':   return round2(price + value)
    case 'PERCENT_SURCHARGE': return round2(price * (1 + value / 100))
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
