import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'audit-logger' })

export interface AuditLogInput {
  tenantId: string
  actorId: string
  action: 'created' | 'updated' | 'deleted'
  resourceType: string
  resourceId: string
  resourceName: string
  changes?: { field: string; before: unknown; after: unknown }[]
  metadata?: Record<string, unknown>
}

/**
 * Write an audit log entry.
 *
 * @param input  - Audit entry data
 * @param tx     - Optional Drizzle transaction. When provided, the audit entry
 *                 commits/rolls back with the business operation and errors propagate.
 *                 When omitted, falls back to fire-and-forget (errors are swallowed).
 */
export async function auditLog(input: AuditLogInput, tx?: { insert: typeof db.insert }): Promise<void> {
  const conn = tx ?? db

  const oldValues = input.changes
    ? Object.fromEntries(input.changes.map((c) => [c.field, c.before]))
    : null
  const newValues = input.changes
    ? Object.fromEntries(input.changes.map((c) => [c.field, c.after]))
    : null

  const doInsert = () =>
    conn.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.actorId,
      action: input.action,
      entityType: input.resourceType,
      entityId: input.resourceId,
      oldValues,
      newValues,
      metadata: {
        resourceName: input.resourceName,
        ...input.metadata,
      },
      createdAt: new Date(),
    })

  if (tx) {
    // Transactional mode — let errors propagate to roll back the transaction
    await doInsert()
    log.info(
      { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId },
      'Audit log entry written (transactional)'
    )
  } else {
    // Fire-and-forget — never break business logic
    try {
      await doInsert()
      log.info(
        { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId },
        'Audit log entry written'
      )
    } catch (error) {
      log.error({ error, input }, 'Failed to write audit log entry')
    }
  }
}
