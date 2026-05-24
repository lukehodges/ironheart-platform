import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Repair Brightline test engagement org chart node typing.
 *
 * Pre-fix seed template tagged structural team groupings (Operations, Finance,
 * Sales/Marketing, Other staff) with type='ROLE'. The adapter maps ROLE ->
 * kind=VACANCY, so every department rendered as a dashed vacancy card.
 *
 * Heuristic to distinguish a structural team grouping from a genuine unfilled
 * job opening: **a ROLE row that has children IS a team grouping** — a vacancy
 * cannot have direct reports. Flip such rows to type='DEPARTMENT'.
 *
 * Idempotent. Safe to re-run.
 */
const ENGAGEMENT_ID = "c950c06a-1b41-4f46-9c89-660845d96bee"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    console.log(`\n=== Repairing org chart types for engagement ${ENGAGEMENT_ID} ===\n`)

    // ── BEFORE counts ───────────────────────────────────────────────────────
    const before = await sql<{ type: string; count: string }[]>`
      SELECT type, COUNT(*)::text AS count
      FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID}
      GROUP BY type
      ORDER BY type
    `
    console.log("BEFORE:")
    for (const row of before) {
      console.log(`  ${row.type.padEnd(12)} ${row.count}`)
    }

    // ── Preview rows about to flip ──────────────────────────────────────────
    const toFlip = await sql<{ id: string; label: string }[]>`
      SELECT id, label
      FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID}
        AND type = 'ROLE'
        AND id IN (
          SELECT DISTINCT "parentId" FROM engagement_org_chart
          WHERE "engagementId" = ${ENGAGEMENT_ID}
            AND "parentId" IS NOT NULL
        )
      ORDER BY label
    `
    console.log(`\nFlipping ${toFlip.length} row(s) from ROLE -> DEPARTMENT:`)
    for (const row of toFlip) {
      console.log(`  - ${row.label} (${row.id})`)
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    const updated = await sql`
      UPDATE engagement_org_chart
      SET type = 'DEPARTMENT'
      WHERE "engagementId" = ${ENGAGEMENT_ID}
        AND type = 'ROLE'
        AND id IN (
          SELECT DISTINCT "parentId" FROM engagement_org_chart
          WHERE "engagementId" = ${ENGAGEMENT_ID}
            AND "parentId" IS NOT NULL
        )
      RETURNING id
    `
    console.log(`\n${updated.count} row(s) updated.`)

    // ── AFTER counts ────────────────────────────────────────────────────────
    const after = await sql<{ type: string; count: string }[]>`
      SELECT type, COUNT(*)::text AS count
      FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID}
      GROUP BY type
      ORDER BY type
    `
    console.log("\nAFTER:")
    for (const row of after) {
      console.log(`  ${row.type.padEnd(12)} ${row.count}`)
    }

    console.log("\n✓ fix-brightline-department-types complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
