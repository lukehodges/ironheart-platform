import { db } from '@/shared/db'
import { auditLogs, users } from '@/shared/db/schema'
import { logger } from '@/shared/logger'
import { eq, and, lte, gte, desc, sql } from 'drizzle-orm'
import type { AuditLogEntry, AuditLogFilters } from './audit.types'

const log = logger.child({ module: 'audit.repository' })

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapAuditLog(row: {
  auditLog: typeof auditLogs.$inferSelect
  user: typeof users.$inferSelect | null
}): AuditLogEntry {
  const { auditLog, user } = row
  return {
    id: auditLog.id,
    tenantId: auditLog.tenantId,
    userId: auditLog.userId ?? null,
    action: auditLog.action,
    entityType: auditLog.entityType ?? null,
    entityId: auditLog.entityId ?? null,
    oldValues: (auditLog.oldValues as Record<string, unknown> | null) ?? null,
    newValues: (auditLog.newValues as Record<string, unknown> | null) ?? null,
    ipAddress: auditLog.ipAddress ?? null,
    userAgent: auditLog.userAgent ?? null,
    sessionId: auditLog.sessionId ?? null,
    requestId: auditLog.requestId ?? null,
    severity: auditLog.severity,
    metadata: (auditLog.metadata as Record<string, unknown> | null) ?? null,
    createdAt: auditLog.createdAt,
    actor: user
      ? {
          id: user.id,
          name: user.displayName ?? `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
        }
      : {
          id: auditLog.userId ?? 'system',
          name: 'System',
          email: '',
        },
    resourceName: (auditLog.metadata as any)?.resourceName ?? '',
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
      .select({ auditLog: auditLogs, user: users })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
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
      .select({ auditLog: auditLogs, user: users })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(maxRows)

    return rows.map(mapAuditLog)
  },
}
