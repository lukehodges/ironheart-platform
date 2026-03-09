// ---------------------------------------------------------------------------
// Audit Module - Type Definitions
// ---------------------------------------------------------------------------

/** A single audit log entry as returned from the database. */
export interface AuditLogEntry {
  id: string
  tenantId: string
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  sessionId: string | null
  requestId: string | null
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  metadata: Record<string, unknown> | null
  createdAt: Date
  actor: {
    id: string
    name: string
    email: string
  }
  resourceName: string
}

/** Filters for querying audit logs. */
export interface AuditLogFilters {
  action?: string
  resourceType?: string
  userId?: string
  dateFrom?: Date
  dateTo?: Date
  /** Alias for userId - used by the filters UI actor dropdown. */
  actorId?: string
  /** Alias for dateFrom - used by the filters UI date range picker. */
  from?: Date
  /** Alias for dateTo - used by the filters UI date range picker. */
  to?: Date
}

/** Available filter options for the audit log UI. */
export interface AuditFilterOptions {
  resourceTypes: string[]
}
