import { inngest } from '@/shared/inngest'
import { db } from '@/shared/db'
import { auditLogs } from '@/shared/db/schema'
import { lt } from 'drizzle-orm'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'audit.events' })

const RETENTION_DAYS = 365

export const auditRetentionCleanup = inngest.createFunction(
  { id: 'audit/retention-cleanup' },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const deleted = await step.run('delete-old-entries', async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

      await db
        .delete(auditLogs)
        .where(lt(auditLogs.createdAt, cutoff))

      log.info({ cutoffDate: cutoff.toISOString() }, 'Audit retention cleanup complete')
      return { cutoffDate: cutoff.toISOString() }
    })

    return deleted
  }
)
