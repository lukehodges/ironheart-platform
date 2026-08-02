/**
 * Backfill outreach *event* history from the already-migrated leads, so the
 * Funnel/Inbox reflect what was actually sent before this system existed.
 *
 * Derives, per tenant, from outreach_leads:
 *   - outreach_touches        : one send event per lead with status='sent' + a date
 *   - outreach_replies        : one row per lead flagged reply=true (sentiment carried)
 *   - outreach_daily_activity : sent / replies / positive rolled up per (date, owner)
 *
 * The roster already carries the *state*; this reconstructs the *events*. It does
 * NOT invent data — sends without a lastContactedAt can't be dated and are skipped
 * (still counted as sent in the roster). Idempotent: clears the tenant's event
 * tables first. DRY RUN by default; pass --commit to write.
 *
 *   DATABASE_URL=... TENANT_ID=<uuid> \
 *   npx tsx --tsconfig tsconfig.json scripts/backfill-outreach-history.ts [--commit]
 */
import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL
const TENANT_ID = process.env.TENANT_ID
const COMMIT = process.argv.includes("--commit")
if (!DATABASE_URL) throw new Error("DATABASE_URL required")
if (!TENANT_ID) throw new Error("TENANT_ID required")
const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require", max: 1 })

async function main() {
  const T = TENANT_ID

  const [{ sends }] = await sql`select count(*)::int sends from outreach_leads where "tenantId"=${T} and status='sent' and "lastContactedAt" is not null`
  const [{ undated }] = await sql`select count(*)::int undated from outreach_leads where "tenantId"=${T} and status='sent' and "lastContactedAt" is null`
  const [{ replies }] = await sql`select count(*)::int replies from outreach_leads where "tenantId"=${T} and reply=true`
  const [{ positives }] = await sql`select count(*)::int positives from outreach_leads where "tenantId"=${T} and reply=true and "replySentiment"='positive'`
  const days = await sql`select "lastContactedAt"::date d, owner, count(*) filter (where status='sent')::int s from outreach_leads where "tenantId"=${T} and "lastContactedAt" is not null and (status='sent' or reply=true) group by 1,2`

  console.log("── BACKFILL PLAN ──")
  console.log("send events (touches):", sends, ` (+${undated} sent but undated → skipped)`)
  console.log("replies:", replies, `(positive ${positives})`)
  console.log("daily_activity rows (date × owner):", days.length)

  if (!COMMIT) { console.log("\nDRY RUN — nothing written. Re-run with --commit."); await sql.end(); return }

  await sql.begin(async (tx) => {
    // idempotent: clear derived event tables for this tenant
    await tx`delete from outreach_replies where "tenantId"=${T}`
    await tx`delete from outreach_touches where "tenantId"=${T}`
    await tx`delete from outreach_daily_activity where "tenantId"=${T}`

    // 1. touches — one send event per dated 'sent' lead
    await tx`
      insert into outreach_touches (id, "tenantId", "leadId", channel, "sentAt", "deliveryStatus", "createdAt", "updatedAt")
      select gen_random_uuid(), "tenantId", id, 'email', "lastContactedAt", 'delivered', now(), now()
      from outreach_leads
      where "tenantId"=${T} and status='sent' and "lastContactedAt" is not null`

    // 2. replies — one per flagged lead, sentiment carried from the sheet
    await tx`
      insert into outreach_replies (id, "tenantId", "leadId", "receivedAt", subject, body, sentiment, "classifiedBy", "needsReview", handled, "handledAt", "createdAt")
      select gen_random_uuid(), "tenantId", id, coalesce("lastContactedAt", now()),
             'Re: (migrated from spreadsheet)',
             'Reply was recorded in the legacy master list; original text not migrated.',
             "replySentiment", 'rule', false, true, now(), now()
      from outreach_leads
      where "tenantId"=${T} and reply=true`

    // 3. daily_activity — sent / replies / positive per (date, owner)
    await tx`
      insert into outreach_daily_activity (id,"tenantId",date,owner,channel,sent,replies,positive,"meetingsBooked","meetingsTaken",interested,closed,"newUpfront","newRetainer","createdAt","updatedAt")
      select gen_random_uuid(), "tenantId", "lastContactedAt"::date, owner, 'email',
             count(*) filter (where status='sent')::int,
             count(*) filter (where reply=true)::int,
             count(*) filter (where reply=true and "replySentiment"='positive')::int,
             0,0,0,0,0,0, now(), now()
      from outreach_leads
      where "tenantId"=${T} and "lastContactedAt" is not null and (status='sent' or reply=true)
      group by "tenantId", "lastContactedAt"::date, owner`
  })

  const [{ t }] = await sql`select count(*)::int t from outreach_touches where "tenantId"=${T}`
  const [{ r }] = await sql`select count(*)::int r from outreach_replies where "tenantId"=${T}`
  const [{ d }] = await sql`select count(*)::int d from outreach_daily_activity where "tenantId"=${T}`
  const [{ totsent }] = await sql`select coalesce(sum(sent),0)::int totsent from outreach_daily_activity where "tenantId"=${T}`
  console.log(`\n✅ COMMITTED — touches ${t}, replies ${r}, daily_activity ${d} (sum sent=${totsent})`)
  await sql.end()
}
main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1) })
