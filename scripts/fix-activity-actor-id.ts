import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    const cols = await sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'engagement_org_chart_activity'
        AND column_name = 'actorId'
    `
    if (cols.length === 0) throw new Error("actorId column not found")
    if (cols[0].data_type === "text") {
      console.log("actorId is already text — nothing to do")
      return
    }
    console.log(`Current type: ${cols[0].data_type}. Changing to text…`)

    // Drop column + add as text — simpler than USING cast (no existing rows to migrate)
    // Existing rows: this is a brand-new table; safe to just ALTER TYPE.
    await sql`ALTER TABLE "engagement_org_chart_activity" ALTER COLUMN "actorId" TYPE text USING "actorId"::text`
    console.log("✓ actorId column type changed to text")

    // Clean partial seed for the test engagement so the user can retry cleanly
    const partialNodes = await sql`SELECT id FROM engagement_org_chart WHERE "engagementId" = 'c950c06a-1b41-4f46-9c89-660845d96bee'`
    if (partialNodes.length > 0) {
      console.log(`Cleaning ${partialNodes.length} partial seed nodes for engagement c950c06a-...`)
      await sql`DELETE FROM engagement_org_chart_activity WHERE "engagementId" = 'c950c06a-1b41-4f46-9c89-660845d96bee'`
      await sql`DELETE FROM engagement_org_chart WHERE "engagementId" = 'c950c06a-1b41-4f46-9c89-660845d96bee'`
      console.log("✓ Partial seed cleaned")
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
