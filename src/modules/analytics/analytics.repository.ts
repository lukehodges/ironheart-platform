import { db } from '@/shared/db'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { metricSnapshots } from '@/shared/db/schemas/phase6.schema'
import type { MetricKey, PeriodType } from './analytics.types'

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
  await db
    .delete(metricSnapshots)
    .where(
      and(
        eq(metricSnapshots.tenantId, snapshot.tenantId),
        eq(metricSnapshots.metricKey, snapshot.metricKey),
        eq(metricSnapshots.periodType, snapshot.periodType),
        eq(metricSnapshots.periodStart, snapshot.periodStart)
      )
    )

  await db.insert(metricSnapshots).values({
    tenantId:    snapshot.tenantId,
    metricKey:   snapshot.metricKey,
    dimensions:  snapshot.dimensions,
    periodType:  snapshot.periodType,
    periodStart: snapshot.periodStart,
    value:       String(snapshot.value),
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
