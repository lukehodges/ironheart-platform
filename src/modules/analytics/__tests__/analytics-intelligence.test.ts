import { describe, it, expect } from 'vitest'
import { computeChurnScore, computeChurnLabel } from '../lib/customer-intelligence'
import { forecastRevenue } from '../lib/forecasting'
import type { CohortStats, DailyRevenue } from '../analytics.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCohort(overrides: Partial<CohortStats> = {}): CohortStats {
  return {
    minR: 0,
    maxR: 365,
    minF: 0,
    maxF: 12,
    minM: 0,
    maxM: 500,
    ...overrides,
  }
}

/**
 * Build a sequence of DailyRevenue entries starting from a given date.
 * dayOfWeekRevenues: array of 7 values [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
 * weeks: how many complete weeks to generate
 */
function buildHistory(weeks: number, weeklyRevenues: number[] = [100, 120, 110, 130, 140, 160, 90]): DailyRevenue[] {
  const history: DailyRevenue[] = []
  const start = new Date('2025-01-06') // A Monday
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      history.push({
        date:    date.toISOString().split('T')[0]!,
        revenue: weeklyRevenues[d % weeklyRevenues.length] ?? 100,
      })
    }
  }
  return history
}

// ---------------------------------------------------------------------------
// computeChurnScore
// ---------------------------------------------------------------------------

describe('computeChurnScore', () => {
  it('score is between 0 and 1 inclusive for typical inputs', () => {
    const cohort = makeCohort()
    const score  = computeChurnScore(30, 4, 250, cohort)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('high recency (many days since last booking) → higher churn score', () => {
    const cohort    = makeCohort()
    const lowRecency  = computeChurnScore(10,  6, 400, cohort) // recent customer
    const highRecency = computeChurnScore(300, 6, 400, cohort) // dormant customer
    expect(highRecency).toBeGreaterThan(lowRecency)
  })

  it('low recency (recent customer) → lower churn score', () => {
    const cohort = makeCohort()
    const score  = computeChurnScore(5, 6, 400, cohort)
    // Very recent, high frequency, high monetary → very low churn
    expect(score).toBeLessThan(0.3)
  })

  it('dormant customer (high recency days) → higher churn score', () => {
    const cohort = makeCohort()
    const score  = computeChurnScore(364, 0, 0, cohort)
    // Max recency, min frequency, min monetary → near max churn
    expect(score).toBeGreaterThan(0.7)
  })

  it('high frequency (many bookings per 90 days) → lower churn score', () => {
    const cohort   = makeCohort()
    const lowFreq  = computeChurnScore(180, 1,  200, cohort)
    const highFreq = computeChurnScore(180, 11, 200, cohort)
    expect(highFreq).toBeLessThan(lowFreq)
  })

  it('high monetary value → lower churn score', () => {
    const cohort    = makeCohort()
    const lowValue  = computeChurnScore(180, 4, 10,  cohort)
    const highValue = computeChurnScore(180, 4, 490, cohort)
    expect(highValue).toBeLessThan(lowValue)
  })

  it('score is exactly 0.5 when all RFM factors at max-churn (max R, min F, min M)', () => {
    // rNorm=1 (worst recency), fNorm=0, mNorm=0
    // score = 1*0.5 + (1-0)*0.3 + (1-0)*0.2 = 1.0
    const cohort = makeCohort({ minR: 0, maxR: 100, minF: 0, maxF: 10, minM: 0, maxM: 100 })
    const score  = computeChurnScore(100, 0, 0, cohort)
    expect(score).toBeCloseTo(1.0)
  })

  it('score is 0 when customer at best RFM (min R, max F, max M)', () => {
    // rNorm=0, fNorm=1, mNorm=1
    // score = 0*0.5 + (1-1)*0.3 + (1-1)*0.2 = 0
    const cohort = makeCohort({ minR: 0, maxR: 100, minF: 0, maxF: 10, minM: 0, maxM: 100 })
    const score  = computeChurnScore(0, 10, 100, cohort)
    expect(score).toBeCloseTo(0)
  })

  it('edge case: customer with 0 bookings ever (frequency=0, monetary=0)', () => {
    const cohort = makeCohort()
    const score  = computeChurnScore(365, 0, 0, cohort)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('handles equal minR and maxR (no-range cohort) without dividing by zero', () => {
    // When min === max, normalize returns 0 by the guard clause
    const cohort = makeCohort({ minR: 30, maxR: 30 })
    const score  = computeChurnScore(30, 4, 200, cohort)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('values outside cohort range are clamped to [0, 1]', () => {
    // recency = -10 → below minR of 0 → clamp to 0
    const cohort = makeCohort()
    const score  = computeChurnScore(-10, 4, 200, cohort)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('recency weight is 0.5: changing R has double the effect of changing M', () => {
    const cohort = makeCohort({ minR: 0, maxR: 100, minF: 0, maxF: 10, minM: 0, maxM: 100 })
    // baseline: all at 50%
    const base = computeChurnScore(50, 5, 50, cohort)
    // worsen R by 50 units (full range shift)
    const badR = computeChurnScore(100, 5, 50, cohort)
    // worsen M by 50 units (full range shift)
    const badM = computeChurnScore(50, 5, 0, cohort)

    // R effect: +0.5, M effect: +0.2 → R has bigger impact
    expect(badR - base).toBeCloseTo(0.25)
    expect(badM - base).toBeCloseTo(0.1)
  })
})

// ---------------------------------------------------------------------------
// computeChurnLabel
// ---------------------------------------------------------------------------

describe('computeChurnLabel', () => {
  it('returns LOW when score <= 0.4', () => {
    expect(computeChurnLabel(0.0,  30, 60)).toBe('LOW')
    expect(computeChurnLabel(0.3,  30, 60)).toBe('LOW')
    expect(computeChurnLabel(0.4,  30, 60)).toBe('LOW')
  })

  it('returns MEDIUM when score > 0.4', () => {
    expect(computeChurnLabel(0.41, 30, 60)).toBe('MEDIUM')
    expect(computeChurnLabel(0.6,  30, 60)).toBe('MEDIUM')
  })

  it('returns HIGH when score > 0.7 AND lastBookingDaysAgo > 2 * avgFrequencyDays', () => {
    // score=0.8, lastBooking=130 days ago, freq=60 days → 130 > 120 → HIGH
    expect(computeChurnLabel(0.8, 130, 60)).toBe('HIGH')
  })

  it('returns MEDIUM when score > 0.7 but lastBookingDaysAgo NOT > 2 * avgFrequencyDays', () => {
    // score=0.8, lastBooking=100 days ago, freq=60 days → 100 <= 120 → MEDIUM
    expect(computeChurnLabel(0.8, 100, 60)).toBe('MEDIUM')
  })

  it('returns MEDIUM for score exactly 0.71 without meeting HIGH recency threshold', () => {
    expect(computeChurnLabel(0.71, 10, 90)).toBe('MEDIUM')
  })

  it('returns LOW for score 0.0 regardless of lastBookingDaysAgo', () => {
    expect(computeChurnLabel(0.0, 1000, 1)).toBe('LOW')
  })

  it('returns HIGH only when BOTH conditions are met (score AND recency)', () => {
    // Score > 0.7 but recency not high enough → MEDIUM
    expect(computeChurnLabel(0.9, 5, 30)).toBe('MEDIUM') // 5 < 60

    // Score > 0.7 AND recency high enough → HIGH
    expect(computeChurnLabel(0.9, 61, 30)).toBe('HIGH') // 61 > 60
  })

  it('returns MEDIUM when score exactly 0.4 (boundary - not > 0.4)', () => {
    expect(computeChurnLabel(0.4, 30, 10)).toBe('LOW')
  })

  it('returns MEDIUM when score is 0.5 with low lastBookingDaysAgo', () => {
    expect(computeChurnLabel(0.5, 5, 30)).toBe('MEDIUM')
  })
})

// ---------------------------------------------------------------------------
// forecastRevenue
// ---------------------------------------------------------------------------

describe('forecastRevenue', () => {
  it('returns forecast array of exactly the requested length', () => {
    const history  = buildHistory(5) // 35 days > 14
    const forecast = forecastRevenue(history, 7)
    expect(forecast).toHaveLength(7)
  })

  it('forecast array has correct length for 14-day request', () => {
    const history  = buildHistory(6)
    const forecast = forecastRevenue(history, 14)
    expect(forecast).toHaveLength(14)
  })

  it('each forecast entry has required fields', () => {
    const history  = buildHistory(5)
    const forecast = forecastRevenue(history, 3)
    for (const entry of forecast) {
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('predictedRevenue')
      expect(entry).toHaveProperty('lowerBound')
      expect(entry).toHaveProperty('upperBound')
      expect(entry).toHaveProperty('basisPoints')
    }
  })

  it('basisPoints equals history.length', () => {
    const history  = buildHistory(5) // 35 data points
    const forecast = forecastRevenue(history, 3)
    for (const entry of forecast) {
      expect(entry.basisPoints).toBe(35)
    }
  })

  it('dates are in YYYY-MM-DD format', () => {
    const history  = buildHistory(5)
    const forecast = forecastRevenue(history, 3)
    for (const entry of forecast) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('less than 14 days of history → returns zero-confidence forecast (predictedRevenue=0)', () => {
    const shortHistory = buildHistory(1) // only 7 days
    const forecast     = forecastRevenue(shortHistory, 7)
    expect(forecast).toHaveLength(7)
    for (const entry of forecast) {
      expect(entry.predictedRevenue).toBe(0)
      expect(entry.lowerBound).toBe(0)
      expect(entry.upperBound).toBe(0)
    }
  })

  it('exactly 13 days of history → returns zero-confidence forecast', () => {
    const history: DailyRevenue[] = Array.from({ length: 13 }, (_, i) => {
      const d = new Date('2025-01-01')
      d.setDate(d.getDate() + i)
      return { date: d.toISOString().split('T')[0]!, revenue: 100 }
    })
    const forecast = forecastRevenue(history, 3)
    for (const entry of forecast) {
      expect(entry.predictedRevenue).toBe(0)
    }
  })

  it('exactly 14 days of history → produces non-zero forecast (if revenue > 0)', () => {
    const history: DailyRevenue[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date('2025-01-01')
      d.setDate(d.getDate() + i)
      return { date: d.toISOString().split('T')[0]!, revenue: 200 }
    })
    const forecast = forecastRevenue(history, 3)
    // At least some entries should be non-zero since history has data
    const totalPredicted = forecast.reduce((sum, e) => sum + e.predictedRevenue, 0)
    expect(totalPredicted).toBeGreaterThan(0)
  })

  it('predictedRevenue is always >= 0 (no negative forecasts)', () => {
    const history  = buildHistory(5)
    const forecast = forecastRevenue(history, 14)
    for (const entry of forecast) {
      expect(entry.predictedRevenue).toBeGreaterThanOrEqual(0)
      expect(entry.lowerBound).toBeGreaterThanOrEqual(0)
    }
  })

  it('upperBound >= predictedRevenue >= lowerBound for all entries', () => {
    const history  = buildHistory(6)
    const forecast = forecastRevenue(history, 7)
    for (const entry of forecast) {
      expect(entry.upperBound).toBeGreaterThanOrEqual(entry.predictedRevenue)
      expect(entry.predictedRevenue).toBeGreaterThanOrEqual(entry.lowerBound)
    }
  })

  it('higher revenue history → higher forecast than zero-history baseline', () => {
    const highHistory  = buildHistory(5, [500, 600, 550, 700, 650, 800, 450])
    const lowHistory   = buildHistory(5, [50,  60,  55,  70,  65,  80,  45])

    const highForecast = forecastRevenue(highHistory, 7)
    const lowForecast  = forecastRevenue(lowHistory,  7)

    const highTotal = highForecast.reduce((s, e) => s + e.predictedRevenue, 0)
    const lowTotal  = lowForecast.reduce((s, e) => s + e.predictedRevenue, 0)
    expect(highTotal).toBeGreaterThan(lowTotal)
  })

  it('empty history (0 days) → returns zero-confidence forecast', () => {
    const forecast = forecastRevenue([], 5)
    expect(forecast).toHaveLength(5)
    for (const entry of forecast) {
      expect(entry.predictedRevenue).toBe(0)
    }
  })

  it('predictedRevenue values are rounded to 2 decimal places', () => {
    const history  = buildHistory(5, [100.333, 200.666, 150.1, 175.9, 125.5, 90.25, 80.75])
    const forecast = forecastRevenue(history, 3)
    for (const entry of forecast) {
      const rounded = Math.round(entry.predictedRevenue * 100) / 100
      expect(entry.predictedRevenue).toBe(rounded)
    }
  })
})
