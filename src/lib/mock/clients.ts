/**
 * Mock data layer for client engagements. Single source of truth.
 *
 * Shape mirrors what tRPC will return — when wiring real backend, swap
 * `mockClients.list(q)` for `api.consulting.list.useQuery(q)` with same
 * input/output contract. Field set drives database schema requirements.
 *
 * Required DB fields (per ClientEngagement):
 *   engagements: id, customerId (FK), title, type, status, stage,
 *                health (computed), value, valueUnit, ownerId, lastActivityAt,
 *                proposed flag, risk flag, tags (text[]), createdAt
 *   customers:   id, name, initials, contactName, email, phone, since
 *   nextActions: engagementId, text, due (date), tone (computed)
 */

/* ── Types (tRPC-shaped) ─────────────────────────────────────────────────── */

export type EngagementType = "PROJECT" | "RETAINER" | "HYBRID"
export type EngagementStatus = "DRAFT" | "PROPOSED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"
export type EngagementStage =
  | "DISCOVERY" | "PROPOSAL" | "CONTRACTED" | "ONBOARDING"
  | "AUDITING" | "REPORTING" | "IMPLEMENTING" | "RETAINER"
  | "CLOSED_WON" | "CLOSED_LOST"

export type NextActionTone = "accent" | "info" | "warn" | "danger" | "muted"

export interface CustomerSummary {
  id: string
  initials: string
  name: string
  contactName: string
  email: string
  phone: string
  since: string
  totalSpend: number
  lastBooking: string | null
}

export interface ClientEngagement {
  id: string
  customer: CustomerSummary
  title: string
  type: EngagementType
  status: EngagementStatus
  stage: EngagementStage
  health: number | null
  value: number | null
  valueUnit: "£" | "£/mo" | null
  nextAction: { text: string; when: string; tone: NextActionTone } | null
  owner: { id: string; initials: string; name: string }
  tags: string[]
  lastActivity: string
  lastActivityTs: number /* epoch ms — used for sorting */
  proposed: boolean
  risk: boolean
  riskReason: string | null
  outstanding: { amount: number; daysLate: number } | null
  recentActivity: Array<{ date: string; text: string; tone: "ok" | "info" | "warn" | "danger" | "muted" }>
}

export interface ClientStats {
  active: number
  monthlyRecurring: number
  projectPipeline: number
  awaitingApproval: number
  overdueInvoices: { count: number; total: number }
}

export interface ClientFilters {
  stage?: EngagementStage[]
  type?: EngagementType[]
  status?: EngagementStatus[]
  owner?: string[]      /* owner ids */
  tag?: string[]
  risk?: boolean
  proposed?: boolean
}

export type ClientSortBy = "lastActivity" | "value" | "health" | "customer" | "stage"
export type ClientSortDir = "asc" | "desc"

export interface ClientQuery {
  segment?: string
  search?: string
  filters?: ClientFilters
  sortBy?: ClientSortBy
  sortDir?: ClientSortDir
}

export interface SegmentDef {
  group: string
  items?: Array<{ id: string; label: string; count: number; icon?: string; pinned?: boolean; dot?: "ok" | "warn" | "danger" }>
  tags?: string[]
}

export interface StageMeta { idx: number; label: string; tone: "info" | "warn" | "ok" | "muted" }

/* ── Stage metadata ──────────────────────────────────────────────────────── */

export const STAGE_ORDER: EngagementStage[] = [
  "DISCOVERY", "PROPOSAL", "CONTRACTED", "ONBOARDING",
  "AUDITING", "REPORTING", "IMPLEMENTING", "RETAINER",
  "CLOSED_WON", "CLOSED_LOST",
]

export const STAGE_META: Record<EngagementStage, StageMeta> = {
  DISCOVERY:    { idx: 0, label: "Discovery",    tone: "info"  },
  PROPOSAL:     { idx: 1, label: "Proposal",     tone: "warn"  },
  CONTRACTED:   { idx: 2, label: "Contracted",   tone: "info"  },
  ONBOARDING:   { idx: 3, label: "Onboarding",   tone: "info"  },
  AUDITING:     { idx: 4, label: "Auditing",     tone: "info"  },
  REPORTING:    { idx: 5, label: "Reporting",    tone: "info"  },
  IMPLEMENTING: { idx: 6, label: "Implementing", tone: "info"  },
  RETAINER:     { idx: 7, label: "Retainer",     tone: "ok"    },
  CLOSED_WON:   { idx: 8, label: "Won",          tone: "ok"    },
  CLOSED_LOST:  { idx: 8, label: "Lost",         tone: "muted" },
}

export const TYPE_LABEL: Record<EngagementType, string> = {
  PROJECT: "Project", RETAINER: "Retainer", HYBRID: "Hybrid",
}

/* ── Mock dataset ────────────────────────────────────────────────────────── */

const NOW = Date.now()
const HRS = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000

const ENGAGEMENTS: ClientEngagement[] = [
  {
    id: "c-northwind",
    customer: { id: "cust-nw", initials: "NW", name: "Northwind Co.", contactName: "Mira Sato", email: "mira@northwind.co", phone: "+44 20 7946 0123", since: "Aug 2024", totalSpend: 47250, lastBooking: "Jan 14, 2026" },
    title: "Q2 retainer",
    type: "RETAINER", status: "ACTIVE", stage: "AUDITING",
    health: 92, value: 24500, valueUnit: "£",
    nextAction: { text: "Sprint review Tue", when: "2d", tone: "info" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["fintech", "saas"],
    lastActivity: "4h ago", lastActivityTs: HRS(4),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "Today", text: "Sprint planning meeting concluded", tone: "ok" },
      { date: "Yesterday", text: "Invoice NW-002 sent · £6,125", tone: "info" },
      { date: "Mon", text: "Audit lens TECHNOLOGY scored AMBER", tone: "warn" },
    ],
  },
  {
    id: "c-vellum",
    customer: { id: "cust-vl", initials: "VC", name: "Vellum & Co.", contactName: "Tom Reeves", email: "tom@vellum.co", phone: "+44 20 7946 0456", since: "Mar 2025", totalSpend: 32000, lastBooking: "Dec 03, 2025" },
    title: "Client portal rebuild",
    type: "PROJECT", status: "ACTIVE", stage: "IMPLEMENTING",
    health: 78, value: 48000, valueUnit: "£",
    nextAction: { text: "Send invoice #3", when: "today", tone: "accent" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["ecommerce", "saas"],
    lastActivity: "1d ago", lastActivityTs: DAYS(1),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "Yesterday", text: "Sprint 4 deployed to staging", tone: "ok" },
      { date: "3d ago", text: "Stakeholder feedback collected", tone: "info" },
    ],
  },
  {
    id: "c-seaglass",
    customer: { id: "cust-sg", initials: "SG", name: "Sea Glass Studio", contactName: "Mira Patel", email: "mira@seaglass.studio", phone: "+44 20 7946 0789", since: "Apr 2026", totalSpend: 0, lastBooking: null },
    title: "Discovery + scoping",
    type: "PROJECT", status: "PROPOSED", stage: "PROPOSAL",
    health: 65, value: 18000, valueUnit: "£",
    nextAction: { text: "Awaiting decision", when: "5d", tone: "warn" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["wellness"],
    lastActivity: "3d ago", lastActivityTs: DAYS(3),
    proposed: true, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "3d ago", text: "Proposal v2 sent", tone: "info" },
      { date: "1w ago", text: "Discovery call completed", tone: "ok" },
    ],
  },
  {
    id: "c-bowery",
    customer: { id: "cust-bm", initials: "BM", name: "Bowery Mills", contactName: "Jonas Hale", email: "jonas@bowery.mill", phone: "+44 20 7946 0234", since: "Jun 2024", totalSpend: 42000, lastBooking: "Feb 02, 2026" },
    title: "Monthly ops retainer",
    type: "RETAINER", status: "ACTIVE", stage: "RETAINER",
    health: 88, value: 4200, valueUnit: "£/mo",
    nextAction: { text: "Q1 review call", when: "Wed", tone: "info" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["manufacturing"],
    lastActivity: "2d ago", lastActivityTs: DAYS(2),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "2d ago", text: "March retainer invoice paid", tone: "ok" },
      { date: "1w ago", text: "Workflow optimization deployed", tone: "info" },
    ],
  },
  {
    id: "c-brigham",
    customer: { id: "cust-br", initials: "BA", name: "Brigham Architects", contactName: "Eleanor Brigham", email: "eleanor@brigham-arch.co", phone: "+44 20 7946 0958", since: "Aug 2024", totalSpend: 8000, lastBooking: "Jan 14, 2026" },
    title: "Workflow rebuild",
    type: "PROJECT", status: "PAUSED", stage: "IMPLEMENTING",
    health: 42, value: 12000, valueUnit: "£",
    nextAction: { text: "Overdue invoice £4,000", when: "12d late", tone: "danger" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["fintech", "repeat"],
    lastActivity: "18d ago", lastActivityTs: DAYS(18),
    proposed: false, risk: true,
    riskReason: "Invoice #2 is 12 days overdue, client hasn't replied in 18 days, and the payment-reminder workflow paused after 3 attempts. Last contact bounced.",
    outstanding: { amount: 4000, daysLate: 12 },
    recentActivity: [
      { date: "Apr 02", text: "Payment-reminder workflow paused after 3 attempts", tone: "warn" },
      { date: "Mar 28", text: "Reminder #2 sent · no reply", tone: "muted" },
      { date: "Mar 24", text: "Reminder #1 sent · no reply", tone: "muted" },
      { date: "Mar 20", text: "Invoice #2 due · £4,000", tone: "danger" },
      { date: "Mar 18", text: "Last reply from Eleanor Brigham", tone: "info" },
      { date: "Mar 02", text: "Invoice #1 paid in full · £8,000", tone: "ok" },
    ],
  },
  {
    id: "c-pebble",
    customer: { id: "cust-pp", initials: "PP", name: "Pebble & Pine", contactName: "Asha Kapoor", email: "asha@pebble-pine.co", phone: "+44 20 7946 0111", since: "May 2026", totalSpend: 0, lastBooking: null },
    title: "Initial discovery",
    type: "PROJECT", status: "DRAFT", stage: "DISCOVERY",
    health: null, value: null, valueUnit: null,
    nextAction: { text: "Discovery call", when: "Tue 10am", tone: "info" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["wellness"],
    lastActivity: "1d ago", lastActivityTs: DAYS(1),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "1d ago", text: "Initial enquiry received", tone: "info" },
    ],
  },
  {
    id: "c-midatl",
    customer: { id: "cust-ma", initials: "MA", name: "Mid-Atlantic Co.", contactName: "Daniel Foss", email: "dan@mid-atlantic.co", phone: "+1 212 555 0182", since: "Nov 2025", totalSpend: 22000, lastBooking: "Jan 28, 2026" },
    title: "Reporting setup",
    type: "PROJECT", status: "ACTIVE", stage: "REPORTING",
    health: 81, value: 15500, valueUnit: "£",
    nextAction: { text: "Share deliverable", when: "today", tone: "info" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["saas"],
    lastActivity: "6h ago", lastActivityTs: HRS(6),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "6h ago", text: "Draft report uploaded for review", tone: "info" },
    ],
  },
  {
    id: "c-castor",
    customer: { id: "cust-cf", initials: "CF", name: "Castor Foods", contactName: "Yuki Sato", email: "yuki@castorfoods.co", phone: "+44 20 7946 0567", since: "Jan 2026", totalSpend: 15000, lastBooking: "Apr 11, 2026" },
    title: "Customer ops audit",
    type: "PROJECT", status: "ACTIVE", stage: "AUDITING",
    health: 90, value: 22000, valueUnit: "£",
    nextAction: { text: "Audit window closes", when: "Fri", tone: "warn" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["manufacturing", "fintech"],
    lastActivity: "5h ago", lastActivityTs: HRS(5),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "5h ago", text: "Operations lens scored GREEN", tone: "ok" },
    ],
  },
  {
    id: "c-arden",
    customer: { id: "cust-ar", initials: "AR", name: "Arden Health", contactName: "Priya Vance", email: "priya@ardenhealth.co", phone: "+44 20 7946 0890", since: "Oct 2025", totalSpend: 38000, lastBooking: "Mar 15, 2026" },
    title: "Booking system audit + handover",
    type: "HYBRID", status: "ACTIVE", stage: "REPORTING",
    health: 84, value: 38000, valueUnit: "£",
    nextAction: { text: "Findings call", when: "Thu", tone: "info" },
    owner: { id: "u-lh", initials: "LH", name: "Luke Hodges" },
    tags: ["wellness", "legal"],
    lastActivity: "1d ago", lastActivityTs: DAYS(1),
    proposed: false, risk: false, riskReason: null, outstanding: null,
    recentActivity: [
      { date: "1d ago", text: "Five-lens summary completed", tone: "ok" },
    ],
  },
]

/* ── Segments + tags ─────────────────────────────────────────────────────── */

const ALL_TAGS = Array.from(new Set(ENGAGEMENTS.flatMap(e => e.tags))).sort()

export function getSegments(): SegmentDef[] {
  return [
    {
      group: "Saved views",
      items: [
        { id: "all",      label: "All clients",        count: ENGAGEMENTS.length, icon: "users" },
        { id: "mine",     label: "My active",          count: ENGAGEMENTS.filter(e => e.status === "ACTIVE").length, icon: "star", pinned: true },
        { id: "audit",    label: "Auditing now",       count: ENGAGEMENTS.filter(e => e.stage === "AUDITING").length, icon: "audit", pinned: true },
        { id: "awaiting", label: "Awaiting approval",  count: ENGAGEMENTS.filter(e => e.status === "PROPOSED" || e.status === "PAUSED").length, icon: "clock", pinned: true },
        { id: "overdue",  label: "Overdue invoices",   count: ENGAGEMENTS.filter(e => e.outstanding !== null).length, icon: "invoice", dot: "danger" },
        { id: "risk",     label: "At risk",            count: ENGAGEMENTS.filter(e => e.risk).length, icon: "flag", dot: "danger" },
        { id: "closing",  label: "Closing this month", count: ENGAGEMENTS.filter(e => e.stage === "REPORTING" || e.stage === "RETAINER").length, icon: "target" },
      ],
    },
    {
      group: "By stage",
      items: STAGE_ORDER.filter(s => s !== "CLOSED_LOST").map(s => ({
        id: `stage:${s}`,
        label: STAGE_META[s].label,
        count: ENGAGEMENTS.filter(e => e.stage === s).length,
      })),
    },
    {
      group: "By type",
      items: (Object.keys(TYPE_LABEL) as EngagementType[]).map(t => ({
        id: `type:${t}`,
        label: TYPE_LABEL[t],
        count: ENGAGEMENTS.filter(e => e.type === t).length,
      })),
    },
    { group: "Tags", tags: ALL_TAGS },
  ]
}

/* ── Query (mock tRPC procedure) ─────────────────────────────────────────── */

function matchSegment(row: ClientEngagement, segment: string | undefined): boolean {
  if (!segment) return true
  switch (segment) {
    case "all":      return true
    case "mine":     return row.status === "ACTIVE"
    case "audit":    return row.stage === "AUDITING"
    case "awaiting": return row.status === "PROPOSED" || row.status === "PAUSED"
    case "overdue":  return row.outstanding !== null
    case "risk":     return row.risk
    case "closing":  return row.stage === "REPORTING" || row.stage === "RETAINER"
    default:
      if (segment.startsWith("stage:")) return row.stage === segment.slice(6)
      if (segment.startsWith("type:"))  return row.type === segment.slice(5)
      if (segment.startsWith("tag:"))   return row.tags.includes(segment.slice(4))
      return true
  }
}

function matchFilters(row: ClientEngagement, f: ClientFilters | undefined): boolean {
  if (!f) return true
  if (f.stage?.length  && !f.stage.includes(row.stage)) return false
  if (f.type?.length   && !f.type.includes(row.type)) return false
  if (f.status?.length && !f.status.includes(row.status)) return false
  if (f.owner?.length  && !f.owner.includes(row.owner.id)) return false
  if (f.tag?.length    && !f.tag.some(t => row.tags.includes(t))) return false
  if (f.risk === true     && !row.risk) return false
  if (f.proposed === true && !row.proposed) return false
  return true
}

function matchSearch(row: ClientEngagement, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const q = search.toLowerCase()
  return row.customer.name.toLowerCase().includes(q)
    || row.title.toLowerCase().includes(q)
    || row.customer.contactName.toLowerCase().includes(q)
    || row.tags.some(t => t.toLowerCase().includes(q))
}

function sortRows(rows: ClientEngagement[], by: ClientSortBy = "lastActivity", dir: ClientSortDir = "desc"): ClientEngagement[] {
  const mult = dir === "asc" ? 1 : -1
  const sorted = [...rows]
  sorted.sort((a, b) => {
    switch (by) {
      case "lastActivity": return (a.lastActivityTs - b.lastActivityTs) * mult
      case "value":        return ((a.value ?? -1) - (b.value ?? -1)) * mult
      case "health":       return ((a.health ?? -1) - (b.health ?? -1)) * mult
      case "customer":     return a.customer.name.localeCompare(b.customer.name) * mult
      case "stage":        return (STAGE_META[a.stage].idx - STAGE_META[b.stage].idx) * mult
      default: return 0
    }
  })
  return sorted
}

export const mockClients = {
  list(q: ClientQuery = {}): ClientEngagement[] {
    const filtered = ENGAGEMENTS.filter(r =>
      matchSegment(r, q.segment) && matchFilters(r, q.filters) && matchSearch(r, q.search))
    return sortRows(filtered, q.sortBy, q.sortDir)
  },

  total(): number {
    return ENGAGEMENTS.length
  },

  getById(id: string): ClientEngagement | null {
    return ENGAGEMENTS.find(r => r.id === id) ?? null
  },

  stats(rows: ClientEngagement[]): ClientStats {
    const active = rows.filter(r => r.status === "ACTIVE").length
    const monthlyRecurring = rows
      .filter(r => r.valueUnit === "£/mo" && r.status === "ACTIVE")
      .reduce((s, r) => s + (r.value ?? 0), 0)
    const projectPipeline = rows
      .filter(r => r.type !== "RETAINER" && (r.status === "ACTIVE" || r.status === "PROPOSED"))
      .reduce((s, r) => s + (r.value ?? 0), 0)
    const awaiting = rows.filter(r => r.status === "PROPOSED" || r.status === "PAUSED").length
    const overdue = rows.filter(r => r.outstanding !== null)
    return {
      active,
      monthlyRecurring,
      projectPipeline,
      awaitingApproval: awaiting,
      overdueInvoices: { count: overdue.length, total: overdue.reduce((s, r) => s + (r.outstanding?.amount ?? 0), 0) },
    }
  },

  allOwners(): Array<{ id: string; initials: string; name: string }> {
    const map = new Map<string, { id: string; initials: string; name: string }>()
    for (const r of ENGAGEMENTS) map.set(r.owner.id, r.owner)
    return Array.from(map.values())
  },

  allTags(): string[] {
    return ALL_TAGS
  },

  segments: getSegments,
}
