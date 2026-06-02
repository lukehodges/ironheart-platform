// src/modules/integrations/providers/companies-house.provider.ts
import { logger } from '@/shared/logger'
import type {
  IntegrationProvider,
  DomainEvent,
  IntegrationContext,
  IntegrationResult,
  WebhookPayload,
} from '../integrations.types'

const log = logger.child({ module: 'companies-house.provider' })

const CH_BASE_URL = 'https://api.company-information.service.gov.uk'

// ---------------------------------------------------------------------------
// Public enrichment shapes (also used by service)
// ---------------------------------------------------------------------------

export interface CompaniesHouseDirector {
  name: string
  role: string
  appointedOn?: string
  resignedOn?: string
}

export interface CompaniesHouseAccounts {
  nextDue?: string
  lastFiled?: string
}

export interface CompaniesHouseAddress {
  line1?: string
  line2?: string
  locality?: string
  postalCode?: string
  country?: string
}

export interface CompaniesHouseEnrichment {
  companyNumber: string
  name: string
  status: string
  type: string
  incorporatedOn?: string
  sicCodes: string[]
  registeredAddress: CompaniesHouseAddress
  accounts: CompaniesHouseAccounts
  directors: CompaniesHouseDirector[]
}

export interface CompaniesHouseQuery {
  kind: 'company'
  identifier: string // company name, number, or domain
  by?: 'name' | 'number' | 'domain'
}

// ---------------------------------------------------------------------------
// API key helper
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY
  if (!key) throw new Error('COMPANIES_HOUSE_API_KEY is not set')
  return key
}

function authHeader(apiKey = getApiKey()): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

// ---------------------------------------------------------------------------
// Raw CH fetchers (exported for service + tests)
// ---------------------------------------------------------------------------

interface CHSearchResult {
  items?: Array<{
    company_number?: string
    title?: string
    company_status?: string
  }>
}

interface CHCompanyProfile {
  company_number?: string
  company_name?: string
  company_status?: string
  type?: string
  date_of_creation?: string
  sic_codes?: string[]
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    postal_code?: string
    country?: string
  }
  accounts?: {
    next_due?: string
    last_accounts?: { made_up_to?: string }
  }
}

interface CHOfficersResponse {
  items?: Array<{
    name?: string
    officer_role?: string
    appointed_on?: string
    resigned_on?: string
  }>
}

export async function searchCompanyByName(name: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  const url = `${CH_BASE_URL}/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`
  const res = await fetcher(url, { headers: { Authorization: authHeader() } })
  if (!res.ok) {
    log.warn({ status: res.status, name }, 'Companies House search failed')
    return null
  }
  const json = (await res.json()) as CHSearchResult
  return json.items?.[0]?.company_number ?? null
}

export async function fetchCompanyProfile(companyNumber: string, fetcher: typeof fetch = fetch): Promise<CHCompanyProfile | null> {
  const res = await fetcher(`${CH_BASE_URL}/company/${encodeURIComponent(companyNumber)}`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    log.warn({ status: res.status, companyNumber }, 'Companies House company profile failed')
    return null
  }
  return (await res.json()) as CHCompanyProfile
}

export async function fetchCompanyOfficers(companyNumber: string, fetcher: typeof fetch = fetch): Promise<CHOfficersResponse | null> {
  const res = await fetcher(`${CH_BASE_URL}/company/${encodeURIComponent(companyNumber)}/officers`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    log.warn({ status: res.status, companyNumber }, 'Companies House officers failed')
    return null
  }
  return (await res.json()) as CHOfficersResponse
}

// ---------------------------------------------------------------------------
// Public enrichment entry point — used by the service for jsonb persistence
// ---------------------------------------------------------------------------

export async function enrichByIdentifier(
  query: CompaniesHouseQuery,
  fetcher: typeof fetch = fetch,
): Promise<CompaniesHouseEnrichment | null> {
  let companyNumber: string | null = null

  if (query.by === 'number' || /^[A-Z0-9]{6,10}$/i.test(query.identifier)) {
    companyNumber = query.identifier
  } else {
    // Domain → strip TLD as a naive starting point, then fall through to name search.
    const name =
      query.by === 'domain'
        ? query.identifier.replace(/^www\./, '').split('.')[0] ?? query.identifier
        : query.identifier
    companyNumber = await searchCompanyByName(name, fetcher)
  }

  if (!companyNumber) return null

  const [profile, officers] = await Promise.all([
    fetchCompanyProfile(companyNumber, fetcher),
    fetchCompanyOfficers(companyNumber, fetcher),
  ])

  if (!profile) return null

  const address = profile.registered_office_address ?? {}

  return {
    companyNumber: profile.company_number ?? companyNumber,
    name: profile.company_name ?? query.identifier,
    status: profile.company_status ?? 'unknown',
    type: profile.type ?? 'unknown',
    incorporatedOn: profile.date_of_creation,
    sicCodes: profile.sic_codes ?? [],
    registeredAddress: {
      line1: address.address_line_1,
      line2: address.address_line_2,
      locality: address.locality,
      postalCode: address.postal_code,
      country: address.country,
    },
    accounts: {
      nextDue: profile.accounts?.next_due,
      lastFiled: profile.accounts?.last_accounts?.made_up_to,
    },
    directors: (officers?.items ?? [])
      .filter((o) => !o.resigned_on)
      .map((o) => ({
        name: o.name ?? 'unknown',
        role: o.officer_role ?? 'unknown',
        appointedOn: o.appointed_on,
        resignedOn: o.resigned_on,
      })),
  }
}

// ---------------------------------------------------------------------------
// IntegrationProvider implementation
// ---------------------------------------------------------------------------

export const companiesHouseProvider: IntegrationProvider = {
  slug: 'companies-house',
  name: 'UK Companies House',
  handles: [],

  async onEvent(_event: DomainEvent, _ctx: IntegrationContext): Promise<IntegrationResult> {
    return { success: true }
  },

  async onWebhook(_payload: WebhookPayload, _ctx: IntegrationContext): Promise<void> {
    // Companies House has no push-webhook surface we currently subscribe to.
  },

  getOAuthUrl(_state: string, _redirectUri: string): string {
    return ''
  },

  async exchangeCode(): Promise<void> {
    // No OAuth — API key only.
  },

  async disconnect(): Promise<void> {
    // No per-user credentials to revoke.
  },

  /**
   * Adapter for the optional `enrich(query, ctx)` interface that the other
   * agent is adding. Until the interface formally lands, the integrations
   * service can call this via `(provider as any).enrich?.(...)`.
   */
  async enrich(query: CompaniesHouseQuery, _ctx: IntegrationContext): Promise<CompaniesHouseEnrichment | null> {
    return enrichByIdentifier(query)
  },
} as unknown as IntegrationProvider & {
  enrich: (q: CompaniesHouseQuery, ctx: IntegrationContext) => Promise<CompaniesHouseEnrichment | null>
}
