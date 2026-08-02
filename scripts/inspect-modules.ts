import postgres from "postgres"
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })
  const m: any = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='modules' ORDER BY ordinal_position`
  console.log("modules cols:", m.map((x: any) => x.column_name).join(", "))
  const tm: any = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='tenant_modules' ORDER BY ordinal_position`
  console.log("tenant_modules cols:", tm.map((x: any) => x.column_name).join(", "))
  const sample: any = await sql`SELECT * FROM modules LIMIT 3`
  console.log("\nmodules sample:", JSON.stringify(sample, null, 2))
  const tmsample: any = await sql`SELECT * FROM tenant_modules LIMIT 3`
  console.log("\ntenant_modules sample:", JSON.stringify(tmsample, null, 2))
  await sql.end()
}
main()
