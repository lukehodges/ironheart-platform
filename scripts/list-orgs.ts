import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL!
  const sql = postgres(url)

  try {
    const { workos } = await import("@/shared/workos")

    console.log("=== All WorkOS organizations ===")
    const orgs = await workos.organizations.listOrganizations({ limit: 50 })
    for (const o of orgs.data) {
      console.log(`  ${o.id}  ${o.name}  (created ${o.createdAt})`)
    }

    console.log(`\n=== All internal tenants ===`)
    const tenants = await sql`SELECT id, slug, name, "workosOrgId", "createdAt" FROM tenants ORDER BY "createdAt" DESC`
    for (const t of tenants) {
      console.log(`  ${t.id}  slug=${t.slug}  workosOrgId=${t.workosOrgId ?? "(none)"}`)
    }

    console.log(`\n=== Cross-reference ===`)
    for (const o of orgs.data) {
      const match = tenants.find((t) => t.workosOrgId === o.id)
      console.log(`  WorkOS ${o.name} (${o.id})  →  ${match ? `internal tenant ${match.slug}` : "NO INTERNAL TENANT"}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
