"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  CalendarDays,
  TableProperties,
  Plus,
  ClipboardCheck,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
  FileText,
  ArrowUpDown,
} from "lucide-react"
import { assessments, assessors } from "../_mock-data"
import type { AssessmentType, AssessmentStatus } from "../_mock-data"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AssessmentStatus, string> = {
  Scheduled: "border border-blue-200 bg-blue-50 text-blue-700",
  "In Progress": "border border-amber-200 bg-amber-50 text-amber-700",
  "Data Submitted": "border border-purple-200 bg-purple-50 text-purple-700",
  "Under Review": "border border-orange-200 bg-orange-50 text-orange-700",
  Approved: "border border-green-200 bg-green-50 text-green-700",
  "Revision Requested": "border border-red-200 bg-red-50 text-red-700",
}

const TYPE_DOT: Record<AssessmentType, string> = {
  "NN Baseline": "bg-blue-500",
  "BNG Habitat Survey": "bg-green-500",
  "Annual Monitoring": "bg-amber-500",
  Reassessment: "bg-purple-500",
}

const TYPE_BADGE: Record<AssessmentType, string> = {
  "NN Baseline": "border border-blue-200 bg-blue-50 text-blue-700",
  "BNG Habitat Survey": "border border-green-200 bg-green-50 text-green-700",
  "Annual Monitoring": "border border-amber-200 bg-amber-50 text-amber-700",
  Reassessment: "border border-purple-200 bg-purple-50 text-purple-700",
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // Monday = 0 ... Sunday = 6
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentsDashboard() {
  const [view, setView] = useState<"calendar" | "table">("calendar")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false
      if (statusFilter !== "all" && a.status !== statusFilter) return false
      return true
    })
  }, [typeFilter, statusFilter])

  // Stat counts (from all assessments, not filtered)
  const scheduled = assessments.filter((a) => a.status === "Scheduled").length
  const inProgress = assessments.filter((a) => a.status === "In Progress").length
  const awaitingReview = assessments.filter(
    (a) => a.status === "Under Review" || a.status === "Data Submitted"
  ).length
  const completed = assessments.filter((a) => a.status === "Approved").length

  // Calendar data for March 2026
  const year = 2026
  const month = 2 // March (0-indexed)
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const assessmentsByDate = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    filtered.forEach((a) => {
      const d = new Date(a.date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString()
        if (!map[key]) map[key] = []
        map[key].push(a)
      }
    })
    return map
  }, [filtered])

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [firstDay, daysInMonth])

  const stats = [
    { label: "Scheduled", value: scheduled, icon: CalendarDays, color: "text-blue-600" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-amber-600" },
    { label: "Awaiting Review", value: awaitingReview, icon: Search, color: "text-orange-600" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/brokerage-mockups/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Assessments</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            Schedule site visits, track assessment progress and review reports
          </p>
        </div>
        <Link href="/admin/brokerage-mockups/assessments/schedule">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Assessment
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-lg bg-muted p-3 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar + View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="NN Baseline">NN Baseline</SelectItem>
            <SelectItem value="BNG Habitat Survey">BNG Habitat Survey</SelectItem>
            <SelectItem value="Annual Monitoring">Annual Monitoring</SelectItem>
            <SelectItem value="Reassessment">Reassessment</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Data Submitted">Data Submitted</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Revision Requested">Revision Requested</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "calendar"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "table"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableProperties className="h-4 w-4" />
            Table
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <Card>
          <CardHeader>
            <CardTitle>March 2026</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                NN Baseline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                BNG Habitat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                Monitoring
              </span>
            </div>

            <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border">
              {/* Day headers */}
              {dayNames.map((d) => (
                <div
                  key={d}
                  className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}

              {/* Date cells */}
              {calendarCells.map((day, i) => {
                const dayAssessments = day ? assessmentsByDate[day.toString()] : undefined
                const isToday = day === 8 // March 8, 2026
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] bg-card p-2 ${
                      !day ? "bg-muted/50" : ""
                    } ${isToday ? "ring-2 ring-inset ring-blue-500" : ""}`}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-xs font-medium ${
                            isToday
                              ? "text-blue-600"
                              : "text-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        {dayAssessments && (
                          <div className="mt-1 space-y-1">
                            {dayAssessments.map((a) => (
                              <Link
                                key={a.id}
                                href={`/admin/brokerage-mockups/assessments/${a.id}`}
                                className="flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-muted transition-colors"
                              >
                                <span
                                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[a.type]}`}
                                />
                                <span className="truncate text-foreground">
                                  {a.siteName}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      {view === "table" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <button className="flex items-center gap-1 text-xs font-medium">
                      Ref <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 text-xs font-medium">
                      Site <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 text-xs font-medium">
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const assessor = assessors.find((as) => as.id === a.assessorId)
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link
                          href={`/admin/brokerage-mockups/assessments/${a.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {a.id}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {a.siteName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback
                              className={`text-[10px] text-foreground ${
                                assessor?.avatarColor ?? "bg-muted"
                              }`}
                            >
                              {assessor?.initials ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">
                            {a.assessorName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={TYPE_BADGE[a.type]}
                        >
                          {a.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(a.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_STYLES[a.status]}
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.reportDocId ? (
                          <Button variant="ghost" size="sm" className="h-7 px-2" aria-label="View report">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
