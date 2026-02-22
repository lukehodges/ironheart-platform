import { z } from 'zod'
import { logger } from '@/shared/logger'
import { BadRequestError } from '@/shared/errors'
import { moduleRegistry } from '@/shared/module-system/register-all'
import { auditRepository } from './audit.repository'
import type { listAuditLogsSchema, exportCsvSchema } from './audit.schemas'
import type { AuditLogEntry, AuditLogFilters, AuditFilterOptions } from './audit.types'

const log = logger.child({ module: 'audit.service' })

/** Maximum rows allowed for CSV export. */
const MAX_EXPORT_ROWS = 10_000

export const auditService = {
  /**
   * List audit log entries with optional filters and cursor-based pagination.
   */
  async list(
    tenantId: string,
    input: z.infer<typeof listAuditLogsSchema>
  ): Promise<{ rows: AuditLogEntry[]; hasMore: boolean; nextCursor: string | null }> {
    log.info({ tenantId }, 'list')

    const filters: AuditLogFilters = {
      action: input.action,
      resourceType: input.resourceType,
      userId: input.userId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    }

    const { rows, hasMore } = await auditRepository.listAuditLogs(
      tenantId,
      filters,
      input.limit,
      input.cursor
    )

    const nextCursor =
      hasMore && rows.length > 0
        ? rows[rows.length - 1]!.createdAt.toISOString()
        : null

    return { rows, hasMore, nextCursor }
  },

  /**
   * Export audit logs as a CSV string.
   * Limited to MAX_EXPORT_ROWS to prevent runaway exports.
   */
  async exportCsv(
    tenantId: string,
    input: z.infer<typeof exportCsvSchema>
  ): Promise<string> {
    log.info({ tenantId }, 'exportCsv')

    const filters: AuditLogFilters = {
      action: input.action,
      resourceType: input.resourceType,
      userId: input.userId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    }

    // Check row count to guard against excessively large exports
    const count = await auditRepository.countAuditLogs(tenantId, filters)
    if (count > MAX_EXPORT_ROWS) {
      throw new BadRequestError(
        `Export would produce ${count} rows which exceeds the maximum of ${MAX_EXPORT_ROWS}. Please narrow your filters.`
      )
    }

    const rows = await auditRepository.fetchForExport(
      tenantId,
      filters,
      MAX_EXPORT_ROWS
    )

    return formatCsv(rows)
  },

  /**
   * Get available filter options for the audit log UI.
   *
   * Resource types are derived from enabled module manifests' `auditResources`.
   * Historical entries from disabled modules still appear in query results, but
   * disabled modules' resource types won't appear in the filter dropdown.
   */
  getFilterOptions(enabledSlugs: string[]): AuditFilterOptions {
    log.info({ enabledSlugs }, 'getFilterOptions')

    const resourceTypes = moduleRegistry
      .getEnabledManifests(enabledSlugs)
      .flatMap((m) => m.auditResources ?? [])

    return { resourceTypes }
  },
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatCsv(rows: AuditLogEntry[]): string {
  const headers = [
    'id',
    'createdAt',
    'action',
    'entityType',
    'entityId',
    'userId',
    'severity',
    'ipAddress',
    'oldValues',
    'newValues',
    'metadata',
  ]

  const csvRows = rows.map((row) =>
    [
      row.id,
      row.createdAt.toISOString(),
      escapeCsvField(row.action),
      escapeCsvField(row.entityType ?? ''),
      row.entityId ?? '',
      row.userId ?? '',
      row.severity,
      row.ipAddress ?? '',
      escapeCsvField(row.oldValues ? JSON.stringify(row.oldValues) : ''),
      escapeCsvField(row.newValues ? JSON.stringify(row.newValues) : ''),
      escapeCsvField(row.metadata ? JSON.stringify(row.metadata) : ''),
    ].join(',')
  )

  return [headers.join(','), ...csvRows].join('\n')
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
