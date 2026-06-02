// src/modules/integrations/providers/companies-house.service.ts
/**
 * Companies House enrichment service.
 *
 * - enrichCompany: enrich a single company row → writes jsonb + infers
 *   employeeBand / ownerLed.
 * - batchEnrichCompanies: walks companies where enrichment = '{}', enriches
 *   sequentially with 500ms sleep (CH rate limit = 600 reqs / 5 min).
 *
 * NOTE: the outreach module is being built in parallel — we import the
 * companies table directly from `@/shared/db/schema` rather than going via
 * `@/modules/outreach` to keep the dependency surface minimal.
 */
import { db } from '@/shared/db'
import { companies } from '@/shared/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { logger } from '@/shared/logger'
import { emitEvent } from '@/modules/jobs/event-emitter'
import { enrichByIdentifier, type CompaniesHouseEnrichment } from './companies-house.provider'

const log = logger.child({ module: 'companies-house.service' })

type EmployeeBand = '1-2' | '3-15' | '15-50' | '50+'

function inferEmployeeBand(enrichment: CompaniesHouseEnrichment): EmployeeBand | null {
  // Companies House doesn't expose headcount directly. We infer crudely from
  // director count (owner-led correlates with ≤2 directors) and company age.
  // Returning null leaves the existing band untouched in the caller.
  const directorCount = enrichment.directors.length
  if (directorCount === 0) return null
  if (directorCount <= 2) return '1-2'
  if (directorCount <= 5) return '3-15'
  if (directorCount <= 15) return '15-50'
  return '50+'
}

function inferOwnerLed(enrichment: CompaniesHouseEnrichment): boolean {
  return enrichment.directors.length > 0 && enrichment.directors.length <= 2
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Enrich a single company by id. Looks up by domain first (if set),
 * then by name. Persists CompaniesHouseEnrichment into `companies.enrichment`
 * jsonb under key `companiesHouse`, plus infers employeeBand & ownerLed.
 *
 * Emits `company.enriched` on success.
 */
export async function enrichCompany(tenantId: string, companyId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)))
    .limit(1)

  if (!row) {
    log.warn({ tenantId, companyId }, 'enrichCompany: company not found')
    return
  }

  let enrichment: CompaniesHouseEnrichment | null = null

  if (row.domain) {
    enrichment = await enrichByIdentifier({ kind: 'company', identifier: row.domain, by: 'domain' })
  }
  if (!enrichment && row.name) {
    enrichment = await enrichByIdentifier({ kind: 'company', identifier: row.name, by: 'name' })
  }

  if (!enrichment) {
    log.info({ tenantId, companyId, name: row.name }, 'No Companies House match found')
    return
  }

  const inferredBand = inferEmployeeBand(enrichment)
  const inferredOwnerLed = inferOwnerLed(enrichment)

  const existing = (row.enrichment ?? {}) as Record<string, unknown>
  const nextEnrichment = {
    ...existing,
    companiesHouse: enrichment,
    enrichedAt: new Date().toISOString(),
  }

  await db
    .update(companies)
    .set({
      enrichment: nextEnrichment,
      employeeBand: inferredBand ?? row.employeeBand,
      ownerLed: inferredOwnerLed || row.ownerLed,
      updatedAt: new Date(),
    })
    .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)))

  await emitEvent({
    tenantId,
    kind: 'company.enriched',
    entityType: 'company',
    entityId: companyId,
    payload: {
      companyNumber: enrichment.companyNumber,
      employeeBand: inferredBand,
      ownerLed: inferredOwnerLed,
      source: 'companies-house',
    },
    actor: 'companies-house.service',
  })

  log.info(
    { tenantId, companyId, companyNumber: enrichment.companyNumber },
    'Company enriched from Companies House',
  )
}

export interface BatchEnrichResult {
  enriched: number
  failed: number
}

/**
 * Iterate companies where enrichment = '{}' and enrich each. Sleeps 500ms
 * between calls to stay well clear of CH rate limits.
 */
export async function batchEnrichCompanies(tenantId: string, limit: number): Promise<BatchEnrichResult> {
  const rows = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.tenantId, tenantId), sql`${companies.enrichment} = '{}'::jsonb`))
    .limit(limit)

  let enriched = 0
  let failed = 0

  for (const r of rows) {
    try {
      await enrichCompany(tenantId, r.id)
      enriched += 1
    } catch (err) {
      failed += 1
      log.warn({ tenantId, companyId: r.id, err }, 'batchEnrichCompanies: enrichment failed')
    }
    await sleep(500)
  }

  return { enriched, failed }
}
