/**
 * Migrate the Master Lead List XLSX + DO_NOT_CONTACT.csv into the outreach
 * module tables (`outreach_leads` + `outreach_dnc_list`) for one tenant.
 *
 * Idempotent: wipes the tenant's leads/dnc/touches/replies, then reloads.
 * DRY RUN by default — pass --commit to actually write.
 *
 *   DATABASE_URL=postgres://dev:dev@localhost:5433/ironheart_platform_dev \
 *   TENANT_ID=d3c13008-2826-4111-b546-b383e8e9df77 \
 *   npx tsx --tsconfig tsconfig.json scripts/import-leads.ts [--commit]
 *
 * Column mapping (verified against the live XLSX header, 2026-08-02):
 *   0 Sent from · 1 # · 2 Name · 3 Status · 4 Follow-up · 5 Next follow-up ·
 *   6 Last contacted · 7 Reply? · 8 Reply sentiment · 9 Research notes ·
 *   10 Company · 11 Category · 12 Email · 13 Website · 14 Source · 15 Researched
 */
import * as XLSX from "xlsx"
import { parse } from "csv-parse/sync"
import fs from "node:fs"
import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL
const TENANT_ID = process.env.TENANT_ID
const XLSX_PATH =
  process.env.XLSX_PATH ??
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/1-cold/Master Lead List - UNIFIED.xlsx"
const DNC_CSV =
  process.env.DNC_CSV ??
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/1-cold/DO_NOT_CONTACT.csv"
const COMMIT = process.argv.includes("--commit")

if (!DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!TENANT_ID) throw new Error("TENANT_ID is required")

const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require", max: 1 })

// ---- column indices ----
const C = {
  sentFrom: 0, num: 1, name: 2, status: 3, followUp: 4, nextFollowUp: 5,
  lastContacted: 6, reply: 7, sentiment: 8, research: 9, company: 10,
  category: 11, email: 12, website: 13, source: 14, researched: 15,
} as const

// ---- helpers ----
const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}
const lower = (v: unknown): string | null => str(v)?.toLowerCase() ?? null
const bool = (v: unknown): boolean => {
  if (v === true) return true
  const s = str(v)?.toLowerCase()
  return s === "yes" || s === "true" || s === "1" || s === "y" || s === "x"
}
const excelDate = (v: unknown): string | null => {
  // Format from LOCAL components, not toISOString() — with cellDates:true XLSX
  // yields dates at local midnight, and toISOString() shifts to UTC, rolling the
  // date back a day in any timezone ahead of UTC (e.g. BST). That was the −1-day bug.
  if (v instanceof Date)
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`
  if (typeof v === "number") {
    const d = XLSX.SSF?.parse_date_code?.(v)
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`
  }
  const s = str(v)
  if (s && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}
const mapSentiment = (v: unknown): string | null => {
  const s = lower(v)
  if (!s) return null
  if (s.startsWith("pos")) return "positive"
  if (s.startsWith("neg")) return "negative"
  if (s.startsWith("neu")) return "neutral"
  return null
}
const mapOwner = (sentFrom: unknown): "alex" | "luke" | null => {
  const s = lower(sentFrom)
  if (!s) return null
  if (s.includes("alex")) return "alex"
  if (s.includes("luke")) return "luke"
  return null
}
// Returns the send-state enum + the original tier string when Status is a tier
// (Silver / Platinum / Gold) rather than a plain state.
const TIER_RE = /(platinum|gold|silver)/i
const mapStatus = (raw: unknown): { status: string; tier: string | null } => {
  const s = str(raw)
  const low = s?.toLowerCase() ?? ""
  if (low === "sent") return { status: "sent", tier: null }
  if (low === "skipped") return { status: "skipped", tier: null }
  if (low.startsWith("do not contact") || low === "dnc") return { status: "dnc", tier: null }
  if (low === "draft") return { status: "draft", tier: null }
  if (low === "ready") return { status: "ready", tier: null }
  if (s && TIER_RE.test(s)) return { status: "ready", tier: s } // unsent tiered lead → contactable
  return { status: "ready", tier: s } // unknown/blank → contactable, preserve original
}
const domainOf = (email: string | null): string | null => {
  if (!email) return null
  const at = email.lastIndexOf("@")
  return at > 0 && at < email.length - 1 ? email.slice(at + 1).toLowerCase() : null
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true })

  // owner backstop: email -> owner, from the Alex / Luke sheets
  const ownerByEmail = new Map<string, "alex" | "luke">()
  for (const [sheet, owner] of [["Alex", "alex"], ["Luke", "luke"]] as const) {
    const ws = wb.Sheets[sheet]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false }).slice(1)
    for (const r of rows) {
      const e = lower(r[C.email])
      if (e) ownerByEmail.set(e, owner)
    }
  }

  const master = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Master"], { header: 1, blankrows: false }).slice(1)

  const leads: Record<string, unknown>[] = []
  const dncByEmail = new Map<string, { email: string; domain: string | null; reason: string | null; addedAt: string | null; addedBy: string | null }>()
  const seenEmail = new Set<string>()
  const now = new Date()
  let skippedNoName = 0, dupEmail = 0
  const byStatus: Record<string, number> = {}
  const byOwner: Record<string, number> = {}
  let tierCount = 0

  let n = 0
  for (const r of master) {
    const name = str(r[C.name])
    const company = str(r[C.company])
    if (!name || !company) { skippedNoName++; continue }
    const email = lower(r[C.email])
    if (email && seenEmail.has(email)) { dupEmail++; continue }
    if (email) seenEmail.add(email)

    const { status, tier } = mapStatus(r[C.status])
    const owner = mapOwner(r[C.sentFrom]) ?? (email ? ownerByEmail.get(email) : null) ?? "alex"
    n++

    leads.push({
      tenantId: TENANT_ID,
      number: n,
      owner,
      status,
      name,
      company,
      category: str(r[C.category]),
      email,
      website: str(r[C.website]),
      source: str(r[C.source]),
      researched: bool(r[C.researched]),
      followUpFlag: bool(r[C.followUp]),
      lastContactedAt: excelDate(r[C.lastContacted]),
      nextFollowUpAt: excelDate(r[C.nextFollowUp]),
      reply: bool(r[C.reply]),
      replySentiment: mapSentiment(r[C.sentiment]),
      researchNotes: str(r[C.research]),
      notes: tier ? `tier: ${tier}` : null,
      hypothesisWeekId: null,
      createdAt: now,
      updatedAt: now,
    })
    byStatus[status] = (byStatus[status] ?? 0) + 1
    byOwner[owner] = (byOwner[owner] ?? 0) + 1
    if (tier) tierCount++

    if (status === "dnc" && email) {
      dncByEmail.set(email, { email, domain: domainOf(email), reason: str(r[C.research]) ?? "legacy: Do Not Contact", addedAt: excelDate(r[C.lastContacted]), addedBy: "legacy_import" })
    }
  }

  // DNC from the CSV
  let dncCsv = 0
  if (fs.existsSync(DNC_CSV)) {
    const recs = parse(fs.readFileSync(DNC_CSV, "utf8"), { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true }) as Record<string, string>[]
    for (const row of recs) {
      const email = lower(row.email)
      if (!email) continue
      dncCsv++
      dncByEmail.set(email, {
        email, domain: domainOf(email),
        reason: str(row.reason) ?? "legacy DNC",
        addedAt: /^\d{4}-\d{2}-\d{2}/.test(row.date_requested ?? "") ? row.date_requested.slice(0, 10) : null,
        addedBy: str(row.name) ?? "legacy_import",
      })
    }
  }

  const dnc = [...dncByEmail.values()]

  console.log("── PARSE SUMMARY ──")
  console.log("leads to import:", leads.length)
  console.log("  by status:", byStatus)
  console.log("  by owner :", byOwner)
  console.log("  tier preserved in notes:", tierCount)
  console.log("skipped (no name/company):", skippedNoName, " dup emails:", dupEmail)
  console.log("dnc_list entries:", dnc.length, `(from ${dncCsv} csv + master dnc rows, deduped)`)

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit to load.")
    console.log("sample lead:", JSON.stringify(leads[0], null, 2))
    await sql.end(); return
  }

  // ensure tenant exists
  const [t] = await sql`select id from tenants where id = ${TENANT_ID}`
  if (!t) throw new Error(`Tenant ${TENANT_ID} not found — aborting.`)

  await sql.begin(async (tx) => {
    await tx`delete from outreach_replies where "tenantId" = ${TENANT_ID}`
    await tx`delete from outreach_touches where "tenantId" = ${TENANT_ID}`

    // ── NEW: wipe intelligence tables before re-import (idempotent) ──────────
    await tx`delete from outreach_lead_tags        where "tenantId" = ${TENANT_ID}`
    await tx`delete from outreach_lead_provenance  where "tenantId" = ${TENANT_ID}`
    await tx`delete from outreach_lead_source_records where "tenantId" = ${TENANT_ID}`
    // ─────────────────────────────────────────────────────────────────────────

    await tx`delete from outreach_leads   where "tenantId" = ${TENANT_ID}`
    await tx`delete from outreach_dnc_list where "tenantId" = ${TENANT_ID}`

    const leadCols = ["tenantId","number","owner","status","name","company","category","email","website","source","researched","followUpFlag","lastContactedAt","nextFollowUpAt","reply","replySentiment","researchNotes","notes","hypothesisWeekId","createdAt","updatedAt"] as const
    for (let i = 0; i < leads.length; i += 500) {
      await tx`insert into outreach_leads ${tx(leads.slice(i, i + 500), ...leadCols)}`
    }
    if (dnc.length) {
      const dncRows = dnc.map((d) => ({ tenantId: TENANT_ID, email: d.email, domain: d.domain, reason: d.reason, addedAt: d.addedAt ?? now, addedBy: d.addedBy }))
      await tx`insert into outreach_dnc_list ${tx(dncRows, "tenantId","email","domain","reason","addedAt","addedBy")}`
    }

    // ── NEW STEP 1: populate outreach_lead_source_records ────────────────────
    // One row per lead: source = "master-xlsx", raw = the full mapped object.
    // We build source records in the same 500-row batches as leads.
    const sourceRecordRows = leads.map((lead) => ({
      tenantId: TENANT_ID,
      source: "master-xlsx",
      email: lead.email as string | null,
      raw: JSON.stringify({
        number: lead.number,
        owner: lead.owner,
        status: lead.status,
        name: lead.name,
        company: lead.company,
        category: lead.category,
        email: lead.email,
        website: lead.website,
        source: lead.source,
        researched: lead.researched,
        followUpFlag: lead.followUpFlag,
        lastContactedAt: lead.lastContactedAt,
        nextFollowUpAt: lead.nextFollowUpAt,
        reply: lead.reply,
        replySentiment: lead.replySentiment,
        researchNotes: lead.researchNotes,
        notes: lead.notes,
      }),
      importedAt: now,
      createdAt: now,
    }))

    for (let i = 0; i < sourceRecordRows.length; i += 500) {
      await tx`
        insert into outreach_lead_source_records ${tx(
          sourceRecordRows.slice(i, i + 500),
          "tenantId", "source", "email", "raw", "importedAt", "createdAt"
        )}
      `
    }

    // ── NEW STEP 2: populate outreach_lead_provenance ─────────────────────────
    // Fetch the just-inserted lead ids and source record ids in email order
    // so we can zip them. Both tables are keyed by (tenantId, email) for the
    // subset with emails; for email-less rows we match by insert sequence
    // (number column).
    //
    // Strategy: join on email where available, fall back to number-order join.
    const provenanceRows = await tx<{ leadId: string; sourceRecordId: string }[]>`
      with l as (
        select id as "leadId", email, number
        from outreach_leads
        where "tenantId" = ${TENANT_ID}
      ),
      s as (
        select id as "sourceRecordId", email,
               row_number() over (order by "importedAt", id) as rn
        from outreach_lead_source_records
        where "tenantId" = ${TENANT_ID} and source = 'master-xlsx'
      ),
      l_rn as (
        select "leadId", email, row_number() over (order by number) as rn
        from l
      )
      select
        l_rn."leadId",
        s."sourceRecordId"
      from l_rn
      join s on (
        case
          when l_rn.email is not null and s.email is not null
            then l_rn.email = s.email
          else l_rn.rn = s.rn
        end
      )
    `

    if (provenanceRows.length) {
      const provRows = provenanceRows.map((r) => ({
        tenantId: TENANT_ID,
        leadId: r.leadId,
        sourceRecordId: r.sourceRecordId,
        createdAt: now,
      }))
      for (let i = 0; i < provRows.length; i += 500) {
        await tx`
          insert into outreach_lead_provenance ${tx(
            provRows.slice(i, i + 500),
            "tenantId", "leadId", "sourceRecordId", "createdAt"
          )}
        `
      }
    }

    // ── NEW STEP 3: populate outreach_lead_tags ───────────────────────────────
    // Per lead: emit a "category" tag (when category present) + a "tier" tag
    // (when notes contains "tier: ..."). origin = "ironheart".
    const insertedLeads = await tx<{ id: string; category: string | null; notes: string | null }[]>`
      select id, category, notes
      from outreach_leads
      where "tenantId" = ${TENANT_ID}
    `
    const tierNoteRe = /^tier:\s*(.+)$/i
    const tagRows: Record<string, unknown>[] = []
    for (const l of insertedLeads) {
      if (l.category) {
        tagRows.push({
          tenantId: TENANT_ID,
          leadId: l.id,
          namespace: "category",
          value: l.category.trim().toLowerCase(),
          origin: "ironheart",
          confidence: null,
          createdAt: now,
        })
      }
      if (l.notes) {
        const m = l.notes.match(tierNoteRe)
        if (m) {
          tagRows.push({
            tenantId: TENANT_ID,
            leadId: l.id,
            namespace: "tier",
            value: m[1].trim().toLowerCase(),
            origin: "ironheart",
            confidence: null,
            createdAt: now,
          })
        }
      }
    }
    if (tagRows.length) {
      for (let i = 0; i < tagRows.length; i += 500) {
        await tx`
          insert into outreach_lead_tags ${tx(
            tagRows.slice(i, i + 500),
            "tenantId", "leadId", "namespace", "value", "origin", "confidence", "createdAt"
          )}
        `
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
  })

  const [{ lc }] = await sql`select count(*)::int lc from outreach_leads where "tenantId" = ${TENANT_ID}`
  const [{ dc }] = await sql`select count(*)::int dc from outreach_dnc_list where "tenantId" = ${TENANT_ID}`
  const [{ src }] = await sql`select count(*)::int src from outreach_lead_source_records where "tenantId" = ${TENANT_ID}`
  const [{ prov }] = await sql`select count(*)::int prov from outreach_lead_provenance where "tenantId" = ${TENANT_ID}`
  const [{ tags }] = await sql`select count(*)::int tags from outreach_lead_tags where "tenantId" = ${TENANT_ID}`
  console.log(`\n✅ COMMITTED — outreach_leads: ${lc}, outreach_dnc_list: ${dc}, source_records: ${src}, provenance: ${prov}, tags: ${tags}`)
  await sql.end()
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1) })
