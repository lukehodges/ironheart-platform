/**
 * import-outreach-legacy — One-shot importer for legacy outreach data.
 *
 * Loads:
 *   - Weekly hypotheses (hardcoded, 6 weeks: W19..W24)
 *   - Master Lead List xlsx → outreach_leads (Active + Skipped + DNC sheets)
 *   - Forensic deep-research JSON → upserts research notes onto leads
 *   - Daily activity numbers (hardcoded) → outreach_daily_activity
 *
 * Safe to re-run: wipes all outreach_* rows for the target tenant first.
 *
 * Usage:  npx tsx scripts/import-outreach-legacy.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import * as path from "node:path"
import * as fs from "node:fs"
import * as XLSX from "xlsx"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { sql, eq, and } from "drizzle-orm"
import {
  leads,
  dailyActivity,
  weeklyHypothesis,
} from "../src/shared/db/schemas/outreach.schema"

const TENANT_ID = "43cf4a66-4252-43e8-933e-9cfb73f12886"
const XLSX_PATH =
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/Outreach/Master Lead List - UNIFIED.xlsx"
const FORENSIC_PATH =
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/Outreach_v2/research/forensic_2026-06-12_monday-batch.json"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Hardcoded data
// ---------------------------------------------------------------------------

type Verdict = "pending" | "testing" | "keep" | "mutate" | "kill" | "baseline"
type HypStatus = "active" | "complete"

interface HypothesisSeed {
  week: string
  startDate: string
  endDate: string
  title: string
  body: string
  targetSample: number
  targetReplyPct: number
  targetPositivePct: number
  targetBooked: number
  verdict: Verdict
  status: HypStatus
  replaces?: string
  resultSummary: string | null
}

const HYPOTHESES: HypothesisSeed[] = [
  {
    week: "2026-W19",
    startDate: "2026-05-04",
    endDate: "2026-05-10",
    title: "Industry-cluster targeting · medical clinics",
    body: "Single-vertical week (medical clinics in SW England). One proof point, one offer line, one CTA.",
    targetSample: 40,
    targetReplyPct: 9,
    targetPositivePct: 4,
    targetBooked: 1,
    verdict: "keep",
    status: "complete",
    resultSummary:
      "Vertical focus held attention — 9% reply, 1 booked. Kept as a recurring play.",
  },
  {
    week: "2026-W20",
    startDate: "2026-05-11",
    endDate: "2026-05-17",
    title: "25-send/day discipline · founder-led ICP",
    body: "Hard cap 25/day per operator. Strict ICP filter: 3-15 employees, owner-led, founder still in business.",
    targetSample: 55,
    targetReplyPct: 11,
    targetPositivePct: 4,
    targetBooked: 1,
    verdict: "keep",
    status: "complete",
    resultSummary:
      "Discipline paid — Bath baseline emerged here (11% reply, 4% positive). Owner-led filter sticks.",
  },
  {
    week: "2026-W21",
    startDate: "2026-05-18",
    endDate: "2026-05-24",
    title: 'Identity-first opener, "I\'m curious" pivot',
    body: 'Lead with identity (Bath student), pivot via "I\'m curious" question about their workflow. Subject lines rotated 3 ways.',
    targetSample: 60,
    targetReplyPct: 8,
    targetPositivePct: 3,
    targetBooked: 1,
    verdict: "kill",
    status: "complete",
    resultSummary:
      "Identity-first read templated. Reply rate dropped to 1.8%. Killed — back to direct observation lead.",
  },
  {
    week: "2026-W22",
    startDate: "2026-05-25",
    endDate: "2026-05-31",
    title: "Cold mailto + meme follow-up · non-local",
    body: "First-touch standard template, follow-up uses meme image pattern-break. Mixed UK targets, not Bath-only.",
    targetSample: 50,
    targetReplyPct: 8,
    targetPositivePct: 3,
    targetBooked: 1,
    verdict: "mutate",
    status: "complete",
    resultSummary:
      "Pattern-break helped marginally (6.7% reply). Mutate: keep follow-up format, drop non-local targeting.",
  },
  {
    week: "2026-W23",
    startDate: "2026-06-01",
    endDate: "2026-06-07",
    title: "Template + £200 audit offer · Bath / Bristol",
    body: "Standard rotation template, £200 audit setup-fee floor. Local-first targeting (Bath / Bristol owners under 50 staff).",
    targetSample: 130,
    targetReplyPct: 11,
    targetPositivePct: 4,
    targetBooked: 2,
    verdict: "baseline",
    status: "complete",
    replaces: "Wk 22 meme pattern-break",
    resultSummary:
      "Bath baseline confirmed — 11% reply, 4% positive, 2 booked. The bar to beat for Wk 24.",
  },
  {
    week: "2026-W24",
    startDate: "2026-06-08",
    endDate: "2026-06-14",
    title: "Observation-first, no template scaffold",
    body: 'Drop identity-line + proof-line scaffold. Lead with a verbatim operational artefact you found on their site (hardcoded promo code, placeholder href, "New Form" Squarespace block). Cap at 8 sends/day. If 10 min of forensic research surfaces nothing real → skip the lead, don\'t soft-template.',
    targetSample: 175,
    targetReplyPct: 11,
    targetPositivePct: 4,
    targetBooked: 4,
    verdict: "testing",
    status: "active",
    replaces: "Wk 23 template+offer",
    resultSummary: null,
  },
]

const DAILY = [
  { d: "2026-05-11", o: "luke", sent: 8, replies: 2, positive: 1, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-12", o: "luke", sent: 6, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-13", o: "luke", sent: 11, replies: 1, positive: 0, booked: 1, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-14", o: "luke", sent: 14, replies: 2, positive: 2, booked: 1, taken: 1, interested: 1, closed: 0 },
  { d: "2026-05-18", o: "luke", sent: 14, replies: 1, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-25", o: "luke", sent: 18, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-25", o: "alex", sent: 1, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-26", o: "alex", sent: 6, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-05-27", o: "alex", sent: 20, replies: 3, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-02", o: "alex", sent: 4, replies: 1, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-03", o: "luke", sent: 11, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-03", o: "alex", sent: 24, replies: 1, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-04", o: "alex", sent: 15, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-08", o: "luke", sent: 18, replies: 1, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-08", o: "alex", sent: 25, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-09", o: "luke", sent: 19, replies: 1, positive: 1, booked: 1, taken: 1, interested: 1, closed: 0 },
  { d: "2026-06-10", o: "luke", sent: 11, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-11", o: "luke", sent: 2, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0 },
  { d: "2026-06-11", o: "alex", sent: 32, replies: 2, positive: 1, booked: 0, taken: 0, interested: 0, closed: 0 },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Owner = "luke" | "alex"
type LeadStatus = "ready" | "draft" | "sent" | "skipped" | "dnc"
type ReplySentiment = "positive" | "neutral" | "negative" | null

function toExcelDate(val: unknown): string | null {
  if (val == null || val === "") return null
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10)
  }
  if (typeof val === "number") {
    const parsed = XLSX.SSF.parse_date_code(val)
    if (!parsed) return null
    const yyyy = String(parsed.y).padStart(4, "0")
    const mm = String(parsed.m).padStart(2, "0")
    const dd = String(parsed.d).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }
  if (typeof val === "string") {
    const t = val.trim()
    if (!t) return null
    // already iso?
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
    const d = new Date(t)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    return null
  }
  return null
}

function lowerStr(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s.toLowerCase() : null
}

function trimStr(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}

function toBool(v: unknown): boolean {
  if (v == null || v === "") return false
  if (typeof v === "boolean") return v
  if (typeof v === "number") return v !== 0
  const s = String(v).trim().toLowerCase()
  return s === "true" || s === "yes" || s === "1" || s === "y"
}

function mapOwner(v: unknown): Owner {
  const s = lowerStr(v)
  if (s === "alex") return "alex"
  return "luke"
}

function mapStatus(v: unknown, fallback: LeadStatus): LeadStatus {
  const s = lowerStr(v)
  if (s === "ready" || s === "draft" || s === "sent" || s === "skipped" || s === "dnc") {
    return s
  }
  return fallback
}

function mapSentiment(v: unknown): ReplySentiment {
  const s = lowerStr(v)
  if (s === "positive" || s === "neutral" || s === "negative") return s
  return null
}

function weekIdForDate(
  date: string,
  hypMap: Map<string, { id: string; startDate: string; endDate: string }>,
): string | null {
  for (const h of hypMap.values()) {
    if (date >= h.startDate && date <= h.endDate) return h.id
  }
  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const pg = postgres(DATABASE_URL!, { ssl: "require", max: 1 })
  const db = drizzle(pg, { schema: { leads, dailyActivity, weeklyHypothesis } })

  console.log(`Connected. Tenant ${TENANT_ID}.`)

  // ----- Step 1: wipe existing outreach data for this tenant -----
  console.log("Wiping existing outreach data for tenant...")
  await pg`DELETE FROM outreach_replies WHERE "tenantId" = ${TENANT_ID}`
  await pg`DELETE FROM outreach_touches WHERE "tenantId" = ${TENANT_ID}`
  await pg`DELETE FROM outreach_leads WHERE "tenantId" = ${TENANT_ID}`
  await pg`DELETE FROM outreach_daily_activity WHERE "tenantId" = ${TENANT_ID}`
  await pg`DELETE FROM outreach_weekly_hypothesis WHERE "tenantId" = ${TENANT_ID}`
  await pg`DELETE FROM outreach_dnc_list WHERE "tenantId" = ${TENANT_ID}`
  console.log("  wiped.")

  // ----- Step 2: insert hypotheses in order, capture ids -----
  console.log("Inserting weekly hypotheses...")
  const hypMap = new Map<
    string,
    { id: string; startDate: string; endDate: string }
  >()
  let prevId: string | null = null
  for (const h of HYPOTHESES) {
    const [row] = await db
      .insert(weeklyHypothesis)
      .values({
        tenantId: TENANT_ID,
        week: h.week,
        startDate: h.startDate,
        endDate: h.endDate,
        title: h.title,
        body: h.body,
        targetSample: h.targetSample,
        targetReplyPct: String(h.targetReplyPct),
        targetPositivePct: String(h.targetPositivePct),
        targetBooked: h.targetBooked,
        status: h.status,
        verdict: h.verdict,
        replaces: h.replaces ?? null,
        resultSummary: h.resultSummary,
        prevWeekId: prevId,
      })
      .returning({ id: weeklyHypothesis.id })
    hypMap.set(h.week, { id: row.id, startDate: h.startDate, endDate: h.endDate })
    prevId = row.id
  }
  console.log(`  inserted ${hypMap.size} hypotheses.`)

  // ----- Step 3: read xlsx + collect leads -----
  console.log(`Reading ${XLSX_PATH}...`)
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true })

  interface LeadInsertShape {
    tenantId: string
    number: number
    owner: Owner
    status: LeadStatus
    name: string
    company: string
    category: string | null
    email: string | null
    website: string | null
    source: string | null
    researched: boolean
    followUpFlag: boolean
    lastContactedAt: string | null
    nextFollowUpAt: string | null
    reply: boolean
    replySentiment: ReplySentiment
    researchNotes: string | null
    notes: string | null
    hypothesisWeekId: string | null
  }

  const collected: LeadInsertShape[] = []
  const seenNumbers = new Set<number>()
  const seenEmails = new Set<string>()
  const warnings: string[] = []

  const readSheet = (sheetName: string, fallbackStatus: LeadStatus) => {
    const sheet = wb.Sheets[sheetName]
    if (!sheet) {
      warnings.push(`Sheet ${sheetName} missing`)
      return
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    })
    // header in row 0; data from row 1
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r) continue
      const num = r[0]
      const owner = r[1]
      // skip empties
      if (num == null && owner == null) continue
      const number = typeof num === "number" ? num : parseInt(String(num), 10)
      if (!Number.isFinite(number)) {
        warnings.push(`${sheetName} row ${i + 1}: missing #, skipped`)
        continue
      }
      const name = trimStr(r[5])
      const company = trimStr(r[6])
      if (!name || !company) {
        warnings.push(`${sheetName} row ${i + 1} (#${number}): missing name/company, skipped`)
        continue
      }
      const email = lowerStr(r[8])
      collected.push({
        tenantId: TENANT_ID,
        number,
        owner: mapOwner(owner),
        status: mapStatus(r[2], fallbackStatus),
        name,
        company,
        category: trimStr(r[7]),
        email,
        website: trimStr(r[9]),
        source: trimStr(r[16]),
        researched: toBool(r[4]),
        followUpFlag: toBool(r[3]),
        lastContactedAt: toExcelDate(r[10]),
        nextFollowUpAt: toExcelDate(r[11]),
        reply: toBool(r[12]),
        replySentiment: mapSentiment(r[13]),
        researchNotes: trimStr(r[14]),
        notes: trimStr(r[15]),
        hypothesisWeekId: null,
      })
    }
  }

  readSheet("Active", "ready")
  readSheet("Skipped", "skipped")

  // figure out max # so DNC rows get next slots
  let maxNumber = 0
  for (const l of collected) if (l.number > maxNumber) maxNumber = l.number

  // DNC sheet — different columns: Name, Email, Company, Date added, Channel, Reason, Notes
  const dncSheet = wb.Sheets["Do Not Contact"]
  if (dncSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(dncSheet, {
      header: 1,
      raw: true,
      defval: null,
    })
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r) continue
      const name = trimStr(r[0])
      const email = lowerStr(r[1])
      const company = trimStr(r[2])
      const reason = trimStr(r[5])
      const notesField = trimStr(r[6])
      if (!name && !email) continue
      if (!name) {
        warnings.push(`DNC row ${i + 1}: missing name, skipped`)
        continue
      }
      maxNumber += 1
      const fallbackCompany =
        company ?? (email ? email.split("@")[1] ?? "(unknown)" : "(unknown)")
      collected.push({
        tenantId: TENANT_ID,
        number: maxNumber,
        owner: "luke",
        status: "dnc",
        name,
        company: fallbackCompany,
        category: null,
        email,
        website: null,
        source: "Do Not Contact",
        researched: false,
        followUpFlag: false,
        lastContactedAt: toExcelDate(r[3]),
        nextFollowUpAt: null,
        reply: false,
        replySentiment: null,
        researchNotes: null,
        notes: reason
          ? notesField
            ? `${reason} — ${notesField}`
            : reason
          : notesField,
        hypothesisWeekId: null,
      })
    }
  }

  // Dedupe within batch by (number) and (email)
  const dedup: LeadInsertShape[] = []
  for (const l of collected) {
    if (seenNumbers.has(l.number)) {
      // duplicate number — bump it
      let next = maxNumber + 1
      while (seenNumbers.has(next)) next++
      warnings.push(
        `Duplicate # ${l.number} for ${l.name} (${l.company}) — reassigned to ${next}`,
      )
      l.number = next
      maxNumber = next
    }
    if (l.email && seenEmails.has(l.email)) {
      warnings.push(
        `Duplicate email ${l.email} for ${l.name} (${l.company}) — dropping email field`,
      )
      l.email = null
    }
    seenNumbers.add(l.number)
    if (l.email) seenEmails.add(l.email)
    dedup.push(l)
  }

  console.log(`Prepared ${dedup.length} leads to insert.`)

  // ----- Step 4: insert leads in batches -----
  let inserted = 0
  const BATCH = 50
  for (let i = 0; i < dedup.length; i += BATCH) {
    const slice = dedup.slice(i, i + BATCH)
    const result = await db
      .insert(leads)
      .values(slice)
      .onConflictDoNothing({ target: [leads.tenantId, leads.number] })
      .returning({ id: leads.id })
    inserted += result.length
  }
  console.log(`  inserted ${inserted} leads.`)

  // ----- Step 5: forensic deep-research notes -----
  console.log(`Reading forensic notes ${FORENSIC_PATH}...`)
  const forensicRaw = fs.readFileSync(FORENSIC_PATH, "utf8")
  const forensic = JSON.parse(forensicRaw) as Array<{
    first_name?: string
    company?: string
    email?: string
    website?: string
    artefact_summary?: string
    mechanism?: string
    verbatim_evidence?: string
    notes?: string
  }>
  console.log(`  ${forensic.length} forensic entries.`)

  let researchUpdated = 0
  let researchCreated = 0
  let researchSkipped = 0
  // Highest tenant number after inserts:
  const maxNumRow = await pg`
    SELECT COALESCE(MAX("number"), 0) AS m
    FROM outreach_leads
    WHERE "tenantId" = ${TENANT_ID}
  `
  let nextNumber = Number(maxNumRow[0].m) + 1

  for (const f of forensic) {
    const email = lowerStr(f.email)
    if (!email) {
      researchSkipped++
      warnings.push(`Forensic entry without email: ${f.first_name ?? "?"} / ${f.company ?? "?"}`)
      continue
    }
    const built = [
      f.artefact_summary ?? "",
      f.mechanism ? `\n\nMechanism: ${f.mechanism}` : "",
      f.verbatim_evidence ? `\n\nEvidence: ${f.verbatim_evidence}` : "",
    ]
      .join("")
      .trim()

    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.tenantId, TENANT_ID), eq(leads.email, email)))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(leads)
        .set({ researched: true, researchNotes: built })
        .where(eq(leads.id, existing[0].id))
      researchUpdated++
    } else {
      const name = f.first_name?.trim() || email.split("@")[0]
      const company = f.company?.trim() || (email.split("@")[1] ?? "(unknown)")
      await db.insert(leads).values({
        tenantId: TENANT_ID,
        number: nextNumber++,
        owner: "luke",
        status: "ready",
        name,
        company,
        email,
        website: f.website ?? null,
        source: "forensic_2026-06-12_monday-batch",
        researched: true,
        researchNotes: built,
      })
      researchCreated++
    }
  }
  console.log(
    `  research: ${researchUpdated} updated, ${researchCreated} created, ${researchSkipped} skipped.`,
  )

  // ----- Step 6: daily activity -----
  console.log("Inserting daily activity...")
  let dailyInserted = 0
  for (const d of DAILY) {
    const weekId = weekIdForDate(d.d, hypMap)
    const result = await db
      .insert(dailyActivity)
      .values({
        tenantId: TENANT_ID,
        date: d.d,
        owner: d.o as Owner,
        channel: "email",
        hypothesisWeekId: weekId,
        sent: d.sent,
        replies: d.replies,
        positive: d.positive,
        meetingsBooked: d.booked,
        meetingsTaken: d.taken,
        interested: d.interested,
        closed: d.closed,
        newUpfront: "0",
        newRetainer: "0",
      })
      .onConflictDoNothing({
        target: [dailyActivity.tenantId, dailyActivity.date, dailyActivity.owner],
      })
      .returning({ id: dailyActivity.id })
    dailyInserted += result.length
  }
  console.log(`  inserted ${dailyInserted} daily rows.`)

  // ----- Step 7: backfill hypothesisWeekId on leads by lastContactedAt -----
  console.log("Backfilling lead.hypothesisWeekId from lastContactedAt...")
  for (const h of hypMap.values()) {
    await pg`
      UPDATE outreach_leads
      SET "hypothesisWeekId" = ${h.id}
      WHERE "tenantId" = ${TENANT_ID}
        AND "lastContactedAt" IS NOT NULL
        AND "lastContactedAt" >= ${h.startDate}::date
        AND "lastContactedAt" <= ${h.endDate}::date
        AND "hypothesisWeekId" IS NULL
    `
  }

  // ----- Step 8: verification -----
  console.log("\n=== Verification ===")
  const verify = await pg.unsafe(`
    SELECT 'leads' AS t, count(*)::int AS c FROM outreach_leads WHERE "tenantId"='${TENANT_ID}'
    UNION ALL SELECT 'daily_activity', count(*)::int FROM outreach_daily_activity WHERE "tenantId"='${TENANT_ID}'
    UNION ALL SELECT 'weekly_hypothesis', count(*)::int FROM outreach_weekly_hypothesis WHERE "tenantId"='${TENANT_ID}'
    UNION ALL SELECT 'leads researched', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND researched=true
    UNION ALL SELECT 'leads with reply', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND reply=true
    UNION ALL SELECT 'leads by status: ready', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND status='ready'
    UNION ALL SELECT 'leads by status: sent', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND status='sent'
    UNION ALL SELECT 'leads by status: skipped', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND status='skipped'
    UNION ALL SELECT 'leads by status: draft', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND status='draft'
    UNION ALL SELECT 'leads by status: dnc', count(*)::int FROM outreach_leads WHERE "tenantId"='${TENANT_ID}' AND status='dnc'
  `)
  for (const row of verify) {
    console.log(`  ${(row as { t: string }).t}: ${(row as { c: number }).c}`)
  }

  if (warnings.length) {
    console.log(`\n=== Warnings (${warnings.length}) ===`)
    for (const w of warnings.slice(0, 50)) console.log(`  ${w}`)
    if (warnings.length > 50) {
      console.log(`  ...and ${warnings.length - 50} more`)
    }
  }

  await pg.end()
  console.log("\nDone.")
}

main().catch((err) => {
  console.error("Import failed:", err)
  process.exit(1)
})
