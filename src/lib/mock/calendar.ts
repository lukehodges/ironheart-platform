/**
 * Mock data layer for the calendar (/admin/calendar).
 *
 * Discriminated union — each event type carries its own payload but shares
 * id/title/timestamps/tone metadata. Future tRPC procedure:
 *   calendar.list(query)              → CalendarEvent[]
 *   calendar.getById(id)              → CalendarEvent | null
 *   calendar.eventsForDay(dayIso)     → CalendarEvent[]
 *   calendar.eventsForWeek(startIso)  → CalendarEvent[]
 *   calendar.stats(rows)              → CalendarStats
 *
 * IMPORTANT: Times are resolved at module load against a fixed `WEEK_START`
 * Monday (not Date.now()) so render is deterministic and pure. Each raw
 * record specifies a `dayOffset` from that Monday + `startMin`/`endMin`
 * minutes-of-day; resolved ISO strings + day buckets are pre-computed here.
 *
 * Required DB fields (per calendarEvents):
 *   id, type, title, startsAt (timestamptz), endsAt (timestamptz), allDay,
 *   tone, location, status, recurringRule, notes, customerId (FK nullable),
 *   engagementId (FK nullable), bookingId (FK nullable), tenantId
 *   calendarEvent_attendees:    eventId, name, initials, role
 *   calendarEvent_preparation:  eventId, idx, label, done
 */

/* ── Types (tRPC-shaped) ─────────────────────────────────────────────────── */

export type CalendarEventType = "booking" | "internal" | "personal" | "deadline" | "reminder"
export type CalendarEventStatus = "CONFIRMED" | "TENTATIVE" | "CANCELLED"
export type CalendarTone = "accent" | "info" | "ok" | "warn" | "danger" | "muted"
export type CalendarLocationKind = "google_meet" | "zoom" | "in_person" | "phone" | "none"

export interface CalendarAttendee {
  name: string
  initials: string
  role: string
}

export interface CalendarCustomerRef {
  id: string
  name: string
  initials: string
  engagementId: string | null
}

export interface CalendarRelatedRef {
  type: "customer" | "engagement" | "booking" | "deliverable" | "invoice"
  label: string
  href: string
}

export interface CalendarPrepItem {
  idx: number
  label: string
  done: boolean
}

export interface CalendarEventBase {
  id: string
  type: CalendarEventType
  title: string
  tone: CalendarTone

  /* time — resolved ISO + bucketing, ready to render. */
  startsAt: string        /* ISO "YYYY-MM-DDTHH:mm:00.000Z"-ish (local-flavor) */
  endsAt: string
  dayOffset: number       /* days from WEEK_START Monday (can be negative for prev week) */
  startMin: number        /* minutes since midnight */
  endMin: number          /* minutes since midnight (0 for all-day) */
  allDay: boolean
  durationMin: number     /* endMin - startMin OR 24*60 if allDay */
  dayLabel: string        /* "Mon", "Tue", ... */
  dateLabel: string       /* "May 12" */
  timeLabel: string       /* "10:30 – 11:00" or "All day" */

  status: CalendarEventStatus
  location: string
  locationKind: CalendarLocationKind
  notes: string
  recurringRule: string | null
  customer: CalendarCustomerRef | null
  attendees: CalendarAttendee[]
  related: CalendarRelatedRef[]
}

export interface BookingEvent extends CalendarEventBase {
  type: "booking"
  payload: {
    bookingId: string
    bookingKind: "discovery" | "sprint_review" | "audit" | "demo" | "checkpoint" | "handoff"
    preparation: CalendarPrepItem[]
  }
}

export interface InternalEvent extends CalendarEventBase {
  type: "internal"
  payload: {
    kind: "standup" | "focus" | "admin" | "planning"
  }
}

export interface PersonalEvent extends CalendarEventBase {
  type: "personal"
  payload: {
    kind: "ooo" | "holiday" | "personal_appt"
  }
}

export interface DeadlineEvent extends CalendarEventBase {
  type: "deadline"
  payload: {
    deliverable: string
    daysRemaining: number
    preparation: CalendarPrepItem[]
  }
}

export interface ReminderEvent extends CalendarEventBase {
  type: "reminder"
  payload: {
    actionLabel: string         /* "Chase invoice", "Follow up after demo" */
    relatedTone: "info" | "warn" | "danger"
  }
}

export type CalendarEvent = BookingEvent | InternalEvent | PersonalEvent | DeadlineEvent | ReminderEvent

export interface CalendarStats {
  total: number
  byType: Record<CalendarEventType, number>
  bookingsThisWeek: number
  meetingHoursThisWeek: number
  freeHoursThisWeek: number
  nextDeadline: { title: string; daysRemaining: number } | null
}

export interface CalendarQuery {
  search?: string
  types?: CalendarEventType[]      /* filter event types */
  weekOffset?: number              /* 0 = current week, ±N for nav */
}

/* ── Static maps ─────────────────────────────────────────────────────────── */

export const TYPE_LABEL: Record<CalendarEventType, string> = {
  booking:  "Booking",
  internal: "Internal",
  personal: "Personal",
  deadline: "Deadline",
  reminder: "Reminder",
}

export const TONE_COLOR: Record<CalendarTone, string> = {
  accent: "var(--ih-accent)",
  info:   "var(--ih-info)",
  ok:     "var(--ih-ok)",
  warn:   "var(--ih-warn)",
  danger: "var(--ih-danger)",
  muted:  "var(--ih-ink-40)",
}

export const TONE_SOFT: Record<CalendarTone, string> = {
  accent: "var(--ih-accent-soft)",
  info:   "var(--ih-info-soft)",
  ok:     "var(--ih-ok-soft)",
  warn:   "var(--ih-warn-soft)",
  danger: "var(--ih-danger-soft)",
  muted:  "var(--ih-surface-2)",
}

/* ── Fixed week anchor (caveman: pure render, deterministic) ─────────────── */

/* Anchor Monday — used so all derived offsets/labels render identically every
 * paint. NEVER call Date.now() in render; this constant is the SSOT for "now". */
const WEEK_START_Y = 2026
const WEEK_START_M = 4   /* 0-indexed: 4 = May */
const WEEK_START_D = 11  /* Mon May 11, 2026 — matches today=May 12 → in-week */
const WEEK_START_DATE = new Date(WEEK_START_Y, WEEK_START_M, WEEK_START_D)

/* "Today" offset within the fixed week — Tue May 12, 2026 → dayOffset=1 */
export const TODAY_DAY_OFFSET = 1

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_NAMES_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_NAMES_LONG  = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function dateForOffset(dayOffset: number): Date {
  const d = new Date(WEEK_START_DATE)
  d.setDate(d.getDate() + dayOffset)
  return d
}

function isoForOffset(dayOffset: number, minutesOfDay: number): string {
  const d = dateForOffset(dayOffset)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(minutesOfDay)
  return d.toISOString()
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

function dateLabelFor(dayOffset: number): string {
  const d = dateForOffset(dayOffset)
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}`
}

function dayLabelFor(dayOffset: number): string {
  /* clamp to weekday index — works for negative & positive */
  const idx = ((dayOffset % 7) + 7) % 7
  return DAY_NAMES_SHORT[idx]
}

/* ── Raw seed records (caveman: terse, just the deltas) ──────────────────── */

interface RawEvent {
  id: string
  type: CalendarEventType
  title: string
  tone: CalendarTone
  dayOffset: number
  startMin: number
  endMin: number            /* same as startMin if allDay */
  allDay?: boolean
  status?: CalendarEventStatus
  location?: string
  locationKind?: CalendarLocationKind
  notes?: string
  recurring?: string | null
  customerKey?: keyof typeof CUSTOMERS
  attendees?: CalendarAttendee[]
  /* type-specific extras */
  bookingKind?: BookingEvent["payload"]["bookingKind"]
  preparation?: string[]
  internalKind?: InternalEvent["payload"]["kind"]
  personalKind?: PersonalEvent["payload"]["kind"]
  deliverable?: string
  reminderAction?: string
  reminderTone?: ReminderEvent["payload"]["relatedTone"]
}

/* Customer registry — keep aligned with /lib/mock/clients.ts. */
const CUSTOMERS = {
  northwind: { id: "cust-nw", name: "Northwind Co.",       initials: "NW", engagementId: "c-northwind" },
  vellum:    { id: "cust-vl", name: "Vellum & Co.",        initials: "VC", engagementId: "c-vellum"    },
  seaglass:  { id: "cust-sg", name: "Sea Glass Studio",    initials: "SG", engagementId: "c-seaglass"  },
  bowery:    { id: "cust-bm", name: "Bowery Mills",        initials: "BM", engagementId: "c-bowery"    },
  brigham:   { id: "cust-br", name: "Brigham Architects",  initials: "BA", engagementId: "c-brigham"   },
  pebble:    { id: "cust-pp", name: "Pebble & Pine",       initials: "PP", engagementId: "c-pebble"    },
  midatl:    { id: "cust-ma", name: "Mid-Atlantic Co.",    initials: "MA", engagementId: "c-midatl"    },
  castor:    { id: "cust-cf", name: "Castor Foods",        initials: "CF", engagementId: "c-castor"    },
  arden:     { id: "cust-ar", name: "Arden Health",        initials: "AR", engagementId: "c-arden"     },
  acme:      { id: "cust-ac", name: "Acme Studios",        initials: "AS", engagementId: null          },
} as const

const ME: CalendarAttendee = { name: "Luke Hodges", initials: "LH", role: "Consultant" }

/* Helper: build a list of minutes from "HH:MM". */
function t(h: number, m: number = 0): number { return h * 60 + m }

const RAW: RawEvent[] = [
  /* ── Week -1 (last week, for context) ──────────────────────────── */
  { id: "ev-101", type: "booking", title: "Discovery · Pebble & Pine", tone: "accent",
    dayOffset: -5, startMin: t(10), endMin: t(11),
    customerKey: "pebble", bookingKind: "discovery",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Initial discovery — get the lay of the land. Budget signals, decision-makers, real pain.",
    attendees: [ME, { name: "Asha Kapoor", initials: "AK", role: "Founder · Pebble & Pine" }],
    preparation: ["Read intake form", "Pull industry benchmarks", "Draft 3 opener questions"],
  },
  { id: "ev-102", type: "deadline", title: "Proposal v1 due · Sea Glass", tone: "warn",
    dayOffset: -3, startMin: 0, endMin: 0, allDay: true,
    customerKey: "seaglass", deliverable: "Proposal v1 PDF",
    notes: "Internal due date — send by EOD so client gets it Monday morning.",
  },

  /* ── This week (Mon May 11 – Sun May 17) ──────────────────────── */
  /* Mon */
  { id: "ev-201", type: "internal", title: "Team standup", tone: "muted",
    dayOffset: 0, startMin: t(9), endMin: t(9, 15),
    internalKind: "standup", location: "Zoom", locationKind: "zoom",
    recurring: "Weekdays at 09:00",
    attendees: [ME], notes: "Weekly review of pipeline, blockers, retainer load.",
  },
  { id: "ev-202", type: "booking", title: "Sprint review · Northwind", tone: "accent",
    dayOffset: 0, startMin: t(11), endMin: t(12),
    customerKey: "northwind", bookingKind: "sprint_review",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Show audit findings, walk through Q2 plan, get sign-off on scope for next sprint.",
    attendees: [ME, { name: "Mira Sato", initials: "MS", role: "Founder · Northwind" }, { name: "Priya Vance", initials: "PV", role: "Eng lead" }],
    preparation: ["Refresh audit deck slide 4", "Open the Q2 plan doc", "Test screen share"],
  },
  { id: "ev-203", type: "internal", title: "Focus block · proposal writing", tone: "info",
    dayOffset: 0, startMin: t(14), endMin: t(16),
    internalKind: "focus", location: "In-person", locationKind: "in_person",
    notes: "Deep work — draft Sea Glass v2 proposal.",
  },
  { id: "ev-204", type: "reminder", title: "Chase invoice · Brigham", tone: "danger",
    dayOffset: 0, startMin: t(16, 30), endMin: t(16, 45),
    customerKey: "brigham", reminderAction: "Chase invoice INV-002", reminderTone: "danger",
    notes: "Invoice 12 days overdue. If no reply today, escalate.",
  },

  /* Tue (today) */
  { id: "ev-205", type: "internal", title: "Team standup", tone: "muted",
    dayOffset: 1, startMin: t(9), endMin: t(9, 15),
    internalKind: "standup", location: "Zoom", locationKind: "zoom",
    recurring: "Weekdays at 09:00",
    attendees: [ME],
  },
  { id: "ev-206", type: "booking", title: "Audit call · Castor Foods", tone: "info",
    dayOffset: 1, startMin: t(10), endMin: t(11),
    customerKey: "castor", bookingKind: "audit",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Operations lens audit. Walk through findings, agree on top 3 remediation items.",
    attendees: [ME, { name: "Yuki Sato", initials: "YS", role: "COO · Castor" }],
    preparation: ["Print audit summary", "Confirm scorecard with team", "Draft remediation list"],
  },
  { id: "ev-207", type: "booking", title: "Discovery · Sea Glass", tone: "accent",
    dayOffset: 1, startMin: t(13, 30), endMin: t(14, 30),
    customerKey: "seaglass", bookingKind: "discovery",
    location: "Zoom", locationKind: "zoom",
    notes: "Second discovery — clarify scope, validate proposal numbers.",
    attendees: [ME, { name: "Mira Patel", initials: "MP", role: "Director · Sea Glass" }],
    preparation: ["Re-read v1 proposal", "Prepare scope diff sheet"],
  },
  { id: "ev-208", type: "deadline", title: "Q1 report draft due · Mid-Atlantic", tone: "warn",
    dayOffset: 1, startMin: 0, endMin: 0, allDay: true,
    customerKey: "midatl", deliverable: "Q1 reporting deck",
    notes: "Draft report for Mid-Atlantic — review with team Wed AM.",
  },

  /* Wed */
  { id: "ev-209", type: "booking", title: "Sprint demo · Vellum", tone: "accent",
    dayOffset: 2, startMin: t(11), endMin: t(12),
    customerKey: "vellum", bookingKind: "demo",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Sprint 4 demo. Portal staging walkthrough + feedback collection.",
    attendees: [ME, { name: "Tom Reeves", initials: "TR", role: "CTO · Vellum" }, { name: "Asha Kapoor", initials: "AK", role: "PM" }],
    preparation: ["Deploy latest to staging", "Pre-record fallback in case net dies", "Pull feedback template"],
  },
  { id: "ev-210", type: "internal", title: "Q3 roadmap planning", tone: "info",
    dayOffset: 2, startMin: t(15), endMin: t(16, 30),
    internalKind: "planning", location: "In-person", locationKind: "in_person",
    notes: "Sketch Q3 retainer pipeline, capacity, target clients.",
  },
  { id: "ev-211", type: "reminder", title: "Follow up · Pebble discovery", tone: "warn",
    dayOffset: 2, startMin: t(17), endMin: t(17, 15),
    customerKey: "pebble", reminderAction: "Send recap + next steps email", reminderTone: "warn",
    notes: "Send thank-you + proposal timeline after Monday's call.",
  },

  /* Thu */
  { id: "ev-212", type: "internal", title: "Team standup", tone: "muted",
    dayOffset: 3, startMin: t(9), endMin: t(9, 15),
    internalKind: "standup", recurring: "Weekdays at 09:00",
    location: "Zoom", locationKind: "zoom",
    attendees: [ME],
  },
  { id: "ev-213", type: "booking", title: "Findings call · Arden Health", tone: "info",
    dayOffset: 3, startMin: t(10), endMin: t(11),
    customerKey: "arden", bookingKind: "checkpoint",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Walk through five-lens summary, agree on handover plan.",
    attendees: [ME, { name: "Priya Vance", initials: "PV", role: "Ops · Arden" }],
    preparation: ["Polish five-lens summary doc", "Prepare handover checklist"],
  },
  { id: "ev-214", type: "personal", title: "Dentist", tone: "muted",
    dayOffset: 3, startMin: t(14), endMin: t(15),
    personalKind: "personal_appt", location: "In-person", locationKind: "in_person",
    notes: "Routine check-up. Don't book over.",
  },
  { id: "ev-215", type: "booking", title: "Checkpoint · Bowery Mills", tone: "ok",
    dayOffset: 3, startMin: t(16), endMin: t(16, 30),
    customerKey: "bowery", bookingKind: "checkpoint",
    location: "Phone", locationKind: "phone",
    notes: "Monthly check-in. Retainer pulse + April invoice confirmation.",
    attendees: [ME, { name: "Jonas Hale", initials: "JH", role: "Ops director · Bowery" }],
    preparation: ["Pull April retainer hours", "Confirm next month's focus"],
  },

  /* Fri */
  { id: "ev-216", type: "internal", title: "Team standup", tone: "muted",
    dayOffset: 4, startMin: t(9), endMin: t(9, 15),
    internalKind: "standup", recurring: "Weekdays at 09:00",
    location: "Zoom", locationKind: "zoom",
  },
  { id: "ev-217", type: "booking", title: "Handoff · Mid-Atlantic reporting", tone: "ok",
    dayOffset: 4, startMin: t(10), endMin: t(11),
    customerKey: "midatl", bookingKind: "handoff",
    location: "Zoom", locationKind: "zoom",
    notes: "Hand over final reports + dashboards. Close out the engagement.",
    attendees: [ME, { name: "Daniel Foss", initials: "DF", role: "Director · Mid-Atlantic" }],
    preparation: ["Upload final PDFs to portal", "Send invoice for closeout"],
  },
  { id: "ev-218", type: "deadline", title: "Vellum invoice due", tone: "danger",
    dayOffset: 4, startMin: 0, endMin: 0, allDay: true,
    customerKey: "vellum", deliverable: "Invoice INV-3 · £16,000",
    notes: "Final invoice for sprint 4. Send today.",
  },
  { id: "ev-219", type: "internal", title: "Admin · billing + filing", tone: "muted",
    dayOffset: 4, startMin: t(14), endMin: t(15, 30),
    internalKind: "admin",
    location: "In-person", locationKind: "in_person",
    notes: "Catch up on receipts, expense filing, weekly review.",
  },

  /* Sat — light load */
  { id: "ev-220", type: "personal", title: "Out of office", tone: "muted",
    dayOffset: 5, startMin: 0, endMin: 0, allDay: true,
    personalKind: "ooo", notes: "Family time. No work calls.",
  },

  /* Sun */
  { id: "ev-221", type: "internal", title: "Weekly review · planning", tone: "info",
    dayOffset: 6, startMin: t(17), endMin: t(18),
    internalKind: "planning", location: "In-person", locationKind: "in_person",
    notes: "Plan the week ahead. Triage pipeline. Set top 3 priorities.",
  },

  /* ── Week +1 (next week, for context) ─────────────────────────── */
  { id: "ev-301", type: "booking", title: "Discovery · Acme Studios", tone: "accent",
    dayOffset: 7, startMin: t(10), endMin: t(11),
    customerKey: "acme", bookingKind: "discovery",
    location: "Google Meet", locationKind: "google_meet",
    notes: "First contact with Acme. They reached out about a Q3 retainer.",
    attendees: [ME, { name: "Sarah Rowe", initials: "SR", role: "Finance · Acme" }],
    preparation: ["Review their intake form", "Prepare retainer pricing options"],
  },
  { id: "ev-302", type: "booking", title: "Sprint review · Northwind", tone: "accent",
    dayOffset: 7, startMin: t(11), endMin: t(12),
    customerKey: "northwind", bookingKind: "sprint_review",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Weekly sprint review.",
    recurring: "Mondays at 11:00",
    attendees: [ME, { name: "Mira Sato", initials: "MS", role: "Founder · Northwind" }],
    preparation: ["Pull sprint metrics", "Update the retainer board"],
  },
  { id: "ev-303", type: "deadline", title: "Brigham audit findings due", tone: "warn",
    dayOffset: 9, startMin: 0, endMin: 0, allDay: true,
    customerKey: "brigham", deliverable: "Audit findings memo",
    notes: "Memo for Brigham. Due before client meeting Friday.",
  },
  { id: "ev-304", type: "booking", title: "Audit call · Brigham", tone: "info",
    dayOffset: 11, startMin: t(14), endMin: t(15),
    customerKey: "brigham", bookingKind: "audit",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Walk Eleanor through findings. Try to unblock the overdue invoice.",
    attendees: [ME, { name: "Eleanor Brigham", initials: "EB", role: "Founder · Brigham" }],
    preparation: ["Finalise memo", "Prepare invoice talking points"],
  },
  { id: "ev-305", type: "personal", title: "Spring bank holiday", tone: "muted",
    dayOffset: 13, startMin: 0, endMin: 0, allDay: true,
    personalKind: "holiday", notes: "UK bank holiday. Office closed.",
  },

  /* ── Week +2 (further ahead) ──────────────────────────────────── */
  { id: "ev-401", type: "booking", title: "Discovery · Pebble & Pine v2", tone: "accent",
    dayOffset: 14, startMin: t(10), endMin: t(11),
    customerKey: "pebble", bookingKind: "discovery",
    location: "Google Meet", locationKind: "google_meet",
    notes: "Second discovery — scope agreement before contract.",
    attendees: [ME, { name: "Asha Kapoor", initials: "AK", role: "Founder · Pebble & Pine" }],
    preparation: ["Bring scope diff sheet", "Have draft contract ready"],
  },
  { id: "ev-402", type: "booking", title: "Q1 report walkthrough · Mid-Atlantic", tone: "info",
    dayOffset: 15, startMin: t(13), endMin: t(14),
    customerKey: "midatl", bookingKind: "checkpoint",
    location: "Zoom", locationKind: "zoom",
    notes: "Present Q1 reports. Confirm renewal terms.",
    attendees: [ME, { name: "Daniel Foss", initials: "DF", role: "Director · Mid-Atlantic" }],
    preparation: ["Polish slides", "Prepare renewal one-pager"],
  },
  { id: "ev-403", type: "reminder", title: "Renewal nudge · Bowery", tone: "info",
    dayOffset: 16, startMin: t(9), endMin: t(9, 15),
    customerKey: "bowery", reminderAction: "Send renewal terms", reminderTone: "info",
    notes: "Bowery retainer auto-renews in 6 weeks. Send terms early.",
  },
]

/* ── Resolution pass (caveman: pure, runs once at module load) ───────────── */

function resolve(raw: RawEvent): CalendarEvent {
  const allDay = raw.allDay ?? false
  const startMin = raw.startMin
  const endMin = allDay ? 0 : raw.endMin
  const durationMin = allDay ? 24 * 60 : Math.max(15, endMin - startMin)
  const dayLabel = dayLabelFor(raw.dayOffset)
  const dateLabel = dateLabelFor(raw.dayOffset)
  const timeLabel = allDay ? "All day" : `${fmtTime(startMin)} – ${fmtTime(endMin)}`

  const customer: CalendarCustomerRef | null = raw.customerKey
    ? { ...CUSTOMERS[raw.customerKey] }
    : null

  const related: CalendarRelatedRef[] = []
  if (customer) {
    related.push({ type: "customer", label: `Client · ${customer.name}`, href: `/admin/customers/${customer.id}` })
    if (customer.engagementId) {
      related.push({ type: "engagement", label: `Engagement · ${customer.name}`, href: `/admin/clients/${customer.engagementId}` })
    }
  }

  const base: CalendarEventBase = {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    tone: raw.tone,
    startsAt: isoForOffset(raw.dayOffset, startMin),
    endsAt: isoForOffset(raw.dayOffset, allDay ? 24 * 60 - 1 : endMin),
    dayOffset: raw.dayOffset,
    startMin,
    endMin,
    allDay,
    durationMin,
    dayLabel,
    dateLabel,
    timeLabel,
    status: raw.status ?? "CONFIRMED",
    location: raw.location ?? "—",
    locationKind: raw.locationKind ?? "none",
    notes: raw.notes ?? "",
    recurringRule: raw.recurring ?? null,
    customer,
    attendees: raw.attendees ?? [],
    related,
  }

  switch (raw.type) {
    case "booking": {
      const prep: CalendarPrepItem[] = (raw.preparation ?? []).map((label, idx) => ({ idx, label, done: false }))
      if (customer) {
        const bookingId = `bk-${raw.id.replace(/^ev-/, "")}`
        related.push({ type: "booking", label: `Booking · /${bookingId}`, href: `/admin/bookings/${bookingId}` })
      }
      return {
        ...base,
        type: "booking",
        payload: {
          bookingId: `bk-${raw.id.replace(/^ev-/, "")}`,
          bookingKind: raw.bookingKind ?? "discovery",
          preparation: prep,
        },
      }
    }
    case "internal":
      return {
        ...base,
        type: "internal",
        payload: { kind: raw.internalKind ?? "focus" },
      }
    case "personal":
      return {
        ...base,
        type: "personal",
        payload: { kind: raw.personalKind ?? "personal_appt" },
      }
    case "deadline": {
      const prep: CalendarPrepItem[] = []
      const daysRemaining = raw.dayOffset - TODAY_DAY_OFFSET
      if (raw.deliverable) related.push({ type: "deliverable", label: `Deliverable · ${raw.deliverable}`, href: customer?.engagementId ? `/admin/clients/${customer.engagementId}` : "/admin/clients" })
      return {
        ...base,
        type: "deadline",
        payload: {
          deliverable: raw.deliverable ?? base.title,
          daysRemaining,
          preparation: prep,
        },
      }
    }
    case "reminder":
      return {
        ...base,
        type: "reminder",
        payload: {
          actionLabel: raw.reminderAction ?? raw.title,
          relatedTone: raw.reminderTone ?? "info",
        },
      }
  }
}

const EVENTS: CalendarEvent[] = RAW.map(resolve).sort((a, b) => {
  if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
  return a.startMin - b.startMin
})

/* ── Public API (mock tRPC procedures) ───────────────────────────────────── */

function matchQuery(row: CalendarEvent, q: CalendarQuery): boolean {
  if (q.types?.length && !q.types.includes(row.type)) return false
  if (q.search?.trim()) {
    const s = q.search.toLowerCase()
    const blob = `${row.title} ${row.notes} ${row.customer?.name ?? ""} ${row.location} ${row.attendees.map(a => a.name).join(" ")}`.toLowerCase()
    if (!blob.includes(s)) return false
  }
  if (typeof q.weekOffset === "number") {
    const lo = q.weekOffset * 7
    const hi = lo + 7
    if (row.dayOffset < lo || row.dayOffset >= hi) return false
  }
  return true
}

export const mockCalendar = {
  list(q: CalendarQuery = {}): CalendarEvent[] {
    return EVENTS.filter(r => matchQuery(r, q))
  },

  getById(id: string): CalendarEvent | null {
    return EVENTS.find(r => r.id === id) ?? null
  },

  /** Events on a specific day expressed as offset from WEEK_START. */
  eventsForDay(dayOffset: number): CalendarEvent[] {
    return EVENTS.filter(r => r.dayOffset === dayOffset)
  },

  /** All 7 days of a week starting at `weekStartOffset` (multiple of 7 from anchor). */
  eventsForWeek(weekStartOffset: number): CalendarEvent[] {
    const hi = weekStartOffset + 7
    return EVENTS.filter(r => r.dayOffset >= weekStartOffset && r.dayOffset < hi)
  },

  stats(rows: CalendarEvent[]): CalendarStats {
    const weekRows = rows.filter(r => r.dayOffset >= 0 && r.dayOffset < 7)
    const byType = { booking: 0, internal: 0, personal: 0, deadline: 0, reminder: 0 } as Record<CalendarEventType, number>
    for (const r of rows) byType[r.type]++
    const meetingHours = weekRows
      .filter(r => r.type === "booking" && !r.allDay)
      .reduce((s, r) => s + r.durationMin / 60, 0)
    const workdayHours = 5 * 8 /* Mon–Fri × 8h */
    const free = Math.max(0, workdayHours - meetingHours)
    const upcomingDeadlines = rows
      .filter(r => r.type === "deadline" && r.dayOffset >= TODAY_DAY_OFFSET)
      .sort((a, b) => a.dayOffset - b.dayOffset)
    const next = upcomingDeadlines[0]
    return {
      total: rows.length,
      byType,
      bookingsThisWeek: weekRows.filter(r => r.type === "booking").length,
      meetingHoursThisWeek: Math.round(meetingHours * 10) / 10,
      freeHoursThisWeek: Math.round(free * 10) / 10,
      nextDeadline: next
        ? { title: next.title, daysRemaining: (next as DeadlineEvent).payload.daysRemaining }
        : null,
    }
  },

  /** Resolve a weekOffset → friendly week label. */
  weekLabel(weekOffset: number): { title: string; range: string; monthYear: string; weekStartOffset: number; weekStartDate: string } {
    const startOff = weekOffset * 7
    const endOff = startOff + 6
    const start = dateForOffset(startOff)
    const end = dateForOffset(endOff)
    const sameMonth = start.getMonth() === end.getMonth()
    const monthYear = `${MONTH_NAMES_LONG[start.getMonth()]} ${start.getFullYear()}`
    const range = sameMonth
      ? `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}`
      : `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getDate()}`
    return {
      title: monthYear,
      range,
      monthYear,
      weekStartOffset: startOff,
      weekStartDate: dateForOffset(startOff).toISOString(),
    }
  },

  /** Day metadata for grid headers — pure, ISO-free. */
  dayMeta(dayOffset: number): { dayShort: string; dayFull: string; dateNum: number; dateLabel: string; isToday: boolean; isWeekend: boolean } {
    const d = dateForOffset(dayOffset)
    const idx = ((dayOffset % 7) + 7) % 7
    return {
      dayShort: DAY_NAMES_SHORT[idx],
      dayFull: DAY_NAMES_FULL[idx],
      dateNum: d.getDate(),
      dateLabel: dateLabelFor(dayOffset),
      isToday: dayOffset === TODAY_DAY_OFFSET,
      isWeekend: idx >= 5,
    }
  },

  /** Build mini-month grid cells for the month containing weekOffset's start. */
  monthGrid(weekOffset: number): { monthLabel: string; cells: Array<{ dayOffset: number; dateNum: number; inMonth: boolean; isToday: boolean; events: number }> } {
    const startOff = weekOffset * 7
    const anchor = dateForOffset(startOff)
    const y = anchor.getFullYear()
    const m = anchor.getMonth()
    const firstOfMonth = new Date(y, m, 1)
    const lastOfMonth = new Date(y, m + 1, 0)
    /* Monday-start: weekday index 0=Mon, 6=Sun */
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7
    const totalDays = lastOfMonth.getDate()
    /* Leading days from previous month */
    const cells: Array<{ dayOffset: number; dateNum: number; inMonth: boolean; isToday: boolean; events: number }> = []
    /* Determine offset of "first day shown" relative to WEEK_START. */
    const firstShown = new Date(y, m, 1 - firstWeekday)
    const msPerDay = 24 * 60 * 60 * 1000
    const baseOffset = Math.round((firstShown.getTime() - WEEK_START_DATE.getTime()) / msPerDay)
    const totalCells = Math.ceil((firstWeekday + totalDays) / 7) * 7
    for (let i = 0; i < totalCells; i++) {
      const dayOffset = baseOffset + i
      const d = dateForOffset(dayOffset)
      const inMonth = d.getMonth() === m
      const isToday = dayOffset === TODAY_DAY_OFFSET
      const events = EVENTS.filter(e => e.dayOffset === dayOffset).length
      cells.push({ dayOffset, dateNum: d.getDate(), inMonth, isToday, events })
    }
    return { monthLabel: `${MONTH_NAMES_LONG[m]} ${y}`, cells }
  },

  weekStartOffsetForWeek(weekOffset: number): number {
    return weekOffset * 7
  },
}
