/**
 * Mock data layer for customers. Single source of truth.
 *
 * Customers are distinct from engagements: a customer is a long-lived
 * record (company/person) that may have many engagements, bookings,
 * invoices, and payments over time. Cross-references ids from
 * `mock/clients.ts` (cust-nw, cust-vl, …) to keep the universe coherent.
 *
 * Future tRPC procedure:
 *   customer.list(query) → Customer[]
 *   customer.getById(id) → Customer | null
 *   customer.stats(rows) → CustomerStats
 *   customer.merge({ sourceId, targetId }) → { mergedCustomerId, audit }
 *
 * Required DB fields (per `Customer`):
 *   customers:        id, name, initials, status, since (date),
 *                     lifetimeValue (num), openInvoicesCount,
 *                     address (text), industry (text), employeesBand (text),
 *                     source (text), notes (text), ownerId
 *   customer_contacts: id, customerId, name, email, phone, role,
 *                     isPrimary (bool), createdAt
 *   customer_tags:    customerId, tag
 *   customer_activity: id, customerId, occurredAt, kind, text, tone
 *   joins:            engagement.customerId, booking.customerId,
 *                     invoice.customerId (FK)
 */

/* ── Types ───────────────────────────────────────────────────────────────── */

export type CustomerStatus = "ACTIVE" | "LEAD" | "DORMANT" | "CHURNED"

export type ActivityTone = "ok" | "info" | "warn" | "danger" | "muted"

export interface CustomerContact {
  id: string
  name: string
  email: string
  phone: string
  role: string
  isPrimary: boolean
}

export interface CustomerActivity {
  date: string                 /* display label */
  text: string
  tone: ActivityTone
  href?: string                /* link to related entity */
}

export interface EngagementSummary {
  active: number
  proposed: number
  closed: number
}

export interface CustomerOwner { id: string; initials: string; name: string }

export interface Customer {
  id: string
  name: string
  initials: string
  status: CustomerStatus
  since: string                /* display label, e.g. "Aug 2024" */
  sinceTs: number              /* epoch ms — precomputed for sort */
  primaryContact: CustomerContact
  contacts: CustomerContact[]
  lifetimeValue: number
  openInvoices: number
  tags: string[]
  address: string
  industry: string
  employees: string            /* band, e.g. "11-50" */
  source: string               /* "Referral", "Inbound form", … */
  notes: string                /* free-text rich note */
  engagementSummary: EngagementSummary
  recentActivity: CustomerActivity[]
  engagementIds: string[]      /* refs into mock/clients.ts */
  bookingIds: string[]
  invoiceIds: string[]
  owner: CustomerOwner
  lastActivity: string
  lastActivityTs: number
}

export interface CustomerStats {
  total: number
  active: number
  leads: number
  dormant: number
  lifetimeValue: number        /* sum across rows */
  avgLifetimeValue: number
  newThisQuarter: number
  openInvoices: number
}

export interface CustomerFilters {
  status?: CustomerStatus[]
  industry?: string[]
  owner?: string[]
  tag?: string[]
  hasOpenInvoices?: boolean
  highValue?: boolean          /* LTV >= 30k */
}

export type CustomerSortBy =
  | "lastActivity" | "lifetimeValue" | "name" | "since" | "engagements"
export type CustomerSortDir = "asc" | "desc"

export interface CustomerQuery {
  segment?: string
  search?: string
  filters?: CustomerFilters
  sortBy?: CustomerSortBy
  sortDir?: CustomerSortDir
}

export interface SegmentDef {
  group: string
  items?: Array<{ id: string; label: string; count: number; icon?: string; pinned?: boolean; dot?: "ok" | "warn" | "danger" }>
  tags?: string[]
}

/* ── Status meta ─────────────────────────────────────────────────────────── */

export const STATUS_META: Record<CustomerStatus, { label: string; tone: "ok" | "warn" | "info" | "muted" }> = {
  ACTIVE:  { label: "Active",  tone: "ok"    },
  LEAD:    { label: "Lead",    tone: "info"  },
  DORMANT: { label: "Dormant", tone: "warn"  },
  CHURNED: { label: "Churned", tone: "muted" },
}

/* ── Dataset ─────────────────────────────────────────────────────────────── */

const NOW = Date.now()
const HRS  = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000

const OWNER_LH: CustomerOwner = { id: "u-lh", initials: "LH", name: "Luke Hodges" }

const CUSTOMERS: Customer[] = [
  {
    id: "cust-nw",
    name: "Northwind Co.",
    initials: "NW",
    status: "ACTIVE",
    since: "Aug 2024", sinceTs: DAYS(620),
    primaryContact: { id: "ct-nw-1", name: "Mira Sato",   email: "mira@northwind.co",   phone: "+44 20 7946 0123", role: "Founder",     isPrimary: true  },
    contacts: [
      { id: "ct-nw-1", name: "Mira Sato",     email: "mira@northwind.co",     phone: "+44 20 7946 0123", role: "Founder",     isPrimary: true  },
      { id: "ct-nw-2", name: "Lara Kim",      email: "lara@northwind.co",     phone: "+44 20 7946 0124", role: "Finance",     isPrimary: false },
      { id: "ct-nw-3", name: "Sam Greaves",   email: "sam@northwind.co",      phone: "+44 20 7946 0125", role: "Ops lead",    isPrimary: false },
    ],
    lifetimeValue: 47250,
    openInvoices: 1,
    tags: ["fintech", "saas", "high-value"],
    address: "12 Charterhouse Square, London EC1M",
    industry: "Fintech",
    employees: "11-50",
    source: "Referral · Bowery Mills",
    notes: "Prefers async. Don't book past 16:00 UK. Lara approves all spend > £500. Strong renewal signal — NPS 9 after sprint 3 retro.",
    engagementSummary: { active: 1, proposed: 0, closed: 1 },
    recentActivity: [
      { date: "4h ago",    text: "Sprint planning meeting concluded",   tone: "ok",   href: "/admin/clients/c-northwind" },
      { date: "Yesterday", text: "Invoice NW-002 sent · £6,125",         tone: "info", href: "/admin/payments/inv-nw-002" },
      { date: "Mon",       text: "Audit lens TECHNOLOGY scored AMBER",   tone: "warn", href: "/admin/clients/c-northwind" },
      { date: "Apr 02",    text: "Sprint 3 demo · 5★ review submitted",  tone: "ok",   href: "/admin/reviews" },
    ],
    engagementIds: ["c-northwind"],
    bookingIds: ["bk-2203", "bk-2204"],
    invoiceIds: ["inv-nw-001", "inv-nw-002", "inv-nw-003"],
    owner: OWNER_LH,
    lastActivity: "4h ago", lastActivityTs: HRS(4),
  },
  {
    id: "cust-vl",
    name: "Vellum & Co.",
    initials: "VC",
    status: "ACTIVE",
    since: "Mar 2025", sinceTs: DAYS(430),
    primaryContact: { id: "ct-vl-1", name: "Tom Reeves", email: "tom@vellum.co", phone: "+44 20 7946 0456", role: "CEO", isPrimary: true },
    contacts: [
      { id: "ct-vl-1", name: "Tom Reeves",    email: "tom@vellum.co",     phone: "+44 20 7946 0456", role: "CEO",     isPrimary: true  },
      { id: "ct-vl-2", name: "Sarah Rowe",    email: "sarah@vellum.co",   phone: "+44 20 7946 0457", role: "Finance", isPrimary: false },
    ],
    lifetimeValue: 32000,
    openInvoices: 1,
    tags: ["ecommerce", "saas"],
    address: "44 Hoxton Square, London N1",
    industry: "SaaS",
    employees: "11-50",
    source: "Inbound form",
    notes: "Sprint cadence: two-week sprints. Tom prefers Loom over meetings. Watch the portal copy tone — already pushed back once.",
    engagementSummary: { active: 1, proposed: 0, closed: 0 },
    recentActivity: [
      { date: "Yesterday", text: "Sprint 4 deployed to staging",     tone: "ok",   href: "/admin/clients/c-vellum" },
      { date: "3d ago",    text: "Stakeholder feedback collected",   tone: "info", href: "/admin/forms" },
      { date: "1w ago",    text: "Invoice /inv_2041 awaiting sign-off", tone: "warn", href: "/admin/payments/inv-2041" },
    ],
    engagementIds: ["c-vellum"],
    bookingIds: ["bk-vl-101"],
    invoiceIds: ["inv-2027", "inv-2039", "inv-2041"],
    owner: OWNER_LH,
    lastActivity: "1d ago", lastActivityTs: DAYS(1),
  },
  {
    id: "cust-sg",
    name: "Sea Glass Studio",
    initials: "SG",
    status: "LEAD",
    since: "Apr 2026", sinceTs: DAYS(20),
    primaryContact: { id: "ct-sg-1", name: "Mira Patel", email: "mira@seaglass.studio", phone: "+44 20 7946 0789", role: "Director", isPrimary: true },
    contacts: [
      { id: "ct-sg-1", name: "Mira Patel", email: "mira@seaglass.studio", phone: "+44 20 7946 0789", role: "Director", isPrimary: true },
    ],
    lifetimeValue: 0,
    openInvoices: 0,
    tags: ["wellness"],
    address: "8 Brunswick Centre, London WC1N",
    industry: "Wellness",
    employees: "1-10",
    source: "LinkedIn outreach",
    notes: "Discovery call went well — clear pain around manual booking flow. Budget unclear; expects under £20k for v1.",
    engagementSummary: { active: 0, proposed: 1, closed: 0 },
    recentActivity: [
      { date: "3d ago", text: "Proposal v2 sent",          tone: "info", href: "/admin/clients/c-seaglass" },
      { date: "1w ago", text: "Discovery call completed",  tone: "ok",   href: "/admin/bookings/bk-sg-1" },
    ],
    engagementIds: ["c-seaglass"],
    bookingIds: ["bk-sg-1"],
    invoiceIds: [],
    owner: OWNER_LH,
    lastActivity: "3d ago", lastActivityTs: DAYS(3),
  },
  {
    id: "cust-bm",
    name: "Bowery Mills",
    initials: "BM",
    status: "ACTIVE",
    since: "Jun 2024", sinceTs: DAYS(700),
    primaryContact: { id: "ct-bm-1", name: "Jonas Hale", email: "jonas@bowery.mill", phone: "+44 20 7946 0234", role: "COO", isPrimary: true },
    contacts: [
      { id: "ct-bm-1", name: "Jonas Hale",     email: "jonas@bowery.mill",     phone: "+44 20 7946 0234", role: "COO",        isPrimary: true  },
      { id: "ct-bm-2", name: "Rita Calderon",  email: "rita@bowery.mill",      phone: "+44 20 7946 0235", role: "Operations", isPrimary: false },
    ],
    lifetimeValue: 42000,
    openInvoices: 0,
    tags: ["manufacturing", "repeat"],
    address: "Mill House, Stoke-on-Trent ST1",
    industry: "Manufacturing",
    employees: "51-200",
    source: "Inbound form",
    notes: "Monthly retainer. Renewed twice. Jonas referred Northwind — strong advocate.",
    engagementSummary: { active: 1, proposed: 0, closed: 2 },
    recentActivity: [
      { date: "2d ago", text: "March retainer invoice paid",     tone: "ok",   href: "/admin/payments/inv-bm-12" },
      { date: "1w ago", text: "Workflow optimization deployed",  tone: "info", href: "/admin/clients/c-bowery" },
    ],
    engagementIds: ["c-bowery"],
    bookingIds: ["bk-bm-201", "bk-bm-202"],
    invoiceIds: ["inv-bm-10", "inv-bm-11", "inv-bm-12"],
    owner: OWNER_LH,
    lastActivity: "2d ago", lastActivityTs: DAYS(2),
  },
  {
    id: "cust-br",
    name: "Brigham Architects",
    initials: "BA",
    status: "DORMANT",
    since: "Aug 2024", sinceTs: DAYS(610),
    primaryContact: { id: "ct-br-1", name: "Eleanor Brigham", email: "eleanor@brigham-arch.co", phone: "+44 20 7946 0958", role: "Partner", isPrimary: true },
    contacts: [
      { id: "ct-br-1", name: "Eleanor Brigham", email: "eleanor@brigham-arch.co", phone: "+44 20 7946 0958", role: "Partner",   isPrimary: true  },
      { id: "ct-br-2", name: "James Brigham",   email: "james@brigham-arch.co",   phone: "+44 20 7946 0959", role: "Principal", isPrimary: false },
    ],
    lifetimeValue: 8000,
    openInvoices: 1,
    tags: ["fintech", "at-risk", "repeat"],
    address: "210 Marylebone Rd, London NW1",
    industry: "Architecture",
    employees: "11-50",
    source: "Referral",
    notes: "Invoice #2 is 12 days overdue. Eleanor hasn't replied in 18 days. Last contact bounced — likely on parental leave. Try James.",
    engagementSummary: { active: 0, proposed: 0, closed: 1 },
    recentActivity: [
      { date: "Apr 02", text: "Payment-reminder workflow paused after 3 attempts", tone: "warn",   href: "/admin/workflows/wf-887" },
      { date: "Mar 28", text: "Reminder #2 sent · no reply",                       tone: "muted",  href: "/admin/payments/inv-br-2" },
      { date: "Mar 24", text: "Reminder #1 sent · no reply",                       tone: "muted",  href: "/admin/payments/inv-br-2" },
      { date: "Mar 20", text: "Invoice #2 due · £4,000",                           tone: "danger", href: "/admin/payments/inv-br-2" },
      { date: "Mar 02", text: "Invoice #1 paid in full · £8,000",                  tone: "ok",     href: "/admin/payments/inv-br-1" },
    ],
    engagementIds: ["c-brigham"],
    bookingIds: ["bk-br-101"],
    invoiceIds: ["inv-br-1", "inv-br-2"],
    owner: OWNER_LH,
    lastActivity: "18d ago", lastActivityTs: DAYS(18),
  },
  {
    id: "cust-pp",
    name: "Pebble & Pine",
    initials: "PP",
    status: "LEAD",
    since: "May 2026", sinceTs: DAYS(8),
    primaryContact: { id: "ct-pp-1", name: "Asha Kapoor", email: "asha@pebble-pine.co", phone: "+44 20 7946 0111", role: "Founder", isPrimary: true },
    contacts: [
      { id: "ct-pp-1", name: "Asha Kapoor", email: "asha@pebble-pine.co", phone: "+44 20 7946 0111", role: "Founder", isPrimary: true },
    ],
    lifetimeValue: 0,
    openInvoices: 0,
    tags: ["wellness"],
    address: "Studio 14, Hackney Wick, London E9",
    industry: "Wellness",
    employees: "1-10",
    source: "Inbound enquiry",
    notes: "New enquiry from this week. Mentioned wanting to explore a booking-system audit. Discovery call slot pending.",
    engagementSummary: { active: 0, proposed: 0, closed: 0 },
    recentActivity: [
      { date: "1d ago", text: "Initial enquiry received", tone: "info", href: "/admin/inbox" },
    ],
    engagementIds: ["c-pebble"],
    bookingIds: [],
    invoiceIds: [],
    owner: OWNER_LH,
    lastActivity: "1d ago", lastActivityTs: DAYS(1),
  },
  {
    id: "cust-ma",
    name: "Mid-Atlantic Co.",
    initials: "MA",
    status: "ACTIVE",
    since: "Nov 2025", sinceTs: DAYS(180),
    primaryContact: { id: "ct-ma-1", name: "Daniel Foss", email: "dan@mid-atlantic.co", phone: "+1 212 555 0182", role: "Director", isPrimary: true },
    contacts: [
      { id: "ct-ma-1", name: "Daniel Foss",    email: "dan@mid-atlantic.co",    phone: "+1 212 555 0182", role: "Director", isPrimary: true  },
      { id: "ct-ma-2", name: "Yuki Tanaka",    email: "yuki@mid-atlantic.co",   phone: "+1 212 555 0183", role: "Analyst",  isPrimary: false },
    ],
    lifetimeValue: 22000,
    openInvoices: 0,
    tags: ["saas"],
    address: "550 Madison Ave, New York NY 10022",
    industry: "SaaS",
    employees: "51-200",
    source: "Conference · SaaStr",
    notes: "Reporting setup project. Dan wants a deliverable Friday — he's presenting to the board Monday.",
    engagementSummary: { active: 1, proposed: 0, closed: 0 },
    recentActivity: [
      { date: "6h ago", text: "Draft report uploaded for review", tone: "info", href: "/admin/clients/c-midatl" },
    ],
    engagementIds: ["c-midatl"],
    bookingIds: ["bk-ma-301"],
    invoiceIds: ["inv-ma-1"],
    owner: OWNER_LH,
    lastActivity: "6h ago", lastActivityTs: HRS(6),
  },
  {
    id: "cust-cf",
    name: "Castor Foods",
    initials: "CF",
    status: "ACTIVE",
    since: "Jan 2026", sinceTs: DAYS(120),
    primaryContact: { id: "ct-cf-1", name: "Yuki Sato", email: "yuki@castorfoods.co", phone: "+44 20 7946 0567", role: "Head of Ops", isPrimary: true },
    contacts: [
      { id: "ct-cf-1", name: "Yuki Sato",    email: "yuki@castorfoods.co",    phone: "+44 20 7946 0567", role: "Head of Ops", isPrimary: true  },
      { id: "ct-cf-2", name: "Rohan Mehta",  email: "rohan@castorfoods.co",   phone: "+44 20 7946 0568", role: "Finance",      isPrimary: false },
    ],
    lifetimeValue: 15000,
    openInvoices: 0,
    tags: ["manufacturing", "fintech"],
    address: "Castor Works, Bristol BS3",
    industry: "Food & Bev",
    employees: "201-500",
    source: "Referral · Bowery Mills",
    notes: "Audit project in flight. Audit window closes Friday — protect that deadline.",
    engagementSummary: { active: 1, proposed: 0, closed: 0 },
    recentActivity: [
      { date: "5h ago", text: "Operations lens scored GREEN", tone: "ok", href: "/admin/clients/c-castor" },
    ],
    engagementIds: ["c-castor"],
    bookingIds: ["bk-cf-401"],
    invoiceIds: ["inv-cf-1"],
    owner: OWNER_LH,
    lastActivity: "5h ago", lastActivityTs: HRS(5),
  },
  {
    id: "cust-ar",
    name: "Arden Health",
    initials: "AR",
    status: "ACTIVE",
    since: "Oct 2025", sinceTs: DAYS(210),
    primaryContact: { id: "ct-ar-1", name: "Priya Vance", email: "priya@ardenhealth.co", phone: "+44 20 7946 0890", role: "Director", isPrimary: true },
    contacts: [
      { id: "ct-ar-1", name: "Priya Vance",    email: "priya@ardenhealth.co", phone: "+44 20 7946 0890", role: "Director",       isPrimary: true  },
      { id: "ct-ar-2", name: "Jamie Park",     email: "jamie@ardenhealth.co", phone: "+44 20 7946 0891", role: "Design lead",    isPrimary: false },
      { id: "ct-ar-3", name: "Owen Bradshaw",  email: "owen@ardenhealth.co",  phone: "+44 20 7946 0892", role: "Clinical lead",  isPrimary: false },
    ],
    lifetimeValue: 38000,
    openInvoices: 0,
    tags: ["wellness", "legal", "high-value"],
    address: "16 Wimpole St, London W1G",
    industry: "Healthcare",
    employees: "51-200",
    source: "Referral · Northwind",
    notes: "Booking-system audit + handover. Priya is decisive. Jamie owns the portal-copy review thread.",
    engagementSummary: { active: 1, proposed: 0, closed: 0 },
    recentActivity: [
      { date: "1d ago", text: "Five-lens summary completed", tone: "ok",   href: "/admin/clients/c-arden" },
      { date: "2h ago", text: "Jamie replied on portal copy", tone: "info", href: "/admin/inbox" },
    ],
    engagementIds: ["c-arden"],
    bookingIds: ["bk-ar-501"],
    invoiceIds: ["inv-ar-1", "inv-ar-2"],
    owner: OWNER_LH,
    lastActivity: "2h ago", lastActivityTs: HRS(2),
  },
  {
    id: "cust-gs",
    name: "Greystone Digital",
    initials: "GS",
    status: "CHURNED",
    since: "Feb 2024", sinceTs: DAYS(820),
    primaryContact: { id: "ct-gs-1", name: "Liam Walker", email: "liam@greystone.io", phone: "+44 20 7946 0992", role: "CTO", isPrimary: true },
    contacts: [
      { id: "ct-gs-1", name: "Liam Walker", email: "liam@greystone.io", phone: "+44 20 7946 0992", role: "CTO", isPrimary: true },
    ],
    lifetimeValue: 11000,
    openInvoices: 0,
    tags: ["saas"],
    address: "1 Finsbury Avenue, London EC2M",
    industry: "SaaS",
    employees: "11-50",
    source: "Inbound form",
    notes: "Engagement closed end of 2024 — internal team rebuilt. Stay on warm-list, possible Q3 reactivation.",
    engagementSummary: { active: 0, proposed: 0, closed: 1 },
    recentActivity: [
      { date: "Jan 12", text: "Engagement closed · scope complete", tone: "muted", href: "/admin/clients" },
    ],
    engagementIds: [],
    bookingIds: [],
    invoiceIds: ["inv-gs-1"],
    owner: OWNER_LH,
    lastActivity: "120d ago", lastActivityTs: DAYS(120),
  },
]

/* ── Aggregates ──────────────────────────────────────────────────────────── */

const ALL_TAGS = Array.from(new Set(CUSTOMERS.flatMap(c => c.tags))).sort()
const ALL_INDUSTRIES = Array.from(new Set(CUSTOMERS.map(c => c.industry))).sort()
const ALL_OWNERS: CustomerOwner[] = (() => {
  const map = new Map<string, CustomerOwner>()
  for (const c of CUSTOMERS) map.set(c.owner.id, c.owner)
  return Array.from(map.values())
})()

/* "new this quarter" = since within ~90 days. Precomputed (not in render). */
const QUARTER_MS = 90 * 24 * 60 * 60 * 1000
const NEW_THIS_QUARTER_IDS = new Set(CUSTOMERS.filter(c => NOW - c.sinceTs <= QUARTER_MS).map(c => c.id))

export function getSegments(): SegmentDef[] {
  return [
    {
      group: "Saved views",
      items: [
        { id: "all",        label: "All customers",   count: CUSTOMERS.length,                                                  icon: "users" },
        { id: "active",     label: "Active",          count: CUSTOMERS.filter(c => c.status === "ACTIVE").length,               icon: "check",     pinned: true },
        { id: "leads",      label: "Leads",           count: CUSTOMERS.filter(c => c.status === "LEAD").length,                 icon: "sparkles",  pinned: true },
        { id: "dormant",    label: "Dormant",         count: CUSTOMERS.filter(c => c.status === "DORMANT").length,              icon: "clock",     dot:    "warn" },
        { id: "at-risk",    label: "At risk",         count: CUSTOMERS.filter(c => c.openInvoices > 0 && c.status !== "ACTIVE").length, icon: "flag", dot: "danger" },
        { id: "high-value", label: "High value",      count: CUSTOMERS.filter(c => c.lifetimeValue >= 30000).length,            icon: "star" },
        { id: "repeat",     label: "Repeat",          count: CUSTOMERS.filter(c => c.tags.includes("repeat")).length,           icon: "refresh" },
        { id: "new",        label: "New this quarter",count: NEW_THIS_QUARTER_IDS.size,                                         icon: "plus" },
      ],
    },
    {
      group: "By status",
      items: (Object.keys(STATUS_META) as CustomerStatus[]).map(s => ({
        id: `status:${s}`,
        label: STATUS_META[s].label,
        count: CUSTOMERS.filter(c => c.status === s).length,
      })),
    },
    {
      group: "By industry",
      items: ALL_INDUSTRIES.map(i => ({
        id: `industry:${i}`,
        label: i,
        count: CUSTOMERS.filter(c => c.industry === i).length,
      })),
    },
    { group: "Tags", tags: ALL_TAGS },
  ]
}

/* ── Query (mock tRPC procedure) ─────────────────────────────────────────── */

function matchSegment(row: Customer, segment: string | undefined): boolean {
  if (!segment) return true
  switch (segment) {
    case "all":        return true
    case "active":     return row.status === "ACTIVE"
    case "leads":      return row.status === "LEAD"
    case "dormant":    return row.status === "DORMANT"
    case "at-risk":    return row.openInvoices > 0 && row.status !== "ACTIVE"
    case "high-value": return row.lifetimeValue >= 30000
    case "repeat":     return row.tags.includes("repeat")
    case "new":        return NEW_THIS_QUARTER_IDS.has(row.id)
    default:
      if (segment.startsWith("status:"))   return row.status === segment.slice(7)
      if (segment.startsWith("industry:")) return row.industry === segment.slice(9)
      if (segment.startsWith("tag:"))      return row.tags.includes(segment.slice(4))
      return true
  }
}

function matchFilters(row: Customer, f: CustomerFilters | undefined): boolean {
  if (!f) return true
  if (f.status?.length   && !f.status.includes(row.status)) return false
  if (f.industry?.length && !f.industry.includes(row.industry)) return false
  if (f.owner?.length    && !f.owner.includes(row.owner.id)) return false
  if (f.tag?.length      && !f.tag.some(t => row.tags.includes(t))) return false
  if (f.hasOpenInvoices  && row.openInvoices === 0) return false
  if (f.highValue        && row.lifetimeValue < 30000) return false
  return true
}

function matchSearch(row: Customer, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const q = search.toLowerCase()
  return row.name.toLowerCase().includes(q)
    || row.primaryContact.name.toLowerCase().includes(q)
    || row.primaryContact.email.toLowerCase().includes(q)
    || row.industry.toLowerCase().includes(q)
    || row.tags.some(t => t.toLowerCase().includes(q))
    || row.contacts.some(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
}

function sortRows(rows: Customer[], by: CustomerSortBy = "lastActivity", dir: CustomerSortDir = "desc"): Customer[] {
  const mult = dir === "asc" ? 1 : -1
  const sorted = [...rows]
  sorted.sort((a, b) => {
    switch (by) {
      case "lastActivity":  return (a.lastActivityTs - b.lastActivityTs) * mult
      case "lifetimeValue": return (a.lifetimeValue - b.lifetimeValue) * mult
      case "name":          return a.name.localeCompare(b.name) * mult
      case "since":         return (a.sinceTs - b.sinceTs) * mult
      case "engagements":   return ((a.engagementSummary.active + a.engagementSummary.proposed) - (b.engagementSummary.active + b.engagementSummary.proposed)) * mult
      default: return 0
    }
  })
  return sorted
}

export const mockCustomers = {
  list(q: CustomerQuery = {}): Customer[] {
    const filtered = CUSTOMERS.filter(r =>
      matchSegment(r, q.segment) && matchFilters(r, q.filters) && matchSearch(r, q.search))
    return sortRows(filtered, q.sortBy, q.sortDir)
  },

  total(): number {
    return CUSTOMERS.length
  },

  getById(id: string): Customer | null {
    return CUSTOMERS.find(c => c.id === id) ?? null
  },

  stats(rows: Customer[]): CustomerStats {
    const total = rows.length
    const active  = rows.filter(c => c.status === "ACTIVE").length
    const leads   = rows.filter(c => c.status === "LEAD").length
    const dormant = rows.filter(c => c.status === "DORMANT").length
    const ltv     = rows.reduce((s, r) => s + r.lifetimeValue, 0)
    const openInvoices = rows.reduce((s, r) => s + r.openInvoices, 0)
    const newThisQuarter = rows.filter(r => NEW_THIS_QUARTER_IDS.has(r.id)).length
    return {
      total, active, leads, dormant,
      lifetimeValue: ltv,
      avgLifetimeValue: total ? Math.round(ltv / total) : 0,
      newThisQuarter,
      openInvoices,
    }
  },

  allOwners(): CustomerOwner[] {
    return ALL_OWNERS
  },

  allTags(): string[] {
    return ALL_TAGS
  },

  allIndustries(): string[] {
    return ALL_INDUSTRIES
  },

  segments: getSegments,
}
