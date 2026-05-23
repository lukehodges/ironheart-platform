import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL not set")
    process.exit(1)
  }

  const sql = postgres(url)

  try {
    // Check specific columns we need
    const needsOnTenants = ["workosOrgId"]
    const needsOnEngagements = [
      "stage", "clientTenantId", "auditWindowStart", "auditWindowEnd",
      "closedReason", "planeProjectId", "driveFolderId", "discoveryCallId",
      "discoveryNotes", "qualificationData",
    ]
    const needsOnProposals = ["problemStatement", "exclusions", "requirements", "roiData"]
    const needsTables = [
      "audit_sessions", "audit_call_notes", "audit_lens_analysis",
      "audit_findings", "audit_recommendations", "audit_reports",
    ]
    const needsEnums = [
      "EngagementStage", "AuditLens", "AuditSessionStatus",
      "FindingImpact", "RagScore", "AuditReportStatus",
    ]

    async function colExists(table: string, col: string): Promise<boolean> {
      const rows = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${col}
        LIMIT 1
      `
      return rows.length > 0
    }

    async function tableExists(name: string): Promise<boolean> {
      const rows = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${name}
        LIMIT 1
      `
      return rows.length > 0
    }

    async function enumExists(name: string): Promise<boolean> {
      const rows = await sql`
        SELECT 1 FROM pg_type WHERE typname = ${name} AND typtype = 'e'
        LIMIT 1
      `
      return rows.length > 0
    }

    console.log("=== tenants columns ===")
    for (const c of needsOnTenants) {
      console.log(`  ${c}: ${await colExists("tenants", c) ? "EXISTS" : "MISSING"}`)
    }

    console.log("\n=== engagements columns ===")
    for (const c of needsOnEngagements) {
      console.log(`  ${c}: ${await colExists("engagements", c) ? "EXISTS" : "MISSING"}`)
    }

    console.log("\n=== proposals columns ===")
    for (const c of needsOnProposals) {
      console.log(`  ${c}: ${await colExists("proposals", c) ? "EXISTS" : "MISSING"}`)
    }

    console.log("\n=== tables ===")
    for (const t of needsTables) {
      console.log(`  ${t}: ${await tableExists(t) ? "EXISTS" : "MISSING"}`)
    }

    console.log("\n=== enums ===")
    for (const e of needsEnums) {
      console.log(`  ${e}: ${await enumExists(e) ? "EXISTS" : "MISSING"}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
