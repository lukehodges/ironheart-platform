/**
 * Rotate "sent-and-done" leads out of Instantly to free contact slots.
 *
 * A lead is "sent-and-done" when:
 *   - status = 'sent'
 *   - reply  = false                          (no reply received)
 *   - the most recent outreach_touches.sentAt is older than N days (default 5)
 *
 * These leads have completed their sequence window with no engagement. They
 * are already recorded as sent in our DB so removing them from Instantly is
 * purely a slot-management operation.
 *
 * SENT-AND-DONE SQL (used in this script):
 *
 *   SELECT l.id, l.email, max(t."sentAt") AS last_sent
 *   FROM   outreach_leads l
 *   JOIN   outreach_touches t ON t."leadId" = l.id AND t."tenantId" = l."tenantId"
 *   WHERE  l."tenantId"  = $tenantId
 *     AND  l.status      = 'sent'
 *     AND  l.reply       = false
 *   GROUP  BY l.id, l.email
 *   HAVING max(t."sentAt") < now() - make_interval(days => $rotateDays)
 *   ORDER  BY last_sent ASC;
 *
 * Matching approach:
 *   Instantly contacts are keyed by email address. We match the candidate by
 *   email and call DELETE /leads/:email. No separate Instantly lead-id lookup
 *   is needed. If Instantly returns 404 the slot is already free — we still
 *   count it as a success (idempotent).
 *
 * Usage (DRY RUN by default):
 *
 *   DATABASE_URL="postgres://dev:dev@localhost:5433/ironheart_platform_dev" \
 *   TENANT_ID="d3c13008-2826-4111-b546-b383e8e9df77" \
 *   npx tsx --tsconfig tsconfig.json scripts/instantly-rotate.ts
 *
 *   # Actually remove them from Instantly:
 *   DATABASE_URL="..." TENANT_ID="..." \
 *   npx tsx --tsconfig tsconfig.json scripts/instantly-rotate.ts --commit
 *
 * Optional env:
 *   INSTANTLY_API_KEY   — overrides the key file
 *   ROTATE_AFTER_DAYS   — days of silence before a lead is rotatable (default 5)
 */

import postgres from "postgres"
import { InstantlyClient } from "./instantly-client.js"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL
const TENANT_ID = process.env.TENANT_ID
const ROTATE_AFTER_DAYS = parseInt(process.env.ROTATE_AFTER_DAYS ?? "5", 10)
const COMMIT = process.argv.includes("--commit")

if (!DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!TENANT_ID) throw new Error("TENANT_ID is required")
if (isNaN(ROTATE_AFTER_DAYS) || ROTATE_AFTER_DAYS < 1)
  throw new Error("ROTATE_AFTER_DAYS must be a positive integer")

const isLocal =
  DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require", max: 1 })

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const T = TENANT_ID!

  console.log("── INSTANTLY ROTATE ──────────────────────────────────────────")
  console.log(`tenant          : ${T}`)
  console.log(`rotate_after    : ${ROTATE_AFTER_DAYS} days`)
  console.log(`mode            : ${COMMIT ? "COMMIT (will call Instantly API)" : "DRY RUN (read-only)"}`)
  console.log("")

  // ── Find candidates ─────────────────────────────────────────────────────

  // Sent-and-done: status=sent, no reply, latest touch older than N days.
  // Leads that have no touch record at all are excluded — they may have been
  // marked sent directly from the spreadsheet import and we cannot confirm
  // when they were sent via Instantly specifically.
  type CandidateRow = { id: string; email: string | null; last_sent: Date }

  const candidates = await sql<CandidateRow[]>`
    SELECT l.id, l.email, max(t."sentAt") AS last_sent
    FROM   outreach_leads l
    JOIN   outreach_touches t
           ON t."leadId" = l.id AND t."tenantId" = l."tenantId"
    WHERE  l."tenantId" = ${T}
      AND  l.status     = 'sent'
      AND  l.reply      = false
    GROUP  BY l.id, l.email
    HAVING max(t."sentAt") < now() - make_interval(days => ${ROTATE_AFTER_DAYS})
    ORDER  BY last_sent ASC
  `

  const withEmail = candidates.filter((c) => !!c.email)
  const noEmail = candidates.filter((c) => !c.email)

  console.log(`candidates found  : ${candidates.length}`)
  console.log(`  with email      : ${withEmail.length}  (actionable)`)
  console.log(
    `  without email   : ${noEmail.length}  (skipped — can't match in Instantly without email)`,
  )
  if (withEmail.length > 0) {
    const oldest = withEmail[0]
    const newest = withEmail[withEmail.length - 1]
    console.log(
      `  oldest last_sent: ${oldest.last_sent.toISOString().slice(0, 10)}`,
    )
    console.log(
      `  newest last_sent: ${newest.last_sent.toISOString().slice(0, 10)}`,
    )
  }
  console.log("")

  if (withEmail.length === 0) {
    console.log("Nothing to rotate. Exiting.")
    await sql.end()
    return
  }

  if (!COMMIT) {
    console.log("DRY RUN — no Instantly API calls made. Re-run with --commit to remove leads.")
    console.log("\nSample (first 10):")
    for (const c of withEmail.slice(0, 10)) {
      console.log(
        `  ${(c.email ?? "").padEnd(40)}  last_sent: ${c.last_sent.toISOString().slice(0, 10)}`,
      )
    }
    await sql.end()
    return
  }

  // ── Commit: remove from Instantly ───────────────────────────────────────

  const client = new InstantlyClient()

  // Contact count before removal (best-effort — may return null)
  const countBefore = await client.getWorkspaceContactCount()
  console.log(
    `workspace contacts before: ${countBefore !== null ? countBefore : "(unavailable — see ASSUMPTION in instantly-client.ts)"}`,
  )
  console.log("")
  console.log(`Removing ${withEmail.length} leads from Instantly…`)

  let removed = 0
  let errored = 0
  const errors: Array<{ email: string; reason: string }> = []

  for (const candidate of withEmail) {
    const email = candidate.email!
    const success = await client.deleteLead(email)
    if (success) {
      removed++
    } else {
      errored++
      errors.push({ email, reason: "API delete returned unexpected error — see logs above" })
    }
    // Small pace to avoid hammering the API
    await sleep(80)
  }

  const countAfter = await client.getWorkspaceContactCount()

  console.log("")
  console.log("── ROTATE SUMMARY ────────────────────────────────────────────")
  console.log(`candidates        : ${candidates.length}`)
  console.log(`actionable (email): ${withEmail.length}`)
  console.log(`removed           : ${removed}`)
  console.log(`errors            : ${errored}`)
  if (errors.length > 0) {
    console.log("error details:")
    for (const e of errors) console.log(`  ${e.email}: ${e.reason}`)
  }
  if (countAfter !== null) {
    console.log(`workspace contacts after : ${countAfter}`)
    if (countBefore !== null) {
      console.log(`freed slots (reported)   : ${countBefore - countAfter}`)
    }
  } else {
    console.log(
      "workspace contacts after : (unavailable — check Instantly UI for current usage)",
    )
  }

  await sql.end()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch(async (e) => {
  console.error(e)
  await sql.end()
  process.exit(1)
})
