import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'
import { logger } from '@/shared/logger'
import { eq, and, lte, gte, desc, sql } from 'drizzle-orm'
import type { AuditLogEntry, AuditLogFilters } from './audit.types'

const log = logger.child({ module: 'audit.repository' })

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapAuditLog(row: typeof auditLogs.$inferSelect): AuditLogEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId ?? null,
    action: row.action,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    oldValues: (row.oldValues as Record<string, unknown> | null) ?? null,
    newValues: (row.newValues as Record<string, unknown> | null) ?? null,
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
    sessionId: row.sessionId ?? null,
    requestId: row.requestId ?? null,
    severity: row.severity,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConditions(tenantId: string, filters: AuditLogFilters) {
  const conditions = [eq(auditLogs.tenantId, tenantId)]

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action))
  }
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.entityType, filters.resourceType))
  }
  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId))
  }
  if (filters.dateFrom) {
    conditions.push(gte(auditLogs.createdAt, filters.dateFrom))
  }
  if (filters.dateTo) {
    conditions.push(lte(auditLogs.createdAt, filters.dateTo))
  }

  return conditions
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const auditRepository = {
  /**
   * List audit logs with cursor-based pagination.
   * Returns `limit` rows + hasMore flag via fetch limit+1 pattern.
   */
  async listAuditLogs(
    tenantId: string,
    filters: AuditLogFilters,
    limit: number,
    cursor?: string
  ): Promise<{ rows: AuditLogEntry[]; hasMore: boolean }> {
    log.info({ tenantId, filters, limit, cursor }, 'listAuditLogs')

    const conditions = buildConditions(tenantId, filters)

    if (cursor) {
      conditions.push(lte(auditLogs.createdAt, new Date(cursor)))
    }

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    return {
      rows: (hasMore ? rows.slice(0, limit) : rows).map(mapAuditLog),
      hasMore,
    }
  },

  /**
   * Count audit logs matching the given filters.
   * Used to guard export operations against excessively large result sets.
   */
  async countAuditLogs(
    tenantId: string,
    filters: AuditLogFilters
  ): Promise<number> {
    log.info({ tenantId, filters }, 'countAuditLogs')

    const conditions = buildConditions(tenantId, filters)

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(...conditions))

    return result?.count ?? 0
  },

  /**
   * Fetch audit logs for CSV export (up to maxRows).
   * Returns rows ordered by createdAt descending.
   */
  async fetchForExport(
    tenantId: string,
    filters: AuditLogFilters,
    maxRows: number
  ): Promise<AuditLogEntry[]> {
    log.info({ tenantId, filters, maxRows }, 'fetchForExport')

    const conditions = buildConditions(tenantId, filters)

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(maxRows)

    return rows.map(mapAuditLog)
  },
}
