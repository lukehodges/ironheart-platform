import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

const MODULES_NEEDED = ["report-generator", "audit-workspace", "consulting"]

async function main() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    console.log("=== Ensure modules exist ===")
    for (const slug of MODULES_NEEDED) {
      const [existing] = await sql`SELECT id, slug FROM modules WHERE slug = ${slug} LIMIT 1`
      if (existing) {
        console.log(`  ${slug} already in modules table (id=${existing.id})`)
        continue
      }
      const [created] = await sql`
        INSERT INTO modules (slug, name, description, "isCore", "isActive", "createdAt", "updatedAt")
        VALUES (${slug}, ${slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}, ${"Consultant-side " + slug}, false, true, NOW(), NOW())
        RETURNING id, slug
      `
      console.log(`  ✓ Created module ${created.slug} (id=${created.id})`)
    }

    console.log("\n=== Enable on all tenants ===")
    const modules = await sql`SELECT id, slug FROM modules WHERE slug = ANY(${MODULES_NEEDED}::text[])`
    const tenants = await sql`SELECT id, slug FROM tenants WHERE "deletedAt" IS NULL`
    console.log(`  ${modules.length} modules × ${tenants.length} tenants`)

    let enabled = 0, alreadyEnabled = 0
    for (const tenant of tenants) {
      for (const mod of modules) {
        const [existing] = await sql`
          SELECT 1 FROM tenant_modules
          WHERE "tenantId" = ${tenant.id} AND "moduleId" = ${mod.id}
          LIMIT 1
        `
        if (existing) {
          await sql`UPDATE tenant_modules SET "isEnabled" = true, "updatedAt" = NOW() WHERE "tenantId" = ${tenant.id} AND "moduleId" = ${mod.id}`
          alreadyEnabled++
        } else {
          await sql`
            INSERT INTO tenant_modules (id, "tenantId", "moduleId", "isEnabled", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${tenant.id}, ${mod.id}, true, NOW(), NOW())
          `
          enabled++
          console.log(`  ✓ Enabled ${mod.slug} on tenant ${tenant.slug}`)
        }
      }
    }
    console.log(`\n${enabled} new enables, ${alreadyEnabled} already enabled`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
