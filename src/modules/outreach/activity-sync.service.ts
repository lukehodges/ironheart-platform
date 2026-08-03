/**
 * Outreach activity sync — keeps `outreach_daily_activity` (the rollup the
 * Observatory funnel reads) live from the systems of record, so nobody has to
 * hand-maintain a spreadsheet.
 *
 * Sources of truth:
 *   - COLD funnel (sent / replies / positive) → the platform's own tables
 *     (`outreach_leads.lastContactedAt`, `outreach_replies`). These are fed by
 *     the Instantly reply/send data.
 *   - WARM funnel (booked / interested / closed) → Twenty CRM, which owns every
 *     meeting-stage-and-beyond opportunity (states 4–7). This captures meetings
 *     taken WITHOUT going through Cal.com too, because they're logged as opps.
 *
 * Stage → funnel mapping (keyed by opportunity createdAt date):
 *   booked     = reached a call:        SCREENING | MEETING | FINDINGS | PROPOSAL | CUSTOMER
 *   interested = progressing post-call: FINDINGS | PROPOSAL | CUSTOMER
 *   closed     = won:                   CUSTOMER
 *
 * The whole rollup is rebuilt each run (the dataset is small and this keeps the
 * job trivially idempotent — a missed or double run is harmless).
 */

import { db } from "@/shared/db"
import { sql } from "drizzle-orm"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "outreach.activity-sync" })

// booked = the deal EXISTS. In this sales process an opportunity is only
// opened once a real conversation/call happens, and deals that later went
// LOST still had their meeting (e.g. "met, no fit") — counting by current
// stage erased every meeting that didn't convert.
// taken = a meeting demonstrably happened (deal progressed past NEW);
// interested = live pipeline (past the first call, not yet won/lost);
// closed = paying customer.
const STAGE_TAKEN = new Set(["SCREENING", "MEETING", "FINDINGS", "PROPOSAL", "CUSTOMER"])
const STAGE_INTERESTED = new Set(["SCREENING", "MEETING", "FINDINGS", "PROPOSAL"])

interface TwentyOpp {
  id: string
  stage: string
  createdAt: string
}

/**
 * Pull every opportunity from Twenty's REST API (self-hosted Twenty exposes REST
 * at `/rest`, not `/rest/…` under `/api`). Returns [] if no key is configured so
 * the cold half of the sync still runs.
 */
async function fetchTwentyOpps(): Promise<TwentyOpp[]> {
  const key = process.env.TWENTY_API_KEY
  if (!key) {
    log.warn("TWENTY_API_KEY not set — skipping warm (Twenty) funnel sync")
    return []
  }
  const base = (
    process.env.TWENTY_BASE_URL ?? "https://crm.theironheart.org"
  ).replace(/\/$/, "")

  const opps: TwentyOpp[] = []
  let cursor: string | null = null
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${base}/rest/opportunities`)
    url.searchParams.set("limit", "60")
    if (cursor) url.searchParams.set("starting_after", cursor)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      log.warn({ status: res.status }, "Twenty REST returned non-OK — stopping")
      break
    }
    const body = (await res.json()) as {
      data?: { opportunities?: Array<{ id?: string; stage?: string; createdAt?: string }> }
      pageInfo?: { hasNextPage?: boolean; endCursor?: string }
    }
    const recs = body?.data?.opportunities ?? []
    for (const r of recs) {
      if (r.id && r.stage && r.createdAt) {
        opps.push({ id: r.id, stage: r.stage, createdAt: r.createdAt })
      }
    }
    if (body?.pageInfo?.hasNextPage && body.pageInfo.endCursor) {
      cursor = body.pageInfo.endCursor
    } else {
      break
    }
  }
  return opps
}

/** Aggregate opportunities into per-day warm-funnel counts. */
function warmByDate(opps: TwentyOpp[]): Map<
  string,
  { booked: number; taken: number; interested: number; closed: number }
> {
  const m = new Map<
    string,
    { booked: number; taken: number; interested: number; closed: number }
  >()
  for (const o of opps) {
    const date = o.createdAt.slice(0, 10) // YYYY-MM-DD, safe (ISO from Twenty)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const cur = m.get(date) ?? { booked: 0, taken: 0, interested: 0, closed: 0 }
    cur.booked += 1
    if (STAGE_TAKEN.has(o.stage)) cur.taken += 1
    if (STAGE_INTERESTED.has(o.stage)) cur.interested += 1
    if (o.stage === "CUSTOMER") cur.closed += 1
    m.set(date, cur)
  }
  return m
}

/**
 * Rebuild the daily-activity rollup for one tenant.
 * Warm counts are bucketed under owner 'luke' (the funnel totals sum across
 * owners, so this is display-neutral; per-owner attribution isn't tracked in
 * Twenty opps here).
 */
export async function syncOutreachActivity(
  tenantId: string,
): Promise<{ coldDays: number; warmDays: number; opps: number }> {
  const opps = await fetchTwentyOpps()
  // COLD-ORIGIN ONLY: the Observatory funnel tracks the outreach stream, so an
  // opp counts as booked/interested/closed here only if a cold lead carries its
  // id (twentyOppId). All-channel pipeline (inbound/referrals) lives in Twenty
  // itself — mixing it in made booked(17) exceed positive replies(5).
  const linked = await db.execute(sql`
    SELECT DISTINCT "twentyOppId" AS id FROM outreach_leads
    WHERE "tenantId" = ${tenantId} AND "twentyOppId" IS NOT NULL
  `)
  const linkedIds = new Set(linked.map((r) => String((r as { id: string }).id)))
  const warm = warmByDate(opps.filter((o) => linkedIds.has(o.id)))

  await db.transaction(async (tx) => {
    // 1. Wipe + rebuild the COLD funnel from leads + replies.
    await tx.execute(sql`
      DELETE FROM outreach_daily_activity WHERE "tenantId" = ${tenantId}
    `)
    await tx.execute(sql`
      INSERT INTO outreach_daily_activity
        (id,"tenantId",date,owner,channel,sent,replies,positive,"createdAt","updatedAt")
      SELECT gen_random_uuid(), ${tenantId}, COALESCE(s.d, r.d), COALESCE(s.o, r.o),
             'email', COALESCE(s.sent,0), COALESCE(r.rc,0), COALESCE(r.pc,0), now(), now()
      FROM (
        SELECT "lastContactedAt" d, owner o, count(*) sent FROM outreach_leads
        WHERE "tenantId" = ${tenantId} AND status = 'sent'
          AND "lastContactedAt" IS NOT NULL
        GROUP BY 1,2
      ) s
      FULL OUTER JOIN (
        SELECT r."receivedAt"::date d, l.owner o, count(*) rc,
               count(*) FILTER (WHERE r.sentiment = 'positive') pc
        FROM outreach_replies r JOIN outreach_leads l ON r."leadId" = l.id
        WHERE l."tenantId" = ${tenantId}
        GROUP BY 1,2
      ) r ON s.d = r.d AND s.o = r.o
    `)

    // 2. Overlay the WARM funnel (booked / interested / closed) from Twenty.
    for (const [date, w] of warm) {
      await tx.execute(sql`
        INSERT INTO outreach_daily_activity
          (id,"tenantId",date,owner,channel,sent,replies,positive,
           "meetingsBooked","meetingsTaken",interested,closed,"createdAt","updatedAt")
        VALUES (gen_random_uuid(), ${tenantId}, ${date}, 'luke', 'phone', 0,0,0,
           ${w.booked}, ${w.taken}, ${w.interested}, ${w.closed}, now(), now())
        ON CONFLICT ("tenantId",date,owner) DO UPDATE SET
          "meetingsBooked" = ${w.booked},
          "meetingsTaken" = ${w.taken},
          interested = ${w.interested},
          closed = ${w.closed},
          "updatedAt" = now()
      `)
    }
  })

  const result = { coldDays: 0, warmDays: warm.size, opps: opps.length }
  log.info(result, "Outreach activity rollup synced")
  return result
}
