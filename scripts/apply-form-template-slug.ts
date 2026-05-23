import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    // Check if slug column already exists
    const exists = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'form_templates'
        AND column_name = 'slug'
      LIMIT 1
    `
    if (exists.length > 0) {
      console.log("slug column already exists on form_templates — nothing to do")
      return
    }

    await sql`ALTER TABLE "form_templates" ADD COLUMN "slug" text`
    console.log("✓ Added slug column to form_templates")

    // Unique index scoped per tenant so different tenants can't collide
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "form_templates_tenantId_slug_key"
      ON "form_templates" ("tenantId", "slug")
      WHERE "slug" IS NOT NULL
    `
    console.log("✓ Created unique index form_templates_tenantId_slug_key")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
