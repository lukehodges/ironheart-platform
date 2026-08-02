/**
 * twenty-bridge.service.ts
 *
 * Bridges outreach_leads → Twenty CRM.
 *
 * Twenty REST API assumptions (document for the orchestrator):
 *
 *   Base:  TWENTY_BASE_URL/api  (Twenty self-hosted REST lives at /api, not /rest)
 *
 *   Auth:  Authorization: Bearer <TWENTY_API_KEY>
 *          The API key is a workspace-level bearer token created in
 *          Twenty Settings → API & Webhooks.
 *
 *   Pagination / list shape:
 *     GET /api/companies?filter=domainName[eq]:example.com
 *     → { data: { companies: { edges: [{ node: { id, name, domainName, ... } }] } } }
 *     (Twenty uses a cursor-based relay-style response even on the REST endpoint
 *     when listing. The first page is always sufficient for find-or-create logic.)
 *
 *   Single-object shape (create / get by id):
 *     POST /api/companies
 *     → { data: { createCompany: { id, name, domainName, ... } } }
 *
 *     GET /api/companies/:id
 *     → { data: { company: { id, name, domainName, ... } } }
 *
 *   People:
 *     GET /api/people?filter=email[eq]:person@example.com
 *     → { data: { people: { edges: [{ node: { id, name, emails, company, ... } }] } } }
 *     POST /api/people
 *     Body: { name: { firstName, lastName }, emails: { primaryEmail }, companyId }
 *     → { data: { createPerson: { id, ... } } }
 *
 *   Opportunities:
 *     POST /api/opportunities
 *     Body: { name, stage, pointOfContactId?, companyId? }
 *     → { data: { createOpportunity: { id, name, stage, ... } } }
 *
 *     GET /api/opportunities?filter=stage[neq]:CLOSED_LOST,stage[neq]:CLOSED_WON
 *     → relay list as above
 *
 *   Custom fields (nextStepDate, lostReason, mrr, dealType) appear as top-level
 *   fields in the opportunity node when returned; pass them in the POST body.
 *
 * TODO(orchestrator):
 *   1. Set TWENTY_API_KEY=<your workspace API key> in .env.local (and Vercel env).
 *   2. Optionally set TWENTY_BASE_URL if different from https://crm.theironheart.org.
 *   3. Verify endpoint shapes by calling GET /api/metadata against your Twenty
 *      instance — Twenty exposes its full schema there.
 *   4. Twenty's REST filter syntax may differ between versions; if list queries
 *      return unexpected shapes, switch to the GraphQL endpoint at
 *      TWENTY_BASE_URL/graphql with the same Bearer token.
 *
 * TODO(orchestrator): expose promoteLeadToTwenty + dueForFollowUp via outreach.router
 */

import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { leads } from "@/shared/db/schemas/outreach.schema"
import { and, eq } from "drizzle-orm"
import type { LeadRecord } from "./outreach.types"
import { outreachRepository } from "./outreach.repository"

const log = logger.child({ module: "twenty-bridge.service" })

// ---------------------------------------------------------------------------
// Types — Twenty API response shapes (inferred; correct from metadata if needed)
// ---------------------------------------------------------------------------

interface TwentyCompanyNode {
  id: string
  name: string
  domainName: string | null
}

interface TwentyPersonNode {
  id: string
  name: { firstName: string; lastName: string }
  emails: { primaryEmail: string } | null
}

interface TwentyOpportunityNode {
  id: string
  name: string
  stage: string
  /** ISO date string or null */
  nextStepDate: string | null
}

interface TwentyListEdge<T> {
  node: T
}

interface TwentyListConnection<T> {
  edges: Array<TwentyListEdge<T>>
}

/** Relay-style list response wrapper */
type TwentyListResponse<K extends string, T> = {
  data: Record<K, TwentyListConnection<T>>
}

/** Single-object create response wrapper */
type TwentyCreateResponse<K extends string, T> = {
  data: Record<K, T>
}

/** Single-object get-by-id response wrapper */
type TwentyGetResponse<K extends string, T> = {
  data: Record<K, T | null>
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function getTwentyConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.TWENTY_API_KEY
  if (!apiKey) {
    throw new Error(
      "[twenty-bridge] TWENTY_API_KEY is not set. Add it to .env.local and Vercel env vars.",
    )
  }
  const baseUrl = (
    process.env.TWENTY_BASE_URL ?? "https://crm.theironheart.org"
  ).replace(/\/$/, "")
  return { apiKey, baseUrl }
}

async function twentyFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { apiKey, baseUrl } = getTwentyConfig()
  const url = `${baseUrl}/api${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable body)")
    throw new Error(
      `[twenty-bridge] ${options.method ?? "GET"} ${url} → HTTP ${res.status}: ${body}`,
    )
  }

  const json = (await res.json()) as T
  return json
}

// ---------------------------------------------------------------------------
// Helpers — find-or-create
// ---------------------------------------------------------------------------

function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function domainFromEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const at = email.lastIndexOf("@")
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

/** Split "First Last" into { firstName, lastName }. Falls back gracefully. */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" }
  const lastName = parts.pop()!
  return { firstName: parts.join(" "), lastName }
}

async function findOrCreateCompany(
  lead: LeadRecord,
): Promise<TwentyCompanyNode> {
  const domain =
    domainFromUrl(lead.website) ?? domainFromEmail(lead.email) ?? null

  // 1. Try to find by domain first (most precise)
  if (domain) {
    const res = await twentyFetch<TwentyListResponse<"companies", TwentyCompanyNode>>(
      `/companies?filter=domainName[eq]:${encodeURIComponent(domain)}&first=1`,
    )
    const existing = res.data?.companies?.edges?.[0]?.node
    if (existing) {
      log.debug({ companyId: existing.id, domain }, "Found existing Twenty company by domain")
      return existing
    }
  }

  // 2. Fall back to name match
  const res = await twentyFetch<TwentyListResponse<"companies", TwentyCompanyNode>>(
    `/companies?filter=name[eq]:${encodeURIComponent(lead.company)}&first=1`,
  )
  const byName = res.data?.companies?.edges?.[0]?.node
  if (byName) {
    log.debug({ companyId: byName.id, name: lead.company }, "Found existing Twenty company by name")
    return byName
  }

  // 3. Create
  const created = await twentyFetch<TwentyCreateResponse<"createCompany", TwentyCompanyNode>>(
    "/companies",
    {
      method: "POST",
      body: JSON.stringify({
        name: lead.company,
        ...(domain ? { domainName: domain } : {}),
      }),
    },
  )
  const company = created.data?.createCompany
  if (!company?.id) {
    throw new Error(`[twenty-bridge] createCompany returned unexpected shape: ${JSON.stringify(created)}`)
  }
  log.info({ companyId: company.id, name: lead.company }, "Created Twenty company")
  return company
}

async function findOrCreatePerson(
  lead: LeadRecord,
  companyId: string,
): Promise<TwentyPersonNode | null> {
  // A person without an email can't be reliably de-duped — skip gracefully
  if (!lead.email) return null

  // 1. Look up by primary email
  const res = await twentyFetch<TwentyListResponse<"people", TwentyPersonNode>>(
    `/people?filter=emails.primaryEmail[eq]:${encodeURIComponent(lead.email)}&first=1`,
  )
  const existing = res.data?.people?.edges?.[0]?.node
  if (existing) {
    log.debug({ personId: existing.id, email: lead.email }, "Found existing Twenty person")
    return existing
  }

  // 2. Create
  const { firstName, lastName } = splitName(lead.name)
  const created = await twentyFetch<TwentyCreateResponse<"createPerson", TwentyPersonNode>>(
    "/people",
    {
      method: "POST",
      body: JSON.stringify({
        name: { firstName, lastName },
        emails: { primaryEmail: lead.email },
        companyId,
      }),
    },
  )
  const person = created.data?.createPerson
  if (!person?.id) {
    throw new Error(`[twenty-bridge] createPerson returned unexpected shape: ${JSON.stringify(created)}`)
  }
  log.info({ personId: person.id, email: lead.email }, "Created Twenty person")
  return person
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Promote a local outreach lead into a Twenty CRM opportunity.
 *
 * Idempotent: if `lead.twentyOppId` is already set, returns it immediately.
 * Otherwise: find-or-create Company → find-or-create Person → create Opportunity,
 * then writes the opportunityId back to outreach_leads.
 */
export async function promoteLeadToTwenty(
  tenantId: string,
  leadId: string,
): Promise<{ opportunityId: string }> {
  const lead = await outreachRepository.getLead(tenantId, leadId)
  if (!lead) {
    throw new Error(`[twenty-bridge] Lead ${leadId} not found for tenant ${tenantId}`)
  }

  // Idempotency guard
  if (lead.twentyOppId) {
    log.debug({ leadId, opportunityId: lead.twentyOppId }, "Lead already has a Twenty opportunity — skipping")
    return { opportunityId: lead.twentyOppId }
  }

  log.info({ leadId, company: lead.company }, "Promoting lead to Twenty CRM")

  const company = await findOrCreateCompany(lead)
  const person = await findOrCreatePerson(lead, company.id)

  const oppName = lead.company

  const created = await twentyFetch<TwentyCreateResponse<"createOpportunity", TwentyOpportunityNode>>(
    "/opportunities",
    {
      method: "POST",
      body: JSON.stringify({
        name: oppName,
        stage: "NEW",
        companyId: company.id,
        ...(person ? { pointOfContactId: person.id } : {}),
      }),
    },
  )

  const opp = created.data?.createOpportunity
  if (!opp?.id) {
    throw new Error(`[twenty-bridge] createOpportunity returned unexpected shape: ${JSON.stringify(created)}`)
  }

  // Persist opportunityId back to outreach_leads (atomic — same process, same DB)
  await db
    .update(leads)
    .set({ twentyOppId: opp.id, updatedAt: new Date() })
    .where(and(eq(leads.tenantId, tenantId), eq(leads.id, leadId)))

  log.info({ leadId, opportunityId: opp.id, company: company.name }, "Promoted lead to Twenty")
  return { opportunityId: opp.id }
}

// ---------------------------------------------------------------------------

export interface DueForFollowUpItem {
  opportunityId: string
  name: string
  stage: string
  nextStepDate: string | null
}

/**
 * Return open Twenty opportunities that are due for follow-up:
 * those whose nextStepDate is in the past, or where nextStepDate is null.
 *
 * TODO(orchestrator): Twenty's filter syntax for date comparisons may need
 * adjustment depending on your version. The ideal server-side query would be:
 *
 *   GET /api/opportunities
 *     ?filter=stage[neq]:CLOSED_LOST,stage[neq]:CLOSED_WON,nextStepDate[lte]:{today}
 *
 * or two separate calls (one for null nextStepDate, one for past dates).
 * Until the exact filter grammar is confirmed, this implementation fetches all
 * open opportunities and filters in JS. Replace the two commented-out lines
 * below with a server-side filter once confirmed.
 *
 * TODO(orchestrator): Twenty uses string enum values for stage. Confirm the
 * closed-stage identifiers for your workspace: likely "CLOSED_LOST" and
 * "CLOSED_WON" (Twenty defaults). Update CLOSED_STAGES below if different.
 */
const CLOSED_STAGES = new Set(["CLOSED_LOST", "CLOSED_WON"])

export async function dueForFollowUp(
  // tenantId kept for future multi-tenant use (e.g. per-tenant API key lookup)
  _tenantId: string,
): Promise<DueForFollowUpItem[]> {
  // Fetch open opportunities from Twenty.
  // TODO(orchestrator): replace with a server-side filter when grammar confirmed:
  //   `/opportunities?filter=stage[neq]:CLOSED_LOST,stage[neq]:CLOSED_WON&first=100`
  const res = await twentyFetch<TwentyListResponse<"opportunities", TwentyOpportunityNode>>(
    "/opportunities?first=200",
  )

  const edges = res.data?.opportunities?.edges ?? []
  const now = new Date()

  const due: DueForFollowUpItem[] = []

  for (const { node } of edges) {
    // Skip closed
    if (CLOSED_STAGES.has(node.stage)) continue

    // Include if nextStepDate is null (no date set → needs attention)
    // or if nextStepDate is in the past
    const isPastDue =
      node.nextStepDate == null ||
      new Date(node.nextStepDate) <= now

    if (isPastDue) {
      due.push({
        opportunityId: node.id,
        name: node.name,
        stage: node.stage,
        nextStepDate: node.nextStepDate,
      })
    }
  }

  log.info({ count: due.length }, "dueForFollowUp resolved")
  return due
}
