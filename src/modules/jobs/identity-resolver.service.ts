/**
 * Identity resolver — turn an incoming (email, source) into an internal lead.
 *
 * Lookup chain:
 *   1. leads.email match against tenantId scope
 *   2. autoCreate is intentionally NOT supported — leads come from explicit
 *      import paths (Master Lead List xlsx, manual create). Inbound replies
 *      from unknown senders are dropped.
 *
 * The `identities` cross-reference table is deferred until event-framework
 * lands.
 */

import { db } from "@/shared/db"
import { leads } from "@/shared/db/schemas/outreach.schema"
import { and, eq } from "drizzle-orm"

export interface ResolveLeadInput {
  tenantId: string
  email?: string
  externalId?: string
  source: string
  autoCreate?: boolean
}

export interface ResolveLeadResult {
  leadId: string
}

export async function resolveLead(
  input: ResolveLeadInput,
): Promise<ResolveLeadResult | null> {
  const { tenantId, email } = input

  if (!email) return null

  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), eq(leads.email, email.toLowerCase())))
    .limit(1)

  if (rows[0]) return { leadId: rows[0].id }
  return null
}
