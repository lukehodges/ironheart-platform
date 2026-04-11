/**
 * Backfill script: Phase 1 Universal Data Model
 *
 * Runs AFTER the 0004_phase1-universal-data-model.sql migration is applied.
 * Idempotent — safe to run multiple times.
 *
 * Step 1: Create resources rows for all team member users (users with a staff_profiles row)
 * Step 2: Set jobAssignments.resourceId from resources.userId match
 *
 * Usage:
 *   npx tsx scripts/backfill-resources.ts
 */

import { db } from "@/shared/db"
import { sql } from "drizzle-orm"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "backfill-resources" })

async function main() {
  log.info("Starting Phase 1 resource backfill")

  // Step 1: Insert resources for all team members (users with staff_profiles rows)
  const insertResult = await db.execute(sql`
    INSERT INTO resources (id, tenant_id, type, name, slug, user_id, is_active, travel_enabled, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      u.tenant_id,
      'PERSON'::"ResourceType",
      COALESCE(u.display_name, u.first_name || ' ' || u.last_name),
      lower(regexp_replace(
        COALESCE(u.display_name, u.first_name || '-' || u.last_name),
        '[^a-z0-9]+',
        '-',
        'gi'
      )),
      u.id,
      true,
      false,
      NOW(),
      NOW()
    FROM users u
    INNER JOIN staff_profiles sp ON sp.user_id = u.id
    ON CONFLICT DO NOTHING
  `)
  log.info({ count: insertResult.length }, "resources inserted for team members")

  // Step 2: Backfill resourceId on job_assignments from matching resources.userId
  const updateResult = await db.execute(sql`
    UPDATE job_assignments ja
    SET resource_id = r.id
    FROM resources r
    WHERE r.user_id = ja.user_id
    AND ja.resource_id IS NULL
  `)
  log.info({ count: updateResult.length }, "job_assignments.resourceId backfilled")

  log.info("Phase 1 resource backfill complete")
}

main().catch((e) => {
  log.error(e, "backfill failed")
  process.exit(1)
})
