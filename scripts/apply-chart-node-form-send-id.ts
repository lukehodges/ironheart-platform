import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    // ── Add formSendId column (idempotent) ────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "formSendId" uuid
    `
    console.log("engagement_org_chart.formSendId column ensured")

    // ── Add index (idempotent) ────────────────────────────────────────────
    await sql`
      CREATE INDEX IF NOT EXISTS idx_org_chart_form_send
        ON "engagement_org_chart" ("formSendId")
    `
    console.log("idx_org_chart_form_send index ensured")

    console.log("Migration complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
