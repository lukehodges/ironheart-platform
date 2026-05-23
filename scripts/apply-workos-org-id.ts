import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    // Check if already exists
    const exists = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenants'
        AND column_name = 'workosOrgId'
      LIMIT 1
    `
    if (exists.length > 0) {
      console.log("workosOrgId column already exists — nothing to do")
      return
    }

    await sql`ALTER TABLE "tenants" ADD COLUMN "workosOrgId" text`
    console.log("✓ Added workosOrgId column to tenants")

    // Optional index for faster lookups by workosOrgId (provisioning checks for dupes)
    await sql`CREATE INDEX IF NOT EXISTS "tenants_workosOrgId_idx" ON "tenants" ("workosOrgId")`
    console.log("✓ Created index tenants_workosOrgId_idx")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
