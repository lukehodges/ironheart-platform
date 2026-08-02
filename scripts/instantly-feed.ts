/**
 * Feed the next N ready-and-researched leads into an Instantly campaign.
 *
 * Pulls from outreach_leads where:
 *   - status     = 'ready'
 *   - researched = true
 *   - status NOT 'dnc'   (the enum excludes dnc from 'ready', but stated explicitly)
 *
 * Ordered by number ASC (matches the xlsx row order / pull-batch order used in
 * import-leads.ts and the existing pullBatch convention).
 *
 * DOES NOT mark leads as sent — that happens when Instantly actually sends the
 * email, not at upload time.
 *
 * Usage (DRY RUN by default):
 *
 *   DATABASE_URL="postgres://dev:dev@localhost:5433/ironheart_platform_dev" \
 *   TENANT_ID="d3c13008-2826-4111-b546-b383e8e9df77" \
 *   INSTANTLY_CAMPAIGN_ID="<your-campaign-uuid>" \
 *   npx tsx --tsconfig tsconfig.json scripts/instantly-feed.ts
 *
 *   # Actually upload to Instantly:
 *   DATABASE_URL="..." TENANT_ID="..." INSTANTLY_CAMPAIGN_ID="..." \
 *   npx tsx --tsconfig tsconfig.json scripts/instantly-feed.ts --commit
 *
 * Optional env:
 *   INSTANTLY_API_KEY    — overrides the key file
 *   FEED_N               — number of leads to feed per run (default 40)
 *   FEED_OWNER           — filter by owner ('luke' | 'alex'). Omit for all.
 *
 * The "ready + researched" selection SQL:
 *
 *   SELECT id, email, name, company, website
 *   FROM   outreach_leads
 *   WHERE  "tenantId"  = $tenantId
 *     AND  status      = 'ready'
 *     AND  researched  = true
 *     AND  email IS NOT NULL
 *   [AND  owner = $owner  -- if FEED_OWNER is set]
 *   ORDER  BY number ASC
 *   LIMIT  $feedN;
 */

import postgres from "postgres"
import { InstantlyClient, type InstantlyLead } from "./instantly-client.js"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL
const TENANT_ID = process.env.TENANT_ID
const CAMPAIGN_ID = process.env.INSTANTLY_CAMPAIGN_ID
const FEED_N = parseInt(process.env.FEED_N ?? "40", 10)
const FEED_OWNER = process.env.FEED_OWNER as "luke" | "alex" | undefined
const COMMIT = process.argv.includes("--commit")

if (!DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!TENANT_ID) throw new Error("TENANT_ID is required")
if (isNaN(FEED_N) || FEED_N < 1) throw new Error("FEED_N must be a positive integer")
if (FEED_OWNER && FEED_OWNER !== "luke" && FEED_OWNER !== "alex")
  throw new Error("FEED_OWNER must be 'luke' or 'alex'")
if (COMMIT && !CAMPAIGN_ID)
  throw new Error("INSTANTLY_CAMPAIGN_ID is required when running with --commit")

const isLocal =
  DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require", max: 1 })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeadRow = {
  id: string
  number: number
  name: string
  company: string
  email: string
  website: string | null
  owner: string
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const T = TENANT_ID!

  console.log("── INSTANTLY FEED ────────────────────────────────────────────")
  console.log(`tenant           : ${T}`)
  console.log(`feed_n           : ${FEED_N}`)
  console.log(`owner filter     : ${FEED_OWNER ?? "(all)"}`)
  console.log(`campaign         : ${CAMPAIGN_ID ?? "(not set — dry-run safe)"}`)
  console.log(`mode             : ${COMMIT ? "COMMIT (will call Instantly API)" : "DRY RUN (read-only)"}`)
  console.log("")

  // ── Pull ready leads ─────────────────────────────────────────────────────

  // Ready + researched + has an email address.
  // status='ready' already excludes dnc by enum definition, but we add an
  // explicit guard for clarity and defence against future schema drift.
  let batch: LeadRow[]

  if (FEED_OWNER) {
    batch = await sql<LeadRow[]>`
      SELECT id, number, name, company, email, website, owner
      FROM   outreach_leads
      WHERE  "tenantId"  = ${T}
        AND  status      = 'ready'
        AND  researched  = true
        AND  email IS NOT NULL
        AND  status     != 'dnc'
        AND  owner       = ${FEED_OWNER}
      ORDER  BY number ASC
      LIMIT  ${FEED_N}
    `
  } else {
    batch = await sql<LeadRow[]>`
      SELECT id, number, name, company, email, website, owner
      FROM   outreach_leads
      WHERE  "tenantId"  = ${T}
        AND  status      = 'ready'
        AND  researched  = true
        AND  email IS NOT NULL
        AND  status     != 'dnc'
      ORDER  BY number ASC
      LIMIT  ${FEED_N}
    `
  }

  // Total ready pool size (for context)
  const [{ total }] = await sql<[{ total: number }]>`
    SELECT count(*)::int total
    FROM   outreach_leads
    WHERE  "tenantId" = ${T}
      AND  status     = 'ready'
      AND  researched = true
      AND  email IS NOT NULL
  `

  console.log(`ready + researched pool : ${total}`)
  console.log(`batch selected          : ${batch.length}`)
  console.log("")

  if (batch.length === 0) {
    console.log("No ready+researched leads with email addresses. Nothing to feed.")
    await sql.end()
    return
  }

  // ── Print what we would add ──────────────────────────────────────────────

  console.log("Leads to add:")
  for (const lead of batch) {
    console.log(
      `  #${String(lead.number).padEnd(5)} ${lead.email.padEnd(40)} ${lead.company.slice(0, 30)} [${lead.owner}]`,
    )
  }
  console.log("")

  if (!COMMIT) {
    console.log("DRY RUN — no Instantly API calls made. Re-run with --commit to upload.")
    await sql.end()
    return
  }

  // ── Commit: upload to Instantly ──────────────────────────────────────────

  const client = new InstantlyClient()
  const campaignId = CAMPAIGN_ID!

  // Verify the campaign exists before uploading (best-effort)
  const campaignsRes = await client.listCampaigns()
  if (campaignsRes.ok && campaignsRes.data?.items) {
    const found = campaignsRes.data.items.find((c) => c.id === campaignId)
    if (!found) {
      console.error(
        `Campaign ${campaignId} not found in Instantly workspace. Available campaigns:`,
      )
      for (const c of campaignsRes.data.items) {
        console.error(`  ${c.id}  ${c.name}`)
      }
      await sql.end()
      process.exit(1)
    }
    console.log(`Verified campaign: "${found.name}" (${campaignId})`)
    console.log("")
  } else {
    // Non-fatal — proceed even if we can't verify; the add calls will fail if invalid
    console.warn(
      `Could not verify campaign ID (listCampaigns returned ${campaignsRes.status}). Proceeding anyway.`,
    )
  }

  const instantly_leads: InstantlyLead[] = batch.map((l) => {
    const nameParts = l.name.trim().split(/\s+/)
    return {
      email: l.email.toLowerCase().trim(),
      first_name: nameParts[0] ?? "",
      last_name: nameParts.slice(1).join(" ") || undefined,
      company_name: l.company,
      website: l.website ?? undefined,
    }
  })

  console.log(`Uploading ${instantly_leads.length} leads to campaign ${campaignId}…`)
  const { added, failed } = await client.addLeadsToCampaign(campaignId, instantly_leads)

  console.log("")
  console.log("── FEED SUMMARY ──────────────────────────────────────────────")
  console.log(`attempted  : ${instantly_leads.length}`)
  console.log(`added      : ${added.length}`)
  console.log(`failed     : ${failed.length}`)
  if (failed.length > 0) {
    console.log("failures:")
    for (const f of failed) {
      console.log(`  ${f.email}  HTTP ${f.status}: ${f.error ?? ""}`)
    }
  }
  console.log("")
  console.log(
    "NOTE: leads are NOT marked 'sent' in the DB. That happens when Instantly " +
      "actually sends the email (update outreach_leads.status + create outreach_touches row).",
  )

  await sql.end()
}

main().catch(async (e) => {
  console.error(e)
  await sql.end()
  process.exit(1)
})
