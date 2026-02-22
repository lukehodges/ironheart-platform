import { db } from '@/shared/db'
import { and, eq, gte, lte, sql, count, avg, sum, min, max, isNull, desc } from 'drizzle-orm'
import { metricSnapshots } from '@/shared/db/schemas/phase6.schema'
import { bookings } from '@/shared/db/schemas/booking.schema'
import { payments, invoices, reviews } from '@/shared/db/schemas/shared.schema'
import { customers } from '@/shared/db/schemas/customer.schema'
import { services } from '@/shared/db/schemas/services.schema'
import { users } from '@/shared/db/schemas/auth.schema'
import type { CohortStats, MetricKey, PeriodType } from './analytics.types'

export async function getTimeSeriesMetric(params: {
  tenantId: string
  metricKey: MetricKey
  periodType: PeriodType
  from: Date
  to: Date
  dimensions?: Record<string, string>
}) {
  return db
    .select()
    .from(metricSnapshots)
    .where(
      and(
        eq(metricSnapshots.tenantId, params.tenantId),
        eq(metricSnapshots.metricKey, params.metricKey),
        eq(metricSnapshots.periodType, params.periodType),
        gte(metricSnapshots.periodStart, params.from),
        lte(metricSnapshots.periodStart, params.to)
      )
    )
    .orderBy(metricSnapshots.periodStart)
}

export async function upsertSnapshot(snapshot: {
  tenantId: string
  metricKey: string
  dimensions: Record<string, string>
  periodType: string
  periodStart: Date
  value: number
}) {
  // metricSnapshots has no unique constraint — delete-then-insert to achieve upsert semantics
  // Wrapped in a transaction for atomicity (U5.10)
  await db.transaction(async (tx) => {
    await tx
      .delete(metricSnapshots)
      .where(
        and(
          eq(metricSnapshots.tenantId, snapshot.tenantId),
          eq(metricSnapshots.metricKey, snapshot.metricKey),
          eq(metricSnapshots.periodType, snapshot.periodType),
          eq(metricSnapshots.periodStart, snapshot.periodStart)
        )
      )

    await tx.insert(metricSnapshots).values({
      tenantId:    snapshot.tenantId,
      metricKey:   snapshot.metricKey,
      dimensions:  snapshot.dimensions,
      periodType:  snapshot.periodType,
      periodStart: snapshot.periodStart,
      value:       String(snapshot.value),
    })
  })
}

export async function getLatestSnapshotAge(tenantId: string): Promise<number | null> {
  const [row] = await db
    .select({ createdAt: metricSnapshots.createdAt })
    .from(metricSnapshots)
    .where(eq(metricSnapshots.tenantId, tenantId))
    .orderBy(sql`${metricSnapshots.createdAt} DESC`)
    .limit(1)

  if (!row) return null
  return Date.now() - row.createdAt.getTime()
}

// ---------------------------------------------------------------------------
// Summary aggregation queries
// ---------------------------------------------------------------------------

export async function getBookingCounts(tenantId: string, periodStart: Date) {
  const rows = await db
    .select({
      status: bookings.status,
      total: count(),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.createdAt, periodStart)
      )
    )
    .groupBy(bookings.status)

  const result = { created: 0, confirmed: 0, cancelled: 0, completed: 0, noShow: 0 }
  let totalCreated = 0

  for (const row of rows) {
    const n = Number(row.total)
    totalCreated += n
    switch (row.status) {
      case 'CONFIRMED':   result.confirmed  += n; break
      case 'CANCELLED':   result.cancelled  += n; break
      case 'COMPLETED':   result.completed  += n; break
      case 'NO_SHOW':     result.noShow     += n; break
    }
  }

  result.created = totalCreated
  return result
}

export async function getRevenueTotal(tenantId: string, periodStart: Date): Promise<number> {
  const [row] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.status, 'COMPLETED'),
        eq(payments.type, 'PAYMENT'),
        gte(payments.createdAt, periodStart)
      )
    )

  return row?.total ? parseFloat(row.total) : 0
}

export async function getOutstandingTotal(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(invoices.amountDue) })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        sql`${invoices.status} IN ('SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID')`
      )
    )

  return row?.total ? parseFloat(row.total) : 0
}

export async function getCustomerCount(tenantId: string, periodStart: Date): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(customers)
    .where(
      and(
        eq(customers.tenantId, tenantId),
        gte(customers.createdAt, periodStart),
        isNull(customers.deletedAt)
      )
    )

  return row?.total ? Number(row.total) : 0
}

export async function getAverageRating(tenantId: string, periodStart: Date): Promise<number> {
  const [row] = await db
    .select({ avgRating: avg(reviews.rating) })
    .from(reviews)
    .where(
      and(
        eq(reviews.tenantId, tenantId),
        gte(reviews.createdAt, periodStart),
        isNull(reviews.deletedAt)
      )
    )

  return row?.avgRating ? parseFloat(parseFloat(row.avgRating).toFixed(2)) : 0
}

// ---------------------------------------------------------------------------
// Customer booking stats (for getCustomerInsights)
// ---------------------------------------------------------------------------

export interface CustomerBookingStats {
  totalBookings: number
  completedBookings: number
  noShowBookings: number
  totalSpent: number
  firstBookingDate: Date | null
  lastBookingDate: Date | null
  scheduledDates: Date[]
}

/**
 * Fetch booking-level stats for a single customer within a tenant.
 * Returns counts, revenue, first/last dates, and all scheduled dates
 * (needed to compute average interval between bookings).
 */
export async function getCustomerBookingStats(
  tenantId: string,
  customerId: string
): Promise<CustomerBookingStats> {
  // Aggregate counts + date range from bookings
  const [agg] = await db
    .select({
      totalBookings:     count(),
      completedBookings: sql<number>`count(*) filter (where ${bookings.status} = 'COMPLETED')`,
      noShowBookings:    sql<number>`count(*) filter (where ${bookings.status} = 'NO_SHOW')`,
      firstBookingDate:  min(bookings.scheduledDate),
      lastBookingDate:   max(bookings.scheduledDate),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.customerId, customerId)
      )
    )

  // Total spent: sum of completed payments for this customer
  const [paymentAgg] = await db
    .select({ totalSpent: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.customerId, customerId),
        eq(payments.status, 'COMPLETED'),
        eq(payments.type, 'PAYMENT')
      )
    )

  // Fetch all scheduled dates (sorted) for interval computation
  // Exclude cancelled/rejected bookings from interval calculation
  const dateRows = await db
    .select({ scheduledDate: bookings.scheduledDate })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.customerId, customerId),
        sql`${bookings.status} NOT IN ('CANCELLED', 'REJECTED')`
      )
    )
    .orderBy(bookings.scheduledDate)

  return {
    totalBookings:     Number(agg?.totalBookings ?? 0),
    completedBookings: Number(agg?.completedBookings ?? 0),
    noShowBookings:    Number(agg?.noShowBookings ?? 0),
    totalSpent:        paymentAgg?.totalSpent ? parseFloat(paymentAgg.totalSpent) : 0,
    firstBookingDate:  agg?.firstBookingDate ? new Date(agg.firstBookingDate) : null,
    lastBookingDate:   agg?.lastBookingDate ? new Date(agg.lastBookingDate) : null,
    scheduledDates:    dateRows.map((r) => new Date(r.scheduledDate)),
  }
}

/**
 * Compute RFM cohort stats (min/max for R, F, M) across all customers
 * in a tenant who have at least one booking. Used to normalize individual
 * customer scores against the tenant's full customer base.
 */
export async function getTenantCohortStats(tenantId: string): Promise<CohortStats> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Per-customer: last booking date + total bookings
  const customerRows = await db
    .select({
      customerId:    bookings.customerId,
      lastDate:      max(bookings.scheduledDate),
      totalBookings: count(),
    })
    .from(bookings)
    .where(eq(bookings.tenantId, tenantId))
    .groupBy(bookings.customerId)

  if (customerRows.length === 0) {
    // No bookings at all — return sensible defaults
    return { minR: 0, maxR: 365, minF: 0, maxF: 12, minM: 0, maxM: 500 }
  }

  // Recency: days since last booking per customer
  const recencies = customerRows.map((r) => {
    const lastDate = r.lastDate ? new Date(r.lastDate) : now
    return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  })

  // Frequency: count of bookings in last 90 days per customer
  const freqRows = await db
    .select({
      customerId: bookings.customerId,
      freq:       count(),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.scheduledDate, ninetyDaysAgo)
      )
    )
    .groupBy(bookings.customerId)

  const freqMap = new Map(freqRows.map((r) => [r.customerId, Number(r.freq)]))

  // Monetary: average completed-payment amount per customer
  const monRows = await db
    .select({
      customerId: payments.customerId,
      avgAmount:  avg(payments.amount),
    })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.status, 'COMPLETED'),
        eq(payments.type, 'PAYMENT')
      )
    )
    .groupBy(payments.customerId)

  const monMap = new Map(monRows.map((r) => [r.customerId, r.avgAmount ? parseFloat(r.avgAmount) : 0]))

  const customerIds = customerRows.map((r) => r.customerId)
  const frequencies = customerIds.map((id) => freqMap.get(id) ?? 0)
  const monetaries = customerIds.map((id) => monMap.get(id) ?? 0)

  return {
    minR: Math.min(...recencies),
    maxR: Math.max(...recencies),
    minF: Math.min(...frequencies),
    maxF: Math.max(...frequencies),
    minM: Math.min(...monetaries),
    maxM: Math.max(...monetaries),
  }
}

// ---------------------------------------------------------------------------
// Revenue chart — time series data grouped by date bucket
// ---------------------------------------------------------------------------

export async function getRevenueChart(
  tenantId: string,
  from: Date,
  to: Date,
  periodType: 'DAY' | 'WEEK' | 'MONTH'
): Promise<Array<{ date: string; value: number }>> {
  const truncExpr =
    periodType === 'DAY'   ? sql`date_trunc('day', ${payments.createdAt})`   :
    periodType === 'WEEK'  ? sql`date_trunc('week', ${payments.createdAt})`  :
                             sql`date_trunc('month', ${payments.createdAt})`

  const rows = await db
    .select({
      dateBucket: sql<string>`${truncExpr}::text`.as('date_bucket'),
      total: sum(payments.amount),
    })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.status, 'COMPLETED'),
        eq(payments.type, 'PAYMENT'),
        gte(payments.createdAt, from),
        lte(payments.createdAt, to)
      )
    )
    .groupBy(sql`date_bucket`)
    .orderBy(sql`date_bucket`)

  return rows.map((r) => ({
    date:  r.dateBucket ? r.dateBucket.split(' ')[0]! : '',
    value: r.total ? parseFloat(r.total) : 0,
  }))
}

// ---------------------------------------------------------------------------
// Bookings by status — status distribution for donut chart
// ---------------------------------------------------------------------------

export async function getBookingsByStatus(
  tenantId: string,
  from?: Date,
  to?: Date
): Promise<Array<{ status: string; count: number }>> {
  const conditions = [eq(bookings.tenantId, tenantId)]
  if (from) conditions.push(gte(bookings.createdAt, from))
  if (to) conditions.push(lte(bookings.createdAt, to))

  const rows = await db
    .select({
      status: bookings.status,
      total: count(),
    })
    .from(bookings)
    .where(and(...conditions))
    .groupBy(bookings.status)

  return rows.map((r) => ({
    status: r.status,
    count:  Number(r.total),
  }))
}

// ---------------------------------------------------------------------------
// Top services — ranked by booking count
// ---------------------------------------------------------------------------

export async function getTopServices(
  tenantId: string,
  limit: number,
  from?: Date,
  to?: Date
): Promise<Array<{ serviceId: string; serviceName: string; bookingCount: number; revenue: number }>> {
  const conditions = [eq(bookings.tenantId, tenantId)]
  if (from) conditions.push(gte(bookings.createdAt, from))
  if (to) conditions.push(lte(bookings.createdAt, to))

  const rows = await db
    .select({
      serviceId:    bookings.serviceId,
      serviceName:  services.name,
      bookingCount: count(),
      revenue:      sum(bookings.totalAmount),
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(...conditions))
    .groupBy(bookings.serviceId, services.name)
    .orderBy(desc(count()))
    .limit(limit)

  return rows.map((r) => ({
    serviceId:    r.serviceId,
    serviceName:  r.serviceName,
    bookingCount: Number(r.bookingCount),
    revenue:      r.revenue ? parseFloat(r.revenue) : 0,
  }))
}

// ---------------------------------------------------------------------------
// Staff utilization — booking count + hours per staff member
// ---------------------------------------------------------------------------

export async function getStaffUtilization(
  tenantId: string,
  from?: Date,
  to?: Date
): Promise<Array<{ staffId: string; staffName: string; bookingCount: number; hoursBooked: number }>> {
  const conditions = [
    eq(bookings.tenantId, tenantId),
    sql`${bookings.staffId} IS NOT NULL`,
  ]
  if (from) conditions.push(gte(bookings.createdAt, from))
  if (to) conditions.push(lte(bookings.createdAt, to))

  const rows = await db
    .select({
      staffId:      bookings.staffId,
      firstName:    users.firstName,
      lastName:     users.lastName,
      bookingCount: count(),
      totalMinutes: sum(bookings.durationMinutes),
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.staffId, users.id))
    .where(and(...conditions))
    .groupBy(bookings.staffId, users.firstName, users.lastName)
    .orderBy(desc(count()))

  return rows.map((r) => ({
    staffId:      r.staffId!,
    staffName:    `${r.firstName} ${r.lastName}`,
    bookingCount: Number(r.bookingCount),
    hoursBooked:  r.totalMinutes ? Math.round((parseFloat(r.totalMinutes) / 60) * 100) / 100 : 0,
  }))
}

// ---------------------------------------------------------------------------
// Churn risk — customers with overdue booking intervals
// ---------------------------------------------------------------------------

export interface ChurnRiskCustomer {
  customerId: string
  customerName: string
  lastBooking: Date | null
  avgInterval: number
  scheduledDates: Date[]
}

export async function getChurnRiskCandidates(
  tenantId: string,
  limit: number
): Promise<ChurnRiskCustomer[]> {
  // Get all customers with at least 2 bookings (need >= 2 to compute interval)
  const customerRows = await db
    .select({
      customerId:  bookings.customerId,
      firstName:   customers.firstName,
      lastName:    customers.lastName,
      lastBooking: max(bookings.scheduledDate),
      bookingCount: count(),
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        isNull(customers.deletedAt),
        sql`${bookings.status} NOT IN ('CANCELLED', 'REJECTED')`
      )
    )
    .groupBy(bookings.customerId, customers.firstName, customers.lastName)
    .having(sql`count(*) >= 2`)

  // For each candidate, fetch their scheduled dates to compute interval
  const results: ChurnRiskCustomer[] = []

  for (const row of customerRows) {
    const dateRows = await db
      .select({ scheduledDate: bookings.scheduledDate })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.customerId, row.customerId),
          sql`${bookings.status} NOT IN ('CANCELLED', 'REJECTED')`
        )
      )
      .orderBy(bookings.scheduledDate)

    results.push({
      customerId:    row.customerId,
      customerName:  `${row.firstName} ${row.lastName}`,
      lastBooking:   row.lastBooking ? new Date(row.lastBooking) : null,
      avgInterval:   0, // computed in service layer
      scheduledDates: dateRows.map((r) => new Date(r.scheduledDate)),
    })
  }

  return results
}
