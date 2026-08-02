import postgres from "postgres"
import { config } from "dotenv"
config({ path: ".env.local" })
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })
  const rows: any = await sql`SELECT "tenantId", week, status, verdict, "startDate", "endDate" FROM outreach_weekly_hypothesis ORDER BY "startDate"`
  console.log("All hypotheses across all tenants:")
  for(const r of rows) console.log(`  ${r.tenantId.slice(0,8)}  ${r.week}  ${r.status.padEnd(10)} ${r.verdict.padEnd(10)} ${r.startDate} → ${r.endDate}`)
  await sql.end()
}
main()
