export type MetricKey =
  | 'bookings.created'
  | 'bookings.confirmed'
  | 'bookings.cancelled'
  | 'bookings.completed'
  | 'bookings.no_show'
  | 'bookings.lead_time_avg'
  | 'revenue.gross'
  | 'revenue.net'
  | 'revenue.outstanding'
  | 'revenue.refunded'
  | 'customers.new'
  | 'customers.returning'
  | 'customers.ltv_avg'
  | 'reviews.rating_avg'
  | 'reviews.response_rate'
  | 'forms.completion_rate'
  | 'workflows.executions'
  | 'staff.utilisation'

export type PeriodType = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'

export interface MetricSnapshotRecord {
  id: string
  tenantId: string
  metricKey: MetricKey
  dimensions: Record<string, string>
  periodType: PeriodType
  periodStart: Date
  value: number
  createdAt: Date
}

export interface CohortStats {
  minR: number
  maxR: number
  minF: number
  maxF: number
  minM: number
  maxM: number
}

export interface CustomerInsights {
  customerId: string
  ltv: number
  avgBookingValue: number
  bookingFrequencyDays: number
  lastBookingDaysAgo: number
  noShowRate: number
  churnRiskScore: number          // 0–1 (RFM model)
  churnRiskLabel: 'LOW' | 'MEDIUM' | 'HIGH'
  nextPredictedBookingDate: Date | null
}

export interface DailyRevenue {
  date: string   // YYYY-MM-DD
  revenue: number
}

export interface RevenueForecast {
  date: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
  basisPoints: number   // number of historical data points used
}

export interface MetricSummary {
  period: string
  bookings: { created: number; confirmed: number; cancelled: number; completed: number; noShow: number }
  revenue: { gross: number; net: number; outstanding: number }
  customers: { new: number; returning: number; ltvAvg: number }
  reviews: { ratingAvg: number; responseRate: number }
  staffUtilisation: number
}
