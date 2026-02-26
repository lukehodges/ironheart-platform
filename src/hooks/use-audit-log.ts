'use client'

import { api } from '@/lib/trpc/react'
import { useState, useMemo, useCallback } from 'react'
import type { AuditLogFilters } from '@/modules/audit/audit.types'

/**
 * Audit log hook
 *
 * Manages audit log entries with cursor-based pagination and filtering.
 * Wired to audit.list which uses permissionProcedure('audit:read'),
 * so tenant admins (OWNER/ADMIN) and users with audit:read can access.
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
  const [filters, setFiltersRaw] = useState<AuditLogFilters>({})
  const [cursor, setCursor] = useState<string | undefined>()
  const [allEntries, setAllEntries] = useState<any[]>([])
  // Map the AuditLogFilters to the audit.list input shape
  const queryInput = useMemo(
    () => ({
      action: filters.action,
      resourceType: filters.resourceType,
      limit: 50,
      cursor,
    }),
    [filters.action, filters.resourceType, cursor],
  )

  const { data, isLoading, error } = api.audit.list.useQuery(queryInput, {
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
    if (!data?.rows || data.rows.length === 0 || !data.nextCursor) return
    // Save current entries before loading more
    setAllEntries(entries)
    setCursor(data.nextCursor)
  }, [data?.rows, data?.nextCursor, entries])

  // Backend CSV export mutation
  const exportCsv = api.audit.exportCsv.useMutation({
    onSuccess: (csvString) => {
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
  })

  // Reset cursor and accumulated entries when filters change
  const setFilters = useCallback((newFilters: AuditLogFilters) => {
    setFiltersRaw(newFilters)
    setCursor(undefined)
    setAllEntries([])
  }, [])

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
