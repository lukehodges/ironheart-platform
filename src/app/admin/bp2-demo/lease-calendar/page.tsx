"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  Clock,
  CalendarDays,
  TrendingUp,
  Info,
  ChevronRight,
  Building2,
  Download,
  SlidersHorizontal,
  CalendarRange,
  Zap,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
  | "Rent Review"
  | "Break Clause"
  | "Lease Expiry"
  | "Lease Renewal"
  | "Service Charge Review"

type ActionStatus =
  | "In Negotiation"
  | "Awaiting Response"
  | "Notified"
  | "No Action Yet"

type UrgencyTier = "critical" | "warning" | "upcoming" | "planned"

interface LeaseEvent {
  id: string
  property: string
  location: string
  tenant: string
  eventType: EventType
  date: string
  daysRemaining: number
  currentRent: string
  status: ActionStatus
  tier: UrgencyTier
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const events: LeaseEvent[] = [
  { id: "c1", property: "Meridian House",                 location: "Neath",       tenant: "Evans & Lloyd Solicitors", eventType: "Rent Review",           date: "12 Mar 2026", daysRemaining: 8,   currentRent: "£18,500 pa", status: "In Negotiation",    tier: "critical" },
  { id: "c2", property: "Parc Tawe Unit 8",               location: "Swansea",     tenant: "Sports Direct",            eventType: "Break Clause",          date: "25 Mar 2026", daysRemaining: 21,  currentRent: "£42,000 pa", status: "Awaiting Response", tier: "critical" },
  { id: "c3", property: "Bridgend Business Centre",       location: "Bridgend",    tenant: "Principality BS",          eventType: "Lease Expiry",          date: "28 Mar 2026", daysRemaining: 24,  currentRent: "£14,200 pa", status: "In Negotiation",    tier: "critical" },
  { id: "c4", property: "Newport Trade Park Unit 3",      location: "Newport",     tenant: "Wickes PLC",               eventType: "Rent Review",           date: "1 Apr 2026",  daysRemaining: 28,  currentRent: "£31,000 pa", status: "Notified",          tier: "critical" },
  { id: "w1", property: "Kingsway Office Suite",          location: "Swansea",     tenant: "HSBC Bank",                eventType: "Rent Review",           date: "15 Apr 2026", daysRemaining: 42,  currentRent: "£28,500 pa", status: "No Action Yet",     tier: "warning" },
  { id: "w2", property: "Cross Hands Food Park Unit 4",   location: "Cross Hands", tenant: "Farmfoods Ltd",            eventType: "Break Clause",          date: "29 Apr 2026", daysRemaining: 56,  currentRent: "£24,000 pa", status: "Notified",          tier: "warning" },
  { id: "w3", property: "Wind Street",                    location: "Swansea",     tenant: "Revolution Bars",          eventType: "Lease Renewal",         date: "12 May 2026", daysRemaining: 69,  currentRent: "£38,500 pa", status: "In Negotiation",    tier: "warning" },
  { id: "w4", property: "Fabian Way Unit 12",             location: "Swansea",     tenant: "Howdens Joinery",          eventType: "Rent Review",           date: "24 May 2026", daysRemaining: 81,  currentRent: "£19,000 pa", status: "No Action Yet",     tier: "warning" },
  { id: "w5", property: "Sophia House",                   location: "Cardiff",     tenant: "Deloitte LLP",             eventType: "Service Charge Review", date: "31 May 2026", daysRemaining: 88,  currentRent: "£12,800 pa", status: "Awaiting Response", tier: "warning" },
  { id: "u1", property: "Baglan Energy Park Unit 7",      location: "Port Talbot", tenant: "QinetiQ Ltd",              eventType: "Lease Expiry",          date: "28 Jun 2026", daysRemaining: 116, currentRent: "£67,000 pa", status: "No Action Yet",     tier: "upcoming" },
  { id: "u2", property: "Cwmdu Estate",                   location: "Swansea",     tenant: "Royal Mail",               eventType: "Rent Review",           date: "15 Jul 2026", daysRemaining: 133, currentRent: "£29,500 pa", status: "No Action Yet",     tier: "upcoming" },
  { id: "u3", property: "Llanelli Retail Unit 3",         location: "Llanelli",    tenant: "Poundland Ltd",            eventType: "Lease Renewal",         date: "1 Aug 2026",  daysRemaining: 150, currentRent: "£22,000 pa", status: "No Action Yet",     tier: "upcoming" },
  { id: "u4", property: "Pontardawe Offices",             location: "Pontardawe",  tenant: "Welsh Water",              eventType: "Break Clause",          date: "19 Aug 2026", daysRemaining: 168, currentRent: "£16,500 pa", status: "No Action Yet",     tier: "upcoming" },
  { id: "p1", property: "Swansea Enterprise Park Block B",location: "Swansea",     tenant: "BT Group",                 eventType: "Rent Review",           date: "24 Sep 2026", daysRemaining: 204, currentRent: "£54,000 pa", status: "No Action Yet",     tier: "planned" },
  { id: "p2", property: "Celtic Business Park",           location: "Port Talbot", tenant: "Tata Steel",               eventType: "Lease Expiry",          date: "1 Jan 2027",  daysRemaining: 303, currentRent: "£88,000 pa", status: "No Action Yet",     tier: "planned" },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const tierConfig = {
  critical: {
    label: "Critical",
    sublabel: "Action required immediately",
    borderColor: "border-l-red-500",
    headerBg: "bg-red-500/5",
    headerBorder: "border-red-500/15",
    labelColor: "text-red-700 dark:text-red-400",
    countBg: "bg-red-500/10 border-red-500/20",
    countText: "text-red-700 dark:text-red-400",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  warning: {
    label: "Warning",
    sublabel: "Action required within 90 days",
    borderColor: "border-l-amber-500",
    headerBg: "bg-amber-500/5",
    headerBorder: "border-amber-500/15",
    labelColor: "text-amber-700 dark:text-amber-400",
    countBg: "bg-amber-500/10 border-amber-500/20",
    countText: "text-amber-700 dark:text-amber-400",
    icon: <Clock className="w-4 h-4" />,
  },
  upcoming: {
    label: "Upcoming",
    sublabel: "Plan ahead - 91 to 180 days",
    borderColor: "border-l-border",
    headerBg: "bg-muted/40",
    headerBorder: "border-border",
    labelColor: "text-foreground/70",
    countBg: "bg-muted border-border",
    countText: "text-muted-foreground",
    icon: <CalendarDays className="w-4 h-4" />,
  },
  planned: {
    label: "Planned",
    sublabel: "On the horizon - 181+ days",
    borderColor: "border-l-border",
    headerBg: "bg-muted/30",
    headerBorder: "border-border",
    labelColor: "text-muted-foreground",
    countBg: "bg-muted border-border",
    countText: "text-muted-foreground",
    icon: <TrendingUp className="w-4 h-4" />,
  },
}

const eventTypeConfig: Record<EventType, { color: string; bg: string; tooltip: string }> = {
  "Rent Review":           { color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", tooltip: "A point at which the landlord can formally review and increase the passing rent, typically every 5 years under an upward-only clause." },
  "Break Clause":          { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", tooltip: "A contractual option allowing the tenant or landlord to terminate the lease early at a specified date. Missing the notice window forfeits this right permanently." },
  "Lease Expiry":          { color: "text-red-700 dark:text-red-400",       bg: "bg-red-500/10 border-red-500/20",       tooltip: "The natural end date of the lease. Under the Landlord & Tenant Act 1954, commercial tenants may have security of tenure - but only if proper procedures are followed." },
  "Lease Renewal":         { color: "text-sky-700 dark:text-sky-400",       bg: "bg-sky-500/10 border-sky-500/20",       tooltip: "Formal negotiation to agree new lease terms. Typically begins 12–18 months before expiry to allow sufficient time for heads of terms and legals." },
  "Service Charge Review": { color: "text-teal-700 dark:text-teal-400",     bg: "bg-teal-500/10 border-teal-500/20",     tooltip: "Annual or periodic reconciliation of service charge budgets versus actual expenditure. Tenants may challenge items under the RICS Service Charge Code." },
}

const statusConfig: Record<ActionStatus, { color: string; bg: string; border: string }> = {
  "In Negotiation":    { color: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  "Awaiting Response": { color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  "Notified":          { color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  "No Action Yet":     { color: "text-muted-foreground",                 bg: "bg-muted",          border: "border-border" },
}

// ─── Derived data ─────────────────────────────────────────────────────────────

const criticalEvents    = events.filter((e) => e.tier === "critical")
const warningEvents     = events.filter((e) => e.tier === "warning")
const mostUrgent        = events.reduce((a, b) => b.daysRemaining < a.daysRemaining ? b : a)
const within90          = events.filter((e) => e.daysRemaining <= 90)
const thisYear          = events.filter((e) => e.daysRemaining <= 365)
const noActionCritical  = criticalEvents.filter((e) => e.status === "No Action Yet")
const uniqueProperties  = new Set(events.map((e) => e.property)).size

// ─── Monthly calendar ─────────────────────────────────────────────────────────

const MONTH_PARSE: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
}

const MONTHS = [
  { key: "2026-03", short: "Mar", year: "2026",  isCurrent: true  },
  { key: "2026-04", short: "Apr", year: null,    isCurrent: false },
  { key: "2026-05", short: "May", year: null,    isCurrent: false },
  { key: "2026-06", short: "Jun", year: null,    isCurrent: false },
  { key: "2026-07", short: "Jul", year: null,    isCurrent: false },
  { key: "2026-08", short: "Aug", year: null,    isCurrent: false },
  { key: "2026-09", short: "Sep", year: null,    isCurrent: false },
  { key: "2026-10", short: "Oct", year: null,    isCurrent: false },
  { key: "2026-11", short: "Nov", year: null,    isCurrent: false },
  { key: "2026-12", short: "Dec", year: null,    isCurrent: false },
  { key: "2027-01", short: "Jan", year: "2027",  isCurrent: false },
] as const

function buildEventsByMonth() {
  const map: Record<string, LeaseEvent[]> = Object.fromEntries(MONTHS.map((m) => [m.key, []]))
  for (const e of events) {
    const [, mon, yr] = e.date.split(" ")
    const key = `${yr}-${MONTH_PARSE[mon]}`
    map[key]?.push(e)
  }
  return map
}

const eventsByMonth = buildEventsByMonth()

const TIER_DOT: Record<UrgencyTier, string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-500",
  upcoming: "bg-foreground/30",
  planned:  "bg-foreground/15",
}

const TIER_PILL: Record<UrgencyTier, string> = {
  critical: "bg-red-500/8 border-red-500/20 text-red-700 dark:text-red-400",
  warning:  "bg-amber-500/8 border-amber-500/20 text-amber-700 dark:text-amber-400",
  upcoming: "bg-muted/70 border-border text-muted-foreground",
  planned:  "bg-muted/40 border-border text-muted-foreground",
}

const TIER_COUNT: Record<UrgencyTier, string> = {
  critical: "text-red-600 dark:text-red-400",
  warning:  "text-amber-600 dark:text-amber-400",
  upcoming: "text-muted-foreground",
  planned:  "text-muted-foreground",
}

function MonthlyCalendar() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <CalendarRange className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Portfolio Calendar</span>
          <span className="text-xs text-muted-foreground">Mar 2026 - Jan 2027</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />Critical</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground/25 shrink-0" />Upcoming / Planned</span>
        </div>
      </div>

      {/* Month columns */}
      <div className="flex divide-x divide-border overflow-x-auto">
        {MONTHS.map((month) => {
          const evs = eventsByMonth[month.key]
          const sorted = [...evs].sort((a, b) => {
            const o = { critical: 0, warning: 1, upcoming: 2, planned: 3 }
            return o[a.tier] - o[b.tier]
          })
          const topTier = sorted[0]?.tier
          const colBg = topTier === "critical"
            ? "bg-red-500/[0.025]"
            : topTier === "warning"
            ? "bg-amber-500/[0.025]"
            : ""

          return (
            <div key={month.key} className={`flex-1 min-w-[90px] flex flex-col ${colBg}`}>
              {/* Month header */}
              <div className={`px-2.5 py-2.5 border-b border-border flex items-start justify-between gap-1 ${month.isCurrent ? "bg-primary/[0.04]" : ""}`}>
                <div>
                  <div className={`text-xs font-semibold leading-none ${month.isCurrent ? "text-primary" : "text-foreground/80"}`}>
                    {month.short}
                    {month.year && <span className="text-[10px] font-normal text-muted-foreground ml-1">{month.year}</span>}
                  </div>
                  {month.isCurrent && (
                    <div className="text-[9px] text-primary font-medium mt-1 flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                      Today
                    </div>
                  )}
                </div>
                {evs.length > 0 && topTier && (
                  <span className={`text-xs font-bold tabular-nums leading-none mt-0.5 ${TIER_COUNT[topTier]}`}>
                    {evs.length}
                  </span>
                )}
              </div>

              {/* Event pills */}
              <div className="p-1.5 flex flex-col gap-1 flex-1 min-h-[130px]">
                {sorted.map((event) => (
                  <TooltipProvider key={event.id} delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1 px-1.5 py-1 rounded border text-[10px] leading-tight cursor-default ${TIER_PILL[event.tier]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TIER_DOT[event.tier]}`} />
                          <span className="truncate min-w-0">{event.property}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                        <p className="font-semibold">{event.property}</p>
                        <p className="text-muted-foreground">{event.eventType} · {event.date}</p>
                        <p className="text-muted-foreground">{event.tenant}</p>
                        <p className={`font-medium mt-0.5 ${TIER_COUNT[event.tier]}`}>{event.daysRemaining} days remaining</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {evs.length === 0 && (
                  <div className="flex-1 flex items-start justify-center pt-4">
                    <span className="text-[10px] text-muted-foreground/25">-</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EventTypeBadge({ type }: { type: EventType }) {
  const cfg = eventTypeConfig[type]
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium tracking-wide cursor-default ${cfg.color} ${cfg.bg}`}>
            {type}<Info className="w-2.5 h-2.5 opacity-60" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          <p className="font-semibold mb-0.5">{type}</p>
          <p className="text-muted-foreground">{cfg.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function StatusPill({ status, tier }: { status: ActionStatus; tier: UrgencyTier }) {
  const cfg = statusConfig[status]
  if (status === "No Action Yet" && tier === "critical") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold tracking-wide text-red-700 dark:text-red-200 bg-red-500/15 border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        No Action Yet
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-medium ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {status}
    </span>
  )
}

function DaysRemaining({ days, tier }: { days: number; tier: UrgencyTier }) {
  const colorMap = {
    critical: "text-red-600 dark:text-red-400",
    warning:  "text-amber-600 dark:text-amber-400",
    upcoming: "text-foreground/70",
    planned:  "text-muted-foreground",
  }
  return (
    <div className="flex flex-col items-end">
      <span className={`font-mono font-bold tabular-nums leading-none ${colorMap[tier]} ${days <= 14 ? "text-3xl" : days <= 30 ? "text-2xl" : "text-xl"}`}>
        {days}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-medium">days</span>
    </div>
  )
}

function EventRow({ event }: { event: LeaseEvent }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors group cursor-default">
      <div className="w-14 shrink-0 flex justify-end">
        <DaysRemaining days={event.daysRemaining} tier={event.tier} />
      </div>
      <div className="w-px h-10 bg-border shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground leading-snug">{event.property}</span>
          {event.location && <span className="text-xs text-muted-foreground">{event.location}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{event.tenant}</span>
        </div>
      </div>
      <div className="w-44 shrink-0 hidden sm:block"><EventTypeBadge type={event.eventType} /></div>
      <div className="w-24 shrink-0 hidden md:block text-right">
        <span className="text-xs text-foreground/70 font-medium tabular-nums">{event.date}</span>
      </div>
      <div className="w-24 shrink-0 hidden lg:block text-right">
        <span className="text-xs font-mono text-foreground/70">{event.currentRent}</span>
      </div>
      <div className="w-36 shrink-0"><StatusPill status={event.status} tier={event.tier} /></div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

function TierSection({ tier }: { tier: UrgencyTier }) {
  const cfg = tierConfig[tier]
  const sectionEvents = events.filter((e) => e.tier === tier)
  if (sectionEvents.length === 0) return null
  return (
    <section className={`rounded-lg border border-border overflow-hidden border-l-4 ${cfg.borderColor}`}>
      <div className={`flex items-center justify-between px-5 py-3 border-b ${cfg.headerBg} ${cfg.headerBorder}`}>
        <div className="flex items-center gap-2.5">
          <span className={cfg.labelColor}>{cfg.icon}</span>
          <span className={`text-sm font-semibold tracking-wide ${cfg.labelColor}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{cfg.sublabel}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border tabular-nums ${cfg.countBg} ${cfg.countText}`}>
          {sectionEvents.length} event{sectionEvents.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border bg-muted/20">
        <div className="w-14 shrink-0 text-right">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Days</span>
        </div>
        <div className="w-px shrink-0" />
        <div className="flex-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Property / Tenant</span>
        </div>
        <div className="w-44 shrink-0 hidden sm:block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Event Type</span>
        </div>
        <div className="w-24 shrink-0 hidden md:block text-right">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Date</span>
        </div>
        <div className="w-24 shrink-0 hidden lg:block text-right">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Rent</span>
        </div>
        <div className="w-36 shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Status</span>
        </div>
        <div className="w-3.5 shrink-0" />
      </div>
      <div className="divide-y divide-border">
        {sectionEvents.map((event) => <EventRow key={event.id} event={event} />)}
      </div>
    </section>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LeaseCalendarPage() {
  return (
    <div className="-m-6">
      <div className="px-6 py-8 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <span>BP2 Property</span>
              <ChevronRight className="w-3 h-3" />
              <span>Lease Advisory</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">Key Dates</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Key Dates Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {events.length} active events across {uniqueProperties} properties
              <span className="mx-2 text-border">·</span>
              {criticalEvents.length} requiring immediate action
              <span className="mx-2 text-border">·</span>
              as at 4 March 2026
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Critical</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-2 leading-none">{criticalEvents.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
          </div>

          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Within 90 days</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground mt-2 leading-none">{within90.length}</p>
            <p className="text-xs text-muted-foreground mt-1">incl. {warningEvents.length} in warning tier</p>
          </div>

          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-muted">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">This year</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground mt-2 leading-none">{thisYear.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {uniqueProperties} managed properties</p>
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-red-500/10">
                <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Next due</span>
            </div>
            <p className="text-sm font-semibold text-foreground mt-2 leading-tight">{mostUrgent.property}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 tabular-nums leading-none">{mostUrgent.daysRemaining}</span>
              <span className="text-xs text-muted-foreground">days · {mostUrgent.eventType}</span>
            </div>
          </div>
        </div>

        {/* ── Portfolio calendar ──────────────────────────────────────────── */}
        <MonthlyCalendar />

        {/* ── Critical no-action alert ─────────────────────────────────────── */}
        {noActionCritical.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {noActionCritical.length} critical event{noActionCritical.length !== 1 ? "s" : ""} with no action taken
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                {noActionCritical.map((e) => e.property).join(" · ")} - immediate attention required
              </p>
            </div>
          </div>
        )}

        {/* ── Event type legend ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold shrink-0">Event types</span>
          {(["Rent Review", "Break Clause", "Lease Expiry", "Lease Renewal", "Service Charge Review"] as EventType[]).map((type) => {
            const cfg = eventTypeConfig[type]
            return (
              <TooltipProvider key={type} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium cursor-default ${cfg.color} ${cfg.bg}`}>
                      {type}<Info className="w-2.5 h-2.5 opacity-50" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
                    <p className="font-semibold mb-0.5">{type}</p>
                    <p className="text-muted-foreground">{cfg.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* ── Event detail sections ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <TierSection tier="critical" />
          <TierSection tier="warning" />
          <TierSection tier="upcoming" />
          <TierSection tier="planned" />
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="border-t border-border pt-6 flex flex-wrap items-start justify-between gap-4">
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            All dates are those recorded in executed lease documents. This calendar does not constitute legal advice.
            Notice periods under the Landlord &amp; Tenant Act 1954 and PACT procedures vary by lease type - consult your solicitor before serving any formal notice.
          </p>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
            BP2 Property · South Wales · Lease Advisory
          </span>
        </div>

      </div>
    </div>
  )
}
