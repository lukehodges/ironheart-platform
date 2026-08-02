/**
 * Make outreach actually visible:
 *   1. Discover which tenants the platform admin user is on
 *   2. Ensure outreach module is enabled for those tenants
 *   3. Copy data from ironheart tenant into demo + platform (idempotent)
 */
import postgres from "postgres"
import { config } from "dotenv"
config({ path: ".env.local" })

const SOURCE_TENANT = "43cf4a66-4252-43e8-933e-9cfb73f12886" // ironheart
const TARGETS = [
  { id: "6e319e07-0090-452d-9b68-46817cd2b324", slug: "demo" },
  { id: "6fc64347-4b2f-4702-884f-909dc5ffd6ff", slug: "platform" },
]

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })

  // 1. Ensure outreach module exists in registry
  const modCheck: any = await sql`SELECT id FROM modules WHERE slug='outreach' LIMIT 1`
  if (modCheck.length === 0) {
    console.log("Module 'outreach' missing from registry — inserting…")
    await sql`INSERT INTO modules (slug, name, description, category, "isActive")
      VALUES ('outreach', 'Outreach', 'Outreach observatory', 'OPERATIONS', true)
      ON CONFLICT (slug) DO NOTHING`
  } else {
    console.log(`  ✓ module 'outreach' present (id=${modCheck[0].id.slice(0,8)})`)
  }

  // 2. Enable outreach module for each target tenant
  const moduleRow: any = await sql`SELECT id FROM modules WHERE slug='outreach' LIMIT 1`
  const moduleId = moduleRow[0].id

  for (const t of TARGETS) {
    // Use tenantId+moduleId as natural conflict target if a unique constraint exists.
    const existing: any = await sql`SELECT id FROM tenant_modules WHERE "tenantId"=${t.id} AND "moduleId"=${moduleId} LIMIT 1`
    if (existing.length === 0) {
      await sql`INSERT INTO tenant_modules ("tenantId", "moduleId", "isEnabled")
        VALUES (${t.id}, ${moduleId}, true)`
    } else {
      await sql`UPDATE tenant_modules SET "isEnabled"=true WHERE id=${existing[0].id}`
    }
    console.log(`  ✓ outreach enabled for tenant ${t.slug}`)
  }

  // 3. Copy data: weekly_hypothesis, leads, daily_activity
  for (const t of TARGETS) {
    console.log(`\n→ Replicating data into ${t.slug}…`)

    // Wipe first (idempotent)
    await sql`DELETE FROM outreach_replies WHERE "tenantId"=${t.id}`
    await sql`DELETE FROM outreach_touches WHERE "tenantId"=${t.id}`
    await sql`DELETE FROM outreach_leads WHERE "tenantId"=${t.id}`
    await sql`DELETE FROM outreach_daily_activity WHERE "tenantId"=${t.id}`
    await sql`DELETE FROM outreach_weekly_hypothesis WHERE "tenantId"=${t.id}`

    // Hypotheses — copy in chronological order so prevWeekId resolves
    const hypos: any = await sql`SELECT * FROM outreach_weekly_hypothesis WHERE "tenantId"=${SOURCE_TENANT} ORDER BY "startDate" ASC`
    const idMap = new Map<string, string>()
    for (const h of hypos) {
      const newId = crypto.randomUUID()
      idMap.set(h.id, newId)
      const newPrev = h.prevWeekId ? idMap.get(h.prevWeekId) : null
      await sql`INSERT INTO outreach_weekly_hypothesis
        (id, "tenantId", week, "startDate", "endDate", title, body, "targetSample", "targetReplyPct", "targetPositivePct", "targetBooked", status, verdict, "resultSummary", replaces, "prevWeekId", "createdAt", "updatedAt")
        VALUES (${newId}, ${t.id}, ${h.week}, ${h.startDate}, ${h.endDate}, ${h.title}, ${h.body}, ${h.targetSample}, ${h.targetReplyPct}, ${h.targetPositivePct}, ${h.targetBooked}, ${h.status}, ${h.verdict}, ${h.resultSummary}, ${h.replaces}, ${newPrev}, ${h.createdAt}, ${h.updatedAt})`
    }
    console.log(`  ✓ ${hypos.length} hypotheses copied`)

    // Leads
    const leads: any = await sql`SELECT * FROM outreach_leads WHERE "tenantId"=${SOURCE_TENANT}`
    let leadCount = 0
    for (const l of leads) {
      const newHypoId = l.hypothesisWeekId ? idMap.get(l.hypothesisWeekId) : null
      await sql`INSERT INTO outreach_leads
        (id, "tenantId", number, owner, status, name, company, category, email, website, source, researched, "followUpFlag", "lastContactedAt", "nextFollowUpAt", reply, "replySentiment", "researchNotes", notes, "hypothesisWeekId", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${t.id}, ${l.number}, ${l.owner}, ${l.status}, ${l.name}, ${l.company}, ${l.category}, ${l.email}, ${l.website}, ${l.source}, ${l.researched}, ${l.followUpFlag}, ${l.lastContactedAt}, ${l.nextFollowUpAt}, ${l.reply}, ${l.replySentiment}, ${l.researchNotes}, ${l.notes}, ${newHypoId}, ${l.createdAt}, ${l.updatedAt})
        ON CONFLICT DO NOTHING`
      leadCount++
    }
    console.log(`  ✓ ${leadCount} leads copied`)

    // Daily activity
    const daily: any = await sql`SELECT * FROM outreach_daily_activity WHERE "tenantId"=${SOURCE_TENANT}`
    let dayCount = 0
    for (const d of daily) {
      const newHypoId = d.hypothesisWeekId ? idMap.get(d.hypothesisWeekId) : null
      await sql`INSERT INTO outreach_daily_activity
        (id, "tenantId", date, owner, channel, "hypothesisWeekId", sent, replies, positive, "meetingsBooked", "meetingsTaken", interested, closed, "newUpfront", "newRetainer", notes, "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${t.id}, ${d.date}, ${d.owner}, ${d.channel}, ${newHypoId}, ${d.sent}, ${d.replies}, ${d.positive}, ${d.meetingsBooked}, ${d.meetingsTaken}, ${d.interested}, ${d.closed}, ${d.newUpfront}, ${d.newRetainer}, ${d.notes}, ${d.createdAt}, ${d.updatedAt})
        ON CONFLICT DO NOTHING`
      dayCount++
    }
    console.log(`  ✓ ${dayCount} daily activity rows copied`)
  }

  // 4. Verify
  console.log("\n── Verification ──")
  const all: any = await sql`
    SELECT t.slug,
      (SELECT count(*) FROM outreach_leads WHERE "tenantId"=t.id) as leads,
      (SELECT count(*) FROM outreach_weekly_hypothesis WHERE "tenantId"=t.id AND status='active') as active,
      (SELECT count(*) FROM outreach_daily_activity WHERE "tenantId"=t.id) as daily,
      (SELECT "isEnabled" FROM tenant_modules tm JOIN modules m ON m.id=tm."moduleId" WHERE tm."tenantId"=t.id AND m.slug='outreach' LIMIT 1) as outreach_enabled
    FROM tenants t ORDER BY t.slug`
  for (const r of all) {
    console.log(`  ${r.slug.padEnd(16)} leads=${r.leads}  active_hypo=${r.active}  daily=${r.daily}  module=${r.outreach_enabled ?? "off"}`)
  }

  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
