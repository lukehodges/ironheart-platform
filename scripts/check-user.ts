import postgres from "postgres"
import { config } from "dotenv"
config({ path: ".env.local" })
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })
  const users: any = await sql`SELECT u.id, u.email, u."tenantId", u."isPlatformAdmin", t.slug, t.name 
    FROM users u JOIN tenants t ON t.id = u."tenantId" 
    WHERE u.email ILIKE '%luke%' OR u."isPlatformAdmin"=true 
    ORDER BY u.email`
  console.log("Platform admins / luke users:")
  for(const u of users) console.log(`  ${u.email.padEnd(32)} tenant=${u.slug.padEnd(14)} admin=${u.isPlatformAdmin}`)
  await sql.end()
}
main()
