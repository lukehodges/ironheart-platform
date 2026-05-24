import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Phase 1.x — notes column on engagement_org_chart.
 *
 * Adds a free-text prose column for per-node consultant notes
 * (mirrors the demo's `notes` field on DemoNode).
 *
 * Idempotent. Safe to re-run. Modelled on scripts/apply-chart-depth.ts.
 */
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "notes" text
    `
    console.log("✓ notes column ready")

    console.log("\n✓ apply-chart-notes complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
