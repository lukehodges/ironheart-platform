"use client"

import Link from "next/link"
import { ChevronRight, CalendarDays, AlertCircle, Clock } from "lucide-react"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const YEARS = Array.from({ length: 31 }, (_, i) => 2026 + i)

const AXIS_YEARS = [2026, 2027, 2028, 2030, 2035, 2040, 2045, 2050, 2055, 2056]

type EventType = "annual" | "condition" | "hmmp" | "ne-audit"

interface TimelineEvent {
  year: number
  type: EventType
}

interface TimelineSite {
  ref: string
  name: string
  bgsRef: string
  creditType: string
  agreementFrom: number
  events: TimelineEvent[]
}

function buildSiteEvents(
  annualYears: number[],
  conditionYears: number[],
  hmmpYears: number[],
  neAuditYears: number[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  annualYears.forEach((y) => events.push({ year: y, type: "annual" }))
  conditionYears.forEach((y) => events.push({ year: y, type: "condition" }))
  hmmpYears.forEach((y) => events.push({ year: y, type: "hmmp" }))
  neAuditYears.forEach((y) => events.push({ year: y, type: "ne-audit" }))
  return events
}

const SITES: TimelineSite[] = [
  {
    ref: "S-0001",
    name: "Whiteley Farm",
    bgsRef: "BGS-SOL-2024-0847",
    creditType: "Nitrogen Credits",
    agreementFrom: 2026,
    events: buildSiteEvents(
      YEARS.filter((y) => y >= 2026 && y <= 2056),
      [2028, 2031, 2036, 2041, 2046, 2051, 2056],
      [2031, 2036, 2041, 2046, 2051, 2056],
      [2036, 2046, 2056],
    ),
  },
  {
    ref: "S-0002",
    name: "Hamble Valley",
    bgsRef: "BGS-SOL-2023-0412",
    creditType: "BNG Credits",
    agreementFrom: 2024,
    events: buildSiteEvents(
      YEARS.filter((y) => y >= 2026 && y <= 2054),
      [2026, 2029, 2034, 2039, 2044, 2049, 2054],
      [2029, 2039, 2049],
      [2034, 2044, 2054],
    ),
  },
  {
    ref: "S-0003",
    name: "Test Valley Grassland",
    bgsRef: "BGS-TEV-2025-0201",
    creditType: "Nitrogen Credits",
    agreementFrom: 2025,
    events: buildSiteEvents(
      YEARS.filter((y) => y >= 2026 && y <= 2055),
      [2027, 2030, 2035, 2040, 2045, 2050, 2055],
      [],
      [2035, 2045, 2055],
    ),
  },
]

const EVENT_STYLES: Record<EventType, { dot: string; label: string; size: string; zIndex: string }> = {
  annual:    { dot: "bg-emerald-500",  label: "Annual Survey",        size: "w-2.5 h-2.5", zIndex: "z-0" },
  condition: { dot: "bg-blue-500",     label: "Condition Assessment", size: "w-3.5 h-3.5", zIndex: "z-10" },
  hmmp:      { dot: "bg-amber-500",    label: "HMMP Review",          size: "w-3 h-3",     zIndex: "z-20" },
  "ne-audit":{ dot: "bg-red-500",      label: "NE Audit",             size: "w-4 h-4",     zIndex: "z-30" },
}

// Priority for rendering stacking (higher = on top)
const EVENT_PRIORITY: Record<EventType, number> = {
  annual: 0, condition: 1, hmmp: 2, "ne-audit": 3,
}

// Upcoming obligations (static data, sorted by date)
const UPCOMING_OBLIGATIONS = [
  { date: "Dec 2026", obligation: "Annual Survey",        site: "Whiteley Farm" },
  { date: "Dec 2026", obligation: "Annual Survey",        site: "Test Valley Grassland" },
  { date: "Mar 2027", obligation: "Condition Assessment", site: "Test Valley Grassland" },
  { date: "Dec 2027", obligation: "Annual Survey",        site: "Whiteley Farm" },
  { date: "Jun 2028", obligation: "Condition Assessment", site: "Whiteley Farm" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Convert a year to a 0-based column index (col 0 = 2026, col 30 = 2056)
function yearToCol(year: number) {
  return year - 2026
}

// For a given year-column, get the dominant event type to display
function getDominantEvent(events: TimelineEvent[], year: number): EventType | null {
  const yearEvents = events.filter((e) => e.year === year)
  if (yearEvents.length === 0) return null
  yearEvents.sort((a, b) => EVENT_PRIORITY[b.type] - EVENT_PRIORITY[a.type])
  return yearEvents[0].type
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ value, label, sub, icon, color }: {
  value: string
  label: string
  sub?: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 flex flex-col gap-2 ${color ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground leading-none">{value}</span>
        {sub && <span className="text-sm text-muted-foreground mb-0.5">{sub}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Timeline30YrPage() {
  // The total columns span 2026-2056 = 31 years
  // We render as a CSS grid with 31 columns

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/brokerage-mockups/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/admin/brokerage-mockups/compliance" className="hover:text-foreground transition-colors">
          Compliance
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">30-Year Timeline</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Ironheart Brokerage · Compliance
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">30-Year Compliance Timeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Habitat management obligations across all active sites
          </p>
        </div>
        <Link
          href="/admin/brokerage-mockups/compliance"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          Back to Compliance
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Active BNG sites"
          value="3"
          sub="with 30-year obligations"
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <SummaryCard
          label="Next audit"
          value="Dec 2026"
          sub="first annual survey"
          icon={<Clock className="w-5 h-5" />}
        />
        <SummaryCard
          label="Final obligation"
          value="2056"
          sub="30 years from earliest agreement"
          icon={<AlertCircle className="w-5 h-5" />}
        />
      </div>

      {/* Main timeline card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Timeline Overview · 2026–2056</h2>
          <span className="text-xs text-muted-foreground">Scroll right to see all years</span>
        </div>

        <div className="overflow-x-auto">
          {/* Min width ensures all 31 columns are visible on scroll */}
          <div className="min-w-[1100px] px-5 py-4">
            {/* Year axis */}
            <div className="relative mb-4">
              {/* Grid column structure: label col + 31 year cols */}
              <div className="flex">
                {/* Site label column spacer */}
                <div className="w-48 shrink-0" />
                {/* Year columns */}
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(31, minmax(0, 1fr))` }}>
                  {YEARS.map((year) => {
                    const isAxisYear = AXIS_YEARS.includes(year)
                    const isToday = year === 2026
                    return (
                      <div
                        key={year}
                        className="relative flex flex-col items-center"
                      >
                        {isToday && (
                          <span className="absolute -top-5 text-[10px] font-bold text-emerald-600 whitespace-nowrap">
                            Today
                          </span>
                        )}
                        {isAxisYear && (
                          <span className={`text-[10px] font-medium whitespace-nowrap ${isToday ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {year}
                          </span>
                        )}
                        {/* Tick mark */}
                        <div className={`mt-0.5 ${isAxisYear ? "h-2 w-px bg-border" : "h-1 w-px bg-border/40"}`} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Today vertical line (runs down through all rows) — done per row below */}
            </div>

            {/* Site rows */}
            <div className="space-y-3">
              {SITES.map((site) => (
                <div key={site.ref} className="flex items-center">
                  {/* Site label */}
                  <div className="w-48 shrink-0 pr-4">
                    <div className="text-sm font-medium text-foreground leading-snug">{site.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{site.bgsRef}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{site.creditType}</div>
                  </div>

                  {/* Year cells */}
                  <div
                    className="flex-1 grid relative"
                    style={{ gridTemplateColumns: `repeat(31, minmax(0, 1fr))` }}
                  >
                    {/* Background track */}
                    <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-muted/40 h-px top-1/2 -translate-y-1/2" />

                    {YEARS.map((year) => {
                      const col = yearToCol(year)
                      const dominant = getDominantEvent(site.events, year)
                      const isToday = year === 2026

                      return (
                        <div
                          key={year}
                          className="relative flex items-center justify-center h-8"
                        >
                          {/* Today marker line */}
                          {isToday && (
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-emerald-500/50 z-40" />
                          )}
                          {dominant && (() => {
                            const style = EVENT_STYLES[dominant]
                            return (
                              <div
                                title={`${year}: ${EVENT_STYLES[dominant].label}`}
                                className={`rounded-full border-2 border-card shadow-sm ${style.dot} ${style.size} ${style.zIndex} relative cursor-default`}
                              />
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* X-axis baseline */}
            <div className="flex mt-3">
              <div className="w-48 shrink-0" />
              <div className="flex-1 border-t border-border/40" />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-4 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-2">
          {(Object.entries(EVENT_STYLES) as [EventType, typeof EVENT_STYLES[EventType]][]).map(([key, style]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`rounded-full ${style.dot} ${style.size} shrink-0`} />
              <span className="text-xs text-muted-foreground">{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming obligations table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Next 5 Obligations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sorted by due date across all sites</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Obligation</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {UPCOMING_OBLIGATIONS.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                <td className="px-4 py-3.5">
                  <span className="font-medium text-foreground">{row.date}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-foreground">{row.obligation}</span>
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">{row.site}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
