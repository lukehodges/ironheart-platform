/**
 * Mock data layer for platform admin (tenant's view of platform-level info:
 * tenant directory, MRR, module adoption, health flags).
 *
 * Future tRPC procedure shape:
 *   platform.tenants.list(query) → Tenant[]
 *   platform.tenants.getById(id) → Tenant | null
 *   platform.modules.adoption() → ModuleAdoption[]
 *   platform.revenue() → Revenue
 *   platform.subscriptions.list(query) → Subscription[]
 *   platform.healthFlags() → HealthFlag[]
 *   platform.stats(rows) → PlatformStats
 *
 * Required DB fields:
 *   tenants:            id, name, plan, planLabel, planPrice (num), status,
 *                       mrr, seats, activityScore (num 0-100), healthGrade,
 *                       lastSeenAt (ts), modulesEnabledCount, region (text),
 *                       since (date), ownerUserId, billingEmail, tags (text[])
 *   tenant_modules:     tenantId, moduleId (FK), enabled (bool)
 *   modules:            id, slug, name, category (CORE|PREMIUM|CUSTOM)
 *   subscriptions:      id, tenantId, plan, status, startedAt, renewsAt, mrr
 *   revenue_snapshots:  month (date), mrr (num), arr (num), newMrr, churnMrr
 *   health_flags:       id, tenantId, sub (text), tone, createdAt
 *   module_adoption_30d: moduleSlug, percent (num)
 */

/* ── Types ───────────────────────────────────────────────────────────────── */

export type TenantPlan = "trial" | "starter" | "pro" | "enterprise"
export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "CHURNED"
export type TenantHealthTone = "ok" | "warn" | "danger" | "info" | "muted"
export type ModuleCategory = "CORE" | "PREMIUM" | "CUSTOM"

export interface TenantOwner { id: string; initials: string; name: string; email: string }

export interface TenantModuleRef { slug: string; name: string; enabled: boolean }

export interface Tenant {
  id: string
  name: string
  initials: string
  plan: TenantPlan
  planLabel: string                  /* "Pro · $99" */
  planPrice: number
  status: TenantStatus
  mrr: number                        /* monthly recurring */
  seats: number                      /* active users */
  activityScore: number              /* 0-100 */
  healthGrade: string                /* "A+", "A", "A-", "B+", … "—" */
  healthTone: TenantHealthTone
  lastSeen: string                   /* "12m ago" — precomputed */
  lastSeenTs: number                 /* epoch ms for sort */
  modulesEnabledCount: number
  modulesActiveLabel: string         /* "8 active" */
  modules: TenantModuleRef[]
  region: string
  since: string
  owner: TenantOwner
  billingEmail: string
  customerId: string | null          /* link to mock/customers.ts */
  tags: string[]
}

export interface ModuleCatalog {
  id: string
  slug: string
  name: string
  description: string
  category: ModuleCategory
  adoptionPct: number                /* 0-100 */
  adoptionTone: "ok" | "warn" | "info" | "accent" | "muted"
}

export interface RevenueByPlan { plan: TenantPlan; label: string; mrr: number; count: number }

export interface RevenuePoint { month: string; mrr: number }

export interface Revenue {
  mrr: number
  arr: number
  growthPct: number
  churnPct: number
  ltvCac: number
  trialToPaidPct: number
  byPlan: RevenueByPlan[]
  series: RevenuePoint[]
}

export interface Subscription {
  id: string
  tenantId: string
  tenantName: string
  plan: TenantPlan
  planLabel: string
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED"
  startedAt: string
  renewsAt: string
  mrr: number
}

export interface HealthFlag {
  tenantId: string
  tenantName: string
  reason: string
  tone: TenantHealthTone
}

export interface PlatformStats {
  mrrLabel: string
  tenantsCount: number
  activeLast7d: number
  active7dPct: number
  churn30d: number
  churn30dPct: number
  ltvCacLabel: string
  trialToPaidPct: number
}

export interface TenantFilters {
  plan?: TenantPlan[]
  status?: TenantStatus[]
  module?: string[]                  /* module slugs */
  tag?: string[]
  health?: TenantHealthTone[]
}

export type TenantSortBy = "lastSeen" | "mrr" | "name" | "seats" | "activity"
export type TenantSortDir = "asc" | "desc"

export interface TenantQuery {
  segment?: string                   /* "all" | "trialing" | "atrisk" | "paying" */
  search?: string
  filters?: TenantFilters
  sortBy?: TenantSortBy
  sortDir?: TenantSortDir
}

/* ── Plan metadata ───────────────────────────────────────────────────────── */

export const PLAN_LABEL: Record<TenantPlan, string> = {
  trial:      "Trial",
  starter:    "Starter · $29",
  pro:        "Pro · $99",
  enterprise: "Enterprise · $399",
}

export const PLAN_PRICE: Record<TenantPlan, number> = {
  trial: 0, starter: 29, pro: 99, enterprise: 399,
}

export const STATUS_LABEL: Record<TenantStatus, string> = {
  ACTIVE: "Active", TRIAL: "Trial", SUSPENDED: "Suspended", CHURNED: "Churned",
}

/* ── Module catalog ──────────────────────────────────────────────────────── */

const MODULES: ModuleCatalog[] = [
  { id: "mod-bookings",  slug: "bookings",  name: "Bookings",   description: "Calendar slots, rules, capacity", category: "CORE",    adoptionPct: 91, adoptionTone: "ok"    },
  { id: "mod-workflows", slug: "workflows", name: "Workflows",  description: "Automation graph + Inngest",      category: "CORE",    adoptionPct: 74, adoptionTone: "ok"    },
  { id: "mod-pipeline",  slug: "pipeline",  name: "Pipeline",   description: "Deal stages + forecasting",       category: "PREMIUM", adoptionPct: 62, adoptionTone: "info"  },
  { id: "mod-ai",        slug: "ai",        name: "AI Copilot", description: "Inbox suggestions, summaries",    category: "PREMIUM", adoptionPct: 58, adoptionTone: "accent"},
  { id: "mod-invoices",  slug: "invoices",  name: "Invoices",   description: "Stripe + payment links",          category: "CORE",    adoptionPct: 88, adoptionTone: "ok"    },
  { id: "mod-portal",    slug: "portal",    name: "Portal",     description: "Customer-facing booking portal",  category: "PREMIUM", adoptionPct: 44, adoptionTone: "warn"  },
  { id: "mod-audit",     slug: "audit",     name: "Audit",      description: "5-lens audit reports",            category: "CUSTOM",  adoptionPct: 38, adoptionTone: "muted" },
]

/* ── Tenant dataset ──────────────────────────────────────────────────────── */

const NOW = Date.now()
const MIN = (m: number) => NOW - m * 60 * 1000
const HRS = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000

function modulesFor(slugs: string[]): TenantModuleRef[] {
  return MODULES.map(m => ({ slug: m.slug, name: m.name, enabled: slugs.includes(m.slug) }))
}

const TENANTS: Tenant[] = [
  {
    id: "t-acme",
    name: "Acme Studios",
    initials: "AS",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 18,
    activityScore: 92,
    healthGrade: "A",
    healthTone: "ok",
    lastSeen: "12m ago",
    lastSeenTs: MIN(12),
    modulesEnabledCount: 8,
    modulesActiveLabel: "8 active",
    modules: modulesFor(["bookings","workflows","pipeline","ai","invoices","portal","audit","ai"]),
    region: "US-East",
    since: "Aug 2024",
    owner: { id: "u-as-1", initials: "JM", name: "Jordan Mills", email: "jordan@acmestudios.co" },
    billingEmail: "billing@acmestudios.co",
    customerId: null,
    tags: ["design", "saas"],
  },
  {
    id: "t-northwind",
    name: "Northwind Co.",
    initials: "NW",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 12,
    activityScore: 88,
    healthGrade: "A−",
    healthTone: "ok",
    lastSeen: "1h ago",
    lastSeenTs: HRS(1),
    modulesEnabledCount: 9,
    modulesActiveLabel: "9 active",
    modules: modulesFor(["bookings","workflows","pipeline","ai","invoices","portal","audit"]),
    region: "EU-West",
    since: "Aug 2024",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "mira@northwind.co",
    customerId: "cust-nw",
    tags: ["fintech", "saas"],
  },
  {
    id: "t-vellum",
    name: "Vellum & Co.",
    initials: "VC",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 8,
    activityScore: 84,
    healthGrade: "A",
    healthTone: "ok",
    lastSeen: "44m ago",
    lastSeenTs: MIN(44),
    modulesEnabledCount: 7,
    modulesActiveLabel: "7 active",
    modules: modulesFor(["bookings","workflows","pipeline","invoices","portal"]),
    region: "EU-West",
    since: "Mar 2025",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "tom@vellum.co",
    customerId: "cust-vl",
    tags: ["ecommerce", "saas"],
  },
  {
    id: "t-westfield",
    name: "Westfield",
    initials: "WF",
    plan: "starter",
    planLabel: PLAN_LABEL.starter,
    planPrice: 29,
    status: "ACTIVE",
    mrr: 29,
    seats: 4,
    activityScore: 64,
    healthGrade: "B+",
    healthTone: "muted",
    lastSeen: "2h ago",
    lastSeenTs: HRS(2),
    modulesEnabledCount: 5,
    modulesActiveLabel: "5 active",
    modules: modulesFor(["bookings","invoices","portal"]),
    region: "US-Central",
    since: "Sep 2025",
    owner: { id: "u-wf-1", initials: "RM", name: "Rita Mendez", email: "rita@westfield.co" },
    billingEmail: "billing@westfield.co",
    customerId: null,
    tags: ["retail"],
  },
  {
    id: "t-halcyon",
    name: "Halcyon Group",
    initials: "HG",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 21,
    activityScore: 41,
    healthGrade: "C",
    healthTone: "warn",
    lastSeen: "3d ago",
    lastSeenTs: DAYS(3),
    modulesEnabledCount: 3,
    modulesActiveLabel: "3 active",
    modules: modulesFor(["bookings","invoices"]),
    region: "EU-West",
    since: "Feb 2025",
    owner: { id: "u-hg-1", initials: "DC", name: "David Chen", email: "david@halcyon.co" },
    billingEmail: "billing@halcyon.co",
    customerId: null,
    tags: ["legal"],
  },
  {
    id: "t-olsen",
    name: "Olsen Brands",
    initials: "OB",
    plan: "trial",
    planLabel: "Trial",
    planPrice: 0,
    status: "TRIAL",
    mrr: 0,
    seats: 7,
    activityScore: 78,
    healthGrade: "—",
    healthTone: "info",
    lastSeen: "32m ago",
    lastSeenTs: MIN(32),
    modulesEnabledCount: 4,
    modulesActiveLabel: "4 active",
    modules: modulesFor(["bookings","workflows","invoices"]),
    region: "US-East",
    since: "Apr 2026",
    owner: { id: "u-ob-1", initials: "AT", name: "Anya Travers", email: "anya@olsenbrands.co" },
    billingEmail: "anya@olsenbrands.co",
    customerId: null,
    tags: ["fashion", "trial"],
  },
  {
    id: "t-fieldnotes",
    name: "Field Notes Co",
    initials: "FN",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 9,
    activityScore: 55,
    healthGrade: "B",
    healthTone: "muted",
    lastSeen: "5h ago",
    lastSeenTs: HRS(5),
    modulesEnabledCount: 6,
    modulesActiveLabel: "6 active",
    modules: modulesFor(["bookings","workflows","pipeline","invoices"]),
    region: "US-West",
    since: "Jun 2025",
    owner: { id: "u-fn-1", initials: "EM", name: "Esme Maro", email: "esme@fieldnotes.co" },
    billingEmail: "billing@fieldnotes.co",
    customerId: null,
    tags: ["media"],
  },
  {
    id: "t-cardinal",
    name: "Cardinal LLC",
    initials: "CL",
    plan: "enterprise",
    planLabel: PLAN_LABEL.enterprise,
    planPrice: 399,
    status: "ACTIVE",
    mrr: 399,
    seats: 48,
    activityScore: 96,
    healthGrade: "A+",
    healthTone: "ok",
    lastSeen: "8m ago",
    lastSeenTs: MIN(8),
    modulesEnabledCount: 12,
    modulesActiveLabel: "12 active",
    modules: modulesFor(["bookings","workflows","pipeline","ai","invoices","portal","audit"]),
    region: "US-East",
    since: "Nov 2023",
    owner: { id: "u-cl-1", initials: "PV", name: "Priya Vance", email: "priya@cardinal-llc.co" },
    billingEmail: "ap@cardinal-llc.co",
    customerId: null,
    tags: ["fintech", "enterprise"],
  },
  {
    id: "t-bramble",
    name: "Bramble",
    initials: "BR",
    plan: "starter",
    planLabel: PLAN_LABEL.starter,
    planPrice: 29,
    status: "SUSPENDED",
    mrr: 29,
    seats: 3,
    activityScore: 18,
    healthGrade: "D",
    healthTone: "danger",
    lastSeen: "12d ago",
    lastSeenTs: DAYS(12),
    modulesEnabledCount: 2,
    modulesActiveLabel: "2 active",
    modules: modulesFor(["bookings"]),
    region: "EU-West",
    since: "Jan 2025",
    owner: { id: "u-br-1", initials: "TG", name: "Tess Grainger", email: "tess@bramble.co" },
    billingEmail: "tess@bramble.co",
    customerId: null,
    tags: ["wellness"],
  },
  {
    id: "t-bowery",
    name: "Bowery Mills",
    initials: "BM",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 11,
    activityScore: 81,
    healthGrade: "A−",
    healthTone: "ok",
    lastSeen: "20m ago",
    lastSeenTs: MIN(20),
    modulesEnabledCount: 7,
    modulesActiveLabel: "7 active",
    modules: modulesFor(["bookings","workflows","invoices","portal"]),
    region: "US-East",
    since: "Jun 2024",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "jonas@bowery.mill",
    customerId: "cust-bm",
    tags: ["manufacturing"],
  },
  {
    id: "t-brigham",
    name: "Brigham Architects",
    initials: "BA",
    plan: "starter",
    planLabel: PLAN_LABEL.starter,
    planPrice: 29,
    status: "ACTIVE",
    mrr: 29,
    seats: 5,
    activityScore: 42,
    healthGrade: "C+",
    healthTone: "warn",
    lastSeen: "4d ago",
    lastSeenTs: DAYS(4),
    modulesEnabledCount: 4,
    modulesActiveLabel: "4 active",
    modules: modulesFor(["bookings","invoices","portal"]),
    region: "EU-West",
    since: "Aug 2024",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "eleanor@brigham-arch.co",
    customerId: "cust-br",
    tags: ["design"],
  },
  {
    id: "t-pebble",
    name: "Pebble & Pine",
    initials: "PP",
    plan: "trial",
    planLabel: "Trial",
    planPrice: 0,
    status: "TRIAL",
    mrr: 0,
    seats: 2,
    activityScore: 58,
    healthGrade: "—",
    healthTone: "info",
    lastSeen: "2h ago",
    lastSeenTs: HRS(2),
    modulesEnabledCount: 3,
    modulesActiveLabel: "3 active",
    modules: modulesFor(["bookings","invoices"]),
    region: "US-West",
    since: "May 2026",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "asha@pebble-pine.co",
    customerId: "cust-pp",
    tags: ["wellness", "trial"],
  },
  {
    id: "t-midatl",
    name: "Mid-Atlantic Co.",
    initials: "MA",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 14,
    activityScore: 81,
    healthGrade: "A−",
    healthTone: "ok",
    lastSeen: "6h ago",
    lastSeenTs: HRS(6),
    modulesEnabledCount: 6,
    modulesActiveLabel: "6 active",
    modules: modulesFor(["bookings","workflows","ai","invoices"]),
    region: "US-East",
    since: "Nov 2025",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "dan@mid-atlantic.co",
    customerId: "cust-ma",
    tags: ["saas"],
  },
  {
    id: "t-castor",
    name: "Castor Foods",
    initials: "CF",
    plan: "pro",
    planLabel: PLAN_LABEL.pro,
    planPrice: 99,
    status: "ACTIVE",
    mrr: 99,
    seats: 16,
    activityScore: 90,
    healthGrade: "A",
    healthTone: "ok",
    lastSeen: "5h ago",
    lastSeenTs: HRS(5),
    modulesEnabledCount: 8,
    modulesActiveLabel: "8 active",
    modules: modulesFor(["bookings","workflows","pipeline","ai","invoices","portal"]),
    region: "EU-West",
    since: "Jan 2026",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "yuki@castorfoods.co",
    customerId: "cust-cf",
    tags: ["manufacturing", "fintech"],
  },
  {
    id: "t-arden",
    name: "Arden Health",
    initials: "AR",
    plan: "enterprise",
    planLabel: PLAN_LABEL.enterprise,
    planPrice: 399,
    status: "ACTIVE",
    mrr: 399,
    seats: 32,
    activityScore: 84,
    healthGrade: "A",
    healthTone: "ok",
    lastSeen: "1d ago",
    lastSeenTs: DAYS(1),
    modulesEnabledCount: 10,
    modulesActiveLabel: "10 active",
    modules: modulesFor(["bookings","workflows","pipeline","ai","invoices","portal","audit"]),
    region: "EU-West",
    since: "Oct 2025",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "priya@ardenhealth.co",
    customerId: "cust-ar",
    tags: ["wellness", "legal"],
  },
  {
    id: "t-seaglass",
    name: "Sea Glass Studio",
    initials: "SG",
    plan: "trial",
    planLabel: "Trial",
    planPrice: 0,
    status: "TRIAL",
    mrr: 0,
    seats: 3,
    activityScore: 64,
    healthGrade: "—",
    healthTone: "info",
    lastSeen: "9h ago",
    lastSeenTs: HRS(9),
    modulesEnabledCount: 3,
    modulesActiveLabel: "3 active",
    modules: modulesFor(["bookings","portal"]),
    region: "EU-West",
    since: "Apr 2026",
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges", email: "luke@ironheart.dev" },
    billingEmail: "mira@seaglass.studio",
    customerId: "cust-sg",
    tags: ["wellness", "trial"],
  },
]

/* ── Health flags (precomputed) ──────────────────────────────────────────── */

const HEALTH_FLAGS: HealthFlag[] = [
  { tenantId: "t-bramble",      tenantName: "Bramble",        reason: "12d since last login",        tone: "danger" },
  { tenantId: "t-halcyon",      tenantName: "Halcyon Group",  reason: "Login frequency −62% in 14d", tone: "warn"   },
  { tenantId: "t-brigham",      tenantName: "Brigham Architects", reason: "Workflow failure rate up", tone: "warn"  },
  { tenantId: "t-fieldnotes",   tenantName: "Field Notes Co", reason: "MRR same, usage falling",     tone: "muted"  },
]

/* ── Subscriptions (precomputed) ─────────────────────────────────────────── */

const SUBSCRIPTIONS: Subscription[] = TENANTS
  .filter(t => t.status !== "CHURNED")
  .map((t, i) => ({
    id: `sub-${t.id}`,
    tenantId: t.id,
    tenantName: t.name,
    plan: t.plan,
    planLabel: t.planLabel,
    status: t.status === "TRIAL" ? "TRIALING" : t.status === "SUSPENDED" ? "PAST_DUE" : "ACTIVE",
    startedAt: t.since,
    renewsAt: ["May 28, 2026", "Jun 04, 2026", "Jun 12, 2026", "Jun 18, 2026", "Jul 02, 2026"][i % 5],
    mrr: t.mrr,
  }))

/* ── Revenue rollup (precomputed) ────────────────────────────────────────── */

function buildRevenue(): Revenue {
  const byPlanMap = new Map<TenantPlan, RevenueByPlan>()
  ;(["enterprise","pro","starter","trial"] as TenantPlan[]).forEach(p =>
    byPlanMap.set(p, { plan: p, label: PLAN_LABEL[p], mrr: 0, count: 0 }))
  for (const t of TENANTS) {
    const row = byPlanMap.get(t.plan)!
    row.mrr += t.mrr
    row.count += 1
  }
  /* 12-month series ending at current mrr */
  const series: RevenuePoint[] = [
    { month: "Jun", mrr: 31200 },
    { month: "Jul", mrr: 33800 },
    { month: "Aug", mrr: 35400 },
    { month: "Sep", mrr: 37100 },
    { month: "Oct", mrr: 38900 },
    { month: "Nov", mrr: 40250 },
    { month: "Dec", mrr: 41800 },
    { month: "Jan", mrr: 43200 },
    { month: "Feb", mrr: 44600 },
    { month: "Mar", mrr: 45900 },
    { month: "Apr", mrr: 47150 },
    { month: "May", mrr: 48200 },
  ]
  return {
    mrr: 48200,
    arr: 578400,
    growthPct: 8.2,
    churnPct: 4.2,
    ltvCac: 4.1,
    trialToPaidPct: 68,
    byPlan: Array.from(byPlanMap.values()),
    series,
  }
}

const REVENUE = buildRevenue()

/* ── Stats (display-ready) ───────────────────────────────────────────────── */

function buildStats(rows: Tenant[]): PlatformStats {
  const count = rows.length
  const active7d = rows.filter(r => r.lastSeenTs > NOW - 7 * 24 * 60 * 60 * 1000).length
  const churn = rows.filter(r => r.status === "CHURNED" || r.status === "SUSPENDED").length
  return {
    mrrLabel: `$${(REVENUE.mrr / 1000).toFixed(1)}k`,
    tenantsCount: count,
    activeLast7d: active7d,
    active7dPct: count ? Math.round((active7d / count) * 100) : 0,
    churn30d: churn,
    churn30dPct: REVENUE.churnPct,
    ltvCacLabel: `${REVENUE.ltvCac}×`,
    trialToPaidPct: REVENUE.trialToPaidPct,
  }
}

/* ── Segments ────────────────────────────────────────────────────────────── */

export function getSegments() {
  const totalCount = TENANTS.length
  const trialing = TENANTS.filter(t => t.status === "TRIAL").length
  const atRisk = TENANTS.filter(t => t.healthTone === "warn" || t.healthTone === "danger").length
  const paying = TENANTS.filter(t => t.status === "ACTIVE" && t.mrr > 0).length
  return [
    { id: "all",       label: `All ${totalCount}`,       count: totalCount },
    { id: "trialing",  label: `Trialing ${trialing}`,    count: trialing  },
    { id: "atrisk",    label: `At risk ${atRisk}`,       count: atRisk    },
    { id: "paying",    label: `Paying ${paying}`,        count: paying    },
  ]
}

/* ── Match helpers ───────────────────────────────────────────────────────── */

function matchSegment(row: Tenant, segment: string | undefined): boolean {
  if (!segment || segment === "all") return true
  switch (segment) {
    case "trialing": return row.status === "TRIAL"
    case "atrisk":   return row.healthTone === "warn" || row.healthTone === "danger"
    case "paying":   return row.status === "ACTIVE" && row.mrr > 0
    default: return true
  }
}

function matchFilters(row: Tenant, f: TenantFilters | undefined): boolean {
  if (!f) return true
  if (f.plan?.length    && !f.plan.includes(row.plan)) return false
  if (f.status?.length  && !f.status.includes(row.status)) return false
  if (f.health?.length  && !f.health.includes(row.healthTone)) return false
  if (f.tag?.length     && !f.tag.some(t => row.tags.includes(t))) return false
  if (f.module?.length  && !f.module.every(m => row.modules.find(rm => rm.slug === m && rm.enabled))) return false
  return true
}

function matchSearch(row: Tenant, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const q = search.toLowerCase()
  return row.name.toLowerCase().includes(q)
    || row.owner.name.toLowerCase().includes(q)
    || row.billingEmail.toLowerCase().includes(q)
    || row.tags.some(t => t.toLowerCase().includes(q))
}

function sortRows(rows: Tenant[], by: TenantSortBy = "lastSeen", dir: TenantSortDir = "desc"): Tenant[] {
  const mult = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (by) {
      case "lastSeen": return (a.lastSeenTs - b.lastSeenTs) * mult
      case "mrr":      return (a.mrr - b.mrr) * mult
      case "name":     return a.name.localeCompare(b.name) * mult
      case "seats":    return (a.seats - b.seats) * mult
      case "activity": return (a.activityScore - b.activityScore) * mult
      default: return 0
    }
  })
}

/* ── Public API (tRPC-shaped) ────────────────────────────────────────────── */

export const mockPlatform = {
  tenants(q: TenantQuery = {}): Tenant[] {
    const filtered = TENANTS.filter(r =>
      matchSegment(r, q.segment) && matchFilters(r, q.filters) && matchSearch(r, q.search))
    return sortRows(filtered, q.sortBy, q.sortDir)
  },

  total(): number {
    return TENANTS.length
  },

  getTenant(id: string): Tenant | null {
    return TENANTS.find(t => t.id === id) ?? null
  },

  modules(): ModuleCatalog[] {
    return MODULES
  },

  revenue(): Revenue {
    return REVENUE
  },

  subscriptions(): Subscription[] {
    return SUBSCRIPTIONS
  },

  healthFlags(): HealthFlag[] {
    return HEALTH_FLAGS
  },

  stats(rows: Tenant[]): PlatformStats {
    return buildStats(rows)
  },

  allTags(): string[] {
    return Array.from(new Set(TENANTS.flatMap(t => t.tags))).sort()
  },

  segments: getSegments,
}
