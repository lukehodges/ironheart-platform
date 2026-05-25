import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Adds `engagementId uuid NULL` to form_templates so a template can be scoped
 * to a single engagement (a "duplicated as ClientName" template). Templates
 * with engagementId NULL remain the master Ironheart library.
 *
 * Idempotent.
 */
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    // Add column if missing
    const colExists = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'form_templates'
        AND column_name = 'engagementId'
      LIMIT 1
    `

    if (colExists.length === 0) {
      await sql`ALTER TABLE "form_templates" ADD COLUMN "engagementId" uuid`
      console.log("Added engagementId column to form_templates")
    } else {
      console.log("engagementId column already exists on form_templates")
    }

    // Index for tenant + engagement scoped lookups
    await sql`
      CREATE INDEX IF NOT EXISTS "form_templates_tenantId_engagementId_idx"
      ON "form_templates" ("tenantId", "engagementId")
    `
    console.log("Index form_templates_tenantId_engagementId_idx ensured")

    console.log("Migration complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
