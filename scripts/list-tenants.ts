import postgres from "postgres"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })
  const tenants = await sql`SELECT id, slug, name FROM tenants ORDER BY name`
  console.log("Tenants:")
  for (const t of tenants) console.log(`  ${t.id}  ${t.slug.padEnd(20)} ${t.name}`)
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
