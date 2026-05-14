"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Leaf,
  TreeDeciduous,
  Search,
  Zap,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { sites, complianceItems } from "../../_mock-data"
import type { Site, ComplianceItem } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ObligationType =
  | "Annual Monitoring"
  | "Condition Assessment"
  | "HMMP Review"
  | "NE Audit"
  | "Management Inspection"

interface SchedulerAssessor {
  id: string
  name: string
  initials: string
  specialism: string[]
  region: string
  rate: number
  avatarColor: string
}

interface SiteObligation {
  site: Site
  nextDue: string
  status: "Overdue" | "Due Soon" | "On Track" | "Not Started"
  overdueItems: ComplianceItem[]
  upcomingItems: ComplianceItem[]
}

interface SuggestedSlot {
  label: string
  date: string
  assessor: SchedulerAssessor
  reason: string
  tag: "best" | "earliest" | "cost"
}

interface BulkScheduleRow {
  date: string
  site: Site
  obligation: string
  assessor: SchedulerAssessor
  status: "Ready to book" | "Confirmed"
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const ASSESSORS: SchedulerAssessor[] = [
  {
    id: "A1",
    name: "Tom Jenkins",
    initials: "TJ",
    specialism: ["Ecology", "BNG Metric", "Nutrient"],
    region: "Hampshire",
    rate: 450,
    avatarColor: "bg-emerald-500",
  },
  {
    id: "A2",
    name: "Sarah Croft",
    initials: "SC",
    specialism: ["Ecology", "BNG Metric"],
    region: "Hampshire",
    rate: 500,
    avatarColor: "bg-blue-500",
  },
  {
    id: "A3",
    name: "Dr. Emma Walsh",
    initials: "EW",
    specialism: ["Ecology", "BNG Metric", "Protected Species"],
    region: "Wessex",
    rate: 600,
    avatarColor: "bg-amber-500",
  },
  {
    id: "A4",
    name: "James Cooper",
    initials: "JC",
    specialism: ["Nutrient", "Hydrology"],
    region: "Hampshire",
    rate: 400,
    avatarColor: "bg-violet-500",
  },
]

// Generate availability: ~40-50 available dates over next 3 months (skip weekends + random gaps)
function generateAvailability(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  const today = new Date(2026, 2, 10) // March 10, 2026

  for (const a of ASSESSORS) {
    const dates = new Set<string>()
    const d = new Date(today)
    for (let i = 0; i < 90; i++) {
      const day = d.getDay()
      // skip weekends
      if (day !== 0 && day !== 6) {
        // ~60% chance of being available
        const hash = (a.id.charCodeAt(1) * 31 + i * 17) % 100
        if (hash < 60) {
          dates.add(d.toISOString().slice(0, 10))
        }
      }
      d.setDate(d.getDate() + 1)
    }
    map.set(a.id, dates)
  }
  return map
}

const ASSESSOR_AVAILABILITY = generateAvailability()

const SITE_ACCESS_CONSTRAINTS: Record<string, string> = {
  "S-0001": "No access Mon-Tue. Harvest blackout Aug 15 - Sep 30.",
  "S-0002": "Flooding risk Nov-Feb. Access via farm track only.",
  "S-0003": "Livestock movements Wed AM. Confirm 48h in advance.",
  "S-0005": "No access during shooting season (Oct 1 - Feb 1).",
  "S-0006": "Remote site — allow full day. 4x4 required in winter.",
  "S-0008": "Active forestry operations Mon-Wed. Access Thu-Fri only.",
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const OBLIGATION_TYPES: ObligationType[] = [
  "Annual Monitoring",
  "Condition Assessment",
  "HMMP Review",
  "NE Audit",
  "Management Inspection",
]

// Survey windows: which months are valid
const SURVEY_WINDOWS: Record<string, { months: number[]; label: string }> = {
  BNG: { months: [3, 4, 5, 6, 7, 8], label: "BNG Habitat Surveys: Apr - Sep" },
  Nitrogen: { months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], label: "Nutrient Assessments: Any time" },
  "Winter Bird": { months: [10, 11, 0, 1], label: "Winter Bird Surveys: Nov - Feb" },
}

// Specialism required per obligation type per unit type
function requiredSpecialism(unitType: string): string {
  return unitType === "BNG" ? "Ecology" : "Nutrient"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function daysUntil(iso: string): number {
  const today = new Date(2026, 2, 10)
  const target = new Date(iso + "T00:00:00")
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getMonthDates(year: number, month: number): { date: string; day: number; dow: number }[] {
  const dates: { date: string; day: number; dow: number }[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    dates.push({
      date: d.toISOString().slice(0, 10),
      day: d.getDate(),
      dow: d.getDay(),
    })
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComplianceAutoSchedulerPage() {
  // State
  const [selectedSiteRef, setSelectedSiteRef] = useState<string | null>(null)
  const [obligationType, setObligationType] = useState<ObligationType>("Annual Monitoring")
  const [preferredAssessor, setPreferredAssessor] = useState<string>("auto")
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [searchStatus, setSearchStatus] = useState("")
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(2) // March = 2 (0-indexed)
  const [calendarYear] = useState(2026)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  // Bulk scheduling
  const [isBulkSearching, setIsBulkSearching] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkSchedule, setBulkSchedule] = useState<BulkScheduleRow[]>([])
  const [showBulkSchedule, setShowBulkSchedule] = useState(false)

  // Timeline
  const [timelineSiteRef, setTimelineSiteRef] = useState<string>("S-0001")

  // Computed: site obligations
  const siteObligations = useMemo<SiteObligation[]>(() => {
    return sites.map((site) => {
      const siteItems = complianceItems.filter(
        (c) => c.siteRef === site.ref && c.status !== "Completed"
      )
      const overdueItems = siteItems.filter((c) => c.status === "Overdue")
      const upcomingItems = siteItems.filter((c) => c.status !== "Overdue")

      // Determine next due date
      const allDates = siteItems.map((c) => c.dueDate).sort()
      const nextDue = allDates[0] ?? (site.enhancementStartDate ? addMonths(site.enhancementStartDate, 12) : "2027-01-01")

      let status: SiteObligation["status"]
      if (overdueItems.length > 0) status = "Overdue"
      else if (siteItems.length === 0 && site.status === "Under Assessment") status = "Not Started"
      else if (daysUntil(nextDue) <= 30) status = "Due Soon"
      else status = "On Track"

      return { site, nextDue, status, overdueItems, upcomingItems }
    })
  }, [])

  const selectedSite = useMemo(
    () => sites.find((s) => s.ref === selectedSiteRef) ?? null,
    [selectedSiteRef]
  )

  const surveyWindow = useMemo(() => {
    if (!selectedSite) return SURVEY_WINDOWS.Nitrogen
    return SURVEY_WINDOWS[selectedSite.unitType] ?? SURVEY_WINDOWS.Nitrogen
  }, [selectedSite])

  const specialism = useMemo(() => {
    if (!selectedSite) return "Nutrient"
    return requiredSpecialism(selectedSite.unitType)
  }, [selectedSite])

  // Calendar data for 3 months
  const calendarMonths = useMemo(() => {
    const months: { year: number; month: number; label: string; dates: ReturnType<typeof getMonthDates> }[] = []
    for (let i = 0; i < 3; i++) {
      const m = (calendarMonth + i) % 12
      const y = calendarYear + Math.floor((calendarMonth + i) / 12)
      months.push({
        year: y,
        month: m,
        label: getMonthLabel(y, m),
        dates: getMonthDates(y, m),
      })
    }
    return months
  }, [calendarMonth, calendarYear])

  // Date cell classification for calendar
  const getDateCellType = useCallback(
    (date: string, assessorId: string): "available" | "outside-window" | "unavailable" | "booked" => {
      const avail = ASSESSOR_AVAILABILITY.get(assessorId)
      const isAvailable = avail?.has(date) ?? false
      const dateObj = new Date(date + "T00:00:00")
      const month = dateObj.getMonth()
      const inWindow = surveyWindow.months.includes(month)

      // Check site access constraints (simple: block Mon-Tue for Whiteley etc.)
      const siteRef = selectedSiteRef
      let accessBlocked = false
      if (siteRef === "S-0001") {
        const dow = dateObj.getDay()
        if (dow === 1 || dow === 2) accessBlocked = true
        // Harvest blackout Aug 15 - Sep 30
        if (month === 7 && dateObj.getDate() >= 15) accessBlocked = true
        if (month === 8) accessBlocked = true
      }
      if (siteRef === "S-0008") {
        const dow = dateObj.getDay()
        if (dow >= 1 && dow <= 3) accessBlocked = true // Mon-Wed blocked
      }

      if (!isAvailable || accessBlocked) return "unavailable"

      // Some dates are "already booked" — hash for determinism
      const hash = (assessorId.charCodeAt(1) * 13 + dateObj.getDate() * 7) % 100
      if (hash < 8) return "booked"

      if (!inWindow) return "outside-window"
      return "available"
    },
    [surveyWindow, selectedSiteRef]
  )

  // Find best dates handler
  const handleFindBestDates = useCallback(() => {
    if (!selectedSite) return
    setIsSearching(true)
    setSearchProgress(0)
    setShowSuggestions(false)
    setSuggestedSlots([])

    const statuses = [
      "Checking assessor availability...",
      "Evaluating survey season windows...",
      "Checking site access constraints...",
      "Optimising multi-site routes...",
      "Calculating cost-efficient schedules...",
      "Ranking options...",
    ]

    let step = 0
    const interval = setInterval(() => {
      step++
      setSearchProgress(Math.min(step * 18, 100))
      setSearchStatus(statuses[Math.min(step - 1, statuses.length - 1)] ?? "")
      if (step >= 6) {
        clearInterval(interval)
        setIsSearching(false)
        setSearchProgress(100)

        // Generate suggestions based on site
        const isBNG = selectedSite.unitType === "BNG"
        const suitable = ASSESSORS.filter((a) =>
          a.specialism.includes(isBNG ? "Ecology" : "Nutrient")
        )

        // Best match: find first date in survey window with assessor available
        const bestAssessor = suitable[0] ?? ASSESSORS[0]
        const earlyAssessor = suitable[1] ?? ASSESSORS[1] ?? suitable[0] ?? ASSESSORS[0]
        const costAssessor = suitable[0] ?? ASSESSORS[0]

        const avail = ASSESSOR_AVAILABILITY.get(bestAssessor.id)
        const availDates = avail ? Array.from(avail).sort() : []
        const windowDates = availDates.filter((d) => {
          const m = new Date(d + "T00:00:00").getMonth()
          return surveyWindow.months.includes(m)
        })

        const bestDate = windowDates[2] ?? windowDates[0] ?? "2026-04-15"
        const earlyDate = availDates[0] ?? "2026-03-12"
        // Cost optimised: pick a date near another site visit
        const costDate = windowDates[1] ?? windowDates[0] ?? "2026-04-14"

        const nearby = sites.find((s) => s.ref !== selectedSite.ref && s.unitType === selectedSite.unitType)
        const nearbyName = nearby?.name ?? "Botley Meadows"

        setSuggestedSlots([
          {
            label: "Best Match",
            date: bestDate,
            assessor: bestAssessor,
            reason: `Within survey window, assessor has 3 consecutive days available for multi-site visit, site access confirmed`,
            tag: "best",
          },
          {
            label: "Earliest Available",
            date: earlyDate,
            assessor: earlyAssessor,
            reason: isBNG
              ? "First available slot, but outside optimal survey window (acceptable for monitoring)"
              : "First available slot within nutrient assessment window",
            tag: "earliest",
          },
          {
            label: "Cost Optimised",
            date: costDate,
            assessor: costAssessor,
            reason: `Assessor already visiting ${nearbyName} on ${formatDateShort(addDays(costDate, -1))}, can visit both sites to reduce travel costs`,
            tag: "cost",
          },
        ])
        setShowSuggestions(true)
      }
    }, 250)
  }, [selectedSite, surveyWindow])

  // Book slot handler
  const handleBookSlot = useCallback(
    (slot: SuggestedSlot) => {
      toast.success(
        `Monitoring visit scheduled: ${selectedSite?.name} on ${formatDate(slot.date)} with ${slot.assessor.name}. Notification sent.`
      )
    },
    [selectedSite]
  )

  // Bulk schedule handler
  const handleBulkSchedule = useCallback(() => {
    setIsBulkSearching(true)
    setBulkProgress(0)
    setShowBulkSchedule(false)
    setBulkSchedule([])

    const statuses = [
      "Scanning all obligations due within 6 months...",
      "Cross-referencing assessor calendars...",
      "Mapping site access windows...",
      "Optimising travel routes across sites...",
      "Calculating multi-site day bundles...",
      "Finalising schedule...",
    ]

    let step = 0
    const interval = setInterval(() => {
      step++
      setBulkProgress(Math.min(step * 18, 100))
      setBulkStatus(statuses[Math.min(step - 1, statuses.length - 1)] ?? "")
      if (step >= 6) {
        clearInterval(interval)
        setIsBulkSearching(false)
        setBulkProgress(100)

        const schedule: BulkScheduleRow[] = [
          {
            date: "2026-04-15",
            site: sites.find((s) => s.ref === "S-0001")!,
            obligation: "Annual Monitoring (OVERDUE)",
            assessor: ASSESSORS[0]!,
            status: "Ready to book",
          },
          {
            date: "2026-04-22",
            site: sites.find((s) => s.ref === "S-0002")!,
            obligation: "Water Quality Sampling (OVERDUE)",
            assessor: ASSESSORS[2]!,
            status: "Ready to book",
          },
          {
            date: "2026-04-23",
            site: sites.find((s) => s.ref === "S-0003")!,
            obligation: "LPA Annual Return (OVERDUE)",
            assessor: ASSESSORS[2]!,
            status: "Ready to book",
          },
          {
            date: "2026-05-08",
            site: sites.find((s) => s.ref === "S-0005")!,
            obligation: "Quarterly Monitoring Visit",
            assessor: ASSESSORS[0]!,
            status: "Ready to book",
          },
          {
            date: "2026-05-15",
            site: sites.find((s) => s.ref === "S-0008")!,
            obligation: "Baseline Survey",
            assessor: ASSESSORS[2]!,
            status: "Ready to book",
          },
          {
            date: "2026-06-03",
            site: sites.find((s) => s.ref === "S-0006")!,
            obligation: "Phosphorus Monitoring (OVERDUE)",
            assessor: ASSESSORS[3]!,
            status: "Ready to book",
          },
          {
            date: "2026-06-10",
            site: sites.find((s) => s.ref === "S-0001")!,
            obligation: "S106 Compliance Certificate",
            assessor: ASSESSORS[0]!,
            status: "Ready to book",
          },
        ]
        setBulkSchedule(schedule)
        setShowBulkSchedule(true)
      }
    }, 250)
  }, [])

  const handleConfirmAll = useCallback(() => {
    setBulkSchedule((prev) =>
      prev.map((row) => ({ ...row, status: "Confirmed" as const }))
    )
    toast.success(
      `${bulkSchedule.length} monitoring visits scheduled. Assessors notified. Calendar updated.`
    )
  }, [bulkSchedule.length])

  // Timeline site
  const timelineSite = useMemo(
    () => sites.find((s) => s.ref === timelineSiteRef) ?? sites[0]!,
    [timelineSiteRef]
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/brokerage-mockups/compliance"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Compliance
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Compliance Auto-Scheduler
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Automatically schedule monitoring visits and assessments across your 30-year obligations
                </p>
              </div>
              <Badge variant="outline" className="flex items-center gap-1.5 border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Zap className="h-3.5 w-3.5" />
                AI-Powered
              </Badge>
            </div>
          </div>

          {/* Section 1: Site & Obligation Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Site &amp; Obligation Overview
              </CardTitle>
              <CardDescription>
                All mitigation sites with their current compliance status and scheduling actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Commitment</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteObligations.map((obl) => (
                      <TableRow
                        key={obl.site.ref}
                        className={
                          obl.status === "Overdue"
                            ? "bg-red-500/5"
                            : obl.status === "Due Soon"
                              ? "bg-amber-500/5"
                              : ""
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{obl.site.name}</p>
                            <p className="text-xs text-muted-foreground">{obl.site.ref}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              obl.site.unitType === "BNG"
                                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                                : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            }
                          >
                            {obl.site.unitType === "BNG" ? (
                              <TreeDeciduous className="mr-1 h-3 w-3" />
                            ) : (
                              <Leaf className="mr-1 h-3 w-3" />
                            )}
                            {obl.site.unitType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {obl.site.commitmentYears ?? 30} years
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {obl.site.registeredDate
                            ? formatDate(obl.site.registeredDate)
                            : obl.site.enhancementStartDate
                              ? formatDate(obl.site.enhancementStartDate)
                              : "Pending"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(obl.nextDue)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={obl.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={
                              obl.status === "Overdue"
                                ? "destructive"
                                : obl.status === "Due Soon"
                                  ? "default"
                                  : "outline"
                            }
                            onClick={() => {
                              setSelectedSiteRef(obl.site.ref)
                              setShowSuggestions(false)
                              setSuggestedSlots([])
                              setSearchProgress(0)
                            }}
                            className="gap-1.5"
                          >
                            Schedule
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Auto-Schedule Panel */}
          {selectedSite && (
            <Card className="mb-8 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Schedule: {selectedSite.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Configure scheduling constraints and view assessor availability
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSiteRef(null)
                      setShowSuggestions(false)
                    }}
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* Left: Scheduling Constraints */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Scheduling Constraints
                    </h3>

                    {/* Obligation Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Obligation Type</label>
                      <Select
                        value={obligationType}
                        onValueChange={(v) => setObligationType(v as ObligationType)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OBLIGATION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Required Specialism */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Required Assessor Specialism
                      </label>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary"
                        >
                          <User className="mr-1 h-3 w-3" />
                          {specialism}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Auto-set based on {selectedSite.unitType === "BNG" ? "BNG" : "Nutrient Neutrality"} obligation
                        </span>
                      </div>
                    </div>

                    {/* Survey Season Window */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Survey Season Window
                      </label>
                      <p className="text-xs text-muted-foreground">{surveyWindow.label}</p>
                      <div className="flex gap-1">
                        {MONTHS.map((m, idx) => {
                          const inWindow = surveyWindow.months.includes(idx)
                          return (
                            <Tooltip key={m}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`flex h-8 w-full items-center justify-center rounded text-xs font-medium transition-colors ${
                                    inWindow
                                      ? "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30"
                                      : "bg-muted/50 text-muted-foreground/50"
                                  }`}
                                >
                                  {m}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {m}: {inWindow ? "Valid survey window" : "Outside survey window"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>

                    {/* Site Access Constraints */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Site Access Constraints
                      </label>
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              {selectedSite.name}
                            </p>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                              {SITE_ACCESS_CONSTRAINTS[selectedSite.ref] ?? "No specific constraints"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preferred Assessor */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Preferred Assessor</label>
                      <Select value={preferredAssessor} onValueChange={setPreferredAssessor}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">
                            <span className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-violet-500" />
                              Auto-assign (best match)
                            </span>
                          </SelectItem>
                          {ASSESSORS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="flex items-center gap-2">
                                {a.name}
                                <span className="text-xs text-muted-foreground">
                                  {a.specialism.join(", ")} — {a.region}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Find Best Dates Button */}
                    <Button
                      onClick={handleFindBestDates}
                      disabled={isSearching}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Find Best Dates
                    </Button>

                    {/* Thinking animation */}
                    {isSearching && (
                      <div className="space-y-2">
                        <Progress value={searchProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground animate-pulse">
                          {searchStatus}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Assessor Availability Matrix */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Assessor Availability
                      </h3>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            setCalendarMonth((prev) => Math.max(prev - 1, 2))
                          }
                          disabled={calendarMonth <= 2}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            setCalendarMonth((prev) => Math.min(prev + 1, 9))
                          }
                          disabled={calendarMonth >= 9}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm bg-green-500/30 border border-green-500/50" />
                        Available
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm bg-amber-500/30 border border-amber-500/50" />
                        Outside window
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm bg-muted border border-border" />
                        Unavailable
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm bg-blue-500/30 border border-blue-500/50" />
                        Already booked
                      </span>
                    </div>

                    {/* Calendar grid per assessor */}
                    <div className="space-y-4">
                      {ASSESSORS.map((assessor) => (
                        <div key={assessor.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`${assessor.avatarColor} text-white text-xs`}>
                                {assessor.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{assessor.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {assessor.specialism.join(", ")}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {"\u00A3"}{assessor.rate}/day
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {calendarMonths.map((cm) => (
                              <div key={`${cm.year}-${cm.month}`} className="space-y-1">
                                <p className="text-[10px] font-medium text-muted-foreground text-center">
                                  {MONTHS[cm.month]} {cm.year}
                                </p>
                                <div className="grid grid-cols-7 gap-[2px]">
                                  {/* Day-of-week headers */}
                                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                                    <span key={i} className="text-center text-[8px] text-muted-foreground/60">
                                      {d}
                                    </span>
                                  ))}
                                  {/* Leading blanks */}
                                  {Array.from({
                                    length: cm.dates[0] ? (cm.dates[0].dow + 6) % 7 : 0,
                                  }).map((_, i) => (
                                    <span key={`blank-${i}`} />
                                  ))}
                                  {/* Date cells */}
                                  {cm.dates.map((dd) => {
                                    const cellType = getDateCellType(dd.date, assessor.id)
                                    const isToday = dd.date === "2026-03-10"
                                    const isSelected = dd.date === selectedCalendarDate
                                    const cellColor =
                                      cellType === "available"
                                        ? "bg-green-500/25 hover:bg-green-500/40 border-green-500/40 text-green-800 dark:text-green-300 cursor-pointer"
                                        : cellType === "outside-window"
                                          ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-800 dark:text-amber-300 cursor-pointer"
                                          : cellType === "booked"
                                            ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300"
                                            : "bg-muted/40 border-border/50 text-muted-foreground/40"
                                    return (
                                      <Tooltip key={dd.date}>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (cellType === "available" || cellType === "outside-window") {
                                                setSelectedCalendarDate(dd.date)
                                              }
                                            }}
                                            className={`flex h-5 w-full items-center justify-center rounded-sm border text-[9px] font-medium transition-colors ${cellColor} ${
                                              isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""
                                            } ${isSelected ? "ring-2 ring-primary" : ""}`}
                                          >
                                            {dd.day}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          <p className="font-medium">{assessor.name} - {formatDate(dd.date)}</p>
                                          <p>
                                            {cellType === "available"
                                              ? "Available - within survey window"
                                              : cellType === "outside-window"
                                                ? "Available - outside optimal survey window"
                                                : cellType === "booked"
                                                  ? "Already booked"
                                                  : "Unavailable or site access blocked"}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: AI-Suggested Schedule */}
          {showSuggestions && suggestedSlots.length > 0 && (
            <Card className="mb-8 border-violet-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-violet-500" />
                  Recommended Schedule
                </CardTitle>
                <CardDescription>
                  3 optimised options for {selectedSite?.name} &mdash; {obligationType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {suggestedSlots.map((slot) => (
                    <Card
                      key={slot.tag}
                      className={`relative overflow-hidden ${
                        slot.tag === "best"
                          ? "border-green-500/30 bg-green-500/5"
                          : slot.tag === "earliest"
                            ? "border-blue-500/30 bg-blue-500/5"
                            : "border-amber-500/30 bg-amber-500/5"
                      }`}
                    >
                      {slot.tag === "best" && (
                        <div className="absolute right-0 top-0 rounded-bl-lg bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:text-green-400">
                          Recommended
                        </div>
                      )}
                      <CardContent className="space-y-4 pt-6">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{formatDate(slot.date)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback
                                className={`${slot.assessor.avatarColor} text-white text-[9px]`}
                              >
                                {slot.assessor.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{slot.assessor.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {"\u00A3"}{slot.assessor.rate}/day
                            </span>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {slot.reason}
                        </p>
                        <Button
                          size="sm"
                          className="w-full gap-1.5"
                          variant={slot.tag === "best" ? "default" : "outline"}
                          onClick={() => handleBookSlot(slot)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Book This Slot
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Bulk Scheduling */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-muted-foreground" />
                Bulk Scheduling
              </CardTitle>
              <CardDescription>
                Auto-schedule all obligations due in the next 6 months across all sites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary of upcoming obligations */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-lg border bg-red-500/5 border-red-500/20 px-4 py-2">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {complianceItems.filter((c) => c.status === "Overdue").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
                <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 px-4 py-2">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {complianceItems.filter((c) => c.status === "Due Soon").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Due Soon</p>
                </div>
                <div className="rounded-lg border bg-blue-500/5 border-blue-500/20 px-4 py-2">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {complianceItems.filter((c) => c.status === "Upcoming").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>

              {!showBulkSchedule && (
                <div className="space-y-4">
                  <Button
                    onClick={handleBulkSchedule}
                    disabled={isBulkSearching}
                    size="lg"
                    className="gap-2"
                  >
                    {isBulkSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Auto-Schedule All Upcoming
                  </Button>

                  {isBulkSearching && (
                    <div className="max-w-md space-y-2">
                      <Progress value={bulkProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground animate-pulse">
                        {bulkStatus}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {showBulkSchedule && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Obligation</TableHead>
                          <TableHead>Assessor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkSchedule.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm">
                              {formatDate(row.date)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{row.site.name}</p>
                                <p className="text-xs text-muted-foreground">{row.site.ref}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-sm ${
                                  row.obligation.includes("OVERDUE")
                                    ? "font-semibold text-red-600 dark:text-red-400"
                                    : ""
                                }`}
                              >
                                {row.obligation}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback
                                    className={`${row.assessor.avatarColor} text-white text-xs`}
                                  >
                                    {row.assessor.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{row.assessor.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {row.status === "Confirmed" ? (
                                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Confirmed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-blue-500/30 text-blue-700 dark:text-blue-400">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Ready to book
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Optimisation notes */}
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Optimisation Summary
                        </p>
                        <p className="text-xs text-green-600/80 dark:text-green-400/80">
                          Optimised for: minimal assessor travel, survey season compliance, site access
                          windows. Estimated cost saving vs ad-hoc scheduling:{" "}
                          <span className="font-semibold">{"\u00A3"}1,200</span> (3 multi-site days
                          instead of 5 individual visits).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={handleConfirmAll} className="gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.info("Individual adjustments available in full version.")
                      }}
                      className="gap-1.5"
                    >
                      <Calendar className="h-4 w-4" />
                      Adjust
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowBulkSchedule(false)
                        setBulkSchedule([])
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: 30-Year Obligation Forecast */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-muted-foreground" />
                    Obligation Forecast
                  </CardTitle>
                  <CardDescription>
                    Long-term monitoring timeline for the selected site
                  </CardDescription>
                </div>
                <Select value={timelineSiteRef} onValueChange={setTimelineSiteRef}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.ref} value={s.ref}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <TimelineForecast site={timelineSite} />
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SiteObligation["status"] }) {
  switch (status) {
    case "Overdue":
      return (
        <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">
          <AlertCircle className="mr-1 h-3 w-3" />
          Overdue
        </Badge>
      )
    case "Due Soon":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Due Soon
        </Badge>
      )
    case "On Track":
      return (
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          On Track
        </Badge>
      )
    case "Not Started":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Clock className="mr-1 h-3 w-3" />
          Not Started
        </Badge>
      )
  }
}

function TimelineForecast({ site }: { site: Site }) {
  const startYear = site.registeredDate
    ? new Date(site.registeredDate + "T00:00:00").getFullYear()
    : site.enhancementStartDate
      ? new Date(site.enhancementStartDate + "T00:00:00").getFullYear()
      : 2025
  const commitmentYears = site.commitmentYears ?? 30
  const endYear = startYear + commitmentYears
  const currentYear = 2026

  // Generate events
  const events: { year: number; type: "annual" | "five-year" | "ten-year"; label: string; past: boolean }[] = []
  for (let y = startYear; y <= endYear; y++) {
    if ((y - startYear) % 10 === 0 && y !== startYear) {
      events.push({
        year: y,
        type: "ten-year",
        label: `${y}: ${commitmentYears >= 80 ? "HMMP Review" : "10-Year Condition Assessment"}`,
        past: y < currentYear,
      })
    } else if ((y - startYear) % 5 === 0 && y !== startYear) {
      events.push({
        year: y,
        type: "five-year",
        label: `${y}: 5-Year Condition Assessment`,
        past: y < currentYear,
      })
    } else {
      events.push({
        year: y,
        type: "annual",
        label: `${y}: Annual Monitoring`,
        past: y < currentYear,
      })
    }
  }

  // For very long timelines (80yr), show in compressed decade blocks
  const totalSpan = endYear - startYear
  const showCompressed = totalSpan > 40

  // Decade markers for compressed view
  const decades: number[] = []
  for (let y = startYear; y <= endYear; y += 10) {
    decades.push(y)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary/60" />
          Annual monitoring
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-amber-500" />
          5-year assessment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4.5 w-4.5 rounded-full bg-red-500" />
          10-year review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-primary" />
          Today
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span>
          {site.name} &mdash; {commitmentYears}-year commitment ({startYear}&ndash;{endYear})
        </span>
      </div>

      {/* Timeline bar */}
      <div className="overflow-x-auto pb-4">
        <div
          className="relative"
          style={{ minWidth: showCompressed ? "800px" : `${Math.max(totalSpan * 28, 800)}px` }}
        >
          {/* Base line */}
          <div className="absolute left-0 right-0 top-[22px] h-[2px] bg-border" />

          {/* Today marker */}
          {currentYear >= startYear && currentYear <= endYear && (
            <div
              className="absolute top-0 z-10 flex flex-col items-center"
              style={{
                left: `${((currentYear - startYear) / totalSpan) * 100}%`,
              }}
            >
              <div className="h-[44px] w-[2px] bg-primary" />
              <span className="mt-1 text-[10px] font-semibold text-primary">Today</span>
            </div>
          )}

          {/* Event markers */}
          <div className="relative flex h-[44px] items-center">
            {events.map((evt, idx) => {
              const pct = ((evt.year - startYear) / totalSpan) * 100
              // Skip rendering too-close annual markers in compressed view
              if (showCompressed && evt.type === "annual" && (evt.year - startYear) % 5 !== 0 && totalSpan > 60) {
                // Only render every other year for 80yr timelines
                if ((evt.year - startYear) % 2 !== 0) return null
              }

              const size =
                evt.type === "ten-year"
                  ? "h-4 w-4"
                  : evt.type === "five-year"
                    ? "h-3 w-3"
                    : "h-2 w-2"

              const color =
                evt.type === "ten-year"
                  ? evt.past
                    ? "bg-red-500"
                    : "bg-red-500/30 border-2 border-red-500"
                  : evt.type === "five-year"
                    ? evt.past
                      ? "bg-amber-500"
                      : "bg-amber-500/30 border-2 border-amber-500"
                    : evt.past
                      ? "bg-primary/60"
                      : "bg-primary/20 border border-primary/50"

              return (
                <TooltipProvider key={`${evt.year}-${evt.type}-${idx}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute flex items-center justify-center"
                        style={{
                          left: `${pct}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className={`rounded-full ${size} ${color} transition-colors`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{evt.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {evt.past ? "Completed" : `Due in ${evt.year - currentYear} year${evt.year - currentYear === 1 ? "" : "s"}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>

          {/* Year labels */}
          <div className="relative mt-1 h-6">
            {(showCompressed ? decades : Array.from({ length: Math.ceil(totalSpan / 5) + 1 }, (_, i) => startYear + i * 5)).map(
              (year) => {
                if (year > endYear) return null
                const pct = ((year - startYear) / totalSpan) * 100
                return (
                  <span
                    key={year}
                    className="absolute -translate-x-1/2 text-[10px] text-muted-foreground font-medium"
                    style={{ left: `${pct}%` }}
                  >
                    {year}
                  </span>
                )
              }
            )}
          </div>
        </div>
      </div>

      {/* Key upcoming milestones */}
      <Separator />
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Key Upcoming Milestones
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {events
            .filter((e) => !e.past && e.year >= currentYear)
            .slice(0, 6)
            .map((evt, idx) => (
              <div
                key={idx}
                className={`rounded-lg border px-3 py-2 ${
                  evt.type === "ten-year"
                    ? "border-red-500/20 bg-red-500/5"
                    : evt.type === "five-year"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      evt.type === "ten-year"
                        ? "bg-red-500"
                        : evt.type === "five-year"
                          ? "bg-amber-500"
                          : "bg-primary/60"
                    }`}
                  />
                  <span className="text-xs font-medium">{evt.year}</span>
                  <span className="text-xs text-muted-foreground">
                    {evt.type === "annual"
                      ? "Annual Monitoring"
                      : evt.type === "five-year"
                        ? "5-Year Assessment"
                        : "10-Year Review"}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {evt.year - currentYear === 0
                    ? "This year"
                    : `In ${evt.year - currentYear} year${evt.year - currentYear === 1 ? "" : "s"}`}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
