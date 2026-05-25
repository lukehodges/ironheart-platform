import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Adds `extra_questions jsonb NOT NULL DEFAULT '[]'` to engagement_org_chart.
 * Each entry shape: { id: string, label: string, type: 'TEXT'|'TEXTAREA'|'SELECT', options?: string[] }.
 *
 * These extra questions get MERGED onto the resolved template's `fields` at
 * form-send time so each prospect sees template + per-node bespoke questions.
 *
 * Idempotent.
 */
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    const colExists = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'engagement_org_chart'
        AND column_name = 'extra_questions'
      LIMIT 1
    `
    if (colExists.length === 0) {
      await sql`
        ALTER TABLE "engagement_org_chart"
        ADD COLUMN "extra_questions" jsonb NOT NULL DEFAULT '[]'::jsonb
      `
      console.log("Added extra_questions column to engagement_org_chart")
    } else {
      console.log("extra_questions column already exists on engagement_org_chart")
    }

    console.log("Migration complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
