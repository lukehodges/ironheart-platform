/**
 * Multi-source lead intelligence — query layer.
 *
 * Provides:
 *   crossProviderOverlap  — leads present in ≥2 different provider source records
 *   tagsForLead           — all tags for a single lead
 *   replyRateByTag        — reply/positive rates grouped by tag value within a namespace
 *
 * // TODO(orchestrator): expose via outreach.router
 */

import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import {
  leads,
  leadSourceRecords,
  leadProvenance,
  leadTags,
  replies as repliesTable,
  touches,
} from "@/shared/db/schemas/outreach.schema"
import {
  and,
  eq,
  sql,
} from "drizzle-orm"
import type { LeadRow, LeadTagRow } from "@/shared/db/schemas/outreach.schema"

const log = logger.child({ module: "outreach.intelligence" })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OverlapLead = Pick<
  LeadRow,
  "id" | "tenantId" | "name" | "company" | "email" | "status" | "owner"
> & {
  /** Number of distinct providers that have a source record for this lead */
  providerCount: number
  /** Comma-separated list of distinct source names, e.g. "master-xlsx,apollo" */
  sources: string
}

export type ReplyRateByTagRow = {
  value: string
  sent: number
  replies: number
  positive: number
  replyPct: number
}

// ---------------------------------------------------------------------------
// crossProviderOverlap
// ---------------------------------------------------------------------------

/**
 * Returns leads that appear in source records from ≥2 DIFFERENT providers.
 * Used to detect duplicates introduced when importing from Apollo, Instantly, etc.
 * alongside the master XLSX.
 */
export async function crossProviderOverlap(tenantId: string): Promise<OverlapLead[]> {
  log.debug({ tenantId }, "crossProviderOverlap")

  // Subquery: leads with ≥2 distinct source values in their provenance
  const rows = await db
    .select({
      id: leads.id,
      tenantId: leads.tenantId,
      name: leads.name,
      company: leads.company,
      email: leads.email,
      status: leads.status,
      owner: leads.owner,
      providerCount: sql<number>`count(distinct ${leadSourceRecords.source})::int`,
      sources: sql<string>`string_agg(distinct ${leadSourceRecords.source}, ',' order by ${leadSourceRecords.source})`,
    })
    .from(leads)
    .innerJoin(leadProvenance, eq(leadProvenance.leadId, leads.id))
    .innerJoin(leadSourceRecords, eq(leadSourceRecords.id, leadProvenance.sourceRecordId))
    .where(and(eq(leads.tenantId, tenantId), eq(leadProvenance.tenantId, tenantId)))
    .groupBy(
      leads.id,
      leads.tenantId,
      leads.name,
      leads.company,
      leads.email,
      leads.status,
      leads.owner,
    )
    .having(sql`count(distinct ${leadSourceRecords.source}) >= 2`)

  return rows as OverlapLead[]
}

// ---------------------------------------------------------------------------
// tagsForLead
// ---------------------------------------------------------------------------

/**
 * Returns all tags for a single lead, ordered by namespace then value.
 */
export async function tagsForLead(tenantId: string, leadId: string): Promise<LeadTagRow[]> {
  log.debug({ tenantId, leadId }, "tagsForLead")

  return db
    .select()
    .from(leadTags)
    .where(and(eq(leadTags.tenantId, tenantId), eq(leadTags.leadId, leadId)))
    .orderBy(leadTags.namespace, leadTags.value)
}

// ---------------------------------------------------------------------------
// replyRateByTag
// ---------------------------------------------------------------------------

/**
 * For a given namespace (e.g. "category" or "tier"), groups leads by tag value
 * and returns send counts, reply counts, positive counts, and reply rate.
 *
 * "sent" = leads with status "sent" carrying this tag.
 * "replies" = outreach_replies rows linked to a sent lead with this tag.
 * "positive" = replies with sentiment "positive".
 * "replyPct" = replies / sent * 100, 0 when sent = 0.
 */
export async function replyRateByTag(
  tenantId: string,
  namespace: string,
): Promise<ReplyRateByTagRow[]> {
  log.debug({ tenantId, namespace }, "replyRateByTag")

  // CTE approach via raw SQL for the aggregation — cleaner than chained joins
  // when grouping on a tag value that may appear multiple times per lead.
  const rows = await db.execute<{
    value: string
    sent: number
    replies: number
    positive: number
    reply_pct: number
  }>(sql`
    with tagged_leads as (
      select
        lt."leadId",
        lt.value
      from outreach_lead_tags lt
      where lt."tenantId" = ${tenantId}
        and lt.namespace   = ${namespace}
    ),
    sent_leads as (
      select
        tl.value,
        count(distinct l.id)::int as sent
      from outreach_leads l
      join tagged_leads tl on tl."leadId" = l.id
      where l."tenantId" = ${tenantId}
        and l.status = 'sent'
      group by tl.value
    ),
    reply_counts as (
      select
        tl.value,
        count(distinct r.id)::int                                    as replies,
        count(distinct r.id) filter (where r.sentiment = 'positive')::int as positive
      from outreach_replies r
      join outreach_leads l  on l.id = r."leadId" and l."tenantId" = ${tenantId}
      join tagged_leads tl on tl."leadId" = l.id
      where r."tenantId" = ${tenantId}
      group by tl.value
    )
    select
      coalesce(sl.value, rc.value)    as value,
      coalesce(sl.sent, 0)            as sent,
      coalesce(rc.replies, 0)         as replies,
      coalesce(rc.positive, 0)        as positive,
      case
        when coalesce(sl.sent, 0) = 0 then 0
        else round(coalesce(rc.replies, 0)::numeric / sl.sent * 100, 2)
      end                             as reply_pct
    from sent_leads sl
    full outer join reply_counts rc on sl.value = rc.value
    order by sent desc, value
  `)

  return rows.map((r) => ({
    value: r.value,
    sent: Number(r.sent),
    replies: Number(r.replies),
    positive: Number(r.positive),
    replyPct: Number(r.reply_pct),
  }))
}
