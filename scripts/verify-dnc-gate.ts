/**
 * Throwaway verification for the DNC suppression gate (2026-08-02).
 * Proves, against the real dev Postgres, that:
 *   1. ready+researched leads are pullable
 *   2. adding a lead's email to DNC (mixed-case) removes it from pullBatch
 *   3. the DNC'd lead row is flipped to status=dnc
 *   4. isOnDnc matches case-insensitively
 *   5. domain-level DNC suppresses matching leads too
 * Run with an explicit DATABASE_URL pointing at the dev DB, then delete this file.
 */
import { outreachService } from "@/modules/outreach/outreach.service"
import { outreachRepository } from "@/modules/outreach/outreach.repository"
import { db } from "@/shared/db"
import { sql } from "drizzle-orm"

const TENANT = crypto.randomUUID() // tenantId is a uuid column
const ctx = { tenantId: TENANT } as never // service only reads ctx.tenantId here

let failed = false
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✅" : "❌ FAIL:"} ${msg}`)
  if (!cond) failed = true
}

async function main() {
  // throwaway tenant to satisfy the FK (cleaned up at the end)
  await db.execute(sql`
    insert into tenants (id, name, slug, "updatedAt")
    values (${TENANT}, 'DNC Gate Test', ${"dnc-test-" + TENANT.slice(0, 8)}, now())
  `)

  const a = await outreachRepository.createLead(TENANT, {
    owner: "alex", name: "Lead A", company: "Bar Ltd",
    email: "Foo@Bar.com", status: "ready", researched: true, // mixed-case on purpose
  })
  const b = await outreachRepository.createLead(TENANT, {
    owner: "alex", name: "Lead B", company: "Safe Ltd",
    email: "keep@safe.com", status: "ready", researched: true,
  })

  // 1. both pullable
  let batch = await outreachService.pullBatch(ctx, { owner: "alex", count: 50 })
  let ids = batch.map((l) => l.id)
  check(ids.includes(a.id) && ids.includes(b.id), "both leads pullable before any DNC")

  // 2. DNC A by email, mixed-case input (mirror service.addDnc: insert + flip)
  const dnc = await outreachRepository.addDnc(TENANT, { email: "FOO@bar.COM", reason: "test" })
  await outreachRepository.suppressMatchingLeads(TENANT, dnc.email, dnc.domain)

  // 3. A excluded, B kept
  batch = await outreachService.pullBatch(ctx, { owner: "alex", count: 50 })
  ids = batch.map((l) => l.id)
  check(!ids.includes(a.id), "DNC'd lead (mixed-case email) EXCLUDED from pullBatch")
  check(ids.includes(b.id), "non-DNC lead still pullable")

  // 4. A flipped to dnc
  const aAfter = await outreachRepository.getLead(TENANT, a.id)
  check(aAfter?.status === "dnc", "DNC'd lead row flipped to status=dnc")

  // 5. isOnDnc canonical match
  check((await outreachRepository.isOnDnc(TENANT, "foo@bar.com")) === true, "isOnDnc matches lowercased address")

  // 6. domain-level DNC on safe.com → B gone
  const dnc2 = await outreachRepository.addDnc(TENANT, { domain: "Safe.com", reason: "test-domain" })
  await outreachRepository.suppressMatchingLeads(TENANT, dnc2.email, dnc2.domain)
  batch = await outreachService.pullBatch(ctx, { owner: "alex", count: 50 })
  check(batch.length === 0, "domain-level DNC excludes remaining lead (empty batch)")
  const bAfter = await outreachRepository.getLead(TENANT, b.id)
  check(bAfter?.status === "dnc", "domain-matched lead flipped to dnc")

  // cleanup
  await db.execute(sql`delete from outreach_leads where "tenantId" = ${TENANT}`)
  await db.execute(sql`delete from outreach_dnc_list where "tenantId" = ${TENANT}`)
  await db.execute(sql`delete from tenants where id = ${TENANT}`)

  console.log(failed ? "\n❌ SOME CHECKS FAILED" : "\n✅ ALL CHECKS PASSED")
  await client_end()
  process.exit(failed ? 1 : 0)
}

// close the pg pool so the process exits promptly
async function client_end() {
  try { await (db as unknown as { $client?: { end?: () => Promise<void> } }).$client?.end?.() } catch { /* noop */ }
}

main().catch(async (e) => { console.error(e); await client_end(); process.exit(1) })
