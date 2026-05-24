/**
 * Mock data layer for the sales pipeline (/admin/pipeline). tRPC-shaped.
 *
 * Future tRPC procedure:
 *   pipeline.list(query) → Deal[]
 *   pipeline.getById(id) → Deal | null
 *   pipeline.stats(rows) → DealStats
 *   pipeline.advanceStage(id, toStage) / pipeline.markWon(id) / pipeline.markLost(id, reason) / ...
 *
 * Required DB fields:
 *   deals: id, customerId (FK), title, stage, value, currency,
 *          probability (int 0..100), expectedCloseAt, source, ownerId,
 *          tags (text[]), lastActivityAt, createdAt, daysInStage (computed),
 *          engagementId (FK, nullable — set when CLOSED_WON converts),
 *          lostReason (text, nullable)
 *   customers: id, name, initials, contactName, email, phone
 *   dealActivity: dealId, kind, text, tone, occurredAt
 *   dealNotes: dealId, author, body, createdAt
 *   dealContacts: dealId, name, role, email, phone
 *   dealProposals: dealId, version, sentAt, openedAt, status, value
 */

/* ── Types (tRPC-shaped) ─────────────────────────────────────────────────── */

export type DealStage =
  | "LEAD" | "QUALIFIED" | "DISCOVERY" | "PROPOSAL"
  | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST"

export type DealSource =
  | "REFERRAL" | "INBOUND" | "OUTBOUND" | "WEBSITE" | "PARTNER" | "EVENT"

export type DealActivityTone = "ok" | "info" | "warn" | "danger" | "muted" | "accent"

export interface DealCustomer {
  id: string
  initials: string
  name: string
  contactName: string
  email: string
  phone: string
}

export interface DealContact {
  name: string
  role: string
  email: string
  phone: string
  primary: boolean
}

export interface DealActivity {
  date: string
  time: string
  icon: "mail" | "phone" | "calendar" | "flag" | "plus" | "sparkles" | "money" | "check" | "x"
  tone: DealActivityTone
  title: string
  desc: string
}

export interface DealNote {
  author: string
  initials: string
  when: string
  body: string
}

export interface DealProposal {
  id: string
  version: number
  sentAt: string
  openedAt: string | null
  status: "DRAFT" | "SENT" | "OPENED" | "ACCEPTED" | "DECLINED"
  value: number
}

export interface Deal {
  id: string
  customer: DealCustomer
  title: string
  stage: DealStage
  value: number               /* whole £ */
  probability: number         /* 0..100 */
  expectedClose: string       /* display */
  expectedCloseTs: number     /* epoch ms */
  source: DealSource
  owner: { id: string; initials: string; name: string }
  tags: string[]
  lastActivity: string        /* display, precomputed */
  lastActivityTs: number
  daysInStage: number         /* precomputed */
  staleness: "fresh" | "stale" | "stuck"  /* precomputed bucket */
  isPastDueClose: boolean     /* precomputed — for non-terminal stages */
  createdAt: string
  lostReason: string | null
  engagementId: string | null
  contacts: DealContact[]
  activity: DealActivity[]
  notes: DealNote[]
  proposals: DealProposal[]
}

export interface DealStats {
  totalValue: number
  weightedValue: number
  closingThisMonth: number
  winRate: number             /* 0..100 — over last 30d in dataset */
  avgDealSize: number
  count: number
}

export interface DealFilters {
  stage?: DealStage[]
  source?: DealSource[]
  owner?: string[]
  tag?: string[]
  staleness?: Array<"fresh" | "stale" | "stuck">
}

export type DealSortBy =
  | "lastActivity" | "value" | "probability" | "expectedClose" | "customer" | "stage" | "daysInStage"
export type DealSortDir = "asc" | "desc"

export interface DealQuery {
  segment?: string
  search?: string
  filters?: DealFilters
  sortBy?: DealSortBy
  sortDir?: DealSortDir
}

export interface PipelineSegmentDef {
  group: string
  items?: Array<{ id: string; label: string; count: number; icon?: string; pinned?: boolean; dot?: "ok" | "warn" | "danger" }>
  tags?: string[]
}

export interface StageMeta { idx: number; label: string; tone: "info" | "warn" | "ok" | "muted" | "accent" | "danger" }

/* ── Stage metadata ──────────────────────────────────────────────────────── */

export const STAGE_ORDER: DealStage[] = [
  "LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL",
  "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST",
]

/* board excludes terminal "lost" so it doesn't visually take a column */
export const BOARD_STAGES: DealStage[] = [
  "LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "CLOSED_WON",
]

export const STAGE_META: Record<DealStage, StageMeta> = {
  LEAD:         { idx: 0, label: "Lead",        tone: "muted"  },
  QUALIFIED:    { idx: 1, label: "Qualified",   tone: "info"   },
  DISCOVERY:    { idx: 2, label: "Discovery",   tone: "info"   },
  PROPOSAL:     { idx: 3, label: "Proposal",    tone: "warn"   },
  NEGOTIATION:  { idx: 4, label: "Negotiation", tone: "accent" },
  CLOSED_WON:   { idx: 5, label: "Won",         tone: "ok"     },
  CLOSED_LOST:  { idx: 5, label: "Lost",        tone: "danger" },
}

/* stage → default win probability (used for fresh deals + weighted-value calc) */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  LEAD: 10, QUALIFIED: 25, DISCOVERY: 40, PROPOSAL: 60,
  NEGOTIATION: 80, CLOSED_WON: 100, CLOSED_LOST: 0,
}

export const SOURCE_LABEL: Record<DealSource, string> = {
  REFERRAL: "Referral", INBOUND: "Inbound", OUTBOUND: "Outbound",
  WEBSITE: "Website", PARTNER: "Partner", EVENT: "Event",
}

/* ── Time helpers (computed once at module load — pure renders downstream) ── */

const NOW = Date.now()
const HRS  = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000
const PLUS_DAYS = (d: number) => NOW + d * 24 * 60 * 60 * 1000

function relTime(ts: number): string {
  const delta = NOW - ts
  const h = delta / (60 * 60 * 1000)
  const d = h / 24
  if (h < 1) return `${Math.max(1, Math.round(delta / 60000))}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  if (d < 7) return `${Math.round(d)}d ago`
  return `${Math.round(d / 7)}w ago`
}

function staleBucket(daysSinceActivity: number): "fresh" | "stale" | "stuck" {
  if (daysSinceActivity < 5) return "fresh"
  if (daysSinceActivity < 14) return "stale"
  return "stuck"
}

function closeDateStr(ts: number): string {
  const d = new Date(ts)
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[d.getMonth()]} ${d.getDate()}`
}

/* ── Mock dataset ────────────────────────────────────────────────────────── */

type DealSeed = Omit<Deal, "lastActivity" | "daysInStage" | "staleness" | "expectedClose" | "probability" | "isPastDueClose"> & {
  expectedCloseTs: number
  lastActivityTs: number
  stageEnteredTs: number
  probability?: number
}

const OWNER_LH = { id: "u-lh", initials: "LH", name: "Luke Hodges" }
const OWNER_SR = { id: "u-sr", initials: "SR", name: "Sarah Rowe" }
const OWNER_PV = { id: "u-pv", initials: "PV", name: "Priya Vance" }

const SEEDS: DealSeed[] = [
  {
    id: "deal_olsen",
    customer: { id: "cust-ol", initials: "OB", name: "Olsen Brands", contactName: "Tomas Olsen", email: "tomas@olsenbrands.co", phone: "+44 7911 123456" },
    title: "Brand refresh + portal",
    stage: "NEGOTIATION", value: 42000, expectedCloseTs: PLUS_DAYS(12),
    source: "REFERRAL", owner: OWNER_LH, tags: ["referral", "saas"],
    lastActivityTs: HRS(4), stageEnteredTs: DAYS(6), createdAt: "Mar 22, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Tomas Olsen", role: "CEO", email: "tomas@olsenbrands.co", phone: "+44 7911 123456", primary: true },
      { name: "Eliza Bell",  role: "COO", email: "eliza@olsenbrands.co", phone: "+44 7911 444112", primary: false },
    ],
    activity: [
      { date: "Today", time: "09:15", icon: "mail",  tone: "accent", title: "Email sent",      desc: "Revised SoW v2 with tightened timeline" },
      { date: "Mon",   time: "14:00", icon: "phone", tone: "ok",     title: "Negotiation call", desc: "Agreed scope. Tomas pushing for 10% off, asked for proof points" },
      { date: "Fri",   time: "10:00", icon: "mail",  tone: "info",   title: "Proposal opened", desc: "Read 4 times by Tomas + COO" },
      { date: "Mar 22","time": "16:30", icon: "plus", tone: "muted",  title: "Deal created",    desc: "Referral from Mira Sato (Northwind)" },
    ],
    notes: [
      { author: "Luke Hodges", initials: "LH", when: "today", body: "Tomas wants Q3 start. Hold price at £42k, drop scope item 4 if pushed." },
    ],
    proposals: [
      { id: "prop-olsen-v2", version: 2, sentAt: "today 09:15", openedAt: "today 09:42", status: "OPENED",   value: 42000 },
      { id: "prop-olsen-v1", version: 1, sentAt: "Fri 10:00",   openedAt: "Fri 10:14",   status: "DECLINED", value: 46000 },
    ],
  },
  {
    id: "deal_cardinal",
    customer: { id: "cust-cd", initials: "CD", name: "Cardinal Health Co.", contactName: "Priya Mehta", email: "priya@cardinal.health", phone: "+44 20 7946 0445" },
    title: "Q3 audit + roadmap",
    stage: "PROPOSAL", value: 28000, expectedCloseTs: PLUS_DAYS(18),
    source: "OUTBOUND", owner: OWNER_LH, tags: ["wellness", "audit"],
    lastActivityTs: DAYS(2), stageEnteredTs: DAYS(5), createdAt: "Apr 02, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Priya Mehta", role: "Head of Ops", email: "priya@cardinal.health", phone: "+44 20 7946 0445", primary: true },
    ],
    activity: [
      { date: "Wed", time: "11:00", icon: "mail",     tone: "info", title: "Proposal sent",    desc: "v1 — £28k, 6-week audit window" },
      { date: "Tue", time: "15:30", icon: "calendar", tone: "ok",   title: "Scoping call",     desc: "60m with Priya + 2 stakeholders" },
      { date: "Apr 02","time": "09:00", icon: "plus", tone: "muted", title: "Deal created",     desc: "Replied to cold outreach sequence #4" },
    ],
    notes: [],
    proposals: [
      { id: "prop-card-v1", version: 1, sentAt: "Wed 11:00", openedAt: "Wed 11:24", status: "OPENED", value: 28000 },
    ],
  },
  {
    id: "deal_lume",
    customer: { id: "cust-lm", initials: "LM", name: "Lume Studio", contactName: "Asher Lume", email: "asher@lume.studio", phone: "+44 20 7946 0220" },
    title: "Booking system rebuild",
    stage: "PROPOSAL", value: 18500, expectedCloseTs: PLUS_DAYS(7),
    source: "INBOUND", owner: OWNER_SR, tags: ["wellness", "saas"],
    lastActivityTs: DAYS(6), stageEnteredTs: DAYS(8), createdAt: "Apr 10, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Asher Lume", role: "Founder", email: "asher@lume.studio", phone: "+44 20 7946 0220", primary: true },
    ],
    activity: [
      { date: "Fri", time: "10:00", icon: "mail",  tone: "warn", title: "Follow-up #2",  desc: "No reply since Tue. Sent nudge." },
      { date: "Tue", time: "16:00", icon: "mail",  tone: "info", title: "Proposal sent", desc: "v1 — £18.5k, 4-week build" },
    ],
    notes: [
      { author: "Sarah Rowe", initials: "SR", when: "Fri", body: "Cooling off — Asher mentioned cashflow. Try a phased option." },
    ],
    proposals: [
      { id: "prop-lume-v1", version: 1, sentAt: "Tue 16:00", openedAt: "Tue 16:21", status: "SENT", value: 18500 },
    ],
  },
  {
    id: "deal_hatch",
    customer: { id: "cust-hc", initials: "HC", name: "Hatch & Co.", contactName: "Marin Hatch", email: "marin@hatchco.uk", phone: "+44 20 7946 0991" },
    title: "Internal tools sprint",
    stage: "DISCOVERY", value: 16000, expectedCloseTs: PLUS_DAYS(22),
    source: "REFERRAL", owner: OWNER_LH, tags: ["repeat"],
    lastActivityTs: DAYS(1), stageEnteredTs: DAYS(3), createdAt: "Apr 18, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Marin Hatch", role: "Director", email: "marin@hatchco.uk", phone: "+44 20 7946 0991", primary: true },
    ],
    activity: [
      { date: "Yesterday","time": "13:00", icon: "phone", tone: "ok",  title: "Discovery call",  desc: "45m. Pain: 3 disconnected tools. Want 1 internal hub." },
      { date: "Mon","time": "09:30",       icon: "mail",  tone: "info", title: "Brief received", desc: "2-pager via Mira at Northwind" },
    ],
    notes: [],
    proposals: [],
  },
  {
    id: "deal_field",
    customer: { id: "cust-fn", initials: "FN", name: "Field Notes", contactName: "Jonas Hale", email: "jonas@fieldnotes.co", phone: "+44 20 7946 0123" },
    title: "Discovery + scoping",
    stage: "DISCOVERY", value: 12000, expectedCloseTs: PLUS_DAYS(30),
    source: "WEBSITE", owner: OWNER_PV, tags: ["wellness"],
    lastActivityTs: DAYS(3), stageEnteredTs: DAYS(4), createdAt: "Apr 20, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Jonas Hale", role: "Ops lead", email: "jonas@fieldnotes.co", phone: "+44 20 7946 0123", primary: true },
    ],
    activity: [
      { date: "Tue","time": "10:30", icon: "calendar", tone: "info", title: "Call booked", desc: "Discovery · Thu 14:00 BST" },
      { date: "Mon","time": "08:14", icon: "plus",     tone: "muted", title: "Deal created", desc: "Form intake from /admin/forms" },
    ],
    notes: [],
    proposals: [],
  },
  {
    id: "deal_bramble",
    customer: { id: "cust-br", initials: "BR", name: "Bramble Co.", contactName: "Iris Bramble", email: "iris@bramble.co", phone: "+44 20 7946 0808" },
    title: "Brand site v2",
    stage: "QUALIFIED", value: 9500, expectedCloseTs: PLUS_DAYS(35),
    source: "INBOUND", owner: OWNER_SR, tags: ["ecommerce"],
    lastActivityTs: DAYS(2), stageEnteredTs: DAYS(2), createdAt: "Apr 22, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Iris Bramble", role: "Co-founder", email: "iris@bramble.co", phone: "+44 20 7946 0808", primary: true },
    ],
    activity: [
      { date: "Wed","time": "11:00", icon: "mail", tone: "ok",   title: "Qualified",   desc: "Budget £8-12k confirmed. Timing: 8 weeks." },
      { date: "Mon","time": "09:00", icon: "plus", tone: "muted", title: "Deal created", desc: "Contact form · referral text" },
    ],
    notes: [],
    proposals: [],
  },
  {
    id: "deal_stone",
    customer: { id: "cust-sw", initials: "SW", name: "Stoneworks Ltd", contactName: "Reeve Stone", email: "reeve@stoneworks.uk", phone: "+44 20 7946 0654" },
    title: "Customer ops audit",
    stage: "QUALIFIED", value: 11000, expectedCloseTs: PLUS_DAYS(40),
    source: "OUTBOUND", owner: OWNER_LH, tags: ["manufacturing"],
    lastActivityTs: DAYS(8), stageEnteredTs: DAYS(8), createdAt: "Apr 14, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Reeve Stone", role: "MD", email: "reeve@stoneworks.uk", phone: "+44 20 7946 0654", primary: true },
    ],
    activity: [
      { date: "Apr 14","time": "10:00", icon: "phone", tone: "ok",   title: "Intro call", desc: "Warm — agreed to scope a discovery" },
      { date: "Apr 12","time": "14:00", icon: "mail",  tone: "info", title: "Reply", desc: "Cold sequence #2 hit" },
    ],
    notes: [
      { author: "Luke Hodges", initials: "LH", when: "Apr 14", body: "Hot but budget-sensitive. Propose phased audit." },
    ],
    proposals: [],
  },
  {
    id: "deal_marlow",
    customer: { id: "cust-ml", initials: "ML", name: "Marlow Ltd", contactName: "Greta Marlow", email: "greta@marlow.uk", phone: "+44 20 7946 0334" },
    title: "Workflow rebuild",
    stage: "LEAD", value: 8000, expectedCloseTs: PLUS_DAYS(50),
    source: "PARTNER", owner: OWNER_PV, tags: ["fintech"],
    lastActivityTs: DAYS(1), stageEnteredTs: DAYS(1), createdAt: "Apr 24, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Greta Marlow", role: "COO", email: "greta@marlow.uk", phone: "+44 20 7946 0334", primary: true },
    ],
    activity: [
      { date: "Yesterday","time": "16:00", icon: "calendar", tone: "info", title: "Discovery booked", desc: "Tue 11:00 BST · 30m" },
      { date: "Yesterday","time": "10:00", icon: "plus",     tone: "muted", title: "Created via partner", desc: "From Castor Foods intro" },
    ],
    notes: [],
    proposals: [],
  },
  {
    id: "deal_pinewood",
    customer: { id: "cust-pw", initials: "PW", name: "Pinewood Studios", contactName: "Aki Park", email: "aki@pinewood.studio", phone: "+44 20 7946 0212" },
    title: "Audit + recommendations",
    stage: "LEAD", value: 14000, expectedCloseTs: PLUS_DAYS(45),
    source: "INBOUND", owner: OWNER_LH, tags: ["wellness", "audit"],
    lastActivityTs: DAYS(16), stageEnteredTs: DAYS(16), createdAt: "Apr 09, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Aki Park", role: "Head of Ops", email: "aki@pinewood.studio", phone: "+44 20 7946 0212", primary: true },
    ],
    activity: [
      { date: "Apr 09","time": "12:00", icon: "mail", tone: "muted", title: "Inbound enquiry", desc: "No reply since intro email" },
    ],
    notes: [
      { author: "Luke Hodges", initials: "LH", when: "Apr 09", body: "Cold. Worth one more nudge then drop." },
    ],
    proposals: [],
  },
  {
    id: "deal_veridian",
    customer: { id: "cust-vd", initials: "VD", name: "Veridian Labs", contactName: "Noor Hassan", email: "noor@veridian.lab", phone: "+44 20 7946 0707" },
    title: "Data pipeline scoping",
    stage: "LEAD", value: 22000, expectedCloseTs: PLUS_DAYS(55),
    source: "EVENT", owner: OWNER_SR, tags: ["saas", "fintech"],
    lastActivityTs: DAYS(4), stageEnteredTs: DAYS(4), createdAt: "Apr 21, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Noor Hassan", role: "CTO", email: "noor@veridian.lab", phone: "+44 20 7946 0707", primary: true },
    ],
    activity: [
      { date: "Mon","time": "09:00", icon: "mail", tone: "info", title: "Follow-up sent", desc: "Met at SaaS North conference" },
    ],
    notes: [],
    proposals: [],
  },
  {
    id: "deal_northwind_q3",
    customer: { id: "cust-nw", initials: "NW", name: "Northwind Co.", contactName: "Mira Sato", email: "mira@northwind.co", phone: "+44 20 7946 0123" },
    title: "Q3 retainer extension",
    stage: "CLOSED_WON", value: 32000, expectedCloseTs: DAYS(2),
    source: "REFERRAL", owner: OWNER_LH, tags: ["fintech", "saas", "repeat"],
    lastActivityTs: DAYS(2), stageEnteredTs: DAYS(2), createdAt: "Mar 30, 2026",
    lostReason: null, engagementId: "c-northwind",
    contacts: [
      { name: "Mira Sato", role: "Founder", email: "mira@northwind.co", phone: "+44 20 7946 0123", primary: true },
    ],
    activity: [
      { date: "2d ago","time": "11:30", icon: "check", tone: "ok",   title: "Closed won",       desc: "Signed SoW. Engagement /c-northwind created" },
      { date: "3d ago","time": "16:00", icon: "money", tone: "ok",   title: "Deposit cleared",  desc: "£8,000 · Stripe" },
      { date: "1w ago","time": "10:00", icon: "phone", tone: "info", title: "Renewal call",     desc: "Confirmed Q3 + Q4 extension" },
    ],
    notes: [],
    proposals: [
      { id: "prop-nw-v1", version: 1, sentAt: "1w ago", openedAt: "1w ago", status: "ACCEPTED", value: 32000 },
    ],
  },
  {
    id: "deal_vellum_phase2",
    customer: { id: "cust-vl", initials: "VC", name: "Vellum & Co.", contactName: "Tom Reeves", email: "tom@vellum.co", phone: "+44 20 7946 0456" },
    title: "Phase 2 — checkout",
    stage: "CLOSED_LOST", value: 26000, expectedCloseTs: DAYS(10),
    source: "REFERRAL", owner: OWNER_LH, tags: ["ecommerce"],
    lastActivityTs: DAYS(10), stageEnteredTs: DAYS(10), createdAt: "Mar 12, 2026",
    lostReason: "Budget pulled mid-cycle. Tom wants to revisit Q4.",
    engagementId: null,
    contacts: [
      { name: "Tom Reeves", role: "Head of Product", email: "tom@vellum.co", phone: "+44 20 7946 0456", primary: true },
    ],
    activity: [
      { date: "10d ago","time": "15:00", icon: "x",    tone: "danger", title: "Marked lost",     desc: "Budget pulled · revisit Q4" },
      { date: "2w ago","time": "11:00",  icon: "mail", tone: "warn",   title: "Stalled",         desc: "No reply on revised SoW" },
    ],
    notes: [],
    proposals: [
      { id: "prop-vel-v1", version: 1, sentAt: "3w ago", openedAt: "3w ago", status: "DECLINED", value: 26000 },
    ],
  },
  {
    id: "deal_castor_audit",
    customer: { id: "cust-cf", initials: "CF", name: "Castor Foods", contactName: "Yuki Sato", email: "yuki@castorfoods.co", phone: "+44 20 7946 0567" },
    title: "Annual ops audit",
    stage: "NEGOTIATION", value: 38000, expectedCloseTs: PLUS_DAYS(5),
    source: "REFERRAL", owner: OWNER_LH, tags: ["manufacturing", "repeat"],
    lastActivityTs: HRS(6), stageEnteredTs: DAYS(4), createdAt: "Mar 18, 2026",
    lostReason: null, engagementId: null,
    contacts: [
      { name: "Yuki Sato", role: "COO", email: "yuki@castorfoods.co", phone: "+44 20 7946 0567", primary: true },
      { name: "Daniel Foss", role: "Finance", email: "dan@castorfoods.co", phone: "+44 20 7946 0568", primary: false },
    ],
    activity: [
      { date: "Today","time": "08:00", icon: "mail",  tone: "accent", title: "Terms sent",      desc: "Final terms + payment schedule" },
      { date: "Mon",  "time": "14:00", icon: "phone", tone: "ok",     title: "Pricing call",    desc: "Yuki accepted £38k. Awaiting Daniel sign-off." },
    ],
    notes: [
      { author: "Luke Hodges", initials: "LH", when: "today", body: "Strong fit. Yuki ready, just needs Daniel. Don't drop price." },
    ],
    proposals: [
      { id: "prop-cf-v1", version: 1, sentAt: "Mon 09:00", openedAt: "Mon 09:30", status: "OPENED", value: 38000 },
    ],
  },
]

/* finalize: compute display fields once at module load — never at render */
const DEALS: Deal[] = SEEDS.map((s) => {
  const daysSinceActivity = Math.max(0, Math.round((NOW - s.lastActivityTs) / (24 * 60 * 60 * 1000)))
  const daysInStage = Math.max(0, Math.round((NOW - s.stageEnteredTs) / (24 * 60 * 60 * 1000)))
  const isPastDueClose = s.expectedCloseTs < NOW && s.stage !== "CLOSED_WON" && s.stage !== "CLOSED_LOST"
  return {
    ...s,
    probability: s.probability ?? STAGE_PROBABILITY[s.stage],
    expectedClose: closeDateStr(s.expectedCloseTs),
    lastActivity: relTime(s.lastActivityTs),
    daysInStage,
    staleness: staleBucket(daysSinceActivity),
    isPastDueClose,
  } as Deal
})

/* ── Segments + tags ─────────────────────────────────────────────────────── */

const ALL_TAGS  = Array.from(new Set(DEALS.flatMap(d => d.tags))).sort()
const ALL_OWNERS = (() => {
  const map = new Map<string, { id: string; initials: string; name: string }>()
  for (const d of DEALS) map.set(d.owner.id, d.owner)
  return Array.from(map.values())
})()

const THIS_MONTH_END = (() => {
  const d = new Date(NOW)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime()
})()

function closingThisMonth(d: Deal): boolean {
  return d.expectedCloseTs >= NOW && d.expectedCloseTs <= THIS_MONTH_END
    && d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST"
}

function isAtRisk(d: Deal): boolean {
  /* high-value, stuck, past-due close — pipeline-specific risk heuristic */
  if (d.stage === "CLOSED_WON" || d.stage === "CLOSED_LOST") return false
  if (d.staleness === "stuck") return true
  if (d.expectedCloseTs < NOW) return true
  return false
}

export function getSegments(): PipelineSegmentDef[] {
  const openCount = DEALS.filter(d => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST").length
  return [
    {
      group: "Saved views",
      items: [
        { id: "all",      label: "All deals",          count: DEALS.length, icon: "pipeline" },
        { id: "open",     label: "Open pipeline",      count: openCount, icon: "target", pinned: true },
        { id: "mine",     label: "My pipeline",        count: DEALS.filter(d => d.owner.id === OWNER_LH.id).length, icon: "user", pinned: true },
        { id: "closing",  label: "Closing this month", count: DEALS.filter(closingThisMonth).length, icon: "calendar", pinned: true },
        { id: "atrisk",   label: "At risk",            count: DEALS.filter(isAtRisk).length, icon: "flag", dot: "danger" },
        { id: "stale",    label: "Stale > 14d",        count: DEALS.filter(d => d.staleness === "stuck" && d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST").length, icon: "clock", dot: "warn" },
        { id: "won",      label: "Recently won",       count: DEALS.filter(d => d.stage === "CLOSED_WON").length, icon: "check", dot: "ok" },
      ],
    },
    {
      group: "By stage",
      items: STAGE_ORDER.map(s => ({
        id: `stage:${s}`,
        label: STAGE_META[s].label,
        count: DEALS.filter(d => d.stage === s).length,
      })),
    },
    {
      group: "By source",
      items: (Object.keys(SOURCE_LABEL) as DealSource[]).map(src => ({
        id: `source:${src}`,
        label: SOURCE_LABEL[src],
        count: DEALS.filter(d => d.source === src).length,
      })),
    },
    {
      group: "By owner",
      items: ALL_OWNERS.map(o => ({
        id: `owner:${o.id}`,
        label: o.name,
        count: DEALS.filter(d => d.owner.id === o.id).length,
      })),
    },
    { group: "Tags", tags: ALL_TAGS },
  ]
}

/* ── Filter / sort logic (pure) ──────────────────────────────────────────── */

function matchSegment(d: Deal, segment: string | undefined): boolean {
  if (!segment) return true
  switch (segment) {
    case "all":     return true
    case "open":    return d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST"
    case "mine":    return d.owner.id === OWNER_LH.id
    case "closing": return closingThisMonth(d)
    case "atrisk":  return isAtRisk(d)
    case "stale":   return d.staleness === "stuck" && d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST"
    case "won":     return d.stage === "CLOSED_WON"
    default:
      if (segment.startsWith("stage:"))  return d.stage === segment.slice(6)
      if (segment.startsWith("source:")) return d.source === segment.slice(7)
      if (segment.startsWith("owner:"))  return d.owner.id === segment.slice(6)
      if (segment.startsWith("tag:"))    return d.tags.includes(segment.slice(4))
      return true
  }
}

function matchFilters(d: Deal, f: DealFilters | undefined): boolean {
  if (!f) return true
  if (f.stage?.length     && !f.stage.includes(d.stage)) return false
  if (f.source?.length    && !f.source.includes(d.source)) return false
  if (f.owner?.length     && !f.owner.includes(d.owner.id)) return false
  if (f.tag?.length       && !f.tag.some(t => d.tags.includes(t))) return false
  if (f.staleness?.length && !f.staleness.includes(d.staleness)) return false
  return true
}

function matchSearch(d: Deal, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const q = search.toLowerCase()
  return d.customer.name.toLowerCase().includes(q)
    || d.title.toLowerCase().includes(q)
    || d.customer.contactName.toLowerCase().includes(q)
    || d.tags.some(t => t.toLowerCase().includes(q))
}

function sortRows(rows: Deal[], by: DealSortBy = "lastActivity", dir: DealSortDir = "desc"): Deal[] {
  const mult = dir === "asc" ? 1 : -1
  const sorted = [...rows]
  sorted.sort((a, b) => {
    switch (by) {
      case "lastActivity":  return (a.lastActivityTs - b.lastActivityTs) * mult
      case "value":         return (a.value - b.value) * mult
      case "probability":   return (a.probability - b.probability) * mult
      case "expectedClose": return (a.expectedCloseTs - b.expectedCloseTs) * mult
      case "customer":      return a.customer.name.localeCompare(b.customer.name) * mult
      case "stage":         return (STAGE_META[a.stage].idx - STAGE_META[b.stage].idx) * mult
      case "daysInStage":   return (a.daysInStage - b.daysInStage) * mult
      default: return 0
    }
  })
  return sorted
}

/* ── Public API (mock tRPC procedure) ────────────────────────────────────── */

export const mockPipeline = {
  list(q: DealQuery = {}): Deal[] {
    const filtered = DEALS.filter(r =>
      matchSegment(r, q.segment) && matchFilters(r, q.filters) && matchSearch(r, q.search))
    return sortRows(filtered, q.sortBy, q.sortDir)
  },

  total(): number {
    return DEALS.length
  },

  getById(id: string): Deal | null {
    return DEALS.find(d => d.id === id) ?? null
  },

  stats(rows: Deal[]): DealStats {
    const open = rows.filter(r => r.stage !== "CLOSED_LOST")
    const totalValue = open.reduce((s, r) => s + r.value, 0)
    const weightedValue = open.reduce((s, r) => s + r.value * (r.probability / 100), 0)
    const closingMonth = rows.filter(closingThisMonth).reduce((s, r) => s + r.value, 0)
    const recentClosed = rows.filter(r => r.stage === "CLOSED_WON" || r.stage === "CLOSED_LOST")
    const won = rows.filter(r => r.stage === "CLOSED_WON").length
    const winRate = recentClosed.length ? Math.round((won / recentClosed.length) * 100) : 0
    const avgDealSize = rows.length ? Math.round(totalValue / Math.max(1, open.length)) : 0
    return { totalValue, weightedValue, closingThisMonth: closingMonth, winRate, avgDealSize, count: rows.length }
  },

  allOwners(): Array<{ id: string; initials: string; name: string }> {
    return ALL_OWNERS
  },

  allTags(): string[] {
    return ALL_TAGS
  },

  getStageOrder(): DealStage[] {
    return STAGE_ORDER
  },

  segments: getSegments,
}
