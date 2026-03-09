import type { DailyRevenue, RevenueForecast } from '../analytics.types'

/**
 * Time-series decomposition revenue forecast.
 * No ML dependency - pure math.
 *
 * Algorithm:
 * 1. Compute 4-week moving average (trend)
 * 2. Compute 7 seasonal indices (day-of-week from history)
 * 3. Forecast = trend * seasonal_index
 * 4. Confidence interval = ±1 std dev of historical residuals
 */
export function forecastRevenue(history: DailyRevenue[], forecastDays: number): RevenueForecast[] {
  if (history.length < 14) {
    // Not enough data - return zero-confidence forecast
    return Array.from({ length: forecastDays }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() + i + 1)
      return {
        date:             date.toISOString().split('T')[0]!,
        predictedRevenue: 0,
        lowerBound:       0,
        upperBound:       0,
        basisPoints:      history.length,
      }
    })
  }

  const window    = Math.min(28, Math.floor(history.length / 2)) // 4-week window
  const trend     = movingAverage(history.map((d) => d.revenue), window)
  const seasonal  = computeSeasonalIndices(history, trend)
  const residuals = computeResiduals(history, trend, seasonal)
  const stdDev    = standardDeviation(residuals)

  // Last trend value as the base for projection
  const lastTrend = trend[trend.length - 1] ?? 0

  return Array.from({ length: forecastDays }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i + 1)
    const dayOfWeek = date.getDay()
    const seasonalIdx = seasonal[dayOfWeek] ?? 1
    const predicted   = Math.max(0, lastTrend * seasonalIdx)

    return {
      date:             date.toISOString().split('T')[0]!,
      predictedRevenue: round2(predicted),
      lowerBound:       round2(Math.max(0, predicted - stdDev)),
      upperBound:       round2(predicted + stdDev),
      basisPoints:      history.length,
    }
  })
}

function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return values.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1)
    const slice = values.slice(i - window + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / window
  })
}

function computeSeasonalIndices(history: DailyRevenue[], trend: number[]): number[] {
  const byDay: number[][] = Array.from({ length: 7 }, () => [])

  history.forEach((d, i) => {
    const t = trend[i] ?? 1
    if (t > 0) {
      const dayOfWeek = new Date(d.date).getDay()
      byDay[dayOfWeek]!.push(d.revenue / t)
    }
  })

  return byDay.map((ratios) => {
    if (ratios.length === 0) return 1
    return ratios.reduce((a, b) => a + b, 0) / ratios.length
  })
}

function computeResiduals(history: DailyRevenue[], trend: number[], seasonal: number[]): number[] {
  return history.map((d, i) => {
    const dayOfWeek = new Date(d.date).getDay()
    const t = trend[i] ?? 0
    const s = seasonal[dayOfWeek] ?? 1
    return d.revenue - t * s
  })
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
