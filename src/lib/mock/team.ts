/**
 * Mock data layer for team members. Single source of truth.
 *
 * Shape mirrors what tRPC will return — when wiring real backend, swap
 * `mockTeam.list(q)` for `api.team.list.useQuery(q)` with same contract.
 * Field set drives database schema requirements (Workday-grade depth).
 *
 * Required DB fields (per TeamMember):
 *   members:        id, name, initials, photoUrl, role, title, department,
 *                   level, status, email, phone, location, timezone,
 *                   managerId (FK), employmentType, startedAt, employmentNumber
 *   compensation:   memberId, band, currency, summary
 *   capacity:       memberId, weeklyHoursTarget, billable, admin, util, pto
 *   assignments:    memberId, engagementId, customerName, role, allocationPct
 *   skills:         memberId, name, level (1-5), verifiedAt
 *   certifications: memberId, name, issuer, issuedAt, expiresAt
 *   reviews:        memberId, period, rating, reviewerName, summary
 *   time_off:       memberId, type, balanceDays, used; + plans (from,to,reason)
 *   goals:          memberId, title, status, progress, dueAt
 *   documents:      memberId, name, docType, uploadedAt, expiresAt
 *   equipment:      memberId, assetType, model, assignedAt, status
 *   permissions:    memberId, module, level
 *   audit:          memberId, kind, label, when
 */

/* ── Types ───────────────────────────────────────────────────────────────── */

export type MemberStatus = "ACTIVE" | "ONBOARDING" | "ON_LEAVE" | "OFFBOARDING"
export type MemberLevel = "IC1" | "IC2" | "Senior" | "Staff" | "Principal" | "Manager" | "Director"
export type EmploymentType = "FTE" | "CONTRACTOR" | "INTERN"
export type AssignmentRole = "Lead" | "Support" | "Reviewer"
export type ReviewRating = "EXCEEDS" | "MEETS" | "IMPROVING"
export type TimeOffType = "PTO" | "SICK" | "PERSONAL"
export type GoalStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "DONE"
export type DocType = "CONTRACT" | "NDA" | "ID" | "TRAINING"
export type EquipmentType = "LAPTOP" | "PHONE" | "MONITOR" | "LICENSE"
export type EquipmentStatus = "ACTIVE" | "RETURNED"
export type PermissionLevel = "NONE" | "VIEW" | "EDIT" | "ADMIN"
export type ActivityTone = "ok" | "info" | "warn" | "danger" | "muted" | "accent"

export interface ManagerRef { id: string; name: string; initials: string }
export interface ReportRef extends ManagerRef { role: string }

export interface Employment {
  type: EmploymentType
  startedAt: string        /* display, e.g., "Jan 2024" */
  tenureMonths: number     /* used for badge */
  tenureLabel: string      /* precomputed: "3y 4mo" / "New" */
  employmentNumber: string
}

export interface Compensation {
  band: string             /* "L4", "L5", "L6" */
  currency: "£" | "$"
  summary: "Within band" | "Above band" | "Below band"
}

export interface Capacity {
  weeklyHoursTarget: number
  billableHoursThisWeek: number
  adminHoursThisWeek: number
  utilizationPct: number
  ptoBalanceDays: number
}

export interface Assignment {
  engagementId: string
  customerName: string
  role: AssignmentRole
  allocationPct: number
  stage: string
}

export interface Skill { name: string; group: string; level: 1 | 2 | 3 | 4 | 5; verifiedAt: string | null }
export interface Certification { name: string; issuer: string; issuedAt: string; expiresAt: string | null; expiringSoon: boolean }
export interface Review { period: string; rating: ReviewRating; reviewer: string; summary: string }
export interface TimeOffPlan { from: string; to: string; reason: string; days: number }
export interface TimeOff { type: TimeOffType; balanceDays: number; used: number; upcoming: TimeOffPlan[]; recent: TimeOffPlan[] }
export interface Goal { id: string; title: string; status: GoalStatus; progress: number; dueAt: string }
export interface Document { id: string; name: string; type: DocType; uploadedAt: string; expiresAt: string | null; expiringSoon: boolean }
export interface Equipment { id: string; type: EquipmentType; model: string; assignedAt: string; status: EquipmentStatus; serial?: string }
export interface Permission { module: string; level: PermissionLevel }
export interface ActivityEvent {
  id: string
  type: "booking" | "task" | "deliverable" | "login" | "perm" | "edit" | "message" | "deal"
  label: string
  when: string         /* precomputed relative string */
  whenTs: number       /* epoch ms — used for sort */
  tone: ActivityTone
  related?: { type: string; label: string; href: string }
}

export interface TeamMember {
  id: string
  name: string
  initials: string
  photoUrl: null
  role: string
  title: string
  department: string
  level: MemberLevel
  status: MemberStatus
  email: string
  phone: string
  location: string
  timezone: string
  about: string
  manager: ManagerRef | null
  directReports: ReportRef[]
  employment: Employment
  compensation: Compensation
  capacity: Capacity
  assignments: Assignment[]
  skills: Skill[]
  certifications: Certification[]
  reviews: Review[]
  timeOff: TimeOff
  goals: Goal[]
  documents: Document[]
  equipment: Equipment[]
  permissions: Permission[]
  recentActivity: ActivityEvent[]
  tags: string[]
  upcomingBookings: { time: string; title: string; client: string; dur: string }[]
  lastActiveAt: string       /* precomputed relative */
  lastActiveTs: number
}

export interface TeamStats {
  headcount: number
  avgUtilization: number
  billableThisWeek: number
  onLeave: number
  openRoles: number
}

export interface TeamFilters {
  department?: string[]
  level?: MemberLevel[]
  status?: MemberStatus[]
  managerId?: string[]
  tag?: string[]
}

export type TeamSortBy = "name" | "utilization" | "tenure" | "assignments" | "lastActive"
export type TeamSortDir = "asc" | "desc"

export interface TeamQuery {
  segment?: string
  search?: string
  filters?: TeamFilters
  sortBy?: TeamSortBy
  sortDir?: TeamSortDir
}

export interface TeamSegmentItem {
  id: string
  label: string
  count: number
  icon?: string
  pinned?: boolean
  dot?: "ok" | "warn" | "danger"
}
export interface TeamSegmentDef {
  group: string
  items?: TeamSegmentItem[]
  tags?: string[]
}

/* ── Status / level metadata ─────────────────────────────────────────────── */

export const STATUS_META: Record<MemberStatus, { label: string; tone: "ok" | "info" | "warn" | "muted" }> = {
  ACTIVE:      { label: "Active",      tone: "ok"    },
  ONBOARDING:  { label: "Onboarding",  tone: "info"  },
  ON_LEAVE:    { label: "On leave",    tone: "warn"  },
  OFFBOARDING: { label: "Offboarding", tone: "muted" },
}

export const LEVEL_ORDER: MemberLevel[] = ["IC1", "IC2", "Senior", "Staff", "Principal", "Manager", "Director"]

export const STANDARD_MODULES = [
  "Dashboard", "Clients", "Customers", "Pipeline", "Bookings", "Calendar",
  "Invoices", "Workflows", "Forms", "Reviews", "Team", "Audit", "Settings",
]

/* ── Time helpers (run once at module load) ──────────────────────────────── */

const NOW = Date.now()
const HRS = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000

function relFromMs(ts: number): string {
  const diff = NOW - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 14) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 8) return `${w}w ago`
  const mo = Math.floor(d / 30)
  return `${mo}mo ago`
}

function tenureLabel(months: number): string {
  if (months < 3) return "New"
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}mo`
  if (m === 0) return `${y}y`
  return `${y}y ${m}mo`
}

/* ── Mock dataset (8–12 members across all roles/levels/statuses) ────────── */

interface RawMember extends Omit<TeamMember, "lastActiveAt" | "employment" | "recentActivity" | "certifications" | "documents"> {
  employment: Omit<Employment, "tenureLabel">
  recentActivity: Array<Omit<ActivityEvent, "when">>
  certifications: Array<Omit<Certification, "expiringSoon">>
  documents: Array<Omit<Document, "expiringSoon">>
}

const RAW: RawMember[] = [
  {
    id: "u-lh", name: "Luke Hodges", initials: "LH", photoUrl: null,
    role: "Owner & Lead Consultant", title: "Founder · Principal Consultant", department: "Consulting",
    level: "Principal", status: "ACTIVE",
    email: "luke@ironheart.io", phone: "+44 7700 900123",
    location: "London, UK", timezone: "Europe/London",
    about: "Builds Ironheart's universal platform end to end. Hands-on with clients, audits, retainers, and platform design. Prefers deep-work mornings.",
    manager: null,
    directReports: [
      { id: "u-sp", name: "Sam Park",     initials: "SP", role: "Ops Lead" },
      { id: "u-mr", name: "Mira Reyes",   initials: "MR", role: "Senior Consultant" },
      { id: "u-tk", name: "Tomás Köhler", initials: "TK", role: "Staff Engineer" },
      { id: "u-ej", name: "Esme Jowett",  initials: "EJ", role: "Consultant" },
    ],
    employment: { type: "FTE", startedAt: "Jan 2024", tenureMonths: 28, employmentNumber: "IH-0001" },
    compensation: { band: "L6", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 26, adminHoursThisWeek: 10, utilizationPct: 90, ptoBalanceDays: 18 },
    assignments: [
      { engagementId: "c-northwind", customerName: "Northwind Co.",        role: "Lead",     allocationPct: 35, stage: "Auditing" },
      { engagementId: "c-vellum",    customerName: "Vellum & Co.",         role: "Lead",     allocationPct: 25, stage: "Implementing" },
      { engagementId: "c-arden",     customerName: "Arden Health",         role: "Reviewer", allocationPct: 10, stage: "Reporting" },
      { engagementId: "c-bowery",    customerName: "Bowery Mills",         role: "Lead",     allocationPct: 20, stage: "Retainer" },
    ],
    skills: [
      { name: "Strategy",         group: "Consulting",  level: 5, verifiedAt: "Mar 2026" },
      { name: "Operations",       group: "Consulting",  level: 5, verifiedAt: "Mar 2026" },
      { name: "Workflow Design",  group: "Engineering", level: 5, verifiedAt: "Apr 2026" },
      { name: "AI Integration",   group: "Engineering", level: 4, verifiedAt: "Apr 2026" },
      { name: "Leadership",       group: "Soft",        level: 4, verifiedAt: null },
      { name: "Financial Analysis", group: "Finance",   level: 3, verifiedAt: "Feb 2026" },
    ],
    certifications: [
      { name: "Stripe Connect Partner", issuer: "Stripe",       issuedAt: "Jun 2024", expiresAt: "Jun 2027" },
      { name: "GDPR DPO",               issuer: "IAPP",         issuedAt: "Apr 2025", expiresAt: "Apr 2027" },
      { name: "AWS Solutions Architect", issuer: "AWS",         issuedAt: "Aug 2024", expiresAt: "Aug 2027" },
    ],
    reviews: [
      { period: "Q1 2026", rating: "EXCEEDS", reviewer: "Self (board)", summary: "Shipped Phase 5 architecture early. Maintained 90% client utilization while building platform." },
      { period: "Q4 2025", rating: "EXCEEDS", reviewer: "Self (board)", summary: "Closed three retainers. Audit framework adopted across 7 clients." },
    ],
    timeOff: {
      type: "PTO", balanceDays: 18, used: 7,
      upcoming: [{ from: "Jun 24", to: "Jun 28", reason: "Family trip", days: 5 }],
      recent: [{ from: "Mar 10", to: "Mar 12", reason: "Long weekend", days: 3 }],
    },
    goals: [
      { id: "g1", title: "Ship Phase 6 universal platform GA", status: "ON_TRACK", progress: 62, dueAt: "Sep 2026" },
      { id: "g2", title: "Reach £30K MRR in retainers",        status: "ON_TRACK", progress: 71, dueAt: "Aug 2026" },
      { id: "g3", title: "Hire 2 senior consultants",          status: "AT_RISK", progress: 25, dueAt: "Jul 2026" },
    ],
    documents: [
      { id: "d1", name: "Founder agreement", type: "CONTRACT", uploadedAt: "Jan 2024", expiresAt: null },
      { id: "d2", name: "Mutual NDA template (signed)", type: "NDA", uploadedAt: "Jan 2024", expiresAt: null },
      { id: "d3", name: "Passport copy",     type: "ID",       uploadedAt: "Jan 2024", expiresAt: "Aug 2032" },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Pro 16\" M3 Max",       assignedAt: "Jan 2024", status: "ACTIVE", serial: "C02FQ-2024-001" },
      { id: "e2", type: "MONITOR", model: "Apple Studio Display",          assignedAt: "Feb 2024", status: "ACTIVE" },
      { id: "e3", type: "LICENSE", model: "Linear · workspace admin",       assignedAt: "Jan 2024", status: "ACTIVE" },
      { id: "e4", type: "LICENSE", model: "Figma · org seat",               assignedAt: "Jan 2024", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({ module: m, level: "ADMIN" as PermissionLevel })),
    recentActivity: [
      { id: "a1", type: "deliverable", label: "Published Phase 6 architecture whitepaper",   whenTs: HRS(4),  tone: "ok",     related: { type: "doc", label: "PHASE6_ARCHITECTURE.md", href: "/admin/audit" } },
      { id: "a2", type: "booking",     label: "Sprint review with Northwind Co.",            whenTs: HRS(6),  tone: "info",   related: { type: "client", label: "Northwind", href: "/admin/clients/c-northwind" } },
      { id: "a3", type: "task",        label: "Closed 12 implementation tasks on Vellum",    whenTs: HRS(20), tone: "ok" },
      { id: "a4", type: "login",       label: "Signed in from Safari · macOS · London",      whenTs: HRS(22), tone: "muted" },
      { id: "a5", type: "edit",        label: "Updated audit lens scoring rubric",           whenTs: DAYS(1), tone: "info" },
      { id: "a6", type: "perm",        label: "Granted ADMIN to Sam Park on Bookings",       whenTs: DAYS(2), tone: "accent" },
      { id: "a7", type: "deal",        label: "Won proposal · Castor Foods audit",            whenTs: DAYS(3), tone: "ok",     related: { type: "client", label: "Castor Foods", href: "/admin/clients/c-castor" } },
      { id: "a8", type: "message",     label: "Replied to 14 inbox threads",                  whenTs: DAYS(3), tone: "muted" },
    ],
    tags: ["founder", "strategy", "audit"],
    upcomingBookings: [
      { time: "Tue 10:00", title: "Standup",        client: "Internal",    dur: "30m" },
      { time: "Tue 11:30", title: "Sprint review",   client: "Northwind",   dur: "45m" },
      { time: "Wed 09:30", title: "Findings call",   client: "Arden Health", dur: "60m" },
      { time: "Wed 14:00", title: "Audit kickoff",   client: "Castor Foods", dur: "45m" },
      { time: "Thu 16:00", title: "Invoice review",  client: "Internal",    dur: "20m" },
    ],
    lastActiveTs: HRS(2),
  },

  {
    id: "u-sp", name: "Sam Park", initials: "SP", photoUrl: null,
    role: "Ops Lead", title: "Senior · Operations", department: "Operations",
    level: "Senior", status: "ACTIVE",
    email: "sam@ironheart.io", phone: "+44 7700 900244",
    location: "Manchester, UK", timezone: "Europe/London",
    about: "Owns client ops and onboarding. Process-obsessed; runs the playbook so Luke doesn't have to.",
    manager: { id: "u-lh", name: "Luke Hodges", initials: "LH" },
    directReports: [
      { id: "u-bc", name: "Bea Chen",   initials: "BC", role: "Ops Analyst" },
    ],
    employment: { type: "FTE", startedAt: "Mar 2024", tenureMonths: 26, employmentNumber: "IH-0002" },
    compensation: { band: "L5", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 12, adminHoursThisWeek: 22, utilizationPct: 85, ptoBalanceDays: 14 },
    assignments: [
      { engagementId: "c-bowery", customerName: "Bowery Mills",   role: "Support", allocationPct: 20, stage: "Retainer" },
      { engagementId: "c-castor", customerName: "Castor Foods",   role: "Lead",    allocationPct: 30, stage: "Auditing" },
    ],
    skills: [
      { name: "Operations",         group: "Consulting",  level: 5, verifiedAt: "Feb 2026" },
      { name: "Process Design",     group: "Consulting",  level: 4, verifiedAt: "Feb 2026" },
      { name: "Client Onboarding",  group: "Consulting",  level: 4, verifiedAt: null },
      { name: "Data Analysis",      group: "Engineering", level: 3, verifiedAt: "Jan 2026" },
      { name: "SQL",                group: "Engineering", level: 3, verifiedAt: null },
    ],
    certifications: [
      { name: "Lean Six Sigma · Green Belt", issuer: "ASQ",       issuedAt: "Jul 2023", expiresAt: null },
      { name: "GDPR foundation",             issuer: "IAPP",      issuedAt: "Sep 2024", expiresAt: "Jun 2026" },
    ],
    reviews: [
      { period: "Q1 2026", rating: "MEETS",     reviewer: "Luke Hodges", summary: "Solid ops execution. Documentation needs to stay current as platform evolves." },
      { period: "Q4 2025", rating: "EXCEEDS",   reviewer: "Luke Hodges", summary: "Onboarded 4 clients with zero handoff issues. Built the playbook." },
    ],
    timeOff: {
      type: "PTO", balanceDays: 14, used: 6,
      upcoming: [{ from: "Aug 05", to: "Aug 09", reason: "Family", days: 5 }],
      recent: [{ from: "Feb 17", to: "Feb 18", reason: "Personal", days: 2 }],
    },
    goals: [
      { id: "g1", title: "Cut client onboarding to <5 days", status: "ON_TRACK", progress: 80, dueAt: "Jul 2026" },
      { id: "g2", title: "Migrate ops handbook to platform", status: "ON_TRACK", progress: 55, dueAt: "Aug 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract", type: "CONTRACT", uploadedAt: "Mar 2024", expiresAt: null },
      { id: "d2", name: "Mutual NDA",          type: "NDA",       uploadedAt: "Mar 2024", expiresAt: null },
      { id: "d3", name: "Onboarding training", type: "TRAINING",  uploadedAt: "Mar 2024", expiresAt: null },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Air 15\" M3",      assignedAt: "Mar 2024", status: "ACTIVE", serial: "C02FQ-2024-014" },
      { id: "e2", type: "LICENSE", model: "Notion · enterprise seat", assignedAt: "Mar 2024", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Settings" || m === "Audit") ? "VIEW" : "EDIT" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "task",    label: "Completed Castor Foods discovery checklist", whenTs: HRS(5),  tone: "ok" },
      { id: "a2", type: "edit",    label: "Updated client onboarding playbook v3.2",    whenTs: HRS(9),  tone: "info" },
      { id: "a3", type: "booking", label: "Onboarding call · Castor Foods",              whenTs: DAYS(1), tone: "info" },
      { id: "a4", type: "login",   label: "Signed in from Chrome · macOS · Manchester",  whenTs: DAYS(1), tone: "muted" },
      { id: "a5", type: "message", label: "Replied to 7 client threads",                  whenTs: DAYS(2), tone: "muted" },
    ],
    tags: ["ops", "onboarding"],
    upcomingBookings: [
      { time: "Tue 14:00", title: "Castor Foods onboarding", client: "Castor Foods", dur: "60m" },
      { time: "Wed 11:00", title: "Ops standup",              client: "Internal",     dur: "30m" },
    ],
    lastActiveTs: HRS(3),
  },

  {
    id: "u-mr", name: "Mira Reyes", initials: "MR", photoUrl: null,
    role: "Senior Consultant", title: "Senior · Consulting", department: "Consulting",
    level: "Senior", status: "ACTIVE",
    email: "mira@ironheart.io", phone: "+44 7700 900356",
    location: "Bristol, UK", timezone: "Europe/London",
    about: "Audit lead. Five-lens framework expert. Heavy on customer interviews and findings reports.",
    manager: { id: "u-lh", name: "Luke Hodges", initials: "LH" },
    directReports: [],
    employment: { type: "FTE", startedAt: "Sep 2024", tenureMonths: 20, employmentNumber: "IH-0003" },
    compensation: { band: "L5", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 32, adminHoursThisWeek: 4, utilizationPct: 95, ptoBalanceDays: 12 },
    assignments: [
      { engagementId: "c-northwind", customerName: "Northwind Co.",     role: "Support", allocationPct: 30, stage: "Auditing" },
      { engagementId: "c-arden",     customerName: "Arden Health",      role: "Lead",    allocationPct: 35, stage: "Reporting" },
      { engagementId: "c-midatl",    customerName: "Mid-Atlantic Co.",   role: "Lead",    allocationPct: 25, stage: "Reporting" },
    ],
    skills: [
      { name: "Audit Frameworks",   group: "Consulting",  level: 5, verifiedAt: "Apr 2026" },
      { name: "Stakeholder Interviews", group: "Consulting", level: 5, verifiedAt: "Apr 2026" },
      { name: "Reporting",          group: "Consulting",  level: 4, verifiedAt: "Mar 2026" },
      { name: "Notion / Linear",    group: "Tooling",     level: 4, verifiedAt: null },
      { name: "Spanish",            group: "Language",    level: 5, verifiedAt: null },
    ],
    certifications: [
      { name: "PMP",                issuer: "PMI",      issuedAt: "Jan 2023", expiresAt: "Jan 2026" },
      { name: "GDPR foundation",    issuer: "IAPP",     issuedAt: "Oct 2024", expiresAt: "May 2026" },
    ],
    reviews: [
      { period: "Q1 2026", rating: "EXCEEDS",  reviewer: "Luke Hodges", summary: "Three audits delivered on time with strong client NPS." },
      { period: "Q4 2025", rating: "MEETS",    reviewer: "Luke Hodges", summary: "Steady contributor. Findings quality improving each cycle." },
    ],
    timeOff: {
      type: "PTO", balanceDays: 12, used: 8,
      upcoming: [{ from: "Jul 14", to: "Jul 25", reason: "Holiday · Spain", days: 10 }],
      recent: [{ from: "Apr 02", to: "Apr 03", reason: "Personal", days: 2 }],
    },
    goals: [
      { id: "g1", title: "Lead 4 audits this quarter",        status: "ON_TRACK", progress: 75, dueAt: "Jun 2026" },
      { id: "g2", title: "Publish audit case-study series",   status: "AT_RISK", progress: 30, dueAt: "Aug 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract", type: "CONTRACT", uploadedAt: "Sep 2024", expiresAt: null },
      { id: "d2", name: "Mutual NDA",          type: "NDA",       uploadedAt: "Sep 2024", expiresAt: null },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Pro 14\" M3",     assignedAt: "Sep 2024", status: "ACTIVE", serial: "C02FQ-2024-022" },
      { id: "e2", type: "PHONE",   model: "iPhone 15",                assignedAt: "Sep 2024", status: "ACTIVE" },
      { id: "e3", type: "LICENSE", model: "Linear · member seat",     assignedAt: "Sep 2024", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Clients" || m === "Customers" || m === "Audit" || m === "Reviews" || m === "Bookings" || m === "Calendar") ? "EDIT" :
             (m === "Settings" || m === "Team")                                                                                  ? "NONE" :
                                                                                                                                  "VIEW" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "deliverable", label: "Five-lens summary · Arden Health",                whenTs: HRS(7),  tone: "ok",   related: { type: "client", label: "Arden Health", href: "/admin/clients/c-arden" } },
      { id: "a2", type: "booking",     label: "Interview · Northwind operations lead",          whenTs: HRS(14), tone: "info" },
      { id: "a3", type: "task",        label: "Synthesised 9 stakeholder transcripts",          whenTs: DAYS(1), tone: "ok" },
      { id: "a4", type: "login",       label: "Signed in from Chrome · macOS · Bristol",       whenTs: DAYS(1), tone: "muted" },
    ],
    tags: ["audit", "consulting"],
    upcomingBookings: [
      { time: "Tue 13:00", title: "Northwind interview",   client: "Northwind",     dur: "60m" },
      { time: "Wed 09:30", title: "Findings call",          client: "Arden Health", dur: "60m" },
      { time: "Thu 11:00", title: "Mid-Atlantic review",   client: "Mid-Atlantic", dur: "45m" },
    ],
    lastActiveTs: HRS(4),
  },

  {
    id: "u-tk", name: "Tomás Köhler", initials: "TK", photoUrl: null,
    role: "Staff Engineer", title: "Staff · Engineering", department: "Engineering",
    level: "Staff", status: "ACTIVE",
    email: "tomas@ironheart.io", phone: "+44 7700 900478",
    location: "Berlin, DE", timezone: "Europe/Berlin",
    about: "Ironheart platform engineer. Workflow engine, tRPC, Drizzle, Inngest. Owns the build.",
    manager: { id: "u-lh", name: "Luke Hodges", initials: "LH" },
    directReports: [],
    employment: { type: "FTE", startedAt: "Nov 2024", tenureMonths: 18, employmentNumber: "IH-0004" },
    compensation: { band: "L6", currency: "£", summary: "Above band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 8, adminHoursThisWeek: 30, utilizationPct: 95, ptoBalanceDays: 16 },
    assignments: [
      { engagementId: "c-vellum",     customerName: "Vellum & Co.",        role: "Support", allocationPct: 20, stage: "Implementing" },
      { engagementId: "internal-platform", customerName: "Internal · Platform", role: "Lead", allocationPct: 60, stage: "Phase 5" },
    ],
    skills: [
      { name: "TypeScript",     group: "Engineering", level: 5, verifiedAt: "Apr 2026" },
      { name: "Postgres",       group: "Engineering", level: 5, verifiedAt: "Apr 2026" },
      { name: "Drizzle ORM",    group: "Engineering", level: 5, verifiedAt: "Apr 2026" },
      { name: "tRPC",           group: "Engineering", level: 5, verifiedAt: "Mar 2026" },
      { name: "Inngest",        group: "Engineering", level: 4, verifiedAt: "Mar 2026" },
      { name: "Next.js",        group: "Engineering", level: 4, verifiedAt: null },
      { name: "German",         group: "Language",    level: 5, verifiedAt: null },
    ],
    certifications: [
      { name: "AWS Solutions Architect Pro", issuer: "AWS",      issuedAt: "Mar 2024", expiresAt: "Mar 2027" },
      { name: "Stripe Connect Partner",      issuer: "Stripe",   issuedAt: "Aug 2024", expiresAt: "Aug 2026" },
    ],
    reviews: [
      { period: "Q1 2026", rating: "EXCEEDS", reviewer: "Luke Hodges", summary: "Single-handedly shipped Phase 5. Workflow engine is the best piece of code in the repo." },
      { period: "Q4 2025", rating: "EXCEEDS", reviewer: "Luke Hodges", summary: "Architecture decisions have aged beautifully. Test coverage is gold standard." },
    ],
    timeOff: {
      type: "PTO", balanceDays: 16, used: 4,
      upcoming: [],
      recent: [{ from: "Dec 23", to: "Jan 02", reason: "Holiday · Bavaria", days: 8 }],
    },
    goals: [
      { id: "g1", title: "Ship Phase 6 workflow editor",        status: "ON_TRACK", progress: 48, dueAt: "Aug 2026" },
      { id: "g2", title: "Reach 250 tests on platform",         status: "ON_TRACK", progress: 90, dueAt: "Jun 2026" },
      { id: "g3", title: "Sub-100ms tRPC p95 across all reads", status: "DONE", progress: 100, dueAt: "Apr 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract (DE)", type: "CONTRACT", uploadedAt: "Nov 2024", expiresAt: null },
      { id: "d2", name: "Mutual NDA",                type: "NDA",       uploadedAt: "Nov 2024", expiresAt: null },
      { id: "d3", name: "Right-to-work · DE",         type: "ID",        uploadedAt: "Nov 2024", expiresAt: "Nov 2029" },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Pro 16\" M3 Max",   assignedAt: "Nov 2024", status: "ACTIVE", serial: "C02FQ-2024-031" },
      { id: "e2", type: "MONITOR", model: "LG UltraFine 27\" 5K",       assignedAt: "Nov 2024", status: "ACTIVE" },
      { id: "e3", type: "LICENSE", model: "GitHub · Copilot business",  assignedAt: "Nov 2024", status: "ACTIVE" },
      { id: "e4", type: "LICENSE", model: "Cursor · pro seat",          assignedAt: "Dec 2024", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Audit" || m === "Workflows" || m === "Settings") ? "ADMIN" :
             (m === "Team")                                            ? "VIEW"  :
                                                                         "EDIT" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "deliverable", label: "Merged feature/product-platform branch",      whenTs: HRS(3),  tone: "ok",   related: { type: "audit", label: "audit log", href: "/admin/audit" } },
      { id: "a2", type: "task",        label: "Resolved 18 Phase 5 issues this week",       whenTs: HRS(11), tone: "ok" },
      { id: "a3", type: "perm",        label: "Granted ADMIN to Workflows for self",         whenTs: DAYS(1), tone: "accent" },
      { id: "a4", type: "login",       label: "Signed in from VS Code · Linux · Berlin",     whenTs: HRS(1), tone: "muted" },
    ],
    tags: ["engineering", "platform"],
    upcomingBookings: [
      { time: "Tue 16:00", title: "Architecture review",   client: "Internal",  dur: "45m" },
      { time: "Wed 14:00", title: "Workflow demo",          client: "Vellum & Co.", dur: "30m" },
      { time: "Fri 10:00", title: "Phase 6 kickoff",        client: "Internal",   dur: "60m" },
    ],
    lastActiveTs: HRS(1),
  },

  {
    id: "u-ej", name: "Esme Jowett", initials: "EJ", photoUrl: null,
    role: "Consultant", title: "IC2 · Consulting", department: "Consulting",
    level: "IC2", status: "ACTIVE",
    email: "esme@ironheart.io", phone: "+44 7700 900512",
    location: "Edinburgh, UK", timezone: "Europe/London",
    about: "Picks up discovery and proposal workstreams. Strong at scoping and client-facing comms.",
    manager: { id: "u-lh", name: "Luke Hodges", initials: "LH" },
    directReports: [],
    employment: { type: "FTE", startedAt: "Jun 2025", tenureMonths: 11, employmentNumber: "IH-0005" },
    compensation: { band: "L4", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 28, adminHoursThisWeek: 6, utilizationPct: 85, ptoBalanceDays: 9 },
    assignments: [
      { engagementId: "c-seaglass", customerName: "Sea Glass Studio", role: "Lead",     allocationPct: 30, stage: "Proposal" },
      { engagementId: "c-pebble",   customerName: "Pebble & Pine",     role: "Support",  allocationPct: 15, stage: "Discovery" },
      { engagementId: "c-castor",   customerName: "Castor Foods",     role: "Support",  allocationPct: 20, stage: "Auditing" },
    ],
    skills: [
      { name: "Discovery",        group: "Consulting", level: 4, verifiedAt: "Feb 2026" },
      { name: "Proposal Writing", group: "Consulting", level: 4, verifiedAt: "Feb 2026" },
      { name: "Client Comms",     group: "Soft",       level: 4, verifiedAt: null },
      { name: "Notion",           group: "Tooling",    level: 3, verifiedAt: null },
    ],
    certifications: [
      { name: "PRINCE2 Foundation", issuer: "AXELOS", issuedAt: "Jan 2024", expiresAt: null },
    ],
    reviews: [
      { period: "Q1 2026", rating: "MEETS", reviewer: "Luke Hodges", summary: "Strong ramp. Next quarter focus: writing winning proposals without coaching." },
    ],
    timeOff: {
      type: "PTO", balanceDays: 9, used: 5,
      upcoming: [{ from: "May 26", to: "May 30", reason: "Family wedding", days: 5 }],
      recent: [],
    },
    goals: [
      { id: "g1", title: "Convert 50% of discoveries to proposals", status: "ON_TRACK", progress: 60, dueAt: "Aug 2026" },
      { id: "g2", title: "Run 4 discoveries solo this quarter",     status: "ON_TRACK", progress: 75, dueAt: "Jul 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract", type: "CONTRACT", uploadedAt: "Jun 2025", expiresAt: null },
      { id: "d2", name: "Mutual NDA",          type: "NDA",       uploadedAt: "Jun 2025", expiresAt: null },
      { id: "d3", name: "Sales training cert", type: "TRAINING",  uploadedAt: "Jul 2025", expiresAt: null },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Air 13\" M3", assignedAt: "Jun 2025", status: "ACTIVE", serial: "C02FQ-2025-008" },
      { id: "e2", type: "LICENSE", model: "Loom · pro seat",     assignedAt: "Jun 2025", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Pipeline" || m === "Customers" || m === "Clients") ? "EDIT" :
             (m === "Settings" || m === "Team" || m === "Audit")        ? "NONE" :
                                                                          "VIEW" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "deliverable", label: "Sent proposal v2 · Sea Glass Studio",   whenTs: DAYS(3), tone: "info", related: { type: "client", label: "Sea Glass", href: "/admin/clients/c-seaglass" } },
      { id: "a2", type: "task",        label: "Discovery notes · Pebble & Pine",       whenTs: DAYS(4), tone: "ok" },
      { id: "a3", type: "booking",     label: "Initial enquiry call · Pebble & Pine",  whenTs: DAYS(5), tone: "info" },
      { id: "a4", type: "login",       label: "Signed in from Chrome · macOS · Edinburgh", whenTs: HRS(6), tone: "muted" },
    ],
    tags: ["consulting", "discovery"],
    upcomingBookings: [
      { time: "Tue 11:00", title: "Pebble & Pine discovery", client: "Pebble & Pine", dur: "60m" },
      { time: "Thu 14:30", title: "Proposal walkthrough",     client: "Sea Glass",     dur: "45m" },
    ],
    lastActiveTs: HRS(8),
  },

  {
    id: "u-bc", name: "Bea Chen", initials: "BC", photoUrl: null,
    role: "Ops Analyst", title: "IC1 · Operations", department: "Operations",
    level: "IC1", status: "ONBOARDING",
    email: "bea@ironheart.io", phone: "+44 7700 900689",
    location: "London, UK", timezone: "Europe/London",
    about: "Newest hire. Ramping on the playbook. Will own client-side ops reporting.",
    manager: { id: "u-sp", name: "Sam Park", initials: "SP" },
    directReports: [],
    employment: { type: "FTE", startedAt: "Apr 2026", tenureMonths: 1, employmentNumber: "IH-0006" },
    compensation: { band: "L3", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 0, adminHoursThisWeek: 30, utilizationPct: 75, ptoBalanceDays: 25 },
    assignments: [
      { engagementId: "internal-onboarding", customerName: "Internal · Onboarding", role: "Lead", allocationPct: 100, stage: "Week 4" },
    ],
    skills: [
      { name: "Spreadsheets",  group: "Tooling",     level: 4, verifiedAt: null },
      { name: "SQL",           group: "Engineering", level: 2, verifiedAt: null },
      { name: "Notion",        group: "Tooling",     level: 3, verifiedAt: null },
    ],
    certifications: [],
    reviews: [],
    timeOff: { type: "PTO", balanceDays: 25, used: 0, upcoming: [], recent: [] },
    goals: [
      { id: "g1", title: "Complete onboarding playbook by week 6", status: "ON_TRACK", progress: 65, dueAt: "May 2026" },
      { id: "g2", title: "Ship first solo client deliverable",     status: "ON_TRACK", progress: 10, dueAt: "Jul 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract", type: "CONTRACT", uploadedAt: "Apr 2026", expiresAt: null },
      { id: "d2", name: "Mutual NDA",          type: "NDA",       uploadedAt: "Apr 2026", expiresAt: null },
      { id: "d3", name: "Right-to-work · UK",   type: "ID",        uploadedAt: "Apr 2026", expiresAt: "Jan 2030" },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Air 13\" M3", assignedAt: "Apr 2026", status: "ACTIVE", serial: "C02FQ-2026-002" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Dashboard" || m === "Customers" || m === "Bookings") ? "VIEW" : "NONE" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "task",  label: "Completed onboarding module 3 of 8",   whenTs: HRS(20), tone: "ok" },
      { id: "a2", type: "login", label: "Signed in from Chrome · macOS · London", whenTs: HRS(2), tone: "muted" },
      { id: "a3", type: "edit",  label: "Profile photo and timezone set",         whenTs: DAYS(2), tone: "info" },
    ],
    tags: ["onboarding", "new"],
    upcomingBookings: [
      { time: "Tue 09:30", title: "Onboarding · platform tour", client: "Internal", dur: "60m" },
      { time: "Thu 10:00", title: "1:1 with Sam",                 client: "Internal", dur: "30m" },
    ],
    lastActiveTs: HRS(2),
  },

  {
    id: "u-rk", name: "Ravi Kapoor", initials: "RK", photoUrl: null,
    role: "Engagement Manager", title: "Manager · Consulting", department: "Consulting",
    level: "Manager", status: "ACTIVE",
    email: "ravi@ironheart.io", phone: "+44 7700 900717",
    location: "London, UK", timezone: "Europe/London",
    about: "Manages multi-engagement clients. Keeps three big retainers humming. Loves a Gantt chart.",
    manager: { id: "u-lh", name: "Luke Hodges", initials: "LH" },
    directReports: [
      { id: "u-mr", name: "Mira Reyes",  initials: "MR", role: "Senior Consultant" },
      { id: "u-ej", name: "Esme Jowett", initials: "EJ", role: "Consultant" },
    ],
    employment: { type: "FTE", startedAt: "Feb 2025", tenureMonths: 15, employmentNumber: "IH-0007" },
    compensation: { band: "L6", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 40, billableHoursThisWeek: 18, adminHoursThisWeek: 18, utilizationPct: 90, ptoBalanceDays: 13 },
    assignments: [
      { engagementId: "c-northwind", customerName: "Northwind Co.",   role: "Reviewer", allocationPct: 15, stage: "Auditing" },
      { engagementId: "c-arden",     customerName: "Arden Health",    role: "Reviewer", allocationPct: 15, stage: "Reporting" },
      { engagementId: "c-bowery",    customerName: "Bowery Mills",     role: "Reviewer", allocationPct: 10, stage: "Retainer" },
    ],
    skills: [
      { name: "Portfolio Management", group: "Consulting", level: 5, verifiedAt: "Mar 2026" },
      { name: "Forecasting",          group: "Consulting", level: 4, verifiedAt: "Mar 2026" },
      { name: "Coaching",             group: "Soft",       level: 4, verifiedAt: null },
      { name: "Hindi",                group: "Language",   level: 5, verifiedAt: null },
    ],
    certifications: [
      { name: "PMP",                 issuer: "PMI",       issuedAt: "May 2022", expiresAt: "May 2025" },
      { name: "Scrum Master · CSM",  issuer: "Scrum Alliance", issuedAt: "Mar 2021", expiresAt: null },
    ],
    reviews: [
      { period: "Q1 2026", rating: "EXCEEDS", reviewer: "Luke Hodges", summary: "Quietly raised the bar for portfolio reporting. Mira and Esme both improved under his coaching." },
      { period: "Q4 2025", rating: "MEETS",   reviewer: "Luke Hodges", summary: "Settling in as manager. Great peer feedback." },
    ],
    timeOff: {
      type: "PTO", balanceDays: 13, used: 7,
      upcoming: [{ from: "Jun 10", to: "Jun 14", reason: "Family", days: 5 }],
      recent: [{ from: "Mar 04", to: "Mar 05", reason: "Personal", days: 2 }],
    },
    goals: [
      { id: "g1", title: "Improve forecast accuracy to ±10%",      status: "ON_TRACK", progress: 70, dueAt: "Aug 2026" },
      { id: "g2", title: "Run quarterly portfolio review cadence", status: "DONE",     progress: 100, dueAt: "Apr 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract", type: "CONTRACT", uploadedAt: "Feb 2025", expiresAt: null },
      { id: "d2", name: "Mutual NDA",          type: "NDA",       uploadedAt: "Feb 2025", expiresAt: null },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP",  model: "MacBook Pro 14\" M3",   assignedAt: "Feb 2025", status: "ACTIVE", serial: "C02FQ-2025-003" },
      { id: "e2", type: "LICENSE", model: "Linear · admin seat",    assignedAt: "Feb 2025", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Clients" || m === "Pipeline" || m === "Bookings" || m === "Reviews" || m === "Customers") ? "ADMIN" :
             (m === "Settings")                                                                                 ? "NONE"  :
                                                                                                                  "EDIT" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "deliverable", label: "Portfolio review · Q1 closed",          whenTs: HRS(6),  tone: "ok" },
      { id: "a2", type: "task",        label: "Forecast updated for May–July",         whenTs: HRS(18), tone: "info" },
      { id: "a3", type: "perm",        label: "Granted EDIT to Mira on Audit module",   whenTs: DAYS(2), tone: "accent" },
      { id: "a4", type: "login",       label: "Signed in from Safari · iPhone · London", whenTs: HRS(2), tone: "muted" },
    ],
    tags: ["management", "consulting"],
    upcomingBookings: [
      { time: "Tue 09:00", title: "1:1 with Mira",      client: "Internal",  dur: "30m" },
      { time: "Tue 15:00", title: "Portfolio review",    client: "Internal",  dur: "60m" },
      { time: "Wed 10:00", title: "Northwind sync",      client: "Northwind", dur: "30m" },
    ],
    lastActiveTs: HRS(2),
  },

  {
    id: "u-fk", name: "Freya Karlsen", initials: "FK", photoUrl: null,
    role: "Senior Engineer (Contractor)", title: "Senior · Engineering", department: "Engineering",
    level: "Senior", status: "ACTIVE",
    email: "freya@ironheart.io", phone: "+44 7700 900822",
    location: "Oslo, NO", timezone: "Europe/Oslo",
    about: "Long-term contractor. Pairs with Tomás on workflow editor + frontend platform. Day-rate based.",
    manager: { id: "u-tk", name: "Tomás Köhler", initials: "TK" },
    directReports: [],
    employment: { type: "CONTRACTOR", startedAt: "Aug 2025", tenureMonths: 9, employmentNumber: "IH-C0001" },
    compensation: { band: "Contract · Day rate", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 32, billableHoursThisWeek: 30, adminHoursThisWeek: 0, utilizationPct: 94, ptoBalanceDays: 0 },
    assignments: [
      { engagementId: "internal-platform", customerName: "Internal · Platform", role: "Support", allocationPct: 80, stage: "Phase 5" },
    ],
    skills: [
      { name: "React",       group: "Engineering", level: 5, verifiedAt: "Mar 2026" },
      { name: "Next.js",     group: "Engineering", level: 5, verifiedAt: "Mar 2026" },
      { name: "TypeScript",  group: "Engineering", level: 5, verifiedAt: "Mar 2026" },
      { name: "Tailwind",    group: "Engineering", level: 5, verifiedAt: null },
      { name: "Accessibility", group: "Engineering", level: 4, verifiedAt: "Feb 2026" },
      { name: "Norwegian",   group: "Language",    level: 5, verifiedAt: null },
    ],
    certifications: [],
    reviews: [
      { period: "Q1 2026", rating: "EXCEEDS", reviewer: "Tomás Köhler", summary: "Rebuilt the entire frontend system. Component quality is exceptional." },
    ],
    timeOff: { type: "PTO", balanceDays: 0, used: 0, upcoming: [{ from: "Jul 01", to: "Jul 18", reason: "Holiday · contractor-unpaid", days: 14 }], recent: [] },
    goals: [
      { id: "g1", title: "Ship workflow visual editor",  status: "ON_TRACK", progress: 55, dueAt: "Aug 2026" },
      { id: "g2", title: "Hit 100% Lighthouse a11y",     status: "DONE", progress: 100, dueAt: "Mar 2026" },
    ],
    documents: [
      { id: "d1", name: "Contractor agreement", type: "CONTRACT", uploadedAt: "Aug 2025", expiresAt: "Aug 2026" },
      { id: "d2", name: "Mutual NDA",            type: "NDA",       uploadedAt: "Aug 2025", expiresAt: null },
    ],
    equipment: [
      { id: "e1", type: "LICENSE", model: "Figma · org seat",          assignedAt: "Aug 2025", status: "ACTIVE" },
      { id: "e2", type: "LICENSE", model: "GitHub · Copilot business", assignedAt: "Aug 2025", status: "ACTIVE" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Workflows" || m === "Forms") ? "EDIT" :
             (m === "Settings" || m === "Team" || m === "Audit") ? "NONE" :
                                                                  "VIEW" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "deliverable", label: "Shipped 23 component refactors this week", whenTs: HRS(8),  tone: "ok" },
      { id: "a2", type: "task",        label: "Closed 9 frontend tickets",                whenTs: HRS(28), tone: "ok" },
      { id: "a3", type: "login",       label: "Signed in from VS Code · macOS · Oslo",    whenTs: HRS(3), tone: "muted" },
    ],
    tags: ["engineering", "contractor", "frontend"],
    upcomingBookings: [
      { time: "Wed 11:00", title: "Frontend pairing",   client: "Internal", dur: "60m" },
      { time: "Thu 15:00", title: "Editor demo dry-run", client: "Internal", dur: "30m" },
    ],
    lastActiveTs: HRS(3),
  },

  {
    id: "u-jv", name: "Jared Vance", initials: "JV", photoUrl: null,
    role: "Director of Strategy", title: "Director · Consulting", department: "Consulting",
    level: "Director", status: "ON_LEAVE",
    email: "jared@ironheart.io", phone: "+44 7700 900971",
    location: "London, UK", timezone: "Europe/London",
    about: "Senior advisor and director-on-call. On parental leave through Aug 2026.",
    manager: { id: "u-lh", name: "Luke Hodges", initials: "LH" },
    directReports: [],
    employment: { type: "FTE", startedAt: "Oct 2024", tenureMonths: 19, employmentNumber: "IH-0008" },
    compensation: { band: "L7", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 0, billableHoursThisWeek: 0, adminHoursThisWeek: 0, utilizationPct: 0, ptoBalanceDays: 22 },
    assignments: [],
    skills: [
      { name: "Strategy",         group: "Consulting", level: 5, verifiedAt: "Sep 2025" },
      { name: "Board Advisory",   group: "Consulting", level: 5, verifiedAt: "Sep 2025" },
      { name: "Fundraising",      group: "Consulting", level: 4, verifiedAt: null },
    ],
    certifications: [
      { name: "MBA · Insead",   issuer: "Insead", issuedAt: "Jun 2018", expiresAt: null },
    ],
    reviews: [
      { period: "Q3 2025", rating: "EXCEEDS", reviewer: "Luke Hodges", summary: "Closed two major strategic engagements before going on leave. Big void to cover." },
    ],
    timeOff: {
      type: "PERSONAL", balanceDays: 22, used: 22,
      upcoming: [{ from: "Apr 22", to: "Aug 22", reason: "Parental leave", days: 122 }],
      recent: [],
    },
    goals: [
      { id: "g1", title: "Return-to-work transition plan", status: "ON_TRACK", progress: 30, dueAt: "Aug 2026" },
    ],
    documents: [
      { id: "d1", name: "Employment contract", type: "CONTRACT", uploadedAt: "Oct 2024", expiresAt: null },
      { id: "d2", name: "Mutual NDA",          type: "NDA",       uploadedAt: "Oct 2024", expiresAt: null },
      { id: "d3", name: "Parental leave plan",  type: "TRAINING",  uploadedAt: "Mar 2026", expiresAt: null },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP", model: "MacBook Pro 14\" M2", assignedAt: "Oct 2024", status: "ACTIVE", serial: "C02FQ-2024-018" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Dashboard") ? "VIEW" : "NONE" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "edit",  label: "Set away message · parental leave",  whenTs: DAYS(21), tone: "muted" },
      { id: "a2", type: "login", label: "Signed in to set out-of-office",      whenTs: DAYS(21), tone: "muted" },
    ],
    tags: ["leadership", "strategy"],
    upcomingBookings: [],
    lastActiveTs: DAYS(21),
  },

  {
    id: "u-ao", name: "Anya Okafor", initials: "AO", photoUrl: null,
    role: "Engineering Intern", title: "Intern · Engineering", department: "Engineering",
    level: "IC1", status: "ONBOARDING",
    email: "anya@ironheart.io", phone: "+44 7700 900194",
    location: "Cambridge, UK", timezone: "Europe/London",
    about: "Summer intern. CS final year. Pairing with Freya on frontend.",
    manager: { id: "u-fk", name: "Freya Karlsen", initials: "FK" },
    directReports: [],
    employment: { type: "INTERN", startedAt: "Apr 2026", tenureMonths: 1, employmentNumber: "IH-I0001" },
    compensation: { band: "Intern stipend", currency: "£", summary: "Within band" },
    capacity: { weeklyHoursTarget: 32, billableHoursThisWeek: 0, adminHoursThisWeek: 26, utilizationPct: 81, ptoBalanceDays: 10 },
    assignments: [
      { engagementId: "internal-platform", customerName: "Internal · Platform", role: "Support", allocationPct: 100, stage: "Onboarding" },
    ],
    skills: [
      { name: "React",        group: "Engineering", level: 3, verifiedAt: null },
      { name: "TypeScript",   group: "Engineering", level: 3, verifiedAt: null },
      { name: "CSS",          group: "Engineering", level: 4, verifiedAt: null },
    ],
    certifications: [],
    reviews: [],
    timeOff: { type: "PTO", balanceDays: 10, used: 0, upcoming: [], recent: [] },
    goals: [
      { id: "g1", title: "Ship 2 component PRs",          status: "ON_TRACK", progress: 50, dueAt: "Jun 2026" },
      { id: "g2", title: "Complete onboarding bootcamp",  status: "ON_TRACK", progress: 70, dueAt: "May 2026" },
    ],
    documents: [
      { id: "d1", name: "Internship offer letter", type: "CONTRACT", uploadedAt: "Mar 2026", expiresAt: "Aug 2026" },
      { id: "d2", name: "Mutual NDA",               type: "NDA",       uploadedAt: "Apr 2026", expiresAt: null },
      { id: "d3", name: "Right-to-work · UK",        type: "ID",        uploadedAt: "Apr 2026", expiresAt: "Sep 2030" },
    ],
    equipment: [
      { id: "e1", type: "LAPTOP", model: "MacBook Air 13\" M3", assignedAt: "Apr 2026", status: "ACTIVE", serial: "C02FQ-2026-009" },
    ],
    permissions: STANDARD_MODULES.map(m => ({
      module: m,
      level: (m === "Dashboard") ? "VIEW" : "NONE" as PermissionLevel,
    })),
    recentActivity: [
      { id: "a1", type: "task",  label: "Submitted PR #142 · profile avatar tweaks", whenTs: HRS(16), tone: "info" },
      { id: "a2", type: "login", label: "Signed in from Cambridge",                  whenTs: HRS(4),  tone: "muted" },
    ],
    tags: ["intern", "engineering"],
    upcomingBookings: [
      { time: "Mon 10:00", title: "Onboarding · platform tour", client: "Internal", dur: "60m" },
      { time: "Wed 14:00", title: "1:1 with Freya",              client: "Internal", dur: "30m" },
    ],
    lastActiveTs: HRS(4),
  },
]

/* ── Materialised members (compute derived fields once) ──────────────────── */

function computeCertExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  /* mock: if year is 2025 or "May 2026" / "Jun 2026" treat as expiring */
  return /(?:May|Jun|Jul) 2026/.test(expiresAt) || /(?:2025)$/.test(expiresAt)
}
function computeDocExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return /(?:May|Jun|Jul) 2026/.test(expiresAt) || /(?:2025)$/.test(expiresAt)
}

const MEMBERS: TeamMember[] = RAW.map(r => ({
  ...r,
  employment: { ...r.employment, tenureLabel: tenureLabel(r.employment.tenureMonths) },
  certifications: r.certifications.map(c => ({ ...c, expiringSoon: computeCertExpiry(c.expiresAt) })),
  documents:      r.documents.map(d => ({ ...d, expiringSoon: computeDocExpiry(d.expiresAt) })),
  recentActivity: r.recentActivity.map(a => ({ ...a, when: relFromMs(a.whenTs) }))
                                  .sort((a, b) => b.whenTs - a.whenTs),
  lastActiveAt: relFromMs(r.lastActiveTs),
}))

/* ── Indexes ─────────────────────────────────────────────────────────────── */

const ALL_DEPARTMENTS = Array.from(new Set(MEMBERS.map(m => m.department))).sort()
const ALL_TAGS        = Array.from(new Set(MEMBERS.flatMap(m => m.tags))).sort()

/* ── Segments ────────────────────────────────────────────────────────────── */

export function getSegments(): TeamSegmentDef[] {
  return [
    {
      group: "Saved views",
      items: [
        { id: "all",         label: "All team",         count: MEMBERS.length,                                             icon: "users" },
        { id: "active",      label: "Active",            count: MEMBERS.filter(m => m.status === "ACTIVE").length,           icon: "check", pinned: true },
        { id: "leave",       label: "On leave",          count: MEMBERS.filter(m => m.status === "ON_LEAVE").length,         icon: "clock", dot: "warn" },
        { id: "onboarding",  label: "Onboarding",        count: MEMBERS.filter(m => m.status === "ONBOARDING").length,       icon: "sparkles", pinned: true },
        { id: "high-util",   label: "Above 90% util.",   count: MEMBERS.filter(m => m.capacity.utilizationPct >= 90).length, icon: "bolt",  dot: "danger", pinned: true },
        { id: "managers",    label: "Managers",           count: MEMBERS.filter(m => m.directReports.length > 0).length,     icon: "shield" },
        { id: "contractors", label: "Contractors",        count: MEMBERS.filter(m => m.employment.type === "CONTRACTOR").length, icon: "handshake" },
      ],
    },
    {
      group: "By level",
      items: LEVEL_ORDER.map(l => ({ id: `level:${l}`, label: l, count: MEMBERS.filter(m => m.level === l).length })),
    },
    {
      group: "By department",
      items: ALL_DEPARTMENTS.map(d => ({ id: `dept:${d}`, label: d, count: MEMBERS.filter(m => m.department === d).length, icon: "building" })),
    },
    { group: "Tags", tags: ALL_TAGS },
  ]
}

/* ── Query helpers ───────────────────────────────────────────────────────── */

function matchSegment(m: TeamMember, segment: string | undefined): boolean {
  if (!segment) return true
  switch (segment) {
    case "all":         return true
    case "active":      return m.status === "ACTIVE"
    case "leave":       return m.status === "ON_LEAVE"
    case "onboarding":  return m.status === "ONBOARDING"
    case "high-util":   return m.capacity.utilizationPct >= 90 && m.status === "ACTIVE"
    case "managers":    return m.directReports.length > 0
    case "contractors": return m.employment.type === "CONTRACTOR"
    default:
      if (segment.startsWith("level:")) return m.level === segment.slice(6)
      if (segment.startsWith("dept:"))  return m.department === segment.slice(5)
      if (segment.startsWith("tag:"))   return m.tags.includes(segment.slice(4))
      return true
  }
}

function matchFilters(m: TeamMember, f: TeamFilters | undefined): boolean {
  if (!f) return true
  if (f.department?.length && !f.department.includes(m.department)) return false
  if (f.level?.length      && !f.level.includes(m.level)) return false
  if (f.status?.length     && !f.status.includes(m.status)) return false
  if (f.managerId?.length  && (!m.manager || !f.managerId.includes(m.manager.id))) return false
  if (f.tag?.length        && !f.tag.some(t => m.tags.includes(t))) return false
  return true
}

function matchSearch(m: TeamMember, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const q = search.toLowerCase()
  return m.name.toLowerCase().includes(q)
    || m.role.toLowerCase().includes(q)
    || m.title.toLowerCase().includes(q)
    || m.department.toLowerCase().includes(q)
    || m.location.toLowerCase().includes(q)
    || m.skills.some(s => s.name.toLowerCase().includes(q))
    || m.tags.some(t => t.toLowerCase().includes(q))
}

function sortRows(rows: TeamMember[], by: TeamSortBy = "name", dir: TeamSortDir = "asc"): TeamMember[] {
  const mult = dir === "asc" ? 1 : -1
  const out  = [...rows]
  out.sort((a, b) => {
    switch (by) {
      case "name":        return a.name.localeCompare(b.name) * mult
      case "utilization": return (a.capacity.utilizationPct - b.capacity.utilizationPct) * mult
      case "tenure":      return (a.employment.tenureMonths - b.employment.tenureMonths) * mult
      case "assignments": return (a.assignments.length - b.assignments.length) * mult
      case "lastActive":  return (a.lastActiveTs - b.lastActiveTs) * mult
      default: return 0
    }
  })
  return out
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export const mockTeam = {
  list(q: TeamQuery = {}): TeamMember[] {
    const tagSegmentMatch = q.segment?.startsWith("tag:")
    const filters = tagSegmentMatch
      ? { ...q.filters, tag: [...(q.filters?.tag ?? []), q.segment!.slice(4)] }
      : q.filters
    const filtered = MEMBERS.filter(m =>
      matchSegment(m, tagSegmentMatch ? undefined : q.segment) &&
      matchFilters(m, filters) &&
      matchSearch(m, q.search))
    return sortRows(filtered, q.sortBy, q.sortDir)
  },

  total(): number { return MEMBERS.length },

  getById(id: string): TeamMember | null {
    return MEMBERS.find(m => m.id === id) ?? null
  },

  stats(rows: TeamMember[]): TeamStats {
    const active = rows.filter(m => m.status === "ACTIVE")
    const utilAvg = active.length === 0 ? 0
      : Math.round(active.reduce((s, m) => s + m.capacity.utilizationPct, 0) / active.length)
    const billable = rows.reduce((s, m) => s + m.capacity.billableHoursThisWeek, 0)
    return {
      headcount: rows.length,
      avgUtilization: utilAvg,
      billableThisWeek: billable,
      onLeave: rows.filter(m => m.status === "ON_LEAVE").length,
      openRoles: 3,   /* mock */
    }
  },

  allDepartments(): string[] { return ALL_DEPARTMENTS },
  allTags(): string[] { return ALL_TAGS },
  allManagers(): ManagerRef[] {
    const map = new Map<string, ManagerRef>()
    for (const m of MEMBERS) if (m.manager) map.set(m.manager.id, m.manager)
    return Array.from(map.values())
  },

  segments: getSegments,
}
