import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL!
  const sql = postgres(url)
  const tenantId = "bb749224-5ca0-4751-ab36-891eb8bcbd28"
  const engagementId = "c950c06a-1b41-4f46-9c89-660845d96bee"

  try {
    console.log("=== Engagement (after provisioning) ===")
    const eng = await sql`
      SELECT id, stage, "tenantId", "clientTenantId" FROM engagements WHERE id = ${engagementId}
    `
    console.log(eng[0])

    console.log("\n=== New tenant ===")
    const t = await sql`
      SELECT id, slug, name, "workosOrgId", plan, status, "createdAt"
      FROM tenants WHERE id = ${tenantId}
    `
    console.log(t[0])

    console.log("\n=== Tenant modules (5 expected) ===")
    const mods = await sql`
      SELECT tm."moduleId", m.slug, tm."isEnabled"
      FROM tenant_modules tm
      JOIN modules m ON m.id = tm."moduleId"
      WHERE tm."tenantId" = ${tenantId}
      ORDER BY m.slug
    `
    console.log(mods.length === 0 ? "(none — module registration failed)" : mods)

    console.log("\n=== Organization settings ===")
    const orgs = await sql`
      SELECT "tenantId", "businessName", "createdAt"
      FROM organization_settings WHERE "tenantId" = ${tenantId}
    `
    console.log(orgs[0] ?? "(none)")
  } finally {
    await sql.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
