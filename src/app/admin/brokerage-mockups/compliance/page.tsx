"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  List,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComplianceStatus = "OVERDUE" | "DUE_SOON" | "UPCOMING" | "COMPLETED"
type ComplianceCategory = "MONITORING" | "LEGAL" | "REGISTRATION"
type Frequency = "Annual" | "Biannual" | "One-off"
type ViewMode = "calendar" | "list" | "timeline"

interface ComplianceItem {
  id: string
  title: string
  category: ComplianceCategory
  site: string
  siteRef?: string
  dealRef?: string
  dueDate: Date
  status: ComplianceStatus
  assigned: string
  assignedInitials: string
  frequency: Frequency
  completedDate?: Date
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  // OVERDUE
  {
    id: "C-001",
    title: "Annual Habitat Monitoring Report",
    category: "MONITORING",
    site: "Whiteley Farm",
    siteRef: "S-0001",
    dueDate: new Date(2026, 1, 28), // 28 Feb 2026
    status: "OVERDUE",
    assigned: "Tom Jenkins",
    assignedInitials: "TJ",
    frequency: "Annual",
  },
  {
    id: "C-002",
    title: "NE Registry Update",
    category: "REGISTRATION",
    site: "Botley Meadows",
    siteRef: "S-0002",
    dueDate: new Date(2026, 2, 1), // 1 Mar 2026
    status: "OVERDUE",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Annual",
  },
  {
    id: "C-003",
    title: "S106 Compliance Review",
    category: "LEGAL",
    site: "Hamble Wetlands",
    siteRef: "S-0003",
    dueDate: new Date(2026, 2, 3), // 3 Mar 2026
    status: "OVERDUE",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Biannual",
  },
  // DUE SOON
  {
    id: "C-004",
    title: "LPA Condition Discharge Evidence",
    category: "LEGAL",
    site: "Manor Fields",
    siteRef: "S-0005",
    dueDate: new Date(2026, 2, 10), // 10 Mar 2026
    status: "DUE_SOON",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "One-off",
  },
  {
    id: "C-005",
    title: "Annual Habitat Monitoring Report",
    category: "MONITORING",
    site: "Botley Meadows",
    siteRef: "S-0002",
    dueDate: new Date(2026, 2, 12), // 12 Mar 2026
    status: "DUE_SOON",
    assigned: "Tom Jenkins",
    assignedInitials: "TJ",
    frequency: "Annual",
  },
  // UPCOMING
  {
    id: "C-006",
    title: "NE Registry Update",
    category: "REGISTRATION",
    site: "Whiteley Farm",
    siteRef: "S-0001",
    dueDate: new Date(2026, 2, 20), // 20 Mar 2026
    status: "UPCOMING",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Annual",
  },
  {
    id: "C-007",
    title: "S106 Compliance Review",
    category: "LEGAL",
    site: "Manor Fields",
    siteRef: "S-0005",
    dueDate: new Date(2026, 3, 15), // 15 Apr 2026
    status: "UPCOMING",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Biannual",
  },
  {
    id: "C-008",
    title: "LPA Condition Discharge",
    category: "LEGAL",
    site: "D-0038",
    dealRef: "D-0038",
    dueDate: new Date(2026, 3, 28), // 28 Apr 2026
    status: "UPCOMING",
    assigned: "Sarah Croft",
    assignedInitials: "SC",
    frequency: "One-off",
  },
  {
    id: "C-009",
    title: "Annual Habitat Monitoring",
    category: "MONITORING",
    site: "Manor Fields",
    siteRef: "S-0005",
    dueDate: new Date(2026, 10, 14), // 14 Nov 2026
    status: "UPCOMING",
    assigned: "Tom Jenkins",
    assignedInitials: "TJ",
    frequency: "Annual",
  },
  {
    id: "C-010",
    title: "NE Registry Update",
    category: "REGISTRATION",
    site: "Manor Fields",
    siteRef: "S-0005",
    dueDate: new Date(2026, 10, 14), // 14 Nov 2026
    status: "UPCOMING",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Annual",
  },
  // COMPLETED
  {
    id: "C-011",
    title: "Annual Habitat Monitoring",
    category: "MONITORING",
    site: "Whiteley Farm",
    siteRef: "S-0001",
    dueDate: new Date(2025, 1, 28), // 28 Feb 2025
    status: "COMPLETED",
    assigned: "Tom Jenkins",
    assignedInitials: "TJ",
    frequency: "Annual",
    completedDate: new Date(2025, 1, 26),
  },
  {
    id: "C-012",
    title: "NE Registry Update",
    category: "REGISTRATION",
    site: "Whiteley Farm",
    siteRef: "S-0001",
    dueDate: new Date(2025, 1, 28), // 28 Feb 2025
    status: "COMPLETED",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Annual",
    completedDate: new Date(2025, 1, 27),
  },
  {
    id: "C-013",
    title: "S106 Compliance Review",
    category: "LEGAL",
    site: "Hamble Wetlands",
    siteRef: "S-0003",
    dueDate: new Date(2025, 8, 3), // 3 Sep 2025
    status: "COMPLETED",
    assigned: "James Harris",
    assignedInitials: "JH",
    frequency: "Biannual",
    completedDate: new Date(2025, 8, 1),
  },
  {
    id: "C-014",
    title: "LPA Condition Discharge",
    category: "LEGAL",
    site: "D-0035",
    dealRef: "D-0035",
    dueDate: new Date(2025, 11, 15), // 15 Dec 2025
    status: "COMPLETED",
    assigned: "Sarah Croft",
    assignedInitials: "SC",
    frequency: "One-off",
    completedDate: new Date(2025, 11, 12),
  },
]

// ---------------------------------------------------------------------------
// Colour / style maps
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<ComplianceStatus, { bg: string; text: string; dot: string; border: string; badge: string }> = {
  OVERDUE: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
  DUE_SOON: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  UPCOMING: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  COMPLETED: {
    bg: "bg-gray-50 dark:bg-gray-900/30",
    text: "text-gray-500 dark:text-gray-400",
    dot: "bg-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    badge: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  },
}

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  OVERDUE: "Overdue",
  DUE_SOON: "Due Soon",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
}

const CATEGORY_STYLES: Record<ComplianceCategory, { bg: string; text: string; dot: string }> = {
  MONITORING: {
    bg: "bg-purple-100 dark:bg-purple-950",
    text: "text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  LEGAL: {
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  REGISTRATION: {
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
}

const ASSIGNEE_STYLES: Record<string, string> = {
  TJ: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  JH: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  SC: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
}

const FREQUENCY_STYLES: Record<Frequency, string> = {
  Annual: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
  Biannual: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
  "One-off": "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function getDaysUntil(date: Date): number {
  const today = new Date(2026, 2, 7) // 7 Mar 2026
  const diff = date.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getUrgencyText(item: ComplianceItem): string {
  const days = getDaysUntil(item.dueDate)
  if (item.status === "COMPLETED") return `Completed ${formatDateShort(item.completedDate!)}`
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
  if (days === 0) return "Due today"
  return `Due in ${days} day${days !== 1 ? "s" : ""}`
}

// Calendar helper: March 2026 starts on Sunday (day 0), 31 days
function getCalendarGrid(): (number | null)[][] {
  // March 2026: Sunday March 1 is day 0 (Sunday)
  // First day of March 2026 is a Sunday
  const firstDayOfWeek = 0 // Sunday = 0
  const daysInMonth = 31

  const grid: (number | null)[][] = []
  let currentDay = 1

  // Build weeks
  const firstWeek: (number | null)[] = []
  for (let i = 0; i < 7; i++) {
    if (i < firstDayOfWeek) {
      firstWeek.push(null)
    } else {
      firstWeek.push(currentDay++)
    }
  }
  grid.push(firstWeek)

  while (currentDay <= daysInMonth) {
    const week: (number | null)[] = []
    for (let i = 0; i < 7; i++) {
      if (currentDay <= daysInMonth) {
        week.push(currentDay++)
      } else {
        week.push(null)
      }
    }
    grid.push(week)
  }

  return grid
}

function getItemsForDay(day: number, items: ComplianceItem[]): ComplianceItem[] {
  return items.filter((item) => {
    return item.dueDate.getMonth() === 2 && // March
      item.dueDate.getFullYear() === 2026 &&
      item.dueDate.getDate() === day
  })
}

// Group items by week for timeline view
function getWeekLabel(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString("en-GB", { month: "short" })
  const year = date.getFullYear()
  if (day <= 7) return `Week 1 - ${month} ${year}`
  if (day <= 14) return `Week 2 - ${month} ${year}`
  if (day <= 21) return `Week 3 - ${month} ${year}`
  if (day <= 28) return `Week 4 - ${month} ${year}`
  return `Week 5 - ${month} ${year}`
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const weekNum = Math.ceil(date.getDate() / 7)
  return `${year}-${month}-${weekNum}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AssigneeAvatar({ initials, name }: { initials: string; name: string }) {
  const style = ASSIGNEE_STYLES[initials] ?? "bg-muted text-muted-foreground"
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide shrink-0 cursor-default ${style}`}
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function CategoryBadge({ category }: { category: ComplianceCategory }) {
  const s = CATEGORY_STYLES[category]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text} border-current/20`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {category}
    </span>
  )
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  )
}

function FrequencyPill({ frequency }: { frequency: Frequency }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium ${FREQUENCY_STYLES[frequency]}`}>
      <RefreshCw className="h-2.5 w-2.5" />
      {frequency}
    </span>
  )
}

function SummaryBar() {
  const overdue = COMPLIANCE_ITEMS.filter((i) => i.status === "OVERDUE").length
  const dueSoon = COMPLIANCE_ITEMS.filter((i) => i.status === "DUE_SOON").length
  // "Due This Month" = items due in March 2026 that are not completed
  const dueThisMonth = COMPLIANCE_ITEMS.filter(
    (i) => i.dueDate.getMonth() === 2 && i.dueDate.getFullYear() === 2026 && i.status !== "COMPLETED"
  ).length
  const completed = COMPLIANCE_ITEMS.filter((i) => i.status === "COMPLETED").length

  const cards = [
    { label: "Overdue", value: overdue, bg: "bg-red-500/10 border-red-500/20", text: "text-red-700 dark:text-red-400", icon: AlertTriangle, iconColor: "text-red-500" },
    { label: "Due This Week", value: dueSoon, bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-700 dark:text-amber-400", icon: Clock, iconColor: "text-amber-500" },
    { label: "Due This Month", value: dueThisMonth, bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-700 dark:text-blue-400", icon: CalendarDays, iconColor: "text-blue-500" },
    { label: "Completed", value: completed, bg: "bg-green-500/10 border-green-500/20", text: "text-green-700 dark:text-green-400", icon: CheckCircle2, iconColor: "text-green-500" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`rounded-lg border px-4 py-3 ${card.bg}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const views: { key: ViewMode; label: string; icon: React.ElementType }[] = [
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "list", label: "List", icon: List },
    { key: "timeline", label: "Timeline", icon: CalendarDays },
  ]

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {views.map((v) => {
        const Icon = v.icon
        const isActive = view === v.key
        return (
          <button
            key={v.key}
            onClick={() => onChange(v.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function FilterBar({
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  siteFilter,
  setSiteFilter,
  assignedFilter,
  setAssignedFilter,
}: {
  statusFilter: string
  setStatusFilter: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  siteFilter: string
  setSiteFilter: (v: string) => void
  assignedFilter: string
  setAssignedFilter: (v: string) => void
}) {
  const hasFilters = statusFilter !== "all" || categoryFilter !== "all" || siteFilter !== "all" || assignedFilter !== "all"

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="font-medium">Filters</span>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="OVERDUE">Overdue</SelectItem>
          <SelectItem value="DUE_SOON">Due Soon</SelectItem>
          <SelectItem value="UPCOMING">Upcoming</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="MONITORING">Monitoring</SelectItem>
          <SelectItem value="LEGAL">Legal</SelectItem>
          <SelectItem value="REGISTRATION">Registration</SelectItem>
        </SelectContent>
      </Select>

      <Select value={siteFilter} onValueChange={setSiteFilter}>
        <SelectTrigger className="h-7 w-[140px] text-xs">
          <SelectValue placeholder="Site" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          <SelectItem value="Whiteley Farm">Whiteley Farm</SelectItem>
          <SelectItem value="Botley Meadows">Botley Meadows</SelectItem>
          <SelectItem value="Hamble Wetlands">Hamble Wetlands</SelectItem>
          <SelectItem value="Manor Fields">Manor Fields</SelectItem>
          <SelectItem value="D-0035">D-0035</SelectItem>
          <SelectItem value="D-0038">D-0038</SelectItem>
        </SelectContent>
      </Select>

      <Select value={assignedFilter} onValueChange={setAssignedFilter}>
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="Assigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="Tom Jenkins">Tom Jenkins</SelectItem>
          <SelectItem value="James Harris">James Harris</SelectItem>
          <SelectItem value="Sarah Croft">Sarah Croft</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <button
          onClick={() => {
            setStatusFilter("all")
            setCategoryFilter("all")
            setSiteFilter("all")
            setAssignedFilter("all")
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// V1: Calendar Grid
// ---------------------------------------------------------------------------

function CalendarGridView({ items }: { items: ComplianceItem[] }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const grid = getCalendarGrid()
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const today = 7 // March 7, 2026

  const selectedDayItems = selectedDay ? getItemsForDay(selectedDay, items) : []

  return (
    <div className="space-y-4">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <h3 className="text-lg font-semibold text-foreground">March 2026</h3>
          <button className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Due Soon
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Upcoming
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Completed
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {dayNames.map((name) => (
            <div
              key={name}
              className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {grid.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day, dayIdx) => {
              const dayItems = day ? getItemsForDay(day, items) : []
              const isToday = day === today
              const isSelected = day === selectedDay
              const isWeekend = dayIdx === 0 || dayIdx === 6

              return (
                <div
                  key={dayIdx}
                  onClick={() => day && dayItems.length > 0 && setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[100px] p-1.5 border-r border-border last:border-r-0 transition-colors ${
                    day === null
                      ? "bg-muted/30"
                      : isSelected
                        ? "bg-primary/5 ring-1 ring-primary/30 ring-inset"
                        : isWeekend
                          ? "bg-muted/20 hover:bg-accent/30"
                          : "hover:bg-accent/30"
                  } ${day && dayItems.length > 0 ? "cursor-pointer" : "cursor-default"}`}
                >
                  {day !== null && (
                    <>
                      {/* Day number */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[12px] font-medium ${
                            isToday
                              ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold"
                              : "text-foreground/70 px-1"
                          }`}
                        >
                          {day}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="text-[9px] text-muted-foreground font-medium">
                            {dayItems.length} item{dayItems.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Compliance pills */}
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map((item) => {
                          const statusStyle = STATUS_STYLES[item.status]
                          return (
                            <TooltipProvider key={item.id} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-medium truncate ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
                                  >
                                    <span className="flex items-center gap-1">
                                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
                                      <span className="truncate">{item.title}</span>
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                  <p className="font-semibold">{item.title}</p>
                                  <p className="text-muted-foreground">{item.site} -- {getUrgencyText(item)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                        {dayItems.length > 3 && (
                          <div className="text-[9px] text-muted-foreground font-medium px-1.5">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Expanded Day Detail */}
      {selectedDay !== null && selectedDayItems.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">
                {selectedDay} March 2026
              </h4>
              <span className="text-xs text-muted-foreground">
                -- {selectedDayItems.length} compliance item{selectedDayItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {selectedDayItems.map((item) => (
              <ComplianceRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Non-March items notice */}
      {items.some((i) => i.dueDate.getMonth() !== 2 || i.dueDate.getFullYear() !== 2026) && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {items.filter((i) => i.dueDate.getMonth() !== 2 || i.dueDate.getFullYear() !== 2026).length} items
            </span>{" "}
            are outside March 2026. Switch to List or Timeline view to see all items.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared compliance row (used in calendar detail + list view)
// ---------------------------------------------------------------------------

function ComplianceRow({ item }: { item: ComplianceItem }) {
  const statusStyle = STATUS_STYLES[item.status]
  return (
    <div className={`flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors`}>
      {/* Status indicator */}
      <div className={`w-1 self-stretch rounded-full shrink-0 ${statusStyle.dot}`} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <CategoryBadge category={item.category} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {item.dealRef ? (
              <Link href={`/admin/brokerage-mockups/deals/${item.dealRef}`} className="text-primary font-medium hover:underline">{item.dealRef}</Link>
            ) : (
              <span>
                {item.siteRef ? (
                  <Link href={`/admin/brokerage-mockups/sites/${item.siteRef}`} className="hover:text-primary transition-colors">{item.site}</Link>
                ) : (
                  item.site
                )}
                {item.siteRef && <Link href={`/admin/brokerage-mockups/sites/${item.siteRef}`} className="text-muted-foreground/60 hover:text-primary ml-1">({item.siteRef})</Link>}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(item.dueDate)}
          </span>
          <span className={`font-medium ${statusStyle.text}`}>
            {getUrgencyText(item)}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        <FrequencyPill frequency={item.frequency} />
        <AssigneeAvatar initials={item.assignedInitials} name={item.assigned} />
        <StatusBadge status={item.status} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// V2: List / Table View
// ---------------------------------------------------------------------------

function ListView({ items }: { items: ComplianceItem[] }) {
  const [sortField, setSortField] = useState<"dueDate" | "title" | "site">("dueDate")
  const [sortAsc, setSortAsc] = useState(true)

  const statusOrder: ComplianceStatus[] = ["OVERDUE", "DUE_SOON", "UPCOMING", "COMPLETED"]

  const grouped = useMemo(() => {
    const groups: Record<ComplianceStatus, ComplianceItem[]> = {
      OVERDUE: [],
      DUE_SOON: [],
      UPCOMING: [],
      COMPLETED: [],
    }
    items.forEach((item) => {
      groups[item.status].push(item)
    })

    // Sort within each group
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => {
        let cmp = 0
        if (sortField === "dueDate") cmp = a.dueDate.getTime() - b.dueDate.getTime()
        else if (sortField === "title") cmp = a.title.localeCompare(b.title)
        else if (sortField === "site") cmp = a.site.localeCompare(b.site)
        return sortAsc ? cmp : -cmp
      })
    })

    return groups
  }, [items, sortField, sortAsc])

  function handleSort(field: "dueDate" | "title" | "site") {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  function SortHeader({ field, label }: { field: "dueDate" | "title" | "site"; label: string }) {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold transition-colors ${
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        {isActive && (
          <span className="text-[9px]">{sortAsc ? "\u2191" : "\u2193"}</span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sort controls */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-[11px] text-muted-foreground font-medium">Sort by:</span>
        <SortHeader field="dueDate" label="Due Date" />
        <SortHeader field="title" label="Title" />
        <SortHeader field="site" label="Site" />
      </div>

      {/* Grouped sections */}
      {statusOrder.map((status) => {
        const groupItems = grouped[status]
        if (groupItems.length === 0) return null
        const statusStyle = STATUS_STYLES[status]

        return (
          <div key={status} className="space-y-0">
            {/* Group Header */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0 ${statusStyle.bg} ${statusStyle.border}`}>
              <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
              <span className={`text-sm font-semibold ${statusStyle.text}`}>
                {STATUS_LABELS[status]}
              </span>
              <Badge variant="outline" className="text-[10px] h-5 ml-1">
                {groupItems.length}
              </Badge>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_140px_140px_90px_80px_90px] gap-2 px-4 py-2 bg-muted/50 border-x border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Title</span>
              <span>Category</span>
              <span>Site / Deal</span>
              <span>Due Date</span>
              <span>Frequency</span>
              <span>Assigned</span>
              <span>Status</span>
            </div>

            {/* Rows */}
            <div className={`border rounded-b-lg overflow-hidden ${statusStyle.border}`}>
              {groupItems.map((item, idx) => {
                const s = STATUS_STYLES[item.status]
                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_100px_140px_140px_90px_80px_90px] gap-2 px-4 py-2.5 items-center hover:bg-accent/30 transition-colors ${
                      idx < groupItems.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-0.5 h-8 rounded-full shrink-0 ${s.dot}`} />
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </span>
                    </div>
                    <CategoryBadge category={item.category} />
                    <div className="text-xs text-muted-foreground truncate">
                      {item.dealRef ? (
                        <Link href={`/admin/brokerage-mockups/deals/${item.dealRef}`} className="text-primary font-medium hover:underline">{item.dealRef}</Link>
                      ) : (
                        <span>
                          {item.siteRef ? (
                            <Link href={`/admin/brokerage-mockups/sites/${item.siteRef}`} className="hover:text-primary transition-colors">{item.site}</Link>
                          ) : (
                            item.site
                          )}
                          {item.siteRef && (
                            <Link href={`/admin/brokerage-mockups/sites/${item.siteRef}`} className="text-muted-foreground/60 hover:text-primary ml-1">({item.siteRef})</Link>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="text-foreground">{formatDate(item.dueDate)}</span>
                      <span className={`ml-1.5 text-[10px] font-medium ${s.text}`}>
                        {item.status === "OVERDUE" && `(${Math.abs(getDaysUntil(item.dueDate))}d overdue)`}
                        {item.status === "DUE_SOON" && `(${getDaysUntil(item.dueDate)}d)`}
                      </span>
                    </div>
                    <FrequencyPill frequency={item.frequency} />
                    <AssigneeAvatar initials={item.assignedInitials} name={item.assigned} />
                    <StatusBadge status={item.status} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// V3: Timeline View
// ---------------------------------------------------------------------------

function TimelineView({ items }: { items: ComplianceItem[] }) {
  // Group items by week
  const sorted = [...items].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const weekGroups: { key: string; label: string; items: ComplianceItem[] }[] = []
  const seenKeys = new Set<string>()

  for (const item of sorted) {
    const key = getWeekKey(item.dueDate)
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      weekGroups.push({
        key,
        label: getWeekLabel(item.dueDate),
        items: sorted.filter((i) => getWeekKey(i.dueDate) === key),
      })
    }
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[139px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-8">
        {weekGroups.map((group) => (
          <div key={group.key} className="relative">
            {/* Week label */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-[120px] text-right">
                <span className="text-xs font-semibold text-foreground bg-muted border border-border rounded-md px-2.5 py-1">
                  {group.label}
                </span>
              </div>
              {/* Timeline dot (large) */}
              <div className="w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span className="text-xs text-muted-foreground">
                {group.items.length} item{group.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Items in this week */}
            <div className="space-y-3 ml-[160px]">
              {group.items.map((item) => {
                const statusStyle = STATUS_STYLES[item.status]
                const categoryStyle = CATEGORY_STYLES[item.category]

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-lg border p-4 hover:shadow-sm transition-all ${statusStyle.border} bg-card`}
                  >
                    {/* Timeline connector dot */}
                    <div
                      className={`absolute -left-[25px] top-5 w-3 h-3 rounded-full border-2 border-background z-10 ${statusStyle.dot}`}
                    />
                    {/* Connector line from dot to card */}
                    <div className="absolute -left-[13px] top-[26px] w-[13px] h-px bg-border" />

                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                          <CategoryBadge category={item.category} />
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.dealRef ? (
                              <Link href={`/admin/brokerage-mockups/deals/${item.dealRef}`} className="text-primary font-medium hover:underline">{item.dealRef}</Link>
                            ) : (
                              <span>
                                {item.siteRef ? (
                                  <Link href={`/admin/brokerage-mockups/sites/${item.siteRef}`} className="hover:text-primary transition-colors">{item.site}</Link>
                                ) : (
                                  item.site
                                )}
                                {item.siteRef && <Link href={`/admin/brokerage-mockups/sites/${item.siteRef}`} className="opacity-60 hover:text-primary ml-1">({item.siteRef})</Link>}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(item.dueDate)}
                          </span>
                          <span className={`font-medium ${statusStyle.text}`}>
                            {getUrgencyText(item)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <FrequencyPill frequency={item.frequency} />
                        <AssigneeAvatar initials={item.assignedInitials} name={item.assigned} />
                      </div>
                    </div>

                    {/* Footer bar */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Assigned to <span className="font-medium text-foreground">{item.assigned}</span></span>
                      </div>
                      {item.status !== "COMPLETED" && (
                        <button className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors">
                          <Eye className="h-3 w-3" />
                          View Details
                        </button>
                      )}
                      {item.status === "COMPLETED" && item.completedDate && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed {formatDateShort(item.completedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComplianceCalendarPage() {
  const [view, setView] = useState<ViewMode>("calendar")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [siteFilter, setSiteFilter] = useState("all")
  const [assignedFilter, setAssignedFilter] = useState("all")

  const filteredItems = useMemo(() => {
    return COMPLIANCE_ITEMS.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false
      if (siteFilter !== "all" && item.site !== siteFilter) return false
      if (assignedFilter !== "all" && item.assigned !== assignedFilter) return false
      return true
    })
  }, [statusFilter, categoryFilter, siteFilter, assignedFilter])

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Compliance Calendar
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Track monitoring deadlines, legal obligations, and registration renewals across all sites and deals.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {new Date(2026, 2, 7).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Summary Bar */}
      <SummaryBar />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <FilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          siteFilter={siteFilter}
          setSiteFilter={setSiteFilter}
          assignedFilter={assignedFilter}
          setAssignedFilter={setAssignedFilter}
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filteredItems.length} of {COMPLIANCE_ITEMS.length} items
          </span>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* Content */}
      {view === "calendar" && <CalendarGridView items={filteredItems} />}
      {view === "list" && <ListView items={filteredItems} />}
      {view === "timeline" && <TimelineView items={filteredItems} />}

      {/* Footer */}
      <div className="border-t border-border pt-4 mt-8">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ironheart Brokerage -- BNG / Nutrient Credit Compliance</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Monitoring
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Legal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Registration
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
