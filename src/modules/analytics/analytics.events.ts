import { inngest } from '@/shared/inngest'
import { db } from '@/shared/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/shared/logger'
import { tenants } from '@/shared/db/schemas/tenant.schema'
import * as analyticsService from './analytics.service'

const log = logger.child({ module: 'analytics.events' })

/**
 * Hourly cron: compute metric snapshots for all active tenants.
 * Runs every hour at minute 0.
 */
export const computeMetricSnapshots = inngest.createFunction(
  { id: 'compute-metric-snapshots', retries: 2 },
  { cron: '0 * * * *' },
  async ({ step }) => {
    // Load all active tenants
    const activeTenants = await step.run('load-active-tenants', async () => {
      return db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.status, 'ACTIVE'))
    })

    log.info({ count: activeTenants.length }, 'Computing metrics for active tenants')

    // Compute metrics for each tenant in parallel
    await Promise.all(
      activeTenants.map((t) =>
        step.run(`compute-${t.id}`, () =>
          analyticsService.computeHourlyMetrics(t.id)
        )
      )
    )
  }
)
