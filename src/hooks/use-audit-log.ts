'use client'

import { api } from '@/lib/trpc/react'
import { useState, useMemo, useCallback } from 'react'
import type { AuditLogFilters } from '@/types/audit-log'

// TODO: Wire to audit.list when audit module (U4.2) is built

/**
 * Audit log hook
 *
 * Manages audit log entries with cursor-based pagination and filtering.
 * Currently wired to platform.getAuditLog as an interim solution.
 *
 * @returns Object containing audit log entries, pagination state, filters, and mutations
 *
 * @example
 * ```tsx
 * const audit = useAuditLog()
 *
 * return (
 *   <>
 *     {audit.isLoading && <Skeleton />}
 *     {audit.entries.map(entry => (
 *       <AuditEntry key={entry.id} entry={entry} />
 *     ))}
 *     {audit.hasMore && (
 *       <button onClick={audit.loadMore}>Load More</button>
 *     )}
 *   </>
 * )
 * ```
 */
export function useAuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [cursor, setCursor] = useState<string | undefined>()
  const [allEntries, setAllEntries] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // Map the AuditLogFilters to the platform.getAuditLog input shape
  const queryInput = useMemo(
    () => ({
      action: filters.action,
      entityType: filters.resourceType,
      limit: 50,
      cursor,
    }),
    [filters.action, filters.resourceType, cursor],
  )

  const { data, isLoading, error } = api.platform.getAuditLog.useQuery(queryInput, {
    // When we get data back, accumulate entries for cursor-based pagination
    placeholderData: (prev) => prev,
  })

  // Accumulate entries from paginated responses
  const entries = useMemo(() => {
    if (!data?.rows) return allEntries
    if (!cursor) {
      // First page — replace all
      return data.rows
    }
    // Subsequent pages — merge (deduplicate by id)
    const existingIds = new Set(allEntries.map((e) => e.id))
    const newEntries = data.rows.filter((e: any) => !existingIds.has(e.id))
    return [...allEntries, ...newEntries]
  }, [data?.rows, cursor, allEntries])

  const hasMore = data?.hasMore ?? false

  const loadMore = useCallback(() => {
    if (!data?.rows || data.rows.length === 0) return
    const lastEntry = data.rows[data.rows.length - 1]
    if (!lastEntry) return
    // Save current entries before loading more
    setAllEntries(entries)
    setCursor(lastEntry.id)
  }, [data?.rows, entries])

  // Client-side CSV generation (no backend endpoint exists yet)
  const exportCsv = useMemo(
    () => ({
      mutate: () => {
        void exportCsvAsync()
      },
      mutateAsync: exportCsvAsync,
      isPending: isExporting,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, isExporting],
  )

  async function exportCsvAsync() {
    setIsExporting(true)
    try {
      const rows = entries.length > 0 ? entries : data?.rows ?? []
      if (rows.length === 0) return

      const headers = ['ID', 'Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Severity', 'User ID']
      const csvRows = rows.map((entry: any) => [
        entry.id ?? '',
        entry.createdAt ? new Date(entry.createdAt).toISOString() : '',
        entry.action ?? '',
        entry.entityType ?? '',
        entry.entityId ?? '',
        entry.severity ?? '',
        entry.userId ?? '',
      ])

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row: string[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return {
    entries: entries.length > 0 ? entries : (data?.rows ?? []),
    hasMore,
    isLoading,
    error: error as Error | null,
    filters,
    setFilters,
    loadMore,
    exportCsv,
  }
}
