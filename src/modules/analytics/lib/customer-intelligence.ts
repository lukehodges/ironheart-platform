import type { CohortStats } from '../analytics.types'

/**
 * RFM churn scoring model.
 * R = days since last booking (lower = better recency)
 * F = bookings per 90 days (higher = better frequency)
 * M = avg booking value (higher = better monetary)
 *
 * churnRiskScore = normalize(R)*0.5 + (1-normalize(F))*0.3 + (1-normalize(M))*0.2
 * normalize(x) maps x from [cohortMin, cohortMax] → [0, 1], clamped
 */
export function computeChurnScore(
  recencyDays: number,
  frequencyPer90Days: number,
  avgMonetary: number,
  cohort: CohortStats
): number {
  const rNorm = clamp01(normalize(recencyDays,        cohort.minR, cohort.maxR))
  const fNorm = clamp01(normalize(frequencyPer90Days, cohort.minF, cohort.maxF))
  const mNorm = clamp01(normalize(avgMonetary,        cohort.minM, cohort.maxM))

  return rNorm * 0.5 + (1 - fNorm) * 0.3 + (1 - mNorm) * 0.2
}

export function computeChurnLabel(
  score: number,
  lastBookingDaysAgo: number,
  avgFrequencyDays: number
): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score > 0.7 && lastBookingDaysAgo > 2 * avgFrequencyDays) return 'HIGH'
  if (score > 0.4) return 'MEDIUM'
  return 'LOW'
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return (value - min) / (max - min)
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}
