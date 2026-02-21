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

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    const oldValues = input.changes
      ? Object.fromEntries(input.changes.map((c) => [c.field, c.before]))
      : null
    const newValues = input.changes
      ? Object.fromEntries(input.changes.map((c) => [c.field, c.after]))
      : null

    await db.insert(auditLogs).values({
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

    log.info(
      { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId },
      'Audit log entry written'
    )
  } catch (error) {
    // Fire-and-forget — audit logging must never break business logic
    log.error({ error, input }, 'Failed to write audit log entry')
  }
}
