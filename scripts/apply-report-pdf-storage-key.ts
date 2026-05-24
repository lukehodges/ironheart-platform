import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    // Add pdfStorageKey column if not present
    await sql`
      ALTER TABLE audit_reports
        ADD COLUMN IF NOT EXISTS "pdfStorageKey" text
    `
    console.log("✓ audit_reports.pdfStorageKey — ok")

    // Add pdfStorageUrl column if not present
    await sql`
      ALTER TABLE audit_reports
        ADD COLUMN IF NOT EXISTS "pdfStorageUrl" text
    `
    console.log("✓ audit_reports.pdfStorageUrl — ok")

    console.log("\nDone.")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
