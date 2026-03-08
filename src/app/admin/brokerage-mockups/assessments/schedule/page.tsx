"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Search,
  Leaf,
  TreePine,
  ClipboardCheck,
  RefreshCcw,
  CalendarDays,
  CheckCircle2,
  Send,
  Save,
} from "lucide-react"
import { sites, assessors } from "../../_mock-data"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssessmentTypeOption {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
}

const ASSESSMENT_TYPES: AssessmentTypeOption[] = [
  {
    id: "NN Baseline",
    title: "NN Baseline",
    description:
      "Full nutrient neutrality baseline assessment with soil sampling, water quality analysis and credit yield calculation.",
    icon: Leaf,
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40",
  },
  {
    id: "BNG Habitat Survey",
    title: "BNG Habitat Survey",
    description:
      "Biodiversity Metric 4.0 habitat classification survey with condition assessment and unit calculation.",
    icon: TreePine,
    color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40",
  },
  {
    id: "Annual Monitoring",
    title: "Annual Monitoring",
    description:
      "Annual compliance monitoring visit to verify mitigation measures and habitat management are on track.",
    icon: ClipboardCheck,
    color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40",
  },
  {
    id: "Reassessment",
    title: "Reassessment",
    description:
      "Full reassessment of an existing site following changes to management, boundary or credit allocation.",
    icon: RefreshCcw,
    color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40",
  },
]

const STEPS = [
  { number: 1, label: "Site" },
  { number: 2, label: "Type" },
  { number: 3, label: "Assessor" },
  { number: 4, label: "Date" },
  { number: 5, label: "Confirm" },
]

// Calendar helpers
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleAssessment() {
  const [currentStep, setCurrentStep] = useState(0)
  const [siteSearch, setSiteSearch] = useState("")
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedAssessor, setSelectedAssessor] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [timeSlot, setTimeSlot] = useState<"AM" | "PM" | "Full Day">("Full Day")

  const filteredSites = useMemo(() => {
    if (!siteSearch) return sites
    const q = siteSearch.toLowerCase()
    return sites.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.ref.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    )
  }, [siteSearch])

  const site = sites.find((s) => s.ref === selectedSite)
  const assessor = assessors.find((a) => a.id === selectedAssessor)
  const typeOption = ASSESSMENT_TYPES.find((t) => t.id === selectedType)

  // Calendar for March 2026
  const year = 2026
  const month = 2
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [firstDay, daysInMonth])

  const availableDates = useMemo(() => {
    if (!assessor) return new Set<number>()
    return new Set(
      assessor.availability
        .map((d) => new Date(d))
        .filter((d) => d.getFullYear() === year && d.getMonth() === month)
        .map((d) => d.getDate())
    )
  }, [assessor])

  const canNext =
    (currentStep === 0 && selectedSite) ||
    (currentStep === 1 && selectedType) ||
    (currentStep === 2 && selectedAssessor) ||
    (currentStep === 3 && selectedDate) ||
    currentStep === 4

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/admin/brokerage-mockups/assessments"
          className="hover:text-foreground transition-colors"
        >
          Assessments
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Schedule Assessment</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Schedule Assessment</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i < currentStep
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : i === currentStep
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-sm ${
                i === currentStep
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${
                  i < currentStep ? "bg-green-300 dark:bg-green-700" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Site */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Site</CardTitle>
            <CardDescription>
              Choose which site this assessment will cover
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sites by name, ref or address..."
                className="pl-9"
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {filteredSites.map((s) => (
                <button
                  key={s.ref}
                  onClick={() => setSelectedSite(s.ref)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selectedSite === s.ref
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      {s.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({s.ref})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{s.address}</p>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>{s.catchment}</span>
                      <span>{s.areaHectares} ha</span>
                      <span>{s.unitType}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Site Preview */}
            {site && (
              <>
                <Separator />
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h4 className="font-medium text-foreground">{site.name}</h4>
                  <p className="text-sm text-muted-foreground">{site.address}</p>
                  <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Catchment</span>
                      <p className="font-medium text-foreground">{site.catchment}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Area</span>
                      <p className="font-medium text-foreground">
                        {site.areaHectares} ha
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit Type</span>
                      <p className="font-medium text-foreground">{site.unitType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <p className="font-medium text-foreground">{site.status}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Assessment Type */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Type</CardTitle>
            <CardDescription>
              What type of assessment is required?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ASSESSMENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                    selectedType === t.id
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className={`rounded-lg p-2 ${t.color}`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Assign Assessor */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Assessor</CardTitle>
            <CardDescription>
              Select an assessor for this {selectedType ?? "assessment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {assessors.map((a) => {
                const matchesType = selectedType
                  ? a.specialism.some(
                      (s) =>
                        s === selectedType ||
                        s.toLowerCase().includes(selectedType.toLowerCase().split(" ")[0])
                    )
                  : false
                const nextAvailable = a.availability[0]
                  ? new Date(a.availability[0]).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                  : "No dates"

                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssessor(a.id)}
                    className={`relative rounded-lg border p-4 text-left transition-colors ${
                      selectedAssessor === a.id
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {matchesType && (
                      <Badge className="absolute right-3 top-3 bg-green-100 text-green-700 text-[10px] dark:bg-green-900/40 dark:text-green-400">
                        Specialism match
                      </Badge>
                    )}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`${a.avatarColor} text-sm font-medium`}>
                          {a.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.region}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.specialism.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <CalendarDays className="mr-1 inline h-3 w-3" />
                      Next available: {nextAvailable}
                    </p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Pick Date */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Pick Date</CardTitle>
            <CardDescription>
              {assessor
                ? `Showing ${assessor.name}'s availability for March 2026`
                : "Select a date"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AM/PM Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Time slot:</Label>
              {(["AM", "PM", "Full Day"] as const).map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTimeSlot(slot)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    timeSlot === slot
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/20 dark:text-blue-300"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
              {dayNames.map((d) => (
                <div
                  key={d}
                  className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {calendarCells.map((day, i) => {
                const isAvailable = day ? availableDates.has(day) : false
                const dateStr = day
                  ? `2026-03-${day.toString().padStart(2, "0")}`
                  : null
                const isSelected = dateStr === selectedDate
                const isPast = day !== null && day < 8

                return (
                  <button
                    key={i}
                    disabled={!day || !isAvailable || isPast}
                    onClick={() => dateStr && setSelectedDate(dateStr)}
                    className={`min-h-[56px] bg-card p-2 text-sm font-medium transition-colors ${
                      !day
                        ? "bg-muted/50"
                        : isSelected
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : isAvailable && !isPast
                        ? "text-foreground hover:bg-green-50 dark:hover:bg-green-950/20 cursor-pointer"
                        : "text-muted-foreground/40 cursor-not-allowed"
                    }`}
                  >
                    {day && (
                      <div className="flex flex-col items-center gap-1">
                        <span>{day}</span>
                        {!isPast && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable
                                ? isSelected
                                  ? "bg-white"
                                  : "bg-green-500"
                                : "bg-muted-foreground/20"
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20" />
                Unavailable
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirmation */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Assessment</CardTitle>
            <CardDescription>
              Review the details and schedule the assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="text-sm font-medium text-foreground">
                    {site?.name ?? "--"}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({site?.ref})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{site?.address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assessment Type</p>
                  <p className="text-sm font-medium text-foreground">
                    {typeOption?.title ?? "--"}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Assessor</p>
                  <div className="mt-1 flex items-center gap-2">
                    {assessor && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className={`text-[10px] ${assessor.avatarColor}`}
                        >
                          {assessor.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <p className="text-sm font-medium text-foreground">
                      {assessor?.name ?? "--"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date &amp; Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedDate
                      ? new Date(selectedDate).toLocaleDateString("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeSlot}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                Send to Assessor
              </Button>
              <Button variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {currentStep < 4 && (
          <Button
            onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
            disabled={!canNext}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
